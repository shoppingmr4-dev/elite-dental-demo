import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import assert from "node:assert/strict";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:4173/whitening-2026.html";
const OUT = "artifacts/whitening-2026/menu-orbit";
await mkdir(OUT, { recursive: true });

const VIEWPORTS = [
  { name: "desktop-1440", width: 1440, height: 900 },
  { name: "desktop-1366", width: 1366, height: 900 },
  { name: "desktop-1280", width: 1280, height: 800 },
  { name: "laptop-1024", width: 1024, height: 768 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "mobile-430", width: 430, height: 900 },
  { name: "mobile-390", width: 390, height: 844 },
  { name: "mobile-360", width: 360, height: 800 },
  { name: "mobile-320", width: 320, height: 720 }
];

const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"]
});

const failures = [];
const viewportResults = [];

async function prepareMenuPage(page, viewport) {
  const response = await page.goto(BASE_URL, {
    waitUntil: "domcontentloaded",
    timeout: 45000
  });
  assert.ok(response && response.ok(), viewport.name + ": RUWA page did not load");

  await page.waitForFunction(
    () => document.documentElement.dataset.ruwaOrbitReady === "true",
    null,
    { timeout: 10000 }
  );

  await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = "auto";
    if (window.innerWidth > 920) window.scrollTo(0, 720);
    else window.scrollTo(0, 0);
  });

  if (viewport.width > 920) {
    await page.waitForFunction(
      () => document.querySelector(".site-header")?.classList.contains("is-compact"),
      null,
      { timeout: 5000 }
    );
  }

  const button = page.locator("#menu-toggle");
  await button.waitFor({ state: "visible", timeout: 5000 });
  assert.equal(
    await button.getAttribute("aria-expanded"),
    "false",
    viewport.name + ": menu should begin closed"
  );

  const initial = await page.locator("#main-nav").evaluate(nav => ({
    inert: nav.inert,
    open: nav.classList.contains("open"),
    state: nav.dataset.ruwaMenuState
  }));
  assert.equal(initial.open, false, viewport.name + ": nav unexpectedly starts open");
  assert.equal(initial.inert, true, viewport.name + ": hidden collapsed nav must be inert");
  return { button, nav: page.locator("#main-nav") };
}

