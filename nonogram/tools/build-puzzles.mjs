// 言葉の一覧(data/words.json と data/db-words.json)から、文字の絵のノノグラムを作って puzzles.json に書き出す。
//
//   npm run build:puzzles                 全部作り直す
//   npm run build:puzzles -- "浅倉大介"     1語だけ試して絵を表示(puzzles.json は書かない)
//
// 文字は DotGothic16(OFL)の16ドットで組む。ロゴや既存の書体の模倣はしない。
// 1語ごとに「改行の位置 × 文字ごとの上下のずらし方」の候補を作り、
//   - 推論だけで最後まで埋まる(=答えが1つ)か、どれだけ仮置きが要るか
//   - 埋まらなければ、最初から見せるマス(ヒント)を最小限足す
// を調べて、ヒントがなく、仮置きが多く(難しく)、盤面が小さいものを選ぶ。
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const { makeClues, analyze, findSolutions, lineSolve } = require('../gen.js');

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const fontDir = path.join(root, 'node_modules/@fontsource/dotgothic16');
// 50マスまでを基本にし、収まらない長い名前だけ横64マスまで許す
const SIZE = 16, MAX = 50, WIDE = 64;
const only = process.argv[2] || null;

// 手で選んだ言葉と、DBから書き出した言葉を合わせる。同じ文字列は手で選んだほうを残す
const read = (f) => { try { return JSON.parse(fs.readFileSync(path.join(root, 'data', f), 'utf8')).words || []; } catch { return []; } };
const seenText = new Set();
const words = [...read('words.json'), ...read('db-words.json')]
  .filter(w => w && w.text && !seenText.has(w.text) && seenText.add(w.text))
  .filter(w => !only || w.text === only);

// ---- 改行の候補 ----
// 英字は空白・点・ハイフンの後ろで、日本語は文字の間で切る。記号を行頭に送らない
function splits(text) {
  const out = new Set([text]);
  const chars = [...text], cuts = [];
  for (let i = 1; i < chars.length; i++) {
    const a = chars[i - 1], b = chars[i];
    if (/[.\-・ー]/.test(b)) continue;
    if (a === ' ' || /[.\-・]/.test(a)) cuts.push(i);
    else if (!/[A-Za-z0-9]/.test(a) || !/[A-Za-z0-9]/.test(b)) cuts.push(i);
  }
  const L = (c) => c.join('').trim();
  for (const i of cuts) out.add(L(chars.slice(0, i)) + '\n' + L(chars.slice(i)));
  for (const i of cuts) for (const j of cuts) if (j > i) out.add([chars.slice(0, i), chars.slice(i, j), chars.slice(j)].map(L).join('\n'));
  return [...out].filter(s => s.split('\n').every(l => /[^\s.\-・]/.test(l)));
}

// ---- 文字ごとの上下のずらし方 ----
// 文字の形は崩さず、並びだけを揺らす。揺れ幅は文字の高さの1/5まで(読めることを優先)
function* jitters(n, seedBase) {
  yield { name: 'flat', dy: new Array(n).fill(0) };
  for (const a of [2, 3]) {
    yield { name: `wave${a}`, dy: Array.from({ length: n }, (_, i) => Math.round(a * Math.sin(i * 1.3))) };
    yield { name: `zigzag${a}`, dy: Array.from({ length: n }, (_, i) => (i % 2 ? 1 : -1) * Math.ceil(a / 2)) };
    yield { name: `stair${a}`, dy: Array.from({ length: n }, (_, i) => Math.round((i / Math.max(1, n - 1) - 0.5) * a * 2)) };
  }
  // 再現できるように、言葉ごとに決まった乱数で揺らす
  let s = seedBase >>> 0;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  for (let k = 0; k < 4; k++) yield { name: `rand${k}`, dy: Array.from({ length: n }, () => Math.round((rnd() * 2 - 1) * 3)) };
}
const hash = (t) => { let h = 2166136261; for (const ch of t) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };

