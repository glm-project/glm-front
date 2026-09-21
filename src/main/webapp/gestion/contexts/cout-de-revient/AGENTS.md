# Coût de revient

Ce contexte appartient exclusivement à `gestion`. Il porte le **rapport de coût de revient** qu'un
gestionnaire consulte sur un élément de fabrication : ce que sa fabrication a coûté, et le temps qui y a
été passé, ligne par ligne.

Il est **purement lecteur**. Aucun acte, aucune écriture, aucun refus métier à traduire en geste : un
rapport se demande et s'affiche.

## Langage

**Coût de revient** : ce que la fabrication d'un élément a coûté. Le mot est celui du back et celui du
client. Le rapport n'est **jamais stocké** : il est recalculé à chaque lecture depuis les journaux de
l'atelier, pour qu'une saisie régularisée après coup compte à l'heure où le travail a eu lieu.

**Élément chiffré** : l'élément de fabrication dont le coût est lu, relu au référentiel à chaque appel.
Réduit à son nom et à son type — c'est tout ce que la route rend.

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
  total et son coût total. `estSansTravail()` distingue un élément sur lequel rien n'a été pointé.
- **ElementChiffre** : Value Object du nom et du type de l'élément que le rapport a résolus.
- **ElementChiffreId** : Value Object de l'identifiant de l'élément, opaque à ce contexte.
- **TypeDElementChiffre** : union des deux valeurs du type, structurellement compatible avec l'énum de
  l'API.
- **LigneDeCout** : Value Object d'une ligne — sa nature éventuelle, sa période, son temps passé, son coût
  et ses périodes de non-conformité datées. `estSansPoste()` distingue la ligne sans nature.
- **NatureDOperation** : Value Object du métier d'une ligne, non vide.
- **TempsPasse** : Value Object du temps, séparé en bon travail et non-conformité, avec son total.
  `porteUneNonConformite()` répond à « y a-t-il eu une reprise ».
- **DureePassee** : Value Object d'une durée ISO-8601, exprimée en heures et minutes.
- **PeriodeDeTravail** : Value Object d'un intervalle borné à ses deux extrémités.
- **InstantDeTravail** : Value Object d'un instant reçu du back, refusé s'il n'est pas un instant absolu.
- **Cout** : Value Object du coût, séparé en machine et main d'œuvre, avec son total.
- **Montant** : Value Object d'une valeur en euros, finie et jamais négative.
- **CoutDeRevientPort** : port secondaire de lecture du rapport.

## Responsabilités et invariants

- **Le front n'additionne ni durée ni montant.** Le temps total et le coût total sont lus du serveur et
  affichés tels quels ; les lignes ne sont jamais sommées. Le contrat le dit lui-même : « le total est la
  somme des lignes déjà arrondies, il vaut donc exactement ce que l'écran affiche ». Resommer côté client
  donnerait à l'écran un second avis sur ce qu'une fabrication a coûté, et en ferait un avis faux dès le
  premier arrondi.
- **Les lignes ne sont jamais réordonnées.** Le serveur promet les natures dans l'ordre et la ligne sans
  nature en dernier. La retrier ici demanderait de rejouer un ordre que ce contexte ne possède pas.
- **Une ligne sans nature est le cas nominal**, pas un cas dégradé : c'est ce que produit une entreprise
  sans parc machine, dont l'opérateur reste payé. Elle s'affiche, et son coût machine vaut zéro.
- **Un rapport vide est une réponse.** Un élément engagé sur lequel personne n'a encore pointé rend zéro
  ligne, un temps nul et un coût nul. L'écran l'explique ; ce n'est ni une panne ni une absence.
- **Un élément inconnu du référentiel est une réponse, pas une panne.** Le port rend l'absence, l'écran
  l'explique, et `ErrorHandlerPort` n'est pas dérangé.
- **Machine et main d'œuvre ne s'agrègent pas de la même façon, et l'écran ne le cache pas.** Le coût
  horaire de chaque poste actif court **en entier**, même quand l'opérateur en mène plusieurs de front ;
  le taux horaire de l'opérateur, lui, est **divisé** par le nombre de postes qu'il occupait à cet
  instant, tous éléments confondus. Les afficher séparément est ce qui rend la règle lisible ; les fondre
  en un seul chiffre la rendrait incompréhensible le jour où quelqu'un la vérifie à la main.
- **Le rapport est celui de l'élément, pas d'un passage en atelier.** Un élément réengagé après clôture
  additionne ses passages : plusieurs lignes de l'écran `/atelier` mènent donc au même rapport, et c'est
  le comportement voulu.
- Ce contexte ne dépend d'aucun contexte de `pupitre` et ne partage aucun modèle métier avec lui.

## Relations de contexte

- `atelier` possède les suivis. **Ce contexte ne l'importe pas** : il déclare son propre identifiant
  d'élément et reçoit du rapport lui-même le nom et le type à afficher. Le lien entre les deux écrans est
  un `routerLink` vers `/couts-de-revient/<id>`, jamais un import.
- `element-de-fabrication` possède le référentiel. Même règle : aucun import, aucune lecture croisée.
- Le back découpe ce rapport dans son propre bounded context `coutderevient`, qui rejoue les journaux de
  l'atelier et de la présence sans les importer. Ce front fait de même.

## Règles locales

- Pour l'acquisition des données de la vue, appliquer la
  [règle de composition des lectures](../../../../../../documentation/architecture.md#acquire-a-view-through-one-read-port-by-default).
- **L'élément introuvable se reconnaît au statut 404, pas à une URN.** `CoutDeRevientExceptionAdvice`, côté
  back, rend un `ProblemDetail` **sans `type`** : `findApiErrorIn` ne trouve donc rien à traduire, et le
  moule employé par tous les autres adaptateurs du dépôt ne s'applique pas ici. Cette route n'a qu'un seul
  404 métier, ce qui rend le statut suffisant. Le jour où le back pose une URN, c'est elle qu'il faudra
  lire.
- **Ni la référence ni le libellé de l'élément ne sont affichés.** `RestElement` ne porte que `id`, `nom`
  et `type`. Aller chercher la référence demanderait une seconde lecture du référentiel pour une donnée
  facultative : à rouvrir si le besoin se confirme, pas avant. Même arbitrage que le matricule dans
  `releve-des-heures`.
- **Le coût n'est pas séparé entre bon travail et non-conformité, et l'écran ne l'invente pas.** Seul le
  temps l'est. Le déduire au prorata du temps supposerait un tarif constant sur toute la ligne, ce que le
  parallélisme rend faux. C'est une évolution du back, pas un calcul de ce front.
- **Il n'y a pas de détail par opérateur.** `mainDOeuvre` est un agrégat ; le rapport ne porte ni liste
  d'opérateurs, ni coût, ni temps par personne.
- **Les montants s'affichent dans la monnaie du formateur, jamais avec un symbole en dur.** Le formatage
  vit dans `LibellesCoutDeRevient`, comme les dates et les durées.
- **Les instants s'affichent dans le fuseau du navigateur.** Les périodes du rapport sont des
  `java.time.Instant` sérialisés en UTC ; aucune configuration de ce front ne porte le fuseau de
  l'entreprise. Même limite connue et même arbitrage que `releve-des-heures`.
- Tous les mots affichés vivent dans `LibellesCoutDeRevient`, indexés par les valeurs du type. Aucun mot en
  dur dans un template.
