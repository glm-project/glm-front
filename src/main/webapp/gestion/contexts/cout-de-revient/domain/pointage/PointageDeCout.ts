import { Cout } from '../montant/Cout';
import { Montant } from '../montant/Montant';
import { InstantDeTravail } from '../temps/InstantDeTravail';
import { PeriodeDeTravail } from '../temps/PeriodeDeTravail';
import { TotalDeTemps } from '../temps/TotalDeTemps';
import { OperateurCite } from './OperateurCite';
import { PartDePointage } from './PartDePointage';
import { PointageEnConflit } from './PointageEnConflit';
import { PosteCite } from './PosteCite';

export type AnomalieDePointage = 'FIN_AUTOMATIQUE' | 'A_RESOUDRE' | 'PARTAGE_INCONNU';
export type CategorieDePointage = 'TRAVAIL' | 'NON_CONFORMITE';

export interface FicheDePointage {
  readonly anomalies: readonly AnomalieDePointage[];
  readonly operateur: OperateurCite;
  readonly poste: PosteCite | undefined;
  readonly categorie: CategorieDePointage;
  readonly periode: PeriodeDeTravail;
  readonly finAuPlusTard: InstantDeTravail | undefined;
  readonly duree: TotalDeTemps;
  readonly coutHoraire: Montant | undefined;
  readonly tauxHoraire: Montant | undefined;
  readonly cout: Cout;
  readonly parts: readonly PartDePointage[];
  readonly contradictoires: readonly PointageEnConflit[];
}

export class PointageDeCout {
  readonly anomalies: readonly AnomalieDePointage[];
  readonly operateur: OperateurCite;
  readonly poste: PosteCite | undefined;
  readonly categorie: CategorieDePointage;
  readonly periode: PeriodeDeTravail;
  readonly finAuPlusTard: InstantDeTravail | undefined;
  readonly duree: TotalDeTemps;
  readonly coutHoraire: Montant | undefined;
  readonly tauxHoraire: Montant | undefined;
  readonly cout: Cout;
  readonly parts: readonly PartDePointage[];
  readonly contradictoires: readonly PointageEnConflit[];

  constructor(fiche: FicheDePointage) {
    this.anomalies = [...fiche.anomalies];
    this.operateur = fiche.operateur;
    this.poste = fiche.poste;
    this.categorie = fiche.categorie;
    this.periode = fiche.periode;
    this.finAuPlusTard = fiche.finAuPlusTard;
    this.duree = fiche.duree;
    this.coutHoraire = fiche.coutHoraire;
    this.tauxHoraire = fiche.tauxHoraire;
    this.cout = fiche.cout;
    this.parts = [...fiche.parts];
    this.contradictoires = [...fiche.contradictoires];
  }

  porte(anomalie: AnomalieDePointage): boolean {
    return this.anomalies.includes(anomalie);
  }

  estEnAnomalie(): boolean {
    return this.anomalies.length > 0;
  }

  estAResoudre(): boolean {
    return this.porte('A_RESOUDRE');
  }

  estUneNonConformite(): boolean {
    return this.categorie === 'NON_CONFORMITE';
  }

  detailleSonPartage(): boolean {
    return this.parts.length > 1 || this.parts.some(part => part.estPartagee() || part.partageInconnu());
  }
}
