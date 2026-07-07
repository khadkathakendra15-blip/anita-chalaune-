/* anime.js motion layer for the Anita Chalaune site.
   Intentional, restrained motion: load timelines, staggered text,
   magnetic hover, custom cursor, SVG draw, scroll progress + reveals.
   Fails safe: on error or reduced-motion, content stays fully visible. */
(function () {
  "use strict";
  if (window.__acMotion) return;
  window.__acMotion = true;

  var mq = window.matchMedia ? window.matchMedia.bind(window) : function () { return { matches: false }; };
  var REDUCE = mq('(prefers-reduced-motion: reduce)').matches;
  var FINE = mq('(pointer: fine)').matches && mq('(hover: hover)').matches;
  var TOUCH = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function guard(fn) { try { fn(); } catch (e) { /* never let motion break the page */ } }

  // Split text nodes into inline-block units (chars or words), preserving <br> etc.
  function split(el, byChar) {
    if (el.__acSplit) return el.__acSplit;
    var out = [], frag = document.createDocumentFragment();
    Array.prototype.slice.call(el.childNodes).forEach(function (n) {
      if (n.nodeType === 3) {
        var units = byChar ? n.textContent.split('') : n.textContent.split(/(\s+)/);
        units.forEach(function (u) {
          if (u === '') return;
          if (/^\s+$/.test(u)) { frag.appendChild(document.createTextNode(u)); return; }
          var sp = document.createElement('span');
          sp.className = 'ac-u';
          sp.style.display = 'inline-block';
          sp.style.willChange = 'transform, opacity';
          sp.textContent = u;
          frag.appendChild(sp); out.push(sp);
        });
      } else { frag.appendChild(n.cloneNode(true)); }
    });
    el.innerHTML = ''; el.appendChild(frag); el.__acSplit = out;
    return out;
  }

  /* ---------- custom cursor ---------- */
  function cursor() {
    if (!FINE || TOUCH || REDUCE) return;
    var dot = document.createElement('div'); dot.className = 'ac-cursor-dot';
    var ring = document.createElement('div'); ring.className = 'ac-cursor-ring';
    document.body.appendChild(dot); document.body.appendChild(ring);
    document.documentElement.classList.add('ac-hide-cursor');
    var mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my, seen = false;
    document.addEventListener('mousemove', function (e) {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = 'translate(' + mx + 'px,' + my + 'px)';
      if (!seen) { seen = true; rx = mx; ry = my; }
    }, { passive: true });
    (function loop() {
      rx += (mx - rx) * 0.16; ry += (my - ry) * 0.16;
      ring.style.transform = 'translate(' + rx + 'px,' + ry + 'px)';
      requestAnimationFrame(loop);
    })();
    var sel = 'a, button, [role="button"], iframe, .ac-magnetic, input, textarea';
    document.addEventListener('mouseover', function (e) {
      if (e.target.closest && e.target.closest(sel)) document.documentElement.classList.add('ac-cursor-active');
    });
    document.addEventListener('mouseout', function (e) {
      if (e.target.closest && e.target.closest(sel)) document.documentElement.classList.remove('ac-cursor-active');
    });
  }

  /* ---------- magnetic buttons ---------- */
  function magnetic() {
    if (REDUCE || TOUCH || !FINE) return;
    var ctas = [];
    ['#top a[href*="spotify"]', '#top a[href*="youtube"]',
     '#contact a[href^="mailto"]'].forEach(function (s) { ctas = ctas.concat($$(s)); });
    ctas.forEach(function (el) {
      el.classList.add('ac-magnetic');
      el.style.willChange = 'transform';
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        anime({ targets: el, translateX: (e.clientX - (r.left + r.width / 2)) * 0.3,
          translateY: (e.clientY - (r.top + r.height / 2)) * 0.35, duration: 350, easing: 'easeOutQuad' });
      });
      el.addEventListener('mouseleave', function () {
        anime({ targets: el, translateX: 0, translateY: 0, duration: 700, easing: 'easeOutElastic(1, .5)' });
      });
    });
  }

  /* ---------- hero load timeline + staggered name ---------- */
  function hero() {
    var wrap = $('#top [style*="width: 44%"]') || $('#top');
    if (wrap) wrap.style.animation = 'none';
    var h1 = $('#top h1');
    var sibs = wrap ? Array.prototype.filter.call(wrap.children, function (c) { return c !== h1; }) : [];
    if (REDUCE) return;

    if (sibs.length) {
      anime.set(sibs, { opacity: 0, translateY: 26 });
      anime({ targets: sibs, opacity: [0, 1], translateY: [26, 0],
        duration: 820, delay: anime.stagger(90, { start: 540 }), easing: 'easeOutExpo' });
    }

    // The name: DC may re-render and wipe the split, so re-apply whenever that happens.
    var applied = 0;
    function applyName() {
      if (!h1 || h1.querySelector('.ac-u')) return;
      h1.__acSplit = null;                       // force a fresh split (DC restored original)
      var chars = split(h1, true);
      anime.set(chars, { opacity: 0, translateY: 44, rotateZ: -5 });
      anime({ targets: chars, opacity: [0, 1], translateY: [44, 0], rotateZ: [-5, 0],
        duration: 860, delay: anime.stagger(32, { start: applied === 0 ? 120 : 0 }), easing: 'easeOutExpo' });
      applied++;
    }
    applyName();
    if (h1) {
      var mo = new MutationObserver(function () { if (applied < 5) applyName(); });
      try { mo.observe(h1, { childList: true }); } catch (e) {}
      setTimeout(function () {
        mo.disconnect();
        $$('.ac-u', h1).forEach(function (c) { c.style.opacity = 1; c.style.transform = 'none'; });
      }, 3600);
    }
    setTimeout(function () { sibs.forEach(function (s) { s.style.opacity = 1; s.style.transform = 'none'; }); }, 2800);
  }

  /* ---------- smooth SVG draw (golden swoosh arcs) ---------- */
  function svg() {
    if (REDUCE) return;
    $$('#top svg path[stroke^="url"]').forEach(function (p, i) {
      guard(function () {
        var len = p.getTotalLength();
        p.style.animation = 'none';
        anime.set(p, { strokeDasharray: len, strokeDashoffset: len, opacity: 0 });
        anime({ targets: p, strokeDashoffset: [len, 0], opacity: [0, 1],
          duration: 2600, delay: 500 + i * 240, easing: 'easeInOutSine' });
      });
    });
  }

  /* ---------- scroll progress bar + hero parallax ---------- */
  function scrollFx() {
    if (REDUCE) return;
    var bar = document.createElement('div'); bar.className = 'ac-progress';
    document.body.appendChild(bar);
    var portrait = $('#top img[src*="asset_000"]');
    var ticking = false;
    function onScroll() {
      if (ticking) return; ticking = true;
      requestAnimationFrame(function () {
        var h = document.documentElement.scrollHeight - innerHeight;
        var p = h > 0 ? (scrollY / h) : 0;
        bar.style.width = (p * 100).toFixed(2) + '%';
        if (portrait && scrollY < innerHeight) portrait.style.transform = 'translateY(' + (scrollY * 0.12) + 'px) scale(1.02)';
        ticking = false;
      });
    }
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---------- scroll reveals (headings, cards, images, timeline, pills) ---------- */
  function reveals() {
    if (REDUCE) return;
    // Take over the existing CSS scroll reveals to keep one motion language.
    $$('[style*="animation-timeline: view()"]').forEach(function (el) { el.style.animation = 'none'; });

    var registry = [];
    var io = ('IntersectionObserver' in window) ? new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        play(en.target);
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -6% 0px' }) : null;

    // Fallback: reveal anything in view on scroll/resize, in case IO misses it.
    var ticking = false;
    function sweep() {
      ticking = false;
      for (var i = registry.length - 1; i >= 0; i--) {
        var el = registry[i];
        if (el.__acPlayed) { registry.splice(i, 1); continue; }
        var r = el.getBoundingClientRect();
        if (r.top < innerHeight * 0.92 && r.bottom > -40) play(el);
      }
    }
    function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(sweep); } }
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onScroll);
    // Ultimate safety net: if something never gets scrolled to, don't leave it hidden forever.
    setTimeout(function () { registry.slice().forEach(function (el) { if (!el.__acPlayed) { var r = el.getBoundingClientRect(); if (r.top < innerHeight * 1.2) play(el); } }); }, 6000);

    function play(el) {
      if (el.__acPlayed) return; el.__acPlayed = true;
      if (io) io.unobserve(el);
      var kind = el.__acKind;
      if (kind === 'heading') {
        anime({ targets: split(el, false), opacity: [0, 1], translateY: ['0.75em', 0], rotateZ: [-3, 0],
          duration: 850, delay: anime.stagger(48), easing: 'easeOutExpo' });
      } else if (kind === 'card') {
        anime({ targets: el, opacity: [0, 1], translateY: [42, 0], duration: 900, easing: 'easeOutExpo' });
      } else if (kind === 'img') {
        anime({ targets: el, opacity: [0, 1], scale: [1.06, 1], duration: 1000, easing: 'easeOutExpo' });
      } else {
        anime({ targets: el, opacity: [0, 1], translateY: [22, 0], duration: 750, easing: 'easeOutCubic' });
      }
      // Per-element safety: if the tween ever stalls, force the final visible state.
      var safeEls = kind === 'heading' ? split(el, false) : [el];
      setTimeout(function () {
        safeEls.forEach(function (n) {
          if (+getComputedStyle(n).opacity < 0.98) { n.style.opacity = 1; n.style.transform = 'none'; }
        });
      }, 1500);
    }
    function register(el, kind) {
      if (!el || el.__acReg) return; el.__acReg = true; el.__acKind = kind;
      el.style.animation = 'none';
      if (kind === 'heading') { split(el, false).forEach(function (w) { anime.set(w, { opacity: 0, translateY: '0.75em' }); }); }
      else if (kind === 'img') { anime.set(el, { opacity: 0, scale: 1.06 }); }
      else { anime.set(el, { opacity: 0, translateY: kind === 'card' ? 42 : 22 }); }
      var r = el.getBoundingClientRect();
      if (r.top < innerHeight * 0.9 && r.bottom > 0) { play(el); return; }
      registry.push(el);
      if (io) io.observe(el);
    }

    $$('section h2, footer h2').forEach(function (el) { register(el, 'heading'); });
    $$('[style*="border-radius: 24px"]').forEach(function (el) { register(el, 'card'); });       // venture cards
    $$('#music [style*="border-radius: 16px"]').forEach(function (el) { register(el, 'card'); }); // song cards
    $$('.ac-jcard').forEach(function (el) { register(el, 'card'); });                             // journey timeline cards
    $$('#contact [style*="border-radius: 100px"]').forEach(function (el) { register(el, 'text'); }); // social pills
  }

  /* ---------- counter roll-up (hero stats) ---------- */
  function counters() {
    if (REDUCE) return;
    var nums = $$('#top span').filter(function (el) {
      return el.children.length === 0 && /^[\d.]+[KM]?\+?$/.test(el.textContent.trim());
    });
    nums.forEach(function (el) {
      var m = el.textContent.trim().match(/^([\d.]+)([KM]?\+?)$/); if (!m) return;
      var target = parseFloat(m[1]), suffix = m[2], dec = m[1].indexOf('.') >= 0 ? 1 : 0;
      var obj = { v: 0 };
      anime({ targets: obj, v: target, duration: 2000, delay: 950, easing: 'easeOutExpo',
        update: function () { el.textContent = (dec ? obj.v.toFixed(1) : Math.round(obj.v)) + suffix; },
        complete: function () { el.textContent = m[1] + suffix; } });
    });
  }

  /* ---------- 3D tilt on cards (hover) ---------- */
  function tilt() {
    if (REDUCE || TOUCH || !FINE) return;
    var cards = $$('[style*="border-radius: 24px"]').concat($$('#music [style*="border-radius: 16px"]'));
    cards.forEach(function (card) {
      card.addEventListener('mouseenter', function () { card.style.transition = 'transform .12s ease-out'; });
      card.addEventListener('mousemove', function (e) {
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = 'perspective(820px) rotateY(' + (px * 6).toFixed(2) + 'deg) rotateX(' +
          (-py * 6).toFixed(2) + 'deg) translateY(-6px)';
      });
      card.addEventListener('mouseleave', function () {
        card.style.transition = 'transform .55s cubic-bezier(.22,1,.36,1)';
        card.style.transform = 'perspective(820px) rotateY(0deg) rotateX(0deg) translateY(0px)';
      });
    });
  }

  /* ---------- circular 3D gallery (scroll-driven rotation + idle auto-rotate) ---------- */
  function circularGallery() {
    if (!$('#gallery')) return;
    var auto = 0, scrolling = false, stO = null;
    addEventListener('scroll', function () {
      scrolling = true; clearTimeout(stO); stO = setTimeout(function () { scrolling = false; }, 160);
    }, { passive: true });
    function fit() { var st = $('#gallery .ac-ring-stage'); if (st) st.style.transform = 'scale(' + Math.max(0.42, Math.min(1, innerWidth / 1240)) + ')'; }
    fit(); addEventListener('resize', fit);
    // Re-query live nodes each frame so a DC re-render can't leave us driving stale elements.
    (function loop() {
      var section = $('#gallery'), ring = $('#gallery .ac-ring'), cards = $$('#gallery .ac-gc');
      if (section && ring && cards.length && innerWidth >= 860) {
        var total = section.offsetHeight - innerHeight;
        var p = total > 0 ? Math.max(0, Math.min(1, -section.getBoundingClientRect().top / total)) : 0;
        if (!scrolling && !REDUCE) auto += 0.04;
        var rot = p * 360 + auto, ap = 360 / cards.length;
        ring.style.transform = 'rotateY(' + rot + 'deg)';
        for (var i = 0; i < cards.length; i++) {
          var rel = ((i * ap + rot) % 360 + 360) % 360;
          var norm = rel > 180 ? 360 - rel : rel;
          cards[i].style.opacity = Math.max(0.22, 1 - norm / 180).toFixed(3);
        }
      }
      requestAnimationFrame(loop);
    })();
  }

  /* ---------- scroll-linked text fill (words brighten as they pass upward) ---------- */
  function textFill() {
    if (REDUCE) return;
    function ensure() {
      $$('.ac-fill').forEach(function (el) {
        if (!el.querySelector('.ac-fw')) {
          el.__acSplit = null;
          try { split(el, false).forEach(function (w) { w.classList.add('ac-fw'); }); } catch (e) {}
        }
      });
    }
    ensure();
    var en = 0, eiv = setInterval(function () { ensure(); if (++en > 26) clearInterval(eiv); }, 350);
    var ticking = false;
    function update() {
      ticking = false;
      var lineHi = innerHeight * 0.82, band = innerHeight * 0.34;
      var words = $$('.ac-fw');
      for (var i = 0; i < words.length; i++) {
        var r = words[i].getBoundingClientRect();
        var t = (lineHi - (r.top + r.height / 2)) / band;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        words[i].style.opacity = (0.18 + 0.82 * t).toFixed(3);
      }
    }
    addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    addEventListener('resize', update);
    var uiv = setInterval(update, 400); setTimeout(function () { clearInterval(uiv); }, 10000);
    update();
  }

  /* ---------- boot ----------
     The DC framework re-renders the template content after load, which would
     wipe any DOM mutations. So we wait until the DOM stops changing (settles)
     before splitting text / tagging elements, then init once. */
  function whenSettled(cb) {
    var done = false, timer = null;
    function fire() { if (done) return; done = true; if (obs) obs.disconnect(); clearTimeout(timer); cb(); }
    var obs = new MutationObserver(function () { clearTimeout(timer); timer = setTimeout(fire, 420); });
    try { obs.observe(document.body, { childList: true, subtree: true }); } catch (e) {}
    timer = setTimeout(fire, 420);   // fires if already stable
    setTimeout(fire, 5000);          // hard safety cap
  }

  function boot() {
    var tries = 0;
    (function poll() {
      if (window.anime && $('#top h1') && $('section')) {
        whenSettled(function () {
          guard(cursor); guard(scrollFx); guard(hero); guard(svg); guard(magnetic);
          guard(reveals); guard(counters); guard(tilt); guard(circularGallery); guard(textFill);
        });
        return;
      }
      if (tries++ > 400) { guard(cursor); guard(scrollFx); return; }
      setTimeout(poll, 40);
    })();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
