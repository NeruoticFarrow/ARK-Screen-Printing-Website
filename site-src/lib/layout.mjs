import { APP, SERVICES, SHOP, SITE } from "./facts.mjs";
import { esc } from "./html.mjs";
import { icon } from "./icons.mjs";

// The page frame: <head> (metadata, fonts, the analytics tags every page has
// always carried), a parchment header with the ARK logo, a Services menu and
// one blue "See Your Price Instantly" button — or, on paid-search pages, a minimal header
// with nothing to click away to — the footer, and the one script.

const NAV = [
  { key: "gallery", label: "Our work", href: "/gallery" },
  { key: "testimonials", label: "Reviews", href: "/testimonials" },
  { key: "about", label: "About", href: "/about" },
  { key: "faq", label: "FAQ", href: "/faq" },
  { key: "service-areas", label: "Areas", href: "/service-areas" },
];

/** Analytics exactly as the old pages loaded them (GA4 + the Ads config). */
function analytics() {
  return `<script async src="https://www.googletagmanager.com/gtag/js?id=${SITE.ga4}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', '${SITE.ga4}');
  gtag('config', '${SITE.adsConfig}');
</script>`;
}

function wordmark() {
  return `<img class="brand-logo" src="/assets/brand/ark-logo-120.png" width="42" height="42" alt="" decoding="async"><span class="brand-mark" aria-hidden="true">ARK</span><span class="brand-name" aria-hidden="true">Screen Printing<small>${esc(SHOP.city)}, ${esc(SHOP.region)}</small></span>`;
}

// Where "See Your Price Instantly" goes: the quote form (on the page when it
// has one). A page whose price is something else says so — print on demand
// sends it to its profit calculator (owner, 2026-10-16).
const quoteHref = (o) => o.quoteHref ?? (o.hasQuote ? "#quote" : "/get-a-quote#quote");

function header(o) {
  if (o.chrome === "minimal") {
    return `<header class="site-header header-minimal" data-header>
  <div class="container header-inner">
    <div class="brand"><span class="visually-hidden">${esc(SHOP.name)}</span>${wordmark()}</div>
    <div class="header-actions">
      <a class="header-contact" href="${esc(SHOP.phoneHref)}" data-cta="nav_call">${icon("phone")}<span class="label">${esc(SHOP.phoneDisplay)}</span><span class="visually-hidden">Call ARK Screen Printing</span></a>
      <a class="btn btn--primary header-cta" href="#quote" data-cta="nav_quote" aria-label="See Your Price Instantly"><span class="label-long">See Your Price Instantly</span><span class="label-short">See Your Price</span></a>
    </div>
  </div>
</header>`;
  }
  const inServices = SERVICES.some((s) => s.slug === o.current);
  const services = SERVICES.map((s) => `<a href="/${s.slug}"${s.slug === o.current ? ' aria-current="page"' : ""}>${icon(s.icon)}${esc(s.label)}</a>`).join("");
  const nav = NAV.map((n) => `<li><a href="${n.href}"${n.key === o.current ? ' aria-current="page"' : ""}>${esc(n.label)}</a></li>`).join("");
  const mobileServices = SERVICES.map((s) => `<li><a class="menu-sub" href="/${s.slug}"${s.slug === o.current ? ' aria-current="page"' : ""}>${icon(s.icon)}${esc(s.label)}</a></li>`).join("");
  const mobileNav = NAV.map((n) => `<li><a class="menu-link" href="${n.href}"${n.key === o.current ? ' aria-current="page"' : ""}>${esc(n.label)}${icon("arrowRight")}</a></li>`).join("");
  return `<header class="site-header" data-header>
  <div class="container header-inner">
    <a class="brand" href="/"${o.current === "home" ? ' aria-current="page"' : ""}><span class="visually-hidden">${esc(SHOP.name)} — home</span>${wordmark()}</a>
    <nav class="primary-nav" aria-label="Main"><ul>
      <li><details class="nav-menu"${inServices ? " data-current" : ""}><summary>Services ${icon("caretDown")}</summary><div class="nav-panel">${services}</div></details></li>
      ${nav}
    </ul></nav>
    <div class="header-actions">
      <a class="header-phone" href="${esc(SHOP.phoneHref)}" data-cta="nav_call">${icon("phone")}${esc(SHOP.phoneDisplay)}</a>
      <a class="header-call" href="${esc(SHOP.phoneHref)}" data-cta="nav_call_icon">${icon("phone")}<span class="visually-hidden">Call ${esc(SHOP.phoneDisplay)}</span></a>
      <a class="btn btn--primary header-cta" href="${quoteHref(o)}" data-cta="nav_quote" aria-label="See Your Price Instantly"><span class="label-long">See Your Price Instantly</span><span class="label-short">See Your Price</span></a>
      <button class="menu-button" type="button" aria-expanded="false" aria-controls="site-menu" data-menu-toggle>${icon("list", "icon open")}${icon("x", "icon close")}<span class="menu-label">Menu</span></button>
    </div>
  </div>
  <div class="site-menu" id="site-menu" hidden>
    <nav class="container" aria-label="Main (mobile)">
      <div class="menu-actions">
        <a class="btn btn--primary btn--lg" href="${quoteHref(o)}" data-cta="menu_quote">See Your Price Instantly ${icon("arrowRight")}</a>
        <a class="btn btn--ghost" href="${esc(SHOP.phoneHref)}" data-cta="menu_call">${icon("phone")}Call ${esc(SHOP.phoneDisplay)}</a>
        <a class="btn btn--ghost" href="${esc(SHOP.smsHref)}" data-cta="menu_text">${icon("chatCircleText")}Text us</a>
      </div>
      <p class="label menu-group">Services</p>
      <ul>${mobileServices}</ul>
      <ul>${mobileNav}</ul>
    </nav>
  </div>
</header>`;
}

