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
  { name: "laptop-1280", width: 1280, height: 900, mobile: false },
  { name: "desktop-1440", width: 1440, height: 900, mobile: false }
];


async function measureHeader(page) {
  return page.evaluate(() => {
    const header=document.querySelector(".site-header");
    const headerRect=header.getBoundingClientRect();
    const panel=getComputedStyle(header,"::before");
    const left=Number.parseFloat(panel.left),right=Number.parseFloat(panel.right);
    const top=Number.parseFloat(panel.top),bottom=Number.parseFloat(panel.bottom);
    const rect=element=>{
      const r=element.getBoundingClientRect();
      return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height,centerX:r.left+r.width/2};
    };
    const brand=rect(document.querySelector(".brand"));
    const brandMark=rect(document.querySelector(".brand-mark"));
    const brandMarkImage=rect(document.querySelector(".brand-mark img"));
    const arabicBrandSize=Number.parseFloat(getComputedStyle(document.querySelector(".brand-name small")).fontSize);
    const nav=rect(document.querySelector("#main-nav"));
    const action=rect(document.querySelector(".header-action"));
    const actionIcon=rect(document.querySelector(".header-action .whatsapp-brand-icon"));
    const actionFontSize=Number.parseFloat(getComputedStyle(document.querySelector(".header-action")).fontSize);
    const headerProgress=Number.parseFloat(getComputedStyle(header).getPropertyValue("--header-progress"));
    const linkRects=[...document.querySelectorAll("#main-nav a")].map(rect).sort((a,b)=>a.left-b.left);
    const navLinkGaps=linkRects.slice(0,-1).map((link,index)=>linkRects[index+1].left-link.right);
    const targets=[
      ["brand",document.querySelector(".brand")],
      ["nav",document.querySelector("#main-nav")],
      ["action",document.querySelector(".header-action")],
      ["menu",document.querySelector("#menu-toggle")]
    ];
    const visibleGroups=targets
      .filter(([,element])=>element && getComputedStyle(element).display!=="none")
      .map(([name,element])=>({name,...rect(element)}))
      .filter(group=>group.width>0 && group.height>0);
    return {
      layoutHeight:headerRect.height,
      innerHeight:rect(header.querySelector(".header-inner")).height,
      headerWidth:headerRect.width,
      headerCenter:headerRect.left+headerRect.width/2,
      actionHeight:action.height,
      actionFontSize,actionIcon,arabicBrandSize,brandMark,brandMarkImage,headerProgress,
      wordmarkSize:Number.parseFloat(getComputedStyle(document.querySelector(".brand-name strong")).fontSize),
      brand,nav,action,
      brandNavGap:brand.left-nav.right,
      navActionGap:nav.left-action.right,
      navLinkGaps,
      navLinkGapAverage:navLinkGaps.length?navLinkGaps.reduce((sum,gap)=>sum+gap,0)/navLinkGaps.length:0,
      panelTop:top,panelBottom:bottom,panelLeft:left,panelRight:right,
      visualWidth:headerRect.width-left-right,
      visualHeight:headerRect.height-top-bottom,
      visualLeft:headerRect.left+left,
      visualRight:headerRect.right-right,
      visualCenter:headerRect.left+left+(headerRect.width-left-right)/2,
      frameLeftPadding:action.left-(headerRect.left+left),
      frameRightPadding:(headerRect.right-right)-brand.right,
      visibleGroups
    };
  });
}

async function captureHeader(page, path) {
  const box = await page.locator(".site-header").boundingBox();
  assert.ok(box, "Header screenshot target must be measurable");
  await page.screenshot({
    path,
    clip: { x: box.x, y: box.y, width: box.width, height: box.height },
    animations: "disabled"
  });
  return page.evaluate(() => ({
    scrollY: window.scrollY,
    compact: document.querySelector(".site-header")?.classList.contains("is-compact") || false
  }));
}

