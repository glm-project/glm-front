import { projectPupitre } from './ProjectionDuPupitre';
import { EvenementLocal, PupitreLocal, ReferentielDuPupitre } from './PupitreLocal';

const referenceFixture: ReferentielDuPupitre = {
  operateurs: [],
  suivis: [{ id: 'piece', nom: 'OF-1', type: 'PRODUIT', etat: 'EN_ATTENTE', activites: [], evenements: [] }],
};
const debutFixture: EvenementLocal = {
  geste: { nature: 'POINTAGE', operateurId: 'jean', suiviId: 'piece', type: 'DEBUT', id: 'debut', dateDeSurvenue: '2026-09-05T08:00:00Z' },
  etat: 'EN_ATTENTE',
};

describe('ProjectionDuPupitre', () => {
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

  const givenEvents = (evenements: EvenementLocal[]): PupitreLocal => ({ referentiel: referenceFixture, evenements, connecte: true });
  const givenNoDownloadedReference = (): PupitreLocal => ({ evenements: [], connecte: true });
  const givenAnotherOperatorAtWork = (): EvenementLocal => ({
    ...debutFixture,
    geste: { ...debutFixture.geste, id: 'debut-marie', operateurId: 'marie' },
  });
  const givenEventsWithNoRemainingEffect = (): PupitreLocal => ({
    referentiel: { ...referenceFixture, suivis: [{ ...referenceFixture.suivis[0], evenements: ['debut'] }] },
    connecte: true,
    evenements: [
      { ...debutFixture, geste: { ...debutFixture.geste, id: 'refuse' }, etat: 'REFUSE' },
      { ...debutFixture, geste: { ...debutFixture.geste, id: 'arrivee', nature: 'ARRIVEE' } },
      { ...debutFixture, geste: { ...debutFixture.geste, id: 'autre-suivi', nature: 'POINTAGE', suiviId: 'absent', type: 'DEBUT' } },
      debutFixture,
    ],
  });
  const givenPointage = (type: 'FIN' | 'NON_CONFORMITE'): EvenementLocal => ({
    ...debutFixture,
    geste: { ...debutFixture.geste, nature: 'POINTAGE', suiviId: 'piece', id: crypto.randomUUID(), type },
  });
  const givenWorkstationPointage = (type: 'DEBUT' | 'FIN' | 'NON_CONFORMITE', posteId: string | undefined): EvenementLocal => ({
    ...debutFixture,
    geste: { ...debutFixture.geste, nature: 'POINTAGE', suiviId: 'piece', id: crypto.randomUUID(), posteId, type },
  });
  const whenProjecting = (state: PupitreLocal): ReferentielDuPupitre | undefined => projectPupitre(state);
  const thenWorkstationsAreActive = (projection: ReferentielDuPupitre | undefined, postes: (string | undefined)[]): void => {
    expect(projection?.suivis[0].activites).toHaveLength(postes.length);
    expect(projection?.suivis[0].activites).toEqual(
      expect.arrayContaining(
        postes.map(posteId => ({ operateurId: 'jean', posteId, categorie: 'TRAVAIL', depuis: '2026-09-05T08:00:00Z' })),
      ),
    );
  };
  const thenWorkstationsHaveIndependentCategories = (
    projection: ReferentielDuPupitre | undefined,
    first: string | undefined,
    other: string | undefined,
  ): void => {
    expect(projection?.suivis[0].activites).toHaveLength(2);
    expect(projection?.suivis[0].activites).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ posteId: first, categorie: 'NON_CONFORMITE' }),
        expect.objectContaining({ posteId: other, categorie: 'TRAVAIL' }),
      ]),
    );
  };
  const thenActivityIs = (projection: ReferentielDuPupitre | undefined, categorie: string, depuis: string): void => {
    expect(projection?.suivis[0].activites[0]).toMatchObject({ operateurId: 'jean', categorie, depuis });
  };
  const thenStateIs = (projection: ReferentielDuPupitre | undefined, state: string, active: number): void => {
    expect(projection?.suivis[0].etat).toBe(state);
    expect(projection?.suivis[0].activites).toHaveLength(active);
  };
  const thenReferenceIsMissing = (projection: unknown): void => {
    expect(projection).toBeUndefined();
  };
});
