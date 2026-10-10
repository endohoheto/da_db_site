'use strict';
(() => {
const $ = (id) => document.getElementById(id);
const app = $('app'), cv = $('cv'), ctx = cv.getContext('2d'), stage = $('stage'), sizer = $('sizer');

// マスの状態。メモは塗り/バツと別の値で持ち、確定するまで正解判定に数えない
const EMPTY = 0, FILL = 1, CROSS = 2, MFILL = 3, MCROSS = 4;
const asFill = (v) => v === FILL || v === MFILL;
const asCross = (v) => v === CROSS || v === MCROSS;
const LEVELS = { std: '標準', oni: '鬼' };
const KINDS = { artist: 'アーティスト名', song: '曲名', album: 'アルバム名', tour: 'ツアー名' };
const KEY = 'nonogram-v2';
const DEFAULTS = { theme: 'auto', redLines: true, autoCross: false, haptics: true, showTimer: true, left: false };
const coarse = matchMedia('(pointer: coarse)').matches;

// ======================================================================
// 保存
// ======================================================================
// 問題ごとに1枠(キーは名前そのもの。問題の並びが変わっても途中経過がずれない)
let store = load();
function load() {
  let s = null;
  try { s = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch {}
  if (!s || s.v !== 2) s = { v: 2, cur: null, slots: {}, best: {}, zoom: {}, filter: 'all' };
  s.settings = { ...DEFAULTS, ...(s.settings || {}) };
  s.zoom = s.zoom || {}; s.best = s.best || {}; s.slots = s.slots || {};
  return s;
}
let saveFailed = false;
function save() {
  if (P) {
    tickTimer();
    store.slots[store.cur] = {
      cells: Array.from(cells), elapsed: Math.round(elapsed), cleared,
      undo: undo.slice(-300), redo: redo.slice(-300),
      scroll: [stage.scrollLeft, stage.scrollTop],
    };
    store.zoom[P.key] = zoom;
  }
  try { localStorage.setItem(KEY, JSON.stringify(store)); saveFailed = false; }
  catch {
    if (!saveFailed) toast('この端末に保存できませんでした。容量不足か、プライベートモードの可能性があります', 6000);
    saveFailed = true;
  }
}
// ブラウザに「この保存データは勝手に消さないで」と頼む(ホーム画面に追加した場合は通りやすい)
try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch {}


// ======================================================================
// 盤面の状態
// ======================================================================
let P = null;            // {key,no,text,kind,R,C,rc,cc,sol,level,givens}
let cells = null;
let fixed = null;        // 最初から見せるマス。触っても変わらない
let undo = [], redo = [];
let elapsed = 0, lastTick = performance.now(), cleared = false, paused = false;
let mode = 1, zoom = 1;
let rowInfo = [], colInfo = [];   // {done: Uint8Array, bad: bool}
let hover = null, cursor = null, kbVisible = false;
let stroke = null, keyHold = null;
let L = null, colors = {};
let flash = null;        // 「間違いを探す」で赤く示すマス

// ======================================================================
// 問題
// ======================================================================
let PUZZLES = [];
async function loadPuzzles() {
  const res = await fetch('puzzles.json', { cache: 'no-cache' });
  if (!res.ok) throw new Error('puzzles.json ' + res.status);
  const d = await res.json();
  PUZZLES = d.puzzles.map((p, i) => ({ ...p, key: p.text, no: i + 1, sol: Array.from(p.sol, Number), givens: p.givens || {} }));
}
function initialCells(p) {
  const c = new Array(p.R * p.C).fill(EMPTY);
  for (const k in p.givens) c[+k] = p.givens[k] ? FILL : CROSS;
  return c;
}
function openPuzzle(key) {
  const p = PUZZLES.find(x => x.key === key);
  if (!p) return false;
  if (P) save();
  closeDialogs();
  P = p; store.cur = key;
  startPuzzle(store.slots[key] || { cells: initialCells(p) });
  save();
  return true;
}
const isDone = (p) => !!(store.slots[p.key] && store.slots[p.key].cleared);
// 次に解く問題: 今の問題より後ろでまだのもの → 前に戻ってまだのもの
function nextTodo() {
  const i = P ? PUZZLES.indexOf(P) : -1;
  for (let k = 1; k <= PUZZLES.length; k++) { const p = PUZZLES[(i + k) % PUZZLES.length]; if (!isDone(p) && p !== P) return p; }
  return null;
}

function startPuzzle(s) {
  cells = Uint8Array.from(s.cells);
  fixed = new Uint8Array(P.R * P.C);
  for (const k in P.givens) { fixed[+k] = 1; cells[+k] = P.givens[k] ? FILL : CROSS; } elapsed = s.elapsed || 0; cleared = !!s.cleared;
  undo = s.undo || []; redo = s.redo || []; stroke = null; keyHold = null; flash = null;
  cursor = null; kbVisible = false; hover = null; paused = false;
  $('pauseCover').hidden = true;
  lastTick = performance.now();
  zoom = store.zoom[P.key] || 1;
  $('stamp').classList.toggle('on', cleared);
  recalc(); renderInfo(); renderTimer();
  layout();
  if (s.scroll) { stage.scrollLeft = s.scroll[0]; stage.scrollTop = s.scroll[1]; } else { stage.scrollLeft = 0; stage.scrollTop = 0; }
  updateUI(); draw();
}

function renderInfo() {
  $('info1').textContent = cleared ? `No.${P.no}  ${P.text}` : `No.${P.no}・${P.C}×${P.R}・${LEVELS[P.level]}`;
  const b = store.best[store.cur];
  const parts = [KINDS[P.kind] || ''];
  if (b) parts.push(`ベスト ${fmt(b)}`);
  if (cleared) parts.push('クリア済み');
  $('info2').textContent = parts.filter(Boolean).join('・');
}

// ======================================================================
// 行・列の判定(数字の消し込みと矛盾の検出)
// ======================================================================
// 端から×か端で閉じたブロックが順に確定していれば、その数字を薄くする
function doneFlags(get, n, clue) {
  const k = clue.length, f = new Uint8Array(Math.max(k, 1));
  const runs = []; let run = 0;
  for (let i = 0; i < n; i++) { if (asFill(get(i))) run++; else if (run) { runs.push(run); run = 0; } }
  if (run) runs.push(run);
  if (runs.length === k && runs.every((v, i) => v === clue[i])) { f.fill(1); return { f, all: true }; }
  if (k === 0) return { f, all: false };
  let i = 0, j = 0;
  while (i < n && j < k) {
    const v = get(i);
    if (v === EMPTY) break;
    if (asCross(v)) { i++; continue; }
    const s = i; while (i < n && asFill(get(i))) i++;
    if (i < n && !asCross(get(i))) break;
    if (i - s !== clue[j]) break;
    f[j++] = 1;
  }
  i = n - 1; j = k - 1;
  while (i >= 0 && j >= 0) {
    const v = get(i);
    if (v === EMPTY) break;
    if (asCross(v)) { i--; continue; }
    const s = i; while (i >= 0 && asFill(get(i))) i--;
    if (i >= 0 && !asCross(get(i))) break;
    if (s - i !== clue[j]) break;
    f[j--] = 1;
  }
  return { f, all: false };
}
const lineVal = (v) => asFill(v) ? 1 : asCross(v) ? 0 : -1;
function lineInfo(get, n, clue) {
  const d = doneFlags(get, n, clue);
  let bad = false;
  if (store.settings.redLines) {
    const vals = new Array(n);
    for (let i = 0; i < n; i++) vals[i] = lineVal(get(i));
    bad = !self.NonoSolver.lineOk(vals, clue);
  }
  return { done: d.f, all: d.all, bad };
}
function recalc() {
  const R = P.R, C = P.C;
  rowInfo = []; colInfo = [];
  for (let r = 0; r < R; r++) rowInfo.push(lineInfo(i => cells[r * C + i], C, P.rc[r]));
  for (let c = 0; c < C; c++) colInfo.push(lineInfo(i => cells[i * C + c], R, P.cc[c]));
}

// ======================================================================
// レイアウト
// ======================================================================
// 盤面全体の大きさを sizer に持たせてブラウザに普通にスクロールさせ、
// canvas は sticky で見えている範囲だけを描く。こうすると数字の欄を固定したままにできる
function readColors() {
  const s = getComputedStyle(document.documentElement);
  for (const k of ['sheet', 'ink', 'ink-2', 'ink-faint', 'grid', 'grid-strong', 'hl', 'accent', 'shu', 'memo', 'bg']) colors[k] = s.getPropertyValue('--' + k).trim();
  colors.font = s.getPropertyValue('--font');
}

function fitSize() {
  const narrow = stage.clientWidth < 520;
  const maxR = Math.max(1, ...P.rc.map(a => a.length || 1));
  const maxC = Math.max(1, ...P.cc.map(a => a.length || 1));
  const slotW = narrow ? 0.62 : 0.72, slotH = narrow ? 0.6 : 0.68, M = narrow ? 6 : 10;
  const fitW = (stage.clientWidth - M * 2) / (P.C + maxR * slotW + 0.5);
  const fitH = (stage.clientHeight - M * 2) / (P.R + maxC * slotH + 0.4);
  return { fit: Math.min(fitW, fitH, 40), maxR, maxC, slotW, slotH, M };
}

function layout(depth = 0) {
  if (!P) return;
  const f = fitSize(), aw0 = stage.clientWidth;
  // タッチで確実に押せる大きさより小さくはしない(その場合はスクロール)
  const minCell = coarse ? 20 : 14;
  const base = Math.max(minCell, Math.floor(f.fit));
  const cs = Math.max(8, Math.round(Math.max(base, 8) * zoom));
  // 数字は拡大しても一定以上は大きくしない。マスと一緒に育てると、拡大したとき数字の欄が画面を占領する
  const narrow = aw0 < 520;
  const fs = Math.round(Math.max(11, Math.min(narrow ? 15 : 18, cs * (narrow ? 0.56 : 0.55))));
  const slotW = fs * (narrow ? 1.12 : 1.3), slotH = fs * (narrow ? 1.08 : 1.24);
  const left = Math.ceil(f.maxR * slotW + fs * 0.7) + f.M;
  const top = Math.ceil(f.maxC * slotH + fs * 0.6) + f.M;
  const W = left + P.C * cs + f.M, H = top + P.R * cs + f.M;
  const aw = stage.clientWidth, ah = stage.clientHeight;
  sizer.style.width = W + 'px'; sizer.style.height = H + 'px';
  sizer.style.marginTop = Math.max(0, Math.floor((ah - H) / 2)) + 'px';
  const vw = Math.min(W, stage.clientWidth), vh = Math.min(H, stage.clientHeight);
  L = { cs, left, top, W, H, vw, vh, slotW, slotH, fs };
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  cv.width = Math.round(vw * dpr); cv.height = Math.round(vh * dpr);
  cv.style.width = vw + 'px'; cv.style.height = vh + 'px';
  cv.dataset.cell = cs;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  // スクロールバーが出入りして表示域が変わったら、一度だけ測り直す
  if (depth < 1 && (ah !== stage.clientHeight || aw !== stage.clientWidth)) layout(depth + 1);
}

const origin = () => ({ gx: L.left - stage.scrollLeft, gy: L.top - stage.scrollTop });

// 指定した canvas 上の点を動かさずに拡大縮小する
function setZoom(z, ax, ay) {
  // 1マスが指先より大きくなっても見通しが悪くなるだけなので、64px で頭打ちにする
  const base = L ? L.cs / zoom : 20;
  z = Math.max(0.5, Math.min(Math.max(1, 64 / base), z));
  if (!P || Math.abs(z - zoom) < 1e-3) return;
  if (ax == null) { ax = (L.left + L.vw) / 2; ay = (L.top + L.vh) / 2; }
  const o = origin(), bx = (ax - o.gx) / L.cs, by = (ay - o.gy) / L.cs;
  zoom = z; layout();
  stage.scrollLeft = L.left + bx * L.cs - ax;
  stage.scrollTop = L.top + by * L.cs - ay;
  draw();
}
function fitAll() { zoom = 1; layout(); stage.scrollLeft = 0; stage.scrollTop = 0; draw(); save(); }

function ensureVisible(r, c) {
  const o = origin(), cs = L.cs, x = o.gx + c * cs, y = o.gy + r * cs;
  if (x < L.left) stage.scrollLeft -= L.left - x + cs;
  else if (x + cs > L.vw) stage.scrollLeft += x + cs - L.vw + cs;
  if (y < L.top) stage.scrollTop -= L.top - y + cs;
  else if (y + cs > L.vh) stage.scrollTop += y + cs - L.vh + cs;
}

// ======================================================================
// 描画
// ======================================================================
let drawQueued = false;
function requestDraw() { if (!drawQueued) { drawQueued = true; requestAnimationFrame(() => { drawQueued = false; draw(); }); } }

function drawCross(x, y, cs, color) {
  const m = cs * 0.3;
  ctx.strokeStyle = color; ctx.lineWidth = Math.max(1.3, cs / 13); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x + m, y + m); ctx.lineTo(x + cs - m, y + cs - m);
  ctx.moveTo(x + cs - m, y + m); ctx.lineTo(x + m, y + cs - m); ctx.stroke();
}

function draw() {
  if (!P || !L) return;
  const { cs, left, top, vw, vh, fs } = L, R = P.R, C = P.C;
  const { gx, gy } = origin();
  const c0 = Math.max(0, Math.floor((left - gx) / cs)), c1 = Math.min(C - 1, Math.floor((vw - gx) / cs));
  const r0 = Math.max(0, Math.floor((top - gy) / cs)), r1 = Math.min(R - 1, Math.floor((vh - gy) / cs));
  ctx.fillStyle = colors.sheet; ctx.fillRect(0, 0, vw, vh);

  // 触っている行と列を薄く塗る
  const focus = stroke ? { r: stroke.r1, c: stroke.c1 } : (kbVisible && cursor) ? cursor : hover;
  if (focus && !cleared) {
    ctx.fillStyle = colors.hl;
    ctx.fillRect(0, gy + focus.r * cs, Math.min(vw, gx + C * cs), cs);
    ctx.fillRect(gx + focus.c * cs, 0, cs, Math.min(vh, gy + R * cs));
  }

  // マス目(数字の欄の下に潜る部分は描かない)
  ctx.save(); ctx.beginPath(); ctx.rect(left, top, vw - left, vh - top); ctx.clip();
  const mm = Math.max(2, Math.round(cs * 0.14));
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
    const p = r * C + c, v = cells[p], x = gx + c * cs, y = gy + r * cs;
    if (v === FILL) { ctx.fillStyle = colors.ink; ctx.fillRect(x + 1, y + 1, cs - 1, cs - 1); }
    else if (v === CROSS) { if (!cleared) drawCross(x, y, cs, colors['ink-2']); }
    else if (v === MFILL) { ctx.fillStyle = colors.memo; ctx.fillRect(x + mm, y + mm, cs - 2 * mm + 1, cs - 2 * mm + 1); }
    else if (v === MCROSS) drawCross(x, y, cs, colors.memo);
    if (fixed[p] && !cleared) {
      // 最初から見えているマス: 左上に小さな三角
      const t = Math.max(4, cs * 0.28);
      ctx.fillStyle = v === FILL ? colors.sheet : colors.accent;
      ctx.beginPath(); ctx.moveTo(x + 2, y + 2); ctx.lineTo(x + 2 + t, y + 2); ctx.lineTo(x + 2, y + 2 + t); ctx.closePath(); ctx.fill();
    }
    if (flash && flash.has(p)) { ctx.strokeStyle = colors.shu; ctx.lineWidth = 3; ctx.strokeRect(x + 2.5, y + 2.5, cs - 4, cs - 4); }
  }
  ctx.restore();

  // 罫線。5マスごとに太く、太線は数字の欄まで伸ばす
  ctx.lineWidth = 1;
  for (let i = c0; i <= c1 + 1; i++) {
    const x = gx + i * cs + 0.5, strong = i % 5 === 0;
    if (x < left || x > vw) continue;
    ctx.strokeStyle = strong ? colors['grid-strong'] : colors.grid;
    ctx.beginPath(); ctx.moveTo(x, strong ? 0 : top); ctx.lineTo(x, Math.min(vh, gy + R * cs)); ctx.stroke();
  }
  for (let i = r0; i <= r1 + 1; i++) {
    const y = gy + i * cs + 0.5, strong = i % 5 === 0;
    if (y < top || y > vh) continue;
    ctx.strokeStyle = strong ? colors['grid-strong'] : colors.grid;
    ctx.beginPath(); ctx.moveTo(strong ? 0 : left, y); ctx.lineTo(Math.min(vw, gx + C * cs), y); ctx.stroke();
  }

  // ヒント数字。横の欄は左に、縦の欄は上に固定
  ctx.font = `700 ${fs}px ${colors.font}`;
  ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
  const clueColor = (info, j) => info.bad ? colors.shu : info.done[j] ? colors['ink-faint'] : colors.ink;
  ctx.save(); ctx.beginPath(); ctx.rect(0, top, left, vh - top); ctx.clip();
  for (let r = r0; r <= r1; r++) {
    const clue = P.rc[r], list = clue.length ? clue : [0], info = rowInfo[r];
    if (info.bad) { ctx.globalAlpha = 0.12; ctx.fillStyle = colors.shu; ctx.fillRect(0, gy + r * cs, left, cs); ctx.globalAlpha = 1; }
    for (let j = 0; j < list.length; j++) {
      const x = left - fs * 0.35 - (list.length - 1 - j) * L.slotW - L.slotW / 2;
      ctx.fillStyle = clueColor(info, j);
      ctx.fillText(String(list[j]), x, gy + r * cs + cs / 2 + 1);
    }
  }
  ctx.restore();
  ctx.save(); ctx.beginPath(); ctx.rect(left, 0, vw - left, top); ctx.clip();
  for (let c = c0; c <= c1; c++) {
    const clue = P.cc[c], list = clue.length ? clue : [0], info = colInfo[c];
    if (info.bad) { ctx.globalAlpha = 0.12; ctx.fillStyle = colors.shu; ctx.fillRect(gx + c * cs, 0, cs, top); ctx.globalAlpha = 1; }
    for (let j = 0; j < list.length; j++) {
      const y = top - fs * 0.3 - (list.length - 1 - j) * L.slotH - L.slotH / 2;
      ctx.fillStyle = clueColor(info, j);
      ctx.fillText(String(list[j]), gx + c * cs + cs / 2, y + 1);
    }
  }
  ctx.restore();

  // 外枠。スクロールして端が隠れても、数字の欄との境目は常に引く
  ctx.strokeStyle = colors.ink; ctx.lineWidth = 2;
  ctx.save(); ctx.beginPath(); ctx.rect(left - 1, top - 1, vw - left + 1, vh - top + 1); ctx.clip();
  ctx.strokeRect(gx + 0.5, gy + 0.5, C * cs, R * cs);
  ctx.restore();
  ctx.beginPath();
  ctx.moveTo(left + 0.5, top + 0.5); ctx.lineTo(Math.min(vw, gx + C * cs + 0.5), top + 0.5);
  ctx.moveTo(left + 0.5, top + 0.5); ctx.lineTo(left + 0.5, Math.min(vh, gy + R * cs + 0.5));
  ctx.stroke();
  // スクロールで隠れている側があれば、境目に影を付けて知らせる
  if (stage.scrollLeft > 0) { const g = ctx.createLinearGradient(left, 0, left + 10, 0); g.addColorStop(0, colors.hl); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(left + 1, top + 1, 10, vh - top); }
  if (stage.scrollTop > 0) { const g = ctx.createLinearGradient(0, top, 0, top + 10); g.addColorStop(0, colors.hl); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(left + 1, top + 1, vw - left, 10); }

  drawMap();

  // キーボードのカーソル
  if (kbVisible && cursor && !cleared) {
    ctx.save(); ctx.beginPath(); ctx.rect(left, top, vw - left, vh - top); ctx.clip();
    ctx.strokeStyle = colors.accent; ctx.lineWidth = 2.5;
    ctx.strokeRect(gx + cursor.c * cs + 1.5, gy + cursor.r * cs + 1.5, cs - 2, cs - 2);
    ctx.restore();
  }

  if (stroke) drawBadge(gx, gy);
}

// ドラッグ中の長さ。塗るときは「つながったかたまり全体の長さ」を出す(数字と見比べたいのはこちら)。
// 指で隠れないよう、タッチでは指の少し上に出す
function drawBadge(gx, gy) {
  const { cs, vw, vh, fs } = L;
  const filling = stroke.to === FILL || stroke.to === MFILL;
  let n = Math.abs(stroke.r1 - stroke.r0) + Math.abs(stroke.c1 - stroke.c0) + 1;
  if (filling) n = blockLength(stroke.r1, stroke.c1, stroke.axis);
  if (n < 2 && !(filling && stroke.axis)) return;
  const t = String(n), bh = Math.max(26, fs + 12), bw = Math.max(bh, fs * 0.65 * t.length + 18);
  const cx = gx + stroke.c1 * cs + cs / 2, cy = gy + stroke.r1 * cs + cs / 2;
  const lift = stroke.touch ? Math.max(cs * 1.4, 56) : cs * 0.9;
  let x0 = cx - bw / 2, y0 = cy - lift - bh / 2;
  if (y0 < 4) y0 = cy + lift - bh / 2;
  x0 = Math.min(Math.max(x0, 4), vw - bw - 4); y0 = Math.min(Math.max(y0, 4), vh - bh - 4);
  ctx.fillStyle = (stroke.to === MFILL || stroke.to === MCROSS) ? colors.memo : colors.accent;
  ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x0, y0, bw, bh, bh / 2) : ctx.rect(x0, y0, bw, bh); ctx.fill();
  ctx.fillStyle = colors.sheet; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `800 ${Math.max(14, fs)}px ${colors.font}`;
  ctx.fillText(t, x0 + bw / 2, y0 + bh / 2 + 1);
}
function blockLength(r, c, axis) {
  const C = P.C, R = P.R, at = (rr, cc) => asFill(cells[rr * C + cc]);
  if (!at(r, c)) return 0;
  if (axis === 'v') { let a = r, b = r; while (a > 0 && at(a - 1, c)) a--; while (b < R - 1 && at(b + 1, c)) b++; return b - a + 1; }
  let a = c, b = c; while (a > 0 && at(r, a - 1)) a--; while (b < C - 1 && at(r, b + 1)) b++; return b - a + 1;
}

