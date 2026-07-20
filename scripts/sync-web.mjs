import { cp, mkdir, rm } from "node:fs/promises";

const files = [
  "index.html",
  "app.css",
  "app.js",
  "manifest.webmanifest",
  "sw.js"
];

await rm("www", { recursive: true, force: true });
await mkdir("www/icons", { recursive: true });

for (const file of files) {
  await cp(file, `www/${file}`);
}

await cp("icons", "www/icons", { recursive: true });

console.log("SpendWise web assets copied to www/");
