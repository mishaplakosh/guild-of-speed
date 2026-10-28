#!/usr/bin/env python3
"""Builds the /experimental/ pages from one shared layout.

    python3 experimental/_src/build.py

Writes experimental/index.html and one page per service in SERVICES.
Edit the text here (or home.html for the home page), then run the script and commit the result.
The ?v= on the CSS/JS links is a hash of their content, so browsers pick up every change.
"""
import hashlib
import html
import re
from pathlib import Path

SRC = Path(__file__).resolve().parent
OUT = SRC.parent
ASSETS = '/experimental/assets'
PHONE, PHONE_TEXT = '+380636000505', '+380 63 600 0505'
ADDRESS = 'вул. Залізнична, 7, Львів'
TELEGRAM = 'https://t.me/Guildofspeed'
ROUTE = 'https://maps.app.goo.gl/MFkGtPc2WMFkr57UA'
MAP = 'https://maps.google.com/maps?q=49.8444869,23.9954202&z=17&ie=UTF8&output=embed'

# Order here = order of the tiles, the footer list and "Інші послуги".
# tile: square photo for the home page; img: wide photo (file, width, height) for the service page.
DEFAULT_STEPS = ['Дзвінок', 'Діагностика', 'Ремонт і гарантія']
SERVICES = [
    dict(slug='diagnostyka', title='Діагностика', lead='Точний діагноз до початку ремонту.',
         works=["Комп'ютерна діагностика всіх систем", 'Датчики та блоки управління', 'Діагностика двигуна', 'Діагностика ходової'],
         tile='diagnostics', img=('diagnostics-wide', 800, 523), alt="Комп'ютерна діагностика BMW у Львові"),
    dict(slug='ohlyad', title='Огляд перед купівлею', lead='Перш ніж купувати BMW — подивимося разом із вами.',
         works=['Огляд кузова та лакофарбового покриття', "Комп'ютерна діагностика", 'Перевірка двигуна і підвіски', 'Висновок про стан авто'],
         tile='inspection', img=('inspection-wide', 800, 523), alt='Огляд BMW перед купівлею у Львові',
         steps=['Дзвінок', 'Огляд', 'Висновок']),
    dict(slug='dvyhuny', title='Двигуни', lead='Серце BMW — без зайвих ризиків.',
         works=['Заміна ременя/ланцюга ГРМ', 'Прокладки, сальники, підтікання', 'Діагностика двигуна'],
         tile='engine', img=('engine-wide', 800, 542), alt='Ремонт двигуна BMW у Львові'),
    dict(slug='lantsyug-hrm', title='Заміна ланцюга ГРМ', lead='Ланцюг ГРМ — серце двигуна. Міняємо вчасно.',
         works=['Заміна ланцюга ГРМ', 'Натягувачі, зірочки, заспокоювачі', 'Прокладки та сальники при потребі', 'Діагностика двигуна'],
         tile='timing', img=('timing-wide', 800, 523), alt='Заміна ланцюга ГРМ BMW у Львові'),
    dict(slug='ridyny', title='Рідини й фільтри', lead='Правильні рідини — роки життя двигуна.',
         works=['Мастила двигуна й трансмісії', 'Гальмівна та охолоджуюча рідини', 'Усі фільтри'],
         tile='fluids', img=('fluids-wide', 800, 409), alt='Заміна рідин і фільтрів BMW у Львові'),
    dict(slug='podviska', title='Підвіска', lead='Стукіт чи вібрація на швидкості? Підвіска любить увагу.',
         works=['Заміна амортизаторів, пружин, сайлентблоків', 'Кульові опори, важелі, стійки стабілізатора', 'Розвал-сходження', "Комп'ютерна діагностика ходової"],
         tile='suspension', img=('suspension-wide', 800, 523), alt='Ремонт підвіски BMW у Львові'),
    dict(slug='elektronika', title='Електроніка', lead='Знайдемо причину, а не просто скинемо помилку.',
         works=['Діагностика всіх систем', 'Датчики та блоки управління', 'Помилки й «глюки» панелі приладів'],
         tile='electronics', img=('electronics-wide', 800, 523), alt='Діагностика електроніки BMW у Львові'),
    dict(slug='detejling', title='Детейлінг', lead='Чистий і блискучий BMW.',
         works=['Хімчистка салону', 'Полірування та кераміка', 'Глибока мийка'],
         tile='detailing', img=('detailing-wide', 800, 401), alt='Детейлінг BMW у Львові'),
]

# Brand strip on the first screen: file, aspect ratio, height (in em), thin logos drawn a little bolder
BRANDS = [('bilstein', 4.606, 0.76, False), ('sachs', 1.595, 1.2, True), ('zf', 1.0, 1.2, True), ('brembo', 4.167, 0.95, True),
          ('bosch', 4.464, 0.86, False), ('mahle', 5.0, 0.7, False), ('hella', 1.471, 1.12, True), ('castrol', 4.145, 0.86, False)]

