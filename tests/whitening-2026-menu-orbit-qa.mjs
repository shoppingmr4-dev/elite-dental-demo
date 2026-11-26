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
    assert.equal(mode, "gsap-staggered",
      viewport.name + ": expected the Contact-anchored panel with its frame-first reveal");

    if (viewport.width > 920) {
      await page.waitForTimeout(150);
      const frameOpening = await nav.evaluate(element => ({
        frameState: element.dataset.ruwaMenuFrameState,
        clipPath: getComputedStyle(element).clipPath,
        opacity: Number.parseFloat(getComputedStyle(element).opacity),
        linkOpacity: Array.from(element.querySelectorAll("a"))
          .filter(link => getComputedStyle(link).display !== "none")
          .map(link => Number.parseFloat(getComputedStyle(link).opacity))
      }));
      assert.equal(frameOpening.frameState, "drawing",
        viewport.name + ": the complete panel frame must enter before its navigation text");
      assert.ok(frameOpening.clipPath.includes("inset"),
        viewport.name + ": the frame must reveal as a rectangle, never from a circular mask");
      assert.ok(frameOpening.opacity > .1,
        viewport.name + ": the panel frame did not begin appearing");
      assert.ok(frameOpening.linkOpacity.every(opacity => opacity < .05),
        viewport.name + ": navigation text appeared before the outer frame finished");
    }

    await page.waitForTimeout(viewport.width > 920 ? 550 : 450);
    const staggerState = await nav.evaluate(element => {
      const style = getComputedStyle(element);
      const links = Array.from(element.querySelectorAll("a"))
        .filter(link => getComputedStyle(link).display !== "none");
      const panelRect=element.getBoundingClientRect();
      const contactRect=document.querySelector(".header-action").getBoundingClientRect();
      return {
        shape: element.dataset.ruwaMenuShape,
        frameState: element.dataset.ruwaMenuFrameState,
        clipPath: style.clipPath,
        position: style.position,
        flexDirection: style.flexDirection,
        panelOpacity: Number.parseFloat(style.opacity),
        panelRect:panelRect.toJSON(),
        contactRect:contactRect.toJSON(),
        belowContact:panelRect.top>=contactRect.bottom+8,
        alignedWithContact:Math.abs(panelRect.left-contactRect.left)<=2,
        progress: Number(element.dataset.ruwaMenuProgress || 0),
        linkOpacity: links.map(link => Number.parseFloat(getComputedStyle(link).opacity)),
        linkRects: links.map(link => {
          const rect = link.getBoundingClientRect();
          return {top:rect.top,bottom:rect.bottom,height:rect.height};
        })
      };
    });
    assert.equal(staggerState.shape, viewport.width > 920 ? "contact-panel" : "dropdown",
      viewport.name + ": desktop menu must open beneath Contact; tablet/mobile keeps its normal dropdown");
    assert.equal(staggerState.position, "absolute",
      viewport.name + ": menu must remain independently positioned");
    if(viewport.width>920){
      assert.equal(staggerState.frameState,"revealed",
        viewport.name + ": the full outer frame must finish before the link sequence completes");
      assert.ok(staggerState.clipPath.includes("inset"),
        viewport.name + ": panel must retain its rectangular frame, not a circular reveal");
      assert.equal(staggerState.belowContact,true,
        viewport.name + ": animated panel must appear below the Contact CTA");
      assert.equal(staggerState.alignedWithContact,true,
        viewport.name + ": panel must align with the Contact CTA's left edge");
    }
    assert.equal(staggerState.flexDirection, "column",
      viewport.name + ": dropdown links must be vertically aligned");
    assert.ok(staggerState.panelOpacity > .8,
      viewport.name + ": dropdown panel did not fade into place");
    assert.equal(staggerState.linkOpacity.length, 7,
      viewport.name + ": the stagger must include all seven navigation links");
    assert.ok(staggerState.linkOpacity[0] > .95 &&
      staggerState.linkOpacity[1] > staggerState.linkOpacity[2] &&
      staggerState.linkOpacity[2] > staggerState.linkOpacity[3],
      viewport.name + ": links did not reveal sequentially in DOM order: " +
      JSON.stringify(staggerState.linkOpacity));
    assert.ok(staggerState.linkRects.every((rect,index,array) =>
      rect.height >= 44 && (index===0 || rect.top >= array[index-1].bottom-1.5)
    ), viewport.name + ": sequential links lost their consistent vertical row layout");

    if (viewport.width === 1440) {
      await page.screenshot({path:OUT+"/menu-contact-panel-frame-first-mid-1440.png",fullPage:false});
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
          top: element.getBoundingClientRect().top,
          bottom: element.getBoundingClientRect().bottom,
          width: element.getBoundingClientRect().width,
          height: element.getBoundingClientRect().height,
          centerX: element.getBoundingClientRect().left + element.getBoundingClientRect().width / 2,
          viewportCenterX: window.innerWidth / 2,
          buttonRect: document.querySelector("#menu-toggle").getBoundingClientRect().toJSON(),
          buttonCenterX: document.querySelector("#menu-toggle").getBoundingClientRect().left +
            document.querySelector("#menu-toggle").getBoundingClientRect().width / 2,
          contactRect: document.querySelector(".header-action").getBoundingClientRect().toJSON(),
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
      assert.equal(opened.navStyle.position, "absolute",
        viewport.name + ": desktop navigation did not open as a left-side panel");
      assert.equal(opened.navStyle.flexDirection, "column",
        viewport.name + ": desktop left-side panel links are not arranged vertically");
      assert.ok(["auto", "scroll"].includes(opened.navStyle.overflowY),
        viewport.name + ": desktop side panel must retain vertical overflow support");
      assert.notEqual(opened.navStyle.backgroundColor, "rgba(0, 0, 0, 0)",
        viewport.name + ": desktop side panel background is missing");
      assert.equal(opened.navStyle.borderTopWidth, "1px",
        viewport.name + ": desktop side panel border is missing");
      assert.equal(opened.visibleLinks.length, 7,
        viewport.name + ": desktop left-side panel must expose all seven navigation links");
      assert.ok(opened.rect.width >= 300 && opened.rect.width <= 380 &&
        opened.rect.height >= 300,
        viewport.name + ": Contact panel dimensions are not consistent with its full vertical link list");
      assert.ok(Math.abs(opened.rect.left-opened.rect.contactRect.left)<=2,
        viewport.name + ": panel must align with the Contact CTA's left edge: " +
        JSON.stringify({panelLeft:opened.rect.left,contactLeft:opened.rect.contactRect.left}));
      assert.ok(Math.abs(opened.rect.top-(opened.rect.contactRect.bottom+10))<=3,
        viewport.name + ": panel must start 10px below the Contact CTA: " +
        JSON.stringify({panelTop:opened.rect.top,contactBottom:opened.rect.contactRect.bottom}));
      assert.ok(opened.rect.right <= viewport.width - 8,
        viewport.name + ": Contact panel must remain inside the viewport");
      for (let index = 0; index < opened.visibleLinks.length; index++) {
        const link = opened.visibleLinks[index];
        assert.ok(link.rect.height >= 44 && link.rect.width >= opened.rect.width - 20,
          viewport.name + ": dropdown row is too small or too narrow: " + JSON.stringify(link));
        if (index > 0) {
          const previous = opened.visibleLinks[index - 1];
          assert.ok(link.rect.top >= previous.rect.bottom - 1.5,
            viewport.name + ": dropdown links are not stacked in a clean vertical order");
        }
      }
    }

    const menuScrollStyle = await nav.evaluate(element => ({
      overflowY: getComputedStyle(element).overflowY,
      scrollbarWidth: getComputedStyle(element).scrollbarWidth,
      webkitScrollbarDisplay: getComputedStyle(element, "::-webkit-scrollbar").display
    }));
    assert.ok(["auto", "scroll"].includes(menuScrollStyle.overflowY),
      viewport.name + ": expanded dropdown must remain vertically scrollable");
    assert.equal(menuScrollStyle.scrollbarWidth, "none",
      viewport.name + ": visible standards scrollbar was not hidden");
    assert.equal(menuScrollStyle.webkitScrollbarDisplay, "none",
      viewport.name + ": visible WebKit scrollbar was not hidden");
    if (viewport.width <= 920) {
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
      await page.waitForTimeout(240);
      const reverseState = await nav.evaluate(element => {
        const links = Array.from(element.querySelectorAll("a"))
          .filter(link => getComputedStyle(link).display !== "none");
        return {
          first:Number.parseFloat(getComputedStyle(links[0]).opacity),
          last:Number.parseFloat(getComputedStyle(links[links.length-1]).opacity),
          clipPath:getComputedStyle(element).clipPath
        };
      });
      assert.ok(reverseState.first>.95 && reverseState.last<reverseState.first-.1,
        viewport.name + ": closing must reverse the link sequence from last to first: " +
        JSON.stringify(reverseState));
      assert.ok(reverseState.clipPath.includes("inset"),
        viewport.name + ": closing must preserve the rectangular frame animation, never a circular reveal");
      if (viewport.width === 1440) {
        await page.screenshot({path:OUT+"/menu-contact-panel-frame-first-reverse-1440.png",fullPage:false});
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
      contactAnchoredVerified: viewport.width <= 920 ||
        Math.abs(opened.rect.left-opened.rect.contactRect.left)<=2,
      frameFirstVerified: viewport.width <= 920 ||
        (staggerState.frameState==="revealed"&&staggerState.clipPath.includes("inset")),
      sequentialLinksVisible: opened.links.filter(link => link.display !== "none").length,
      closeRestored: true,
      noHorizontalOverflow: true
    });
    await page.close();
    console.log("[PASS] " + viewport.name + ": Contact-anchored frame reveal, sequential links, reverse close and responsive layout");
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

  // Full-perimeter CSS glow: all sides and rounded corners illuminate together.
  const glowPage = await browser.newPage({
    viewport:{width:1440,height:900},
    reducedMotion:"no-preference"
  });
  const glowErrors=[];
  glowPage.on("pageerror",error=>glowErrors.push(error.message));
  const glowResponse=await glowPage.goto(BASE_URL,{waitUntil:"domcontentloaded",timeout:45000});
  assert.ok(glowResponse&&glowResponse.ok(),"Glow desktop page failed to load");

  const glowSelector=".info-card,.option-card,.journey-step,.team-card,.review-card,.expect-card,.reviews-preview,.reviews-criteria,.clinical-note";
  const glowTargetCount=await glowPage.locator(glowSelector).count();
  assert.ok(glowTargetCount>=18,
    "Expected the full-perimeter glow on relevant cards and panels; found "+glowTargetCount);
  assert.equal(await glowPage.locator("canvas.ruwa-orbit-light").count(),0,
    "The obsolete comet canvas must be removed completely");
  assert.equal(await glowPage.locator("svg.ruwa-orbit-geometry").count(),0,
    "The obsolete hidden SVG path geometry must be removed completely");

  const card=glowPage.locator(".info-card").first();
  await card.scrollIntoViewIfNeeded();
  await glowPage.waitForTimeout(420);
  const before=await card.evaluate(element=>({
    width:element.offsetWidth,
    height:element.offsetHeight,
    radius:getComputedStyle(element).borderRadius
  }));
  await card.screenshot({path:OUT+"/perimeter-glow-card-before.png"});
  await card.hover();
  await glowPage.waitForFunction(element=>{
    const style=getComputedStyle(element,"::after");
    return Number.parseFloat(style.opacity)>.45&&style.backgroundImage.includes("linear-gradient");
  },await card.elementHandle(),{timeout:2500});
  await glowPage.waitForTimeout(180);
  await card.screenshot({path:OUT+"/perimeter-glow-card-hover.png"});

  const activeGlow=await card.evaluate(element=>{
    const style=getComputedStyle(element,"::after");
    return {
      opacity:Number.parseFloat(style.opacity),
      backgroundImage:style.backgroundImage,
      borderRadius:style.borderRadius,
      maskComposite:style.maskComposite,
      webkitMaskComposite:style.webkitMaskComposite,
      pointerEvents:style.pointerEvents,
      animationName:style.animationName,
      animationIterationCount:style.animationIterationCount,
      filter:style.filter,
      elementRadius:getComputedStyle(element).borderRadius,
      width:element.offsetWidth,
      height:element.offsetHeight
    };
  });
  assert.ok(activeGlow.opacity>.45,"The complete perimeter glow did not become visible on hover");
  assert.ok(activeGlow.backgroundImage.includes("linear-gradient"),
    "The perimeter must use a continuous gradient, not a traveling point");
  assert.ok(activeGlow.maskComposite==="exclude"||activeGlow.webkitMaskComposite==="xor",
    "The gradient must be masked into a complete border ring");
  assert.equal(activeGlow.borderRadius,activeGlow.elementRadius,
    "The luminous ring must inherit the exact rounded card corners");
  assert.equal(activeGlow.pointerEvents,"none","Glow must not intercept pointer input");
  assert.equal(activeGlow.animationName,"ruwa-full-perimeter-breathe",
    "The whole perimeter must breathe as one stationary light");
  assert.equal(activeGlow.animationIterationCount,"infinite",
    "The perimeter breathing animation must remain active during hover");
  assert.ok(activeGlow.filter.includes("drop-shadow"),
    "The luminous border must include a soft restrained halo");
  assert.equal(activeGlow.width,before.width,"Glow changed the card width");
  assert.equal(activeGlow.height,before.height,"Glow changed the card height");

  await glowPage.mouse.move(8,8);
  await glowPage.waitForTimeout(430);
  const exitedOpacity=await card.evaluate(element=>
    Number.parseFloat(getComputedStyle(element,"::after").opacity)
  );
  assert.ok(exitedOpacity<.05,"Perimeter glow did not fade after pointer exit");

  await card.evaluate(element=>{element.tabIndex=0;element.focus();});
  await glowPage.waitForFunction(element=>
    Number.parseFloat(getComputedStyle(element,"::after").opacity)>.45,
    await card.elementHandle(),{timeout:2000}
  );
  await glowPage.screenshot({path:OUT+"/perimeter-glow-card-keyboard-focus.png"});
  await card.evaluate(element=>{element.blur();element.removeAttribute("tabindex");});

  const teamCard=glowPage.locator(".team-card").first();
  await teamCard.scrollIntoViewIfNeeded();
  await glowPage.waitForTimeout(420);
  await teamCard.hover();
  await glowPage.waitForFunction(element=>
    Number.parseFloat(getComputedStyle(element,"::after").opacity)>.45,
    await teamCard.elementHandle(),{timeout:2000}
  );
  const teamGlow=await teamCard.evaluate(element=>({
    opacity:Number.parseFloat(getComputedStyle(element,"::after").opacity),
    animationName:getComputedStyle(element,"::after").animationName,
    imageScale:getComputedStyle(element.querySelector(".team-card-media img")).scale
  }));
  assert.ok(teamGlow.opacity>.45&&teamGlow.animationName==="ruwa-full-perimeter-breathe",
    "Doctor/team cards did not receive the same complete perimeter glow");
  assert.ok(Number.parseFloat(teamGlow.imageScale)>1.02,
    "Existing doctor image zoom did not remain active");
  await teamCard.screenshot({path:OUT+"/perimeter-glow-doctor-card-hover.png"});
  assert.equal(glowErrors.length,0,"Glow browser errors: "+glowErrors.join(" | "));
  await glowPage.close();
  console.log("[PASS] CSS full-perimeter glow is continuous, rounded, non-traveling, pointer-safe and keyboard-visible");

  // Touch-only devices must not receive a sticky hover effect or animated layer.
  const touchPage=await browser.newPage({
    viewport:{width:430,height:900},
    isMobile:true,
    hasTouch:true,
    reducedMotion:"no-preference"
  });
  await touchPage.goto(BASE_URL,{waitUntil:"domcontentloaded",timeout:45000});
  assert.equal(
    await touchPage.evaluate(()=>matchMedia("(hover:hover) and (pointer:fine)").matches),
    false,
    "Touch viewport unexpectedly advertises a fine hover pointer"
  );
  const touchCard=touchPage.locator(".info-card").first();
  await touchCard.scrollIntoViewIfNeeded();
  await touchCard.tap();
  const touchGlow=await touchCard.evaluate(element=>({
    opacity:Number.parseFloat(getComputedStyle(element,"::after").opacity),
    animationName:getComputedStyle(element,"::after").animationName
  }));
  assert.equal(touchGlow.opacity,0,"Touch tap left a sticky hover glow");
  assert.equal(touchGlow.animationName,"none","Touch-only devices must not animate the hover glow");
  assert.equal(await touchPage.locator("canvas.ruwa-orbit-light,svg.ruwa-orbit-geometry").count(),0,
    "Touch devices must not contain old comet-rendering layers");
  assert.equal(
    await touchPage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),
    true,
    "The glow interaction introduced touch-layout overflow"
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
  const reducedCard=reducedPage.locator(".info-card").first();
  await reducedCard.evaluate(element=>{element.tabIndex=0;element.focus();});
  const reducedGlow=await reducedCard.evaluate(element=>({
    opacity:Number.parseFloat(getComputedStyle(element,"::after").opacity),
    animationName:getComputedStyle(element,"::after").animationName
  }));
  assert.ok(reducedGlow.opacity>=.7,
    "Keyboard focus must retain a visible static outline for reduced-motion users");
  assert.ok(reducedGlow.animationName==="none"||reducedGlow.animationName==="",
    "Reduced-motion preference must disable perimeter breathing");
  assert.equal(await reducedPage.locator("canvas.ruwa-orbit-light,svg.ruwa-orbit-geometry").count(),0,
    "Reduced-motion page must contain no particle rendering layers");
  await reducedPage.close();

  console.log(JSON.stringify({
    result: "passed",
    viewports: viewportResults,
    interactions: [
      "desktop menu opens to the left of the separate hamburger control",
      "all seven side-panel links reveal sequentially in DOM order",
      "reverse stagger close and repeated direction changes",
      "Escape closes and restores focus",
      "native anchor destination remains active",
      "reduced-motion menu is immediate and fully accessible",
      "CSS-only full-perimeter teal/cyan glow breathes evenly without a traveling point or trail",
      "luminous perimeter does not intercept pointer or change card geometry",
      "existing card elevation and image zoom remain active",
      "touch avoids sticky hover glow and reduced motion keeps a static focus border"
    ],
    glowTargetCount,
    screenshots: [
      OUT + "/menu-open-1440.png",
      OUT + "/menu-stagger-mid-1440.png",
      OUT + "/menu-open-390.png",
      OUT + "/perimeter-glow-card-before.png",
      OUT + "/perimeter-glow-card-hover.png",
      OUT + "/perimeter-glow-card-keyboard-focus.png",
      OUT + "/perimeter-glow-doctor-card-hover.png"
    ],
    failures
  }, null, 2));
} catch (error) {
  failures.push(error.message);
  throw error;
} finally {
  await browser.close();
}
