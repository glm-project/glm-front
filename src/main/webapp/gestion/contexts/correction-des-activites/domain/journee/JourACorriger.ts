const FORMAT = /^(\d{4})-(\d{2})-(\d{2})$/;
const LONGUEUR_DU_JOUR = 'AAAA-MM-JJ'.length;
const MILLISECONDES_PAR_JOUR = 86_400_000;

const existe = (jour: string): boolean => {
  const composantes = FORMAT.exec(jour);
  if (composantes === null) {
    return false;
  }
  const minuit = new Date(Date.UTC(Number(composantes[1]), Number(composantes[2]) - 1, Number(composantes[3])));
  return minuit.toISOString().slice(0, jour.length) === jour;
};

const estUnJourDuCalendrier = (jour: string | null): jour is string => jour !== null && existe(jour);

const decale = (jour: string, jours: number): string =>
  new Date(Date.parse(`${jour}T00:00:00Z`) + jours * MILLISECONDES_PAR_JOUR).toISOString().slice(0, LONGUEUR_DU_JOUR);

export class JourACorriger {
  constructor(readonly value: string) {
    if (!existe(value)) {
      throw new Error('Le jour reçu n’est pas un jour du calendrier.');
    }
  }

  static demande(jour: string | null, aujourdhui: JourACorriger): JourACorriger | undefined {
    if (!estUnJourDuCalendrier(jour)) {
      return undefined;
    }
    const demande = new JourACorriger(jour);
    return demande.estApres(aujourdhui) ? undefined : demande;
  }

  precedent(): JourACorriger {
    return new JourACorriger(decale(this.value, -1));
  }

  lendemain(): JourACorriger {
    return new JourACorriger(decale(this.value, 1));
  }

  suivant(aujourdhui: JourACorriger): JourACorriger | undefined {
    const suivant = this.lendemain();
    return suivant.estApres(aujourdhui) ? undefined : suivant;
  }

  estAvant(autre: JourACorriger): boolean {
    return this.value < autre.value;
  }

  estApres(autre: JourACorriger): boolean {
    return this.value > autre.value;
  }
}
