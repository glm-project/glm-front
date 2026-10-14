import { PosteDeLaJourneeId } from './PosteDeLaJourneeId';

export class PosteDeLaJournee {
  constructor(
    readonly id: PosteDeLaJourneeId,
    readonly libelle: string,
    readonly nature: string,
  ) {}
}
