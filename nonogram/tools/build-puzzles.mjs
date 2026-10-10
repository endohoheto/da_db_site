// 言葉の一覧(data/words.json)から、文字の絵のノノグラムを作って puzzles.json に書き出す。
//
//   npm run build:puzzles
//
// 文字は Fusion Pixel Font(OFL)のドット文字で組む。ロゴや既存の書体の模倣はしない。
// 1語ごとに「文字の大きさ × 改行の位置」の候補を作り、
//   - 推論だけで最後まで埋まる(=答えが1つ)か
//   - 埋まらなければ、最初から見せるマス(ヒント)を最小限足す
// を調べて、読みやすく、ヒントが少なく、小さいものを選ぶ。
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const { makeClues, analyze, findSolutions } = require('../gen.js');

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const fontDist = path.join(root, 'node_modules/@vp-tw/cjk-web-fonts-fusion-pixel-font/dist');
// 32 マスまでを基本にし、それでも収まらない長い名前だけ 40 マスまで許す
const MAX_C = 32, MAX_R = 32, WIDE_C = 40, SIZES = [12, 10, 8];
const only = process.argv[2] || null;

// 手で選んだ言葉(words.json)と、DBから書き出した言葉(db-words.json、あれば)を合わせる。
// 同じ文字列は手で選んだほうを残す(改行位置の指定などを持っているため)
const read = (f) => { try { return JSON.parse(fs.readFileSync(path.join(root, 'data', f), 'utf8')).words || []; } catch { return []; } };
const seenText = new Set();
const words = [...read('words.json'), ...read('db-words.json')]
  .filter(w => w && w.text && !seenText.has(w.text) && seenText.add(w.text))
  .filter(w => !only || w.text === only);

// ---- 改行の候補 ----
// 英字は空白・点・ハイフンの後ろで、日本語は文字の間で切る。記号だけの行は作らない
function splits(text) {
  const out = new Set([text]);
  const chars = [...text];
  const cuts = [];
  for (let i = 1; i < chars.length; i++) {
    const a = chars[i - 1], b = chars[i];
    if (/[.\-・]/.test(b)) continue;                 // 記号を行頭に送らない
    if (a === ' ' || /[.\-・]/.test(a)) cuts.push(i);
    else if (!/[A-Za-z0-9]/.test(a) || !/[A-Za-z0-9]/.test(b)) cuts.push(i);  // 日本語の文字間
  }
  const line = (s) => s.trim();
  for (const i of cuts) out.add(line(chars.slice(0, i).join('')) + '\n' + line(chars.slice(i).join('')));
  for (const i of cuts) for (const j of cuts) if (j > i) out.add([chars.slice(0, i), chars.slice(i, j), chars.slice(j)].map(c => line(c.join(''))).join('\n'));
  return [...out].filter(s => s.split('\n').every(l => /[^\s.\-・]/.test(l)));
}

