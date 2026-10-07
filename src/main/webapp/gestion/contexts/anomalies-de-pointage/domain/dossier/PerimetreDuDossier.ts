import { DossierAnomalie, PointageAnomalie } from './DossierAnomalie';
import { OperateurAnomalieId } from './OperateurAnomalieId';
import { PointageAnomalieId } from './PointageAnomalieId';

export class PerimetreDuDossier {
  constructor(private readonly pointages: readonly PointageAnomalieId[]) {}

  pointagesDe(dossier: Pick<DossierAnomalie, 'journal' | 'diagnostics'>): readonly PointageAnomalie[] {
    const retenus = new Set([...this.pointages, ...pointagesCitesPar(dossier.diagnostics ?? [])].map(id => id.pointage));
    return dossier.journal.filter(pointage => retenus.has(pointage.id.pointage));
  }

  horsDe(dossier: Pick<DossierAnomalie, 'journal' | 'diagnostics' | 'operateur'>): readonly PointageAnomalie[] {
    const dansLAnomalie = new Set(this.pointagesDe(dossier).map(pointage => pointage.id.pointage));
    return dossier.journal.filter(
      pointage => !dansLAnomalie.has(pointage.id.pointage) && estDe(dossier.operateur, pointage) && pointage.annulation === undefined,
    );
  }
}

const pointagesCitesPar = (diagnostics: NonNullable<DossierAnomalie['diagnostics']>): readonly PointageAnomalieId[] =>
  diagnostics.flatMap(({ pointage, cible }) => [
    pointage,
    ...(cible.ouvrant ? [cible.ouvrant] : []),
    ...(cible.termineePar ? [cible.termineePar] : []),
  ]);

const estDe = (operateur: OperateurAnomalieId, pointage: PointageAnomalie): boolean =>
  operateur.equals(new OperateurAnomalieId(pointage.fait.operateur));
