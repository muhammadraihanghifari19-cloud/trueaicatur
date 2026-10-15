import "./style.css";
import { Chess } from "chess.js";
import { pieceGlyph, pieceName } from "./pieces.js";
import { explainPosition, askCoach } from "./coach.js";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
const RANKS = ["8", "7", "6", "5", "4", "3", "2", "1"];

const game = new Chess();

// State UI
let selected = null; // kotak yang sedang dipilih, mis. "e2"
let legalTargets = []; // daftar objek move legal dari kotak terpilih
let lastMove = null; // { from, to }
let lastMoveSan = null; // notasi SAN langkah terakhir, untuk konteks AI
let orientation = "white"; // "white" | "black"

// Elemen DOM
const boardEl = document.getElementById("board");
const statusText = document.getElementById("statusText");
const turnText = document.getElementById("turnText");
const turnDot = document.getElementById("turnDot");
const moveListEl = document.getElementById("moveList");
const moveCountEl = document.getElementById("moveCount");
const undoBtn = document.getElementById("undoBtn");
const resetBtn = document.getElementById("resetBtn");
const flipBtn = document.getElementById("flipBtn");

// Elemen Pelatih AI
const coachOutput = document.getElementById("coachOutput");
const explainBtn = document.getElementById("explainBtn");
const askForm = document.getElementById("askForm");
const askInput = document.getElementById("askInput");
const askBtn = document.getElementById("askBtn");
const autoExplain = document.getElementById("autoExplain");

/**
 * Bangun ulang seluruh papan dari posisi game saat ini.
 */
function renderBoard() {
  boardEl.innerHTML = "";

  const ranks = orientation === "white" ? RANKS : [...RANKS].reverse();
  const files = orientation === "white" ? FILES : [...FILES].reverse();

  const checkSquare = findCheckedKingSquare();

  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const square = files[f] + ranks[r];
      const isLight = (f + r) % 2 === 0;

      const sq = document.createElement("div");
      sq.className = "square " + (isLight ? "square--light" : "square--dark");
      sq.dataset.square = square;

      if (selected === square) sq.classList.add("square--selected");
      if (lastMove && (lastMove.from === square || lastMove.to === square)) {
        sq.classList.add("square--last");
      }
      if (checkSquare === square) sq.classList.add("square--check");

      // Koordinat di tepi papan
      if (f === 0) {
        const rankLabel = document.createElement("span");
        rankLabel.className = "square__coord square__coord--rank";
        rankLabel.textContent = ranks[r];
        sq.appendChild(rankLabel);
      }
      if (r === 7) {
        const fileLabel = document.createElement("span");
        fileLabel.className = "square__coord square__coord--file";
        fileLabel.textContent = files[f];
        sq.appendChild(fileLabel);
      }

      // Bidak
      const piece = game.get(square);
      if (piece) {
        const p = document.createElement("span");
        p.className =
          "square__piece " +
          (piece.color === "w" ? "square__piece--white" : "square__piece--black");
        p.textContent = pieceGlyph(piece.type);
        sq.appendChild(p);
      }

      // Tanda langkah legal
      const target = legalTargets.find((m) => m.to === square);
      if (target) {
        const dot = document.createElement("span");
        const isCapture = target.flags.includes("c") || target.flags.includes("e");
        dot.className = isCapture
          ? "square__legal square__legal--capture"
          : "square__legal";
        sq.appendChild(dot);
      }

      sq.addEventListener("click", () => onSquareClick(square));
      boardEl.appendChild(sq);
    }
  }
}

/**
 * Cari kotak raja yang sedang diskak (untuk highlight merah).
 */
function findCheckedKingSquare() {
  if (!game.inCheck()) return null;
  const turn = game.turn(); // raja yang sedang diskak adalah milik pemain yang akan jalan
  const board = game.board();
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const cell = board[r][f];
      if (cell && cell.type === "k" && cell.color === turn) {
        return FILES[f] + RANKS[r];
      }
    }
  }
  return null;
}

function onSquareClick(square) {
  if (game.isGameOver()) return;

  // Jika sudah ada bidak terpilih dan klik adalah target legal -> jalankan
  if (selected) {
    const move = legalTargets.find((m) => m.to === square);
    if (move) {
      makeMove(move);
      return;
    }
  }

  const piece = game.get(square);
  // Pilih bidak milik pemain yang sedang jalan
  if (piece && piece.color === game.turn()) {
    selected = square;
    legalTargets = game.moves({ square, verbose: true });
  } else {
    // Klik kosong / bidak lawan -> batal pilih
    selected = null;
    legalTargets = [];
  }
  renderBoard();
}

function makeMove(move) {
  // Promosi otomatis ke Menteri (queen) untuk kesederhanaan
  const result = game.move({ from: move.from, to: move.to, promotion: "q" });
  if (!result) return;

  lastMove = { from: result.from, to: result.to };
  lastMoveSan = result.san;
  selected = null;
  legalTargets = [];

  renderBoard();
  updateInfo();

  // Jelaskan otomatis bila mode Auto aktif
  if (autoExplain && autoExplain.checked) {
    runCoach(() => explainPosition(game, lastMoveSan));
  }
}

