import { ActiviteDeLaJournee } from './ActiviteDeLaJournee';
import { ActiviteDeLaJourneeId } from './ActiviteDeLaJourneeId';
import { BornesDuJour } from './BornesDuJour';
import { CategorieDElement } from './CategorieDElement';
import { Duree } from './Duree';
import { ElementDeLaJournee } from './ElementDeLaJournee';
import { ElementDeLaJourneeId } from './ElementDeLaJourneeId';
import { EtatDActivite } from './EtatDActivite';
import { InstantDeLaJournee } from './InstantDeLaJournee';
import { JourACorriger } from './JourACorriger';
import { PortionDeJour } from './PortionDeJour';
import { SuiviDAtelierId } from './SuiviDAtelierId';

const instant = (recu: string): InstantDeLaJournee => new InstantDeLaJournee(recu);

const SUIVI = new SuiviDAtelierId('suivi-1');
const ELEMENT = new ElementDeLaJournee({
  id: new ElementDeLaJourneeId('element-1'),
  categorie: new CategorieDElement('OF'),
  nom: 'PRD-2026-000015',
  reference: '24-131',
  description: 'Carter de pompe',
});

const terminee = (kind: 'TERMINEE' | 'TERMINEE_AUTOMATIQUEMENT', fin = '2026-10-05T21:45:00+02:00'): EtatDActivite => ({
  kind,
  fin: instant(fin),
  dureeSurLeJour: new Duree('PT3H15M'),
});

const EN_COURS: EtatDActivite = { kind: 'EN_COURS' };

const activiteFixture = (etat: EtatDActivite): ActiviteDeLaJournee =>
  new ActiviteDeLaJournee({
    id: new ActiviteDeLaJourneeId('debut-1'),
    suivi: SUIVI,
    element: ELEMENT,
    poste: undefined,
    categorie: 'TRAVAIL',
    debut: instant('2026-10-05T18:30:00+02:00'),
    etat,
    autresJours: [],
  });

describe('ActiviteDeLaJournee', () => {
  it('should be refused when it ends before it starts', () => {
    const finAvantLeDebut = terminee('TERMINEE', '2026-10-05T18:29:00+02:00');

    expect(() => activiteFixture(finAvantLeDebut)).toThrow('L’activité reçue du serveur finit avant de commencer.');
  });

  it('should be accepted when it ends the very moment it starts', () => {
    const finAuDebut = terminee('TERMINEE', '2026-10-05T18:30:00+02:00');

    expect(() => activiteFixture(finAuDebut)).not.toThrow();
  });
});

