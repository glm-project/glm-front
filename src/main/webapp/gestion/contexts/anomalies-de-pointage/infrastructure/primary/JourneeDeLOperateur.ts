import { DossierAnomalie } from '../../domain/dossier/DossierAnomalie';
import { identifiantsDesPointagesTardifs } from '../../domain/dossier/PointagesTardifs';
import { jourLocalDe, periodeDeLAnomalie } from './PeriodeDeLAnomalie';
import { selectionInitiale } from './PresentationDossier';

const plusAncienInstant = (dossier: DossierAnomalie, identifiants: ReadonlySet<string>): number | undefined => {
  const instants = dossier.journal
    .filter(pointage => identifiants.has(pointage.id.pointage))
    .map(pointage => Date.parse(pointage.fait.instant))
    .filter(Number.isFinite);
  return instants.length === 0 ? undefined : Math.min(...instants);
};

const identifiantsDuPointageEnCause = (dossier: DossierAnomalie): ReadonlySet<string> => {
  const selection = selectionInitiale(dossier);
  return new Set(selection?.kind === 'POINTAGE' ? [selection.id] : []);
};

export const jourDeLaJournee = (dossier: DossierAnomalie): string | undefined => {
  const instant =
    plusAncienInstant(dossier, identifiantsDesPointagesTardifs(dossier.choix))
    ?? plusAncienInstant(dossier, identifiantsDuPointageEnCause(dossier));
  return instant === undefined ? periodeDeLAnomalie(dossier)?.jourDebut : jourLocalDe(instant);
};
