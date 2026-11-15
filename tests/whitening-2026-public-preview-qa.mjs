import assert from "node:assert/strict";
import { chromium } from "playwright";

const previewUrl = process.env.PUBLIC_PREVIEW_URL;
assert.ok(previewUrl, "PUBLIC_PREVIEW_URL must be set to the immutable public preview URL");

const viewports = [
  { name: "laptop-1024", width: 1024, height: 900 },
  { name: "laptop-1280", width: 1280, height: 800 },
  { name: "desktop-1440", width: 1440, height: 900 }
];

const browser = await chromium.launch({ headless: true });
const results = [];

try {
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport });
    // raw.githack shows a one-time anti-phishing confirmation for HTML pages.
    // This HttpOnly cookie is the service-documented automation bypass.
    await context.addCookies([{
      name: "__Http-phish",
      value: "1",
      domain: "rawcdn.githack.com",
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "Lax"
    }]);

    const page = await context.newPage();
    const pageErrors = [];
    const localResourceFailures = [];
    page.on("pageerror", error => pageErrors.push(error.message));
    page.on("response", response => {
      try {
        if (new URL(response.url()).origin === "https://rawcdn.githack.com" && response.status() >= 400) {
          localResourceFailures.push({ status: response.status(), url: response.url() });
        }
      } catch {}
    });

    const response = await page.goto(previewUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
    assert.ok(response && response.ok(), `${viewport.name}: public preview did not return HTTP 2xx`);
    await page.waitForSelector("#hero-title", { state: "visible", timeout: 30000 });
    await page.evaluate(async () => {
      await document.fonts.ready;
      const images = [...document.images];
      await Promise.all(images.map(image => image.decode().catch(() => {})));
    });

    const initial = await page.evaluate(() => {
      const header = document.querySelector(".site-header");
      const title = document.querySelector("#hero-title");
      const logo = document.querySelector(".brand-mark img");
      const cta = document.querySelector(".header-action");
      const heroImage = document.querySelector(".photo-frame img");
      const rect = element => {
        const r = element.getBoundingClientRect();
        return { left:r.left, right:r.right, width:r.width, height:r.height };
      };
      return {
        titleVisible: Boolean(title && title.getBoundingClientRect().height > 0),
        titleText: title?.innerText?.trim() || "",
        bodyTextLength: document.body.innerText.trim().length,
        bodyHeight: document.documentElement.scrollHeight,
        lang: document.documentElement.lang,
        dir: document.documentElement.dir,
        header: rect(header),
        brand: rect(document.querySelector(".brand")),
        nav: rect(document.querySelector("#main-nav")),
        cta: rect(cta),
        logoLoaded: Boolean(logo?.complete && logo.naturalWidth > 0),
        heroImageLoaded: Boolean(heroImage?.complete && heroImage.naturalWidth > 0),
        progress: Number.parseFloat(getComputedStyle(header).getPropertyValue("--header-progress")),
        panel: (() => {
          const s = getComputedStyle(header, "::before");
          return { left:parseFloat(s.left), right:parseFloat(s.right) };
        })(),
        frameLeftPadding: cta.getBoundingClientRect().left -
          (header.getBoundingClientRect().left + parseFloat(getComputedStyle(header,"::before").left)),
        frameRightPadding: (header.getBoundingClientRect().right -
          parseFloat(getComputedStyle(header,"::before").right)) -
          document.querySelector(".brand").getBoundingClientRect().right
      };
    });

    assert.equal(initial.lang, "ar-SA", `${viewport.name}: Arabic document language is missing`);
    assert.equal(initial.dir, "rtl", `${viewport.name}: RTL direction is missing`);
    assert.ok(initial.titleVisible && initial.titleText.length > 5, `${viewport.name}: RUWA hero content is not rendered`);
    assert.ok(initial.bodyTextLength > 300, `${viewport.name}: document body appears blank`);
    assert.ok(initial.bodyHeight > viewport.height * 2, `${viewport.name}: full landing page did not load`);
    assert.ok(initial.logoLoaded, `${viewport.name}: local RUWA logo failed to load`);
    assert.ok(initial.heroImageLoaded, `${viewport.name}: hero image failed to load`);

    await page.evaluate(() => window.scrollTo({ top: 240, behavior: "instant" }));
    await page.waitForFunction(() => document.querySelector(".site-header")?.classList.contains("is-compact"), null, { timeout: 5000 });
    await page.waitForTimeout(420);
    const compact = await page.evaluate(() => {
      const header = document.querySelector(".site-header");
      const rect = element => {
        const r = element.getBoundingClientRect();
        return { left:r.left, right:r.right, width:r.width, centerX:r.left+r.width/2 };
      };
      const panel = getComputedStyle(header, "::before");
      const nav = rect(document.querySelector("#main-nav"));
      return {
        progress: Number.parseFloat(getComputedStyle(header).getPropertyValue("--header-progress")),
        header: rect(header),
        brand: rect(document.querySelector(".brand")),
        nav,
        cta: rect(document.querySelector(".header-action")),
        headerLeft: header.getBoundingClientRect().left,
        headerRight: header.getBoundingClientRect().right,
        panelLeft: parseFloat(panel.left),
        panelRight: parseFloat(panel.right),
        panelWidth: header.getBoundingClientRect().width - parseFloat(panel.left) - parseFloat(panel.right),
        frameLeftPadding: rect(document.querySelector(".header-action")).left -
          (header.getBoundingClientRect().left + parseFloat(panel.left)),
        frameRightPadding: (header.getBoundingClientRect().right - parseFloat(panel.right)) -
          rect(document.querySelector(".brand")).right
      };
    });

    assert.equal(compact.progress, 1, `${viewport.name}: shared header progress did not reach compact state`);
    assert.ok(compact.panelLeft > initial.panel.left && compact.panelRight > initial.panel.right,
      `${viewport.name}: both public preview frame edges did not move inward`);
    assert.ok(compact.panelWidth < initial.header.width - initial.panel.left - initial.panel.right,
      `${viewport.name}: public preview frame did not become narrower`);
    const frameLeftTravel=compact.panelLeft-initial.panel.left;
    const frameRightTravel=compact.panelRight-initial.panel.right;
    const whatsappLeftTravel=compact.cta.left-initial.cta.left;
    const brandRightTravel=initial.brand.right-compact.brand.right;
    assert.ok(Math.abs(frameLeftTravel-whatsappLeftTravel)<=1.5,
      `${viewport.name}: public glass-frame left edge differs from WhatsApp edge travel by more than 1.5px`);
    assert.ok(Math.abs(frameRightTravel-brandRightTravel)<=1.5,
      `${viewport.name}: public glass-frame right edge differs from brand edge travel by more than 1.5px`);
    assert.ok(Math.abs(compact.frameLeftPadding-initial.frameLeftPadding)<=1.5,
      `${viewport.name}: public preview frame-to-WhatsApp padding drifted`);
    assert.ok(Math.abs(compact.frameRightPadding-initial.frameRightPadding)<=1.5,
      `${viewport.name}: public preview frame-to-brand padding drifted`);
    assert.ok(compact.brand.centerX < initial.brand.left + initial.brand.width/2,
      `${viewport.name}: brand did not converge toward centered navigation`);
    assert.ok(compact.cta.centerX > initial.cta.left + initial.cta.width/2,
      `${viewport.name}: WhatsApp CTA did not converge toward centered navigation`);
    assert.ok(Math.abs(compact.nav.centerX - (initial.header.left + initial.header.width/2)) <= 1,
      `${viewport.name}: centered navigation drifted`);
    assert.equal(pageErrors.length, 0, `${viewport.name}: JavaScript runtime errors: ${pageErrors.join(" | ")}`);
    assert.equal(localResourceFailures.length, 0, `${viewport.name}: local CDN resources failed: ${JSON.stringify(localResourceFailures)}`);

    results.push({
      ...viewport,
      httpStatus: response.status(),
      title: await page.title(),
      bodyTextLength: initial.bodyTextLength,
      pageHeight: initial.bodyHeight,
      logoLoaded: initial.logoLoaded,
      heroImageLoaded: initial.heroImageLoaded,
      initialFrameWidth: Number((initial.header.width-initial.panel.left-initial.panel.right).toFixed(2)),
      compactFrameWidth: Number(compact.panelWidth.toFixed(2)),
      leftInsetPx: Number(compact.panelLeft.toFixed(2)),
      rightInsetPx: Number(compact.panelRight.toFixed(2)),
      jsErrors: pageErrors.length,
      localResourceFailures: localResourceFailures.length
    });

    console.log(`[PASS] ${viewport.name}: public URL rendered complete RUWA page; assets, RTL and synchronized header passed.`);
    await context.close();
  }
} finally {
  await browser.close();
}

console.log(JSON.stringify({ previewUrl, results }, null, 2));
