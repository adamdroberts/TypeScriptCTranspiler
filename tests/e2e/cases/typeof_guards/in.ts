function describeNullable(value: string | null): string {
    if (typeof value === "string") {
        return "string:" + value.length + ":" + value;
    }
    return "not-string";
}

function describeOptional(value: string | undefined): string {
    if (typeof value === "undefined") {
        return "missing";
    }
    return "present:" + value;
}

function describeNegated(value: string | null): string {
    if (typeof value !== "string") {
        return "negated:nullish";
    }
    return "negated:" + value.toUpperCase();
}

let calls = 0;

function maybeText(): string | null {
    calls++;
    if (calls === 1) return "first";
    return null;
}

const nullString: string | null = null;
const missingString: string | undefined = undefined;

console.log(describeNullable("abc"));
console.log(describeNullable(null));
console.log(describeOptional("set"));
console.log(describeOptional(undefined));
console.log(describeNegated("ok"));
console.log(describeNegated(null));
console.log("typeof-null:", typeof nullString);
console.log("typeof-missing:", typeof missingString);
console.log("direct-call:", typeof maybeText(), calls);
console.log("compare-call:", typeof maybeText() === "string", calls);
