import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { PNG } from 'pngjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const resultsDir = path.resolve(process.env.RESULTS_DIR || path.join(here, '..', 'results'));
const baselineUrl = process.env.BASELINE_URL || 'http://127.0.0.1:4173/';
const candidateUrl = process.env.CANDIDATE_URL || 'http://127.0.0.1:4174/';
fs.mkdirSync(resultsDir, { recursive: true });

const round = (n, digits = 2) => Number.isFinite(n) ? Number(n.toFixed(digits)) : null;
const mean = (values) => values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function metricsFromLighthouse(report) {
  const audits = report.audits || {};
  const metric = (id) => {
    const value = audits[id]?.numericValue;
    return Number.isFinite(value) ? value : null;
  };
  const blockingAudit = audits['render-blocking-resources'];
  const blockingInsight = Object.entries(audits).find(([id, audit]) =>
    /render-blocking/i.test(id + ' ' + (audit?.title || ''))
  );
  const networkItems = audits['network-requests']?.details?.items || [];
  const fontRequests = networkItems
    .filter(item => /fonts\.(googleapis|gstatic)\.com/i.test(item.url || ''))
    .map(item => ({
      url: item.url,
      resourceType: item.resourceType || null,
      statusCode: item.statusCode ?? null,
      transferSize: item.transferSize ?? null,
      resourceSize: item.resourceSize ?? null,
      networkRequestTime: item.networkRequestTime ?? null,
      networkEndTime: item.networkEndTime ?? null,
    }));
  const renderBlocking = {
    auditId: blockingInsight?.[0] || (blockingAudit ? 'render-blocking-resources' : null),
    title: blockingInsight?.[1]?.title || blockingAudit?.title || null,
    score: blockingInsight?.[1]?.score ?? blockingAudit?.score ?? null,
    overallSavingsMs: blockingAudit?.details?.overallSavingsMs
      ?? blockingInsight?.[1]?.details?.overallSavingsMs
      ?? blockingInsight?.[1]?.details?.metricSavings?.FCP?.savingsMs
      ?? null,
    items: (blockingAudit?.details?.items || blockingInsight?.[1]?.details?.items || [])
      .slice(0, 10)
      .map(item => ({ url: item.url || null, wastedMs: item.wastedMs ?? null, transferSize: item.transferSize ?? null })),
    relatedAuditIds: Object.entries(audits)
      .filter(([id, audit]) => /render-blocking/i.test(id + ' ' + (audit?.title || '')))
      .map(([id, audit]) => ({ id, title: audit.title || null, score: audit.score ?? null })),
  };
  return {
    performanceScore: report.categories?.performance?.score == null ? null : round(report.categories.performance.score * 100, 1),
    fcpMs: metric('first-contentful-paint'),
    lcpMs: metric('largest-contentful-paint'),
    cls: metric('cumulative-layout-shift'),
    speedIndexMs: metric('speed-index'),
    tbtMs: metric('total-blocking-time'),
    renderBlocking,
    fontRequests,
    lighthouseVersion: report.lighthouseVersion || null,
    userAgent: report.environment?.hostUserAgent || null,
    benchmarkIndex: report.environment?.benchmarkIndex || null,
  };
}

function diffPng(aPath, bPath) {
  if (!fs.existsSync(aPath) || !fs.existsSync(bPath)) return { comparable: false, reason: 'Screenshot file missing' };
  const a = PNG.sync.read(fs.readFileSync(aPath));
  const b = PNG.sync.read(fs.readFileSync(bPath));
  if (a.width !== b.width || a.height !== b.height) {
    return { comparable: false, a: { width: a.width, height: a.height }, b: { width: b.width, height: b.height }, reason: 'Screenshot dimensions differ' };
  }
  let changed = 0;
  const total = a.width * a.height;
  for (let i = 0; i < a.data.length; i += 4) {
    const delta = Math.abs(a.data[i] - b.data[i]) + Math.abs(a.data[i + 1] - b.data[i + 1]) + Math.abs(a.data[i + 2] - b.data[i + 2]);
    if (delta > 75) changed++;
  }
  return { comparable: true, width: a.width, height: a.height, differingPixels: changed, totalPixels: total, differingPercent: round(changed / total * 100, 3), threshold: 'sum RGB difference > 75' };
}

