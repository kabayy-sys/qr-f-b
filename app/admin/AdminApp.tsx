"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { MenuCat, MenuProduct } from "@/lib/types";
import "./admin.css";

const rp = (n: number) => "Rp " + Math.round(n).toLocaleString("id-ID");
const CAM = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="3" y="5" width="18" height="14" rx="3" />
    <circle cx="9" cy="10.5" r="1.6" />
    <path d="m4 17 5-4.5 3.5 3L16 12l4 4" />
  </svg>
);
const PENCIL = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z" />
    <path d="m13.5 6.5 4 4" />
  </svg>
);

function useCalm() {
  const [calm, setCalm] = useState(false);
  useEffect(() => {
    setCalm(matchMedia("(prefers-reduced-motion:reduce)").matches);
  }, []);
  return calm;
}

export default function AdminApp() {
  const calm = useCalm();

  // ---- auth ---------------------------------------------------------------
  const [authState, setAuthState] = useState<"checking" | "out" | "in">("checking");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [authErr, setAuthErr] = useState("");
  const [authBusy, setAuthBusy] = useState(false);

  // ---- data ---------------------------------------------------------------
  const [cats, setCats] = useState<MenuCat[]>([]);
  const [prods, setProds] = useState<MenuProduct[]>([]);
  const [loadErr, setLoadErr] = useState("");

  // ---- tabs ---------------------------------------------------------------
  const tabs = [{ id: "all", name: "Semua" }, ...cats];
  const [filter, setFilter] = useState("all");
  const [leaving, setLeaving] = useState(false);
  const busy = useRef(false);
  const prevFilter = useRef<string | null>(null);
  const tabsRef = useRef<HTMLElement>(null);
  const indRef = useRef<HTMLSpanElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // ---- sheet form ---------------------------------------------------------
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<MenuProduct | null>(null);
  const [fName, setFName] = useState("");
  const [fPrice, setFPrice] = useState("");
  const [fCat, setFCat] = useState("");
  const [fAvail, setFAvail] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [delArmed, setDelArmed] = useState(false);
  const delTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [saving, setSaving] = useState(false);
  const [goneIds, setGoneIds] = useState<string[]>([]);
  const [freshId, setFreshId] = useState<string | null>(null);

  // ---- toast --------------------------------------------------------------
  const [toastMsg, setToastMsg] = useState("");
  const [toastShow, setToastShow] = useState(false);
  const undoFn = useRef<(() => void) | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function toast(msg: string, undo?: () => void) {
    setToastMsg(msg);
    undoFn.current = undo ?? null;
    setToastShow(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastShow(false), 3200);
  }

  const priceValue = Number(fPrice.replace(/\D/g, "")) || 0;
  const saveDisabled = !fName.trim() || priceValue <= 0;

  // ---- auth lifecycle -----------------------------------------------------
  const loaded = useRef(false);

  const load = useCallback(async () => {
    if (!supabase) return;
    const [c, p] = await Promise.all([
      supabase.from("menu_categories").select("id, name, order_index").order("order_index"),
      supabase
        .from("menu_products")
        .select("id, category_id, name, price, sold_count, is_available, image_url, emoji, tint")
        .order("sold_count", { ascending: false }),
    ]);
    if (c.error || p.error) {
      setLoadErr("Gagal memuat data menu. Coba refresh halaman.");
      return;
    }
    setCats((c.data ?? []).map((x) => ({ id: x.id, name: x.name })));
    setProds(
      (p.data ?? []).map((x) => ({
        id: x.id,
        category_id: x.category_id,
        name: x.name,
        price: Number(x.price) || 0,
        sold_count: x.sold_count ?? 0,
        is_available: x.is_available ?? true,
        image_url: x.image_url ?? null,
        emoji: x.emoji ?? null,
        tint: x.tint ?? null,
      })),
    );
    setFCat((cur) => cur || (c.data?.[0]?.id as string) || "");
  }, []);

  useEffect(() => {
    if (!supabase) {
      setAuthState("out");
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setAuthState(data.session ? "in" : "out");
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      setAuthState(session ? "in" : "out");
      if (!session) loaded.current = false;
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (authState === "in" && !loaded.current) {
      loaded.current = true;
      load();
    }
  }, [authState, load]);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setAuthBusy(true);
    setAuthErr("");
    const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
    if (error) setAuthErr(error.message);
    setAuthBusy(false);
  }

  // ---- indicator & filter switching (port moveInd) -------------------------
  const positionInd = useCallback(
    (from?: string | null) => {
      const nav = tabsRef.current;
      const ind = indRef.current;
      if (!nav || !ind) return;
      const t = nav.querySelector<HTMLElement>(`[data-id="${filter}"]`);
      if (!t) return;
      nav.querySelectorAll<HTMLElement>(".tab").forEach((x) =>
        x.setAttribute("aria-selected", String(x === t)),
      );
      if (from && from !== filter && !calm) {
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
    [filter, calm],
  );

  useEffect(() => {
    positionInd(prevFilter.current);
  }, [positionInd]);

  useEffect(() => {
    const onR = () => positionInd();
    addEventListener("resize", onR);
    document.fonts?.ready.then(() => positionInd());
    return () => removeEventListener("resize", onR);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function switchFilter(id: string) {
    if (id === filter || busy.current) return;
    busy.current = true;
    const dir =
      tabs.findIndex((c) => c.id === id) > tabs.findIndex((c) => c.id === filter) ? 16 : -16;
    listRef.current?.style.setProperty("--dx", dir + "px");
    prevFilter.current = filter;
    setLeaving(true);
    setTimeout(
      () => {
        setFilter(id);
        setLeaving(false);
        busy.current = false;
      },
      calm ? 0 : 230,
    );
  }

  // ---- CRUD ---------------------------------------------------------------
  async function toggleAvail(p: MenuProduct) {
    const db = supabase;
    if (!db) return;
    const nv = !p.is_available;
    const revert = () =>
      setProds((ps) => ps.map((x) => (x.id === p.id ? { ...x, is_available: p.is_available } : x)));
    setProds((ps) => ps.map((x) => (x.id === p.id ? { ...x, is_available: nv } : x)));
    navigator.vibrate?.(8);
    const { error } = await db
      .from("menu_products")
      .update({ is_available: nv })
      .eq("id", p.id);
    if (error) {
      revert();
      toast("Gagal mengubah status: " + error.message);
      return;
    }
    toast(
      nv ? p.name + " tersedia lagi" : p.name + " ditandai habis",
      () => {
        revert();
        db.from("menu_products").update({ is_available: p.is_available }).eq("id", p.id);
      },
    );
  }

  function openSheet(p: MenuProduct | null) {
    setEditing(p);
    setFName(p?.name ?? "");
    setFPrice(p ? p.price.toLocaleString("id-ID") : "");
    setFCat(p ? p.category_id : filter === "all" ? cats[0]?.id ?? "" : filter);
    setFAvail(p ? p.is_available : true);
    setFile(null);
    setPreviewUrl(null);
    setDelArmed(false);
    if (delTimer.current) clearTimeout(delTimer.current);
    setSheetOpen(true);
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSheetOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  async function save() {
    if (!supabase || saveDisabled || saving) return;
    setSaving(true);
    let image_url = editing?.image_url ?? null;

    if (file) {
      const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase();
      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const up = await supabase.storage.from("menu-photos").upload(path, file, { upsert: false });
      if (up.error) {
        setSaving(false);
        toast("Upload foto gagal: " + up.error.message);
        return;
      }
      image_url = supabase.storage.from("menu-photos").getPublicUrl(path).data.publicUrl;
    }

    const payload = {
      name: fName.trim(),
      price: priceValue,
      category_id: fCat,
      is_available: fAvail,
      image_url,
      emoji: editing?.emoji ?? "🍽️",
      tint: editing?.tint ?? "#E6E9F5",
    };

    if (editing) {
      const { error } = await supabase
        .from("menu_products")
        .update(payload)
        .eq("id", editing.id);
      setSaving(false);
      if (error) {
        toast("Gagal menyimpan: " + error.message);
        return;
      }
      setProds((ps) => ps.map((x) => (x.id === editing.id ? { ...x, ...payload } : x)));
      closeAndJump(editing.id);
      toast("Perubahan disimpan");
    } else {
      const { data, error } = await supabase
        .from("menu_products")
        .insert(payload)
        .select("id")
        .single();
      setSaving(false);
      if (error || !data) {
        toast("Gagal menambah menu: " + (error?.message ?? "tidak ada hasil"));
        return;
      }
      const created: MenuProduct = {
        id: data.id,
        sold_count: 0,
        ...payload,
      };
      setProds((ps) => [...ps, created]);
      closeAndJump(created.id);
      toast(payload.name + " ditambahkan");
    }
  }

  function closeAndJump(id: string) {
    setSheetOpen(false);
    if (filter !== "all" && filter !== fCat) {
      prevFilter.current = filter;
      setFilter(fCat);
    }
    setFreshId(id);
    setTimeout(() => setFreshId(null), 1700);
    setTimeout(() => {
      document
        .querySelector(`[data-id="${id}"]`)
        ?.scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "nearest" });
    }, calm ? 0 : 240);
  }

  function del() {
    const db = supabase;
    if (!editing || !db) return;
    if (!delArmed) {
      setDelArmed(true);
      delTimer.current = setTimeout(() => setDelArmed(false), 3000);
      return;
    }
    if (delTimer.current) clearTimeout(delTimer.current);
    const p = editing;
    setSheetOpen(false);
    setGoneIds((g) => [...g, p.id]);
    setTimeout(async () => {
      const { error } = await db.from("menu_products").delete().eq("id", p.id);
      setProds((ps) => ps.filter((x) => x.id !== p.id));
      setGoneIds((g) => g.filter((id) => id !== p.id));
      if (error) {
        toast("Gagal hapus: " + error.message);
        return;
      }
      toast(
        p.name + " dihapus",
        async () => {
          const { error: e2 } = await db
            .from("menu_products")
            .insert({
              id: p.id,
              category_id: p.category_id,
              name: p.name,
              price: p.price,
              sold_count: p.sold_count,
              is_available: p.is_available,
              image_url: p.image_url,
              emoji: p.emoji ?? "🍽️",
              tint: p.tint ?? "#E6E9F5",
            });
          if (!e2) setProds((ps) => [...ps, p]);
        },
      );
    }, calm ? 0 : 420);
  }

  // ---- derived ------------------------------------------------------------
  const items = prods
    .filter((p) => filter === "all" || p.category_id === filter)
    .sort((a, b) => b.sold_count - a.sold_count);
  const offCount = prods.filter((p) => !p.is_available).length;
  const sumText =
    prods.length + " menu" + (offCount ? ", " + offCount + " habis" : ", semua tersedia");
  const catIndex = Math.max(0, cats.findIndex((c) => c.id === fCat));
  const pvSrc = previewUrl ?? editing?.image_url ?? null;
  const pvTxt = file || editing?.image_url ? "Ganti foto" : "Unggah foto";

  // ---- render -------------------------------------------------------------
  if (authState === "checking") {
    return <div className="auth" style={{ color: "var(--muted)" }}>Memuat…</div>;
  }

  if (authState === "out") {
    return (
      <div className="auth">
        <form className="card" onSubmit={login}>
          <div className="brand">K Gaming</div>
          <h1>Masuk Admin</h1>
          <label className="fld">
            Email
            <input
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@kgaming.id"
            />
          </label>
          <label className="fld">
            Password
            <input
              type="password"
              required
              autoComplete="current-password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder="••••••••"
            />
          </label>
          {authErr && <div className="err">{authErr}</div>}
          <button className="go" disabled={authBusy}>
            {authBusy ? "Memeriksa…" : "Masuk"}
          </button>
        </form>
      </div>
    );
  }

  if (loadErr) {
    return (
      <div className="auth">
        <div className="card">
          <h1>Ups</h1>
          <p style={{ color: "var(--muted)", margin: 0 }}>{loadErr}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <section className="intro">
        <div className="top">
          <div className="brand">K Gaming</div>
          <div className="who">
            Admin
            <button onClick={() => supabase?.auth.signOut()}>Keluar</button>
          </div>
        </div>
        <div className="hrow">
          <div>
            <h1>Kelola menu</h1>
            <div className="sum" key={sumText}>
              {sumText}
            </div>
          </div>
          <button className="new" onClick={() => openSheet(null)}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Tambah
          </button>
        </div>
      </section>

      <nav className="tabs" ref={tabsRef} role="tablist">
        {tabs.map((c) => (
          <button
            key={c.id}
            className="tab"
            role="tab"
            data-id={c.id}
            aria-selected={c.id === filter}
            onClick={() => switchFilter(c.id)}
          >
            {c.name}
          </button>
        ))}
        <span className="ind" ref={indRef} />
      </nav>

      <main className={`list ${leaving ? "" : "anim"}`} ref={listRef}>
        {items.length ? (
          items.map((p, i) => (
            <div
              key={p.id}
              data-id={p.id}
              className={`wrap ${goneIds.includes(p.id) ? "out" : ""}`}
            >
              <article
                className={`item ${p.is_available ? "" : "off"} ${freshId === p.id ? "fresh" : ""}`}
                style={{ "--i": i } as React.CSSProperties}
              >
                <div
                  className="tile"
                  style={{ "--t": p.tint || "#E6E9F5" } as React.CSSProperties}
                  aria-hidden="true"
                >
                  {p.image_url ? <img src={p.image_url} alt="" /> : p.emoji || "🍽️"}
                </div>
                <div>
                  <div className="name">{p.name}</div>
                  <div className="price">{rp(p.price)}</div>
                  <div className="meta">{p.sold_count} terjual</div>
                </div>
                <button className="ed" aria-label={`Ubah ${p.name}`} onClick={() => openSheet(p)}>
                  {PENCIL}
                </button>
                <button
                  className="sw"
                  role="switch"
                  aria-checked={p.is_available}
                  aria-label={`${p.name} tersedia`}
                  onClick={() => toggleAvail(p)}
                >
                  <i />
                </button>
              </article>
            </div>
          ))
        ) : (
          <p className="empty">Belum ada menu di kategori ini. Tekan Tambah untuk membuat yang pertama.</p>
        )}
      </main>

      {/* toast */}
      <div className={`toast ${toastShow ? "show" : ""}`} role="status">
        <span>{toastMsg}</span>
        <button
          onClick={() => {
            undoFn.current?.();
            setToastShow(false);
          }}
        >
          Urungkan
        </button>
      </div>

      <div className={`scrim ${sheetOpen ? "open" : ""}`} onClick={() => setSheetOpen(false)} />

      {/* sheet form */}
      <section
        className={`sheet ${sheetOpen ? "open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sTitle"
      >
        <div className="grip" />
        <h2 id="sTitle">{editing ? "Ubah menu" : "Tambah menu"}</h2>
        <div className="form">
          <label className="photo">
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setFile(f);
                setPreviewUrl(f ? URL.createObjectURL(f) : null);
              }}
            />
            <div className="pv">
              {pvSrc ? <img src={pvSrc} alt="" /> : !editing ? CAM : (
                <span style={{ fontSize: 36 }}>{editing.emoji || "🍽️"}</span>
              )}
            </div>
            <span>{pvTxt}</span>
          </label>

          <label className="fld">
            Nama menu
            <input
              autoComplete="off"
              placeholder="Contoh: Nasi Goreng Sosis"
              value={fName}
              onChange={(e) => setFName(e.target.value)}
            />
          </label>

          <div className="fld">
            Kategori
            <div className="seg">
              <i
                className="thumb"
                style={{ transform: `translateX(${catIndex * 100}%)` }}
              />
              {cats.map((c) => (
                <button
                  key={c.id}
                  aria-pressed={c.id === fCat}
                  onClick={() => setFCat(c.id)}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          <label className="fld">
            Harga
            <div className="money">
              <span>Rp</span>
              <input
                inputMode="numeric"
                placeholder="0"
                value={fPrice}
                onChange={(e) => {
                  const n = e.target.value.replace(/\D/g, "");
                  setFPrice(n ? (+n).toLocaleString("id-ID") : "");
                }}
              />
            </div>
          </label>

          <div className="avail">
            <span>
              Tersedia
              <small>Matikan saat stok habis</small>
            </span>
            <button
              className="sw"
              role="switch"
              aria-checked={fAvail}
              aria-label="Tersedia"
              onClick={() => setFAvail((v) => !v)}
            >
              <i />
            </button>
          </div>
        </div>

        <button className="go" onClick={save} disabled={saveDisabled || saving}>
          {saving ? (
            <>
              <svg className="ck" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
              Tersimpan
            </>
          ) : editing ? (
            "Simpan perubahan"
          ) : (
            "Tambah menu"
          )}
        </button>
        {editing && (
          <button className={`del ${delArmed ? "armed" : ""}`} onClick={del}>
            {delArmed ? "Yakin hapus? Tekan sekali lagi" : "Hapus menu"}
          </button>
        )}
      </section>
    </div>
  );
}
