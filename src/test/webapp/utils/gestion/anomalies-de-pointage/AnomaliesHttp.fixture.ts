import { components } from '@/app/generated/schema';
import { instantLocalFixture, instantLocalWithOffsetFixture } from './InstantLocal.fixture';
import { interceptElements, interceptReferentiel } from './ReferentielHttp.fixture';

export const suiviFixture = '70000000-0000-0000-0000-000000000001';
export const finFixture = '70000000-0000-0000-0000-000000000002';
export const operateurFixture = '70000000-0000-0000-0000-000000000003';
export const elementFixture = '70000000-0000-0000-0000-000000000004';
export const debutFixture = '70000000-0000-0000-0000-000000000005';
const ncFixture = '70000000-0000-0000-0000-000000000006';
const remplacementFixture = '70000000-0000-0000-0000-000000000007';
export const posteFixture = '70000000-0000-0000-0000-000000000008';
export const autreOperateurFixture = '70000000-0000-0000-0000-000000000009';
const autrePosteFixture = '70000000-0000-0000-0000-000000000010';
export const operateurNomFixture = 'Camille Martin';
const operateurCodeFixture = '007';
export const autreOperateurNomFixture = 'Alex Durand';
const posteLibelleFixture = 'Fraiseuse 1';
const autrePosteLibelleFixture = 'Tour 1';
export const autreElementFixture = '70000000-0000-0000-0000-000000000011';
export const elementNomFixture = 'Moule M-042';
export const elementReferenceFixture = 'M-042';
export const autreElementNomFixture = 'Bielle';
const instantDebutFixture = instantLocalFixture(new Date(2026, 8, 14, 8, 0), '123456789');
const instantNonConformiteFixture = instantLocalFixture(new Date(2026, 8, 14, 12, 0), '123456789');
const instantFinLocalFixture = new Date(2026, 8, 14, 17, 0);
const instantFinFixture = instantLocalFixture(instantFinLocalFixture, '123456789');
const instantCorrigeLocalFixture = new Date(2026, 8, 14, 17, 1);
const instantCorrigeFixture = instantLocalWithOffsetFixture(instantCorrigeLocalFixture);
const motifFixture = 'Heure et cible vérifiées avec l’opérateur';
export const correctionFixture: components['schemas']['RestActeCorrection'] = {
  kind: 'CORRECTION',
  pointage: finFixture,
  motif: motifFixture,
  fait: { type: 'FIN', intention: 'FIN', activiteVisee: ncFixture, operateur: operateurFixture, instant: instantCorrigeFixture },
};
export const ligneFixture: components['schemas']['RestConflitEnListe'] = {
  nature: 'CONFLIT',
  adresse: { suivi: suiviFixture, pointage: finFixture },
  revision: 3,
  elementId: elementFixture,
  designation: 'M-042 réel',
  operateurId: operateurFixture,
  datePremierPointage: instantDebutFixture,
  nombrePointages: 3,
};

export const journalFixture: components['schemas']['RestEvenementDAtelier'][] = [
  {
    id: debutFixture,
    type: 'DEBUT',
    intention: 'OUVERTURE',
    activite: debutFixture,
    dateDeSurvenue: instantDebutFixture,
    operateurId: operateurFixture,
    auteur: 'camille',
    dateDEnregistrement: '2026-09-15T08:00:00Z',
    estUneRegularisation: false,
  },
  {
    id: ncFixture,
    type: 'NON_CONFORMITE',
    intention: 'TRANSITION',
    activite: ncFixture,
    cible: debutFixture,
    dateDeSurvenue: instantNonConformiteFixture,
    operateurId: operateurFixture,
    auteur: 'camille',
    dateDEnregistrement: '2026-09-15T08:01:00Z',
    estUneRegularisation: false,
  },
  {
    id: finFixture,
    type: 'FIN',
    intention: 'FIN',
    cible: debutFixture,
    dateDeSurvenue: instantFinFixture,
    operateurId: operateurFixture,
    auteur: 'camille',
    dateDEnregistrement: '2026-09-15T08:02:00Z',
    estUneRegularisation: false,
  },
];

export const perimetreFixture = (corrige: boolean): components['schemas']['RestSequenceDuDossier'] => ({
  operateurId: operateurFixture,
  datePremierPointage: ligneFixture.datePremierPointage,
  activites: [debutFixture, ncFixture],
  pointages: [debutFixture, ncFixture, finFixture, ...(corrige ? [remplacementFixture] : [])],
  nombrePointages: corrige ? 4 : 3,
});

