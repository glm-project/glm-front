import { TypeDePointage } from '../../journal-du-pupitre/JournalDuPupitre';

export interface PointageDemande {
  readonly type: TypeDePointage;
  readonly posteId?: string;
}

export type LotDePointagesDemandes = readonly PointageDemande[];
