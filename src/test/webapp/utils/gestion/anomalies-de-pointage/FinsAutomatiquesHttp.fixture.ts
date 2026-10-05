import { components } from '@/app/generated/schema';
import {
  activiteFinAutomatiqueFixture,
  elementFinAutomatiqueFixture,
  operateurFinAutomatiqueFixture,
  ouvrantFinAutomatiqueFixture,
  posteFinAutomatiqueFixture,
  suiviFinAutomatiqueFixture,
} from './FinAutomatiqueHttp.fixture';

export const finAutomatiqueLigneFixture: components['schemas']['RestFinAutomatiqueEnListe'] = {
  nature: 'FIN_AUTOMATIQUE',
  activite: activiteFinAutomatiqueFixture,
  adresse: { suivi: suiviFinAutomatiqueFixture, pointage: ouvrantFinAutomatiqueFixture },
  revision: 0,
  elementId: elementFinAutomatiqueFixture,
  designation: 'OF M24-0655',
  operateurId: operateurFinAutomatiqueFixture,
  operateur: { id: operateurFinAutomatiqueFixture, nom: 'Dupont', prenom: 'Jean' },
  posteId: posteFinAutomatiqueFixture,
  poste: { id: posteFinAutomatiqueFixture, libelle: 'Fraiseuse 1' },
  debut: new Date(2026, 0, 1, 9, 26).toISOString(),
  echeance: new Date(2026, 0, 1, 22, 26).toISOString(),
};

export const pageFinsAutomatiquesFixture = (
  lignes: components['schemas']['RestFinAutomatiqueEnListe'][] = [finAutomatiqueLigneFixture],
): components['schemas']['RestPageDesAnomalies'] => ({ lignes, total: lignes.length, complete: true, page: 0, size: 5 });
