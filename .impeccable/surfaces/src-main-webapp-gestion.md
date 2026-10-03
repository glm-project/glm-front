---
version: 1
slug: 'src-main-webapp-gestion'
primary_target: 'src/main/webapp/gestion'
related_targets: []
---

# Gestion : proposition A intégrée

Mode Operate. Raffinement de l’organisation existante après la critique du 3 octobre 2026. L’utilisateur confirme « Améliorer l’organisation actuelle », puis « Ok propo A ». L’identité et les contrôles du front gestion restent la référence visuelle.

## Direction contract

THESIS: comparer la semaine avec une échelle régulière, puis lire les faits du jour dans un détail séparé.

OWN-WORLD: préserver les quatorze rôles de couleurs et les six niveaux typographiques de src/main/webapp/styles.css, les composants Material, les icônes Lucide et le header existant. Aucun nouveau monde visuel ni nouveau token global.

STORY: ouvrir un relevé, comparer sept jours, choisir le jour, lire ses pointages et les états reçus. Depuis la supervision, ouvrir la bonne personne et la date d’une alerte. Retrouver un élément par recherche et reconnaître sa référence dans le rapport de coût.

FIRST VIEWPORT: colonnes égales, échelle commune de 0 à 24 h, horaires séparés des bordures. L’indicateur du jour sélectionné n’en change plus la largeur. Le détail et le journal sont sous la semaine, avec une liste des vérifications à droite. Sur mobile, sept liens quotidiens identifient le choix ; les frises défilent dans leurs régions et les sections s’empilent.

FORM: construction code-led dans le système établi. La proposition A approuvée est la référence de structure ; elle n’est pas une composition à reproduire pixel par pixel. Référence source capturée sur la branche jetable prototype/gestion-proposition-a ; les fichiers du prototype n’entrent pas dans la branche d’intégration.

FINISH: revue indépendante des captures Angular, validation des parcours et des commandes pertinentes, puis documentation des choix locaux. Préserver le système existant sans créer de DESIGN.md ou PRODUCT.md.

## Décisions de mise en œuvre

Les trois référentiels permettent une recherche sans accents et sur toutes les pages acquises. La pagination affichée s’applique aux résultats filtrés. Une lecture partielle ou incohérente n’est jamais présentée comme un catalogue complet.

Le rapport de coût lit la désignation via l’endpoint existant de l’élément. Après rebase sur `origin/main` (`388c1e5`, Angular 22), il conserve le sélecteur d’élément et les états indépendants de chargement, d’erreur et de nouvelle tentative de sa collection. L’identité sélectionnée utilise `element.numero()` : référence d’entreprise lorsqu’elle existe, sinon nom interne. Le nom interne et la description restent sous le sélecteur. L’identité doit correspondre au rapport. Les montants restent ceux du serveur.

Les liens de supervision conservent l’opérateur, la semaine ISO et le jour de la fin automatique ou du début d’activité conflictuel. Les conflits sans activité ouvrent le relevé de la personne sans inventer de date. Aucun nouveau mécanisme de résolution des pointages.

Les états automatiques sont courts dans la semaine et explicites dans le détail et la vérification. Les libellés longs restent lisibles. Les états de chargement, d’erreur, d’absence et de refus sont conservés.

La recherche des trois référentiels partage le contrôle `gestion-recherche` dans le fichier de surfaces de gestion. Il utilise les rôles existants pour la surface, le texte, la bordure, le focus, la taille de lecture et la cible tactile. Les tables, filtres segmentés, actions Material et paginations conservent leur organisation.

La supervision conserve ses couloirs. Lorsqu’un couloir est vide, il devient compact ; le couloir occupé peut alors présenter trois colonnes sur grand écran. Les noms liés gardent un espacement explicite entre nom et prénom et peuvent revenir à la ligne.

