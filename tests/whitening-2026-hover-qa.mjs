import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import assert from "node:assert/strict";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:4173/whitening-2026.html";
const OUT = "artifacts/whitening-2026/hover";
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });

const getCardState = locator => locator.evaluate(element => {
  const style = getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  return {
    translate: style.translate,
    boxShadow: style.boxShadow,
    borderColor: style.borderTopColor,
    background: style.backgroundColor,
    width: element.offsetWidth,
    height: element.offsetHeight,
    visualWidth: rect.width,
    visualHeight: rect.height
  };
});

const translateY = value => {
  if (!value || value === "none") return 0;
  const parts = value.trim().split(" ");
  return Number.parseFloat(parts[1] || "0") || 0;
};

try {
  const desktop = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "no-preference"
  });
  const errors = [];
  desktop.on("pageerror", error => errors.push(error.message));

  const response = await desktop.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 45000 });
  assert.ok(response?.ok(), "RUWA page did not load successfully");
  await desktop.waitForFunction(
    () => document.documentElement.dataset.ruwaScrollMotion === "ready",
    null,
    { timeout: 30000 }
  );
  assert.equal(
    await desktop.evaluate(() => matchMedia("(hover:hover) and (pointer:fine)").matches),
    true,
    "Desktop browser must expose a precise hover pointer for hover testing"
  );

  const cardSelectors = [
    ".info-card",
    ".option-card",
    ".journey-step",
    ".team-card",
    ".review-card",
    ".expect-card"
  ];

  const checkedCards = [];
  for (let index = 0; index < cardSelectors.length; index++) {
    const selector = cardSelectors[index];
    const card = desktop.locator(selector).first();
    await card.scrollIntoViewIfNeeded();
    await desktop.waitForTimeout(760);

    const before = await getCardState(card);
    if (index === 0) {
      await card.screenshot({ path: `${OUT}/info-card-before.png` });
    }

    await card.hover();
    await desktop.waitForTimeout(340);
    const after = await getCardState(card);

    assert.ok(
      translateY(after.translate) <= -2.5,
      `${selector}: card did not lift subtly on hover (translate=${after.translate})`
    );
    assert.notEqual(after.boxShadow, before.boxShadow, `${selector}: hover shadow did not respond`);
    assert.notEqual(after.borderColor, before.borderColor, `${selector}: hover border did not respond`);
    assert.equal(after.width, before.width, `${selector}: hover changed the card layout width`);
    assert.equal(after.height, before.height, `${selector}: hover changed the card layout height`);
    assert.equal(after.visualWidth, before.visualWidth, `${selector}: hover changed rendered card width`);
    assert.equal(after.visualHeight, before.visualHeight, `${selector}: hover changed rendered card height`);

    if (index === 0) {
      await card.screenshot({ path: `${OUT}/info-card-after.png` });
      const badge = card.locator(".card-index").first();
      const badgeScale = await badge.evaluate(element => getComputedStyle(element).scale);
      assert.ok(Number.parseFloat(badgeScale) > 1.04, "Information-card index badge did not respond with its own micro-interaction");
    }

    if (selector === ".team-card") {
      const imageScale = await card.locator(".team-card-media img").evaluate(element => getComputedStyle(element).scale);
      assert.ok(Number.parseFloat(imageScale) > 1.02, "Team image did not receive its restrained frame-clipped zoom");
    }

    if (selector === ".expect-card") {
      assert.notEqual(after.background, before.background, "Existing translucent dark panel did not subtly respond");
    }

    checkedCards.push(selector);
    await desktop.mouse.move(8, 8);
    await desktop.waitForTimeout(340);
    const returned = await getCardState(card);
    assert.ok(
      Math.abs(translateY(returned.translate)) < .5,
      `${selector}: card did not return to its original position after pointer exit`
    );
  }

  const step = desktop.locator(".step").first();
  await step.scrollIntoViewIfNeeded();
  await desktop.waitForTimeout(760);
  const stepBadge = step.locator(".step-no");
  await step.hover();
  await desktop.waitForTimeout(280);
  const stepScale = await stepBadge.evaluate(element => getComputedStyle(element).scale);
  assert.ok(Number.parseFloat(stepScale) > 1.04, "Evaluation step number badge did not respond on hover");

  const checkItem = desktop.locator(".check-item").first();
  await checkItem.scrollIntoViewIfNeeded();
  await desktop.waitForTimeout(760);
  const checkBadge = checkItem.locator(".check-mark");
  await checkItem.hover();
  await desktop.waitForTimeout(280);
  const checkScale = await checkBadge.evaluate(element => getComputedStyle(element).scale);
  assert.ok(Number.parseFloat(checkScale) > 1.04, "Clinical suitability icon badge did not respond on hover");

  const faqSummary = desktop.locator(".faq-item summary").first();
  await faqSummary.scrollIntoViewIfNeeded();
  await faqSummary.hover();
  await desktop.waitForTimeout(260);
  const faqBadge = await faqSummary.evaluate(element => ({
    scale: getComputedStyle(element, "::after").scale,
    color: getComputedStyle(element, "::after").color
  }));
  assert.ok(Number.parseFloat(faqBadge.scale) > 1.04, "FAQ expand indicator did not respond to hover");

  await faqSummary.click();
  assert.equal(await desktop.locator(".faq-item").first().getAttribute("open") !== null, true, "FAQ native disclosure stopped working after hover refinement");
  assert.equal(errors.length, 0, `Desktop interaction browser errors: ${errors.join("; ")}`);
  await desktop.close();

  const mobile = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    reducedMotion: "no-preference"
  });
  const mobileResponse = await mobile.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 45000 });
  assert.ok(mobileResponse?.ok(), "Mobile RUWA page did not load successfully");
  await mobile.waitForFunction(
    () => document.documentElement.dataset.ruwaScrollMotion === "ready",
    null,
    { timeout: 30000 }
  );
  assert.equal(
    await mobile.evaluate(() => matchMedia("(hover:hover) and (pointer:fine)").matches),
    false,
    "Touch viewport must not activate desktop-only hover states"
  );
  const mobileCard = mobile.locator(".info-card").first();
  await mobileCard.scrollIntoViewIfNeeded();
  await mobileCard.tap();
  const mobileTranslate = await mobileCard.evaluate(element => getComputedStyle(element).translate);
  assert.equal(mobileTranslate, "none", "Touch interaction must not leave a hover lift stuck on a card");
  assert.equal(
    await mobile.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
    true,
    "Mobile hover refinement introduced horizontal overflow"
  );
  await mobile.close();

  const reduced = await browser.newPage({
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce"
  });
  const reducedResponse = await reduced.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 45000 });
  assert.ok(reducedResponse?.ok(), "Reduced-motion RUWA page did not load successfully");
  await reduced.waitForFunction(
    () => document.documentElement.dataset.ruwaScrollMotion === "reduced",
    null,
    { timeout: 30000 }
  );
  const reducedState = await reduced.locator(".info-card").first().evaluate(element => ({
    translate: getComputedStyle(element).translate,
    transitionDuration: getComputedStyle(element).transitionDuration
  }));
  assert.equal(reducedState.translate, "none", "Reduced-motion mode must remove card movement");
  assert.ok(
    reducedState.transitionDuration.split(",").every(value => Number.parseFloat(value) === 0),
    "Reduced-motion mode must not retain hover transition timing"
  );
  await reduced.close();

  console.log(JSON.stringify({
    result: "passed",
    desktopCardTypes: checkedCards,
    verified: [
      "card lift, soft shadow and border feedback",
      "icon-badge micro-interactions",
      "clipped team-image zoom",
      "translucent dark-panel response",
      "FAQ indicator feedback and native disclosure",
      "stable card dimensions and hover-out reset",
      "touch-only viewport behavior",
      "reduced-motion behavior"
    ],
    screenshots: [`${OUT}/info-card-before.png`, `${OUT}/info-card-after.png`]
  }, null, 2));
} finally {
  await browser.close();
}
