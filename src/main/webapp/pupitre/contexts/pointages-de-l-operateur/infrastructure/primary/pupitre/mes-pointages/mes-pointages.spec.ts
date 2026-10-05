import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  ligneFixture,
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
const LUNDI = ligneFixture({ element: '1240', poste: 'Fraiseuse', debut: new Date(2026, 9, 5, 7), fin: new Date(2026, 9, 5, 14, 45) });
const JEUDI = [
  ligneFixture({ element: '1243', poste: 'Fraiseuse', debut: new Date(2026, 9, 8, 7, 2), fin: new Date(2026, 9, 8, 9, 40) }),
  ligneFixture({
    element: '1243',
    poste: 'Fraiseuse',
    categorie: 'NON_CONFORMITE',
    debut: new Date(2026, 9, 8, 9, 40),
    fin: new Date(2026, 9, 8, 10, 15),
  }),
  ligneFixture({ element: '1250', debut: new Date(2026, 9, 8, 12, 45) }),
];
const semaineEnCoursFixture = (): ReturnType<typeof semaineFixture> =>
  semaineFixture(SEMAINE_EN_COURS, { 0: { total: 'PT7H45M', lignes: [LUNDI] }, 3: { total: 'PT3H13M', lignes: JEUDI } }, 'PT10H58M');

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
    givenTheCurrentWeek(semaineEnCoursFixture());

    await whenShowingMyPointages();

    thenTextOf('semaine', ['Semaine 41 · cette semaine', '5 oct. – 11 oct. 2026', 'Total de la semaine', '10 h 58']);
    thenClockedDaysAre([
      ['jour-2026-10-05', 'Lun. 5 oct.', '7 h 45'],
      ['jour-2026-10-08', 'Jeu. 8 oct. · aujourd’hui', '3 h 13'],
    ]);
  });

  it('should show an incomplete week total without any figure', async () => {
    givenTheCurrentWeek(semaineFixture(SEMAINE_EN_COURS, { 0: { total: false, lignes: [LUNDI] } }, false));

    await whenShowingMyPointages();

    thenTextOf('total-semaine', ['—']);
    thenClockedDaysAre([['jour-2026-10-05', 'Lun. 5 oct.', '—']]);
  });

  it('should detail today by default, with its server total and each clocked portion', async () => {
    givenTheCurrentWeek(semaineEnCoursFixture());

    await whenShowingMyPointages();

    thenTextOf('jour-titre', ['Aujourd’hui — jeudi 8 octobre']);
    thenTextOf('total-jour-affiche', ['3 h 13']);
    thenLinesAre([
      ['1243', 'Fraiseuse', '07:02 → 09:40', '2 h 38'],
      ['1243', 'Fraiseuse NC', '09:40 → 10:15', '0 h 35'],
      ['1250', '', '12:45 → …', ''],
    ]);
  });

  it('should detail the clocked day chosen in the week', async () => {
    givenTheCurrentWeek(semaineEnCoursFixture());
    await whenShowingMyPointages();

    whenChoosingDay('jour-2026-10-05');

    thenTextOf('jour-titre', ['Lundi 5 octobre 2026']);
    thenLinesAre([['1240', 'Fraiseuse', '07:00 → 14:45', '7 h 45']]);
    thenChosenDayIs('jour-2026-10-05');
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
  const whenChoosingDay = (selector: string): void => {
    element(selector).click();
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
    const jours = Array.from(element('jours-pointes').querySelectorAll('button'));
    expect(
      jours.map(jour => [
        jour.getAttribute('data-selector'),
        normalized(jour.firstElementChild?.textContent ?? ''),
        normalized(jour.lastElementChild?.textContent ?? ''),
      ]),
    ).toEqual(expected);
  };
  const thenLinesAre = (expected: readonly (readonly string[])[]): void => {
    const lignes = Array.from(element('lignes').children);
    expect(lignes.map(ligne => Array.from(ligne.children).map(colonne => normalized(colonne.textContent)))).toEqual(expected);
  };
  const thenChosenDayIs = (selector: string): void => {
    const choisis = Array.from(element('jours-pointes').querySelectorAll('[aria-pressed="true"]'));
    expect(choisis.map(choisi => choisi.getAttribute('data-selector'))).toEqual([selector]);
  };
  const element = (selector: string): HTMLElement => {
    const selected = root().querySelector<HTMLElement>(dataSelector(selector));
    if (selected === null) throw new Error(`Missing ${selector} fixture.`);
    return selected;
  };
  const normalized = (text: string): string => text.replace(/\s+/g, ' ').trim();
  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
});
