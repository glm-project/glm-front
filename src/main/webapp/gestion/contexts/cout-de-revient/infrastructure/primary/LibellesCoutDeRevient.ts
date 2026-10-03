import { TypeDElementChiffre } from '../../domain/element/TypeDElementChiffre';
import { Cout } from '../../domain/montant/Cout';
import { Montant } from '../../domain/montant/Montant';
import { TotalDeMontant } from '../../domain/montant/TotalDeMontant';
import { ActiviteCitee } from '../../domain/pointage/ActiviteCitee';
import { OperateurCite } from '../../domain/pointage/OperateurCite';
import { PartDePointage } from '../../domain/pointage/PartDePointage';
import { AnomalieDePointage, PointageDeCout } from '../../domain/pointage/PointageDeCout';
import { TypeDePointage } from '../../domain/pointage/PointageEnConflit';
import { PosteCite } from '../../domain/pointage/PosteCite';
import { ActivitesEnCoursExclues } from '../../domain/rapport/ActivitesEnCoursExclues';
import { CoutDeRevient } from '../../domain/rapport/CoutDeRevient';
import { CompteDAnomalies, LigneDeCout } from '../../domain/rapport/LigneDeCout';
import { DureePassee } from '../../domain/temps/DureePassee';
import { InstantDeTravail } from '../../domain/temps/InstantDeTravail';
import { TempsPasse } from '../../domain/temps/TempsPasse';
import { TotalDeTemps } from '../../domain/temps/TotalDeTemps';

const TYPES: Record<TypeDElementChiffre, string> = {
  ORDRE_DE_FABRICATION: 'OF',
  PRODUIT: 'Moule',
};

const EUROS = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });

const DATE_HEURE = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const SANS_POSTE = 'Sans poste';

const JOUR = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });

const HEURE = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });

const DECIMALES = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const MINUTES_PAR_HEURE = 60;

const formatDureeCertaine = (duree: DureePassee): string => `${duree.heures} h ${String(duree.minutesRestantes).padStart(2, '0')}`;

const formatMontantCertain = (montant: Montant): string => EUROS.format(montant.euros);

const formatDuree = (total: TotalDeTemps): string => {
  const lecture = total.snapshot();
  return lecture.complete ? formatDureeCertaine(lecture.valeur) : 'Incomplet';
};

const formatMontant = (total: TotalDeMontant): string => {
  const lecture = total.snapshot();
  return lecture.complete ? formatMontantCertain(lecture.valeur) : 'Incomplet';
};

const memeJour = (debut: InstantDeTravail, fin: InstantDeTravail): boolean => debut.value.toDateString() === fin.value.toDateString();

const borne = (instant: InstantDeTravail): string => `${JOUR.format(instant.value)} ${HEURE.format(instant.value)}`;

const plageDuPointage = (pointage: PointageDeCout): string => {
  const debut = pointage.periode.debut;
  const fin = pointage.periode.fin;
  if (fin === undefined) {
    return `${JOUR.format(debut.value)} · ${HEURE.format(debut.value)} → fin à résoudre`;
  }
  return memeJour(debut, fin)
    ? `${JOUR.format(debut.value)} · ${HEURE.format(debut.value)} → ${HEURE.format(fin.value)}`
    : `${borne(debut)} → ${borne(fin)}`;
};

const plageDePart = (part: PartDePointage): string =>
  memeJour(part.debut, part.fin)
    ? `${HEURE.format(part.debut.value)} → ${HEURE.format(part.fin.value)}`
    : `${borne(part.debut)} → ${borne(part.fin)}`;

const nomDuPoste = (poste: PosteCite | undefined): string => (poste === undefined ? SANS_POSTE : (poste.libelle ?? 'Poste inconnu'));

const nomDeLOperateur = (operateur: OperateurCite): string =>
  operateur.estNomme() ? [operateur.prenom, operateur.nom].filter(part => part !== undefined).join(' ') : 'Opérateur inconnu';

const activiteCitee = (activite: ActiviteCitee): string => {
  const lieu = `${nomDuPoste(activite.poste)} · ${activite.element.nom ?? 'élément inconnu'}`;
  return activite.nature === undefined ? lieu : `${lieu} (${activite.nature.value})`;
};

const tarif = (montant: Montant): string => `${formatMontantCertain(montant)}/h`;

const heuresDecimales = (part: PartDePointage): string => DECIMALES.format(part.duree.minutes / MINUTES_PAR_HEURE);

const contexteDePart = (part: PartDePointage): string => {
  if (part.partageInconnu()) {
    return `partage inconnu : pointage à résoudre sur ${part.bloquants.map(activiteCitee).join(', ')}`;
  }
  if (part.paralleles.length > 0) {
    return `aussi sur ${part.paralleles.map(activiteCitee).join(', ')}`;
  }
  return 'seul poste occupé';
};

