# Résolution réelle et trajectoires de démonstration

Les snapshots de l'InMemory illustrent les règles de l'[ADR 0047](../../../../../../documentation/adr/0047-count-only-finished-activities.md).
Ils décrivent les résultats de commandes précises ; ils ne constituent pas un interpréteur des commandes
Java. Les durées et conséquences viennent exclusivement de ces snapshots. Une commande valide hors
trajectoire retourne `LIMITATION`, avec la raison `Trajectoire non simulée`, sans écriture.

L'état initial contient dix dossiers pour neuf familles, dont deux séquences du suivi rétroactif. La page
contient au plus cinq dossiers (`PAGE_SIZE_CONFLITS`). Les filtres sont des recherches partielles sans
distinction de casse sur le libellé de l'opérateur et sur l'identifiant ou la désignation de l'élément.
`element=demo-moule-42` retrouve uniquement le dossier initial ; `operateur=Camille` retrouve neuf dossiers.
Les filtres sont combinés. La pagination s'applique après filtrage et `total` désigne tous les résultats
du filtre. Les quatre témoins ci-dessous restent hors liste.

## Commandes supportées

Toutes les heures métier du tableau sont le 14 septembre 2026, avec le décalage `+02:00`. Sauf indication
contraire, les faits utilisent l'opérateur `op-camille` et le poste `poste-dmu`. Correction et annulation
acceptent un motif libre valide, de 1 à 255 caractères, contenant au moins un caractère autre qu'un blanc. La
régularisation ne porte aucun motif. Aucun choix n'est sélectionné implicitement.

| Famille                              | Adresse `suivi / pointage`               | Choix et commande exacte                                                                                | Résultat attendu                                                                                          |
| ------------------------------------ | ---------------------------------------- | ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Fin sur activité remplacée           | `demo-remplacement / fin-17`             | `rattacher-fin` : corriger `fin-17`, `FIN / FIN`, 17 h, cible `nc-12`                                   | Travail 4 h, NC 5 h ; origine annulée, remplacement conservé                                              |
| Même dossier, autre décision         | `demo-remplacement / fin-17`             | `annuler-transition` : annuler `nc-12`                                                                  | Travail 9 h ; transition annulée, fin conservée                                                           |
| Transition sur activité remplacée    | `demo-transition / transition-14`        | `rattacher-transition` : corriger `transition-14`, `DEBUT / TRANSITION`, 14 h, cible `nc-12`            | Travail 4 h, NC 2 h, reprise 3 h ; identité `reprise-14` conservée                                        |
| Deux fins                            | `demo-deux-fins / fin-17-02`             | `annuler-seconde-fin` : annuler `fin-17-02`, survenu deux secondes après `fin-17`                       | Travail 9 h ; première fin conservée                                                                      |
| Geste antérieur à l'ouverture        | `demo-avant-ouverture / fin-avant`       | `corriger-heure-fin` : corriger `fin-avant`, `FIN / FIN`, 17 h, cible `travail-precis`, poste vide      | Travail 8 h 59 min 59,876543211 s ; ouverture à `08:00:00.123456789+02:00` et absence de poste conservées |
| Ouverture annulée encore visée       | `demo-ouverture-annulee / fin-orpheline` | `annuler-fin-orpheline` : annuler `fin-orpheline`                                                       | Aucune activité ni durée inventée ; opérateur `op-absent` reste non résolu                                |
| Transition de même catégorie         | `demo-meme-categorie / transition-12`    | `corriger-categorie` : corriger `transition-12`, `NON_CONFORMITE / TRANSITION`, 12 h, cible `travail-8` | Travail 4 h, NC 5 h ; identité créée `activite-12` et cible de la fin conservées                          |
| Cible échue, autre activité en cours | `demo-cible-echue / nc-23`               | `rattacher-reprise` : corriger `nc-23`, `NON_CONFORMITE / TRANSITION`, 23 h, cible `travail-22`         | Travail A échu à 21 h : 13 h ; trou 21 h–22 h ; travail B : 1 h ; NC ouverte à 23 h, échue après 13 h     |
| Contradiction avec régularisation    | `demo-regularisation / nc-22`            | `conserver-fin-regularisee` : annuler `nc-22`                                                           | Travail 15 h ; `fin-regularisee-23` et son marqueur de régularisation conservés                           |
| Correction rétroactive, acte 1       | `demo-retroactif / fin-17`               | `regulariser-reprise` : régulariser `DEBUT / TRANSITION`, 14 h, cible `nc-12`                           | Reprise `regularisation-fin-17` ajoutée ; conflit encore présent, deuxième acte proposé                   |
| Correction rétroactive, acte 2       | Même adresse après l'acte 1              | `rattacher-fin-reprise` : corriger `fin-17`, `FIN / FIN`, 17 h, cible `regularisation-fin-17`           | Travail 4 h, NC 2 h, reprise 3 h ; clôture conservée                                                      |
| Autre séquence du suivi rétroactif   | `demo-retroactif / fin-tour-10-bis`      | `annuler-fin-tour` : annuler `fin-tour-10-bis`, poste `poste-tour`                                      | Travail indépendant 1 h ; `fin-tour-10` conservé, première séquence inchangée                             |

