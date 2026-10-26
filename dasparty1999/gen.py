# Generates dasparty1999/index.html:  python3 dasparty1999/gen.py dasparty1999/index.html
# Sources, and nothing else:
#   - setlists (order, titles, who played): the database's own live list, as the site
#     shows it (getPerformanceSetlist), 2026-10-26
#   - ★ (VHS) and ☆ (broadcast): the owner's blog, matched to the site's rows
#   - BD contents: the Sony Music official page only
#   - 2/14 and 8/29 VHS track lists: the VHS jackets (photos from the owner); each is
#     the same list, in the same order, as Sony's DISC 1 / DISC 2
#   - corrections from the owner, each commented where it is applied
import html, sys

BLOG = 'https://chikichikichi.hatenablog.com/entry/2019/09/02/004516'
SONY = 'https://www.sonymusic.co.jp/artist/DaisukeAsakura/info/586852'

# row: (no, title, vhs, oa, bd)
#   bd: None | ('D1', sony_title_or_None) | ('Q', None) unknown block | ('D3', sony) | ('D3*', sony)
# group header: ('G', name, note)
# unnumbered: no=''

def G(name, note=''): return ('G', name, note)
# The broadcast (not the setlist) had a navigator between acts, as at the year-end
# shows; whether it is on the BD is not known (per the site owner). Placed between
# the acts, not at exact positions.
NAV = ('G', "Navigator's Talk", '', 'nav')
NAV_OPEN = ('G', "Navigator's Talk", 'オープニング', 'nav')
# Medleys: the site lists each part as a row; the first row is the piece, the rest are
# its parts. A medley is one song in the count and gets one number.
MEDLEY = {('v0214', '05'): ('06', '07', '08'), ('s0829', '09'): ('10', '11', '12', '13')}
PART = {(sid, n) for (sid, _), parts in MEDLEY.items() for n in parts}
# A row: number, title, on the VHS (★), broadcast (☆), the BD track it is on.
# The optional note is shown under the title (the original artist of a cover, …).
NOTE = {}
def R(no, title, vhs, oa, bd, note=''):
    if note: NOTE[(len(SHOWS), no)] = note
    return (no, title, vhs, oa, bd)
# A music video screened between acts (the site's 「映像のみ」 rows): not a performance.
# It is the next act's video, so it sits at the top of that act's block.
def MV(no, title): return ('G', title, no, 'mv')

SHOWS = []

# ---- 1999/02/14 -------------------------------------------------------------
SHOWS.append(dict(
  id='v0214', short='横浜アリーナ', date='1999.2.14 (SUN)', venue='横浜アリーナ',
  name='DA’s Special Valentine Party!!!', oa_all=True, disc='DISC 1',
  rows=[
    G('MC-K2'),
    R('01', 'Spicy Marmalade', True, True, ('D1', 'Spicy Marmalade /コタニキンヤ')),
    R('02', "God You're SAVE", False, True, None),
    R('03', 'Blind Game again', True, True, None),
    G('浅倉大介'),
    R('04', 'E.v.o.l.u.t.i.o.n', True, True, ('D1', 'E.v.o.l.u.t.i.o.n for Valentine / Daisuke Asakura')),
    # 05–08 are one piano medley. Only its last song, Image of Tomorrow, is on the VHS and
    # the BD (owner; the blog's ★ is on that line), as Image of Tomorrow for Valentine.
    R('05', "TEAR'S LIBERATION", False, True, None, 'Pf Solo'),
    R('06', 'THE ELECTROMANCER(KANASHIMINO KAWAWO YOROKOBINO OKAWO)', False, True, None),
    R('07', 'Melody Fair', False, True, None),
    R('08', 'Image of Tomorrow', True, True, ('D1', 'Image of Tomorrow for Valentine / Daisuke Asakura')),
    R('09', 'SIREN’S MELODY', True, True, ('D1', "SIREN'S MELODY / Daisuke Asakura")),
    G('Fayray'),
    R('10', '太陽のグラヴィティー', True, True, ('D1', '太陽のグラヴィティー/ Fayray')),
    R('11', 'YURA・YURA ～Vibration', True, True, ('D1', 'YURA・YURA～Vibration/ Fayray')),
    R('12', 'Powder Veil', True, True, ('D1', 'Powder Veil / Fayray')),
    G('T.M.Revolution'),
    R('13', 'WHITE BREATH', True, True, ('D1', 'WHITE BREATH / T.M.Revolution')),
    R('14', '蒼い霹靂', False, True, None),
    R('15', 'THUNDERBIRD', True, True, None),
    R('16', "Burnin' X'mas", True, True, ('D1', "Burnin' X'mas / T.M.Revolution")),
    R('17', 'HOT LIMIT', True, True, ('D1', 'HOT LIMIT / T.M.Revolution')),
    R('18', 'WILD RUSH', True, True, ('D1', 'WILD RUSH / T.M.Revolution')),
    G('Iceman'),
    R('19', 'CRAZY JET', True, True, ('D1', 'CRAZY JET / Iceman')),
    R('20', "WHAT'S WRONG?", False, True, None),
    R('21', 'Dizzy Boogie', False, True, None),
    R('22', 'BEAT MY LIFE', False, True, None),
    R('23', 'GALAXY GANG', True, True, None),
    R('24', 'Shining Collection', True, True, ('D1', 'Shining Collection / Iceman')),
    R('25', 'DARK HALF 〜TOUCH YOUR DARKNESS', True, True, ('D1', 'DARK HALF～TOUCH YOUR DARKNESS / Iceman')),
    R('26', 'LOST COMPLEX', True, True, ('D1', 'LOST COMPLEX / Iceman')),
    G('Iceman & T.M.Revolution'),
    R('27', 'Something feel like Heaven', True, True, ('D1', 'Something feel like Heaven / Iceman & T.M.Revolution')),
    G('All'),
    R('28', 'MC', False, True, None),
  ]))

