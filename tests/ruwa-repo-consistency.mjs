import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = relativePath => readFile(path.join(root, relativePath), "utf8");

const [
  html,
  rootEntry,
  readme,
  designSystem,
  caseStudy,
  productionAudit,
  rootAlias,
  publicAlias,
  pagesWorkflow
] = await Promise.all([
  read("whitening-2026.html"),
  read("index.html"),
  read("README.md"),
  read("WHITENING-2026-DESIGN-SYSTEM.md"),
  read("portfolio/ruwa-dental-whitening/CASE-STUDY.md"),
  read("portfolio/ruwa-dental-whitening/PRODUCTION-READINESS-AUDIT.md"),
  read("whitening-preview.html"),
  read("preview/ruwa/index.html"),
  read(".github/workflows/pages.yml")
]);

const sectionIds = [...html.matchAll(/<section\b[^>]*\bid=["']([^"']+)["']/gi)].map(match => match[1]);
assert.deepEqual(
  sectionIds,
  ["top", "causes", "options", "journey", "suitability", "team", "reviews", "visit", "faq", "consultation"],
  "RUWA must keep the approved ten-section visitor journey in order"
);


const reviewsPosition = html.indexOf('id="reviews"');
const visitPosition = html.indexOf('id="visit"');
const faqPosition = html.indexOf('id="faq"');
assert.ok(reviewsPosition < visitPosition && visitPosition < faqPosition, "Riyadh location must follow reviews and precede FAQ");
const visitSection = html.slice(visitPosition, html.indexOf("</section>", visitPosition) + 10);
assert.ok(visitSection.includes("الرياض") && visitSection.includes("المملكة العربية السعودية"), "Riyadh city and country must be visible");
assert.ok(visitSection.includes("معلومات الموقع وطرق الوصول") && visitSection.includes("تُضاف المدينة وعنوان الفرع وبيانات الوصول هنا"), "Location section must describe a future verified location without implying an operating clinic");
assert.ok(visitSection.includes("مدينة الرياض بالكامل"), "The displayed geographic scope must remain the whole city");
assert.ok(visitSection.includes("عنوان الفرع") && visitSection.includes("غير محدد في هذا النموذج"), "Do not invent an exact branch address");
assert.ok(visitSection.includes("نموذج RUWA التجريبي") && visitSection.includes("لا يحدد موقعًا فعليًا لعيادة أو فرع") && visitSection.includes("ليس خريطة طرق أو وسيلة للملاحة"), "Disclose that the artwork is not a real clinic location");
const mapImage = visitSection.match(/<img\b[^>]*data-visit-map-image[^>]*>/)?.[0] || "";
assert.ok(mapImage.includes('src="assets/riyadh-schematic-map.svg"'), "Use the committed local SVG illustration rather than a third-party map API");
assert.ok(mapImage.includes('loading="lazy"') && mapImage.includes('width="1200"') && mapImage.includes('height="720"'), "Local illustration must lazy-load and reserve its intrinsic dimensions");
assert.ok(mapImage.includes('alt="') && mapImage.includes("لا يمثل خريطة فعلية"), "Illustration alternative text must state that it is not a real map");
assert.ok(visitSection.includes("رسم محلي للنموذج التجريبي") && !visitSection.includes("MapMap") && !visitSection.includes("OpenStreetMap"), "Local illustration must not claim third-party map data attribution");
const cityMapLink = visitSection.match(/<a class="visit-map-action"[^>]*href="([^"]+)"/)?.[1] || "";
assert.ok(cityMapLink.startsWith("https://www.google.com/maps/search/?api=1&amp;query=Riyadh"), "Open a Google Maps city search, not exact clinic directions");
assert.match(visitSection, /target="_blank" rel="noopener noreferrer"/, "Google Maps must open safely in a new tab");
assert.ok(visitSection.includes("رسم توضيحي تجريدي") && visitSection.includes("ليس خريطة طرق") && visitSection.includes("لا يحدد موقعًا فعليًا لعيادة أو فرع"), "Clearly disclose that the visual is schematic artwork, not a road map or clinic location");
assert.ok(!visitSection.includes("<iframe") && !visitSection.includes("دبوس"), "Do not present the static image as an interactive map or invent a clinic pin");

