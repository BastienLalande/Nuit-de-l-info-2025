
// --- Configuration du jeu ---
const SIZE = 20;              // Nombre de cases par côté (grille 20x20)
const CELL = 20;              // Taille d'une case en px (canvas: 400 = 20x20)
const BASE_SPEED = 110;       // ms entre frames au départ
const SPEED_STEP = 0.995;     // accélération (plus proche de 1 = plus doux)
const WRAP = false;           // true => traverser les murs (wrap autour)
const WIN_SCORE = 15;

// --- État du jeu ---

stage = document.getElementById("stage");
stage.hidden = true;

const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlayTitle");
const overlayText = document.getElementById("overlayText");
const overlayResume = document.getElementById("overlayResume");
const overlayReset = document.getElementById("overlayReset");
const overlayPlay = document.getElementById("overlayPlay");
const btnStart = document.getElementById("btnStart");
const btnPause = document.getElementById("btnPause");
const btnReset = document.getElementById("btnReset");

let snake, dir, nextDir, food, score, best, tickMs, timer, paused, gameOver;

// --- Utilitaires ---
const rndInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

function placeFood() {
  // Place la pomme sur une cellule libre
  while (true) {
    const f = { x: rndInt(0, SIZE - 1), y: rndInt(0, SIZE - 1) };
    if (!snake.some(s => s.x === f.x && s.y === f.y)) {
      food = f;
      return;
    }
  }
}

function reset() {
  snake = [
    { x: Math.floor(SIZE / 2), y: Math.floor(SIZE / 2) },
    { x: Math.floor(SIZE / 2) - 1, y: Math.floor(SIZE / 2) },
    { x: Math.floor(SIZE / 2) - 2, y: Math.floor(SIZE / 2) },
  ];
  dir = { x: 1, y: 0 };      // Direction actuelle
  nextDir = { x: 1, y: 0 };  // Direction choisie au prochain tick
  score = 0;
  tickMs = BASE_SPEED;
  paused = false;
  gameOver = false;
  placeFood();
  updateHUD();
  hideOverlay();
  loop();
}

function updateHUD() {
  scoreEl.textContent = score;
  best = Number(localStorage.getItem("snakeBest") || 0);
  if (score > best) {
    best = score;
    localStorage.setItem("snakeBest", String(best));
  }
  bestEl.textContent = best;
}

