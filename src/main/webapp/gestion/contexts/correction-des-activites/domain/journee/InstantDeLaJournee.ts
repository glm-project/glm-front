const ISO_ABSOLU = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
const LONGUEUR_DATE_HEURE = 19;

const dateHeureExiste = (dateHeure: string): boolean => {
  const relecture = new Date(`${dateHeure}Z`);
  return !Number.isNaN(relecture.getTime()) && relecture.toISOString().slice(0, LONGUEUR_DATE_HEURE) === dateHeure;
};

const estInstantAbsolu = (instant: string): boolean => {
  const dateHeure = ISO_ABSOLU.exec(instant)?.[1];
  return dateHeure !== undefined && dateHeureExiste(dateHeure);
};

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