async function browserSmoke(name, url) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 412, height: 915 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  const jsErrors = [];
  const failedExternalRequests = [];
  const fontRequestEvents = [];
  let phase = 'before-navigation';
  let navigationStartEpoch = Date.now();
  page.on('pageerror', error => jsErrors.push(String(error.message || error)));
  page.on('request', request => {
    if (/fonts\.(?:googleapis|gstatic)\.com/i.test(request.url())) {
      fontRequestEvents.push({
        url: request.url(),
        resourceType: request.resourceType(),
        phase,
        requestStartMsFromNavigation: Math.max(0, Date.now() - navigationStartEpoch),
        responseStatus: null,
        responseEndMsFromNavigation: null,
        failure: null,
      });
    }
  });
  page.on('response', response => {
    const url = response.url();
    const matching = fontRequestEvents.findLast(item => item.url === url && item.responseStatus === null && item.failure === null);
    if (matching) {
      matching.responseStatus = response.status();
      matching.responseEndMsFromNavigation = Math.max(0, Date.now() - navigationStartEpoch);
    }
  });
  page.on('requestfailed', request => {
    const address = request.url();
    const matching = fontRequestEvents.findLast(item => item.url === address && item.failure === null);
    if (matching) matching.failure = request.failure()?.errorText || 'request failed';
    if (/fonts\.|images\./i.test(address) || request.failure()?.errorText) {
      failedExternalRequests.push({ url: address, error: request.failure()?.errorText || 'request failed' });
    }
  });
  await page.addInitScript(() => {
    window.__fontAuditLayoutShifts = [];
    try {
      new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) window.__fontAuditLayoutShifts.push(entry.value);
        }
      }).observe({ type: 'layout-shift', buffered: true });
    } catch {}
  });

  let navigationError = null;
  try {
    phase = 'navigation';
    navigationStartEpoch = Date.now();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  } catch (error) {
    navigationError = String(error.message || error);
  }
  phase = 'initial-viewport-before-scroll';

  const early = await page.evaluate(() => {
    const paints = performance.getEntriesByType('paint');
    const resources = performance.getEntriesByType('resource')
      .filter(entry => /fonts\.(?:googleapis|gstatic)\.com/i.test(entry.name))
      .map(entry => ({
        url: entry.name,
        startTimeMs: Number(entry.startTime.toFixed(2)),
        durationMs: Number(entry.duration.toFixed(2)),
        transferSize: entry.transferSize ?? null,
        encodedBodySize: entry.encodedBodySize ?? null,
      }));
    const heading = document.querySelector('h1');
    const visibleText = Array.from(document.querySelectorAll('body *'))
      .filter(el => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && r.top < innerHeight && r.bottom > 0 && s.visibility !== 'hidden' && s.display !== 'none' && el.children.length === 0; })
      .map(el => ({ text: (el.textContent || '').trim(), family: getComputedStyle(el).fontFamily, weight: getComputedStyle(el).fontWeight }))
      .filter(el => el.text).slice(0, 50);
    return {
      fontStatus: document.fonts?.status || 'unavailable',
      fontFaces: document.fonts ? Array.from(document.fonts).map(face => ({ family: face.family, weight: face.weight, status: face.status })) : [],
      bodyFont: getComputedStyle(document.body).fontFamily,
      h1Font: heading ? getComputedStyle(heading).fontFamily : null,
      h1Weight: heading ? getComputedStyle(heading).fontWeight : null,
      h1Text: heading?.textContent?.trim() || null,
      headingUsesAlexandriaLoaded: !!heading && !!document.fonts?.check('700 24px Alexandria', heading.textContent || ''),
      visibleText,
      paintTimesMs: Object.fromEntries(paints.map(entry => [entry.name, Number(entry.startTime.toFixed(2))])),
      fontResourcesAtDomContentLoaded: resources,
    };
  }).catch(error => ({ evaluationError: String(error.message || error) }));

  const safeName = name.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  const earlyScreenshot = path.join(resultsDir, `${safeName}-mobile-early.png`);
  await page.screenshot({ path: earlyScreenshot, fullPage: false }).catch(() => {});

  const googleFontCssResponses = await page.evaluate(async () => {
    const links = Array.from(document.querySelectorAll('link[href*="fonts.googleapis.com/css2"]'));
    const parseFaces = (css) => [...css.matchAll(/@font-face\s*\{([^}]+)\}/g)].map(match => {
      const body = match[1];
      const get = (pattern) => (body.match(pattern) || [])[1] || null;
      const srcRaw = get(/src:\s*url\(([^)]+)\)/i);
      return {
        family: get(/font-family:\s*['"]?([^;'"]+)['"]?\s*;/i)?.trim() || null,
        style: get(/font-style:\s*([^;]+);/i)?.trim() || null,
        weight: get(/font-weight:\s*([^;]+);/i)?.trim() || null,
        display: get(/font-display:\s*([^;]+);/i)?.trim() || null,
        srcUrl: srcRaw ? srcRaw.replace(/^['"]|['"]$/g, '') : null,
        unicodeRange: get(/unicode-range:\s*([^;]+);/i)?.trim() || null,
      };
    });
    return await Promise.all(links.map(async link => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10000);
      try {
        const response = await fetch(link.href, {
          mode: 'cors',
          credentials: 'omit',
          cache: 'force-cache',
          signal: controller.signal,
        });
        const css = await response.text();
        const faces = parseFaces(css);
        return {
          url: link.href,
          status: response.status,
          bytes: new TextEncoder().encode(css).length,
          accessControlAllowOrigin: response.headers.get('access-control-allow-origin'),
          faceCount: faces.length,
          faces,
        };
      } catch (error) {
        return { url: link.href, error: String(error.message || error) };
      } finally {
        clearTimeout(timer);
      }
    }));
  }).catch(error => [{ error: String(error.message || error) }]);

  phase = 'after-initial-viewport-scrolling';
  await page.evaluate(async () => {
    const step = Math.max(350, Math.floor(window.innerHeight * 0.72));
    const height = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
    for (let y = 0; y < height; y += step) {
      window.scrollTo(0, y);
      await new Promise(resolve => setTimeout(resolve, 90));
    }
    window.scrollTo(0, 0);
  }).catch(() => {});

  phase = 'after-scroll-font-settle';
  let fontsReady = false;
  try {
    fontsReady = await Promise.race([
      page.evaluate(() => document.fonts.ready.then(() => true)),
      delay(20000).then(() => false),
    ]);
  } catch {}
  await page.waitForTimeout(1100).catch(() => {});

  const settled = await page.evaluate(() => {
    const round = (value) => Number.isFinite(value) ? Number(value.toFixed(2)) : null;
    const images = Array.from(document.images);
    const faces = document.fonts ? Array.from(document.fonts).map(face => ({ family: face.family, weight: face.weight, status: face.status })) : [];
    const entries = performance.getEntriesByType('resource');
    const fontResources = entries
      .filter(entry => /fonts\.(googleapis|gstatic)\.com/i.test(entry.name))
      .map(entry => ({ name: entry.name, durationMs: Math.round(entry.duration), transferSize: entry.transferSize ?? null }));
    const imagesLoaded = images.filter(image => image.complete && image.naturalWidth > 0).length;
    const menu = document.querySelector('.menu-toggle');
    const ctaCount = document.querySelectorAll('a[href^="https://wa.me/"]').length;
    return {
      title: document.title,
      lang: document.documentElement.lang,
      dir: document.documentElement.dir,
      viewport: { width: innerWidth, height: innerHeight },
      pageSize: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight },
      bodyFont: getComputedStyle(document.body).fontFamily,
      h1Font: document.querySelector('h1') ? getComputedStyle(document.querySelector('h1')).fontFamily : null,
      h1Box: document.querySelector('h1') ? (() => { const r=document.querySelector('h1').getBoundingClientRect(); return {x:round(r.x),y:round(r.y),width:round(r.width),height:round(r.height)}; })() : null,
      fontFaceCount: faces.length,
      fontFaces: faces,
      alexandria700Loaded: document.fonts ? document.fonts.check('700 16px Alexandria') : false,
      ibmPlexArabic400Loaded: document.fonts ? document.fonts.check('400 16px "IBM Plex Sans Arabic"') : false,
      fontsStatus: document.fonts?.status || 'unavailable',
      fontResources,
      imageCount: images.length,
      imagesLoaded,
      imageFailures: images.filter(image => image.complete && image.naturalWidth === 0).map(image => image.currentSrc || image.src),
      whatsappCtaCount: ctaCount,
      menuTogglePresent: !!menu,
      menuToggleVisible: !!menu && !!(menu.getClientRects().length),
      noIndex: !!document.querySelector('meta[name="robots"][content*="noindex" i]'),
    };
  }).catch(error => ({ evaluationError: String(error.message || error) }));

  const layoutShifts = await page.evaluate(() => window.__fontAuditLayoutShifts || []).catch(() => []);
  const fontRequestSummary = fontRequestEvents.map(event => ({ ...event }));
  const settledScreenshot = path.join(resultsDir, `${safeName}-mobile-settled.png`);
  await page.screenshot({ path: settledScreenshot, fullPage: true, animations: 'disabled' }).catch(() => {});

  let menuInteraction = { tested: false, result: 'not available' };
  const menu = page.locator('.menu-toggle').first();
  if (await menu.count().catch(() => 0)) {
    if (await menu.isVisible().catch(() => false)) {
      menuInteraction.tested = true;
      try {
        await menu.click({ timeout: 5000 });
        menuInteraction.opened = await page.locator('.nav-links.open').count() > 0;
        await menu.click({ timeout: 5000 });
        menuInteraction.closed = await page.locator('.nav-links.open').count() === 0;
        menuInteraction.result = menuInteraction.opened && menuInteraction.closed ? 'passed' : 'failed';
      } catch (error) {
        menuInteraction.result = 'error';
        menuInteraction.error = String(error.message || error);
      }
    } else {
      menuInteraction.result = 'menu toggle exists but is not visible at mobile viewport';
    }
  }

  const result = {
    variant: name,
    url,
    navigationError,
    early,
    fontsReady,
    settled,
    fontRequestEvents: fontRequestSummary,
    googleFontCssResponses,
    clsObservedFromBrowser: round(layoutShifts.reduce((a, b) => a + b, 0), 5),
    layoutShiftEntries: layoutShifts.length,
    jsErrors,
    failedExternalRequests: failedExternalRequests.slice(0, 30),
    failedExternalRequestCount: failedExternalRequests.length,
    menuInteraction,
    screenshots: { early: path.basename(earlyScreenshot), settled: path.basename(settledScreenshot) },
  };
  await context.close();
  await browser.close();
  return result;
}

