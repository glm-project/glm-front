const ISO_ABSOLU = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
const LONGUEUR_DATE_HEURE = 19;

const rereadAsUtc = (dateHeure: string): string | undefined => {
  const relecture = new Date(`${dateHeure}Z`);
  return Number.isNaN(relecture.getTime()) ? undefined : relecture.toISOString().slice(0, LONGUEUR_DATE_HEURE);
};

const dateHeureExiste = (instant: string): boolean => {
  const dateHeure = instant.slice(0, LONGUEUR_DATE_HEURE);
  return rereadAsUtc(dateHeure) === dateHeure;
};

const estInstantAbsolu = (instant: string): boolean => {
  if (!ISO_ABSOLU.test(instant)) {
    return false;
  }
  return dateHeureExiste(instant);
};

export class InstantDeReleve {
  readonly value: Date;

  constructor(instant: string) {
    if (!estInstantAbsolu(instant)) {
      throw new Error('L’instant reçu du serveur n’est pas un instant absolu.');
    }
    this.value = new Date(Date.parse(instant));
  }

  estAvant(autre: InstantDeReleve): boolean {
    return this.value.getTime() < autre.value.getTime();
  }

  estLeMeme(autre: InstantDeReleve): boolean {
    return this.value.getTime() === autre.value.getTime();
  }

  estUnAutreJourQue(autre: InstantDeReleve): boolean {
    return this.value.toDateString() !== autre.value.toDateString();
  }
}
