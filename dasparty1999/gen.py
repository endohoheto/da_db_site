# Generates dasparty1999/index.html:  python3 dasparty1999/gen.py dasparty1999/index.html
# Setlists, ★ (VHS) and ☆ (broadcast) are transcribed from the owner's blog;
# BD contents only from the Sony Music official page. Nothing else is a source.
import html, sys

BLOG = 'https://chikichikichi.hatenablog.com/entry/2019/09/02/004516'
SONY = 'https://www.sonymusic.co.jp/artist/DaisukeAsakura/info/586852'

# row: (no, title, vhs, oa, bd)
#   bd: None | ('D1', sony_title_or_None) | ('Q', None) unknown block | ('D3', sony) | ('D3*', sony)
# group header: ('G', name, note)
# unnumbered: no=''

def G(name, note=''): return ('G', name, note)

SHOWS = []

# ---- 1999/02/14 -------------------------------------------------------------
SHOWS.append(dict(
  id='v0214', short='横浜アリーナ', date='1999.2.14 (SUN)', venue='横浜アリーナ',
  name='DA’s Special Valentine Party!!!', oa_all=True, disc='DISC 1',
  rows=[
    G('MC-K2'),
    ('01', 'Spicy Marmalade', True, True, ('D1', 'Spicy Marmalade /コタニキンヤ')),
    ('02', "GOD You'ra SAVE", False, True, None),
    ('03', 'Blind Game again', True, True, None),
    G('浅倉大介solo'),
    ('04', 'key solo E.v.o.l.u.t.i.o.n.', True, True, ('D1', 'E.v.o.l.u.t.i.o.n for Valentine / Daisuke Asakura')),
    ('05', 'Pf Solo TEAR\'S LIBERATION〜THE ELECTROMANCER(KANASHIMINO KAWAWO YOROKOBINO OKAWO)〜Melody Fiar (Bee Gees)〜Image Of Tomorrow', True, True,
       ('D1', 'Image of Tomorrow for Valentine / Daisuke Asakura')),
    ('06', 'SIREN’S MELODY', True, True, ('D1', "SIREN'S MELODY / Daisuke Asakura")),
    G('Fayray'),
    ('07', '太陽のグラヴィティー', True, True, ('D1', '太陽のグラヴィティー/ Fayray')),
    ('08', 'YURA・YURA ～Vibration', True, True, ('D1', 'YURA・YURA～Vibration/ Fayray')),
    ('09', 'Power Veil', True, True, ('D1', 'Powder Veil / Fayray')),
    G('T.M.Revolution'),
    ('10', 'WHITE BREATH', True, True, ('D1', 'WHITE BREATH / T.M.Revolution')),
    ('11', '蒼い霹靂', False, True, None),
    ('12', 'THUNDERBIRD', True, True, None),
    ('13', 'Burnin’ X’mas', True, True, ('D1', "Burnin' X'mas / T.M.Revolution")),
    ('14', 'HOT LIMIT', True, True, ('D1', 'HOT LIMIT / T.M.Revolution')),
    ('15', 'WILD RUSH', True, True, ('D1', 'WILD RUSH / T.M.Revolution')),
    G('Iceman'),
    ('16', 'CRAZY JET', True, True, ('D1', 'CRAZY JET / Iceman')),
    ('17', 'WHAT’S WRONG?', False, True, None),
    ('18', 'Dizzy Boogie', False, True, None),
    ('19', 'BEAT MY LIFE', False, True, None),
    ('20', 'GALAXY GANG', True, True, None),
    ('21', 'Shining Collection', True, True, ('D1', 'Shining Collection / Iceman')),
    ('22', 'DARK HALF ～TOUCH YOUR DARKNESS', True, True, ('D1', 'DARK HALF～TOUCH YOUR DARKNESS / Iceman')),
    ('23', 'LOST COMPLEX', True, True, ('D1', 'LOST COMPLEX / Iceman')),
    G('All'),
    ('24', 'Something Feel Like Heaven (Iceman & T.M.R)', True, True, ('D1', 'Something feel like Heaven / Iceman & T.M.Revolution')),
    ('25', 'MC', False, True, None),
  ]))

