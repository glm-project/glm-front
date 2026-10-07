interface ObservateurDeTest {
  readonly rappel: ResizeObserverCallback;
  readonly cibles: Set<Element>;
}

export class ResizeObserverFixture {
  private readonly observateurs: ObservateurDeTest[] = [];

  constructor() {
    const observateurs = this.observateurs;
    vi.stubGlobal(
      'ResizeObserver',
      class {
        private readonly observateur: ObservateurDeTest;

        constructor(rappel: ResizeObserverCallback) {
          this.observateur = { rappel, cibles: new Set() };
          observateurs.push(this.observateur);
        }

        observe(cible: Element): void {
          this.observateur.cibles.add(cible);
        }

        disconnect(): void {
          this.observateur.cibles.clear();
        }
      },
    );
  }

  get observantUnElement(): boolean {
    return this.observateurs.some(observateur => observateur.cibles.size > 0);
  }

  announce(width: number): void {
    this.observateurs.forEach(observateur =>
      observateur.cibles.forEach(cible =>
        observateur.rappel([{ target: cible, contentRect: { width } } as ResizeObserverEntry], {} as ResizeObserver),
      ),
    );
  }

  restore(): void {
    vi.unstubAllGlobals();
  }
}
