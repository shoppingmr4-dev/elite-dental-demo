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

  await page.evaluate(() => document.fonts.ready.then(() => true));
  const baselineNav = await page.evaluate(() => {
    if (window.innerWidth <= 920) return null;
    const nav = document.querySelector("#main-nav");
    const box = element => {
      const rect = element.getBoundingClientRect();
      return {
        left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom,
        width: rect.width, height: rect.height
      };
    };
    const visibleLinks = Array.from(nav.querySelectorAll("a"))
      .filter(link => getComputedStyle(link).display !== "none");
    const style = getComputedStyle(nav);
    return {
      rect: box(nav),
      style: {
        display: style.display,
        position: style.position,
        flexDirection: style.flexDirection,
        gap: style.gap,
        fontSize: getComputedStyle(visibleLinks[0]).fontSize,
        lineHeight: getComputedStyle(visibleLinks[0]).lineHeight,
        fontWeight: getComputedStyle(visibleLinks[0]).fontWeight
      },
      links: visibleLinks.map(link => ({ href: link.getAttribute("href"), rect: box(link) }))
    };
  });

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

  // On fine-pointer desktop, the circular control must visibly darken on hover
  // and return to its exact resting color after pointer exit.
  if (viewport.width > 920) {
    const restingColor = await button.evaluate(element => getComputedStyle(element, "::before").backgroundColor);
    const hoverBox = await button.boundingBox();
    assert.ok(hoverBox && hoverBox.width > 0 && hoverBox.height > 0,
      viewport.name + ": hamburger circle has no visible hover target");
    // Move to the already-visible compact header button directly. Locator.hover()
    // auto-scrolls and can move the sticky header out of its compact state.
    await page.mouse.move(
      hoverBox.x + hoverBox.width / 2,
      hoverBox.y + hoverBox.height / 2
    );
    await page.waitForTimeout(230);
    const hoverState = await button.evaluate(element => ({
      color: getComputedStyle(element, "::before").backgroundColor,
      pointerHover: element.dataset.pointerHover || null,
      matchesHover: element.matches(":hover"),
      primaryHover: matchMedia("(hover:hover)").matches,
      anyHover: matchMedia("(any-hover:hover)").matches,
      finePointer: matchMedia("(pointer:fine)").matches,
      rect: element.getBoundingClientRect().toJSON()
    }));
    const hoverColor = hoverState.color;
    assert.notEqual(hoverColor, restingColor,
      viewport.name + ": visible hamburger circle did not darken on hover: " + JSON.stringify(hoverState));
    await page.mouse.move(8, 8);
    await page.waitForTimeout(240);
    const returnedColor = await button.evaluate(element => getComputedStyle(element, "::before").backgroundColor);
    assert.equal(returnedColor, restingColor,
      viewport.name + ": visible hamburger circle did not return to its resting color after hover");
  }

  const initial = await page.locator("#main-nav").evaluate(nav => ({
    inert: nav.inert,
    open: nav.classList.contains("open"),
    state: nav.dataset.ruwaMenuState
  }));
  assert.equal(initial.open, false, viewport.name + ": nav unexpectedly starts open");
  assert.equal(initial.inert, true, viewport.name + ": hidden collapsed nav must be inert");
  return { button, nav: page.locator("#main-nav"), baselineNav };
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

    const { button, nav, baselineNav } = await prepareMenuPage(page, viewport);
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
    if (mode === "gsap-funnel") {
      // Wait for the first actual GSAP tick rather than assuming a fixed timer aligns with RAF.
      await page.waitForFunction(
        () => Number(document.querySelector("#main-nav")?.dataset.ruwaMenuFunnelProgress || 0) > .002,
        null,
        { timeout: 3000 }
      );
      const early = await nav.evaluate(element => {
        const style = getComputedStyle(element);
        const matrix = style.transform === "none" ? new DOMMatrixReadOnly() : new DOMMatrixReadOnly(style.transform);
        const origin = style.transformOrigin.split(/\\s+/).map(value => Number.parseFloat(value));
        const clipPath = style.clipPath;
        return {
          shape: element.dataset.ruwaMenuShape,
          progress: Number(element.dataset.ruwaMenuFunnelProgress || 0),
          clipPath,
          pointCount: (clipPath.match(/,/g) || []).length + 1,
          expectedX: Number(element.dataset.ruwaMenuOriginX),
          expectedY: Number(element.dataset.ruwaMenuOriginY),
          transformOriginX: origin[0],
          transformOriginY: origin[1],
          panelLeft: Number(element.dataset.ruwaMenuPanelLeft),
          panelTop: Number(element.dataset.ruwaMenuPanelTop),
          buttonCenterX: Number(element.dataset.ruwaMenuButtonCenterX),
          buttonCenterY: Number(element.dataset.ruwaMenuButtonCenterY),
          transformOriginX: origin[0],
          transformOriginY: origin[1],
          transformScale: Math.hypot(matrix.a, matrix.b),
          rotation: Math.atan2(matrix.b, matrix.a) * 180 / Math.PI,
          state: element.dataset.ruwaMenuState
        };
      });
      assert.equal(early.shape, "spiral-funnel",
        viewport.name + ": desktop menu did not activate the spiral-funnel reveal");
      assert.ok(early.progress > 0 && early.progress < .9,
        viewport.name + ": funnel did not begin as a narrow growing reveal: " + JSON.stringify(early));
      assert.ok(early.clipPath.startsWith("polygon(") && early.pointCount >= 24,
        viewport.name + ": funnel reveal is not a multi-point tapered curved shape: " + JSON.stringify(early));
      assert.ok(Math.abs(early.panelLeft + early.expectedX - early.buttonCenterX) <= 1.25 &&
        Math.abs(early.panelTop + early.expectedY - early.buttonCenterY) <= 1.25,
        viewport.name + ": funnel origin does not match the true hamburger center: " + JSON.stringify(early));
      assert.ok(Math.abs(early.transformOriginX - early.expectedX) <= 1.25 &&
        Math.abs(early.transformOriginY - early.expectedY) <= 1.25,
        viewport.name + ": nav transform is not anchored to the hamburger center: " + JSON.stringify(early));
      assert.ok(early.transformScale > .94 && early.transformScale < 1 &&
        Math.abs(early.rotation) > .3 && Math.abs(early.rotation) < 3.5,
        viewport.name + ": funnel did not expand with subtle spiral motion: " + JSON.stringify(early));

      if (viewport.width === 1440) {
        await page.screenshot({ path: OUT + "/menu-funnel-early-1440.png", fullPage: false });
      }
      await page.waitForTimeout(150);
      const middleProgress = await nav.evaluate(element =>
        Number(element.dataset.ruwaMenuFunnelProgress || 0)
      );
      assert.ok(middleProgress > early.progress + .04 && middleProgress < 1,
        viewport.name + ": funnel did not widen progressively during its outward travel");
      if (viewport.width === 1440) {
        await page.screenshot({ path: OUT + "/menu-funnel-middle-1440.png", fullPage: false });
      }
    } else if (mode === "gsap") {
      await page.waitForTimeout(110);
      const early = await nav.evaluate(element => {
        const style = getComputedStyle(element);
        const match = style.clipPath.match(/circle\(([-\d.]+)px at ([-\d.]+)px ([-\d.]+)px\)/);
        const matrix = style.transform === "none" ? new DOMMatrixReadOnly() : new DOMMatrixReadOnly(style.transform);
        const origin = style.transformOrigin.split(/\s+/).map(value => Number.parseFloat(value));
        return {
          clipPath: style.clipPath,
          radius: match ? Number(match[1]) : 0,
          x: match ? Number(match[2]) : NaN,
          y: match ? Number(match[3]) : NaN,
          expectedX: Number(element.dataset.ruwaMenuOriginX),
          expectedY: Number(element.dataset.ruwaMenuOriginY),
          panelLeft: Number(element.dataset.ruwaMenuPanelLeft),
          panelTop: Number(element.dataset.ruwaMenuPanelTop),
          buttonCenterX: Number(element.dataset.ruwaMenuButtonCenterX),
          buttonCenterY: Number(element.dataset.ruwaMenuButtonCenterY),
          transformOriginX: origin[0],
          transformOriginY: origin[1],
          transformScale: Math.hypot(matrix.a, matrix.b),
          rotation: Math.atan2(matrix.b, matrix.a) * 180 / Math.PI,
          maxRadius: Number(element.dataset.ruwaMenuRadius || 0),
          state: element.dataset.ruwaMenuState
        };
      });
      assert.ok(early.radius > 0 && early.radius < early.maxRadius,
        viewport.name + ": menu did not expose a growing circular reveal: " + JSON.stringify(early));
      assert.ok(Math.abs(early.x - early.expectedX) <= 1.25 &&
        Math.abs(early.y - early.expectedY) <= 1.25,
        viewport.name + ": circular reveal did not use its measured button-relative origin: " + JSON.stringify(early));
      assert.ok(Math.abs(early.panelLeft + early.expectedX - early.buttonCenterX) <= 1.25 &&
        Math.abs(early.panelTop + early.expectedY - early.buttonCenterY) <= 1.25,
        viewport.name + ": the menu's measured scale origin is not the actual hamburger center: " + JSON.stringify(early));
      assert.ok(Math.abs(early.transformOriginX - early.expectedX) <= 1.25 &&
        Math.abs(early.transformOriginY - early.expectedY) <= 1.25,
        viewport.name + ": the panel transform is not anchored to the hamburger center: " + JSON.stringify(early));
      assert.ok(early.transformScale > .018 && early.transformScale < .99 &&
        Math.abs(early.rotation) > .1,
        viewport.name + ": the panel itself did not scale and gently spiral outward from the button: " + JSON.stringify(early));
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
          href: link.getAttribute("href"),
          display: getComputedStyle(link).display,
          visibility: getComputedStyle(link).visibility,
          opacity: Number.parseFloat(getComputedStyle(link).opacity)
        })),
        visibleLinks: links.filter(link => getComputedStyle(link).display !== "none").map(link => {
          const rect = link.getBoundingClientRect();
          return {
            href: link.getAttribute("href"),
            rect: {
              left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom,
              width: rect.width, height: rect.height
            }
          };
        }),
        navStyle: {
          display: getComputedStyle(element).display,
          position: getComputedStyle(element).position,
          flexDirection: getComputedStyle(element).flexDirection,
          gap: getComputedStyle(element).gap,
          overflowY: getComputedStyle(element).overflowY,
          backgroundColor: getComputedStyle(element).backgroundColor,
          borderTopWidth: getComputedStyle(element).borderTopWidth
        },
        rect: {
          left: element.getBoundingClientRect().left,
          right: element.getBoundingClientRect().right,
          width: element.getBoundingClientRect().width,
          height: element.getBoundingClientRect().height,
          centerX: element.getBoundingClientRect().left + element.getBoundingClientRect().width / 2,
          viewportCenterX: window.innerWidth / 2,
          header: document.querySelector(".site-header").getBoundingClientRect().toJSON(),
          style: {
            left: getComputedStyle(element).left,
            right: getComputedStyle(element).right,
            width: getComputedStyle(element).width,
            transform: getComputedStyle(element).transform,
            translate: getComputedStyle(element).translate,
            transformOrigin: getComputedStyle(element).transformOrigin
          }
        }
      };
    });
    assert.equal(opened.expanded, "true", viewport.name + ": aria-expanded did not become true");
    assert.equal(opened.inert, false, viewport.name + ": visible nav remained inert");
    assert.equal(opened.open, true, viewport.name + ": open nav class was removed");
    assert.ok(opened.rect.width > 0 && opened.rect.height > 0,
      viewport.name + ": expanded panel has no rendered dimensions");
    if (viewport.width > 920) {
      assert.ok(baselineNav, viewport.name + ": original desktop navigation geometry was not captured");
      for (const edge of ["left", "right", "top", "bottom", "width", "height"]) {
        assert.ok(Math.abs(opened.rect[edge] - baselineNav.rect[edge]) <= 1.5,
          viewport.name + ": navigation did not return to its original " + edge + " position: " +
          JSON.stringify({ before: baselineNav.rect, after: opened.rect }));
      }
      assert.equal(opened.navStyle.display, baselineNav.style.display,
        viewport.name + ": original navigation display mode changed");
      assert.equal(opened.navStyle.position, baselineNav.style.position,
        viewport.name + ": navigation was moved into a positioned dropdown");
      assert.equal(opened.navStyle.flexDirection, "row",
        viewport.name + ": original horizontal navigation arrangement was not restored");
      assert.equal(opened.navStyle.gap, baselineNav.style.gap,
        viewport.name + ": original navigation spacing changed");
      assert.equal(opened.navStyle.overflowY, "visible",
        viewport.name + ": desktop nav still behaves as a scrollable dropdown");
      assert.equal(opened.navStyle.backgroundColor, "rgba(0, 0, 0, 0)",
        viewport.name + ": desktop nav acquired a new panel background");
      assert.equal(opened.navStyle.borderTopWidth, "0px",
        viewport.name + ": desktop nav acquired a new panel border");
      assert.equal(opened.visibleLinks.length, baselineNav.links.length,
        viewport.name + ": original number of visible desktop links changed");
      for (const before of baselineNav.links) {
        const after = opened.visibleLinks.find(link => link.href === before.href);
        assert.ok(after, viewport.name + ": original navigation link disappeared: " + before.href);
        for (const edge of ["left", "right", "top", "bottom", "width", "height"]) {
          assert.ok(Math.abs(after.rect[edge] - before.rect[edge]) <= 1.5,
            viewport.name + ": link " + before.href + " did not return to its exact original geometry: " +
            JSON.stringify({ before: before.rect, after: after.rect }));
        }
      }
    }

    const menuScrollStyle = await nav.evaluate(element => ({
      overflowY: getComputedStyle(element).overflowY,
      scrollbarWidth: getComputedStyle(element).scrollbarWidth,
      webkitScrollbarDisplay: getComputedStyle(element, "::-webkit-scrollbar").display
    }));
    if (viewport.width <= 920) {
      assert.ok(["auto", "scroll"].includes(menuScrollStyle.overflowY),
        viewport.name + ": expanded responsive menu must remain scrollable");
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
    }

    const visibleLinks = opened.links.filter(link => link.display !== "none");
    assert.ok(visibleLinks.every(link => link.visibility !== "hidden" && link.opacity >= .99),
      viewport.name + ": one or more navigation links did not finish their reveal");

    // Each original visible link must remain normally focusable after the reveal completes.
    const focusable = await nav.locator("a:visible").first().evaluate(link => {
      link.focus();
      return document.activeElement === link;
    });
    assert.equal(focusable, true, viewport.name + ": navigation link cannot receive keyboard focus");

    if (viewport.width === 1440 || viewport.width === 768 || viewport.width === 390) {
      await page.screenshot({
        path: OUT + "/menu-open-" + viewport.width + ".png",
        fullPage: false
      });
    }

    if (viewport.width > 920) {
      await page.keyboard.press("Escape");
      await page.waitForFunction(
        () => document.querySelector("#main-nav")?.dataset.ruwaMenuState === "closing",
        null,
        { timeout: 3000 }
      );
      await page.waitForTimeout(110);
      const reverseProgress = await nav.evaluate(element =>
        Number(element.dataset.ruwaMenuFunnelProgress || 1)
      );
      assert.ok(reverseProgress > 0 && reverseProgress < 1,
        viewport.name + ": closing did not reverse the funnel toward the hamburger circle");
      if (viewport.width === 1440) {
        await page.screenshot({ path: OUT + "/menu-funnel-reverse-1440.png", fullPage: false });
      }
    } else {
      await clickHamburger(page, button, viewport.name);
    }
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
      originVerified: mode === "gsap" || mode === "gsap-funnel",
      funnelVerified: mode === "gsap-funnel",
      sequentialLinksVisible: opened.links.filter(link => link.display !== "none").length,
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

  // The meteor is a chain of SVG motion points sharing the exact measured border-centerline path.
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
  const animatedOrbitCount = await orbitPage.evaluate(() =>
    Number(document.documentElement.dataset.ruwaOrbitAnimatedCount || 0)
  );
  assert.ok(orbitCount >= 20, "Expected selected card, panel and icon frames to receive orbit targets; found " + orbitCount);
  assert.ok(animatedOrbitCount >= 20,
    "Expected selected desktop frames to receive the SVG meteor path; found " + animatedOrbitCount);

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
      return light && Number.parseFloat(getComputedStyle(light).opacity) > .7;
    },
    await card.elementHandle(),
    { timeout: 2500 }
  );
  await orbitPage.waitForTimeout(280);
  const activeLight = await light.evaluate(svg => {
    const parent = svg.parentElement;
    const rect = svg.getBoundingClientRect();
    const parentRect = parent.getBoundingClientRect();
    const style = getComputedStyle(svg);
    const path = svg.querySelector("path");
    const circles = Array.from(svg.querySelectorAll("circle"));
    const motions = Array.from(svg.querySelectorAll("animateMotion"));
    const head = svg.querySelector(".ruwa-orbit-head");
    return {
      opacity: Number.parseFloat(style.opacity),
      pointerEvents: style.pointerEvents,
      viewBox: svg.getAttribute("viewBox"),
      pathData: path?.getAttribute("d") || "",
      measuredPathLength: path?.getTotalLength() || 0,
      declaredPathLength: Number(svg.dataset.pathLength || 0),
      speed: Number(svg.dataset.speed || 0),
      borderTop: Number.parseFloat(getComputedStyle(parent).borderTopWidth) || 0,
      pathStart: (path?.getAttribute("d") || "").match(/^M\s*([-\d.]+)\s+([-\d.]+)/),
      circles: circles.map(circle => ({
        className: circle.getAttribute("class"),
        radius: Number(circle.getAttribute("r")),
        fill: circle.getAttribute("fill"),
        opacity: Number(circle.getAttribute("opacity"))
      })),
      motion: motions.map(animation => ({
        duration: animation.getAttribute("dur"),
        begin: animation.getAttribute("begin"),
        calcMode: animation.getAttribute("calcMode"),
        rotate: animation.getAttribute("rotate"),
        path: animation.getAttribute("path")
      })),
      leftDelta: Math.abs(rect.left - parentRect.left),
      topDelta: Math.abs(rect.top - parentRect.top),
      rightDelta: Math.abs(rect.right - parentRect.right),
      bottomDelta: Math.abs(rect.bottom - parentRect.bottom),
      headBox: head?.getBoundingClientRect().toJSON() || null
    };
  });
  const firstHead = await light.locator(".ruwa-orbit-head").boundingBox();
  await orbitPage.waitForTimeout(260);
  const secondHead = await light.locator(".ruwa-orbit-head").boundingBox();
  const firstDuration = Number.parseFloat(activeLight.motion[0]?.duration || "0");
  const calculatedSpeed = activeLight.declaredPathLength / firstDuration;
  assert.ok(activeLight.opacity > .7, "Meteor particles did not become visible on hover");
  assert.ok(activeLight.pathData.endsWith(" Z") && activeLight.pathData.includes("A ") &&
    activeLight.pathData.includes("H ") && activeLight.pathData.includes("V "),
    "Meteor route must be a closed rounded-rectangle path with straight sides and corner arcs");
  assert.ok(activeLight.measuredPathLength > 0 &&
    Math.abs(activeLight.measuredPathLength - activeLight.declaredPathLength) <= 1.5,
    "Meteor path length does not match the measured SVG border path");
  assert.ok(activeLight.pathStart &&
    Math.abs(Number(activeLight.pathStart[2]) - activeLight.borderTop / 2) <= .2,
    "Meteor path does not begin on the border's vertical centerline");
  assert.equal(activeLight.motion.length, 9,
    "Expected one luminous head and eight trailing points following the same path");
  assert.ok(activeLight.motion.every(item =>
    item.calcMode === "paced" && item.path === activeLight.pathData &&
    item.duration === activeLight.motion[0].duration
  ), "All meteor particles must share the same paced perimeter path and cycle duration");
  assert.ok(activeLight.motion[0].begin === "0s" &&
    activeLight.motion.slice(1).every((item, index) =>
      Number.parseFloat(item.begin) > Number.parseFloat(activeLight.motion[index].begin)
    ), "The trail particles must follow behind the bright head in sequential phase offsets");
  assert.ok(Math.abs(calculatedSpeed - activeLight.speed) <= .2,
    "Meteor duration is not derived from one shared physical travel speed");
  assert.ok(activeLight.circles[0].className === "ruwa-orbit-head" &&
    activeLight.circles[0].fill === "#FFFFFF" &&
    activeLight.circles.slice(1).every((point, index, all) =>
      point.className === "ruwa-orbit-tail" &&
      point.radius < (index === 0 ? activeLight.circles[0].radius : all[index - 1].radius)
    ), "Meteor head must be bright white and its trail must taper progressively");
  assert.equal(activeLight.pointerEvents, "none", "Decorative meteor SVG must not intercept pointer input");
  assert.ok(activeLight.leftDelta <= 1 && activeLight.topDelta <= 1 &&
    activeLight.rightDelta <= 1 && activeLight.bottomDelta <= 1,
    "Meteor SVG overlay is not aligned to the frame's outer geometry");
  assert.ok(firstHead && secondHead &&
    Math.hypot(
      secondHead.x + secondHead.width / 2 - firstHead.x - firstHead.width / 2,
      secondHead.y + secondHead.height / 2 - firstHead.y - firstHead.height / 2
    ) > 1,
    "The luminous meteor head did not advance along the perimeter");
  await card.screenshot({ path: OUT + "/orbit-card-hover.png" });
  const after = await card.evaluate(element => ({
    width: element.offsetWidth,
    height: element.offsetHeight,
    translate: getComputedStyle(element).translate
  }));
  assert.equal(after.width, before.width, "Meteor path changed card width");
  assert.equal(after.height, before.height, "Meteor path changed card height");
  assert.ok(Number.parseFloat(after.translate.split(" ")[1]) < -2.5,
    "Existing independent card elevation did not remain active beside the meteor");

  await orbitPage.mouse.move(8, 8);
  await orbitPage.waitForTimeout(320);
  const exitedOpacity = await light.evaluate(element => Number.parseFloat(getComputedStyle(element).opacity));
  assert.ok(exitedOpacity < .05, "Meteor trail did not fade away after pointer exit");

  const teamCard = orbitPage.locator(".team-card").first();
  await teamCard.scrollIntoViewIfNeeded();
  await orbitPage.waitForTimeout(760);
  await teamCard.hover();
  await orbitPage.waitForTimeout(360);
  const teamState = await teamCard.evaluate(element => {
    const svg = element.querySelector(":scope > .ruwa-orbit-light");
    const motion = svg?.querySelector("animateMotion");
    const length = Number(svg?.dataset.pathLength || 0);
    const duration = Number.parseFloat(motion?.getAttribute("dur") || "0");
    return {
      opacity: svg ? Number.parseFloat(getComputedStyle(svg).opacity) : 0,
      pathLength: length,
      speed: duration > 0 ? length / duration : 0,
      motionCount: svg?.querySelectorAll("animateMotion").length || 0,
      imageScale: getComputedStyle(element.querySelector(".team-card-media img")).scale
    };
  });
  assert.ok(teamState.opacity > .7 && teamState.motionCount === 9,
    "Team frame did not receive the complete meteor particle path");
  assert.ok(Math.abs(teamState.speed - activeLight.speed) <= .2,
    "A different frame size changed the meteor's physical travel speed");
  assert.ok(Number.parseFloat(teamState.imageScale) > 1.02,
    "Existing clipped team image zoom did not remain active");
  assert.equal(orbitErrors.length, 0, "Meteor-motion browser errors: " + orbitErrors.join(" | "));
  await orbitPage.close();
  console.log("[PASS] SVG meteor head and tapered particle trail follow the exact rounded border centerline at shared constant physical speed");

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
  const touchLayerCount = await touchPage.locator(".ruwa-orbit-light").count();
  assert.equal(touchLayerCount, 0,
    "Touch-only devices must not create continuously animated meteor SVG layers");
  await touchPage.locator(".info-card").first().tap();
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
  const reducedLayers = await reducedPage.locator(".ruwa-orbit-light").count();
  assert.equal(reducedLayers, 0,
    "Reduced-motion mode must not create animated meteor SVG layers");
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
      "meteor head and tapered tail use paced SVG motion on the measured border centerline",
      "meteor particles do not intercept pointer or change card geometry",
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
