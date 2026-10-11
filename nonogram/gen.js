// 問題生成。行・列ごとの論理だけで解けるか、さらに「仮置きして矛盾を探す」まで要るかで難易度を分ける。
// どちらも推論だけで最後まで埋まった盤面しか採用しないので、答えは必ず1つになる。
const FB = new Uint8Array(1024), BB = new Uint8Array(1024);
const DIFF = new Int16Array(64), ZP = new Int16Array(64), CE = new Uint8Array(64);
const LINE = new Int8Array(64), OUT = new Int8Array(64);

function solveLine(line, n, clue, out) {
  const k = clue.length, W = k + 1, sz = (n + 1) * W;
  ZP[0] = 0;
  for (let i = 0; i < n; i++) ZP[i + 1] = ZP[i] + (line[i] === 0 ? 1 : 0);
  FB.fill(0, 0, sz); BB.fill(0, 0, sz);
  FB[0] = 1;
  for (let i = 0; i < n; i++) {
    const ce = line[i] !== 1;
    for (let j = 0; j <= k; j++) {
      if (!FB[i * W + j]) continue;
      if (ce) FB[(i + 1) * W + j] = 1;
      if (j < k) {
        const e = i + clue[j];
        if (e <= n && ZP[e] === ZP[i]) {
          if (e === n) FB[n * W + j + 1] = 1;
          else if (line[e] !== 1) FB[(e + 1) * W + j + 1] = 1;
        }
      }
    }
  }
  if (!FB[n * W + k]) return false;
  BB[n * W + k] = 1;
  for (let i = n - 1; i >= 0; i--) {
    const ce = line[i] !== 1;
    for (let j = k; j >= 0; j--) {
      let v = ce && BB[(i + 1) * W + j] === 1;
      if (!v && j < k) {
        const e = i + clue[j];
        if (e <= n && ZP[e] === ZP[i]) v = e === n ? j + 1 === k : (line[e] !== 1 && BB[(e + 1) * W + j + 1] === 1);
      }
      BB[i * W + j] = v ? 1 : 0;
    }
  }
  DIFF.fill(0, 0, n + 1);
  for (let i = 0; i < n; i++) {
    CE[i] = 0;
    if (line[i] !== 1) for (let j = 0; j <= k; j++) if (FB[i * W + j] && BB[(i + 1) * W + j]) { CE[i] = 1; break; }
  }
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < k; j++) {
      if (!FB[i * W + j]) continue;
      const e = i + clue[j];
      if (e > n || ZP[e] !== ZP[i]) continue;
      const ok = e === n ? j + 1 === k : (line[e] !== 1 && BB[(e + 1) * W + j + 1] === 1);
      // ブロック直後の区切りマスは遷移で飛ばしているので、ここで「空白になりうる」と記録する
      if (ok) { DIFF[i]++; DIFF[e]--; if (e < n) CE[e] = 1; }
    }
  }
  let cov = 0;
  for (let i = 0; i < n; i++) {
    cov += DIFF[i];
    const f = cov > 0, e = CE[i] === 1;
    if (!f && !e) return false;
    out[i] = f && !e ? 1 : e && !f ? 0 : -1;
  }
  return true;
}

// 戻り値: 回したラウンド数(難しさの目安)。矛盾なら -1
function propagate(g, R, C, rc, cc, rd, cd) {
  let rounds = 0, any = true;
  while (any) {
    any = false; rounds++;
    for (let r = 0; r < R; r++) {
      if (!rd[r]) continue;
      rd[r] = 0; any = true;
      for (let c = 0; c < C; c++) LINE[c] = g[r * C + c];
      if (!solveLine(LINE, C, rc[r], OUT)) return -1;
      for (let c = 0; c < C; c++) if (LINE[c] === -1 && OUT[c] !== -1) { g[r * C + c] = OUT[c]; cd[c] = 1; }
    }
    for (let c = 0; c < C; c++) {
      if (!cd[c]) continue;
      cd[c] = 0; any = true;
      for (let r = 0; r < R; r++) LINE[r] = g[r * C + c];
      if (!solveLine(LINE, R, cc[c], OUT)) return -1;
      for (let r = 0; r < R; r++) if (LINE[r] === -1 && OUT[r] !== -1) { g[r * C + c] = OUT[r]; rd[r] = 1; }
    }
  }
  return rounds;
}

function probe(g, R, C, rc, cc, deadline) {
  const N = R * C, g2 = new Int8Array(N), rd = new Uint8Array(R), cd = new Uint8Array(C);
  let probes = 0, prog = true;
  while (prog) {
    prog = false;
    for (let p = 0; p < N; p++) {
      if (g[p] !== -1) continue;
      const r = (p / C) | 0, c = p % C;
      for (let v = 1; v >= 0; v--) {
        g2.set(g); g2[p] = v;
        rd.fill(0); cd.fill(0); rd[r] = 1; cd[c] = 1;
        if (propagate(g2, R, C, rc, cc, rd, cd) < 0) {
          g[p] = 1 - v;
          rd.fill(0); cd.fill(0); rd[r] = 1; cd[c] = 1;
          if (propagate(g, R, C, rc, cc, rd, cd) < 0) return -1;
          probes++; prog = true;
          break;
        }
      }
      if ((p & 15) === 0 && Date.now() > deadline) return -2;
    }
  }
  return probes;
}

