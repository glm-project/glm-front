import { ActiviteDeSupervision } from '../activite/ActiviteDeSupervision';
import { CategorieActivite, ValeurCategorieActivite } from '../activite/CategorieActivite';
import { ElementTravaille } from '../activite/ElementTravaille';
import { HorsOf } from '../activite/HorsOf';
import { IdentifiantActivite } from '../activite/IdentifiantActivite';
import { ReferenceDElement } from '../activite/ReferenceDElement';
import { Instant } from '../instant/Instant';
import { IdentifiantOperateur } from '../operateur/IdentifiantOperateur';
import { OperateurDeclare } from '../operateur/OperateurDeclare';
import { IdentifiantPoste } from '../poste/IdentifiantPoste';
import { PosteDeSupervision } from '../poste/PosteDeSupervision';
import { FenetreDePresence } from '../presence/FenetreDePresence';
import { EtatSession, JourneeDeTravail } from '../presence/JourneeDeTravail';
import { AnomalieDeSupervision } from './AnomalieDeSupervision';
import { CouloirDeSupervision } from './CouloirDeSupervision';
import { OperateurSupervise } from './OperateurSupervise';
import { MotifSupervisionInexploitable, ResultatSupervision } from './ResultatSupervision';
import { SupervisionDeLAtelier } from './SupervisionDeLAtelier';

