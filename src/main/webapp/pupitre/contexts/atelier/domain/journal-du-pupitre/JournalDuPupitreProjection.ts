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

interface SuiviEnProjection extends SuiviDuPupitre {
  readonly ouverturesConnues: readonly ActiviteDuPupitre[];
  readonly ciblesConsommees: readonly string[];
}
type ReferentielEnProjection = Omit<ReferentielDuPupitre, 'suivis'> & { readonly suivis: readonly SuiviEnProjection[] };

const occupiesSamePlace = (activite: ActiviteDuPupitre, geste: PointageCausal): boolean =>
  activite.operateurId === geste.operateurId && activite.posteId === geste.posteId;

const targetedActivity = (suivi: SuiviEnProjection, geste: PointageCausal): ActiviteDuPupitre | undefined =>
  geste.intention === 'OUVERTURE' ? undefined : suivi.ouverturesConnues.find(activite => activite.ouverture === geste.cible);

const targetsUnavailableActivity = (suivi: SuiviEnProjection, geste: PointageCausal): boolean =>
  geste.intention !== 'OUVERTURE'
  && (targetedActivity(suivi, geste) === undefined
    || suivi.ciblesConsommees.includes(geste.cible)
    || suivi.activites.some(activite => occupiesSamePlace(activite, geste) && activite.ouverture !== geste.cible));

const consumesTarget = (suivi: SuiviEnProjection, geste: PointageCausal): boolean => {
  if (geste.intention === 'OUVERTURE') return false;
  if (geste.intention === 'TRANSITION') return true;
  const cible = targetedActivity(suivi, geste);
  return cible !== undefined && Date.parse(geste.dateDeSurvenue) <= Date.parse(cible.echeance);
};

const newlyOpenedActivities = (geste: PointageCausal, conflit: boolean): readonly ActiviteDuPupitre[] => {
  if (cannotOpenActivity(geste, conflit)) return [];
  return [
    {
      ouverture: geste.id,
      echeance: new Date(Date.parse(geste.dateDeSurvenue) + 13 * 60 * 60 * 1000).toISOString(),
      operateurId: geste.operateurId,
      categorie: categorieFor(geste),
      depuis: geste.dateDeSurvenue,
      ...(geste.posteId === undefined ? {} : { posteId: geste.posteId }),
    },
  ];
};
const cannotOpenActivity = (geste: PointageCausal, conflit: boolean): boolean => geste.type === 'FIN' || conflit;

const consumedTargets = (suivi: SuiviEnProjection, geste: PointageCausal, conflit: boolean): readonly string[] => {
  const cible = geste.intention === 'OUVERTURE' ? [] : [geste.cible];
  const remplacees = conflit
    ? suivi.activites.filter(activite => occupiesSamePlace(activite, geste)).map(activite => activite.ouverture)
    : [];
  return [...suivi.ciblesConsommees, ...(consumesTarget(suivi, geste) ? cible : []), ...remplacees];
};

const applyPointage = (suivi: SuiviEnProjection, geste: GesteDePointage): SuiviEnProjection => {
  if (geste.intention === undefined) return suivi;
  const conflit = targetsUnavailableActivity(suivi, geste);
  const nouvelles = newlyOpenedActivities(geste, conflit);
  const activites = [...suivi.activites.filter(activite => !occupiesSamePlace(activite, geste)), ...nouvelles];
  return {
    ...suivi,
    activites,
    etat: etatFor(activites.length),
    ouverturesConnues: [...suivi.ouverturesConnues, ...nouvelles],
    ciblesConsommees: consumedTargets(suivi, geste, conflit),
  };
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

const projectPointage = (suivis: readonly SuiviEnProjection[], geste: GesteDePointage): SuiviEnProjection[] =>
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

const applyEvenement = (referentiel: ReferentielEnProjection, evenement: EvenementDuJournal): ReferentielEnProjection => {
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
  const initial: ReferentielEnProjection = {
    ...pupitre.referentiel,
    suivis: pupitre.referentiel.suivis.map(suivi => ({ ...suivi, ouverturesConnues: suivi.activites, ciblesConsommees: [] })),
  };
  const projection = pupitre.evenements.reduce(applyEvenement, initial);
  const referentiel: ReferentielDuPupitre = {
    ...projection,
    suivis: projection.suivis.map(suivi => ({
      id: suivi.id,
      nom: suivi.nom,
      etat: suivi.etat,
      type: suivi.type,
      activites: suivi.activites,
      evenements: suivi.evenements,
      ...(suivi.reference === undefined ? {} : { reference: suivi.reference }),
    })),
  };
  if (instant === undefined) return referentiel;
  return {
    ...referentiel,
    suivis: referentiel.suivis.map(suivi => {
      const activites = suivi.activites.filter(activite => Date.parse(activite.echeance) > instant);
      return { ...suivi, activites, etat: activites.length === suivi.activites.length ? suivi.etat : etatFor(activites.length) };
    }),
  };
};
