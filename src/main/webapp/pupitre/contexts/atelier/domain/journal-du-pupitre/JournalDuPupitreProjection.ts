import {
  ActiviteDuPupitre,
  EvenementDuJournal,
  GesteDAtelier,
  GesteDePointage,
  JournalDuPupitre,
  ReferentielDuPupitre,
  SuiviDuPupitre,
} from './JournalDuPupitre';

const applyPointage = (suivi: SuiviDuPupitre, geste: GesteDePointage): SuiviDuPupitre => {
  const activites = suivi.activites.filter(activite => activite.operateurId !== geste.operateurId || activite.posteId !== geste.posteId);
  if (geste.type !== 'FIN') {
    const activite: ActiviteDuPupitre = {
      operateurId: geste.operateurId,
      categorie: categorieFor(geste),
      depuis: geste.dateDeSurvenue,
      ...(geste.posteId === undefined ? {} : { posteId: geste.posteId }),
    };
    activites.push(activite);
  }
  return { ...suivi, activites, etat: etatFor(activites.length) };
};

const categorieFor = (geste: GesteDePointage): 'TRAVAIL' | 'NON_CONFORMITE' => {
  if (geste.type === 'NON_CONFORMITE') {
    return 'NON_CONFORMITE';
  }
  return 'TRAVAIL';
};

const etatFor = (activites: number): 'EN_COURS' | 'INTERROMPU' => {
  if (activites === 0) {
    return 'INTERROMPU';
  }
  return 'EN_COURS';
};

const isProjectablePointage = (evenement: EvenementDuJournal, geste: GesteDAtelier): geste is GesteDePointage =>
  !(evenement.etat === 'REFUSE' || geste.nature !== 'POINTAGE');

const isAlreadyProjectedOrUnrelated = (suivi: SuiviDuPupitre, geste: GesteDePointage): boolean =>
  suivi.id !== geste.suiviId || suivi.evenements.includes(geste.id);

const applyEvenement = (suivis: SuiviDuPupitre[], evenement: EvenementDuJournal): SuiviDuPupitre[] => {
  const geste = evenement.geste;
  if (!isProjectablePointage(evenement, geste)) {
    return suivis;
  }
  return suivis.map(suivi => {
    if (isAlreadyProjectedOrUnrelated(suivi, geste)) {
      return suivi;
    }
    return applyPointage(suivi, geste);
  });
};

export const projectReferentiel = (pupitre: JournalDuPupitre): ReferentielDuPupitre | undefined => {
  if (pupitre.referentiel === undefined) {
    return undefined;
  }
  return { ...pupitre.referentiel, suivis: pupitre.evenements.reduce(applyEvenement, [...pupitre.referentiel.suivis]) };
};
