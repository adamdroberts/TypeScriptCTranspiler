const events: string[] = [];

function* flow(): Generator<string, string, string> {
    events.push("start");
    try {
        events.push("try-before");
        const value = yield "pause";
        events.push("resumed:" + value);
    } finally {
        events.push("finally");
    }
    return "done";
}

const iter = flow();
const first: any = iter.next("ignored");
const done: any = iter.next("answer");
const after: any = iter.next("after");

console.log("steps:", first.done, first.value, done.done, done.value, after.done, after.value);
console.log("events:", events.join("|"));

function* terminalReturn(): Generator<string, string, string> {
    try {
        yield "return-pause";
        return "returned";
    } finally {
        events.push("return-finally");
    }
}

const returned = terminalReturn();
const returnFirst: any = returned.next();
const returnDone: any = returned.next("resume");
console.log("return:", returnFirst.done, returnFirst.value, returnDone.done, returnDone.value, events.join("|"));

function* terminalThrow(): Generator<string, string, string> {
    try {
        yield "throw-pause";
        throw "source-boom";
    } finally {
        events.push("throw-finally");
    }
}

const thrown = terminalThrow();
const throwFirst: any = thrown.next();
try {
    thrown.next("resume");
} catch {
    console.log("throw:", throwFirst.done, throwFirst.value, events.join("|"));
}

function* caughtThrow(): Generator<string, string, string> {
    try {
        yield "catch-pause";
    } catch {
        return "caught";
    }
    return "normal";
}

const caught = caughtThrow();
const caughtFirst: any = caught.next();
const caughtDone: any = caught.throw("handled");
console.log("caught:", caughtFirst.done, caughtFirst.value, caughtDone.done, caughtDone.value);

function* caughtBoundThrow(): Generator<string, string, string> {
    try {
        yield "bound-catch-pause";
    } catch (error) {
        return "bound-caught";
    }
    return "normal";
}

const caughtBound = caughtBoundThrow();
const caughtBoundFirst: any = caughtBound.next();
const caughtBoundDone: any = caughtBound.throw("handled-bound");
console.log("caught-bound:", caughtBoundFirst.done, caughtBoundFirst.value, caughtBoundDone.done, caughtBoundDone.value);

function* caughtUsedBoundThrow(): Generator<string, string, string> {
    try {
        yield "used-catch-pause";
    } catch (error: any) {
        return error;
    }
    return "normal";
}

const caughtUsedBound = caughtUsedBoundThrow();
const caughtUsedBoundFirst: any = caughtUsedBound.next();
const caughtUsedBoundDone: any = caughtUsedBound.throw("handled-used-bound");
console.log("caught-used-bound:", caughtUsedBoundFirst.done, caughtUsedBoundFirst.value, caughtUsedBoundDone.done, caughtUsedBoundDone.value);

function* caughtComposedBoundThrow(): Generator<string, string, string> {
    try {
        yield "composed-catch-pause";
    } catch (error: any) {
        return "caught:" + error;
    }
    return "normal";
}

const caughtComposedBound = caughtComposedBoundThrow();
const caughtComposedBoundFirst: any = caughtComposedBound.next();
const caughtComposedBoundDone: any = caughtComposedBound.throw("handled-composed-bound");
console.log("caught-composed-bound:", caughtComposedBoundFirst.done, caughtComposedBoundFirst.value, caughtComposedBoundDone.done, caughtComposedBoundDone.value);

const caughtFinallyEvents: string[] = [];
function* caughtFinallyThrow(): Generator<string, string, string> {
    try {
        yield "catch-finally-pause";
    } catch (error: any) {
        return "finally-caught:" + error;
    } finally {
        caughtFinallyEvents.push("finally");
    }
    return "normal";
}

const caughtFinally = caughtFinallyThrow();
const caughtFinallyFirst: any = caughtFinally.next();
const caughtFinallyDone: any = caughtFinally.throw("handled-finally");
console.log("caught-finally:", caughtFinallyFirst.done, caughtFinallyFirst.value, caughtFinallyDone.done, caughtFinallyDone.value, caughtFinallyEvents.join("|"));

