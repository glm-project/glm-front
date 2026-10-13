import { TestBed } from '@angular/core/testing';
import { CorrectionsFixture } from '@test/unit/fixtures/gestion/correction-des-activites/CorrectionsFixture';
import {
  ActiviteSemee,
  activiteTerminee,
  elementFixture,
  instantLocal,
  journeeFixture,
  terminee,
  tourFixture,
} from '@test/unit/fixtures/gestion/correction-des-activites/JourneeACorrigerFixture';
import { CorrectionsPort } from '../domain/correction/CorrectionsPort';
import { ActiviteTerminee } from '../domain/journee/ActiviteDeLaJournee';
import { CorrectionDUneActivite, EtatDeCorrection } from './CorrectionDUneActivite';

const activiteSemee = (id: string): ActiviteSemee => ({
  id,
  suivi: 'suivi-1',
  poste: tourFixture,
  debut: instantLocal(5, 18, 30),
  etat: terminee(instantLocal(5, 21, 45), 'PT3H15M'),
});

const JOURNEE = journeeFixture({
  jour: 5,
  suivis: [{ suivi: 'suivi-1', element: elementFixture('1') }],
  activites: [activiteSemee('soir'), activiteSemee('matin')],
});
const SOIR = activiteTerminee(JOURNEE, 'soir');
const MATIN = activiteTerminee(JOURNEE, 'matin');

describe('Correction of an activity', () => {
  let port: CorrectionsFixture;

  beforeEach(() => {
    port = new CorrectionsFixture();
    TestBed.configureTestingModule({ providers: [CorrectionDUneActivite, { provide: CorrectionsPort, useValue: port }] });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should be at rest before any correction', () => {
    thenTheStateIs({ kind: 'REPOS' });
  });

  it('should remove the aimed activity from its suivi under the identifier of the entry', async () => {
    givenTheEntryIdentifiers('saisie-1');

    await whenRemoving(SOIR);

    expect(port.retraits.map(saisie => [saisie.id, saisie.suivi.value, saisie.activite.value])).toEqual([['saisie-1', 'suivi-1', 'soir']]);
  });

  it('should ask to reread the day once the removal is recorded', async () => {
    await whenRemoving(SOIR);

    thenTheStateIs({ kind: 'A_RELIRE', issue: 'ENREGISTREE' });
  });

  it('should ask to reread the day when the day changed meanwhile', async () => {
    port.repondre({ kind: 'JOURNEE_CHANGEE' });

    await whenRemoving(SOIR);

    thenTheStateIs({ kind: 'A_RELIRE', issue: 'JOURNEE_CHANGEE' });
  });

  it('should tell the failure when the removal could not be sent', async () => {
    port.repondre(new Error('Réseau coupé'));

    await whenRemoving(SOIR);

    thenTheStateIs({ kind: 'ECHEC' });
  });

  it('should keep the identifier when the same removal is sent again after a technical failure', async () => {
    givenTheEntryIdentifiers('saisie-1', 'saisie-2');
    port.repondre(new Error('Réponse perdue'));
    await whenRemoving(SOIR);

    await whenRemoving(SOIR);

    expect(port.retraits.map(saisie => saisie.id)).toEqual(['saisie-1', 'saisie-1']);
    thenTheStateIs({ kind: 'A_RELIRE', issue: 'ENREGISTREE' });
  });

  it('should give another identifier to the removal of another activity sent after a technical failure', async () => {
    givenTheEntryIdentifiers('saisie-1', 'saisie-2');
    port.repondre(new Error('Réponse perdue'));
    await whenRemoving(SOIR);

    await whenRemoving(MATIN);

    expect(port.retraits.map(saisie => saisie.id)).toEqual(['saisie-1', 'saisie-2']);
  });

  it.each([
    { cas: 'recorded', reponse: { kind: 'ENREGISTREE' } },
    { cas: 'overtaken by a change of the day', reponse: { kind: 'JOURNEE_CHANGEE' } },
  ] as const)(
    'should forget the entry once the removal is $cas, so that the same removal later gets a new identifier',
    async ({ reponse }) => {
      givenTheEntryIdentifiers('saisie-1', 'saisie-2');
      port.repondre(reponse);
      await whenRemoving(SOIR);

      await whenRemoving(SOIR);

      expect(port.retraits.map(saisie => saisie.id)).toEqual(['saisie-1', 'saisie-2']);
    },
  );

  it('should be under way while the answer is awaited', async () => {
    const etatPendantLAttente = await whenRemovingAndObservingTheStateWhileTheAnswerIsAwaited();

    expect(etatPendantLAttente).toEqual({ kind: 'EN_COURS' });
  });

  it('should send nothing more while the answer to the first removal is awaited', async () => {
    const arrivee = port.retenir();
    const premiere = whenRemoving(SOIR);
    await arrivee;

    await whenRemoving(SOIR);
    port.liberer();
    await premiere;

    expect(port.retraits).toHaveLength(1);
  });

  const givenTheEntryIdentifiers = (...identifiants: readonly string[]): void => {
    const generateur = vi.spyOn(crypto, 'randomUUID');
    for (const identifiant of identifiants)
      generateur.mockReturnValueOnce(identifiant as `${string}-${string}-${string}-${string}-${string}`);
  };

  const service = (): CorrectionDUneActivite => TestBed.inject(CorrectionDUneActivite);

  const whenRemoving = (activite: ActiviteTerminee): Promise<void> => service().retirer(activite);

  const whenRemovingAndObservingTheStateWhileTheAnswerIsAwaited = async (): Promise<EtatDeCorrection> => {
    const arrivee = port.retenir();
    const retrait = whenRemoving(SOIR);
    await arrivee;
    const etat = service().etat();
    port.liberer();
    await retrait;
    return etat;
  };

  const thenTheStateIs = (attendu: EtatDeCorrection): void => {
    expect(service().etat()).toEqual(attendu);
  };
});
