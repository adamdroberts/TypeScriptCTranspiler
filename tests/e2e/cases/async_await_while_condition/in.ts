function laterTrue(): Promise<boolean> {
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(true)));
}

function laterFalse(): Promise<boolean> {
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(false)));
}

function laterCondition(value: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(value)));
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

async function chooseDirectAwaitMultipleLocals(prefix: string): Promise<string> {
    const source = prefix + "-source", value = await laterBodyValue(source);
    return value;
}

async function chooseDirectAwaitMultipleControlPrelude(prefix: string): Promise<string> {
    if (prefix.length > 0) prefix += "-if";
    try {
        prefix += "-try";
    } finally {
        prefix += "-finally";
    }
    const first = await laterBodyValue(prefix + "-first"), second = await laterBodyValue(first + "-second");
    return second;
}

async function chooseDirectAwaitMultipleVarPrelude(prefix: string): Promise<string> {
    var source = prefix + "-var";
    const first = await laterBodyValue(source + "-first"), second = await laterBodyValue(first + "-second");
    return second;
}

async function chooseDirectAwaitAssignedVarReturn(prefix: string): Promise<string> {
    var source: string;
    source = prefix + "-assigned-var-return";
    return await laterBodyValue(source);
}

class AssignedVarReturnChooser {
    async choose(prefix: string): Promise<string> {
        var source: string;
        source = prefix + "-assigned-var-method-return";
        return await laterBodyValue(source);
    }
}

const chooseArrowAssignedVarReturn = async (prefix: string): Promise<string> => {
    var source: string;
    source = prefix + "-assigned-var-arrow-return";
    return await laterBodyValue(source);
};

async function chooseDirectAwaitAssignedMultipleLocals(prefix: string): Promise<string> {
    let source = prefix + "-assigned-source", value: string;
    value = await laterBodyValue(source);
    return value;
}

async function chooseDirectThrowAwaitMultipleLocals(prefix: string): Promise<string> {
    const source = prefix + "-throw-source", reason = await laterBodyValue(source);
    throw reason;
}

