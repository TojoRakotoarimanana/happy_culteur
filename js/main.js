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

      // Défilement fluide (Lenis) piloté par le ticker GSAP ; ancres internes animées, y compris vers les sections à venir
      if (!window.Lenis) return; // Lenis indisponible : défilement natif
      const lenis = new Lenis({ lerp: 0.09 });
      const raf = (time) => lenis.raf(time * 1000);
      gsap.ticker.add(raf);
      gsap.ticker.lagSmoothing(0);

      const onClick = (e) => {
        const link = e.target.closest('a[href^="#"]');
        const target = link && link.hash.length > 1 && document.querySelector(link.hash);
        if (!target) return;

        e.preventDefault();
        lenis.scrollTo(target, {
          offset: -header.offsetHeight,
          duration: 1.4,
          easing: (t) => 1 - Math.pow(1 - t, 4), // easeOutQuart
          onComplete: () => history.pushState(null, '', link.hash),
        });
      };
      document.addEventListener('click', onClick);

      return () => {
        document.removeEventListener('click', onClick);
        gsap.ticker.remove(raf);
        lenis.destroy();
      };
    });
  } else {
    document.documentElement.classList.remove('js'); // GSAP indisponible : le soulignement reste visible
  }

  /* ---------- Bouton : attraction douce + lueur qui suit le curseur (souris précise, hors reduced-motion) ---------- */
  window.gsap && gsap.matchMedia().add('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)', () => {
    const hero = document.querySelector('.hero');
    const btn = hero.querySelector('.btn');
    const PULL = 0.16;    // part du déplacement de la souris reportée sur le bouton
    const MAX = 14;       // déplacement maximal du bouton (px) : il ne « part » jamais loin

    const opts = { duration: 1.2, ease: 'power2.out' };
    const moveX = gsap.quickTo(btn, 'x', opts);
    const moveY = gsap.quickTo(btn, 'y', opts);
    const clamp = gsap.utils.clamp(-MAX, MAX);
    const glow = { x: 0, y: 0, spot: 0 };

    const setGlow = (to) => gsap.to(glow, {
      ...to, duration: 0.8, ease: 'power2.out', overwrite: true,
      onUpdate: () => {
        btn.style.setProperty('--mx', `${glow.x}px`);
        btn.style.setProperty('--my', `${glow.y}px`);
        btn.style.setProperty('--spot', glow.spot);
      },
    });

    // Toute la zone du hero agit ; l'effet décroît en douceur avec la distance au bouton
    const onMove = (e) => {
      const r = btn.getBoundingClientRect();
      // centre au repos = centre actuel moins le décalage GSAP en cours
      const cx = r.left + r.width / 2 - gsap.getProperty(btn, 'x');
      const cy = r.top + r.height / 2 - gsap.getProperty(btn, 'y');
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;

      const dist = Math.hypot(Math.max(Math.abs(dx) - r.width / 2, 0), Math.max(Math.abs(dy) - r.height / 2, 0));
      const closeness = 1 - Math.min(dist / hero.clientWidth, 1);
      const strength = closeness ** 1.5;

      moveX(clamp(dx * PULL * strength));
      moveY(clamp(dy * PULL * strength));
      setGlow({ x: dx + r.width / 2, y: dy + r.height / 2, spot: closeness });
    };

    const onLeave = () => { moveX(0); moveY(0); setGlow({ spot: 0 }); };

    hero.addEventListener('pointermove', onMove, { passive: true });
    hero.addEventListener('pointerleave', onLeave);
    return () => {
      hero.removeEventListener('pointermove', onMove);
      hero.removeEventListener('pointerleave', onLeave);
    };
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
