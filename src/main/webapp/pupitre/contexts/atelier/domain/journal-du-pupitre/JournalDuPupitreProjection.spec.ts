import {
  EvenementAccepte,
  EvenementDuJournal,
  GesteDePointage,
  JournalDuPupitre,
  OperateurDuPupitre,
  ReferentielDuPupitre,
} from './JournalDuPupitre';
import { projectReferentiel } from './JournalDuPupitreProjection';

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
  suivis: [{ conflits: [], id: 'piece', nom: 'OF-1', categorie: 'MOULE', etat: 'EN_ATTENTE', activites: [], evenements: [] }],
};
const debutGesteFixture: GesteDePointage = {
  intention: 'OUVERTURE',
  nature: 'POINTAGE',
  operateurId: 'jean',
  suiviId: 'piece',
  type: 'DEBUT',
  id: 'debut',
  dateDeSurvenue: '2026-09-05T08:00:00Z',
};
const debutFixture: EvenementDuJournal = { geste: debutGesteFixture, etat: 'EN_ATTENTE' };
describe('JournalDuPupitreProjection', () => {
  it.each([undefined, 'tour'])(
    'should expose the stale target and replacement at workstation %s without applying FIN to the replacement',
    posteId => {
      const state: JournalDuPupitre = {
        ...givenEvents([]),
        referentiel: {
          ...referenceFixture,
          suivis: [
            {
              ...requiredFixture(referenceFixture.suivis[0], 'element'),
              activites: [
                {
                  operateurId: 'jean',
                  categorie: 'TRAVAIL',
                  depuis: '2026-09-05T10:00:00Z',
                  ...(posteId === undefined ? {} : { posteId }),
                  ouverture: 'b',
                  echeance: '2026-09-05T23:00:00Z',
                },
                {
                  operateurId: 'marie',
                  categorie: 'TRAVAIL',
                  ouverture: 'autre-operateur',
                  depuis: '2026-09-05T10:00:00Z',
                  echeance: '2026-09-05T23:00:00Z',
                  ...(posteId === undefined ? {} : { posteId }),
                },
                {
                  operateurId: 'jean',
                  categorie: 'NON_CONFORMITE',
                  ouverture: 'autre-poste',
                  posteId: 'fraiseuse',
                  depuis: '2026-09-05T10:00:00Z',
                  echeance: '2026-09-05T23:00:00Z',
                },
              ],
            },
          ],
        },
        evenements: [
          {
            etat: 'EN_ATTENTE',
            geste: {
              ...debutGesteFixture,
              ...(posteId === undefined ? {} : { posteId }),
              id: 'fin-a',
              intention: 'FIN',
              type: 'FIN',
              cible: 'a',
              dateDeSurvenue: '2026-09-05T11:00:00Z',
            },
          },
        ],
      };

      const projection = whenProjecting(state);

      expect(projection?.suivis[0]?.conflits).toStrictEqual([
        { operateurId: 'jean', ...(posteId === undefined ? {} : { posteId }), activites: ['a', 'b'], pointages: ['fin-a'] },
      ]);
      expect(projection?.suivis[0]?.activites.map(activite => activite.ouverture)).toEqual(['autre-operateur', 'autre-poste']);
      expect(projection?.suivis[0]?.etat).toBe('EN_COURS');
    },
  );

  it.each(['2026-09-05T11:00:00Z', '2026-09-05T11:01:00Z'])(
    'should not interpret an opening at %s as replacing a target strictly before FIN at 11:00',
    depuis => {
      const replacement = {
        operateurId: 'jean',
        categorie: 'TRAVAIL' as const,
        ouverture: 'b',
        depuis,
        echeance: '2026-09-06T00:00:00Z',
        posteId: 'tour',
      };
      const state: JournalDuPupitre = {
        ...givenEvents([
          {
            etat: 'EN_ATTENTE',
            geste: {
              ...debutGesteFixture,
              id: 'fin-a',
              intention: 'FIN',
              type: 'FIN',
              cible: 'a',
              posteId: 'tour',
              dateDeSurvenue: '2026-09-05T11:00:00Z',
            },
          },
        ]),
        referentiel: {
          ...referenceFixture,
          suivis: [{ ...requiredFixture(referenceFixture.suivis[0], 'item'), activites: [replacement] }],
        },
      };

      const projected = whenProjecting(state);

      expect(projected?.suivis[0]?.activites).toEqual([replacement]);
      expect(projected?.suivis[0]?.conflits).toEqual([]);
    },
  );

  it('should retain unrelated current activities when an accepted publication diagnoses only some of them', () => {
    const activity = (ouverture: string, operateurId: string) => ({
      operateurId,
      ouverture,
      categorie: 'TRAVAIL' as const,
      depuis: '2026-09-05T08:00:00Z',
      echeance: '2026-09-05T21:00:00Z',
    });
    const preserved = activity('c', 'lea');
    const conflits = [
      { activites: ['b'], pointages: ['fin-a'] },
      { activites: ['ailleurs'], pointages: ['autre-pointage'] },
    ];
    const state: JournalDuPupitre = {
      ...givenEvents([
        { etat: 'ACCEPTE', conflits, geste: { ...debutGesteFixture, id: 'fin-a', intention: 'FIN', type: 'FIN', cible: 'a' } },
      ]),
      referentiel: {
        ...referenceFixture,
        suivis: [
          { ...requiredFixture(referenceFixture.suivis[0], 'item'), activites: [activity('a', 'jean'), activity('b', 'marie'), preserved] },
        ],
      },
    };

    const projected = whenProjecting(state);

    expect(projected?.suivis[0]?.activites).toEqual([preserved]);
    expect(projected?.suivis[0]?.conflits).toEqual(conflits);
    expect(projected?.suivis[0]?.etat).toBe('EN_COURS');
  });

  it('should retain the accepted publication conflict before a canonical refresh and suppress its optimistic activity', () => {
    const conflit = { activites: ['debut'], pointages: ['debut'] };
    const state = givenEvents([{ geste: debutGesteFixture, etat: 'ACCEPTE', conflits: [conflit] }]);

    const projection = whenProjecting(state);

    expect(projection?.suivis[0]?.conflits).toEqual([conflit]);
    expect(projection?.suivis[0]?.activites).toEqual([]);
  });

  it('should ignore an old accepted conflict once the canonical reference contains its gesture', () => {
    const state = {
      ...givenEvents([{ geste: debutGesteFixture, etat: 'ACCEPTE', conflits: [{ activites: ['debut'], pointages: ['debut'] }] }]),
      referentiel: {
        ...referenceFixture,
        suivis: [{ ...requiredFixture(referenceFixture.suivis[0], 'item'), evenements: ['debut'], conflits: [] }],
      },
    };

    const projected = whenProjecting(state);

    expect(projected?.suivis[0]?.conflits).toEqual([]);
    expect(projected?.suivis[0]?.activites).toEqual([]);
  });

  it('should never turn an unknown targeted transition into a new opening', () => {
    const state = givenEvents([
      {
        etat: 'EN_ATTENTE',
        geste: { ...debutGesteFixture, id: 'transition', intention: 'TRANSITION', type: 'NON_CONFORMITE', cible: 'inconnue' },
      },
    ]);

    const projected = whenProjecting(state);

    expect(projected?.suivis[0]?.activites).toEqual([]);
    expect(projected?.suivis[0]?.conflits).toEqual([]);
  });

  it('should reconstruct an offline activity and its original starting time', () => {
    const state = givenEvents([debutFixture]);

    const projection = whenProjecting(state);

    thenActivityIs(projection, 'TRAVAIL', '2026-09-05T08:00:00Z');
    thenActivityHasNoPoste(projection);
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
    const state = givenEvents([
      debutFixture,
      other,
      { ...givenPointage('FIN'), geste: { ...debutGesteFixture, id: 'fin', intention: 'FIN', type: 'FIN', cible: 'debut' } },
    ]);

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
  const givenPointage = (type: 'FIN' | 'NON_CONFORMITE'): EvenementDuJournal => ({
    etat: 'EN_ATTENTE',
    geste:
      type === 'FIN'
        ? { ...debutGesteFixture, id: 'fin', intention: 'FIN', type, cible: 'nc' }
        : { ...debutGesteFixture, id: 'nc', intention: 'TRANSITION', type, cible: 'debut' },
  });
  const givenWorkstationPointage = (type: 'DEBUT' | 'FIN' | 'NON_CONFORMITE', posteId: string | undefined): EvenementDuJournal => {
    const poste = posteId === undefined ? {} : { posteId };
    const identite = { ...debutGesteFixture, ...poste, id: `${type}-${posteId ?? 'sans-poste'}` };
    const cible = `DEBUT-${posteId ?? 'sans-poste'}`;
    const geste = pointageAt(identite, type, cible);
    return { etat: 'EN_ATTENTE', geste };
  };
  const pointageAt = (identite: typeof debutGesteFixture, type: 'DEBUT' | 'FIN' | 'NON_CONFORMITE', cible: string): GesteDePointage => {
    if (type === 'DEBUT') return identite;
    if (type === 'FIN') return { ...identite, intention: 'FIN', type, cible };
    return { ...identite, intention: 'TRANSITION', type, cible };
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