const calculDePart = (pointage: PointageDeCout, part: PartDePointage): string => {
  if (pointage.tauxHoraire === undefined) {
    return 'Opérateur non valorisé';
  }
  const operation = `${DECIMALES.format(pointage.tauxHoraire.euros)} × ${heuresDecimales(part)} ÷ ${part.diviseur ?? '?'}`;
  return part.partageInconnu() ? `${operation} = inconnu` : `${operation} = ${formatMontant(part.mainDOeuvre)}`;
};

const calculMachine = (pointage: PointageDeCout): string => {
  if (pointage.poste === undefined) {
    return SANS_POSTE;
  }
  if (pointage.coutHoraire === undefined) {
    return 'Poste non valorisé';
  }
  return `${tarif(pointage.coutHoraire)} × ${formatDuree(pointage.duree)}`;
};

const ANOMALIES: Record<AnomalieDePointage, string> = {
  FIN_AUTOMATIQUE: 'Fin automatique',
  A_RESOUDRE: 'À résoudre',
  PARTAGE_INCONNU: 'Partage inconnu',
};

const TYPES_DE_POINTAGE: Record<TypeDePointage, string> = {
  DEBUT: 'début',
  NON_CONFORMITE: 'reprise en non-conformité',
  FIN: 'fin',
};

const pluriel = (nombre: number, singulier: string, pluriel: string): string => `${nombre} ${nombre === 1 ? singulier : pluriel}`;

const COMPTES_D_ANOMALIES: Record<AnomalieDePointage, (nombre: number) => string> = {
  FIN_AUTOMATIQUE: nombre => pluriel(nombre, 'fin automatique', 'fins automatiques'),
  A_RESOUDRE: nombre => `${nombre} à résoudre`,
  PARTAGE_INCONNU: nombre => pluriel(nombre, 'partage inconnu', 'partages inconnus'),
};

const compteDAnomalies = (compte: CompteDAnomalies): string => COMPTES_D_ANOMALIES[compte.anomalie](compte.nombre);

const contradictoires = (pointage: PointageDeCout): string =>
  pointage.contradictoires.map(fait => `${TYPES_DE_POINTAGE[fait.type]} à ${borne(fait.survenue)}`).join(', ');

const EXPLICATIONS: Record<AnomalieDePointage, (pointage: PointageDeCout) => string> = {
  FIN_AUTOMATIQUE: () =>
    'Aucune fin n’a été pointée : l’activité a été arrêtée automatiquement après 13 h et elle est comptée ainsi. Il faut ajouter le pointage de fin réel.',
  A_RESOUDRE: pointage =>
    pointage.contradictoires.length === 0
      ? 'Les pointages de cette activité se contredisent : il faut les corriger pour connaître sa durée et son coût.'
      : `Pointages contradictoires : ${contradictoires(pointage)}. Il faut les corriger pour connaître la durée et le coût de ce pointage.`,
  PARTAGE_INCONNU: pointage =>
    `Ce pointage est correct, mais ${nomDeLOperateur(pointage.operateur)} a un pointage à résoudre sur un autre poste pendant ce temps : tant qu’il n’est pas corrigé, on ne sait pas comment partager son temps.`,
};

const naturesEnAnomalie = (lignes: readonly LigneDeCout[]): string => {
  const natures = lignes.map(ligne => ligne.nature?.value ?? SANS_POSTE);
  return natures.length === 1 ? `la nature ${natures.join('')}` : `les natures ${natures.join(', ')}`;
};

const titreDuBandeau = (rapport: CoutDeRevient): string => {
  const lignes = rapport.lignesEnAnomalie();
  const nombre = lignes.reduce((total, ligne) => total + ligne.pointagesEnAnomalie(), 0);
  return `${pluriel(nombre, 'pointage', 'pointages')} en anomalie sur ${naturesEnAnomalie(lignes)}.`;
};

const detailDuBandeau = (rapport: CoutDeRevient): string =>
  `${rapport
    .lignesEnAnomalie()
    .map(ligne => `${ligne.nature?.value ?? SANS_POSTE} : ${ligne.anomalies().map(compteDAnomalies).join(', ')}`)
    .join(' · ')}. Dépliez la nature concernée pour voir ce qu’il manque sur chaque pointage.`;

