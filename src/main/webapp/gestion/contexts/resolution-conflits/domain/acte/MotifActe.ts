export class MotifActe {
  constructor(readonly value: string) {}

  errors(): readonly ('MOTIF_REQUIS' | 'MOTIF_INVALIDE')[] {
    const motif = this.value;
    if (motif === '') {
      return ['MOTIF_REQUIS'];
    }
    return this.isValid() ? [] : ['MOTIF_INVALIDE'];
  }

  private isValid(): boolean {
    const motif = this.value;
    return motif.trim().length > 0 && motif.length <= 255;
  }
}
