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

arrow().then((value: string): void => {
    console.log("arrow:", value);
});

arrowParam("value-").then((value: string): void => {
    console.log("arrow-param:", value);
});
