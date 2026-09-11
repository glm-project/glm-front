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
  private chargement = Symbol('chargement');

  readonly vue = computed<VueDEnrolement>(() => this.etat().vue(this.maintenant(), this.atelier.etat()));

  async enroler(): Promise<void> {
    const tentative = Symbol('tentative');
    this.tentative = tentative;
    this.chargement = Symbol('chargement abandonne');
    this.etat.set(Enrolement.demande());
    this.rafraichir();

    const issue = await this.appareil.enrol(code => {
      this.showCode(tentative, code);
    });

    if (!this.isCurrentAttemptOutcome(issue, tentative)) {
      return;
    }

    this.etat.set(this.etat().afterAttempting(ISSUE_APRES_TENTATIVE[issue]));

    if (issue === 'ENROLLED') {
      await this.loadAtelier();
    }
  }

  rafraichir(): void {
    this.maintenant.set(Date.now());
  }

  async chargerLAtelier(): Promise<void> {
    await this.loadAtelier();
  }

  async reinitialiser(): Promise<void> {
    this.authentication.logout();
    await this.enroler();
  }

  private isCurrentAttemptOutcome(issue: DeviceEnrolmentOutcome, tentative: symbol): issue is Exclude<DeviceEnrolmentOutcome, 'ABANDONED'> {
    return !(issue === 'ABANDONED' || this.tentative !== tentative);
  }

  private showCode(tentative: symbol, code: DeviceAuthorizationCode): void {
    if (this.tentative !== tentative) {
      return;
    }
    const maintenant = Date.now();
    this.maintenant.set(maintenant);
    this.etat.set(this.etat().afterShowingCode(codeExpiringAt(code, maintenant)));
  }

  private async loadAtelier(): Promise<void> {
    const chargement = Symbol('chargement');
    this.chargement = chargement;
    this.etat.update(current => current.afterBeginningAtelierLoad());
    const issue = await this.atelier.charger();
    if (this.isCurrentLoad(chargement)) {
      this.etat.update(current => current.afterLoadingAtelier(issue));
    }
  }

  private isCurrentLoad(chargement: symbol): boolean {
    return this.chargement === chargement;
  }
}
