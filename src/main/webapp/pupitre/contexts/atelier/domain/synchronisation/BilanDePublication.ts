export class BilanDePublication {
  static readonly TERMINE = new BilanDePublication('TERMINE');
  static readonly INTERROMPU = new BilanDePublication('INTERROMPU');

  private constructor(private readonly issue: 'TERMINE' | 'INTERROMPU') {}

  allowsReferentialRefresh(): boolean {
    return this.issue === 'TERMINE';
  }
}
