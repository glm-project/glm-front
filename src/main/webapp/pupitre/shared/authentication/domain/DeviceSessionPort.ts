export abstract class DeviceSessionPort {
  abstract withSession<T>(action: () => Promise<T>): Promise<T>;
}