const caughtFinallyNormal = caughtFinallyThrow();
const caughtFinallyNormalFirst: any = caughtFinallyNormal.next();
const caughtFinallyNormalDone: any = caughtFinallyNormal.next("resume");
console.log("caught-finally-normal:", caughtFinallyNormalFirst.done, caughtFinallyNormalFirst.value, caughtFinallyNormalDone.done, caughtFinallyNormalDone.value, caughtFinallyEvents.join("|"));

function* caughtFinallyOverride(): Generator<string, string, string> {
    try {
        yield "override-pause";
    } catch {
        return "caught";
    } finally {
        caughtFinallyEvents.push("override-finally");
        throw "finally-override";
    }
}

const caughtFinallyOverrideThrow = caughtFinallyOverride();
const caughtFinallyOverrideThrowFirst: any = caughtFinallyOverrideThrow.next();
try {
    caughtFinallyOverrideThrow.throw("handled-override");
} catch (error: any) {
    console.log("caught-finally-throw-override:", caughtFinallyOverrideThrowFirst.done, caughtFinallyOverrideThrowFirst.value, error, caughtFinallyEvents.join("|"));
}

const caughtFinallyOverrideNormal = caughtFinallyOverride();
const caughtFinallyOverrideNormalFirst: any = caughtFinallyOverrideNormal.next();
try {
    caughtFinallyOverrideNormal.next("resume");
} catch (error: any) {
    console.log("caught-finally-normal-override:", caughtFinallyOverrideNormalFirst.done, caughtFinallyOverrideNormalFirst.value, error, caughtFinallyEvents.join("|"));
}

function* caughtFinallyReturnOverride(): Generator<string, string, string> {
    try {
        yield "return-override-pause";
    } catch {
        return "caught";
    } finally {
        caughtFinallyEvents.push("return-override-finally");
        return "finally-return";
    }
}

const caughtFinallyReturnOverrideThrow = caughtFinallyReturnOverride();
const caughtFinallyReturnOverrideThrowFirst: any = caughtFinallyReturnOverrideThrow.next();
const caughtFinallyReturnOverrideThrowDone: any = caughtFinallyReturnOverrideThrow.throw("handled-return-override");
console.log("caught-finally-return-override:", caughtFinallyReturnOverrideThrowFirst.done, caughtFinallyReturnOverrideThrowFirst.value, caughtFinallyReturnOverrideThrowDone.done, caughtFinallyReturnOverrideThrowDone.value, caughtFinallyEvents.join("|"));

const caughtFinallyReturnOverrideNormal = caughtFinallyReturnOverride();
const caughtFinallyReturnOverrideNormalFirst: any = caughtFinallyReturnOverrideNormal.next();
const caughtFinallyReturnOverrideNormalDone: any = caughtFinallyReturnOverrideNormal.next("resume");
console.log("caught-finally-normal-return-override:", caughtFinallyReturnOverrideNormalFirst.done, caughtFinallyReturnOverrideNormalFirst.value, caughtFinallyReturnOverrideNormalDone.done, caughtFinallyReturnOverrideNormalDone.value, caughtFinallyEvents.join("|"));

const catchPreludeEvents: string[] = [];
function* caughtPrelude(): Generator<string, string, string> {
    try {
        yield "catch-prelude-pause";
    } catch (error: any) {
        catchPreludeEvents.push("before");
        catchPreludeEvents.push("error:" + error);
        return "prelude-caught";
    }
    return "normal";
}

const caughtPreludeResult = caughtPrelude();
const caughtPreludeFirst: any = caughtPreludeResult.next();
const caughtPreludeDone: any = caughtPreludeResult.throw("handled-prelude");
console.log("caught-prelude:", caughtPreludeFirst.done, caughtPreludeFirst.value, caughtPreludeDone.done, caughtPreludeDone.value, catchPreludeEvents.join("|"));

