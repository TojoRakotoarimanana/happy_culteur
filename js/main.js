/* Happy Culteur — interactions et animations GSAP */
(() => {
  'use strict';

  const root = document.documentElement;
  const header = document.querySelector('.header');
  const toggle = document.querySelector('.nav-toggle');
  const menu = document.getElementById('menu');
  const panels = [...document.querySelectorAll('.panel')];
  const free = document.getElementById('collaborer'); // 1re section hors slider : défilement libre
  const freeZone = document.querySelector('.free-zone'); // toutes les sections hors slider

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

  /* ---------- Nos prestations (mobile / tablette) : points de progression, un par service ---------- */
  const svcDots = document.createElement('div');
  svcDots.className = 'svc__dots';
  svcDots.setAttribute('aria-hidden', 'true');
  const svcItems = [...document.querySelectorAll('.svc__item')];
  svcItems.forEach(() => svcDots.append(document.createElement('span')));
  document.body.append(svcDots);
  new IntersectionObserver(([e]) => svcDots.classList.toggle('is-on', e.isIntersecting && matchMedia('(max-width: 62rem)').matches),
    { rootMargin: '-45% 0px -45% 0px' }).observe(document.querySelector('.services'));
  const svcSee = new IntersectionObserver((entries) => entries.forEach(({ target, isIntersecting }) => {
    if (isIntersecting) [...svcDots.children].forEach((dot, i) => dot.classList.toggle('is-active', svcItems[i] === target));
  }), { rootMargin: '-45% 0px -45% 0px' });
  svcItems.forEach((it) => svcSee.observe(it));

  /* ---------- Navigation native : défilement classique (petits écrans ou GSAP indisponible) ---------- */
  const startNativeNav = () => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(({ target, isIntersecting }) => isIntersecting && setActiveLink(target.id));
    }, { rootMargin: '-50% 0px -50% 0px' });
    [...panels, ...freeZone.querySelectorAll('section')].forEach((el) => observer.observe(el));

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

  const smooth = matchMedia('(prefers-reduced-motion: no-preference)').matches;

  /* ---------- Header « directionnel » : se cache quand on descend, revient dès qu'on remonte ---------- */
  const moveHeader = gsap.quickTo(header, 'yPercent', { duration: smooth ? 0.4 : 0, ease: 'power3.out' });
  let lastY = window.scrollY;
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    header.classList.toggle('is-scrolled', y > 10); // fond blanc dès qu'on a quitté le haut de page
    if (Math.abs(y - lastY) < 4) return; // ignore les micro-mouvements du trackpad
    if (y <= 10 || y < lastY || header.classList.contains('is-open')) moveHeader(0);
    else if (y > header.offsetHeight) moveHeader(-100);
    lastY = y;
  }, { passive: true });
  header.addEventListener('focusin', () => moveHeader(0)); // navigation clavier : le header ne reste jamais caché sur un lien focalisé

  /* ---------- Défilement fluide (inertie) : ne sert que dans la partie libre de la page ---------- */
  const lenis = smooth && window.Lenis ? new Lenis({ duration: 1.3, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), wheelMultiplier: 0.9 }) : null;
  if (lenis) {
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  /* ---------- Section libre : animation à l'arrivée dans l'écran (ScrollTrigger, calé sur Lenis) ---------- */
  const st = window.ScrollTrigger;
  if (st) {
    gsap.registerPlugin(st);
    if (lenis) lenis.on('scroll', st.update);
  }

  if (st) {
    window.addEventListener('load', () => st.refresh());
    document.fonts?.ready.then(() => st.refresh()); // les polices web changent la hauteur du texte, donc les positions
  }

  gsap.matchMedia().add('(prefers-reduced-motion: no-preference)', () => {
    if (!st) { free.classList.add('is-in'); document.querySelector('.tools').classList.add('is-in'); document.querySelector('.sep').classList.add('is-in'); return; } // sans ScrollTrigger : tout reste visible

    gsap.timeline({ scrollTrigger: { trigger: free, start: 'top 65%', once: true }, defaults: { ease: 'power3.out' } })
      // titre + accroche, puis surlignage peint
      .fromTo('.collab__body > div[data-reveal]', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.9 }, 0.2)
      .fromTo('.collab mark', { backgroundSize: '0% 100%' }, { backgroundSize: '100% 100%', duration: 0.9, ease: 'power2.inOut' }, 0.9);

    // la tige se dessine avec le scroll ; chaque feuille pousse puis son texte apparaît quand la tige l'atteint
    gsap.to('.collab__list', { '--stem': 1, ease: 'none', scrollTrigger: { trigger: '.collab__list', start: 'top 75%', end: 'bottom 60%', scrub: true } });
    gsap.utils.toArray('.reason').forEach((row) => {
      gsap.timeline({ scrollTrigger: { trigger: row, start: 'top 75%', once: true }, defaults: { ease: 'power3.out' } })
        .fromTo(row.querySelector('.reason__leaf'), { opacity: 0, scale: 0, rotate: -90 }, { opacity: 1, scale: 1, rotate: 0, duration: 0.6, ease: 'back.out(2.5)' }, 0)
        .fromTo(row.querySelectorAll('.reason__head, .reason__text'), { opacity: 0, x: -16 }, { opacity: 1, x: 0, duration: 0.7, stagger: 0.12 }, 0.15);
    });

    // séparateur : la vague se trace de gauche à droite quand on l'atteint
    gsap.fromTo('.sep', { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: 1.4, ease: 'power2.inOut', scrollTrigger: { trigger: '.sep', start: 'top 90%', once: true } });

    // outils : l'intro se pose, chaque bloc se dévoile en « feuille » (clip-path) puis ses outils éclosent un à un ;
    // ensuite les icônes flottent doucement tant que la section est à l'écran, et réagissent au survol
    gsap.fromTo('.tools__head', { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out', stagger: 0.15, scrollTrigger: { trigger: '.tools', start: 'top 60%', once: true } });
    gsap.utils.toArray('.tools__block').forEach((block, i) => {
      gsap.timeline({ scrollTrigger: { trigger: block, start: 'top 85%', once: true }, defaults: { ease: 'power3.out' } })
        .fromTo(block, { opacity: 0, y: 40, clipPath: 'inset(0 0 100% 0 round 0 2.5rem 0 2.5rem)' }, { opacity: 1, y: 0, clipPath: 'inset(0 0 0% 0 round 0 2.5rem 0 2.5rem)', duration: 0.9, clearProps: 'clipPath' }, (i % 3) * 0.08)
        .fromTo(block.querySelector('h3'), { opacity: 0, x: -16 }, { opacity: 1, x: 0, duration: 0.6 }, '-=0.5')
        .fromTo(block.querySelectorAll('.tool, .tools__plus'), { opacity: 0, scale: 0.4, rotate: -14, y: 18 }, { opacity: 1, scale: 1, rotate: 0, y: 0, duration: 0.7, stagger: 0.09, ease: 'back.out(2.2)', clearProps: 'transform' }, '-=0.35');
    });

    const floats = gsap.utils.toArray('.tool__icon').map((icon) =>
      gsap.to(icon, { y: -3, duration: gsap.utils.random(1.8, 3), delay: gsap.utils.random(0, 1.5), repeat: -1, yoyo: true, ease: 'sine.inOut', paused: true }));
    st.create({ trigger: '.tools', start: 'top bottom', end: 'bottom top', onToggle: (self) => floats.forEach((f) => (self.isActive ? f.play() : f.pause())) });

    gsap.matchMedia().add('(hover: hover)', () => {
      gsap.utils.toArray('.tool').forEach((tool) => {
        const icon = tool.querySelector('.tool__icon');
        const on = () => gsap.to(icon, { scale: 1.15, rotate: gsap.utils.random(-9, 9), duration: 0.5, ease: 'elastic.out(1, 0.5)', overwrite: 'auto' });
        const off = () => gsap.to(icon, { scale: 1, rotate: 0, duration: 0.4, ease: 'power2.out', overwrite: 'auto' });
        tool.addEventListener('mouseenter', on); tool.addEventListener('mouseleave', off);
      });
    });
  });


  // Titres découpés en mots/lettres (sans plugin) ; aria-label garde le titre lisible pour les lecteurs d'écran
  const splitChars = (heading) => {
    const original = heading.innerHTML;
    heading.setAttribute('aria-label', heading.textContent.replace(/\s+/g, ' ').trim());
    const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => {
      const frag = document.createDocumentFragment();
      node.textContent.split(/(\s+)/).forEach((part) => {
        if (!part.trim()) { if (part) frag.append(part); return; }
        const word = document.createElement('span');
        word.className = 'word';
        word.setAttribute('aria-hidden', 'true');
        [...part].forEach((ch) => { const s = document.createElement('span'); s.className = 'char'; s.textContent = ch; word.append(s); });
        frag.append(word);
      });
      node.replaceWith(frag);
    });
    return { chars: heading.querySelectorAll('.char'), restore: () => { heading.innerHTML = original; heading.removeAttribute('aria-label'); } };
  };

  /* ---------- Nos prestations : arrivée orchestrée (tracé des illustrations), petites boucles de vie, survol, dépliage ---------- */
  gsap.matchMedia().add('(prefers-reduced-motion: no-preference)', () => {
    if (!st) return;
    // Titre : lettres qui montent dans leur masque, puis revert (le HTML d'origine est remis une fois l'animation finie)
    const title = splitChars(document.querySelector('.svc__title'));
    gsap.from(title.chars, {
      yPercent: 110, autoAlpha: 0, duration: 0.7, stagger: 0.035, ease: 'power4.out', onComplete: title.restore,
      scrollTrigger: { trigger: '.svc__title', start: 'top 88%', once: true },
    });

    const items = gsap.utils.toArray('.svc__item');
    const grid = document.querySelector('.svc__grid');
    const strokes = gsap.utils.toArray('.svc__ill .d');
    strokes.forEach((p) => p.setAttribute('pathLength', 1)); // longueur normalisée : tracé 1 → 0 pour tous les traits
    gsap.set(strokes, { strokeDasharray: 1 });

    // 1. Arrivée : par colonne, filet jaune → feuille → traits → pastilles jaunes → texte
    // Mobile / tablette : un service par écran, chaque service s'anime à SON arrivée ; sur desktop, les 4 colonnes arrivent ensemble
    const mob = matchMedia('(max-width: 62rem)').matches;
    const intro = gsap.timeline(mob ? {} : { scrollTrigger: { trigger: grid, start: 'top 90%', once: true } });
    items.forEach((it, i) => {
      const q = gsap.utils.selector(it);
      const t = mob ? 0 : i * 0.1;
      const tl = mob ? gsap.timeline({ scrollTrigger: { trigger: it, start: 'top 60%', once: true } }) : intro;
      tl
        .from(it, { '--bar': 0, duration: 0.5, ease: 'power3.out' }, t)
        .from(q('.ill-bg'), { scale: 0.6, autoAlpha: 0, transformOrigin: '50% 50%', duration: 0.5, ease: 'back.out(1.6)' }, t)
        .from(q('.d'), { strokeDashoffset: 1, duration: 0.6, stagger: 0.02, ease: 'power2.out' }, t + 0.1)
        .from(q('.pop, .heart, .dot'), { scale: 0, transformOrigin: '50% 50%', duration: 0.35, stagger: 0.05, ease: 'back.out(3)' }, t + 0.4)
        .from(q('.svc__head > *, .svc__text > *'), { autoAlpha: 0, y: mob ? 28 : 16, duration: mob ? 0.7 : 0.45, stagger: mob ? 0.1 : 0.05, ease: 'power3.out' }, t + 0.2);
      if (!mob) return;
      tl.from(q('.svc__head h3'), { '--bar-x': 0, duration: 0.8, ease: 'power3.inOut' }, t + 0.6); // le trait jaune sous le titre se trace
      // en défilant, l'illustration glisse plus lentement que le texte (profondeur) puis le service s'estompe en sortant
      gsap.fromTo(q('.svc__ill'), { yPercent: 10 }, { yPercent: -10, ease: 'none', scrollTrigger: { trigger: it, start: 'top bottom', end: 'bottom top', scrub: true } });
      gsap.to(it, { opacity: 0.1, ease: 'none', scrollTrigger: { trigger: it, start: 'bottom 55%', end: 'bottom 5%', scrub: true } });
    });

    // 2. Boucles de vie, une par illustration, jouées seulement quand la colonne est à l'écran et l'arrivée terminée
    const pulse = { scale: 1.12, transformOrigin: '50% 100%', duration: 0.35, yoyo: true, repeat: 1, ease: 'power2.out' };
    const redraw = { strokeDashoffset: 0, duration: 0.7, ease: 'power2.inOut' };
    const loops = [
      (q) => gsap.timeline({ repeat: -1, repeatDelay: 1 }) // service client : les bulles se répondent
        .to(q('.b1'), pulse).to(q('.b2'), pulse, '+=.2').fromTo(q('.chk'), { strokeDashoffset: 1 }, redraw, '<'),
      (q) => gsap.timeline({ repeat: -1, repeatDelay: 0.8 }) // prospection : l'appel part, le rendez-vous se confirme
        .fromTo(q('.wave'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4, stagger: 0.25 })
        .to(q('.wave'), { autoAlpha: 0, duration: 0.4 }, '+=.2')
        .fromTo(q('.chk'), { strokeDashoffset: 1 }, redraw, '-=.3')
        .to(q('.rdv'), { scale: 1.25, transformOrigin: '50% 50%', duration: 0.3, yoyo: true, repeat: 1 }, '<'),
      (q) => gsap.timeline({ repeat: -1 }) // community : les cœurs montent, le like bat, les points « écrivent »
        .fromTo(q('.heart'), { y: 0, autoAlpha: 1 }, { y: -36, autoAlpha: 0, duration: 2, stagger: 1, ease: 'power1.out' }, 0)
        .to(q('.like'), { scale: 1.5, transformOrigin: '50% 50%', duration: 0.22, yoyo: true, repeat: 3 }, 0.2)
        .to(q('.dot'), { y: -4, duration: 0.25, yoyo: true, repeat: 5, stagger: 0.12 }, 0),
      (q) => gsap.timeline({ repeat: -1 }) // assistance : les tâches se cochent, l'horloge tourne
        .to(q('.hand'), { rotation: 360, svgOrigin: '40 74', duration: 5, ease: 'none' }, 0)
        .fromTo(q('.chk'), { strokeDashoffset: 1 }, { ...redraw, duration: 0.5, stagger: 0.8 }, 0.3)
        .to(q('.chk'), { strokeDashoffset: 1, duration: 0.3 }, 4.4),
    ];
    let ready = false;
    intro.eventCallback('onComplete', () => { ready = true; sync(); });
    const state = items.map((it, i) => {
      const tl = loops[i](gsap.utils.selector(it)).pause();
      const s = { tl, active: false };
      st.create({ trigger: it, start: 'top 90%', end: 'bottom 10%', onToggle: (self) => { s.active = self.isActive; sync(); } });
      return s;
    });
    function sync() { state.forEach((s, i) => s.tl.paused(!(ready && s.active && !items[i].classList.contains('is-open')))); }

    // 3. Survol : le filet jaune s'étend, l'illustration se soulève
    const hover = (it, on) => {
      gsap.to(it, { '--bw': on ? '100%' : '4rem', duration: 0.6, ease: 'power3.out', overwrite: 'auto' });
      gsap.to(it.querySelector('.svc__ill'), { y: on ? -6 : 0, duration: 0.5, ease: 'power3.out', overwrite: 'auto' });
    };
    const enter = (e) => hover(e.currentTarget, true);
    const leave = (e) => hover(e.currentTarget, false);
    items.forEach((it) => { it.addEventListener('pointerenter', enter); it.addEventListener('pointerleave', leave); });

    // 4. « Lire la suite » : une vague d'encre (jaune puis crème) naît du bouton « + » et recouvre la colonne. Rien ne bouge dans la page.
    //    Une seule feuille ouverte à la fois ; Échap, croix ou clic à côté la referme ; la vague se rétracte vers le bouton.
    const WAVE = { duration: 0.8, ease: 'power3.inOut', stagger: 0.1 };
    const sheets = items.map((it) => {
      const more = it.querySelector('.svc__more');
      if (!more) return null;
      const title = it.querySelector('h3');
      const sheet = document.createElement('div');
      sheet.className = 'svc__sheet';
      sheet.setAttribute('role', 'region');
      sheet.setAttribute('aria-label', `Détail : ${title.textContent}`);
      const inner = document.createElement('div');
      inner.className = 'svc__sheet-in';
      inner.innerHTML = `<button type="button" class="svc__close" aria-label="Fermer le détail"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button><p class="svc__sheet-title">${title.innerHTML}</p>`;
      more.querySelectorAll('p').forEach((p) => inner.append(p.cloneNode(true)));
      inner.insertAdjacentHTML('beforeend', '<a class="btn svc__sheet-cta" href="#contact">Discuter de ce service <span aria-hidden="true">→</span></a>');
      sheet.append(inner);
      it.append(sheet);
      return { it, sheet, inner, sum: more.querySelector('summary'), content: [...inner.children].filter((c) => !c.matches('.svc__close')), isOpen: false };
    }).filter(Boolean);

    // cercle centré sur le « + » du bouton, assez grand pour couvrir toute la colonne
    const circle = (s) => {
      const ir = s.it.getBoundingClientRect(), br = s.sum.getBoundingClientRect();
      const x = br.left - ir.left + 12, y = br.top - ir.top + br.height / 2;
      const R = Math.hypot(Math.max(x, ir.width - x), Math.max(y + 16, ir.height - y)) + 8;
      return (r) => `circle(${r}px at ${x}px ${y}px)`;
    };
    const rest = (s) => [...s.it.children].filter((c) => c !== s.sheet);
    const stop = (s) => gsap.killTweensOf([s.sheet, s.inner, ...s.content, ...rest(s)]);

    const openSheet = (s) => {
      sheets.filter((o) => o.isOpen && o !== s).forEach(closeSheet);
      const { it, sheet, inner, sum, content } = s;
      const at = circle(s), R = Math.hypot(it.offsetWidth, it.offsetHeight) + 40;
      s.isOpen = true; s.at = at; s.R = R;
      it.classList.add('is-open'); sync();
      rest(s).forEach((c) => { c.inert = true; });
      sum.setAttribute('aria-expanded', 'true');
      stop(s);
      gsap.timeline()
        .set(sheet, { visibility: 'visible' })
        .to(rest(s), { opacity: 0.25, duration: 0.5, ease: 'power2.out' }, 0)
        .fromTo([sheet, inner], { clipPath: at(0) }, { clipPath: at(R), ...WAVE, clearProps: 'clipPath' }, 0)
        .fromTo(content, { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.07, ease: 'power3.out' }, 0.45)
        .add(() => inner.querySelector('.svc__close').focus({ preventScroll: true }), 0.55);
    };
    function closeSheet(s, focus = true) {
      if (!s.isOpen) return;
      const { it, sheet, inner, sum, content } = s;
      const at = circle(s), R = Math.hypot(it.offsetWidth, it.offsetHeight) + 40;
      s.isOpen = false;
      it.classList.remove('is-open'); sync(); // avant le focus : le bouton « + » redevient visible et focalisable
      rest(s).forEach((c) => { c.inert = false; }); // idem : un élément inert ne reçoit pas le focus
      sum.setAttribute('aria-expanded', 'false');
      if (focus) sum.focus({ preventScroll: true });
      stop(s);
      gsap.timeline({ onComplete: () => {
        gsap.set(sheet, { visibility: 'hidden', clearProps: 'clipPath' }); gsap.set([inner, ...content], { clearProps: 'all' });
      } })
        .to(content, { autoAlpha: 0, y: -8, duration: 0.2, stagger: 0.02 }, 0)
        .fromTo([inner, sheet], { clipPath: at(R) }, { clipPath: at(0), ...WAVE, duration: 0.65 }, 0.05)
        .to(rest(s), { opacity: 1, duration: 0.5, ease: 'power2.out', clearProps: 'opacity' }, 0.2);
    }
    const onMore = (e) => {
      const sum = e.target.closest('.svc__more summary');
      const own = sheets.find((x) => x.inner.contains(e.target));
      if (sum) { e.preventDefault(); openSheet(sheets.find((x) => x.sum === sum)); } // le <details> natif reste fermé
      else if (own && e.target.closest('.svc__close')) closeSheet(own);
      else if (own && e.target.closest('.svc__sheet-cta')) closeSheet(own, false);
    };
    const onOutside = (e) => { if (!e.target.closest('.svc__sheet, .svc__more')) sheets.forEach((s) => closeSheet(s, false)); };
    const onKey = (e) => { if (e.key === 'Escape') sheets.forEach((s) => closeSheet(s)); };
    grid.addEventListener('click', onMore);
    document.addEventListener('pointerdown', onOutside);
    document.addEventListener('keydown', onKey);

    return () => {
      title.restore();
      items.forEach((it) => { it.removeEventListener('pointerenter', enter); it.removeEventListener('pointerleave', leave); });
      grid.removeEventListener('click', onMore);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onOutside);
      sheets.forEach((s) => { s.sheet.remove(); [...s.it.children].forEach((c) => { c.inert = false; }); });
    };
  });

  /* ---------- Slider de sections : molette, swipe tactile, clavier, liens ---------- */
  gsap.matchMedia().add({
    slider: '(max-width: 62rem) and (min-height: 36rem), (min-width: 62rem) and (min-height: 46rem)',
    calm: '(prefers-reduced-motion: reduce)',
  }, ({ conditions: { slider, calm } }) => {
    if (!slider) {
      root.classList.remove('is-slider', 'is-locked', 'is-free');
      return startNativeNav();
    }
    root.classList.add('is-slider', 'is-locked');
    if (lenis) lenis.stop();
    window.scrollTo(0, 0); // le navigateur peut avoir restauré un scroll : le slider repart toujours du haut

    const splits = new Map(panels.map((p) => [p, splitChars(p.querySelector('h1, h2'))]));

    let current = Math.max(0, panels.findIndex((p) => `#${p.id}` === location.hash));
    let busy = false;

    // Verrouillé : la molette pilote les panneaux. Après le dernier panneau on déverrouille et la page défile (Lenis).
    let locked = true;
    let unlocking = false;
    const last = panels.length - 1;

    const unlock = (target = free) => {
      if (!locked || unlocking) return;
      locked = false;
      unlocking = true;
      observer.disable();
      root.classList.replace('is-locked', 'is-free');
      if (lenis) { lenis.start(); lenis.scrollTo(target, { duration: calm ? 0 : 1.2 }); }
      else target.scrollIntoView({ behavior: calm ? 'auto' : 'smooth' });
      gsap.delayedCall(1.4, () => {
        unlocking = false;
        // Les sections libres suivent le dernier panneau : en remontant on repasse par lui, jamais directement à l'accueil
        current = last;
        panels.forEach((p, i) => p.classList.toggle('is-current', i === last));
      });
    };
    const relock = () => {
      if (locked || unlocking || window.scrollY > 0) return;
      locked = true;
      root.classList.replace('is-free', 'is-locked');
      if (lenis) lenis.stop();
      observer.enable();
      setActiveLink(panels[current].id);
    };
    window.addEventListener('scroll', relock, { passive: true });
    const freeNav = new IntersectionObserver((entries) => entries.forEach(({ target, isIntersecting }) => {
      if (isIntersecting && !locked) setActiveLink(target.id);
    }), { rootMargin: '-50% 0px -50% 0px' });
    freeZone.querySelectorAll('section').forEach((s) => freeNav.observe(s));

    const sync = () => {
      panels.forEach((p, i) => p.classList.toggle('is-current', i === current));
      setActiveLink(panels[current].id);
    };
    sync();

    // Éléments décalés en parallaxe (pas le conteneur : un transform y casserait le positionnement absolu de la photo du hero)
    const parallax = (panel) => panel.querySelectorAll('.hero__content, .hero__media, .about__inner > *');

    const goTo = (index) => {
      if (busy || index < 0 || index >= panels.length || index === current) return;
      busy = true;

      const dir = index > current ? 1 : -1;
      const from = panels[current];
      const to = panels[index];

      to.classList.add('is-current');
      setActiveLink(to.id);
      // Effet « rideau » : la nouvelle section se dévoile depuis le bord, son contenu reste en place (parallaxe douce),
      // l'ancienne recule un peu, et les lettres du titre montent en ordre aléatoire (démo GSAP « Animated Sections »)
      const reveal = dir > 0 ? 'inset(100% 0% 0% 0%)' : 'inset(0% 0% 100% 0%)';
      gsap.set(to, { zIndex: 2, clipPath: reveal });
      gsap.set(from, { zIndex: 1 });

      const tl = gsap.timeline({
        defaults: { duration: calm ? 0 : 1.25, ease: 'power1.inOut' },
        onComplete: () => {
          gsap.set([from, to, ...parallax(from), ...parallax(to)], { clearProps: 'transform,zIndex,clipPath' });
          current = index;
          sync();
          history.replaceState(null, '', `#${to.id}`);
          gsap.delayedCall(0.25, () => { busy = false; }); // laisse retomber l'inertie du trackpad
        },
      });
      tl.to(to, { clipPath: 'inset(0% 0% 0% 0%)' }, 0)
        .to(from, { yPercent: -15 * dir }, 0)
        .fromTo(parallax(to), { yPercent: 15 * dir }, { yPercent: 0 }, 0)
        .fromTo(to.querySelectorAll('[data-slide-in]'),
          { opacity: 0, y: 40 * dir },
          { opacity: 1, y: 0, duration: calm ? 0 : 0.9, stagger: calm ? 0 : 0.09, ease: 'power3.out', clearProps: 'opacity,transform' },
          calm ? 0 : 0.45)
        .fromTo(splits.get(to).chars, { autoAlpha: 0, yPercent: 150 * dir },
          { autoAlpha: 1, yPercent: 0, duration: calm ? 0 : 1, ease: 'power2', stagger: { each: calm ? 0 : 0.02, from: 'random' } }, calm ? 0 : 0.2);
    };

    // Molette et swipe : avec wheelSpeed -1, « onUp » = aller à la section suivante.
    // Deux observers : le mode touch d'Observer avale les clics, on l'écarte donc des liens et boutons.
    const nav = { wheelSpeed: -1, tolerance: 12,
      onUp: () => (current < last ? goTo(current + 1) : unlock()), onDown: () => goTo(current - 1) };
    const observers = [Observer.create({ ...nav, type: 'wheel' }),
      Observer.create({ ...nav, type: 'touch', ignore: 'a, button, summary' })];
    const observer = ['enable', 'disable', 'kill'].reduce((o, m) => ({ ...o, [m]: () => observers.forEach((x) => x[m]()) }), {});

    const onKey = (e) => {
      const next = { ArrowDown: current + 1, PageDown: current + 1, ArrowUp: current - 1, PageUp: current - 1,
        Home: 0, End: panels.length - 1 }[e.key];
      if (next === undefined || !locked) return;
      e.preventDefault();
      if (e.key === 'End' || next > last) unlock(); else goTo(next);
    };

    // Liens internes (navbar, logo, bouton) : vers le panneau qui contient la cible
    const onClick = (e) => {
      const link = e.target.closest('a[href^="#"]');
      const target = link && link.hash.length > 1 && document.querySelector(link.hash);
      if (!target) return;
      const index = panels.indexOf(target.closest('.panel'));
      if (index < 0 && !freeZone.contains(target)) return;
      e.preventDefault();
      if (!locked) { lenis ? lenis.scrollTo(target) : target.scrollIntoView({ behavior: 'smooth' }); return; }
      if (index < 0) unlock(target.closest('section')); else goTo(index);
    };

    document.addEventListener('keydown', onKey);
    document.addEventListener('click', onClick);

    // Hash modifié à la main (sans clic sur un lien) : même traitement que les liens
    const onHash = () => {
      const t = location.hash.length > 1 && document.querySelector(location.hash);
      if (!t || !locked) return;
      const i = panels.indexOf(t.closest('.panel'));
      if (i >= 0) goTo(i); else if (freeZone.contains(t)) unlock(t.closest('section'));
    };
    window.addEventListener('hashchange', onHash);

    // Rechargement ou lien direct vers une section libre (#services…) : on déverrouille et on y va
    const entry = location.hash.length > 1 && document.querySelector(location.hash);
    if (entry && freeZone.contains(entry)) gsap.delayedCall(0.2, () => unlock(entry.closest('section')));

    return () => {
      observer.kill();
      window.removeEventListener('hashchange', onHash);
      window.removeEventListener('scroll', relock);
      freeNav.disconnect();
      splits.forEach((s) => s.restore());
      if (lenis) lenis.start();
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('click', onClick);
      gsap.set(panels, { clearProps: 'all' });
      root.classList.remove('is-slider', 'is-locked', 'is-free');
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
      [...details.closest('.about__points').querySelectorAll('details')].filter((d) => d !== details && d.open).forEach(close);
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
