import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { ComponentFixture, ComponentFixtureAutoDetect, TestBed } from '@angular/core/testing';
import { ErrorHandlerFixture } from '@test/unit/fixtures/ErrorHandlerFixture';
import { CorrectionsFixture } from '@test/unit/fixtures/gestion/correction-des-activites/CorrectionsFixture';
import {
  elementFixture,
  fraiseuseFixture,
  instantLocal,
  journeeFixture,
  tourFixture,
} from '@test/unit/fixtures/gestion/correction-des-activites/JourneeACorrigerFixture';
import { dataSelector } from '@test/utils/DataSelector';
import { requiredFixture } from '@test/utils/RequiredFixture';
import { CorrectionDUneActivite, IssueDeCorrection } from '../../../application/CorrectionDUneActivite';
import { AjoutEnPreparation } from '../../../domain/correction/AjoutEnPreparation';
import { CorrectionsPort } from '../../../domain/correction/CorrectionsPort';
import { BornesDuJour } from '../../../domain/journee/BornesDuJour';
import { CategorieDElement } from '../../../domain/journee/CategorieDElement';
import { ChoixDAjout } from '../../../domain/journee/ChoixDAjout';
import { Duree } from '../../../domain/journee/Duree';
import { ElementDeLaJournee } from '../../../domain/journee/ElementDeLaJournee';
import { ElementDeLaJourneeId } from '../../../domain/journee/ElementDeLaJourneeId';
import { InstantDeLaJournee } from '../../../domain/journee/InstantDeLaJournee';
import { JourACorriger } from '../../../domain/journee/JourACorriger';
import { JourneeACorriger } from '../../../domain/journee/JourneeACorriger';
import { OperateurDeLaJournee } from '../../../domain/journee/OperateurDeLaJournee';
import { OperateurDeLaJourneeId } from '../../../domain/journee/OperateurDeLaJourneeId';
import { PosteDeLaJournee } from '../../../domain/journee/PosteDeLaJournee';
import { SuiviDAtelierId } from '../../../domain/journee/SuiviDAtelierId';
import { SuiviPresent } from '../../../domain/journee/SuiviPresent';
import { SuivisPresents } from '../../../domain/journee/SuivisPresents';
import { AjoutCorrige } from '../AjoutCorrige';
import { calendrierDuNavigateur } from '../CalendrierDuNavigateur';
import { PanneauDAjout } from './PanneauDAjout';

const lundi = (postes: readonly PosteDeLaJournee[] = [tourFixture, fraiseuseFixture]): JourneeACorriger =>
  journeeFixture({
    jour: 5,
    suivis: [
      { suivi: 'suivi-1', element: elementFixture('1') },
      { suivi: 'suivi-2', element: elementFixture('2', 'MOULE'), clotureLe: instantLocal(5, 11) },
    ],
    activites: [],
    operationnelle: 'PT4H45M',
    postes,
  });

