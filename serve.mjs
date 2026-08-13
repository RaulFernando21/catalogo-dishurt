import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";

const ROOT = resolve(".");
const PORT = 3000;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2"
};

http
  .createServer(async (req, res) => {
    try {
      const url = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
      const path = normalize(join(ROOT, url));
      if (!path.startsWith(resolve(ROOT))) throw new Error("Forbidden");
      const filePath = resolve(path) === resolve(ROOT) ? join(ROOT, "index.html") : path;
      const data = await readFile(filePath);
      res.writeHead(200, { "Content-Type": MIME[extname(filePath)] || "application/octet-stream" });
      res.end(data);
    } catch {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("404 Not Found");
    }
  })
  .listen(PORT, () => {
    console.log(`Serving http://localhost:${PORT} from ${ROOT}`);
  });
