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

    async loopAfterAwait(count: number): Promise<string> {
        const value = await delay(26, "loop");
        let result = this.prefix;
        let index = 0;
        while (index < count) {
            result = result + value;
            index = index + 1;
        }
        return result;
    }

    async forAfterAwait(count: number): Promise<string> {
        const value = await delay(27, "for");
        let result = this.prefix;
        for (let index = 0; index < count; index = index + 1) {
            result = result + value;
        }
        return result;
    }

    async forOfAfterAwait(): Promise<string> {
        const value = await delay(28, "of");
        const parts = [this.prefix, value, "!"];
        let result = "";
        for (const part of parts) {
            result = result + part;
        }
        return result;
    }

    async loopControlAfterAwait(): Promise<string> {
        const value = await delay(29, "ctrl");
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
        const value = await delay(30, "try");
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
        const value = await delay(31, "throw");
        throw this.prefix + value;
        return "never";
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

new Worker("loop-").loopAfterAwait(2).then((value: string): void => {
    console.log("method-loop:", value);
});

new Worker("for-").forAfterAwait(2).then((value: string): void => {
    console.log("method-for:", value);
});

new Worker("forof-").forOfAfterAwait().then((value: string): void => {
    console.log("method-for-of:", value);
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

arrow().then((value: string): void => {
    console.log("arrow:", value);
});

arrowParam("value-").then((value: string): void => {
    console.log("arrow-param:", value);
});
