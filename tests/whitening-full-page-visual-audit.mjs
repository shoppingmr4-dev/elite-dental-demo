import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:4173/whitening-2026.html";
const OUT = "artifacts/whitening-2026/full-page-visual-audit";
const viewports = [
  { name: "desktop-1440", width: 1440, height: 1000 },
  { name: "desktop-1366", width: 1366, height: 900 },
  { name: "laptop-1280", width: 1280, height: 900 },
  { name: "laptop-1024", width: 1024, height: 900 },
  { name: "tablet-768", width: 768, height: 1000 },
  { name: "mobile-390", width: 390, height: 844, mobile: true },
  { name: "mobile-360", width: 360, height: 800, mobile: true }
];
const sectionIds = ["approach", "causes", "options", "suitability", "expectations", "faq", "consultation"];
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
const results = [];
const failures = [];
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
    const metrics=await page.evaluate((ids)=>{
      const round=n=>Number(n.toFixed(2));
      const rect=el=>{
        if(!el)return null;
        const r=el.getBoundingClientRect();
        return {x:round(r.x),y:round(r.y),width:round(r.width),height:round(r.height),top:round(r.top),bottom:round(r.bottom)};
      };
      const style=el=>{
        if(!el)return null;
        const c=getComputedStyle(el);
        return {
          color:c.color,backgroundColor:c.backgroundColor,backgroundImage:c.backgroundImage,
          fontFamily:c.fontFamily,fontSize:c.fontSize,fontWeight:c.fontWeight,lineHeight:c.lineHeight,
          padding:c.padding,margin:c.margin,gap:c.gap,border:c.border,borderRadius:c.borderRadius,
          boxShadow:c.boxShadow,display:c.display
        };
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
        const cards=[...el.querySelectorAll(".info-card,.option-card,.check-item,.expect-card,.faq-item,.step,.contact-band")];
        const cardStyles=cards.map(card=>({className:card.className||card.tagName,rect:rect(card),style:style(card)}));
        return {
          id,rect:rect(el),style:style(el),
          wrap:rect(wrap),heading:rect(heading),headingStyle:style(heading),
          marker:rect(marker),markerStyle:style(marker),
          firstParagraph:rect(el.querySelector("p")),paragraphStyle:style(el.querySelector("p")),
          cards:cardStyles
        };
      });
      const images=[...document.images].map(img=>({src:img.currentSrc||img.src,complete:img.complete,naturalWidth:img.naturalWidth,naturalHeight:img.naturalHeight}));
      const links=[...document.querySelectorAll("a[href]")].map(a=>({text:a.innerText.trim(),href:a.getAttribute("href")}));
      const brokenAnchors=links.filter(x=>x.href.startsWith("#")&&!document.getElementById(x.href.slice(1))).map(x=>x.href);
      const emptyControls=[...document.querySelectorAll("button,a[href],input,select,textarea")].filter(el=>{
        if(el.matches("input,select,textarea"))return !el.getAttribute("aria-label")&&!document.querySelector('label[for="'+el.id+'"]');
        return !el.innerText.trim()&&!el.getAttribute("aria-label");
      }).map(el=>el.outerHTML.slice(0,180));
      const scrollWidth=document.documentElement.scrollWidth,clientWidth=document.documentElement.clientWidth;
      const sectionTransitions=sections.filter(x=>!x.missing).map((s,i,a)=>({
        from:s.id,to:a[i+1]?.id||null,
        fromBackground:s.style.backgroundColor,toBackground:a[i+1]?.style.backgroundColor||null
      })).slice(0,-1);
      return {
        viewport:{width:innerWidth,height:innerHeight},documentHeight:document.documentElement.scrollHeight,
        pageSectionOrder,duplicateIds,
        horizontalOverflow:round(scrollWidth-clientWidth),sections,sectionTransitions,
        images,brokenAnchors,emptyControls,
        counts:{sections:ids.length,steps:document.querySelectorAll(".step").length,causeCards:document.querySelectorAll(".info-card").length,
          optionCards:document.querySelectorAll(".option-card").length,suitabilityItems:document.querySelectorAll(".check-item").length,
          expectationsCards:document.querySelectorAll(".expect-card").length,faqItems:document.querySelectorAll(".faq-item").length},
        headings:{h1:document.querySelectorAll("h1").length,h2:document.querySelectorAll("h2").length},
        footer:rect(document.querySelector(".footer")),footerStyle:style(document.querySelector(".footer"))
      };
    },sectionIds);
    await page.screenshot({path:`${OUT}/${vp.name}-full.png`,fullPage:true,animations:"disabled",timeout:60000});
    if(vp.width===1440||vp.width===390){
      for(const id of sectionIds){
        const locator=page.locator("#"+id);
        await locator.screenshot({path:`${OUT}/${vp.name}-section-${id}.png`,animations:"disabled",timeout:30000});
      }
    }
    const result={name:vp.name,...metrics,pageErrors:errors,resourceErrors};
    results.push(result);
    const problems=[];
    if(metrics.horizontalOverflow>1)problems.push("horizontal overflow "+metrics.horizontalOverflow+"px");
    if(metrics.sections.some(s=>s.missing))problems.push("missing section");
    if(JSON.stringify(metrics.pageSectionOrder)!==JSON.stringify(["top","approach","causes","options","suitability","expectations","faq","consultation"]))problems.push("page section order differs from the intended patient journey");
    if(metrics.duplicateIds.length)problems.push("duplicate HTML IDs");
    if(metrics.brokenAnchors.length)problems.push("broken in-page anchors");
    if(metrics.images.some(i=>!i.complete||i.naturalWidth===0))problems.push("broken image asset");
    if(errors.length)problems.push("JavaScript errors");
    if(resourceErrors.length)problems.push("local resource errors");
    if(problems.length){failures.push({viewport:vp.name,problems});console.log("[FAIL] "+vp.name+": "+problems.join(", "));}
    else console.log("[CAPTURED] "+vp.name+": all content sections, component geometry, backgrounds, and full-page screenshot");
    await page.close();
  }
} finally { await browser.close(); }
await writeFile(`${OUT}/full-page-metrics.json`,JSON.stringify({viewports:results,failures},null,2));
console.log(JSON.stringify({captured:results.length,total:viewports.length,failures},null,2));
if(failures.length)process.exitCode=1;
