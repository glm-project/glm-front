import { ElementChiffreId } from '../element/ElementChiffreId';
import { ElementDisponible } from '../element/ElementDisponible';
import { FichierExporte } from '../export/FichierExporte';
import { FormatDExport } from '../export/FormatDExport';
import { CoutDeRevient } from './CoutDeRevient';

export abstract class CoutDeRevientPort {
  abstract elementsDisponibles(): Promise<readonly ElementDisponible[]>;
  abstract rapport(element: ElementChiffreId): Promise<CoutDeRevient | undefined>;
  abstract exporte(element: ElementChiffreId, format: FormatDExport): Promise<FichierExporte | undefined>;
}
