import { ElementChiffreId } from '../element/ElementChiffreId';
import { ElementDisponible } from '../element/ElementDisponible';
import { CoutDeRevient } from './CoutDeRevient';

export abstract class CoutDeRevientPort {
  abstract elementsDisponibles(): Promise<readonly ElementDisponible[]>;
  abstract rapport(element: ElementChiffreId): Promise<CoutDeRevient | undefined>;
}
