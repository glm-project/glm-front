import { BornesDuJour } from '../journee/BornesDuJour';
import { CategorieDElement } from '../journee/CategorieDElement';
import { Duree } from '../journee/Duree';
import { ElementDeLaJournee } from '../journee/ElementDeLaJournee';
import { ElementDeLaJourneeId } from '../journee/ElementDeLaJourneeId';
import { InstantDeLaJournee } from '../journee/InstantDeLaJournee';
import { JourACorriger } from '../journee/JourACorriger';
import { SuiviDAtelierId } from '../journee/SuiviDAtelierId';
import { SuiviPresent } from '../journee/SuiviPresent';
import { CalendrierLocal } from './CalendrierLocal';
import { PlageDAjout } from './PlageDAjout';

const instant = (recu: string): InstantDeLaJournee => new InstantDeLaJournee(recu);

const bornes = (debut: string, fin: string, finDuLendemain: string): BornesDuJour =>
  new BornesDuJour({ debut: instant(debut), fin: instant(fin), finDuLendemain: instant(finDuLendemain) });

const LUNDI = new JourACorriger('2026-10-05');

const deuxChiffres = (valeur: number): string => String(valeur).padStart(2, '0');

const CALENDRIER: CalendrierLocal = {
  instantA: (jour, heures, minutes) => instant(`${jour.value}T${deuxChiffres(heures)}:${deuxChiffres(minutes)}:00-03:00`),
};

const LUNDI_5 = bornes('2026-10-05T00:00:00-03:00', '2026-10-06T00:00:00-03:00', '2026-10-07T00:00:00-03:00');
const APRES_LE_LUNDI = instant('2026-10-06T10:00:00-03:00');

const ELEMENT = new ElementDeLaJournee({
  id: new ElementDeLaJourneeId('element-1'),
  categorie: new CategorieDElement('OF'),
  nom: 'PRD-2026-000001',
  reference: '24-131',
  description: 'Pièce 1',
});

const suivi = (engageLe: string, clotureLe?: string): SuiviPresent =>
  new SuiviPresent({
    suivi: new SuiviDAtelierId('suivi-1'),
    element: ELEMENT,
    engageLe: instant(engageLe),
    clotureLe: clotureLe === undefined ? undefined : instant(clotureLe),
  });

const plage = (jour: BornesDuJour = LUNDI_5, maintenant: InstantDeLaJournee = APRES_LE_LUNDI): PlageDAjout =>
  PlageDAjout.pour(jour, LUNDI, maintenant, CALENDRIER);

const saisie = (debut: string, fin: string, base: PlageDAjout = plage()): PlageDAjout => base.avecDebut(debut).avecFin(fin);