async function chooseMultipleAwaitDeclarators(prefix: string): Promise<string> {
    const first = await laterBodyValue(prefix + "-first"), second = await laterBodyValue(first + "-second");
    return second;
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

async function chooseLoopInitializerCapture(): Promise<string> {
    for (let value = "loop-captured"; await laterTrue();) {
        return await laterBodyValue(value);
    }
    return "loop-capture-fallthrough";
}

async function chooseLoopInitializerCaptureThrow(): Promise<string> {
    for (let reason = "loop-captured-throw"; await laterTrue();) {
        throw await laterBodyValue(reason);
    }
    return "loop-capture-throw-fallthrough";
}

async function chooseLoopInitializerMultipleCapture(): Promise<string> {
    for (let prefix = "loop-", value = prefix + "multiple-captured"; await laterTrue();) {
        value += "-updated";
        return await laterBodyValue(value);
    }
    return "loop-capture-multiple-fallthrough";
}

async function chooseLoopInitializerConditionCapture(): Promise<string> {
    for (let value = "loop-condition-captured"; await laterCondition(value.length > 0);) {
        value += "-updated";
        return await laterBodyValue(value);
    }
    return "loop-capture-condition-fallthrough";
}

async function chooseLoopInitializerVarCapture(): Promise<string> {
    for (var value = "loop-var-captured"; await laterCondition(value.length > 0);) {
        value += "-updated";
        return await laterBodyValue(value);
    }
    return "loop-var-capture-fallthrough";
}

async function chooseLoopInitializerVarFallthroughCapture(): Promise<string> {
    for (var value = "loop-var-fallthrough"; await laterFalse();) {
        return await laterBodyValue(value);
    }
    return value + "-after";
}

async function chooseLoopInitializerEscapingVarBreak(): Promise<string> {
    for (var value = "loop-escaping-var"; await laterTrue();) {
        value += "-updated";
        break;
    }
    return value;
}

async function chooseLoopInitializerEscapingVarMultipleBreak(): Promise<string> {
    for (var value = "loop-escaping-var-multiple"; await laterTrue();) {
        value += "-first";
        value += "-second";
        break;
    }
    return value;
}

async function chooseLoopInitializerEscapingVarBreakAwait(): Promise<string> {
    for (var value = "loop-escaping-var-await"; await laterTrue();) {
        value += "-updated";
        break;
    }
    return await laterBodyValue(value);
}

async function chooseLoopInitializerEscapingVarBreakThrowAwait(): Promise<string> {
    for (var reason = "loop-escaping-var-throw-await"; await laterTrue();) {
        reason += "-updated";
        break;
    }
    throw await laterBodyValue(reason);
}

async function chooseLoopInitializerEscapingVarFalseBreakAwait(): Promise<string> {
    for (var value = "loop-escaping-var-false-await"; await laterFalse();) {
        value += "-unexpected";
        break;
    }
    return await laterBodyValue(value);
}

async function chooseLoopInitializerEscapingVarFalseBreakThrowAwait(): Promise<string> {
    for (var reason = "loop-escaping-var-false-throw-await"; await laterFalse();) {
        reason += "-unexpected";
        break;
    }
    throw await laterBodyValue(reason);
}

class EscapingVarLoopChooser {
    private readonly prefix: string;

    constructor(prefix: string) {
        this.prefix = prefix;
    }

    async choose(): Promise<string> {
        for (var value = this.prefix + "loop-escaping-var"; await laterTrue();) {
            value += "-updated";
            break;
        }
        return await laterBodyValue(this.prefix + value);
    }

    static async chooseStatic(): Promise<string> {
        for (var value = "loop-static-escaping-var"; await laterTrue();) {
            value += "-updated";
            break;
        }
        return await laterBodyValue(value);
    }
}

const chooseEscapingVarLoopValue = async (): Promise<string> => {
    for (var value = "loop-value-escaping-var"; await laterFalse();) {
        value += "-unexpected";
        break;
    }
    return await laterBodyValue(value);
};

const escapingVarLoopObject = {
    async choose(): Promise<string> {
        for (var value = "loop-object-escaping-var"; await laterTrue();) {
            value += "-updated";
            break;
        }
        return await laterBodyValue(value);
    },
};

async function chooseLoopInitializerUninitializedEscapingVarBreakAwait(): Promise<string> {
    for (var value: any; await laterTrue();) {
        value = "loop-uninitialized-escaping-var";
        break;
    }
    return await laterBodyValue(value);
}

async function chooseLoopInitializerUninitializedEscapingVarFalseAwait(): Promise<string> {
    for (var value: any; await laterFalse();) {
        value = "loop-uninitialized-escaping-var-unexpected";
        break;
    }
    return await laterBodyValue(value);
}

async function chooseLoopInitializerUninitializedEscapingVarBreakThrowAwait(): Promise<string> {
    for (var reason: any; await laterTrue();) {
        reason = "loop-uninitialized-escaping-var-throw";
        break;
    }
    throw await laterBodyValue(reason);
}

async function chooseLoopInitializerUninitializedEscapingVarFalseThrowAwait(): Promise<string> {
    for (var reason: any; await laterFalse();) {
        reason = "loop-uninitialized-escaping-var-false-throw-unexpected";
        break;
    }
    throw await laterBodyValue(reason);
}

async function chooseLoopInitializerEscapingVarIfBreakAwait(flag: boolean): Promise<string> {
    for (var value = "loop-escaping-var-if"; await laterTrue();) {
        if (flag) value += "-yes";
        else value += "-no";
        break;
    }
    return await laterBodyValue(value);
}

async function chooseLoopInitializerEscapingVarTryFinallyBreakAwait(): Promise<string> {
    for (var value = "loop-escaping-var-try"; await laterTrue();) {
        try {
            value += "-try";
        } finally {
            value += "-finally";
        }
        break;
    }
    return await laterBodyValue(value);
}

async function chooseLoopInitializerEscapingVarSwitchBreakAwait(flag: boolean): Promise<string> {
    for (var value = "loop-escaping-var-switch"; await laterTrue();) {
        switch (flag) {
            case true:
                value += "-yes";
                break;
            default:
                value += "-no";
                break;
        }
        break;
    }
    return await laterBodyValue(value);
}

async function chooseLoopInitializerEscapingVarNestedWhileBreakAwait(repeat: boolean): Promise<string> {
    for (var value = "loop-escaping-var-nested-while"; await laterTrue();) {
        while (repeat) {
            value += "-nested";
            repeat = false;
        }
        break;
    }
    return await laterBodyValue(value);
}

async function chooseLoopInitializerEscapingVarNestedDoBreakAwait(repeat: boolean): Promise<string> {
    for (var value = "loop-escaping-var-nested-do"; await laterTrue();) {
        do {
            value += "-nested";
            repeat = false;
        } while (repeat);
        break;
    }
    return await laterBodyValue(value);
}

async function chooseLoopInitializerEscapingVarTryCatchBreakAwait(shouldThrow: boolean): Promise<string> {
    for (var value = "loop-escaping-var-catch"; await laterTrue();) {
        try {
            if (shouldThrow) throw "catch";
            value += "-try";
        } catch (reason) {
            value += "-" + reason;
        }
        break;
    }
    return await laterBodyValue(value);
}

async function chooseLoopInitializerEscapingVarTryCatchFinallyBreakAwait(shouldThrow: boolean): Promise<string> {
    for (var value = "loop-escaping-var-catch-finally"; await laterTrue();) {
        try {
            if (shouldThrow) throw "catch";
            value += "-try";
        } catch (reason) {
            value += "-" + reason;
        } finally {
            value += "-finally";
        }
        break;
    }
    return await laterBodyValue(value);
}

async function chooseLoopInitializerEscapingVarNestedForOfBreakAwait(): Promise<string> {
    for (var value = "loop-escaping-var-nested-for-of"; await laterTrue();) {
        for (const item of ["first", "second"]) {
            value += "-" + item;
        }
        break;
    }
    return await laterBodyValue(value);
}

async function chooseLoopInitializerEscapingVarNestedForInBreakAwait(): Promise<string> {
    for (var value = "loop-escaping-var-nested-for-in"; await laterTrue();) {
        for (const key in { first: 1, second: 2 }) {
            value += "-" + key;
        }
        break;
    }
    return await laterBodyValue(value);
}

async function chooseLoopInitializerEscapingVarNestedForBreakAwait(): Promise<string> {
    for (var value = "loop-escaping-var-nested-for"; await laterTrue();) {
        for (let index = 0; index < 2; index++) {
            value += "-" + index;
        }
        break;
    }
    return await laterBodyValue(value);
}

async function chooseLoopInitializerEscapingVarNestedForOfControlBreakAwait(): Promise<string> {
    for (var value = "loop-escaping-var-nested-for-of-control"; await laterTrue();) {
        for (const item of ["skip", "keep"]) {
            if (item === "skip") continue;
            value += "-" + item;
            break;
        }
        break;
    }
    return await laterBodyValue(value);
}

async function chooseLoopInitializerEscapingVarNestedForInControlBreakAwait(): Promise<string> {
    for (var value = "loop-escaping-var-nested-for-in-control"; await laterTrue();) {
        for (const key in { skip: 1, keep: 2 }) {
            if (key === "skip") continue;
            value += "-" + key;
            break;
        }
        break;
    }
    return await laterBodyValue(value);
}

async function chooseLoopInitializerEscapingVarContinueAwait(): Promise<string> {
    for (var count = 1, value = "loop-escaping-var-continue"; await laterCondition(count-- > 0); value += "-increment") {
        value += "-continued";
        continue;
    }
    return await laterBodyValue(value);
}

async function chooseLoopInitializerEscapingVarContinueThrowAwait(): Promise<string> {
    for (var count = 1, reason = "loop-escaping-var-continue-throw"; await laterCondition(count-- > 0); reason += "-increment") {
        reason += "-continued";
        continue;
    }
    throw await laterBodyValue(reason);
}

async function chooseLoopInitializerEscapingVarContinueFalseAwait(): Promise<string> {
    for (var count = 0, value = "loop-escaping-var-continue-false"; await laterCondition(count > 0); value += "-increment") {
        value += "-body";
        continue;
    }
    return await laterBodyValue(value);
}

async function chooseLoopInitializerEscapingVarContinueFalseThrowAwait(): Promise<string> {
    for (var count = 0, reason = "loop-escaping-var-continue-false-throw"; await laterCondition(count > 0); reason += "-increment") {
        reason += "-body";
        continue;
    }
    throw await laterBodyValue(reason);
}

async function chooseLoopExpressionInitializerContinueAwait(value: string): Promise<string> {
    for (value += "-initializer"; await laterCondition(value.endsWith("-initializer")); value += "-increment") {
        value += "-body";
        continue;
    }
    return await laterBodyValue(value);
}

async function chooseLoopExpressionInitializerContinueThrowAwait(reason: string): Promise<string> {
    for (reason += "-initializer"; await laterCondition(reason.endsWith("-initializer")); reason += "-increment") {
        reason += "-body";
        continue;
    }
    throw await laterBodyValue(reason);
}

async function chooseLoopMultipleExpressionInitializerContinueAwait(value: string): Promise<string> {
    for (value += "-first", value += "-second"; await laterCondition(value.endsWith("-second")); value += "-increment") {
        value += "-body";
        continue;
    }
    return await laterBodyValue(value);
}

async function chooseLoopMultipleExpressionInitializerContinueThrowAwait(reason: string): Promise<string> {
    for (reason += "-first", reason += "-second"; await laterCondition(reason.endsWith("-second")); reason += "-increment") {
        reason += "-body";
        continue;
    }
    throw await laterBodyValue(reason);
}

async function chooseLoopExpressionInitializerBreakAwait(value: string): Promise<string> {
    for (value += "-initializer"; await laterCondition(true); value += "-increment") {
        value += "-body";
        break;
    }
    return await laterBodyValue(value);
}

async function chooseLoopExpressionInitializerBreakThrowAwait(reason: string): Promise<string> {
    for (reason += "-initializer"; await laterCondition(true); reason += "-increment") {
        reason += "-body";
        break;
    }
    throw await laterBodyValue(reason);
}

async function chooseLoopExpressionInitializerFalseBreakAwait(value: string): Promise<string> {
    for (value += "-initializer"; await laterCondition(false); value += "-increment") {
        value += "-unexpected-body";
        break;
    }
    return await laterBodyValue(value);
}

async function chooseLoopExpressionInitializerFalseBreakThrowAwait(reason: string): Promise<string> {
    for (reason += "-initializer"; await laterCondition(false); reason += "-increment") {
        reason += "-unexpected-body";
        break;
    }
    throw await laterBodyValue(reason);
}

async function chooseLoopTwoAwaitContinueAwait(value: string, repeat: boolean): Promise<string> {
    while (await laterCondition(repeat) && await laterCondition(repeat)) {
        value += "-body";
        repeat = false;
        continue;
    }
    return await laterBodyValue(value);
}

async function chooseLoopTwoAwaitOrContinueAwait(value: string, repeat: boolean): Promise<string> {
    while (await laterCondition(repeat) || await laterCondition(repeat)) {
        value += "-body";
        repeat = false;
        continue;
    }
    return await laterBodyValue(value);
}

async function chooseLoopTwoAwaitOrContinueThrowAwait(value: string, repeat: boolean): Promise<string> {
    while (await laterCondition(repeat) || await laterCondition(repeat)) {
        value += "-body";
        repeat = false;
        continue;
    }
    throw await laterBodyValue(value);
}

class TwoAwaitContinueChooser {
    private readonly suffix: string;

    constructor(suffix: string) {
        this.suffix = suffix;
    }

    async choose(value: string, repeat: boolean): Promise<string> {
        while (await laterCondition(repeat) && await laterCondition(repeat)) {
            value += this.suffix;
            repeat = false;
            continue;
        }
        return await laterBodyValue(value);
    }
}

const chooseTwoAwaitContinueValue = async (value: string, repeat: boolean): Promise<string> => {
    while (await laterCondition(repeat) || await laterCondition(repeat)) {
        value += "-value-body";
        repeat = false;
        continue;
    }
    return await laterBodyValue(value);
};

async function chooseLoopTwoAwaitControlContinueAwait(value: string, repeat: boolean): Promise<string> {
    while (await laterCondition(repeat) && await laterCondition(repeat)) {
        if (repeat) value += "-if";
        else value += "-else";
        repeat = false;
        continue;
    }
    return await laterBodyValue(value);
}

async function chooseLoopTwoAwaitTryFinallyContinueAwait(value: string, repeat: boolean): Promise<string> {
    while (await laterCondition(repeat) && await laterCondition(repeat)) {
        try {
            value += "-try";
        } finally {
            value += "-finally";
        }
        repeat = false;
        continue;
    }
    return await laterBodyValue(value);
}

async function chooseLoopTwoAwaitSwitchContinueAwait(value: string, repeat: boolean): Promise<string> {
    while (await laterCondition(repeat) && await laterCondition(repeat)) {
        switch (repeat ? 1 : 0) {
            case 1:
                value += "-case";
            case 0:
                value += "";
        }
        repeat = false;
        continue;
    }
    return await laterBodyValue(value);
}

async function chooseLoopTwoAwaitNestedContinueAwait(value: string, repeat: boolean): Promise<string> {
    while (await laterCondition(repeat) && await laterCondition(repeat)) {
        while (false) {
            value += "-unreachable";
        }
        value += "-nested";
        repeat = false;
        continue;
    }
    return await laterBodyValue(value);
}

async function chooseLoopTwoAwaitNestedDoContinueAwait(value: string, repeat: boolean): Promise<string> {
    while (await laterCondition(repeat) && await laterCondition(repeat)) {
        do {
            value += "-do";
        } while (false);
        repeat = false;
        continue;
    }
    return await laterBodyValue(value);
}

async function chooseLoopTwoAwaitForOfContinueAwait(value: string, repeat: boolean): Promise<string> {
    while (await laterCondition(repeat) && await laterCondition(repeat)) {
        for (const suffix of ["-for-of"]) {
            value += suffix;
        }
        repeat = false;
        continue;
    }
    return await laterBodyValue(value);
}

class ForContinueFalseChooser {
    private readonly suffix: string;

    constructor(suffix: string) {
        this.suffix = suffix;
    }

    async choose(value: string): Promise<string> {
        for (var count = 0; await laterCondition(count > 0); value += this.suffix) {
            value += "-body";
            continue;
        }
        return await laterBodyValue(value);
    }

    async chooseRepeated(value: string): Promise<string> {
        for (var count = 1; await laterCondition(count-- > 0); value += this.suffix) {
            value += "-body";
            continue;
        }
        return await laterBodyValue(value);
    }

    async chooseRepeatedThrow(reason: string): Promise<string> {
        for (var count = 1; await laterCondition(count-- > 0); reason += this.suffix) {
            reason += "-body";
            continue;
        }
        throw await laterBodyValue(reason);
    }

    async chooseExpressionInitializer(value: string): Promise<string> {
        for (value += this.suffix; await laterCondition(value.endsWith(this.suffix)); value += "-increment") {
            value += "-body";
            continue;
        }
        return await laterBodyValue(value);
    }

    async chooseExpressionInitializerThrow(reason: string): Promise<string> {
        for (reason += this.suffix; await laterCondition(reason.endsWith(this.suffix)); reason += "-increment") {
            reason += "-body";
            continue;
        }
        throw await laterBodyValue(reason);
    }

    async chooseExpressionInitializerBreak(value: string): Promise<string> {
        for (value += this.suffix; await laterCondition(value.endsWith(this.suffix)); value += "-increment") {
            value += "-body";
            break;
        }
        return await laterBodyValue(value);
    }

    async chooseExpressionInitializerBreakThrow(reason: string): Promise<string> {
        for (reason += this.suffix; await laterCondition(reason.endsWith(this.suffix)); reason += "-increment") {
            reason += "-body";
            break;
        }
        throw await laterBodyValue(reason);
    }

    async chooseExpressionInitializerFalseBreak(value: string): Promise<string> {
        for (value += this.suffix; await laterCondition(false); value += "-increment") {
            value += "-unexpected-body";
            break;
        }
        return await laterBodyValue(value);
    }

    async chooseExpressionInitializerFalseBreakThrow(reason: string): Promise<string> {
        for (reason += this.suffix; await laterCondition(false); reason += "-increment") {
            reason += "-unexpected-body";
            break;
        }
        throw await laterBodyValue(reason);
    }
}

const chooseLoopInitializerEscapingVarContinueFalseValue = async (value: string): Promise<string> => {
    for (var count = 0; await laterCondition(count > 0); value += "-increment") {
        value += "-body";
        continue;
    }
    return await laterBodyValue(value);
};

const chooseLoopInitializerEscapingVarContinueValue = async (value: string): Promise<string> => {
    for (var count = 1; await laterCondition(count-- > 0); value += "-value-increment") {
        value += "-value-body";
        continue;
    }
    return await laterBodyValue(value);
};

const chooseLoopInitializerEscapingVarContinueThrowValue = async (reason: string): Promise<string> => {
    for (var count = 1; await laterCondition(count-- > 0); reason += "-value-increment") {
        reason += "-value-body";
        continue;
    }
    throw await laterBodyValue(reason);
};

const chooseLoopExpressionInitializerContinueValue = async (value: string): Promise<string> => {
    for (value += "-value-initializer"; await laterCondition(value.endsWith("-value-initializer")); value += "-value-increment") {
        value += "-value-body";
        continue;
    }
    return await laterBodyValue(value);
};

const chooseLoopExpressionInitializerContinueThrowValue = async (reason: string): Promise<string> => {
    for (reason += "-value-initializer"; await laterCondition(reason.endsWith("-value-initializer")); reason += "-value-increment") {
        reason += "-value-body";
        continue;
    }
    throw await laterBodyValue(reason);
};

const chooseLoopExpressionInitializerBreakValue = async (value: string): Promise<string> => {
    for (value += "-value-initializer"; await laterCondition(value.endsWith("-value-initializer")); value += "-value-increment") {
        value += "-value-body";
        break;
    }
    return await laterBodyValue(value);
};

const chooseLoopExpressionInitializerBreakThrowValue = async (reason: string): Promise<string> => {
    for (reason += "-value-initializer"; await laterCondition(reason.endsWith("-value-initializer")); reason += "-value-increment") {
        reason += "-value-body";
        break;
    }
    throw await laterBodyValue(reason);
};

const chooseLoopExpressionInitializerFalseBreakValue = async (value: string): Promise<string> => {
    for (value += "-value-initializer"; await laterCondition(false); value += "-value-increment") {
        value += "-unexpected-value-body";
        break;
    }
    return await laterBodyValue(value);
};

const chooseLoopExpressionInitializerFalseBreakThrowValue = async (reason: string): Promise<string> => {
    for (reason += "-value-initializer"; await laterCondition(false); reason += "-value-increment") {
        reason += "-unexpected-value-body";
        break;
    }
    throw await laterBodyValue(reason);
};

async function chooseWhileContinueAwait(value: string, repeat: boolean): Promise<string> {
    while (await laterCondition(repeat)) {
        value += "-continued";
        repeat = false;
        continue;
    }
    return await laterBodyValue(value);
}

async function chooseWhileContinueThrowAwait(reason: string, repeat: boolean): Promise<string> {
    while (await laterCondition(repeat)) {
        reason += "-continued";
        repeat = false;
        continue;
    }
    throw await laterBodyValue(reason);
}

class WhileContinueChooser {
    private readonly suffix: string;

    constructor(suffix: string) {
        this.suffix = suffix;
    }

    async choose(value: string, repeat: boolean): Promise<string> {
        while (await laterCondition(repeat)) {
            value += this.suffix + "continued";
            repeat = false;
            continue;
        }
        return await laterBodyValue(value);
    }
}

const chooseWhileContinueValue = async (value: string, repeat: boolean): Promise<string> => {
    while (await laterCondition(repeat)) {
        value += "-value-continued";
        repeat = false;
        continue;
    }
    return await laterBodyValue(value);
};

async function chooseWhileContinueIfAwait(value: string, repeat: boolean, flag: boolean): Promise<string> {
    while (await laterCondition(repeat)) {
        if (flag) value += "-if-yes";
        else value += "-if-no";
        repeat = false;
        continue;
    }
    return await laterBodyValue(value);
}

async function chooseWhileContinueTryFinallyAwait(value: string, repeat: boolean): Promise<string> {
    while (await laterCondition(repeat)) {
        try {
            value += "-try";
        } finally {
            value += "-finally";
        }
        repeat = false;
        continue;
    }
    return await laterBodyValue(value);
}

async function chooseWhileContinueTryCatchAwait(value: string, repeat: boolean, shouldThrow: boolean): Promise<string> {
    while (await laterCondition(repeat)) {
        try {
            if (shouldThrow) throw "catch";
            value += "-try";
        } catch (reason) {
            value += "-" + reason;
        }
        repeat = false;
        continue;
    }
    return await laterBodyValue(value);
}

async function chooseWhileContinueTryCatchFinallyAwait(value: string, repeat: boolean, shouldThrow: boolean): Promise<string> {
    while (await laterCondition(repeat)) {
        try {
            if (shouldThrow) throw "catch";
            value += "-try";
        } catch (reason) {
            value += "-" + reason;
        } finally {
            value += "-finally";
        }
        repeat = false;
        continue;
    }
    return await laterBodyValue(value);
}

async function chooseWhileContinueSwitchAwait(value: string, repeat: boolean, flag: boolean): Promise<string> {
    while (await laterCondition(repeat)) {
        switch (flag) {
            case true:
                value += "-switch-yes";
                break;
            default:
                value += "-switch-no";
                break;
        }
        repeat = false;
        continue;
    }
    return await laterBodyValue(value);
}

async function chooseWhileContinueNestedWhileAwait(value: string, repeat: boolean, innerRepeat: boolean): Promise<string> {
    while (await laterCondition(repeat)) {
        while (innerRepeat) {
            value += "-nested";
            innerRepeat = false;
        }
        repeat = false;
        continue;
    }
    return await laterBodyValue(value);
}

async function chooseWhileContinueNestedDoAwait(value: string, repeat: boolean, innerRepeat: boolean): Promise<string> {
    while (await laterCondition(repeat)) {
        do {
            value += "-nested";
            innerRepeat = false;
        } while (innerRepeat);
        repeat = false;
        continue;
    }
    return await laterBodyValue(value);
}

async function chooseWhileContinueNestedIteratorsAwait(value: string, repeat: boolean): Promise<string> {
    while (await laterCondition(repeat)) {
        for (const item of ["one", "two"]) {
            value += "-" + item;
        }
        for (const key in { first: 1, second: 2 }) {
            value += "-" + key;
        }
        repeat = false;
        continue;
    }
    return await laterBodyValue(value);
}

async function chooseWhileContinueNestedForAwait(value: string, repeat: boolean): Promise<string> {
    while (await laterCondition(repeat)) {
        for (let index = 0; index < 2; index++) {
            value += "-" + index;
        }
        repeat = false;
        continue;
    }
    return await laterBodyValue(value);
}

async function chooseWhileContinueNestedIteratorControlAwait(value: string, repeat: boolean): Promise<string> {
    while (await laterCondition(repeat)) {
        for (const item of ["skip", "keep"]) {
            if (item === "skip") continue;
            value += "-" + item;
            break;
        }
        repeat = false;
        continue;
    }
    return await laterBodyValue(value);
}

async function chooseLoopInitializerUninitializedVarCapture(): Promise<string> {
    for (var value: any; await laterTrue();) {
        value = "loop-uninitialized-var-captured";
        return await laterBodyValue(value);
    }
    return "loop-uninitialized-var-fallthrough";
}

async function chooseLoopInitializerTypedUninitializedVarCapture(): Promise<string> {
    for (var value: string; await laterTrue();) {
        value = "loop-typed-uninitialized-var-captured";
        return await laterBodyValue(value);
    }
    return "loop-typed-uninitialized-var-fallthrough";
}

async function chooseLoopInitializerUninitializedVarFallthroughCapture(): Promise<string> {
    for (var value: any; await laterFalse();) {
        return await laterBodyValue(value);
    }
    return typeof value;
}

async function chooseLoopInitializerUninitializedLetCapture(): Promise<string> {
    for (let value: string; await laterTrue();) {
        value = "loop-uninitialized-let-captured";
        return await laterBodyValue(value);
    }
    return "loop-uninitialized-let-fallthrough";
}

async function chooseLoopInitializerUninitializedLetConditionCapture(): Promise<string> {
    for (let value: any; await laterCondition(value === undefined);) {
        value = "loop-uninitialized-let-condition-captured";
        return await laterBodyValue(value);
    }
    return "loop-uninitialized-let-condition-fallthrough";
}

async function chooseLoopInitializerUninitializedLetConditionFallthrough(): Promise<string> {
    for (let value: any; await laterCondition(value !== undefined);) {
        return "loop-uninitialized-let-condition-unexpected-body";
    }
    return "loop-uninitialized-let-condition-fallthrough";
}

async function chooseLoopInitializerTypedUninitializedLetCondition(): Promise<string> {
    for (let value: string | undefined; await laterCondition(typeof value === "undefined");) {
        value = "loop-typed-uninitialized-let-condition-captured";
        return await laterBodyValue(value);
    }
    return "loop-typed-uninitialized-let-condition-fallthrough";
}

class LoopInitializerCaptureChooser {
    async choose(): Promise<string> {
        for (let value = "loop-method-condition-captured"; await laterCondition(value.length > 0);) {
            value += "-updated";
            return await laterBodyValue(value);
        }
        return "loop-method-condition-fallthrough";
    }

    async chooseUninitializedLetCondition(): Promise<string> {
        for (let value: any; await laterCondition(value === undefined);) {
            value = "loop-method-uninitialized-let-condition-captured";
            return await laterBodyValue(value);
        }
        return "loop-method-uninitialized-let-condition-fallthrough";
    }
}

const chooseLoopInitializerConditionCaptureValue = async (): Promise<string> => {
    for (let value = "loop-value-condition-captured"; await laterCondition(value.length > 0);) {
        value += "-updated";
        return await laterBodyValue(value);
    }
    return "loop-value-condition-fallthrough";
};

const chooseLoopInitializerUninitializedLetConditionValue = async (): Promise<string> => {
    for (let value: any; await laterCondition(value === undefined);) {
        value = "loop-value-uninitialized-let-condition-captured";
        return await laterBodyValue(value);
    }
    return "loop-value-uninitialized-let-condition-fallthrough";
};

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
        const source = prefix, value = await laterBodyValue(source);
        return value;
    }
    return prefix + "-alias-fallthrough";
}

