/* 按瓦片坐标区间补下载：node _tools/fetch-bbox.mjs sat 11 <x0> <x1> <y0> <y1> */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const R = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SAT_URL = (z, x, y) => "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/" + z + "/" + y + "/" + x;
const DEM_URL = (z, x, y) => "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/" + z + "/" + x + "/" + y + ".png";

const [kind, zs, x0s, x1s, y0s, y1s] = process.argv.slice(2);
if (!kind || !zs) { console.log("用法: fetch-bbox.mjs sat|dem <z> <x0> <x1> <y0> <y1>"); process.exit(1); }
const z = +zs, x0 = +x0s, x1 = +x1s, y0 = +y0s, y1 = +y1s;
const isSat = kind === "sat", ext = isSat ? "jpg" : "png";

const jobs = [];
for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) jobs.push({ x, y });
console.log("区间 z" + z + " x " + x0 + ".." + x1 + " y " + y0 + ".." + y1 + " 共 " + jobs.length + " 张");

let ok = 0, skip = 0, fail = 0, bytes = 0;
async function one(j) {
  const dir = path.join(R, "assets/map", isSat ? "online" : "dem", String(z), String(j.x));
  const file = path.join(dir, j.y + "." + ext);
  if (fs.existsSync(file) && fs.statSync(file).size > 200) { skip++; return; }
  fs.mkdirSync(dir, { recursive: true });
  const url = isSat ? SAT_URL(z, j.x, j.y) : DEM_URL(z, j.x, j.y);
  for (let t = 0; t < 3; t++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(20000) });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 100) throw new Error("too small");
      fs.writeFileSync(file, buf);
      ok++; bytes += buf.length;
      return;
    } catch (e) {
      if (t === 2) { fail++; console.log("FAIL " + z + "/" + j.x + "/" + j.y + " " + e.message); }
      else await new Promise((r) => setTimeout(r, 500));
    }
  }
}
const CONC = 10;
let i = 0;
async function worker() { while (i < jobs.length) { const j = jobs[i++]; await one(j); } }
const t0 = Date.now();
await Promise.all(Array.from({ length: CONC }, worker));
console.log("新下载 " + ok + " / 跳过 " + skip + " / 失败 " + fail + "，" + (bytes / 1048576).toFixed(2) + " MB");