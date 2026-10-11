// 鬼ノノグラムの「ID・パスワードで途中経過を預かる」仕組み。
// 保存先のスプレッドシートに付ける Apps Script(拡張機能 → Apps Script)に、このファイルを丸ごと貼る。
// ウェブアプリとして「自分として実行」「全員がアクセス可」で公開し、そのURLをアプリの SYNC_URL に入れる。
//
// 預かるもの: ID、パスワードを元に戻せない形にしたもの、途中経過(アプリが圧縮して送る文字列)。
// パスワードそのものは、アプリの中で一度ハッシュにしてから送り、ここでさらに塩を足して何度もハッシュにする。
// シートを見ても、パスワードはわからない。
//
// ランキング: 登録時に決める「表示名」だけを公開する(ログイン用のIDは外に出さない)。
// 点数とタイムは端末から届くが、問題の難しさと大きさはサーバーが公開中の puzzles.json から引く
// (端末の言い値で点数が決まらないように)。

const SHEET = 'users';
const HEAD = ['id', 'salt', 'hash', 'updated', 'created', 'size', 'data'];
const CHUNK = 45000;          // 1つのセルに入る文字数(50000)より少し小さく
const MAX_DATA = 900000;      // 1人あたりの上限(20セル分)
const ROUNDS = 2000;

const PLAYERS = 'players';
const P_HEAD = ['id', 'name', 'created'];
const CLEARS = 'clears';
const C_HEAD = ['id', 'key', 'level', 'ms', 'first', 'best_at'];
const PUZZLES_URL = 'https://endohoheto.github.io/da_db_site/nonogram/puzzles.json';
const POINTS = { easy: 1, normal: 2, std: 2, hard: 4, oni: 8 };
const MS_PER_CELL = 20;       // 1マス0.02秒より速いタイムは人の手では無理なので、タイムとして扱わない
const TOP = 20, TOP_PUZZLE = 10;

// 最初と、このファイルを貼り直したときに、エディタの上の「実行」で一度だけ動かす。
// 必要な許可(スプレッドシート・外部への接続)をまとめて求め、シートを用意し、問題一覧が読めるか確かめる。
// 許可がないままだと、アプリからは「準備ができていません」になる
function setup() {
  sheet_(); playersSheet_(); clearsSheet_();
  CacheService.getScriptCache().remove('puzzles:v1');
  Logger.log('準備できました。問題 ' + Object.keys(puzzles_()).length + ' 問を確認');
}

function doPost(e) {
  let req;
  try { req = JSON.parse(e.postData.contents); } catch (err) { return out_({ ok: false, error: 'bad_request' }); }
  try { return out_(handle_(req)); }
  catch (err) { return out_({ ok: false, error: 'server', message: String(err && err.message || err) }); }
}

// ブラウザで URL を開いたときに、動いていることだけ分かるようにする
function doGet() { return out_({ ok: true, service: 'nonogram-sync' }); }

