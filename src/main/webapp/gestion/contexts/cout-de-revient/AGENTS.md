# Coût de revient

Ce contexte appartient exclusivement à `gestion`. Il porte le **rapport de coût de revient** qu'un
gestionnaire consulte sur un élément de fabrication : ce que sa fabrication a coûté, et le temps qui y a
été passé, ligne par ligne.

Il est **purement lecteur**. Aucun acte, aucune écriture, aucun refus métier à traduire en geste : un
rapport se demande et s'affiche.

## Comptabilisation opérationnelle

L'[ADR 0047](../../../../../../documentation/adr/0047-count-only-finished-activities.md) fixe la
comptabilisation et les diagnostics que ce lecteur restitue depuis le contrat épinglé.

**Activité valorisable** : activité terminée, y compris automatiquement, dont le back calcule le coût.
Une activité en cours est entièrement exclue du calcul, y compris du diviseur humain des postes.
Le rapport signale les anomalies de fin automatique reçues du back et peut préciser cette exclusion.
Quand une activité se termine, son entrée dans le diviseur peut réduire le coût d'une autre activité
déjà terminée lors de la lecture suivante. Le front affiche ce recalcul sans effectuer sa propre somme.
Chaque transition travail/NC rend l'activité précédente valorisable et ouvre une nouvelle activité.
Après remplacement de la fin automatique par une fin réelle recevable, le rapport retire l'alerte
active par recalcul. La fin automatique et l'anomalie sont dérivées par le back ; seuls les pointages
et corrections sont conservés dans l'historique.

Les anomalies réelles sont signalées dans ce rapport ; leur correction relève des commandes back.
La résolution des séquences en conflit se fait dans le contexte [anomalies-de-pointage](../anomalies-de-pointage/AGENTS.md).

Une correction peut faire redevenir une activité en cours : elle sort alors du coût et du diviseur
humain au recalcul du back, et son anomalie disparaît. Le rapport restitue ce nouvel état.

**Pointage à résoudre** : pointage dont des pointages contradictoires empêchent de connaître la fin, au sens
de l'ADR 0047. Le back expose sa fin au plus tard, ses pointages contradictoires et la complétude des totaux,
y compris lorsqu'il empêche de partager le temps d'un opérateur sur un autre élément (« partage inconnu »).
Le rapport le signale sur le pointage, affiche « — » pour sa durée et ses montants et « Incomplet » pour chaque
total concerné ; il ne remplace pas une valeur à résoudre par zéro et ne choisit pas une interprétation des
pointages. Le gestionnaire corrige les pointages, puis le back recalcule le rapport. Le mot « séquence » du
back n'apparaît jamais à l'écran.

## Langage

**Coût de revient** : ce que la fabrication d'un élément a coûté. Le mot est celui du back et celui du
client. Le rapport n'est **jamais stocké** : il est recalculé à chaque lecture depuis les journaux de
l'atelier, pour qu'une saisie régularisée après coup compte à l'heure où le travail a eu lieu.

**Élément chiffré** : l'élément de fabrication dont le coût est lu, relu au référentiel à chaque appel.
Le port compose le rapport avec la fiche du référentiel pour conserver la référence et le libellé facultatifs.

**Nature d'opération** : le métier d'une ligne — « Fraisage », « Tournage », « Érosion ». Elle vient du
**poste de travail**, jamais de la personne, et elle a été copiée au moment de la saisie : un poste
requalifié depuis ne requalifie pas les heures déjà passées. Elle est **absente** quand le pointage n'a
engagé aucun poste.

**Ligne de coût** : tout ce qui a été fait sur l'élément à une même nature d'opération. C'est l'unité du
rapport.

**Temps passé** : une durée séparée en **bon travail** et en **non-conformité**. Une pièce ratée se refait
sur le même élément et au même tarif, mais comptée à part.

**Coût** : un montant séparé en **machine** — ce que coûtent les postes de travail — et en **main
d'œuvre** — ce que coûtent les opérateurs. Les deux ne s'agrègent pas de la même façon, et c'est la raison
pour laquelle ils sont affichés séparément.

**Montant** : une valeur en euros, déjà arrondie au centime par le serveur.

## Modèle de domaine

- **CoutDeRevient** : agrégat racine. Il porte l'élément que le rapport a résolu, ses lignes, son temps
  total et son coût total, l’évaluation et les activités en cours exclues. `estSansTravail()` requiert aucune
  ligne et aucune activité exclue ; `lignesEnAnomalie()` rend les lignes dont un pointage porte une anomalie.
- **ElementChiffre** : Value Object du nom et du type de l'élément que le rapport a résolus.
- **ElementChiffreId** : Value Object de l'identifiant de l'élément, opaque à ce contexte.
- **TypeDElementChiffre** : union des deux valeurs du type, structurellement compatible avec l'énum de
  l'API.
