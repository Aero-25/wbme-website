/* WBME Admin — Supabase Auth login + project post CRUD.
   Only reachable pages need a valid, signed-in Supabase Auth user to write;
   Row Level Security on the "projects" table and "WBME" storage bucket is
   what actually enforces that (see supabase/schema.sql), not this page's URL. */
(function () {
  'use strict';
  var sb = window.WBME_SUPABASE;

  var loginSection = document.getElementById('adminLogin');
  var dashSection = document.getElementById('adminDash');
  var formSection = document.getElementById('adminForm');
  var whoEl = document.getElementById('adminWho');
  var signOutBtn = document.getElementById('adminSignOut');

  if (!sb) {
    loginSection.innerHTML = '<div class="admin-login-card"><span class="eyebrow">Admin</span><h1>Not connected</h1><p>Add your Supabase project details in <code>js/supabase-client.js</code> and run <code>supabase/schema.sql</code> to enable admin access.</p></div>';
    return;
  }

  function esc (s) {
    var d = document.createElement('div');
    d.textContent = s || '';
    return d.innerHTML;
  }
  function img (path, width) {
    return window.WBME_BUCKET_IMAGE ? window.WBME_BUCKET_IMAGE(path, { width: width || 240, quality: 68, resize: 'cover' }) : '';
  }
  function slugify (s) {
    return String(s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-+|-+$)/g, '');
  }

  function showLoggedOut () {
    loginSection.hidden = false; dashSection.hidden = true; formSection.hidden = true;
    whoEl.hidden = true; signOutBtn.hidden = true;
  }
  function showLoggedIn (session) {
    loginSection.hidden = true; formSection.hidden = true; dashSection.hidden = false;
    whoEl.hidden = false; whoEl.textContent = session.user.email;
    signOutBtn.hidden = false;
    loadList();
  }

  sb.auth.getSession().then(function (res) {
    if (res.data && res.data.session) showLoggedIn(res.data.session); else showLoggedOut();
  });
  sb.auth.onAuthStateChange(function (_event, session) {
    if (session) showLoggedIn(session); else showLoggedOut();
  });

  var loginForm = document.getElementById('adminLoginForm');
  var loginError = document.getElementById('adminLoginError');
  loginForm.addEventListener('submit', function (e) {
    e.preventDefault();
    loginError.hidden = true;
    var email = document.getElementById('al-email').value.trim();
    var pass = document.getElementById('al-pass').value;
    sb.auth.signInWithPassword({ email: email, password: pass }).then(function (res) {
      if (res.error) { loginError.textContent = res.error.message; loginError.hidden = false; }
    });
  });
  signOutBtn.addEventListener('click', function () { sb.auth.signOut(); });

  /* ===== LIST ===== */
  var listEl = document.getElementById('adminList');
  var statsEl = document.getElementById('adminStats');
  var currentRows = [];

  function loadList () {
    listEl.innerHTML = '<p class="admin-empty">Loading&hellip;</p>';
    sb.from('projects').select('*').order('project_date', { ascending: false }).order('created_at', { ascending: false }).then(function (res) {
      if (res.error) { listEl.innerHTML = '<p class="admin-empty">Could not load projects: ' + esc(res.error.message) + '</p>'; return; }
      currentRows = res.data || [];
      renderStats(currentRows);
      renderList(currentRows);
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
      return '<div class="admin-row" data-id="' + p.id + '">' +
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
        sb.from('projects').delete().eq('id', id).then(function (res) {
          if (res.error) { window.alert('Delete failed: ' + res.error.message); return; }
          loadList();
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

  function uploadFile (file) {
    var ext = (file.name.match(/\.[a-z0-9]+$/i) || [''])[0];
    var path = 'admin-uploads/' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + ext;
    return sb.storage.from('WBME').upload(path, file, { upsert: false }).then(function (res) {
      if (res.error) throw res.error;
      return path;
    });
  }

  document.getElementById('adminProjectForm').addEventListener('submit', function (e) {
    e.preventDefault();
    pf.status.textContent = 'Saving…';
    pf.saveBtn.disabled = true;

    var coverFile = pf.cover.files[0];
    var galleryFiles = Array.prototype.slice.call(pf.gallery.files);

    if (!coverFile && !editingCoverPath) {
      pf.status.textContent = 'A cover photo is required.';
      pf.saveBtn.disabled = false;
      return;
    }

    var coverUpload = coverFile ? uploadFile(coverFile) : Promise.resolve(editingCoverPath);
    var galleryUpload = galleryFiles.length
      ? Promise.all(galleryFiles.map(uploadFile)).then(function (paths) { return editingGalleryPaths.concat(paths); })
      : Promise.resolve(editingGalleryPaths);

    Promise.all([coverUpload, galleryUpload]).then(function (results) {
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
        ? sb.from('projects').update(row).eq('id', pf.id.value)
        : sb.from('projects').insert(row);
    }).then(function (res) {
      if (res.error) { pf.status.textContent = 'Error: ' + res.error.message; pf.saveBtn.disabled = false; return; }
      pf.saveBtn.disabled = false;
      formSection.hidden = true; dashSection.hidden = false;
      loadList();
    }).catch(function (err) {
      pf.status.textContent = 'Upload failed: ' + (err && err.message ? err.message : err);
      pf.saveBtn.disabled = false;
    });
  });
})();
