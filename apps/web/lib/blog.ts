// Generated once by Nevela for the blog at /blog. This file is yours.
//
// Everything the blog's pages know about where posts come from is here: which resource
// they are, what its fields are called, and how long a page of them may be reused.
// The posts are the resource's public records (its descriptor's "public" section, and
// the publicQuery scope on its model), read with no session, so the pages are the same
// for every visitor and are cached.
import { resourceTag } from "@/lib/cache";
import { fileUrl } from "@/lib/files";
import { API_URL, laravelPublic } from "@/lib/laravel";
import { site } from "@/lib/site";

export const blog = {
  /** Where the blog is on the site. The pages are in app/blog. */
  path: "/blog",
  title: "Blog",
  description: `News and notes from ${site.name}.`,
  /** Posts on a page of the list. */
  perPage: 9,
};

/** The resource's field for each part of a post. `null` where it has none. */
const FIELDS = {
  title: "title",
  body: "body",
  excerpt: "excerpt" as string | null,
  image: "image" as string | null,
  published: "publishedAt" as string | null,
};

/**
 * Whether the body is HTML. True for a rich text field, which Laravel cleans before it
 * sends it, so it can go on the page as it is. Leave it false for any other field: its
 * value is then shown as plain text, and whatever is in it can do no harm.
 */
export const BODY_IS_HTML: boolean = true;

/**
 * Whether the picture is a file uploaded through Nevela (an image field), which has
 * smaller renditions and is fetched through this app. False for a plain column that
 * holds a path or an address of the app's own.
 */
const IMAGE_IS_UPLOAD: boolean = true;

/**
 * How long an answer may be reused, in seconds. Saving a post in the dashboard clears it
 * at once (the tag below). The time is for what nobody saves: a post scheduled for later
 * appears within this long of its moment.
 */
const FRESH_FOR = 60;
const TAGS = [resourceTag("Post")];

export interface BlogPost {
  id: string;
  title: string;
  /** What its address ends in: /blog/<slug>. */
  slug: string;
  /** A sentence or two for the list and for search engines. From the body when the post has none. */
  excerpt: string;
  body: string;
  /** A picture for the list, and a larger one for the post's own page and for sharing. */
  image: string | null;
  imageLarge: string | null;
  /** When it was published, as an ISO date. */
  publishedAt: string | null;
}

/** The address a visitor reaches this site at, for the sitemap, the feed and shared links. */
export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? process.env.SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}

const words = (html: string) => html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#0*39;/g, "'").replace(/\s+/g, " ").trim();

function picture(value: unknown, rendition?: string): string | null {
  if (typeof value !== "string" || value === "") return null;
  // A file uploaded through Nevela: fetched through this app, in the size asked for.
  if (IMAGE_IS_UPLOAD) return fileUrl(value, rendition);
  // A path kept in a plain column: a file on the Laravel app's public disk, or an address already.
  if (/^https?:\/\//.test(value)) return value;
  return `${new URL(API_URL).origin}/storage/${value.replace(/^\/+/, "")}`;
}

function toPost(row: Record<string, unknown>): BlogPost {
  const text = (key: string | null) => (key && typeof row[key] === "string" ? (row[key] as string) : "");
  const body = text(FIELDS.body);
  const excerpt = text(FIELDS.excerpt) || words(body).slice(0, 180);
  return {
    id: String(row.id),
    title: text(FIELDS.title),
    slug: String(row["slug"] ?? row.id),
    excerpt,
    body,
    // "thumb" is the small rendition every image profile makes. One that was never made is answered with the picture itself.
    image: picture(FIELDS.image ? row[FIELDS.image] : null, "thumb"),
    imageLarge: picture(FIELDS.image ? row[FIELDS.image] : null),
    publishedAt: text(FIELDS.published) || null,
  };
}

/** One page of published posts, newest first. */
export async function listPosts(page = 1, perPage = blog.perPage): Promise<{ posts: BlogPost[]; page: number; totalPages: number; total: number }> {
  const response = await laravelPublic(`posts?sort=-publishedAt&page=${page}&perPage=${perPage}`, { revalidate: FRESH_FOR, tags: TAGS });
  if (!response.ok) return { posts: [], page, totalPages: 1, total: 0 };
  const { data, meta } = response.body as { data: Record<string, unknown>[]; meta: { page: number; totalPages: number; total: number } };
  return { posts: data.map(toPost), page: meta.page, totalPages: meta.totalPages, total: meta.total };
}

/** One published post by its address, or null: a draft, one still to come and one that never was are all "not here". */
export async function getPost(slug: string): Promise<BlogPost | null> {
  const response = await laravelPublic(`posts/${encodeURIComponent(slug)}`, { revalidate: FRESH_FOR, tags: TAGS });
  return response.ok ? toPost(response.body as Record<string, unknown>) : null;
}

/** Every published post, newest first, for the sitemap and the feed. */
export async function allPosts(most = 1000): Promise<BlogPost[]> {
  const posts: BlogPost[] = [];
  for (let page = 1; posts.length < most; page++) {
    const result = await listPosts(page, 100);
    posts.push(...result.posts);
    if (page >= result.totalPages || result.posts.length === 0) break;
  }
  return posts.slice(0, most);
}

/** "11 October 2026" */
export function postDate(post: BlogPost): string {
  return post.publishedAt ? new Intl.DateTimeFormat("en-GB", { dateStyle: "long" }).format(new Date(post.publishedAt)) : "";
}
