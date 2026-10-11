// 画面の動作確認。Playwright が入っている環境で: npm run e2e
// 盤面の操作・保存・引き継ぎ・オフライン起動を、スマホとPCの両方の大きさで確かめる
import { createRequire } from 'node:module';
import { serve } from './serve.mjs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const OUT = process.env.SHOTS || null;

let fails = 0;
const check = (cond, msg) => { console.log((cond ? '  ok  ' : '  NG  ') + msg); if (!cond) fails++; };

const server = await serve(8765);
const URL = 'http://localhost:8765/';
const browser = await chromium.launch();

async function open(opts) {
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(URL);
  await page.waitForFunction(() => window.__nono && window.__nono.P && document.getElementById('busy').hidden, null, { timeout: 30000 });
  // 最初は見せるマスのない問題で確かめる
  await page.evaluate(() => { const n = window.__nono; const p = n.PUZZLES.find(x => !Object.keys(x.givens).length && x.C >= 10 && x.R >= 10); n.open(p.key); });
  return { ctx, page, errors };
}
// 盤面上のマス(r,c)の中心の画面座標
async function cellPos(page, r, c) {
  return page.evaluate(([r, c]) => {
    const n = window.__nono, L = n.L, cv = document.getElementById('cv').getBoundingClientRect(), st = document.getElementById('stage');
    return { x: cv.left + L.left - st.scrollLeft + (c + 0.5) * L.cs, y: cv.top + L.top - st.scrollTop + (r + 0.5) * L.cs };
  }, [r, c]);
}
const count = (page, v) => page.evaluate(v => Array.from(window.__nono.cells).filter(x => x === v).length, v);

