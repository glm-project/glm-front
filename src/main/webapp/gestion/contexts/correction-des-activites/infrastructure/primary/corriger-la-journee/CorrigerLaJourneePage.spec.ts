import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { ComponentFixture, ComponentFixtureAutoDetect, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, convertToParamMap, ParamMap, Router } from '@angular/router';
import { ErrorHandlerFixture } from '@test/unit/fixtures/ErrorHandlerFixture';
import { CorrectionsFixture } from '@test/unit/fixtures/gestion/correction-des-activites/CorrectionsFixture';
import {
  elementFixture,
  instantLocal,
  JourneeACorrigerFixture,
  journeeFixture,
  terminee,
  tourFixture,
} from '@test/unit/fixtures/gestion/correction-des-activites/JourneeACorrigerFixture';
import { dataSelector } from '@test/utils/DataSelector';
import { BehaviorSubject, EMPTY, firstValueFrom } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CorrectionsPort } from '../../../domain/correction/CorrectionsPort';
import { JourneeACorrigerPort } from '../../../domain/journee/JourneeACorrigerPort';
import { CorrigerLaJourneePage } from './CorrigerLaJourneePage';

class RouteFixture {
  readonly paramMap = new BehaviorSubject<ParamMap>(convertToParamMap({ operateur: 'op-1', jour: '2026-10-05' }));

  ouvre(parametres: Record<string, string>): void {
    this.paramMap.next(convertToParamMap(parametres));
  }
}

interface ArbreFixture {
  readonly commandes: readonly unknown[];
  readonly queryParams: Record<string, string>;
}

class RouterFixture {
  readonly events = EMPTY;
  readonly navigations: { commandes: readonly unknown[]; extras: unknown }[] = [];

  createUrlTree(commandes: readonly unknown[], extras?: { queryParams?: Record<string, string> }): ArbreFixture {
    return { commandes, queryParams: extras?.queryParams ?? {} };
  }

  serializeUrl(arbre: ArbreFixture): string {
    const chemin = arbre.commandes.join('/');
    const parametres = new URLSearchParams(arbre.queryParams).toString();
    return parametres === '' ? chemin : `${chemin}?${parametres}`;
  }

  navigate(commandes: readonly unknown[], extras?: unknown): Promise<boolean> {
    this.navigations.push({ commandes, extras });
    return Promise.resolve(true);
  }
}

const SUIVIS = [{ suivi: 'suivi-1', element: elementFixture('1') }];

const lundi = journeeFixture({
  jour: 5,
  suivis: SUIVIS,
  operationnelle: 'PT3H15M',
  activites: [
    {
      id: 'soir',
      suivi: 'suivi-1',
      poste: tourFixture,
      debut: instantLocal(5, 18, 30),
      etat: terminee(instantLocal(5, 21, 45), 'PT3H15M'),
    },
  ],
});

const mardi = journeeFixture({ jour: 6, suivis: SUIVIS, operationnelle: 'PT0S', activites: [] });