describe('Range of an added activity', () => {
  it('should be empty, without error nor duration, before any hour is typed', () => {
    const vide = plage();

    expect([vide.texteDuDebut(), vide.texteDeLaFin(), vide.erreur(), vide.intervalle(), vide.aEnvoyer(), vide.duree()]).toEqual([
      '',
      '',
      undefined,
      undefined,
      undefined,
      undefined,
    ]);
  });

  it('should turn the hours typed into instants of the day displayed, in local time, and compute their duration', () => {
    const complete = saisie('08:00', '10:30');

    expect(complete.intervalle()).toEqual({ debut: instant('2026-10-05T08:00:00-03:00'), fin: instant('2026-10-05T10:30:00-03:00') });
    expect(complete.aEnvoyer()?.intervalle).toEqual(complete.intervalle());
    expect(complete.duree()).toEqual(new Duree('PT2H30M'));
    expect(complete.erreur()).toBeUndefined();
  });

  it('should keep the text typed and leave the previous range as it was', () => {
    const vide = plage();

    const avecDebut = vide.avecDebut('08:00');

    expect([avecDebut.texteDuDebut(), vide.texteDuDebut()]).toEqual(['08:00', '']);
  });

  it('should read the hours with their surrounding spaces ignored', () => {
    expect(saisie(' 08:00 ', ' 10:30 ').duree()).toEqual(new Duree('PT2H30M'));
  });

  it.each(['25:00', '24:00', '12:60', '8h30', '8:30', 'aa:bb', '08:0', '0800'])('should refuse the hour "%s" as badly written', texte => {
    expect([saisie(texte, '10:00').erreur(), saisie('08:00', texte).erreur()]).toEqual([
      { kind: 'HEURE_MAL_ECRITE' },
      { kind: 'HEURE_MAL_ECRITE' },
    ]);
  });

  it('should draw no range while an hour is badly written', () => {
    const mal = saisie('25:00', '10:00');

    expect([mal.intervalle(), mal.aEnvoyer(), mal.duree()]).toEqual([undefined, undefined, undefined]);
  });

  it.each([
    { cas: 'nothing is typed', debut: '', fin: '' },
    { cas: 'only the start is typed', debut: '08:00', fin: '' },
    { cas: 'only the end is typed', debut: '', fin: '10:00' },
  ])('should ask for both hours once the submission was tried and $cas', ({ debut, fin }) => {
    const tentee = saisie(debut, fin).apresUnEnvoi();

    expect(tentee.erreur()).toEqual({ kind: 'HEURES_MANQUANTES' });
    expect(tentee.aEnvoyer()).toBeUndefined();
  });

  it('should read hours made of spaces as missing: no error before the submission, the hours to ask for after it', () => {
    const blanche = saisie('   ', '10:00');

    expect([blanche.erreur(), blanche.apresUnEnvoi().erreur()]).toEqual([undefined, { kind: 'HEURES_MANQUANTES' }]);
  });

  it('should not ask for the hours before the submission was tried', () => {
    expect(saisie('08:00', '').erreur()).toBeUndefined();
  });

  it('should stop asking for the hours once both are typed', () => {
    expect(saisie('', '').apresUnEnvoi().avecDebut('08:00').avecFin('10:00').erreur()).toBeUndefined();
  });

  it('should report a badly written hour before the missing ones', () => {
    expect(saisie('25:00', '').apresUnEnvoi().erreur()).toEqual({ kind: 'HEURE_MAL_ECRITE' });
  });

  it.each([
    { cas: 'equals the start', debut: '10:00', fin: '10:00', erreur: { kind: 'FIN_NON_APRES_DEBUT' } },
    {
      cas: 'precedes the start',
      debut: '10:00',
      fin: '09:59',
      erreur: {
        kind: 'FIN_AVANT_DEBUT_LE_MEME_JOUR',
        debut: instant('2026-10-05T10:00:00-03:00'),
        fin: instant('2026-10-05T09:59:00-03:00'),
      },
    },
  ])('should refuse a range whose end $cas, the end being on the same day', ({ debut, fin, erreur }) => {
    const incoherente = saisie(debut, fin);

    expect(incoherente.erreur()).toEqual(erreur);
    expect(incoherente.aEnvoyer()).toBeUndefined();
    expect(incoherente.intervalle()).toBeUndefined();
    expect(incoherente.duree()).toBeUndefined();
  });

  it('should accept an end one minute after the start', () => {
    expect(saisie('10:00', '10:01').duree()).toEqual(new Duree('PT1M'));
  });

  it('should refuse an end that follows the current time', () => {
    const futur = saisie('08:00', '10:01', plage(LUNDI_5, instant('2026-10-05T10:00:00-03:00')));

    expect(futur.erreur()).toEqual({ kind: 'FIN_APRES_MAINTENANT' });
    expect(futur.aEnvoyer()).toBeUndefined();
  });

  it('should keep the range drawn and measured when its end follows the current time', () => {
    const futur = saisie('08:00', '10:01', plage(LUNDI_5, instant('2026-10-05T10:00:00-03:00')));

    expect(futur.duree()).toEqual(new Duree('PT2H1M'));
  });

  it('should accept an end that is the current time', () => {
    expect(saisie('08:00', '10:00', plage(LUNDI_5, instant('2026-10-05T10:00:00-03:00'))).erreur()).toBeUndefined();
  });

  it('should check the end against the current time it is later given, and keep the hours typed', () => {
    const horsHorloge = saisie('08:00', '10:30', plage(LUNDI_5, instant('2026-10-05T11:00:00-03:00')));

    const apresUneHorlogeEnRetard = horsHorloge.avecMaintenant(instant('2026-10-05T10:00:00-03:00'));

    expect([horsHorloge.erreur(), apresUneHorlogeEnRetard.erreur(), apresUneHorlogeEnRetard.texteDeLaFin()]).toEqual([
      undefined,
      { kind: 'FIN_APRES_MAINTENANT' },
      '10:30',
    ]);
  });

  it('should refuse an end that follows the current time even before the start is typed', () => {
    expect(saisie('', '10:01', plage(LUNDI_5, instant('2026-10-05T10:00:00-03:00'))).erreur()).toEqual({ kind: 'FIN_APRES_MAINTENANT' });
  });

  it.each([
    {
      cas: 'a start after the day received',
      jour: bornes('2026-10-05T00:00:00+02:00', '2026-10-06T00:00:00+02:00', '2026-10-07T00:00:00+02:00'),
      debut: '20:00',
      fin: '',
      champ: 'DEBUT',
    },
    {
      cas: 'a start before the day received',
      jour: bornes('2026-10-05T08:00:00-03:00', '2026-10-06T08:00:00-03:00', '2026-10-07T08:00:00-03:00'),
      debut: '07:59',
      fin: '',
      champ: 'DEBUT',
    },
    {
      cas: 'an end after the day received',
      jour: bornes('2026-10-05T00:00:00+02:00', '2026-10-06T00:00:00+02:00', '2026-10-07T00:00:00+02:00'),
      debut: '18:00',
      fin: '20:00',
      champ: 'FIN',
    },
    {
      cas: 'an end before the day received',
      jour: bornes('2026-10-05T08:00:00-03:00', '2026-10-06T08:00:00-03:00', '2026-10-07T08:00:00-03:00'),
      debut: '',
      fin: '07:59',
      champ: 'FIN',
    },
  ] as const)('should refuse $cas, the day being the one displayed', ({ jour, debut, fin, champ }) => {
    expect(saisie(debut, fin, plage(jour)).erreur()).toEqual({ kind: 'HORS_DU_JOUR', champ });
  });

  it('should place no portion on any day for an end after the day received', () => {
    const jour = bornes('2026-10-05T00:00:00+02:00', '2026-10-06T00:00:00+02:00', '2026-10-07T00:00:00+02:00');

    expect(saisie('18:00', '20:00', plage(jour)).portions()).toBeUndefined();
  });

  it('should accept hours falling exactly on the midnights received', () => {
    const jour = bornes('2026-10-05T00:00:00-03:00', '2026-10-05T23:00:00-03:00', '2026-10-06T23:00:00-03:00');

    expect(saisie('00:00', '23:00', plage(jour)).erreur()).toBeUndefined();
  });

  it('should accept the hours of the day displayed whatever the zone of the workshop', () => {
    const jour = bornes('2026-10-05T00:00:00+02:00', '2026-10-06T00:00:00+02:00', '2026-10-07T00:00:00+02:00');

    expect(saisie('08:00', '10:00', plage(jour)).intervalle()).toEqual({
      debut: instant('2026-10-05T08:00:00-03:00'),
      fin: instant('2026-10-05T10:00:00-03:00'),
    });
  });

  it('should refuse a start that precedes the engagement of the suivi, and name it', () => {
    const avantLEngagement = saisie('13:59', '15:00').avecSuivi(suivi('2026-10-05T14:00:00-03:00'));

    expect(avantLEngagement.erreur()).toEqual({ kind: 'DEBUT_AVANT_ENGAGEMENT', engagement: instant('2026-10-05T14:00:00-03:00') });
    expect(avantLEngagement.aEnvoyer()).toBeUndefined();
  });

  it('should accept a start that is the engagement of the suivi', () => {
    expect(saisie('14:00', '15:00').avecSuivi(suivi('2026-10-05T14:00:00-03:00')).erreur()).toBeUndefined();
  });

  it('should refuse a start that precedes the engagement even before the end is typed', () => {
    expect(saisie('13:59', '').avecSuivi(suivi('2026-10-05T14:00:00-03:00')).erreur()).toEqual({
      kind: 'DEBUT_AVANT_ENGAGEMENT',
      engagement: instant('2026-10-05T14:00:00-03:00'),
    });
  });

  it('should refuse an end that follows the closure of the suivi, and name it', () => {
    const apresLaCloture = saisie('10:00', '11:01').avecSuivi(suivi('2026-10-01T08:00:00-03:00', '2026-10-05T11:00:00-03:00'));

    expect(apresLaCloture.erreur()).toEqual({ kind: 'FIN_APRES_CLOTURE', cloture: instant('2026-10-05T11:00:00-03:00') });
    expect(apresLaCloture.aEnvoyer()).toBeUndefined();
  });

  it('should accept an end that is the closure of the suivi', () => {
    expect(saisie('10:00', '11:00').avecSuivi(suivi('2026-10-01T08:00:00-03:00', '2026-10-05T11:00:00-03:00')).erreur()).toBeUndefined();
  });

  it('should accept any end when the suivi is not closed', () => {
    expect(saisie('10:00', '23:59').avecSuivi(suivi('2026-10-01T08:00:00-03:00')).erreur()).toBeUndefined();
  });

  it('should check nothing against the suivi once it is no longer chosen', () => {
    const choisi = saisie('13:59', '15:00').avecSuivi(suivi('2026-10-05T14:00:00-03:00'));

    expect(choisi.avecSuivi(undefined).erreur()).toBeUndefined();
  });

  it('should report the start out of the day before the engagement it also precedes', () => {
    const jour = bornes('2026-10-05T08:00:00-03:00', '2026-10-06T08:00:00-03:00', '2026-10-07T08:00:00-03:00');

    const incoherente = saisie('07:00', '', plage(jour)).avecSuivi(suivi('2026-10-05T08:00:00-03:00'));

    expect(incoherente.erreur()).toEqual({ kind: 'HORS_DU_JOUR', champ: 'DEBUT' });
  });

  it('should report an end that does not follow the start before an end that follows the current time', () => {
    const futur = saisie('11:00', '10:30', plage(LUNDI_5, instant('2026-10-05T10:00:00-03:00')));

    expect(futur.erreur()?.kind).toBe('FIN_AVANT_DEBUT_LE_MEME_JOUR');
  });

  it('should report an end that follows the current time before an end that follows the closure', () => {
    const futur = saisie('08:00', '10:30', plage(LUNDI_5, instant('2026-10-05T10:00:00-03:00'))).avecSuivi(
      suivi('2026-10-01T08:00:00-03:00', '2026-10-05T09:00:00-03:00'),
    );

    expect(futur.erreur()).toEqual({ kind: 'FIN_APRES_MAINTENANT' });
  });

  describe('with an end on the next day', () => {
    const LE_MARDI_A_DIX_HEURES = instant('2026-10-06T10:00:00-03:00');

    const saisieDeNuit = (debut: string, fin: string, maintenant: InstantDeLaJournee = LE_MARDI_A_DIX_HEURES): PlageDAjout =>
      saisie(debut, fin, plage(LUNDI_5, maintenant)).avecFinLeLendemain();

    it('should read the end on the next day and measure the whole night as one duration', () => {
      const nuit = saisieDeNuit('22:00', '03:30');

      expect(nuit.intervalle()).toEqual({ debut: instant('2026-10-05T22:00:00-03:00'), fin: instant('2026-10-06T03:30:00-03:00') });
      expect(nuit.duree()).toEqual(new Duree('PT5H30M'));
      expect(nuit.erreur()).toBeUndefined();
    });

    it('should read the end on the day displayed again once the end day is the day displayed', () => {
      expect(saisieDeNuit('08:00', '10:30').avecFinLeJourAffiche().intervalle()).toEqual({
        debut: instant('2026-10-05T08:00:00-03:00'),
        fin: instant('2026-10-05T10:30:00-03:00'),
      });
    });

    it('should know whether the end is on the next day', () => {
      expect([plage().finLeLendemain(), plage().avecFinLeLendemain().finLeLendemain()]).toEqual([false, true]);
    });

    it('should keep the end day when the hours or the suivi change', () => {
      const nuit = saisieDeNuit('22:00', '03:30').avecDebut('21:00').avecFin('04:00').avecSuivi(undefined);

      expect(nuit.finLeLendemain()).toBe(true);
    });

    it.each([
      { cas: 'before the current time', maintenant: '2026-10-06T10:00:00-03:00', disponible: true },
      { cas: 'when the next day begins', maintenant: '2026-10-06T00:00:00-03:00', disponible: true },
      { cas: 'one minute before the next day', maintenant: '2026-10-05T23:59:00-03:00', disponible: false },
      { cas: 'in the middle of the day displayed', maintenant: '2026-10-05T14:00:00-03:00', disponible: false },
    ])('should offer the next day only once it has begun: $cas', ({ maintenant, disponible }) => {
      expect(plage(LUNDI_5, instant(maintenant)).lendemainDisponible()).toBe(disponible);
    });

    it('should refuse an end of the next day that follows the current time', () => {
      const futur = saisieDeNuit('22:00', '03:30', instant('2026-10-06T03:29:00-03:00'));

      expect(futur.erreur()).toEqual({ kind: 'FIN_APRES_MAINTENANT' });
    });

    it('should refuse an end of the next day that follows the closure of the suivi, and name it', () => {
      const apresLaCloture = saisieDeNuit('22:00', '03:30').avecSuivi(suivi('2026-10-01T08:00:00-03:00', '2026-10-06T02:00:00-03:00'));

      expect(apresLaCloture.erreur()).toEqual({ kind: 'FIN_APRES_CLOTURE', cloture: instant('2026-10-06T02:00:00-03:00') });
    });

    it.each([
      {
        cas: 'before the end of the day displayed',
        jour: bornes('2026-10-05T00:00:00-03:00', '2026-10-06T08:00:00-03:00', '2026-10-07T00:00:00-03:00'),
        fin: '07:59',
      },
      {
        cas: 'after the end of the next day',
        jour: bornes('2026-10-05T00:00:00-03:00', '2026-10-06T00:00:00-03:00', '2026-10-06T23:00:00-03:00'),
        fin: '23:01',
      },
    ])('should refuse an end $cas as out of the next day', ({ jour, fin }) => {
      const horsDuLendemain = saisie('22:00', fin, plage(jour, LE_MARDI_A_DIX_HEURES)).avecFinLeLendemain();

      expect(horsDuLendemain.erreur()).toEqual({ kind: 'FIN_HORS_DU_LENDEMAIN' });
      expect(horsDuLendemain.portions()).toBeUndefined();
    });

    it('should accept an end falling exactly on the end of the next day', () => {
      const jour = bornes('2026-10-05T00:00:00-03:00', '2026-10-06T00:00:00-03:00', '2026-10-06T23:00:00-03:00');

      expect(
        saisie('22:00', '23:00', plage(jour, instant('2026-10-06T23:30:00-03:00')))
          .avecFinLeLendemain()
          .erreur(),
      ).toBeUndefined();
    });

    it('should refuse a badly written hour whatever the day of the end', () => {
      expect(saisieDeNuit('25:00', '03:30').erreur()).toEqual({ kind: 'HEURE_MAL_ECRITE' });
    });

    it('should still refuse a start out of the day displayed, and draw nothing', () => {
      const jour = bornes('2026-10-05T00:00:00+02:00', '2026-10-06T00:00:00+02:00', '2026-10-07T00:00:00+02:00');

      const debutHorsDuJour = saisie('20:00', '03:30', plage(jour, LE_MARDI_A_DIX_HEURES)).avecFinLeLendemain();

      expect(debutHorsDuJour.erreur()).toEqual({ kind: 'HORS_DU_JOUR', champ: 'DEBUT' });
      expect(debutHorsDuJour.portions()).toBeUndefined();
    });

    it('should accept an end falling exactly on the end of the day displayed, which is the start of the next day', () => {
      const finale = saisieDeNuit('22:00', '00:00');

      expect(finale.erreur()).toBeUndefined();
      expect(finale.intervalle()?.fin).toEqual(instant('2026-10-06T00:00:00-03:00'));
    });
  });

  describe('proposing to end on the next day', () => {
    const AU_MARDI_MIDI = instant('2026-10-06T12:00:00-03:00');

    const lundiSoirFinissantTot = (maintenant: InstantDeLaJournee = AU_MARDI_MIDI): PlageDAjout =>
      saisie('22:00', '03:30', plage(LUNDI_5, maintenant));

    it('should propose the next day as the end, without applying it, when the end precedes the start on the same day', () => {
      const proposante = lundiSoirFinissantTot();

      expect(proposante.finProposee()).toEqual(instant('2026-10-06T03:30:00-03:00'));
      expect(proposante.finLeLendemain()).toBe(false);
      expect(proposante.erreur()).toEqual({
        kind: 'FIN_AVANT_DEBUT_LE_MEME_JOUR',
        debut: instant('2026-10-05T22:00:00-03:00'),
        fin: instant('2026-10-05T03:30:00-03:00'),
      });
    });

    it('should leave the proposal as it was once it is applied: no more error, nothing to propose', () => {
      const appliquee = lundiSoirFinissantTot().avecFinLeLendemain();

      expect([appliquee.erreur(), appliquee.finProposee()]).toEqual([undefined, undefined]);
    });

    it('should propose nothing to a range that is coherent', () => {
      expect(saisie('08:00', '10:00').finProposee()).toBeUndefined();
    });

    it('should propose nothing while a hour is missing', () => {
      expect(saisie('22:00', '').finProposee()).toBeUndefined();
    });

    it('should propose nothing when the end is equal to the start', () => {
      expect(saisie('22:00', '22:00').finProposee()).toBeUndefined();
    });

    it('should propose nothing when the suivi is closed before the end of the next day, and say so', () => {
      const cloture = lundiSoirFinissantTot().avecSuivi(suivi('2026-10-01T08:00:00-03:00', '2026-10-06T02:00:00-03:00'));

      expect(cloture.finProposee()).toBeUndefined();
      expect(cloture.erreur()?.kind).toBe('FIN_AVANT_DEBUT_LE_MEME_JOUR');
    });

    it('should propose the next day when the suivi is closed exactly at that end', () => {
      const cloture = lundiSoirFinissantTot().avecSuivi(suivi('2026-10-01T08:00:00-03:00', '2026-10-06T03:30:00-03:00'));

      expect(cloture.finProposee()).toEqual(instant('2026-10-06T03:30:00-03:00'));
    });

    it('should propose nothing while the next day has not begun', () => {
      const attente = lundiSoirFinissantTot(instant('2026-10-05T23:00:00-03:00'));

      expect([attente.lendemainDisponible(), attente.finProposee()]).toEqual([false, undefined]);
    });

    it('should propose nothing when the end of the next day would still be in the future', () => {
      expect(lundiSoirFinissantTot(instant('2026-10-06T03:29:00-03:00')).finProposee()).toBeUndefined();
    });

    it('should propose nothing when the start is out of the day displayed', () => {
      const jour = bornes('2026-10-05T23:00:00-03:00', '2026-10-06T23:00:00-03:00', '2026-10-07T23:00:00-03:00');

      expect(saisie('22:00', '03:30', plage(jour, instant('2026-10-07T12:00:00-03:00'))).finProposee()).toBeUndefined();
    });

    it('should propose nothing when the end of the next day falls out of the next day', () => {
      const jour = bornes('2026-10-05T00:00:00-03:00', '2026-10-06T00:00:00-03:00', '2026-10-06T03:00:00-03:00');

      expect(saisie('22:00', '03:30', plage(jour, AU_MARDI_MIDI)).finProposee()).toBeUndefined();
    });
  });
});
