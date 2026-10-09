# 0053 — Remplacer le type d'élément par les catégories de l'entreprise

## Status

`Accepted`

- `Amends 0044: les moules ne s'affichent plus deux par ligne ; toutes les zones du pupitre partagent la grille commune.`
- `Amended on 2026-10-09 (lot B9 of #254, ADR 0054): la clé du journal stocké passe de atelier-activites-v1: à atelier-activites-v2: et l'ancienne est écartée, sans migration ; la traduction à la lecture d'un journal sans catégorie n'existe plus, et un pupitre qui avait un journal d'avant les catégories repart d'un journal vide au déploiement.`

## Context

Le back rangeait chaque élément de fabrication dans un type figé, `ORDRE_DE_FABRICATION` ou `PRODUIT`, que le
front recopiait en une union par contexte (atelier, coût de revient, relevé des heures, supervision, éléments
de fabrication, pupitre) et traduisait en « OF » et « Moule » par une table de libellés. Le pupitre en tirait
deux zones, « Moules » sur deux colonnes et « OF ».

Chaque entreprise cliente nomme autrement ce qu'elle fabrique. glm-back#100 remplace le type par des
catégories de produit que l'entreprise déclare, ordonne et supprime tant qu'aucun produit ne les porte. Le
code d'une catégorie (`^[A-Z]{1,10}$`) en est aussi le libellé et le préfixe du nom des produits ; il ne se
renomme pas. Le back l'a livré sans rupture (glm-back ADR 0009) : chaque réponse porte `categorie` et l'ancien
`type`, déprécié, jusqu'à glm-back#107.

Le pupitre garde sur disque un référentiel écrit avant ce changement, qu'il relit au redémarrage hors ligne.

## Considered options

- Garder l'union et traduire les nouvelles catégories vers `PRODUIT` — rejeté : toute catégorie autre que `OF`
  deviendrait « Moule » à l'écran.
- Une table de libellés par catégorie côté front — rejeté : les catégories appartiennent à l'entreprise et
  changent sans déploiement ; le code est déjà son libellé.
- Un Value Object de catégorie par contexte, affiché tel quel, et l'ordre lu au back — **kept**.

## Decision

Chaque contexte porte la catégorie dans **son propre Value Object** (`CategorieDElementEngage`,
`CategorieDElementChiffre`, `CategorieDElement`, `CategorieDeProduit`), non vide, et **affiche son code tel
quel**. Aucune table ne traduit une catégorie, aucun écran ne nomme « Moule » ou « OF ».

Les adapters lisent `categorie` et jamais `type` : les règles `@typescript-eslint/no-deprecated` et
`sonarjs/deprecation` refusent toute lecture du champ déprécié. Les fixtures HTTP écrivent encore `type`,
dérivé de la catégorie, tant que le contrat l'exige.

**L'ordre vient du back.** La page Produits lit `GET /api/categories-de-produit` avec ses éléments, et en tire
ses boutons de création et ses filtres ; sans catégorie, elle invite à en déclarer une. Le pupitre range ses
tuiles en une zone par catégorie présente, dans l'ordre de `categories` du référentiel, puis par code pour une
catégorie que cet ordre ne connaît pas. Toutes les zones partagent la grille commune : la disposition des
moules sur deux colonnes disparaît avec leur zone.

**Le journal stocké se traduisait à la lecture** (retiré le 2026-10-09). L'adaptateur IndexedDB donnait à un suivi
stocké sans `categorie` celle de son ancien `type` (`ORDRE_DE_FABRICATION` → `OF`, `PRODUIT` → `MOULE`) et un ordre
vide à un référentiel sans `categories`. La clé `v2` écarte tout journal d'avant ; le domaine ne connaît que la nouvelle
forme.

## Consequences

### Positive

- Une entreprise déclare une catégorie, et la gestion comme le pupitre la proposent sans déploiement.
- Le lint signale toute lecture résiduelle de `type` : glm-back#107 pourra le retirer sans casser le front.
- Un pupitre redémarré hors ligne sur un vieux journal gardait ses tuiles jusqu'au prochain rafraîchissement ; depuis la
  clé `v2`, il repart d'un journal vide.

### Negative

- Six Value Objects quasi identiques, un par contexte : le prix de contextes qui ne partagent aucun modèle.
- Le code brut (« MOULE ») remplace un libellé rédigé (« Moule ») ; une entreprise qui voudrait un libellé
  distinct du code rouvrirait la question côté back.
- La traduction du journal stocké est retirée avec la clé `v2` : un pupitre déployé avant cette clé perd ses gestes en
  attente, ce que le ticket #254 accepte.
- Les moules perdent leurs cibles plus larges ; si l'atelier le regrette, il faudra une disposition par
  catégorie, donc une donnée de paramétrage de plus.