const browser = await chromium.launch({ args: ['--allow-file-access-from-files'], executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage();
const probe = path.join(fontDist, '_probe.html');
fs.writeFileSync(probe, '<html><head>' + SIZES.map(s => `<link rel="stylesheet" href="${s}px/proportional/ja/Fusion-Pixel-${s}px-Proportional-Japanese.css">`).join('') + '</head><body></body></html>');
await page.goto('file://' + probe);

// 1行を描いてドット列にする。10倍で描いて各ドットの中心を読むと、にじみなしで元のドットが取れる
async function renderLines(lines, size) {
  return page.evaluate(async ([lines, size]) => {
    const S = 10, fam = `"Fusion Pixel ${size}px Proportional Japanese"`;
    await document.fonts.load(`${size * S}px ${fam}`, lines.join(''));
    return lines.map(t => {
      const c = document.createElement('canvas'), x = c.getContext('2d');
      x.font = `${size * S}px ${fam}`;
      const m = x.measureText(t), w = Math.ceil(m.width / S) + 2, h = size + 4;
      c.width = w * S; c.height = h * S;
      x.font = `${size * S}px ${fam}`; x.textBaseline = 'alphabetic';
      x.fillText(t, S, (Math.round(m.fontBoundingBoxAscent / S) + 1) * S);
      const d = x.getImageData(0, 0, c.width, c.height).data, rows = [];
      for (let y = 0; y < h; y++) { const r = []; for (let i = 0; i < w; i++) r.push(d[((y * S + 5) * c.width + i * S + 5) * 4 + 3] > 127 ? 1 : 0); rows.push(r); }
      return rows;
    });
  }, [lines, size]);
}

function trim(rows) {
  const H = rows.length, W = rows[0].length;
  let t = 0, b = H - 1, l = 0, r = W - 1;
  while (t <= b && rows[t].every(v => !v)) t++;
  while (b >= t && rows[b].every(v => !v)) b--;
  while (l <= r && rows.every(row => !row[l])) l++;
  while (r >= l && rows.every(row => !row[r])) r--;
  if (t > b) return [];
  return rows.slice(t, b + 1).map(row => row.slice(l, r + 1));
}

// 行を中央揃えで縦に積む。外側の余白は付けない(全部0の行と列は手間が増えるだけなので)
function compose(lineRows, size) {
  const lines = lineRows.map(trim).filter(r => r.length);
  const gap = Math.max(1, Math.round(size / 5));
  const W = Math.max(...lines.map(r => r[0].length));
  const out = [];
  lines.forEach((r, i) => {
    if (i) for (let k = 0; k < gap; k++) out.push(new Array(W).fill(0));
    const off = Math.floor((W - r[0].length) / 2);
    for (const row of r) { const o = new Array(W).fill(0); row.forEach((v, j) => { o[off + j] = v; }); out.push(o); }
  });
  return out;
}

// 推論で埋まらないときは、最初から見せるマス(ヒント)を足す。
// 候補のうち「見せたら推論でいちばん多く埋まる」マスを1つずつ選ぶ(少ないヒントで済ませるため)
function solveWithGivens(sol, R, C) {
  const { rc, cc } = makeClues(sol, R, C);
  const givens = {};
  for (let round = 0; round < 40; round++) {
    const a = analyze(rc, cc, R, C, givens, Date.now() + 8000);
    if (a.level) return { rc, cc, level: Object.keys(givens).length ? 'oni' : a.level, probes: a.probes, givens };
    const unk = []; for (let i = 0; i < a.grid.length; i++) if (a.grid[i] === -1) unk.push(i);
    if (!unk.length) return null;
    // 2つの解で食い違うマスがあれば、そこから選ぶ(答えを1つに絞るのに必ず要る場所)
    const f = findSolutions(rc, cc, R, C, a.grid, 2, Date.now() + 3000);
    let pool = unk;
    if (f.sols.length >= 2) { const [x, y] = f.sols; pool = unk.filter(i => x[i] !== y[i]); }
    const step = Math.max(1, Math.floor(pool.length / 48));
    let best = -1, bestKnown = -1;
    for (let k = 0; k < pool.length; k += step) {
      const i = pool[k], g2 = { ...givens, [i]: sol[i] };
      const t = analyze(rc, cc, R, C, g2, Date.now() + 1500);
      if (t.level) { best = i; bestKnown = Infinity; break; }
      let known = 0; for (const v of t.grid) if (v !== -1) known++;
      if (known > bestKnown) { bestKnown = known; best = i; }
    }
    givens[best] = sol[best];
  }
  return null;
}

// 太字: 各ドットを右に1つ太らせる。細い線の文字は答えが1つに絞れないことが多いので、候補に加える
function embolden(rows) { return rows.map(r => r.map((v, i) => (v || (i > 0 && r[i - 1]) ? 1 : 0))); }

const results = [];
for (const w of words) {
  const cands = [];
  for (const size of SIZES) {
    for (const s of (w.layout ? [w.layout] : splits(w.text))) {
      const lines = s.split('\n');
      const raw = await renderLines(lines, size);
      for (const bold of [false, true]) {
        const grid = compose(bold ? raw.map(embolden) : raw, size);
        const R = grid.length, C = grid[0].length;
        if (R > MAX_R || C > WIDE_C || R < 5 || C < 5) continue;
        cands.push({ size, bold, text: s, grid, R, C, wide: C > MAX_C });
      }
    }
  }
  // 読みやすさ(大きい文字・少ない行)を優先し、その中で盤面が小さく正方形に近いもの
  // 行の長さがそろっているほどよい(「コ / タニキ / ンヤ.」より「コタニ / キンヤ.」)
  const balance = t => { const ls = t.split('\n').map(l => [...l].length), avg = ls.reduce((a, b) => a + b, 0) / ls.length; return ls.reduce((a, l) => a + Math.abs(l - avg), 0) + ls.filter(l => l === 1).length * 4; };
  const score = c => -c.size * 10 + (c.bold ? 3 : 0) + c.text.split('\n').length * 6 + balance(c.text) * 4 + Math.max(c.R, c.C) * 0.6 + Math.abs(c.R - c.C) * 0.15 + (c.wide ? 40 : 0);
  cands.sort((a, b) => score(a) - score(b));
  let best = null;
  for (const c of cands.slice(0, 10)) {
    const sol = c.grid.flat();
    const res = solveWithGivens(sol, c.R, c.C);
    if (!res) continue;
    const ng = Object.keys(res.givens).length;
    const total = score(c) + ng * 4;
    if (!best || total < best.total) best = { ...c, ...res, sol, total, ng };
    if (ng === 0) break;
  }
  if (!best) { console.log(`× ${w.text}: 盤面に収まらないか、解ける形にできませんでした`); continue; }
  results.push({
    id: results.length + 1, text: w.text, kind: w.kind, artist: w.artist || '', layout: best.text,
    R: best.R, C: best.C, rc: best.rc, cc: best.cc, sol: best.sol.join(''), level: best.level, givens: best.givens,
  });
  console.log(`○ ${w.text.padEnd(16)} ${best.size}px${best.bold ? 'B' : ' '} ${String(best.C).padStart(2)}×${String(best.R).padEnd(2)} ${best.level}${best.ng ? ' ヒント' + best.ng : ''}${best.probes ? ' 仮置き' + best.probes : ''}  [${best.text.replace(/\n/g, ' / ')}]`);
  if (only) console.log(best.grid.map(r => r.map(v => v ? '#' : '.').join('')).join('\n'));
}
await browser.close();
fs.unlinkSync(probe);
if (!only) {
  // 小さく易しいものから並べる
  results.sort((a, b) => (a.level === b.level ? 0 : a.level === 'std' ? -1 : 1) || a.R * a.C - b.R * b.C);
  results.forEach((r, i) => { r.id = i + 1; });
  fs.writeFileSync(path.join(root, 'puzzles.json'), JSON.stringify({ version: 1, puzzles: results }));
  console.log(`\n${results.length} 問を puzzles.json に書き出しました`);
}