// ---------- 縮小図 ----------
// スクロールしても左上の角(数字の欄の交差部分)は常に見えているので、そこに盤面全体の地図を置く
function mapRect() {
  if (!L || (L.W <= L.vw && L.H <= L.vh)) return null;
  const pad = 6, aw = L.left - pad * 2, ah = L.top - pad * 2;
  if (aw < 28 || ah < 28) return null;
  const s = Math.min(aw / P.C, ah / P.R), w = s * P.C, h = s * P.R;
  return { x: (L.left - w) / 2, y: (L.top - h) / 2, w, h, s };
}
// 縮小図そのものより広く、角の空白全体を押せるようにする(小さい的を狙わせない)
function inMap(x, y) {
  return !!mapRect() && x < L.left && y < L.top;
}
function navTo(x, y) {
  const m = mapRect(); if (!m) return;
  const cx = Math.max(0, Math.min(P.C, (x - m.x) / m.s)), cy = Math.max(0, Math.min(P.R, (y - m.y) / m.s));
  stage.scrollLeft = L.left - ((L.left + L.vw) / 2 - cx * L.cs);
  stage.scrollTop = L.top - ((L.top + L.vh) / 2 - cy * L.cs);
  draw();
}
function drawMap() {
  const m = mapRect(); if (!m) return;
  const { gx, gy } = origin();
  ctx.fillStyle = colors.sheet; ctx.fillRect(0, 0, L.left - 1, L.top - 1);
  ctx.fillStyle = colors.hl; ctx.fillRect(m.x, m.y, m.w, m.h);
  for (let r = 0; r < P.R; r++) for (let c = 0; c < P.C; c++) {
    const v = cells[r * P.C + c];
    if (v !== FILL && v !== MFILL) continue;
    ctx.fillStyle = v === FILL ? colors.ink : colors.memo;
    ctx.fillRect(m.x + c * m.s, m.y + r * m.s, Math.max(1, m.s), Math.max(1, m.s));
  }
  ctx.strokeStyle = colors['grid-strong']; ctx.lineWidth = 1;
  ctx.strokeRect(m.x - 0.5, m.y - 0.5, m.w + 1, m.h + 1);
  const x0 = Math.max(0, (L.left - gx) / L.cs), x1 = Math.min(P.C, (L.vw - gx) / L.cs);
  const y0 = Math.max(0, (L.top - gy) / L.cs), y1 = Math.min(P.R, (L.vh - gy) / L.cs);
  ctx.strokeStyle = colors.accent; ctx.lineWidth = 2;
  ctx.strokeRect(m.x + x0 * m.s, m.y + y0 * m.s, (x1 - x0) * m.s, (y1 - y0) * m.s);
}

