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

    const metrics = await page.evaluate(async () => {
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
      const heroPortrait=document.querySelector(".hero-portrait");
      if(heroPortrait) await heroPortrait.decode();
      const portrait=rect(".hero-portrait");
      const visual=rect(".hero-visual");
      const hero=rect(".hero");
      const header = rect(".site-header");
      const marker = rect(".hero-eyebrow");
      const heading = rect("#hero-title");
      const paragraph = rect(".hero-lead");
      const primary = rect(".hero-actions .primary-cta");
      const secondary = rect(".hero-actions .consultation-cta");
      const markerNode = document.querySelector(".hero-eyebrow");
      const markerLabel = document.querySelector(".hero-eyebrow-label");
      const markerNumber = document.querySelector(".hero-eyebrow-index");
      const markerIcon = document.querySelector(".hero-eyebrow-icon");
      const markerDivider = document.querySelector(".hero-eyebrow-rule");
      const markerCss = getComputedStyle(markerNode);
      const labelCss = getComputedStyle(markerLabel);
      const numberCss = getComputedStyle(markerNumber);
      const iconCss = getComputedStyle(markerIcon);
      const heroCss = getComputedStyle(document.querySelector(".hero"));
      const heroRingCss = getComputedStyle(document.querySelector(".hero"), "::before");
      const markerDesign = {
        height: Number(markerCss.height.replace("px", "")),
        width: Number(markerCss.width.replace("px", "")),
        radius: markerCss.borderTopLeftRadius,
        background: markerCss.backgroundColor,
        border: markerCss.border,
        borderColor: markerCss.borderTopColor,
        padding: markerCss.padding,
        gap: markerCss.gap,
        backdropFilter: markerCss.backdropFilter,
        labelFontSize: labelCss.fontSize,
        labelColor: labelCss.color,
        labelWeight: labelCss.fontWeight,
        numberFontSize: numberCss.fontSize,
        numberColor: numberCss.color,
        dividerColor: getComputedStyle(markerDivider).backgroundColor,
        iconColor: iconCss.color,
        iconSize: rect(".hero-eyebrow-icon"),
        heroBackgroundColor: heroCss.backgroundColor,
        heroBackgroundImage: heroCss.backgroundImage,
        heroRingBorderColor: heroRingCss.borderTopColor,
        heroRingShadow: heroRingCss.boxShadow
      };
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
      if (!portrait || portrait.width<=0 || portrait.height<=0 || portrait.display==="none" || portrait.visibility!=="visible" || portrait.opacity<=.99) issues.push("Hero dentist portrait is not visible");
      if (!visual || !hero || portrait.top<hero.top-1 || portrait.bottom>hero.bottom+1 || portrait.left<visual.left-1 || portrait.right>visual.right+1) issues.push("Hero dentist portrait is not contained in its visual area");
      if (Math.abs(markerDesign.height - 40) > 0.5) issues.push(`Hero marker height should be 40px; got ${markerDesign.height}px`);
      if (markerDesign.labelFontSize !== "12px") issues.push(`Hero marker label should be 12px; got ${markerDesign.labelFontSize}`);
      if (markerDesign.labelColor !== "rgb(48, 74, 84)") issues.push("Hero marker label color changed unexpectedly");
      if (markerDesign.background !== "rgba(227, 242, 233, 0.78)") issues.push(`Hero marker surface should use the approved pale-mint tint; got ${markerDesign.background}`);
      if (markerDesign.gap !== "7px") issues.push(`Hero marker internal gap should be 7px; got ${markerDesign.gap}`);
      if (markerDesign.iconSize.width !== 17 || markerDesign.iconSize.height !== 17) issues.push("Hero marker tooth icon should measure 17 × 17px");
      return {
        viewport: { width: innerWidth, height: innerHeight },
        scrollY: pageYOffset,
        header,
        marker,
        markerDesign,
        heading,
        paragraph,
        primary,
        secondary,
        portrait,
        portraitSource:heroPortrait?.getAttribute("src")||"",
        portraitNaturalWidth:heroPortrait?.naturalWidth||0,
        portraitNaturalHeight:heroPortrait?.naturalHeight||0,
        portraitObjectFit:heroPortrait?getComputedStyle(heroPortrait).objectFit:"",
        portraitAlt:heroPortrait?.getAttribute("alt")||"",
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
      console.log(`[PASS] ${vp.name}: Hero marker mint-glass proportions, typography, icon, background, headline, paragraph, complete CTAs and overflow`);
    }
    await page.close();
  }
} finally {
  await browser.close();
}

await writeFile(`${OUT}/metrics.json`, JSON.stringify({ viewports: results, failures }, null, 2));
console.log(JSON.stringify({ passed: results.length - failures.length, total: results.length, failures }, null, 2));
if (failures.length) process.exitCode = 1;
