import { ElementChiffreId } from '../element/ElementChiffreId';
import { CoutDeRevient } from './CoutDeRevient';

export abstract class CoutDeRevientPort {
  /** Rend `undefined` quand le référentiel ne connaît pas cet élément : c'est une réponse, pas une panne. */
  abstract rapport(element: ElementChiffreId): Promise<CoutDeRevient | undefined>;
}
