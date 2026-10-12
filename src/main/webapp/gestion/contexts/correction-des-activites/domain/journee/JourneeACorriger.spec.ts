import { ActiviteDeLaJournee } from './ActiviteDeLaJournee';
import { ActiviteDeLaJourneeId } from './ActiviteDeLaJourneeId';
import { BornesDuJour } from './BornesDuJour';
import { CategorieDElement } from './CategorieDElement';
import { ChoixDAjout } from './ChoixDAjout';
import { Duree } from './Duree';
import { ElementDeLaJournee } from './ElementDeLaJournee';
import { ElementDeLaJourneeId } from './ElementDeLaJourneeId';
import { InstantDeLaJournee } from './InstantDeLaJournee';
import { JourACorriger } from './JourACorriger';
import { JourneeACorriger } from './JourneeACorriger';
import { OperateurDeLaJournee } from './OperateurDeLaJournee';
import { OperateurDeLaJourneeId } from './OperateurDeLaJourneeId';
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

const activite = (suivi: string, element: ElementDeLaJournee): ActiviteDeLaJournee =>
  new ActiviteDeLaJournee({
    id: new ActiviteDeLaJourneeId(`debut-${suivi}`),
    suivi: new SuiviDAtelierId(suivi),
    element,
    poste: undefined,
    categorie: 'TRAVAIL',
    debut: instant('2026-10-05T09:00:00+02:00'),
    etat: { kind: 'EN_COURS' },
    autresJours: [],
  });

const journeeDesActivites = (activites: readonly ActiviteDeLaJournee[]): JourneeACorriger =>
  new JourneeACorriger({
    operateur: new OperateurDeLaJournee(new OperateurDeLaJourneeId('op-1'), 'Dupont', 'Jean'),
    jour: new JourACorriger('2026-10-05'),
    bornes: new BornesDuJour({ debut: instant('2026-10-05T00:00:00+02:00'), fin: instant('2026-10-06T00:00:00+02:00') }),
    dureeOperationnelle: new Duree('PT0S'),
    activites,
    choix: new ChoixDAjout({ suivis: suivisPresents(), postes: [] }),
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
});
