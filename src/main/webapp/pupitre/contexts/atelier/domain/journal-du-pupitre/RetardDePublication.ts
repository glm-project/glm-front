import { EvenementDuJournal, EvenementEnAttente, JournalDuPupitre } from './JournalDuPupitre';

export const SEUIL_DU_RETARD_DE_PUBLICATION = 3_600_000;

const isPending = (evenement: EvenementDuJournal): evenement is EvenementEnAttente => evenement.etat === 'EN_ATTENTE';

export class RetardDePublication {
  private constructor(
    readonly gestes: number,
    readonly depuis: number,
  ) {}

  static of(journal: JournalDuPupitre, instant: number): RetardDePublication | undefined {
    const enAttente = journal.evenements.filter(isPending);
    const [plusAncien] = enAttente.map(({ geste }) => Date.parse(geste.dateDeSurvenue)).sort((a, b) => a - b);
    if (plusAncien === undefined) return undefined;
    const depuis = instant - plusAncien;
    if (depuis < SEUIL_DU_RETARD_DE_PUBLICATION) return undefined;
    return new RetardDePublication(enAttente.length, depuis);
  }
}
