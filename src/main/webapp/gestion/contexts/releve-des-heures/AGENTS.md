# Relevé des heures

Ce contexte appartient exclusivement à `gestion`. Il porte les **relevés hebdomadaires** qu'un gestionnaire
consulte sur une personne : ce qu'elle a travaillé, jour par jour, sur une semaine qu'il désigne.

Il est **purement lecteur**. Aucun acte, aucune écriture, aucun refus métier à traduire en geste : un relevé se
demande et s'affiche.

Il porte aujourd'hui la **synthèse des heures** (durées travaillées et journal des pointages). La **feuille de
temps** (plages de présence) le rejoindra : c'est le même lecteur, la même semaine et le même vocabulaire, et
c'est la raison pour laquelle ce contexte ne porte le nom d'aucun des deux rapports.

## Langage

**Relevé** : ce qu'un rapport hebdomadaire rend d'une personne sur une semaine. Le mot est celui du back — « ce
relevé n'est ni une feuille de paie ni un rapport de paie ».

**Synthèse des heures** : le relevé des **durées travaillées**, jour par jour, pauses exclues, accompagné du
journal brut des pointages. Il expose du temps pour alimenter la paie **sans en être une pièce** : aucun
montant, aucune heure supplémentaire.

**Semaine ISO** : une année et un numéro. L'année est celle **des semaines**, pas celle du calendrier : la
semaine 1 de 2026 commence le 29 décembre 2025. C'est la seule définition qui donne toujours sept jours pleins,
et celle que le client lit sur ses plannings.

**Jour calendaire** : une date sans fuseau, telle que le back la rend, dans le fuseau de l'entreprise. Ce n'est
pas un instant : c'est minuit qui décide à quel jour appartient une heure de travail, et minuit n'existe
qu'une fois la zone connue — le back la connaît, ce contexte la reçoit.

**Durée travaillée** : un temps de travail effectif, pauses déduites. Jamais l'amplitude de la venue.

**Pointage** : un événement du journal de présence — `ARRIVEE`, `PAUSE`, `REPRISE` ou `DEPART` — et l'heure
métier à laquelle il a eu lieu.

**Semaine demandée** : ce que l'URL désigne. Elle est **connue** quand elle nomme une semaine que le calendrier
porte, **refusée** sinon. Absente, elle vaut la semaine en cours.

## Modèle de domaine

- **ReleveDesHeures** : agrégat racine. Il porte l'identité de l'opérateur que le rapport a résolue, ses sept
  jours et sa durée totale. Il reçoit la semaine pour vérifier qu'il la couvre, mais ne la conserve pas : c'est
  l'écran, et son URL, qui savent quelle semaine est consultée.
- **SemaineISO** : Value Object de la semaine. Il sait combien de semaines une année porte, quel lundi l'ouvre,
  quelle semaine la précède et laquelle la suit, et quelle semaine contient un jour donné.
- **JourCalendaire** : Value Object d'une date `AAAA-MM-JJ`, refusée si le calendrier ne la porte pas. Il sait
  se déplacer d'un nombre de jours et nommer son jour de la semaine.
- **DureeTravaillee** : Value Object d'une durée ISO-8601, exprimée en heures et minutes.
- **JourDeReleve** : Value Object d'un jour du relevé — sa date, sa durée travaillée et ses pointages.
  `estSansPointage()` distingue un jour vide d'un jour à durée nulle.
- **PointageDeReleve** : Value Object d'un pointage — son type et son instant.
- **PlageDeReleve** : Value Object d'un intervalle lu dans le journal — une présence, ou la pause qui la coupe.
  `fin` manque quand le dernier pointage du jour n'a pas été refermé.
- **TypeDePointage** : union des quatre types du journal de présence.
- **InstantDeReleve** : Value Object d'un instant reçu du back, refusé s'il n'est pas un instant absolu.
- **IdentiteOperateur** : Value Object du nom et du prénom que le rapport a résolus au référentiel.
- **OperateurReleveId** : Value Object de l'identifiant de l'opérateur, opaque à ce contexte.
- **SemaineDemandee** : traduit ce que porte l'URL, plus le jour courant, en une semaine connue ou refusée.
- **SyntheseDesHeuresPort** : port secondaire de lecture de la synthèse.

## Responsabilités et invariants

- **Le front n'additionne aucune durée.** La durée totale est lue du serveur et affichée telle quelle ; les sept
  durées journalières ne sont jamais sommées. Recalculer donnerait à l'écran un second avis sur les heures
  d'une personne, et c'est le serveur qui possède cette arithmétique.
- **Une année porte 52 ou 53 semaines, et ce contexte le sait.** Une semaine que l'année ne porte pas est
  refusée à la construction. Le back, lui, l'accepte en silence et bascule sur l'année suivante : demander la
  semaine 53 de 2025 lui fait rendre la première semaine de 2026 sans lever la moindre erreur. C'est la raison
  d'être de cette garde, et l'adaptateur la double en vérifiant que la semaine rendue est celle demandée.
- **Un relevé compte toujours sept jours**, du lundi au dimanche, vides comprises. Un trou obligerait le lecteur
  à deviner s'il manque une journée ou si la personne n'était pas là. Une réponse qui n'en porte pas sept est
  refusée.
- **Un jour sans pointage et un jour à durée nulle sont deux faits différents.** Le premier affiche l'absence de
  pointage, le second affiche `0 h 00`. Quelqu'un qui pointe son arrivée et son départ dans la même minute ne
  doit pas avoir l'air absent.