# ---- 1999/08/29 -------------------------------------------------------------
SHOWS.append(dict(
  id='s0829', short='東京ベイNK', date='1999.8.29 (SUN)', venue='東京ベイNKホール',
  name='DA’s Party Special Summer Festival!!!', oa_all=True, disc='DISC 2',
  rows=[
    G('MC-K2'),
    ('01', 'Spicy Marmalade', True, True, ('D2', 'Spicy Marmalade / コタニキンヤ')),
    ('02', 'Time in my heart', True, True, ('D2', 'Time in my Heart / コタニキンヤ')),
    ('03', 'Blind Game Again', False, True, ('D2', 'Blind Game again / コタニキンヤ')),
    G('Fayray'),
    ('04', 'YURA・YURA ～Vibration', False, True, None),
    ('05', '太陽のグラヴィティー', False, True, None),
    ('06', 'Same night, Same face', False, True, None),
    ('07', 'Craving', False, True, None),
    G('浅倉大介ソロ', 'BDの曲目は「Keyboard Solo〜Piano Solo / Daisuke Asakura」の1行だけで、このブロックのどの曲までが入るかは公式の曲目からはわかりません'),
    ('08', 'SEQUENCE MEDITATION', True, True, ('Q', None)),
    ('', '(Piano)', False, True, None),
    ('09', 'GATE Ⅱ-sensitive gate', True, True, ('Q', None)),
    ('10', 'Toy Box In The Morning', False, True, ('Q', None)),
    ('11', 'ENDLESS SUMMER -君が滲んだ夏-', False, True, ('Q', None)),
    ('12', 'ミッキーマウス・クラブ・マーチ', False, True, ('Q', None)),
    ('13', '突然シーモアが！', False, True, ('Q', None)),
    ('14', 'GATE I -gate odyssey', True, True, ('Q', None)),
    G('木村由姫'),
    ('15', 'Deep Sky Heart', False, True, None),
    ('16', 'Fall in YOU', False, True, None),
    ('17', 'Windy scene', False, True, None),
    ('18', 'Summer Rain', False, True, None),
    G('Mad Soldiers'),
    ('19', 'LEMON TEA', True, True, ('D2', 'LEMON TEA / Mad Soldiers')),
    G('pool bit boys'),
    ('20', 'SPIRAL', False, True, None),
    ('21', 'Scarletの憂鬱', False, True, None),
    ('22', 'Venus Accident', False, True, None),
    ('23', 'EARTH STRIKER', False, True, None),
    G('Iceman'),
    ('24', 'Strike Back of PSYCO', True, True, ('D2', 'Strike Back of PSYCO / Iceman')),
    ('25', 'Wish Matrix', False, True, None),
    ('26', 'Expander Drive Machine～発展途上人型アンドロイドの見た夢', True, True, ('D2', 'Expander Drive Machine〜発展途上人型アンドロイドの見た夢 / Iceman')),
    ('27', 'FATE WEATHER', True, True, ('D2', 'FATE WEATHER / Iceman')),
    ('28', 'GALAXY GANG', True, True, ('D2', 'GALAXY GANG / Iceman')),
    ('29', 'Shining Collection', True, True, ('D2', 'Shining Collection / Iceman')),
    G('the end of genesis T.M.R.evolution turbo type D'),
    ('30', '陽炎-KAGEROH-', True, True, ('D2', '陽炎-KAGEROH-〜月虹-GEKKOH- / the end of genesis T.M.R. evolution turbo type D')),
    ('31', '月虹-GEKKOH-', True, True, ('D2', '陽炎-KAGEROH-〜月虹-GEKKOH- / the end of genesis T.M.R. evolution turbo type D')),
    G('All'),
    ('', 'MC+雛形あきこ', False, True, None),
  ]))

