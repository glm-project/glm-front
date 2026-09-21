/**
 * La forme qu'`java.time.Duration` sérialise : heures, minutes et secondes seulement, heures non bornées,
 * et `PT0S` pour une durée nulle. Les jours et les semaines sont donc refusés — le back n'en produit pas.
 */
const FORMAT = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)(?:\.\d+)?S)?$/;
const MINUTES_PAR_HEURE = 60;
const SECONDES_PAR_MINUTE = 60;

const messageDeRefus = (value: string): string => `La durée « ${value} » reçue du serveur n’est pas un temps passé.`;

interface Composantes {
  readonly heures: string | undefined;
  readonly minutes: string | undefined;
  readonly secondes: string | undefined;
}

const composantesDe = (value: string): Composantes | undefined => {
  const parties = FORMAT.exec(value);
  return parties === null ? undefined : { heures: parties[1], minutes: parties[2], secondes: parties[3] };
};

/** `PT` seul respecte le format sans porter de durée : il est refusé comme le reste. */
const estVide = (composantes: Composantes): boolean =>
  [composantes.heures, composantes.minutes, composantes.secondes].every(composante => composante === undefined);

/**
 * Les secondes sont tronquées — un rapport s'affiche en heures et minutes — mais elles sont lues, sans quoi
 * `PT45S` passerait pour une durée que le serveur n'a pas écrite.
 */
const minutesDe = (composantes: Composantes): number =>
  Number(composantes.heures ?? 0) * MINUTES_PAR_HEURE
  + Number(composantes.minutes ?? 0)
  + Math.floor(Number(composantes.secondes ?? 0) / SECONDES_PAR_MINUTE);

/** Un temps passé sur un élément de fabrication, lu du serveur et jamais dérivé ici. */
export class DureePassee {
  readonly minutes: number;
  readonly heures: number;
  readonly minutesRestantes: number;

  constructor(value: string) {
    const composantes = composantesDe(value);
    if (composantes === undefined) {
      throw new Error(messageDeRefus(value));
    }
    if (estVide(composantes)) {
      throw new Error(messageDeRefus(value));
    }
    this.minutes = minutesDe(composantes);
    this.heures = Math.floor(this.minutes / MINUTES_PAR_HEURE);
    this.minutesRestantes = this.minutes % MINUTES_PAR_HEURE;
  }

  estNulle(): boolean {
    return this.minutes === 0;
  }
}
