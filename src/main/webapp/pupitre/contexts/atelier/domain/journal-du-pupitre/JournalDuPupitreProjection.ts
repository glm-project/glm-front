import {
  ActiviteDuPupitre,
  ConflitDuPupitre,
  EvenementAccepte,
  EvenementDuJournal,
  GesteDePointage,
  JournalDuPupitre,
  ReferentielDuPupitre,
  SuiviDuPupitre,
} from './JournalDuPupitre';

const matchesPair = (activite: ActiviteDuPupitre, geste: GesteDePointage): boolean =>
  activite.operateurId === geste.operateurId && activite.posteId === geste.posteId;

const conflictWithReplacement = (
  suivi: SuiviDuPupitre,
  geste: Exclude<GesteDePointage, { readonly intention: 'OUVERTURE' }>,
): SuiviDuPupitre => {
  const remplacantes = suivi.activites.filter(
    activite => matchesPair(activite, geste) && Date.parse(activite.depuis) < Date.parse(geste.dateDeSurvenue),
  );
  if (remplacantes.length === 0) return suivi;
  const activites = suivi.activites.filter(activite => !remplacantes.includes(activite));
  return {
    ...suivi,
    activites,
    etat: etatFor(activites.length),
    conflits: [
      ...suivi.conflits,
      {
        operateurId: geste.operateurId,
        ...(geste.posteId === undefined ? {} : { posteId: geste.posteId }),
        activites: [geste.cible, ...remplacantes.map(activite => activite.ouverture)],
        pointages: [geste.id],
      },
    ],
  };
};

const applyPointage = (suivi: SuiviDuPupitre, geste: GesteDePointage): SuiviDuPupitre => {
  if (geste.intention !== 'OUVERTURE') {
    const cible = suivi.activites.find(activite => activite.ouverture === geste.cible);
    if (cible === undefined) return conflictWithReplacement(suivi, geste);
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

const hasConflictDiagnostics = (
  evenement: EvenementDuJournal,
): evenement is EvenementAccepte & { readonly conflits: readonly ConflitDuPupitre[] } =>
  evenement.etat === 'ACCEPTE' && evenement.conflits !== undefined;

const applyPublication = (suivi: SuiviDuPupitre, evenement: Exclude<EvenementDuJournal, { readonly etat: 'REFUSE' }>): SuiviDuPupitre => {
  const projected = applyPointage(suivi, evenement.geste);
  if (!hasConflictDiagnostics(evenement)) return projected;
  const conflits = evenement.conflits;
  const activites = projected.activites.filter(activite => !conflits.some(conflit => conflit.activites.includes(activite.ouverture)));
  return { ...projected, conflits, activites, etat: etatFor(activites.length) };
};

const projectPointage = (
  suivis: readonly SuiviDuPupitre[],
  evenement: Exclude<EvenementDuJournal, { readonly etat: 'REFUSE' }>,
): SuiviDuPupitre[] =>
  applyToMatching(
    suivis,
    suivi => !isAlreadyProjectedOrUnrelated(suivi, evenement.geste),
    suivi => applyPublication(suivi, evenement),
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
