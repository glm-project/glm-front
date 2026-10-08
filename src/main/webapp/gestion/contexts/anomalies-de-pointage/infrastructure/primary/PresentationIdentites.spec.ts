import {
  ARRET_FIXTURE,
  dossierDeFinAutomatiqueFixture,
  faitFixture,
  pointageFixture,
} from '@test/unit/fixtures/gestion/anomalies-de-pointage/DossierAnomalie.fixture';
import { describe, expect, it } from 'vitest';
import { DossierAnomalie } from '../../domain/dossier/DossierAnomalie';
import { OperateurAnomalieId } from '../../domain/dossier/OperateurAnomalieId';
import { ReferentielAnomalies } from '../../domain/dossier/ReferentielAnomalies';
import { operateurDuDossier, operateurNomme, operateurPresente, postePresente } from './PresentationIdentites';

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

  describe('operator of a dossier', () => {
    const referentielFixture = new ReferentielAnomalies(
      [{ id: new OperateurAnomalieId('op-camille'), nom: 'Camille Martin', postesHabilites: [] }],
      [],
    );
    const dossierFixture = (ligne: string, journal: string): DossierAnomalie =>
      dossierDeFinAutomatiqueFixture({
        ligne: { ...dossierDeFinAutomatiqueFixture().ligne, operateur: ligne },
        journal: [pointageFixture('debut-8', faitFixture(ARRET_FIXTURE, '2026-09-14T08:00:00Z'), { operateurNom: journal })],
      });

    it('should be the name the line of the dossier carries, before the referential and the journal', () => {
      expect(operateurDuDossier(dossierFixture('Camille Durand', 'Camille Journal'), referentielFixture)).toBe('Camille Durand');
    });

    it('should be the name of the referential, before the one of the journal, when the line carries none', () => {
      expect(operateurDuDossier(dossierFixture('', 'Camille Journal'), referentielFixture)).toBe('Camille Martin');
    });

    it('should be the name of the journal when neither the line nor the referential carries one', () => {
      expect(operateurDuDossier(dossierFixture('', 'Camille Journal'), new ReferentielAnomalies([], []))).toBe('Camille Journal');
    });

    it('should be none when no source carries a name', () => {
      expect(operateurDuDossier(dossierFixture('', ''), new ReferentielAnomalies([], []))).toBeUndefined();
    });

    it('should still be the name of the journal when the referential could not be read', () => {
      expect(operateurDuDossier(dossierFixture('', 'Camille Journal'), undefined)).toBe('Camille Journal');
    });
  });
});