async function chooseLoopThrowAwaitAlias(condition: boolean): Promise<string> {
    while (await (condition ? laterTrue() : laterFalse())) {
        const source = "body-throw-await-alias", reason = await laterBodyValue(source);
        throw reason;
    }
    return "body-throw-await-alias-fallthrough";
}

async function chooseLoopReturnAwaitMultiple(condition: boolean, prefix: string): Promise<string> {
    while (await (condition ? laterTrue() : laterFalse())) {
        const first = await laterBodyValue(prefix + "-first"), second = await laterBodyValue(first + "-second");
        return second;
    }
    return prefix + "-multiple-fallthrough";
}

async function chooseLoopThrowAwaitMultiple(condition: boolean): Promise<string> {
    while (await (condition ? laterTrue() : laterFalse())) {
        const first = await laterBodyValue("body-loop-multiple-first"), reason = await laterBodyValue(first + "-second");
        throw reason;
    }
    return "body-loop-multiple-fallthrough";
}

async function chooseForReturnAwaitMultiple(condition: boolean, prefix: string): Promise<string> {
    for (; await (condition ? laterTrue() : laterFalse());) {
        const first = await laterBodyValue(prefix + "-first"), second = await laterBodyValue(first + "-second");
        return second;
    }
    return prefix + "-for-multiple-fallthrough";
}

async function chooseLoopReturnAwaitMultiplePrelude(condition: boolean, prefix: string): Promise<string> {
    while (await (condition ? laterTrue() : laterFalse())) {
        if (condition) prefix += "-branch";
        const source = prefix + "-prelude";
        const first = await laterBodyValue(source + "-first"), second = await laterBodyValue(first + "-second");
        return second;
    }
    return prefix + "-multiple-prelude-fallthrough";
}

async function chooseLoopReturnAwaitAssignedAlias(condition: boolean, prefix: string): Promise<string> {
    while (await (condition ? laterTrue() : laterFalse())) {
        let source = prefix + "-assigned-alias", value: string;
        value = await laterBodyValue(source);
        return value;
    }
    return prefix + "-assigned-alias-fallthrough";
}