function updateInfo() {
  // Giliran
  const whiteToMove = game.turn() === "w";
  turnText.textContent = whiteToMove ? "Giliran Putih" : "Giliran Hitam";
  turnDot.classList.toggle("turn-indicator__dot--black", !whiteToMove);

  // Status permainan
  statusText.className = "status-text";
  if (game.isCheckmate()) {
    const winner = whiteToMove ? "Hitam" : "Putih";
    statusText.textContent = `Skakmat! ${winner} menang.`;
    statusText.classList.add("status-text--mate");
  } else if (game.isStalemate()) {
    statusText.textContent = "Remis — stalemate (tidak ada langkah legal).";
  } else if (game.isInsufficientMaterial()) {
    statusText.textContent = "Remis — material tidak cukup untuk skakmat.";
  } else if (game.isThreefoldRepetition()) {
    statusText.textContent = "Remis — pengulangan posisi tiga kali.";
  } else if (game.isDraw()) {
    statusText.textContent = "Remis — aturan 50 langkah.";
  } else if (game.inCheck()) {
    statusText.textContent = `Skak! ${whiteToMove ? "Putih" : "Hitam"} harus menyelamatkan raja.`;
    statusText.classList.add("status-text--check");
  } else {
    statusText.textContent = `Giliran ${whiteToMove ? "Putih" : "Hitam"} berjalan.`;
  }

  renderMoveList();
  undoBtn.disabled = game.history().length === 0;
}

function renderMoveList() {
  const history = game.history({ verbose: true });
  moveCountEl.textContent = history.length;

  if (history.length === 0) {
    moveListEl.innerHTML = '<p class="move-list__empty">Belum ada langkah.</p>';
    return;
  }

  moveListEl.innerHTML = "";
  for (let i = 0; i < history.length; i += 2) {
    const moveNo = i / 2 + 1;

    const num = document.createElement("span");
    num.className = "move-list__num";
    num.textContent = moveNo + ".";
    moveListEl.appendChild(num);

    const white = document.createElement("span");
    white.className = "move-list__move";
    white.textContent = history[i].san;
    moveListEl.appendChild(white);

    const black = document.createElement("span");
    black.className = "move-list__move";
    black.textContent = history[i + 1] ? history[i + 1].san : "";
    moveListEl.appendChild(black);
  }

  // Tandai langkah terakhir
  const moves = moveListEl.querySelectorAll(".move-list__move");
  const lastIdx = history.length - 1;
  if (moves[lastIdx]) moves[lastIdx].classList.add("move-list__move--active");

  moveListEl.scrollTop = moveListEl.scrollHeight;
}

function undo() {
  const undone = game.undo();
  if (!undone) return;
  const hist = game.history({ verbose: true });
  if (hist.length) {
    const last = hist[hist.length - 1];
    lastMove = { from: last.from, to: last.to };
    lastMoveSan = last.san;
  } else {
    lastMove = null;
    lastMoveSan = null;
  }
  selected = null;
  legalTargets = [];
  renderBoard();
  updateInfo();
}

function reset() {
  game.reset();
  selected = null;
  legalTargets = [];
  lastMove = null;
  lastMoveSan = null;
  renderBoard();
  updateInfo();
  setCoachPlaceholder();
}

function flip() {
  orientation = orientation === "white" ? "black" : "white";
  renderBoard();
}

undoBtn.addEventListener("click", undo);
resetBtn.addEventListener("click", reset);
flipBtn.addEventListener("click", flip);

/* ===== Pelatih AI ===== */

function setCoachPlaceholder() {
  coachOutput.className = "coach-output";
  coachOutput.innerHTML =
    '<p class="coach-output__placeholder">Klik "Jelaskan posisi" untuk minta penjelasan, atau ajukan pertanyaan di bawah. Pelatih menjawab berdasarkan posisi papan saat ini.</p>';
}

function setCoachLoading() {
  coachOutput.className = "coach-output coach-output--loading";
  coachOutput.innerHTML = '<span class="coach-typing">Pelatih sedang berpikir</span>';
}

function setCoachAnswer(text) {
  coachOutput.className = "coach-output";
  coachOutput.textContent = text;
}

function setCoachError(message) {
  coachOutput.className = "coach-output coach-output--error";
  coachOutput.textContent = "Gagal: " + message;
}

let coachBusy = false;

/**
 * Pembungkus pemanggilan AI: kelola status loading, error, dan tombol.
 * `task` adalah fungsi yang mengembalikan Promise<string>.
 */
async function runCoach(task) {
  if (coachBusy) return;
  coachBusy = true;
  explainBtn.disabled = true;
  askBtn.disabled = true;
  setCoachLoading();

  try {
    const answer = await task();
    setCoachAnswer(answer);
  } catch (err) {
    setCoachError(err.message || "Terjadi kesalahan tak terduga.");
  } finally {
    coachBusy = false;
    explainBtn.disabled = false;
    askBtn.disabled = false;
  }
}

explainBtn.addEventListener("click", () => {
  runCoach(() => explainPosition(game, lastMoveSan));
});

askForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const q = askInput.value.trim();
  if (!q) return;
  askInput.value = "";
  runCoach(() => askCoach(game, q, lastMoveSan));
});

// Keyboard shortcut: U = undo, R = reset, F = flip
document.addEventListener("keydown", (e) => {
  if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
  const key = e.key.toLowerCase();
  if (key === "u") undo();
  else if (key === "r") reset();
  else if (key === "f") flip();
});

// Render awal
renderBoard();
updateInfo();
