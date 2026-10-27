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

// ---- homepage: sliding hero words and counters ----
(function () {
  const runs = [...document.querySelectorAll('.run')];
  function onScroll() {
    runs.forEach(el => {
      const dir = +el.dataset.dir;
      el.style.transform = 'translateX(' + (dir * scrollY * 0.35 + (dir > 0 ? -innerWidth * 0.5 : 0)) + 'px)';
    });
  }
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

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

// ---- bottom of page: reveal on arrival, right-side rail, call button ----
(function () {
  const io2 = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io2.unobserve(e.target); }
  }), { threshold: 0.2 });
  document.querySelectorAll('.cta2, .foot2').forEach(el => io2.observe(el));

  const fill = document.getElementById('railfill'), dot = document.getElementById('raildot');
  const fab = document.querySelector('.floating-cta'), foot = document.getElementById('foot');
  function onScroll() {
    const max = document.documentElement.scrollHeight - innerHeight;
    const p = max > 0 ? scrollY / max : 0;
    if (fill) { fill.style.height = (p * 100) + '%'; dot.style.top = (p * 100) + '%'; }
    if (fab) {
      const nearFoot = foot && foot.getBoundingClientRect().top < innerHeight * 0.6;
      fab.classList.toggle('on', scrollY > innerHeight * 0.5 && !nearFoot);
    }
  }
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();
