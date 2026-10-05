import { JourCalendaire } from './semaine/JourCalendaire';
import { SemaineISO } from './semaine/SemaineISO';

const SEMAINES_CONSULTABLES = 52;
const JOURS_PAR_SEMAINE = 7;

export class PeriodeConsultable {
  readonly semaineCourante: SemaineISO;
  private readonly plusAncienne: SemaineISO;

  constructor(aujourdhui: JourCalendaire) {
    this.semaineCourante = SemaineISO.contenant(aujourdhui);
    this.plusAncienne = SemaineISO.contenant(aujourdhui.plus(-SEMAINES_CONSULTABLES * JOURS_PAR_SEMAINE));
  }

  precedente(semaine: SemaineISO): SemaineISO {
    return semaine.estLaMeme(this.plusAncienne) ? semaine : semaine.precedente();
  }

  suivante(semaine: SemaineISO): SemaineISO {
    return semaine.estLaMeme(this.semaineCourante) ? semaine : semaine.suivante();
  }
}