- **Les pointages ne sont jamais réordonnés.** Le serveur promet l'ordre des heures ; les retrier côté client
  demanderait d'interpréter des décalages horaires que ce contexte n'a pas.
- **La frise dessine le journal ; les chiffres restent ceux du serveur.** La route de la synthèse ne rend
  aucune plage de présence — c'est la feuille de temps qui les porte — donc les intervalles dessinés sont
  appariés ici, à partir des pointages. **Aucune durée n'en est dérivée** : la colonne « Travaillé » et le total
  viennent du back, et c'est ce qui empêche cet appariement de devenir un second avis sur les heures d'une
  personne.
- **Une plage encore ouverte se marque, elle ne s'étire pas.** Le dernier pointage d'un jour en cours n'a pas de
  fin ; dessiner une barre jusqu'à maintenant inventerait du temps, et le domaine n'a d'ailleurs pas le droit de
  lire l'horloge. Un repère, et le journal dit le reste.
- **Tout pointage referme l'intervalle ouvert.** Un journal incohérent produit donc un dessin approximatif
  plutôt que rien, et le journal du jour reste affiché tel quel — c'est lui la vérité. Le back valide tout le
  journal à chaque écriture ; le cas n'est pas censé arriver.
- **Un opérateur inconnu du référentiel est une réponse, pas une panne.** Le port rend l'absence, l'écran
  l'explique, et `ErrorHandlerPort` n'est pas dérangé.
- **La semaine en cours se déduit d'un jour fourni**, jamais d'une horloge lue par le domaine. L'instant vient
  du primaire.
- Ce contexte ne dépend d'aucun contexte de `pupitre` et ne partage aucun modèle métier avec lui.

## Relations de contexte

- `operateur` possède le référentiel des personnes. **Ce contexte ne l'importe pas** : il déclare son propre
  identifiant et reçoit du rapport lui-même le nom et le prénom à afficher. Le lien entre les deux écrans est
  un `routerLink` vers `/operateurs/<id>/heures`, jamais un import.
- Le back découpe ces relevés en deux bounded contexts, `feuilledetemps` et `syntheseheures`, parce qu'ils
  rejouent chacun leur propre lecture de la présence. Ce front n'en fait qu'un : le vocabulaire est un, l'acteur
  est un, et dupliquer `SemaineISO` et `DureeTravaillee` dans deux contextes qui ne peuvent pas s'importer
  ferait payer au front un découpage qui n'est pas le sien.

## Règles locales

- Pour l'acquisition des données de la vue, appliquer la
  [règle de composition des lectures](../../../../../../documentation/architecture.md#acquire-a-view-through-one-read-port-by-default).
- **Le matricule n'est pas affiché.** `RestSyntheseDesHeures.operateur` ne porte que `id`, `nom` et `prenom` —
  c'est d'ailleurs le seul bloc du contrat à déclarer des champs obligatoires. Aller chercher le matricule
  demanderait une seconde lecture du référentiel pour une donnée facultative : à rouvrir si le besoin se
  confirme, pas avant.
- **L'URL est l'état de la vue.** L'année et la semaine ne vivent que dans la query string ; le composant ne
  garde aucun signal de semaine, et chaque contrôle de navigation est un geste qui navigue. Un lien se partage
  donc tel quel.
- **Une adresse sans semaine désigne la semaine en cours**, et elle n'est pas réécrite. C'est ce que veut le lien
  posé sur l'écran des opérateurs : « les heures de cette personne, cette semaine ». La réécrire demanderait un
  `effect()`, que la politique de lint du dépôt refuse, et figerait un lien que l'on voulait justement vivant.
  Conséquence assumée : une adresse nue relue la semaine suivante montre la semaine suivante.
- **L'axe de la frise se déduit des pointages de la semaine**, jamais figé de 6 h à 22 h : une équipe de nuit
  tomberait hors d'une fenêtre figée sans que personne ne voie qu'il manque quelque chose. Dès qu'une plage
  franchit minuit, l'axe couvre la journée entière et la plage se dessine en deux morceaux — le jour auquel une
  heure appartient est celui que le back a tranché, pas celui de l'horloge.
- **L'heure d'un pointage est affichée dans le fuseau du navigateur.** `dateDeSurvenue` est un
  `java.time.Instant` sérialisé en UTC : la tranche brute de la chaîne afficherait 06:02 pour un pointage de
  08:02 en France. Aucune configuration de ce front ne porte le fuseau de l'entreprise, et le navigateur du
  gestionnaire est le seul repère disponible — c'est déjà le choix de `supervision-atelier`. **Limite connue** :
  un gestionnaire consultant depuis un autre fuseau lit des heures décalées, alors que le découpage en jours,
  lui, reste celui de l'entreprise puisque le back l'a déjà fait. Un fuseau d'entreprise configuré est la seule
  vraie réponse ; elle n'est pas de ce lot.
- Un instant sans fuseau est refusé à la construction plutôt que réinterprété en heure locale : sur un relevé
  qui alimente la paie, un décalage silencieux est le pire des résultats.
- Consulter l'[ADR 0038](../../../../../../documentation/adr/0038-hold-view-state-in-the-url.md)
  pour l’état de vue porté par l’URL.
- Tous les mots affichés vivent dans `LibellesReleveDesHeures`, indexés par les valeurs du type de pointage.
  Aucun mot en dur dans un template.
