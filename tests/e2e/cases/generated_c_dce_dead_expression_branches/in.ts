function keptConditional(): string {
    return "kept-conditional";
}

function deadConditional(): string {
    return "dead-conditional";
}

function deadAnd(): string {
    return "dead-and";
}

function deadOr(): string {
    return "dead-or";
}

function keptNullish(): string {
    return "kept-nullish";
}

function deadNullish(): string {
    return "dead-nullish";
}

const fromConditional = true ? keptConditional() : deadConditional();
const fromAnd = false && deadAnd();
const fromOr = true || deadOr();
const fromNullish = (undefined as string | undefined) ?? keptNullish();
const presentValue: string | undefined = "present";
const fromNonNullish = presentValue ?? deadNullish();

console.log(fromConditional, fromAnd, fromOr, fromNullish, fromNonNullish);
