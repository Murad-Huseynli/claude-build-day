// Headless browser smoke: load the live URL, capture console errors, and
// screenshot the intro + an advanced stage so we can verify the 3D renders.
//   node scripts/shot.mjs            (uses the prod alias)
//   WL_URL=http://localhost:3000 node scripts/shot.mjs
import { chromium } from "playwright";

const URL = process.env.WL_URL || "https://claude-build-day-alpha.vercel.app";
const errs = [];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on("console", (m) => {
  if (m.type() === "error") errs.push("console: " + m.text());
});
page.on("pageerror", (e) => errs.push("pageerror: " + e.message));

await page.goto(URL, { waitUntil: "networkidle", timeout: 45000 });
await page.waitForTimeout(4000);
await page.screenshot({ path: "/tmp/wl-intro.png" });

try {
  await page.getByText("Run the workflow", { exact: false }).click({ timeout: 8000 });
} catch (e) {
  errs.push("click 'Run the workflow' failed: " + e.message);
}
await page.waitForTimeout(12000); // let auto-play advance through fork + flip
await page.screenshot({ path: "/tmp/wl-stage.png" });

console.log("CONSOLE ERRORS:", errs.length ? "\n" + errs.join("\n") : "none");
await browser.close();
