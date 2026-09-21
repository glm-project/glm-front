/**
 * Le métier d'une ligne du rapport. Il vient du poste de travail, jamais de la personne, et il a été copié
 * au moment de la saisie : un poste requalifié depuis ne requalifie pas les heures déjà passées.
 */
export class NatureDOperation {
  constructor(readonly value: string) {
    if (value.trim() === '') {
      throw new Error('La nature d’opération reçue du serveur est vide.');
    }
  }
}