# ---- Yoyogi: BD DISC 3 does not say which of the three shows a track is from. --
# A song played at only one of the three can only be from that show (D3).
# A song played at more than one is marked D3* and left undecided.
SHOWS.append(dict(
  id='y1231a', short='Grand Finale', date='1999.12.31 (FRI)', venue='国立代々木競技場 第一体育館',
  name='DA’s Party Grand Finale 1999 featuring Iceman', oa_all=False, disc='DISC 3',
  rows=[
    G('浅倉大介'),
    ('01', 'white dimension (Iceman)～CAUTION!-phychedelic mix', False, False, None),
    ('02', 'GATE Ⅱ -sensitive gate', False, False, ('D3*', 'GATE Ⅱ～sensitive gate / Daisuke Asakura')),
    ('03', 'THE ELECTROMANCER(KANASHIMINO KAWAWO YOROKOBINO OKAWO)', False, True, ('D3*', 'THE ELECTROMANCER(KANASHIMINO KAWAWO YOROKOBINO OKAWO）/ Daisuke Asakura')),
    ('04', '夢を見たいから', False, False, None),
    ('05', '1000年の誓い', False, False, None),
    ('06', 'SIREN’S MELODY', False, False, None),
    G('Mad Soldiers'),
    ('07', 'Boys Jump The Midnight', False, False, ('D3*', 'Boys Jump The Midnight / Mad Soldiers')),
    ('08', 'LEMON TEA', False, False, ('D3*', 'LEMON TEA / Mad Soldiers')),
    G('コタニキンヤ', 'MV. 高熱BLOOD'),
    ('09', 'Spicy Marmalade', False, False, ('D3*', 'Spicy Marmalade / コタニキンヤ')),
    ('10', '灼熱BLADE', False, False, ('D3*', '灼熱BLADE / コタニキンヤ')),
    ('11', 'Blind Game Again', False, False, ('D3*', 'Blind Game again /コタニキンヤ')),
    ('12', '高熱BLOOD', False, False, ('D3*', '高熱BLOOD / コタニキンヤ')),
    G('the end of genesis T.M.R.evolution turbo type D', 'MV.雪幻-winter dust'),
    ('13', '陽炎-KAGEROH-', False, False, ('D3*', '陽炎-KAGEROH- / the end of genesis T.M.R. evolution turbo type D')),
    ('14', '月虹-GEKKOH-', False, False, ('D3*', '月虹-GEKKOH- / the end of genesis T.M.R. evolution turbo type D')),
    ('15', '雪幻-winter dust-', False, False, ('D3*', '雪幻-winter dust- / the end of genesis T.M.R. evolution turbo type D')),
    G('Iceman', 'MV.Genetic Bomb shortがフルのやつ'),
    ('16', 'white dimension', False, False, None),
    ('17', 'dope light', False, False, ('D3*', 'dope light / Iceman')),
    ('18', 'Wish Matrix', False, False, None),
    ('19', 'Beauty and Beast 0’00”', False, False, ('D3*', 'Beauty and Beast 0\'00" / Iceman')),
    ('20', 'BLEACHING', False, False, None),
    ('21', 'ICE BREAKER', False, False, None),
    ('22', 'FATE WEATHER', False, True, ('D3', 'FATE WEATHER / Iceman')),
    ('23', 'Shining Collection', False, True, ('D3', 'Shining Collection / Iceman')),
    ('24', 'Genetic Bomb', False, False, ('D3*', 'Genetic Bomb / Iceman')),
  ]))

SHOWS.append(dict(
  id='y1231b', short='Count Down', date='1999.12.31 (FRI)', venue='国立代々木競技場 第一体育館',
  name='DA’s Party Let’s Count Down 99-00', oa_all=False, disc='DISC 3',
  rows=[
    G('コタニキンヤ'),
    ('01', 'Spicy Marmalade', False, False, ('D3*', 'Spicy Marmalade / コタニキンヤ')),
    ('02', '憂鬱なSevendays', False, False, None),
    G('Iceman'),
    ('03', 'Eyes Bright', False, False, None),
    ('04', 'Dear My Friend', False, False, None),
    ('05', 'DAY DREAM BELIEVER', False, False, None),
    G('the end of genesis T.M.R.evolution turbo type D'),
    ('06', 'WHITE BREATH', False, False, ('D3*', 'WHITE BREATH / the end of genesis T.M.R. evolution turbo type D')),
    ('07', 'I DON’T WANT TO MISS A THING', False, False, None),
    ('08', 'HEART OF SWORD～夜明け前～', False, False, None),
    G('All'),
    ('09', 'DYNAMITE PASSION', False, False, None),
    ('10', 'GALAXY GANG', False, False, None),
    ('11', 'Paradise City', False, False, None),
    ('12', 'DA’s Party 2000-TV Size（中継あり）', False, True, ('D3*', 'DA’s Party 2000 / Iceman・the end of genesis T.M.R. evolution turbo type D・コタニキンヤ')),
    ('13', 'DA’s Party 2000', False, True, ('D3*', 'DA’s Party 2000 / Iceman・the end of genesis T.M.R. evolution turbo type D・コタニキンヤ')),
  ]))

