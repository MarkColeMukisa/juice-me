// Builds the web version into dist/, ready for a static host.
//
// Expo puts the icon fonts under dist/assets/node_modules/..., and hosts that skip
// "node_modules" folders when uploading (Sevalla's static sites do) leave every icon
// blank. So the folder is renamed to assets/vendor and the bundles pointed at it.
import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dist = "dist";
execSync("npx expo export -p web", { stdio: "inherit" });

const from = join(dist, "assets", "node_modules");
if (existsSync(from)) {
  renameSync(from, join(dist, "assets", "vendor"));

  const files = (dir) =>
    readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      return statSync(path).isDirectory() ? files(path) : [path];
    });

  let changed = 0;
  for (const file of files(dist).filter((f) => /\.(js|html|css|json)$/.test(f))) {
    const text = readFileSync(file, "utf8");
    if (text.includes("/assets/node_modules/")) {
      writeFileSync(file, text.replaceAll("/assets/node_modules/", "/assets/vendor/"));
      changed++;
    }
  }
  console.log(`Moved assets/node_modules to assets/vendor; updated ${changed} file(s).`);
}
