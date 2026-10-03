import { ChoixGuide, DossierConflit } from '../../domain/dossier/DossierConflit';

export interface SuiteScenario {
  readonly enConflit: boolean;
  readonly activites: DossierConflit['activites'];
  readonly consequences: readonly string[];
  readonly choix: readonly ChoixGuide[];
  readonly continuations: DossierConflit['continuations'];
}

export interface ScenarioConflits {
  readonly dossier: DossierConflit;
  readonly pointages: readonly string[];
  readonly resultats: ReadonlyMap<string, SuiteScenario>;
}
