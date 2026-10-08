import { ApercuAnomalie } from '../../domain/acte/AnomaliesActesPorts';
import { ActiviteAnomalieId } from '../../domain/dossier/ActiviteAnomalieId';
import { ActiviteAnomalie, DossierAnomalie } from '../../domain/dossier/DossierAnomalie';
import { PointageAnomalieId } from '../../domain/dossier/PointageAnomalieId';
import { SuiviAnomalieId } from '../../domain/dossier/SuiviAnomalieId';
import { resumeDeLApercu } from './ResumeDeLApercu';

const ADRESSE_FIXTURE = { suivi: new SuiviAnomalieId('suivi-1'), pointage: new PointageAnomalieId('debut-8') };

const activiteFixture = (ouvrant: string, etat: ActiviteAnomalie['etat'], duree: string): ActiviteAnomalie => ({
  id: new ActiviteAnomalieId(`travail-${ouvrant}`),
  libelle: '',
  etat,
  temps: '',
  ouvrant: new PointageAnomalieId(ouvrant),
  periode: { categorie: 'TRAVAIL', debut: '2026-09-14T08:00:00-03:00', fin: '2026-09-14T21:00:00-03:00', duree },
});

type DossierDuResume = Pick<DossierAnomalie, 'etat' | 'enConflit' | 'finAutomatique' | 'activites'> & {
  readonly ligne: Pick<DossierAnomalie['ligne'], 'adresse'>;
};

const dossierFixture = (changement: Partial<DossierDuResume>): DossierAnomalie =>
  ({
    etat: 'FIN_AUTOMATIQUE',
    enConflit: false,
    finAutomatique: false,
    ligne: { adresse: ADRESSE_FIXTURE },
    activites: [],
    ...changement,
  }) as DossierAnomalie;

const apercuFixture = (avant: Partial<DossierDuResume>, apres: Partial<DossierDuResume>, visee = 'travail-debut-8'): ApercuAnomalie =>
  ({
    acte: { kind: 'REGULARISATION', fait: { activiteVisee: visee } },
    avant: dossierFixture(avant),
    apres: dossierFixture(apres),
  }) as ApercuAnomalie;

const avantFixture = { finAutomatique: true, activites: [activiteFixture('debut-8', 'ECHUE', 'PT13H')] };
const apresFixture = { activites: [activiteFixture('debut-8', 'TERMINEE', 'PT9H')] };

describe('One-line summary of a preview', () => {
  it('should say the time of the activity before and after the act, then that the anomaly is processed', () => {
    expect(resumeDeLApercu(apercuFixture(avantFixture, apresFixture))).toBe('Travail 13 h → 9 h · anomalie traitée');
  });

  it('should say the number of automatic ends that remain beyond the one of the address', () => {
    const apres = { finAutomatique: true, activites: [...apresFixture.activites, activiteFixture('debut-14', 'ECHUE', 'PT5H')] };

    expect(resumeDeLApercu(apercuFixture(avantFixture, apres))).toBe('Travail 13 h → 9 h · 1 fin automatique restante');
  });

  it('should pluralise the automatic ends that remain', () => {
    const autres = [activiteFixture('debut-14', 'ECHUE', 'PT5H'), activiteFixture('debut-15', 'ECHUE', 'PT6H')];

    expect(resumeDeLApercu(apercuFixture(avantFixture, { finAutomatique: true, activites: [...apresFixture.activites, ...autres] }))).toBe(
      'Travail 13 h → 9 h · 2 fins automatiques restantes',
    );
  });

  it('should say that the anomaly remains when the end of the address is still expired', () => {
    expect(resumeDeLApercu(apercuFixture(avantFixture, { finAutomatique: true, activites: avantFixture.activites }))).toBe(
      'Travail 13 h → 13 h · anomalie restante',
    );
  });

  it('should say only the outcome when the activity the act targets is absent from the dossier after the act', () => {
    expect(resumeDeLApercu(apercuFixture(avantFixture, { activites: [] }))).toBe('anomalie traitée');
  });

  it('should say only the outcome when the activity the act targets is absent from the dossier before the act', () => {
    expect(resumeDeLApercu(apercuFixture({ finAutomatique: true, activites: [] }, apresFixture))).toBe('anomalie traitée');
  });

  it('should say only the outcome of an act that targets no activity', () => {
    const apercu = {
      ...apercuFixture(avantFixture, apresFixture),
      acte: { kind: 'ANNULATION', pointage: 'debut-8', motif: 'x' },
    } as ApercuAnomalie;

    expect(resumeDeLApercu(apercu)).toBe('anomalie traitée');
  });
});
