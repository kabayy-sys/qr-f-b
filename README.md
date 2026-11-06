# QR F&B — K Gaming

Sistem pesan makanan/minuman/snack lewat QR di meja. Checkout via teks WhatsApp.

Meja: R1-R5, V1A, V1B, V2.

## Setup

1. `npm install`
2. `cp .env.local.example .env.local` lalu isi:
   - `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Supabase dashboard > Project Settings > API)
   - `NEXT_PUBLIC_WA_NUMBER` nomor WA penerima orderan
   - `MEJA_SECRET` string acak (misal: `openssl rand -base64 24`)
3. Jalankan schema SQL (kgaming-fnb-schema.sql) di SQL Editor Supabase.
4. `npm run dev`

## Struktur

- `/m/[meja]?s=<token>` — halaman tamu (verifikasi HMAC)
- `/admin` — kelola menu (Supabase Auth)
- `/qr` — generator sticker QR
- `lib/supabase.ts` — client Supabase
- `lib/meja.ts` — kode meja + HMAC token
