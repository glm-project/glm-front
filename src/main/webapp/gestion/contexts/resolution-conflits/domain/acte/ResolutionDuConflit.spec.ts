import { ActiviteConflitId } from '../dossier/ActiviteConflitId';
import { DossierConflit } from '../dossier/DossierConflit';
import { ElementConflitId } from '../dossier/ElementConflitId';
import { PointageConflitId } from '../dossier/PointageConflitId';
import { SuiviConflitId } from '../dossier/SuiviConflitId';
import { ActeResolution, FaitPropose } from './ActeResolution';
import { ApercuConflit } from './ConflitsActesPorts';
import { ResolutionDuConflit } from './ResolutionDuConflit';
import { SaisieActe } from './SaisieActe';

const dossierFixture: DossierConflit = {
  ligne: {
    adresse: { suivi: new SuiviConflitId('suivi-1'), pointage: new PointageConflitId('fin-17') },
    element: new ElementConflitId('element-1'),
    designation: 'Pièce',
    operateur: 'Luc',
    poste: 'Scie',
    date: '2026-09-14',
    explication: 'Deux fins',
    nombrePointages: 2,
  },
  version: 1,
  cloture: false,
  engagement: '2026-09-14T08:00:00+02:00',
  journal: [],
  activites: [{ id: new ActiviteConflitId('travail-8'), libelle: 'Travail', etat: 'A_RESOUDRE', temps: 'À résoudre' }],
  choix: [],
  enConflit: true,
  consequences: [],
  continuations: [],
};
const apercuFixture: ApercuConflit = {
  empreinteConsequences: 'empreinte-1',
  evaluation: '2026-10-03T10:00:00Z',
  commande: 'commande-1',
  version: 1,
  adresse: dossierFixture.ligne.adresse,
  acte: { kind: 'ANNULATION', pointage: 'fin-17', motif: 'Double appui' },
  avant: dossierFixture,
  apres: { ...dossierFixture, enConflit: false },
};
const faitFixture: FaitPropose = {
  type: 'FIN',
  intention: 'FIN',
  activiteVisee: 'travail-8',
  operateur: 'op-1',
  poste: '',
  instant: '2026-09-14T17:00:00.123456789+02:00',
};
const correctionFixture = SaisieActe.correct('fin-17', faitFixture).afterChange({ motif: 'Cible vérifiée' });
const correctionActeFixture: ActeResolution = { kind: 'CORRECTION', pointage: 'fin-17', motif: 'Cible vérifiée', fait: faitFixture };

