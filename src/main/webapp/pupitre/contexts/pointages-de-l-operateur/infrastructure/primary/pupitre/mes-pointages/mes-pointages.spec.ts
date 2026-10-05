import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  PointagesDeLOperateurFixture,
  semaineFixture,
} from '@test/unit/fixtures/pupitre/pointages-de-l-operateur/PointagesDeLOperateurFixture';
import { dataSelector } from '@test/utils/DataSelector';
import { DemandeDePointages } from '../../../../domain/DemandeDePointages';
import { OperateurId } from '../../../../domain/OperateurId';
import { PointagesDeLOperateurPort } from '../../../../domain/PointagesDeLOperateurPort';
import { SemaineISO } from '../../../../domain/semaine/SemaineISO';
import { MesPointages } from './mes-pointages';

const SEMAINE_EN_COURS = new SemaineISO(2026, 41);

describe('Mes pointages screen', () => {
  let fixture: ComponentFixture<MesPointages>;
  let port: PointagesDeLOperateurFixture;
  let retours: number;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 8, 14, 20));
    port = new PointagesDeLOperateurFixture();
    TestBed.configureTestingModule({ providers: [{ provide: PointagesDeLOperateurPort, useValue: port }] });
    retours = 0;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should ask to return to the pointage screen', async () => {
    await whenShowingMyPointages();

    whenReturningToPointage();

    thenTheReturnIsRequestedOnce();
  });

  it('should read the current week of the designated operator', async () => {
    await whenShowingMyPointages();

    thenTheRequestedWeeksAre([new DemandeDePointages(new OperateurId('jean'), SEMAINE_EN_COURS)]);
  });

  it('should show the week, its server total and its clocked days with their totals', async () => {
    givenTheCurrentWeek(
      semaineFixture(SEMAINE_EN_COURS, { 0: { total: 'PT7H45M', pointages: 2 }, 3: { total: 'PT4H53M', pointages: 3 } }, 'PT12H38M'),
    );

    await whenShowingMyPointages();

    thenTextOf('semaine', ['Semaine 41 · cette semaine', '5 oct. – 11 oct. 2026', 'Total de la semaine', '12 h 38']);
    thenClockedDaysAre([
      ['jour-2026-10-05', 'Lun. 5 oct.', '7 h 45'],
      ['jour-2026-10-08', 'Jeu. 8 oct. · aujourd’hui', '4 h 53'],
    ]);
  });

  it('should show an incomplete week total without any figure', async () => {
    givenTheCurrentWeek(semaineFixture(SEMAINE_EN_COURS, { 0: { total: false, pointages: 1 } }, false));

    await whenShowingMyPointages();

    thenTextOf('total-semaine', ['—']);
    thenClockedDaysAre([['jour-2026-10-05', 'Lun. 5 oct.', '—']]);
  });

  const givenTheCurrentWeek = (pointages: ReturnType<typeof semaineFixture>): void => {
    port.seed(new DemandeDePointages(new OperateurId('jean'), SEMAINE_EN_COURS), pointages);
  };
  const whenShowingMyPointages = async (): Promise<void> => {
    fixture = TestBed.createComponent(MesPointages);
    fixture.componentRef.setInput('operateur', 'jean');
    fixture.componentInstance.retourRequested.subscribe(() => (retours += 1));
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise(resolve => setTimeout(resolve));
    await fixture.whenStable();
    fixture.detectChanges();
  };
  const whenReturningToPointage = (): void => {
    element('retour-au-pointage').click();
  };
  const thenTheReturnIsRequestedOnce = (): void => {
    expect(retours).toBe(1);
  };
  const thenTheRequestedWeeksAre = (expected: readonly DemandeDePointages[]): void => {
    expect(port.demandes).toEqual(expected);
  };
  const thenTextOf = (selector: string, expected: readonly string[]): void => {
    const text = normalized(element(selector).textContent);
    for (const part of expected) expect(text).toContain(part);
  };
  const thenClockedDaysAre = (expected: readonly (readonly [string, string, string])[]): void => {
    const jours = Array.from(element('jours-pointes').children);
    expect(
      jours.map(jour => [
        jour.getAttribute('data-selector'),
        normalized(jour.firstElementChild?.textContent ?? ''),
        normalized(jour.lastElementChild?.textContent ?? ''),
      ]),
    ).toEqual(expected);
  };
  const element = (selector: string): HTMLElement => {
    const selected = root().querySelector<HTMLElement>(dataSelector(selector));
    if (selected === null) throw new Error(`Missing ${selector} fixture.`);
    return selected;
  };
  const normalized = (text: string): string => text.replace(/\s+/g, ' ').trim();
  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
});