SHOWS.append(dict(
  id='y0101', short='Happy New Year', date='2000.1.1 (SAT)', venue='国立代々木競技場 第一体育館',
  name='DA’s Party Happy New Year Welcome 2000 featuring the end of genesis T.M.R.evolution turbo type D',
  oa_all=False, disc='DISC 3',
  rows=[
    G('Mad Soldiers'),
    ('01', 'LEMON TEA', False, True, ('D3*', 'LEMON TEA / Mad Soldiers')),
    ('02', 'Boys Jump The Midnight', False, True, ('D3*', 'Boys Jump The Midnight / Mad Soldiers')),
    G('コタニキンヤ', 'MV. 高熱BLOOD'),
    ('03', 'Spicy Marmalade', False, True, ('D3*', 'Spicy Marmalade / コタニキンヤ')),
    ('04', '灼熱BLADE', False, True, ('D3*', '灼熱BLADE / コタニキンヤ')),
    ('05', '高熱BLOOD', False, True, ('D3*', '高熱BLOOD / コタニキンヤ')),
    ('06', 'Blind Game Again', False, True, ('D3*', 'Blind Game again /コタニキンヤ')),
    G('浅倉大介'),
    ('07', 'white dimension', False, False, None),
    ('08', 'CAUTION', False, False, None),
    ('09', 'GATEⅡ-sensitive gate', False, True, ('D3*', 'GATE Ⅱ～sensitive gate / Daisuke Asakura')),
    ('10', 'THE ELECTROMANCER(KANASHIMINO KAWAWO YOROKOBINO OKAWO)', False, True, ('D3*', 'THE ELECTROMANCER(KANASHIMINO KAWAWO YOROKOBINO OKAWO）/ Daisuke Asakura')),
    ('11', 'TRY AGAIN', False, True, ('D3', 'TRY AGAIN / Daisuke Asakura')),
    ('12', '1000年の誓い', False, True, None),
    ('13', 'Neo Age', False, True, ('D3', 'Neo Age / Daisuke Asakura')),
    G('Iceman', 'MV.Genetic Bomb shortがフルのやつ'),
    ('14', 'white dimension', False, False, None),
    ('15', 'dope light', False, True, ('D3*', 'dope light / Iceman')),
    ('16', 'Beauty and Beast 0’00”', False, True, ('D3*', 'Beauty and Beast 0\'00" / Iceman')),
    ('17', 'Genetic Bomb', False, True, ('D3*', 'Genetic Bomb / Iceman')),
    G('the end of genesis T.M.R.evolution turbo type D', 'MV.雪幻-winter dust'),
    ('18', 'WHITE BREATH', False, True, ('D3*', 'WHITE BREATH / the end of genesis T.M.R. evolution turbo type D')),
    ('19', '陽炎-KAGEROH-', False, True, ('D3*', '陽炎-KAGEROH- / the end of genesis T.M.R. evolution turbo type D')),
    ('20', '月虹-GEKKOH-', False, True, ('D3*', '月虹-GEKKOH- / the end of genesis T.M.R. evolution turbo type D')),
    ('21', '雪幻-winter dust-', False, True, ('D3*', '雪幻-winter dust- / the end of genesis T.M.R. evolution turbo type D')),
    ('22', 'HEART OF SWORD～夜明け前～', False, False, None),
    ('23', 'BLACK OR WHITE?', False, False, None),
    ('24', 'WHITE BREATH', False, False, ('D3*', 'WHITE BREATH / the end of genesis T.M.R. evolution turbo type D')),
    G('EC All'),
    ('25', 'DA’s Party 2000', False, False, ('D3*', 'DA’s Party 2000 / Iceman・the end of genesis T.M.R. evolution turbo type D・コタニキンヤ')),
  ]))

# Sony DISC lists, verbatim, for the coverage check below.
SONY_D = {
 'D1': ['Spicy Marmalade /コタニキンヤ','E.v.o.l.u.t.i.o.n for Valentine / Daisuke Asakura','Image of Tomorrow for Valentine / Daisuke Asakura',"SIREN'S MELODY / Daisuke Asakura",'太陽のグラヴィティー/ Fayray','YURA・YURA～Vibration/ Fayray','Powder Veil / Fayray','WHITE BREATH / T.M.Revolution',"Burnin' X'mas / T.M.Revolution",'HOT LIMIT / T.M.Revolution','WILD RUSH / T.M.Revolution','CRAZY JET / Iceman','Shining Collection / Iceman','DARK HALF～TOUCH YOUR DARKNESS / Iceman','LOST COMPLEX / Iceman','Something feel like Heaven / Iceman & T.M.Revolution'],
 'D2': ['Spicy Marmalade / コタニキンヤ','Time in my Heart / コタニキンヤ','Blind Game again / コタニキンヤ','Keyboard Solo〜Piano Solo / Daisuke Asakura','LEMON TEA / Mad Soldiers','Strike Back of PSYCO / Iceman','Expander Drive Machine〜発展途上人型アンドロイドの見た夢 / Iceman','FATE WEATHER / Iceman','GALAXY GANG / Iceman','Shining Collection / Iceman','陽炎-KAGEROH-〜月虹-GEKKOH- / the end of genesis T.M.R. evolution turbo type D'],
 'D3': ["Navigator's Talk 1 / Mad Soldiers",'LEMON TEA / Mad Soldiers','Boys Jump The Midnight / Mad Soldiers',"Navigator's Talk 2 / Mad Soldiers",'Spicy Marmalade / コタニキンヤ','灼熱BLADE / コタニキンヤ','高熱BLOOD / コタニキンヤ','Blind Game again /コタニキンヤ',"Navigator's Talk 3 / Mad Soldiers",'GATE Ⅱ～sensitive gate / Daisuke Asakura','THE ELECTROMANCER(KANASHIMINO KAWAWO YOROKOBINO OKAWO）/ Daisuke Asakura','TRY AGAIN / Daisuke Asakura','Neo Age / Daisuke Asakura',"Navigator's Talk 4 / Mad Soldiers",'陽炎-KAGEROH- / the end of genesis T.M.R. evolution turbo type D','月虹-GEKKOH- / the end of genesis T.M.R. evolution turbo type D','雪幻-winter dust- / the end of genesis T.M.R. evolution turbo type D','WHITE BREATH / the end of genesis T.M.R. evolution turbo type D',"Navigator's Talk 5 / Mad Soldiers",'dope light / Iceman','Beauty and Beast 0\'00" / Iceman','FATE WEATHER / Iceman','Shining Collection / Iceman','Genetic Bomb / Iceman',"Navigator's Talk 6 / Mad Soldiers",'DA’s Party 2000 / Iceman・the end of genesis T.M.R. evolution turbo type D・コタニキンヤ'],
}

