'use strict';

const { SITE_ORIGIN, SITE_HOST } = require('./site-config.js');

const FORBIDDEN_HOSTS = ['pgasiagames.com', 'php777asia.com'];
const AFF =
  'https://reffpa.com/L?tag=d_5500779m_1236c_&site=5500779&ad=1236';
const OG = `${SITE_ORIGIN}/images/og-default.webp`;

const REPLACEMENTS = [
  [/https:\/\/pgasiagames\.com/gi, SITE_ORIGIN],
  [/https:\/\/php777asia\.com/gi, SITE_ORIGIN],
  [/pgasiagames\.com/gi, SITE_HOST],
  [/php777asia\.com/gi, SITE_HOST],
  [/PG Asia Games/g, 'PHP777'],
  [
    /https:\/\/reffpa\.com\/L\?tag=d_5501500m_1236c_&amp;site=5501500&amp;ad=1236/gi,
    AFF,
  ],
  [
    /https:\/\/reffpa\.com\/L\?tag=d_5501500m_1236c_&site=5501500&ad=1236/gi,
    AFF,
  ],
  [
    /https:\/\/(?:pgasiagames\.com|php777\.pro)\/assets\/img\/banners\/home\.jpg/gi,
    OG,
  ],
  [
    /https:\/\/(?:pgasiagames\.com|php777\.pro)\/assets\/logo-main\.webp/gi,
    OG,
  ],
];

function sanitizeSeoHtml(html) {
  let out = html;
  for (const [from, to] of REPLACEMENTS) {
    out = out.replace(from, to);
  }
  return out;
}

function findSeoViolations(html, fileLabel = '') {
  const issues = [];
  for (const host of FORBIDDEN_HOSTS) {
    if (html.toLowerCase().includes(host)) {
      issues.push(`${fileLabel}: contains forbidden host "${host}"`);
    }
  }
  const canon =
    html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i) ||
    html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i);
  if (canon) {
    try {
      const u = new URL(canon[1]);
      if (u.hostname !== SITE_HOST) {
        issues.push(`${fileLabel}: canonical host is ${u.hostname}, expected ${SITE_HOST}`);
      }
    } catch {
      issues.push(`${fileLabel}: invalid canonical URL ${canon[1]}`);
    }
  }
  if (/content=["'][^"']*noindex/i.test(html) && !fileLabel.includes('404')) {
    issues.push(`${fileLabel}: noindex directive present`);
  }
  return issues;
}

module.exports = { sanitizeSeoHtml, findSeoViolations, SITE_HOST, SITE_ORIGIN };
