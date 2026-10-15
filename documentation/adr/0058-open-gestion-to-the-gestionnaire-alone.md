# 0058 — Ouvrir Gestion au seul gestionnaire

## Status

`Proposed` le 15 octobre 2026.

- `Amends 0052`: aucune route ni aucune entrée de menu n'est plus réservée. Le garde `reservedToGestionnaire` et le
  filtre des destinations de l'en-tête disparaissent. Il reste de 0052 le `RolesPort` à promesse, ses rôles figés pour
  la session, sa promesse qui reste en attente quand l'authentification échoue, et la lecture des rôles par la seule
  authentification de Gestion. Le shell est désormais son unique consommateur.
- `Amends 0056`: la route `operateurs/:operateur/journees/:jour` n'est plus gardée, et la directive
  `*glmReservedToGestionnaire` disparaît. Le bouton « Corriger la journée » du relevé s'affiche pour tout jour échu.
  Le reste de 0056 tient.

Un lecteur qui arrive ici depuis un autre ADR garde la règle en vigueur : **Gestion n'a qu'un seul public, le
gestionnaire. Le shell vérifie `ROLE_GESTIONNAIRE` une fois, à la fin de l'authentification. Sans ce rôle, il
n'ouvre pas l'application et affiche un écran d'accès réservé. Aucun écran, aucune route et aucun élément ne
consulte plus les rôles.**

## Context

L'ADR 0052 a introduit un second public pour Gestion, le « consultant » : une personne authentifiée sans
`ROLE_GESTIONNAIRE`. Il a réservé au gestionnaire les anomalies, puis les paramètres. L'ADR 0056 y a ajouté la
correction de la journée, par un garde de route et par une directive. Ce public n'a jamais été conçu comme tel : son
périmètre est ce qui reste quand on lui retire un écran.

Le contrat du back (`openapi.json`) montre un parcours incohérent pour ce consultant :

- **Il écrit le référentiel.** Aucune écriture sur les produits, les postes, les opérateurs, les catégories et les
  natures de travail ne documente de refus pour un rôle. Il peut supprimer un opérateur, mais pas régulariser une
  fin automatique.
- **Il ouvre des écrans que le back lui refuse.** `/couts-de-revient/{element}`, ses exports, le rapport d'activité
  (`/syntheses-des-heures/{operateur}/rapport`) et les exports du relevé répondent 403 « rôle autre que
  GESTIONNAIRE ». Le front ne garde pas `/couts-de-revient/:element`, alors que Produits et le relevé y mènent par un
  lien. La page Opérateurs charge le rapport.
- **Le back masque des champs** (`tauxHoraire`, `coutHoraire`) pour les rôles autres que `GESTIONNAIRE`.

Protéger ce public jusqu'au bout demanderait de nouveaux gardes, des masquages d'exports et de gestes d'écriture, et
un test « consultant » pour chacun. Le besoin exprimé est inverse : on est gestionnaire et on utilise Gestion, ou on
n'y a pas accès.

Les contraintes de démarrage de 0052 tiennent toujours. L'authentification se termine après le premier `tick`,
l'en-tête s'affiche pendant qu'elle se déroule, et `keycloak-js` refuse une seconde initialisation.

## Considered options

**Où fermer l'application.**

- Un contrôle unique dans le shell, après `authenticate()`, sur `RolesPort` — **kept** : un seul endroit lit le rôle,
  le `<router-outlet>` n'est jamais monté sans lui, et aucune route n'a à se protéger.
- Un garde `canMatch` sur chaque route — rejeté : c'est l'état actuel étendu à toutes les routes. Chaque nouvelle
  route devrait penser à son garde, et l'oubli de `/couts-de-revient/:element` montre que ce n'est pas tenu.
- Seulement un flux d'authentification Keycloak qui refuse le client `gestion` sans le rôle — rejeté comme seule
  barrière : il est souhaitable et décrit plus bas, mais il vit hors de ce dépôt. Sans contrôle dans le front, une
  dérive de configuration se verrait comme une cascade de 403, sans explication.
- `provideAppInitializer` qui attend les rôles avant de démarrer — rejeté pour les raisons de 0052 : l'en-tête ne
  s'afficherait plus pendant l'authentification, et les tests de refus changeraient de sens.

**Ce que voit une personne sans le rôle.**

- Un écran d'accès réservé dans le shell, avec « Se déconnecter » — **kept** : la personne comprend pourquoi rien ne
  s'ouvre et peut changer de compte.
