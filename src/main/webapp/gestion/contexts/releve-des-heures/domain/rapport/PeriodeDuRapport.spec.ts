import { JourCalendaire } from '../semaine/JourCalendaire';
import { SemaineISO } from '../semaine/SemaineISO';
import { MoisCivil } from './MoisCivil';
import { PeriodeDuRapport } from './PeriodeDuRapport';

const jour = (valeur: string): JourCalendaire => new JourCalendaire(valeur);
const LE_16_SEPTEMBRE = jour('2026-09-16');
const SEMAINE_38 = PeriodeDuRapport.semaineContenant(LE_16_SEPTEMBRE);
const SEPTEMBRE = PeriodeDuRapport.moisContenant(LE_16_SEPTEMBRE);

const bornes = (periode: PeriodeDuRapport | undefined): readonly [string, string] | undefined =>
  periode === undefined ? undefined : [periode.premierJour().value, periode.dernierJour().value];

describe('PeriodeDuRapport', () => {
  it('should be the ISO week of a day, from Monday to Sunday', () => {
    expect(SEMAINE_38.borne).toEqual({ genre: 'SEMAINE', semaine: new SemaineISO(2026, 38) });
    expect(bornes(SEMAINE_38)).toEqual(['2026-09-14', '2026-09-20']);
  });

  it('should be the calendar month of a day', () => {
    expect(SEPTEMBRE.borne).toEqual({ genre: 'MOIS', mois: new MoisCivil(2026, 9) });
    expect(bornes(SEPTEMBRE)).toEqual(['2026-09-01', '2026-09-30']);
  });

  it.each([
    ['week', SEMAINE_38, ['2026-09-07', '2026-09-13']],
    ['month', SEPTEMBRE, ['2026-08-01', '2026-08-31']],
  ] as const)('should step back to the previous %s', (_genre, periode, attendues) => {
    expect(bornes(periode.precedente())).toEqual(attendues);
  });

  it.each([
    ['week', PeriodeDuRapport.semaineContenant(jour('2000-01-05'))],
    ['month', PeriodeDuRapport.moisContenant(jour('2000-01-05'))],
  ] as const)('should not step back before the first served %s', (_genre, periode) => {
    expect(periode.precedente()).toBeUndefined();
  });

  it.each([
    ['week', SEMAINE_38, jour('2026-09-21'), ['2026-09-21', '2026-09-27']],
    ['month', SEPTEMBRE, jour('2026-10-01'), ['2026-10-01', '2026-10-31']],
  ] as const)('should step forward to the next %s once it has begun', (_genre, periode, aujourdhui, attendues) => {
    expect(bornes(periode.suivante(aujourdhui))).toEqual(attendues);
  });

  it.each([
    ['week', SEMAINE_38, jour('2026-09-20')],
    ['month', SEPTEMBRE, jour('2026-09-30')],
    ['last served week', PeriodeDuRapport.semaineContenant(jour('2999-12-29')), jour('2999-12-31')],
    ['last served month', PeriodeDuRapport.moisContenant(jour('2999-12-29')), jour('2999-12-31')],
  ] as const)('should not step forward past the current %s', (_genre, periode, aujourdhui) => {
    expect(periode.suivante(aujourdhui)).toBeUndefined();
  });

  it('should turn the current month into the current week', () => {
    expect(bornes(SEPTEMBRE.enSemaine(jour('2026-09-23')))).toEqual(['2026-09-21', '2026-09-27']);
  });

  it('should turn the current month into the current week on its last day', () => {
    expect(bornes(SEPTEMBRE.enSemaine(jour('2026-09-30')))).toEqual(['2026-09-28', '2026-10-04']);
  });

  it('should turn a past month into the week of its first day', () => {
    expect(bornes(SEPTEMBRE.enSemaine(jour('2026-10-12')))).toEqual(['2026-08-31', '2026-09-06']);
  });

  it('should turn a week straddling two months into the month of today when today is in it', () => {
    const semaine40 = PeriodeDuRapport.semaineContenant(jour('2026-09-28'));

    expect(bornes(semaine40.enMois(jour('2026-10-02')))).toEqual(['2026-10-01', '2026-10-31']);
  });

  it('should turn a past week into the month of its Monday', () => {
    const semaine40 = PeriodeDuRapport.semaineContenant(jour('2026-09-28'));

    expect(bornes(semaine40.enMois(jour('2026-10-12')))).toEqual(['2026-09-01', '2026-09-30']);
  });
});
