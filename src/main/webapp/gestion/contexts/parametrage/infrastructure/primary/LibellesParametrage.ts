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
} as const;
