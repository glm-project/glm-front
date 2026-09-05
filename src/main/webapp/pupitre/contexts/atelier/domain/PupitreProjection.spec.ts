import { LocalEvent, LocalPointage, LocalPupitreState, ReferentielDuPupitre } from './LocalPupitreState';
import { projectPupitre } from './PupitreProjection';

const requiredFixture = <T>(value: T | null | undefined, description: string): T => {
  if (value === null || value === undefined) {
    throw new Error(`Missing ${description} fixture.`);
  }
  return value;
};

const referenceFixture: ReferentielDuPupitre = {
  operateurs: [],
  suivis: [{ id: 'piece', nom: 'OF-1', type: 'PRODUIT', etat: 'EN_ATTENTE', activites: [], evenements: [] }],
};
const debutFixture: LocalEvent = {
  geste: { nature: 'POINTAGE', operateurId: 'jean', suiviId: 'piece', type: 'DEBUT', id: 'debut', dateDeSurvenue: '2026-09-05T08:00:00Z' },
  etat: 'EN_ATTENTE',
};

describe('PupitreProjection', () => {
  it('should reconstruct an offline activity and its original starting time', () => {
    const state = givenEvents([debutFixture]);

    const projection = whenProjecting(state);

    thenActivityIs(projection, 'TRAVAIL', '2026-09-05T08:00:00Z');
  });

  it('should change category on non conformity and stop on finish', () => {
    const nonConformite = givenPointage('NON_CONFORMITE');
    const afterCategoryChange = givenEvents([debutFixture, nonConformite]);
    const afterFinish = givenEvents([debutFixture, nonConformite, givenPointage('FIN')]);

    const projection = whenProjecting(afterCategoryChange);
    const finished = whenProjecting(afterFinish);

    thenActivityIs(projection, 'NON_CONFORMITE', '2026-09-05T08:00:00Z');
    thenStateIs(finished, 'INTERROMPU', 0);
  });

  it('should keep other operators active when one finishes', () => {
    const other = givenAnotherOperatorAtWork();
    const state = givenEvents([debutFixture, other, givenPointage('FIN')]);

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
    const afterCategoryChange = givenEvents([first, other, givenWorkstationPointage('NON_CONFORMITE', firstPoste)]);
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
    const state = givenEvents([{ ...debutFixture, etat: 'ACCEPTE' }]);

    const projection = whenProjecting(state);

    thenStateIs(projection, 'EN_COURS', 1);
  });

  it('should expose no referential before the first complete download', () => {
    const state = givenNoDownloadedReference();

    const projection = whenProjecting(state);

    thenReferenceIsMissing(projection);
  });

  const givenEvents = (evenements: LocalEvent[]): LocalPupitreState => ({ referentiel: referenceFixture, evenements, connecte: true });
  const givenNoDownloadedReference = (): LocalPupitreState => ({ evenements: [], connecte: true });
  const givenAnotherOperatorAtWork = (): LocalEvent => ({
    ...debutFixture,
    geste: { ...debutFixture.geste, id: 'debut-marie', operateurId: 'marie' },
  });
  const givenEventsWithNoRemainingEffect = (): LocalPupitreState => ({
    referentiel: {
      ...referenceFixture,
      suivis: [{ ...requiredFixture(referenceFixture.suivis[0], 'reference workshop element'), evenements: ['debut'] }],
    },
    connecte: true,
    evenements: [
      { ...debutFixture, geste: { ...debutFixture.geste, id: 'refuse' }, etat: 'REFUSE' },
      { ...debutFixture, geste: { ...debutFixture.geste, id: 'arrivee', nature: 'ARRIVEE' } },
      { ...debutFixture, geste: { ...debutFixture.geste, id: 'autre-suivi', nature: 'POINTAGE', suiviId: 'absent', type: 'DEBUT' } },
      debutFixture,
    ],
  });
  const givenPointage = (type: 'FIN' | 'NON_CONFORMITE'): LocalEvent => ({
    ...debutFixture,
    geste: { ...debutFixture.geste, nature: 'POINTAGE', suiviId: 'piece', id: crypto.randomUUID(), type },
  });
  const givenWorkstationPointage = (type: 'DEBUT' | 'FIN' | 'NON_CONFORMITE', posteId: string | undefined): LocalEvent => {
    const geste: LocalPointage = {
      ...debutFixture.geste,
      nature: 'POINTAGE',
      suiviId: 'piece',
      id: crypto.randomUUID(),
      type,
    };
    if (posteId !== undefined) {
      geste.posteId = posteId;
    }
    return { ...debutFixture, geste };
  };
  const whenProjecting = (state: LocalPupitreState): ReferentielDuPupitre | undefined => projectPupitre(state);
  const thenWorkstationsAreActive = (projection: ReferentielDuPupitre | undefined, postes: (string | undefined)[]): void => {
    const suivi = requiredFixture(projection?.suivis[0], 'projected workshop element');
    expect(suivi.activites).toHaveLength(postes.length);
    for (const posteId of postes) {
      const activite = requiredFixture(
        suivi.activites.find(candidate => candidate.posteId === posteId),
        'activity at expected workstation',
      );
      expect(activite).toMatchObject({ operateurId: 'jean', categorie: 'TRAVAIL', depuis: '2026-09-05T08:00:00Z' });
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
  const thenStateIs = (projection: ReferentielDuPupitre | undefined, state: string, active: number): void => {
    const suivi = requiredFixture(projection?.suivis[0], 'projected workshop element');
    expect(suivi.etat).toBe(state);
    expect(suivi.activites).toHaveLength(active);
  };
  const thenReferenceIsMissing = (projection: unknown): void => {
    expect(projection).toBeUndefined();
  };
});
