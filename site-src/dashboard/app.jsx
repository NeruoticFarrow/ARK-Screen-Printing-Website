// The client store dashboard at arkscreenprinting.com/dashboard: a made-for-you
// store's client signs in with their email and sees the store's orders, print
// counts and profit; ARK's people also get the ARK page (client lists, cost
// sheets, payments). Laid out like the Creator Studio: a rail of sections on
// a computer, a tab bar on a phone, Verdara's parchment, navy and Fraunces.
//
// Everything comes from /api/dashboard/… (netlify/functions/dashboard-api.mjs);
// the page holds no data of its own.

import { StrictMode, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import * as I from "./icons.jsx";
import { byBuyer, clock, itemLine, longDay, matchesOrder, orderTime, paidDay, plural, printGrids, runNote, runProgress, shortDay, todayYmd, usd, usdShort } from "./format.mjs";

const BASE = "/dashboard";
const API = "/api/dashboard";
const LOGO = "/assets/brand/ark-logo-120.png";
const EMAIL_KEY = "ark-dashboard-email";

const TABS = [
  { key: "overview", label: "Overview", short: "Overview", icon: I.Overview, path: "" },
  { key: "orders", label: "Orders", short: "Orders", icon: I.Orders, path: "/orders" },
  { key: "print-counts", label: "Print counts", short: "Prints", icon: I.Shirt, path: "/print-counts" },
  { key: "profit", label: "Profit", short: "Profit", icon: I.Wallet, path: "/profit" },
];
const DELIVERY_FILTERS = [
  { key: "all", label: "All" },
  { key: "event", label: "Event pickup" },
  { key: "store", label: "Store pickup" },
  { key: "ship", label: "Shipping" },
];
const STATUS_TONE = { Paid: "success", "Partly refunded": "warning", Refunded: "muted" };

const cx = (...names) => names.filter(Boolean).join(" ");
/** An order's key on the page: its short reference could, rarely, repeat. */
const orderKey = (o) => `${o.ref}|${o.created}`;
const storeUrl = (id, tab = "overview") => `${BASE}/${id}${TABS.find((t) => t.key === tab)?.path ?? ""}`;

// ── Talking to the server ───────────────────────────────────────────────────

class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function api(path, { method = "GET", body } = {}) {
  let res;
  try {
    res = await fetch(`${API}/${path}`, {
      method,
      headers: body === undefined ? { Accept: "application/json" } : { Accept: "application/json", "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch {
    throw new ApiError(0, "Couldn't reach ARK. Check your connection and try again.");
  }
  let data = null;
  try {
    data = await res.json();
  } catch {
    // not JSON
  }
  if (!res.ok) throw new ApiError(res.status, data?.error ?? "Something went wrong. Try again in a minute.");
  return data;
}

// ── Routing: /dashboard, /dashboard/ark, /dashboard/<store>[/<tab>] ─────────

const Navigate = createContext(() => {});

function useLocation() {
  const read = () => ({ path: window.location.pathname, search: window.location.search });
  const [loc, setLoc] = useState(read);
  useEffect(() => {
    const onPop = () => setLoc(read());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  const navigate = useCallback((to, { replace = false } = {}) => {
    if (replace) window.history.replaceState(null, "", to);
    else window.history.pushState(null, "", to);
    setLoc(read());
    if (!replace) window.scrollTo(0, 0);
  }, []);
  return [loc, navigate];
}

function parseRoute(pathname) {
  const rest = pathname.replace(/^\/dashboard(\.html)?/, "").split("/").filter(Boolean);
  if (!rest.length) return { page: "home" };
  if (rest[0] === "ark") return rest.length === 1 ? { page: "admin" } : { page: "missing" };
  const tab = rest[1] ?? "overview";
  if (rest.length > 2 || !TABS.some((t) => t.key === tab)) return { page: "missing" };
  return { page: "store", storeId: rest[0], tab };
}

function Link({ to, children, onClick, ...rest }) {
  const navigate = useContext(Navigate);
  return (
    <a
      href={to}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        navigate(to);
      }}
      {...rest}
    >
      {children}
    </a>
  );
}

function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · ARK Store Dashboard` : "ARK Store Dashboard";
  }, [title]);
}

// ── Small pieces ────────────────────────────────────────────────────────────

const Logo = ({ size = 40 }) => <img src={LOGO} alt="" width={size} height={size} decoding="async" className="logo" />;

function Brand() {
  return (
    <span className="brand">
      <Logo size={42} />
      <span className="brand-mark" aria-hidden="true">ARK</span>
      <span className="brand-name" aria-hidden="true">
        <span>Store Dashboard</span>
        <small>by ARK Screen Printing</small>
      </span>
      <span className="sr-only">ARK Store Dashboard</span>
    </span>
  );
}

const Status = ({ tone, children }) => <span className="status" data-tone={tone}>{children}</span>;

function Stat({ figure, label, caption }) {
  return (
    <div className="stat">
      <span className="label">{label}</span>
      <span className="stat-figure">{figure}</span>
      {caption && <span className="stat-caption">{caption}</span>}
    </div>
  );
}

function Notice({ tone = "info", title, children, action }) {
  return (
    <div className="notice" data-tone={tone} role={tone === "error" ? "alert" : undefined}>
      <div>
        {title && <p className="notice-title">{title}</p>}
        {children && <div className="notice-body">{children}</div>}
      </div>
      {action}
    </div>
  );
}

function Button({ variant = "outline", children, className, ...rest }) {
  return <button type="button" className={cx("btn", `btn-${variant}`, className)} {...rest}>{children}</button>;
}

function Sheet({ open, onClose, title, children }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  return (
    <dialog ref={ref} className="sheet" onClose={onClose} onClick={(e) => { if (e.target === ref.current) onClose(); }} aria-label={title}>
      <div className="sheet-inner">
        <div className="sheet-head">
          <h2 className="display">{title}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close"><I.Close /></button>
        </div>
        {children}
      </div>
    </dialog>
  );
}

// ── The frame: rail, topbar, tab bar (after the Studio's AppShell) ─────────

function Shell({ me, store, tab, title, crumb, actions, children, onSignOut, admin = false }) {
  const [moreOpen, setMoreOpen] = useState(false);
  usePageTitle(store ? `${TABS.find((t) => t.key === tab)?.label ?? ""} · ${store.name}` : title);
  const closeMore = () => setMoreOpen(false);
  const showAllStores = me.admin || me.stores.length > 1;

  const footLinks = (onPick) => (
    <>
      {showAllStores && <Link to={BASE} className="rail-item" onClick={onPick} aria-current={!store && !admin ? "page" : undefined}><I.Store />All stores</Link>}
      {me.admin && <Link to={`${BASE}/ark`} className="rail-item" onClick={onPick} aria-current={admin ? "page" : undefined}><I.Settings />ARK settings</Link>}
      <a className="rail-help" href={me.contact.phoneHref}>
        <span className="label">Questions about your store?</span>
        Call ARK at {me.contact.phone}
      </a>
      <button type="button" className="rail-item" onClick={() => { onPick?.(); onSignOut(); }}><I.SignOut />Sign out</button>
    </>
  );

  return (
    <div className="shell">
      <a href="#content" className="skip">Skip to the dashboard</a>
      <aside className="rail" aria-label="Store dashboard">
        <Link to={BASE} className="rail-brand">
          <Logo />
          <span className="rail-brand-text">
            <span className="rail-brand-mark">ARK</span>
            <span className="label">Store Dashboard</span>
          </span>
        </Link>
        {store && (
          <>
            <div className="rail-store">
              <span className="label">Store</span>
              <strong>{store.name}</strong>
            </div>
            <nav className="rail-nav" aria-label="Sections">
              {TABS.map((t) => {
                const Icon = t.icon;
                return <Link key={t.key} to={storeUrl(store.id, t.key)} className="rail-item" aria-current={t.key === tab ? "page" : undefined}><Icon />{t.label}</Link>;
              })}
            </nav>
          </>
        )}
        <div className="rail-foot">{footLinks()}</div>
      </aside>

      <div className={cx("main", store && "has-tabbar")}>
        <header className="topbar">
          <div className="topbar-title">
            <Link to={BASE} className="topbar-logo" aria-label="Store dashboard home"><Logo size={36} /></Link>
            <div className="topbar-heading">
              {crumb && <span className="crumb">{crumb}</span>}
              <h1>{title}</h1>
            </div>
          </div>
          <div className="topbar-actions">
            {actions}
            <button type="button" className="icon-btn topbar-more" onClick={() => setMoreOpen(true)} aria-haspopup="dialog" aria-label="Menu"><I.More /></button>
          </div>
        </header>
        <main id="content" className="content">{children}</main>
      </div>

      {store && (
        <nav className="tabbar" aria-label="Sections">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = t.key === tab;
            return (
              <Link key={t.key} to={storeUrl(store.id, t.key)} aria-current={active ? "page" : undefined} className="tabbar-item">
                <span className="tabbar-pill"><Icon /></span>
                {t.short}
              </Link>
            );
          })}
        </nav>
      )}
      <Sheet open={moreOpen} onClose={closeMore} title="Menu">
        <p className="sheet-who">Signed in as <strong>{me.email}</strong></p>
        <div className="sheet-links">{footLinks(closeMore)}</div>
      </Sheet>
    </div>
  );
}

function Splash({ error, onRetry }) {
  usePageTitle("");
  return (
    <div className="auth">
      <header className="auth-head"><a href="/" className="auth-home"><Brand /></a></header>
      <main id="content" className="auth-main auth-narrow">
        {error ? <Notice tone="error" title="The dashboard didn't load." action={<Button onClick={onRetry}>Try again</Button>}>{error}</Notice> : <p className="loading" role="status">Loading your dashboard…</p>}
      </main>
    </div>
  );
}

// ── Sign-in: an emailed 6-digit code, or the email's one-tap link ──────────

function SignIn({ token, onSignedIn }) {
  usePageTitle("Sign in");
  const [step, setStep] = useState(token ? "link" : "email");
  const [email, setEmail] = useState(() => {
    try {
      return window.localStorage.getItem(EMAIL_KEY) ?? "";
    } catch {
      return "";
    }
  });
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sentAgain, setSentAgain] = useState(false);
  const codeRef = useRef(null);

  useEffect(() => {
    if (step === "code") codeRef.current?.focus();
  }, [step]);

  async function run(work) {
    setBusy(true);
    setError("");
    try {
      await work();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const sendCode = (again = false) => run(async () => {
    await api("sign-in", { method: "POST", body: { email } });
    try {
      window.localStorage.setItem(EMAIL_KEY, email.trim());
    } catch {
      // a convenience only
    }
    setSentAgain(again);
    setCode("");
    setStep("code");
  });

  const verifyCode = () => run(async () => {
    await api("verify", { method: "POST", body: { email, code } });
    await onSignedIn();
  });

  const verifyLink = () => run(async () => {
    try {
      await api("verify", { method: "POST", body: { token } });
    } catch (err) {
      setStep("email");
      throw err;
    }
    await onSignedIn();
  });

  return (
    <div className="auth">
      <a href="#content" className="skip">Skip to sign-in</a>
      <header className="auth-head">
        <a href="/" className="auth-home"><Brand /></a>
        <a href="/" className="link"><I.ArrowLeft size={16} /><span className="hide-sm">arkscreenprinting.com</span></a>
      </header>
      <main id="content" className="auth-main">
        <section className="auth-aside" aria-labelledby="promise">
          <span className="label tan">For stores ARK builds for you</span>
          <h1 id="promise" className="display auth-title">Your store, <span className="accent">at a glance.</span></h1>
          <ul className="promise">
            <li><I.Orders /><span><strong>Every order as it comes in</strong>Who bought what, and how it gets to them.</span></li>
            <li><I.Shirt /><span><strong>What to print, by size</strong>Counts for every garment, ready for the print run.</span></li>
            <li><I.Wallet /><span><strong>Your profit, worked out</strong>Sales less ARK's quote, and what ARK has paid you.</span></li>
          </ul>
        </section>

        <section className="panel auth-card" aria-labelledby="signin-title">
          {step === "link" && (
            <>
              <h2 id="signin-title" className="display">Finish signing in</h2>
              <p className="muted">You opened the sign-in link from your email. Tap below to open your dashboard.</p>
              {error && <p className="form-error" role="alert">{error}</p>}
              <Button variant="primary" className="btn-block" onClick={verifyLink} disabled={busy}>{busy ? "Signing in…" : "Sign in"}</Button>
            </>
          )}

          {step === "email" && (
            <form onSubmit={(e) => { e.preventDefault(); sendCode(); }} noValidate>
              <h2 id="signin-title" className="display">Sign in</h2>
              <p className="muted">Use the email address ARK set up for your store. We'll send a 6-digit code and a one-tap link. No password needed.</p>
              <label className="field">
                <span className="field-label">Email address</span>
                <input type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck="false" required value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={error ? "true" : undefined} aria-describedby={error ? "signin-error" : undefined} />
              </label>
              {error && <p className="form-error" id="signin-error" role="alert">{error}</p>}
              <button type="submit" className="btn btn-primary btn-block" disabled={busy || !email.trim()}>{busy ? "Sending…" : "Email me a code"}</button>
            </form>
          )}

          {step === "code" && (
            <form onSubmit={(e) => { e.preventDefault(); verifyCode(); }} noValidate>
              <h2 id="signin-title" className="display">Check your email</h2>
              <p className="muted" role="status">
                {sentAgain ? "We sent a new code" : "We sent a code"} to <strong className="ink">{email.trim()}</strong>, if it can see a store. It works for 15 minutes.
              </p>
              <label className="field">
                <span className="field-label">6-digit code</span>
                <input ref={codeRef} className="code-input" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]*" maxLength={7} value={code} onChange={(e) => setCode(e.target.value.replace(/[^\d ]/g, ""))} aria-invalid={error ? "true" : undefined} aria-describedby={error ? "code-error" : undefined} />
              </label>
              {error && <p className="form-error" id="code-error" role="alert">{error}</p>}
              <button type="submit" className="btn btn-primary btn-block" disabled={busy || code.replace(/\s/g, "").length !== 6}>{busy ? "Checking…" : "Sign in"}</button>
              <div className="auth-links">
                <button type="button" className="link" onClick={() => { setStep("email"); setError(""); }}>Use a different email</button>
                <button type="button" className="link" onClick={() => sendCode(true)} disabled={busy}>Send a new code</button>
              </div>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}

// ── Store list (ARK, or a client with more than one store) ──────────────────

function StoreList({ me, onSignOut }) {
  return (
    <Shell me={me} title="Your stores" crumb={me.admin ? "Every made-for-you store" : undefined} onSignOut={onSignOut}>
      <div className="card-grid">
        {me.stores.map((s) => (
          <Link key={s.id} to={storeUrl(s.id)} className="panel store-card">
            <span className="label muted">{s.client}</span>
            <span className="display store-card-name">{s.name}</span>
            <span className="link">Open the dashboard <I.ChevronRight size={16} /></span>
          </Link>
        ))}
        {me.admin && (
          <Link to={`${BASE}/ark`} className="panel panel-sand store-card">
            <span className="label muted">ARK only</span>
            <span className="display store-card-name">ARK settings</span>
            <span className="muted">Who can see each store, the cost sheets, and payments to clients.</span>
            <span className="link">Open <I.ChevronRight size={16} /></span>
          </Link>
        )}
      </div>
    </Shell>
  );
}

function Missing({ me, onSignOut }) {
  return (
    <Shell me={me} title="Not found" onSignOut={onSignOut}>
      <Notice title="There's nothing here." action={<Link to={BASE} className="btn btn-outline">Go to your dashboard</Link>}>
        The link may be old, or this address can't see that store.
      </Notice>
    </Shell>
  );
}

// ── A store's pages ─────────────────────────────────────────────────────────

function StorePage({ me, store, tab, entry, onLoad, onSignOut }) {
  useEffect(() => {
    if (!entry) onLoad(store.id);
  }, [entry, onLoad, store.id]);
  const data = entry?.value;
  const tabInfo = TABS.find((t) => t.key === tab);

  const refresh = (
    <>
      {data && <span className="asof hide-sm">Updated {clock(data.asOf)}</span>}
      <Button onClick={() => onLoad(store.id)} disabled={entry?.loading} aria-label="Refresh the orders"><I.Refresh size={18} /><span className="hide-sm">{entry?.loading ? "Refreshing…" : "Refresh"}</span></Button>
    </>
  );

  let body;
  if (!data && entry?.error) body = <Notice tone="error" title="The orders didn't load." action={<Button onClick={() => onLoad(store.id)}>Try again</Button>}>{entry.error}</Notice>;
  else if (!data) body = <p className="loading" role="status">Loading the orders…</p>;
  else {
    const Page = { overview: Overview, orders: OrdersPage, "print-counts": PrintCounts, profit: Profit }[tab];
    body = (
      <>
        {entry.error && <Notice tone="error" title="Couldn't refresh.">{entry.error} The figures below are from {clock(data.asOf)}.</Notice>}
        <Page data={data} me={me} />
      </>
    );
  }

  return (
    <Shell me={me} store={store} tab={tab} title={tabInfo.label} crumb={store.name} actions={refresh} onSignOut={onSignOut}>
      {body}
    </Shell>
  );
}

function StoreStatus({ store }) {
  if (store.closed) return <Status tone="muted">Orders closed{store.closesAt ? ` ${shortDay(store.closesAt)}` : ""}</Status>;
  return <Status tone="success">Taking orders{store.closesAt ? ` until ${longDay(store.closesAt)}` : ""}</Status>;
}

function Overview({ data }) {
  const { store, totals, orders, profit, payments } = data;
  const latest = orders.slice(0, 5);
  return (
    <div className="stack">
      <div className="overview-head">
        <StoreStatus store={store} />
        <span className="muted">{store.client}</span>
      </div>

      <section className="panel" aria-label="The store so far">
        <div className="stats">
          <Stat label="Orders" figure={totals.orders.toLocaleString("en-US")} caption={plural(totals.garments, "garment")} />
          <Stat label="Garment sales" figure={usdShort(totals.salesCents)} caption="Before shipping and tax" />
          <Stat label="Your profit so far" figure={profit.ready ? usdShort(profit.totals.profitCents) : "—"} caption={profit.ready ? (profit.complete ? "After ARK's costs" : "Some costs aren't in yet") : "Shows once ARK adds the costs"} />
          <Stat label="Paid to you" figure={usdShort(payments.paidCents)} caption={profit.ready ? `${usd(payments.owedCents)} still to come` : "Payments ARK has sent"} />
        </div>
      </section>

      <div className="two-col">
        <section className="panel" aria-labelledby="runs-title">
          <div className="panel-head">
            <h2 id="runs-title" className="display h2">Print runs</h2>
            <Link to={storeUrl(store.id, "print-counts")} className="link">Print counts <I.ChevronRight size={16} /></Link>
          </div>
          <p className="muted small">Garments with the same front print are printed together, tees and crewnecks alike. The bigger the run, the lower ARK's price per garment.</p>
          <div className="runs">
            {profit.groups.map((g) => <Run key={g.id} group={g} tiers={profit.tiers} />)}
          </div>
        </section>

        <section className="panel" aria-labelledby="delivery-title">
          <h2 id="delivery-title" className="display h2">How buyers get their order</h2>
          <ul className="delivery">
            {DELIVERY_FILTERS.slice(1).map((d) => (
              <li key={d.key}>
                <span>{d.label}</span>
                <strong>{plural(totals.byDelivery[d.key] ?? 0, "order")}</strong>
              </li>
            ))}
          </ul>
          <p className="muted small">Shipping &amp; handling ({usd(totals.shippingCents)} so far) goes to ARK for postage. Sales tax ({usd(totals.taxCents)}) goes to the state.</p>
        </section>
      </div>

      <section className="panel" aria-labelledby="latest-title">
        <div className="panel-head">
          <h2 id="latest-title" className="display h2">Latest orders</h2>
          {orders.length > 0 && <Link to={storeUrl(store.id, "orders")} className="link">All orders <I.ChevronRight size={16} /></Link>}
        </div>
        {latest.length ? (
          <ul className="rows">
            {latest.map((o) => (
              <li key={orderKey(o)} className="row-line">
                <span className="row-main"><strong>{o.buyer.name || o.buyer.email}</strong><span className="muted">{plural(o.garments, "garment")} · {o.delivery.label}{o.delivery.place ? ` to ${o.delivery.place}` : ""}</span></span>
                <span className="row-side"><span className="num">{usd(o.subtotalCents)}</span><span className="muted small">{orderTime(o.created)}</span></span>
              </li>
            ))}
          </ul>
        ) : <p className="empty">No orders yet. They show here as soon as someone checks out.</p>}
      </section>
    </div>
  );
}

function Run({ group, tiers }) {
  const progress = runProgress(group, tiers);
  return (
    <div className="run">
      <div className="run-head">
        <strong>{group.label}</strong>
        <span className="num">{plural(group.garments, "garment")}</span>
      </div>
      <div className="meter" role="img" aria-label={group.next ? `${group.garments} of ${group.next.at} garments` : "At the lowest price"}><span style={{ width: `${Math.round(progress * 100)}%` }} /></div>
      <p className="muted small">{runNote(group)}</p>
    </div>
  );
}

function OrdersPage({ data }) {
  const { store, orders } = data;
  const [query, setQuery] = useState("");
  const [delivery, setDelivery] = useState("all");
  const [open, setOpen] = useState(() => new Set());
  const searched = useMemo(() => orders.filter((o) => matchesOrder(o, query)), [orders, query]);
  const shown = delivery === "all" ? searched : searched.filter((o) => o.delivery.kind === delivery);
  const kept = shown.filter((o) => o.status !== "Refunded");
  const count = (key) => (key === "all" ? searched.length : searched.filter((o) => o.delivery.kind === key).length);
  const toggle = (key) => setOpen((s) => {
    const next = new Set(s);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    return next;
  });
  const filterLabel = DELIVERY_FILTERS.find((d) => d.key === delivery).label;

  return (
    <div className="stack">
      <div className="toolbar no-print">
        <label className="search">
          <I.Search size={18} />
          <span className="sr-only">Search orders</span>
          <input type="search" placeholder="Search name, email, order or garment" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <div className="toolbar-actions">
          <a className="btn btn-outline" href={`${API}/stores/${store.id}/orders.csv`} download><I.Download size={18} />Spreadsheet</a>
          <Button onClick={() => window.print()} disabled={!kept.length}><I.Printer size={18} />Pickup list</Button>
        </div>
      </div>
      <div className="tabs no-print" role="group" aria-label="Delivery">
        {DELIVERY_FILTERS.map((d) => (
          <button key={d.key} type="button" className="tab" aria-pressed={delivery === d.key} onClick={() => setDelivery(d.key)}>{d.label} <span className="tab-count">{count(d.key)}</span></button>
        ))}
      </div>

      <section className="panel panel-list no-print" aria-label="Orders">
        {shown.length ? (
          <ul className="orders">
            <li className="orders-head" aria-hidden="true"><span>Order</span><span>Buyer</span><span>Delivery</span><span className="num">Garments</span><span className="num">Paid</span><span>Status</span></li>
            {shown.map((o) => {
              const isOpen = open.has(orderKey(o));
              return (
                <li key={orderKey(o)} className={cx("order", isOpen && "is-open")}>
                  <button type="button" className="order-row" aria-expanded={isOpen} onClick={() => toggle(orderKey(o))}>
                    <span className="order-ref"><strong>#{o.ref}</strong><span className="muted small">{orderTime(o.created)}</span></span>
                    <span className="order-buyer"><strong>{o.buyer.name || "No name given"}</strong><span className="muted small">{o.buyer.email}</span></span>
                    <span className="order-delivery">{o.delivery.label}{o.delivery.place && <span className="muted small">{o.delivery.place}</span>}</span>
                    <span className="order-garments num">{o.garments}</span>
                    <span className="order-total num">{usd(o.totalCents)}</span>
                    <span className="order-status"><Status tone={STATUS_TONE[o.status]}>{o.status}</Status><I.ChevronDown size={18} className="chev" /></span>
                  </button>
                  {isOpen && (
                    <div className="order-detail">
                      <ul className="items">
                        {o.items.map((item, i) => (
                          <li key={i}>
                            <span><strong>{item.quantity} ×</strong> {item.product}<span className="muted small">{item.garment} · {item.fit} · {item.size}{item.colour ? ` · ${item.colour}` : ""}{item.front ? ` · ${item.front} front` : ""}</span></span>
                            <span className="num">{usd(item.totalCents)}</span>
                          </li>
                        ))}
                      </ul>
                      <dl className="money">
                        <div><dt>Garments</dt><dd>{usd(o.subtotalCents)}</dd></div>
                        <div><dt>Shipping &amp; handling</dt><dd>{usd(o.shippingCents)}</dd></div>
                        <div><dt>Sales tax</dt><dd>{usd(o.taxCents)}</dd></div>
                        <div className="money-total"><dt>Paid</dt><dd>{usd(o.totalCents)}</dd></div>
                        {o.refundedCents > 0 && <div><dt>Refunded</dt><dd>−{usd(o.refundedCents)}</dd></div>}
                      </dl>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="empty">{orders.length ? "No orders match. Try another search or delivery." : "No orders yet. They show here as soon as someone checks out."}</p>
        )}
      </section>
      {shown.length > 0 && (
        <p className="muted small no-print">
          {plural(kept.length, "order")} · {plural(kept.reduce((n, o) => n + o.garments, 0), "garment")} · {usd(kept.reduce((n, o) => n + o.subtotalCents, 0))} in garment sales{kept.length !== shown.length ? ". Fully refunded orders aren't counted." : "."} Times are Colorado time.
        </p>
      )}

      <PickupSheet store={store} orders={byBuyer(kept)} filter={filterLabel} query={query} />
    </div>
  );
}

/** Shown only when printed: a checklist for handing orders out. */
function PickupSheet({ store, orders, filter, query }) {
  return (
    <section className="print-only pickup">
      <h2>{store.name}: pickup list</h2>
      <p>{filter === "All" ? "Every delivery" : filter}{query ? `, matching “${query}”` : ""} · {plural(orders.length, "order")} · printed {shortDay(Date.now())}</p>
      <table>
        <thead><tr><th className="tick">Done</th><th>Name</th><th>Order</th><th>Garments</th><th>Delivery</th></tr></thead>
        <tbody>
          {orders.map((o) => (
            <tr key={orderKey(o)}>
              <td className="tick"><span className="box" /></td>
              <td><strong>{o.buyer.name}</strong><br />{o.buyer.email}</td>
              <td>#{o.ref}</td>
              <td>{o.items.map((item, i) => <div key={i}>{item.quantity} × {itemLine(item)}</div>)}</td>
              <td>{o.delivery.label}{o.delivery.place ? `, ${o.delivery.place}` : ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function PrintCounts({ data }) {
  const { store, printCounts, profit } = data;
  const grids = printGrids(printCounts);
  const total = grids.reduce((n, g) => n + g.total, 0);
  return (
    <div className="stack">
      <div className="toolbar">
        <p className="muted toolbar-text">{plural(total, "garment")} to print. Fully refunded orders are left out.</p>
        <div className="toolbar-actions">
          <a className="btn btn-outline" href={`${API}/stores/${store.id}/print-counts.csv`} download><I.Download size={18} />Spreadsheet</a>
        </div>
      </div>
      <div className="runs-row">
        {profit.groups.map((g) => (
          <div key={g.id} className="panel panel-sand run-tile">
            <span className="label muted">{g.label} front</span>
            <span className="stat-figure">{g.garments.toLocaleString("en-US")}</span>
            <span className="muted small">{plural(g.garments, "garment")} in this print run</span>
          </div>
        ))}
      </div>
      {grids.length ? grids.map((g) => (
        <section key={g.product} className="panel" aria-label={g.product}>
          <div className="panel-head">
            <h2 className="display h2">{g.product}</h2>
            <span className="muted small">{[g.front && `${g.front} front`, g.colour].filter(Boolean).join(" · ")}</span>
          </div>
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr><th scope="col">Garment</th>{g.sizes.map((s) => <th key={s} scope="col" className="num">{s}</th>)}<th scope="col" className="num">Total</th></tr>
              </thead>
              <tbody>
                {g.rows.map((r) => (
                  <tr key={`${r.garment}|${r.fit}`}>
                    <th scope="row">{r.garment} <span className="muted">{r.fit}</span></th>
                    {g.sizes.map((s) => <td key={s} className="num">{r.sizes[s] ?? <span className="muted">–</span>}</td>)}
                    <td className="num strong">{r.total}</td>
                  </tr>
                ))}
              </tbody>
              {g.rows.length > 1 && (
                <tfoot>
                  <tr><td>Total</td>{g.sizes.map((s) => <td key={s} className="num">{g.columnTotals[s]}</td>)}<td className="num">{g.total}</td></tr>
                </tfoot>
              )}
            </table>
          </div>
        </section>
      )) : <section className="panel"><p className="empty">Nothing to print yet. Counts show here as orders come in.</p></section>}
    </div>
  );
}

function Profit({ data, me }) {
  const { store, profit, payments, totals } = data;
  if (!profit.ready) {
    return (
      <Notice title="Profit shows here once ARK adds this store's costs." action={me.admin ? <Link to={`${BASE}/ark`} className="btn btn-outline">Add the costs</Link> : undefined}>
        ARK's price for each garment comes from your quote. Until it's in, the dashboard can't work out your profit. Sales so far: {usd(totals.salesCents)}.
      </Notice>
    );
  }
  const t = profit.totals;
  return (
    <div className="stack">
      {!profit.complete && (
        <Notice tone="warning" title="Some garments don't have a cost yet, so profit is too high.">
          Missing: {profit.missing.map((m) => `${m.group}, ${m.blank}`).join("; ")}.
        </Notice>
      )}
      <section className="panel profit-hero" aria-label="Your profit">
        <div className="stat">
          <span className="label">{profit.final ? "Your profit" : "Your profit so far"}</span>
          <span className="stat-figure big">{usd(t.profitCents)}</span>
        </div>
        <dl className="sum">
          <div><dt>Garment sales</dt><dd>{usd(t.salesCents)}</dd></div>
          <div><dt>ARK's price for the garments</dt><dd>−{usd(t.costCents)}</dd></div>
          {t.refundsCents > 0 && <div><dt>Partial refunds</dt><dd>−{usd(t.refundsCents)}</dd></div>}
          <div className="sum-total"><dt>Profit</dt><dd>{usd(t.profitCents)}</dd></div>
        </dl>
        {!profit.final && <p className="muted small">The store is still taking orders, so this can still go up: when a print run reaches {profit.tiers.slice(1).join(" or ")} garments, ARK's price drops for every garment in it.</p>}
      </section>

      <div className="two-col">
        <section className="panel" aria-labelledby="pay-title">
          <h2 id="pay-title" className="display h2">Payments from ARK</h2>
          <div className="stats two">
            <Stat label="Paid to you" figure={usdShort(payments.paidCents)} />
            <Stat label="Still to come" figure={usdShort(payments.owedCents)} />
          </div>
          {payments.list.length ? (
            <ul className="rows">
              {payments.list.map((p) => (
                <li key={p.id} className="row-line">
                  <span className="row-main"><strong>{usd(p.amountCents)}</strong><span className="muted small">{[p.method, p.note].filter(Boolean).join(" · ")}</span></span>
                  <span className="row-side muted small">{paidDay(p.date)}</span>
                </li>
              ))}
            </ul>
          ) : <p className="empty">No payments yet. Each one ARK sends shows here.</p>}
        </section>

        <section className="panel" aria-labelledby="how-title">
          <h2 id="how-title" className="display h2">How it's worked out</h2>
          <ul className="how">
            <li>Each garment earns what the buyer paid for it, less ARK's price for that garment from your quote.</li>
            <li>ARK's price depends on the print run: every garment with the same front print, tees and crewnecks together. Under {profit.tiers[1]} garments it's the {profit.tiers[0]}-piece price.</li>
            {profit.upchargeSizes?.length > 0 && <li>Adult {profit.upchargeSizes.join(" and ")} garments add the quote's upcharge.</li>}
            <li>Shipping &amp; handling goes to ARK for postage, sales tax goes to the state, and card fees are ARK's.</li>
            <li>A fully refunded order doesn't count. A partial refund comes off your profit.</li>
          </ul>
        </section>
      </div>

      <section className="panel" aria-labelledby="runs2-title">
        <h2 id="runs2-title" className="display h2">Print runs</h2>
        <div className="runs">
          {profit.groups.map((g) => <Run key={g.id} group={g} tiers={profit.tiers} />)}
        </div>
      </section>

      <section className="panel" aria-labelledby="lines-title">
        <h2 id="lines-title" className="display h2">By garment</h2>
        {profit.lines.length ? (
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr><th scope="col">Product</th><th scope="col">Garment</th><th scope="col" className="num">Sold</th><th scope="col" className="num">Sales</th><th scope="col" className="num">ARK's price</th><th scope="col" className="num">Profit</th></tr>
              </thead>
              <tbody>
                {profit.lines.map((l) => (
                  <tr key={`${l.productId}|${l.variant}`}>
                    <th scope="row">{l.product}</th>
                    <td>{l.garment} <span className="muted">{l.fit}</span></td>
                    <td className="num">{l.quantity}</td>
                    <td className="num">{usd(l.salesCents)}</td>
                    <td className="num">{l.priced ? usd(l.costCents) : <span className="muted">Not set</span>}</td>
                    <td className="num strong">{usd(l.profitCents)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr><td colSpan={2}>Total</td><td className="num">{profit.lines.reduce((n, l) => n + l.quantity, 0)}</td><td className="num">{usd(t.salesCents)}</td><td className="num">{usd(t.costCents)}</td><td className="num">{usd(t.salesCents - t.costCents)}</td></tr>
              </tfoot>
            </table>
          </div>
        ) : <p className="empty">No garments sold yet.</p>}
        {t.refundsCents > 0 && <p className="muted small">Partial refunds of {usd(t.refundsCents)} come off the total above.</p>}
        <p className="muted small">{store.closed ? "Orders are closed, so these are the final figures." : `As of ${clock(data.asOf)}, Colorado time.`}</p>
      </section>
    </div>
  );
}

// ── ARK settings: client lists, cost sheets, payments ───────────────────────

function AdminPage({ me, onSignOut, onUnauthorized }) {
  const [state, setState] = useState({ loading: true });
  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: "" }));
    try {
      setState({ value: await api("admin"), loading: false });
    } catch (err) {
      if (err.status === 401) onUnauthorized();
      else setState((s) => ({ ...s, loading: false, error: err.message }));
    }
  }, [onUnauthorized]);
  useEffect(() => {
    load();
  }, [load]);

  return (
    <Shell me={me} admin title="ARK settings" crumb="Only ARK sees this page" onSignOut={onSignOut}>
      {state.error && <Notice tone="error" title="Settings didn't load." action={<Button onClick={load}>Try again</Button>}>{state.error}</Notice>}
      {!state.value && !state.error && <p className="loading" role="status">Loading…</p>}
      {state.value?.stores.map((s) => <AdminStore key={s.id} store={s} onUnauthorized={onUnauthorized} />)}
    </Shell>
  );
}

function useSaver(onUnauthorized) {
  const [state, setState] = useState({ busy: false, message: "", error: "" });
  const save = async (work, message) => {
    setState({ busy: true, message: "", error: "" });
    try {
      const result = await work();
      setState({ busy: false, message, error: "" });
      return result;
    } catch (err) {
      if (err.status === 401) onUnauthorized();
      setState({ busy: false, message: "", error: err.message });
      return null;
    }
  };
  return [state, save];
}

function SaveState({ state }) {
  if (state.error) return <p className="form-error" role="alert">{state.error}</p>;
  if (state.message) return <p className="saved" role="status"><I.Check size={16} />{state.message}</p>;
  return null;
}

const changedBy = (record) => (record?.updatedAt ? `Last changed ${shortDay(record.updatedAt)}, ${clock(record.updatedAt)}${record.updatedBy ? ` by ${record.updatedBy}` : ""}.` : "");

function AdminStore({ store, onUnauthorized }) {
  return (
    <section className="admin-store" aria-labelledby={`admin-${store.id}`}>
      <div className="panel-head">
        <h2 id={`admin-${store.id}`} className="display h2">{store.name}</h2>
        <span className="admin-links">
          <Link to={storeUrl(store.id)} className="link">Dashboard <I.ChevronRight size={16} /></Link>
          <a href={store.exportPath} className="link">Full export with addresses <I.ChevronRight size={16} /></a>
        </span>
      </div>
      <ClientList store={store} onUnauthorized={onUnauthorized} />
      <CostSheet store={store} onUnauthorized={onUnauthorized} />
      <Payments store={store} onUnauthorized={onUnauthorized} />
    </section>
  );
}

function ClientList({ store, onUnauthorized }) {
  const [record, setRecord] = useState(store.clients);
  const [text, setText] = useState((store.clients?.emails ?? []).join("\n"));
  const [state, save] = useSaver(onUnauthorized);
  const typed = text.split(/[\s,;]+/).filter(Boolean);
  const missing = store.suggested.filter((e) => !typed.map((t) => t.toLowerCase()).includes(e));
  const submit = async (e) => {
    e.preventDefault();
    const result = await save(() => api(`admin/stores/${store.id}/clients`, { method: "PUT", body: { emails: typed } }), "Saved. These addresses can sign in now.");
    if (result) {
      setRecord(result.clients);
      setText(result.clients.emails.join("\n"));
    }
  };
  return (
    <form className="panel" onSubmit={submit}>
      <h3 className="h3">Who can see this store</h3>
      <p className="muted small">One email address per line. Each one can sign in and see this store's orders, print counts and profit, but not buyers' street addresses or phones. Taking an address off locks it out straight away.</p>
      <label className="field">
        <span className="field-label">Client email addresses</span>
        <textarea rows={4} value={text} onChange={(e) => setText(e.target.value)} spellCheck="false" autoCapitalize="none" />
      </label>
      {missing.length > 0 && (
        <p className="small">
          The order emails go to {missing.join(", ")}.{" "}
          <button type="button" className="link" onClick={() => setText([...typed, ...missing].join("\n"))}>Add {missing.length === 1 ? "it" : "them"}</button>
        </p>
      )}
      <div className="form-foot">
        <button type="submit" className="btn btn-primary" disabled={state.busy}>{state.busy ? "Saving…" : "Save the list"}</button>
        <span className="muted small">{changedBy(record)}</span>
      </div>
      <SaveState state={state} />
    </form>
  );
}

const emptyGrid = (costing, sheet) => Object.fromEntries(costing.groups.map((g) => [g.id, Object.fromEntries(costing.blanks.map((b) => {
  const row = sheet?.[g.id]?.[b.id] ?? {};
  return [b.id, { ...Object.fromEntries(costing.tiers.map((t) => [String(t), row[String(t)] ?? ""])), upcharge: row.upcharge ?? row["2XL"] ?? "" }];
}))]));

function CostSheet({ store, onUnauthorized }) {
  const { costing } = store;
  const [record, setRecord] = useState(store.costs);
  const [grid, setGrid] = useState(() => emptyGrid(costing, store.costs?.sheet));
  const [paste, setPaste] = useState("");
  const [pasteError, setPasteError] = useState("");
  const [state, save] = useSaver(onUnauthorized);
  const set = (g, b, key, value) => setGrid((cur) => ({ ...cur, [g]: { ...cur[g], [b]: { ...cur[g][b], [key]: value } } }));

  const fill = () => {
    setPasteError("");
    try {
      const parsed = JSON.parse(paste);
      const source = parsed?.groups ?? parsed;
      const known = Object.keys(source ?? {}).filter((g) => costing.groups.some((x) => x.id === g));
      if (!known.length) throw new Error();
      const asText = Object.fromEntries(known.map((g) => [g, Object.fromEntries(Object.entries(source[g] ?? {}).map(([b, row]) => [b, Object.fromEntries(Object.entries(row ?? {}).map(([k, v]) => [k, String(v ?? "")]))]))]));
      setGrid((cur) => {
        const next = emptyGrid(costing, asText);
        for (const g of costing.groups) if (!known.includes(g.id)) next[g.id] = cur[g.id];
        return next;
      });
      setPaste("");
    } catch {
      setPasteError(`That isn't a cost sheet. It should look like {"${costing.groups[0].id}": {"${costing.blanks[0].id}": {"25": "12.34", …}}}.`);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    const result = await save(() => api(`admin/stores/${store.id}/costs`, { method: "PUT", body: { sheet: grid } }), "Saved. Profit uses these prices now.");
    if (result) {
      setRecord(result.costs);
      setGrid(emptyGrid(costing, result.costs.sheet));
    }
  };

  return (
    <form className="panel" onSubmit={submit}>
      <h3 className="h3">ARK's price per garment</h3>
      <p className="muted small">From the quote, in dollars, for each design and blank at each run size. The upcharge is added to adult {costing.upchargeSizes.join(", ")} garments. Clients see the profit these give, never this sheet.</p>
      {costing.groups.map((g) => (
        <fieldset key={g.id} className="cost-group">
          <legend><strong>{g.label}</strong> <span className="muted small">{g.note}</span></legend>
          <div className="table-scroll">
            <table className="table cost-table">
              <thead>
                <tr><th scope="col">Blank</th>{costing.tiers.map((t) => <th key={t} scope="col" className="num">{t} pcs</th>)}<th scope="col" className="num">{costing.upchargeSizes.join("/")} upcharge</th></tr>
              </thead>
              <tbody>
                {costing.blanks.map((b) => (
                  <tr key={b.id}>
                    <th scope="row">{b.label}</th>
                    {costing.tiers.map((t) => (
                      <td key={t} className="num">
                        <input className="money-input" inputMode="decimal" placeholder="0.00" value={grid[g.id][b.id][String(t)]} onChange={(e) => set(g.id, b.id, String(t), e.target.value)} aria-label={`${g.label}, ${b.label}, ${t} pieces`} />
                      </td>
                    ))}
                    <td className="num">
                      {b.upcharge
                        ? <input className="money-input" inputMode="decimal" placeholder="0.00" value={grid[g.id][b.id].upcharge} onChange={(e) => set(g.id, b.id, "upcharge", e.target.value)} aria-label={`${g.label}, ${b.label}, upcharge`} />
                        : <span className="muted">–</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </fieldset>
      ))}
      <details className="paste">
        <summary>Paste a whole cost sheet</summary>
        <label className="field">
          <span className="field-label">Cost sheet (JSON)</span>
          <textarea rows={5} value={paste} onChange={(e) => setPaste(e.target.value)} spellCheck="false" />
        </label>
        {pasteError && <p className="form-error" role="alert">{pasteError}</p>}
        <Button onClick={fill} disabled={!paste.trim()}>Fill in the grid</Button>
        <p className="muted small">This fills the grid above; nothing is saved until you press Save the prices.</p>
      </details>
      <div className="form-foot">
        <button type="submit" className="btn btn-primary" disabled={state.busy}>{state.busy ? "Saving…" : "Save the prices"}</button>
        <span className="muted small">{changedBy(record)}</span>
      </div>
      <SaveState state={state} />
    </form>
  );
}

function Payments({ store, onUnauthorized }) {
  const [list, setList] = useState(store.payments);
  const [form, setForm] = useState(() => ({ date: todayYmd(), amount: "", method: "", note: "" }));
  const [confirming, setConfirming] = useState(null);
  const [state, save] = useSaver(onUnauthorized);
  const field = (key) => ({ value: form[key], onChange: (e) => setForm((f) => ({ ...f, [key]: e.target.value })) });

  const submit = async (e) => {
    e.preventDefault();
    const result = await save(() => api(`admin/stores/${store.id}/payments`, { method: "POST", body: form }), "Recorded. The client sees it on their Profit page.");
    if (result) {
      setList(result.payments);
      setForm({ date: todayYmd(), amount: "", method: form.method, note: "" });
    }
  };
  const remove = async (id) => {
    setConfirming(null);
    const result = await save(() => api(`admin/stores/${store.id}/payments/${id}`, { method: "DELETE" }), "Removed.");
    if (result) setList(result.payments);
  };

  return (
    <form className="panel" onSubmit={submit}>
      <h3 className="h3">Payments to {store.client}</h3>
      <p className="muted small">Record each payment ARK sends, so the client can see what's been paid and what's still to come.</p>
      <div className="pay-form">
        <label className="field"><span className="field-label">Date paid</span><input type="date" required {...field("date")} /></label>
        <label className="field"><span className="field-label">Amount</span><input inputMode="decimal" placeholder="250.00" required {...field("amount")} /></label>
        <label className="field"><span className="field-label">How</span><input list={`methods-${store.id}`} placeholder="Check" maxLength={40} {...field("method")} /></label>
        <label className="field pay-note"><span className="field-label">Note (the client sees it)</span><input maxLength={200} placeholder="First payout" {...field("note")} /></label>
        <datalist id={`methods-${store.id}`}><option value="Check" /><option value="Zelle" /><option value="Venmo" /><option value="Bank transfer" /><option value="Cash" /></datalist>
      </div>
      <div className="form-foot">
        <button type="submit" className="btn btn-primary" disabled={state.busy || !form.amount.trim()}>{state.busy ? "Saving…" : "Record the payment"}</button>
      </div>
      <SaveState state={state} />
      {list.length > 0 && (
        <ul className="rows">
          {list.map((p) => (
            <li key={p.id} className="row-line">
              <span className="row-main"><strong>{usd(p.amountCents)}</strong><span className="muted small">{paidDay(p.date)}{p.method ? ` · ${p.method}` : ""}{p.note ? ` · ${p.note}` : ""}</span></span>
              <span className="row-side">
                {confirming === p.id
                  ? <span className="confirm"><Button variant="danger" onClick={() => remove(p.id)}>Remove {usd(p.amountCents)}</Button><button type="button" className="link" onClick={() => setConfirming(null)}>Keep</button></span>
                  : <button type="button" className="icon-btn" onClick={() => setConfirming(p.id)} aria-label={`Remove the ${usd(p.amountCents)} payment of ${paidDay(p.date)}`}><I.Trash size={18} /></button>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}

// ── The app ─────────────────────────────────────────────────────────────────

function App() {
  const [loc, navigate] = useLocation();
  const [me, setMe] = useState(undefined); // undefined: loading; null: signed out
  const [meError, setMeError] = useState("");
  const [stores, setStores] = useState({});

  const loadMe = useCallback(async () => {
    setMeError("");
    try {
      setMe(await api("me"));
    } catch (err) {
      if (err.status === 401) setMe(null);
      else setMeError(err.message);
    }
  }, []);
  useEffect(() => {
    loadMe();
  }, [loadMe]);

  const signedOut = useCallback(() => {
    setMe(null);
    setStores({});
  }, []);

  const loadStore = useCallback(async (id) => {
    setStores((s) => ({ ...s, [id]: { ...s[id], loading: true, error: "" } }));
    try {
      const value = await api(`stores/${id}`);
      setStores((s) => ({ ...s, [id]: { value, loading: false, error: "" } }));
    } catch (err) {
      if (err.status === 401) return signedOut();
      setStores((s) => ({ ...s, [id]: { ...s[id], loading: false, error: err.message } }));
    }
  }, [signedOut]);

  const signOut = useCallback(async () => {
    try {
      await api("sign-out", { method: "POST", body: {} });
    } catch {
      // the cookie goes either way once the session is gone
    }
    signedOut();
    navigate(BASE);
  }, [navigate, signedOut]);

  const token = new URLSearchParams(loc.search).get("signin");
  const route = parseRoute(loc.path);

  useEffect(() => {
    if (me && !token && route.page === "home" && !me.admin && me.stores.length === 1) navigate(storeUrl(me.stores[0].id), { replace: true });
  }, [me, token, route.page, navigate]);

  let view;
  if (me === undefined) view = <Splash error={meError} onRetry={loadMe} />;
  else if (me === null || token) {
    view = (
      <SignIn
        key={token ?? "form"}
        token={token}
        onSignedIn={async () => {
          if (token) navigate(BASE, { replace: true });
          await loadMe();
        }}
      />
    );
  } else if (route.page === "home") view = <StoreList me={me} onSignOut={signOut} />;
  else if (route.page === "admin" && me.admin) view = <AdminPage me={me} onSignOut={signOut} onUnauthorized={signedOut} />;
  else if (route.page === "store" && me.stores.some((s) => s.id === route.storeId)) {
    const store = me.stores.find((s) => s.id === route.storeId);
    view = <StorePage me={me} store={store} tab={route.tab} entry={stores[store.id]} onLoad={loadStore} onSignOut={signOut} />;
  } else view = <Missing me={me} onSignOut={signOut} />;

  return <Navigate.Provider value={navigate}>{view}</Navigate.Provider>;
}

const root = document.getElementById("root");
if (root) createRoot(root).render(<StrictMode><App /></StrictMode>);
