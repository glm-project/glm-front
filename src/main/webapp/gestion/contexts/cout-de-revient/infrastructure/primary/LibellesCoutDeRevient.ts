import { TypeDElementChiffre } from '../../domain/element/TypeDElementChiffre';
import { Cout } from '../../domain/montant/Cout';
import { Montant } from '../../domain/montant/Montant';
import { DureePassee } from '../../domain/temps/DureePassee';
import { PeriodeDeTravail } from '../../domain/temps/PeriodeDeTravail';
import { TempsPasse } from '../../domain/temps/TempsPasse';

const TYPES: Record<TypeDElementChiffre, string> = {
  ORDRE_DE_FABRICATION: 'OF',
  PRODUIT: 'Moule',
};

const EUROS = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });

/** Une période est faite d'instants : elle s'affiche dans le fuseau du navigateur. Voir `AGENTS.md`. */
const DATE_HEURE = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const SANS_POSTE = 'Sans poste';

const formatDuree = (duree: DureePassee): string => `${duree.heures} h ${String(duree.minutesRestantes).padStart(2, '0')}`;

const formatMontant = (montant: Montant): string => EUROS.format(montant.euros);

const formatPeriode = (periode: PeriodeDeTravail): string => DATE_HEURE.formatRange(periode.debut.value, periode.fin.value);

export const LIBELLES_COUT_DE_REVIENT = {
  titre: 'Coût de revient',
  retour: 'Atelier',
  retourAria: 'Revenir à l’atelier',
  sousTitre:
    'Le temps passé sur cet élément et ce qu’il a coûté, par nature d’opération. Le rapport est recalculé à chaque lecture ; un travail en cours est arrêté à l’instant où vous le consultez.',

  types: TYPES,
  sansPoste: SANS_POSTE,
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

  periodeLabel: 'Période',
  nonConformitesLabel: 'Reprises de non-conformité',
  sansNonConformite: 'Aucune reprise',

  chargement: 'Chargement du coût de revient…',
  echec: 'Impossible de charger le coût de revient. Vérifiez la connexion puis réessayez.',
  reessayer: 'Réessayer',
  elementIntrouvable: 'Cet élément n’existe plus au référentiel : son coût de revient ne peut pas être établi.',
  sansTravail: 'Aucun temps pointé',
  sansTravailDetails:
    'Cet élément est à l’atelier, mais personne n’y a encore pointé. Son coût de revient apparaîtra dès le premier pointage.',

  identite: (type: TypeDElementChiffre, nom: string): string => `${TYPES[type]} · ${nom}`,
  montant: formatMontant,
  duree: formatDuree,
  periode: formatPeriode,
  nature: (nature: string | undefined): string => nature ?? SANS_POSTE,

  repartition: (cout: Cout): string => `Machine ${formatMontant(cout.machine)} · Main d’œuvre ${formatMontant(cout.mainDOeuvre)}`,
  dontNonConformite: (temps: TempsPasse): string => `dont non-conformité ${formatDuree(temps.nonConformite)}`,
  detailDe: (nature: string | undefined): string => `Voir le détail de ${nature ?? SANS_POSTE}`,
} as const;
