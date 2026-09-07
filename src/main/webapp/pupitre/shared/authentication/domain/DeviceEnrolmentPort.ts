export interface DeviceAuthorizationCode {
  readonly userCode: string;
  readonly verificationUri: string;
  readonly verificationUriComplete: string | undefined;
  readonly expiresIn: number;
}

export type ShowDeviceAuthorizationCode = (code: DeviceAuthorizationCode) => void;

export type DeviceEnrolmentOutcome = 'ENROLLED' | 'DENIED' | 'EXPIRED' | 'UNREACHABLE' | 'ABANDONED';

export abstract class DeviceEnrolmentPort {
  abstract enrol(showCode: ShowDeviceAuthorizationCode): Promise<DeviceEnrolmentOutcome>;
}
