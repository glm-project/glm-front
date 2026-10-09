import { ActiviteAnomalieId } from '@/gestion/contexts/anomalies-de-pointage/domain/dossier/ActiviteAnomalieId';
import {
  ActiviteAnomalie,
  DossierAnomalie,
  FaitDePointage,
  PointageAnomalie,
} from '@/gestion/contexts/anomalies-de-pointage/domain/dossier/DossierAnomalie';
import { OperateurAnomalieId } from '@/gestion/contexts/anomalies-de-pointage/domain/dossier/OperateurAnomalieId';
import { PointageAnomalieId } from '@/gestion/contexts/anomalies-de-pointage/domain/dossier/PointageAnomalieId';

export const ARRET_FIXTURE = { type: 'FIN' } as const;

export const instantDuJourFixture = (heure: string, jour = 14): string => {
  const [h = '0', m = '0'] = heure.split(':');
  return new Date(2026, 8, jour, Number(h), Number(m)).toISOString();
};

export const faitFixture = (
  geste: Pick<FaitDePointage, 'type'>,
  instant: string,
  changement: Partial<FaitDePointage> = {},
): FaitDePointage => ({
  ...geste,
  operateur: 'op-camille',
  instant,
  ...changement,
});

export const pointageFixture = (id: string, fait: FaitDePointage, changement: Partial<PointageAnomalie> = {}): PointageAnomalie => ({
  id: new PointageAnomalieId(id),
  fait,
  operateurNom: 'Camille Martin',
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
  ouvrant: new PointageAnomalieId(`debut-${id}`),
  periode: { categorie, debut: instantDuJourFixture(debut), fin: instantDuJourFixture(fin) },
});

export const dossierDeFinAutomatiqueFixture = (changement: Partial<DossierAnomalie> = {}): DossierAnomalie => ({
  operateur: new OperateurAnomalieId('op-camille'),
  operateurNom: 'Camille Martin',
  posteLibelle: 'DMU 50',
  echue: new ActiviteAnomalieId('travail-8'),
  debut: instantDuJourFixture('08:00'),
  journal: [],
  activites: [activiteEchueFixture('travail-8', 'TRAVAIL', '08:00', '18:00')],
  ...changement,
});
