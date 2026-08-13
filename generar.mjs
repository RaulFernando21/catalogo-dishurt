import { readdir, copyFile, mkdir, writeFile, readFile } from "node:fs/promises";
import { join, extname, basename } from "node:path";

const SRC = "Catálogo";
const DST = "assets";
const DATA_DIR = "data";

const RULES = [
  [["teflon", "anillo de cera", "inodoro", "caño", "cano", "valvula", "esferica", "botadero", "union universal", "grifo", "tanque", "plomero", "tuberia", "agua"], "Plomería"],
  [["tomacorriente", "caja", "tablero", "medidor", "canaleta", "modular", "octogonal", "braker", "interruptor", "lampara", "led", "foco", "fluorescente", "cable"], "Eléctrico e iluminación"],
  [["desarmador", "badilejo", "plancha", "martillo", "destornillador", "llave", "alicate", "flexometro", "nivel", "serrucho", "tenaza"], "Herramientas manuales"],
  [["taladro", "atornillador", "amoladora", "esmeril", "sierra", "soldar", "compresor", "lijadora", "disco"], "Herramientas eléctricas"],
  [["tornillo", "perno", "tuerca", "arandela", "anclaje", "clavo", "tirafondos"], "Tornillería y anclajes"],
  [["cemento", "pegatubos", "pegamento", "adhesivo", "pintura", "sellador", "silicona", "brocha", "rodillo", "masilla", "esmalte", "thinner"], "Pintura y adhesivos"],
  [["candado", "cadena", "casco", "guante", "lentes", "malla", "seguridad"], "Seguridad"],
  [["cerradura", "bisagra", "picaporte", "cerrojo", "manija", "pasador"], "Cerrajería"],
  [["aceite", "lubricante"], "Aceites y lubricantes"],
  [["embalaje", "stretch", "precinto"], "Embalaje y precintos"],
  [["brasso", "limpia", "pulidor", "brillo"], "Limpieza y pulido"]
];

const ACRONYMS = { pvc: "PVC", gi: "GI", tey: "TEY", huzz: "HUZZ", oil: "OIL", afa: "AFA", bro: "BRO", ptfe: "PTFE", elfa: "ELFA" };

const ACCENT_WORDS = [
  ["Esferica", "Esférica"],
  ["Valvula", "Válvula"],
  ["Valvulas", "Válvulas"],
  ["Electricas", "Eléctricas"],
  ["Electrico", "Eléctrico"],
  ["Guia", "Guía"],
  ["Monofasico", "Monofásico"],
  ["Trifasico", "Trifásico"],
  ["Modulos", "Módulos"],
  ["Jardin", "Jardín"],
  ["Linea", "Línea"],
  ["Teflon", "Teflón"]
];

const BRANDS = [
  [/schubirt|schubert/i, "Schubirt"],
  [/gi\s*-?\s*tey/i, "GI-TEY"],
  [/valu\s*plast/i, "Valu Plast"],
  [/terocano/i, "Terocano"],
  [/hermes/i, "Hermes"],
  [/brasso/i, "Brasso"],
  [/huzz\s*-?\s*oil/i, "HUZZ-OIL"],
  [/elfa\s*pack/i, "Elfa Pack"],
  [/hucc/i, "Hucc"]
];

const PHONE_PREFIX = ["982150", "987580", "982151"];

