export interface EnrolmentRequirement {
  readonly outcome: Promise<'REQUIRED' | 'STOPPED'>;
  readonly stop: () => void;
}

export abstract class DeviceAuthorizationPort {
  abstract invalidateAuthorization(token: string): Promise<void>;
  abstract waitForRequiredEnrolment(): EnrolmentRequirement;
}
