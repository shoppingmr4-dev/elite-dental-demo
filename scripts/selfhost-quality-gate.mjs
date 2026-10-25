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
function pixelIdentical(diff) {
  return !!diff && diff.comparable === true && diff.differingPercent === 0;
}

const visuals = Object.fromEntries((summary.visual || []).map(item => [item.variant, item]));
const baseline = visuals.baseline;
const candidate = visuals.candidate;
add('both-browser-smoke-records', !!baseline && !!candidate, 'Both main and candidate browser checks must be present.');

if (baseline && candidate) {
  for (const pair of [['baseline', baseline], ['candidate', candidate]]) {
    const name = pair[0];
    const run = pair[1];
    add(name + '-navigation', !run.navigationError, run.navigationError || 'Navigation succeeded.');
    add(name + '-arabic-rtl', run.settled && run.settled.lang === 'ar' && run.settled.dir === 'rtl',
      'lang=' + (run.settled && run.settled.lang) + '; dir=' + (run.settled && run.settled.dir));
    add(name + '-settled-fonts', run.fontsReady === true && run.settled &&
      run.settled.fontsStatus === 'loaded' && run.settled.alexandria700Loaded === true &&
      run.settled.ibmPlexArabic400Loaded === true,
      'ready=' + run.fontsReady + '; status=' + (run.settled && run.settled.fontsStatus) +
      '; Alexandria700=' + (run.settled && run.settled.alexandria700Loaded) +
      '; IBM Plex Arabic 400=' + (run.settled && run.settled.ibmPlexArabic400Loaded));
    add(name + '-all-images-loaded', !!run.settled && run.settled.imageCount > 0 &&
      run.settled.imagesLoaded === run.settled.imageCount && (run.settled.imageFailures || []).length === 0,
      'images=' + (run.settled && run.settled.imagesLoaded) + '/' + (run.settled && run.settled.imageCount) +
      '; failures=' + ((run.settled && run.settled.imageFailures) || []).length);
    add(name + '-zero-javascript-errors', (run.jsErrors || []).length === 0,
      'JavaScript errors=' + (run.jsErrors || []).length);
    add(name + '-zero-failed-requests', (run.failedExternalRequestCount || 0) === 0,
      'Failed requests=' + (run.failedExternalRequestCount || 0));
    add(name + '-menu-behavior-not-failed', !['failed', 'error'].includes(run.menuInteraction && run.menuInteraction.result),
      'Menu interaction=' + (run.menuInteraction && run.menuInteraction.result));
  }

  const baselineFirst = baseline.firstPaint || {};
  const candidateFirst = candidate.firstPaint || {};
  add('no-font-availability-regression-at-first-paint',
    !(baselineFirst.alexandria700Loaded === true && candidateFirst.alexandria700Loaded !== true),
    'Alexandria 700 loaded at FCP: main=' + baselineFirst.alexandria700Loaded +
    '; candidate=' + candidateFirst.alexandria700Loaded);
  add('same-settled-layout-and-type',
    JSON.stringify(baseline.settled && baseline.settled.h1Box) === JSON.stringify(candidate.settled && candidate.settled.h1Box) &&
    JSON.stringify(baseline.settled && baseline.settled.pageSize) === JSON.stringify(candidate.settled && candidate.settled.pageSize) &&
    baseline.settled && candidate.settled && baseline.settled.bodyFont === candidate.settled.bodyFont &&
    baseline.settled.h1Font === candidate.settled.h1Font,
    'Settled h1 box, document dimensions, body font and heading font must match.');
  add('same-menu-interaction-result',
    baseline.menuInteraction && candidate.menuInteraction &&
    baseline.menuInteraction.result === candidate.menuInteraction.result,
    'Main=' + (baseline.menuInteraction && baseline.menuInteraction.result) +
    '; candidate=' + (candidate.menuInteraction && candidate.menuInteraction.result));

  const candidateEvents = candidate.fontRequestEvents || [];
  const fontEventsWithBadResponses = candidateEvents.filter(event => event.responseStatus !== 200 || event.failure);
  const remoteFontEvents = candidateEvents.filter(event => /fonts\.(?:googleapis|gstatic)\.com/i.test(event.url || ''));
  const localCssEvents = candidateEvents.filter(event => /\/assets\/fonts\/local-fonts\.css(?:$|\?)/i.test(event.url || ''));
  const localWoffEvents = candidateEvents.filter(event => /\/assets\/fonts\/[^/]+\.woff2(?:$|\?)/i.test(event.url || ''));
  const uniqueLocalWoffs = Array.from(new Set(localWoffEvents.map(event => event.url)));
  add('all-candidate-font-responses-http-200', candidateEvents.length > 0 && fontEventsWithBadResponses.length === 0,
    'Font/CSS requests=' + candidateEvents.length + '; missing, failed or non-200 responses=' + fontEventsWithBadResponses.length);
  add('no-remote-google-font-requests', remoteFontEvents.length === 0, 'Remote Google Fonts requests=' + remoteFontEvents.length);
  add('exactly-eight-local-font-files', uniqueLocalWoffs.length === 8 && localWoffEvents.length >= 8,
    'Distinct local WOFF2 URLs=' + uniqueLocalWoffs.length + '; WOFF2 request events=' + localWoffEvents.length);
  add('local-css-requested', localCssEvents.length > 0, 'Local CSS requests=' + localCssEvents.length);

  const screenshots = summary.screenshotComparisons || {};
  add('domcontentloaded-screenshot-identical', pixelIdentical(screenshots.domContentLoaded),
    'Main-to-candidate pixel difference=' + (screenshots.domContentLoaded && screenshots.domContentLoaded.differingPercent));
  add('first-paint-screenshot-identical', pixelIdentical(screenshots.firstContentfulPaint),
    'Main-to-candidate pixel difference=' + (screenshots.firstContentfulPaint && screenshots.firstContentfulPaint.differingPercent));
  add('settled-fullpage-screenshot-identical', pixelIdentical(screenshots.settledFullPage),
    'Main-to-candidate pixel difference=' + (screenshots.settledFullPage && screenshots.settledFullPage.differingPercent));
}

