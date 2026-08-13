import puppeteer from "puppeteer-core";
import { mkdir } from "node:fs/promises";
import { readdir } from "node:fs/promises";

const CHROME = "C:/Users/RAUL/.cache/puppeteer/chrome/win64-147.0.7727.57/chrome-win64/chrome.exe";
const OUT_DIR = "temporary screenshots";

const url = process.argv[2];
const label = process.argv[3] || "";

if (!url) {
  console.error("Uso: node screenshot.mjs <url> [etiqueta]");
  process.exit(1);
}

await mkdir(OUT_DIR, { recursive: true });
const existing = await readdir(OUT_DIR).catch(() => []);
const numbers = existing
  .map((f) => f.match(/^screenshot-(\d+)/))
  .filter(Boolean)
  .map((m) => parseInt(m[1], 10));
const next = (numbers.length ? Math.max(...numbers) : 0) + 1;
const suffix = label ? `-${label}` : "";
const outPath = `${OUT_DIR}/screenshot-${next}${suffix}.png`;

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--disable-setuid-sandbox"]
});

const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.goto(url, { waitUntil: "networkidle0", timeout: 60000 });
await page.screenshot({ path: outPath, fullPage: true });
await browser.close();
console.log(`Guardado: ${outPath}`);
