import {
  ActiviteDuPupitre,
  EtatDePresence,
  EvenementDuJournal,
  GesteDArrivee,
  GesteDAtelier,
  GesteDePointage,
  GesteDePresence,
  JournalDuPupitre,
  OperateurDuPupitre,
  ReferentielDuPupitre,
  SuiviDuPupitre,
  TypeDePresence,
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

const applyToMatching = <T>(items: readonly T[], matches: (item: T) => boolean, transform: (item: T) => T): T[] =>
  items.map(item => (matches(item) ? transform(item) : item));

const applyEvenement = (suivis: SuiviDuPupitre[], evenement: EvenementDuJournal): SuiviDuPupitre[] => {
  const geste = evenement.geste;
  if (!isProjectablePointage(evenement, geste)) {
    return suivis;
  }
  return applyToMatching(
    suivis,
    suivi => !isAlreadyProjectedOrUnrelated(suivi, geste),
    suivi => applyPointage(suivi, geste),
  );
};

type CleDeTransition = 'ARRIVEE' | TypeDePresence;

const TRANSITIONS_DE_PRESENCE: Record<EtatDePresence, Partial<Record<CleDeTransition, EtatDePresence>>> = {
  ABSENT: { ARRIVEE: 'PRESENT' },
  PRESENT: { PAUSE: 'EN_PAUSE', DEPART: 'ABSENT' },
  EN_PAUSE: { REPRISE: 'PRESENT', DEPART: 'ABSENT' },
};

const isProjectablePresence = (evenement: EvenementDuJournal, geste: GesteDAtelier): geste is GesteDArrivee | GesteDePresence =>
  !(evenement.etat === 'REFUSE' || geste.nature === 'POINTAGE');

const cleDeTransitionFor = (geste: GesteDArrivee | GesteDePresence): CleDeTransition =>
  geste.nature === 'ARRIVEE' ? 'ARRIVEE' : geste.type;

const isAlreadyProjectedOrUnrelatedPresence = (operateur: OperateurDuPupitre, geste: GesteDArrivee | GesteDePresence): boolean =>
  operateur.id !== geste.operateurId || operateur.evenements.includes(geste.id);

const applyPresence = (operateur: OperateurDuPupitre, geste: GesteDArrivee | GesteDePresence): OperateurDuPupitre => {
  const etatSuivant = TRANSITIONS_DE_PRESENCE[operateur.etat][cleDeTransitionFor(geste)];
  return etatSuivant === undefined ? operateur : { ...operateur, etat: etatSuivant };
};

const applyEvenementDePresence = (operateurs: OperateurDuPupitre[], evenement: EvenementDuJournal): OperateurDuPupitre[] => {
  const geste = evenement.geste;
  if (!isProjectablePresence(evenement, geste)) {
    return operateurs;
  }
  return applyToMatching(
    operateurs,
    operateur => !isAlreadyProjectedOrUnrelatedPresence(operateur, geste),
    operateur => applyPresence(operateur, geste),
  );
};

export const projectReferentiel = (pupitre: JournalDuPupitre): ReferentielDuPupitre | undefined => {
  if (pupitre.referentiel === undefined) {
    return undefined;
  }
  return {
    ...pupitre.referentiel,
    suivis: pupitre.evenements.reduce(applyEvenement, [...pupitre.referentiel.suivis]),
    operateurs: pupitre.evenements.reduce(applyEvenementDePresence, [...pupitre.referentiel.operateurs]),
  };
};
