# Relevé des heures

Ce contexte appartient exclusivement à `gestion`. Il porte les **relevés hebdomadaires** qu'un gestionnaire
consulte sur une personne : le temps qu'elle a pointé sur les moules et les OF, et sa présence, jour par jour,
sur une semaine qu'il désigne.

Il est **purement lecteur**. Aucun acte, aucune écriture, aucun refus métier à traduire en geste : un relevé se
demande et s'affiche.

Son écran compose deux rapports du back : la **synthèse des heures**, source des durées, des éléments de la
semaine et du journal des pointages, et la **feuille de temps**, source des plages de présence et des intervalles
d'activité. C'est le même lecteur, la même semaine et le même vocabulaire, et c'est la raison pour laquelle ce
contexte ne porte le nom d'aucun des deux rapports. L'écran s'intitule **Temps opérationnel**. Le nom du
contexte, la route `/operateurs/:operateur/heures`, le composant `SyntheseDesHeures` et le port
`SyntheseDesHeuresPort` gardent leur nom : c'est toujours le relevé d'une personne sur une semaine, et le lien
partagé reste valide. Dans le code et les tests, le **relevé** désigne ce que l'écran compose, la **synthèse** la
seule route des durées.

## Langage

**Relevé** : ce que l'écran rend d'une personne sur une semaine, composé de la synthèse des heures et de la feuille
de temps. Le mot est celui du back — « ce relevé n'est ni une feuille de paie ni un rapport de paie ».

**Temps opérationnel** : le temps pointé sur les éléments, plusieurs pouvant courir en même temps. C'est le mot du
client et le chiffre principal de l'écran ; le back dit « temps effectif ». C'est un **cumul par élément** : une
heure passée sur deux éléments compte deux fois, si bien que le temps opérationnel d'une semaine dépasse
couramment la présence. L'écran le dit (« pointé sur les moules et OF ») pour que personne ne le compare à la
présence.

**Élément** : un moule (`PRODUIT` dans le code du back) ou un OF (`ORDRE_DE_FABRICATION`) sur lequel une personne
pointe. L'écran affiche « Moule » ou « OF ». Son **numéro** est sa référence, sinon son nom ; sa description est
le libellé qu'on lui donne. On dit « élément », jamais « produit ».

**Intervalle d'activité** : mot du back. Un temps pointé par une personne sur un élément, éventuellement depuis un
poste et pour une nature, de catégorie `TRAVAIL` ou `NON_CONFORMITE`. Sans fin, il est en cours. Il est
**présumé** quand il repose sur une fin de journée présumée.

**Synthèse des heures** : le rapport des durées **opérationnelles et de présence**, pointées et présumées, par jour,
par élément et pour la semaine, des éléments de la semaine et du journal brut des pointages. Il expose du temps
sans en être une pièce de paie : aucun montant, aucune heure supplémentaire.

**Feuille de temps** : le rapport de ce qui se dessine : les **plages** de présence et les **intervalles d'activité**
de chaque jour, déjà ramenés par le back au jour qui les porte.

**Journée de travail** : une venue, de l'arrivée au départ, qui peut passer minuit. C'est le terme du back
(« journée abandonnée », « journée de durée nulle ») ; on ne dit pas « venue ».

**Semaine ISO** : une année et un numéro. L'année est celle **des semaines**, pas celle du calendrier : la
semaine 1 de 2026 commence le 29 décembre 2025. C'est la seule définition qui donne toujours sept jours pleins,
et celle que le client lit sur ses plannings.

**Jour calendaire** : une date sans fuseau, telle que le back la rend, dans le fuseau de l'entreprise. Ce n'est
pas un instant : c'est minuit qui décide à quel jour appartient une heure de travail, et minuit n'existe
qu'une fois la zone connue — le back la connaît, ce contexte la reçoit.

**Durée travaillée** : une durée rendue par le serveur, temps opérationnel ou présence. Jamais une somme faite ici.

**Durée pointée** et **durée présumée** : deux durées travaillées, jamais fondues. La première repose sur des
pointages ; la seconde est le temps d'une journée abandonnée entre l'arrivée et sa fin présumée, à confirmer par
une régularisation avant la paie.

