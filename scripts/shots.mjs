// Visual-loop screenshotter: capture the deployed (or local) site at desktop +
// mobile, landing + simulator stages, into /tmp/wl/. Feed the PNGs to the
// vision critics (Opus reads them; codex exec -i <png>). Prints console errors.
//   node scripts/shots.mjs
//   WL_URL=http://localhost:3000 node scripts/shots.mjs
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const URL = process.env.WL_URL || "https://claude-build-day-alpha.vercel.app";
const OUT = "/tmp/wl";
mkdirSync(OUT, { recursive: true });

const errs = [];
const shots = [];
const browser = await chromium.launch();

for (const [vp, w, h] of [
  ["desktop", 1512, 982],
  ["mobile", 390, 844],
]) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  page.on("console", (m) => {
    if (m.type() === "error") errs.push(`[${vp}] ${m.text()}`);
  });
  page.on("pageerror", (e) => errs.push(`[${vp}] pageerror: ${e.message}`));

  await page.goto(URL, { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForTimeout(3500);
  await page.screenshot({ path: `${OUT}/${vp}-01-landing.png`, fullPage: true });
  shots.push(`${OUT}/${vp}-01-landing.png`);

  try {
    await page.getByText("Run the workflow", { exact: false }).click({ timeout: 8000 });
    await page.waitForTimeout(7000); // through fork + flip (auto-play)
    await page.screenshot({ path: `${OUT}/${vp}-02-fork.png` });
    shots.push(`${OUT}/${vp}-02-fork.png`);
    await page.waitForTimeout(9000); // through diagnose + repair + verify
    await page.screenshot({ path: `${OUT}/${vp}-03-verified.png` });
    shots.push(`${OUT}/${vp}-03-verified.png`);
  } catch (e) {
    errs.push(`[${vp}] run-flow: ${e.message}`);
  }
  await page.close();
}

console.log("SHOTS:\n" + shots.join("\n"));
console.log("\nCONSOLE ERRORS:", errs.length ? "\n" + errs.join("\n") : "none");
await browser.close();
