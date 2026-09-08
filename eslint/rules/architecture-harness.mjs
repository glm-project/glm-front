import { existsSync, readdirSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import ts from 'typescript';

const BOUNDARY_ROOTS = [
  { path: 'app/shared', kind: 'shared' },
  { path: 'gestion/shared', kind: 'shared', front: 'gestion' },
  { path: 'pupitre/shared', kind: 'shared', front: 'pupitre' },
  { path: 'gestion/contexts', kind: 'business', front: 'gestion' },
  { path: 'pupitre/contexts', kind: 'business', front: 'pupitre' },
];
const BROWSER_GLOBALS = new Set(['document', 'globalThis', 'history', 'location', 'navigator', 'screen', 'self', 'window']);
const NETWORK_CONSTRUCTORS = new Set(['EventSource', 'WebSocket', 'XMLHttpRequest']);
const STORAGE_GLOBALS = new Set(['caches', 'indexedDB', 'localStorage', 'sessionStorage']);

const isProductionDomain = source => source.layer === 'domain' && !source.relativePath.endsWith('.spec.ts');

const isTypeScriptFile = entry => entry.isFile() && entry.name.endsWith('.ts');

export const inspectArchitecture = ({ sourceRoot = 'src/main/webapp', tsconfigPath = 'tsconfig.json' } = {}) => {
  const absoluteSourceRoot = resolve(sourceRoot);
  const absoluteTsconfigPath = resolve(tsconfigPath);
  const compilerOptions = readCompilerOptions(absoluteTsconfigPath);
  const files = findTypeScriptFiles(absoluteSourceRoot);
  const program = ts.createProgram(files, compilerOptions);
  const checker = program.getTypeChecker();
  const discovery = discoverBoundaries(absoluteSourceRoot, program, checker);
  const boundaries = discovery.boundaries;
  const violations = [...discovery.violations];

  for (const sourceFile of program.getSourceFiles().filter(file => isWithin(file.fileName, absoluteSourceRoot))) {
    const source = describeFile(sourceFile.fileName, absoluteSourceRoot, boundaries);
    const dependencies = dependenciesOf(sourceFile, compilerOptions, checker);
    for (const dependency of dependencies) {
      violations.push(...dependencyViolations(source, describeFile(dependency.fileName, absoluteSourceRoot, boundaries), dependency));
    }
    if (isProductionDomain(source)) {
      violations.push(...ambientDomainViolations(sourceFile, source, checker, absoluteSourceRoot));
    }
  }

  return uniqueViolations(violations).sort((left, right) => violationKey(left).localeCompare(violationKey(right)));
};

const readCompilerOptions = tsconfigPath => {
  const config = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
  if (config.error) throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, '\n'));
  return ts.parseJsonConfigFileContent(config.config, ts.sys, dirname(tsconfigPath), undefined, tsconfigPath).options;
};

const findTypeScriptFiles = directory =>
  readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return findTypeScriptFiles(path);
    return entry.isFile() && entry.name.endsWith('.ts') ? [path] : [];
  });

const discoverBoundaries = (sourceRoot, program, checker) => {
  const boundaries = [];
  const violations = [];
  for (const root of BOUNDARY_ROOTS) {
    const absoluteRoot = join(sourceRoot, root.path);
    if (!existsSync(absoluteRoot)) continue;
    for (const entry of readdirSync(absoluteRoot, { withFileTypes: true })) {
      if (isTypeScriptFile(entry)) {
        violations.push(
          violation(
            'unowned-boundary-file',
            `${root.path}/${entry.name}`,
            1,
            `${root.path} is a namespace: TypeScript files belong inside a declared boundary`,
          ),
        );
      }
      if (!entry.isDirectory()) continue;
      const relativeRoot = `${root.path}/${entry.name}`;
      const packageInfoPath = join(sourceRoot, relativeRoot, 'package-info.ts');
      const declared = declaresBoundary(packageInfoPath, root.kind, sourceRoot, program, checker);
      if (!declared) {
        violations.push(
          violation(
            'undeclared-boundary',
            relativeRoot,
            1,
            `${relativeRoot} must declare its ${root.kind === 'business' ? 'BusinessContext' : 'SharedKernel'} in package-info.ts`,
          ),
        );
      }
      boundaries.push({ ...root, name: entry.name, relativeRoot, absoluteRoot: join(sourceRoot, relativeRoot), declared });
    }
  }
  return { boundaries, violations };
};

