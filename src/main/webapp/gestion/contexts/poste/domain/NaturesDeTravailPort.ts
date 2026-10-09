import { NatureGeree } from './NatureGeree';

export abstract class NaturesDeTravailPort {
  abstract natures(): Promise<readonly NatureGeree[]>;
}
