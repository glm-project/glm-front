import { components } from '@/app/generated/schema';
import { dataSelector } from '../../DataSelector';
import { autreOperateurFixture, dossierFixture, journalFixture, operateurFixture } from './AnomaliesHttp.fixture';
import { instantLocalFixture } from './InstantLocal.fixture';
import { markerOf } from './SelectionDuPointage';

type PointageRecu = components['schemas']['RestEvenementDAtelier'];
type DossierRecu = components['schemas']['RestDossierAnomalie'];

export const plusTotLeJourMemeFixture = '72000000-0000-0000-0000-000000000001';
export const pendantLaPeriodeFixture = '72000000-0000-0000-0000-000000000002';
export const annuleHorsAnomalieFixture = '72000000-0000-0000-0000-000000000003';
export const veilleFixture = '72000000-0000-0000-0000-000000000004';
export const avantVeilleFixture = '72000000-0000-0000-0000-000000000005';
export const lendemainFixture = '72000000-0000-0000-0000-000000000006';
export const autreOperateurHorsAnomalieFixture = '72000000-0000-0000-0000-000000000007';

export const instantPlusTotLeJourMemeFixture = instantLocalFixture(new Date(2026, 8, 14, 6, 0));
export const instantPendantLaPeriodeFixture = instantLocalFixture(new Date(2026, 8, 14, 10, 0));
export const instantAnnuleHorsAnomalieFixture = instantLocalFixture(new Date(2026, 8, 14, 9, 30));
export const instantVeilleFixture = instantLocalFixture(new Date(2026, 8, 11, 9, 0));
export const instantAvantVeilleFixture = instantLocalFixture(new Date(2026, 8, 10, 14, 0));
export const instantLendemainFixture = instantLocalFixture(new Date(2026, 8, 15, 8, 0));
export const instantAutreOperateurFixture = instantLocalFixture(new Date(2026, 8, 14, 9, 0));

const pointageHorsAnomalieFixture = (id: string, instant: string, operateurId = operateurFixture): PointageRecu => ({
  id,
  type: 'DEBUT',
  intention: 'OUVERTURE',
  activite: id,
  dateDeSurvenue: instant,
  operateurId,
  auteur: 'camille',
  dateDEnregistrement: '2026-09-15T09:00:00Z',
  estUneRegularisation: false,
});

export const pointagesHorsAnomalieFixture: readonly PointageRecu[] = [
  pointageHorsAnomalieFixture(avantVeilleFixture, instantAvantVeilleFixture),
  pointageHorsAnomalieFixture(veilleFixture, instantVeilleFixture),
  pointageHorsAnomalieFixture(plusTotLeJourMemeFixture, instantPlusTotLeJourMemeFixture),
  pointageHorsAnomalieFixture(autreOperateurHorsAnomalieFixture, instantAutreOperateurFixture, autreOperateurFixture),
  {
    ...pointageHorsAnomalieFixture(annuleHorsAnomalieFixture, instantAnnuleHorsAnomalieFixture),
    annulation: { motif: 'Double appui', auteur: 'gestionnaire', date: '2026-09-15T09:30:00Z' },
  },
  pointageHorsAnomalieFixture(pendantLaPeriodeFixture, instantPendantLaPeriodeFixture),
  pointageHorsAnomalieFixture(lendemainFixture, instantLendemainFixture),
];

export const pointagesDeLAnomalieFixture: readonly string[] = journalFixture.map(pointage => pointage.id);
export const dossierAuJournalDebordantFixture = (): DossierRecu => {
  const dossier = dossierFixture();
  return {
    ...dossier,
    suivi: { ...dossier.suivi, journal: [...journalFixture, ...pointagesHorsAnomalieFixture] },
  };
};

export const thenOnlyThePointagesOfTheAnomalyAreDrawn = (): void => {
  cy.get(dataSelector('anomalie-frise')).find(dataSelector('anomalie-pointage')).should('have.length', pointagesDeLAnomalieFixture.length);
  for (const pointage of pointagesDeLAnomalieFixture) markerOf(pointage).should('exist');
  for (const pointage of pointagesHorsAnomalieFixture) markerOf(pointage.id).should('not.exist');
};

export const thenTheOperatorsOtherPointagesAreSummarized = (): void => {
  cy.get(dataSelector('anomalie-frise-contexte')).should(
    'have.text',
    'Hors de cette anomalie, Camille Martin compte sur cet élément 1 pointage plus tôt ce jour-là (dès 06:00), 1 pendant cette période et 3 les autres jours.',
  );
};
