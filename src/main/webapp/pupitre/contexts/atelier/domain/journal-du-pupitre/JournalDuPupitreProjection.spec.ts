import {
  EvenementAccepte,
  EvenementDuJournal,
  GesteDePointage,
  JournalDuPupitre,
  OperateurDuPupitre,
  ReferentielDuPupitre,
} from './JournalDuPupitre';
import { projectReferentiel } from './JournalDuPupitreProjection';

const dureeMaximaleFixtureEnMs = 13 * 60 * 60 * 1000;

const isMissingFixture = (value: unknown): value is null | undefined => value === null || value === undefined;

const requiredFixture = <T>(value: T | null | undefined, description: string): T => {
  if (isMissingFixture(value)) {
    throw new Error(`Missing ${description} fixture.`);
  }
  return value;
};

const operateurJeanFixture: OperateurDuPupitre = {
  id: 'jean',
  nom: 'Dupont',
  prenom: 'Jean',
  postes: [],
};
const referenceFixture: ReferentielDuPupitre = {
  operateurs: [operateurJeanFixture],
  suivis: [{ id: 'piece', nom: 'OF-1', categorie: 'MOULE', etat: 'EN_ATTENTE', activites: [], evenements: [] }],
  categories: [],
  dureeMaximaleDActiviteEnMs: dureeMaximaleFixtureEnMs,
};
const debutGesteFixture: GesteDePointage = {
  nature: 'POINTAGE',
  operateurId: 'jean',
  suiviId: 'piece',
  type: 'DEBUT',
  id: 'debut',
  dateDeSurvenue: '2026-09-05T08:00:00Z',
};
const debutFixture: EvenementDuJournal = { geste: debutGesteFixture, etat: 'EN_ATTENTE' };
describe('JournalDuPupitreProjection', () => {
  it('should ignore an accepted event once the canonical reference contains its gesture', () => {
    const state = {
      ...givenEvents([{ geste: debutGesteFixture, etat: 'ACCEPTE' }]),
      referentiel: {
        ...referenceFixture,
        suivis: [{ ...requiredFixture(referenceFixture.suivis[0], 'item'), evenements: ['debut'] }],
      },
    };

    const projected = whenProjecting(state);

    expect(projected?.suivis[0]?.activites).toEqual([]);
  });

  it('should never turn a finish without an activity on its key into an opening', () => {
    const state = givenEvents([
      {
        etat: 'EN_ATTENTE',
        geste: { ...debutGesteFixture, id: 'fin-sans-activite', type: 'FIN' },
      },
    ]);

    const projected = whenProjecting(state);

    expect(projected?.suivis[0]?.activites).toEqual([]);
  });

  it('should reconstruct an offline activity and its original starting time', () => {
    const state = givenEvents([debutFixture]);

    const projection = whenProjecting(state);

    thenActivityIs(projection, 'TRAVAIL', '2026-09-05T08:00:00Z');
    thenActivityHasNoPoste(projection);
  });

  it.each(['DEBUT', 'NON_CONFORMITE'] as const)(
    'should let a %s opening replace an activity of its key once the activity is past its deadline',
    type => {
      const state = givenEventsAfterAnActivityExpired([givenOpeningAt(type, '2026-09-05T20:30:00Z')]);

      const projection = whenProjecting(state);

      thenOnlyActivityIs(projection, type === 'DEBUT' ? 'TRAVAIL' : 'NON_CONFORMITE', '2026-09-05T20:30:00Z');
    },
  );

  it('should free a key at the very instant of its deadline and keep it busy a moment before', () => {
    const atDeadline = givenEventsAfterAnActivityExpired([givenOpeningAt('DEBUT', '2026-09-05T20:00:00Z')]);
    const beforeDeadline = givenEventsAfterAnActivityExpired([givenOpeningAt('DEBUT', '2026-09-05T19:59:59Z')]);

    const freed = whenProjecting(atDeadline);
    const busy = whenProjecting(beforeDeadline);

    thenOnlyActivityIs(freed, 'TRAVAIL', '2026-09-05T20:00:00Z');
    thenOnlyActivityIs(busy, 'TRAVAIL', '2026-09-05T07:00:00Z');
  });

  it('should give a locally opened activity the deadline of the maximum duration received with the reference', () => {
    const state = givenEventsUnderAMaximumDurationOf(8, [debutFixture]);

    const projection = whenProjecting(state);

    thenOnlyActivityDeadlineIs(projection, '2026-09-05T16:00:00.000Z');
  });

  it('should free a key once the maximum duration received has elapsed since its local opening', () => {
    const state = givenEventsUnderAMaximumDurationOf(8, [debutFixture, givenOpeningAt('DEBUT', '2026-09-05T16:00:00Z')]);

    const projection = whenProjecting(state);

    thenOnlyActivityIs(projection, 'TRAVAIL', '2026-09-05T16:00:00Z');
  });

  it('should open a non conformity only after the finish of the work, and stop on finish', () => {
    const finDuTravail = givenPointage('FIN');
    const nonConformite = givenPointage('NON_CONFORMITE');
    const afterCategoryChange = givenEvents([debutFixture, finDuTravail, nonConformite]);
    const afterFinish = givenEvents([debutFixture, finDuTravail, nonConformite, givenPointage('FIN', 'fin-de-la-non-conformite')]);

    const projection = whenProjecting(afterCategoryChange);
    const finished = whenProjecting(afterFinish);

    thenActivityIs(projection, 'NON_CONFORMITE', '2026-09-05T08:00:00Z');
    thenStateIs(finished, 'INTERROMPU', 0);
  });

  it.each(['NON_CONFORMITE', 'DEBUT'] as const)('should ignore a %s opening on a key whose activity is already in progress', type => {
    const state = givenEvents([debutFixture, givenOpeningAt(type, '2026-09-05T08:30:00Z')]);

    const projection = whenProjecting(state);

    thenActivityIs(projection, 'TRAVAIL', '2026-09-05T08:00:00Z');
    thenStateIs(projection, 'EN_COURS', 1);
  });

  it('should keep other operators active when one finishes', () => {
    const other = givenAnotherOperatorAtWork();
    const state = givenEvents([debutFixture, other, { ...givenPointage('FIN'), geste: { ...debutGesteFixture, id: 'fin', type: 'FIN' } }]);

    const projection = whenProjecting(state);

    thenStateIs(projection, 'EN_COURS', 1);
  });

  it.each([
    [undefined, 'tour'],
    ['tour', 'fraiseuse'],
  ])('should keep the same operator’s work on %s and %s independent when finishing or changing category', (firstPoste, otherPoste) => {
    const first = givenWorkstationPointage('DEBUT', firstPoste);
    const other = givenWorkstationPointage('DEBUT', otherPoste);
    const afterStart = givenEvents([first, other]);
    const afterCategoryChange = givenEvents([
      first,
      other,
      givenWorkstationPointage('FIN', firstPoste, 'fin-avant-nc'),
      givenWorkstationPointage('NON_CONFORMITE', firstPoste),
    ]);
    const afterFinish = givenEvents([first, other, givenWorkstationPointage('FIN', firstPoste)]);

    const started = whenProjecting(afterStart);
    const changed = whenProjecting(afterCategoryChange);
    const finished = whenProjecting(afterFinish);

    thenWorkstationsAreActive(started, [firstPoste, otherPoste]);
    thenWorkstationsHaveIndependentCategories(changed, firstPoste, otherPoste);
    thenWorkstationsAreActive(finished, [otherPoste]);
    thenStateIs(finished, 'EN_COURS', 1);
  });

  it('should ignore refused gestures, unrelated elements and gestures already present in the journal', () => {
    const state = givenEventsWithNoRemainingEffect();

    const projection = whenProjecting(state);

    thenStateIs(projection, 'EN_ATTENTE', 0);
  });

  it('should retain an accepted gesture until a server snapshot contains it', () => {
    const state = givenEvents([{ geste: debutGesteFixture, etat: 'ACCEPTE' }]);

    const projection = whenProjecting(state);

    thenStateIs(projection, 'EN_COURS', 1);
  });

  it('should prevent a refusal from being carried into an accepted event', () => {
    const accepted: EvenementAccepte = { geste: debutGesteFixture, etat: 'ACCEPTE' };
    const acceptedWithAResidualRefusal = { ...accepted, refus: { code: 'obsolete', message: 'obsolete' } };

    expectTypeOf(acceptedWithAResidualRefusal).not.toExtend<EvenementDuJournal>();
  });

  it('should expose no referential before the first complete download', () => {
    const state = givenNoDownloadedReference();

    const projection = whenProjecting(state);

    thenReferenceIsMissing(projection);
  });

  const givenEvents = (evenements: EvenementDuJournal[]): JournalDuPupitre => ({
    referentiel: referenceFixture,
    evenements,
    connecte: true,
  });
  const givenEventsAfterAnActivityExpired = (evenements: EvenementDuJournal[]): JournalDuPupitre => ({
    referentiel: {
      ...referenceFixture,
      suivis: [
        {
          ...requiredFixture(referenceFixture.suivis[0], 'item'),
          etat: 'EN_COURS',
          activites: [
            {
              ouverture: 'ancienne',
              echeance: '2026-09-05T20:00:00Z',
              operateurId: 'jean',
              categorie: 'TRAVAIL',
              depuis: '2026-09-05T07:00:00Z',
              posteId: 'tour',
            },
          ],
        },
      ],
    },
    evenements: evenements.map(evenement => ({ ...evenement, geste: { ...evenement.geste, posteId: 'tour' } })),
    connecte: true,
  });
  const givenEventsUnderAMaximumDurationOf = (heures: number, evenements: EvenementDuJournal[]): JournalDuPupitre => ({
    ...givenEvents(evenements),
    referentiel: { ...referenceFixture, dureeMaximaleDActiviteEnMs: heures * 60 * 60 * 1000 },
  });
  const givenNoDownloadedReference = (): JournalDuPupitre => ({ evenements: [], connecte: true });
  const givenAnotherOperatorAtWork = (): EvenementDuJournal => ({
    ...debutFixture,
    geste: { ...debutGesteFixture, id: 'debut-marie', operateurId: 'marie' },
  });
  const givenEventsWithNoRemainingEffect = (): JournalDuPupitre => ({
    referentiel: {
      ...referenceFixture,
      suivis: [{ ...requiredFixture(referenceFixture.suivis[0], 'reference workshop element'), evenements: ['debut'] }],
    },
    connecte: true,
    evenements: [
      { geste: { ...debutGesteFixture, id: 'refuse' }, etat: 'REFUSE', refus: { code: 'refuse', message: 'refuse' } },
      { ...debutFixture, geste: { ...debutGesteFixture, id: 'autre-suivi', suiviId: 'absent' } },
      debutFixture,
    ],
  });
  const givenPointage = (type: 'FIN' | 'NON_CONFORMITE', id = type === 'FIN' ? 'fin' : 'nc'): EvenementDuJournal => ({
    etat: 'EN_ATTENTE',
    geste: { ...debutGesteFixture, id, type },
  });
  const givenOpeningAt = (type: 'DEBUT' | 'NON_CONFORMITE', dateDeSurvenue: string): EvenementDuJournal => ({
    etat: 'EN_ATTENTE',
    geste: { ...debutGesteFixture, id: `${type}-${dateDeSurvenue}`, type, dateDeSurvenue },
  });
  const givenWorkstationPointage = (
    type: 'DEBUT' | 'FIN' | 'NON_CONFORMITE',
    posteId: string | undefined,
    id = `${type}-${posteId ?? 'sans-poste'}`,
  ): EvenementDuJournal => {
    const poste = posteId === undefined ? {} : { posteId };
    const identite = { ...debutGesteFixture, ...poste, id };
    return { etat: 'EN_ATTENTE', geste: { ...identite, type } };
  };
  const whenProjecting = (state: JournalDuPupitre): ReferentielDuPupitre | undefined => projectReferentiel(state);
  const thenWorkstationsAreActive = (projection: ReferentielDuPupitre | undefined, postes: (string | undefined)[]): void => {
    const suivi = requiredFixture(projection?.suivis[0], 'projected workshop element');
    expect(suivi.activites).toHaveLength(postes.length);
    for (const posteId of postes) {
      const activite = requiredFixture(
        suivi.activites.find(candidate => candidate.posteId === posteId),
        'activity at expected workstation',
      );
      expect(activite).toMatchObject({
        echeance: '2026-09-05T21:00:00.000Z',
        operateurId: 'jean',
        categorie: 'TRAVAIL',
        depuis: '2026-09-05T08:00:00Z',
      });
    }
  };
  const thenWorkstationsHaveIndependentCategories = (
    projection: ReferentielDuPupitre | undefined,
    first: string | undefined,
    other: string | undefined,
  ): void => {
    const suivi = requiredFixture(projection?.suivis[0], 'projected workshop element');
    expect(suivi.activites).toHaveLength(2);
    const firstActivity = requiredFixture(
      suivi.activites.find(candidate => candidate.posteId === first),
      'first workstation activity',
    );
    const otherActivity = requiredFixture(
      suivi.activites.find(candidate => candidate.posteId === other),
      'other workstation activity',
    );
    expect(firstActivity.categorie).toBe('NON_CONFORMITE');
    expect(otherActivity.categorie).toBe('TRAVAIL');
  };
  const thenActivityIs = (projection: ReferentielDuPupitre | undefined, categorie: string, depuis: string): void => {
    const suivi = requiredFixture(projection?.suivis[0], 'projected workshop element');
    expect(requiredFixture(suivi.activites[0], 'projected activity')).toMatchObject({ operateurId: 'jean', categorie, depuis });
  };
  const thenOnlyActivityIs = (projection: ReferentielDuPupitre | undefined, categorie: string, depuis: string): void => {
    const suivi = requiredFixture(projection?.suivis[0], 'projected workshop element');
    expect(suivi.activites).toHaveLength(1);
    thenActivityIs(projection, categorie, depuis);
  };
  const thenOnlyActivityDeadlineIs = (projection: ReferentielDuPupitre | undefined, echeance: string): void => {
    const suivi = requiredFixture(projection?.suivis[0], 'projected workshop element');
    expect(suivi.activites.map(activite => activite.echeance)).toEqual([echeance]);
  };
  const thenActivityHasNoPoste = (projection: ReferentielDuPupitre | undefined): void => {
    const suivi = requiredFixture(projection?.suivis[0], 'projected workshop element');
    const activite = requiredFixture(suivi.activites[0], 'projected activity');
    expect('posteId' in activite).toBe(false);
  };
  const thenStateIs = (projection: ReferentielDuPupitre | undefined, state: string, active: number): void => {
    const suivi = requiredFixture(projection?.suivis[0], 'projected workshop element');
    expect(suivi.etat).toBe(state);
    expect(suivi.activites).toHaveLength(active);
  };
  const thenReferenceIsMissing = (projection: unknown): void => {
    expect(projection).toBeUndefined();
  };
});
