import { GesteDAtelier } from '../journal-du-pupitre/JournalDuPupitre';
import { ContexteDeGesteDAtelier } from './FenetreOperateur';

export class ContextesParGeste {
  private constructor(private readonly contextes: ReadonlyMap<string, ContexteDeGesteDAtelier>) {}

  static aucun(): ContextesParGeste {
    return new ContextesParGeste(new Map());
  }

  static forGestes(gestes: readonly GesteDAtelier[], contexte: ContexteDeGesteDAtelier | undefined): ContextesParGeste {
    if (contexte === undefined) return ContextesParGeste.aucun();
    return new ContextesParGeste(new Map(gestes.map(geste => [geste.id, contexte])));
  }

  gesteIds(): ReadonlySet<string> {
    return new Set(this.contextes.keys());
  }

  contexteOf(gesteId: string): ContexteDeGesteDAtelier | undefined {
    return this.contextes.get(gesteId);
  }

  isEmpty(): boolean {
    return this.contextes.size === 0;
  }
}
