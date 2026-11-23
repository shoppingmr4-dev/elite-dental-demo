import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = relativePath => readFile(path.join(root, relativePath), "utf8");

const [
  html,
  readme,
  designSystem,
  caseStudy,
  productionAudit,
  rootAlias,
  publicAlias
] = await Promise.all([
  read("whitening-2026.html"),
  read("README.md"),
  read("WHITENING-2026-DESIGN-SYSTEM.md"),
  read("portfolio/elite-dental-whitening/CASE-STUDY.md"),
  read("portfolio/elite-dental-whitening/PRODUCTION-READINESS-AUDIT.md"),
  read("whitening-preview.html"),
  read("preview/ruwa/index.html")
]);

const sectionIds = [...html.matchAll(/<section\b[^>]*\bid=["']([^"']+)["']/gi)].map(match => match[1]);
assert.deepEqual(
  sectionIds,
  ["top", "approach", "causes", "options", "suitability", "expectations", "team", "reviews", "faq", "consultation"],
  "RUWA must keep the approved ten-section visitor journey in order"
);

assert.match(html, /--display:"IBM Plex Sans Arabic","Alexandria",Tahoma,sans-serif;/, "Arabic display headings must use the same IBM Plex Sans Arabic family as Elite Dental Clinic");
assert.match(html, /--body:"IBM Plex Sans Arabic","Alexandria",Tahoma,sans-serif;/, "Arabic interface and body copy must use IBM Plex Sans Arabic");
assert.match(html, /href="assets\/fonts\/Qw3CZRtWPQCuHme67tEYUIx3Kh0PHR9N6Ys43PW5fslBEg0\.woff2"/, "IBM Plex Sans Arabic regular WOFF2 preload is missing");
assert.match(html, /href="assets\/fonts\/Qw3NZRtWPQCuHme67tEYUIx3Kh0PHR9N6YOG-eCRXMRrKATtYV0\.woff2"/, "IBM Plex Sans Arabic bold WOFF2 preload is missing");
assert.doesNotMatch(html, /--display:"Cairo"/, "Cairo must not remain the Arabic display font");


const headerStart = html.indexOf('<header class="site-header">');
const headerEnd = html.indexOf("</header>", headerStart) + "</header>".length;
const headerMarkup = html.slice(headerStart, headerEnd);
assert.ok(headerStart >= 0 && headerEnd > headerStart, "RUWA semantic header is missing");
const headerLinks = [...headerMarkup.matchAll(/<a\b[^>]*href=["'](#[^"']+)["'][^>]*>/g)].map(match => match[1]);
assert.deepEqual(headerLinks, ["#top","#approach","#causes","#options","#suitability","#reviews","#faq"], "Header must preserve its brand anchor and all six internal destinations");
const secondaryHeaderLinks = [...headerMarkup.matchAll(/<a\b[^>]*class=["']nav-secondary["'][^>]*href=["'](#[^"']+)["'][^>]*>/g)].map(match => match[1]);
assert.deepEqual(secondaryHeaderLinks, ["#approach","#causes","#reviews"], "Only the three secondary destinations may be hidden from the expanded desktop navigation");
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
assert.ok(reviewsSection.includes("القسم الثامن: آراء المرضى"), "Patient reviews section marker must be number 08");
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
assert.match(html, /القسم التاسع: إجابات واضحة/);
assert.match(html, /<span class="section-marker-number" aria-hidden="true">09<\/span>/);


const faqCount = [...html.matchAll(/<details\b/gi)].length;
assert.equal(faqCount, 4, "RUWA must contain exactly four focused native FAQ entries");

const contactActions = [...html.matchAll(/data-contact-action=["'](whatsapp|phone)["']/gi)].map(match => match[1]);
assert.equal(contactActions.filter(action => action === "whatsapp").length, 3, "RUWA must have three WhatsApp actions");
assert.equal(contactActions.filter(action => action === "phone").length, 2, "RUWA must have two phone actions");

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
assert.ok(footerTargets.length >= 8, "RUWA footer must provide useful internal navigation");
assert.deepEqual(footerTargets.filter(target => !ids.has(target)), [], "Every RUWA footer navigation target must exist on the page");
assert.match(footer, /مفهوم تجريبي أُعدّ ضمن معرض أعمال Apex Studio/);
assert.match(footer, /الصور المعروضة، بما فيها صور الأطباء، توضيحية مولّدة بالذكاء الاصطناعي/);
assert.match(footer, /المحتوى للتوعية العامة فقط/);


assert.match(rootAlias, /http-equiv="refresh" content="0;url=whitening-2026\.html"/);
assert.match(publicAlias, /http-equiv="refresh" content="0;url=\.\.\/\.\.\/whitening-2026\.html"/);
assert.match(rootAlias, /rel="canonical" href="whitening-2026\.html"/);
assert.match(publicAlias, /rel="canonical" href="\.\.\/\.\.\/whitening-2026\.html"/);
assert.doesNotMatch(rootAlias + publicAlias, /pexels|prepare-inquiry|clipboard|Elite Dental Clinic/i);

for (const [name, content] of [
  ["README", readme],
  ["Design system", designSystem],
  ["Case study", caseStudy],
  ["Production audit", productionAudit]
]) {
  assert.match(content, /whitening-2026\.html/, name + " must point to the canonical RUWA page");
  assert.match(content, /RUWA/, name + " must identify the RUWA project");
}

assert.match(readme, /10 content sections/);
assert.match(readme, /4 FAQ entries/);
assert.match(readme, /3 WhatsApp actions and 2 phone actions/);
assert.match(designSystem, /10 content sections/);
assert.match(designSystem, /4 native HTML details\/summary FAQ entries/);
assert.match(designSystem, /3 WhatsApp actions and 2 phone actions/);
assert.match(caseStudy, /10 أقسام رئيسية/);
assert.match(caseStudy, /4 أسئلة/);
assert.match(caseStudy, /3 أزرار واتساب وزري اتصال/);
assert.match(productionAudit, /10 main content sections/);
assert.match(productionAudit, /4 native details entries/);
assert.match(productionAudit, /3 WhatsApp actions and 2 phone actions/);

console.log("RUWA repository consistency: PASS");
console.log("Sections: 10 | Reviews: transparent demo-only state | FAQ: 4 | WhatsApp actions: 3 | Phone actions: 2");
console.log("ARIA controls: all targets exist | Hero AI illustration disclosure: present");
console.log("Legacy preview paths: both redirect to whitening-2026.html");
