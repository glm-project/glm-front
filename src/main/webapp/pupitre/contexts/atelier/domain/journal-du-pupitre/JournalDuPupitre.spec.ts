import { EMPTY_JOURNAL_DU_PUPITRE, GesteDePointage, JournalDuPupitre, snapshotDuJournal } from './JournalDuPupitre';

describe('JournalDuPupitre', () => {
  it('should copy non-arrival accepted events without journeeOuverte attribute', () => {
    const pointage: GesteDePointage = {
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
    expect(event !== undefined && 'journeeOuverte' in event).toBe(false);
  });

  it('should preserve and clone suivi events in journal referential', () => {
    const journal: JournalDuPupitre = {
      ...EMPTY_JOURNAL_DU_PUPITRE,
      referentiel: {
        operateurs: [{ id: 'jean', nom: 'Dupont', prenom: 'Jean', matricule: '049', postes: [] }],
        suivis: [
          {
            id: 'suivi-1',
            nom: 'OF-1',
            etat: 'EN_COURS',
            type: 'ORDRE_DE_FABRICATION',
            activites: [],
            evenements: ['EVT-1', 'EVT-2'],
          },
        ],
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
        operateurs: [{ id: 'jean', nom: 'Dupont', prenom: 'Jean', matricule: '049', postes: [{ id: 'p1', libelle: 'Poste 1' }] }],
        suivis: [
          {
            id: 'suivi-1',
            nom: 'OF-1',
            etat: 'EN_COURS',
            type: 'ORDRE_DE_FABRICATION',
            activites: [{ categorie: 'TRAVAIL', depuis: '2026-09-05T08:00:00Z', operateurId: 'jean' }],
            evenements: ['EVT-1'],
          },
        ],
      },
      evenements: [
        {
          geste: { id: 'arr-1', dateDeSurvenue: '2026-09-05T08:00:00Z', nature: 'ARRIVEE', operateurId: 'jean' },
          etat: 'ACCEPTE',
          journeeOuverte: true,
        },
        {
          geste: { id: 'ref-1', dateDeSurvenue: '2026-09-05T08:00:00Z', nature: 'ARRIVEE', operateurId: 'jean' },
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
