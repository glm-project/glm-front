# Atelier

Ce contexte appartient exclusivement à `gestion`. Il porte les deux actes du back-office sur un élément de
fabrication : le **mettre à l'atelier**, puis le **clôturer** quand il est terminé. C'est cet acte, et non la
création de l'élément, qui le fait apparaître sur l'écran des opérateurs.

Il ignore tout du pointage : les événements, les temps et la présence ne sont pas de ce contexte.

## Langage

**Mettre à l'atelier** : l'acte qui engage un élément existant. Il **ne porte aucune date** — ni saisie, ni
proposée. Le back l'horodate sur son horloge au moment du clic.

**Clôturer** : l'acte du gestionnaire qui déclare l'élément terminé. Il le retire des écrans opérateurs. Il ne
fige rien pour le gestionnaire : régularisation, annulation et correction restent admises ensuite.

**Rouvrir** : l'acte qui retire la clôture. L'élément redevient pointable.

**Élément à l'atelier** : un élément de fabrication engagé, vu par le back-office. Le mot « suivi » et
l'expression « élément engagé » sont des noms d'agrégat du back : ils n'apparaissent jamais à l'écran.

**Élément engageable** : la vue minimale qu'a ce contexte du référentiel — de quoi désigner un élément et le
choisir. Il n'en connaît ni le libellé, ni les règles de saisie.

**État** : `EN_ATTENTE`, `EN_COURS`, `INTERROMPU` ou `CLOTURE`. **Déduit du journal par le back**, jamais
recalculé ici.

**Filtre** : `ACTIFS` — ce qui est à l'atelier — ou `CLOTURES`. C'est la notion métier ; les états n'en sont que
l'expression.

## Modèle de domaine

- **ElementALAtelier** : agrégat racine, adressé par son seul `suivi`. Il porte son nom et son type copiés à
  l'engagement, son état, son acte d'engagement, son acte de clôture éventuel, et l'identifiant de l'élément
  engagé — qu'aucun acte n'emploie, seulement le lien vers le coût de revient. `estCloture()` répond à la
  question « peut-on encore pointer dessus ».
- **SuiviId** : Value Object de l'identifiant du suivi. **C'est lui, et lui seul, qui porte les URLs de ce
  contexte** — les actes comme les lectures. Le coût de revient n'en est pas une : c'est un autre contexte,
  une autre adresse, et il s'adresse par l'élément.
- **ElementEngageId** : Value Object de l'identifiant de l'élément de fabrication. Il sert à choisir, à
  engager, et à ouvrir le coût de revient — le seul écran qui s'adresse par l'élément et non par le suivi.
  L'agrégat le porte pour ce lien, et pour lui seul. `RestSuiviDAtelierEnGrille` expose les deux — ne pas
  confondre `id` et `element` en lisant la réponse.
- **NomDElementEngage** : Value Object du nom **copié à l'engagement**, non vide.
- **TypeDElementEngage** : union des deux valeurs du type, structurellement compatible avec l'énum de l'API.
- **EtatALAtelier** : union des quatre états déduits par le back.
- **InstantDAtelier** : Value Object d'un instant reçu du back, refusé s'il n'est pas une date valide.
- **ActeDAtelier** : Value Object d'un acte du gestionnaire — son instant et son auteur.
- **FiltreDAtelier** : union des deux intentions de lecture.
- **RequeteAtelier** : objet de requête paginée. `etats()` traduit le filtre métier en états de l'API.
- **ElementEngageable** : vue minimale d'un élément du référentiel, réduite à son identifiant, sa désignation
  et son type.
- **RequeteEngageables** : objet de requête paginée du référentiel engageable.
- **AtelierPort** : port secondaire des deux actes et de la lecture paginée.
- **ElementsEngageablesPort** : port secondaire de lecture du référentiel, propre à ce contexte.
- **Refus** : `ElementDejaALAtelier` et `ElementDeFabricationIntrouvable` à la mise à l'atelier,
  `SuiviIntrouvable` à la clôture et à la réouverture.