**Amplitude maximale** : le seuil, paramétré par entreprise, au-delà duquel une journée de travail sans départ est
**abandonnée**. Le back la ferme alors à sa fin présumée : son dernier fait connu.

**Plage** : une fenêtre de présence, de l'arrivée au départ, **pause comprise** : la pause n'est plus un événement de
présence. Sans fin, la personne est encore là. Une **plage présumée** est la fin d'une journée abandonnée.

**Pointage** : un événement du journal du jour et l'heure métier à laquelle il a eu lieu. Un **pointage de
présence** est une `ARRIVEE` ou un `DEPART`. Un **pointage d'élément** est un `DEBUT`, une `NON_CONFORMITE` ou une
`FIN`, et porte l'élément et, s'il y en a un, le poste.

**Pause** : un geste du pupitre, pas une notion de ce contexte. Il émet des fins d'élément, et la reprise des
débuts : le relevé n'en montre que ces pointages d'élément. Il n'y a ni pause, ni reprise, ni « hors pause » à lire,
à dessiner ou à compter.

**Effet** : ce que change un pointage de présence. Un départ **clôt** les éléments qu'aucune fin pointée ne
termine à cet instant. Un pointage d'élément n'a aucun effet.

**Jour ouvert** : le jour que la frise élargit, heure par heure, et dont le journal est lu sous elle.

**Frise** : la semaine dessinée, une ligne par élément, sept colonnes du lundi au dimanche. **Journal du jour** : tous
les pointages du jour ouvert, présence et éléments mêlés, dans l'ordre du serveur.

**Semaine demandée** : ce que l'URL désigne. Elle est **connue** quand elle nomme une semaine que le calendrier
porte, **refusée** sinon. Absente, elle vaut la semaine en cours.

## Modèle de domaine

- **ReleveDesHeures** : agrégat racine. Il porte l'identité de l'opérateur que le rapport a résolue, ses sept
  jours, ses éléments, les totaux opérationnel et de présence, pointés et présumés. Il reçoit la semaine pour
  vérifier qu'il la couvre, mais ne la conserve pas : c'est l'écran, et son URL, qui savent quelle semaine est
  consultée. Il refuse un intervalle ou un pointage qui désigne un élément absent de ses éléments.
- **SemaineISO** : Value Object de la semaine. Il sait combien de semaines une année porte, quel lundi l'ouvre,
  quelle semaine la précède et laquelle la suit, et quelle semaine contient un jour donné.
- **JourCalendaire** : Value Object d'une date `AAAA-MM-JJ`, refusée si le calendrier ne la porte pas. Il sait
  se déplacer d'un nombre de jours, nommer son jour de la semaine et se reconnaître aujourd'hui.
- **DureeTravaillee** : Value Object d'une durée ISO-8601, exprimée en heures et minutes. `estNulle()` la juge à la
  minute près, comme elle s'affiche.
- **JourDeReleve** : Value Object d'un jour du relevé — sa date, sa durée opérationnelle pointée et présumée, sa
  présence pointée et présumée, ses pointages, ses plages et ses intervalles. `estVide()` : ni pointage, ni plage,
  ni intervalle. `effetDe(pointage)` dit ce qu'un pointage de présence change ; `vientDeLaVeille()` reconnaît une
  plage qu'aucun pointage du jour n'a ouverte.
- **ElementDuReleve** : Value Object d'un élément de la semaine — identifiant, type, nom, référence et description
  facultatives, couples poste et nature, durée, durée de non-conformité et durée présumée de la semaine.
- **IntervalleDActivite** : Value Object d'un intervalle lu dans la feuille de temps — son élément, son poste et sa
  nature facultatifs, sa catégorie, son début, sa fin facultative et `presumee`. Refusé présumé sans fin, ou
  finissant avant de commencer.
- **PointageDeReleve** : union discriminée d'un pointage. Le pointage de présence porte son type et son instant ;
  le pointage d'élément y ajoute l'élément et le poste facultatif. Pas de champ `never`.
