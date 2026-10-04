# Résolution des conflits

Ce contexte de Gestion possède la décision explicite du gestionnaire et sa saisie. Le calcul des
activités, des durées et des coûts reste au backend Atelier, selon
l'[ADR 0047](../../../../../../documentation/adr/0047-count-only-finished-activities.md).

## Langage et invariants

- **Dossier** : projection d'une séquence en conflit, adressée par suivi et pointage d'ancrage ; une
  adresse annulée, remplacée ou résolue reçoit un résultat explicite, jamais une autre séquence.
- **Acte** : correction, annulation ou régularisation humaine. Aucun acte n'est choisi par défaut.
  Correction et annulation demandent un motif non vide d'au plus 255 caractères ; la régularisation
  ne porte aucun motif.
- **Aperçu** : conséquences fournies par le port sans écriture. Toute modification de la proposition
  l'invalide. La référence publique porte adresse, commande, version et référence opaque ; confirmation
  et vérification réutilisent cette identité sans cache privé. La saisie conserve les nanosecondes,
  avec comparaison des instants équivalents indépendamment de leur fuseau.
- **Journal** : faits d'origine, annulations et remplacements conservés. Une contradiction restante
  est un résultat accepté, distinct d'un refus métier ou d'une limitation de simulation.
- **Continuation** : lien explicite vers un pointage actif d'une séquence restante après correction
  de l'ancrage. Le résultat reste consultable à l'ancienne adresse.

## Responsabilités

Le domaine possède les identités, la saisie et la confirmation ; l'application protège les appels
asynchrones et les doubles soumissions. Le primaire rend les faits et leur cible, conserve les filtres
dans l'URL et utilise les surfaces de Gestion. Trois ports séparent lecture, aperçu et application.
La composition normale de Gestion relie ces trois ports au même adapter HTTP et à `ApiClient`.
Le serveur fournit états, intervalles, durées ISO, diagnostics, choix et continuations. Le primaire
possède leurs libellés ; il conserve les identités brutes lorsque les fiches ne sont pas résolues.
Une activité en cours reste sans temps définitif ; une activité terminée ou échue sans durée rejette
l'acquisition. `enConflit` concerne le périmètre autoritaire et ne se déduit pas du statut de l'ancrage.

Le reçu fournit le dossier canonique courant depuis `perimetre`, même à une ancre annulée. Une lecture
ordinaire utilise `sequence` et conserve le résultat d'adresse obsolète. La vérification canonique
fonctionne indépendamment de cette lecture. `NON_ATTESTE` et les erreurs techniques gardent l'issue
inconnue : toute nouvelle décision reste bloquée. La reprise explicite réutilise la même commande et
la même référence ; seul un résultat canonique attesté conclut l'écriture.

La composition de démonstration des tests conserve un seul InMemory pendant les navigations.
Il rejoue les [trajectoires bornées](SCENARIOS.md), sans moteur général d'interprétation ni
stockage durable. La démonstration permet de réinitialiser et de déclencher panne ou concurrence.
Une commande hors trajectoire donne une limitation explicite. Aucun identifiant réel provenant
d'un autre contexte n'est relié aux fixtures. Les droits d'application restent `GESTIONNAIRE`.

Les tests passent par la saisie et la résolution publiques, les contrats des ports, le DOM Cypress
et les routes réelles. Leur liste et les garanties HTTP sont dans les trajectoires.
