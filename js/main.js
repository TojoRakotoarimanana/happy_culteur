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
  // toutes les sections hors slider : celles de <main> et le pied de page « Nous contacter » (deux .free-zone, vues comme une seule)
  const freeZones = [...document.querySelectorAll('.free-zone')];
  const freeZone = {
    contains: (el) => freeZones.some((z) => z.contains(el)),
    querySelectorAll: (sel) => freeZones.flatMap((z) => [...z.querySelectorAll(sel)]),
  };

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

  /* ---------- Nous contacter : validation et envoi du formulaire (indépendant de GSAP) ---------- */
  // action = mailto (par défaut) : la messagerie s'ouvre avec la demande pré-remplie ; action = URL d'un service (Formspree…) : envoi en arrière-plan
  const form = document.querySelector('.form');
  if (form) {
    const status = form.querySelector('.form__status');
    const group = form.querySelector('.choices');
    const boxes = [...group.querySelectorAll('input')];
    const fields = [...form.querySelectorAll('[required]'), group];
    let tried = false; // les erreurs ne s'affichent qu'après une première tentative d'envoi, puis se corrigent en direct
    const say = (msg, kind = '') => { status.textContent = msg; status.className = `form__status ${kind}`; };
    const check = (el) => {
      let msg = '';
      if (el === group) msg = boxes.some((b) => b.checked) ? '' : 'Choisissez au moins une prestation.';
      else if (el.validity.valueMissing) msg = 'Ce champ est obligatoire.';
      else if (el.validity.typeMismatch) msg = 'Adresse e-mail invalide (ex. : nom@entreprise.com).';
      if (el === group) group.classList.toggle('is-invalid', !!msg);
      else el.setAttribute('aria-invalid', String(!!msg));
      document.getElementById(el.getAttribute('aria-describedby')).textContent = msg;
      return !msg;
    };
    const recheck = (e) => {
      if (!tried) return;
      const el = group.contains(e.target) ? group : e.target;
      if (fields.includes(el)) check(el);
    };
    form.addEventListener('input', recheck);
    form.addEventListener('change', recheck);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      tried = true;
      const bad = fields.filter((el) => !check(el));
      if (bad.length) {
        say('Merci de compléter les champs indiqués.', 'is-error');
        (bad[0] === group ? boxes[0] : bad[0]).focus();
        return;
      }
      const data = new FormData(form);
      const action = form.getAttribute('action');
      if (action.startsWith('mailto:')) {
        const line = (k) => `${k} : ${data.getAll(k).join(', ') || '—'}`;
        const body = ['Nom', 'Prénom', 'Entreprise', 'E-mail', 'Téléphone', 'Prestations'].map(line).join('\n') + `\n\n${data.get('Message')}`;
        location.href = `${action}?subject=${encodeURIComponent(`Demande de contact – ${data.get('Entreprise')}`)}&body=${encodeURIComponent(body)}`;
        say('Votre messagerie s’ouvre avec votre demande pré-remplie : il ne reste plus qu’à l’envoyer.', 'is-ok');
        return;
      }
      form.classList.add('is-sending');
      say('Envoi en cours…');
      try {
        const res = await fetch(action, { method: 'POST', body: data, headers: { Accept: 'application/json' } });
        if (!res.ok) throw new Error(res.status);
        form.reset();
        tried = false;
        say('Merci ! Votre demande est bien partie, nous revenons vers vous très vite.', 'is-ok');
      } catch {
        say('L’envoi n’a pas abouti. Réessayez dans un instant ou écrivez-nous à contact@happyculteur.com.', 'is-error');
      } finally {
        form.classList.remove('is-sending');
      }
    });
  }

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
    lenis?.resize(); // Lenis garde la hauteur de page qu'il a mesurée en dernier (avant les sections épinglées) et bloquerait le trajet en deçà
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

    gsap.timeline({ scrollTrigger: { trigger: free, start: 'top bottom', once: true }, defaults: { ease: 'power3.out' } })
      // titre + accroche, puis surlignage peint
      .fromTo('.collab__body > div[data-reveal]', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.9 }, 0.2)
      .fromTo('.collab mark', { backgroundSize: '0% 100%' }, { backgroundSize: '100% 100%', duration: 0.9, ease: 'power2.inOut' }, 0.9);

    // la trajectoire de vol se trace avec le scroll (l'abeille suit --stem en CSS) ; chaque alvéole éclot puis son texte apparaît quand l'abeille l'atteint
    gsap.to('.collab__list', { '--stem': 1, ease: 'none', scrollTrigger: { trigger: '.collab__list', start: 'top bottom', end: 'bottom 60%', scrub: true } });
    gsap.utils.toArray('.reason').forEach((row) => {
      gsap.timeline({ scrollTrigger: { trigger: row, start: 'top bottom', once: true }, defaults: { ease: 'power3.out' } })
        .fromTo(row.querySelector('.reason__ill'), { opacity: 0, scale: 0.85 }, { opacity: 1, scale: 1, duration: 0.7, ease: 'back.out(2)' }, 0)
        .add(draw ? gsap.fromTo(row.querySelectorAll('.reason__ill .d:not(.piece)'), { drawSVG: 0 }, { drawSVG: '100%', duration: 0.8, ease: 'power2.inOut', stagger: 0.06 }) : gsap.timeline(), 0.1)
        // chaque illustration a son geste : la pièce s'emboîte, la batterie se charge et le wifi s'allume, les 14 jours se colorient
        .fromTo(row.querySelectorAll('.piece'), { x: 26, rotation: 18, transformOrigin: '50% 50%' }, { x: 0, rotation: 0, duration: 0.9, ease: 'back.out(1.8)' }, 0.6)
        .fromTo(row.querySelectorAll('.level'), { scaleY: 0, transformOrigin: '50% 100%' }, { scaleY: 1, duration: 1, ease: 'power2.out' }, 0.6)
        .fromTo(row.querySelectorAll('.lang:not(.pop .lang)'), { opacity: 0 }, { opacity: 1, duration: 0.3, stagger: 0.2 }, 0.9)
        .fromTo(row.querySelectorAll('.wifi'), { opacity: 0 }, { opacity: 1, duration: 0.3, stagger: 0.15 }, 1.1)
        .fromTo(row.querySelectorAll('.day'), { scale: 0, transformOrigin: '50% 50%' }, { scale: 1, duration: 0.35, ease: 'back.out(3)', stagger: 0.06 }, 0.6)
        .fromTo(row.querySelectorAll('.reason__ill .pop'), { scale: 0, transformOrigin: '50% 50%' }, { scale: 1, duration: 0.5, ease: 'back.out(3)' }, 1.2)
        .fromTo(row.querySelectorAll('.reason__head, .reason__text'), { opacity: 0, x: -16 }, { opacity: 1, x: 0, duration: 0.7, stagger: 0.12 }, 0.15);
    });

    // outils : l'intro se pose, chaque bloc se dévoile en « feuille » (clip-path) puis ses outils éclosent un à un ;
    // ensuite les icônes flottent doucement tant que la section est à l'écran, et réagissent au survol
    gsap.fromTo('.tools__head', { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out', stagger: 0.15, scrollTrigger: { trigger: '.tools', start: 'top bottom', once: true } });
    gsap.utils.toArray('.tools__block').forEach((block, i) => {
      gsap.timeline({ scrollTrigger: { trigger: block, start: 'top bottom', once: true }, defaults: { ease: 'power3.out' } })
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
      scrollTrigger: { trigger: '.svc__title', start: 'top bottom', once: true },
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
    const intro = gsap.timeline(pin ? {} : { scrollTrigger: { trigger: grid, start: 'top bottom', once: true } });
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
      if (!pin) st.create({ trigger: it, start: 'top bottom', end: 'bottom top', onToggle: (self) => { s.active = self.isActive; sync(); } });
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
        st.create({ trigger: it, start: 'top bottom', once: true, onEnter: () => tl.play() });
        st.create({ trigger: it, start: 'top bottom', end: 'bottom top', onToggle: (self) => { state[i].active = self.isActive; sync(); } });
      });
      }); // fin de document.fonts.ready
      gsap.from(cta, { scale: 0.7, autoAlpha: 0, duration: 0.7, ease: 'back.out(2)', scrollTrigger: { trigger: cta, start: 'top bottom', once: true } });
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

  /* ---------- Notre histoire : lecture pilotée par le défilement ----------
     Tout est en scrub, dès que le chapitre entre à l'écran : la photo arrive en pivotant, se dézoome et passe du noir et blanc à la couleur,
     son ombre jaune se déploie, elle se penche avec la vitesse de la molette ; la date monte lettre par lettre, le titre arrive, un numéro
     géant au trait défile derrière en parallaxe ; les mots du récit passent du pâle à l'encre en remontant, au rythme de la molette (SplitText), et
     les mots clés se surlignent en jaune quand on les atteint. Ordinateur : le chapitre est collé pendant la lecture (CSS) puis s'estompe
     en partant. Mobile : chaque bloc suit son propre passage à l'écran. */
  {
    const story = document.querySelector('.story'), chaps = [...story.querySelectorAll('.chap')];
    const split = (els) => window.SplitText ? SplitText.create(els, { type: 'words' }) : { words: [], revert() {} };
    // allume les mots de `words` entre `at` et `at + span` dans la timeline ; chaque <mark> se surligne pendant que ses mots s'allument
    const light = (tl, words, at, span) => {
      tl.fromTo(words, { opacity: 0.12, yPercent: 35 }, { opacity: 1, yPercent: 0, ease: 'power2.out', duration: 0.05, stagger: { amount: span } }, at);
      [...new Set(words.map((w) => w.closest('mark')).filter(Boolean))].forEach((m) => {
        const own = words.filter((w) => m.contains(w));
        tl.fromTo(m, { '--hl': '0%' }, { '--hl': '100%', ease: 'none', duration: span * own.length / words.length }, at + span * words.indexOf(own[0]) / words.length);
      });
    };
    // la photo arrive en pivotant depuis son côté (side = 1 : vient de la droite, -1 : de la gauche), puis se pose
    const photo = (tl, pic, reveal, side = 1) => tl
      .fromTo(pic, { clipPath: 'inset(100% 0% 0% 0%)', rotation: 7 * side, xPercent: 12 * side }, { clipPath: 'inset(-10% -10% -10% -10%)', rotation: 0, xPercent: 0, ease: 'power3.out', duration: reveal }, 0)
      .fromTo(pic, { '--s': 0 }, { '--s': 1, ease: 'power2.out', duration: 0.2 }, reveal * 0.8)
      .fromTo(pic.querySelector('img'), { scale: 1.35, yPercent: -6, filter: 'grayscale(1)' }, { scale: 1, yPercent: 6, filter: 'grayscale(0)', ease: 'none', duration: 1 }, 0);
    const chars = (el) => window.SplitText ? SplitText.create(el, { type: 'chars', mask: 'chars' }) : { chars: [el], revert() {} };
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      // les photos se penchent selon la vitesse de la molette, puis se redressent
      const lean = [...story.querySelectorAll('.chap__pic img')].map((img) => gsap.quickTo(img, 'skewY', { duration: 0.5, ease: 'power3.out' }));
      ScrollTrigger.create({ trigger: story, start: 'top bottom', end: 'bottom top', onUpdate: (self) => { const k = gsap.utils.clamp(-5, 5, self.getVelocity() / -400); lean.forEach((q) => q(k)); } });
      const lead = story.querySelector('.story__lead'), s = split(lead);
      gsap.from(story.querySelector('.story__title'), { y: 40, autoAlpha: 0, duration: 0.8, ease: 'power3.out', scrollTrigger: { trigger: story, start: 'top bottom' } });
      light(gsap.timeline({ scrollTrigger: { trigger: lead, start: 'top bottom', end: 'bottom 60%', scrub: 0.6 } }), s.words, 0, 1);
      return () => s.revert();
    });
    mm.add('(min-width: 62rem) and (prefers-reduced-motion: no-preference)', () => {
      const splits = [];
      chaps.forEach((c, i) => {
        const s = split(c.querySelectorAll('.chap__txt p'));
        const tl = gsap.timeline({ scrollTrigger: { trigger: c, start: 'top bottom', end: 'bottom bottom', scrub: 0.6 } }); // 0 → 0,43 : le chapitre monte ; ensuite il est collé
        const when = chars(c.querySelector('.chap__when'));
        photo(tl, c.querySelector('.chap__pic'), 0.4, i % 2 ? -1 : 1)
          .from(when.chars, { yPercent: 110, rotation: 8, duration: 0.1, stagger: 0.02, ease: 'power3.out' }, 0.2)
          .from(c.querySelector('.chap__title'), { y: 40, autoAlpha: 0, duration: 0.12 }, 0.28)
          .fromTo(c.querySelector('.chap__in'), { '--py': '30vh' }, { '--py': '-25vh', ease: 'none', duration: 1 }, 0);
        splits.push(when);
        light(tl, s.words, 0.42, 0.5);
        if (i < chaps.length - 1) gsap.fromTo(c.querySelector('.chap__in'), { autoAlpha: 1, scale: 1 }, { autoAlpha: 0.1, scale: 0.94, ease: 'power1.in', // s'estompe en laissant la place au suivant
          scrollTrigger: { trigger: c, start: 'bottom bottom', end: 'bottom 30%', scrub: true } });
        splits.push(s);
      });
      return () => splits.forEach((s) => s.revert());
    });
    mm.add('(max-width: 61.99rem) and (prefers-reduced-motion: no-preference)', () => {
      const splits = chaps.map((c, i) => {
        const pic = c.querySelector('.chap__pic');
        const when = chars(c.querySelector('.chap__when'));
        photo(gsap.timeline({ scrollTrigger: { trigger: pic, start: 'top bottom', end: 'bottom 40%', scrub: 0.6 } }), pic, 0.5, i % 2 ? -1 : 1);
        gsap.from(when.chars, { yPercent: 110, rotation: 8, duration: 0.8, stagger: 0.05, ease: 'power3.out', scrollTrigger: { trigger: c.querySelector('.chap__when'), start: 'top bottom' } });
        gsap.from(c.querySelector('.chap__title'), { y: 30, autoAlpha: 0, duration: 0.8, ease: 'power3.out', scrollTrigger: { trigger: c.querySelector('.chap__title'), start: 'top bottom' } });
        gsap.fromTo(c.querySelector('.chap__in'), { '--py': '12vh' }, { '--py': '-12vh', ease: 'none', scrollTrigger: { trigger: c, start: 'top bottom', end: 'bottom top', scrub: true } });
        return [when, ...[...c.querySelectorAll('.chap__txt p')].map((p) => {
          const s = split(p);
          light(gsap.timeline({ scrollTrigger: { trigger: p, start: 'top bottom', end: 'bottom 55%', scrub: 0.6 } }), s.words, 0, 1);
          return s;
        })];
      }).flat();
      return () => splits.forEach((s) => s.revert());
    });
  }

  /* ---------- Nous contacter : arrivée, chaque élément au moment où il entre à l'écran ---------- */
  // Filet jaune qui se trace, titre lettre par lettre dans son masque, coordonnées qui éclosent, photo qui se dézoome, formulaire champ par champ
  gsap.matchMedia().add('(prefers-reduced-motion: no-preference)', () => {
    const contact = document.querySelector('.contact');
    if (!st) { contact.classList.add('is-in'); return; }
    const q = gsap.utils.selector(contact);
    const enter = (el) => ({ trigger: el, start: 'top bottom', once: true });
    const title = q('.contact__title')[0];
    const split = window.SplitText ? SplitText.create(title, { type: 'words, chars', mask: 'chars' }) : null; // words : un mot ne se coupe jamais en fin de ligne

    gsap.timeline({ scrollTrigger: enter(q('.contact__head')[0]), defaults: { ease: 'power3.out' } })
      .fromTo(q('.contact__eyebrow'), { opacity: 0, '--ln': 0 }, { opacity: 1, '--ln': 1, duration: 0.8, ease: 'power2.inOut' }, 0)
      .set(title, { opacity: 1 }, 0)
      .fromTo(split ? split.chars : title, { yPercent: 110 }, { yPercent: 0, duration: 0.9, stagger: 0.025, ease: 'power4.out', onComplete: () => split?.revert() }, 0.1) // revert : le masque ne coupe plus le jambage du « j »
      .fromTo(q('.contact__lead'), { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.8 }, 0.45);

    q('.way').forEach((way) => gsap.timeline({ scrollTrigger: enter(way), defaults: { ease: 'power3.out' } })
      .set(way, { opacity: 1 })
      .fromTo(way.querySelector('.way__icon'), { scale: 0, rotation: -30 }, { scale: 1, rotation: 0, duration: 0.7, ease: 'back.out(2.2)' }, 0)
      .fromTo(way.querySelector('div'), { opacity: 0, x: -16 }, { opacity: 1, x: 0, duration: 0.7 }, 0.12));

    const pic = q('.contact__pic')[0];
    gsap.timeline({ scrollTrigger: enter(pic), defaults: { ease: 'power3.out' } })
      .fromTo(pic, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.9 }, 0)
      .fromTo(pic.querySelector('img'), { scale: 1.25 }, { scale: 1, duration: 1.6, ease: 'power2.out' }, 0)
      .fromTo(pic.querySelector('figcaption'), { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.8 }, 0.5);

    const card = q('.form')[0];
    gsap.fromTo(card, { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', scrollTrigger: enter(card) });
    card.querySelectorAll('.form__grid > *, .form__submit, .form__note').forEach((el) =>
      gsap.fromTo(el, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.6, delay: 0.15, ease: 'power3.out', clearProps: 'transform', scrollTrigger: enter(el) }));

    return () => split?.revert();
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
