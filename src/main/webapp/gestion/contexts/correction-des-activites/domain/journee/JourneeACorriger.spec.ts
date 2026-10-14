import { ActiviteDeLaJournee } from './ActiviteDeLaJournee';
import { ActiviteDeLaJourneeId } from './ActiviteDeLaJourneeId';
import { BornesDuJour } from './BornesDuJour';
import { CategorieDElement } from './CategorieDElement';
import { ChoixDAjout } from './ChoixDAjout';
import { Duree } from './Duree';
import { ElementDeLaJournee } from './ElementDeLaJournee';
import { ElementDeLaJourneeId } from './ElementDeLaJourneeId';
import { EtatDActivite } from './EtatDActivite';
import { InstantDeLaJournee } from './InstantDeLaJournee';
import { JourACorriger } from './JourACorriger';
import { JourneeACorriger } from './JourneeACorriger';
import { OperateurDeLaJournee } from './OperateurDeLaJournee';
import { OperateurDeLaJourneeId } from './OperateurDeLaJourneeId';
import { PosteDeLaJournee } from './PosteDeLaJournee';
import { PosteDeLaJourneeId } from './PosteDeLaJourneeId';
import { SuiviDAtelierId } from './SuiviDAtelierId';
import { SuiviPresent } from './SuiviPresent';
import { SuivisPresents } from './SuivisPresents';

const instant = (recu: string): InstantDeLaJournee => new InstantDeLaJournee(recu);

const elementDe = (suffixe: string): ElementDeLaJournee =>
  new ElementDeLaJournee({
    id: new ElementDeLaJourneeId(`element-${suffixe}`),
    categorie: new CategorieDElement('OF'),
    nom: `PRD-2026-0000${suffixe}`,
    reference: `24-13${suffixe}`,
    description: `Pièce ${suffixe}`,
  });

const CLOTURE = instant('2026-10-05T11:00:00+02:00');

const suivisPresents = (): SuivisPresents =>
  new SuivisPresents([
    new SuiviPresent({
      suivi: new SuiviDAtelierId('suivi-1'),
      element: elementDe('1'),
      engageLe: instant('2026-10-03T08:00:00+02:00'),
      clotureLe: undefined,
    }),
    new SuiviPresent({
      suivi: new SuiviDAtelierId('suivi-2'),
      element: elementDe('2'),
      engageLe: instant('2026-10-04T08:00:00+02:00'),
      clotureLe: CLOTURE,
    }),
  ]);

const TOUR = new PosteDeLaJournee(new PosteDeLaJourneeId('poste-tour'), 'Tour CN 1', 'Tournage');
const FRAISEUSE = new PosteDeLaJournee(new PosteDeLaJourneeId('poste-fraise'), 'Fraiseuse 1', 'Fraisage');
const PERCEUSE = new PosteDeLaJournee(new PosteDeLaJourneeId('poste-perce'), 'Perceuse 1', 'Perçage');

const activite = (
  suivi: string,
  element: ElementDeLaJournee,
  etat: EtatDActivite = { kind: 'EN_COURS' },
  poste?: PosteDeLaJournee,
): ActiviteDeLaJournee =>
  new ActiviteDeLaJournee({
    id: new ActiviteDeLaJourneeId(`debut-${suivi}`),
    suivi: new SuiviDAtelierId(suivi),
    element,
    poste,
    categorie: 'TRAVAIL',
    debut: instant('2026-10-05T09:00:00+02:00'),
    etat,
    autresJours: [],
  });

const terminee = (kind: 'TERMINEE' | 'TERMINEE_AUTOMATIQUEMENT'): EtatDActivite => ({
  kind,
  fin: instant('2026-10-05T10:00:00+02:00'),
  dureeSurLeJour: new Duree('PT1H'),
});

const journeeDesActivites = (activites: readonly ActiviteDeLaJournee[], postes: readonly PosteDeLaJournee[] = []): JourneeACorriger =>
  new JourneeACorriger({
    operateur: new OperateurDeLaJournee(new OperateurDeLaJourneeId('op-1'), 'Dupont', 'Jean'),
    jour: new JourACorriger('2026-10-05'),
    bornes: new BornesDuJour({
      debut: instant('2026-10-05T00:00:00+02:00'),
      fin: instant('2026-10-06T00:00:00+02:00'),
      finDuLendemain: instant('2026-10-07T00:00:00+02:00'),
    }),
    dureeOperationnelle: new Duree('PT0S'),
    activites,
    choix: new ChoixDAjout({ suivis: suivisPresents(), postes }),
  });

