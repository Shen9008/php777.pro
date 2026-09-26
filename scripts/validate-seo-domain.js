'use strict';

const fs = require('fs');
const path = require('path');
const { findSeoViolations, SITE_HOST } = require('./lib/seo-domain-guard.js');

const ROOT = path.resolve(__dirname, '..');

function walkHtml(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walkHtml(p, out);
    else if (name.endsWith('.html')) out.push(p);
  }
  return out;
}

const files = [
  ...walkHtml(path.join(ROOT, 'blog')),
  ...['index.html', 'slots.html', 'live-casino.html', 'sportsbook.html', 'promotions.html',
    'about-us.html', 'help-center.html', 'privacy.html', 'terms-conditions.html',
    'responsible-gambling.html', 'blog/index.html'].map((f) => path.join(ROOT, f)),
].filter((f) => fs.existsSync(f));

const allIssues = [];
for (const f of files) {
  const html = fs.readFileSync(f, 'utf8');
  allIssues.push(...findSeoViolations(html, path.relative(ROOT, f)));
}

if (allIssues.length) {
  console.error(`SEO domain validation failed (${SITE_HOST}):\n`);
  for (const line of allIssues.slice(0, 50)) console.error('  -', line);
  if (allIssues.length > 50) {
    console.error(`  ... and ${allIssues.length - 50} more`);
  }
  process.exit(1);
}

console.log(`SEO OK: ${files.length} HTML files use ${SITE_HOST} canonicals.`);
