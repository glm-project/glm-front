# 0048 — Relire les données de Gestion sur le serveur à chaque acquisition

## Status

Accepted à la demande explicite du responsable produit : aucun cache de données métier dans Gestion
pour l'instant. Gestion et l'application déployée sous le nom Supervision sont le même front ; cette
décision concerne tous ses contextes, y compris `supervision-atelier`.

Complète [0033](0033-compose-view-data-in-secondary-adapters.md) : les adaptateurs composent les réponses
nécessaires à une vue, mais Gestion ne conserve aucune réponse pour éviter une acquisition ultérieure.
Complète [0006](0006-how-the-front-calls-the-back.md) : le client typé reste commun, la politique de cache
HTTP est choisie par la composition de Gestion.
Complète [0034](0034-proxy-the-api-at-the-edge.md) : le relais Pages propage la politique de fraîcheur
de Gestion uniquement pour les requêtes qui interdisent le stockage des réponses.
Préserve [0004](0004-ngsw-caches-the-pupitre-shell-and-nothing-else.md) et
[0007](0007-durable-offline-pupitre.md) : le pupitre conserve son fonctionnement hors ligne indépendant.

## Context

Gestion sert à configurer et superviser l'atelier. Un poste peut être créé, renommé ou supprimé depuis
un autre écran, une autre session ou directement sur le serveur. Une copie conservée par un adaptateur
ne connaît pas nécessairement ces changements.

Le catalogue des postes habilitables était conservé après sa première lecture dans `HttpOperateurs`.
Les suggestions de natures étaient conservées dans `HttpPostes` et invalidées uniquement après les
écritures réussies de cet adaptateur. Ces deux mécanismes permettaient de présenter des références
périmées après une nouvelle demande de lecture. Aucun gain de performance mesuré ne justifie actuellement
ce compromis de fraîcheur.

Une nouvelle requête Angular ne suffit pas, à elle seule, à définir la politique du cache HTTP du
navigateur ou des intermédiaires. Leur éventuelle réutilisation dépend des directives HTTP et du
déploiement ; cela ne constitue pas la preuve d'un cache API actif dans les environnements actuels.

## Considered options

- Relire le serveur à chaque acquisition explicite — **kept** : règle uniforme de fraîcheur pour tout Gestion.
- Garder un cache avec expiration — rejeté : une durée courte peut encore masquer une modification récente.
- Invalider les caches après les écritures locales — rejeté : cela ignore les autres sessions et producteurs.
- Réutiliser une ancienne réponse après une panne — rejeté : une lecture demandée doit rendre son résultat ou son échec actuel.

## Decision

Pour l'instant, ne mettre en cache aucune réponse ni collection métier dans Gestion / Supervision.
Chaque appel d'un port d'acquisition contacte de nouveau le serveur, y compris pour les catalogues et
les suggestions. Ne mutualiser ni mémoriser une promesse ou une réponse entre acquisitions distinctes.
Une nouvelle lecture qui échoue reste un échec : ne pas la remplacer par une copie issue d'une lecture
réussie précédente. Les collections complètes sont acquises avec leurs règles de pagination habituelles.

Configurer les requêtes API de Gestion avec le mode Fetch `no-store`, qui évite la consultation et
l'alimentation du cache HTTP du navigateur. Transmettre des directives `Cache-Control: no-cache, no-store`
aux intermédiaires et à l'origine. Le relais Pages doit porter cette intention jusqu'à son échange
amont et empêcher la conservation de la réponse retournée pour ces requêtes. Cette politique ne prouve
pas la configuration d'un CDN ou d'un cache interne du backend situé hors du dépôt : leur respect des
directives et leur configuration se vérifient sur l'environnement déployé.

Le relais désactive son cache amont pour tous les statuts HTTP avec une valeur négative de
[`cf.cacheTtlByStatus`](https://developers.cloudflare.com/workers/runtime-apis/request/#the-cf-property-requestinitcfproperties).
Ce choix évite de dépendre de la date de compatibilité Pages nécessaire au champ `Request.cache` du Worker ;
le mode Fetch `no-store` reste appliqué dans le navigateur de Gestion.

L'état d'une vue déjà acquise, les résultats de recherche ou de pagination locale de cette vue et la
saisie d'un formulaire restent des états d'interaction. Ils ne doivent pas éviter une nouvelle acquisition
explicite. Cette décision n'ajoute pas une requête à chaque frappe ni un rafraîchissement continu.
Elle ne supprime ni le cache des assets statiques, ni la session et les jetons d'authentification, ni les
fixtures InMemory des tests. Elle ne modifie pas le pupitre, son journal durable ou son référentiel hors ligne.

Réintroduire un cache métier uniquement après une nouvelle décision explicite, appuyée sur un besoin
et des mesures, précisant son propriétaire, sa durée, son invalidation et la fraîcheur acceptable.

## Consequences

### Positive

- Une nouvelle acquisition observe les modifications disponibles sur le serveur, quelle que soit leur origine.
- Les adaptateurs ne portent plus de cycle de vie de cache ni d'invalidation entre contextes.
- Les échecs de lecture ne présentent pas une ancienne référence comme réponse actuelle.

### Negative

- Chaque acquisition consomme du réseau et ajoute la latence du serveur, même pour un catalogue inchangé.
- Les collections paginées complètes coûtent plusieurs requêtes à chaque lecture et chargent davantage le backend.
- Gestion nécessite un serveur joignable pour toute nouvelle acquisition ; aucun repli métier hors ligne n'est fourni.
- Une lecture fraîche ne garantit pas un instantané transactionnel entre plusieurs réponses serveur.
- La politique ne maîtrise pas les caches internes ou règles externes au dépôt sans vérification du déploiement.