// --- Dessin ---
function drawBoard() {
  // Fond
  ctx.fillStyle = "#0a0f1f";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Grille subtile
  ctx.strokeStyle = "rgba(255,255,255,0.04)";
  ctx.lineWidth = 1;
  for (let i = 0; i <= SIZE; i++) {
    ctx.beginPath();
    ctx.moveTo(i * CELL + 0.5, 0);
    ctx.lineTo(i * CELL + 0.5, SIZE * CELL);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, i * CELL + 0.5);
    ctx.lineTo(SIZE * CELL, i * CELL + 0.5);
    ctx.stroke();
  }

  // Pomme
  if (food) {
    const fx = food.x * CELL, fy = food.y * CELL;
    const r = CELL / 2 - 2;
    const cx = fx + CELL / 2, cy = fy + CELL / 2;
    // halo
    const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, r + 6);
    g.addColorStop(0, "rgba(34, 197, 94, 0.5)");
    g.addColorStop(1, "rgba(34, 197, 94, 0.0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, r + 6, 0, Math.PI * 2); ctx.fill();

    // fruit
    ctx.fillStyle = "#22c55e";
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();

    // feuille
    ctx.strokeStyle = "#16a34a";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    ctx.quadraticCurveTo(cx + 8, cy - r - 10, cx + 2, cy - r - 2);
    ctx.stroke();
  }

  // Serpent
  for (let i = snake.length - 1; i >= 0; i--) {
    const s = snake[i];
    const x = s.x * CELL, y = s.y * CELL;

    // corps
    ctx.fillStyle = i === 0 ? "#7cffc4" : "#22c55e";
    ctx.strokeStyle = "rgba(12, 18, 34, .8)";
    ctx.lineWidth = 2;
    const pad = 2;
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(x + pad, y + pad, CELL - 2 * pad, CELL - 2 * pad, 6);
      ctx.fill();
      ctx.stroke();
    } else {
      // fallback si roundRect n'est pas dispo
      ctx.fillRect(x + pad, y + pad, CELL - 2 * pad, CELL - 2 * pad);
      ctx.strokeRect(x + pad, y + pad, CELL - 2 * pad, CELL - 2 * pad);
    }

    // yeux (tête)
    if (i === 0) {
      ctx.fillStyle = "#0b1224";
      const eye = 3;
      const cx = x + CELL / 2, cy = y + CELL / 2;
      const dx = dir.x, dy = dir.y;
      ctx.beginPath();
      ctx.arc(cx + (dx * 4) - (dy * 4), cy + (dy * 4) - (dx * 4), eye, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx + (dx * 4) + (dy * 4), cy + (dy * 4) + (dx * 4), eye, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// --- Moteur ---
function step() {
  if (paused || gameOver) return;

  // Appliquer la direction choisie (empêche demi-tour instantané)
  if (Math.abs(nextDir.x) !== Math.abs(dir.x) || Math.abs(nextDir.y) !== Math.abs(dir.y)) {
    dir = nextDir;
  }

  const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

  // Bordures
  if (WRAP) {
    head.x = (head.x + SIZE) % SIZE;
    head.y = (head.y + SIZE) % SIZE;
  } else {
    if (head.x < 0 || head.x >= SIZE || head.y < 0 || head.y >= SIZE) {
      return die("Tu as heurté un mur !");
    }
  }

  // Collision avec la queue
  if (snake.some(s => s.x === head.x && s.y === head.y)) {
    return die("Tu t'es mordu la queue !");
  }

  // Avancer
  snake.unshift(head);

  // Manger ?
  if (food && head.x === food.x && head.y === food.y) {
    score++;
    tickMs = Math.max(50, tickMs * SPEED_STEP); // accélère doucement
    updateHUD();
    placeFood();
  } else {
    snake.pop(); // pas de pomme, on retire la dernière case
  }

  drawBoard();
}

function loop() {
  clearInterval(timer);
  drawBoard();
  timer = setInterval(step, tickMs);
}


function die(reason) {
    gameOver = true;
    clearInterval(timer);
    showOverlay("Perdu 😵", `${reason} • Score : ${score}`, /*showReset*/ true, /*showPlay*/ false);
    updateHUD();
}  

// --- Overlay ---


function showOverlay(title, text, showReset = false, showPlay = false) {
    overlayTitle.textContent = title;
    overlayText.textContent = text;
    overlay.hidden = false;
  
    // Afficher "Jouer" uniquement sur l'écran d'accueil (ou quand tu le demandes)
    overlayPlay.style.display   = showPlay ? "inline-block" : "none";
  
    // Afficher "Reprendre" uniquement quand le jeu est en pause, pas en game over, et pas sur l'écran "Jouer"
    const showResume = paused && !gameOver && !showPlay;
    overlayResume.style.display = showResume ? "inline-block" : "none";

    // Afficher "Rejouer" uniquement si demandé (ex: après défaite)
    overlayReset.style.display = showReset ? "inline-block" : "none";
}
function hideOverlay() {
  overlay.hidden = true;
}


// --- État (supposé déjà défini ailleurs) ---
// let dir, nextDir, paused, gameOver, timer;
// const btnStart, btnPause, btnReset, overlayResume, overlayReset, stage;

// --- Entrées clavier ---
const KEYS = {
    ArrowUp:    { x: 0, y: -1 },
    ArrowDown:  { x: 0, y:  1 },
    ArrowLeft:  { x: -1, y: 0 },
    ArrowRight: { x:  1, y: 0 },
  };
  
  // --- Konami code: Up, Up, Down, Down, Left, Right, Left, Right, B, A ---
  let konamiLock = true;           // verrou ACTIF au départ
  const KONAMI_CODE = [
    // "ArrowUp", "ArrowUp",
    // "ArrowDown", "ArrowDown",
    // "ArrowLeft", "ArrowRight",
    // "ArrowLeft", "ArrowRight",
    "KeyB", "KeyA"
  ];
  let konamiIndex = 0;
  
  // (Optionnel) masquer la scène tant que c'est verrouillé
  if (stage) stage.hidden = true;
  
  // (Optionnel) désactiver l’UI tant que verrouillé (UX + garde-fou)
  function setUIEnabled(enabled) {
    [btnStart, btnPause, btnReset, overlayResume, overlayReset].forEach(el => {
      if (!el) return;
      el.disabled = !enabled;
      el.style.pointerEvents = enabled ? "auto" : "none";
      el.style.opacity = enabled ? "1" : "0.6";
    });
  }
  setUIEnabled(false);
  
  document.addEventListener("keydown", (e) => {
    console.log(e.code);
    if (konamiLock) {
      // Ne traiter QUE le Konami code
      if (e.code === KONAMI_CODE[konamiIndex]) {
        konamiIndex++;
        if (konamiIndex === KONAMI_CODE.length) {
          console.log("Konami Code executed!");
          konamiLock = false;     // déverrouillage
          konamiIndex = 0;
          if (stage) stage.hidden = false;
          setUIEnabled(true);
        }
      } else {
        // reset : si la touche est le début du code, on se place à 1, sinon 0
        konamiIndex = (e.code === KONAMI_CODE[0]) ? 1 : 0;
      }
      // Bloquer toute autre action tant que verrou actif
      e.preventDefault();
      return;
    }
  
    // --- À partir d’ici, le jeu est déverrouillé ---
    if (KEYS[e.code]) {
      const k = KEYS[e.code];
      // empêcher le demi-tour immédiat
      if (k.x !== -dir.x || k.y !== -dir.y) {
        nextDir = k;
      }
      e.preventDefault();
    }
  });
  
  // --- Boutons ---
  btnStart?.addEventListener("click", () => {
    if (konamiLock) return; // garde-fou
    if (gameOver || !timer) reset();
    else if (paused) togglePause();
  });
  
  btnPause?.addEventListener("click", () => {
    if (konamiLock) return;
    togglePause();
  });
  
  btnReset?.addEventListener("click", () => {
    if (konamiLock) return;
    reset();
  });
  
  overlayResume?.addEventListener("click", () => {
     if (konamiLock) return;
    togglePause(false);
  });
  
  overlayReset?.addEventListener("click", () => {
    if (konamiLock) return;
    reset();
  });

  overlayPlay?.addEventListener("click", () => {
    if (konamiLock) return;
    reset();
  });




  function togglePause(forceState = null) {
    if (gameOver) return;
    paused = forceState === null ? !paused : !!forceState;
  
    if (paused) {
      clearInterval(timer);
      showOverlay("Pause ⏸️", "Appuie sur P ou « Reprendre » pour continuer.", /*showReset*/ false, /*showPlay*/ false);
    } else {
      hideOverlay();
         loop();
    }
  }  

// --- Démarrage initial ---
(function init() {
    bestEl.textContent = Number(localStorage.getItem("snakeBest") ?? 0);
    paused = true;    // on est "à l'arrêt" mais pas en pause d'une partie en cours
    gameOver = false; // important pour ne pas masquer des boutons
    showOverlay(
      "Snake",
      "Appuie sur « Jouer »",
      /* showReset */ false,
      /* showPlay  */ true
    );
  })();
  