import { RolesPort } from '@/gestion/shared/authentication/domain/RolesPort';
import { DestroyRef, Directive, inject, OnInit, TemplateRef, ViewContainerRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { from } from 'rxjs';
import { isReservedToGestionnaire } from './gestionnaire';

@Directive({ selector: '[glmReservedToGestionnaire]' })
export class ReservedToGestionnaire implements OnInit {
  private readonly roles = inject(RolesPort);
  private readonly template = inject(TemplateRef);
  private readonly container = inject(ViewContainerRef);
  private readonly destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    from(this.roles.realmRoles())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(roles => {
        if (isReservedToGestionnaire(roles)) {
          this.container.createEmbeddedView(this.template);
        }
      });
  }
}
