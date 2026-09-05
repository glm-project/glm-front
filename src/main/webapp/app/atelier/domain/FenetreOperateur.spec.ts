import { FenetreOperateur } from './FenetreOperateur';
import { GesteLocal, IdentiteDuGeste, PUPITRE_VIDE, PupitreLocal } from './PupitreLocal';

const vueFixture: PupitreLocal = {
  ...PUPITRE_VIDE,
  referentiel: {
    operateurs: [{ id: 'jean', nom: 'Dupont', prenom: 'Jean', matricule: '049', postes: [{ id: 'tour', libelle: 'Tour' }] }],
    suivis: [],
  },
};

describe('FenetreOperateur', () => {
  let fenetre: FenetreOperateur;
  let dateDuGeste: string;
  let identities: Map<string, string>;

  beforeEach(() => {
    fenetre = new FenetreOperateur('entreprise-a', structuredClone(vueFixture), '049');
    dateDuGeste = '2026-09-05T08:00:00Z';
    identities = new Map<string, string>();
  });

  it('should resolve the operator from the company referential', () => {
    const operateur = fenetre.operateur;

    thenOperatorIsJean(operateur.id);
  });

  it('should refuse a code absent from a cached referential or without any referential', () => {
    thenWindowIsRefused(vueFixture);
    thenWindowIsRefused(PUPITRE_VIDE);
  });

  it('should refuse a workstation outside the operator’s local qualifications', () => {
    thenWorkstationIsRefused();
  });

  it('should decide the implicit arrival when executing each capture while retaining identities from the operator action', () => {
    const first = whenPreparingPointage();
    const second = whenPreparingPointage();
    const preparedIdentities = new Map(identities);
    dateDuGeste = '2026-09-05T09:00:00Z';

    const firstGestures = first();
    fenetre.accept(firstGestures);
    const secondGestures = second();

    thenGesturesAre(firstGestures, ['ARRIVEE', 'PRESENCE', 'POINTAGE']);
    thenGesturesAre(secondGestures, ['POINTAGE']);
    thenIdentitiesWerePreparedBeforeExecution([...firstGestures, ...secondGestures], preparedIdentities);
    thenOpeningSharesBusinessTime(firstGestures);
  });

  it('should keep requiring arrival until a pointage has been committed', () => {
    const first = whenPreparingPointage();
    const retry = whenPreparingPointage();

    first();
    const presence = fenetre.preparePresence('PAUSE', identifyFixture());
    fenetre.accept(presence);

    thenGesturesAre(retry(), ['ARRIVEE', 'PRESENCE', 'POINTAGE']);
    thenOnlyExplicitPresenceIsVisible(presence);
  });

  const identifyFixture = (): IdentiteDuGeste => {
    const id = crypto.randomUUID();
    const dateDeSurvenue = new Date(Date.parse(dateDuGeste) + identities.size).toISOString();
    identities.set(id, dateDeSurvenue);
    return { id, dateDeSurvenue };
  };
  const whenPreparingPointage = (): (() => GesteLocal[]) =>
    fenetre.preparePointage({ suiviId: 'piece', type: 'DEBUT', posteId: 'tour' }, identifyFixture);
  const thenOperatorIsJean = (id: string): void => {
    expect(id).toBe('jean');
  };
  const thenWindowIsRefused = (vue: PupitreLocal): void => {
    expect(() => new FenetreOperateur('entreprise-a', vue, 'inconnu')).toThrow('Matricule absent');
  };
  const thenWorkstationIsRefused = (): void => {
    expect(() => fenetre.preparePointage({ suiviId: 'piece', type: 'DEBUT', posteId: 'interdit' }, identifyFixture)).toThrow(
      'habilitations',
    );
  };
  const thenGesturesAre = (gestes: GesteLocal[], natures: string[]): void => {
    expect(gestes.map(geste => geste.nature)).toEqual(natures);
    expect(gestes.every(geste => geste.operateurId === 'jean')).toBe(true);
  };
  const thenOpeningSharesBusinessTime = (gestes: GesteLocal[]): void => {
    expect(gestes.map(geste => geste.dateDeSurvenue)).toEqual(Array<string | undefined>(3).fill(identities.get(gestes[2].id)));
  };
  const thenIdentitiesWerePreparedBeforeExecution = (gestes: GesteLocal[], preparedIdentities: Map<string, string>): void => {
    expect(new Set(gestes.map(geste => geste.id)).size).toBe(gestes.length);
    expect(gestes.every(geste => preparedIdentities.has(geste.id))).toBe(true);
    expect(
      gestes.filter(geste => geste.nature === 'POINTAGE').every(geste => geste.dateDeSurvenue === preparedIdentities.get(geste.id)),
    ).toBe(true);
  };
  const thenOnlyExplicitPresenceIsVisible = (gestes: GesteLocal[]): void => {
    expect(fenetre.snapshot().evenements).toEqual(gestes.map(geste => ({ geste, etat: 'EN_ATTENTE' })));
    expect(gestes[0]).toMatchObject({ nature: 'PRESENCE', type: 'PAUSE', implicite: false, operateurId: 'jean' });
  };
});