describe('Explicit confirmation of a resolution', () => {
  it.each([
    [correctionFixture, correctionActeFixture],
    [SaisieActe.regularise(faitFixture), { kind: 'REGULARISATION', fait: faitFixture }],
  ] satisfies readonly [SaisieActe, ActeResolution][])(
    'should preserve the exact prospective event in an explicit creation proposal',
    (saisie, acte) => {
      const apercu = { ...apercuFixture, acte, evenement: 'evenement-1' };
      const resolution = ResolutionDuConflit.prepare(saisie).afterPreview(saisie, apercu);

      const confirmation = resolution.confirmation();

      expect(confirmation).toStrictEqual({
        adresse: dossierFixture.ligne.adresse,
        commande: 'commande-1',
        version: 1,
        acte,
        empreinteConsequences: 'empreinte-1',
        evenement: 'evenement-1',
      });
    },
  );

  it('should keep the command identity distinct from the event created by its correction', () => {
    const resolution = ResolutionDuConflit.prepare(correctionFixture);

    const confondue = resolution.afterPreview(correctionFixture, {
      ...apercuFixture,
      acte: correctionActeFixture,
      evenement: 'commande-1',
    });

    expect(confondue.confirmation()).toBeUndefined();
  });
  it('should refuse a cancellation preview carrying a prospective event although cancellation creates none', () => {
    const saisie = SaisieActe.cancel('fin-17').afterChange({ motif: 'Double appui' });
    const resolution = ResolutionDuConflit.prepare(saisie);

    const incorrect = resolution.afterPreview(saisie, { ...apercuFixture, evenement: 'evenement-1' });

    expect(incorrect.confirmation()).toBeUndefined();
  });

  it('should refuse a correction preview without the prospective event needed for confirmation and retries', () => {
    const resolution = ResolutionDuConflit.prepare(correctionFixture);

    const incomplete = resolution.afterPreview(correctionFixture, { ...apercuFixture, acte: correctionActeFixture });

    expect(incomplete.confirmation()).toBeUndefined();
  });

  it('should confirm the explicit cancellation without submitting its preview snapshots or technical ticket', () => {
    const saisie = SaisieActe.cancel('fin-17').afterChange({ motif: 'Double appui' });
    const apercu = { ...apercuFixture, empreinteConsequences: 'empreinte-1', evaluation: '2026-10-03T10:00:00Z' };
    const resolution = ResolutionDuConflit.prepare(saisie).afterPreview(saisie, apercu);

    const confirmation = resolution.confirmation();

    expect(confirmation).toStrictEqual({
      adresse: dossierFixture.ligne.adresse,
      commande: 'commande-1',
      version: 1,
      acte: { kind: 'ANNULATION', pointage: 'fin-17', motif: 'Double appui' },
      empreinteConsequences: 'empreinte-1',
    });
  });

  it('should refuse a preview whose before snapshot belongs to another dossier', () => {
    const saisie = SaisieActe.cancel('fin-17').afterChange({ motif: 'Double appui' });
    const resolution = ResolutionDuConflit.prepare(saisie);
    const adresse = { suivi: new SuiviConflitId('suivi-2'), pointage: new PointageConflitId('fin-17') };

    const autreJournal = resolution.afterPreview(
      saisie,
      { ...apercuFixture, avant: { ...dossierFixture, ligne: { ...dossierFixture.ligne, adresse } } },
      dossierFixture,
    );

    expect(autreJournal.confirmation()).toBeUndefined();
  });
  it.each([
    { suivi: new SuiviConflitId('suivi-2'), pointage: new PointageConflitId('fin-17') },
    { suivi: new SuiviConflitId('suivi-1'), pointage: new PointageConflitId('fin-18') },
  ])('should refuse a preview addressed to another dossier despite having the same acte and version', adresse => {
    const saisie = SaisieActe.cancel('fin-17').afterChange({ motif: 'Double appui' });
    const resolution = ResolutionDuConflit.prepare(saisie);

    const autreDossier = resolution.afterPreview(saisie, { ...apercuFixture, adresse }, dossierFixture);

    expect(autreDossier.confirmation()).toBeUndefined();
  });
  it('should refuse consequences computed from a different version than the dossier actually requested', () => {
    const saisie = SaisieActe.cancel('fin-17').afterChange({ motif: 'Double appui' });
    const resolution = ResolutionDuConflit.prepare(saisie);

    const autreVersion = resolution.afterPreview(
      saisie,
      { ...apercuFixture, version: 2, avant: { ...dossierFixture, version: 2 } },
      dossierFixture,
    );

    expect(autreVersion.confirmation()).toBeUndefined();
  });
  it('should refuse a before snapshot whose version differs from the preview proposal and requested dossier', () => {
    const saisie = SaisieActe.cancel('fin-17').afterChange({ motif: 'Double appui' });
    const resolution = ResolutionDuConflit.prepare(saisie);

    const autreVersion = resolution.afterPreview(saisie, { ...apercuFixture, avant: { ...dossierFixture, version: 2 } }, dossierFixture);

    expect(autreVersion.confirmation()).toBeUndefined();
  });
  it.each([
    ['correction', correctionFixture, correctionActeFixture, true],
    ['regularisation', SaisieActe.regularise(faitFixture), { kind: 'REGULARISATION', fait: faitFixture }, true],
    ['invalid proposition', SaisieActe.cancel('fin-17'), apercuFixture.acte, false],
    ['different correction family', correctionFixture, apercuFixture.acte, false],
    ['different regularisation family', SaisieActe.regularise(faitFixture), correctionActeFixture, false],
    [
      'different cancellation motif',
      SaisieActe.cancel('fin-17').afterChange({ motif: 'Double appui' }),
      { kind: 'ANNULATION', pointage: 'fin-17', motif: 'Autre motif' },
      false,
    ],
    ['different corrected pointage', correctionFixture, { ...correctionActeFixture, pointage: 'fin-18' }, false],
    ['different correction motif', correctionFixture, { ...correctionActeFixture, motif: 'Autre motif' }, false],
    ['different type', correctionFixture, { ...correctionActeFixture, fait: { ...faitFixture, type: 'DEBUT' } }, false],
    ['different intention', correctionFixture, { ...correctionActeFixture, fait: { ...faitFixture, intention: 'OUVERTURE' } }, false],
    ['different activity', correctionFixture, { ...correctionActeFixture, fait: { ...faitFixture, activiteVisee: 'nc-12' } }, false],
    ['different operator', correctionFixture, { ...correctionActeFixture, fait: { ...faitFixture, operateur: 'op-2' } }, false],
    ['different workstation', correctionFixture, { ...correctionActeFixture, fait: { ...faitFixture, poste: 'poste-2' } }, false],
    [
      'different instant precision',
      correctionFixture,
      { ...correctionActeFixture, fait: { ...faitFixture, instant: '2026-09-14T17:00:00.123+02:00' } },
      false,
    ],
  ] satisfies readonly [string, SaisieActe, ActeResolution, boolean][])(
    'should confirm only the exact proposed acte when receiving %s',
    (_description, saisie, acte, confirmable) => {
      const resolution = ResolutionDuConflit.prepare(saisie);

      const previsualisee = resolution.afterPreview(saisie, {
        ...apercuFixture,
        acte,
        ...(acte.kind === 'ANNULATION' ? {} : { evenement: 'evenement-1' }),
      });

      expect(previsualisee.confirmation() !== undefined).toBe(confirmable);
    },
  );
  it('should refuse a preview whose expected version differs from the observed dossier', () => {
    const saisie = SaisieActe.cancel('fin-17').afterChange({ motif: 'Double appui' });
    const resolution = ResolutionDuConflit.prepare(saisie);

    const obsolete = resolution.afterPreview(saisie, { ...apercuFixture, version: 2 });

    expect(obsolete.confirmation()).toBeUndefined();
  });
  it('should refuse a preview describing a different acte from the chosen proposition', () => {
    const saisie = SaisieActe.cancel('fin-17').afterChange({ motif: 'Double appui' });
    const resolution = ResolutionDuConflit.prepare(saisie);

    const trompeuse = resolution.afterPreview(saisie, {
      ...apercuFixture,
      acte: { kind: 'ANNULATION', pointage: 'fin-18', motif: 'Double appui' },
    });

    expect(trompeuse.confirmation()).toBeUndefined();
  });
  it('should ignore a preview received for a proposition already replaced', () => {
    const saisie = SaisieActe.cancel('fin-17').afterChange({ motif: 'Double appui' });
    const resolution = ResolutionDuConflit.prepare(saisie).afterChange({ motif: 'Autre décision' });

    const ancienne = resolution.afterPreview(saisie, apercuFixture);

    expect(ancienne.confirmation()).toBeUndefined();
  });
  it('should invalidate confirmation when the previewed proposition changes', () => {
    const saisie = SaisieActe.cancel('fin-17').afterChange({ motif: 'Double appui' });
    const resolution = ResolutionDuConflit.prepare(saisie).afterPreview(saisie, apercuFixture);

    const modifiee = resolution.afterChange({ motif: 'Autre décision' });

    expect(modifiee.confirmation()).toBeUndefined();
    expect(modifiee.saisie.command()).toEqual({ kind: 'ANNULATION', pointage: 'fin-17', motif: 'Autre décision' });
  });
});
