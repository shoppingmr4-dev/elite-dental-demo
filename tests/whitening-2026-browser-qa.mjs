import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:4173/whitening-2026.html";
const OUT = "artifacts/whitening-2026";
await mkdir(OUT, { recursive: true });

const viewports = [
  { name: "mobile-360", width: 360, height: 800, mobile: true },
  { name: "mobile-390", width: 390, height: 844, mobile: true },
  { name: "tablet-768", width: 768, height: 1024, mobile: false },
  { name: "laptop-1024", width: 1024, height: 900, mobile: false },
  { name: "desktop-1440", width: 1440, height: 900, mobile: false }
];

const expectedHeading = "اكتشف خيارات تبييض الأسنان لابتسامة أكثر إشراقًا";
const failures = [];
const results = [];
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });

try {
  for (const vp of viewports) {
    const page = await browser.newPage({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
      reducedMotion: "reduce"
    });
    const pageErrors = [];
    const localErrors = [];
    page.on("pageerror", error => pageErrors.push(error.message));
    page.on("response", response => {
      if (response.url().startsWith(new URL(BASE_URL).origin) && response.status() >= 400) {
        localErrors.push({ status: response.status(), url: response.url() });
      }
    });

    const response = await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 45000 });
    assert.ok(response?.ok(), `${vp.name}: page did not return a successful response`);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(200);

    const state = await page.evaluate(async () => {
      const heading = document.querySelector("#hero-title");
      const copy = document.querySelector(".hero-copy");
      const visual = document.querySelector(".hero-visual");
      const image = document.querySelector(".photo-frame img");
      const nav = document.querySelector("#main-nav");
      const toggle = document.querySelector("#menu-toggle");
      await document.fonts.load('800 48px "Cairo"', "التبييض");
      await document.fonts.load('400 16px "IBM Plex Sans Arabic"', "رعاية الأسنان");
      await document.fonts.load('italic 500 31px "Cormorant Garamond"', "Ruwa");
      const rect = el => {
        const r = el.getBoundingClientRect();
        return { left:r.left, right:r.right, top:r.top, bottom:r.bottom, width:r.width, height:r.height };
      };
      const brandImage=document.querySelector(".brand-mark img");
      await brandImage.decode();
      const logoCanvas=document.createElement("canvas");
      logoCanvas.width=brandImage.naturalWidth;logoCanvas.height=brandImage.naturalHeight;
      const logoContext=logoCanvas.getContext("2d",{willReadFrequently:true});
      logoContext.drawImage(brandImage,0,0);
      const logoPixel=(x,y)=>Array.from(logoContext.getImageData(x,y,1,1).data);
      const logoCornerPixel=logoPixel(1,1);
      const logoNavyPixel=logoPixel(28,18);
      const logoSmilePixel=logoPixel(58,88);
      const logoReferenceMatch=brandImage.naturalWidth===162 &&
        brandImage.naturalHeight===140 &&
        brandImage.currentSrc.endsWith("/assets/ruwa-mark.png");

      return {
        lang:document.documentElement.lang,
        announcementText:document.querySelector(".announcement")?.innerText?.trim() || "",
        headerPosition:getComputedStyle(document.querySelector(".site-header")).position,
        headerRect:rect(document.querySelector(".site-header")),
        headerInnerRect:rect(document.querySelector(".header-inner")),
        heroWrapRect:rect(document.querySelector(".hero .wrap")),
        headerPanelRadius:getComputedStyle(document.querySelector(".site-header"),"::before").borderTopLeftRadius,
        headerPanelTopInset:Number.parseFloat(getComputedStyle(document.querySelector(".site-header"),"::before").top),
        headerCompactInitially:document.querySelector(".site-header")?.classList.contains("is-compact") || false,
        headerActionHeight:rect(document.querySelector(".header-action")).height,
        headerActionText:document.querySelector(".header-action")?.innerText?.trim() || "",
        headerActionHref:document.querySelector(".header-action")?.getAttribute("href") || "",
        headerActionTag:document.querySelector(".header-action")?.tagName || "",
        headerActionHasChatIcon:Boolean(document.querySelector(".header-action svg")),
        headerActionWhatsAppIcon:Boolean(document.querySelector(".header-action .whatsapp-brand-icon")),
        contactTriggerCount:document.querySelectorAll("[data-open-whatsapp-demo]").length,
        demoDialogTag:document.querySelector("#whatsapp-demo-dialog")?.tagName || "",
        demoDialogText:document.querySelector("#whatsapp-demo-dialog")?.innerText?.replace(/\\s+/g," ").trim() || "",
        demoDialogInitialOpen:document.querySelector("#whatsapp-demo-dialog")?.open || false,
        navLabels:[...document.querySelectorAll("#main-nav a")].map(a=>a.innerText.trim()),
        navHrefs:[...document.querySelectorAll("#main-nav a")].map(a=>a.getAttribute("href")),
        dir:document.documentElement.dir,
        heading:heading?.innerText?.replace(/\s+/g," ").trim() || "",
        heroLead:document.querySelector(".hero-lead")?.innerText?.trim() || "",
        redundantHeroNotesPresent:Boolean(document.querySelector(".hero-notes")),
        headlineLines:heading?.querySelectorAll(":scope > .hero-title-kicker, :scope > .hero-title-main, :scope > .hero-title-benefit").length || 0,
        headlineKicker:heading?.querySelector(".hero-title-kicker")?.innerText?.trim() || "",
        headlineService:heading?.querySelector(".hero-title-main")?.innerText?.trim() || "",
        headlineBenefit:heading?.querySelector(".hero-title-benefit")?.innerText?.trim() || "",
        headlineOverflow:Boolean(heading && (
          heading.scrollWidth > heading.clientWidth + 1 ||
          [...heading.querySelectorAll(".hero-title-kicker,.hero-title-main,.hero-title-benefit")]
            .some(el => el.scrollWidth > el.clientWidth + 1)
        )),
        headingFont:getComputedStyle(heading).fontFamily,
        headingFontLoaded:document.fonts.check('800 48px "Cairo"', "التبييض"),
        bodyFont:getComputedStyle(document.body).fontFamily,
        bodyFontLoaded:document.fonts.check('400 16px "IBM Plex Sans Arabic"', "رعاية الأسنان"),
        headingVisible:Boolean(heading && rect(heading).height > 0),
        eyebrowLabel:document.querySelector(".hero-eyebrow-label")?.innerText?.trim() || "",
        eyebrowIndex:document.querySelector(".hero-eyebrow-index")?.innerText?.trim() || "",
        eyebrowToothIcon:Boolean(document.querySelector(".hero-eyebrow-icon svg path")?.getAttribute("d")?.startsWith("M7.15")),
        eyebrowStartAligned:Boolean(
          document.querySelector(".hero-eyebrow") && copy &&
          Math.abs(rect(document.querySelector(".hero-eyebrow")).right - rect(copy).right) <= 3
        ),
        eyebrowNumberFirst:Boolean((()=>{
          const number=document.querySelector(".hero-eyebrow-index");
          const icon=document.querySelector(".hero-eyebrow-icon");
          const label=document.querySelector(".hero-eyebrow-label");
          return number&&icon&&label&&rect(number).right>=rect(icon).right&&rect(icon).right>=rect(label).right;
        })()),
        eyebrowGlassChip:Boolean((()=>{
          const badge=document.querySelector(".hero-eyebrow");
          const icon=document.querySelector(".hero-eyebrow-icon");
          if(!badge||!icon)return false;
          const b=getComputedStyle(badge),i=getComputedStyle(icon);
          const svg=icon.querySelector("svg");
          return b.backgroundImage.includes("gradient")&&b.backdropFilter.includes("blur")&&
            Number.parseFloat(b.height)<=36&&b.borderTopWidth==="1px"&&
            i.backgroundColor==="rgba(0, 0, 0, 0)"&&i.borderTopWidth==="0px"&&
            svg&&Number.parseFloat(getComputedStyle(svg).width)<=16;
        })()),
        copy:copy ? rect(copy) : null,
        visual:visual ? rect(visual) : null,
        imageCount:document.querySelectorAll(".photo-frame img").length,
        imageAlt:image?.alt || "",
        imageSrc:image?.currentSrc || image?.src || "",
        faviconHref:document.querySelector('link[rel="icon"]')?.getAttribute("href") || "",
        brandMarkRect:brandImage ? rect(brandImage) : null,
        brandName:document.querySelector(".brand-name strong")?.innerText?.trim() || "",
        brandArabic:document.querySelector(".brand-name small")?.innerText?.trim() || "",
        brandMarkSrc:document.querySelector(".brand-mark img")?.getAttribute("src") || "",
        brandMarkLoaded:Boolean(document.querySelector(".brand-mark img")?.complete && document.querySelector(".brand-mark img")?.naturalWidth > 0),
        brandNameFontSize:Number.parseFloat(getComputedStyle(document.querySelector(".brand-name strong")).fontSize),
        brandNameFontFamily:getComputedStyle(document.querySelector(".brand-name strong")).fontFamily,
        brandWordmarkFontLoaded:document.fonts.check('italic 500 31px "Cormorant Garamond"',"Ruwa"),
        logoReferenceMatch,
        logoTransparent:logoCornerPixel[3]===0,
        logoNavyExact:logoNavyPixel[0]===12 && logoNavyPixel[1]===45 && logoNavyPixel[2]===63 && logoNavyPixel[3]>=250,
        logoSmileExact:logoSmilePixel[0]===13 && logoSmilePixel[1]===126 && logoSmilePixel[2]===137 && logoSmilePixel[3]>=250,
        imageLoaded:Boolean(image?.complete && image.naturalWidth > 0),
        navDisplay:nav ? getComputedStyle(nav).display : "missing",
        toggleDisplay:toggle ? getComputedStyle(toggle).display : "missing",
        toggleExpanded:toggle?.getAttribute("aria-expanded"),
        anchors:[...document.querySelectorAll('a[href^="#"]')].map(a=>a.getAttribute("href").slice(1)).filter(Boolean),
        missingAnchors:[...document.querySelectorAll('a[href^="#"]')].map(a=>a.getAttribute("href").slice(1)).filter(id=>id && !document.getElementById(id)),
        scrollWidth:document.documentElement.scrollWidth,
        clientWidth:document.documentElement.clientWidth,
        skipLink:Boolean(document.querySelector("a.skip[href='#main']")),
        reducedMotion:matchMedia("(prefers-reduced-motion: reduce)").matches && Number.parseFloat(getComputedStyle(copy).animationDuration) <= 0.00002 && Number.parseFloat(getComputedStyle(visual).animationDuration) <= 0.00002,
        ctaHref:document.querySelector(".primary-cta")?.getAttribute("href") || "",
        heroCtaText:document.querySelector(".primary-cta")?.innerText?.trim() || "",
        heroCtaHref:document.querySelector(".primary-cta")?.getAttribute("href") || "",
        heroCtaTag:document.querySelector(".primary-cta")?.tagName || "",
        heroCtaWhatsAppIcon:Boolean(document.querySelector(".primary-cta .whatsapp-brand-icon")),
        heroCtaBackground:getComputedStyle(document.querySelector(".primary-cta")).backgroundColor,
        heroCtaForeground:getComputedStyle(document.querySelector(".primary-cta")).color,
        heroCtaHeight:rect(document.querySelector(".primary-cta")).height,
        heroCtaFontSize:Number.parseFloat(getComputedStyle(document.querySelector(".primary-cta")).fontSize),
        heroCtaRadius:Number.parseFloat(getComputedStyle(document.querySelector(".primary-cta")).borderTopLeftRadius),
        heroCtaIconHidden:document.querySelector(".primary-cta svg")?.getAttribute("aria-hidden") === "true",
        liveContactChannelPresent:[...document.querySelectorAll("a[href]")].some(a=>{
          const href=a.getAttribute("href") || "";
          return href.startsWith("tel:") || a.hostname==="wa.me" || a.hostname==="api.whatsapp.com";
        }),
        photoLabelText:document.querySelector(".photo-label strong")?.innerText?.replace(/\\s+/g," ").trim() || "",
        visualCaptionText:document.querySelector(".visual-caption")?.innerText?.trim() || "",
        visualCaptionTransform:getComputedStyle(document.querySelector(".visual-caption")).transform,
        visualCaptionRadius:Number.parseFloat(getComputedStyle(document.querySelector(".visual-caption")).borderTopLeftRadius),
        visualCaptionBackground:getComputedStyle(document.querySelector(".visual-caption")).backgroundColor,
        visualSideNoteDisplay:getComputedStyle(document.querySelector(".visual-side-note")).display,
        inquiryButton:Boolean(document.querySelector("#prepare-inquiry")),
        inquiryTopicLabel:Boolean(document.querySelector('label[for="inquiry-topic"]')),
        contactHasDeadEnd:Boolean(document.querySelector("#consultation a[href=\"#top\"]")),
        contentSections:["causes","options","suitability","expectations","faq"].map(id=>Boolean(document.getElementById(id))),
        optionCards:document.querySelectorAll(".option-card").length,
        causeCards:document.querySelectorAll(".info-card").length,
        faqItems:document.querySelectorAll(".faq-item").length,
        clinicalReferences:[...document.querySelectorAll(".reference-note a")].map(a=>a.href),
        contrastChecks:(()=>{
          const parse=color=>{const m=color.match(/[\d.]+/g)?.map(Number)||[];return m.slice(0,3).map(v=>v/255)};
          const luminance=color=>{
            const rgb=parse(color).map(v=>v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4);
            return 0.2126*rgb[0]+0.7152*rgb[1]+0.0722*rgb[2];
          };
          return [
            "#approach .approach-intro .eyebrow",
            "#approach .step p",
            "#options .section-head p",
            "#faq .reference-note"
          ].map(selector=>{
            const el=document.querySelector(selector);
            if(!el)return {selector,ratio:0};
            const section=el.closest("section");
            const fg=getComputedStyle(el).color;
            const bg=section?getComputedStyle(section).backgroundColor:"rgb(255,255,255)";
            const a=luminance(fg),b=luminance(bg);
            return {selector,ratio:(Math.max(a,b)+0.05)/(Math.min(a,b)+0.05)};
          });
        })(),
        viewport:window.innerWidth
      };
    });

    assert.equal(state.lang, "ar-SA", `${vp.name}: Arabic language metadata missing`);
    assert.equal(state.announcementText, "تبييض الأسنان يبدأ بفهم الحالة", `${vp.name}: announcement copy is incorrect`);
    assert.equal(state.headerPosition, "sticky", `${vp.name}: header should remain accessible while scrolling`);
    assert.ok(state.headerRect.width < state.heroWrapRect.width, `${vp.name}: floating header must be narrower than the hero container`);
    assert.equal(state.headerRect.height, state.headerInnerRect.height, `${vp.name}: header shell must reserve a stable layout height`);
    assert.ok(Number.parseFloat(state.headerPanelRadius) >= 18, `${vp.name}: floating header needs rounded outer corners`);
    assert.equal(state.headerPanelTopInset, 0, `${vp.name}: header should start in its full-size state`);
    assert.equal(state.headerCompactInitially, false, `${vp.name}: header must not start in the compact state`);
    assert.equal(state.headerActionText, "تواصل عبر واتساب", `${vp.name}: header CTA copy is incorrect`);
    assert.equal(state.headerActionHref, "", `${vp.name}: demo header CTA must not contain a fake external destination`);
    assert.equal(state.headerActionTag, "BUTTON", `${vp.name}: header CTA must open the local demo dialog`);
    assert.ok(state.headerActionHasChatIcon && state.headerActionWhatsAppIcon, `${vp.name}: WhatsApp brand icon is missing from header CTA`);
    assert.equal(state.contactTriggerCount, 2, `${vp.name}: both primary CTAs must share one dialog trigger`);
    assert.equal(state.demoDialogTag, "DIALOG", `${vp.name}: accessible native dialog is missing`);
    assert.equal(state.demoDialogInitialOpen, false, `${vp.name}: demo dialog should start closed`);
    assert.ok(state.demoDialogText.includes("معاينة تجريبية لتجربة التواصل عبر واتساب"), `${vp.name}: demo dialog explanation is missing`);
    assert.ok(state.demoDialogText.includes("لا يتم فتح محادثة فعلية أو إرسال أي بيانات"), `${vp.name}: demo dialog must disclose that no live contact occurs`);
    assert.deepEqual(state.navLabels, ["خطوات التقييم","أسباب تغيّر اللون","خيارات التبييض","هل يناسبك؟","الأسئلة الشائعة"], `${vp.name}: navigation labels or order are incorrect`);
    assert.deepEqual(state.navHrefs, ["#approach","#causes","#options","#suitability","#faq"], `${vp.name}: navigation destinations are incorrect`);
    assert.equal(state.dir, "rtl", `${vp.name}: RTL direction missing`);
    assert.equal(state.heading, expectedHeading, `${vp.name}: protected headline changed`);
    assert.equal(state.heroLead, "تختلف أسباب تغيّر لون الأسنان ونتائج التبييض من حالة لأخرى. لذلك يبدأ التقييم بفحص الأسنان واللثة، ثم يشرح لك طبيب الأسنان الخيارات المناسبة لحالتك وما يمكن توقعه من كل خيار.", `${vp.name}: hero supporting copy changed`);
    assert.equal(state.redundantHeroNotesPresent, false, `${vp.name}: repetitive hero notes should be removed`);
    assert.equal(state.headlineLines, 3, `${vp.name}: headline must use the intended three-level composition`);
    assert.equal(state.headlineKicker, "اكتشف خيارات", `${vp.name}: headline introduction changed`);
    assert.equal(state.headlineService, "تبييض الأسنان", `${vp.name}: primary service phrase changed`);
    assert.equal(state.headlineBenefit, "لابتسامة أكثر إشراقًا", `${vp.name}: headline benefit phrase changed`);
    assert.equal(state.headlineOverflow, false, `${vp.name}: headline content overflows its box`);
    assert.ok(state.headingVisible, `${vp.name}: headline is not visible`);
    assert.equal(state.eyebrowLabel, "دليل الابتسامة", `${vp.name}: hero eyebrow label changed`);
    assert.equal(state.eyebrowIndex, "01", `${vp.name}: hero eyebrow sequence marker is missing`);
    assert.ok(state.eyebrowToothIcon, `${vp.name}: dental tooth icon is missing`);
    assert.ok(state.eyebrowStartAligned, `${vp.name}: hero eyebrow is not aligned to the RTL line start`);
    assert.ok(state.eyebrowNumberFirst, `${vp.name}: section number is not first at the RTL line start`);
    assert.ok(state.eyebrowGlassChip, `${vp.name}: eyebrow glass chip is not compact, translucent, and unframed internally`);
    assert.ok(state.headingFont.includes("Cairo"), `${vp.name}: expected Cairo headline font`);
    assert.ok(state.bodyFont.includes("IBM Plex Sans Arabic"), `${vp.name}: expected IBM Plex Sans Arabic body font`);
    assert.ok(state.headingFontLoaded, `${vp.name}: local Cairo heading font failed to load`);
    assert.ok(state.bodyFontLoaded, `${vp.name}: local IBM Plex Sans Arabic font failed to load`);
    assert.equal(state.imageCount, 1, `${vp.name}: unexpected number of hero images`);
    assert.ok(state.imageAlt.length > 10, `${vp.name}: image alt text is missing`);
    assert.equal(state.ctaHref, "", `${vp.name}: demo hero CTA must not navigate to an unrelated section`);
    assert.equal(state.heroCtaText, "تواصل عبر واتساب", `${vp.name}: hero CTA copy is incorrect`);
    assert.equal(state.heroCtaHref, "", `${vp.name}: demo hero CTA must not contain a fake external destination`);
    assert.equal(state.heroCtaTag, "BUTTON", `${vp.name}: hero CTA must open the local demo dialog`);
    assert.ok(state.heroCtaWhatsAppIcon, `${vp.name}: WhatsApp brand icon is missing from hero CTA`);
    assert.equal(state.heroCtaBackground, "rgb(24, 122, 128)", `${vp.name}: primary CTA should retain the RUWA teal`);
    assert.equal(state.heroCtaForeground, "rgb(255, 255, 255)", `${vp.name}: primary CTA text should remain white`);
    assert.ok(state.heroCtaHeight >= 52, `${vp.name}: primary CTA hit area is too short`);
    assert.ok(state.heroCtaFontSize >= 14, `${vp.name}: primary CTA text is too small`);
    assert.ok(state.heroCtaRadius >= 999, `${vp.name}: primary CTA should retain its pill shape`);
    assert.ok(state.heroCtaIconHidden, `${vp.name}: WhatsApp icon must be hidden from assistive technology because the button already has a text label`);
    assert.equal(state.liveContactChannelPresent, false, `${vp.name}: demo must not contain a live WhatsApp or phone destination`);
    assert.equal(state.visualCaptionText, "صورة توضيحية من Pexels؛ لا تمثل طبيبًا أو موظفًا بالعيادة.", `${vp.name}: stock image disclosure is unclear`);
    assert.equal(state.visualCaptionTransform, "none", `${vp.name}: stock image disclosure is unnecessarily rotated`);
    assert.ok(state.visualCaptionRadius >= 8, `${vp.name}: stock image disclosure needs a restrained rounded surface`);
    assert.ok(state.visualCaptionBackground.startsWith("rgba(255, 255, 255"), `${vp.name}: stock image disclosure should use a light readable surface`);
    if (vp.width <= 720) assert.equal(state.visualSideNoteDisplay, "none", `${vp.name}: decorative vertical note should be hidden on mobile`);
    else assert.notEqual(state.visualSideNoteDisplay, "none", `${vp.name}: desktop visual note should remain visible`);
    assert.ok(state.inquiryButton && state.inquiryTopicLabel, `${vp.name}: interactive inquiry control or label missing`);
    const dialog=page.locator("#whatsapp-demo-dialog");
    const heroTrigger=page.locator(".primary-cta");
    const headerTrigger=page.locator(".header-action");
    await heroTrigger.focus();
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => document.querySelector("#whatsapp-demo-dialog")?.open === true, null, { timeout: 3000 });
    assert.equal(await page.evaluate(() => document.activeElement?.id), "whatsapp-demo-title", `${vp.name}: opening from the hero CTA must move focus to the dialog heading`);
    assert.ok(await dialog.evaluate(el=>el.matches(":modal")), `${vp.name}: demo dialog must enter the native modal top layer`);
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => {
      const dialog=document.querySelector("#whatsapp-demo-dialog");
      return dialog?.open === false &&
        !document.body.classList.contains("dialog-open") &&
        document.activeElement?.classList.contains("primary-cta");
    }, null, { timeout: 3000 });
    assert.equal(await page.evaluate(() => document.activeElement?.classList.contains("primary-cta")), true, `${vp.name}: Escape must restore focus to the hero trigger`);
    assert.equal(await page.evaluate(() => document.body.classList.contains("dialog-open")), false, `${vp.name}: body scroll lock must be removed after Escape`);

    await headerTrigger.click();
    await page.waitForFunction(() => document.querySelector("#whatsapp-demo-dialog")?.open === true, null, { timeout: 3000 });
    await page.locator("#whatsapp-demo-close").click();
    await page.waitForFunction(() => {
      const dialog=document.querySelector("#whatsapp-demo-dialog");
      return dialog?.open === false &&
        !document.body.classList.contains("dialog-open") &&
        document.activeElement?.classList.contains("header-action");
    }, null, { timeout: 3000 });
    assert.equal(await page.evaluate(() => document.activeElement?.classList.contains("header-action")), true, `${vp.name}: close control must restore focus to the header trigger`);

    await heroTrigger.click();
    await page.waitForFunction(() => document.querySelector("#whatsapp-demo-dialog")?.open === true, null, { timeout: 3000 });
    await page.locator("#whatsapp-demo-dismiss").click();
    await page.waitForFunction(() => {
      const dialog=document.querySelector("#whatsapp-demo-dialog");
      return dialog?.open === false &&
        !document.body.classList.contains("dialog-open") &&
        document.activeElement?.classList.contains("primary-cta");
    }, null, { timeout: 3000 });
    assert.equal(await page.evaluate(() => document.activeElement?.classList.contains("primary-cta")), true, `${vp.name}: dialog action must restore focus to the hero trigger`);
    assert.equal(new URL(page.url()).hash, "", `${vp.name}: demo CTA must not create an unrelated anchor navigation`);
    await page.evaluate(() => window.scrollTo(0, 0));
    const initialHeaderMetrics = await page.evaluate(() => {
      const header=document.querySelector(".site-header");
      const headerRect=header.getBoundingClientRect();
      const action=document.querySelector(".header-action");
      const wordmark=document.querySelector(".brand-name strong");
      const panel=getComputedStyle(header,"::before");
      const left=Number.parseFloat(panel.left),right=Number.parseFloat(panel.right);
      const top=Number.parseFloat(panel.top),bottom=Number.parseFloat(panel.bottom);
      return {
        layoutHeight:headerRect.height,
        innerHeight:header.querySelector(".header-inner").getBoundingClientRect().height,
        headerWidth:headerRect.width,
        headerCenter:headerRect.left+headerRect.width/2,
        actionHeight:action.getBoundingClientRect().height,
        wordmarkSize:Number.parseFloat(getComputedStyle(wordmark).fontSize),
        panelTop:top,panelBottom:bottom,
        panelLeft:left,panelRight:right,
        visualWidth:headerRect.width-left-right,
        visualHeight:headerRect.height-top-bottom,
        visualLeft:headerRect.left+left,
        visualRight:headerRect.right-right,
        visualCenter:headerRect.left+left+(headerRect.width-left-right)/2
      };
    });
    await page.evaluate(() => window.scrollTo(0, 240));
    await page.waitForFunction(() => document.querySelector(".site-header")?.classList.contains("is-compact"), null, { timeout: 3000 });
    await page.waitForTimeout(360);
    const compactHeaderMetrics = await page.evaluate(() => {
      const header=document.querySelector(".site-header");
      const headerRect=header.getBoundingClientRect();
      const action=document.querySelector(".header-action");
      const wordmark=document.querySelector(".brand-name strong");
      const panel=getComputedStyle(header,"::before");
      const left=Number.parseFloat(panel.left),right=Number.parseFloat(panel.right);
      const top=Number.parseFloat(panel.top),bottom=Number.parseFloat(panel.bottom);
      return {
        layoutHeight:headerRect.height,
        innerHeight:header.querySelector(".header-inner").getBoundingClientRect().height,
        headerWidth:headerRect.width,
        headerCenter:headerRect.left+headerRect.width/2,
        actionHeight:action.getBoundingClientRect().height,
        wordmarkSize:Number.parseFloat(getComputedStyle(wordmark).fontSize),
        panelTop:top,panelBottom:bottom,
        panelLeft:left,panelRight:right,
        visualWidth:headerRect.width-left-right,
        visualHeight:headerRect.height-top-bottom,
        visualLeft:headerRect.left+left,
        visualRight:headerRect.right-right,
        visualCenter:headerRect.left+left+(headerRect.width-left-right)/2
      };
    });
    assert.equal(compactHeaderMetrics.layoutHeight, initialHeaderMetrics.layoutHeight, `${vp.name}: compacting the header must not shift page layout`);
    assert.equal(compactHeaderMetrics.innerHeight, initialHeaderMetrics.innerHeight, `${vp.name}: header's reserved inner height must remain stable`);
    assert.ok(compactHeaderMetrics.panelTop > initialHeaderMetrics.panelTop, `${vp.name}: floating shell did not visually shrink on scroll`);
    const expectedSideInsetRatio=vp.width>920?0.025:vp.width>720?0.02:0.015;
    const leftEdgeShift=compactHeaderMetrics.panelLeft-initialHeaderMetrics.panelLeft;
    const rightEdgeShift=compactHeaderMetrics.panelRight-initialHeaderMetrics.panelRight;
    assert.ok(leftEdgeShift>0 && rightEdgeShift>0, `${vp.name}: both outer sides must move inward`);
    assert.ok(Math.abs(leftEdgeShift-rightEdgeShift)<=0.75, `${vp.name}: right and left edges must shrink by the same amount (left ${leftEdgeShift}px, right ${rightEdgeShift}px)`);
    assert.ok(Math.abs(leftEdgeShift/initialHeaderMetrics.headerWidth-expectedSideInsetRatio)<=0.005, `${vp.name}: per-side horizontal shrink is not at the intended responsive percentage`);
    assert.ok(compactHeaderMetrics.visualWidth<initialHeaderMetrics.visualWidth, `${vp.name}: actual floating shell width did not decrease`);
    assert.ok(Math.abs((compactHeaderMetrics.visualCenter-initialHeaderMetrics.visualCenter))<=0.75, `${vp.name}: visual header shell shifted away from the center`);
    assert.ok(Math.abs(compactHeaderMetrics.headerCenter-initialHeaderMetrics.headerCenter)<=0.75, `${vp.name}: header container center changed during compaction`);
    assert.ok(compactHeaderMetrics.visualLeft>initialHeaderMetrics.visualLeft, `${vp.name}: visual left edge did not move inward`);
    assert.ok(compactHeaderMetrics.visualRight<initialHeaderMetrics.visualRight, `${vp.name}: visual right edge did not move inward`);
    assert.ok(Math.abs(compactHeaderMetrics.panelTop-compactHeaderMetrics.panelBottom)<=0.75, `${vp.name}: vertical shell inset must remain balanced`);
    assert.ok(compactHeaderMetrics.visualHeight<initialHeaderMetrics.visualHeight, `${vp.name}: actual floating shell height did not decrease`);
    assert.ok(compactHeaderMetrics.actionHeight < initialHeaderMetrics.actionHeight, `${vp.name}: header CTA did not become more compact on scroll`);
    assert.ok(compactHeaderMetrics.wordmarkSize < initialHeaderMetrics.wordmarkSize, `${vp.name}: brand wordmark did not become more compact on scroll`);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForFunction(() => !document.querySelector(".site-header")?.classList.contains("is-compact"), null, { timeout: 3000 });
    const restoredHeaderMetrics = await page.evaluate(() => {
      const header=document.querySelector(".site-header");
      const headerRect=header.getBoundingClientRect();
      const panel=getComputedStyle(header,"::before");
      return {
        actionHeight:document.querySelector(".header-action").getBoundingClientRect().height,
        wordmarkSize:Number.parseFloat(getComputedStyle(document.querySelector(".brand-name strong")).fontSize),
        panelTop:Number.parseFloat(panel.top),
        panelLeft:Number.parseFloat(panel.left),
        panelRight:Number.parseFloat(panel.right),
        visualWidth:headerRect.width-Number.parseFloat(panel.left)-Number.parseFloat(panel.right)
      };
    });
    assert.equal(restoredHeaderMetrics.actionHeight, initialHeaderMetrics.actionHeight, `${vp.name}: header CTA did not restore at the top`);
    assert.equal(restoredHeaderMetrics.wordmarkSize, initialHeaderMetrics.wordmarkSize, `${vp.name}: brand wordmark did not restore at the top`);
    assert.equal(restoredHeaderMetrics.panelTop, initialHeaderMetrics.panelTop, `${vp.name}: floating shell did not restore at the top`);
    assert.equal(restoredHeaderMetrics.panelLeft, initialHeaderMetrics.panelLeft, `${vp.name}: left edge did not restore at the top`);
    assert.equal(restoredHeaderMetrics.panelRight, initialHeaderMetrics.panelRight, `${vp.name}: right edge did not restore at the top`);
    assert.equal(restoredHeaderMetrics.visualWidth, initialHeaderMetrics.visualWidth, `${vp.name}: original floating header width did not restore at the top`);
    assert.equal(state.contactHasDeadEnd, false, `${vp.name}: contact section still contains a dead-end return link`);
    assert.ok(state.contentSections.every(Boolean), `${vp.name}: one or more educational sections are missing`);
    assert.equal(state.optionCards, 3, `${vp.name}: whitening options cards are incomplete`);
    assert.equal(state.causeCards, 2, `${vp.name}: stain explanation cards are incomplete`);
    assert.equal(state.faqItems, 6, `${vp.name}: FAQ entries are incomplete`);
    assert.ok(state.clinicalReferences.some(url=>url.includes("nhs.uk")) && state.clinicalReferences.some(url=>url.includes("ada.org")), `${vp.name}: clinical reference links are missing`);
    assert.ok(state.contrastChecks.every(item=>item.ratio>=4.5), `${vp.name}: text contrast below WCAG AA: ${JSON.stringify(state.contrastChecks)}`);
    assert.equal(state.missingAnchors.length, 0, `${vp.name}: broken in-page anchors: ${state.missingAnchors.join(", ")}`);
    assert.ok(state.skipLink, `${vp.name}: skip link missing`);
    assert.ok(state.faviconHref.endsWith("assets/ruwa-mark.png"), `${vp.name}: RUWA favicon link is missing`);
    assert.equal(state.brandName, "Ruwa", `${vp.name}: English brand wordmark is incorrect`);
    assert.equal(state.brandArabic, "رُواء لطب الأسنان", `${vp.name}: Arabic clinic name is incorrect`);
    assert.equal(state.brandMarkSrc, "assets/ruwa-mark.png", `${vp.name}: header logo asset is incorrect`);
    assert.ok(state.brandMarkLoaded, `${vp.name}: header logo asset failed to load`);
    assert.ok(state.brandMarkRect && state.brandMarkRect.width >= 38 && state.brandMarkRect.height >= 32, `${vp.name}: RUWA logo is not visibly sized beside the wordmark`);
    assert.ok(state.logoReferenceMatch, `${vp.name}: RUWA logo dimensions or header asset differ from the supplied reference`);
    assert.ok(state.logoTransparent, `${vp.name}: RUWA logo background is not transparent`);
    assert.ok(state.logoNavyExact, `${vp.name}: RUWA navy mark color differs from reference`);
    assert.ok(state.logoSmileExact, `${vp.name}: RUWA smile color differs from reference`);
    assert.equal(state.brandNameFontSize, vp.width <= 390 ? 25 : 31, `${vp.name}: Ruwa wordmark size is not correct for this viewport`);
    assert.ok(state.brandNameFontFamily.includes("Cormorant Garamond"), `${vp.name}: Ruwa wordmark is not using Cormorant Garamond`);
    assert.ok(state.brandWordmarkFontLoaded, `${vp.name}: Cormorant Garamond wordmark font failed to load`);
    assert.ok(state.reducedMotion, `${vp.name}: reduced-motion fallback is not active`);
    assert.ok(state.scrollWidth <= state.clientWidth + 1, `${vp.name}: horizontal overflow ${state.scrollWidth}px > ${state.clientWidth}px`);

    if (vp.width <= 920) {
      assert.equal(state.navDisplay, "none", `${vp.name}: mobile navigation should start collapsed`);
      assert.notEqual(state.toggleDisplay, "none", `${vp.name}: mobile menu button should be visible`);
      await page.locator("#menu-toggle").click();
      const opened = await page.evaluate(() => ({
        expanded:document.querySelector("#menu-toggle")?.getAttribute("aria-expanded"),
        display:getComputedStyle(document.querySelector("#main-nav")).display
      }));
      assert.equal(opened.expanded, "true", `${vp.name}: mobile menu aria state did not open`);
      assert.notEqual(opened.display, "none", `${vp.name}: mobile menu did not open`);
      await page.locator('#main-nav a[href="#approach"]').click();
      const closed = await page.evaluate(() => ({
        expanded:document.querySelector("#menu-toggle")?.getAttribute("aria-expanded"),
        display:getComputedStyle(document.querySelector("#main-nav")).display,
        hash:location.hash
      }));
      assert.equal(closed.expanded, "false", `${vp.name}: mobile menu aria state did not close`);
      assert.equal(closed.display, "none", `${vp.name}: mobile menu remained open after selection`);
      assert.equal(closed.hash, "#approach", `${vp.name}: navigation target failed`);
    }

    if (vp.width > 920) {
      assert.notEqual(state.navDisplay, "none", `${vp.name}: desktop navigation should be visible`);
      assert.equal(state.toggleDisplay, "none", `${vp.name}: mobile menu button should be hidden`);
      assert.ok(state.copy.right <= state.visual.left + 1 || state.visual.right <= state.copy.left + 1,
        `${vp.name}: hero text and image columns overlap`);
    }

    const faqQuestion=page.locator(".faq-item summary").first();
    await faqQuestion.click();
    assert.equal(await faqQuestion.locator("xpath=..").getAttribute("open"), "", `${vp.name}: first FAQ item did not open`);
    await faqQuestion.click();
    assert.equal(await faqQuestion.locator("xpath=..").getAttribute("open"), null, `${vp.name}: first FAQ item did not close`);

    await page.locator("#prepare-inquiry").click();
    await page.waitForFunction(() => {
      const status=document.querySelector("#inquiry-status")?.textContent || "";
      return status.includes("تم نسخ") || status.includes("جهّزنا");
    }, null, { timeout: 5000 });
    const inquiryResult = await page.evaluate(() => ({
      message:document.querySelector("#inquiry-message")?.value || "",
      status:document.querySelector("#inquiry-status")?.textContent || "",
      fallbackVisible:!document.querySelector("#inquiry-message")?.hidden
    }));
    assert.ok(inquiryResult.message.includes("تبييض الأسنان"), `${vp.name}: inquiry message was not prepared`);
    assert.ok(inquiryResult.status.includes("نسخ") || inquiryResult.status.includes("جهّزنا"), `${vp.name}: inquiry feedback is missing`);

    await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.evaluate(async () => {
      const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
      const end = document.documentElement.scrollHeight;
      for (let y=0; y<end; y+=Math.max(320,Math.floor(innerHeight*.8))) {
        scrollTo(0,y);
        await delay(80);
      }
      scrollTo(0,0);
    });
    await page.screenshot({ path: `${OUT}/${vp.name}.png`, fullPage: true, animations: "disabled" });

    const imageLoad = await page.evaluate(() => {
      const img = document.querySelector(".photo-frame img");
      return { loaded:Boolean(img?.complete && img.naturalWidth>0), naturalWidth:img?.naturalWidth || 0, src:img?.currentSrc || img?.src || "" };
    });
    assert.ok(imageLoad.loaded, `${vp.name}: hero image failed to load`);
    assert.ok(/w=(640|1100|1500)/.test(imageLoad.src), `${vp.name}: responsive hero image variant was not selected`);
    results.push({ ...vp, ...state, imageLoad, pageErrors, localErrors });
    assert.equal(pageErrors.length, 0, `${vp.name}: JavaScript errors: ${pageErrors.join(" | ")}`);
    assert.equal(localErrors.length, 0, `${vp.name}: local resource errors: ${JSON.stringify(localErrors)}`);
    console.log(`[PASS] ${vp.name}: RTL, Cairo + IBM Plex fonts, layout, anchors, menu, motion and overflow`);
    await page.close();
  }
} catch (error) {
  failures.push(error.message);
  throw error;
} finally {
  await browser.close();
  await writeFile(`${OUT}/report.json`, JSON.stringify({ url:BASE_URL, generatedAt:new Date().toISOString(), results, failures }, null, 2) + "\n");
}
console.log(`All ${results.length} responsive browser checks passed.`);
