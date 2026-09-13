import { ActiviteDeSupervision } from './ActiviteDeSupervision';
import { AnomalieDeSupervision } from './AnomalieDeSupervision';
import { CategorieActivite } from './CategorieActivite';
import { FenetreDePresence } from './FenetreDePresence';
import { IdentifiantActivite } from './IdentifiantActivite';
import { IdentifiantOperateur } from './IdentifiantOperateur';
import { Instant } from './Instant';
import { JourneeDeTravail } from './JourneeDeTravail';
import { OperateurDeclare } from './OperateurDeclare';
import { OperateurSupervise } from './OperateurSupervise';
import { ResultatSupervision } from './ResultatSupervision';
import { SupervisionDeLAtelier } from './SupervisionDeLAtelier';

describe('SupervisionDeLAtelier', () => {
  it('should retain a working visit opening when its source windows are cleared', () => {
    const operateur = new OperateurDeclare(new IdentifiantOperateur('op-1'), 'Dupont', 'Jean');
    const fenetres = [new FenetreDePresence(new Instant('2026-09-13T05:00:00Z'))];
    const journee = JourneeDeTravail.open(operateur.id, 'PRESENT', fenetres);

    fenetres.length = 0;
    const resultat = SupervisionDeLAtelier.determine([operateur], [journee], [], new Instant('2026-09-13T22:00:00Z'));

    expect(exploitableFixture(resultat).operateurs[0]).toMatchObject({
      heureDOuverture: { value: '2026-09-13T05:00:00.000Z' },
      anomalies: ['JOURNEE_OUVERTE_PLUS_DE_16_HEURES'],
    });
  });
  it('should keep the supervised state unchanged when source collections are changed', () => {
    const operateur = new OperateurDeclare(new IdentifiantOperateur('op-1'), 'Dupont', 'Jean');
    const activite = new ActiviteDeSupervision({
      id: new IdentifiantActivite('act-1'),
      operateurId: operateur.id,
      nom: 'Usinage',
      categorie: new CategorieActivite('PROD'),
      debut: new Instant('2026-09-13T08:00:00Z'),
    });
    const activites = [activite];
    const anomalies: AnomalieDeSupervision[] = ['ACTIVITE_D_UN_ABSENT'];
    const supervise = new OperateurSupervise(operateur, 'ABSENT', { activites, anomalies });

    activites.length = 0;
    anomalies.length = 0;

    expect(supervise.activites).toEqual([activite]);
    expect(supervise.anomalies).toEqual(['ACTIVITE_D_UN_ABSENT']);
  });
  it('should detect a long working visit regardless of the order of its presence windows', () => {
    const operateur = new OperateurDeclare(new IdentifiantOperateur('op-1'), 'Dupont', 'Jean');
    const journee = JourneeDeTravail.open(operateur.id, 'PRESENT', [
      new FenetreDePresence(new Instant('2026-09-13T12:00:00Z')),
      new FenetreDePresence(new Instant('2026-09-13T05:00:00Z')),
    ]);

    const resultat = SupervisionDeLAtelier.determine([operateur], [journee], [], new Instant('2026-09-13T22:00:00Z'));

    expect(exploitableFixture(resultat).operateurs[0]).toMatchObject({
      heureDOuverture: { value: '2026-09-13T05:00:00.000Z' },
      anomalies: ['JOURNEE_OUVERTE_PLUS_DE_16_HEURES'],
    });
  });
  it('should expose the opening instant of the supervised working visit', () => {
    const operateur = new OperateurDeclare(new IdentifiantOperateur('op-1'), 'Dupont', 'Jean');
    const journee = JourneeDeTravail.open(operateur.id, 'PRESENT', [new FenetreDePresence(new Instant('2026-09-13T08:00:00Z'))]);

    const resultat = SupervisionDeLAtelier.determine([operateur], [journee], [], new Instant('2026-09-13T09:00:00Z'));

    expect(exploitableFixture(resultat).operateurs[0]?.heureDOuverture?.value).toBe('2026-09-13T08:00:00.000Z');
  });
  it('should produce an empty supervision when no operators are declared', () => {
    const resultat = SupervisionDeLAtelier.determine([], [], [], new Instant('2026-09-13T09:00:00Z'));

    expect(exploitableFixture(resultat).operateurs).toEqual([]);
  });

  it('should determine operator as absent when no open working visit exists', () => {
    const operateur = new OperateurDeclare(new IdentifiantOperateur('op-1'), 'Dupont', 'Jean');

    const resultat = SupervisionDeLAtelier.determine([operateur], [], [], new Instant('2026-09-13T09:00:00Z'));

    expect(exploitableFixture(resultat).operateurs).toMatchObject([
      { operateur: operateur, presence: 'ABSENT', activites: [], anomalies: [] },
    ]);
  });

  it('should determine operator as present when an open working visit is present', () => {
    const operateur = new OperateurDeclare(new IdentifiantOperateur('op-1'), 'Dupont', 'Jean');
    const fenetre = new FenetreDePresence(new Instant('2026-09-13T08:00:00Z'));
    const journee = JourneeDeTravail.open(operateur.id, 'PRESENT', [fenetre]);

    const resultat = SupervisionDeLAtelier.determine([operateur], [journee], [], new Instant('2026-09-13T09:00:00Z'));

    expect(exploitableFixture(resultat).operateurs).toMatchObject([
      { operateur: operateur, presence: 'PRESENT', activites: [], anomalies: [] },
    ]);
  });

  it('should determine operator as absent when their working visit is closed', () => {
    const operateur = new OperateurDeclare(new IdentifiantOperateur('op-1'), 'Dupont', 'Jean');
    const journeeFermee = JourneeDeTravail.closed(operateur.id);

    const resultat = SupervisionDeLAtelier.determine([operateur], [journeeFermee], [], new Instant('2026-09-13T09:00:00Z'));

    expect(exploitableFixture(resultat).operateurs).toMatchObject([
      { operateur: operateur, presence: 'ABSENT', activites: [], anomalies: [] },
    ]);
  });

  it('should determine operator as present when they have both a closed working visit and an open working visit', () => {
    const operateur = new OperateurDeclare(new IdentifiantOperateur('op-1'), 'Dupont', 'Jean');
    const journeeFermee = JourneeDeTravail.closed(operateur.id);
    const fenetre = new FenetreDePresence(new Instant('2026-09-13T08:00:00Z'));
    const journeeOuverte = JourneeDeTravail.open(operateur.id, 'PRESENT', [fenetre]);

    const resultat = SupervisionDeLAtelier.determine([operateur], [journeeFermee, journeeOuverte], [], new Instant('2026-09-13T09:00:00Z'));

    expect(exploitableFixture(resultat).operateurs).toMatchObject([
      { operateur: operateur, presence: 'PRESENT', activites: [], anomalies: [] },
    ]);
  });

  it('should determine operator as on pause when an open working visit is on pause', () => {
    const operateur = new OperateurDeclare(new IdentifiantOperateur('op-1'), 'Dupont', 'Jean');
    const fenetre = new FenetreDePresence(new Instant('2026-09-13T08:00:00Z'));
    const journee = JourneeDeTravail.open(operateur.id, 'EN_PAUSE', [fenetre]);

    const resultat = SupervisionDeLAtelier.determine([operateur], [journee], [], new Instant('2026-09-13T09:00:00Z'));

    expect(exploitableFixture(resultat).operateurs).toMatchObject([
      { operateur: operateur, presence: 'EN_PAUSE', activites: [], anomalies: [] },
    ]);
  });

  it('should order operators alphabetically regardless of their presence state', () => {
    const martin = new OperateurDeclare(new IdentifiantOperateur('op-3'), 'Martin', 'Alice');
    const bernardClaude = new OperateurDeclare(new IdentifiantOperateur('op-2'), 'Bernard', 'Claude');
    const dupont = new OperateurDeclare(new IdentifiantOperateur('op-1'), 'Dupont', 'Jean');
    const bernardAlexandre = new OperateurDeclare(new IdentifiantOperateur('op-4'), 'Bernard', 'Alexandre');
    const fenetre = new FenetreDePresence(new Instant('2026-09-13T08:00:00Z'));

    const journees = [
      JourneeDeTravail.open(martin.id, 'PRESENT', [fenetre]),
      JourneeDeTravail.open(dupont.id, 'EN_PAUSE', [fenetre]),
      JourneeDeTravail.open(bernardAlexandre.id, 'PRESENT', [fenetre]),
    ];

    const resultat = SupervisionDeLAtelier.determine(
      [martin, bernardClaude, dupont, bernardAlexandre],
      journees,
      [],
      new Instant('2026-09-13T09:00:00Z'),
    );

    expect(exploitableFixture(resultat).operateurs).toMatchObject([
      { operateur: bernardAlexandre, presence: 'PRESENT', activites: [], anomalies: [] },
      { operateur: bernardClaude, presence: 'ABSENT', activites: [], anomalies: [] },
      { operateur: dupont, presence: 'EN_PAUSE', activites: [], anomalies: [] },
      { operateur: martin, presence: 'PRESENT', activites: [], anomalies: [] },
    ]);
  });

  it('should determine operator as present for an open working visit crossing midnight without calendar filtering', () => {
    const operateur = new OperateurDeclare(new IdentifiantOperateur('op-night'), 'Nuit', 'Marc');
    const fenetre = new FenetreDePresence(new Instant('2026-09-12T22:00:00Z'));
    const journeeDeNuit = JourneeDeTravail.open(operateur.id, 'PRESENT', [fenetre]);

    const resultat = SupervisionDeLAtelier.determine([operateur], [journeeDeNuit], [], new Instant('2026-09-13T09:00:00Z'));

    expect(exploitableFixture(resultat).operateurs).toMatchObject([
      { operateur: operateur, presence: 'PRESENT', activites: [], anomalies: [] },
    ]);
  });

  it('should determine operator as present for an old open working visit without calendar filtering', () => {
    const operateur = new OperateurDeclare(new IdentifiantOperateur('op-old'), 'Ancien', 'Paul');
    const fenetreAncienne = new FenetreDePresence(new Instant('2026-09-08T07:00:00Z'));
    const journeeAncienne = JourneeDeTravail.open(operateur.id, 'PRESENT', [fenetreAncienne]);

    const resultat = SupervisionDeLAtelier.determine([operateur], [journeeAncienne], [], new Instant('2026-09-13T09:00:00Z'));

    expect(exploitableFixture(resultat).operateurs).toMatchObject([
      { operateur: operateur, presence: 'PRESENT', activites: [], anomalies: ['JOURNEE_OUVERTE_PLUS_DE_16_HEURES'] },
    ]);
  });

  it('should preserve identical alphabetical ordering when presence states change', () => {
    const alain = new OperateurDeclare(new IdentifiantOperateur('op-1'), 'Alain', 'Paul');
    const bernard = new OperateurDeclare(new IdentifiantOperateur('op-2'), 'Bernard', 'Claude');
    const charles = new OperateurDeclare(new IdentifiantOperateur('op-3'), 'Charles', 'David');

    const fenetre = new FenetreDePresence(new Instant('2026-09-13T08:00:00Z'));

    const initialResultat = SupervisionDeLAtelier.determine(
      [charles, alain, bernard],
      [
        JourneeDeTravail.open(alain.id, 'PRESENT', [fenetre]),
        JourneeDeTravail.open(bernard.id, 'PRESENT', [fenetre]),
        JourneeDeTravail.open(charles.id, 'PRESENT', [fenetre]),
      ],
      [],
      new Instant('2026-09-13T09:00:00Z'),
    );
    const updatedResultat = SupervisionDeLAtelier.determine(
      [charles, alain, bernard],
      [
        JourneeDeTravail.open(charles.id, 'PRESENT', [fenetre]),
        JourneeDeTravail.open(bernard.id, 'EN_PAUSE', [fenetre]),
        JourneeDeTravail.closed(alain.id),
      ],
      [],
      new Instant('2026-09-13T09:00:00Z'),
    );

    expect(exploitableFixture(updatedResultat).operateurs.map(ligne => ligne.operateur.nom)).toEqual(
      exploitableFixture(initialResultat).operateurs.map(ligne => ligne.operateur.nom),
    );
  });

  it('should break ties deterministically by operator identifier for homonyms', () => {
    const premierHomonyme = new OperateurDeclare(new IdentifiantOperateur('op-1'), 'Dupont', 'Jean');
    const secondHomonyme = new OperateurDeclare(new IdentifiantOperateur('op-2'), 'Dupont', 'Jean');

    const resultat = SupervisionDeLAtelier.determine([secondHomonyme, premierHomonyme], [], [], new Instant('2026-09-13T09:00:00Z'));

    expect(exploitableFixture(resultat).operateurs).toMatchObject([
      { operateur: premierHomonyme, presence: 'ABSENT', activites: [], anomalies: [] },
      { operateur: secondHomonyme, presence: 'ABSENT', activites: [], anomalies: [] },
    ]);
  });

  it('should associate zero to multiple activities with their declared operator', () => {
    const dupont = new OperateurDeclare(new IdentifiantOperateur('op-1'), 'Dupont', 'Jean');
    const martin = new OperateurDeclare(new IdentifiantOperateur('op-2'), 'Martin', 'Alice');
    const premiereActivite = new ActiviteDeSupervision({
      id: new IdentifiantActivite('act-1'),
      operateurId: dupont.id,
      nom: 'Usinage carter',
      categorie: new CategorieActivite('PROD'),
      debut: new Instant('2026-09-13T08:00:00Z'),
      poste: 'Poste-1',
    });
    const secondeActivite = new ActiviteDeSupervision({
      id: new IdentifiantActivite('act-2'),
      operateurId: dupont.id,
      nom: 'Contrôle dimensionnel',
      categorie: new CategorieActivite('PROD'),
      debut: new Instant('2026-09-13T09:30:00Z'),
      poste: 'Poste-2',
    });
    const activiteMartin = new ActiviteDeSupervision({
      id: new IdentifiantActivite('act-3'),
      operateurId: martin.id,
      nom: 'Montage sous-ensemble',
      categorie: new CategorieActivite('PROD'),
      debut: new Instant('2026-09-13T08:15:00Z'),
      poste: 'Poste-3',
    });
    const fenetre = new FenetreDePresence(new Instant('2026-09-13T07:30:00Z'));
    const journees = [JourneeDeTravail.open(dupont.id, 'PRESENT', [fenetre]), JourneeDeTravail.open(martin.id, 'PRESENT', [fenetre])];

    const resultat = SupervisionDeLAtelier.determine(
      [dupont, martin],
      journees,
      [premiereActivite, secondeActivite, activiteMartin],
      new Instant('2026-09-13T09:00:00Z'),
    );

    expect(exploitableFixture(resultat).operateurs).toMatchObject([
      { operateur: dupont, presence: 'PRESENT', activites: [premiereActivite, secondeActivite], anomalies: [] },
      { operateur: martin, presence: 'PRESENT', activites: [activiteMartin], anomalies: [] },
    ]);
  });

  it('should identify operator as in GLM when present without ongoing activity', () => {
    const operateur = new OperateurDeclare(new IdentifiantOperateur('op-1'), 'Dupont', 'Jean');
    const fenetre = new FenetreDePresence(new Instant('2026-09-13T08:00:00Z'));
    const journee = JourneeDeTravail.open(operateur.id, 'PRESENT', [fenetre]);

    const resultat = SupervisionDeLAtelier.determine([operateur], [journee], [], new Instant('2026-09-13T09:00:00Z'));

    const operateurSupervise = exploitableFixture(resultat).operateurs[0];
    expect(operateurSupervise?.isEnGlm()).toBe(true);
  });

  it('should not identify operator as in GLM when present with activities or when on pause', () => {
    const alain = new OperateurDeclare(new IdentifiantOperateur('op-1'), 'Alain', 'Paul');
    const bernard = new OperateurDeclare(new IdentifiantOperateur('op-2'), 'Bernard', 'Claude');
    const fenetre = new FenetreDePresence(new Instant('2026-09-13T08:00:00Z'));
    const activite = new ActiviteDeSupervision({
      id: new IdentifiantActivite('act-1'),
      operateurId: alain.id,
      nom: 'Usinage',
      categorie: new CategorieActivite('PROD'),
      debut: new Instant('2026-09-13T08:00:00Z'),
    });

    const resultat = SupervisionDeLAtelier.determine(
      [alain, bernard],
      [JourneeDeTravail.open(alain.id, 'PRESENT', [fenetre]), JourneeDeTravail.open(bernard.id, 'EN_PAUSE', [fenetre])],
      [activite],
      new Instant('2026-09-13T09:00:00Z'),
    );

    const alainSupervise = exploitableFixture(resultat).operateurs.find(op => op.operateur.id.equals(alain.id));
    const bernardSupervise = exploitableFixture(resultat).operateurs.find(op => op.operateur.id.equals(bernard.id));
    expect(alainSupervise?.isEnGlm()).toBe(false);
    expect(bernardSupervise?.isEnGlm()).toBe(false);
  });

  it('should identify activity as NC when its category is NC', () => {
    const operateurId = new IdentifiantOperateur('op-1');
    const activiteNc = new ActiviteDeSupervision({
      id: new IdentifiantActivite('act-1'),
      operateurId: operateurId,
      nom: 'Retouche carter',
      categorie: new CategorieActivite('NC'),
      debut: new Instant('2026-09-13T08:00:00Z'),
    });
    const activiteStandard = new ActiviteDeSupervision({
      id: new IdentifiantActivite('act-2'),
      operateurId: operateurId,
      nom: 'Usinage standard',
      categorie: new CategorieActivite('PROD'),
      debut: new Instant('2026-09-13T08:30:00Z'),
    });

    expect(activiteNc.categorie.isNc()).toBe(true);
    expect(activiteStandard.categorie.isNc()).toBe(false);
  });

  it('should model absent workstation as undefined without fabricating a value', () => {
    const operateurId = new IdentifiantOperateur('op-1');
    const activiteSansPoste = new ActiviteDeSupervision({
      id: new IdentifiantActivite('act-1'),
      operateurId: operateurId,
      nom: 'Tri manuel',
      categorie: new CategorieActivite('PROD'),
      debut: new Instant('2026-09-13T08:00:00Z'),
    });

    expect(activiteSansPoste.poste).toBeUndefined();
  });

  it('should detect anomaly for activity of an absent operator while preserving absence and activity', () => {
    const operateur = new OperateurDeclare(new IdentifiantOperateur('op-1'), 'Dupont', 'Jean');
    const activite = new ActiviteDeSupervision({
      id: new IdentifiantActivite('act-1'),
      operateurId: operateur.id,
      nom: 'Usinage',
      categorie: new CategorieActivite('PROD'),
      debut: new Instant('2026-09-13T08:00:00Z'),
    });

    const resultat = SupervisionDeLAtelier.determine([operateur], [], [activite], new Instant('2026-09-13T09:00:00Z'));

    const operateurSupervise = exploitableFixture(resultat).operateurs[0];
    expect(operateurSupervise?.presence).toBe('ABSENT');
    expect(operateurSupervise?.activites).toEqual([activite]);
    expect(operateurSupervise?.anomalies).toEqual(['ACTIVITE_D_UN_ABSENT']);
  });

  it('should detect anomaly for open working visit without presence windows while preserving presence', () => {
    const operateur = new OperateurDeclare(new IdentifiantOperateur('op-1'), 'Dupont', 'Jean');
    const journeeSansFenetres = JourneeDeTravail.open(operateur.id, 'PRESENT');

    const activite = new ActiviteDeSupervision({
      id: new IdentifiantActivite('act-1'),
      operateurId: operateur.id,
      nom: 'Usinage',
      categorie: new CategorieActivite('NC'),
      debut: new Instant('2026-09-13T08:00:00Z'),
    });

    const resultat = SupervisionDeLAtelier.determine([operateur], [journeeSansFenetres], [activite], new Instant('2026-09-13T09:00:00Z'));

    const operateurSupervise = exploitableFixture(resultat).operateurs[0];
    expect(operateurSupervise?.activites).toEqual([activite]);
    expect(operateurSupervise?.presence).toBe('PRESENT');
    expect(operateurSupervise?.anomalies).toEqual(['JOURNEE_OUVERTE_SANS_FENETRES']);
    expect(operateurSupervise?.heureDOuverture).toBeUndefined();
  });

  it('should detect a visit exceeding 16 hours by one millisecond while preserving presence and activities', () => {
    const operateur = new OperateurDeclare(new IdentifiantOperateur('op-1'), 'Dupont', 'Jean');
    const fenetre = new FenetreDePresence(new Instant('2026-09-13T06:00:00Z'));
    const journeeLongue = JourneeDeTravail.open(operateur.id, 'PRESENT', [fenetre]);
    const maintenant = '2026-09-13T22:00:00.001Z';

    const activite = new ActiviteDeSupervision({
      id: new IdentifiantActivite('act-1'),
      operateurId: operateur.id,
      nom: 'Usinage',
      categorie: new CategorieActivite('NC'),
      debut: new Instant('2026-09-13T08:00:00Z'),
    });

    const resultat = SupervisionDeLAtelier.determine([operateur], [journeeLongue], [activite], new Instant(maintenant));

    const operateurSupervise = exploitableFixture(resultat).operateurs[0];
    expect(operateurSupervise?.activites).toEqual([activite]);
    expect(operateurSupervise?.presence).toBe('PRESENT');
    expect(operateurSupervise?.anomalies).toEqual(['JOURNEE_OUVERTE_PLUS_DE_16_HEURES']);
  });

  it('should not detect anomaly when open working visit duration is exactly 16 hours', () => {
    const operateur = new OperateurDeclare(new IdentifiantOperateur('op-1'), 'Dupont', 'Jean');
    const fenetre = new FenetreDePresence(new Instant('2026-09-13T06:00:00.000Z'));
    const journee = JourneeDeTravail.open(operateur.id, 'PRESENT', [fenetre]);
    const exactementSeizeHeures = '2026-09-13T22:00:00.000Z';

    const resultat = SupervisionDeLAtelier.determine([operateur], [journee], [], new Instant(exactementSeizeHeures));

    expect(exploitableFixture(resultat).operateurs[0]?.anomalies).toEqual([]);
  });

  it('should return unexploitable result when an activity has no operator identifier', () => {
    const operateur = new OperateurDeclare(new IdentifiantOperateur('op-1'), 'Dupont', 'Jean');
    const activiteSansOperateur = new ActiviteDeSupervision({
      id: new IdentifiantActivite('act-orphan'),
      operateurId: undefined,
      nom: 'Usinage anonyme',
      categorie: new CategorieActivite('PROD'),
      debut: new Instant('2026-09-13T08:00:00Z'),
    });

    const resultat = SupervisionDeLAtelier.determine([operateur], [], [activiteSansOperateur], new Instant('2026-09-13T09:00:00Z'));

    expect(resultat.estExploitable).toBe(false);
    expect(resultat.motif).toBe('ACTIVITE_SANS_OPERATEUR_IDENTIFIABLE');
    expect(resultat.supervision).toBeUndefined();
  });

  it('should return unexploitable result when an activity has an unknown operator identifier not among declared operators', () => {
    const operateur = new OperateurDeclare(new IdentifiantOperateur('op-1'), 'Dupont', 'Jean');
    const operateurInconnuId = new IdentifiantOperateur('op-unknown');
    const activiteInconnue = new ActiviteDeSupervision({
      id: new IdentifiantActivite('act-unknown'),
      operateurId: operateurInconnuId,
      nom: 'Usinage externe',
      categorie: new CategorieActivite('PROD'),
      debut: new Instant('2026-09-13T08:00:00Z'),
    });

    const resultat = SupervisionDeLAtelier.determine([operateur], [], [activiteInconnue], new Instant('2026-09-13T09:00:00Z'));

    expect(resultat.estExploitable).toBe(false);
    expect(resultat.motif).toBe('ACTIVITE_SANS_OPERATEUR_IDENTIFIABLE');
    expect(resultat.supervision).toBeUndefined();
  });
});

function exploitableFixture(resultat: ResultatSupervision): SupervisionDeLAtelier {
  if (!resultat.estExploitable) {
    throw new Error('Expected an exploitable supervision');
  }
  return resultat.supervision;
}
