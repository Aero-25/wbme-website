/* WBME Assistant: self-contained, on-site knowledge engine.
   No external services: intents + company knowledge live here, and the
   assistant can navigate the site (open panels, start calls, compose email). */
(function () {
  'use strict';

  var box = document.getElementById('chatbot');
  var fab = document.getElementById('chatbotFab');
  var log = document.getElementById('cbLog');
  var chipsEl = document.getElementById('cbChips');
  var form = document.getElementById('cbForm');
  var input = document.getElementById('cbInput');
  var closeBtn = document.getElementById('chatbotClose');
  if (!box || !fab || !log || !form || !input) return;

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var PHONE_DISPLAY = '+264 (0)64 285 700';
  var PHONE_TEL = 'tel:+26464285700';
  var MAPS_URL = 'https://www.google.com/maps?q=8th+Street+East,+Industrial+Area,+Walvis+Bay,+Namibia';

  /* ===== helpers ===== */
  function el (tag, cls, html) { var n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; }
  function esc (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function scrollEnd () { log.scrollTop = log.scrollHeight; }
  function email () { return window.WBME_EMAIL || ''; }

  /* action buttons rendered inside bot messages: [label, go, arg] */
  function actsHtml (acts) {
    if (!acts || !acts.length) return '';
    var h = '<span class="cb-acts">';
    acts.forEach(function (a) {
      h += '<button type="button" class="cb-act" data-go="' + a[1] + '"' + (a[2] ? ' data-arg="' + esc(a[2]) + '"' : '') + '>' + a[0] + '</button>';
    });
    return h + '</span>';
  }
  var ACT = {
    about:    ['Open About', 'link', 'about.html'],
    why:      ['Why WBME', 'link', 'about.html'],
    services: ['Open Services', 'link', 'services.html'],
    projects: ['See Projects', 'link', 'projects.html'],
    contact:  ['Open Contact', 'link', 'contact.html'],
    call:     ['Call ' + PHONE_DISPLAY, 'tel'],
    email:    ['Email us', 'mail', 'Enquiry - WBME website'],
    quote:    ['Request a quote', 'mail', 'Quote request - WBME'],
    map:      ['Get directions', 'map']
  };

  /* ===== knowledge base ===== */
  var SVC_LIST = '<b>Six disciplines, one workshop:</b><br>· Rigging<br>· Fitting &amp; Turning<br>· Boiler Making<br>· Fabrication<br>· Pipe Works<br>· Welding';
  var INTENTS = [
    { id: 'greet', kw: [['hi', 2], ['hello', 2], ['hey', 2], ['howzit', 2], ['morning', 2], ['afternoon', 2], ['evening', 2], ['greetings', 2]],
      reply: function () { return 'Welcome to WBME, Walvis Bay Marine Engineering. Ask me about our services, past projects, quotes, or how to reach the workshop.'; },
      acts: [ACT.services, ACT.quote], chips: ['What do you do?', 'Get a quote', 'Where are you?'] },

    { id: 'services', kw: [['service', 2], ['services', 2], 'offer', 'capabilities', 'disciplines', ['do you do', 2], ['what do you', 2], 'workshop', 'skills'],
      reply: function () { return SVC_LIST + '<br><br>All handled in-house from our Walvis Bay workshop. No job too big, no job too small.'; },
      acts: [ACT.services, ACT.quote], chips: ['Tell me about welding', 'Pipe works', 'Get a quote'] },

    { id: 'rigging', kw: [['rigging', 3], ['rig', 2], 'alternator', 'generator', 'compressor', 'pump', 'motor'],
      reply: function () { return '<b>Rigging.</b> General rigging for propeller shafts, rudder shafts, engines, alternators, generators, compressors, pumps and motors, plus pipe work, tanks, burners and steel structures prepared for installation.'; },
      acts: [ACT.services, ACT.quote] },

    { id: 'fitting', kw: [['fitting', 3], ['turning', 3], ['machining', 3], 'overhaul', 'lathe', 'liner', 'bush', 'bushes', 'thordon', 'strip'],
      reply: function () { return '<b>Fitting &amp; Turning.</b> Strip, overhaul, repair, new parts, re-assembly and installation. Machined replacements and precision repairs are prepared fit for installation.'; },
      acts: [ACT.services, ACT.projects] },

    { id: 'boiler', kw: [['boiler', 3], ['boilermaking', 3], 'structural', 'hull', 'deck', 'mast', 'gantry', 'walkway', 'ladder', 'plate'],
      reply: function () { return '<b>Boiler Making.</b> General steel structural works cover renewal, modification and complete new builds: hull, deck, bridge, walkways, ladders, masts, trawl doors, gantries, A-frames and ducting in mild steel, stainless or aluminium.'; },
      acts: [ACT.services, ACT.quote] },

    { id: 'fabrication', kw: [['fabrication', 3], ['fabricate', 3], 'tank', 'tanks', 'rolling', 'bending', 'cutting', 'stainless', 'dome', 'skip'],
      reply: function () { return '<b>Fabrication.</b> Profile cutting, rolling, bending, manufacture and installation for domes, tanks, burners, condensers, skips, base plates and custom structural work.'; },
      acts: [ACT.services, ACT.projects] },

    { id: 'pipe', kw: [['pipe', 3], ['pipes', 3], ['pipework', 3], 'manifold', 'valve', 'valves', 'condenser', 'strainer'],
      reply: function () { return '<b>Pipe Works.</b> Renewal, modification and complete new pipe work, including design, jigs and material preparation for pumps, motors, manifolds, main engines, tanks, condensers and valves.'; },
      acts: [ACT.services, ACT.quote] },

    { id: 'welding', kw: [['weld', 3], ['welding', 3], 'mig', 'tig', 'arc', 'brazing', 'soldering', 'aluminium', 'aluminum', 'cast'],
      reply: function () { return '<b>Welding.</b> Gas welding, brazing, silver soldering, MIG, TIG and arc welding across mild steel, stainless, aluminium and cast iron.'; },
      acts: [ACT.services, ACT.quote] },

    { id: 'about', kw: [['about', 2], 'history', 'founder', 'founded', 'established', 'started', 'story', 'cruys', 'crüys', ['who are you', 3], ['the company', 2], 'old'],
      reply: function () { return 'WBME was established in 1999 by the late Mr. Uwe Crüys and registered in October 2000. The workshop serves vessels, mines and industrial clients around Walvis Bay, built on craftsmanship, character and the motto <b>"No job too big, no job too small."</b>'; },
      acts: [ACT.about, ACT.why], chips: ['Why choose WBME?', 'What do you do?'] },

    { id: 'why', kw: [['why', 2], 'choose', 'different', 'better', 'trust', 'standard', 'reputation', 'apart'],
      reply: function () { return '<b>Why WBME:</b> high-standard workmanship at competitive prices, skilled tradesmen, practical job planning and customers treated as long-term partners, not once-off tickets.'; },
      acts: [ACT.why, ACT.quote] },

    { id: 'industries', kw: [['industries', 3], ['industry', 2], 'sector', 'sectors', 'fishing', 'seafood', 'mining', 'mine', 'offshore', 'energy', 'port', 'ports', 'harbour', 'cargo', 'shipping', 'serve'],
      reply: function () { return 'We serve <b>fishing and seafood, shipping and cargo, mining and minerals, offshore and energy, ports and harbour</b>, plus general industrial metal work.'; },
      acts: [ACT.about, ACT.quote] },

    { id: 'safety', kw: [['safety', 3], ['quality', 2], 'compliance', 'standards', 'safe', 'certified'],
      reply: function () { return 'Every job is planned around a practical standard: <b>safe work, reliable workmanship, efficient execution and cost control</b>.'; },
      acts: [ACT.why] },

    { id: 'quote', kw: [['quote', 3], ['quotation', 3], ['price', 2], ['cost', 2], 'estimate', 'budget', 'charge', 'rates', 'enquiry', 'inquire'],
      reply: function () { return 'Every job is priced on its scope. Send us the details and we will come back with a practical quote. Email is best for drawings and photos; for urgent work, call <b>' + PHONE_DISPLAY + '</b>.'; },
      acts: [ACT.quote, ACT.contact, ACT.call], chips: ['Working hours', 'Where are you?'] },

    { id: 'urgent', kw: [['urgent', 3], ['emergency', 3], 'breakdown', 'asap', 'immediately', ['right now', 3], 'dock', 'dry-dock', 'drydock'],
      reply: function () { return 'For urgent work, call the workshop directly on <b>' + PHONE_DISPLAY + '</b>. When a vessel is in dock or a component fails, WBME responds with straight answers and the right hands.'; },
      acts: [ACT.call, ACT.contact] },

    { id: 'phone', kw: [['phone', 3], ['call', 2], ['number', 2], 'tel', 'telephone', 'ring'],
      reply: function () { return 'You can reach the workshop on <b>' + PHONE_DISPLAY + '</b>, Monday to Friday from 07:00 to 17:00.'; },
      acts: [ACT.call] },

    { id: 'email', kw: [['email', 3], ['mail', 2], ['e-mail', 3], 'write'],
      reply: function () { return 'Email us at <b>' + esc(email()) + '</b>. Attach photos or drawings if you have them; it helps us quote faster.'; },
      acts: [ACT.email] },

    { id: 'where', kw: [['where', 2], ['address', 3], ['located', 3], ['location', 3], 'map', 'directions', 'visit', 'find', 'premises'],
      reply: function () { return 'You’ll find us at <b>8th Street East, Industrial Area, Walvis Bay, Namibia</b>.'; },
      acts: [ACT.map, ACT.contact] },

    { id: 'hours', kw: [['hours', 3], ['open', 2], ['opening', 3], 'closed', 'weekend', 'saturday', 'sunday', 'when', 'times'],
      reply: function () { return '<b>Workshop hours:</b><br>Monday to Friday, 07:00 to 17:00<br>Saturday, closed<br>Sunday, available on request. Urgent jobs? Call us.'; },
      acts: [ACT.call] },

    { id: 'projects', kw: [['projects', 3], ['project', 2], 'portfolio', 'gallery', 'photos', 'pictures', 'examples', 'facebook', ['past work', 3], ['your work', 2]],
      reply: function () { return 'Recent work includes a <b>Kort nozzle and shaft conversion</b> (CPP to fixed), machining new seal liners, a stainless steel tank build and hull plate replacement. The Projects page shows the full photo gallery.'; },
      acts: [ACT.projects, ACT.quote] },

    { id: 'video', kw: [['video', 3], 'watch', 'clip', 'footage'],
      reply: function () { return 'There is a short film of our propulsion work near the end of the About page.'; },
      acts: [ACT.about] },

    { id: 'contact', kw: [['contact', 3], 'reach', ['get in touch', 3], ['talk to', 2], 'human', 'person', 'someone', 'speak'],
      reply: function () { return 'Here is how to reach WBME:<br><b>Call:</b> ' + PHONE_DISPLAY + '<br><b>Email:</b> ' + esc(email()) + '<br><b>Visit:</b> 8th Street East, Industrial Area, Walvis Bay.'; },
      acts: [ACT.contact, ACT.call, ACT.email] },

    { id: 'thanks', kw: [['thank', 2], ['thanks', 2], 'cheers', 'appreciated', 'great', 'awesome', 'perfect'],
      reply: function () { return 'Anytime. If a job comes up, no job too big, no job too small.'; },
      acts: [ACT.quote] },

    { id: 'bye', kw: [['bye', 2], 'goodbye', 'later', 'ciao'],
      reply: function () { return 'Cheers! You’ll find the propeller button here whenever you need us.'; }, acts: [] }
  ];

  var FALLBACK = {
    reply: function () { return 'I might not have that one, but a person will. Try asking about <b>services, projects, quotes, hours</b> or <b>where to find us</b>, or reach the workshop directly.'; },
    acts: [ACT.call, ACT.contact],
    chips: ['What do you do?', 'Get a quote', 'Working hours', 'Where are you?']
  };
  var DEFAULT_CHIPS = ['What do you do?', 'Get a quote', 'See your projects', 'Where are you?'];

  /* ===== matching engine ===== */
  var SYN = { boat: 'vessel', ship: 'vessel', vessels: 'vessel', fix: 'repair', fixing: 'repair', fixed: 'repair', repairs: 'repair', costs: 'cost', prices: 'price', pricing: 'price', quotations: 'quotation', located: 'location', direction: 'directions', 'e-mail': 'email', numbers: 'number', opening: 'hours', propellor: 'propeller' };
  function norm (s) { return String(s).toLowerCase().replace(/[^\w\s@&'-]/g, ' ').replace(/\s+/g, ' ').trim(); }
  function tokens (s) { return norm(s).split(' ').map(function (w) { return SYN[w] || w; }); }

  function score (intent, text, toks) {
    var pts = 0;
    intent.kw.forEach(function (k) {
      var word = k, w = 1;
      if (Object.prototype.toString.call(k) === '[object Array]') { word = k[0]; w = k[1]; }
      if (word.indexOf(' ') !== -1) { if (text.indexOf(word) !== -1) pts += w + 1; }
      else if (toks.indexOf(word) !== -1) pts += w;
      else if (word.length > 4 && toks.some(function (t) { return t.indexOf(word) === 0; })) pts += w * 0.75;
    });
    return pts;
  }

  var NAV_RE = /(?:open|show(?:\s+me)?|go\s+to|take\s+me\s+to|view|see)\s+(?:the\s+|your\s+)?(about|why|services?|projects?|contact|gallery|quote)/;
  var NAV_KEY = { about: 'about', why: 'why', service: 'services', services: 'services', project: 'projects', projects: 'projects', gallery: 'projects', contact: 'contact', quote: 'contact' };
  var PANEL_NAME = { about: 'About', why: 'Why WBME', services: 'Services', projects: 'Projects', contact: 'Contact' };
  var NAV_URL = { about: 'about.html', why: 'about.html', services: 'services.html', projects: 'projects.html', contact: 'contact.html' };

  function think (q) {
    var text = norm(q), toks = tokens(q);
    var nav = text.match(NAV_RE);
    if (nav) return { nav: NAV_KEY[nav[1]] };
    var best = null, bestPts = 0;
    INTENTS.forEach(function (it) {
      var p = score(it, text, toks);
      if (p > bestPts) { bestPts = p; best = it; }
    });
    if (bestPts >= 2) return { intent: best };
    /* soft follow-ups lean on the previous topic */
    if (/^(yes|yeah|yep|ok|okay|sure|more|please)\b/.test(text) && lastIntent && lastIntent.acts && lastIntent.acts.length) {
      return { intent: { id: 'follow', reply: function () { return 'Here you go:'; }, acts: lastIntent.acts, chips: lastIntent.chips } };
    }
    return { intent: FALLBACK };
  }

  /* ===== rendering ===== */
  var lastIntent = null;
  function addUser (text) { var m = el('div', 'cb-m user'); m.textContent = text; log.appendChild(m); scrollEnd(); }
  function addBot (html) { log.appendChild(el('div', 'cb-m bot', html)); scrollEnd(); }
  function setChips (list) {
    chipsEl.innerHTML = '';
    (list || DEFAULT_CHIPS).forEach(function (c) {
      var b = el('button', 'cb-chip', esc(c)); b.type = 'button';
      b.addEventListener('click', function () { send(c); });
      chipsEl.appendChild(b);
    });
  }
  function typing (ms, done) {
    if (reduce) { done(); return; }
    var t = el('div', 'cb-typing', '<i></i><i></i><i></i>');
    log.appendChild(t); scrollEnd();
    setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); done(); }, ms);
  }

  function respond (q) {
    var r = think(q);
    if (r.nav) {
      typing(180, function () {
        addBot('Taking you to <b>' + PANEL_NAME[r.nav] + '</b>…');
        setTimeout(function () { goLink(NAV_URL[r.nav]); }, reduce ? 0 : 160);
      });
      return;
    }
    var it = r.intent;
    lastIntent = it;
    typing(240, function () {
      addBot(it.reply() + actsHtml(it.acts));
      setChips(it.chips);
    });
  }

  function send (raw) {
    var q = String(raw == null ? input.value : raw).trim();
    if (!q) return;
    input.value = '';
    addUser(q);
    respond(q);
  }

  /* ===== actions (guide + open pages) ===== */
  function goLink (url) {
    close();
    window.location.href = url;
  }
  function doAction (go, arg) {
    if (go === 'link') { goLink(arg); return; }
    if (go === 'tel') { window.location.href = PHONE_TEL; return; }
    if (go === 'mail') { window.location.href = window.WBME_MAIL ? window.WBME_MAIL(arg || '') : '#'; return; }
    if (go === 'map') { window.open(MAPS_URL, '_blank', 'noopener'); }
  }
  log.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-go]');
    if (b) doAction(b.getAttribute('data-go'), b.getAttribute('data-arg'));
  });

  /* ===== open/close ===== */
  var isOpen = false, welcomed = false;
  function setInstant (instant) {
    if (!instant) return;
    box.classList.add('no-motion');
    setTimeout(function () { box.classList.remove('no-motion'); }, 40);
  }
  function open (instant) {
    if (isOpen) return;
    setInstant(instant);
    isOpen = true;
    box.classList.add('open');
    box.setAttribute('aria-hidden', 'false');
    fab.setAttribute('aria-expanded', 'true');
    if (!welcomed) {
      welcomed = true;
      var h = new Date().getHours();
      var sal = h < 12 ? 'Good morning' : (h < 17 ? 'Good afternoon' : 'Good evening');
      typing(240, function () {
        addBot(sal + '. Welcome aboard. I’m the <b>WBME assistant</b>. Ask me anything about the workshop, or tap a suggestion below. I can also take you straight to any page.');
        setChips(DEFAULT_CHIPS);
      });
    }
    setTimeout(function () { input.focus(); }, (reduce || instant) ? 0 : 220);
  }
  function close (instant) {
    if (!isOpen) return;
    setInstant(instant);
    isOpen = false;
    box.classList.remove('open');
    box.setAttribute('aria-hidden', 'true');
    fab.setAttribute('aria-expanded', 'false');
  }
  function toggle (instant) { if (isOpen) { close(instant); fab.focus(); } else { open(instant); } }

  fab.addEventListener('click', function (e) { toggle(e.detail === 0); });
  form.addEventListener('submit', function (e) { e.preventDefault(); send(null); });
  if (closeBtn) closeBtn.addEventListener('click', function (e) { close(e.detail === 0); fab.focus(); });
  box.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.stopPropagation(); close(true); fab.focus(); } });

  /* if a panel opens by any route, tuck the assistant away */
  new MutationObserver(function () {
    if (document.body.classList.contains('is-locked') && isOpen) close();
  }).observe(document.body, { attributes: true, attributeFilter: ['class'] });

  window.WBME_CHATBOT = { open: open, close: close, toggle: toggle };
})();
