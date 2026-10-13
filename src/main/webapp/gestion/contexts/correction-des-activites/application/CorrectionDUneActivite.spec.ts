import { TestBed } from '@angular/core/testing';
import { CorrectionsFixture } from '@test/unit/fixtures/gestion/correction-des-activites/CorrectionsFixture';
import {
  ActiviteSemee,
  activiteTerminee,
  elementFixture,
  fraiseuseFixture,
  instantLocal,
  journeeFixture,
  terminee,
  tourFixture,
} from '@test/unit/fixtures/gestion/correction-des-activites/JourneeACorrigerFixture';
import { requiredFixture } from '@test/utils/RequiredFixture';
import { ContenuDAjout } from '../domain/correction/ContenuDAjout';
import { CorrectionsPort } from '../domain/correction/CorrectionsPort';
import { IntervalleDAjout } from '../domain/correction/IntervalleDAjout';
import { ActiviteTerminee } from '../domain/journee/ActiviteDeLaJournee';
import { CategorieDActivite } from '../domain/journee/CategorieDActivite';
import { PosteDeLaJournee } from '../domain/journee/PosteDeLaJournee';
import { SuiviDAtelierId } from '../domain/journee/SuiviDAtelierId';
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
const contenuDAjout = (categorie: CategorieDActivite): ContenuDAjout =>
  ContenuDAjout.de(
    JOURNEE.operateur,
    requiredFixture(JOURNEE.choix.suivis.de(new SuiviDAtelierId('suivi-1')), 'suivi-1'),
    tourFixture,
    categorie,
    requiredFixture(IntervalleDAjout.entre(instantLocal(5, 13, 30), instantLocal(5, 16, 45)), 'intervalle'),
  );
