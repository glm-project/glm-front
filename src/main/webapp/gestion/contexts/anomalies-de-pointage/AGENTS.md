# Anomalies de pointage

Ce contexte de Gestion porte une seule décision du gestionnaire : placer la fin réelle d'une activité que le
serveur a arrêtée à son échéance faute de fin pointée. Les pointages incohérents ne sont plus des
anomalies : le serveur les ignore à la réception et ne les montre pas. Le calcul des activités, des durées
et des coûts reste au backend, selon l'[ADR 0047](../../../../../../documentation/adr/0047-count-only-finished-activities.md).

## Langage

- **Fin automatique** : activité arrêtée à son échéance faute de fin pointée. C'est l'unique anomalie de
  pointage : la liste n'a ni nature, ni onglet. Le coût de revient emploie « anomalie » au même sens, sans
  type partagé : les contextes restent isolés.
- **Clé** : opérateur, suivi (l'OF) et poste. Une clé porte au plus une activité en cours.
- **Liste** : les fins automatiques non régularisées (`GET /api/atelier/anomalies`, `RestPage<RestFinAutomatiqueEnListe>`).
  Une `LigneFinAutomatique` porte l'adresse du dossier, la désignation de l'élément, l'opérateur, le poste, le début
  et l'échéance, tels que reçus.
- **Adresse** : suivi et pointage ouvrant de l'activité échue (`AdresseDossier`), soit `/anomalies/:suivi?pointage=…`.
- **Dossier** (`DossierAnomalie`) : ce que le serveur rend pour une adresse, 200 pour une fin automatique non
  régularisée, 404 sinon. Il porte l'activité échue (`ActiviteEchue` : identifiant, ouvrant, catégorie, début,
  échéance), les pointages de sa clé (`journal`), `borneDeFin` s'il y en a une, la désignation de l'élément, et
  l'opérateur et le poste nommés. Deux identifiants restent distincts : l'adresse désigne le pointage ouvrant, la
  régularisation désigne l'activité (`ActiviteAnomalieId`).
- **Borne de fin** (`borneDeFin`) : le plus tôt du début suivant sur la clé et de la clôture du suivi ; absente
  quand rien ne borne la fin. Elle est reçue, jamais calculée par le front.
- **Régulariser la fin** : l'unique vue du dossier (`ResolutionDeFin`). Aucun autre acte n'existe : ni
  correction, ni annulation, ni aperçu, ni confirmation, ni reçu.
- **Poignée** : l'heure de fin que le gestionnaire place sur la frise ; une saisie qui émet un instant.
- **Cadre de la fin** (`CadreDeLaFin`) : Value Object qui rend les bornes de la poignée (voir « Poignée »).
- **Frise** : représentation, en présentation seule, de l'activité échue, du pointage qui l'ouvre, de la borne
  de fin et de la poignée sur une échelle de temps. Elle n'invente aucune fin ni aucune heure.
- **Saisie de régularisation** (`SaisieDeRegularisation`) : activité, heure et identifiant de la commande à envoyer.
- **Anomalie suivante** : bouton qui mène à une autre fin automatique de la liste après une régularisation.
- **Geste** : nom d'un pointage d'après le bouton du pupitre : « Démarrage », « Démarrage en NC », « Arrêt ».
  Gestion en possède les libellés et les aligne à la main sur le pupitre, qu'elle n'importe pas. « Action »
  n'a plus de sens ici.

## Responsabilités et invariants

### Liste

La liste vit sous `/anomalies`, gardée par `reservedToGestionnaire` ([authentification](../../../../../../documentation/authentication.md)).
Son état est dans l'adresse ([ADR 0038](../../../../../../documentation/adr/0038-hold-view-state-in-the-url.md)) :
`operateur`, `element` et `page`. Un `nature` d'un ancien lien est ignoré. Une page invalide n'émet aucune requête, pas
même celles des opérateurs et des éléments, et désactive les filtres. Chaque ligne ouvre son dossier en gardant
les paramètres de la liste ; « Retour aux anomalies » ramène aux mêmes filtres et à la même page.

Les filtres sont des brouillons jusqu'à « Filtrer », qui inscrit les choix dans l'adresse avec `page=1`.
`SelecteurOperateurAnomalie` et `SelecteurElementAnomalie` habillent `SelecteurRecherchable` (recherche sans accents,
entrée « Tous… »). L'adresse garde l'identifiant ; le champ ne l'affiche jamais et nomme « … non résolu (référence
actuelle) » une valeur que le référentiel ne contient pas. Opérateurs et éléments sont lus entiers (`collectAllPages`,
toutes les pages, aucune collection tronquée) à chaque ouverture de la liste, séparément : la panne de l'un
désactive son seul filtre (« … actuel conservé », « Réessayer » qui reste affiché et garde le focus) sans toucher à
l'autre filtre ni à la liste. La première lecture seule remplace le filtre par « Chargement… ».

