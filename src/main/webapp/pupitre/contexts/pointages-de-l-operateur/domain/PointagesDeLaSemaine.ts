import { TotalDeDuree } from './duree/TotalDeDuree';
import { JourDePointages } from './JourDePointages';
import { SemaineISO } from './semaine/SemaineISO';

const correspondentALaSemaine = (semaine: SemaineISO, jours: readonly JourDePointages[]): boolean => {
  const attendus = semaine.jours();
  return jours.length === attendus.length && attendus.every((attendu, rang) => jours[rang]?.jour.estLeMeme(attendu) === true);
};

export class PointagesDeLaSemaine {
  constructor(
    readonly semaine: SemaineISO,
    readonly total: TotalDeDuree,
    private readonly jours: readonly JourDePointages[],
  ) {
    if (!correspondentALaSemaine(semaine, jours)) {
      throw new Error(`Les jours reçus ne sont pas les sept jours de la semaine ${String(semaine.numero)} de ${String(semaine.annee)}.`);
    }
  }

  joursPointes(): readonly JourDePointages[] {
    return this.jours.filter(jour => jour.estPointe());
  }
}
