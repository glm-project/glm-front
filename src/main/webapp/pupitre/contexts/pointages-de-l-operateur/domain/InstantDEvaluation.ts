const ISO_ABSOLU = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

const millisecondesDe = (instant: string): number | undefined => {
  const millisecondes = ISO_ABSOLU.test(instant) ? Date.parse(instant) : Number.NaN;
  return Number.isNaN(millisecondes) ? undefined : millisecondes;
};

export class InstantDEvaluation {
  private readonly millisecondes: number;

  constructor(instant: string) {
    const millisecondes = millisecondesDe(instant);
    if (millisecondes === undefined) {
      throw new Error(`L’instant « ${instant} » reçu du serveur n’est pas un instant absolu.`);
    }
    this.millisecondes = millisecondes;
  }

  estLeMeme(autre: InstantDEvaluation): boolean {
    return this.millisecondes === autre.millisecondes;
  }
}