# Icons: only the ones a page uses are written into it
ICONS = {
    'i-map-pin': '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
    'i-phone': '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
    'i-send': '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
    'i-arrow': '<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>',
    'i-play': '<path d="M8 5.5v13l11-6.5z"/>',
    'i-close': '<path d="M6 6l12 12"/><path d="M18 6 6 18"/>',
}
SCRIPT_ICONS = {'index': ['i-play', 'i-arrow']}   # added by main.js (video cards)


def esc(s):
    return html.escape(s, quote=True)


def version(path):
    return hashlib.md5((OUT / path).read_bytes()).hexdigest()[:8]


def nav_links(home):
    p = '' if home else 'index.html'
    return [(p + '#services', 'Послуги'), (p + '#video', 'Відео'), (p + '#faq', 'Питання'), ('#contacts', 'Контакти')]


def sprite(body, page):
    used = set(re.findall(r'href="#(i-[\w-]+)"', body)) | set(SCRIPT_ICONS.get(page, []))
    syms = ''.join(f'\n    <symbol id="{k}" viewBox="0 0 24 24">{v}</symbol>' for k, v in ICONS.items() if k in used)
    bold = '\n    <filter id="bold" x="-5%" y="-5%" width="110%" height="110%"><feMorphology operator="dilate" radius="1"/></filter>' if 'lg--b' in body else ''
    return f'  <svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">{bold}{syms}\n  </svg>'


def copy_button(value, text, label):
    return (f'<button class="copy" type="button" data-copy="{esc(value)}" aria-label="{label}"><span>{esc(text)}</span>'
            '<svg class="copy__i" viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="12" height="12"/><path d="M5 15V3h12"/></svg></button>')


def page(name, title, description, main, after=''):
    home = name == 'index'
    links = nav_links(home)
    top = '\n'.join(f'        <a href="{h}">{t}</a>' for h, t in links)
    menu = '\n'.join(f'      <a href="{h}">{t}</a>' for h, t in links)
    services = '\n'.join(f'        <a href="{s["slug"]}.html">{s["title"]}</a>' for s in SERVICES)
    body = f'''  <header class="nav" id="nav">
    <div class="nav__inner">
      <a href="#hero" class="nav__brand" aria-label="Guild of Speed — на початок">
        <img src="{ASSETS}/img/logo.webp" alt="Guild of Speed" class="nav__logo" width="57" height="168">
        <span class="nav__name">GUILD <span class="nav__of">OF</span> SPEED</span>
      </a>
      <nav class="nav__links" aria-label="Головне меню">
{top}
      </nav>
      <a href="tel:{PHONE}" class="btn btn--primary nav__cta">Зателефонувати</a>
      <button class="burger" id="burger" aria-label="Меню" aria-expanded="false" aria-controls="mobileMenu"><span></span><span></span><span></span></button>
    </div>
  </header>
  <aside class="mobile-menu" id="mobileMenu" aria-label="Меню">
    <nav class="mobile-menu__links">
{menu}
      <a href="tel:{PHONE}" class="btn btn--primary">Зателефонувати</a>
      <a href="{TELEGRAM}" target="_blank" rel="noopener" class="btn btn--ghost">Telegram</a>
    </nav>
  </aside>
  <div class="mobile-overlay" id="mobileOverlay"></div>

  <main>
{main.rstrip()}
  </main>

  <section class="cta2" id="contacts">
    <div class="cta2__map"><iframe src="{esc(MAP)}" title="Карта: Guild of Speed, {ADDRESS}" loading="lazy" allowfullscreen></iframe></div>
    <div class="tiles">
      <a href="{ROUTE}" target="_blank" rel="noopener"><small>Маршрут</small><b>Прокласти<br>маршрут</b><svg class="icon" aria-hidden="true"><use href="#i-map-pin"/></svg></a>
      <a href="tel:{PHONE}"><small>Телефон</small><b class="nw">{PHONE_TEXT}</b><svg class="icon" aria-hidden="true"><use href="#i-phone"/></svg></a>
      <a href="{TELEGRAM}" target="_blank" rel="noopener"><small>Написати</small><b>Telegram</b><svg class="icon" aria-hidden="true"><use href="#i-send"/></svg></a>
    </div>
  </section>
{'' if home else other_services(name)}
  <footer class="foot2" id="foot">
    <div class="foot2__top">
      <div class="foot2__brand">
        <h4>Контакти</h4>
        {copy_button(ADDRESS, ADDRESS, 'Скопіювати адресу')}
        {copy_button(PHONE, PHONE_TEXT, 'Скопіювати номер')}
        <p class="foot2__p">Пн–Пт 10:00–19:00<br>Сб 10:00–15:00</p>
      </div>
      <div>
        <h4>Послуги</h4>
{services}
      </div>
      <div>
        <h4>Соцмережі</h4>
        <a href="https://www.instagram.com/guild.ofspeed/" target="_blank" rel="noopener">Instagram</a>
        <a href="https://www.youtube.com/@guildofspeed" target="_blank" rel="noopener">YouTube</a>
        <a href="https://www.tiktok.com/@guild.ofspeed" target="_blank" rel="noopener">TikTok</a>
      </div>
    </div>
    <div class="foot2__word" aria-hidden="true">GUILD OF SPEED</div>
    <div class="foot2__bar">
      <span>© <span id="year"></span> Guild of Speed</span>
      <a class="foot2__up" href="#hero">Нагору <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5"/><path d="m6 11 6-6 6 6"/></svg></a>
    </div>
  </footer>
{after.rstrip()}'''
    out = f'''<!DOCTYPE html>
<html lang="uk">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title}</title>
  <meta name="description" content="{description}">
  <meta name="robots" content="noindex, nofollow">
  <meta name="theme-color" content="#0d1b2a">
  <link rel="icon" type="image/png" href="/assets/icons/favicon.png">
  <link rel="apple-touch-icon" href="/assets/icons/apple-touch-icon.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Golos+Text:wght@500;600;700;900&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="{ASSETS}/css/style.css?v={version('assets/css/style.css')}">
  <script>document.documentElement.classList.add('js')</script>
  <script src="{ASSETS}/js/main.js?v={version('assets/js/main.js')}" defer></script>
</head>
<body>
{sprite(body, name)}
{body}
</body>
</html>
'''
    (OUT / f'{name}.html').write_text(out, encoding='utf-8')
    return name