const NOISE = [
  /^herramientas?$/i, /^grifer[ií]a$/i, /^lighting$/i, /^automotriz$/i,
  /^(c[oó]digo|medida|cantidad|descripci[oó]n|presentaciones?|caracter[ií]sticas|observaciones|garant[ií]a|garantizada|calidad|stock|disponible|unidad|unidades|caja|master|docena|docenas|linea|l[ií]nea|color|peso|contact[aá]nos|env[ií]os|facebook|instagram|corp|corporaci[oó]n|producto|especial|nuevos|ingresos|m[aá]s|opciones|mejor|hecho|socio|negocio|confianza|compromiso|respalda|soluciones|conectan|dise[ñn]o|moderno|funcional|mantenimiento|f[aá]cil|ideal|dom[eé]sticos|trabajos|resistencia|durabilidad|impacto|humedad|muros|concreto|ladrillo|instalar|interna|internas|disponible|totalmente|productos|garantizado|elaborado|presentaci[oó]n|cont[aá]ctanos|atras|aplicaci[oó]n|material|materia|prima|peruano|peruanos|envasado|aportar|instalaciones|necesidad|desperdiciar|alcance|calidad|resistente|grande|mejores|excelente|ideal|usos|f[uú]til|diciembre|febrero|abril|agosto|enero|marzo|mayo|junio|julio|setiembre|octubre|noviembre|m[oó]dulo)$/i,
  /^\d+$/, /^\d+ ?(und|uno|cto|pcs|docenas?|g|kg|gal)$/i,
  /@/, /\+?\d[\d\s-]{6,}$/, /^\d{11}$/, /^r\.?u\.?c\.?$/,
  /^c\.? ?master$/, /^c\.? ?interna$/, /^d[oó]cena$/,
  /^s\s+schubirt/i, /[ÃÕª«¿]/, /^[^A-Za-zÁÉÍÓÚÑáéíóúñ0-9]+$/,
  /^und\.?\s*med/i, /^uno\.?\s*med/i, /^\[/, /^mec[ií]ida$/i
];

function detectCategory(name) {
  const n = name.toLowerCase().replace(/[_-]+/g, " ");
  for (const [kws, cat] of RULES) {
    for (const k of kws) {
      if (k === "cano") {
        if (new RegExp("\\bcano\\b").test(n)) return cat;
      } else if (n.includes(k)) {
        return cat;
      }
    }
  }
  return "General";
}

function toTitle(name) {
  const s = name
    .replace(/\.[^.]+$/, "")
    .replace(/\b(\d)-(\d)\b/g, "$1/$2")
    .replace(/[_-]+/g, " ")
    .trim()
    .split(" ")
    .map((w) => {
      const low = w.toLowerCase();
      if (ACRONYMS[low]) return ACRONYMS[low];
      if (w.length <= 3) return w.toLowerCase();
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(" ")
    .replace(/\bcano\b/gi, (m) => (m[0] === m[0].toUpperCase() ? "Caño" : "caño"));
  return ACCENT_WORDS.reduce((acc, [from, to]) => acc.replaceAll(from, to), s);
}

function cleanDescription(raw) {
  const tokens = raw.split("|").map((t) => t.trim());
  const kept = [];
  for (const t of tokens) {
    if (t.length < 4) continue;
    const one = t.replace(/^([A-ZÁÉÍÓÚÑa-záéíóúñ0-9"]+).*/, "$1");
    const two = t.replace(/^\s*([^ ]+)/, "$1");
    if (NOISE.some((re) => re.test(t)) || NOISE.some((re) => re.test(one)) || NOISE.some((re) => re.test(two))) continue;
    kept.push(t.replace(/\s+/g, " "));
  }
  return [...new Set(kept)].slice(0, 18).join(", ");
}

function extractFicha(raw, name) {
  const t = " " + raw.replace(/\s*\|\s*/g, " ") + " ";
  const f = [];
  const nameBrand = /huzz/.test(name) ? "HUZZ-OIL" : /gi\s*-?\s*tey/.test(name) ? "GI-TEY" : /brasso/.test(name) ? "Brasso" : /hermes/.test(name) ? "Hermes" : /terocano/.test(name) ? "Terocano" : /schubirt/.test(name) ? "Schubirt" : null;
  if (nameBrand) {
    f.push({ etiqueta: "Marca", valor: nameBrand });
  } else {
    for (const [re, label] of BRANDS) {
      if (re.test(t)) { f.push({ etiqueta: "Marca", valor: label }); break; }
    }
  }
  const cod = [...new Set([...t.matchAll(/\b(\d{6})\b/g)].map((m) => m[1]))].filter(
    (c) => !PHONE_PREFIX.some((p) => c.startsWith(p))
  );
  if (cod.length) f.push({ etiqueta: "Códigos", valor: cod.join(", ") });
  const medidas = [...new Set([
    ...(t.match(/\b\d+(?:\.\d+)?\s*(?:mm|cm)\s*x\s*\d+(?:\.\d+)?\s*(?:mm|cm)(?:\s*x\s*\d+(?:\.\d+)?\s*(?:mm|cm))?\b/gi) || []),
    ...(t.match(/\b\d+(?:\.\d+)?\s*(?:mm|cm|pg|in)\b/gi) || []),
    ...(t.match(/\b\d+(?:"|”)\s*x\s*\d+(?:"|”)/gi) || []),
    ...(t.match(/\b(?:1\/2|1\/4|1\/8|1\/16|1\/32|1\/64|3\/4)\s*(?:"|”)?\b/gi) || [])
  ])];
  if (medidas.length) f.push({ etiqueta: "Medidas", valor: medidas.slice(0, 6).join(", ") });
  const pres = [...new Set([
    ...(t.match(/\b\d+\/\d+\s*GL(?:\s*\/\s*(?:CA|SA))?\b/gi) || []),
    ...(t.match(/\b\d+\s*ml\b/gi) || [])
  ])];
  if (pres.length) f.push({ etiqueta: "Presentaciones", valor: pres.slice(0, 6).join(", ") });
  const cant = [];
  const mQ = t.match(/(?:EN\s+CAJA|CAJA|C\.?\s*MASTER|C\.?\s*INTERNA|MASTER)\s*[:.]?\s*(\d+\s*(?:UND\.?|UNO\.?|DOCENAS?|PCS|CTO\.?|UNIDADES?|UND)?)/gi) || [];
  for (const q of mQ) {
    const clean = q.replace(/\s+/g, " ").trim();
    if (!cant.includes(clean)) cant.push(clean);
  }
  if (cant.length) f.push({ etiqueta: "Cantidades", valor: cant.slice(0, 4).join(" · ") });
  return f;
}

await mkdir(DST, { recursive: true });
await mkdir(DATA_DIR, { recursive: true });

const ocrRaw = await readFile("ocr-datos.json", "utf8").catch(() => "[]");
const ocrMap = {};
for (const e of JSON.parse(ocrRaw.replace(/^\uFEFF/, ""))) ocrMap[e.file] = e.ocr || "";

const files = (await readdir(SRC)).filter((f) => /\.(jpe?g|png|webp)$/i.test(f));
const products = [];

for (const f of files) {
  await copyFile(join(SRC, f), join(DST, f));
  const raw = ocrMap[f] || "";
  const ficha = extractFicha(raw, basename(f, extname(f)));
  const datos = {
    id: basename(f, extname(f)),
    nombre: toTitle(f),
    categoria: detectCategory(basename(f, extname(f))),
    img: f,
    descripcion: cleanDescription(raw),
    marca: ficha.find((r) => r.etiqueta === "Marca")?.valor || "",
    codigos: ficha.find((r) => r.etiqueta === "Códigos")?.valor || "",
    medidas: ficha.find((r) => r.etiqueta === "Medidas")?.valor || "",
    presentaciones: ficha.find((r) => r.etiqueta === "Presentaciones")?.valor || "",
    cantidades: ficha.find((r) => r.etiqueta === "Cantidades")?.valor || ""
  };
  products.push(datos);
}

products.sort((a, b) => a.categoria.localeCompare(b.categoria) || a.nombre.localeCompare(b.nombre));

await writeFile(join(DATA_DIR, "productos.json"), JSON.stringify(products, null, 2) + "\n", "utf8");

const cols = ["id", "nombre", "categoria", "img", "descripcion", "marca", "codigos", "medidas", "presentaciones", "cantidades"];
const esc = (v) => '"' + String(v ?? "").replace(/"/g, '""') + '"';
const csv = [cols.join(",")].concat(products.map((p) => cols.map((c) => esc(p[c])).join(","))).join("\n");
await writeFile(join(DATA_DIR, "productos.csv"), csv, "utf8");

console.log(`Procesados ${products.length} productos → assets/ + data/productos.json + data/productos.csv`);
