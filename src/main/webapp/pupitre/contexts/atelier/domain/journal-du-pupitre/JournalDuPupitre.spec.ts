import {
  afterLocalCapture,
  EMPTY_JOURNAL_DU_PUPITRE,
  EvenementDuJournal,
  EvenementsDuJournal,
  GesteDePointage,
  JournalDuPupitre,
  snapshotDuJournal,
} from './JournalDuPupitre';

const gesteFixture = (id: string): GesteDePointage => ({
  nature: 'POINTAGE',
  intention: 'OUVERTURE',
  type: 'DEBUT',
  id,
  operateurId: 'jean',
  suiviId: 'piece',
  dateDeSurvenue: '2026-09-05T08:00:00Z',
});

describe('JournalDuPupitre', () => {
  it('should stop only the designated operator resumption while retaining every prior journal event', () => {
    const suspended = (operateurId: string): GesteDePointage => ({
      nature: 'POINTAGE',
      intention: 'FIN',
      type: 'FIN',
      cible: 'ouverture-' + operateurId,
      id: 'fin-' + operateurId,
      operateurId,
      suiviId: 'piece',
      dateDeSurvenue: '2026-09-05T12:00:00Z',
      suspension: { pause: 'pause-' + operateurId, reouverture: 'DEBUT' },
    });
    const journal: JournalDuPupitre = {
      connecte: true,
      pausesArretees: ['pause-ancienne'],
      evenements: [
        { geste: suspended('jean'), etat: 'EN_ATTENTE' },
        { geste: suspended('marie'), etat: 'ACCEPTE' },
      ],
    };

    const stopped = afterLocalCapture(journal, [], 'jean');

    expect(stopped.pausesArretees).toEqual(['pause-ancienne', 'pause-jean']);
    expect(stopped.evenements).toEqual(journal.evenements);
    expect(journal.pausesArretees).toEqual(['pause-ancienne']);
  });

  it('should copy the stopped pauses and accepted conflict diagnostics independently', () => {
    const journal: JournalDuPupitre = {
      connecte: true,
      pausesArretees: ['pause'],
      evenements: [
        {
          etat: 'ACCEPTE',
          conflits: [{ activites: ['ouverture'], pointages: ['contradiction'] }],
          geste: {
            id: 'contradiction',
            dateDeSurvenue: '2026-09-05T09:00:00Z',
            operateurId: 'jean',
            suiviId: 'piece',
            nature: 'POINTAGE',
            intention: 'FIN',
            type: 'FIN',
            cible: 'ouverture',
          },
        },
      ],
    };

    const copy = snapshotDuJournal(journal);

    expect(copy).toEqual(journal);
    expect(copy.pausesArretees).not.toBe(journal.pausesArretees);
    expect(copy.evenements[0]).not.toBe(journal.evenements[0]);
    const event = copy.evenements[0];
    expect(event?.etat).toBe('ACCEPTE');
    expect(event).toMatchObject({ conflits: [{ activites: ['ouverture'], pointages: ['contradiction'] }] });
  });

  it('should copy accepted events', () => {
    const pointage: GesteDePointage = {
      intention: 'OUVERTURE',
      id: 'pt-1',
      dateDeSurvenue: '2026-09-05T08:00:00Z',
      nature: 'POINTAGE',
      operateurId: 'jean',
      suiviId: 'suivi-1',
      type: 'DEBUT',
    };
    const journal: JournalDuPupitre = {
      connecte: true,
      evenements: [{ geste: pointage, etat: 'ACCEPTE' }],
    };

    const snapshot = snapshotDuJournal(journal);
    const event = snapshot.evenements[0];

    expect(event).toEqual({ geste: pointage, etat: 'ACCEPTE' });
  });

  it('should preserve and clone suivi events in journal referential', () => {
    const journal: JournalDuPupitre = {
      ...EMPTY_JOURNAL_DU_PUPITRE,
      referentiel: {
        operateurs: [{ id: 'jean', nom: 'Dupont', prenom: 'Jean', identifiant: '049', postes: [] }],
        suivis: [
          {
            conflits: [],
            id: 'suivi-1',
            nom: 'OF-1',
            etat: 'EN_COURS',
            categorie: 'OF',
            activites: [],
            evenements: ['EVT-1', 'EVT-2'],
          },
        ],
        categories: [],
      },
    };

    const snapshot = snapshotDuJournal(journal);

    expect(snapshot.referentiel?.suivis[0]?.evenements).toEqual(['EVT-1', 'EVT-2']);
    expect(snapshot.referentiel?.suivis[0]?.evenements).not.toBe(journal.referentiel?.suivis[0]?.evenements);
  });

  it('should create an independent snapshot isolating modifications to nested arrays and objects', () => {
    const journal: JournalDuPupitre = {
      connecte: true,
      referentiel: {
        operateurs: [
          {
            id: 'jean',
            nom: 'Dupont',
            prenom: 'Jean',
            identifiant: '049',
            postes: [{ id: 'p1', libelle: 'Poste 1' }],
          },
        ],
        suivis: [
          {
            conflits: [],
            id: 'suivi-1',
            nom: 'OF-1',
            etat: 'EN_COURS',
            categorie: 'OF',
            activites: [
              {
                ouverture: 'activite-fixture-4',
                echeance: '2026-09-05T21:00:00.000Z',
                categorie: 'TRAVAIL',
                depuis: '2026-09-05T08:00:00Z',
                operateurId: 'jean',
              },
            ],
            evenements: ['EVT-1'],
          },
        ],
        categories: [],
      },
      evenements: [
        {
          geste: {
            id: 'arr-1',
            dateDeSurvenue: '2026-09-05T08:00:00Z',
            nature: 'POINTAGE',
            intention: 'OUVERTURE',
            type: 'DEBUT',
            suiviId: 'suivi-1',
            operateurId: 'jean',
          },
          etat: 'ACCEPTE',
        },
        {
          geste: {
            id: 'ref-1',
            dateDeSurvenue: '2026-09-05T08:00:00Z',
            nature: 'POINTAGE',
            intention: 'OUVERTURE',
            type: 'DEBUT',
            suiviId: 'suivi-1',
            operateurId: 'jean',
          },
          etat: 'REFUSE',
          refus: { code: 'err', message: 'Refus' },
        },
      ],
    };

    const snapshot = snapshotDuJournal(journal);

    expect(snapshot).toEqual(journal);
    expect(snapshot).not.toBe(journal);
    expect(snapshot.referentiel?.operateurs[0]?.postes).not.toBe(journal.referentiel?.operateurs[0]?.postes);
    expect(snapshot.referentiel?.suivis[0]?.activites).not.toBe(journal.referentiel?.suivis[0]?.activites);
  });
});

describe('EvenementsDuJournal pending count', () => {
  it('should count nothing in an empty journal', () => {
    const journal = new EvenementsDuJournal([]);

    expect(journal.pendingCount()).toBe(0);
  });

  it('should count only the gestures still waiting to be published', () => {
    const evenements: EvenementDuJournal[] = [
      { geste: gesteFixture('en-attente-1'), etat: 'EN_ATTENTE' },
      { geste: gesteFixture('accepte'), etat: 'ACCEPTE' },
      { geste: gesteFixture('refuse'), etat: 'REFUSE', refus: { code: 'urn:refus', message: 'Refus' } },
      { geste: gesteFixture('en-attente-2'), etat: 'EN_ATTENTE' },
    ];

    const journal = new EvenementsDuJournal(evenements);

    expect(journal.pendingCount()).toBe(2);
  });
});
