/* Happy Culteur — interactions et animations GSAP */
(() => {
  'use strict';

  const header = document.querySelector('.header');
  const toggle = document.querySelector('.nav-toggle');
  const menu = document.getElementById('menu');

  /* ---------- Hero : tracé du soulignement ---------- */
  if (window.gsap) {
    gsap.matchMedia().add('(prefers-reduced-motion: no-preference)', () => {
      gsap.fromTo('.underline', { clipPath: 'inset(0 100% 0 0)' },
        { clipPath: 'inset(0 0% 0 0)', duration: 1, delay: 0.5, ease: 'power2.inOut' });
    });
  } else {
    document.documentElement.classList.remove('js'); // GSAP indisponible : le soulignement reste visible
  }

  /* ---------- Bouton : attraction douce + lueur qui suit le curseur (souris précise, hors reduced-motion) ---------- */
  window.gsap && gsap.matchMedia().add('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)', () => {
    const btn = document.querySelector('.hero .btn');
    const PULL = 0.12;    // part du déplacement de la souris reportée sur le bouton
    const RADIUS = 450;   // distance (px) autour du bouton où le curseur agit

    const opts = { duration: 1.2, ease: 'power2.out' };
    const moveX = gsap.quickTo(btn, 'x', opts);
    const moveY = gsap.quickTo(btn, 'y', opts);
    const glow = { x: 0, y: 0, spot: 0 };

    const onMove = (e) => {
      const r = btn.getBoundingClientRect();
      // centre au repos = centre actuel moins le décalage GSAP en cours
      const cx = r.left + r.width / 2 - gsap.getProperty(btn, 'x');
      const cy = r.top + r.height / 2 - gsap.getProperty(btn, 'y');
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const near = Math.abs(dx) < r.width / 2 + RADIUS && Math.abs(dy) < r.height / 2 + RADIUS;

      moveX(near ? dx * PULL : 0);
      moveY(near ? dy * PULL : 0);

      // Lueur : position du curseur dans le bouton, intensité qui croît à l'approche
      const dist = Math.hypot(Math.max(Math.abs(dx) - r.width / 2, 0), Math.max(Math.abs(dy) - r.height / 2, 0));
      gsap.to(glow, {
        x: dx + r.width / 2, y: dy + r.height / 2, spot: near ? 1 - Math.min(dist / RADIUS, 1) : 0,
        duration: 0.8, ease: 'power2.out', overwrite: true,
        onUpdate: () => {
          btn.style.setProperty('--mx', `${glow.x}px`);
          btn.style.setProperty('--my', `${glow.y}px`);
          btn.style.setProperty('--spot', glow.spot);
        },
      });
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  });

  /* ---------- Header : verre dépoli après le scroll ---------- */
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 10);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------- Menu mobile ---------- */
  const setMenu = (open) => {
    menu.classList.toggle('is-open', open);
    header.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
  };
  toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

  /* ---------- Lien actif selon la section visible ---------- */
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(({ target, isIntersecting }) => {
      document.querySelector(`.nav__link[href="#${target.id}"]`)
        ?.classList.toggle('is-active', isIntersecting);
    });
  }, { rootMargin: '-50% 0px -50% 0px' });

  document.querySelectorAll('main section[id]').forEach((s) => observer.observe(s));
})();