describe('SupervisionDeLAtelier', () => {
  it('should retain a working visit opening when its source windows are cleared', () => {
    const operateur = new OperateurDeclare({ id: new IdentifiantOperateur('op-1'), nom: 'Dupont', prenom: 'Jean' });
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
    const operateur = new OperateurDeclare({ id: new IdentifiantOperateur('op-1'), nom: 'Dupont', prenom: 'Jean' });
    const activite = new ActiviteDeSupervision({
      id: new IdentifiantActivite('act-1'),
      operateurId: operateur.id,
      objet: MOULE_1015,
      categorie: new CategorieActivite('TRAVAIL'),
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
    const operateur = new OperateurDeclare({ id: new IdentifiantOperateur('op-1'), nom: 'Dupont', prenom: 'Jean' });
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
    const operateur = new OperateurDeclare({ id: new IdentifiantOperateur('op-1'), nom: 'Dupont', prenom: 'Jean' });
    const journee = JourneeDeTravail.open(operateur.id, 'PRESENT', [new FenetreDePresence(new Instant('2026-09-13T08:00:00Z'))]);

    const resultat = SupervisionDeLAtelier.determine([operateur], [journee], [], new Instant('2026-09-13T09:00:00Z'));

    expect(exploitableFixture(resultat).operateurs[0]?.heureDOuverture?.value).toBe('2026-09-13T08:00:00.000Z');
  });
  it('should produce an empty supervision when no operators are declared', () => {
    const resultat = SupervisionDeLAtelier.determine([], [], [], new Instant('2026-09-13T09:00:00Z'));

    expect(exploitableFixture(resultat).operateurs).toEqual([]);
  });

  it('should determine operator as absent when no open working visit exists', () => {
    const operateur = new OperateurDeclare({ id: new IdentifiantOperateur('op-1'), nom: 'Dupont', prenom: 'Jean' });

    const resultat = SupervisionDeLAtelier.determine([operateur], [], [], new Instant('2026-09-13T09:00:00Z'));

    expect(exploitableFixture(resultat).operateurs).toMatchObject([
      { operateur: operateur, presence: 'ABSENT', activites: [], anomalies: [] },
    ]);
  });

  it('should determine operator as present when an open working visit is present', () => {
    const operateur = new OperateurDeclare({ id: new IdentifiantOperateur('op-1'), nom: 'Dupont', prenom: 'Jean' });
    const fenetre = new FenetreDePresence(new Instant('2026-09-13T08:00:00Z'));
    const journee = JourneeDeTravail.open(operateur.id, 'PRESENT', [fenetre]);

    const resultat = SupervisionDeLAtelier.determine([operateur], [journee], [], new Instant('2026-09-13T09:00:00Z'));

    expect(exploitableFixture(resultat).operateurs).toMatchObject([
      { operateur: operateur, presence: 'PRESENT', activites: [], anomalies: [] },
    ]);
  });

  it('should determine operator as absent when their working visit is closed', () => {
    const operateur = new OperateurDeclare({ id: new IdentifiantOperateur('op-1'), nom: 'Dupont', prenom: 'Jean' });
    const journeeFermee = JourneeDeTravail.closed(operateur.id);

    const resultat = SupervisionDeLAtelier.determine([operateur], [journeeFermee], [], new Instant('2026-09-13T09:00:00Z'));

    expect(exploitableFixture(resultat).operateurs).toMatchObject([
      { operateur: operateur, presence: 'ABSENT', activites: [], anomalies: [] },
    ]);
  });

  it('should determine operator as present when they have both a closed working visit and an open working visit', () => {
    const operateur = new OperateurDeclare({ id: new IdentifiantOperateur('op-1'), nom: 'Dupont', prenom: 'Jean' });
    const journeeFermee = JourneeDeTravail.closed(operateur.id);
    const fenetre = new FenetreDePresence(new Instant('2026-09-13T08:00:00Z'));
    const journeeOuverte = JourneeDeTravail.open(operateur.id, 'PRESENT', [fenetre]);

    const resultat = SupervisionDeLAtelier.determine([operateur], [journeeFermee, journeeOuverte], [], new Instant('2026-09-13T09:00:00Z'));

    expect(exploitableFixture(resultat).operateurs).toMatchObject([
      { operateur: operateur, presence: 'PRESENT', activites: [], anomalies: [] },
    ]);
  });

  it('should determine operator as on pause when an open working visit is on pause', () => {
    const operateur = new OperateurDeclare({ id: new IdentifiantOperateur('op-1'), nom: 'Dupont', prenom: 'Jean' });
    const fenetre = new FenetreDePresence(new Instant('2026-09-13T08:00:00Z'));
    const journee = JourneeDeTravail.open(operateur.id, 'EN_PAUSE', [fenetre]);

    const resultat = SupervisionDeLAtelier.determine([operateur], [journee], [], new Instant('2026-09-13T09:00:00Z'));

    expect(exploitableFixture(resultat).operateurs).toMatchObject([
      { operateur: operateur, presence: 'EN_PAUSE', activites: [], anomalies: [] },
    ]);
  });

  it('should order operators alphabetically regardless of their presence state', () => {
    const martin = new OperateurDeclare({ id: new IdentifiantOperateur('op-3'), nom: 'Martin', prenom: 'Alice' });
    const bernardClaude = new OperateurDeclare({ id: new IdentifiantOperateur('op-2'), nom: 'Bernard', prenom: 'Claude' });
    const dupont = new OperateurDeclare({ id: new IdentifiantOperateur('op-1'), nom: 'Dupont', prenom: 'Jean' });
    const bernardAlexandre = new OperateurDeclare({ id: new IdentifiantOperateur('op-4'), nom: 'Bernard', prenom: 'Alexandre' });
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
    const operateur = new OperateurDeclare({ id: new IdentifiantOperateur('op-night'), nom: 'Nuit', prenom: 'Marc' });
    const fenetre = new FenetreDePresence(new Instant('2026-09-12T22:00:00Z'));
    const journeeDeNuit = JourneeDeTravail.open(operateur.id, 'PRESENT', [fenetre]);

    const resultat = SupervisionDeLAtelier.determine([operateur], [journeeDeNuit], [], new Instant('2026-09-13T09:00:00Z'));

    expect(exploitableFixture(resultat).operateurs).toMatchObject([
      { operateur: operateur, presence: 'PRESENT', activites: [], anomalies: [] },
    ]);
  });

  it('should determine operator as present for an old open working visit without calendar filtering', () => {
    const operateur = new OperateurDeclare({ id: new IdentifiantOperateur('op-old'), nom: 'Ancien', prenom: 'Paul' });
    const fenetreAncienne = new FenetreDePresence(new Instant('2026-09-08T07:00:00Z'));
    const journeeAncienne = JourneeDeTravail.open(operateur.id, 'PRESENT', [fenetreAncienne]);

    const resultat = SupervisionDeLAtelier.determine([operateur], [journeeAncienne], [], new Instant('2026-09-13T09:00:00Z'));

    expect(exploitableFixture(resultat).operateurs).toMatchObject([
      { operateur: operateur, presence: 'PRESENT', activites: [], anomalies: ['JOURNEE_OUVERTE_PLUS_DE_16_HEURES'] },
    ]);
  });

  it('should preserve identical alphabetical ordering when presence states change', () => {
    const alain = new OperateurDeclare({ id: new IdentifiantOperateur('op-1'), nom: 'Alain', prenom: 'Paul' });
    const bernard = new OperateurDeclare({ id: new IdentifiantOperateur('op-2'), nom: 'Bernard', prenom: 'Claude' });
    const charles = new OperateurDeclare({ id: new IdentifiantOperateur('op-3'), nom: 'Charles', prenom: 'David' });

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
    const premierHomonyme = new OperateurDeclare({ id: new IdentifiantOperateur('op-1'), nom: 'Dupont', prenom: 'Jean' });
    const secondHomonyme = new OperateurDeclare({ id: new IdentifiantOperateur('op-2'), nom: 'Dupont', prenom: 'Jean' });

    const resultat = SupervisionDeLAtelier.determine([secondHomonyme, premierHomonyme], [], [], new Instant('2026-09-13T09:00:00Z'));

    expect(exploitableFixture(resultat).operateurs).toMatchObject([
      { operateur: premierHomonyme, presence: 'ABSENT', activites: [], anomalies: [] },
      { operateur: secondHomonyme, presence: 'ABSENT', activites: [], anomalies: [] },
    ]);
  });

  it('should associate zero to multiple activities with their declared operator', () => {
    const dupont = new OperateurDeclare({ id: new IdentifiantOperateur('op-1'), nom: 'Dupont', prenom: 'Jean' });
    const martin = new OperateurDeclare({ id: new IdentifiantOperateur('op-2'), nom: 'Martin', prenom: 'Alice' });
    const premiereActivite = new ActiviteDeSupervision({
      id: new IdentifiantActivite('act-1'),
      operateurId: dupont.id,
      objet: MOULE_1015,
      categorie: new CategorieActivite('TRAVAIL'),
      debut: new Instant('2026-09-13T08:00:00Z'),
      poste: posteFixture('Poste-1'),
    });
    const secondeActivite = new ActiviteDeSupervision({
      id: new IdentifiantActivite('act-2'),
      operateurId: dupont.id,
      objet: MOULE_1015,
      categorie: new CategorieActivite('TRAVAIL'),
      debut: new Instant('2026-09-13T09:30:00Z'),
      poste: posteFixture('Poste-2'),
    });
    const activiteMartin = new ActiviteDeSupervision({
      id: new IdentifiantActivite('act-3'),
      operateurId: martin.id,
      objet: MOULE_1015,
      categorie: new CategorieActivite('TRAVAIL'),
      debut: new Instant('2026-09-13T08:15:00Z'),
      poste: posteFixture('Poste-3'),
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

  it('should treat only NON_CONFORMITE as nonconforming', () => {
    const enNonConformite = operateurFixture('op-nc', 'Aubert');
    const auTravail = operateurFixture('op-travail', 'Benali');

    const supervision = supervisionFixture(
      [enNonConformite, auTravail],
      [journeeOuverteFixture(enNonConformite, 'PRESENT'), journeeOuverteFixture(auTravail, 'PRESENT')],
      [activiteFixture(enNonConformite, 'NON_CONFORMITE'), activiteFixture(auTravail, 'TRAVAIL')],
    );

    expect(supervision.operateursEnNonConformite().map(supervise => supervise.operateur.id.value)).toEqual(['op-nc']);
  });

  it('should model absent workstation as undefined without fabricating a value', () => {
    const operateurId = new IdentifiantOperateur('op-1');
    const activiteSansPoste = new ActiviteDeSupervision({
      id: new IdentifiantActivite('act-1'),
      operateurId: operateurId,
      objet: MOULE_1015,
      categorie: new CategorieActivite('TRAVAIL'),
      debut: new Instant('2026-09-13T08:00:00Z'),
    });

    expect(activiteSansPoste.poste).toBeUndefined();
  });

  it('should detect anomaly for activity of an absent operator while preserving absence and activity', () => {
    const operateur = new OperateurDeclare({ id: new IdentifiantOperateur('op-1'), nom: 'Dupont', prenom: 'Jean' });
    const activite = new ActiviteDeSupervision({
      id: new IdentifiantActivite('act-1'),
      operateurId: operateur.id,
      objet: MOULE_1015,
      categorie: new CategorieActivite('TRAVAIL'),
      debut: new Instant('2026-09-13T08:00:00Z'),
    });

    const resultat = SupervisionDeLAtelier.determine([operateur], [], [activite], new Instant('2026-09-13T09:00:00Z'));

    const operateurSupervise = exploitableFixture(resultat).operateurs[0];
    expect(operateurSupervise?.presence).toBe('ABSENT');
    expect(operateurSupervise?.activites).toEqual([activite]);
    expect(operateurSupervise?.anomalies).toEqual(['ACTIVITE_D_UN_ABSENT']);
  });

  it('should detect anomaly for open working visit without presence windows while preserving presence', () => {
    const operateur = new OperateurDeclare({ id: new IdentifiantOperateur('op-1'), nom: 'Dupont', prenom: 'Jean' });
    const journeeSansFenetres = JourneeDeTravail.open(operateur.id, 'PRESENT');

    const activite = new ActiviteDeSupervision({
      id: new IdentifiantActivite('act-1'),
      operateurId: operateur.id,
      objet: MOULE_1015,
      categorie: new CategorieActivite('NON_CONFORMITE'),
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
    const operateur = new OperateurDeclare({ id: new IdentifiantOperateur('op-1'), nom: 'Dupont', prenom: 'Jean' });
    const fenetre = new FenetreDePresence(new Instant('2026-09-13T06:00:00Z'));
    const journeeLongue = JourneeDeTravail.open(operateur.id, 'PRESENT', [fenetre]);
    const maintenant = '2026-09-13T22:00:00.001Z';

    const activite = new ActiviteDeSupervision({
      id: new IdentifiantActivite('act-1'),
      operateurId: operateur.id,
      objet: MOULE_1015,
      categorie: new CategorieActivite('NON_CONFORMITE'),
      debut: new Instant('2026-09-13T08:00:00Z'),
    });

    const resultat = SupervisionDeLAtelier.determine([operateur], [journeeLongue], [activite], new Instant(maintenant));

    const operateurSupervise = exploitableFixture(resultat).operateurs[0];
    expect(operateurSupervise?.activites).toEqual([activite]);
    expect(operateurSupervise?.presence).toBe('PRESENT');
    expect(operateurSupervise?.anomalies).toEqual(['JOURNEE_OUVERTE_PLUS_DE_16_HEURES']);
  });

  it('should not detect anomaly when open working visit duration is exactly 16 hours', () => {
    const operateur = new OperateurDeclare({ id: new IdentifiantOperateur('op-1'), nom: 'Dupont', prenom: 'Jean' });
    const fenetre = new FenetreDePresence(new Instant('2026-09-13T06:00:00.000Z'));
    const journee = JourneeDeTravail.open(operateur.id, 'PRESENT', [fenetre]);
    const exactementSeizeHeures = '2026-09-13T22:00:00.000Z';

    const resultat = SupervisionDeLAtelier.determine([operateur], [journee], [], new Instant(exactementSeizeHeures));

    expect(exploitableFixture(resultat).operateurs[0]?.anomalies).toEqual([]);
  });

  it('should return unexploitable result when an activity has no operator identifier', () => {
    const operateur = new OperateurDeclare({ id: new IdentifiantOperateur('op-1'), nom: 'Dupont', prenom: 'Jean' });
    const activiteSansOperateur = new ActiviteDeSupervision({
      id: new IdentifiantActivite('act-orphan'),
      operateurId: undefined,
      objet: MOULE_1015,
      categorie: new CategorieActivite('TRAVAIL'),
      debut: new Instant('2026-09-13T08:00:00Z'),
    });

    const resultat = SupervisionDeLAtelier.determine([operateur], [], [activiteSansOperateur], new Instant('2026-09-13T09:00:00Z'));

    expect(resultat.estExploitable).toBe(false);
    expect(inexploitableFixture(resultat)).toBe('ACTIVITE_SANS_OPERATEUR_IDENTIFIABLE');
  });

  it('should return unexploitable result when an activity has an unknown operator identifier not among declared operators', () => {
    const operateur = new OperateurDeclare({ id: new IdentifiantOperateur('op-1'), nom: 'Dupont', prenom: 'Jean' });
    const operateurInconnuId = new IdentifiantOperateur('op-unknown');
    const activiteInconnue = new ActiviteDeSupervision({
      id: new IdentifiantActivite('act-unknown'),
      operateurId: operateurInconnuId,
      objet: MOULE_1015,
      categorie: new CategorieActivite('TRAVAIL'),
      debut: new Instant('2026-09-13T08:00:00Z'),
    });

    const resultat = SupervisionDeLAtelier.determine([operateur], [], [activiteInconnue], new Instant('2026-09-13T09:00:00Z'));

    expect(resultat.estExploitable).toBe(false);
    expect(inexploitableFixture(resultat)).toBe('ACTIVITE_SANS_OPERATEUR_IDENTIFIABLE');
  });

  it('should place a present operator with an ongoing activity in the working lane', () => {
    const operateur = operateurFixture('op-1');

    const supervision = supervisionFixture([operateur], [journeeOuverteFixture(operateur, 'PRESENT')], [activiteFixture(operateur)]);

    expect(couloirDe(supervision, operateur)).toBe('AU_TRAVAIL');
  });

  it('should place a present operator whose only activity is nonconforming in the working lane', () => {
    const operateur = operateurFixture('op-1');

    const supervision = supervisionFixture(
      [operateur],
      [journeeOuverteFixture(operateur, 'PRESENT')],
      [activiteFixture(operateur, 'NON_CONFORMITE')],
    );

    expect(couloirDe(supervision, operateur)).toBe('AU_TRAVAIL');
  });

  it('should place a present operator without activity in the unassigned lane', () => {
    const operateur = operateurFixture('op-1');

    const supervision = supervisionFixture([operateur], [journeeOuverteFixture(operateur, 'PRESENT')], []);

    expect(couloirDe(supervision, operateur)).toBe('SANS_AFFECTATION');
  });

  it.each([0, 1])('should place a paused operator in the paused lane whether or not activities remain open (%i)', nombreDActivites => {
    const operateur = operateurFixture('op-1');

    const supervision = supervisionFixture(
      [operateur],
      [journeeOuverteFixture(operateur, 'EN_PAUSE')],
      activitesFixture(operateur, nombreDActivites),
    );

    expect(couloirDe(supervision, operateur)).toBe('EN_PAUSE');
  });

  it('should place an absent operator in the absent lane even with an open activity and its anomaly', () => {
    const operateur = operateurFixture('op-1');

    const supervision = supervisionFixture([operateur], [JourneeDeTravail.closed(operateur.id)], [activiteFixture(operateur)]);

    expect(couloirDe(supervision, operateur)).toBe('ABSENT');
    expect(supervision.operateurs[0]?.anomalies).toEqual(['ACTIVITE_D_UN_ABSENT']);
  });

  it('should always return the four lanes in fixed order, empty ones included', () => {
    const operateur = operateurFixture('op-1');

    const supervision = supervisionFixture([operateur], [journeeOuverteFixture(operateur, 'EN_PAUSE')], []);

    expect(supervision.couloirs().map(couloir => [couloir.couloir, couloir.operateurs.length])).toEqual([
      ['AU_TRAVAIL', 0],
      ['SANS_AFFECTATION', 0],
      ['EN_PAUSE', 1],
      ['ABSENT', 0],
    ]);
  });

  it('should order operators alphabetically within each lane', () => {
    const martin = operateurFixture('op-3', 'Martin', 'Alice');
    const bernardClaude = operateurFixture('op-2', 'Bernard', 'Claude');
    const dupont = operateurFixture('op-1', 'Dupont', 'Jean');
    const bernardAlexandre = operateurFixture('op-4', 'Bernard', 'Alexandre');

    const supervision = supervisionFixture(
      [martin, bernardClaude, dupont, bernardAlexandre],
      [journeeOuverteFixture(martin, 'PRESENT'), journeeOuverteFixture(bernardAlexandre, 'PRESENT')],
      [activiteFixture(martin), activiteFixture(bernardAlexandre)],
    );

    expect(supervision.couloirs().map(couloir => couloir.operateurs.map(supervise => supervise.operateur.id.value))).toEqual([
      ['op-4', 'op-3'],
      [],
      [],
      ['op-2', 'op-1'],
    ]);
  });

  it('should list present or paused operators with a nonconforming activity, never absent ones', () => {
    const present = operateurFixture('op-present', 'Aubert');
    const enPause = operateurFixture('op-pause', 'Benali');
    const absent = operateurFixture('op-absent', 'Chevalier');
    const conforme = operateurFixture('op-conforme', 'Dumas');

    const supervision = supervisionFixture(
      [present, enPause, absent, conforme],
      [journeeOuverteFixture(present, 'PRESENT'), journeeOuverteFixture(enPause, 'EN_PAUSE'), journeeOuverteFixture(conforme, 'PRESENT')],
      [
        activiteFixture(present, 'NON_CONFORMITE'),
        activiteFixture(enPause, 'NON_CONFORMITE'),
        activiteFixture(absent, 'NON_CONFORMITE'),
        activiteFixture(conforme, 'TRAVAIL'),
      ],
    );

    expect(supervision.operateursEnNonConformite().map(supervise => supervise.operateur.id.value)).toEqual(['op-present', 'op-pause']);
  });

  it('should list operators carrying an anomaly', () => {
    const sansFenetres = operateurFixture('op-sans-fenetres', 'Aubert');
    const absentActif = operateurFixture('op-absent-actif', 'Benali');
    const calme = operateurFixture('op-calme', 'Chevalier');

    const supervision = supervisionFixture(
      [sansFenetres, absentActif, calme],
      [JourneeDeTravail.open(sansFenetres.id, 'PRESENT'), journeeOuverteFixture(calme, 'PRESENT')],
      [activiteFixture(absentActif)],
    );

    expect(supervision.operateursAVerifier().map(supervise => supervise.operateur.id.value)).toEqual([
      'op-sans-fenetres',
      'op-absent-actif',
    ]);
  });

  it('should count present operators, excluding paused and absent ones', () => {
    const auTravail = operateurFixture('op-travail', 'Aubert');
    const sansAffectation = operateurFixture('op-sans-affectation', 'Benali');
    const enPause = operateurFixture('op-pause', 'Chevalier');
    const absent = operateurFixture('op-absent', 'Dumas');

    const supervision = supervisionFixture(
      [auTravail, sansAffectation, enPause, absent],
      [
        journeeOuverteFixture(auTravail, 'PRESENT'),
        journeeOuverteFixture(sansAffectation, 'PRESENT'),
        journeeOuverteFixture(enPause, 'EN_PAUSE'),
      ],
      [activiteFixture(auTravail)],
    );

    expect(supervision.countPresents()).toBe(2);
  });

  it('should expose the evaluation instant it was determined at', () => {
    const maintenant = new Instant('2026-09-24T07:10:00Z');

    const resultat = SupervisionDeLAtelier.determine([], [], [], maintenant);

    expect(exploitableFixture(resultat).instantDEvaluation).toBe(maintenant);
  });

  it('should expose the start of the ongoing pause, and nothing for a visit without windows', () => {
    const enPause = operateurFixture('op-pause', 'Aubert');
    const sansFenetres = operateurFixture('op-sans-fenetres', 'Benali');
    const finDeLaFenetre = new Instant('2026-09-13T08:50:00Z');

    const supervision = supervisionFixture(
      [enPause, sansFenetres],
      [
        JourneeDeTravail.open(enPause.id, 'EN_PAUSE', [
          new FenetreDePresence(new Instant('2026-09-13T06:00:00Z'), new Instant('2026-09-13T07:00:00Z')),
          new FenetreDePresence(new Instant('2026-09-13T07:30:00Z'), finDeLaFenetre),
        ]),
        JourneeDeTravail.open(sansFenetres.id, 'EN_PAUSE'),
      ],
      [],
    );

    expect(supervision.operateurs.map(supervise => supervise.debutDeLaPauseEnCours())).toEqual([finDeLaFenetre, undefined]);
  });

  it('should suspend the activities of a paused operator, never those of a present one', () => {
    const enPauseActif = operateurFixture('op-pause-actif', 'Aubert');
    const enPauseInactif = operateurFixture('op-pause-inactif', 'Benali');
    const presentActif = operateurFixture('op-present-actif', 'Chevalier');

    const supervision = supervisionFixture(
      [enPauseActif, enPauseInactif, presentActif],
      [
        journeeOuverteFixture(enPauseActif, 'EN_PAUSE'),
        journeeOuverteFixture(enPauseInactif, 'EN_PAUSE'),
        journeeOuverteFixture(presentActif, 'PRESENT'),
      ],
      [activiteFixture(enPauseActif), activiteFixture(presentActif)],
    );

    expect(supervision.operateurs.map(supervise => supervise.hasActivitesSuspendues())).toEqual([true, false, false]);
  });

  it('should order activities by workstation label with unassigned workstations last, then by start', () => {
    const operateur = operateurFixture('op-1');
    const activite = (id: string, poste: string | undefined, debut: string): ActiviteDeSupervision =>
      activiteSurPosteFixture(operateur, id, { poste, debut });

    const supervision = supervisionFixture(
      [operateur],
      [journeeOuverteFixture(operateur, 'PRESENT')],
      [
        activite('sans-poste', undefined, '07:00'),
        activite('sans-poste-tot', undefined, '06:50'),
        activite('tour-10', 'Tour 10', '07:10'),
        activite('tour-2-tard', 'Tour 2', '08:30'),
        activite('tour-2-b', 'Tour 2', '08:10'),
        activite('tour-2-a', 'Tour 2', '08:10'),
        activite('erodeuse', 'Érodeuse', '08:40'),
      ],
    );

    expect(supervision.operateurs[0]?.activites.map(activiteSupervisee => activiteSupervisee.id.value)).toEqual([
      'erodeuse',
      'tour-2-a',
      'tour-2-b',
      'tour-2-tard',
      'tour-10',
      'sans-poste-tot',
      'sans-poste',
    ]);
  });

  it('should count a non-billable activity as work', () => {
    const operateur = operateurFixture('op-1');
    const horsOf = new ActiviteDeSupervision({
      id: new IdentifiantActivite('act-hors-of'),
      operateurId: operateur.id,
      objet: new HorsOf(),
      categorie: new CategorieActivite('TRAVAIL'),
      debut: new Instant('2026-09-13T08:30:00Z'),
    });

    const supervision = supervisionFixture([operateur], [journeeOuverteFixture(operateur, 'PRESENT')], [horsOf]);

    expect(couloirDe(supervision, operateur)).toBe('AU_TRAVAIL');
  });
});

function exploitableFixture(resultat: ResultatSupervision): SupervisionDeLAtelier {
  if (!resultat.estExploitable) {
    throw new Error('Expected an exploitable supervision');
  }
  return resultat.supervision;
}

function inexploitableFixture(resultat: ResultatSupervision): MotifSupervisionInexploitable {
  if (resultat.estExploitable) {
    throw new Error('Expected an unexploitable supervision');
  }
  return resultat.motif;
}

const MAINTENANT = new Instant('2026-09-13T09:00:00Z');

const posteFixture = (libelle: string): PosteDeSupervision =>
  new PosteDeSupervision({ id: new IdentifiantPoste(`poste-${libelle}`), libelle });

const MOULE_1015 = new ElementTravaille({ type: 'PRODUIT', nom: 'PRD-2026-000001', reference: new ReferenceDElement('1015') });

const operateurFixture = (id: string, nom = 'Dupont', prenom = 'Jean'): OperateurDeclare =>
  new OperateurDeclare({ id: new IdentifiantOperateur(id), nom, prenom });

const journeeOuverteFixture = (operateur: OperateurDeclare, session: EtatSession): JourneeDeTravail =>
  JourneeDeTravail.open(operateur.id, session, [new FenetreDePresence(new Instant('2026-09-13T08:00:00Z'))]);

const activiteFixture = (operateur: OperateurDeclare, categorie: ValeurCategorieActivite = 'TRAVAIL'): ActiviteDeSupervision =>
  new ActiviteDeSupervision({
    id: new IdentifiantActivite(`act-${operateur.id.value}-${categorie}`),
    operateurId: operateur.id,
    objet: MOULE_1015,
    categorie: new CategorieActivite(categorie),
    debut: new Instant('2026-09-13T08:30:00Z'),
  });

const activiteSurPosteFixture = (
  operateur: OperateurDeclare,
  id: string,
  { poste, debut }: { readonly poste: string | undefined; readonly debut: string },
): ActiviteDeSupervision =>
  new ActiviteDeSupervision({
    id: new IdentifiantActivite(id),
    operateurId: operateur.id,
    objet: MOULE_1015,
    categorie: new CategorieActivite('TRAVAIL'),
    debut: new Instant(`2026-09-13T${debut}:00Z`),
    ...(poste === undefined ? {} : { poste: posteFixture(poste) }),
  });

const activitesFixture = (operateur: OperateurDeclare, nombre: number): ActiviteDeSupervision[] =>
  Array.from({ length: nombre }, () => activiteFixture(operateur));

function supervisionFixture(
  operateurs: readonly OperateurDeclare[],
  journees: readonly JourneeDeTravail[],
  activites: readonly ActiviteDeSupervision[],
): SupervisionDeLAtelier {
  return exploitableFixture(SupervisionDeLAtelier.determine(operateurs, journees, activites, MAINTENANT));
}

function couloirDe(supervision: SupervisionDeLAtelier, operateur: OperateurDeclare): CouloirDeSupervision | undefined {
  return supervision.couloirs().find(couloir => couloir.operateurs.some(supervise => supervise.operateur.id.equals(operateur.id)))?.couloir;
}
