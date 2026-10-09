const MOTIF = /^[0-9a-f]{16}$/;

export class VersionDuLogo {
  constructor(readonly value: string) {
    if (!MOTIF.test(value)) {
      throw new Error(`Version de logo invalide : ${value}`);
    }
  }
}
