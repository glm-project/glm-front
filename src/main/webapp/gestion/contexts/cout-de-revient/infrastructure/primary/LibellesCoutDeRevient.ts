import { TypeDElementChiffre } from '../../domain/element/TypeDElementChiffre';
import { Cout } from '../../domain/montant/Cout';
import { Montant } from '../../domain/montant/Montant';
import { TotalDeMontant } from '../../domain/montant/TotalDeMontant';
import { ActivitesEnCoursExclues } from '../../domain/rapport/ActivitesEnCoursExclues';
import { DureePassee } from '../../domain/temps/DureePassee';
import { InstantDeTravail } from '../../domain/temps/InstantDeTravail';
import { PeriodeDeTravail } from '../../domain/temps/PeriodeDeTravail';
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

const formatPeriode = (periode: PeriodeDeTravail): string =>
  periode.fin === undefined
    ? `${DATE_HEURE.format(periode.debut.value)} · Fin à résoudre`
    : DATE_HEURE.formatRange(periode.debut.value, periode.fin.value);

export const LIBELLES_COUT_DE_REVIENT = {
  titre: 'Coût de revient',
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

  finAutomatique: 'Fin automatique',
  finsAutomatiquesLabel: 'Fins automatiques — anomalie active',
  finAutomatiqueDetails:
    'Ces activités terminées automatiquement après 13 heures sont comptabilisées. Une fin réelle recevable ou une correction retire leur anomalie au recalcul.',
  conflits: 'Séquences en conflit',
  conflitsDetails:
    'Ces pointages nécessitent une décision du gestionnaire. Une séquence sur un autre élément peut aussi rendre le partage humain incomplet.',
  conflitElement: 'Élément (identifiant)',
  conflitOperateur: 'Opérateur (identifiant)',
  conflitPoste: 'Poste (identifiant)',
  conflitActivites: 'Activités de la séquence',
  conflitPointages: 'Pointages contradictoires',
  conflitSansActivite: 'Aucune activité dans cette séquence',
  nc: 'NC',
  periodeLabel: 'Période',
  nonConformitesLabel: 'Reprises de non-conformité',
  absenceDeReprise: (temps: TempsPasse): string => (temps.nonConformite.snapshot().complete ? 'Aucune reprise' : 'À résoudre'),

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
  periode: formatPeriode,
  nature: (nature: string | undefined): string => nature ?? SANS_POSTE,

  repartition: (cout: Cout): string => `Machine ${formatMontant(cout.machine)} · Main d’œuvre ${formatMontant(cout.mainDOeuvre)}`,
  dontNonConformite: (temps: TempsPasse): string => `dont non-conformité ${formatDuree(temps.nonConformite)}`,
  detailDe: (nature: string | undefined): string => `Voir le détail de ${nature ?? SANS_POSTE}`,
} as const;