Le sous-titre dit ce que la liste contient : « Activités arrêtées par la fin automatique : ouvrez un dossier pour
placer la fin réelle. » `?plusAucune=1`, écrit par « Anomalie suivante », affiche « Plus aucune anomalie » au-dessus
de la liste ; tout changement de filtre ou de page l'abandonne.

### Dossier

La page lit l'adresse, le dossier et les opérateurs (pour nommer l'opérateur quand le dossier ne le porte pas).
**Un dossier introuvable ramène à la liste**, sans écran intermédiaire ni avis : 404 `suivi-d-atelier-introuvable`
ou `fin-automatique-introuvable` (activité régularisée entre-temps, pointage qui n'est pas une fin automatique,
suivi disparu), ou adresse sans pointage. La navigation garde les filtres et la page, remplace l'entrée d'historique
(`replaceUrl`, sinon « Précédent » reviendrait au dossier qui redirigerait de nouveau), se fait dans le chargeur de
la lecture (pas d'`effect`, [ADR 0043](../../../../../../documentation/adr/0043-forbid-angular-effects-everywhere.md))
et n'a lieu que si la lecture n'est pas abandonnée (page quittée, adresse changée). Une panne technique n'est pas
un 404 : elle garde l'écran d'erreur avec « Réessayer ». Une adresse dont l'identifiant n'est pas un UUID reste
sur cet écran d'erreur.

L'en-tête de « Régulariser la fin » dit l'élément (désignation), l'opérateur · poste · début, puis la phrase du
problème : « Le travail démarré à 08:00 n'a jamais été arrêté : fin automatique à 18:00. » (« La non-conformité
démarrée… » en NC). Aucun identifiant n'est jamais affiché : « Opérateur non résolu », « Poste non résolu »,
« Sans poste ». Le domaine garde chaque instant en texte ISO ; le primaire l'affiche en heure locale par
`app/shared/date-format`. La page lit `now` une fois pour l'affichage ; `maintenant`, qui sert aux bornes, est relue
à chaque action.

Un lien « Voir la journée de … » mène au relevé des heures de l'opérateur, `/operateurs/{id}/heures?jour=AAAA-MM-JJ`,
au jour local du début de l'activité échue. Ce contexte ne calcule aucune semaine et n'importe rien du relevé.

### Poignée

La poignée se place en tirant le bout de la barre, en cliquant sur la frise (arrondi à 5 minutes) ou au clavier
(flèches : 1 minute, Maj : 15, Origine et Fin : aux bornes). Avant toute heure elle se tient « sans heure »
(« Heure ? ») sur la fin automatique : aucune heure n'est inventée, « Valider la fin » est inactif. Ses bornes
viennent de `CadreDeLaFin.depuis(dossier, maintenant)` :

- **minimum** : la première minute entière strictement après le début de l'activité ; le serveur refuse une
  fin qui n'est pas postérieure au début ;
- **maximum** : `min(maintenant, borneDeFin)`, soit le plus tôt de l'heure courante et de ce qui borne la fin.
  Elle peut dépasser l'échéance.

Les bornes sont des pré-contrôles : le serveur reste l'autorité (`fin-avant-debut`, `fin-apres-borne`,
`date-de-survenue-future`). Les instants se comparent comme instants (`InstantPointage`, nanosecondes
comprises), jamais comme chaînes. Quand le minimum dépasse le maximum, la poignée ne bouge pas.

### Frise

La frise (`glm-frise-dossier`) dessine, du plus tôt au plus tard :

- la barre de l'activité échue, `accent` pour le travail et `nc` pour la non-conformité, finie à l'échéance par
  l'embout hachuré `warn` de Gestion ; avec une poignée, elle finit à l'heure proposée, la portion retirée se
  dessine jusqu'à l'échéance et la fin automatique reste tracée (« Fin automatique HH:MM ») ;
