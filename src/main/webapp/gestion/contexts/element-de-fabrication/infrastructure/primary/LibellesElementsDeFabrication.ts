import { TypeDElementDeFabrication } from '../../domain/TypeDElementDeFabrication';

const TYPES: Record<TypeDElementDeFabrication, string> = {
  PRODUIT: 'Moule',
  ORDRE_DE_FABRICATION: 'OF',
};

const CREATIONS: Record<TypeDElementDeFabrication, string> = {
  PRODUIT: 'Nouveau moule',
  ORDRE_DE_FABRICATION: 'Nouvel OF',
};

const MODIFICATIONS: Record<TypeDElementDeFabrication, string> = {
  PRODUIT: 'Modifier le moule',
  ORDRE_DE_FABRICATION: 'Modifier l’OF',
};

const COUTS_DE_REVIENT: Record<TypeDElementDeFabrication, string> = {
  PRODUIT: 'Voir le coût de revient du moule',
  ORDRE_DE_FABRICATION: 'Voir le coût de revient de l’OF',
};

export const LIBELLES_ELEMENTS_DE_FABRICATION = {
  titre: 'Moules et OF',
  sousTitre: 'Créez et tenez à jour les moules et les OF de l’atelier.',
  types: TYPES,
  creations: CREATIONS,
  modification: (type: TypeDElementDeFabrication, numero: string): string => `${MODIFICATIONS[type]} ${numero}`,
  miseALAtelier: 'Mettre à l’atelier',
  miseALAtelierDe: (type: TypeDElementDeFabrication, numero: string): string => `Mettre ${TYPES[type]} ${numero} à l’atelier`,
  coutDeRevient: 'Coût de revient',
  coutDeRevientDe: (type: TypeDElementDeFabrication, numero: string): string => `${COUTS_DE_REVIENT[type]} ${numero}`,
  colonnes: {
    type: 'Type',
    reference: 'Référence',
    nom: 'Nom',
    libelle: 'Libellé',
    actions: 'Actions',
  },
  tableau: 'Moules et OF de l’atelier',
  referentiel: 'Référentiel des moules et des OF',
  defilement: 'Tableau des moules et OF, défilement horizontal disponible',
  chargement: 'Chargement des moules et OF…',
  erreur: 'Impossible de charger les moules et OF. Vérifiez la connexion puis réessayez.',
  reessayer: 'Réessayer',
  vide: 'Aucun moule ni OF',
  videDetails: 'Créez le premier élément de fabrication du référentiel. Son numéro interne sera attribué automatiquement.',
  sansValeur: '—',
  pagination: {
    aria: 'Pagination des moules et OF',
    parPage: 'Éléments par page',
    suivante: 'Page suivante',
    precedente: 'Page précédente',
    premiere: 'Première page',
    derniere: 'Dernière page',
    vide: '0 élément',
    intervalle: (premier: number, dernier: number, total: number): string => `${premier}–${dernier} sur ${total}`,
  },
} as const;

export const LIBELLES_FORMULAIRE_ELEMENT = {
  introduction: 'Les deux champs sont facultatifs : un moule ou un OF se réduit légitimement à son seul numéro, attribué automatiquement.',
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
