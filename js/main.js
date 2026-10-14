/* Happy Culteur — interactions et animations GSAP */
(() => {
  'use strict';

  // Le slider écrit le panneau courant dans l'URL (#qui-sommes-nous…) : un rechargement (F5) repart de l'accueil, un lien partagé avec # reste respecté
  if (performance.getEntriesByType('navigation')[0]?.type === 'reload' && location.hash) history.replaceState(null, '', location.pathname + location.search);

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

  /* ---------- Nos prestations (mobile / tablette) : points de progression, pilotés par la section épinglée ---------- */

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
  if (window.SplitText) gsap.registerPlugin(SplitText);

  const smooth = matchMedia('(prefers-reduced-motion: no-preference)').matches;

  /* ---------- Header « directionnel » : se cache quand on descend, revient dès qu'on remonte ---------- */
  const moveHeader = gsap.quickTo(header, 'yPercent', { duration: smooth ? 0.4 : 0, ease: 'power3.out' });
  let lastY = window.scrollY;
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    header.classList.toggle('is-scrolled', y > 10); // fond blanc dès qu'on a quitté le haut de page
    if (Math.abs(y - lastY) < 4) return; // ignore les micro-mouvements du trackpad
    if (traveling) { lastY = y; moveHeader(0); return; } // trajet lancé depuis la navbar : elle reste visible
    if (document.documentElement.classList.contains('svc-lock')) { lastY = y; return; } // feuille de détail ouverte : le verrou / la barre d'adresse décalent le scroll, ce n'est pas l'utilisateur qui remonte
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

  /* ---------- Trajets vers une section (liens) : toujours doux, quelle que soit la distance ---------- */
  // Court (≤ 1 écran) : glissé dont la durée suit la distance. Long : un voile blanc couvre la page, saut exact sur la cible, le voile s'efface
  // (pas de glissé final : il montrait le bas de la section précédente ; on ne traverse pas non plus en accéléré les sections épinglées).
  const veil = Object.assign(document.createElement('div'), { className: 'veil' });
  veil.setAttribute('aria-hidden', 'true');
  document.body.append(veil);
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const glide = (to, duration, done) => {
    if (lenis) return lenis.scrollTo(to, { duration, immediate: !duration, easing: easeInOut, lock: true, force: true, onComplete: done });
    window.scrollTo({ top: to, behavior: duration ? 'smooth' : 'instant' });
    if (done) setTimeout(done, duration * 1000 + 50);
  };
  // Sous le voile, `done(true)` est appelé avant qu'il ne s'efface (retour vers un panneau : il s'affiche sans transition)
  let traveling = false;
  const travel = (target, done) => {
    const at = () => (typeof target === 'number' ? target : target.getBoundingClientRect().top + window.scrollY); // relu à chaque étape : la page a pu bouger
    const dist = at() - window.scrollY, vh = window.innerHeight;
    const end = (veiled) => { traveling = false; if (done) done(veiled); };
    traveling = true;
    if (target.id) setActiveLink(target.id); // lien actif tout de suite, sans défiler sur ceux des sections traversées
    if (!smooth) return glide(at(), 0, end);
    if (Math.abs(dist) <= vh) return glide(at(), gsap.utils.clamp(0.6, 1.3, (Math.abs(dist) / vh) * 0.9), end);
    gsap.to(veil, { opacity: 1, duration: 0.3, ease: 'power2.in', overwrite: true, onComplete: () => {
      glide(at(), 0);
      end(true);
      gsap.to(veil, { opacity: 0, duration: 0.7, delay: 0.1, ease: 'power2.out' });
    } });
  };

  /* ---------- Section libre : animation à l'arrivée dans l'écran (ScrollTrigger, calé sur Lenis) ---------- */
  const st = window.ScrollTrigger;
  const draw = window.DrawSVGPlugin; // CDN bloqué : on saute les tracés, le reste des animations joue quand même
  if (draw) gsap.registerPlugin(draw);
  if (st) {
    gsap.registerPlugin(st);
    if (lenis) lenis.on('scroll', st.update);
  }

  if (st) {
    window.addEventListener('load', () => st.refresh());
    document.fonts?.ready.then(() => st.refresh()); // les polices web changent la hauteur du texte, donc les positions
  }

  gsap.matchMedia().add('(prefers-reduced-motion: no-preference)', () => {
    if (!st) { free.classList.add('is-in'); document.querySelector('.tools').classList.add('is-in'); return; } // sans ScrollTrigger : tout reste visible

    gsap.timeline({ scrollTrigger: { trigger: free, start: 'top 65%', once: true }, defaults: { ease: 'power3.out' } })
      // titre + accroche, puis surlignage peint
      .fromTo('.collab__body > div[data-reveal]', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.9 }, 0.2)
      .fromTo('.collab mark', { backgroundSize: '0% 100%' }, { backgroundSize: '100% 100%', duration: 0.9, ease: 'power2.inOut' }, 0.9);

    // la trajectoire de vol se trace avec le scroll (l'abeille suit --stem en CSS) ; chaque alvéole éclot puis son texte apparaît quand l'abeille l'atteint
    gsap.to('.collab__list', { '--stem': 1, ease: 'none', scrollTrigger: { trigger: '.collab__list', start: 'top 75%', end: 'bottom 60%', scrub: true } });
    gsap.utils.toArray('.reason').forEach((row) => {
      gsap.timeline({ scrollTrigger: { trigger: row, start: 'top 75%', once: true }, defaults: { ease: 'power3.out' } })
        .fromTo(row.querySelector('.reason__ill'), { opacity: 0, scale: 0.85 }, { opacity: 1, scale: 1, duration: 0.7, ease: 'back.out(2)' }, 0)
        .add(draw ? gsap.fromTo(row.querySelectorAll('.reason__ill .d:not(.piece)'), { drawSVG: 0 }, { drawSVG: '100%', duration: 0.8, ease: 'power2.inOut', stagger: 0.06 }) : gsap.timeline(), 0.1)
        // chaque illustration a son geste : la pièce s'emboîte, la batterie se charge et le wifi s'allume, les 14 jours se colorient
        .fromTo(row.querySelectorAll('.piece'), { x: 26, rotation: 18, transformOrigin: '50% 50%' }, { x: 0, rotation: 0, duration: 0.9, ease: 'back.out(1.8)' }, 0.6)
        .fromTo(row.querySelectorAll('.level'), { scaleY: 0, transformOrigin: '50% 100%' }, { scaleY: 1, duration: 1, ease: 'power2.out' }, 0.6)
        .fromTo(row.querySelectorAll('.wifi'), { opacity: 0 }, { opacity: 1, duration: 0.3, stagger: 0.15 }, 1.1)
        .fromTo(row.querySelectorAll('.day'), { scale: 0, transformOrigin: '50% 50%' }, { scale: 1, duration: 0.35, ease: 'back.out(3)', stagger: 0.06 }, 0.6)
        .fromTo(row.querySelectorAll('.reason__ill .pop'), { scale: 0, transformOrigin: '50% 50%' }, { scale: 1, duration: 0.5, ease: 'back.out(3)' }, 1.2)
        .fromTo(row.querySelectorAll('.reason__head, .reason__text'), { opacity: 0, x: -16 }, { opacity: 1, x: 0, duration: 0.7, stagger: 0.12 }, 0.15);
    });

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
    // Mobile / tablette : onglets, un service à la fois (voir plus bas) ; desktop : les 4 colonnes arrivent ensemble
    const pin = matchMedia('(max-width: 62rem)').matches;
    const section = document.querySelector('.services');
    if (pin) section.classList.add('is-flow');
    const revealIll = (tl, ill, t) => {
      const q = gsap.utils.selector(ill);
      tl.from(q('.ill-bg'), { scale: 0.6, autoAlpha: 0, transformOrigin: '50% 50%', duration: 0.5, ease: 'back.out(1.6)' }, t)
        .from(q('.d'), { strokeDashoffset: 1, duration: 0.6, stagger: 0.02, ease: 'power2.out' }, t + 0.1)
        .from(q('.pop, .heart, .dot'), { scale: 0, transformOrigin: '50% 50%', duration: 0.35, stagger: 0.05, ease: 'back.out(3)' }, t + 0.4);
    };
    const revealText = (tl, it, t, m) => {
      const q = gsap.utils.selector(it);
      tl.from(q('.svc__head > *, .svc__text > *'), { autoAlpha: 0, y: m ? 28 : 16, duration: m ? 0.7 : 0.45, stagger: m ? 0.1 : 0.05, ease: 'power3.out' }, t + 0.2);
      if (m) tl.fromTo(q('.svc__head h3'), { '--bar-x': 0 }, { '--bar-x': 1, duration: 0.8, ease: 'power3.inOut' }, t + 0.6); // le trait jaune sous le titre se trace
    };
    const reveal = (tl, it, t, m) => { revealIll(tl, it, t); revealText(tl, it, t, m); };
    const intro = gsap.timeline(pin ? {} : { scrollTrigger: { trigger: grid, start: 'top 90%', once: true } });
    if (!pin) items.forEach((it, i) => { intro.from(it, { '--bar': 0, duration: 0.5, ease: 'power3.out' }, i * 0.1); reveal(intro, it, i * 0.1, false); });

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
      if (!pin) st.create({ trigger: it, start: 'top 90%', end: 'bottom 10%', onToggle: (self) => { s.active = self.isActive; sync(); } });
      return s;
    });
    function sync() { state.forEach((s, i) => s.tl.paused(!((pin ? s.done : ready) && s.active && !items[i].classList.contains('is-open')))); }

    const undo = []; // à défaire quand on quitte le mode mobile
    // Mobile / tablette : défilement natif, rien d'épinglé ni d'accroché. Chaque service joue une entrée complète quand il arrive à l'écran
    // (une seule fois, indépendante du doigt) : sa feuille crème bascule d'un coin à l'autre, les traits se dessinent, le titre monte
    // lettre par lettre, le texte sort ligne par ligne. La boucle de vie de l'illustration tourne tant que le bloc est visible.
    if (pin) {
      const heads = items.map((it) => { const h = it.querySelector('h3'); it.dataset.t = h.innerHTML; return splitChars(h); }); // dataset : la feuille de détail reprend le titre intact
      let paras = [];
      const leaves = items.map((it) => { const l = document.createElement('div'); l.className = 'svc__leaf'; l.setAttribute('aria-hidden', 'true'); it.prepend(l); return l; });
      const end = document.createElement('div');
      end.className = 'svc__end';
      const cta = document.querySelector('.svc__top .btn');
      end.append(cta);
      grid.after(end);
      undo.push(...heads.map((h) => h.restore), () => { document.querySelector('.svc__top').append(cta); end.remove(); leaves.forEach((l) => l.remove()); });
      let alive = true;
      undo.push(() => { alive = false; });
      // Les lignes se découpent après le chargement des polices (sinon elles se recoupent et l'animation vise d'anciennes lignes)
      (document.fonts?.ready ?? Promise.resolve()).then(() => { if (!alive) return;
      paras = items.map((it) => { const p = it.querySelector('.svc__text > p'); return window.SplitText ? SplitText.create(p, { type: 'lines', mask: 'lines', reduceWhiteSpace: false }) : { lines: [p], revert() {} }; });
      undo.push(() => paras.forEach((p) => p.revert()));
      items.forEach((it, i) => {
        const q = gsap.utils.selector(it), dir = i % 2 ? -1 : 1;
        const fills = [...it.querySelectorAll('.svc__ill *')].filter((e) => getComputedStyle(e).fill === 'rgb(255, 255, 255)'); // remplissages blancs : ils n'apparaissent qu'avec le trait
        const tl = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' }, onComplete: () => { state[i].done = true; sync(); } })
          .fromTo(leaves[i], { rotation: -5 * dir, scale: 0.9, autoAlpha: 0 }, { rotation: 0, scale: 1, autoAlpha: 1, duration: 0.9, ease: 'back.out(1.5)' }, 0)
          .fromTo(q('.d'), { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.7, stagger: 0.025, ease: 'power2.inOut' }, 0.3)
          .fromTo(fills, { fillOpacity: 0 }, { fillOpacity: 1, duration: 0.5, ease: 'power1.in' }, 0.65)
          .fromTo(q('.pop, .heart, .dot'), { scale: 0 }, { scale: 1, transformOrigin: '50% 50%', duration: 0.4, stagger: 0.05, ease: 'back.out(3)' }, 0.7)
          .fromTo(heads[i].chars, { yPercent: 110 }, { yPercent: 0, duration: 0.7, stagger: 0.018, ease: 'power4.out' }, 0.45)
          .fromTo(q('.svc__head h3'), { '--bar-x': 0 }, { '--bar-x': 1, duration: 0.7, ease: 'power3.inOut' }, 0.75)
          .fromTo(q('.svc__tags'), { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.5 }, 0.8)
          .fromTo(paras[i].lines, { yPercent: 105 }, { yPercent: 0, duration: 0.8, stagger: 0.07, ease: 'power4.out' }, 0.85)
          .fromTo(q('.svc__more'), { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.5 }, 1.15);
        st.create({ trigger: it, start: 'top 72%', once: true, onEnter: () => tl.play() });
        st.create({ trigger: it, start: 'top 90%', end: 'bottom 10%', onToggle: (self) => { state[i].active = self.isActive; sync(); } });
      });
      }); // fin de document.fonts.ready
      gsap.from(cta, { scale: 0.7, autoAlpha: 0, duration: 0.7, ease: 'back.out(2)', scrollTrigger: { trigger: cta, start: 'top 92%', once: true } });
    }

    // 3. Survol : le filet jaune s'étend, l'illustration se soulève
    const hover = (it, on) => {
      gsap.to(it, { '--bw': on ? '100%' : '4rem', duration: 0.6, ease: 'power3.out', overwrite: 'auto' });
      const ill = it.querySelector('.svc__ill');
      if (ill) gsap.to(ill, { y: on ? -6 : 0, duration: 0.5, ease: 'power3.out', overwrite: 'auto' });
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
      inner.innerHTML = `<button type="button" class="svc__close" aria-label="Fermer le détail"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button><p class="svc__sheet-title">${it.dataset.t || title.innerHTML}</p>`;
      more.querySelectorAll('p').forEach((p) => inner.append(p.cloneNode(true)));
      inner.insertAdjacentHTML('beforeend', '<a class="btn svc__sheet-cta" href="#contact">Parlons de ce service <span aria-hidden="true">→</span></a>');
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
    if (pin) sheets.forEach((s) => {
      let y0 = 0, dy = 0, drag = false;
      s.inner.addEventListener('touchstart', (e) => { drag = s.inner.scrollTop <= 0; y0 = e.touches[0].clientY; dy = 0; }, { passive: true });
      s.inner.addEventListener('touchmove', (e) => { if (!drag) return; dy = Math.max(0, e.touches[0].clientY - y0); gsap.set(s.inner, { y: dy }); }, { passive: true });
      s.inner.addEventListener('touchend', () => { if (dy > 90) closeSheet(s); else gsap.to(s.inner, { y: 0, duration: 0.4, ease: 'power3.out' }); dy = 0; drag = false; }, { passive: true });
    });
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
      if (pin) { // mobile : feuille qui monte du bas, fond assombri, page verrouillée
        lenis?.stop(); document.documentElement.classList.add('svc-lock');
        gsap.timeline()
          .set(sheet, { visibility: 'visible' })
          .fromTo(sheet, { opacity: 0 }, { opacity: 1, duration: 0.35, ease: 'power2.out' }, 0)
          .fromTo(inner, { yPercent: 100 }, { yPercent: 0, duration: 0.7, ease: 'power4.out' }, 0)
          .fromTo(content, { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.07, ease: 'power3.out' }, 0.3)
          .add(() => inner.querySelector('.svc__close').focus({ preventScroll: true }), 0.5);
        return;
      }
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
      if (pin) {
        gsap.timeline({ onComplete: () => { lenis?.start(); document.documentElement.classList.remove('svc-lock'); gsap.set(sheet, { visibility: 'hidden', clearProps: 'opacity' }); gsap.set([inner, ...content], { clearProps: 'all' }); } })
          .to(content, { autoAlpha: 0, duration: 0.15 }, 0)
          .to(inner, { yPercent: 100, duration: 0.5, ease: 'power3.in' }, 0)
          .to(sheet, { opacity: 0, duration: 0.4, ease: 'power1.in' }, 0.1)
          .to(rest(s), { opacity: 1, duration: 0.2, clearProps: 'opacity' }, 0);
        return;
      }
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
      else if (e.target.classList.contains('svc__sheet')) closeSheet(sheets.find((x) => x.sheet === e.target)); // fond assombri (mobile)
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
      undo.forEach((f) => f());
      items.forEach((it) => { it.removeEventListener('pointerenter', enter); it.removeEventListener('pointerleave', leave); });
      grid.removeEventListener('click', onMore);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onOutside);
      section.classList.remove('is-flow');
            gsap.set(items, { clearProps: 'visibility,opacity' }); document.documentElement.classList.remove('svc-lock');
      sheets.forEach((s) => { s.sheet.remove(); [...s.it.children].forEach((c) => { c.inert = false; }); });
    };
  });

  /* ---------- Slider de sections : molette, swipe tactile, clavier, liens ---------- */
  gsap.matchMedia().add({
    slider: '(max-width: 62rem) and (min-height: 36rem), (min-width: 62rem) and (min-height: 46rem)',
    calm: '(prefers-reduced-motion: reduce)',
  }, ({ conditions: { slider, calm: quiet } }) => {
    if (!slider) {
      root.classList.remove('is-slider', 'is-locked', 'is-free');
      const onNav = (e) => {
        const link = e.target.closest('a[href^="#"]');
        const target = link && link.hash.length > 1 && document.querySelector(link.hash);
        if (!target) return;
        e.preventDefault();
        travel(target);
      };
      document.addEventListener('click', onNav);
      const stopNav = startNativeNav();
      return () => { stopNav(); document.removeEventListener('click', onNav); };
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

    // Doigt posé ? Lenis annule tout scrollTo au moindre touchmove : le défilement automatique attend donc que le doigt se lève.
    let touching = false;
    const onTouch = (e) => { touching = e.type === 'touchstart'; };
    ['touchstart', 'touchend', 'touchcancel'].forEach((t) => window.addEventListener(t, onTouch, { passive: true, capture: true }));
    const unlock = (target = free) => {
      if (!locked || unlocking) return;
      locked = false;
      unlocking = true;
      observer.disable();
      root.classList.replace('is-locked', 'is-free');
      const hold = (e) => e.preventDefault(); // la fin du swipe ne fait pas défiler la page en natif
      const go = () => {
        window.removeEventListener('touchmove', hold);
        // Molette / swipe : simple élan d'un tiers d'écran, la suite se fait librement (pas d'alignement forcé sur #collaborer).
        // Lien vers une section : on s'aligne sur elle.
        const nudge = target === free;
        const to = nudge ? window.innerHeight * 0.4 : target;
        if (lenis) lenis.start();
        if (!nudge) travel(target);
        else if (lenis) lenis.scrollTo(to, { duration: quiet ? 0 : 0.8, force: true });
        else window.scrollBy({ top: to, behavior: quiet ? 'auto' : 'smooth' });
        gsap.delayedCall(1.4, () => {
          unlocking = false;
          // Les sections libres suivent le dernier panneau : en remontant on repasse par lui, jamais directement à l'accueil
          current = last;
          panels.forEach((p, i) => p.classList.toggle('is-current', i === last));
        });
      };
      if (!touching) return go();
      window.addEventListener('touchmove', hold, { passive: false });
      window.addEventListener('touchend', go, { once: true });
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
      if (isIntersecting && !locked && !traveling) setActiveLink(target.id);
    }), { rootMargin: '-50% 0px -50% 0px' });
    freeZone.querySelectorAll('section').forEach((s) => freeNav.observe(s));

    const sync = () => {
      panels.forEach((p, i) => p.classList.toggle('is-current', i === current));
      setActiveLink(panels[current].id);
    };
    sync();

    // Éléments décalés en parallaxe (pas le conteneur : un transform y casserait le positionnement absolu de la photo du hero)
    const parallax = (panel) => panel.querySelectorAll('.hero__content, .about__inner > *');

    const goTo = (index, instant) => {
      if (busy || index < 0 || index >= panels.length || index === current) return;
      busy = true;

      const dir = index > current ? 1 : -1;
      const calm = quiet || instant; // instant : panneau affiché sous le voile, sans transition
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
          calm ? 0 : 0.95)
        .fromTo(splits.get(to).chars, { autoAlpha: 0, yPercent: 150 * dir },
          { autoAlpha: 1, yPercent: 0, duration: calm ? 0 : 1, ease: 'power2', stagger: { each: calm ? 0 : 0.02, from: 'random' } }, calm ? 0 : 0.75);
    };

    // Molette et swipe : avec wheelSpeed -1, « onUp » = aller à la section suivante.
    // Deux observers : le mode touch d'Observer avale les clics, on l'écarte donc des liens et boutons.
    // Les <summary> de « Qui sommes-nous » couvrent presque tout l'écran mobile : on ne les ignore pas (sinon il faut swiper deux fois),
    // dragMinimum garde un tap (< 10 px) comme un clic qui ouvre l'accordéon.
    const nav = { wheelSpeed: -1, tolerance: 12,
      onUp: () => (current < last ? goTo(current + 1) : unlock()), onDown: () => goTo(current - 1) };
    const observers = [Observer.create({ ...nav, type: 'wheel' }),
      Observer.create({ ...nav, type: 'touch', dragMinimum: 10 })];
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
      // Page libre : vers une section libre, trajet doux ; vers un panneau, retour en haut puis passage au bon panneau
      if (!locked) {
        if (index < 0) return travel(target);
        unlocking = true; // pas de reverrouillage en arrivant en haut : il arrêterait Lenis avant la fin du trajet
        return travel(0, (veiled) => { unlocking = false; relock(); goTo(index, veiled); });
      }
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
      ['touchstart', 'touchend', 'touchcancel'].forEach((t) => window.removeEventListener(t, onTouch, { capture: true }));
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

  /* ---------- Hero : ouverture ---------- */
  // Le rayon de miel se trace depuis l'alvéole centrale (DrawSVG), les alvéoles pleines éclosent, les icônes des services
  // se dessinent, puis une onde dorée le parcourt. Le titre monte lettre par lettre (lettres déjà découpées par le slider) ou ligne par ligne.
  const fromCenter = (each) => (i, el) => el.closest('.hc').dataset.d * each + gsap.utils.random(0, each * 0.6); // anneau par anneau, un peu de désordre

  gsap.matchMedia().add('(prefers-reduced-motion: no-preference)', () => {
    const hero = document.querySelector('.hero');
    const q = (sel) => [...hero.querySelectorAll(sel)];
    const chars = q('.hero__title .char');
    const done = () => hero.classList.add('is-done'); // .is-done : plus aucun état masqué (CSS)
    const gold = getComputedStyle(document.documentElement).getPropertyValue('--c-accent').trim();

    // Vie du rayon après l'ouverture : une onde dorée part d'une alvéole au hasard, une alvéole s'emplit de miel puis se vide,
    // les alvéoles pleines respirent. Tout s'arrête quand le hero n'est pas à l'écran.
    const shapes = q('.hc--line .hc__shape');
    const pos = (el) => el.closest('.hc').getAttribute('transform').match(/[-\d.]+/g).map(Number);
    const html = document.documentElement;
    let seen = true, loop, breathe;
    const io = new IntersectionObserver(([e]) => { seen = e.isIntersecting; });
    io.observe(hero);
    const live = () => seen && !document.hidden && !html.classList.contains('is-free')
      && (!html.classList.contains('is-slider') || hero.classList.contains('is-current'));
    const pulse = () => {
      breathe.paused(!live());
      if (live()) {
        const [ox, oy] = pos(gsap.utils.random(shapes));
        gsap.to(shapes, { stroke: gold, strokeOpacity: 1, strokeWidth: 3, duration: 0.4, ease: 'sine.inOut', yoyo: true, repeat: 1, overwrite: 'auto',
          clearProps: 'stroke,strokeOpacity,strokeWidth', stagger: (i, el) => { const [x, y] = pos(el); return Math.hypot(x - ox, y - oy) / 450; } });
        gsap.to(gsap.utils.random(shapes), { fill: gold, duration: 1.2, ease: 'power2.inOut', yoyo: true, repeat: 1, repeatDelay: 1.5, overwrite: 'auto', clearProps: 'fill' });
      }
      loop = gsap.delayedCall(gsap.utils.random(3.5, 5), pulse);
    };
    const ambient = () => {
      breathe = gsap.to(q('.hc--fill .hc__in, .hc--tint .hc__in'), { scale: 0.88, duration: 2.4, ease: 'sine.inOut', yoyo: true, repeat: -1,
        stagger: { each: 0.7, from: 'random' } });
      pulse();
    };

    const tl = gsap.timeline({ defaults: { ease: 'expo.out' }, onComplete: () => { done(); ambient(); } })
      .fromTo('.logo, .nav__link', { opacity: 0, y: -12 }, { opacity: 1, y: 0, duration: 0.7, stagger: 0.05, ease: 'power3.out', clearProps: 'transform' }, 0)
      .set(q('.hc'), { opacity: 1 }, 0);
    if (draw) tl.fromTo(q('.hc--line .hc__shape, .hc--icon .hc__shape'), { drawSVG: '50% 50%' },
        { drawSVG: '0% 100%', duration: 1.1, ease: 'power2.inOut', stagger: fromCenter(0.16) }, 0.1);
    tl.fromTo(q('.hc--fill .hc__in, .hc--tint .hc__in, .hc--logo .hc__in'), { scale: 0, rotation: -60, transformOrigin: '50% 50%' },
        { scale: 1, rotation: 0, duration: 1.2, ease: 'back.out(1.6)', stagger: fromCenter(0.16) }, 0.3);
    if (draw) tl.fromTo(q('.hc__icon > *'), { drawSVG: 0 }, { drawSVG: '100%', duration: 0.8, ease: 'power2.inOut', stagger: 0.07 }, 1.1);
    tl // onde dorée qui traverse le rayon, du centre vers les bords
      .to(q('.hc--line .hc__shape'), { stroke: gold, strokeOpacity: 1, strokeWidth: 3, duration: 0.3, ease: 'sine.inOut', yoyo: true, repeat: 1,
        stagger: fromCenter(0.12), clearProps: 'stroke,strokeOpacity,strokeWidth' }, 2);

    if (chars.length) {
      tl.set('.hero .line', { opacity: 1 }, 0)
        .fromTo(chars, { yPercent: 115, rotation: 12 }, { yPercent: 0, rotation: 0, duration: 1.1, stagger: 0.022 }, 0.3);
    } else { // pas de slider (mobile) : masque de ligne simulé, translation et découpe sur la même courbe
      tl.fromTo('.hero .line', { opacity: 1, yPercent: 110, clipPath: 'inset(-20% -5% 110% -5%)' },
        { yPercent: 0, clipPath: 'inset(-20% -5% -40% -5%)', duration: 1.1, stagger: 0.12 }, 0.3);
    }
    tl.fromTo('.underline', { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: 0.9, ease: 'power2.inOut' }, 1.2)
      .fromTo('.hero__actions', { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', clearProps: 'transform' }, 1.2);

    return () => { // intro interrompue (rotation, changement de media query) : le hero ne doit pas rester masqué
      done(); io.disconnect(); loop?.kill(); breathe?.revert(); gsap.killTweensOf(shapes);
    };
  });

  /* ---------- Hero : le rayon suit le pointeur, en profondeur ---------- */
  // Profondeur d'une alvéole : multiplicateur de son déplacement (d = anneau depuis le centre, 0 à 3 ; kind = line | fill | tint | icon)
  const depth = (d, kind) => {
    // TODO(human)
    return 1;
  };

  gsap.matchMedia().add('(prefers-reduced-motion: no-preference) and (hover: hover) and (pointer: fine)', () => {
    const hero = document.querySelector('.hero');
    const cells = [...hero.querySelectorAll('.hc')].map((c) => ({
      k: depth(+c.dataset.d, c.classList[1].slice(4)), // hc--fill → fill
      x: gsap.quickTo(c.firstChild, 'x', { duration: 1.2, ease: 'power3' }),
      y: gsap.quickTo(c.firstChild, 'y', { duration: 1.2, ease: 'power3' }),
    }));
    const onMove = (e) => {
      const r = hero.getBoundingClientRect();
      const nx = (e.clientX - r.left) / r.width - 0.5, ny = (e.clientY - r.top) / r.height - 0.5; // -0,5 … 0,5
      cells.forEach((c) => { c.x(nx * 40 * c.k); c.y(ny * 40 * c.k); });
    };
    const onLeave = () => cells.forEach((c) => { c.x(0); c.y(0); });
    hero.addEventListener('pointermove', onMove, { passive: true });
    hero.addEventListener('pointerleave', onLeave);
    return () => { hero.removeEventListener('pointermove', onMove); hero.removeEventListener('pointerleave', onLeave); };
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

  /* ---------- Notre équipe : galerie horizontale ---------- */
  // Ordinateur et mobile : la section se fige et le défilement (molette ou doigt) fait glisser la rangée (scrub) ; chaque photo glisse un peu dans son cadre
  // (containerAnimation), la jauge suit. Mouvement réduit : rangée native au doigt (CSS).
  gsap.matchMedia().add('(prefers-reduced-motion: no-preference)', () => {
    if (!st) return;
    const team = document.querySelector('.team'), crew = team.querySelector('.crew'), track = crew.querySelector('.crew__track'), bar = team.querySelector('.team__bar');
    crew.classList.add('is-driven');
    const dist = () => track.scrollWidth - window.innerWidth;
    const slide = gsap.to(track, { x: () => -dist(), ease: 'none', scrollTrigger: { trigger: team, pin: true, scrub: true, end: () => '+=' + dist(), invalidateOnRefresh: true,
      onUpdate: (self) => bar.style.setProperty('--p', self.progress) } });
    // élan : pendant que la section monte, les portraits glissent déjà vers la gauche ; le virage vertical → horizontal se fait en douceur
    gsap.fromTo(track.querySelector('.crew__list'), { x: () => window.innerHeight * 0.85 }, { x: 0, ease: 'none',
      scrollTrigger: { trigger: team, start: 'top bottom', end: 'top top', scrub: true, invalidateOnRefresh: true } });
    track.querySelectorAll('.mate__photo img').forEach((img) => gsap.fromTo(img, { xPercent: -14 }, { xPercent: 0, ease: 'none',
      scrollTrigger: { trigger: img.parentNode, containerAnimation: slide, start: 'left right', end: 'right left', scrub: true } }));
    return () => crew.classList.remove('is-driven');
  });

  /* ---------- Notre histoire : une scène au trait raconte l'équipe qui grandit, au rythme des chapitres ----------
     2023 : huit personnes, chacune chez soi, reliées par des pointillés qui défilent → Depuis : les locaux se dessinent (îlots de bureaux,
     tableau, coin café), les huit (en jaune) s'y rejoignent, les autres arrivent et l'équipe se remplit jusqu'à une trentaine → Ensemble :
     certaines prennent des responsabilités → Aujourd'hui : l'alvéole du logo s'allume, puis les locaux vivent : les personnes
     interagissent entre elles (tope-là, café, réunion au tableau, dossier qui passe, entraide, discussion, ola). Sans JS : la scène est
     masquée, les photos restent. */
  {
    const story = document.querySelector('.story'), frame = story.querySelector('.story__frame');
    const homes = [90, 230, 370, 510].flatMap((x) => [{ x, y: 150 }, { x, y: 330 }]);
    // cinq îlots de six : trois en haut, deux en bas ; le coin tableau + café en bas à droite
    const pods = [[130, 195], [300, 195], [470, 195], [130, 335], [300, 335]].map(([x, y]) => ({ x, y }));
    const seats = pods.flatMap((p, pod) => [-40, 0, 40].flatMap((dx) => [{ x: p.x + dx, y: p.y - 8, side: 'top', pod }, { x: p.x + dx, y: p.y + 42, side: 'back', pod }]));
    const near = (s, x, y) => Math.hypot(s.x - x, s.y - y);
    const order = seats.map((s, k) => k).sort((a, b) => near(seats[a], 300, 230) - near(seats[b], 300, 230));
    const firstSeats = order.slice(0, 8), restSeats = order.slice(8); // les huit du début au centre, les autres autour, des plus proches aux plus loin
    const ups = order.filter((k) => seats[k].side === 'top').filter((k, m) => [4, 7, 10, 13].includes(m)); // responsabilités (badge qui suit la personne)
    const hair = ['', '<circle class="ink" cy="-37" r="3.6"/>', '<path d="M-8.5-27c-1 9-2 12-4 15M8.5-27c1 9 2 12 4 15"/>', '<path class="ink" d="M-8.5-27c2-9 15-9 17 0z"/>'];
    const person = (n, seat, cls) => `<g class="p ${cls} p--${seat.side}"><circle class="p__ping" cy="-20" r="20"/><g class="p__w"><g class="p__l"><g class="p__legs"><path d="M-5-2v10"/><path d="M5-2v10"/></g><g class="p__b" style="--d:-${(n * 0.29 % 1.6).toFixed(2)}s">
      <path class="p__shirt" d="M-13 0c0-13 6-17 13-17s13 4 13 17z"/><path class="p__arm p__arm--l" d="M-9-13l-6 10"/><path class="p__arm p__arm--r" d="M9-13l6 10"/><circle class="p__head" cy="-26" r="8.5"/>${seat.side === 'top' ? hair[n % 4] + '<g class="p__eyes"><circle class="ink" cx="-3" cy="-26.5" r="1.1"/><circle class="ink" cx="3" cy="-26.5" r="1.1"/></g><path d="M-2.6-22.6q2.6 2.2 5.2 0" stroke-width="1.4"/>' : ''}</g>${ups.includes(n) ? '<path class="badge" d="M0-50l7 8h-14z"/>' : ''}</g></g></g>`;
    const house = ({ x, y }) => `<g class="house"><path d="M${x - 62} ${y - 30}L${x} ${y - 78}L${x + 62} ${y - 30}"/><rect x="${x - 52}" y="${y - 30}" width="104" height="92" rx="4"/></g>`;
    const ring = [0, 2, 4, 6, 7, 5, 3, 1, 0].map((k) => `${homes[k].x},${homes[k].y + 20}`).join(' ');
    const table = (p) => `<rect class="table" x="${p.x - 64}" y="${p.y - 14}" width="128" height="28" rx="10"/>`
      + [-40, 0, 40].map((dx) => `<rect class="lap" x="${p.x + dx - 10}" y="${p.y - 13}" width="20" height="11" rx="2"/><circle class="lap__dot" cx="${p.x + dx}" cy="${p.y - 7.5}" r="1.6"/><rect class="lap" x="${p.x + dx - 10}" y="${p.y + 2}" width="20" height="11" rx="2"/>`).join('');
    const hexPts = '0,-6 5.2,-3 5.2,3 0,6 -5.2,3 -5.2,-3';
    frame.outerHTML = `<svg class="scene" viewBox="0 0 600 450" role="img" aria-label="L’équipe grandit : huit personnes chez elles en 2023, une trentaine aujourd’hui dans nos locaux, qui travaillent et s’entraident">
      <g class="office">
        <polygon class="office__hex" points="226,82 233,86 233,94 226,98 219,94 219,86"/><text x="243" y="98">happy culteur</text></g>
      <g class="lounge"><g class="board"><rect x="432" y="262" width="112" height="66" rx="4"/><path d="M452 328l-6 34M524 328l6 34"/><path class="board__notes" d="M446 276h38M446 285h24M500 276h30"/>
        <path class="board__chart" pathLength="1" d="M446 316l20-14 18 6 22-22 24-12"/></g>
        <g class="coffee"><path d="M470 409h95"/><rect x="520" y="370" width="32" height="39" rx="4"/><rect class="coffee__cup" x="530" y="394" width="11" height="10" rx="2"/>
        <path class="steam" d="M535 388c-4-5 4-8 0-13"/></g></g>
      <g class="homes">${homes.map(house).join('')}<polyline class="link" points="${ring}"/></g>
      <g class="row-top">${seats.map((s, k) => (s.side === 'top' ? person(k, s, firstSeats.includes(k) ? 'p--first' : `p--s${k % 3}`) : '')).join('')}</g>
      <g class="tables">${pods.map(table).join('')}</g>
      <g class="row-back">${seats.map((s, k) => (s.side === 'back' ? person(k, s, firstSeats.includes(k) ? 'p--first' : `p--s${k % 3}`) : '')).join('')}</g>
      <g class="walkers"></g>
      <g class="fx">${'<g class="chat"><rect x="0" y="-18" width="30" height="18" rx="6"/><circle class="ink" cx="8" cy="-9" r="1.8"/><circle class="ink" cx="15" cy="-9" r="1.8"/><circle class="ink" cx="22" cy="-9" r="1.8"/></g>'.repeat(5)}
        ${`<polygon class="spark" points="${hexPts}"/>`.repeat(12)}${'<g class="paper"><rect x="-7" y="-9" width="14" height="18" rx="1.5"/><path d="M-4-4h8M-4 0h8M-4 4h5" stroke-width="1.2"/></g>'.repeat(2)}</g></svg>`;
    const scene = story.querySelector('.scene');
    // people[k] est assise sur seats[k] (l'ordre du DOM sépare la rangée de face et celle de dos, d'où cette correspondance)
    const people = seats.map((s, k) => scene.querySelectorAll(`.row-${s.side} .p`)[seats.slice(0, k).filter((t) => t.side === s.side).length]);
    const found = firstSeats.map((k) => people[k]), seq = restSeats.map((k) => people[k]);
    const W = (k) => people[k].querySelector('.p__w'), Lf = (k) => people[k].querySelector('.p__l'), P = (k) => people[k].querySelector('.p__ping');
    const door = { x: 405, y: 455 };
    // État final (mouvement réduit) : tout le monde à sa place, badges visibles
    gsap.set(people, { x: (k) => seats[k].x, y: (k) => seats[k].y });
    gsap.set(scene.querySelector('.homes'), { opacity: 0 });
    gsap.set(scene.querySelectorAll('.p__ping, .spark, .paper'), { transformOrigin: '50% 50%' });
    gsap.set(scene.querySelectorAll('.p__l'), { transformOrigin: '50% 100%' });
    gsap.set(scene.querySelectorAll('.p__arm--r'), { transformOrigin: '0% 0%' }); // bras et jambes pivotent à l'épaule / à la hanche
    gsap.set(scene.querySelectorAll('.p__arm--l'), { transformOrigin: '100% 0%' });
    gsap.set(scene.querySelectorAll('.p__legs path'), { transformOrigin: '50% 0%' });
    gsap.set(scene.querySelectorAll('.p__eyes'), { transformOrigin: '50% 50%' });

    gsap.matchMedia().add('(prefers-reduced-motion: no-preference)', () => {
      scene.classList.add('is-alive'); // les personnes « tapent » doucement sur leur ordinateur (CSS)
      const tl = gsap.timeline({ defaults: { ease: 'power2.inOut' }, scrollTrigger: { trigger: '.story__chapters', start: 'top 55%', end: 'bottom 55%', scrub: 0.6 } });
      // 2023 : chacun chez soi, reliés par le travail en commun
      tl.fromTo(scene.querySelector('.homes'), { opacity: 1 }, { opacity: 1, duration: 0.01 }, 0) // pas tl.set : à 0 il ne serait jamais rendu
        .fromTo(found, { x: (i) => homes[i].x, y: (i) => homes[i].y + 40 }, { x: (i) => homes[i].x, y: (i) => homes[i].y + 40, duration: 0.01 }, 0)
        .fromTo(['.scene .office', '.scene .lounge', '.scene .tables'], { opacity: 0 }, { opacity: 0, duration: 0.01 }, 0)
        .fromTo('.scene .link', { opacity: 0 }, { opacity: 1, duration: 0.5 }, 0)
      // Depuis : les maisons s'effacent, les locaux se dessinent, les huit y marchent, les autres arrivent et l'équipe se remplit
        .to('.scene .homes', { opacity: 0, scale: 0.92, transformOrigin: '50% 50%', duration: 0.4 }, 0.9)
        // caméra : on s'approche de l'îlot central où arrivent les huit, puis on recule quand les autres arrivent
        .fromTo(scene, { attr: { viewBox: '0 0 600 450' } }, { attr: { viewBox: innerWidth < 992 ? '0 0 600 450' : '140 95 320 240' }, duration: 0.5, ease: 'power2.inOut' }, 0.95)
        .to(scene, { attr: { viewBox: '0 0 600 450' }, duration: 0.8, ease: 'power2.inOut' }, 1.75)
        .to(['.scene .office', '.scene .lounge'], { opacity: 1, duration: 0.2 }, 1)
        .fromTo('.scene .table, .scene .lap, .scene .lap__dot', { scale: 0, transformOrigin: '50% 50%' }, { scale: 1, duration: 0.3, stagger: 0.01, ease: 'back.out(2)' }, 1.05)
        .to('.scene .tables', { opacity: 1, duration: 0.1 }, 1.05)
        .to(found, { x: (i) => seats[firstSeats[i]].x, y: (i) => seats[firstSeats[i]].y, duration: 0.6, stagger: 0.04, ease: 'power1.inOut' }, 1.1)
        .to(found.map((p) => p.querySelector('.p__w')), { y: -5, duration: 0.06, repeat: 9, yoyo: true, ease: 'sine.inOut', stagger: 0.04 }, 1.1) // repeat impair : finit au sol
        .to(found.map((p) => p.querySelector('.p__ping')), { keyframes: { scale: [0.3, 1.7], opacity: [0, 1, 0] }, duration: 0.25, stagger: 0.04, ease: 'power1.out' }, 1.65)
        .fromTo(seq, { x: door.x, y: door.y, opacity: 0 }, { x: (i) => seats[restSeats[i]].x, y: (i) => seats[restSeats[i]].y, opacity: 1, duration: 0.35, stagger: 0.035, ease: 'power1.inOut' }, 1.7)
        .to(seq.map((p) => p.querySelector('.p__w')), { y: -4, duration: 0.058, repeat: 5, yoyo: true, ease: 'sine.inOut', stagger: 0.035 }, 1.7)
        .to(seq.map((p) => p.querySelector('.p__ping')), { keyframes: { scale: [0.3, 1.7], opacity: [0, 1, 0] }, duration: 0.22, stagger: 0.035, ease: 'power1.out' }, 2.03)
      // Ensemble : certains prennent des responsabilités
        .fromTo('.scene .badge', { scale: 0, opacity: 0, transformOrigin: '50% 100%' }, { scale: 1, opacity: 1, duration: 0.25, stagger: 0.08, ease: 'back.out(2.5)' }, 2.75)
      // Aujourd'hui : l'alvéole du logo s'allume
        .fromTo('.scene .office__hex', { opacity: 0 }, { opacity: 1, duration: 0.3 }, 3.2);

      /* Une fois l'équipe au complet, les personnes interagissent entre elles, plusieurs scènes à la fois. Chaque personne occupée est
         réservée (busy) ; quand elle marche (jambes qui alternent), elle passe au premier plan (.walkers) puis retourne dans sa rangée.
         Les bras n'apparaissent que pour un geste (tope, applaudir, montrer, saluer) ; les autres clignent des yeux et regardent ce qui se passe. */
      const chats = [...scene.querySelectorAll('.chat')], sparks = [...scene.querySelectorAll('.spark')], papers = [...scene.querySelectorAll('.paper')];
      const walkers = scene.querySelector('.walkers'), rows = { top: scene.querySelector('.row-top'), back: scene.querySelector('.row-back') };
      gsap.set(chats, { opacity: 0, scale: 0, transformOrigin: '0% 100%' });
      gsap.set([...sparks, ...papers, '.scene .steam'], { opacity: 0 });
      gsap.set('.scene .board__chart', { strokeDashoffset: 1 });
      const busy = new Set(), zones = new Set();
      let nc = 0, ns = 0, np = 0, active = 0, inView = false, timer, blinker;
      const rnd = gsap.utils.random, clamp = gsap.utils.clamp, freeOnes = () => seats.map((s, k) => k).filter((k) => !busy.has(k));
      const part = (k, sel) => people[k].querySelector(sel), arm = (k, side) => part(k, `.p__arm--${side}`);
      const lift = (k) => walkers.appendChild(people[k]), drop = (k) => rows[seats[k].side].appendChild(people[k]);
      // gestes : rotation du bras autour de l'épaule (0 = bras le long du corps)
      const pose = (k, l, r, d = 0.25) => gsap.timeline().set([arm(k, 'l'), arm(k, 'r')], { opacity: 1 })
        .to(arm(k, 'l'), { rotation: l, duration: d, ease: 'back.out(2)' }, 0).to(arm(k, 'r'), { rotation: r, duration: d, ease: 'back.out(2)' }, 0);
      const rest = (k) => gsap.timeline().to([arm(k, 'l'), arm(k, 'r')], { rotation: 0, duration: 0.2 }).set([arm(k, 'l'), arm(k, 'r')], { opacity: 0 });
      const clap = (k, n = 4) => gsap.timeline().add(pose(k, -55, 55, 0.12))
        .to(arm(k, 'l'), { rotation: -25, duration: 0.1, repeat: n * 2 - 1, yoyo: true }, '>').to(arm(k, 'r'), { rotation: 25, duration: 0.1, repeat: n * 2 - 1, yoyo: true }, '<').add(rest(k));
      // marche (aller ou retour) jusqu'à un point de la scène : petits sauts + jambes qui alternent
      const walk = (k, x, y, back) => { const s = seats[k], d = clamp(0.5, 1.1, near(s, x, y) / 200), legs = part(k, '.p__legs');
        return gsap.timeline().set(legs, { opacity: 1 }).to(Lf(k), { x: back ? 0 : x - s.x, y: back ? 0 : y - s.y, duration: d, ease: 'power1.inOut' }, 0)
          .to(W(k), { y: -4, duration: d / 8, repeat: 7, yoyo: true, ease: 'sine.inOut' }, 0)
          .fromTo(legs.children, { rotation: (m) => (m ? -24 : 24) }, { rotation: (m) => (m ? 24 : -24), duration: d / 4, repeat: 3, yoyo: true, ease: 'sine.inOut' }, 0)
          .set(legs.children, { rotation: 0 }).set(legs, { opacity: back ? 0 : 1 }); };
      const say = (x, y) => { const c = chats[nc++ % chats.length];
        return gsap.timeline().set(c, { x: x + 4, y: y - 42 }).to(c, { opacity: 1, scale: 1, duration: 0.22, ease: 'back.out(2.5)' })
          .to(c.querySelectorAll('circle'), { y: -2.5, duration: 0.15, repeat: 5, yoyo: true, stagger: 0.07, ease: 'sine.inOut' }, '<')
          .to(c, { opacity: 0, scale: 0, duration: 0.16 }); };
      const burst = (x, y, n = 5, r = 28) => { const t = gsap.timeline();
        for (let m = 0; m < n; m++) { const s = sparks[ns++ % sparks.length], a = n > 6 ? (m / n) * Math.PI * 2 : -Math.PI / 2 + (m - (n - 1) / 2) * 0.6;
          t.fromTo(s, { x, y, scale: 0, opacity: 1, rotation: 0 }, { x: x + Math.cos(a) * r, y: y + Math.sin(a) * r, scale: 1.1, rotation: 90, opacity: 0, duration: 0.75, ease: 'power2.out' }, 0); }
        return t; };
      const ping = (k) => gsap.to(P(k), { keyframes: { scale: [0.3, 1.8], opacity: [0, 1, 0] }, duration: 0.55, ease: 'power1.out' });
      const jump = (ks, h = 10, n = 1) => gsap.to(ks.map(W), { y: -h, duration: 0.15, repeat: n * 2 - 1, yoyo: true, ease: 'power2.out' });
      const nod = (k, n = 2) => gsap.to(Lf(k), { rotation: 6, duration: 0.12, repeat: n * 2 - 1, yoyo: true });
      const pickPair = (ok) => { const f = freeOnes(); for (let t = 0; t < 25; t++) { const i = rnd(f), j = rnd(f); if (i !== j && ok(seats[i], seats[j])) return [i, j]; } return []; };
      const mate = (k) => seats.map((s, m) => m).filter((m) => !busy.has(m) && seats[m].pod === seats[k].pod && seats[m].side === seats[k].side && Math.abs(seats[m].x - seats[k].x) === 40); // voisins de rangée libres
      // les curieux : les personnes de face non occupées tournent les yeux vers ce qui se passe, puis reviennent à leur écran
      const look = (x, y, hold) => seats.forEach((s, k) => { if (s.side !== 'top' || busy.has(k) || near(s, x, y) > 190) return;
        gsap.timeline().to(part(k, '.p__eyes'), { x: clamp(-1.8, 1.8, (x - s.x) / 50), y: clamp(-1, 1, (y - s.y + 26) / 60), duration: 0.25, delay: rnd(0, 0.3) })
          .to(part(k, '.p__eyes'), { x: 0, y: 0, duration: 0.3 }, `+=${hold}`); });

      const acts = {
        // tope-là : deux personnes de deux îlots différents se rejoignent, lèvent la main, la tape, étincelles en cercle
        highFive() { const [i, j] = pickPair((a, b) => a.pod !== b.pod && near(a, b.x, b.y) < 260 && !((a.x + b.x) / 2 > 400 && (a.y + b.y) / 2 > 240)); if (i == null) return;
          const a = seats[i], b = seats[j], mx = (a.x + b.x) / 2, my = Math.max(a.y, b.y, 150);
          return [[i, j], gsap.timeline().call(lift, [i]).call(lift, [j]).add(walk(i, mx - 12, my), 0).add(walk(j, mx + 12, my), 0)
            .add(pose(i, 0, -125)).add(pose(j, 125, 0), '<').add(jump([i, j], 9), '+=0.1').add(burst(mx, my - 42, 8, 22), '<0.1')
            .add(rest(i), '+=0.2').add(rest(j), '<').add(walk(i, mx - 12, my, true), '+=0.15').add(walk(j, mx + 12, my, true), '<')
            .call(drop, [i]).call(drop, [j]), [mx, my - 30]]; },
        // pause café : deux collègues vont à la machine, la vapeur monte, elles trinquent et discutent
        coffee() { if (zones.has('coffee')) return; const [i, j] = pickPair(() => true); if (i == null) return; zones.add('coffee');
          return [[i, j], gsap.timeline({ onComplete: () => zones.delete('coffee') }).call(lift, [i]).call(lift, [j])
            .add(walk(i, 516, 402), 0).add(walk(j, 548, 402), 0.15)
            .fromTo('.scene .steam', { opacity: 0, y: 0 }, { opacity: 1, y: -6, duration: 0.5, repeat: 3, yoyo: true, ease: 'sine.inOut' })
            .add(pose(i, 0, -70), '<').add(pose(j, 70, 0), '<0.1').add(say(516, 402), '<').add(say(548, 402), '>-0.1').add(nod(i), '<').add(say(516, 402), '>-0.1').add(nod(j), '<')
            .add(rest(i)).add(rest(j), '<').add(walk(i, 516, 402, true), '+=0.1').add(walk(j, 548, 402, true), '<0.1').call(drop, [i]).call(drop, [j]), [530, 380]]; },
        // réunion au tableau : une personne montre la courbe qui monte, deux autres hochent la tête puis applaudissent
        board() { if (zones.has('board')) return; const f = freeOnes(); if (f.length < 3) return; const [i, j, k] = gsap.utils.shuffle(f).slice(0, 3); zones.add('board');
          return [[i, j, k], gsap.timeline({ onComplete: () => zones.delete('board') }).call(lift, [i]).call(lift, [j]).call(lift, [k])
            .add(walk(i, 420, 368), 0).add(walk(j, 458, 394), 0.1).add(walk(k, 488, 394), 0.2)
            .add(pose(i, 0, -95)).fromTo('.scene .board__chart', { strokeDashoffset: 1, opacity: 1 }, { strokeDashoffset: 0, duration: 1, ease: 'power2.inOut' }, '<')
            .to(arm(i, 'r'), { rotation: -130, duration: 1, ease: 'power2.inOut' }, '<').add(nod(j, 3), '<0.2').add(nod(k, 3), '<0.15')
            .add(clap(j)).add(clap(k), '<0.05').add(burst(520, 282, 8, 26), '<').add(() => ping(i), '<').add(jump([i], 8), '<')
            .add(rest(i), '<').add(walk(i, 420, 368, true), '+=0.3').add(walk(j, 458, 394, true), '<0.1').add(walk(k, 488, 394, true), '<0.1')
            .to('.scene .board__chart', { opacity: 0, duration: 0.3 }, '<').call(drop, [i]).call(drop, [j]).call(drop, [k]), [480, 300]]; },
        // un dossier passe d'un bureau à l'autre en arc ; on le reçoit, on remercie d'un signe de la main
        toss() { const [i, j] = pickPair((a, b) => a.pod !== b.pod); if (i == null) return; const a = seats[i], b = seats[j], p = papers[np++ % papers.length], dir = b.x > a.x ? 1 : -1;
          return [[i, j], gsap.timeline().add(pose(i, dir < 0 ? 120 : 0, dir > 0 ? -120 : 0)).add(jump([i], 6), '<')
            .set(p, { x: a.x, y: a.y - 32, opacity: 1, rotation: 0, scale: 1 }).add(rest(i))
            .to(p, { x: b.x, rotation: 360 * dir, duration: 0.8, ease: 'none' }, '<').to(p, { y: Math.min(a.y, b.y) - 100, duration: 0.4, ease: 'power1.out' }, '<')
            .to(p, { y: b.y - 32, duration: 0.4, ease: 'power1.in' }, '>').to(p, { opacity: 0, scale: 0.5, duration: 0.15 })
            .add(() => ping(j), '<').add(jump([j], 8)).add(say(b.x, b.y), '<')
            .add(pose(j, 0, -125)).to(arm(j, 'r'), { rotation: -95, duration: 0.15, repeat: 3, yoyo: true }).add(rest(j)), [a.x, a.y - 60]]; },
        // discussion entre voisins de face : on se tourne l'un vers l'autre, les bulles se répondent, on rit
        chat() { const f = freeOnes().filter((k) => mate(k).length); if (!f.length) return; const i = rnd(f), j = rnd(mate(i)), dir = seats[j].x > seats[i].x ? 1 : -1;
          return [[i, j], gsap.timeline().to(Lf(i), { rotation: 9 * dir, duration: 0.3 }).to(Lf(j), { rotation: -9 * dir, duration: 0.3 }, '<')
            .to([part(i, '.p__eyes'), part(j, '.p__eyes')], { x: (m) => (m ? -dir : dir) * 1.6, duration: 0.2 }, '<')
            .add(say(seats[i].x, seats[i].y)).add(say(seats[j].x, seats[j].y), '>-0.1').add(say(seats[i].x, seats[i].y), '>-0.1')
            .add(jump([i, j], 5, 2)).to([Lf(i), Lf(j)], { rotation: 0, duration: 0.3 }).to([part(i, '.p__eyes'), part(j, '.p__eyes')], { x: 0, duration: 0.2 }, '<')]; },
        // entraide : on se lève pour aider son voisin, on montre son écran, une idée éclot
        help() { const f = freeOnes().filter((k) => mate(k).length); if (!f.length) return; const i = rnd(f), j = rnd(mate(i)), b = seats[j], x = b.x + (b.x > seats[i].x ? -16 : 16), dir = x < b.x ? 1 : -1;
          return [[i, j], gsap.timeline().call(lift, [i]).add(walk(i, x, b.y - 6)).to(Lf(i), { rotation: 12 * dir, duration: 0.25 })
            .add(pose(i, dir < 0 ? 60 : 0, dir > 0 ? -60 : 0), '<').add(say(x, b.y - 6), '<').add(nod(j), '<0.3')
            .add(burst(b.x, b.y - 44, 3), '+=0.1').add(jump([j], 6), '<').add(rest(i), '+=0.2')
            .to(Lf(i), { rotation: 0, duration: 0.2 }, '<').add(walk(i, x, b.y - 6, true)).call(drop, [i]), [b.x, b.y - 30]]; },
        // mentorat : une des huit du début va voir une nouvelle recrue, lui montre, la recrue progresse (triangle qui monte)
        mentor() { const f = freeOnes(), m = f.filter((k) => firstSeats.includes(k)), r = f.filter((k) => !firstSeats.includes(k)); if (!m.length || !r.length) return;
          const i = rnd(m), j = rnd(r), b = seats[j], x = b.x + (b.x > 300 ? -18 : 18), dir = x < b.x ? 1 : -1, up = sparks[ns++ % sparks.length];
          return [[i, j], gsap.timeline().call(lift, [i]).add(walk(i, x, b.y - 4)).add(pose(i, dir < 0 ? 70 : 0, dir > 0 ? -70 : 0))
            .to(arm(i, 'r'), { rotation: dir > 0 ? -45 : 0, duration: 0.2, repeat: 3, yoyo: true }).to(arm(i, 'l'), { rotation: dir < 0 ? 45 : 0, duration: 0.2, repeat: 3, yoyo: true }, '<')
            .add(nod(j, 3), '<').add(say(x, b.y - 4), '<').add(() => ping(j)).add(jump([j], 9))
            .fromTo(up, { x: b.x, y: b.y - 40, scale: 0.4, opacity: 1, rotation: 0 }, { y: b.y - 80, scale: 1.4, rotation: 180, opacity: 0, duration: 1, ease: 'power1.out' }, '<')
            .add(rest(i), '<').add(walk(i, x, b.y - 4, true), '+=0.2').call(drop, [i]), [b.x, b.y - 30]]; },
        // cercle d'équipe : quatre personnes de quatre îlots se retrouvent dans l'allée, mains au centre, puis se séparent en fête
        huddle() { if (zones.has('huddle')) return; const f = gsap.utils.shuffle(freeOnes()), ks = [];
          for (const k of f) if (ks.length < 4 && !ks.some((m) => seats[m].pod === seats[k].pod)) ks.push(k);
          if (ks.length < 4) return; zones.add('huddle'); const [cx, cy] = rnd([[215, 268], [385, 268]]), spot = (n) => [cx + [-22, 22, -9, 9][n], cy + [0, 0, -10, -10][n]];
          const t = gsap.timeline({ onComplete: () => zones.delete('huddle') }); ks.forEach((k, n) => t.call(lift, [k], 0).add(walk(k, ...spot(n)), n * 0.12));
          ks.forEach((k, n) => t.add(pose(k, spot(n)[0] < cx ? 0 : 100, spot(n)[0] < cx ? -100 : 0), n ? '<' : '>'));
          t.add(jump(ks, 6, 2), '+=0.15').add(pose(ks[0], 0, -150), '<0.3');
          ks.forEach((k, n) => t.add(pose(k, 150, -150, 0.2), n ? '<' : '>'));
          t.add(burst(cx, cy - 46, 10, 30), '<').add(jump(ks, 12), '<');
          ks.forEach((k) => t.add(rest(k), '<'));
          t.addLabel('out', '+=0.25'); ks.forEach((k, n) => t.add(walk(k, ...spot(n), true), `out+=${n * 0.08}`));
          return [ks, t.call(() => ks.forEach(drop)), [cx, cy - 20]]; },
        // ola : tout un îlot se lève à tour de rôle, bras en l'air
        ola() { const pod = rnd(pods.map((p, n) => n)), ks = seats.map((s, m) => m).filter((m) => seats[m].pod === pod);
          if (ks.some((k) => busy.has(k))) return; ks.sort((a, b) => (seats[a].side === seats[b].side ? (seats[a].side === 'top' ? 1 : -1) * (seats[a].x - seats[b].x) : seats[a].side === 'top' ? -1 : 1));
          const t = gsap.timeline(); ks.forEach((k, n) => t.add(pose(k, 140, -140, 0.15), n * 0.09).to(W(k), { y: -12, duration: 0.16, repeat: 1, yoyo: true, ease: 'power2.out' }, n * 0.09).add(rest(k), n * 0.09 + 0.35));
          return [ks, t.add(burst(pods[pod].x, pods[pod].y - 60, 8, 34), 0.3), [pods[pod].x, pods[pod].y]]; },
      };
      const names = ['highFive', 'highFive', 'coffee', 'board', 'toss', 'toss', 'chat', 'chat', 'help', 'mentor', 'mentor', 'huddle', 'ola'];
      const ready = () => inView && tl.progress() > 0.75; // une fois tout le monde arrivé
      const start = (max) => { if (!ready() || active >= max) return;
        const got = acts[rnd(names)]();
        if (got) { const [ks, t, at] = got; ks.forEach((k) => busy.add(k)); active++; if (at) look(...at, t.duration() * 0.6);
          t.eventCallback('onComplete', ((done) => () => { if (done) done(); ks.forEach((k) => busy.delete(k)); active--; })(t.eventCallback('onComplete'))); } };
      const loop = () => { start(2); timer = gsap.delayedCall(rnd(1.2, 2.6), loop); }; // au repos : calme
      // En défilant : une vague de petits sauts traverse la salle dans le sens du défilement, on se penche, on lève ou baisse les yeux,
      // et chaque bout de défilement lance une interaction de plus (fromTo : chaque vague repart du sol, sinon une vague coupée en plein saut décale tout le monde)
      let lastY = window.scrollY, moved = 0, lastWave = 0;
      const onScroll = () => {
        const dy = window.scrollY - lastY; lastY = window.scrollY;
        if (!ready() || !dy) return;
        if ((moved += Math.abs(dy)) > 260) { moved = 0; start(4); }
        const now = performance.now(); if (now - lastWave < 420) return; lastWave = now;
        const free = freeOnes().sort((a, b) => seats[a].y - seats[b].y || seats[a].x - seats[b].x), down = dy > 0;
        gsap.fromTo(free.map(W), { y: 0 }, { y: -clamp(4, 10, Math.abs(dy) / 3), duration: 0.16, repeat: 1, yoyo: true, ease: 'power2.out', overwrite: true, stagger: { each: 0.018, from: down ? 'start' : 'end' } });
        gsap.fromTo(free.map(Lf), { rotation: 0 }, { rotation: rnd([-1, 1]) * 5, duration: 0.2, repeat: 1, yoyo: true, ease: 'sine.inOut', overwrite: true, stagger: { each: 0.018, from: down ? 'start' : 'end' } });
        gsap.to(free.filter((k) => seats[k].side === 'top').map((k) => part(k, '.p__eyes')), { y: down ? 1 : -1, duration: 0.2, overwrite: 'auto' });
        gsap.delayedCall(0.6, () => gsap.to(scene.querySelectorAll('.p__eyes'), { y: 0, duration: 0.3, overwrite: 'auto' }));
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      // clignements d'yeux, au hasard
      const blink = () => { if (inView) gsap.to(part(rnd(seats.map((s, k) => k).filter((k) => seats[k].side === 'top')), '.p__eyes'), { scaleY: 0.1, duration: 0.07, repeat: 1, yoyo: true });
        blinker = gsap.delayedCall(rnd(0.5, 1.2), blink); };
      const io = new IntersectionObserver(([e]) => { inView = e.isIntersecting; }); // la vie s'arrête hors de l'écran
      io.observe(scene);
      loop(); blink();
      // Photos de groupe des chapitres : montent par le bas en se posant, puis glissent doucement dans leur cadre
      story.querySelectorAll('.chap__pic').forEach((pic) => {
        const img = pic.querySelector('img'), trigger = { trigger: pic, start: 'top 85%' };
        gsap.fromTo(pic, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.1, ease: 'power3.inOut', clearProps: 'clipPath', onStart: () => pic.classList.add('is-shown'), scrollTrigger: trigger }); // clearProps : l'ombre jaune réapparaît
        gsap.fromTo(img, { scale: 1.25 }, { scale: 1.08, duration: 1.6, ease: 'power3.out', scrollTrigger: trigger });
        gsap.fromTo(img, { yPercent: -4 }, { yPercent: 4, ease: 'none', scrollTrigger: { trigger: pic, start: 'top bottom', end: 'bottom top', scrub: true } });
      });
      return () => { scene.classList.remove('is-alive'); timer.kill(); blinker.kill(); io.disconnect(); window.removeEventListener('scroll', onScroll); };
    });
  }

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
