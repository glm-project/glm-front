import { BusinessContext } from '@/app/BusinessContext';
import { SharedKernel } from '@/app/SharedKernel';
import { RelativePath } from 'arch-unit-ts/dist/arch-unit/core/domain/RelativePath';
import { TypeScriptProject } from 'arch-unit-ts/dist/arch-unit/core/domain/TypeScriptProject';
import { Architectures } from 'arch-unit-ts/dist/arch-unit/library/Architectures';
import { classes, noClasses } from 'arch-unit-ts/dist/main';

describe('HexagonalArchTest', () => {
  const srcProject = new TypeScriptProject(RelativePath.of('src/main/webapp/app'), '**/*FilesToExclude*', '**/*OtherFilesToExclude*');

  const sharedKernels = packagesWithContext(SharedKernel.name);
  const businessContexts = packagesWithContext(BusinessContext.name);

  // Le design system est un shared kernel *graphique* : y dependre revient a dependre d'Angular et de
  // directives d'affichage. Le domaine metier doit rester agnostique de tout framework, il ne voit donc
  // que les shared kernels non graphiques.
  const nonGraphicalSharedKernels = sharedKernels.filter(sharedKernel => !sharedKernel.endsWith('.design-system'));

  function otherBusinessContextsDomains(context: string): string[] {
    return businessContexts.filter(other => context !== other).map(name => name + '.domain..');
  }

  function packagesWithContext(contextName: string): string[] {
    return srcProject
      .filterClasses('**/package-info.ts')
      .filter(typeScriptClass => typeScriptClass.hasImport(contextName))
      .map(typeScriptClass => typeScriptClass.packagePath.getDotsPath());
  }

  describe('BoundedContexts', () => {
    it.each([...sharedKernels, ...businessContexts])('should %s not depend on other bounded context domains', context => {
      noClasses()
        .that()
        .resideInAnyPackage(context + '..')
        .should()
        .dependOnClassesThat()
        .resideInAnyPackage(...otherBusinessContextsDomains(context))
        .because('Contexts can only depend on classes in the same context or shared kernels')
        .check(srcProject.allClasses());
    });

    it('primary TypeScript Adapters should only be called from secondaries', () => {
      classes()
        .that()
        .resideInAPackage('..primary..')
        .and()
        .haveSimpleNameStartingWith('TypeScript')
        .should()
        .onlyHaveDependentClassesThat()
        .resideInAPackage('..secondary..')
        .because(
          "To interact between two contexts, secondary from context 'A' should call a primary TypeScript adapter (naming convention starting with 'TypeScript') from context 'B'",
        )
        .check(srcProject.allClasses());
    });

    // Liste blanche et non liste noire : tout ce qui n'est pas le design system lui-meme ou une librairie
    // tierce est interdit, y compris un dossier applicatif qui n'est pas encore un contexte borne
    // (`auth`, `login`) ou un fichier de la racine `app` (`app.ts`). La branche `orShould` couvre l'unique
    // fichier du contexte qui sort legitimement de son arbre : `design-system/package-info.ts`, dont le
    // seul import est le marqueur `SharedKernel` situe a la racine du projet.
    it('design system should only depend on itself and on third party libraries', () => {
      classes()
        .that()
        .resideInAnyPackage('..design-system..')
        .should()
        .onlyDependOnClassesThat()
        .resideInAnyPackage('..design-system..', 'node_modules..')
        .orShould()
        .onlyDependOnClassesThat()
        .haveSimpleNameStartingWith(SharedKernel.name)
        .because('The design system is a graphical shared kernel: it must stay extractable as a standalone library')
        .check(srcProject.allClasses());
    });
  });

  describe('Domain', () => {
    it('should not depend on outside', () => {
      classes()
        .that()
        .resideInAPackage('..domain..')
        .should()
        .onlyDependOnClassesThat()
        .resideInAnyPackage('..domain..', ...nonGraphicalSharedKernels)
        .because('Domain model should only depend on domains and a very limited set of external dependencies')
        .check(srcProject.allClasses());
    });

    it.each([...sharedKernels, ...businessContexts])('should be an hexagonal architecture in context %s', context => {
      Architectures.layeredArchitecture()
        .consideringOnlyDependenciesInAnyPackage(context + '..')
        .withOptionalLayers(true)
        .layer('domain models', context + '.domain..')
        .layer('domain services', context + '.domain..')
        .layer('application services', context + '.application..')
        .layer('primary adapters', context + '.infrastructure.primary..')
        .layer('secondary adapters', context + '.infrastructure.secondary..')
        .whereLayer('application services')
        .mayOnlyBeAccessedByLayers('primary adapters')
        .whereLayer('primary adapters')
        .mayNotBeAccessedByAnyLayer()
        .whereLayer('secondary adapters')
        .mayNotBeAccessedByAnyLayer()
        .because('Each bounded context should implement an hexagonal architecture')
        .check(srcProject.allClasses());
    });
  });

  describe('Application', () => {
    it('should not depend on infrastructure', () => {
      noClasses()
        .that()
        .resideInAPackage('..application..')
        .should()
        .dependOnClassesThat()
        .resideInAnyPackage('..infrastructure..')
        .because('Application should only depend on domain, not on infrastructure')
        .check(srcProject.allClasses());
    });
  });

  describe('Primary', () => {
    it('should not depend on secondary', () => {
      noClasses()
        .that()
        .resideInAPackage('..primary..')
        .should()
        .dependOnClassesThat()
        .resideInAnyPackage('..secondary..')
        .because('Primary should not interact with secondary')
        .check(srcProject.allClasses());
    });
  });

  describe('Secondary', () => {
    it('should not depend on application', () => {
      noClasses()
        .that()
        .resideInAPackage('..infrastructure.secondary..')
        .should()
        .dependOnClassesThat()
        .resideInAPackage('..application..')
        .because('Secondary should not depend on application')
        .check(srcProject.allClasses());
    });

    it.each([...sharedKernels, ...businessContexts])('should %s not depend on same context primary', context => {
      noClasses()
        .that()
        .resideInAPackage(context + '.infrastructure.secondary..')
        .should()
        .onlyDependOnClassesThat()
        .resideInAPackage(context + '.infrastructure.primary..')
        .because("Secondary should not loop to its own context's primary")
        .check(srcProject.allClasses());
    });
  });
});
