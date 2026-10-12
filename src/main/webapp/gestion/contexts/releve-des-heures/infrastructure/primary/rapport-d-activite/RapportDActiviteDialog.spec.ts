import { Component } from '@angular/core';
import { ComponentFixture, ComponentFixtureAutoDetect, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { provideRouter } from '@angular/router';
import { RapportDActiviteFixture } from '@test/unit/fixtures/gestion/releve-des-heures/RapportDActiviteFixture';
import { dataSelector } from '@test/utils/DataSelector';
import { requiredFixture } from '@test/utils/RequiredFixture';
import { DureeTravaillee } from '../../../domain/duree/DureeTravaillee';
import { PeriodeDuRapport } from '../../../domain/rapport/PeriodeDuRapport';
import { RapportDActivitePort } from '../../../domain/rapport/RapportDActivitePort';
import { ResumeDuRapport } from '../../../domain/rapport/ResumeDuRapport';
import { OperateurReleveId } from '../../../domain/releve/OperateurReleveId';
import { JourCalendaire } from '../../../domain/semaine/JourCalendaire';
import { RapportDActiviteDialog, RapportDActiviteDialogData } from './RapportDActiviteDialog';

@Component({ template: '' })
class DialogHostFixture {}

const MARTIN = new OperateurReleveId('martin');
const LE_17_SEPTEMBRE = new JourCalendaire('2026-09-17');
const SEMAINE_38 = PeriodeDuRapport.semaineContenant(LE_17_SEPTEMBRE);
const SEMAINE_37 = PeriodeDuRapport.semaineContenant(new JourCalendaire('2026-09-10'));
const SEPTEMBRE = PeriodeDuRapport.moisContenant(LE_17_SEPTEMBRE);

const resumeFixture = (temps: string, jours: number, finsAutomatiques = 0): ResumeDuRapport =>
  new ResumeDuRapport({ tempsPointe: new DureeTravaillee(temps), joursAvecPointage: jours, finsAutomatiques });

describe('RapportDActiviteDialog', () => {
  let fixture: ComponentFixture<DialogHostFixture>;
  let port: RapportDActiviteFixture;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 8, 17, 10, 0));
    port = new RapportDActiviteFixture();
    port.seme(MARTIN, SEMAINE_38, resumeFixture('PT47H45M', 6));
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: ComponentFixtureAutoDetect, useValue: true },
        { provide: RapportDActivitePort, useValue: port },
      ],
    });
    fixture = TestBed.createComponent(DialogHostFixture);
  });

  afterEach(async () => {
    TestBed.inject(MatDialog).closeAll();
    await fixture.whenStable();
    vi.useRealTimers();
  });

  it('should open on the current week of the operator with what was clocked in it', async () => {
    await whenOpening();

    expect(text('rapport-operateur')).toBe('Martin Lefèvre');
    expect(text('rapport-periode')).toMatch(/^Semaine 38 · 14.20 sept\. 2026$/u);
    expect(text('rapport-resume')).toBe('6 jours avec pointage · 47 h 45 pointées');
    expect(port.demandes).toEqual([{ operateur: MARTIN, periode: SEMAINE_38 }]);
  });

  it('should not lead to a period that has not begun', async () => {
    await whenOpening();

    expect(button('rapport-suivante').disabled).toBe(true);
  });

  it('should read the previous week', async () => {
    givenSummary(SEMAINE_37, resumeFixture('PT38H', 5));
    await whenOpening();

    await whenClicking('rapport-precedente');

    expect(text('rapport-periode')).toMatch(/^Semaine 37 · 7.13 sept\. 2026$/u);
    expect(text('rapport-resume')).toBe('5 jours avec pointage · 38 h 00 pointées');
  });

  it('should come back to the current week once it went back', async () => {
    givenSummary(SEMAINE_37, resumeFixture('PT38H', 5));
    await whenOpening();
    await whenClicking('rapport-precedente');

    await whenClicking('rapport-suivante');

    expect(text('rapport-periode')).toMatch(/^Semaine 38/u);
    expect(button('rapport-suivante').disabled).toBe(true);
  });

  it('should switch to the current month, and back to the current week', async () => {
    givenSummary(SEPTEMBRE, resumeFixture('PT164H5M', 1));
    await whenOpening();
    await whenClicking('rapport-par-mois');
    const mois = [text('rapport-periode'), text('rapport-resume'), pressed('rapport-par-mois')];

    await whenClicking('rapport-par-semaine');

    expect(mois).toEqual(['Septembre 2026', '1 jour avec pointage · 164 h 05 pointées', 'true']);
    expect(text('rapport-periode')).toMatch(/^Semaine 38/u);
  });

  it('should explain a summary that cannot be read and read it again on request', async () => {
    givenSummaryFails();
    await whenOpening();
    const echec = text('rapport-resume-echec');
    givenSummaryRecovers();

    await whenClicking('rapport-resume-reessayer');

    expect(echec).toContain('Impossible de lire la période.');
    expect(text('rapport-resume')).toBe('6 jours avec pointage · 47 h 45 pointées');
  });

  it('should not mention automatic ends when the period has none', async () => {
    await whenOpening();

    expect(present('rapport-fins-automatiques')).toBe(false);
  });

  it.each([
    [1, '1 pointage en fin automatique dans la période. Il figure dans le rapport avec la mention « fin automatique ».'],
    [3, '3 pointages en fin automatique dans la période. Ils figurent dans le rapport avec la mention « fin automatique ».'],
  ])('should announce %s automatic ends and lead to the anomalies of the operator', async (finsAutomatiques, annonce) => {
    givenSummary(SEMAINE_38, resumeFixture('PT47H45M', 6, finsAutomatiques));

    await whenOpening();

    expect(text('rapport-fins-automatiques')).toContain(annonce);
    expect(lien('rapport-anomalies')).toBe('/anomalies?operateur=martin');
  });

  const givenSummary = (periode: PeriodeDuRapport, resume: ResumeDuRapport): void => {
    port.seme(MARTIN, periode, resume);
  };
  const givenSummaryFails = (): void => {
    port.echec = new Error('Réseau indisponible');
  };
  const givenSummaryRecovers = (): void => {
    port.echec = undefined;
  };

  const whenOpening = async (): Promise<void> => {
    TestBed.inject(MatDialog).open<RapportDActiviteDialog, RapportDActiviteDialogData>(RapportDActiviteDialog, {
      data: { operateur: 'martin', prenom: 'Martin', nom: 'Lefèvre' },
    });
    await fixture.whenStable();
  };
  const whenClicking = async (selector: string): Promise<void> => {
    button(selector).click();
    await fixture.whenStable();
  };
  const button = (selector: string): HTMLButtonElement =>
    requiredFixture(document.querySelector<HTMLButtonElement>(dataSelector(selector)), selector);
  const pressed = (selector: string): string | null => button(selector).getAttribute('aria-pressed');
  const present = (selector: string): boolean => document.querySelector(dataSelector(selector)) !== null;
  const lien = (selector: string): string | null =>
    requiredFixture(document.querySelector<HTMLAnchorElement>(dataSelector(selector)), selector).getAttribute('href');
  const text = (selector: string): string => document.querySelector(dataSelector(selector))?.textContent.trim() ?? '';
});