const AJOUT = contenuDAjout('TRAVAIL');
const AJOUT_EN_NON_CONFORMITE = contenuDAjout('NON_CONFORMITE');
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

  it('should change the workstation of the aimed activity under the identifier of the entry', async () => {
    givenTheEntryIdentifiers('saisie-1');

    await whenChangingTheWorkstation(SOIR, fraiseuseFixture);

    expect(port.changements.map(saisie => [saisie.id, saisie.suivi.value, saisie.activite.value, saisie.poste.value])).toEqual([
      ['saisie-1', 'suivi-1', 'soir', 'poste-fraise'],
    ]);
  });

  it('should ask to reread the day once the change of workstation is recorded', async () => {
    await whenChangingTheWorkstation(SOIR, fraiseuseFixture);

    thenTheStateIs({ kind: 'A_RELIRE', issue: 'ENREGISTREE' });
  });

  it('should ask to reread the day when the day changed meanwhile the change of workstation', async () => {
    port.repondreAuChangement({ kind: 'JOURNEE_CHANGEE' });

    await whenChangingTheWorkstation(SOIR, fraiseuseFixture);

    thenTheStateIs({ kind: 'A_RELIRE', issue: 'JOURNEE_CHANGEE' });
  });

  it('should tell the refusal with its reason when the server refuses the change of workstation', async () => {
    port.repondreAuChangement({ kind: 'REFUS', motif: 'CHEVAUCHEMENT' });

    await whenChangingTheWorkstation(SOIR, fraiseuseFixture);

    thenTheStateIs({ kind: 'REFUSEE', motif: 'CHEVAUCHEMENT' });
  });

  it('should keep the identifier when the same change of workstation is sent again after a refusal', async () => {
    givenTheEntryIdentifiers('saisie-1', 'saisie-2');
    port.repondreAuChangement({ kind: 'REFUS', motif: 'CHEVAUCHEMENT' });
    await whenChangingTheWorkstation(SOIR, fraiseuseFixture);

    await whenChangingTheWorkstation(SOIR, fraiseuseFixture);

    expect(port.changements.map(saisie => saisie.id)).toEqual(['saisie-1', 'saisie-1']);
  });

  it('should keep the identifier when the same change of workstation is sent again after a technical failure', async () => {
    givenTheEntryIdentifiers('saisie-1', 'saisie-2');
    port.repondreAuChangement(new Error('Réponse perdue'));
    await whenChangingTheWorkstation(SOIR, fraiseuseFixture);

    await whenChangingTheWorkstation(SOIR, fraiseuseFixture);

    expect(port.changements.map(saisie => saisie.id)).toEqual(['saisie-1', 'saisie-1']);
  });

  it('should tell the failure when the change of workstation could not be sent', async () => {
    port.repondreAuChangement(new Error('Réseau coupé'));

    await whenChangingTheWorkstation(SOIR, fraiseuseFixture);

    thenTheStateIs({ kind: 'ECHEC' });
  });

  it.each([
    { cas: 'recorded', reponse: { kind: 'ENREGISTREE' } },
    { cas: 'overtaken by a change of the day', reponse: { kind: 'JOURNEE_CHANGEE' } },
  ] as const)(
    'should forget the entry once the change of workstation is $cas, so that the same change later gets a new identifier',
    async ({ reponse }) => {
      givenTheEntryIdentifiers('saisie-1', 'saisie-2');
      port.repondreAuChangement(reponse);
      await whenChangingTheWorkstation(SOIR, fraiseuseFixture);

      await whenChangingTheWorkstation(SOIR, fraiseuseFixture);

      expect(port.changements.map(saisie => saisie.id)).toEqual(['saisie-1', 'saisie-2']);
    },
  );

  it.each([
    { cas: 'a technical failure', reponse: new Error('Réponse perdue') },
    { cas: 'a refusal', reponse: { kind: 'REFUS', motif: 'CHEVAUCHEMENT' } },
  ] as const)(
    'should give a new identifier to the same change of workstation once the entry was abandoned after $cas',
    async ({ reponse }) => {
      givenTheEntryIdentifiers('saisie-1', 'saisie-2');
      port.repondreAuChangement(reponse);
      await whenChangingTheWorkstation(SOIR, fraiseuseFixture);
      whenAbandoningTheChangeOfWorkstation();

      await whenChangingTheWorkstation(SOIR, fraiseuseFixture);

      expect(port.changements.map(saisie => saisie.id)).toEqual(['saisie-1', 'saisie-2']);
    },
  );

  it('should keep the entry of a removal when the change of workstation is abandoned', async () => {
    givenTheEntryIdentifiers('saisie-1', 'saisie-2');
    port.repondre(new Error('Réponse perdue'));
    await whenRemoving(SOIR);
    whenAbandoningTheChangeOfWorkstation();

    await whenRemoving(SOIR);

    expect(port.retraits.map(saisie => saisie.id)).toEqual(['saisie-1', 'saisie-1']);
  });

  it('should send no change of workstation while a removal is awaited', async () => {
    const arrivee = port.retenir();
    const retrait = whenRemoving(SOIR);
    await arrivee;

    await whenChangingTheWorkstation(MATIN, fraiseuseFixture);
    port.liberer();
    await retrait;

    expect(port.changements).toEqual([]);
  });

  it('should add the activity to its suivi under the identifier of the entry', async () => {
    givenTheEntryIdentifiers('saisie-1');

    await whenAdding(AJOUT);

    expect(
      port.ajouts.map(saisie => [saisie.id, saisie.operateur.value, saisie.suivi.value, saisie.poste.value, saisie.categorie]),
    ).toEqual([['saisie-1', 'op-1', 'suivi-1', 'poste-tour', 'TRAVAIL']]);
    expect(port.ajouts.map(saisie => [saisie.debut, saisie.fin])).toEqual([[AJOUT.intervalle.debut, AJOUT.intervalle.fin]]);
  });

  it('should ask to reread the day once the addition is recorded', async () => {
    await whenAdding(AJOUT);

    thenTheStateIs({ kind: 'A_RELIRE', issue: 'ENREGISTREE' });
  });

  it('should ask to reread the day when the day changed meanwhile the addition', async () => {
    port.repondreALAjout({ kind: 'JOURNEE_CHANGEE' });

    await whenAdding(AJOUT);

    thenTheStateIs({ kind: 'A_RELIRE', issue: 'JOURNEE_CHANGEE' });
  });

  it.each([{ motif: 'CHEVAUCHEMENT' }, { motif: 'FIN_FUTURE' }] as const)(
    'should tell the refusal with its reason $motif when the server refuses the addition',
    async ({ motif }) => {
      port.repondreALAjout({ kind: 'REFUS', motif });

      await whenAdding(AJOUT);

      thenTheStateIs({ kind: 'AJOUT_REFUSE', motif });
    },
  );

  it.each([
    { cas: 'a refusal', reponse: { kind: 'REFUS', motif: 'CHEVAUCHEMENT' } },
    { cas: 'a technical failure', reponse: new Error('Réponse perdue') },
  ] as const)('should keep the identifier when the same addition is sent again after $cas', async ({ reponse }) => {
    givenTheEntryIdentifiers('saisie-1', 'saisie-2');
    port.repondreALAjout(reponse);
    await whenAdding(AJOUT);

    await whenAdding(AJOUT);

    expect(port.ajouts.map(saisie => saisie.id)).toEqual(['saisie-1', 'saisie-1']);
  });

  it('should give another identifier to another activity added after a refusal', async () => {
    givenTheEntryIdentifiers('saisie-1', 'saisie-2');
    port.repondreALAjout({ kind: 'REFUS', motif: 'CHEVAUCHEMENT' });
    await whenAdding(AJOUT);

    await whenAdding(AJOUT_EN_NON_CONFORMITE);

    expect(port.ajouts.map(saisie => saisie.id)).toEqual(['saisie-1', 'saisie-2']);
  });

  it('should tell the failure when the addition could not be sent', async () => {
    port.repondreALAjout(new Error('Réseau coupé'));

    await whenAdding(AJOUT);

    thenTheStateIs({ kind: 'ECHEC' });
  });

  it.each([
    { cas: 'recorded', reponse: { kind: 'ENREGISTREE' } },
    { cas: 'overtaken by a change of the day', reponse: { kind: 'JOURNEE_CHANGEE' } },
  ] as const)(
    'should forget the entry once the addition is $cas, so that the same activity added later gets a new identifier',
    async ({ reponse }) => {
      givenTheEntryIdentifiers('saisie-1', 'saisie-2');
      port.repondreALAjout(reponse);
      await whenAdding(AJOUT);

      await whenAdding(AJOUT);

      expect(port.ajouts.map(saisie => saisie.id)).toEqual(['saisie-1', 'saisie-2']);
    },
  );

  it('should give a new identifier to the same activity added again after it was added then removed', async () => {
    givenTheEntryIdentifiers('saisie-1', 'saisie-2', 'saisie-3');
    await whenAdding(AJOUT);
    await whenRemoving(SOIR);

    await whenAdding(AJOUT);

    expect(port.ajouts.map(saisie => saisie.id)).toEqual(['saisie-1', 'saisie-3']);
  });

  it.each([
    { cas: 'a technical failure', reponse: new Error('Réponse perdue') },
    { cas: 'a refusal', reponse: { kind: 'REFUS', motif: 'FIN_FUTURE' } },
  ] as const)('should give a new identifier to the same addition once the entry was abandoned after $cas', async ({ reponse }) => {
    givenTheEntryIdentifiers('saisie-1', 'saisie-2');
    port.repondreALAjout(reponse);
    await whenAdding(AJOUT);
    whenAbandoningTheAddition();

    await whenAdding(AJOUT);

    expect(port.ajouts.map(saisie => saisie.id)).toEqual(['saisie-1', 'saisie-2']);
  });

  it('should keep the entry of a change of workstation when the addition is abandoned', async () => {
    givenTheEntryIdentifiers('saisie-1', 'saisie-2');
    port.repondreAuChangement(new Error('Réponse perdue'));
    await whenChangingTheWorkstation(SOIR, fraiseuseFixture);
    whenAbandoningTheAddition();

    await whenChangingTheWorkstation(SOIR, fraiseuseFixture);

    expect(port.changements.map(saisie => saisie.id)).toEqual(['saisie-1', 'saisie-1']);
  });

  it('should keep the entry of an addition when the change of workstation is abandoned', async () => {
    givenTheEntryIdentifiers('saisie-1', 'saisie-2');
    port.repondreALAjout(new Error('Réponse perdue'));
    await whenAdding(AJOUT);
    whenAbandoningTheChangeOfWorkstation();

    await whenAdding(AJOUT);

    expect(port.ajouts.map(saisie => saisie.id)).toEqual(['saisie-1', 'saisie-1']);
  });

  it('should send no addition while a removal is awaited', async () => {
    const arrivee = port.retenir();
    const retrait = whenRemoving(SOIR);
    await arrivee;

    await whenAdding(AJOUT);
    port.liberer();
    await retrait;

    expect(port.ajouts).toEqual([]);
  });

  const givenTheEntryIdentifiers = (...identifiants: readonly string[]): void => {
    const generateur = vi.spyOn(crypto, 'randomUUID');
    for (const identifiant of identifiants)
      generateur.mockReturnValueOnce(identifiant as `${string}-${string}-${string}-${string}-${string}`);
  };

  const service = (): CorrectionDUneActivite => TestBed.inject(CorrectionDUneActivite);

  const whenRemoving = (activite: ActiviteTerminee): Promise<void> => service().retirer(activite);

  const whenChangingTheWorkstation = (activite: ActiviteTerminee, poste: PosteDeLaJournee): Promise<void> =>
    service().changerDePoste(activite, poste);

  const whenAdding = (contenu: ContenuDAjout): Promise<void> => service().ajouter(contenu);

  const whenAbandoningTheAddition = (): void => {
    service().abandonnerLAjout();
  };

  const whenAbandoningTheChangeOfWorkstation = (): void => {
    service().abandonnerLeChangementDePoste();
  };

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
