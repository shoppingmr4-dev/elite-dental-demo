import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:4173/whitening-2026.html";
const OUT = "artifacts/whitening-2026";
await mkdir(OUT, { recursive: true });

const viewports = [
  { name: "mobile-320", width: 320, height: 740, mobile: true },
  { name: "mobile-360", width: 360, height: 800, mobile: true },
  { name: "mobile-390", width: 390, height: 844, mobile: true },
  { name: "mobile-430", width: 430, height: 900, mobile: true },
  { name: "tablet-768", width: 768, height: 1024, mobile: false },
  { name: "laptop-1024", width: 1024, height: 900, mobile: false },
  { name: "laptop-1280", width: 1280, height: 900, mobile: false },
  { name: "laptop-1366", width: 1366, height: 900, mobile: false },
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
    const actionElement=document.querySelector(".header-action");
    const action=rect(actionElement);
    const actionVisualHeight=Number.parseFloat(getComputedStyle(actionElement,"::before").height);
    const menuElement=document.querySelector("#menu-toggle");
    const menu=rect(menuElement);
    const menuVisible=getComputedStyle(menuElement).display!=="none" && menu.width>0 && menu.height>0;
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
      actionFontSize,actionVisualHeight,actionIcon,arabicBrandSize,brandMark,brandMarkImage,headerProgress,
      wordmarkSize:Number.parseFloat(getComputedStyle(document.querySelector(".brand-name strong")).fontSize),
      brand,nav,action,menu,menuVisible,
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
    compact: Number.parseFloat(getComputedStyle(document.querySelector(".site-header")).getPropertyValue("--header-progress")) >= 0.999
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
      const nav = document.querySelector("#main-nav");
      const toggle = document.querySelector("#menu-toggle");
      await document.fonts.load('800 48px "Cairo"', "التبييض");
      await document.fonts.load('400 16px "IBM Plex Sans Arabic"', "رعاية الأسنان");
      const heroPortrait=document.querySelector(".hero-portrait");
      const heroVisual=document.querySelector(".hero-visual");
      if(heroPortrait) await heroPortrait.decode();
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
        announcementPresent:Boolean(document.querySelector(".announcement")),
        announcementCssPresent:[...document.querySelectorAll("style")].some(style=>style.textContent.includes(".announcement")),
        headerImmediatelyAfterSkip:document.querySelector(".skip")?.nextElementSibling===document.querySelector(".site-header"),
        headerPosition:getComputedStyle(document.querySelector(".site-header")).position,
        headerRect:rect(document.querySelector(".site-header")),
        headerInnerRect:rect(document.querySelector(".header-inner")),
        heroWrapRect:rect(document.querySelector(".hero .wrap")),
        heroHeadingRect:rect(heading),
        heroActionsRect:rect(document.querySelector(".hero-actions")),
        headerPanelRadius:getComputedStyle(document.querySelector(".site-header"),"::before").borderTopLeftRadius,
        headerPanelTopInset:Number.parseFloat(getComputedStyle(document.querySelector(".site-header"),"::before").top),
        headerCompactInitially:document.querySelector(".site-header")?.classList.contains("is-compact") || false,
        headerActionHeight:rect(document.querySelector(".header-action")).height,
        headerActionText:document.querySelector(".header-action")?.innerText?.trim() || "",
        headerActionHref:document.querySelector(".header-action")?.getAttribute("href") || "",
        headerActionTag:document.querySelector(".header-action")?.tagName || "",
        headerActionHasChatIcon:Boolean(document.querySelector(".header-action svg")),
        headerActionWhatsAppIcon:Boolean(document.querySelector(".header-action .whatsapp-brand-icon")),
        contactTriggerCount:document.querySelectorAll("[data-contact-action]").length,
        demoDialogTag:document.querySelector("#contact-unavailable-dialog")?.tagName || "",
        demoDialogText:document.querySelector("#contact-unavailable-dialog")?.innerText?.replace(/\\s+/g," ").trim() || "",
        demoDialogInitialOpen:document.querySelector("#contact-unavailable-dialog")?.open || false,
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
          const icon=document.querySelector(".hero-eyebrow-icon");
          if(!rule||!number||!icon)return null;
          const style=getComputedStyle(rule),bounds=rect(rule),numberBounds=rect(number),iconBounds=rect(icon);
          const matrix=style.transform.match(/matrix\(([^)]+)\)/);
          const values=matrix?matrix[1].split(",").map(Number):[];
          const angle=values.length>=2?Math.atan2(values[1],values[0])*180/Math.PI:0;
          return {width:Number.parseFloat(style.width),height:Number.parseFloat(style.height),
            visualWidth:bounds.width,visualHeight:bounds.height,color:style.backgroundColor,angle,
            betweenNumberAndIcon:numberBounds.left>bounds.right&&bounds.left>iconBounds.right&&
              numberBounds.left-bounds.right<12&&bounds.left-iconBounds.right<12};
        })(),
        benefitTreatment:(()=>{
          const benefit=document.querySelector(".hero-title-benefit");
          if(!benefit)return null;
          const style=getComputedStyle(benefit);
          return {
            text:benefit.innerText.replace(/\s+/g," ").trim(),
            color:style.color,fontSize:style.fontSize,fontWeight:style.fontWeight,
            textDecorationLine:style.textDecorationLine,
            accentElements:benefit.querySelectorAll(".accent").length,
            underlineElements:benefit.querySelectorAll(".accent-underline,svg").length
          };
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
        eyebrowStartAligned:Boolean((()=>{
          const marker=document.querySelector(".hero-eyebrow");
          if(!marker||!copy)return false;
          const markerRect=rect(marker),copyRect=rect(copy);
          if(innerWidth<=720){
            return Math.abs((markerRect.left+markerRect.right)/2-(copyRect.left+copyRect.right)/2)<=2;
          }
          return Math.abs(markerRect.right-copyRect.right)<=2;
        })()),
        eyebrowNumberFirst:Boolean((()=>{
          const number=document.querySelector(".hero-eyebrow-index");
          const icon=document.querySelector(".hero-eyebrow-icon");
          const label=document.querySelector(".hero-eyebrow-label");
          return number&&icon&&label&&rect(number).right>=rect(icon).right&&rect(icon).right>=rect(label).right;
        })()),
        eyebrowGlassChip:(()=>{
          const badge=document.querySelector(".hero-eyebrow");
          const icon=document.querySelector(".hero-eyebrow-icon");
          if(!badge||!icon)return {valid:false,reason:"missing badge or icon"};
          const b=getComputedStyle(badge),i=getComputedStyle(icon);
          const svg=icon.querySelector("svg");
          const metrics={
            backgroundColor:b.backgroundColor,backdropFilter:b.backdropFilter,height:b.height,
            borderTopWidth:b.borderTopWidth,iconBackground:i.backgroundColor,
            iconBorderTopWidth:i.borderTopWidth,svgWidth:svg?getComputedStyle(svg).width:null
          };
          return {valid:b.backgroundColor!=="rgba(0, 0, 0, 0)"&&b.backdropFilter.includes("blur")&&
            Number.parseFloat(b.height)>=38&&Number.parseFloat(b.height)<=42&&b.borderTopWidth==="1px"&&
            i.backgroundColor==="rgba(0, 0, 0, 0)"&&i.borderTopWidth==="0px"&&
            svg&&Number.parseFloat(getComputedStyle(svg).width)<=17,...metrics};
        })(),
        allSectionMarkers:[...document.querySelectorAll(".section-marker")].map(marker=>{
          const number=marker.querySelector(".section-marker-number");
          const divider=marker.querySelector(".section-marker-divider");
          const icon=marker.querySelector(".hero-eyebrow-icon");
          const label=marker.querySelector(".section-marker-label");
          if(!number||!divider||!label)return {invalid:true,text:marker.innerText.trim()};
          const markerStyle=getComputedStyle(marker),numberStyle=getComputedStyle(number);
          const dividerStyle=getComputedStyle(divider),labelStyle=getComputedStyle(label);
          const markerBounds=rect(marker),numberBounds=rect(number),dividerBounds=rect(divider);
          const labelBounds=rect(label),iconBounds=icon?rect(icon):null;
          const matrix=dividerStyle.transform.match(/matrix\(([^)]+)\)/);
          const values=matrix?matrix[1].split(",").map(Number):[];
          const dividerAngle=values.length>=2?Math.atan2(values[1],values[0])*180/Math.PI:0;
          const context=[...marker.classList].find(name=>name.startsWith("section-marker--"))?.replace("section-marker--","")||"";
          const isHero=marker.classList.contains("hero-eyebrow");
          const rgba=value=>{
            const parts=value.match(/[\d.]+/g)?.map(Number)||[0,0,0,1];
            return [parts[0]||0,parts[1]||0,parts[2]||0,parts.length>3?parts[3]:1];
          };
          const composite=(front,back)=>{
            const a=front[3];return [0,1,2].map(index=>front[index]*a+back[index]*(1-a)).concat(1);
          };
          const luminance=value=>{
            const channels=value.slice(0,3).map(v=>v/255).map(v=>v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4));
            return .2126*channels[0]+.7152*channels[1]+.0722*channels[2];
          };
          const contrast=(foreground,background)=>{
            const l1=luminance(rgba(foreground)),l2=luminance(background);
            return (Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05);
          };
          const section=marker.closest("section");
          const sectionStyle=section?getComputedStyle(section):getComputedStyle(document.body);
          const bodyBg=rgba(getComputedStyle(document.body).backgroundColor);
          const surfaceBg=composite(rgba(sectionStyle.backgroundColor),bodyBg);
          const chipBg=composite(rgba(markerStyle.backgroundColor),surfaceBg);
          const numberBg=composite(rgba(numberStyle.backgroundColor),surfaceBg);
          const expectedCenter=markerBounds.top+markerBounds.height/2;
          return {
            number:number.innerText.trim(),label:label.innerText.trim(),context,isHero,
            markerHeight:markerBounds.height,markerWidth:markerBounds.width,
            numberWidth:numberBounds.width,numberHeight:numberBounds.height,
            numberLineHeight:numberStyle.lineHeight,
            markerPadding:markerStyle.padding,markerGap:markerStyle.gap,
            markerBorderColor:markerStyle.borderTopColor,markerShadow:markerStyle.boxShadow,
            sectionBackgroundColor:sectionStyle.backgroundColor,
            headingGap:(()=>{const heading=marker.parentElement?.querySelector("h1,h2");return heading?rect(heading).top-markerBounds.bottom:null;})(),
            numberRadius:numberStyle.borderRadius,numberBorderWidth:numberStyle.borderTopWidth,
            numberBackground:numberStyle.backgroundColor,numberColor:numberStyle.color,
            numberShadow:numberStyle.boxShadow,numberPadding:numberStyle.padding,
            numberMinWidth:numberStyle.minWidth,
            dividerWidth:dividerStyle.width,dividerHeight:dividerStyle.height,
            dividerVisualHeight:dividerBounds.height,dividerColor:dividerStyle.backgroundColor,
            dividerAngle,labelColor:labelStyle.color,
            markerBorderWidth:markerStyle.borderTopWidth,markerRadius:markerStyle.borderRadius,
            markerBackground:markerStyle.backgroundColor,backdropFilter:markerStyle.backdropFilter,
            numberAtRight:markerBounds.right-numberBounds.right>=6&&markerBounds.right-numberBounds.right<=11,
            rtlOrder:numberBounds.left>dividerBounds.right&&
              (iconBounds?dividerBounds.left>iconBounds.right&&iconBounds.left>labelBounds.right:dividerBounds.left>labelBounds.right),
            centered:Math.abs(numberBounds.top+numberBounds.height/2-expectedCenter)<=1.2&&
              Math.abs(dividerBounds.top+dividerBounds.height/2-expectedCenter)<=1.5,
            numberContrast:contrast(numberStyle.color,numberBg),
            labelContrast:contrast(labelStyle.color,chipBg)
          };
        }),
        sectionMarkerChips:[...document.querySelectorAll(".eyebrow")].map(element=>{
          const style=getComputedStyle(element),bounds=rect(element);
          return {text:element.querySelector(".section-marker-label")?.innerText.trim()||"",
            height:bounds.height,width:bounds.width,borderWidth:style.borderTopWidth,
            borderRadius:style.borderRadius,backgroundColor:style.backgroundColor,
            backdropFilter:style.backdropFilter};
        }),
        heroSecondaryCta:(()=>{
          const link=document.querySelector(".hero-actions .text-link");
          const button=document.querySelector(".hero-actions .primary-cta");
          if(!link||!button)return null;
          const lr=link.getBoundingClientRect(),br=button.getBoundingClientRect(),style=getComputedStyle(link);
          const stacked=lr.top>=br.bottom-1;
          const gap=stacked?lr.top-br.bottom:Math.max(0,br.left-lr.right,lr.left-br.right);
          return {text:link.innerText.trim(),href:link.getAttribute("href"),tag:link.tagName,
            channel:link.getAttribute("data-contact-action"),minHeight:lr.height,stacked,gap,display:style.display,flow:getComputedStyle(link.parentElement).flexDirection};
        })(),
        spacingAudit:(()=>{
          const gap=(a,b)=>{
            const first=document.querySelector(a),second=document.querySelector(b);
            if(!first||!second)return null;
            return Number((second.getBoundingClientRect().top-first.getBoundingClientRect().bottom).toFixed(2));
          };
          const style=selector=>{const element=document.querySelector(selector);return element?getComputedStyle(element):null;};
          const pad=selector=>{const s=style(selector);return s?{top:s.paddingTop,bottom:s.paddingBottom}:null;};
          return {
            hero:{padding:pad(".hero"),markerToHeading:gap(".hero-eyebrow","#hero-title"),
              headingToCopy:gap("#hero-title",".hero-lead"),copyToActions:gap(".hero-lead",".hero-actions")},
            approach:{padding:pad("#approach"),markerToHeading:gap("#approach .section-marker","#approach h2"),
              headingToCopy:gap("#approach h2","#approach .approach-intro p"),stepRowPadding:style(".step")?.padding||null,
              stepTitleToCopy:gap(".step h3",".step p")},
            causes:{padding:pad("#causes"),markerToHeading:gap("#causes .section-marker","#causes h2"),
              headingToCopy:gap("#causes h2","#causes .section-head p"),introToCards:gap("#causes .section-head",".cause-grid"),
              cardPadding:style(".info-card")?.padding||null,cardIndexToTitle:style(".info-card .card-index")?.marginBottom||null},
            options:{padding:pad("#options"),markerToHeading:gap("#options .section-marker","#options h2"),
              headingToCopy:gap("#options h2","#options .section-head p"),introToCards:gap("#options .section-head",".options-grid"),
              cardPadding:style(".option-card")?.padding||null,numberToTitle:style(".option-card .option-number")?.marginBottom||null,
              noteTopPadding:style(".option-card .option-note")?.paddingTop||null},
            suitability:{padding:pad("#suitability"),markerToHeading:gap("#suitability .section-marker","#suitability h2"),
              headingToCopy:gap("#suitability h2","#suitability .suitability-copy p"),gridGap:style(".suitability-grid")?.gap||null,
              checkItemPadding:style(".check-item")?.padding||null,noteMargin:style(".clinical-note")?.marginTop||null},
            expectations:{padding:pad("#expectations"),markerToHeading:gap("#expectations .section-marker","#expectations h2"),
              headingToCopy:gap("#expectations h2","#expectations .section-head p"),
              introToCards:gap("#expectations .section-head",".expect-grid"),cardPadding:style(".expect-card")?.padding||null},
            faq:{padding:pad("#faq"),markerToHeading:gap("#faq .section-marker","#faq h2"),
              headingToCopy:gap("#faq h2","#faq .section-head p"),introToList:gap("#faq .section-head",".faq-list"),
              summaryPadding:style(".faq-item summary")?.padding||null,answerPadding:style(".faq-answer")?.padding||null,
              referenceMargin:style(".reference-note")?.marginTop||null},
            contactFooter:{paddingBottom:style(".contact-section")?.paddingBottom||null,
              contactToFooter:gap(".contact-band",".footer"),contactGridGap:style(".contact-band")?.gap||null,
              contactActionsGap:style(".contact-actions")?.gap||null}
          };
        })(),
        copy:copy ? rect(copy) : null,
        heroCopyLayoutValid:Boolean(copy && (() => {
          const copyRect=rect(copy),wrapRect=rect(document.querySelector(".hero .wrap")),gridRect=rect(document.querySelector(".hero-grid"));
          const withinWrap=copyRect.left>=wrapRect.left-1&&copyRect.right<=wrapRect.right+1;
          const centered=Math.abs((copyRect.left+copyRect.right)/2-(wrapRect.left+wrapRect.right)/2)<=2;
          const alignedToRightColumn=Math.abs(copyRect.right-gridRect.right)<=2;
          return withinWrap&&(innerWidth<=720?centered:alignedToRightColumn);
        })()),
        heroVisualNodeCount:document.querySelectorAll(".photo-frame,.visual-backdrop,.visual-outline,.visual-index,.visual-caption,.visual-side-note,.photo-label").length,
        imageCount:document.querySelectorAll(".hero img").length,
        heroImageLoaded:Boolean(heroPortrait?.complete&&heroPortrait.naturalWidth===768&&heroPortrait.naturalHeight===1152),
        heroTitleKickerColor:getComputedStyle(document.querySelector(".hero-title-kicker")).color,
        heroLeadFontSize:Number.parseFloat(getComputedStyle(document.querySelector(".hero-lead")).fontSize),
        heroLeadLineHeight:Number.parseFloat(getComputedStyle(document.querySelector(".hero-lead")).lineHeight),
        heroCaptionFontSize:Number.parseFloat(getComputedStyle(document.querySelector(".hero-portrait-caption")).fontSize),
        heroNumbersFontVariant:getComputedStyle(document.querySelector(".hero-eyebrow-index")).fontVariantNumeric,
        heroImageVisible:Boolean(heroPortrait&&(()=>{
          const r=heroPortrait.getBoundingClientRect(),s=getComputedStyle(heroPortrait);
          return r.width>0&&r.height>0&&s.display!=="none"&&s.visibility==="visible"&&Number(s.opacity)>.99;
        })()),
        heroImageRect:heroPortrait?rect(heroPortrait):null,
        heroImageSrc:heroPortrait?.getAttribute("src")||"",
        heroImageNaturalWidth:heroPortrait?.naturalWidth||0,
        heroImageNaturalHeight:heroPortrait?.naturalHeight||0,
        heroImageAlt:heroPortrait?.getAttribute("alt")||"",
        heroImageLoading:heroPortrait?.getAttribute("loading")||"",
        heroImageFetchPriority:heroPortrait?.getAttribute("fetchpriority")||"",
        heroImageDeclaredWidth:Number(heroPortrait?.getAttribute("width")||0),
        heroImageDeclaredHeight:Number(heroPortrait?.getAttribute("height")||0),
        heroImageParentTag:heroPortrait?.parentElement?.tagName||"",
        heroImageParentClass:typeof heroPortrait?.parentElement?.className==="string"?heroPortrait.parentElement.className:"",
        heroVisualRect:heroVisual?rect(heroVisual):null,
        heroVisualMinHeight:heroVisual?getComputedStyle(heroVisual).minHeight:"",
        heroVisualPadding:heroVisual?getComputedStyle(heroVisual).padding:"",
        heroImageObjectPosition:heroPortrait?getComputedStyle(heroPortrait).objectPosition:"",
        heroImageObjectFit:heroPortrait?getComputedStyle(heroPortrait).objectFit:"",
        heroImageTiltDegrees:(()=>{if(!heroPortrait)return 0;const transform=getComputedStyle(heroPortrait).transform;if(transform==="none")return 0;const values=transform.slice(transform.indexOf("(")+1,-1).split(",").map(Number);return values.length===6?Math.atan2(values[1],values[0])*180/Math.PI:0;})(),
        heroImagePreloadPresent:[...document.querySelectorAll('link[rel="preload"][as="image"]')].some(link=>new URL(link.href).pathname.endsWith("/assets/ruwa-hero-90-768.webp")),
        heroImageMarkupReferencePresent:Boolean(document.querySelector(".hero")?.innerHTML.includes("assets/ruwa-hero-90-768.webp")),
        heroImageTransparentPixelAlpha:(()=>{
          try{
            const canvas=document.createElement("canvas");
            canvas.width=heroPortrait.naturalWidth;canvas.height=heroPortrait.naturalHeight;
            const context=canvas.getContext("2d",{willReadFrequently:true});
            context.drawImage(heroPortrait,0,0);
            return context.getImageData(0,0,1,1).data[3];
          }catch{return -1;}
        })(),
        heroImageDisclosurePresent:document.body.innerText.includes("الصورة توضيحية مولّدة بالذكاء الاصطناعي، ولا تمثل طبيبًا حقيقيًا."),
        heroBottomItemCount:document.querySelectorAll(".hero-bottom-item").length,
        heroLegacyCssPresent:[".photo-frame",".visual-backdrop",".visual-outline",".visual-index",".visual-caption",".visual-side-note",".photo-label","photoEnter"].some(selector=>
          [...document.querySelectorAll("style")].some(style=>style.textContent.includes(selector))),
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
        navDisplay:nav ? getComputedStyle(nav).display : "missing",
        toggleDisplay:toggle ? getComputedStyle(toggle).display : "missing",
        toggleExpanded:toggle?.getAttribute("aria-expanded"),
        pageSectionOrder:[...document.querySelectorAll("main > section")].map(section=>section.id),
        duplicateIds:(()=>{const values=[...document.querySelectorAll("[id]")].map(element=>element.id);return [...new Set(values.filter((id,index)=>values.indexOf(id)!==index))]})(),
        anchors:[...document.querySelectorAll('a[href^="#"]')].map(a=>a.getAttribute("href").slice(1)).filter(Boolean),
        missingAnchors:[...document.querySelectorAll('a[href^="#"]')].map(a=>a.getAttribute("href").slice(1)).filter(id=>id && !document.getElementById(id)),
        scrollWidth:document.documentElement.scrollWidth,
        clientWidth:document.documentElement.clientWidth,
        skipLink:Boolean(document.querySelector("a.skip[href='#main']")),
        reducedMotion:matchMedia("(prefers-reduced-motion: reduce)").matches && Number.parseFloat(getComputedStyle(copy).animationDuration) <= 0.00002,
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
        finalWhatsAppButton:Boolean(document.querySelector('#consultation [data-contact-action="whatsapp"]')),
         finalPhoneButton:Boolean(document.querySelector('#consultation [data-contact-action="phone"]')),
         contactChannelCounts:{
           whatsapp:document.querySelectorAll('[data-contact-action="whatsapp"]').length,
           phone:document.querySelectorAll('[data-contact-action="phone"]').length
         },
        contactHasDeadEnd:Boolean(document.querySelector("#consultation a[href=\"#top\"]")),
        contentSections:["approach","causes","options","suitability","expectations","faq","consultation"].map(id=>Boolean(document.getElementById(id))),
        optionCards:document.querySelectorAll(".option-card").length,
        causeCards:document.querySelectorAll(".info-card").length,
        faqItems:document.querySelectorAll(".faq-item").length,
        clinicalReferences:[...document.querySelectorAll(".reference-note a")].map(a=>a.href),
        contrastChecks:(()=>{
          const parseColor=value=>{
            const normalized=value.trim();
            if(normalized==="transparent")return [0,0,0,0];
            const hex=normalized.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
            if(hex){
              const raw=hex[1].length===3?hex[1].split("").map(ch=>ch+ch).join(""):hex[1];
              return [parseInt(raw.slice(0,2),16),parseInt(raw.slice(2,4),16),parseInt(raw.slice(4,6),16),1];
            }
            const values=normalized.match(/[\d.]+/g)?.map(Number)||[];
            if(values.length<3)return [0,0,0,0];
            return [values[0],values[1],values[2],values.length>3?values[3]:1];
          };
          const composite=(front,back)=>{
            const alpha=front[3],out=alpha+back[3]*(1-alpha);
            if(out<=0)return [0,0,0,0];
            return [0,1,2].map(i=>(front[i]*alpha+back[i]*back[3]*(1-alpha))/out).concat(out);
          };
          const luminance=rgba=>{
            const rgb=rgba.slice(0,3).map(v=>v/255).map(v=>v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4);
            return 0.2126*rgb[0]+0.7152*rgb[1]+0.0722*rgb[2];
          };
          const parseLength=(value,reference)=>{
            if(!value||value==="auto")return null;
            if(value.endsWith("%"))return Number.parseFloat(value)*reference/100;
            const number=Number.parseFloat(value);
            return Number.isFinite(number)?number:null;
          };
          const textBounds=element=>{
            const walker=document.createTreeWalker(element,NodeFilter.SHOW_TEXT);
            const rects=[];
            while(walker.nextNode()){
              const node=walker.currentNode;
              if(!node.nodeValue.trim())continue;
              const range=document.createRange();
              range.selectNodeContents(node);
              for(const rect of range.getClientRects()){
                if(rect.width>0&&rect.height>0)rects.push(rect);
              }
            }
            if(!rects.length)return null;
            return {
              left:Math.min(...rects.map(rect=>rect.left)),
              right:Math.max(...rects.map(rect=>rect.right)),
              top:Math.min(...rects.map(rect=>rect.top)),
              bottom:Math.max(...rects.map(rect=>rect.bottom))
            };
          };
          const pseudoBounds=(element,style)=>{
            if(style.position!=="absolute")return {unresolved:"pseudo-element is not absolutely positioned"};
            const ownerRect=element.getBoundingClientRect();
            const containingBlock={
              left:ownerRect.left+element.clientLeft,
              top:ownerRect.top+element.clientTop,
              width:element.clientWidth,
              height:element.clientHeight
            };
            const contentWidth=parseLength(style.width,containingBlock.width);
            const contentHeight=parseLength(style.height,containingBlock.height);
            if(contentWidth===null||contentHeight===null||contentWidth<=0||contentHeight<=0){
              return {unresolved:"pseudo-element has an unresolved or empty used size"};
            }
            const horizontalPadding=parseLength(style.paddingLeft,0)+parseLength(style.paddingRight,0);
            const verticalPadding=parseLength(style.paddingTop,0)+parseLength(style.paddingBottom,0);
            const horizontalBorder=parseLength(style.borderLeftWidth,0)+parseLength(style.borderRightWidth,0);
            const verticalBorder=parseLength(style.borderTopWidth,0)+parseLength(style.borderBottomWidth,0);
            const width=style.boxSizing==="border-box"?contentWidth:contentWidth+horizontalPadding+horizontalBorder;
            const height=style.boxSizing==="border-box"?contentHeight:contentHeight+verticalPadding+verticalBorder;
            const leftInset=parseLength(style.left,containingBlock.width);
            const rightInset=parseLength(style.right,containingBlock.width);
            const topInset=parseLength(style.top,containingBlock.height);
            const bottomInset=parseLength(style.bottom,containingBlock.height);
            if((leftInset===null&&rightInset===null)||(topInset===null&&bottomInset===null)){
              return {unresolved:"pseudo-element has an unresolved static position"};
            }
            const marginLeft=parseLength(style.marginLeft,0)||0;
            const marginTop=parseLength(style.marginTop,0)||0;
            const left=containingBlock.left+(leftInset!==null?leftInset:containingBlock.width-rightInset-width)+marginLeft;
            const top=containingBlock.top+(topInset!==null?topInset:containingBlock.height-bottomInset-height)+marginTop;
            let corners=[
              [left,top],[left+width,top],[left,top+height],[left+width,top+height]
            ];
            const transform=style.transform;
            if(transform&&transform!=="none"){
              const matrix=transform.match(/^matrix\(([^)]+)\)$/);
              if(!matrix)return {unresolved:"pseudo-element uses a transform that the geometry audit cannot resolve: "+transform};
              const values=matrix[1].split(",").map(Number);
              if(values.length!==6||!values.every(Number.isFinite))return {unresolved:"pseudo-element transform matrix is invalid"};
              const [a,b,c,d,e,f]=values;
              const origins=style.transformOrigin.split(/\s+/);
              const originX=parseLength(origins[0],width);
              const originY=parseLength(origins[1],height);
              if(originX===null||originY===null)return {unresolved:"pseudo-element transform origin is unresolved"};
              corners=corners.map(([x,y])=>{
                const localX=x-left-originX,localY=y-top-originY;
                return [
                  left+originX+a*localX+c*localY+e,
                  top+originY+b*localX+d*localY+f
                ];
              });
            }
            return {
              left:Math.min(...corners.map(point=>point[0])),
              right:Math.max(...corners.map(point=>point[0])),
              top:Math.min(...corners.map(point=>point[1])),
              bottom:Math.max(...corners.map(point=>point[1])),
              width,height
            };
          };
          const splitCssList=value=>{
            const parts=[];
            let depth=0,start=0;
            for(let index=0;index<value.length;index++){
              if(value[index]==="(")depth++;
              else if(value[index]===")")depth--;
              else if(value[index]===","&&depth===0){parts.push(value.slice(start,index).trim());start=index+1;}
            }
            parts.push(value.slice(start).trim());
            return parts.filter(Boolean);
          };
          const gradientStopColors=layer=>{
            if(!/^(repeating-)?(linear|radial|conic)-gradient\(/i.test(layer.trim()))return null;
            const tokens=layer.match(/rgba?\([^)]*\)|#[0-9a-f]{3,8}\b|transparent/gi)||[];
            const colors=tokens.map(parseColor).filter(color=>color[3]>0);
            return colors.length?colors:null;
          };
          const effectiveBackground=element=>{
            const ancestry=[];
            for(let node=element;node&&node!==document.documentElement;node=node.parentElement)ancestry.push(node);
            let backgrounds=[[255,255,255,1]];
            const sources=[];
            for(const node of ancestry.reverse()){
              const style=getComputedStyle(node);
              const color=parseColor(style.backgroundColor);
              if(color[3]>0){
                backgrounds=backgrounds.map(background=>composite(color,background));
                sources.push(node.tagName.toLowerCase()+(node.id?"#"+node.id:"")+" background");
              }
              const blendModes=splitCssList(style.backgroundBlendMode);
              if(blendModes.some(mode=>mode!=="normal")){
                return {backgrounds,source:sources.join(" → "),unresolved:"non-normal CSS background blending on "+node.tagName.toLowerCase()+": "+style.backgroundBlendMode};
              }
              if(style.backgroundImage!=="none"){
                const imageLayers=splitCssList(style.backgroundImage).filter(layer=>layer!=="none");
                // CSS paints the first listed image on top, so resolve the image stack back-to-front.
                for(const layer of imageLayers.reverse()){
                  const stops=gradientStopColors(layer);
                  if(!stops){
                    return {backgrounds,source:sources.join(" → "),unresolved:"unsupported background image behind text: "+layer};
                  }
                  backgrounds=backgrounds.flatMap(background=>stops.map(stop=>composite(stop,background)));
                  if(backgrounds.length>64){
                    const unique=new Map(backgrounds.map(background=>[background.map(value=>Math.round(value*1000)/1000).join(","),background]));
                    backgrounds=[...unique.values()].slice(0,64);
                  }
                  sources.push("gradient stop envelope on "+node.tagName.toLowerCase());
                }
              }
            }
            const text=textBounds(element);
            // Hidden links and collapsed disclosure content have no rendered text pixels;
            // retain their computed text/background check but do not invent pseudo-element overlap geometry.
            if(!text)return {backgrounds,source:sources.join(" → ")||"default canvas"};
            for(const pseudo of ["::before","::after"]){
              const style=getComputedStyle(element,pseudo);
              if(style.display==="none"||style.visibility!=="visible"||style.content==="none"||style.content==="normal")continue;
              const pseudoColor=parseColor(style.backgroundColor);
              const hasImage=style.backgroundImage!=="none";
              if(pseudoColor[3]<=0&&!hasImage)continue;
              // In-flow ::before/::after nodes are adjacent content, not a backdrop painted behind
              // the host element's text. Only transformed/negatively offset in-flow pseudos are ambiguous.
              if(style.position!=="absolute"){
                const margins=[style.marginTop,style.marginRight,style.marginBottom,style.marginLeft].map(value=>Number.parseFloat(value)||0);
                const canOverlap=style.transform!=="none"||style.translate!=="none"||margins.some(value=>value<0);
                if(canOverlap){
                  return {backgrounds,source:"ambiguous "+pseudo+" in-flow paint",unresolved:"in-flow pseudo-element has a transform or negative margin that could overlap host text"};
                }
                continue;
              }
              const box=pseudoBounds(element,style);
              if(box.unresolved){
                return {backgrounds,source:sources.join(" → "),unresolved:pseudo+" has a visible background but its painted geometry is unresolved: "+box.unresolved};
              }
              const overlaps=box.right>text.left&&box.left<text.right&&box.bottom>text.top&&box.top<text.bottom;
              if(!overlaps)continue;
              const covers=box.left<=text.left+0.75&&box.right>=text.right-0.75&&box.top<=text.top+0.75&&box.bottom>=text.bottom-0.75;
              const ownerStyle=getComputedStyle(element);
              const zIndex=Number.parseInt(style.zIndex,10);
              const createsStackingContext=ownerStyle.isolation==="isolate"||
                Number.parseFloat(ownerStyle.opacity)<1||
                ownerStyle.transform!=="none"||
                ownerStyle.filter!=="none"||
                ownerStyle.perspective!=="none"||
                ((ownerStyle.position==="fixed"||ownerStyle.position==="sticky")&&ownerStyle.zIndex!=="auto")||
                (ownerStyle.position!=="static"&&ownerStyle.zIndex!=="auto");
              const isBehindText=Number.isFinite(zIndex)&&zIndex<0&&createsStackingContext;
              const diagnostic={
                pseudo,
                bounds:{left:Number(box.left.toFixed(2)),right:Number(box.right.toFixed(2)),top:Number(box.top.toFixed(2)),bottom:Number(box.bottom.toFixed(2))},
                textBounds:{left:Number(text.left.toFixed(2)),right:Number(text.right.toFixed(2)),top:Number(text.top.toFixed(2)),bottom:Number(text.bottom.toFixed(2))},
                color:style.backgroundColor,opacity:style.opacity,zIndex:style.zIndex,
                ownerIsolation:ownerStyle.isolation,coversTextBounds:covers
              };
              if(!covers)return {backgrounds,source:"ambiguous "+pseudo+" background",unresolved:"pseudo-element overlaps but does not fully cover the text bounds: "+JSON.stringify(diagnostic)};
              if(hasImage)return {backgrounds,source:"ambiguous "+pseudo+" background image",unresolved:"pseudo-element background image cannot be reduced to a single verified color: "+JSON.stringify(diagnostic)};
              if(!isBehindText)return {backgrounds,source:"ambiguous "+pseudo+" paint order",unresolved:"pseudo-element paint order relative to text is not proven: "+JSON.stringify(diagnostic)};
              const opacity=Math.max(0,Math.min(1,Number.parseFloat(style.opacity)));
              pseudoColor[3]*=Number.isFinite(opacity)?opacity:1;
              backgrounds=backgrounds.map(background=>composite(pseudoColor,background));
              sources.push(element.tagName.toLowerCase()+(element.className&&typeof element.className==="string"?"."+element.className.trim().split(/\s+/).join("."):"")+pseudo+" background ("+style.backgroundColor+"; z-index "+style.zIndex+")");
              break;
            }
            return {backgrounds,source:sources.join(" → ")||"default canvas"};
          };
          const selectors=[
            ".hero h1",".hero-title-benefit",".hero-lead",".nav a",".header-action",
            ".primary-cta",".consultation-cta","#approach .step p","#causes .info-card p",
            "#options .option-card p","#options .option-card .option-note",
            "#suitability .suitability-copy p","#suitability .check-item p",
            "#expectations .expect-card p","#faq .faq-item summary","#faq .faq-answer",
            "#faq .reference-note","#consultation .contact-action--whatsapp",
             "#consultation .contact-action--phone","#consultation .contact-privacy-note",".footer"
          ];
          return selectors.map(selector=>{
            const el=document.querySelector(selector);
            if(!el)return {selector,ratio:0,missing:true};
            const resolved=effectiveBackground(el);
            if(resolved.unresolved)return {selector,ratio:0,missing:true,backgroundSource:resolved.source,unresolved:resolved.unresolved};
            const foregroundColor=parseColor(getComputedStyle(el).color);
            const contrastCandidates=resolved.backgrounds.map(background=>{
              const foreground=composite(foregroundColor,background);
              const a=luminance(foreground),b=luminance(background);
              return {background,ratio:(Math.max(a,b)+0.05)/(Math.min(a,b)+0.05)};
            });
            const worst=contrastCandidates.reduce((minimum,candidate)=>candidate.ratio<minimum.ratio?candidate:minimum,contrastCandidates[0]);
            return {
              selector,
              ratio:Number(worst.ratio.toFixed(3)),
              foreground:getComputedStyle(el).color,
              background:worst.background.map(v=>Math.round(v)).slice(0,3),
              backgroundSource:resolved.source,
              gradientCandidatesEvaluated:contrastCandidates.length
            };
          });
        })(),
        viewport:window.innerWidth
      };
    });

    assert.equal(state.lang, "ar-SA", `${vp.name}: Arabic language metadata missing`);
    assert.equal(state.announcementPresent, false, `${vp.name}: the top announcement element must be completely removed`);
    assert.equal(state.announcementCssPresent, false, `${vp.name}: obsolete announcement CSS must be removed`);
    assert.equal(state.headerImmediatelyAfterSkip, true, `${vp.name}: floating header must directly follow the skip link with no reserved announcement band`);
    assert.ok(state.headerRect.top>=0&&state.headerRect.top<=12, `${vp.name}: header should begin at the top without an empty announcement gap: ${JSON.stringify(state.headerRect)}`);
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
    assert.equal(state.contactTriggerCount, 5, `${vp.name}: all five WhatsApp and phone actions must use the shared unavailable-contact dialog`);
    assert.equal(state.demoDialogTag, "DIALOG", `${vp.name}: accessible native dialog is missing`);
    assert.equal(state.demoDialogInitialOpen, false, `${vp.name}: demo dialog should start closed`);
    assert.ok(state.demoDialogText.includes("قنوات التواصل ستعمل مباشرة عند إضافة بيانات الاتصال الرسمية"), `${vp.name}: contact dialog initial explanation is missing`);
    assert.ok(state.demoDialogText.includes("لن يتم فتح محادثة أو بدء اتصال قبل إعداد رقم صحيح"), `${vp.name}: unavailable contact destinations must be disclosed`);
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
    assert.equal(state.heroTitleKickerColor, "rgb(48, 74, 84)", `${vp.name}: the introductory headline line must stay in the calm secondary ink tone`);
    assert.equal(state.heroCaptionFontSize, 12, `${vp.name}: the AI image disclosure must remain comfortably readable`);
    assert.ok(state.heroNumbersFontVariant.includes("tabular-nums"), `${vp.name}: numbered labels must use consistent tabular figures`);
    if (vp.width <= 720) {
      assert.ok(state.heroLeadFontSize >= 16, `${vp.name}: mobile supporting copy must be at least 16px`);
      assert.ok(state.heroLeadLineHeight >= 29 && state.heroLeadLineHeight <= 31, `${vp.name}: mobile supporting-copy line height must preserve Arabic readability`);
    }

    assert.equal(state.redundantHeroNotesPresent, false, `${vp.name}: repetitive hero notes should be removed`);
    assert.equal(state.headlineLines, 3, `${vp.name}: headline must use the intended three-level composition`);
    assert.equal(state.headlineKicker, "اكتشف خيارات", `${vp.name}: headline introduction changed`);
    assert.equal(state.headlineService, "تبييض الأسنان", `${vp.name}: primary service phrase changed`);
    assert.equal(state.headlineBenefit, "لابتسامة أكثر إشراقًا", `${vp.name}: headline benefit phrase changed`);
    assert.equal(state.headlineOverflow, false, `${vp.name}: headline content overflows its box`);
    assert.ok(state.headingVisible, `${vp.name}: headline is not visible`);
    if (vp.width > 720) {
      assert.ok(state.heroHeadingRect.top - state.heroWrapRect.top <= 150,
        vp.name + ": Hero headline is too far below the first-view content edge (" +
        Math.round(state.heroHeadingRect.top - state.heroWrapRect.top) + "px)");
      assert.ok(state.heroActionsRect.bottom <= state.headerRect.bottom + vp.height * 0.72,
        vp.name + ": Hero actions are too low in the first viewport");
    }
    assert.equal(state.eyebrowLabel, "دليل الابتسامة", `${vp.name}: hero eyebrow label changed`);
    assert.equal(state.eyebrowIndex, "01", `${vp.name}: hero eyebrow sequence marker is missing`);
    assert.ok(state.eyebrowToothIcon, `${vp.name}: dental tooth icon is missing`);
    assert.ok(state.eyebrowStartAligned, `${vp.name}: hero eyebrow alignment does not match the responsive text composition`);
    assert.ok(state.eyebrowNumberFirst, `${vp.name}: section number is not first at the RTL line start`);
    assert.ok(state.eyebrowGlassChip.valid, `${vp.name}: eyebrow glass chip failed: ${JSON.stringify(state.eyebrowGlassChip)}`);
    assert.ok(state.eyebrowRule && state.eyebrowRule.betweenNumberAndIcon,
      vp.name + ": Hero vertical separator must sit between the plain-text 01 and tooth icon: " + JSON.stringify(state.eyebrowRule));
    assert.ok(state.eyebrowRule.width>=1.9&&state.eyebrowRule.width<=2.1&&
      state.eyebrowRule.height>=14.2&&state.eyebrowRule.height<=14.6,
      vp.name + ": Hero separator must match the 01 text height at approximately 14.4px: " + JSON.stringify(state.eyebrowRule));
    assert.ok(state.eyebrowRule.angle>=6&&state.eyebrowRule.angle<=10,
      vp.name + ": Hero separator must have the approved subtle 6–10 degree vertical tilt: " + JSON.stringify(state.eyebrowRule));
    assert.equal(state.eyebrowRule.color,"rgb(24, 122, 128)",vp.name + ": Hero separator must use RUWA teal");
    assert.ok(state.benefitTreatment,vp.name + ": the patient-benefit line is missing");
    assert.equal(state.benefitTreatment.text,"لابتسامة أكثر إشراقًا",vp.name + ": complete patient-benefit phrase changed");
    assert.equal(state.benefitTreatment.color,"rgb(24, 122, 128)",vp.name + ": complete benefit line must use RUWA Teal");
    assert.equal(state.benefitTreatment.textDecorationLine,"none",vp.name + ": benefit line must not acquire a decorative underline");
    assert.equal(state.benefitTreatment.accentElements,0,vp.name + ": the benefit phrase must not contain an isolated accent span");
    assert.equal(state.benefitTreatment.underlineElements,0,vp.name + ": the benefit phrase must not contain a decorative SVG underline");
    assert.equal(state.sectionMarkerChips.length,6,vp.name + ": all six content section markers must retain the shared glass component");
    assert.ok(state.sectionMarkerChips.every(chip=>chip.height>=42&&chip.height<=46&&chip.borderWidth==="1px"&&
      chip.borderRadius==="999px"&&chip.backgroundColor!=="rgba(0, 0, 0, 0)"&&chip.backdropFilter.includes("blur")),
      vp.name + ": all six section marker glass frames must share compact dimensions and translucency: " + JSON.stringify(state.sectionMarkerChips));
    const expectedMarkers=[
      {number:"01",label:"دليل الابتسامة",context:"hero"},
      {number:"02",label:"خطوات التقييم",context:"paper"},
      {number:"03",label:"فهم اللون",context:"paper"},
      {number:"04",label:"الخيارات المتاحة",context:"canvas"},
      {number:"05",label:"قبل اتخاذ القرار",context:"paper"},
      {number:"06",label:"توقعات واقعية",context:"dark"},
      {number:"07",label:"إجابات واضحة",context:"canvas"}
    ];
    assert.equal(state.allSectionMarkers.length,7,vp.name + ": all seven numbered markers must be present");
    assert.deepEqual(state.allSectionMarkers.map(({number,label,context})=>({number,label,context})),expectedMarkers,
      vp.name + ": all seven numbers, Arabic labels, and contextual surfaces must match the approved sequence");
    assert.ok(state.allSectionMarkers.every(marker=>{
      const approvedCapsule=marker.isHero
        ? marker.markerHeight>=38&&marker.markerHeight<=42&&marker.markerPadding==="4px 10px"&&marker.markerGap==="7px"
        : marker.markerHeight>=42&&marker.markerHeight<=46&&marker.markerPadding==="4px 8px"&&marker.markerGap==="8px";
      return approvedCapsule&&
        marker.numberWidth>=10&&marker.numberWidth<=22&&
        marker.numberHeight>=12&&marker.numberHeight<=18&&
        marker.numberRadius==="0px"&&marker.numberBorderWidth==="0px"&&
        marker.numberBackground==="rgba(0, 0, 0, 0)"&&
        marker.numberShadow==="none"&&marker.numberPadding==="0px"&&
        marker.numberMinWidth==="0px"&&
        marker.numberAtRight&&marker.rtlOrder&&marker.centered&&
        marker.dividerWidth==="2px"&&Math.abs(Number.parseFloat(marker.dividerHeight)-14.4)<.05&&
        Math.abs(marker.dividerVisualHeight-marker.numberHeight)<=.6&&
        Math.abs(Number.parseFloat(marker.numberLineHeight)-14.4)<.05&&
        marker.dividerAngle>=6&&marker.dividerAngle<=10&&
        marker.markerBorderWidth==="1px"&&marker.markerRadius==="999px"&&
        marker.backdropFilter.includes("blur")&&
        marker.numberContrast>=4.5&&marker.labelContrast>=4.5;
    }),vp.name + ": plain-text number geometry, capsule spacing, RTL order, vertical rule, glass frame, or AA contrast failed: " + JSON.stringify(state.allSectionMarkers));
    assert.equal(state.heroBackgroundHarmony.canvas,"#F4F7FA",`${vp.name}: canvas token drifted`);
    assert.equal(state.heroBackgroundHarmony.paper,"#FFFFFF",`${vp.name}: paper token drifted`);
    assert.equal(state.heroBackgroundHarmony.body,"rgb(244, 247, 250)",`${vp.name}: page canvas is no longer the intended soft mist tone`);
    assert.equal(state.heroBackgroundHarmony.headerSurface,"rgba(255, 255, 255, 0.93)",`${vp.name}: glass header surface changed`);
    assert.equal(state.heroBackgroundHarmony.headerBorder,"rgba(220, 229, 234, 0.92)",`${vp.name}: glass header border changed`);
    assert.equal(state.heroBackgroundHarmony.heroBottom,"rgba(0, 0, 0, 0)",`${vp.name}: frameless Hero topic navigation gained an unintended background`);
    assert.equal(state.heroBackgroundHarmony.approach,"rgb(255, 255, 255)",`${vp.name}: next section surface changed`);
    assert.ok(state.heroBackgroundHarmony.heroGradients.includes("radial-gradient"),
      `${vp.name}: subtle hero background gradients are missing`);
    assert.ok(state.headingFont.includes("Cairo"), `${vp.name}: expected Cairo headline font`);
    assert.ok(state.bodyFont.includes("IBM Plex Sans Arabic"), `${vp.name}: expected IBM Plex Sans Arabic body font`);
    assert.ok(state.headingFontLoaded, `${vp.name}: local Cairo heading font failed to load`);
    assert.ok(state.bodyFontLoaded, `${vp.name}: local IBM Plex Sans Arabic font failed to load`);
    assert.equal(state.imageCount, 1, `${vp.name}: Hero must contain exactly one approved dentist portrait`);
    assert.equal(state.heroImageLoaded, true, `${vp.name}: approved local Hero portrait failed to load at its intrinsic size`);
    assert.equal(state.heroImageVisible, true, `${vp.name}: Hero portrait is hidden or has zero rendered dimensions`);
    assert.ok(state.heroImageRect.width>0&&state.heroImageRect.height>0, `${vp.name}: Hero portrait has no rendered area`);
    const minimumPortraitWidth = vp.width <= 320 ? 270 : vp.width <= 390 ? 280 : vp.width <= 720 ? 290 : vp.width <= 920 ? 270 : 320;
    assert.ok(state.heroImageRect.width >= minimumPortraitWidth, `${vp.name}: portrait should render at least ${minimumPortraitWidth}px wide; got ${state.heroImageRect.width.toFixed(1)}px`);
    assert.equal(state.heroImageSrc, "assets/ruwa-hero-90-768.webp", `${vp.name}: Hero portrait must use the approved local asset`);
    assert.equal(state.heroImageNaturalWidth, 768, `${vp.name}: Hero portrait intrinsic width changed unexpectedly`);
    assert.equal(state.heroImageNaturalHeight, 1152, `${vp.name}: Hero portrait intrinsic height changed unexpectedly`);
    assert.equal(state.heroImageDeclaredWidth, 768, `${vp.name}: the approved Hero image width attribute must remain unchanged`);
    assert.equal(state.heroImageDeclaredHeight, 1152, `${vp.name}: the approved Hero image height attribute must remain unchanged`);
    assert.equal(state.heroImageParentTag, "FIGURE", `${vp.name}: the approved Hero image must remain inside its original figure`);
    assert.equal(state.heroImageParentClass, "hero-visual", `${vp.name}: the approved Hero image must remain inside .hero-visual`);
    assert.equal(state.heroImageObjectPosition, "50% 100%", `${vp.name}: the approved Hero image focal positioning changed`);
    assert.ok(state.heroImageAlt.includes("طبيب أسنان")&&state.heroImageAlt.includes("مولّد بالذكاء الاصطناعي"), `${vp.name}: Arabic AI portrait alternative text is missing`);
    assert.equal(state.heroImageLoading, "eager", `${vp.name}: above-the-fold portrait must not lazy-load`);
    assert.equal(state.heroImageFetchPriority, "high", `${vp.name}: Hero portrait fetch priority is not high`);
    assert.equal(state.heroImageObjectFit, "contain", `${vp.name}: portrait must preserve its full transparent cutout`);
    const minInwardTilt = vp.width <= 390 ? 0.2 : vp.width <= 720 ? 0.4 : vp.width <= 920 ? 0.6 : 0.9;
    assert.ok(state.heroImageTiltDegrees >= minInwardTilt && state.heroImageTiltDegrees <= 3.2, `${vp.name}: portrait should lean gently toward the adjacent copy; got ${state.heroImageTiltDegrees.toFixed(2)}deg`);
    assert.equal(state.heroImagePreloadPresent, true, `${vp.name}: Hero portrait preload is missing`);
    assert.equal(state.heroImageMarkupReferencePresent, true, `${vp.name}: Hero markup does not reference the approved local portrait`);
    assert.equal(state.heroImageTransparentPixelAlpha, 0, `${vp.name}: Hero portrait corner is not transparently rendered`);
    assert.equal(state.heroImageDisclosurePresent, true, `${vp.name}: exact Arabic AI-generated image disclosure is missing`);
    assert.equal(state.heroVisualNodeCount, 0, `${vp.name}: deleted Hero frame/decorative nodes remain`);
    assert.equal(state.heroLegacyCssPresent, false, `${vp.name}: obsolete Hero image CSS remains`);
    assert.equal(state.heroBottomItemCount, 3, `${vp.name}: the three approved Hero principles must remain`);
    assert.equal(state.heroCopyLayoutValid, true, `${vp.name}: Hero copy is not aligned within its approved responsive column`);
    assert.equal(state.ctaHref, "", `${vp.name}: demo hero CTA must not navigate to an unrelated section`);
    assert.equal(state.heroCtaText, "تواصل عبر واتساب", vp.name + ": hero CTA copy is incorrect");
    assert.ok(state.heroSecondaryCta, vp.name + ": the secondary consultation link must remain visible");
    assert.equal(state.heroSecondaryCta.text, "اتصل بالعيادة", vp.name + ": secondary phone CTA wording changed");
    assert.equal(state.heroSecondaryCta.href, null, vp.name + ": phone CTA must not contain a fabricated number destination");
     assert.equal(state.heroSecondaryCta.tag, "BUTTON", vp.name + ": phone CTA must be a button until a number is configured");
     assert.equal(state.heroSecondaryCta.channel, "phone", vp.name + ": Hero secondary action should use the phone channel");
    assert.ok(state.heroSecondaryCta.minHeight>=44, vp.name + ": secondary CTA click target must be at least 44px tall");
    assert.ok(state.heroSecondaryCta.gap>=7&&state.heroSecondaryCta.gap<=18,
      vp.name + ": primary/secondary CTA spacing is not balanced: " + JSON.stringify(state.heroSecondaryCta));
    assert.equal(state.heroSecondaryCta.stacked,vp.width<=920, vp.name + ": CTA should stack when the responsive Hero uses its compact layout");
    assert.equal(state.heroCtaHref, "", `${vp.name}: demo hero CTA must not contain a fake external destination`);
    assert.equal(state.heroCtaTag, "BUTTON", `${vp.name}: hero CTA must open the local demo dialog`);
    assert.ok(state.heroCtaWhatsAppIcon, `${vp.name}: WhatsApp brand icon is missing from hero CTA`);
    assert.equal(state.heroCtaBackground, "rgb(24, 122, 128)", `${vp.name}: primary CTA should retain the RUWA teal`);
    assert.equal(state.heroCtaForeground, "rgb(255, 255, 255)", `${vp.name}: primary CTA text should remain white`);
    assert.ok(state.heroCtaHeight >= 52, `${vp.name}: primary CTA hit area is too short`);
    assert.ok(state.heroCtaFontSize >= 14, `${vp.name}: primary CTA text is too small`);
    assert.ok(state.heroCtaRadius >= 999, `${vp.name}: primary CTA should retain its pill shape`);
    assert.ok(state.heroCtaIconHidden, vp.name + ": WhatsApp icon must be hidden from assistive technology because the button already has a text label");
    const audit=state.spacingAudit;
    assert.ok(audit.hero.markerToHeading>=16&&audit.hero.markerToHeading<=24, vp.name + ": Hero marker/headline spacing drifted: " + JSON.stringify(audit.hero));
    assert.ok(vp.width<=720 ? audit.hero.headingToCopy>=11&&audit.hero.headingToCopy<=13 : audit.hero.headingToCopy>=13&&audit.hero.headingToCopy<=19, vp.name + ": Hero headline/copy spacing drifted");
    assert.ok(audit.hero.copyToActions>=20&&audit.hero.copyToActions<=28, vp.name + ": Hero copy/CTA spacing drifted");
    for(const [name,item] of Object.entries({approach:audit.approach,causes:audit.causes,options:audit.options,suitability:audit.suitability,expectations:audit.expectations,faq:audit.faq})){
      assert.ok(item.markerToHeading>=12&&item.markerToHeading<=16, vp.name + ": " + name + " marker-to-heading spacing drifted: " + JSON.stringify(item));
      assert.ok(item.headingToCopy>=9&&item.headingToCopy<=14, vp.name + ": " + name + " heading-to-copy spacing drifted: " + JSON.stringify(item));
    }
    assert.ok(audit.causes.introToCards>=24&&audit.causes.introToCards<=40, vp.name + ": causes intro-to-cards spacing is inconsistent");
    assert.ok(audit.options.introToCards>=24&&audit.options.introToCards<=40, vp.name + ": options intro-to-cards spacing is inconsistent");
    assert.ok(audit.expectations.introToCards>=24&&audit.expectations.introToCards<=40, vp.name + ": expectations intro-to-cards spacing is inconsistent");
    assert.ok(audit.faq.introToList>=24&&audit.faq.introToList<=40, vp.name + ": FAQ intro-to-list spacing is inconsistent");
    assert.equal(audit.approach.stepRowPadding,"18px 0px", vp.name + ": step row rhythm changed");
    assert.equal(audit.causes.cardIndexToTitle,"16px", vp.name + ": cause card index/title spacing changed");
    assert.equal(audit.options.numberToTitle,"20px", vp.name + ": option label/title spacing changed");
    assert.equal(audit.suitability.checkItemPadding,"15px 0px", vp.name + ": suitability checklist rhythm changed");
    assert.equal(audit.expectations.cardPadding,vp.width<=600 ? "21px" : "21px 20px", vp.name + ": expectations card padding changed");
    assert.equal(audit.faq.summaryPadding,"18px 3px", vp.name + ": FAQ row spacing changed");
    assert.equal(audit.faq.referenceMargin,"24px", vp.name + ": reference note spacing changed");
    assert.ok(Number.parseFloat(audit.contactFooter.contactToFooter)>=52, vp.name + ": contact-to-footer separation is too tight");
    assert.equal(state.liveContactChannelPresent, false, `${vp.name}: demo must not contain a live WhatsApp or phone destination`);
    assert.ok(state.finalWhatsAppButton && state.finalPhoneButton, `${vp.name}: final WhatsApp and phone contact controls are missing`);
     assert.deepEqual(state.contactChannelCounts,{whatsapp:3,phone:2},`${vp.name}: page must have exactly three WhatsApp and two phone actions`);
    const dialog=page.locator("#contact-unavailable-dialog");
    const heroTrigger=page.locator(".primary-cta");
    const headerTrigger=page.locator(".header-action");
    const brokenControls = await page.locator("[aria-controls]").evaluateAll(elements =>
      elements.flatMap(element =>
        (element.getAttribute("aria-controls") || "")
          .split(/\s+/)
          .filter(Boolean)
          .filter(id => !document.getElementById(id))
          .map(id => id)
      )
    );
    assert.deepEqual(brokenControls, [], vp.name + ": every aria-controls target must exist");
    assert.equal(await heroTrigger.getAttribute("aria-controls"), "contact-unavailable-dialog", vp.name + ": Hero contact control must reference the actual dialog");
    assert.equal(await headerTrigger.getAttribute("aria-controls"), "contact-unavailable-dialog", vp.name + ": header contact control must reference the actual dialog");
    await heroTrigger.focus();
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => document.querySelector("#contact-unavailable-dialog")?.open === true, null, { timeout: 3000 });
    assert.equal(await page.evaluate(() => document.activeElement?.id), "contact-dialog-title", `${vp.name}: opening from the Hero WhatsApp CTA must move focus to the dialog heading`);
     assert.equal(await page.locator("#contact-dialog-title").innerText(), "التواصل عبر واتساب غير مفعّل بعد", `${vp.name}: empty WhatsApp configuration should show its correct unavailable state`);
    assert.ok(await dialog.evaluate(el=>el.matches(":modal")), `${vp.name}: demo dialog must enter the native modal top layer`);
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => {
      const dialog=document.querySelector("#contact-unavailable-dialog");
      return dialog?.open === false &&
        !document.body.classList.contains("dialog-open") &&
        document.activeElement?.classList.contains("primary-cta");
    }, null, { timeout: 3000 });
    assert.equal(await page.evaluate(() => document.activeElement?.classList.contains("primary-cta")), true, `${vp.name}: Escape must restore focus to the hero trigger`);
    assert.equal(await page.evaluate(() => document.body.classList.contains("dialog-open")), false, `${vp.name}: body scroll lock must be removed after Escape`);

    await headerTrigger.click();
    await page.waitForFunction(() => document.querySelector("#contact-unavailable-dialog")?.open === true, null, { timeout: 3000 });
    await page.locator("#contact-dialog-close").click();
    await page.waitForFunction(() => {
      const dialog=document.querySelector("#contact-unavailable-dialog");
      return dialog?.open === false &&
        !document.body.classList.contains("dialog-open") &&
        document.activeElement?.classList.contains("header-action");
    }, null, { timeout: 3000 });
    assert.equal(await page.evaluate(() => document.activeElement?.classList.contains("header-action")), true, `${vp.name}: close control must restore focus to the header trigger`);

    await heroTrigger.click();
    await page.waitForFunction(() => document.querySelector("#contact-unavailable-dialog")?.open === true, null, { timeout: 3000 });
    await page.locator("#contact-dialog-dismiss").click();
    await page.waitForFunction(() => {
      const dialog=document.querySelector("#contact-unavailable-dialog");
      return dialog?.open === false &&
        !document.body.classList.contains("dialog-open") &&
        document.activeElement?.classList.contains("primary-cta");
    }, null, { timeout: 3000 });
    assert.equal(await page.evaluate(() => document.activeElement?.classList.contains("primary-cta")), true, `${vp.name}: dialog action must restore focus to the hero trigger`);
    assert.equal(new URL(page.url()).hash, "", `${vp.name}: demo CTA must not create an unrelated anchor navigation`);
    await page.evaluate(() => window.scrollTo(0, 0));
    const initialHeaderMetrics = await measureHeader(page);
    const verifyHeaderTouchTargets=(metrics,stateName)=>{
      assert.ok(metrics.action.width>=44 && metrics.action.height>=44,
        `${vp.name}: WhatsApp CTA must have an actual 44×44px minimum target in the ${stateName} state (measured ${metrics.action.width.toFixed(2)}×${metrics.action.height.toFixed(2)}px)`);
      if(vp.width<=920){
        assert.equal(metrics.menuVisible,true,
          `${vp.name}: mobile menu button must be visible in the ${stateName} state`);
        assert.ok(metrics.menu.width>=44 && metrics.menu.height>=44,
          `${vp.name}: mobile menu must have an actual 44×44px minimum target in the ${stateName} state (measured ${metrics.menu.width.toFixed(2)}×${metrics.menu.height.toFixed(2)}px)`);
      }else{
        assert.equal(metrics.menuVisible,false,
          `${vp.name}: desktop navigation must keep the mobile menu button hidden`);
      }
      return {
        whatsapp:{width:Number(metrics.action.width.toFixed(2)),height:Number(metrics.action.height.toFixed(2))},
        menu:{visible:metrics.menuVisible,width:Number(metrics.menu.width.toFixed(2)),height:Number(metrics.menu.height.toFixed(2))}
      };
    };
    const initialTouchTargets=verifyHeaderTouchTargets(initialHeaderMetrics,"expanded");
    if (vp.width===360) {
      const mobileInitialScreenshotState=await captureHeader(page,`${OUT}/mobile-360-header-initial.png`);
      assert.equal(mobileInitialScreenshotState.scrollY,0, `${vp.name}: initial mobile header screenshot must remain at the top`);
      assert.equal(mobileInitialScreenshotState.compact,false, `${vp.name}: initial mobile header screenshot must show the expanded state`);
    }
    if (vp.width===1440) {
      const initialScreenshotState=await captureHeader(page,`${OUT}/desktop-1440-header-initial.png`);
      assert.equal(initialScreenshotState.scrollY,0, `${vp.name}: initial header screenshot must preserve the top-of-page state`);
      assert.equal(initialScreenshotState.compact,false, `${vp.name}: initial header screenshot must show the expanded state`);
    }
    await page.evaluate(() => window.scrollTo(0, 240));
    await page.waitForFunction(() => document.querySelector(".site-header")?.classList.contains("is-compact"), null, { timeout: 3000 });
    await page.waitForTimeout(360);
    const compactHeaderMetrics = await measureHeader(page);
    const compactTouchTargets=verifyHeaderTouchTargets(compactHeaderMetrics,"compact");
    const touchTargetMeasurements={expanded:initialTouchTargets,compact:compactTouchTargets};
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
    assert.ok(compactHeaderMetrics.actionVisualHeight < initialHeaderMetrics.actionVisualHeight, `${vp.name}: visible WhatsApp pill did not become more compact on scroll`);
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
    assert.deepEqual(state.pageSectionOrder, ["top","approach","causes","options","suitability","expectations","faq","consultation"], `${vp.name}: page sections are missing or not in the approved patient-journey order`);
    assert.deepEqual(state.duplicateIds, [], `${vp.name}: duplicate HTML IDs detected`);
    assert.equal(state.optionCards, 3, `${vp.name}: whitening options cards are incomplete`);
    assert.equal(state.causeCards, 2, `${vp.name}: stain explanation cards are incomplete`);
    assert.equal(state.faqItems, 4, `${vp.name}: the four focused FAQ entries are not present`);
    assert.ok(state.clinicalReferences.some(url=>url.includes("nhs.uk")) && state.clinicalReferences.some(url=>url.includes("ada.org")), `${vp.name}: clinical reference links are missing`);
    assert.equal(state.contrastChecks.length,21, `${vp.name}: expanded representative contrast coverage is incomplete`);
    assert.ok(state.contrastChecks.every(item=>!item.missing&&item.ratio>=4.5), `${vp.name}: representative text contrast below WCAG AA: ${JSON.stringify(state.contrastChecks)}`);

    // Keyboard-tab to both Hero actions and measure their rendered focus indicators.
    await page.evaluate(()=>document.activeElement?.blur());
    let primaryFocused=false;
    for(let step=0;step<32;step++){
      await page.keyboard.press("Tab");
      primaryFocused=await page.evaluate(()=>document.activeElement===document.querySelector(".primary-cta"));
      if(primaryFocused)break;
    }
    assert.ok(primaryFocused, `${vp.name}: keyboard tab order did not reach the primary Hero CTA`);
    const primaryFocus=await page.evaluate(()=>{
      const element=document.querySelector(".primary-cta"),style=getComputedStyle(element);
      const parse=value=>value.match(/[\d.]+/g).slice(0,3).map(Number);
      const luminance=value=>{const rgb=parse(value).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2]};
      const ratio=(a,b)=>{const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
      const canvas=getComputedStyle(document.body).backgroundColor;
      return {visible:element.matches(":focus-visible"),outline:style.outlineStyle,width:style.outlineWidth,color:style.outlineColor,
        canvasContrast:ratio(style.outlineColor,canvas),whiteContrast:ratio(style.outlineColor,"rgb(255, 255, 255)")};
    });
    assert.ok(primaryFocus.visible&&primaryFocus.outline==="solid"&&primaryFocus.width==="3px", `${vp.name}: Hero primary focus indicator is not visibly rendered: ${JSON.stringify(primaryFocus)}`);
    assert.ok(primaryFocus.canvasContrast>=3&&primaryFocus.whiteContrast>=3, `${vp.name}: Hero primary focus indicator contrast is below 3:1: ${JSON.stringify(primaryFocus)}`);
    await page.keyboard.press("Tab");
    const secondaryFocus=await page.evaluate(()=>{
      const element=document.querySelector(".consultation-cta"),style=getComputedStyle(element);
      const active=document.activeElement===element;
      return {active,visible:element.matches(":focus-visible"),outline:style.outlineStyle,width:style.outlineWidth,color:style.outlineColor};
    });
    assert.ok(secondaryFocus.active&&secondaryFocus.visible&&secondaryFocus.outline==="solid"&&secondaryFocus.width==="3px", `${vp.name}: Hero secondary focus indicator is not visible: ${JSON.stringify(secondaryFocus)}`);
    assert.equal(secondaryFocus.color,"rgb(17, 90, 96)", `${vp.name}: Hero phone CTA focus indicator should use the accessible deep-teal token`);
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
    assert.equal(state.brandNameFontSize, vp.width <= 720 ? 25 : 31, `${vp.name}: Ruwa wordmark size is not correct for this viewport`);
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
      // The page restores focus on the next animation frame after native hash navigation.
      await page.waitForFunction(
        () => document.activeElement===document.querySelector("#menu-toggle"),
        null,
        {timeout:3000}
      );
      const closed = await page.evaluate(() => ({
        expanded:document.querySelector("#menu-toggle")?.getAttribute("aria-expanded"),
        display:getComputedStyle(document.querySelector("#main-nav")).display,
        hash:location.hash,focusOnToggle:document.activeElement===document.querySelector("#menu-toggle")
      }));
      assert.equal(closed.expanded, "false", `${vp.name}: mobile menu aria state did not close`);
      assert.equal(closed.display, "none", `${vp.name}: mobile menu remained open after selection`);
      assert.equal(closed.hash, "#approach", `${vp.name}: navigation target failed`);
      assert.equal(closed.focusOnToggle,true,`${vp.name}: selecting a mobile navigation link must not leave focus inside the hidden menu`);
      await page.waitForFunction(()=>document.querySelector('#main-nav a[href="#approach"]')?.getAttribute("aria-current")==="location",null,{timeout:3000});

      await page.keyboard.press("Enter");
      assert.equal(await page.locator("#menu-toggle").getAttribute("aria-expanded"),"true",`${vp.name}: keyboard activation did not open the mobile menu`);
      await page.locator("#main-nav a").first().focus();
      await page.keyboard.press("Escape");
      const escaped=await page.evaluate(()=>({
        expanded:document.querySelector("#menu-toggle")?.getAttribute("aria-expanded"),
        display:getComputedStyle(document.querySelector("#main-nav")).display,
        focusOnToggle:document.activeElement===document.querySelector("#menu-toggle")
      }));
      assert.equal(escaped.expanded,"false",`${vp.name}: Escape did not close the open mobile menu`);
      assert.equal(escaped.display,"none",`${vp.name}: navigation remained visible after Escape`);
      assert.equal(escaped.focusOnToggle,true,`${vp.name}: Escape must restore focus to the mobile menu button`);

      await page.keyboard.press("Enter");
      await page.locator("#main-nav a").nth(1).focus();
      await page.setViewportSize({width:1024,height:vp.height});
      await page.waitForFunction(()=>window.innerWidth>920&&
        document.querySelector("#menu-toggle")?.getAttribute("aria-expanded")==="false"&&
        getComputedStyle(document.querySelector("#main-nav")).display!=="none",
        null,{timeout:3000});
      const desktopResize=await page.evaluate(()=>({
        expanded:document.querySelector("#menu-toggle")?.getAttribute("aria-expanded"),
        navDisplay:getComputedStyle(document.querySelector("#main-nav")).display,
        toggleDisplay:getComputedStyle(document.querySelector("#menu-toggle")).display,
        focusInVisibleNav:document.activeElement?.closest("#main-nav")!==null
      }));
      assert.equal(desktopResize.expanded,"false",`${vp.name}: resizing to desktop must close the mobile menu state`);
      assert.notEqual(desktopResize.navDisplay,"none",`${vp.name}: desktop navigation should be visible after resize`);
      assert.equal(desktopResize.toggleDisplay,"none",`${vp.name}: mobile toggle should hide above the shared 920px breakpoint`);
      assert.equal(desktopResize.focusInVisibleNav,true,`${vp.name}: resize must not leave focus on a hidden mobile control`);
      await page.setViewportSize({width:vp.width,height:vp.height});
      await page.waitForFunction(()=>window.innerWidth<=920&&
        document.querySelector("#menu-toggle")?.getAttribute("aria-expanded")==="false"&&
        document.activeElement===document.querySelector("#menu-toggle"),
        null,{timeout:3000});
      const mobileResize=await page.evaluate(()=>({
        expanded:document.querySelector("#menu-toggle")?.getAttribute("aria-expanded"),
        navDisplay:getComputedStyle(document.querySelector("#main-nav")).display,
        focusOnToggle:document.activeElement===document.querySelector("#menu-toggle")
      }));
      assert.equal(mobileResize.expanded,"false",`${vp.name}: mobile menu state should remain closed after returning to mobile width`);
      assert.equal(mobileResize.navDisplay,"none",`${vp.name}: mobile navigation should return to its collapsed state after resize`);
      assert.equal(mobileResize.focusOnToggle,true,`${vp.name}: resize to mobile must move focus off the newly hidden desktop nav link`);
    }

    if (vp.width > 920) {
      assert.notEqual(state.navDisplay, "none", `${vp.name}: desktop navigation should be visible`);
      assert.equal(state.toggleDisplay, "none", `${vp.name}: mobile menu button should be hidden`);
      assert.ok(state.heroCopyLayoutValid, `${vp.name}: Hero copy must remain aligned to the intended right-hand content column`);

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

      // Move the pointer first, then pin the active marker. Playwright may
      // scroll a target into view during hover; applying the marker afterwards
      // keeps this check isolated from the independently tested scroll observer.
      await activeLink.hover();
      await activeLink.evaluate(link=>{
        link.closest("nav").querySelectorAll("a").forEach(item=>item.removeAttribute("aria-current"));
        link.setAttribute("aria-current","location");
      });
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
        // The current-section underline animates for 220ms. Wait for the real
        // browser transition to finish before measuring its final 100% scale.
        await page.waitForFunction(href=>{
          const link=document.querySelector(`#main-nav a[href="${href}"]`);
          if(!link||link.getAttribute("aria-current")!=="location")return false;
          const transform=getComputedStyle(link,"::after").transform;
          const scale=transform.startsWith("matrix(")?Number.parseFloat(transform.slice(7)):0;
          return scale>=.99&&scale<=1.01;
        },target.href,{timeout:1800});
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

    const finalPhone=page.locator('#consultation [data-contact-action="phone"]');
     await finalPhone.click();
     await page.waitForFunction(() => {
       const dialog=document.querySelector("#contact-unavailable-dialog");
       return dialog?.open===true && document.querySelector("#contact-dialog-title")?.textContent==="الاتصال بالعيادة غير مفعّل بعد";
     },null,{timeout:3000});
     assert.equal(await page.evaluate(()=>document.activeElement?.id),"contact-dialog-title",`${vp.name}: unavailable phone action must focus the dialog heading`);
     await page.locator("#contact-dialog-dismiss").click();
     await page.waitForFunction(()=>!document.querySelector("#contact-unavailable-dialog")?.open,null,{timeout:3000});
     assert.equal(await page.evaluate(()=>document.activeElement===document.querySelector('#consultation [data-contact-action="phone"]')),true,`${vp.name}: phone dialog close should restore trigger focus`);

     const finalWhatsApp=page.locator('#consultation [data-contact-action="whatsapp"]');
     await finalWhatsApp.click();
     await page.waitForFunction(() => {
       const dialog=document.querySelector("#contact-unavailable-dialog");
       return dialog?.open===true && document.querySelector("#contact-dialog-title")?.textContent==="التواصل عبر واتساب غير مفعّل بعد";
     },null,{timeout:3000});
     await page.locator("#contact-dialog-close").click();
     await page.waitForFunction(()=>!document.querySelector("#contact-unavailable-dialog")?.open,null,{timeout:3000});
     assert.equal(await page.evaluate(()=>document.activeElement===document.querySelector('#consultation [data-contact-action="whatsapp"]')),true,`${vp.name}: WhatsApp dialog close should restore trigger focus`);

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

    results.push({ ...vp, ...state, headerShrink, headerConvergence, touchTargetMeasurements, pageErrors, localErrors });
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
