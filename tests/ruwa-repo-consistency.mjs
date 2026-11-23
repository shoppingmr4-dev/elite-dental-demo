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
  ["top", "approach", "causes", "options", "suitability", "expectations", "team", "faq", "consultation"],
  "RUWA must keep the approved nine-section visitor journey in order"
);

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

const footer = html.match(/<footer\\b[^>]*>[\\s\\S]*?<\\/footer>/i)?.[0] || "";
assert.ok(footer, "RUWA must contain a semantic footer");
const footerSocialIcons = [...footer.matchAll(/class="footer-social-icon footer-social-icon--([a-z]+)"/g)].map(match => match[1]);
assert.deepEqual(
  footerSocialIcons,
  ["instagram", "snapchat", "tiktok", "x"],
  "RUWA footer must display the four approved social platform icons"
);
assert.equal(
  [...footer.matchAll(/<a\\b[^>]*href=["']https?:\\/\\/(?:www\\.)?(?:instagram|snapchat|tiktok|x)\\./gi)].length,
  0,
  "Social marks must remain icon-only until verified official account URLs are supplied"
);
const footerTargets = [...footer.matchAll(/href="#([^"]+)"/g)].map(match => match[1]);
assert.ok(footerTargets.length >= 7, "RUWA footer must provide useful internal navigation");
assert.deepEqual(
  footerTargets.filter(target => !ids.has(target)),
  [],
  "Every RUWA footer navigation target must exist on the page"
);
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

assert.match(readme, /9 content sections/);
assert.match(readme, /4 FAQ entries/);
assert.match(readme, /3 WhatsApp actions and 2 phone actions/);
assert.match(designSystem, /9 content sections/);
assert.match(designSystem, /4 native HTML details\/summary FAQ entries/);
assert.match(designSystem, /3 WhatsApp actions and 2 phone actions/);
assert.match(caseStudy, /9 أقسام رئيسية/);
assert.match(caseStudy, /4 أسئلة/);
assert.match(caseStudy, /3 أزرار واتساب وزري اتصال/);
assert.match(productionAudit, /9 main content sections/);
assert.match(productionAudit, /4 native details entries/);
assert.match(productionAudit, /3 WhatsApp actions and 2 phone actions/);

console.log("RUWA repository consistency: PASS");
console.log("Sections: 8 | FAQ: 4 | WhatsApp actions: 3 | Phone actions: 2");
console.log("ARIA controls: all targets exist | Hero AI illustration disclosure: present");
console.log("Legacy preview paths: both redirect to whitening-2026.html");