describe('Page to correct the day of an operator', () => {
  let port: JourneeACorrigerFixture;
  let corrections: CorrectionsFixture;
  let route: RouteFixture;
  let router: RouterFixture;
  let shown: ComponentFixture<CorrigerLaJourneePage>;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 6, 10, 0));
    port = new JourneeACorrigerFixture();
    corrections = new CorrectionsFixture();
    port.journees.set('2026-10-05', lundi);
    port.journees.set('2026-10-06', mardi);
    route = new RouteFixture();
    router = new RouterFixture();
    TestBed.configureTestingModule({
      providers: [
        { provide: ComponentFixtureAutoDetect, useValue: true },
        { provide: JourneeACorrigerPort, useValue: port },
        { provide: CorrectionsPort, useValue: corrections },
        { provide: ActivatedRoute, useValue: route },
        { provide: Router, useValue: router },
        { provide: ErrorHandlerPort, useClass: ErrorHandlerFixture },
      ],
    });
  });

  afterEach(async () => {
    const dialogs = TestBed.inject(MatDialog);
    const fermeture = firstValueFrom(dialogs.afterAllClosed);
    dialogs.closeAll();
    await fermeture;
    shown.destroy();
    vi.useRealTimers();
  });

  it('should show the day received: title, operator, day, operational duration, frise and activities', async () => {
    await whenOpeningThePage();

    expect(text('corriger-titre')).toBe('Corriger la journée');
    expect(text('corriger-identite')).toBe('Hugo LEROY');
    expect(text('corriger-jour')).toBe('lundi 5 octobre 2026');
    expect(text('frise-operationnel')).toBe('Opérationnel : 3 h 15');
    expect(texts('activite-horaires')).toEqual(['18:30 → 21:45']);
  });

  it('should read the day the address names for the operator it names', async () => {
    await whenOpeningThePage();

    expect(port.lectures).toEqual([{ operateur: 'op-1', jour: '2026-10-05' }]);
  });

  it('should say the operator is unknown without showing any day', async () => {
    port.operateurInconnu = true;

    await whenOpeningThePage();

    expect(text('corriger-introuvable')).toBe('Opérateur introuvable');
    expect(texts('frise-operationnel')).toEqual([]);
    expect(texts('corriger-identite')).toEqual([]);
  });

  it('should say the day could not be read after a read failure', async () => {
    port.echec = new Error('lecture impossible');

    await whenOpeningThePage();

    expect(text('corriger-erreur')).toContain('Impossible de charger la journée');
  });

  it('should show the day once a retry succeeds after a read failure', async () => {
    port.echec = new Error('lecture impossible');
    await whenOpeningThePage();

    await whenRetryingOnceTheServerRecovers();

    expect(text('corriger-identite')).toBe('Hugo LEROY');
    expect(port.lectures).toHaveLength(2);
  });

  it.each([
    { cas: 'malformed', jour: 'lundi' },
    { cas: 'not on the calendar', jour: '2026-02-30' },
    { cas: 'after today', jour: '2026-10-07' },
  ])('should send an address whose day is $cas back to the report of the operator', async ({ jour }) => {
    route.ouvre({ operateur: 'op-1', jour });

    await whenOpeningThePage();

    expect(router.navigations).toEqual([{ commandes: ['/operateurs', 'op-1', 'heures'], extras: { replaceUrl: true } }]);
    expect(port.lectures).toEqual([]);
    expect(texts('corriger-adresse-invalide')).toHaveLength(1);
  });

  it('should refuse an address that names no operator', async () => {
    route.ouvre({ jour: '2026-10-05' });

    await expect(whenOpeningThePage()).rejects.toThrow('La route de la journée à corriger ne nomme aucun opérateur.');
  });

  it('should lead back to the report of the operator on the day corrected', async () => {
    await whenOpeningThePage();

    expect(hrefs('corriger-retour')).toEqual(['/operateurs/op-1/heures?jour=2026-10-05']);
    expect(text('corriger-retour')).toBe('Temps opérationnel de Hugo LEROY');
  });

  it('should lead back to the report of the operator without a day when the address names none valid', async () => {
    route.ouvre({ operateur: 'op-1', jour: '2026-10-07' });

    await whenOpeningThePage();

    expect(hrefs('corriger-retour')).toEqual(['/operateurs/op-1/heures']);
    expect(text('corriger-retour')).toBe('Temps opérationnel');
  });

  it('should offer the previous and the next day by arrows named after the day they open', async () => {
    await whenOpeningThePage();

    expect(labels('corriger-precedent')).toEqual(['Voir le dimanche 4']);
    expect(hrefs('corriger-precedent')).toEqual(['/operateurs/op-1/journees/2026-10-04']);
    expect(labels('corriger-suivant')).toEqual(['Voir le mardi 6']);
    expect(hrefs('corriger-suivant')).toEqual(['/operateurs/op-1/journees/2026-10-06']);
  });

  it('should offer no next day after today', async () => {
    route.ouvre({ operateur: 'op-1', jour: '2026-10-06' });

    await whenOpeningThePage();

    expect(labels('corriger-precedent')).toEqual(['Voir le lundi 5']);
    expect(texts('corriger-suivant')).toEqual([]);
  });

  it('should read the day again when the address names another day', async () => {
    await whenOpeningThePage();

    await whenTheAddressNames('2026-10-06');

    expect(port.lectures.map(lecture => lecture.jour)).toEqual(['2026-10-05', '2026-10-06']);
    expect(text('corriger-jour')).toBe('mardi 6 octobre 2026');
  });

  it('should confirm before removing and send nothing when the manager keeps the activity', async () => {
    await whenOpeningThePage();

    await whenAskingToRemoveTheActivity();
    await whenKeepingTheActivity();

    expect(corrections.retraits).toEqual([]);
    expect(port.lectures).toHaveLength(1);
    expect(texts('corriger-annonce')).toEqual([]);
  });

  it('should read the day again and say the activity was removed once the removal is recorded', async () => {
    await whenOpeningThePage();

    await whenRemovingTheActivity();

    expect(corrections.retraits.map(saisie => saisie.activite.value)).toEqual(['soir']);
    expect(port.lectures).toHaveLength(2);
    expect(text('corriger-annonce')).toBe('Activité retirée');
  });

  it('should read the day again and ask to start over when the day changed meanwhile', async () => {
    corrections.repondre({ kind: 'JOURNEE_CHANGEE' });
    await whenOpeningThePage();

    await whenRemovingTheActivity();

    expect(port.lectures).toHaveLength(2);
    expect(text('corriger-annonce')).toBe('La journée a changé, recommencez');
  });

  it('should drop the message when the address names another day', async () => {
    await whenOpeningThePage();
    await whenRemovingTheActivity();

    await whenTheAddressNames('2026-10-06');

    expect(texts('corriger-annonce')).toEqual([]);
  });

  it('should move the focus to the message once the activity is removed', async () => {
    await whenOpeningThePage();

    await whenRemovingTheActivity();

    expect(document.activeElement).toBe(all('corriger-annonce')[0]);
  });

  it('should announce again a message identical to the previous one', async () => {
    await whenOpeningThePage();
    await whenRemovingTheActivity();
    const premiere = all('corriger-annonce')[0];

    await whenRemovingTheActivity();

    expect(all('corriger-annonce')).toHaveLength(1);
    expect(all('corriger-annonce')[0]).not.toBe(premiere);
    expect(text('corriger-annonce')).toBe('Activité retirée');
  });

  const whenAskingToRemoveTheActivity = async (): Promise<void> => {
    all('activite-retirer')[0]?.click();
    await shown.whenStable();
  };

  const whenKeepingTheActivity = async (): Promise<void> => {
    await whenClickingInTheDialog('retrait-cancel');
  };

  const whenRemovingTheActivity = async (): Promise<void> => {
    await whenAskingToRemoveTheActivity();
    await whenClickingInTheDialog('retrait-confirm');
  };

  const whenClickingInTheDialog = async (selector: string): Promise<void> => {
    const fermeture = firstValueFrom(TestBed.inject(MatDialog).afterAllClosed);
    document.querySelector<HTMLElement>(dataSelector(selector))?.click();
    await fermeture;
    await shown.whenStable();
  };

  const whenRetryingOnceTheServerRecovers = async (): Promise<void> => {
    port.echec = undefined;
    all('corriger-retry')[0]?.click();
    await shown.whenStable();
  };

  const whenTheAddressNames = async (jour: string): Promise<void> => {
    route.ouvre({ operateur: 'op-1', jour });
    await shown.whenStable();
  };

  const whenOpeningThePage = async (): Promise<void> => {
    shown = TestBed.createComponent(CorrigerLaJourneePage);
    await shown.whenStable();
  };

  const all = (selector: string): HTMLElement[] => [
    ...(shown.nativeElement as HTMLElement).querySelectorAll<HTMLElement>(dataSelector(selector)),
  ];
  const texts = (selector: string): string[] => all(selector).map(element => element.textContent.replace(/\s+/g, ' ').trim());
  const hrefs = (selector: string): (string | null)[] => all(selector).map(element => element.getAttribute('href'));
  const labels = (selector: string): (string | null)[] => all(selector).map(element => element.getAttribute('aria-label'));
  const text = (selector: string): string => texts(selector).join('|');
});
