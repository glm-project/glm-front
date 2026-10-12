import { JourCalendaire } from '../semaine/JourCalendaire';
import { SemaineISO } from '../semaine/SemaineISO';
import { MoisCivil } from './MoisCivil';

export type BorneDuRapport =
  { readonly genre: 'SEMAINE'; readonly semaine: SemaineISO } | { readonly genre: 'MOIS'; readonly mois: MoisCivil };

export class PeriodeDuRapport {
  private constructor(readonly borne: BorneDuRapport) {}

  static semaineContenant(jour: JourCalendaire): PeriodeDuRapport {
    return new PeriodeDuRapport({ genre: 'SEMAINE', semaine: SemaineISO.contenant(jour) });
  }

  static moisContenant(jour: JourCalendaire): PeriodeDuRapport {
    return new PeriodeDuRapport({ genre: 'MOIS', mois: MoisCivil.contenant(jour) });
  }

  premierJour(): JourCalendaire {
    return this.borne.genre === 'SEMAINE' ? this.borne.semaine.lundi() : this.borne.mois.premierJour();
  }

  dernierJour(): JourCalendaire {
    return this.borne.genre === 'SEMAINE' ? this.borne.semaine.dimanche() : this.borne.mois.dernierJour();
  }

  precedente(): PeriodeDuRapport | undefined {
    return this.borne.genre === 'SEMAINE'
      ? PeriodeDuRapport.deSemaine(this.borne.semaine.precedente())
      : PeriodeDuRapport.deMois(this.borne.mois.precedent());
  }

  suivante(aujourdhui: JourCalendaire): PeriodeDuRapport | undefined {
    const suivante =
      this.borne.genre === 'SEMAINE'
        ? PeriodeDuRapport.deSemaine(this.borne.semaine.suivante())
        : PeriodeDuRapport.deMois(this.borne.mois.suivant());
    return suivante !== undefined && suivante.premierJour().jourEpoque <= aujourdhui.jourEpoque ? suivante : undefined;
  }

  enSemaine(aujourdhui: JourCalendaire): PeriodeDuRapport {
    return PeriodeDuRapport.semaineContenant(this.jourDeReference(aujourdhui));
  }

  enMois(aujourdhui: JourCalendaire): PeriodeDuRapport {
    return PeriodeDuRapport.moisContenant(this.jourDeReference(aujourdhui));
  }

  private jourDeReference(aujourdhui: JourCalendaire): JourCalendaire {
    return aujourdhui.jourEpoque > this.dernierJour().jourEpoque ? this.premierJour() : aujourdhui;
  }

  private static deSemaine(semaine: SemaineISO | undefined): PeriodeDuRapport | undefined {
    return semaine === undefined ? undefined : new PeriodeDuRapport({ genre: 'SEMAINE', semaine });
  }

  private static deMois(mois: MoisCivil | undefined): PeriodeDuRapport | undefined {
    return mois === undefined ? undefined : new PeriodeDuRapport({ genre: 'MOIS', mois });
  }
}
