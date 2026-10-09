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

const isPastDeadline = (activite: ActiviteDuPupitre, geste: GesteDePointage): boolean =>
  Date.parse(geste.dateDeSurvenue) >= Date.parse(activite.echeance);

const isKeyBusyAt = (suivi: SuiviDuPupitre, geste: GesteDePointage): boolean =>
  suivi.activites.some(activite => matchesPair(activite, geste) && !isPastDeadline(activite, geste));

const withActivities = (suivi: SuiviDuPupitre, activites: SuiviDuPupitre['activites']): SuiviDuPupitre => ({
  ...suivi,
  activites,
  etat: etatFor(activites.length),
});

const withoutActivityOnKey = (suivi: SuiviDuPupitre, geste: GesteDePointage): SuiviDuPupitre['activites'] =>
  suivi.activites.filter(activite => !matchesPair(activite, geste));

const finish = (suivi: SuiviDuPupitre, geste: GesteDePointage): SuiviDuPupitre =>
  hasActivityOnKey(suivi, geste) ? withActivities(suivi, withoutActivityOnKey(suivi, geste)) : suivi;

const open = (suivi: SuiviDuPupitre, geste: GesteDePointage, dureeMaximaleEnMs: number): SuiviDuPupitre =>
  isKeyBusyAt(suivi, geste)
    ? suivi
    : withActivities(suivi, [
        ...withoutActivityOnKey(suivi, geste),
        {
          ouverture: geste.id,
          echeance: new Date(Date.parse(geste.dateDeSurvenue) + dureeMaximaleEnMs).toISOString(),
          operateurId: geste.operateurId,
          categorie: categorieFor(geste),
          depuis: geste.dateDeSurvenue,
          ...(geste.posteId === undefined ? {} : { posteId: geste.posteId }),
        },
      ]);

const applyPointage = (suivi: SuiviDuPupitre, geste: GesteDePointage, dureeMaximaleEnMs: number): SuiviDuPupitre =>
  geste.type === 'FIN' ? finish(suivi, geste) : open(suivi, geste, dureeMaximaleEnMs);

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
  dureeMaximaleEnMs: number,
): SuiviDuPupitre[] =>
  applyToMatching(
    suivis,
    suivi => !isAlreadyProjectedOrUnrelated(suivi, evenement.geste),
    suivi => applyPointage(suivi, evenement.geste, dureeMaximaleEnMs),
  );

const applyEvenement = (referentiel: ReferentielDuPupitre, evenement: EvenementDuJournal): ReferentielDuPupitre => {
  if (evenement.etat === 'REFUSE') return referentiel;
  return { ...referentiel, suivis: projectPointage(referentiel.suivis, evenement, referentiel.dureeMaximaleDActiviteEnMs) };
};

export const projectReferentiel = (pupitre: JournalDuPupitre): ReferentielDuPupitre | undefined => {
  if (pupitre.referentiel === undefined) {
    return undefined;
  }
  return pupitre.evenements.reduce(applyEvenement, pupitre.referentiel);
};
