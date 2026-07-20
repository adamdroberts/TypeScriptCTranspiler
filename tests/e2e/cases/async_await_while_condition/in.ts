function laterTrue(): Promise<boolean> {
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(true)));
}

function laterFalse(): Promise<boolean> {
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(false)));
}

function laterNull(): Promise<boolean | null> {
    return new Promise<boolean | null>((resolve) => setImmediate(() => resolve(null)));
}

function laterNullableTrue(): Promise<boolean | null> {
    return new Promise<boolean | null>((resolve) => setImmediate(() => resolve(true)));
}

function laterNullableFalse(): Promise<boolean | null> {
    return new Promise<boolean | null>((resolve) => setImmediate(() => resolve(false)));
}

function laterBodyValue(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

function laterBodyReject(): Promise<string> {
    return new Promise<string>((_resolve, reject) => setImmediate(() => reject("body-rejected")));
}

async function chooseLoopTrue(): Promise<string> {
    while (await laterTrue()) {
        return "loop-yes";
    }
    return "loop-no";
}

async function chooseLoopFalse(): Promise<string> {
    while (await laterFalse()) {
        return "loop-yes";
    }
    return "loop-no";
}

async function chooseLoopExpression(flag: boolean, prefix: string): Promise<string> {
    while (await (flag ? laterTrue() : laterFalse())) {
        prefix += "-yes";
        return prefix;
    }
    return prefix + "-no";
}

async function chooseLoopMultipleExpressions(flag: boolean, prefix: string): Promise<string> {
    while (await (flag ? laterTrue() : laterFalse())) {
        prefix += "-first";
        prefix += "-second";
        return prefix;
    }
    return prefix + "-no";
}

async function chooseLoopMultipleExpressionsLocal(flag: boolean, prefix: string): Promise<string> {
    while (await (flag ? laterTrue() : laterFalse())) {
        prefix += "-first";
        const result = prefix + "-local";
        return result;
    }
    return prefix + "-no";
}

async function chooseLoopIf(flag: boolean, prefix: string): Promise<string> {
    while (await laterTrue()) {
        if (flag) return prefix + "-if-yes";
        return prefix + "-if-no";
    }
    return prefix + "-outer-no";
}

async function chooseLoopIfElse(flag: boolean, prefix: string): Promise<string> {
    while (await laterTrue()) {
        if (flag) {
            prefix += "-then";
            return prefix;
        } else {
            prefix += "-else";
            return prefix;
        }
    }
    return prefix + "-outer-no";
}

async function chooseLoopReturnAwait(condition: boolean, body: boolean): Promise<string> {
    while (await (condition ? laterTrue() : laterFalse())) {
        return await laterBodyValue(body ? "body-await-yes" : "body-await-no");
    }
    return "body-await-fallthrough";
}

async function chooseLoopReturnAwaitReject(): Promise<string> {
    while (await laterTrue()) {
        return await laterBodyReject();
    }
    return "body-await-reject-fallthrough";
}

async function chooseLoopReturnAwaitLogical(flag: boolean): Promise<string> {
    while (await laterTrue() && flag) {
        return await laterBodyValue("body-await-logical");
    }
    return "body-await-logical-fallthrough";
}

async function chooseLoopReturnAwaitNullish(flag: boolean): Promise<string> {
    while ((await laterNull()) ?? flag) {
        return await laterBodyValue("body-await-nullish");
    }
    return "body-await-nullish-fallthrough";
}

async function chooseLoopReturnAwaitPrelude(condition: boolean, prefix: string): Promise<string> {
    while (await (condition ? laterTrue() : laterFalse())) {
        prefix += "-prelude";
        return await laterBodyValue(prefix);
    }
    return prefix + "-fallthrough";
}

async function chooseForIf(flag: boolean): Promise<string> {
    for (; await laterTrue();) {
        if (flag) return "for-if-yes";
        return "for-if-no";
    }
    return "for-outer-no";
}

async function chooseLoopLocal(flag: boolean, prefix: string): Promise<string> {
    while (await (flag ? laterTrue() : laterFalse())) {
        const result = prefix + "-local-yes";
        return result;
    }
    return prefix + "-local-no";
}

async function chooseForCondition(flag: boolean): Promise<string> {
    for (; await (flag ? laterTrue() : laterFalse());) {
        return flag ? "for-yes" : "for-unexpected";
    }
    return "for-no";
}

async function chooseLoopLogical(flag: boolean): Promise<string> {
    while (await laterTrue() && flag) {
        return "logical-yes";
    }
    return "logical-no";
}

async function chooseLoopConditional(flag: boolean): Promise<string> {
    while (flag ? await laterTrue() : false) {
        return "conditional-yes";
    }
    return "conditional-no";
}

async function chooseLoopTwoLogical(flag: boolean): Promise<string> {
    while (await laterTrue() && await (flag ? laterTrue() : laterFalse())) {
        return "two-logical-yes";
    }
    return "two-logical-no";
}

async function chooseLoopThreeLogical(flag: boolean): Promise<string> {
    while (await laterTrue() && await laterTrue() && await (flag ? laterTrue() : laterFalse())) {
        return "three-logical-yes";
    }
    return "three-logical-no";
}

async function chooseLoopFourLogical(flag: boolean): Promise<string> {
    while (
        await laterTrue() &&
        await laterTrue() &&
        await laterTrue() &&
        await (flag ? laterTrue() : laterFalse())
    ) {
        return "four-logical-yes";
    }
    return "four-logical-no";
}

async function chooseLoopFiveLogical(flag: boolean): Promise<string> {
    while (
        await laterTrue() &&
        await laterTrue() &&
        await laterTrue() &&
        await laterTrue() &&
        await (flag ? laterTrue() : laterFalse())
    ) {
        return "five-logical-yes";
    }
    return "five-logical-no";
}

async function chooseLoopSixLogical(flag: boolean): Promise<string> {
    while (
        await laterTrue() &&
        await laterTrue() &&
        await laterTrue() &&
        await laterTrue() &&
        await laterTrue() &&
        await (flag ? laterTrue() : laterFalse())
    ) {
        return "six-logical-yes";
    }
    return "six-logical-no";
}

async function chooseLoopOr(flag: boolean): Promise<string> {
    while (await laterFalse() || await (flag ? laterTrue() : laterFalse())) {
        return "or-yes";
    }
    return "or-no";
}

async function chooseLoopNullish(flag: boolean): Promise<string> {
    while ((await (flag ? laterTrue() : laterFalse())) ?? false) {
        return "nullish-yes";
    }
    return "nullish-no";
}

async function chooseLoopNullableNullish(flag: boolean): Promise<string> {
    while ((await laterNull()) ?? await (flag ? laterNullableTrue() : laterNullableFalse())) {
        return "nullable-nullish-yes";
    }
    return "nullable-nullish-no";
}

class LoopChooser {
    private readonly prefix: string;

    constructor(prefix: string) {
        this.prefix = prefix;
    }

    async pick(flag: boolean): Promise<string> {
        while (await (flag ? laterTrue() : laterFalse())) {
            return this.prefix + "yes";
        }
        return this.prefix + "no";
    }
}

const chooseLoopValue = async (flag: boolean, prefix: string): Promise<string> => {
    while (await (flag ? laterTrue() : laterFalse())) {
        return prefix + "yes";
    }
    return prefix + "no";
};

chooseLoopTrue().then((value) => console.log("await-while-true", value));
chooseLoopFalse().then((value) => console.log("await-while-false", value));
chooseLoopExpression(true, "expression-loop").then((value) => console.log("await-while-expression-true", value));
chooseLoopExpression(false, "expression-loop").then((value) => console.log("await-while-expression-false", value));
chooseLoopMultipleExpressions(true, "multiple-expression-loop").then((value) => console.log("await-while-multiple-expression-true", value));
chooseLoopMultipleExpressions(false, "multiple-expression-loop").then((value) => console.log("await-while-multiple-expression-false", value));
chooseLoopMultipleExpressionsLocal(true, "multiple-expression-local-loop").then((value) => console.log("await-while-multiple-expression-local-true", value));
chooseLoopMultipleExpressionsLocal(false, "multiple-expression-local-loop").then((value) => console.log("await-while-multiple-expression-local-false", value));
chooseLoopIf(true, "if-loop").then((value) => console.log("await-while-if-true", value));
chooseLoopIf(false, "if-loop").then((value) => console.log("await-while-if-false", value));
chooseLoopIfElse(true, "if-else-loop").then((value) => console.log("await-while-if-else-true", value));
chooseLoopIfElse(false, "if-else-loop").then((value) => console.log("await-while-if-else-false", value));
chooseLoopReturnAwait(true, true).then((value) => console.log("await-while-return-await-true", value));
chooseLoopReturnAwait(true, false).then((value) => console.log("await-while-return-await-false", value));
chooseLoopReturnAwait(false, true).then((value) => console.log("await-while-return-await-fallthrough", value));
chooseLoopReturnAwaitReject().catch((reason) => console.log("await-while-return-await-reject", reason));
chooseLoopReturnAwaitLogical(true).then((value) => console.log("await-while-return-await-logical-true", value));
chooseLoopReturnAwaitLogical(false).then((value) => console.log("await-while-return-await-logical-false", value));
chooseLoopReturnAwaitNullish(true).then((value) => console.log("await-while-return-await-nullish-true", value));
chooseLoopReturnAwaitNullish(false).then((value) => console.log("await-while-return-await-nullish-false", value));
chooseLoopReturnAwaitPrelude(true, "body-await-prelude").then((value) => console.log("await-while-return-await-prelude-true", value));
chooseLoopReturnAwaitPrelude(false, "body-await-prelude").then((value) => console.log("await-while-return-await-prelude-false", value));
chooseForIf(true).then((value) => console.log("await-for-if-true", value));
chooseForIf(false).then((value) => console.log("await-for-if-false", value));
chooseLoopLocal(true, "local-loop").then((value) => console.log("await-while-local-true", value));
chooseLoopLocal(false, "local-loop").then((value) => console.log("await-while-local-false", value));
chooseForCondition(true).then((value) => console.log("await-for-condition-true", value));
chooseForCondition(false).then((value) => console.log("await-for-condition-false", value));
chooseLoopLogical(true).then((value) => console.log("await-while-logical-true", value));
chooseLoopLogical(false).then((value) => console.log("await-while-logical-false", value));
chooseLoopConditional(true).then((value) => console.log("await-while-conditional-true", value));
chooseLoopConditional(false).then((value) => console.log("await-while-conditional-false", value));
chooseLoopTwoLogical(true).then((value) => console.log("await-while-two-logical-true", value));
chooseLoopTwoLogical(false).then((value) => console.log("await-while-two-logical-false", value));
chooseLoopThreeLogical(true).then((value) => console.log("await-while-three-logical-true", value));
chooseLoopThreeLogical(false).then((value) => console.log("await-while-three-logical-false", value));
chooseLoopFourLogical(true).then((value) => console.log("await-while-four-logical-true", value));
chooseLoopFourLogical(false).then((value) => console.log("await-while-four-logical-false", value));
chooseLoopFiveLogical(true).then((value) => console.log("await-while-five-logical-true", value));
chooseLoopFiveLogical(false).then((value) => console.log("await-while-five-logical-false", value));
chooseLoopSixLogical(true).then((value) => console.log("await-while-six-logical-true", value));
chooseLoopSixLogical(false).then((value) => console.log("await-while-six-logical-false", value));
chooseLoopOr(true).then((value) => console.log("await-while-or-true", value));
chooseLoopOr(false).then((value) => console.log("await-while-or-false", value));
chooseLoopNullish(true).then((value) => console.log("await-while-nullish-true", value));
chooseLoopNullish(false).then((value) => console.log("await-while-nullish-false", value));
chooseLoopNullableNullish(true).then((value) => console.log("await-while-nullable-nullish-true", value));
chooseLoopNullableNullish(false).then((value) => console.log("await-while-nullable-nullish-false", value));
new LoopChooser("method-loop-").pick(true).then((value) => console.log("await-while-method-true", value));
new LoopChooser("method-loop-").pick(false).then((value) => console.log("await-while-method-false", value));
chooseLoopValue(true, "value-loop-").then((value) => console.log("await-while-value-true", value));
chooseLoopValue(false, "value-loop-").then((value) => console.log("await-while-value-false", value));