# ---- consistency checks: every Sony track must be accounted for ----------------
used = {'D1': set(), 'D2': set(), 'D3': set()}
for s in SHOWS:
    for r in s['rows']:
        if r[0] == 'G': continue
        bd = r[4]
        if bd and bd[1]:
            k = bd[0].rstrip('*')
            assert bd[1] in SONY_D[k], (s['id'], r)
            used[k].add(bd[1])
used['D2'].add('Keyboard Solo〜Piano Solo / Daisuke Asakura')  # the ('Q') block
for k, lst in SONY_D.items():
    missing = [t for t in lst if t not in used[k] and not t.startswith("Navigator's Talk")]
    assert not missing, (k, missing)
# D3 (unique) must really be unique among the Yoyogi shows, D3* really multiple.
yo = [s for s in SHOWS if s['disc'] == 'DISC 3']
cnt = {}
for s in yo:
    seen = set()
    for r in s['rows']:
        if r[0] != 'G' and r[4] and r[4][0].startswith('D3'):
            seen.add(r[4][1])
    for t in seen: cnt[t] = cnt.get(t, 0) + 1
for s in yo:
    for r in s['rows']:
        if r[0] != 'G' and r[4] and r[4][0].startswith('D3'):
            assert (r[4][0] == 'D3*') == (cnt[r[4][1]] > 1), (s['id'], r)

def split_artist(t):
    # Sony is inconsistent about spaces around the slash ('Blind Game again /コタニキンヤ').
    a, _, b = t.rpartition('/')
    return (a.strip(), b.strip()) if a else (t, '')

def norm(t):
    import unicodedata, re
    t = unicodedata.normalize('NFKC', t).lower()
    t = split_artist(t)[0]
    return re.sub(r"[\s'’”\"〜～\-・()（）.!?]", '', t)

e = html.escape

def stats(s):
    songs = [r for r in s['rows'] if r[0] != 'G' and r[0] and r[1] != 'MC']
    oa = sum(1 for r in songs if r[3])
    vhs = sum(1 for r in songs if r[2])
    bd = sum(1 for r in songs if r[4] and r[4][0] != 'Q')
    q = sum(1 for r in songs if r[4] and r[4][0] == 'Q')
    return len(songs), oa, vhs, bd, q

def bd_cell(bd):
    if not bd: return '<td class="m no">―</td>'
    k = bd[0]
    if k == 'Q': return '<td class="m q" title="公式の曲目からは特定できない">?</td>'
    if k == 'D3*': return '<td class="m bd multi" title="代々木の複数公演で演奏。どの回の映像かは公式に記載なし">D3<sup>*</sup></td>'
    return f'<td class="m bd">{e(k)}</td>'

