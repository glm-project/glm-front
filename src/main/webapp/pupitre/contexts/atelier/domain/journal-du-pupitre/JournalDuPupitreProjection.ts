import {
  ActiviteDuPupitre,
  EtatDePresence,
  EvenementDuJournal,
  GesteDArrivee,
  GesteDePointage,
  GesteDePresence,
  JournalDuPupitre,
  OperateurDuPupitre,
  PointageCausal,
  ReferentielDuPupitre,
  SuiviDuPupitre,
  TypeDePresence,
} from './JournalDuPupitre';

const applyPointage = (suivi: SuiviDuPupitre, geste: GesteDePointage): SuiviDuPupitre => {
  if (geste.intention === undefined) return suivi;
  const activites = suivi.activites.filter(activite => activite.operateurId !== geste.operateurId || activite.posteId !== geste.posteId);
  if (opensProjectedActivity(suivi, geste)) {
    const activite: ActiviteDuPupitre = {
      ouverture: geste.id,
      echeance: new Date(Date.parse(geste.dateDeSurvenue) + 13 * 60 * 60 * 1000).toISOString(),
      operateurId: geste.operateurId,
      categorie: categorieFor(geste),
      depuis: geste.dateDeSurvenue,
      ...(geste.posteId === undefined ? {} : { posteId: geste.posteId }),
    };
    activites.push(activite);
  }
  return { ...suivi, activites, etat: etatFor(activites.length) };
};

const targetsReplacedActivity = (suivi: SuiviDuPupitre, geste: PointageCausal): boolean =>
  geste.intention !== 'OUVERTURE'
  && suivi.activites.some(
    activite => activite.operateurId === geste.operateurId && activite.posteId === geste.posteId && activite.ouverture !== geste.cible,
  );

const opensProjectedActivity = (suivi: SuiviDuPupitre, geste: PointageCausal): boolean =>
  geste.type !== 'FIN' && !targetsReplacedActivity(suivi, geste);

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

const projectPointage = (suivis: readonly SuiviDuPupitre[], geste: GesteDePointage): SuiviDuPupitre[] =>
  applyToMatching(
    suivis,
    suivi => !isAlreadyProjectedOrUnrelated(suivi, geste),
    suivi => applyPointage(suivi, geste),
  );

type CleDeTransition = 'ARRIVEE' | TypeDePresence;

const TRANSITIONS_DE_PRESENCE: Record<EtatDePresence, Partial<Record<CleDeTransition, EtatDePresence>>> = {
  ABSENT: { ARRIVEE: 'PRESENT' },
  PRESENT: { DEPART: 'ABSENT' },
};

const cleDeTransitionFor = (geste: GesteDArrivee | GesteDePresence): CleDeTransition =>
  geste.nature === 'ARRIVEE' ? 'ARRIVEE' : geste.type;

const isAlreadyProjectedOrUnrelatedPresence = (operateur: OperateurDuPupitre, geste: GesteDArrivee | GesteDePresence): boolean =>
  operateur.id !== geste.operateurId || operateur.evenements.includes(geste.id);

const applyPresence = (operateur: OperateurDuPupitre, geste: GesteDArrivee | GesteDePresence): OperateurDuPupitre => {
  const etatSuivant = TRANSITIONS_DE_PRESENCE[operateur.etat][cleDeTransitionFor(geste)];
  return etatSuivant === undefined ? operateur : { ...operateur, etat: etatSuivant };
};

const projectPresence = (operateurs: readonly OperateurDuPupitre[], geste: GesteDArrivee | GesteDePresence): OperateurDuPupitre[] =>
  applyToMatching(
    operateurs,
    operateur => !isAlreadyProjectedOrUnrelatedPresence(operateur, geste),
    operateur => applyPresence(operateur, geste),
  );

const applyEvenement = (referentiel: ReferentielDuPupitre, evenement: EvenementDuJournal): ReferentielDuPupitre => {
  if (evenement.etat === 'REFUSE') {
    return referentiel;
  }
  const geste = evenement.geste;
  switch (geste.nature) {
    case 'POINTAGE':
      return { ...referentiel, suivis: projectPointage(referentiel.suivis, geste) };
    case 'ARRIVEE':
    case 'PRESENCE':
      return { ...referentiel, operateurs: projectPresence(referentiel.operateurs, geste) };
  }
};

export const projectReferentiel = (pupitre: JournalDuPupitre, instant?: number): ReferentielDuPupitre | undefined => {
  if (pupitre.referentiel === undefined) {
    return undefined;
  }
  const referentiel = pupitre.evenements.reduce(applyEvenement, pupitre.referentiel);
  if (instant === undefined) return referentiel;
  return {
    ...referentiel,
    suivis: referentiel.suivis.map(suivi => {
      const activites = suivi.activites.filter(activite => Date.parse(activite.echeance) > instant);
      return { ...suivi, activites, etat: activites.length === suivi.activites.length ? suivi.etat : etatFor(activites.length) };
    }),
  };
};
