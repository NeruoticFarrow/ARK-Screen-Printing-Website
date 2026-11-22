// The Best of the Springs store: a sample storefront for The Gazette.
//
// Every product comes in every colour its AS Colour garment does; render.js
// draws each one from the garment templates, so a swatch shows that colour
// with the prints on it. The bag works (it lives in the buyer's browser) and
// adds up pickup or shipping, but there's no checkout: it's a sample
// (STORE.sample in catalog.mjs), and the page makes no network requests.

import { StrictMode, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  COLLECTIONS,
  DELIVERY,
  MAX_LINES,
  MAX_QUANTITY,
  ONE_SIZE,
  PRODUCTS,
  SIZE_UPCHARGE_CENTS,
  STORE,
  bagTotals,
  colourOf,
  deliveryKey,
  garmentLook,
  garmentOf,
  isLightGarment,
  lineKey,
  normaliseLine,
  priceRange,
  productById,
  productsIn,
  shippingCents,
  unitPriceCents,
  usd,
} from "./catalog.mjs";
import { drawGarment, preload } from "./render.js";
import officialLogo from "./images/art/logo-official.webp";
import winnerBadge from "./images/art/winner-badge.webp";
import { ArrowRight, Check, ChevronDown, Info, MapPin, Minus, Plus, ShoppingBag, Store as StoreIcon, Truck, X } from "./icons.jsx";

const BAG_KEY = "bots_store_bag_v1";
const DELIVERY_KEY = "bots_store_delivery_v1";
const CARD_SIZE = 720;
const DIALOG_SIZE = 1000;
const THUMB_SIZE = 200;

/** The swatches a card shows before "+N": its own colour first, then these. */
const CARD_COLOURS = {
  tee: ["black", "white", "natural", "berry", "navy", "athletic-heather", "cardinal", "forest-green", "plum"],
  carrie: ["black", "cream", "army", "navy", "burgundy", "camel", "pine-green"],
  twoTone: ["cream-black", "army-cream", "navy-cream", "black-cream", "coal-black"],
};
const CARD_SWATCHES = 7;

const SIDE_LABEL = { front: "Front", back: "Back" };
const otherSide = (side) => (side === "front" ? "back" : "front");

const money = (cents) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

function readStored(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeStored(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private mode or storage turned off: the bag still works for this visit.
  }
}

function readBag() {
  const stored = readStored(BAG_KEY, []);
  return Array.isArray(stored) ? stored.map(normaliseLine).filter(Boolean).slice(0, MAX_LINES) : [];
}

function cardColours(product, selected) {
  const garment = garmentOf(product);
  const ids = [selected, ...(CARD_COLOURS[product.garment] ?? [])];
  const seen = new Set();
  const out = [];
  for (const id of ids) {
    const colour = colourOf(product, id);
    if (!colour || seen.has(id)) continue;
    seen.add(id);
    out.push(colour);
    if (out.length === CARD_SWATCHES) break;
  }
  return out.length ? out : garment.colours.slice(0, CARD_SWATCHES);
}

const hasLightArt = (product) => Object.values(product.prints).some((p) => p.art !== "winner-badge");

// ── Pieces ─────────────────────────────────────────────────────────────────

function Garment({ product, colour, side, size, className = "", label }) {
  const ref = useRef(null);
  const look = garmentLook(product, colour, side);
  const key = JSON.stringify(look);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    drawGarment(canvas, look)
      .then((drawn) => {
        if (drawn) canvas.classList.add("is-drawn");
      })
      .catch(() => {});
  }, [key, size]);
  return <canvas ref={ref} width={size} height={size} className={`garment ${className}`} role="img" aria-label={label} />;
}

function swatchStyle(colour) {
  return colour.trim ? { background: `linear-gradient(135deg, ${colour.hex} 0 50%, ${colour.trim} 50% 100%)` } : { background: colour.hex };
}

