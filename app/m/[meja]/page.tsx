import { supabase } from "@/lib/supabase";
import { MEJA_LABELS, verifyTable, type MejaCode } from "@/lib/meja";
import type { MenuCat, MenuProduct } from "@/lib/types";
import MenuClient from "./MenuClient";

export const dynamic = "force-dynamic";

function InvalidQR() {
  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: "48px 22px" }}>
      <h1 style={{ font: "700 28px 'Bricolage Grotesque', sans-serif", letterSpacing: "-.03em" }}>
        QR tidak valid
      </h1>
      <p style={{ color: "var(--muted)" }}>Scan ulang barcode di mejanya, ya.</p>
    </main>
  );
}

export default async function MenuPage({
  params,
  searchParams,
}: {
  params: Promise<{ meja: string }>;
  searchParams: Promise<{ s?: string }>;
}) {
  const { meja } = await params;
  const { s } = await searchParams;
  const code = meja.toUpperCase();

  if (!verifyTable(code, s)) return <InvalidQR />;

  if (!supabase) {
    return (
      <main style={{ maxWidth: 480, margin: "0 auto", padding: "48px 22px" }}>
        <h1 style={{ font: "700 28px 'Bricolage Grotesque', sans-serif", letterSpacing: "-.03em" }}>
          Konfigurasi belom lengkap
        </h1>
        <p style={{ color: "var(--muted)" }}>
          Isi .env.local (Supabase URL + anon key) dulu, ya.
        </p>
      </main>
    );
  }

  const [catsRes, prodsRes] = await Promise.all([
    supabase.from("menu_categories").select("id, name").order("order_index"),
    supabase
      .from("menu_products")
      .select("id, category_id, name, price, sold_count, is_available, image_url, emoji, tint")
      .order("sold_count", { ascending: false }),
  ]);

  if (catsRes.error || prodsRes.error) {
    return (
      <main style={{ maxWidth: 480, margin: "0 auto", padding: "48px 22px" }}>
        <h1 style={{ font: "700 28px 'Bricolage Grotesque', sans-serif", letterSpacing: "-.03em" }}>
          Menu gagal dimuat
        </h1>
        <p style={{ color: "var(--muted)" }}>
          Koneksi ke database bermasalah. Coba refresh halaman.
        </p>
      </main>
    );
  }

  const cats: MenuCat[] = (catsRes.data ?? []).map((c) => ({ id: c.id, name: c.name }));
  const products: MenuProduct[] = (prodsRes.data ?? []).map((p) => ({
    id: p.id,
    category_id: p.category_id,
    name: p.name,
    price: Number(p.price) || 0,
    sold_count: p.sold_count ?? 0,
    is_available: p.is_available ?? true,
    image_url: p.image_url ?? null,
    emoji: p.emoji ?? null,
    tint: p.tint ?? null,
  }));

  const label = MEJA_LABELS[code as MejaCode] ?? code;

  return (
    <MenuClient meja={code} label={label} cats={cats} products={products} />
  );
}
