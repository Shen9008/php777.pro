'use strict';

/**
 * Rewrite legacy blog href="blog/slug.html" to absolute /blog/slug/
 * Use after migrating flat blog/*.html to folders. Safe for href="/blog/x.html".
 */
const fs = require('fs');
const path = require('path');
const { globSync } = require('glob');

const ROOT = path.resolve(__dirname, '..');

for (const rel of globSync('**/*.html', { cwd: ROOT, nodir: true, ignore: ['node_modules/**'] })) {
  const fp = path.join(ROOT, rel);
  let s = fs.readFileSync(fp, 'utf8');
  let n = s.replace(/href="blog\/([a-z0-9-]+)\.html"/g, 'href="/blog/$1/"');
  n = n.replace(/href="\/blog\/([a-z0-9-]+)\.html"/g, 'href="/blog/$1/"');
  if (n !== s) {
    fs.writeFileSync(fp, n, 'utf8');
    console.log(rel);
  }
}
