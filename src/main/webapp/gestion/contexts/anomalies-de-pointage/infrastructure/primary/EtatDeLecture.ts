import { computed, Resource } from '@angular/core';

export const etatDeLecture = (lecture: Resource<unknown>) => ({
  premierChargement: computed(() => lecture.status() === 'loading'),
  enPanne: computed(() => lecture.status() === 'error' || (lecture.status() === 'reloading' && !lecture.hasValue())),
  relecture: computed(() => lecture.status() === 'reloading'),
});
