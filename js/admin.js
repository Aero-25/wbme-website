/* WBME Admin — sign in + project post CRUD against the site's own API
   (Cloudflare Pages Functions, D1 for posts, R2 for photos). The server
   enforces the session on every /api/admin/* call; hiding sections here is
   only presentation. */
(function () {
  'use strict';

  var loginSection = document.getElementById('adminLogin');
  var dashSection = document.getElementById('adminDash');
  var formSection = document.getElementById('adminForm');
  var whoEl = document.getElementById('adminWho');
  var signOutBtn = document.getElementById('adminSignOut');

  function esc (s) {
    var d = document.createElement('div');
    d.textContent = s || '';
    return d.innerHTML;
  }
  function img (path, width) {
    return window.WBME_BUCKET_IMAGE ? window.WBME_BUCKET_IMAGE(path, { width: width || 240 }) : '';
  }
  function slugify (s) {
    return String(s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-+|-+$)/g, '');
  }

  /* JSON API call; rejects with the server's error message. A 401 anywhere
     means the session ended, so drop back to the sign-in screen. */
  function api (method, url, body) {
    var opts = { method: method, headers: { accept: 'application/json' }, credentials: 'same-origin' };
    if (body !== undefined) { opts.headers['content-type'] = 'application/json'; opts.body = JSON.stringify(body); }
    return fetch(url, opts).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (res.status === 401 && url !== '/api/admin/login') showLoggedOut();
        if (!res.ok) throw new Error(data.error || ('Request failed (' + res.status + ')'));
        return data;
      });
    });
  }

  function showLoggedOut () {
    loginSection.hidden = false; dashSection.hidden = true; formSection.hidden = true;
    whoEl.hidden = true; signOutBtn.hidden = true;
  }
  function showLoggedIn (email) {
    loginSection.hidden = true; formSection.hidden = true; dashSection.hidden = false;
    whoEl.hidden = false; whoEl.textContent = email;
    signOutBtn.hidden = false;
    loadList();
  }

  api('GET', '/api/admin/me').then(function (me) { showLoggedIn(me.email); }, showLoggedOut);

  var loginForm = document.getElementById('adminLoginForm');
  var loginError = document.getElementById('adminLoginError');
  loginForm.addEventListener('submit', function (e) {
    e.preventDefault();
    loginError.hidden = true;
    var btn = loginForm.querySelector('button[type=submit]');
    btn.disabled = true;
    api('POST', '/api/admin/login', {
      email: document.getElementById('al-email').value.trim(),
      password: document.getElementById('al-pass').value
    }).then(function (me) {
      document.getElementById('al-pass').value = '';
      showLoggedIn(me.email);
    }, function (err) {
      loginError.textContent = err.message; loginError.hidden = false;
    }).then(function () { btn.disabled = false; });
  });
  signOutBtn.addEventListener('click', function () {
    api('POST', '/api/admin/logout').then(showLoggedOut, showLoggedOut);
  });

  /* ===== LIST ===== */
  var listEl = document.getElementById('adminList');
  var statsEl = document.getElementById('adminStats');
  var currentRows = [];

  function loadList () {
    listEl.innerHTML = '<p class="admin-empty">Loading&hellip;</p>';
    api('GET', '/api/admin/projects').then(function (rows) {
      currentRows = rows || [];
      renderStats(currentRows);
      renderList(currentRows);
    }, function (err) {
      listEl.innerHTML = '<p class="admin-empty">Could not load projects: ' + esc(err.message) + '</p>';
    });
  }

  function renderStats (rows) {
    if (!statsEl) return;
    var published = rows.filter(function (r) { return r.published; }).length;
    statsEl.innerHTML =
      '<div class="admin-stat"><b>' + rows.length + '</b><span>Total posts</span></div>' +
      '<div class="admin-stat"><b>' + published + '</b><span>Published</span></div>' +
      '<div class="admin-stat"><b>' + (rows.length - published) + '</b><span>Drafts</span></div>';
  }

  function renderList (rows) {
    if (!rows.length) { listEl.innerHTML = '<p class="admin-empty">No projects yet. Click &ldquo;New project&rdquo; to add the first one.</p>'; return; }
    listEl.innerHTML = rows.map(function (p) {
      var badge = p.published
        ? '<span class="admin-badge is-published">Published</span>'
        : '<span class="admin-badge is-draft">Draft</span>';
      return '<div class="admin-row" data-id="' + esc(p.id) + '">' +
        '<div class="admin-row-thumb" style="background-image:url(\'' + img(p.cover_path) + '\')"></div>' +
        '<div class="admin-row-body"><b>' + esc(p.title) + '</b><div class="admin-row-meta"><span>' + esc(p.discipline) + '</span>' + badge + '</div></div>' +
        '<div class="admin-row-actions"><button type="button" class="btn-ghost-sm admin-edit">Edit</button><button type="button" class="btn-ghost-sm admin-del">Delete</button></div>' +
      '</div>';
    }).join('');
    Array.prototype.forEach.call(listEl.querySelectorAll('.admin-row'), function (row) {
      var id = row.getAttribute('data-id');
      var p = currentRows.filter(function (r) { return String(r.id) === id; })[0];
      row.querySelector('.admin-edit').addEventListener('click', function () { openForm(p); });
      row.querySelector('.admin-del').addEventListener('click', function () {
        if (!window.confirm('Delete "' + p.title + '"? This cannot be undone.')) return;
        api('DELETE', '/api/admin/projects/' + encodeURIComponent(id)).then(loadList, function (err) {
          window.alert('Delete failed: ' + err.message);
        });
      });
    });
  }

  /* ===== FORM (create / edit) ===== */
  var newBtn = document.getElementById('adminNew');
  var cancelBtn = document.getElementById('adminFormCancel');
  var formTitle = document.getElementById('adminFormTitle');
  var pf = {
    id: document.getElementById('pf-id'),
    title: document.getElementById('pf-title'),
    discipline: document.getElementById('pf-discipline'),
    slug: document.getElementById('pf-slug'),
    date: document.getElementById('pf-date'),
    summary: document.getElementById('pf-summary'),
    body: document.getElementById('pf-body'),
    cover: document.getElementById('pf-cover'),
    coverHint: document.getElementById('pf-cover-hint'),
    gallery: document.getElementById('pf-gallery'),
    galleryHint: document.getElementById('pf-gallery-hint'),
    published: document.getElementById('pf-published'),
    status: document.getElementById('pf-status'),
    saveBtn: document.getElementById('pf-save')
  };
  var editingCoverPath = '', editingGalleryPaths = [];

  function openForm (p) {
    dashSection.hidden = true; formSection.hidden = false;
    formTitle.textContent = p ? 'Edit project' : 'New project';
    pf.id.value = p ? p.id : '';
    pf.title.value = p ? p.title : '';
    pf.discipline.value = p ? p.discipline : 'General';
    pf.slug.value = p ? p.slug : '';
    pf.date.value = p && p.project_date ? p.project_date : new Date().toISOString().slice(0, 10);
    pf.summary.value = p ? p.summary : '';
    pf.body.value = p ? p.body : '';
    pf.published.checked = p ? !!p.published : true;
    pf.cover.value = ''; pf.gallery.value = '';
    editingCoverPath = p ? p.cover_path : '';
    editingGalleryPaths = (p && Array.isArray(p.gallery)) ? p.gallery.slice() : [];
    pf.coverHint.textContent = editingCoverPath ? 'Current: ' + editingCoverPath.split('/').pop() : 'No file chosen';
    pf.galleryHint.textContent = editingGalleryPaths.length ? editingGalleryPaths.length + ' existing photo(s) — new files add to these' : 'No files chosen';
    pf.status.textContent = '';
    pf.title.focus();
  }
  newBtn.addEventListener('click', function () { openForm(null); });
  cancelBtn.addEventListener('click', function () { formSection.hidden = true; dashSection.hidden = false; });
  pf.title.addEventListener('input', function () { if (!pf.id.value) pf.slug.value = slugify(pf.title.value); });

  /* Phone photos arrive at 3–5 MB; shrink to 1600px on the long edge and
     re-encode (WebP where the browser can, JPEG otherwise) before upload. */
  var MAX_EDGE = 1600;
  function shrink (file) {
    if (!window.createImageBitmap || !/^image\/(jpeg|png|webp)$/i.test(file.type)) return Promise.resolve(file);
    return createImageBitmap(file, { imageOrientation: 'from-image' }).then(function (bmp) {
      var scale = Math.min(1, MAX_EDGE / Math.max(bmp.width, bmp.height));
      var canvas = document.createElement('canvas');
      canvas.width = Math.round(bmp.width * scale);
      canvas.height = Math.round(bmp.height * scale);
      canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height);
      if (bmp.close) bmp.close();
      return new Promise(function (resolve) {
        canvas.toBlob(function (webp) {
          if (webp && webp.type === 'image/webp') { resolve(webp); return; }
          canvas.toBlob(function (jpeg) { resolve(jpeg || file); }, 'image/jpeg', 0.82);
        }, 'image/webp', 0.8);
      });
    }).catch(function () { return file; });
  }

  function uploadFile (file) {
    return shrink(file).then(function (blob) {
      return fetch('/api/admin/upload', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': blob.type || file.type }, body: blob });
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (res.status === 401) showLoggedOut();
        if (!res.ok) throw new Error(data.error || ('Upload failed (' + res.status + ')'));
        return data.path;
      });
    });
  }

  document.getElementById('adminProjectForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var coverFile = pf.cover.files[0];
    var galleryFiles = Array.prototype.slice.call(pf.gallery.files);

    if (!coverFile && !editingCoverPath) { pf.status.textContent = 'A cover photo is required.'; return; }

    pf.status.textContent = (coverFile || galleryFiles.length) ? 'Uploading photos…' : 'Saving…';
    pf.saveBtn.disabled = true;

    var coverUpload = coverFile ? uploadFile(coverFile) : Promise.resolve(editingCoverPath);
    var galleryUpload = galleryFiles.length
      ? Promise.all(galleryFiles.map(uploadFile)).then(function (paths) { return editingGalleryPaths.concat(paths); })
      : Promise.resolve(editingGalleryPaths);

    Promise.all([coverUpload, galleryUpload]).then(function (results) {
      pf.status.textContent = 'Saving…';
      var row = {
        title: pf.title.value.trim(),
        slug: slugify(pf.slug.value || pf.title.value),
        project_date: pf.date.value || new Date().toISOString().slice(0, 10),
        discipline: pf.discipline.value,
        summary: pf.summary.value.trim(),
        body: pf.body.value.trim(),
        cover_path: results[0],
        gallery: results[1],
        published: pf.published.checked
      };
      return pf.id.value
        ? api('PUT', '/api/admin/projects/' + encodeURIComponent(pf.id.value), row)
        : api('POST', '/api/admin/projects', row);
    }).then(function () {
      pf.saveBtn.disabled = false;
      formSection.hidden = true; dashSection.hidden = false;
      loadList();
    }).catch(function (err) {
      pf.status.textContent = 'Error: ' + err.message;
      pf.saveBtn.disabled = false;
    });
  });
})();
