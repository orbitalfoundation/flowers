// Does the BLOOM actually move with the stem?
// The head used to sit perfectly still while the stem swayed under it (the wind was
// applied in each mesh's own local space, so a petal's "height" was ~0 and its bend
// lever went to zero). This catches that regression: it shoots the same flower at two
// moments in a stiff wind and measures how much the bloom half of the frame changed
// versus the stem half. If the bloom is frozen, its delta collapses to ~0 while the
// stem's stays high — which is exactly the bug.
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { WebSocket } from 'ws';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const URL = process.env.URL || 'http://localhost:5175/';
const PORT = 9261;
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`,
  '--disable-gpu', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
  '--window-size=700,700', '--no-first-run', '--user-data-dir=/tmp/fwind', 'about:blank']);
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
if (!ready) { console.error('app never became ready'); process.exit(1); }
await ev(`document.querySelectorAll('.lil-gui,#title,#hud,#loader,#panel-tab').forEach(e=>e.style.display='none'); true`);

let fail = 0;
for (const sp of ['sunflower', 'tulip', 'daisy']) {
  await ev(`window.FLOWERS.setSpecies('${sp}'); window.FLOWERS.setWind(1.4); true`);
  await sleep(900);
  const a = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync('/tmp/w_a.png', Buffer.from(a.data, 'base64'));
  await sleep(1100);   // ~half a sway cycle
  const b = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync('/tmp/w_b.png', Buffer.from(b.data, 'base64'));

  // The bloom lives in the upper half of frame, the stem in the lower half.
  const delta = (crop) => {
    const out = execSync(
      `magick /tmp/w_a.png -crop ${crop} +repage /tmp/c_a.png; ` +
      `magick /tmp/w_b.png -crop ${crop} +repage /tmp/c_b.png; ` +
      `magick compare -metric MAE /tmp/c_a.png /tmp/c_b.png null: 2>&1 || true`,
      { shell: '/bin/bash' }
    ).toString();
    const m = out.match(/\(([\d.]+)\)/);
    return m ? parseFloat(m[1]) : 0;
  };
  const bloom = delta('700x330+0+40');    // upper band: the flower head
  const stem = delta('700x260+0+430');    // lower band: the stalk

  // Both must actually move. The regression signature is bloom ≈ 0 with stem > 0.
  const ok = bloom > 0.0008 && stem > 0.0008;
  if (!ok) fail++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${sp.padEnd(10)} bloom Δ=${bloom.toFixed(5)}  stem Δ=${stem.toFixed(5)}` +
              (bloom <= 0.0008 ? '   <- BLOOM IS FROZEN' : ''));
}
console.log(fail ? `\n${fail} FAILURES` : '\nwind moves the whole plant');
ws.close(); chrome.kill(); process.exit(fail ? 1 : 0);