## Responsabilités et invariants

- **Mettre à l'atelier ne porte aucune date.** `RestEngagement` ne contient que l'identifiant de l'élément, et
  le back date sur `clock.now()`. Le client a écarté la planification — « on ne planifie rien avec le
  logiciel ». L'engagement par anticipation, c'est engager **tôt**, pas engager **pour plus tard**.
- **Clôturer envoie un corps vide.** L'API accepte une `dateDeSurvenue` ; l'écran ne l'envoie pas. Un champ de
  date sur l'acte le plus courant rouvrirait la planification et hériterait du 409 « journal postérieur ». Le
  déplacement d'une clôture appartient à la correction d'un pointage.
- **`nom` et `type` sont une photographie.** Copiés à l'engagement, ils divergent du référentiel après un
  renommage — c'est l'invariant que cet acte rend possible. Ne jamais aller les rafraîchir.
- **L'élément de fabrication ne porte pas de statut propre.** Son activité se lit par la présence d'un suivi
  non clôturé. C'est cet écran qui rend lisible le « actifs seulement » du client ; le référentiel reste le
  catalogue complet.
- **Le refus enseigne, l'écran ne grise pas.** Le back n'a aucune garde en base sur « un seul suivi non clôturé
  par élément » ; l'écran ne peut pas la répliquer honnêtement, et la fenêtre entre la lecture et le clic
  laisserait le 409 possible de toute façon. `element-deja-engage` se traduit en clair, sans fermer le geste.
- **Réengager un élément clôturé est proposé** — un moule neuf qui revient en modification. Chaque passage
  crée un suivi distinct ; l'histoire s'empile, elle ne se réécrit pas.
- **Un engagement fautif ne s'annule pas.** Il n'existe aucun `DELETE /api/atelier/suivis/{id}`, et nous n'en
  demandons pas : le journal est la seule vérité du contexte. La sortie est la clôture immédiate, et la ligne
  reste dans l'histoire.
- **Aucune action n'est grisée sur un élément clôturé** au prétexte qu'il l'est.
- Ce contexte ne dépend d'aucun contexte de `pupitre` et ne partage aucun modèle métier avec lui.
  `HttpAtelierExchange` appartient au pupitre et n'est pas un adapter à étendre ici.

## Relations de contexte

- `app/shared/result` : `Result<T, E>` pour les retours d'écriture.
- `app/shared/pagination` : `Page<T>` pour les lectures paginées.
- `element-de-fabrication` possède le référentiel et ses règles de saisie. **Ce contexte ne l'importe pas** : il
  lit `/api/elements-de-fabrication` par son propre port, avec sa propre vue minimale. Le lien entre les deux
  écrans est un `routerLink` vers `/atelier?element=<id>`, jamais un import.
- `cout-de-revient` chiffre ce que la fabrication d'un élément a coûté. **Ce contexte ne l'importe pas** : le
  lien est un `routerLink` vers `/couts-de-revient/<id>`, posé sur chaque ligne parce qu'un coût de revient
  ne se consulte qu'une fois l'élément mis à l'atelier. Un élément réengagé occupe plusieurs lignes et tous
  ces liens mènent au même rapport, qui additionne les passages.

## Règles locales

- **La période de `GET /api/atelier/suivis` est facultative** — contrairement à celle du référentiel. Elle n'est
  pas envoyée : ne pas y reproduire l'amplitude inventée par `element-de-fabrication`.
- **Clôturer demande une confirmation, pas la réouverture.** La clôture retire l'élément des écrans opérateurs
  et mérite un geste délibéré ; la rouvrir ne coûte rien à personne.
- Tous les mots affichés vivent dans `LibellesAtelier`, indexés par les valeurs du type et de l'état. Aucun mot
  en dur dans un template.