function makeClues(grid, R, C) {
  const rc = [], cc = [];
  for (let r = 0; r < R; r++) {
    const a = []; let run = 0;
    for (let c = 0; c < C; c++) { if (grid[r * C + c]) run++; else if (run) { a.push(run); run = 0; } }
    if (run) a.push(run);
    rc.push(a);
  }
  for (let c = 0; c < C; c++) {
    const a = []; let run = 0;
    for (let r = 0; r < R; r++) { if (grid[r * C + c]) run++; else if (run) { a.push(run); run = 0; } }
    if (run) a.push(run);
    cc.push(a);
  }
  return { rc, cc };
}

function unknowns(g) { const u = []; for (let i = 0; i < g.length; i++) if (g[i] === -1) u.push(i); return u; }

function generate(size, level, progress) {
  const R = size, C = size, N = R * C, oni = level === 'oni';
  const t0 = Date.now();
  const budget = oni ? (size <= 10 ? 1200 : size <= 15 ? 2500 : size <= 20 ? 4000 : 6000) : (size <= 15 ? 600 : 1200);
  const hardStop = t0 + budget * 5;
  let best = null, tries = 0;
  while (true) {
    tries++;
    const d = oni ? 0.5 + Math.random() * 0.08 : 0.54 + Math.random() * 0.08;
    const grid = new Uint8Array(N);
    for (let i = 0; i < N; i++) grid[i] = Math.random() < d ? 1 : 0;
    for (let m = 0; m < N; m++) {
      const { rc, cc } = makeClues(grid, R, C);
      const g = new Int8Array(N).fill(-1);
      const rounds = propagate(g, R, C, rc, cc, new Uint8Array(R).fill(1), new Uint8Array(C).fill(1));
      let u = unknowns(g);
      if (u.length === 0) {
        if (!oni && (!best || rounds > best.score)) best = { rc, cc, sol: Array.from(grid), score: rounds };
        break; // 鬼にとっては易しすぎる
      }
      if (oni) {
        const pr = probe(g, R, C, rc, cc, Math.max(hardStop, t0 + budget * 2));
        if (pr === -2) break;
        u = unknowns(g);
        if (u.length === 0) {
          if (!best || pr > best.score) best = { rc, cc, sol: Array.from(grid), score: pr };
          break;
        }
      }
      // 解けないまま残ったマスを1つ反転すると、答えが1つに絞られていくことが多い
      const p = u[(Math.random() * u.length) | 0];
      grid[p] ^= 1;
    }
    const el = Date.now() - t0;
    if (best && el > budget) break;
    if (Date.now() > hardStop && best) break;
    if (progress) progress(Math.min(0.95, el / budget), !!best);
  }
  best.tries = tries; best.ms = Date.now() - t0;
  return best;
}

// 文字の絵のように、こちらで決めた答えを持つ問題の解きやすさを調べる。
// givens は最初から見せるマス(index → 0/1)。戻り値の level:
//   'std' 行と列の理詰めだけで解ける / 'oni' 仮置きが要る / null 推論だけでは解けない
function analyze(rc, cc, R, C, givens, deadline) {
  const N = R * C, g = new Int8Array(N).fill(-1);
  if (givens) for (const k in givens) g[+k] = givens[k];
  const rounds = propagate(g, R, C, rc, cc, new Uint8Array(R).fill(1), new Uint8Array(C).fill(1));
  if (rounds < 0) return { level: null, contradiction: true, grid: g };
  if (g.indexOf(-1) < 0) return { level: 'std', probes: 0, rounds, grid: g };
  const pr = probe(g, R, C, rc, cc, deadline || Date.now() + 5000);
  if (pr < 0) return { level: null, timeout: pr === -2, grid: g };
  return { level: g.indexOf(-1) < 0 ? 'oni' : null, probes: pr, grid: g };
}

// 行と列の理詰めだけで埋められるところまで埋める(仮置きはしない)。矛盾したら null
function lineSolve(rc, cc, R, C, start) {
  const g = Int8Array.from(start);
  return propagate(g, R, C, rc, cc, new Uint8Array(R).fill(1), new Uint8Array(C).fill(1)) < 0 ? null : g;
}

// 解を最大 limit 個まで探す(推論で詰まったら分岐)。答えが1つかの確認と、ヒントのマス選びに使う
function findSolutions(rc, cc, R, C, start, limit, deadline) {
  const sols = [];
  let timedOut = false;
  function rec(g) {
    if (sols.length >= limit) return;
    if (Date.now() > deadline) { timedOut = true; return; }
    if (propagate(g, R, C, rc, cc, new Uint8Array(R).fill(1), new Uint8Array(C).fill(1)) < 0) return;
    const p = g.indexOf(-1);
    if (p < 0) { sols.push(g.slice()); return; }
    for (const v of [1, 0]) { const h = g.slice(); h[p] = v; rec(h); if (sols.length >= limit || timedOut) return; }
  }
  rec(Int8Array.from(start));
  return { sols, timedOut };
}

// 行の現在の状態(1=塗り, 0=空白確定, -1=未定)が、数字と矛盾していないか
const LINE_IN = new Int8Array(64), LINE_OUT = new Int8Array(64);
function lineOk(values, clue) {
  const n = values.length;
  for (let i = 0; i < n; i++) LINE_IN[i] = values[i];
  return solveLine(LINE_IN, n, clue, LINE_OUT);
}

const api = { generate, solveLine, makeClues, lineOk, analyze, findSolutions, lineSolve };
if (typeof module !== 'undefined' && module.exports) {
  module.exports = api;
} else if (typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope) {
  self.onmessage = (e) => {
    const { size, level, token } = e.data;
    const res = generate(size, level, (f) => self.postMessage({ type: 'progress', f, token }));
    self.postMessage({ type: 'done', token, res: { R: size, C: size, rc: res.rc, cc: res.cc, sol: res.sol } });
  };
} else {
  self.NonoSolver = api;
}
