# Anomalies de pointage : garanties

Le backend Atelier fournit la liste, le dossier et accepte la régularisation. Le front passe uniquement par
`HttpAnomalies` et `HttpRegularisation` : il ne calcule ni échéance, ni durée, ni borne de fin. Les règles sont
dans [`AGENTS.md`](AGENTS.md) ; ce fichier dit ce que les tests garantissent et à quel niveau.

## Régularisation

- **Contrat** (`RegularisationPort.contract.spec.ts`) : la requête est `POST /api/atelier/suivis/{id}/regularisations`
  avec `{ id, activite, dateDeSurvenue }` ; 201 et 200 sont des succès ; chaque code de `CODES_REFUS_REGULARISATION`
  devient un refus à code sans le message du serveur ; `saisie-concurrente` devient une concurrence ; tout autre échec
  est signalé une fois et rejeté.
- **Domaine** (`SaisieDeRegularisation.spec.ts`) : même activité et même instant, quelle que soit l'écriture,
  gardent l'identifiant ; une autre heure en prend un neuf.
- **Application** (`RegularisationDeLaFin.spec.ts`) : rien n'est envoyé sans heure lisible, pendant un envoi ni après
  le succès ; un renvoi après un échec technique ou un refus garde l'identifiant.
- **Composant** : l'identifiant et l'heure envoyés, « Fin régularisée à HH:MM », le refus dit sous le bouton avec la
  possibilité de valider de nouveau, le même identifiant renvoyé après une panne.
- **Application Cypress** : le parcours complet, de l'ouverture du dossier à la fin régularisée, le refus du serveur et le
  lien vers les heures de l'opérateur.

## Poignée et frise

- **Domaine** (`CadreDeLaFin.spec.ts`, `InstantPointage.spec.ts`) : le minimum est la première minute entière
  strictement après le début ; le maximum est le plus petit de l'horloge et de `borneDeFin`, comparés comme instants.
- **Primaire** (`FriseDossier.spec.ts`, `PoigneeDeFrise.spec.ts`, `DeplacementDeLaPoignee.spec.ts`) : flèches, Maj,
  Origine et Fin, clic arrondi, jamais hors des bornes.
- **Composant** : aucune heure n'est inventée avant le placement, le clic avant le début ramène au début, le glissé
  depuis la fin automatique place l'heure à son premier mouvement, la poignée reste à 22 px des bords, la barre
  s'arrête à l'échéance, l'échelle tient dans la largeur à 1280 et 390 px.
- **Borne** (`DemarrageDeLaBorne.spec.ts` et composant) : le démarrage suivant se dessine à son instant, sinon la
  clôture ; une `FIN` n'est jamais une borne ; la clôture reste entière quand la borne tombe plusieurs jours après
  l'échéance.

## Anomalie suivante et retour à la liste

- **Domaine et application** (`AnomalieSuivante.spec.ts`, `RechercheDeLAnomalieSuivante.spec.ts`) : première autre
  ligne de la page, puis de la page précédente seule, sinon « plus aucune anomalie », la liste en cas d'échec de lecture.
- **Composant et application** : la régularisation mène à la fin suivante ou à la liste qui dit « Plus aucune anomalie ».
- **Dossier introuvable** (application Cypress) : les deux 404 et l'adresse sans pointage ramènent à la liste avec
  les mêmes filtres et la même page, sans écran intermédiaire ; « Précédent » ne ramène pas au dossier ; une panne
  technique garde l'écran d'erreur et « Réessayer ». Une lecture abandonnée (page quittée, adresse changée) ne navigue pas
  (`DossierAnomaliePage.spec.ts`).

## Liste

- **Contrat** (`AnomaliesFinsAutomatiques.contract.spec.ts`, `AnomaliesReadPort.contract.spec.ts`) : la requête de la
  liste, la lecture du dossier (activité échue, pointages, borne, désignation), le 404 en `INTROUVABLE`, la lecture de
  toutes les pages des opérateurs et des éléments avec les refus d'une collection incohérente.
- **Composant et application** : l'ouverture sans paramètre, l'ouverture du dossier avec les paramètres de la liste,
  le retour aux mêmes filtres et à la même page, un ancien `nature` ignoré, le sous-titre, les filtres choisis par nom
  ou désignation sans identifiant, leurs pannes et leurs « Réessayer », la pagination.

## Noms et dates

- Aucun identifiant d'opérateur, de poste ou d'activité n'est affiché : `PresentationIdentites.spec.ts` et les
  parcours vérifient « Opérateur non résolu », « Poste non résolu » et « Sans poste ».
- Aucun instant ISO brut n'est affiché : les fixtures sont bâties depuis une heure locale (`InstantLocal.fixture.ts`)
  avec une horloge fixée.

Cypress compose les mêmes adaptateurs HTTP avec des réponses JSON typées interceptées (`FinAutomatiqueHttp.fixture.ts`,
`FinsAutomatiquesHttp.fixture.ts`, `ReferentielHttp.fixture.ts`, `RegularisationHttp.fixture.ts`), sans adaptateur de
simulation.