const journeyStart = html.indexOf('id="journey"');
const optionsStart = html.indexOf('id="options"');
const suitabilityStart = html.indexOf('id="suitability"');
assert.ok(optionsStart < journeyStart && journeyStart < suitabilityStart, "Treatment journey must follow whitening options and precede suitability and safety");
const journeySection = html.slice(journeyStart, html.indexOf("</section>", journeyStart) + 10);
assert.ok(journeySection.includes("من الفحص الأولي إلى المتابعة."), "Treatment journey headline is missing");
assert.ok(journeySection.includes("تنفيذ الخطة"), "Treatment implementation step is missing");
assert.ok(journeySection.includes("العناية والمتابعة"), "Aftercare and follow-up step is missing");
assert.match(journeySection, /<ol class="journey-grid" aria-label="الخطوات الأربع لتقييم خيارات تبييض الأسنان">/);
assert.equal([...journeySection.matchAll(/<li class="journey-step">/g)].length, 4, "Treatment journey must contain exactly four ordered steps");
assert.ok(journeySection.includes("تبدأ الخطوات بفحص الأسنان واللثة وفهم سبب تغيّر اللون"), "Merged journey must begin with patient assessment");
assert.deepEqual([...journeySection.matchAll(/<h3>([^<]+)<\/h3>/g)].map(match => match[1]), ["تقييم صحة الأسنان واللثة", "شرح الخيارات ومناقشتها", "تنفيذ الخطة المتفق عليها", "تعليمات العناية والمتابعة"], "Merged journey steps must follow the patient journey");

const expectationsSection = html.slice(suitabilityStart, html.indexOf('id="team"', suitabilityStart));
assert.ok(suitabilityStart > journeyStart, "Merged safety and expectations must follow the treatment journey");
assert.ok(expectationsSection.includes("فهم حدود التبييض وآثاره المحتملة على مناقشة الخيارات بتوقعات واقعية واتخاذ قرار واعٍ"), "Merged safety section must introduce realistic expectations");
assert.deepEqual(
  [...expectationsSection.matchAll(/<article class="expect-card">[\s\S]*?<h3>([^<]+)<\/h3>/g)].map(match => match[1]),
  ["النتائج تختلف من شخص لآخر", "قد تحدث حساسية أو تهيّج مؤقت", "الحشوات والتيجان والقشور لا تتبيّض", "العناية بعد التبييض"],
  "Merged expectations must contain four focused cards in the approved order"
);
assert.ok(expectationsSection.includes("لون الأسنان الأساسي وسبب التصبغ وعمقه"), "Factors influencing results are missing");
assert.ok(expectationsSection.includes("لا توجد درجة نهائية يمكن ضمانها للجميع"), "No-guarantee disclosure is missing");
assert.ok(expectationsSection.includes("قد تظهر حساسية مؤقتة في الأسنان أو تهيّج في اللثة"), "Temporary sensitivity and gum irritation must be disclosed");
assert.ok(expectationsSection.includes("شديدة أو مستمرة"), "Significant or persistent symptoms must prompt professional advice");
assert.ok(expectationsSection.includes("الحشوات والتيجان وقشور الأسنان بالتبييض مثل لون الأسنان الطبيعية"), "Restoration limits must be disclosed");
assert.ok(expectationsSection.includes("اتبع تعليمات طبيب الأسنان"), "Individualized aftercare guidance is missing");
assert.ok(expectationsSection.includes("حافظ على نظافة الفم بانتظام"), "Normal oral hygiene guidance is missing");
assert.ok(expectationsSection.includes("قد يتغيّر اللون بمرور الوقت"), "Changing whitening results must be disclosed");
assert.ok(expectationsSection.includes("قبل تكرار التبييض"), "Advice before repeating whitening is missing");
assert.ok(expectationsSection.includes("الحمل أو الرضاعة") && expectationsSection.includes("لا يُنصح بإجراء تبييض الأسنان خلال الحمل أو الرضاعة"), "Pregnancy and breastfeeding precautions must remain present");
assert.doesNotMatch(expectationsSection, /\b\d+\s*(?:دقائق?|ساعات?|أيام?|أسابيع?|أشهر?|سنوات?)\b/, "Do not invent numerical aftercare waiting periods or result longevity");
assert.match(html, /\.expect-grid\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\);gap:14px\}/, "Expectations grid must use two columns on desktop/tablet");
assert.match(html, /\.cause-grid,\.options-grid,\.expect-grid,\.journey-grid\{grid-template-columns:1fr\}/, "Expectations grid must collapse to one column on mobile");


