const obs = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); } });
}, { threshold: 0.15 });
document.querySelectorAll('.reveal').forEach(el => obs.observe(el));
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => { nav.classList.toggle('nav--scrolled', window.scrollY > 50); }, { passive: true });

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

// YouTube API - load latest shorts
(async function() {
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
      a.target = '_blank';
      a.rel = 'noopener';
      a.className = 'short-card reveal visible';
      a.dataset.id = id;
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
    more.target = '_blank';
    more.rel = 'noopener';
    more.className = 'short-card short-card--more';
    more.innerHTML = '<span class="short-more__ring"><svg class="icon" aria-hidden="true"><use href="#i-arrow"/></svg></span><span class="short-more__title">Більше на YouTube</span><span class="short-more__text">Ще багато робіт на нашому каналі</span>';
    grid.append(more);
    initCarousel(grid);
  } catch (e) {
    const p = document.createElement('p');
    p.className = 'shorts-error';
    p.textContent = 'Не вдалось завантажити відео';
    grid.append(p);
  }
})();
document.getElementById('year').textContent = new Date().getFullYear();

function initCarousel(grid) {
  const counter = document.getElementById('shortsCounter');
  const cur = document.getElementById('shortsCur');
  const track = document.getElementById('shortsProgress');
  const thumb = document.getElementById('shortsThumb');
  const pad = n => String(n).padStart(2, '0');
  const cards = [...grid.children].filter(el => !el.classList.contains('short-card--more'));
  const step = () => cards[0].getBoundingClientRect().width + parseFloat(getComputedStyle(grid).columnGap || 0);

  function update() {
    const max = grid.scrollWidth - grid.clientWidth;
    const scrollable = max > 2;
    counter.hidden = !scrollable;
    track.hidden = !scrollable;
    if (!scrollable) return;
    const atEnd = grid.scrollLeft >= max - 2;
    const idx = atEnd ? cards.length : Math.min(cards.length, Math.round(grid.scrollLeft / step()) + 1);
    cur.textContent = pad(idx);
    grid.classList.toggle('at-end', grid.scrollLeft >= max - 2);
    thumb.style.width = (grid.clientWidth / grid.scrollWidth * 100) + '%';
    thumb.style.left = (grid.scrollLeft / grid.scrollWidth * 100) + '%';
  }
  grid.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);

  // drag the videos with the mouse (touch already scrolls natively)
  let down = false, startX = 0, startLeft = 0, moved = 0;
  grid.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    down = true; moved = 0; startX = e.clientX; startLeft = grid.scrollLeft;
  });
  window.addEventListener('pointermove', e => {
    if (!down) return;
    moved = Math.abs(e.clientX - startX);
    if (moved > 5) grid.classList.add('dragging');
    if (grid.classList.contains('dragging')) grid.scrollLeft = startLeft - (e.clientX - startX);
  });
  window.addEventListener('pointerup', () => {
    if (!down) return;
    down = false;
    grid.classList.remove('dragging');
  });
  grid.addEventListener('click', e => { if (moved > 5) { e.preventDefault(); e.stopPropagation(); moved = 0; } }, true);

  // click or drag the progress line
  let scrubbing = false;
  const scrub = (e, smooth) => {
    const r = track.getBoundingClientRect();
    const f = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    grid.scrollTo({ left: f * grid.scrollWidth - grid.clientWidth / 2, behavior: smooth ? 'smooth' : 'auto' });
  };
  track.addEventListener('pointerdown', e => { scrubbing = true; track.setPointerCapture(e.pointerId); grid.classList.add('dragging'); scrub(e, false); });
  track.addEventListener('pointermove', e => { if (scrubbing) scrub(e, false); });
  track.addEventListener('pointerup', () => { scrubbing = false; grid.classList.remove('dragging'); });
  update();
}

// pop-up player: embeds YouTube (privacy mode) only after a tap
const lb = document.getElementById('lightbox');
const lbFrame = document.getElementById('lbFrame');
const lbClose = document.getElementById('lbClose');
const lbYt = document.getElementById('lbYt');
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
    if (e.key === 'Tab') {
      const items = [lbClose, lbYt];
      const i = items.indexOf(document.activeElement);
      e.preventDefault();
      items[(i + (e.shiftKey ? items.length - 1 : 1)) % items.length].focus();
    }
  });
}

// ---- homepage: the E46 drives across, its headlights light up the words ----
(function () {
  const hero = document.getElementById('hero');
  const stage = hero && hero.querySelector('.hero3__stage');
  if (stage) heroCar(hero, stage);
})();

