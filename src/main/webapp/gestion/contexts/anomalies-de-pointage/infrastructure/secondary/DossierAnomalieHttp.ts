import { components } from '@/app/generated/schema';
import { SaisieActe } from '../../domain/acte/SaisieActe';
import { ActiviteAnomalieId } from '../../domain/dossier/ActiviteAnomalieId';
import { ActiviteAnomalie, ChoixGuide, DiagnosticConflit, DossierAnomalie, PointageAnomalie } from '../../domain/dossier/DossierAnomalie';
import { ElementAnomalieId } from '../../domain/dossier/ElementAnomalieId';
import { PointageAnomalieId } from '../../domain/dossier/PointageAnomalieId';
import { SuiviAnomalieId } from '../../domain/dossier/SuiviAnomalieId';

export const toLigne = (ligne: Omit<components['schemas']['RestConflitEnListe'], 'nature'>) => ({
  adresse: {
    suivi: new SuiviAnomalieId(ligne.adresse.suivi),
    pointage: new PointageAnomalieId(ligne.adresse.pointage),
  },
  element: new ElementAnomalieId(ligne.elementId),
  designation: ligne.designation,
  operateur: ligne.operateur === undefined ? '' : `${ligne.operateur.prenom} ${ligne.operateur.nom}`,
  operateurId: ligne.operateurId,
  poste: ligne.poste?.libelle ?? '',
  ...(ligne.posteId === undefined ? {} : { posteId: ligne.posteId }),
  date: ligne.datePremierPointage,
  explication: '',
  nombrePointages: ligne.nombrePointages,
});

export const toPointage = (pointage: components['schemas']['RestEvenementDAtelier']): PointageAnomalie => ({
  id: new PointageAnomalieId(pointage.id),
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
  ...(pointage.activite === undefined ? {} : { activiteCreee: new ActiviteAnomalieId(pointage.activite) }),
  ...(pointage.remplace === undefined ? {} : { remplace: new PointageAnomalieId(pointage.remplace) }),
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

const toActivite = (activite: components['schemas']['RestActiviteDuDossier']): ActiviteAnomalie => {
  if (isFinishedWithoutDuration(activite)) throw new Error('Durée définitive de l’activité absente.');
  return {
    id: new ActiviteAnomalieId(activite.activite),
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
  pointage: new PointageAnomalieId(diagnostic.pointage),
  raison: diagnostic.raison,
  cible: {
    activite: new ActiviteAnomalieId(diagnostic.cible.activite),
    ...(diagnostic.cible.ouvrant === undefined ? {} : { ouvrant: new PointageAnomalieId(diagnostic.cible.ouvrant) }),
    ...(diagnostic.cible.termineePar === undefined ? {} : { termineePar: new PointageAnomalieId(diagnostic.cible.termineePar) }),
  },
});

const isSupportedGuide = (choix: components['schemas']['RestChoixDeResolution']): boolean => {
  switch (choix.code) {
    case 'ANNULER_TRANSITION':
      return choix.kind === 'ANNULATION';
    case 'REGULARISER_FIN':
      return choix.kind === 'REGULARISATION';
    case 'RATTACHER_FIN_A_ACTIVITE_REMPLACANTE':
    case 'CORRIGER_FIN_TARDIVE':
    case 'CORRIGER_TRANSITION_TARDIVE':
      return choix.kind === 'CORRECTION';
  }
};

type FaitGuide = components['schemas']['RestFaitDeResolution'] | components['schemas']['RestFaitARegulariser'];

const toFaitSansInstant = (fait: FaitGuide) => {
  const cible = fait.activiteVisee;
  if (cible === undefined) throw new Error('Cible de la proposition guidée absente.');
  return { type: fait.type, intention: fait.intention, activiteVisee: cible, operateur: fait.operateur, poste: fait.poste ?? '' };
};

const toSaisieDeRegularisation = (fait: FaitGuide): SaisieActe => {
  if ('instant' in fait) throw new Error('Proposition guidée incohérente.');
  return SaisieActe.regularise({ ...toFaitSansInstant(fait), instant: '' });
};

const toSaisieDeCorrection = (pointage: string, fait: FaitGuide): SaisieActe => {
  if (!('instant' in fait)) throw new Error('Instant de la proposition guidée absent.');
  return SaisieActe.correct(pointage, { ...toFaitSansInstant(fait), instant: fait.instant });
};

const toSaisie = (choix: components['schemas']['RestChoixDeResolution']): SaisieActe => {
  if (!isSupportedGuide(choix)) throw new Error('Proposition guidée incohérente.');
  if (choix.kind === 'ANNULATION') return SaisieActe.cancel(choix.pointage);
  if (choix.fait === undefined) throw new Error('Fait de la proposition guidée absent.');
  return choix.kind === 'REGULARISATION' ? toSaisieDeRegularisation(choix.fait) : toSaisieDeCorrection(choix.pointage, choix.fait);
};

const toChoix = (choix: components['schemas']['RestChoixDeResolution']): ChoixGuide => ({
  id: `${choix.code}:${choix.pointage}`,
  code: choix.code,
  libelle: '',
  explication: '',
  saisie: toSaisie(choix),
});

export const toDossier = (
  dossier: components['schemas']['RestDossierAnomalie'],
  sequence: components['schemas']['RestSequenceDuDossier'] | undefined = dossier.kind === 'FIN_AUTOMATIQUE'
    ? dossier.perimetre
    : dossier.sequence,
): DossierAnomalie => {
  if (sequence === undefined)
    throw new Error(dossier.kind === 'FIN_AUTOMATIQUE' ? 'Périmètre du dossier absent.' : 'Séquence du dossier absente.');
  return {
    ligne: toLigne({
      ...sequence,
      adresse: dossier.adresse,
      revision: dossier.revision,
      elementId: dossier.suivi.element,
      designation: dossier.suivi.nom,
    }),
    version: dossier.revision,
    etat: dossier.kind,
    enConflit: dossier.enConflit,
    finAutomatique: dossier.finAutomatique,
    cloture: dossier.suivi.clotureLe !== undefined,
    ...(dossier.suivi.clotureLe === undefined ? {} : { finCloture: dossier.suivi.clotureLe }),
    engagement: dossier.suivi.engageLe,
    journal: dossier.suivi.journal.map(toPointage),
    activites: dossier.activites.map(toActivite),
    diagnostics: dossier.diagnostics.map(toDiagnostic),
    choix: dossier.choix.map(toChoix),
    consequences: [],
    continuations: dossier.continuations.map(toLigne),
  };
};

export const toDossierDansPerimetre = (dossier: components['schemas']['RestDossierAnomalie']): DossierAnomalie => {
  const perimetre = dossier.perimetre;
  if (perimetre === undefined) throw new Error('Périmètre du dossier absent.');
  return toDossier(dossier, perimetre);
};
