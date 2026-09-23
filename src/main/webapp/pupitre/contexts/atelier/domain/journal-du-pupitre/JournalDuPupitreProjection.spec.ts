import {
  EtatDePresence,
  EvenementAccepte,
  EvenementDuJournal,
  GesteDArrivee,
  GesteDAtelier,
  GesteDePointage,
  GesteDePresence,
  JournalDuPupitre,
  OperateurDuPupitre,
  ReferentielDuPupitre,
  TypeDePresence,
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
  etat: 'ABSENT',
  postes: [],
};
const referenceFixture: ReferentielDuPupitre = {
  operateurs: [operateurJeanFixture],
  suivis: [{ id: 'piece', nom: 'OF-1', type: 'PRODUIT', etat: 'EN_ATTENTE', activites: [], evenements: [] }],
};
const arriveeGesteFixture: GesteDArrivee = {
  nature: 'ARRIVEE',
  operateurId: 'jean',
  id: 'arrivee',
  dateDeSurvenue: '2026-09-05T08:00:00Z',
};
const arriveeFixture: EvenementDuJournal = { geste: arriveeGesteFixture, etat: 'EN_ATTENTE' };
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
    const state = givenEvents([{ geste: debutGesteFixture, etat: 'ACCEPTE' }]);

    const projection = whenProjecting(state);

    thenStateIs(projection, 'EN_COURS', 1);
  });

  it('should prevent a refusal from being carried into an accepted event', () => {
    const accepted: EvenementAccepte = { geste: debutGesteFixture, etat: 'ACCEPTE' };
    const acceptedWithAResidualRefusal = { ...accepted, refus: { code: 'obsolete', message: 'obsolete' } };

    expectTypeOf(acceptedWithAResidualRefusal).not.toExtend<EvenementDuJournal>();
  });

  it('should prevent arrival causality from being carried by incompatible gestures and outcomes', () => {
    const pauseWithArrivalCausality = {
      ...debutGesteFixture,
      nature: 'PRESENCE' as const,
      type: 'PAUSE' as const,
      implicite: false as const,
      assuranceArriveeId: 'arrivee',
    };
    const pointageWithDayOutcome = { geste: debutGesteFixture, etat: 'ACCEPTE' as const, journeeOuverte: true };
    const arrivalWithoutDayOutcome = {
      geste: { ...debutGesteFixture, nature: 'ARRIVEE' as const },
      etat: 'ACCEPTE' as const,
    };

    expectTypeOf(pauseWithArrivalCausality).not.toExtend<GesteDAtelier>();
    expectTypeOf(pointageWithDayOutcome).not.toExtend<EvenementDuJournal>();
    expectTypeOf(arrivalWithoutDayOutcome).not.toExtend<EvenementDuJournal>();
  });

  it('should expose no referential before the first complete download', () => {
    const state = givenNoDownloadedReference();

    const projection = whenProjecting(state);

    thenReferenceIsMissing(projection);
  });

  it('should make an absent operator present after a local arrival', () => {
    const state = givenPresenceEvents('ABSENT', [arriveeFixture]);

    const projection = whenProjecting(state);

    thenOperatorStateIs(projection, 'jean', 'PRESENT');
  });

  it('should put an operator on pause through the arrival assurance from absent', () => {
    const state = givenPresenceEvents('ABSENT', [arriveeFixture, givenPresence('PAUSE')]);

    const projection = whenProjecting(state);

    thenOperatorStateIs(projection, 'jean', 'EN_PAUSE');
  });

  it('should put a paused operator back to work after a local resumption', () => {
    const state = givenPresenceEvents('EN_PAUSE', [givenPresence('REPRISE')]);

    const projection = whenProjecting(state);

    thenOperatorStateIs(projection, 'jean', 'PRESENT');
  });

  it.each(['PRESENT', 'EN_PAUSE'] as const)('should make a %s operator absent after a local departure', etatDeDepart => {
    const state = givenPresenceEvents(etatDeDepart, [givenPresence('DEPART')]);

    const projection = whenProjecting(state);

    thenOperatorStateIs(projection, 'jean', 'ABSENT');
  });

  it('should leave the state unchanged on an illegal transition', () => {
    const state = givenPresenceEvents('EN_PAUSE', [givenPresence('PAUSE')]);

    const projection = whenProjecting(state);

    thenOperatorStateIs(projection, 'jean', 'EN_PAUSE');
  });

  it('should ignore a refused presence gesture', () => {
    const state = givenPresenceEvents('PRESENT', [givenRefusedPresence('PAUSE')]);

    const projection = whenProjecting(state);

    thenOperatorStateIs(projection, 'jean', 'PRESENT');
  });

  it('should not move an operator targeted by another operator’s gesture', () => {
    const state = givenPresenceEvents('ABSENT', [givenPresence('PAUSE', 'marie')]);

    const projection = whenProjecting(state);

    thenOperatorStateIs(projection, 'jean', 'ABSENT');
  });

  const givenEvents = (evenements: EvenementDuJournal[]): JournalDuPupitre => ({
    referentiel: referenceFixture,
    evenements,
    connecte: true,
  });
  const givenNoDownloadedReference = (): JournalDuPupitre => ({ evenements: [], connecte: true });
  const givenPresenceEvents = (etat: EtatDePresence, evenements: EvenementDuJournal[]): JournalDuPupitre => ({
    referentiel: { ...referenceFixture, operateurs: [{ ...operateurJeanFixture, etat }] },
    evenements,
    connecte: true,
  });
  const gestePresence = (type: TypeDePresence, operateurId: string): GesteDePresence => ({
    nature: 'PRESENCE',
    operateurId,
    type,
    implicite: false,
    id: crypto.randomUUID(),
    dateDeSurvenue: '2026-09-05T09:00:00Z',
  });
  const givenPresence = (type: TypeDePresence, operateurId = 'jean'): EvenementDuJournal => ({
    geste: gestePresence(type, operateurId),
    etat: 'EN_ATTENTE',
  });
  const givenRefusedPresence = (type: TypeDePresence, operateurId = 'jean'): EvenementDuJournal => ({
    geste: gestePresence(type, operateurId),
    etat: 'REFUSE',
    refus: { code: 'refuse', message: 'refuse' },
  });
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
      { ...debutFixture, geste: { ...debutGesteFixture, id: 'arrivee', nature: 'ARRIVEE' } },
      { ...debutFixture, geste: { ...debutGesteFixture, id: 'autre-suivi', suiviId: 'absent' } },
      debutFixture,
    ],
  });
  const givenPointage = (type: 'FIN' | 'NON_CONFORMITE'): EvenementDuJournal => ({
    ...debutFixture,
    geste: { ...debutGesteFixture, id: crypto.randomUUID(), type },
  });
  const givenWorkstationPointage = (type: 'DEBUT' | 'FIN' | 'NON_CONFORMITE', posteId: string | undefined): EvenementDuJournal => {
    const geste: GesteDePointage = {
      ...debutGesteFixture,
      id: crypto.randomUUID(),
      type,
      ...(posteId === undefined ? {} : { posteId }),
    };
    return { ...debutFixture, geste };
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
  const thenOperatorStateIs = (projection: ReferentielDuPupitre | undefined, operateurId: string, etat: EtatDePresence): void => {
    const operateur = requiredFixture(
      projection?.operateurs.find(candidate => candidate.id === operateurId),
      'projected operator',
    );
    expect(operateur.etat).toBe(etat);
  };
});
