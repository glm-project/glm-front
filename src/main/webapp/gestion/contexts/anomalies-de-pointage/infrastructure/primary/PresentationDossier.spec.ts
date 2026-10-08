import {
  activiteEchueFixture,
  ARRET_FIXTURE,
  faitFixture,
  instantDuJourFixture,
  pointageFixture,
} from '@test/unit/fixtures/gestion/anomalies-de-pointage/DossierAnomalie.fixture';
import { describe, expect, it } from 'vitest';
import { ActiviteAnomalieId } from '../../domain/dossier/ActiviteAnomalieId';
import { ActiviteAnomalie, PointageAnomalie } from '../../domain/dossier/DossierAnomalie';
import {
  defini,
  detailDuPointage,
  erreursALire,
  gesteDuPointage,
  heureDe,
  intituleDeLActivite,
  libelleActivite,
  libelleCategorie,
  libelleDuGeste,
  remplacementDe,
  tempsActivite,
} from './PresentationDossier';

const NOW = new Date(2026, 9, 5, 10, 0);
const OUVERTURE = { type: 'DEBUT', intention: 'OUVERTURE' } as const;

const activiteFixture = (changement: Partial<ActiviteAnomalie> = {}): ActiviteAnomalie => ({
  ...activiteEchueFixture('travail-8', 'TRAVAIL', '08:00', '18:00'),
  ...changement,
});

const sansPeriode = ({ id, libelle, etat, temps, ouvrant }: ActiviteAnomalie): ActiviteAnomalie => ({ id, libelle, etat, temps, ouvrant });

describe('Name of a fact outside the five gestures', () => {
  it.each([
    { type: 'FIN', intention: 'OUVERTURE', libelle: 'Fin · Ouverture' },
    { type: 'DEBUT', intention: '', libelle: 'Travail' },
    { type: '', intention: 'OUVERTURE', libelle: 'Ouverture' },
    { type: '', intention: '', libelle: '' },
  ] as const)('should name the type "$type" with the intention "$intention" as "$libelle"', ({ type, intention, libelle }) => {
    expect(libelleDuGeste({ type, intention })).toBe(libelle);
  });

  it('should name the five gestures by the button the operator pressed', () => {
    expect(libelleDuGeste({ type: 'FIN', intention: 'FIN' })).toBe('Arrêt');
  });
});

describe('Hour of an instant', () => {
  it('should be the local hour and minute of a readable instant', () => {
    expect(heureDe(instantDuJourFixture('08:05'))).toBe('08:05');
  });

  it('should be the text itself when it is not an instant', () => {
    expect(heureDe('pas un instant')).toBe('pas un instant');
  });
});

describe('Errors of an entry the manager has to read', () => {
  it('should hide the missing intention while the type is missing too', () => {
    expect(erreursALire(['TYPE_REQUIS', 'INTENTION_REQUISE', 'MOTIF_REQUIS'])).toEqual(['TYPE_REQUIS', 'MOTIF_REQUIS']);
  });

  it('should keep the missing intention when the type is entered', () => {
    expect(erreursALire(['INTENTION_REQUISE'])).toEqual(['INTENTION_REQUISE']);
  });
});

describe('Gesture in a sentence', () => {
  it.each([
    { geste: 'Arrêt', attendu: 'l’arrêt' },
    { geste: 'Passage en NC', attendu: 'le passage en NC' },
  ])('should write $geste with its definite article', ({ geste, attendu }) => {
    expect(defini(geste)).toBe(attendu);
  });

  it('should say a regularised pointage is regularised', () => {
    const pointage = pointageFixture('fin-17', faitFixture(ARRET_FIXTURE, instantDuJourFixture('17:00')), { regularisation: true });

    expect(gesteDuPointage(pointage)).toBe('Arrêt régularisé');
  });

  it('should name a received pointage by its gesture only', () => {
    const pointage = pointageFixture('fin-17', faitFixture(ARRET_FIXTURE, instantDuJourFixture('17:00')));

    expect(gesteDuPointage(pointage)).toBe('Arrêt');
  });
});

describe('Label of an activity', () => {
  it.each([
    { categorie: 'TRAVAIL' as const, libelle: 'Travail' },
    { categorie: 'NON_CONFORMITE' as const, libelle: 'Non-conformité' },
  ])('should name the category $categorie as $libelle', ({ categorie, libelle }) => {
    expect(libelleCategorie(categorie)).toBe(libelle);
  });

  it('should be named by its category when its period is known', () => {
    expect(intituleDeLActivite(activiteFixture())).toBe('Travail');
  });

  it('should be named by its received label when its period is unknown', () => {
    expect(intituleDeLActivite({ ...sansPeriode(activiteFixture()), libelle: 'Travail ouvert à 8 h' })).toBe('Travail ouvert à 8 h');
  });

  it('should tell the start and the end of a finished activity', () => {
    expect(libelleActivite(activiteFixture(), NOW)).toBe('Travail · lundi 14 septembre à 08:00 → lundi 14 septembre à 18:00');
  });

  it('should tell only the start of an activity with no received end', () => {
    const periode = { categorie: 'TRAVAIL' as const, debut: instantDuJourFixture('08:00') };

    expect(libelleActivite(activiteFixture({ periode }), NOW)).toBe('Travail · lundi 14 septembre à 08:00');
  });

  it('should be the received label when its period is unknown', () => {
    expect(libelleActivite({ ...sansPeriode(activiteFixture()), libelle: 'Travail ouvert à 8 h' }, NOW)).toBe('Travail ouvert à 8 h');
  });
});

