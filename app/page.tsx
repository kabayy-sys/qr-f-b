export default function Home() {
  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: "48px 22px" }}>
      <div
        style={{
          font: "800 18px 'Bricolage Grotesque', sans-serif",
          letterSpacing: "-.02em",
        }}
      >
        K Gaming
      </div>
      <h1 style={{ font: "700 34px/1.04 'Bricolage Grotesque', sans-serif", letterSpacing: "-.035em", margin: "24px 0 8px" }}>
        F&B Order
      </h1>
      <p style={{ color: "var(--muted)" }}>
        Scan QR di meja untuk buka menu. Staff masuk lewat{" "}
        <a href="/admin" style={{ color: "var(--blue)", fontWeight: 600 }}>
          /admin
        </a>
        .
      </p>
    </main>
  );
}
