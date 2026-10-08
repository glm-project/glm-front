import { components } from '@/app/generated/schema';
import { instantLocalFixture, instantLocalWithOffsetFixture } from './InstantLocal.fixture';
import { interceptReferentiel } from './ReferentielHttp.fixture';

export const suiviFinAutomatiqueFixture = '71000000-0000-0000-0000-000000000001';
export const ouvrantFinAutomatiqueFixture = '71000000-0000-0000-0000-000000000002';
export const finTardiveFixture = '71000000-0000-0000-0000-000000000003';
export const operateurFinAutomatiqueFixture = '71000000-0000-0000-0000-000000000004';
export const posteFinAutomatiqueFixture = '71000000-0000-0000-0000-000000000005';
export const elementFinAutomatiqueFixture = '71000000-0000-0000-0000-000000000006';
export const finRegulariseeFixture = '71000000-0000-0000-0000-000000000007';
export const finCorrigeeFixture = '71000000-0000-0000-0000-000000000008';
export const activiteFinAutomatiqueFixture = '71000000-0000-0000-0000-000000000009';
export const passageFinAutomatiqueFixture = '71000000-0000-0000-0000-00000000000a';
export const ouvrantSuivantFixture = '71000000-0000-0000-0000-00000000000b';
export const activiteSuivanteFixture = '71000000-0000-0000-0000-00000000000c';
export const debutSuivantFixture = instantLocalFixture(new Date(2026, 8, 14, 9, 0));
export const echeanceSuivanteFixture = instantLocalFixture(new Date(2026, 8, 14, 22, 0));
export const debutFinAutomatiqueFixture = instantLocalFixture(new Date(2026, 8, 14, 8, 0));
export const echeanceFinAutomatiqueLocalFixture = new Date(2026, 8, 14, 21, 0);
export const echeanceFinAutomatiqueFixture = instantLocalFixture(echeanceFinAutomatiqueLocalFixture);
export const instantRegulariseLocalFixture = new Date(2026, 8, 14, 17, 0);
export const instantRegulariseFixture = instantLocalFixture(instantRegulariseLocalFixture);
export const instantRegulariseSaisiFixture = instantLocalWithOffsetFixture(instantRegulariseLocalFixture);
export const instantTardifLocalFixture = new Date(2026, 8, 14, 23, 0);
export const instantTardifFixture = instantLocalFixture(instantTardifLocalFixture);
export const instantTardifLendemainFixture = instantLocalFixture(new Date(2026, 8, 15, 10, 0));
export const motifFinAutomatiqueFixture = 'Fin tardive confirmée avec l’opérateur';

const adresseFixture = { suivi: suiviFinAutomatiqueFixture, pointage: ouvrantFinAutomatiqueFixture };
const adresseSuivanteFixture = { suivi: suiviFinAutomatiqueFixture, pointage: ouvrantSuivantFixture };

const ouvertureFixture = (sansPoste = false): components['schemas']['RestEvenementDAtelier'] => ({
  id: ouvrantFinAutomatiqueFixture,
  type: 'DEBUT',
  intention: 'OUVERTURE',
  activite: activiteFinAutomatiqueFixture,
  dateDeSurvenue: debutFinAutomatiqueFixture,
  operateurId: operateurFinAutomatiqueFixture,
  ...(sansPoste ? {} : { posteId: posteFinAutomatiqueFixture }),
  auteur: 'camille',
  dateDEnregistrement: '2026-09-14T08:00:01Z',
  estUneRegularisation: false,
});

const finTardiveRecueFixture: components['schemas']['RestEvenementDAtelier'] = {
  id: finTardiveFixture,
  type: 'FIN',
  intention: 'FIN',
  cible: activiteFinAutomatiqueFixture,
  dateDeSurvenue: instantTardifFixture,
  operateurId: operateurFinAutomatiqueFixture,
  posteId: posteFinAutomatiqueFixture,
  auteur: 'camille',
  dateDEnregistrement: '2026-09-14T23:00:01Z',
  estUneRegularisation: false,
};