def other_services(current):
    rows = '\n'.join(
        f'        <a class="row" href="{s["slug"]}.html"><span class="row__n">{i:02d}</span><h3>{s["title"]}</h3>'
        f'<span class="row__go"><svg class="icon" aria-hidden="true"><use href="#i-arrow"/></svg></span></a>'
        for i, s in enumerate((s for s in SERVICES if s['slug'] != current), 1))
    return f'''
  <section class="band" id="more">
    <div class="section">
      <h2 class="section__title">Інші послуги</h2>
      <div class="rows">
{rows}
      </div>
    </div>
  </section>
'''


def service_main(s):
    works = '\n'.join(f'          <li><span class="work__n">{i:02d}</span><span>{w}</span></li>' for i, w in enumerate(s['works'], 1))
    steps = '\n'.join(f'        <div class="step"><b>{i:02d}</b><h3>{t}</h3></div>' for i, t in enumerate(s.get('steps', DEFAULT_STEPS), 1))
    f, w, h = s['img']
    return f'''  <section class="cat" id="hero">
    <div class="cat__in">
      <a class="cat__back" href="index.html#services"><svg class="icon icon--flip" aria-hidden="true"><use href="#i-arrow"/></svg> Усі послуги</a>
      <h1 class="cat__title">{s['title']}</h1>
      <p class="cat__lead">{s['lead']}</p>
    </div>
  </section>
  <section class="band" id="works">
    <div class="section">
      <h2 class="section__title">Що робимо</h2>
      <div class="cat__split">
        <ol class="works">
{works}
        </ol>
        <img class="cat__img" src="{ASSETS}/img/services/{f}.webp" alt="{s['alt']}" width="{w}" height="{h}">
      </div>
    </div>
  </section>
  <section class="band band--alt" id="steps">
    <div class="section">
      <h2 class="section__title">Три кроки</h2>
      <div class="steps">
{steps}
      </div>
    </div>
  </section>'''


def home_main():
    src = (SRC / 'home.html').read_text(encoding='utf-8')
    main, after = src.split('<!-- @after-footer -->')
    tiles = '\n'.join(
        f'        <a class="sq" href="{s["slug"]}.html"><img src="{ASSETS}/img/services/{s["tile"]}.webp" alt="" loading="lazy" width="640" height="640"><h3>{s["title"]}</h3></a>'
        for s in SERVICES)
    logos = ''.join(
        f'<span><i class="lg{" lg--b" if b else ""}" role="img" aria-label="{"ZF" if n == "zf" else n.capitalize()}" style="--src:url({ASSETS}/img/brands/{n}.svg);--ar:{ar:.3f};--h:{h}"></i></span>'
        for n, ar, h, b in BRANDS)
    brands = f'<div class="marq" aria-hidden="true"><div class="marq__t">{logos}{logos}</div></div>'
    return main.replace('{{tiles}}', tiles).replace('{{brands}}', brands), after


if __name__ == '__main__':
    main, after = home_main()
    built = [page('index', 'Experimental — Guild of Speed', 'Hidden preview of the new design. Not indexed.', main, after)]
    for s in SERVICES:
        built.append(page(s['slug'], f'Experimental — {s["title"]} | Guild of Speed', 'Hidden preview of the new service page. Not indexed.', service_main(s)))
    print('built', len(built), 'pages:', ', '.join(built))
