interface ObservateurDeTest {
  readonly rappel: ResizeObserverCallback;
  readonly cibles: Set<Element>;
}

const tailleDe = (inlineSize: number, blockSize: number): ResizeObserverSize => ({ inlineSize, blockSize });

const HAUTEUR_ANNONCEE = 0;

const entreeDe = (cible: Element, width: number): ResizeObserverEntry => ({
  target: cible,
  contentRect: { x: 0, y: 0, width, height: HAUTEUR_ANNONCEE, top: 0, left: 0, right: width, bottom: HAUTEUR_ANNONCEE, toJSON: () => ({}) },
  contentBoxSize: [tailleDe(width, HAUTEUR_ANNONCEE)],
  borderBoxSize: [tailleDe(width, HAUTEUR_ANNONCEE)],
  devicePixelContentBoxSize: [tailleDe(width, HAUTEUR_ANNONCEE)],
});

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

        unobserve(cible: Element): void {
          this.observateur.cibles.delete(cible);
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
      observateur.cibles.forEach(cible => observateur.rappel([entreeDe(cible, width)], {} as ResizeObserver)),
    );
  }

  restore(): void {
    vi.unstubAllGlobals();
  }
}
