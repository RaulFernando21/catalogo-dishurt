import puppeteer from "puppeteer-core";
import { spawn } from "node:child_process";
import { stat } from "node:fs/promises";

const CHROME = "C:/Users/RAUL/.cache/puppeteer/chrome/win64-147.0.7727.57/chrome-win64/chrome.exe";
const URL = "http://localhost:3000/";
const OUT = "catalogo-dishurt.pdf";

function isServerUp() {
  return fetch(URL).then(() => true).catch(() => false);
}

async function startServer() {
  const child = spawn("node", ["serve.mjs"], { stdio: "ignore", detached: true, shell: true });
  child.unref();
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 500));
    if (await isServerUp()) return;
  }
  throw new Error("El servidor local no respondio");
}

if (!(await isServerUp())) await startServer();

const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 1000 });
await page.goto(URL, { waitUntil: "networkidle0", timeout: 90000 });
await page.evaluate(async () => {
  const imgs = Array.from(document.querySelectorAll(".plate img"));
  imgs.forEach((i) => { i.loading = "eager"; });
  await new Promise((resolve) => {
    let y = 0, n = 0;
    const timer = setInterval(() => {
      window.scrollBy(0, 800);
      y += 800; n++;
      if (y >= document.body.scrollHeight || n > 40) { clearInterval(timer); resolve(); }
    }, 40);
  });
  await Promise.race([
    Promise.all(imgs.map((i) => (i.complete ? Promise.resolve() : new Promise((r) => { i.onload = i.onerror = r; })))),
    new Promise((r) => setTimeout(r, 15000))
  ]);
});
await page.emulateMediaType("print");
const pdf = await page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true });
await browser.close();

const fs = await import("node:fs/promises");
await fs.writeFile(OUT, pdf);
const size = await stat(OUT);
const kb = Math.round(size.size / 1024);
const pages = (pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) || []).length;
console.log(`PDF generado: ${OUT} (${kb} KB, aprox. ${pages} pag.)`);
