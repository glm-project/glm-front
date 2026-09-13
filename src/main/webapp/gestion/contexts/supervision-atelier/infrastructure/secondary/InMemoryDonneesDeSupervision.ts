import { DonneesDeSupervisionPort, LectureDeSupervision } from '../../domain/DonneesDeSupervisionPort';

export class InMemoryDonneesDeSupervision extends DonneesDeSupervisionPort {
  private readonly lecture: LectureDeSupervision | Error;

  constructor(lecture: LectureDeSupervision | Error) {
    super();
    if (lecture instanceof Error) {
      this.lecture = lecture;
      return;
    }
    this.lecture =
      lecture.status === 'complete'
        ? {
            status: 'complete',
            donnees: {
              operateurs: [...lecture.donnees.operateurs],
              journees: [...lecture.donnees.journees],
              activites: [...lecture.donnees.activites],
            },
          }
        : lecture;
  }

  read(): Promise<LectureDeSupervision> {
    return this.lecture instanceof Error ? Promise.reject(this.lecture) : Promise.resolve(this.lecture);
  }
}
