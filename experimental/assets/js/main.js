/* Guild of Speed — experimental design. One block per feature, in page order. */

/* ---- reveal on scroll, header shadow, year ---- */
const revealObs = new IntersectionObserver(entries => entries.forEach(e => {
  if (e.isIntersecting) { e.target.classList.add('visible'); revealObs.unobserve(e.target); }
}), { threshold: 0.15 });
document.querySelectorAll('.reveal').forEach(el => revealObs.observe(el));

const nav = document.getElementById('nav');
addEventListener('scroll', () => nav.classList.toggle('nav--scrolled', scrollY > 50), { passive: true });

const year = document.getElementById('year');
if (year) year.textContent = new Date().getFullYear();

/* ---- mobile menu ---- */
const burger = document.getElementById('burger');
const menu = document.getElementById('mobileMenu');
const overlay = document.getElementById('mobileOverlay');
function setMenu(open) {
  menu.classList.toggle('open', open);
  overlay.classList.toggle('open', open);
  burger.classList.toggle('open', open);
  burger.setAttribute('aria-expanded', open);
}
burger.addEventListener('click', () => setMenu(!menu.classList.contains('open')));
overlay.addEventListener('click', () => setMenu(false));
menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMenu(false)));
document.addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });

/* "Контакти": scroll so the bottom of the screen meets the bottom of the contact tiles */
document.querySelectorAll('a[href="#contacts"]:not([data-book])').forEach(a => a.addEventListener('click', e => {
  const tiles = document.querySelector('.tiles');
  if (!tiles) return;
  e.preventDefault();
  setMenu(false);
  scrollTo({ top: tiles.getBoundingClientRect().bottom + scrollY - innerHeight, behavior: 'smooth' });
}));

/* ---- first screen: the E46 drives in from far away, its headlights light the booking button ---- */
const stage = document.querySelector('.hero3__stage');
if (stage) heroScene(stage);

/* the sliding name: size the strip to its text (once the font is in) so the loop is seamless */
const ghost = document.querySelector('.hero3__ghost svg');
if (ghost) {
  const fit = () => { ghost.style.width = ghost.querySelector('text').getComputedTextLength() + 'px'; };
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(fit);
  addEventListener('resize', fit);
}

