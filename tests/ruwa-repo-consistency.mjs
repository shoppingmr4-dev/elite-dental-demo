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
  ["top", "trust", "about", "causes", "approach", "options", "suitability", "expectations", "team", "facilities", "reviews", "faq", "hours", "consultation"],
  "RUWA must keep the approved 14-section single-page visitor journey in the validated order"
);

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
assert.ok(html.includes('src="assets/ruwa-dentist-demo.webp"'), "The fictional clinician demo portrait must be referenced locally.");
assert.match(html, /صورة توضيحية مولّدة بالذكاء الاصطناعي لشخصية طبيب أسنان خيالية/);
assert.match(html, /جميع النصوص أدناه تجريبية ومكتوبة لعرض التصميم فقط/);
assert.match(html, /مواعيد افتراضية لأغراض عرض التصميم/);
assert.match(html, /رقم الهاتف وواتساب غير مضافين إلى نموذج العرض/);
assert.equal([...html.matchAll(/class="facility-photo-blank"/g)].length, 2, "Two intentionally blank white facility-image spaces must remain.");

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

assert.match(readme, /14 content sections/);
assert.match(readme, /4 FAQ entries/);
assert.match(readme, /3 WhatsApp actions and 2 phone actions/);
assert.match(designSystem, /14 content sections/);
assert.match(designSystem, /4 native HTML details\/summary FAQ entries/);
assert.match(designSystem, /3 WhatsApp actions and 2 phone actions/);
assert.match(caseStudy, /14 قسمًا رئيسيًا/);
assert.match(caseStudy, /4 أسئلة/);
assert.match(caseStudy, /3 أزرار واتساب وزري اتصال/);
assert.match(productionAudit, /14 main content sections/);
assert.match(productionAudit, /4 native details entries/);
assert.match(productionAudit, /3 WhatsApp actions and 2 phone actions/);

console.log("RUWA repository consistency: PASS");
console.log("Sections: 14 | FAQ: 4 | WhatsApp actions: 3 | Phone actions: 2");
console.log("ARIA controls: all targets exist | Hero AI illustration disclosure: present");
console.log("Legacy preview paths: both redirect to whitening-2026.html");
