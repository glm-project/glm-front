# Enrôlement du pupitre

Ce contexte appartient exclusivement à `pupitre`. Il possède le cycle de vie visible de l'appareil : la demande d'autorisation, l'attente d'approbation, l'expiration du code, le refus, la panne réseau initiale et la bascule vers l'atelier. Il n'authentifie jamais un opérateur.

## Langage

**Enrôlement** : obtention par un pupitre neuf de son identité d'appareil auprès de Keycloak, jusqu'à la disponibilité du premier référentiel complet. Employer ce terme plutôt que connexion, inscription ou appairage.

**Code d'enrôlement** : le `user_code` affiché au mur, son URI de vérification et l'instant où il cesse d'être valable. C'est l'objet que l'approbateur lit ou scanne; il n'est jamais renouvelé silencieusement.

**Lien de validation** : URL complète encodée dans le QR code. C'est `verification_uri_complete` quand le serveur d'autorisation le fournit, sinon `${verificationUri}?user_code=${userCode}` selon la RFC 8628.

**Issue d'enrôlement** : résultat d'une tentative — `ENROLE`, `REFUSE`, `EXPIRE` ou `INJOIGNABLE`. L'application traduit l'issue technique du port en ce vocabulaire métier.

**Chargement de l'atelier** : période entre l'obtention des jetons et l'activation du premier référentiel complet. Elle appartient à l'enrôlement parce que l'écran la montre; le référentiel lui-même appartient au contexte `atelier`.

**Issue du chargement de l'atelier** : résultat `CHARGE`, `ECHEC` ou `TENANT_ABSENT` d'une tentative de chargement. Elle reste distincte de la connexion observée par la publication des gestes.

**Réinitialisation** : geste d'administration qui révoque l'enrôlement sur le serveur, ramène le pupitre à sa demande initiale et efface les journaux d'atelier de l'appareil (le **Journal du pupitre** de chaque entreprise connue de l'appareil, voir le contexte atelier), gestes en attente compris. Ce n'est pas une déconnexion d'opérateur. S'il reste des gestes en attente, la confirmation les annonce avec leur nombre, celui du Journal du pupitre de l'entreprise courante. Le retour automatique à l'enrôlement après perte d'autorisation conserve les journaux. Voir l'[ADR 0050](../../../../../../documentation/adr/0050-erase-workshop-journals-on-explicit-reset.md).

## Responsabilités et invariants

- Le domaine possède l'échéance du code et la décision d'expiration. Il reçoit l'instant courant; il ne le lit jamais lui-même.
- L'expiration est dérivée : un compte à rebours local atteint et une réponse `expired_token` du serveur produisent la même vue. Aucune rotation automatique du code.
- Le modèle `Enrolement` est immuable. Chaque transition `after…` retourne la version suivante; l'application remplace sa référence.
- La vue est une projection pure de l'étape stockée, de l'instant courant et de l'état du chargement de l'atelier. Elle distingue explicitement un jeton sans tenant d'une panne réseau et ne décide rien d'autre.
- L'application pilote l'adaptateur d'enrôlement : elle appelle `enrol(showCode)` et reçoit l'issue. L'adaptateur ne rappelle jamais l'application, ce qui fermerait un cycle d'injection par `AuthenticationPort`.
- Une tentative périmée n'écrit plus rien : chaque `enroler()` prend un jeton de tentative et ignore l'issue et le code d'une tentative remplacée.
- Chaque chargement de l'atelier prend aussi un jeton de tentative. Une reprise remet l'écran en chargement et l'issue tardive d'un chargement remplacé ne modifie plus la vue.
- Le tic de la seconde appartient à l'adaptateur primaire. Il pousse l'instant courant dans l'application; il ne décide pas de l'expiration.
- L'état du chargement de l'atelier arrive par un port de domaine, implémenté par un adaptateur secondaire qui passe par l'adaptateur primaire `TypeScriptChargementDeLAtelier` du contexte `atelier`. Aucun import direct de son domaine.
- Le nombre de gestes en attente et l'effacement des journaux arrivent de la même façon, par le port `JournauxDeLAtelierPort` et l'adaptateur primaire `TypeScriptEffacementDesJournaux`. Le comptage ne couvre que l'entreprise courante et son échec rejette vers la page, qui affiche alors un avertissement générique sans bloquer la réinitialisation.
- `reinitialiser()` coupe d'abord tout échange par la déconnexion, remet aussitôt l'écran à la demande pour que le pavé disparaisse sans attendre, efface les journaux, puis seulement reprend l'enrôlement : un nouvel enrôlement ne démarre jamais avant la fin de l'effacement. Son échec part au gestionnaire d'erreurs et la réinitialisation continue.
- Le chargement de l'atelier ne rejette jamais vers l'appelant : son échec part au gestionnaire d'erreurs et revient comme l'issue `ECHEC`, sinon le démarrage du runtime s'interromprait avant d'installer ses écouteurs.

## Règles locales

Le QR code est produit dans le bundle et rendu par un `<path>` unique dans un `<svg>` en ligne : ni `innerHTML`, ni `DomSanitizer`, ni origine externe. Ses couleurs viennent des tokens. Voir [ADR 0027](../../../../../../documentation/adr/0027-encode-the-enrolment-qr-code-in-the-bundle.md).

Les tableaux de providers qui nomment `TypeScriptChargementDeLAtelier` et `TypeScriptEffacementDesJournaux` vivent dans `infrastructure/secondary/atelier/`, pas à la racine de composition : un adaptateur primaire `TypeScript*` ne peut être nommé que depuis un adaptateur secondaire. Les déplacer casse `typescript-primary-caller` et `HexagonalArchTest`. Pour la même raison, les contrats de `ChargementDeLAtelierPort` et de `JournauxDeLAtelierPort` sont les seuls specs du contexte à ne pas être colocalisés : ils vivent dans `src/test/webapp/unit/`, hors de la portée de ces règles.

`glm-qr-code` reste un adaptateur primaire de ce contexte tant qu'un seul écran l'utilise. Ne pas le promouvoir dans le design system par anticipation.

Le `user_code` s'affiche tel que le serveur l'a émis. L'espacement visuel entre ses groupes vient de la typographie, jamais d'une altération de la chaîne : ce qui est lu doit être ce qui est saisi.

Le geste de réinitialisation exige un appui continu de trois secondes sur le logo puis une confirmation modale. Il est indisponible tant qu'un opérateur est désigné, puisque l'en-tête montre alors son identité à la place du logo. À l'ouverture de la modale, la page demande le nombre de gestes en attente : la confirmation reste désactivée tant qu'il est inconnu. Au-delà de zéro, la modale l'annonce et le bouton devient « Réinitialiser quand même ». Si le comptage échoue, elle affiche un avertissement générique et la confirmation reste active : la réinitialisation n'est jamais bloquée pour de bon.

Une perte définitive d'autorisation ramène au même parcours visible via `PupitreRuntime`, après retrait durable du credential exact. Le contexte ne connaît ni le renouvellement ni les refus HTTP; [Authentication](../../../../../../documentation/authentication.md) possède cette couture.

Lire [Authentication](../../../../../../documentation/authentication.md) avant de toucher au port d'enrôlement ou au device grant, et [Offline pupitre](../../../../../../documentation/offline-pupitre.md) avant de changer le démarrage du runtime ou la composition de la page.
