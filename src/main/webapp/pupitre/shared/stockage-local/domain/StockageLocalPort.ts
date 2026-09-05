export abstract class StockageLocalPort {
  abstract read<T>(cle: string): Promise<T | undefined>;

  abstract update<T>(cle: string, initial: T, change: (value: T) => T): Promise<T>;

  abstract lock<T>(cle: string, action: () => Promise<T>): Promise<T>;
}
