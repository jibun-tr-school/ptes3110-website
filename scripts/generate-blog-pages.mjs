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
  { path: '/jibun-tr.html', priority: '0.8' },
  { path: '/training.html', priority: '0.6' },
  { path: '/training/hip-lift.html', priority: '0.5' },
  { path: '/training/knee-up-lunge.html', priority: '0.5' },
  { path: '/training/leg-raise.html', priority: '0.5' },
  { path: '/training/prone-lat-pull.html', priority: '0.5' },
  { path: '/training/pushup.html', priority: '0.5' },
  { path: '/training/split-deadlift.html', priority: '0.5' },
  { path: '/training/split-squat.html', priority: '0.5' },
  { path: '/training/wide-squat.html', priority: '0.5' },
];

const ACCENT = '#5cc2a6';

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
function escAttr(s) {
  return esc(s).replace(/"/g, '&quot;');
}

// blog/ 配下のページから見た画像のパス(外部URLはそのまま、サイト内の画像だけ ../ を付ける)
function imgSrc(image) {
  return /^https?:/.test(image) ? image : `../${image}`;
}

function isoDate(d) {
  // articles use "2026.06.02" -> "2026-06-02"
  return String(d).replace(/\./g, '-');
}

function renderBody(body) {
  return (body || []).map(block => {
    if (block.isH2) {
      return `<h2 class="a-h2">${esc(block.text)}</h2>`;
    }
    if (block.isQuote) {
      return `<div class="a-quote">${esc(block.text)}</div>`;
    }
    if (block.isList) {
      const items = (block.items || []).map(i => `<li>${esc(i)}</li>`).join('\n        ');
      return `<ul class="a-list">\n        ${items}\n      </ul>`;
    }
    if (block.isP) {
      return `<p class="a-p">${esc(block.text)}</p>`;
    }
    return '';
  }).join('\n      ');
}

// サイト共通のダークデザインのヘッダー(記事は blog/ 配下なので、リンク・画像は ../ から始める)
function headerHtml() {
  return `<header class="site-header">
    <div style="max-width:1160px;margin:0 auto;padding:10px clamp(16px,4vw,24px);display:flex;align-items:center;justify-content:space-between;gap:12px">
      <a href="../index.html" aria-label="Personal Training E.S ホーム" style="display:flex;align-items:center">
        <img src="../images/logo-white.png" alt="Personal Training E.S" style="height:40px;width:auto;display:block">
      </a>
      <nav class="navlinks" aria-label="メインメニュー" style="display:flex;align-items:center;gap:24px">
        <a class="navlink" href="../concept.html">CONCEPT</a>
        <a class="navlink" href="../service.html">SERVICE</a>
        <a class="navlink" href="../jibun-tr.html"><span class="k">じぶとれ</span></a>
        <a class="navlink" href="../training.html">TRAINING</a>
        <a class="navlink" href="../blog.html">BLOG</a>
        <a class="navlink" href="../access.html">ACCESS</a>
        <a class="navlink" href="../qa.html">Q&amp;A</a>
        <a class="navlink" href="../contact.html">CONTACT</a>
      </nav>
      <div style="display:flex;align-items:center;gap:6px">
        <a class="btn" href="../trial.html" style="background:${ACCENT};color:#0d1a17;text-decoration:none;font-weight:700;font-size:14px;padding:10px 20px;border-radius:999px;white-space:nowrap"><span class="k">無料体験</span></a>
        <button type="button" class="menu-toggle-btn" data-menu-toggle aria-label="メニューを開く">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#f0ece4" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
        </button>
      </div>
    </div>
  </header>
  <div class="mobile-nav-panel" id="mobile-nav-panel">
    <button type="button" class="mobile-nav-close" data-menu-close aria-label="閉じる">&times;</button>
    <a href="../index.html">HOME</a>
    <a href="../concept.html">CONCEPT</a>
    <a href="../service.html">SERVICE</a>
    <a href="../jibun-tr.html">じぶとれ</a>
    <a href="../training.html">TRAINING</a>
    <a href="../blog.html" style="color:${ACCENT};font-weight:700">BLOG</a>
    <a href="../access.html">ACCESS</a>
    <a href="../qa.html">Q&amp;A</a>
    <a href="../contact.html">CONTACT</a>
    <a href="../trial.html" class="panel-cta">無料体験</a>
  </div>`;
}

function footerHtml() {
  const l = (href, label) => `<a href="${href}" style="color:#f0ece4;text-decoration:none">${label}</a>`;
  return `<footer style="background:#101010;border-top:1px solid rgba(255,255,255,.08)">
    <div style="max-width:1160px;margin:0 auto;padding:clamp(40px,8vw,64px) clamp(16px,4vw,24px) 36px;display:flex;flex-wrap:wrap;gap:36px">
      <div style="flex:1 1 300px;display:flex;flex-direction:column;gap:12px">
        <img src="../images/logo-white.png" alt="Personal Training E.S" style="height:48px;width:auto;align-self:flex-start">
        <div style="font-size:14px;color:#bdb9b2">〒243-0815<br><span style="white-space:nowrap"><span class="k">神奈川県厚木市妻</span><span class="k">田西2-19-1</span></span><br><span style="white-space:nowrap"><span class="k">メゾン秋</span><span class="k">本101</span></span></div>
        <div style="font-size:14px;color:#bdb9b2">TEL 070-9153-3110<br>MAIL ptes3110@gmail.com</div>
        <div style="font-size:14px;color:#bdb9b2"><span class="k">月・火・木・</span><span class="k">金 10:00〜20:00</span><br><span class="k">土曜 09:00〜18:00</span><br><span class="k">定休日：</span><span class="k">日・祝・水</span></div>
      </div>
      <nav aria-label="フッターメニュー" style="flex:1 1 260px;display:flex;flex-wrap:wrap;gap:12px 28px;align-content:flex-start;font-size:14px">
        ${l('../index.html', 'HOME')}
        ${l('../concept.html', 'CONCEPT')}
        ${l('../service.html', 'SERVICE')}
        ${l('../jibun-tr.html', '<span class="k">じぶとれ</span>')}
        ${l('../training.html', 'TRAINING')}
        ${l('../blog.html', 'BLOG')}
        ${l('../access.html', 'ACCESS')}
        ${l('../qa.html', 'Q&amp;A')}
        ${l('../contact.html', 'CONTACT')}
        ${l('https://www.instagram.com/personal_training_e.s/', 'Instagram')}
      </nav>
    </div>
    <div style="max-width:1160px;margin:0 auto;padding:0 clamp(16px,4vw,24px) 28px;font-size:12px;color:#8d8a84">&copy; 2026 Personal Training E.S.</div>
  </footer>`;
}

function relatedHtml(article, all) {
  const related = all.filter(a => a.id !== article.id).slice(0, 2);
  if (!related.length) return '';
  const cards = related.map(a => {
    const img = a.image
      ? `<img src="${escAttr(imgSrc(a.image))}" alt="${escAttr(a.title)}" loading="lazy" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;" onerror="this.style.visibility='hidden'">`
      : '';
    return `<a class="rel" href="${a.id}.html">
              <div style="aspect-ratio:16/10;position:relative;overflow:hidden;background:#222;">${img}</div>
              <div class="rel-t">${esc(a.title)}</div>
            </a>`;
  }).join('\n            ');
  return `<div>
        <h3 class="a-h3">関連記事</h3>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;">
            ${cards}
        </div>
      </div>`;
}

function articleHtml(article, all) {
  const title = article.title;
  const desc = article.excerpt || '';
  const url = `${SITE}/blog/${article.id}.html`;
  const image = article.image
    ? (article.image.startsWith('http') ? article.image : `${SITE}/${article.image}`)
    : DEFAULT_OGP_IMAGE;

  const heroHtml = article.image
    ? `<div class="a-hero"><img src="${escAttr(imgSrc(article.image))}" alt="${escAttr(title)}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;" onerror="this.style.visibility='hidden'"></div>`
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
<meta name="color-scheme" content="dark">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Zen+Maru+Gothic:wght@400;500;700;900&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; }
  body { margin:0; background:#151515; color:#f0ece4; font-family:'Zen Maru Gothic','Hiragino Maru Gothic Pro',sans-serif; line-height:1.8; overflow-x:clip; }
  a { color:${ACCENT}; }
  img { max-width:100%; }
  .k { display:inline-block; max-width:100%; }
  .site-header { position:sticky; top:0; z-index:200; background:rgba(21,21,21,.92); border-bottom:1px solid rgba(255,255,255,.08); }
  .navlink { color:#f0ece4; text-decoration:none; font-size:14px; letter-spacing:.04em; padding:10px 4px; }
  .navlink:hover { color:${ACCENT}; }
  .btn { transition:transform .15s ease, filter .15s ease; }
  .btn:hover { filter:brightness(1.1); transform:translateY(-1px); }
  .menu-toggle-btn { display:none; border:none; background:transparent; cursor:pointer; padding:6px; }
  .mobile-nav-panel { display:none; }
  /* 記事 */
  .a-main { max-width:720px; margin:0 auto; padding:28px clamp(16px,4vw,24px) 80px; }
  .a-crumb { font-size:12px; color:#a8a49d; margin-bottom:20px; }
  .a-crumb a { color:${ACCENT}; text-decoration:none; }
  .a-meta { display:flex; align-items:center; gap:10px; margin-bottom:14px; font-size:12px; }
  .a-tag { color:#0d1a17; background:${ACCENT}; padding:2px 12px; border-radius:999px; font-weight:700; white-space:nowrap; }
  .a-date { color:#a8a49d; }
  .a-title { font-family:'Zen Maru Gothic',sans-serif; font-size:clamp(24px,5.6vw,32px); font-weight:700; line-height:1.55; margin:0 0 24px; color:#faf8f5; text-wrap:balance; word-break:auto-phrase; }
  .a-hero { width:100%; aspect-ratio:16/9; position:relative; overflow:hidden; border-radius:18px; background:#222; border:1px solid rgba(255,255,255,.08); }
  .a-body { font-size:15px; line-height:2; margin-top:32px; line-break:strict; }
  .a-h2 { font-family:'Zen Maru Gothic',sans-serif; font-size:clamp(19px,4.6vw,22px); font-weight:700; line-height:1.6; margin:44px 0 14px; padding-bottom:10px; color:#faf8f5; border-bottom:1px solid rgba(255,255,255,.12); text-wrap:balance; word-break:auto-phrase; }
  .a-p { margin:0 0 18px; color:#d9d5cd; text-wrap:pretty; word-break:auto-phrase; }
  .a-list { margin:0 0 18px; padding-left:22px; color:#d9d5cd; }
  .a-list li { margin-bottom:8px; text-wrap:pretty; word-break:auto-phrase; }
  .a-quote { border-left:3px solid ${ACCENT}; background:#1a1a1a; border-radius:0 12px 12px 0; padding:16px 20px; margin:24px 0; font-weight:700; font-size:15px; line-height:1.9; color:#faf8f5; text-wrap:pretty; word-break:auto-phrase; }
  .a-cta { display:block; text-align:center; background:${ACCENT}; color:#0d1a17; font-weight:700; padding:16px 20px; border-radius:999px; text-decoration:none; margin:44px 0; transition:transform .15s ease, filter .15s ease; }
  .a-cta:hover { filter:brightness(1.1); transform:translateY(-1px); }
  .a-author { display:flex; gap:20px; align-items:flex-start; background:#1a1a1a; border:1px solid rgba(255,255,255,.1); border-radius:18px; padding:24px; margin-bottom:44px; }
  .a-author img { width:76px; height:76px; flex-shrink:0; object-fit:cover; border-radius:50%; }
  .a-author .lbl { font-size:11px; color:#a8a49d; margin-bottom:4px; }
  .a-author .nm { font-weight:700; font-size:16px; margin-bottom:4px; color:#faf8f5; }
  .a-author .nm span { font-size:11px; font-weight:400; margin-left:6px; color:#a8a49d; white-space:nowrap; }
  .a-author p { font-size:13px; color:#bdb9b2; line-height:1.8; margin:0; text-wrap:pretty; word-break:auto-phrase; }
  .a-h3 { font-family:'Zen Maru Gothic',sans-serif; font-size:18px; font-weight:700; margin:0 0 16px; color:#faf8f5; }
  .rel { display:block; text-decoration:none; color:inherit; background:#1a1a1a; border:1px solid rgba(255,255,255,.1); border-radius:14px; overflow:hidden; transition:transform .15s ease, border-color .15s ease; }
  .rel:hover { transform:translateY(-2px); border-color:rgba(92,194,166,.5); }
  .rel-t { font-size:13px; font-weight:700; padding:12px 14px 14px; line-height:1.7; color:#faf8f5; text-wrap:pretty; word-break:auto-phrase; }
  @media (max-width:1000px) {
    .navlinks { display:none !important; }
    .menu-toggle-btn { display:flex; align-items:center; justify-content:center; }
    .mobile-nav-panel { position:fixed; inset:0; background:#151515; z-index:300; flex-direction:column; padding:88px 32px 32px; gap:4px; transform:translateX(100%); transition:transform .25s ease; overflow-y:auto; }
    .mobile-nav-panel.is-open { display:flex; transform:translateX(0); }
    .mobile-nav-panel a { padding:16px 4px; font-size:16px; border-bottom:1px solid rgba(255,255,255,.1); text-decoration:none; color:#f0ece4; }
    .mobile-nav-panel a.panel-cta { margin-top:12px; border-bottom:none; background:${ACCENT}; color:#0d1a17; font-weight:700; text-align:center; border-radius:999px; padding:14px 20px; }
    .mobile-nav-close { position:absolute; top:24px; right:24px; width:36px; height:36px; border:none; background:transparent; font-size:28px; line-height:1; cursor:pointer; color:#f0ece4; }
  }
</style>
<script src="/analytics.js" async></script>
</head>
<body>
<div style="min-height:100vh;">
  ${headerHtml()}

  <main class="a-main">
    <div class="a-crumb">
      <a href="../blog.html">BLOG</a>
      <span> / </span>
      <span>${esc(article.category)}</span>
    </div>

    <div class="a-meta">
      <span class="a-tag">${esc(article.category)}</span>
      <span class="a-date">${esc(article.date)}</span>
    </div>
    <h1 class="a-title">${esc(title)}</h1>

    ${heroHtml}

    <div class="a-body">
      ${renderBody(article.body)}
    </div>

    <a class="a-cta" href="../trial.html">無料体験に申し込む</a>

    <div class="a-author">
      <img src="../images/4bb402d4b4412615b6284129a518263d.png" alt="トレーナー写真" onerror="this.style.visibility='hidden'">
      <div>
        <div class="lbl">この記事を書いた人</div>
        <div class="nm">斉藤 弘樹<span>(NSCA認定パーソナルトレーナー)</span></div>
        <p>実は自分自身も継続が苦手で、何度も挫折した経験があります。だからこそ「続けることの難しさ」がよくわかります。無理のない習慣化を一緒に目指しましょう。</p>
      </div>
    </div>

    ${relatedHtml(article, all)}
  </main>

  ${footerHtml()}
</div>
<script>
(function(){
  // NOTE: do not cache the panel element -- this site's templating engine
  // (support.js) rebuilds the DOM after initial parse, which would detach
  // a reference grabbed too early. Always look it up fresh per click.
  document.addEventListener('click', function(e){
    var panel = document.getElementById('mobile-nav-panel');
    if (!panel) return;
    if (e.target.closest('[data-menu-toggle]')) { panel.classList.add('is-open'); return; }
    if (e.target.closest('[data-menu-close]')) { panel.classList.remove('is-open'); return; }
    if (panel.classList.contains('is-open') && e.target.closest('.mobile-nav-panel a')) { panel.classList.remove('is-open'); }
  });
})();
</script>
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