// ---------------- PC ----------------
console.log('PC 1280×860');
{
  const { ctx, page, errors } = await open({ viewport: { width: 1280, height: 860 } });
  const a = await cellPos(page, 0, 0), b = await cellPos(page, 0, 4);
  await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(b.x, b.y, { steps: 8 }); await page.mouse.up();
  check(await count(page, 1) === 5, 'ドラッグで横に5マス塗れる');
  const c = await cellPos(page, 2, 2);
  await page.mouse.click(c.x, c.y, { button: 'right' });
  check(await count(page, 2) === 1, '右クリックでバツ');
  await page.keyboard.press('Control+z');
  check(await count(page, 2) === 0, 'Ctrl+Z で戻せる');
  await page.keyboard.press('Control+y');
  check(await count(page, 2) === 1, 'Ctrl+Y でやり直せる');
  // 塗った5マスの上を同じ向きにドラッグすると消える(押し始めと同じ状態だけ変わる)
  await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(b.x, b.y, { steps: 8 }); await page.mouse.up();
  check(await count(page, 1) === 0, '塗ったマスから始めると消しゴムになる');
  // メモ
  await page.keyboard.press('3');
  await page.mouse.click(c.x + 0, (await cellPos(page, 3, 3)).y);
  const memoBarShown = await page.evaluate(() => !document.getElementById('memoBar').hidden);
  check(await count(page, 3) === 1 && memoBarShown, 'メモで仮置きでき、メモの操作帯が出る');
  await page.click('#memoOk');
  check(await count(page, 3) === 0 && await count(page, 1) === 1, 'メモを確定すると本物の塗りになる');
  await page.keyboard.press('1');
  // 行の正解を塗ってから数字をタップすると、残りがバツになる
  const sol = await page.evaluate(() => window.__nono.P.sol);
  const C = await page.evaluate(() => window.__nono.P.C);
  await page.evaluate(() => { const n = window.__nono; n.cells.fill(0); });
  await page.keyboard.press('Control+z'); // 状態の同期を戻すためではなく、undo が壊れないことの確認
  await page.evaluate(() => { const n = window.__nono; n.cells.fill(0); });
  // 塗るマスと空くマスの両方がある行を選ぶ(白抜きの絵には全部塗る行がある)
  let row = 0; while (sol.slice(row * C, row * C + C).every(v => v === 0) || sol.slice(row * C, row * C + C).every(v => v === 1)) row++;
  for (let cc = 0; cc < C; cc++) if (sol[row * C + cc]) { const p = await cellPos(page, row, cc); await page.mouse.click(p.x, p.y); }
  const clueX = await page.evaluate(() => { const L = window.__nono.L; return document.getElementById('cv').getBoundingClientRect().left + L.left - 12; });
  const rowY = (await cellPos(page, row, 0)).y;
  await page.mouse.click(clueX, rowY);
  const crosses = await page.evaluate(([row, C]) => Array.from(window.__nono.cells).slice(row * C, row * C + C).filter(v => v === 2).length, [row, C]);
  check(crosses === sol.slice(row * C, row * C + C).filter(v => v === 0).length, '数字を満たした行の数字をタップすると残りがバツになる');
  // 矛盾の赤
  const firstEmpty = sol.slice(row * C, row * C + C).indexOf(0);
  const bad0 = await page.evaluate(r => window.__nono.rowInfo[r].bad, row);
  const pp = await cellPos(page, row, firstEmpty);
  await page.keyboard.press('2'); await page.mouse.click(pp.x, pp.y); // バツを外す
  await page.keyboard.press('1'); await page.mouse.click(pp.x, pp.y); // 余計に塗る
  const bad1 = await page.evaluate(r => window.__nono.rowInfo[r].bad, row);
  check(!bad0 && bad1, '数字と矛盾する行が赤になる');
  // 保存と復元
  const before = await page.evaluate(() => Array.from(window.__nono.cells).join(''));
  await page.reload();
  await page.waitForFunction(() => window.__nono && window.__nono.P);
  const after = await page.evaluate(() => Array.from(window.__nono.cells).join(''));
  check(before === after, '再読み込みしても盤面が残る');
  // Ctrl+ホイールで拡大
  const z0 = await page.evaluate(() => window.__nono.zoom);
  const mid = await cellPos(page, 5, 5);
  await page.mouse.move(mid.x, mid.y); await page.keyboard.down('Control'); await page.mouse.wheel(0, -300); await page.keyboard.up('Control');
  check(await page.evaluate(() => window.__nono.zoom) > z0, 'Ctrl+ホイールで拡大できる');
  await page.keyboard.press('0');
  check(await page.evaluate(() => window.__nono.zoom) === 1, '0キーで全体表示に戻る');
  // 引き継ぎコード
  await page.click('#menuBtn'); await page.click('[data-open="transferDlg"]');
  await page.click('#exportBtn');
  await page.waitForFunction(() => document.getElementById('transferText').value.length > 0, null, { timeout: 5000 }).catch(() => {});
  const code = await page.inputValue('#transferText');
  check(/^NONO1z?:/.test(code), `引き継ぎコードを作れる(${code.length}文字)`);
  if (OUT) await page.screenshot({ path: OUT + '/pc-transfer.png' });
  await page.keyboard.press('Escape');
  // 別の端末(まっさらな状態)に読み込む
  const other = await open({ viewport: { width: 1280, height: 860 } });
  await other.page.click('#menuBtn'); await other.page.click('[data-open="transferDlg"]');
  await other.page.fill('#transferText', code);
  await other.page.click('#importBtn'); await other.page.click('#importBtn');
  await other.page.waitForTimeout(300);
  const moved = await other.page.evaluate(() => Array.from(window.__nono.cells).join(''));
  check(moved === after, '引き継ぎコードで別の端末に盤面を移せる');
  await other.ctx.close();
  // 問題一覧から別の問題へ移り、戻ってくる
  const curKey = await page.evaluate(() => window.__nono.P.key);
  await page.click('#titleBtn');
  check(await page.evaluate(() => document.querySelectorAll('#cards .card').length) >= 10, '問題一覧にカードが並ぶ');
  const otherIdx = await page.evaluate(k => window.__nono.PUZZLES.findIndex(p => p.key !== k), curKey);
  await page.click(`#cards .card:nth-child(${otherIdx + 1})`);
  check(await page.evaluate(k => window.__nono.P.key !== k, curKey), '一覧のカードを押すとその問題が開く');
  await page.click('#titleBtn');
  const curIdx = await page.evaluate(k => window.__nono.PUZZLES.findIndex(p => p.key === k), curKey);
  await page.click(`#cards .card:nth-child(${curIdx + 1})`);
  const back = await page.evaluate(() => Array.from(window.__nono.cells).join(''));
  check(back === after, '別の問題に移っても、前の問題の途中経過が残っている');
  // 最初から見えているマスは変えられない
  const gk = await page.evaluate(() => { const n = window.__nono; const p = n.PUZZLES.find(x => Object.keys(x.givens).length); if (!p) return null; n.open(p.key); return Object.keys(p.givens)[0]; });
  if (gk !== null) {
    const gi = +gk, gC = await page.evaluate(() => window.__nono.P.C);
    const v0 = await page.evaluate(i => window.__nono.cells[i], gi);
    const gp = await cellPos(page, Math.floor(gi / gC), gi % gC);
    await page.mouse.click(gp.x, gp.y); await page.mouse.click(gp.x, gp.y, { button: 'right' });
    check(await page.evaluate(i => window.__nono.cells[i], gi) === v0, '最初から見えているマスは触っても変わらない');
  }
  // クリア
  await page.evaluate(() => { const n = window.__nono; const s = n.P.sol; for (let i = 0; i < s.length; i++) n.cells[i] = s[i]; const k = s.lastIndexOf(1); n.cells[k] = 0; });
  const last = await page.evaluate(() => { const n = window.__nono; const k = n.P.sol.lastIndexOf(1); return [Math.floor(k / n.P.C), k % n.P.C]; });
  await page.evaluate(() => { const s = document.getElementById('stage'); s.scrollLeft = 1e5; s.scrollTop = 1e5; });
  await page.waitForTimeout(100);
  const lp = await cellPos(page, last[0], last[1]);
  await page.mouse.click(lp.x, lp.y);
  await page.waitForTimeout(1000);
  check(await page.evaluate(() => document.getElementById('clearDlg').open), '最後の1マスでクリア画面が出る');
  check(await page.evaluate(() => document.getElementById('clearWord').textContent === window.__nono.P.text), 'クリア画面に名前が出る');
  // クリアした問題をもう一度解く
  await page.click('#againBtn');
  check(await page.evaluate(() => !document.getElementById('clearDlg').open && Array.from(window.__nono.cells).every((v, i) => v === 0 || window.__nono.P.givens[i] !== undefined)), '「もう一度解く」で盤面が最初に戻る');
  // 解き直したものを、もう一度クリアしてから一覧へ
  await page.evaluate(() => { const n = window.__nono; const s = n.P.sol; for (let i = 0; i < s.length; i++) n.cells[i] = s[i]; const k = s.lastIndexOf(1); n.cells[k] = 0; });
  await page.evaluate(() => { const s = document.getElementById('stage'); s.scrollLeft = 1e5; s.scrollTop = 1e5; });
  await page.waitForTimeout(100);
  { const lp2 = await cellPos(page, last[0], last[1]); await page.mouse.click(lp2.x, lp2.y); }
  await page.waitForFunction(() => document.getElementById('clearDlg').open, null, { timeout: 3000 }).catch(() => {});
  await page.click('#toListBtn');
  check(await page.evaluate(() => !!document.querySelector('#cards .card.cur canvas')), '解いた問題は一覧で絵になる');
  if (OUT) await page.screenshot({ path: OUT + '/pc-list.png' });
  await page.keyboard.press('Escape');
  if (OUT) await page.screenshot({ path: OUT + '/pc-clear.png' });
  // すべての記録を消す
  await page.click('#menuBtn'); await page.click('[data-open="settingsDlg"]');
  await page.click('#wipeBtn'); await page.click('#wipeBtn');
  await page.waitForTimeout(200);
  check(await page.evaluate(() => Object.values(window.__nono.store().slots).every(s => !s.cleared) && !Object.keys(window.__nono.store().best).length), '「すべての記録を消して最初から」で記録が消える');
  check(errors.length === 0, 'エラーなし ' + errors.join(' | '));
  await ctx.close();
}

