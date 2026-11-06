"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MenuCat, MenuProduct } from "@/lib/types";
import "../menu.css";

const rp = (n: number) => "Rp " + Math.round(n).toLocaleString("id-ID");
const WA_NUMBER = process.env.NEXT_PUBLIC_WA_NUMBER ?? "";

function useCalm() {
  const [calm, setCalm] = useState(false);
  useEffect(() => {
    setCalm(matchMedia("(prefers-reduced-motion:reduce)").matches);
  }, []);
  return calm;
}

/** Angka yang menghitung naik-turun dengan rAF — port tween() dari desain. */
function useTweenNum(to: number, calm: boolean) {
  const [v, setV] = useState(to);
  const cur = useRef(to);
  useEffect(() => {
    const from = cur.current;
    cur.current = to;
    if (calm || from === to) {
      setV(to);
      return;
    }
    const t0 = performance.now();
    const dur = 450;
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - k, 3);
      setV(from + (to - from) * e);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to, calm]);
  return v;
}

export default function MenuClient({
  meja,
  label,
  cats,
  products,
}: {
  meja: string;
  label: string;
  cats: MenuCat[];
  products: MenuProduct[];
}) {
  const calm = useCalm();

  // ---- keranjang + persist per meja -------------------------------------
  const [cart, setCart] = useState<Record<string, number>>({});
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`cart-${meja}`);
      if (raw) setCart(JSON.parse(raw));
    } catch {
      /* keranjang rusak: mulai kosong */
    }
  }, [meja]);
  useEffect(() => {
    try {
      localStorage.setItem(`cart-${meja}`, JSON.stringify(cart));
    } catch {
      /* storage penuh: abaikan */
    }
  }, [cart, meja]);

  const count = Object.values(cart).reduce((a, b) => a + b, 0);
  const total = products.reduce((s, p) => s + (cart[p.id] || 0) * p.price, 0);
  const totalTween = useTweenNum(total, calm);

  // ---- tab kategori ------------------------------------------------------
  const [cat, setCat] = useState(cats[0]?.id ?? "");
  const [leaving, setLeaving] = useState(false);
  const busy = useRef(false);
  const prevCat = useRef<string | null>(null);
  const tabsRef = useRef<HTMLElement>(null);
  const indRef = useRef<HTMLSpanElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const positionInd = useCallback(
    (from?: string | null) => {
      const nav = tabsRef.current;
      const ind = indRef.current;
      if (!nav || !ind) return;
      const t = nav.querySelector<HTMLElement>(`[data-id="${cat}"]`);
      if (!t) return;
      nav.querySelectorAll<HTMLElement>(".tab").forEach((x) =>
        x.setAttribute("aria-selected", String(x === t)),
      );
      if (from && from !== cat && !calm) {
        const f = nav.querySelector<HTMLElement>(`[data-id="${from}"]`);
        if (f) {
          const l = Math.min(f.offsetLeft, t.offsetLeft);
          const r = Math.max(f.offsetLeft + f.offsetWidth, t.offsetLeft + t.offsetWidth);
          ind.animate(
            [
              { transform: `translateX(${f.offsetLeft}px)`, width: f.offsetWidth + "px" },
              { transform: `translateX(${l}px)`, width: r - l + "px", offset: .5 },
              { transform: `translateX(${t.offsetLeft}px)`, width: t.offsetWidth + "px" },
            ],
            { duration: 560, easing: "cubic-bezier(.32,.72,0,1)" },
          );
        }
      }
      ind.style.width = t.offsetWidth + "px";
      ind.style.transform = `translateX(${t.offsetLeft}px)`;
    },
    [cat, calm],
  );

  useEffect(() => {
    positionInd(prevCat.current);
  }, [positionInd]);

  useEffect(() => {
    const onR = () => positionInd();
    addEventListener("resize", onR);
    document.fonts?.ready.then(() => positionInd());
    return () => removeEventListener("resize", onR);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function switchCat(id: string) {
    if (id === cat || busy.current) return;
    busy.current = true;
    const dir =
      cats.findIndex((c) => c.id === id) > cats.findIndex((c) => c.id === cat) ? 16 : -16;
    listRef.current?.style.setProperty("--dx", dir + "px");
    prevCat.current = cat;
    setLeaving(true);
    setTimeout(
      () => {
        setCat(id);
        setLeaving(false);
        busy.current = false;
      },
      calm ? 0 : 230,
    );
  }

  // ---- pill flash + sheet ------------------------------------------------
  const [flashTxt, setFlashTxt] = useState("");
  const [barX, setBarX] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [animItems, setAnimItems] = useState(false);
  const [goneId, setGoneId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [sent, setSent] = useState(false);
  const barTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pillRef = useRef<HTMLButtonElement>(null);

  const flash = useCallback(
    (txt: string) => {
      setFlashTxt(txt);
      setBarX(true);
      if (barTimer.current) clearTimeout(barTimer.current);
      barTimer.current = setTimeout(() => setBarX(false), 1900);
    },
    [],
  );

  const items = products.filter((p) => p.category_id === cat);

  function change(id: string, d: number) {
    setCart((c) => {
      const q = Math.max(0, (c[id] || 0) + d);
      const next = { ...c };
      if (q) next[id] = q;
      else delete next[id];
      return next;
    });
    if (d > 0) {
      flash("+ " + products.find((x) => x.id === id)?.name);
      if (!calm) {
        setTimeout(
          () =>
            pillRef.current?.animate(
              [
                { transform: "scale(1)" },
                { transform: "scale(1.03,.96)" },
                { transform: "scale(1)" },
              ],
              { duration: 420, easing: "cubic-bezier(.34,1.4,.64,1)" },
            ),
          520,
        );
      }
    }
    if (sheetOpen) {
      const willBe = count + d;
      if (willBe <= 0) setSheetOpen(false);
    }
  }

  /** Emoji terbang dari tile ke pill — port fly() dari desain. */
  function fly(btn: HTMLElement, p: MenuProduct) {
    if (calm) return;
    const tile = btn.closest(".item")?.querySelector(".tile");
    if (!tile) return;
    const t = tile.getBoundingClientRect();
    const w = Math.min(448, innerWidth - 32);
    const sx = t.left + t.width / 2;
    const sy = t.top + t.height / 2;
    const dx = (innerWidth - w) / 2 + 28 - sx;
    const dy = innerHeight - 48 - sy;
    const e = document.createElement("div");
    e.textContent = p.emoji || "🍽️";
    e.style.cssText = `position:fixed;z-index:50;left:${sx - 20}px;top:${sy - 20}px;width:40px;height:40px;border-radius:50%;display:grid;place-items:center;font-size:22px;background:${p.tint || "#E6E9F5"};box-shadow:0 8px 20px -6px rgba(21,24,50,.4);pointer-events:none`;
    document.body.append(e);
    e.animate(
      [
        { transform: "translate(0,0) scale(1.5)" },
        { transform: `translate(${dx * .35}px,${dy * .2 - 60}px) scale(1.1)`, offset: .4 },
        { transform: `translate(${dx}px,${dy}px) scale(.7)` },
      ],
      { duration: 680, easing: "cubic-bezier(.4,0,.2,1)" },
    ).onfinish = () => e.remove();
  }

  function onAddClick(e: React.MouseEvent<HTMLButtonElement>, id: string, d: number) {
    if (d < 0 && cart[id] === 1 && e.currentTarget.closest(".step")) {
      setGoneId(id);
      setTimeout(
        () => {
          setGoneId(null);
          change(id, -1);
        },
        calm ? 0 : 300,
      );
      return;
    }
    change(id, d);
    if (d > 0 && e.currentTarget.closest(".item")) {
      const p = products.find((x) => x.id === id);
      if (p) fly(e.currentTarget, p);
    }
  }

  // ---- escape nutup sheet ------------------------------------------------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSheetOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  function openSheet() {
    setBarX(false);
    setAnimItems(true);
    setSheetOpen(true);
  }

  // ---- checkout WA -------------------------------------------------------
  function go() {
    const lines = products
      .filter((p) => cart[p.id])
      .map((p) => `- ${cart[p.id]}x ${p.name}`)
      .join("\n");
    const n = note.trim();
    const msg = `*PESANAN BARU - MEJA ${label}*\n${lines}\n${n ? "Catatan: " + n + "\n" : ""}Total: ${rp(total)}`;
    window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`, "_blank");
    setSent(true);
    setTimeout(() => setSent(false), 2200);
  }

  const sheetRows = products.filter((p) => cart[p.id]);
  const want = Object.keys(cart).slice(-3);

  if (!cats.length) {
    return (
      <div className="app">
        <section className="intro">
          <div className="top">
            <div className="brand">K Gaming</div>
            <div className="table">Meja {label}</div>
          </div>
          <h1>Mau pesan apa?</h1>
        </section>
        <main className="list">
          <p className="empty">Menu belom tersedia, coba lagi nanti ya.</p>
        </main>
      </div>
    );
  }

  return (
    <>
      <div className="app">
        <section className="intro">
          <div className="top">
            <div className="brand">K Gaming</div>
            <div className="table">Meja {label}</div>
          </div>
          <h1>Mau pesan apa?</h1>
        </section>

        <nav className="tabs" ref={tabsRef} role="tablist">
          {cats.map((c) => (
            <button
              key={c.id}
              className="tab"
              role="tab"
              data-id={c.id}
              aria-selected={c.id === cat}
              onClick={() => switchCat(c.id)}
            >
              {c.name}
            </button>
          ))}
          <span className="ind" ref={indRef} />
        </nav>

        <main className="list" ref={listRef}>
          {items.map((p, i) => {
            const q = cart[p.id] || 0;
            return (
              <article
                key={p.id}
                className={`item ${p.is_available ? "" : "sold"} ${leaving ? "leave" : ""}`}
                style={{ "--i": i } as React.CSSProperties}
              >
                <div
                  className="tile"
                  style={{ "--t": p.tint || "#E6E9F5" } as React.CSSProperties}
                  aria-hidden="true"
                >
                  {p.image_url ? <img src={p.image_url} alt={p.name} /> : p.emoji || "🍽️"}
                </div>
                <div>
                  <div className="name">{p.name}</div>
                  <div className="price">{rp(p.price)}</div>
                </div>
                {p.is_available ? (
                  <div className={`add ${q > 0 ? "on" : ""}`} data-id={p.id}>
                    <button
                      className="m"
                      aria-label={`Kurangi ${p.name}`}
                      onClick={(e) => onAddClick(e, p.id, -1)}
                    >
                      −
                    </button>
                    <span className="q" key={q}>
                      {q}
                    </span>
                    <button
                      className="p"
                      aria-label={`Tambah ${p.name}`}
                      onClick={(e) => onAddClick(e, p.id, 1)}
                    >
                      +
                    </button>
                  </div>
                ) : (
                  <span className="tag">Habis</span>
                )}
              </article>
            );
          })}
          {!items.length && <p className="empty">Belum ada menu di kategori ini.</p>}
        </main>
      </div>

      {/* pill keranjang */}
      <div className={`bar ${count > 0 ? "show" : ""} ${barX ? "x" : ""}`}>
        <button className="pill" ref={pillRef} onClick={openSheet} aria-haspopup="dialog">
          <span className="lead">
            <span className="stack">
              {want.map((id) => {
                const p = products.find((x) => x.id === id);
                if (!p) return null;
                return (
                  <span
                    key={id}
                    className="av"
                    style={{ "--t": p.tint || "#E6E9F5" } as React.CSSProperties}
                  >
                    {p.emoji || "🍽️"}
                  </span>
                );
              })}
            </span>
            <span className="msg">
              <span className="lab">{count} item</span>
              <span className="fl">{flashTxt}</span>
            </span>
          </span>
          <b>{rp(totalTween)}</b>
        </button>
      </div>

      {/* sheet keranjang */}
      <div
        className={`scrim ${sheetOpen ? "open" : ""}`}
        onClick={() => setSheetOpen(false)}
      />
      <section
        className={`sheet ${sheetOpen ? "open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Keranjang"
      >
        <div className="grip" />
        <h2>Pesananmu</h2>
        <div className={`items ${animItems ? "anim" : ""}`}>
          {sheetRows.map((p, i) => (
            <div
              key={p.id}
              className={`row ${goneId === p.id ? "gone" : ""}`}
              style={{ "--i": i } as React.CSSProperties}
            >
              <div className="n">
                {p.name}
                <small>{rp(p.price * cart[p.id])}</small>
              </div>
              <div className="step" data-id={p.id}>
                <button aria-label={`Kurangi ${p.name}`} onClick={(e) => onAddClick(e, p.id, -1)}>
                  −
                </button>
                <span>{cart[p.id]}</span>
                <button aria-label={`Tambah ${p.name}`} onClick={(e) => onAddClick(e, p.id, 1)}>
                  +
                </button>
              </div>
            </div>
          ))}
        </div>
        <textarea
          placeholder="Catatan pesanan..."
          aria-label="Catatan pesanan"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <div className="total">
          <span>Total</span>
          <b>{rp(totalTween)}</b>
        </div>
        <button className={`go ${sent ? "done" : ""}`} onClick={go} disabled={!sheetRows.length}>
          {sent ? (
            <>
              <svg className="ck" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
              Membuka WhatsApp
            </>
          ) : (
            "Pesan lewat WhatsApp"
          )}
        </button>
      </section>
    </>
  );
}
