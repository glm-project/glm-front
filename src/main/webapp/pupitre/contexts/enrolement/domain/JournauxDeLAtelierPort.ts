export abstract class JournauxDeLAtelierPort {
  abstract pendingGestures(): Promise<number>;

  abstract discardAll(): Promise<void>;
}