# ---- 1999/08/29 -------------------------------------------------------------
SHOWS.append(dict(
  id='s0829', short='東京ベイNK', date='1999.8.29 (SUN)', venue='東京ベイNKホール',
  name='DA’s Party Special Summer Festival!!!', oa_all=True, disc='DISC 2',
  rows=[
    # The broadcast has the navigator at the opening and at the start of every act
    # (owner); whether it is on the BD is not known.
    NAV_OPEN,
    G('コタニキンヤ'),
    NAV,
    R('01', 'Spicy Marmalade', True, True, ('D2', 'Spicy Marmalade / コタニキンヤ')),
    R('02', 'Time in my heart', True, True, ('D2', 'Time in my Heart / コタニキンヤ')),
    # No ★ on the blog, but it is on the VHS (owner's correction; the VHS jacket lists it).
    R('03', 'Blind Game Again', True, True, ('D2', 'Blind Game again / コタニキンヤ')),
    G('Fayray'),
    NAV,
    R('04', 'YURA・YURA ～Vibration', False, True, None),
    R('05', '太陽のグラヴィティー', False, True, None),
    R('06', 'Same night, Same face', False, True, None),
    R('07', 'Craving', False, True, None),
    G('浅倉大介'),
    NAV,
    # The VHS jacket and Sony list one track, Keyboard Solo〜Piano Solo; the ★ songs are it.
    R('08', 'SEQUENCE MEDITATION ～超電導思考回路～', True, True, ('D2', 'Keyboard Solo〜Piano Solo / Daisuke Asakura')),
    # 09–13 are one piece, a piano medley; the site lists its parts (owner).
    R('09', 'GATEⅡ -sensitive gate', True, True, ('D2', 'Keyboard Solo〜Piano Solo / Daisuke Asakura')),
    R('10', 'Toy Box In The Morning', True, True, ('D2', 'Keyboard Solo〜Piano Solo / Daisuke Asakura')),
    R('11', 'ENDLESS SUMMER 〜君が滲んだ夏〜', True, True, ('D2', 'Keyboard Solo〜Piano Solo / Daisuke Asakura')),
    R('12', 'Mickey Mouse Club March', True, True, ('D2', 'Keyboard Solo〜Piano Solo / Daisuke Asakura')),
    R('13', '突然シーモアが！', True, True, ('D2', 'Keyboard Solo〜Piano Solo / Daisuke Asakura')),
    R('14', 'GATEⅠ -gate odyssey', True, True, ('D2', 'Keyboard Solo〜Piano Solo / Daisuke Asakura')),
    G('木村由姫'),
    NAV,
    R('15', 'Deep Sky Heart', False, True, None),
    R('16', 'Fall in YOU', False, True, None),
    R('17', 'Windy scene', False, True, None),
    R('18', 'Summer Rain', False, True, None),
    G('Mad Soldiers'),
    NAV,
    R('19', 'LEMON TEA', True, True, ('D2', 'LEMON TEA / Mad Soldiers'), '原曲: SHEENA & THE ROKKETS'),
    G('pool bit boys'),
    NAV,
    R('20', 'SPIRAL', False, True, None),
    R('21', 'Scarletの憂鬱', False, True, None),
    R('22', 'Venus Accident', False, True, None),
    R('23', 'EARTH STRIKER', False, True, None),
    G('Iceman'),
    NAV,
    R('24', 'Strike Back of PSYCO', True, True, ('D2', 'Strike Back of PSYCO / Iceman')),
    R('25', 'Wish Matrix', False, True, None),
    R('26', 'Expander Drive Machine～発展途上人型アンドロイドの見た夢', True, True, ('D2', 'Expander Drive Machine〜発展途上人型アンドロイドの見た夢 / Iceman')),
    R('27', 'FATE WEATHER', True, True, ('D2', 'FATE WEATHER / Iceman')),
    R('28', 'GALAXY GANG', True, True, ('D2', 'GALAXY GANG / Iceman')),
    R('29', 'Shining Collection', True, True, ('D2', 'Shining Collection / Iceman')),
    G('the end of genesis T.M.R.evolution turbo type D'),
    NAV,
    R('30', '陽炎-KAGEROH-', True, True, ('D2', '陽炎-KAGEROH-〜月虹-GEKKOH- / the end of genesis T.M.R. evolution turbo type D')),
    R('31', '月虹 -GEKKOH-', True, True, ('D2', '陽炎-KAGEROH-〜月虹-GEKKOH- / the end of genesis T.M.R. evolution turbo type D')),
    G('All'),
    NAV,
    R('32', 'MC', False, True, None),
  ]))

