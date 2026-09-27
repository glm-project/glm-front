import { ElementChiffreId } from '../element/ElementChiffreId';
import { CoutDeRevient } from './CoutDeRevient';

export abstract class CoutDeRevientPort {
  abstract rapport(element: ElementChiffreId): Promise<CoutDeRevient | undefined>;
}
