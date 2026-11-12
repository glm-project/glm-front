import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { ComponentFixture, ComponentFixtureAutoDetect, TestBed } from '@angular/core/testing';
import { ErrorHandlerFixture } from '@test/unit/fixtures/ErrorHandlerFixture';
import { CorrectionsFixture } from '@test/unit/fixtures/gestion/correction-des-activites/CorrectionsFixture';
import { DossierDeLaFinFixture } from '@test/unit/fixtures/gestion/correction-des-activites/DossierDeLaFinFixture';
import {
  ActiviteSemee,
  activiteTerminee,
  elementFixture,
  instantLocal,
  journeeFixture,
  terminee,
  tourFixture,
} from '@test/unit/fixtures/gestion/correction-des-activites/JourneeACorrigerFixture';
import { ResizeObserverFixture } from '@test/unit/fixtures/gestion/correction-des-activites/ResizeObserverFixture';
import { dataSelector } from '@test/utils/DataSelector';
import { requiredFixture } from '@test/utils/RequiredFixture';
import { CorrectionDUneActivite, IssueDeCorrection } from '../../../application/CorrectionDUneActivite';
import { CorrectionsPort } from '../../../domain/correction/CorrectionsPort';
import { DossierDeLaFin } from '../../../domain/fin-automatique/DossierDeLaFin';
import { DossierDeLaFinPort } from '../../../domain/fin-automatique/DossierDeLaFinPort';
import { PointageDuDossierId } from '../../../domain/fin-automatique/PointageDuDossierId';
import { ActiviteDeLaJourneeId } from '../../../domain/journee/ActiviteDeLaJourneeId';
import { PanneauDeRegularisation } from './PanneauDeRegularisation';

const soirOublie: ActiviteSemee = {
  id: 'soir',
  suivi: 'suivi-1',
  poste: tourFixture,
  debut: instantLocal(5, 18, 30),
  etat: terminee(instantLocal(5, 22, 30), 'PT4H', 'TERMINEE_AUTOMATIQUEMENT'),
};

const dossierDuSoir = (): DossierDeLaFin => ({
  journal: [{ id: new PointageDuDossierId('soir'), fait: { type: 'DEBUT', instant: instantLocal(5, 18, 30).value.toISOString() } }],
  activite: {
    id: new ActiviteDeLaJourneeId('soir'),
    ouvrant: new PointageDuDossierId('soir'),
    categorie: 'TRAVAIL',
    debut: instantLocal(5, 18, 30).value.toISOString(),
    echeance: instantLocal(5, 22, 30).value.toISOString(),
  },
  borneDeFin: instantLocal(5, 23).value.toISOString(),
});

