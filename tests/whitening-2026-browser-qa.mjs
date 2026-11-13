import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:4173/whitening-2026.html";
const OUT = "artifacts/whitening-2026";
await mkdir(OUT, { recursive: true });

const viewports = [
  { name: "mobile-360", width: 360, height: 800, mobile: true },
  { name: "mobile-390", width: 390, height: 844, mobile: true },
  { name: "tablet-768", width: 768, height: 1024, mobile: false },
  { name: "desktop-1440", width: 1440, height: 900, mobile: false }
];

const expectedHeading = "التبييض، لكن بفهمٍ أعمق.";
const failures = [];
const results = [];
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });

try {
  for (const vp of viewports) {
    const page = await browser.newPage({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
      reducedMotion: "reduce"
    });
    const pageErrors = [];
    const localErrors = [];
    page.on("pageerror", error => pageErrors.push(error.message));
    page.on("response", response => {
      if (response.url().startsWith(new URL(BASE_URL).origin) && response.status() >= 400) {
        localErrors.push({ status: response.status(), url: response.url() });
      }
    });

    const response = await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 45000 });
    assert.ok(response?.ok(), `${vp.name}: page did not return a successful response`);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(200);

    const state = await page.evaluate(async () => {
      const heading = document.querySelector("#hero-title");
      const copy = document.querySelector(".hero-copy");
      const visual = document.querySelector(".hero-visual");
      const image = document.querySelector(".photo-frame img");
      const nav = document.querySelector("#main-nav");
      const toggle = document.querySelector("#menu-toggle");
      await document.fonts.load('800 48px "Alexandria"', "التبييض");
      const rect = el => {
        const r = el.getBoundingClientRect();
        return { left:r.left, right:r.right, top:r.top, bottom:r.bottom, width:r.width, height:r.height };
      };
      return {
        lang:document.documentElement.lang,
        dir:document.documentElement.dir,
        heading:heading?.innerText?.replace(/\s+/g," ").trim() || "",
        headingFont:getComputedStyle(heading).fontFamily,
        headingFontLoaded:document.fonts.check('800 48px "Alexandria"', "التبييض"),
        headingVisible:Boolean(heading && rect(heading).height > 0),
        copy:copy ? rect(copy) : null,
        visual:visual ? rect(visual) : null,
        imageCount:document.images.length,
        imageAlt:image?.alt || "",
        imageSrc:image?.currentSrc || image?.src || "",
        faviconHref:document.querySelector('link[rel="icon"]')?.getAttribute("href") || "",
        imageLoaded:Boolean(image?.complete && image.naturalWidth > 0),
        navDisplay:nav ? getComputedStyle(nav).display : "missing",
        toggleDisplay:toggle ? getComputedStyle(toggle).display : "missing",
        toggleExpanded:toggle?.getAttribute("aria-expanded"),
        anchors:[...document.querySelectorAll('a[href^="#"]')].map(a=>a.getAttribute("href").slice(1)).filter(Boolean),
        missingAnchors:[...document.querySelectorAll('a[href^="#"]')].map(a=>a.getAttribute("href").slice(1)).filter(id=>id && !document.getElementById(id)),
        scrollWidth:document.documentElement.scrollWidth,
        clientWidth:document.documentElement.clientWidth,
        skipLink:Boolean(document.querySelector("a.skip[href='#main']")),
        reducedMotion:matchMedia("(prefers-reduced-motion: reduce)").matches && Number.parseFloat(getComputedStyle(copy).animationDuration) <= 0.00002 && Number.parseFloat(getComputedStyle(visual).animationDuration) <= 0.00002,
        ctaHref:document.querySelector(".primary-cta")?.getAttribute("href") || "",
        inquiryButton:Boolean(document.querySelector("#prepare-inquiry")),
        inquiryTopicLabel:Boolean(document.querySelector('label[for="inquiry-topic"]')),
        contactHasDeadEnd:Boolean(document.querySelector("#consultation a[href=\"#top\"]")),
        contentSections:["causes","options","suitability","expectations","faq"].map(id=>Boolean(document.getElementById(id))),
        optionCards:document.querySelectorAll(".option-card").length,
        causeCards:document.querySelectorAll(".info-card").length,
        faqItems:document.querySelectorAll(".faq-item").length,
        clinicalReferences:[...document.querySelectorAll(".reference-note a")].map(a=>a.href),
        viewport:window.innerWidth
      };
    });

    assert.equal(state.lang, "ar-SA", `${vp.name}: Arabic language metadata missing`);
    assert.equal(state.dir, "rtl", `${vp.name}: RTL direction missing`);
    assert.equal(state.heading, expectedHeading, `${vp.name}: protected headline changed`);
    assert.ok(state.headingVisible, `${vp.name}: headline is not visible`);
    assert.ok(state.headingFont.includes("Alexandria"), `${vp.name}: expected Alexandria headline font`);
    assert.ok(state.headingFontLoaded, `${vp.name}: local Alexandria font failed to load`);
    assert.equal(state.imageCount, 1, `${vp.name}: unexpected number of hero images`);
    assert.ok(state.imageAlt.length > 10, `${vp.name}: image alt text is missing`);
    assert.equal(state.ctaHref, "#consultation", `${vp.name}: primary CTA target changed unexpectedly`);
    assert.ok(state.inquiryButton && state.inquiryTopicLabel, `${vp.name}: interactive inquiry control or label missing`);
    assert.equal(state.contactHasDeadEnd, false, `${vp.name}: contact section still contains a dead-end return link`);
    assert.ok(state.contentSections.every(Boolean), `${vp.name}: one or more educational sections are missing`);
    assert.equal(state.optionCards, 3, `${vp.name}: whitening options cards are incomplete`);
    assert.equal(state.causeCards, 2, `${vp.name}: stain explanation cards are incomplete`);
    assert.equal(state.faqItems, 6, `${vp.name}: FAQ entries are incomplete`);
    assert.ok(state.clinicalReferences.some(url=>url.includes("nhs.uk")) && state.clinicalReferences.some(url=>url.includes("ada.org")), `${vp.name}: clinical reference links are missing`);
    assert.equal(state.missingAnchors.length, 0, `${vp.name}: broken in-page anchors: ${state.missingAnchors.join(", ")}`);
    assert.ok(state.skipLink, `${vp.name}: skip link missing`);
    assert.ok(state.faviconHref.endsWith("assets/elite-dental-mark.svg"), `${vp.name}: branded favicon link is missing`);
    assert.ok(state.reducedMotion, `${vp.name}: reduced-motion fallback is not active`);
    assert.ok(state.scrollWidth <= state.clientWidth + 1, `${vp.name}: horizontal overflow ${state.scrollWidth}px > ${state.clientWidth}px`);

    if (vp.width <= 920) {
      assert.equal(state.navDisplay, "none", `${vp.name}: mobile navigation should start collapsed`);
      assert.notEqual(state.toggleDisplay, "none", `${vp.name}: mobile menu button should be visible`);
      await page.locator("#menu-toggle").click();
      const opened = await page.evaluate(() => ({
        expanded:document.querySelector("#menu-toggle")?.getAttribute("aria-expanded"),
        display:getComputedStyle(document.querySelector("#main-nav")).display
      }));
      assert.equal(opened.expanded, "true", `${vp.name}: mobile menu aria state did not open`);
      assert.notEqual(opened.display, "none", `${vp.name}: mobile menu did not open`);
      await page.locator('#main-nav a[href="#approach"]').click();
      const closed = await page.evaluate(() => ({
        expanded:document.querySelector("#menu-toggle")?.getAttribute("aria-expanded"),
        display:getComputedStyle(document.querySelector("#main-nav")).display,
        hash:location.hash
      }));
      assert.equal(closed.expanded, "false", `${vp.name}: mobile menu aria state did not close`);
      assert.equal(closed.display, "none", `${vp.name}: mobile menu remained open after selection`);
      assert.equal(closed.hash, "#approach", `${vp.name}: navigation target failed`);
    }

    if (vp.width > 920) {
      assert.notEqual(state.navDisplay, "none", `${vp.name}: desktop navigation should be visible`);
      assert.equal(state.toggleDisplay, "none", `${vp.name}: mobile menu button should be hidden`);
      assert.ok(state.copy.right <= state.visual.left + 1 || state.visual.right <= state.copy.left + 1,
        `${vp.name}: hero text and image columns overlap`);
    }

    const faqQuestion=page.locator(".faq-item summary").first();
    await faqQuestion.click();
    assert.equal(await faqQuestion.locator("xpath=..").getAttribute("open"), "", `${vp.name}: first FAQ item did not open`);
    await faqQuestion.click();
    assert.equal(await faqQuestion.locator("xpath=..").getAttribute("open"), null, `${vp.name}: first FAQ item did not close`);

    await page.locator("#prepare-inquiry").click();
    await page.waitForFunction(() => {
      const status=document.querySelector("#inquiry-status")?.textContent || "";
      return status.includes("تم نسخ") || status.includes("جهّزنا");
    }, null, { timeout: 5000 });
    const inquiryResult = await page.evaluate(() => ({
      message:document.querySelector("#inquiry-message")?.value || "",
      status:document.querySelector("#inquiry-status")?.textContent || "",
      fallbackVisible:!document.querySelector("#inquiry-message")?.hidden
    }));
    assert.ok(inquiryResult.message.includes("تبييض الأسنان"), `${vp.name}: inquiry message was not prepared`);
    assert.ok(inquiryResult.status.includes("نسخ") || inquiryResult.status.includes("جهّزنا"), `${vp.name}: inquiry feedback is missing`);

    await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.evaluate(async () => {
      const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
      const end = document.documentElement.scrollHeight;
      for (let y=0; y<end; y+=Math.max(320,Math.floor(innerHeight*.8))) {
        scrollTo(0,y);
        await delay(80);
      }
      scrollTo(0,0);
    });
    await page.screenshot({ path: `${OUT}/${vp.name}.png`, fullPage: true, animations: "disabled" });

    const imageLoad = await page.evaluate(() => {
      const img = document.querySelector(".photo-frame img");
      return { loaded:Boolean(img?.complete && img.naturalWidth>0), naturalWidth:img?.naturalWidth || 0, src:img?.currentSrc || img?.src || "" };
    });
    assert.ok(imageLoad.loaded, `${vp.name}: hero image failed to load`);
    assert.ok(/w=(640|1100|1500)/.test(imageLoad.src), `${vp.name}: responsive hero image variant was not selected`);
    results.push({ ...vp, ...state, imageLoad, pageErrors, localErrors });
    assert.equal(pageErrors.length, 0, `${vp.name}: JavaScript errors: ${pageErrors.join(" | ")}`);
    assert.equal(localErrors.length, 0, `${vp.name}: local resource errors: ${JSON.stringify(localErrors)}`);
    console.log(`[PASS] ${vp.name}: RTL, headline, local font, layout, anchors, menu, motion and overflow`);
    await page.close();
  }
} catch (error) {
  failures.push(error.message);
  throw error;
} finally {
  await browser.close();
  await writeFile(`${OUT}/report.json`, JSON.stringify({ url:BASE_URL, generatedAt:new Date().toISOString(), results, failures }, null, 2) + "\n");
}
console.log(`All ${results.length} responsive browser checks passed.`);
