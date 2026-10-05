export abstract class EffacementDesJournauxPort {
  abstract discardAll(): Promise<void>;
}
