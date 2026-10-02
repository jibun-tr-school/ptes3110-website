/* Personal Training E.S - アクセス計測(GA4)
   計測IDなどを変更するときは、このファイルだけ直せば全ページに反映されます。 */
(function () {
  if (window.__esAnalyticsLoaded) return;
  window.__esAnalyticsLoaded = true;

  var GA_ID = 'G-ZT22FTT3CW';

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

  // --- 主要リンクのクリック計測(動線を見るため) ---
  // ページ読み込み後にDOMが作り直されても動くよう、document全体で1つだけ監視する
  document.addEventListener('click', function (e) {
    try {
      var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
      if (!a) return;
      var href = a.getAttribute('href') || '';
      var where = a.closest('header, .site-header, nav, .mobile-nav-panel') ? 'header' : 'body';
      var name = null;
      if (href.indexOf('docs.google.com/forms') !== -1) name = 'click_form';
      else if (href.indexOf('jibun-tr') !== -1) name = 'click_jibutore_' + where;
      else if (href.indexOf('trial') !== -1) name = 'click_trial_' + where;
      else if (href.indexOf('service') !== -1) name = 'click_service_' + where;
      if (name) gtag('event', name, { link_url: a.href });
    } catch (err) { /* 計測の失敗でサイトの動作は止めない */ }
  }, true);
})();