- **PlageDeReleve** : Value Object d'une plage lue dans la feuille de temps — son début, sa fin facultative et
  `presumee`. Refusée présumée sans fin, ou finissant avant de commencer ; une fin égale au début est acceptée.
- **TypeDePointage** : union des cinq types du journal.
- **EffetDePointage** : ce qu'un pointage de présence change, dont les éléments qu'un départ clôt.
- **JourOuvert** : traduit `?jour=`, la semaine, le relevé et aujourd'hui en un jour ouvert, aucun jour, ou une
  adresse refusée.
- **InstantDeReleve** : Value Object d'un instant reçu du back, refusé s'il n'est pas un instant absolu. Les
  instants se comparent entre eux, jamais par leurs libellés.
- **IdentiteOperateur** : Value Object du nom et du prénom que le rapport a résolus au référentiel.
- **OperateurReleveId** : Value Object de l'identifiant de l'opérateur, opaque à ce contexte.
- **SemaineDemandee** : traduit ce que porte l'URL, plus le jour courant, en une semaine connue ou refusée.
- **SyntheseDesHeuresPort** : port secondaire de lecture du relevé, composé des deux rapports du back.

## Responsabilités et invariants

- **Le front n'additionne aucune durée.** Toutes les durées viennent du serveur : par jour, par élément et par
  semaine, opérationnelles et de présence, pointées et présumées. Elles sont affichées telles quelles ; aucune
  n'est dérivée d'une plage ou d'un intervalle. Recalculer donnerait à l'écran un second avis sur les heures d'une
  personne, et c'est le serveur qui possède cette arithmétique. Un intervalle en cours ne compte encore rien, comme
  une plage ouverte.
- **Une année porte 52 ou 53 semaines, et ce contexte le sait.** Une semaine que l'année ne porte pas est
  refusée à la construction. Le back, lui, l'accepte en silence et bascule sur l'année suivante : demander la
  semaine 53 de 2025 lui fait rendre la première semaine de 2026 sans lever la moindre erreur. C'est la raison
  d'être de cette garde, et l'adaptateur la double en vérifiant que la semaine rendue est celle demandée.
- **Un relevé compte toujours sept jours**, du lundi au dimanche, vides comprises. Un trou obligerait le lecteur
  à deviner s'il manque une journée ou si la personne n'était pas là. Une réponse qui n'en porte pas sept est
  refusée.
- **Un jour vide et un jour à durée nulle sont deux faits différents.** Le premier affiche l'absence de
  pointage, le second affiche `0 h 00`. Une journée de durée nulle — arrivée et départ au même instant — a deux
  pointages et aucune plage : la feuille de temps jette les fenêtres vides. Un jour entièrement couvert par une
  présence de plus de vingt-quatre heures a une plage et aucun pointage. Aucun des deux n'est vide. Un jour
  vide s'ouvre comme les autres et affiche un état vide bien visible.
- **La durée présumée ne se montre que non nulle**, et toujours à part de la durée pointée. La présence présumée
  se signale (hachure ou bord pointillé), à part du pointé.
- **Les pointages ne sont jamais réordonnés.** Le serveur promet l'ordre du journal : à instant égal, l'arrivée,
  les pointages d'élément dans l'ordre du journal, le départ. Les éléments arrivent par première apparition dans
  la semaine, puis par nom ; les intervalles d'un jour par début, puis par identifiant d'élément. Retrier côté
  client demanderait d'interpréter des décalages horaires que ce contexte n'a pas.
- **Le journal du jour contient aussi les pointages d'élément faits hors de toute journée de présence.** Le back
  écarte leur activité, pas leur pointage : il s'affiche dans le journal et comme marqueur isolé, sans aucune barre,
  et sans « non compté » — l'écartement est une règle du back. Le relevé peut donc montrer moins de temps que le
  suivi d'un élément (`temps-effectif`) : ce n'est pas une erreur.
- **Les plages et les intervalles viennent de la feuille de temps ; les chiffres, de la synthèse.** Le front
  n'apparie aucun pointage en plage ou en intervalle : le back sait déjà couper à minuit, borner à la semaine et
  fermer une journée abandonnée. Les événements annulés sont exclus, un événement corrigé compte sous sa
  correction ; un geste absorbé n'est jamais dans le journal.
