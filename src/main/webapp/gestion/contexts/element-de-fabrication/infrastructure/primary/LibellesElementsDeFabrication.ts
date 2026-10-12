import { CategorieDeProduit } from '../../domain/CategorieDeProduit';
import { CycleDuProduit } from '../../domain/CycleDuProduit';
import { EtatDAtelier } from '../../domain/EtatDAtelier';
import { PrereglageDeCloture } from '../../domain/PeriodeDeCloture';

const CYCLES: Record<CycleDuProduit, string> = {
  EN_PREPARATION: 'En préparation',
  EN_ATELIER: 'En atelier',
  CLOTURE: 'Clôturés',
};

const TABLEAUX: Record<CycleDuProduit, string> = {
  EN_PREPARATION: 'Produits en préparation',
  EN_ATELIER: 'Produits en atelier',
  CLOTURE: 'Produits clôturés',
};

const VIDES: Record<CycleDuProduit, string> = {
  EN_PREPARATION: 'Aucun produit en préparation. Créez-en un avec « Nouveau produit ».',
  EN_ATELIER: 'Rien à l’atelier pour l’instant.',
  CLOTURE: 'Aucun produit clôturé sur cette période.',
};

const ETATS: Record<EtatDAtelier, string> = {
  EN_ATTENTE: 'En attente',
  EN_COURS: 'En cours',
  INTERROMPU: 'Interrompu',
};

export const LIBELLES_ELEMENTS_DE_FABRICATION = {
  titre: 'Produits',
  sousTitre: 'Ce que l’atelier fabrique, de la préparation à la clôture.',
  cycles: CYCLES,
  cyclesAria: 'Cycle des produits',
  recherche: 'Rechercher un produit',
  actualiser: 'Actualiser',
  filtrerCategorie: 'Filtrer par catégorie',
  tous: 'Tous',
  aucunResultat: 'Aucun produit ne correspond à cette recherche.',
  creation: 'Nouveau produit',
  modification: (numero: string): string => `Modifier ${numero}`,
  miseALAtelier: 'Mettre à l’atelier',
  miseALAtelierDe: (numero: string): string => `Mettre ${numero} à l’atelier`,
  cloturer: 'Clôturer',
  clotureDe: (numero: string): string => `Clôturer ${numero}`,
  rouvrir: 'Rouvrir',
  reouvertureDe: (numero: string): string => `Rouvrir ${numero}`,
  coutDeRevient: 'Coût de revient',
  coutDeRevientDe: (numero: string): string => `Voir le coût de revient de ${numero}`,
  etats: ETATS,
  par: (auteur: string): string => `par ${auteur}`,
  colonnes: {
    categorie: 'Catégorie',
    nom: 'Nom',
    reference: 'Référence',
    libelle: 'Libellé',
    creeLe: 'Créé le',
    etat: 'État',
    misALAtelierLe: 'Mis à l’atelier le',
    clotureLe: 'Clôturé le',
    actions: 'Actions',
  },
  tableaux: TABLEAUX,
  referentiel: 'Référentiel des produits',
  defilement: 'Tableau des produits, défilement horizontal disponible',
  chargement: 'Chargement des produits…',
  erreur: 'Impossible de charger les produits. Vérifiez la connexion puis réessayez.',
  reessayer: 'Réessayer',
  erreurAction: 'L’action a échoué. Vérifiez la connexion puis réessayez.',
  periode: {
    aria: 'Période de clôture',
    prereglages: { CE_MOIS: 'Ce mois', TROIS_MOIS: '3 mois', DOUZE_MOIS: '12 mois' } satisfies Record<PrereglageDeCloture, string>,
    du: 'Clôturés du',
    au: 'au',
  },
  annonces: {
    misALAtelier: (numero: string): string => `${numero} mis à l’atelier`,
    cloture: (numero: string): string => `${numero} clôturé`,
    rouvert: (numero: string): string => `${numero} rouvert`,
    voir: 'Voir',
    fermer: 'Fermer l’annonce',
  },
  vides: VIDES,
  sansCategorie: 'Aucune catégorie de produit',
  sansCategorieDetails: 'Déclarez d’abord une catégorie de produit : les produits se créent dans une catégorie.',
  sansValeur: '—',
  pagination: {
    aria: 'Pagination des produits',
    suivante: 'Suivante',
    precedente: 'Précédente',
    intervalle: (premier: number, dernier: number, total: number): string => `${premier}–${dernier} sur ${total}`,
  },
} as const;