// ======================================================================
// 盤面の操作
// ======================================================================
function cellAt(clientX, clientY) {
  const rect = cv.getBoundingClientRect();
  const x = clientX - rect.left, y = clientY - rect.top;
  const { gx, gy } = origin();
  const c = Math.floor((x - gx) / L.cs), r = Math.floor((y - gy) / L.cs);
  return { r, c, x, y, inside: x >= L.left && y >= L.top && r >= 0 && r < P.R && c >= 0 && c < P.C };
}

// 道具と押し始めのマスの状態から、何を何に変えるかを決める
function decide(tool, from) {
  if (tool === 1) return from === FILL ? EMPTY : FILL;
  if (tool === 2) return from === CROSS ? EMPTY : CROSS;
  if (tool === 3) return from === MFILL ? EMPTY : MFILL;
  return from === MCROSS ? EMPTY : MCROSS;
}

function applyStroke() {
  cells.set(stroke.before);
  const { r0, c0, r1, c1, from, to } = stroke;
  const dr = Math.sign(r1 - r0), dc = Math.sign(c1 - c0);
  const n = Math.max(Math.abs(r1 - r0), Math.abs(c1 - c0));
  let changed = 0;
  for (let i = 0; i <= n; i++) {
    const p = (r0 + dr * i) * P.C + (c0 + dc * i);
    if (cells[p] === from && !fixed[p]) { cells[p] = to; changed++; }
  }
  if (changed > stroke.changed) buzz(6);
  stroke.changed = changed;
  recalc();
}