function heroScene(stage) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const tall = matchMedia('(max-aspect-ratio: 1/1)');
  const $ = s => stage.querySelector(s);
  const car = $('.hero3__car'), road = $('.hero3__road'), tail = $('.hero3__tail'), src = $('.hero3__src');
    const stats = $('.hero3__stats'), wheels = [...stage.querySelectorAll('.hero3__wh')];
  const bcv = $('.hero3__beam'), dcv = $('.hero3__dust'), bc = bcv.getContext('2d'), dc = dcv.getContext('2d');
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v)), eo = v => 1 - Math.pow(1 - clamp(v), 3);
  const SLOPE = Math.tan(0.155);                              // the lower edge of the beam falls about 9 degrees onto the road
  const DRIVE = 3.4;                                          // seconds the car drives in for

  function size() {
    const W = stage.clientWidth, H = stage.clientHeight, dpr = Math.min(2, devicePixelRatio || 1), dd = dpr * 1.5;   // dust is drawn finer than the screen
    bcv.width = W * dpr; bcv.height = H * dpr; bc.setTransform(dpr, 0, 0, dpr, 0, 0);
    dcv.width = W * dd; dcv.height = H * dd; dc.setTransform(dd, 0, 0, dd, 0, 0);
  }
  size(); addEventListener('resize', size);

  const grains = [...Array(420)].map(() => ({ a: Math.random() * 6.28, sp: 6 + Math.random() * 14, r: 0.1 + Math.random() * 0.16, t: Math.random() * 6.28, b: 0.4 + Math.random() * 0.6 }));
  const start = performance.now() + 300;
  let last = performance.now();

  function frame(now) {
    requestAnimationFrame(frame);
    const sr = stage.getBoundingClientRect();
    if (sr.bottom < -50 || sr.top > innerHeight + 50) { last = now; return; }
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const t = reduce ? 9 : Math.max(0, (now - start) / 1000);
    const W = stage.clientWidth, H = stage.clientHeight, isTall = tall.matches;
    const cw = car.offsetWidth, x0 = stats.getBoundingClientRect().left - sr.left;
    const L = cw * (isTall ? 2.1 : 1.7);                     // beam length
    const far = x0 + cw * 0.93 + L + 20;                     // starts so far away that even its beam is off screen
    const carX = tt => x0 - far * (1 - eo(tt / DRIVE));      // the beam shows first, then the car drives in and brakes
    const x = carX(t), moving = Math.abs((carX(t + 0.016) - x) / 0.016) > 30;

    // no shaking: the nose lifts a little while it drives, dips as it brakes, then settles
    const u = clamp(t / DRIVE), tau = Math.max(0, t - DRIVE);
    const lean = reduce ? 0 : u < 1 ? -0.9 * (1 - u) * (1 - u) + 1.1 * Math.pow(clamp((u - 0.6) / 0.4), 2) : 1.1 * Math.exp(-3.2 * tau) * Math.cos(5 * tau);
    car.style.transform = 'translate3d(' + x + 'px,0,0) rotate(' + lean.toFixed(3) + 'deg)';
    const rot = ((x - x0) / (110 * cw / 1939)) * 57.2958;
    wheels.forEach(w => { w.style.transform = 'rotate(' + rot + 'deg)'; });
    if (t > DRIVE + 0.4) stage.classList.add('stopped');   // once it has fully stopped the call button turns solid
    tail.style.opacity = moving ? 0 : 1;                      // brake light: on when it stands still

    // the headlight follows the car's lean; the road line
    const mr = src.getBoundingClientRect(), AX = (mr.left + mr.right) / 2 - sr.left, AY = (mr.top + mr.bottom) / 2 - sr.top;
    const roadY = road.getBoundingClientRect().top - sr.top;
    src.style.opacity = 1;
    const top = AY - cw * 0.0047, xhit = AX + (roadY - AY) / SLOPE, xEnd = AX + L;

    // beam: flat upper edge (cut-off line), lower edge falls onto the road
    bc.clearRect(0, 0, W, H);
    const g = bc.createLinearGradient(AX, 0, xEnd, 0);
    g.addColorStop(0, 'rgba(255,240,205,0.8)'); g.addColorStop(0.5, 'rgba(255,230,175,0.42)'); g.addColorStop(1, 'rgba(255,222,150,0)');
    bc.fillStyle = g; bc.beginPath(); bc.moveTo(AX, top); bc.lineTo(xEnd, top); bc.lineTo(xEnd, roadY);
    if (xhit < xEnd) bc.lineTo(xhit, roadY); else bc.lineTo(xEnd, AY + 3 + L * SLOPE);
    bc.lineTo(AX, AY + 3); bc.closePath(); bc.fill();
    if (xhit < xEnd) {                                         // the light lying on the road
      const w = xEnd - xhit, rg = bc.createLinearGradient(xhit, 0, xEnd, 0);
      rg.addColorStop(0, 'rgba(255,244,215,1)'); rg.addColorStop(0.6, 'rgba(255,230,170,0.5)'); rg.addColorStop(1, 'rgba(255,222,150,0)');
      bc.fillStyle = rg; bc.beginPath(); bc.ellipse(xhit + w / 2, roadY + 5, w / 2, 9, 0, 0, 6.283); bc.fill(); bc.fillRect(xhit, roadY - 2, w, 3);
    }

    // dust: tiny grains wandering inside the lit wedge
    dc.clearRect(0, 0, W, H);
    if (!reduce) grains.forEach(p => {
      if (p.x === undefined || p.x > xEnd || p.x < AX - 4) { p.x = AX + Math.pow(Math.random(), 1.2) * L; p.y = top + Math.random() * (Math.min(roadY, AY + 3 + (p.x - AX) * SLOPE) - top); }
      p.a += (Math.random() - 0.5) * dt * 5; p.x += Math.cos(p.a) * p.sp * dt; p.y += Math.sin(p.a) * p.sp * dt; p.t += dt * (1.5 + p.b * 2);
      const yb = Math.min(roadY - 1, AY + 3 + (p.x - AX) * SLOPE); if (p.y < top || p.y > yb) p.y = top + Math.random() * (yb - top);
      const al = (p.b * (1 - Math.min(1, (p.x - AX) / L)) * (0.55 + 0.45 * Math.sin(p.t))).toFixed(3);
      dc.fillStyle = 'rgba(255,238,205,' + al + ')'; dc.beginPath(); dc.arc(p.x, p.y, p.r, 0, 6.283); dc.fill();
      dc.fillStyle = 'rgba(255,214,150,' + (al * 0.3).toFixed(3) + ')'; dc.beginPath(); dc.arc(p.x, p.y, p.r * 3, 0, 6.283); dc.fill();
    });

  }
  requestAnimationFrame(frame);
}

