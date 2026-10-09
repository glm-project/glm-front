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

const hasActivityOnKey = (suivi: SuiviDuPupitre, geste: GesteDePointage): boolean =>
  suivi.activites.some(activite => matchesPair(activite, geste));

const isIgnoredByTheServer = (suivi: SuiviDuPupitre, geste: GesteDePointage): boolean =>
  hasActivityOnKey(suivi, geste) !== (geste.type === 'FIN');

const withActivities = (suivi: SuiviDuPupitre, activites: SuiviDuPupitre['activites']): SuiviDuPupitre => ({
  ...suivi,
  activites,
  etat: etatFor(activites.length),
});

const finish = (suivi: SuiviDuPupitre, geste: GesteDePointage): SuiviDuPupitre =>
  withActivities(
    suivi,
    suivi.activites.filter(activite => !matchesPair(activite, geste)),
  );

const open = (suivi: SuiviDuPupitre, geste: GesteDePointage): SuiviDuPupitre =>
  withActivities(suivi, [
    ...suivi.activites,
    {
      ouverture: geste.id,
      echeance: new Date(Date.parse(geste.dateDeSurvenue) + 13 * 60 * 60 * 1000).toISOString(),
      operateurId: geste.operateurId,
      categorie: categorieFor(geste),
      depuis: geste.dateDeSurvenue,
      ...(geste.posteId === undefined ? {} : { posteId: geste.posteId }),
    },
  ]);

const applyPointage = (suivi: SuiviDuPupitre, geste: GesteDePointage): SuiviDuPupitre => {
  if (isIgnoredByTheServer(suivi, geste)) return suivi;
  return geste.type === 'FIN' ? finish(suivi, geste) : open(suivi, geste);
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
