const FORMAT = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)(?:\.\d+)?S)?$/;
const MINUTES_PAR_HEURE = 60;
const SECONDES_PAR_MINUTE = 60;
const MILLISECONDES_PAR_MINUTE = 60_000;

const messageDeRefus = (value: string): string => `La durée « ${value} » reçue du serveur n’est pas une durée de pointage.`;

const composantesDe = (value: string): readonly (string | undefined)[] | undefined => {
  const composantes: readonly (string | undefined)[] | undefined = FORMAT.exec(value)?.slice(1);
  return composantes?.some(composante => composante !== undefined) === true ? composantes : undefined;
};

const minutesDe = (value: string): number => {
  const composantes = composantesDe(value);
  if (composantes === undefined) {
    throw new Error(messageDeRefus(value));
  }
  const [heures, minutes, secondes] = composantes;
  return Number(heures ?? 0) * MINUTES_PAR_HEURE + Number(minutes ?? 0) + Math.floor(Number(secondes ?? 0) / SECONDES_PAR_MINUTE);
};

export class DureeTravaillee {
  readonly heures: number;
  readonly minutesRestantes: number;

  constructor(value: string) {
    const minutes = minutesDe(value);
    this.heures = Math.floor(minutes / MINUTES_PAR_HEURE);
    this.minutesRestantes = minutes % MINUTES_PAR_HEURE;
  }

  static entre(debut: Date, fin: Date): DureeTravaillee {
    return new DureeTravaillee(`PT${String(Math.floor((fin.getTime() - debut.getTime()) / MILLISECONDES_PAR_MINUTE))}M`);
  }
}
