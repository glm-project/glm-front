import { EtatALAtelier } from '../../domain/EtatALAtelier';
import { FiltreDAtelier } from '../../domain/FiltreDAtelier';
import { TypeDElementEngage } from '../../domain/TypeDElementEngage';

const TYPES: Record<TypeDElementEngage, string> = {
  PRODUIT: 'Moule',
  ORDRE_DE_FABRICATION: 'OF',
};

const ETATS: Record<EtatALAtelier, string> = {
  EN_ATTENTE: 'En attente',
  EN_COURS: 'En cours',
  INTERROMPU: 'Interrompu',
  CLOTURE: 'Clôturé',
};

const FILTRES: Record<FiltreDAtelier, string> = {
  ACTIFS: 'À l’atelier',
  CLOTURES: 'Clôturés',
};

const VIDES: Record<FiltreDAtelier, string> = {
  ACTIFS: 'Aucun élément à l’atelier',
  CLOTURES: 'Aucun élément clôturé',
};

const VIDES_DETAILS: Record<FiltreDAtelier, string> = {
  ACTIFS: 'Mettez un moule ou un OF à l’atelier pour qu’il apparaisse sur les écrans des opérateurs.',
  CLOTURES: 'Les éléments que vous clôturerez se retrouveront ici, et resteront réouvrables.',
};

export const LIBELLES_ATELIER = {
  titre: 'Atelier',
  sousTitre: 'Mettez les moules et les OF à l’atelier, puis clôturez-les quand ils sont terminés.',
  types: TYPES,
  etats: ETATS,
  filtres: FILTRES,
  filtreAria: 'Ce que la liste montre',
  mettreALAtelier: 'Mettre à l’atelier',
  cloturer: 'Clôturer',
  rouvrir: 'Rouvrir',
  clotureDe: (nom: string): string => `Clôturer ${nom}`,
  reouvertureDe: (nom: string): string => `Rouvrir ${nom}`,
  colonnes: {
    type: 'Type',
    nom: 'Nom',
    etat: 'État',
    engagement: 'Mis à l’atelier le',
    cloture: 'Clôturé le',
    actions: 'Actions',
  },
  tableau: 'Éléments de l’atelier',
  defilement: 'Tableau de l’atelier, défilement horizontal disponible',
  chargement: 'Chargement de l’atelier…',
  erreur: 'Impossible de charger l’atelier. Vérifiez la connexion puis réessayez.',
  reessayer: 'Réessayer',
  vides: VIDES,
  videsDetails: VIDES_DETAILS,
  sansValeur: '—',
  par: (auteur: string): string => `par ${auteur}`,
  pagination: {
    aria: 'Pagination de l’atelier',
    parPage: 'Éléments par page',
    suivante: 'Page suivante',
    precedente: 'Page précédente',
    premiere: 'Première page',
    derniere: 'Dernière page',
    vide: '0 élément',
    intervalle: (premier: number, dernier: number, total: number): string => `${premier}–${dernier} sur ${total}`,
  },
} as const;

export const LIBELLES_MISE_A_L_ATELIER = {
  titre: 'Mettre à l’atelier',
  introduction: 'L’élément apparaîtra immédiatement sur les écrans des opérateurs. Cet acte ne porte aucune date.',
  chargement: 'Chargement du référentiel…',
  erreur: 'Impossible de charger le référentiel. Vérifiez la connexion puis réessayez.',
  reessayer: 'Réessayer',
  introuvable: 'Cet élément n’existe plus dans le référentiel.',
  vide: 'Aucun moule ni OF dans le référentiel.',
  colonnes: {
    type: 'Type',
    designation: 'Désignation',
    actions: 'Actions',
  },
  tableau: 'Moules et OF engageables',
  engager: 'Mettre à l’atelier',
  engagementDe: (designation: string): string => `Mettre ${designation} à l’atelier`,
  engagement: 'Mise à l’atelier…',
  erreurTechnique: 'La mise à l’atelier a échoué. Vérifiez la connexion puis réessayez.',
  fermer: 'Fermer',
  pagination: {
    aria: 'Pagination du référentiel engageable',
    parPage: 'Éléments par page',
    suivante: 'Page suivante',
    precedente: 'Page précédente',
    premiere: 'Première page',
    derniere: 'Dernière page',
    vide: '0 élément',
    intervalle: (premier: number, dernier: number, total: number): string => `${premier}–${dernier} sur ${total}`,
  },
} as const;

export const LIBELLES_CLOTURE = {
  titre: 'Clôturer l’élément ?',
  description: (nom: string): string =>
    `${nom} disparaîtra des écrans des opérateurs, qui ne pourront plus pointer dessus. Vous pourrez le rouvrir à tout moment.`,
  erreurTechnique: 'La clôture a échoué. Vérifiez la connexion puis réessayez.',
  annuler: 'Annuler',
  confirmer: 'Clôturer',
  encours: 'Clôture…',
} as const;