# ---- Yoyogi: BD DISC 3 does not say which of the three shows a track is from. --
# The rows only say "this song is on DISC 3"; which performance it came from is worked
# out below (YD), from the broadcast marks.
SHOWS.append(dict(
  id='y1231a', short='Grand Finale', date='1999.12.31 (FRI)', venue='国立代々木競技場 第一体育館',
  name="DA's Party Grand Finale 1999", oa_all=False, disc='DISC 3',
  rows=[
    G('浅倉大介'),
    R('01', 'white dimension', False, False, None),
    R('02', 'CAUTION! / psychedelic mix', False, False, None),
    R('03', 'GATEⅡ -sensitive gate', False, False, ('D3', 'GATE Ⅱ～sensitive gate / Daisuke Asakura')),
    R('04', 'THE ELECTROMANCER(KANASHIMINO KAWAWO YOROKOBINO OKAWO)', False, True, ('D3', 'THE ELECTROMANCER(KANASHIMINO KAWAWO YOROKOBINO OKAWO）/ Daisuke Asakura')),
    R('05', '夢を見たいから', False, False, None),
    R('06', '1000年の誓い', False, False, None),
    R('07', 'SIREN’S MELODY', False, False, None),
    G('Mad Soldiers'),
    R('08', 'Boys Jump The Midnight', False, False, ('D3', 'Boys Jump The Midnight / Mad Soldiers'), '原曲: THE STREET SLIDERS'),
    R('09', 'LEMON TEA', False, False, ('D3', 'LEMON TEA / Mad Soldiers'), '原曲: SHEENA & THE ROKKETS'),
    G('コタニキンヤ'),
    MV('10', '高熱BLOOD'),
    R('11', 'Spicy Marmalade', False, False, ('D3', 'Spicy Marmalade / コタニキンヤ')),
    R('12', '灼熱BLADE', False, False, ('D3', '灼熱BLADE / コタニキンヤ')),
    R('13', 'Blind Game Again', False, False, ('D3', 'Blind Game again /コタニキンヤ')),
    R('14', '高熱BLOOD', False, False, ('D3', '高熱BLOOD / コタニキンヤ')),
    G('the end of genesis T.M.R.evolution turbo type D'),
    MV('15', '雪幻 -winter dust-'),
    R('16', '陽炎-KAGEROH-', False, False, ('D3', '陽炎-KAGEROH- / the end of genesis T.M.R. evolution turbo type D')),
    R('17', '月虹 -GEKKOH-', False, False, ('D3', '月虹-GEKKOH- / the end of genesis T.M.R. evolution turbo type D')),
    R('18', '雪幻 -winter dust-', False, False, ('D3', '雪幻-winter dust- / the end of genesis T.M.R. evolution turbo type D')),
    G('Iceman'),
    MV('19', 'Genetic Bomb'),
    R('20', 'white dimension', False, False, None),
    R('21', 'dope light', False, False, ('D3', 'dope light / Iceman')),
    R('22', 'Wish Matrix', False, False, None),
    R('23', 'Beauty and Beast 0\'00"', False, False, ('D3', 'Beauty and Beast 0\'00" / Iceman')),
    R('24', 'BLEACHING', False, False, None),
    R('25', 'ICE BREAKER', False, False, None),
    R('26', 'FATE WEATHER', False, True, ('D3', 'FATE WEATHER / Iceman')),
    R('27', 'Shining Collection', False, True, ('D3', 'Shining Collection / Iceman')),
    R('28', 'Genetic Bomb', False, False, ('D3', 'Genetic Bomb / Iceman')),
    G('All'),
    R('29', 'MC', False, False, None),
  ]))

