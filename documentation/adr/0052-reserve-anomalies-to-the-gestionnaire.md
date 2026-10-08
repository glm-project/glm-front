# 0052 — Réserver les anomalies au gestionnaire par les rôles de la session

## Status

`Accepted`

- `Complements 0025: un garde de route ne renvoie jamais false, car sans route ** le refus lèverait NG04002 vers ErrorHandlerPort.`
- `Complements 0039: le garde se pose sur le parent qui porte déjà les enfants chargés paresseusement ; il ne change pas le chargement.`

## Context

Une personne sans le rôle `ROLE_GESTIONNAIRE`, le « consultant », ne doit plus accéder aux anomalies de pointage :
l'entrée de menu « Anomalies » disparaît et toute ouverture de `/anomalies` ou de `/anomalies/:suivi` renvoie vers la
Supervision (`/`). Le back reste l'autorité ; le front évite d'offrir un écran dont il sait que les gestes seront
refusés.

Le dépôt n'a aucun garde de route, et le contexte `anomalies-de-pointage` décode lui-même le jeton pour savoir si le
consultant peut agir. Les rôles sont une donnée de la session Keycloak : ils sont connus à la fin de
l'authentification, pas avant.

Le démarrage impose trois contraintes :

- `App.ngOnInit` appelle `authenticate()` pendant le premier `tick` ; la navigation initiale, non bloquante, part
  ensuite. Un garde s'exécute donc pendant l'authentification, alors que sa promesse n'est pas réglée.
- L'en-tête s'affiche pendant l'authentification ; seul le `<router-outlet>` attend `authenticated()`.
- `keycloak-js` refuse une seconde initialisation. Un garde ne peut pas rappeler `authenticate()` pour obtenir les
  rôles.

Le dépôt n'a pas de route `**`. Un garde qui renvoie `false` fait échouer la navigation avec NG04002, et cette erreur
atteint `ErrorHandlerPort` ([ADR 0025](0025-route-runtime-errors-through-error-handler-port.md)).

## Considered options

Trois choix indépendants.

**La forme du port des rôles.**

- Un port à promesse, `realmRoles(): Promise<readonly string[]>` — **kept** : un garde sait attendre une promesse ;
  l'en-tête la lit par `toSignal(from(…))` et obtient `undefined` tant qu'elle n'est pas résolue ; `resource()` est
  écarté, car une promesse qui peut rester en attente bloquerait `whenStable()`.
- Un port à signal — rejeté : un garde devrait observer le signal pour attendre, ce qui réintroduit un effet
  ([ADR 0043](0043-forbid-angular-effects-everywhere.md)) ou une conversion vers une promesse.

**Le type de garde.**

- `canMatch` sur le parent `anomalies` — **kept** : l'URL réservée ne correspond tout simplement pas pour un
  consultant, ce qui est symétrique avec le menu masqué. Le chargement paresseux ne change pas.
- `canActivate` — rejeté : il marche aussi, mais la route correspond d'abord et le refus vient après ; aucun avantage
  ici, et la symétrie avec le menu est moins nette.

**Où attendre l'authentification.**

- Attendre dans le garde, sur la promesse du port — **kept**.
- Une initialisation bloquante (`provideAppInitializer`) — rejeté : l'en-tête ne s'afficherait plus pendant
  l'authentification et les tests de refus existants, qui comptent sur lui, changeraient de sens.
- Une navigation initiale différée (`withDisabledInitialNavigation()`) — rejeté : elle ne couvre pas un clic de menu
  avant la fin de l'authentification, et elle obligerait à simuler `Router`, ce que
  [`testing.md`](../testing.md) interdit.

## Decision

**Un port technique générique des rôles.** `gestion/shared/authentication/domain/RolesPort.ts` déclare une classe
abstraite sans framework :

```ts
export abstract class RolesPort {
  abstract realmRoles(): Promise<readonly string[]>;
}
```

La promesse se résout une fois l'authentification réussie, avec les rôles du royaume. Si l'authentification échoue ou
que la session est absente (`reload()`), elle reste en attente : elle ne rejette pas et ne résout pas à vide. Le
garde n'ajoute ainsi ni second rapport d'erreur ni redirection avant le rechargement. Le port ne contient aucun mot
métier.

**Les rôles sont figés pour la session.** Ils sont lus une fois, à la fin de l'authentification. Un changement de
rôle dans Keycloak est pris en compte à la reconnexion.

**La règle métier est définie une seule fois dans Gestion.** La constante `ROLE_GESTIONNAIRE` et le prédicat
« réservé au gestionnaire » vivent dans l'authentification de Gestion, côté primaire ; le garde et l'en-tête les
partagent. Le port ne les connaît pas.

**Un seul objet derrière deux ports.** `KeycloakOidcAuthentication` implémente aussi `RolesPort` : une promesse
différée est résolue à la fin d'un `authenticate()` réussi, après `refreshToken()`, avec
`keycloak.realmAccess?.roles ?? []`. La composition lie la classe elle-même, puis `AuthenticationPort` et `RolesPort`
en `useExisting`, comme le pupitre le fait pour `DeviceAuthentication`. L'adaptateur en mémoire joue le gestionnaire
par défaut ; une variante de test joue le consultant.

**Le garde est un `canMatch` sur le parent `anomalies`.** Il attend `realmRoles()` et renvoie `true`, ou
`inject(Router).parseUrl('/')`. Il ne renvoie jamais `false`.

**L'en-tête filtre ses destinations.** Il tire de `realmRoles()` un signal par `toSignal(from(…))` et retire
« Anomalies » de la liste tant que ce signal vaut `undefined` ou que le rôle manque. L'entrée apparaît donc à la fin
de l'authentification.

Le remplacement du provider à la compilation pour Cypress est déjà décidé dans
[`authentication.md`](../authentication.md) et n'est pas rediscuté ici. Rien ne change côté back.

## Consequences

### Positive

- Le consultant ne voit ni l'entrée de menu ni les écrans d'anomalies ; le contexte peut perdre tout son code de
  droits, puisque l'écran n'est plus atteignable sans le rôle.
- Un seul endroit, l'authentification de Gestion, lit les rôles ; le contexte métier ne décode plus le jeton.
- Le port reste générique et se teste par un contrat joué contre l'adaptateur Keycloak et l'adaptateur en mémoire
  ([ADR 0002](0002-port-contract-for-secondary-adapters.md)).
- Le garde se vérifie par `TestBed.runInInjectionContext`, sans navigation simulée.

### Negative

- Le menu n'est pas stable au chargement : l'entrée « Anomalies » apparaît quand l'authentification se termine. Ce
  léger décalage est accepté.
- Les rôles étant figés pour la session, un rôle retiré ou accordé dans Keycloak n'agit qu'à la reconnexion ; le
  front peut afficher un écran que le back refusera, et le back reste la seule autorité.
- Une promesse qui reste en attente est un contrat discret : un nouveau consommateur qui l'ignore peut attendre sans
  fin après un échec d'authentification. Le port le dit et le contrat le vérifie, mais rien ne l'interdit à la
  compilation.
- La navigation arrière vers `/anomalies` après une redirection de consultant dépend du comportement du routeur ; il
  est constaté et documenté, pas garanti par le garde.
- Le premier garde de route du dépôt fixe un précédent : un second droit réservé devra choisir entre étendre le
  prédicat partagé et ajouter un port, et cette décision n'est pas prise ici.
