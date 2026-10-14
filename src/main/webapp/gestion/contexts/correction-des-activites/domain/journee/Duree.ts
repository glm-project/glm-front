import { InstantDeLaJournee } from './InstantDeLaJournee';

const FORMAT = /^PT(?=\d)(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/;
const MILLISECONDES_PAR_SECONDE = 1000;
const MILLISECONDES_PAR_MINUTE = 60 * MILLISECONDES_PAR_SECONDE;
const MILLISECONDES_PAR_HEURE = 60 * MILLISECONDES_PAR_MINUTE;

interface Composantes {
  readonly heures: string | undefined;
  readonly minutes: string | undefined;
  readonly secondes: string | undefined;
}

const composantesDe = (value: string): Composantes | undefined => {
  const parties = FORMAT.exec(value);
  return parties === null ? undefined : { heures: parties[1], minutes: parties[2], secondes: parties[3] };
};

const millisecondesDe = (composantes: Composantes): number =>
  Number(composantes.heures ?? 0) * MILLISECONDES_PAR_HEURE
  + Number(composantes.minutes ?? 0) * MILLISECONDES_PAR_MINUTE
  + Math.round(Number(composantes.secondes ?? 0) * MILLISECONDES_PAR_SECONDE);

export class Duree {
  readonly millisecondes: number;

  constructor(value: string) {
    const composantes = composantesDe(value);
    if (composantes === undefined) {
      throw new Error(`La durée « ${value} » reçue du serveur n’est pas une durée.`);
    }
    this.millisecondes = millisecondesDe(composantes);
  }

  static entre(debut: InstantDeLaJournee, fin: InstantDeLaJournee): Duree {
    return Duree.deMillisecondes(fin.value.getTime() - debut.value.getTime());
  }

  plus(autre: Duree): Duree {
    return Duree.deMillisecondes(this.millisecondes + autre.millisecondes);
  }

  moins(autre: Duree): Duree {
    if (autre.millisecondes > this.millisecondes) {
      throw new Error('Une durée ne peut pas être retranchée d’une durée plus courte.');
    }
    return Duree.deMillisecondes(this.millisecondes - autre.millisecondes);
  }

  private static deMillisecondes(millisecondes: number): Duree {
    return new Duree(`PT${millisecondes / MILLISECONDES_PAR_SECONDE}S`);
  }
}
