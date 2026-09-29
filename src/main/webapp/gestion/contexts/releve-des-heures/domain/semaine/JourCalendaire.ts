const FORMAT = /^(\d{4})-(\d{2})-(\d{2})$/;
const MILLISECONDES_PAR_JOUR = 86_400_000;
const LUNDI = 1;
const DIMANCHE = 7;

export class JourCalendaire {
  readonly value: string;
  readonly jourEpoque: number;

  constructor(value: string) {
    const jourEpoque = JourCalendaire.epoqueDe(value);
    if (jourEpoque === undefined) {
      throw new Error('La date reçue du serveur n’est pas un jour du calendrier.');
    }
    this.value = value;
    this.jourEpoque = jourEpoque;
  }

  private static epoqueDe(value: string): number | undefined {
    const parties = FORMAT.exec(value);
    if (parties === null) {
      return undefined;
    }
    const millisecondes = Date.UTC(Number(parties[1]), Number(parties[2]) - 1, Number(parties[3]));
    return new Date(millisecondes).toISOString().slice(0, 10) === value ? millisecondes / MILLISECONDES_PAR_JOUR : undefined;
  }

  static lire(value: string): JourCalendaire | undefined {
    return JourCalendaire.epoqueDe(value) === undefined ? undefined : new JourCalendaire(value);
  }

  static depuisEpoque(jourEpoque: number): JourCalendaire {
    return new JourCalendaire(new Date(jourEpoque * MILLISECONDES_PAR_JOUR).toISOString().slice(0, 10));
  }

  jourDeLaSemaine(): number {
    return ((this.jourEpoque + 3) % DIMANCHE) + LUNDI;
  }

  plus(jours: number): JourCalendaire {
    return JourCalendaire.depuisEpoque(this.jourEpoque + jours);
  }

  estLeMeme(autre: JourCalendaire): boolean {
    return this.jourEpoque === autre.jourEpoque;
  }
}
