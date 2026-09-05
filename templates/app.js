/* Rezeptbuch – Seiten- und Kataloglogik (ohne Abhängigkeiten) */
(function () {
  'use strict';
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };

  function toast(msg) {
    var t = $('#toast'); if (!t) return;
    t.textContent = msg; t.classList.add('show');
    clearTimeout(t._h); t._h = setTimeout(function () { t.classList.remove('show'); }, 1800);
  }
  function copy(text, ok) {
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(function () { toast(ok || 'Kopiert'); });
  }
  var FR = { 0.25: '¼', 0.33: '⅓', 0.5: '½', 0.66: '⅔', 0.75: '¾' };
  function fmt(n) {
    if (n === null || n === undefined || isNaN(n)) return '';
    var whole = Math.floor(n + 1e-9), rest = Math.round((n - whole) * 100) / 100;
    var key = null;
    [0.25, 0.33, 0.5, 0.66, 0.75].forEach(function (f) { if (Math.abs(rest - f) < 0.03) key = f; });
    if (key !== null) return (whole ? whole + ' ' : '') + FR[key];
    if (Math.abs(rest) < 0.03) return String(whole);
    return (Math.round(n * 10) / 10).toString().replace('.', ',');
  }

  /* ---------- Rezeptseite ---------- */
  var out = $('#p-out');
  if (out) {
    var base = parseInt(out.dataset.base, 10) || 1, cur = base;
    var rows = $$('#ings td.n[data-amount]');
    function apply() {
      $('#p-num').textContent = cur;
      out.lastChild.textContent = cur === 1 ? ' Portion' : ' Portionen';
      rows.forEach(function (td) { td.textContent = fmt(parseFloat(td.dataset.amount) * cur / base); });
    }
    $('#p-minus').addEventListener('click', function () { if (cur > 1) { cur--; apply(); } });
    $('#p-plus').addEventListener('click', function () { if (cur < 99) { cur++; apply(); } });

    $('#btn-print').addEventListener('click', function () { window.print(); });
    $('#btn-share').addEventListener('click', function () {
      var data = { title: document.body.dataset.title, text: document.body.dataset.title, url: document.body.dataset.url };
      if (navigator.share) navigator.share(data).catch(function () {});
      else copy(data.url, 'Link kopiert');
    });
    $$('[data-copy]').forEach(function (b) {
      b.addEventListener('click', function () {
        var el = document.getElementById(b.dataset.copy);
        copy(el.value !== undefined ? el.value : el.textContent, 'Kopiert');
      });
    });
    var qrEl = $('#qr');
    if (qrEl && window.qrcode) {
      try { var q = qrcode(0, 'M'); q.addData(document.body.dataset.url); q.make(); qrEl.innerHTML = q.createSvgTag({ cellSize: 2, margin: 0, scalable: true }); } catch (e) {}
    }
  }

  /* ---------- Katalog ---------- */
  var dataEl = $('#data');
  if (dataEl) {
    var all = [];
    try { all = JSON.parse(dataEl.textContent); } catch (e) { all = []; }
    var q = $('#q'), fCat = $('#f-cat'), fDiet = $('#f-diet'), fDiff = $('#f-diff'), fTime = $('#f-time'), sort = $('#sort'), reset = $('#reset'), cards = $('#cards');

    var cats = {}, diets = {};
    all.forEach(function (r) {
      (r.categories || []).forEach(function (c) { cats[c] = 1; });
      (r.diet || []).forEach(function (d) { diets[d] = 1; });
    });
    Object.keys(cats).sort().forEach(function (c) { var o = document.createElement('option'); o.value = c; o.textContent = c; fCat.appendChild(o); });
    Object.keys(diets).sort().forEach(function (d) { var o = document.createElement('option'); o.value = d; o.textContent = d; fDiet.appendChild(o); });

    var p = new URLSearchParams(location.search);
    q.value = p.get('q') || ''; fCat.value = p.get('kat') || ''; fDiet.value = p.get('diet') || '';
    fDiff.value = p.get('grad') || ''; fTime.value = p.get('zeit') || ''; sort.value = p.get('sort') || 'new';

    function norm(s) { return (s || '').toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss'); }
    function esc(s) { return String(s || '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

    function render() {
      var needle = norm(q.value.trim());
      var list = all.filter(function (r) {
        if (needle && norm(r.search).indexOf(needle) < 0) return false;
        if (fCat.value && (r.categories || []).indexOf(fCat.value) < 0) return false;
        if (fDiet.value && (r.diet || []).indexOf(fDiet.value) < 0) return false;
        if (fDiff.value && r.difficulty !== fDiff.value) return false;
        if (fTime.value && r.total_min > parseInt(fTime.value, 10)) return false;
        return true;
      });
      var s = sort.value;
      list.sort(function (a, b) {
        if (s === 'az') return a.title.localeCompare(b.title, 'de');
        if (s === 'time') return (a.total_min || 0) - (b.total_min || 0);
        if (s === 'kcal') return (a.calories || 9999) - (b.calories || 9999);
        return (b.updated || '').localeCompare(a.updated || '');
      });
      cards.innerHTML = list.length ? list.map(card).join('') :
        '<div class="empty"><svg class="icon"><use href="#i-search"/></svg><p>Kein Rezept passt zu dieser Auswahl.</p></div>';
      var n = list.length;
      $('#cat-sub').textContent = n === all.length ? (n === 1 ? '1 Rezept' : n + ' Rezepte') : n + ' von ' + all.length + ' Rezepten';
      var active = q.value || fCat.value || fDiet.value || fDiff.value || fTime.value;
      reset.hidden = !active; $('#q-clear').hidden = !q.value;
      var np = new URLSearchParams();
      if (q.value) np.set('q', q.value); if (fCat.value) np.set('kat', fCat.value); if (fDiet.value) np.set('diet', fDiet.value);
      if (fDiff.value) np.set('grad', fDiff.value); if (fTime.value) np.set('zeit', fTime.value); if (sort.value !== 'new') np.set('sort', sort.value);
      var qs = np.toString(); history.replaceState(null, '', qs ? '?' + qs : location.pathname);
    }
    function card(r) {
      var img = r.image ? '<img src="' + esc(r.url) + esc(r.image) + '" alt="" loading="lazy">' : '<svg class="icon"><use href="#i-hat"/></svg>';
      var diet = (r.diet && r.diet.length) ? '<span><svg class="icon"><use href="#i-leaf"/></svg>' + esc(r.diet[0]) + '</span>' : '';
      return '<a class="rcard" href="' + esc(r.url) + '"><div class="img">' + img + '</div><div class="body">' +
        '<h3>' + esc(r.title) + '</h3>' + (r.subtitle ? '<p class="sub">' + esc(r.subtitle) + '</p>' : '') +
        '<div class="row"><span><svg class="icon"><use href="#i-clock"/></svg>' + (r.total_min || 0) + ' Min.</span>' +
        '<span><svg class="icon lvl-' + { simpel: 1, normal: 2, pfiffig: 3 }[r.difficulty] + '"><use href="#i-gauge"/></svg>' + esc(r.difficulty) + '</span>' + diet + '</div></div></a>';
    }
    [q, fCat, fDiet, fDiff, fTime, sort].forEach(function (el) { el.addEventListener('input', render); el.addEventListener('change', render); });
    $('#q-clear').addEventListener('click', function () { q.value = ''; render(); q.focus(); });
    reset.addEventListener('click', function () { q.value = ''; fCat.value = ''; fDiet.value = ''; fDiff.value = ''; fTime.value = ''; render(); });
    render();
  }
})();
