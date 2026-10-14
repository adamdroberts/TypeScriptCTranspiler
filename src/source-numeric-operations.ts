import ts from "typescript";

// One operation collection supplies native lowering and finite primitive facts.
// The evaluator receives primitives after the shared ordered conversion graph;
// type assertions leave JavaScript Number/BigInt/String semantics intact.
export type SourcePrimitive = string | number | bigint | boolean | null | undefined | symbol;

export interface SourceNumericOperation {
    form: "binary" | "prefix" | "update" | "relational" | "equality";
    token: ts.SyntaxKind;
    assignment?: ts.SyntaxKind;
    kernel: string;
    result: "value" | "number" | "boolean";
    conversion: "default" | "numeric" | "number" | "primitive-number" | "none" | "equality";
    evaluate: (values: readonly SourcePrimitive[]) => SourcePrimitive;
    negate?: boolean;
    relation?: "<" | "<=" | ">" | ">=";
}
export const SOURCE_SCALAR_OPERATIONS: readonly SourceNumericOperation[] = [
    { form: "equality", token: ts.SyntaxKind.EqualsEqualsToken, kernel: "tsc_value_abstract_eq", negate: false, result: "boolean", conversion: "equality", evaluate: ([left, right]) => left == right },
    { form: "equality", token: ts.SyntaxKind.ExclamationEqualsToken, kernel: "tsc_value_abstract_eq", negate: true, result: "boolean", conversion: "equality", evaluate: ([left, right]) => left != right },
    { form: "equality", token: ts.SyntaxKind.EqualsEqualsEqualsToken, kernel: "tsc_value_eq", negate: false, result: "boolean", conversion: "none", evaluate: ([left, right]) => left === right },
    { form: "equality", token: ts.SyntaxKind.ExclamationEqualsEqualsToken, kernel: "tsc_value_eq", negate: true, result: "boolean", conversion: "none", evaluate: ([left, right]) => left !== right },
    { form: "binary", token: ts.SyntaxKind.PlusToken, assignment: ts.SyntaxKind.PlusEqualsToken, kernel: "tsc_value_add", result: "value", conversion: "default", evaluate: ([left, right]) => (left as number) + (right as number) },
    { form: "binary", token: ts.SyntaxKind.MinusToken, assignment: ts.SyntaxKind.MinusEqualsToken, kernel: "tsc_value_sub", result: "value", conversion: "numeric", evaluate: ([left, right]) => (left as number) - (right as number) },
    { form: "binary", token: ts.SyntaxKind.AsteriskToken, assignment: ts.SyntaxKind.AsteriskEqualsToken, kernel: "tsc_value_mul", result: "value", conversion: "numeric", evaluate: ([left, right]) => (left as number) * (right as number) },
    { form: "binary", token: ts.SyntaxKind.SlashToken, assignment: ts.SyntaxKind.SlashEqualsToken, kernel: "tsc_value_div", result: "value", conversion: "numeric", evaluate: ([left, right]) => (left as number) / (right as number) },
    { form: "binary", token: ts.SyntaxKind.PercentToken, assignment: ts.SyntaxKind.PercentEqualsToken, kernel: "tsc_value_mod", result: "value", conversion: "numeric", evaluate: ([left, right]) => (left as number) % (right as number) },
    { form: "binary", token: ts.SyntaxKind.AsteriskAsteriskToken, assignment: ts.SyntaxKind.AsteriskAsteriskEqualsToken, kernel: "tsc_value_pow", result: "value", conversion: "numeric", evaluate: ([left, right]) => (left as number) ** (right as number) },
    { form: "binary", token: ts.SyntaxKind.AmpersandToken, assignment: ts.SyntaxKind.AmpersandEqualsToken, kernel: "tsc_value_bit_and", result: "value", conversion: "numeric", evaluate: ([left, right]) => (left as number) & (right as number) },
    { form: "binary", token: ts.SyntaxKind.BarToken, assignment: ts.SyntaxKind.BarEqualsToken, kernel: "tsc_value_bit_or", result: "value", conversion: "numeric", evaluate: ([left, right]) => (left as number) | (right as number) },
    { form: "binary", token: ts.SyntaxKind.CaretToken, assignment: ts.SyntaxKind.CaretEqualsToken, kernel: "tsc_value_bit_xor", result: "value", conversion: "numeric", evaluate: ([left, right]) => (left as number) ^ (right as number) },
    { form: "binary", token: ts.SyntaxKind.LessThanLessThanToken, assignment: ts.SyntaxKind.LessThanLessThanEqualsToken, kernel: "tsc_value_shl", result: "value", conversion: "numeric", evaluate: ([left, right]) => (left as number) << (right as number) },
    { form: "binary", token: ts.SyntaxKind.GreaterThanGreaterThanToken, assignment: ts.SyntaxKind.GreaterThanGreaterThanEqualsToken, kernel: "tsc_value_shr", result: "value", conversion: "numeric", evaluate: ([left, right]) => (left as number) >> (right as number) },
    { form: "binary", token: ts.SyntaxKind.GreaterThanGreaterThanGreaterThanToken, assignment: ts.SyntaxKind.GreaterThanGreaterThanGreaterThanEqualsToken, kernel: "tsc_value_ushr", result: "value", conversion: "numeric", evaluate: ([left, right]) => (left as number) >>> (right as number) },
    { form: "prefix", token: ts.SyntaxKind.PlusToken, kernel: "tsc_value_to_number", result: "number", conversion: "numeric", evaluate: ([left, right]) => +(left as number) },
    { form: "prefix", token: ts.SyntaxKind.MinusToken, kernel: "tsc_value_neg", result: "value", conversion: "numeric", evaluate: ([left, right]) => -(left as number) },
    { form: "prefix", token: ts.SyntaxKind.TildeToken, kernel: "tsc_value_bit_not", result: "value", conversion: "numeric", evaluate: ([left, right]) => ~(left as number) },
    { form: "update", token: ts.SyntaxKind.PlusPlusToken, kernel: "tsc_value_inc", result: "value", conversion: "numeric", evaluate: ([left, right]) => typeof left === "bigint" ? left + 1n : Number(left) + 1 },
    { form: "update", token: ts.SyntaxKind.MinusMinusToken, kernel: "tsc_value_dec", result: "value", conversion: "numeric", evaluate: ([left, right]) => typeof left === "bigint" ? left - 1n : Number(left) - 1 },
    { form: "relational", token: ts.SyntaxKind.LessThanToken, kernel: "tsc_value_cmp", result: "boolean", relation: "<", conversion: "primitive-number", evaluate: ([left, right]) => (left as number) < (right as number) },
    { form: "relational", token: ts.SyntaxKind.LessThanEqualsToken, kernel: "tsc_value_cmp", result: "boolean", relation: "<=", conversion: "primitive-number", evaluate: ([left, right]) => (left as number) <= (right as number) },
    { form: "relational", token: ts.SyntaxKind.GreaterThanToken, kernel: "tsc_value_cmp", result: "boolean", relation: ">", conversion: "primitive-number", evaluate: ([left, right]) => (left as number) > (right as number) },
    { form: "relational", token: ts.SyntaxKind.GreaterThanEqualsToken, kernel: "tsc_value_cmp", result: "boolean", relation: ">=", conversion: "primitive-number", evaluate: ([left, right]) => (left as number) >= (right as number) },
];
export const SOURCE_NUMERIC_OPERATION_FUNCTIONS: ReadonlyMap<ts.SyntaxKind, string> = new Map(
    SOURCE_SCALAR_OPERATIONS.filter(operation => operation.form === "binary")
        .flatMap(operation => [[operation.token, operation.kernel] as const,
            ...(operation.assignment === undefined ? [] : [[operation.assignment, operation.kernel] as const])]),
);
export const SOURCE_BINARY_NUMERIC_OPERATIONS: ReadonlyMap<ts.SyntaxKind, SourceNumericOperation> = new Map(
    SOURCE_SCALAR_OPERATIONS.filter(operation => operation.form === "binary" || operation.form === "relational")
        .map(operation => [operation.token, operation]),
);
export const SOURCE_PREFIX_NUMERIC_OPERATIONS: ReadonlyMap<ts.SyntaxKind, SourceNumericOperation> = new Map(
    SOURCE_SCALAR_OPERATIONS.filter(operation => operation.form === "prefix")
        .map(operation => [operation.token, operation]),
);
export const SOURCE_UPDATE_NUMERIC_OPERATIONS: ReadonlyMap<ts.SyntaxKind, SourceNumericOperation> = new Map(
    SOURCE_SCALAR_OPERATIONS.filter(operation => operation.form === "update")
        .map(operation => [operation.token, operation]),
);

