import { setTimeout as delay } from "node:timers/promises";

async function suffix(): Promise<string> {
    const value = await delay(5, "ready");
    return value + "!";
}

async function doubled(): Promise<number> {
    const value = await delay(10, 21);
    return value * 2;
}

async function tagged(prefix: string): Promise<string> {
    const value = await delay(12, "tag");
    return prefix + value;
}

async function staged(prefix: string): Promise<string> {
    const value = await delay(14, "stage");
    const decorated = prefix + value;
    const finalLabel = decorated + "!";
    return finalLabel;
}

class Worker {
    prefix: string;

    constructor(prefix: string) {
        this.prefix = prefix;
    }

    async label(): Promise<string> {
        const value = await delay(15, "method");
        return value + "!";
    }

    async prefixed(prefix: string): Promise<string> {
        const value = await delay(18, "method-param");
        return prefix + value;
    }

    async thisPrefixed(): Promise<string> {
        const value = await delay(19, "this-param");
        return this.prefix + value;
    }

    async stagedThis(suffix: string): Promise<string> {
        const value = await delay(21, "method-stage");
        const decorated = this.prefix + value;
        const finalLabel = decorated + suffix;
        return finalLabel;
    }

    async sideEffectThis(): Promise<string> {
        const value = await delay(23, "side");
        this.prefix = this.prefix + value;
        return this.prefix;
    }

    async conditionalSideEffect(flag: boolean): Promise<string> {
        const value = await delay(24, "branch");
        if (flag) {
            this.prefix = this.prefix + value;
        } else {
            this.prefix = this.prefix + "miss";
        }
        return this.prefix;
    }

    async branchLet(flag: boolean): Promise<string> {
        const value = await delay(25, "let");
        let result = "";
        if (flag) {
            result = this.prefix + value;
        } else {
            result = this.prefix + "miss";
        }
        return result;
    }

    async branchUninitializedLet(flag: boolean): Promise<string> {
        const value = await delay(flag ? 26 : 27, "uninit");
        let result: string;
        if (flag) {
            result = this.prefix + value;
        } else {
            result = this.prefix + "miss";
        }
        return result;
    }

    async loopAfterAwait(count: number): Promise<string> {
        const value = await delay(28, "loop");
        let result = this.prefix;
        let index = 0;
        while (index < count) {
            result = result + value;
            index = index + 1;
        }
        return result;
    }

    async forAfterAwait(count: number): Promise<string> {
        const value = await delay(29, "for");
        let result = this.prefix;
        for (let index = 0; index < count; index = index + 1) {
            result = result + value;
        }
        return result;
    }

    async forContinueAfterAwait(count: number): Promise<string> {
        const value = await delay(30, "for-continue");
        let result = this.prefix;
        for (let index = 0; index < count; index = index + 1) {
            if (index === 1) continue;
            result = result + value + index;
        }
        return result;
    }

    async forOfAfterAwait(): Promise<string> {
        const value = await delay(31, "of");
        const parts = [this.prefix, value, "!"];
        let result = "";
        for (const part of parts) {
            result = result + part;
        }
        return result;
    }

    async forInAfterAwait(): Promise<string> {
        const value = await delay(32, "in");
        let result = this.prefix;
        for (const key in [this.prefix, value, "!"]) {
            if (key === "1") continue;
            if (key === "2") break;
            result = result + key + value;
        }
        return result;
    }

    async loopControlAfterAwait(): Promise<string> {
        const value = await delay(33, "ctrl");
        let result = this.prefix;
        let index = 0;
        while (index < 5) {
            if (index === 1) {
                index = index + 1;
                continue;
            }
            if (index === 3) break;
            result = result + value + index;
            index = index + 1;
        }
        return result;
    }

    async tryCatchAfterAwait(): Promise<string> {
        const value = await delay(34, "try");
        let result = this.prefix;
        try {
            throw value + "!";
        } catch (e) {
            result = result + "caught-" + e;
        } finally {
            result = result + "-finally";
        }
        return result;
    }

    async throwAfterAwait(): Promise<string> {
        const value = await delay(35, "throw");
        throw this.prefix + value;
        return "never";
    }