SHOWS.append(dict(
  id='y1231b', short='Count Down', date='1999.12.31 (FRI)', venue='国立代々木競技場 第一体育館',
  name="DA's Party Let's Count Down 99〜00", oa_all=False, disc='DISC 3',
  rows=[
    G('コタニキンヤ'),
    R('01', 'Spicy Marmalade', False, False, ('D3', 'Spicy Marmalade / コタニキンヤ')),
    R('02', '憂鬱なSeven days', False, False, None),
    G('Iceman'),
    R('03', 'Eyes Bright', False, False, None),
    R('04', 'Dear My Friend 〜make your shine way', False, False, None),
    R('05', 'DAYDREAM BELIEVER', False, False, None),
    G('the end of genesis T.M.R.evolution turbo type D'),
    R('06', 'WHITE BREATH', False, False, ('D3', 'WHITE BREATH / the end of genesis T.M.R. evolution turbo type D')),
    R('07', "I don't want to miss a thing", False, False, None, '原曲: AEROSMITH'),
    R('08', 'HEART OF SWORD ～夜明け前～', False, False, None),
    G('All'),
    R('09', 'COUNT DOWN', False, False, None),
    R('10', 'DYNAMITE PASSION', False, False, None),
    R('11', 'GALAXY GANG', False, False, None),
    R('12', 'Paradise City', False, False, None),
    # The TV-size cut was broadcast but is not on the BD; the BD has the full song, no.14 (owner).
    R('13', "DA's PARTY 2000 -TV Size ver-", False, True, None),
    R('14', "DA's PARTY 2000", False, True, ('D3', 'DA’s Party 2000 / Iceman・the end of genesis T.M.R. evolution turbo type D・コタニキンヤ')),
  ]))

