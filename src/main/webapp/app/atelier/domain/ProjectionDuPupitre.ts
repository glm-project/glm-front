import { EvenementLocal, PointageLocal, PupitreLocal, ReferentielDuPupitre, SuiviDuPupitre } from './PupitreLocal';

const applyPointage = (suivi: SuiviDuPupitre, geste: PointageLocal): SuiviDuPupitre => {
  const activites = suivi.activites.filter(activite => activite.operateurId !== geste.operateurId);
  if (geste.type !== 'FIN') {
    activites.push({
      operateurId: geste.operateurId,
      categorie: categorieFor(geste),
      depuis: geste.dateDeSurvenue,
      posteId: geste.posteId,
    });
  }
  return { ...suivi, activites, etat: etatFor(activites.length) };
};

const categorieFor = (geste: PointageLocal): 'TRAVAIL' | 'NON_CONFORMITE' => {
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

const applyEvenement = (suivis: SuiviDuPupitre[], evenement: EvenementLocal): SuiviDuPupitre[] => {
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

export const projectPupitre = (pupitre: PupitreLocal): ReferentielDuPupitre | undefined => {
  if (pupitre.referentiel === undefined) {
    return undefined;
  }
  return { ...pupitre.referentiel, suivis: pupitre.evenements.reduce(applyEvenement, pupitre.referentiel.suivis) };
};
