/* Happy Culteur — interactions et animations GSAP */
(() => {
  'use strict';

  const root = document.documentElement;
  const header = document.querySelector('.header');
  const toggle = document.querySelector('.nav-toggle');
  const menu = document.getElementById('menu');
  const panels = [...document.querySelectorAll('.panel')];

  const setActiveLink = (id) => document.querySelectorAll('.nav__link')
    .forEach((link) => link.classList.toggle('is-active', link.hash === `#${id}`));

  /* ---------- Menu mobile ---------- */
  const setMenu = (open) => {
    menu.classList.toggle('is-open', open);
    header.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
  };
  toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

  /* ---------- Navigation native : défilement classique (petits écrans ou GSAP indisponible) ---------- */
  const startNativeNav = () => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(({ target, isIntersecting }) => isIntersecting && setActiveLink(target.id));
    }, { rootMargin: '-50% 0px -50% 0px' });
    panels.forEach((panel) => observer.observe(panel));

    return () => {
      observer.disconnect();
    };
  };

  if (!window.gsap || !window.Observer) {
    root.classList.remove('js', 'is-slider'); // tout reste visible et défilable
    startNativeNav();
    return;
  }

  gsap.registerPlugin(Observer);

  /* ---------- Slider de sections : molette, swipe tactile, clavier, liens ---------- */
  gsap.matchMedia().add({
    slider: '(min-width: 62rem) and (min-height: 46rem)',
    calm: '(prefers-reduced-motion: reduce)',
  }, ({ conditions: { slider, calm } }) => {
    if (!slider) {
      root.classList.remove('is-slider');
      return startNativeNav();
    }
    root.classList.add('is-slider');

    let current = Math.max(0, panels.findIndex((p) => `#${p.id}` === location.hash));
    let busy = false;

    const sync = () => {
      panels.forEach((p, i) => p.classList.toggle('is-current', i === current));
      setActiveLink(panels[current].id);
    };
    sync();

    const goTo = (index) => {
      if (busy || index < 0 || index >= panels.length || index === current) return;
      busy = true;

      const dir = index > current ? 1 : -1;
      const from = panels[current];
      const to = panels[index];

      to.classList.add('is-current');
      setActiveLink(to.id);
      gsap.set(to, { yPercent: dir * 100, zIndex: 2 });
      gsap.set(from, { zIndex: 1 });

      const tl = gsap.timeline({
        defaults: { duration: calm ? 0 : 1.1, ease: 'power3.inOut' },
        onComplete: () => {
          gsap.set([from, to], { clearProps: 'transform,zIndex' });
          current = index;
          sync();
          history.replaceState(null, '', `#${to.id}`);
          gsap.delayedCall(0.25, () => { busy = false; }); // laisse retomber l'inertie du trackpad
        },
      });
      tl.to(to, { yPercent: 0 }, 0)
        .to(from, { yPercent: -dir * 20 }, 0)
        .fromTo(to.querySelectorAll('[data-slide-in]'),
          { opacity: 0, y: 40 * dir },
          { opacity: 1, y: 0, duration: calm ? 0 : 0.9, stagger: calm ? 0 : 0.09, ease: 'power3.out', clearProps: 'opacity,transform' },
          calm ? 0 : 0.45);
    };

    // Molette et swipe : avec wheelSpeed -1, « onUp » = aller à la section suivante
    const observer = Observer.create({
      type: 'wheel,touch',
      wheelSpeed: -1,
      tolerance: 12,
      preventDefault: true,
      onUp: () => goTo(current + 1),
      onDown: () => goTo(current - 1),
    });

    const onKey = (e) => {
      const next = { ArrowDown: current + 1, PageDown: current + 1, ArrowUp: current - 1, PageUp: current - 1,
        Home: 0, End: panels.length - 1 }[e.key];
      if (next === undefined) return;
      e.preventDefault();
      goTo(next);
    };

    // Liens internes (navbar, logo, bouton) : vers le panneau qui contient la cible
    const onClick = (e) => {
      const link = e.target.closest('a[href^="#"]');
      const target = link && link.hash.length > 1 && document.querySelector(link.hash);
      const index = target ? panels.indexOf(target.closest('.panel')) : -1;
      if (index < 0) return;
      e.preventDefault();
      goTo(index);
    };

    document.addEventListener('keydown', onKey);
    document.addEventListener('click', onClick);

    return () => {
      observer.kill();
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('click', onClick);
      gsap.set(panels, { clearProps: 'all' });
      root.classList.remove('is-slider');
    };
  });

  /* ---------- Hero : tracé du soulignement ---------- */
  gsap.matchMedia().add('(prefers-reduced-motion: no-preference)', () => {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.fromTo('.logo, .nav__link', { opacity: 0, y: -12 }, { opacity: 1, y: 0, duration: 0.7, stagger: 0.06, clearProps: 'transform' }, 0)
      .fromTo('.hero .line', { opacity: 0, y: 28 }, { opacity: 1, y: 0, duration: 0.9, stagger: 0.12, clearProps: 'transform' }, 0.15)
      .fromTo('.hero__lead', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.8, clearProps: 'transform' }, 0.6)
      .fromTo('.hero .btn', { opacity: 0 }, { opacity: 1, duration: 0.8 }, 0.8)
      .fromTo('.hero__img', { scale: 1.15 }, { scale: 1, duration: 1.8, ease: 'power2.out' }, 0)
      .fromTo('.underline', { clipPath: 'inset(0 100% 0 0)' },
        { clipPath: 'inset(0 0% 0 0)', duration: 1, ease: 'power2.inOut' }, 1);
  });

  /* ---------- À propos : accordéon, un seul paragraphe ouvert à la fois (<details>) ---------- */
  gsap.matchMedia().add({ any: 'all', calm: '(prefers-reduced-motion: reduce)' }, ({ conditions: { calm } }) => { // « any » : sans condition vraie, GSAP n'appelle pas la fonction
    const all = [...document.querySelectorAll('.about__points details')];

    const open = (details) => {
      const p = details.querySelector('p');
      const margin = getComputedStyle(p).marginTop;
      gsap.killTweensOf(p);
      details.open = true;
      gsap.fromTo(p, { height: 0, marginTop: 0, opacity: 0, y: -8, overflow: 'hidden' },
        { height: 'auto', marginTop: margin, opacity: 1, y: 0, duration: calm ? 0 : 0.55, ease: 'power3.out', clearProps: 'all' });
    };
    const close = (details) => {
      const p = details.querySelector('p');
      gsap.killTweensOf(p);
      gsap.to(p, { height: 0, marginTop: 0, opacity: 0, overflow: 'hidden', duration: calm ? 0 : 0.35, ease: 'power2.in',
        onComplete: () => { details.open = false; gsap.set(p, { clearProps: 'all' }); } });
    };

    const onClick = (e) => {
      const summary = e.target.closest('.about__points summary');
      if (!summary) return;
      e.preventDefault(); // on pilote l'attribut open nous-mêmes pour pouvoir animer la fermeture
      const details = summary.parentElement;
      if (details.open) return close(details);
      all.filter((d) => d !== details && d.open).forEach(close);
      open(details);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  });

  /* ---------- Bouton : attraction douce + lueur qui suit le curseur (souris précise, hors reduced-motion) ---------- */
  gsap.matchMedia().add('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)', () => {
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
})();
