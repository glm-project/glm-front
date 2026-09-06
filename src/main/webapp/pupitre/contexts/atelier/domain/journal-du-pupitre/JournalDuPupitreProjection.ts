import {
  ActiviteDuPupitre,
  EvenementDuJournal,
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
    };
    if (geste.posteId !== undefined) {
      activite.posteId = geste.posteId;
    }
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

const applyEvenement = (suivis: SuiviDuPupitre[], evenement: EvenementDuJournal): SuiviDuPupitre[] => {
  const geste = evenement.geste;
  if (evenement.etat === 'REFUSE' || geste.nature !== 'POINTAGE') {
    return suivis;
  }
  return suivis.map(suivi => {
    if (suivi.id !== geste.suiviId || suivi.evenements.includes(geste.id)) {
      return suivi;
    }
    return applyPointage(suivi, geste);
  });
};

export const projectReferentiel = (pupitre: JournalDuPupitre): ReferentielDuPupitre | undefined => {
  if (pupitre.referentiel === undefined) {
    return undefined;
  }
  return { ...pupitre.referentiel, suivis: pupitre.evenements.reduce(applyEvenement, pupitre.referentiel.suivis) };
};
