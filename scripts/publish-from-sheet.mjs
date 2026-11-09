// Reads blog drafts from a link-shared Google Sheet (CSV) and appends every row whose
// status is "公開OK" (and whose id is not yet in articles-data.js) to articles-data.js.
// Afterwards the workflow runs scripts/generate-blog-pages.mjs and commits the result.
//
// Sheet columns (header row required, names in Japanese):
//   id | status | date | category | title | excerpt | image | body
// body markup (one block per line):
//   "## text"  -> H2 heading
//   "- text"   -> list item (consecutive lines form one list)
//   anything else (non-empty) -> paragraph
//
// Usage: node scripts/publish-from-sheet.mjs <csv-url-or-local-file>

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DATA_FILE = join(ROOT, 'articles-data.js');

function parseCsv(text) {
  const rows = [];
  let row = [], cell = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else cell += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some(v => v !== '')) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some(v => v !== '')) rows.push(row);
  return rows;
}

function parseBody(text) {
  const blocks = [];
  let list = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) { list = null; continue; }
    if (line.startsWith('## ')) { list = null; blocks.push({ isH2: true, text: line.slice(3).trim() }); }
    else if (line.startsWith('- ')) {
      if (!list) { list = { isList: true, items: [] }; blocks.push(list); }
      list.items.push(line.slice(2).trim());
    } else { list = null; blocks.push({ isP: true, text: line }); }
  }
  return blocks;
}

async function loadCsv(src) {
  if (/^https?:/.test(src)) {
    const res = await fetch(src, { redirect: 'follow' });
    if (!res.ok) throw new Error(`CSV fetch failed: HTTP ${res.status}`);
    const text = await res.text();
    if (text.trimStart().startsWith('<')) throw new Error('CSV fetch returned HTML (sheet not link-shared?)');
    return text;
  }
  return readFileSync(src, 'utf-8');
}

const src = process.argv[2];
if (!src) { console.error('usage: publish-from-sheet.mjs <csv-url-or-file>'); process.exit(2); }

const rows = parseCsv(await loadCsv(src));
const header = rows.shift().map(h => h.trim());
const col = Object.fromEntries(header.map((h, i) => [h, i]));
for (const need of ['id', 'status', 'date', 'category', 'title', 'excerpt', 'image', 'body']) {
  if (!(need in col)) { console.error(`missing column: ${need}`); process.exit(2); }
}

let data = readFileSync(DATA_FILE, 'utf-8');
const existing = new Set([...data.matchAll(/["']?\bid["']?\s*:\s*["']([^"']+)["']/g)].map(m => m[1]));

const added = [];
for (const r of rows) {
  const get = k => (r[col[k]] ?? '').trim();
  if (get('status') !== '公開OK') continue;
  const id = get('id');
  if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) { console.error(`skip: bad id "${id}"`); continue; }
  if (existing.has(id)) continue;
  if (!get('title') || !get('body') || !/^\d{4}\.\d{2}\.\d{2}$/.test(get('date'))) {
    console.error(`skip ${id}: title/body/date missing or malformed`); continue;
  }
  const article = {
    id, category: get('category') || 'トレーニング', date: get('date'),
    title: get('title'), excerpt: get('excerpt'),
    image: get('image') || null,
    body: parseBody((r[col['body']] ?? '')),
  };
  added.push(article);
  existing.add(id);
}

if (!added.length) { console.log('no new articles to publish'); process.exit(0); }

const end = data.lastIndexOf('];');
if (end < 0) { console.error('articles-data.js: closing "];" not found'); process.exit(1); }
const insert = added.map(a => '  ' + JSON.stringify(a, null, 2).replace(/\n/g, '\n  ') + ',\n').join('');
data = data.slice(0, end) + insert + data.slice(end);
writeFileSync(DATA_FILE, data, 'utf-8');
console.log(`added ${added.length}: ${added.map(a => a.id).join(', ')}`);
