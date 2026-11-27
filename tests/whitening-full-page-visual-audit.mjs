import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:4173/whitening-2026.html";
const OUT = "artifacts/whitening-2026/full-page-visual-audit";
const viewports = [
  { name: "desktop-1440", width: 1440, height: 900 },
  { name: "desktop-1366", width: 1366, height: 768 },
  { name: "laptop-1280", width: 1280, height: 720 },
  { name: "laptop-1024", width: 1024, height: 768 },
  { name: "tablet-768", width: 768, height: 800 },
  { name: "mobile-430", width: 430, height: 900, mobile: true },
  { name: "mobile-390", width: 390, height: 844, mobile: true },
  { name: "mobile-360", width: 360, height: 800, mobile: true },
  { name: "mobile-320", width: 320, height: 740, mobile: true }
];
const sectionIds = ["causes", "options", "journey", "suitability", "team", "reviews", "visit", "faq", "consultation"];
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
const results = [];
const failures = [];
const numberDesignComparisons = [];
try {
  for (const vp of viewports) {
    const page = await browser.newPage({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
      isMobile: Boolean(vp.mobile),
      hasTouch: Boolean(vp.mobile),
      reducedMotion: "reduce"
    });
    const errors = [];
    const resourceErrors = [];
    page.on("pageerror", e => errors.push(e.message));
    page.on("response", r => {
      if (r.url().startsWith(new URL(BASE_URL).origin) && r.status() >= 400) resourceErrors.push({status:r.status(),url:r.url()});
    });
    const response=await page.goto(BASE_URL,{waitUntil:"domcontentloaded",timeout:45000});
    if(!response?.ok()) throw new Error(vp.name+": page load failed");
    await page.evaluate(()=>document.fonts.ready);
    await page.waitForTimeout(180);
    // Preserve lazy-loading in the shipped page, but request every image in this
    // isolated QA browser context before checking asset health. This avoids
    // marking unvisited lazy images as broken before the browser requests them.
    await page.evaluate(async()=>{
      const images=[...document.images];
      images.forEach(image=>image.loading="eager");
      await Promise.all(images.map(image=>image.decode().catch(()=>null)));
    });
    const metrics=await page.evaluate((ids)=>{
      const round=n=>Number(n.toFixed(2));
      const rect=el=>{
        if(!el)return null;
        const r=el.getBoundingClientRect();
        return {x:round(r.x),y:round(r.y),width:round(r.width),height:round(r.height),top:round(r.top),bottom:round(r.bottom)};
      };
      const parseColor=value=>{
        const match=String(value||"").match(/rgba?\(([^)]+)\)/);
        if(!match)return [0,0,0,0];
        const values=match[1].split(",").map(part=>Number.parseFloat(part.trim()));
        return [values[0]||0,values[1]||0,values[2]||0,values[3]??1];
      };
      const composite=(foreground,background)=>{
        const alpha=foreground[3]+background[3]*(1-foreground[3]);
        if(alpha===0)return [0,0,0,0];
        return [0,1,2].map(index=>(foreground[index]*foreground[3]+background[index]*background[3]*(1-foreground[3]))/alpha).concat(alpha);
      };
      const effectiveBackground=el=>{
        let background=[255,255,255,1];
        const ancestry=[];
        for(let node=el;node;node=node.parentElement)ancestry.unshift(node);
        for(const node of ancestry){
          const color=parseColor(getComputedStyle(node).backgroundColor);
          if(color[3]>0)background=composite(color,background);
        }
        return "rgb("+background.slice(0,3).map(value=>Math.round(value)).join(", ")+")";
      };
      const colorHex=value=>"#"+parseColor(value).slice(0,3).map(channel=>Math.round(channel).toString(16).padStart(2,"0")).join("").toUpperCase();
      const luminance=value=>{
        const rgb=parseColor(value).slice(0,3).map(component=>{
          const channel=component/255;
          return channel<=0.04045?channel/12.92:Math.pow((channel+0.055)/1.055,2.4);
        });
        return 0.2126*rgb[0]+0.7152*rgb[1]+0.0722*rgb[2];
      };
      const contrast=(foreground,background)=>{
        const values=[luminance(foreground),luminance(background)].sort((a,b)=>b-a);
        return Number(((values[0]+0.05)/(values[1]+0.05)).toFixed(2));
      };
      const style=el=>{
        if(!el)return null;
        const c=getComputedStyle(el);
        const background=effectiveBackground(el);
        const primaryFont=c.fontFamily.split(",")[0].replace(/["']/g,"").trim();
        const fontLoaded=document.fonts.check(c.fontWeight+" "+c.fontSize+" \""+primaryFont+"\"");
        return {
          color:c.color,colorHex:colorHex(c.color),backgroundColor:c.backgroundColor,effectiveBackground:background,
          primaryFont,fontLoaded,contrastRatio:contrast(c.color,background),
          backgroundImage:c.backgroundImage,fontFamily:c.fontFamily,fontSize:c.fontSize,
          fontWeight:c.fontWeight,lineHeight:c.lineHeight,letterSpacing:c.letterSpacing,
          textAlign:c.textAlign,direction:c.direction,padding:c.padding,margin:c.margin,
          gap:c.gap,border:c.border,borderRadius:c.borderRadius,boxShadow:c.boxShadow,
          backdropFilter:c.backdropFilter,filter:c.filter,display:c.display
        };
      };
      const textDetails=el=>{
        if(!el)return null;
        const range=document.createRange();
        range.selectNodeContents(el);
        const computed=getComputedStyle(el);
        const lineHeight=Number.parseFloat(computed.lineHeight);
        const visualLineCount=lineHeight>0?Math.max(1,Math.round(rect(el).height/lineHeight)):range.getClientRects().length;
        return {text:el.innerText.replace(/\s+/g," ").trim(),rect:rect(el),style:style(el),visualLineCount,fragmentCount:range.getClientRects().length};
      };
      const pageSectionOrder=[...document.querySelectorAll("main > section")].map(section=>section.id);
      const allIds=[...document.querySelectorAll("[id]")].map(element=>element.id);
      const duplicateIds=[...new Set(allIds.filter((id,index)=>allIds.indexOf(id)!==index))];
      const sections=ids.map(id=>{
        const el=document.getElementById(id);
        if(!el)return {id,missing:true};
        const wrap=el.querySelector(".wrap");
        const heading=el.querySelector("h2");
        const marker=el.querySelector(".section-marker");
        const cards=[...el.querySelectorAll(".info-card,.option-card,.journey-step,.check-item,.expect-card,.team-card,.team-card-media,.team-card-body,.visit-map-stage,.visit-info-panel,.visit-info-item,.visit-map-action,.reviews-panel,.reviews-preview,.review-card,.reviews-criteria,.reviews-criteria-list li,.faq-item,.step,.contact-band")];
        const cardStyles=cards.map(card=>({className:card.className||card.tagName,rect:rect(card),style:style(card)}));
        return {
          id,rect:rect(el),style:style(el),
          wrap:rect(wrap),heading:rect(heading),headingStyle:style(heading),
          marker:rect(marker),markerStyle:style(marker),
          firstParagraph:rect(el.querySelector("p")),paragraphStyle:style(el.querySelector("p")),
          cards:cardStyles
        };
      });
      const journeyElement=document.getElementById("journey");
      const journeyGrid=journeyElement?.querySelector(".journey-grid");
      const journeyMarker=journeyElement?.querySelector(".section-marker");
      const journeySteps=[...(journeyElement?.querySelectorAll(".journey-step")||[])];
      const journeyDetails=journeyElement?{
        heading:textDetails(journeyElement.querySelector("h2")),
        supportingParagraph:textDetails(journeyElement.querySelector(".section-head > p")),
        markerLabel:journeyMarker?.querySelector(".section-marker-label")?.innerText.trim()||"",
        markerAriaLabel:journeyMarker?.getAttribute("aria-label")||"",
        listTag:journeyGrid?.tagName||"",
        accessibleLabel:journeyGrid?.getAttribute("aria-label")||"",
        columns:journeyGrid?getComputedStyle(journeyGrid).gridTemplateColumns.trim().split(/\s+/).length:0,
        steps:journeySteps.map(step=>({
          number:textDetails(step.querySelector(".journey-step-number")),
          numberHidden:step.querySelector(".journey-step-number")?.getAttribute("aria-hidden")==="true",
          title:textDetails(step.querySelector("h3")),
          description:textDetails(step.querySelector("p")),
          style:style(step)
        }))
      }:null;
      const images=[...document.images].map(img=>({src:img.currentSrc||img.src,complete:img.complete,naturalWidth:img.naturalWidth,naturalHeight:img.naturalHeight}));
      const links=[...document.querySelectorAll("a[href]")].map(a=>({text:a.innerText.trim(),href:a.getAttribute("href")}));
      const brokenAnchors=links.filter(x=>x.href.startsWith("#")&&!document.getElementById(x.href.slice(1))).map(x=>x.href);
      const emptyControls=[...document.querySelectorAll("button,a[href],input,select,textarea")].filter(el=>{
        if(el.matches("input,select,textarea"))return !el.getAttribute("aria-label")&&!document.querySelector('label[for="'+el.id+'"]');
        return !el.innerText.trim()&&!el.getAttribute("aria-label");
      }).map(el=>el.outerHTML.slice(0,180));
      const scrollWidth=document.documentElement.scrollWidth,viewportWidth=window.innerWidth;
      const sectionTransitions=sections.filter(x=>!x.missing).map((s,i,a)=>({
        from:s.id,to:a[i+1]?.id||null,
        fromBackground:s.style.backgroundColor,toBackground:a[i+1]?.style.backgroundColor||null
      })).slice(0,-1);
      return {
        viewport:{width:innerWidth,height:innerHeight},documentHeight:document.documentElement.scrollHeight,
        pageSectionOrder,duplicateIds,
        horizontalOverflow:round(Math.max(0,scrollWidth-viewportWidth)),sections,journeyDetails,sectionTransitions,
        images,brokenAnchors,emptyControls,
        counts:{sections:ids.length,steps:document.querySelectorAll(".journey-step").length,causeCards:document.querySelectorAll(".info-card").length,
          optionCards:document.querySelectorAll(".option-card").length,suitabilityItems:document.querySelectorAll(".check-item").length,
          expectationsCards:document.querySelectorAll(".expect-card").length,expectationsCardColumns:(()=>{const grid=document.querySelector("#suitability .expectations-panel .expect-grid");return grid?getComputedStyle(grid).gridTemplateColumns.trim().split(/\s+/).length:0;})(),teamCards:document.querySelectorAll("#team .team-card").length,teamPortraits:document.querySelectorAll("#team .team-card img").length,reviewCriteria:document.querySelectorAll("#reviews .review-card-label").length,reviewCards:document.querySelectorAll("#reviews .review-card").length,reviewStars:document.querySelectorAll("#reviews .reviews-stars, #reviews [aria-label*=نجوم]").length,reviewDisclosure:document.querySelector("#reviews .reviews-head p")?.innerText.trim()||"",reviewStatus:document.querySelector("#reviews .review-card-footer-note")?.innerText.trim()||"",faqItems:document.querySelectorAll(".faq-item").length},
        headings:{h1:document.querySelectorAll("h1").length,h2:document.querySelectorAll("h2").length},
        footer:rect(document.querySelector(".footer")),footerStyle:style(document.querySelector(".footer"))
      };
    },sectionIds);
    await page.screenshot({path:`${OUT}/${vp.name}-full.png`,fullPage:true,animations:"disabled",timeout:60000});
    await page.locator("#suitability").screenshot({
      path:`${OUT}/${vp.name}-section-suitability.png`,animations:"disabled",timeout:30000
    });
    await page.locator("#journey").screenshot({
      path:`${OUT}/${vp.name}-section-journey.png`,animations:"disabled",timeout:30000
    });
     if(vp.width===1440||vp.width===390){
       await page.locator("#reviews").screenshot({
         path:`${OUT}/${vp.name}-section-reviews.png`,animations:"disabled",timeout:30000
       });
     }
    if(vp.width===1440||vp.width===390){
      await page.evaluate(()=>{
        const section=document.querySelector("#causes");
        const target=Math.max(0,section.getBoundingClientRect().top+window.scrollY-120);
        window.scrollTo(0,target);
      });
      await page.waitForTimeout(100);
      await page.screenshot({
        path:`${OUT}/${vp.name}-hero-to-causes-transition.png`,
        fullPage:false,animations:"disabled",timeout:30000
      });
      await page.evaluate(()=>{
        const section=document.querySelector("#causes");
        const rect=section.getBoundingClientRect();
        const target=window.scrollY+rect.bottom-Math.round(window.innerHeight*0.68);
        window.scrollTo(0,Math.max(0,target));
      });
      await page.waitForTimeout(100);
      await page.screenshot({
        path:`${OUT}/${vp.name}-causes-to-options-transition.png`,
        fullPage:false,animations:"disabled",timeout:30000
      });
    }
    const result={name:vp.name,...metrics,pageErrors:errors,resourceErrors};
    results.push(result);
    const problems=[];
    if(metrics.horizontalOverflow>1)problems.push("horizontal overflow "+metrics.horizontalOverflow+"px");
    if(metrics.sections.some(s=>s.missing))problems.push("missing section");
    const journeyDetails=metrics.journeyDetails;
    if(!journeyDetails||journeyDetails.steps.length!==4)problems.push("Merged journey section must contain exactly four ordered steps");
    if(journeyDetails){
      const expectedTitles=["تقييم صحة الأسنان واللثة","شرح الخيارات ومناقشتها","تنفيذ الخطة المتفق عليها","تعليمات العناية والمتابعة"];
      if(JSON.stringify(journeyDetails.steps.map(step=>step.title.text))!==JSON.stringify(expectedTitles))
        problems.push("Merged journey step titles differ from the approved patient journey");
      if(journeyDetails.steps.map(step=>step.number.text).join("|")!=="01|02|03|04")
        problems.push("Merged journey numbers are not in the intended 01 → 02 → 03 → 04 order");
      if(journeyDetails.steps.some(step=>!step.title?.text||!step.description?.text))
        problems.push("Merged journey contains an empty step title or description");
      if(journeyDetails.steps.some(step=>!step.numberHidden))
        problems.push("Visible journey numbers must be hidden from assistive technology to avoid duplicate announcements");
      if(journeyDetails.listTag!=="OL"||journeyDetails.accessibleLabel!=="الخطوات الأربع لتقييم خيارات تبييض الأسنان")
        problems.push("Merged journey must expose its steps as a labelled ordered list");
      if(journeyDetails.heading?.text!=="أربع خطوات تساعد على اتخاذ قرار مدروس.")
        problems.push("Merged journey heading differs from the approved patient-centered copy");
      if(journeyDetails.markerLabel!=="خطوات التقييم"||
        journeyDetails.markerAriaLabel!=="القسم الرابع: خطوات التقييم")
        problems.push("Merged journey marker or accessible label is incorrect");
      if(journeyDetails.steps.some(step=>step.description.style.contrastRatio<4.5||step.title.style.contrastRatio<4.5))
        problems.push("Merged journey text falls below WCAG AA normal-text contrast");
      const expectedColumns=vp.width>850?4:(vp.width>600?2:1);
      if(journeyDetails.columns!==expectedColumns)
        problems.push("Merged journey grid does not match its responsive four/two/one-column layout");
    }
    if(JSON.stringify(metrics.pageSectionOrder)!==JSON.stringify(["top","causes","options","journey","suitability","team","reviews","visit","faq","consultation"]))problems.push("page section order differs from the intended patient journey");
    if(metrics.counts.expectationsCards!==4)problems.push("The combined suitability and expectations section must contain exactly four expectations cards");
    if(metrics.counts.expectationsCardColumns!==(vp.width<=600?1:2))problems.push("Section 07 must use two grid columns on desktop/tablet and one on mobile");
    if(metrics.counts.teamCards!==3||metrics.counts.teamPortraits!==3)problems.push("team section must render exactly three portrait cards");
    if(metrics.counts.reviewCriteria!==3||metrics.counts.reviewCards!==3||metrics.counts.reviewStars!==0||!metrics.counts.reviewDisclosure.includes("بعد التحقق من مصدرها")||!metrics.counts.reviewStatus.includes("بعد موافقة المريض"))problems.push("patient-review slots, permission disclosure, or non-fabricated presentation are incomplete");
    if(metrics.counts.faqItems!==7)problems.push("FAQ section must contain seven focused native disclosure entries");
    if(metrics.duplicateIds.length)problems.push("duplicate HTML IDs");
    if(metrics.brokenAnchors.length)problems.push("broken in-page anchors");
    for(const image of metrics.images.filter(i=>!i.complete||i.naturalWidth===0))
      problems.push("broken image asset: "+image.src);
    if(errors.length)problems.push("JavaScript errors");
    if(resourceErrors.length)problems.push("local resource errors");
    if(problems.length){failures.push({viewport:vp.name,problems});console.log("[FAIL] "+vp.name+": "+problems.join(", "));}
    else console.log("[CAPTURED] "+vp.name+": all content sections, component geometry, backgrounds, and full-page screenshot");
    await page.close();
  }
} finally { await browser.close(); }
await writeFile(`${OUT}/full-page-metrics.json`,JSON.stringify({viewports:results,failures},null,2));
await writeFile(`${OUT}/number-design-comparisons.json`,JSON.stringify(numberDesignComparisons,null,2));
console.log(JSON.stringify({captured:results.length,total:viewports.length,failures},null,2));
if(failures.length)process.exitCode=1;
