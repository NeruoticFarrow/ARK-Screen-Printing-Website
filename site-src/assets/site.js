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

  // Who we print for: moves only with a working pause button (WCAG 2.2.2).
  doc.querySelectorAll("[data-ticker]").forEach(function (t) {
    var btn = t.querySelector("[data-ticker-toggle]");
    if (!btn || reduce) return;
    btn.hidden = false;
    t.classList.add("is-live");
    btn.addEventListener("click", function () {
      var paused = btn.getAttribute("aria-pressed") !== "true";
      btn.setAttribute("aria-pressed", String(paused));
      t.classList.toggle("is-paused", paused);
    });
  });

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