function beginStroke(r, c, tool, touch) {
  const from = cells[r * P.C + c];
  stroke = { r0: r, c0: c, r1: r, c1: c, from, to: decide(tool, from), before: cells.slice(), axis: null, changed: 0, touch };
  applyStroke();
}

function moveStroke(r, c) {
  r = Math.max(0, Math.min(P.R - 1, r)); c = Math.max(0, Math.min(P.C - 1, c));
  const dr = r - stroke.r0, dc = c - stroke.c0;
  if (dr === 0 && dc === 0) stroke.axis = null;
  else if (!stroke.axis) stroke.axis = Math.abs(dr) >= Math.abs(dc) ? 'v' : 'h';
  const pr = stroke.r1, pc = stroke.c1;
  if (stroke.axis === 'h') { stroke.r1 = stroke.r0; stroke.c1 = c; }
  else if (stroke.axis === 'v') { stroke.r1 = r; stroke.c1 = stroke.c0; }
  else { stroke.r1 = stroke.r0; stroke.c1 = stroke.c0; }
  if (pr !== stroke.r1 || pc !== stroke.c1) applyStroke();
}

// 数字を満たした行・列の残りの空白をバツにする
function autoCrossLines(rows, cols) {
  const C = P.C;
  for (const r of rows) if (rowInfo[r].all) for (let c = 0; c < C; c++) if (cells[r * C + c] === EMPTY) cells[r * C + c] = CROSS;
  for (const c of cols) if (colInfo[c].all) for (let r = 0; r < P.R; r++) if (cells[r * C + c] === EMPTY) cells[r * C + c] = CROSS;
}

function endStroke() {
  const before = stroke.before;
  stroke = null;
  if (store.settings.autoCross) {
    const rows = new Set(), cols = new Set();
    for (let i = 0; i < cells.length; i++) if (cells[i] !== before[i] && asFill(cells[i]) !== asFill(before[i])) { rows.add((i / P.C) | 0); cols.add(i % P.C); }
    if (rows.size || cols.size) autoCrossLines(rows, cols);
  }
  const ch = [];
  for (let i = 0; i < cells.length; i++) if (cells[i] !== before[i]) ch.push([i, before[i], cells[i]]);
  if (ch.length) commit(ch); else recalc();
  draw();
}