async function chooseLoopThrowAwaitAssignedAlias(condition: boolean): Promise<string> {
    while (await (condition ? laterTrue() : laterFalse())) {
        let source = "body-throw-assigned-alias", reason: string;
        reason = await laterBodyValue(source);
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

async function chooseLoopReturnAwaitAssignedAliasPostMultiple(condition: boolean, prefix: string): Promise<string> {
    while (await (condition ? laterTrue() : laterFalse())) {
        let value: string;
        value = await laterBodyValue(prefix + "-assigned-post-multiple");
        prefix += "-first";
        prefix += "-second";
        return value + prefix;
    }
    return prefix + "-assigned-post-multiple-fallthrough";
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

async function chooseLoopReturnAwaitAliasPostMultipleLocals(condition: boolean, prefix: string): Promise<string> {
    while (await (condition ? laterTrue() : laterFalse())) {
        const value = await laterBodyValue(prefix + "-post-multiple-locals");
        const first = "-first", second = "-second";
        return value + prefix + first + second;
    }
    return prefix + "-post-multiple-locals-fallthrough";
}

async function chooseLoopReturnAwaitAliasPostVar(condition: boolean, prefix: string): Promise<string> {
    while (await (condition ? laterTrue() : laterFalse())) {
        const value = await laterBodyValue(prefix + "-post-var");
        var suffix = "-var";
        return value + prefix + suffix;
    }
    return prefix + "-post-var-fallthrough";
}

async function chooseLoopReturnAwaitAliasPostAssignedVar(condition: boolean, prefix: string): Promise<string> {
    while (await (condition ? laterTrue() : laterFalse())) {
        const value = await laterBodyValue(prefix + "-post-assigned-var");
        var suffix: string;
        suffix = "-assigned-var";
        return value + prefix + suffix;
    }
    return prefix + "-post-assigned-var-fallthrough";
}

async function chooseLoopReturnAwaitVarPrelude(condition: boolean, prefix: string): Promise<string> {
    while (await (condition ? laterTrue() : laterFalse())) {
        var suffix = "-var-prelude";
        const value = await laterBodyValue(prefix + suffix);
        return value + prefix;
    }
    return prefix + "-var-prelude-fallthrough";
}

async function chooseLoopReturnAwaitAssignedVarPrelude(condition: boolean, prefix: string): Promise<string> {
    while (await (condition ? laterTrue() : laterFalse())) {
        var suffix: string;
        suffix = "-assigned-var-prelude";
        const value = await laterBodyValue(prefix + suffix);
        return value + prefix;
    }
    return prefix + "-assigned-var-prelude-fallthrough";
}

async function chooseLoopReturnAwaitMultiplePreludeLocals(condition: boolean, prefix: string): Promise<string> {
    while (await (condition ? laterTrue() : laterFalse())) {
        const first = "-first-prelude", second = "-second-prelude";
        const value = await laterBodyValue(prefix + first + second);
        return value + prefix;
    }
    return prefix + "-multiple-prelude-locals-fallthrough";
}

async function chooseLoopReturnAwaitAliasPostControl(condition: boolean, flag: boolean, prefix: string): Promise<string> {
    while (await (condition ? laterTrue() : laterFalse())) {
        const value = await laterBodyValue(prefix + "-post-control");
        if (flag) {
            const suffix = "-updated", extra = "";
            prefix += suffix + extra;
        } else {
            let suffix = "";
            prefix += suffix;
        }
        return value + prefix;
    }
    return prefix + "-post-control-fallthrough";
}

async function chooseLoopThrowAwaitAliasPostControl(condition: boolean, flag: boolean): Promise<string> {
    while (await (condition ? laterTrue() : laterFalse())) {
        let reason = await laterBodyValue("body-throw-post-control");
        if (flag) {
            const suffix = "-updated";
            reason += suffix;
        } else {
            let suffix = "";
            reason += suffix;
        }
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

async function chooseLoopReturnAwaitAliasMutation(condition: boolean): Promise<string> {
    while (await (condition ? laterTrue() : laterFalse())) {
        let value = await laterBodyValue("body-return-mutation");
        value += "-updated";
        return value;
    }
    return "body-return-mutation-fallthrough";
}

async function chooseLoopThrowAwaitAliasMutation(condition: boolean): Promise<string> {
    while (await (condition ? laterTrue() : laterFalse())) {
        let reason = await laterBodyValue("body-throw-mutation");
        reason += "-updated";
        throw reason;
    }
    return "body-throw-mutation-fallthrough";
}

async function chooseLoopReturnAwaitAliasPostTry(condition: boolean, prefix: string): Promise<string> {
    while (await (condition ? laterTrue() : laterFalse())) {
        const value = await laterBodyValue(prefix + "-post-try");
        try {
            const suffix = "-try", extra = "";
            prefix += suffix + extra;
        } catch {
            let suffix = "-catch";
            prefix += suffix;
        } finally {
            const suffix = "-finally";
            prefix += suffix;
        }
        return value + prefix;
    }
    return prefix + "-post-try-fallthrough";
}

async function chooseLoopThrowAwaitAliasPostTry(condition: boolean): Promise<string> {
    while (await (condition ? laterTrue() : laterFalse())) {
        let reason = await laterBodyValue("body-throw-post-try");
        try {
            const suffix = "-try";
            reason += suffix;
        } finally {
            let suffix = "-finally";
            reason += suffix;
        }
        throw reason;
    }
    return "body-throw-post-try-fallthrough";
}

async function chooseLoopReturnAwaitAliasPostLoop(condition: boolean, flag: boolean, prefix: string): Promise<string> {
    while (await (condition ? laterTrue() : laterFalse())) {
        const value = await laterBodyValue(prefix + "-post-loop");
        let count = 0;
        while (flag) {
            count += 1;
            if (count === 1) continue;
            prefix += "-loop";
            for (let index = 0, offset = 0; index < 1; index += 1, offset += 1) {
                continue;
            }
            for (const item of ["nested"]) {
                if (item) continue;
            }
            for (let key in ["nested"]) {
                if (key) continue;
            }
            for (var nestedValue of ["nested-var"]) {
                continue;
            }
            for (var nestedKey in ["nested-var"]) {
                continue;
            }
            break;
        }
        return value + prefix;
    }
    return prefix + "-post-loop-fallthrough";
}

async function chooseLoopThrowAwaitAliasPostLoop(condition: boolean, flag: boolean): Promise<string> {
    while (await (condition ? laterTrue() : laterFalse())) {
        let reason = await laterBodyValue("body-throw-post-loop");
        while (flag) {
            reason += "-loop";
            flag = false;
        }
        throw reason;
    }
    return "body-throw-post-loop-fallthrough";
}

async function chooseLoopReturnAwaitAliasPostFor(condition: boolean, flag: boolean, prefix: string): Promise<string> {
    while (await (condition ? laterTrue() : laterFalse())) {
        const value = await laterBodyValue(prefix + "-post-for");
        let count = 0;
        for (; flag;) {
            count += 1;
            if (count === 1) continue;
            prefix += "-for";
            break;
        }
        return value + prefix;
    }
    return prefix + "-post-for-fallthrough";
}

async function chooseLoopThrowAwaitAliasPostFor(condition: boolean, flag: boolean): Promise<string> {
    while (await (condition ? laterTrue() : laterFalse())) {
        let reason = await laterBodyValue("body-throw-post-for");
        for (; flag;) {
            reason += "-for";
            flag = false;
        }
        throw reason;
    }
    return "body-throw-post-for-fallthrough";
}

async function chooseLoopReturnAwaitAliasPostDo(condition: boolean, flag: boolean, prefix: string): Promise<string> {
    while (await (condition ? laterTrue() : laterFalse())) {
        const value = await laterBodyValue(prefix + "-post-do");
        let first = true;
        do {
            if (first) {
                first = false;
                if (flag) continue;
            }
            prefix += "-do";
            break;
        } while (flag);
        return value + prefix;
    }
    return prefix + "-post-do-fallthrough";
}

async function chooseLoopThrowAwaitAliasPostDo(condition: boolean, flag: boolean): Promise<string> {
    while (await (condition ? laterTrue() : laterFalse())) {
        let reason = await laterBodyValue("body-throw-post-do");
        do {
            reason += "-do";
            flag = false;
        } while (flag);
        throw reason;
    }
    return "body-throw-post-do-fallthrough";
}

async function chooseLoopReturnAwaitAliasPostSwitch(condition: boolean, flag: boolean, prefix: string): Promise<string> {
    while (await (condition ? laterTrue() : laterFalse())) {
        const value = await laterBodyValue(prefix + "-post-switch");
        switch (flag) {
            case true:
                {
                    const suffix = "-switch", extra = "";
                    prefix += suffix + extra;
                }
                break;
            case false:
                {
                    let suffix = "";
                    prefix += suffix;
                }
                break;
        }
        return value + prefix;
    }
    return prefix + "-post-switch-fallthrough";
}

async function chooseLoopThrowAwaitAliasPostSwitch(condition: boolean, flag: boolean): Promise<string> {
    while (await (condition ? laterTrue() : laterFalse())) {
        let reason = await laterBodyValue("body-throw-post-switch");
        switch (flag) {
            case true:
                {
                    const suffix = "-switch";
                    reason += suffix;
                }
                break;
            case false:
                {
                    let suffix = "";
                    reason += suffix;
                }
                break;
        }
        throw reason;
    }
    return "body-throw-post-switch-fallthrough";
}

async function chooseLoopReturnAwaitAliasPostForOf(condition: boolean, prefix: string): Promise<string> {
    while (await (condition ? laterTrue() : laterFalse())) {
        const value = await laterBodyValue(prefix + "-post-for-of");
        for (prefix of ["-item"]) {
            prefix += "-for-of";
        }
        return value + prefix;
    }
    return prefix + "-post-for-of-fallthrough";
}

async function chooseLoopThrowAwaitAliasPostForOf(condition: boolean, prefix: string): Promise<string> {
    while (await (condition ? laterTrue() : laterFalse())) {
        let reason = await laterBodyValue("body-throw-post-for-of");
        for (prefix of ["-item"]) {
            reason += prefix;
        }
        throw reason;
    }
    return "body-throw-post-for-of-fallthrough";
}

async function chooseLoopReturnAwaitAliasPostForIn(condition: boolean, prefix: string): Promise<string> {
    while (await (condition ? laterTrue() : laterFalse())) {
        const value = await laterBodyValue(prefix + "-post-for-in");
        for (prefix in ["item"]) {
            prefix += "-for-in";
        }
        return value + prefix;
    }
    return prefix + "-post-for-in-fallthrough";
}

async function chooseLoopThrowAwaitAliasPostForIn(condition: boolean, prefix: string): Promise<string> {
    while (await (condition ? laterTrue() : laterFalse())) {
        let reason = await laterBodyValue("body-throw-post-for-in");
        for (prefix in ["item"]) {
            reason += prefix;
        }
        throw reason;
    }
    return "body-throw-post-for-in-fallthrough";
}

async function chooseLoopReturnAwaitAliasPostForOfLocal(condition: boolean, prefix: string): Promise<string> {
    while (await (condition ? laterTrue() : laterFalse())) {
        const value = await laterBodyValue(prefix + "-post-for-of-local");
        for (const item of ["-item"]) {
            if (item) {
                const suffix = item, extra = "";
                prefix += suffix + extra;
            }
        }
        return value + prefix;
    }
    return prefix + "-post-for-of-local-fallthrough";
}

async function chooseLoopReturnAwaitAliasPostForInLocal(condition: boolean, prefix: string): Promise<string> {
    while (await (condition ? laterTrue() : laterFalse())) {
        const value = await laterBodyValue(prefix + "-post-for-in-local");
        for (const item in ["item"]) {
            switch (item) {
                case "0": {
                    const suffix = item, extra = "";
                    prefix += suffix + extra;
                    break;
                }
            }
        }
        return value + prefix;
    }
    return prefix + "-post-for-in-local-fallthrough";
}

async function chooseLoopReturnAwaitAliasPostMutableIterators(condition: boolean, prefix: string): Promise<string> {
    while (await (condition ? laterTrue() : laterFalse())) {
        const value = await laterBodyValue(prefix + "-post-mutable-iterators");
        for (let item of ["-of"]) {
            prefix += item;
            if (item === "-of") continue;
            item = "-updated";
        }
        for (let item in ["in"]) {
            prefix += item;
            if (item === "0") break;
            item = "-updated";
        }
        for (var item of ["-var-of"]) {
            prefix += item;
            break;
        }
        for (var key in ["var-in"]) {
            prefix += key;
            break;
        }
        return value + prefix;
    }
    return prefix + "-post-mutable-iterators-fallthrough";
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

async function chooseLoopSynchronousBody(flag: boolean): Promise<string> {
    while (await Promise.resolve(flag)) return "sync-body";
    return "sync-fallthrough";
}

async function chooseForSynchronousBody(flag: boolean): Promise<string> {
    for (; await Promise.resolve(flag);) return "for-sync-body";
    return "for-sync-fallthrough";
}

async function chooseLoopSynchronousThrow(flag: boolean): Promise<string> {
    while (await Promise.resolve(flag)) throw "sync-throw";
    return "sync-throw-fallthrough";
}

async function chooseForSynchronousThrow(flag: boolean): Promise<string> {
    for (; await Promise.resolve(flag);) throw "for-sync-throw";
    return "for-sync-throw-fallthrough";
}

async function chooseLoopSynchronousPrelude(flag: boolean): Promise<string> {
    while (await Promise.resolve(flag)) {
        void "sync-prelude";
        const suffix = "-suffix";
        return "sync-body" + suffix;
    }
    return "sync-prelude-fallthrough";
}

async function chooseForSynchronousPrelude(flag: boolean): Promise<string> {
    for (; await Promise.resolve(flag);) {
        const suffix = "-for-suffix";
        return "for-sync-body" + suffix;
    }
    return "for-sync-prelude-fallthrough";
}

async function chooseForSynchronousIncrementor(flag: boolean): Promise<string> {
    for (; await Promise.resolve(flag); console.log("unexpected-for-incrementor")) {
        return "for-incrementor-body";
    }
    return "for-incrementor-fallthrough";
}

async function chooseForSynchronousInitializer(flag: boolean): Promise<string> {
    for (console.log("for-initializer"); await Promise.resolve(flag);) {
        return "for-initializer-body";
    }
    return "for-initializer-fallthrough";
}

async function chooseLoopExpressionlessReturn(flag: boolean): Promise<void> {
    while (await Promise.resolve(flag)) {
        console.log("await-while-expressionless-return-true");
        return;
    }
    console.log("await-while-expressionless-return-false");
    return;
}

async function chooseForExpressionlessReturn(flag: boolean): Promise<void> {
    for (; await Promise.resolve(flag);) {
        console.log("await-for-expressionless-return-true");
        return;
    }
    console.log("await-for-expressionless-return-false");
    return;
}

async function chooseForDeclarationInitializer(flag: boolean): Promise<string> {
    for (let ignored = (console.log("for-declaration-initializer"), 1); await Promise.resolve(flag);) {
        return "for-declaration-body";
    }
    return "for-declaration-fallthrough";
}

async function chooseLoopSynchronousThrowPrelude(flag: boolean): Promise<string> {
    while (await Promise.resolve(flag)) {
        void "sync-throw-prelude";
        const reason = "sync-throw";
        throw reason;
    }
    return "sync-throw-prelude-fallthrough";
}

async function chooseLoopSynchronousControlPrelude(flag: boolean): Promise<string> {
    while (await Promise.resolve(flag)) {
        if (flag) {
            void "sync-control-then";
        } else {
            void "sync-control-else";
        }
        return "sync-control-body";
    }
    return "sync-control-fallthrough";
}

async function chooseLoopSynchronousTryPrelude(flag: boolean): Promise<string> {
    while (await Promise.resolve(flag)) {
        try {
            void "sync-try";
        } finally {
            void "sync-finally";
        }
        return "sync-try-body";
    }
    return "sync-try-fallthrough";
}

async function chooseLoopSynchronousSwitchPrelude(flag: boolean): Promise<string> {
    while (await Promise.resolve(flag)) {
        switch (flag ? 1 : 0) {
            case 1:
                void "sync-switch-one";
                break;
            default:
                void "sync-switch-default";
                break;
        }
        return "sync-switch-body";
    }
    return "sync-switch-fallthrough";
}

async function chooseLoopSynchronousIteratorPrelude(flag: boolean): Promise<string> {
    while (await Promise.resolve(flag)) {
        for (const item of [1, 2]) void item;
        return "sync-iterator-body";
    }
    return "sync-iterator-fallthrough";
}

async function chooseLoopSynchronousKeyPrelude(flag: boolean): Promise<string> {
    while (await Promise.resolve(flag)) {
        for (const key in { value: 1 }) void key;
        return "sync-key-body";
    }
    return "sync-key-fallthrough";
}

async function chooseLoopSynchronousForPrelude(flag: boolean): Promise<string> {
    while (await Promise.resolve(flag)) {
        for (let index = 0; index < 2; index++) void index;
        return "sync-for-body";
    }
    return "sync-for-fallthrough";
}

async function chooseLoopSynchronousLoopControlPrelude(flag: boolean): Promise<string> {
    while (await Promise.resolve(flag)) {
        let total = 0;
        for (let index = 0; index < 4; index++) {
            if (index === 1) continue;
            if (index === 3) break;
            total += index;
        }
        return "sync-loop-control-" + total;
    }
    return "sync-loop-control-fallthrough";
}

async function chooseLoopSynchronousIteratorControlPrelude(flag: boolean): Promise<string> {
    while (await Promise.resolve(flag)) {
        let total = 0;
        for (const item of [0, 1, 2]) {
            if (item === 1) continue;
            if (item === 2) break;
            total += item;
        }
        return "sync-iterator-control-" + total;
    }
    return "sync-iterator-control-fallthrough";
}

async function chooseLoopSynchronousControlThrowPrelude(flag: boolean): Promise<string> {
    while (await Promise.resolve(flag)) {
        if (flag) void "sync-control-throw";
        throw "sync-control-throw-reason";
    }
    return "sync-control-throw-fallthrough";
}

async function chooseLoopSynchronousCaughtThrowPrelude(flag: boolean): Promise<string> {
    while (await Promise.resolve(flag)) {
        try {
            throw "sync-caught";
        } catch (reason) {
            void reason;
        }
        return "sync-caught-body";
    }
    return "sync-caught-fallthrough";
}

async function chooseLoopSynchronousCatchRethrowPrelude(flag: boolean): Promise<string> {
    while (await Promise.resolve(flag)) {
        try {
            throw "sync-catch-source";
        } catch (reason) {
            void reason;
            throw "sync-catch-rethrow";
        }
        return "sync-catch-body";
    }
    return "sync-catch-fallthrough";
}

async function chooseLoopSynchronousCaughtPreludeBeforeThrow(flag: boolean): Promise<string> {
    while (await Promise.resolve(flag)) {
        try {
            throw "sync-caught-before-throw-source";
        } catch (reason) {
            void reason;
        }
        throw "sync-caught-before-throw-body";
    }
    return "sync-caught-before-throw-fallthrough";
}

async function chooseLoopSynchronousCaughtFinallyBeforeThrow(flag: boolean): Promise<string> {
    while (await Promise.resolve(flag)) {
        try {
            throw "sync-caught-finally-before-throw-source";
        } catch (reason) {
            void reason;
        } finally {
            void "sync-caught-finally-before-throw-cleanup";
        }
        throw "sync-caught-finally-before-throw-body";
    }
    return "sync-caught-finally-before-throw-fallthrough";
}

async function chooseLoopSynchronousCaughtFinallyPrelude(flag: boolean): Promise<string> {
    while (await Promise.resolve(flag)) {
        try {
            throw "sync-caught-finally";
        } catch (reason) {
            void reason;
        } finally {
            void "sync-caught-finally-cleanup";
        }
        return "sync-caught-finally-body";
    }
    return "sync-caught-finally-fallthrough";
}

async function chooseLoopSynchronousFinallyThrowPrelude(flag: boolean): Promise<string> {
    while (await Promise.resolve(flag)) {
        try {
            throw "sync-finally-source";
        } catch (reason) {
            void reason;
        } finally {
            throw "sync-finally-override";
        }
        return "sync-finally-body";
    }
    return "sync-finally-fallthrough";
}

async function chooseLoopSynchronousUncaughtFinallyThrowPrelude(flag: boolean): Promise<string> {
    while (await Promise.resolve(flag)) {
        try {
            void "sync-uncaught-finally-source";
        } finally {
            throw "sync-uncaught-finally-override";
        }
        return "sync-uncaught-finally-body";
    }
    return "sync-uncaught-finally-fallthrough";
}

async function chooseLoopSynchronousKeyControlPrelude(flag: boolean): Promise<string> {
    while (await Promise.resolve(flag)) {
        let total = 0;
        for (const key in { first: 1, second: 2 }) {
            if (key === "second") break;
            total++;
        }
        return "sync-key-control-" + total;
    }
    return "sync-key-control-fallthrough";
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

    async pickMultiple(flag: boolean): Promise<string> {
        while (await (flag ? laterTrue() : laterFalse())) {
            const first = await laterBodyValue(this.prefix + "first"), second = await laterBodyValue(first + "-second");
            return second;
        }
        return this.prefix + "multiple-no";
    }

    async throwWithLocals(): Promise<string> {
        const source = this.prefix + "throw-source", reason = await laterBodyValue(source);
        throw reason;
    }

    async multipleAwaitDeclarators(): Promise<string> {
        const first = await laterBodyValue(this.prefix + "first"), second = await laterBodyValue(first + "-second");
        return second;
    }

    async pickSynchronousBody(flag: boolean): Promise<string> {
        while (await Promise.resolve(flag)) return "method-sync-body";
        return "method-sync-fallthrough";
    }

    async pickSynchronousThrow(flag: boolean): Promise<string> {
        while (await Promise.resolve(flag)) throw "method-sync-throw";
        return "method-sync-throw-fallthrough";
    }

    async pickSynchronousPrelude(flag: boolean): Promise<string> {
        while (await Promise.resolve(flag)) {
            const suffix = "-method-suffix";
            return "method-sync-body" + suffix;
        }
        return "method-sync-prelude-fallthrough";
    }

    async pickSynchronousIncrementor(flag: boolean): Promise<string> {
        for (; await Promise.resolve(flag); console.log("unexpected-method-for-incrementor")) {
            return "method-for-incrementor-body";
        }
        return "method-for-incrementor-fallthrough";
    }

    async pickSynchronousInitializer(flag: boolean): Promise<string> {
        for (console.log("method-for-initializer"); await Promise.resolve(flag);) {
            return "method-for-initializer-body";
        }
        return "method-for-initializer-fallthrough";
    }

    async pickExpressionlessReturn(flag: boolean): Promise<void> {
        while (await Promise.resolve(flag)) {
            console.log("await-method-expressionless-return-true");
            return;
        }
        console.log("await-method-expressionless-return-false");
        return;
    }

    async pickForExpressionlessReturn(flag: boolean): Promise<void> {
        for (; await Promise.resolve(flag);) {
            console.log("await-method-for-expressionless-return-true");
            return;
        }
        console.log("await-method-for-expressionless-return-false");
        return;
    }

    async pickForDeclarationInitializer(flag: boolean): Promise<string> {
        for (let ignored = (console.log("method-for-declaration-initializer"), 1); await Promise.resolve(flag);) {
            return "method-for-declaration-body";
        }
        return "method-for-declaration-fallthrough";
    }

    async pickSynchronousThrowPrelude(flag: boolean): Promise<string> {
        while (await Promise.resolve(flag)) {
            const reason = "method-sync-throw";
            throw reason;
        }
        return "method-sync-throw-prelude-fallthrough";
    }

    async pickSynchronousControlPrelude(flag: boolean): Promise<string> {
        while (await Promise.resolve(flag)) {
            if (flag) void "method-sync-control";
            return "method-sync-control-body";
        }
        return "method-sync-control-fallthrough";
    }

    async pickSynchronousTryPrelude(flag: boolean): Promise<string> {
        while (await Promise.resolve(flag)) {
            try {
                void "method-sync-try";
            } finally {
                void "method-sync-finally";
            }
            return "method-sync-try-body";
        }
        return "method-sync-try-fallthrough";
    }

    async pickSynchronousSwitchPrelude(flag: boolean): Promise<string> {
        while (await Promise.resolve(flag)) {
            switch (flag ? 1 : 0) {
                case 1:
                    void "method-sync-switch";
                    break;
                default:
                    break;
            }
            return "method-sync-switch-body";
        }
        return "method-sync-switch-fallthrough";
    }

    async pickSynchronousIteratorPrelude(flag: boolean): Promise<string> {
        while (await Promise.resolve(flag)) {
            for (const item of [1, 2]) void item;
            return "method-sync-iterator-body";
        }
        return "method-sync-iterator-fallthrough";
    }

    async pickSynchronousForPrelude(flag: boolean): Promise<string> {
        while (await Promise.resolve(flag)) {
            for (let index = 0; index < 1; index++) void index;
            return "method-sync-for-body";
        }
        return "method-sync-for-fallthrough";
    }

    async pickSynchronousLoopControlPrelude(flag: boolean): Promise<string> {
        while (await Promise.resolve(flag)) {
            let total = 0;
            for (let index = 0; index < 3; index++) {
                if (index === 1) continue;
                total += index;
            }
            return "method-sync-loop-control-" + total;
        }
        return "method-sync-loop-control-fallthrough";
    }

    async pickSynchronousIteratorControlPrelude(flag: boolean): Promise<string> {
        while (await Promise.resolve(flag)) {
            let total = 0;
            for (const item of [0, 1, 2]) {
                if (item === 1) continue;
                if (item === 2) break;
                total += item;
            }
            return "method-sync-iterator-control-" + total;
        }
        return "method-sync-iterator-control-fallthrough";
    }

    async pickSynchronousControlThrowPrelude(flag: boolean): Promise<string> {
        while (await Promise.resolve(flag)) {
            try {
                void "method-sync-control-throw";
            } finally {
                void "method-sync-control-finally";
            }
            throw "method-sync-control-throw-reason";
        }
        return "method-sync-control-throw-fallthrough";
    }

    async pickSynchronousCaughtThrowPrelude(flag: boolean): Promise<string> {
        while (await Promise.resolve(flag)) {
            try {
                throw "method-sync-caught";
            } catch (reason) {
                void reason;
            }
            return "method-sync-caught-body";
        }
        return "method-sync-caught-fallthrough";
    }

    async pickSynchronousCatchRethrowPrelude(flag: boolean): Promise<string> {
        while (await Promise.resolve(flag)) {
            try {
                throw "method-sync-catch-source";
            } catch (reason) {
                void reason;
                throw "method-sync-catch-rethrow";
            }
            return "method-sync-catch-body";
        }
        return "method-sync-catch-fallthrough";
    }

    async pickSynchronousCaughtPreludeBeforeThrow(flag: boolean): Promise<string> {
        while (await Promise.resolve(flag)) {
            try {
                throw "method-sync-caught-before-throw-source";
            } catch (reason) {
                void reason;
            }
            throw "method-sync-caught-before-throw-body";
        }
        return "method-sync-caught-before-throw-fallthrough";
    }

    async pickSynchronousCaughtFinallyBeforeThrow(flag: boolean): Promise<string> {
        while (await Promise.resolve(flag)) {
            try {
                throw "method-sync-caught-finally-before-throw-source";
            } catch (reason) {
                void reason;
            } finally {
                void "method-sync-caught-finally-before-throw-cleanup";
            }
            throw "method-sync-caught-finally-before-throw-body";
        }
        return "method-sync-caught-finally-before-throw-fallthrough";
    }

    async pickSynchronousCaughtFinallyPrelude(flag: boolean): Promise<string> {
        while (await Promise.resolve(flag)) {
            try {
                throw "method-sync-caught-finally";
            } catch (reason) {
                void reason;
            } finally {
                void "method-sync-caught-finally-cleanup";
            }
            return "method-sync-caught-finally-body";
        }
        return "method-sync-caught-finally-fallthrough";
    }

    async pickSynchronousFinallyThrowPrelude(flag: boolean): Promise<string> {
        while (await Promise.resolve(flag)) {
            try {
                throw "method-sync-finally-source";
            } catch (reason) {
                void reason;
            } finally {
                throw "method-sync-finally-override";
            }
            return "method-sync-finally-body";
        }
        return "method-sync-finally-fallthrough";
    }

    async pickSynchronousUncaughtFinallyThrowPrelude(flag: boolean): Promise<string> {
        while (await Promise.resolve(flag)) {
            try {
                void "method-sync-uncaught-finally-source";
            } finally {
                throw "method-sync-uncaught-finally-override";
            }
            return "method-sync-uncaught-finally-body";
        }
        return "method-sync-uncaught-finally-fallthrough";
    }
}

const chooseLoopValue = async (flag: boolean, prefix: string): Promise<string> => {
    while (await (flag ? laterTrue() : laterFalse())) {
        return await laterBodyValue(prefix + "yes");
    }
    return prefix + "no";
};

const chooseLoopSynchronousBodyValue = async (flag: boolean): Promise<string> => {
    while (await Promise.resolve(flag)) return "value-sync-body";
    return "value-sync-fallthrough";
};

const chooseLoopSynchronousThrowValue = async (flag: boolean): Promise<string> => {
    while (await Promise.resolve(flag)) throw "value-sync-throw";
    return "value-sync-throw-fallthrough";
};

const chooseLoopSynchronousPreludeValue = async (flag: boolean): Promise<string> => {
    while (await Promise.resolve(flag)) {
        const suffix = "-value-suffix";
        return "value-sync-body" + suffix;
    }
    return "value-sync-prelude-fallthrough";
};

const chooseForSynchronousIncrementorValue = async (flag: boolean): Promise<string> => {
    for (; await Promise.resolve(flag); console.log("unexpected-value-for-incrementor")) {
        return "value-for-incrementor-body";
    }
    return "value-for-incrementor-fallthrough";
};

const chooseForSynchronousInitializerValue = async (flag: boolean): Promise<string> => {
    for (console.log("value-for-initializer"); await Promise.resolve(flag);) {
        return "value-for-initializer-body";
    }
    return "value-for-initializer-fallthrough";
};

const chooseExpressionlessReturnValue = async (flag: boolean): Promise<void> => {
    while (await Promise.resolve(flag)) {
        console.log("await-value-expressionless-return-true");
        return;
    }
    console.log("await-value-expressionless-return-false");
    return;
};

const chooseForExpressionlessReturnValue = async (flag: boolean): Promise<void> => {
    for (; await Promise.resolve(flag);) {
        console.log("await-value-for-expressionless-return-true");
        return;
    }
    console.log("await-value-for-expressionless-return-false");
    return;
};

const chooseForDeclarationInitializerValue = async (flag: boolean): Promise<string> => {
    for (let ignored = (console.log("value-for-declaration-initializer"), 1); await Promise.resolve(flag);) {
        return "value-for-declaration-body";
    }
    return "value-for-declaration-fallthrough";
};

const chooseLoopSynchronousThrowPreludeValue = async (flag: boolean): Promise<string> => {
    while (await Promise.resolve(flag)) {
        const reason = "value-sync-throw";
        throw reason;
    }
    return "value-sync-throw-prelude-fallthrough";
};

const chooseLoopSynchronousControlPreludeValue = async (flag: boolean): Promise<string> => {
    while (await Promise.resolve(flag)) {
        if (flag) void "value-sync-control";
        return "value-sync-control-body";
    }
    return "value-sync-control-fallthrough";
};

const chooseLoopSynchronousTryPreludeValue = async (flag: boolean): Promise<string> => {
    while (await Promise.resolve(flag)) {
        try {
            void "value-sync-try";
        } finally {
            void "value-sync-finally";
        }
        return "value-sync-try-body";
    }
    return "value-sync-try-fallthrough";
};

const chooseLoopSynchronousSwitchPreludeValue = async (flag: boolean): Promise<string> => {
    while (await Promise.resolve(flag)) {
        switch (flag ? 1 : 0) {
            case 1:
                void "value-sync-switch";
                break;
            default:
                break;
        }
        return "value-sync-switch-body";
    }
    return "value-sync-switch-fallthrough";
};

const chooseLoopSynchronousIteratorPreludeValue = async (flag: boolean): Promise<string> => {
    while (await Promise.resolve(flag)) {
        for (const item of [1, 2]) void item;
        return "value-sync-iterator-body";
    }
    return "value-sync-iterator-fallthrough";
};

const chooseLoopSynchronousForPreludeValue = async (flag: boolean): Promise<string> => {
    while (await Promise.resolve(flag)) {
        for (let index = 0; index < 1; index++) void index;
        return "value-sync-for-body";
    }
    return "value-sync-for-fallthrough";
};

const chooseLoopSynchronousLoopControlPreludeValue = async (flag: boolean): Promise<string> => {
    while (await Promise.resolve(flag)) {
        let total = 0;
        for (let index = 0; index < 3; index++) {
            if (index === 1) continue;
            total += index;
        }
        return "value-sync-loop-control-" + total;
    }
    return "value-sync-loop-control-fallthrough";
};

const chooseLoopSynchronousIteratorControlPreludeValue = async (flag: boolean): Promise<string> => {
    while (await Promise.resolve(flag)) {
        let total = 0;
        for (const item of [0, 1, 2]) {
            if (item === 1) continue;
            if (item === 2) break;
            total += item;
        }
        return "value-sync-iterator-control-" + total;
    }
    return "value-sync-iterator-control-fallthrough";
};

const chooseLoopSynchronousControlThrowPreludeValue = async (flag: boolean): Promise<string> => {
    while (await Promise.resolve(flag)) {
        let index = 0;
        for (; index < 1; index++) continue;
        throw "value-sync-control-throw-reason";
    }
    return "value-sync-control-throw-fallthrough";
};

const chooseLoopSynchronousCaughtThrowPreludeValue = async (flag: boolean): Promise<string> => {
    while (await Promise.resolve(flag)) {
        try {
            throw "value-sync-caught";
        } catch (reason) {
            void reason;
        }
        return "value-sync-caught-body";
    }
    return "value-sync-caught-fallthrough";
};

const chooseLoopSynchronousCatchRethrowPreludeValue = async (flag: boolean): Promise<string> => {
    while (await Promise.resolve(flag)) {
        try {
            throw "value-sync-catch-source";
        } catch (reason) {
            void reason;
            throw "value-sync-catch-rethrow";
        }
        return "value-sync-catch-body";
    }
    return "value-sync-catch-fallthrough";
};

const chooseLoopSynchronousCaughtPreludeBeforeThrowValue = async (flag: boolean): Promise<string> => {
    while (await Promise.resolve(flag)) {
        try {
            throw "value-sync-caught-before-throw-source";
        } catch (reason) {
            void reason;
        }
        throw "value-sync-caught-before-throw-body";
    }
    return "value-sync-caught-before-throw-fallthrough";
};

const chooseLoopSynchronousCaughtFinallyBeforeThrowValue = async (flag: boolean): Promise<string> => {
    while (await Promise.resolve(flag)) {
        try {
            throw "value-sync-caught-finally-before-throw-source";
        } catch (reason) {
            void reason;
        } finally {
            void "value-sync-caught-finally-before-throw-cleanup";
        }
        throw "value-sync-caught-finally-before-throw-body";
    }
    return "value-sync-caught-finally-before-throw-fallthrough";
};

const chooseLoopSynchronousCaughtFinallyPreludeValue = async (flag: boolean): Promise<string> => {
    while (await Promise.resolve(flag)) {
        try {
            throw "value-sync-caught-finally";
        } catch (reason) {
            void reason;
        } finally {
            void "value-sync-caught-finally-cleanup";
        }
        return "value-sync-caught-finally-body";
    }
    return "value-sync-caught-finally-fallthrough";
};

const chooseLoopSynchronousFinallyThrowPreludeValue = async (flag: boolean): Promise<string> => {
    while (await Promise.resolve(flag)) {
        try {
            throw "value-sync-finally-source";
        } catch (reason) {
            void reason;
        } finally {
            throw "value-sync-finally-override";
        }
        return "value-sync-finally-body";
    }
    return "value-sync-finally-fallthrough";
};

const chooseLoopSynchronousUncaughtFinallyThrowPreludeValue = async (flag: boolean): Promise<string> => {
    while (await Promise.resolve(flag)) {
        try {
            void "value-sync-uncaught-finally-source";
        } finally {
            throw "value-sync-uncaught-finally-override";
        }
        return "value-sync-uncaught-finally-body";
    }
    return "value-sync-uncaught-finally-fallthrough";
};

const chooseArrowThrowWithLocals = async (prefix: string): Promise<string> => {
    const source = prefix + "-throw-source", reason = await laterBodyValue(source);
    throw reason;
};

const chooseArrowMultipleAwaitDeclarators = async (prefix: string): Promise<string> => {
    const first = await laterBodyValue(prefix + "-first"), second = await laterBodyValue(first + "-second");
    return second;
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
chooseLoopReturnAwaitMultiple(true, "body-loop-multiple").then((value) => console.log("await-while-return-await-multiple-true", value));
chooseLoopReturnAwaitMultiple(false, "body-loop-multiple").then((value) => console.log("await-while-return-await-multiple-false", value));
chooseLoopThrowAwaitMultiple(true).catch((reason) => console.log("await-while-throw-await-multiple-true", reason));
chooseLoopThrowAwaitMultiple(false).then((value) => console.log("await-while-throw-await-multiple-false", value));
chooseForReturnAwaitMultiple(true, "body-for-multiple").then((value) => console.log("await-for-return-await-multiple-true", value));
chooseForReturnAwaitMultiple(false, "body-for-multiple").then((value) => console.log("await-for-return-await-multiple-false", value));
chooseLoopReturnAwaitMultiplePrelude(true, "body-loop-multiple").then((value) => console.log("await-while-return-await-multiple-prelude-true", value));
chooseLoopReturnAwaitMultiplePrelude(false, "body-loop-multiple").then((value) => console.log("await-while-return-await-multiple-prelude-false", value));
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
chooseLoopReturnAwaitAssignedAliasPostMultiple(true, "body-return").then((value) => console.log("await-while-return-await-assigned-alias-post-multiple-true", value));
chooseLoopReturnAwaitAssignedAliasPostMultiple(false, "body-return").then((value) => console.log("await-while-return-await-assigned-alias-post-multiple-false", value));
chooseLoopReturnAwaitAliasPostLocal(true, "body-return").then((value) => console.log("await-while-return-await-alias-post-local-true", value));
chooseLoopReturnAwaitAliasPostLocal(false, "body-return").then((value) => console.log("await-while-return-await-alias-post-local-false", value));
chooseLoopThrowAwaitAliasPostLocal(true).catch((reason) => console.log("await-while-throw-await-alias-post-local-true", reason));
chooseLoopThrowAwaitAliasPostLocal(false).then((value) => console.log("await-while-throw-await-alias-post-local-false", value));
chooseLoopReturnAwaitAliasPostMultiple(true, "body-return").then((value) => console.log("await-while-return-await-alias-post-multiple-true", value));
chooseLoopReturnAwaitAliasPostMultiple(false, "body-return").then((value) => console.log("await-while-return-await-alias-post-multiple-false", value));
chooseLoopThrowAwaitAliasPostMultiple(true).catch((reason) => console.log("await-while-throw-await-alias-post-multiple-true", reason));
chooseLoopThrowAwaitAliasPostMultiple(false).then((value) => console.log("await-while-throw-await-alias-post-multiple-false", value));
chooseLoopReturnAwaitAliasPostMultipleLocals(true, "body-return").then((value) => console.log("await-while-return-await-alias-post-multiple-locals-true", value));
chooseLoopReturnAwaitAliasPostMultipleLocals(false, "body-return").then((value) => console.log("await-while-return-await-alias-post-multiple-locals-false", value));
chooseLoopReturnAwaitAliasPostVar(true, "body-return").then((value) => console.log("await-while-return-await-alias-post-var-true", value));
chooseLoopReturnAwaitAliasPostVar(false, "body-return").then((value) => console.log("await-while-return-await-alias-post-var-false", value));
chooseLoopReturnAwaitAliasPostAssignedVar(true, "body-return").then((value) => console.log("await-while-return-await-alias-post-assigned-var-true", value));
chooseLoopReturnAwaitAliasPostAssignedVar(false, "body-return").then((value) => console.log("await-while-return-await-alias-post-assigned-var-false", value));
chooseLoopReturnAwaitVarPrelude(true, "body-return").then((value) => console.log("await-while-return-await-var-prelude-true", value));
chooseLoopReturnAwaitVarPrelude(false, "body-return").then((value) => console.log("await-while-return-await-var-prelude-false", value));
chooseLoopReturnAwaitAssignedVarPrelude(true, "body-return").then((value) => console.log("await-while-return-await-assigned-var-prelude-true", value));
chooseLoopReturnAwaitAssignedVarPrelude(false, "body-return").then((value) => console.log("await-while-return-await-assigned-var-prelude-false", value));
chooseLoopReturnAwaitMultiplePreludeLocals(true, "body-return").then((value) => console.log("await-while-return-await-multiple-prelude-locals-true", value));
chooseLoopReturnAwaitMultiplePreludeLocals(false, "body-return").then((value) => console.log("await-while-return-await-multiple-prelude-locals-false", value));
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
chooseLoopReturnAwaitAliasMutation(true).then((value) => console.log("await-while-return-await-alias-mutation-true", value));
chooseLoopReturnAwaitAliasMutation(false).then((value) => console.log("await-while-return-await-alias-mutation-false", value));
chooseLoopThrowAwaitAliasMutation(true).catch((reason) => console.log("await-while-throw-await-alias-mutation-true", reason));
chooseLoopThrowAwaitAliasMutation(false).then((value) => console.log("await-while-throw-await-alias-mutation-false", value));
chooseLoopReturnAwaitAliasPostTry(true, "body-return").then((value) => console.log("await-while-return-await-alias-post-try-true", value));
chooseLoopReturnAwaitAliasPostTry(false, "body-return").then((value) => console.log("await-while-return-await-alias-post-try-false", value));
chooseLoopThrowAwaitAliasPostTry(true).catch((reason) => console.log("await-while-throw-await-alias-post-try-true", reason));
chooseLoopThrowAwaitAliasPostTry(false).then((value) => console.log("await-while-throw-await-alias-post-try-false", value));
chooseLoopReturnAwaitAliasPostLoop(true, true, "body-return").then((value) => console.log("await-while-return-await-alias-post-loop-true", value));
chooseLoopReturnAwaitAliasPostLoop(true, false, "body-return").then((value) => console.log("await-while-return-await-alias-post-loop-false", value));
chooseLoopReturnAwaitAliasPostLoop(false, true, "body-return").then((value) => console.log("await-while-return-await-alias-post-loop-fallthrough", value));
chooseLoopThrowAwaitAliasPostLoop(true, true).catch((reason) => console.log("await-while-throw-await-alias-post-loop-true", reason));
chooseLoopThrowAwaitAliasPostLoop(true, false).catch((reason) => console.log("await-while-throw-await-alias-post-loop-false", reason));
chooseLoopThrowAwaitAliasPostLoop(false, true).then((value) => console.log("await-while-throw-await-alias-post-loop-fallthrough", value));
chooseLoopReturnAwaitAliasPostFor(true, true, "body-return").then((value) => console.log("await-while-return-await-alias-post-for-true", value));
chooseLoopReturnAwaitAliasPostFor(true, false, "body-return").then((value) => console.log("await-while-return-await-alias-post-for-false", value));
chooseLoopReturnAwaitAliasPostFor(false, true, "body-return").then((value) => console.log("await-while-return-await-alias-post-for-fallthrough", value));
chooseLoopThrowAwaitAliasPostFor(true, true).catch((reason) => console.log("await-while-throw-await-alias-post-for-true", reason));
chooseLoopThrowAwaitAliasPostFor(true, false).catch((reason) => console.log("await-while-throw-await-alias-post-for-false", reason));
chooseLoopThrowAwaitAliasPostFor(false, true).then((value) => console.log("await-while-throw-await-alias-post-for-fallthrough", value));
chooseLoopReturnAwaitAliasPostDo(true, true, "body-return").then((value) => console.log("await-while-return-await-alias-post-do-true", value));
chooseLoopReturnAwaitAliasPostDo(true, false, "body-return").then((value) => console.log("await-while-return-await-alias-post-do-false", value));
chooseLoopReturnAwaitAliasPostDo(false, true, "body-return").then((value) => console.log("await-while-return-await-alias-post-do-fallthrough", value));
chooseLoopThrowAwaitAliasPostDo(true, true).catch((reason) => console.log("await-while-throw-await-alias-post-do-true", reason));
chooseLoopThrowAwaitAliasPostDo(true, false).catch((reason) => console.log("await-while-throw-await-alias-post-do-false", reason));
chooseLoopThrowAwaitAliasPostDo(false, true).then((value) => console.log("await-while-throw-await-alias-post-do-fallthrough", value));
chooseLoopReturnAwaitAliasPostSwitch(true, true, "body-return").then((value) => console.log("await-while-return-await-alias-post-switch-true", value));
chooseLoopReturnAwaitAliasPostSwitch(true, false, "body-return").then((value) => console.log("await-while-return-await-alias-post-switch-false", value));
chooseLoopReturnAwaitAliasPostSwitch(false, true, "body-return").then((value) => console.log("await-while-return-await-alias-post-switch-fallthrough", value));
chooseLoopThrowAwaitAliasPostSwitch(true, true).catch((reason) => console.log("await-while-throw-await-alias-post-switch-true", reason));
chooseLoopThrowAwaitAliasPostSwitch(true, false).catch((reason) => console.log("await-while-throw-await-alias-post-switch-false", reason));
chooseLoopThrowAwaitAliasPostSwitch(false, true).then((value) => console.log("await-while-throw-await-alias-post-switch-fallthrough", value));
chooseLoopReturnAwaitAliasPostForOf(true, "body-return").then((value) => console.log("await-while-return-await-alias-post-for-of-true", value));
chooseLoopReturnAwaitAliasPostForOf(false, "body-return").then((value) => console.log("await-while-return-await-alias-post-for-of-false", value));
chooseLoopThrowAwaitAliasPostForOf(true, "body-throw").catch((reason) => console.log("await-while-throw-await-alias-post-for-of-true", reason));
chooseLoopThrowAwaitAliasPostForOf(false, "body-throw").then((value) => console.log("await-while-throw-await-alias-post-for-of-false", value));
chooseLoopReturnAwaitAliasPostForIn(true, "body-return").then((value) => console.log("await-while-return-await-alias-post-for-in-true", value));
chooseLoopReturnAwaitAliasPostForIn(false, "body-return").then((value) => console.log("await-while-return-await-alias-post-for-in-false", value));
chooseLoopThrowAwaitAliasPostForIn(true, "body-throw").catch((reason) => console.log("await-while-throw-await-alias-post-for-in-true", reason));
chooseLoopThrowAwaitAliasPostForIn(false, "body-throw").then((value) => console.log("await-while-throw-await-alias-post-for-in-false", value));
chooseLoopReturnAwaitAliasPostForOfLocal(true, "body-return").then((value) => console.log("await-while-return-await-alias-post-for-of-local-true", value));
chooseLoopReturnAwaitAliasPostForOfLocal(false, "body-return").then((value) => console.log("await-while-return-await-alias-post-for-of-local-false", value));
chooseLoopReturnAwaitAliasPostForInLocal(true, "body-return").then((value) => console.log("await-while-return-await-alias-post-for-in-local-true", value));
chooseLoopReturnAwaitAliasPostForInLocal(false, "body-return").then((value) => console.log("await-while-return-await-alias-post-for-in-local-false", value));
chooseLoopReturnAwaitAliasPostMutableIterators(true, "body-return").then((value) => console.log("await-while-return-await-alias-post-mutable-iterators-true", value));
chooseLoopReturnAwaitAliasPostMutableIterators(false, "body-return").then((value) => console.log("await-while-return-await-alias-post-mutable-iterators-false", value));
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
new LoopChooser("method-loop-").pickMultiple(true).then((value) => console.log("await-while-method-multiple-true", value));
new LoopChooser("method-loop-").pickMultiple(false).then((value) => console.log("await-while-method-multiple-false", value));
chooseLoopValue(true, "value-loop-").then((value) => console.log("await-while-value-true", value));
chooseLoopValue(false, "value-loop-").then((value) => console.log("await-while-value-false", value));
chooseLoopSynchronousBody(true).then((value) => console.log("await-while-sync-body-true", value));
chooseLoopSynchronousBody(false).then((value) => console.log("await-while-sync-body-false", value));
chooseForSynchronousBody(true).then((value) => console.log("await-for-sync-body-true", value));
chooseForSynchronousBody(false).then((value) => console.log("await-for-sync-body-false", value));
new LoopChooser("method-").pickSynchronousBody(true).then((value) => console.log("await-method-sync-body-true", value));
new LoopChooser("method-").pickSynchronousBody(false).then((value) => console.log("await-method-sync-body-false", value));
chooseLoopSynchronousBodyValue(true).then((value) => console.log("await-value-sync-body-true", value));
chooseLoopSynchronousBodyValue(false).then((value) => console.log("await-value-sync-body-false", value));
chooseLoopSynchronousThrow(true).catch((reason) => console.log("await-while-sync-throw-true", reason));
chooseLoopSynchronousThrow(false).then((value) => console.log("await-while-sync-throw-false", value));
chooseForSynchronousThrow(true).catch((reason) => console.log("await-for-sync-throw-true", reason));
chooseForSynchronousThrow(false).then((value) => console.log("await-for-sync-throw-false", value));
new LoopChooser("method-").pickSynchronousThrow(true).catch((reason) => console.log("await-method-sync-throw-true", reason));
new LoopChooser("method-").pickSynchronousThrow(false).then((value) => console.log("await-method-sync-throw-false", value));
chooseLoopSynchronousThrowValue(true).catch((reason) => console.log("await-value-sync-throw-true", reason));
chooseLoopSynchronousThrowValue(false).then((value) => console.log("await-value-sync-throw-false", value));
chooseLoopSynchronousPrelude(true).then((value) => console.log("await-while-sync-prelude-true", value));
chooseLoopSynchronousPrelude(false).then((value) => console.log("await-while-sync-prelude-false", value));
new LoopChooser("method-").pickSynchronousPrelude(true).then((value) => console.log("await-method-sync-prelude-true", value));
new LoopChooser("method-").pickSynchronousPrelude(false).then((value) => console.log("await-method-sync-prelude-false", value));
chooseLoopSynchronousPreludeValue(true).then((value) => console.log("await-value-sync-prelude-true", value));
chooseLoopSynchronousPreludeValue(false).then((value) => console.log("await-value-sync-prelude-false", value));
chooseForSynchronousPrelude(true).then((value) => console.log("await-for-sync-prelude-true", value));
chooseForSynchronousPrelude(false).then((value) => console.log("await-for-sync-prelude-false", value));
chooseForSynchronousIncrementor(true).then((value) => console.log("await-for-sync-incrementor-true", value));
chooseForSynchronousIncrementor(false).then((value) => console.log("await-for-sync-incrementor-false", value));
new LoopChooser("method-").pickSynchronousIncrementor(true).then((value) => console.log("await-method-sync-incrementor-true", value));
new LoopChooser("method-").pickSynchronousIncrementor(false).then((value) => console.log("await-method-sync-incrementor-false", value));
chooseForSynchronousIncrementorValue(true).then((value) => console.log("await-value-sync-incrementor-true", value));
chooseForSynchronousIncrementorValue(false).then((value) => console.log("await-value-sync-incrementor-false", value));
chooseForSynchronousInitializer(true).then((value) => console.log("await-for-sync-initializer-true", value));
chooseForSynchronousInitializer(false).then((value) => console.log("await-for-sync-initializer-false", value));
new LoopChooser("method-").pickSynchronousInitializer(true).then((value) => console.log("await-method-sync-initializer-true", value));
new LoopChooser("method-").pickSynchronousInitializer(false).then((value) => console.log("await-method-sync-initializer-false", value));
chooseForSynchronousInitializerValue(true).then((value) => console.log("await-value-sync-initializer-true", value));
chooseForSynchronousInitializerValue(false).then((value) => console.log("await-value-sync-initializer-false", value));
chooseLoopExpressionlessReturn(true);
chooseLoopExpressionlessReturn(false);
new LoopChooser("method-").pickExpressionlessReturn(true);
new LoopChooser("method-").pickExpressionlessReturn(false);
chooseExpressionlessReturnValue(true);
chooseExpressionlessReturnValue(false);
chooseForExpressionlessReturn(true);
chooseForExpressionlessReturn(false);
new LoopChooser("method-").pickForExpressionlessReturn(true);
new LoopChooser("method-").pickForExpressionlessReturn(false);
chooseForExpressionlessReturnValue(true);
chooseForExpressionlessReturnValue(false);
chooseForDeclarationInitializer(true).then((value) => console.log("await-for-declaration-initializer-true", value));
chooseForDeclarationInitializer(false).then((value) => console.log("await-for-declaration-initializer-false", value));
new LoopChooser("method-").pickForDeclarationInitializer(true).then((value) => console.log("await-method-for-declaration-initializer-true", value));
new LoopChooser("method-").pickForDeclarationInitializer(false).then((value) => console.log("await-method-for-declaration-initializer-false", value));
chooseForDeclarationInitializerValue(true).then((value) => console.log("await-value-for-declaration-initializer-true", value));
chooseForDeclarationInitializerValue(false).then((value) => console.log("await-value-for-declaration-initializer-false", value));
chooseLoopSynchronousThrowPrelude(true).catch((reason) => console.log("await-while-sync-throw-prelude-true", reason));
chooseLoopSynchronousThrowPrelude(false).then((value) => console.log("await-while-sync-throw-prelude-false", value));
new LoopChooser("method-").pickSynchronousThrowPrelude(true).catch((reason) => console.log("await-method-sync-throw-prelude-true", reason));
new LoopChooser("method-").pickSynchronousThrowPrelude(false).then((value) => console.log("await-method-sync-throw-prelude-false", value));
chooseLoopSynchronousThrowPreludeValue(true).catch((reason) => console.log("await-value-sync-throw-prelude-true", reason));
chooseLoopSynchronousThrowPreludeValue(false).then((value) => console.log("await-value-sync-throw-prelude-false", value));
chooseLoopSynchronousControlPrelude(true).then((value) => console.log("await-while-sync-control-prelude-true", value));
chooseLoopSynchronousControlPrelude(false).then((value) => console.log("await-while-sync-control-prelude-false", value));
new LoopChooser("method-").pickSynchronousControlPrelude(true).then((value) => console.log("await-method-sync-control-prelude-true", value));
new LoopChooser("method-").pickSynchronousControlPrelude(false).then((value) => console.log("await-method-sync-control-prelude-false", value));
chooseLoopSynchronousControlPreludeValue(true).then((value) => console.log("await-value-sync-control-prelude-true", value));
chooseLoopSynchronousControlPreludeValue(false).then((value) => console.log("await-value-sync-control-prelude-false", value));
chooseLoopSynchronousTryPrelude(true).then((value) => console.log("await-while-sync-try-prelude-true", value));
chooseLoopSynchronousTryPrelude(false).then((value) => console.log("await-while-sync-try-prelude-false", value));
new LoopChooser("method-").pickSynchronousTryPrelude(true).then((value) => console.log("await-method-sync-try-prelude-true", value));
new LoopChooser("method-").pickSynchronousTryPrelude(false).then((value) => console.log("await-method-sync-try-prelude-false", value));
chooseLoopSynchronousTryPreludeValue(true).then((value) => console.log("await-value-sync-try-prelude-true", value));
chooseLoopSynchronousTryPreludeValue(false).then((value) => console.log("await-value-sync-try-prelude-false", value));
chooseLoopSynchronousSwitchPrelude(true).then((value) => console.log("await-while-sync-switch-prelude-true", value));
chooseLoopSynchronousSwitchPrelude(false).then((value) => console.log("await-while-sync-switch-prelude-false", value));
new LoopChooser("method-").pickSynchronousSwitchPrelude(true).then((value) => console.log("await-method-sync-switch-prelude-true", value));
new LoopChooser("method-").pickSynchronousSwitchPrelude(false).then((value) => console.log("await-method-sync-switch-prelude-false", value));
chooseLoopSynchronousSwitchPreludeValue(true).then((value) => console.log("await-value-sync-switch-prelude-true", value));
chooseLoopSynchronousSwitchPreludeValue(false).then((value) => console.log("await-value-sync-switch-prelude-false", value));
chooseLoopSynchronousIteratorPrelude(true).then((value) => console.log("await-while-sync-iterator-prelude-true", value));
chooseLoopSynchronousIteratorPrelude(false).then((value) => console.log("await-while-sync-iterator-prelude-false", value));
chooseLoopSynchronousKeyPrelude(true).then((value) => console.log("await-while-sync-key-prelude-true", value));
chooseLoopSynchronousKeyPrelude(false).then((value) => console.log("await-while-sync-key-prelude-false", value));
new LoopChooser("method-").pickSynchronousIteratorPrelude(true).then((value) => console.log("await-method-sync-iterator-prelude-true", value));
new LoopChooser("method-").pickSynchronousIteratorPrelude(false).then((value) => console.log("await-method-sync-iterator-prelude-false", value));
chooseLoopSynchronousIteratorPreludeValue(true).then((value) => console.log("await-value-sync-iterator-prelude-true", value));
chooseLoopSynchronousIteratorPreludeValue(false).then((value) => console.log("await-value-sync-iterator-prelude-false", value));
chooseLoopSynchronousForPrelude(true).then((value) => console.log("await-while-sync-for-prelude-true", value));
chooseLoopSynchronousForPrelude(false).then((value) => console.log("await-while-sync-for-prelude-false", value));
new LoopChooser("method-").pickSynchronousForPrelude(true).then((value) => console.log("await-method-sync-for-prelude-true", value));
new LoopChooser("method-").pickSynchronousForPrelude(false).then((value) => console.log("await-method-sync-for-prelude-false", value));
chooseLoopSynchronousForPreludeValue(true).then((value) => console.log("await-value-sync-for-prelude-true", value));
chooseLoopSynchronousForPreludeValue(false).then((value) => console.log("await-value-sync-for-prelude-false", value));
chooseLoopSynchronousLoopControlPrelude(true).then((value) => console.log("await-while-sync-loop-control-prelude-true", value));
chooseLoopSynchronousLoopControlPrelude(false).then((value) => console.log("await-while-sync-loop-control-prelude-false", value));
new LoopChooser("method-").pickSynchronousLoopControlPrelude(true).then((value) => console.log("await-method-sync-loop-control-prelude-true", value));
new LoopChooser("method-").pickSynchronousLoopControlPrelude(false).then((value) => console.log("await-method-sync-loop-control-prelude-false", value));
chooseLoopSynchronousLoopControlPreludeValue(true).then((value) => console.log("await-value-sync-loop-control-prelude-true", value));
chooseLoopSynchronousLoopControlPreludeValue(false).then((value) => console.log("await-value-sync-loop-control-prelude-false", value));
chooseLoopSynchronousIteratorControlPrelude(true).then((value) => console.log("await-while-sync-iterator-control-prelude-true", value));
chooseLoopSynchronousIteratorControlPrelude(false).then((value) => console.log("await-while-sync-iterator-control-prelude-false", value));
chooseLoopSynchronousKeyControlPrelude(true).then((value) => console.log("await-while-sync-key-control-prelude-true", value));
chooseLoopSynchronousKeyControlPrelude(false).then((value) => console.log("await-while-sync-key-control-prelude-false", value));
new LoopChooser("method-").pickSynchronousIteratorControlPrelude(true).then((value) => console.log("await-method-sync-iterator-control-prelude-true", value));
new LoopChooser("method-").pickSynchronousIteratorControlPrelude(false).then((value) => console.log("await-method-sync-iterator-control-prelude-false", value));
chooseLoopSynchronousIteratorControlPreludeValue(true).then((value) => console.log("await-value-sync-iterator-control-prelude-true", value));
chooseLoopSynchronousIteratorControlPreludeValue(false).then((value) => console.log("await-value-sync-iterator-control-prelude-false", value));
chooseLoopSynchronousControlThrowPrelude(true).catch((reason) => console.log("await-while-sync-control-throw-prelude-true", reason));
chooseLoopSynchronousControlThrowPrelude(false).then((value) => console.log("await-while-sync-control-throw-prelude-false", value));
new LoopChooser("method-").pickSynchronousControlThrowPrelude(true).catch((reason) => console.log("await-method-sync-control-throw-prelude-true", reason));
new LoopChooser("method-").pickSynchronousControlThrowPrelude(false).then((value) => console.log("await-method-sync-control-throw-prelude-false", value));
chooseLoopSynchronousControlThrowPreludeValue(true).catch((reason) => console.log("await-value-sync-control-throw-prelude-true", reason));
chooseLoopSynchronousControlThrowPreludeValue(false).then((value) => console.log("await-value-sync-control-throw-prelude-false", value));
chooseLoopSynchronousCaughtThrowPrelude(true).then((value) => console.log("await-while-sync-caught-prelude-true", value));
chooseLoopSynchronousCaughtThrowPrelude(false).then((value) => console.log("await-while-sync-caught-prelude-false", value));
new LoopChooser("method-").pickSynchronousCaughtThrowPrelude(true).then((value) => console.log("await-method-sync-caught-prelude-true", value));
new LoopChooser("method-").pickSynchronousCaughtThrowPrelude(false).then((value) => console.log("await-method-sync-caught-prelude-false", value));
chooseLoopSynchronousCaughtThrowPreludeValue(true).then((value) => console.log("await-value-sync-caught-prelude-true", value));
chooseLoopSynchronousCaughtThrowPreludeValue(false).then((value) => console.log("await-value-sync-caught-prelude-false", value));
chooseLoopSynchronousCatchRethrowPrelude(true).catch((reason) => console.log("await-while-sync-catch-rethrow-prelude-true", reason));
chooseLoopSynchronousCatchRethrowPrelude(false).then((value) => console.log("await-while-sync-catch-rethrow-prelude-false", value));
new LoopChooser("method-").pickSynchronousCatchRethrowPrelude(true).catch((reason) => console.log("await-method-sync-catch-rethrow-prelude-true", reason));
new LoopChooser("method-").pickSynchronousCatchRethrowPrelude(false).then((value) => console.log("await-method-sync-catch-rethrow-prelude-false", value));
chooseLoopSynchronousCatchRethrowPreludeValue(true).catch((reason) => console.log("await-value-sync-catch-rethrow-prelude-true", reason));
chooseLoopSynchronousCatchRethrowPreludeValue(false).then((value) => console.log("await-value-sync-catch-rethrow-prelude-false", value));
chooseLoopSynchronousCaughtPreludeBeforeThrow(true).catch((reason) => console.log("await-while-sync-caught-before-throw-true", reason));
chooseLoopSynchronousCaughtPreludeBeforeThrow(false).then((value) => console.log("await-while-sync-caught-before-throw-false", value));
new LoopChooser("method-").pickSynchronousCaughtPreludeBeforeThrow(true).catch((reason) => console.log("await-method-sync-caught-before-throw-true", reason));
new LoopChooser("method-").pickSynchronousCaughtPreludeBeforeThrow(false).then((value) => console.log("await-method-sync-caught-before-throw-false", value));
chooseLoopSynchronousCaughtPreludeBeforeThrowValue(true).catch((reason) => console.log("await-value-sync-caught-before-throw-true", reason));
chooseLoopSynchronousCaughtPreludeBeforeThrowValue(false).then((value) => console.log("await-value-sync-caught-before-throw-false", value));
chooseLoopSynchronousCaughtFinallyBeforeThrow(true).catch((reason) => console.log("await-while-sync-caught-finally-before-throw-true", reason));
chooseLoopSynchronousCaughtFinallyBeforeThrow(false).then((value) => console.log("await-while-sync-caught-finally-before-throw-false", value));
new LoopChooser("method-").pickSynchronousCaughtFinallyBeforeThrow(true).catch((reason) => console.log("await-method-sync-caught-finally-before-throw-true", reason));
new LoopChooser("method-").pickSynchronousCaughtFinallyBeforeThrow(false).then((value) => console.log("await-method-sync-caught-finally-before-throw-false", value));
chooseLoopSynchronousCaughtFinallyBeforeThrowValue(true).catch((reason) => console.log("await-value-sync-caught-finally-before-throw-true", reason));
chooseLoopSynchronousCaughtFinallyBeforeThrowValue(false).then((value) => console.log("await-value-sync-caught-finally-before-throw-false", value));
chooseLoopSynchronousCaughtFinallyPrelude(true).then((value) => console.log("await-while-sync-caught-finally-prelude-true", value));
chooseLoopSynchronousCaughtFinallyPrelude(false).then((value) => console.log("await-while-sync-caught-finally-prelude-false", value));
new LoopChooser("method-").pickSynchronousCaughtFinallyPrelude(true).then((value) => console.log("await-method-sync-caught-finally-prelude-true", value));
new LoopChooser("method-").pickSynchronousCaughtFinallyPrelude(false).then((value) => console.log("await-method-sync-caught-finally-prelude-false", value));
chooseLoopSynchronousCaughtFinallyPreludeValue(true).then((value) => console.log("await-value-sync-caught-finally-prelude-true", value));
chooseLoopSynchronousCaughtFinallyPreludeValue(false).then((value) => console.log("await-value-sync-caught-finally-prelude-false", value));
chooseLoopSynchronousFinallyThrowPrelude(true).catch((reason) => console.log("await-while-sync-finally-throw-prelude-true", reason));
chooseLoopSynchronousFinallyThrowPrelude(false).then((value) => console.log("await-while-sync-finally-throw-prelude-false", value));
new LoopChooser("method-").pickSynchronousFinallyThrowPrelude(true).catch((reason) => console.log("await-method-sync-finally-throw-prelude-true", reason));
new LoopChooser("method-").pickSynchronousFinallyThrowPrelude(false).then((value) => console.log("await-method-sync-finally-throw-prelude-false", value));
chooseLoopSynchronousFinallyThrowPreludeValue(true).catch((reason) => console.log("await-value-sync-finally-throw-prelude-true", reason));
chooseLoopSynchronousFinallyThrowPreludeValue(false).then((value) => console.log("await-value-sync-finally-throw-prelude-false", value));
chooseLoopSynchronousUncaughtFinallyThrowPrelude(true).catch((reason) => console.log("await-while-sync-uncaught-finally-throw-prelude-true", reason));
chooseLoopSynchronousUncaughtFinallyThrowPrelude(false).then((value) => console.log("await-while-sync-uncaught-finally-throw-prelude-false", value));
new LoopChooser("method-").pickSynchronousUncaughtFinallyThrowPrelude(true).catch((reason) => console.log("await-method-sync-uncaught-finally-throw-prelude-true", reason));
new LoopChooser("method-").pickSynchronousUncaughtFinallyThrowPrelude(false).then((value) => console.log("await-method-sync-uncaught-finally-throw-prelude-false", value));
chooseLoopSynchronousUncaughtFinallyThrowPreludeValue(true).catch((reason) => console.log("await-value-sync-uncaught-finally-throw-prelude-true", reason));
chooseLoopSynchronousUncaughtFinallyThrowPreludeValue(false).then((value) => console.log("await-value-sync-uncaught-finally-throw-prelude-false", value));
chooseDirectAwaitMultipleLocals("direct-multiple").then((value) => console.log("await-direct-multiple-locals", value));
chooseDirectAwaitMultipleControlPrelude("direct-control").then((value) => console.log("await-direct-multiple-control-prelude", value));
chooseDirectAwaitMultipleVarPrelude("direct-var").then((value) => console.log("await-direct-multiple-var-prelude", value));
chooseDirectAwaitAssignedVarReturn("direct-assigned-var-return").then((value) => console.log("await-direct-assigned-var-return", value));
new AssignedVarReturnChooser().choose("direct-assigned-var-method").then((value) => console.log("await-method-assigned-var-return", value));
chooseArrowAssignedVarReturn("direct-assigned-var-arrow").then((value) => console.log("await-arrow-assigned-var-return", value));
chooseDirectAwaitAssignedMultipleLocals("direct-assigned-multiple").then((value) => console.log("await-direct-assigned-multiple-locals", value));
chooseDirectThrowAwaitMultipleLocals("direct-throw-multiple").catch((reason) => console.log("await-direct-throw-multiple-locals", reason));
chooseMultipleAwaitDeclarators("multiple-await").then((value) => console.log("await-multiple-declarators", value));
chooseLoopInitializerCapture().then((value) => console.log("await-loop-initializer-capture", value));
chooseLoopInitializerCaptureThrow().catch((reason) => console.log("await-loop-initializer-capture-throw", reason));
chooseLoopInitializerMultipleCapture().then((value) => console.log("await-loop-initializer-multiple-capture", value));
chooseLoopInitializerConditionCapture().then((value) => console.log("await-loop-initializer-condition-capture", value));
chooseLoopInitializerVarCapture().then((value) => console.log("await-loop-initializer-var-capture", value));
chooseLoopInitializerVarFallthroughCapture().then((value) => console.log("await-loop-initializer-var-fallthrough", value));
chooseLoopInitializerEscapingVarBreak().then((value) => console.log("await-loop-initializer-escaping-var-break", value));
chooseLoopInitializerEscapingVarMultipleBreak().then((value) => console.log("await-loop-initializer-escaping-var-multiple-break", value));
chooseLoopInitializerEscapingVarBreakAwait().then((value) => console.log("await-loop-initializer-escaping-var-break-await", value));
chooseLoopInitializerEscapingVarBreakThrowAwait().catch((reason) => console.log("await-loop-initializer-escaping-var-break-throw-await", reason));
chooseLoopInitializerEscapingVarFalseBreakAwait().then((value) => console.log("await-loop-initializer-escaping-var-false-break-await", value));
chooseLoopInitializerEscapingVarFalseBreakThrowAwait().catch((reason) => console.log("await-loop-initializer-escaping-var-false-break-throw-await", reason));
new EscapingVarLoopChooser("method-").choose().then((value) => console.log("await-method-loop-initializer-escaping-var-break-await", value));
EscapingVarLoopChooser.chooseStatic().then((value) => console.log("await-static-method-loop-initializer-escaping-var-break-await", value));
chooseEscapingVarLoopValue().then((value) => console.log("await-value-loop-initializer-escaping-var-false-break-await", value));
escapingVarLoopObject.choose().then((value) => console.log("await-object-method-loop-initializer-escaping-var-break-await", value));
chooseLoopInitializerUninitializedEscapingVarBreakAwait().then((value) => console.log("await-loop-initializer-uninitialized-escaping-var-break-await", value));
chooseLoopInitializerUninitializedEscapingVarFalseAwait().then((value) => console.log("await-loop-initializer-uninitialized-escaping-var-false-await", value));
chooseLoopInitializerUninitializedEscapingVarBreakThrowAwait().catch((reason) => console.log("await-loop-initializer-uninitialized-escaping-var-break-throw-await", reason));
chooseLoopInitializerUninitializedEscapingVarFalseThrowAwait().catch((reason) => console.log("await-loop-initializer-uninitialized-escaping-var-false-throw-await", reason));
chooseLoopInitializerEscapingVarIfBreakAwait(true).then((value) => console.log("await-loop-initializer-escaping-var-if-break-true", value));
chooseLoopInitializerEscapingVarIfBreakAwait(false).then((value) => console.log("await-loop-initializer-escaping-var-if-break-false", value));
chooseLoopInitializerEscapingVarTryFinallyBreakAwait().then((value) => console.log("await-loop-initializer-escaping-var-try-finally-break-await", value));
chooseLoopInitializerEscapingVarSwitchBreakAwait(true).then((value) => console.log("await-loop-initializer-escaping-var-switch-break-true", value));
chooseLoopInitializerEscapingVarSwitchBreakAwait(false).then((value) => console.log("await-loop-initializer-escaping-var-switch-break-false", value));
chooseLoopInitializerEscapingVarNestedWhileBreakAwait(true).then((value) => console.log("await-loop-initializer-escaping-var-nested-while-true", value));
chooseLoopInitializerEscapingVarNestedWhileBreakAwait(false).then((value) => console.log("await-loop-initializer-escaping-var-nested-while-false", value));
chooseLoopInitializerEscapingVarNestedDoBreakAwait(true).then((value) => console.log("await-loop-initializer-escaping-var-nested-do-true", value));
chooseLoopInitializerEscapingVarNestedDoBreakAwait(false).then((value) => console.log("await-loop-initializer-escaping-var-nested-do-false", value));
chooseLoopInitializerEscapingVarTryCatchBreakAwait(false).then((value) => console.log("await-loop-initializer-escaping-var-try-catch-try", value));
chooseLoopInitializerEscapingVarTryCatchBreakAwait(true).then((value) => console.log("await-loop-initializer-escaping-var-try-catch-catch", value));
chooseLoopInitializerEscapingVarTryCatchFinallyBreakAwait(false).then((value) => console.log("await-loop-initializer-escaping-var-try-catch-finally-try", value));
chooseLoopInitializerEscapingVarTryCatchFinallyBreakAwait(true).then((value) => console.log("await-loop-initializer-escaping-var-try-catch-finally-catch", value));
chooseLoopInitializerEscapingVarNestedForOfBreakAwait().then((value) => console.log("await-loop-initializer-escaping-var-nested-for-of", value));
chooseLoopInitializerEscapingVarNestedForInBreakAwait().then((value) => console.log("await-loop-initializer-escaping-var-nested-for-in", value));
chooseLoopInitializerEscapingVarNestedForBreakAwait().then((value) => console.log("await-loop-initializer-escaping-var-nested-for", value));
chooseLoopInitializerEscapingVarNestedForOfControlBreakAwait().then((value) => console.log("await-loop-initializer-escaping-var-nested-for-of-control", value));
chooseLoopInitializerEscapingVarNestedForInControlBreakAwait().then((value) => console.log("await-loop-initializer-escaping-var-nested-for-in-control", value));
chooseLoopInitializerEscapingVarContinueAwait().then((value) => console.log("await-loop-initializer-escaping-var-continue", value));
chooseLoopInitializerEscapingVarContinueThrowAwait().catch((reason) => console.log("await-loop-initializer-escaping-var-continue-throw", reason));
chooseLoopInitializerEscapingVarContinueFalseAwait().then((value) => console.log("await-loop-initializer-escaping-var-continue-false", value));
chooseLoopInitializerEscapingVarContinueFalseThrowAwait().catch((reason) => console.log("await-loop-initializer-escaping-var-continue-false-throw", reason));
chooseLoopExpressionInitializerContinueAwait("loop-expression-continue").then((value) => console.log("await-loop-expression-continue", value));
chooseLoopExpressionInitializerContinueThrowAwait("loop-expression-continue-throw").catch((reason) => console.log("await-loop-expression-continue-throw", reason));
chooseLoopMultipleExpressionInitializerContinueAwait("loop-multiple-expression-continue").then((value) => console.log("await-loop-multiple-expression-continue", value));
chooseLoopMultipleExpressionInitializerContinueThrowAwait("loop-multiple-expression-continue-throw").catch((reason) => console.log("await-loop-multiple-expression-continue-throw", reason));
chooseLoopExpressionInitializerBreakAwait("loop-expression-break").then((value) => console.log("await-loop-expression-break", value));
chooseLoopExpressionInitializerBreakThrowAwait("loop-expression-break-throw").catch((reason) => console.log("await-loop-expression-break-throw", reason));
chooseLoopExpressionInitializerFalseBreakAwait("loop-expression-break-false").then((value) => console.log("await-loop-expression-break-false", value));
chooseLoopExpressionInitializerFalseBreakThrowAwait("loop-expression-break-false-throw").catch((reason) => console.log("await-loop-expression-break-false-throw", reason));
chooseLoopTwoAwaitContinueAwait("loop-two-await-continue", true).then((value) => console.log("await-loop-two-await-continue", value));
chooseLoopTwoAwaitOrContinueAwait("loop-two-await-or-continue", true).then((value) => console.log("await-loop-two-await-or-continue", value));
chooseLoopTwoAwaitOrContinueThrowAwait("loop-two-await-or-continue-throw", true).catch((reason) => console.log("await-loop-two-await-or-continue-throw", reason));
new TwoAwaitContinueChooser("-method-body").choose("loop-two-await-method-continue", true).then((value) => console.log("await-loop-two-await-method-continue", value));
chooseTwoAwaitContinueValue("loop-two-await-value-continue", true).then((value) => console.log("await-loop-two-await-value-continue", value));
chooseLoopTwoAwaitControlContinueAwait("loop-two-await-control-continue", true).then((value) => console.log("await-loop-two-await-control-continue", value));
chooseLoopTwoAwaitTryFinallyContinueAwait("loop-two-await-try-finally-continue", true).then((value) => console.log("await-loop-two-await-try-finally-continue", value));
chooseLoopTwoAwaitSwitchContinueAwait("loop-two-await-switch-continue", true).then((value) => console.log("await-loop-two-await-switch-continue", value));
chooseLoopTwoAwaitNestedContinueAwait("loop-two-await-nested-continue", true).then((value) => console.log("await-loop-two-await-nested-continue", value));
chooseLoopTwoAwaitNestedDoContinueAwait("loop-two-await-nested-do-continue", true).then((value) => console.log("await-loop-two-await-nested-do-continue", value));
chooseLoopTwoAwaitForOfContinueAwait("loop-two-await-for-of-continue", true).then((value) => console.log("await-loop-two-await-for-of-continue", value));
new ForContinueFalseChooser("-method-false-initializer").chooseExpressionInitializerFalseBreak("loop-expression-break-false").then((value) => console.log("await-method-loop-expression-break-false", value));
new ForContinueFalseChooser("-method-false-throw-initializer").chooseExpressionInitializerFalseBreakThrow("loop-expression-break-false-throw").catch((reason) => console.log("await-method-loop-expression-break-false-throw", reason));
chooseLoopExpressionInitializerFalseBreakValue("loop-expression-break-false").then((value) => console.log("await-value-loop-expression-break-false", value));
chooseLoopExpressionInitializerFalseBreakThrowValue("loop-expression-break-false-throw").catch((reason) => console.log("await-value-loop-expression-break-false-throw", reason));
new ForContinueFalseChooser("-method-break-initializer").chooseExpressionInitializerBreak("loop-expression-break").then((value) => console.log("await-method-loop-expression-break", value));
new ForContinueFalseChooser("-method-break-throw-initializer").chooseExpressionInitializerBreakThrow("loop-expression-break-throw").catch((reason) => console.log("await-method-loop-expression-break-throw", reason));
chooseLoopExpressionInitializerBreakValue("loop-expression-break").then((value) => console.log("await-value-loop-expression-break", value));
chooseLoopExpressionInitializerBreakThrowValue("loop-expression-break-throw").catch((reason) => console.log("await-value-loop-expression-break-throw", reason));
new ForContinueFalseChooser("-method").choose("loop-escaping-var-continue-false").then((value) => console.log("await-method-loop-initializer-escaping-var-continue-false", value));
new ForContinueFalseChooser("-method-increment").chooseRepeated("loop-escaping-var-continue").then((value) => console.log("await-method-loop-initializer-escaping-var-continue", value));
new ForContinueFalseChooser("-method-throw-increment").chooseRepeatedThrow("loop-escaping-var-continue-throw").catch((reason) => console.log("await-method-loop-initializer-escaping-var-continue-throw", reason));
new ForContinueFalseChooser("-method-initializer").chooseExpressionInitializer("loop-expression-continue").then((value) => console.log("await-method-loop-expression-continue", value));
new ForContinueFalseChooser("-method-throw-initializer").chooseExpressionInitializerThrow("loop-expression-continue-throw").catch((reason) => console.log("await-method-loop-expression-continue-throw", reason));
chooseLoopInitializerEscapingVarContinueFalseValue("loop-escaping-var-continue-false").then((value) => console.log("await-value-loop-initializer-escaping-var-continue-false", value));
chooseLoopInitializerEscapingVarContinueValue("loop-escaping-var-continue").then((value) => console.log("await-value-loop-initializer-escaping-var-continue", value));
chooseLoopInitializerEscapingVarContinueThrowValue("loop-escaping-var-continue-throw").catch((reason) => console.log("await-value-loop-initializer-escaping-var-continue-throw", reason));
chooseLoopExpressionInitializerContinueValue("loop-expression-continue").then((value) => console.log("await-value-loop-expression-continue", value));
chooseLoopExpressionInitializerContinueThrowValue("loop-expression-continue-throw").catch((reason) => console.log("await-value-loop-expression-continue-throw", reason));
chooseWhileContinueAwait("while-escaping-continue", true).then((value) => console.log("await-while-escaping-var-continue", value));
chooseWhileContinueAwait("while-escaping-continue-false", false).then((value) => console.log("await-while-escaping-var-continue-false", value));
chooseWhileContinueThrowAwait("while-escaping-continue-throw", true).catch((reason) => console.log("await-while-escaping-var-continue-throw", reason));
new WhileContinueChooser("-method-").choose("while-escaping-continue", true).then((value) => console.log("await-method-escaping-var-continue", value));
chooseWhileContinueValue("while-value-escaping-continue", true).then((value) => console.log("await-value-escaping-var-continue", value));
chooseWhileContinueIfAwait("while-if-escaping-continue", true, true).then((value) => console.log("await-while-escaping-var-continue-if-true", value));
chooseWhileContinueIfAwait("while-if-escaping-continue", true, false).then((value) => console.log("await-while-escaping-var-continue-if-false", value));
chooseWhileContinueTryFinallyAwait("while-try-escaping-continue", true).then((value) => console.log("await-while-escaping-var-continue-try-finally", value));
chooseWhileContinueTryCatchAwait("while-catch-escaping-continue", true, false).then((value) => console.log("await-while-escaping-var-continue-try-catch-try", value));
chooseWhileContinueTryCatchAwait("while-catch-escaping-continue", true, true).then((value) => console.log("await-while-escaping-var-continue-try-catch-catch", value));
chooseWhileContinueTryCatchFinallyAwait("while-catch-finally-escaping-continue", true, false).then((value) => console.log("await-while-escaping-var-continue-try-catch-finally-try", value));
chooseWhileContinueTryCatchFinallyAwait("while-catch-finally-escaping-continue", true, true).then((value) => console.log("await-while-escaping-var-continue-try-catch-finally-catch", value));
chooseWhileContinueSwitchAwait("while-switch-escaping-continue", true, true).then((value) => console.log("await-while-escaping-var-continue-switch-true", value));
chooseWhileContinueSwitchAwait("while-switch-escaping-continue", true, false).then((value) => console.log("await-while-escaping-var-continue-switch-false", value));
chooseWhileContinueNestedWhileAwait("while-nested-escaping-continue", true, true).then((value) => console.log("await-while-escaping-var-continue-nested-true", value));
chooseWhileContinueNestedWhileAwait("while-nested-escaping-continue", true, false).then((value) => console.log("await-while-escaping-var-continue-nested-false", value));
chooseWhileContinueNestedDoAwait("while-do-escaping-continue", true, true).then((value) => console.log("await-while-escaping-var-continue-do-true", value));
chooseWhileContinueNestedDoAwait("while-do-escaping-continue", true, false).then((value) => console.log("await-while-escaping-var-continue-do-false", value));
chooseWhileContinueNestedIteratorsAwait("while-iterators-escaping-continue", true).then((value) => console.log("await-while-escaping-var-continue-iterators", value));
chooseWhileContinueNestedForAwait("while-for-escaping-continue", true).then((value) => console.log("await-while-escaping-var-continue-for", value));
chooseWhileContinueNestedIteratorControlAwait("while-iterator-control-escaping-continue", true).then((value) => console.log("await-while-escaping-var-continue-iterator-control", value));
chooseLoopInitializerUninitializedVarCapture().then((value) => console.log("await-loop-initializer-uninitialized-var-capture", value));
chooseLoopInitializerTypedUninitializedVarCapture().then((value) => console.log("await-loop-initializer-typed-uninitialized-var-capture", value));
chooseLoopInitializerUninitializedVarFallthroughCapture().then((value) => console.log("await-loop-initializer-uninitialized-var-fallthrough", value));
chooseLoopInitializerUninitializedLetCapture().then((value) => console.log("await-loop-initializer-uninitialized-let-capture", value));
chooseLoopInitializerUninitializedLetConditionCapture().then((value) => console.log("await-loop-initializer-uninitialized-let-condition-capture", value));
chooseLoopInitializerUninitializedLetConditionFallthrough().then((value) => console.log("await-loop-initializer-uninitialized-let-condition-fallthrough", value));
chooseLoopInitializerTypedUninitializedLetCondition().then((value) => console.log("await-loop-initializer-typed-uninitialized-let-condition", value));
new LoopInitializerCaptureChooser().choose().then((value) => console.log("await-method-loop-initializer-condition-capture", value));
chooseLoopInitializerConditionCaptureValue().then((value) => console.log("await-value-loop-initializer-condition-capture", value));
new LoopInitializerCaptureChooser().chooseUninitializedLetCondition().then((value) => console.log("await-method-loop-initializer-uninitialized-let-condition-capture", value));
chooseLoopInitializerUninitializedLetConditionValue().then((value) => console.log("await-value-loop-initializer-uninitialized-let-condition-capture", value));
new LoopChooser("method-").throwWithLocals().catch((reason) => console.log("await-method-throw-multiple-locals", reason));
new LoopChooser("method-").multipleAwaitDeclarators().then((value) => console.log("await-method-multiple-declarators", value));
chooseArrowThrowWithLocals("arrow").catch((reason) => console.log("await-arrow-throw-multiple-locals", reason));
chooseArrowMultipleAwaitDeclarators("arrow").then((value) => console.log("await-arrow-multiple-declarators", value));
