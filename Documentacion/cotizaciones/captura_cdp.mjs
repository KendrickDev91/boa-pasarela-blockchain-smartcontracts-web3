// Uso: node cdp_shot.mjs <url> <salida.png> <selector|texto a buscar> [ancho] [alto] [nota]
import { spawn } from 'node:child_process';
import fs from 'node:fs';
const [url, out, objetivo, ancho = 1400, alto = 900, nota = ''] = process.argv.slice(2);
const edge = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const perfil = process.env.TEMP + '/cdp_prof_' + Date.now();
const p = spawn(edge, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--window-size=${ancho},${alto}`,
  '--remote-debugging-port=9333', `--user-data-dir=${perfil}`, 'about:blank'], { stdio: 'ignore' });
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
let lista;
for (let i = 0; i < 40; i++) { try { lista = await (await fetch('http://127.0.0.1:9333/json')).json(); break; } catch { await dormir(250); } }
const pagina = lista.find((t) => t.type === 'page');
const ws = new WebSocket(pagina.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));
let id = 0; const pend = {};
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pend[m.id]) { pend[m.id](m); delete pend[m.id]; } });
const cmd = (method, params = {}) => new Promise((r) => { const i = ++id; pend[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
await cmd('Page.enable');
await cmd('Emulation.setDeviceMetricsOverride', { width: +ancho, height: +alto, deviceScaleFactor: 1, mobile: false });
await cmd('Page.navigate', { url });
await dormir(9000);
const js = `(() => { ${process.env.EXTRA_JS || ""};
  const obj = ${JSON.stringify(objetivo)};
  let el = null;
  try { el = document.querySelector(obj); } catch {}
  if (!el) { const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (w.nextNode()) { if (w.currentNode.textContent.includes(obj)) { el = w.currentNode.parentElement; break; } } }
  if (el) el.scrollIntoView({block: 'start'});
  window.scrollBy(0, -40);
  const n = document.createElement('div');
  n.textContent = ${JSON.stringify(nota)};
  n.style.cssText = 'position:fixed;bottom:0;left:0;right:0;background:#fffbe6;color:#000;font:15px Arial;padding:6px 10px;z-index:2147483647;border-top:1px solid #999';
  if (n.textContent) document.body.appendChild(n);
  return !!el;
})()`;
const r = await cmd('Runtime.evaluate', { expression: js, returnByValue: true });
console.log('objetivo encontrado:', r.result?.result?.value);
await dormir(1500);
const s = await cmd('Page.captureScreenshot', { format: 'png' });
fs.writeFileSync(out, Buffer.from(s.result.data, 'base64'));
console.log('ok', out);
ws.close(); p.kill();
process.exit(0);