- **Les références sont complètes** : `elements` contient tout élément qui porte un intervalle ou un pointage dans
  la semaine, et chaque poste d'un intervalle ou d'un pointage figure dans les postes de son élément. Sinon la
  donnée est incohérente, le relevé est refusé et l'écran affiche une erreur : sur un relevé de temps, un dessin
  faux et silencieux est pire qu'une erreur visible.
- **Les bornes d'un intervalle sont les instants mêmes des pointages** — début, non-conformité, fin, départ — sauf à
  minuit, aux bornes de la semaine, à une fin présumée et à la clôture du suivi par le gestionnaire. C'est ce qui
  permet de dire qu'un départ clôt tel élément, en rapprochant des instants. Une fin sans pointage à cet instant
  n'a **aucun marqueur** : l'énoncé et l'infobulle de la barre disent « arrêté sans fin pointée », car le front
  ne connaît pas la cause et ne dit pas « clôture ».
- **Un départ clôt les éléments qu'aucune fin pointée ne termine à cet instant** : « clôt Moule 1022, sans fin
  pointée ». Un départ qu'aucune plage ne termine — la journée abandonnée de la règle D13 du back (glm-back #61) :
  sa plage se ferme à sa fin présumée, et son départ, qui compte parmi « ses faits au-delà », n'en ferme aucune —
  reste un simple pointage de départ : il ne clôt aucun élément et ne dessine rien. Seul un pointage de présence
  a un effet ; relance et retour de non-conformité sont des règles de rejeu du back.
- **Une plage ou un intervalle sans fin est en cours, il se marque et ne s'étire pas.** C'est l'état normal d'une
  journée sous l'amplitude maximale, jamais une anomalie. Dessiner une barre jusqu'à maintenant inventerait du
  temps, et le domaine n'a d'ailleurs pas le droit de lire l'horloge. Le back ne coupe pas une plage ouverte à
  minuit : elle reste sur son jour de début. Une journée abandonnée, elle, arrive close, avec une fin présumée.
  Un intervalle en cours n'est pas rafraîchi : la lecture est unique et le rechargement du navigateur suffit.
- **Un intervalle qui finit avant de commencer, ou présumé sans fin, est refusé**, comme une plage : une donnée
  incohérente est une erreur visible, jamais un dessin.
- **Les intervalles contigus du même élément et du même poste** — travail, non-conformité, travail, relance — se
  dessinent bout à bout, sans coupure ; la hachure de non-conformité et le marqueur du jour ouvert montrent la
  jonction. Chaque intervalle garde son énoncé.
- **Un élément travaillé depuis deux postes à la fois** se dédouble en sous-lignes par poste, seulement quand deux
  de ses intervalles se chevauchent ; le dédoublement vaut alors pour toute la semaine, chaque intervalle se
  dessinant sur la sous-ligne de son poste, un intervalle sans poste sur une sous-ligne « Sans poste ». Le total
  reste unique, sur la ligne de l'élément : le back ne rend aucune durée par poste et le front n'additionne rien.
- **Un élément sans aucune barre a sa ligne**, total « 0 h », avec ses marqueurs isolés dans le jour ouvert : le
  masquer ferait citer au journal un élément absent de la frise.
- **Limite acceptée : l'instant de lecture décide de l'abandon.** Les deux rapports sont lus à des instants
  différents et peuvent se contredire — une plage ou un intervalle présumé d'un côté, un présumé nul de l'autre.
  Aucun instantané cohérent n'est cherché entre eux.
- **Un opérateur inconnu du référentiel est une réponse, pas une panne.** Le port rend l'absence, l'écran
  l'explique, et `ErrorHandlerPort` n'est pas dérangé. Inconnu d'un seul des deux rapports, il l'emporte sur une
  panne de l'autre : la réponse est vraie et stable, et un nouvel essai ne la changerait pas.
- **La semaine en cours et le jour d'aujourd'hui se déduisent d'un jour fourni**, jamais d'une horloge lue par le
  domaine. L'instant vient du primaire.