Le dossier initial garde les identités `fin-17`, `travail-8` et `nc-12`. Les éléments des autres familles
portent les identifiants `demo-element-43` à `demo-element-50`. Le suivi rétroactif est clôturé à 18 h ;
ses deux séquences ont le même élément et partagent le journal initial de six faits et la version 1.
Le premier acte porte le journal à sept faits et la version à 2, le deuxième à huit faits et la version
à 3. Résoudre la séquence indépendante d'abord reste possible : chaque application incrémente la même
version et ne change que les conséquences de sa séquence. Une continuation explicite désigne le conflit
restant après correction ou annulation d'un ancrage. Elle ne déclenche aucune navigation automatique.

Les dates de réception sont distinctes des heures métier. La plupart des faits ont été enregistrés le
15 septembre à 7 h ; la fin régularisée l'a été le 16 septembre. Les deux fins du tour ont la même heure
métier et des réceptions dans l'ordre inverse. Leur ordre de réception ne décide pas quelle fin garder.
La projection chronologique ordonne les faits par heure métier sans modifier le journal d'origine.

## Lecture, aperçu et confirmation

Une adresse comprend le suivi et un pointage connu de la séquence. Un autre pointage actif de cette
séquence peut ouvrir le même dossier. Un pointage absent retourne `INTROUVABLE`, une origine annulée
retourne `ANCRE_ANNULEE`, et un pointage actif d'une séquence résolue retourne `HORS_CONFLIT`. Ces deux
derniers résultats conservent le journal disponible. Une adresse refusée n'ouvre jamais silencieusement
une autre séquence. Les faits ajoutés par un acte sont également adressables dans leur séquence.

Prévisualiser conserve le journal et la version lus. L'aperçu porte l'acte exact, son adresse, la version
du suivi et une référence propre. La référence porte aussi la commande créée par le client. Confirmer consomme cette référence ; modifier sa version est refusé.
L'application compare la version commune à tous les dossiers du suivi. Deux aperçus concurrents peuvent
être lus, mais la deuxième confirmation devient `CONCURRENCE` après l'application du premier. Une
correction conserve l'origine avec motif, auteur et date d'annulation, puis ajoute le remplacement lié
à cette origine. Une régularisation ajoute un fait marqué et son auteur. Le même journal et la même
version sont ensuite visibles depuis toutes les projections du suivi.