const declaresBoundary = (packageInfoPath, kind, sourceRoot, program, checker) => {
  const sourceFile = program.getSourceFile(packageInfoPath);
  if (!sourceFile) return false;
  const expectedDeclaration = join(sourceRoot, 'app', kind === 'business' ? 'BusinessContext.ts' : 'SharedKernel.ts');
  return sourceFile.statements.some(statement => {
    if (!ts.isClassDeclaration(statement)) return false;
    return (statement.heritageClauses ?? []).some(clause =>
      clause.types.some(type =>
        symbolDeclarationFiles(type.expression, checker).some(file => resolve(file) === resolve(expectedDeclaration)),
      ),
    );
  });
};

const isLiteralReexport = node => ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier);

const isLiteralImport = node => ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier);
const hasNamedImports = bindings => bindings && ts.isNamedImports(bindings);
const hasNamespaceImport = bindings => bindings && ts.isNamespaceImport(bindings);
const hasNamedExports = node => node.exportClause && ts.isNamedExports(node.exportClause);

const isLiteralDynamicImport = node =>
  ts.isCallExpression(node)
  && node.expression.kind === ts.SyntaxKind.ImportKeyword
  && node.arguments.length === 1
  && ts.isStringLiteral(node.arguments[0]);

const dependenciesOf = (sourceFile, compilerOptions, checker) => {
  const dependencies = [];
  const addResolvedModule = moduleSpecifier => {
    const resolvedModule = ts.resolveModuleName(moduleSpecifier.text, sourceFile.fileName, compilerOptions, ts.sys).resolvedModule;
    if (resolvedModule) dependencies.push({ fileName: resolvedModule.resolvedFileName, line: lineOf(moduleSpecifier, sourceFile) });
  };
  const addSymbol = node => {
    for (const fileName of symbolDeclarationFiles(node, checker)) dependencies.push({ fileName, line: lineOf(node, sourceFile) });
  };
  const addModuleExports = moduleSpecifier => {
    const symbol = checker.getSymbolAtLocation(moduleSpecifier);
    if (!symbol) return;
    for (const exportedSymbol of checker.getExportsOfModule(symbol)) {
      const target = aliasedSymbol(exportedSymbol, checker);
      for (const declaration of target.declarations ?? []) {
        dependencies.push({ fileName: declaration.getSourceFile().fileName, line: lineOf(moduleSpecifier, sourceFile) });
      }
    }
  };
  const addNamedModuleExport = (moduleSpecifier, importedName, lineNode) => {
    const symbol = checker.getSymbolAtLocation(moduleSpecifier);
    const exportedSymbol = symbol && checker.getExportsOfModule(symbol).find(candidate => candidate.name === importedName);
    if (!exportedSymbol) return;
    for (const declaration of aliasedSymbol(exportedSymbol, checker).declarations ?? []) {
      dependencies.push({ fileName: declaration.getSourceFile().fileName, line: lineOf(lineNode, sourceFile) });
    }
  };
  const visit = node => {
    if (isLiteralImport(node)) {
      addResolvedModule(node.moduleSpecifier);
      const bindings = node.importClause?.namedBindings;
      if (node.importClause?.name) {
        addSymbol(node.importClause.name);
        addNamedModuleExport(node.moduleSpecifier, 'default', node.importClause.name);
      }
      if (hasNamedImports(bindings)) {
        bindings.elements.forEach(specifier => {
          addSymbol(specifier);
          addNamedModuleExport(node.moduleSpecifier, (specifier.propertyName ?? specifier.name).text, specifier);
        });
      }
      if (hasNamespaceImport(bindings)) addModuleExports(node.moduleSpecifier);
    }
    if (isLiteralReexport(node)) {
      addResolvedModule(node.moduleSpecifier);
      if (hasNamedExports(node)) {
        node.exportClause.elements.forEach(specifier => {
          addSymbol(specifier);
          addNamedModuleExport(node.moduleSpecifier, (specifier.propertyName ?? specifier.name).text, specifier);
        });
      } else addModuleExports(node.moduleSpecifier);
    }
    if (isLiteralDynamicImport(node)) {
      addResolvedModule(node.arguments[0]);
      addModuleExports(node.arguments[0]);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return dependencies;
};

const symbolDeclarationFiles = (node, checker) => {
  const symbol = checker.getSymbolAtLocation(node);
  if (!symbol) return [];
  const target = aliasedSymbol(symbol, checker);
  return [...new Set((target.declarations ?? []).map(declaration => declaration.getSourceFile().fileName))];
};

const aliasedSymbol = (symbol, checker) => {
  let target = symbol;
  const visited = new Set();
  while (target.flags & ts.SymbolFlags.Alias && !visited.has(target)) {
    visited.add(target);
    target = checker.getAliasedSymbol(target);
  }
  return target;
};

const isInfrastructureLayer = (parts, infrastructureIndex, layer) => infrastructureIndex >= 0 && parts[infrastructureIndex + 1] === layer;

const describeFile = (fileName, sourceRoot, boundaries) => {
  const absolutePath = resolve(fileName);
  const relativePath = slash(relative(sourceRoot, absolutePath));
  const boundary = boundaries.find(candidate => isWithin(absolutePath, candidate.absoluteRoot));
  const parts = relativePath.split('/');
  const infrastructureIndex = parts.indexOf('infrastructure');
  let layer;
  if (parts.includes('domain')) layer = 'domain';
  else if (parts.includes('application')) layer = 'application';
  else if (isInfrastructureLayer(parts, infrastructureIndex, 'primary')) layer = 'primary';
  else if (isInfrastructureLayer(parts, infrastructureIndex, 'secondary')) layer = 'secondary';
  const firstPart = parts[0];
  const front = firstPart === 'gestion' || firstPart === 'pupitre' ? firstPart : undefined;
  return { absolutePath, relativePath, boundary, layer, front, insideSource: isWithin(absolutePath, sourceRoot) };
};

const crossesFronts = (source, target) => source.front && target.front && source.front !== target.front;

const couplesCommonCodeToFront = (source, target) => !source.front && source.insideSource && target.front;

const accessesAnotherBusinessDomain = (source, target) =>
  source.boundary
  && target.boundary?.kind === 'business'
  && target.layer === 'domain'
  && source.boundary.relativeRoot !== target.boundary.relativeRoot;

const couplesApplicationToInfrastructure = (source, target) =>
  source.layer === 'application' && target.layer && ['primary', 'secondary'].includes(target.layer);

const couplesSecondaryToOwnPrimary = (source, target) =>
  source.layer === 'secondary' && target.layer === 'primary' && source.boundary?.relativeRoot === target.boundary?.relativeRoot;

const consumesDesignSystemOutsidePrimary = (source, target) =>
  target.boundary?.name === 'design-system' && source.layer !== 'primary' && source.boundary;

const callsTypeScriptPrimaryOutsideSecondary = (source, target) =>
  target.layer === 'primary' && target.relativePath.split('/').at(-1)?.startsWith('TypeScript') && source.layer !== 'secondary';

const couplesSharedToBusiness = (source, target) => source.boundary?.kind === 'shared' && target.boundary?.kind === 'business';
const accessesForbiddenDomainTarget = (source, target) => source.layer === 'domain' && !isAllowedDomainTarget(source, target);
const couplesPrimaryToSecondary = (source, target) => source.layer === 'primary' && target.layer === 'secondary';
const couplesSecondaryToApplication = (source, target) => source.layer === 'secondary' && target.layer === 'application';

const dependencyViolations = (source, target, dependency) => {
  if (source.absolutePath === target.absolutePath) return [];
  const violations = [];
  const report = (code, message) => violations.push(violation(code, source.relativePath, dependency.line, message, target.relativePath));

  if (crossesFronts(source, target)) report('cross-front', `${source.front} must not depend on ${target.front}`);
  if (couplesCommonCodeToFront(source, target)) report('common-to-front', 'Common app code must not depend on a front');
  if (couplesSharedToBusiness(source, target)) {
    report('shared-to-business', 'A shared kernel must not depend on a business context');
  }
  if (accessesAnotherBusinessDomain(source, target)) {
    report('cross-context-domain', 'A boundary must not depend on another business context domain');
  }
  if (accessesForbiddenDomainTarget(source, target)) {
    report('domain-outside', 'Domain code may depend only on its own domain and declared shared kernels');
  }
  if (couplesApplicationToInfrastructure(source, target)) {
    report('application-to-infrastructure', 'Application code must not depend on infrastructure');
  }
  if (couplesPrimaryToSecondary(source, target)) {
    report('primary-to-secondary', 'A primary adapter must not depend on a secondary adapter');
  }
  if (couplesSecondaryToApplication(source, target)) {
    report('secondary-to-application', 'A secondary adapter must not depend on application code');
  }
  if (couplesSecondaryToOwnPrimary(source, target)) {
    report('secondary-to-own-primary', 'A secondary adapter must not depend on its own primary adapter');
  }
  if (consumesDesignSystemOutsidePrimary(source, target)) {
    report('design-system-consumer', 'Only primary adapters may depend on a design system');
  }
  if (callsTypeScriptPrimaryOutsideSecondary(source, target)) {
    report('typescript-primary-caller', 'A primary TypeScript adapter may only be called from a secondary adapter');
  }
  return violations;
};

const isAllowedDomainTarget = (source, target) => {
  if (target.boundary?.kind === 'shared') return target.boundary.name !== 'design-system';
  return source.boundary?.relativeRoot === target.boundary?.relativeRoot && target.layer === 'domain';
};

const constructsCurrentDate = (node, invokedOrigin) =>
  ts.isNewExpression(node) && invokedOrigin === 'date' && (node.arguments?.length ?? 0) === 0;

const isUnresolvedOrVisited = (symbol, visited) => !symbol || visited.has(symbol);
const hasVariableInitializer = declaration => ts.isVariableDeclaration(declaration) && declaration.initializer;
const isMemberAccess = expression => ts.isPropertyAccessExpression(expression) || ts.isElementAccessExpression(expression);
const callsAmbientOrigin = (node, invokedOrigin, expectedOrigin) => ts.isCallExpression(node) && invokedOrigin === expectedOrigin;
const constructsAmbientOrigin = (node, invokedOrigin, expectedOrigin) => ts.isNewExpression(node) && invokedOrigin === expectedOrigin;

const ambientDomainViolations = (sourceFile, source, checker, sourceRoot) => {
  const violations = [];
  const report = (node, code, message) => violations.push(violation(code, source.relativePath, lineOf(node, sourceFile), message));
  const isAmbient = identifier => {
    const symbol = checker.getSymbolAtLocation(identifier);
    if (!symbol) return true;
    return (symbol.declarations ?? []).every(declaration => !isWithin(declaration.getSourceFile().fileName, sourceRoot));
  };
  const ambientOrigin = (node, visited = new Set()) => {
    const expression = unwrapExpression(node);
    if (ts.isIdentifier(expression)) {
      if (isAmbient(expression)) {
        if (expression.text === 'fetch') return 'network-function';
        if (NETWORK_CONSTRUCTORS.has(expression.text)) return 'network-constructor';
        if (expression.text === 'Date') return 'date';
        if (expression.text === 'Math') return 'math';
        if (expression.text === 'crypto') return 'crypto';
        if (expression.text === 'performance') return 'performance';
        if (STORAGE_GLOBALS.has(expression.text)) return 'storage';
        if (BROWSER_GLOBALS.has(expression.text)) return 'browser';
      }
      const symbol = checker.getSymbolAtLocation(expression);
      if (isUnresolvedOrVisited(symbol, visited)) return undefined;
      visited.add(symbol);
      for (const declaration of symbol.declarations ?? []) {
        if (hasVariableInitializer(declaration)) return ambientOrigin(declaration.initializer, visited);
        if (ts.isBindingElement(declaration)) {
          const variable = declaration.parent.parent;
          if (hasVariableInitializer(variable)) {
            return ambientMemberOrigin(ambientOrigin(variable.initializer, visited), bindingName(declaration));
          }
        }
      }
      return undefined;
    }
    if (isMemberAccess(expression)) {
      return ambientMemberOrigin(ambientOrigin(expression.expression, visited), memberName(expression));
    }
    return undefined;
  };
  const isAmbientReference = (node, origin) => ts.isIdentifier(node) && ambientOrigin(node) === origin && isReferenceIdentifier(node);
  const visit = node => {
    const invokedOrigin = ts.isCallExpression(node) || ts.isNewExpression(node) ? ambientOrigin(node.expression) : undefined;
    if (callsAmbientOrigin(node, invokedOrigin, 'network-function')) {
      report(node.expression, 'ambient-network', 'Domain code must receive network access through a port');
    } else if (constructsAmbientOrigin(node, invokedOrigin, 'network-constructor')) {
      report(node.expression, 'ambient-network', 'Domain code must receive network access through a port');
    } else if (constructsCurrentDate(node, invokedOrigin)) {
      report(node.expression, 'ambient-clock', 'Domain code must receive the current time explicitly');
    } else if (callsAmbientOrigin(node, invokedOrigin, 'date')) {
      report(node.expression, 'ambient-clock', 'Domain code must receive the current time explicitly');
    } else if (callsAmbientOrigin(node, invokedOrigin, 'clock-function')) {
      report(node.expression, 'ambient-clock', 'Domain code must receive the current time explicitly');
    } else if (callsAmbientOrigin(node, invokedOrigin, 'random-function')) {
      report(node.expression, 'ambient-randomness', 'Domain code must receive generated identities or random values explicitly');
    } else if (isAmbientReference(node, 'storage')) {
      report(node, 'ambient-storage', 'Domain code must receive storage access through a port');
    } else if (isAmbientReference(node, 'browser')) {
      report(node, 'ambient-browser', 'Domain code must not read browser globals');
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return violations;
};

const isAmbientMember = (owner, member, expectedOwner, expectedMember) => owner === expectedOwner && member === expectedMember;
const isPureDateConversion = (owner, member) => owner === 'date' && ['parse', 'UTC'].includes(member);
const isCryptographicRandomness = (owner, member) => owner === 'crypto' && ['getRandomValues', 'randomUUID'].includes(member);
const isBrowserNetworkConstructor = (owner, member) => owner === 'browser' && NETWORK_CONSTRUCTORS.has(member);
const isBrowserStorage = (owner, member) => owner === 'browser' && STORAGE_GLOBALS.has(member);

const ambientMemberOrigin = (owner, member) => {
  if (isAmbientMember(owner, member, 'date', 'now')) return 'clock-function';
  if (isPureDateConversion(owner, member)) return undefined;
  if (isAmbientMember(owner, member, 'performance', 'now')) return 'clock-function';
  if (isAmbientMember(owner, member, 'math', 'random')) return 'random-function';
  if (isCryptographicRandomness(owner, member)) return 'random-function';
  if (isAmbientMember(owner, member, 'browser', 'fetch')) return 'network-function';
  if (isBrowserNetworkConstructor(owner, member)) return 'network-constructor';
  if (isAmbientMember(owner, member, 'browser', 'Date')) return 'date';
  if (isAmbientMember(owner, member, 'browser', 'Math')) return 'math';
  if (isAmbientMember(owner, member, 'browser', 'crypto')) return 'crypto';
  if (isAmbientMember(owner, member, 'browser', 'performance')) return 'performance';
  if (isBrowserStorage(owner, member)) return 'storage';
  return owner;
};

const memberName = expression => {
  if (ts.isPropertyAccessExpression(expression)) return expression.name.text;
  const argument = expression.argumentExpression;
  return argument && (ts.isStringLiteral(argument) || ts.isNumericLiteral(argument)) ? argument.text : undefined;
};

const bindingName = declaration => {
  const property = declaration.propertyName ?? declaration.name;
  return ts.isIdentifier(property) || ts.isStringLiteral(property) || ts.isNumericLiteral(property) ? property.text : undefined;
};

const unwrapExpression = node => {
  let expression = node;
  while (
    ts.isParenthesizedExpression(expression)
    || ts.isAsExpression(expression)
    || ts.isTypeAssertionExpression(expression)
    || ts.isNonNullExpression(expression)
  ) {
    expression = expression.expression;
  }
  return expression;
};

const isDeclarationName = (node, parent) =>
  (ts.isVariableDeclaration(parent) || ts.isParameter(parent) || ts.isFunctionDeclaration(parent) || ts.isClassDeclaration(parent))
  && parent.name === node;

const isPropertyAssignmentName = (node, parent) => ts.isPropertyAssignment(parent) && parent.name === node && parent.initializer !== node;

const isPropertyAccessName = (node, parent) => ts.isPropertyAccessExpression(parent) && parent.name === node;

const isModuleBinding = node =>
  ts.isImportSpecifier(node) || ts.isExportSpecifier(node) || ts.isImportClause(node) || ts.isNamespaceImport(node);

const isReferenceIdentifier = node => {
  const parent = node.parent;
  if (!parent) return true;
  if (isDeclarationName(node, parent)) {
    return false;
  }
  if (isPropertyAccessName(node, parent)) return false;
  if (isPropertyAssignmentName(node, parent)) return false;
  if (isModuleBinding(parent)) return false;
  return true;
};

const violation = (code, file, line, message, target) => ({ code, file, line, message, ...(target ? { target } : {}) });
const violationKey = value => `${value.file}:${value.line}:${value.code}:${value.target ?? ''}`;
const uniqueViolations = values => [...new Map(values.map(value => [violationKey(value), value])).values()];
const lineOf = (node, sourceFile) => sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
const slash = path => path.split(sep).join('/');
const isWithin = (file, directory) => {
  const path = relative(resolve(directory), resolve(file));
  return path === '' || (!path.startsWith(`..${sep}`) && path !== '..' && !isAbsolute(path));
};
