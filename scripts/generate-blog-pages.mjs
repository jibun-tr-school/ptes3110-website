// Generates one real, static, crawlable HTML page per blog article (blog/<id>.html)
// plus a fully up-to-date sitemap.xml, from the data in articles-data.js.
//
// Run this any time articles-data.js changes (a new article added, edited, or removed):
//   node scripts/generate-blog-pages.mjs
//
// This is what gives each blog article its own indexable URL for SEO/sharing purposes,
// instead of only existing as a client-side view inside blog.html.

import { articles } from '../articles-data.js';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SITE = 'https://ptes3110.com';
const DEFAULT_OGP_IMAGE = `${SITE}/images/ogp-1200x630.jpg`;

const STATIC_PAGES = [
  { path: '/', priority: '1.0' },
  { path: '/concept.html', priority: '0.8' },
  { path: '/service.html', priority: '0.8' },
  { path: '/blog.html', priority: '0.7' },
  { path: '/access.html', priority: '0.6' },
  { path: '/qa.html', priority: '0.6' },
  { path: '/contact.html', priority: '0.6' },
  { path: '/trial.html', priority: '0.9' },
  { path: '/trial-info.html', priority: '0.7' },
];

const CATEGORY_HUES = { '習慣': 150, 'トレーニング': 230, 'ダイエット': 25, 'ジム紹介': 90 };
function categoryStyle(name) {
  const h = CATEGORY_HUES[name] ?? 60;
  return { tagBg: `oklch(94% 0.05 ${h})`, tagText: `oklch(40% 0.13 ${h})` };
}

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
function escAttr(s) {
  return esc(s).replace(/"/g, '&quot;');
}

function isoDate(d) {
  // articles use "2026.06.02" -> "2026-06-02"
  return String(d).replace(/\./g, '-');
}

function renderBody(body) {
  return (body || []).map(block => {
    if (block.isH2) {
      return `<h2 style="font-family:'Zen Maru Gothic',sans-serif;font-size:20px;font-weight:700;margin:36px 0 14px;">${esc(block.text)}</h2>`;
    }
    if (block.isQuote) {
      return `<div style="border-left:3px solid #5aa59c;background:oklch(96% 0.01 60);padding:16px 20px;margin:24px 0;font-weight:700;font-family:'Zen Maru Gothic',sans-serif;font-size:15px;line-height:1.9;">${esc(block.text)}</div>`;
    }
    if (block.isList) {
      const items = (block.items || []).map(i => `<li style="margin-bottom:8px;">${esc(i)}</li>`).join('\n        ');
      return `<ul style="margin:0 0 18px;padding-left:22px;color:oklch(28% 0.01 60);">\n        ${items}\n      </ul>`;
    }
    if (block.isP) {
      return `<p style="margin:0 0 18px;color:oklch(28% 0.01 60);">${esc(block.text)}</p>`;
    }
    return '';
  }).join('\n      ');
}

function navLink(href, label, active) {
  const style = active
    ? 'color:#5aa59c;text-decoration:none;font-weight:700;'
    : 'color:oklch(35% 0.01 60);text-decoration:none;';
  return `<a href="${href}" style="${style}">${label}</a>`;
}

function headerHtml() {
  return `<header style="display:flex;align-items:center;justify-content:space-between;max-width:1140px;margin:0 auto;padding:22px 24px;gap:24px;flex-wrap:wrap;">
    <a href="../index.html" style="text-decoration:none;color:oklch(22% 0.01 60);display:flex;flex-direction:column;">
      <span style="font-family:'Zen Maru Gothic',sans-serif;font-weight:900;font-size:20px;letter-spacing:0.02em;">Personal Training E.S</span>
      <span style="font-size:11px;color:oklch(45% 0.01 60);letter-spacing:0.05em;">三日坊主さん専門パーソナルジム</span>
    </a>
    <nav style="display:flex;gap:20px;font-size:13px;flex-wrap:wrap;">
      ${navLink('../index.html', 'HOME', false)}
      ${navLink('../concept.html', 'CONCEPT', false)}
      ${navLink('../service.html', 'SERVICE', false)}
      ${navLink('../blog.html', 'BLOG', true)}
      ${navLink('../access.html', 'ACCESS', false)}
      ${navLink('../qa.html', 'Q&A', false)}
      ${navLink('../contact.html', 'CONTACT', false)}
      ${navLink('../trial.html', 'TRIAL', false)}
    </nav>
  </header>`;
}

function footerHtml() {
  return `<footer style="border-top:1px solid oklch(90% 0.01 60);padding:36px 24px;text-align:center;">
    <div style="font-family:'Zen Maru Gothic',sans-serif;font-weight:900;font-size:15px;margin-bottom:10px;">Personal Training E.S</div>
    <nav style="display:flex;gap:18px;justify-content:center;font-size:12px;margin-bottom:16px;flex-wrap:wrap;">
      <a href="../index.html" style="color:oklch(45% 0.01 60);text-decoration:none;">HOME</a>
      <a href="../concept.html" style="color:oklch(45% 0.01 60);text-decoration:none;">CONCEPT</a>
      <a href="../service.html" style="color:oklch(45% 0.01 60);text-decoration:none;">SERVICE</a>
      <a href="../blog.html" style="color:oklch(45% 0.01 60);text-decoration:none;">BLOG</a>
      <a href="../access.html" style="color:oklch(45% 0.01 60);text-decoration:none;">ACCESS</a>
      <a href="../qa.html" style="color:oklch(45% 0.01 60);text-decoration:none;">Q&A</a>
      <a href="../contact.html" style="color:oklch(45% 0.01 60);text-decoration:none;">CONTACT</a>
    </nav>
    <div style="font-size:11px;color:oklch(55% 0.01 60);">&copy; 2026 Personal Training E.S.</div>
  </footer>`;
}

function relatedHtml(article, all) {
  const related = all.filter(a => a.id !== article.id).slice(0, 2);
  if (!related.length) return '';
  const cards = related.map(a => {
    const c = categoryStyle(a.category);
    const img = a.image
      ? `<img src="../${a.image}" alt="${escAttr(a.title)}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;" onerror="this.style.visibility='hidden'">`
      : '';
    return `<a href="${a.id}.html" style="text-decoration:none;color:inherit;">
              <div style="aspect-ratio:16/10;position:relative;overflow:hidden;border-radius:8px;background:${c.tagBg};">${img}</div>
              <div style="font-size:13px;font-weight:700;margin-top:8px;line-height:1.6;color:oklch(22% 0.01 60);">${esc(a.title)}</div>
            </a>`;
  }).join('\n            ');
  return `<div>
        <h3 style="font-family:'Zen Maru Gothic',sans-serif;font-size:16px;font-weight:700;margin-bottom:16px;">関連記事</h3>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:20px;">
            ${cards}
        </div>
      </div>`;
}

function articleHtml(article, all) {
  const c = categoryStyle(article.category);
  const title = article.title;
  const desc = article.excerpt || '';
  const url = `${SITE}/blog/${article.id}.html`;
  const image = article.image
    ? (article.image.startsWith('http') ? article.image : `${SITE}/${article.image}`)
    : DEFAULT_OGP_IMAGE;

  const heroHtml = article.image
    ? `<div style="width:100%;aspect-ratio:16/8;position:relative;overflow:hidden;border-radius:8px;margin-top:24px;background:${c.tagBg};"><img src="../${article.image}" alt="${escAttr(title)}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;" onerror="this.style.visibility='hidden'"></div>`
    : '';

  const ld = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: title,
    description: desc,
    image,
    datePublished: isoDate(article.date),
    author: { '@type': 'Person', name: '斉藤弘樹' },
    publisher: {
      '@type': 'Organization',
      name: 'Personal Training E.S',
      logo: { '@type': 'ImageObject', url: DEFAULT_OGP_IMAGE },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
  };

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escAttr(title)}｜Personal Training E.S</title>
<meta name="description" content="${escAttr(desc)}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="Personal Training E.S">
<meta property="og:locale" content="ja_JP">
<meta property="og:url" content="${url}">
<meta property="og:title" content="${escAttr(title)}">
<meta property="og:description" content="${escAttr(desc)}">
<meta property="og:image" content="${image}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escAttr(title)}">
<meta name="twitter:description" content="${escAttr(desc)}">
<meta name="twitter:image" content="${image}">
<script type="application/ld+json">${JSON.stringify(ld)}</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Zen+Maru+Gothic:wght@500;700;900&family=Noto+Sans+JP:wght@400;500;700&display=swap" rel="stylesheet">
<style>
  body { margin: 0; background: oklch(98% 0.01 60); font-family:'Noto Sans JP',sans-serif; color:oklch(22% 0.01 60); }
  * { box-sizing: border-box; }
  a { transition: opacity 0.15s; }
  a:hover { opacity: 0.65; }
</style>
</head>
<body>
<div style="min-height:100vh;">
  ${headerHtml()}

  <main style="max-width:760px;margin:0 auto;padding:12px 24px 80px;">
    <div style="font-size:12px;color:oklch(50% 0.01 60);margin-bottom:20px;">
      <a href="../blog.html" style="color:#5aa59c;text-decoration:none;">BLOG</a>
      <span> / </span>
      <span>${esc(article.category)}</span>
    </div>

    <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
      <span style="font-size:11px;font-weight:700;padding:3px 10px;border-radius:3px;background:${c.tagBg};color:${c.tagText};">${esc(article.category)}</span>
      <span style="font-size:12px;color:oklch(55% 0.01 60);">${esc(article.date)}</span>
    </div>
    <h1 style="font-family:'Zen Maru Gothic',sans-serif;font-size:28px;font-weight:900;line-height:1.5;margin:0 0 24px;">${esc(title)}</h1>

    ${heroHtml}

    <div style="font-size:15px;line-height:2;margin-top:32px;">
      ${renderBody(article.body)}
    </div>

    <a href="../trial.html" style="display:block;text-align:center;background:#5aa59c;color:#fff;font-weight:700;padding:18px;border-radius:8px;text-decoration:none;margin:40px 0;font-family:'Zen Maru Gothic',sans-serif;">無料体験に申し込む</a>

    <div style="display:flex;gap:20px;align-items:flex-start;background:#fff;border:1px solid oklch(90% 0.01 60);border-radius:8px;padding:24px;margin-bottom:40px;">
      <img src="../images/4bb402d4b4412615b6284129a518263d.png" alt="トレーナー写真" style="width:76px;height:76px;flex-shrink:0;object-fit:cover;border-radius:50%;" onerror="this.style.visibility='hidden'">
      <div>
        <div style="font-size:11px;color:oklch(55% 0.01 60);margin-bottom:4px;">この記事を書いた人</div>
        <div style="font-family:'Zen Maru Gothic',sans-serif;font-weight:700;font-size:16px;margin-bottom:4px;">斉藤 弘樹<span style="font-size:11px;font-weight:400;margin-left:6px;color:oklch(50% 0.01 60);">(NSCA認定パーソナルトレーナー)</span></div>
        <p style="font-size:13px;color:oklch(45% 0.01 60);line-height:1.8;margin:0;">実は自分自身も継続が苦手で、何度も挫折した経験があります。だからこそ「続けることの難しさ」がよくわかります。無理のない習慣化を一緒に目指しましょう。</p>
      </div>
    </div>

    ${relatedHtml(article, all)}
  </main>

  ${footerHtml()}
</div>
</body>
</html>
`;
}

function buildSitemap(articleUrls) {
  const staticEntries = STATIC_PAGES.map(p => `  <url><loc>${SITE}${p.path}</loc><priority>${p.priority}</priority></url>`);
  const articleEntries = articleUrls.map(u => `  <url><loc>${u}</loc><priority>0.6</priority></url>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...staticEntries, ...articleEntries].join('\n')}\n</urlset>\n`;
}

function main() {
  const blogDir = join(ROOT, 'blog');
  if (!existsSync(blogDir)) mkdirSync(blogDir, { recursive: true });

  const urls = [];
  for (const article of articles) {
    const html = articleHtml(article, articles);
    const outPath = join(blogDir, `${article.id}.html`);
    writeFileSync(outPath, html, 'utf-8');
    urls.push(`${SITE}/blog/${article.id}.html`);
    console.log('wrote', outPath);
  }

  const sitemap = buildSitemap(urls);
  writeFileSync(join(ROOT, 'sitemap.xml'), sitemap, 'utf-8');
  console.log(`wrote sitemap.xml with ${STATIC_PAGES.length + urls.length} URLs`);
}

main();