out = []
for s in SHOWS:
    n, oa, vhs, bd, q = stats(s)
    rows = []
    for r in s['rows']:
        if r[0] == 'G':
            note = f'<span class="gn">{e(r[2])}</span>' if r[2] else ''
            rows.append(f'<tr class="g"><th colspan="5" scope="rowgroup">{e(r[1])}{note}</th></tr>')
            continue
        no, title, v, o, b = r
        sub = ''
        if b and b[1] and norm(b[1]) != norm(title):
            sub = f'<span class="sony">BD表記: {e(split_artist(b[1])[0])}</span>'
        cls = []
        if v and not b: cls.append('lost')
        if b and b[0] != 'Q' and not v and s['disc'] in ('DISC 1', 'DISC 2'): cls.append('new')
        c = f' class="{" ".join(cls)}"' if cls else ''
        rows.append(
          f'<tr{c}><td class="no">{e(no)}</td><td class="t">{e(title)}{sub}</td>'
          f'<td class="m{" oa" if o else " no"}">{"●" if o else "―"}</td>'
          f'<td class="m{" vhs" if v else " no"}">{"●" if v else "―"}</td>'
          f'{bd_cell(b)}</tr>')
    note = ''
    if s['oa_all']:
        note = '<p class="sn">ブログの記載「全てViewsicにて中継あり」により、放送は全曲●。</p>'
    if s['disc'] == 'DISC 3':
        note = ('<p class="sn">当時VHSは出ていません(公式の記載も横浜アリーナと東京ベイNKホールの2公演のみ)。'
                'BDのDISC 3は「代々木 1999.12.31～2000.1.1」としか書かれていないため、'
                '代々木の複数公演で演奏された曲は <b>D3<sup>*</sup></b>(どの回の映像かは未確定)にしています。</p>')
    qline = f'<span>BD ? {q}</span>' if q else ''
    out.append(f'''
  <section class="show" id="{s['id']}">
    <div class="sh">
      <div class="date">{e(s['date'])}</div>
      <h2>{e(s['name'])}</h2>
      <div class="venue">{e(s['venue'])} <span class="disc">BD {e(s['disc'])}</span></div>
      <div class="stat"><span>演奏 {n}</span><span>放送 {oa}</span><span>VHS {vhs}</span><span>BD {bd}</span>{qline}</div>
    </div>
    {note}
    <div class="tw"><table>
      <thead><tr><th class="no">#</th><th>曲</th><th class="m">放送</th><th class="m">VHS</th><th class="m">BD</th></tr></thead>
      <tbody>
{chr(10).join(rows)}
      </tbody>
    </table></div>
  </section>''')

# DISC 3 matrix: which Yoyogi show played each Sony track, and was it broadcast.
yshort = [('y1231a', '12/31<br>Grand Finale'), ('y1231b', '12/31<br>Count Down'), ('y0101', '1/1<br>Happy New Year')]
mrows = []
for t in SONY_D['D3']:
    # Not part of any show's setlist: the navigator segments are the Viewsic broadcast
    # itself, carried over as aired (per the site owner).
    if t.startswith("Navigator's Talk"):
        mrows.append(f'<tr class="talk"><td class="t">{e(split_artist(t)[0])}<span class="sony">Mad Soldiers(ナビゲーター)</span></td><td class="m oa" colspan="3">☆ Viewsic放送のナビ部分をそのまま収録</td></tr>')
        continue
    cells = []
    for sid, _ in yshort:
        s = next(x for x in SHOWS if x['id'] == sid)
        hit = [r for r in s['rows'] if r[0] != 'G' and r[4] and r[4][1] == t]
        if not hit: cells.append('<td class="m no">―</td>')
        elif any(r[3] for r in hit): cells.append('<td class="m oa">☆</td>')
        else: cells.append('<td class="m pl">演奏</td>')
    title, artist = split_artist(t)
    mrows.append(f'<tr><td class="t">{e(title)}<span class="sony">{e(artist)}</span></td>{"".join(cells)}</tr>')

# summary lists
lost = []; new = []
for s in SHOWS[:2]:
    for r in s['rows']:
        if r[0] == 'G': continue
        if r[2] and not r[4]: lost.append((s['date'].split()[0], r[1]))
        if r[4] and r[4][0] not in ('Q',) and not r[2]: new.append((s['date'].split()[0], r[1]))

def li(items): return ''.join(f'<li><span class="d">{e(d)}</span>{e(t)}</li>' for d, t in items)

