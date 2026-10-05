import { computed, Resource } from '@angular/core';

export const etatDeLecture = (lecture: Resource<unknown>) => {
  const enPanne = computed(() => lecture.status() === 'error' || (lecture.status() === 'reloading' && !lecture.hasValue()));
  return {
    premierChargement: computed(() => lecture.status() === 'loading'),
    enPanne,
    relecture: computed(() => lecture.status() === 'reloading'),
    indisponible: computed(() => enPanne() || lecture.status() === 'idle'),
  };
};
