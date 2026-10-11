// server/Code.gs(ID・パスワードで途中経過を預かる口)の動きを確かめる
import test from 'node:test';
import assert from 'node:assert';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { loadServer } from '../scripts/gas-mock.mjs';

const key = (s) => crypto.createHash('sha256').update(s).digest('hex');

test('登録・ログイン・預ける・取り出す', () => {
  const s = loadServer();
  const k = key('nonogram:taro:secret1');
  assert.deepStrictEqual(s.post({ op: 'register', id: 'taro', key: k, name: 'たろう' }).ok, true);
  assert.strictEqual(s.post({ op: 'register', id: 'taro', key: k, name: 'たろう' }).error, 'taken');
  assert.strictEqual(s.post({ op: 'login', id: 'taro', key: k }).ok, true);
  assert.strictEqual(s.post({ op: 'login', id: 'taro', key: key('x') }).error, 'wrong');
  assert.strictEqual(s.post({ op: 'login', id: 'hanako', key: k }).error, 'wrong');
  const data = 'NONO1z:' + 'A'.repeat(100000);       // 1セルに入らない長さも預けられる
  assert.strictEqual(s.post({ op: 'save', id: 'taro', key: k, data }).ok, true);
  assert.strictEqual(s.post({ op: 'load', id: 'taro', key: k }).data, data);
  assert.strictEqual(s.post({ op: 'save', id: 'taro', key: k, data: 'short' }).ok, true);
  assert.strictEqual(s.post({ op: 'load', id: 'taro', key: k }).data, 'short', '短くした後に古い残りが混ざらない');
});

test('シートにパスワードやそのハッシュが残らない', () => {
  const s = loadServer();
  const k = key('nonogram:taro:secret1');
  s.post({ op: 'register', id: 'taro', key: k, name: 'たろう' });
  const dump = JSON.stringify(s.sheets.users.rows);
  assert.ok(!dump.includes('secret1'));
  assert.ok(!dump.includes(k), '端末から送られたハッシュもそのまま残さない');
});

test('おかしな入力をはじく', () => {
  const s = loadServer();
  assert.strictEqual(s.post({ op: 'register', id: 'ab', key: key('a') }).error, 'bad_id');
  assert.strictEqual(s.post({ op: 'register', id: 'taro', key: 'short' }).error, 'bad_key');
  assert.strictEqual(s.postRaw('not json').error, 'bad_request');
  const k = key('k');
  s.post({ op: 'register', id: 'taro', key: k, name: 'たろう' });
  assert.strictEqual(s.post({ op: 'save', id: 'taro', key: k, data: 'x'.repeat(900001) }).error, 'too_big');
});

test('まちがいが続くと受け付けない', () => {
  const s = loadServer();
  s.post({ op: 'register', id: 'taro', key: key('right'), name: 'たろう' });
  for (let i = 0; i < 10; i++) s.post({ op: 'login', id: 'taro', key: key('bad' + i) });
  assert.strictEqual(s.post({ op: 'login', id: 'taro', key: key('right') }).error, 'too_many');
});

const P = JSON.parse(fs.readFileSync(new URL('../puzzles.json', import.meta.url))).puzzles;
const byLv = (lv) => P.filter(p => p.level === lv);

test('表示名: 必須・重複不可・IDと同じは不可・リンク不可', () => {
  const s = loadServer();
  assert.strictEqual(s.post({ op: 'register', id: 'taro', key: key('a') }).error, 'bad_name');
  assert.strictEqual(s.post({ op: 'register', id: 'taro', key: key('a'), name: 'TARO' }).error, 'name_is_id');
  assert.strictEqual(s.post({ op: 'register', id: 'taro', key: key('a'), name: 'https://x.jp' }).error, 'bad_name');
  assert.strictEqual(s.post({ op: 'register', id: 'taro', key: key('a'), name: 'あいうえおかきくけこさしす' }).error, 'bad_name');
  assert.strictEqual(s.post({ op: 'register', id: 'taro', key: key('a'), name: ' 鬼の太郎 ' }).name, '鬼の太郎');
  assert.strictEqual(s.post({ op: 'register', id: 'jiro', key: key('b'), name: '鬼の太郎' }).error, 'name_taken');
  assert.strictEqual(s.post({ op: 'register', id: 'jiro', key: key('b'), name: 'ＡＢＣ' }).name, 'ABC', '全角英数は半角にそろえる');
  assert.strictEqual(s.post({ op: 'login', id: 'taro', key: key('a') }).name, '鬼の太郎');
  assert.strictEqual(s.post({ op: 'setname', id: 'taro', key: key('a'), name: 'abc' }).error, 'name_taken', '大文字小文字だけ違う名前も不可');
  assert.strictEqual(s.post({ op: 'setname', id: 'taro', key: key('a'), name: '太郎改' }).name, '太郎改');
  assert.strictEqual(s.post({ op: 'setname', id: 'taro', key: key('x'), name: 'ずる' }).error, 'wrong');
});

