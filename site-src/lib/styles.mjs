import { BASE_CSS } from "./styles-base.mjs";

// What the custom-order site adds to the Verdara base: the services menu, the
// local proof strip, migrated page content (.prose), the quote band around the
// quote-form iframe, review cards, area links, the owner block, a photo
// lightbox and the hero's order card. Same tokens, one shadow, pill buttons,
// 20 px cards — nothing new in the visual language.

const ADDITIONS = `
/* Header: the services menu is a <details> (works without JS; site.js closes
   it on outside click and Escape). */
.nav-menu{position:relative}
.nav-menu > summary{display:inline-flex;align-items:center;gap:6px;min-height:40px;padding:0 15px;border-radius:var(--pill);color:var(--navy);font:500 .9375rem/1 var(--text);cursor:pointer;list-style:none}
.nav-menu > summary::-webkit-details-marker{display:none}
.nav-menu > summary .icon{width:14px;height:14px;transition:rotate 160ms ease}
.nav-menu[open] > summary .icon{rotate:180deg}
.nav-menu > summary:hover,.nav-menu[open] > summary{background:var(--sand)}
.nav-menu[data-current] > summary{background:var(--navy);color:var(--parchment)}
.nav-panel{position:absolute;top:calc(100% + 8px);left:0;z-index:60;display:grid;gap:2px;min-width:290px;padding:10px;border-radius:var(--r-lg);background:var(--surface);border:1px solid var(--hairline);box-shadow:var(--lift)}
.nav-panel a{display:flex;align-items:center;gap:12px;min-height:44px;padding:0 12px;border-radius:12px;color:var(--navy);font:500 .9375rem/1.2 var(--text);text-decoration:none}
.nav-panel a .icon{width:20px;height:20px;color:var(--blue)}
.nav-panel a:hover{background:var(--sand)}
.nav-panel a[aria-current="page"]{background:var(--sand);font-weight:600}
.header-phone{display:none;align-items:center;gap:8px;min-height:44px;padding:0 14px;border-radius:var(--pill);color:var(--navy);font:600 .9375rem/1 var(--text);text-decoration:none}
.header-phone .icon{width:18px;height:18px;color:var(--blue)}
.header-phone:hover{background:var(--sand);color:var(--navy)}
@media (min-width:1180px){.header-phone{display:inline-flex}}
.header-call{display:inline-grid;place-items:center;width:44px;height:44px;border-radius:50%;box-shadow:inset 0 0 0 1.5px var(--navy);color:var(--navy)}
.header-call .icon{width:20px;height:20px}
@media (min-width:960px){.header-call{display:none}}
.site-menu .menu-group{padding:18px 0 6px;color:var(--muted)}
.site-menu .menu-sub{display:flex;align-items:center;gap:12px;min-height:50px;border-bottom:1px solid var(--hairline);color:var(--navy);font:600 1.0625rem/1.2 var(--text);text-decoration:none}
.site-menu .menu-sub .icon{width:20px;height:20px;color:var(--blue)}

/* The local proof strip under a hero: rating, address, hours, call/text. */
.local-strip{display:flex;flex-wrap:wrap;align-items:center;gap:10px 28px;padding:16px 0;border-block:1px solid var(--hairline);font-size:.9375rem;color:var(--ink)}
.local-strip > *{display:inline-flex;align-items:center;gap:8px}
.local-strip .icon{width:18px;height:18px;color:var(--blue)}
.local-strip a{color:var(--navy);font-weight:600;text-decoration:none}
.local-strip a:hover{text-decoration:underline}
.local-strip .rating{font-weight:400}

/* Hero order card (in place of the Studio's release card). */
.order-card{position:absolute;z-index:4;left:0;bottom:6px;width:min(88%,350px);rotate:-2deg;display:grid;gap:10px;border-radius:18px;background:var(--surface);color:var(--ink);padding:16px 18px;box-shadow:var(--lift)}
.order-card .oc-title{display:flex;align-items:center;justify-content:space-between;gap:10px;font:700 1.0625rem/1.2 var(--display);color:var(--navy)}
.order-card ol{display:grid;gap:8px;margin:0;padding:0;list-style:none;font-size:.875rem}
.order-card li{display:grid;grid-template-columns:22px minmax(0,1fr);gap:10px;align-items:start}
.order-card li .icon{width:20px;height:20px;color:var(--blue)}
.order-card li b{color:var(--navy);font-weight:600}
@media (max-width:959px){.order-card{left:4%;width:92%}}

/* Page heroes with a photo (services, local pages). */
.page-hero .hero-grid{align-items:center}
.page-hero .eyebrow{margin-bottom:14px;color:var(--brown)}
.hero-photo-card{margin:0;border-radius:var(--r-xl);overflow:hidden;background:var(--sand);box-shadow:var(--lift);aspect-ratio:4/3}
.hero-photo-card picture,.hero-photo-card img{width:100%;height:100%;object-fit:cover}
.hero-photo-card figcaption{padding:10px 14px;font-size:.8125rem;color:var(--muted);background:var(--surface)}
.crumbs{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 18px;padding:0;list-style:none;font-size:.875rem;color:var(--muted)}
.crumbs li + li::before{content:"/";margin-right:6px;color:var(--hairline)}
.crumbs a{color:var(--muted)}

/* Migrated page content. */
.prose{max-width:72ch}
.prose--wide{max-width:none}
.prose > * + *{margin-top:16px}
.prose h2{font-size:clamp(1.75rem,1.3rem + 1.8vw,2.625rem);line-height:1.08;margin-top:8px}
.prose h3{font-size:1.375rem;line-height:1.2;margin-top:28px}
.prose h4{font-size:1.125rem;margin-top:22px}
.prose p,.prose li{color:var(--ink)}
.prose ul,.prose ol{display:grid;gap:8px;padding-left:22px}
.prose ul li::marker{color:var(--brown)}
.prose .kicker,.kicker{font:600 .75rem/1.3 var(--text);letter-spacing:.08em;text-transform:uppercase;color:var(--brown)}
.prose .kicker + h2,.prose .kicker + h3{margin-top:8px}
.prose table{width:100%;border-collapse:collapse;font-size:.9375rem;background:var(--surface);border-radius:var(--r-lg);overflow:hidden;box-shadow:0 0 0 1px var(--hairline)}
.prose th,.prose td{padding:12px 16px;text-align:left;border-bottom:1px solid var(--hairline);vertical-align:top}
.prose thead th{background:var(--parchment);font:600 .75rem/1.3 var(--text);letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
.prose tbody tr:last-child :is(th,td){border-bottom:0}
.prose .table-scroll{overflow-x:auto}
.card-grid{display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));margin-top:24px}
.card-grid article{display:grid;gap:10px;align-content:start;padding:24px;border-radius:var(--r-lg);background:var(--surface);border:1px solid var(--hairline)}
.section--sand .card-grid article{background:var(--parchment)}
.card-grid article h3,.card-grid article h4{margin:0;font-size:1.25rem}
.card-grid article p{color:var(--muted);font-size:.9375rem}
.card-grid article:nth-child(4n+1){border-top:4px solid var(--tan)}
.card-grid article:nth-child(4n+2){border-top:4px solid var(--sky)}
.card-grid article:nth-child(4n+3){border-top:4px solid var(--blue)}
.card-grid article:nth-child(4n+4){border-top:4px solid var(--navy)}
.img-grid{display:grid;gap:14px;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));margin-top:24px}
.img-grid img{width:100%;border-radius:var(--r-lg)}
.block-split{display:grid;gap:36px;align-items:start}
@media (min-width:960px){.block-split{grid-template-columns:minmax(0,1.35fr) minmax(0,1fr);gap:56px}}
.aside-stack{display:grid;gap:16px}

/* Service tiles (home): one colour each, rotating; icon, name, line, link. */
.service-tiles{display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));padding:0;list-style:none}
.service-tiles > li{display:contents}
.service-tile{display:grid;gap:10px;align-content:start;min-height:210px;padding:24px;border-radius:var(--r-lg);text-decoration:none;color:var(--ink);transition:translate 160ms ease,box-shadow 160ms ease}
.service-tile:hover{translate:0 -3px;box-shadow:var(--lift);color:var(--ink)}
.service-tile .icon{width:34px;height:34px;color:var(--navy)}
.service-tile h3{font-size:1.5rem;color:var(--navy)}
.service-tile p{font-size:.9375rem}
.service-tile .text-link{margin-top:auto;color:var(--navy)}
.service-tile:nth-child(4n+1){background:var(--tan)}
.service-tile:nth-child(4n+2){background:var(--sky)}
.service-tile:nth-child(4n+3){background:var(--sand)}
.service-tile:nth-child(4n+4){background:var(--navy);color:var(--parchment)}
.service-tile:nth-child(4n+4) :is(h3,.icon,.text-link){color:var(--parchment)}
.service-tile:nth-child(4n+4):hover{color:var(--parchment)}

/* Quote band: the embedded quote form on a surface card beside what happens next. */
.quote-band{display:grid;gap:28px}
@media (min-width:1020px){.quote-band{grid-template-columns:minmax(0,.8fr) minmax(0,1.2fr);gap:48px;align-items:start}}
.quote-frame{border-radius:var(--r-xl);background:var(--surface);border:1px solid var(--hairline);box-shadow:var(--lift);overflow:hidden}
.quote-frame iframe{display:block;width:100%;height:760px;border:0}
@media (max-width:767px){.quote-frame iframe{height:680px}}
.quote-next{display:grid;gap:18px;align-content:start}
.quote-next .checklist{margin-top:6px}
.quote-alt{padding:18px 20px;border-radius:var(--r-lg);background:var(--sand)}
.quote-alt b{display:block;color:var(--navy)}
.quote-alt a{font-weight:600}

/* Reviews: real Google reviews the owner published, with source and date. */
.reviews{display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));padding:0;list-style:none}
.review{display:grid;gap:14px;align-content:start;padding:24px;border-radius:var(--r-lg);background:var(--surface);border:1px solid var(--hairline)}
.section--sand .review{background:var(--parchment)}
.review blockquote{margin:0;font:500 1.0625rem/1.5 var(--display);color:var(--navy)}
.review footer{display:flex;align-items:center;gap:12px;font-size:.875rem;color:var(--muted)}
.review footer img{width:40px;height:40px;border-radius:50%;object-fit:cover;background:var(--sand)}
.review footer b{display:block;color:var(--ink);font-weight:600}
.review .stars{display:inline-flex;gap:2px;color:var(--brown)}
.review .stars .icon{width:16px;height:16px}

/* Areas: local pages as pill links. */
.areas{display:flex;flex-wrap:wrap;gap:8px;padding:0;list-style:none}
.areas a{display:inline-flex;align-items:center;gap:6px;min-height:40px;padding:0 16px;border-radius:var(--pill);background:var(--surface);border:1px solid var(--hairline);color:var(--navy);font:500 .9375rem/1 var(--text);text-decoration:none}
.areas a:hover{background:var(--sand)}
.areas a[aria-current="page"]{background:var(--navy);border-color:var(--navy);color:var(--parchment)}
.area-groups{display:grid;gap:32px}
.area-groups h3{margin-bottom:14px}

/* The owner: photo, words, credentials. */
.owner{display:grid;gap:32px;align-items:center}
@media (min-width:960px){.owner{grid-template-columns:minmax(0,.85fr) minmax(0,1.15fr);gap:56px}}
.owner .photo{aspect-ratio:4/5}
.photo picture{height:100%}
.owner .signature{width:160px;height:auto;margin-top:6px;opacity:.85}
.owner blockquote{margin:18px 0 0;font:500 1.25rem/1.5 var(--display);color:var(--navy)}

/* Gallery lightbox (a native <dialog>; site.js opens it). */
.gallery a{display:block}
.gallery a:focus-visible{outline-offset:-3px}
.lightbox{width:min(96vw,1100px);max-height:92vh;padding:0;border:0;border-radius:var(--r-lg);background:var(--ink);color:var(--parchment)}
.lightbox::backdrop{background:rgba(16,32,47,.82)}
.lightbox img{width:100%;max-height:82vh;object-fit:contain}
.lightbox-bar{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 14px;font-size:.875rem}
.lightbox-bar button{display:inline-grid;place-items:center;width:40px;height:40px;border:0;border-radius:50%;background:var(--parchment);color:var(--navy);cursor:pointer}

/* Thank-you and quote pages: a narrow centred column. */
.narrow{max-width:760px;margin-inline:auto}
.next-steps{counter-reset:step;display:grid;gap:14px;padding:0;list-style:none}
.next-steps li{counter-increment:step;display:grid;grid-template-columns:44px minmax(0,1fr);gap:14px;align-items:start}
.next-steps li::before{content:counter(step);display:grid;place-items:center;width:44px;height:44px;border-radius:14px;background:var(--tan);color:var(--navy);font:700 1.25rem/1 var(--display)}
.next-steps b{display:block;color:var(--navy)}

/* The quick-answer callout (comparison and hub pages). */
.callout{padding:22px 26px;border-radius:var(--r-lg);background:var(--sky);color:var(--ink)}
.callout p{font-size:1.0625rem}
`;


