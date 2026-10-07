import { DossierAnomalie, PointageAnomalie } from './DossierAnomalie';
import { PointageAnomalieId } from './PointageAnomalieId';

export class PerimetreDuDossier {
  constructor(private readonly pointages: readonly PointageAnomalieId[]) {}

  pointagesDe(dossier: Pick<DossierAnomalie, 'journal' | 'diagnostics'>): readonly PointageAnomalie[] {
    const retenus = new Set([...this.pointages, ...pointagesCitesPar(dossier.diagnostics ?? [])].map(id => id.pointage));
    return dossier.journal.filter(pointage => retenus.has(pointage.id.pointage));
  }
}

const pointagesCitesPar = (diagnostics: NonNullable<DossierAnomalie['diagnostics']>): readonly PointageAnomalieId[] =>
  diagnostics.flatMap(({ pointage, cible }) => [
    pointage,
    ...(cible.ouvrant ? [cible.ouvrant] : []),
    ...(cible.termineePar ? [cible.termineePar] : []),
  ]);
