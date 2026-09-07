const MILLISECONDS_PER_SECOND = 1000;

export interface VueDuCodeDEnrolement {
  readonly userCode: string;
  readonly verificationUri: string;
  readonly lienDeValidation: string;
  readonly secondesRestantes: number;
}

export class CodeDEnrolement {
  constructor(
    private readonly userCode: string,
    private readonly verificationUri: string,
    private readonly verificationUriComplete: string | undefined,
    private readonly limite: number,
  ) {}

  lienDeValidation(): string {
    return this.verificationUriComplete ?? `${this.verificationUri}?user_code=${this.userCode}`;
  }

  aExpire(maintenant: number): boolean {
    return maintenant >= this.limite;
  }

  snapshot(maintenant: number): VueDuCodeDEnrolement {
    return {
      userCode: this.userCode,
      verificationUri: this.verificationUri,
      lienDeValidation: this.lienDeValidation(),
      secondesRestantes: Math.max(0, Math.ceil((this.limite - maintenant) / MILLISECONDS_PER_SECOND)),
    };
  }
}
