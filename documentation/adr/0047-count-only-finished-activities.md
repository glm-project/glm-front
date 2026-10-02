# 0047 — Comptabiliser les activités terminées et signaler leurs fins automatiques

## Status

Accepted — décisions métier confirmées le 29 septembre 2026, consommateurs pupitre et lecteurs Gestion
du relevé et du coût mis en œuvre ; le front épingle le backend final publié après retrait et alignement
documentaire. Les validations de publication portent sur leurs commits exacts ; ce statut ne remplace
aucun résultat de CI ni contrôle visuel.
Ce document fixe la comptabilisation, les transitions et le traitement des fins reçues tardivement.
La fin automatique est dérivée, avec conservation des seuls pointages et corrections.
Le ciblage des gestes, le recalcul après correction et l'instant commun du relevé sont confirmés.
La relecture confirme aussi les séquences en conflit, leur résolution par le gestionnaire et les
totaux incomplets tant que les durées ou coûts concernés restent à résoudre.

## Context

Le relevé et le coût de revient doivent distinguer une activité encore en cours d'une activité terminée.
Une activité oubliée doit finir automatiquement après 13 heures écoulées, avec une anomalie visible.
Le pupitre fournit aussi une durée indicative pour aider l'opérateur pendant son travail.

## Considered options

- Comptabiliser dès la fin, y compris automatique, et signaler l'anomalie — **kept**.
- Attendre une validation de la fin automatique — écarté : le propriétaire confirme la comptabilisation immédiate.
- Inclure les activités en cours dans le seul diviseur humain — écarté : le propriétaire demande leur exclusion totale du coût.
- Calculer la fin automatique et son anomalie depuis les faits, sans écriture automatique — **kept**.
- Persister un événement de clôture automatique et le cycle de résolution de son anomalie — écarté :
  le propriétaire retient uniquement un historique de pointages et corrections.
- Faire de 13 h un plafond absolu — écarté : une correction doit pouvoir restituer une durée réelle supérieure.
- Conserver les pointages contradictoires et laisser le gestionnaire trancher — **kept**.
- Refuser automatiquement le dernier pointage reçu ou choisir une interprétation selon l'ordre de réception — écarté.

## Decision

Le back possède le calcul des durées et des coûts ; les vues affichent les valeurs reçues.
Une activité en cours ne produit aucune durée comptabilisée. Elle est entièrement exclue du coût,
y compris du diviseur utilisé pour partager le taux humain entre postes distincts.

La fin automatique et son anomalie sont dérivées à la lecture avec un instant d'évaluation explicite.
Aucun événement automatique n'est persisté et aucun traitement planifié n'est nécessaire pour clôturer.
La règle s'applique aussi aux commandes : un nouveau début à 23 h laisse un trou de 21 h à 23 h après
une fin automatique à 21 h. Une correction explicite demeure distinguable d'un simple pointage pour
pouvoir établir une fin réelle au-delà de l'échéance.

**Régularisation du gestionnaire** : acte explicite établissant ou corrigeant un fait métier. Lorsqu'une
fin manque, cet acte peut établir une fin réelle au-delà de l'échéance. Sa qualité de régularisation doit
être persistée ; la différence entre heure de survenue et heure d'enregistrement caractérise aussi les
pointages hors ligne et ne permet pas de lui attribuer ce pouvoir.

Une fin automatique à début + 13 h rend immédiatement l'activité comptabilisable et valorisable.
Les vues front concernées signalent l'anomalie fournie par le back. Le contrat doit donc porter
l'information nécessaire à ce signalement. Une correction du gestionnaire peut déplacer la fin,
y compris au-delà de 13 h.

Chaque transition travail/NC termine une activité et en ouvre une autre, avec une nouvelle échéance
de 13 h. Travail à 08 h puis NC à 12 h rendent immédiatement comptabilisables les 4 h de travail ;
la NC reste en cours, avec une échéance à 01 h le lendemain.

Un `FIN` survenu au plus tard à l'échéance remplace la fin automatique même lorsqu'il est reçu après elle.
Les rapports sont recalculés selon l'heure métier : début à 08 h et fin à 17 h reçue le lendemain
donnent 9 h. Un `FIN` survenu après l'échéance conserve la fin automatique : un geste à 23 h
ne prolonge pas de lui-même une activité automatiquement terminée à 21 h. Une correction explicite
du gestionnaire est alors nécessaire pour retenir une fin plus tardive.

