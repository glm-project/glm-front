import { ActiviteAnomalieId } from '@/gestion/contexts/anomalies-de-pointage/domain/dossier/ActiviteAnomalieId';
import {
  ActiviteEchue,
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
  ...changement,
});

export const activiteEchueFixture = (
  id: string,
  categorie: 'TRAVAIL' | 'NON_CONFORMITE',
  debut: string,
  echeance: string,
): ActiviteEchue => ({
  id: new ActiviteAnomalieId(id),
  ouvrant: new PointageAnomalieId(`debut-${id}`),
  categorie,
  debut: instantDuJourFixture(debut),
  echeance: instantDuJourFixture(echeance),
});

export const dossierDeFinAutomatiqueFixture = (changement: Partial<DossierAnomalie> = {}): DossierAnomalie => ({
  designation: 'M24-0655',
  operateur: new OperateurAnomalieId('op-camille'),
  operateurNom: 'Camille Martin',
  posteLibelle: 'DMU 50',
  journal: [],
  activite: activiteEchueFixture('travail-8', 'TRAVAIL', '08:00', '18:00'),
  ...changement,
});