function out_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function handle_(req) {
  const op = String(req.op || '');
  // ランキングを見るだけならログイン不要(自分の順位を知りたいときだけIDとパスワードを付ける)
  if (op === 'rank' && !req.id) return withLock_(function () { return rank_(null, req.k); });
  const id = String(req.id || '').trim().toLowerCase();
  const key = String(req.key || '');
  if (!/^[a-z0-9_-]{3,20}$/.test(id)) return { ok: false, error: 'bad_id' };
  if (!/^[0-9a-f]{64}$/.test(key)) return { ok: false, error: 'bad_key' };
  if (tooMany_(id)) return { ok: false, error: 'too_many' };

  return withLock_(function () {
    const sh = sheet_();
    const row = findRow_(sh, id);
    if (op === 'register') {
      if (row) return { ok: false, error: 'taken' };
      const name = cleanName_(req.name);
      const bad = checkName_(name, id);
      if (bad) return { ok: false, error: bad };
      const salt = Utilities.getUuid();
      const now = new Date().toISOString();
      sh.appendRow([id, salt, hash_(salt, key), '', now, 0, '']);
      playersSheet_().appendRow([id, name, now]);
      return { ok: true, updated: '', name: name };
    }
    if (!row) { fail_(id); return { ok: false, error: 'wrong' }; }
    const rec = sh.getRange(row, 1, 1, 6).getValues()[0];
    if (hash_(rec[1], key) !== rec[2]) { fail_(id); return { ok: false, error: 'wrong' }; }

    if (op === 'login') return { ok: true, updated: String(rec[3] || ''), name: playerName_(id) };
    if (op === 'load') {
      const size = Number(rec[5]) || 0;
      if (!size) return { ok: true, updated: String(rec[3] || ''), data: '' };
      const cells = Math.ceil(size / CHUNK);
      const data = sh.getRange(row, 7, 1, cells).getValues()[0].join('').slice(0, size);
      return { ok: true, updated: String(rec[3] || ''), data: data };
    }
    if (op === 'save') {
      const data = String(req.data || '');
      if (data.length > MAX_DATA) return { ok: false, error: 'too_big' };
      const parts = [];
      for (let i = 0; i < data.length; i += CHUNK) parts.push(data.slice(i, i + CHUNK));
      const prevCells = Math.ceil((Number(rec[5]) || 0) / CHUNK);
      const width = Math.max(parts.length, prevCells, 1);
      while (parts.length < width) parts.push('');
      const now = new Date().toISOString();
      sh.getRange(row, 4).setValue(now);
      sh.getRange(row, 6).setValue(data.length);
      sh.getRange(row, 7, 1, width).setValues([parts]);
      return { ok: true, updated: now };
    }
    if (op === 'setname') {
      const name = cleanName_(req.name);
      const bad = checkName_(name, id);
      if (bad) return { ok: false, error: bad };
      const ps = playersSheet_();
      const pr = findRow_(ps, id);
      if (pr) ps.getRange(pr, 2).setValue(name); else ps.appendRow([id, name, new Date().toISOString()]);
      return { ok: true, name: name };
    }
    if (op === 'clear') {
      recordClears_(id, req.items);
      return rank_(id, req.k);
    }
    if (op === 'rank') return rank_(id, req.k);
    if (op === 'delete') {
      sh.deleteRow(row);
      const ps = playersSheet_(), pr = findRow_(ps, id);
      if (pr) ps.deleteRow(pr);
      const cs = clearsSheet_();
      for (let r = cs.getLastRow(); r >= 2; r--) if (String(cs.getRange(r, 1).getValues()[0][0]) === id) cs.deleteRow(r);
      return { ok: true };
    }
    return { ok: false, error: 'bad_op' };
  });
}

function withLock_(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try { return fn(); } finally { lock.releaseLock(); }
}