describe('Panel to regularise the end of an automatic end', () => {
  let shown: ComponentFixture<PanneauDeRegularisation>;
  let dossiers: DossierDeLaFinFixture;
  let corrections: CorrectionsFixture;
  let errors: ErrorHandlerFixture;
  let corrigees: IssueDeCorrection[];
  let abandons: number;
  let resizeObserver: ResizeObserverFixture;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 6, 10, 0));
    resizeObserver = new ResizeObserverFixture();
    dossiers = new DossierDeLaFinFixture();
    corrections = new CorrectionsFixture();
    dossiers.semer(dossierDuSoir());
    errors = new ErrorHandlerFixture();
    corrigees = [];
    abandons = 0;
    TestBed.configureTestingModule({
      providers: [
        { provide: ComponentFixtureAutoDetect, useValue: true },
        { provide: DossierDeLaFinPort, useValue: dossiers },
        { provide: ErrorHandlerPort, useValue: errors },
        { provide: CorrectionsPort, useValue: corrections },
        CorrectionDUneActivite,
      ],
    });
  });

  afterEach(() => {
    corrections.liberer();
    vi.useRealTimers();
    resizeObserver.restore();
  });

  it('should recall the activity by its element, its designation and its hours', async () => {
    await whenOpening();

    expect(text('regularisation-titre')).toBe('Régulariser la fin');
    expect(text('regularisation-element')).toBe('OF 24-131');
    expect(text('regularisation-designation')).toBe('Pièce 1');
    expect(text('regularisation-horaires')).toBe('18:30 → 22:30');
  });

  it('should read the dossier of the activity on its follow-up', async () => {
    await whenOpening();

    expect(dossiers.lectures).toEqual([{ suivi: 'suivi-1', activite: 'soir' }]);
  });

  it('should say it is loading until the dossier is read', () => {
    whenOpeningWithoutWaiting();

    expect(text('regularisation-chargement')).toBe('Chargement de l’activité…');
    expect(drawnHandles()).toEqual([]);
  });

  it('should draw the frise with a handle that has no hour yet, and explain how to place it', async () => {
    await whenOpening();

    expect(timeOfTheHandle()).toBe('Aucune heure posée');
    expect(text('regularisation-aide')).toBe('Tirez le bout de la barre ou cliquez dessus pour placer la fin réelle.');
  });

  it('should place the handle on the automatic end at the first key, then move it by the minute', async () => {
    await whenOpening();

    await whenPressing('ArrowRight');
    const placee = timeOfTheHandle();
    await whenPressing('ArrowRight');

    expect([placee, timeOfTheHandle()]).toEqual(['22:30', '22:31']);
  });

  it('should not move the handle beyond the start of the next activity', async () => {
    await whenOpening();

    await whenPressing('End');

    expect(timeOfTheHandle()).toBe('23:00');
  });

  it('should place no hour when the next activity starts within the first minute of the activity', async () => {
    dossiers.semer({ ...dossierDuSoir(), borneDeFin: new Date(Date.parse(dossierDuSoir().activite.debut) + 30_000).toISOString() });
    await whenOpening();

    await whenPressing('ArrowRight');

    expect(timeOfTheHandle()).toBe('Aucune heure posée');
  });

  it('should tell the day changed when the activity has no automatic end anymore', async () => {
    dossiers.repondre({ kind: 'INTROUVABLE' });

    await whenOpening();

    expect(corrigees).toEqual(['JOURNEE_CHANGEE']);
  });

  it('should say the reading failed and read again on demand', async () => {
    dossiers.repondre(new Error('Réseau coupé'));
    await whenOpening();
    const erreur = text('regularisation-erreur');

    await whenRetrying();

    expect(erreur).toContain('Impossible de charger l’activité.');
    expect(dossiers.lectures).toHaveLength(2);
    expect(timeOfTheHandle()).toBe('Aucune heure posée');
  });

  it('should offer to validate the end only once an hour is placed, naming that hour', async () => {
    await whenOpening();
    const avant = [text('regularisation-valider'), disabledStates('regularisation-valider')];

    await whenPressing('ArrowRight');

    expect(avant).toEqual(['Valider la fin', [true]]);
    expect([text('regularisation-valider'), disabledStates('regularisation-valider')]).toEqual(['Valider la fin à 22:30', [false]]);
  });

  it('should send the end placed for the activity and tell the day must be reread', async () => {
    await whenOpening();
    await whenPressing('ArrowRight');

    await whenValidating();

    expect(corrections.regularisations.map(saisie => [saisie.activite.value, Date.parse(saisie.dateDeSurvenue)])).toEqual([
      ['soir', instantLocal(5, 22, 30).value.getTime()],
    ]);
    expect(corrigees).toEqual(['ENREGISTREE']);
  });

  it('should tell the day changed when the server says so on the validation', async () => {
    corrections.repondreALaRegularisation({ kind: 'JOURNEE_CHANGEE' });
    await whenOpening();
    await whenPressing('ArrowRight');

    await whenValidating();

    expect(corrigees).toEqual(['JOURNEE_CHANGEE']);
  });

  it.each([
    { motif: 'FIN_AVANT_LE_DEBUT', message: 'La fin doit suivre le début de l’activité.' },
    { motif: 'FIN_APRES_LA_BORNE', message: 'La fin dépasse le démarrage suivant ou la clôture de l’élément.' },
    {
      motif: 'FIN_FUTURE',
      message: 'La fin dépasse l’heure du serveur. Choisissez une heure plus tôt ou réessayez dans un instant.',
    },
  ] as const)('should explain the refusal $motif under the buttons and keep the end placed', async ({ motif, message }) => {
    corrections.repondreALaRegularisation({ kind: 'REFUS', motif });
    await whenOpening();
    await whenPressing('ArrowRight');

    await whenValidating();

    expect(text('regularisation-refus')).toBe(message);
    expect(corrigees).toEqual([]);
    expect(timeOfTheHandle()).toBe('22:30');
  });

  it('should say the end failed and keep it after a technical failure', async () => {
    corrections.repondreALaRegularisation(new Error('Réseau coupé'));
    await whenOpening();
    await whenPressing('ArrowRight');

    await whenValidating();

    expect(text('regularisation-echec')).toBe('La fin n’a pas pu être enregistrée. Vérifiez la connexion puis réessayez.');
    expect(corrigees).toEqual([]);
  });

  it('should show the end being sent and forbid validating or abandoning meanwhile', async () => {
    const arrivee = corrections.retenir();
    await whenOpening();
    await whenPressing('ArrowRight');

    whenValidatingWithoutWaiting();
    await arrivee;
    await shown.whenStable();

    expect(text('regularisation-valider')).toBe('Enregistrement…');
    expect(disabledStates('regularisation-valider')).toEqual([true]);
    expect(disabledStates('regularisation-abandonner')).toEqual([true]);
  });

  it('should forget its entry when it is closed without an outcome, so that the same end sent later is a new command', async () => {
    corrections.repondreALaRegularisation({ kind: 'REFUS', motif: 'FIN_APRES_LA_BORNE' });
    await whenOpening();
    await whenPressing('ArrowRight');
    await whenValidating();
    shown.destroy();
    await whenOpening();
    await whenPressing('ArrowRight');

    await whenValidating();

    expect(new Set(corrections.regularisations.map(saisie => saisie.id)).size).toBe(2);
  });

  it('should move the focus to the abandon button when it opens', async () => {
    await whenOpening();

    expect(focusedSelector()).toBe('regularisation-abandonner');
  });

  it('should abandon without reading anything more', async () => {
    await whenOpening();

    whenAbandoning();

    expect(abandons).toBe(1);
    expect(dossiers.lectures).toHaveLength(1);
  });

  const whenOpeningWithoutWaiting = (): void => {
    const journee = journeeFixture({ jour: 5, suivis: [{ suivi: 'suivi-1', element: elementFixture('1') }], activites: [soirOublie] });
    shown = TestBed.createComponent(PanneauDeRegularisation);
    shown.componentRef.setInput('activite', activiteTerminee(journee, 'soir'));
    shown.componentInstance.corrigee.subscribe(issue => corrigees.push(issue));
    shown.componentInstance.abandon.subscribe(() => {
      abandons += 1;
    });
    shown.detectChanges();
  };

  const whenOpening = async (): Promise<void> => {
    whenOpeningWithoutWaiting();
    await settled();
  };

  const whenPressing = async (key: string): Promise<void> => {
    handle().dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    await shown.whenStable();
  };

  const whenRetrying = async (): Promise<void> => {
    requiredFixture(all('regularisation-retry')[0], 'regularisation-retry').click();
    await settled();
  };

  const whenValidatingWithoutWaiting = (): void => {
    requiredFixture(all('regularisation-valider')[0], 'regularisation-valider').click();
  };

  const whenValidating = async (): Promise<void> => {
    whenValidatingWithoutWaiting();
    await settled();
  };

  const whenAbandoning = (): void => {
    requiredFixture(all('regularisation-abandonner')[0], 'regularisation-abandonner').click();
  };

  const settled = async (): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve));
    await shown.whenStable();
  };

  const all = (selector: string): HTMLElement[] => [
    ...(shown.nativeElement as HTMLElement).querySelectorAll<HTMLElement>(dataSelector(selector)),
  ];
  const text = (selector: string): string => all(selector)[0]?.textContent.replace(/\s+/g, ' ').trim() ?? '';
  const handle = (): HTMLElement => requiredFixture(all('regularisation-poignee')[0], 'regularisation-poignee');
  const disabledStates = (selector: string): boolean[] => all(selector).map(element => (element as HTMLButtonElement).disabled);
  const drawnHandles = (): HTMLElement[] => all('regularisation-poignee');
  const timeOfTheHandle = (): string | null => handle().getAttribute('aria-valuetext');
  const focusedSelector = (): string | undefined => (document.activeElement as HTMLElement | null)?.dataset['selector'];
});
