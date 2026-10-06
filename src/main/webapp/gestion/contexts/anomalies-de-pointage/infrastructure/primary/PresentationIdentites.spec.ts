import { describe, expect, it } from 'vitest';
import { PointageAnomalie } from '../../domain/dossier/DossierAnomalie';
import { OperateurAnomalieId } from '../../domain/dossier/OperateurAnomalieId';
import { PointageAnomalieId } from '../../domain/dossier/PointageAnomalieId';
import { PosteAnomalieId } from '../../domain/dossier/PosteAnomalieId';
import { ReferentielAnomalies } from '../../domain/dossier/ReferentielAnomalies';
import { operateurDeLActe, operateurNomme, operateurPresente, posteDeLActe, postePresente } from './PresentationIdentites';

const referentielFixture = new ReferentielAnomalies(
  [{ id: new OperateurAnomalieId('op-1'), nom: 'Ada Lovelace', postesHabilites: [] }],
  [{ id: new PosteAnomalieId('poste-1'), libelle: 'Fraiseuse 1' }],
);
const journalFixture: readonly PointageAnomalie[] = [
  {
    id: new PointageAnomalieId('p-1'),
    fait: {
      type: 'DEBUT',
      intention: 'OUVERTURE',
      activiteVisee: '',
      operateur: 'op-2',
      poste: 'poste-2',
      instant: '2026-09-14T08:00:00Z',
    },
    operateurNom: 'Alan Turing',
    posteLibelle: 'Tour 2',
    auteur: 'alan',
    enregistre: '2026-09-14T08:00:01Z',
    regularisation: false,
  },
];

describe('Operator and workstation presentation', () => {
  it('should present the resolved operator name', () => {
    expect(operateurPresente('Ada Lovelace')).toBe('Ada Lovelace');
  });

  it('should present an unresolved operator without any identity', () => {
    expect(operateurPresente('')).toBe('Opérateur non résolu');
  });

  it('should present the resolved workstation label', () => {
    expect(postePresente('Fraiseuse 1', 'poste-1')).toBe('Fraiseuse 1');
  });

  it('should present an unresolved workstation without any identity', () => {
    expect(postePresente('', 'poste-supprime')).toBe('Poste non résolu');
  });

  it.each([undefined, ''])('should present work clocked without a workstation as having none when the reference is %j', posteId => {
    expect(postePresente('', posteId)).toBe('Sans poste');
  });

  it('should name an operator with its pupitre code when it has one', () => {
    expect(operateurNomme({ id: new OperateurAnomalieId('op-1'), nom: 'Ada Lovelace', code: '007', postesHabilites: [] })).toBe(
      'Ada Lovelace · 007',
    );
  });

  it('should name an operator without a code when it has none', () => {
    expect(operateurNomme({ id: new OperateurAnomalieId('op-1'), nom: 'Ada Lovelace', postesHabilites: [] })).toBe('Ada Lovelace');
  });

  it('should name the operator of an act from the referential before the journal', () => {
    const journal = [{ ...requiredJournal(), operateurNom: 'Autre nom', fait: { ...requiredJournal().fait, operateur: 'op-1' } }];

    expect(operateurDeLActe('op-1', referentielFixture, journal)).toBe('Ada Lovelace');
  });

  it('should name the operator of an act from the journal when the referential does not hold it', () => {
    expect(operateurDeLActe('op-2', referentielFixture, journalFixture)).toBe('Alan Turing');
  });

  it('should ignore a journal fact whose operator has no name', () => {
    const journal = [{ ...requiredJournal(), operateurNom: '' }];

    expect(operateurDeLActe('op-2', referentielFixture, journal)).toBe('Opérateur non résolu');
  });

  it('should keep the operator of an act without calling it unresolved when the referential could not be read', () => {
    expect(operateurDeLActe('op-3', undefined, journalFixture)).toBe('Opérateur actuel conservé');
  });

  it('should still name the operator of an act from the journal when the referential could not be read', () => {
    expect(operateurDeLActe('op-2', undefined, journalFixture)).toBe('Alan Turing');
  });

  it('should keep the workstation of an act without calling it unresolved when the referential could not be read', () => {
    expect(posteDeLActe('poste-3', undefined, journalFixture)).toBe('Poste actuel conservé');
  });

  it('should still present an act without workstation as having none when the referential could not be read', () => {
    expect(posteDeLActe('', undefined, journalFixture)).toBe('Sans poste');
  });

  it('should name the workstation of an act from the referential before the journal', () => {
    const journal = [{ ...requiredJournal(), posteLibelle: 'Autre poste', fait: { ...requiredJournal().fait, poste: 'poste-1' } }];

    expect(posteDeLActe('poste-1', referentielFixture, journal)).toBe('Fraiseuse 1');
  });

  it('should name the workstation of an act from the journal when the referential does not hold it', () => {
    expect(posteDeLActe('poste-2', referentielFixture, journalFixture)).toBe('Tour 2');
  });

  it('should present an act without workstation as having none and an unknown workstation as unresolved', () => {
    expect(posteDeLActe('', referentielFixture, journalFixture)).toBe('Sans poste');
    expect(posteDeLActe('poste-inconnu', referentielFixture, journalFixture)).toBe('Poste non résolu');
  });

  const requiredJournal = (): PointageAnomalie => {
    const [pointage] = journalFixture;
    if (pointage === undefined) throw new Error('Missing journal fixture');
    return pointage;
  };
});