function cancelStroke() {
  if (!stroke) return;
  cells.set(stroke.before); stroke = null; recalc(); draw();
}

function commit(ch) {
  undo.push(ch); if (undo.length > 1000) undo.shift();
  redo = [];
  afterChange();
}
function afterChange() { recalc(); updateUI(); checkWin(); save(); }

function checkWin() {
  if (cleared) return;
  for (let i = 0; i < cells.length; i++) if ((cells[i] === FILL) !== (P.sol[i] === 1)) return;
  tickTimer(); cleared = true;
  for (let i = 0; i < cells.length; i++) if (cells[i] !== FILL) cells[i] = EMPTY;
  stroke = null; keyHold = null; hover = null; flash = null;
  const b = store.best[store.cur], isBest = !b || elapsed < b;
  if (isBest) store.best[store.cur] = Math.round(elapsed);
  recalc(); renderInfo(); updateUI(); draw(); save();
  buzz([20, 40, 30]);
  const st = $('stamp'); st.classList.remove('on'); void st.offsetWidth; st.classList.add('on');
  $('clearKind').textContent = KINDS[P.kind] || '';
  $('clearWord').textContent = P.text;
  $('clearSub').textContent = `No.${P.no}・${fmt(elapsed)}` + (isBest && b ? '・ベスト更新' : !isBest ? `(ベスト ${fmt(b)})` : '');
  const nx = nextTodo();
  $('nextBtn').hidden = !nx;
  setTimeout(() => { if (cleared && !anyDialogOpen()) $('clearDlg').showModal(); }, 700);
}

// ======================================================================
// ポインタ
// ======================================================================
// 1本指(またはマウス左)は塗る。2本目が触れたら塗りを取り消してスクロール/ピンチに切り替える。
// 数字の欄は、ドラッグでスクロール、タップで「残りをバツ」
const pointers = new Map();
let gesture = null, lastPt = null, edgeRaf = 0;

function startTouchGesture() {
  const pts = [...pointers.values()];
  if (pts.length >= 2) {
    const [a, b] = pts;
    gesture = { mode: 'pinch', mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, d: Math.hypot(a.x - b.x, a.y - b.y), z: zoom };
  } else if (pts.length === 1) {
    gesture = { mode: 'pan', x: pts[0].x, y: pts[0].y, sx: pts[0].x, sy: pts[0].y, moved: true };
  } else gesture = null;
}

cv.addEventListener('contextmenu', e => e.preventDefault());
cv.addEventListener('pointerdown', e => {
  if (!P || paused || !$('busy').hidden) return;
  // 新しく触り始めた1本目なら、前の操作で離した通知が来なかった指の記録を捨てる
  if (e.isPrimary) { pointers.clear(); gesture = null; }
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  try { cv.setPointerCapture(e.pointerId); } catch {}
  if (e.pointerType === 'touch' && pointers.size >= 2) { cancelStroke(); startTouchGesture(); return; }
  if (gesture || stroke) return;
  const h = cellAt(e.clientX, e.clientY);
  if (e.button === 1) { e.preventDefault(); gesture = { mode: 'pan', x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, moved: true }; return; }
  if (inMap(h.x, h.y)) { gesture = { mode: 'nav' }; navTo(h.x, h.y); return; }
  if (!h.inside || cleared) {
    gesture = { mode: 'pan', x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, moved: false, tap: cleared ? null : clueTarget(h) };
    return;
  }
  e.preventDefault();
  cv.focus({ preventScroll: true }); kbVisible = false;
  const alt = e.button === 2 || e.shiftKey;
  const tool = mode === 3 ? (alt ? 4 : 3) : (alt || mode === 2) ? 2 : 1;
  cursor = { r: h.r, c: h.c };
  beginStroke(h.r, h.c, tool, e.pointerType !== 'mouse'); stroke.id = e.pointerId;
  lastPt = { x: e.clientX, y: e.clientY };
  draw();
});
cv.addEventListener('pointermove', e => {
  if (!P) return;
  const pt = pointers.get(e.pointerId);
  if (pt) { pt.x = e.clientX; pt.y = e.clientY; }
  if (gesture && pt) {
    if (gesture.mode === 'nav') {
      const rect = cv.getBoundingClientRect(); navTo(e.clientX - rect.left, e.clientY - rect.top);
    } else if (gesture.mode === 'pan') {
      if (!gesture.moved && Math.hypot(e.clientX - gesture.sx, e.clientY - gesture.sy) > 8) gesture.moved = true;
      if (gesture.moved) {
        stage.scrollLeft -= e.clientX - gesture.x; stage.scrollTop -= e.clientY - gesture.y;
      }
      gesture.x = e.clientX; gesture.y = e.clientY;
    } else if (pointers.size >= 2) {
      const [a, b] = [...pointers.values()];
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, d = Math.hypot(a.x - b.x, a.y - b.y);
      stage.scrollLeft -= mx - gesture.mx; stage.scrollTop -= my - gesture.my;
      gesture.mx = mx; gesture.my = my;
      const rect = cv.getBoundingClientRect();
      if (gesture.d > 24) setZoom(gesture.z * d / gesture.d, mx - rect.left, my - rect.top);
    }
    return;
  }
  if (stroke && e.pointerId === stroke.id) {
    lastPt = { x: e.clientX, y: e.clientY };
    const h = cellAt(e.clientX, e.clientY); moveStroke(h.r, h.c); draw();
    edgeScroll();
    return;
  }
  if (e.pointerType !== 'mouse') return;
  const h = cellAt(e.clientX, e.clientY);
  cv.style.cursor = inMap(h.x, h.y) ? 'pointer' : (h.inside && !cleared) ? 'crosshair' : clueTarget(h) ? 'pointer' : 'grab';
  const nh = h.inside ? { r: h.r, c: h.c } : null;
  if ((nh && hover && nh.r === hover.r && nh.c === hover.c) || (!nh && !hover)) return;
  hover = nh; requestDraw();
});
const finish = e => {
  pointers.delete(e.pointerId);
  if (stroke && e.pointerId === stroke.id) { if (e.type === 'pointercancel') cancelStroke(); else endStroke(); }
  if (gesture) {
    if (gesture.mode === 'pan' && !gesture.moved && gesture.tap && e.type === 'pointerup') clueTap(gesture.tap);
    if (pointers.size === 0) { const was = gesture.mode; gesture = null; if (was !== 'nav') save(); }
    else startTouchGesture();
  }
};
cv.addEventListener('pointerup', finish);
cv.addEventListener('pointercancel', finish);
cv.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse' && !stroke) { hover = null; requestDraw(); } });

