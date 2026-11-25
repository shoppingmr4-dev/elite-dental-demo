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

async function clickHamburger(page, button, viewportName) {
  const box = await button.boundingBox();
  assert.ok(box && box.width > 0 && box.height > 0,
    viewportName + ": hamburger button has no clickable rendered box");
  assert.ok(box.x >= 0 && box.y >= 0 &&
    box.x + box.width <= page.viewportSize().width + 1 &&
    box.y + box.height <= page.viewportSize().height + 1,
    viewportName + ": hamburger button is not inside the visible viewport");
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

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

    await clickHamburger(page, button, viewport.name);
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
        const match = style.clipPath.match(/circle\(([-\d.]+)px at ([-\d.]+)px ([-\d.]+)px\)/);
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

      await page.waitForTimeout(120);
      const spiralMotion = await nav.locator("a").first().evaluate(link => {
        const transform = getComputedStyle(link).transform;
        if (!transform || transform === "none") return { rotation: 0, x: 0, y: 0 };
        const matrix = new DOMMatrixReadOnly(transform);
        return {
          rotation: Math.atan2(matrix.b, matrix.a) * 180 / Math.PI,
          x: matrix.e,
          y: matrix.f
        };
      });
      assert.ok(Math.abs(spiralMotion.rotation) > .15 &&
        Math.hypot(spiralMotion.x, spiralMotion.y) > .5,
        viewport.name + ": navigation links did not unfold with a subtle spiral-like motion: " +
        JSON.stringify(spiralMotion));
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

    const menuScrollStyle = await nav.evaluate(element => ({
      overflowY: getComputedStyle(element).overflowY,
      scrollbarWidth: getComputedStyle(element).scrollbarWidth,
      webkitScrollbarDisplay: getComputedStyle(element, "::-webkit-scrollbar").display
    }));
    assert.ok(["auto", "scroll"].includes(menuScrollStyle.overflowY),
      viewport.name + ": expanded menu must remain scrollable");
    assert.equal(menuScrollStyle.scrollbarWidth, "none",
      viewport.name + ": visible standards scrollbar was not hidden");
    assert.equal(menuScrollStyle.webkitScrollbarDisplay, "none",
      viewport.name + ": visible WebKit scrollbar was not hidden");

    const scrollAccess = await nav.evaluate(element => {
      const originalMaxHeight = element.style.maxHeight;
      const filler = document.createElement("a");
      filler.href = "#";
      filler.textContent = "scrollability test";
      filler.setAttribute("aria-hidden", "true");
      filler.tabIndex = -1;
      filler.style.cssText = "display:block;flex:0 0 180px;height:180px;min-height:180px";
      element.appendChild(filler);
      element.style.maxHeight = "100px";
      element.scrollTop = 0;
      const canScroll = element.scrollHeight > element.clientHeight;
      element.scrollTop = element.scrollHeight;
      const advanced = element.scrollTop > 0;
      filler.remove();
      element.style.maxHeight = originalMaxHeight;
      element.scrollTop = 0;
      return { canScroll, advanced };
    });
    assert.equal(scrollAccess.canScroll, true,
      viewport.name + ": test content did not overflow the menu scroll container");
    assert.equal(scrollAccess.advanced, true,
      viewport.name + ": hiding the scrollbar also disabled menu scrolling");

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

    await clickHamburger(page, button, viewport.name);
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
  await clickHamburger(interactionPage, interaction.button, "mobile-390-interactions");
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

  await clickHamburger(interactionPage, interaction.button, "mobile-390-interactions");
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
  assert.equal(
    await interactionPage.evaluate(() => document.activeElement?.id),
    "menu-toggle",
    "Selecting a menu destination must restore focus to the menu button while the panel reverses"
  );

  await interactionPage.evaluate(() => window.scrollTo(0, 0));
  await clickHamburger(interactionPage, interaction.button, "mobile-390-interactions");
  await interactionPage.waitForFunction(
    () => document.querySelector("#main-nav")?.dataset.ruwaMenuState === "opening",
    null,
    { timeout: 3000 }
  );
  await interactionPage.waitForTimeout(140);
  await clickHamburger(interactionPage, interaction.button, "mobile-390-interactions");
  await interactionPage.waitForFunction(
    () => document.querySelector("#main-nav")?.dataset.ruwaMenuState === "closing",
    null,
    { timeout: 3000 }
  );
  await interactionPage.waitForTimeout(90);
  await clickHamburger(interactionPage, interaction.button, "mobile-390-interactions");
  await interactionPage.waitForFunction(
    () => document.querySelector("#main-nav")?.dataset.ruwaMenuState === "open",
    null,
    { timeout: 6000 }
  );
  await clickHamburger(interactionPage, interaction.button, "mobile-390-interactions");
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
  assert.ok(orbitResponse && orbitResponse.ok(), "Meteor-orbit desktop page failed to load");
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
        getComputedStyle(light).animationName === "ruwaMeteorOrbit";
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
      animationDuration: style.animationDuration,
      animationTimingFunction: style.animationTimingFunction,
      backgroundImage: style.backgroundImage,
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
  assert.ok(activeLight.opacity > .7, "Meteor trail did not become visible on hover");
  assert.equal(activeLight.animationName, "ruwaMeteorOrbit", "Meteor did not start its CSS conic-gradient animation");
  assert.equal(activeLight.animationPlayState, "running", "Meteor trail should run only during hover");
  assert.equal(activeLight.animationDuration, "4.2s",
    "Meteor orbit speed must remain consistent across selected elements");
  assert.equal(activeLight.animationTimingFunction, "linear",
    "Meteor orbit must use constant-speed linear motion");
  assert.ok(activeLight.backgroundImage.includes("255, 255, 255") &&
    activeLight.backgroundImage.includes("116, 220, 213"),
    "Meteor effect must contain a distinct white head and a fading teal trail");
  assert.ok(Number.isFinite(firstAngle) && Number.isFinite(secondAngle) &&
    Math.abs(firstAngle - secondAngle) > 2,
    "The meteor trail did not advance around the perimeter");
  assert.equal(activeLight.pointerEvents, "none", "Decorative orbit layer must not intercept interaction");
  assert.equal(activeLight.radius, activeLight.parentRadius, "Meteor trail did not inherit the frame's exact corner radius");
  assert.ok(activeLight.leftDelta <= 1 && activeLight.topDelta <= 1 &&
    activeLight.rightDelta <= 1 && activeLight.bottomDelta <= 1,
    "Meteor trail is not aligned to the actual frame perimeter");
  await card.screenshot({ path: OUT + "/orbit-card-hover.png" });
  const after = await card.evaluate(element => ({
    width: element.offsetWidth,
    height: element.offsetHeight,
    translate: getComputedStyle(element).translate
  }));
  assert.equal(after.width, before.width, "Meteor trail changed card width");
  assert.equal(after.height, before.height, "Meteor trail changed card height");
  assert.ok(Number.parseFloat(after.translate.split(" ")[1]) < -2.5,
    "Existing independent card elevation did not remain active beside the orbit light");

  await orbitPage.mouse.move(8, 8);
  await orbitPage.waitForTimeout(320);
  const exited = await light.evaluate(element => ({
    opacity: Number.parseFloat(getComputedStyle(element).opacity),
    animationName: getComputedStyle(element).animationName
  }));
  assert.ok(exited.opacity < .05, "Meteor trail did not fade away after pointer exit");
  assert.equal(exited.animationName, "none", "Meteor animation continued after pointer exit");

  const teamCard = orbitPage.locator(".team-card").first();
  await teamCard.scrollIntoViewIfNeeded();
  await orbitPage.waitForTimeout(760);
  await teamCard.hover();
  await orbitPage.waitForTimeout(360);
  const teamState = await teamCard.evaluate(element => ({
    animationName: getComputedStyle(element.querySelector(":scope > .ruwa-orbit-light")).animationName,
    imageScale: getComputedStyle(element.querySelector(".team-card-media img")).scale
  }));
  assert.equal(teamState.animationName, "ruwaMeteorOrbit", "Team frame did not receive the meteor trail");
  assert.ok(Number.parseFloat(teamState.imageScale) > 1.02,
    "Existing clipped team image zoom did not remain active");
  assert.equal(orbitErrors.length, 0, "Meteor-light browser errors: " + orbitErrors.join(" | "));
  await orbitPage.close();
  console.log("[PASS] Meteor head and tapered tail follow the rounded border, fade on exit, and coexist with existing hover elevation/image zoom");

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
  const touchCard = touchPage.locator(".info-card").first();
  await touchCard.scrollIntoViewIfNeeded();
  const touchLight = touchCard.locator(":scope > .ruwa-orbit-light");
  const touchDisplay = await touchLight.evaluate(element => getComputedStyle(element).display);
  assert.equal(touchDisplay, "none", "Meteor trail must be disabled on touch-only devices");
  await touchPage.locator(".info-card").first().tap();
  assert.equal(
    await touchLight.evaluate(element => getComputedStyle(element).animationName),
    "none",
    "Touch must not leave the meteor animation running"
  );
  assert.equal(
    await touchPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
    true,
    "Meteor interaction introduced touch-layout overflow"
  );
  await touchPage.close();

  const reducedPage = await browser.newPage({
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce"
  });
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
  assert.equal(reducedLight.display, "none", "Reduced-motion mode must hide the meteor trail");
  assert.equal(reducedLight.animation, "none", "Reduced-motion mode must disable meteor animation");
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
      "meteor head and tapered tail trace the rounded perimeter and fade on exit",
      "meteor trail does not intercept pointer or change geometry",
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