function heroCar(hero, stage) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const car = stage.querySelector('.hero3__car'), lamp = stage.querySelector('.hero3__lamp'), tail = stage.querySelector('.hero3__tail');
  const beam = stage.querySelector('.hero3__beam'), wheels = [...stage.querySelectorAll('.hero3__wh')];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const smooth = (a, b, v) => { v = clamp((v - a) / (b - a)); return v * v * (3 - 2 * v); };

  // split the words into letters so each one can light up on its own
  const letters = [];
  stage.querySelectorAll('.hero3__t > *').forEach(line => {
    const text = line.textContent; line.textContent = '';
    [...text].forEach(c => { const sp = document.createElement('span'); sp.className = 'hero3__ch'; sp.textContent = c; sp.dataset.b = line.tagName === 'B' ? '1' : ''; line.append(sp); letters.push(sp); });
  });
  hero.classList.add('hero3--fx');
  let pos = [];
  function measure() { const sr = stage.getBoundingClientRect(); pos = letters.map(c => { const r = c.getBoundingClientRect(); return (r.left + r.right) / 2 - sr.left; }); }
  addEventListener('resize', measure);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  measure();

  let sm = 0, lastX = null, rot = 0, tilt = 0, rev = 0, lampOn = 0, hold = 0, flick = 9, reach = -1e5, t0 = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - t0) / 1000); t0 = now;
    const r = hero.getBoundingClientRect();
    if (r.bottom < -50 || r.top > innerHeight + 50) return;
    const p = clamp(-r.top / (r.height - innerHeight));
    sm = reduce ? p : sm + (p - sm) * Math.min(1, dt * 7);
    const W = stage.clientWidth, cw = car.offsetWidth, ch = car.offsetHeight, sr = stage.getBoundingClientRect();
    const x0 = W * 0.04, x1 = W + 30, x = x0 + (x1 - x0) * Math.pow(sm, 1.8);
    if (lastX === null) lastX = x;
    const dx = x - lastX; lastX = x;

    // headlights stay on while it moves, and for a moment after
    if (Math.abs(dx) > 0.3) { if (hold <= 0) flick = 0; hold = 1.4; } else hold -= dt;
    flick += dt;
    lampOn += ((hold > 0 ? 1 : 0) - lampOn) * Math.min(1, dt * 14);
    const fl = (flick < 0.4 && !reduce) ? (Math.floor(flick * 28) % 2 === 0 ? 1 : 0.12) : 1;
    rev += ((dx < -0.4 ? 1 : 0) - rev) * Math.min(1, dt * 10);
    tail.style.opacity = rev.toFixed(3);

    rot += dx / (110 * cw / 1939) * 57.2958;
    wheels.forEach(w => { w.style.transform = 'rotate(' + rot + 'deg)'; });
    tilt += (-Math.min(1.6, Math.abs(dx) * 0.1) - tilt) * 0.2;
    const mv = Math.min(1, Math.abs(dx) / 6), ty = reduce ? 0 : Math.sin(now / 45) * 0.9 * mv + Math.sin(now / 130) * 0.35;
    car.style.transform = 'translate3d(' + x + 'px,' + ty + 'px,0) rotate(' + (reduce ? 0 : tilt) + 'deg)';

    // the beam starts at the headlight (so it shakes and tilts with the car)
    const mr = lamp.getBoundingClientRect(), nx = (mr.left + mr.right) / 2 - sr.left, ny = (mr.top + mr.bottom) / 2 - sr.top;
    const L = W * 0.62, hT = ch * (0.5 + 1.7 * smooth(0.02, 0.26, sm));
    const op = (lampOn * fl).toFixed(3);
    lamp.style.opacity = op; beam.style.opacity = op;
    beam.style.setProperty('--nx', nx + 'px'); beam.style.setProperty('--ny', ny + 'px');
    beam.style.clipPath = 'polygon(' + nx + 'px ' + (ny - ch * 0.012) + 'px,' + (nx + L) + 'px ' + (ny - hT) + 'px,' + (nx + L) + 'px ' + (ny + hT * 0.45) + 'px,' + nx + 'px ' + (ny + ch * 0.012) + 'px)';

    // how far the light has reached: kept once it got there, rolls back when you scroll up
    const tip = nx + W * (0.04 + 0.5 * smooth(0, 0.3, sm));
    if (lampOn > 0.5 && dx > 0.3) reach = Math.max(reach, tip); else if (dx < -0.3) reach = Math.min(reach, tip);
    if (sm < 0.005) reach = -1e5;
    letters.forEach((c, i) => {
      const base = c.dataset.b ? 0.3 : 0.24, b = smooth(0, 170, reach - pos[i]);
      c.style.opacity = (base + b * (1 - base)).toFixed(3);
      c.style.textShadow = b > 0.02 ? '0 0 ' + (b * 26).toFixed(1) + 'px rgba(255,190,90,' + (b * 0.6).toFixed(2) + ')' : 'none';
    });
  }
  requestAnimationFrame(frame);
}

(function () {
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    io.unobserve(e.target);
    const el = e.target, to = +el.dataset.to, suf = el.dataset.suf, t0 = performance.now();
    (function f(t) {
      const k = Math.min(1, (t - t0) / 1400);
      el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))) + suf;
      if (k < 1) requestAnimationFrame(f);
    })(t0);
  }), { threshold: 0.6 });
  document.querySelectorAll('[data-to]').forEach(el => { el.textContent = '0' + el.dataset.suf; io.observe(el); });

})();

// ---- bottom of page: reveal on arrival, call button ----
(function () {
  const io2 = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io2.unobserve(e.target); }
  }), { threshold: 0.2 });
  document.querySelectorAll('.cta2, .foot2').forEach(el => io2.observe(el));

  const fab = document.querySelector('.floating-cta'), foot = document.getElementById('foot');
  function onScroll() {
    if (fab) {
      const nearFoot = foot && foot.getBoundingClientRect().top < innerHeight * 0.6;
      fab.classList.toggle('on', scrollY > innerHeight * 0.5 && !nearFoot);
    }
  }
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();