// Owner feedback, 2026-10-15: less space between sections, and photos keep
// their real proportions (never cropped shorter). These come last so they
// override the base.
const REFINEMENTS = `
/* Spacing: about a third less, and no doubled gap where two neighbouring
   sections share a ground. */
:root{--section:clamp(40px,5vw,72px)}
.section--tight{padding-block:clamp(14px,2.2vw,24px)}
.section--tight + .section--tight{padding-top:0}
.section:not(.section--sand) + .section:not(.section--sand),.section--sand + .section--sand{padding-top:0}
.hero{padding-block:clamp(20px,3.5vw,44px) clamp(28px,4vw,56px)}
.page-hero{padding-block:clamp(22px,3.5vw,44px) clamp(18px,2.5vw,32px)}
.section-head{margin-bottom:clamp(20px,2.8vw,36px)}
.closing{padding:clamp(28px,4vw,52px)}
.step{padding:18px 0}
.faq summary{padding:18px 0}
.faq .answer{padding-bottom:18px}
.hero-art{padding:32px 0 84px}
@media (max-width:959px){.hero-art{padding:24px 0 132px}}

/* Photos keep their own proportions: no forced aspect ratios or cover-crops
   (the decorative collage cards included). */
.hero-photo,.hero-photo-card,.owner .photo,.photo,.cl{aspect-ratio:auto!important}
.hero-photo picture,.hero-photo-card picture,.photo picture,.cl picture{height:auto}
.hero-photo img,.hero-photo-card img,.photo img,.cl img{height:auto!important;object-fit:contain}
.gallery,.img-grid{display:block;columns:2 200px;column-gap:14px}
@media (min-width:900px){.gallery{columns:3 220px}}
.gallery li,.img-grid > *{break-inside:avoid;margin:0 0 14px}
.gallery img,.img-grid img{height:auto}
.gallery li{background:transparent}
.gallery img,.img-grid img{border-radius:var(--r-lg)}

/* The CTA band between sections. */
.cta-band{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:14px 28px;padding:18px 24px;border-radius:var(--r-lg);background:var(--surface);border:1px solid var(--hairline)}
.section--sand .cta-band{background:var(--parchment)}
.cta-band p{max-width:60ch;color:var(--muted)}
.cta-band p b{color:var(--navy);font-weight:600}
.cta-band-actions{display:flex;flex-wrap:wrap;align-items:center;gap:10px 22px}
@media (max-width:519px){.cta-band-actions .btn{width:100%}}

/* Header: room for "See Your Price Instantly" from laptop width down to phones. */
@media (min-width:960px) and (max-width:1179px){.site-header .brand-name{display:none}.primary-nav a,.nav-menu > summary{padding:0 11px}}
@media (max-width:659px){.site-header .brand-name{display:none}}
@media (max-width:519px){.header-cta{padding:0 14px}.menu-button{padding:0 12px}.menu-button .menu-label{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap}}
@media (min-width:440px) and (max-width:519px){.header-cta .label-long{display:inline}.header-cta .label-short{display:none}}
@media (max-width:519px){.header-call{display:none}}
@media (max-width:399px){.header-call{display:none}}
@media (max-width:359px){.header-cta{display:inline-flex}.brand-mark{display:none}}
.sticky-cta .btn{flex:1}

/* The lead offer tile: tan colour block, offer left, two items, one action. */
.offer{display:grid;gap:18px 32px;align-items:center;padding:clamp(22px,3vw,32px);border-radius:var(--r-lg);background:var(--tan);color:var(--ink)}
@media (min-width:960px){.offer{grid-template-columns:minmax(0,1.3fr) minmax(0,1fr) auto}}
.offer .kicker{color:var(--navy)}
.offer h2{margin:6px 0 8px}
.offer h2 .accent{color:var(--navy)}
.offer-main p:last-child{max-width:52ch}
.offer-list{display:grid;gap:12px;margin:0;padding:0;list-style:none}
.offer-list li{display:grid;grid-template-columns:28px minmax(0,1fr);gap:10px;align-items:start}
.offer-list .icon{width:26px;height:26px;color:var(--navy)}
.offer-list b{display:block;color:var(--navy)}
.offer-list small{display:block;font-size:.875rem}
.offer-cta .btn{white-space:normal}
.offer-flag{display:inline-flex;align-items:center;gap:8px;margin:0 0 16px;padding:7px 14px 7px 8px;border-radius:var(--pill);background:var(--tan);color:var(--navy);font:600 .875rem/1.2 var(--text)}
.offer-flag .icon{width:22px;height:22px;padding:3px;border-radius:50%;background:var(--parchment)}

/* Reviews ticker: two offset rows drifting in opposite directions. */
.reviews-block{display:grid;gap:24px}
.reviews-head{display:grid;justify-items:center;gap:10px;text-align:center}
.reviews-head .muted{max-width:56ch}
.rating-line{display:inline-flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:6px 10px;color:var(--ink);font-size:.9375rem;text-decoration:none}
.rating-line .stars{display:inline-flex;gap:2px;color:var(--brown)}
.rating-line .stars .icon{width:20px;height:20px}
.rating-line b{color:var(--navy);font-weight:600}
a.rating-line:hover{text-decoration:underline;color:var(--navy)}
.rt{position:relative;display:grid;gap:14px;-webkit-mask-image:linear-gradient(90deg,transparent,#000 5%,#000 95%,transparent);mask-image:linear-gradient(90deg,transparent,#000 5%,#000 95%,transparent)}
.rt-row{overflow-x:auto;scrollbar-width:none;padding-block:2px}
.rt-row::-webkit-scrollbar{display:none}
.rt-track{display:flex;gap:14px;width:max-content;margin:0;padding:0 14px 0 0;list-style:none}
.rt-card{display:grid;gap:10px;align-content:start;width:min(80vw,330px);flex:none;padding:16px 18px;border-radius:18px;background:var(--surface);border:1px solid var(--hairline)}
.section--sand .rt-card{background:var(--parchment)}
.rt-top{display:flex;align-items:center;gap:10px}
.rt-top img,.rt-top .avatar{width:40px;height:40px;flex:none;border-radius:50%;object-fit:cover}
.rt-top .avatar{display:grid;place-items:center;background:var(--sky);color:var(--navy);font:700 1.0625rem/1 var(--display)}
.rt-who{display:grid;gap:3px;font-size:.875rem;line-height:1.2}
.rt-who b{color:var(--navy);font-weight:600}
.rt-who .stars{display:inline-flex;gap:1px;color:var(--brown)}
.rt-who .stars .icon{width:13px;height:13px}
.rt-g{margin-left:auto;width:20px;height:20px;color:var(--muted)}
.rt-text{font-size:.9375rem;line-height:1.5;color:var(--ink);display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden}
.rt:not(.is-live) .rt-card[aria-hidden="true"]{display:none}
.rt.is-live .rt-row{overflow:hidden}
.rt.is-live .rt-track{animation:rt-scroll var(--rt-dur,48s) linear infinite}
.rt.is-live .rt-row--b .rt-track{animation-direction:reverse;margin-left:-172px}
.rt.is-live:hover .rt-track,.rt.is-live:focus-within .rt-track,.rt.is-paused .rt-track{animation-play-state:paused}
@keyframes rt-scroll{to{transform:translateX(-50%)}}
.rt-toggle{justify-self:center}
.reviews-actions{justify-content:center;align-items:center;margin-top:0}
@media (prefers-reduced-motion:reduce){.rt-track{animation:none!important}}
.ways{display:grid;gap:18px;grid-template-columns:repeat(auto-fit,minmax(300px,1fr))}
.ways .checklist{margin-bottom:22px}
`;

export const SITE_CSS = BASE_CSS + ADDITIONS + REFINEMENTS;
