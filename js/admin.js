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
    document.body.classList.remove('admin-checking');
    document.body.classList.add('admin-out');
    loginSection.hidden = false; dashSection.hidden = true; formSection.hidden = true;
    whoEl.hidden = true; signOutBtn.hidden = true;
  }
  function showLoggedIn (email) {
    document.body.classList.remove('admin-checking', 'admin-out');
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
    var label = btn.innerHTML;
    btn.disabled = true; btn.textContent = 'Signing in…';
    api('POST', '/api/admin/login', {
      username: document.getElementById('al-email').value.trim(),
      password: document.getElementById('al-pass').value
    }).then(function (me) {
      document.getElementById('al-pass').value = '';
      showLoggedIn(me.email);
    }, function (err) {
      loginError.textContent = err.message; loginError.hidden = false;
    }).then(function () { btn.disabled = false; btn.innerHTML = label; });
  });
  /* show / hide password, and warn when Caps Lock is on */
  var passInput = document.getElementById('al-pass');
  var eye = document.getElementById('alEye');
  var caps = document.getElementById('alCaps');
  if (eye) eye.addEventListener('click', function () {
    var show = passInput.type === 'password';
    passInput.type = show ? 'text' : 'password';
    eye.textContent = show ? 'Hide' : 'Show';
    eye.setAttribute('aria-pressed', String(show));
    passInput.focus();
  });
  ['keydown', 'keyup'].forEach(function (evt) {
    passInput.addEventListener(evt, function (e) {
      if (caps && e.getModifierState) caps.hidden = !e.getModifierState('CapsLock');
    });
  });
  passInput.addEventListener('blur', function () { if (caps) caps.hidden = true; });

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

  /* ===== FORM (create / edit) =====
     One description box, one photo list (first photo is the cover), and two
     buttons that decide whether the post is public. The web address comes
     from the title, and the card text from the description's first sentence. */
  var newBtn = document.getElementById('adminNew');
  var cancelBtn = document.getElementById('adminFormCancel');
  var formTitle = document.getElementById('adminFormTitle');
  var form = document.getElementById('adminProjectForm');
  var pf = {
    title: document.getElementById('pf-title'),
    body: document.getElementById('pf-body'),
    date: document.getElementById('pf-date'),
    files: document.getElementById('pf-files'),
    drop: document.getElementById('pf-drop'),
    thumbs: document.getElementById('pf-thumbs'),
    status: document.getElementById('pf-status'),
    saveBtn: document.getElementById('pf-save'),
    draftBtn: document.getElementById('pf-draft')
  };
  var editing = null;   // the post being edited, or null for a new one
  var photos = [];      // { path } for stored photos, { file, url } for new ones

  function today () { return new Date().toISOString().slice(0, 10); }

  function setDiscipline (value) {
    var radios = form.querySelectorAll('input[name=discipline]');
    var match = false;
    Array.prototype.forEach.call(radios, function (r) { r.checked = r.value === value; if (r.checked) match = true; });
    if (!match) form.querySelector('input[name=discipline][value="General"]').checked = true;
  }
  function getDiscipline () {
    var r = form.querySelector('input[name=discipline]:checked');
    return r ? r.value : 'General';
  }

  function showErr (name, on) {
    var el = form.querySelector('[data-err="' + name + '"]');
    if (el) el.hidden = !on;
  }

  function openForm (p) {
    editing = p || null;
    dashSection.hidden = true; formSection.hidden = false;
    formTitle.textContent = p ? 'Edit project' : 'New project';
    pf.title.value = p ? p.title : '';
    pf.body.value = p ? (p.body || p.summary || '') : '';
    pf.date.value = p && p.project_date ? p.project_date : today();
    setDiscipline(p ? p.discipline : 'General');
    photos.forEach(function (ph) { if (ph.url) URL.revokeObjectURL(ph.url); });
    photos = p ? [p.cover_path].concat(Array.isArray(p.gallery) ? p.gallery : []).filter(Boolean).map(function (path) { return { path: path }; }) : [];
    renderThumbs();
    pf.saveBtn.textContent = p && p.published ? 'Save changes' : 'Publish';
    pf.draftBtn.textContent = p && p.published ? 'Move to drafts' : 'Save as draft';
    pf.status.textContent = '';
    ['title', 'body', 'photos'].forEach(function (n) { showErr(n, false); });
    window.scrollTo(0, 0);
    pf.title.focus();
  }
  pf.title.addEventListener('input', function () { if (pf.title.value.trim()) showErr('title', false); });
  pf.body.addEventListener('input', function () { if (pf.body.value.trim()) showErr('body', false); });
  function closeForm () { formSection.hidden = true; dashSection.hidden = false; }
  newBtn.addEventListener('click', function () { openForm(null); });
  cancelBtn.addEventListener('click', closeForm);

  /* ---- photos ---- */
  function addFiles (fileList) {
    Array.prototype.forEach.call(fileList || [], function (file) {
      if (!/^image\//.test(file.type)) return;
      photos.push({ file: file, url: URL.createObjectURL(file) });
    });
    renderThumbs();
    if (photos.length) showErr('photos', false);
  }
  function renderThumbs () {
    pf.thumbs.innerHTML = photos.map(function (ph, i) {
      var src = ph.url || img(ph.path, 240);
      return '<li class="pf-thumb' + (i === 0 ? ' is-cover' : '') + '">' +
        '<div class="pf-thumb-img" style="background-image:url(\'' + String(src).replace(/'/g, '%27') + '\')"></div>' +
        (i === 0 ? '<span class="pf-cover-tag">Cover</span>' : '<button type="button" class="pf-make-cover" data-i="' + i + '">Make cover</button>') +
        '<button type="button" class="pf-remove" data-i="' + i + '" aria-label="Remove photo ' + (i + 1) + '">&times;</button>' +
      '</li>';
    }).join('');
  }
  pf.thumbs.addEventListener('click', function (e) {
    var btn = e.target.closest('button');
    if (!btn) return;
    var i = Number(btn.getAttribute('data-i'));
    if (btn.classList.contains('pf-remove')) {
      var gone = photos.splice(i, 1)[0];
      if (gone && gone.url) URL.revokeObjectURL(gone.url);
    } else if (btn.classList.contains('pf-make-cover')) {
      photos.unshift(photos.splice(i, 1)[0]);
    }
    renderThumbs();
  });
  pf.files.addEventListener('change', function () { addFiles(pf.files.files); pf.files.value = ''; });
  ['dragenter', 'dragover'].forEach(function (evt) {
    pf.drop.addEventListener(evt, function (e) { e.preventDefault(); pf.drop.classList.add('is-over'); });
  });
  ['dragleave', 'drop'].forEach(function (evt) {
    pf.drop.addEventListener(evt, function (e) { e.preventDefault(); pf.drop.classList.remove('is-over'); });
  });
  pf.drop.addEventListener('drop', function (e) { addFiles(e.dataTransfer && e.dataTransfer.files); });

  /* The post's web address comes from its title. An existing post keeps its
     address when edited, so links to it never break; a new post whose title
     matches another post's address gets -2, -3, ... added. */
  function uniqueSlug (title) {
    var base = slugify(title) || 'project';
    var taken = currentRows.map(function (r) { return r.slug; });
    var slug = base, n = 2;
    while (taken.indexOf(slug) !== -1) slug = base + '-' + n++;
    return slug;
  }

  /* Card text: the description's first sentence, trimmed to fit a card. */
  function cardText (text) {
    var first = String(text).trim().split(/(?<=[.!?])\s+/)[0] || '';
    if (first.length <= 200) return first;
    return first.slice(0, 197).replace(/\s+\S*$/, '') + '…';
  }

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

  /* Uploads new photos one at a time so the status can count them. */
  function uploadPending () {
    var pending = photos.filter(function (ph) { return ph.file && !ph.path; });
    var done = 0;
    return pending.reduce(function (chain, ph) {
      return chain.then(function () {
        pf.status.textContent = 'Uploading photo ' + (done + 1) + ' of ' + pending.length + '…';
        return uploadFile(ph.file).then(function (path) { ph.path = path; done++; });
      });
    }, Promise.resolve());
  }

  /* which button sent the form (e.submitter isn't available on older iPhones) */
  var publishIntent = true;
  pf.saveBtn.addEventListener('click', function () { publishIntent = true; });
  pf.draftBtn.addEventListener('click', function () { publishIntent = false; });

  function setBusy (busy) { pf.saveBtn.disabled = busy; pf.draftBtn.disabled = busy; }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var publish = publishIntent;
    publishIntent = true; // Enter in a field means the main button
    var title = pf.title.value.trim();
    var body = pf.body.value.trim();
    showErr('title', !title); showErr('body', !body); showErr('photos', !photos.length);
    if (!title || !body || !photos.length) {
      var firstBad = form.querySelector('.pf-err:not([hidden])');
      if (firstBad) firstBad.parentNode.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setBusy(true);
    uploadPending().then(function () {
      pf.status.textContent = 'Saving…';
      var original = editing ? (editing.body || editing.summary || '') : null;
      var row = {
        title: title,
        slug: editing ? editing.slug : uniqueSlug(title),
        project_date: pf.date.value || today(),
        discipline: getDiscipline(),
        // keep a hand-written card text on older posts unless the description changed
        summary: editing && body === original.trim() && editing.summary ? editing.summary : cardText(body),
        body: body,
        cover_path: photos[0].path,
        gallery: photos.slice(1).map(function (ph) { return ph.path; }),
        published: publish
      };
      return editing
        ? api('PUT', '/api/admin/projects/' + encodeURIComponent(editing.id), row)
        : api('POST', '/api/admin/projects', row);
    }).then(function () {
      setBusy(false);
      closeForm();
      loadList();
    }).catch(function (err) {
      pf.status.textContent = 'Could not save: ' + err.message;
      setBusy(false);
    });
  });
})();
