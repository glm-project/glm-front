export type IncidentDemo = 'PANNE_LECTURE' | 'PANNE_APERCU' | 'PANNE_CONFIRMATION' | 'CONCURRENCE' | 'ISSUE_INCONNUE' | 'LECTURE_PARTIELLE';

export abstract class DemonstrationConflitsPort {
  abstract reset(): Promise<void>;
  abstract arm(incident: IncidentDemo): void;
}
