import { JourCalendaire } from './semaine/JourCalendaire';
import { MoisCalendaire } from './semaine/MoisCalendaire';
import { SemaineISO } from './semaine/SemaineISO';

const SEMAINES_CONSULTABLES = 52;
const JOURS_PAR_SEMAINE = 7;

export class PeriodeConsultable {
  readonly semaineCourante: SemaineISO;
  private readonly plusAncienne: SemaineISO;
  private readonly semaines: readonly SemaineISO[];

  constructor(aujourdhui: JourCalendaire) {
    this.semaines = Array.from({ length: SEMAINES_CONSULTABLES + 1 }, (_, rang) =>
      SemaineISO.contenant(aujourdhui.plus((rang - SEMAINES_CONSULTABLES) * JOURS_PAR_SEMAINE)),
    );
    this.semaineCourante = SemaineISO.contenant(aujourdhui);
    this.plusAncienne = SemaineISO.contenant(aujourdhui.plus(-SEMAINES_CONSULTABLES * JOURS_PAR_SEMAINE));
  }

  precedente(semaine: SemaineISO): SemaineISO {
    return semaine.estLaMeme(this.plusAncienne) ? semaine : semaine.precedente();
  }

  suivante(semaine: SemaineISO): SemaineISO {
    return semaine.estLaMeme(this.semaineCourante) ? semaine : semaine.suivante();
  }

  semainesDu(mois: MoisCalendaire): readonly SemaineISO[] {
    return this.semaines.filter(semaine => MoisCalendaire.deLaSemaine(semaine).estLeMeme(mois));
  }

  annees(): readonly number[] {
    return [...new Set(this.semaines.map(semaine => MoisCalendaire.deLaSemaine(semaine).annee))];
  }

  estConsultable(mois: MoisCalendaire): boolean {
    return this.semainesDu(mois).length > 0;
  }
}
