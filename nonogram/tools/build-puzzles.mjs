// 言葉の一覧(data/words.json と data/db-words.json)から、文字の絵のノノグラムを作って puzzles.json に書き出す。
//
//   npm run build:puzzles                 全部作り直す
//   npm run build:puzzles -- "浅倉大介"     1語だけ試して絵を表示(puzzles.json は書かない)
//
// 文字は Noto Sans JP(OFL)の太字を、1文字24〜32マスで組む。ロゴや既存の書体の模倣はしない。
// 線が2〜4マスの太さになるので、字として読めて、しかも数字の手がかりが多い
// (16ドット以下の細い文字は、答えが1つに絞れないか、読めないかのどちらかだった)。
//
// 1語ごとに「文字の大きさ・太さ × 改行の位置(必ず2〜3行) × 文字ごとの上下のずらし方」の候補を作り、
//   - 推論だけで最後まで埋まる(=答えが1つ)か、どれだけ仮置きが要るか
//   - 埋まらなければ、最初から見せるマス(ヒント)を最小限足す
// を調べて、難しさ4段階(やさしい・ふつう・むずかしい・鬼)に振り分け、
// 改行やずらし方の違う問題を1語あたり最大7問残す。
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const { makeClues, analyze, lineSolve } = require('../gen.js');

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const fontDir = path.join(root, 'node_modules/@fontsource/noto-sans-jp');
const MAX = 64;                         // 盤面の縦横の上限
const FACES = [[28, 700], [28, 900], [24, 900], [32, 700], [20, 900]];   // [大きさ, 太さ] 試す順
const MAX_GIVENS = 6;
const only = process.argv[2] || null;

// 手で選んだ言葉と、DBから書き出した言葉を合わせる。同じ文字列は手で選んだほうを残す
const read = (f) => { try { return JSON.parse(fs.readFileSync(path.join(root, 'data', f), 'utf8')).words || []; } catch { return []; } };
const seenText = new Set();
const words = [...read('words.json'), ...read('db-words.json')]
  .filter(w => w && w.text && !seenText.has(w.text) && seenText.add(w.text))
  .filter(w => !only || w.text === only);

// ---- 改行の候補 ----
// 必ず2〜3行に組む(1行の並びは字の形を先読みしやすく、易しすぎる)。
// 空白・点・ハイフンの後ろを優先しつつ、英字の単語の途中でも切ってよい。記号を行頭に送らない
function splits(text) {
  const out = new Set();
  const chars = [...text], cuts = [];
  for (let i = 1; i < chars.length; i++) if (!/[.\-・ー\s]/.test(chars[i])) cuts.push(i);
  const L = (c) => c.join('').trim();
  for (const i of cuts) out.add(L(chars.slice(0, i)) + '\n' + L(chars.slice(i)));
  for (const i of cuts) for (const j of cuts) if (j > i) out.add([chars.slice(0, i), chars.slice(i, j), chars.slice(j)].map(L).join('\n'));
  // 長い名前は4行まで
  if (chars.length >= 7) for (const i of cuts) for (const j of cuts) for (const k of cuts) if (i < j && j < k) out.add([chars.slice(0, i), chars.slice(i, j), chars.slice(j, k), chars.slice(k)].map(L).join('\n'));
  return [...out].filter(s => s.split('\n').every(l => /[^\s.\-・]/.test(l)))
    .sort((a, b) => balance(a) - balance(b)).slice(0, 12);
}
// 切れ目が言葉の区切り(空白・点・ハイフン・文字の種類の変わり目)なら読みやすい
const naturalBreaks = t => t.split('\n').slice(0, -1).reduce((n, l, i, a) => { const prev = l.slice(-1), next = t.split('\n')[i + 1][0]; return n + (/[\s.\-・]/.test(prev) || /[A-Za-z]/.test(prev) !== /[A-Za-z]/.test(next) || /[^A-Za-z]/.test(prev) ? 1 : 0); }, 0);
const balance = t => { const ls = t.split('\n').map(l => [...l].length), avg = ls.reduce((a, b) => a + b, 0) / ls.length; return ls.reduce((a, l) => a + Math.abs(l - avg), 0) + ls.filter(l => l === 1).length * 4; };

