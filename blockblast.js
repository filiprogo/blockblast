(() => {
  const SIZE = 8;
  const CELL = 50;
  const GAP = 3;
  const PAD = 4;
  const BEST_KEY = "blockblast-best";

  const BLOCKS = {
    "#ff3b4a": { light: "#ffb0b6", dark: "#d11224", edge: "#9d0d1a" },
    "#ff8a1e": { light: "#ffd0a0", dark: "#e06500", edge: "#b24d00" },
    "#ffd23a": { light: "#fff1a8", dark: "#e0a800", edge: "#b48400" },
    "#3dde62": { light: "#b6ffc8", dark: "#14b83c", edge: "#0d8a2c" },
    "#3ad7ff": { light: "#c8f4ff", dark: "#00a8d4", edge: "#007ea0" },
    "#3d74ff": { light: "#b9ceff", dark: "#1d4ed8", edge: "#163aa8" },
    "#b44dff": { light: "#e4c2ff", dark: "#8a1ad4", edge: "#6814a4" },
    "#ff4fa3": { light: "#ffc2e0", dark: "#e01878", edge: "#ab105a" },
  };
  const PALETTE = Object.keys(BLOCKS);

  // Each family is one kind of piece. Weight is how often it is picked.
  // A turn has three pieces, and at most one of them is big.
  const FAMILIES = [
    { tier: "small", weight: 5, shapes: [[[0, 0]]] },
    {
      tier: "small",
      weight: 8,
      shapes: [
        [[0, 0], [0, 1]],
        [[0, 0], [1, 0]],
      ],
    },
    {
      tier: "small",
      weight: 8,
      shapes: [
        [[0, 0], [0, 1], [0, 2]],
        [[0, 0], [1, 0], [2, 0]],
      ],
    },
    { tier: "small", weight: 7, shapes: [[[0, 0], [0, 1], [1, 0], [1, 1]]] },
    {
      tier: "small",
      weight: 8,
      shapes: [
        [[0, 0], [0, 1], [1, 0]],
        [[0, 0], [0, 1], [1, 1]],
        [[0, 0], [1, 0], [1, 1]],
        [[0, 1], [1, 0], [1, 1]],
      ],
    },
    {
      tier: "medium",
      weight: 5,
      shapes: [
        [[0, 0], [0, 1], [0, 2], [0, 3]],
        [[0, 0], [1, 0], [2, 0], [3, 0]],
      ],
    },
    {
      tier: "medium",
      weight: 5,
      shapes: [
        [[0, 0], [0, 1], [0, 2], [1, 0]],
        [[0, 0], [0, 1], [0, 2], [1, 2]],
        [[0, 0], [1, 0], [2, 0], [2, 1]],
        [[0, 1], [1, 1], [2, 0], [2, 1]],
      ],
    },
    {
      tier: "medium",
      weight: 5,
      shapes: [
        [[0, 0], [0, 1], [0, 2], [1, 1]],
        [[0, 1], [1, 0], [1, 1], [1, 2]],
        [[0, 0], [1, 0], [1, 1], [2, 0]],
        [[0, 1], [1, 0], [1, 1], [2, 1]],
      ],
    },
    {
      tier: "medium",
      weight: 4,
      shapes: [
        [[0, 0], [0, 1], [1, 1], [1, 2]],
        [[0, 1], [0, 2], [1, 0], [1, 1]],
        [[0, 0], [1, 0], [1, 1], [2, 1]],
        [[0, 1], [1, 0], [1, 1], [2, 0]],
      ],
    },
    {
      tier: "medium",
      weight: 5,
      shapes: [
        [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2]],
        [[0, 0], [0, 1], [1, 0], [1, 1], [2, 0], [2, 1]],
      ],
    },
    {
      tier: "big",
      weight: 2,
      shapes: [
        [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]],
        [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]],
      ],
    },
    {
      tier: "big",
      weight: 2,
      shapes: [
        [[0, 0], [0, 1], [0, 2], [1, 0], [2, 0]],
        [[0, 0], [0, 1], [0, 2], [1, 2], [2, 2]],
        [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2]],
        [[0, 2], [1, 2], [2, 0], [2, 1], [2, 2]],
      ],
    },
    { tier: "big", weight: 1, shapes: [[[0, 1], [1, 0], [1, 1], [1, 2], [2, 1]]] },
    {
      tier: "big",
      weight: 1,
      shapes: [[[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2]]],
    },
  ];

  const boardEl = document.getElementById("board");
  const dragEl = document.getElementById("drag");
  const overlay = document.getElementById("overlay");
  const overlayTitle = document.getElementById("overlay-title");
  const overlayMsg = document.getElementById("overlay-msg");
  const startBtn = document.getElementById("start-btn");
  const scoreEl = document.getElementById("score");
  const bestEl = document.getElementById("best");
  const comboEl = document.getElementById("combo");
  const slots = [0, 1, 2].map((i) => document.getElementById(`slot${i}`));

  const ctx = boardEl.getContext("2d");
  const dragCtx = dragEl.getContext("2d");
  const slotCtx = slots.map((c) => c.getContext("2d"));

  let grid = emptyGrid();
  let tray = [null, null, null];
  let score = 0;
  let best = Number(localStorage.getItem(BEST_KEY) || 0);
  let playing = false;
  let selected = -1;
  let drag = null; // { slot, piece, ox, oy }
  let hover = null; // { r, c, ok }
  let clearFlash = []; // cells flashing after clear
  let animId = 0;

  bestEl.textContent = String(best);

  function emptyGrid() {
    return Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
  }

  function pickFamily(allowBig) {
    const pool = FAMILIES.filter((family) => allowBig || family.tier !== "big");
    const total = pool.reduce((sum, family) => sum + family.weight, 0);
    let roll = Math.random() * total;
    for (const family of pool) {
      roll -= family.weight;
      if (roll < 0) return family;
    }
    return pool[pool.length - 1];
  }

  function randomColor(used) {
    const fresh = PALETTE.filter((color) => !used.has(color));
    const bag = fresh.length ? fresh : PALETTE;
    return bag[(Math.random() * bag.length) | 0];
  }

  function dealHand() {
    const pieces = [];
    const colors = new Set();
    let bigUsed = false;
    for (let i = 0; i < 3; i++) {
      const family = pickFamily(!bigUsed);
      if (family.tier === "big") bigUsed = true;
      const shape = family.shapes[(Math.random() * family.shapes.length) | 0];
      const color = randomColor(colors);
      colors.add(color);
      pieces.push({ cells: shape.map(([r, c]) => [r, c]), color });
    }
    return pieces;
  }

  function fillTray() {
    if (!tray.every((piece) => !piece)) return;
    let hand = dealHand();
    for (let attempt = 0; attempt < 10 && !hand.some(anyFit); attempt++) {
      hand = dealHand();
    }
    tray = hand;
  }

  function pieceBounds(piece) {
    let maxR = 0;
    let maxC = 0;
    for (const [r, c] of piece.cells) {
      maxR = Math.max(maxR, r);
      maxC = Math.max(maxC, c);
    }
    return { rows: maxR + 1, cols: maxC + 1 };
  }

  function canPlace(piece, row, col) {
    for (const [dr, dc] of piece.cells) {
      const r = row + dr;
      const c = col + dc;
      if (r < 0 || c < 0 || r >= SIZE || c >= SIZE) return false;
      if (grid[r][c]) return false;
    }
    return true;
  }

  function anyFit(piece) {
    if (!piece) return false;
    const { rows, cols } = pieceBounds(piece);
    for (let r = 0; r <= SIZE - rows; r++) {
      for (let c = 0; c <= SIZE - cols; c++) {
        if (canPlace(piece, r, c)) return true;
      }
    }
    return false;
  }

  function place(piece, row, col) {
    for (const [dr, dc] of piece.cells) {
      grid[row + dr][col + dc] = piece.color;
    }
    score += piece.cells.length;
  }

  function clearLines() {
    const fullRows = [];
    const fullCols = [];
    for (let r = 0; r < SIZE; r++) {
      if (grid[r].every((v) => v)) fullRows.push(r);
    }
    for (let c = 0; c < SIZE; c++) {
      let ok = true;
      for (let r = 0; r < SIZE; r++) {
        if (!grid[r][c]) {
          ok = false;
          break;
        }
      }
      if (ok) fullCols.push(c);
    }

    if (!fullRows.length && !fullCols.length) return 0;

    const cleared = new Set();
    for (const r of fullRows) {
      for (let c = 0; c < SIZE; c++) cleared.add(`${r},${c}`);
    }
    for (const c of fullCols) {
      for (let r = 0; r < SIZE; r++) cleared.add(`${r},${c}`);
    }

    clearFlash = [...cleared].map((k) => {
      const [r, c] = k.split(",").map(Number);
      return { r, c, color: grid[r][c] };
    });

    for (const { r, c } of clearFlash) grid[r][c] = 0;

    const lines = fullRows.length + fullCols.length;
    const base = cleared.size * 10;
    const comboBonus = lines > 1 ? lines * 25 : 0;
    const multiBonus = fullRows.length && fullCols.length ? 50 : 0;
    const gained = base + comboBonus + multiBonus;
    score += gained;

    showCombo(lines);
    return lines;
  }

  function showCombo(lines) {
    if (lines < 1) return;
    const words = ["Good!", "Great!", "Excellent!", "Unbelievable!"];
    const colors = ["#ffffff", "#ffe14a", "#8dffb0", "#ffd0f0"];
    comboEl.hidden = false;
    comboEl.textContent = words[Math.min(lines, words.length) - 1];
    comboEl.style.color = colors[Math.min(lines, colors.length) - 1];
    clearTimeout(showCombo._t);
    showCombo._t = setTimeout(() => {
      comboEl.hidden = true;
    }, 850);
  }

  function checkGameOver() {
    const remaining = tray.filter(Boolean);
    if (!remaining.length) {
      fillTray();
      return false;
    }
    return !remaining.some(anyFit);
  }

  function endGame() {
    playing = false;
    selected = -1;
    if (score > best) {
      best = score;
      localStorage.setItem(BEST_KEY, String(best));
      bestEl.textContent = String(best);
    }
    overlayTitle.textContent = "Game over";
    overlayMsg.textContent = `Score ${score}${score >= best ? " · New best!" : ""}`;
    startBtn.textContent = "Try again";
    overlay.hidden = false;
    drawAll();
  }

  function startGame() {
    grid = emptyGrid();
    tray = [null, null, null];
    fillTray();
    score = 0;
    selected = -1;
    drag = null;
    hover = null;
    clearFlash = [];
    playing = true;
    overlay.hidden = true;
    updateScore();
    drawAll();
  }

  function updateScore() {
    scoreEl.textContent = String(score);
    if (score > best) {
      best = score;
      localStorage.setItem(BEST_KEY, String(best));
      bestEl.textContent = String(best);
    }
  }

  function boardMetrics() {
    const cssW = boardEl.getBoundingClientRect().width;
    const scale = cssW / boardEl.width;
    return { scale, cssW };
  }

  function cellAt(clientX, clientY) {
    const rect = boardEl.getBoundingClientRect();
    const { scale } = boardMetrics();
    const x = (clientX - rect.left) / scale;
    const y = (clientY - rect.top) / scale;
    const c = Math.floor((x - PAD) / (CELL + GAP));
    const r = Math.floor((y - PAD) / (CELL + GAP));
    if (r < 0 || c < 0 || r >= SIZE || c >= SIZE) return null;
    return { r, c };
  }

  function blockSpec(color) {
    const extra = BLOCKS[color];
    if (extra) return { base: color, ...extra };
    return {
      base: color,
      light: shade(color, 1.35),
      dark: shade(color, 0.68),
      edge: shade(color, 0.48),
    };
  }

  function drawCell(c, x, y, size, color, alpha = 1) {
    const spec = blockSpec(color);
    const rad = Math.max(5, size * 0.24);
    c.save();
    c.globalAlpha = alpha;

    c.fillStyle = "rgba(6, 16, 60, 0.28)";
    roundRect(c, x, y + size * 0.08, size, size * 0.94, rad);
    c.fill();

    const g = c.createLinearGradient(x, y, x, y + size);
    g.addColorStop(0, spec.light);
    g.addColorStop(0.42, spec.base);
    g.addColorStop(1, spec.dark);
    roundRect(c, x, y, size, size, rad);
    c.fillStyle = g;
    c.fill();

    c.lineWidth = Math.max(2, size * 0.07);
    c.strokeStyle = spec.edge;
    c.stroke();

    c.fillStyle = "rgba(255,255,255,0.55)";
    roundRect(c, x + size * 0.16, y + size * 0.1, size * 0.68, size * 0.2, rad * 0.45);
    c.fill();

    c.fillStyle = "rgba(255,255,255,0.95)";
    c.beginPath();
    c.arc(x + size * 0.3, y + size * 0.22, Math.max(1.5, size * 0.07), 0, Math.PI * 2);
    c.fill();
    c.restore();
  }

  function drawEmpty(c, x, y, size) {
    const rad = Math.max(5, size * 0.24);
    roundRect(c, x, y, size, size, rad);
    const g = c.createLinearGradient(x, y, x, y + size);
    g.addColorStop(0, "#16348f");
    g.addColorStop(1, "#2147b8");
    c.fillStyle = g;
    c.fill();
    c.strokeStyle = "rgba(6, 18, 70, 0.35)";
    c.lineWidth = 1.5;
    c.stroke();
  }

  function roundRect(c, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    c.beginPath();
    c.moveTo(x + rr, y);
    c.arcTo(x + w, y, x + w, y + h, rr);
    c.arcTo(x + w, y + h, x, y + h, rr);
    c.arcTo(x, y + h, x, y, rr);
    c.arcTo(x, y, x + w, y, rr);
    c.closePath();
  }

  function shade(hex, f) {
    const n = hex.replace("#", "");
    const r = Math.min(255, Math.round(parseInt(n.slice(0, 2), 16) * f));
    const g = Math.min(255, Math.round(parseInt(n.slice(2, 4), 16) * f));
    const b = Math.min(255, Math.round(parseInt(n.slice(4, 6), 16) * f));
    return `rgb(${r},${g},${b})`;
  }

  function drawBoard() {
    const w = boardEl.width;
    const h = boardEl.height;
    ctx.clearRect(0, 0, w, h);

    ctx.fillStyle = "#10256f";
    roundRect(ctx, 0, 0, w, h, 18);
    ctx.fill();

    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const x = PAD + c * (CELL + GAP);
        const y = PAD + r * (CELL + GAP);
        if (grid[r][c]) drawCell(ctx, x, y, CELL, grid[r][c]);
        else drawEmpty(ctx, x, y, CELL);
      }
    }

    if (hover && drag) {
      const piece = drag.piece;
      for (const [dr, dc] of piece.cells) {
        const r = hover.r + dr;
        const c = hover.c + dc;
        if (r < 0 || c < 0 || r >= SIZE || c >= SIZE) continue;
        const x = PAD + c * (CELL + GAP);
        const y = PAD + r * (CELL + GAP);
        drawCell(ctx, x, y, CELL, piece.color, hover.ok ? 0.55 : 0.28);
        if (!hover.ok) {
          ctx.strokeStyle = "rgba(225,93,108,0.8)";
          ctx.lineWidth = 2;
          roundRect(ctx, x + 1, y + 1, CELL - 2, CELL - 2, 7);
          ctx.stroke();
        }
      }
    }

    // tap-to-place ghost
    if (!drag && selected >= 0 && tray[selected] && hover) {
      const piece = tray[selected];
      for (const [dr, dc] of piece.cells) {
        const r = hover.r + dr;
        const c = hover.c + dc;
        if (r < 0 || c < 0 || r >= SIZE || c >= SIZE) continue;
        const x = PAD + c * (CELL + GAP);
        const y = PAD + r * (CELL + GAP);
        drawCell(ctx, x, y, CELL, piece.color, hover.ok ? 0.5 : 0.25);
      }
    }

    if (clearFlash.length) {
      const t = (performance.now() % 300) / 300;
      for (const { r, c, color } of clearFlash) {
        const x = PAD + c * (CELL + GAP);
        const y = PAD + r * (CELL + GAP);
        drawCell(ctx, x, y, CELL, color, 0.35 + 0.45 * Math.sin(t * Math.PI));
      }
    }
  }

  function drawPieceOn(c, piece, canvasW, canvasH, cellSize) {
    c.clearRect(0, 0, canvasW, canvasH);
    if (!piece) return;
    const { rows, cols } = pieceBounds(piece);
    const gap = Math.max(2, cellSize * 0.08);
    const totalW = cols * cellSize + (cols - 1) * gap;
    const totalH = rows * cellSize + (rows - 1) * gap;
    const ox = (canvasW - totalW) / 2;
    const oy = (canvasH - totalH) / 2;
    for (const [r, col] of piece.cells) {
      const x = ox + col * (cellSize + gap);
      const y = oy + r * (cellSize + gap);
      drawCell(c, x, y, cellSize, piece.color);
    }
  }

  function drawTray() {
    slots.forEach((el, i) => {
      const piece = tray[i];
      el.classList.toggle("empty", !piece);
      el.classList.toggle("selected", selected === i && !!piece);
      const size = piece ? Math.min(22, 100 / Math.max(pieceBounds(piece).rows, pieceBounds(piece).cols, 1)) : 18;
      drawPieceOn(slotCtx[i], piece, el.width, el.height, size);
    });
  }

  function dragCellSize() {
    const rect = boardEl.getBoundingClientRect();
    if (!rect.width) return 28;
    return (CELL * rect.width) / boardEl.width;
  }

  function drawDrag() {
    if (!drag) {
      dragEl.hidden = true;
      return;
    }
    dragEl.hidden = false;
    const piece = drag.piece;
    const { rows, cols } = pieceBounds(piece);
    const cell = dragCellSize();
    const gap = Math.max(2, cell * 0.08);
    const w = Math.ceil(cols * cell + (cols - 1) * gap + 8);
    const h = Math.ceil(rows * cell + (rows - 1) * gap + 8);
    if (dragEl.width !== w) dragEl.width = w;
    if (dragEl.height !== h) dragEl.height = h;
    dragEl.style.width = `${w}px`;
    dragEl.style.height = `${h}px`;
    drawPieceOn(dragCtx, piece, w, h, cell);
  }

  function drawAll() {
    drawBoard();
    drawTray();
    drawDrag();
  }

  function tryCommit(slot, row, col) {
    const piece = tray[slot];
    if (!piece || !canPlace(piece, row, col)) return false;

    place(piece, row, col);
    tray[slot] = null;
    selected = -1;
    drag = null;
    hover = null;

    const lines = clearLines();
    updateScore();
    fillTray();
    drawAll();

    if (lines) {
      cancelAnimationFrame(animId);
      const start = performance.now();
      const tick = (now) => {
        drawBoard();
        if (now - start < 280) {
          animId = requestAnimationFrame(tick);
        } else {
          clearFlash = [];
          drawAll();
          if (checkGameOver()) endGame();
        }
      };
      animId = requestAnimationFrame(tick);
    } else if (checkGameOver()) {
      endGame();
    }
    return true;
  }

  function pointerPos(e) {
    if (e.touches && e.touches[0]) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    if (e.changedTouches && e.changedTouches[0]) {
      return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
    }
    return { x: e.clientX, y: e.clientY };
  }

  function updateHoverFromPointer(x, y, piece) {
    const cell = cellAt(x, y);
    if (!cell || !piece) {
      hover = null;
      return;
    }
    // Anchor so finger/cursor sits near piece center
    const { rows, cols } = pieceBounds(piece);
    const ar = Math.max(0, cell.r - Math.floor((rows - 1) / 2));
    const ac = Math.max(0, cell.c - Math.floor((cols - 1) / 2));
    hover = { r: ar, c: ac, ok: canPlace(piece, ar, ac) };
  }

  function beginDrag(slot, x, y) {
    if (!playing || !tray[slot]) return;
    selected = slot;
    drag = { slot, piece: tray[slot], ox: 40, oy: 40 };
    updateHoverFromPointer(x, y, drag.piece);
    drawAll();
    positionDrag(x, y);
  }

  function positionDrag(x, y) {
    if (!drag) return;
    dragEl.style.transform = `translate(${x - dragEl.width / 2}px, ${y - dragEl.height - 24}px)`;
  }

  function onPointerMove(e) {
    if (!playing) return;
    const { x, y } = pointerPos(e);
    if (drag) {
      e.preventDefault();
      updateHoverFromPointer(x, y, drag.piece);
      drawBoard();
      drawDrag();
      positionDrag(x, y);
    } else if (selected >= 0 && tray[selected]) {
      updateHoverFromPointer(x, y, tray[selected]);
      drawBoard();
    }
  }

  function onPointerUp(e) {
    if (!playing) return;
    const { x, y } = pointerPos(e);

    if (drag) {
      updateHoverFromPointer(x, y, drag.piece);
      if (hover && hover.ok) {
        tryCommit(drag.slot, hover.r, hover.c);
      } else {
        drag = null;
        hover = null;
        drawAll();
      }
      return;
    }

    // Tap-to-place: selected piece + tap on board
    if (selected >= 0 && tray[selected]) {
      const cell = cellAt(x, y);
      if (cell) {
        const piece = tray[selected];
        const { rows, cols } = pieceBounds(piece);
        const ar = Math.max(0, cell.r - Math.floor((rows - 1) / 2));
        const ac = Math.max(0, cell.c - Math.floor((cols - 1) / 2));
        if (canPlace(piece, ar, ac)) {
          tryCommit(selected, ar, ac);
        } else {
          hover = { r: ar, c: ac, ok: false };
          drawBoard();
        }
      }
    }
  }

  slots.forEach((el, i) => {
    const down = (e) => {
      if (!playing || !tray[i]) return;
      e.preventDefault();
      const { x, y } = pointerPos(e);
      // quick tap selects; movement starts drag
      selected = i;
      drawTray();

      const startX = x;
      const startY = y;
      let started = false;

      const move = (ev) => {
        const p = pointerPos(ev);
        if (!started && Math.hypot(p.x - startX, p.y - startY) > 8) {
          started = true;
          beginDrag(i, p.x, p.y);
        }
        if (started) onPointerMove(ev);
      };
      const up = (ev) => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        window.removeEventListener("touchmove", move);
        window.removeEventListener("touchend", up);
        if (started) onPointerUp(ev);
        // else: stay selected for tap-to-place
      };

      window.addEventListener("pointermove", move, { passive: false });
      window.addEventListener("pointerup", up);
      window.addEventListener("touchmove", move, { passive: false });
      window.addEventListener("touchend", up);
    };

    el.addEventListener("pointerdown", down);
    el.addEventListener("touchstart", down, { passive: false });
  });

  boardEl.addEventListener("pointermove", onPointerMove);
  boardEl.addEventListener("pointerup", onPointerUp);
  boardEl.addEventListener("touchmove", onPointerMove, { passive: false });
  boardEl.addEventListener("touchend", onPointerUp);

  startBtn.addEventListener("click", startGame);

  // Initial paint
  drawAll();
})();
