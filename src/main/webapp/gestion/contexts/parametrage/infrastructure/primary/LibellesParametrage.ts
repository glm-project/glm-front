import { ArretDUneActivite } from '../../domain/DureeMaxDActivite';

const deuxChiffres = (valeur: number): string => String(valeur).padStart(2, '0');

export const LIBELLES_PARAMETRES = {
  titre: 'Paramètres',
  introduction: 'Les réglages de votre entreprise. Ils s’appliquent à tous les postes et à tous les opérateurs.',
  chargement: 'Chargement des paramètres…',
  erreur: 'Impossible de charger les paramètres. Vérifiez la connexion puis réessayez.',
  reessayer: 'Réessayer',
  activites: 'Activités',
  duree: 'Durée max d’une activité',
  dureeComplement: '(en heures, de 1 à 24)',
  dureeAide:
    'Une activité que personne n’a terminée s’arrête seule au bout de cette durée, et apparaît dans les anomalies. '
    + 'La nouvelle durée vaut pour les activités commencées après l’enregistrement ; celles déjà en cours gardent la leur.',
  exemple: (arret: ArretDUneActivite): string =>
    `Exemple : une activité commencée à 08:00 et jamais terminée s’arrête à ${deuxChiffres(arret.heure)}:00${arret.lendemain ? ' le lendemain' : ''}.`,
  enregistrer: 'Enregistrer',
  enregistrement: 'Enregistrement…',
  enregistree: 'Durée enregistrée.',
  erreurEnregistrement: 'La durée n’a pas pu être enregistrée. Vérifiez la connexion puis réessayez.',
  logo: 'Logo de l’entreprise',
  logoAide: 'Il s’affiche en haut de la supervision, du pupitre et des comptes rendus PDF, à la place du logo GLM.',
  logoAlternative: 'Logo de l’entreprise',
  tailleReelle: 'Taille réelle',
  pasEncoreEnregistre: 'Pas encore enregistré',
  logoGlm: 'Logo GLM',
  logoIndisponible: 'Le logo n’a pas pu être affiché. Rechargez la page pour réessayer.',
  regles: ['Image PNG ou JPEG', '256 × 256 pixels au plus, en longueur ou en carré', '50 Ko au plus'],
  choisirLogo: 'Choisir une image…',
  depotEnCours: 'Envoi du logo…',
  enregistrerLogo: 'Enregistrer le logo',
  annulerChoix: 'Annuler',
  logoEnregistre: 'Logo enregistré.',
  refusServeur: (message: string): string => `Le logo a été refusé : ${message}`,
  erreurDepot: 'Le logo n’a pas pu être envoyé. Vérifiez la connexion puis réessayez.',
  retirer: 'Retirer le logo',
  confirmerRetrait: 'Confirmer le retrait',
  annulerRetrait: 'Annuler',
  retraitEnCours: 'Retrait…',
  logoRetire: 'Logo retiré. Les en-têtes affichent le logo GLM.',
  erreurRetrait: 'Le logo n’a pas pu être retiré. Vérifiez la connexion puis réessayez.',
} as const;
