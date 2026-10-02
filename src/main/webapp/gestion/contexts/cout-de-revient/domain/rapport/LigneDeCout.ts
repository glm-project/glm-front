import { Cout } from '../montant/Cout';
import { AnomalieDePointage, PointageDeCout } from '../pointage/PointageDeCout';
import { TempsPasse } from '../temps/TempsPasse';
import { NatureDOperation } from './NatureDOperation';

const ORDRE_DES_ANOMALIES: readonly AnomalieDePointage[] = ['FIN_AUTOMATIQUE', 'A_RESOUDRE', 'PARTAGE_INCONNU'];

export interface CompteDAnomalies {
  readonly anomalie: AnomalieDePointage;
  readonly nombre: number;
}

export interface FicheDeLigne {
  readonly nature: NatureDOperation | undefined;
  readonly temps: TempsPasse;
  readonly cout: Cout;
  readonly pointages: readonly PointageDeCout[];
}

export class LigneDeCout {
  readonly nature: NatureDOperation | undefined;
  readonly temps: TempsPasse;
  readonly cout: Cout;
  readonly pointages: readonly PointageDeCout[];

  constructor(fiche: FicheDeLigne) {
    this.nature = fiche.nature;
    this.temps = fiche.temps;
    this.cout = fiche.cout;
    this.pointages = [...fiche.pointages];
  }

  estSansPoste(): boolean {
    return this.nature === undefined;
  }

  anomalies(): readonly CompteDAnomalies[] {
    return ORDRE_DES_ANOMALIES.map(anomalie => ({
      anomalie,
      nombre: this.pointages.filter(pointage => pointage.porte(anomalie)).length,
    })).filter(compte => compte.nombre > 0);
  }

  pointagesEnAnomalie(): number {
    return this.pointages.filter(pointage => pointage.estEnAnomalie()).length;
  }

  porteDesAnomalies(): boolean {
    return this.pointagesEnAnomalie() > 0;
  }
}
