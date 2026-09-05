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
  var num = $('#p-num');
  if (num) {
    var base = parseInt(num.dataset.base, 10) || 1, cur = base;
    var rows = $$('#ings td.n[data-amount]');
    function apply() {
      num.value = cur;
      $('#p-num-lbl').textContent = cur;
      $('#p-lbl').textContent = cur === 1 ? 'Portion' : 'Portionen';
      rows.forEach(function (td) { td.textContent = fmt(parseFloat(td.dataset.amount) * cur / base); });
    }
    $('#p-minus').addEventListener('click', function () { if (cur > 1) { cur--; apply(); } });
    $('#p-plus').addEventListener('click', function () { if (cur < 99) { cur++; apply(); } });
    num.addEventListener('input', function () { var v = parseInt(num.value, 10); if (v >= 1 && v <= 99) { cur = v; apply(); } });
    num.addEventListener('blur', function () { apply(); });
    num.addEventListener('focus', function () { num.select(); });

    function share() {
      var data = { title: document.body.dataset.title, text: document.body.dataset.title, url: document.body.dataset.url };
      if (navigator.share) navigator.share(data).catch(function () {});
      else copy(data.url, 'Link kopiert');
    }
    $$('#btn-print,[data-action="print"]').forEach(function (b) { b.addEventListener('click', function () { closeShare(); window.print(); }); });
    var menu = $('#share-menu'), backdrop = null;
    function closeShare() { if (!menu) return; menu.hidden = true; if (backdrop) { backdrop.remove(); backdrop = null; } }
    function openShare(btn) {
      if (!menu) return share();
      var nativeBtn = menu.querySelector('[data-share="native"]'); if (nativeBtn) nativeBtn.hidden = !navigator.share;
      var r = btn.getBoundingClientRect();
      menu.style.top = (r.bottom + 8) + 'px'; menu.style.left = Math.max(12, Math.min(r.left, window.innerWidth - 250)) + 'px';
      menu.hidden = false;
      backdrop = document.createElement('div'); backdrop.className = 'share-backdrop'; backdrop.addEventListener('click', closeShare); document.body.appendChild(backdrop);
    }
    $$('#btn-share,[data-action="share"]').forEach(function (b) { b.addEventListener('click', function () { openShare(b); }); });
    if (menu) {
      menu.querySelector('[data-share="native"]').addEventListener('click', function () { closeShare(); share(); });
      $$('[data-copy-text]', menu).forEach(function (b) { b.addEventListener('click', function () { closeShare(); copy(b.dataset.copyText, 'Link kopiert'); }); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeShare(); });
    }
    $$('[data-copy]').forEach(function (b) {
      b.addEventListener('click', function () {
        var el = document.getElementById(b.dataset.copy);
        closeShare();
        copy(el.value !== undefined ? el.value : el.textContent, 'Kopiert');
      });
    });
    var mine = $('#mine');
    if (mine) {
      var slug = mine.querySelector('code') ? (document.body.dataset.url.replace(/\/$/, '').split('/').pop()) : '';
      var st = {}, nt = {};
      try { st = JSON.parse(localStorage.getItem('sc-rating') || '{}'); nt = JSON.parse(localStorage.getItem('sc-notes') || '{}'); } catch (e) {}
      var btns = $$('#stars button'), lbl = $('#stars-lbl'), ta = $('#notes');
      var LBL = ['', 'Nicht so meins', 'Geht so', 'Gut', 'Sehr gut', 'Top, immer wieder'];
      function paint(v) { btns.forEach(function (b) { b.classList.toggle('on', parseInt(b.dataset.v, 10) <= v); }); lbl.textContent = v ? v + ' von 5 · ' + LBL[v] : 'Noch nicht bewertet'; }
      var cur = st[slug] || parseInt(mine.dataset.rating, 10) || 0; paint(cur);
      btns.forEach(function (b) { b.addEventListener('click', function () { var v = parseInt(b.dataset.v, 10); cur = (cur === v) ? 0 : v; st[slug] = cur; try { localStorage.setItem('sc-rating', JSON.stringify(st)); } catch (e) {} paint(cur); toast(cur ? 'Bewertung gespeichert' : 'Bewertung entfernt'); }); });
      if (nt[slug]) ta.value = nt[slug];
      var t; ta.addEventListener('input', function () { clearTimeout(t); t = setTimeout(function () { nt[slug] = ta.value; try { localStorage.setItem('sc-notes', JSON.stringify(nt)); } catch (e) {} toast('Notiz gespeichert'); }, 800); });
    }
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
    var localRatings = {};
    try { localRatings = JSON.parse(localStorage.getItem('sc-rating') || '{}'); } catch (e) {}
    all.forEach(function (r) { r.rating_eff = localRatings[r.slug] || r.rating || 0; r.cuisine_arr = r.cuisine ? [r.cuisine] : []; });

    var ORDER = {
      meal: ['Frühstück', 'Vorspeise', 'Hauptspeise', 'Beilage', 'Dessert', 'Snack'],
      daytime: ['Frühstück', 'Mittag', 'Abendessen'],
      properties: ['Einfach', 'Schnell', 'Wenige Zutaten', 'Preiswert', 'Meal Prep', 'Basisrezept'],
      occasion: ['Frühling', 'Sommer', 'Herbst', 'Winter', 'Für Kinder', 'Party', 'Büro', 'Picknick', 'Grillen', 'Ostern', 'Weihnachten', 'Silvester']
    };
    var FACETS = [
      { key: 'sort', label: 'Sortieren', icon: 'i-sort', type: 'radio', options: [['new', 'Neueste zuerst'], ['az', 'A bis Z'], ['time', 'Kürzeste Arbeitszeit'], ['kcal', 'Wenigste Kalorien'], ['rating', 'Beste Bewertung']], def: 'new' },
      { key: 'rating', label: 'Bewertung', icon: 'i-star', type: 'radio', options: [['2', 'ab 2 Sterne'], ['3', 'ab 3 Sterne'], ['4', 'ab 4 Sterne'], ['5', 'Top, 5 Sterne']] },
      { key: 'prep', label: 'Arbeitszeit', icon: 'i-clock', type: 'radio', options: [['15', 'bis 15 Min.'], ['30', 'bis 30 Min.'], ['45', 'bis 45 Min.'], ['60', 'bis 60 Min.']] },
      { key: 'diet', label: 'Ernährung', icon: 'i-leaf', type: 'multi', field: 'diet' },
      { key: 'dish', label: 'Rezeptkategorie', icon: 'i-bowl', type: 'multi', field: 'dish_type' },
      { key: 'props', label: 'Rezepteigenschaften', icon: 'i-spark', type: 'multi', field: 'properties' },
      { key: 'method', label: 'Zubereitung', icon: 'i-cook', type: 'multi', field: 'method' },
      { key: 'cuisine', label: 'Länderküche', icon: 'i-globe', type: 'multi', field: 'cuisine_arr' },
      { key: 'meal', label: 'Mahlzeit', icon: 'i-cloche', type: 'multi', field: 'meal' },
      { key: 'daytime', label: 'Tageszeit', icon: 'i-sun', type: 'multi', field: 'daytime' },
      { key: 'occasion', label: 'Anlass', icon: 'i-flag', type: 'multi', field: 'occasion' }
    ];
    var q = $('#q'), fbar = $('#fbar'), reset = $('#reset'), cards = $('#cards');
    var state = {};
    var p = new URLSearchParams(location.search);
    q.value = p.get('q') || '';
    FACETS.forEach(function (f) { var v = p.get(f.key); state[f.key] = f.type === 'multi' ? (v ? v.split(',') : []) : (v || f.def || ''); });

    function norm(s) { return (s || '').toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss'); }
    function esc(s) { return String(s || '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
    function optionsFor(f) {
      var seen = {}; all.forEach(function (r) { (r[f.field] || []).forEach(function (v) { seen[v] = 1; }); });
      var ord = ORDER[f.field] || [];
      var keys = Object.keys(seen).sort(function (a, b) {
        var ia = ord.indexOf(a), ib = ord.indexOf(b);
        if (ia < 0 && ib < 0) return a.localeCompare(b, 'de'); if (ia < 0) return 1; if (ib < 0) return -1; return ia - ib;
      });
      return keys;
    }
    function passes(r, skipKey) {
      var needle = norm(q.value.trim());
      if (needle && norm(r.search).indexOf(needle) < 0) return false;
      for (var i = 0; i < FACETS.length; i++) {
        var f = FACETS[i]; if (f.key === skipKey || f.key === 'sort') continue;
        var v = state[f.key];
        if (f.type === 'multi') { if (v.length && !v.some(function (x) { return (r[f.field] || []).indexOf(x) >= 0; })) return false; }
        else if (f.key === 'rating') { if (v && r.rating_eff < parseInt(v, 10)) return false; }
        else if (f.key === 'prep') { if (v && r.prep_min > parseInt(v, 10)) return false; }
      }
      return true;
    }
    function isActive(f) { var v = state[f.key]; return f.type === 'multi' ? v.length > 0 : (v && v !== (f.def || '')); }

    function renderBar() {
      fbar.innerHTML = '';
      FACETS.forEach(function (f) {
        var opts = f.type === 'multi' ? optionsFor(f).map(function (v) { return [v, v]; }) : f.options;
        if (f.type === 'multi' && !opts.length) return;
        var wrap = document.createElement('div'); wrap.className = 'fchip' + (isActive(f) ? ' active' : ''); wrap.dataset.key = f.key;
        var n = f.type === 'multi' ? state[f.key].length : 0;
        var btn = document.createElement('button'); btn.type = 'button'; btn.setAttribute('aria-expanded', 'false');
        btn.innerHTML = '<svg class="icon"><use href="#' + f.icon + '"/></svg>' + f.label + (n ? '<span class="n">' + n + '</span>' : '') + '<svg class="icon chev"><use href="#i-chevron"/></svg>';
        var panel = document.createElement('div'); panel.className = 'fpanel'; panel.hidden = true;
        var ul = document.createElement('ul');
        opts.forEach(function (o) {
          var val = o[0], lbl = o[1];
          var li = document.createElement('li');
          var cnt = f.type === 'sort' ? -1 : all.filter(function (r) {
            if (!passes(r, f.key)) return false;
            if (f.type === 'multi') return (r[f.field] || []).indexOf(val) >= 0;
            if (f.key === 'rating') return r.rating_eff >= parseInt(val, 10);
            if (f.key === 'prep') return r.prep_min <= parseInt(val, 10);
            return true;
          }).length;
          if (cnt === 0) li.className = 'zero';
          var checked = f.type === 'multi' ? state[f.key].indexOf(val) >= 0 : state[f.key] === val;
          var star = f.key === 'rating' ? '<span class="stars-row">' + Array(parseInt(val, 10) + 1).join('<svg class="icon"><use href="#i-star"/></svg>') + '</span> ' : '';
          li.innerHTML = '<label><input type="' + (f.type === 'multi' ? 'checkbox' : 'radio') + '" name="f-' + f.key + '" value="' + esc(val) + '"' + (checked ? ' checked' : '') + '>' + star + '<span>' + esc(lbl) + '</span>' + (cnt >= 0 ? ' <small style="color:var(--muted);margin-left:auto">' + cnt + '</small>' : '') + '</label>';
          li.querySelector('input').addEventListener('change', function (ev) {
            if (f.type === 'multi') { var arr = state[f.key]; var i = arr.indexOf(val); if (ev.target.checked && i < 0) arr.push(val); if (!ev.target.checked && i >= 0) arr.splice(i, 1); }
            else state[f.key] = val;
            render(true, f.key);
          });
          ul.appendChild(li);
        });
        panel.appendChild(ul);
        if (f.key !== 'sort') {
          var foot = document.createElement('div'); foot.className = 'fp-foot';
          var rb = document.createElement('button'); rb.type = 'button'; rb.textContent = 'Zurücksetzen'; rb.disabled = !isActive(f);
          rb.addEventListener('click', function () { state[f.key] = f.type === 'multi' ? [] : (f.def || ''); render(true, f.key); });
          foot.appendChild(rb); panel.appendChild(foot);
        }
        btn.addEventListener('click', function (ev) { ev.stopPropagation(); var open = wrap.classList.contains('open'); closeAll(); if (!open) { wrap.classList.add('open'); panel.hidden = false; btn.setAttribute('aria-expanded', 'true'); } });
        panel.addEventListener('click', function (ev) { ev.stopPropagation(); });
        wrap.appendChild(btn); wrap.appendChild(panel); fbar.appendChild(wrap);
      });
    }
    function closeAll() { $$('.fchip.open', fbar).forEach(function (w) { w.classList.remove('open'); w.querySelector('.fpanel').hidden = true; w.querySelector('button').setAttribute('aria-expanded', 'false'); }); }
    document.addEventListener('click', closeAll);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeAll(); });

    function render(rebuildBar, keepOpen) {
      var list = all.filter(function (r) { return passes(r); });
      var s = state.sort;
      list.sort(function (a, b) {
        if (s === 'az') return a.title.localeCompare(b.title, 'de');
        if (s === 'time') return (a.prep_min || 0) - (b.prep_min || 0);
        if (s === 'kcal') return (a.calories || 9999) - (b.calories || 9999);
        if (s === 'rating') return (b.rating_eff || 0) - (a.rating_eff || 0);
        return (b.updated || '').localeCompare(a.updated || '');
      });
      cards.innerHTML = list.length ? list.map(card).join('') :
        '<div class="empty"><svg class="icon"><use href="#i-search"/></svg><p>Kein Rezept passt zu dieser Auswahl.</p></div>';
      var n = list.length;
      $('#cat-sub').textContent = n === all.length ? (n === 1 ? '1 Rezept' : n + ' Rezepte') : n + ' von ' + all.length + ' Rezepten';
      var active = !!q.value || FACETS.some(isActive);
      reset.hidden = !active; $('#q-clear').hidden = !q.value;
      var np = new URLSearchParams();
      if (q.value) np.set('q', q.value);
      FACETS.forEach(function (f) { if (isActive(f)) np.set(f.key, f.type === 'multi' ? state[f.key].join(',') : state[f.key]); });
      var qs = np.toString(); history.replaceState(null, '', qs ? '?' + qs : location.pathname);
      if (rebuildBar !== false) {
        renderBar();
        if (keepOpen) { var w = fbar.querySelector('.fchip[data-key="' + keepOpen + '"]'); if (w) { w.classList.add('open'); w.querySelector('.fpanel').hidden = false; } }
      }
    }
    function card(r) {
      var img = r.image ? '<img src="' + esc(r.url) + esc(r.image) + '" alt="" loading="lazy">' : '<svg class="icon"><use href="#i-logo"/></svg>';
      var diet = (r.diet && r.diet.length) ? '<span><svg class="icon"><use href="#i-leaf"/></svg>' + esc(r.diet[0]) + '</span>' : '';
      var rt = r.rating_eff ? '<span class="rt"><svg class="icon"><use href="#i-star"/></svg>' + r.rating_eff + '</span>' : '';
      return '<a class="rcard" href="' + esc(r.url) + '"><div class="img">' + img + '</div><div class="body">' +
        '<h3>' + esc(r.title) + '</h3>' + (r.subtitle ? '<p class="sub">' + esc(r.subtitle) + '</p>' : '') +
        '<div class="row"><span><svg class="icon"><use href="#i-clock"/></svg>' + (r.prep_min || 0) + ' Min.</span>' +
        '<span><svg class="icon lvl-' + { simpel: 1, normal: 2, pfiffig: 3 }[r.difficulty] + '"><use href="#i-gauge"/></svg>' + esc(r.difficulty) + '</span>' + diet + rt + '</div></div></a>';
    }
    q.addEventListener('input', function () { render(true); });
    $('#q-clear').addEventListener('click', function () { q.value = ''; render(true); q.focus(); });
    reset.addEventListener('click', function () { q.value = ''; FACETS.forEach(function (f) { state[f.key] = f.type === 'multi' ? [] : (f.def || ''); }); render(true); });
    render(true);
  }
})();