const perimetreFixture = (pointages: string[]): components['schemas']['RestSequenceDuDossier'] => ({
  operateurId: operateurFinAutomatiqueFixture,
  posteId: posteFinAutomatiqueFixture,
  datePremierPointage: debutFinAutomatiqueFixture,
  activites: [activiteFinAutomatiqueFixture],
  pointages,
  nombrePointages: pointages.length,
});

const suiviFixture = (journal: components['schemas']['RestEvenementDAtelier'][]): components['schemas']['RestSuiviDAtelier'] => ({
  id: suiviFinAutomatiqueFixture,
  element: elementFinAutomatiqueFixture,
  nom: 'M24-0655',
  categorie: 'OF',
  type: 'ORDRE_DE_FABRICATION',
  engageLe: '2026-09-14T06:00:00Z',
  engagePar: 'gestionnaire',
  etat: 'EN_COURS',
  activitesEnCours: [],
  conflits: [],
  journal,
});

const activiteEchueFixture = (sansPoste: boolean): components['schemas']['RestActiviteDuDossier'] => ({
  evenement: ouvrantFinAutomatiqueFixture,
  activite: activiteFinAutomatiqueFixture,
  operateurId: operateurFinAutomatiqueFixture,
  ...(sansPoste ? {} : { posteId: posteFinAutomatiqueFixture }),
  categorie: 'TRAVAIL',
  debut: debutFinAutomatiqueFixture,
  fin: echeanceFinAutomatiqueFixture,
  etat: 'ECHUE',
  duree: 'PT13H',
});

const activiteTermineeFixture = (instant: string, duree: string, sansPoste: boolean): components['schemas']['RestActiviteDuDossier'] => ({
  ...activiteEchueFixture(sansPoste),
  fin: instant,
  etat: 'TERMINEE',
  duree,
});

export const finARegulariserFixture = (sansPoste = false): components['schemas']['RestFaitARegulariser'] => ({
  type: 'FIN',
  intention: 'FIN',
  activiteVisee: activiteFinAutomatiqueFixture,
  operateur: operateurFinAutomatiqueFixture,
  ...(sansPoste ? {} : { poste: posteFinAutomatiqueFixture }),
});

export const dossierFinAutomatiqueFixture = (sansPoste = false): components['schemas']['RestDossierAnomalie'] => ({
  kind: 'FIN_AUTOMATIQUE',
  enConflit: false,
  finAutomatique: true,
  adresse: adresseFixture,
  revision: 0,
  evaluation: '2026-09-14T22:00:00Z',
  perimetre: perimetreFixture([ouvrantFinAutomatiqueFixture]),
  suivi: suiviFixture([ouvertureFixture(sansPoste)]),
  activites: [activiteEchueFixture(sansPoste)],
  diagnostics: [],
  choix: [
    { code: 'REGULARISER_FIN', kind: 'REGULARISATION', pointage: ouvrantFinAutomatiqueFixture, fait: finARegulariserFixture(sansPoste) },
  ],
  continuations: [],
});

const choixRegulariserFinFixture = (pointage: string, activite: string): components['schemas']['RestChoixDeResolution'] => ({
  code: 'REGULARISER_FIN',
  kind: 'REGULARISATION',
  pointage,
  fait: { ...finARegulariserFixture(), activiteVisee: activite },
});

export const dossierFinAutomatiqueEtConflitFixture = (): components['schemas']['RestDossierAnomalie'] => {
  const dossier = dossierFinAutomatiqueFixture();
  const passage: components['schemas']['RestEvenementDAtelier'] = {
    ...finTardiveRecueFixture,
    id: passageFinAutomatiqueFixture,
    type: 'NON_CONFORMITE',
    intention: 'TRANSITION',
    dateDeSurvenue: instantLocalFixture(new Date(2026, 8, 14, 12, 0)),
  };
  return {
    ...dossier,
    perimetre: perimetreFixture([ouvrantFinAutomatiqueFixture, passageFinAutomatiqueFixture]),
    suivi: suiviFixture([ouvertureFixture(), passage]),
    choix: [...(dossier.choix ?? []), { code: 'ANNULER_TRANSITION', kind: 'ANNULATION', pointage: passageFinAutomatiqueFixture }],
  };
};

