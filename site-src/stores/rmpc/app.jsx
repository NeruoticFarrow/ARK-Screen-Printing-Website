// The RMPC 2027 season store at arkscreenprinting.com/rmpc.
//
// The owner-approved sample storefront, rebuilt as readable source with the
// same markup and styles, now selling for real: prices come from catalog.mjs
// and the bag checks out through /api/rmpc/checkout (Stripe Checkout).
//
// Build: `npm run build` (site-src/stores/rmpc/build.mjs) bundles this file,
// React, the images and the fonts into the single page ark-site-review/rmpc.html.

import { StrictMode, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BRANDS_BY_TYPE, COLOUR, GARMENTS, MAX_QUANTITY, PRODUCTS as CATALOG, SHIPPING_RULE_SHORT, SHIPPING_RULE_TEXT,
  SIZE_UPCHARGE_CENTS, STORE, bagTotals, closingDateLabel, lineKey, normaliseLine, orderRef, ordersClosed,
  priceRange, sizesFor, unitPriceCents, variantKey,
} from "./catalog.mjs";
import {
  ArrowRight, ArrowUpRight, ChevronDown, ChevronRight, CircleCheck, Copy, Info, MapPin, Minus, Plus, ShoppingBag, Truck, X,
} from "./icons.jsx";
import crown from "./images/rmpc-crown.png";
import wordmark from "./images/rmpc-wordmark.webp";
import teamTeeFront from "./images/wordmark-tee-front.webp";
import athleteTeeFront from "./images/athlete-tee-front.webp";
import teeBack from "./images/tee-back.webp";
import teamCrewFront from "./images/wordmark-crew-front.webp";
import athleteCrewFront from "./images/athlete-crew-front.webp";
import crewBack from "./images/crew-back.webp";

const IMAGES = {
  "wordmark-tee": { front: teamTeeFront, back: teeBack },
  "athlete-tee": { front: athleteTeeFront, back: teeBack },
  "wordmark-crew": { front: teamCrewFront, back: crewBack },
  "athlete-crew": { front: athleteCrewFront, back: crewBack },
};
const PRODUCTS = CATALOG.map((p) => ({ ...p, ...IMAGES[p.id] }));
const productById = (id) => PRODUCTS.find((p) => p.id === id);

const BAG_KEY = "rmpc_store_bag_v1";
const PENDING_KEY = "rmpc_store_pending_v1";
const CHECKOUT_URL = "/api/rmpc/checkout";

const money = (cents) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
const fitLabel = (variant) => (GARMENTS[variant]?.fit === "youth" ? "Youth" : "Adult");

function readBag() {
  try {
    const stored = JSON.parse(localStorage.getItem(BAG_KEY) || "[]");
    return Array.isArray(stored) ? stored.map(normaliseLine).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function readPending() {
  try {
    const stored = JSON.parse(localStorage.getItem(PENDING_KEY) || "null");
    if (!stored || !Array.isArray(stored.cart)) return null;
    return { cart: stored.cart.map(normaliseLine).filter(Boolean), delivery: stored.delivery === "ship" ? "ship" : "pickup" };
  } catch {
    return null;
  }
}

function writeStorage(key, value) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private windows can refuse storage; the bag then lives for the visit.
  }
}

const DeliveryIcon = ({ name }) => (name === "pickup" ? <MapPin size={21} /> : <Truck size={21} />);

