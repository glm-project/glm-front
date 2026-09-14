import { createCompilerHost, NgtscProgram, readConfiguration } from '@angular/compiler-cli';
import { existsSync, readFileSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';
import ts from 'typescript';

const slash = file => file.split(sep).join('/');
const isTest = file => /(?:^|\/)src\/test\//.test(slash(file)) || /\.(?:spec|test|cypress)(?:\.ngtypecheck)?\.ts$/.test(file);
const isHandwritten = file => !file.isDeclarationFile && !file.fileName.endsWith('.ngtypecheck.ts');
const isProduction = (file, root) => slash(relative(root, file)).startsWith('src/main/webapp/') && !isTest(file);
const hasBody = node => (ts.isMethodDeclaration(node) || ts.isFunctionDeclaration(node) || ts.isGetAccessor(node)) && node.body;
const isModuleVariable = node =>
  ts.isVariableDeclaration(node) && ts.isVariableStatement(node.parent.parent) && ts.isSourceFile(node.parent.parent.parent);
const isParameterProperty = node => ts.isParameter(node) && ts.isConstructorDeclaration(node.parent) && (node.modifiers?.length ?? 0) > 0;
const isCandidate = node => hasBody(node) || ts.isPropertyDeclaration(node) || isModuleVariable(node) || isParameterProperty(node);
const isNamedCandidate = node => isCandidate(node) && node.name && ts.isIdentifier(node.name);
const isObject = value => typeof value === 'object' && value !== null;
const isReplacement = value => typeof value.replace === 'string' && typeof value.with === 'string';

const resolveSymbol = (symbol, checker) => {
  if (!symbol) return undefined;
  if (symbol.flags & ts.SymbolFlags.Alias) return resolveSymbol(checker.getAliasedSymbol(symbol), checker);
  const declaration = symbol.valueDeclaration ?? symbol.declarations?.[0];
  return declaration?.name ? (checker.getSymbolAtLocation(declaration.name) ?? symbol) : symbol;
};

const isDeclarationName = node =>
  node.parent.name === node && !ts.isShorthandPropertyAssignment(node.parent) && !ts.isPropertyAccessExpression(node.parent);
const isBinding = node => ts.isImportDeclaration(node) || ts.isExportDeclaration(node) || ts.isTypeNode(node);
const isLiteralMember = node => ts.isStringLiteral(node) && ts.isElementAccessExpression(node.parent);
const isWrittenMember = node => {
  const access = ts.isPropertyAccessExpression(node.parent) || ts.isElementAccessExpression(node.parent) ? node.parent : node;
  const parent = access.parent;
  return ts.isBinaryExpression(parent) && parent.left === access && parent.operatorToken.kind === ts.SyntaxKind.EqualsToken;
};

const referenceSymbol = (node, checker) => {
  if (ts.isShorthandPropertyAssignment(node.parent)) return resolveSymbol(checker.getShorthandAssignmentValueSymbol(node.parent), checker);
  if (isLiteralMember(node)) {
    return resolveSymbol(checker.getTypeAtLocation(node.parent.expression).getProperty(node.text), checker);
  }
  return resolveSymbol(checker.getSymbolAtLocation(node), checker);
};

const createProgram = root => {
  const configuration = readConfiguration(resolve(root, 'tsconfig.json'), { _enableTemplateTypeChecker: true });
  if (configuration.errors.length)
    throw new Error(
      ts.formatDiagnosticsWithColorAndContext(configuration.errors, {
        getCanonicalFileName: file => file,
        getCurrentDirectory: () => root,
        getNewLine: () => '\n',
      }),
    );
  const files = ts.sys.readDirectory(resolve(root, 'src'), ['.ts'], ['**/node_modules/**', '**/generated/**']);
  const angular = new NgtscProgram(files, configuration.options, createCompilerHost({ options: configuration.options }));
  angular.compiler.getTemplateTypeChecker().generateAllTypeCheckBlocks();
  return angular.compiler.getCurrentProgram();
};

const inheritedSymbols = (node, checker) => {
  const owner = node.parent;
  if (!ts.isClassDeclaration(owner)) return [];
  return (owner.heritageClauses ?? []).flatMap(clause =>
    clause.types.flatMap(base => {
      const property = checker.getTypeAtLocation(base).getProperty(node.name.text);
      return property ? [resolveSymbol(property, checker)] : [];
    }),
  );
};

const configuredReplacements = root => {
  const config = resolve(root, 'angular.json');
  if (!existsSync(config)) return new Map();
  const replacements = new Map();
  const visit = value => {
    if (!isObject(value)) return;
    if (isReplacement(value)) replacements.set(resolve(root, value.with), resolve(root, value.replace));
    Object.values(value).forEach(visit);
  };
  visit(JSON.parse(readFileSync(config, 'utf8')));
  return replacements;
};

const frameworkContract = (candidate, root) =>
  candidate.inherited.some(symbol =>
    (symbol?.declarations ?? []).some(declaration => !slash(relative(root, declaration.getSourceFile().fileName)).startsWith('src/')),
  );

const collectCandidates = (files, program, checker, root) => {
  const candidates = new Map();
  const replacements = configuredReplacements(root);
  for (const file of files.filter(file => isHandwritten(file) && isProduction(file.fileName, root))) {
    const visit = node => {
      if (isNamedCandidate(node)) {
        const symbol = resolveSymbol(checker.getSymbolAtLocation(node.name), checker);
        const inherited = inheritedSymbols(node, checker);
        const original = program.getSourceFile(replacements.get(resolve(file.fileName)) ?? '');
        const originalModule = original && checker.getSymbolAtLocation(original);
        const originalExport =
          originalModule && checker.getExportsOfModule(originalModule).find(exported => exported.name === node.name.text);
        if (originalExport) inherited.push(resolveSymbol(originalExport, checker));
        candidates.set(symbol, { node, inherited });
      }
      ts.forEachChild(node, visit);
    };
    visit(file);
  }
  return candidates;
};

const collectReferences = (files, checker, root) => {
  const references = new Map();
  const dynamicTemplateMembers = new Set();
  for (const file of files) {
    const visit = node => {
      if (isBinding(node)) return;
      const untypedTemplateAccess =
        file.fileName.endsWith('.ngtypecheck.ts')
        && isProduction(file.fileName, root)
        && ts.isPropertyAccessExpression(node)
        && checker.getTypeAtLocation(node.expression).flags & ts.TypeFlags.Any;
      if (untypedTemplateAccess) dynamicTemplateMembers.add(node.name.text);
      const reference = (ts.isIdentifier(node) || isLiteralMember(node)) && !isDeclarationName(node) && !isWrittenMember(node);
      if (reference) {
        const symbol = referenceSymbol(node, checker);
        if (symbol) {
          const uses = references.get(symbol) ?? [];
          uses.push({ node, production: isProduction(file.fileName, root) });
          references.set(symbol, uses);
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(file);
  }
  return { references, dynamicTemplateMembers };
};

const findTestOnlySymbols = (candidates, references, dynamicTemplateMembers, root) => {
  const usesOf = ([symbol, candidate]) => {
    const uses = [symbol, ...candidate.inherited].flatMap(key => references.get(key) ?? []);
    return uses.filter(use => !contains(candidate.node, use.node));
  };
  const live = new Set();
  const tested = new Set();
  const dependencies = new Map();
  for (const entry of candidates) {
    const [symbol, candidate] = entry;
    const externallyConsumed = frameworkContract(candidate, root) || dynamicTemplateMembers.has(candidate.node.name.text);
    if (externallyConsumed) live.add(symbol);
    for (const use of usesOf(entry)) {
      if (!use.production) {
        tested.add(symbol);
        continue;
      }
      const owner = [...candidates].find(([, value]) => contains(value.node, use.node))?.[0];
      if (!owner) live.add(symbol);
      else {
        const targets = dependencies.get(owner) ?? new Set();
        targets.add(symbol);
        dependencies.set(owner, targets);
      }
    }
  }
  propagate(live, dependencies);
  propagate(tested, dependencies);
  return [...tested].filter(symbol => !live.has(symbol));
};

export const inspectTestOnlyProduction = ({ root = process.cwd() } = {}) => {
  const program = createProgram(root);
  const checker = program.getTypeChecker();
  const files = program.getSourceFiles().filter(file => slash(relative(root, file.fileName)).startsWith('src/'));
  const candidates = collectCandidates(files, program, checker, root);
  const { references, dynamicTemplateMembers } = collectReferences(files, checker, root);
  return findTestOnlySymbols(candidates, references, dynamicTemplateMembers, root).map(symbol => {
    const candidate = candidates.get(symbol);
    const file = candidate.node.getSourceFile();
    const position = file.getLineAndCharacterOfPosition(candidate.node.name.getStart());
    return {
      file: slash(relative(root, file.fileName)),
      name: candidate.node.name.text,
      line: position.line + 1,
      column: position.character,
    };
  });
};

const propagate = (reachable, dependencies) => {
  for (const symbol of reachable) {
    for (const target of dependencies.get(symbol) ?? []) reachable.add(target);
  }
};

const contains = (owner, node) => owner.getSourceFile() === node.getSourceFile() && owner.pos <= node.pos && owner.end >= node.end;
const cached = new Map();

export const noTestOnlyProduction = {
  meta: {
    type: 'problem',
    schema: [],
    messages: {
      testOnly: '{{name}} is consumed only by tests. Remove it or exercise its real production caller — see documentation/testing.md.',
    },
  },
  create(context) {
    return {
      Program() {
        const root = context.cwd;
        if (!cached.has(root)) cached.set(root, inspectTestOnlyProduction({ root }));
        const file = slash(relative(root, context.filename));
        for (const violation of cached.get(root).filter(value => value.file === file)) {
          context.report({
            loc: { line: violation.line, column: violation.column },
            messageId: 'testOnly',
            data: { name: violation.name },
          });
        }
      },
    };
  },
};
