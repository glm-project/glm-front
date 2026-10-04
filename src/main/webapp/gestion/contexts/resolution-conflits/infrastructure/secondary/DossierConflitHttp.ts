import { components } from '@/app/generated/schema';
import { SaisieActe } from '../../domain/acte/SaisieActe';
import { ActiviteConflitId } from '../../domain/dossier/ActiviteConflitId';
import { ActiviteConflit, ChoixGuide, DiagnosticConflit, DossierConflit, PointageConflit } from '../../domain/dossier/DossierConflit';
import { ElementConflitId } from '../../domain/dossier/ElementConflitId';
import { PointageConflitId } from '../../domain/dossier/PointageConflitId';
import { SuiviConflitId } from '../../domain/dossier/SuiviConflitId';

export const toLigne = (ligne: components['schemas']['RestConflitEnListe']) => ({
  adresse: {
    suivi: new SuiviConflitId(ligne.adresse.suivi),
    pointage: new PointageConflitId(ligne.adresse.pointage),
  },
  element: new ElementConflitId(ligne.elementId),
  designation: ligne.designation,
  operateur: ligne.operateur === undefined ? '' : `${ligne.operateur.prenom} ${ligne.operateur.nom}`,
  operateurId: ligne.operateurId,
  poste: ligne.poste?.libelle ?? '',
  ...(ligne.posteId === undefined ? {} : { posteId: ligne.posteId }),
  date: ligne.datePremierPointage,
  explication: '',
  nombrePointages: ligne.nombrePointages,
});

export const toPointage = (pointage: components['schemas']['RestEvenementDAtelier']): PointageConflit => ({
  id: new PointageConflitId(pointage.id),
  fait: {
    type: pointage.type,
    intention: pointage.intention,
    activiteVisee: pointage.cible ?? '',
    operateur: pointage.operateurId,
    poste: pointage.posteId ?? '',
    instant: pointage.dateDeSurvenue,
  },
  auteur: pointage.auteur,
  enregistre: pointage.dateDEnregistrement,
  regularisation: pointage.estUneRegularisation,
  ...(pointage.activite === undefined ? {} : { activiteCreee: new ActiviteConflitId(pointage.activite) }),
  ...(pointage.remplace === undefined ? {} : { remplace: new PointageConflitId(pointage.remplace) }),
  ...(pointage.annulation === undefined
    ? {}
    : {
        annulation: {
          motif: pointage.annulation.motif,
          auteur: pointage.annulation.auteur,
          instant: pointage.annulation.date,
        },
      }),
});

const isFinishedWithoutDuration = (activite: components['schemas']['RestActiviteDuDossier']): boolean =>
  (activite.etat === 'TERMINEE' || activite.etat === 'ECHUE') && activite.duree === undefined;

const toActivite = (activite: components['schemas']['RestActiviteDuDossier']): ActiviteConflit => {
  if (isFinishedWithoutDuration(activite)) throw new Error('Durée définitive de l’activité absente.');
  return {
    id: new ActiviteConflitId(activite.activite),
    libelle: '',
    etat: activite.etat,
    temps: '',
    periode: {
      categorie: activite.categorie,
      debut: activite.debut,
      ...(activite.fin === undefined ? {} : { fin: activite.fin }),
      ...(activite.duree === undefined ? {} : { duree: activite.duree }),
    },
  };
};

const toDiagnostic = (diagnostic: components['schemas']['RestDiagnosticDeConflit']): DiagnosticConflit => ({
  pointage: new PointageConflitId(diagnostic.pointage),
  raison: diagnostic.raison,
  cible: {
    activite: new ActiviteConflitId(diagnostic.cible.activite),
    ...(diagnostic.cible.ouvrant === undefined ? {} : { ouvrant: new PointageConflitId(diagnostic.cible.ouvrant) }),
    ...(diagnostic.cible.termineePar === undefined ? {} : { termineePar: new PointageConflitId(diagnostic.cible.termineePar) }),
  },
});

const isSupportedGuide = (choix: components['schemas']['RestChoixDeResolution']): boolean =>
  (choix.code === 'ANNULER_TRANSITION' && choix.kind === 'ANNULATION')
  || (choix.code === 'RATTACHER_FIN_A_ACTIVITE_REMPLACANTE' && choix.kind === 'CORRECTION');

const toSaisie = (choix: components['schemas']['RestChoixDeResolution']): SaisieActe => {
  if (!isSupportedGuide(choix)) throw new Error('Proposition guidée incohérente.');
  if (choix.kind === 'ANNULATION') return SaisieActe.cancel(choix.pointage);
  const fait = choix.fait;
  if (fait === undefined) throw new Error('Fait de la proposition guidée absent.');
  return SaisieActe.correct(choix.pointage, {
    type: fait.type,
    intention: fait.intention,
    activiteVisee: fait.activiteVisee ?? '',
    operateur: fait.operateur,
    poste: fait.poste ?? '',
    instant: fait.instant,
  });
};

const toChoix = (choix: components['schemas']['RestChoixDeResolution']): ChoixGuide => ({
  id: `${choix.code}:${choix.pointage}`,
  code: choix.code,
  libelle: '',
  explication: '',
  saisie: toSaisie(choix),
});

export const toDossier = (
  dossier: components['schemas']['RestDossierConflit'],
  sequence: components['schemas']['RestSequenceDuDossier'] | undefined = dossier.sequence,
): DossierConflit => {
  if (sequence === undefined) throw new Error('Séquence du dossier absente.');
  return {
    ligne: toLigne({
      ...sequence,
      adresse: dossier.adresse,
      revision: dossier.revision,
      elementId: dossier.suivi.element,
      designation: dossier.suivi.nom,
    }),
    version: dossier.revision,
    enConflit: dossier.enConflit,
    cloture: dossier.suivi.clotureLe !== undefined,
    ...(dossier.suivi.clotureLe === undefined ? {} : { finCloture: dossier.suivi.clotureLe }),
    engagement: dossier.suivi.engageLe,
    journal: dossier.suivi.journal.map(toPointage),
    activites: dossier.activites.map(toActivite),
    diagnostics: dossier.diagnostics.map(toDiagnostic),
    choix: dossier.choix.map(toChoix),
    consequences: [],
    continuations: [],
  };
};

export const toDossierDansPerimetre = (dossier: components['schemas']['RestDossierConflit']): DossierConflit => {
  const perimetre = dossier.perimetre;
  if (perimetre === undefined) throw new Error('Périmètre du dossier absent.');
  return toDossier(dossier, perimetre);
};
