# Atelier

Ce contexte appartient exclusivement à `gestion`. Il porte les actes du back-office sur un élément de
fabrication : le **mettre à l'atelier**, le **clôturer** quand il est terminé, et le **rouvrir**. C'est la mise
à l'atelier, et non la création de l'élément, qui le fait apparaître sur l'écran des opérateurs.

Il n'a plus d'écran : la page Produits (`element-de-fabrication`) montre les produits dans leur cycle et fait
ces actes par l'adaptateur primaire que ce contexte lui expose.

## Langage

**Mettre à l'atelier** : l'acte qui engage un élément existant. Il **ne porte aucune date** — ni saisie, ni
proposée. Le back l'horodate sur son horloge au moment du clic.

**Clôturer** : l'acte du gestionnaire qui déclare l'élément terminé. Il le retire des écrans opérateurs. Il ne
fige rien pour le gestionnaire : la régularisation d'une fin automatique reste admise ensuite, bornée par la clôture.

**Rouvrir** : l'acte qui retire la clôture. L'élément redevient pointable.

**Suivi** : le nom d'agrégat du back pour le passage d'un élément à l'atelier. Il n'apparaît jamais à l'écran.

## Modèle de domaine

- **ElementEngageId** : Value Object de l'identifiant de l'élément de fabrication que l'on met à l'atelier.
- **SuiviId** : Value Object de l'identifiant du suivi. C'est lui qui porte les URLs de la clôture et de la
  réouverture.
- **AtelierPort** : port secondaire des trois actes, rendant un `Result<void, Refus>`.
- **Refus** : `ElementDejaALAtelier` (409 `element-deja-engage`) et `ElementDeFabricationIntrouvable` à la mise à
  l'atelier, `SuiviIntrouvable` à la clôture et à la réouverture.

## Responsabilités et invariants

- **Mettre à l'atelier ne porte aucune date.** `RestEngagement` ne contient que l'identifiant de l'élément, et
  le back date sur `clock.now()`. Le client a écarté la planification — « on ne planifie rien avec le
  logiciel ». L'engagement par anticipation, c'est engager **tôt**, pas engager **pour plus tard**.
- **Clôturer envoie un corps vide.** L'API accepte une `dateDeSurvenue` ; aucun écran ne l'envoie. Un champ de
  date sur l'acte le plus courant rouvrirait la planification et hériterait du 409 « journal postérieur ».
- **Un élément ne passe qu'une fois à l'atelier.** Le back refuse de le remettre à l'atelier une fois clôturé
  (`element-deja-engage`) : on rouvre sa clôture.
- **Un engagement fautif ne s'annule pas.** Il n'existe aucun `DELETE /api/atelier/suivis/{id}`, et nous n'en
  demandons pas : le journal est la seule vérité du contexte. La sortie est la clôture immédiate.
- Ce contexte ne dépend d'aucun contexte de `pupitre` et ne partage aucun modèle métier avec lui.
  `HttpAtelierExchange` appartient au pupitre et n'est pas un adapter à étendre ici.

## Relations de contexte

- `app/shared/result` : `Result<T, E>` pour les retours d'écriture.
- La page Produits fait ses actes d'atelier par `TypeScriptActesDAtelier`, l'adaptateur primaire que ce contexte
  lui expose : mettre à l'atelier, clôturer et rouvrir. Il prend et rend des valeurs simples — l'identifiant de
  l'élément ou du suivi, puis le code du refus ou rien — pour que l'appelant n'importe aucun modèle d'ici.
  `element-de-fabrication` le fournit par `actesDAtelierProviders`, et la route `/produits` lie `AtelierPort` à
  `HttpAtelier`.
