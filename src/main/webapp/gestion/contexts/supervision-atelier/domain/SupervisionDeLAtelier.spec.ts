import { FenetreDePresence } from './FenetreDePresence';
import { IdentifiantOperateur } from './IdentifiantOperateur';
import { JourneeDeTravail } from './JourneeDeTravail';
import { OperateurDeclare } from './OperateurDeclare';
import { OperateurSupervise } from './OperateurSupervise';
import { SupervisionDeLAtelier } from './SupervisionDeLAtelier';

describe('SupervisionDeLAtelier', () => {
  it('should produce an empty supervision when no operators are declared', () => {
    const supervision = SupervisionDeLAtelier.determine([], []);

    expect(supervision.operateurs).toEqual([]);
  });

  it('should determine operator as absent when no open working visit exists', () => {
    const operateur = new OperateurDeclare(new IdentifiantOperateur('op-1'), 'Dupont', 'Jean');

    const supervision = SupervisionDeLAtelier.determine([operateur], []);

    expect(supervision.operateurs).toEqual([new OperateurSupervise(operateur, 'ABSENT')]);
  });

  it('should determine operator as present when an open working visit is present', () => {
    const operateur = new OperateurDeclare(new IdentifiantOperateur('op-1'), 'Dupont', 'Jean');
    const journee = JourneeDeTravail.open(operateur.id, 'PRESENT');

    const supervision = SupervisionDeLAtelier.determine([operateur], [journee]);

    expect(supervision.operateurs).toEqual([new OperateurSupervise(operateur, 'PRESENT')]);
  });

  it('should determine operator as absent when their working visit is closed', () => {
    const operateur = new OperateurDeclare(new IdentifiantOperateur('op-1'), 'Dupont', 'Jean');
    const journeeFermee = JourneeDeTravail.closed(operateur.id);

    const supervision = SupervisionDeLAtelier.determine([operateur], [journeeFermee]);

    expect(supervision.operateurs).toEqual([new OperateurSupervise(operateur, 'ABSENT')]);
  });

  it('should determine operator as present when they have both a closed working visit and an open working visit', () => {
    const operateur = new OperateurDeclare(new IdentifiantOperateur('op-1'), 'Dupont', 'Jean');
    const journeeFermee = JourneeDeTravail.closed(operateur.id);
    const journeeOuverte = JourneeDeTravail.open(operateur.id, 'PRESENT');

    const supervision = SupervisionDeLAtelier.determine([operateur], [journeeFermee, journeeOuverte]);

    expect(supervision.operateurs).toEqual([new OperateurSupervise(operateur, 'PRESENT')]);
  });

  it('should determine operator as on pause when an open working visit is on pause', () => {
    const operateur = new OperateurDeclare(new IdentifiantOperateur('op-1'), 'Dupont', 'Jean');
    const journee = JourneeDeTravail.open(operateur.id, 'EN_PAUSE');

    const supervision = SupervisionDeLAtelier.determine([operateur], [journee]);

    expect(supervision.operateurs).toEqual([new OperateurSupervise(operateur, 'EN_PAUSE')]);
  });

  it('should order operators alphabetically regardless of their presence state', () => {
    const martin = new OperateurDeclare(new IdentifiantOperateur('op-3'), 'Martin', 'Alice');
    const bernardClaude = new OperateurDeclare(new IdentifiantOperateur('op-2'), 'Bernard', 'Claude');
    const dupont = new OperateurDeclare(new IdentifiantOperateur('op-1'), 'Dupont', 'Jean');
    const bernardAlexandre = new OperateurDeclare(new IdentifiantOperateur('op-4'), 'Bernard', 'Alexandre');

    const journees = [
      JourneeDeTravail.open(martin.id, 'PRESENT'),
      JourneeDeTravail.open(dupont.id, 'EN_PAUSE'),
      JourneeDeTravail.open(bernardAlexandre.id, 'PRESENT'),
    ];

    const supervision = SupervisionDeLAtelier.determine([martin, bernardClaude, dupont, bernardAlexandre], journees);

    expect(supervision.operateurs).toEqual([
      new OperateurSupervise(bernardAlexandre, 'PRESENT'),
      new OperateurSupervise(bernardClaude, 'ABSENT'),
      new OperateurSupervise(dupont, 'EN_PAUSE'),
      new OperateurSupervise(martin, 'PRESENT'),
    ]);
  });

  it('should determine operator as present for a working visit crossing midnight', () => {
    const operateur = new OperateurDeclare(new IdentifiantOperateur('op-night'), 'Nuit', 'Marc');
    const fenetre = new FenetreDePresence('2026-09-12T22:00:00Z');
    const journeeDeNuit = JourneeDeTravail.open(operateur.id, 'PRESENT', [fenetre]);

    const supervision = SupervisionDeLAtelier.determine([operateur], [journeeDeNuit]);

    expect(supervision.operateurs).toEqual([new OperateurSupervise(operateur, 'PRESENT')]);
  });

  it('should determine operator as present for an old working visit that remains open', () => {
    const operateur = new OperateurDeclare(new IdentifiantOperateur('op-old'), 'Ancien', 'Paul');
    const fenetreAncienne = new FenetreDePresence('2026-09-08T07:00:00Z');
    const journeeAncienne = JourneeDeTravail.open(operateur.id, 'PRESENT', [fenetreAncienne]);

    const supervision = SupervisionDeLAtelier.determine([operateur], [journeeAncienne]);

    expect(supervision.operateurs).toEqual([new OperateurSupervise(operateur, 'PRESENT')]);
  });

  it('should preserve identical alphabetical ordering when presence states change', () => {
    const alain = new OperateurDeclare(new IdentifiantOperateur('op-1'), 'Alain', 'Paul');
    const bernard = new OperateurDeclare(new IdentifiantOperateur('op-2'), 'Bernard', 'Claude');
    const charles = new OperateurDeclare(new IdentifiantOperateur('op-3'), 'Charles', 'David');

    const supervisionAvecPresencesInversees = SupervisionDeLAtelier.determine(
      [charles, alain, bernard],
      [JourneeDeTravail.open(charles.id, 'PRESENT'), JourneeDeTravail.open(bernard.id, 'EN_PAUSE'), JourneeDeTravail.closed(alain.id)],
    );

    expect(supervisionAvecPresencesInversees.operateurs.map(ligne => ligne.operateur.nom)).toEqual(['Alain', 'Bernard', 'Charles']);
  });
});
