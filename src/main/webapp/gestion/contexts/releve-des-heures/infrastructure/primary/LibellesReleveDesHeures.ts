import { DureeTravaillee } from '../../domain/duree/DureeTravaillee';
import { TotalDeDuree } from '../../domain/duree/TotalDeDuree';
import { CategorieDActivite } from '../../domain/element/CategorieDActivite';
import { ElementDuReleve } from '../../domain/element/ElementDuReleve';
import { PosteDeLElement } from '../../domain/element/PosteDeLElement';
import { TypeDElement } from '../../domain/element/TypeDElement';
import { InstantDeReleve } from '../../domain/releve/InstantDeReleve';
import { IntentionDePointage, PointageDElement } from '../../domain/releve/PointageDElement';
import { TypeDePointage } from '../../domain/releve/TypeDePointage';
import { JourCalendaire } from '../../domain/semaine/JourCalendaire';
import { SemaineISO } from '../../domain/semaine/SemaineISO';

const PLAGE = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const JOUR = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', timeZone: 'UTC' });
const JOUR_LONG = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', timeZone: 'UTC' });

const JOUR_ORIGINE = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric' });
const DATE_ORIGINE = new Intl.DateTimeFormat('fr-CA', { year: 'numeric', month: '2-digit', day: '2-digit' });

const HEURE = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });

const dateDe = (jour: JourCalendaire): Date => new Date(`${jour.value}T00:00:00Z`);

const formatDuree = (duree: DureeTravaillee): string => `${duree.heures} h ${String(duree.minutesRestantes).padStart(2, '0')}`;

const heure = (instant: InstantDeReleve): string => HEURE.format(instant.value);

const debutDOrigine = (debut: InstantDeReleve, jour: JourCalendaire): string =>
  DATE_ORIGINE.format(debut.value) === jour.value ? heure(debut) : `${JOUR_ORIGINE.format(debut.value)} à ${heure(debut)}`;

const MINUTES_PAR_HEURE = 60;

const TYPES_D_ELEMENT: Record<TypeDElement, string> = { PRODUIT: 'Moule', ORDRE_DE_FABRICATION: 'OF' };

const JOUR_COMPLET = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });

const nomDeLElement = (element: ElementDuReleve): string => `${TYPES_D_ELEMENT[element.type]} ${element.numero()}`;

const POINTAGES: Record<TypeDePointage, string> = {
  DEBUT: 'Début',
  NON_CONFORMITE: 'Non-conformité',
  FIN: 'Fin',
};

const CATEGORIES_D_ACTIVITE: Record<CategorieDActivite, string> = { TRAVAIL: 'travail', NON_CONFORMITE: 'non-conformité' };

const intentionDe = (intention: IntentionDePointage): string => {
  switch (intention.type) {
    case 'OUVERTURE':
      return 'Ouverture';
    case 'TRANSITION':
      return `Transition de l’activité ${intention.activiteVisee.value}`;
    case 'FIN':
      return `Fin de l’activité ${intention.activiteVisee.value}`;
  }
};

const posteEtNature = (poste: PosteDeLElement): string =>
  poste.nature === undefined ? poste.libelle : `${poste.libelle} · ${poste.nature}`;

const EN_COURS = 'en cours';

export interface FormeDActivite {
  readonly element: ElementDuReleve;
  readonly jour: JourCalendaire;
  readonly categorie: CategorieDActivite;
  readonly debut: InstantDeReleve;
  readonly fin: InstantDeReleve;
}

export interface FormeDActiviteEnCours {
  readonly element: ElementDuReleve;
  readonly jour: JourCalendaire;
  readonly categorie: CategorieDActivite;
  readonly debut: InstantDeReleve;
}

