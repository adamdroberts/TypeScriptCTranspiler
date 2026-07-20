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

async function chooseLoopReturnAwaitLocal(condition: boolean, prefix: string): Promise<string> {
    while (await (condition ? laterTrue() : laterFalse())) {
        prefix += "-before-local";
        const bodyPromise = laterBodyValue(prefix);
        return await bodyPromise;
    }
    return prefix + "-local-fallthrough";
}

async function chooseLoopReturnAwaitLocals(condition: boolean, prefix: string): Promise<string> {
    while (await (condition ? laterTrue() : laterFalse())) {
        prefix += "-multi";
        const bodyValue = prefix + "-value";
        const bodyPromise = laterBodyValue(bodyValue + "-promise");
        return await bodyPromise;
    }
    return prefix + "-locals-fallthrough";
}

async function chooseLoopReturnAwaitAssignedLocal(condition: boolean, prefix: string): Promise<string> {
    while (await (condition ? laterTrue() : laterFalse())) {
        let bodyPromise: Promise<string>;
        bodyPromise = laterBodyValue(prefix + "-assigned");
        return await bodyPromise;
    }
    return prefix + "-assigned-fallthrough";
}

async function chooseLoopThrowAwait(condition: boolean): Promise<string> {
    while (await (condition ? laterTrue() : laterFalse())) {
        throw await laterBodyValue("body-throw-await");
    }
    return "body-throw-await-fallthrough";
}

async function chooseLoopReturnAwaitControlPrelude(condition: boolean, flag: boolean, prefix: string): Promise<string> {
    while (await (condition ? laterTrue() : laterFalse())) {
        if (flag) prefix += "-control";
        return await laterBodyValue(prefix);
    }
    return prefix + "-control-fallthrough";
}

async function chooseLoopReturnAwaitControlLocal(condition: boolean, flag: boolean, prefix: string): Promise<string> {
    while (await (condition ? laterTrue() : laterFalse())) {
        if (flag) {
            const suffix = "-branch-local";
            prefix += suffix;
        }
        return await laterBodyValue(prefix);
    }
    return prefix + "-control-local-fallthrough";
}

async function chooseLoopReturnAwaitNested(condition: boolean): Promise<string> {
    while (await (condition ? laterTrue() : laterFalse())) {
        return await (await laterBodyValue("body-await-nested"));
    }
    return "body-await-nested-fallthrough";
}

async function chooseLoopReturnAwaitAlias(condition: boolean, prefix: string): Promise<string> {
    while (await (condition ? laterTrue() : laterFalse())) {
        prefix += "-alias";
        const value = await laterBodyValue(prefix);
        return value;
    }
    return prefix + "-alias-fallthrough";
}

async function chooseLoopThrowAwaitAlias(condition: boolean): Promise<string> {
    while (await (condition ? laterTrue() : laterFalse())) {
        const reason = await laterBodyValue("body-throw-await-alias");
        throw reason;
    }
    return "body-throw-await-alias-fallthrough";
}

async function chooseLoopReturnAwaitAssignedAlias(condition: boolean, prefix: string): Promise<string> {
    while (await (condition ? laterTrue() : laterFalse())) {
        let value: string;
        value = await laterBodyValue(prefix + "-assigned-alias");
        return value;
    }
    return prefix + "-assigned-alias-fallthrough";
}

async function chooseLoopThrowAwaitAssignedAlias(condition: boolean): Promise<string> {
    while (await (condition ? laterTrue() : laterFalse())) {
        let reason: string;
        reason = await laterBodyValue("body-throw-assigned-alias");
        throw reason;
    }
    return "body-throw-assigned-alias-fallthrough";
}

async function chooseLoopReturnAwaitAliasExpression(condition: boolean, prefix: string): Promise<string> {
    while (await (condition ? laterTrue() : laterFalse())) {
        const value = await laterBodyValue(prefix + "-alias-expression");
        return value + "-returned";
    }
    return prefix + "-alias-expression-fallthrough";
}

async function chooseLoopThrowAwaitAliasExpression(condition: boolean): Promise<string> {
    while (await (condition ? laterTrue() : laterFalse())) {
        const reason = await laterBodyValue("body-throw-alias-expression");
        throw reason + "-thrown";
    }
    return "body-throw-alias-expression-fallthrough";
}

