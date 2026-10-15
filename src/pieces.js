// Unicode glyphs untuk tiap bidak catur.
// Kita selalu pakai glyph "putih" (berisi/solid) lalu warnai lewat CSS,
// supaya bidak hitam dan putih sama bentuknya dan kontras di papan.
const GLYPHS = {
  k: "\u2654", // ♔
  q: "\u2655", // ♕
  r: "\u2656", // ♖
  b: "\u2657", // ♗
  n: "\u2658", // ♘
  p: "\u2659", // ♙
};

const NAMES_ID = {
  p: "Pion",
  n: "Kuda",
  b: "Gajah",
  r: "Benteng",
  q: "Menteri",
  k: "Raja",
};

export function pieceGlyph(type) {
  return GLYPHS[type] || "";
}

export function pieceName(type) {
  return NAMES_ID[type] || type;
}
