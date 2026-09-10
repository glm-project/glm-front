import { DeviceSessionPort } from '@/pupitre/shared/authentication/domain/DeviceSessionPort';

export class DeviceSessionFixture extends DeviceSessionPort {
  withSession<T>(action: () => Promise<T>): Promise<T> {
    return action();
  }
}
