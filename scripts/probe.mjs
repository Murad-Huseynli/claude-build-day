// WorldLine visual+motion probe. Drives the live (or local) site with Playwright
// and captures what STILLS miss: animation FILMSTRIPS, frame-time/jank, layout
// shift, REAL page-console errors, and a DETERMINISTIC text-overlap report.
// Feed /tmp/wl/*.png + /tmp/wl/report.json to the vision critics (Opus + codex -i).
//   node scripts/probe.mjs            (prod)
//   WL_URL=http://localhost:3000 node scripts/probe.mjs
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";

const URL = process.env.WL_URL || "https://claude-build-day-alpha.vercel.app";
const OUT = "/tmp/wl";
mkdirSync(OUT, { recursive: true });

const report = { url: URL, when: new Date().toISOString(), viewports: {} };
const browser = await chromium.launch();

const INSTRUMENT = () => {
  window.__cls = 0;
  try {
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value;
    }).observe({ type: "layout-shift", buffered: true });
  } catch {}
};
const START_FPS = () => {
  window.__f = [];
  let last = performance.now();
  const tick = () => {
    const n = performance.now();
    window.__f.push(n - last);
    last = n;
    window.__id = requestAnimationFrame(tick);
  };
  window.__id = requestAnimationFrame(tick);
};
const STOP_FPS = () => {
  cancelAnimationFrame(window.__id);
  const f = window.__f || [];
  if (!f.length) return { count: 0 };
  const avg = f.reduce((a, b) => a + b, 0) / f.length;
  return { count: f.length, avgMs: +avg.toFixed(1), maxMs: +Math.max(...f).toFixed(1), jankFrames: f.filter((x) => x > 50).length };
};
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

for (const [vp, w, h] of [
  ["desktop", 1512, 982],
  ["mobile", 390, 844],
]) {
  const consoleErrs = [];
  const notes = [];
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  page.on("console", (m) => m.type() === "error" && consoleErrs.push(m.text()));
  page.on("pageerror", (e) => consoleErrs.push("pageerror: " + e.message));
  await page.addInitScript(INSTRUMENT);

  const film = async (name, frames, ms) => {
    for (let i = 0; i < frames; i++) {
      await page.screenshot({ path: `${OUT}/${name}-f${String(i).padStart(2, "0")}.png` });
      await page.waitForTimeout(ms);
    }
  };
  const r = { console: consoleErrs, notes, states: {} };

  try {
    await page.goto(URL, { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForTimeout(1200);
    await film(`${vp}-hero`, 6, 110);
    await page.screenshot({ path: `${OUT}/${vp}-landing.png`, fullPage: true });
    r.states.landing = { overlaps: await page.evaluate(OVERLAPS) };

    // trigger the simulator (auto-starts when #sim scrolls into view)
    await page.locator("#sim").scrollIntoViewIfNeeded();
    await page.waitForTimeout(3000); // stage ~2, animation active

    // CLEAN fps window: measure rAF for 1.6s with NO concurrent screenshots
    await page.evaluate(START_FPS);
    await page.waitForTimeout(1600);
    const cleanFps = await page.evaluate(STOP_FPS);

    await film(`${vp}-run-fork`, 8, 150);
    r.states.runFork = { fps: cleanFps, overlaps: await page.evaluate(OVERLAPS) };

    await page.waitForTimeout(2400); // stage 4 (flip)
    await film(`${vp}-flip`, 6, 150);
    r.states.flip = { overlaps: await page.evaluate(OVERLAPS) };

    await page.waitForTimeout(7000); // stages 5-7 (diagnose/repair/verify)
    await page.screenshot({ path: `${OUT}/${vp}-verified.png`, fullPage: true });
    r.states.verified = { overlaps: await page.evaluate(OVERLAPS) };

    // interaction state on a control
    try {
      const btn = page.getByText(/Pause|▶ Play/).first();
      await btn.hover({ timeout: 2000 });
      await page.screenshot({ path: `${OUT}/${vp}-hover.png` });
    } catch (e) {
      notes.push("hover: " + e.message);
    }
  } catch (e) {
    notes.push("flow: " + e.message);
  }

  r.cls = await page.evaluate(() => Number((window.__cls || 0).toFixed(4)));
  report.viewports[vp] = r;
  await page.close();
}

writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2));
await browser.close();

for (const [vp, r] of Object.entries(report.viewports)) {
  const allOverlaps = Object.values(r.states).flatMap((s) => s.overlaps || []);
  console.log(`\n[${vp}]`);
  console.log("  PAGE console errors:", r.console.length ? JSON.stringify(r.console) : "none ✅");
  console.log("  probe notes:", r.notes.length ? JSON.stringify(r.notes) : "none");
  console.log("  CLS:", r.cls);
  console.log("  fps run/fork:", JSON.stringify(r.states.runFork?.fps));
  console.log("  fps flip:", JSON.stringify(r.states.flip?.fps));
  console.log("  TEXT OVERLAPS:", allOverlaps.length ? JSON.stringify(allOverlaps) : "none ✅");
}
console.log(`\nartifacts: ${OUT}/`);
