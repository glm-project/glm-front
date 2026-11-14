# 0060 — Montrer à l'opérateur une horloge de tablette en avance

## Status

`Accepted` le 14 novembre 2026, avec le ticket [#313](https://github.com/glm-project/glm-front/issues/313).

- `Amends 0054`: le refus `date-de-survenue-future` est désormais affiché à l'opérateur, avec la clôture, par un
  libellé fixe du pupitre et non par le message du serveur. Le reste de 0054 tient : tout autre refus, dont
  `pointage-ignore`, reste au journal sans affichage.

## Context

Le serveur refuse en 400 `urn:glm:erreur:atelier:date-de-survenue-future` tout pointage dont l'heure de geste dépasse
de plus de 2 minutes la sienne. Une tablette dont l'horloge avance voit donc chacun de ses pointages refusé. L'ADR 0054
n'affichait que le refus de clôture : le pupitre rangeait ces gestes en refus définitif sans rien montrer, l'opérateur
croyait avoir pointé et la tablette devenait inutilisable sans diagnostic (constat F-011 de l'audit avant production).

Contrairement à un pointage ignoré, ce refus ne se résout pas seul au recalage sur le référentiel : il se répète à
chaque geste tant que l'horloge n'est pas corrigée, et seul un responsable peut la corriger.

## Considered options

- Afficher ce refus par un libellé fixe du pupitre, qui demande de prévenir le responsable — **kept**.
- Afficher le message du serveur, comme pour la clôture — rejected : c'est un message technique qui ne dit pas à
  l'opérateur quoi faire.
- Le garder silencieux, comme le prévoyait 0054 — rejected : la tablette cesse de pointer sans que personne le sache.

## Decision

`MotifDeRefus` reconnaît `date-de-survenue-future` et le montre à l'opérateur, comme `suivi-d-atelier-cloture`. Le
refus exposé par la fenêtre opérateur porte son motif ; le pupitre affiche pour ce motif le libellé « L'heure de cette
tablette est décalée. Prévenez votre responsable. », tenu par `LibellesAtelier`, et garde le message du serveur pour
la clôture. Les autres refus restent silencieux.

## Consequences

### Positive

- L'opérateur sait que son geste n'a pas compté et qui prévenir ; le responsable reçoit un diagnostic.

### Negative

- Un refus reçu au rejeu, une fois la fenêtre opérateur fermée, reste silencieux, comme la clôture : une tablette
  hors ligne qui avance ne le montre qu'au premier geste refusé pendant une fenêtre ouverte.
- Le pupitre ne corrige pas son horloge et ne la compare pas à celle du serveur : il constate le refus sans
  l'anticiper.