function clueTarget(h) {
  if (h.x < L.left && h.y >= L.top && h.r >= 0 && h.r < P.R) return { row: h.r };
  if (h.y < L.top && h.x >= L.left && h.c >= 0 && h.c < P.C) return { col: h.c };
  return null;
}
function clueTap(t) {
  const isRow = t.row != null, idx = isRow ? t.row : t.col, info = isRow ? rowInfo[idx] : colInfo[idx];
  const name = isRow ? `${idx + 1}行目` : `${idx + 1}列目`;
  if (!info.all) { toast(`${name}はまだ数字と合っていません`); return; }
  const ch = [], n = isRow ? P.C : P.R;
  for (let i = 0; i < n; i++) {
    const p = isRow ? idx * P.C + i : i * P.C + idx;
    if (cells[p] === EMPTY) { ch.push([p, EMPTY, CROSS]); cells[p] = CROSS; }
  }
  if (ch.length) { commit(ch); buzz(10); draw(); } else toast(`${name}は埋まっています`);
}

// 塗りながら盤面の端に近づいたら自動でスクロールする
function edgeScroll() {
  if (edgeRaf || !stroke || !lastPt) return;
  const step = () => {
    edgeRaf = 0;
    if (!stroke || !lastPt) return;
    const rect = cv.getBoundingClientRect(), x = lastPt.x - rect.left, y = lastPt.y - rect.top, E = Math.max(24, L.cs);
    let dx = 0, dy = 0;
    if (stroke.axis !== 'v') { if (x > L.vw - E) dx = 1; else if (x < L.left + E && stage.scrollLeft > 0) dx = -1; }
    if (stroke.axis !== 'h') { if (y > L.vh - E) dy = 1; else if (y < L.top + E && stage.scrollTop > 0) dy = -1; }
    if (!dx && !dy) return;
    const sl = stage.scrollLeft, st = stage.scrollTop, sp = Math.max(4, L.cs / 4);
    stage.scrollLeft += dx * sp; stage.scrollTop += dy * sp;
    if (sl === stage.scrollLeft && st === stage.scrollTop) return;
    const h = cellAt(lastPt.x, lastPt.y); moveStroke(h.r, h.c); draw();
    edgeRaf = requestAnimationFrame(step);
  };
  edgeRaf = requestAnimationFrame(step);
}

stage.addEventListener('scroll', requestDraw, { passive: true });
stage.addEventListener('wheel', e => {
  if (!(e.ctrlKey || e.metaKey) || !P) return;
  e.preventDefault();
  const rect = cv.getBoundingClientRect();
  setZoom(zoom * Math.exp(-e.deltaY * 0.0025), e.clientX - rect.left, e.clientY - rect.top);
  clearTimeout(wheelSave); wheelSave = setTimeout(save, 400);
}, { passive: false });
let wheelSave = 0;
// iOS Safari のページ全体のピンチ拡大を止める(盤面は自前で拡大する)
document.addEventListener('gesturestart', e => e.preventDefault());

// ======================================================================
// キーボード
// ======================================================================
function setCell(p, from, to, group) {
  if (cells[p] !== from || fixed[p]) return;
  cells[p] = to; group.push([p, from, to]);
}
document.addEventListener('keydown', e => {
  if (!P || anyDialogOpen()) return;
  const t = e.target;
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) return;
  const mod = e.ctrlKey || e.metaKey;
  if (mod && (e.key === 'z' || e.key === 'Z')) { e.preventDefault(); e.shiftKey ? doRedo() : doUndo(); return; }
  if (mod && (e.key === 'y' || e.key === 'Y')) { e.preventDefault(); doRedo(); return; }
  if (mod || e.altKey) return;
  if (e.key === 'p' || e.key === 'P') { togglePause(); return; }
  if (!$('busy').hidden) return;
  if (e.key === 'n' || e.key === 'N') { openList(); return; }
  if (e.key === '+' || e.key === '=') { setZoom(zoom * 1.2); save(); return; }
  if (e.key === '-' || e.key === '_') { setZoom(zoom / 1.2); save(); return; }
  if (e.key === '0') { fitAll(); return; }
  if (e.key === '1' || e.key === '2' || e.key === '3') { setMode(+e.key); return; }
  if (cleared || paused) return;
  const arrows = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
  if (arrows[e.key]) {
    e.preventDefault();
    if (!cursor) cursor = { r: 0, c: 0 };
    else if (kbVisible) {
      const [dr, dc] = arrows[e.key];
      cursor = { r: Math.max(0, Math.min(P.R - 1, cursor.r + dr)), c: Math.max(0, Math.min(P.C - 1, cursor.c + dc)) };
      if (keyHold) { setCell(cursor.r * P.C + cursor.c, keyHold.from, keyHold.to, keyHold.group); recalc(); checkWin(); }
    }
    kbVisible = true; ensureVisible(cursor.r, cursor.c); draw(); return;
  }
  const k = e.key.toLowerCase();
  const toolByKey = { z: 1, enter: 1, ' ': 1, x: 2, c: 3 };
  if (toolByKey[k] && !e.repeat && !keyHold) {
    if (t !== document.body && t !== cv && (k === ' ' || k === 'enter')) return;
    e.preventDefault();
    if (!cursor) cursor = { r: 0, c: 0 };
    kbVisible = true;
    const p = cursor.r * P.C + cursor.c, from = cells[p];
    let tool = toolByKey[k];
    if (tool === 1 && mode === 3) tool = 3;
    if (tool === 1 && mode === 2) tool = 2;
    keyHold = { key: k, from, to: decide(tool, from), group: [] };
    setCell(p, from, keyHold.to, keyHold.group);
    recalc(); ensureVisible(cursor.r, cursor.c); draw(); checkWin();
  }
});
document.addEventListener('keyup', e => {
  if (keyHold && e.key.toLowerCase() === keyHold.key) {
    const g = keyHold.group; keyHold = null;
    if (g.length && !cleared) commit(g);
    draw();
  }
});

// ======================================================================
// 道具・履歴
// ======================================================================
function doUndo() {
  if (!undo.length || cleared || paused) return;
  const ch = undo.pop(); for (let i = ch.length - 1; i >= 0; i--) cells[ch[i][0]] = ch[i][1];
  redo.push(ch); afterChange(); draw();
}
function doRedo() {
  if (!redo.length || cleared || paused) return;
  const ch = redo.pop(); for (const [p, , v] of ch) cells[p] = v;
  undo.push(ch); afterChange(); draw();
}
function bulk(fn) {
  if (!P || cleared) return 0;
  const ch = [];
  for (let i = 0; i < cells.length; i++) { if (fixed[i]) continue; const v = fn(cells[i], i); if (v !== cells[i]) { ch.push([i, cells[i], v]); cells[i] = v; } }
  if (ch.length) commit(ch);
  draw();
  return ch.length;
}
const hasMemo = () => !!cells && cells.some(v => v === MFILL || v === MCROSS);
function setMode(m) {
  mode = m;
  $('tFill').setAttribute('aria-checked', m === 1);
  $('tCross').setAttribute('aria-checked', m === 2);
  $('tMemo').setAttribute('aria-checked', m === 3);
  updateUI();
}
function updateUI() {
  $('undoBtn').disabled = !undo.length || cleared;
  $('redoBtn').disabled = !redo.length || cleared;
  $('memoBar').hidden = !hasMemo() || cleared;
  const tb = $('timerBtn');
  tb.classList.toggle('hide-time', !store.settings.showTimer);
  tb.setAttribute('aria-label', paused ? '再開' : '一時停止');
}
$('tFill').onclick = () => setMode(1);
$('tCross').onclick = () => setMode(2);
$('tMemo').onclick = () => setMode(3);
$('undoBtn').onclick = doUndo;
$('redoBtn').onclick = doRedo;
$('memoOk').onclick = () => { const n = bulk(v => v === MFILL ? FILL : v === MCROSS ? CROSS : v); if (n) toast(`メモ ${n} マスを確定しました`); };
$('memoDel').onclick = () => { const n = bulk(v => (v === MFILL || v === MCROSS) ? EMPTY : v); if (n) toast(`メモ ${n} マスを消しました(戻すで元に戻せます)`); };
$('fitBtn').onclick = fitAll;