const ouvertureSuivanteFixture: components['schemas']['RestEvenementDAtelier'] = {
  ...ouvertureFixture(),
  id: ouvrantSuivantFixture,
  activite: activiteSuivanteFixture,
  dateDeSurvenue: debutSuivantFixture,
  dateDEnregistrement: '2026-09-14T09:00:01Z',
};

const activiteSuivanteEchueFixture: components['schemas']['RestActiviteDuDossier'] = {
  ...activiteEchueFixture(false),
  evenement: ouvrantSuivantFixture,
  activite: activiteSuivanteFixture,
  debut: debutSuivantFixture,
  fin: echeanceSuivanteFixture,
  duree: 'PT13H',
};

export const dossierDeuxFinsAutomatiquesFixture = (
  ancre: 'PREMIERE' | 'SUIVANTE' = 'PREMIERE',
): components['schemas']['RestDossierAnomalie'] => {
  const dossier = dossierFinAutomatiqueFixture();
  const premiere = ancre === 'PREMIERE';
  return {
    ...dossier,
    adresse: premiere ? adresseFixture : adresseSuivanteFixture,
    perimetre: perimetreFixture([ouvrantFinAutomatiqueFixture, ouvrantSuivantFixture]),
    suivi: suiviFixture([ouvertureFixture(), ouvertureSuivanteFixture]),
    activites: [activiteEchueFixture(false), activiteSuivanteEchueFixture],
    choix: [
      premiere
        ? choixRegulariserFinFixture(ouvrantFinAutomatiqueFixture, activiteFinAutomatiqueFixture)
        : choixRegulariserFinFixture(ouvrantSuivantFixture, activiteSuivanteFixture),
    ],
  };
};

export const dossierFinTardiveFixture = (
  code: 'CORRIGER_FIN_TARDIVE' | 'CORRIGER_TRANSITION_TARDIVE' = 'CORRIGER_FIN_TARDIVE',
  instantTardif = instantTardifFixture,
): components['schemas']['RestDossierAnomalie'] => {
  const transition = code === 'CORRIGER_TRANSITION_TARDIVE';
  const type = transition ? 'NON_CONFORMITE' : 'FIN';
  const intention = transition ? 'TRANSITION' : 'FIN';
  return {
    ...dossierFinAutomatiqueFixture(),
    perimetre: perimetreFixture([ouvrantFinAutomatiqueFixture, finTardiveFixture]),
    suivi: suiviFixture([ouvertureFixture(), { ...finTardiveRecueFixture, dateDeSurvenue: instantTardif, type, intention }]),
    choix: [
      {
        code,
        kind: 'CORRECTION',
        pointage: finTardiveFixture,
        fait: {
          type,
          intention,
          activiteVisee: activiteFinAutomatiqueFixture,
          operateur: operateurFinAutomatiqueFixture,
          poste: posteFinAutomatiqueFixture,
          instant: instantTardif,
        },
      },
    ],
  };
};

export const dossierFinTardiveLeLendemainFixture = (): components['schemas']['RestDossierAnomalie'] =>
  dossierFinTardiveFixture('CORRIGER_FIN_TARDIVE', instantTardifLendemainFixture);

export const dossierApresRegularisationFixture = (sansPoste = false): components['schemas']['RestDossierAnomalie'] => {
  const regularisation: components['schemas']['RestEvenementDAtelier'] = {
    id: finRegulariseeFixture,
    type: 'FIN',
    intention: 'FIN',
    cible: activiteFinAutomatiqueFixture,
    dateDeSurvenue: instantRegulariseFixture,
    operateurId: operateurFinAutomatiqueFixture,
    ...(sansPoste ? {} : { posteId: posteFinAutomatiqueFixture }),
    auteur: 'gestionnaire',
    dateDEnregistrement: '2026-09-14T22:00:01Z',
    estUneRegularisation: true,
  };
  return {
    ...dossierFinAutomatiqueFixture(sansPoste),
    kind: 'SANS_ANOMALIE',
    finAutomatique: false,
    revision: 1,
    perimetre: perimetreFixture([ouvrantFinAutomatiqueFixture, finRegulariseeFixture]),
    suivi: suiviFixture([ouvertureFixture(sansPoste), regularisation]),
    activites: [activiteTermineeFixture(instantRegulariseFixture, 'PT9H', sansPoste)],
    choix: [],
  };
};