/* ---- numbers count up when they come into view ---- */
const countObs = new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting) return;
  countObs.unobserve(e.target);
  const el = e.target, to = +el.dataset.to, suf = el.dataset.suf, t0 = performance.now();
  (function step(t) {
    const k = Math.min(1, (t - t0) / 1400);
    el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))) + suf;
    if (k < 1) requestAnimationFrame(step);
  })(t0);
}), { threshold: 0.6 });
document.querySelectorAll('[data-to]').forEach(el => { el.textContent = '0' + el.dataset.suf; countObs.observe(el); });

/* ---- videos: latest YouTube shorts, a sideways row with a progress line ---- */
(async function () {
  const grid = document.getElementById('shortsGrid');
  if (!grid) return;
  try {
    const res = await fetch('https://www.googleapis.com/youtube/v3/playlistItems?playlistId=UUSHX61Qdp-9MFJl_f3OcC0tKg&part=snippet&maxResults=9&key=AIzaSyCd4mM86xCu90rLKsHwATbzzoCIxVnxC3A');
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();
    if (!data.items || !data.items.length) throw new Error('no items');
    data.items.forEach(item => {
      const id = item.snippet.resourceId.videoId;
      const a = document.createElement('a');
      a.href = 'https://www.youtube.com/shorts/' + encodeURIComponent(id);
      a.target = '_blank'; a.rel = 'noopener';
      a.className = 'short-card';
      a.addEventListener('click', e => {
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
        e.preventDefault();
        openVideo(id, a);
      });
      const img = document.createElement('img');
      img.src = 'https://i.ytimg.com/vi/' + encodeURIComponent(id) + '/oar2.jpg';
      img.alt = item.snippet.title;
      img.loading = 'lazy';
      const play = document.createElement('span');
      play.className = 'short-play';
      play.innerHTML = '<svg class="icon icon--fill" aria-hidden="true"><use href="#i-play"/></svg>';
      a.append(img, play);
      grid.append(a);
    });
    const more = document.createElement('a');
    more.href = 'https://www.youtube.com/@guildofspeed/shorts';
    more.target = '_blank'; more.rel = 'noopener';
    more.className = 'short-card short-card--more';
    more.innerHTML = '<span class="short-more__ring"><svg class="icon" aria-hidden="true"><use href="#i-arrow"/></svg></span><span class="short-more__title">Більше на YouTube</span>';
    grid.append(more);
    initCarousel(grid);
  } catch (e) {
    const p = document.createElement('p');
    p.className = 'shorts-error';
    p.textContent = 'Не вдалось завантажити відео';
    grid.append(p);
  }
})();

