import { InstantDeLaJournee } from './InstantDeLaJournee';

export interface MinuitsDuJour {
  readonly debut: InstantDeLaJournee;
  readonly fin: InstantDeLaJournee;
}

const seSuivent = (minuits: MinuitsDuJour): boolean => minuits.debut.estAvant(minuits.fin);

export class BornesDuJour {
  readonly debut: InstantDeLaJournee;
  readonly fin: InstantDeLaJournee;

  constructor(minuits: MinuitsDuJour) {
    if (!seSuivent(minuits)) {
      throw new Error('Les bornes du jour reçues du serveur ne se suivent pas.');
    }
    this.debut = minuits.debut;
    this.fin = minuits.fin;
  }
}