function footer(o) {
  const year = new Date().getFullYear();
  // The reviews show Google's "G", so Google's brand terms ask for its legal line.
  const legal = `<a href="${APP.terms}">Terms</a> · <a href="${APP.privacy}">Privacy</a> · <a href="${APP.refunds}">Refunds</a> · Google and the Google logo are trademarks of Google LLC.`;
  if (o.chrome === "minimal") {
    // Paid pages still carry the business's identity, contact and policies.
    return `<footer class="site-footer footer-minimal">
  <div class="container">
    <div class="footer-bottom">
      <span>© ${year} ${esc(SHOP.name)} · ${esc(SHOP.cityLine)} · <a href="${esc(SHOP.phoneHref)}">${esc(SHOP.phoneDisplay)}</a></span>
      <span>${legal}</span>
    </div>
  </div>
</footer>`;
  }
  return `<footer class="site-footer">
  <div class="container">
    <div class="footer-grid">
      <div class="footer-about">
        <a class="brand" href="/"><span class="visually-hidden">${esc(SHOP.name)} — home</span>${wordmark()}</a>
        <p>Screen printing, DTF printing and embroidery, done in-house in ${esc(SHOP.city)} by the people you talk to.</p>
        <ul>
          <li><a href="${esc(SHOP.mapsUrl)}" target="_blank" rel="noopener">${esc(SHOP.cityLine)}<span class="visually-hidden"> (opens Google Maps)</span></a></li>
          <li>${esc(SHOP.hours)}</li>
          <li><a href="${esc(SHOP.phoneHref)}">Call ${esc(SHOP.phoneDisplay)}</a> · <a href="${esc(SHOP.smsHref)}">Text</a></li>
          <li><a href="mailto:${esc(SHOP.email)}">${esc(SHOP.email)}</a></li>
        </ul>
      </div>
      <nav aria-label="Services">
        <h2>Services</h2>
        <ul>${SERVICES.map((s) => `<li><a href="/${s.slug}">${esc(s.label)}</a></li>`).join("")}</ul>
      </nav>
      <nav aria-label="The shop">
        <h2>The shop</h2>
        <ul>
          <li><a href="/gallery">Our work</a></li>
          <li><a href="/testimonials">Reviews</a></li>
          <li><a href="/about">About ARK</a></li>
          <li><a href="/faq">FAQ</a></li>
          <li><a href="/service-areas">Service areas</a></li>
          <li><a href="${APP.artwork}">Artwork guidelines (PDF)</a></li>
          <li><a href="/print-on-demand">Sell merch online</a></li>
        </ul>
      </nav>
      <nav aria-label="Orders">
        <h2>Orders</h2>
        <ul>
          <li><a href="/get-a-quote#quote">See Your Price Instantly</a></li>
          <li><a href="${APP.trackOrder}">Track an order</a></li>
          <li><a href="${APP.wholesale}">Wholesale accounts</a></li>
          <li><a href="${APP.shipping}">Shipping policy</a></li>
        </ul>
      </nav>
    </div>
    <div class="footer-bottom">
      <span>© ${year} ${esc(SHOP.name)} · ${esc(SHOP.cityLine)}</span>
      <span>${legal}</span>
    </div>
  </div>
</footer>`;
}

