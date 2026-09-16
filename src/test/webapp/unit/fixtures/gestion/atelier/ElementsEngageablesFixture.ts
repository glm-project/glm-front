import { Page } from '@/app/shared/pagination/domain/Page';
import { ElementEngageable } from '@/gestion/contexts/atelier/domain/ElementEngageable';
import { ElementEngageId } from '@/gestion/contexts/atelier/domain/ElementEngageId';
import { ElementsEngageablesPort } from '@/gestion/contexts/atelier/domain/ElementsEngageablesPort';
import { RequeteEngageables } from '@/gestion/contexts/atelier/domain/RequeteEngageables';

import { SignalFixture } from '@test/unit/fixtures/SignalFixture';

export class ElementsEngageablesFixture extends ElementsEngageablesPort {
  liste: readonly ElementEngageable[] = [];
  lectureFailure: Error | undefined;
  lectureDifferee: Promise<Page<ElementEngageable>> | undefined;
  private lectureSignal: SignalFixture | undefined;

  signalLecture(): Promise<void> {
    this.lectureSignal = new SignalFixture();
    return this.lectureSignal.promise;
  }

  override elements(requete: RequeteEngageables): Promise<Page<ElementEngageable>> {
    this.lectureSignal?.release();
    this.lectureSignal = undefined;
    if (this.lectureFailure !== undefined) return Promise.reject(this.lectureFailure);
    return (
      this.lectureDifferee
      ?? Promise.resolve(new Page(this.liste.slice(requete.page * requete.taille, (requete.page + 1) * requete.taille), this.liste.length))
    );
  }

  override element(id: ElementEngageId): Promise<ElementEngageable | undefined> {
    if (this.lectureFailure !== undefined) return Promise.reject(this.lectureFailure);
    return Promise.resolve(this.liste.find(element => element.id.value === id.value));
  }
}
