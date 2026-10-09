import { Cout } from '../montant/Cout';
import { Montant } from '../montant/Montant';
import { DureePassee } from '../temps/DureePassee';
import { PeriodeDeTravail } from '../temps/PeriodeDeTravail';
import { OperateurCite } from './OperateurCite';
import { PartDePointage } from './PartDePointage';
import { PosteCite } from './PosteCite';

export type AnomalieDePointage = 'FIN_AUTOMATIQUE';
export type CategorieDePointage = 'TRAVAIL' | 'NON_CONFORMITE';

export interface FicheDePointage {
  readonly anomalies: readonly AnomalieDePointage[];
  readonly operateur: OperateurCite;
  readonly poste: PosteCite | undefined;
  readonly categorie: CategorieDePointage;
  readonly periode: PeriodeDeTravail;
  readonly duree: DureePassee;
  readonly coutHoraire: Montant | undefined;
  readonly tauxHoraire: Montant | undefined;
  readonly cout: Cout;
  readonly parts: readonly PartDePointage[];
}

export class PointageDeCout {
  readonly anomalies: readonly AnomalieDePointage[];
  readonly operateur: OperateurCite;
  readonly poste: PosteCite | undefined;
  readonly categorie: CategorieDePointage;
  readonly periode: PeriodeDeTravail;
  readonly duree: DureePassee;
  readonly coutHoraire: Montant | undefined;
  readonly tauxHoraire: Montant | undefined;
  readonly cout: Cout;
  readonly parts: readonly PartDePointage[];

  constructor(fiche: FicheDePointage) {
    this.anomalies = [...fiche.anomalies];
    this.operateur = fiche.operateur;
    this.poste = fiche.poste;
    this.categorie = fiche.categorie;
    this.periode = fiche.periode;
    this.duree = fiche.duree;
    this.coutHoraire = fiche.coutHoraire;
    this.tauxHoraire = fiche.tauxHoraire;
    this.cout = fiche.cout;
    this.parts = [...fiche.parts];
  }

  porte(anomalie: AnomalieDePointage): boolean {
    return this.anomalies.includes(anomalie);
  }

  estEnAnomalie(): boolean {
    return this.anomalies.length > 0;
  }

  estUneNonConformite(): boolean {
    return this.categorie === 'NON_CONFORMITE';
  }

  detailleSonPartage(): boolean {
    return this.parts.length > 1 || this.parts.some(part => part.estPartagee());
  }
}
