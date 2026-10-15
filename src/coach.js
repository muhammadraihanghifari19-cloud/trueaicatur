// Klien frontend untuk memanggil serverless function /api/coach.
// Modul ini TIDAK tahu apa-apa soal API key — key hanya ada di server.
// Tugasnya: menyusun payload dari state chess.js lalu mengirim ke /api/coach.

const ENDPOINT = "/api/coach";

/**
 * Ambil ringkasan posisi dari instance chess.js.
 * Dipakai supaya main.js tidak perlu tahu detail payload.
 */
export function snapshotPosition(game, lastMoveSan = null) {
  return {
    fen: game.fen(),
    pgn: game.pgn(),
    turn: game.turn(),
    lastMove: lastMoveSan,
    legalMoves: game.moves(),
  };
}

async function postCoach(payload) {
  let res;
  try {
    res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error(
      "Tidak bisa menghubungi server AI. Pastikan menjalankan lewat `vercel dev` (bukan `npm run dev` biasa) agar /api aktif."
    );
  }

  let data = {};
  try {
    data = await res.json();
  } catch {
    // biarkan data kosong
  }

  if (!res.ok) {
    // Tampilkan detail dari server (penyebab asli dari Gemini) bila ada,
    // supaya mudah didiagnosis langsung dari UI tanpa buka log Vercel.
    let msg = data.error || `Server membalas status ${res.status}.`;
    if (data.detail) {
      const detail =
        typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail);
      msg += "\n\nDetail: " + detail;
    }
    throw new Error(msg);
  }
  return data.answer;
}

/** Minta AI menjelaskan posisi / langkah terakhir. */
export function explainPosition(game, lastMoveSan = null) {
  const snap = snapshotPosition(game, lastMoveSan);
  return postCoach({ mode: "explain", ...snap });
}

/** Tanya bebas ke AI tentang posisi saat ini. */
export function askCoach(game, question, lastMoveSan = null) {
  const snap = snapshotPosition(game, lastMoveSan);
  return postCoach({ mode: "ask", question, ...snap });
}