// ======================================================================
// 一時停止とタイマー
// ======================================================================
function togglePause(force) {
  if (!P || cleared) return;
  tickTimer();
  paused = force != null ? force : !paused;
  $('pauseCover').hidden = !paused;
  updateUI(); save();
}
$('timerBtn').onclick = () => togglePause();
$('pauseCover').onclick = () => togglePause(false);

function fmt(ms) {
  const s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, ss = s % 60;
  return (h ? h + ':' + String(m).padStart(2, '0') : String(m).padStart(2, '0')) + ':' + String(ss).padStart(2, '0');
}
function tickTimer() {
  const now = performance.now();
  if (P && !cleared && !paused && !document.hidden && $('busy').hidden) elapsed += Math.min(now - lastTick, 5000);
  lastTick = now;
}
function renderTimer() { $('timer').textContent = fmt(elapsed); }
setInterval(() => { tickTimer(); renderTimer(); }, 500);
setInterval(() => { if (P && !cleared && !paused) save(); }, 15000);
// 閉じる・隠す瞬間に保存する(スマホではここでしか確実に書けないことがある)
document.addEventListener('visibilitychange', () => { tickTimer(); if (document.hidden) save(); else lastTick = performance.now(); });
window.addEventListener('pagehide', save);

// ======================================================================
// ダイアログ
// ======================================================================
const dialogs = [...document.querySelectorAll('dialog')];
const anyDialogOpen = () => dialogs.some(d => d.open);
function closeDialogs() { for (const d of dialogs) if (d.open) d.close(); }
function openDlg(id) { closeDialogs(); const d = $(id); if (id === 'listDlg') renderList(); if (id === 'settingsDlg') renderSettings(); d.showModal(); }
for (const d of dialogs) {
  // 背景を押したら閉じる
  d.addEventListener('click', e => { if (e.target === d) d.close(); });
  d.addEventListener('close', () => { resetTwoStep(); if (d.id !== 'clearDlg') cv.focus({ preventScroll: true }); });
}
document.addEventListener('click', e => {
  const c = e.target.closest('[data-close]'); if (c) { c.closest('dialog').close(); return; }
  const o = e.target.closest('[data-open]'); if (o) openDlg(o.dataset.open);
});
$('menuBtn').onclick = () => openDlg('menuDlg');
$('titleBtn').onclick = () => openList();
function openList() { openDlg('listDlg'); }

// 誤って盤面を捨てないよう、壊す操作は2回押しにする
let armed = null;
function twoStep(btn, warnText, action) {
  if (armed && armed.btn === btn) { resetTwoStep(); action(); return; }
  resetTwoStep();
  armed = { btn, html: btn.innerHTML, timer: setTimeout(resetTwoStep, 3000) };
  btn.classList.add('warn'); btn.innerHTML = warnText;
}
function resetTwoStep() {
  if (!armed) return;
  clearTimeout(armed.timer); armed.btn.classList.remove('warn'); armed.btn.innerHTML = armed.html; armed = null;
}

$('resetBtn').onclick = () => {
  if (!P) return;
  const go = () => {
    if (cleared) { cleared = false; elapsed = 0; undo = []; redo = []; cells = Uint8Array.from(initialCells(P)); $('stamp').classList.remove('on'); recalc(); renderInfo(); updateUI(); draw(); save(); }
    else bulk(() => EMPTY);
    closeDialogs(); toast('全部消しました。戻すで元に戻せます');
  };
  if (!cleared && !cells.some((v, i) => v !== EMPTY && !fixed[i])) { closeDialogs(); return; }
  twoStep($('resetBtn'), '<b>もう一度押すと全部消します</b><span>戻すボタンで取り消せます</span>', go);
};
$('checkBtn').onclick = () => {
  if (!P || cleared) return;
  const wrong = new Set();
  for (let i = 0; i < cells.length; i++) {
    if ((cells[i] === FILL && P.sol[i] !== 1) || (cells[i] === CROSS && P.sol[i] === 1)) wrong.add(i);
  }
  closeDialogs();
  if (!wrong.size) { toast('今のところ間違いはありません(メモは見ていません)'); return; }
  flash = wrong; draw();
  toast(`間違いが ${wrong.size} マスあります`, 3500);
  setTimeout(() => { flash = null; draw(); }, 3500);
};

// ---------- 問題一覧 ----------
// 解いた問題だけ、文字の絵と名前を見せる(解く前に答えがわからないように)
function thumb(p) {
  const c = document.createElement('canvas'), s = Math.max(1, Math.floor(96 / Math.max(p.R, p.C)));
  c.width = p.C * s; c.height = p.R * s;
  const x = c.getContext('2d');
  x.fillStyle = colors.ink;
  for (let i = 0; i < p.sol.length; i++) if (p.sol[i]) x.fillRect((i % p.C) * s, Math.floor(i / p.C) * s, s, s);
  return c;
}
function progressOf(p) {
  const sl = store.slots[p.key];
  if (!sl || !sl.cells) return 0;
  let want = 0, got = 0;
  for (let i = 0; i < p.sol.length; i++) if (p.sol[i] && !p.givens[i]) { want++; if (sl.cells[i] === FILL) got++; }
  return want ? Math.min(1, got / want) : 0;
}
function renderList() {
  if (P) save();
  const f = store.filter || 'all';
  for (const b of document.querySelectorAll('#listFilter button')) {
    b.setAttribute('aria-checked', b.dataset.filter === f);
    b.onclick = () => { store.filter = b.dataset.filter; save(); renderList(); };
  }
  const done = PUZZLES.filter(isDone).length;
  $('listCount').textContent = `${done} / ${PUZZLES.length}`;
  const box = $('cards');
  box.innerHTML = '';
  const list = PUZZLES.filter(p => f === 'all' || (f === 'done') === isDone(p));
  if (!list.length) { const n = document.createElement('p'); n.className = 'empty-note'; n.textContent = f === 'done' ? 'まだクリアした問題はありません' : 'すべてクリアしました'; box.appendChild(n); }
  for (const p of list) {
    const ok = isDone(p);
    const b = document.createElement('button');
    b.className = 'card' + (P === p ? ' cur' : '');
    b.setAttribute('aria-label', `No.${p.no} ${p.C}×${p.R} ${LEVELS[p.level]}` + (ok ? ` ${p.text}` : ''));
    const th = document.createElement('div'); th.className = 'thumb';
    if (ok) th.appendChild(thumb(p)); else { const q = document.createElement('span'); q.className = 'q'; q.textContent = '?'; th.appendChild(q); }
    const no = document.createElement('div'); no.className = 'no';
    no.innerHTML = `<span>No.${p.no}</span><span class="lv ${p.level}">${LEVELS[p.level]}</span>`;
    const nm = document.createElement('div'); nm.className = 'name';
    nm.textContent = ok ? p.text : `${p.C}×${p.R}・${KINDS[p.kind] || ''}`;
    b.append(th, no, nm);
    const pr = progressOf(p);
    if (!ok && pr > 0) { const bar = document.createElement('div'); bar.className = 'bar'; bar.innerHTML = `<i style="width:${Math.round(pr * 100)}%"></i>`; b.appendChild(bar); }
    b.onclick = () => { if (P === p) closeDialogs(); else openPuzzle(p.key); };
    box.appendChild(b);
  }
}
$('nextBtn').onclick = () => { const nx = nextTodo(); if (nx) openPuzzle(nx.key); else closeDialogs(); };
$('toListBtn').onclick = () => openList();

