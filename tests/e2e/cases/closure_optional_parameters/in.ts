function callGreeter(fn: (name?: string) => string): string {
    return fn() + "|" + fn("Ada");
}

const suffix = "?";
const greet = (name?: string): string => (name ?? "missing") + suffix;
const stored: (name?: string) => string = greet;

function makeJoin(prefix: string): (parts?: string[]) => string {
    return (parts?: string[]) => {
        return prefix + ":" + (parts === undefined ? "none" : parts.join(","));
    };
}

const join = makeJoin("items");
const optionalFn = (fn?: (text: string) => string): string => {
    return fn === undefined ? "plain" : fn("x");
};

function upper(text: string): string {
    return text.toUpperCase();
}

console.log("stored:", stored(), stored("Bob"));
console.log("callback:", callGreeter(greet));
console.log("returned:", join(), join(["a", "b"]));
console.log("function param:", optionalFn(), optionalFn(upper));
