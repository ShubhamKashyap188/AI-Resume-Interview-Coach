import fs from "node:fs";
import path from "node:path";
import { chromium, devices } from "playwright";

const outputDir = path.resolve("docs/screenshots");
fs.mkdirSync(outputDir, { recursive: true });

const desktopPath = path.join(outputDir, "home-desktop.png");
const mobilePath = path.join(outputDir, "home-mobile.png");

const browser = await chromium.launch();

try {
  const desktopContext = await browser.newContext({ viewport: { width: 1512, height: 982 } });
  const desktopPage = await desktopContext.newPage();
  await desktopPage.goto("http://127.0.0.1:3000", { waitUntil: "networkidle" });
  await desktopPage.screenshot({ path: desktopPath, fullPage: true });
  await desktopContext.close();

  const mobileContext = await browser.newContext({ ...devices["iPhone 13"] });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto("http://127.0.0.1:3000", { waitUntil: "networkidle" });
  await mobilePage.screenshot({ path: mobilePath, fullPage: true });
  await mobileContext.close();

  console.log(`Saved screenshots:\n- ${desktopPath}\n- ${mobilePath}`);
} finally {
  await browser.close();
}
