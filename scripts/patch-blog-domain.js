'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BLOG_DIR = path.join(ROOT, 'blog');
const AFF =
  'https://reffpa.com/L?tag=d_5500779m_1236c_&site=5500779&ad=1236';
const OG = 'https://php777.pro/images/og-default.webp';

const REPLACEMENTS = [
  [/https:\/\/pgasiagames\.com/g, 'https://php777.pro'],
  [/PG Asia Games/g, 'PHP777'],
  [/pgasiagames\.com/g, 'php777.pro'],
  [
    /https:\/\/reffpa\.com\/L\?tag=d_5501500m_1236c_&amp;site=5501500&amp;ad=1236/g,
    AFF,
  ],
  [
    /https:\/\/reffpa\.com\/L\?tag=d_5501500m_1236c_&site=5501500&ad=1236/g,
    AFF,
  ],
  [/https:\/\/pgasiagames\.com\/assets\/img\/banners\/home\.jpg/g, OG],
  [/https:\/\/php777\.pro\/assets\/img\/banners\/home\.jpg/g, OG],
  [/https:\/\/pgasiagames\.com\/assets\/logo-main\.webp/g, OG],
  [/https:\/\/php777\.pro\/assets\/logo-main\.webp/g, OG],
  [/View bonuses<\/a>/g, 'View promotions</a>'],
  [/href="\/bonus\/"/g, 'href="/promotions.html"'],
];

function patchFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const needsPatch =
    content.includes('pgasiagames') ||
    content.includes('PG Asia Games') ||
    content.includes('5501500') ||
    content.includes('/assets/img/banners/home.jpg') ||
    content.includes('/assets/logo-main.webp');
  if (!needsPatch) return false;
  for (const [from, to] of REPLACEMENTS) {
    content = content.replace(from, to);
  }
  fs.writeFileSync(filePath, content, 'utf8');
  return true;
}

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (name === 'index.html') out.push(p);
  }
  return out;
}

const files = walk(BLOG_DIR);
let n = 0;
for (const f of files) {
  if (patchFile(f)) {
    n++;
    console.log('patched', path.relative(ROOT, f));
  }
}
console.log('Done. Patched', n, 'of', files.length, 'blog pages.');
