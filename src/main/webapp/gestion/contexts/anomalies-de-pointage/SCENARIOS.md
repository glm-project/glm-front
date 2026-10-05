# Anomalies de pointage : garanties

Le backend Atelier fournit le dossier, l'aperçu et le reçu canonique. Le front utilise uniquement
`HttpAnomalies` et ne calcule ni interprétation du journal ni conséquences d'un acte.

## Proposition et confirmation

L'aperçu porte l'adresse, la commande, la révision attendue, l'acte exact, l'empreinte des conséquences
et l'identité prospective d'événement pour une correction ou une régularisation. L'annulation n'en
crée aucun. La confirmation transmet ces champs explicites ; l'évaluation et les dossiers avant et
après servent uniquement à la consultation. Toute modification de saisie invalide l'aperçu.

L'obsolescence conserve la saisie et retire l'aperçu. Une réacquisition échouée ne rétablit pas la
confirmation. Après récupération du dossier courant, le gestionnaire demande un nouvel aperçu.

Une réponse d'écriture perdue bloque les nouvelles décisions. Vérifier le reçu ne rejoue aucun acte.
La reprise explicite transmet la proposition initiale immuable. Un reçu ne conclut l'écriture que si
la commande, l'adresse, la révision de départ, l'acte et l'événement créé correspondent exactement.
Une ancre annulée reste consultable et les continuations désignent les autres conflits explicitement.

## Fin automatique

Le dossier d'une activité terminée à son échéance faute de fin réelle n'est jamais présenté comme un
conflit. Il affiche l'activité échue, son début, sa fin automatique et sa durée telles que reçues. Le
gestionnaire régularise la fin avec une heure qu'il saisit : le choix guidé arrive sans heure et l'aperçu
reste indisponible tant qu'elle manque. Une fin ou une transition pointée après l'échéance se corrige avec
l'heure de ce pointage et un motif. L'aperçu, la confirmation, le reçu, la reprise et l'obsolescence sont
ceux de tout acte ; les refus `suivi-d-atelier-cloture`, `operateur-non-habilite`,
`date-de-survenue-future` et `apercu-obsolete` s'y présentent sans écriture ni perte de saisie. Le reçu
annonce « Anomalie traitée » seulement si ni `enConflit` ni `finAutomatique` ne subsistent, y compris
sur une adresse annulée, et n'affiche alors plus le diagnostic « Pourquoi ces pointages sont incohérents »,
réservé au périmètre qui porte encore un conflit. Une activité sans poste n'en reçoit aucun.

## Liste des anomalies

La liste demande la nature de l'onglet courant : `FIN_AUTOMATIQUE` sans `nature` dans l'URL, `CONFLIT` à la
demande ; l'onglet des fins automatiques se place à gauche. Une valeur inconnue n'émet aucune requête. Changer d'onglet conserve les filtres et remet `page=1`.
Chaque onglet a son message de chargement, son message vide, ses erreurs et sa pagination. Une ligne d'une autre nature que celle demandée
rejette la lecture. Une fin automatique montre son début et son échéance reçus, sans calcul, et ouvre le
dossier de son ouvrant actif ; « Retour aux anomalies » ramène à l'onglet, aux filtres et à la page d'origine.

## Dates affichées

Le dossier et la liste n'affichent aucun instant ISO brut. Chaque instant reçu s'affiche en heure locale, en jour
long (« jeudi 1 octobre à 09:41 ») avec l'année quand elle diffère de celle de la page. L'instant d'un fait pointé
porte ses secondes (« à 09:41:22 ») : chronologie (heure en gras, puis jour long), références des diagnostics,
détails de traçabilité, proposition, aperçu et journaux avant/après. L'engagement, la clôture, le début et la fin
d'une activité, l'enregistrement, l'annulation et la date d'un conflit de la liste restent à la minute. L'attribut
`datetime` des heures porte un instant valide, de trois décimales au plus, sans perdre l'ordre du journal. La saisie
de l'instant reste un texte ISO.

## Frontières de vérification

- Les specs de domaine passent par `SaisieActe` et `ResolutionDeLAnomalie` ; elles vérifient les motifs,
  le choix explicite, la précision des instants et l'invalidation d'un aperçu.
- Les specs d'application passent par les ports publics et contrôlent les doubles envois, les réponses
  tardives, l'obsolescence et la vérification d'une issue inconnue.
- Les contrats HTTP lisent un dossier `FIN_AUTOMATIQUE` depuis son périmètre et rejettent un choix guidé
  incohérent avec son code (régularisation portant une heure, correction sans heure).
- Les contrats HTTP contrôlent les requêtes REST (liste de chaque nature, dossier et aperçu sous
  `/anomalies`), l'acquisition autoritaire, les refus et les reçus incohérents ; ils utilisent `HttpTestingController`.
- Les specs DOM et Cypress vérifient les faits reçus, leurs dates affichées en heure locale (fixtures bâties
  depuis une heure locale, horloge fixée), les formulaires, la comparaison avant/après,
  les droits, la navigation et les reprises. Cypress utilise la composition HTTP réelle avec des
  réponses JSON typées interceptées, sans adapter de simulation ni stockage des aperçus.

La [documentation du contexte](AGENTS.md) décrit les responsabilités et les invariants.
