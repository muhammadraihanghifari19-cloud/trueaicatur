# Belajar Catur

Website belajar catur interaktif dengan **Pelatih AI**. Papan catur penuh dengan
aturan lengkap (gerakan legal, skak, skakmat, remis, en passant, rokade, promosi),
dibangun dengan Vite + [chess.js](https://github.com/jhlywa/chess.js) untuk logika
aturan, dan Google Gemini untuk penjelasan langkah dalam bahasa Indonesia.

## Fitur

- Papan catur 8x8 interaktif dengan koordinat.
- Klik bidak untuk melihat langkah legal (titik = langkah, lingkaran = tangkapan).
- Validasi aturan penuh: rokade, en passant, promosi (otomatis jadi Menteri), skak, skakmat, remis.
- Highlight langkah terakhir dan raja yang sedang diskak.
- Panel status (giliran, skak/skakmat/remis) dan riwayat langkah (notasi SAN).
- Tombol Undo, Mulai Ulang, dan Balik Papan.
- Shortcut keyboard: `U` undo, `R` reset, `F` flip.
- **Pelatih AI (Gemini):**
  - "Jelaskan posisi" — AI menerangkan posisi/langkah terakhir untuk pemula.
  - Kotak tanya-jawab — tanya bebas, mis. "langkah apa yang bagus?".
  - Mode "Auto" — AI otomatis menjelaskan tiap kali ada langkah.

## Cara kerja AI (arsitektur)

```
Browser (papan)  ──►  /api/coach  (serverless Vercel)  ──►  Google Gemini
   kirim FEN,            baca GEMINI_API_KEY               balas penjelasan
   PGN, langkah          dari environment (aman)
```

API key **tidak pernah** ada di kode frontend. Hanya dibaca di serverless
function `api/coach.js` dari environment variable `GEMINI_API_KEY`.

## Setup API key

1. Buat API key gratis di [Google AI Studio](https://aistudio.google.com/apikey).
2. Untuk lokal: salin `.env.example` menjadi `.env`, isi `GEMINI_API_KEY`.
3. Untuk produksi (Vercel): tambahkan `GEMINI_API_KEY` di
   **Project Settings → Environment Variables**, lalu redeploy.

## Menjalankan di lokal

Butuh Node.js 18+.

Tanpa AI (hanya papan catur):

```bash
npm install
npm run dev        # http://localhost:5173
```

Dengan AI aktif, perlu Vercel CLI supaya folder `/api` ikut berjalan:

```bash
npm install -g vercel     # sekali saja
vercel dev                # menjalankan frontend + /api sekaligus
```

> Catatan: `npm run dev` biasa TIDAK menyajikan `/api`. Untuk menguji Pelatih AI
> secara lokal, gunakan `vercel dev`. Di produksi (Vercel) `/api` otomatis aktif.

## Build untuk produksi

```bash
npm run build
npm run preview
```

## Deploy ke Vercel

1. Import repo di Vercel (Framework: Vite otomatis terdeteksi).
2. Tambahkan Environment Variable `GEMINI_API_KEY`.
3. Deploy. Folder `/api` otomatis jadi serverless function.

## Struktur

```
index.html        # Markup halaman + layout
api/coach.js      # Serverless function: perantara aman ke Gemini
src/main.js       # Logika papan + wiring Pelatih AI
src/coach.js      # Klien frontend untuk /api/coach
src/pieces.js     # Glyph & nama bidak
src/style.css     # Styling (tema gelap, responsif)
vite.config.js    # Konfigurasi dev server
vercel.json       # Konfigurasi deploy Vercel
```

## Rencana berikutnya

- **Jalur B**: gabungkan engine (Stockfish WASM) agar evaluasi & saran langkah
  akurat, lalu Gemini menerjemahkannya jadi penjelasan. Arsitektur `/api/coach`
  sudah siap untuk menerima data evaluasi tambahan.