const sourceEqualityOperations: ReadonlyMap<ts.SyntaxKind, SourceNumericOperation> = new Map(
    SOURCE_SCALAR_OPERATIONS.filter(operation => operation.form === "equality").map(operation => [operation.token,operation]),
);
const sourceNumericAssignments: ReadonlyMap<ts.SyntaxKind, SourceNumericOperation> = new Map(
    SOURCE_SCALAR_OPERATIONS.flatMap(operation => operation.assignment === undefined ? [] : [[operation.assignment, operation] as const]),
);

export function sourceNumericOperation(node: ts.Node): SourceNumericOperation | undefined {
    if (ts.isBinaryExpression(node)) return SOURCE_BINARY_NUMERIC_OPERATIONS.get(node.operatorToken.kind) ?? sourceNumericAssignments.get(node.operatorToken.kind) ?? sourceEqualityOperations.get(node.operatorToken.kind);
    if (ts.isPrefixUnaryExpression(node)) return SOURCE_PREFIX_NUMERIC_OPERATIONS.get(node.operator) ?? SOURCE_UPDATE_NUMERIC_OPERATIONS.get(node.operator);
    if (ts.isPostfixUnaryExpression(node)) return SOURCE_UPDATE_NUMERIC_OPERATIONS.get(node.operator);
    return undefined;
}