function Swatch({ colour, selected, onSelect, small = false }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={colour.name}
      title={colour.name}
      className={`swatch${small ? " swatch-sm" : ""}${isLightGarment(colour.hex) ? " swatch-light" : ""}`}
      style={swatchStyle(colour)}
      onClick={onSelect}
    >
      {selected && <Check size={small ? 12 : 14} className="swatch-check" aria-hidden="true" />}
    </button>
  );
}

function Stepper({ value, onChange, label, min = 1, max = MAX_QUANTITY }) {
  return (
    <div className="stepper" role="group" aria-label={label}>
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label="One fewer">
        <Minus size={16} aria-hidden="true" />
      </button>
      <output aria-live="polite">{value}</output>
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label="One more">
        <Plus size={16} aria-hidden="true" />
      </button>
    </div>
  );
}

const DELIVERY_ICONS = { store: StoreIcon, event: MapPin, ship: Truck };
function DeliveryIcon({ name, size = 20 }) {
  const Icon = DELIVERY_ICONS[name] ?? StoreIcon;
  return <Icon size={size} aria-hidden="true" />;
}

function priceLabel(product) {
  const { min, max } = priceRange(product);
  return min === max ? money(min) : `From ${money(min)}`;
}

function ProductCard({ product, colour, onColour, onOpen, onQuickAdd }) {
  const garment = garmentOf(product);
  const [flipped, setFlipped] = useState(false);
  const side = flipped ? otherSide(product.cardView) : product.cardView;
  const current = colourOf(product, colour);
  const swatches = cardColours(product, colour);
  const more = garment.colours.length - swatches.length;
  const oneSize = garment.sizes.length === 1;
  return (
    <article className="card">
      <button
        type="button"
        className="card-media"
        onClick={() => onOpen(product.id, colour)}
        onPointerEnter={(e) => e.pointerType === "mouse" && setFlipped(true)}
        onPointerLeave={() => setFlipped(false)}
        aria-label={`${product.name} in ${current.name}: see colors${oneSize ? "" : " and sizes"}`}
      >
        <Garment product={product} colour={colour} side={side} size={CARD_SIZE} label={`${product.name}, ${current.name}, ${side}`} />
        <span className={`flag${product.collection === "winners" ? " flag-winner" : ""}`}>{product.collection === "winners" ? "2026 Winner" : "New for 2027"}</span>
        <span className="card-side">{SIDE_LABEL[side]}</span>
      </button>
      <div className="card-body">
        <p className="eyebrow">
          {garment.label} {garment.style}
        </p>
        <h3 className="card-title">{product.name}</h3>
        <p className="card-blurb">{product.blurb}</p>
        <div className="card-colours">
          <div className="swatches" role="radiogroup" aria-label={`${product.name} color`}>
            {swatches.map((c) => (
              <Swatch key={c.id} colour={c} selected={c.id === colour} onSelect={() => onColour(product.id, c.id)} small />
            ))}
            {more > 0 && (
              <button type="button" className="swatch-more" onClick={() => onOpen(product.id, colour)} aria-label={`See all ${garment.colours.length} colors`}>
                +{more}
              </button>
            )}
          </div>
          <p className="card-colour">
            {current.name}
            <span> · {garment.colours.length} colors</span>
          </p>
        </div>
        <div className="card-foot">
          <p className="card-price">{priceLabel(product)}</p>
          {oneSize ? (
            <button type="button" className="btn btn-plum" onClick={() => onQuickAdd(product.id, colour)}>
              <ShoppingBag size={16} aria-hidden="true" /> Add to bag
            </button>
          ) : (
            <button type="button" className="btn btn-plum" onClick={() => onOpen(product.id, colour)}>
              Choose size <ArrowRight size={16} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

// ── The store ──────────────────────────────────────────────────────────────

function Store() {
  const [bag, setBag] = useState(readBag);
  const [delivery, setDelivery] = useState(() => deliveryKey(readStored(DELIVERY_KEY, "store")));
  const [collection, setCollection] = useState("all");
  const [colours, setColours] = useState(() => Object.fromEntries(PRODUCTS.map((p) => [p.id, p.colour])));
  const [pick, setPick] = useState(null); // { productId, colour, side, size, quantity }
  const [toast, setToast] = useState(null);
  const productDialog = useRef(null);
  const bagDialog = useRef(null);
  const toastTimer = useRef(0);

  const totals = bagTotals(bag, delivery);
  const products = productsIn(collection);

  useEffect(() => preload(), []);
  useEffect(() => writeStored(BAG_KEY, bag), [bag]);
  useEffect(() => writeStored(DELIVERY_KEY, delivery), [delivery]);

  // Dialogs: lock the page behind them, and tidy up however they close.
  useEffect(() => {
    const dialogs = [productDialog.current, bagDialog.current];
    const onClose = () => {
      if (!dialogs.some((d) => d?.open)) document.body.classList.remove("has-sheet");
      if (!productDialog.current?.open) setPick(null);
    };
    for (const d of dialogs) d?.addEventListener("close", onClose);
    return () => {
      for (const d of dialogs) d?.removeEventListener("close", onClose);
    };
  }, []);

  function showDialog(dialog) {
    if (!dialog.open) dialog.showModal();
    document.body.classList.add("has-sheet");
  }

  function openBag() {
    clearTimeout(toastTimer.current);
    setToast(null);
    if (productDialog.current.open) productDialog.current.close();
    showDialog(bagDialog.current);
  }

  function closeOnBackdrop(event) {
    if (event.target === event.currentTarget) event.currentTarget.close();
  }

  function setCardColour(productId, colour) {
    setColours((all) => ({ ...all, [productId]: colour }));
  }

  function openProduct(productId, colour) {
    const product = productById(productId);
    const garment = garmentOf(product);
    setPick({ productId, colour, side: product.cardView, size: garment.sizes.length === 1 ? ONE_SIZE : "", quantity: 1 });
    showDialog(productDialog.current);
  }

  function updatePick(changes) {
    setPick((p) => ({ ...p, ...changes }));
    if (changes.colour && pick) setCardColour(pick.productId, changes.colour);
  }

  function showToast(message) {
    clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = setTimeout(() => setToast(null), 4500);
  }

  function addLine(productId, colour, size, quantity) {
    const line = normaliseLine({ productId, colour, size, quantity });
    if (!line) return false;
    const product = productById(productId);
    if (!bag.some((l) => l.key === line.key) && bag.length >= MAX_LINES) {
      showToast("Your bag is full.");
      return false;
    }
    setBag((lines) => {
      if (lines.some((l) => l.key === line.key)) return lines.map((l) => (l.key === line.key ? { ...l, quantity: Math.min(MAX_QUANTITY, l.quantity + quantity) } : l));
      return lines.length >= MAX_LINES ? lines : [...lines, line];
    });
    showToast(`Added ${quantity > 1 ? `${quantity} × ` : ""}${product.name}, ${colourOf(product, colour).name}${size === ONE_SIZE ? "" : `, ${size}`}`);
    return true;
  }

  function addPick() {
    if (!pick?.size) return;
    if (addLine(pick.productId, pick.colour, pick.size, pick.quantity)) productDialog.current.close();
  }

  function setLineQuantity(key, quantity) {
    setBag((lines) => lines.map((l) => (l.key === key ? { ...l, quantity } : l)));
  }

  function removeLine(key) {
    setBag((lines) => lines.filter((l) => l.key !== key));
  }

  function shopCollection(name) {
    setCollection(name);
    document.getElementById("shop")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const picked = pick ? productById(pick.productId) : null;
  const pickedGarment = picked ? garmentOf(picked) : null;
  const pickedColour = picked ? colourOf(picked, pick.colour) : null;
  const pickedPrint = picked ? picked.prints[pick.side] : null;
  const pickedUnit = picked ? unitPriceCents(picked, pick.size || pickedGarment.sizes[0]) : 0;
  const upcharges = Object.entries(SIZE_UPCHARGE_CENTS).reduce((groups, [size, cents]) => {
    const g = groups.find((x) => x.cents === cents);
    if (g) g.sizes.push(size);
    else groups.push({ cents, sizes: [size] });
    return groups;
  }, []);

  return (
    <>
      <a className="skip" href="#shop">
        Skip to the shop
      </a>
      {STORE.sample && (
        <p className="sample-bar">
          <span className="sample-dot" aria-hidden="true" />
          Sample store for The Gazette's review. Nothing can be bought here yet.
        </p>
      )}

      <header className="top">
        <div className="wrap top-inner">
          <a className="brand" href="#top" aria-label="Best of the Springs Shop, home">
            <img src={officialLogo} alt="" width="44" height="44" />
            <span className="brand-name">
              <span className="brand-kicker">The Gazette</span>
              Best of the Springs Shop
            </span>
          </a>
          <nav className="nav" aria-label="Store">
            <a href="#shop">Shop</a>
            <a href="#winners">Winner's Circle</a>
            <a href="#delivery">Pickup &amp; shipping</a>
            <a href="#faq">FAQ</a>
          </nav>
          <button type="button" className="bag-btn" onClick={openBag} aria-label={`Bag, ${totals.count} item${totals.count === 1 ? "" : "s"}`}>
            <ShoppingBag size={20} aria-hidden="true" />
            <span className="bag-label">Bag</span>
            {totals.count > 0 && <span className="bag-count">{totals.count}</span>}
          </button>
        </div>
      </header>

      <main id="top">
        <section className="hero">
          <div className="wrap hero-inner">
            <div className="hero-copy">
              <img className="hero-logo" src={officialLogo} alt="2027 Best of the Springs, The Gazette" width="640" height="640" />
              <div>
                <h1>Wear the Crown.</h1>
                <p className="lede">
                  Every year Gazette readers pick their favorite local businesses in six categories. Celebrate the Best of the Springs with tees and totes in the 2027 Crown, and
                  Winner gear for the businesses readers voted the best in 2026.
                </p>
                <div className="hero-actions">
                  <button type="button" className="btn btn-gold btn-lg" onClick={() => shopCollection("all")}>
                    Shop the collection <ArrowRight size={18} aria-hidden="true" />
                  </button>
                  <button type="button" className="btn btn-ghost btn-lg" onClick={() => shopCollection("winners")}>
                    See Winner gear
                  </button>
                </div>
                <p className="hero-facts">75 tee colors · Pickup in Colorado Springs or shipped to your door</p>
              </div>
            </div>
            <div className="hero-art" aria-hidden="true">
              <div className="hero-glow" />
              <Garment product={productById("crown-2027-tee")} colour="berry" side="back" size={880} className="hero-tee" label="" />
              <Garment product={productById("carrie-tote")} colour="black" side="front" size={640} className="hero-tote" label="" />
            </div>
          </div>
        </section>

        <div className="ribbon" aria-label="The six Best of the Springs categories">
          <ul className="wrap">
            {["Arts & Entertainment", "City Life & Recreation", "Family & Health", "Food & Drink", "Services & Professionals", "Shopping"].map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>

        <section id="shop" className="section shop" aria-labelledby="shop-title">
          <div className="wrap">
            <div className="section-head">
              <div>
                <p className="eyebrow">The 2027 collection</p>
                <h2 id="shop-title">Shop the Best of the Springs</h2>
                <p className="section-lede">Pick any color AS Colour makes. Each one shows the print as it comes out on that color.</p>
              </div>
              <div className="chips" role="group" aria-label="Show">
                {Object.entries(COLLECTIONS).map(([key, label]) => (
                  <button type="button" key={key} className="chip" aria-pressed={collection === key} onClick={() => setCollection(key)}>
                    {label}
                    <span className="chip-count">{productsIn(key).length}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="grid">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} colour={colours[p.id]} onColour={setCardColour} onOpen={openProduct} onQuickAdd={(id, colour) => addLine(id, colour, ONE_SIZE, 1)} />
              ))}
            </div>
          </div>
        </section>

        <section id="winners" className="winners" aria-labelledby="winners-title">
          <div className="wrap winners-inner">
            <img className="winners-badge" src={winnerBadge} alt="Best of the Springs 2026 Winner badge" width="640" height="370" />
            <div className="winners-copy">
              <p className="eyebrow eyebrow-gold">2026 Winner's Circle</p>
              <h2 id="winners-title">Readers voted you the best. Show it.</h2>
              <p>
                The 2026 Winner mark and badge, on tees for the whole team in every Staple Tee color. Outfitting your staff? Call ARK at{" "}
                <a href={STORE.contact.phoneHref}>{STORE.contact.phoneDisplay}</a> and we'll set up a team order.
              </p>
              <button type="button" className="btn btn-gold" onClick={() => shopCollection("winners")}>
                Shop Winner gear <ArrowRight size={16} aria-hidden="true" />
              </button>
            </div>
          </div>
        </section>

        <section id="delivery" className="section" aria-labelledby="delivery-title">
          <div className="wrap">
            <div className="section-head">
              <div>
                <p className="eyebrow">Getting your order</p>
                <h2 id="delivery-title">Pick it up, or we'll ship it</h2>
              </div>
            </div>
            <div className="delivery-cards">
              {Object.entries(DELIVERY).map(([key, d]) => (
                <article className="delivery-card" key={key}>
                  <span className="delivery-icon">
                    <DeliveryIcon name={key} size={22} />
                  </span>
                  <h3>{d.label}</h3>
                  <p className="delivery-cost">{key === "ship" ? `From ${usd(shippingCents(1))}` : "Free"}</p>
                  <p>{d.sentence}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="faq" className="section faq" aria-labelledby="faq-title">
          <div className="wrap faq-inner">
            <div>
              <p className="eyebrow">Good to know</p>
              <h2 id="faq-title">Questions</h2>
            </div>
            <div className="faq-list">
              {[
                ["Can I order now?", "Not yet. This is a sample for The Gazette to review. Once the designs and prices are approved, the bag checks out for real."],
                [
                  "Why is the lettering plum on some colors?",
                  "White ink barely shows on white, cream and pastel garments, so on those colors the white lettering prints in Best of the Springs plum. The gold Crown and the Winner badge print the same on every color.",
                ],
                [
                  "What sizes do the tees come in?",
                  `XS to 5XL in the AS Colour Staple Tee, a regular fit in 5.3 oz combed cotton. ${upcharges.map((g) => `${g.sizes[0]}–${g.sizes[g.sizes.length - 1]} are ${usd(g.cents)} more`).join(", and ")}.`,
                ],
                ["How big are the totes?", "The Carrie Tote is 16.5″ square with a 3.7″ gusset, in heavyweight 9.4 oz cotton canvas. The Two-Tone Carrie adds contrast straps."],
                ["Who prints them?", "ARK Screen Printing Studio, right here in Colorado Springs. Every piece is screen printed to order."],
              ].map(([q, a]) => (
                <details key={q}>
                  <summary>
                    {q}
                    <ChevronDown size={18} aria-hidden="true" />
                  </summary>
                  <p>{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="foot">
        <div className="wrap foot-inner">
          <img src={officialLogo} alt="" width="72" height="72" />
          <p>
            Best of the Springs and its logos belong to The Gazette, Colorado Springs.
            <br />
            Store and printing by ARK Screen Printing Studio · <a href={STORE.contact.phoneHref}>{STORE.contact.phoneDisplay}</a>
          </p>
        </div>
      </footer>

      <div className="toast-region" aria-live="polite">
        {toast && (
          <div className="toast">
            <Check size={18} aria-hidden="true" />
            <span>{toast}</span>
            <button type="button" onClick={openBag}>
              View bag
            </button>
          </div>
        )}
      </div>

      <dialog ref={productDialog} className="sheet product-sheet" aria-labelledby="product-title" onClick={closeOnBackdrop}>
        {picked && (
          <div className="product-layout">
            <div className="product-media">
              <div className="product-media-inner">
              <div className="stage">
                <Garment product={picked} colour={pick.colour} side={pick.side} size={DIALOG_SIZE} label={`${picked.name}, ${pickedColour.name}, ${pick.side}`} />
              </div>
              <div className="side-toggle" role="group" aria-label="Show the">
                {["front", "back"].map((side) => (
                  <button type="button" key={side} aria-pressed={pick.side === side} onClick={() => updatePick({ side })}>
                    {SIDE_LABEL[side]}
                  </button>
                ))}
              </div>
              {pickedPrint && (
                <p className="print-note">
                  {pickedPrint.place} print · {pickedPrint.size}
                </p>
              )}
              </div>
            </div>
            <div className="product-info">
              <button type="button" className="icon-btn sheet-close" onClick={() => productDialog.current.close()} aria-label="Close">
                <X size={22} aria-hidden="true" />
              </button>
              <p className="eyebrow">
                {pickedGarment.label} · {pickedGarment.style}
              </p>
              <h2 id="product-title">{picked.name}</h2>
              <p className="product-price">{money(pickedUnit)}</p>
              <p className="product-blurb">{picked.blurb}</p>

              <div className="opt">
                <p className="opt-label" id="colour-label">
                  Color <strong>{pickedColour.name}</strong>
                  <span>{pickedGarment.colours.length} colors</span>
                </p>
                <div className="swatch-grid" role="radiogroup" aria-labelledby="colour-label">
                  {pickedGarment.colours.map((c) => (
                    <Swatch key={c.id} colour={c} selected={c.id === pick.colour} onSelect={() => updatePick({ colour: c.id })} />
                  ))}
                </div>
                {isLightGarment(pickedColour.hex) && hasLightArt(picked) && <p className="hint">On this color the white lettering prints in plum, so it stays easy to read.</p>}
              </div>

              {pickedGarment.sizes.length > 1 && (
                <div className="opt">
                  <p className="opt-label" id="size-label">
                    Size {pick.size && <strong>{pick.size}</strong>}
                  </p>
                  <div className="sizes" role="radiogroup" aria-labelledby="size-label">
                    {pickedGarment.sizes.map((s) => (
                      <button type="button" key={s} role="radio" aria-checked={pick.size === s} className="size" onClick={() => updatePick({ size: s })}>
                        {s}
                      </button>
                    ))}
                  </div>
                  <p className="hint">{upcharges.map((g) => `${g.sizes[0]}–${g.sizes[g.sizes.length - 1]} +${usd(g.cents)}`).join(" · ")}</p>
                </div>
              )}

              <div className="opt opt-row">
                <p className="opt-label">Quantity</p>
                <Stepper value={pick.quantity} onChange={(quantity) => updatePick({ quantity })} label="Quantity" />
              </div>

              <div className="add-bar">
                <button type="button" className="btn btn-gold btn-block btn-lg" disabled={!pick.size} onClick={addPick}>
                  {pick.size ? (
                    <>
                      <ShoppingBag size={18} aria-hidden="true" /> Add to bag · {money(pickedUnit * pick.quantity)}
                    </>
                  ) : (
                    "Choose a size"
                  )}
                </button>
              </div>

              <ul className="facts">
                {pickedGarment.facts.map((f) => (
                  <li key={f}>{f}</li>
                ))}
                <li>Screen printed in Colorado Springs</li>
              </ul>
              <dl className="prints">
                {Object.entries(picked.prints).map(([side, p]) => (
                  <div key={side}>
                    <dt>{SIDE_LABEL[side]}</dt>
                    <dd>
                      {p.place} · {p.size}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        )}
      </dialog>

      <dialog ref={bagDialog} className="sheet bag-sheet" aria-labelledby="bag-title" onClick={closeOnBackdrop}>
        <div className="bag">
          <div className="bag-head">
            <h2 id="bag-title">Your bag</h2>
            <button type="button" className="icon-btn" onClick={() => bagDialog.current.close()} aria-label="Close">
              <X size={22} aria-hidden="true" />
            </button>
          </div>
          {bag.length === 0 ? (
            <div className="bag-empty">
              <ShoppingBag size={36} aria-hidden="true" />
              <p>Your bag is empty.</p>
              <button
                type="button"
                className="btn btn-plum"
                onClick={() => {
                  bagDialog.current.close();
                  shopCollection("all");
                }}
              >
                Start shopping
              </button>
            </div>
          ) : (
            <>
              <ul className="lines">
                {bag.map((line) => {
                  const product = productById(line.productId);
                  const colour = colourOf(product, line.colour);
                  return (
                    <li className="line" key={line.key}>
                      <div className="line-thumb">
                        <Garment product={product} colour={line.colour} side="front" size={THUMB_SIZE} label={`${product.name}, ${colour.name}`} />
                      </div>
                      <div className="line-info">
                        <p className="line-name">{product.name}</p>
                        <p className="line-meta">
                          {colour.name}
                          {line.size === ONE_SIZE ? "" : ` · ${line.size}`} · {money(unitPriceCents(product, line.size))}
                        </p>
                        <div className="line-actions">
                          <Stepper value={line.quantity} onChange={(q) => setLineQuantity(line.key, q)} label={`${product.name} quantity`} />
                          <button type="button" className="link-btn" onClick={() => removeLine(line.key)}>
                            Remove
                          </button>
                        </div>
                      </div>
                      <p className="line-total">{money(line.quantity * unitPriceCents(product, line.size))}</p>
                    </li>
                  );
                })}
              </ul>

              <fieldset className="delivery">
                <legend>How you'll get it</legend>
                {Object.entries(DELIVERY).map(([key, d]) => (
                  <label className="delivery-opt" key={key}>
                    <input type="radio" name="delivery" value={key} checked={delivery === key} onChange={() => setDelivery(key)} />
                    <span className="delivery-opt-icon">
                      <DeliveryIcon name={key} />
                    </span>
                    <span className="delivery-opt-text">
                      <strong>{d.label}</strong>
                      <small>{d.short}</small>
                    </span>
                    <span className="delivery-opt-cost">{key === "ship" ? money(shippingCents(totals.count)) : "Free"}</span>
                  </label>
                ))}
                <p className="delivery-sentence">{DELIVERY[delivery].sentence}</p>
              </fieldset>

              <dl className="totals">
                <div>
                  <dt>
                    Subtotal · {totals.count} item{totals.count === 1 ? "" : "s"}
                  </dt>
                  <dd>{money(totals.subtotal)}</dd>
                </div>
                {delivery === "ship" && (
                  <div>
                    <dt>Shipping &amp; handling</dt>
                    <dd>{money(totals.shipping)}</dd>
                  </div>
                )}
                <div className="totals-total">
                  <dt>Total</dt>
                  <dd>{money(totals.total)}</dd>
                </div>
              </dl>
              <p className="tax-note">Sales tax is added at checkout.</p>

              {STORE.sample && (
                <div className="sample-note">
                  <Info size={18} aria-hidden="true" />
                  <p>
                    <strong>This is a sample store.</strong> Checkout opens once The Gazette approves the designs and prices. Nothing is charged here.
                  </p>
                </div>
              )}
              <button type="button" className="btn btn-gold btn-block btn-lg" disabled>
                Checkout opens at launch
              </button>
            </>
          )}
        </div>
      </dialog>
    </>
  );
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Store />
  </StrictMode>,
);