page = f'''<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>DA’s Party 1999 収録対照表｜浅倉大介 クレジットデータベース</title>
<meta name="description" content="1999年のDA’s Party 5公演のセットリストと、Viewsic放送・当時のVHS・2026年のBlu-ray『DA’s Party 1999 SPECIAL EDITION』の収録を1曲ずつ突き合わせた一覧。">
<link rel="canonical" href="https://endohoheto.github.io/da_db_site/dasparty1999/">
<link rel="icon" type="image/png" sizes="256x256" href="../favicon.png">
<link rel="icon" type="image/png" sizes="32x32" href="../icon-32.png">
<link rel="apple-touch-icon" href="../icon-180.png">
<meta name="theme-color" content="#05070d">
<style>
:root {{ --bg:#05070d; --card:#0a0f1a; --cyan:#00fff2; --purple:#b07cff; --amber:#ffc46b;
  --pink:#ff7ab8; --text:#d6f7f5; --dim:#63808c; --border:rgba(0,255,242,0.18); }}
* {{ box-sizing:border-box; }}
body {{ margin:0; background:var(--bg); color:var(--text);
  font-family:"Share Tech Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
  padding:28px 16px 40px;
  background-image:linear-gradient(rgba(0,255,242,0.045) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0,255,242,0.045) 1px, transparent 1px);
  background-size:42px 42px; }}
main {{ max-width:760px; margin:0 auto; }}
a {{ color:var(--cyan); }}
.back {{ font-size:11px; letter-spacing:2px; text-decoration:none; }}
header.top {{ margin:16px 0 22px; border:1px solid var(--purple); border-radius:6px; padding:22px;
  background:linear-gradient(135deg, rgba(176,124,255,0.10), rgba(0,255,242,0.04)); }}
.kind {{ font-size:10.5px; letter-spacing:3px; color:var(--purple); }}
h1 {{ margin:8px 0 6px; font-size:clamp(18px, 4.6vw, 24px); color:var(--cyan); font-weight:normal;
  letter-spacing:1px; line-height:1.4; }}
.lead {{ color:var(--dim); font-size:12.5px; line-height:1.9; margin:0; }}
.legend {{ display:flex; flex-wrap:wrap; gap:6px 14px; margin-top:14px; font-size:11px; color:var(--dim); }}
.legend b {{ font-weight:normal; }}
.oa, .legend .oa {{ color:var(--amber); }}
.vhs, .legend .vhs {{ color:var(--pink); }}
.bd, .legend .bd {{ color:var(--cyan); }}
.q {{ color:var(--purple); }}
.no {{ color:rgba(99,128,140,0.55); }}
.cards {{ display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:10px; margin:0 0 22px; }}
.card {{ border:1px solid var(--border); border-radius:6px; background:var(--card); padding:14px 16px; }}
.card h2 {{ margin:0 0 8px; font-size:11px; letter-spacing:2.5px; color:var(--purple); font-weight:normal; }}
.card ul {{ margin:0; padding:0; list-style:none; font-size:12px; line-height:1.9; }}
.card .d {{ color:var(--dim); margin-right:8px; font-size:11px; }}
.card p {{ margin:0; font-size:12px; line-height:1.85; color:var(--dim); }}
nav.toc {{ display:flex; flex-wrap:wrap; gap:6px; margin:0 0 22px; }}
nav.toc a {{ border:1px solid var(--border); border-radius:3px; padding:6px 9px; font-size:11px;
  text-decoration:none; color:var(--dim); }}
nav.toc a:hover {{ color:var(--cyan); border-color:var(--cyan); }}
section.show, section.matrix {{ border:1px solid var(--border); border-radius:6px; background:var(--card);
  padding:18px 16px 12px; margin:0 0 18px; }}
.sh .date {{ color:var(--cyan); font-size:15px; letter-spacing:1px; }}
.sh h2 {{ margin:4px 0 2px; font-size:14px; font-weight:normal; line-height:1.5; color:var(--text); }}
.sh .venue {{ color:var(--dim); font-size:12px; }}
.sh .disc {{ margin-left:8px; border:1px solid var(--cyan); color:var(--cyan); border-radius:2px;
  padding:0 5px; font-size:10px; letter-spacing:1px; }}
.stat {{ display:flex; flex-wrap:wrap; gap:4px 12px; margin:10px 0 4px; font-size:11px; color:var(--dim); }}
.stat span:nth-child(2) {{ color:var(--amber); }}
.stat span:nth-child(3) {{ color:var(--pink); }}
.stat span:nth-child(4) {{ color:var(--cyan); }}
.sn {{ font-size:11px; color:var(--dim); line-height:1.8; margin:6px 0 8px; }}
.tw {{ overflow-x:auto; }}
table {{ width:100%; border-collapse:collapse; font-size:12.5px; }}
th, td {{ padding:6px 6px; border-bottom:1px solid rgba(0,255,242,0.08); text-align:left;
  vertical-align:top; font-weight:normal; }}
thead th {{ color:var(--dim); font-size:10.5px; letter-spacing:1.5px; border-bottom:1px solid var(--border); }}
th.no, td.no {{ width:2.2em; color:var(--dim); font-size:11px; }}
.m {{ width:3.6em; text-align:center; white-space:nowrap; }}
td.t {{ line-height:1.55; word-break:break-word; }}
.sony {{ display:block; font-size:10.5px; color:var(--dim); margin-top:2px; }}
tr.g th {{ color:var(--purple); font-size:11px; letter-spacing:1.5px; padding-top:12px; }}
.gn {{ color:var(--dim); margin-left:8px; letter-spacing:0; font-size:10.5px; }}
tr.lost td.t {{ color:var(--pink); }}
tr.new td.t {{ color:var(--cyan); }}
sup {{ font-size:9px; }}
td.pl {{ color:var(--text); font-size:11px; }}
/* Three show columns with two-line headings: nowrap would let them take the row
   and squeeze the title to a few characters on a phone, so the widths are fixed. */
section.matrix table {{ table-layout:fixed; }}
section.matrix .m {{ width:5.4em; white-space:normal; font-size:10.5px; line-height:1.4; }}
tr.talk td.t {{ color:var(--dim); }}
tr.talk td.m {{ white-space:normal; font-size:11px; }}
footer {{ color:var(--dim); font-size:11px; line-height:1.9; margin-top:26px; }}
@media (max-width:480px) {{
  header.top {{ padding:18px 16px; }}
  section.show, section.matrix {{ padding:16px 10px 10px; }}
  th, td {{ padding:6px 4px; }}
  table {{ font-size:12px; }}
  .m {{ width:3em; }}
}}
</style>
</head>
<body>
<main>
  <a class="back" href="../">◂ 浅倉大介 クレジットデータベース</a>

  <header class="top">
    <div class="kind">SPECIAL ― DA’s Party 1999</div>
    <h1>DA’s Party 1999<br>収録対照表</h1>
    <p class="lead">1999年のDA’s Party 5公演のセットリストを1曲ずつ並べ、
      Viewsicでの放送・当時のVHS・2026年10月28日発売のBlu-ray
      『DA’s Party 1999 SPECIAL EDITION』に入っているかを突き合わせました。</p>
    <div class="legend">
      <span><b class="oa">●</b> 放送(Viewsic)</span>
      <span><b class="vhs">●</b> VHS収録</span>
      <span><b class="bd">D1/D2/D3</b> BD収録ディスク</span>
      <span><b class="bd">D3<sup>*</sup></b> 代々木のどの回か未確定</span>
      <span><b class="q">?</b> 公式曲目から特定不可</span>
    </div>
  </header>

  <div class="cards">
    <div class="card">
      <h2>VHSにあってBDの曲目に無い</h2>
      <ul>{li(lost)}</ul>
    </div>
    <div class="card">
      <h2>VHS未収録 → BDで初収録</h2>
      <ul>{li(new)}</ul>
      <p style="margin-top:6px">代々木の3公演はVHSが無く、DISC 3の全曲が初商品化。</p>
    </div>
    <div class="card">
      <h2>代々木の放送とDISC 3</h2>
      <p>代々木3公演で放送(☆)のある曲のうち、DISC 3の曲目に無いのは
        1/1の「1000年の誓い」だけ。
        Mad SoldiersのNavigator's Talk 1〜6は、Viewsic放送のナビ部分そのまま。</p>
    </div>
  </div>

  <nav class="toc">
    {''.join(f'<a href="#{s["id"]}">{e(s["date"].split()[0])} {e(s["short"])}</a>' for s in SHOWS)}
    <a href="#disc3">DISC 3 対照</a>
  </nav>
{''.join(out)}

  <section class="matrix" id="disc3">
    <div class="sh">
      <div class="date">BD DISC 3</div>
      <h2>DA's Party Special Yoyogi National Stadium 1999.12.31～2000.1.1</h2>
      <div class="venue">公式の曲目と、代々木3公演のどこで演奏されたか</div>
    </div>
    <p class="sn"><b class="oa">☆</b> その回で演奏され放送あり / 演奏 = 演奏はあるが放送の記載なし / ― = その回では演奏なし</p>
    <div class="tw"><table>
      <thead><tr><th>DISC 3 曲目(公式)</th>{''.join(f'<th class="m">{h}</th>' for _, h in yshort)}</tr></thead>
      <tbody>
{chr(10).join(mrows)}
      </tbody>
    </table></div>
  </section>

  <footer>
    出典<br>
    セットリスト・VHS収録(★)・放送(☆): <a href="{BLOG}" target="_blank" rel="noopener">全DA's Party セットリスト(ちっちきちっちっちっちっち)</a><br>
    Blu-ray の曲目: <a href="{SONY}" target="_blank" rel="noopener">ソニーミュージック オフィシャルサイト(2026.09.15)</a><br>
    曲名はセットリスト側の表記。BDの曲目表記が違うものは「BD表記」として併記しています。
  </footer>
</main>
</body>
</html>
'''
open(sys.argv[1], 'w', encoding='utf-8').write(page)
print('lost', lost); print('new', new)
for s in SHOWS: print(s['id'], stats(s))
