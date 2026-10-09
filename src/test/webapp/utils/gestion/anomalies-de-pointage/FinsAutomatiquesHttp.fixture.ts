import { components } from '@/app/generated/schema';
import {
  activiteFinAutomatiqueFixture,
  elementFinAutomatiqueFixture,
  operateurFinAutomatiqueFixture,
  ouvrantFinAutomatiqueFixture,
  posteFinAutomatiqueFixture,
  suiviFinAutomatiqueFixture,
} from './FinAutomatiqueHttp.fixture';
import { interceptElements, interceptOperateurs } from './ReferentielHttp.fixture';

export const finAutomatiqueLigneFixture: components['schemas']['RestFinAutomatiqueEnListe'] = {
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
): components['schemas']['PageRestFinAutomatiqueEnListe'] => ({
  content: lignes,
  currentPage: 0,
  pageSize: 5,
  totalElementsCount: lignes.length,
});

export const autreOperateurFinAutomatiqueFixture = '71000000-0000-0000-0000-000000000009';
export const autreElementFinAutomatiqueFixture = '71000000-0000-0000-0000-000000000010';

export const givenTheReferentielFinsAutomatiques = (): void => {
  interceptOperateurs([
    { id: operateurFinAutomatiqueFixture, prenom: 'Jean', nom: 'Dupont', natures: ['fraisage'], postes: [] },
    { id: autreOperateurFinAutomatiqueFixture, identifiant: '012', prenom: 'Alex', nom: 'Durand', natures: ['tournage'], postes: [] },
  ]);
};

export const givenTheElementsFinsAutomatiques = (): void => {
  interceptElements([
    { id: elementFinAutomatiqueFixture, nom: 'OF M24-0655', categorie: 'OF' },
    { id: autreElementFinAutomatiqueFixture, nom: 'Bielle', reference: 'B-12', categorie: 'MOULE' },
  ]);
};
