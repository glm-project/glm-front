import { CorrectionsPort, ResultatDeCorrection } from '@/gestion/contexts/correction-des-activites/domain/correction/CorrectionsPort';
import { SaisieDeRetrait } from '@/gestion/contexts/correction-des-activites/domain/correction/SaisieDeRetrait';

const realSetTimeout = setTimeout;

export type ReponseDeCorrection = ResultatDeCorrection | Error;

export class CorrectionsFixture extends CorrectionsPort {
  readonly retraits: SaisieDeRetrait[] = [];
  private readonly reponses: ReponseDeCorrection[] = [];
  private arrivee: (() => void) | undefined;
  private liberation: (() => void) | undefined;

  repondre(...reponses: ReponseDeCorrection[]): void {
    this.reponses.push(...reponses);
  }

  retenir(): Promise<void> {
    return new Promise(resolve => {
      this.arrivee = resolve;
    });
  }

  liberer(): void {
    this.liberation?.();
  }

  override retirer(saisie: SaisieDeRetrait): Promise<ResultatDeCorrection> {
    this.retraits.push(saisie);
    const reponse = this.reponses.shift() ?? { kind: 'ENREGISTREE' };
    this.arrivee?.();
    return new Promise((resolve, reject) => {
      const repondre = (): void => {
        if (reponse instanceof Error) reject(reponse);
        else resolve(reponse);
      };
      if (this.arrivee === undefined) realSetTimeout(repondre);
      else this.liberation = repondre;
    });
  }
}
