import puppeteer from "puppeteer-core";
const CHROME = "C:/Users/RAUL/.cache/puppeteer/chrome/win64-147.0.7727.57/chrome-win64/chrome.exe";
const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
const errors = [];
const failed = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("response", (r) => { if (r.status() >= 400) failed.push(r.url() + " -> " + r.status()); });
await page.goto("http://localhost:3000/", { waitUntil: "networkidle0", timeout: 60000 });
await new Promise((r) => setTimeout(r, 300));
const data = await page.evaluate(async () => {
  const json = await (await fetch("data/productos.json")).json();
  return {
    cards: document.querySelectorAll(".card").length,
    chips: document.querySelectorAll("#chips .chip").length,
    stats: document.getElementById("stats").textContent.trim(),
    jsonCount: json.length,
    sample: json[0],
    imgsFailed: Array.from(document.querySelectorAll(".plate img")).filter((i) => i.complete && i.naturalWidth === 0).length
  };
});
// open a modal to verify flattened ficha works
await page.evaluate(() => {
  const card = Array.from(document.querySelectorAll(".card")).find((c) => c.textContent.includes("Candado"));
  if (card) card.click();
});
await new Promise((r) => setTimeout(r, 500));
const modal = await page.evaluate(() => {
  const ficha = document.getElementById("modal-ficha");
  return {
    open: document.getElementById("modal").classList.contains("open"),
    rows: Array.from(ficha.querySelectorAll("div")).map((d) => d.textContent.replace(/\s+/g, " ").trim()),
    imgLoaded: document.getElementById("modal-img").complete && document.getElementById("modal-img").naturalWidth > 0
  };
});
console.log(JSON.stringify(data, null, 2));
console.log("modal:", JSON.stringify(modal));
console.log("Errores:", errors.length ? errors : "ninguno", "| fallidos:", failed.length ? failed : "ninguno");
await browser.close();
