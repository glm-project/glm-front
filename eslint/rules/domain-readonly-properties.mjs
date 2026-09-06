const mutableCollectionNames = new Set(['Array', 'Map', 'Set']);
const readonlyCollectionNames = new Set(['ReadonlyArray', 'ReadonlyMap', 'ReadonlySet']);

function typeName(type) {
  return type?.typeName?.type === 'Identifier' ? type.typeName.name : undefined;
}

function containsMutableCollection(type) {
  switch (type?.type) {
    case 'TSArrayType':
    case 'TSTupleType':
      return true;
    case 'TSUnionType':
    case 'TSIntersectionType':
      return type.types.some(containsMutableCollection);
    case 'TSParenthesizedType':
      return containsMutableCollection(type.typeAnnotation);
    case 'TSNamedTupleMember':
      return containsMutableCollection(type.elementType);
    case 'TSOptionalType':
    case 'TSRestType':
      return containsMutableCollection(type.typeAnnotation);
    case 'TSTypeOperator':
      if (type.operator !== 'readonly') return containsMutableCollection(type.typeAnnotation);
      return containsMutableCollectionInReadonlyType(type.typeAnnotation);
    case 'TSFunctionType':
    case 'TSConstructorType':
      return containsMutableCollection(type.returnType?.typeAnnotation);
    case 'TSTypeReference': {
      const name = typeName(type);
      if (mutableCollectionNames.has(name)) return true;
      if (readonlyCollectionNames.has(name)) return type.typeArguments?.params.some(containsMutableCollection) ?? false;
      return false;
    }
    default:
      return false;
  }
}

function containsMutableCollectionInReadonlyType(type) {
  if (type?.type === 'TSArrayType') return containsMutableCollection(type.elementType);
  if (type?.type === 'TSTupleType') return type.elementTypes.some(containsMutableCollectionInReadonlyTupleElement);
  return containsMutableCollection(type);
}

function containsMutableCollectionInReadonlyTupleElement(type) {
  if (type?.type !== 'TSRestType') return containsMutableCollection(type);
  if (type.typeAnnotation.type === 'TSArrayType') return containsMutableCollection(type.typeAnnotation.elementType);
  return containsMutableCollection(type.typeAnnotation);
}

function propertyType(node) {
  const property = node.parameter?.type === 'AssignmentPattern' ? node.parameter.left : (node.parameter ?? node);
  return property.typeAnnotation?.typeAnnotation;
}

function propertyValue(node) {
  return node.parameter?.type === 'AssignmentPattern' ? node.parameter.right : node.value;
}

function containsMutableCollectionInitializer(value) {
  if (value?.type === 'TSAsExpression') {
    if (value.typeAnnotation.type === 'TSTypeReference' && typeName(value.typeAnnotation) === 'const') return false;
    return containsMutableCollection(value.typeAnnotation);
  }
  return value?.type === 'ArrayExpression' || (value?.type === 'NewExpression' && mutableCollectionNames.has(value.callee.name));
}

function collectionIsMutable(node) {
  const type = propertyType(node);
  if (type) return containsMutableCollection(type);
  return containsMutableCollectionInitializer(propertyValue(node));
}

export const domainReadonlyProperties = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'require immutable domain properties',
    },
    schema: [],
    messages: {
      readonlyProperty:
        'Declare every domain property readonly, including private, protected and #private state — see documentation/adr/0021-own-immutable-domain-contracts.md.',
      readonlyCollection:
        'A readonly domain property carrying a collection also needs a readonly collection type — see documentation/adr/0021-own-immutable-domain-contracts.md.',
      explicitCommand:
        'A setter exposes mutable domain state: use an explicit transition that returns a new instance — see documentation/adr/0021-own-immutable-domain-contracts.md.',
    },
  },
  create: context => {
    const report = node => context.report({ node, messageId: 'readonlyProperty' });
    const reportCollection = node => context.report({ node, messageId: 'readonlyCollection' });
    const reportSetter = node => context.report({ node, messageId: 'explicitCommand' });
    const checkProperty = node => {
      if (!node.readonly) report(node);
      else if (collectionIsMutable(node)) reportCollection(node);
    };

    return {
      TSPropertySignature: checkProperty,
      TSIndexSignature: checkProperty,
      PropertyDefinition: checkProperty,
      TSAbstractPropertyDefinition: checkProperty,
      TSParameterProperty: checkProperty,
      AccessorProperty: reportSetter,
      MethodDefinition: node => {
        if (node.kind === 'set') reportSetter(node);
      },
      TSMethodSignature: node => {
        if (node.kind === 'set') reportSetter(node);
      },
      TSAbstractMethodDefinition: node => {
        if (node.kind === 'set') reportSetter(node);
      },
    };
  },
};
