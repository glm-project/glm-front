import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, join, relative, resolve } from 'node:path';
import ts from 'typescript';

const escapeRegExp = string => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const findFiles = (directory, extensions) => {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return findFiles(path, extensions);
    return entry.isFile() && extensions.some(ext => entry.name.endsWith(ext)) ? [path] : [];
  });
};

const findApplicationFiles = sourceRoot => {
  const allTsFiles = findFiles(sourceRoot, ['.ts']);
  return allTsFiles.filter(file => {
    const normalized = relative(sourceRoot, file).replaceAll('\\', '/');
    return normalized.includes('/application/') && !normalized.endsWith('.spec.ts');
  });
};

const isPublicMember = member => {
  if (ts.isConstructorDeclaration(member)) return false;
  if (!member.name || !ts.isIdentifier(member.name)) return false;
  if (member.name.kind === ts.SyntaxKind.PrivateIdentifier) return false;
  const isPrivateOrProtected = member.modifiers?.some(
    modifier => modifier.kind === ts.SyntaxKind.PrivateKeyword || modifier.kind === ts.SyntaxKind.ProtectedKeyword,
  );
  return !isPrivateOrProtected;
};

export const inspectCoordinatorPublicSurface = ({
  sourceRoot = 'src/main/webapp',
  searchRoots = ['src/main/webapp', 'src/test/webapp'],
} = {}) => {
  const absoluteSourceRoot = resolve(sourceRoot);
  const absoluteSearchRoots = searchRoots.map(root => resolve(root));

  const applicationFiles = findApplicationFiles(absoluteSourceRoot);
  const searchableFiles = absoluteSearchRoots.flatMap(root => findFiles(root, ['.ts', '.html']));
  const fileContents = searchableFiles.map(file => readFileSync(file, 'utf8'));

  const violations = [];

  for (const appFile of applicationFiles) {
    const content = readFileSync(appFile, 'utf8');
    const sourceFile = ts.createSourceFile(appFile, content, ts.ScriptTarget.Latest, true);

    const visit = node => {
      if (ts.isClassDeclaration(node) && node.name) {
        const isExported = node.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword);
        if (isExported) {
          const className = node.name.text;
          for (const member of node.members) {
            if (isPublicMember(member)) {
              const memberName = member.name.text;
              const regex = new RegExp(`\\b${escapeRegExp(memberName)}\\b`);
              const externalOccurrences = searchableFiles.filter(
                (file, index) => file !== appFile && regex.test(fileContents[index]),
              ).length;

              if (externalOccurrences === 0) {
                violations.push({
                  file: relative(process.cwd(), appFile).replaceAll('\\', '/'),
                  className,
                  member: memberName,
                  message: `Public member '${memberName}' in ${className} is not referenced outside ${basename(appFile)}`,
                });
              }
            }
          }
        }
      }
      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
  }

  return violations.sort((left, right) => left.file.localeCompare(right.file) || left.member.localeCompare(right.member));
};