const expectedHeading = "اكتشف خيارات تبييض الأسنان لابتسامة أكثر إشراقًا";
const failures = [];
const results = [];
const motionResults = [];
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
        navLinkTypography:[...document.querySelectorAll("#main-nav a")].map(link=>{
          const style=getComputedStyle(link),bounds=link.getBoundingClientRect();
          return {
            fontFamily:style.fontFamily,fontSize:Number.parseFloat(style.fontSize),
            fontWeight:Number.parseInt(style.fontWeight,10),lineHeight:Number.parseFloat(style.lineHeight),
            letterSpacing:style.letterSpacing,color:style.color,whiteSpace:style.whiteSpace,
            height:bounds.height,width:bounds.width
          };
        }),
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
        eyebrowRule:(()=>{
          const rule=document.querySelector(".hero-eyebrow-rule");
          const number=document.querySelector(".hero-eyebrow-index");
          if(!rule||!number)return null;
          const style=getComputedStyle(rule),bounds=rect(rule),numberBounds=rect(number);
          return {width:bounds.width,height:bounds.height,color:style.backgroundColor,opacity:Number.parseFloat(style.opacity),
            immediatelyBeforeNumber:bounds.left>numberBounds.right&&bounds.left-numberBounds.right<12};
        })(),
        benefitUnderline:(()=>{
          const accent=document.querySelector(".hero-title-benefit .accent");
          if(!accent)return null;
          const bounds=rect(accent),style=getComputedStyle(accent,"::after");
          const matrix=style.transform.match(/matrix\(([^)]+)\)/);
          const values=matrix?matrix[1].split(",").map(Number):[];
          const angle=values.length>=2?Math.atan2(values[1],values[0])*180/Math.PI:0;
          const width=Number.parseFloat(style.width),height=Number.parseFloat(style.height);
          return {textWidth:bounds.width,lineWidth:width,widthRatio:width/bounds.width,height,
            color:style.backgroundColor,opacity:Number.parseFloat(style.opacity),bottom:style.bottom,angle};
        })(),
        heroBackgroundHarmony:(()=>{
          const root=getComputedStyle(document.documentElement);
          const header=document.querySelector(".site-header");
          return {
            canvas:root.getPropertyValue("--canvas").trim(),paper:root.getPropertyValue("--paper").trim(),
            body:getComputedStyle(document.body).backgroundColor,
            headerSurface:getComputedStyle(header,"::before").backgroundColor,
            headerBorder:getComputedStyle(header,"::before").borderTopColor,
            heroGradients:getComputedStyle(document.querySelector(".hero")).backgroundImage,
            heroBottom:getComputedStyle(document.querySelector(".hero-bottom")).backgroundColor,
            approach:getComputedStyle(document.querySelector(".approach")).backgroundColor
          };
        })(),
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
    assert.equal(state.navLinkTypography.length,5, `${vp.name}: all five navigation links must be present`);
    assert.ok(state.navLinkTypography.every(link=>
      link.fontFamily.includes("IBM Plex Sans Arabic") && link.fontSize===14 &&
      link.fontWeight===600 && Math.abs(link.lineHeight-22.4)<.2 &&
      (link.letterSpacing==="normal"||link.letterSpacing==="0px") && link.color==="rgb(48, 74, 84)"
    ), `${vp.name}: navigation font, size, weight, line-height, tracking, or base color is incorrect: ${JSON.stringify(state.navLinkTypography)}`);
    if(vp.width>920){
      assert.ok(state.navLinkTypography.every(link=>link.whiteSpace==="nowrap"&&link.height>=36),
        `${vp.name}: desktop links must remain single-line with a comfortable hit area`);
    }
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
    assert.ok(state.eyebrowRule && state.eyebrowRule.immediatelyBeforeNumber,
      `${vp.name}: the short RTL editorial line must sit immediately before 01: ${JSON.stringify(state.eyebrowRule)}`);
    assert.ok(state.eyebrowRule.width>=16&&state.eyebrowRule.width<=24&&state.eyebrowRule.height>=1.4&&state.eyebrowRule.height<=2,
      `${vp.name}: eyebrow rule dimensions are outside the refined range: ${JSON.stringify(state.eyebrowRule)}`);
    assert.equal(state.eyebrowRule.color,"rgb(24, 122, 128)",`${vp.name}: eyebrow rule must use RUWA teal`);
    assert.ok(state.benefitUnderline && state.benefitUnderline.widthRatio>=.90&&state.benefitUnderline.widthRatio<=1,
      `${vp.name}: benefit underline must cover 90–100% of the full phrase: ${JSON.stringify(state.benefitUnderline)}`);
    assert.ok(state.benefitUnderline.height>=2&&state.benefitUnderline.height<=3,
      `${vp.name}: benefit underline thickness is incorrect: ${JSON.stringify(state.benefitUnderline)}`);
    assert.equal(state.benefitUnderline.color,"rgb(184, 93, 74)",`${vp.name}: benefit underline coral tone changed`);
    assert.ok(state.benefitUnderline.angle<=-0.8&&state.benefitUnderline.angle>=-2.1,
      `${vp.name}: benefit underline must retain a subtle 1–2 degree angle: ${JSON.stringify(state.benefitUnderline)}`);
    assert.ok(Number.parseFloat(state.benefitUnderline.bottom)<-2,
      `${vp.name}: benefit underline must sit clearly beneath the phrase`);
    assert.equal(state.heroBackgroundHarmony.canvas,"#F4F7F6",`${vp.name}: canvas token drifted`);
    assert.equal(state.heroBackgroundHarmony.paper,"#FFFFFF",`${vp.name}: paper token drifted`);
    assert.equal(state.heroBackgroundHarmony.body,"rgb(244, 247, 246)",`${vp.name}: page canvas is no longer the intended soft mist tone`);
    assert.equal(state.heroBackgroundHarmony.headerSurface,"rgba(255, 255, 255, 0.93)",`${vp.name}: glass header surface changed`);
    assert.equal(state.heroBackgroundHarmony.headerBorder,"rgba(221, 230, 227, 0.92)",`${vp.name}: glass header border changed`);
    assert.equal(state.heroBackgroundHarmony.heroBottom,"rgba(255, 255, 255, 0.22)",`${vp.name}: hero-bottom surface changed`);
    assert.equal(state.heroBackgroundHarmony.approach,"rgb(255, 255, 255)",`${vp.name}: next section surface changed`);
    assert.ok(state.heroBackgroundHarmony.heroGradients.includes("radial-gradient"),
      `${vp.name}: subtle hero background gradients are missing`);
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
    const initialHeaderMetrics = await measureHeader(page);
    if (vp.width===1440) {
      const initialScreenshotState=await captureHeader(page,`${OUT}/desktop-1440-header-initial.png`);
      assert.equal(initialScreenshotState.scrollY,0, `${vp.name}: initial header screenshot must preserve the top-of-page state`);
      assert.equal(initialScreenshotState.compact,false, `${vp.name}: initial header screenshot must show the expanded state`);
    }
    await page.evaluate(() => window.scrollTo(0, 240));
    await page.waitForFunction(() => document.querySelector(".site-header")?.classList.contains("is-compact"), null, { timeout: 3000 });
    await page.waitForTimeout(360);
    const compactHeaderMetrics = await measureHeader(page);
    if (vp.width===1440) {
      const compactScreenshotState=await captureHeader(page,`${OUT}/desktop-1440-header-compact.png`);
      assert.ok(compactScreenshotState.scrollY>56, `${vp.name}: compact header screenshot must preserve the scrolled position`);
      assert.equal(compactScreenshotState.compact,true, `${vp.name}: compact header screenshot must preserve the compact state`);
    }
    if (vp.width===360) {
      const mobileScreenshotState=await captureHeader(page,`${OUT}/mobile-360-header-compact.png`);
      assert.ok(mobileScreenshotState.scrollY>56, `${vp.name}: mobile compact screenshot must preserve the scrolled position`);
      assert.equal(mobileScreenshotState.compact,true, `${vp.name}: mobile compact screenshot must preserve the compact state`);
    }
    assert.equal(initialHeaderMetrics.headerProgress,0, `${vp.name}: header must begin at shared progress 0`);
    assert.equal(compactHeaderMetrics.headerProgress,1, `${vp.name}: compact frame and content must reach shared progress 1 together`);
    assert.ok(compactHeaderMetrics.brandMark.width<initialHeaderMetrics.brandMark.width, `${vp.name}: RUWA logo container did not shrink`);
    assert.ok(compactHeaderMetrics.brandMarkImage.width<initialHeaderMetrics.brandMarkImage.width, `${vp.name}: RUWA logo artwork did not shrink proportionally`);
    assert.ok(compactHeaderMetrics.arabicBrandSize<initialHeaderMetrics.arabicBrandSize, `${vp.name}: Arabic clinic name did not become more compact`);
    assert.ok(compactHeaderMetrics.actionFontSize<initialHeaderMetrics.actionFontSize, `${vp.name}: WhatsApp CTA wording did not become more compact`);
    assert.ok(compactHeaderMetrics.actionIcon.width<initialHeaderMetrics.actionIcon.width, `${vp.name}: WhatsApp icon did not become more compact`);
    assert.equal(compactHeaderMetrics.layoutHeight, initialHeaderMetrics.layoutHeight, `${vp.name}: compacting the header must not shift page layout`);
    assert.equal(compactHeaderMetrics.innerHeight, initialHeaderMetrics.innerHeight, `${vp.name}: header's reserved inner height must remain stable`);
    assert.ok(compactHeaderMetrics.panelTop > initialHeaderMetrics.panelTop, `${vp.name}: floating shell did not visually shrink on scroll`);
    const leftEdgeShift=compactHeaderMetrics.panelLeft-initialHeaderMetrics.panelLeft;
    const rightEdgeShift=compactHeaderMetrics.panelRight-initialHeaderMetrics.panelRight;
    assert.ok(leftEdgeShift>0 && rightEdgeShift>0, `${vp.name}: both outer sides must move inward`);
    if(vp.width>920) {
      const whatsappLeftEdgeTravel=compactHeaderMetrics.action.left-initialHeaderMetrics.action.left;
      const brandRightEdgeTravel=initialHeaderMetrics.brand.right-compactHeaderMetrics.brand.right;
      const leftEdgeError=Math.abs(leftEdgeShift-whatsappLeftEdgeTravel);
      const rightEdgeError=Math.abs(rightEdgeShift-brandRightEdgeTravel);
      assert.ok(whatsappLeftEdgeTravel>0 && brandRightEdgeTravel>0,
        `${vp.name}: both outer header groups must converge inward`);
      assert.ok(leftEdgeError<=1.5,
        `${vp.name}: glass frame left edge must match WhatsApp's left-edge travel (frame ${leftEdgeShift.toFixed(2)}px, CTA ${whatsappLeftEdgeTravel.toFixed(2)}px, error ${leftEdgeError.toFixed(2)}px)`);
      assert.ok(rightEdgeError<=1.5,
        `${vp.name}: glass frame right edge must match brand's right-edge travel (frame ${rightEdgeShift.toFixed(2)}px, brand ${brandRightEdgeTravel.toFixed(2)}px, error ${rightEdgeError.toFixed(2)}px)`);
      assert.ok(Math.abs(compactHeaderMetrics.frameLeftPadding-initialHeaderMetrics.frameLeftPadding)<=1.5,
        `${vp.name}: frame-to-WhatsApp padding drifted by more than 1.5px`);
      assert.ok(Math.abs(compactHeaderMetrics.frameRightPadding-initialHeaderMetrics.frameRightPadding)<=1.5,
        `${vp.name}: frame-to-brand padding drifted by more than 1.5px`);
    } else {
      const expectedSideInsetRatio=vp.width>720?0.02:0.015;
      assert.ok(Math.abs(leftEdgeShift-rightEdgeShift)<=0.75,
        `${vp.name}: compact tablet/mobile frame must retain symmetrical side insets`);
      assert.ok(Math.abs(leftEdgeShift/initialHeaderMetrics.headerWidth-expectedSideInsetRatio)<=0.005,
        `${vp.name}: tablet/mobile frame inset differs from its responsive specification`);
    }
    assert.ok(compactHeaderMetrics.visualWidth<initialHeaderMetrics.visualWidth, `${vp.name}: actual floating shell width did not decrease`);
    const expectedFrameCenterShift=(leftEdgeShift-rightEdgeShift)/2;
    assert.ok(Math.abs((compactHeaderMetrics.visualCenter-initialHeaderMetrics.visualCenter)-expectedFrameCenterShift)<=0.75,
      `${vp.name}: glass frame center does not reflect its measured asymmetric edge movement`);
    assert.ok(Math.abs(compactHeaderMetrics.headerCenter-initialHeaderMetrics.headerCenter)<=0.75, `${vp.name}: header container center changed during compaction`);
    assert.ok(compactHeaderMetrics.visualLeft>initialHeaderMetrics.visualLeft, `${vp.name}: visual left edge did not move inward`);
    assert.ok(compactHeaderMetrics.visualRight<initialHeaderMetrics.visualRight, `${vp.name}: visual right edge did not move inward`);
    assert.ok(Math.abs(compactHeaderMetrics.panelTop-compactHeaderMetrics.panelBottom)<=0.75, `${vp.name}: vertical shell inset must remain balanced`);
    assert.ok(compactHeaderMetrics.visualHeight<initialHeaderMetrics.visualHeight, `${vp.name}: actual floating shell height did not decrease`);
    assert.ok(compactHeaderMetrics.actionHeight < initialHeaderMetrics.actionHeight, `${vp.name}: header CTA did not become more compact on scroll`);
    assert.ok(compactHeaderMetrics.wordmarkSize < initialHeaderMetrics.wordmarkSize, `${vp.name}: brand wordmark did not become more compact on scroll`);
    let headerConvergence=null;
    if (vp.width>920) {
      assert.ok(initialHeaderMetrics.brandNavGap>0 && initialHeaderMetrics.navActionGap>0,
        `${vp.name}: initial brand/navigation/CTA groups must have measurable separation`);
      assert.ok(Math.abs(initialHeaderMetrics.nav.centerX-initialHeaderMetrics.headerCenter)<=1,
        `${vp.name}: navigation is not centered in the initial state`);
      assert.ok(compactHeaderMetrics.brand.centerX<initialHeaderMetrics.brand.centerX-1,
        `${vp.name}: the complete brand group did not move left toward the centered navigation`);
      assert.ok(compactHeaderMetrics.action.centerX>initialHeaderMetrics.action.centerX+1,
        `${vp.name}: the complete WhatsApp CTA did not move right toward the centered navigation`);
      assert.ok(Math.abs(compactHeaderMetrics.nav.centerX-initialHeaderMetrics.nav.centerX)<=1,
        `${vp.name}: navigation drifted from the center during compaction`);
      const brandGapReduction=initialHeaderMetrics.brandNavGap-compactHeaderMetrics.brandNavGap;
      const actionGapReduction=initialHeaderMetrics.navActionGap-compactHeaderMetrics.navActionGap;
      const brandGapReductionRatio=brandGapReduction/initialHeaderMetrics.brandNavGap;
      const actionGapReductionRatio=actionGapReduction/initialHeaderMetrics.navActionGap;
      assert.ok(brandGapReduction>0 && actionGapReduction>0,
        `${vp.name}: both brand-to-navigation and navigation-to-CTA gaps must decrease`);
      assert.ok(brandGapReductionRatio>=0.55 && brandGapReductionRatio<=0.72,
        `${vp.name}: brand/navigation gap reduction must be 55–72% (actual ${(brandGapReductionRatio*100).toFixed(1)}%)`);
      // At 1024px the 14px navigation reaches the 16px safe-gap floor earlier;
      // preserve that measured separation rather than forcing excessive convergence.
      const minimumActionGapReductionRatio=vp.width===1024?0.38:0.55;
      assert.ok(actionGapReductionRatio>=minimumActionGapReductionRatio && actionGapReductionRatio<=0.72,
        `${vp.name}: navigation/CTA gap reduction must be ${(minimumActionGapReductionRatio*100).toFixed(0)}–72% (actual ${(actionGapReductionRatio*100).toFixed(1)}%)`);
      assert.ok(compactHeaderMetrics.brandNavGap>=15 && compactHeaderMetrics.navActionGap>=15,
        `${vp.name}: compact group gaps must retain at least 15px of safe separation`);
      assert.ok(compactHeaderMetrics.navLinkGapAverage<initialHeaderMetrics.navLinkGapAverage,
        `${vp.name}: navigation link spacing did not tighten`);
      assert.ok(compactHeaderMetrics.navLinkGapAverage<=initialHeaderMetrics.navLinkGapAverage-3,
        `${vp.name}: navigation links must move noticeably closer together`);
      assert.ok(compactHeaderMetrics.navLinkGaps.every(gap=>gap>=8),
        `${vp.name}: a compact navigation link gap became too tight`);
      headerConvergence={
        brandMovedLeftPx:Number((initialHeaderMetrics.brand.centerX-compactHeaderMetrics.brand.centerX).toFixed(2)),
        whatsappMovedRightPx:Number((compactHeaderMetrics.action.centerX-initialHeaderMetrics.action.centerX).toFixed(2)),
        brandNavGapBeforePx:Number(initialHeaderMetrics.brandNavGap.toFixed(2)),
        brandNavGapAfterPx:Number(compactHeaderMetrics.brandNavGap.toFixed(2)),
        brandNavGapReductionPercent:Number((brandGapReductionRatio*100).toFixed(2)),
        navActionGapBeforePx:Number(initialHeaderMetrics.navActionGap.toFixed(2)),
        navActionGapAfterPx:Number(compactHeaderMetrics.navActionGap.toFixed(2)),
        navActionGapReductionPercent:Number((actionGapReductionRatio*100).toFixed(2)),
        navCenterShiftPx:Number((compactHeaderMetrics.nav.centerX-initialHeaderMetrics.nav.centerX).toFixed(2)),
        frameLeftEdgeTravelPx:Number(leftEdgeShift.toFixed(2)),
        whatsappLeftEdgeTravelPx:Number((compactHeaderMetrics.action.left-initialHeaderMetrics.action.left).toFixed(2)),
        frameLeftEdgeErrorPx:Number(Math.abs(leftEdgeShift-(compactHeaderMetrics.action.left-initialHeaderMetrics.action.left)).toFixed(3)),
        frameRightEdgeTravelPx:Number(rightEdgeShift.toFixed(2)),
        brandRightEdgeTravelPx:Number((initialHeaderMetrics.brand.right-compactHeaderMetrics.brand.right).toFixed(2)),
        frameRightEdgeErrorPx:Number(Math.abs(rightEdgeShift-(initialHeaderMetrics.brand.right-compactHeaderMetrics.brand.right)).toFixed(3)),
        frameToWhatsAppPaddingBeforePx:Number(initialHeaderMetrics.frameLeftPadding.toFixed(2)),
        frameToWhatsAppPaddingAfterPx:Number(compactHeaderMetrics.frameLeftPadding.toFixed(2)),
        frameToBrandPaddingBeforePx:Number(initialHeaderMetrics.frameRightPadding.toFixed(2)),
        frameToBrandPaddingAfterPx:Number(compactHeaderMetrics.frameRightPadding.toFixed(2)),
        navLinkGapBeforePx:Number(initialHeaderMetrics.navLinkGapAverage.toFixed(2)),
        navLinkGapAfterPx:Number(compactHeaderMetrics.navLinkGapAverage.toFixed(2))
      };
    }
    for (const metrics of [initialHeaderMetrics,compactHeaderMetrics]) {
      const groups=[...metrics.visibleGroups].sort((a,b)=>a.left-b.left);
      assert.ok(groups.length>=2, `${vp.name}: header controls are not all measurable`);
      for (const group of groups) {
        assert.ok(group.left>=metrics.visualLeft-1.5 && group.right<=metrics.visualRight+1.5,
          `${vp.name}: ${group.name} escapes the visual floating shell`);
      }
      for (let index=1;index<groups.length;index++) {
        assert.ok(groups[index-1].right<=groups[index].left+1,
          `${vp.name}: header groups overlap (${groups[index-1].name} / ${groups[index].name})`);
      }
    }
    const headerShrink = {
      initialShellWidthPx:Number(initialHeaderMetrics.visualWidth.toFixed(2)),
      compactShellWidthPx:Number(compactHeaderMetrics.visualWidth.toFixed(2)),
      totalWidthReductionPx:Number((initialHeaderMetrics.visualWidth-compactHeaderMetrics.visualWidth).toFixed(2)),
      leftEdgeInwardPx:Number(leftEdgeShift.toFixed(2)),
      rightEdgeInwardPx:Number(rightEdgeShift.toFixed(2)),
      perSideInwardPercent:Number((leftEdgeShift/initialHeaderMetrics.headerWidth*100).toFixed(2)),
      initialShellHeightPx:Number(initialHeaderMetrics.visualHeight.toFixed(2)),
      compactShellHeightPx:Number(compactHeaderMetrics.visualHeight.toFixed(2))
    };
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForFunction(() => !document.querySelector(".site-header")?.classList.contains("is-compact"), null, { timeout: 3000 });
    await page.waitForFunction(() => Number.parseFloat(getComputedStyle(document.querySelector(".site-header")).getPropertyValue("--header-progress"))<0.001, null, { timeout: 3000 });
    const restoredHeaderMetrics = await measureHeader(page);
    assert.equal(restoredHeaderMetrics.headerProgress,0, `${vp.name}: shared header progress did not restore to zero`);
    assert.equal(restoredHeaderMetrics.actionHeight, initialHeaderMetrics.actionHeight, `${vp.name}: header CTA did not restore at the top`);
    assert.equal(restoredHeaderMetrics.wordmarkSize, initialHeaderMetrics.wordmarkSize, `${vp.name}: brand wordmark did not restore at the top`);
    assert.equal(restoredHeaderMetrics.panelTop, initialHeaderMetrics.panelTop, `${vp.name}: floating shell did not restore at the top`);
    assert.equal(restoredHeaderMetrics.panelLeft, initialHeaderMetrics.panelLeft, `${vp.name}: left edge did not restore at the top`);
    assert.equal(restoredHeaderMetrics.panelRight, initialHeaderMetrics.panelRight, `${vp.name}: right edge did not restore at the top`);
    assert.equal(restoredHeaderMetrics.visualWidth, initialHeaderMetrics.visualWidth, `${vp.name}: original floating header width did not restore at the top`);
    assert.ok(Math.abs(restoredHeaderMetrics.brand.centerX-initialHeaderMetrics.brand.centerX)<=0.75,
      `${vp.name}: brand position did not restore at the top`);
    assert.ok(Math.abs(restoredHeaderMetrics.action.centerX-initialHeaderMetrics.action.centerX)<=0.75,
      `${vp.name}: WhatsApp CTA position did not restore at the top`);
    assert.ok(Math.abs(restoredHeaderMetrics.nav.centerX-initialHeaderMetrics.nav.centerX)<=0.75,
      `${vp.name}: navigation position did not restore at the top`);
    if (vp.width>920) {
      assert.ok(Math.abs(restoredHeaderMetrics.brandNavGap-initialHeaderMetrics.brandNavGap)<=0.75,
        `${vp.name}: brand/navigation gap did not restore at the top`);
      assert.ok(Math.abs(restoredHeaderMetrics.navActionGap-initialHeaderMetrics.navActionGap)<=0.75,
        `${vp.name}: navigation/CTA gap did not restore at the top`);
    }
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
      await page.waitForFunction(()=>document.querySelector('#main-nav a[href="#approach"]')?.getAttribute("aria-current")==="location",null,{timeout:3000});
    }

    if (vp.width > 920) {
      assert.notEqual(state.navDisplay, "none", `${vp.name}: desktop navigation should be visible`);
      assert.equal(state.toggleDisplay, "none", `${vp.name}: mobile menu button should be hidden`);
      assert.ok(state.copy.right <= state.visual.left + 1 || state.visual.right <= state.copy.left + 1,
        `${vp.name}: hero text and image columns overlap`);

      const firstLink=page.locator("#main-nav a").first();
      await firstLink.hover();
      await page.waitForFunction(()=>{
        const link=document.querySelector("#main-nav a");
        return link&&getComputedStyle(link).color==="rgb(24, 122, 128)";
      },null,{timeout:1200});
      const hoverColor=await firstLink.evaluate(link=>getComputedStyle(link).color);
      assert.equal(hoverColor,"rgb(24, 122, 128)", `${vp.name}: hover state should use the RUWA teal accent`);
      await firstLink.focus();
      await page.keyboard.press("Tab");
      const focusState=await page.evaluate(()=>{
        const link=document.querySelectorAll("#main-nav a")[1],style=getComputedStyle(link);
        return {active:document.activeElement===link,visible:link.matches(":focus-visible"),
          outlineStyle:style.outlineStyle,outlineWidth:style.outlineWidth,outlineColor:style.outlineColor};
      });
      assert.ok(focusState.active&&focusState.visible&&focusState.outlineStyle==="solid"&&focusState.outlineWidth==="2px",
        `${vp.name}: keyboard focus state is not clearly visible: ${JSON.stringify(focusState)}`);
      await page.locator('#main-nav a[href="#causes"]').click();
      await page.waitForFunction(()=>{
        const section=document.querySelector("#causes");
        const link=document.querySelector('#main-nav a[href="#causes"]');
        return link?.getAttribute("aria-current")==="location"&&
          section?.getBoundingClientRect().top<=window.innerHeight*.32+1;
      },null,{timeout:6000});
      await page.evaluate(()=>new Promise(resolve=>{
        let last=window.scrollY,stableFrames=0;
        const check=()=>{
          const current=window.scrollY;
          stableFrames=Math.abs(current-last)<.5?stableFrames+1:0;
          last=current;
          if(stableFrames>=6)resolve();else requestAnimationFrame(check);
        };
        requestAnimationFrame(check);
      }));
      await page.waitForFunction(()=>document.querySelector('#main-nav a[href="#causes"]')?.getAttribute("aria-current")==="location",null,{timeout:1500});
      const activeLink=page.locator('#main-nav a[href="#causes"]');
      await page.mouse.move(0,0);
      await page.waitForFunction(()=>{
        const link=document.querySelector('#main-nav a[href="#causes"]');
        return link&&getComputedStyle(link).color==="rgb(17, 90, 96)";
      },null,{timeout:1500});
      const activeState=await activeLink.evaluate(link=>{
        const style=getComputedStyle(link);
        return {color:style.color,fontWeight:style.fontWeight,underline:getComputedStyle(link,"::after").transform};
      });
      assert.equal(activeState.color,"rgb(17, 90, 96)", `${vp.name}: active link color is incorrect`);
      assert.equal(activeState.fontWeight,"700", `${vp.name}: active link should be emphasized subtly`);
      assert.notEqual(activeState.underline,"matrix(0, 0, 0, 1, 0, 0)", `${vp.name}: active link underline is missing`);

      await activeLink.hover();
      const activeHoverState=await activeLink.evaluate(link=>{
        const style=getComputedStyle(link);
        const transform=getComputedStyle(link,"::after").transform;
        const scale=transform.startsWith("matrix(")?Number.parseFloat(transform.slice(7)):0;
        return {color:style.color,fontWeight:style.fontWeight,underlineScale:scale};
      });
      assert.equal(activeHoverState.color,"rgb(17, 90, 96)", `${vp.name}: active + hover must preserve the active-section color`);
      assert.equal(activeHoverState.fontWeight,"700", `${vp.name}: active + hover must preserve active emphasis`);
      assert.ok(activeHoverState.underlineScale>=0.99&&activeHoverState.underlineScale<=1.01,
        `${vp.name}: active + hover underline must remain full-width`);

      // Validate full-width active indicators on all five navigation sections.
      const navTargets=[
        {href:"#approach",id:"approach"},
        {href:"#causes",id:"causes"},
        {href:"#options",id:"options"},
        {href:"#suitability",id:"suitability"},
        {href:"#faq",id:"faq"}
      ];
      for(const target of navTargets){
        await page.mouse.move(0,0);
        const targetLink=page.locator(`#main-nav a[href="${target.href}"]`);
        await targetLink.click();
        await page.waitForFunction(({href,id})=>{
          const link=document.querySelector(`#main-nav a[href="${href}"]`);
          const section=document.getElementById(id);
          const readingLine=Math.max(120,window.innerHeight*.32);
          return link?.getAttribute("aria-current")==="location"&&
            section?.getBoundingClientRect().top<=readingLine+1;
        },target,{timeout:6000});
        await page.mouse.move(0,0);
        const underline=await targetLink.evaluate(link=>{
          const rect=link.getBoundingClientRect();
          const pseudo=getComputedStyle(link,"::after");
          const widthValue=pseudo.width;
          const widthPx=widthValue.endsWith("%")
            ?rect.width*Number.parseFloat(widthValue)/100
            :Number.parseFloat(widthValue);
          const transform=pseudo.transform;
          const scale=transform.startsWith("matrix(")?Number.parseFloat(transform.slice(7)):0;
          return {
            current:link.getAttribute("aria-current"),
            rectWidth:rect.width,
            lineWidth:widthPx,
            lineScale:scale,
            fontWeight:getComputedStyle(link).fontWeight,
            activeCount:document.querySelectorAll('#main-nav a[aria-current="location"]').length
          };
        });
        assert.equal(underline.current,"location",`${vp.name}: ${target.id} did not become active`);
        assert.equal(underline.activeCount,1,`${vp.name}: multiple links are marked active`);
        assert.equal(underline.fontWeight,"700",`${vp.name}: ${target.id} active link lost its emphasis`);
        assert.ok(underline.rectWidth>0&&underline.lineWidth>=underline.rectWidth*.99,
          `${vp.name}: ${target.id} underline is not full-width: ${JSON.stringify(underline)}`);
        assert.ok(underline.lineScale>=.99&&underline.lineScale<=1.01,
          `${vp.name}: ${target.id} active underline transform is not 100%: ${JSON.stringify(underline)}`);
      }
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
    results.push({ ...vp, ...state, headerShrink, headerConvergence, imageLoad, pageErrors, localErrors });
    assert.equal(pageErrors.length, 0, `${vp.name}: JavaScript errors: ${pageErrors.join(" | ")}`);
    assert.equal(localErrors.length, 0, `${vp.name}: local resource errors: ${JSON.stringify(localErrors)}`);
    console.log(`[PASS] ${vp.name}: RTL, navigation typography and states, layout, anchors, menu, motion and overflow`);
    await page.close();
  }

  // Exercise the real scroll-linked animation without reduced-motion emulation.
  for (const vp of viewports.filter(item=>item.width>920)) {
    const motionPage=await browser.newPage({
      viewport:{width:vp.width,height:vp.height},
      deviceScaleFactor:1,
      reducedMotion:"no-preference"
    });
    const motionErrors=[];
    motionPage.on("pageerror",error=>motionErrors.push(error.message));
    const motionResponse=await motionPage.goto(BASE_URL,{waitUntil:"domcontentloaded",timeout:45000});
    assert.ok(motionResponse?.ok(),`${vp.name}: scroll-motion preview did not load`);
    await motionPage.evaluate(()=>document.fonts.ready);
    await motionPage.waitForTimeout(100);
    await motionPage.evaluate(()=>{document.documentElement.style.scrollBehavior="auto";});
    await motionPage.waitForFunction(()=>{
      const header=document.querySelector(".site-header");
      return header&&Math.abs(Number.parseFloat(getComputedStyle(header).getPropertyValue("--header-progress")))<.0001;
    },null,{timeout:3000});

    const initial=await measureHeader(motionPage);
    const SCROLL_RANGE=600;
    const targets=[0,50,100,200,300,400,500,600,500,400,300,200,100,50,0];
    const samples=[];
    for(const targetY of targets){
      await motionPage.evaluate(y=>window.scrollTo(0,y),targetY);
      const raw=Math.max(0,Math.min(1,targetY/SCROLL_RANGE));
      const expected=raw*raw*(3-2*raw);
      await motionPage.waitForFunction(y=>{
        const header=document.querySelector(".site-header");
        const progress=Number.parseFloat(getComputedStyle(header).getPropertyValue("--header-progress"));
        const raw=Math.max(0,Math.min(1,y/600));
        const expected=raw*raw*(3-2*raw);
        return Math.abs(window.scrollY-y)<1&&Math.abs(progress-expected)<.00006;
      },targetY,{timeout:3000});

      const sample=await measureHeader(motionPage);
      assert.ok(Math.abs(sample.headerProgress-expected)<.00006,
        `${vp.name}: progress at scrollY=${targetY} does not follow the shared 600px smoothstep curve`);
      assert.ok(Math.abs(sample.nav.centerX-sample.headerCenter)<=1,
        `${vp.name}: central navigation drifted during scroll-linked motion`);
      assert.ok(Math.abs(sample.frameLeftPadding-initial.frameLeftPadding)<=1.5,
        `${vp.name}: frame lost synchronization with WhatsApp at progress ${expected.toFixed(3)}`);
      assert.ok(Math.abs(sample.frameRightPadding-initial.frameRightPadding)<=1.5,
        `${vp.name}: frame lost synchronization with RUWA at progress ${expected.toFixed(3)}`);
      assert.ok(sample.brandNavGap>=0&&sample.navActionGap>=0,
        `${vp.name}: header groups collided at intermediate progress ${expected.toFixed(3)}`);
      samples.push({
        scrollY:targetY,
        progress:Number(sample.headerProgress.toFixed(5)),
        brandNavGap:Number(sample.brandNavGap.toFixed(2)),
        navActionGap:Number(sample.navActionGap.toFixed(2)),
        frameLeftPadding:Number(sample.frameLeftPadding.toFixed(2)),
        frameRightPadding:Number(sample.frameRightPadding.toFixed(2))
      });
      if(targetY===300){
        await motionPage.waitForTimeout(100);
        const held=await motionPage.evaluate(()=>Number.parseFloat(
          getComputedStyle(document.querySelector(".site-header")).getPropertyValue("--header-progress")
        ));
        assert.ok(Math.abs(held-.5)<.00006,
          `${vp.name}: header kept moving after scrolling stopped halfway`);
      }
    }
    const compactIndex=targets.indexOf(SCROLL_RANGE);
    assert.ok(samples.slice(1,compactIndex+1).every((sample,index,array)=>index===0||sample.progress>array[index-1].progress),
      `${vp.name}: downward scroll progress was not monotonic`);
    assert.ok(samples.slice(compactIndex+1).every((sample,index,array)=>index===0||sample.progress<array[index-1].progress),
      `${vp.name}: upward scroll progress was not monotonic`);
    assert.equal(samples[0].progress,0,`${vp.name}: expanded state did not start at zero`);
    assert.ok(samples[1].progress<.03,`${vp.name}: first small scroll movement caused too much contraction`);
    assert.ok(samples[2].progress<.10,`${vp.name}: header contracted too much within the first 100px`);
    assert.ok(samples[3].progress>.10&&samples[3].progress<.50,`${vp.name}: header should remain partially expanded at 200px`);
    assert.ok(samples[4].progress>.49&&samples[4].progress<.51,`${vp.name}: 300px should be approximately halfway through contraction`);
    assert.equal(samples[compactIndex].progress,1,`${vp.name}: approved compact state did not end at 600px`);
    assert.equal(samples[samples.length-1].progress,0,`${vp.name}: expanded state was not restored`);
    assert.equal(motionErrors.length,0,`${vp.name}: scroll-motion JavaScript errors: ${motionErrors.join(" | ")}`);
    motionResults.push({viewport:vp.name,scrollRange:SCROLL_RANGE,curve:"smoothstep",samples});
    console.log(`[PASS] ${vp.name}: scroll-linked header motion, intermediate synchronization and reversal`);
    await motionPage.close();
  }
} catch (error) {
  failures.push(error.message);
  throw error;
} finally {
  await browser.close();
  await writeFile(`${OUT}/report.json`, JSON.stringify({ url:BASE_URL, generatedAt:new Date().toISOString(), results, motionResults, failures }, null, 2) + "\n");
}
console.log(`All ${results.length} responsive browser checks passed.`);
