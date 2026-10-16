// The site's one script (built to ark-site-review/assets/site.js). Every page
// is complete without it; it adds behaviour only. The Google Ads conversion
// bridge for the quote form is inserted below by build.mjs, byte for byte from
// the old global.js.
/* @@CONVERSION_BRIDGE@@ */

(function () {
  "use strict";
  var doc = document;
  var root = doc.documentElement;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hasIO = "IntersectionObserver" in window;
  function track(name, params) { if (typeof window.gtag === "function") window.gtag("event", name, params); }
  function store(key, value) { try { if (value === undefined) return window.sessionStorage.getItem(key); window.sessionStorage.setItem(key, value); } catch (e) { return null; } return null; }

  // Header: hairline once scrolled; mobile menu; the Services menu closes on
  // outside click and Escape.
  var header = doc.querySelector("[data-header]");
  var sentinel = doc.querySelector("[data-scroll-sentinel]");
  if (header && sentinel && hasIO) {
    new IntersectionObserver(function (e) { header.classList.toggle("scrolled", !e[0].isIntersecting); }).observe(sentinel);
  }
  var toggle = doc.querySelector("[data-menu-toggle]");
  var menu = doc.getElementById("site-menu");
  if (toggle && menu) {
    toggle.addEventListener("click", function () {
      var open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!open));
      menu.hidden = open;
    });
  }
  var navMenus = doc.querySelectorAll(".nav-menu");
  doc.addEventListener("click", function (e) { navMenus.forEach(function (d) { if (d.open && !d.contains(e.target)) d.open = false; }); });
  doc.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    navMenus.forEach(function (d) { if (d.open) { d.open = false; d.querySelector("summary").focus(); } });
    if (toggle && toggle.getAttribute("aria-expanded") === "true") { toggle.click(); toggle.focus(); }
  });

  // A "who we print for" strip loops by sliding exactly half its length, so
  // each half has to be wider than the strip's window — otherwise a gap opens
  // before the loop comes round (owner, 2026-10-16). Repeat the list (the
  // copies are aria-hidden: it's read once) until a half is wide enough, and
  // set the duration from that width so the strip moves at an even pace.
  var TICKER_SPEED = 32; // px a second
  function fillTicker(t) {
    var win = t.querySelector(".ticker-window");
    var list = t.querySelector(".ticker-track");
    if (!win || !list) return;
    var items = [];
    [].slice.call(list.children).forEach(function (li) {
      if (li.getAttribute("aria-hidden") === "true") list.removeChild(li);
      else items.push(li);
    });
    var one = list.scrollWidth;
    if (!items.length || !one) return;
    var copies = Math.max(1, Math.ceil((win.clientWidth + 40) / one));
    var add = function (n) {
      for (var c = 0; c < n; c += 1) items.forEach(function (li) { var dup = li.cloneNode(true); dup.setAttribute("aria-hidden", "true"); list.appendChild(dup); });
    };
    add(copies - 1); // the rest of the first half
    add(copies); // the second half, identical to the first
    list.style.setProperty("--ticker-dur", Math.round((one * copies) / TICKER_SPEED) + "s");
  }

  // Who we print for: moves only with a working pause button (WCAG 2.2.2).
  doc.querySelectorAll("[data-ticker]").forEach(function (t) {
    var btn = t.querySelector("[data-ticker-toggle]");
    if (!btn || reduce) return;
    btn.hidden = false;
    t.classList.add("is-live");
    if (t.querySelector(".ticker-window")) {
      fillTicker(t);
      // Web fonts and a wider window change the widths: fill again.
      if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(function () { fillTicker(t); });
      var lastWidth = window.innerWidth;
      var resizing = 0;
      window.addEventListener("resize", function () {
        clearTimeout(resizing);
        resizing = setTimeout(function () {
          if (window.innerWidth === lastWidth) return;
          lastWidth = window.innerWidth;
          fillTicker(t);
        }, 200);
      });
    }
    btn.addEventListener("click", function () {
      var paused = btn.getAttribute("aria-pressed") !== "true";
      btn.setAttribute("aria-pressed", String(paused));
      t.classList.toggle("is-paused", paused);
    });
    // Keyboard: a review link that takes focus stops its row (CSS
    // :focus-within) and is brought to the middle, so focus never sits on a
    // card the strip has carried off screen (WCAG 2.4.7, 2.4.11).
    t.addEventListener("focusin", function (e) {
      var card = e.target.closest && e.target.closest(".rt-card");
      if (card && card.scrollIntoView) card.scrollIntoView({ block: "nearest", inline: "center" });
    });
    t.addEventListener("focusout", function (e) {
      if (!t.contains(e.relatedTarget)) t.querySelectorAll(".rt-row").forEach(function (r) { r.scrollLeft = 0; });
    });
  });

  // Google reviews, live, on the Reviews page: until the Business Profile
  // sync is approved, its ticker swaps the built-in reviews for the newest
  // ones in the owner's Starwall feed (REVIEWS_FEED in facts.mjs). The feed
  // is read fresh on every view and never stored (Google's terms; the feed
  // says no-store). Every value is checked and set as text, never as HTML;
  // any failure keeps the built-in reviews. Cards match tickerCard() in
  // components.mjs.
  function el(tag, cls) { var n = doc.createElement(tag); if (cls) n.className = cls; return n; }
  // Only the addresses Google actually serves: review pages on Google Maps
  // and reviewers' profile photos. Matching the parsed href also rules out
  // other google.com pages, redirects and user:password@ tricks.
  var PHOTO_URL = /^https:\/\/lh\d+\.googleusercontent\.com\/a-?\//;
  var REVIEW_URL = /^https:\/\/www\.google\.com\/maps\//;
  function safeUrl(u, ok) {
    if (typeof u !== "string") return "";
    try { var x = new URL(u); return ok.test(x.href) ? x.href : ""; } catch (e) { return ""; }
  }
  function readFeed(data) {
    if (!data || !Array.isArray(data.reviews)) return null;
    var c = data.collection || {};
    var loc = data.location || {};
    var reviews = [];
    data.reviews.forEach(function (r) {
      if (!r || typeof r.author_name !== "string" || typeof r.review_text !== "string") return;
      var name = r.author_name.replace(/\s+/g, " ").trim().slice(0, 60);
      var text = r.review_text.replace(/<br\s*\/?>|&lt;br\s*\/?&gt;/gi, " ").replace(/\s+/g, " ").trim().slice(0, 800);
      var rating = Math.round(Number(r.rating));
      if (!name || !text || !(rating >= 1 && rating <= 5)) return;
      if (c.show_full_names === false && name.indexOf(" ") > 0) name = name.split(" ")[0] + " " + name.split(" ").pop().charAt(0) + ".";
      reviews.push({
        name: name, text: text, rating: rating,
        photo: c.show_author_photos === false ? "" : safeUrl(r.author_photo, PHOTO_URL),
        url: safeUrl(r.review_url, REVIEW_URL),
      });
    });
    if (reviews.length < 2) return null;
    var avg = Number(loc.average_rating), total = Number(loc.total_reviews);
    return { reviews: reviews.slice(0, 30), rating: avg >= 1 && avg <= 5 ? avg : 0, count: total >= 1 && total % 1 === 0 ? total : 0 };
  }
  function tone(name) { for (var i = 0, n = 0; i < name.length; i += 1) n += name.charCodeAt(i); return n % 3; }
  function initialAvatar(name) {
    var s = el("span", "rt-av rt-av--t" + tone(name));
    s.setAttribute("aria-hidden", "true");
    s.textContent = name.charAt(0).toUpperCase();
    return s;
  }
  function reviewCard(r, hidden, g, star) {
    var photo = r.photo;
    var url = r.url;
    var li = el("li", "rt-card");
    if (hidden) li.setAttribute("aria-hidden", "true");
    var av = initialAvatar(r.name);
    if (photo) {
      var img = el("img", "rt-av");
      img.width = 44; img.height = 44; img.alt = ""; img.loading = "lazy"; img.decoding = "async"; img.referrerPolicy = "no-referrer";
      img.addEventListener("error", function () { if (img.parentNode) img.parentNode.replaceChild(initialAvatar(r.name), img); });
      img.src = photo;
      av = img;
    }
    var body = el("div", "rt-body");
    var text = el("p", "rt-text");
    text.textContent = r.text;
    var foot = el("p", "rt-foot");
    var who = el("b", "rt-name");
    var at = el("span");
    at.setAttribute("aria-hidden", "true");
    at.textContent = "@";
    who.appendChild(at);
    who.appendChild(doc.createTextNode(r.name));
    var stars = el("span", "rt-stars");
    stars.setAttribute("aria-hidden", "true");
    for (var s = 0; star && s < r.rating; s += 1) stars.appendChild(star.cloneNode(true));
    var said = el("span", "visually-hidden");
    said.textContent = ", rated " + r.rating + " out of 5 on Google";
    foot.appendChild(who);
    foot.appendChild(stars);
    foot.appendChild(said);
    var mark = g.cloneNode(true);
    if (url) {
      var a = el("a", "rt-src");
      a.href = url; a.target = "_blank"; a.rel = "noopener";
      if (hidden) a.tabIndex = -1;
      a.setAttribute("aria-label", "Read " + r.name + "’s review on Google (opens Google)");
      a.appendChild(mark);
      foot.appendChild(a);
    } else foot.appendChild(mark);
    body.appendChild(text);
    body.appendChild(foot);
    li.appendChild(av);
    li.appendChild(body);
    return li;
  }
  function signature(list) { return list.slice().sort().join("\n"); }
  function showFeed(feed, tickers) {
    tickers.forEach(function (t) {
      var g = t.querySelector("svg.rt-g");
      var rows = t.querySelectorAll(".rt-row");
      if (!g || rows.length !== 2) return;
      // Nothing new: leave the strip alone rather than restart it.
      var shown = [];
      t.querySelectorAll('.rt-card:not([aria-hidden="true"])').forEach(function (c) {
        var link = c.querySelector(".rt-src");
        shown.push(c.querySelector(".rt-text").textContent + "|" + (link ? link.href : ""));
      });
      if (signature(shown) === signature(feed.reviews.map(function (r) { return r.text + "|" + r.url; }))) return;
      g = g.cloneNode(true);
      var star = t.querySelector(".rt-stars .icon") || doc.querySelector(".rating-line .stars .icon");
      star = star && star.cloneNode(true);
      t.classList.toggle("rt--rated", feed.reviews.some(function (r) { return r.rating < 5; }));
      var notes = t.querySelectorAll("[data-rv-note]");
      notes.forEach(function (n) { n.hidden = n.getAttribute("data-rv-note") !== "live"; });
      var split = [[], []];
      feed.reviews.forEach(function (r, i) { split[i % 2].push(r); });
      rows.forEach(function (row, k) {
        var track = row.querySelector(".rt-track");
        var items = split[k];
        var seq = items.map(function (r) { return { r: r, hidden: false }; });
        while (seq.length < 6) items.forEach(function (r) { seq.push({ r: r, hidden: true }); });
        var frag = doc.createDocumentFragment();
        seq.forEach(function (x) { frag.appendChild(reviewCard(x.r, x.hidden, g, star)); });
        seq.forEach(function (x) { frag.appendChild(reviewCard(x.r, true, g, star)); });
        track.textContent = "";
        track.appendChild(frag);
        track.style.setProperty("--rt-dur", seq.length * 7 + "s");
      });
    });
    // The rating line: Google's own total, only ever upwards from the count
    // built into the page (a lagging feed never shrinks it). Its stars follow
    // the live rating, and "as of" becomes this month — text changes only,
    // so nothing reflows.
    var built = parseInt((doc.querySelector("[data-rv-count]") || {}).textContent, 10) || 0;
    if (feed.count && feed.count >= built) {
      doc.querySelectorAll("[data-rv-count]").forEach(function (n) { n.textContent = String(feed.count); });
      if (feed.rating) doc.querySelectorAll("[data-rv-rating]").forEach(function (n) {
        n.textContent = feed.rating.toFixed(1);
        var box = n.closest && n.closest("a");
        var icons = box && box.querySelector(".stars");
        var want = Math.max(1, Math.round(feed.rating));
        if (!icons || !icons.firstElementChild) return;
        while (icons.children.length > want) icons.removeChild(icons.lastElementChild);
        while (icons.children.length < want) icons.appendChild(icons.firstElementChild.cloneNode(true));
      });
      if (window.Intl) {
        var month = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(new Date());
        doc.querySelectorAll("[data-rv-asof]").forEach(function (n) { n.textContent = month; });
      }
    }
  }
  var feedTickers = doc.querySelectorAll("[data-reviews-feed]");
  if (feedTickers.length && window.fetch && window.URL) {
    var ctl = window.AbortController ? new AbortController() : null;
    var timer = ctl ? setTimeout(function () { ctl.abort(); }, 8000) : 0;
    fetch(feedTickers[0].getAttribute("data-reviews-feed"), { credentials: "omit", cache: "no-store", signal: ctl ? ctl.signal : undefined })
      .then(function (r) { if (!r.ok) throw new Error("reviews feed " + r.status); return r.json(); })
      .then(function (data) {
        clearTimeout(timer);
        var feed = readFeed(data);
        if (feed) showFeed(feed, feedTickers);
      })
      .catch(function () { clearTimeout(timer); });
  }

  // Print on demand: the profit calculator (ported from the Studio's pages).
  // The bases come with the page (content/studio-pricing.json); this only
  // does the Studio's arithmetic — what you keep = your price − the tee's
  // base, never below zero — and says when a price sits below the base.
  var calc = doc.querySelector("[data-calculator]");
  var calcData = doc.getElementById("calculator-data");
  if (calc && calcData) {
    var pricing = null;
    try { pricing = JSON.parse(calcData.textContent || "{}"); } catch (e) { pricing = null; }
    var tees = pricing && Array.isArray(pricing.garments) ? pricing.garments : [];
    var priceIn = calc.querySelector("[data-calc-price]");
    var unitsIn = calc.querySelector("[data-calc-units]");
    var unitsOut = calc.querySelector("[data-calc-units-out]");
    var calcUsed = false;
    var dollars = function (n) { return "$" + n.toFixed(2); };
    var cents = function (n) { return Math.round(n * 100) / 100; };
    var setOut = function (name, text) { var n = calc.querySelector('[data-out="' + name + '"]'); if (n) n.textContent = text; };
    var chosen = function () {
      var checked = calc.querySelector('input[name="calc-garment"]:checked');
      for (var i = 0; i < tees.length; i += 1) if (checked && tees[i].key === checked.value) return tees[i];
      return tees[0];
    };
    var renderCalc = function () {
      var tee = chosen();
      if (!tee || !priceIn || !unitsIn) return;
      var price = Number(priceIn.value);
      var units = Math.max(1, Math.round(Number(unitsIn.value) || 1));
      var valid = isFinite(price) && price > 0;
      var keep = valid ? Math.max(0, cents(price - tee.dtfBase)) : 0;
      if (unitsOut) unitsOut.textContent = String(units);
      setOut("base", dollars(tee.dtfBase));
      setOut("keep", dollars(keep));
      setOut("total", dollars(cents(keep * units)));
      setOut("units", String(units));
      setOut("method", units >= pricing.screenMinimum ? "Screen printed by hand" : "DTF printed");
      var warning = calc.querySelector('[data-out="warning"]');
      if (warning) {
        var below = valid && price < tee.dtfBase;
        warning.hidden = !below;
        warning.textContent = below ? "Below the " + dollars(tee.dtfBase) + " base — the Studio won't let a price lose money, so the lowest you can set is the base." : "";
      }
    };
    var calcInput = function () {
      renderCalc();
      if (!calcUsed) { calcUsed = true; track("pod_calculator_used", {}); }
    };
    // Switching tee keeps the price typed; the warning says if it now sits
    // below that tee's base.
    calc.addEventListener("input", calcInput);
    calc.addEventListener("change", calcInput);
    renderCalc();
  }

  // Cards rise into place once as they scroll into view.
  if (hasIO && !reduce) {
    var items = doc.querySelectorAll("[data-appear]");
    if (items.length) {
      root.classList.add("motion");
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); } });
      }, { rootMargin: "0px 0px -8% 0px" });
      items.forEach(function (el) { io.observe(el); });
    }
  }

  // Hero collage: drifts at its own depths on desktop only.
  var art = doc.querySelector("[data-parallax]");
  var wide = window.matchMedia && window.matchMedia("(min-width: 960px)");
  if (art && wide && !reduce && window.requestAnimationFrame) {
    var layers = art.querySelectorAll("[data-depth]");
    var ticking = false;
    var visible = true;
    var apply = function () {
      ticking = false;
      if (!wide.matches || !visible) { layers.forEach(function (l) { l.style.translate = ""; l.style.rotate = ""; }); return; }
      var y = window.scrollY;
      layers.forEach(function (l) {
        var d = parseFloat(l.getAttribute("data-depth")) || 0;
        l.style.translate = "0 " + (-y * d).toFixed(1) + "px";
        var spin = parseFloat(l.getAttribute("data-spin") || "0");
        if (spin) l.style.rotate = (y * spin * 0.2).toFixed(1) + "deg";
      });
    };
    var onScroll = function () { if (!ticking) { ticking = true; window.requestAnimationFrame(apply); } };
    if (hasIO) new IntersectionObserver(function (e) { visible = e[0].isIntersecting; onScroll(); }).observe(art);
    window.addEventListener("scroll", onScroll, { passive: true });
    if (wide.addEventListener) wide.addEventListener("change", onScroll);
  }

  // Phone sticky CTA (paid pages): shows once the hero's buttons scroll away,
  // hides while the quote form is on screen.
  var sticky = doc.querySelector("[data-sticky-cta]");
  var heroCta = doc.querySelector(".page-hero .cta-row, .hero .cta-row");
  var quote = doc.getElementById("quote");
  if (sticky && heroCta && hasIO) {
    var past = false, atQuote = false;
    var update = function () { sticky.hidden = !past || atQuote; };
    new IntersectionObserver(function (e) { past = !e[0].isIntersecting && e[0].boundingClientRect.top < 0; update(); }).observe(heroCta);
    if (quote) new IntersectionObserver(function (e) { atQuote = e[0].isIntersecting; update(); }).observe(quote);
  }

  // Attribution: ad click IDs and UTM tags reach the quote form, from this
  // page's URL or from the landing page earlier in the visit.
  var KEYS = ["gclid", "gbraid", "wbraid", "fbclid", "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];
  var params = new URLSearchParams(window.location.search);
  var carried = {};
  try { carried = JSON.parse(store("ark_attr") || "{}") || {}; } catch (e) { carried = {}; }
  KEYS.forEach(function (k) { var v = params.get(k); if (v) carried[k] = v.slice(0, 200); });
  if (Object.keys(carried).length) store("ark_attr", JSON.stringify(carried));
  doc.querySelectorAll("[data-quote-frame]").forEach(function (frame) {
    var keys = Object.keys(carried);
    if (!keys.length) return;
    var url = new URL(frame.getAttribute("src"), window.location.href);
    keys.forEach(function (k) { if (!url.searchParams.has(k)) url.searchParams.set(k, carried[k]); });
    frame.setAttribute("src", url.toString());
  });

  // Calls, texts and CTA clicks as analytics events (not conversions).
  doc.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a");
    if (!a) return;
    var href = a.getAttribute("href") || "";
    var placement = a.getAttribute("data-cta") || "";
    if (href.indexOf("tel:") === 0) track("phone_click", { placement: placement, page: doc.body.dataset.page });
    else if (href.indexOf("sms:") === 0) track("text_click", { placement: placement, page: doc.body.dataset.page });
    else if (placement) track("cta_click", { placement: placement, page: doc.body.dataset.page });
  });

  // Gallery lightbox (a native <dialog>; plain links without it).
  var dialog = doc.querySelector("[data-lightbox-dialog]");
  if (dialog && typeof dialog.showModal === "function") {
    var img = dialog.querySelector("img");
    var cap = dialog.querySelector("[data-lightbox-caption]");
    doc.querySelectorAll("[data-lightbox]").forEach(function (link) {
      link.addEventListener("click", function (e) {
        e.preventDefault();
        img.src = link.getAttribute("href");
        img.alt = link.getAttribute("data-alt") || "";
        cap.textContent = link.getAttribute("data-alt") || "";
        dialog.showModal();
      });
    });
    dialog.querySelector("[data-lightbox-close]").addEventListener("click", function () { dialog.close(); });
    dialog.addEventListener("click", function (e) { if (e.target === dialog) dialog.close(); });
  }
})();