async function chooseLoopReturnAwaitAliasPostlude(condition: boolean, prefix: string): Promise<string> {
    while (await (condition ? laterTrue() : laterFalse())) {
        const value = await laterBodyValue(prefix + "-alias-post");
        prefix += "-updated";
        return value + prefix;
    }
    return prefix + "-alias-post-fallthrough";
}

async function chooseLoopThrowAwaitAliasPostlude(condition: boolean): Promise<string> {
    while (await (condition ? laterTrue() : laterFalse())) {
        const reason = await laterBodyValue("body-throw-alias-post");
        throw reason + "-updated";
    }
    return "body-throw-alias-post-fallthrough";
}

async function chooseLoopReturnAwaitAssignedAliasPostlude(condition: boolean, prefix: string): Promise<string> {
    while (await (condition ? laterTrue() : laterFalse())) {
        let value: string;
        value = await laterBodyValue(prefix + "-assigned-post");
        prefix += "-updated";
        return value + prefix;
    }
    return prefix + "-assigned-post-fallthrough";
}

async function chooseLoopThrowAwaitAssignedAliasPostlude(condition: boolean): Promise<string> {
    while (await (condition ? laterTrue() : laterFalse())) {
        let reason: string;
        reason = await laterBodyValue("body-throw-assigned-post");
        throw reason + "-updated";
    }
    return "body-throw-assigned-post-fallthrough";
}

async function chooseLoopReturnAwaitAliasPostLocal(condition: boolean, prefix: string): Promise<string> {
    while (await (condition ? laterTrue() : laterFalse())) {
        const value = await laterBodyValue(prefix + "-post-local");
        const suffix = "-suffix";
        return value + suffix;
    }
    return prefix + "-post-local-fallthrough";
}

async function chooseLoopThrowAwaitAliasPostLocal(condition: boolean): Promise<string> {
    while (await (condition ? laterTrue() : laterFalse())) {
        const reason = await laterBodyValue("body-throw-post-local");
        const suffix = "-suffix";
        throw reason + suffix;
    }
    return "body-throw-post-local-fallthrough";
}

async function chooseLoopReturnAwaitAliasPostMultiple(condition: boolean, prefix: string): Promise<string> {
    while (await (condition ? laterTrue() : laterFalse())) {
        const value = await laterBodyValue(prefix + "-post-multiple");
        prefix += "-updated";
        const suffix = "-suffix";
        return value + prefix + suffix;
    }
    return prefix + "-post-multiple-fallthrough";
}

async function chooseLoopThrowAwaitAliasPostMultiple(condition: boolean): Promise<string> {
    while (await (condition ? laterTrue() : laterFalse())) {
        const reason = await laterBodyValue("body-throw-post-multiple");
        const suffix = "-suffix";
        throw reason + suffix;
    }
    return "body-throw-post-multiple-fallthrough";
}

async function chooseLoopReturnAwaitAliasPostControl(condition: boolean, flag: boolean, prefix: string): Promise<string> {
    while (await (condition ? laterTrue() : laterFalse())) {
        const value = await laterBodyValue(prefix + "-post-control");
        if (flag) prefix += "-updated";
        return value + prefix;
    }
    return prefix + "-post-control-fallthrough";
}

async function chooseLoopThrowAwaitAliasPostControl(condition: boolean, flag: boolean): Promise<string> {
    while (await (condition ? laterTrue() : laterFalse())) {
        let reason = await laterBodyValue("body-throw-post-control");
        if (flag) reason += "-updated";
        throw reason;
    }
    return "body-throw-post-control-fallthrough";
}

async function chooseLoopReturnAwaitAliasPostAssignedLocal(condition: boolean, prefix: string): Promise<string> {
    while (await (condition ? laterTrue() : laterFalse())) {
        const value = await laterBodyValue(prefix + "-post-assigned-local");
        let suffix: string;
        suffix = "-suffix";
        return value + suffix;
    }
    return prefix + "-post-assigned-local-fallthrough";
}

async function chooseLoopThrowAwaitAliasPostAssignedLocal(condition: boolean): Promise<string> {
    while (await (condition ? laterTrue() : laterFalse())) {
        const reason = await laterBodyValue("body-throw-post-assigned-local");
        let suffix: string;
        suffix = "-suffix";
        throw reason + suffix;
    }
    return "body-throw-post-assigned-local-fallthrough";
}

async function chooseLoopReturnAwaitSequence(condition: boolean, prefix: string): Promise<string> {
    while (await (condition ? laterTrue() : laterFalse())) {
        const ignored = await laterBodyValue(prefix + "-sequence");
        prefix += "-updated";
        return prefix;
    }
    return prefix + "-sequence-fallthrough";
}