function Store() {
  const [cart, setCart] = useState(readBag);
  const [filter, setFilter] = useState("All apparel");
  const [product, setProduct] = useState(null);
  const [fit, setFit] = useState("adult");
  const [brand, setBrand] = useState("gildan");
  const [size, setSize] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [view, setView] = useState("front");
  const [delivery, setDelivery] = useState("pickup");
  const [toast, setToast] = useState("");
  const [confirmation, setConfirmation] = useState(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const productDialog = useRef(null);
  const bagDialog = useRef(null);

  const closed = ordersClosed();
  const closesOn = closingDateLabel();
  const totals = bagTotals(cart, delivery);
  const variant = variantKey(brand, fit);
  const twoXl = SIZE_UPCHARGE_CENTS["2XL"] ?? 0;

  useEffect(() => writeStorage(BAG_KEY, cart), [cart]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const dialogs = [productDialog.current, bagDialog.current].filter(Boolean);
    const onClose = () => {
      document.body.style.overflow = dialogs.some((d) => d.open) ? "hidden" : "";
    };
    dialogs.forEach((d) => d.addEventListener("close", onClose));
    return () => {
      document.body.style.overflow = "";
      dialogs.forEach((d) => d.removeEventListener("close", onClose));
    };
  }, []);

  // Back from Stripe: ?checkout=success shows the confirmation and empties the
  // bag; ?checkout=cancelled reopens the bag as it was.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const outcome = params.get("checkout");
    if (!outcome) return;
    window.history.replaceState(null, "", window.location.pathname + window.location.hash);
    if (outcome === "success") {
      const pending = readPending();
      setConfirmation({ cart: pending?.cart ?? [], delivery: pending?.delivery ?? "pickup", ref: orderRef(params.get("session_id")) });
      setCart([]);
    }
    writeStorage(PENDING_KEY, null);
    if (outcome === "success" || outcome === "cancelled") {
      bagDialog.current?.showModal();
      document.body.style.overflow = "hidden";
    }
  }, []);

  function openProduct(next) {
    setProduct(next);
    setFit("adult");
    setBrand(BRANDS_BY_TYPE[next.type][0]);
    setSize("");
    setQuantity(1);
    setView("front");
    productDialog.current?.showModal();
    document.body.style.overflow = "hidden";
  }

  function openBag() {
    setConfirmation(null);
    setCheckoutError("");
    bagDialog.current?.showModal();
    document.body.style.overflow = "hidden";
  }

  function closeBag() {
    bagDialog.current?.close();
  }

  function addToBag() {
    if (!product || !size || closed) return;
    const key = lineKey(product.id, variant, size);
    setCart((lines) => (lines.find((l) => l.key === key)
      ? lines.map((l) => (l.key === key ? { ...l, quantity: Math.min(MAX_QUANTITY, l.quantity + quantity) } : l))
      : [...lines, { key, productId: product.id, variant, size, quantity }]));
    productDialog.current?.close();
    setToast(`${product.name} added to your bag`);
  }

  function changeQuantity(key, delta) {
    setCart((lines) => lines.map((l) => (l.key === key ? { ...l, quantity: Math.min(MAX_QUANTITY, l.quantity + delta) } : l)).filter((l) => l.quantity > 0));
  }

  async function checkout() {
    if (!cart.length || checkingOut || closed) return;
    setCheckingOut(true);
    setCheckoutError("");
    try {
      const res = await fetch(CHECKOUT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delivery, lines: cart.map(({ productId, variant: v, size: s, quantity: q }) => ({ productId, variant: v, size: s, quantity: q })) }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || typeof body.url !== "string") throw new Error(body.error || "Checkout is unavailable right now. Please try again in a few minutes.");
      writeStorage(PENDING_KEY, { cart, delivery, at: Date.now() });
      window.location.assign(body.url);
    } catch (err) {
      setCheckoutError(err instanceof Error && err.message !== "Failed to fetch" ? err.message : "We couldn't reach checkout. Check your connection and try again.");
      setCheckingOut(false);
    }
  }

  async function share() {
    try {
      await navigator.clipboard.writeText(window.location.href.split("#")[0]);
      setToast("Store link copied");
    } catch {
      setToast("You can share this page’s link from your browser");
    }
  }

  const shown = PRODUCTS.filter((p) => filter === "All apparel" || (filter === "T-shirts" ? p.type === "tee" : p.type === "crew"));
  const stripText = closed ? "PREORDERS ARE CLOSED" : closesOn ? `PREORDERS OPEN · ORDERS CLOSE ${closesOn.toUpperCase()}` : "PREORDERS NOW OPEN";
  const confirmationTotals = confirmation ? bagTotals(confirmation.cart, confirmation.delivery) : null;

  return (
    <>
      <div className="preview-strip">
        <span><span className={`preview-dot ${closed ? "" : "live"}`} /> {stripText}</span>
        <span className="strip-note"><CircleCheck size={14} /> Secure checkout by Stripe</span>
      </div>
      <div className="season-strip">2027 SEASON COLLECTION <span>•</span> COLORADO SPRINGS, CO</div>
      <header className="site-header">
        <a className="brand brand-wordmark" href="#" aria-label="RMPC store home">
          <img src={wordmark} alt="RMPC" />
          <span className="brand-small">THE SEASON STORE</span>
        </a>
        <nav aria-label="Store navigation">
          <a href="#collection">Shop</a>
          <a href="#story">Our community</a>
          <a href="#how-it-works">How it works</a>
        </nav>
        <div className="header-right">
          <span className="limited-label">A LIMITED SEASON DROP</span>
          <button className="bag-button" onClick={openBag} aria-label={`Open shopping bag, ${totals.count} items`}>
            <ShoppingBag size={21} />
            <span>Bag</span>
            <span className="bag-count">{totals.count}</span>
          </button>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow"><span /> ROCKY MOUNTAIN PARKOUR CHAMPIONSHIPS</div>
            <h1>Wear your<br /><em>next move.</em></h1>
            <p>For the athletes. The families. The whole crew.<br />Meet your new favorites for the 2027 season.</p>
            <div className="hero-actions">
              <a className="button button-yellow" href="#collection">Shop the collection <ArrowRight size={19} /></a>
              <a className="hero-secondary" href="#how-it-works">How preorders work <ArrowUpRight size={17} /></a>
            </div>
            <div className="hero-note">
              <span className="mini-crown"><img src={crown} alt="" /></span>
              <span>Small runs. Big community.<br /><b>Printed locally by ARK Screen Printing.</b></span>
            </div>
          </div>
          <div className="hero-art" aria-label="RMPC collection preview">
            <div className="hero-line" />
            <span className="hero-vertical">MOVE WITH YOUR PEOPLE / RMPC 2027</span>
            <div className="hero-photo photo-one">
              <img src={PRODUCTS[0].front} alt="Black RMPC Team Tee with white wordmark" />
              <span>THE TEAM TEE</span>
            </div>
            <div className="hero-photo photo-two">
              <img src={PRODUCTS[3].front} alt="Black RMPC Athlete Crewneck with red and blue athlete print" />
              <span>THE ATHLETE CREW</span>
            </div>
            <span className="hero-edition">01 / SEASON ESSENTIALS</span>
          </div>
        </section>

        <div className="benefit-bar">
          <div><CircleCheck size={18} /><span>Youth &amp; adult options</span></div>
          <div><MapPin size={18} /><span>Free event pickup</span></div>
          <div><ShoppingBag size={18} /><span>Made to order, not overstocked</span></div>
          <div><Truck size={18} /><span>Or shipped to your door</span></div>
        </div>

        <section id="collection" className="collection section-wrap">
          <div className="collection-heading">
            <div>
              <div className="section-kicker">THE 2027 COLLECTION</div>
              <h2>Built for the whole crew.</h2>
              <p>Two designs. Your favorite tee or crewneck. One team.</p>
            </div>
            <span className="piece-count">04 / SEASON ESSENTIALS</span>
          </div>
          <div className="collection-toolbar">
            <div className="filter-tabs" role="group" aria-label="Filter the collection">
              {["All apparel", "T-shirts", "Crewnecks"].map((name) => (
                <button key={name} aria-pressed={filter === name} className={filter === name ? "active" : ""} onClick={() => setFilter(name)}>{name}</button>
              ))}
            </div>
            <span>{COLOUR} · Front &amp; back prints</span>
          </div>
          <div className="product-grid">
            {shown.map((p) => {
              const range = priceRange(p);
              return (
                <article className="product-card" key={p.id}>
                  <button className="product-image-button" onClick={() => openProduct(p)} aria-label={`View ${p.name}`}>
                    <div className={`product-stage ${p.type}`}>
                      <span className="product-badge">{p.type === "tee" ? "YOUTH + ADULT" : "MIDWEIGHT CREW"}</span>
                      <img className="product-front" src={p.front} alt={`${p.name}, front`} loading="lazy" />
                      <img className="product-back" src={p.back} alt={`${p.name}, back`} loading="lazy" />
                      <span className="quick-shop">Choose your fit <Plus size={18} /></span>
                    </div>
                  </button>
                  <div className="product-caption">
                    <div>
                      <p className="product-design">{p.design}</p>
                      <button className="product-title" onClick={() => openProduct(p)}>{p.name}</button>
                      <p className="product-subtitle">{p.type === "tee" ? "Gildan or Next Level · Youth & adult" : "Independent Trading Co. · Youth & adult"}</p>
                    </div>
                    <div className="product-price">
                      <span>{range.min === range.max ? "PREORDER" : "FROM"}</span>
                      <b>{money(range.min)}</b>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
          <p className="pricing-footnote">
            <Info size={14} /> Prices are per garment, before sales tax. {twoXl > 0 ? `Adult 2XL adds ${money(twoXl)}.` : "Every size is the same price."}
          </p>
        </section>

        <section className="community" id="story">
          <div className="community-mark"><img src={crown} alt="RMPC championship crown" /></div>
          <div>
            <div className="section-kicker">MORE THAN A COMPETITION</div>
            <h2>Your people.<br />Your next move.</h2>
            <p>Rocky Mountain Parkour Championships brings young athletes and their families together in Colorado Springs. This collection is for everyone who shows up, cheers loud, and takes the next leap.</p>
            <a href="https://rmparkour.com/" target="_blank" rel="noreferrer">Meet Rocky Mountain Parkour Championships <ArrowUpRight size={17} /></a>
          </div>
          <span className="community-season">20<br />27</span>
        </section>

        <section id="how-it-works" className="how-section section-wrap">
          <div className="how-title">
            <div className="section-kicker">A LITTLE PLANNING. A LOT OF GOOD GEAR.</div>
            <h2>One preorder.<br />A whole season of wear.</h2>
            <p>{closed
              ? "Preorders for this season are closed. Thank you to everyone who ordered!"
              : closesOn
                ? `Preorders close ${closesOn}. Then the whole run is printed together.`
                : "Preorders are open now. When they close, the whole run is printed together."}</p>
          </div>
          <div className="how-steps">
            <div>
              <span>01</span>
              <div><h3>Pick your favorites.</h3><p>Choose a design, garment, youth or adult fit, and size. Check both the front and back before adding to your bag.</p></div>
            </div>
            <div>
              <span>02</span>
              <div><h3>We print the collection.</h3><p>Preorders are collected together, then printed as a run by ARK Screen Printing in Colorado Springs.</p></div>
            </div>
            <div>
              <span>03</span>
              <div><h3>Pick up. Or ship out.</h3><p>Choose free event pickup or shipping when you check out. We'll email you when your order is ready.</p></div>
            </div>
          </div>
        </section>

        <section className="faq-section section-wrap">
          <h2>A few good questions.</h2>
          <div className="faq-list">
            <details>
              <summary>Are youth sizes available?<ChevronDown size={18} /></summary>
              <p>Yes. The youth tees come in XS–XL and the youth crewneck in S–XL. Adult sizes run S–2XL. Need a size that isn't listed? Call or text ARK at {STORE.contact.phoneDisplay} before you order.</p>
            </details>
            <details>
              <summary>When will my order be ready?<ChevronDown size={18} /></summary>
              <p>{closesOn ? `Preorders close on ${closesOn}. ` : ""}ARK Screen Printing prints the whole collection after preorders close, and we'll email you when your order is ready for pickup or has shipped.</p>
            </details>
            <details>
              <summary>How does delivery work?<ChevronDown size={18} /></summary>
              <p>Choose free event pickup or shipping in your bag. {STORE.pickup.sentence} Shipping is {SHIPPING_RULE_TEXT}, to U.S. addresses.</p>
            </details>
            <details>
              <summary>How do I pay?<ChevronDown size={18} /></summary>
              <p>Checkout is handled securely by Stripe. Pay by card, and Stripe adds the sales tax and emails your receipt. Questions about an order? Email {STORE.contact.email} or call {STORE.contact.phoneDisplay}.</p>
            </details>
          </div>
        </section>
      </main>

      <footer>
        <div className="footer-main">
          <a className="brand" href="#">
            <img src={crown} alt="" />
            <span>RMPC<span className="brand-small">ROCKY MOUNTAIN PARKOUR CHAMPIONSHIPS</span></span>
          </a>
          <div>Made for our community.<br /><span>Printed by ARK Screen Printing · Colorado Springs</span></div>
          <button className="text-button" onClick={share}><Copy size={15} /> Share this store</button>
        </div>
        <div className="footer-bottom">
          <span>2027 Season Collection · {STORE.name}</span>
          <span>Questions? {STORE.contact.email} · {STORE.contact.phoneDisplay}</span>
        </div>
      </footer>

      <dialog ref={productDialog} className="product-dialog" onClick={(e) => { if (e.target === e.currentTarget) productDialog.current?.close(); }}>
        <button className="close-button" aria-label="Close product details" onClick={() => productDialog.current?.close()}><X size={21} /></button>
        {product && (
          <div className="product-detail">
            <div className="detail-gallery">
              <div className="detail-stage"><img src={product[view]} alt={`${product.name}, ${view} view`} /></div>
              <div className="view-buttons">
                {["front", "back"].map((side) => (
                  <button key={side} className={view === side ? "active" : ""} onClick={() => setView(side)}>
                    <img src={product[side]} alt="" />
                    <span>{side === "front" ? "Front print" : "Back print"}</span>
                  </button>
                ))}
              </div>
              <p>{COLOUR} garment · Both prints included</p>
            </div>
            <div className="detail-options">
              <div className="section-kicker">RMPC / 2027 COLLECTION</div>
              <h2>{product.name}</h2>
              <div className="detail-price">{money(unitPriceCents(variant, size))}<span>Per garment · before sales tax</span></div>
              <p className="detail-description">{product.description}</p>
              <fieldset>
                <legend>Choose your fit</legend>
                <div className="segmented">
                  {["adult", "youth"].map((f) => (
                    <button key={f} type="button" className={fit === f ? "active" : ""} onClick={() => { setFit(f); setSize(""); }}>{f === "adult" ? "Adult" : "Youth"}</button>
                  ))}
                </div>
              </fieldset>
              <fieldset>
                <legend>Garment option</legend>
                {product.type === "tee" ? (
                  <div className="garment-options">
                    {BRANDS_BY_TYPE.tee.map((b) => (
                      <button key={b} type="button" className={brand === b ? "active" : ""} onClick={() => setBrand(b)}>
                        <b>{GARMENTS[variantKey(b, fit)].label}</b>
                        <span>{GARMENTS[variantKey(b, fit)].blurb}</span>
                        <strong>{money(unitPriceCents(variantKey(b, fit)))}</strong>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="crew-garment">
                    <b>{GARMENTS[variant].label}</b>
                    <span>{GARMENTS[variant].blurb}</span>
                  </div>
                )}
              </fieldset>
              <fieldset>
                <legend>Size <span>{size || "Select a size"}</span></legend>
                <div className="size-options">
                  {sizesFor(product.type, fit).map((s) => (
                    <button key={s} type="button" aria-pressed={size === s} className={size === s ? "active" : ""} onClick={() => setSize(s)}>
                      {s}
                      {(SIZE_UPCHARGE_CENTS[s] ?? 0) > 0 && <small>+{money(SIZE_UPCHARGE_CENTS[s])}</small>}
                    </button>
                  ))}
                </div>
              </fieldset>
              <div className="detail-buy-row">
                <div className="quantity-control">
                  <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} aria-label="Decrease product quantity" disabled={quantity === 1}><Minus size={16} /></button>
                  <span aria-live="polite">{quantity}</span>
                  <button type="button" onClick={() => setQuantity(Math.min(MAX_QUANTITY, quantity + 1))} aria-label="Increase product quantity" disabled={quantity === MAX_QUANTITY}><Plus size={16} /></button>
                </div>
                <button className="button button-dark add-to-bag" onClick={addToBag} disabled={!size || closed}>
                  {closed ? "Preorders are closed" : size ? `Add to bag · ${money(unitPriceCents(variant, size) * quantity)}` : "Select a size to add"}
                  <ShoppingBag size={18} />
                </button>
              </div>
              <div className="detail-delivery"><MapPin size={17} /><span>Free event pickup or shipping, chosen in your bag.</span></div>
              <details className="size-info">
                <summary>Size &amp; preorder information <ChevronDown size={16} /></summary>
                <p>Youth tees: XS–XL. Youth crewnecks: S–XL. Adults: S–2XL. {closesOn ? `Preorders close ${closesOn}; ` : ""}ARK prints the whole run after preorders close.</p>
              </details>
              <p className="detail-disclaimer">Made to order for this preorder and printed by ARK Screen Printing in Colorado Springs.</p>
            </div>
          </div>
        )}
      </dialog>

      <dialog ref={bagDialog} className="cart-dialog" onClick={(e) => { if (e.target === e.currentTarget) closeBag(); }}>
        <div className="cart-header">
          <div>
            <div className="section-kicker">RMPC SEASON STORE</div>
            <h2>{confirmation ? "You’re all set." : "Your bag"}</h2>
          </div>
          <button className="close-button" onClick={closeBag} aria-label="Close shopping bag"><X size={21} /></button>
        </div>
        {confirmation ? (
          <div className="confirmation">
            <CircleCheck size={54} />
            <span className="confirmation-label">ORDER CONFIRMED{confirmation.ref ? ` · ORDER ${confirmation.ref}` : ""}</span>
            <h3>A little team spirit,<br />coming right up.</h3>
            <p>Thank you! Stripe is emailing your receipt. ARK prints the collection after preorders close{closesOn ? ` on ${closesOn}` : ""}, and we'll email you when your order is {confirmation.delivery === "ship" ? "on its way" : "ready for pickup"}.</p>
            {confirmation.cart.length > 0 && (
              <div className="confirmation-summary">
                {confirmation.cart.map((line) => (
                  <div key={line.key}>
                    <span>{line.quantity} × {productById(line.productId)?.name}<small>{GARMENTS[line.variant].label} · {fitLabel(line.variant)} · {line.size}</small></span>
                    <b>{money(unitPriceCents(line.variant, line.size) * line.quantity)}</b>
                  </div>
                ))}
                <div>
                  <span>{confirmation.delivery === "pickup" ? STORE.pickup.label : "Shipping"}</span>
                  <b>{confirmation.delivery === "pickup" ? "Free" : money(confirmationTotals.shipping)}</b>
                </div>
                <div className="confirmation-total"><span>Total before sales tax</span><b>{money(confirmationTotals.total)}</b></div>
              </div>
            )}
            <button className="button button-dark" onClick={closeBag}>Back to the collection <ArrowRight size={18} /></button>
          </div>
        ) : cart.length ? (
          <>
            <div className="cart-lines">
              {cart.map((line) => {
                const p = productById(line.productId);
                return (
                  <article className="cart-line" key={line.key}>
                    <div className="cart-thumb"><img src={p.front} alt={p.name} /></div>
                    <div className="cart-line-info">
                      <h3>{p.name}</h3>
                      <p>{GARMENTS[line.variant].label}<br />{fitLabel(line.variant)} · {COLOUR} · {line.size}</p>
                      <div className="cart-line-bottom">
                        <div className="quantity-control small">
                          <button onClick={() => changeQuantity(line.key, -1)} aria-label={`Decrease ${p.name} quantity`}><Minus size={13} /></button>
                          <span>{line.quantity}</span>
                          <button onClick={() => changeQuantity(line.key, 1)} disabled={line.quantity === MAX_QUANTITY} aria-label={`Increase ${p.name} quantity`}><Plus size={13} /></button>
                        </div>
                        <b>{money(unitPriceCents(line.variant, line.size) * line.quantity)}</b>
                      </div>
                      <button className="remove-button" onClick={() => setCart((lines) => lines.filter((l) => l.key !== line.key))}>Remove</button>
                    </div>
                  </article>
                );
              })}
            </div>
            <div className="cart-delivery">
              <h3>How would you like to get it?</h3>
              {["pickup", "ship"].map((option) => (
                <button key={option} className={`delivery-option ${delivery === option ? "active" : ""}`} onClick={() => setDelivery(option)}>
                  <DeliveryIcon name={option} />
                  <span>
                    <b>{option === "pickup" ? STORE.pickup.label : "Ship to my door"}</b>
                    <small>{option === "pickup" ? STORE.pickup.short : SHIPPING_RULE_SHORT}</small>
                  </span>
                  <strong>{option === "pickup" ? "Free" : money(bagTotals(cart, "ship").shipping)}</strong>
                  <span className="radio-dot" />
                </button>
              ))}
            </div>
            <div className="cart-summary">
              <div><span>Subtotal</span><b>{money(totals.subtotal)}</b></div>
              <div><span>{delivery === "pickup" ? STORE.pickup.label : "Shipping"}</span><b>{money(totals.shipping)}</b></div>
              <div className="cart-total"><span>Total before tax</span><b>{money(totals.total)}</b></div>
              <p>Sales tax is added at checkout.</p>
              {checkoutError && <p className="checkout-error" role="alert">{checkoutError}</p>}
              <button className="button button-dark" onClick={checkout} disabled={checkingOut || closed}>
                {closed ? "Preorders are closed" : checkingOut ? "Opening secure checkout…" : "Checkout"} <ArrowRight size={18} />
              </button>
              <div className="cart-security"><CircleCheck size={14} /> Secure checkout by Stripe</div>
            </div>
          </>
        ) : (
          <div className="empty-bag">
            <ShoppingBag size={46} />
            <h3>Your crew is waiting.</h3>
            <p>Add a season favorite to start your order.</p>
            <button className="button button-dark" onClick={closeBag}>Explore the collection <ArrowRight size={18} /></button>
          </div>
        )}
      </dialog>

      {toast && (
        <div className="toast" role="status">
          <CircleCheck size={20} />
          <span>{toast}</span>
          <button onClick={openBag}>View bag <ChevronRight size={15} /></button>
        </div>
      )}
    </>
  );
}

createRoot(document.getElementById("root")).render(<StrictMode><Store /></StrictMode>);
