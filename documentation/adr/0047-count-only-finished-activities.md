# 0047 — Comptabiliser les activités terminées et signaler leurs fins automatiques

## Status

Accepted — décisions métier confirmées le 29 septembre 2026, consommateurs pupitre et lecteurs Gestion
du relevé et du coût mis en œuvre ; le front épingle le backend final publié après retrait et alignement
documentaire. Les validations de publication portent sur leurs commits exacts ; ce statut ne remplace
aucun résultat de CI ni contrôle visuel.
Ce document fixe la comptabilisation et le traitement des fins reçues tardivement.
La fin automatique est dérivée, avec conservation des seuls pointages et régularisations.
Le recalcul après régularisation et l'instant commun du relevé sont confirmés.
Amended by [ADR 0049](0049-forget-integrated-gestures-at-reference-activation.md) : le journal du pupitre
n'est plus un historique ; TOUT ARRÊTER conserve les pending, les refus et ce que la dernière pause lit
encore, et les gestes acceptés déjà intégrés au référentiel sont oubliés à son activation.

Amended on 2026-10-09 by [ADR 0054](0054-ignore-incoherent-pointages-at-reception.md) (lot B9 of #254) : le serveur
ignore les pointages qui ne s'accordent pas avec l'état de leur clé au lieu d'en faire des conflits. **Ne tiennent
plus** : les séquences en conflit et leur résolution par le gestionnaire ; l'activité visée, l'intention et la cible
des gestes ; la distinction ouverture / transition / fin ; les durées et coûts « à résoudre » et les totaux
incomplets ; la correction et l'annulation d'un pointage ; la durée de 13 h écrite en dur dans le front (le
référentiel la porte) ; le geste exactement à l'échéance qui l'emporte sur la fin automatique. **Tiennent encore** :
la comptabilisation des seules activités terminées, la fin automatique dérivée à la lecture, la régularisation de
la fin par le gestionnaire au-delà de l'échéance, l'instant d'évaluation commun du relevé, la durée indicative du
pupitre et la restitution du back par la supervision, le relevé et le coût. Le texte qui suit ne garde que ce
qui tient ; l'ancien texte est dans `git log`.

## Context

Le relevé et le coût de revient doivent distinguer une activité encore en cours d'une activité terminée.
Une activité oubliée doit finir automatiquement après la durée maximale d'une activité (13 heures écoulées
aujourd'hui), avec une anomalie visible.
Le pupitre fournit aussi une durée indicative pour aider l'opérateur pendant son travail.

## Considered options

- Comptabiliser dès la fin, y compris automatique, et signaler l'anomalie — **kept**.
- Attendre une validation de la fin automatique — écarté : le propriétaire confirme la comptabilisation immédiate.
- Inclure les activités en cours dans le seul diviseur humain — écarté : le propriétaire demande leur exclusion totale du coût.
- Calculer la fin automatique et son anomalie depuis les faits, sans écriture automatique — **kept**.
- Persister un événement de clôture automatique et le cycle de résolution de son anomalie — écarté :
  le propriétaire retient uniquement un historique de pointages et de régularisations.
- Faire de l'échéance un plafond absolu — écarté : le gestionnaire doit pouvoir restituer une durée réelle supérieure.
- Conserver les pointages contradictoires et laisser le gestionnaire trancher — retenu à l'origine, remplacé par
  l'[ADR 0054](0054-ignore-incoherent-pointages-at-reception.md) : le coût de ce modèle excédait ce qu'il protégeait.
- Refuser automatiquement le dernier pointage reçu ou choisir une interprétation selon l'ordre de réception — écarté
  à l'origine ; l'ADR 0054 ignore selon l'état de la clé, non selon l'ordre de réception seul.

## Decision

Le back possède le calcul des durées et des coûts ; les vues affichent les valeurs reçues.
Une activité en cours ne produit aucune durée comptabilisée. Elle est entièrement exclue du coût,
y compris du diviseur utilisé pour partager le taux humain entre postes distincts.

La fin automatique et son anomalie sont dérivées à la lecture avec un instant d'évaluation explicite.
Aucun événement automatique n'est persisté et aucun traitement planifié n'est nécessaire pour clôturer.
La règle s'applique aussi aux commandes : un nouveau début à 23 h laisse un trou de 21 h à 23 h après
une fin automatique à 21 h. Une régularisation explicite demeure distinguable d'un simple pointage pour
pouvoir établir une fin réelle au-delà de l'échéance.

**Régularisation du gestionnaire** : acte explicite qui place la fin réelle d'une activité arrêtée par la fin
automatique. Elle peut dépasser l'échéance, sans dépasser le début suivant sur la clé ni la clôture. Sa qualité de
régularisation est persistée ; la différence entre heure de survenue et heure d'enregistrement caractérise aussi les
pointages hors ligne et ne permet pas de lui attribuer ce pouvoir.

Une fin automatique à début + durée maximale rend immédiatement l'activité comptabilisable et valorisable.
Les vues front concernées signalent l'anomalie fournie par le back. Le contrat doit donc porter
l'information nécessaire à ce signalement. Une régularisation du gestionnaire peut déplacer la fin,
y compris au-delà de l'échéance.

Un appui du pupitre qui change la catégorie d'une activité la termine et en ouvre une autre, avec une nouvelle
échéance. Travail à 08 h puis NC à 12 h rendent immédiatement comptabilisables les 4 h de travail ; la NC reste
en cours, avec une échéance 13 h plus tard, à 01 h le lendemain.

Un `FIN` survenu strictement avant l'échéance est accepté tant que l'activité est en cours, même lorsqu'il est reçu après
elle : les rapports sont recalculés selon l'heure métier, début à 08 h et fin à 17 h reçue le lendemain donnent 9 h. Un
`FIN` survenu à l'échéance ou après est ignoré et conserve la fin automatique : un geste à 23 h ne prolonge pas de
lui-même une activité automatiquement terminée à 21 h. Une régularisation explicite du gestionnaire est alors
nécessaire pour retenir une fin plus tardive.

**Instant d'évaluation du relevé** : instant commun à la synthèse et à la feuille qui composent un
relevé. Il assure la même décision d'expiration dans les deux lectures, sans garantir un instantané
transactionnel face aux écritures concurrentes. Le port unique du relevé conserve la composition
des deux lectures dans son adapter. Un instant passé est accepté ; un instant jusqu'à l'heure serveur plus deux
minutes incluses l'est aussi. Au-delà, la lecture est refusée (400). Ce paramètre gouverne l'expiration des faits
connus et ne transforme pas les rapports en lectures historiques.

**Anomalie active** : alerte attachée à une fin automatique qui n'a pas été remplacée par une fin
réelle recevable. Une telle régularisation retire l'alerte des vues par recalcul. L'historique conserve
uniquement les pointages et régularisations ; aucun cycle de vie d'anomalie n'est persisté.

Le pupitre conserve une durée écoulée indicative, figée à l'ouverture de la fenêtre opérateur.
Cette indication n'est pas une durée comptabilisée. Le rapport de coût peut préciser que les
activités en cours sont exclues de son calcul. Le pupitre calcule localement l'expiration, y compris hors
ligne, sans fabriquer de `FIN` : l'échéance est celle que le référentiel donne, ou l'heure du geste plus la durée
maximale qu'il porte pour une activité ouverte localement. Une activité expirée cesse d'être active et ne peut
plus être mise en pause ; un nouveau début reste possible et libère sa clé. Le socle pupitre applique cette
règle avec l'échéance serveur et l'instant explicite de décision. Son timer d'actionnabilité est distinct
de l'inactivité de désignation. Les captures déjà initiées gardent leur heure.

Le stockage atelier conserve identités et marqueurs ; il utilise une clé atelier versionnée
(`atelier-activites-v2:`) et conserve les documents d'enrôlement et de credentials. TOUT ARRÊTER conserve
l'historique et les pending et efface la reprise dans la même mutation que ses N `FIN`, N=0 inclus.

La supervision lit les alertes réelles dans la projection complète du backend. Elle conserve
l'évaluation, l'échéance et la fin retenue reçues ; aucun journal brut n'est réinterprété côté front.
Elle classe chaque opérateur déclaré exactement une fois, dans « Au travail » si au moins une activité
interprétable est en cours, sinon « Sans activité ». Ces deux couloirs restent visibles même vides,
dans cet ordre, avec leurs opérateurs triés alphabétiquement. La NC reste une surcouche d'activité.
La démonstration pose elle-même les échéances de ses activités, depuis l'instant
d'évaluation et sans pointage fabriqué. Une activité sans opérateur identifiable rend la lecture inexploitable.

Le relevé Gestion applique cette lecture : son port unique acquiert les deux rapports avec un
instant d'évaluation commun et vérifie leurs échos comme instants. Les portions calendaires gardent leur
origine et leur état explicite. La frise et le journal opérationnels signalent les fins automatiques.
Le coût Gestion consomme le contrat publié final : les totaux de temps et de montant sont toujours des
valeurs, les activités en cours sont signalées comme entièrement exclues, et les fins automatiques restent
repérables sur les lignes et explicables dans leurs détails.

## Consequences

### Positive

- La fin d'une activité déclenche sa prise en compte sans circuit de validation supplémentaire.
- Les vues signalent les fins automatiques tout en permettant la lecture des rapports.
- Une régularisation peut restituer le travail réel, même supérieur à l'échéance automatique.
- Une fin reçue tardivement restitue l'heure pointée sans régularisation manuelle lorsqu'elle précède l'échéance.

### Negative

- Une panne de lecture de supervision remplace les cartes par une erreur jusqu'à une acquisition réussie.
- Le pupitre doit appliquer la règle d'expiration localement malgré un référentiel périmé.

- L'historique ne prouve pas qu'une anomalie a été calculée ou affichée à une date passée.
- Les lectures et les commandes doivent appliquer la même règle temporelle ; des instants d'évaluation
  différents peuvent encore produire des vues différentes au voisinage de l'échéance.

- À l'échéance, une activité oubliée peut faire passer sa durée comptabilisée de zéro à la durée maximale.
- Un changement de catégorie relance l'échéance : la durée maximale porte sur chaque activité distincte,
  pas sur la durée totale d'un enchaînement d'activités.
- Une fin réellement pointée à l'échéance ou après est ignorée : seule la régularisation explicite prolonge la durée.
- Le coût d'une activité terminée peut diminuer quand une activité simultanée se termine à son tour :
  elle entre alors dans le diviseur du rapport recalculé. Pour un même opérateur à 20 €/h, A de 08 h
  à 10 h coûte 40 € tant que B, sur un autre poste depuis 09 h, reste ouverte. Si B finit à 11 h,
  A coûte désormais 30 € et B 30 € de main-d'œuvre, hors autres activités.
- Un instant commun d'évaluation ne protège pas contre une écriture intervenue entre les deux lectures.