// ---------- 設定 ----------
function renderSettings() {
  const st = store.settings;
  for (const b of document.querySelectorAll('#themeChips button')) {
    b.setAttribute('aria-checked', b.dataset.theme === st.theme);
    b.onclick = () => { st.theme = b.dataset.theme; applySettings(); renderSettings(); save(); };
  }
  $('setRed').checked = st.redLines; $('setAuto').checked = st.autoCross;
  $('setHaptic').checked = st.haptics; $('setTimer').checked = st.showTimer; $('setLeft').checked = st.left;
}
$('setRed').onchange = e => { store.settings.redLines = e.target.checked; applySettings(); save(); };
$('setAuto').onchange = e => { store.settings.autoCross = e.target.checked; save(); };
$('setHaptic').onchange = e => { store.settings.haptics = e.target.checked; if (e.target.checked) buzz(15); save(); };
$('setTimer').onchange = e => { store.settings.showTimer = e.target.checked; updateUI(); save(); };
$('setLeft').onchange = e => { store.settings.left = e.target.checked; applySettings(); save(); };
function applySettings() {
  const st = store.settings;
  if (st.theme === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', st.theme);
  app.classList.toggle('left', !!st.left);
  readColors();
  if (P) { recalc(); updateUI(); draw(); }
}

// ---------- 引き継ぎ ----------
// 盤面と設定をひとつの文字列にする。圧縮できる環境では圧縮して短くする
async function packStore() {
  save();
  const data = JSON.stringify({ ...store, slots: Object.fromEntries(Object.entries(store.slots).map(([k, s]) => [k, { ...s, undo: [], redo: [] }])) });
  if (typeof CompressionStream !== 'undefined') {
    const buf = await new Response(new Blob([data]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer();
    return 'NONO1z:' + b64(new Uint8Array(buf));
  }
  return 'NONO1:' + b64(new TextEncoder().encode(data));
}
async function unpackStore(code) {
  code = code.replace(/\s+/g, '');
  const m = /^NONO1(z?):(.+)$/.exec(code);
  if (!m) throw new Error('format');
  const bytes = unb64(m[2]);
  let text;
  if (m[1]) text = await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text();
  else text = new TextDecoder().decode(bytes);
  const s = JSON.parse(text);
  if (!s || s.v !== 2 || typeof s.slots !== 'object') throw new Error('format');
  return s;
}
function b64(u8) { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); }
function unb64(s) { const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }
$('exportBtn').onclick = async () => {
  const ta = $('transferText');
  try {
    const code = await packStore();
    ta.value = code;
    try { await navigator.clipboard.writeText(code); $('transferMsg').textContent = `コピーしました(${code.length}文字)。メモ帳やメールに貼って、移したい端末へ送ってください。`; }
    catch { ta.focus(); ta.select(); $('transferMsg').textContent = 'コードを選択しました。長押しかCtrl+Cでコピーしてください。'; }
  } catch { $('transferMsg').textContent = 'コードを作れませんでした。'; }
};
$('importBtn').onclick = async () => {
  const code = $('transferText').value.trim();
  if (!code) { $('transferMsg').textContent = '先に引き継ぎコードを貼り付けてください。'; return; }
  let s;
  try { s = await unpackStore(code); }
  catch { $('transferMsg').textContent = 'コードを読めませんでした。途中で切れていないか確かめてください。'; return; }
  twoStep($('importBtn'), 'もう一度押すと、この端末の保存を置き換えます', () => {
    store = { v: 2, cur: null, slots: {}, best: {}, zoom: {}, filter: 'all', ...s, settings: { ...DEFAULTS, ...(s.settings || {}) } };
    applySettings();
    P = null;
    if (!openPuzzle(store.cur)) openPuzzle((nextTodo() || PUZZLES[0]).key);
    save(); closeDialogs(); toast('引き継ぎました');
    $('transferText').value = ''; $('transferMsg').textContent = '';
  });
};

// ======================================================================
// 小物
// ======================================================================
let toastTimer = 0;
function toast(text, ms = 2600, action) {
  const t = $('toast');
  t.textContent = text;
  if (action) { const b = document.createElement('button'); b.textContent = action.label; b.onclick = action.run; t.appendChild(b); }
  t.hidden = false;
  clearTimeout(toastTimer);
  if (ms) toastTimer = setTimeout(() => { t.hidden = true; }, ms);
}
function buzz(p) {
  if (!store.settings.haptics || !navigator.vibrate) return;
  try { navigator.vibrate(p); } catch {}
}

// ---------- テーマとサイズ変更 ----------
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { readColors(); draw(); });
let rz = 0;
const relayout = () => { cancelAnimationFrame(rz); rz = requestAnimationFrame(() => { if (P) { layout(); draw(); } }); };
window.addEventListener('resize', relayout);
if (window.ResizeObserver) new ResizeObserver(relayout).observe(stage);

// ---------- 更新の知らせ ----------
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  var wantReload = false;
  navigator.serviceWorker.register('sw.js').then(reg => {
    reg.addEventListener('updatefound', () => {
      const nw = reg.installing;
      nw && nw.addEventListener('statechange', () => {
        if (nw.state === 'installed' && navigator.serviceWorker.controller) {
          toast('新しい版があります', 0, { label: '更新する', run: () => { save(); wantReload = true; nw.postMessage('skipWaiting'); } });
        }
      });
    });
  }).catch(() => {});
  // 初回は clients.claim() でも controllerchange が来るので、「更新する」を押したときだけ読み直す
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (wantReload && !reloading) { reloading = true; save(); location.reload(); } });
}

// ======================================================================
// 起動
// ======================================================================
applySettings();
setMode(1);
(async () => {
  $('busy').hidden = false; $('busyText').textContent = '問題を読み込んでいます'; $('progBar').parentNode.hidden = true;
  try { await loadPuzzles(); }
  catch { $('busyText').textContent = '問題を読み込めませんでした。電波のある場所で開き直してください'; return; }
  $('busy').hidden = true;
  if (!openPuzzle(store.cur)) openPuzzle((PUZZLES.find(p => !isDone(p)) || PUZZLES[0]).key);
})();

// テスト用の入口(画面の動作確認スクリプトが使う)
window.__nono = { get PUZZLES() { return PUZZLES; }, open: (k) => openPuzzle(k), get P() { return P; }, get cells() { return cells; }, get L() { return L; }, get rowInfo() { return rowInfo; }, get zoom() { return zoom; }, store: () => store };
})();