- **LigneDeCout** : Value Object d'une ligne — sa nature éventuelle, son temps passé, son coût et ses pointages.
  `estSansPoste()` distingue la ligne sans nature ; `anomalies()` compte ses pointages par anomalie, dans un ordre
  fixe (fin automatique, à résoudre, partage inconnu).
- **PointageDeCout** : Value Object d'un pointage de la ligne — opérateur et poste cités, catégorie, période,
  durée, coût horaire et taux figés, coût et parts, tels que le serveur les a calculés, avec ses anomalies
  (`FIN_AUTOMATIQUE`, `A_RESOUDRE`, `PARTAGE_INCONNU`), sa fin au plus tard et ses pointages contradictoires.
  `detailleSonPartage()` dit si ses parts expliquent quelque chose (plusieurs parts, ou une part partagée ou
  au partage inconnu).
- **PartDePointage** : Value Object d'une part — début, fin, durée, diviseur éventuel, main d'œuvre déjà
  répartie au centime, activités parallèles et bloquantes. Un diviseur reçu doit être un entier au moins égal
  à un.
- **OperateurCite**, **PosteCite**, **ElementCite**, **ActiviteCitee** : identités citées par le détail, avec
  les noms que le serveur a relus ; un nom absent laisse l'identité seule.
- **NatureDOperation** : Value Object du métier d'une ligne, non vide.
- **TempsPasse** : Value Object du temps, séparé en bon travail et non-conformité, avec son total.
  `porteUneNonConformite()` répond à « y a-t-il eu une reprise ».
- **DureePassee** : Value Object d'une durée ISO-8601, exprimée en heures et minutes.
- **PeriodeDeTravail** : Value Object du début et de la fin certaine éventuelle. Une fin absente ne reçoit
  jamais l’instant d’évaluation comme remplacement.
- **InstantDeTravail** : Value Object d'un instant reçu du back, refusé s'il n'est pas un instant absolu.
- **Cout** : Value Object du coût, séparé en machine et main d'œuvre, avec son total.
- **Montant** : Value Object d'une valeur certaine en euros, finie et jamais négative.
- **TotalDeTemps** et **TotalDeMontant** : complets avec une valeur certaine, zéro compris, ou incomplets
  sans valeur. Chaque catégorie garde sa propre complétude ; les snapshots sont des unions immuables.
- **ActivitesEnCoursExclues** : nombre reçu d’activités exclues du temps, du coût et du diviseur.
- **PointageEnConflit** : un pointage contradictoire — son type (début, reprise en non-conformité, fin) et son
  instant.
- **ElementDisponible** : projection immuable associant l’identité nom/type à son identifiant opaque pour le choix.
- **CoutDeRevientPort** : port secondaire de lecture du rapport et des identités disponibles.

## Responsabilités et invariants

- **Le front n'additionne ni durée ni montant.** Le temps total et le coût total sont lus du serveur et
  affichés tels quels ; les lignes ne sont jamais sommées. Les montants sont déjà arrondis par le serveur.
  Un total incomplet n’expose aucun chiffre dans les cellules, les indicateurs ou leurs textes accessibles.
  Une catégorie indépendante reste chiffrée. Resommer côté client
  donnerait à l'écran un second avis sur ce qu'une fabrication a coûté, et en ferait un avis faux dès le
  premier arrondi.
- **Les lignes ne sont jamais réordonnées.** Le serveur promet les natures dans l'ordre et la ligne sans
  nature en dernier. La retrier ici demanderait de rejouer un ordre que ce contexte ne possède pas.
- **Une ligne sans nature est le cas nominal**, pas un cas dégradé : c'est ce que produit une entreprise
  sans parc machine, dont l'opérateur reste payé. Elle s'affiche, et son coût machine vaut zéro.
- **Un rapport vide est une réponse.** Un élément engagé sur lequel personne n'a encore pointé rend zéro
  ligne, un temps nul et un coût nul. L'écran l'explique ; ce n'est ni une panne ni une absence. Un rapport
  uniquement en cours rend les zéros complets et l’exclusion explicite.
- **Un élément inconnu du référentiel est une réponse, pas une panne.** Le port rend l'absence, l'écran
  l'explique, et `ErrorHandlerPort` n'est pas dérangé.
- **Machine et main d'œuvre ne s'agrègent pas de la même façon, et l'écran ne le cache pas.** Le coût
  horaire de chaque poste valorisable court **en entier**, même quand l'opérateur en mène plusieurs de front ;
  le taux horaire de l'opérateur, lui, est **divisé** par le nombre de postes qu'il occupait à cet
  instant parmi les activités terminées, tous éléments confondus. Les afficher séparément est ce qui rend la règle lisible ; les fondre
  en un seul chiffre la rendrait incompréhensible le jour où quelqu'un la vérifie à la main.
- **Le rapport est celui de l'élément, pas d'un passage en atelier.** Un élément réengagé après clôture
  additionne ses passages : plusieurs lignes de l'écran `/atelier` mènent donc au même rapport, et c'est
  le comportement voulu.
