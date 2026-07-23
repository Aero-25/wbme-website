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

  function cardHTML (p) {
    return '<a class="blog-card p-rv" href="projects.html?post=' + encodeURIComponent(p.slug) + '">' +
      '<div class="blog-card-img" style="background-image:url(\'' + img(p.cover_path, 700) + '\')"></div>' +
      '<div class="blog-card-face">' +
        '<span class="blog-card-tag">' + esc(p.discipline) + '</span>' +
        '<h4>' + esc(p.title) + '</h4>' +
        '<p>' + esc(p.summary) + '</p>' +
        '<span class="blog-card-link">Read case study &rarr;</span>' +
      '</div></a>';
  }

  function postHTML (p) {
    var gallery = (Array.isArray(p.gallery) ? p.gallery : []).map(function (path) {
      return '<div class="blog-post-thumb" data-lb="' + img(path, 1600) + '" data-caption="' + esc(p.title) + '" tabindex="0" role="button" aria-label="View full image: ' + esc(p.title) + '" style="background-image:url(\'' + img(path, 700) + '\')"></div>';
    }).join('');
    return '<div class="corner-marks" aria-hidden="true"><i></i><i></i><i></i><i></i></div>' +
      '<a class="blog-back" href="projects.html">&larr; All projects</a>' +
      '<span class="blog-post-tag">' + esc(p.discipline) + '</span>' +
      '<h1>' + esc(p.title) + '</h1>' +
      '<div class="blog-post-cover" style="background-image:url(\'' + img(p.cover_path, 1400) + '\')"></div>' +
      '<p class="blog-post-body">' + esc(p.body || p.summary) + '</p>' +
      (gallery ? '<div class="blog-post-gallery" data-lb-scope>' + gallery + '</div>' : '');
  }

  function renderList (rows) {
    if (!rows.length) { show('empty'); return; }
    els.grid.innerHTML = rows.map(cardHTML).join('');
    show('grid');
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
    : sb.from('projects').select('*').eq('published', true).order('created_at', { ascending: false });

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