Les transitions reçues tardivement sont également reconstruites selon leur heure métier. Un passage
en NC à 12 h reçu le lendemain ferme le travail commencé à 08 h après 4 h et ouvre une NC distincte,
avec échéance à 01 h. Un geste réel exactement à l'échéance l'emporte sur la fin automatique.

**Activité visée** : activité identifiée par son pointage ouvrant, portée par le référentiel et par
les gestes de fin ou de changement de catégorie. Un rejeu et une nouvelle tentative conservent la
même cible. Un geste visant une activité remplacée ne touche jamais sa remplaçante ; la contradiction
avec les faits enregistrés relève de la séquence en conflit définie ci-dessous. Cette décision remplace
le refus automatique envisagé lors du premier cadrage pour ce cas.

**Ouverture, transition et fin** : une ouverture crée une nouvelle activité, y compris en NC ou après
une pause. Une transition désigne obligatoirement l'activité ciblée dont elle ouvre la suivante ;
une fin désigne celle qu'elle termine. Les types `DEBUT` et `NON_CONFORMITE` ne suffisent pas à
distinguer ouverture et transition : le contrat porte cette intention explicitement. Une cible
remplacée par un fait antérieur ne transforme jamais la transition en ouverture implicite ; les
pointages contradictoires restent en conflit.

Une cible seulement échue ne rend pas sa transition contradictoire à elle seule. Travail A commencé
à 08 h et échu à 21 h, puis `NC(A)` à 23 h : A garde sa fin automatique et son anomalie, la NC
s'ouvre à 23 h, et aucune activité ne couvre 21 h à 23 h. La transition conserve sa cible ; si une
correction repousse l'échéance de A après 23 h, le recalcul termine A à l'heure de la transition.

**Séquence en conflit** : ensemble d'activités dont les pointages se contredisent et nécessitent une
décision du gestionnaire. Le domaine `atelier` du back possède cette décision ; les projections en
restituent les conséquences. Les pointages contradictoires sont conservés avec leur cible initiale.
Le résultat doit être le même quel que soit leur ordre de réception, y compris lorsqu'un pointage
déjà accepté devient contradictoire après insertion d'un geste antérieur.

Sur toute séquence en conflit, le pupitre ne déduit aucune activité courante et ne permet qu'une
nouvelle ouverture. Aucune fin ni transition ne cible une activité en conflit. `PAUSE` et
`TOUT ARRÊTER` n'émettent pas de `FIN` pour elle ; `PAUSE` ne la mémorise pas pour une reprise.

Exemple : début du travail A à 08 h, transition A vers NC B à 12 h et `FIN(A)` à 17 h.
Que la transition ou la fin soit reçue en premier, la séquence est « En conflit » ; le système ne
choisit ni d'ignorer la transition ni de fermer B avec la fin de A. Le gestionnaire corrige ou annule
explicitement les faits concernés. Le recalcul retire le conflit lorsque les faits redeviennent
cohérents ; les pointages et corrections restent dans l'historique.

**Durées et coûts à résoudre** : les valeurs affectées par un conflit ne reçoivent pas silencieusement
une interprétation chiffrée. Les rapports exposent leur caractère à résoudre et signalent explicitement
les totaux concernés comme incomplets. Une valeur à résoudre ne se confond pas avec zéro, ni avec une
activité encore en cours. Le back porte la complétude des résultats, y compris des coûts dont le partage
humain dépend de la séquence en conflit ; le front restitue cette information sans recalculer.
La fin automatique à 13 h ne tranche pas un conflit : elle reste une règle de borne par défaut pour
les activités interprétables, distincte d'une contradiction entre pointages.