- Ce contexte ne dépend d'aucun contexte de `pupitre` et ne partage aucun modèle métier avec lui.

## Relations de contexte

- `atelier` possède les suivis. **Ce contexte ne l'importe pas** : il déclare son propre identifiant
  d'élément et reçoit du rapport lui-même le nom et le type à afficher. Le lien entre les deux écrans est
  un `routerLink` vers `/couts-de-revient/<id>`, jamais un import.
- `element-de-fabrication` possède le référentiel. Même règle : aucun import de son domaine ou de ses adaptateurs. La collection HTTP est traduite dans la projection de ce contexte.
- Le back découpe ce rapport dans son propre bounded context `coutderevient`, qui rejoue les journaux de
  l’atelier sans importer son domaine. Ce front conserve sa propre traduction de lecture.

## Règles locales

- Les anomalies restent repérables avant de déplier une ligne : un bandeau en haut de page les résume, et la
  nature porte une pastille par type d'anomalie avec son nombre. Dépliée, chaque anomalie est montrée sur son
  pointage avec une explication en clair. Aucun calcul de treize heures n’est exécuté par ce lecteur.
- Aucun lien ne promet un écran de résolution dans ce périmètre ; il viendra avec cet écran.
- Un total incomplet sans valeur est normal ; un total annoncé complet sans valeur rejette la lecture,
  signalée une seule fois par l’adapter.

- Pour l'acquisition des données de la vue, appliquer la
  [règle de composition des lectures](../../../../../../documentation/architecture.md#acquire-a-view-through-one-read-port-by-default).
- **L'élément introuvable se reconnaît au statut 404, pas à une URN.** `CoutDeRevientExceptionAdvice`, côté
  back, rend un `ProblemDetail` **sans `type`** : `findApiErrorIn` ne trouve donc rien à traduire, et le
  moule employé par tous les autres adaptateurs du dépôt ne s'applique pas ici. Cette route n'a qu'un seul
  404 métier, ce qui rend le statut suffisant. Le jour où le back pose une URN, c'est elle qu'il faudra
  lire.
- **La liste aide à naviguer ; le rapport reste une consultation indépendante.** Les deux opérations du même
  port se chargent sans s’attendre et portent leurs propres erreurs et nouvelles tentatives. La liste complète
  reste acquise pendant le montage ; changer d’élément ne relit que son rapport. Le rapport réussi fournit
  l’identité courante en priorité. L’URL possède l’élément ; le panneau, la recherche et le détail restent
  éphémères. Seul un changement effectif d’identifiant ferme le détail.
- **La collection HTTP parcourt toutes les pages dans l’amplitude de création conventionnelle**, de
  `1970-01-01T00:00:00Z` à `2999-12-31T23:59:59Z`, sans filtrer un statut d’atelier. La taille effective et
  le total restent constants, les pages non finales sont pleines et les identifiants uniques. Une incohérence
  rejette toute l’acquisition et se signale une seule fois ; elle ne livre aucune liste partielle. Cette
  acquisition ne garantit pas un instantané transactionnel. Le 404 de collection est une panne technique.
- **La référence reste la désignation principale, avec le nom interne en second rang et le libellé lorsqu'il existe.**
  Le secondaire du même port relit la fiche par l'identifiant demandé après le rapport et contrôle la
  correspondance des identités. Un échec de cette lecture rejette toute la vue, signalé une seule fois.
  Ces lectures n'établissent pas d'instantané transactionnel ; aucun montant n'est reconstruit.
- **Le coût n'est pas séparé entre bon travail et non-conformité, et l'écran ne l'invente pas.** Seul le
  temps l'est. Le déduire au prorata du temps supposerait un tarif constant sur toute la ligne, ce que le
  parallélisme rend faux. C'est une évolution du back, pas un calcul de ce front.
- **Le détail d'une ligne justifie son coût sans le refaire.** Chaque pointage, chaque part et chaque calcul
  affiché (« 35,00 × 1,50 ÷ 2 = 26,25 € ») reprend des montants déjà arrondis par le serveur ; le pied du
  tableau reprend les totaux de la ligne, jamais une somme des pointages. Les heures décimales du calcul
  viennent de la durée reçue, à la minute.
- **Les montants s'affichent dans la monnaie du formateur, jamais avec un symbole en dur.** Le formatage
  vit dans `LibellesCoutDeRevient`, comme les dates et les durées.
- **Les instants s'affichent dans le fuseau du navigateur.** Les périodes du rapport sont des
  `java.time.Instant` sérialisés en UTC ; aucune configuration de ce front ne porte le fuseau de
  l'entreprise. Même limite connue et même arbitrage que `releve-des-heures`.
- Tous les mots affichés vivent dans `LibellesCoutDeRevient`, indexés par les valeurs du type. Aucun mot en
  dur dans un template.