`ConflitsRightsPort.canApply()` exige le rôle métier `GESTIONNAIRE`, traduit depuis le claim de royaume
`ROLE_GESTIONNAIRE` émis par le realm livré. L'adapter normal lit
`realm_access.roles` dans le token de `AuthenticationPort` ; un token absent ou malformé refuse le droit.
Les ports d'aperçu et d'application vérifient ce droit au terme de leur attente asynchrone, y compris
si la session perd son rôle après l'aperçu. La composition Cypress remplace explicitement le provider
par un droit de fixture, sans exception de token dans la production.

## Témoins et limites du formulaire détaillé

| Adresse témoin                     | Faits à préserver                                                                |
| ---------------------------------- | -------------------------------------------------------------------------------- |
| `temoin-fin-ciblee / fin-17`       | Fin à 17 h explicitement dirigée vers la NC : travail 4 h et NC 5 h              |
| `temoin-fin-differee / fin-17`     | Fin survenue à 17 h, reçue le lendemain à 23 h : travail 9 h                     |
| `temoin-transition-echue / nc-23`  | Travail échu à 21 h puis NC à 23 h, sans autre activité en cours : trou conservé |
| `temoin-fin-automatique / debut-8` | Seule fin automatique à 21 h : aucune fin persistée supplémentaire               |

La démonstration exerce des refus représentatifs : motif invalide, pointage absent ou déjà annulé,
instant antérieur à l'engagement ou postérieur à la clôture, instant futur, référence inconnue, cible
absente ou d'un autre opérateur/poste, déplacement d'une ouverture encore visée sur sa clé d'origine.
Son horloge est fixée au `2026-10-03T10:00:00Z`. Ses seuls opérateurs reconnus pour de nouveaux faits
sont `op-camille` et `op-jean` ; ses postes sont `poste-dmu`, `poste-tour` et le poste vide.

Les autres commandes valides restent hors simulation. Par exemple, remplacer la fin du dossier initial
par une fin à `2026-09-14T17:01:00+02:00` dirigée vers `nc-12`, ou régulariser une ouverture de travail
à 14 h sur `op-camille / poste-dmu`, retourne `LIMITATION` et laisse journal et version identiques.
Le simulateur ne prétend pas couvrir toutes les permutations acceptées par les commandes Java.

## Réinitialisation et incidents

`DemonstrationConflitsPort.reset(): Promise<void>` restaure les fixtures, efface les aperçus et les
incidents armés et les reçus simulés. Un ancien aperçu ne peut plus être confirmé après réinitialisation. Un rechargement
complet recrée également l'état initial ; aucune donnée n'est stockée durablement. `arm(incident)`
programme un incident unique pour la prochaine opération concernée. Toutes les lectures, tous les
aperçus et toutes les applications passent par une attente asynchrone.

