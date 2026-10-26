/* WBME Assistant v4: a conversational assistant for the workshop.

   Two brains, one voice:
   - AI replies stream from /api/chat (Pages Function -> Claude) when the
     site has an API key set.
   - An offline brain in this file answers when the AI is unavailable: fuzzy
     matching, follow-up context, the visitor's name, live open/closed status
     and a guided enquiry flow.
   Both speak the same reply format: text with **bold**, "- " lists and
   [[markers]] at the end that become buttons and suggested replies.

   The conversation lives in sessionStorage, so it carries across pages, and
   the assistant can take the visitor to a page and pick up again there. */
(function () {
  'use strict';

  var box = document.getElementById('chatbot');
  var fab = document.getElementById('chatbotFab');
  var log = document.getElementById('cbLog');
  var chipsEl = document.getElementById('cbChips');
  var form = document.getElementById('cbForm');
  var input = document.getElementById('cbInput');
  var sendBtn = document.getElementById('cbSend');
  var closeBtn = document.getElementById('chatbotClose');
  var newBtn = document.getElementById('cbNew');
  var statusText = document.getElementById('cbStatusText');
  var statusEl = document.getElementById('cbStatus');
  var announce = document.getElementById('cbAnnounce');
  var teaser = document.getElementById('cbTeaser');
  if (!box || !fab || !log || !form || !input) return;

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var PAGE = (document.body.getAttribute('data-page') || 'home').toLowerCase();
  var PHONE_DISPLAY = '+264 (0)64 285 700';
  var PHONE_TEL = 'tel:+26464285700';
  var ADDRESS = '8th Street East, Industrial Area, Walvis Bay';
  var MAPS_URL = 'https://www.google.com/maps?q=8th+Street+East,+Industrial+Area,+Walvis+Bay,+Namibia';
  var PAGE_URL = { home: 'index.html', about: 'about.html', services: 'services.html', projects: 'projects.html', contact: 'contact.html' };
  var PAGE_NAME = { home: 'Home', about: 'About', services: 'Services', projects: 'Projects', contact: 'Contact' };
  var STORE_KEY = 'wbme:assistant:v4';
  var MAX_MSGS = 80;

  function email () { return window.WBME_EMAIL || ['info', 'wbme.com.na'].join('@'); }

  /* ===================================================================
     helpers
     =================================================================== */
  function el (tag, cls, html) { var n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; }
  function esc (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function pick (list, avoid) {
    if (list.length < 2) return list[0];
    var i, tries = 0;
    do { i = Math.floor(Math.random() * list.length); } while (list[i] === avoid && ++tries < 6);
    return list[i];
  }
  function cap (s) { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); }
  function uid () {
    var a = new Uint8Array(12);
    (window.crypto || window.msCrypto).getRandomValues(a);
    return Array.prototype.map.call(a, function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
  }

  /* reply text -> safe HTML: **bold**, "- " lists, line breaks, phone/email links */
  function fmt (text) {
    var t = String(text || '');
    var stars = t.split('**').length - 1;
    if (stars % 2) { var at = t.lastIndexOf('**'); t = t.slice(0, at) + t.slice(at + 2); }
    var lines = esc(t).split('\n');
    var html = '', inList = false;
    lines.forEach(function (line) {
      var m = line.match(/^\s*(?:[-•·*]|\d+[.)])\s+(.*)$/);
      if (m) {
        if (!inList) { html += '<ul>'; inList = true; }
        html += '<li>' + m[1] + '</li>';
        return;
      }
      if (inList) { html += '</ul>'; inList = false; }
      if (line.trim()) html += '<p>' + line + '</p>';
    });
    if (inList) html += '</ul>';
    html = html.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
    /* [label](link) to the site's own pages, email or phone only */
    html = html.replace(/\[([^\]]{1,60})\]\(((?:index|about|services|projects|contact)\.html[^\s)]*|mailto:[^\s)]+|tel:[^\s)]+|https:\/\/www\.wbme\.com\.na[^\s)]*)\)/g, '<a href="$2">$1</a>');
    /* phone numbers and the workshop email become links, outside existing links */
    var inLink = false;
    return html.split(/(<[^>]+>)/).map(function (part) {
      if (part.charAt(0) === '<') { if (/^<a\b/i.test(part)) inLink = true; else if (/^<\/a>/i.test(part)) inLink = false; return part; }
      if (inLink) return part;
      return part
        .replace(/(\+264[\d\s()]{8,16}\d)/g, function (n) { return '<a href="' + PHONE_TEL + '">' + n + '</a>'; })
        .replace(/\b(info@wbme\.com\.na)\b/g, '<a href="mailto:$1">$1</a>');
    }).join('');
  }

  /* split a raw reply into what's shown and its [[markers]] */
  var MARK_RE = /\[\[\s*([a-z]+)\s*(?::\s*([^\]]*))?\]\]/gi;
  function parseReply (raw) {
    var acts = [], chips = [], go = null;
    var text = String(raw || '').replace(MARK_RE, function (_, kind, arg) {
      kind = kind.toLowerCase(); arg = (arg || '').trim();
      if (kind === 'chips') chips = arg.split('|').map(function (c) { return c.trim(); }).filter(Boolean).slice(0, 3);
      else if (kind === 'go' && PAGE_URL[arg.toLowerCase()]) go = arg.toLowerCase();
      else if (kind === 'page' && PAGE_URL[arg.toLowerCase()]) acts.push(['page', arg.toLowerCase()]);
      else if (kind === 'call' || kind === 'email' || kind === 'map') acts.push([kind]);
      return '';
    });
    return { text: text.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim(), acts: acts.slice(0, 3), chips: chips, go: go };
  }
  /* while streaming: hide markers, and hold back a half-received one */
  function visiblePart (raw) {
    var s = String(raw || '').replace(MARK_RE, '');
    var open = s.lastIndexOf('[[');
    if (open !== -1 && s.indexOf(']]', open) === -1) s = s.slice(0, open);
    else if (/\[$/.test(s)) s = s.slice(0, -1);
    return s.replace(/\s+$/, function (w) { return w.indexOf('\n') !== -1 ? '\n' : w; });
  }

  /* ===================================================================
     the workshop clock (Namibian time)
     =================================================================== */
  function workshopNow () {
    var d = new Date(), day, h, m;
    try {
      var parts = {};
      new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Windhoek', weekday: 'long', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
        .formatToParts(d).forEach(function (p) { parts[p.type] = p.value; });
      day = parts.weekday; h = +parts.hour; m = +parts.minute;
    } catch (err) {
      var u = new Date(d.getTime() + 2 * 3600e3);
      day = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][u.getUTCDay()]; h = u.getUTCHours(); m = u.getUTCMinutes();
    }
    var mins = h * 60 + m, weekday = day !== 'Saturday' && day !== 'Sunday';
    var open = weekday && mins >= 420 && mins < 1020;
    var s = { day: day, hour: h, open: open, onCall: day === 'Sunday' };
    if (open) { s.badge = 'Workshop open · until 17:00'; s.line = 'The workshop is open right now, until 17:00.'; }
    else if (weekday && mins < 420) { s.badge = 'Opens today at 07:00'; s.line = 'The workshop opens at 07:00 this morning.'; }
    else if (day === 'Sunday') { s.badge = 'Sunday · on call for urgent work'; s.line = "It's Sunday, so the workshop is on call for urgent work by phone and opens Monday at 07:00."; }
    else if (day === 'Saturday') { s.badge = 'Closed today · Sabbath'; s.line = "It's Saturday, the Sabbath, so the workshop is closed. It's on call tomorrow for urgent work and opens Monday at 07:00."; }
    else if (day === 'Friday') { s.badge = 'Closed · opens Monday 07:00'; s.line = 'The workshop has closed for the week. Sunday it is on call for urgent work, and Monday it opens at 07:00.'; }
    else { s.badge = 'Closed · opens 07:00 tomorrow'; s.line = 'The workshop has closed for the day and opens at 07:00 tomorrow.'; }
    s.greet = h < 12 ? 'Good morning' : (h < 17 ? 'Good afternoon' : 'Good evening');
    return s;
  }
  function paintStatus () {
    if (!statusText) return;
    var s = workshopNow();
    statusText.textContent = s.badge;
    if (statusEl) statusEl.classList.toggle('is-open', s.open);
  }

  /* ===================================================================
     state (sessionStorage, so the chat follows the visitor across pages)
     =================================================================== */
  var state = load();
  function fresh () { return { sid: uid(), msgs: [], name: '', topic: '', lastJob: '', flow: null, used: {}, aiOffUntil: 0, teased: false, arrive: '', reopen: false }; }
  function load () {
    try {
      var s = JSON.parse(sessionStorage.getItem(STORE_KEY) || 'null');
      if (s && s.sid && Array.isArray(s.msgs)) { var f = fresh(); for (var k in f) if (!(k in s)) s[k] = f[k]; return s; }
    } catch (err) {}
    return fresh();
  }
  var saveTimer = 0;
  function save () {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      if (state.msgs.length > MAX_MSGS) state.msgs = state.msgs.slice(-MAX_MSGS);
      try { sessionStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (err) {}
    }, 60);
  }
  function saveNow () { clearTimeout(saveTimer); try { sessionStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (err) {} }

  /* ===================================================================
     rendering
     =================================================================== */
  var lastStamp = 0;
  function nearBottom () { return log.scrollHeight - log.scrollTop - log.clientHeight < 80; }
  function scrollEnd (force) { if (force || nearBottom()) log.scrollTop = log.scrollHeight; }
  /* keep the newest message in view if the visitor was already at the bottom:
     measure before the change (a card or chips can grow things by far more than
     the threshold), scroll after */
  function stick (change) { var at = nearBottom(); change(); if (at) log.scrollTop = log.scrollHeight; }
  function stamp (t) {
    if (t - lastStamp < 10 * 60e3) return;
    lastStamp = t;
    var d = new Date(t);
    var label = (new Date().toDateString() === d.toDateString() ? 'Today' : d.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })) +
      ' · ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    log.appendChild(el('div', 'cb-time', esc(label)));
  }
  var ACT_LABEL = {
    call: function () { return 'Call ' + PHONE_DISPLAY; },
    email: function () { return 'Email the workshop'; },
    map: function () { return 'Get directions'; },
    page: function (a) { return 'Open ' + PAGE_NAME[a]; }
  };
  function actsHtml (acts) {
    if (!acts || !acts.length) return '';
    return '<div class="cb-acts">' + acts.map(function (a) {
      return '<button type="button" class="cb-act" data-act="' + a[0] + '"' + (a[1] ? ' data-arg="' + esc(a[1]) + '"' : '') + '>' + esc(ACT_LABEL[a[0]](a[1])) + '</button>';
    }).join('') + '</div>';
  }
  function renderUser (m) {
    stamp(m.t);
    var n = el('div', 'cb-m user'); n.textContent = m.text;
    log.appendChild(n);
    return n;
  }
  function renderBot (m) {
    stamp(m.t);
    var p = parseReply(m.raw);
    var n = el('div', 'cb-m bot', fmt(p.text) + actsHtml(p.acts));
    log.appendChild(n);
    return n;
  }
  var URG_LABEL = { urgent: 'Urgent', 'this week': 'This week', planned: 'Planned', 'just asking': 'Just asking' };
  function renderCard (m) {
    var e = m.card, rows = [];
    function row (k, v) { if (v) rows.push('<dt>' + k + '</dt><dd>' + esc(v) + '</dd>'); }
    row('Name', e.name + (e.company ? ', ' + e.company : ''));
    row('Phone', e.phone); row('Email', e.email);
    row('Vessel / site', e.vessel || e.vessel_or_site);
    row('Work', e.service && e.service !== 'General' ? e.service : '');
    row('Urgency', URG_LABEL[e.urgency] || '');
    row('Job', e.job);
    var n = el('div', 'cb-card',
      '<div class="cb-card-head"><span>Enquiry for the WBME team</span>' + (e.ref ? '<b>' + esc(e.ref) + '</b>' : '') + '</div>' +
      '<dl>' + rows.join('') + '</dl>' +
      '<div class="cb-acts"><button type="button" class="cb-act is-primary" data-act="mailcard" data-id="' + esc(m.id) + '">Email this to WBME</button>' +
      '<button type="button" class="cb-act" data-act="call">Call the workshop</button></div>');
    log.appendChild(n);
    return n;
  }
  function renderMsg (m) {
    if (m.role === 'user') return renderUser(m);
    if (m.role === 'card') return renderCard(m);
    return renderBot(m);
  }
  function renderAll () {
    log.innerHTML = ''; lastStamp = 0;
    state.msgs.forEach(renderMsg);
    var last = state.msgs[state.msgs.length - 1];
    setChips(last && last.role === 'bot' ? parseReply(last.raw).chips : []);
    scrollEnd(true);
  }
  function setChips (list) { stick(function () { fillChips(list); }); }
  function fillChips (list) {
    chipsEl.innerHTML = '';
    (list || []).forEach(function (c) {
      var b = el('button', 'cb-chip', esc(c)); b.type = 'button';
      b.addEventListener('click', function () {
        /* the chip is about to disappear: keep keyboard focus inside the chat */
        if (!window.matchMedia('(pointer: coarse)').matches) input.focus({ preventScroll: true });
        send(c);
      });
      chipsEl.appendChild(b);
    });
    chipsEl.hidden = !(list && list.length);
  }
  function say (text) { if (announce) { announce.textContent = ''; setTimeout(function () { announce.textContent = text; }, 40); } }

  /* typing indicator */
  var typingEl = null;
  function showTyping () {
    if (typingEl) return;
    typingEl = el('div', 'cb-typing', '<i></i><i></i><i></i><span class="cb-sr-only">WBME assistant is typing</span>');
    log.appendChild(typingEl); scrollEnd();
  }
  function hideTyping () { if (typingEl && typingEl.parentNode) typingEl.parentNode.removeChild(typingEl); typingEl = null; }

  /* A bot message being written: text arrives in pieces (AI stream) or all at
     once (offline brain) and is revealed at a natural reading pace. */
  function Writer () {
    this.raw = ''; this.shown = 0; this.node = null; this.done = false; this.frame = 0; this.onIdle = null; this.started = 0;
  }
  Writer.prototype.add = function (piece) { this.raw += piece; this.kick(); };
  Writer.prototype.kick = function () {
    var self = this;
    if (this.frame) return;
    this.frame = requestAnimationFrame(function () { self.frame = 0; self.tick(); });
  };
  Writer.prototype.tick = function () {
    if (this.paused) return;
    var target = visiblePart(this.raw);
    if (!target && !this.done) return;
    if (!this.node) {
      hideTyping();
      this.node = el('div', 'cb-m bot is-writing');
      log.appendChild(this.node);
      this.started = performance.now();
    }
    var backlog = target.length - this.shown;
    if (reduce) this.shown = target.length;
    else if (backlog > 0) this.shown += Math.max(2, Math.ceil(backlog / 14));
    if (this.shown > target.length) this.shown = target.length;
    var slice = target.slice(0, this.shown);
    if (this.shown < target.length) slice = slice.replace(/\S*$/, '');
    var node = this.node;
    stick(function () { node.innerHTML = fmt(slice); });
    if (this.shown < target.length) this.kick();
    else if (this.done && this.onIdle) { var f = this.onIdle; this.onIdle = null; f(); }
  };
  Writer.prototype.finish = function (cb) {
    this.done = true; this.onIdle = cb; this.kick();
  };

  /* ===================================================================
     sending + replying
     =================================================================== */
  var busy = false;
  function setBusy (on) {
    busy = on;
    box.classList.toggle('is-busy', on);
    if (sendBtn) sendBtn.disabled = on;
  }

  function send (raw) {
    var q = String(raw == null ? input.value : raw).replace(/\s+/g, ' ').trim();
    if (!q || busy) return;
    input.value = ''; autosize();
    setChips([]);
    var m = { role: 'user', text: q.slice(0, 1500), t: Date.now() };
    state.msgs.push(m); save();
    renderUser(m); scrollEnd(true);
    respond(q);
  }

  function readDelay (q) { return reduce ? 0 : Math.min(900, 260 + q.length * 6) + Math.random() * 220; }

  function respond (q) {
    setBusy(true);
    var aiOn = Date.now() > (state.aiOffUntil || 0) && location.protocol !== 'file:';
    setTimeout(function () {
      showTyping();
      if (aiOn) askAI(q); else replyOffline(q);
    }, readDelay(q));
  }

  /* history for the AI: plain text both ways, markers kept on bot turns */
  function historyForAI () {
    var out = [];
    state.msgs.forEach(function (m) {
      if (m.role === 'user') out.push({ role: 'user', content: m.text });
      else if (m.role === 'bot' && !m.greeting) out.push({ role: 'assistant', content: m.raw });
      else if (m.role === 'card') out.push({ role: 'assistant', content: '(Enquiry card shown' + (m.card.ref ? ', reference ' + m.card.ref : '') + ')' });
    });
    return out.slice(-30);
  }

  function askAI (q) {
    var writer = new Writer(), gotText = false, failed = false, finished = false, cards = [];
    var ctrl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 70e3);

    /* seal a finished bubble: final formatting, buttons, saved to the chat */
    function seal (w, raw) {
      var p = parseReply(raw);
      if (w.node) {
        if (p.text || p.acts.length) { w.node.classList.remove('is-writing'); stick(function () { w.node.innerHTML = fmt(p.text) + actsHtml(p.acts); }); }
        else w.node.parentNode.removeChild(w.node);
      }
      hideTyping();
      if (p.text || p.acts.length) {
        state.msgs.push({ role: 'bot', raw: raw, t: Date.now(), via: 'ai' });
        say(p.text);
      }
      save(); scrollEnd();
      return p;
    }
    function finishMessage (next) {
      var w = writer;
      w.finish(function () { next(seal(w, w.raw)); });
    }
    function wrapUp () {
      if (finished) return; finished = true;
      clearTimeout(timer);
      if (failed && !gotText) {
        /* the AI is having trouble: answer offline and give it a few minutes */
        if (!state.aiOffUntil || state.aiOffUntil < Date.now()) { state.aiOffUntil = Date.now() + 3 * 60e3; save(); }
        hideTyping(); replyOffline(q); return;
      }
      finishMessage(function (p) {
        cards.forEach(function (c) { addCard(c); });
        setChips(p.chips);
        setBusy(false);
        if (p.go) goTo(p.go, 700);
      });
    }

    fetch('/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ messages: historyForAI(), page: PAGE, sid: state.sid }),
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (res) {
      var type = res.headers.get('content-type') || '';
      if (!res.ok || type.indexOf('text/event-stream') === -1 || !res.body) {
        /* no key yet, busy, or an old deploy: use the offline brain for a while */
        return res.json().catch(function () { return {}; }).then(function (j) {
          state.aiOffUntil = Date.now() + (j && j.reason === 'offline' ? 30 * 60e3 : 5 * 60e3); save();
          failed = true; wrapUp();
        });
      }
      var reader = res.body.getReader(), dec = new TextDecoder(), buf = '';
      function handle (event, data) {
        if (event === 'delta' && data.t) { gotText = true; writer.add(data.t); }
        else if (event === 'reset') { writer.raw = ''; writer.shown = 0; if (writer.node) writer.node.innerHTML = ''; }
        else if (event === 'enquiry') cards.push(data);
        else if (event === 'break') {
          /* the assistant sends a second message: finish this one (and any
             enquiry card) before the next one starts appearing */
          var prev = writer, next = new Writer();
          writer = next;
          if (prev.raw) {
            next.paused = true;
            prev.finish(function () {
              seal(prev, prev.raw);
              cards.splice(0).forEach(function (c) { addCard(c); });
              showTyping();
              next.paused = false; next.kick();
            });
          }
        } else if (event === 'error') { failed = true; }
      }
      function pump () {
        return reader.read().then(function (r) {
          if (r.done) { wrapUp(); return; }
          buf += dec.decode(r.value, { stream: true });
          var parts = buf.split('\n\n'); buf = parts.pop();
          parts.forEach(function (chunk) {
            var ev = 'message', data = '';
            chunk.split('\n').forEach(function (line) {
              if (line.indexOf('event:') === 0) ev = line.slice(6).trim();
              else if (line.indexOf('data:') === 0) data += line.slice(5).trim();
            });
            try { handle(ev, data ? JSON.parse(data) : {}); } catch (err) {}
          });
          return pump();
        });
      }
      return pump();
    }).catch(function () { failed = true; wrapUp(); });
  }

  function replyOffline (q) {
    var r;
    try { r = brain(q); } catch (err) { r = { raw: FALLBACK_TEXT() }; }
    var raw = r.raw;
    var wait = reduce ? 0 : Math.min(1500, 380 + visiblePart(raw).length * 7);
    showTyping();
    setTimeout(function () {
      var w = new Writer();
      w.add(raw);
      w.finish(function () {
        var p = parseReply(raw);
        if (w.node) { w.node.classList.remove('is-writing'); stick(function () { w.node.innerHTML = fmt(p.text) + actsHtml(p.acts); }); }
        state.msgs.push({ role: 'bot', raw: raw, t: Date.now(), via: 'offline' });
        save(); say(p.text);
        setChips(p.chips);
        if (r.after) r.after();
        else setBusy(false);
        if (p.go) goTo(p.go, 700);
      });
    }, wait);
  }

  function addBot (raw, extra) {
    var m = { role: 'bot', raw: raw, t: Date.now() };
    if (extra) for (var k in extra) m[k] = extra[k];
    state.msgs.push(m); save();
    stick(function () { renderBot(m); });
    setChips(parseReply(raw).chips);
    say(parseReply(raw).text);
    return m;
  }
  function addCard (data) {
    var m = { role: 'card', id: uid(), card: data, t: Date.now() };
    /* a corrected enquiry replaces its earlier card */
    if (data.ref) {
      state.msgs = state.msgs.filter(function (x) { return !(x.role === 'card' && x.card.ref === data.ref); });
      Array.prototype.forEach.call(log.querySelectorAll('.cb-card'), function (n) {
        var b = n.querySelector('.cb-card-head b');
        if (b && b.textContent === data.ref) n.parentNode.removeChild(n);
      });
    }
    state.msgs.push(m); save();
    stick(function () { renderCard(m); });
  }

  /* ===================================================================
     the offline brain
     =================================================================== */
  var SERVICES = {
    rigging: {
      name: 'Rigging', kw: ['rigging', 'rig', 'lift', 'lifting', 'crane', 'alternator', 'generator', 'compressor', 'motor', 'motors', 'engine', 'engines', 'install', 'installation', 'position', 'remove'],
      say: ['**Rigging** is usually the first job on any propulsion or plant repair: lifting, aligning and positioning propeller shafts, rudder shafts, engines, alternators, generators, compressors, pumps and motors. The team plans the lift around tight engine rooms and awkward access, because bad rigging throws off everything after it.',
        'WBME does the **rigging** for shafts, engines, generators, compressors, pumps and motors: getting them out, lined up and back in safely, even in a cramped engine room. It is treated as precision work, not a warm-up.']
    },
    fitting: {
      name: 'Fitting & Turning', kw: ['fitting', 'turning', 'machining', 'machine', 'machined', 'lathe', 'overhaul', 'overhauls', 'bush', 'bushes', 'bushing', 'thordon', 'liner', 'liners', 'seal', 'seals', 'bearing', 'bearings', 'sleeve', 'coupling', 'strip', 'tolerance'],
      say: ['**Fitting & turning** covers the full cycle: strip it down, machine new parts or repair the old ones to tolerance, then re-assemble and install. The machine shop turns things like new Thordon bushes, seal liners and shaft components to the exact size your vessel or plant needs.',
        'That sounds like **fitting & turning**. WBME strips, overhauls and machines parts in-house (bushes, seal liners, shaft components) and puts them back in to fit like the day they were built.']
    },
    boiler: {
      name: 'Boiler Making', kw: ['boiler', 'boilermaking', 'structural', 'structure', 'hull', 'deck', 'bridge', 'walkway', 'walkways', 'ladder', 'ladders', 'mast', 'masts', 'trawl', 'door', 'doors', 'gantry', 'gantries', 'frame', 'ducting', 'plate', 'plating', 'rudder'],
      say: ['**Boiler making** is the structural steel side: hull plate, deck, bridge, walkways, ladders, masts, trawl doors, gantries, A-frames and ducting. Renewals, modifications or complete new builds, in mild steel, stainless or aluminium.',
        'Structural steel like that is **boiler making**. WBME renews, modifies and builds new: hull plate, decks, masts, trawl doors, gantries and A-frames. A recent one was a complete ship\'s rudder built from raw plate.']
    },
    fabrication: {
      name: 'Fabrication', kw: ['fabrication', 'fabricate', 'fabricated', 'tank', 'tanks', 'dome', 'domes', 'burner', 'burners', 'dropper', 'skip', 'skips', 'base', 'rolling', 'roll', 'bending', 'bend', 'cutting', 'cut', 'profile', 'vessel', 'pressure', 'custom', 'build', 'make', 'manufacture'],
      say: ['**Fabrication** turns raw steel into what the job needs: domes, tanks, burners, condensers, skips, base plates and custom structures. Profile cutting, rolling and bending to spec, then installed in the workshop or on site.',
        'WBME can **fabricate** that. Cut, rolled, bent and built to spec, from stainless tanks to skips and base plates, then installed on site if you need it.']
    },
    pipe: {
      name: 'Pipe Works', kw: ['pipe', 'pipes', 'piping', 'pipework', 'pipeworks', 'manifold', 'manifolds', 'valve', 'valves', 'condenser', 'condensers', 'strainer', 'strainers', 'inlet', 'leak', 'leaking', 'copper', 'galvanized', 'galvanised', 'pump', 'pumps'],
      say: ['**Pipe works**: renewal, modification or completely new pipe runs, including the design, jigs and material prep. Pumps, manifolds, main engines, tanks, condensers, valves and sea water inlet strainers, in steel, copper or galvanized.',
        'Pipe work is a WBME trade. The team designs the run, builds the jigs and preps the steel, copper or galvanized pipe so it goes back in without a leak or a misaligned joint.']
    },
    welding: {
      name: 'Welding', kw: ['weld', 'welding', 'welder', 'welded', 'mig', 'tig', 'arc', 'brazing', 'braze', 'solder', 'soldering', 'cast', 'crack', 'cracked', 'cracks', 'strengthen', 'aluminium', 'aluminum'],
      say: ['**Welding** runs through almost every job: gas welding, brazing, silver soldering, MIG, TIG and arc, in mild steel, stainless, aluminium and cast iron. That includes strengthening and repairing existing structures and hulls.',
        'Yes, WBME welds mild steel, stainless, aluminium and even cast iron: MIG, TIG, arc, gas, brazing and silver soldering. Cracks and repairs to existing structures are everyday work.']
    }
  };
  var SHIP_KW = ['ship', 'vessel', 'boat', 'trawler', 'tug', 'propeller', 'prop', 'shaft', 'shafts', 'cpp', 'kort', 'nozzle', 'rudder', 'dock', 'drydock', 'repair', 'repairs', 'broken', 'broke', 'damaged', 'failed', 'worn'];

  var PROJECTS = [
    { title: 'Kort Nozzle & Shaft Conversion', slug: 'kort-nozzle-shaft-conversion', kind: 'ship repair', blurb: 'a vessel converted from a controllable-pitch propeller to a fixed shaft: removal, shaft alignment, kort nozzle fitting and reassembly to class-approved tolerances' },
    { title: 'New Complete Ship\'s Rudder', slug: 'new-complete-ships-rudder', kind: 'boiler making', blurb: 'a complete rudder built in-house from raw steel plate, cut, formed, welded and fitted to the vessel' },
    { title: 'Stainless Steel Tank', slug: 'stainless-steel-tank', kind: 'fabrication', blurb: 'a custom stainless tank for marine and industrial use, finished for corrosion resistance' },
    { title: 'Hull Plate Replacement', slug: 'hull-plate-replacement', kind: 'boiler making', blurb: 'corroded bottom hull plate cut out in dry dock and replaced with new class-approved plate, finished to survey standard' }
  ];
  /* the Projects page loads a fresher snapshot after this script; read it when asked */
  function projectList () {
    var snap = window.WBME_PROJECTS_SNAPSHOT;
    if (!snap || !snap.length) return PROJECTS;
    return snap.slice(0, 6).map(function (p) {
      return { title: p.title, slug: p.slug, kind: String(p.discipline || '').toLowerCase(), blurb: String(p.summary || '').replace(/\.$/, '').replace(/^./, function (c) { return c.toLowerCase(); }) };
    });
  }

  var SYN = { boat: 'vessel', boats: 'vessel', ship: 'vessel', ships: 'vessel', vessels: 'vessel', fix: 'repair', fixing: 'repair', fixed: 'repair', repairs: 'repair', repaired: 'repair', costs: 'cost', prices: 'price', pricing: 'price', quotes: 'quote', quotation: 'quote', quotations: 'quote', located: 'location', directions: 'direction', 'e-mail': 'email', numbers: 'number', propellor: 'propeller', propellers: 'propeller', aluminum: 'aluminium', galvanised: 'galvanized', u: 'you', ur: 'your', r: 'are', pls: 'please', plz: 'please', thx: 'thanks', ty: 'thanks' };
  var COMMON = {};
  'there where their these those other about would could should which while quite little people things thing string strong letter better before after again around always really nearly simple simply single'.split(' ').forEach(function (w) { COMMON[w] = 1; });
  function norm (s) { return String(s).toLowerCase().replace(/[’']/g, "'").replace(/[^\w\s@&'.+-]/g, ' ').replace(/\s+/g, ' ').trim(); }
  function tokens (s) { return norm(s).replace(/[.]/g, ' ').split(' ').filter(Boolean).map(function (w) { w = w.replace(/^'+|'+$/g, ''); return SYN[w] || w; }); }
  function lev (a, b) {
    if (Math.abs(a.length - b.length) > 2) return 9;
    var prev = [], cur, i, j;
    for (j = 0; j <= b.length; j++) prev[j] = j;
    for (i = 1; i <= a.length; i++) {
      cur = [i];
      for (j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
    return prev[b.length];
  }
  /* does the message contain this keyword (exact, as a word prefix, or a small typo)? */
  function has (toks, text, word) {
    if (word.indexOf(' ') !== -1) return text.indexOf(word) !== -1;
    for (var i = 0; i < toks.length; i++) {
      var t = toks[i];
      if (t === word) return true;
      if (word.length >= 5 && t.length > word.length && t.indexOf(word) === 0) return true;
      /* typos only on longer words, so "quite" never reads as "quote" */
      if (word.length >= 6 && t.length >= 5 && !COMMON[t] && lev(t, word) <= (word.length >= 9 ? 2 : 1)) return true;
    }
    return false;
  }
  function count (toks, text, list) { var n = 0; list.forEach(function (w) { if (has(toks, text, w)) n++; }); return n; }

  function serviceOf (toks, text) {
    var best = '', bestN = 0;
    Object.keys(SERVICES).forEach(function (k) {
      var n = count(toks, text, SERVICES[k].kw);
      if (has(toks, text, k === 'boiler' ? 'boiler' : SERVICES[k].name.toLowerCase().split(' ')[0])) n += 2;
      if (n > bestN) { bestN = n; best = k; }
    });
    return bestN ? best : '';
  }

  var NAME_STOP = /^(a|an|the|from|with|for|looking|interested|after|in|on|at|just|not|so|very|here|good|fine|okay|ok|well|sorry|trying|wondering|asking|calling|having|needing|urgent|busy|new|back|done|ready|sure|glad|happy|worried|afraid|stuck|currently|still|also|really|only|going|getting|working|the|your|our|my|and|or|but|to|of|it|that|this|what|when|how|why|who|you|we|they|he|she|is|was|be|been)$/i;
  var PARTICLE = /^(van|de|du|der|den|von|da|le|la)$/i;
  function nameWord (w) { return PARTICLE.test(w) ? w.toLowerCase() : cap(w.toLowerCase()); }
  function nameFrom (q) {
    var strong = q.match(/\b(?:my name is|my name's|name is|name's|call me)\s+([A-Za-zÀ-ÿ'-]{2,20})(?:\s+([A-Za-zÀ-ÿ'-]{2,20}))?/i);
    var weak = !strong && q.match(/\b(?:i am|i'm|im|this is)\s+([A-Za-zÀ-ÿ'-]{2,20})(?:\s+([A-Za-zÀ-ÿ'-]{2,20}))?/i);
    var m = strong || weak;
    if (!m || NAME_STOP.test(m[1])) return '';
    /* "I'm Pieter" counts; "I'm worried about the shaft" doesn't */
    if (weak && !/^[A-ZÀ-Ý]/.test(m[1]) && tokens(q).length > 4) return '';
    var name = nameWord(m[1]);
    if (m[2] && !NAME_STOP.test(m[2]) && /^[A-ZÀ-Ý]/.test(m[2])) name += ' ' + nameWord(m[2]);
    return name;
  }
  function emailFrom (q) { var m = q.match(/[^\s@<>()]+@[^\s@<>()]+\.[A-Za-z]{2,}/); return m ? m[0].replace(/[.,;]$/, '') : ''; }
  function phoneFrom (q) { var m = q.match(/(\+?\d[\d\s()-]{6,18}\d)/); return m && m[1].replace(/\D/g, '').length >= 7 ? m[1].trim() : ''; }
  function urgencyFrom (text) {
    if (/\b(urgent|asap|emergency|right now|immediately|today|down now|stuck|in dock|drydock|dry dock|broken down|broke down)\b/.test(text)) return 'urgent';
    if (/\b(this week|tomorrow|few days|next few days|soon)\b/.test(text)) return 'this week';
    if (/\b(planning|planned|next month|no rush|not urgent|later|budget|in future|future)\b/.test(text)) return 'planned';
    return '';
  }

  var FALLBACK_TEXT = function () {
    var line = pick([
      "I'm not sure I've got that one. I'm best with questions about WBME's work, quotes, hours and where to find the workshop, and the team can answer anything else on **" + PHONE_DISPLAY + '**.',
      "That one's beyond me, sorry. Ask me about the trades, a job you need done, or how to reach the workshop. Or call the team on **" + PHONE_DISPLAY + '**.'
    ], state.used.fb);
    state.used.fb = line;
    return line + '\n[[call]]\n[[chips:What do you do? | I need a quote | Are you open now?]]';
  };

  function first (n) { return String(n || '').split(/\s+/)[0]; }
  function hi () { return state.name ? ', ' + first(state.name) : ''; }

  function intents (toks, text, q) {
    var c = function (list) { return count(toks, text, list); };
    return [
      { id: 'human', s: /\b(are you|r you|is this|am i talking to|talking to)\b.*\b(human|real|person|bot|robot|ai|machine|computer|automated)\b/.test(text) || /^(human|bot|robot)\??$/.test(text) ? 9 : 0,
        r: function () { return "I'm WBME's automated assistant, not a person. I can answer questions and take down your job details, and the team handles the rest. If you'd rather speak to someone now, call **" + PHONE_DISPLAY + '**.\n[[call]]'; } },
      { id: 'howareyou', s: /\b(how are you|how're you|how r you|how is it going|hows it going|how's it going|how are things|howzit)\b/.test(text) ? 6 : 0,
        r: function () { return pick(['Doing well, thanks for asking' + hi() + '. Busy day in the yard. What can I help you with?', 'All good here, thanks. What brings you to WBME today?']); } },
      { id: 'greet', s: /^(hi|hello|hey|hallo|howzit|good (morning|afternoon|evening|day)|morning|afternoon|evening|greetings|goeie(more| môre| more| middag| naand)|guten (tag|morgen|abend)|moro|yo)\b/.test(text) && toks.length <= 5 ? 5 : 0,
        r: function () {
          var lead = /^(hallo|goeie)/.test(text) ? 'Hallo' + hi() + '!' : /^guten/.test(text) ? 'Guten Tag' + hi() + '!' : workshopNow().greet + hi() + '!';
          return lead + ' ' + pick(['What can I help you with today?', 'Got a job on, or just having a look around?', 'What brings you to WBME?']) + '\n[[chips:What do you do? | I need a quote | Where are you?]]';
        } },
      { id: 'thanks', s: c(['thank', 'thanks', 'cheers', 'dankie', 'danke', 'appreciate', 'appreciated', 'legend']) ? 5 : 0,
        r: function () { return pick(['Anytime' + hi() + '. No job too big, no job too small.', 'Pleasure' + hi() + '. Shout if anything else comes up.', 'Glad to help. The team is on **' + PHONE_DISPLAY + '** whenever you need them.']); } },
      { id: 'bye', s: /\b(bye|goodbye|cheers then|see you|later|ciao|totsiens|tschüss|tschuss)\b/.test(text) && toks.length <= 5 ? 5 : 0,
        r: function () { return pick(['Cheers' + hi() + '! The propeller button is here whenever you need us.', 'Take care' + hi() + '. Good luck with the job.']); } },
      { id: 'urgent', s: (urgencyFrom(text) === 'urgent' ? 4 : 0) + c(['emergency', 'breakdown', 'urgent', 'asap']) * 2,
        r: function () {
          var s = workshopNow();
          var now = s.open ? "The workshop's open right now, so call **" + PHONE_DISPLAY + '** and you\'ll get the team.' : (s.onCall ? "It's Sunday, but WBME is on call for urgent work: call **" + PHONE_DISPLAY + '**.' : s.line + ' For anything urgent, call **' + PHONE_DISPLAY + '** first thing.');
          return 'Sounds like it can\'t wait. ' + now + ' I can also take the details down now so they\'re ready.\n[[call]]\n[[chips:Take my details | Where are you?]]';
        } },
      { id: 'quote', s: c(['quote', 'price', 'cost', 'estimate', 'budget', 'charge', 'rates', 'rate', 'how much', 'enquiry', 'inquiry', 'enquire', 'inquire', 'take my details', 'help me write']) * 3,
        r: null, flow: true },
      { id: 'hours', s: c(['hours', 'open', 'opening', 'closed', 'close', 'weekend', 'saturday', 'sunday', 'times', 'today', 'tomorrow', 'working hours', 'when are you']) * 2,
        r: function () {
          var s = workshopNow();
          return s.line + ' Normal hours are **Monday to Friday, 07:00 to 17:00**. Saturday is closed (WBME keeps the Sabbath) and Sunday is on call for urgent work.\n[[call]]';
        } },
      { id: 'where', s: c(['where', 'address', 'location', 'map', 'direction', 'visit', 'find you', 'premises', 'situated', 'come in', 'drop off', 'bring']) * 2,
        r: function () { return 'The workshop is at **' + ADDRESS + '**, Namibia. ' + pick(['Pop in during working hours, Monday to Friday, 07:00 to 17:00.', 'Monday to Friday, 07:00 to 17:00, if you want to bring something in.']) + '\n[[map]]'; } },
      { id: 'phone', s: c(['phone', 'call', 'number', 'tel', 'telephone', 'ring', 'cell', 'whatsapp', 'fax']) * 2,
        r: function () {
          var wa = /whatsapp/.test(text) ? "I don't have a WhatsApp number for the workshop, but " : '';
          return cap(wa + 'you can reach the workshop on **' + PHONE_DISPLAY + '**') + ' (fax +264 (0)64 209 350). ' + workshopNow().line + '\n[[call]]';
        } },
      { id: 'email', s: c(['email', 'mail', 'write to', 'send photos', 'send pictures', 'attach', 'drawings']) * 2,
        r: function () { return 'Email **' + email() + '**. Attach photos, drawings or dimensions if you have them; it helps the team quote faster.\n[[email]]'; } },
      { id: 'about', s: c(['about you', 'about wbme', 'about the company', 'history', 'founder', 'founded', 'established', 'started', 'story', 'cruys', 'crüys', 'who are you', 'the company', 'owner', 'owns', 'been around', 'in business', 'how many years', 'how old', 'family']) * 2,
        r: function () { return 'WBME was started in **1999** by the late Mr. Uwe Crüys and registered in October 2000, so over 25 years of serving vessels, mines and industry around Walvis Bay. His ethic still runs the place: value the customer, value the person, take pride in the small things. The motto says it best: **"No job too big, no job too small."**\n[[page:about]]'; } },
      { id: 'faith', s: c(['faith', 'christian', 'god', 'church', 'sabbath', 'religious', 'philippians', 'bible']) * 3,
        r: function () { return "WBME is a faith-based company. Its verse is Philippians 4:13: \"I can do all things through Christ Jesus who strengthens me.\" It keeps the Sabbath, so it's closed on Saturdays, and it's on call on Sundays for urgent work."; } },
      { id: 'why', s: c(['why', 'choose', 'different', 'better', 'trust', 'reputation', 'apart', 'good are you', 'experience', 'reliable']) * 2,
        r: function () { return 'A few reasons people stick with WBME:\n- workmanship held to a high standard at competitive prices\n- work planned around your time frame and budget\n- practical repairs that keep the total job cost down\n- 25+ years of real experience in Walvis Bay\'s marine industry\nAnd you get treated as a long-term partner, not a once-off ticket.\n[[page:about]]'; } },
      { id: 'industries', s: c(['industries', 'industry', 'sector', 'sectors', 'fishing', 'seafood', 'mining', 'mine', 'mines', 'offshore', 'energy', 'port', 'ports', 'harbour', 'harbor', 'cargo', 'shipping', 'clients', 'customers', 'who do you work']) * 2,
        r: function () { return 'Mostly the local marine industry: **fishing and seafood**, **shipping and cargo**. WBME also works for **mining**, **offshore and energy**, **ports and harbour** and general industry, anywhere expensive equipment has to keep working.'; } },
      { id: 'safety', s: c(['safety', 'quality', 'compliance', 'standards', 'safe', 'certified', 'certification', 'certificate', 'iso', 'class', 'approved', 'insurance', 'insured', 'accredited', 'bbbee']) * 2,
        r: function () { return "Every job is planned safety-first and finished to a consistent standard, and project write-ups mention work to class-approved tolerances and survey standard. For specific certificates or paperwork, I don't have the details, so it's best to ask the team directly.\n[[call]]\n[[email]]"; } },
      { id: 'timing', s: c(['how long', 'lead time', 'turnaround', 'when can', 'how soon', 'how quickly', 'available', 'availability', 'capacity', 'schedule']) * 2,
        r: function () { return "Honestly, it depends on the job and what's already in the workshop, so I can't promise a time. The team works around your deadline where they can: tell me what it is and when you need it, and I'll pass it on.\n[[chips:Take my details | Call instead]]"; } },
      { id: 'onsite', s: c(['on site', 'onsite', 'come to', 'come out', 'travel', 'swakopmund', 'luderitz', 'lüderitz', 'windhoek', 'mobile', 'site visit', 'at the harbour', 'alongside']) * 2,
        r: function () { return 'WBME works in its Walvis Bay workshop and on site, including installing fabricated work where it\'s needed. Whether the team can come out to your location depends on the job, so tell me where it is and I\'ll get them to confirm.\n[[chips:Take my details | Call instead]]'; } },
      { id: 'payment', s: c(['payment', 'pay', 'account', 'credit', 'invoice', 'deposit', 'terms', 'card', 'eft']) * 2,
        r: function () { return "I don't have payment or account details, sorry. The office can sort that out with you on **" + PHONE_DISPLAY + '** or by email.\n[[call]]\n[[email]]'; } },
      { id: 'jobs', s: c(['career', 'careers', 'vacancy', 'vacancies', 'hiring', 'apprentice', 'apprenticeship', 'cv', 'employment', 'job opening', 'work for you', 'internship']) * 3,
        r: function () { return "I don't have any vacancy information. If you'd like to work at WBME, the best route is to email your CV to **" + email() + '** or ask the workshop on ' + PHONE_DISPLAY + '.\n[[email]]'; } },
      { id: 'projects', s: c(['projects', 'project', 'portfolio', 'gallery', 'photos', 'pictures', 'examples', 'past work', 'your work', 'done before', 'previous', 'recent', 'similar', 'case']) * 2,
        r: function () {
          var list = projectList().slice(0, 4).map(function (p) { return '- **' + p.title + '**: ' + p.blurb; }).join('\n');
          return 'A few recent jobs from the yard:\n' + list + '\nEach one has photos on the Projects page.\n[[page:projects]]\n[[chips:Can you do similar? | I need a quote]]';
        } },
      { id: 'video', s: c(['video', 'watch', 'clip', 'footage', 'film']) * 3,
        r: function () { return 'There\'s a short film of WBME\'s propulsion work at the end of the About page. Worth a watch.\n[[page:about]]'; } },
      { id: 'services', s: c(['service', 'services', 'offer', 'capabilities', 'disciplines', 'trades', 'what do you do', 'what do you', 'what can you', 'do you do', 'can you do', 'specialise', 'specialize']) * 2,
        r: function () { return 'WBME does ship repair and maintenance across six trades, all in-house:\n- Rigging\n- Fitting & Turning\n- Boiler Making\n- Fabrication\n- Pipe Works\n- Welding\nWhat are you working on? I\'ll point you to the right one.\n[[page:services]]\n[[chips:Propeller or shaft work | Hull or steel repair | Pipes or valves]]'; } },
      { id: 'materials', s: c(['stainless', 'aluminium', 'mild steel', 'cast iron', 'copper', 'galvanized', 'materials', 'material', 'steel']) * 3,
        r: function () { return 'WBME works in **mild steel, stainless steel, aluminium and cast iron**, plus copper and galvanized pipe. Welding covers MIG, TIG, arc, gas, brazing and silver soldering.'; } },
      { id: 'yes', s: /^(yes|yeah|yep|yup|ja|sure|ok|okay|please|go ahead|sounds good|definitely|of course)\b/.test(text) && toks.length <= 4 ? 3 : 0,
        r: function () { return state.topic ? 'Great. Want me to take down the job details for the team, or would you rather call?\n[[call]]\n[[chips:Take my details | Call instead]]' : 'Sure thing. What would you like to know?\n[[chips:What do you do? | I need a quote | Where are you?]]'; } },
      { id: 'no', s: /^(no|nope|nah|not now|no thanks|nee)\b/.test(text) && toks.length <= 4 ? 3 : 0,
        r: function () { return pick(['No problem. I\'m here if anything comes up.', 'All good. Ask away if you think of anything else.']); } },
      { id: 'joke', s: /\b(joke|funny|make me laugh)\b/.test(text) ? 5 : 0,
        r: function () { return "Why did the welder bring a ladder? To reach a higher level of joint. That's about as good as it gets in the yard. Anything I can help with?"; } }
    ];
  }

  /* --- guided enquiry flow --- */
  var FLOW_Q = {
    job: function () { return pick(["What's the job? Tell me the part or structure and what's wrong with it. Sizes, materials and the vessel all help.", 'Tell me about the job: what needs fixing or making, and what\'s wrong with it at the moment?']); },
    vessel: function () { return 'Which vessel or site is it for, and where is it right now?\n[[chips:Skip this]]'; },
    urgency: function () { return 'How urgent is it?\n[[chips:Urgent, it\'s down now | This week | Planning ahead]]'; },
    name: function () { return pick(['Who should the team ask for?', "And what's your name?"]); },
    contact: function () { return pick(['What\'s the best phone number or email to reach you?', 'And the best number or email for the team to get back to you?']); }
  };
  var STEPS = ['job', 'vessel', 'urgency', 'name', 'contact'];
  var SIDE_OK = {};
  'human hours where phone email about faith why industries safety timing onsite payment jobs projects video services materials'.split(' ').forEach(function (k) { SIDE_OK[k] = 1; });
  function looksLikeQuestion (q, text) { return /\?/.test(q) || /^(where|what|when|how|who|why|are|is|do|does|can|could|will|would)\b/.test(text); }
  /* tidy a visitor's opening line into a job description for the card:
     "Hi, how much would a new propeller shaft cost?" -> "a new propeller shaft" */
  function jobText (q) {
    return String(q)
      .replace(/^\s*(?:hi|hello|hey|hallo|good (?:morning|afternoon|evening))[,!.\s]+/i, '')
      .replace(/^\s*(?:how much (?:would|does|will|is|for)(?: it cost(?: to)?)?|what (?:would|does|will) it cost(?: to)?|(?:can|could) (?:i|we) get a (?:quote|price) (?:for|on)|i need a (?:quote|price) (?:for|on))\s+/i, '')
      .replace(/[,.;!]?\s*(?:can|could|would) you (?:please )?(?:help|assist|do (?:it|this|that)|fix (?:it|this))(?: us| me)?(?: with (?:it|this|that))?\s*[?.!]*\s*$/i, '')
      .replace(/\s+(?:cost|be|run)\s*\?*\s*$/i, '')
      .replace(/\s*\?+\s*$/, '')
      .replace(/\s+/g, ' ').trim().slice(0, 600);
  }

  function flowAbsorb (f, q, text, toks) {
    var d = f.data;
    var em = emailFrom(q), nm = nameFrom(q), ur = urgencyFrom(text);
    /* only read a phone number when one is expected, so part numbers and
       dimensions in a job description aren't taken for one */
    var ph = (f.step === 'contact' || /\b(cell|phone|number|call me|reach me|mobile|tel)\b|\+264|\b0(6|8)\d/.test(text)) ? phoneFrom(q.replace(em, ' ')) : '';
    if (em) d.email = em;
    if (ph) d.phone = ph;
    if (nm) { d.name = nm; state.name = nm; }
    if (ur && !d.urgency) d.urgency = ur;
    var svc = serviceOf(toks, text);
    if (svc && !d.service) d.service = SERVICES[svc].name;
  }
  function flowNext (f) {
    var d = f.data;
    for (var i = 0; i < STEPS.length; i++) {
      var s = STEPS[i];
      if (s === 'job' && !d.job) return s;
      if (s === 'vessel' && d.vessel == null) return s;
      if (s === 'urgency' && !d.urgency) return s;
      if (s === 'name' && !d.name) return s;
      if (s === 'contact' && !d.phone && !d.email) return s;
    }
    return 'confirm';
  }
  function flowSummary (d) {
    var lines = ['- **Job:** ' + cap(d.job)];
    if (d.vessel) lines.push('- **Vessel / site:** ' + d.vessel);
    lines.push('- **Urgency:** ' + (URG_LABEL[d.urgency] || 'Planned'));
    lines.push('- **Contact:** ' + d.name + ', ' + [d.phone, d.email].filter(Boolean).join(' / '));
    return lines.join('\n');
  }
  function flowAsk (f) {
    f.step = flowNext(f);
    if (f.step === 'confirm') return 'Here\'s what I\'ll pass to the team:\n' + flowSummary(f.data) + '\nShall I send it?\n[[chips:Yes, send it | Change something]]';
    return FLOW_Q[f.step]();
  }
  function startFlow (toks, text, q, preset) {
    var f = { step: 'job', data: { service: preset || '' } };
    state.flow = f;
    flowAbsorb(f, q, text, toks);
    /* if the opening message (or the one before it) already describes the job, keep it */
    var describes = serviceOf(toks, text) || count(toks, text, SHIP_KW) || /\b(broken|leak\w*|crack\w*|worn|damaged|seized|corroded|replace|build|make|fabricate|machine)\b/.test(text);
    if (toks.length >= 5 && describes) f.data.job = jobText(q);
    else if (state.lastJob) f.data.job = state.lastJob;
    state.lastJob = '';
    var lead = pick(['Happy to help get that moving' + hi() + '. Every job is priced on its scope once the team has seen it, so let me take down a few details.', 'Sure, let\'s get the details together so the team can quote' + hi() + '. Prices depend on the scope, so the more they know, the better.']);
    if (f.data.urgency === 'urgent') lead = 'Understood, let\'s be quick. If it\'s down right now, calling **' + PHONE_DISPLAY + '** is fastest. Meanwhile I\'ll note the details.';
    return lead + '\n' + flowAsk(f) + (f.data.urgency === 'urgent' ? '\n[[call]]' : '');
  }
  function flowStep (q, text, toks) {
    var f = state.flow, d = f.data;
    if (/^(cancel|stop|never ?mind|forget it|quit|exit|no thanks)\b/.test(text)) {
      state.flow = null;
      return { raw: 'No problem, I\'ve dropped that. Anything else I can help with?' };
    }
    if (f.step === 'confirm') {
      if (/^(yes|yeah|yep|ja|sure|ok|okay|send|go|correct|perfect|that's right|thats right)/.test(text)) return flowSubmit();
      if (/change|edit|wrong|fix|not right|no\b/.test(text)) {
        f.step = 'edit';
        return { raw: 'No problem. What needs changing?\n[[chips:The job details | My name | My contact details]]' };
      }
    }
    if (f.step === 'edit') {
      if (/job|detail|description/.test(text) && !emailFrom(q) && !phoneFrom(q)) { d.job = ''; f.step = 'job'; return { raw: 'Go ahead, describe the job again.' }; }
      if (/name/.test(text) && !nameFrom(q)) { d.name = ''; f.step = 'name'; return { raw: 'What name should I use?' }; }
      if (/contact|phone|number|email/.test(text) && !emailFrom(q) && !phoneFrom(q)) { d.phone = ''; d.email = ''; f.step = 'contact'; return { raw: 'What\'s the best number or email?' }; }
    }
    /* a clear side question mid-flow ("where are you based?"): answer it,
       then pick the thread back up. Answers to the current question never count. */
    var asking = /\?\s*$/.test(q) || /^(where|what|when|how|who|why|are|is|do|does|can|could|will|would)\b/.test(text);
    var side = asking && f.step !== 'job' ? bestIntent(toks, text, q) : null;
    if (side && side.s >= 2 && SIDE_OK[side.id]) {
      var resume = FLOW_Q[f.step]().replace(/\n\[\[[\s\S]*$/, '');
      return { raw: side.r().replace(/\n\[\[chips:[^\]]*\]\]/g, '') + '\n\nBack to your job: ' + resume.charAt(0).toLowerCase() + resume.slice(1) };
    }
    var before = JSON.stringify(d);
    flowAbsorb(f, q, text, toks);
    /* "my name is Anna" or a bare email answers something else, not this step */
    var onlyDetails = (nameFrom(q) || emailFrom(q)) && toks.length <= 6;
    if (onlyDetails && (f.step === 'job' || f.step === 'vessel')) { /* keep asking this step */ }
    else if (f.step === 'job' && !d.job) d.job = jobText(q);
    else if (f.step === 'vessel' && d.vessel == null) {
      if (/^(skip|skip this|n\/?a|none|not sure|no|nope|rather not)\b/.test(text)) d.vessel = '';
      else if (!d.job) { d.job = jobText(q); }
      else d.vessel = q.slice(0, 160);
    } else if (f.step === 'urgency' && !d.urgency) {
      d.urgency = /urgent|down|now|asap|today|emergency|stuck|waiting/.test(text) ? 'urgent'
        : /week|soon|days|tomorrow|monday|tuesday|wednesday|thursday|friday/.test(text) ? 'this week'
        : /plan|ahead|later|month|no rush|not urgent|whenever|future|budget|asking|just looking/.test(text) ? 'planned' : '';
      if (!d.urgency) {
        if (f.urgencyTries) d.urgency = 'planned';
        else { f.urgencyTries = 1; return { raw: 'Sorry, just so the team knows: is it urgent, needed this week, or planned work?\n[[chips:Urgent, it\'s down now | This week | Planning ahead]]' }; }
      }
    } else if (f.step === 'name' && !d.name) {
      var plain = q.replace(/[^A-Za-zÀ-ÿ' -]/g, '').trim().split(/\s+/).filter(Boolean);
      var nm = nameFrom(q) || (toks.length <= 4 && !looksLikeQuestion(q, text) && !plain.some(function (w) { return NAME_STOP.test(w) && !PARTICLE.test(w); })
        ? plain.slice(0, 3).map(nameWord).join(' ') : '');
      if (nm) { d.name = nm; state.name = nm; }
    } else if (f.step === 'contact' && !d.phone && !d.email) {
      if (/@/.test(q) && !emailFrom(q)) return { raw: "That email doesn't look complete. Could you check it?" };
      if (!emailFrom(q) && !phoneFrom(q)) return { raw: 'I need a phone number or an email so the team can get back to you. Which would you prefer?' };
    }
    if (JSON.stringify(d) === before && f.step === 'name' && !d.name) return { raw: 'Sorry, I didn\'t catch your name. What should the team call you?' };
    var lead = '';
    if (f.step === 'urgency' && d.urgency === 'urgent') lead = 'Got it. For anything that\'s down right now, **' + PHONE_DISPLAY + '** is the fastest way to the team.\n';
    else if (f.step === 'name' && d.name) lead = pick(['Thanks, ' + first(d.name) + '. ', 'Nice to meet you, ' + first(d.name) + '. ']);
    else if (f.step === 'job') lead = pick(['Got it. ', 'Okay, that helps. ', 'Right. ']);
    else if (nameFrom(q) && d.name) lead = 'Thanks, ' + first(d.name) + '. ';
    return { raw: lead + flowAsk(f) + (lead.indexOf(PHONE_DISPLAY) !== -1 ? '\n[[call]]' : '') };
  }
  function flowSubmit () {
    var f = state.flow, d = f.data;
    state.flow = null;
    var payload = { name: d.name, phone: d.phone || '', email: d.email || '', vessel: d.vessel || '', service: d.service || 'General', urgency: d.urgency || 'planned', job: d.job, sid: state.sid, page: PAGE, transcript: historyForAI().slice(-16) };
    return {
      raw: 'Sending it through now...',
      after: function () {
        showTyping();
        var done = function (ref) {
          hideTyping();
          addCard({ ref: ref || '', name: d.name, phone: d.phone, email: d.email, vessel: d.vessel, service: d.service, urgency: d.urgency, job: d.job });
          var s = workshopNow();
          addBot(ref
            ? 'Done' + hi() + '. Your reference is **' + ref + '**, and the team will get back to you ' + (s.open ? 'shortly' : 'during working hours') + '. To be sure it lands in their inbox with any photos, tap **Email this to WBME** on the card.'
            : 'I couldn\'t log it on our side just now, but tap **Email this to WBME** on the card and it goes straight to the workshop inbox, all filled in.');
          setBusy(false);
        };
        if (location.protocol === 'file:' || !window.fetch) { done(''); return; }
        fetch('/api/enquiry', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) })
          .then(function (r) { return r.ok ? r.json() : {}; })
          .then(function (j) { done(j && j.ref); }, function () { done(''); });
      }
    };
  }

  function bestIntent (toks, text, q) {
    var best = null;
    intents(toks, text, q).forEach(function (it) { if (it.s > 0 && (!best || it.s > best.s)) best = it; });
    return best;
  }

  /* the offline brain: message in, reply (raw format) out */
  function brain (q) {
    var text = norm(q), toks = tokens(q);
    var nm = nameFrom(q);
    var learnedName = nm && nm !== state.name ? nm : '';
    if (nm) state.name = nm;

    /* "take me to services" works even halfway through an enquiry; it resumes on arrival */
    var nav = text.match(/\b(?:open|show(?: me)?|go to|take me to|bring up|navigate to)\s+(?:the\s+|your\s+)?(home|about|services?|projects?|contact|gallery)\b/);
    if (nav) {
      var key = { home: 'home', about: 'about', service: 'services', services: 'services', project: 'projects', projects: 'projects', gallery: 'projects', contact: 'contact' }[nav[1]];
      if (key === PAGE) return { raw: "You're on the " + PAGE_NAME[key] + ' page already. Anything here I can help with?' };
      return { raw: 'Taking you to ' + PAGE_NAME[key] + '...\n[[go:' + key + ']]' };
    }

    if (state.flow) { var fr = flowStep(q, text, toks); save(); return fr; }

    var svc = serviceOf(toks, text);
    var best = bestIntent(toks, text, q);
    var shipish = count(toks, text, SHIP_KW);
    var needs = /\b(need|needs|want|looking for|can you|could you|do you|have a|have an|got a|we have|i have|problem|issue|help with|repair|replace|make|build|broken|damaged|cracked|leaking|leaks|worn|failed|vibrat\w*|noise|noisy|knocking|overheat\w*|seized|stuck|corroded|corrosion|rust\w*|bent|snapped)\b/.test(text);

    /* a described job ("our trawler's shaft seal is leaking") -> show the trade, offer to take details */
    if ((svc || shipish) && needs && (!best || best.s < 6 || best.id === 'quote')) {
      if (best && best.id === 'quote') return { raw: startFlow(toks, text, q, svc ? SERVICES[svc].name : '') };
      state.topic = svc || 'ship';
      state.lastJob = jobText(q);
      var react = /leak|crack|broken|damaged|failed|worn|seized|stuck/.test(text) ? pick(['That\'s a pain, but it\'s exactly the kind of job WBME handles. ', 'Not what anyone wants to hear, but you\'re in the right place. '])
        : /^(do|can|could|would) (you|wbme|u)\b|^are you able/.test(text) ? pick(['Yes, that\'s everyday work for WBME. ', 'Yes, definitely. ']) : '';
      var body = svc ? SERVICES[svc].say[0] : 'That\'s ship repair work, and WBME covers it in-house: rigging, fitting & turning, boiler making, fabrication, pipe works and welding, often several on one job.';
      var urg = urgencyFrom(text) === 'urgent' ? '\nIf the vessel is waiting, call **' + PHONE_DISPLAY + '** now.\n[[call]]' : '';
      return { raw: (learnedName ? 'Thanks, ' + first(learnedName) + '. ' : '') + react + body + '\nWant me to take down the details so the team can quote?' + urg + '\n[[chips:Yes, take my details | Call instead]]' };
    }

    if (best && best.flow && best.s >= 3) return { raw: startFlow(toks, text, q, svc ? SERVICES[svc].name : (state.topic && SERVICES[state.topic] ? SERVICES[state.topic].name : '')) };
    if (/^(yes,? )?take my details|^call instead$/.test(text)) {
      if (/call/.test(text)) return { raw: 'The workshop is on **' + PHONE_DISPLAY + '**. ' + workshopNow().line + '\n[[call]]' };
      return { raw: startFlow(toks, text, q, state.topic && SERVICES[state.topic] ? SERVICES[state.topic].name : '') };
    }

    if (svc && (!best || best.s < 4 || best.id === 'services' || best.id === 'materials')) {
      state.topic = svc;
      var used = state.used[svc];
      var line = pick(SERVICES[svc].say, used); state.used[svc] = line;
      return { raw: line + '\n[[page:services]]\n[[chips:I need a quote | Show me past jobs]]' };
    }
    if (shipish >= 1 && (!best || best.s < 4)) {
      state.topic = 'ship';
      return { raw: 'Ship repair and maintenance is the core of WBME: propulsion and shaft work, rudders, hull plate, pipe work and welding, in the workshop or in dry dock. What\'s the vessel and what\'s going on with it?\n[[chips:I need a quote | Show me past jobs]]' };
    }
    if (best && best.s >= 2 && best.r) {
      var raw = best.r();
      if (best.id === 'greet' && learnedName) raw = raw.replace(/^[^!]*!/, 'Nice to meet you, ' + first(learnedName) + '!');
      return { raw: raw };
    }
    if (learnedName) return { raw: 'Nice to meet you, ' + first(learnedName) + '. What can I help you with?\n[[chips:What do you do? | I need a quote | Where are you?]]' };
    if (/\?$/.test(q) || toks.length > 3) return { raw: FALLBACK_TEXT() };
    return { raw: 'Could you tell me a bit more? For example, the job you need done, or a question about the workshop.\n[[chips:What do you do? | I need a quote | Where are you?]]' };
  }

  /* ===================================================================
     greetings and arrivals (local, instant, no AI call)
     =================================================================== */
  var PAGE_GREETING = {
    home: "Got a vessel in dock or a part that's given up? Tell me what's going on and I'll help you get it moving.",
    services: "Looking at the trades? Tell me about your job and I'll point you to the right one.",
    projects: "These are real jobs from the yard. If you've got something similar, tell me about it.",
    about: "That's the WBME story. Anything you'd like to know about the workshop?",
    contact: 'I can help you put the job details together so the team can quote quickly, or just answer a question.'
  };
  var PAGE_CHIPS = {
    home: 'What do you do? | I need a quote | Are you open now?',
    services: 'Which trade fits my job? | Can you do stainless? | I need a quote',
    projects: 'Can you do similar? | I need a quote | Where are you?',
    about: 'Who started WBME? | Who do you work for? | I need a quote',
    contact: 'Help me write it up | Are you open now? | Where are you?'
  };
  var ARRIVAL = {
    home: "Here's the home page. What else can I help with?",
    services: "Here's Services. Each trade has photos and more detail under **Learn more**. Want help working out which one your job falls under?",
    projects: "Here's Projects. Tap any job for the full write-up and photos. Got something similar in mind?",
    about: "Here's About: the story, the founder and the standard WBME works to. There's a short film at the end too.",
    contact: "Here's Contact. You can use the form, or I can take the details down right here in the chat."
  };
  function greet () {
    var s = workshopNow();
    var back = state.name ? 'Welcome back, ' + first(state.name) + '. ' : s.greet + '! ';
    var raw = back + "I'm the WBME assistant. " + (PAGE_GREETING[PAGE] || PAGE_GREETING.home);
    if (!s.open) raw += '\n' + (s.onCall ? "It's Sunday, so the team is on call for urgent work only, but I can take your details now." : "The workshop's closed right now, but I can take your details so they're ready first thing.");
    raw += '\n[[chips:' + (PAGE_CHIPS[PAGE] || PAGE_CHIPS.home) + ']]';
    showTyping();
    setTimeout(function () {
      hideTyping();
      addBot(raw, { greeting: true });
    }, reduce ? 0 : 650);
  }

  /* ===================================================================
     actions
     =================================================================== */
  function goTo (page, delay) {
    if (page === PAGE) return;
    state.arrive = page; state.reopen = true; saveNow();
    setTimeout(function () { window.location.href = PAGE_URL[page]; }, reduce ? 50 : (delay || 0));
  }
  function mailtoFor (c) {
    var lines = ['Hello WBME,', '', c.job || '', ''];
    if (c.vessel || c.vessel_or_site) lines.push('Vessel / site: ' + (c.vessel || c.vessel_or_site));
    if (c.service && c.service !== 'General') lines.push('Work: ' + c.service);
    if (c.urgency) lines.push('Urgency: ' + (URG_LABEL[c.urgency] || c.urgency));
    lines.push('', 'Name: ' + (c.name || '') + (c.company ? ' (' + c.company + ')' : ''));
    if (c.phone) lines.push('Phone: ' + c.phone);
    if (c.email) lines.push('Email: ' + c.email);
    lines.push('', (c.ref ? 'Reference ' + c.ref + ', from' : 'Sent from') + ' the website assistant.', '', '(Attach any photos or drawings to this email.)');
    var subject = 'Website enquiry' + (c.ref ? ' ' + c.ref : '') + (c.service && c.service !== 'General' ? ': ' + c.service : '');
    return 'mailto:' + email() + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(lines.join('\n').slice(0, 1800));
  }
  log.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-act]');
    if (!b) return;
    var act = b.getAttribute('data-act'), arg = b.getAttribute('data-arg');
    if (act === 'call') window.location.href = PHONE_TEL;
    else if (act === 'email') window.location.href = window.WBME_MAIL ? window.WBME_MAIL('Enquiry - WBME website') : 'mailto:' + email();
    else if (act === 'map') window.open(MAPS_URL, '_blank', 'noopener');
    else if (act === 'page' && PAGE_URL[arg]) { if (arg === PAGE) { close(); fab.focus(); } else goTo(arg, 0); }
    else if (act === 'mailcard') {
      var id = b.getAttribute('data-id');
      var m = state.msgs.filter(function (x) { return x.id === id; })[0];
      if (m) window.location.href = mailtoFor(m.card);
    }
  });

  /* ===================================================================
     open / close / input
     =================================================================== */
  var isOpen = false;
  function open (opts) {
    hideTeaser(true);
    if (isOpen) return;
    isOpen = true;
    if (opts && opts.instant) { box.classList.add('no-anim'); requestAnimationFrame(function () { requestAnimationFrame(function () { box.classList.remove('no-anim'); }); }); }
    box.classList.add('open');
    box.setAttribute('aria-hidden', 'false');
    fab.setAttribute('aria-expanded', 'true');
    paintStatus();
    if (!state.msgs.length) greet();
    scrollEnd(true);
    /* on phones, let them read the greeting before the keyboard covers it */
    var touch = window.matchMedia('(pointer: coarse)').matches;
    if (!(opts && opts.noFocus) && !touch) setTimeout(function () { input.focus({ preventScroll: true }); }, reduce ? 0 : 320);
    else if (touch) setTimeout(function () { (closeBtn || input).focus({ preventScroll: true }); }, reduce ? 0 : 320);
  }
  function close () {
    if (!isOpen) return;
    isOpen = false;
    box.classList.remove('open');
    box.setAttribute('aria-hidden', 'true');
    fab.setAttribute('aria-expanded', 'false');
    state.reopen = false; save();
  }
  function toggle () { if (isOpen) { close(); fab.focus(); } else { open(); } }

  function autosize () {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 120) + 'px';
  }
  input.addEventListener('input', autosize);
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(null); }
  });
  form.addEventListener('submit', function (e) { e.preventDefault(); send(null); });
  if (closeBtn) closeBtn.addEventListener('click', function () { close(); fab.focus(); });
  box.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.stopPropagation(); close(); fab.focus(); } });
  /* Esc also works when focus has drifted out of the chat (e.g. after a tapped
     suggestion disappears), as long as no other panel is open */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && isOpen && !document.body.classList.contains('locked') && !box.contains(document.activeElement)) { close(); fab.focus(); }
  });

  /* start over: two taps, so a stray click can't wipe a half-written enquiry */
  var armTimer = 0;
  if (newBtn) newBtn.addEventListener('click', function () {
    if (busy) return;
    if (state.msgs.length > 2 && !newBtn.classList.contains('is-armed')) {
      newBtn.classList.add('is-armed'); newBtn.setAttribute('aria-label', 'Tap again to clear the conversation');
      clearTimeout(armTimer);
      armTimer = setTimeout(function () { newBtn.classList.remove('is-armed'); newBtn.setAttribute('aria-label', 'Start a new conversation'); }, 3000);
      return;
    }
    newBtn.classList.remove('is-armed'); newBtn.setAttribute('aria-label', 'Start a new conversation');
    var keep = { aiOffUntil: state.aiOffUntil, teased: true };
    state = fresh(); state.aiOffUntil = keep.aiOffUntil; state.teased = true;
    saveNow(); renderAll(); greet(); input.focus();
  });

  /* if a panel opens by any route, tuck the assistant away */
  new MutationObserver(function () {
    if (document.body.classList.contains('locked') && isOpen) close();
  }).observe(document.body, { attributes: true, attributeFilter: ['class'] });

  /* ===================================================================
     teaser: one gentle nudge per visit, never while reading a form
     =================================================================== */
  var TEASE = {
    home: 'Vessel in dock or a part down? I can help you get it moving.',
    services: 'Not sure which trade your job falls under? Ask me.',
    projects: 'Got a job like one of these? Tell me about it.',
    about: 'Questions about WBME? Ask away.',
    contact: 'Want a hand writing up the job details?'
  };
  var teaseTimer = 0, teaseHide = 0;
  function hideTeaser (forever) {
    clearTimeout(teaseTimer); clearTimeout(teaseHide);
    if (teaser) teaser.classList.remove('show');
    if (forever && !state.teased) { state.teased = true; save(); }
  }
  if (teaser && !state.teased && !state.msgs.length) {
    var tText = teaser.querySelector('.cb-teaser-text');
    if (tText) tText.textContent = TEASE[PAGE] || TEASE.home;
    teaseTimer = setTimeout(function () {
      if (isOpen || document.body.classList.contains('locked') || document.body.classList.contains('form-active')) return;
      teaser.hidden = false;
      requestAnimationFrame(function () { teaser.classList.add('show'); });
      state.teased = true; save();
      teaseHide = setTimeout(function () { hideTeaser(false); }, 14000);
    }, 20000);
    var tOpen = document.getElementById('cbTeaserOpen');
    var tX = document.getElementById('cbTeaserX');
    if (tOpen) tOpen.addEventListener('click', function () { open(); });
    if (tX) tX.addEventListener('click', function () { hideTeaser(true); });
  }

  /* ===================================================================
     boot
     =================================================================== */
  paintStatus();
  setInterval(paintStatus, 60e3);
  renderAll();
  if (state.reopen && state.arrive) {
    var arrived = state.arrive;
    state.arrive = ''; save();
    open({ instant: true, noFocus: true });
    if (arrived === PAGE) {
      var hello = ARRIVAL[PAGE] || ARRIVAL.home;
      if (state.flow && state.flow.step && FLOW_Q[state.flow.step]) {
        var again = FLOW_Q[state.flow.step]();
        hello = ARRIVAL[PAGE].replace(/\s*(Want|Got|You can)[^.?]*[.?]\s*$/, '') + '\n\nWhenever you\'re ready, back to your job: ' + again.charAt(0).toLowerCase() + again.slice(1);
      }
      setTimeout(function () { showTyping(); setTimeout(function () { hideTyping(); addBot(hello); }, reduce ? 0 : 500); }, reduce ? 0 : 450);
    }
  }

  window.WBME_CHATBOT = {
    open: open, close: close, toggle: toggle,
    ask: function (q) { open(); setTimeout(function () { send(q); }, state.msgs.length ? 200 : 900); }
  };
})();