test('ランキング: 点数・王冠・問題別、IDは外に出さない', () => {
  const s = loadServer();
  for (const [id, name] of [['taro', '太郎'], ['jiro', '次郎'], ['saburo', '三郎']]) s.post({ op: 'register', id, key: key(id), name });
  const e = byLv('easy')[0], o = byLv('oni')[0], cells = (p) => p.R * p.C;
  const slow = (p) => cells(p) * 100, fast = (p) => cells(p) * 50;
  // 太郎: やさしい(速い) + 鬼 = 9点。次郎: やさしい(遅い) = 1点。三郎: なし
  let r = s.post({ op: 'clear', id: 'taro', key: key('taro'), items: [{ k: e.key, ms: fast(e) }, { k: o.key, ms: slow(o) }], k: e.key });
  assert.strictEqual(r.total.me.pts, 9);
  assert.strictEqual(r.puzzle.me.r, 1);
  r = s.post({ op: 'clear', id: 'jiro', key: key('jiro'), items: [{ k: e.key, ms: slow(e) }], k: e.key });
  assert.strictEqual(r.total.me.r, 2);
  assert.strictEqual(r.total.me.gap, 8, '1つ上との差');
  assert.strictEqual(r.puzzle.me.r, 2);
  assert.strictEqual(r.puzzle.me.gap, slow(e) - fast(e));
  // 次郎が速いタイムを出すと、太郎の王冠が移る
  r = s.post({ op: 'clear', id: 'jiro', key: key('jiro'), items: [{ k: e.key, ms: fast(e) - 1000 }], k: e.key });
  assert.strictEqual(r.puzzle.me.r, 1);
  assert.deepStrictEqual(r.myCrowns, [e.key]);
  assert.strictEqual(r.total.me.pts, 1, '同じ問題を何度解いても点数は増えない');
  // 遅いタイムを送っても最速は変わらない
  s.post({ op: 'clear', id: 'jiro', key: key('jiro'), items: [{ k: e.key, ms: slow(e) * 2 }] });
  // ログインなしでも見られる。表示名だけで、IDは含まない
  r = s.post({ op: 'rank', k: e.key });
  assert.strictEqual(r.players, 2, 'まだ1問も解いていない人は載らない');
  assert.deepStrictEqual(r.total.top.map(x => [x.r, x.name, x.pts]), [[1, '太郎', 9], [2, '次郎', 1]]);
  assert.deepStrictEqual(r.crowns.top.map(x => [x.name, x.c]), [['太郎', 1], ['次郎', 1]]);
  assert.deepStrictEqual(r.puzzle.top.map(x => [x.name, x.ms]), [['次郎', fast(e) - 1000], ['太郎', fast(e)]]);
  assert.ok(!r.total.me && !r.myCrowns);
  const dump = JSON.stringify(r);
  for (const id of ['taro', 'jiro', 'saburo']) assert.ok(!dump.includes(`"${id}"`), 'IDが出ない');
  // 1位のときは2位との差を「リード」で返す
  r = s.post({ op: 'rank', id: 'taro', key: key('taro'), k: o.key });
  assert.strictEqual(r.total.me.r, 1);
  assert.strictEqual(r.total.me.lead, 8);
  assert.strictEqual(r.name, '太郎');
});

test('ランキング: ありえないタイム・知らない問題は数えない', () => {
  const s = loadServer();
  s.post({ op: 'register', id: 'taro', key: key('taro'), name: '太郎' });
  const e = byLv('easy')[0];
  const r = s.post({ op: 'clear', id: 'taro', key: key('taro'), items: [{ k: e.key, ms: 500 }, { k: 'にせもの#1', ms: 99999 }, { k: e.key, ms: 1 }], k: e.key });
  assert.strictEqual(r.total.me.n, 1, '知らない問題は数えない');
  assert.strictEqual(r.puzzle.count, 0, '速すぎるタイムはランキングに入らない(解いた点数は入る)');
  assert.strictEqual(s.post({ op: 'delete', id: 'taro', key: key('taro') }).ok, true);
  assert.strictEqual(s.sheets.clears.rows.length, 1, '消すとクリアの記録も消える');
  assert.strictEqual(s.sheets.players.rows.length, 1);
});

test('setup: シートを用意して問題一覧を読める', () => {
  const s = loadServer();
  s.setup();
  assert.deepStrictEqual(Object.keys(s.sheets).sort(), ['clears', 'players', 'users']);
});
