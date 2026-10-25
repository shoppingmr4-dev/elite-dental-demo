import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:4173/";
const ARTIFACT_DIR = "artifacts";
await mkdir(ARTIFACT_DIR, { recursive: true });

const viewports = [
  { name: "mobile-360", width: 360, height: 800, mobile: true },
  { name: "mobile-390", width: 390, height: 844, mobile: true },
  { name: "tablet-768", width: 768, height: 1024, mobile: false },
  { name: "desktop-1440", width: 1440, height: 900, mobile: false }
];

const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
const results = [];
const failures = [];

try {
  for (const viewport of viewports) {
    const page = await browser.newPage({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: 1,
      reducedMotion: "reduce"
    });
    const pageErrors = [];
    const localHttpErrors = [];
    page.on("pageerror", error => pageErrors.push(error.message));
    page.on("response", response => {
      const url = response.url();
      if (url.startsWith(new URL(BASE_URL).origin) && response.status() >= 400) {
        localHttpErrors.push({ status: response.status(), url });
      }
    });

    const response = await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 45000 });
    if (!response || !response.ok()) failures.push(`${viewport.name}: document failed to load`);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(350);

    const initial = await page.evaluate(() => {
      const h1 = document.querySelector("h1");
      const nav = document.querySelector("#primary-navigation");
      const toggle = document.querySelector("#nav-toggle");
      const css = document.querySelector('link[href="assets/css/site.css"]');
      const imgs = [...document.querySelectorAll("img")];
      const ctas = [...document.querySelectorAll('a[href*="wa.me"]')];
      return {
        rtl: document.documentElement.dir === "rtl" && document.documentElement.lang === "ar",
        h1Text: h1?.innerText?.trim() || "",
        h1FontSize: h1 ? getComputedStyle(h1).fontSize : "0px",
        h1Visible: Boolean(h1 && h1.getBoundingClientRect().height > 0),
        navVisible: Boolean(nav && getComputedStyle(nav).display !== "none"),
        toggleVisible: Boolean(toggle && getComputedStyle(toggle).display !== "none"),
        cssLoaded: Boolean(css && css.sheet),
        imageCount: imgs.length,
        imagesWithAlt: imgs.filter(img => img.hasAttribute("alt") && img.alt.trim()).length,
        allImagesUnsplash: imgs.every(img => /^https:\/\/images\.unsplash\.com\//.test(img.currentSrc || img.src)),
        ctaCount: ctas.length,
        allCtasWhatsapp: ctas.every(a => a.href.startsWith("https://wa.me/")),
        scrollWidth: document.documentElement.scrollWidth,
        viewportWidth: document.documentElement.clientWidth,
        rootOverflowX: getComputedStyle(document.documentElement).overflowX,
        horizontalScrollLeft: (() => {
          const root = document.documentElement;
          root.scrollLeft = 100;
          const left = root.scrollLeft;
          root.scrollLeft = 0;
          return left;
        })(),
        windowInnerWidth: window.innerWidth,
        overflowingElements: [...document.querySelectorAll("body *")].map(el => {
          const rect = el.getBoundingClientRect();
          const style = getComputedStyle(el);
          return {
            tag: el.tagName.toLowerCase(),
            id: el.id || "",
            classes: typeof el.className === "string" ? el.className.slice(0, 150) : "",
            left: Math.round(rect.left * 10) / 10,
            right: Math.round(rect.right * 10) / 10,
            width: Math.round(rect.width * 10) / 10,
            position: style.position,
            overflowX: style.overflowX,
            parentTag: el.parentElement?.tagName.toLowerCase() || "",
            parentClasses: typeof el.parentElement?.className === "string" ? el.parentElement.className.slice(0, 120) : "",
            parentOverflowX: el.parentElement ? getComputedStyle(el.parentElement).overflowX : ""
          };
        }).filter(el => el.right > document.documentElement.clientWidth + 1 && el.width > 0)
          .sort((a, b) => b.right - a.right).slice(0, 18),
        missingAnchors: [...document.querySelectorAll('a[href^="#"]')]
          .map(a => a.getAttribute("href").slice(1))
          .filter(id => id && !document.getElementById(id)),
        sectionComments: ["Hero Section", "Services Section", "Approach & Technology Section", "Care Journey Section", "FAQ Section", "Contact & Primary CTA Section"]
          .every(name => document.documentElement.innerHTML.includes("<!-- " + name + " -->"))
      };
    });

    if (!initial.rtl) failures.push(`${viewport.name}: Arabic RTL document attributes missing`);
    if (!initial.h1Visible || !initial.h1Text) failures.push(`${viewport.name}: H1 is missing or not visible`);
    if (!initial.cssLoaded) failures.push(`${viewport.name}: compiled Tailwind stylesheet did not load`);
    if (!initial.allImagesUnsplash || initial.imageCount !== 6) failures.push(`${viewport.name}: expected six Unsplash image sources`);
    if (initial.imagesWithAlt !== initial.imageCount) failures.push(`${viewport.name}: one or more images lack useful alt text`);
    if (initial.ctaCount < 3 || !initial.allCtasWhatsapp) failures.push(`${viewport.name}: WhatsApp CTA links missing or invalid`);
    if (initial.rootOverflowX !== "clip") failures.push(`${viewport.name}: horizontal overflow is not clipped at the root`);
    if (initial.horizontalScrollLeft !== 0) failures.push(`${viewport.name}: document can still scroll horizontally`);
    if (initial.scrollWidth > initial.viewportWidth + 1 && initial.rootOverflowX !== "clip") failures.push(`${viewport.name}: horizontal overflow ${initial.scrollWidth}px > ${initial.viewportWidth}px; elements=${JSON.stringify(initial.overflowingElements)}`);
    if (initial.missingAnchors.length) failures.push(`${viewport.name}: broken anchors: ${initial.missingAnchors.join(", ")}`);
    if (!initial.sectionComments) failures.push(`${viewport.name}: descriptive HTML section comments missing`);
    if (pageErrors.length) failures.push(`${viewport.name}: uncaught page errors: ${pageErrors.join(" | ")}`);
    if (localHttpErrors.length) failures.push(`${viewport.name}: local HTTP errors: ${JSON.stringify(localHttpErrors)}`);

    if (viewport.mobile) {
      if (initial.navVisible) failures.push(`${viewport.name}: mobile nav should start collapsed`);
      if (!initial.toggleVisible) failures.push(`${viewport.name}: mobile menu toggle should be visible`);
      await page.locator("#nav-toggle").click();
      const opened = await page.evaluate(() => ({
        expanded: document.querySelector("#nav-toggle")?.getAttribute("aria-expanded") === "true",
        navVisible: getComputedStyle(document.querySelector("#primary-navigation")).display !== "none"
      }));
      if (!opened.expanded || !opened.navVisible) failures.push(`${viewport.name}: mobile nav failed to open`);
      await page.locator('#primary-navigation a[href="#services"]').click();
      const closed = await page.evaluate(() => ({
        expanded: document.querySelector("#nav-toggle")?.getAttribute("aria-expanded") === "false",
        navHidden: getComputedStyle(document.querySelector("#primary-navigation")).display === "none",
        hash: location.hash
      }));
      if (!closed.expanded || !closed.navHidden || closed.hash !== "#services") {
        failures.push(`${viewport.name}: mobile nav failed to close after section selection`);
      }
    } else {
      if (!initial.navVisible) failures.push(`${viewport.name}: desktop navigation should be visible`);
      if (initial.toggleVisible) failures.push(`${viewport.name}: mobile menu toggle should be hidden on desktop/tablet`);
    }

    await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 45000 });
    // Scroll through the document so native loading="lazy" images get a chance to request and paint.
    await page.evaluate(async () => {
      const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
      const step = Math.max(320, Math.floor(window.innerHeight * 0.8));
      const end = document.documentElement.scrollHeight;
      for (let y = 0; y < end; y += step) {
        window.scrollTo(0, y);
        await pause(90);
      }
      window.scrollTo(0, 0);
    });
    try {
      await page.waitForFunction(() => [...document.images].every(img => img.complete), null, { timeout: 10000 });
    } catch {
      // Report incomplete third-party image requests separately from layout failures.
    }
    await page.waitForTimeout(250);
    await page.screenshot({ path: ARTIFACT_DIR + "/" + viewport.name + ".png", fullPage: true, animations: "disabled" });

    // Image requests can be blocked or rate-limited by third-party CDNs. Record load counts
    // separately rather than misreporting third-party availability as a layout failure.
    const imageLoadCounts = await page.evaluate(() => {
      const images = [...document.querySelectorAll("img")];
      return {
        loaded: images.filter(img => img.complete && img.naturalWidth > 0).length,
        failedOrNotYetLoaded: images.filter(img => img.complete && img.naturalWidth === 0).length,
        pending: images.filter(img => !img.complete).length
      };
    });
    results.push({ ...viewport, ...initial, pageErrors, localHttpErrors, imageLoadCounts });
    console.log(`[PASS-STRUCTURE] ${viewport.name}: ${initial.viewportWidth}px, H1 ${initial.h1FontSize}, overflow ${Math.max(0, initial.scrollWidth - initial.viewportWidth)}px`);
    await page.close();
  }
} finally {
  await browser.close();
}

const report = { url: BASE_URL, generatedAt: new Date().toISOString(), results, failures };
await writeFile(`${ARTIFACT_DIR}/responsive-smoke-report.json`, JSON.stringify(report, null, 2) + "\n");
if (failures.length) {
  console.error("\nResponsive/browser checks failed:\n- " + failures.join("\n- "));
  process.exitCode = 1;
} else {
  console.log(`\nAll structural and interaction checks passed for ${results.length} viewport sizes.`);
}
