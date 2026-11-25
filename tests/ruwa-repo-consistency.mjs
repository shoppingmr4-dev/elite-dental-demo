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
  ["top", "approach", "causes", "options", "journey", "suitability", "expectations", "team", "reviews", "faq", "consultation"],
  "RUWA must keep the approved eleven-section visitor journey in order"
);


const journeyStart = html.indexOf('id="journey"');
const optionsStart = html.indexOf('id="options"');
const suitabilityStart = html.indexOf('id="suitability"');
assert.ok(optionsStart < journeyStart && journeyStart < suitabilityStart, "Treatment journey must follow whitening options and precede suitability and safety");
const journeySection = html.slice(journeyStart, html.indexOf("</section>", journeyStart) + 10);
assert.ok(journeySection.includes("من التقييم إلى العناية اللاحقة."), "Treatment journey headline is missing");
assert.ok(journeySection.includes("تنفيذ الإجراء"), "Treatment implementation step is missing");
assert.ok(journeySection.includes("العناية والمتابعة"), "Aftercare and follow-up step is missing");
assert.match(journeySection, /<ol class="journey-grid" aria-label="مراحل رحلة تبييض الأسنان">/);
assert.equal([...journeySection.matchAll(/<li class="journey-step">/g)].length, 4, "Treatment journey must contain exactly four ordered steps");
assert.ok(journeySection.includes("تختلف تفاصيل الرحلة بحسب الخيار وحالتك"), "Treatment journey must disclose that details vary by method and case");

