import { ActiviteDeSupervision } from '../activite/ActiviteDeSupervision';
import { CategorieActivite, ValeurCategorieActivite } from '../activite/CategorieActivite';
import { ElementTravaille } from '../activite/ElementTravaille';
import { IdentifiantActivite } from '../activite/IdentifiantActivite';
import { IdentifiantSequence } from '../activite/IdentifiantSequence';
import { ReferenceDElement } from '../activite/ReferenceDElement';
import { SequenceEnConflit } from '../activite/SequenceEnConflit';
import { Instant } from '../instant/Instant';
import { IdentifiantOperateur } from '../operateur/IdentifiantOperateur';
import { OperateurDeclare } from '../operateur/OperateurDeclare';
import { IdentifiantPoste } from '../poste/IdentifiantPoste';
import { PosteDeSupervision } from '../poste/PosteDeSupervision';
import { CouloirDeSupervision } from './CouloirDeSupervision';
import { OperateurSupervise } from './OperateurSupervise';
import { MotifSupervisionInexploitable, ResultatSupervision } from './ResultatSupervision';
import { SupervisionDeLAtelier } from './SupervisionDeLAtelier';

describe('SupervisionDeLAtelier', () => {
  it('should keep current work one nanosecond before the acquired deadline within the same millisecond', () => {
    const operateur = operateurFixture('op-nanosecond');
    const activite = new ActiviteDeSupervision({
      id: new IdentifiantActivite('nanosecond-deadline'),
      operateurId: operateur.id,
      objet: MOULE_1015,
      categorie: new CategorieActivite('TRAVAIL'),
      debut: new Instant('2026-09-13T08:00:00.123456790Z'),
      echeance: new Instant('2026-09-13T21:00:00.123456790Z'),
    });

    const resultat = SupervisionDeLAtelier.determine({
      evaluation: new Instant('2026-09-13T21:00:00.123456789Z'),
      operateurs: [operateur],
      activites: [activite],
      sequencesEnConflit: [],
    });

    expect(couloirDe(exploitableFixture(resultat), operateur)).toBe('AU_TRAVAIL');
  });

  it('should preserve the opening nanoseconds when deriving the demonstration deadline after thirteen elapsed hours', () => {
    const operateur = operateurFixture('op-demo-nanosecond');
    const activite = new ActiviteDeSupervision({
      id: new IdentifiantActivite('demo-nanosecond-deadline'),
      operateurId: operateur.id,
      objet: MOULE_1015,
      categorie: new CategorieActivite('TRAVAIL'),
      debut: new Instant('2026-09-13T08:00:00.123456790Z'),
    });

    const resultat = SupervisionDeLAtelier.determine({
      evaluation: new Instant('2026-09-13T21:00:00.123456789Z'),
      operateurs: [operateur],
      activites: [activite],
      sequencesEnConflit: [],
    });

    expect(couloirDe(exploitableFixture(resultat), operateur)).toBe('AU_TRAVAIL');
  });

  it.each([{ evaluation: '2026-09-13T21:00:00.123456790Z' }, { evaluation: '2026-09-13T21:00:00.123456791Z' }])(
    'should finish current work at the acquired nanosecond deadline expressed with a different offset at $evaluation',
    ({ evaluation }) => {
      const operateur = operateurFixture('op-nanosecond-finished');
      const activite = new ActiviteDeSupervision({
        id: new IdentifiantActivite('nanosecond-finished'),
        operateurId: operateur.id,
        objet: MOULE_1015,
        categorie: new CategorieActivite('TRAVAIL'),
        debut: new Instant('2026-09-13T08:00:00.123456790Z'),
        echeance: new Instant('2026-09-13T23:00:00.123456790+02:00'),
      });

      const resultat = SupervisionDeLAtelier.determine({
        evaluation: new Instant(evaluation),
        operateurs: [operateur],
        activites: [activite],
        sequencesEnConflit: [],
      });

      const supervision = exploitableFixture(resultat);
      expect(couloirDe(supervision, operateur)).toBe('SANS_ACTIVITE');
      expect(supervision.operateurs[0]?.activitesTermineesAutomatiquement.map(terminee => terminee.finRetenue.value)).toEqual([
        '2026-09-13T21:00:00.123456790Z',
      ]);
    },
  );

  it('should classify current work until the acquired deadline', () => {
    const operateur = operateurFixture('op-server-deadline');
    const activite = new ActiviteDeSupervision({
      id: new IdentifiantActivite('server-deadline'),
      operateurId: operateur.id,
      objet: MOULE_1015,
      categorie: new CategorieActivite('TRAVAIL'),
      debut: new Instant('2026-09-13T08:00:00Z'),
      echeance: new Instant('2026-09-13T22:00:00Z'),
    });

    const resultat = SupervisionDeLAtelier.determine({
      evaluation: new Instant('2026-09-13T21:30:00Z'),
      operateurs: [operateur],
      activites: [activite],
      sequencesEnConflit: [],
    });

    expect(couloirDe(exploitableFixture(resultat), operateur)).toBe('AU_TRAVAIL');
  });

  it('should reject a conflicting activity whose operator cannot be identified', () => {
    const operateur = operateurFixture('op-conflict');
    const activite = new ActiviteDeSupervision({
      id: new IdentifiantActivite('orphan-conflict'),
      operateurId: undefined,
      objet: MOULE_1015,
      categorie: new CategorieActivite('TRAVAIL'),
      debut: MAINTENANT,
      etat: 'A_RESOUDRE',
    });
    const sequence = new SequenceEnConflit({
      id: new IdentifiantSequence('sequence-orphan'),
      operateurId: operateur.id,
      activites: [activite],
    });

    const resultat = SupervisionDeLAtelier.determine({
      evaluation: MAINTENANT,
      operateurs: [operateur],
      activites: [],
      sequencesEnConflit: [sequence],
    });

    expect(inexploitableFixture(resultat)).toBe('ACTIVITE_SANS_OPERATEUR_IDENTIFIABLE');
  });

  it('should keep a conflicting sequence visible without interpreting a current activity', () => {
    const operateur = operateurFixture('op-conflict');
    const activite = activiteFixture(operateur, 'NON_CONFORMITE');
    const sequence = new SequenceEnConflit({ id: new IdentifiantSequence('sequence-1'), operateurId: operateur.id, activites: [activite] });

    const supervision = exploitableFixture(
      SupervisionDeLAtelier.determine({
        evaluation: new Instant('2026-09-14T09:00:00Z'),
        operateurs: [operateur],
        activites: [],
        sequencesEnConflit: [sequence],
      }),
    );

    expect(couloirDe(supervision, operateur)).toBe('SANS_ACTIVITE');
    expect(supervision.operateurs[0]?.sequencesEnConflit).toEqual([sequence]);
    expect(supervision.operateurs[0]?.activites).toEqual([]);
    expect(supervision.operateursEnNonConformite()).toEqual([]);
    expect(supervision.operateursAVerifier().map(supervise => supervise.operateur.id.value)).toEqual(['op-conflict']);
  });

  it('should associate a conflicting sequence only with its declared operator', () => {
    const proprietaire = operateurFixture('op-1');
    const autreOperateur = operateurFixture('op-2');
    const sequence = new SequenceEnConflit({
      id: new IdentifiantSequence('sequence-owned'),
      operateurId: proprietaire.id,
      activites: [activiteFixture(proprietaire)],
    });

    const supervision = exploitableFixture(
      SupervisionDeLAtelier.determine({
        evaluation: MAINTENANT,
        operateurs: [autreOperateur, proprietaire],
        activites: [],
        sequencesEnConflit: [sequence],
      }),
    );

    expect(supervision.operateurs).toMatchObject([
      { operateur: proprietaire, sequencesEnConflit: [sequence] },
      { operateur: autreOperateur, sequencesEnConflit: [] },
    ]);
    expect(supervision.operateursAVerifier().map(supervise => supervise.operateur.id.value)).toEqual(['op-1']);
  });

  it('should exclude a completed activity from current work and automatic-end warnings', () => {
    const operateur = operateurFixture('op-completed');
    const activite = new ActiviteDeSupervision({
      id: new IdentifiantActivite('completed'),
      operateurId: operateur.id,
      objet: MOULE_1015,
      categorie: new CategorieActivite('NON_CONFORMITE'),
      debut: new Instant('2026-09-13T08:00:00Z'),
      etat: 'TERMINEE',
    });

    const supervision = exploitableFixture(
      SupervisionDeLAtelier.determine({ evaluation: MAINTENANT, sequencesEnConflit: [], operateurs: [operateur], activites: [activite] }),
    );

    expect(couloirDe(supervision, operateur)).toBe('SANS_ACTIVITE');
    expect(supervision.operateursEnNonConformite()).toEqual([]);
    expect(supervision.operateursAVerifier()).toEqual([]);
  });

  it('should stop counting an activity as current at exactly thirteen elapsed hours', () => {
    const operateur = operateurFixture('op-expired');
    const activite = activiteFixture(operateur);

    const resultat = SupervisionDeLAtelier.determine({
      evaluation: new Instant('2026-09-13T21:30:00Z'),
      sequencesEnConflit: [],
      operateurs: [operateur],
      activites: [activite],
    });

    expect(couloirDe(exploitableFixture(resultat), operateur)).toBe('SANS_ACTIVITE');
  });

  it('should place an operator with an ongoing activity in at work without any arrival', () => {
    const operateur = operateurFixture('op-with-activity');
    const activite = activiteFixture(operateur);

    const supervision = supervisionFixture([operateur], [activite]);

    expect(couloirDe(supervision, operateur)).toBe('AU_TRAVAIL');
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
    const activitesEnConflit = [activiteFixture(operateur, 'NON_CONFORMITE')];
    const sequence = new SequenceEnConflit({
      id: new IdentifiantSequence('copied-sequence'),
      operateurId: operateur.id,
      activites: activitesEnConflit,
    });
    const sequencesEnConflit = [sequence];
    const terminee = new ActiviteDeSupervision({
      id: new IdentifiantActivite('copied-automatic-end'),
      operateurId: operateur.id,
      objet: MOULE_1015,
      categorie: new CategorieActivite('TRAVAIL'),
      debut: new Instant('2026-09-12T08:00:00Z'),
      etat: 'TERMINEE_AUTOMATIQUEMENT',
    });
    const termineesAutomatiquement = [terminee];
    const supervise = new OperateurSupervise(operateur, { activites, termineesAutomatiquement, sequencesEnConflit });

    activites.length = 0;
    activitesEnConflit.length = 0;
    sequencesEnConflit.length = 0;
    termineesAutomatiquement.length = 0;

    expect(supervise.activites).toEqual([activite]);
    expect(supervise.activitesTermineesAutomatiquement).toEqual([terminee]);
    expect(supervise.sequencesEnConflit).toEqual([sequence]);
    expect(sequence.activites.map(enConflit => enConflit.id.value)).toEqual(['act-op-1-NON_CONFORMITE']);
  });

  it('should produce an empty supervision when no operators are declared', () => {
    const resultat = SupervisionDeLAtelier.determine({
      evaluation: new Instant('2026-09-13T09:00:00Z'),
      sequencesEnConflit: [],
      operateurs: [],
      activites: [],
    });

    expect(exploitableFixture(resultat).operateurs).toEqual([]);
  });

  it('should order operators alphabetically regardless of their activities', () => {
    const martin = new OperateurDeclare({ id: new IdentifiantOperateur('op-3'), nom: 'Martin', prenom: 'Alice' });
    const bernardClaude = new OperateurDeclare({ id: new IdentifiantOperateur('op-2'), nom: 'Bernard', prenom: 'Claude' });
    const dupont = new OperateurDeclare({ id: new IdentifiantOperateur('op-1'), nom: 'Dupont', prenom: 'Jean' });
    const bernardAlexandre = new OperateurDeclare({ id: new IdentifiantOperateur('op-4'), nom: 'Bernard', prenom: 'Alexandre' });

    const resultat = SupervisionDeLAtelier.determine({
      evaluation: MAINTENANT,
      sequencesEnConflit: [],
      operateurs: [martin, bernardClaude, dupont, bernardAlexandre],
      activites: [],
    });

    expect(exploitableFixture(resultat).operateurs).toMatchObject([
      { operateur: bernardAlexandre, activites: [] },
      { operateur: bernardClaude, activites: [] },
      { operateur: dupont, activites: [] },
      { operateur: martin, activites: [] },
    ]);
  });

  it('should break ties deterministically by operator identifier for homonyms', () => {
    const premierHomonyme = new OperateurDeclare({ id: new IdentifiantOperateur('op-1'), nom: 'Dupont', prenom: 'Jean' });
    const secondHomonyme = new OperateurDeclare({ id: new IdentifiantOperateur('op-2'), nom: 'Dupont', prenom: 'Jean' });

    const resultat = SupervisionDeLAtelier.determine({
      evaluation: new Instant('2026-09-13T09:00:00Z'),
      sequencesEnConflit: [],
      operateurs: [secondHomonyme, premierHomonyme],
      activites: [],
    });

    expect(exploitableFixture(resultat).operateurs).toMatchObject([
      { operateur: premierHomonyme, activites: [] },
      { operateur: secondHomonyme, activites: [] },
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

    const resultat = SupervisionDeLAtelier.determine({
      evaluation: MAINTENANT,
      sequencesEnConflit: [],
      operateurs: [dupont, martin],
      activites: [premiereActivite, secondeActivite, activiteMartin],
    });

    expect(exploitableFixture(resultat).operateurs).toMatchObject([
      { operateur: dupont, activites: [premiereActivite, secondeActivite] },
      { operateur: martin, activites: [activiteMartin] },
    ]);
  });

  it('should treat only NON_CONFORMITE as nonconforming', () => {
    const enNonConformite = operateurFixture('op-nc', 'Aubert');
    const auTravail = operateurFixture('op-travail', 'Benali');

    const supervision = supervisionFixture(
      [enNonConformite, auTravail],
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

  it('should return unexploitable result when an activity has no operator identifier', () => {
    const operateur = new OperateurDeclare({ id: new IdentifiantOperateur('op-1'), nom: 'Dupont', prenom: 'Jean' });
    const activiteSansOperateur = new ActiviteDeSupervision({
      id: new IdentifiantActivite('act-orphan'),
      operateurId: undefined,
      objet: MOULE_1015,
      categorie: new CategorieActivite('TRAVAIL'),
      debut: new Instant('2026-09-13T08:00:00Z'),
    });

    const resultat = SupervisionDeLAtelier.determine({
      evaluation: new Instant('2026-09-13T09:00:00Z'),
      sequencesEnConflit: [],
      operateurs: [operateur],
      activites: [activiteSansOperateur],
    });

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

    const resultat = SupervisionDeLAtelier.determine({
      evaluation: new Instant('2026-09-13T09:00:00Z'),
      sequencesEnConflit: [],
      operateurs: [operateur],
      activites: [activiteInconnue],
    });

    expect(resultat.estExploitable).toBe(false);
    expect(inexploitableFixture(resultat)).toBe('ACTIVITE_SANS_OPERATEUR_IDENTIFIABLE');
  });

  it('should place an operator whose only activity is nonconforming in the working lane', () => {
    const operateur = operateurFixture('op-1');

    const supervision = supervisionFixture([operateur], [activiteFixture(operateur, 'NON_CONFORMITE')]);

    expect(couloirDe(supervision, operateur)).toBe('AU_TRAVAIL');
  });

  it('should place an operator without activity in the without activity lane', () => {
    const operateur = operateurFixture('op-1');

    const supervision = supervisionFixture([operateur], []);

    expect(couloirDe(supervision, operateur)).toBe('SANS_ACTIVITE');
  });

  it('should always return the two lanes in fixed order, empty ones included', () => {
    const operateur = operateurFixture('op-1');

    const supervision = supervisionFixture([operateur], []);

    expect(supervision.couloirs().map(couloir => [couloir.couloir, couloir.operateurs.length])).toEqual([
      ['AU_TRAVAIL', 0],
      ['SANS_ACTIVITE', 1],
    ]);
  });

  it('should order operators alphabetically within each lane', () => {
    const martin = operateurFixture('op-3', 'Martin', 'Alice');
    const bernardClaude = operateurFixture('op-2', 'Bernard', 'Claude');
    const dupont = operateurFixture('op-1', 'Dupont', 'Jean');
    const bernardAlexandre = operateurFixture('op-4', 'Bernard', 'Alexandre');

    const supervision = supervisionFixture(
      [martin, bernardClaude, dupont, bernardAlexandre],
      [activiteFixture(martin), activiteFixture(bernardAlexandre)],
    );

    expect([operateursDuCouloir(supervision, 'AU_TRAVAIL'), operateursDuCouloir(supervision, 'SANS_ACTIVITE')]).toEqual([
      ['op-4', 'op-3'],
      ['op-2', 'op-1'],
    ]);
  });

  it('should expose the evaluation instant it was determined at', () => {
    const maintenant = new Instant('2026-09-24T07:10:00Z');

    const resultat = SupervisionDeLAtelier.determine({ evaluation: maintenant, sequencesEnConflit: [], operateurs: [], activites: [] });

    expect(exploitableFixture(resultat).instantDEvaluation).toBe(maintenant);
  });

  it('should order activities by workstation label with unassigned workstations last, then by start', () => {
    const operateur = operateurFixture('op-1');
    const activite = (id: string, poste: string | undefined, debut: string): ActiviteDeSupervision =>
      activiteSurPosteFixture(operateur, id, { poste, debut });

    const supervision = supervisionFixture(
      [operateur],
      [
        activite('sans-poste-tot', undefined, '06:50'),
        activite('tour-10', 'Tour 10', '07:10'),
        activite('tour-2-tard', 'Tour 2', '08:30'),
        activite('tour-2-b', 'Tour 2', '08:10'),
        activite('tour-2-a', 'Tour 2', '08:10'),
        activite('erodeuse', 'Érodeuse', '08:40'),
        activite('sans-poste', undefined, '07:00'),
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

  it('should count work on a personal fabrication order as work', () => {
    const operateur = operateurFixture('op-1');
    const ofPerso = new ActiviteDeSupervision({
      id: new IdentifiantActivite('act-perso'),
      operateurId: operateur.id,
      objet: new ElementTravaille({ type: 'ORDRE_DE_FABRICATION', nom: 'OF Perso' }),
      categorie: new CategorieActivite('TRAVAIL'),
      debut: new Instant('2026-09-13T08:30:00Z'),
    });

    const supervision = supervisionFixture([operateur], [ofPerso]);

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

function supervisionFixture(operateurs: readonly OperateurDeclare[], activites: readonly ActiviteDeSupervision[]): SupervisionDeLAtelier {
  return exploitableFixture(SupervisionDeLAtelier.determine({ evaluation: MAINTENANT, sequencesEnConflit: [], operateurs, activites }));
}

function operateursDuCouloir(supervision: SupervisionDeLAtelier, couloir: CouloirDeSupervision): readonly string[] {
  return (
    supervision
      .couloirs()
      .find(couloirSupervise => couloirSupervise.couloir === couloir)
      ?.operateurs.map(supervise => supervise.operateur.id.value) ?? []
  );
}

function couloirDe(supervision: SupervisionDeLAtelier, operateur: OperateurDeclare): CouloirDeSupervision | undefined {
  return supervision.couloirs().find(couloir => couloir.operateurs.some(supervise => supervise.operateur.id.equals(operateur.id)))?.couloir;
}
