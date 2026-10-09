import { TypeDePointage } from '../../journal-du-pupitre/JournalDuPupitre';

export interface PointageDemande {
  readonly type: TypeDePointage;
  readonly posteId?: string;
}

export interface LotDePointagesDemandes {
  readonly premiere: PointageDemande;
  readonly suivantes: readonly PointageDemande[];
}
