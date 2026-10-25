import fs from 'node:fs';
import path from 'node:path';

const resultsDir = path.resolve(process.env.RESULTS_DIR || 'results');
const summaryPath = path.join(resultsDir, 'summary.json');
if (!fs.existsSync(summaryPath)) throw new Error('Missing summary.json from the browser/Lighthouse comparison.');
const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
const failures = [];
const checks = {};

function add(name, passed, detail) {
  checks[name] = { passed: !!passed, detail: String(detail) };
  if (!passed) failures.push(name + ': ' + detail);
}
function identical(diff) {
  return !!diff && diff.comparable === true && diff.differingPercent === 0;
}
function same(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}
function mean(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

const visual = Object.fromEntries((summary.visual || []).map(item => [item.variant, item]));
const baseline = visual.baseline;
const candidate = visual.candidate;
add('both-browser-smoke-records', !!baseline && !!candidate, 'Both main and candidate browser checks must exist.');

if (baseline && candidate) {
  for (const item of [['main', baseline], ['candidate', candidate]]) {
    const name = item[0];
    const run = item[1];
    add(name + '-navigation', !run.navigationError, run.navigationError || 'Navigation succeeded.');
    add(name + '-arabic-rtl', !!run.settled && run.settled.lang === 'ar' && run.settled.dir === 'rtl',
      'lang=' + (run.settled && run.settled.lang) + '; dir=' + (run.settled && run.settled.dir));
    add(name + '-settled-fonts', run.fontsReady === true && !!run.settled &&
      run.settled.fontsStatus === 'loaded' && run.settled.alexandria700Loaded === true &&
      run.settled.ibmPlexArabic400Loaded === true,
      'ready=' + run.fontsReady + '; status=' + (run.settled && run.settled.fontsStatus) +
      '; Alexandria 700=' + (run.settled && run.settled.alexandria700Loaded) +
      '; IBM Plex Arabic 400=' + (run.settled && run.settled.ibmPlexArabic400Loaded));
    add(name + '-zero-javascript-errors', (run.jsErrors || []).length === 0,
      'JavaScript errors=' + (run.jsErrors || []).length);
    add(name + '-zero-failed-requests', (run.failedExternalRequestCount || 0) === 0,
      'Failed requests=' + (run.failedExternalRequestCount || 0));
    add(name + '-menu-not-broken', !['failed', 'error'].includes(run.menuInteraction && run.menuInteraction.result),
      'Menu check=' + (run.menuInteraction && run.menuInteraction.result));
  }

  const baseImages = baseline.settled || {};
  const candidateImages = candidate.settled || {};
  add('images-no-regression', baseImages.imageCount === candidateImages.imageCount &&
    Number.isFinite(baseImages.imagesLoaded) && Number.isFinite(candidateImages.imagesLoaded) &&
    candidateImages.imagesLoaded >= baseImages.imagesLoaded &&
    (baseImages.imageFailures || []).length === 0 && (candidateImages.imageFailures || []).length === 0,
    'Main loaded ' + baseImages.imagesLoaded + '/' + baseImages.imageCount +
    '; candidate loaded ' + candidateImages.imagesLoaded + '/' + candidateImages.imageCount +
    '; failures main/candidate=' + (baseImages.imageFailures || []).length + '/' + (candidateImages.imageFailures || []).length +
    '. Lazy/deferred images may remain unloaded in both versions; equal coverage is not a candidate regression.');

  add('same-settled-layout-and-type', !!baseline.settled && !!candidate.settled &&
    same(baseline.settled.h1Box, candidate.settled.h1Box) &&
    same(baseline.settled.pageSize, candidate.settled.pageSize) &&
    baseline.settled.bodyFont === candidate.settled.bodyFont &&
    baseline.settled.h1Font === candidate.settled.h1Font,
    'Settled heading geometry, document dimensions and computed font families must match.');
  add('same-menu-interaction-result', !!baseline.menuInteraction && !!candidate.menuInteraction &&
    baseline.menuInteraction.result === candidate.menuInteraction.result,
    'Main=' + (baseline.menuInteraction && baseline.menuInteraction.result) +
    '; candidate=' + (candidate.menuInteraction && candidate.menuInteraction.result));

  const baseFirst = baseline.firstPaint || {};
  const candidateFirst = candidate.firstPaint || {};
  const earlyTypographyMatches = baseFirst.alexandria700Loaded === true &&
    candidateFirst.alexandria700Loaded === true &&
    same(baseFirst.h1Box, candidateFirst.h1Box) &&
    baseFirst.h1Text === candidateFirst.h1Text &&
    baseFirst.h1Font === candidateFirst.h1Font &&
    baseFirst.bodyFont === candidateFirst.bodyFont &&
    baseFirst.h1Weight === candidateFirst.h1Weight;
  add('no-first-paint-font-or-geometry-regression', earlyTypographyMatches,
    'First-paint fonts/geometry: main h1=' + JSON.stringify(baseFirst.h1Box) +
    '; candidate h1=' + JSON.stringify(candidateFirst.h1Box) +
    '; Alexandria 700 loaded main/candidate=' + baseFirst.alexandria700Loaded + '/' + candidateFirst.alexandria700Loaded);

  const screenshots = summary.screenshotComparisons || {};
  add('domcontentloaded-screenshot-identical', identical(screenshots.domContentLoaded),
    'Main-to-candidate pixel difference=' + (screenshots.domContentLoaded && screenshots.domContentLoaded.differingPercent) + '%');
  add('settled-fullpage-screenshot-identical', identical(screenshots.settledFullPage),
    'Main-to-candidate pixel difference=' + (screenshots.settledFullPage && screenshots.settledFullPage.differingPercent) + '%');
  const fcpDiff = screenshots.firstContentfulPaint;
  add('first-paint-visual-difference-is-timing-only', !!fcpDiff && fcpDiff.comparable === true &&
    earlyTypographyMatches && identical(screenshots.domContentLoaded) && identical(screenshots.settledFullPage),
    'FCP pixel difference=' + (fcpDiff && fcpDiff.differingPercent) +
    '% (diagnostic, not a hard failure when first-paint typography/geometry match and DOMContentLoaded plus settled screenshots are pixel-identical).');

  const events = candidate.fontRequestEvents || [];
  const badResponses = events.filter(event => event.responseStatus !== 200 || event.failure);
  const remoteFonts = events.filter(event => /fonts\.(?:googleapis|gstatic)\.com/i.test(event.url || ''));
  const cssEvents = events.filter(event => /\/assets\/fonts\/local-fonts\.css(?:$|\?)/i.test(event.url || ''));
  const woffEvents = events.filter(event => /\/assets\/fonts\/[^/]+\.woff2(?:$|\?)/i.test(event.url || ''));
  const distinctWoffs = Array.from(new Set(woffEvents.map(event => event.url)));
  add('candidate-font-responses-http-200', events.length > 0 && badResponses.length === 0,
    'Font/CSS requests=' + events.length + '; failed or non-200 responses=' + badResponses.length);
  add('no-remote-google-fonts', remoteFonts.length === 0, 'Remote Google Fonts requests=' + remoteFonts.length);
  add('exactly-eight-local-woff2-files', distinctWoffs.length === 8 && woffEvents.length >= 8,
    'Distinct local WOFF2 URLs=' + distinctWoffs.length + '; request events=' + woffEvents.length);
  add('local-font-css-requested', cssEvents.length > 0, 'Local CSS requests=' + cssEvents.length);
}

const averages = summary.averages || {};
const mainAverage = averages.baseline || {};
const candidateAverage = averages.candidate || {};
const runs = summary.lighthouseRuns || [];
const pairs = [1, 2, 3].map(number => {
  const before = runs.find(item => item.variant === 'baseline' && item.run === number);
  const after = runs.find(item => item.variant === 'candidate' && item.run === number);
  return {
    run: number,
    fcpImprovementMs: before && after && Number.isFinite(before.fcpMs) && Number.isFinite(after.fcpMs) ? before.fcpMs - after.fcpMs : null,
    lcpImprovementMs: before && after && Number.isFinite(before.lcpMs) && Number.isFinite(after.lcpMs) ? before.lcpMs - after.lcpMs : null,
    performancePointChange: before && after && Number.isFinite(before.performanceScore) && Number.isFinite(after.performanceScore) ? after.performanceScore - before.performanceScore : null
  };
});
const fcpGains = pairs.map(pair => pair.fcpImprovementMs).filter(Number.isFinite);
const lcpGains = pairs.map(pair => pair.lcpImprovementMs).filter(Number.isFinite);
const meanFcpGain = mean(fcpGains);
const meanLcpGain = mean(lcpGains);
const materialFcp = fcpGains.length === 3 && meanFcpGain >= 200 && fcpGains.filter(value => value >= 100).length >= 2;
const materialLcp = lcpGains.length === 3 && meanLcpGain >= 200 && lcpGains.filter(value => value >= 100).length >= 2;
const scoreChange = Number.isFinite(mainAverage.performanceScore) && Number.isFinite(candidateAverage.performanceScore) ? candidateAverage.performanceScore - mainAverage.performanceScore : null;
const fcpChange = Number.isFinite(mainAverage.fcpMs) && Number.isFinite(candidateAverage.fcpMs) ? candidateAverage.fcpMs - mainAverage.fcpMs : null;
const lcpChange = Number.isFinite(mainAverage.lcpMs) && Number.isFinite(candidateAverage.lcpMs) ? candidateAverage.lcpMs - mainAverage.lcpMs : null;
const clsChange = Number.isFinite(mainAverage.cls) && Number.isFinite(candidateAverage.cls) ? candidateAverage.cls - mainAverage.cls : null;
const tbtChange = Number.isFinite(mainAverage.tbtMs) && Number.isFinite(candidateAverage.tbtMs) ? candidateAverage.tbtMs - mainAverage.tbtMs : null;

add('three-lighthouse-runs-per-version', mainAverage.runs === 3 && candidateAverage.runs === 3,
  'Main runs=' + mainAverage.runs + '; candidate runs=' + candidateAverage.runs);
add('repeatable-material-performance-gain', materialFcp || materialLcp,
  'Mean FCP improvement=' + (meanFcpGain == null ? 'n/a' : meanFcpGain.toFixed(1)) +
  'ms; mean LCP improvement=' + (meanLcpGain == null ? 'n/a' : meanLcpGain.toFixed(1)) +
  'ms. Require >=200ms mean and >=100ms gain in at least 2/3 paired runs.');
add('no-material-fcp-lcp-regression', fcpChange != null && lcpChange != null && fcpChange <= 100 && lcpChange <= 100,
  'Candidate-minus-main FCP=' + fcpChange + 'ms; LCP=' + lcpChange + 'ms.');
add('performance-score-not-regressed', scoreChange != null && scoreChange >= -1,
  'Candidate-minus-main Performance score=' + scoreChange + ' points.');
add('cls-not-materially-regressed', clsChange != null && clsChange <= 0.002,
  'Candidate-minus-main CLS=' + clsChange + '.');
add('tbt-not-materially-regressed', tbtChange != null && tbtChange <= 50,
  'Candidate-minus-main TBT=' + tbtChange + 'ms.');

const passed = failures.length === 0;
const report = {
  decision: passed ? 'PASS_FOR_REVIEW_ONLY' : 'REJECT_CANDIDATE',
  passed,
  baselineSha: summary.environment && summary.environment.baselineSha || null,
  candidateSha: summary.environment && summary.environment.candidateSha || null,
  thresholds: {
    performance: 'Mean FCP or LCP improvement >=200ms and >=100ms improvement in at least two of three paired runs.',
    regressionGuards: 'Performance score drop <=1 point; FCP/LCP regression <=100ms; CLS delta <=0.002; TBT delta <=50ms.',
    visual: 'DOMContentLoaded and settled screenshots must be pixel-identical. FCP difference is reviewed with font/geometry checks because animation reveal timing may advance with faster asset readiness.',
    imageCoverage: 'No candidate reduction in loaded image count, no image failures, and page dimensions/settled screenshot unchanged.',
    fonts: 'Eight distinct local WOFF2 files and local stylesheet return HTTP 200; no remote Google Fonts requests; Arabic fonts load.'
  },
  pairedRuns: pairs,
  meanFcpImprovementMs: meanFcpGain,
  meanLcpImprovementMs: meanLcpGain,
  averages: { main: mainAverage, candidate: candidateAverage },
  screenshotComparisons: summary.screenshotComparisons,
  checks,
  failures
};
fs.writeFileSync(path.join(resultsDir, 'quality-gate.json'), JSON.stringify(report, null, 2));
const rows = Object.entries(checks).map(entry =>
  '| ' + entry[0] + ' | ' + (entry[1].passed ? 'PASS' : 'FAIL') + ' | ' + entry[1].detail.replace(/\|/g, '\\|') + ' |'
);
const markdown = [
  '# Candidate quality gate',
  '',
  '**Decision: ' + report.decision + '**',
  '',
  '- Baseline SHA: ' + report.baselineSha,
  '- Candidate SHA: ' + report.candidateSha,
  '- Mean FCP improvement: ' + (meanFcpGain == null ? 'n/a' : meanFcpGain.toFixed(1) + ' ms'),
  '- Mean LCP improvement: ' + (meanLcpGain == null ? 'n/a' : meanLcpGain.toFixed(1) + ' ms'),
  '',
  '| Check | Result | Detail |',
  '|---|---|---|',
  ...rows,
  '',
  'This result applies to the isolated candidate only. It does not authorize a merge or deployment.',
  ''
].join('\n');
fs.writeFileSync(path.join(resultsDir, 'quality-gate.md'), markdown);
console.log(markdown);
if (!passed) process.exitCode = 1;
