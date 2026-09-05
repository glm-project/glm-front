import { BusinessContext } from '@/app/BusinessContext';
import { SharedKernel } from '@/app/SharedKernel';
import { RelativePath } from 'arch-unit-ts/dist/arch-unit/core/domain/RelativePath';
import { TypeScriptProject } from 'arch-unit-ts/dist/arch-unit/core/domain/TypeScriptProject';
import { Architectures } from 'arch-unit-ts/dist/arch-unit/library/Architectures';
import { classes, noClasses } from 'arch-unit-ts/dist/main';

describe('HexagonalArchTest', () => {
  const srcProject = new TypeScriptProject(RelativePath.of('src/main/webapp'), '**/*FilesToExclude*', '**/*OtherFilesToExclude*');

  const packageInfos = srcProject
    .allClasses()
    .get()
    .filter(typeScriptClass => typeScriptClass.getPath().get().endsWith('/package-info.ts'));

  const sharedKernels = packagesWithContext(SharedKernel.name);
  const businessContexts = packagesWithContext(BusinessContext.name);
  const designSystem = sharedKernels.filter(kernel => kernel.endsWith('.design-system')).map(kernel => kernel + '..');

  it('should discover every declared architectural boundary', () => {
    expect(businessContexts).toEqual(
      expect.arrayContaining(['gestion.contexts.operateur', 'pupitre.contexts.atelier'].map(context => `src.main.webapp.${context}`)),
    );
    expect(sharedKernels.length).toBeGreaterThan(0);
  });

  function otherBusinessContextsDomains(context: string): string[] {
    return businessContexts.filter(other => context !== other).map(name => name + '.domain..');
  }

  function packagesWithContext(contextName: string): string[] {
    return packageInfos
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

    it.each(sharedKernels)('should %s not depend on a business context', context => {
      noClasses()
        .that()
        .resideInAPackage(context + '..')
        .should()
        .dependOnClassesThat()
        .resideInAnyPackage(...businessContexts.map(businessContext => businessContext + '..'))
        .because('Shared code is technical and cannot own or import business concepts')
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
  });

  describe('DesignSystem', () => {
    it('should be discovered as a shared kernel, since both rules below govern nothing otherwise', () => {
      expect(designSystem.length).toBeGreaterThan(0);
    });

    it('should not depend on business contexts', () => {
      noClasses()
        .that()
        .resideInAnyPackage(...designSystem)
        .should()
        .dependOnClassesThat()
        .resideInAnyPackage(...businessContexts.map(context => context + '..'))
        .because('The design system is a shared kernel: it renders roles, it knows no business')
        .check(srcProject.allClasses());
    });

    it('should only be depended on by primary adapters', () => {
      classes()
        .that()
        .resideInAnyPackage(...designSystem)
        .should()
        .onlyHaveDependentClassesThat()
        .resideInAnyPackage('..infrastructure.primary..', 'src.main.webapp.gestion..', 'src.main.webapp.pupitre..')
        .because('Only primary adapters render: application orchestrates and secondary speaks HTTP, neither has a use for a button')
        .check(srcProject.allClasses());
    });

    it('should not be depended on by domain, application or secondary code', () => {
      noClasses()
        .that()
        .resideInAnyPackage('..domain..', '..application..', '..infrastructure.secondary..')
        .should()
        .dependOnClassesThat()
        .resideInAnyPackage(...designSystem)
        .because('Business rules and orchestration do not render components')
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
        .resideInAnyPackage('..domain..', ...sharedKernels)
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
        .dependOnClassesThat()
        .resideInAPackage(context + '.infrastructure.primary..')
        .because("Secondary should not loop to its own context's primary")
        .check(srcProject.allClasses());
    });
  });
});
