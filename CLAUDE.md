# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack et commandes

Site vitrine **single page** de Happy Culteur (en français) en **HTML/CSS/JS purs**, sans build, sans dépendance npm. Animations **GSAP** (CDN cdnjs) réintroduites section par section, en repartant de zéro : pour l'instant seul le tracé du soulignement du hero (`.underline`) est animé. **Navigation par panneaux** pour Accueil et Qui sommes-nous (`.slides`, GSAP Observer, `js/main.js`) ; à partir de « Pourquoi collaborer » (`#collaborer`, hors `.slides`) la page défile librement avec **Lenis** (inertie), le slider se verrouille/déverrouille (`is-locked`/`is-free`) ; les sections libres sont dans `.free-zone` ; `#services` y est une **rangée de 4 colonnes tenant dans un écran** (`.svc__item` : illustration SVG inline animée par GSAP — arrivée orchestrée, boucle de vie par illustration, survol — + titre, tags, texte ; 1er paragraphe visible, suite dans `<details>` ; les photos `assets/img/service-N.jpg` ne sont plus utilisées ici) ; : chaque `<section class="panel">` est un écran plein ; molette, swipe tactile, clavier et liens `#id` changent de panneau avec une transition. Actif seulement si `(min-width: 62rem) and (min-height: 46rem)` (classe `is-slider` sur `<html>`, posée dans le `<head>` puis gérée par `gsap.matchMedia`) ; sinon page à défilement natif. Pour ajouter une section : `<section class="panel" id="…" data-label="…">` dans `<main>`, éléments à animer à l'arrivée avec `data-slide-in` (ne pas le mettre sur un élément déjà animé par GSAP, ex. le bouton du hero). Lien actif et hash se gèrent seuls. Le contenu d'un panneau doit tenir dans 100svh en mode slider. Ajouter ScrollTrigger seulement quand une animation au scroll sera nécessaire.

- Lancer en local : `python3 -m http.server 8000` puis http://localhost:8000 (ou ouvrir `index.html`).
- Pas de lint ni de tests configurés.

Fichiers : `index.html` (une seule page ; **hero (`#accueil`) et « Qui sommes-nous ? » (`#qui-sommes-nous`) construits**, les liens de nav vers `#services`, `#equipe`, `#histoire`, `#contact` sont encore sans cible), `css/style.css` (tokens `:root` en tête, sommaire numéroté), `js/main.js`, `assets/img/equipe.jpg` (photo du hero, recadrée depuis la capture de maquette, 438×436 : basse résolution, à remplacer par l'originale).

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
- Visuel : photo d'équipe souriante en polos noirs (logo « happy » brodé) autour d'ordinateurs portables, dans un bureau lumineux avec plantes ; image à droite, découpée avec un grand arrondi côté gauche.

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
- **Fonds** : toujours blancs, jamais de fond bleu (refusé par le client) ; le jaune reste l'accent, jamais un grand aplat.
- **Photo de « Pourquoi collaborer »** : `assets/img/collaboration.jpg`, photo gratuite Unsplash (licence Unsplash, attribution non requise) par Vitaly Gariev, choisie faute d'IA de génération d'image ; à remplacer par une vraie photo de l'équipe.