describe('JourneeACorriger', () => {
  it('should be refused when an activity belongs to a suivi that is not among the suivis present that day', () => {
    expect(() => journeeDesActivites([activite('suivi-9', elementDe('1'))])).toThrow(
      'Le suivi de l’activité reçue du serveur n’est pas présent ce jour-là.',
    );
  });

  it('should be refused when an activity names another element than the one of its suivi', () => {
    expect(() => journeeDesActivites([activite('suivi-1', elementDe('2'))])).toThrow(
      'L’élément de l’activité reçue du serveur n’est pas celui de son suivi.',
    );
  });

  it('should tell when the suivi of an activity was closed', () => {
    const fermee = activite('suivi-2', elementDe('2'));

    expect(journeeDesActivites([fermee]).clotureDe(fermee)).toEqual(CLOTURE);
  });

  it('should tell nothing of closing for an activity whose suivi is open', () => {
    const ouverte = activite('suivi-1', elementDe('1'));

    expect(journeeDesActivites([ouverte]).clotureDe(ouverte)).toBeUndefined();
  });

  it.each([
    { cas: 'finished normally, or by a regularised end', kind: 'TERMINEE' },
    { cas: 'finished automatically', kind: 'TERMINEE_AUTOMATIQUEMENT' },
  ] as const)('should be correctable when the activity is $cas and its suivi is open', ({ kind }) => {
    const ouverte = activite('suivi-1', elementDe('1'), terminee(kind));

    expect(journeeDesActivites([ouverte]).estCorrigeable(ouverte)).toBe(true);
  });

  it('should not be correctable while the activity is in progress', () => {
    const enCours = activite('suivi-1', elementDe('1'));

    expect(journeeDesActivites([enCours]).estCorrigeable(enCours)).toBe(false);
  });

  it('should not be correctable once the suivi of the activity is closed', () => {
    const fermee = activite('suivi-2', elementDe('2'), terminee('TERMINEE'));

    expect(journeeDesActivites([fermee]).estCorrigeable(fermee)).toBe(false);
  });

  it('should propose the workstations the operator is allowed on, except the current one of the activity', () => {
    const surLeTour = activite('suivi-1', elementDe('1'), terminee('TERMINEE'), TOUR);

    expect(journeeDesActivites([surLeTour], [TOUR, FRAISEUSE, PERCEUSE]).postesPourChanger(surLeTour)).toEqual([FRAISEUSE, PERCEUSE]);
  });

  it('should propose no workstation when the only one the operator is allowed on is the current one', () => {
    const surLeTour = activite('suivi-1', elementDe('1'), terminee('TERMINEE'), TOUR);

    expect(journeeDesActivites([surLeTour], [TOUR]).postesPourChanger(surLeTour)).toEqual([]);
  });

  it('should propose every workstation the operator is allowed on for an activity without a workstation', () => {
    const sansPoste = activite('suivi-1', elementDe('1'), terminee('TERMINEE'));

    expect(journeeDesActivites([sansPoste], [TOUR, FRAISEUSE]).postesPourChanger(sansPoste)).toEqual([TOUR, FRAISEUSE]);
  });

  it('should find a correctable activity by its identifier', () => {
    const ouverte = activite('suivi-1', elementDe('1'), terminee('TERMINEE'));

    expect(journeeDesActivites([ouverte]).activiteCorrigeable(ouverte.id)).toBe(ouverte);
  });

  it.each([
    { cas: 'in progress', etat: { kind: 'EN_COURS' } as EtatDActivite, suivi: 'suivi-1', element: '1' },
    { cas: 'of a closed suivi', etat: terminee('TERMINEE'), suivi: 'suivi-2', element: '2' },
  ])('should not find an activity $cas among the correctable ones', ({ etat, suivi, element }) => {
    const intouchable = activite(suivi, elementDe(element), etat);

    expect(journeeDesActivites([intouchable]).activiteCorrigeable(intouchable.id)).toBeUndefined();
  });

  it('should not find an activity the day does not hold', () => {
    const connue = activite('suivi-1', elementDe('1'), terminee('TERMINEE'));

    expect(journeeDesActivites([connue]).activiteCorrigeable(new ActiviteDeLaJourneeId('debut-inconnue'))).toBeUndefined();
  });
});
