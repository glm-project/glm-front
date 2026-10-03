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
  reference: 'apercu-1',
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

    const autreDossier = resolution.afterPreview(
      saisie,
      { ...apercuFixture, adresse, avant: { ...dossierFixture, ligne: { ...dossierFixture.ligne, adresse } } },
      dossierFixture,
    );

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
  it.each([
    ['correction', correctionFixture, correctionActeFixture, true],
    ['regularisation', SaisieActe.regularise(faitFixture), { kind: 'REGULARISATION', fait: faitFixture }, true],
    ['invalid proposition', SaisieActe.cancel('fin-17'), apercuFixture.acte, false],
    ['different correction family', correctionFixture, apercuFixture.acte, false],
    ['different regularisation family', SaisieActe.regularise(faitFixture), correctionActeFixture, false],
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

      const previsualisee = resolution.afterPreview(saisie, { ...apercuFixture, acte });

      expect(previsualisee.confirmation() !== undefined).toBe(confirmable);
    },
  );
  it('should refuse a preview whose reference version differs from the observed dossier', () => {
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
