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
    assert.equal(mode, "gsap-premium",
      viewport.name + ": expected the premium unified panel reveal");

    await page.waitForTimeout(150);
    const frameOpening = await nav.evaluate(element => {
      const style=getComputedStyle(element);
      const matrix=style.transform==="none"?null:new DOMMatrixReadOnly(style.transform);
      return {
        frameState:element.dataset.ruwaMenuFrameState,
        opacity:Number.parseFloat(style.opacity),
        filter:style.filter,
        transform:style.transform,
        scaleX:matrix?Math.hypot(matrix.a,matrix.b):1,
        scaleY:matrix?Math.hypot(matrix.c,matrix.d):1,
        rotationDeg:matrix?Math.atan2(matrix.b,matrix.a)*180/Math.PI:0,
        translateX:matrix?matrix.e:0,
        translateY:matrix?matrix.f:0,
        motionStyle:element.dataset.ruwaPanelMotionStyle,
        shadow:style.boxShadow,
        linkOpacity:Array.from(element.querySelectorAll("a"))
          .filter(link=>getComputedStyle(link).display!=="none")
          .map(link=>Number.parseFloat(getComputedStyle(link).opacity))
      };
    });
    assert.ok(["soft-reveal","revealed"].includes(frameOpening.frameState),
      viewport.name + ": menu should use the new unified soft-reveal transition");
    assert.ok(frameOpening.opacity>.1&&frameOpening.opacity<1,
      viewport.name + ": panel should visibly fade in rather than appear abruptly");
    assert.notEqual(frameOpening.transform,"none",
      viewport.name + ": the frame should make a small, smooth settling movement");
    assert.equal(frameOpening.filter,"none",
      viewport.name + ": the new frame reveal must stay optically crisp without blur");
    assert.equal(frameOpening.motionStyle,"subtle-spiral",
      viewport.name + ": the panel must use the new restrained spiral-style frame entrance");
    assert.ok(Math.abs(frameOpening.rotationDeg)>.12&&Math.abs(frameOpening.rotationDeg)<2.4,
      viewport.name + ": the frame's spiral turn must be subtle and visibly measurable: "+frameOpening.rotationDeg);
    assert.ok(Math.abs(frameOpening.translateX)<=9&&Math.abs(frameOpening.translateY)<=9,
      viewport.name + ": the spiral arc must stay within a very small diagonal movement");
    assert.ok(frameOpening.scaleX>.985&&frameOpening.scaleX<1.002&&
      frameOpening.scaleY>.985&&frameOpening.scaleY<1.002,
      viewport.name + ": the spiral frame scale must remain almost imperceptible");
    assert.ok(frameOpening.shadow!=="none",
      viewport.name + ": the menu's layered shadow must remain attached to its frame");
    assert.ok(frameOpening.linkOpacity[0]>.05&&frameOpening.linkOpacity[6]<.05,
      viewport.name + ": links should arrive after the frame begins, in a gentle stagger");

    await page.waitForTimeout(100);
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
        filter:style.filter,
        transform:style.transform,
        position: style.position,
        flexDirection: style.flexDirection,
        panelOpacity: Number.parseFloat(style.opacity),
        panelRect:panelRect.toJSON(),
        panelShadow:style.boxShadow,
        linkStagger:Number(element.dataset.ruwaLinkStagger||0),
        linkDuration:Number(element.dataset.ruwaLinkDuration||0),
        panelRevealDuration:Number(element.dataset.ruwaPanelRevealDuration||0),
        contactRect:contactRect.toJSON(),
        belowContact:panelRect.top>=contactRect.bottom+8,
        panelCenterX:panelRect.left+panelRect.width/2,
        contactCenterX:contactRect.left+contactRect.width/2,
        centeredAndNudgedLeft:Math.abs((contactRect.left+contactRect.width/2)-
          (panelRect.left+panelRect.width/2)-14)<=2,
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
      assert.ok(["soft-reveal","revealed"].includes(staggerState.frameState),
        viewport.name + ": the menu must preserve its elegant soft-reveal state while links arrive");
      assert.equal(staggerState.clipPath,"none",
        viewport.name + ": the full rectangular frame must remain intact during the reveal");
      assert.equal(staggerState.belowContact,true,
        viewport.name + ": animated panel must appear below the Contact CTA");
      assert.equal(staggerState.centeredAndNudgedLeft,true,
        viewport.name + ": panel must be centered below Contact with a slight 14px left offset");
    }
    assert.equal(staggerState.flexDirection, "column",
      viewport.name + ": dropdown links must be vertically aligned");
    assert.ok(staggerState.panelOpacity > .8,
      viewport.name + ": dropdown panel did not fade into place");
    assert.ok(staggerState.panelShadow!=="none"&&(staggerState.panelShadow.match(/rgba?\(/g)||[]).length>=3,
      viewport.name + ": the panel opened by the round hamburger must have a layered shadow behind its frame: "+staggerState.panelShadow);
    assert.ok(staggerState.linkStagger>=.059&&staggerState.linkStagger<=.061,
      viewport.name + ": navigation links must use the refined, perceptible stagger on every device");
    assert.ok(staggerState.linkDuration>=.155&&staggerState.linkDuration<=.165,
      viewport.name + ": navigation links must retain the refined short fade duration");
    if(viewport.width>920){
      assert.ok(staggerState.panelRevealDuration>=.65&&staggerState.panelRevealDuration<=.67,
        viewport.name + ": the hamburger panel soft reveal should use its refined duration");
      if(viewport.width>=1366){
        assert.ok(staggerState.panelRect.width>=332&&staggerState.panelRect.width<=337,
          viewport.name + ": hamburger link panel should be slightly wider than its former 320px width: "+staggerState.panelRect.width);
      }
    }else{
      assert.ok(staggerState.panelRevealDuration>=.50&&staggerState.panelRevealDuration<=.52,
        viewport.name + ": mobile/tablet hamburger panel should open slightly faster");
    }
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
        viewport.name + ": desktop Contact panel lost its independent positioning");
      assert.equal(opened.navStyle.flexDirection, "column",
        viewport.name + ": Contact panel links are not arranged vertically");
      assert.ok(["auto", "scroll"].includes(opened.navStyle.overflowY),
        viewport.name + ": desktop side panel must retain vertical overflow support");
      assert.notEqual(opened.navStyle.backgroundColor, "rgba(0, 0, 0, 0)",
        viewport.name + ": desktop side panel background is missing");
      assert.equal(opened.navStyle.borderTopWidth, "1px",
        viewport.name + ": desktop side panel border is missing");
      assert.equal(opened.visibleLinks.length, 7,
        viewport.name + ": desktop left-side panel must expose all seven navigation links");
      assert.ok(opened.rect.width >= 200 && opened.rect.width <= 340 &&
        opened.rect.height >= 300,
        viewport.name + ": Contact panel dimensions are not consistent with its full vertical link list");
      const contactCenterX=opened.rect.contactRect.left+opened.rect.contactRect.width/2;
      const panelCenterX=opened.rect.left+opened.rect.width/2;
      assert.ok(Math.abs((contactCenterX-panelCenterX)-14)<=2,
        viewport.name + ": panel must sit centered beneath Contact with a slight 14px left shift: " +
        JSON.stringify({panelCenterX,contactCenterX,offset:contactCenterX-panelCenterX}));
      assert.ok(Math.abs(opened.rect.top-(opened.rect.header.bottom+12))<=3,
        viewport.name + ": panel must begin 12px below the header edge: " +
        JSON.stringify({panelTop:opened.rect.top,headerBottom:opened.rect.header.bottom}));
      assert.ok(opened.rect.buttonRect.left-opened.rect.right>=24,
        viewport.name + ": Contact panel is too close to the separate hamburger circle: " +
        JSON.stringify({panelRight:opened.rect.right,hamburgerLeft:opened.rect.buttonRect.left}));
      assert.ok(opened.rect.right <= viewport.width - 8,
        viewport.name + ": Contact panel must remain inside the viewport");
      for (let index = 0; index < opened.visibleLinks.length; index++) {
        const link = opened.visibleLinks[index];
        assert.ok(link.rect.height >= 44 && link.rect.width >= opened.rect.width - 24,
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
      await page.waitForFunction(
        () => document.querySelector("#main-nav")?.dataset.ruwaMenuFrameState === "soft-exit",
        null,
        { timeout: 2000 }
      );
      await page.waitForTimeout(140);
      const exitState=await nav.evaluate(element=>{
        const style=getComputedStyle(element);
        const matrix=style.transform==="none"?null:new DOMMatrixReadOnly(style.transform);
        const links=Array.from(element.querySelectorAll("a"))
          .filter(link=>getComputedStyle(link).display!=="none");
        return {
          frameState:element.dataset.ruwaMenuFrameState,
          exitMotion:element.dataset.ruwaMenuExitMotion,
          opacity:Number.parseFloat(style.opacity),
          filter:style.filter,
          transform:style.transform,
          scaleX:matrix?matrix.a:1,
          scaleY:matrix?matrix.d:1,
          clipPath:style.clipPath,
          shadow:style.boxShadow,
          first:Number.parseFloat(getComputedStyle(links[0]).opacity),
          last:Number.parseFloat(getComputedStyle(links[links.length-1]).opacity)
        };
      });
      assert.equal(exitState.exitMotion,"soft-lift-fade",
        viewport.name + ": closing must use the new dedicated soft-lift exit, not reverse the opening");
      assert.ok(exitState.opacity>0&&exitState.opacity<1&&exitState.filter==="none",
        viewport.name + ": the entire menu frame should fade smoothly while staying crisp");
      assert.ok(Math.abs(exitState.scaleX-1)<.002&&Math.abs(exitState.scaleY-1)<.002,
        viewport.name + ": the closing frame must not scale or contract");
      assert.notEqual(exitState.transform,"none",
        viewport.name + ": the closing panel should make a small upward exit movement");
      assert.equal(exitState.clipPath,"none",
        viewport.name + ": the menu frame must remain whole during its exit");
      assert.ok(exitState.shadow!=="none",
        viewport.name + ": the panel shadow should travel and fade with its frame");
      assert.ok(exitState.last<exitState.first,
        viewport.name + ": navigation text should dissolve in reverse order before the panel finishes");
      if (viewport.width === 1440) {
        await page.screenshot({path:OUT+"/menu-premium-soft-lift-exit-1440.png",fullPage:false});
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
      premiumRevealVerified: frameOpening.frameState==="soft-reveal"&&
        frameOpening.shadow!=="none"&&staggerState.clipPath==="none",
      sequentialLinksVisible: opened.links.filter(link => link.display !== "none").length,
      closeRestored: true,
      noHorizontalOverflow: true
    });
    await page.close();
    console.log("[PASS] " + viewport.name + ": premium whole-panel reveal, sequential links, soft-lift exit and responsive layout");
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
    "Selecting a menu destination must restore focus to the menu button while the panel softly exits"
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
  console.log("[PASS] Escape focus restoration, native anchor close, dedicated soft-lift exit and rapid reopen");

  // Verify complete removal of the rotating perimeter-light system while preserving cards and doctor imagery.
  const cleanPage=await browser.newPage({
    viewport:{width:1440,height:900},
    reducedMotion:"no-preference"
  });
  const cleanErrors=[];
  cleanPage.on("pageerror",error=>cleanErrors.push(error.message));
  const cleanResponse=await cleanPage.goto(BASE_URL,{waitUntil:"domcontentloaded",timeout:45000});
  assert.ok(cleanResponse&&cleanResponse.ok(),"Clean-cards desktop page failed to load");
  await cleanPage.evaluate(()=>document.fonts.ready);

  const cleanSelector=".info-card,.option-card,.journey-step,.team-card,.review-card,.expect-card,.reviews-preview,.reviews-criteria,.clinical-note";
  const glowAudit=await cleanPage.evaluate(selector=>{
    const cssText=Array.from(document.querySelectorAll("style"))
      .map(style=>style.textContent||"").join("\\n");
    const targets=Array.from(document.querySelectorAll(selector));
    const targetPseudoStates=targets.map(element=>{
      const after=getComputedStyle(element,"::after");
      const before=getComputedStyle(element,"::before");
      return {
        afterBackground:after.backgroundImage,
        afterAnimation:after.animationName,
        beforeBackground:before.backgroundImage,
        beforeAnimation:before.animationName
      };
    });
    const doctorImages=Array.from(document.querySelectorAll(".team-card-media img"));
    return {
      cssText,
      targetCount:targets.length,
      targetPseudoStates,
      doctorImageCount:doctorImages.length,
      doctorImages:doctorImages.map(image=>({
        complete:image.complete,
        naturalWidth:image.naturalWidth,
        naturalHeight:image.naturalHeight,
        src:image.currentSrc||image.src,
        framePresent:Boolean(image.closest(".team-card-media"))
      })),
      oldCanvasCount:document.querySelectorAll("canvas.ruwa-orbit-light").length,
      oldSvgCount:document.querySelectorAll("svg.ruwa-orbit-geometry").length,
      teamCardCount:document.querySelectorAll(".team-card").length
    };
  },cleanSelector);
  const glowTargetCount=glowAudit.targetCount;
  assert.ok(glowTargetCount>=18,
    "Expected the existing content cards and panels to remain present; found "+glowTargetCount);
  assert.equal(/ruwa-perimeter|perimeter-orbit|perimeter-breathe|--ruwa-perimeter-angle|conic-gradient\s*\(/i.test(glowAudit.cssText),false,
    "The page stylesheet still contains perimeter-light CSS, keyframes or conic-gradient code");
  assert.equal(/ruwa-orbit-light|ruwa-orbit-geometry/i.test(glowAudit.cssText),false,
    "Obsolete orbit-rendering code remains in the page stylesheet");
  assert.ok(glowAudit.targetPseudoStates.every(state=>
    !/conic-gradient/i.test(state.afterBackground+" "+state.beforeBackground)&&
    !/ruwa-perimeter|perimeter-orbit|perimeter-breathe/i.test(state.afterAnimation+" "+state.beforeAnimation)
  ),"A targeted card or panel still has an animated perimeter overlay");
  assert.equal(glowAudit.oldCanvasCount,0,"The obsolete orbit canvas must remain absent");
  assert.equal(glowAudit.oldSvgCount,0,"The obsolete orbit SVG geometry must remain absent");
  assert.ok(glowAudit.teamCardCount>=3,"Doctor profile cards were removed unexpectedly");
  assert.ok(glowAudit.doctorImageCount>=3,"Doctor photographs or their image frames were removed unexpectedly");

  const doctorSection=cleanPage.locator(".team-card").first();
  await doctorSection.scrollIntoViewIfNeeded();
  await cleanPage.waitForFunction(()=>{
    const images=Array.from(document.querySelectorAll(".team-card-media img"));
    return images.length>=3&&images.every(image=>image.complete&&image.naturalWidth>0);
  },null,{timeout:8000});
  const doctorImagesAfterLoad=await cleanPage.locator(".team-card-media img").evaluateAll(images=>
    images.map(image=>({
      width:image.naturalWidth,
      height:image.naturalHeight,
      frame: Boolean(image.closest(".team-card-media"))
    }))
  );
  assert.ok(doctorImagesAfterLoad.every(image=>image.width>0&&image.height>0&&image.frame),
    "Doctor portrait assets or their existing image frames are not intact");

  const card=cleanPage.locator(".info-card").first();
  await card.scrollIntoViewIfNeeded();
  await cleanPage.waitForTimeout(180);
  const cardBefore=await card.evaluate(element=>{
    const style=getComputedStyle(element);
    const rect=element.getBoundingClientRect();
    return {
      width:rect.width,
      height:rect.height,
      borderWidth:style.borderTopWidth,
      borderStyle:style.borderTopStyle,
      borderColor:style.borderTopColor,
      radius:style.borderRadius
    };
  });
  await card.screenshot({path:OUT+"/cards-without-perimeter-glow-1440.png"});
  await card.hover();
  await cleanPage.waitForTimeout(420);
  const cardAfter=await card.evaluate(element=>{
    const style=getComputedStyle(element);
    const rect=element.getBoundingClientRect();
    const after=getComputedStyle(element,"::after");
    return {
      width:rect.width,
      height:rect.height,
      borderWidth:style.borderTopWidth,
      borderStyle:style.borderTopStyle,
      borderColor:style.borderTopColor,
      radius:style.borderRadius,
      afterBackground:after.backgroundImage,
      afterAnimation:after.animationName
    };
  });
  assert.equal(cardAfter.width,cardBefore.width,"Removing glow changed the original card width");
  assert.equal(cardAfter.height,cardBefore.height,"Removing glow changed the original card height");
  assert.equal(cardAfter.borderWidth,cardBefore.borderWidth,"The card's original static border width changed");
  assert.equal(cardAfter.borderStyle,cardBefore.borderStyle,"The card's original static border style changed");
  assert.equal(cardAfter.radius,cardBefore.radius,"The card's original border radius changed");
  assert.equal(/conic-gradient/i.test(cardAfter.afterBackground),false,"Card hover still creates a luminous gradient border");
  assert.equal(/ruwa-perimeter|perimeter-orbit|perimeter-breathe/i.test(cardAfter.afterAnimation),false,
    "Card hover still starts a perimeter-light animation");

  await doctorSection.hover();
  const doctorCardHandle=await doctorSection.elementHandle();
  await cleanPage.waitForFunction(element=>
    Number.parseFloat(getComputedStyle(element.querySelector(".team-card-media img")).scale)>1.02,
    doctorCardHandle,{timeout:2500}
  );
  const doctorHover=await doctorSection.evaluate(element=>{
    const image=element.querySelector(".team-card-media img");
    const after=getComputedStyle(element,"::after");
    return {
      imageScale:getComputedStyle(image).scale,
      imageWidth:image.naturalWidth,
      frameExists:Boolean(image.closest(".team-card-media")),
      afterBackground:after.backgroundImage,
      afterAnimation:after.animationName
    };
  });
  assert.ok(Number.parseFloat(doctorHover.imageScale)>1.02,
    "The existing subtle doctor-image zoom interaction was removed");
  assert.ok(doctorHover.imageWidth>0&&doctorHover.frameExists,
    "The original doctor portrait or its frame is missing");
  assert.equal(/conic-gradient/i.test(doctorHover.afterBackground),false,
    "Doctor-card hover still creates a luminous gradient border");
  assert.equal(/ruwa-perimeter|perimeter-orbit|perimeter-breathe/i.test(doctorHover.afterAnimation),false,
    "Doctor-card hover still starts a perimeter-light animation");
  await doctorSection.screenshot({path:OUT+"/doctor-card-hover-without-glow-1440.png"});
  assert.equal(cleanErrors.length,0,"Clean-cards browser errors: "+cleanErrors.join(" | "));
  await cleanPage.close();



  console.log(JSON.stringify({
    result: "passed",
    viewports: viewportResults,
    interactions: [
      "desktop menu opens below Contact with a premium unified soft reveal",
      "all seven side-panel links reveal sequentially in DOM order",
      "reverse stagger text exit, soft-lift panel fade and rapid reopen support",
      "Escape closes and restores focus",
      "native anchor destination remains active",
      "reduced-motion menu is immediate and fully accessible",
      "all rotating perimeter-light CSS, conic gradients and glow keyframes are completely absent",
      "cards retain their original dimensions, border structure and radii while normal hover styling remains active",
      "doctor photographs and image frames remain intact",
      "the existing subtle doctor-image zoom remains active without any perimeter glow"
    ],
    glowTargetCount,
    screenshots: [
      OUT + "/menu-open-1440.png",
      OUT + "/menu-stagger-mid-1440.png",
      OUT + "/menu-open-390.png",
      OUT + "/cards-without-perimeter-glow-1440.png",
      OUT + "/doctor-card-hover-without-glow-1440.png"
    ],
    failures
  }, null, 2));
} catch (error) {
  failures.push(error.message);
  throw error;
} finally {
  await browser.close();
}
