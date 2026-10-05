import { ComponentFixture, TestBed } from '@angular/core/testing';
import { dataSelector } from '@test/utils/DataSelector';
import { PeriodeConsultable } from '../../../../domain/PeriodeConsultable';
import { JourCalendaire } from '../../../../domain/semaine/JourCalendaire';
import { SemaineISO } from '../../../../domain/semaine/SemaineISO';
import { ChoixDeSemaine } from './choix-de-semaine';

const PERIODE = new PeriodeConsultable(new JourCalendaire('2026-10-08'));

describe('Week chooser', () => {
  let fixture: ComponentFixture<ChoixDeSemaine>;
  let choisies: SemaineISO[];
  let fermetures: number;

  beforeEach(() => {
    fixture = TestBed.createComponent(ChoixDeSemaine);
    choisies = [];
    fermetures = 0;
    fixture.componentInstance.semaineChoisie.subscribe(semaine => choisies.push(semaine));
    fixture.componentInstance.fermetureDemandee.subscribe(() => (fermetures += 1));
    fixture.componentRef.setInput('periode', PERIODE);
  });

  it('should offer the twelve months of the displayed week year, only those of the last year being reachable', () => {
    whenOpeningOn(new SemaineISO(2026, 37));

    thenTextOf('choix-titre', 'Choisir un mois');
    thenMonthsAre([
      ['Janvier', true],
      ['Février', true],
      ['Mars', true],
      ['Avril', true],
      ['Mai', true],
      ['Juin', true],
      ['Juillet', true],
      ['Août', true],
      ['Septembre', true],
      ['Octobre', true],
      ['Novembre', false],
      ['Décembre', false],
    ]);
    thenFramedMonthIs('mois-2026-9');
  });

  it('should list the weeks of the chosen month from the oldest, flagging the current one', () => {
    whenOpeningOn(new SemaineISO(2026, 41));

    whenChoosing('mois-2026-10');

    thenTextOf('choix-titre', 'Octobre 2026');
    thenWeeksAre([['semaine-2026-41', 'Semaine 41 · cette semaine', '5 oct. – 11 oct. 2026']]);
  });

  it('should list several weeks of a past month', () => {
    whenOpeningOn(new SemaineISO(2026, 41));

    whenChoosing('mois-2026-9');

    thenWeeksAre([
      ['semaine-2026-37', 'Semaine 37', '7 sept. – 13 sept. 2026'],
      ['semaine-2026-38', 'Semaine 38', '14 sept. – 20 sept. 2026'],
      ['semaine-2026-39', 'Semaine 39', '21 sept. – 27 sept. 2026'],
      ['semaine-2026-40', 'Semaine 40', '28 sept. – 4 oct. 2026'],
    ]);
  });

  it('should come back to the months', () => {
    whenOpeningOn(new SemaineISO(2026, 41));
    whenChoosing('mois-2026-9');

    whenChoosing('autre-mois');

    thenTextOf('choix-titre', 'Choisir un mois');
  });

  it('should hand over the chosen week', () => {
    whenOpeningOn(new SemaineISO(2026, 41));
    whenChoosing('mois-2026-9');

    whenChoosing('semaine-2026-38');

    expect(choisies).toEqual([new SemaineISO(2026, 38)]);
  });

  it('should ask to close without choosing', () => {
    whenOpeningOn(new SemaineISO(2026, 41));

    whenChoosing('fermer-choix');

    expect([fermetures, choisies]).toEqual([1, []]);
  });

  const whenOpeningOn = (semaine: SemaineISO): void => {
    fixture.componentRef.setInput('semaineAffichee', semaine);
    fixture.detectChanges();
  };
  const whenChoosing = (selector: string): void => {
    element(selector).click();
    fixture.detectChanges();
  };
  const thenTextOf = (selector: string, expected: string): void => {
    expect(normalized(element(selector).textContent)).toBe(expected);
  };
  const thenMonthsAre = (expected: readonly (readonly [string, boolean])[]): void => {
    const mois = Array.from(element('mois-de-l-annee').querySelectorAll('button'));
    expect(mois.map(unMois => [normalized(unMois.textContent), !unMois.disabled])).toEqual(expected);
  };
  const thenFramedMonthIs = (selector: string): void => {
    const encadres = Array.from(element('mois-de-l-annee').querySelectorAll('.mois--affiche'));
    expect(encadres.map(encadre => encadre.getAttribute('data-selector'))).toEqual([selector]);
  };
  const thenWeeksAre = (expected: readonly (readonly [string, string, string])[]): void => {
    const semaines = Array.from(element('semaines-du-mois').querySelectorAll('button'));
    expect(
      semaines.map(semaine => [
        semaine.getAttribute('data-selector'),
        normalized(semaine.firstElementChild?.textContent ?? ''),
        normalized(semaine.lastElementChild?.textContent ?? ''),
      ]),
    ).toEqual(expected);
  };
  const element = (selector: string): HTMLElement => {
    const selected = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(dataSelector(selector));
    if (selected === null) throw new Error(`Missing ${selector} fixture.`);
    return selected;
  };
  const normalized = (text: string): string => text.replace(/\s+/g, ' ').trim();
});
