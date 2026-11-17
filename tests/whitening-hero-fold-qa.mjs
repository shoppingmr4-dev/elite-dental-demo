import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:4173/whitening-2026.html";
const OUT = "artifacts/whitening-2026/above-the-fold";
const viewports = [
  { name: "desktop-1440x900", width: 1440, height: 900, mobile: false },
  { name: "laptop-1366x768", width: 1366, height: 768, mobile: false },
  { name: "laptop-1280x720", width: 1280, height: 720, mobile: false },
  { name: "laptop-1024x768", width: 1024, height: 768, mobile: false },
  { name: "tablet-768x800", width: 768, height: 800, mobile: false },
  { name: "mobile-390x844", width: 390, height: 844, mobile: true },
  { name: "mobile-360x800", width: 360, height: 800, mobile: true },
  { name: "mobile-360x740", width: 360, height: 740, mobile: true }
];

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
const results = [];
const failures = [];

try {
  for (const vp of viewports) {
    const page = await browser.newPage({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
      isMobile: vp.mobile,
      hasTouch: vp.mobile,
      reducedMotion: "reduce"
    });
    const pageErrors = [];
    page.on("pageerror", error => pageErrors.push(error.message));

    const response = await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 45000 });
    if (!response?.ok()) throw new Error(`${vp.name}: page did not return a successful response`);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(120);

    const metrics = await page.evaluate(() => {
      const rect = selector => {
        const element = document.querySelector(selector);
        if (!element) return null;
        const r = element.getBoundingClientRect();
        const cs = getComputedStyle(element);
        return {
          top: Number(r.top.toFixed(2)),
          right: Number(r.right.toFixed(2)),
          bottom: Number(r.bottom.toFixed(2)),
          left: Number(r.left.toFixed(2)),
          width: Number(r.width.toFixed(2)),
          height: Number(r.height.toFixed(2)),
          display: cs.display,
          visibility: cs.visibility,
          opacity: Number(cs.opacity)
        };
      };
      const header = rect(".site-header");
      const marker = rect(".hero-eyebrow");
      const heading = rect("#hero-title");
      const paragraph = rect(".hero-lead");
      const primary = rect(".hero-actions .primary-cta");
      const secondary = rect(".hero-actions .consultation-cta");
      const visible = item => Boolean(item && item.width > 0 && item.height > 0 &&
        item.display !== "none" && item.visibility !== "hidden" && item.opacity > 0.95);
      const insideViewport = item => visible(item) && item.top >= -0.5 && item.bottom <= window.innerHeight + 0.5;
      const afterHeader = item => Boolean(item && header && item.top >= header.bottom - 1);
      const scrollWidth = document.documentElement.scrollWidth;
      const clientWidth = document.documentElement.clientWidth;
      const issues = [];
      for (const [name, item] of [["Hero marker", marker], ["headline", heading], ["supporting paragraph", paragraph], ["WhatsApp CTA", primary], ["secondary CTA", secondary]]) {
        if (!insideViewport(item)) issues.push(`${name} is not fully visible at scroll position zero`);
        if (!afterHeader(item)) issues.push(`${name} overlaps the sticky header`);
      }
      if (scrollWidth > clientWidth + 1) issues.push(`horizontal overflow: ${scrollWidth}px > ${clientWidth}px`);
      if (pageYOffset !== 0) issues.push("page did not start at scroll position zero");
      return {
        viewport: { width: innerWidth, height: innerHeight },
        scrollY: pageYOffset,
        header,
        marker,
        heading,
        paragraph,
        primary,
        secondary,
        allHeroContentVisible: issues.length === 0,
        issues,
        horizontalOverflow: scrollWidth - clientWidth
      };
    });

    await page.screenshot({
      path: `${OUT}/${vp.name}.png`,
      fullPage: false,
      animations: "disabled"
    });
    const result = { name: vp.name, ...metrics, pageErrors };
    results.push(result);
    if (metrics.issues.length || pageErrors.length) {
      failures.push({ viewport: vp.name, issues: [...metrics.issues, ...pageErrors.map(error => `JavaScript error: ${error}`)] });
      console.log(`[FAIL] ${vp.name}: ${JSON.stringify({ issues: metrics.issues, heading: metrics.heading, paragraph: metrics.paragraph, primary: metrics.primary, secondary: metrics.secondary })}`);
    } else {
      console.log(`[PASS] ${vp.name}: headline, paragraph, both complete CTAs, header clearance, and horizontal overflow`);
    }
    await page.close();
  }
} finally {
  await browser.close();
}

await writeFile(`${OUT}/metrics.json`, JSON.stringify({ viewports: results, failures }, null, 2));
console.log(JSON.stringify({ passed: results.length - failures.length, total: results.length, failures }, null, 2));
if (failures.length) process.exitCode = 1;