async function chooseLoopThrowAwaitSequence(condition: boolean): Promise<string> {
    while (await (condition ? laterTrue() : laterFalse())) {
        const ignored = await laterBodyValue("body-throw-sequence");
        throw "body-throw-sequence-thrown";
    }
    return "body-throw-sequence-fallthrough";
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
        return await laterBodyValue(flag ? "for-yes" : "for-unexpected");
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
            return await laterBodyValue(this.prefix + "yes");
        }
        return this.prefix + "no";
    }
}

const chooseLoopValue = async (flag: boolean, prefix: string): Promise<string> => {
    while (await (flag ? laterTrue() : laterFalse())) {
        return await laterBodyValue(prefix + "yes");
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
chooseLoopReturnAwaitLocal(true, "body-await-local").then((value) => console.log("await-while-return-await-local-true", value));
chooseLoopReturnAwaitLocal(false, "body-await-local").then((value) => console.log("await-while-return-await-local-false", value));
chooseLoopReturnAwaitLocals(true, "body-await-locals").then((value) => console.log("await-while-return-await-locals-true", value));
chooseLoopReturnAwaitLocals(false, "body-await-locals").then((value) => console.log("await-while-return-await-locals-false", value));
chooseLoopReturnAwaitAssignedLocal(true, "body-await-assigned").then((value) => console.log("await-while-return-await-assigned-true", value));
chooseLoopReturnAwaitAssignedLocal(false, "body-await-assigned").then((value) => console.log("await-while-return-await-assigned-false", value));
chooseLoopThrowAwait(true).catch((reason) => console.log("await-while-throw-await-true", reason));
chooseLoopThrowAwait(false).then((value) => console.log("await-while-throw-await-false", value));
chooseLoopReturnAwaitControlPrelude(true, true, "body-await-control").then((value) => console.log("await-while-return-await-control-true", value));
chooseLoopReturnAwaitControlPrelude(true, false, "body-await-control").then((value) => console.log("await-while-return-await-control-false", value));
chooseLoopReturnAwaitControlPrelude(false, true, "body-await-control").then((value) => console.log("await-while-return-await-control-fallthrough", value));
chooseLoopReturnAwaitControlLocal(true, true, "body-await-control-local").then((value) => console.log("await-while-return-await-control-local-true", value));
chooseLoopReturnAwaitControlLocal(true, false, "body-await-control-local").then((value) => console.log("await-while-return-await-control-local-false", value));
chooseLoopReturnAwaitNested(true).then((value) => console.log("await-while-return-await-nested-true", value));
chooseLoopReturnAwaitNested(false).then((value) => console.log("await-while-return-await-nested-false", value));
chooseLoopReturnAwaitAlias(true, "body-await-alias").then((value) => console.log("await-while-return-await-alias-true", value));
chooseLoopReturnAwaitAlias(false, "body-await-alias").then((value) => console.log("await-while-return-await-alias-false", value));
chooseLoopThrowAwaitAlias(true).catch((reason) => console.log("await-while-throw-await-alias-true", reason));
chooseLoopThrowAwaitAlias(false).then((value) => console.log("await-while-throw-await-alias-false", value));
chooseLoopReturnAwaitAssignedAlias(true, "body-return").then((value) => console.log("await-while-return-await-assigned-alias-true", value));
chooseLoopReturnAwaitAssignedAlias(false, "body-return").then((value) => console.log("await-while-return-await-assigned-alias-false", value));
chooseLoopThrowAwaitAssignedAlias(true).catch((reason) => console.log("await-while-throw-await-assigned-alias-true", reason));
chooseLoopThrowAwaitAssignedAlias(false).then((value) => console.log("await-while-throw-await-assigned-alias-false", value));
chooseLoopReturnAwaitAliasExpression(true, "body-return").then((value) => console.log("await-while-return-await-alias-expression-true", value));
chooseLoopReturnAwaitAliasExpression(false, "body-return").then((value) => console.log("await-while-return-await-alias-expression-false", value));
chooseLoopThrowAwaitAliasExpression(true).catch((reason) => console.log("await-while-throw-await-alias-expression-true", reason));
chooseLoopThrowAwaitAliasExpression(false).then((value) => console.log("await-while-throw-await-alias-expression-false", value));
chooseLoopReturnAwaitAliasPostlude(true, "body-return").then((value) => console.log("await-while-return-await-alias-postlude-true", value));
chooseLoopReturnAwaitAliasPostlude(false, "body-return").then((value) => console.log("await-while-return-await-alias-postlude-false", value));
chooseLoopThrowAwaitAliasPostlude(true).catch((reason) => console.log("await-while-throw-await-alias-postlude-true", reason));
chooseLoopThrowAwaitAliasPostlude(false).then((value) => console.log("await-while-throw-await-alias-postlude-false", value));
chooseLoopReturnAwaitAssignedAliasPostlude(true, "body-return").then((value) => console.log("await-while-return-await-assigned-alias-postlude-true", value));
chooseLoopReturnAwaitAssignedAliasPostlude(false, "body-return").then((value) => console.log("await-while-return-await-assigned-alias-postlude-false", value));
chooseLoopThrowAwaitAssignedAliasPostlude(true).catch((reason) => console.log("await-while-throw-await-assigned-alias-postlude-true", reason));
chooseLoopThrowAwaitAssignedAliasPostlude(false).then((value) => console.log("await-while-throw-await-assigned-alias-postlude-false", value));
chooseLoopReturnAwaitAliasPostLocal(true, "body-return").then((value) => console.log("await-while-return-await-alias-post-local-true", value));
chooseLoopReturnAwaitAliasPostLocal(false, "body-return").then((value) => console.log("await-while-return-await-alias-post-local-false", value));
chooseLoopThrowAwaitAliasPostLocal(true).catch((reason) => console.log("await-while-throw-await-alias-post-local-true", reason));
chooseLoopThrowAwaitAliasPostLocal(false).then((value) => console.log("await-while-throw-await-alias-post-local-false", value));
chooseLoopReturnAwaitAliasPostMultiple(true, "body-return").then((value) => console.log("await-while-return-await-alias-post-multiple-true", value));
chooseLoopReturnAwaitAliasPostMultiple(false, "body-return").then((value) => console.log("await-while-return-await-alias-post-multiple-false", value));
chooseLoopThrowAwaitAliasPostMultiple(true).catch((reason) => console.log("await-while-throw-await-alias-post-multiple-true", reason));
chooseLoopThrowAwaitAliasPostMultiple(false).then((value) => console.log("await-while-throw-await-alias-post-multiple-false", value));
chooseLoopReturnAwaitAliasPostControl(true, true, "body-return").then((value) => console.log("await-while-return-await-alias-post-control-true", value));
chooseLoopReturnAwaitAliasPostControl(true, false, "body-return").then((value) => console.log("await-while-return-await-alias-post-control-false", value));
chooseLoopReturnAwaitAliasPostControl(false, true, "body-return").then((value) => console.log("await-while-return-await-alias-post-control-fallthrough", value));
chooseLoopThrowAwaitAliasPostControl(true, true).catch((reason) => console.log("await-while-throw-await-alias-post-control-true", reason));
chooseLoopThrowAwaitAliasPostControl(true, false).catch((reason) => console.log("await-while-throw-await-alias-post-control-false", reason));
chooseLoopThrowAwaitAliasPostControl(false, true).then((value) => console.log("await-while-throw-await-alias-post-control-fallthrough", value));
chooseLoopReturnAwaitAliasPostAssignedLocal(true, "body-return").then((value) => console.log("await-while-return-await-alias-post-assigned-local-true", value));
chooseLoopReturnAwaitAliasPostAssignedLocal(false, "body-return").then((value) => console.log("await-while-return-await-alias-post-assigned-local-false", value));
chooseLoopThrowAwaitAliasPostAssignedLocal(true).catch((reason) => console.log("await-while-throw-await-alias-post-assigned-local-true", reason));
chooseLoopThrowAwaitAliasPostAssignedLocal(false).then((value) => console.log("await-while-throw-await-alias-post-assigned-local-false", value));
chooseLoopReturnAwaitSequence(true, "body-return").then((value) => console.log("await-while-return-await-sequence-true", value));
chooseLoopReturnAwaitSequence(false, "body-return").then((value) => console.log("await-while-return-await-sequence-false", value));
chooseLoopThrowAwaitSequence(true).catch((reason) => console.log("await-while-throw-await-sequence-true", reason));
chooseLoopThrowAwaitSequence(false).then((value) => console.log("await-while-throw-await-sequence-false", value));
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