- le repère du pointage qui ouvre l'activité ;
- la **borne tracée** : le repère du `DEBUT` ou de la `NON_CONFORMITE` du journal dont l'instant égale
  `borneDeFin` (`demarrageDeLaBorne`, comparaison à la nanoseconde ; une `FIN` n'en est jamais un), sinon un
  repère « Clôture » ;
- la poignée.

Les autres pointages de la clé ne sont pas tracés. L'échelle va d'une heure avant le premier instant dessiné à
une heure après le dernier, par heures entières, et s'étend jusqu'à la borne de la poignée. Elle tient dans la
largeur de l'hôte, sans défilement (`ResizeObserver` créé dans `afterNextRender`) : les graduations s'espacent selon
la largeur, jamais à moins de 64 px, et repères et poignée restent à 22 px des bords. Le repère de la borne est serré
contre le bord droit pour rester entier ; son heure reste exacte dans son texte. Barres et repères sont des images
(`role="img"`) ; la poignée est un `slider` dans l'ordre de tabulation. Les tests lisent les attributs `data-*`,
jamais les classes ; la position horizontale se prouve en Cypress sur la géométrie rendue des graduations
(`AbscisseSurLaFrise.ts`).

### Validation

« Valider la fin à HH:MM » envoie `POST /api/atelier/suivis/{id}/regularisations` avec `{ id, activite, dateDeSurvenue }`
par `RegularisationPort` (`HttpRegularisation`). L'opérateur, le poste et le type se déduisent de l'activité côté
serveur. 201 et 200 (renvoi du même identifiant) sont des succès.

**L'identifiant est lié au contenu de la saisie** : `SaisieDeRegularisation.pour` garde l'identifiant tant que
l'activité et l'instant (comparé comme instant, quelle que soit l'écriture) sont les mêmes, après un échec
technique comme après un refus, et en prend un neuf dès que l'heure change. Sans cela, une première requête
réussie dont la réponse s'est perdue ferait afficher la nouvelle heure alors que le journal garde la première ;
avec lui, le serveur répond honnêtement `activite-deja-regularisee`. `RegularisationDeLaFin` n'envoie rien sans
heure lisible, pendant un envoi ni après le succès.

**Refus traduits** : le port rend `{ kind: 'REFUS', code }` pour les codes de `CODES_REFUS_REGULARISATION`
(`activite-visee-introuvable`, `activite-deja-regularisee`, `activite-non-echue`, `date-de-survenue-future`,
`fin-avant-debut`, `fin-apres-borne`, `operateur-non-habilite`, `operateur-introuvable`,
`poste-de-travail-introuvable`) et ne transmet jamais le message du serveur, qui contient des identifiants ; le
primaire affiche le libellé du code sous le bouton ([API](../../../../../../documentation/api.md)).
`activite-non-echue` couvre deux cas : l'échéance n'est pas atteinte, ou un pointage ou la clôture a déjà terminé
l'activité. **`saisie-concurrente` relit le dossier** : la page le recharge, rebâtit la vue et dit « Le dossier a
changé pendant la saisie : il a été relu. Placez de nouveau la fin. » Tout autre échec est signalé une fois par
`ErrorHandlerPort`, rejeté, et affiche « La fin n'a pas pu être enregistrée. Votre saisie est conservée : réessayez. »

### Après la régularisation

La vue affiche **« Fin régularisée à HH:MM »** et **« Anomalie suivante »**; la poignée et « Valider » disparaissent.
`RechercheDeLAnomalieSuivante` lit la liste avec les filtres de l'adresse de retour et mène, dans l'ordre : à la
première ligne autre que l'adresse d'origine de la page demandée, puis de la page précédente (une seule) ; sinon
à la liste, `page` retirée et `plusAucune=1` ; si la lecture de la liste échoue, à la liste d'origine, qui affiche
sa propre erreur. « Première ligne restante » coïncide avec « la ligne suivante » pour une liste traitée de haut en bas.

### Composition

`AnomaliesReadPort` (liste, dossier, opérateurs, éléments) et `RegularisationPort` sont liés à `HttpAnomalies` et
`HttpRegularisation` par `anomaliesDePointageProvider`, y compris dans les parcours Cypress, où les réponses
réseau sont des données REST typées interceptées qui ne calculent aucune règle. Un code d'erreur inconnu est une
défaillance technique, jamais un refus au message brut. Le domaine ne lit jamais l'horloge ni le fuseau.

## Vérification

Les tests passent par les ports et les composants publics ; leur catalogue est dans [`SCENARIOS.md`](SCENARIOS.md).
Les règles de test sont dans [`documentation/testing.md`](../../../../../../documentation/testing.md).

## Ce qui a disparu

Le contexte a perdu les conflits, la vue complète, les actions directes, la correction, l'annulation, l'aperçu,
la confirmation, le reçu et la proposition signée avec le chantier #254 : le serveur ignore désormais les
pointages incohérents au lieu d'en faire des anomalies. Ne rien rouvrir de cela sans nouvelle décision.
