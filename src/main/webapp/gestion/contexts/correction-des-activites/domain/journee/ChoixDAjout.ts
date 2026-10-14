import { PosteDeLaJournee } from './PosteDeLaJournee';
import { SuivisPresents } from './SuivisPresents';

export interface ContenuDuChoixDAjout {
  readonly suivis: SuivisPresents;
  readonly postes: readonly PosteDeLaJournee[];
}

export class ChoixDAjout {
  readonly suivis: SuivisPresents;
  readonly postes: readonly PosteDeLaJournee[];

  constructor(contenu: ContenuDuChoixDAjout) {
    this.suivis = contenu.suivis;
    this.postes = [...contenu.postes];
  }
}
