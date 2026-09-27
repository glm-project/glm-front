const FORMAT = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)(?:\.\d+)?S)?$/;
const MINUTES_PAR_HEURE = 60;
const SECONDES_PAR_MINUTE = 60;

const messageDeRefus = (value: string): string => `La durée « ${value} » reçue du serveur n’est pas une durée de travail.`;

interface Composantes {
  readonly heures: string | undefined;
  readonly minutes: string | undefined;
  readonly secondes: string | undefined;
}

const composantesDe = (value: string): Composantes | undefined => {
  const parties = FORMAT.exec(value);
  return parties === null ? undefined : { heures: parties[1], minutes: parties[2], secondes: parties[3] };
};

const estVide = (composantes: Composantes): boolean =>
  [composantes.heures, composantes.minutes, composantes.secondes].every(composante => composante === undefined);

const minutesDe = (composantes: Composantes): number =>
  Number(composantes.heures ?? 0) * MINUTES_PAR_HEURE
  + Number(composantes.minutes ?? 0)
  + Math.floor(Number(composantes.secondes ?? 0) / SECONDES_PAR_MINUTE);

export class DureeTravaillee {
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
