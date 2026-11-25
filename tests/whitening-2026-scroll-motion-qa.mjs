import { chromium } from "playwright";
import assert from "node:assert/strict";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:4173/whitening-2026.html";
const viewports = [
  { name: "desktop-1440", width: 1440, height: 900 },
  { name: "mobile-390", width: 390, height: 844 }
];
const TARGET_SELECTOR = [
  "main section:not(.hero) h2",
  ".step", ".info-card", ".option-card", ".journey-step",
  ".check-item", ".expect-card", ".team-card", ".review-card"
].join(",");

const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
const results = [];

try {
  for (const viewport of viewports) {
    const page = await browser.newPage({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: 1,
      reducedMotion: "no-preference"
    });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));

    const response = await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 45000 });
    assert.ok(response?.ok(), `${viewport.name}: RUWA page did not load successfully`);

    await page.waitForFunction(
      () => document.documentElement.dataset.ruwaScrollMotion === "ready",
      null,
      { timeout: 30000 }
    );

    const initial = await page.evaluate(() => ({
      mode: document.documentElement.dataset.ruwaScrollMotion,
      gsapVersion: window.gsap?.version || "",
      scrollTriggerVersion: window.ScrollTrigger?.version || "",
      targetCount: document.querySelectorAll("[data-ruwa-motion-target='true']").length,
      preparedCount: Number(document.documentElement.dataset.ruwaMotionPreparedCount || 0),
      triggerCount: Number(document.documentElement.dataset.ruwaMotionTriggerCount || 0),
      htmlScrollBehavior: getComputedStyle(document.documentElement).scrollBehavior,
      horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1
    }));

    assert.equal(initial.mode, "ready", `${viewport.name}: scroll motion failed to initialize`);
    assert.equal(initial.gsapVersion, "3.15.1", `${viewport.name}: unexpected GSAP version`);
    assert.equal(initial.scrollTriggerVersion, "3.15.1", `${viewport.name}: ScrollTrigger version mismatch`);
    assert.ok(initial.targetCount >= 20, `${viewport.name}: too few page elements are covered by the reveal system`);
    assert.ok(initial.preparedCount > 0, `${viewport.name}: no below-fold elements were prepared for reveal`);
    assert.ok(initial.triggerCount > 0, `${viewport.name}: no ScrollTriggers were created`);
    assert.equal(initial.horizontalOverflow, false, `${viewport.name}: horizontal overflow detected before scrolling`);

    // Use instant native scrolling in the test only; the live page's own scroll behavior is untouched.
    await page.evaluate(() => { document.documentElement.style.scrollBehavior = "auto"; });
    const maxScroll = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
    const step = Math.max(260, Math.floor(viewport.height * 0.62));

    for (let y = 0; y <= maxScroll; y += step) {
      await page.evaluate(position => window.scrollTo(0, position), y);
      await page.waitForTimeout(90);
    }
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(900);

    const completed = await page.evaluate(selector => {
      const elements = [...document.querySelectorAll(selector)];
      return {
        targetCount: elements.length,
        invisible: elements
          .filter(element => Number.parseFloat(getComputedStyle(element).opacity) < .99)
          .map(element => element.className || element.tagName),
        horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
        compactProgress: Number.parseFloat(
          getComputedStyle(document.querySelector(".site-header")).getPropertyValue("--header-progress")
        )
      };
    }, "[data-ruwa-motion-target='true']");

    assert.deepEqual(completed.invisible, [], `${viewport.name}: one or more content reveals remained invisible after scrolling to the footer`);
    assert.equal(completed.horizontalOverflow, false, `${viewport.name}: horizontal overflow appeared while scrolling`);
    assert.ok(completed.compactProgress >= .999, `${viewport.name}: existing header scroll state did not reach compact progress`);

    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForFunction(
      () => Number.parseFloat(getComputedStyle(document.querySelector(".site-header")).getPropertyValue("--header-progress")) < .001,
      null,
      { timeout: 5000 }
    );
    assert.equal(errors.length, 0, `${viewport.name}: browser errors: ${errors.join("; ")}`);

    results.push({
      viewport: viewport.name,
      targets: initial.targetCount,
      prepared: initial.preparedCount,
      triggers: initial.triggerCount,
      gsap: initial.gsapVersion,
      scrollTrigger: initial.scrollTriggerVersion,
      allRevealsCompleted: true,
      headerReturnedToExpandedState: true
    });
    await page.close();
  }

  // Reduced-motion visitors must receive fully visible content and no reveal triggers.
  const reducedPage = await browser.newPage({
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce"
  });
  const reducedErrors = [];
  reducedPage.on("pageerror", error => reducedErrors.push(error.message));
  const reducedResponse = await reducedPage.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 45000 });
  assert.ok(reducedResponse?.ok(), "Reduced-motion RUWA page did not load successfully");
  await reducedPage.waitForFunction(
    () => document.documentElement.dataset.ruwaScrollMotion === "reduced",
    null,
    { timeout: 30000 }
  );
  const reducedState = await reducedPage.evaluate(selector => {
    const elements = [...document.querySelectorAll(selector)];
    return {
      mode: document.documentElement.dataset.ruwaScrollMotion,
      invisible: elements.filter(element => Number.parseFloat(getComputedStyle(element).opacity) < .99).length,
      revealAttributes: document.querySelectorAll("[data-ruwa-motion-target]").length,
      horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1
    };
  }, TARGET_SELECTOR);
  assert.equal(reducedState.mode, "reduced");
  assert.equal(reducedState.invisible, 0, "Reduced-motion mode must not hide page content");
  assert.equal(reducedState.revealAttributes, 0, "Reduced-motion mode must not initialize scroll reveals");
  assert.equal(reducedState.horizontalOverflow, false);
  assert.equal(reducedErrors.length, 0, `Reduced-motion browser errors: ${reducedErrors.join("; ")}`);
  results.push({ viewport: "mobile-390-reduced-motion", allContentVisible: true, revealAnimationsDisabled: true });
  await reducedPage.close();

  console.log(JSON.stringify({ passed: results.length, total: results.length, results }, null, 2));
} finally {
  await browser.close();
}