// ---- 文字ごとの上下のずらし方 ----
// 文字の形は崩さず、並びだけを揺らす。小さい揺れと大きい揺れの2段階
function* jitters(n, size, seedBase) {
  yield { name: 'flat', amp: 0, dy: new Array(n).fill(0) };
  for (const [tag, amp] of [['小', Math.max(2, Math.round(size / 10))], ['大', Math.max(3, Math.round(size / 5))]]) {
    yield { name: `波${tag}`, amp, dy: Array.from({ length: n }, (_, i) => Math.round(amp * Math.sin(i * 1.3))) };
    yield { name: `階段${tag}`, amp, dy: Array.from({ length: n }, (_, i) => Math.round((i / Math.max(1, n - 1) - 0.5) * amp * 2)) };
    yield { name: `ジグザグ${tag}`, amp, dy: Array.from({ length: n }, (_, i) => (i % 2 ? 1 : -1) * Math.round(amp * 0.7)) };
    let s = (seedBase ^ amp) >>> 0;     // 再現できるように、言葉ごとに決まった乱数で揺らす
    const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
    yield { name: `乱${tag}`, amp, dy: Array.from({ length: n }, () => Math.round((rnd() * 2 - 1) * amp)) };
  }
}
const hash = (t) => { let h = 2166136261; for (const ch of t) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };

