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
.reviews-head{display:grid;justify-items:center;gap:12px;text-align:center}
.reviews-head .muted{max-width:56ch}
.rating-line{display:inline-flex;flex-direction:column;align-items:center;gap:8px;color:var(--ink);font-size:.9375rem;text-decoration:none}
.rating-line .stars{display:inline-flex;gap:4px;color:var(--brown)}
.rating-line .stars .icon{width:20px;height:20px}
.rating-line b{color:var(--navy);font-weight:600}
a.rating-line:hover{text-decoration:underline;color:var(--navy)}
.rt{position:relative;display:grid;gap:16px;-webkit-mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent);mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent)}
.rt-row{overflow-x:auto;scrollbar-width:none;padding-block:2px}
.rt-row::-webkit-scrollbar{display:none}
.rt-track{display:flex;gap:16px;width:max-content;margin:0;padding:0 16px 0 0;list-style:none}
.rt-card{display:grid;grid-template-columns:44px minmax(0,1fr);gap:16px;align-items:start;width:min(80vw,360px);flex:none;padding:20px;border-radius:var(--r-md);background:var(--surface);border:1px solid var(--hairline)}
.section--sand .rt-card{background:var(--parchment)}
.rt-av{width:44px;height:44px;border-radius:50%;object-fit:cover}
img.rt-av{background:var(--sand)}
span.rt-av{display:grid;place-items:center;color:#fff;font:600 1.125rem/1 var(--text)}
.rt-av--t0{background:var(--blue)}
.rt-av--t1{background:var(--brown)}
.rt-av--t2{background:var(--navy)}
.rt-body{display:grid;gap:12px;min-width:0}
.rt-text{margin:0;min-height:4.5em;font-size:.9375rem;line-height:1.5;color:var(--muted);display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.rt-foot{display:flex;align-items:center;gap:10px;margin:0;font-size:.875rem;line-height:1.3}
.rt-name{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--ink);font-weight:700}
.rt-g{flex:none;width:20px;height:20px;margin-left:auto}
.rt-src{flex:none;display:inline-flex;margin:-4px -4px -4px auto;padding:4px;border-radius:50%}
.rt-src .rt-g{margin-left:0}
.rt-src:hover{background:var(--parchment)}
.rt-src:focus-visible{outline:2px solid var(--blue);outline-offset:1px}
.rt:not(.is-live) .rt-card[aria-hidden="true"]{display:none}
.rt:not(.is-live){-webkit-mask-image:none;mask-image:none}
.rt.is-live .rt-row{overflow:hidden}
.rt.is-live .rt-track{animation:rt-scroll var(--rt-dur,48s) linear infinite}
.rt.is-live .rt-row--b .rt-track{animation-direction:reverse;margin-left:-188px}
.rt.is-live:hover .rt-track,.rt.is-live:focus-within .rt-track,.rt.is-paused .rt-track{animation-play-state:paused}
.rt.is-live .rt-row:focus-within .rt-track{animation:none}
@keyframes rt-scroll{to{transform:translateX(-50%)}}
.rt-toggle{justify-self:center}
.rt-stars{display:none}
.rt--rated .rt-stars{display:inline-flex;flex:none;gap:1px;color:var(--brown)}
.rt-stars .icon{width:12px;height:12px}
.rt-note{margin:0;text-align:center;font-size:.8125rem;color:var(--muted)}
.rt-maps{color:#5e5e5e;font-weight:400;white-space:nowrap}
.reviews-actions{justify-content:center;align-items:center;margin-top:0}
@media (prefers-reduced-motion:reduce){.rt-track{animation:none!important}}
.ways{display:grid;gap:18px;grid-template-columns:repeat(auto-fit,minmax(300px,1fr))}
.ways .checklist{margin-bottom:22px}
/* The "who we print for" strips: site.js repeats the list until each half
   is wider than the window and sets the pace from the width (no gap at the
   loop, owner 2026-10-16). */
.ticker.is-live .ticker-track{animation-duration:var(--ticker-dur,48s)}
/* The accent word's underline: a fixed height in em, stretched to the word
   (preserveAspectRatio none), so it sits just under the letters at any
   length (owner, 2026-10-16: it covered the bottom of "done here"). */
.swash-line{height:.3em;bottom:-.2em;stroke-width:8}
/* Print on demand — the creator platform's landing (moved here from the
   Studio's own pages, 2026-10-16). */
.pod-hero .crumbs{margin-bottom:16px}
/* The hero's deck: real prints dealt into a fan as the page loads (each card
   turns about a pivot below the deck), then the doodles draw, the facts and
   the shop's sticker settle in. Hover lifts a card. Still and fanned for
   reduced motion; drifts with the scroll on desktop (site.js). */
.deck-stage{position:relative;width:100%;max-width:540px;justify-self:center;aspect-ratio:1/1.04;margin-top:8px}
.deck{position:absolute;inset:0}
.deck-card{--w:min(40%,220px);position:absolute;left:calc(50% - var(--w) / 2);top:9%;width:var(--w);aspect-ratio:3/4;padding:6px;border-radius:18px;background:var(--surface);box-shadow:0 18px 36px rgba(12,52,89,.16),0 2px 6px rgba(12,52,89,.08);transform-origin:50% 170%;rotate:calc(var(--k) * 8deg);transition:scale .3s cubic-bezier(.2,.7,.2,1),box-shadow .3s ease}
.deck-card picture{display:block;height:100%}
.deck-card img{display:block;width:100%;height:100%;object-fit:cover;border-radius:12px;background:var(--sand)}
.deck-card:hover{z-index:30!important;scale:1.06;box-shadow:0 26px 48px rgba(12,52,89,.24)}
@keyframes deck-in{from{opacity:0;translate:0 10%;scale:.94}}
@keyframes deck-fan{from{rotate:0deg}}
.deck-card{animation:deck-in .6s cubic-bezier(.2,.7,.2,1) backwards,deck-fan 1.05s cubic-bezier(.34,1.3,.5,1) backwards;animation-delay:.1s,calc(var(--d) * 70ms + 620ms)}
.deck-stage > [data-depth]:not(.deck){animation:settle .7s cubic-bezier(.2,.7,.2,1) backwards;animation-delay:calc(var(--i,0) * 100ms + 1000ms)}
.deck-stage .doodle path{animation:draw 1.1s ease-out backwards;animation-delay:calc(var(--i,0) * 120ms + 1150ms)}
.deck-stage .sticker{top:0;right:2%;width:96px;height:96px;z-index:16}
.dk-burst{top:1%;left:7%;width:54px;color:var(--tan);z-index:16}
.dk-loop{bottom:1%;left:-2%;width:122px;color:var(--sky)}
.dk-strokes{top:46%;right:-3%;width:56px;color:var(--brown);z-index:16}
.dk-chip{z-index:18}
.dk-chip--a{top:20%;left:-5%}
.dk-chip--b{bottom:21%;right:-4%}
.dk-chip--c{bottom:5%;left:20%}
@media (max-width:959px){.deck-stage{max-width:460px;margin-top:24px}}
@media (max-width:519px){.deck-card{--w:min(44%,190px);rotate:calc(var(--k) * 7deg)}.dk-chip--c,.dk-strokes{display:none}.deck-stage .sticker{width:76px;height:76px}.dk-chip--a{left:-2%}.dk-chip--b{right:-2%}}
@media (prefers-reduced-motion:reduce){.deck-card,.deck-stage [data-depth],.deck-stage .doodle path{animation:none!important}}
/* The product categories: one tile each, linking into the designer. */
.cats{display:grid;gap:14px;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));margin:0;padding:0;list-style:none}
@media (min-width:900px){.cats{grid-template-columns:repeat(4,minmax(0,1fr));gap:18px}}
.cat{display:grid;justify-items:center;align-content:start;gap:6px;height:100%;padding:22px 16px 18px;border-radius:var(--r-lg);border:1px solid var(--hairline);text-align:center;text-decoration:none;color:var(--navy);transition:translate .25s cubic-bezier(.2,.7,.2,1),box-shadow .25s ease,border-color .25s ease}
.cat--sand{background:var(--sand)}
.cat--sky{background:#e5f0f3;background:color-mix(in srgb,var(--sky) 28%,var(--surface))}
.cat--surface{background:var(--surface)}
.cat--tan{background:#f1e4d0;background:color-mix(in srgb,var(--tan) 28%,var(--surface))}
.section--sand .cat--sand{background:var(--parchment)}
.cat:hover{translate:0 -4px;box-shadow:var(--lift);border-color:var(--tan)}
.cat:focus-visible{outline:3px solid var(--blue);outline-offset:3px}
.cat-art{display:grid;place-items:center;width:92px;height:92px;margin-bottom:4px}
.garment{display:block;width:100%;height:100%;overflow:visible}
.garment-line{fill:none;stroke:currentColor;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round}
.garment-print{fill:var(--tan);transition:fill .25s ease}
.garment-dot{fill:currentColor}
.cat--tan .garment-print,.cat:hover .garment-print{fill:var(--brown)}
.cat-name{font:700 1.125rem/1.2 var(--display);color:var(--navy)}
.cat-go{display:inline-flex;align-items:center;gap:4px;font-size:.8125rem;font-weight:600;color:var(--blue)}
.cat-go .icon{width:14px;height:14px}
/* The profit calculator (ported from the Studio's pages). */
.calc{display:grid;gap:20px}
@media (min-width:900px){.calc{grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);align-items:start}}
.calc fieldset{min-width:0;margin:0;padding:0;border:0}
.calc legend{padding:0}
.calc-form{border-radius:var(--r-lg);background:var(--surface);border:1px solid var(--hairline);box-shadow:var(--lift);padding:clamp(20px,3vw,32px)}
.options{display:grid;gap:10px;margin-top:14px}
.option{position:relative}
.option input{position:absolute;opacity:0;width:1px;height:1px}
.option label{display:flex;align-items:center;gap:14px;padding:14px 16px;border-radius:var(--r-md);background:var(--parchment);border:1px solid var(--hairline);cursor:pointer;transition:background-color 140ms ease,border-color 140ms ease}
.option label:hover{border-color:var(--tan)}
.option .dot{display:grid;place-items:center;width:22px;height:22px;flex:none;border-radius:8px;background:var(--surface);border:1.5px solid var(--line)}
.option .name{flex:1;font-weight:600;color:var(--navy)}
.option .name small{display:block;margin-top:2px;font-weight:400;font-size:.8125rem;color:var(--muted)}
.option b{font-weight:600;color:var(--navy)}
.option input:checked + label{background:var(--sand);border-color:var(--tan)}
.option input:checked + label .dot{background:var(--navy);border-color:var(--navy)}
.option input:checked + label .dot::after{content:"";width:9px;height:5px;margin-top:-2px;border-left:2px solid var(--parchment);border-bottom:2px solid var(--parchment);transform:rotate(-45deg)}
.option input:focus-visible + label{outline:3px solid var(--blue);outline-offset:2px}
.field{display:grid;gap:8px;margin-top:22px}
.field-label{font:600 .9375rem/1.3 var(--text);color:var(--navy)}
.field-hint{margin:0;font-size:.875rem;color:var(--muted)}
.price-field{display:flex;align-items:center;gap:6px;height:56px;padding:0 22px;border-radius:var(--pill);background:var(--parchment);border:1.5px solid var(--line);font:600 1.25rem/1 var(--text);color:var(--navy)}
.price-field:focus-within{border-color:var(--blue);box-shadow:0 0 0 3px rgba(0,112,186,.22)}
.price-field input{width:100%;border:0;background:transparent;font:inherit;color:inherit;outline:none}
.range{width:100%;accent-color:var(--blue)}
.range-scale{display:flex;justify-content:space-between;font-size:.8125rem;color:var(--muted)}
.result{display:grid;gap:18px;align-content:start}
.result .label{color:var(--on-dark)}
.result-total{font:700 clamp(3rem,2.2rem + 3.4vw,4.75rem)/1 var(--display);letter-spacing:-.025em;color:var(--parchment)}
.result-sub{margin:0;color:var(--on-dark)}
.result-rows{display:grid;margin:0;padding:0;list-style:none}
.result-rows li{display:flex;justify-content:space-between;gap:12px;padding:12px 0;border-top:1px solid rgba(245,238,223,.24)}
.result-rows b{color:var(--parchment)}
.calc-warning{margin:0;color:var(--tan);font-weight:600}
.calc-note{margin:0;font-size:.875rem;color:var(--on-dark)}
.calc-foot{margin-top:18px;max-width:72ch;font-size:.875rem;color:var(--muted)}
.pod-facts{margin-top:26px}
@media (min-width:900px){.pod-facts{grid-template-columns:repeat(3,minmax(0,1fr))}}
/* FAQ: each question a card; its answer opens inside it, indented under the
   question on a soft panel with a tan rule (owner, 2026-10-16). */
.faq{display:grid;gap:12px;border-top:0}
.faq details{border:1px solid var(--hairline);border-radius:var(--r-lg);background:var(--surface);transition:border-color .2s ease,box-shadow .2s ease}
.section--sand .faq details{background:var(--parchment)}
.faq details[open]{border-color:var(--tan);box-shadow:var(--lift)}
.faq summary{padding:18px 18px 18px 22px;border-radius:var(--r-lg)}
.faq summary:hover{color:var(--blue-deep)}
.faq summary:focus-visible{outline:3px solid var(--blue);outline-offset:2px}
.faq summary .icon{flex:none;width:32px;height:32px;padding:7px;border-radius:50%;background:var(--sand);color:var(--navy);transition:background-color .2s ease,color .2s ease}
.faq details[open] summary .icon{background:var(--navy);color:var(--parchment)}
.faq .answer{max-width:none;margin:0 22px 22px;padding:16px 20px;border-left:3px solid var(--tan);border-radius:0 var(--r-md) var(--r-md) 0;background:var(--parchment);color:var(--ink)}
.section--sand .faq .answer{background:var(--surface)}
.faq .answer a{color:var(--blue-deep);font-weight:600}
.faq-group + .faq-group{margin-top:40px}
@media (max-width:519px){.faq summary{padding:16px 14px 16px 18px}.faq .answer{margin:0 14px 16px;padding:14px 16px}}
/* About: the owner's story in the site's own sections (owner, 2026-10-16). */
.about-split .h2{margin-top:8px}
.about-p{margin-top:16px;max-width:60ch}
.about-photo{margin:0;overflow:hidden;border-radius:var(--r-xl);border:8px solid var(--surface);box-shadow:var(--lift);rotate:1.5deg}
.about-split--flip .about-photo{rotate:-1.5deg}
.about-photo picture,.about-photo img{display:block;width:100%}
.pull-quote{margin:28px 0 0;padding:4px 0 4px 24px;border-left:4px solid var(--tan);font:600 italic clamp(1.25rem,1.1rem + .7vw,1.625rem)/1.35 var(--display);color:var(--navy)}
.letter{max-width:720px;margin:0 auto;padding:clamp(28px,4vw,48px);border-radius:var(--r-xl);background:var(--surface);border:1px solid var(--hairline);box-shadow:var(--lift);text-align:center}
.letter blockquote{margin:0}
.letter blockquote p{margin:0;font:500 clamp(1.25rem,1.1rem + .8vw,1.75rem)/1.4 var(--display);color:var(--navy)}
.letter blockquote p + p{margin-top:12px}
.letter figcaption{display:grid;justify-items:center;gap:8px;margin-top:22px;color:var(--muted);font-size:.9375rem}
.letter .signature{width:180px;height:auto;opacity:.85}
`;

export const SITE_CSS = BASE_CSS + ADDITIONS + REFINEMENTS;
