import {
  ActiviteDuPupitre,
  EvenementDuJournal,
  GesteDePointage,
  JournalDuPupitre,
  ReferentielDuPupitre,
  SuiviDuPupitre,
} from './JournalDuPupitre';

const matchesPair = (activite: ActiviteDuPupitre, geste: GesteDePointage): boolean =>
  activite.operateurId === geste.operateurId && activite.posteId === geste.posteId;

const applyPointage = (suivi: SuiviDuPupitre, geste: GesteDePointage): SuiviDuPupitre => {
  if (geste.intention !== 'OUVERTURE') {
    const cible = suivi.activites.find(activite => activite.ouverture === geste.cible);
    if (cible === undefined) return suivi;
  }
  const activites = suivi.activites.filter(activite =>
    geste.intention === 'OUVERTURE' ? !matchesPair(activite, geste) : activite.ouverture !== geste.cible,
  );
  if (geste.type !== 'FIN') {
    activites.push({
      ouverture: geste.id,
      echeance: new Date(Date.parse(geste.dateDeSurvenue) + 13 * 60 * 60 * 1000).toISOString(),
      operateurId: geste.operateurId,
      categorie: categorieFor(geste),
      depuis: geste.dateDeSurvenue,
      ...(geste.posteId === undefined ? {} : { posteId: geste.posteId }),
    });
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

const isAlreadyProjectedOrUnrelated = (suivi: SuiviDuPupitre, geste: GesteDePointage): boolean =>
  suivi.id !== geste.suiviId || suivi.evenements.includes(geste.id);

const applyToMatching = <T>(items: readonly T[], matches: (item: T) => boolean, transform: (item: T) => T): T[] =>
  items.map(item => (matches(item) ? transform(item) : item));

const projectPointage = (
  suivis: readonly SuiviDuPupitre[],
  evenement: Exclude<EvenementDuJournal, { readonly etat: 'REFUSE' }>,
): SuiviDuPupitre[] =>
  applyToMatching(
    suivis,
    suivi => !isAlreadyProjectedOrUnrelated(suivi, evenement.geste),
    suivi => applyPointage(suivi, evenement.geste),
  );

const applyEvenement = (referentiel: ReferentielDuPupitre, evenement: EvenementDuJournal): ReferentielDuPupitre => {
  if (evenement.etat === 'REFUSE') return referentiel;
  return { ...referentiel, suivis: projectPointage(referentiel.suivis, evenement) };
};

export const projectReferentiel = (pupitre: JournalDuPupitre): ReferentielDuPupitre | undefined => {
  if (pupitre.referentiel === undefined) {
    return undefined;
  }
  return pupitre.evenements.reduce(applyEvenement, pupitre.referentiel);
};