- Une déconnexion immédiate — rejeté : Keycloak rouvrirait la même session SSO, ce qui produirait une boucle sans
  message.
- Une redirection vers une page Keycloak — rejeté : elle demande une configuration hors du dépôt pour un cas que le
  front sait déjà dire.

**Ce que montre l'en-tête.**

- La navigation, les paramètres et le logo de l'entreprise une fois l'application ouverte, tels quels pour tout le
  monde — **kept** : l'en-tête ne lit plus les rôles. Il reçoit du shell un seul état, « application ouverte ».
- Garder le filtre par rôle de l'en-tête — rejeté : une fois le shell fermé au non-gestionnaire, le filtre ne
  s'applique plus qu'au gestionnaire. C'est du code mort.

## Decision

**Le shell est la seule barrière.** `App` attend `authenticate()`, puis `RolesPort.realmRoles()`, et passe par trois
états :

- **en cours** : l'en-tête s'affiche sans navigation, et rien n'est routé ;
- **ouverte** : les rôles contiennent `ROLE_GESTIONNAIRE`, le `<router-outlet>` est monté et l'en-tête montre la
  navigation, les paramètres et le logo de l'entreprise ;
- **réservée** : les rôles ne le contiennent pas. Le shell affiche l'écran d'accès réservé
  (`data-selector="gestion-acces-reserve"`) avec un bouton « Se déconnecter », et ne monte jamais le
  `<router-outlet>`.

Si l'authentification échoue, ou si Keycloak n'ouvre aucune session, la promesse des rôles reste en attente comme
le prévoit 0052. Le shell reste alors en cours, et l'échec est rapporté une seule fois par `ErrorHandlerPort`.
L'accès réservé n'est pas une erreur et ne passe pas par `ErrorHandlerPort`.

**Plus rien d'autre ne lit les rôles.** Le garde `reservedToGestionnaire`, la directive `*glmReservedToGestionnaire`
et le champ `reserveeAuGestionnaire` des destinations sont supprimés. `gestionnaire.ts` garde `ROLE_GESTIONNAIRE`, et
son prédicat devient `isGestionnaire`, que le shell est seul à appeler.

**L'en-tête reçoit l'état du shell.** Une entrée `ouverte` remplace sa lecture de `RolesPort`. Navigation,
paramètres et logo de l'entreprise s'affichent quand elle est vraie.

**Keycloak ferme la porte en amont.** Le client `gestion` reçoit un flux d'authentification avec « Condition - User
Role » (`ROLE_GESTIONNAIRE` absent) suivi de « Deny Access ». Cette configuration vit hors de ce dépôt. Le contrôle
du shell reste nécessaire même quand elle est en place.

**Le back reste l'autorité.** Exiger `GESTIONNAIRE` sur toute l'API de Gestion et retirer le masquage de
`tauxHoraire` et `coutHoraire` relèvent du back. Cette décision ne l'impose pas : Gestion ne s'ouvre qu'au gestionnaire, qui reçoit déjà
ces champs.

## Consequences

### Positive

- Un seul endroit décide de l'accès, et une nouvelle route ou un nouveau geste n'a aucune question de droits à se
  poser.
- Le consultant ne tombe plus sur des 403 qu'aucun écran n'expliquait.
- Le dépôt perd un garde, une directive, un filtre de menu, leurs specs et les scénarios « consultant », soit une
  quarantaine de fichiers touchés.
- `RolesPort`, son contrat et ses adaptateurs restent tels quels. La promesse en attente sur échec garde son sens,
  avec un consommateur de moins.

### Negative

- **Tout le menu apparaît à la fin de l'authentification**, et plus seulement l'entrée « Anomalies ». Pendant
  l'authentification, l'en-tête ne montre que la marque et « Se déconnecter ».
- **Une personne sans le rôle perd tout Gestion**, y compris la supervision et le référentiel qu'elle voyait jusqu'ici.
  Si un tel compte sert aujourd'hui, il faut lui donner le rôle ou accepter qu'il perde l'accès.
- **Le front ne sait pas dire pourquoi le rôle manque.** L'écran renvoie la personne vers son administrateur, sans
  plus.
- **Le flux Keycloak est une seconde source de vérité, hors du dépôt.** Si le shell et Keycloak divergent, c'est le
  plus strict qui gagne, et aucun test de ce dépôt ne le vérifie.
- Rouvrir un accès partiel, par exemple un lecteur de la supervision, demanderait une nouvelle décision et
  probablement un front distinct, plutôt qu'un retour aux gardes.
