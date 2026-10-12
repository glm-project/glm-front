const ISO_ABSOLU = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
const LONGUEUR_DATE_HEURE = 19;

const dateHeureExiste = (instant: string): boolean => {
  const dateHeure = instant.slice(0, LONGUEUR_DATE_HEURE);
  const relecture = new Date(`${dateHeure}Z`);
  return !Number.isNaN(relecture.getTime()) && relecture.toISOString().slice(0, LONGUEUR_DATE_HEURE) === dateHeure;
};

const estInstantAbsolu = (instant: string): boolean => ISO_ABSOLU.test(instant) && dateHeureExiste(instant);

export class InstantDeLaJournee {
  readonly value: Date;

  constructor(instant: string) {
    if (!estInstantAbsolu(instant)) {
      throw new Error('L’instant reçu du serveur n’est pas un instant absolu.');
    }
    this.value = new Date(Date.parse(instant));
  }

  estAvant(autre: InstantDeLaJournee): boolean {
    return this.value.getTime() < autre.value.getTime();
  }
}
