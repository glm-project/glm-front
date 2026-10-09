import { DureeTravaillee } from './duree/DureeTravaillee';
import { JourDePointages } from './JourDePointages';
import { JourCalendaire } from './semaine/JourCalendaire';
import { SemaineISO } from './semaine/SemaineISO';

const correspondentALaSemaine = (semaine: SemaineISO, jours: readonly JourDePointages[]): boolean => {
  const attendus = semaine.jours();
  return jours.length === attendus.length && attendus.every((attendu, rang) => jours[rang]?.jour.estLeMeme(attendu) === true);
};

export class PointagesDeLaSemaine {
  constructor(
    readonly semaine: SemaineISO,
    readonly total: DureeTravaillee,
    private readonly jours: readonly JourDePointages[],
  ) {
    if (!correspondentALaSemaine(semaine, jours)) {
      throw new Error(`Les jours reçus ne sont pas les sept jours de la semaine ${String(semaine.numero)} de ${String(semaine.annee)}.`);
    }
  }

  joursPointes(): readonly JourDePointages[] {
    return this.jours.filter(jour => jour.estPointe());
  }

  aDesActivitesEnCours(): boolean {
    return this.jours.some(jour => jour.activitesEnCours() > 0);
  }

  jourDu(jour: JourCalendaire): JourDePointages | undefined {
    return this.jours.find(candidat => candidat.jour.estLeMeme(jour));
  }

  jourParDefaut(aujourdhui: JourCalendaire): JourDePointages | undefined {
    return this.jourDu(aujourdhui) ?? this.joursPointes()[0];
  }
}