| Incident             | Opération et résultat                                                                                                                                                                                      |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PANNE_LECTURE`      | Prochaine liste ou lecture rejetée ; signalement unique par `ErrorHandlerPort`, puis lecture suivante possible                                                                                             |
| `PANNE_APERCU`       | Prochain aperçu rejeté sans écriture ; le coordinateur signale l'erreur, pas l'adapter                                                                                                                     |
| `PANNE_CONFIRMATION` | Prochaine application retourne `ECHEC_CERTAIN` sans écriture ; le même aperçu peut être retenté                                                                                                            |
| `CONCURRENCE`        | Prochaine confirmation augmente la version commune sans changer le journal, puis retourne `CONCURRENCE`                                                                                                    |
| `ISSUE_INCONNUE`     | Prochaine confirmation applique réellement l'acte et consomme l'aperçu, puis retourne `ISSUE_INCONNUE` ; la vérification du reçu atteste l'écriture ; une reprise explicite conserve commande et référence |
| `LECTURE_PARTIELLE`  | Prochaine liste fournit au plus deux lignes et `complete=false`, avec le total du filtre ; la suivante est complète                                                                                        |

## Tests par les points d'entrée confirmés

`ApplicationActePort.verify(reference)` rend `ATTESTE` avec le dossier canonique, `NON_ATTESTE` sans
preuve d'écriture, ou un refus. La vérification ne dépend pas d'une lecture ordinaire ; celle-ci ne lève pas l'issue inconnue. Le coordinateur
conserve la référence confirmée, bloque toute nouvelle décision tant que le reçu n'est pas attesté et
ignore une réponse de vérification provenant d'un dossier quitté. Une panne de vérification reste une
issue inconnue et est signalée par `ErrorHandlerPort`. Une reprise explicite de la même confirmation reste disponible après `NON_ATTESTE`, sans nouvelle identité ni nouvel aperçu.

1. Saisie publique : choix explicite, motif, champs requis et instant absolu conservé.
2. Résolution publique : édition invalidant l'aperçu et confirmation de l'acte exact.
3. Ports : lecture complète, filtres, pagination, adresses refusées et témoins exclus.
4. Ports : chaque trajectoire, journal non muté par l'aperçu, origine conservée par l'acte.
5. Ports : plusieurs actes et séquences, clôture, version commune et continuation explicite.
6. Ports : droits, refus représentatifs, commandes hors scripts et incidents asynchrones.
7. Application : réponses anciennes ignorées, double confirmation, concurrence et issue inconnue.
8. DOM Cypress : cibles explicites, saisie guidée/détaillée, comparaison avant/après et accessibilité.
9. Routes Cypress : URL directe, filtres et historique, liste actualisée, parcours en plusieurs actes.

Les contrats d'adapters exercent les ports publics. Ils gardent les mêmes attentes lorsqu'un helper
privé, une map ou la représentation des fixtures change. Les observations du journal et des versions
se font par les lectures ; aucune assertion n'inspecte l'état privé du simulateur.

## Parcours HTTP réel

La composition normale utilise les trois ports HTTP ; les tests de démonstration disposent de leur propre graphe dans les utilitaires de tests.
Les tests navigateur choisissent explicitement leur composition et réutilisent ces graphes, avec des
réponses aux limites HTTP pour les parcours réels. Le backend épinglé dans `.glm-back-revision` fournit
le contrat généré ; les types wire restent au secondaire.

La liste conserve pagination, total et complétude. Un dossier courant traduit `sequence` ; un aperçu
ou un reçu traduit `perimetre`, même lorsque l'ancrage devient annulé. Le booléen `enConflit` concerne
ce périmètre : une continuation indépendante ne prouve pas qu'il reste contradictoire. Une URL
ancienne reste obsolète lors d'une lecture ordinaire ; les liens de continuation restent explicites.

L'aperçu envoie l'acte exact, la version lue et une commande UUID créée par le client, sans auteur
client. Avant/après et leurs durées viennent du serveur. Une équivalence de fuseau conserve l'instant
à la nanoseconde ; le formulaire garde sa saisie d'origine. Un écho altéré, une durée définitive absente
ou une proposition guidée incohérente sont des erreurs techniques, jamais une limitation de démo.
Les guides serveur proposent rattachement de fin ou annulation de transition ; la saisie manuelle
reste disponible sans motif, cible ou instant inventé.

Confirmation et vérification utilisent adresse et commande publiques, sans mémoire privée d'aperçu.
Un reçu attesté rend le dossier canonique courant ; son adresse, sa commande et ses révisions doivent
correspondre à la confirmation. `NON_ATTESTEE` conserve l'incertitude. Une tentative explicite répète
la même commande et la même référence, protégées par l'idempotence serveur. Une nouvelle décision
reste bloquée jusqu'à la preuve canonique.

`ApiClient` borne chaque échange à trente secondes. Timeout, rupture réseau, perte de rôle et code
URN inconnu restent techniques ; une confirmation sans preuve d'échec devient `ISSUE_INCONNUE`.
Le coordinateur les signale une fois. Les refus métier sont traduits par leurs codes stables ; un
statut HTTP seul ne prouve jamais une absence d'écriture. La composition normale utilise les droits
issus du token et le contrôle serveur ; seuls les graphes de test remplacent ce droit par une fixture.