- Ce contexte ne dépend d'aucun contexte de `pupitre` et ne partage aucun modèle métier avec lui.

## Relations de contexte

- `operateur` possède le référentiel des personnes. **Ce contexte ne l'importe pas** : il déclare son propre
  identifiant et reçoit du rapport lui-même le nom et le prénom à afficher. Le lien entre les deux écrans est
  un `routerLink` vers `/operateurs/<id>/heures`, jamais un import.
- Le back découpe ces relevés en deux bounded contexts, `feuilledetemps` et `syntheseheures`, parce qu'ils
  rejouent chacun leur propre lecture. Ce front n'en fait qu'un : le vocabulaire est un, l'acteur est un, et
  dupliquer `SemaineISO` et `DureeTravaillee` dans deux contextes qui ne peuvent pas s'importer ferait payer au
  front un découpage qui n'est pas le sien. `HttpSyntheseDesHeures` compose donc les deux lectures derrière le seul
  `SyntheseDesHeuresPort` : l'écran ignore combien de routes il y a derrière.
- **Le domaine rapproche les instants des deux rapports** et s'appuie sur une garantie du back : les bornes d'une
  plage ou d'un intervalle sont les instants mêmes des pointages, sauf minuit, les bornes de la semaine, une fin
  présumée et la clôture du suivi par le gestionnaire. C'est elle qui fait d'une plage qu'aucun pointage n'a
  ouverte une plage venue de la veille, et d'un départ la clôture des éléments qu'aucune fin pointée ne termine.
  Un changement de cette garantie — bornes arrondies, fenêtres rendues autrement — rompt le contrat de
  ce contexte.

## Règles locales