// ---------------- スマホ ----------------
for (const dark of [false, true]) {
  console.log(`スマホ 390×844 ${dark ? '暗い' : '明るい'}`);
  const { ctx, page, errors } = await open({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 3, colorScheme: dark ? 'dark' : 'light' });
  const p = await cellPos(page, 1, 1);
  await page.touchscreen.tap(p.x, p.y);
  check(await count(page, 1) === 1, 'タップで塗れる');
  await page.click('#tCross');
  const q = await cellPos(page, 2, 2);
  await page.touchscreen.tap(q.x, q.y);
  check(await count(page, 2) === 1, 'バツに切り替えてタップするとバツ');
  await page.click('#tFill');
  // 2本指のピンチで拡大(CDPで多点タッチを送る)
  const cdp = await ctx.newCDPSession(page);
  const c1 = await cellPos(page, 6, 6), c2 = await cellPos(page, 8, 8);
  const z0 = await page.evaluate(() => window.__nono.zoom);
  const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((p, i) => ({ x: p.x, y: p.y, id: i })) });
  await touch('touchStart', [c1, c2]);
  for (let i = 1; i <= 8; i++) await touch('touchMove', [{ x: c1.x - i * 8, y: c1.y - i * 8 }, { x: c2.x + i * 8, y: c2.y + i * 8 }]);
  await touch('touchEnd', []);
  const z1 = await page.evaluate(() => window.__nono.zoom);
  check(z1 > z0 * 1.2 && z1 <= 4, `ピンチで拡大できる(${z0.toFixed(2)}→${z1.toFixed(2)})`);
  check(await count(page, 1) === 1, 'ピンチの1本目で誤って塗らない');
  const scrolled = await page.evaluate(() => { const s = document.getElementById('stage'); return s.scrollWidth > s.clientWidth; });
  if (scrolled) {
    await page.evaluate(() => { const s = document.getElementById('stage'); s.scrollLeft = 1e5; s.scrollTop = 1e5; });
    await page.waitForTimeout(100);
    const box = await page.evaluate(() => { const r = document.getElementById('cv').getBoundingClientRect(); return { x: r.left, y: r.top }; });
    const m = await page.evaluate(() => window.__nono.mapRect());
    await page.touchscreen.tap(box.x + m.x + 1, box.y + m.y + 1);
    const pos = await page.evaluate(() => { const s = document.getElementById('stage'); return [s.scrollLeft, s.scrollTop]; });
    const cs = await page.evaluate(() => window.__nono.L.cs);
    check(pos[0] < cs && pos[1] < cs, '右下から左上の縮小図をタップすると左上に戻れる');
  }
  if (OUT) await page.screenshot({ path: OUT + `/phone-${dark ? 'dark' : 'light'}.png` });
  await page.click('#fitBtn');
  if (OUT) { await page.click('#menuBtn'); await page.waitForTimeout(250); await page.screenshot({ path: OUT + `/phone-menu-${dark ? 'dark' : 'light'}.png` }); await page.keyboard.press('Escape'); }
  if (OUT) { await page.click('#titleBtn'); await page.waitForTimeout(250); await page.screenshot({ path: OUT + `/phone-new-${dark ? 'dark' : 'light'}.png` }); await page.keyboard.press('Escape'); }
  check(errors.length === 0, 'エラーなし ' + errors.join(' | '));
  await ctx.close();
}

// ---------------- 横向き・オフライン ----------------
console.log('スマホ横向き 844×390 / オフライン');
{
  const { ctx, page, errors } = await open({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
  if (OUT) await page.screenshot({ path: OUT + '/phone-landscape.png' });
  const hOk = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth && document.documentElement.scrollHeight <= window.innerHeight);
  check(hOk, 'ページ全体がはみ出さない');
  await page.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.controller, null, { timeout: 10000 }).catch(() => {});
  await page.reload(); await page.waitForTimeout(500);
  await ctx.setOffline(true);
  await page.reload();
  const ok = await page.waitForFunction(() => window.__nono && window.__nono.P, null, { timeout: 8000 }).then(() => true).catch(() => false);
  check(ok, '電波がなくても起動する');
  check(errors.filter(e => !/ERR_INTERNET_DISCONNECTED/.test(e)).length === 0, 'エラーなし ' + errors.join(' | '));
  await ctx.close();
}

await browser.close();
server.close();
console.log(fails ? `\n${fails} 件失敗` : '\nすべて成功');
process.exit(fails ? 1 : 0);