describe('Time of an activity', () => {
  it('should not be definitive while the activity is running', () => {
    expect(tempsActivite(activiteFixture({ etat: 'EN_COURS' }))).toBe('Temps non définitif');
  });

  it.each([
    { temps: '', attendu: 'Temps à résoudre' },
    { temps: 'Temps reçu', attendu: 'Temps reçu' },
  ])('should be "$attendu" while the activity is to be resolved with the time "$temps"', ({ temps, attendu }) => {
    expect(tempsActivite(activiteFixture({ etat: 'A_RESOUDRE', temps }))).toBe(attendu);
  });

  it('should be the received time when no duration was received', () => {
    expect(tempsActivite({ ...sansPeriode(activiteFixture()), temps: 'Temps reçu' })).toBe('Temps reçu');
  });

  it('should be the duration itself when it cannot be read', () => {
    const periode = { categorie: 'TRAVAIL' as const, debut: instantDuJourFixture('08:00'), duree: 'treize heures' };

    expect(tempsActivite(activiteFixture({ periode }))).toBe('treize heures');
  });

  it.each([
    { duree: 'PT13H', attendu: '13 h' },
    { duree: 'PT5H1M', attendu: '5 h 1 min' },
    { duree: 'PT45M', attendu: '45 min' },
    { duree: 'PT1M7.5S', attendu: '1 min 7,5 s' },
  ])('should write the duration $duree as $attendu', ({ duree, attendu }) => {
    const periode = { categorie: 'TRAVAIL' as const, debut: instantDuJourFixture('08:00'), duree };

    expect(tempsActivite(activiteFixture({ periode }))).toBe(attendu);
  });
});

describe('Replacement named in a journal', () => {
  const journal: readonly PointageAnomalie[] = [pointageFixture('fin-17', faitFixture(ARRET_FIXTURE, instantDuJourFixture('17:00')))];

  it('should name the replaced pointage by its instant and its gesture', () => {
    expect(remplacementDe(journal, 'fin-17', NOW)).toBe('Remplace le pointage lundi 14 septembre à 17:00:00 · Arrêt');
  });

  it('should say the replaced pointage is unresolved when the journal does not hold it', () => {
    expect(remplacementDe(journal, 'fin-absente', NOW)).toBe('Remplace un pointage non résolu');
  });
});

describe('Detail of a pointage', () => {
  const ouvrant = pointageFixture('debut-8', faitFixture(OUVERTURE, instantDuJourFixture('08:00'), { activiteVisee: '' }), {
    activiteCreee: new ActiviteAnomalieId('travail-8'),
  });
  const fin = pointageFixture('fin-17', faitFixture(ARRET_FIXTURE, instantDuJourFixture('17:00')));

  it('should name the operator, the instant with its seconds and the gesture', () => {
    expect(detailDuPointage(fin, { journal: [fin] }, NOW)).toEqual({
      entete: 'Camille Martin · lundi 14 septembre à 17:00:00',
      geste: 'Arrêt',
      cible: 'Activité non résolue',
    });
  });

  it('should name the activity it aims at by its period when the dossier holds it', () => {
    const detail = detailDuPointage(fin, { journal: [fin], activites: [activiteFixture()] }, NOW);

    expect(detail.cible).toBe('Travail · lundi 14 septembre à 08:00 → lundi 14 septembre à 18:00');
  });

  it('should name the activity it aims at by the pointage that created it when the dossier does not hold it', () => {
    const detail = detailDuPointage(fin, { journal: [ouvrant, fin] }, NOW);

    expect(detail.cible).toBe('Démarrage · lundi 14 septembre à 08:00:00');
  });

  it('should name the activity it creates', () => {
    const detail = detailDuPointage(ouvrant, { journal: [ouvrant], activites: [activiteFixture()] }, NOW);

    expect(detail.creee).toBe('Travail · lundi 14 septembre à 08:00 → lundi 14 septembre à 18:00');
    expect(detail).not.toHaveProperty('cible');
  });

  it('should name an unnamed operator as unresolved', () => {
    expect(detailDuPointage({ ...fin, operateurNom: '' }, { journal: [fin] }, NOW).entete).toBe(
      'Opérateur non résolu · lundi 14 septembre à 17:00:00',
    );
  });
});
