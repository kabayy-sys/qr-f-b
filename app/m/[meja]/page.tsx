import { verifyTable } from "@/lib/meja";

export default async function MenuPage({
  params,
  searchParams,
}: {
  params: Promise<{ meja: string }>;
  searchParams: Promise<{ s?: string }>;
}) {
  const { meja } = await params;
  const { s } = await searchParams;

  if (!verifyTable(meja.toUpperCase(), s)) {
    return (
      <main style={{ maxWidth: 480, margin: "0 auto", padding: "48px 22px" }}>
        <h1 style={{ font: "700 28px 'Bricolage Grotesque', sans-serif", letterSpacing: "-.03em" }}>
          QR tidak valid
        </h1>
        <p style={{ color: "var(--muted)" }}>Scan ulang barcode di mejanya, ya.</p>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: "48px 22px" }}>
      <div style={{ font: "800 18px 'Bricolage Grotesque', sans-serif", letterSpacing: "-.02em" }}>
        K Gaming
      </div>
      <h1 style={{ font: "700 34px/1.04 'Bricolage Grotesque', sans-serif", letterSpacing: "-.035em", margin: "24px 0 8px" }}>
        Meja {meja.toUpperCase()}
      </h1>
      <p style={{ color: "var(--muted)" }}>
        Halaman menu — koneksi Supabase, keranjang, dan checkout WA masuk tahap berikutnya.
      </p>
    </main>
  );
}
