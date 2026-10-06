import { ElementAnomalieId } from './ElementAnomalieId';

export interface ElementAnomalie {
  readonly id: ElementAnomalieId;
  readonly nom: string;
  readonly reference?: string;
}