**Cas tranchés au lancement de la mise en œuvre** (A, B : activités d'un même couple opérateur/poste) :

- Un geste qui vise une activité déjà terminée par une fin réelle met la séquence en conflit : une seconde
  `FIN(A)`, ou une transition depuis A après sa fin.
- À heure métier égale, les gestes se rangent fin, puis transition, puis ouverture ; « remplacée » signifie
  remplacée strictement avant le geste. La date d'enregistrement ne départage jamais.
- Un geste qui vise une ouverture annulée, ou l'annulation d'une ouverture visée, est accepté et met la
  séquence en conflit. Une régularisation, une correction ou une annulation du gestionnaire qui laisse une
  contradiction est acceptée et restituée en conflit, pour permettre une résolution en plusieurs actes.
- Le pouvoir de dépasser l'échéance vaut pour une fin et pour une transition régularisées. Une clôture du
  suivi postérieure à l'échéance ne prolonge pas l'activité.
- Une transition de même catégorie (`DEBUT` visant un travail, `NON_CONFORMITE` visant une NC) est conservée
  en conflit plutôt que refusée : le pupitre n'est jamais bloqué par ce refus.
- Un geste qui vise une activité introuvable dans ce suivi, ou d'un autre couple opérateur/poste, est refusé
  définitivement.
- Une fin visant A remplacée par B met A et B à résoudre.
- L'état d'un suivi se calcule sur ses seules activités interprétables ; le conflit est exposé à part.
- Une `FIN` survenue avant la clôture du suivi mais reçue après elle est enregistrée et appliquée à son
  heure métier ; la clôture reste acquise.
- Une transition qui vise une activité échue alors qu'une autre activité est en cours sur la même clé met
  la séquence en conflit : A 08 h échue à 21 h, relance B 22 h, NC(A) 23 h.

**Précisions confirmées sur corrections et lectures** :

- Déplacer une ouverture vers un autre couple opérateur/poste est refusé (409) tant qu'un geste actif vise
  cette activité depuis l'ancienne clé. Annuler ou corriger ce geste d'abord ; cette garde est l'exception
  explicite à l'acceptation d'une correction laissant une contradiction.
- Une activité à résoudre figure sur chaque jour de sa plage possible, du début à sa fin au plus tard,
  bornée par l'évaluation. Les totaux concernés de ces jours sont incomplets. Une séquence en conflit
  sans activité à résoudre reste exposée tout en laissant ces totaux complets.
- L'incertitude du partage humain couvre toute la plage possible de l'activité à résoudre, sans noyau
  commun calculé entre interprétations possibles. La machine d'une activité terminée reste chiffrée.
- Travail, NC, machine et main-d'œuvre gardent chacun leur complétude. Un total incomplet porte seulement
  cette information, sans zéro ni somme partielle. Le coût liste toutes les séquences responsables,
  y compris sur un autre élément.
- Un instant passé est accepté ; un instant jusqu'à l'heure serveur plus deux minutes incluses l'est
  aussi. Au-delà, la lecture est refusée (400). Ce paramètre gouverne l'expiration des faits connus et
  ne transforme pas les rapports en lectures historiques.
- Un `FIN` pointé après l'échéance reste un fait du journal ; il n'est pas étiqueté « sans effet ».
  L'anomalie de fin automatique décrit déjà la borne retenue.

Les corrections et annulations recalculent les durées, les coûts, les anomalies et l'état courant.
À 22 h, corriger un début de 08 h à 12 h déplace son échéance de 21 h à 01 h : l'activité redevient
en cours, perd son anomalie et sort des durées et coûts comptabilisés.

**Instant d'évaluation du relevé** : instant commun à la synthèse et à la feuille qui composent un
relevé. Il assure la même décision d'expiration dans les deux lectures, sans garantir un instantané
transactionnel face aux écritures concurrentes. Le port unique du relevé conserve la composition
des deux lectures dans son adapter.

**Anomalie active** : alerte attachée à une fin automatique qui n'a pas été remplacée par une fin
réelle recevable. Une telle régularisation retire l'alerte des vues par recalcul. L'historique conserve
uniquement les pointages et corrections ; aucun cycle de vie d'anomalie n'est persisté.

Le pupitre conserve une durée écoulée indicative, figée à l'ouverture de la fenêtre opérateur.
Cette indication n'est pas une durée comptabilisée. Le rapport de coût peut préciser que les
activités en cours sont exclues de son calcul. Le pupitre calcule localement l'expiration à 13 h,
y compris hors ligne, sans fabriquer de `FIN`. Une activité expirée cesse d'être active et ne peut
plus être mise en pause ; un nouveau début reste possible. Le socle pupitre applique maintenant cette
règle avec l'échéance serveur et l'instant explicite de décision. Son timer d'actionnabilité est distinct
de l'inactivité de désignation. Les captures déjà initiées gardent leur heure et cible.

Les réponses de publication 200/201 en conflit restent acceptées et leurs diagnostics sont journalisés
avant le rafraîchissement canonique. Le stockage atelier neuf conserve identités, intentions, cibles et
marqueurs ; il utilise une clé atelier versionnée et conserve les documents d'enrôlement et de credentials. TOUT ARRÊTER conserve
l'historique et les pending et efface la reprise dans la même mutation que ses N FIN ciblés, N=0 inclus.

La supervision lit également les alertes réelles dans la projection complète du backend. Elle conserve
l'évaluation, l'échéance et la fin retenue reçues ; aucun journal brut n'est réinterprété côté front.
Elle classe chaque opérateur déclaré exactement une fois, dans « Au travail » si au moins une activité
interprétable est en cours, sinon « Sans activité ». Ces deux couloirs restent visibles même vides,
dans cet ordre, avec leurs opérateurs triés alphabétiquement. La NC reste une surcouche d'activité.
Les séquences en conflit sont rendues séparément, y compris sans activité à résoudre ; elles ne produisent
aucune activité courante interprétée. Les activités indépendantes du même opérateur restent visibles.
La démonstration dérive la fin automatique à début + 13 heures écoulées, borne inclusive, depuis l'instant
d'évaluation et sans pointage fabriqué. Une activité sans opérateur identifiable rend la lecture inexploitable. Les commandes
back de correction et de résolution sont adaptées et testées. Le propriétaire confirme que l'écran
de correction et de résolution des conflits Gestion relève d'une autre MR.

Le relevé Gestion applique désormais cette lecture : son port unique acquiert les deux rapports avec un
instant d'évaluation commun et vérifie leurs échos comme instants. Les portions calendaires gardent leur
origine et leur état explicite ; les totaux incomplets n'exposent aucun chiffre. La frise et le journal
opérationnels signalent les fins automatiques et les séquences en conflit, sans commande de résolution.
Le coût Gestion consomme maintenant le contrat publié final : chaque catégorie de temps et de montant
restitue sa complétude indépendante, sans valeur si elle est incomplète. Les périodes sans fin certaine
gardent cette absence ; les activités en cours sont signalées comme entièrement exclues. Les fins
automatiques restent repérables sur les lignes et explicables dans leurs détails. Toutes les séquences
responsables, y compris celles d’autres éléments ou sans activité à résoudre, sont visibles sans lecture
supplémentaire ni commande de résolution.

## Consequences

### Positive

- La fin d'une activité déclenche sa prise en compte sans circuit de validation supplémentaire.
- Les vues signalent les fins automatiques tout en permettant la lecture des rapports.
- Une correction peut restituer le travail réel, même supérieur à l'échéance automatique.
- Une fin reçue tardivement restitue l'heure pointée sans correction manuelle lorsqu'elle ne dépasse pas l'échéance.

### Negative

- L'utilisateur peut consulter les anomalies mais doit encore passer par l'API pour les corriger.
- Une panne de lecture de supervision remplace les cartes par une erreur jusqu'à une acquisition réussie.
- Le pupitre doit appliquer la règle d'expiration localement malgré un référentiel périmé.

- L'historique ne prouve pas qu'une anomalie a été calculée ou affichée à une date passée.
- Les lectures et les commandes doivent appliquer la même règle temporelle ; des instants d'évaluation
  différents peuvent encore produire des vues différentes au voisinage de l'échéance.

- À l'échéance, une activité oubliée peut faire passer sa durée comptabilisée de zéro à 13 h.
- Une transition travail/NC relance l'échéance : les 13 h portent sur chaque activité distincte,
  pas sur la durée totale d'un enchaînement d'activités.
- Une fin réellement pointée après l'échéance nécessite une correction explicite pour prolonger la durée.
- Le coût d'une activité terminée peut diminuer quand une activité simultanée se termine à son tour :
  elle entre alors dans le diviseur du rapport recalculé. Pour un même opérateur à 20 €/h, A de 08 h
  à 10 h coûte 40 € tant que B, sur un autre poste depuis 09 h, reste ouverte. Si B finit à 11 h,
  A coûte désormais 30 € et B 30 € de main-d'œuvre, hors autres activités.
- Le contrat et le stockage des gestes doivent porter la cible précise ; la correction d'un début
  doit préserver le rattachement de ses gestes malgré l'annulation/remplacement du fait initial.
- Une correction peut faire réapparaître une activité en cours et diminuer les totaux déjà affichés.
- Un instant commun d'évaluation ne protège pas contre une écriture intervenue entre les deux lectures.
- Une réception tardive peut rendre incomplets des rapports jusque-là chiffrés ; la résolution par le
  gestionnaire est nécessaire pour arrêter les durées et coûts affectés.
- Le contrat de publication doit distinguer la conservation d'un pointage en conflit d'un refus de
  l'enregistrer ; le pupitre doit conserver son identité et sa cible lors des nouvelles tentatives.