assert.match(html, /--display:"IBM Plex Sans Arabic","Alexandria",Tahoma,sans-serif;/, "Arabic display headings must use the approved IBM Plex Sans Arabic family throughout RUWA");
assert.match(html, /--body:"IBM Plex Sans Arabic","Alexandria",Tahoma,sans-serif;/, "Arabic interface and body copy must use IBM Plex Sans Arabic");
assert.match(html, /href="assets\/fonts\/Qw3CZRtWPQCuHme67tEYUIx3Kh0PHR9N6Ys43PW5fslBEg0\.woff2"/, "IBM Plex Sans Arabic regular WOFF2 preload is missing");
assert.match(html, /href="assets\/fonts\/Qw3NZRtWPQCuHme67tEYUIx3Kh0PHR9N6YOG-eCRXMRrKATtYV0\.woff2"/, "IBM Plex Sans Arabic bold WOFF2 preload is missing");
assert.doesNotMatch(html, /--display:"Cairo"/, "Cairo must not remain the Arabic display font");


const headerStart = html.indexOf('<header class="site-header">');
const headerEnd = html.indexOf("</header>", headerStart) + "</header>".length;
const headerMarkup = html.slice(headerStart, headerEnd);
assert.ok(headerStart >= 0 && headerEnd > headerStart, "RUWA semantic header is missing");
const headerLinks = [...headerMarkup.matchAll(/<a\b[^>]*href=["'](#[^"']+)["'][^>]*>/g)].map(match => match[1]);
assert.deepEqual(headerLinks, ["#top","#causes","#options","#journey","#suitability","#team","#reviews","#visit","#faq"], "Header must preserve its brand anchor and eight navigation destinations while using a separate contact button");
const secondaryHeaderLinks = [...headerMarkup.matchAll(/<a\b[^>]*class=["']nav-secondary["'][^>]*href=["'](#[^"']+)["'][^>]*>/g)].map(match => match[1]);
assert.deepEqual(secondaryHeaderLinks, ["#causes","#options","#suitability","#reviews","#visit"], "Only the five secondary destinations may be hidden from the expanded desktop navigation");
assert.match(html, /\.nav \.nav-secondary\{display:none\}/, "Secondary links must be hidden in the expanded desktop header");
assert.match(html, /\.nav\.open \.nav-secondary\{display:flex\}/, "All secondary links must reappear when navigation opens");
assert.match(html, /\.site-header\.is-compact \.menu-toggle/, "Compact desktop header must expose its menu control");
assert.match(html, /nav\.inert=shouldCollapseNav\(\)&&button\.getAttribute\("aria-expanded"\)!=="true"/, "Closed collapsed navigation must be removed from keyboard interaction");

const teamSection = html.slice(html.indexOf('id="team"'), html.indexOf("</section>", html.indexOf('id="team"')) + 10);
const teamImageSources = [...teamSection.matchAll(/<img\b[^>]*src=["']([^"']+)["']/gi)].map(match => match[1]);
assert.deepEqual(teamImageSources, [
  "assets/ruwa-team-doctor-01.webp",
  "assets/ruwa-team-doctor-02.webp",
  "assets/ruwa-team-doctor-03.webp"
], "RUWA must use three distinct existing dentist portraits");
assert.ok(teamSection.includes("الصور التالية نماذج توضيحية مولّدة بالذكاء الاصطناعي، ولا تمثل أطباء حقيقيين أو موظفين في عيادة"), "RUWA team disclosure must appear before the illustrative profiles");
assert.equal([...teamSection.matchAll(/<article class="team-card"/g)].length, 3, "RUWA team must contain exactly three profile cards");
assert.equal([...teamSection.matchAll(/اسم الطبيب بعد التحقق/g)].length, 3, "Each profile must reserve space for verified doctor information");


const reviewsStart = html.indexOf('id="reviews"');
const faqStart = html.indexOf('id="faq"');
assert.ok(reviewsStart > html.indexOf('id="team"') && reviewsStart < visitPosition && visitPosition < faqStart, "Reviews remain after team; location follows reviews and precedes FAQ");
const reviewsSection = html.slice(reviewsStart, html.indexOf("</section>", reviewsStart) + 10);
assert.ok(reviewsSection.includes("القسم السابع: معايير عرض الآراء"), "Review transparency section marker must be number 07");
assert.ok(reviewsSection.includes("آراء المرضى تُعرض بوضوح ومصداقية."), "Review transparency headline is missing");
assert.ok(reviewsSection.includes("هذا النموذج لا يعرض تقييمات أو متوسطات نجوم حقيقية."), "Demo must disclose that there are no real review scores");
assert.ok(reviewsSection.includes("تُعرض الآراء الفعلية فقط بعد التحقق من مصدرها والحصول على موافقة صريحة بنشرها."), "Review authenticity and permission criteria must be disclosed");
assert.equal([...reviewsSection.matchAll(/class="reviews-criteria-list"/g)].length, 1, "Review publication criteria must be presented once");
assert.equal([...reviewsSection.matchAll(/<li>/g)].length, 3, "Three transparent review-publication criteria must be present");
assert.equal([...reviewsSection.matchAll(/<article class="review-card">/g)].length, 3, "Exactly three review-transparency cards must be present");
assert.equal([...reviewsSection.matchAll(/class="review-card-copy">(?:مصدر قابل للتحقق|موافقة واضحة|نقل أمين للتجربة)/g)].length, 3, "Cards must present the three review-publication standards");
assert.equal([...reviewsSection.matchAll(/reviews-stars|★|«/g)].length, 0, "Remove decorative ratings and hypothetical patient quotations");
assert.ok(reviewsSection.includes("هذا النموذج لا يتضمن تقييمات أو شهادات مرضى موثّقة."), "Demo must disclose that no verified patient reviews are available");
assert.doesNotMatch(html, /AggregateRating|reviewCount|ratingValue|itemprop=["']review/i, "No review or rating structured data may be added");
assert.match(html, /القسم التاسع: الأسئلة الشائعة/);
assert.deepEqual([...html.matchAll(/class="section-marker-number(?: [^"]*)?" aria-hidden="true">(\d+)<\/span>/g)].map(match => match[1]), ["01","02","03","04","05","06","07","08","09","10"], "All ten visible section markers must follow the page order");


const faqAuditStart = html.indexOf('id="faq"');
const faqAuditEnd = html.indexOf("</section>", faqAuditStart) + "</section>".length;
const faqAuditMarkup = html.slice(faqAuditStart, faqAuditEnd);
const faqCount = [...faqAuditMarkup.matchAll(/<details\b/gi)].length;
assert.equal(faqCount, 6, "RUWA must contain six focused native FAQ entries");
assert.deepEqual(
  [...faqAuditMarkup.matchAll(/<summary>([^<]+)<\/summary>/g)].map(match => match[1]),
  [
    "هل أحتاج إلى أكثر من جلسة؟",
    "كم تدوم نتيجة التبييض؟",
    "ما الفرق بين التصبغات الخارجية والتصبغات الداخلية؟",
    "هل الليمون والفحم وخلطات التبييض المنزلية آمنة؟",
    "هل يسبب تبييض الأسنان حساسية؟",
    "هل تتغيّر ألوان الحشوات والتيجان مع التبييض؟"
  ],
  "FAQ questions must address distinct visitor concerns in the approved order"
);
assert.ok(faqAuditMarkup.includes("سبب التصبغ وعمقه والطريقة المستخدمة واستجابة الأسنان"), "Session-count answer must explain why treatment plans vary");
assert.ok(html.slice(optionsStart, html.indexOf("</section>", optionsStart)).includes("التصبغات السطحية"), "Whitening options must distinguish surface stains from tooth colour");
assert.ok(faqAuditMarkup.includes("لا توجد مدة ثابتة للجميع"), "Result-longevity answer must avoid a universal promise");
assert.ok(faqAuditMarkup.includes("التصبغات الخارجية على سطح السن") && faqAuditMarkup.includes("التصبغات الداخلية"), "FAQ must explain surface versus intrinsic discoloration");
assert.ok(faqAuditMarkup.includes("تآكل مينا الأسنان") && faqAuditMarkup.includes("استشر طبيب الأسنان"), "FAQ must caution against unverified home-whitening mixtures");
assert.ok(faqAuditMarkup.includes("natural-teeth-whitening") && faqAuditMarkup.includes("oral-health-topics/whitening"), "FAQ must link to authoritative ADA guidance");
assert.ok(faqAuditMarkup.includes("حساسية مؤقتة في الأسنان") && faqAuditMarkup.includes("أعراض شديدة أو مستمرة"), "Sensitivity FAQ must explain common temporary effects and when to seek advice");
assert.ok(faqAuditMarkup.includes("لا تتغيّر ألوان الحشوات والتيجان والقشور الخزفية") && faqAuditMarkup.includes("اختلاف في اللون بعد التبييض"), "Restoration FAQ must explain that restorations do not whiten like natural teeth");
assert.doesNotMatch(faqAuditMarkup, /ما العناية المطلوبة بعد التبييض/, "The FAQ must not repeat the dedicated aftercare section");
assert.match(html, /:focus-visible\{outline:3px solid var\(--coral\);outline-offset:4px\}/, "A visible global keyboard focus indicator must remain available");

const contactActions = [...html.matchAll(/data-contact-action=["'](whatsapp|phone)["']/gi)].map(match => match[1]);
assert.equal(contactActions.filter(action => action === "whatsapp").length, 2, "Hero and floating WhatsApp demo controls must use the disclosed contact dialog");
assert.equal(contactActions.filter(action => action === "phone").length, 2, "Hero and header call controls must use the disclosed contact dialog");

const contactHeaderScanStart = html.indexOf('<header class="site-header"');
const contactHeaderScanEnd = html.indexOf("</header>", contactHeaderScanStart) + "</header>".length;
const contactHeaderMarkup = html.slice(contactHeaderScanStart, contactHeaderScanEnd);
assert.ok(contactHeaderMarkup.includes('<button class="header-action phone-cta" type="button" data-contact-action="phone"') && contactHeaderMarkup.includes("اتصل بنا") && contactHeaderMarkup.includes("M22 16.92"), "Header must restore the phone-icon call button and route it to the disclosed demo dialog");

assert.match(html, /id=["']whatsapp-float["']/);
assert.match(html, /class=["']whatsapp-float["']/);
assert.match(html, /aria-label=["']معاينة زر واتساب في النموذج التجريبي["']/);
assert.match(html, /new IntersectionObserver/);
assert.ok(html.includes("document.querySelector('.hero-actions .primary-cta')"), "Observer must watch the Hero WhatsApp CTA");
assert.match(html, /right:max\(12px,env\(safe-area-inset-right\)\)/, "Desktop floating WhatsApp button must sit slightly closer to the right edge");
assert.match(html, /right:max\(10px,env\(safe-area-inset-right\)\)/, "Mobile floating WhatsApp button must sit slightly closer to the right edge");
assert.match(html, /background:var\(--wa\);color:#FFFFFF/, "Floating WhatsApp circle must stay green with a white icon");
assert.match(html, /display:flex;align-items:center;justify-content:center/, "Floating WhatsApp logo must use explicit two-axis centering");
assert.match(html, /padding-inline: calc\(19px - 2px \* var\(--header-progress\)\)/, "Desktop header CTA needs a subtle increase in horizontal padding");


const ids = new Set([...html.matchAll(/\bid=["']([^"']+)["']/gi)].map(match => match[1]));
const brokenControls = [...html.matchAll(/\baria-controls=["']([^"']+)["']/gi)]
  .flatMap(match => match[1].split(/\s+/).filter(Boolean).filter(id => !ids.has(id)));
assert.deepEqual(brokenControls, [], "Every aria-controls token must point to an existing element ID");

assert.match(html, /id=["']contact-unavailable-dialog["']/);
assert.match(html, /const WHATSAPP_NUMBER = "";/);
assert.match(html, /const PHONE_NUMBER = "";/);
assert.equal((html.match(/<form\b/gi) || []).length, 0, "The portfolio demo must not claim to collect lead forms");
const anchorHrefs = [...html.matchAll(/<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>/gi)].map(match => match[1]);
assert.equal(
  anchorHrefs.some(href => /^(?:tel:|https:\/\/wa\.me\/)/i.test(href)),
  false,
  "No live phone or WhatsApp anchor may be present while contact settings are empty"
);

const heroStart = html.indexOf('<section class="hero"');
const heroEnd = html.indexOf("</section>", heroStart);
const heroSection = heroStart >= 0 && heroEnd > heroStart ? html.slice(heroStart, heroEnd + 10) : "";
assert.ok(heroSection, "The canonical Hero section must remain present");
assert.match(heroSection, /class="primary-cta whatsapp-cta" type="button" data-contact-action="whatsapp"[^>]*>[\s\S]*?تواصل عبر واتساب/, "Hero primary CTA must restore the WhatsApp contact button");
assert.match(heroSection, /class="text-link consultation-cta phone-cta" type="button" data-contact-action="phone"[^>]*>اتصل بنا/, "Hero secondary CTA must restore the call-us button");

assert.doesNotMatch(heroSection, /hero-demo-disclosure|نموذج تجريبي من Apex Studio/, "The separate demo sentence beneath the Hero buttons must be removed");
assert.match(html, /مفهوم تجريبي أُعدّ ضمن معرض أعمال أبيكس ستوديو/, "The footer must retain the fictional portfolio disclosure in Arabic");
assert.match(html, /<meta name="description"[^>]*نموذج تجريبي/, "Page metadata must continue to identify the fictional demo");

const heroImage = html.match(/<img class="hero-portrait"[^>]*>/i)?.[0] || "";
assert.match(heroImage, /src="assets\/ruwa-hero-90-768\.webp"/);
assert.match(heroImage, /width="768"/);
assert.match(heroImage, /height="1152"/);
assert.match(heroImage, /fetchpriority="high"/);
assert.match(html, /الصورة توضيحية مولّدة بالذكاء الاصطناعي، ولا تمثل طبيبًا حقيقيًا/);

const footerStart = html.indexOf('<footer class="footer"');
const footerEnd = html.indexOf("</footer>", footerStart) + "</footer>".length;
const footer = footerStart >= 0 && footerEnd > footerStart ? html.slice(footerStart, footerEnd) : "";
assert.ok(footer, "RUWA must contain a semantic footer");
assert.equal([...footer.matchAll(/class="footer-social-icon footer-social-icon--/g)].length, 0, "Unlinked social-media icons must not imply official accounts");
assert.ok(footer.includes("لا توجد حسابات تواصل رسمية مرتبطة بهذا النموذج التجريبي"), "Footer must clarify that no official social accounts are connected");
const footerAnchors = [...footer.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi)].map(match => match[1]);
assert.equal(footerAnchors.some(href => /instagram|snapchat|tiktok|x\.com/i.test(href)), false, "Social marks must remain icon-only without invented account URLs");
const footerTargets = footerAnchors.filter(href => href.startsWith("#")).map(href => href.slice(1));
assert.ok(footerTargets.length >= 9, "RUWA footer must provide useful internal navigation");
assert.ok(footer.includes('<a href="#journey">خطوات التقييم</a>'), "Footer must link to the treatment journey");
assert.ok(footer.includes('<a href="#visit">نموذج عرض الموقع</a>'), "Footer must link to the demo location section");
assert.deepEqual(footerTargets.filter(target => !ids.has(target)), [], "Every RUWA footer navigation target must exist on the page");
assert.match(footer, /مفهوم تجريبي أُعدّ ضمن معرض أعمال أبيكس ستوديو/);
assert.match(footer, /الصور المعروضة، بما فيها صور الأطباء، توضيحية مولّدة بالذكاء الاصطناعي/);
assert.match(footer, /المحتوى للتوعية العامة فقط/);


assert.match(rootAlias, /http-equiv="refresh" content="0;url=whitening-2026\.html"/);
assert.match(publicAlias, /http-equiv="refresh" content="0;url=\.\.\/\.\.\/whitening-2026\.html"/);
assert.match(rootAlias, /rel="canonical" href="whitening-2026\.html"/);
assert.match(publicAlias, /rel="canonical" href="\.\.\/\.\.\/whitening-2026\.html"/);
assert.match(rootEntry, /http-equiv="refresh" content="0;url=\.\/whitening-2026\.html"/, "Repository root must redirect to the canonical RUWA page");
assert.match(rootEntry, /window\.location\.replace\("\.\/whitening-2026\.html"\)/, "Repository root must provide a JavaScript redirect fallback");
assert.match(rootEntry, /rel="canonical" href="\.\/whitening-2026\.html"/, "Repository root canonical URL must point to RUWA");
assert.doesNotMatch(rootEntry, /Elite Dental Clinic|Tailwind|site\.css|local-fonts\.css|unsplash/i, "Repository root must not contain the retired Elite site or its build assets");
assert.doesNotMatch(rootAlias + publicAlias, /pexels|prepare-inquiry|clipboard|Elite Dental Clinic/i);
assert.ok(html.includes("if(nav.classList.contains(\"open\"))return;"), "Active-section tracking must remain stable while the compact dropdown is open");
assert.ok(pagesWorkflow.includes("if: github.ref == 'refs/heads/main'"), "GitHub Pages deployment must be restricted to the main ref");

for (const [name, content] of [
  ["README", readme],
  ["Design system", designSystem],
  ["Case study", caseStudy],
  ["Production audit", productionAudit]
]) {
  assert.match(content, /whitening-2026\.html/, name + " must point to the canonical RUWA page");
  assert.match(content, /RUWA/, name + " must identify the RUWA project");
  assert.doesNotMatch(content, /Elite Dental Clinic|Tailwind CSS refresh|portfolio\/elite-dental-whitening/i, name + " must not describe the retired Elite project as active");
}

assert.match(readme, /10 content sections/);
assert.match(readme, /6 FAQ entries/);
assert.match(readme, /floating WhatsApp preview/);
assert.match(designSystem, /10 content sections/);
assert.match(designSystem, /6 native HTML details\/summary FAQ entries/);
assert.match(designSystem, /one circular WhatsApp preview/);
assert.match(caseStudy, /10 أقسام رئيسية/);
assert.match(caseStudy, /ستة أسئلة/);
assert.match(caseStudy, /زري تواصل في Hero.*واتساب.*اتصل بنا/);
assert.match(productionAudit, /10 main content sections/);
assert.match(productionAudit, /6 native details entries/);
assert.match(productionAudit, /one floating WhatsApp demo control/);

console.log("RUWA repository consistency: PASS");
console.log("Sections: 10 | Reviews: no fabricated testimonials or ratings | FAQ: 6 | Contact: restored WhatsApp/phone buttons use disclosed demo dialog");
console.log("ARIA controls: all targets exist | Hero AI illustration disclosure: present");
console.log("Repository root and legacy preview paths: redirect to whitening-2026.html");
