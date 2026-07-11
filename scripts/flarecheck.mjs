// The lens flare renders nothing unless the sun is on screen — which makes "no flare"
// indistinguishable from "flare is broken". It WAS broken (the sun proxy sat beyond
// the far plane, so it never drew a single pixel). This aims the camera straight at
// the sun and asserts the frame actually gets brighter.
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { WebSocket } from 'ws';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const URL = process.env.URL || 'http://localhost:5175/';
const PORT = 9271;
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`,
  '--disable-gpu', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
  '--window-size=800,800', '--no-first-run', '--user-data-dir=/tmp/fflare', 'about:blank']);
chrome.stderr.on('data', () => {});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function cdp() {
  for (let i = 0; i < 40; i++) {
    try { const l = await (await fetch(`http://localhost:${PORT}/json/list`)).json();
      const p = l.find((t) => t.type === 'page'); if (p) return p; } catch {}
    await sleep(250);
  }
  throw new Error('no devtools');
}
const page = await cdp();
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => ws.on('open', r));
let id = 0; const pend = new Map();
ws.on('message', (d) => { const m = JSON.parse(d.toString()); if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); } });
const send = (m, p = {}) => new Promise((res) => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async (e) => (await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true })).result.value;
await send('Runtime.enable'); await send('Page.enable');
await send('Page.navigate', { url: URL });
let ready = false;
for (let i = 0; i < 40 && !ready; i++) { await sleep(500); ready = await ev('typeof window.FLOWERS !== "undefined" && !!window.FLOWERS.flower()'); }
await ev(`document.querySelectorAll('.lil-gui,#title,#hud,#loader,#panel-tab').forEach(e=>e.style.display='none'); true`);

// Aim the camera straight down the sun's bearing.
const aim = `(() => {
  const F = window.FLOWERS;
  F.aimAtSun();
  return true;
})()`;
const has = await ev('typeof window.FLOWERS.aimAtSun === "function"');
if (!has) { console.error('FAIL: app exposes no aimAtSun() hook'); process.exit(1); }

await ev(`window.FLOWERS.setFlare(false); window.FLOWERS.aimAtSun(); true`);
await sleep(900);
const off = await send('Page.captureScreenshot', { format: 'png' });
writeFileSync('/tmp/flare_off.png', Buffer.from(off.data, 'base64'));

await ev(`window.FLOWERS.setFlare(true); true`);
await sleep(900);
const on = await send('Page.captureScreenshot', { format: 'png' });
writeFileSync('/tmp/flare_on.png', Buffer.from(on.data, 'base64'));

const mean = (f) => parseFloat(execSync(
  `magick /tmp/${f} -colorspace gray -format "%[fx:mean]" info:`, { shell: '/bin/bash' }
).toString().trim());
const a = mean('flare_off.png'), b = mean('flare_on.png');
const delta = b - a;
const ok = delta > 0.004;
console.log(`flare off: mean luma ${a.toFixed(4)}`);
console.log(`flare on : mean luma ${b.toFixed(4)}   Δ=${delta.toFixed(4)}`);
console.log(ok ? '\nok — the lens flare actually draws' : '\nFAIL — flare on/off is identical; it is drawing nothing');
ws.close(); chrome.kill(); process.exit(ok ? 0 : 1);
