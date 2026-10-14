import { InstantDeLaJournee } from './InstantDeLaJournee';

export interface MinuitsDuJour {
  readonly debut: InstantDeLaJournee;
  readonly fin: InstantDeLaJournee;
  readonly finDuLendemain: InstantDeLaJournee;
}

const seSuivent = (minuits: MinuitsDuJour): boolean => minuits.debut.estAvant(minuits.fin) && minuits.fin.estAvant(minuits.finDuLendemain);

export class BornesDuJour {
  readonly debut: InstantDeLaJournee;
  readonly fin: InstantDeLaJournee;
  readonly finDuLendemain: InstantDeLaJournee;

  constructor(minuits: MinuitsDuJour) {
    if (!seSuivent(minuits)) {
      throw new Error('Les bornes du jour reçues du serveur ne se suivent pas.');
    }
    this.debut = minuits.debut;
    this.fin = minuits.fin;
    this.finDuLendemain = minuits.finDuLendemain;
  }
}
