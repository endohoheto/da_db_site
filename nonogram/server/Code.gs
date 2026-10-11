// 鬼ノノグラムの「ID・パスワードで途中経過を預かる」仕組み。
// 保存先のスプレッドシートに付ける Apps Script(拡張機能 → Apps Script)に、このファイルを丸ごと貼る。
// ウェブアプリとして「自分として実行」「全員がアクセス可」で公開し、そのURLをアプリの SYNC_URL に入れる。
//
// 預かるもの: ID、パスワードを元に戻せない形にしたもの、途中経過(アプリが圧縮して送る文字列)。
// パスワードそのものは、アプリの中で一度ハッシュにしてから送り、ここでさらに塩を足して何度もハッシュにする。
// シートを見ても、パスワードはわからない。

const SHEET = 'users';
const HEAD = ['id', 'salt', 'hash', 'updated', 'created', 'size', 'data'];
const CHUNK = 45000;          // 1つのセルに入る文字数(50000)より少し小さく
const MAX_DATA = 900000;      // 1人あたりの上限(20セル分)
const ROUNDS = 2000;

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
  const id = String(req.id || '').trim().toLowerCase();
  const key = String(req.key || '');
  if (!/^[a-z0-9_-]{3,20}$/.test(id)) return { ok: false, error: 'bad_id' };
  if (!/^[0-9a-f]{64}$/.test(key)) return { ok: false, error: 'bad_key' };
  if (tooMany_(id)) return { ok: false, error: 'too_many' };

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sh = sheet_();
    const row = findRow_(sh, id);
    if (op === 'register') {
      if (row) return { ok: false, error: 'taken' };
      const salt = Utilities.getUuid();
      const now = new Date().toISOString();
      sh.appendRow([id, salt, hash_(salt, key), '', now, 0, '']);
      return { ok: true, updated: '' };
    }
    if (!row) { fail_(id); return { ok: false, error: 'wrong' }; }
    const rec = sh.getRange(row, 1, 1, 6).getValues()[0];
    if (hash_(rec[1], key) !== rec[2]) { fail_(id); return { ok: false, error: 'wrong' }; }

    if (op === 'login') return { ok: true, updated: String(rec[3] || '') };
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
    if (op === 'delete') {
      sh.deleteRow(row);
      return { ok: true };
    }
    return { ok: false, error: 'bad_op' };
  } finally {
    lock.releaseLock();
  }
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
