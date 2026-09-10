import { DeviceAuthorizationCode } from '@/pupitre/shared/authentication/domain/DeviceEnrolmentPort';
import { HttpBackend, HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, firstValueFrom, map, of, timeout } from 'rxjs';
import { DeviceGrantConfiguration } from './DeviceGrantConfiguration';

const NETWORK_TIMEOUT_MS = 30_000;
const OFFLINE_SCOPE = 'openid offline_access';
const DEVICE_CODE_GRANT = 'urn:ietf:params:oauth:grant-type:device_code';
const REFRESH_TOKEN_GRANT = 'refresh_token';
const NO_REASON_GIVEN = 'no_reason_given';

export interface DeviceAuthorization {
  device_code: string;
  interval?: number;
  user_code: string;
  verification_uri: string;
  verification_uri_complete?: string;
  expires_in: number;
}

export interface Tokens {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
}

interface GrantedTokens {
  tokens: Tokens;
}

export interface RefusedGrant {
  refusedBecause: string;
}

export type GrantAnswer = GrantedTokens | RefusedGrant;

interface OauthRefusal {
  error?: string;
}

export const isGranted = (answer: GrantAnswer): answer is GrantedTokens => 'tokens' in answer;

export const authorizationCodeFrom = (device: DeviceAuthorization): DeviceAuthorizationCode => ({
  userCode: device.user_code,
  verificationUri: device.verification_uri,
  verificationUriComplete: device.verification_uri_complete,
  expiresIn: device.expires_in,
});

const reasonIn = (refusal: unknown): string =>
  refusal instanceof HttpErrorResponse ? ((refusal.error as OauthRefusal | null)?.error ?? NO_REASON_GIVEN) : NO_REASON_GIVEN;

@Injectable()
export class DeviceGrantClient {
  private readonly transport = new HttpClient(inject(HttpBackend));
  private readonly server = inject(DeviceGrantConfiguration);

  requestDeviceAuthorization(): Promise<DeviceAuthorization | undefined> {
    return firstValueFrom(
      this.transport
        .post<DeviceAuthorization>(this.server.deviceAuthorizationEndpoint(), this.namingThisClient().set('scope', OFFLINE_SCOPE))
        .pipe(
          timeout(NETWORK_TIMEOUT_MS),
          catchError(() => of(undefined)),
        ),
    );
  }

  claimTokens(deviceCode: string): Promise<GrantAnswer> {
    return this.askForTokens(this.namingThisClient().set('grant_type', DEVICE_CODE_GRANT).set('device_code', deviceCode));
  }

  renewTokens(refreshToken: string): Promise<GrantAnswer> {
    return this.askForTokens(this.namingThisClient().set('grant_type', REFRESH_TOKEN_GRANT).set('refresh_token', refreshToken));
  }

  endSession(refreshToken: string): Promise<unknown> {
    const ending = this.namingThisClient().set('refresh_token', refreshToken);

    return firstValueFrom(
      this.transport.post(this.server.logoutEndpoint(), ending).pipe(
        timeout(NETWORK_TIMEOUT_MS),
        catchError(() => of(undefined)),
      ),
    );
  }

  private askForTokens(grant: HttpParams): Promise<GrantAnswer> {
    return firstValueFrom(
      this.transport.post<Tokens>(this.server.tokenEndpoint(), grant).pipe(
        timeout(NETWORK_TIMEOUT_MS),
        map((tokens): GrantAnswer => ({ tokens })),
        catchError((refusal: unknown) => of<GrantAnswer>({ refusedBecause: reasonIn(refusal) })),
      ),
    );
  }

  private namingThisClient(): HttpParams {
    return new HttpParams().set('client_id', this.server.clientId);
  }
}