/* FastHTML 本地静态服务：双击「启动演示-平面.bat」或「启动演示-3D地形.bat」（完全离线）
   缓存策略：代码类走 no-store + 版本号 __V__（按文件 mtime 生成），改了必定生效 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { exec } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const START_PORT = Number(process.env.PORT || 8787);
/* 第二个参数决定打开哪个版本：node serve.mjs 3d | node serve.mjs flat（默认） */
const MODE = process.argv[2] === "3d" ? "3d" : "flat";
const MODE_CN = MODE === "3d" ? "3D 地形版" : "平面版";
const MAX_TRY = 10;
const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".mp4": "video/mp4",
  ".wav": "audio/wav",
  ".css": "text/css; charset=utf-8", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".webp": "image/webp", ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml", ".ico": "image/x-icon"
};

/* 构建号 = 所有前端源码 mtime 的最大值（base36）。改任何文件，号就变，URL 也就变 */
const BUILD = (() => {
  let m = 0;
  const walk = (d) => {
    let ents = [];
    try { ents = fs.readdirSync(d, { withFileTypes: true }); } catch (e) { return; }
    for (const e of ents) {
      const f = path.join(d, e.name);
      if (e.isDirectory()) walk(f);
      else if (/\.(js|css|html)$/.test(e.name)) { try { const t = fs.statSync(f).mtimeMs; if (t > m) m = t; } catch (er) {} }
    }
  };
  ["js", "scenes", "css", "data"].forEach((d) => walk(path.join(ROOT, d)));
  try { const t = fs.statSync(path.join(ROOT, "index.html")).mtimeMs; if (t > m) m = t; } catch (e) {}
  return Math.round(m).toString(36).slice(-7);
})();

function openBrowser(url) {
  if (process.env.NO_OPEN) return;
  if (process.platform === "win32") exec('start "" "' + url + '"');
  else if (process.platform === "darwin") exec('open "' + url + '"');
  else exec('xdg-open "' + url + '"');
}