function initCarousel(grid) {
  const track = document.getElementById('shortsProgress');
  const thumb = document.getElementById('shortsThumb');
  function update() {
    const max = grid.scrollWidth - grid.clientWidth;
    track.hidden = max <= 2;
    if (track.hidden) return;
    grid.classList.toggle('at-end', grid.scrollLeft >= max - 2);
    thumb.style.width = (grid.clientWidth / grid.scrollWidth * 100) + '%';
    thumb.style.left = (grid.scrollLeft / grid.scrollWidth * 100) + '%';
  }
  grid.addEventListener('scroll', update, { passive: true });
  addEventListener('resize', update);

  // drag the videos with the mouse (touch already scrolls natively)
  let down = false, startX = 0, startLeft = 0, moved = 0;
  grid.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    down = true; moved = 0; startX = e.clientX; startLeft = grid.scrollLeft;
  });
  addEventListener('pointermove', e => {
    if (!down) return;
    moved = Math.abs(e.clientX - startX);
    if (moved > 5) grid.classList.add('dragging');
    if (grid.classList.contains('dragging')) grid.scrollLeft = startLeft - (e.clientX - startX);
  });
  addEventListener('pointerup', () => { if (down) { down = false; grid.classList.remove('dragging'); } });
  grid.addEventListener('click', e => { if (moved > 5) { e.preventDefault(); e.stopPropagation(); moved = 0; } }, true);

  // click or drag the progress line
  let scrubbing = false;
  const scrub = e => {
    const r = track.getBoundingClientRect(), f = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    grid.scrollTo({ left: f * grid.scrollWidth - grid.clientWidth / 2, behavior: 'auto' });
  };
  track.addEventListener('pointerdown', e => { scrubbing = true; track.setPointerCapture(e.pointerId); grid.classList.add('dragging'); scrub(e); });
  track.addEventListener('pointermove', e => { if (scrubbing) scrub(e); });
  track.addEventListener('pointerup', () => { scrubbing = false; grid.classList.remove('dragging'); });
  update();
}

/* video pop-up player: embeds YouTube (privacy mode) only after a tap */
const lb = document.getElementById('lightbox');
const lbFrame = document.getElementById('lbFrame'), lbClose = document.getElementById('lbClose'), lbYt = document.getElementById('lbYt');
let lbOpener = null;
function openVideo(id, opener) {
  lbOpener = opener;
  const f = document.createElement('iframe');
  f.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(id) + '?autoplay=1&playsinline=1&rel=0&modestbranding=1';
  f.title = 'Відео Guild of Speed';
  f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
  f.allowFullscreen = true;
  lbFrame.replaceChildren(f);
  lbYt.href = 'https://www.youtube.com/shorts/' + encodeURIComponent(id);
  lb.hidden = false;
  document.body.style.overflow = 'hidden';
  lbClose.focus();
}
function closeVideo() {
  if (lb.hidden) return;
  lbFrame.replaceChildren();
  lb.hidden = true;
  document.body.style.overflow = '';
  if (lbOpener) lbOpener.focus();
}
if (lb) {
  lbClose.addEventListener('click', closeVideo);
  lb.addEventListener('click', e => { if (e.target === lb) closeVideo(); });
  document.addEventListener('keydown', e => {
    if (lb.hidden) return;
    if (e.key === 'Escape') closeVideo();
    if (e.key === 'Tab') {                                     // keep focus inside the pop-up
      const items = [lbClose, lbYt], i = items.indexOf(document.activeElement);
      e.preventDefault();
      items[(i + (e.shiftKey ? items.length - 1 : 1)) % items.length].focus();
    }
  });
}

/* ---- footer: slide the links in once ---- */
const foot = document.querySelector('.foot2');
if (foot) {
  const footObs = new IntersectionObserver(es => { if (es[0].isIntersecting) { foot.classList.add('in'); footObs.disconnect(); } }, { threshold: 0.2 });
  footObs.observe(foot);
}

/* tap the address / number to copy it: no words, the icon just turns into a tick for a moment */
document.querySelectorAll('[data-copy]').forEach(b => b.addEventListener('click', () => {
  const txt = b.dataset.copy, ic = b.querySelector('.copy__i'), orig = ic.innerHTML;
  const done = () => { ic.innerHTML = '<path d="M4 12.5l5 5L20 6.5"/>'; b.classList.add('done'); setTimeout(() => { ic.innerHTML = orig; b.classList.remove('done'); }, 1200); };
  const fallback = () => {
    const a = document.createElement('textarea');
    a.value = txt; a.style.position = 'fixed'; a.style.opacity = '0';
    document.body.appendChild(a); a.select();
    try { document.execCommand('copy'); done(); } catch (e) {}
    a.remove();
  };
  if (navigator.clipboard && isSecureContext) navigator.clipboard.writeText(txt).then(done, fallback);
  else fallback();
}));

