import { FaitPropose } from '@/gestion/contexts/anomalies-de-pointage/domain/acte/ActeResolution';
import { SaisieActe } from '@/gestion/contexts/anomalies-de-pointage/domain/acte/SaisieActe';
import { ActiviteAnomalieId } from '@/gestion/contexts/anomalies-de-pointage/domain/dossier/ActiviteAnomalieId';
import {
  ActiviteAnomalie,
  ChoixGuide,
  DossierAnomalie,
  PointageAnomalie,
} from '@/gestion/contexts/anomalies-de-pointage/domain/dossier/DossierAnomalie';
import { ElementAnomalieId } from '@/gestion/contexts/anomalies-de-pointage/domain/dossier/ElementAnomalieId';
import { OperateurAnomalieId } from '@/gestion/contexts/anomalies-de-pointage/domain/dossier/OperateurAnomalieId';
import { PerimetreDuDossier } from '@/gestion/contexts/anomalies-de-pointage/domain/dossier/PerimetreDuDossier';
import { PointageAnomalieId } from '@/gestion/contexts/anomalies-de-pointage/domain/dossier/PointageAnomalieId';
import { SuiviAnomalieId } from '@/gestion/contexts/anomalies-de-pointage/domain/dossier/SuiviAnomalieId';

export const ARRET_FIXTURE = { type: 'FIN', intention: 'FIN' } as const;
export const PASSAGE_EN_NC_FIXTURE = { type: 'NON_CONFORMITE', intention: 'TRANSITION' } as const;

export const instantDuJourFixture = (heure: string, jour = 14): string => {
  const [h = '0', m = '0'] = heure.split(':');
  return new Date(2026, 8, jour, Number(h), Number(m)).toISOString();
};

export const faitFixture = (
  geste: Pick<FaitPropose, 'type' | 'intention'>,
  instant: string,
  changement: Partial<FaitPropose> = {},
): FaitPropose => ({ ...geste, activiteVisee: 'travail-8', operateur: 'op-camille', poste: 'poste-1', instant, ...changement });

export const pointageFixture = (id: string, fait: FaitPropose, changement: Partial<PointageAnomalie> = {}): PointageAnomalie => ({
  id: new PointageAnomalieId(id),
  fait,
  operateurNom: 'Camille Martin',
  posteLibelle: 'DMU 50',
  auteur: 'camille',
  enregistre: fait.instant,
  regularisation: false,
  ...changement,
});

export const activiteEchueFixture = (
  id: string,
  categorie: 'TRAVAIL' | 'NON_CONFORMITE',
  debut: string,
  fin: string,
): ActiviteAnomalie => ({
  id: new ActiviteAnomalieId(id),
  libelle: '',
  etat: 'ECHUE',
  temps: '',
  ouvrant: new PointageAnomalieId(`debut-${id}`),
  periode: { categorie, debut: instantDuJourFixture(debut), fin: instantDuJourFixture(fin), duree: 'PT10H' },
});

export const regularisationFixture = (activite: string): ChoixGuide => ({
  id: `REGULARISER_FIN:${activite}`,
  code: 'REGULARISER_FIN',
  libelle: '',
  explication: '',
  saisie: SaisieActe.regularise({ ...ARRET_FIXTURE, activiteVisee: activite, operateur: 'op-camille', poste: 'poste-1', instant: '' }),
});

export const correctionTardiveFixture = (
  code: 'CORRIGER_FIN_TARDIVE' | 'CORRIGER_TRANSITION_TARDIVE',
  pointage: string,
  fait: FaitPropose,
): ChoixGuide => ({ id: `${code}:${pointage}`, code, libelle: '', explication: '', saisie: SaisieActe.correct(pointage, fait) });

export const dossierDeFinAutomatiqueFixture = (changement: Partial<DossierAnomalie> = {}): DossierAnomalie => ({
  etat: 'FIN_AUTOMATIQUE',
  ligne: {
    adresse: { suivi: new SuiviAnomalieId('suivi-camille'), pointage: new PointageAnomalieId('debut-travail-8') },
    element: new ElementAnomalieId('moule-42'),
    designation: 'M-042',
    operateur: 'Camille Martin',
    poste: 'DMU 50',
    date: instantDuJourFixture('08:00'),
    explication: '',
    nombrePointages: 1,
  },
  version: 1,
  cloture: false,
  engagement: instantDuJourFixture('07:30'),
  operateur: new OperateurAnomalieId('op-camille'),
  journal: [],
  perimetre: new PerimetreDuDossier([]),
  activites: [activiteEchueFixture('travail-8', 'TRAVAIL', '08:00', '18:00')],
  choix: [regularisationFixture('travail-8')],
  enConflit: false,
  finAutomatique: true,
  consequences: [],
  ...changement,
});