export const LIBELLES_CATEGORIES_DE_PRODUIT = {
  ouvrir: 'Catégories',
  titre: 'Catégories de produit',
  introduction: 'Les produits se créent dans une catégorie. Son code s’affiche tel quel et préfixe le nom des produits.',
  chargement: 'Chargement des catégories…',
  erreur: 'Impossible de charger les catégories. Vérifiez la connexion puis réessayez.',
  reessayer: 'Réessayer',
  vide: 'Aucune catégorie déclarée.',
  liste: 'Catégories, dans l’ordre des boutons de création',
  monter: (categorie: CategorieDeProduit): string => `Monter ${categorie.value}`,
  descendre: (categorie: CategorieDeProduit): string => `Descendre ${categorie.value}`,
  supprimer: (categorie: CategorieDeProduit): string => `Supprimer ${categorie.value}`,
  erreurDeplacement: 'Le déplacement a échoué. Vérifiez la connexion puis réessayez.',
  nouvelle: 'Nouvelle catégorie',
  nouvelleComplement: '(code de 1 à 10 lettres)',
  aideCode: 'Le code ne pourra plus être modifié : il préfixe le nom des produits. Entrée pour déclarer, Échap pour annuler.',
  declarer: 'Déclarer',
  declaration: 'Déclaration…',
  annulerAjout: 'Annuler',
  erreurTechnique: 'La déclaration a échoué. Vérifiez la connexion puis réessayez.',
  fermer: 'Fermer',
} as const;

export const LIBELLES_SUPPRESSION_CATEGORIE = {
  question: (categorie: CategorieDeProduit): string => `Supprimer ${categorie.value} ?`,
  annuler: 'Annuler',
  confirmer: 'Supprimer',
  encours: 'Suppression…',
  erreurTechnique: 'La suppression a échoué. Vérifiez la connexion puis réessayez.',
} as const;

export const LIBELLES_FORMULAIRE_ELEMENT = {
  categorie: 'Catégorie',
  categorieAChoisir: '— Choisir —',
  categorieAide: 'Son code préfixe le nom du produit. Elle ne se change plus ensuite.',
  introduction:
    'La référence et le libellé sont facultatifs : un produit se réduit légitimement à son seul numéro, attribué automatiquement.',
  reference: 'Référence',
  referenceComplement: '(le numéro de l’entreprise, facultatif)',
  referenceAide: 'Laissez vide si l’entreprise ne donne pas de numéro à cet élément.',
  libelle: 'Libellé',
  libelleComplement: '(une ligne, facultatif)',
  libelleAide: 'Ce qui rend l’élément reconnaissable quand il n’a pas de référence.',
  erreurTechnique: 'L’enregistrement a échoué. Vérifiez la connexion puis réessayez.',
  annuler: 'Annuler',
  enregistrer: 'Enregistrer',
  enregistrement: 'Enregistrement…',
} as const;

export const LIBELLES_CLOTURE = {
  titre: 'Clôturer le produit ?',
  description: (numero: string): string =>
    `${numero} disparaîtra des écrans des opérateurs, qui ne pourront plus pointer dessus. Vous pourrez le rouvrir à tout moment.`,
  erreurTechnique: 'La clôture a échoué. Vérifiez la connexion puis réessayez.',
  annuler: 'Annuler',
  confirmer: 'Clôturer',
  encours: 'Clôture…',
} as const;