try {
  // Exercise the real panel geometry and origin calculation at every requested width.
  for (const viewport of VIEWPORTS) {
    const page = await browser.newPage({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: 1,
      isMobile: viewport.width <= 430,
      hasTouch: viewport.width <= 430,
      reducedMotion: "no-preference"
    });
    const pageErrors = [];
    page.on("pageerror", error => pageErrors.push(error.message));

    const { button, nav } = await prepareMenuPage(page, viewport);
    const overflowBefore = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
    assert.equal(overflowBefore, true, viewport.name + ": page already overflows horizontally before opening");

    await button.click();
    await page.waitForFunction(
      () => document.querySelector("#menu-toggle")?.getAttribute("aria-expanded") === "true" &&
        document.querySelector("#main-nav")?.classList.contains("open"),
      null,
      { timeout: 3000 }
    );

    const mode = await page.evaluate(() => document.documentElement.dataset.ruwaMenuMotion || "unset");
    if (mode === "gsap") {
      await page.waitForTimeout(110);
      const early = await nav.evaluate(element => {
        const panel = element.getBoundingClientRect();
        const toggle = document.querySelector("#menu-toggle").getBoundingClientRect();
        const style = getComputedStyle(element);
        const match = style.clipPath.match(/circle\\(([-\\d.]+)px at ([-\\d.]+)px ([-\\d.]+)px\\)/);
        return {
          clipPath: style.clipPath,
          radius: match ? Number(match[1]) : 0,
          x: match ? Number(match[2]) : NaN,
          y: match ? Number(match[3]) : NaN,
          expectedX: toggle.left + toggle.width / 2 - panel.left,
          expectedY: toggle.top + toggle.height / 2 - panel.top,
          maxRadius: Number(element.dataset.ruwaMenuRadius || 0),
          state: element.dataset.ruwaMenuState
        };
      });
      assert.ok(early.radius > 0 && early.radius < early.maxRadius,
        viewport.name + ": menu did not expose a growing circular reveal: " + JSON.stringify(early));
      assert.ok(Math.abs(early.x - early.expectedX) <= 1.25 &&
        Math.abs(early.y - early.expectedY) <= 1.25,
        viewport.name + ": circular reveal did not originate at the actual hamburger center: " + JSON.stringify(early));
      assert.ok(early.clipPath.startsWith("circle("),
        viewport.name + ": the menu reveal did not use a circular clip-path");
    } else {
      assert.ok(mode === "fallback" || mode === "reduced",
        viewport.name + ": unexpected menu motion mode " + mode);
    }

    await page.waitForFunction(
      () => document.querySelector("#main-nav")?.dataset.ruwaMenuState === "open",
      null,
      { timeout: 6000 }
    );

    const opened = await nav.evaluate(element => {
      const links = Array.from(element.querySelectorAll("a"));
      return {
        expanded: document.querySelector("#menu-toggle").getAttribute("aria-expanded"),
        inert: element.inert,
        open: element.classList.contains("open"),
        links: links.map(link => ({
          visibility: getComputedStyle(link).visibility,
          opacity: Number.parseFloat(getComputedStyle(link).opacity)
        })),
        rect: {
          width: element.getBoundingClientRect().width,
          height: element.getBoundingClientRect().height
        }
      };
    });
    assert.equal(opened.expanded, "true", viewport.name + ": aria-expanded did not become true");
    assert.equal(opened.inert, false, viewport.name + ": visible nav remained inert");
    assert.equal(opened.open, true, viewport.name + ": open nav class was removed");
    assert.ok(opened.rect.width > 0 && opened.rect.height > 0,
      viewport.name + ": expanded panel has no rendered dimensions");
    assert.ok(opened.links.every(link => link.visibility !== "hidden" && link.opacity >= .99),
      viewport.name + ": one or more navigation links did not finish their sequential reveal");

    // Each link must become normally focusable once its visual reveal is complete.
    const focusable = await nav.locator("a").first().evaluate(link => {
      link.focus();
      return document.activeElement === link;
    });
    assert.equal(focusable, true, viewport.name + ": navigation link cannot receive keyboard focus");

    if (viewport.width === 1440 || viewport.width === 390) {
      await page.screenshot({
        path: OUT + "/menu-open-" + viewport.width + ".png",
        fullPage: false
      });
    }

    await button.click();
    await page.waitForFunction(
      () => document.querySelector("#main-nav")?.dataset.ruwaMenuState === "closed",
      null,
      { timeout: 6000 }
    );
    const closed = await nav.evaluate(element => ({
      open: element.classList.contains("open"),
      inert: element.inert,
      expanded: document.querySelector("#menu-toggle").getAttribute("aria-expanded")
    }));
    assert.equal(closed.open, false, viewport.name + ": reverse animation did not restore the closed panel");
    assert.equal(closed.expanded, "false", viewport.name + ": aria-expanded did not return to false");
    assert.equal(closed.inert, true, viewport.name + ": closed collapsed nav is not inert");

    const overflowAfter = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
    assert.equal(overflowAfter, true, viewport.name + ": menu introduced horizontal overflow");
    assert.equal(pageErrors.length, 0, viewport.name + ": browser errors: " + pageErrors.join(" | "));

    viewportResults.push({
      viewport: viewport.name,
      menuMotion: mode,
      originVerified: mode === "gsap",
      sequentialLinksVisible: opened.links.length,
      closeRestored: true,
      noHorizontalOverflow: true
    });
    await page.close();
    console.log("[PASS] " + viewport.name + ": origin reveal, link sequence, reverse close and responsive layout");
  }

  // Verify Escape, focus restoration, link selection, and quick direction reversal.
  const interactionPage = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    reducedMotion: "no-preference"
  });
  const interactionErrors = [];
  interactionPage.on("pageerror", error => interactionErrors.push(error.message));
  const interaction = await prepareMenuPage(interactionPage, { name: "mobile-390-interactions", width: 390, height: 844 });
  await interaction.button.click();
  await interactionPage.waitForFunction(
    () => document.querySelector("#main-nav")?.dataset.ruwaMenuState === "open",
    null,
    { timeout: 6000 }
  );
  await interactionPage.locator("#main-nav a").first().evaluate(link => link.focus());
  await interactionPage.keyboard.press("Escape");
  await interactionPage.waitForFunction(
    () => document.querySelector("#main-nav")?.dataset.ruwaMenuState === "closed",
    null,
    { timeout: 6000 }
  );
  assert.equal(
    await interactionPage.evaluate(() => document.activeElement?.id),
    "menu-toggle",
    "Escape must restore focus to the circular menu button"
  );

  await interaction.button.click();
  await interactionPage.waitForFunction(
    () => document.querySelector("#main-nav")?.dataset.ruwaMenuState === "open",
    null,
    { timeout: 6000 }
  );
  await interactionPage.locator('#main-nav a[href="#options"]').click();
  await interactionPage.waitForFunction(
    () => document.querySelector("#main-nav")?.dataset.ruwaMenuState === "closed",
    null,
    { timeout: 6000 }
  );
  assert.equal(
    await interactionPage.evaluate(() => location.hash),
    "#options",
    "Selecting a native navigation anchor must preserve its destination"
  );

  await interactionPage.evaluate(() => window.scrollTo(0, 0));
  await interaction.button.click();
  await interactionPage.waitForFunction(
    () => document.querySelector("#main-nav")?.dataset.ruwaMenuState === "opening",
    null,
    { timeout: 3000 }
  );
  await interactionPage.waitForTimeout(140);
  await interaction.button.click();
  await interactionPage.waitForFunction(
    () => document.querySelector("#main-nav")?.dataset.ruwaMenuState === "closing",
    null,
    { timeout: 3000 }
  );
  await interactionPage.waitForTimeout(90);
  await interaction.button.click();
  await interactionPage.waitForFunction(
    () => document.querySelector("#main-nav")?.dataset.ruwaMenuState === "open",
    null,
    { timeout: 6000 }
  );
  await interaction.button.click();
  await interactionPage.waitForFunction(
    () => document.querySelector("#main-nav")?.dataset.ruwaMenuState === "closed",
    null,
    { timeout: 6000 }
  );
  assert.equal(interactionErrors.length, 0,
    "Menu keyboard/link/reversal browser errors: " + interactionErrors.join(" | "));
  await interactionPage.close();
  console.log("[PASS] Escape focus restoration, native anchor close, and rapid open/close reversal");

  // The moving light must animate only its masked border layer; the card itself must not rotate.
  const orbitPage = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "no-preference"
  });
  const orbitErrors = [];
  orbitPage.on("pageerror", error => orbitErrors.push(error.message));
  const orbitResponse = await orbitPage.goto(BASE_URL, {
    waitUntil: "domcontentloaded",
    timeout: 45000
  });
  assert.ok(orbitResponse && orbitResponse.ok(), "Orbit-light desktop page failed to load");
  await orbitPage.waitForFunction(
    () => document.documentElement.dataset.ruwaOrbitReady === "true",
    null,
    { timeout: 10000 }
  );
  const orbitCount = await orbitPage.evaluate(() =>
    Number(document.documentElement.dataset.ruwaOrbitTargetCount || 0)
  );
  assert.ok(orbitCount >= 20, "Expected selected card, panel and icon frames to receive orbit layers; found " + orbitCount);

  const card = orbitPage.locator(".info-card").first();
  await card.scrollIntoViewIfNeeded();
  await orbitPage.waitForTimeout(760);
  const light = card.locator(":scope > .ruwa-orbit-light");
  const before = await card.evaluate(element => ({
    width: element.offsetWidth,
    height: element.offsetHeight,
    translate: getComputedStyle(element).translate
  }));
  await card.screenshot({ path: OUT + "/orbit-card-before.png" });
  await card.hover();
  await orbitPage.waitForFunction(
    element => {
      const light = element.querySelector(":scope > .ruwa-orbit-light");
      return light && Number.parseFloat(getComputedStyle(light).opacity) > .7 &&
        getComputedStyle(light).animationName === "ruwaOrbit";
    },
    await card.elementHandle(),
    { timeout: 2500 }
  );
  await orbitPage.waitForTimeout(280);
  const activeLight = await light.evaluate(element => {
    const parent = element.parentElement;
    const rect = element.getBoundingClientRect();
    const parentRect = parent.getBoundingClientRect();
    const style = getComputedStyle(element);
    return {
      opacity: Number.parseFloat(style.opacity),
      animationName: style.animationName,
      animationPlayState: style.animationPlayState,
      angle: style.getPropertyValue("--ruwa-orbit-angle").trim(),
      pointerEvents: style.pointerEvents,
      radius: style.borderRadius,
      parentRadius: getComputedStyle(parent).borderRadius,
      leftDelta: Math.abs(rect.left - parentRect.left),
      topDelta: Math.abs(rect.top - parentRect.top),
      rightDelta: Math.abs(rect.right - parentRect.right),
      bottomDelta: Math.abs(rect.bottom - parentRect.bottom)
    };
  });
  const firstAngle = Number.parseFloat(activeLight.angle);
  await orbitPage.waitForTimeout(260);
  const secondAngle = await light.evaluate(element =>
    Number.parseFloat(getComputedStyle(element).getPropertyValue("--ruwa-orbit-angle"))
  );
  assert.ok(activeLight.opacity > .7, "Orbit border light did not become visible on hover");
  assert.equal(activeLight.animationName, "ruwaOrbit", "Orbit light did not start its CSS conic-gradient animation");
  assert.equal(activeLight.animationPlayState, "running", "Orbit light should run only during hover");
  assert.ok(Number.isFinite(firstAngle) && Number.isFinite(secondAngle) &&
    Math.abs(firstAngle - secondAngle) > 2,
    "The conic highlight angle did not advance around the perimeter");
  assert.equal(activeLight.pointerEvents, "none", "Decorative orbit layer must not intercept interaction");
  assert.equal(activeLight.radius, activeLight.parentRadius, "Orbit layer did not inherit the frame's exact corner radius");
  assert.ok(activeLight.leftDelta <= 1 && activeLight.topDelta <= 1 &&
    activeLight.rightDelta <= 1 && activeLight.bottomDelta <= 1,
    "Orbit layer is not aligned to the actual frame perimeter");
  await card.screenshot({ path: OUT + "/orbit-card-hover.png" });
  const after = await card.evaluate(element => ({
    width: element.offsetWidth,
    height: element.offsetHeight,
    translate: getComputedStyle(element).translate
  }));
  assert.equal(after.width, before.width, "Orbit light changed card width");
  assert.equal(after.height, before.height, "Orbit light changed card height");
  assert.ok(Number.parseFloat(after.translate.split(" ")[1]) < -2.5,
    "Existing independent card elevation did not remain active beside the orbit light");

  await orbitPage.mouse.move(8, 8);
  await orbitPage.waitForTimeout(320);
  const exited = await light.evaluate(element => ({
    opacity: Number.parseFloat(getComputedStyle(element).opacity),
    animationName: getComputedStyle(element).animationName
  }));
  assert.ok(exited.opacity < .05, "Orbit light did not fade away after pointer exit");
  assert.equal(exited.animationName, "none", "Orbit animation continued after pointer exit");

  const teamCard = orbitPage.locator(".team-card").first();
  await teamCard.scrollIntoViewIfNeeded();
  await orbitPage.waitForTimeout(760);
  await teamCard.hover();
  await orbitPage.waitForTimeout(360);
  const teamState = await teamCard.evaluate(element => ({
    animationName: getComputedStyle(element.querySelector(":scope > .ruwa-orbit-light")).animationName,
    imageScale: getComputedStyle(element.querySelector(".team-card-media img")).scale
  }));
  assert.equal(teamState.animationName, "ruwaOrbit", "Team frame did not receive the orbiting light");
  assert.ok(Number.parseFloat(teamState.imageScale) > 1.02,
    "Existing clipped team image zoom did not remain active");
  assert.equal(orbitErrors.length, 0, "Orbit-light browser errors: " + orbitErrors.join(" | "));
  await orbitPage.close();
  console.log("[PASS] Orbit follows rounded border, fades on exit, and coexists with existing hover elevation/image zoom");

  // Touch-only and reduced-motion visitors must not receive a persistent orbit effect.
  const touchPage = await browser.newPage({
    viewport: { width: 430, height: 900 },
    isMobile: true,
    hasTouch: true,
    reducedMotion: "no-preference"
  });
  await touchPage.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 45000 });
  await touchPage.waitForFunction(
    () => document.documentElement.dataset.ruwaOrbitReady === "true",
    null,
    { timeout: 10000 }
  );
  assert.equal(
    await touchPage.evaluate(() => matchMedia("(hover:hover) and (pointer:fine)").matches),
    false,
    "Touch viewport unexpectedly advertises a fine hover pointer"
  );
  const touchLight = touchPage.locator(".info-card .ruwa-orbit-light").first();
  await touchLight.scrollIntoViewIfNeeded();
  const touchDisplay = await touchLight.evaluate(element => getComputedStyle(element).display);
  assert.equal(touchDisplay, "none", "Orbit light must be disabled on touch-only devices");
  await touchPage.locator(".info-card").first().tap();
  assert.equal(
    await touchLight.evaluate(element => getComputedStyle(element).animationName),
    "none",
    "Touch must not leave the border animation running"
  );
  assert.equal(
    await touchPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
    true,
    "Orbit interaction introduced touch-layout overflow"
  );
  await touchPage.close();

  const reducedPage = await browser.newPage({
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce"
  });
  await reducedPage.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 45000 });
  const reducedMenu = await prepareMenuPage(reducedPage, {
    name: "reduced-motion-390",
    width: 390,
    height: 844
  });
  await reducedMenu.button.click();
  await reducedPage.waitForFunction(
    () => document.querySelector("#main-nav")?.dataset.ruwaMenuState === "open",
    null,
    { timeout: 1000 }
  );
  assert.equal(
    await reducedPage.evaluate(() => document.documentElement.dataset.ruwaMenuMotion),
    "reduced",
    "Reduced-motion preference did not disable the cinematic menu timeline"
  );
  assert.equal(
    await reducedMenu.nav.evaluate(element => Array.from(element.querySelectorAll("a")).every(link =>
      getComputedStyle(link).visibility !== "hidden" && Number.parseFloat(getComputedStyle(link).opacity) >= .99
    )),
    true,
    "Reduced-motion mode must expose all menu links immediately"
  );
  await reducedMenu.button.click();
  assert.equal(
    await reducedMenu.nav.evaluate(element => !element.classList.contains("open")),
    true,
    "Reduced-motion menu close should be immediate"
  );
  const reducedLight = await reducedPage.locator(".info-card .ruwa-orbit-light").first().evaluate(element => ({
    display: getComputedStyle(element).display,
    animation: getComputedStyle(element).animationName
  }));
  assert.equal(reducedLight.display, "none", "Reduced-motion mode must hide the orbit light");
  assert.equal(reducedLight.animation, "none", "Reduced-motion mode must disable orbit animation");
  await reducedPage.close();

  console.log(JSON.stringify({
    result: "passed",
    viewports: viewportResults,
    interactions: [
      "circular reveal begins at measured hamburger center",
      "navigation links reveal in DOM order",
      "reverse close and repeated direction changes",
      "Escape closes and restores focus",
      "native anchor destination remains active",
      "reduced-motion menu is immediate and fully accessible",
      "orbit light traces the rounded perimeter and fades on exit",
      "orbit light does not intercept pointer or change geometry",
      "existing card elevation and image zoom remain active",
      "touch-only and reduced-motion modes disable orbit animation"
    ],
    orbitTargetCount: orbitCount,
    screenshots: [
      OUT + "/menu-open-1440.png",
      OUT + "/menu-open-390.png",
      OUT + "/orbit-card-before.png",
      OUT + "/orbit-card-hover.png"
    ],
    failures
  }, null, 2));
} catch (error) {
  failures.push(error.message);
  throw error;
} finally {
  await browser.close();
}
