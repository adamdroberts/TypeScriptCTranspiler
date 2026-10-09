let trace = "";
function numberValue(value: number): number { trace += "N"; return value; }
function textValue(value: string): string { trace += "S"; return value; }
function optionalValue(value: string | undefined): string | undefined { trace += "U"; return value; }
function nullableValue(value: string | null): string | null { trace += "Z"; return value; }
const zero = numberValue(0) && textValue("unused");
console.log("zero", zero, typeof zero, trace);
trace = "";
const word = numberValue(2) && textValue("selected");
console.log("word", word, typeof word, trace);
trace = "";
const negativeZero = numberValue(-0) && textValue("unused");
console.log("negative-zero", Object.is(negativeZero, -0), trace);
trace = "";
const selectedNaN = numberValue(NaN) && textValue("unused");
console.log("nan", Object.is(selectedNaN, NaN), trace);
trace = "";
const fallback = numberValue(0) || textValue("fallback");
console.log("fallback", fallback, trace);
trace = "";
const nonNullish = numberValue(0) ?? textValue("unused");
console.log("non-nullish", nonNullish, trace);
trace = "";
const absent = optionalValue(undefined) && textValue("unused");
console.log("optional", absent, typeof absent, trace);
trace = "";
const nullable = nullableValue(null) && textValue("unused");
console.log("nullable", nullable, typeof nullable, trace);
trace = "";
const optionalFallback = optionalValue(undefined) ?? textValue("optional-fallback");
console.log("optional-fallback", optionalFallback, trace);
class Holder {
    value: string | null | undefined;
    constructor(value: string | null | undefined) { this.value = value; }
    choose(): any { return this.value ?? textValue("field-fallback"); }
}
trace = "";
console.log("field", new Holder(undefined).choose(), trace);
const numbers = [7];
const selected = numbers || [9];
console.log("array", selected === numbers, selected[0]);
function evaluate(value: number): number { return value && -4; }
console.log("matching", evaluate(0), evaluate(5));
const dictionary = new Map<string, string>();
const missing = dictionary.get("missing");
console.log("native-nullable", missing, typeof missing, missing ?? "native-fallback");
