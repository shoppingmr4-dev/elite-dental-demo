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
        const origin = style.transformOrigin.split(/\s+/).map(value => Number.parseFloat(value));
        const clipPath = style.clipPath;
        return {
          shape: element.dataset.ruwaMenuShape,
          progress: Number(element.dataset.ruwaMenuFunnelProgress || 0),
          clipPath,
          pointCount: (clipPath.match(/,/g) || []).length + 1,
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

  // The comet is a single continuous tapered canvas trail following the measured border path.
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
  assert.ok(orbitResponse && orbitResponse.ok(), "Comet desktop page failed to load");
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
  assert.ok(orbitCount >= 20, "Expected selected card, panel and icon frames to receive comet targets; found " + orbitCount);
  assert.ok(animatedOrbitCount >= 20,
    "Expected selected desktop frames to receive the continuous comet canvas; found " + animatedOrbitCount);
  assert.equal(
    await orbitPage.evaluate(() => Number(document.documentElement.dataset.ruwaOrbitSpeed || 0)),
    240,
    "Comet travel speed must use the requested 240 CSS px/s target"
  );
  assert.ok(
    Math.abs(Number(await orbitPage.evaluate(() =>
      document.documentElement.dataset.ruwaOrbitTailCoverage || 0
    )) - .86) < .001,
    "Comet tail must cover 86% of the complete perimeter"
  );

  const card = orbitPage.locator(".info-card").first();
  await card.scrollIntoViewIfNeeded();
  await orbitPage.waitForTimeout(760);
  const light = card.locator(":scope > canvas.ruwa-orbit-light");
  const before = await card.evaluate(element => ({
    width: element.offsetWidth,
    height: element.offsetHeight,
    translate: getComputedStyle(element).translate
  }));
  await card.screenshot({ path: OUT + "/orbit-card-before.png" });
  await card.hover();
  await orbitPage.waitForFunction(
    element => {
      const canvas = element.querySelector(":scope > canvas.ruwa-orbit-light");
      return canvas && Number.parseFloat(getComputedStyle(canvas).opacity) > .7;
    },
    await card.elementHandle(),
    { timeout: 2500 }
  );
  await orbitPage.waitForTimeout(90);
  await card.screenshot({ path: OUT + "/comet-head-on-border.png" });
  const activeComet = await light.evaluate(canvas => {
    const parent = canvas.parentElement;
    const rect = canvas.getBoundingClientRect();
    const parentRect = parent.getBoundingClientRect();
    const geometry = parent.querySelector(":scope > svg.ruwa-orbit-geometry path");
    const style = getComputedStyle(canvas);
    return {
      opacity: Number.parseFloat(style.opacity),
      pointerEvents: style.pointerEvents,
      width: canvas.width,
      height: canvas.height,
      cssWidth: style.width,
      cssHeight: style.height,
      pathData: geometry?.getAttribute("d") || "",
      measuredPathLength: geometry?.getTotalLength() || 0,
      declaredPathLength: Number(canvas.dataset.pathLength || 0),
      speed: Number(canvas.dataset.speed || 0),
      tailLength: Number(canvas.dataset.tailLength || 0),
      tailCoverage: Number(canvas.dataset.tailCoverage || 0),
      headRadius: Number(canvas.dataset.headRadius || 0),
      pixelRatio: Number(canvas.dataset.pixelRatio || 0),
      headDistance: Number(canvas.dataset.headDistance || 0),
      canvasRect: rect.toJSON(),
      parentRect: parentRect.toJSON(),
      leftDelta: Math.abs(rect.left - parentRect.left),
      topDelta: Math.abs(rect.top - parentRect.top),
      rightDelta: Math.abs(rect.right - parentRect.right),
      bottomDelta: Math.abs(rect.bottom - parentRect.bottom)
    };
  });
  const firstHeadDistance = activeComet.headDistance;
  const firstHeadTime = Date.now();
  await orbitPage.waitForTimeout(240);
  const secondComet = await light.evaluate(canvas => ({
    headDistance: Number(canvas.dataset.headDistance || 0),
    renderedAt: Number(canvas.dataset.renderedAt || 0)
  }));
  const secondHeadTime = Date.now();
  const headDistanceDelta = (
    secondComet.headDistance - firstHeadDistance + activeComet.declaredPathLength
  ) % activeComet.declaredPathLength;
  const measuredSpeed = headDistanceDelta / ((secondHeadTime - firstHeadTime) / 1000);

  assert.ok(activeComet.opacity > .7, "Comet canvas did not become visible on hover");
  assert.ok(activeComet.pathData.endsWith(" Z") && activeComet.pathData.includes("A ") &&
    activeComet.pathData.includes("H ") && activeComet.pathData.includes("V "),
    "Comet route must be a closed rounded-rectangle path with straight sides and corner arcs");
  assert.ok(activeComet.measuredPathLength > 0 &&
    Math.abs(activeComet.measuredPathLength - activeComet.declaredPathLength) <= 1.5,
    "Comet path length does not match the measured SVG border centerline");
  assert.ok(activeComet.tailCoverage >= .8 && activeComet.tailCoverage <= .9 &&
    Math.abs(activeComet.tailLength / activeComet.declaredPathLength - activeComet.tailCoverage) < .01,
    "Comet tail must cover approximately 80–90% of the complete measured perimeter");
  assert.ok(activeComet.headRadius >= 4 && activeComet.headRadius > 2.05,
    "Comet head must be visibly larger than the previous small particle head");
  assert.ok(Math.abs(activeComet.speed - 240) < .01 &&
    measuredSpeed >= 185 && measuredSpeed <= 295,
    "Comet head did not maintain the requested faster constant physical speed: " + measuredSpeed);
  assert.equal(activeComet.pointerEvents, "none", "Decorative comet canvas must not intercept pointer input");
  assert.ok(activeComet.leftDelta <= 1.5 && activeComet.topDelta <= 1.5 &&
    activeComet.rightDelta <= 1.5 && activeComet.bottomDelta <= 1.5,
    "Comet canvas is not aligned to the complete outer border geometry: " +
    JSON.stringify({
      left:activeComet.leftDelta,top:activeComet.topDelta,
      right:activeComet.rightDelta,bottom:activeComet.bottomDelta,
      canvas:activeComet.canvasRect,parent:activeComet.parentRect
    }));
  assert.ok(secondComet.headDistance !== firstHeadDistance,
    "Comet head did not advance along its measured perimeter path");
  await card.screenshot({ path: OUT + "/comet-long-tail-full-perimeter.png" });

  const after = await card.evaluate(element => ({
    width: element.offsetWidth,
    height: element.offsetHeight,
    translate: getComputedStyle(element).translate
  }));
  assert.equal(after.width, before.width, "Comet path changed card width");
  assert.equal(after.height, before.height, "Comet path changed card height");
  assert.ok(Number.parseFloat(after.translate.split(" ")[1]) < -2.5,
    "Existing independent card elevation did not remain active beside the comet");

  await orbitPage.mouse.move(8, 8);
  await orbitPage.waitForTimeout(260);
  await card.screenshot({ path: OUT + "/comet-after-pointer-exit.png" });
  const exitedOpacity = await light.evaluate(element => Number.parseFloat(getComputedStyle(element).opacity));
  assert.ok(exitedOpacity < .05, "Comet trail did not fade away after pointer exit");

  const teamCard = orbitPage.locator(".team-card").first();
  await teamCard.scrollIntoViewIfNeeded();
  await orbitPage.waitForTimeout(760);
  await teamCard.hover();
  await orbitPage.waitForTimeout(220);
  const teamState = await teamCard.evaluate(element => {
    const canvas = element.querySelector(":scope > canvas.ruwa-orbit-light");
    return {
      opacity: canvas ? Number.parseFloat(getComputedStyle(canvas).opacity) : 0,
      pathLength: Number(canvas?.dataset.pathLength || 0),
      speed: Number(canvas?.dataset.speed || 0),
      tailCoverage: Number(canvas?.dataset.tailCoverage || 0),
      headDistance: Number(canvas?.dataset.headDistance || 0),
      imageScale: getComputedStyle(element.querySelector(".team-card-media img")).scale
    };
  });
  assert.ok(teamState.opacity > .7 && teamState.pathLength > 0,
    "Team frame did not receive the active continuous comet trail");
  assert.equal(teamState.speed, activeComet.speed,
    "A different frame size changed the comet's physical travel speed");
  assert.ok(Math.abs(teamState.tailCoverage - activeComet.tailCoverage) < .001,
    "A different frame size changed the comet's perimeter coverage ratio");
  assert.ok(Number.parseFloat(teamState.imageScale) > 1.02,
    "Existing clipped team image zoom did not remain active");
  assert.equal(orbitErrors.length, 0, "Comet-motion browser errors: " + orbitErrors.join(" | "));
  await orbitPage.close();
  console.log("[PASS] Long continuous tapered comet covers 86% of the rounded border at 240 CSS px/s with a bright enlarged head");
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
    "Touch-only devices must not create animated comet canvas layers");
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
    "Reduced-motion mode must not create animated comet canvas layers");
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
      "comet uses one continuous 86% tapered trail and a 240 px/s enlarged luminous head on the measured border centerline",
      "comet overlay does not intercept pointer or change card geometry",
      "existing card elevation and image zoom remain active",
      "touch-only and reduced-motion modes disable comet animation"
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
