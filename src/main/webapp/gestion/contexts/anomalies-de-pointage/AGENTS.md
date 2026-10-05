# Anomalies de pointage

Ce contexte de Gestion possède la décision explicite du gestionnaire et sa saisie. Le calcul des
activités, des durées et des coûts reste au backend Atelier, selon
l'[ADR 0047](../../../../../../documentation/adr/0047-count-only-finished-activities.md).

## Langage et invariants

- **Anomalie de pointage** : ce que le gestionnaire doit trancher. Deux natures : `CONFLIT`, une séquence
  en conflit, et `FIN_AUTOMATIQUE`, une activité terminée à son échéance faute de fin réelle. La liste
  couvre les deux natures (`GET /api/atelier/anomalies?nature=…`, requise) et le dossier aussi. Le coût de revient emploie déjà « anomalie » au sens large ;
  les contextes restent isolés et ne partagent aucun type. « Séquence en conflit » garde son sens.
- **Dossier** : projection d'une anomalie de pointage, adressée par suivi et pointage d'ancrage : une
  séquence en conflit (`EN_CONFLIT`) ou une fin automatique (`FIN_AUTOMATIQUE`, ancrée sur l'ouvrant actif
  de l'activité échue). Une adresse annulée, remplacée ou résolue reçoit un résultat explicite, jamais une
  autre séquence. Les deux identifiants restent distincts : l'adresse d'une fin automatique est
  l'événement ouvrant, l'activité visée par un acte est l'`ActiviteId` d'origine (`activites[].activite`).
- **Acte** : correction, annulation ou régularisation humaine. Aucun acte n'est choisi par défaut.
  Correction et annulation demandent un motif non vide d'au plus 255 caractères ; la régularisation
  ne porte aucun motif.
- **Aperçu** : conséquences fournies par le port sans écriture, avec l'évaluation et les dossiers avant
  et après. Toute modification de la saisie l'invalide.
- **Proposition confirmable** : adresse, commande, version attendue, acte exact, empreinte des conséquences
  et identité prospective de l'événement pour une correction ou une régularisation ; une annulation
  n'en crée aucun. Confirmation et reprise transmettent cette proposition immuable. Elle reste seulement
  en mémoire dans la page ; un rechargement abandonne la saisie. La saisie conserve les nanosecondes,
  avec comparaison des instants équivalents indépendamment de leur fuseau.
- **Journal** : faits d'origine, annulations et remplacements conservés. Une contradiction restante
  est un résultat accepté, distinct d'un refus métier.
- **Continuation** : lien explicite vers un pointage actif d'une séquence restante après correction
  de l'ancrage. Le résultat reste consultable à l'ancienne adresse.

## Responsabilités

Gestion expose la liste sous `/anomalies` et un dossier sous `/anomalies/:suivi?pointage=…`. L'ancienne
route `/conflits` n'existe plus et ne redirige pas.

La liste offre deux onglets accessibles, « Fins automatiques » à gauche puis « Conflits », et garde la nature dans
l'URL (`/anomalies?nature=CONFLIT|FIN_AUTOMATIQUE`, [ADR 0038](../../../../../../documentation/adr/0038-hold-view-state-in-the-url.md)).
Sans `nature`, l'onglet Fins automatiques, le premier ; une valeur inconnue est une adresse refusée, sans requête. Changer d'onglet
conserve les filtres et revient à `page=1` ; la pagination est propre à chaque onglet. Une ligne
`LigneConflit` ou `LigneFinAutomatique` est traduite à la frontière HTTP, qui rejette la lecture dont une
ligne ne porte pas la nature demandée. Une fin automatique affiche l'élément, l'opérateur, le poste, son début
et l'échéance reçus ; le front ne calcule ni échéance ni durée. Son lien ouvre `/anomalies/{suivi}?pointage=…`
sur l'ouvrant actif (`adresse.pointage`) ; la ligne ne porte pas l'activité visée, que seul le dossier expose.
Chaque libellé de liste, chargement compris, est propre à sa nature. Le dossier ouvert depuis la liste en garde l'adresse (`nature`, filtres, `page`) et « Retour aux anomalies »
ramène à l'onglet, aux filtres et à la page d'origine.

Le domaine possède les identités, la saisie et la confirmation ; l'application protège les appels
asynchrones et les doubles soumissions. Le primaire rend les faits et leur cible, conserve les filtres
dans l'URL et utilise les surfaces de Gestion. Trois ports séparent lecture, aperçu et application.
La composition normale de Gestion relie ces trois ports au même adapter HTTP et à `ApiClient`.
Le serveur fournit états, intervalles, durées ISO, diagnostics, choix et continuations. Le primaire
possède leurs libellés ; il conserve les identités brutes lorsque les fiches ne sont pas résolues.
Une activité en cours reste sans temps définitif ; une activité terminée ou échue sans durée rejette
l'acquisition. `enConflit` concerne le périmètre autoritaire et ne se déduit pas du statut de l'ancrage.

Un dossier de fin automatique n'a pas de `sequence` : il se lit depuis `perimetre`, comme le reçu. Le
modèle porte `etat` (l'état d'adresse reçu) et `finAutomatique`. « Anomalie traitée » signifie ni
`enConflit` ni `finAutomatique`, quel que soit l'état d'adresse : une adresse `ANCRE_ANNULEE` peut rester
en fin automatique lorsque l'ouvrant corrigé est encore échu. Le domaine la pose en question nommée
(`anomalieTraitee`), que l'aperçu et le reçu appellent. Le diagnostic « Pourquoi ces pointages sont
incohérents » n'existe que pour un conflit à expliquer (`conflitAExpliquer`, soit `enConflit`) : il disparaît
dès que le périmètre n'en porte plus, y compris après le reçu d'une fin automatique ou d'un conflit résolu.
Le dossier affiche l'activité échue, son
début, sa fin automatique, sa durée et la clôture reçus, sans les calculer, et ne se présente jamais comme
un conflit. Trois choix guidés s'ajoutent, distingués par leur `code` et lus d'après le `fait` reçu :
`REGULARISER_FIN` prérempli sans heure, que le gestionnaire saisit (aucune heure n'est inventée) ;
`CORRIGER_FIN_TARDIVE` et `CORRIGER_TRANSITION_TARDIVE` reprenant l'heure du pointage tardif, le motif
restant à saisir. Un fait reçu incohérent avec son code rejette l'acquisition. Aperçu, confirmation, reçu,
reprise et obsolescence restent ceux de toute saisie.

Le reçu fournit le dossier canonique courant depuis `perimetre`, même à une ancre annulée. Une lecture
ordinaire utilise `sequence` et conserve le résultat d'adresse obsolète. La vérification canonique
fonctionne indépendamment de cette lecture. `NON_ATTESTE` et les erreurs techniques gardent l'issue
inconnue : toute nouvelle décision reste bloquée. La reprise explicite réutilise la même commande et
la même proposition ; seul un résultat canonique attesté conclut l'écriture.
Après obsolescence, la saisie reste disponible et l'aperçu est retiré. La page réacquiert le dossier ;
une acquisition échouée laisse la confirmation indisponible. Le gestionnaire demande ensuite un nouvel
aperçu avant toute confirmation. Une adresse devenue obsolète conserve son résultat explicite.

La composition utilise uniquement `HttpAnomalies`, y compris dans les parcours Cypress. Les réponses
réseau des tests sont des données REST typées interceptées ; elles ne calculent aucune règle métier
et n'interprètent aucun acte. Les droits d'application restent `GESTIONNAIRE`.

Les tests passent par la saisie et la résolution publiques, les contrats des ports, le DOM Cypress
et les routes réelles. Leur liste et les garanties HTTP sont dans les [garanties de résolution](SCENARIOS.md).