async function main() {
  const lighthouseBin = path.join(here, '..', 'node_modules', '.bin', 'lighthouse');
  if (!fs.existsSync(lighthouseBin)) throw new Error('Lighthouse CLI was not installed');
  if (!process.env.CHROME_PATH || !fs.existsSync(process.env.CHROME_PATH)) throw new Error('CHROME_PATH does not point to an installed Chrome binary');

  const visual = [];
  for (const [name, url] of [['main', baselineUrl], ['candidate', candidateUrl]]) {
    console.log(`[browser-smoke] ${name}: ${url}`);
    visual.push(await browserSmoke(name, url));
  }
  fs.writeFileSync(path.join(resultsDir, 'browser-smoke.json'), JSON.stringify(visual, null, 2));
  console.log('[browser-smoke-summary] ' + JSON.stringify(visual.map(v => ({variant:v.variant, early:v.early, settled:v.settled, fontsReady:v.fontsReady, fontRequestEvents:v.fontRequestEvents, googleFontCssResponses:v.googleFontCssResponses, clsObservedFromBrowser:v.clsObservedFromBrowser, layoutShiftEntries:v.layoutShiftEntries, jsErrors:v.jsErrors, failedExternalRequestCount:v.failedExternalRequestCount}))));

  const lighthouseRuns = [];
  for (let run = 1; run <= 3; run++) {
    const order = run % 2 === 1
      ? [['main', baselineUrl], ['candidate', candidateUrl]]
      : [['candidate', candidateUrl], ['main', baselineUrl]];
    for (const [name, url] of order) {
      const reportPath = path.join(resultsDir, `lighthouse-${name}-run-${run}.json`);
      const args = [
        url,
        '--quiet',
        '--output=json',
        `--output-path=${reportPath}`,
        '--chrome-flags=--no-sandbox --disable-dev-shm-usage',
        '--form-factor=mobile',
        '--throttling-method=simulate',
      ];
      console.log(`[lighthouse] variant=${name} run=${run} url=${url}`);
      const proc = spawnSync(lighthouseBin, args, {
        cwd: here,
        env: { ...process.env, CHROME_PATH: process.env.CHROME_PATH },
        encoding: 'utf8',
        timeout: 360000,
        maxBuffer: 10 * 1024 * 1024,
      });
      if (proc.stdout) console.log(proc.stdout.slice(-4000));
      if (proc.stderr) console.error(proc.stderr.slice(-4000));
      if (proc.error) throw new Error(`Lighthouse ${name} run ${run} failed: ${proc.error.message}`);
      if (proc.status !== 0) throw new Error(`Lighthouse ${name} run ${run} exited with code ${proc.status}`);
      if (!fs.existsSync(reportPath)) throw new Error(`Lighthouse did not create expected report: ${reportPath}`);
      const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
      const metrics = metricsFromLighthouse(report);
      const record = { variant: name, run, report: path.basename(reportPath), ...metrics };
      lighthouseRuns.push(record);
      console.log(`[result] ${name} run ${run}: Performance=${metrics.performanceScore}; FCP=${round(metrics.fcpMs / 1000, 2)}s; LCP=${round(metrics.lcpMs / 1000, 2)}s; CLS=${metrics.cls}; SpeedIndex=${round(metrics.speedIndexMs / 1000, 2)}s; TBT=${metrics.tbtMs}ms; RBR savings=${metrics.renderBlocking?.overallSavingsMs}ms`);
    }
  }

  const finalShots = {
    main: path.join(resultsDir, 'main-mobile-settled.png'),
    candidate: path.join(resultsDir, 'candidate-mobile-settled.png'),
  };
  const screenshots = diffPng(finalShots.main, finalShots.candidate);

  const averages = {};
  for (const variant of ['main', 'candidate']) {
    const records = lighthouseRuns.filter(r => r.variant === variant);
    averages[variant] = {
      runs: records.length,
      performanceScore: round(mean(records.map(r => r.performanceScore)), 1),
      fcpMs: round(mean(records.map(r => r.fcpMs)), 0),
      lcpMs: round(mean(records.map(r => r.lcpMs)), 0),
      cls: round(mean(records.map(r => r.cls)), 5),
      speedIndexMs: round(mean(records.map(r => r.speedIndexMs)), 0),
      tbtMs: round(mean(records.map(r => r.tbtMs)), 0),
      renderBlockingSavingsMs: round(mean(records.map(r => r.renderBlocking?.overallSavingsMs).filter(Number.isFinite)), 0),
    };
  }

  const delta = {};
  for (const key of ['performanceScore', 'fcpMs', 'lcpMs', 'cls', 'speedIndexMs', 'tbtMs', 'renderBlockingSavingsMs']) {
    const a = averages.main[key];
    const b = averages.candidate[key];
    delta[key] = a == null || b == null ? null : round(b - a, key === 'cls' ? 5 : 1);
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    environment: { node: process.version, platform: process.platform, arch: process.arch, baselineSha: process.env.BASELINE_SHA || null, candidateSha: process.env.CANDIDATE_SHA || null, chromePath: process.env.CHROME_PATH, lighthouseVersion: '13.5.0', playwrightVersion: '1.64.1', method: 'Lighthouse mobile preset with simulated throttling; 3 fresh Lighthouse CLI runs per version, alternating order' },
    visual,
    screenshotComparison: screenshots,
    lighthouseRuns,
    averages,
    candidateMinusMain: delta,
    interpretation: 'This is a controlled comparative run against local static servers in a GitHub-hosted runner, not a Google PageSpeed Insights production URL test. External images and Google Fonts are requested normally. A pixel difference is a diagnostic signal, not by itself proof of a regression.',
  };

  fs.writeFileSync(path.join(resultsDir, 'summary.json'), JSON.stringify(summary, null, 2));
  const f = (value, unit = '') => value == null ? 'n/a' : `${value}${unit}`;
  const rows = lighthouseRuns.map(r => `| ${r.variant} | ${r.run} | ${f(r.performanceScore)} | ${f(round(r.fcpMs / 1000, 2), ' s')} | ${f(round(r.lcpMs / 1000, 2), ' s')} | ${f(r.cls)} | ${f(round(r.speedIndexMs / 1000, 2), ' s')} | ${f(r.tbtMs, ' ms')} | ${f(r.renderBlocking?.overallSavingsMs, ' ms')} |`).join('\n');
  const averageRows = ['main', 'candidate'].map(name => {
    const a = averages[name];
    return `| ${name} | ${f(a.performanceScore)} | ${f(round(a.fcpMs / 1000, 2), ' s')} | ${f(round(a.lcpMs / 1000, 2), ' s')} | ${f(a.cls)} | ${f(round(a.speedIndexMs / 1000, 2), ' s')} | ${f(a.tbtMs, ' ms')} | ${f(a.renderBlockingSavingsMs, ' ms')} |`;
  }).join('\n');
  const visualRows = visual.map(v => {
    const s = v.settled || {};
    return `| ${v.variant} | ${f(s.lang)} / ${f(s.dir)} | ${f(s.fontsStatus)} | ${f(s.imagesLoaded)} / ${f(s.imageCount)} | ${f(v.clsObservedFromBrowser)} | ${v.jsErrors?.length || 0} | ${v.failedExternalRequestCount || 0} | ${f(v.menuInteraction?.result)} |`;
  }).join('\n');

  const md = `# Mobile font-loading comparison\n\n- Generated: ${summary.generatedAt}\n- Baseline commit: ${summary.environment.baselineSha || 'unknown'}\n- Candidate commit: ${summary.environment.candidateSha || 'unknown'}\n- Method: ${summary.environment.method}\n- Chrome: ${summary.environment.chromePath}\n- Important: controlled local-server comparison in GitHub Actions; this is not the same as a production PageSpeed Insights report.\n\n## Individual Lighthouse runs\n\n| Version | Run | Performance | FCP | LCP | CLS | Speed Index | TBT | Render-blocking savings estimate |\n|---|---:|---:|---:|---:|---:|---:|---:|---:|\n${rows}\n\n## Averages\n\n| Version | Performance | FCP | LCP | CLS | Speed Index | TBT | Render-blocking savings estimate |\n|---|---:|---:|---:|---:|---:|---:|---:|\n${averageRows}\n\n## Candidate minus main (lower is generally better except Performance)\n\n${Object.entries(delta).map(([key, value]) => `- ${key}: ${f(value)}`).join('\n')}\n\n## Browser smoke check\n\n| Version | lang / dir | Font status after settling | Images loaded | Observed browser CLS | JS errors | Failed external requests | Menu toggle |\n|---|---|---|---|---:|---:|---:|---|\n${visualRows}\n\n## Screenshot comparison\n\n${JSON.stringify(screenshots, null, 2)}\n\nEarly and settled viewport/full-page screenshots are included as PNG files in this artifact. Check the screenshots as well as the pixel-difference percentage; an image difference can include font rasterization and animation.\n\n## Risks and limits\n\n- The browser tests record early font state and settled rendering, but do not prove that every user experiences no flash under every connection.\n- Lighthouse uses default mobile emulation and simulated network/CPU throttling.\n- Local-server comparison controls the code and runner but will not numerically match PSI's production URL test.\n- Network requests that fail are recorded in summary.json.\n`;
  fs.writeFileSync(path.join(resultsDir, 'summary.md'), md);
  console.log('\n' + md);
}

main().catch(error => {
  console.error(error);
  fs.mkdirSync(resultsDir, { recursive: true });
  fs.writeFileSync(path.join(resultsDir, 'fatal-error.txt'), String(error?.stack || error));
  process.exitCode = 1;
});