describe('Panel to add an activity', () => {
  let shown: ComponentFixture<PanneauDAjout>;
  let corrections: CorrectionsFixture;
  let corrigees: IssueDeCorrection[];
  let portionsAjoutees: { jour: string; duree: Duree }[][];
  let abandons: number;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 6, 10, 0));
    corrections = new CorrectionsFixture();
    corrigees = [];
    portionsAjoutees = [];
    abandons = 0;
    TestBed.configureTestingModule({
      providers: [
        { provide: ComponentFixtureAutoDetect, useValue: true },
        { provide: CorrectionsPort, useValue: corrections },
        { provide: ErrorHandlerPort, useClass: ErrorHandlerFixture },
        CorrectionDUneActivite,
      ],
    });
  });

  afterEach(() => {
    corrections.liberer();
    vi.useRealTimers();
  });

  it('should offer the workstations the operator is allowed on with their nature, the first one chosen', async () => {
    await whenOpening();

    expect(text('ajout-titre')).toBe('Ajouter une activité');
    expect(optionTexts()).toEqual(['Tour CN 1 · Tournage', 'Fraiseuse 1 · Fraisage']);
    expect(chosenWorkstation()).toBe('poste-tour');
  });

  it('should offer the type work or non-conformity, work being chosen', async () => {
    await whenOpening();

    expect(texts('ajout-type')).toEqual(['Travail', 'Non-conformité']);
    expect(pressed('ajout-type')).toEqual(['true', 'false']);
  });

  it('should ask to choose an element before one is chosen', async () => {
    await whenOpening();

    expect(text('ajout-element')).toBe('Choisir un élément');
  });

  it('should move the focus to the first field when it opens', async () => {
    await whenOpening();

    expect(document.activeElement).toBe(all('ajout-element')[0]);
  });

  it('should offer one element per suivi present, closed ones included, searchable', async () => {
    await whenOpening();

    await whenOpeningTheElements();

    expect(elementChoices()).toEqual(['MOULE 24-132 · Pièce 2', 'OF 24-131 · Pièce 1']);
  });

  it('should narrow the elements to the search typed, accents ignored', async () => {
    await whenOpening();
    await whenOpeningTheElements();

    await whenSearchingElements('24-131');

    expect(elementChoices()).toEqual(['OF 24-131 · Pièce 1']);
  });

  it('should say no element matches the search typed', async () => {
    await whenOpening();
    await whenOpeningTheElements();

    await whenSearchingElements('zzz');

    expect(documentTexts('ajout-element-sans-resultat')).toEqual(['Aucun élément ne correspond']);
  });

  it('should say no element is present when the day has no suivi', async () => {
    await whenOpening(lundiSansSuivi());
    await whenOpeningTheElements();

    expect(documentTexts('ajout-element-sans-resultat')).toEqual(['Aucun élément présent ce jour']);
  });

  it('should show the element chosen and close the list of elements', async () => {
    await whenOpening();
    await whenOpeningTheElements();

    await whenChoosingTheElement('OF 24-131 · Pièce 1');

    expect(text('ajout-element')).toBe('OF 24-131 · Pièce 1');
    expect(elementChoices()).toEqual([]);
  });

  it('should show the duration and the effect on the day while the hours are typed', async () => {
    await whenOpening();

    await whenTyping('08:00', '10:30');

    expect(text('ajout-duree')).toBe('2 h 30');
    expect(texts('ajout-effet-libelle')).toEqual(['Opérationnel du lundi 5']);
    expect(texts('ajout-effet-valeur')).toEqual(['4 h 45 → 7 h 15']);
  });

  it('should say nothing can be forecast before the hours are typed', async () => {
    await whenOpening();

    expect(text('ajout-sans-effet')).toBe('Saisissez un début et une fin pour voir l’effet.');
    expect(text('ajout-duree')).toBe('');
  });

  it('should tell an hour badly written under the hours', async () => {
    await whenOpening();

    await whenTyping('25:00', '10:30');

    expect(text('ajout-erreur')).toBe('Heure attendue au format 00:00.');
    expect(invalids()).toEqual(['true', 'true']);
  });

  it('should flag no hour as invalid while the hours are right', async () => {
    await whenOpening();

    await whenTyping('08:00', '23:00');

    expect(text('ajout-erreur')).toBe('');
    expect(invalids()).toEqual([null, null]);
  });

  it('should name the closing of the element chosen when the end follows it', async () => {
    await whenOpening();
    await whenOpeningTheElements();
    await whenChoosingTheElement('MOULE 24-132 · Pièce 2');

    await whenTyping('10:00', '11:30');

    expect(text('ajout-erreur')).toBe('La fin suit la clôture de l’élément, le lundi 5 à 11:00.');
  });

  it('should send nothing and say the hours are missing when adding without hours', async () => {
    await whenOpening();
    await whenOpeningTheElements();
    await whenChoosingTheElement('OF 24-131 · Pièce 1');

    await whenAdding();

    expect(text('ajout-erreur')).toBe('Saisissez le début et la fin.');
    expect(corrections.ajouts).toEqual([]);
  });

  it('should send nothing and ask to choose an element again when the element chosen is gone once the day is read again', async () => {
    await whenOpeningReady();
    await whenTheDayIsReadAgainWithoutTheElement();

    await whenAdding();

    expect(text('ajout-element-manquant')).toBe('Choisissez un élément.');
    expect(corrections.ajouts).toEqual([]);
  });

  it('should send nothing and ask to choose an element when adding without one', async () => {
    await whenOpening();
    await whenTyping('08:00', '10:30');

    await whenAdding();

    expect(text('ajout-element-manquant')).toBe('Choisissez un élément.');
    expect(corrections.ajouts).toEqual([]);
  });

  it('should send nothing when the end equals the start', async () => {
    await whenOpening();
    await whenOpeningTheElements();
    await whenChoosingTheElement('OF 24-131 · Pièce 1');
    await whenTyping('10:00', '10:00');

    await whenAdding();

    expect(text('ajout-erreur')).toBe('La fin doit suivre le début.');
    expect(corrections.ajouts).toEqual([]);
  });

  it('should send the activity chosen and tell the day must be reread', async () => {
    await whenOpening();
    await whenOpeningTheElements();
    await whenChoosingTheElement('OF 24-131 · Pièce 1');
    await whenChoosingTheWorkstation('poste-fraise');
    await whenChoosingTheType('Non-conformité');
    await whenTyping('08:00', '10:30');

    await whenAdding();

    expect(corrections.ajouts.map(saisie => [saisie.suivi.value, saisie.poste.value, saisie.categorie, saisie.operateur.value])).toEqual([
      ['suivi-1', 'poste-fraise', 'NON_CONFORMITE', 'op-1'],
    ]);
    expect(corrections.ajouts.map(saisie => [saisie.debut, saisie.fin])).toEqual([[instantLocal(5, 8), instantLocal(5, 10, 30)]]);
    expect(corrigees).toEqual(['ENREGISTREE']);
  });

  it('should tell the day changed when the server says so', async () => {
    corrections.repondreALAjout({ kind: 'JOURNEE_CHANGEE' });
    await whenOpeningReady();

    await whenAdding();

    expect(corrigees).toEqual(['JOURNEE_CHANGEE']);
  });

  it.each([
    {
      motif: 'CHEVAUCHEMENT',
      libelle: 'Une autre activité de cet élément se chevauche déjà sur ce poste.',
    },
    {
      motif: 'FIN_FUTURE',
      libelle: 'La fin dépasse l’heure du serveur. Choisissez une heure plus tôt ou réessayez dans un instant.',
    },
  ] as const)('should explain the refusal $motif under the buttons and keep the entry', async ({ motif, libelle }) => {
    corrections.repondreALAjout({ kind: 'REFUS', motif });
    await whenOpeningReady();

    await whenAdding();

    expect(text('ajout-refus')).toBe(libelle);
    expect(corrigees).toEqual([]);
    expect([text('ajout-element'), values()]).toEqual(['OF 24-131 · Pièce 1', ['08:00', '10:30']]);
  });

  it('should forget the refusal once the entry is edited', async () => {
    corrections.repondreALAjout({ kind: 'REFUS', motif: 'CHEVAUCHEMENT' });
    await whenOpeningReady();
    await whenAdding();

    await whenTyping('09:00', '10:30');

    expect(all('ajout-refus')).toEqual([]);
  });

  it('should keep the same command when the same activity is added again after a refusal', async () => {
    corrections.repondreALAjout({ kind: 'REFUS', motif: 'CHEVAUCHEMENT' });
    await whenOpeningReady();
    await whenAdding();

    await whenAdding();

    expect(new Set(corrections.ajouts.map(saisie => saisie.id)).size).toBe(1);
  });

  it('should say the addition failed and keep the entry after a technical failure', async () => {
    corrections.repondreALAjout(new Error('Réseau coupé'));
    await whenOpeningReady();

    await whenAdding();

    expect(text('ajout-echec')).toBe('L’ajout n’a pas abouti. Vérifiez la connexion puis réessayez.');
    expect(corrigees).toEqual([]);
  });

  it('should forget its entry when it is closed without an outcome, so that the same activity added later is a new command', async () => {
    corrections.repondreALAjout({ kind: 'REFUS', motif: 'CHEVAUCHEMENT' });
    await whenOpeningReady();
    await whenAdding();
    shown.destroy();
    await whenOpeningReady();

    await whenAdding();

    expect(new Set(corrections.ajouts.map(saisie => saisie.id)).size).toBe(2);
  });

  it('should abandon without sending anything', async () => {
    await whenOpening();

    whenAbandoning();

    expect(corrections.ajouts).toEqual([]);
    expect(abandons).toBe(1);
  });

  it('should show the addition being sent and forbid adding or abandoning meanwhile', async () => {
    const arrivee = corrections.retenir();
    await whenOpeningReady();

    whenAddingWithoutWaiting();
    await arrivee;
    await shown.whenStable();

    expect(text('ajout-ajouter')).toBe('Ajout en cours…');
    expect(disabled('ajout-ajouter')).toEqual([true]);
    expect(disabled('ajout-abandonner')).toEqual([true]);
  });

  it('should say the operator is allowed on no workstation and offer nothing to add', async () => {
    await whenOpening(lundi([]));

    expect(text('ajout-aucun-poste')).toBe('Aucun poste habilité pour cet opérateur.');
    expect(all('ajout-poste')).toEqual([]);
    expect(all('ajout-ajouter')).toEqual([]);
    expect(all('ajout-abandonner')).toHaveLength(1);
  });

  it('should keep the hours typed and the element chosen when the day is read again meanwhile', async () => {
    await whenOpeningReady();

    await whenTheDayIsReadAgain();

    expect([text('ajout-element'), values()]).toEqual(['OF 24-131 · Pièce 1', ['08:00', '10:30']]);
  });

  it('should name an element that has no designation by its number alone', async () => {
    await whenOpening(lundiAvecUnElementSansDesignation());
    await whenOpeningTheElements();

    expect(elementChoices()).toEqual(['OF 24-139']);
  });

  it('should tell the start must fall on the day displayed when the workshop zone puts it elsewhere', async () => {
    await whenOpening(lundiDeLAtelierDeParis());

    await whenTyping('20:00', '');

    expect(text('ajout-erreur')).toBe('Le début doit tomber le lundi 5.');
  });

  it('should tell the end must fall on the day displayed when the workshop zone puts it elsewhere', async () => {
    await whenOpening(lundiDeLAtelierDeParis());

    await whenTyping('18:00', '20:00');

    expect(text('ajout-erreur')).toBe('La fin doit tomber le lundi 5.');
  });

  it('should tell the end cannot follow the current time', async () => {
    givenTheClockAt(new Date(2026, 9, 5, 9, 0));
    await whenOpening();

    await whenTyping('08:00', '10:30');

    expect(text('ajout-erreur')).toBe('La fin ne peut pas suivre l’heure actuelle.');
  });

  it('should name the engagement of the element chosen when the start precedes it', async () => {
    await whenOpening(lundiAvecUnElementEngageLeJour());
    await whenOpeningTheElements();
    await whenChoosingTheElement('OF 24-131 · Pièce 1');

    await whenTyping('13:00', '15:00');

    expect(text('ajout-erreur')).toBe('Le début précède l’engagement de l’élément, le lundi 5 à 14:00.');
  });

  it('should offer to end the activity the day displayed or the next day, the day displayed chosen, once the next day has begun', async () => {
    await whenOpening();

    expect(texts('ajout-jour-fin')).toEqual(['Lundi 5', 'Mardi 6']);
    expect(pressed('ajout-jour-fin')).toEqual(['true', 'false']);
  });

  it('should offer no day of the end while the next day has not begun', async () => {
    givenTheClockAt(new Date(2026, 9, 5, 20, 0));
    await whenOpening(lundi(), instantLocal(5, 20));

    expect(all('ajout-jour-fin')).toEqual([]);
  });

  it('should show each day touched by an addition ending the next day, the next day with its portion only', async () => {
    await whenOpening();
    await whenChoosingTheDayOfTheEnd('Mardi 6');

    await whenTyping('22:00', '03:30');

    expect(pressed('ajout-jour-fin')).toEqual(['false', 'true']);
    expect(text('ajout-duree')).toBe('5 h 30');
    expect(texts('ajout-effet-libelle')).toEqual(['Opérationnel du lundi 5', 'Opérationnel du mardi 6']);
    expect(texts('ajout-effet-valeur')).toEqual(['4 h 45 → 6 h 45', '+ 3 h 30']);
  });

  it('should end the activity the day displayed again when that day is chosen back', async () => {
    await whenOpening();
    await whenChoosingTheDayOfTheEnd('Mardi 6');

    await whenChoosingTheDayOfTheEnd('Lundi 5');

    expect(pressed('ajout-jour-fin')).toEqual(['true', 'false']);
  });

  it('should explain an end preceding the start on the same day and propose to end the next day, without applying it', async () => {
    await whenOpening();

    await whenTyping('22:00', '03:30');

    expect(text('ajout-erreur')).toBe('La fin, 03:30, précède le début, 22:00, sur la même journée.');
    expect(texts('ajout-proposition')).toEqual(['Finir le mardi 6 à 03:30']);
    expect(pressed('ajout-jour-fin')).toEqual(['true', 'false']);
    expect(corrections.ajouts).toEqual([]);
  });

  it('should end the next day when the proposal is applied: the error goes, the hours stay, nothing is sent', async () => {
    await whenOpening();
    await whenTyping('22:00', '03:30');

    await whenApplyingTheProposal();

    expect(text('ajout-erreur')).toBe('');
    expect(all('ajout-proposition')).toEqual([]);
    expect(pressed('ajout-jour-fin')).toEqual(['false', 'true']);
    expect(values()).toEqual(['22:00', '03:30']);
    expect(corrections.ajouts).toEqual([]);
  });

  it('should explain the end preceding the start without proposing anything when the element is closed before the next day end', async () => {
    await whenOpening(lundiAvecUnElementClotureLeMardi());
    await whenOpeningTheElements();
    await whenChoosingTheElement('OF 24-131 · Pièce 1');

    await whenTyping('22:00', '03:30');

    expect(text('ajout-erreur')).toBe('La fin, 03:30, précède le début, 22:00, sur la même journée.');
    expect(all('ajout-proposition')).toEqual([]);
  });

  it('should propose nothing while the next day has not begun', async () => {
    givenTheClockAt(new Date(2026, 9, 5, 23, 0));
    await whenOpening(lundi(), instantLocal(5, 23));

    await whenTyping('22:00', '03:30');

    expect(text('ajout-erreur')).toBe('La fin, 03:30, précède le début, 22:00, sur la même journée.');
    expect(all('ajout-proposition')).toEqual([]);
  });

  it('should tell the end must fall on the next day when the workshop zone puts it elsewhere', async () => {
    await whenOpening(lundiDeLAtelierDeParis());
    await whenChoosingTheDayOfTheEnd('Mardi 6');

    await whenTyping('18:00', '22:00');

    expect(text('ajout-erreur')).toBe('La fin doit tomber le mardi 6.');
  });

  it('should send the activity ending the next day and give the portion of each day to be announced', async () => {
    await whenOpening();
    await whenOpeningTheElements();
    await whenChoosingTheElement('OF 24-131 · Pièce 1');
    await whenChoosingTheDayOfTheEnd('Mardi 6');
    await whenTyping('22:00', '03:30');

    await whenAdding();

    expect(corrections.ajouts.map(saisie => [saisie.debut, saisie.fin])).toEqual([[instantLocal(5, 22), instantLocal(6, 3, 30)]]);
    expect(corrigees).toEqual(['ENREGISTREE']);
    expect(portionsAjoutees).toEqual([
      [
        { jour: '2026-10-05', duree: new Duree('PT2H') },
        { jour: '2026-10-06', duree: new Duree('PT3H30M') },
      ],
    ]);
  });

  const journeeSurMesure = (bornes: BornesDuJour, suivis: readonly SuiviPresent[]): JourneeACorriger =>
    new JourneeACorriger({
      operateur: new OperateurDeLaJournee(new OperateurDeLaJourneeId('op-1'), 'Leroy', 'Hugo'),
      jour: new JourACorriger('2026-10-05'),
      bornes,
      dureeOperationnelle: new Duree('PT4H45M'),
      activites: [],
      choix: new ChoixDAjout({ suivis: new SuivisPresents(suivis), postes: [tourFixture, fraiseuseFixture] }),
    });

  const bornesDuLundi = (fuseau: string): BornesDuJour =>
    new BornesDuJour({
      debut: new InstantDeLaJournee(`2026-10-05T00:00:00${fuseau}`),
      fin: new InstantDeLaJournee(`2026-10-06T00:00:00${fuseau}`),
      finDuLendemain: new InstantDeLaJournee(`2026-10-07T00:00:00${fuseau}`),
    });

  const suiviPresent = (element: ElementDeLaJournee, engageLe: InstantDeLaJournee, suivi = 'suivi-1'): SuiviPresent =>
    new SuiviPresent({ suivi: new SuiviDAtelierId(suivi), element, engageLe, clotureLe: undefined });

  const lundiAvecUnElementSansDesignation = (): JourneeACorriger =>
    journeeSurMesure(bornesDuLundi('-03:00'), [
      suiviPresent(
        new ElementDeLaJournee({
          id: new ElementDeLaJourneeId('element-9'),
          categorie: new CategorieDElement('OF'),
          nom: 'PRD-2026-000009',
          reference: '24-139',
          description: undefined,
        }),
        instantLocal(1, 8),
      ),
    ]);

  const lundiAvecUnElementEngageLeJour = (): JourneeACorriger =>
    journeeSurMesure(bornesDuLundi('-03:00'), [suiviPresent(elementFixture('1'), instantLocal(5, 14))]);

  const lundiDeLAtelierDeParis = (): JourneeACorriger => journeeSurMesure(bornesDuLundi('+02:00'), []);

  const givenTheClockAt = (maintenant: Date): void => {
    vi.setSystemTime(maintenant);
  };

  const lundiSansSuivi = (): JourneeACorriger => journeeFixture({ jour: 5, suivis: [], activites: [], postes: [tourFixture] });

  const portionsAnnoncees = (corrige: AjoutCorrige): { jour: string; duree: Duree }[] =>
    corrige.issue === 'JOURNEE_CHANGEE'
      ? []
      : [corrige.portions.duJourAffiche, ...(corrige.portions.duLendemain === undefined ? [] : [corrige.portions.duLendemain])].map(
          portion => ({ jour: portion.jour.value, duree: portion.duree }),
        );

  const whenOpening = async (journee: JourneeACorriger = lundi(), ouvertA: InstantDeLaJournee = instantLocal(6, 10)): Promise<void> => {
    shown = TestBed.createComponent(PanneauDAjout);
    shown.componentRef.setInput('journee', journee);
    shown.componentRef.setInput('ajout', AjoutEnPreparation.ouvrir(journee, ouvertA, calendrierDuNavigateur));
    shown.componentInstance.corrigee.subscribe(corrige => {
      corrigees.push(corrige.issue);
      portionsAjoutees.push(portionsAnnoncees(corrige));
    });
    shown.componentInstance.abandon.subscribe(() => {
      abandons += 1;
    });
    await shown.whenStable();
  };

  const whenOpeningReady = async (): Promise<void> => {
    await whenOpening();
    await whenOpeningTheElements();
    await whenChoosingTheElement('OF 24-131 · Pièce 1');
    await whenTyping('08:00', '10:30');
  };

  const whenTheDayIsReadAgain = async (): Promise<void> => {
    shown.componentRef.setInput('journee', lundi());
    await shown.whenStable();
  };

  const whenTheDayIsReadAgainWithoutTheElement = async (): Promise<void> => {
    shown.componentRef.setInput(
      'journee',
      journeeSurMesure(bornesDuLundi('-03:00'), [suiviPresent(elementFixture('9'), instantLocal(1, 8), 'suivi-9')]),
    );
    await shown.whenStable();
  };

  const whenOpeningTheElements = async (): Promise<void> => {
    requiredFixture(all('ajout-element')[0], 'ajout-element').click();
    await shown.whenStable();
  };

  const whenSearchingElements = async (recherche: string): Promise<void> => {
    const champ = requiredFixture(
      document.querySelector<HTMLInputElement>(dataSelector('ajout-element-recherche')),
      'ajout-element-recherche',
    );
    champ.value = recherche;
    champ.dispatchEvent(new Event('input'));
    await shown.whenStable();
  };

  const whenChoosingTheElement = async (libelle: string): Promise<void> => {
    const choix = [...document.querySelectorAll<HTMLElement>(dataSelector('ajout-element-proposition'))].find(
      proposition => proposition.textContent.trim() === libelle,
    );
    requiredFixture(choix, libelle).click();
    await shown.whenStable();
  };

  const whenChoosingTheWorkstation = async (poste: string): Promise<void> => {
    const champ = requiredFixture(all('ajout-poste')[0], 'ajout-poste') as HTMLSelectElement;
    champ.value = poste;
    champ.dispatchEvent(new Event('change'));
    await shown.whenStable();
  };

  const whenChoosingTheType = async (libelle: string): Promise<void> => {
    const bouton = all('ajout-type').find(candidat => candidat.textContent.trim() === libelle);
    requiredFixture(bouton, libelle).click();
    await shown.whenStable();
  };

  const whenTyping = async (debut: string, fin: string): Promise<void> => {
    whenTypingIn('ajout-debut', debut);
    whenTypingIn('ajout-fin', fin);
    await shown.whenStable();
  };

  const whenTypingIn = (selector: string, valeur: string): void => {
    const champ = requiredFixture(all(selector)[0], selector) as HTMLInputElement;
    champ.value = valeur;
    champ.dispatchEvent(new Event('change'));
  };

  const whenAdding = async (): Promise<void> => {
    whenAddingWithoutWaiting();
    await new Promise(resolve => setTimeout(resolve));
    await shown.whenStable();
  };

  const whenChoosingTheDayOfTheEnd = async (libelle: string): Promise<void> => {
    const bouton = all('ajout-jour-fin').find(candidat => candidat.textContent.trim() === libelle);
    requiredFixture(bouton, libelle).click();
    await shown.whenStable();
  };

  const whenApplyingTheProposal = async (): Promise<void> => {
    requiredFixture(all('ajout-proposition')[0], 'ajout-proposition').click();
    await shown.whenStable();
  };

  const lundiAvecUnElementClotureLeMardi = (): JourneeACorriger =>
    journeeSurMesure(bornesDuLundi('-03:00'), [
      new SuiviPresent({
        suivi: new SuiviDAtelierId('suivi-1'),
        element: elementFixture('1'),
        engageLe: instantLocal(1, 8),
        clotureLe: instantLocal(6, 2),
      }),
    ]);

  const whenAddingWithoutWaiting = (): void => {
    requiredFixture(all('ajout-ajouter')[0], 'ajout-ajouter').click();
  };

  const whenAbandoning = (): void => {
    requiredFixture(all('ajout-abandonner')[0], 'ajout-abandonner').click();
  };

  const all = (selector: string): HTMLElement[] => [
    ...(shown.nativeElement as HTMLElement).querySelectorAll<HTMLElement>(dataSelector(selector)),
  ];
  const text = (selector: string): string => all(selector)[0]?.textContent.replace(/\s+/g, ' ').trim() ?? '';
  const texts = (selector: string): string[] => all(selector).map(element => element.textContent.replace(/\s+/g, ' ').trim());
  const documentTexts = (selector: string): string[] =>
    [...document.querySelectorAll(dataSelector(selector))].map(element => element.textContent.replace(/\s+/g, ' ').trim());
  const elementChoices = (): string[] => documentTexts('ajout-element-proposition');
  const pressed = (selector: string): (string | null)[] => all(selector).map(element => element.getAttribute('aria-pressed'));
  const invalids = (): (string | null)[] =>
    ['ajout-debut', 'ajout-fin'].map(selector => all(selector)[0]?.getAttribute('aria-invalid') ?? null);
  const values = (): string[] => ['ajout-debut', 'ajout-fin'].map(selector => (all(selector)[0] as HTMLInputElement).value);
  const disabled = (selector: string): boolean[] => all(selector).map(bouton => (bouton as HTMLButtonElement).disabled);
  const chosenWorkstation = (): string => (requiredFixture(all('ajout-poste')[0], 'ajout-poste') as HTMLSelectElement).value;
  const optionTexts = (): string[] =>
    [...(shown.nativeElement as HTMLElement).querySelectorAll('option')].map(option => option.textContent.trim());
});
