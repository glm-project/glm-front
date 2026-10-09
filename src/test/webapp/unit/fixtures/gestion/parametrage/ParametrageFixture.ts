import { DureeMaxDActivite } from '@/gestion/contexts/parametrage/domain/DureeMaxDActivite';
import { Parametrage } from '@/gestion/contexts/parametrage/domain/Parametrage';
import { ParametragePort } from '@/gestion/contexts/parametrage/domain/ParametragePort';

export class ParametrageFixture extends ParametragePort {
  duree = new DureeMaxDActivite(13);
  readonly durees: DureeMaxDActivite[] = [];
  lectureFailure: Error | undefined;
  ecritureFailure: Error | undefined;
  ecritureDifferee: Promise<void> | undefined;

  override parametrage(): Promise<Parametrage> {
    if (this.lectureFailure !== undefined) return Promise.reject(this.lectureFailure);
    return Promise.resolve(new Parametrage(this.duree));
  }

  override async fixerDureeMaxDActivite(duree: DureeMaxDActivite): Promise<void> {
    this.durees.push(duree);
    if (this.ecritureFailure !== undefined) return Promise.reject(this.ecritureFailure);
    if (this.ecritureDifferee !== undefined) await this.ecritureDifferee;
    this.duree = duree;
  }
}