Le bandeau d’un conflit contenant des activités datées est statique ; chaque activité porte son propre lien vers sa date réelle. Le conflit sans activité garde le lien général vers la personne. Dans « À vérifier », l’action « Voir les pointages » reste explicitement bleue et soulignée.

## Comparaison avec le système établi

Autorité conservée : `documentation/design-system.md` et `src/main/webapp/styles.css`. La comparaison du code fini avec la base de rebase `388c1e5` confirme qu’ils sont inchangés, comme le bridge Material `gestion/shared/design-system/infrastructure/primary/material-bridge.css` et le header `gestion/header/`. Les quatorze rôles de couleurs, les six niveaux typographiques, les deux rayons, les cibles tactiles et les piles de polices système restent publiés par le thème commun.

Les ajouts de présentation utilisent ces rôles : fond de carte `surface`, séparation `border`, texte `ink` et `ink-muted`, action et focus `accent`, avertissement `warn`. La non-conformité conserve son fond et ses hachures `nc`, associés à `ink` ; elle ne devient pas une couleur de texte. Les captures conservent les contrôles Material, le dessin Lucide et la navigation du header. Les nouvelles règles concernent la composition de ces pages et le contrôle de recherche partagé par gestion ; elles n’établissent aucun token ni identité globale.

Écart préexistant observé, sans correction dans cette livraison : `.pas` dans `SyntheseDesHeures.css` conserve une taille littérale de `1.125rem`, déjà présente dans HEAD, en dehors des six rôles typographiques. Cette observation ne modifie pas l’autorité du thème et n’autorise pas une nouvelle échelle.

## Preuves et portée

Les quatorze fichiers de l’application Angular dans `.impeccable/review/` ont été ouverts pour cette comparaison : `A-{heures,supervision,references,operateurs,postes,couts}-{1440,390}.png` et `A-heures-detail-{1440,390}.png`. Les deux derniers montrent le détail du jour, avec le défilement nécessaire sur mobile. Ce sont des fixtures illustratives, pas des données réelles d’atelier. Les tests métier et de contrat vérifient séparément pagination, identité et navigation.

Après rebase, les quatorze captures ont été renouvelées sous Angular 22 par `PresentationA.spec.ts` et ouvertes pour une nouvelle comparaison documentaire. La préparation attend ensuite l’activation du sélecteur d’opérateur avant toute capture des heures ; la recapture mobile confirme la disparition du chargement transitoire. Les captures de coût à 1440 et 390 px montrent le sélecteur conservé, la référence sélectionnée et le nom interne et la description dessous, sans débordement de cet en-tête. Cette vérification des changements ultérieurs ne remplace pas le verdict indépendant sur les trois corrections.

La proposition approuvée provient de la branche jetable `prototype/gestion-proposition-a`, commit `72d06ea`. Ses captures `desktop-A.png` et `mobile-A.png` dans `artifacts/gestion-design-prototype/review/` du checkout initial servent de références de critique. L’aperçu Angular à backend synthétique en lecture seule et les fichiers ignorés `artifacts/gestion-review/` servent à la revue ; ils ne constituent pas un backend de production.

La revue indépendante a demandé trois corrections : séparation des noms liés, destination datée de chaque activité en conflit et affordance explicite de « Voir les pointages ». Son dernier verdict est `ship` au périmètre de ces trois corrections, toutes notées résolues. Ce passage de verdict ne constitue pas une nouvelle revue complète de toutes les surfaces.

Le détecteur signale le soulignement bleu de sélection du jour (3 px) comme side-tab. La revue accepte cet indicateur d’onglet temporel ; l’état reste également exposé par `aria-current`. L’exception est limitée à cette sélection de date, sans règle d’ignorance globale.

Documentation de cette extension terminée après comparaison des captures et du code. Les conventions locales restent dans les `AGENTS.md` des six contextes concernés. Aucun `DESIGN.md`, `PRODUCT.md` ni sidecar de système n’est créé. La validation finale des commandes du dépôt relève de la livraison et doit être rapportée après leur sortie effective.
