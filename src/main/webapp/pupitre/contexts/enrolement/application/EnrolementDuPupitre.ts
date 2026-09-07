import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import { ChargementDeLAtelierPort } from '@/pupitre/contexts/enrolement/domain/ChargementDeLAtelierPort';
import { CodeDEnrolement } from '@/pupitre/contexts/enrolement/domain/CodeDEnrolement';
import { Enrolement, IssueDEnrolement, VueDEnrolement } from '@/pupitre/contexts/enrolement/domain/Enrolement';
import {
  DeviceAuthorizationCode,
  DeviceEnrolmentOutcome,
  DeviceEnrolmentPort,
} from '@/pupitre/shared/authentication/domain/DeviceEnrolmentPort';
import { computed, inject, Injectable, signal } from '@angular/core';

const MILLISECONDS_PER_SECOND = 1000;

const ISSUE_APRES_TENTATIVE: Record<Exclude<DeviceEnrolmentOutcome, 'ABANDONED'>, IssueDEnrolement> = {
  ENROLLED: 'ENROLE',
  DENIED: 'REFUSE',
  EXPIRED: 'EXPIRE',
  UNREACHABLE: 'INJOIGNABLE',
};

const codeExpiringAt = (code: DeviceAuthorizationCode, maintenant: number): CodeDEnrolement =>
  new CodeDEnrolement(
    code.userCode,
    code.verificationUri,
    code.verificationUriComplete,
    maintenant + code.expiresIn * MILLISECONDS_PER_SECOND,
  );

@Injectable()
export class EnrolementDuPupitre {
  private readonly appareil = inject(DeviceEnrolmentPort);
  private readonly atelier = inject(ChargementDeLAtelierPort);
  private readonly authentication = inject(AuthenticationPort);
  private readonly etat = signal(Enrolement.demande());
  private readonly maintenant = signal(Date.now());
  private tentative = Symbol('tentative');

  readonly vue = computed<VueDEnrolement>(() => this.etat().vue(this.maintenant(), this.atelier.etat()));

  async enroler(): Promise<void> {
    const tentative = Symbol('tentative');
    this.tentative = tentative;
    this.etat.set(Enrolement.demande());
    this.rafraichir();

    const issue = await this.appareil.enrol(code => {
      this.showCode(tentative, code);
    });

    if (issue === 'ABANDONED' || this.tentative !== tentative) {
      return;
    }

    this.etat.set(this.etat().afterAttempting(ISSUE_APRES_TENTATIVE[issue]));

    if (issue === 'ENROLLED') {
      await this.atelier.charger();
    }
  }

  rafraichir(): void {
    this.maintenant.set(Date.now());
  }

  chargerLAtelier(): Promise<void> {
    return this.atelier.charger();
  }

  async reinitialiser(): Promise<void> {
    this.authentication.logout();
    await this.enroler();
  }

  private showCode(tentative: symbol, code: DeviceAuthorizationCode): void {
    if (this.tentative !== tentative) {
      return;
    }
    const maintenant = Date.now();
    this.maintenant.set(maintenant);
    this.etat.set(this.etat().afterShowingCode(codeExpiringAt(code, maintenant)));
  }
}
