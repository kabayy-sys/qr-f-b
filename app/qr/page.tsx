import { MEJA_CODES } from "@/lib/meja";

export default function QrPage() {
  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "48px 22px" }}>
      <h1 style={{ font: "700 28px 'Bricolage Grotesque', sans-serif", letterSpacing: "-.03em" }}>
        QR Meja
      </h1>
      <p style={{ color: "var(--muted)" }}>
        Generator sticker QR untuk {MEJA_CODES.join(", ")} masuk tahap berikutnya.
      </p>
    </main>
  );
}
