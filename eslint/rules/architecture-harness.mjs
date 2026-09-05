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
    if (source.layer === 'domain' && !source.relativePath.endsWith('.spec.ts')) {
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
      if (entry.isFile() && entry.name.endsWith('.ts')) {
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
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      addResolvedModule(node.moduleSpecifier);
      const bindings = node.importClause?.namedBindings;
      if (node.importClause?.name) {
        addSymbol(node.importClause.name);
        addNamedModuleExport(node.moduleSpecifier, 'default', node.importClause.name);
      }
      if (bindings && ts.isNamedImports(bindings)) {
        bindings.elements.forEach(specifier => {
          addSymbol(specifier);
          addNamedModuleExport(node.moduleSpecifier, (specifier.propertyName ?? specifier.name).text, specifier);
        });
      }
      if (bindings && ts.isNamespaceImport(bindings)) addModuleExports(node.moduleSpecifier);
    }
    if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      addResolvedModule(node.moduleSpecifier);
      if (node.exportClause && ts.isNamedExports(node.exportClause)) {
        node.exportClause.elements.forEach(specifier => {
          addSymbol(specifier);
          addNamedModuleExport(node.moduleSpecifier, (specifier.propertyName ?? specifier.name).text, specifier);
        });
      } else addModuleExports(node.moduleSpecifier);
    }
    if (
      ts.isCallExpression(node)
      && node.expression.kind === ts.SyntaxKind.ImportKeyword
      && node.arguments.length === 1
      && ts.isStringLiteral(node.arguments[0])
    ) {
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

const describeFile = (fileName, sourceRoot, boundaries) => {
  const absolutePath = resolve(fileName);
  const relativePath = slash(relative(sourceRoot, absolutePath));
  const boundary = boundaries.find(candidate => isWithin(absolutePath, candidate.absoluteRoot));
  const parts = relativePath.split('/');
  const infrastructureIndex = parts.indexOf('infrastructure');
  let layer;
  if (parts.includes('domain')) layer = 'domain';
  else if (parts.includes('application')) layer = 'application';
  else if (infrastructureIndex >= 0 && parts[infrastructureIndex + 1] === 'primary') layer = 'primary';
  else if (infrastructureIndex >= 0 && parts[infrastructureIndex + 1] === 'secondary') layer = 'secondary';
  const firstPart = parts[0];
  const front = firstPart === 'gestion' || firstPart === 'pupitre' ? firstPart : undefined;
  return { absolutePath, relativePath, boundary, layer, front, insideSource: isWithin(absolutePath, sourceRoot) };
};

const dependencyViolations = (source, target, dependency) => {
  if (source.absolutePath === target.absolutePath) return [];
  const violations = [];
  const report = (code, message) => violations.push(violation(code, source.relativePath, dependency.line, message, target.relativePath));

  if (source.front && target.front && source.front !== target.front)
    report('cross-front', `${source.front} must not depend on ${target.front}`);
  if (!source.front && source.insideSource && target.front) report('common-to-front', 'Common app code must not depend on a front');
  if (source.boundary?.kind === 'shared' && target.boundary?.kind === 'business') {
    report('shared-to-business', 'A shared kernel must not depend on a business context');
  }
  if (
    source.boundary
    && target.boundary?.kind === 'business'
    && target.layer === 'domain'
    && source.boundary.relativeRoot !== target.boundary.relativeRoot
  ) {
    report('cross-context-domain', 'A boundary must not depend on another business context domain');
  }
  if (source.layer === 'domain' && !isAllowedDomainTarget(source, target)) {
    report('domain-outside', 'Domain code may depend only on its own domain and declared shared kernels');
  }
  if (source.layer === 'application' && target.layer && ['primary', 'secondary'].includes(target.layer)) {
    report('application-to-infrastructure', 'Application code must not depend on infrastructure');
  }
  if (source.layer === 'primary' && target.layer === 'secondary') {
    report('primary-to-secondary', 'A primary adapter must not depend on a secondary adapter');
  }
  if (source.layer === 'secondary' && target.layer === 'application') {
    report('secondary-to-application', 'A secondary adapter must not depend on application code');
  }
  if (source.layer === 'secondary' && target.layer === 'primary' && source.boundary?.relativeRoot === target.boundary?.relativeRoot) {
    report('secondary-to-own-primary', 'A secondary adapter must not depend on its own primary adapter');
  }
  if (target.boundary?.name === 'design-system' && source.layer !== 'primary' && source.boundary) {
    report('design-system-consumer', 'Only primary adapters may depend on a design system');
  }
  if (target.layer === 'primary' && target.relativePath.split('/').at(-1)?.startsWith('TypeScript') && source.layer !== 'secondary') {
    report('typescript-primary-caller', 'A primary TypeScript adapter may only be called from a secondary adapter');
  }
  return violations;
};

const isAllowedDomainTarget = (source, target) => {
  if (target.boundary?.kind === 'shared') return target.boundary.name !== 'design-system';
  return source.boundary?.relativeRoot === target.boundary?.relativeRoot && target.layer === 'domain';
};

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
      if (!symbol || visited.has(symbol)) return undefined;
      visited.add(symbol);
      for (const declaration of symbol.declarations ?? []) {
        if (ts.isVariableDeclaration(declaration) && declaration.initializer) return ambientOrigin(declaration.initializer, visited);
        if (ts.isBindingElement(declaration)) {
          const variable = declaration.parent.parent;
          if (ts.isVariableDeclaration(variable) && variable.initializer) {
            return ambientMemberOrigin(ambientOrigin(variable.initializer, visited), bindingName(declaration));
          }
        }
      }
      return undefined;
    }
    if (ts.isPropertyAccessExpression(expression) || ts.isElementAccessExpression(expression)) {
      return ambientMemberOrigin(ambientOrigin(expression.expression, visited), memberName(expression));
    }
    return undefined;
  };
  const visit = node => {
    const invokedOrigin = ts.isCallExpression(node) || ts.isNewExpression(node) ? ambientOrigin(node.expression) : undefined;
    if (ts.isCallExpression(node) && invokedOrigin === 'network-function') {
      report(node.expression, 'ambient-network', 'Domain code must receive network access through a port');
    } else if (ts.isNewExpression(node) && invokedOrigin === 'network-constructor') {
      report(node.expression, 'ambient-network', 'Domain code must receive network access through a port');
    } else if (ts.isNewExpression(node) && invokedOrigin === 'date' && (node.arguments?.length ?? 0) === 0) {
      report(node.expression, 'ambient-clock', 'Domain code must receive the current time explicitly');
    } else if (ts.isCallExpression(node) && invokedOrigin === 'date') {
      report(node.expression, 'ambient-clock', 'Domain code must receive the current time explicitly');
    } else if (ts.isCallExpression(node) && invokedOrigin === 'clock-function') {
      report(node.expression, 'ambient-clock', 'Domain code must receive the current time explicitly');
    } else if (ts.isCallExpression(node) && invokedOrigin === 'random-function') {
      report(node.expression, 'ambient-randomness', 'Domain code must receive generated identities or random values explicitly');
    } else if (ts.isIdentifier(node) && ambientOrigin(node) === 'storage' && isReferenceIdentifier(node)) {
      report(node, 'ambient-storage', 'Domain code must receive storage access through a port');
    } else if (ts.isIdentifier(node) && ambientOrigin(node) === 'browser' && isReferenceIdentifier(node)) {
      report(node, 'ambient-browser', 'Domain code must not read browser globals');
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return violations;
};

const ambientMemberOrigin = (owner, member) => {
  if (owner === 'date' && member === 'now') return 'clock-function';
  if (owner === 'date' && ['parse', 'UTC'].includes(member)) return undefined;
  if (owner === 'performance' && member === 'now') return 'clock-function';
  if (owner === 'math' && member === 'random') return 'random-function';
  if (owner === 'crypto' && ['getRandomValues', 'randomUUID'].includes(member)) return 'random-function';
  if (owner === 'browser' && member === 'fetch') return 'network-function';
  if (owner === 'browser' && NETWORK_CONSTRUCTORS.has(member)) return 'network-constructor';
  if (owner === 'browser' && member === 'Date') return 'date';
  if (owner === 'browser' && member === 'Math') return 'math';
  if (owner === 'browser' && member === 'crypto') return 'crypto';
  if (owner === 'browser' && member === 'performance') return 'performance';
  if (owner === 'browser' && STORAGE_GLOBALS.has(member)) return 'storage';
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

const isReferenceIdentifier = node => {
  const parent = node.parent;
  if (!parent) return true;
  if (
    (ts.isVariableDeclaration(parent) || ts.isParameter(parent) || ts.isFunctionDeclaration(parent) || ts.isClassDeclaration(parent))
    && parent.name === node
  ) {
    return false;
  }
  if (ts.isPropertyAccessExpression(parent) && parent.name === node) return false;
  if (ts.isPropertyAssignment(parent) && parent.name === node && parent.initializer !== node) return false;
  if (ts.isImportSpecifier(parent) || ts.isExportSpecifier(parent) || ts.isImportClause(parent) || ts.isNamespaceImport(parent))
    return false;
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