// ---------- 表示名 ----------
// 前後の空白と制御文字を落とし、全角英数は半角にそろえる
function cleanName_(v) {
  return String(v || '').normalize('NFKC').replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2066-\u2069]/g, '').replace(/\s+/g, ' ').trim();
}
function checkName_(name, id) {
  if (name.length < 1 || name.length > 12) return 'bad_name';
  // リンクやHTMLに見えるものは載せない
  if (/[<>&"'`\\/]|https?:|www\.|@/i.test(name)) return 'bad_name';
  // IDと同じ名前だと、ログイン用のIDを公開することになる
  if (name.toLowerCase() === id) return 'name_is_id';
  const norm = name.toLowerCase();
  const ps = playersSheet_(), n = ps.getLastRow();
  if (n >= 2) {
    const rows = ps.getRange(2, 1, n - 1, 2).getValues();
    for (let i = 0; i < rows.length; i++) if (String(rows[i][0]) !== id && String(rows[i][1]).toLowerCase() === norm) return 'name_taken';
  }
  return '';
}
function playerName_(id) {
  const ps = playersSheet_(), r = findRow_(ps, id);
  return r ? String(ps.getRange(r, 2).getValues()[0][0] || '') : '';
}

// ---------- クリアの記録 ----------
// 公開中の問題一覧から、問題ごとの [難しさ, マスの数] を引く(6時間覚えておく)
function puzzles_() {
  const cache = CacheService.getScriptCache();
  const hit = cache.get('puzzles:v1');
  if (hit) return JSON.parse(hit);
  const res = UrlFetchApp.fetch(PUZZLES_URL, { muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) throw new Error('puzzles ' + res.getResponseCode());
  const list = JSON.parse(res.getContentText()).puzzles;
  const map = {};
  for (let i = 0; i < list.length; i++) map[list[i].key || list[i].text] = [list[i].level, list[i].R * list[i].C];
  cache.put('puzzles:v1', JSON.stringify(map), 21600);
  return map;
}

// items: [{k: 問題のキー, ms: まちがいチェックを使わずに解いた最速タイム(なければ0)}]
// 1人1問1行。初めて解いた時刻と、最速タイムだけを持つ
function recordClears_(id, items) {
  if (!Array.isArray(items) || !items.length) return;
  const pz = puzzles_();
  const cs = clearsSheet_();
  const n = cs.getLastRow();
  const rows = n >= 2 ? cs.getRange(2, 1, n - 1, C_HEAD.length).getValues() : [];
  const at = {};
  for (let i = 0; i < rows.length; i++) if (String(rows[i][0]) === id) at[String(rows[i][1])] = i;
  const now = new Date().toISOString();
  const added = [];
  const seen = {};
  items.slice(0, 1000).forEach(function (it) {
    const k = String(it && it.k || '');
    if (!pz[k] || seen[k]) return;
    seen[k] = 1;
    let ms = Math.round(Number(it.ms)) || 0;
    if (ms < pz[k][1] * MS_PER_CELL || ms > 7 * 86400000) ms = 0;
    const lv = pz[k][0];
    if (k in at) {
      const r = rows[at[k]], old = Number(r[3]) || 0;
      const faster = ms && (!old || ms < old);
      if (!faster && r[2] === lv) return;
      const next = [lv, faster ? ms : (old || ''), r[4] || now, faster ? now : r[5]];
      cs.getRange(at[k] + 2, 3, 1, 4).setValues([next]);
    } else {
      added.push([id, k, lv, ms || '', now, ms ? now : '']);
    }
  });
  if (added.length) cs.getRange(cs.getLastRow() + 1, 1, added.length, C_HEAD.length).setValues(added);
}

// ---------- ランキング ----------
// 総合: 解いた問題の点数の合計(やさしい1・ふつう2・むずかしい4・鬼8)
// 王冠: 最速タイムで1位を持っている問題の数
// 問題別: その問題の最速タイム
// 返すのは表示名と数字だけ。IDは返さない
function rank_(id, k) {
  const names = {};
  const ps = playersSheet_(), pn = ps.getLastRow();
  if (pn >= 2) ps.getRange(2, 1, pn - 1, 2).getValues().forEach(function (r) { if (r[1]) names[String(r[0])] = String(r[1]); });
  const cs = clearsSheet_(), cn = cs.getLastRow();
  const rows = cn >= 2 ? cs.getRange(2, 1, cn - 1, C_HEAD.length).getValues() : [];
  const me = {};       // id → {pts, n, c}
  const times = {};    // 問題 → [[id, ms, best_at]]
  rows.forEach(function (r) {
    const pid = String(r[0]);
    if (!names[pid]) return;
    const m = me[pid] || (me[pid] = { pts: 0, n: 0, c: 0 });
    m.pts += POINTS[r[2]] || 0; m.n++;
    const ms = Number(r[3]) || 0;
    if (ms) (times[String(r[1])] || (times[String(r[1])] = [])).push([pid, ms, String(r[5] || '')]);
  });
  const myCrowns = [];
  Object.keys(times).forEach(function (key) {
    // 同じタイムなら先に出した人が1位
    const t = times[key].sort(function (a, b) { return a[1] - b[1] || (a[2] < b[2] ? -1 : a[2] > b[2] ? 1 : 0); });
    me[t[0][0]].c++;
    if (t[0][0] === id) myCrowns.push(key);
  });
  const ids = Object.keys(me);
  const out = { ok: true, players: ids.length };
  out.total = board_(ids.slice().sort(function (a, b) { return me[b].pts - me[a].pts || me[b].n - me[a].n; }),
    function (p) { return me[p].pts; }, function (p) { return { name: names[p], pts: me[p].pts, n: me[p].n, c: me[p].c }; }, id, TOP, true);
  out.crowns = board_(ids.filter(function (p) { return me[p].c > 0; }).sort(function (a, b) { return me[b].c - me[a].c || me[b].pts - me[a].pts; }),
    function (p) { return me[p].c; }, function (p) { return { name: names[p], c: me[p].c }; }, id, TOP, true);
  if (k) {
    const t = times[String(k)] || [];
    const msOf = {}; t.forEach(function (x) { msOf[x[0]] = x[1]; });
    out.puzzle = board_(t.map(function (x) { return x[0]; }), function (p) { return msOf[p]; },
      function (p) { return { name: names[p], ms: msOf[p] }; }, id, TOP_PUZZLE, false);
    out.puzzle.k = String(k);
  }
  if (id) { out.name = names[id] || ''; out.myCrowns = myCrowns; }
  return out;
}

// 並べた順に順位を付ける(同じ値は同じ順位)。自分が上位に入っていなくても、自分の順位とひとつ上との差を返す
function board_(order, val, row, id, top, bigIsBetter) {
  const list = [];
  let rank = 0;
  for (let i = 0; i < order.length; i++) {
    if (i === 0 || val(order[i]) !== val(order[i - 1])) rank = i + 1;
    list.push(rank);
  }
  const res = { count: order.length, top: [] };
  for (let i = 0; i < Math.min(top, order.length); i++) {
    const r = row(order[i]); r.r = list[i]; if (order[i] === id) r.me = true;
    res.top.push(r);
  }
  const mi = id ? order.indexOf(id) : -1;
  if (mi >= 0) {
    const m = row(order[mi]); m.r = list[mi];
    // ひとつ上の順位の人との差(1位なら2位との差を「リード」として返す)
    let j = mi - 1; while (j >= 0 && list[j] === list[mi]) j--;
    if (j >= 0) m.gap = Math.abs(val(order[j]) - val(order[mi]));
    else if (mi + 1 < order.length) { let q = mi + 1; while (q < order.length && list[q] === list[mi]) q++; if (q < order.length) m.lead = Math.abs(val(order[q]) - val(order[mi])); }
    res.me = m;
  }
  return res;
}

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET);
  if (!sh) {
    sh = ss.insertSheet(SHEET);
    sh.getRange(1, 1, 1, HEAD.length).setValues([HEAD]);
    sh.setFrozenRows(1);
  }
  return sh;
}

function playersSheet_() { return named_(PLAYERS, P_HEAD); }
function clearsSheet_() { return named_(CLEARS, C_HEAD); }
function named_(name, head) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, head.length).setValues([head]);
    sh.setFrozenRows(1);
  }
  return sh;
}

function findRow_(sh, id) {
  const n = sh.getLastRow();
  if (n < 2) return 0;
  const ids = sh.getRange(2, 1, n - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) if (String(ids[i][0]) === id) return i + 2;
  return 0;
}

// 塩を足して何度もハッシュにする(総当たりで調べにくくするため)
function hash_(salt, key) {
  let h = salt + ':' + key;
  for (let i = 0; i < ROUNDS; i++) {
    const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, h, Utilities.Charset.UTF_8);
    h = bytes.map(function (b) { return ('0' + (b & 255).toString(16)).slice(-2); }).join('');
  }
  return h;
}

// 同じIDでパスワードを10分に10回まちがえたら、しばらく受け付けない
function tooMany_(id) {
  const c = CacheService.getScriptCache().get('fail:' + id);
  return Number(c || 0) >= 10;
}
function fail_(id) {
  const cache = CacheService.getScriptCache();
  const k = 'fail:' + id;
  cache.put(k, String(Number(cache.get(k) || 0) + 1), 600);
}
