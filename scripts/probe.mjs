// WorldLine visual+motion probe. Drives the live (or local) site with Playwright
// and captures what STILLS miss: animation FILMSTRIPS, frame-time/jank, layout
// shift, console errors, interaction states, and a DETERMINISTIC text-overlap
// report (the 3D labels are drei <Html> DOM nodes, so collisions are measurable).
// Feed /tmp/wl/*.png + /tmp/wl/report.json to the vision critics (Opus + codex -i).
//   node scripts/probe.mjs
//   WL_URL=http://localhost:3000 node scripts/probe.mjs
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";

const URL = process.env.WL_URL || "https://claude-build-day-alpha.vercel.app";
const OUT = "/tmp/wl";
mkdirSync(OUT, { recursive: true });

const report = { url: URL, when: new Date().toISOString(), viewports: {} };
const browser = await chromium.launch();

// --- injected page instrumentation -----------------------------------------
const INSTRUMENT = () => {
  // cumulative layout shift
  // @ts-ignore
  window.__cls = 0;
  try {
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) {
        // @ts-ignore
        if (!e.hadRecentInput) window.__cls += e.value;
      }
    }).observe({ type: "layout-shift", buffered: true });
  } catch {}
};
const START_FPS = () => {
  // @ts-ignore
  window.__f = [];
  let last = performance.now();
  const tick = () => {
    const n = performance.now();
    // @ts-ignore
    window.__f.push(n - last);
    last = n;
    // @ts-ignore
    window.__id = requestAnimationFrame(tick);
  };
  // @ts-ignore
  window.__id = requestAnimationFrame(tick);
};
const STOP_FPS = () => {
  // @ts-ignore
  cancelAnimationFrame(window.__id);
  // @ts-ignore
  const f = window.__f || [];
  if (!f.length) return { count: 0 };
  const avg = f.reduce((a, b) => a + b, 0) / f.length;
  return {
    count: f.length,
    avgMs: +avg.toFixed(1),
    maxMs: +Math.max(...f).toFixed(1),
    jankFrames: f.filter((x) => x > 50).length,
  };
};
// deterministic text-overlap detector (own-text leaf elements only)
const OVERLAPS = () => {
  const els = [...document.querySelectorAll("body *")].filter((el) => {
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none" || +cs.opacity === 0) return false;
    return [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 0);
  });
  const items = els
    .map((el) => ({ el, t: el.textContent.trim().slice(0, 28), r: el.getBoundingClientRect() }))
    .filter((x) => x.r.width > 1 && x.r.height > 1 && x.r.top < innerHeight && x.r.bottom > 0 && x.r.left < innerWidth && x.r.right > 0);
  const out = [];
  for (let i = 0; i < items.length; i++)
    for (let j = i + 1; j < items.length; j++) {
      // skip ancestor/descendant pairs — a parent containing its own text+child is not a collision
      if (items[i].el.contains(items[j].el) || items[j].el.contains(items[i].el)) continue;
      const a = items[i].r, b = items[j].r;
      const ix = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
      const iy = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
      const area = ix * iy;
      const minA = Math.min(a.width * a.height, b.width * b.height);
      if (minA > 0 && area > 0.35 * minA) out.push({ a: items[i].t, b: items[j].t, ratio: +(area / minA).toFixed(2) });
    }
  return out;
};

async function filmstrip(page, name, frames = 8, intervalMs = 110) {
  const paths = [];
  for (let i = 0; i < frames; i++) {
    const p = `${OUT}/${name}-f${String(i).padStart(2, "0")}.png`;
    await page.screenshot({ path: p });
    paths.push(p);
    await page.waitForTimeout(intervalMs);
  }
  return paths;
}

for (const [vp, w, h] of [
  ["desktop", 1512, 982],
  ["mobile", 390, 844],
]) {
  const errs = [];
  const r = { console: errs, states: {} };
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  page.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  page.on("pageerror", (e) => errs.push("pageerror: " + e.message));
  await page.addInitScript(INSTRUMENT);

  await page.goto(URL, { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForTimeout(1500);

  // hero entrance filmstrip (fresh load)
  await filmstrip(page, `${vp}-hero`, 8, 110);
  await page.screenshot({ path: `${OUT}/${vp}-landing.png`, fullPage: true });
  r.states.landing = { overlaps: await page.evaluate(OVERLAPS) };

  // run the simulator: capture the worldline draw + fork as a filmstrip under FPS
  try {
    await page.getByText("Run the workflow", { exact: false }).click({ timeout: 8000 });
    await page.evaluate(START_FPS);
    await filmstrip(page, `${vp}-run-fork`, 10, 130);
    r.states.runFork = { fps: await page.evaluate(STOP_FPS), overlaps: await page.evaluate(OVERLAPS) };

    // advance through to the flip + verify, capturing motion + overlap with nodes present
    await page.waitForTimeout(4000);
    await page.evaluate(START_FPS);
    await filmstrip(page, `${vp}-flip`, 8, 130);
    r.states.flip = { fps: await page.evaluate(STOP_FPS), overlaps: await page.evaluate(OVERLAPS) };
    await page.waitForTimeout(6000);
    await page.screenshot({ path: `${OUT}/${vp}-verified.png`, fullPage: true });
    r.states.verified = { overlaps: await page.evaluate(OVERLAPS) };
  } catch (e) {
    errs.push("run-flow: " + e.message);
  }

  // interaction states on the primary control
  try {
    const btn = page.getByText(/Re-run live|Play|Pause/i).first();
    await btn.hover({ timeout: 2000 });
    await page.screenshot({ path: `${OUT}/${vp}-hover.png` });
    await btn.focus();
    await page.screenshot({ path: `${OUT}/${vp}-focus.png` });
  } catch {}

  r.cls = await page.evaluate(() => Number((window.__cls || 0).toFixed(4)));
  report.viewports[vp] = r;
  await page.close();
}

writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2));
await browser.close();

// summary to stdout
for (const [vp, r] of Object.entries(report.viewports)) {
  const allOverlaps = Object.values(r.states).flatMap((s) => s.overlaps || []);
  console.log(`\n[${vp}]`);
  console.log("  console errors:", r.console.length ? r.console.length : "none");
  console.log("  CLS:", r.cls);
  console.log("  fps (run/fork):", JSON.stringify(r.states.runFork?.fps));
  console.log("  fps (flip):", JSON.stringify(r.states.flip?.fps));
  console.log("  TEXT OVERLAPS:", allOverlaps.length ? JSON.stringify(allOverlaps) : "none ✅");
}
console.log(`\nartifacts: ${OUT}/  (filmstrip frames + report.json)`);