function* caughtPreludeAlias(): Generator<string, string, string> {
    try {
        yield "catch-alias-pause";
    } catch (error: any) {
        const prefix = "alias:";
        return prefix + error;
    }
    return "normal";
}

const caughtPreludeAliasResult = caughtPreludeAlias();
const caughtPreludeAliasFirst: any = caughtPreludeAliasResult.next();
const caughtPreludeAliasDone: any = caughtPreludeAliasResult.throw("handled-alias");
console.log("caught-prelude-alias:", caughtPreludeAliasFirst.done, caughtPreludeAliasFirst.value, caughtPreludeAliasDone.done, caughtPreludeAliasDone.value);

function* caughtRethrow(): Generator<string, string, string> {
    try {
        yield "rethrow-pause";
    } catch (error: any) {
        catchPreludeEvents.push("rethrow:" + error);
        throw "catch-rethrow";
    } finally {
        catchPreludeEvents.push("rethrow-finally");
    }
    return "normal";
}

const caughtRethrowResult = caughtRethrow();
const caughtRethrowFirst: any = caughtRethrowResult.next();
try {
    caughtRethrowResult.throw("original-rethrow");
} catch (error: any) {
    console.log("caught-rethrow:", caughtRethrowFirst.done, caughtRethrowFirst.value, error, catchPreludeEvents.join("|"));
}

function* caughtDirectRethrow(): Generator<string, string, string> {
    try {
        yield "direct-rethrow-pause";
    } catch (error: any) {
        throw error;
    }
    return "normal";
}

const caughtDirectRethrowResult = caughtDirectRethrow();
const caughtDirectRethrowFirst: any = caughtDirectRethrowResult.next();
try {
    caughtDirectRethrowResult.throw("original-direct-rethrow");
} catch (error: any) {
    console.log("caught-direct-rethrow:", caughtDirectRethrowFirst.done, caughtDirectRethrowFirst.value, error);
}

function* caughtDirectRethrowFinally(): Generator<string, string, string> {
    try {
        yield "direct-rethrow-finally-pause";
    } catch (error: any) {
        throw error;
    } finally {
        catchPreludeEvents.push("direct-rethrow-finally");
    }
    return "normal";
}

const caughtDirectRethrowFinallyResult = caughtDirectRethrowFinally();
const caughtDirectRethrowFinallyFirst: any = caughtDirectRethrowFinallyResult.next();
try {
    caughtDirectRethrowFinallyResult.throw("original-direct-rethrow-finally");
} catch (error: any) {
    console.log("caught-direct-rethrow-finally:", caughtDirectRethrowFinallyFirst.done, caughtDirectRethrowFinallyFirst.value, error, catchPreludeEvents.join("|"));
}

function* caughtComposedRethrow(): Generator<string, string, string> {
    try {
        yield "composed-rethrow-pause";
    } catch (error: any) {
        throw "recovered:" + error;
    } finally {
        catchPreludeEvents.push("composed-rethrow-finally");
    }
    return "normal";
}

const caughtComposedRethrowResult = caughtComposedRethrow();
const caughtComposedRethrowFirst: any = caughtComposedRethrowResult.next();
try {
    caughtComposedRethrowResult.throw("original-composed-rethrow");
} catch (error: any) {
    console.log("caught-composed-rethrow:", caughtComposedRethrowFirst.done, caughtComposedRethrowFirst.value, error, catchPreludeEvents.join("|"));
}

function* caughtConditional(): Generator<string, string, string> {
    try {
        yield "conditional-catch-pause";
    } catch (error: any) {
        if (error === "special") return "special-recovered";
        else return "fallback-recovered";
    }
    return "normal";
}

