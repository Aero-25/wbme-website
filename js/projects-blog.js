/* WBME Projects — blog listing + single-post detail, backed by Supabase.
   Listing: projects.html
   Single post: projects.html?post=<slug> */
(function () {
  'use strict';
  var root = document.getElementById('projectsBlog');
  if (!root) return;

  var els = {
    loading: root.querySelector('.blog-loading'),
    empty: root.querySelector('.blog-empty'),
    error: root.querySelector('.blog-error'),
    grid: root.querySelector('.blog-grid'),
    post: root.querySelector('.blog-post')
  };

  function show (state, message) {
    Object.keys(els).forEach(function (key) { els[key].hidden = key !== state; });
    if (message && els[state]) els[state].textContent = message;
  }

  function img (path, width) {
    return window.WBME_BUCKET_IMAGE ? window.WBME_BUCKET_IMAGE(path, { width: width || 900, quality: 74, resize: 'cover' }) : '';
  }
  function esc (s) {
    var d = document.createElement('div');
    d.textContent = s || '';
    return d.innerHTML;
  }
  function formatDate (iso) {
    if (!iso) return '';
    var d = new Date(iso + 'T00:00:00');
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function featuredHTML (p) {
    return '<a class="blog-feature p-rv" href="projects.html?post=' + encodeURIComponent(p.slug) + '" data-discipline="' + esc(p.discipline) + '">' +
      '<div class="blog-feature-img" style="background-image:url(\'' + img(p.cover_path, 1100) + '\')"></div>' +
      '<div class="blog-feature-body">' +
        '<span class="blog-feature-kicker">Latest' + (formatDate(p.project_date) ? ' &middot; ' + formatDate(p.project_date) : '') + '</span>' +
        '<span class="blog-card-tag">' + esc(p.discipline) + '</span>' +
        '<h3>' + esc(p.title) + '</h3>' +
        '<p>' + esc(p.summary) + '</p>' +
        '<span class="blog-card-link">Read the full case study &rarr;</span>' +
      '</div></a>';
  }

  function cardHTML (p) {
    return '<a class="blog-card p-rv" href="projects.html?post=' + encodeURIComponent(p.slug) + '" data-discipline="' + esc(p.discipline) + '">' +
      '<div class="blog-card-img" style="background-image:url(\'' + img(p.cover_path, 700) + '\')"></div>' +
      '<div class="blog-card-face">' +
        '<span class="blog-card-tag">' + esc(p.discipline) + '</span>' +
        '<h4>' + esc(p.title) + '</h4>' +
        '<p>' + esc(p.summary) + '</p>' +
        '<span class="blog-card-meta"><span class="blog-card-date">' + formatDate(p.project_date) + '</span><span class="blog-card-link">Read case study &rarr;</span></span>' +
      '</div></a>';
  }

  function postHTML (p) {
    var gallery = (Array.isArray(p.gallery) ? p.gallery : []).map(function (path) {
      return '<div class="blog-post-thumb" data-lb="' + img(path, 1600) + '" data-caption="' + esc(p.title) + '" tabindex="0" role="button" aria-label="View full image: ' + esc(p.title) + '" style="background-image:url(\'' + img(path, 700) + '\')"></div>';
    }).join('');
    return '<a class="blog-back" href="projects.html">&larr; All projects</a>' +
      '<div class="blog-post-hero" style="background-image:url(\'' + img(p.cover_path, 1400) + '\')">' +
        '<div class="blog-post-hero-scrim" aria-hidden="true"></div>' +
        '<div class="blog-post-hero-in">' +
          '<span class="blog-post-tag">' + esc(p.discipline) + '</span>' +
          '<h1>' + esc(p.title) + '</h1>' +
          (formatDate(p.project_date) ? '<span class="blog-post-date">' + formatDate(p.project_date) + '</span>' : '') +
        '</div>' +
      '</div>' +
      '<p class="blog-post-body">' + esc(p.body || p.summary) + '</p>' +
      (gallery ? '<div class="blog-post-gallery" data-lb-scope>' + gallery + '</div>' : '');
  }

  function wireFilters (rows) {
    var chips = els.grid.querySelectorAll('.blog-filter');
    var items = els.grid.querySelectorAll('.blog-feature,.blog-card');
    Array.prototype.forEach.call(chips, function (chip) {
      chip.addEventListener('click', function () {
        Array.prototype.forEach.call(chips, function (c) { c.classList.remove('is-active'); });
        chip.classList.add('is-active');
        var f = chip.getAttribute('data-filter');
        Array.prototype.forEach.call(items, function (it) {
          it.classList.toggle('blog-hidden', f !== 'all' && it.getAttribute('data-discipline') !== f);
        });
      });
    });
  }

  function renderList (rows) {
    if (!rows.length) { show('empty'); return; }
    var disciplines = [];
    rows.forEach(function (p) { if (disciplines.indexOf(p.discipline) === -1) disciplines.push(p.discipline); });
    var featured = rows[0];
    var rest = rows.slice(1);
    var filterHTML = disciplines.length > 1
      ? '<div class="blog-filters" role="group" aria-label="Filter by discipline">' +
          '<button type="button" class="blog-filter is-active" data-filter="all">All</button>' +
          disciplines.map(function (d) { return '<button type="button" class="blog-filter" data-filter="' + esc(d) + '">' + esc(d) + '</button>'; }).join('') +
        '</div>'
      : '';
    els.grid.innerHTML = filterHTML +
      featuredHTML(featured) +
      (rest.length ? '<div class="blog-cards">' + rest.map(cardHTML).join('') + '</div>' : '');
    show('grid');
    wireFilters(rows);
    if (window.WBME_OBSERVE_REVEAL) window.WBME_OBSERVE_REVEAL(els.grid);
  }

  function renderPost (p) {
    document.title = p.title + ' | Walvis Bay Marine Engineering';
    els.post.innerHTML = postHTML(p);
    show('post');
  }

  function wireRetry () {
    var btn = els.error.querySelector('.blog-retry');
    if (btn) btn.addEventListener('click', function () { location.reload(); });
  }
  wireRetry();

  var sb = window.WBME_SUPABASE;
  if (!sb) { show('error', 'Projects aren’t connected yet. Add your Supabase details in js/supabase-client.js and run supabase/schema.sql.'); return; }

  var slug = new URLSearchParams(location.search).get('post');
  show('loading');

  var query = slug
    ? sb.from('projects').select('*').eq('slug', slug).eq('published', true).limit(1)
    : sb.from('projects').select('*').eq('published', true).order('project_date', { ascending: false }).order('created_at', { ascending: false });

  query.then(function (res) {
    if (res.error) { show('error', 'Couldn’t load projects right now.'); wireRetry(); return; }
    if (slug) {
      if (!res.data || !res.data.length) { show('empty', 'Project not found.'); return; }
      renderPost(res.data[0]);
    } else {
      renderList(res.data || []);
    }
  }).catch(function () { show('error', 'Couldn’t load projects right now.'); wireRetry(); });
})();