export const LIBELLES_COUT_DE_REVIENT = {
  titre: 'Coût de revient',
  element: 'Élément',
  chargementElements: 'Chargement des éléments…',
  echecNavigation: 'Impossible d’ouvrir ce rapport. Réessayez de choisir un élément.',
  aucunResultat: 'Aucun élément ne correspond à la recherche.',
  aucunElement: 'Aucun élément disponible.',
  echecElements: 'Impossible de charger les éléments disponibles.',
  elementCourant: 'Élément courant',
  rechercherElement: 'Rechercher un élément',
  choisirElement: 'Choisir un élément',
  retour: 'Atelier',
  retourAria: 'Revenir à l’atelier',
  sousTitre:
    'Le temps passé sur cet élément et ce qu’il a coûté, par nature d’opération. Le rapport est recalculé à chaque lecture ; seules les activités terminées, y compris automatiquement, sont comptabilisées. Les activités en cours sont exclues du temps, du coût et du partage humain.',

  types: TYPES,
  sansPoste: SANS_POSTE,
  evaluation: (instant: InstantDeTravail): string => `Rapport évalué le ${DATE_HEURE.format(instant.value)}`,
  activitesExclues: (activites: ActivitesEnCoursExclues): string =>
    activites.nombre === 1
      ? '1 activité en cours exclue du temps, du coût et du partage humain.'
      : `${String(activites.nombre)} activités en cours exclues du temps, du coût et du partage humain.`,
  sansValeur: '—',

  indicateurCout: 'Coût de revient',
  indicateurTemps: 'Temps passé',
  repartitionAria: 'Répartition du coût entre machine et main d’œuvre',

  colonnes: {
    nature: 'Nature',
    travail: 'Travail',
    nonConformite: 'Non-conf.',
    tempsTotal: 'Temps total',
    machine: 'Machine',
    mainDOeuvre: 'Main d’œuvre',
    coutTotal: 'Coût total',
    detail: 'Détail',
  },
  tableau: 'Temps passé et coût, par nature d’opération',
  defilement: 'Tableau du coût de revient, défilement horizontal disponible',
  totalLigne: 'Total',

  nc: 'NC',
  detail: {
    tableau: (nature: string | undefined): string => `Pointages de ${nature ?? SANS_POSTE}`,
    colonnes: {
      poste: 'Poste',
      operateur: 'Opérateur',
      pointage: 'Pointage',
      duree: 'Durée',
      machine: 'Machine',
      machineAide: 'coût horaire × durée',
      mainDOeuvre: 'Main d’œuvre',
      mainDOeuvreAide: 'taux × durée ÷ postes simultanés',
      total: 'Total',
    },
    aucunPointage: 'Aucun pointage terminé sur cette nature.',
    totalDeLaNature: (nature: string | undefined): string => `Total ${nature ?? SANS_POSTE}`,
    legende:
      'Le coût machine n’est jamais divisé. Le taux de l’opérateur est divisé par le nombre de postes qu’il occupe en même temps, tous éléments confondus ; chaque montant est déjà arrondi au centime par le serveur.',
    tauxNonValorise: 'Opérateur non valorisé',
    poste: nomDuPoste,
    operateur: nomDeLOperateur,
    plage: plageDuPointage,
    plageDePart,
    tarif,
    diviseur: (part: PartDePointage): string => `÷${part.diviseur ?? '?'}`,
    contexteDePart,
    calculDePart,
    calculMachine,
    anomalie: (anomalie: AnomalieDePointage): string => ANOMALIES[anomalie],
    explication: (pointage: PointageDeCout, anomalie: AnomalieDePointage): string => EXPLICATIONS[anomalie](pointage),
    finAuPlusTard: (instant: InstantDeTravail): string => `fin au plus tard ${borne(instant)}`,
  },
  anomalies: {
    compte: compteDAnomalies,
    titre: titreDuBandeau,
    detail: detailDuBandeau,
  },

  chargement: 'Chargement du coût de revient…',
  echec: 'Impossible de charger le coût de revient. Vérifiez la connexion puis réessayez.',
  reessayer: 'Réessayer',
  elementIntrouvable: 'Cet élément n’existe plus au référentiel : son coût de revient ne peut pas être établi.',
  sansTravail: 'Aucun temps pointé',
  sansTravailDetails:
    'Cet élément est à l’atelier, mais personne n’y a encore pointé. Son coût de revient apparaîtra quand une activité sera terminée.',

  identite: (type: TypeDElementChiffre, nom: string): string => `${TYPES[type]} · ${nom}`,
  montant: formatMontant,
  duree: formatDuree,
  dureeCertaine: formatDureeCertaine,
  nature: (nature: string | undefined): string => nature ?? SANS_POSTE,

  repartition: (cout: Cout): string => `Machine ${formatMontant(cout.machine)} · Main d’œuvre ${formatMontant(cout.mainDOeuvre)}`,
  dontNonConformite: (temps: TempsPasse): string => `dont non-conformité ${formatDuree(temps.nonConformite)}`,
  detailDe: (nature: string | undefined): string => `Voir le détail de ${nature ?? SANS_POSTE}`,
} as const;
