import { supabase } from "@/lib/supabase";
import AdminApp from "./AdminApp";

export const dynamic = "force-dynamic";

export default function AdminPage() {
  if (!supabase) {
    return (
      <div className="auth">
        <div className="card">
          <h1>Konfigurasi belom lengkap</h1>
          <p style={{ color: "var(--muted)" }}>Isi .env.local (Supabase URL + anon key) dulu, ya.</p>
        </div>
      </div>
    );
  }
  return <AdminApp />;
}