const browser = await chromium.launch({ args: ['--allow-file-access-from-files'], executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage();
const probe = path.join(fontDir, '_probe.html');
fs.writeFileSync(probe, '<html><head><link rel="stylesheet" href="index.css"></head><body></body></html>');
await page.goto('file://' + probe);

// 1文字ずつ描いてドット列にする。10倍で描いて各ドットの中心を読み、にじみなしで元のドットを取る。
// DotGothic16 は横に 0.8 ドットずらすとドットの格子がぴったり重なる(測った値)
const glyphCache = new Map();
async function glyphs(chars) {
  const need = [...new Set(chars)].filter(c => !glyphCache.has(c));
  if (need.length) {
    const res = await page.evaluate(async ([need, size]) => {
      const S = 10, fam = '"DotGothic16"';
      await document.fonts.load(`${size * S}px ${fam}`, need.join(''));
      return need.map(ch => {
        const c = document.createElement('canvas'), x = c.getContext('2d');
        x.font = `${size * S}px ${fam}`;
        const adv = Math.round(x.measureText(ch).width / S);
        const w = adv + 2, h = size + 2;
        c.width = w * S; c.height = h * S;
        x.font = `${size * S}px ${fam}`; x.textBaseline = 'alphabetic';
        x.fillText(ch, 8, (size - 2) * S);
        const d = x.getImageData(0, 0, c.width, c.height).data, rows = [];
        for (let y = 0; y < h; y++) { const r = []; for (let i = 0; i < w; i++) r.push(d[((y * S + 5) * c.width + i * S + 5) * 4 + 3] > 127 ? 1 : 0); rows.push(r); }
        return [ch, { adv, rows }];
      });
    }, [need, SIZE]);
    for (const [ch, g] of res) glyphCache.set(ch, g);
  }
  return chars.map(c => glyphCache.get(c));
}

// 1行を、文字ごとに上下へずらしながら並べる
function setLine(gs, dys) {
  const A = 4, H = SIZE + 2 + A * 2;
  let W = 0; for (const g of gs) W += g.adv;
  W += 4;
  const out = Array.from({ length: H }, () => new Array(W).fill(0));
  let x = 0;
  gs.forEach((g, i) => {
    const dy = dys[i] || 0;
    g.rows.forEach((row, y) => row.forEach((v, j) => { if (v) { const yy = y + A + dy, xx = x + j; if (yy >= 0 && yy < H && xx < W) out[yy][xx] = 1; } }));
    x += g.adv;
  });
  return out;
}
function trim(rows) {
  let t = 0, b = rows.length - 1, l = 0, r = rows[0].length - 1;
  while (t <= b && rows[t].every(v => !v)) t++;
  while (b >= t && rows[b].every(v => !v)) b--;
  while (l <= r && rows.every(row => !row[l])) l++;
  while (r >= l && rows.every(row => !row[r])) r--;
  return t > b ? [] : rows.slice(t, b + 1).map(row => row.slice(l, r + 1));
}
// 行を中央揃えで縦に積む。外側の余白は付けない
function stack(lines) {
  lines = lines.map(trim).filter(r => r.length);
  const W = Math.max(...lines.map(r => r[0].length)), out = [];
  lines.forEach((r, i) => {
    if (i) out.push(new Array(W).fill(0), new Array(W).fill(0));
    const off = Math.floor((W - r[0].length) / 2);
    for (const row of r) { const o = new Array(W).fill(0); row.forEach((v, j) => { o[off + j] = v; }); out.push(o); }
  });
  return out;
}

// 推論で埋まらないときは、最初から見せるマス(ヒント)を足す。
// 未確定のマスから「見せたら行と列の理詰めでいちばん多く埋まる」ものを1つずつ選ぶ。
// 採点は速い理詰めだけで行い、仮置きまで含めた判定は1手ごとに1回だけ
function solveWithGivens(sol, R, C, maxGivens) {
  const { rc, cc } = makeClues(sol, R, C);
  const givens = {};
  for (let round = 0; round <= maxGivens; round++) {
    const a = analyze(rc, cc, R, C, givens, Date.now() + 15000);
    if (a.level) return { rc, cc, level: a.level, probes: a.probes || 0, rounds: a.rounds || 0, givens };
    if (process.env.DEBUG) { let u = 0; for (const v of a.grid) if (v === -1) u++; console.log("   round", round, "unknown", u, a.timeout ? "timeout" : "", a.contradiction ? "contra" : ""); }
    if (round === maxGivens || a.timeout) return null;
    const unk = []; for (let i = 0; i < a.grid.length; i++) if (a.grid[i] === -1) unk.push(i);
    if (!unk.length) return null;
    const step = Math.max(1, Math.floor(unk.length / 80));
    let best = -1, bestKnown = -1;
    for (let k = 0; k < unk.length; k += step) {
      const i = unk[k], g = Int8Array.from(a.grid); g[i] = sol[i];
      const t = lineSolve(rc, cc, R, C, g);
      if (!t) continue;
      let known = 0; for (const v of t) if (v !== -1) known++;
      if (known > bestKnown) { bestKnown = known; best = i; }
    }
    givens[best] = sol[best];
  }
  return null;
}

const balance = t => { const ls = t.split('\n').map(l => [...l].length), avg = ls.reduce((a, b) => a + b, 0) / ls.length; return ls.reduce((a, l) => a + Math.abs(l - avg), 0) + ls.filter(l => l === 1).length * 4; };

const results = [];
for (const w of words) {
  const layouts = (w.layout ? [w.layout] : splits(w.text));
  // 見た目の候補(改行 × ずらし方)を作り、読みやすさで並べる
  const looks = [];
  for (const lay of layouts) {
    const lines = lay.split('\n');
    const gls = await Promise.all(lines.map(l => glyphs([...l])));
    const total = lines.reduce((a, l) => a + [...l].length, 0);
    for (const j of jitters(total, hash(w.text))) {
      let k = 0;
      const ink = stack(gls.map(gs => setLine(gs, gs.map(() => j.dy[k++]))));
      // 文字そのものを塗る形と、黒地に文字を白く抜く形(白抜き)を作る。
      // 16ドットの漢字は線が細かく、塗る形では数字からほとんど推理できない。白抜きにすると手がかりが増える
      const W = ink[0].length;
      const styles = {
        ink,
        inv: [new Array(W + 2).fill(0), ...ink.map(r => [0, ...r, 0]), new Array(W + 2).fill(0)].map(r => r.map(v => 1 - v)),
        invTight: ink.map(r => r.map(v => 1 - v)),
      };
      for (const [style, grid] of Object.entries(styles)) {
        const R = grid.length, C = grid[0].length;
        if (R > MAX || C > WIDE || R < 5 || C < 5) continue;
        // 上下にずらさない並びは、文字の形から答えを先読みしやすいので後回しにする
        // 余白なしの白抜きは字が枠に接して読みにくいので、少し後回し
        looks.push({ lay, jit: j.name, style, grid, R, C, base: (style === 'invTight' ? 4 : 0) + lines.length * 8 + balance(lay) * 5 + Math.max(R, C) * 0.5 + Math.abs(R - C) * 0.2 + (j.name === 'flat' ? 6 : 0) + (C > MAX ? 40 : 0) });
      }
    }
  }
  looks.sort((a, b) => a.base - b.base);
  if (process.env.DEBUG) console.log("looks", looks.length, looks.slice(0, 3).map(l => [l.lay, l.jit, l.C, l.R]));
  // 読みやすい改行を上位2つまでに絞り、その中でずらし方を全部試す
  const lays = [...new Set(looks.map(l => l.lay))].slice(0, 2);
  let best = null;
  for (const c of looks.filter(l => lays.includes(l.lay))) {
    const sol = c.grid.flat();
    const res = solveWithGivens(sol, c.R, c.C, c.style === 'ink' ? +(process.env.MAXG || 12) : 0);
    if (process.env.DEBUG) console.log(c.style, c.jit, c.C, c.R, res && [res.level, Object.keys(res.givens).length, res.probes]);
    if (!res) continue;
    const ng = Object.keys(res.givens).length;
    // 難しさ優先: ヒントなしの鬼 > ヒントなしの標準 > ヒントあり。鬼の中では仮置きが多いほど上
    // 標準の中では、理詰めの往復回数(手数)が多いものほど難しいので上に
    const total = c.base + ng * +(process.env.HINT_COST || 30) + (res.level === 'oni' ? -20 - Math.min(res.probes, 60) * 0.5 : -Math.min(res.rounds, 60) * 0.3);
    if (!best || total < best.total) best = { ...c, ...res, sol, total, ng };
  }
  if (!best) { console.log(`× ${w.text}: 盤面に収まらないか、解ける形にできませんでした`); continue; }
  results.push({
    text: w.text, kind: w.kind, artist: w.artist || '', layout: best.lay, style: best.style,
    R: best.R, C: best.C, rc: best.rc, cc: best.cc, sol: best.sol.join(''), level: best.level, givens: best.givens,
    effort: best.level === 'oni' ? 100 + best.probes : best.rounds,
  });
  console.log(`○ ${w.text.padEnd(16)} ${String(best.C).padStart(2)}×${String(best.R).padEnd(2)} ${best.level}${best.ng ? ' ヒント' + best.ng : ''}${best.probes ? ' 仮置き' + best.probes : ' 手数' + best.rounds}  [${best.lay.replace(/\n/g, ' / ')}] ${best.style} ${best.jit}`);
  if (only) console.log(best.grid.map(r => r.map(v => v ? '#' : '.').join('')).join('\n'));
}
await browser.close();
fs.unlinkSync(probe);
if (!only) {
  // 標準から鬼へ、同じ難しさの中では小さいものから並べる
  results.sort((a, b) => (a.level === b.level ? 0 : a.level === 'std' ? -1 : 1) || a.R * a.C - b.R * b.C);
  results.forEach((r, i) => { r.id = i + 1; });
  fs.writeFileSync(path.join(root, process.env.OUT || 'puzzles.json'), JSON.stringify({ version: 2, puzzles: results }));
  console.log(`\n${results.length} 問を puzzles.json に書き出しました`);
}
