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
  try {
    const res = await fetch('https://www.googleapis.com/youtube/v3/playlistItems?playlistId=UUX61Qdp-9MFJl_f3OcC0tKg&part=snippet&maxResults=9&key=AIzaSyCd4mM86xCu90rLKsHwATbzzoCIxVnxC3A');
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

    const nav = document.getElementById('shortsNav');
    const prev = document.getElementById('shortsPrev');
    const next = document.getElementById('shortsNext');
    const updateNav = () => {
      const max = grid.scrollWidth - grid.clientWidth;
      nav.hidden = max <= 2;
      prev.disabled = grid.scrollLeft <= 2;
      next.disabled = grid.scrollLeft >= max - 2;
    };
    grid.addEventListener('scroll', updateNav, { passive: true });
    window.addEventListener('resize', updateNav);
    prev.addEventListener('click', () => grid.scrollBy({ left: -grid.clientWidth * 0.8, behavior: 'smooth' }));
    next.addEventListener('click', () => grid.scrollBy({ left: grid.clientWidth * 0.8, behavior: 'smooth' }));
    updateNav();
  } catch (e) {
    const p = document.createElement('p');
    p.className = 'shorts-error';
    p.textContent = 'Не вдалось завантажити відео';
    grid.append(p);
  }
})();
document.getElementById('year').textContent = new Date().getFullYear();