/* ---- booking pop-up: name, phone, model, task; sent to Netlify Forms ---- */
const bk = document.getElementById('bk');
if (bk) {
  const $ = id => document.getElementById(id);
  const form = $('bkForm'), phone = $('bkPhone'), err = $('bkErr'), ok = $('bkOk'), title = $('bkTitle');
  let opener = null;
  const open = e => {
    e.preventDefault();
    opener = document.activeElement;
    form.hidden = false; ok.hidden = true; err.hidden = true; title.hidden = false; bk.hidden = false;
    document.body.style.overflow = 'hidden';
    setTimeout(() => $('bkName').focus(), 50);
  };
  const close = () => { bk.hidden = true; document.body.style.overflow = ''; if (opener) opener.focus(); };
  document.querySelectorAll('[data-book]').forEach(a => a.addEventListener('click', open));
  $('bkX').addEventListener('click', close);
  $('bkDone').addEventListener('click', close);
  bk.addEventListener('click', e => { if (e.target === bk) close(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !bk.hidden) close(); });

  // Ukrainian numbers: 0XXXXXXXXX, 380XXXXXXXXX or +380XXXXXXXXX (spaces, dashes, brackets allowed)
  const norm = v => { const d = v.replace(/\D/g, ''); if (/^0\d{9}$/.test(d)) return '+38' + d; if (/^380\d{9}$/.test(d)) return '+' + d; return null; };
  phone.addEventListener('input', () => phone.setCustomValidity(''));
  phone.addEventListener('blur', () => { const n = norm(phone.value); if (n) phone.value = n.replace(/^(\+380)(\d{2})(\d{3})(\d{2})(\d{2})$/, '$1 $2 $3 $4 $5'); });
  form.addEventListener('submit', e => {
    e.preventDefault(); err.hidden = true;
    const n = norm(phone.value);
    if (!n) { phone.setCustomValidity('Введіть номер у форматі +380 XX XXX XX XX'); phone.reportValidity(); return; }
    phone.value = n;
    fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(new FormData(form)).toString() })
      .then(r => { if (!r.ok) throw 0; form.hidden = true; title.hidden = true; ok.hidden = false; })
      .catch(() => { err.hidden = false; });
  });
}

/* ---- "Прокласти маршрут" on phones: choose Google Maps / Apple Maps (Apple devices only) / Waze ---- */
const routeTile = document.querySelector('.tiles a[href*="maps.app.goo.gl"]');
if (routeTile) {
  const phoneSize = matchMedia('(max-width: 900px), (pointer: coarse)');
  const ll = '49.8444869,23.9954202';
  const apple = /iPhone|iPad|iPod/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
  const opts = [['Google Maps', routeTile.href], apple && ['Apple Maps', 'https://maps.apple.com/?daddr=' + ll + '&dirflg=d&q=Guild%20of%20Speed'], ['Waze', 'https://waze.com/ul?ll=' + ll + '&navigate=yes']].filter(Boolean);
  const sheet = document.createElement('div');
  sheet.className = 'rt'; sheet.hidden = true;
  sheet.setAttribute('role', 'dialog'); sheet.setAttribute('aria-modal', 'true'); sheet.setAttribute('aria-label', 'Прокласти маршрут');
  sheet.innerHTML = '<div class="rt__sheet"><p class="rt__k">Прокласти маршрут</p>' + opts.map(o => '<a class="rt__o" href="' + o[1] + '" target="_blank" rel="noopener">' + o[0] + '</a>').join('') + '<button class="rt__x" type="button">Закрити</button></div>';
  document.body.appendChild(sheet);
  const close = () => { sheet.classList.remove('open'); document.body.style.overflow = ''; setTimeout(() => { if (!sheet.classList.contains('open')) sheet.hidden = true; }, 300); };
  routeTile.addEventListener('click', e => {
    if (!phoneSize.matches) return;
    e.preventDefault();
    sheet.hidden = false; document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => sheet.classList.add('open'));
  });
  sheet.addEventListener('click', e => { if (e.target === sheet || e.target.closest('.rt__x, .rt__o')) close(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !sheet.hidden) close(); });
}