const journalCorrigeFixture = (): components['schemas']['RestEvenementDAtelier'][] => [
  ...journalFixture.map(fait =>
    fait.id === finFixture ? { ...fait, annulation: { motif: motifFixture, auteur: 'gestionnaire', date: '2026-10-04T10:00:00Z' } } : fait,
  ),
  {
    id: remplacementFixture,
    type: 'FIN',
    intention: 'FIN',
    cible: ncFixture,
    dateDeSurvenue: instantCorrigeFixture,
    operateurId: operateurFixture,
    auteur: 'gestionnaire',
    dateDEnregistrement: '2026-10-04T10:00:00Z',
    estUneRegularisation: true,
    remplace: finFixture,
  },
];

const activitesFixture = (corrige: boolean): components['schemas']['RestActiviteDuDossier'][] => [
  {
    activite: debutFixture,
    evenement: debutFixture,
    operateurId: operateurFixture,
    categorie: 'TRAVAIL',
    debut: instantDebutFixture,
    etat: corrige ? 'TERMINEE' : 'A_RESOUDRE',
    ...(corrige ? { fin: instantNonConformiteFixture, duree: 'PT4H' } : {}),
  },
  {
    activite: ncFixture,
    evenement: ncFixture,
    operateurId: operateurFixture,
    categorie: 'NON_CONFORMITE',
    debut: instantNonConformiteFixture,
    etat: corrige ? 'TERMINEE' : 'A_RESOUDRE',
    ...(corrige ? { fin: instantCorrigeFixture, duree: 'PT5H1M' } : {}),
  },
];

export const dossierFixture = (corrige = false): components['schemas']['RestDossierAnomalie'] => {
  const perimetre = perimetreFixture(corrige);
  return {
    kind: corrige ? 'ANCRE_ANNULEE' : 'EN_CONFLIT',
    enConflit: !corrige,
    finAutomatique: false,
    adresse: ligneFixture.adresse,
    revision: corrige ? 4 : 3,
    evaluation: '2026-10-04T10:00:00Z',
    perimetre,
    ...(corrige ? {} : { sequence: perimetre }),
    suivi: {
      id: suiviFixture,
      element: elementFixture,
      nom: ligneFixture.designation,
      categorie: 'MOULE',
      engageLe: '2026-09-14T06:00:00Z',
      engagePar: 'gestionnaire',
      etat: 'EN_ATTENTE',
      activitesEnCours: [],
      conflits: [],
      journal: corrige ? journalCorrigeFixture() : journalFixture,
    },
    activites: activitesFixture(corrige),
    diagnostics: corrige
      ? []
      : [
          {
            pointage: finFixture,
            raison: 'CIBLE_REMPLACEE',
            cible: { activite: debutFixture, ouvrant: debutFixture, termineePar: ncFixture },
          },
        ],
    choix: corrige
      ? []
      : [
          {
            code: 'RATTACHER_FIN_A_ACTIVITE_REMPLACANTE',
            kind: 'CORRECTION',
            pointage: finFixture,
            fait: { ...correctionFixture.fait, instant: instantFinFixture },
          },
        ],
    continuations: [],
  };
};

export const confirmationFixture = (commande: string): components['schemas']['RestConfirmationEnregistree'] => ({
  kind: 'ENREGISTREE',
  recu: {
    commande,
    adresse: ligneFixture.adresse,
    acte: correctionFixture,
    revisionDeDepart: 3,
    revisionEnregistree: 4,
    enregistreLe: '2026-10-04T10:00:00Z',
    evenementCree: remplacementFixture,
    evenementsTouches: [finFixture, remplacementFixture],
  },
  dossier: dossierFixture(true),
});

export const givenTheReferentiel = (): void => {
  interceptReferentiel(
    [
      {
        id: operateurFixture,
        identifiant: operateurCodeFixture,
        prenom: 'Camille',
        nom: 'Martin',
        natures: ['fraisage'],
        postes: [{ id: posteFixture, libelle: posteLibelleFixture, nature: 'fraisage' }],
      },
      {
        id: autreOperateurFixture,
        prenom: 'Alex',
        nom: 'Durand',
        natures: ['tournage'],
        postes: [{ id: autrePosteFixture, libelle: autrePosteLibelleFixture, nature: 'tournage' }],
      },
    ],
    [
      { id: posteFixture, libelle: posteLibelleFixture, nature: 'fraisage' },
      { id: autrePosteFixture, libelle: autrePosteLibelleFixture, nature: 'tournage' },
    ],
  );
};

export const givenTheElements = (): void => {
  interceptElements([
    { id: elementFixture, nom: elementNomFixture, reference: elementReferenceFixture, categorie: 'MOULE' },
    { id: autreElementFixture, nom: autreElementNomFixture, categorie: 'MOULE' },
  ]);
};