const browser = await chromium.launch({ args: ['--allow-file-access-from-files'], executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage();
const probe = path.join(fontDir, '_probe.html');
fs.writeFileSync(probe, '<html><head><link rel="stylesheet" href="700.css"><link rel="stylesheet" href="900.css"></head><body></body></html>');
await page.goto('file://' + probe);

// 1文字ずつ8倍で描き、各マスの塗られている割合が半分を超えたら塗りにする
const glyphCache = new Map();
async function glyphs(chars, size, weight) {
  const key = (c) => `${size}/${weight}/${c}`;
  const need = [...new Set(chars)].filter(c => !glyphCache.has(key(c)));
  if (need.length) {
    const res = await page.evaluate(async ([need, size, weight]) => {
      const S = 8, fam = '"Noto Sans JP"';
      await document.fonts.load(`${weight} ${size * S}px ${fam}`, need.join(''));
      return need.map(ch => {
        const c = document.createElement('canvas'), x = c.getContext('2d');
        x.font = `${weight} ${size * S}px ${fam}`;
        const adv = Math.round(x.measureText(ch).width / S);
        const w = adv + 4, h = Math.ceil(size * 1.3);
        c.width = w * S; c.height = h * S;
        x.font = `${weight} ${size * S}px ${fam}`; x.textBaseline = 'alphabetic';
        x.fillText(ch, 2 * S, Math.round(size * 1.0) * S);
        const d = x.getImageData(0, 0, c.width, c.height).data, rows = [];
        for (let y = 0; y < h; y++) {
          const r = [];
          for (let i = 0; i < w; i++) {
            let a = 0;
            for (let yy = 0; yy < S; yy++) for (let xx = 0; xx < S; xx++) a += d[(((y * S + yy) * c.width) + i * S + xx) * 4 + 3];
            r.push(a / (S * S * 255) > 0.5 ? 1 : 0);
          }
          rows.push(r);
        }
        return [ch, { adv, rows }];
      });
    }, [need, size, weight]);
    for (const [ch, g] of res) glyphCache.set(key(ch), g);
  }
  return chars.map(c => glyphCache.get(key(c)));
}

// 1行を、文字ごとに上下へずらしながら並べる。字と字の間は少し空ける(太字がくっつかないように)
function setLine(gs, dys, size) {
  const A = Math.ceil(size / 6), gap = Math.max(1, Math.round(size / 14));
  const H = gs[0].rows.length + A * 2;
  let W = 4; for (const g of gs) W += g.adv + gap;
  const out = Array.from({ length: H }, () => new Array(W).fill(0));
  let x = 0;
  gs.forEach((g, i) => {
    const dy = dys[i] || 0;
    g.rows.forEach((row, y) => row.forEach((v, j) => { if (v) { const yy = y + A + dy, xx = x + j; if (yy >= 0 && yy < H && xx < W) out[yy][xx] = 1; } }));
    x += g.adv + gap;
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
function stack(lines, size) {
  lines = lines.map(trim).filter(r => r.length);
  const W = Math.max(...lines.map(r => r[0].length)), out = [], gap = Math.max(2, Math.round(size / 7));
  lines.forEach((r, i) => {
    if (i) for (let k = 0; k < gap; k++) out.push(new Array(W).fill(0));
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
    const a = analyze(rc, cc, R, C, givens, Date.now() + 20000);
    if (a.level) return { rc, cc, level: a.level, probes: a.probes || 0, rounds: a.rounds || 0, givens };
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

const results = [];
for (const w of words) {
  const layouts = (w.layout ? [w.layout] : splits(w.text));
  const looks = [];
  for (const [size, weight] of FACES) {
    for (const lay of layouts) {
      if (lay.split('\n').some(l => [...l].length * size * 0.5 > MAX * 1.2)) continue;
      const lines = lay.split('\n');
      const gls = await Promise.all(lines.map(l => glyphs([...l], size, weight)));
      const total = lines.reduce((a, l) => a + [...l].length, 0);
      for (const j of jitters(total, size, hash(w.text))) {
        let k = 0;
        const grid = stack(gls.map(gs => setLine(gs, gs.map(() => j.dy[k++]), size)), size);
        const R = grid.length, C = grid[0].length;
        if (R > MAX || C > MAX || R < 5 || C < 5) continue;
        // 読みやすさ: 大きい字・少ない行・そろった行・正方形に近い盤面。ずらさない並びは先読みしやすいので後回し
        looks.push({ size, weight, lay, jit: j.name, grid, R, C,
          base: -size * 0.8 + balance(lay) * 4 - naturalBreaks(lay) * 3 + Math.max(R, C) * 0.3 + Math.abs(R - C) * 0.15 });
      }
    }
  }
  looks.sort((a, b) => a.base - b.base);
  // 読みやすい改行を上位4つに絞り、改行・ずらし方・字の大きさがばらけるように順番に試す
  const lays = [...new Set(looks.map(l => l.lay))].slice(0, 4);
  const pool = looks.filter(l => lays.includes(l.lay));
  // 「改行×字の大きさ」の組ごとに、ずらし方を1つずつ順番に回す(同じ形ばかり試さないように)
  const groups = new Map();
  for (const c of pool) { const k = `${c.lay}|${c.size}|${c.weight}`; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(c); }
  const order = [], lists = [...groups.values()];
  for (let n = 0; lists.some(l => n < l.length); n++) for (const l of lists) if (n < l.length) order.push(l[n]);
  const done = [];
  for (const c of order.slice(0, +(process.env.TRIES || 36))) {
    const sol = c.grid.flat();
    const res = solveWithGivens(sol, c.R, c.C, MAX_GIVENS);
    if (process.env.DEBUG) console.log(' ', c.size, c.weight, c.jit, `${c.C}x${c.R}`, c.lay.replace(/\n/g, '/'), res && [res.level, Object.keys(res.givens).length, res.probes, res.rounds]);
    if (!res) continue;
    const ng = Object.keys(res.givens).length;
    // 難しさ4段階: 理詰めだけで少ない往復 → やさしい、多い往復 → ふつう、
    // 仮置きが要る(ヒントあり・仮置き少なめ)→ むずかしい、ヒントなしで仮置きが多い → 鬼
    const tier = res.level === 'std' ? (res.rounds <= 8 ? 'easy' : 'normal') : (ng === 0 && res.probes >= 25 ? 'oni' : 'hard');
    done.push({ ...c, ...res, sol, ng, tier });
  }
  // 段階ごとに、読みやすいものから、改行かずらし方が違うものを選ぶ(1語あたり最大 VARIANTS 問)
  const VARIANTS = +(process.env.VARIANTS || 7), pick = [];
  const tiers = ['easy', 'normal', 'hard', 'oni'];
  for (let round = 0; pick.length < VARIANTS && round < 3; round++)
    for (const t of tiers) {
      const c = done.filter(d => d.tier === t && !pick.includes(d))
        .sort((a, b) => a.base + a.ng * 4 - (b.base + b.ng * 4))
        .find(d => !pick.some(p => p.lay === d.lay && p.jit === d.jit));
      if (c && pick.length < VARIANTS) pick.push(c);
    }
  if (!pick.length) { console.log(`× ${w.text}: 盤面に収まらないか、解ける形にできませんでした`); continue; }
  pick.forEach((b, n) => {
    results.push({
      key: `${w.text}#${n + 1}`, text: w.text, kind: w.kind, artist: w.artist || '', layout: b.lay,
      R: b.R, C: b.C, rc: b.rc, cc: b.cc, sol: b.sol.join(''), solve: b.level, level: b.tier, givens: b.givens,
    });
    console.log(`○ ${w.text.padEnd(14)} ${String(b.C).padStart(2)}×${String(b.R).padEnd(2)} ${b.tier.padEnd(6)}${b.ng ? ' ヒント' + b.ng : ''}${b.probes ? ' 仮置き' + b.probes : ' 往復' + b.rounds}  [${b.lay.replace(/\n/g, ' / ')}] ${b.size}px/${b.weight} ${b.jit}`);
    if (only) console.log(b.grid.map(r => r.map(v => v ? '#' : '.').join('')).join('\n'));
  });
}
await browser.close();
fs.unlinkSync(probe);
if (!only) {
  // やさしい → 鬼 の順に、同じ難しさの中では小さいものから並べる
  const rank = { easy: 0, normal: 1, hard: 2, oni: 3 };
  results.sort((a, b) => rank[a.level] - rank[b.level] || a.R * a.C - b.R * b.C);
  results.forEach((r, i) => { r.id = i + 1; });
  fs.writeFileSync(path.join(root, process.env.OUT || 'puzzles.json'), JSON.stringify({ version: 3, puzzles: results }));
  console.log(`\n${results.length} 問を puzzles.json に書き出しました`);
}
