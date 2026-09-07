import { VueDEnrolement } from '@/pupitre/contexts/enrolement/domain/Enrolement';

const SECONDES_PAR_MINUTE = 60;

const surDeuxChiffres = (valeur: number): string => String(valeur).padStart(2, '0');

const STATUTS: Record<VueDEnrolement['kind'], string> = {
  DEMANDE_EN_COURS: "Demande d'autorisation en cours…",
  EN_ATTENTE_D_APPROBATION: "En attente de validation par l'administrateur",
  EXPIRE: "Le code d'autorisation a expiré",
  REFUSE: "Autorisation refusée par l'administrateur",
  ERREUR_RESEAU_INITIALE: "Connexion Internet requise pour enrôler l'appareil",
  VALIDE_CHARGEMENT_ATELIER: "Appareil validé — Chargement de l'atelier en cours...",
  ATTENTE_RESEAU_ATELIER: "Appareil validé — En attente de connexion pour charger l'atelier",
  ENROLE_ET_PRET: 'Appareil enrôlé',
};

export const LIBELLES_ENROLEMENT = {
  statut: (kind: VueDEnrolement['kind']): string => STATUTS[kind],
  consigneScan: 'Scannez depuis votre smartphone pour valider ce pupitre',
  descriptionQrCode: 'Code QR de validation du pupitre',
  adresseAlternative: (verificationUri: string): string => `Ou rendez-vous sur ${verificationUri}`,
  compteARebours: (secondesRestantes: number): string =>
    `Expire dans ${surDeuxChiffres(Math.floor(secondesRestantes / SECONDES_PAR_MINUTE))}:${surDeuxChiffres(secondesRestantes % SECONDES_PAR_MINUTE)}`,
  nouveauCode: 'Demander un nouveau code',
  recommencer: 'Recommencer',
  reessayer: 'Réessayer',
} as const;

export const LIBELLES_REINITIALISATION = {
  titre: "Réinitialiser l'enrôlement ?",
  message: "L'enrôlement de cet appareil sera révoqué sur le serveur et le pupitre devra être ré-enrôlé.",
  annuler: 'Annuler',
  confirmer: 'Réinitialiser',
} as const;
