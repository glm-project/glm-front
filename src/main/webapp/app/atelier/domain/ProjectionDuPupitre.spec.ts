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

    const projection = projectPupitre(state);

    thenActivityIs(projection, 'TRAVAIL', '2026-09-05T08:00:00Z');
  });

  it('should change category on non conformity and stop on finish', () => {
    const nonConformite = givenPointage('NON_CONFORMITE');

    const projection = projectPupitre(givenEvents([debutFixture, nonConformite]));
    const finished = projectPupitre(givenEvents([debutFixture, nonConformite, givenPointage('FIN')]));

    thenActivityIs(projection, 'NON_CONFORMITE', '2026-09-05T08:00:00Z');
    thenStateIs(finished, 'INTERROMPU', 0);
  });

  it('should keep other operators active when one finishes', () => {
    const other = { ...debutFixture, geste: { ...debutFixture.geste, operateurId: 'marie' } };

    const projection = projectPupitre(givenEvents([debutFixture, other, givenPointage('FIN')]));

    thenStateIs(projection, 'EN_COURS', 1);
  });

  it('should ignore refused gestures, unrelated elements and gestures already present in the journal', () => {
    const state = givenEvents([
      { ...debutFixture, etat: 'REFUSE' },
      { ...debutFixture, geste: { ...debutFixture.geste, nature: 'ARRIVEE' } },
      { ...debutFixture, geste: { ...debutFixture.geste, nature: 'POINTAGE', suiviId: 'absent', type: 'DEBUT' } },
    ]);
    state.referentiel = { ...referenceFixture, suivis: [{ ...referenceFixture.suivis[0], evenements: ['debut'] }] };
    state.evenements.push(debutFixture);

    const projection = projectPupitre(state);

    thenStateIs(projection, 'EN_ATTENTE', 0);
  });

  it('should retain an accepted gesture until a server snapshot contains it', () => {
    const state = givenEvents([{ ...debutFixture, etat: 'ACCEPTE' }]);

    const projection = projectPupitre(state);

    thenStateIs(projection, 'EN_COURS', 1);
  });

  it('should expose no referential before the first complete download', () => {
    const projection = projectPupitre({ evenements: [], connecte: true });

    thenReferenceIsMissing(projection);
  });

  const givenEvents = (evenements: EvenementLocal[]): PupitreLocal => ({ referentiel: referenceFixture, evenements, connecte: true });
  const givenPointage = (type: 'FIN' | 'NON_CONFORMITE'): EvenementLocal => ({
    ...debutFixture,
    geste: { ...debutFixture.geste, nature: 'POINTAGE', suiviId: 'piece', type },
  });
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