export const LIBELLES_RELEVE_DES_HEURES = {
  titre: 'Temps opérationnel',
  retour: 'Opérateurs',
  semaineConsultee: 'Semaine consultée',
  retourAria: 'Revenir au référentiel des opérateurs',
  sousTitre: 'Une ligne par moule ou OF pointé dans la semaine.',
  sansPoste: 'Sans poste',
  operationnel: 'Temps opérationnel',
  operationnelPrecision: 'pointé sur les moules et OF',
  colonneElement: 'Élément',
  colonneSemaine: 'Semaine',

  operateurLabel: 'Opérateur',
  echecNavigation: 'Impossible de changer d’opérateur. Choisissez à nouveau la personne à consulter.',
  aucunOperateur: 'Aucun opérateur disponible',
  echecOperateurs: 'Impossible de charger les opérateurs. Réessayez pour changer de personne.',
  chargementOperateurs: 'Chargement des opérateurs…',
  operateurConsulte: 'Consulté',
  aucunResultatOperateur: 'Aucun opérateur ne correspond à cette recherche',
  rechercherOperateur: 'Rechercher un opérateur',
  choisirOperateur: 'Choisir un opérateur',
  anneeLabel: 'Année',
  semaineLabel: 'Semaine',
  semainePrecedenteAria: 'Semaine précédente',
  semaineSuivanteAria: 'Semaine suivante',
  optionSemaine: (numero: number): string => `Semaine ${numero}`,

  tableau: 'Temps opérationnel de la semaine, jour par jour',
  defilement: 'Frise de la semaine, défilement horizontal disponible',

  sansValeur: '—',
  aujourdhui: 'Aujourd’hui',
  legende: {
    travail: 'Travail',
    nonConformite: 'Non-conformité',
    aResoudre: 'À résoudre',
    enCours: 'En cours',
    debut: 'Début pointé',
    nonConformitePointee: 'Non-conformité pointée',
    fin: 'Fin pointée',
  },

  conflits: 'Séquences en conflit',
  activitesConcernees: (ids: readonly string[]): string => `Activités concernées : ${ids.join(', ')}`,
  faitConcerne: (pointage: PointageDElement): string =>
    `${POINTAGES[pointage.type]} ${heure(pointage.instant)} · ${intentionDe(pointage.intention)} · ${pointage.id.value}`,
  pointageConcerne: (id: string): string => `Pointage ${id}`,
  chargement: 'Chargement du temps opérationnel…',
  echec: 'Impossible de charger le temps opérationnel de la semaine. Vérifiez la connexion puis réessayez.',
  reessayer: 'Réessayer',
  operateurIntrouvable: 'Cet opérateur n’existe plus au référentiel : son temps opérationnel ne peut pas être établi.',
  adresseInvalide:
    'Cette adresse ne désigne pas une semaine ou un jour que le calendrier porte. Revenez au référentiel pour repartir de la semaine en cours.',

  semaine: (semaine: SemaineISO): string =>
    `Semaine ${semaine.numero} · ${PLAGE.formatRange(dateDe(semaine.lundi()), dateDe(semaine.dimanche()))}`,
  identite: (nom: string, prenom: string): string => `${prenom} ${nom.toLocaleUpperCase('fr-FR')}`,
  duree: (total: TotalDeDuree): string => {
    const lecture = total.snapshot();
    return lecture.complete ? formatDuree(lecture.valeur) : 'Incomplet';
  },
  nonConformite: (total: TotalDeDuree): string => {
    const lecture = total.snapshot();
    return lecture.complete ? `NC ${formatDuree(lecture.valeur)}` : 'NC Incomplet';
  },
  jour: (jour: JourCalendaire): string => JOUR.format(dateDe(jour)),
  typeDElement: (type: TypeDElement): string => TYPES_D_ELEMENT[type],
  nomDElement: nomDeLElement,
  heure,
  libelleDePointage: (type: TypeDePointage): string => POINTAGES[type],
  pointage: (type: TypeDePointage, instant: InstantDeReleve): string => `${POINTAGES[type]} ${heure(instant)}`,
  titreDuJournal: (jour: JourCalendaire, nombre: number): string => `Pointages du ${JOUR_COMPLET.format(dateDe(jour))} · ${nombre}`,
  sansPointageCeJour: 'Aucun pointage ce jour',
  postes: (postes: readonly PosteDeLElement[]): string => postes.map(posteEtNature).join(', '),
  repere: (minutes: number): string => `${Math.floor(minutes / MINUTES_PAR_HEURE)} h`,

  enonceDActivite: ({ element, jour, categorie, debut, fin }: FormeDActivite): string => {
    const enonce = `${nomDeLElement(element)}, ${JOUR_LONG.format(dateDe(jour))}, ${heure(debut)} à ${heure(fin)}, ${CATEGORIES_D_ACTIVITE[categorie]}`;
    return enonce;
  },
  enonceDActiviteAResoudre: ({ element, jour, categorie }: FormeDActiviteEnCours): string =>
    `${nomDeLElement(element)}, ${JOUR_LONG.format(dateDe(jour))}, ${CATEGORIES_D_ACTIVITE[categorie]}, À résoudre`,
  finAutomatique: (fin: InstantDeReleve): string => `Fin automatique à ${heure(fin)} · Anomalie`,
  activiteEnCours: (debut: InstantDeReleve, jour: JourCalendaire): string => `En cours depuis ${debutDOrigine(debut, jour)}`,
  enonceDActiviteEnCours: ({ element, jour, categorie, debut }: FormeDActiviteEnCours): string =>
    `${nomDeLElement(element)}, ${JOUR_LONG.format(dateDe(jour))}, depuis ${debutDOrigine(debut, jour)}, ${CATEGORIES_D_ACTIVITE[categorie]}, ${EN_COURS}`,
} as const;