function makeServer() {
  return http.createServer((req, res) => {
    let p = decodeURIComponent((req.url || "/").split("?")[0]);
    if (p === "/") p = "/index.html";
    if (p === "/__build") {
      res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" });
      return res.end(BUILD);
    }
    if (process.env.LOGREQ && p.indexOf("/assets/map/") === 0) { try { fs.appendFileSync(path.join(ROOT, "_tools", "req.log"), p + "\n"); } catch (e) {} }
    if (req.method === "POST" && p === "/__cam") {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        try { fs.appendFileSync(path.join(ROOT, "_tools", "cam.log"), body.trim() + "\n"); } catch (e) {}
        res.writeHead(200, { "Content-Type": "text/plain", "Cache-Control": "no-store" });
        res.end("ok");
      });
      return;
    }
    const f = path.join(ROOT, p);
    if (!f.startsWith(ROOT)) { res.writeHead(403); return res.end("403"); }
    fs.stat(f, (serr, st) => {
      if (serr || !st.isFile()) {
        if (process.env.LOG404) { try { fs.appendFileSync(path.join(ROOT, "_tools", "404.log"), p + "\n"); } catch (e) {} }
        res.writeHead(404, { "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8" }); return res.end("404");
      }
      const ext = path.extname(f).toLowerCase();
      /* 代码类仍走 no-store（改完刷新必定生效）；媒体类只做协商缓存：
         内容没变 → 304（不重下 68 MB 音频 / 338 MB 视频），换了文件 → mtime 变、ETag 变，必定生效 */
      const fresh = [".html", ".js", ".mjs", ".css", ".json"].indexOf(ext) >= 0;
      const etag = 'W/"' + st.size.toString(36) + "-" + Math.round(st.mtimeMs).toString(36) + '"';
      /* 音视频走 no-cache+ETag（体积大，别每次重下）；图片保持原来的 5 分钟缓存；代码走 no-store */
      const cache = fresh ? "no-store" : ([".wav", ".mp4"].indexOf(ext) >= 0 ? "no-cache" : "public, max-age=300");
      if (!fresh && req.headers["if-none-match"] === etag) {
        res.writeHead(304, { "ETag": etag, "Cache-Control": cache, "Access-Control-Allow-Origin": "*", "X-Build": BUILD });
        return res.end();
      }
      const headers = {
        "Content-Type": MIME[ext] || "application/octet-stream",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": cache,
        "Accept-Ranges": "bytes",
        "ETag": etag,
        "X-Build": BUILD
      };
      if (ext === ".html") {
        fs.readFile(f, (err2, buf) => {
          if (err2) { res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" }); return res.end("500"); }
          const body = Buffer.from(buf.toString("utf8").replace(/__V__/g, BUILD), "utf8");
          headers["Content-Length"] = String(body.length);
          res.writeHead(200, headers);
          res.end(body);
        });
        return;
      }
      /* Range：mp4/wav 拖动与定位时只取需要的字节段，不必整份下完 */
      let start = 0, end = st.size - 1, code = 200;
      const rng = req.headers["range"];
      if (rng) {
        const m = /^bytes=(\d*)-(\d*)$/.exec(String(rng).trim());
        if (m) {
          if (m[1] === "" && m[2] === "") { /* 无效 */ }
          else if (m[1] === "") {                      /* bytes=-N：末尾 N 字节 */
            start = Math.max(0, st.size - parseInt(m[2], 10));
          } else {
            start = parseInt(m[1], 10);
            if (m[2] !== "") end = parseInt(m[2], 10);
          }
          start = Math.max(0, start);
          end = Math.min(end, st.size - 1);
          if (start > end) {
            res.writeHead(416, { "Content-Range": "bytes */" + st.size, "Content-Type": "text/plain; charset=utf-8", "Cache-Control": cache });
            return res.end("416");
          }
          code = 206;
          headers["Content-Range"] = "bytes " + start + "-" + end + "/" + st.size;
        }
      }
      headers["Content-Length"] = String(end - start + 1);
      res.writeHead(code, headers);
      if (req.method === "HEAD") return res.end();
      const stream = fs.createReadStream(f, { start, end });
      stream.on("error", () => { try { res.destroy(); } catch (e) {} });
      stream.pipe(res);
    });
  });
}

function tryPort(port, left) {
  const srv = makeServer();
  srv.once("error", (e) => {
    if (e.code !== "EADDRINUSE") { console.error(e); return; }
    /* 端口已被占用：确认是不是本演示，并且是不是最新一版 */
    http.get("http://127.0.0.1:" + port + "/__build", (r) => {
      let s = "";
      r.on("data", (d) => s += d);
      r.on("end", () => {
        const url = "http://127.0.0.1:" + port + "/?v=" + BUILD + "&mode=" + MODE;
        const remote = (s || "").trim();
        if (r.statusCode === 200 && remote === BUILD) {
          console.log("  演示已经在运行，直接打开浏览器");
        } else {
          console.log("");
          console.log("  !! 端口 " + port + " 上跑的是旧版服务（build " + (remote || "?") + "，当前 " + BUILD + "）");
          console.log("  !! 请把那个黑色的命令行窗口关掉，再重新双击对应的 bat");
          console.log("     （仍然会先按新地址打开，浏览器会强制取最新代码）");
        }
        openBrowser(url);
        setTimeout(() => process.exit(0), 300);
      });
    }).on("error", () => { if (left > 0) tryPort(port + 1, left - 1); });
  });
  srv.listen(port, "127.0.0.1", () => {
    const url = "http://127.0.0.1:" + port + "/?v=" + BUILD + "&mode=" + MODE;
    console.log("");
    console.log("  FastHTML 演示已启动（" + MODE_CN + "）: " + url);
    console.log("  构建号: " + BUILD + "   模式: " + MODE);
    console.log("  关闭这个窗口 = 停止服务");
    console.log("");
    openBrowser(url);
  });
}

tryPort(START_PORT, MAX_TRY);
