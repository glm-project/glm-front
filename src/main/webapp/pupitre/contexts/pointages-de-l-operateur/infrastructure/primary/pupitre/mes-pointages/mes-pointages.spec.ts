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
const semaineMardiFixture = (): ReturnType<typeof semaineFixture> =>
  semaineFixture(new SemaineISO(2026, 40), {
    1: {
      total: 'PT7H50M',
      lignes: [ligneFixture({ element: '1231', debut: new Date(2026, 8, 29, 7), fin: new Date(2026, 8, 29, 14, 50) })],
    },
  });
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
      ['jour-2026-10-08', 'Jeu. 8 oct. · aujourd’hui', '3 h 13 + en cours'],
    ]);
  });

  it('should detail today by default, with its server total and each clocked portion', async () => {
    givenTheCurrentWeek(semaineEnCoursFixture());

    await whenShowingMyPointages();

    thenTextOf('jour-titre', ['Aujourd’hui — jeudi 8 octobre']);
    thenTextOf('total-jour-affiche', ['3 h 13']);
    thenLinesAre([
      ['1243', 'Fraiseuse', '07:02 → 09:40', '2 h 38'],
      ['1243', 'Fraiseuse NC', '09:40 → 10:15', '0 h 35'],
      ['1250', '', '12:45 → …', 'EN COURS'],
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

  it('should explain that an ongoing activity is counted once stopped', async () => {
    givenTheCurrentWeek(semaineEnCoursFixture());

    await whenShowingMyPointages();

    thenExplanationsAre(['1 activité en cours : comptée quand vous l’arrêterez.']);
    thenTextOf('note-semaine', ['+ en cours, pas encore compté']);
    thenClockedDaysAre([
      ['jour-2026-10-05', 'Lun. 5 oct.', '7 h 45'],
      ['jour-2026-10-08', 'Jeu. 8 oct. · aujourd’hui', '3 h 13 + en cours'],
    ]);
  });

  it('should count several ongoing activities in the explanation', async () => {
    givenTheCurrentWeek(
      semaineFixture(SEMAINE_EN_COURS, {
        3: {
          total: 'PT0S',
          lignes: [
            ligneFixture({ element: '1250', debut: new Date(2026, 9, 8, 12, 45) }),
            ligneFixture({ element: '1251', debut: new Date(2026, 9, 8, 12, 50) }),
          ],
        },
      }),
    );

    await whenShowingMyPointages();

    thenExplanationsAre(['2 activités en cours : comptées quand vous les arrêterez.']);
  });

  it('should count and flag a clocking ended automatically at its deadline', async () => {
    givenTheCurrentWeek(
      semaineFixture(
        SEMAINE_EN_COURS,
        {
          3: {
            total: 'PT13H',
            lignes: [
              ligneFixture({
                element: '1236',
                poste: 'Fraiseuse',
                debut: new Date(2026, 9, 8, 6),
                fin: new Date(2026, 9, 8, 19),
                automatique: true,
              }),
            ],
          },
        },
        'PT13H',
      ),
    );

    await whenShowingMyPointages();

    thenLinesAre([['1236', 'Fraiseuse', '06:00 → 19:00', '13 h 00 fin automatique']]);
    thenExplanationsAre(['Un pointage n’a pas été arrêté : il s’est terminé tout seul à son échéance. Signalez-le au responsable.']);
    thenClockedDaysAre([['jour-2026-10-08', 'Jeu. 8 oct. · aujourd’hui', '13 h 00 fin automatique']]);
  });

  it('should read and show the previous week when going back', async () => {
    await whenShowingMyPointages();

    await whenGoingTo('semaine-precedente');

    thenTheRequestedWeeksAre([
      new DemandeDePointages(new OperateurId('jean'), SEMAINE_EN_COURS),
      new DemandeDePointages(new OperateurId('jean'), new SemaineISO(2026, 40)),
    ]);
    thenTextOf('semaine-titre', ['Semaine 40']);
    thenTextOf('semaine-dates', ['28 sept. – 4 oct. 2026']);
    thenNavigationIs({ precedente: true, suivante: true, aujourdhui: true });
  });

  it('should keep the current week as the latest one', async () => {
    await whenShowingMyPointages();

    thenNavigationIs({ precedente: true, suivante: false, aujourdhui: false });
  });

  it('should stop going back one year before the current week', async () => {
    await whenShowingMyPointages();

    await whenGoingBackWeeks(52);

    thenTextOf('semaine-titre', ['Semaine 41']);
    thenTextOf('semaine-dates', ['6 oct. – 12 oct. 2025']);
    thenNavigationIs({ precedente: false, suivante: true, aujourdhui: true });
  });

  it('should come back to the current week and detail today', async () => {
    givenTheCurrentWeek(semaineEnCoursFixture());
    givenTheWeek(new SemaineISO(2026, 40), semaineMardiFixture());
    await whenShowingMyPointages();
    await whenGoingTo('semaine-precedente');
    whenChoosingDay('jour-2026-09-29');

    await whenGoingTo('revenir-aujourdhui');

    thenTextOf('semaine-titre', ['Semaine 41 · cette semaine']);
    thenTextOf('jour-titre', ['Aujourd’hui — jeudi 8 octobre']);
  });

  it('should detail the first clocked day of a past week once shown', async () => {
    givenTheWeek(new SemaineISO(2026, 40), semaineMardiFixture());
    await whenShowingMyPointages();

    await whenGoingTo('semaine-precedente');

    thenTextOf('jour-titre', ['Mardi 29 septembre 2026']);
    thenLinesAre([['1231', '', '07:00 → 14:50', '7 h 50']]);
  });

  it('should tell the operator their pointages are being read', () => {
    whenOpeningMyPointagesWithoutWaiting();

    thenVisible('chargement', true);
    thenVisible('total-semaine', false);
  });

  it('should show no figure and offer to retry when the week cannot be read', async () => {
    givenTheServerIsUnreachable();

    await whenShowingMyPointages();

    thenTextOf('echec', ['Impossible de charger vos pointages', 'Vos pointages ne sont pas perdus.']);
    thenVisible('total-semaine', false);
    thenVisible('jour-affiche', false);
  });

  it('should read the week again on retry', async () => {
    givenTheServerIsUnreachable();
    givenTheCurrentWeek(semaineEnCoursFixture());
    await whenShowingMyPointages();
    givenTheServerIsBack();

    await whenGoingTo('reessayer');

    thenTheRequestedWeeksAre([
      new DemandeDePointages(new OperateurId('jean'), SEMAINE_EN_COURS),
      new DemandeDePointages(new OperateurId('jean'), SEMAINE_EN_COURS),
    ]);
    thenVisible('echec', false);
    thenTextOf('total-semaine', ['10 h 58']);
  });

  it('should tell that a past week holds no pointage', async () => {
    await whenShowingMyPointages();

    await whenGoingTo('semaine-precedente');

    thenTextOf('aucun-pointage', ['Aucun pointage cette semaine.']);
  });

  it('should tell that today holds no pointage yet', async () => {
    await whenShowingMyPointages();

    thenTextOf('jour-titre', ['Aujourd’hui — jeudi 8 octobre']);
    thenTextOf('aucun-pointage-du-jour', ['Aucun pointage ce jour.']);
  });

  it('should read and show the week chosen month by month', async () => {
    givenTheWeek(new SemaineISO(2026, 40), semaineMardiFixture());
    await whenShowingMyPointages();
    whenChoosingDay('choisir-une-semaine');
    whenChoosingDay('mois-2026-9');

    await whenGoingTo('semaine-2026-40');

    thenVisible('choix-de-semaine', false);
    thenTextOf('semaine-titre', ['Semaine 40']);
    thenTextOf('jour-titre', ['Mardi 29 septembre 2026']);
  });

  it('should keep the displayed week when the chooser is closed', async () => {
    await whenShowingMyPointages();
    whenChoosingDay('choisir-une-semaine');

    whenChoosingDay('fermer-choix');

    thenVisible('choix-de-semaine', false);
    thenTheRequestedWeeksAre([new DemandeDePointages(new OperateurId('jean'), SEMAINE_EN_COURS)]);
  });

  const givenTheServerIsUnreachable = (): void => {
    port.lectureFailure = new Error('Serveur injoignable');
  };
  const givenTheServerIsBack = (): void => {
    port.lectureFailure = undefined;
  };
  const givenTheWeek = (semaine: SemaineISO, pointages: ReturnType<typeof semaineFixture>): void => {
    port.seed(new DemandeDePointages(new OperateurId('jean'), semaine), pointages);
  };
  const givenTheCurrentWeek = (pointages: ReturnType<typeof semaineFixture>): void => {
    port.seed(new DemandeDePointages(new OperateurId('jean'), SEMAINE_EN_COURS), pointages);
  };
  const whenOpeningMyPointagesWithoutWaiting = (): void => {
    fixture = TestBed.createComponent(MesPointages);
    fixture.componentRef.setInput('operateur', 'jean');
    fixture.detectChanges();
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
  const whenGoingTo = async (selector: string): Promise<void> => {
    element(selector).click();
    await whenTheWeekIsRead();
  };
  const whenGoingBackWeeks = async (semaines: number): Promise<void> => {
    for (let rang = 0; rang < semaines; rang += 1) {
      element('semaine-precedente').click();
      fixture.detectChanges();
    }
    await whenTheWeekIsRead();
  };
  const whenTheWeekIsRead = async (): Promise<void> => {
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
        Array.from(jour.lastElementChild?.children ?? [])
          .map(partie => normalized(partie.textContent))
          .join(' '),
      ]),
    ).toEqual(expected);
  };
  const thenLinesAre = (expected: readonly (readonly string[])[]): void => {
    const lignes = Array.from(element('lignes').children);
    expect(lignes.map(ligne => Array.from(ligne.children).map(colonne => normalized(colonne.textContent)))).toEqual(expected);
  };
  const thenVisible = (selector: string, visible: boolean): void => {
    expect(root().querySelector(dataSelector(selector)) !== null).toBe(visible);
  };
  const thenNavigationIs = (expected: { precedente: boolean; suivante: boolean; aujourdhui: boolean }): void => {
    expect({
      precedente: !button('semaine-precedente').disabled,
      suivante: !button('semaine-suivante').disabled,
      aujourdhui: !button('revenir-aujourdhui').disabled,
    }).toEqual(expected);
  };
  const button = (selector: string): HTMLButtonElement => element(selector) as HTMLButtonElement;
  const thenExplanationsAre = (expected: readonly string[]): void => {
    const explications = Array.from(element('jour-affiche').querySelectorAll(dataSelector('explication')));
    expect(explications.map(explication => normalized(explication.textContent))).toEqual(expected);
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