/**
 * @param {{title: string, description: string|null, canonical: string|null, robots?: string|null,
 *   ogImage?: string|null, chrome: "full"|"minimal", current: string, hasQuote?: boolean,
 *   jsonLd?: string, main: string, sticky?: boolean, head?: string, css: string, page: string}} o
 */
export function shell(o) {
  const og = o.ogImage ? `<meta property="og:image" content="${esc(o.ogImage)}"><meta name="twitter:image" content="${esc(o.ogImage)}">` : "";
  // The phone sticky bar on every page (not thank-you): it appears once the
  // hero's buttons scroll away and hides while the quote form is on screen.
  o.sticky = o.sticky ?? !["thank-you", "get-a-quote"].includes(o.page);
  const stickyAction = o.stickyAction ?? { href: quoteHref(o), label: "See Your Price Instantly", placement: "sticky_quote" };
  const sticky = o.sticky
    ? `<div class="sticky-cta" data-sticky-cta hidden><a class="btn btn--primary" href="${esc(stickyAction.href)}" data-cta="${esc(stickyAction.placement)}">${esc(stickyAction.label)} ${icon("arrowRight")}</a><a class="header-call" href="${esc(SHOP.phoneHref)}" data-cta="sticky_call">${icon("phone")}<span class="visually-hidden">Call ${esc(SHOP.phoneDisplay)}</span></a></div>`
    : "";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(o.title)}</title>
${o.description ? `<meta name="description" content="${esc(o.description)}">` : ""}
${o.canonical ? `<link rel="canonical" href="${esc(o.canonical)}">` : ""}
${o.robots ? `<meta name="robots" content="${esc(o.robots)}">` : ""}
<meta name="generator" content="ark-site-src">
<meta name="theme-color" content="#f5eedf">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(SHOP.name)}">
<meta property="og:locale" content="en_US">
<meta property="og:title" content="${esc(o.title)}">
${o.description ? `<meta property="og:description" content="${esc(o.description)}">` : ""}
${o.canonical ? `<meta property="og:url" content="${esc(o.canonical)}">` : ""}
<meta name="twitter:card" content="summary_large_image">
${og}
<link rel="icon" href="/images/favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="32x32" href="/images/favicon-32x32-optimized.png">
<link rel="apple-touch-icon" sizes="180x180" href="/images/apple-touch-icon.png">
<link rel="preload" href="/fonts/gf/fraunces-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/gf/inter-400.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/site.css?v=${o.css}">
${analytics()}
${o.jsonLd ?? ""}
${o.head ?? ""}
</head>
<body data-page="${esc(o.page)}"${o.sticky ? ' class="has-sticky"' : ""}>
<a class="skip-link" href="#main">Skip to content</a>
<div data-scroll-sentinel aria-hidden="true"></div>
${header(o)}
<main id="main">
${o.main}
</main>
${footer(o)}
${sticky}
<script src="/assets/site.js?v=${o.css}" defer></script>
</body>
</html>
`;
}