- Pour l'acquisition des données de la vue, appliquer la
  [règle de composition des lectures](../../../../../../documentation/architecture.md#acquire-a-view-through-one-read-port-by-default).
- **Le matricule n'est pas affiché.** `RestSyntheseDesHeures.operateur` ne porte que `id`, `nom` et `prenom` —
  c'est d'ailleurs le seul bloc du contrat à déclarer des champs obligatoires. Aller chercher le matricule
  demanderait une seconde lecture du référentiel pour une donnée facultative : à rouvrir si le besoin se
  confirme, pas avant.
- **L'URL est l'état de la vue.** L'année, la semaine et le jour ouvert ne vivent que dans la query string
  (`?jour=AAAA-MM-JJ`) ; le composant ne garde aucun signal de semaine ou de jour, et chaque contrôle de navigation
  est un geste qui navigue : les en-têtes de jour, jours vides compris, sont des liens, et le retour du
  navigateur revient au jour précédent. Un lien se partage donc tel quel. Les liens de semaine précédente et
  suivante n'emportent pas de jour. Un `jour` illisible ou hors de la semaine est une **adresse refusée**, comme
  une semaine refusée, sans requête.
- **Une adresse sans semaine désigne la semaine en cours, une adresse sans jour un jour déduit, et ni l'une ni
  l'autre n'est réécrite.** C'est ce que veut le lien posé sur l'écran des opérateurs : « le temps de cette
  personne, cette semaine ». La réécrire demanderait un `effect()`, que la politique de lint du dépôt refuse, et
  figerait un lien que l'on voulait justement vivant. Le jour déduit est aujourd'hui quand la semaine est celle en
  cours, **même vide** ; sinon le premier jour qui porte un pointage ; sur une semaine passée ou future vide,
  aucun. `aria-current` suit le jour déduit. Conséquence assumée : une adresse nue relue la semaine suivante
  montre la semaine suivante.
- **Le pointage sélectionné est un état local éphémère.** Aucun à l'ouverture ; effacé à tout changement de jour ou
  de semaine ; un second clic sur l'entrée sélectionnée la désélectionne (`aria-pressed` bascule). Il place un
  repère vertical à son instant dans la frise et entoure son marqueur, pour voir ce qui tournait à ce moment-là.
  Le journal est la seule commande de sélection : les marqueurs de la frise sont décoratifs (`aria-hidden`),
  trop denses pour des cibles de 44 px.
- **Les traits d'arrivée et de départ traversent toute la hauteur de la frise du jour ouvert**, fins, en `ink-muted`,
  plus discrets que le repère de sélection. Le □ porte la clôture d'un élément par un départ sans fin pointée.
  Marqueurs, traits et repères sont dessinés en pourcentage de l'axe du jour, pour que la largeur des colonnes reste
  l'affaire du CSS ; les marqueurs sont des formes CSS, sans icône.
- **L'axe d'un jour est ancré sur les heures de jour, de 6 h à 22 h**, pour que deux semaines se comparent
  et que l'étendue ne change pas sous les yeux du lecteur. Il s'ouvre sur le **jour entier** dès qu'une
  borne dessinée — plage, intervalle ou marqueur isolé — tombe en dehors, ou touche minuit : une équipe de nuit
  resterait invisible sur une fenêtre figée, et personne ne verrait qu'il manque quelque chose. Le back coupe à
  minuit : une fin datée du lendemain à 00:00 ferme le jour et vaut 1 440 minutes. Un axe déduit des pointages a
  été essayé puis écarté : il rendait deux semaines incomparables et sortait des heures de jour dès que
  l'étendue minimale de l'axe poussait sa fin au-delà de minuit.
- **Chaque jour porte son propre axe et le dit sous son nom**, par des repères courts : `8 h`, `14 h`, `20 h` sur les
  heures de jour ; `0 h`, `12 h`, `24 h` sur le jour entier. Les repères d'extrémité s'ancrent sur les bords de
  leur colonne : centrés comme les autres, leur moitié extérieure déborderait sur la colonne voisine, et le `24 h` d'un
  jour recouvrirait le `0 h` du suivant.
- **La frise tient sans défilement à 1024 px et défile horizontalement en dessous.** Le jour ouvert prend la plus
  grande part, les autres jours se resserrent, les jours vides plus encore, sauf un jour vide ouvert qui prend la
  largeur du jour ouvert. Un nom d'élément long (`OF-2026-000057` sans référence) se tronque par le CSS, jamais
  par le domaine.
- **Aucune couleur par élément** : chaque élément a sa ligne, et le design system n'a pas de palette catégorielle.
  Les barres sont en `accent`, la non-conformité en hachure `nc`, la présence en cadre discret ; les rôles existants
  seulement. Une palette par élément demanderait de nouveaux jetons et rouvrirait ce choix.
- **L'heure d'un pointage est affichée dans le fuseau du navigateur.** `dateDeSurvenue` est un
  `java.time.Instant` sérialisé en UTC : la tranche brute de la chaîne afficherait 06:02 pour un pointage de
  08:02 en France. Aucune configuration de ce front ne porte le fuseau de l'entreprise, et le navigateur du
  gestionnaire est le seul repère disponible — c'est déjà le choix de `supervision-atelier`. **Limite connue** :
  un gestionnaire consultant depuis un autre fuseau lit des heures décalées, alors que le découpage en jours,
  lui, reste celui de l'entreprise puisque le back l'a déjà fait. Minuit, lui aussi, se reconnaît dans le fuseau du
  navigateur — la fin à 1 440 minutes, « se poursuit », l'ouverture de l'axe, la colonne d'aujourd'hui : hors du
  fuseau de l'entreprise, un poste de nuit se dessine faux. Un fuseau d'entreprise configuré est la seule vraie
  réponse ; elle n'est pas de ce lot.
- Un instant sans fuseau est refusé à la construction plutôt que réinterprété en heure locale : sur un relevé
  qui alimente la paie, un décalage silencieux est le pire des résultats.
- Consulter l'[ADR 0038](../../../../../../documentation/adr/0038-hold-view-state-in-the-url.md)
  pour l’état de vue porté par l’URL.
- Tous les mots affichés vivent dans `LibellesReleveDesHeures`, indexés par les valeurs du type de pointage et du
  type d'élément. Aucun mot en dur dans un template.
- Chaque ligne et chaque jour portent un énoncé `sr-only` (« Moule 1015, lundi 21, 07:05 à 12:00, travail »).
  Les cibles font au moins 44 px.
