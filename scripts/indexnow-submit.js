'use strict';

const fs = require('fs');
const https = require('https');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const HOST = 'php777.pro';
const KEY_FILE = path.join(
  ROOT,
  '94e78ff65e5ef4a9ee6e77c6a3d9e2e6ea843a8075f69dae44461535d8883c84.txt',
);

function loadKey() {
  if (fs.existsSync(KEY_FILE)) {
    return fs.readFileSync(KEY_FILE, 'utf8').trim();
  }
  const match = fs.readdirSync(ROOT).find((n) => /^[a-f0-9]{64}\.txt$/.test(n));
  if (!match) throw new Error('IndexNow key file not found at site root.');
  return fs.readFileSync(path.join(ROOT, match), 'utf8').trim();
}

function postIndexNow(urlList, key) {
  const body = JSON.stringify({
    host: HOST,
    key,
    keyLocation: `https://${HOST}/${key}.txt`,
    urlList,
  });
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: 'api.indexnow.org',
        path: '/indexnow',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (c) => {
          data += c;
        });
        res.on('end', () => resolve({ status: res.statusCode, body: data }));
      },
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  const key = loadKey();
  const xml = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
  const urlList = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
  console.log(`Submitting ${urlList.length} URLs to IndexNow for ${HOST}...`);
  const res = await postIndexNow(urlList, key);
  console.log('IndexNow status:', res.status, res.body || '(empty body)');
  if (res.status !== 200 && res.status !== 202) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
