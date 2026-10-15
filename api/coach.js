// Serverless function (Vercel) — perantara aman ke Google Gemini.
//
// Kenapa lewat server, bukan langsung dari browser:
// API key TIDAK BOLEH ada di kode frontend. Kalau ada di browser, siapa pun
// bisa membukanya lewat DevTools dan memakai kuota kita. Jadi key disimpan
// sebagai Environment Variable di Vercel (GEMINI_API_KEY) dan hanya dibaca di
// sini, di sisi server.
//
// Endpoint ini menerima posisi papan (FEN) + konteks dan mengembalikan
// penjelasan dalam bahasa Indonesia dari Gemini.

const GEMINI_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash"];
const GEMINI_BASE =
  "https://generativelanguage.googleapis.com/v1beta/models";

/**
 * Susun prompt untuk Gemini berdasarkan mode permintaan.
 * - "explain": jelaskan langkah terakhir / posisi saat ini
 * - "ask":     jawab pertanyaan bebas dari pemain
 */
function buildPrompt({ mode, fen, pgn, lastMove, turn, legalMoves, question }) {
  const sisi = turn === "w" ? "Putih" : "Hitam";

  const konteks = [
    "Kamu adalah pelatih catur yang ramah dan sabar untuk pemula.",
    "Jawab SELALU dalam bahasa Indonesia yang santai dan mudah dipahami.",
    "Hindari jargon berlebihan; kalau pakai istilah, jelaskan singkat.",
    "Jawaban ringkas: maksimal 4-5 kalimat, boleh pakai poin bila perlu.",
    "Jangan mengarang langkah yang tidak mungkin. Hanya bahas yang masuk akal.",
    "",
    `Posisi papan sekarang (FEN): ${fen}`,
    `Giliran berjalan: ${sisi}`,
  ];

  if (pgn) konteks.push(`Riwayat langkah (PGN): ${pgn}`);
  if (lastMove) konteks.push(`Langkah terakhir yang baru dimainkan: ${lastMove}`);
  if (Array.isArray(legalMoves) && legalMoves.length) {
    konteks.push(`Langkah legal yang tersedia saat ini: ${legalMoves.join(", ")}`);
  }

  konteks.push("");

  if (mode === "ask") {
    konteks.push(
      `Pertanyaan dari pemain: "${question}"`,
      "Jawab pertanyaan itu berdasarkan posisi di atas. Kalau pemain minta saran langkah, pilih dari daftar langkah legal."
    );
  } else {
    konteks.push(
      "Jelaskan posisi saat ini untuk pemain pemula:",
      "1) Apa makna/akibat dari langkah terakhir (jika ada).",
      "2) Apa rencana atau ide yang masuk akal untuk pemain yang akan jalan.",
      "3) Hal penting yang perlu diwaspadai (ancaman/bidak yang terancam)."
    );
  }

  return konteks.join("\n");
}

async function callGemini(apiKey, model, prompt) {
  const res = await fetch(`${GEMINI_BASE}/${model}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 500,
      },
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    const err = new Error(`Gemini ${res.status}`);
    err.status = res.status;
    err.detail = detail;
    throw err;
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts
    ?.map((p) => p.text)
    .filter(Boolean)
    .join("")
    .trim();

  if (!text) throw new Error("Respons Gemini kosong.");
  return text;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Gunakan metode POST." });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error:
        "GEMINI_API_KEY belum di-set. Tambahkan di Environment Variables (Vercel) atau file .env lokal.",
    });
  }

  // Body bisa sudah objek (Vercel) atau string (dev server tertentu)
  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body || "{}");
    } catch {
      return res.status(400).json({ error: "Body JSON tidak valid." });
    }
  }
  body = body || {};

  const { mode = "explain", fen, pgn, lastMove, turn, legalMoves, question } = body;

  if (!fen) {
    return res.status(400).json({ error: "Field 'fen' wajib diisi." });
  }
  if (mode === "ask" && !question) {
    return res.status(400).json({ error: "Field 'question' wajib untuk mode tanya." });
  }

  const prompt = buildPrompt({ mode, fen, pgn, lastMove, turn, legalMoves, question });

  // Coba model utama, fallback ke model berikutnya kalau tidak tersedia.
  let lastErr = null;
  for (const model of GEMINI_MODELS) {
    try {
      const answer = await callGemini(apiKey, model, prompt);
      return res.status(200).json({ answer, model });
    } catch (err) {
      lastErr = err;
      // 404 = model tidak ada untuk key ini -> coba model berikutnya.
      // Selain itu, hentikan dan laporkan.
      if (err.status && err.status !== 404) break;
    }
  }

  const status = lastErr?.status || 502;
  return res.status(status).json({
    error: "Gagal memanggil Gemini.",
    detail: lastErr?.detail || lastErr?.message || "Unknown error",
  });
}
