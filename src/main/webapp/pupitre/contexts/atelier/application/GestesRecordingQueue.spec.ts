import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import { FenetreOperateur, LotDeGestesDAtelier } from '@/pupitre/contexts/atelier/domain/designation/FenetreOperateur';
import { IdentiteDeFenetre } from '@/pupitre/contexts/atelier/domain/designation/IdentiteDeFenetre';
import { Matricule } from '@/pupitre/contexts/atelier/domain/designation/Matricule';
import { Entreprise } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/Entreprise';
import {
  EMPTY_JOURNAL_DU_PUPITRE,
  GesteDAtelier,
  GesteDePresence,
  JournalDuPupitre,
} from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournalDuPupitre';
import { JournauxDuPupitrePort } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournauxDuPupitrePort';
import { Injector } from '@angular/core';
import { JournauxDuPupitreFixture } from '@test/unit/fixtures/pupitre/atelier/JournauxDuPupitreFixture';
import { IntentionGlobaleInitiee } from '../domain/designation/IntentionGlobaleInitiee';
import { GestesRecordingQueue } from './GestesRecordingQueue';

const vueFixture: JournalDuPupitre = {
  ...EMPTY_JOURNAL_DU_PUPITRE,
  referentiel: {
    operateurs: [{ id: 'jean', nom: 'Dupont', prenom: 'Jean', matricule: '049', postes: [{ id: 'tour', libelle: 'Tour' }] }],
    suivis: [
      {
        id: 'moule-1015',
        nom: 'PR-2026-000015',
        reference: '1015',
        etat: 'EN_COURS',
        type: 'PRODUIT',
        activites: [{ operateurId: 'jean', categorie: 'TRAVAIL', depuis: '2026-09-05T06:00:00Z', posteId: 'tour' }],
        evenements: [],
      },
    ],
  },
};

describe('GestesRecordingQueue', () => {
  let acceptation: GestesRecordingQueue;
  let journal: JournauxDuPupitreFixture;
  let tenant: string | undefined;

  beforeEach(() => {
    journal = new JournauxDuPupitreFixture();
    journal.answerReadsImmediately();
    tenant = 'entreprise-a';

    acceptation = Injector.create({
      providers: [
        GestesRecordingQueue,
        { provide: JournauxDuPupitrePort, useValue: journal },
        {
          provide: AuthenticationPort,
          useValue: {
            synchronizeSession: () => Promise.resolve(),
            currentTenant: () => tenant,
            currentToken: () => 'token',
          },
        },
      ],
    }).get(GestesRecordingQueue);
  });

  it('should capture pause presence when global intention is pause', async () => {
    const fenetre = givenAnOpenOperatorWindow();

    await whenCapturingGlobalIntention(fenetre, 'PAUSE', '11111111-2222-3333-4444-0000000a');

    const gestures = await whenReadingRecordedGestures('entreprise-a');
    thenPresenceTypeIs(gestures, 'PAUSE');
  });

  it('should retain the initiated root identity among the distinct IDs accepted for a global stop', async () => {
    const fenetre = givenAnOpenOperatorWindow();
    const identityFixture = '11111111-2222-4333-8444-55550000000a';

    await whenCapturingGlobalIntention(fenetre, 'TOUT_ARRETER', identityFixture);

    const gestures = await whenReadingRecordedGestures('entreprise-a');
    thenRecordedGesturesRetainRootIdentity(gestures, identityFixture);
  });

  it('should capture prepared gestures directly', async () => {
    const fenetre = givenAnOpenOperatorWindow();
    const lot: LotDeGestesDAtelier = {
      kind: 'GESTES',
      capture: () => [
        {
          id: 'pointage-1',
          dateDeSurvenue: '2026-09-05T09:00:00Z',
          operateurId: 'jean',
          nature: 'POINTAGE',
          suiviId: 'moule-1015',
          type: 'FIN',
        },
      ],
      contextesParGeste: new Map(),
      intention: 1,
    };

    await acceptation.capture(fenetre, { kind: 'PREPAREE', gestes: lot }, () => fenetre);

    const gestures = await whenReadingRecordedGestures('entreprise-a');
    expect(gestures.map(g => g.id)).toEqual(['pointage-1']);
  });

  it('should drain in-flight captures before completing', async () => {
    const fenetre = givenAnOpenOperatorWindow();
    const lot: LotDeGestesDAtelier = {
      kind: 'GESTES',
      capture: () => [
        {
          id: 'pointage-1',
          dateDeSurvenue: '2026-09-05T09:00:00Z',
          operateurId: 'jean',
          nature: 'POINTAGE',
          suiviId: 'moule-1015',
          type: 'FIN',
        },
      ],
      contextesParGeste: new Map(),
      intention: 1,
    };

    const capturePromise = acceptation.capture(fenetre, { kind: 'PREPAREE', gestes: lot }, () => fenetre);
    await acceptation.drain();
    await capturePromise;

    const gestures = await whenReadingRecordedGestures('entreprise-a');
    expect(gestures.length).toBe(1);
  });

  it('should reject capture when company does not match window scope', async () => {
    const fenetre = givenAnOpenOperatorWindow();
    const lot: LotDeGestesDAtelier = {
      kind: 'GESTES',
      capture: () => [],
      contextesParGeste: new Map(),
      intention: 1,
    };
    tenant = 'autre-entreprise';

    await expect(acceptation.capture(fenetre, { kind: 'PREPAREE', gestes: lot }, () => fenetre)).rejects.toThrow(
      'La fenetre operateur a change.',
    );
  });

  const givenAnOpenOperatorWindow = (): FenetreOperateur =>
    FenetreOperateur.open(
      Entreprise.of('entreprise-a'),
      structuredClone(vueFixture),
      Matricule.of('049'),
      Date.parse('2026-09-05T09:00:00Z'),
      new IdentiteDeFenetre(1),
    );

  const whenCapturingGlobalIntention = async (
    fenetre: FenetreOperateur,
    commande: 'PAUSE' | 'REPRENDRE' | 'TOUT_ARRETER',
    id: string,
  ): Promise<void> => {
    await acceptation.capture(
      fenetre,
      { kind: 'GLOBALE', commande: new IntentionGlobaleInitiee(commande, { id, dateDeSurvenue: '2026-09-05T09:00:00Z' }) },
      () => fenetre,
    );
  };

  const whenReadingRecordedGestures = async (entreprise: string): Promise<readonly GesteDAtelier[]> => {
    const state = await journal.read(Entreprise.of(entreprise));
    return state.evenements.map(e => e.geste);
  };

  const thenPresenceTypeIs = (gestures: readonly GesteDAtelier[], expectedPresenceType: 'PAUSE' | 'REPRISE'): void => {
    const presence = gestures.find(g => g.nature === 'PRESENCE');
    expect(presence).toBeDefined();
    expect((presence as GesteDePresence).type).toBe(expectedPresenceType);
  };

  const thenRecordedGesturesRetainRootIdentity = (gestures: readonly GesteDAtelier[], rootIdentity: string): void => {
    expect(gestures.length).toBe(3);
    const ids = gestures.map(g => g.id);
    expect(ids).toContain(rootIdentity);
    expect(new Set(ids).size).toBe(gestures.length);
    for (const gesture of gestures) {
      expect(gesture.dateDeSurvenue).toBe('2026-09-05T09:00:00Z');
      expect(gesture.operateurId).toBe('jean');
    }
  };
});
