# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack et commandes

Site vitrine **single page** de Happy Culteur (en français) en **HTML/CSS/JS purs**, sans build, sans dépendance npm. Animations **GSAP** 3.13 (CDN cdnjs : Observer, ScrollTrigger, SplitText, DrawSVGPlugin) réintroduites section par section, en repartant de zéro : pour l'instant seul le tracé du soulignement du hero (`.underline`) est animé. **Navigation par panneaux** pour Accueil et Qui sommes-nous (`.slides`, GSAP Observer, `js/main.js`) ; à partir de « Pourquoi collaborer » (`#collaborer`, hors `.slides`) la page défile librement avec **Lenis** (inertie), le slider se verrouille/déverrouille (`is-locked`/`is-free`) ; les sections libres sont dans `.free-zone` ; `#services` y est une **rangée de 4 colonnes tenant dans un écran** (`.svc__item` : illustration SVG inline animée par GSAP — arrivée orchestrée, boucle de vie par illustration, survol — + titre, tags, texte ; 1er paragraphe visible, suite dans `<details>` ) ; : chaque `<section class="panel">` est un écran plein ; molette, swipe tactile, clavier et liens `#id` changent de panneau avec une transition. Actif seulement si `(min-width: 62rem) and (min-height: 46rem)` (classe `is-slider` sur `<html>`, posée dans le `<head>` puis gérée par `gsap.matchMedia`) ; sinon page à défilement natif. Le passage vers les sections libres redéfinit le panneau courant sur le dernier (« Qui sommes-nous ») : en remontant on repasse par lui avant l'accueil ; l'`Observer` est scindé en `wheel` + `touch` (le mode touch avale les clics, il ignore `a, button, summary`) ; en quittant « Qui sommes-nous » à la molette/au swipe, simple élan d'un tiers d'écran puis défilement libre (pas d'alignement forcé sur `#collaborer`, refusé par le client) ; un lien vers une section libre s'aligne sur elle (`lenis.scrollTo(…, { lock: true })`) ; `history.scrollRestoration='manual'` et un lien `#services` au rechargement déverrouille directement. « Qui sommes-nous » porte une photo d'équipe (`collaboration.jpg`, motif feuille, **provisoire**, différente de celle du hero). Les « Lire la suite » de `#services` ouvrent une feuille (vague d'encre `clip-path`). Pour ajouter une section : `<section class="panel" id="…" data-label="…">` dans `<main>`, éléments à animer à l'arrivée avec `data-slide-in` (ne pas le mettre sur un élément déjà animé par GSAP, ex. le bouton du hero). Lien actif et hash se gèrent seuls. Le contenu d'un panneau doit tenir dans 100svh en mode slider. Ajouter ScrollTrigger seulement quand une animation au scroll sera nécessaire.

- Lancer en local : `python3 -m http.server 8000` puis http://localhost:8000 (ou ouvrir `index.html`).
- Pas de lint ni de tests configurés.

Fichiers : `index.html` (une seule page ; **hero (`#accueil`) et « Qui sommes-nous ? » (`#qui-sommes-nous`) construits**, `#equipe` construit aussi ; les liens de nav vers `#histoire`, `#contact` sont encore sans cible), `css/style.css` (tokens `:root` en tête, sommaire numéroté), `js/main.js`, portraits **provisoires** de « Notre équipe » `assets/img/equipe/{prénom}-{id Unsplash}.jpg` (licence Unsplash, portraits 4:5 recadrés sur le visage, jeunes en tenue sombre au bureau ; Fotografía Editorial, Francis Ledger, Rodrigo Rodrigues, Shane Ryan Herilalaina, Collins Lesulie, The Dream Archives ; à remplacer par les vraies photos de l'équipe), photos non utilisées pour l'instant (Unsplash, licence Unsplash ; anciens heros) : `assets/img/sourire-poste.jpg` (Vitaly Gariev, UHfJI_lZoPo), `assets/img/equipe-ecran.jpg` (Creatopy, oMtJYEbniH8), `assets/img/relation-client.jpg` (baljkann4, wnpf3Q5pkXA), `assets/img/equipe.jpg` (Jud Mackrill).

Conventions à respecter :
- SEO/accessibilité : un seul `<h1>`, chaque `<section>` porte `aria-labelledby` vers son titre, métadonnées + JSON-LD dans `<head>`, lien d'évitement, `aria-expanded` sur le menu mobile.
- Animations : quand GSAP sera réintroduit, l'état masqué initial doit être défini en CSS sous `.js` **et** `prefers-reduced-motion: no-preference` (sinon contenu invisible si GSAP ne charge pas), et les animations vont dans `gsap.matchMedia()`.
- Couleurs/polices : uniquement via les variables CSS (`--c-*`, `--f-*`).
- Sections restantes à construire dans l'ordre de la nav ; `canonical`, `og:url`, `og:image` et l'URL du JSON-LD sont à renseigner. 

## Contenu texte (source : maquette fournie)

**Navigation** : logo « happy culteur » (logo texte jaune/doré, serif, avec sous-titre en petites capitales) · Accueil (actif, souligné en jaune) · Qui sommes-nous ? · Nos services · Notre équipe · Notre histoire · Nous contacter · bouton « Parlons de votre projet → ».

**Hero** :
- Titre : « Cultiver des talents, *faire grandir* des projets. » (la ligne « faire grandir » est en jaune)
- Sous-titre : « Une équipe impliquée qui aime faire les choses correctement. »
- Bouton jaune : « Parlons de votre projet → »
- **Hero refait (remplace la maquette pour la mise en page)** : pas de photo. Titre géant à l'encre sur blanc (« faire grandir » en `--c-accent`, même jaune que le rayon : demandé par le client), chapeau, bouton + lien « Essai gratuit de deux semaines » (→ `#collaborer`) ; derrière, à droite, un **rayon de miel au trait** (`svg.comb`, 37 alvéoles `.hc` générées, `data-d` = anneau depuis le centre ; `.hc--line` au trait, `--fill` jaune, `--tint` crème, `--icon` = les 4 services en pictos), sous la navbar, bords fondus (`mask-image` radial) et dernier anneau flouté, coupé par le bord droit (en bas sur mobile). Ouverture (`main.js`, DrawSVGPlugin) : alvéoles tracées anneau par anneau depuis le centre, pleines qui éclosent (`back.out`), pictos dessinés, onde dorée qui parcourt les traits ; ensuite le rayon **vit** en boucle (toutes les 3,5–5 s : onde dorée partant d'une alvéole au hasard + une alvéole qui s'emplit de jaune puis se vide ; alvéoles pleines qui respirent), en pause quand le hero n'est pas à l'écran (`live()` : IntersectionObserver, panneau courant, pas `is-free`) ; titre lettre par lettre (lettres du slider) ou ligne par ligne (mobile). Sur pointeur fin, chaque alvéole (`.hc__in`, jamais le `<g>` qui porte la position) suit le pointeur selon `depth(d, kind)`.

**Qui sommes-nous ?** (texte fourni par le client, à reprendre tel quel)
> Happy Culteur, c'est une équipe de jeunes talents, réunis par une même ambition : avancer ensemble et se tirer vers le haut, aussi bien professionnellement qu'humainement.
>
> Nous croyons qu'une entreprise ne peut grandir durablement que lorsque les personnes qui la composent grandissent elles aussi. C'est pourquoi nous plaçons l'humain au cœur de notre façon de travailler, en encourageant l'apprentissage, l'entraide, la responsabilisation et l'envie de toujours faire mieux.
>
> Cette philosophie se retrouve dans chaque mission que nous réalisons. Nous ne cherchons pas simplement à exécuter une tâche : nous cherchons à comprendre votre activité, vos attentes et vos enjeux afin de nous intégrer pleinement à votre fonctionnement.
>
> Nous avons à cœur de créer des relations simples et sincères, aussi bien au sein de notre équipe qu'avec nos clients. Nous avançons avec l'idée que le sérieux, l'implication et la confiance sont les bases d'une collaboration qui fonctionne vraiment.
>
> C'est cette façon de travailler que nous voulons partager avec chaque entreprise qui nous fait confiance.

Valeurs récurrentes à garder dans le ton : humain, entraide, apprentissage, responsabilisation, sérieux, implication, confiance, relations simples et sincères.

## Charte graphique (estimée à l'œil depuis la maquette)

> Valeurs **approximatives** relevées visuellement sur une capture, pas sur un fichier source. Si le client fournit le logo vectoriel ou une charte, remplacer ces valeurs et mettre à jour cette section.

### Couleurs

| Rôle | Valeur estimée | Usage |
|---|---|---|
| Jaune/ambre (accent) | `#F7B731` (≈ `#F5B335`–`#FAB82E`) | Boutons CTA, mots clés du titre, soulignement du lien actif, logo |
| Jaune foncé pour texte (`--c-accent-ink`) | `#B87A06` | Mots en jaune dans un **titre** (« faire grandir ») : le jaune vif n'a que 1,8:1 de contraste sur blanc, celui-ci 3,6:1 ; le jaune vif reste pour les aplats, soulignements, boutons |
| Texte principal | `#14142B` (quasi noir bleuté ; ≈ `#111827`) | Titres, navigation |
| Texte secondaire | `#4B4B5A` | Sous-titre du hero |
| Fond | `#FFFFFF` | Fond de page, nav |
| Texte sur bouton jaune | `#14142B` | Libellé + flèche du bouton |

Principes : fond blanc très aéré, jaune uniquement en accent (CTA, mot mis en valeur, soulignement), noir/bleu nuit pour le texte. Le noir des polos de la photo apporte le contraste, ne pas l'ajouter en grands aplats.

### Typographies

| Rôle | Style observé | Équivalent Google Fonts proposé |
|---|---|---|
| Titres (hero) | Serif à fort contraste, élégant, graisse regular/medium, interlignage serré | **Fraunces** 600 (texte en **Manrope**) |
| Navigation, sous-titre, boutons, texte courant | Sans-serif géométrique/humaniste, graisse regular ; boutons en medium | **DM Sans** (alternatives : Inter, Poppins) |
| Logo | Serif manuscrit/fin jaune + sous-titre en petites capitales espacées | À remplacer par le fichier du logo fourni |

Les familles exactes sont des **suppositions** ; confirmer avec le client avant de les figer.

### Composants repérés
- Bouton principal : pilule (rayon max) jaune, texte sombre, flèche `→` à droite.
- Lien de nav actif : soulignement jaune court sous le libellé.
- Titre hero : 3 lignes, la 2e (« faire grandir ») en jaune, taille très grande (≈ 3–4rem+).
- Image hero : coins très arrondis, bord gauche en courbe prononcée.

### Identité visuelle (motif récurrent)
- **La feuille** : photos aux angles opposés très arrondis (`border-radius: 0 var(--leaf) 0 var(--leaf)`), doublée d'une feuille jaune décalée derrière. À réutiliser pour toute nouvelle photo.
- **L'abeille** (clin d'œil à « apiculteur » et à l'abeille du logo) : **pas de mascotte dessinée ni d'abeille animée** (trois versions refusées par le client comme peu professionnelles : dorure du titre, abeille guide, vol organique). L'univers abeille passe uniquement par des touches **géométriques** : boutons qui déplient du contenu en **alvéole** (`clip-path: var(--hex)`), trajectoire pointillée reliant trois petites illustrations au style des prestations (`svg.reason__ill` : pièce de puzzle qui s'emboîte = adaptables ; ordinateur en wifi + batterie de secours qui se charge = conditions de travail ; calendrier dont 14 jours se colorient = test de deux semaines ; tracées au scroll par DrawSVG ; les pictos génériques ont été refusés) dans `#collaborer`, désormais sur fond blanc (le rayon de miel est réservé au hero). `.hero.is-done` posée en fin d'intro : les états masqués du hero sont scopés `:not(.is-done)` pour que le h1 reconstruit par `splitChars().restore()` reste visible.
- **Fonds** : toujours blancs, jamais de fond bleu (refusé par le client) ; le jaune reste l'accent, jamais un grand aplat. `#collaborer` garde une simple lueur jaune très légère. **Séparation des sections = fondu de couleur** : `#services` sur crème (`--c-tint`) qui monte du blanc et y redescend en dégradé (pas de bord net), entre `#collaborer` et `#outils` blancs ; sur ce crème, le fond des illustrations passe au blanc. **Notre équipe** (`#equipe`, dernière section libre, même fondu crème) : **galerie horizontale** (idée du client). `.crew` > `.crew__track` = intro `.team__top` (grand titre, chapeau, invite « Faites défiler ») + `ul.crew__list` de six `.mate` (grande photo 4:5 étalonnée, texte posé dessus dans `.mate__txt` sur un voile d'encre : prénom en Fraunces, métier précédé d'un filet jaune, citation en italique) + `.team__end` (phrase + bouton « Parlons de votre projet »). Ordinateur **et mobile**, sans mouvement réduit (`main.js`) : `.crew.is-driven`, la section fait un écran, épinglée (ScrollTrigger `pin`, `scrub`), la molette fait glisser toute la rangée (`scrub: true` sans retard, **pas d'`anticipatePin`** qui figeait la section ~40 px trop tôt = petit arrêt, et les portraits arrivent déjà en glissant depuis la droite pendant que la section monte, à la vitesse de la page : virage vertical → horizontal sans à-coup), portraits hauts de 72svh, chaque photo glisse dans son cadre (`containerAnimation`), jauge `.team__bar` en bas (`--p`). Mouvement réduit : intro au-dessus, portraits au doigt (`scroll-snap`), bouton dessous. Galeries refusées : intro au-dessus d'une rangée de petites cartes (« moche, pas pro ») ; puis portraits moyens décalés avec texte sous la photo (« photos trop petites, texte sous la photo »). Refusés avant (« pas professionnel », « moche ») : ruche de portraits, mur de bandes qui s'ouvrent, bandes à tour de rôle sur mobile, défilé continu de cartes, grille de grandes photos 4:3 façon maquette (+ étiquette « Notre équipe »), mise en page magazine (titre fixe à gauche, deux colonnes décalées, cadre en feuille, sommaire des prénoms), cartes blanches 3 × 2 (photo ronde : « trop simple » ; puis alvéoles + motif de ruche : « alvéoles, cartes, trop chargé, pas assez vivant »). Refusés avant : séparateur pointillé `.sep` seul, feuilles empilées sticky (« effet de désordre »), bandeaux de texte qui défile. Refusés pour les fonds des sections libres : feuilles crème identiques, feuille qui s'ouvre + trame de points, un fond animé différent par section, dégradé WebGL qui ondule façon Stripe.
- **Photo de « Qui sommes-nous »** (« Pourquoi collaborer » : titre + illustration SVG de pousse à gauche, trois arguments à droite ; pas de photo) : `assets/img/collaboration.jpg`, photo gratuite Unsplash (licence Unsplash, attribution non requise) par Vitaly Gariev, choisie faute d'IA de génération d'image ; à remplacer par une vraie photo de l'équipe.