const averages = summary.averages || {};
const mainAverage = averages.baseline || {};
const candidateAverage = averages.candidate || {};
const runs = summary.lighthouseRuns || [];
const pairedRuns = [1, 2, 3].map(number => {
  const base = runs.find(item => item.variant === 'baseline' && item.run === number);
  const trial = runs.find(item => item.variant === 'candidate' && item.run === number);
  return {
    run: number,
    fcpImprovementMs: base && trial && Number.isFinite(base.fcpMs) && Number.isFinite(trial.fcpMs) ? base.fcpMs - trial.fcpMs : null,
    lcpImprovementMs: base && trial && Number.isFinite(base.lcpMs) && Number.isFinite(trial.lcpMs) ? base.lcpMs - trial.lcpMs : null,
    performancePointChange: base && trial && Number.isFinite(base.performanceScore) && Number.isFinite(trial.performanceScore) ? trial.performanceScore - base.performanceScore : null
  };
});
function mean(values) {
  return values.length ? values.reduce((total, value) => total + value, 0) / values.length : null;
}
const fcpGains = pairedRuns.map(item => item.fcpImprovementMs).filter(Number.isFinite);
const lcpGains = pairedRuns.map(item => item.lcpImprovementMs).filter(Number.isFinite);
const meanFcpGain = mean(fcpGains);
const meanLcpGain = mean(lcpGains);
const fcpMaterialRepeatable = fcpGains.length === 3 && meanFcpGain >= 200 && fcpGains.filter(value => value >= 100).length >= 2;
const lcpMaterialRepeatable = lcpGains.length === 3 && meanLcpGain >= 200 && lcpGains.filter(value => value >= 100).length >= 2;

const scoreChange = Number.isFinite(mainAverage.performanceScore) && Number.isFinite(candidateAverage.performanceScore)
  ? candidateAverage.performanceScore - mainAverage.performanceScore : null;
const fcpChange = Number.isFinite(mainAverage.fcpMs) && Number.isFinite(candidateAverage.fcpMs)
  ? candidateAverage.fcpMs - mainAverage.fcpMs : null;
const lcpChange = Number.isFinite(mainAverage.lcpMs) && Number.isFinite(candidateAverage.lcpMs)
  ? candidateAverage.lcpMs - mainAverage.lcpMs : null;
const clsChange = Number.isFinite(mainAverage.cls) && Number.isFinite(candidateAverage.cls)
  ? candidateAverage.cls - mainAverage.cls : null;
const tbtChange = Number.isFinite(mainAverage.tbtMs) && Number.isFinite(candidateAverage.tbtMs)
  ? candidateAverage.tbtMs - mainAverage.tbtMs : null;

add('three-lighthouse-runs-per-version', mainAverage.runs === 3 && candidateAverage.runs === 3,
  'Main runs=' + mainAverage.runs + '; candidate runs=' + candidateAverage.runs);
add('repeatable-material-performance-gain', fcpMaterialRepeatable || lcpMaterialRepeatable,
  'Mean FCP improvement=' + (meanFcpGain == null ? 'n/a' : meanFcpGain.toFixed(1)) +
  'ms; mean LCP improvement=' + (meanLcpGain == null ? 'n/a' : meanLcpGain.toFixed(1)) +
  'ms. Require >=200ms mean and >=100ms improvement in at least 2/3 paired runs.');
add('no-material-fcp-lcp-regression', fcpChange != null && lcpChange != null && fcpChange <= 100 && lcpChange <= 100,
  'Candidate-minus-main FCP=' + fcpChange + 'ms; LCP=' + lcpChange + 'ms.');
add('performance-score-not-regressed', scoreChange != null && scoreChange >= -1,
  'Candidate-minus-main Performance=' + scoreChange + ' points.');
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
    materialGain: 'Mean FCP or LCP improvement >=200ms and >=100ms improvement in at least 2 of 3 paired runs.',
    regressionGuards: 'Performance drop <=1 point; FCP/LCP regression <=100ms; CLS delta <=0.002; TBT delta <=50ms.',
    visualGuard: 'DOMContentLoaded, FCP and settled full-page screenshots must be pixel-identical; settled font/layout and interactions preserved.',
    fontGuard: 'All eight unique local WOFF2 files and local CSS HTTP 200; no external Google Fonts requests; Arabic fonts settle.'
  },
  pairedRuns,
  meanFcpImprovementMs: meanFcpGain,
  meanLcpImprovementMs: meanLcpGain,
  checks,
  failures
};
fs.writeFileSync(path.join(resultsDir, 'quality-gate.json'), JSON.stringify(report, null, 2));
const markdownRows = Object.entries(checks).map(entry =>
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
  ...markdownRows,
  '',
  'This result evaluates an isolated branch only. It does not authorize merge or deployment.',
  ''
].join('\n');
fs.writeFileSync(path.join(resultsDir, 'quality-gate.md'), markdown);
console.log(markdown);
if (!passed) process.exitCode = 1;
