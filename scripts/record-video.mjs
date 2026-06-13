// WorldLine 60s promo — scripted, captioned walkthrough recorded off the LIVE site.
// Voiceless + on-screen captions + title cards (clean, modern, no flashy excess).
//   node scripts/record-video.mjs   ->  /tmp/wl-video/*.webm  (convert to mp4 after)
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const URL = process.env.WL_URL || "https://claude-build-day-alpha.vercel.app";
const OUT = "/tmp/wl-video";
mkdirSync(OUT, { recursive: true });
const W = 1920, H = 1080;

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: W, height: H },
  deviceScaleFactor: 1,
  recordVideo: { dir: OUT, size: { width: W, height: H } },
});
const page = await ctx.newPage();
const sleep = (ms) => page.waitForTimeout(ms);

await page.goto(URL, { waitUntil: "networkidle" });

// inject caption + title-card overlays
await page.addStyleTag({ content: `
  #vid-cap, #vid-card { font-family: Fraunces, ui-serif, Georgia, serif; }
  #vid-cap { position: fixed; left:50%; bottom:7%; transform: translateX(-50%);
    z-index: 99998; background: rgba(7,10,18,0.85); color:#eef2f9; backdrop-filter: blur(10px);
    padding: 16px 30px; border-radius: 999px; font-size: 30px; font-weight:500; letter-spacing:-0.01em;
    border:1px solid rgba(255,255,255,0.10); opacity:0; transition: opacity .45s ease; max-width: 78vw; text-align:center;
    box-shadow:0 16px 50px rgba(0,0,0,.45); }
  #vid-card { position: fixed; inset:0; z-index:100000; display:flex; flex-direction:column; align-items:center; justify-content:center;
    background: #070a12; background-image: radial-gradient(1000px 560px at 50% 32%, rgba(91,140,255,0.16), rgba(7,10,18,0) 72%);
    color:#eef2f9; opacity:0; transition: opacity .35s ease; text-align:center; gap: 20px; }
  #vid-card .logo{ font-family: ui-monospace, monospace; letter-spacing:0.42em; font-size:20px; color:#9fb0c9; text-transform:uppercase; }
  #vid-card h1{ font-size: 92px; font-weight:500; line-height:1.0; margin:0; letter-spacing:-0.02em; }
  #vid-card h1 .a{ color:#5b8cff; }
  #vid-card h1 .g{ color:#3ddc84; }
  #vid-card p{ font-size: 30px; color:#aebbd0; margin:0; max-width: 60vw; }
  #vid-card .url{ font-family: ui-monospace,monospace; font-size:20px; color:#3ddc84; margin-top:10px; letter-spacing:0.02em; }
`});
await page.evaluate(() => {
  const c = document.createElement("div"); c.id = "vid-cap"; document.body.appendChild(c);
  const k = document.createElement("div"); k.id = "vid-card"; document.body.appendChild(k);
});
const cap = (t) => page.evaluate((t) => { const e = document.getElementById("vid-cap"); e.textContent = t; e.style.opacity = t ? "1" : "0"; }, t);
const card = (html) => page.evaluate((html) => { const e = document.getElementById("vid-card"); e.innerHTML = html; e.style.opacity = html ? "1" : "0"; }, html);

// ── 0:00 title card ───────────────────────────────────────────────
await card(`<div class="logo">World · Line</div><h1>World<span class="a">Line</span></h1><p>A flight simulator for agent failures</p>`);
await sleep(3200);
await card(""); await sleep(700);

// ── hero ──────────────────────────────────────────────────────────
await page.evaluate(() => window.scrollTo({ top: 0 }));
await cap("Your agent failed. Which decision actually mattered?");
await sleep(3600);
await cap("");

// ── simulator (manual paced steps) ────────────────────────────────
await page.evaluate(() => document.querySelector("#sim")?.scrollIntoView({ behavior: "smooth", block: "center" }));
await sleep(1200);                                  // autostart stage 1
try { await page.click("text=Pause", { timeout: 1200 }); } catch {}
await cap("A 7-step agent run just denied a valid $240 claim");
await sleep(2600);
const step = async (text, hold) => {
  try { await page.click('button:has-text("›")', { timeout: 1200 }); } catch {}
  await cap(text); await sleep(hold);
};
await step("Claude intervention-tests every decision — in parallel", 4900); // attribution table
await step("Last-touch blame is wrong; only the Classifier flips it", 3300); // fork
await step("One fix, re-simulated live — red → green: APPROVE · $240", 3300); // flip
await step("Root cause: a wrong policy baked into the prompt", 2500);         // diagnose
await step("Claude rewrites the prompt — effort = max", 2500);                // repair
await step("Proven by a deterministic assertion — not self-graded", 4200);    // verify
await cap("");

// ── institutional memory ──────────────────────────────────────────
await page.evaluate(() => document.querySelector("#memory")?.scrollIntoView({ behavior: "smooth", block: "start" }));
await sleep(1500);
await cap("Every verified fix becomes fleet memory");
await sleep(2700);
try { await page.click('button:has-text("Replay memory growth")', { timeout: 1200 }); } catch {}
await sleep(2400);
await cap("Different agent, different wording — same failure class, caught");
await sleep(3500);
await cap("Reworded regressions are BLOCKED before they ship");
await sleep(3300);
await cap("");

// ── proof / live ──────────────────────────────────────────────────
await page.evaluate(() => document.querySelector("#proof")?.scrollIntoView({ behavior: "smooth", block: "center" }));
await sleep(1400);
await cap("Everything you saw runs live on Opus 4.8");
await sleep(3000);
await cap("");
await sleep(800); // let the caption fully clear before the end card (clean cut)

// ── end card ──────────────────────────────────────────────────────
await card(`<div class="logo">World · Line</div><h1>Stop repeating <span class="g">failures</span>.</h1><p>Counterfactual debugging + institutional memory for agent fleets</p><div class="url">claude-build-day-alpha.vercel.app · 8/8 tests · live on Opus 4.8</div>`);
await sleep(4000);

await ctx.close();   // flushes the video
await browser.close();
console.log("video written to", OUT);
