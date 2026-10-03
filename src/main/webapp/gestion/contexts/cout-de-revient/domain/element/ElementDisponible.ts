import { ElementChiffre } from './ElementChiffre';
import { ElementChiffreId } from './ElementChiffreId';

export interface ElementDisponible {
  readonly id: ElementChiffreId;
  readonly identite: ElementChiffre;
}