const caughtConditionalSpecial = caughtConditional();
const caughtConditionalSpecialFirst: any = caughtConditionalSpecial.next();
const caughtConditionalSpecialDone: any = caughtConditionalSpecial.throw("special");
console.log("caught-conditional-special:", caughtConditionalSpecialFirst.done, caughtConditionalSpecialFirst.value, caughtConditionalSpecialDone.done, caughtConditionalSpecialDone.value);

const caughtConditionalFallback = caughtConditional();
const caughtConditionalFallbackFirst: any = caughtConditionalFallback.next();
const caughtConditionalFallbackDone: any = caughtConditionalFallback.throw("other");
console.log("caught-conditional-fallback:", caughtConditionalFallbackFirst.done, caughtConditionalFallbackFirst.value, caughtConditionalFallbackDone.done, caughtConditionalFallbackDone.value);

function* caughtConditionalFinally(): Generator<string, string, string> {
    try {
        yield "conditional-finally-pause";
    } catch (error: any) {
        if (error === "special") return "special-finally-recovered";
        else return "fallback-finally-recovered";
    } finally {
        catchPreludeEvents.push("conditional-finally");
    }
    return "normal";
}

const caughtConditionalFinallyResult = caughtConditionalFinally();
const caughtConditionalFinallyFirst: any = caughtConditionalFinallyResult.next();
const caughtConditionalFinallyDone: any = caughtConditionalFinallyResult.throw("special");
console.log("caught-conditional-finally:", caughtConditionalFinallyFirst.done, caughtConditionalFinallyFirst.value, caughtConditionalFinallyDone.done, caughtConditionalFinallyDone.value, catchPreludeEvents.join("|"));

function* caughtConditionalFinallyThrow(): Generator<string, string, string> {
    try {
        yield "conditional-finally-throw-pause";
    } catch (error: any) {
        if (error === "special") throw "special-finally-throw";
        else throw "fallback-finally-throw";
    } finally {
        catchPreludeEvents.push("conditional-finally-throw");
    }
    return "normal";
}

const caughtConditionalFinallyThrowResult = caughtConditionalFinallyThrow();
const caughtConditionalFinallyThrowFirst: any = caughtConditionalFinallyThrowResult.next();
try {
    caughtConditionalFinallyThrowResult.throw("special");
} catch (error: any) {
    console.log("caught-conditional-finally-throw:", caughtConditionalFinallyThrowFirst.done, caughtConditionalFinallyThrowFirst.value, error, catchPreludeEvents.join("|"));
}

function* caughtConditionalFinallyMixed(): Generator<string, string, string> {
    try {
        yield "conditional-finally-mixed-pause";
    } catch (error: any) {
        if (error === "special") return "special-mixed-recovered";
        else throw "fallback-mixed-throw";
    } finally {
        catchPreludeEvents.push("conditional-finally-mixed");
    }
    return "normal";
}

const caughtConditionalFinallyMixedSpecial = caughtConditionalFinallyMixed();
const caughtConditionalFinallyMixedSpecialFirst: any = caughtConditionalFinallyMixedSpecial.next();
const caughtConditionalFinallyMixedSpecialDone: any = caughtConditionalFinallyMixedSpecial.throw("special");
console.log("caught-conditional-finally-mixed-special:", caughtConditionalFinallyMixedSpecialFirst.done, caughtConditionalFinallyMixedSpecialFirst.value, caughtConditionalFinallyMixedSpecialDone.done, caughtConditionalFinallyMixedSpecialDone.value, catchPreludeEvents.join("|"));

const caughtConditionalFinallyMixedFallback = caughtConditionalFinallyMixed();
const caughtConditionalFinallyMixedFallbackFirst: any = caughtConditionalFinallyMixedFallback.next();
try {
    caughtConditionalFinallyMixedFallback.throw("other");
} catch (error: any) {
    console.log("caught-conditional-finally-mixed-fallback:", caughtConditionalFinallyMixedFallbackFirst.done, caughtConditionalFinallyMixedFallbackFirst.value, error, catchPreludeEvents.join("|"));
}
