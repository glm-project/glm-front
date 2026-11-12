import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { ComponentFixture, ComponentFixtureAutoDetect, TestBed } from '@angular/core/testing';
import { ErrorHandlerFixture } from '@test/unit/fixtures/ErrorHandlerFixture';
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
import { IssueDeCorrection } from '../../../application/CorrectionDUneActivite';
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
  let errors: ErrorHandlerFixture;
  let corrigees: IssueDeCorrection[];
  let abandons: number;
  let resizeObserver: ResizeObserverFixture;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 6, 10, 0));
    resizeObserver = new ResizeObserverFixture();
    dossiers = new DossierDeLaFinFixture();
    dossiers.semer(dossierDuSoir());
    errors = new ErrorHandlerFixture();
    corrigees = [];
    abandons = 0;
    TestBed.configureTestingModule({
      providers: [
        { provide: ComponentFixtureAutoDetect, useValue: true },
        { provide: DossierDeLaFinPort, useValue: dossiers },
        { provide: ErrorHandlerPort, useValue: errors },
      ],
    });
  });

  afterEach(() => {
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
  const drawnHandles = (): HTMLElement[] => all('regularisation-poignee');
  const timeOfTheHandle = (): string | null => handle().getAttribute('aria-valuetext');
  const focusedSelector = (): string | undefined => (document.activeElement as HTMLElement | null)?.dataset['selector'];
});
