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
        return {
          color:c.color,backgroundColor:c.backgroundColor,effectiveBackground:background,
          contrastRatio:contrast(c.color,background),
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
      const approachElement=document.getElementById("approach");
      const approachGrid=approachElement?.querySelector(".approach-grid");
      const approachIntro=approachElement?.querySelector(".approach-intro");
      const approachHeading=approachIntro?.querySelector("h2");
      const approachParagraph=approachIntro?.querySelector(":scope > p");
      const approachMarker=approachIntro?.querySelector(".section-marker");
      const approachList=approachElement?.querySelector(".step-list");
      const approachSteps=[...(approachElement?.querySelectorAll(".step")||[])];
      const approachListStyle=style(approachList);
      const approachIntroStyle=style(approachIntro);
      const oneLineVariant=approachHeading?.cloneNode(true);
      let oneLineComparison=null;
      if(oneLineVariant){
        oneLineVariant.removeAttribute("id");
        oneLineVariant.querySelectorAll("br").forEach(br=>br.replaceWith(document.createTextNode(" ")));
        const originalStyle=getComputedStyle(approachHeading);
        Object.assign(oneLineVariant.style,{
          position:"fixed",left:"-10000px",right:"auto",top:"0",visibility:"hidden",
          width:"max-content",maxWidth:"none",whiteSpace:"nowrap",margin:"0",
          fontFamily:originalStyle.fontFamily,fontSize:originalStyle.fontSize,
          fontWeight:originalStyle.fontWeight,lineHeight:originalStyle.lineHeight,
          letterSpacing:originalStyle.letterSpacing,direction:"rtl",textAlign:"center"
        });
        document.body.appendChild(oneLineVariant);
        const naturalWidth=oneLineVariant.getBoundingClientRect().width;
        const availableWidth=Math.min(760,approachGrid.getBoundingClientRect().width);
        const currentFontSize=Number.parseFloat(originalStyle.fontSize);
        oneLineComparison={
          naturalWidth:round(naturalWidth),availableWidth:round(availableWidth),
          currentFontSize:round(currentFontSize),
          fontSizeRequiredToFit:round(currentFontSize*availableWidth/naturalWidth),
          fitsAtCurrentSize:naturalWidth<=availableWidth+1
        };
        oneLineVariant.remove();
      }
      const approachDetails=approachElement?(()=>{
        const gridStyle=getComputedStyle(approachGrid);
        const markerNumber=approachMarker?.querySelector(".section-marker-number");
        const markerLabel=approachMarker?.querySelector(".section-marker-label");
        const markerDivider=approachMarker?.querySelector(".section-marker-divider");
        const introRect=rect(approachIntro);
        const headingRect=rect(approachHeading);
        const paragraphRect=rect(approachParagraph);
        const listRect=rect(approachList);
        return {
          section:{rect:rect(approachElement),style:style(approachElement)},
          composition:{
            gridTemplateColumns:gridStyle.gridTemplateColumns,
            columnGap:gridStyle.columnGap,rowGap:gridStyle.rowGap,
            stepListGridTemplateColumns:approachListStyle?.display==="grid"?getComputedStyle(approachList).gridTemplateColumns:"",
            stepListColumnCount:approachListStyle?.display==="grid"?getComputedStyle(approachList).gridTemplateColumns.trim().split(/\s+/).length:0,
            introStyle:approachIntroStyle,stepListStyle:approachListStyle,
            introRect,listRect,
            markerCenterOffset:round((rect(approachMarker).x+rect(approachMarker).width/2)-(rect(approachGrid).x+rect(approachGrid).width/2)),
            headingCenterOffset:round((headingRect.x+headingRect.width/2)-(rect(approachGrid).x+rect(approachGrid).width/2)),
            paragraphCenterOffset:round((paragraphRect.x+paragraphRect.width/2)-(rect(approachGrid).x+rect(approachGrid).width/2)),
            horizontalSeparation:round(Math.max(0,Math.max(introRect.x,listRect.x)-Math.min(introRect.x+introRect.width,listRect.x+listRect.width))),
            introToListVerticalOffset:round(listRect.top-introRect.top)
          },
          marker:{
            label:markerLabel?.innerText.trim()||"",
            labelDetails:textDetails(markerLabel),
            ariaLabel:approachMarker?.getAttribute("aria-label")||"",
            rect:rect(approachMarker),style:style(approachMarker),
            number:textDetails(markerNumber),divider:rect(markerDivider)
          },
          heading:textDetails(approachHeading),
          oneLineComparison,
          supportingParagraph:textDetails(approachParagraph),
          spacing:{
            markerToHeading:round(headingRect.top-rect(approachMarker).bottom),
            headingToParagraph:round(paragraphRect.top-(headingRect.top+headingRect.height)),
            paragraphToStepList:round(listRect.top-(paragraphRect.top+paragraphRect.height)),
            sectionPadding:getComputedStyle(approachElement).padding,
            stepRowPadding:getComputedStyle(approachSteps[0]||approachElement).padding,
            stepColumnGap:getComputedStyle(approachSteps[0]||approachElement).columnGap
          },
          steps:approachSteps.map(step=>{
            const number=step.querySelector(".step-no");
            const title=step.querySelector("h3");
            const description=step.querySelector("p");
            return {
              rect:rect(step),padding:getComputedStyle(step).padding,style:style(step),
              number:textDetails(number),title:textDetails(title),description:textDetails(description),
              divider:getComputedStyle(step).borderBottomColor
            };
          })
        };
      })():null;
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
        horizontalOverflow:round(scrollWidth-clientWidth),sections,approachDetails,sectionTransitions,
        images,brokenAnchors,emptyControls,
        counts:{sections:ids.length,steps:document.querySelectorAll(".step").length,causeCards:document.querySelectorAll(".info-card").length,
          optionCards:document.querySelectorAll(".option-card").length,suitabilityItems:document.querySelectorAll(".check-item").length,
          expectationsCards:document.querySelectorAll(".expect-card").length,faqItems:document.querySelectorAll(".faq-item").length},
        headings:{h1:document.querySelectorAll("h1").length,h2:document.querySelectorAll("h2").length},
        footer:rect(document.querySelector(".footer")),footerStyle:style(document.querySelector(".footer"))
      };
    },sectionIds);
    await page.screenshot({path:`${OUT}/${vp.name}-full.png`,fullPage:true,animations:"disabled",timeout:60000});
    await page.locator("#approach").screenshot({
      path:`${OUT}/${vp.name}-section-approach.png`,animations:"disabled",timeout:30000
    });
    if(vp.width===1440||vp.width===390){
      await page.evaluate(()=>{
        const section=document.querySelector("#approach");
        const target=Math.max(0,section.getBoundingClientRect().top+window.scrollY-120);
        window.scrollTo(0,target);
      });
      await page.waitForTimeout(100);
      await page.screenshot({
        path:`${OUT}/${vp.name}-hero-to-approach-transition.png`,
        fullPage:false,animations:"disabled",timeout:30000
      });
      await page.evaluate(()=>{
        const section=document.querySelector("#approach");
        const rect=section.getBoundingClientRect();
        const target=window.scrollY+rect.bottom-Math.round(window.innerHeight*0.68);
        window.scrollTo(0,Math.max(0,target));
      });
      await page.waitForTimeout(100);
      await page.screenshot({
        path:`${OUT}/${vp.name}-approach-to-causes-transition.png`,
        fullPage:false,animations:"disabled",timeout:30000
      });
    }
    const result={name:vp.name,...metrics,pageErrors:errors,resourceErrors};
    results.push(result);
    const problems=[];
    if(metrics.horizontalOverflow>1)problems.push("horizontal overflow "+metrics.horizontalOverflow+"px");
    if(metrics.sections.some(s=>s.missing))problems.push("missing section");
    const approachDetails=metrics.approachDetails;
    if(!approachDetails||approachDetails.steps.length!==3)problems.push("Section 02 must contain one heading and exactly three evaluation steps");
    if(approachDetails){
      const normalText=[
        approachDetails.supportingParagraph?.style,
        ...approachDetails.steps.map(step=>step.title.style),
        ...approachDetails.steps.map(step=>step.description.style),
        ...approachDetails.steps.map(step=>step.number.style),
        approachDetails.marker?.number?.style,
        approachDetails.marker?.labelDetails?.style
      ].filter(Boolean);
      const largeText=[approachDetails.heading?.style].filter(Boolean);
      if(normalText.some(item=>item.contrastRatio<4.5))problems.push("Section 02 normal-text contrast below WCAG AA 4.5:1");
      if(largeText.some(item=>item.contrastRatio<3))problems.push("Section 02 large-text contrast below WCAG AA 3:1");
      if(approachDetails.steps.some(step=>!step.title?.text||!step.description?.text))problems.push("Section 02 contains an empty step title or description");
      if(approachDetails.heading?.text!=="قبل اختيار التبييض، نقيّم صحة أسنانك.")problems.push("Section 02 headline differs from the approved copy");
      if(approachDetails.marker?.label!=="خطوات التقييم")problems.push("Section 02 marker label differs from the approved copy");
      if(approachDetails.heading?.visualLineCount!==2)problems.push("Section 02 headline must render as exactly two deliberate visual lines");
      if(approachDetails.heading?.style.color!=="rgb(20, 45, 56)")problems.push("Section 02 headline must use the approved RUWA deep-ink color");
      if(approachDetails.heading?.style.textAlign!=="center")problems.push("Section 02 heading is not centered");
      if(approachDetails.steps.some(step=>step.style.backdropFilter!=="none"||step.style.boxShadow!=="none"||step.style.borderRadius!=="0px"||step.style.backgroundColor!=="rgba(0, 0, 0, 0)"))problems.push("Section 02 step components must remain minimal editorial blocks, not glass or boxed cards");
      if(!approachDetails.oneLineComparison||approachDetails.oneLineComparison.fontSizeRequiredToFit<approachDetails.oneLineComparison.currentFontSize*.85)problems.push("Section 02 one-line headline comparison did not support the selected two-line hierarchy");
      if(approachDetails.supportingParagraph?.style.textAlign!=="center")problems.push("Section 02 supporting paragraph is not centered");
      if(approachDetails.steps.some(step=>step.title.style.textAlign!=="right"||step.description.style.textAlign!=="right"))problems.push("Section 02 step text is not right-aligned for Arabic reading");
      if([approachDetails.composition.markerCenterOffset,approachDetails.composition.headingCenterOffset,approachDetails.composition.paragraphCenterOffset].some(offset=>Math.abs(offset)>1))problems.push("Section 02 centered introduction is horizontally unbalanced");
      if(approachDetails.spacing.paragraphToStepList<24)problems.push("Section 02 introduction and evaluation steps are too close");
      const expectedStepColumns=vp.width>900?3:1;
      if(approachDetails.composition.stepListColumnCount!==expectedStepColumns)problems.push("Section 02 step layout does not match the responsive column rule");
    }
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
