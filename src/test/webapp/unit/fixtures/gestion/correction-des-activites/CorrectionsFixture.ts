import {
  CorrectionsPort,
  MotifDAjout,
  MotifDeChangementDePoste,
  MotifDeRegularisation,
  ResultatDeCorrection,
} from '@/gestion/contexts/correction-des-activites/domain/correction/CorrectionsPort';
import { SaisieDAjout } from '@/gestion/contexts/correction-des-activites/domain/correction/SaisieDAjout';
import { SaisieDeChangementDePoste } from '@/gestion/contexts/correction-des-activites/domain/correction/SaisieDeChangementDePoste';
import { SaisieDeRegularisation } from '@/gestion/contexts/correction-des-activites/domain/correction/SaisieDeRegularisation';
import { SaisieDeRetrait } from '@/gestion/contexts/correction-des-activites/domain/correction/SaisieDeRetrait';

const realSetTimeout = setTimeout;

export type ReponseDeCorrection = ResultatDeCorrection | Error;
export type ReponseDeChangementDePoste = ResultatDeCorrection<MotifDeChangementDePoste> | Error;
export type ReponseDAjout = ResultatDeCorrection<MotifDAjout> | Error;
export type ReponseDeRegularisation = ResultatDeCorrection<MotifDeRegularisation> | Error;

export class CorrectionsFixture extends CorrectionsPort {
  readonly retraits: SaisieDeRetrait[] = [];
  readonly changements: SaisieDeChangementDePoste[] = [];
  readonly ajouts: SaisieDAjout[] = [];
  readonly regularisations: SaisieDeRegularisation[] = [];
  private readonly reponsesAuxRetraits: ReponseDeCorrection[] = [];
  private readonly reponsesAuxChangements: ReponseDeChangementDePoste[] = [];
  private readonly reponsesAuxAjouts: ReponseDAjout[] = [];
  private readonly reponsesAuxRegularisations: ReponseDeRegularisation[] = [];
  private arrivee: (() => void) | undefined;
  private liberation: (() => void) | undefined;

  repondre(...reponses: ReponseDeCorrection[]): void {
    this.reponsesAuxRetraits.push(...reponses);
  }

  repondreAuChangement(...reponses: ReponseDeChangementDePoste[]): void {
    this.reponsesAuxChangements.push(...reponses);
  }

  repondreALAjout(...reponses: ReponseDAjout[]): void {
    this.reponsesAuxAjouts.push(...reponses);
  }

  repondreALaRegularisation(...reponses: ReponseDeRegularisation[]): void {
    this.reponsesAuxRegularisations.push(...reponses);
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

  override ajouter(saisie: SaisieDAjout): Promise<ResultatDeCorrection<MotifDAjout>> {
    this.ajouts.push(saisie);
    return this.repondreA(this.reponsesAuxAjouts.shift() ?? { kind: 'ENREGISTREE' });
  }

  override regulariserLaFin(saisie: SaisieDeRegularisation): Promise<ResultatDeCorrection<MotifDeRegularisation>> {
    this.regularisations.push(saisie);
    return this.repondreA(this.reponsesAuxRegularisations.shift() ?? { kind: 'ENREGISTREE' });
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
