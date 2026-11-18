import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { Platform } from "react-native";

import { api } from "./api";
import type { StoredFile } from "./format";

/**
 * Pictures from the phone to Laravel.
 *
 * The phone picks a picture and makes it ready to send (see prepared(): a JPEG Laravel can
 * read, no bigger than it needs to be). Laravel does the rest on what arrives: it checks the
 * contents really are a picture, turns it the right way up, strips where it was taken,
 * shrinks it to the field's image profile and makes the small renditions lists show.
 */

/** A picture chosen on the phone, not yet sent. */
export interface Picked {
  uri: string;
  name: string;
  type: string;
}

/** What Laravel answers to an upload: the key to save in the record, and the file's details. */
export type Uploaded = StoredFile & { key: string };

export class PermissionDenied extends Error {
  constructor(readonly what: "camera" | "photos") {
    super(what === "camera" ? "Allow the camera for this app in your phone's settings to take a photo." : "Allow photos for this app in your phone's settings to choose one.");
    this.name = "PermissionDenied";
  }
}

function describe(asset: ImagePicker.ImagePickerAsset, index: number): Picked {
  const type = asset.mimeType ?? "image/jpeg";
  const extension = type.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
  return { uri: asset.uri, type, name: asset.fileName ?? `photo-${Date.now()}-${index + 1}.${extension}` };
}

/** The longest side a photo is sent at: plenty for a product page, a fraction of a camera's. */
const LONGEST = 2048;

/**
 * A photo made ready on the phone before it is sent: turned into a JPEG Laravel can read
 * (phones save HEIC, which it can't, and refuses as "doesn't contain image data") and shrunk
 * to at most 2048 pixels on its longest side, so a 5 MB camera photo goes as a few hundred KB
 * on a campus connection. A PNG stays a PNG, keeping its transparency. Laravel still does its
 * own work on what arrives: the right way up, where it was taken stripped, the small renditions.
 *
 * If the phone can't do it, the photo goes as it was, and Laravel says what it thinks of it.
 */
async function prepared(asset: ImagePicker.ImagePickerAsset, index: number): Promise<Picked> {
  const original = describe(asset, index);
  // An animated GIF would lose its animation: sent as it is.
  if (original.type === "image/gif") return original;
  const png = original.type === "image/png";
  try {
    const context = ImageManipulator.manipulate(asset.uri);
    if (asset.width > 0 && asset.height > 0 && Math.max(asset.width, asset.height) > LONGEST) {
      context.resize(asset.width >= asset.height ? { width: LONGEST } : { height: LONGEST });
    }
    const image = await context.renderAsync();
    const saved = await image.saveAsync(png ? { format: SaveFormat.PNG } : { format: SaveFormat.JPEG, compress: 0.85 });
    context.release();
    image.release();
    const base = original.name.replace(/\.[^./]+$/, "");
    return { uri: saved.uri, type: png ? "image/png" : "image/jpeg", name: `${base}.${png ? "png" : "jpg"}` };
  } catch {
    return original;
  }
}

/**
 * Let the person choose pictures from their library, or take one.
 * Resolves to none when they back out.
 *
 * @param from    "library" or "camera".
 * @param options `many` for several at once (library only); `square` to crop to a square, as for a profile picture.
 */
export async function pickImages(from: "library" | "camera", { many = false, square = false }: { many?: boolean; square?: boolean } = {}): Promise<Picked[]> {
  // The camera on a phone always asks. A browser has no camera screen of its own: it offers its file chooser.
  if (from === "camera" && Platform.OS !== "web") {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) throw new PermissionDenied("camera");
    const taken = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], allowsEditing: square, aspect: square ? [1, 1] : undefined, quality: 0.9 });
    return taken.canceled ? [] : Promise.all(taken.assets.map(prepared));
  }

  const chosen = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsMultipleSelection: many && !square,
    selectionLimit: many ? 10 : 1,
    allowsEditing: square,
    aspect: square ? [1, 1] : undefined,
    // The full picture: it is made ready (a JPEG, at most 2048 pixels) just after, in one step.
    quality: 1,
  });
  return chosen.canceled ? [] : Promise.all(chosen.assets.map(prepared));
}

/** The bytes of a picture on the phone, as the request sends them. */
async function bytesOf(picked: Picked): Promise<Blob> {
  return (await fetch(picked.uri)).blob();
}

/** Send a picture to a resource's file field. Save the answer's `key` in the record. */
export async function uploadTo(resource: string, field: string, picked: Picked): Promise<Uploaded> {
  return api.upload<Uploaded>(`/_nevela/uploads/${encodeURIComponent(resource)}/${encodeURIComponent(field)}`, { body: await bytesOf(picked), type: picked.type }, { name: picked.name });
}

/** Send a picture as the signed-in person's profile picture. Laravel saves it to their account. */
export async function uploadAvatar(picked: Picked): Promise<void> {
  await api.upload("/auth/avatar", { body: await bytesOf(picked), type: picked.type }, { name: picked.name });
}