SHOWS.append(dict(
  id='y0101', short='Happy New Year', date='2000.1.1 (SAT)', venue='国立代々木競技場 第一体育館',
  name="DA's Party Happy New Year Welcome 2000",
  oa_all=False, disc='DISC 3',
  rows=[
    G('Mad Soldiers'),
    R('01', 'LEMON TEA', False, True, ('D3', 'LEMON TEA / Mad Soldiers'), '原曲: SHEENA & THE ROKKETS'),
    R('02', 'Boys Jump The Midnight', False, True, ('D3', 'Boys Jump The Midnight / Mad Soldiers'), '原曲: THE STREET SLIDERS'),
    G('コタニキンヤ'),
    MV('03', '高熱BLOOD'),
    R('04', 'Spicy Marmalade', False, True, ('D3', 'Spicy Marmalade / コタニキンヤ')),
    R('05', '灼熱BLADE', False, True, ('D3', '灼熱BLADE / コタニキンヤ')),
    R('06', '高熱BLOOD', False, True, ('D3', '高熱BLOOD / コタニキンヤ')),
    R('07', 'Blind Game Again', False, True, ('D3', 'Blind Game again /コタニキンヤ')),
    G('浅倉大介'),
    R('08', 'white dimension', False, False, None),
    R('09', 'CAUTION!', False, False, None),
    R('10', 'GATEⅡ -sensitive gate', False, True, ('D3', 'GATE Ⅱ～sensitive gate / Daisuke Asakura')),
    R('11', 'THE ELECTROMANCER(KANASHIMINO KAWAWO YOROKOBINO OKAWO)', False, True, ('D3', 'THE ELECTROMANCER(KANASHIMINO KAWAWO YOROKOBINO OKAWO）/ Daisuke Asakura')),
    R('12', 'TRY AGAIN', False, True, ('D3', 'TRY AGAIN / Daisuke Asakura')),
    R('13', '1000年の誓い', False, True, None),
    R('14', 'Neo Age', False, True, ('D3', 'Neo Age / Daisuke Asakura')),
    G('Iceman'),
    MV('15', 'Genetic Bomb'),
    R('16', 'white dimension', False, False, None),
    R('17', 'dope light', False, True, ('D3', 'dope light / Iceman')),
    R('18', 'Beauty and Beast 0\'00"', False, True, ('D3', 'Beauty and Beast 0\'00" / Iceman')),
    R('19', 'Genetic Bomb', False, True, ('D3', 'Genetic Bomb / Iceman')),
    G('the end of genesis T.M.R.evolution turbo type D'),
    R('20', '陽炎-KAGEROH-', False, True, ('D3', '陽炎-KAGEROH- / the end of genesis T.M.R. evolution turbo type D')),
    R('21', '月虹 -GEKKOH-', False, True, ('D3', '月虹-GEKKOH- / the end of genesis T.M.R. evolution turbo type D')),
    R('22', '雪幻 -winter dust-', False, True, ('D3', '雪幻-winter dust- / the end of genesis T.M.R. evolution turbo type D')),
    R('23', 'HEART OF SWORD 〜夜明け前〜', False, False, None),
    R('24', 'BLACK OR WHITE?', False, False, None),
    # The site and the blog both also have WHITE BREATH before 陽炎; that is a mistake.
    # It was played once, here, and this is the broadcast one (owner's correction).
    # The earlier row is dropped and the rows between are renumbered.
    R('25', 'WHITE BREATH', False, True, ('D3', 'WHITE BREATH / the end of genesis T.M.R. evolution turbo type D')),
    G('All'),
    R('26', "DA's PARTY 2000", False, False, ('D3', 'DA’s Party 2000 / Iceman・the end of genesis T.M.R. evolution turbo type D・コタニキンヤ')),
    R('27', 'MC', False, False, None),
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
for k, lst in SONY_D.items():
    missing = [t for t in lst if t not in used[k] and not t.startswith("Navigator's Talk")]
    assert not missing, (k, missing)
def split_artist(t):
    # Sony is inconsistent about spaces around the slash ('Blind Game again /コタニキンヤ').
    a, _, b = t.rpartition('/')
    return (a.strip(), b.strip()) if a else (t, '')

def norm(t):
    import unicodedata, re
    t = unicodedata.normalize('NFKC', t).lower()
    t = split_artist(t)[0]
    # NFKC has already turned ～ into ~, so the ASCII tilde has to go too.
    return re.sub(r"[\s'’”\"〜～~\-・()（）.!?]", '', t)

e = html.escape

# ---- spell everything the way Sony does ---------------------------------------
# Song, show and artist names follow the Sony page wherever Sony names them; the
# blog's spelling stays only for what Sony never mentions. Where the blog splits a
# performance more finely than Sony's track list (a medley, two songs Sony lists as
# one track, the TV-size cut), the blog's row is kept as it is and Sony's track
# title is shown under it.
KEEP = {('v0214', '08'),
        ('s0829', '08'), ('s0829', '09'), ('s0829', '10'), ('s0829', '11'),
        ('s0829', '12'), ('s0829', '13'), ('s0829', '14'),
        ('s0829', '30'), ('s0829', '31')}
SONY_NAME = {
  'v0214': "DA's SPECIAL Valentine Party!!! in Yokohama Arena",
  's0829': "DA's Party Special Summer Festival!!! In Tokyo Bay NK Hall",
}
SONY_ARTIST = {'the end of genesis T.M.R.evolution turbo type D': 'the end of genesis T.M.R. evolution turbo type D'}
sony_by_key = {}
for lst in SONY_D.values():
    for t in lst:
        title = split_artist(t)[0]
        sony_by_key.setdefault(norm(title), title)
ORIG = {}
for s in SHOWS:
    s['name'] = SONY_NAME.get(s['id'], s['name'])
    for old, new in SONY_ARTIST.items():
        s['name'] = s['name'].replace(old, new)
    rows = []
    for r in s['rows']:
        if r[0] == 'G':
            rows.append(('G', SONY_ARTIST.get(r[1], r[1])) + tuple(r[2:])); continue
        no, title, v, o, b = r
        # A KEEP row is a piece of a longer BD track, so the track title is not its name;
        # it can still be spelled Sony's way if Sony names the song elsewhere.
        if b and b[1] and (s['id'], no) not in KEEP:
            new = split_artist(b[1])[0]
        else:
            new = sony_by_key.get(norm(title), title)
        ORIG[(s['id'], no, new)] = title
        title = new
        rows.append((no, title, v, o, b))
    s['rows'] = rows

# ---- where each DISC 3 track came from ----------------------------------------
# Sony: DISC 3 is footage Viewsic broadcast from Yoyogi. So a DISC 3 track can only come
# from a performance that was broadcast — a ☆ in the blog. Where exactly one ☆
# performance of the song exists, that is the source; where two exist, both stay open.
# A performance that was not broadcast cannot be on the disc, even if the song is.
YSHOW = {'y1231a': '12/31 Grand Finale', 'y1231b': '12/31 Count Down', 'y0101': '1/1 Happy New Year'}
SRC = {}
for s_ in SHOWS:
    if s_['disc'] != 'DISC 3': continue
    for r in s_['rows']:
        if r[0] != 'G' and r[4] and r[3] and (s_['id'], r[0]) not in KEEP:
            SRC.setdefault(r[4][1], []).append((s_['id'], r[0]))
for t in SONY_D['D3']:
    if not t.startswith("Navigator's Talk"):
        assert SRC.get(t), ('DISC 3 track with no broadcast performance', t)
YD = {}
for s_ in SHOWS:
    if s_['disc'] != 'DISC 3': continue
    for r in s_['rows']:
        if r[0] == 'G' or not r[4]: continue
        key = (s_['id'], r[0]); src = SRC[r[4][1]]
        if key in src: YD[key] = ('D3' if len(src) == 1 else 'D3?', src)
        else: YD[key] = ('elsewhere', src)

# On the 2/14 VHS these three are in (edited, like much of the VHS — per the site
# owner) although the VHS credits don't list them. The VHS credits and Sony's DISC 1
# list are the same 16 songs in the same order, so DISC 1 is the VHS programme and
# has them too. Editing is not marked per song; one note at the top covers it.
UNLISTED = {('v0214', '03'), ('v0214', '15'), ('v0214', '23')}

def bd_code(s, r):
    if (s['id'], r[0]) in UNLISTED: return 'D1'
    if r[4] and s['disc'] == 'DISC 3': return YD[(s['id'], r[0])][0]
    return r[4][0] if r[4] else None

def stats(s):
    # MC and the count-down itself are on the setlist but are not songs
    songs = [r for r in s['rows'] if r[0] != 'G' and r[0] and r[1] not in ('MC', 'COUNT DOWN')
             and (s['id'], r[0]) not in PART]
    def whole(r):
        # a medley counts once, and is on the VHS/BD if any of its parts is
        parts = MEDLEY.get((s['id'], r[0]), ())
        return [r] + [x for x in s['rows'] if x[0] != 'G' and x[0] in parts]
    oa = sum(1 for r in songs if any(x[3] for x in whole(r)))
    vhs = sum(1 for r in songs if any(x[2] for x in whole(r)))
    bd = sum(1 for r in songs if any(bd_code(s, x) in ('D1', 'D2', 'D3', 'D3?') for x in whole(r)))
    q = sum(1 for r in songs if bd_code(s, r) == 'Q')
    return len(songs), oa, vhs, bd, q

DISC_LABEL = {'D1': 'DISC 1', 'D2': 'DISC 2', 'D3': 'DISC 3', 'D3?': 'DISC 3'}
def bd_cell(k):
    if k in (None, 'elsewhere'): return '<td class="m bdc no">―</td>'
    if k == 'Q': return '<td class="m bdc q">不明</td>'
    return f'<td class="m bdc bd">{DISC_LABEL[k]}</td>'

out = []
for s in SHOWS:
    n, oa, vhs, bd, q = stats(s)
    rows = []
    shown = 0   # the number a reader sees: songs only, so a medley counts once and MVs not at all
    for r in s['rows']:
        if r[0] == 'G' and r[3:] == ('nav',):
            label = 'Navigator\'s Talk' + (f'({r[2]})' if r[2] else '')
            rows.append(f'<tr class="nav"><td class="no"></td>'
                        f'<td class="t">{label}<span class="sony">放送では入る。BDに収録されるかは不明</span></td>'
                        '<td class="m oa">●</td><td class="m no" title="VHSのクレジットには記載なし">―</td>'
                        '<td class="m bdc q">不明</td></tr>')
            continue
        if r[0] == 'G' and r[3:] == ('mv',):
            rows.append(f'<tr class="nav"><td class="no"></td>'
                        f'<td class="t">{e(r[1])}<span class="sony">映像のみ(MV)</span></td>'
                        '<td class="m"></td><td class="m"></td><td class="m bdc"></td></tr>')
            continue
        if r[0] == 'G':
            note = f'<span class="gn">{e(r[2])}</span>' if r[2] else ''
            rows.append(f'<tr class="g"><th colspan="5" scope="rowgroup">{e(r[1])}{note}</th></tr>')
            continue
        no, title, v, o, b = r
        sub = ''
        k = bd_code(s, r)
        if b and b[1] and (s['id'], no) in KEEP:
            sub = f'<span class="sony">BD表記: {e(split_artist(b[1])[0])}</span>'
        if k == 'elsewhere':
            where = ' または '.join(f'この回の{n_}曲目' if sid == s['id'] else YSHOW[sid]
                                    for sid, n_ in YD[(s['id'], no)][1])
            sub = f'<span class="sony">BDのDISC 3は {e(where)} の演奏(放送映像)</span>'
        if k == 'D3?':
            sub = '<span class="sony">12/31 Grand Finale と 1/1 のどちらの映像かは未確定</span>'
        if (s['id'], no) in UNLISTED:
            sub = '<span class="sony">VHS・BDとも曲目には記載なし</span>'
        extra = NOTE.get((SHOWS.index(s), no))
        if extra: sub = f'<span class="sony">{e(extra)}</span>' + sub
        key = (s['id'], no)
        if key in MEDLEY:
            sub = f'<span class="sony">ここから{len(MEDLEY[key]) + 1}曲のメドレー</span>' + sub
        if key in PART or title in ('MC', 'COUNT DOWN'):
            num = ''
        else:
            shown += 1; num = f'{shown:02d}'
        cls = ['part'] if key in PART else []
        head = next((m for m, ps in MEDLEY.items() if m[0] == s['id'] and no in ps), None)
        if head and sub.startswith('<span class="sony">BD表記') and head in KEEP:
            sub = ''   # the medley's first row already names the track
        if v and not b and not k: cls.append('lost')
        if b and b[0] != 'Q' and not v and s['disc'] in ('DISC 1', 'DISC 2'): cls.append('new')
        c = f' class="{" ".join(cls)}"' if cls else ''
        rows.append(
          f'<tr{c}><td class="no">{e(num)}</td><td class="t">{e(title)}{sub}</td>'
          f'<td class="m{" oa" if o else " no"}">{"●" if o else "―"}</td>'
          f'<td class="m{" vhs" if v else " no"}">{"●" if v else "―"}</td>'
          f'{bd_cell(k)}</tr>')
    note = ''
    qline = f'<span>BD 不明 {q}</span>' if q else ''
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
      <thead><tr><th class="no">#</th><th>曲</th><th class="m">放送</th><th class="m">VHS</th><th class="m bdc">BD</th></tr></thead>
      <tbody>
{chr(10).join(rows)}
      </tbody>
    </table></div>
  </section>''')

# DISC 3 matrix: which Yoyogi show played each Sony track, and was it broadcast.
yshort = [('y1231a', '12/31<br>Grand Finale'), ('y1231b', '12/31<br>Count Down'), ('y0101', '1/1<br>Happy New Year')]
mrows = []
# Sony credits the solo tracks to "Daisuke Asakura"; the show tables (from the site) say 浅倉大介.
MATRIX_ARTIST = {'Daisuke Asakura': '浅倉大介'}
last_artist = None
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
    # an artist heading whenever the act changes, as in the show tables
    artist = MATRIX_ARTIST.get(artist, artist)
    if artist != last_artist:
        mrows.append(f'<tr class="g"><th colspan="4" scope="rowgroup">{e(artist)}</th></tr>')
        last_artist = artist
    mrows.append(f'<tr><td class="t">{e(title)}</td>{"".join(cells)}</tr>')

# DISC 3 counts: tracks, navigator segments, and which show each track came from
d3_songs = [t for t in SONY_D['D3'] if not t.startswith("Navigator's Talk")]
d3_talks = len(SONY_D['D3']) - len(d3_songs)
d3_from = {sid: sum(1 for t in d3_songs if len(SRC[t]) == 1 and SRC[t][0][0] == sid) for sid in YSHOW}
d3_open = sum(1 for t in d3_songs if len(SRC[t]) > 1)
d3_stat = (f'<span>曲 {len(d3_songs)}</span><span>Navigator\'s Talk {d3_talks}</span>'
           + ''.join(f'<span>{e(YSHOW[sid])} から {n}</span>' for sid, n in d3_from.items())
           + (f'<span>未確定 {d3_open}</span>' if d3_open else ''))
assert sum(d3_from.values()) + d3_open == len(d3_songs)

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
.oa {{ color:var(--amber); }}
.vhs {{ color:var(--pink); }}
.bd {{ color:var(--cyan); }}
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
tr.part td.t {{ padding-left:22px; }}
td.pl {{ color:var(--text); font-size:11px; }}
/* Three show columns with two-line headings: nowrap would let them take the row
   and squeeze the title to a few characters on a phone, so the widths are fixed. */
section.matrix table {{ table-layout:fixed; }}
/* the show tables colour 放送/VHS/BD by position; these counts mean something else */
section.matrix .stat span {{ color:var(--dim); }}
section.matrix .m {{ width:5.4em; white-space:normal; font-size:10.5px; line-height:1.4; }}
tr.talk td.t {{ color:var(--dim); }}
tr.talk td.m {{ white-space:normal; font-size:11px; }}
tr.nav td.t {{ color:var(--dim); font-size:11.5px; }}
.howto {{ margin:14px 0 0; font-size:12px; line-height:1.8; color:var(--dim); }}
th.bdc, td.bdc {{ width:4.8em; }}
/* Notes read like the rest of the page: plain list, no marks, not highlighted. */
section.notes {{ margin:26px 0 0; padding-top:18px; border-top:1px solid var(--border); }}
section.notes h2 {{ margin:0 0 10px; font-size:11px; letter-spacing:2.5px; color:var(--purple); font-weight:normal; }}
section.notes ol {{ margin:0; padding-left:2.2em; color:var(--dim); font-size:12px; line-height:1.85; }}
section.notes li {{ margin:0 0 6px; }}
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
    <p class="lead">1999年のDA’s Party 5公演のセットリストを1曲ずつ並べ、Viewsicでの放送・当時のVHS・2026年10月28日発売のBlu-ray『DA’s Party 1999 SPECIAL EDITION』に入っているかを突き合わせました。</p>
    <p class="howto">表の「放送」「VHS」は ● が収録あり、― がなし。「BD」は収録されているディスクです。注記はページの最後にまとめています。</p>
  </header>

  <div class="cards">
    <div class="card">
      <h2>曲目には無いが収録</h2>
      <ul>{li(lost)}</ul>
      <p style="margin-top:6px">VHSのクレジットにもBDの曲目にも載っていないが、VHSに入っている3曲。
        DISC 1 は VHS と同じ内容なので、BDにも入る。</p>
    </div>
    <div class="card">
      <h2>VHS と BD の曲目</h2>
      {f'<ul>{li(new)}</ul>' if new else ''}
      <p{' style="margin-top:6px"' if new else ''}>代々木の3公演はVHSが無く、DISC 3の全曲が初商品化。
        VHS のクレジットと BD の曲目は、2/14(DISC 1・16曲)も 8/29(DISC 2・11曲)も曲名・曲順とも同じ。</p>
    </div>
    <div class="card">
      <h2>DISC 3 はどの回の映像か</h2>
      <p>ほとんどが 1/1 Happy New Year の放送から。
        FATE WEATHER と Shining Collection は 12/31 Grand Finale、
        DA’s Party 2000 は 12/31 Count Down から。
        THE ELECTROMANCER は両日で放送があり、発売後に確認。
        放送があってDISC 3に無いのは 1/1 の「1000年の誓い」だけ。</p>
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
      <div class="stat">{d3_stat}</div>
    </div>
    <p class="sn"><b class="oa">☆</b> その回で演奏され放送あり / 演奏 = 演奏はあるが放送の記載なし / ― = その回では演奏なし</p>
    <div class="tw"><table>
      <thead><tr><th>DISC 3 曲目(公式)</th>{''.join(f'<th class="m">{h}</th>' for _, h in yshort)}</tr></thead>
      <tbody>
{chr(10).join(mrows)}
      </tbody>
    </table></div>
  </section>

  <section class="notes" id="notes">
    <h2>注記</h2>
    <ol>
      <li>VHS には、曲が編集されて入っているものが多くあります。BD の DISC 1・2 は、2/14・8/29 の VHS と曲目・曲順が同じで、VHS と同じ内容です。</li>
      <li>2/14 と 8/29 は、ブログの記載により全曲が Viewsic で中継されています。</li>
      <li>8/29 の放送では、年末の回と同じく、オープニングと各出演者の最初にナビゲーターが入ります。BD に入るかは分かりません。</li>
      <li>メドレーは1曲として数えています。表では最初の曲に番号を付け、続く曲はその内訳として並べています。映像のみ(MV)の行は曲に数えていません。</li>
      <li>代々木の3公演は、当時 VHS が出ていません。DISC 3 は公式に「Viewsic が放送した映像」とあり、各曲がどの回の映像かは、ブログの放送記録から割り出しました。同じ曲を別の回の放送から収録している行は「BD」を ― にし、曲名の下に収録元の回を書いています。</li>
      <li>曲名・公演名・アーティスト名は、ソニーミュージック公式の表記に合わせています。公式に出てこないものはデータベースの表記です。メドレーなど、公式の曲目より細かく分かれているところはデータベースの分け方のままにし、公式の曲目を「BD表記」として添えています。</li>
      <li>BD の内容は、発売後に映像で確認して追記します。</li>
    </ol>
  </section>

  <footer>
    出典<br>
    セットリスト: 浅倉大介 クレジットデータベース(ライブ)<br>
    VHS収録・放送: <a href="{BLOG}" target="_blank" rel="noopener">全DA's Party セットリスト(ちっちきちっちっちっちっち)</a><br>
    Blu-ray の曲目: <a href="{SONY}" target="_blank" rel="noopener">ソニーミュージック オフィシャルサイト(2026.09.15)</a><br>
    2/14・8/29 の VHS 収録曲: VHS のクレジット(管理人所蔵)
  </footer>
</main>
</body>
</html>
'''
open(sys.argv[1], 'w', encoding='utf-8').write(page)
print('lost', lost); print('new', new)
for s in SHOWS: print(s['id'], stats(s))
