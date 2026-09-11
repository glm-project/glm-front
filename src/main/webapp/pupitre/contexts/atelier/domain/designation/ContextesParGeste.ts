import { GesteDAtelier } from '../journal-du-pupitre/JournalDuPupitre';
import { ContexteDeGesteDAtelier } from './fenetre-operateur/ContexteDeGesteDAtelier';

export class ContextesParGeste {
  private constructor(private readonly contextes: ReadonlyMap<string, ContexteDeGesteDAtelier>) {}

  static empty(): ContextesParGeste {
    return new ContextesParGeste(new Map());
  }

  static forGestes(gestes: readonly GesteDAtelier[], contexte: ContexteDeGesteDAtelier | undefined): ContextesParGeste {
    if (contexte === undefined) return ContextesParGeste.empty();
    return new ContextesParGeste(new Map(gestes.map(geste => [geste.id, contexte])));
  }

  gesteIds(): ReadonlySet<string> {
    return new Set(this.contextes.keys());
  }

  contexteOf(gesteId: string): ContexteDeGesteDAtelier | undefined {
    return this.contextes.get(gesteId);
  }
}
