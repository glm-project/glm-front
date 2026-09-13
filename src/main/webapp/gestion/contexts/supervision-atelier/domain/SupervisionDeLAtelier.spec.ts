import { FenetreDePresence } from './FenetreDePresence';
import { IdentifiantOperateur } from './IdentifiantOperateur';
import { JourneeDeTravail } from './JourneeDeTravail';
import { OperateurDeclare } from './OperateurDeclare';
import { OperateurSupervise } from './OperateurSupervise';
import { SupervisionDeLAtelier } from './SupervisionDeLAtelier';

describe('SupervisionDeLAtelier', () => {
  it('should produce an empty supervision when no operators are declared', () => {
    const resultat = SupervisionDeLAtelier.determine([], []);

    expect(resultat.supervision?.operateurs).toEqual([]);
  });

  it('should determine operator as absent when no open working visit exists', () => {
    const operateur = new OperateurDeclare(new IdentifiantOperateur('op-1'), 'Dupont', 'Jean');

    const resultat = SupervisionDeLAtelier.determine([operateur], []);

    expect(resultat.supervision?.operateurs).toEqual([new OperateurSupervise(operateur, 'ABSENT')]);
  });

  it('should determine operator as present when an open working visit is present', () => {
    const operateur = new OperateurDeclare(new IdentifiantOperateur('op-1'), 'Dupont', 'Jean');
    const journee = JourneeDeTravail.open(operateur.id, 'PRESENT');

    const resultat = SupervisionDeLAtelier.determine([operateur], [journee]);

    expect(resultat.supervision?.operateurs).toEqual([new OperateurSupervise(operateur, 'PRESENT')]);
  });

  it('should determine operator as absent when their working visit is closed', () => {
    const operateur = new OperateurDeclare(new IdentifiantOperateur('op-1'), 'Dupont', 'Jean');
    const journeeFermee = JourneeDeTravail.closed(operateur.id);

    const resultat = SupervisionDeLAtelier.determine([operateur], [journeeFermee]);

    expect(resultat.supervision?.operateurs).toEqual([new OperateurSupervise(operateur, 'ABSENT')]);
  });

  it('should determine operator as present when they have both a closed working visit and an open working visit', () => {
    const operateur = new OperateurDeclare(new IdentifiantOperateur('op-1'), 'Dupont', 'Jean');
    const journeeFermee = JourneeDeTravail.closed(operateur.id);
    const journeeOuverte = JourneeDeTravail.open(operateur.id, 'PRESENT');

    const resultat = SupervisionDeLAtelier.determine([operateur], [journeeFermee, journeeOuverte]);

    expect(resultat.supervision?.operateurs).toEqual([new OperateurSupervise(operateur, 'PRESENT')]);
  });

  it('should determine operator as on pause when an open working visit is on pause', () => {
    const operateur = new OperateurDeclare(new IdentifiantOperateur('op-1'), 'Dupont', 'Jean');
    const journee = JourneeDeTravail.open(operateur.id, 'EN_PAUSE');

    const resultat = SupervisionDeLAtelier.determine([operateur], [journee]);

    expect(resultat.supervision?.operateurs).toEqual([new OperateurSupervise(operateur, 'EN_PAUSE')]);
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

    const resultat = SupervisionDeLAtelier.determine([martin, bernardClaude, dupont, bernardAlexandre], journees);

    expect(resultat.supervision?.operateurs).toEqual([
      new OperateurSupervise(bernardAlexandre, 'PRESENT'),
      new OperateurSupervise(bernardClaude, 'ABSENT'),
      new OperateurSupervise(dupont, 'EN_PAUSE'),
      new OperateurSupervise(martin, 'PRESENT'),
    ]);
  });

  it('should determine operator as present for an open working visit crossing midnight without calendar filtering', () => {
    const operateur = new OperateurDeclare(new IdentifiantOperateur('op-night'), 'Nuit', 'Marc');
    const fenetre = new FenetreDePresence('2026-09-12T22:00:00Z');
    const journeeDeNuit = JourneeDeTravail.open(operateur.id, 'PRESENT', [fenetre]);

    const resultat = SupervisionDeLAtelier.determine([operateur], [journeeDeNuit]);

    expect(resultat.supervision?.operateurs).toEqual([new OperateurSupervise(operateur, 'PRESENT')]);
  });

  it('should determine operator as present for an old open working visit without calendar filtering', () => {
    const operateur = new OperateurDeclare(new IdentifiantOperateur('op-old'), 'Ancien', 'Paul');
    const fenetreAncienne = new FenetreDePresence('2026-09-08T07:00:00Z');
    const journeeAncienne = JourneeDeTravail.open(operateur.id, 'PRESENT', [fenetreAncienne]);

    const resultat = SupervisionDeLAtelier.determine([operateur], [journeeAncienne]);

    expect(resultat.supervision?.operateurs).toEqual([new OperateurSupervise(operateur, 'PRESENT')]);
  });

  it('should preserve identical alphabetical ordering when presence states change', () => {
    const alain = new OperateurDeclare(new IdentifiantOperateur('op-1'), 'Alain', 'Paul');
    const bernard = new OperateurDeclare(new IdentifiantOperateur('op-2'), 'Bernard', 'Claude');
    const charles = new OperateurDeclare(new IdentifiantOperateur('op-3'), 'Charles', 'David');

    const initialResultat = SupervisionDeLAtelier.determine(
      [charles, alain, bernard],
      [
        JourneeDeTravail.open(alain.id, 'PRESENT'),
        JourneeDeTravail.open(bernard.id, 'PRESENT'),
        JourneeDeTravail.open(charles.id, 'PRESENT'),
      ],
    );
    const updatedResultat = SupervisionDeLAtelier.determine(
      [charles, alain, bernard],
      [JourneeDeTravail.open(charles.id, 'PRESENT'), JourneeDeTravail.open(bernard.id, 'EN_PAUSE'), JourneeDeTravail.closed(alain.id)],
    );

    expect(updatedResultat.supervision?.operateurs.map(ligne => ligne.operateur.nom)).toEqual(
      initialResultat.supervision?.operateurs.map(ligne => ligne.operateur.nom),
    );
  });

  it('should break ties deterministically by operator identifier for homonyms', () => {
    const premierHomonyme = new OperateurDeclare(new IdentifiantOperateur('op-1'), 'Dupont', 'Jean');
    const secondHomonyme = new OperateurDeclare(new IdentifiantOperateur('op-2'), 'Dupont', 'Jean');

    const resultat = SupervisionDeLAtelier.determine([secondHomonyme, premierHomonyme], []);

    expect(resultat.supervision?.operateurs).toEqual([
      new OperateurSupervise(premierHomonyme, 'ABSENT'),
      new OperateurSupervise(secondHomonyme, 'ABSENT'),
    ]);
  });
});