const expectationsStart = html.indexOf('id="expectations"');
const expectationsSection = html.slice(expectationsStart, html.indexOf("</section>", expectationsStart) + 10);
assert.ok(expectationsStart > suitabilityStart, "Realistic expectations must follow suitability and safety");
assert.ok(expectationsSection.includes("فحص الأسنان واللثة وتحديد سبب تغيّر اللون لدى طبيب الأسنان"), "Expectations must explain the role of individual dental assessment");
assert.deepEqual(
  [...expectationsSection.matchAll(/<h3>([^<]+)<\/h3>/g)].map(match => match[1]),
  ["النتائج تختلف من شخص لآخر", "قد تحدث حساسية أو تهيّج مؤقت", "الحشوات والتيجان والقشور لا تتبيّض", "العناية بعد التبييض"],
  "Expectations must contain four focused cards in the approved order"
);
assert.ok(expectationsSection.includes("لون الأسنان الأساسي وسبب التصبغ وعمقه"), "Factors influencing results are missing");
assert.ok(expectationsSection.includes("لا توجد درجة نهائية واحدة يمكن ضمانها للجميع"), "No-guarantee disclosure is missing");
assert.ok(expectationsSection.includes("حساسية مؤقتة في الأسنان أو تهيّج في اللثة"), "Temporary sensitivity and gum irritation must be disclosed");
assert.ok(expectationsSection.includes("شديدة أو مستمرة"), "Significant or persistent symptoms must prompt professional advice");
assert.ok(expectationsSection.includes("الحشوات والتيجان والقشور التجميلية"), "Restoration limits must be disclosed");
assert.ok(expectationsSection.includes("تعليمات طبيب الأسنان الخاصة بحالتك"), "Individualized aftercare guidance is missing");
assert.ok(expectationsSection.includes("روتين نظافة الفم المعتاد"), "Normal oral hygiene guidance is missing");
assert.ok(expectationsSection.includes("قد يتغير اللون بمرور الوقت"), "Changing whitening results must be disclosed");
assert.ok(expectationsSection.includes("قبل تكرار التبييض"), "Advice before repeating whitening is missing");
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
assert.deepEqual(headerLinks, ["#top","#approach","#causes","#options","#journey","#suitability","#reviews","#faq"], "Header must preserve its brand anchor and all six internal destinations");
const secondaryHeaderLinks = [...headerMarkup.matchAll(/<a\b[^>]*class=["']nav-secondary["'][^>]*href=["'](#[^"']+)["'][^>]*>/g)].map(match => match[1]);
assert.deepEqual(secondaryHeaderLinks, ["#approach","#causes","#journey","#reviews"], "Only the four secondary destinations may be hidden from the expanded desktop navigation");
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
assert.ok(teamSection.includes("الصور المعروضة توضيحية مولّدة بالذكاء الاصطناعي، ولا تمثل أطباء حقيقيين أو موظفين في عيادة"), "RUWA team disclosure is missing");
assert.equal([...teamSection.matchAll(/<article class="team-card"/g)].length, 3, "RUWA team must contain exactly three profile cards");
assert.equal([...teamSection.matchAll(/بيانات الطبيب الفعلية/g)].length, 3, "Each profile must reserve space for verified doctor information");


const reviewsStart = html.indexOf('id="reviews"');
const faqStart = html.indexOf('id="faq"');
assert.ok(reviewsStart > html.indexOf('id="team"') && reviewsStart < faqStart, "Patient reviews must appear after the team and before FAQ");
const reviewsSection = html.slice(reviewsStart, html.indexOf("</section>", reviewsStart) + 10);
assert.ok(reviewsSection.includes("القسم التاسع: آراء المرضى"), "Patient reviews section marker must be number 08");
assert.ok(reviewsSection.includes("كل تجربة تستحق أن تُعرض كما هي."), "Patient reviews headline is missing");
assert.ok(reviewsSection.includes("النجوم المعروضة توضيحية لأغراض التصميم فقط، ولا تمثل تقييمًا فعليًا."), "Visible star-preview disclaimer is missing");
assert.equal(reviewsSection.split('<span aria-hidden="true">★</span>').length - 1, 5, "Exactly five decorative preview stars must be present");
assert.match(reviewsSection, /class="reviews-stars" role="img" aria-label="خمس نجوم توضيحية لأغراض التصميم فقط"/);
assert.ok(reviewsSection.includes("لا تتوفر تقييمات مرضى موثّقة ضمن هذا النموذج التجريبي."), "Demo must disclose that no verified patient reviews are available");
assert.equal([...reviewsSection.matchAll(/class="reviews-criteria-list"/g)].length, 1, "Review publication criteria must be presented once");
assert.equal([...reviewsSection.matchAll(/<li>/g)].length, 3, "Three transparent review-publication criteria must be present");
assert.equal([...reviewsSection.matchAll(/<article class="review-card">/g)].length, 3, "Exactly three review design cards must be present");
assert.equal([...reviewsSection.matchAll(/class="review-card-label">نموذج توضيحي/g)].length, 3, "Every review card must be labelled as a demonstration");
assert.equal([...reviewsSection.matchAll(/مساحة مخصصة لعرض رأي مريض موثّق بعد الحصول على موافقته/g)].length, 3, "All review cards must use explicit placeholder copy");
assert.equal([...reviewsSection.matchAll(/لا يمثل رأيًا حقيقيًا/g)].length, 3, "Every card must disclose that it is not a real review");
assert.doesNotMatch(reviewsSection, /\b[0-5](?:\.\d)?\s*\/\s*5\b|4\.9|Google|تجربة مريض حقيقية|قال أحد المرضى/, "No fabricated patient claim, average rating, or platform attribution may be displayed");
assert.doesNotMatch(html, /AggregateRating|reviewCount|ratingValue|itemprop=["']review/i, "No review or rating structured data may be added");
assert.match(html, /القسم العاشر: إجابات واضحة/);
assert.match(html, /<span class="section-marker-number" aria-hidden="true">10<\/span>/);


const faqAuditStart = html.indexOf('id="faq"');
const faqAuditEnd = html.indexOf("</section>", faqAuditStart) + "</section>".length;
const faqAuditMarkup = html.slice(faqAuditStart, faqAuditEnd);
const faqCount = [...faqAuditMarkup.matchAll(/<details\b/gi)].length;
assert.equal(faqCount, 4, "RUWA must contain exactly four focused native FAQ entries");
assert.deepEqual(
  [...faqAuditMarkup.matchAll(/<summary>([^<]+)<\/summary>/g)].map(match => match[1]),
  [
    "ماذا يحدث خلال جلسة التبييض؟",
    "هل معجون التبييض يعطي نتيجة التبييض نفسه؟",
    "هل أحتاج إلى أكثر من جلسة؟",
    "كم تدوم نتيجة التبييض؟"
  ],
  "FAQ questions must address distinct visitor concerns in the approved order"
);
assert.ok(faqAuditMarkup.includes("سبب التصبغ وعمقه والطريقة المستخدمة واستجابة الأسنان"), "Session-count answer must explain why treatment plans vary");
assert.ok(faqAuditMarkup.includes("التصبغات السطحية"), "Toothpaste answer must distinguish surface stains from tooth colour");
assert.ok(faqAuditMarkup.includes("لا توجد مدة ثابتة للجميع"), "Result-longevity answer must avoid a universal promise");
assert.doesNotMatch(faqAuditMarkup, /ما العناية المطلوبة بعد التبييض/, "The FAQ must not repeat the dedicated aftercare section");
assert.match(html, /:focus-visible\{outline:3px solid var\(--coral\);outline-offset:4px\}/, "A visible global keyboard focus indicator must remain available");

const contactActions = [...html.matchAll(/data-contact-action=["'](whatsapp|phone)["']/gi)].map(match => match[1]);
assert.equal(contactActions.filter(action => action === "whatsapp").length, 3, "RUWA must have the Hero, floating, and final WhatsApp actions");
assert.equal(contactActions.filter(action => action === "phone").length, 3, "RUWA must have header, Hero secondary, and final phone actions");

const contactHeaderScanStart = html.indexOf('<header class="site-header"');
const contactHeaderScanEnd = html.indexOf("</header>", contactHeaderScanStart) + "</header>".length;
const contactHeaderMarkup = html.slice(contactHeaderScanStart, contactHeaderScanEnd);
assert.ok(contactHeaderMarkup.includes('data-contact-action="phone"') && contactHeaderMarkup.includes("اتصل بنا"), "Header must use the phone contact action");
assert.ok(!contactHeaderMarkup.includes('data-contact-action="whatsapp"') && !contactHeaderMarkup.includes("whatsapp-brand-icon"), "Header must no longer show a WhatsApp action");

assert.match(html, /id=["']whatsapp-float["']/);
assert.match(html, /class=["']whatsapp-float["']/);
assert.match(html, /aria-label=["']تواصل عبر واتساب["']/);
assert.match(html, /new IntersectionObserver/);
assert.ok(html.includes("document.querySelector('.hero-actions .whatsapp-cta')"), "Observer must watch the Hero WhatsApp CTA");

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
assert.doesNotMatch(heroSection, /hero-demo-disclosure|نموذج تجريبي من Apex Studio/, "The separate demo sentence beneath the Hero buttons must be removed");
assert.match(html, /مفهوم تجريبي أُعدّ ضمن معرض أعمال Apex Studio/, "The footer must retain the fictional portfolio disclosure");
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
const footerSocialIcons = [...footer.matchAll(/class="footer-social-icon footer-social-icon--([a-z]+)"/g)].map(match => match[1]);
assert.deepEqual(footerSocialIcons, ["instagram", "snapchat", "tiktok", "x"], "RUWA footer must display the four approved social platform icons");
const footerAnchors = [...footer.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi)].map(match => match[1]);
assert.equal(footerAnchors.some(href => /instagram|snapchat|tiktok|x\.com/i.test(href)), false, "Social marks must remain icon-only without invented account URLs");
const footerTargets = footerAnchors.filter(href => href.startsWith("#")).map(href => href.slice(1));
assert.ok(footerTargets.length >= 9, "RUWA footer must provide useful internal navigation");
assert.ok(footer.includes('<a href="#journey">رحلة تبييض الأسنان</a>'), "Footer must link to the treatment journey");
assert.deepEqual(footerTargets.filter(target => !ids.has(target)), [], "Every RUWA footer navigation target must exist on the page");
assert.match(footer, /مفهوم تجريبي أُعدّ ضمن معرض أعمال Apex Studio/);
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

assert.match(readme, /11 content sections/);
assert.match(readme, /4 FAQ entries/);
assert.match(readme, /3 WhatsApp actions and 2 phone actions/);
assert.match(designSystem, /11 content sections/);
assert.match(designSystem, /4 native HTML details\/summary FAQ entries/);
assert.match(designSystem, /3 WhatsApp actions and 2 phone actions/);
assert.match(caseStudy, /11 قسمًا رئيسيًا/);
assert.match(caseStudy, /4 أسئلة/);
assert.match(caseStudy, /3 أزرار واتساب وزري اتصال/);
assert.match(productionAudit, /11 main content sections/);
assert.match(productionAudit, /4 native details entries/);
assert.match(productionAudit, /3 WhatsApp actions and 2 phone actions/);

console.log("RUWA repository consistency: PASS");
console.log("Sections: 11 | Reviews: transparent demo-only state | FAQ: 4 | WhatsApp actions: 3 | Phone actions: 2");
console.log("ARIA controls: all targets exist | Hero AI illustration disclosure: present");
console.log("Repository root and legacy preview paths: redirect to whitening-2026.html");
