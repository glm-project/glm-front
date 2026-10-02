import { NatureDOperation } from '../rapport/NatureDOperation';
import { ElementCite } from './ElementCite';
import { PosteCite } from './PosteCite';

export class ActiviteCitee {
  constructor(
    readonly element: ElementCite,
    readonly poste: PosteCite | undefined,
    readonly nature: NatureDOperation | undefined,
  ) {}
}
