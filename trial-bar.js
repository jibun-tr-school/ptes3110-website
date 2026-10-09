/* Personal Training E.S - 画面下の「無料体験」固定バー
   どのページからでも体験の申込みに進めるようにする小さなバーです。
   - 全ページ共通。analytics.js から読み込まれます。
   - じぶとれのページではじぶとれの無料体験フォーム、それ以外のページでは体験案内ページ(trial.html)へ。
   - 申込み案内ページ(trial.html)では出しません。
   - 「×」で閉じると、そのタブを開いている間は再表示しません。 */
(function () {
  if (window.__esTrialBar) return;
  window.__esTrialBar = true;

  var path = location.pathname.replace(/index\.html$/, '');
  if (/\/trial\.html$/.test(path)) return;

  var isJibu = /\/jibun-tr(\.html)?$/.test(path);
  var cfg = isJibu
    ? { label: 'じぶとれの無料体験（50分）', btn: '申し込む',
        href: 'https://docs.google.com/forms/d/e/1FAIpQLSdJZJIZ7RH4fdJBUKjgX2aFMzGGXcxI1qZOvUGNDa3RM5zHew/viewform',
        blank: true }
    : { label: '無料体験（50分）', btn: '申し込む', href: '/trial.html', blank: false };

  var KEY = 'es-trial-bar-closed';
  try { if (sessionStorage.getItem(KEY) === '1') return; } catch (e) { /* 保存できない環境では毎回表示 */ }

  function build() {
    if (document.getElementById('es-trial-bar')) return;

    var css = document.createElement('style');
    css.id = 'es-trial-bar-style';
    css.textContent =
      'html.es-has-trial-bar body{padding-bottom:calc(60px + env(safe-area-inset-bottom,0px)) !important;}' +
      '#es-trial-bar{position:fixed;left:0;right:0;bottom:0;z-index:150;box-sizing:border-box;' +
        'background:rgba(255,255,255,.97);border-top:1px solid #e3e3e3;box-shadow:0 -2px 12px rgba(0,0,0,.06);' +
        'padding:8px 12px calc(8px + env(safe-area-inset-bottom,0px));' +
        'font-family:"Zen Maru Gothic","Noto Sans JP",sans-serif;' +
        'transform:translateY(100%);transition:transform .35s ease;}' +
      '#es-trial-bar.es-tb-show{transform:translateY(0);}' +
      '#es-trial-bar .es-tb-inner{display:flex;align-items:center;justify-content:center;gap:12px;max-width:720px;margin:0 auto;}' +
      '#es-trial-bar .es-tb-label{font-size:14px;font-weight:700;color:#2b2724;white-space:nowrap;min-width:0;overflow:hidden;text-overflow:ellipsis;}' +
      '#es-trial-bar .es-tb-btn{display:inline-block;background:#5aa59c;color:#fff;font-weight:900;font-size:14px;' +
        'line-height:1;padding:11px 20px;border-radius:999px;text-decoration:none;white-space:nowrap;}' +
      '#es-trial-bar .es-tb-close{flex:none;width:32px;height:32px;margin-left:2px;border:0;background:transparent;' +
        'color:#8a8580;font-size:20px;line-height:1;cursor:pointer;border-radius:50%;}' +
      '#es-trial-bar .es-tb-close:hover{background:#f0f0f0;}' +
      '@media (max-width:380px){#es-trial-bar{padding-left:8px;padding-right:8px;}' +
        '#es-trial-bar .es-tb-inner{gap:8px;}#es-trial-bar .es-tb-label{font-size:13px;}' +
        '#es-trial-bar .es-tb-btn{padding:10px 14px;}#es-trial-bar .es-tb-close{margin-left:0;}}' +
      '@media (prefers-reduced-motion:reduce){#es-trial-bar{transition:none;}}';
    document.head.appendChild(css);

    var bar = document.createElement('div');
    bar.id = 'es-trial-bar';
    bar.setAttribute('role', 'region');
    bar.setAttribute('aria-label', '無料体験のご案内');

    var inner = document.createElement('div');
    inner.className = 'es-tb-inner';

    var label = document.createElement('span');
    label.className = 'es-tb-label';
    label.textContent = cfg.label;

    var a = document.createElement('a');
    a.className = 'es-tb-btn';
    a.href = cfg.href;
    a.textContent = cfg.btn;
    if (cfg.blank) { a.target = '_blank'; a.rel = 'noopener'; }

    var close = document.createElement('button');
    close.type = 'button';
    close.className = 'es-tb-close';
    close.setAttribute('aria-label', 'このバーを閉じる');
    close.textContent = '×';
    close.addEventListener('click', function () {
      try { sessionStorage.setItem(KEY, '1'); } catch (e) { /* 保存できなくても閉じる */ }
      bar.classList.remove('es-tb-show');
      document.documentElement.classList.remove('es-has-trial-bar');
      setTimeout(function () { if (bar.parentNode) bar.parentNode.removeChild(bar); }, 400);
    });

    inner.appendChild(label);
    inner.appendChild(a);
    inner.appendChild(close);
    bar.appendChild(inner);
    document.body.appendChild(bar);
    document.documentElement.classList.add('es-has-trial-bar');
    setTimeout(function () { bar.classList.add('es-tb-show'); }, 700);
  }

  if (document.body) build();
  else document.addEventListener('DOMContentLoaded', build);
})();
