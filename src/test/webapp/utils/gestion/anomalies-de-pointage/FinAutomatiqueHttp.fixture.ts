import { components } from '@/app/generated/schema';
import { instantLocalFixture } from './InstantLocal.fixture';
import { interceptOperateurs } from './ReferentielHttp.fixture';

export const suiviFinAutomatiqueFixture = '71000000-0000-0000-0000-000000000001';
export const ouvrantFinAutomatiqueFixture = '71000000-0000-0000-0000-000000000002';
export const operateurFinAutomatiqueFixture = '71000000-0000-0000-0000-000000000004';
export const posteFinAutomatiqueFixture = '71000000-0000-0000-0000-000000000005';
export const elementFinAutomatiqueFixture = '71000000-0000-0000-0000-000000000006';
export const activiteFinAutomatiqueFixture = '71000000-0000-0000-0000-000000000009';
export const ouvrantSuivantFixture = '71000000-0000-0000-0000-00000000000b';
export const activiteSuivanteFixture = '71000000-0000-0000-0000-00000000000c';
const debutFinAutomatiqueFixture = instantLocalFixture(new Date(2026, 8, 14, 8, 0));
export const echeanceFinAutomatiqueLocalFixture = new Date(2026, 8, 14, 21, 0);
const echeanceFinAutomatiqueFixture = instantLocalFixture(echeanceFinAutomatiqueLocalFixture);

const ouvertureFixture = (sansPoste: boolean): components['schemas']['RestEvenementDAtelier'] => ({
  id: ouvrantFinAutomatiqueFixture,
  type: 'DEBUT',
  activite: activiteFinAutomatiqueFixture,
  dateDeSurvenue: debutFinAutomatiqueFixture,
  operateurId: operateurFinAutomatiqueFixture,
  ...(sansPoste ? {} : { posteId: posteFinAutomatiqueFixture }),
  auteur: 'camille',
  dateDEnregistrement: '2026-09-14T08:00:01Z',
  estUneRegularisation: false,
});

const activiteEchueFixture = (sansPoste: boolean): components['schemas']['RestActiviteDuDossier'] => ({
  evenement: ouvrantFinAutomatiqueFixture,
  activite: activiteFinAutomatiqueFixture,
  operateurId: operateurFinAutomatiqueFixture,
  ...(sansPoste ? {} : { posteId: posteFinAutomatiqueFixture }),
  categorie: 'TRAVAIL',
  debut: debutFinAutomatiqueFixture,
  fin: echeanceFinAutomatiqueFixture,
  duree: 'PT13H',
});

export const dossierFinAutomatiqueFixture = (sansPoste = false): components['schemas']['RestDossierAnomalie'] => ({
  adresse: { suivi: suiviFinAutomatiqueFixture, pointage: ouvrantFinAutomatiqueFixture },
  revision: 0,
  evaluation: '2026-09-14T22:00:00Z',
  activite: activiteEchueFixture(sansPoste),
  pointages: [ouvertureFixture(sansPoste)],
});

export const givenTheReferentielFinAutomatique = (): void => {
  interceptOperateurs([
    {
      id: operateurFinAutomatiqueFixture,
      identifiant: '007',
      prenom: 'Camille',
      nom: 'Martin',
      natures: ['fraisage'],
      postes: [{ id: posteFinAutomatiqueFixture, libelle: 'DMU 50', nature: 'fraisage' }],
    },
  ]);
};
