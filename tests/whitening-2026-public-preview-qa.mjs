import assert from "node:assert/strict";
import { chromium } from "playwright";

const previewUrl = process.env.PUBLIC_PREVIEW_URL;
assert.ok(previewUrl, "PUBLIC_PREVIEW_URL must be set to the immutable public preview URL");

const viewports = [
  { name: "laptop-1024", width: 1024, height: 900 },
  { name: "laptop-1280", width: 1280, height: 800 },
  { name: "desktop-1440", width: 1440, height: 900 }
];

const browser = await chromium.launch({ headless: true });
const results = [];

try {
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport });
    // raw.githack shows a one-time anti-phishing confirmation for HTML pages.
    // This HttpOnly cookie is the service-documented automation bypass.
    await context.addCookies([{
      name: "__Http-phish",
      value: "1",
      domain: "rawcdn.githack.com",
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "Lax"
    }]);

    const page = await context.newPage();
    const pageErrors = [];
    const localResourceFailures = [];
    page.on("pageerror", error => pageErrors.push(error.message));
    page.on("response", response => {
      try {
        if (new URL(response.url()).origin === "https://rawcdn.githack.com" && response.status() >= 400) {
          localResourceFailures.push({ status: response.status(), url: response.url() });
        }
      } catch {}
    });

    const response = await page.goto(previewUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
    assert.ok(response && response.ok(), `${viewport.name}: public preview did not return HTTP 2xx`);
    await page.waitForSelector("#hero-title", { state: "visible", timeout: 30000 });
    await page.evaluate(async () => {
      await document.fonts.ready;
      const images = [...document.images].filter(image => image.loading !== "lazy" || image.complete);
      await Promise.all(images.map(image => image.decode().catch(() => {})));
    });

    const initial = await page.evaluate(() => {
      const header = document.querySelector(".site-header");
      const title = document.querySelector("#hero-title");
      const logo = document.querySelector(".brand-mark img");
      const heroPortrait = document.querySelector(".hero-portrait");
      const cta = document.querySelector(".header-action");
      const rect = element => {
        const r = element.getBoundingClientRect();
        return { left:r.left, right:r.right, width:r.width, height:r.height };
      };
      return {
        titleVisible: Boolean(title && title.getBoundingClientRect().height > 0),
        titleText: title?.innerText?.trim() || "",
        bodyTextLength: document.body.innerText.trim().length,
        expectations: (() => {
          const section=document.querySelector("#expectations");
          const grid=section?.querySelector(".expect-grid");
          const cards=[...(section?.querySelectorAll(".expect-card")||[])];
          return {
            cardTitles:cards.map(card=>card.querySelector("h3")?.innerText.trim()||""),
            gridColumnCount:grid?getComputedStyle(grid).gridTemplateColumns.trim().split(/\s+/).length:0,
            horizontalOverflow:Boolean(section&&section.scrollWidth>section.clientWidth)
          };
        })(),
        bodyHeight: document.documentElement.scrollHeight,
        lang: document.documentElement.lang,
        dir: document.documentElement.dir,
        header: rect(header),
        brand: rect(document.querySelector(".brand")),
        nav: rect(document.querySelector("#main-nav")),
        navLabels:[...document.querySelectorAll("#main-nav a")].map(link=>link.innerText.trim()),
        navLinkTypography:[...document.querySelectorAll("#main-nav a")].map(link=>{
          const style=getComputedStyle(link),bounds=link.getBoundingClientRect();
          return {fontFamily:style.fontFamily,fontSize:Number.parseFloat(style.fontSize),
            fontWeight:Number.parseInt(style.fontWeight,10),lineHeight:Number.parseFloat(style.lineHeight),
            color:style.color,whiteSpace:style.whiteSpace,height:bounds.height};
        }),
        cta: rect(cta),
        logoLoaded: Boolean(logo?.complete && logo.naturalWidth > 0),
        heroImageCount: document.querySelectorAll(".hero img").length,
        heroImageLoaded: Boolean(heroPortrait?.complete&&heroPortrait.naturalWidth===768&&heroPortrait.naturalHeight===1152),
        heroImageVisible: Boolean(heroPortrait&&heroPortrait.getBoundingClientRect().width>0&&heroPortrait.getBoundingClientRect().height>0&&getComputedStyle(heroPortrait).visibility==="visible"&&getComputedStyle(heroPortrait).display!=="none"),
        heroImageSource: heroPortrait?.getAttribute("src")||"",
        heroImageWidth: heroPortrait?.naturalWidth||0,
        heroImageHeight: heroPortrait?.naturalHeight||0,
        heroImageTiltDegrees:(()=>{if(!heroPortrait)return 0;const transform=getComputedStyle(heroPortrait).transform;if(transform==="none")return 0;const values=transform.slice(transform.indexOf("(")+1,-1).split(",").map(Number);return values.length===6?Math.atan2(values[1],values[0])*180/Math.PI:0;})(),
        heroImagePreloadPresent: [...document.querySelectorAll('link[rel="preload"][as="image"]')].some(link=>new URL(link.href).pathname.endsWith("/assets/ruwa-hero-90-768.webp")),
        heroMarkupImageReferencePresent: Boolean(document.querySelector(".hero")?.innerHTML.includes("assets/ruwa-hero-90-768.webp")),
        heroImageDisclosurePresent: document.body.innerText.includes("الصورة توضيحية مولّدة بالذكاء الاصطناعي، ولا تمثل طبيبًا حقيقيًا."),
        heroVisualNodeCount: document.querySelectorAll(".photo-frame,.visual-backdrop,.visual-outline,.visual-index,.visual-caption,.visual-side-note,.photo-label").length,
        heroBottomItemCount: document.querySelectorAll(".hero-bottom-item").length,
        heroCopyLayoutValid: (() => {
          const copy=title.closest(".hero-copy"),wrap=document.querySelector(".hero .wrap"),grid=document.querySelector(".hero-grid");
          if(!copy||!wrap||!grid)return false;
          const a=copy.getBoundingClientRect(),b=wrap.getBoundingClientRect(),g=grid.getBoundingClientRect();
          const withinWrap=a.left>=b.left-1&&a.right<=b.right+1;
          const centered=Math.abs((a.left+a.right)/2-(b.left+b.right)/2)<=2;
          const alignedToRightColumn=Math.abs(a.right-g.right)<=2;
          return withinWrap&&(innerWidth<=720?centered:alignedToRightColumn);
        })(),
        horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
        markerSystem: {
          markers:[...document.querySelectorAll(".section-marker")].map(marker=>({
            number:marker.querySelector(".section-marker-number")?.innerText.trim()||"",
            label:marker.querySelector(".section-marker-label")?.innerText.trim()||"",
            context:[...marker.classList].find(name=>name.startsWith("section-marker--"))?.replace("section-marker--","")||"",
            numberWidth:marker.querySelector(".section-marker-number")?.getBoundingClientRect().width||0,
            numberHeight:marker.querySelector(".section-marker-number")?.getBoundingClientRect().height||0,
            numberBorder:getComputedStyle(marker.querySelector(".section-marker-number")).borderTopWidth,
            numberRadius:getComputedStyle(marker.querySelector(".section-marker-number")).borderRadius,
            numberBackground:getComputedStyle(marker.querySelector(".section-marker-number")).backgroundColor,
            numberShadow:getComputedStyle(marker.querySelector(".section-marker-number")).boxShadow,
            separatorWidth:getComputedStyle(marker.querySelector(".section-marker-divider")).width,
            separatorHeight:getComputedStyle(marker.querySelector(".section-marker-divider")).height
          })),
          benefit:(()=>{
            const element=document.querySelector(".hero-title-benefit");
            if(!element)return null;
            const style=getComputedStyle(element);
            return {
              text:element.innerText.replace(/\s+/g," ").trim(),
              color:style.color,
              textDecorationLine:style.textDecorationLine,
              accentElements:element.querySelectorAll(".accent").length,
              underlineElements:element.querySelectorAll(".accent-underline,svg").length
            };
          })()
        },
        progress: Number.parseFloat(getComputedStyle(header).getPropertyValue("--header-progress")),
        panel: (() => {
          const s = getComputedStyle(header, "::before");
          return { left:parseFloat(s.left), right:parseFloat(s.right) };
        })(),
        frameLeftPadding: cta.getBoundingClientRect().left -
          (header.getBoundingClientRect().left + parseFloat(getComputedStyle(header,"::before").left)),
        frameRightPadding: (header.getBoundingClientRect().right -
          parseFloat(getComputedStyle(header,"::before").right)) -
          document.querySelector(".brand").getBoundingClientRect().right
      };
    });

    assert.equal(initial.lang, "ar-SA", `${viewport.name}: Arabic document language is missing`);
    assert.equal(initial.dir, "rtl", `${viewport.name}: RTL direction is missing`);
    assert.ok(initial.titleVisible && initial.titleText.length > 5, `${viewport.name}: RUWA hero content is not rendered`);
    assert.ok(initial.bodyTextLength > 300, `${viewport.name}: document body appears blank`);
    assert.ok(initial.bodyHeight > viewport.height * 2, `${viewport.name}: full landing page did not load`);
    assert.ok(initial.logoLoaded, `${viewport.name}: local RUWA logo failed to load`);
    assert.equal(initial.heroImageCount, 1, `${viewport.name}: approved Hero dentist portrait is missing`);
    assert.equal(initial.heroImageLoaded, true, `${viewport.name}: approved local Hero portrait did not load at its intrinsic size`);
    assert.equal(initial.heroImageVisible, true, `${viewport.name}: Hero portrait is not visibly rendered`);
    assert.equal(initial.heroImageSource, "assets/ruwa-hero-90-768.webp", `${viewport.name}: wrong Hero portrait asset`);
    assert.equal(initial.heroImageWidth, 768, `${viewport.name}: portrait intrinsic width is incorrect`);
    assert.equal(initial.heroImageHeight, 1152, `${viewport.name}: portrait intrinsic height is incorrect`);
    assert.ok(initial.heroImageTiltDegrees >= 0.2 && initial.heroImageTiltDegrees <= 1.1, `${viewport.name}: dentist portrait must lean slightly toward the Hero copy`);
    assert.equal(initial.heroImagePreloadPresent, true, `${viewport.name}: Hero portrait preload is missing`);
    assert.equal(initial.heroMarkupImageReferencePresent, true, `${viewport.name}: Hero does not use the approved local portrait`);
    assert.equal(initial.heroImageDisclosurePresent, true, `${viewport.name}: AI-generated portrait disclosure is missing`);
    assert.equal(initial.heroVisualNodeCount, 0, `${viewport.name}: image frame/decorative elements remain`);
    assert.equal(initial.heroBottomItemCount, 3, `${viewport.name}: approved Hero principles are missing`);
    assert.equal(initial.heroCopyLayoutValid, true, `${viewport.name}: Hero copy is outside its approved responsive content column`);
    assert.equal(initial.horizontalOverflow, false, `${viewport.name}: horizontal overflow detected`);

    assert.deepEqual(initial.expectations.cardTitles,["النتائج تختلف من شخص لآخر","قد تحدث حساسية أو تهيّج مؤقت","الحشوات والتيجان والقشور لا تتبيّض","العناية بعد التبييض"],"Published expectations cards are incomplete or out of order");
    assert.equal(initial.expectations.gridColumnCount,2,"Desktop expectations must use two balanced columns");
    assert.equal(initial.expectations.horizontalOverflow,false,"Published expectations section must not overflow horizontally");
    assert.deepEqual(initial.markerSystem.markers.map(({number,label,context})=>({number,label,context})),[
      {number:"01",label:"دليل الابتسامة",context:"hero"},
      {number:"02",label:"خطوات التقييم",context:"paper"},
      {number:"03",label:"أسباب تغيّر اللون",context:"paper"},
      {number:"04",label:"الخيارات المتاحة",context:"canvas"},
      {number:"05",label:"رحلة التبييض",context:"canvas"},
      {number:"06",label:"قبل اتخاذ القرار",context:"paper"},
      {number:"07",label:"توقعات واقعية",context:"dark"},
      {number:"08",label:"الفريق الطبي",context:"paper"},
      {number:"09",label:"آراء المرضى",context:"canvas"},
      {number:"10",label:"إجابات واضحة",context:"canvas"}
    ], `${viewport.name}: immutable preview does not render the complete approved seven-marker system`);
    assert.ok(initial.markerSystem.markers.every(marker=>marker.numberWidth>=10&&marker.numberWidth<=22&&
      marker.numberHeight>=12&&marker.numberHeight<=18&&marker.numberBorder==="0px"&&
      marker.numberRadius==="0px"&&marker.numberBackground==="rgba(0, 0, 0, 0)"&&
      marker.numberShadow==="none"&&marker.separatorWidth==="2px"&&
      Number.parseFloat(marker.separatorHeight)>=14.2&&Number.parseFloat(marker.separatorHeight)<=14.6&&
      Math.abs(Number.parseFloat(marker.separatorHeight)-marker.numberHeight)<=.2),
      `${viewport.name}: published marker numbers must remain plain text and each separator must match the number height`);
    assert.ok(initial.markerSystem.benefit&&
      initial.markerSystem.benefit.text==="لابتسامة أكثر إشراقًا"&&
      initial.markerSystem.benefit.color==="rgb(24, 122, 128)"&&
      initial.markerSystem.benefit.textDecorationLine==="none"&&
      initial.markerSystem.benefit.accentElements===0&&
      initial.markerSystem.benefit.underlineElements===0,
      `${viewport.name}: published Hero benefit line does not use the complete, unadorned RUWA Teal treatment`);
    assert.deepEqual(initial.navLabels,
      ["خطوات التقييم","أسباب تغيّر اللون","خيارات التبييض","رحلة التبييض","هل يناسبك؟","آراء المرضى","الأسئلة الشائعة"],
      `${viewport.name}: the six navigation labels or their order changed`);
    assert.ok(initial.navLinkTypography.every(link=>
      link.fontFamily.includes("IBM Plex Sans Arabic")&&link.fontSize===14&&
      link.fontWeight===600&&Math.abs(link.lineHeight-22.4)<.2&&
      link.color==="rgb(48, 74, 84)"&&link.whiteSpace==="nowrap"&&link.height>=36
    ), `${viewport.name}: public navigation typography does not match the approved specification: ${JSON.stringify(initial.navLinkTypography)}`);

    await page.evaluate(() => window.scrollTo({ top: 600, behavior: "instant" }));
    await page.waitForFunction(() => {
      const header=document.querySelector(".site-header");
      return header&&Number.parseFloat(getComputedStyle(header).getPropertyValue("--header-progress"))>=.999;
    }, null, { timeout: 15000 });
    await page.waitForTimeout(420);
    const compact = await page.evaluate(() => {
      const header = document.querySelector(".site-header");
      const rect = element => {
        const r = element.getBoundingClientRect();
        return { left:r.left, right:r.right, width:r.width, centerX:r.left+r.width/2 };
      };
      const panel = getComputedStyle(header, "::before");
      const nav = rect(document.querySelector("#main-nav"));
      return {
        progress: Number.parseFloat(getComputedStyle(header).getPropertyValue("--header-progress")),
        header: rect(header),
        brand: rect(document.querySelector(".brand")),
        nav,
        cta: rect(document.querySelector(".header-action")),
        navLinkSizes:[...document.querySelectorAll("#main-nav a")].map(link=>Number.parseFloat(getComputedStyle(link).fontSize)),
        headerLeft: header.getBoundingClientRect().left,
        headerRight: header.getBoundingClientRect().right,
        panelLeft: parseFloat(panel.left),
        panelRight: parseFloat(panel.right),
        panelWidth: header.getBoundingClientRect().width - parseFloat(panel.left) - parseFloat(panel.right),
        frameLeftPadding: rect(document.querySelector(".header-action")).left -
          (header.getBoundingClientRect().left + parseFloat(panel.left)),
        frameRightPadding: (header.getBoundingClientRect().right - parseFloat(panel.right)) -
          rect(document.querySelector(".brand")).right
      };
    });

    assert.equal(compact.progress, 1, `${viewport.name}: shared header progress did not reach compact state`);
    assert.ok(compact.navLinkSizes.length===7&&compact.navLinkSizes.every(size=>size===14),
      `${viewport.name}: navigation typography changed unexpectedly in the compact header`);
    assert.ok(compact.panelLeft > initial.panel.left && compact.panelRight > initial.panel.right,
      `${viewport.name}: both public preview frame edges did not move inward`);
    assert.ok(compact.panelWidth < initial.header.width - initial.panel.left - initial.panel.right,
      `${viewport.name}: public preview frame did not become narrower`);
    const frameLeftTravel=compact.panelLeft-initial.panel.left;
    const frameRightTravel=compact.panelRight-initial.panel.right;
    const whatsappLeftTravel=compact.cta.left-initial.cta.left;
    const brandRightTravel=initial.brand.right-compact.brand.right;
    assert.ok(Math.abs(frameLeftTravel-whatsappLeftTravel)<=1.5,
      `${viewport.name}: public glass-frame left edge differs from WhatsApp edge travel by more than 1.5px`);
    assert.ok(Math.abs(frameRightTravel-brandRightTravel)<=1.5,
      `${viewport.name}: public glass-frame right edge differs from brand edge travel by more than 1.5px`);
    assert.ok(Math.abs(compact.frameLeftPadding-initial.frameLeftPadding)<=1.5,
      `${viewport.name}: public preview frame-to-WhatsApp padding drifted`);
    assert.ok(Math.abs(compact.frameRightPadding-initial.frameRightPadding)<=1.5,
      `${viewport.name}: public preview frame-to-brand padding drifted`);
    assert.ok(compact.brand.centerX < initial.brand.left + initial.brand.width/2,
      `${viewport.name}: brand did not converge toward centered navigation`);
    assert.ok(compact.cta.centerX > initial.cta.left + initial.cta.width/2,
      `${viewport.name}: WhatsApp CTA did not converge toward centered navigation`);
    assert.ok(Math.abs(compact.nav.centerX - (initial.header.left + initial.header.width/2)) <= 1,
      `${viewport.name}: centered navigation drifted`);
    assert.equal(pageErrors.length, 0, `${viewport.name}: JavaScript runtime errors: ${pageErrors.join(" | ")}`);
    assert.equal(localResourceFailures.length, 0, `${viewport.name}: local CDN resources failed: ${JSON.stringify(localResourceFailures)}`);

    results.push({
      ...viewport,
      httpStatus: response.status(),
      title: await page.title(),
      bodyTextLength: initial.bodyTextLength,
      pageHeight: initial.bodyHeight,
      logoLoaded: initial.logoLoaded,
      heroImageCount: initial.heroImageCount,
      heroVisualNodeCount: initial.heroVisualNodeCount,
      initialFrameWidth: Number((initial.header.width-initial.panel.left-initial.panel.right).toFixed(2)),
      compactFrameWidth: Number(compact.panelWidth.toFixed(2)),
      leftInsetPx: Number(compact.panelLeft.toFixed(2)),
      rightInsetPx: Number(compact.panelRight.toFixed(2)),
      jsErrors: pageErrors.length,
      localResourceFailures: localResourceFailures.length
    });

    console.log(`[PASS] ${viewport.name}: public URL rendered complete RUWA page; assets, RTL and synchronized header passed.`);
    await context.close();
  }
} finally {
  await browser.close();
}

console.log(JSON.stringify({ previewUrl, results }, null, 2));
