# Belajar Catur

Website belajar catur interaktif. Papan catur penuh dengan aturan lengkap
(gerakan legal, skak, skakmat, remis, en passant, rokade, promosi), dibangun
dengan Vite + [chess.js](https://github.com/jhlywa/chess.js) untuk logika aturan.

Dirancang supaya mudah diperluas dengan fitur **AI penjelas langkah** nanti.

## Fitur saat ini

- Papan catur 8x8 interaktif dengan koordinat.
- Klik bidak untuk melihat langkah legal (titik = langkah, lingkaran = tangkapan).
- Validasi aturan penuh: rokade, en passant, promosi (otomatis jadi Menteri), skak, skakmat, remis.
- Highlight langkah terakhir dan raja yang sedang diskak.
- Panel status (giliran, skak/skakmat/remis) dan riwayat langkah (notasi SAN).
- Tombol Undo, Mulai Ulang, dan Balik Papan.
- Shortcut keyboard: `U` undo, `R` reset, `F` flip.

## Menjalankan di lokal

Butuh Node.js 18+.

```bash
npm install
npm run dev
```

Buka http://localhost:5173 (biasanya terbuka otomatis).

## Build untuk produksi

```bash
npm run build
npm run preview
```

## Struktur

```
index.html        # Markup halaman + layout
src/main.js       # Logika papan: render, interaksi, status, riwayat
src/pieces.js     # Glyph & nama bidak
src/style.css     # Styling (tema gelap, responsif)
vite.config.js    # Konfigurasi dev server
```

## Rencana berikutnya (AI)

Struktur sudah disiapkan untuk menambah penjelasan langkah berbasis AI,
misalnya memanggil API untuk menerangkan kenapa sebuah langkah baik/buruk,
atau menyarankan langkah untuk pemula.
