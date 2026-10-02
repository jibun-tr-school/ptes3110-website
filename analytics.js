/* Personal Training E.S - アクセス計測(GA4 + Metaピクセル)
   計測IDなどを変更するときは、このファイルだけ直せば全ページに反映されます。 */
(function () {
  if (window.__esAnalyticsLoaded) return;
  window.__esAnalyticsLoaded = true;

  var GA_ID = 'G-ZT22FTT3CW';
  var PIXEL_ID = '1860513671589398';

  // --- GA4 本体 ---
  var tag = document.createElement('script');
  tag.async = true;
  tag.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
  document.head.appendChild(tag);

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag('js', new Date());
  gtag('config', GA_ID);

  // --- Metaピクセル(広告経由の訪問を数える・広告の最適化に使う) ---
  !function (f, b, e, v, n, t, s) {
    if (f.fbq) return;
    n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
    if (!f._fbq) f._fbq = n;
    n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = [];
    t = b.createElement(e); t.async = !0; t.src = v;
    s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
  }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
  window.fbq('init', PIXEL_ID);
  window.fbq('track', 'PageView');

  // --- 主要リンクのクリック計測(動線を見るため) ---
  // ページ読み込み後にDOMが作り直されても動くよう、document全体で1つだけ監視する
  document.addEventListener('click', function (e) {
    try {
      var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
      if (!a) return;
      var href = a.getAttribute('href') || '';
      var where = a.closest('header, .site-header, nav, .mobile-nav-panel') ? 'header' : 'body';
      var name = null;
      if (href.indexOf('docs.google.com/forms') !== -1) {
        name = 'click_form';
        // 旧LPと同じ標準イベント「Lead」を送る(申込フォームを開いた人の数)
        if (window.fbq) window.fbq('track', 'Lead');
      }
      else if (href.indexOf('jibun-tr') !== -1) name = 'click_jibutore_' + where;
      else if (href.indexOf('trial') !== -1) name = 'click_trial_' + where;
      else if (href.indexOf('service') !== -1) name = 'click_service_' + where;
      if (name) gtag('event', name, { link_url: a.href });
    } catch (err) { /* 計測の失敗でサイトの動作は止めない */ }
  }, true);
})();
