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
  { name: "laptop-1024", width: 1024, height: 900, mobile: false },
  { name: "desktop-1440", width: 1440, height: 900, mobile: false }
];

const expectedHeading = "اكتشف خيارات تبييض الأسنان لابتسامة أكثر إشراقًا";
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
      await document.fonts.load('800 48px "Cairo"', "التبييض");
      await document.fonts.load('400 16px "IBM Plex Sans Arabic"', "رعاية الأسنان");
      const rect = el => {
        const r = el.getBoundingClientRect();
        return { left:r.left, right:r.right, top:r.top, bottom:r.bottom, width:r.width, height:r.height };
      };
      return {
        lang:document.documentElement.lang,
        dir:document.documentElement.dir,
        heading:heading?.innerText?.replace(/\s+/g," ").trim() || "",
        headlineLines:heading?.querySelectorAll(":scope > .hero-title-kicker, :scope > .hero-title-main, :scope > .hero-title-benefit").length || 0,
        headlineKicker:heading?.querySelector(".hero-title-kicker")?.innerText?.trim() || "",
        headlineService:heading?.querySelector(".hero-title-main")?.innerText?.trim() || "",
        headlineBenefit:heading?.querySelector(".hero-title-benefit")?.innerText?.trim() || "",
        headlineOverflow:Boolean(heading && (
          heading.scrollWidth > heading.clientWidth + 1 ||
          [...heading.querySelectorAll(".hero-title-kicker,.hero-title-main,.hero-title-benefit")]
            .some(el => el.scrollWidth > el.clientWidth + 1)
        )),
        headingFont:getComputedStyle(heading).fontFamily,
        headingFontLoaded:document.fonts.check('800 48px "Cairo"', "التبييض"),
        bodyFont:getComputedStyle(document.body).fontFamily,
        bodyFontLoaded:document.fonts.check('400 16px "IBM Plex Sans Arabic"', "رعاية الأسنان"),
        headingVisible:Boolean(heading && rect(heading).height > 0),
        eyebrowLabel:document.querySelector(".hero-eyebrow-label")?.innerText?.trim() || "",
        eyebrowIndex:document.querySelector(".hero-eyebrow-index")?.innerText?.trim() || "",
        eyebrowHasMinimalMark:Boolean(document.querySelector(".hero-eyebrow-icon svg path")),
        eyebrowStartAligned:Boolean(
          document.querySelector(".hero-eyebrow") && copy &&
          Math.abs(rect(document.querySelector(".hero-eyebrow")).right - rect(copy).right) <= 3
        ),
        eyebrowNumberFirst:Boolean((()=>{
          const number=document.querySelector(".hero-eyebrow-index");
          const icon=document.querySelector(".hero-eyebrow-icon");
          const label=document.querySelector(".hero-eyebrow-label");
          return number&&icon&&label&&rect(number).right>=rect(icon).right&&rect(icon).right>=rect(label).right;
        })()),
        eyebrowTransparent:Boolean((()=>{
          const badge=document.querySelector(".hero-eyebrow");
          const icon=document.querySelector(".hero-eyebrow-icon");
          if(!badge||!icon)return false;
          const b=getComputedStyle(badge),i=getComputedStyle(icon);
          return b.backgroundColor==="rgba(0, 0, 0, 0)"&&i.backgroundColor==="rgba(0, 0, 0, 0)"&&
            b.borderTopWidth==="0px"&&i.borderTopWidth==="0px"&&
            Number.parseFloat(getComputedStyle(icon.querySelector("svg")).width)<=16;
        })()),
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
        contrastChecks:(()=>{
          const parse=color=>{const m=color.match(/[\d.]+/g)?.map(Number)||[];return m.slice(0,3).map(v=>v/255)};
          const luminance=color=>{
            const rgb=parse(color).map(v=>v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4);
            return 0.2126*rgb[0]+0.7152*rgb[1]+0.0722*rgb[2];
          };
          return [
            "#approach .approach-intro .eyebrow",
            "#approach .step p",
            "#options .section-head p",
            "#faq .reference-note"
          ].map(selector=>{
            const el=document.querySelector(selector);
            if(!el)return {selector,ratio:0};
            const section=el.closest("section");
            const fg=getComputedStyle(el).color;
            const bg=section?getComputedStyle(section).backgroundColor:"rgb(255,255,255)";
            const a=luminance(fg),b=luminance(bg);
            return {selector,ratio:(Math.max(a,b)+0.05)/(Math.min(a,b)+0.05)};
          });
        })(),
        viewport:window.innerWidth
      };
    });

    assert.equal(state.lang, "ar-SA", `${vp.name}: Arabic language metadata missing`);
    assert.equal(state.dir, "rtl", `${vp.name}: RTL direction missing`);
    assert.equal(state.heading, expectedHeading, `${vp.name}: protected headline changed`);
    assert.equal(state.headlineLines, 3, `${vp.name}: headline must use the intended three-level composition`);
    assert.equal(state.headlineKicker, "اكتشف خيارات", `${vp.name}: headline introduction changed`);
    assert.equal(state.headlineService, "تبييض الأسنان", `${vp.name}: primary service phrase changed`);
    assert.equal(state.headlineBenefit, "لابتسامة أكثر إشراقًا", `${vp.name}: headline benefit phrase changed`);
    assert.equal(state.headlineOverflow, false, `${vp.name}: headline content overflows its box`);
    assert.ok(state.headingVisible, `${vp.name}: headline is not visible`);
    assert.equal(state.eyebrowLabel, "دليل الابتسامة", `${vp.name}: hero eyebrow label changed`);
    assert.equal(state.eyebrowIndex, "01", `${vp.name}: hero eyebrow sequence marker is missing`);
    assert.ok(state.eyebrowHasMinimalMark, `${vp.name}: minimal hero icon is missing`);
    assert.ok(state.eyebrowStartAligned, `${vp.name}: hero eyebrow is not aligned to the RTL line start`);
    assert.ok(state.eyebrowNumberFirst, `${vp.name}: section number is not first at the RTL line start`);
    assert.ok(state.eyebrowTransparent, `${vp.name}: eyebrow or icon is not transparent and compact`);
    assert.ok(state.headingFont.includes("Cairo"), `${vp.name}: expected Cairo headline font`);
    assert.ok(state.bodyFont.includes("IBM Plex Sans Arabic"), `${vp.name}: expected IBM Plex Sans Arabic body font`);
    assert.ok(state.headingFontLoaded, `${vp.name}: local Cairo heading font failed to load`);
    assert.ok(state.bodyFontLoaded, `${vp.name}: local IBM Plex Sans Arabic font failed to load`);
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
    assert.ok(state.contrastChecks.every(item=>item.ratio>=4.5), `${vp.name}: text contrast below WCAG AA: ${JSON.stringify(state.contrastChecks)}`);
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
    console.log(`[PASS] ${vp.name}: RTL, Cairo + IBM Plex fonts, layout, anchors, menu, motion and overflow`);
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