describe('ActiviteDeLaJournee on the day displayed', () => {
  const BORNES = new BornesDuJour({
    debut: instant('2026-10-05T00:00:00+02:00'),
    fin: instant('2026-10-06T00:00:00+02:00'),
    finDuLendemain: instant('2026-10-07T00:00:00+02:00'),
  });
  const JOUR = new JourACorriger('2026-10-05');

  const portion = (jour: string, duree: string): PortionDeJour => new PortionDeJour(new JourACorriger(jour), new Duree(duree));

  const activiteDuJour = (debut: string, etat: EtatDActivite, autresJours: readonly PortionDeJour[] = []): ActiviteDeLaJournee =>
    new ActiviteDeLaJournee({
      id: new ActiviteDeLaJourneeId('debut-1'),
      suivi: SUIVI,
      element: ELEMENT,
      poste: undefined,
      categorie: 'TRAVAIL',
      debut: instant(debut),
      etat,
      autresJours,
    });

  const termineeLe = (fin: string, kind: 'TERMINEE' | 'TERMINEE_AUTOMATIQUEMENT' = 'TERMINEE'): EtatDActivite => terminee(kind, fin);

  const lundiSoir = (): ActiviteDeLaJournee =>
    activiteDuJour('2026-10-05T22:00:00+02:00', termineeLe('2026-10-06T03:30:00+02:00'), [portion('2026-10-06', 'PT3H30M')]);

  const dimancheSoir = (): ActiviteDeLaJournee =>
    activiteDuJour('2026-10-04T22:00:00+02:00', termineeLe('2026-10-05T03:30:00+02:00'), [portion('2026-10-04', 'PT2H')]);

  it('should name its start when it began before the day', () => {
    const activite = dimancheSoir();

    expect(activite.debutAvantLeJour(BORNES)).toEqual(activite.debut);
  });

  it.each([
    { cas: 'during the day', debut: '2026-10-05T09:00:00+02:00' },
    { cas: 'at the very start of the day', debut: '2026-10-05T00:00:00+02:00' },
  ])('should name no start before the day when it began $cas', ({ debut }) => {
    expect(activiteDuJour(debut, termineeLe('2026-10-05T10:00:00+02:00')).debutAvantLeJour(BORNES)).toBeUndefined();
  });

  it('should name its end when it ends after the day', () => {
    expect(lundiSoir().finApresLeJour(BORNES)).toEqual(instant('2026-10-06T03:30:00+02:00'));
  });

  it.each([
    { cas: 'during the day', activite: activiteDuJour('2026-10-05T09:00:00+02:00', termineeLe('2026-10-05T10:00:00+02:00')) },
    { cas: 'at the very end of the day', activite: activiteDuJour('2026-10-05T22:00:00+02:00', termineeLe('2026-10-06T00:00:00+02:00')) },
    { cas: 'in progress', activite: activiteDuJour('2026-10-05T22:00:00+02:00', EN_COURS) },
  ])('should name no end after the day when it ends $cas', ({ activite }) => {
    expect(activite.finApresLeJour(BORNES)).toBeUndefined();
  });

  it('should start on the day at the start of the day when it began before', () => {
    expect(dimancheSoir().debutSurLeJour(BORNES)).toEqual(BORNES.debut);
  });

  it('should start on the day at its own start when it began during the day', () => {
    const activite = activiteDuJour('2026-10-05T09:00:00+02:00', termineeLe('2026-10-05T10:00:00+02:00'));

    expect(activite.debutSurLeJour(BORNES)).toEqual(activite.debut);
  });

  it('should end on the day at the end of the day when it ends after', () => {
    expect(lundiSoir().finSurLeJour(BORNES)).toEqual(BORNES.fin);
  });

  it('should end on the day at its own end when it ends during the day', () => {
    const fin = instant('2026-10-05T10:00:00+02:00');
    const activite = activiteDuJour('2026-10-05T09:00:00+02:00', { kind: 'TERMINEE', fin, dureeSurLeJour: new Duree('PT1H') });

    expect(activite.finSurLeJour(BORNES)).toEqual(fin);
  });

  it('should have no end on the day while it is in progress', () => {
    expect(activiteDuJour('2026-10-05T22:00:00+02:00', EN_COURS).finSurLeJour(BORNES)).toBeUndefined();
  });

  it('should name the day it began when a portion was counted before the day', () => {
    expect(dimancheSoir().jourDuDebut(JOUR)?.value).toBe('2026-10-04');
  });

  it.each([
    { ordre: 'oldest first', portions: [portion('2026-10-03', 'PT2H'), portion('2026-10-04', 'PT24H')] },
    { ordre: 'oldest last', portions: [portion('2026-10-04', 'PT24H'), portion('2026-10-03', 'PT2H')] },
  ])('should name the first of several days before the day, received $ordre', ({ portions }) => {
    const activite = activiteDuJour('2026-10-03T22:00:00+02:00', termineeLe('2026-10-05T03:30:00+02:00'), portions);

    expect(activite.jourDuDebut(JOUR)?.value).toBe('2026-10-03');
  });

  it('should name no day of beginning when no portion was counted before the day', () => {
    expect(lundiSoir().jourDuDebut(JOUR)).toBeUndefined();
  });

  it('should name the day it ends when a portion is counted after the day', () => {
    expect(lundiSoir().jourDeLaFin(JOUR)?.value).toBe('2026-10-06');
  });

  it.each([
    { ordre: 'latest first', portions: [portion('2026-10-07', 'PT3H30M'), portion('2026-10-06', 'PT24H')] },
    { ordre: 'latest last', portions: [portion('2026-10-06', 'PT24H'), portion('2026-10-07', 'PT3H30M')] },
  ])('should name the last of several days after the day, received $ordre', ({ portions }) => {
    const activite = activiteDuJour('2026-10-05T22:00:00+02:00', termineeLe('2026-10-07T03:30:00+02:00'), portions);

    expect(activite.jourDeLaFin(JOUR)?.value).toBe('2026-10-07');
  });

  it('should name no day of ending when no portion is counted after the day', () => {
    expect(dimancheSoir().jourDeLaFin(JOUR)).toBeUndefined();
  });

  it('should last the portion of the day plus the portions of the other days', () => {
    const etat: EtatDActivite = {
      kind: 'TERMINEE',
      fin: instant('2026-10-06T03:30:00+02:00'),
      dureeSurLeJour: new Duree('PT2H'),
    };
    const activite = activiteDuJour('2026-10-05T22:00:00+02:00', etat, [portion('2026-10-06', 'PT3H30M')]);

    expect(activite.dureeTotale()).toEqual(new Duree('PT5H30M'));
  });

  it('should last nothing yet while it is in progress', () => {
    expect(activiteDuJour('2026-10-05T22:00:00+02:00', EN_COURS).dureeTotale()).toBeUndefined();
  });

  it('should straddle two days when a portion is counted on another day', () => {
    expect(lundiSoir().estACheval()).toBe(true);
  });

  it('should not straddle two days when it is contained in the day', () => {
    expect(activiteDuJour('2026-10-05T09:00:00+02:00', termineeLe('2026-10-05T10:00:00+02:00')).estACheval()).toBe(false);
  });
});