    async earlyReturnAfterAwait(flag: boolean): Promise<string> {
        const value = await delay(flag ? 36 : 37, "return");
        if (flag) return this.prefix + value;
        return this.prefix + "late-" + value;
    }

    async switchReturnAfterAwait(kind: string): Promise<string> {
        const value = await delay(kind === "a" ? 38 : 39, kind);
        switch (value) {
            case "a":
                return this.prefix + "alpha";
            case "b":
                return this.prefix + "beta";
            default:
                return this.prefix + "other-" + value;
        }
        return "never";
    }

    async switchBreakAfterAwait(kind: string): Promise<string> {
        const value = await delay(kind === "b" ? 40 : 41, kind);
        let result = this.prefix;
        switch (value) {
            case "a":
                result = result + "alpha";
                break;
            case "b":
                result = result + "beta";
                break;
            default:
                result = result + "other-" + value;
                break;
        }
        return result;
    }

    async voidAfterAwait(): Promise<string> {
        const ignored = await delay(42);
        return this.prefix + "void";
    }
}

const arrow = async (): Promise<string> => {
    const value = await delay(20, "arrow");
    return value + "!";
};

const arrowParam = async (prefix: string): Promise<string> => {
    const value = await delay(22, "arrow-param");
    return prefix + value;
};

suffix().then((value: string): void => {
    console.log("suffix:", value);
});

doubled().then((value: number): void => {
    console.log("double:", value);
});

tagged("fn-").then((value: string): void => {
    console.log("tagged:", value);
});

staged("fn-").then((value: string): void => {
    console.log("staged:", value);
});

new Worker("job-").label().then((value: string): void => {
    console.log("method:", value);
});

new Worker("job-").prefixed("class-").then((value: string): void => {
    console.log("method-param:", value);
});

new Worker("this-").thisPrefixed().then((value: string): void => {
    console.log("method-this:", value);
});

new Worker("this-").stagedThis("!").then((value: string): void => {
    console.log("method-staged-this:", value);
});

new Worker("effect-").sideEffectThis().then((value: string): void => {
    console.log("method-side-effect:", value);
});

new Worker("if-").conditionalSideEffect(true).then((value: string): void => {
    console.log("method-if-side-effect:", value);
});

new Worker("branch-").branchLet(true).then((value: string): void => {
    console.log("method-branch-let:", value);
});

new Worker("uninit-").branchUninitializedLet(true).then((value: string): void => {
    console.log("method-branch-uninit-let:", value);
});

new Worker("loop-").loopAfterAwait(2).then((value: string): void => {
    console.log("method-loop:", value);
});

new Worker("for-").forAfterAwait(2).then((value: string): void => {
    console.log("method-for:", value);
});

new Worker("for-continue-").forContinueAfterAwait(3).then((value: string): void => {
    console.log("method-for-continue:", value);
});

new Worker("forof-").forOfAfterAwait().then((value: string): void => {
    console.log("method-for-of:", value);
});

new Worker("forin-").forInAfterAwait().then((value: string): void => {
    console.log("method-for-in:", value);
});

new Worker("control-").loopControlAfterAwait().then((value: string): void => {
    console.log("method-loop-control:", value);
});

new Worker("try-").tryCatchAfterAwait().then((value: string): void => {
    console.log("method-try-catch:", value);
});

new Worker("reject-").throwAfterAwait().catch((reason: string): string => {
    console.log("method-throw:", reason);
    return "handled";
});

new Worker("return-").earlyReturnAfterAwait(true).then((value: string): void => {
    console.log("method-early-return:", value);
});

new Worker("return-").earlyReturnAfterAwait(false).then((value: string): void => {
    console.log("method-late-return:", value);
});

new Worker("switch-").switchReturnAfterAwait("a").then((value: string): void => {
    console.log("method-switch-a:", value);
});

new Worker("switch-").switchReturnAfterAwait("z").then((value: string): void => {
    console.log("method-switch-default:", value);
});

new Worker("switch-break-").switchBreakAfterAwait("b").then((value: string): void => {
    console.log("method-switch-break:", value);
});

new Worker("void-").voidAfterAwait().then((value: string): void => {
    console.log("method-void-await:", value);
});

arrow().then((value: string): void => {
    console.log("arrow:", value);
});

arrowParam("value-").then((value: string): void => {
    console.log("arrow-param:", value);
});
