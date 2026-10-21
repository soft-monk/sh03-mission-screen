/* 自检：node _tools/verify.mjs */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const R = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
let bad = 0;
const ok = (m) => console.log("OK   " + m);
const fail = (m) => { console.log("FAIL " + m); bad++; };

/* 1. index.html 引用 */
const html = fs.readFileSync(path.join(R, "index.html"), "utf8");
const refs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((m) => m[1]);
let miss = 0;
for (const r of refs) {
  if (/^https?:/.test(r)) continue;
  const f = r.split("?")[0];
  if (!fs.existsSync(path.join(R, f))) { fail("missing ref " + r); miss++; }
}
if (!miss) ok("index.html 引用 " + refs.length + " 个文件全部存在");

/* 2. JS 语法 */
const jsFiles = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const f = path.join(d, e.name);
    if (e.isDirectory()) { if (e.name !== "node_modules" && e.name !== "assets") walk(f); }
    else if (/\.(js|mjs)$/.test(e.name) && !f.includes(path.join("assets", "lib"))) jsFiles.push(f);
  }
})(R);
let syn = 0;
for (const f of jsFiles) {
  try { execFileSync(process.execPath, ["--check", f], { stdio: "pipe" }); }
  catch (e) { fail("syntax " + path.relative(R, f)); syn++; }
}
if (!syn) ok(jsFiles.length + " 个 js 语法全通过");

/* 3. 瓦片 */
const count = (d, ext) => fs.existsSync(d) ? fs.readdirSync(d, { recursive: true }).filter((x) => String(x).endsWith(ext)).length : 0;
const sat = count(path.join(R, "assets/map/online"), ".jpg");
const dem = count(path.join(R, "assets/map/dem"), ".png");
if (sat > 500 && dem > 100) ok("卫星瓦片 " + sat + " 张；DEM " + dem + " 张");
else fail("瓦片数量异常 sat=" + sat + " dem=" + dem);

/* 4. 时间轴 */
const tl = fs.readFileSync(path.join(R, "js/timeline.js"), "utf8");
const screens = (tl.match(/\{ id: "SH-/g) || []).length;
const subs = (tl.match(/\{ t: [\d.]+, who:/g) || []).length;
if (screens >= 18) ok("时间轴 " + screens + " 屏 / " + subs + " 条字幕"); else fail("时间轴屏数 " + screens);

/* 5. 字符污染（UTF-8 读回来不应有替换符） */
let moj = 0;
(function walk2(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const f = path.join(d, e.name);
    if (e.isDirectory()) { if (!["node_modules", "assets", "预览"].includes(e.name)) walk2(f); }
    else if (/\.(js|html|css|mjs|md)$/.test(e.name)) {
      const t = fs.readFileSync(f, "utf8");
      if (t.includes("\uFFFD")) { fail("字符污染 " + path.relative(R, f)); moj++; }
    }
  }
})(R);
if (!moj) ok("源文件无字符污染");

/* 6. 已实现屏 */
const sceneDir = path.join(R, "scenes");
let impl = [];
for (const f of fs.readdirSync(sceneDir)) {
  const t = fs.readFileSync(path.join(sceneDir, f), "utf8");
  impl.push(...[...t.matchAll(/SCENES\["(SH-\d+)"\]/g)].map((m) => m[1]));
}
impl = [...new Set(impl)].sort();
ok("已实现屏 " + impl.join(",") + "；占位屏 " + (18 - impl.length) + " 个");

console.log(bad ? "\n==== " + bad + " FAILED ====" : "\n==== ALL PASS ====");
process.exit(bad ? 1 : 0);