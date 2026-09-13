import { ActiviteDeSupervision } from './ActiviteDeSupervision';
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
    const fenetre = new FenetreDePresence('2026-09-13T08:00:00Z');
    const journee = JourneeDeTravail.open(operateur.id, 'PRESENT', [fenetre]);

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
    const fenetre = new FenetreDePresence('2026-09-13T08:00:00Z');
    const journeeOuverte = JourneeDeTravail.open(operateur.id, 'PRESENT', [fenetre]);

    const resultat = SupervisionDeLAtelier.determine([operateur], [journeeFermee, journeeOuverte]);

    expect(resultat.supervision?.operateurs).toEqual([new OperateurSupervise(operateur, 'PRESENT')]);
  });

  it('should determine operator as on pause when an open working visit is on pause', () => {
    const operateur = new OperateurDeclare(new IdentifiantOperateur('op-1'), 'Dupont', 'Jean');
    const fenetre = new FenetreDePresence('2026-09-13T08:00:00Z');
    const journee = JourneeDeTravail.open(operateur.id, 'EN_PAUSE', [fenetre]);

    const resultat = SupervisionDeLAtelier.determine([operateur], [journee]);

    expect(resultat.supervision?.operateurs).toEqual([new OperateurSupervise(operateur, 'EN_PAUSE')]);
  });

  it('should order operators alphabetically regardless of their presence state', () => {
    const martin = new OperateurDeclare(new IdentifiantOperateur('op-3'), 'Martin', 'Alice');
    const bernardClaude = new OperateurDeclare(new IdentifiantOperateur('op-2'), 'Bernard', 'Claude');
    const dupont = new OperateurDeclare(new IdentifiantOperateur('op-1'), 'Dupont', 'Jean');
    const bernardAlexandre = new OperateurDeclare(new IdentifiantOperateur('op-4'), 'Bernard', 'Alexandre');
    const fenetre = new FenetreDePresence('2026-09-13T08:00:00Z');

    const journees = [
      JourneeDeTravail.open(martin.id, 'PRESENT', [fenetre]),
      JourneeDeTravail.open(dupont.id, 'EN_PAUSE', [fenetre]),
      JourneeDeTravail.open(bernardAlexandre.id, 'PRESENT', [fenetre]),
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

    const fenetre = new FenetreDePresence('2026-09-13T08:00:00Z');

    const initialResultat = SupervisionDeLAtelier.determine(
      [charles, alain, bernard],
      [
        JourneeDeTravail.open(alain.id, 'PRESENT', [fenetre]),
        JourneeDeTravail.open(bernard.id, 'PRESENT', [fenetre]),
        JourneeDeTravail.open(charles.id, 'PRESENT', [fenetre]),
      ],
    );
    const updatedResultat = SupervisionDeLAtelier.determine(
      [charles, alain, bernard],
      [
        JourneeDeTravail.open(charles.id, 'PRESENT', [fenetre]),
        JourneeDeTravail.open(bernard.id, 'EN_PAUSE', [fenetre]),
        JourneeDeTravail.closed(alain.id),
      ],
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

  it('should associate zero to multiple activities with their declared operator', () => {
    const dupont = new OperateurDeclare(new IdentifiantOperateur('op-1'), 'Dupont', 'Jean');
    const martin = new OperateurDeclare(new IdentifiantOperateur('op-2'), 'Martin', 'Alice');
    const premiereActivite = new ActiviteDeSupervision('act-1', dupont.id, 'Usinage carter', 'PROD', '2026-09-13T08:00:00Z', 'Poste-1');
    const secondeActivite = new ActiviteDeSupervision(
      'act-2',
      dupont.id,
      'Contrôle dimensionnel',
      'PROD',
      '2026-09-13T09:30:00Z',
      'Poste-2',
    );
    const activiteMartin = new ActiviteDeSupervision(
      'act-3',
      martin.id,
      'Montage sous-ensemble',
      'PROD',
      '2026-09-13T08:15:00Z',
      'Poste-3',
    );
    const fenetre = new FenetreDePresence('2026-09-13T07:30:00Z');
    const journees = [JourneeDeTravail.open(dupont.id, 'PRESENT', [fenetre]), JourneeDeTravail.open(martin.id, 'PRESENT', [fenetre])];

    const resultat = SupervisionDeLAtelier.determine([dupont, martin], journees, [premiereActivite, secondeActivite, activiteMartin]);

    expect(resultat.supervision?.operateurs).toEqual([
      new OperateurSupervise(dupont, 'PRESENT', [premiereActivite, secondeActivite]),
      new OperateurSupervise(martin, 'PRESENT', [activiteMartin]),
    ]);
  });

  it('should identify operator as in GLM when present without ongoing activity', () => {
    const operateur = new OperateurDeclare(new IdentifiantOperateur('op-1'), 'Dupont', 'Jean');
    const fenetre = new FenetreDePresence('2026-09-13T08:00:00Z');
    const journee = JourneeDeTravail.open(operateur.id, 'PRESENT', [fenetre]);

    const resultat = SupervisionDeLAtelier.determine([operateur], [journee], []);

    const operateurSupervise = resultat.supervision?.operateurs[0];
    expect(operateurSupervise?.estEnGlm()).toBe(true);
  });

  it('should not identify operator as in GLM when present with activities or when on pause', () => {
    const alain = new OperateurDeclare(new IdentifiantOperateur('op-1'), 'Alain', 'Paul');
    const bernard = new OperateurDeclare(new IdentifiantOperateur('op-2'), 'Bernard', 'Claude');
    const fenetre = new FenetreDePresence('2026-09-13T08:00:00Z');
    const activite = new ActiviteDeSupervision('act-1', alain.id, 'Usinage', 'PROD', '2026-09-13T08:00:00Z');

    const resultat = SupervisionDeLAtelier.determine(
      [alain, bernard],
      [JourneeDeTravail.open(alain.id, 'PRESENT', [fenetre]), JourneeDeTravail.open(bernard.id, 'EN_PAUSE', [fenetre])],
      [activite],
    );

    const alainSupervise = resultat.supervision?.operateurs.find(op => op.operateur.id.equals(alain.id));
    const bernardSupervise = resultat.supervision?.operateurs.find(op => op.operateur.id.equals(bernard.id));
    expect(alainSupervise?.estEnGlm()).toBe(false);
    expect(bernardSupervise?.estEnGlm()).toBe(false);
  });

  it('should identify activity as NC when its category is NC', () => {
    const operateurId = new IdentifiantOperateur('op-1');
    const activiteNc = new ActiviteDeSupervision('act-1', operateurId, 'Retouche carter', 'NC', '2026-09-13T08:00:00Z');
    const activiteStandard = new ActiviteDeSupervision('act-2', operateurId, 'Usinage standard', 'PROD', '2026-09-13T08:30:00Z');

    expect(activiteNc.isNc()).toBe(true);
    expect(activiteStandard.isNc()).toBe(false);
  });

  it('should model absent workstation as undefined without fabricating a value', () => {
    const operateurId = new IdentifiantOperateur('op-1');
    const activiteSansPoste = new ActiviteDeSupervision('act-1', operateurId, 'Tri manuel', 'PROD', '2026-09-13T08:00:00Z');

    expect(activiteSansPoste.poste).toBeUndefined();
  });

  it('should detect anomaly for activity of an absent operator while preserving absence and activity', () => {
    const operateur = new OperateurDeclare(new IdentifiantOperateur('op-1'), 'Dupont', 'Jean');
    const activite = new ActiviteDeSupervision('act-1', operateur.id, 'Usinage', 'PROD', '2026-09-13T08:00:00Z');

    const resultat = SupervisionDeLAtelier.determine([operateur], [], [activite]);

    const operateurSupervise = resultat.supervision?.operateurs[0];
    expect(operateurSupervise?.presence).toBe('ABSENT');
    expect(operateurSupervise?.activites).toEqual([activite]);
    expect(operateurSupervise?.anomalies).toEqual(['ACTIVITE_D_UN_ABSENT']);
  });

  it('should detect anomaly for open working visit without presence windows while preserving presence', () => {
    const operateur = new OperateurDeclare(new IdentifiantOperateur('op-1'), 'Dupont', 'Jean');
    const journeeSansFenetres = JourneeDeTravail.open(operateur.id, 'PRESENT');

    const resultat = SupervisionDeLAtelier.determine([operateur], [journeeSansFenetres], []);

    const operateurSupervise = resultat.supervision?.operateurs[0];
    expect(operateurSupervise?.presence).toBe('PRESENT');
    expect(operateurSupervise?.anomalies).toEqual(['JOURNEE_OUVERTE_SANS_FENETRES']);
    expect(journeeSansFenetres.heureDOuverture()).toBeUndefined();
  });

  it('should detect anomaly for open working visit exceeding 16 hours since first presence window', () => {
    const operateur = new OperateurDeclare(new IdentifiantOperateur('op-1'), 'Dupont', 'Jean');
    const fenetre = new FenetreDePresence('2026-09-13T06:00:00Z');
    const journeeLongue = JourneeDeTravail.open(operateur.id, 'PRESENT', [fenetre]);
    const maintenant = '2026-09-13T22:30:00Z';

    const resultat = SupervisionDeLAtelier.determine([operateur], [journeeLongue], [], maintenant);

    const operateurSupervise = resultat.supervision?.operateurs[0];
    expect(operateurSupervise?.presence).toBe('PRESENT');
    expect(operateurSupervise?.anomalies).toEqual(['JOURNEE_OUVERTE_PLUS_DE_16_HEURES']);
  });

  it('should not detect anomaly when open working visit duration is exactly 16 hours', () => {
    const operateur = new OperateurDeclare(new IdentifiantOperateur('op-1'), 'Dupont', 'Jean');
    const fenetre = new FenetreDePresence('2026-09-13T06:00:00.000Z');
    const journee = JourneeDeTravail.open(operateur.id, 'PRESENT', [fenetre]);
    const exactementSeizeHeures = '2026-09-13T22:00:00.000Z';

    const resultat = SupervisionDeLAtelier.determine([operateur], [journee], [], exactementSeizeHeures);

    expect(resultat.supervision?.operateurs[0]?.anomalies).toEqual([]);
  });

  it('should detect anomaly when open working visit duration exceeds 16 hours by one millisecond', () => {
    const operateur = new OperateurDeclare(new IdentifiantOperateur('op-1'), 'Dupont', 'Jean');
    const fenetre = new FenetreDePresence('2026-09-13T06:00:00.000Z');
    const journee = JourneeDeTravail.open(operateur.id, 'PRESENT', [fenetre]);
    const seizeHeuresEtUneMs = '2026-09-13T22:00:00.001Z';

    const resultat = SupervisionDeLAtelier.determine([operateur], [journee], [], seizeHeuresEtUneMs);

    expect(resultat.supervision?.operateurs[0]?.anomalies).toEqual(['JOURNEE_OUVERTE_PLUS_DE_16_HEURES']);
  });

  it('should return unexploitable result when an activity has no operator identifier', () => {
    const operateur = new OperateurDeclare(new IdentifiantOperateur('op-1'), 'Dupont', 'Jean');
    const activiteSansOperateur = new ActiviteDeSupervision('act-orphan', undefined, 'Usinage anonyme', 'PROD', '2026-09-13T08:00:00Z');

    const resultat = SupervisionDeLAtelier.determine([operateur], [], [activiteSansOperateur]);

    expect(resultat.estExploitable).toBe(false);
    expect(resultat.motif).toBe('ACTIVITE_SANS_OPERATEUR_IDENTIFIABLE');
    expect(resultat.supervision).toBeUndefined();
    expect(activiteSansOperateur.isFor(operateur.id)).toBe(false);
  });

  it('should return unexploitable result when an activity has an unknown operator identifier not among declared operators', () => {
    const operateur = new OperateurDeclare(new IdentifiantOperateur('op-1'), 'Dupont', 'Jean');
    const operateurInconnuId = new IdentifiantOperateur('op-unknown');
    const activiteInconnue = new ActiviteDeSupervision(
      'act-unknown',
      operateurInconnuId,
      'Usinage externe',
      'PROD',
      '2026-09-13T08:00:00Z',
    );

    const resultat = SupervisionDeLAtelier.determine([operateur], [], [activiteInconnue]);

    expect(resultat.estExploitable).toBe(false);
    expect(resultat.motif).toBe('ACTIVITE_SANS_OPERATEUR_IDENTIFIABLE');
    expect(resultat.supervision).toBeUndefined();
  });
});
