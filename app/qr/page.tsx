import { MEJA_CODES, MEJA_LABELS, mejaConfigured, signTable, type MejaCode } from "@/lib/meja";
import QRCode from "qrcode";
import "./qr.css";

export const dynamic = "force-dynamic";

const BASE = (process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000").replace(/\/+$/, "");

export default async function QrPage() {
  if (!mejaConfigured) {
    return (
      <main className="qr-wrap">
        <h1>QR Meja</h1>
        <p style={{ color: "var(--muted)" }}>Isi MEJA_SECRET di .env.local dulu, ya.</p>
      </main>
    );
  }

  const cards = await Promise.all(
    MEJA_CODES.map(async (code: MejaCode) => {
      const url = `${BASE}/m/${code}?s=${signTable(code)}`;
      const dataUrl = await QRCode.toDataURL(url, {
        width: 512,
        margin: 2,
        errorCorrectionLevel: "M",
        color: { dark: "#151832", light: "#FFFFFF" },
      });
      return { code, label: MEJA_LABELS[code], url, dataUrl };
    }),
  );

  return (
    <main className="qr-wrap">
      <div className="qr-head">
        <h1>QR Meja</h1>
        <p style={{ color: "var(--muted)" }}>
          Print halaman ini (Ctrl+P) untuk sticker. Domain sekarang: <b>{BASE}</b>
        </p>
      </div>
      <div className="qr-grid">
        {cards.map((c) => (
          <figure className="qr-card" key={c.code}>
            <div className="qr-label">{c.label}</div>
            <div className="qr-code">{c.code}</div>
            <img className="qr-img" src={c.dataUrl} alt={`QR meja ${c.label}`} />
            <figcaption className="qr-url">{c.url}</figcaption>
          </figure>
        ))}
      </div>
    </main>
  );
}