export const dossierApresRegularisationLaissantUneFinFixture = (): components['schemas']['RestDossierAnomalie'] => ({
  ...dossierDeuxFinsAutomatiquesFixture(),
  revision: 1,
  activites: [activiteTermineeFixture(instantRegulariseFixture, 'PT9H', false), activiteSuivanteEchueFixture],
  choix: [],
});

export const dossierApresCorrectionFixture = (): components['schemas']['RestDossierAnomalie'] => {
  const finAnnulee: components['schemas']['RestEvenementDAtelier'] = {
    ...finTardiveRecueFixture,
    annulation: { motif: motifFinAutomatiqueFixture, auteur: 'gestionnaire', date: '2026-09-14T23:30:00Z' },
  };
  const finCorrigee: components['schemas']['RestEvenementDAtelier'] = {
    ...finTardiveRecueFixture,
    id: finCorrigeeFixture,
    auteur: 'gestionnaire',
    dateDEnregistrement: '2026-09-14T23:30:00Z',
    estUneRegularisation: true,
    remplace: finTardiveFixture,
  };
  return {
    ...dossierFinAutomatiqueFixture(),
    kind: 'SANS_ANOMALIE',
    finAutomatique: false,
    revision: 2,
    perimetre: perimetreFixture([ouvrantFinAutomatiqueFixture, finTardiveFixture, finCorrigeeFixture]),
    suivi: suiviFixture([ouvertureFixture(), finAnnulee, finCorrigee]),
    activites: [activiteTermineeFixture(instantTardifFixture, 'PT15H', false)],
    choix: [],
  };
};

export const apercuFixture = (
  demande: components['schemas']['RestDemandeDApercu'],
  avant: components['schemas']['RestDossierAnomalie'],
  apres: components['schemas']['RestDossierAnomalie'],
  evenement: string,
): components['schemas']['RestApercuDeResolution'] => ({
  commande: demande.commande,
  adresse: adresseFixture,
  revision: avant.revision,
  evaluation: '2026-09-14T22:00:00Z',
  empreinteConsequences: 'empreinte-fin-automatique',
  evenement,
  acte: demande.acte,
  avant,
  apres,
});

export const confirmationFinAutomatiqueFixture = (
  demande: components['schemas']['RestConfirmationAEnregistrer'],
  dossier: components['schemas']['RestDossierAnomalie'],
): components['schemas']['RestConfirmationEnregistree'] => ({
  kind: 'ENREGISTREE',
  recu: {
    commande: demande.commande,
    adresse: adresseFixture,
    acte: demande.acte,
    revisionDeDepart: demande.revision,
    revisionEnregistree: dossier.revision,
    enregistreLe: '2026-09-14T22:00:01Z',
    ...(demande.evenement === undefined ? {} : { evenementCree: demande.evenement }),
    evenementsTouches: demande.evenement === undefined ? [] : [demande.evenement],
  },
  dossier,
});

export const givenTheReferentielFinAutomatique = (): void => {
  interceptReferentiel(
    [
      {
        id: operateurFinAutomatiqueFixture,
        identifiant: '007',
        prenom: 'Camille',
        nom: 'Martin',
        natures: ['fraisage'],
        postes: [{ id: posteFinAutomatiqueFixture, libelle: 'DMU 50', nature: 'fraisage' }],
      },
    ],
    [{ id: posteFinAutomatiqueFixture, libelle: 'DMU 50', nature: 'fraisage' }],
  );
};
