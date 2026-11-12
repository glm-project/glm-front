import { ActiviteEchue, DossierDeLaFin } from '@/gestion/contexts/correction-des-activites/domain/fin-automatique/DossierDeLaFin';
import { PointageDuDossierId } from '@/gestion/contexts/correction-des-activites/domain/fin-automatique/PointageDuDossierId';
import { ActiviteDeLaJourneeId } from '@/gestion/contexts/correction-des-activites/domain/journee/ActiviteDeLaJourneeId';

export const instantDuJourFixture = (heure: string, jour = 14): string => {
  const [h = '0', m = '0'] = heure.split(':');
  return new Date(2026, 8, jour, Number(h), Number(m)).toISOString();
};

export const activiteEchueFixture = (
  id: string,
  categorie: 'TRAVAIL' | 'NON_CONFORMITE',
  debut: string,
  echeance: string,
): ActiviteEchue => ({
  id: new ActiviteDeLaJourneeId(`debut-${id}`),
  ouvrant: new PointageDuDossierId(`debut-${id}`),
  categorie,
  debut: instantDuJourFixture(debut),
  echeance: instantDuJourFixture(echeance),
});

export const dossierDeFinAutomatiqueFixture = (changement: Partial<DossierDeLaFin> = {}): DossierDeLaFin => ({
  journal: [],
  activite: activiteEchueFixture('travail-8', 'TRAVAIL', '08:00', '18:00'),
  ...changement,
});
