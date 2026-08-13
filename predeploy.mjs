import { cp, mkdir, rm } from "node:fs/promises";

await rm("publish", { recursive: true, force: true });
await mkdir("publish", { recursive: true });
await cp("index.html", "publish/index.html");
await cp("assets", "publish/assets", { recursive: true });
await cp("data", "publish/data", { recursive: true });
console.log("publish/ listo: index.html + assets + data");
