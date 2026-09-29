import { PosteReleveId } from './PosteReleveId';

export class PosteDeLElement {
  constructor(
    readonly id: PosteReleveId,
    readonly libelle: string,
    readonly nature: string | undefined,
  ) {}
}
