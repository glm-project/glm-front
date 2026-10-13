import {
  CorrectionsPort,
  MotifDeChangementDePoste,
  ResultatDeCorrection,
} from '@/gestion/contexts/correction-des-activites/domain/correction/CorrectionsPort';
import { SaisieDeChangementDePoste } from '@/gestion/contexts/correction-des-activites/domain/correction/SaisieDeChangementDePoste';
import { SaisieDeRetrait } from '@/gestion/contexts/correction-des-activites/domain/correction/SaisieDeRetrait';

const realSetTimeout = setTimeout;

export type ReponseDeCorrection = ResultatDeCorrection | Error;
export type ReponseDeChangementDePoste = ResultatDeCorrection<MotifDeChangementDePoste> | Error;

export class CorrectionsFixture extends CorrectionsPort {
  readonly retraits: SaisieDeRetrait[] = [];
  readonly changements: SaisieDeChangementDePoste[] = [];
  private readonly reponsesAuxRetraits: ReponseDeCorrection[] = [];
  private readonly reponsesAuxChangements: ReponseDeChangementDePoste[] = [];
  private arrivee: (() => void) | undefined;
  private liberation: (() => void) | undefined;

  repondre(...reponses: ReponseDeCorrection[]): void {
    this.reponsesAuxRetraits.push(...reponses);
  }

  repondreAuChangement(...reponses: ReponseDeChangementDePoste[]): void {
    this.reponsesAuxChangements.push(...reponses);
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
    return this.repondreA(this.reponsesAuxRetraits.shift() ?? { kind: 'ENREGISTREE' });
  }

  override changerDePoste(saisie: SaisieDeChangementDePoste): Promise<ResultatDeCorrection<MotifDeChangementDePoste>> {
    this.changements.push(saisie);
    return this.repondreA(this.reponsesAuxChangements.shift() ?? { kind: 'ENREGISTREE' });
  }

  private repondreA<R>(reponse: R | Error): Promise<R> {
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
