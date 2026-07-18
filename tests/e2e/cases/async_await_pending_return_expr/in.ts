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

async function twoAwait(prefix: string): Promise<string> {
    const first = await delay(45, "one");
    const second = await delay(46, prefix + first + "-two");
    return first + ":" + second + "!";
}

async function threeAwait(prefix: string): Promise<string> {
    const first = await delay(51, "one");
    const second = await delay(52, prefix + first + "-two");
    const third = await delay(53, first + ":" + second + "-three");
    return first + ":" + second + ":" + third + "!";
}

async function fourAwait(prefix: string): Promise<string> {
    const first = await delay(60, "one");
    const second = await delay(61, prefix + first + "-two");
    const third = await delay(62, first + ":" + second + "-three");
    const fourth = await delay(63, first + ":" + second + ":" + third + "-four");
    return first + ":" + second + ":" + third + ":" + fourth + "!";
}

async function fiveAwait(prefix: string): Promise<string> {
    const first = await delay(72, "one");
    const second = await delay(73, prefix + first + "-two");
    const third = await delay(74, first + ":" + second + "-three");
    const fourth = await delay(75, first + ":" + second + ":" + third + "-four");
    const fifth = await delay(76, first + ":" + second + ":" + third + ":" + fourth + "-five");
    return first + ":" + second + ":" + third + ":" + fourth + ":" + fifth + "!";
}

async function inlineAwaitReturn(prefix: string): Promise<string> {
    return prefix + await delay(87, "inline") + "!";
}

async function branchReturnAwait(flag: boolean): Promise<string> {
    if (flag) return await delay(90, "branch-true");
    return await delay(91, "branch-false");
}

async function branchInlineAwaitReturn(flag: boolean, prefix: string): Promise<string> {
    if (flag) return prefix + await delay(96, "inline-true") + "!";
    return prefix + await delay(97, "inline-false") + "!";
}

async function branchMixedInlineAwaitReturn(flag: boolean, prefix: string): Promise<string> {
    if (flag) return prefix + await delay(120, "branch-mixed-await") + "!";
    return prefix + "branch-mixed-sync!";
}

async function branchConditionalInlineAwaitReturn(outer: boolean, inner: boolean, prefix: string): Promise<string> {
    if (outer) {
        return inner
            ? prefix + await delay(129, "branch-conditional-inner") + "!"
            : prefix + "branch-conditional-sync!";
    }
    return prefix + await delay(130, "branch-conditional-fallthrough") + "!";
}

async function nestedBranchInlineAwaitReturn(outer: boolean, inner: boolean, prefix: string): Promise<string> {
    if (outer) {
        if (inner) return prefix + await delay(102, "nested-inner") + "!";
        return prefix + await delay(103, "nested-outer") + "!";
    }
    return prefix + await delay(104, "nested-fallthrough") + "!";
}

async function conditionalInlineAwaitReturn(flag: boolean, prefix: string): Promise<string> {
    return flag
        ? prefix + await delay(111, "conditional-true") + "!"
        : prefix + await delay(112, "conditional-false") + "!";
}

async function conditionalMixedInlineAwaitReturn(flag: boolean, prefix: string): Promise<string> {
    return flag
        ? prefix + await delay(117, "conditional-mixed-await") + "!"
        : prefix + "conditional-mixed-sync!";
}

async function nestedConditionalInlineAwaitReturn(outer: boolean, inner: boolean, prefix: string): Promise<string> {
    return outer
        ? inner
            ? prefix + await delay(123, "nested-conditional-inner") + "!"
            : prefix + "nested-conditional-sync!"
        : prefix + await delay(124, "nested-conditional-fallthrough") + "!";
}

async function logicalOrInlineAwaitReturn(prefix: string): Promise<string> {
    return prefix || await delay(135, "logical-or-await");
}

async function logicalAndInlineAwaitReturn(flag: boolean): Promise<any> {
    return flag && await delay(136, "logical-and-await");
}

async function nullishInlineAwaitReturn(prefix: string | undefined): Promise<string> {
    return prefix ?? await delay(141, "nullish-await");
}

async function preludeLocalInlineAwaitReturn(prefix: string): Promise<string> {
    const label = prefix + "prelude-local-";
    return label + await delay(144, "await") + "!";
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

    async doWhileAfterAwait(count: number): Promise<string> {
        const value = await delay(44, "do");
        let result = this.prefix;
        let index = 0;
        do {
            result = result + value + index;
            index = index + 1;
        } while (index < count);
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

    async expressionlessReturnAfterAwait(): Promise<void> {
        const value = await delay(43, "done");
        this.prefix = this.prefix + value;
        return;
    }

    async twoAwaitMethod(prefix: string): Promise<string> {
        const first = await delay(47, "method-one");
        const second = await delay(48, prefix + this.prefix + first);
        return first + ":" + second + "!";
    }

    async threeAwaitMethod(prefix: string): Promise<string> {
        const first = await delay(54, "method-one");
        const second = await delay(55, prefix + this.prefix + first);
        const third = await delay(56, first + ":" + second + "-three");
        return first + ":" + second + ":" + third + "!";
    }

    async fourAwaitMethod(prefix: string): Promise<string> {
        const first = await delay(64, "method-one");
        const second = await delay(65, prefix + this.prefix + first);
        const third = await delay(66, first + ":" + second + "-three");
        const fourth = await delay(67, first + ":" + second + ":" + third + "-four");
        return first + ":" + second + ":" + third + ":" + fourth + "!";
    }

    async fiveAwaitMethod(prefix: string): Promise<string> {
        const first = await delay(77, "method-one");
        const second = await delay(78, prefix + this.prefix + first);
        const third = await delay(79, first + ":" + second + "-three");
        const fourth = await delay(80, first + ":" + second + ":" + third + "-four");
        const fifth = await delay(81, first + ":" + second + ":" + third + ":" + fourth + "-five");
        return first + ":" + second + ":" + third + ":" + fourth + ":" + fifth + "!";
    }

    async inlineAwaitReturnMethod(prefix: string): Promise<string> {
        return this.prefix + prefix + await delay(88, "method-inline") + "!";
    }

    async branchReturnAwaitMethod(flag: boolean): Promise<string> {
        if (flag) return await delay(92, this.prefix + "branch-true");
        return await delay(93, this.prefix + "branch-false");
    }

    async branchInlineAwaitReturnMethod(flag: boolean, prefix: string): Promise<string> {
        if (flag) return this.prefix + prefix + await delay(98, "method-inline-true") + "!";
        return this.prefix + prefix + await delay(99, "method-inline-false") + "!";
    }

    async branchMixedInlineAwaitReturnMethod(flag: boolean, prefix: string): Promise<string> {
        if (flag) return this.prefix + prefix + "method-branch-mixed-sync!";
        return this.prefix + prefix + await delay(121, "method-branch-mixed-await") + "!";
    }

    async branchConditionalInlineAwaitReturnMethod(outer: boolean, inner: boolean, prefix: string): Promise<string> {
        if (outer) {
            return inner
                ? this.prefix + prefix + await delay(131, "method-branch-conditional-inner") + "!"
                : this.prefix + prefix + "method-branch-conditional-sync!";
        }
        return this.prefix + prefix + await delay(132, "method-branch-conditional-fallthrough") + "!";
    }

    async nestedBranchInlineAwaitReturnMethod(outer: boolean, inner: boolean, prefix: string): Promise<string> {
        if (outer) {
            if (inner) return this.prefix + prefix + await delay(105, "method-nested-inner") + "!";
            return this.prefix + prefix + await delay(106, "method-nested-outer") + "!";
        }
        return this.prefix + prefix + await delay(107, "method-nested-fallthrough") + "!";
    }

    async conditionalInlineAwaitReturnMethod(flag: boolean, prefix: string): Promise<string> {
        return flag
            ? this.prefix + prefix + await delay(113, "method-conditional-true") + "!"
            : this.prefix + prefix + await delay(114, "method-conditional-false") + "!";
    }

    async conditionalMixedInlineAwaitReturnMethod(flag: boolean, prefix: string): Promise<string> {
        return flag
            ? this.prefix + prefix + "method-conditional-mixed-sync!"
            : this.prefix + prefix + await delay(118, "method-conditional-mixed-await") + "!";
    }

    async nestedConditionalInlineAwaitReturnMethod(outer: boolean, inner: boolean, prefix: string): Promise<string> {
        return outer
            ? inner
                ? this.prefix + prefix + await delay(125, "method-nested-conditional-inner") + "!"
                : this.prefix + prefix + "method-nested-conditional-sync!"
            : this.prefix + prefix + await delay(126, "method-nested-conditional-fallthrough") + "!";
    }

    async logicalOrInlineAwaitReturnMethod(): Promise<string> {
        return this.prefix || await delay(137, "method-logical-or-await");
    }

    async logicalAndInlineAwaitReturnMethod(flag: boolean): Promise<any> {
        return flag && await delay(138, "method-logical-and-await");
    }

    async nullishInlineAwaitReturnMethod(prefix: string | undefined): Promise<string> {
        return prefix ?? await delay(142, "method-nullish-await");
    }

    async preludeLocalInlineAwaitReturnMethod(prefix: string): Promise<string> {
        const label = this.prefix + prefix + "method-prelude-local-";
        return label + await delay(145, "await") + "!";
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

const arrowTwoAwait = async (prefix: string): Promise<string> => {
    const first = await delay(49, "arrow-one");
    const second = await delay(50, prefix + first);
    return first + ":" + second + "!";
};

const arrowThreeAwait = async (prefix: string): Promise<string> => {
    const first = await delay(57, "arrow-one");
    const second = await delay(58, prefix + first);
    const third = await delay(59, first + ":" + second + "-three");
    return first + ":" + second + ":" + third + "!";
};

const arrowFourAwait = async (prefix: string): Promise<string> => {
    const first = await delay(68, "arrow-one");
    const second = await delay(69, prefix + first);
    const third = await delay(70, first + ":" + second + "-three");
    const fourth = await delay(71, first + ":" + second + ":" + third + "-four");
    return first + ":" + second + ":" + third + ":" + fourth + "!";
};

const arrowFiveAwait = async (prefix: string): Promise<string> => {
    const first = await delay(82, "arrow-one");
    const second = await delay(83, prefix + first);
    const third = await delay(84, first + ":" + second + "-three");
    const fourth = await delay(85, first + ":" + second + ":" + third + "-four");
    const fifth = await delay(86, first + ":" + second + ":" + third + ":" + fourth + "-five");
    return first + ":" + second + ":" + third + ":" + fourth + ":" + fifth + "!";
};

const arrowInlineAwaitReturn = async (prefix: string): Promise<string> => {
    return prefix + await delay(89, "arrow-inline") + "!";
};

const arrowBranchReturnAwait = async (flag: boolean): Promise<string> => {
    if (flag) return await delay(94, "arrow-true");
    return await delay(95, "arrow-false");
};

const arrowBranchInlineAwaitReturn = async (flag: boolean, prefix: string): Promise<string> => {
    if (flag) return prefix + await delay(100, "arrow-inline-true") + "!";
    return prefix + await delay(101, "arrow-inline-false") + "!";
};

const arrowBranchMixedInlineAwaitReturn = async (flag: boolean, prefix: string): Promise<string> => {
    if (flag) return prefix + await delay(122, "arrow-branch-mixed-await") + "!";
    return prefix + "arrow-branch-mixed-sync!";
};

const arrowBranchConditionalInlineAwaitReturn = async (outer: boolean, inner: boolean, prefix: string): Promise<string> => {
    if (outer) {
        return inner
            ? prefix + await delay(133, "arrow-branch-conditional-inner") + "!"
            : prefix + "arrow-branch-conditional-sync!";
    }
    return prefix + await delay(134, "arrow-branch-conditional-fallthrough") + "!";
};

const arrowNestedBranchInlineAwaitReturn = async (outer: boolean, inner: boolean, prefix: string): Promise<string> => {
    if (outer) {
        if (inner) return prefix + await delay(108, "arrow-nested-inner") + "!";
        return prefix + await delay(109, "arrow-nested-outer") + "!";
    }
    return prefix + await delay(110, "arrow-nested-fallthrough") + "!";
};

const arrowConditionalInlineAwaitReturn = async (flag: boolean, prefix: string): Promise<string> => {
    return flag
        ? prefix + await delay(115, "arrow-conditional-true") + "!"
        : prefix + await delay(116, "arrow-conditional-false") + "!";
};

const arrowConditionalMixedInlineAwaitReturn = async (flag: boolean, prefix: string): Promise<string> => {
    return flag
        ? prefix + await delay(119, "arrow-conditional-mixed-await") + "!"
        : prefix + "arrow-conditional-mixed-sync!";
};

const arrowNestedConditionalInlineAwaitReturn = async (outer: boolean, inner: boolean, prefix: string): Promise<string> => {
    return outer
        ? inner
            ? prefix + await delay(127, "arrow-nested-conditional-inner") + "!"
            : prefix + "arrow-nested-conditional-sync!"
        : prefix + await delay(128, "arrow-nested-conditional-fallthrough") + "!";
};

const arrowLogicalOrInlineAwaitReturn = async (prefix: string): Promise<string> => {
    return prefix || await delay(139, "arrow-logical-or-await");
};

const arrowLogicalAndInlineAwaitReturn = async (flag: boolean): Promise<any> => {
    return flag && await delay(140, "arrow-logical-and-await");
};

const arrowNullishInlineAwaitReturn = async (prefix: string | undefined): Promise<string> => {
    return prefix ?? await delay(143, "arrow-nullish-await");
};

const arrowPreludeLocalInlineAwaitReturn = async (prefix: string): Promise<string> => {
    const label = prefix + "arrow-prelude-";
    const decorated = label + "local-";
    return decorated + await delay(146, "await") + "!";
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

twoAwait("fn-").then((value: string): void => {
    console.log("two-await:", value);
});

threeAwait("fn-").then((value: string): void => {
    console.log("three-await:", value);
});

fourAwait("fn-").then((value: string): void => {
    console.log("four-await:", value);
});

fiveAwait("fn-").then((value: string): void => {
    console.log("five-await:", value);
});

inlineAwaitReturn("fn-").then((value: string): void => {
    console.log("inline-await-return:", value);
});

branchReturnAwait(true).then((value: string): void => {
    console.log("branch-return-await-true:", value);
});

branchReturnAwait(false).then((value: string): void => {
    console.log("branch-return-await-false:", value);
});

branchInlineAwaitReturn(true, "fn-").then((value: string): void => {
    console.log("branch-inline-await-return-true:", value);
});

branchInlineAwaitReturn(false, "fn-").then((value: string): void => {
    console.log("branch-inline-await-return-false:", value);
});

branchMixedInlineAwaitReturn(true, "fn-").then((value: string): void => {
    console.log("branch-mixed-inline-await-return-await:", value);
});

branchMixedInlineAwaitReturn(false, "fn-").then((value: string): void => {
    console.log("branch-mixed-inline-await-return-sync:", value);
});

branchConditionalInlineAwaitReturn(true, true, "fn-").then((value: string): void => {
    console.log("branch-conditional-inline-await-return-inner:", value);
});

branchConditionalInlineAwaitReturn(true, false, "fn-").then((value: string): void => {
    console.log("branch-conditional-inline-await-return-sync:", value);
});

branchConditionalInlineAwaitReturn(false, false, "fn-").then((value: string): void => {
    console.log("branch-conditional-inline-await-return-fallthrough:", value);
});

nestedBranchInlineAwaitReturn(true, true, "fn-").then((value: string): void => {
    console.log("nested-branch-inline-await-return-inner:", value);
});

nestedBranchInlineAwaitReturn(true, false, "fn-").then((value: string): void => {
    console.log("nested-branch-inline-await-return-outer:", value);
});

nestedBranchInlineAwaitReturn(false, false, "fn-").then((value: string): void => {
    console.log("nested-branch-inline-await-return-fallthrough:", value);
});

conditionalInlineAwaitReturn(true, "fn-").then((value: string): void => {
    console.log("conditional-inline-await-return-true:", value);
});

conditionalInlineAwaitReturn(false, "fn-").then((value: string): void => {
    console.log("conditional-inline-await-return-false:", value);
});

conditionalMixedInlineAwaitReturn(true, "fn-").then((value: string): void => {
    console.log("conditional-mixed-inline-await-return-await:", value);
});

conditionalMixedInlineAwaitReturn(false, "fn-").then((value: string): void => {
    console.log("conditional-mixed-inline-await-return-sync:", value);
});

nestedConditionalInlineAwaitReturn(true, true, "fn-").then((value: string): void => {
    console.log("nested-conditional-inline-await-return-inner:", value);
});

nestedConditionalInlineAwaitReturn(true, false, "fn-").then((value: string): void => {
    console.log("nested-conditional-inline-await-return-sync:", value);
});

nestedConditionalInlineAwaitReturn(false, false, "fn-").then((value: string): void => {
    console.log("nested-conditional-inline-await-return-fallthrough:", value);
});

logicalOrInlineAwaitReturn("logical-or-sync").then((value: string): void => {
    console.log("logical-or-inline-await-return-sync:", value);
});

logicalOrInlineAwaitReturn("").then((value: string): void => {
    console.log("logical-or-inline-await-return-await:", value);
});

logicalAndInlineAwaitReturn(false).then((value: any): void => {
    console.log("logical-and-inline-await-return-sync:", value);
});

logicalAndInlineAwaitReturn(true).then((value: any): void => {
    console.log("logical-and-inline-await-return-await:", value);
});

nullishInlineAwaitReturn("nullish-sync").then((value: string): void => {
    console.log("nullish-inline-await-return-sync:", value);
});

nullishInlineAwaitReturn(undefined).then((value: string): void => {
    console.log("nullish-inline-await-return-await:", value);
});

preludeLocalInlineAwaitReturn("fn-").then((value: string): void => {
    console.log("prelude-local-inline-await-return:", value);
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

new Worker("do-").doWhileAfterAwait(2).then((value: string): void => {
    console.log("method-do-while:", value);
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

const expressionlessWorker = new Worker("exprless-");
expressionlessWorker.expressionlessReturnAfterAwait().then((_value: any): void => {
    console.log("method-expressionless-return:", expressionlessWorker.prefix);
});

new Worker("method-two-").twoAwaitMethod("class-").then((value: string): void => {
    console.log("method-two-await:", value);
});

new Worker("method-three-").threeAwaitMethod("class-").then((value: string): void => {
    console.log("method-three-await:", value);
});

new Worker("method-four-").fourAwaitMethod("class-").then((value: string): void => {
    console.log("method-four-await:", value);
});

new Worker("method-five-").fiveAwaitMethod("class-").then((value: string): void => {
    console.log("method-five-await:", value);
});

new Worker("method-inline-").inlineAwaitReturnMethod("class-").then((value: string): void => {
    console.log("method-inline-await-return:", value);
});

new Worker("method-").branchReturnAwaitMethod(true).then((value: string): void => {
    console.log("method-branch-return-await-true:", value);
});

new Worker("method-").branchReturnAwaitMethod(false).then((value: string): void => {
    console.log("method-branch-return-await-false:", value);
});

new Worker("method-inline-").branchInlineAwaitReturnMethod(true, "class-").then((value: string): void => {
    console.log("method-branch-inline-await-return-true:", value);
});

new Worker("method-inline-").branchInlineAwaitReturnMethod(false, "class-").then((value: string): void => {
    console.log("method-branch-inline-await-return-false:", value);
});

new Worker("method-branch-mixed-").branchMixedInlineAwaitReturnMethod(true, "class-").then((value: string): void => {
    console.log("method-branch-mixed-inline-await-return-sync:", value);
});

new Worker("method-branch-mixed-").branchMixedInlineAwaitReturnMethod(false, "class-").then((value: string): void => {
    console.log("method-branch-mixed-inline-await-return-await:", value);
});

new Worker("method-branch-conditional-").branchConditionalInlineAwaitReturnMethod(true, true, "class-").then((value: string): void => {
    console.log("method-branch-conditional-inline-await-return-inner:", value);
});

new Worker("method-branch-conditional-").branchConditionalInlineAwaitReturnMethod(true, false, "class-").then((value: string): void => {
    console.log("method-branch-conditional-inline-await-return-sync:", value);
});

new Worker("method-branch-conditional-").branchConditionalInlineAwaitReturnMethod(false, false, "class-").then((value: string): void => {
    console.log("method-branch-conditional-inline-await-return-fallthrough:", value);
});

new Worker("method-nested-").nestedBranchInlineAwaitReturnMethod(true, true, "class-").then((value: string): void => {
    console.log("method-nested-branch-inline-await-return-inner:", value);
});

new Worker("method-nested-").nestedBranchInlineAwaitReturnMethod(true, false, "class-").then((value: string): void => {
    console.log("method-nested-branch-inline-await-return-outer:", value);
});

new Worker("method-nested-").nestedBranchInlineAwaitReturnMethod(false, false, "class-").then((value: string): void => {
    console.log("method-nested-branch-inline-await-return-fallthrough:", value);
});

new Worker("method-conditional-").conditionalInlineAwaitReturnMethod(true, "class-").then((value: string): void => {
    console.log("method-conditional-inline-await-return-true:", value);
});

new Worker("method-conditional-").conditionalInlineAwaitReturnMethod(false, "class-").then((value: string): void => {
    console.log("method-conditional-inline-await-return-false:", value);
});

new Worker("method-conditional-").conditionalMixedInlineAwaitReturnMethod(true, "class-").then((value: string): void => {
    console.log("method-conditional-mixed-inline-await-return-sync:", value);
});

new Worker("method-conditional-").conditionalMixedInlineAwaitReturnMethod(false, "class-").then((value: string): void => {
    console.log("method-conditional-mixed-inline-await-return-await:", value);
});

new Worker("method-nested-conditional-").nestedConditionalInlineAwaitReturnMethod(true, true, "class-").then((value: string): void => {
    console.log("method-nested-conditional-inline-await-return-inner:", value);
});

new Worker("method-nested-conditional-").nestedConditionalInlineAwaitReturnMethod(true, false, "class-").then((value: string): void => {
    console.log("method-nested-conditional-inline-await-return-sync:", value);
});

new Worker("method-nested-conditional-").nestedConditionalInlineAwaitReturnMethod(false, false, "class-").then((value: string): void => {
    console.log("method-nested-conditional-inline-await-return-fallthrough:", value);
});

new Worker("method-logical-or-sync").logicalOrInlineAwaitReturnMethod().then((value: string): void => {
    console.log("method-logical-or-inline-await-return-sync:", value);
});

new Worker("").logicalOrInlineAwaitReturnMethod().then((value: string): void => {
    console.log("method-logical-or-inline-await-return-await:", value);
});

new Worker("method-logical-and-sync").logicalAndInlineAwaitReturnMethod(false).then((value: any): void => {
    console.log("method-logical-and-inline-await-return-sync:", value);
});

new Worker("method-logical-and-source").logicalAndInlineAwaitReturnMethod(true).then((value: any): void => {
    console.log("method-logical-and-inline-await-return-await:", value);
});

new Worker("method-nullish-source").nullishInlineAwaitReturnMethod("method-nullish-sync").then((value: string): void => {
    console.log("method-nullish-inline-await-return-sync:", value);
});

new Worker("method-nullish-source").nullishInlineAwaitReturnMethod(undefined).then((value: string): void => {
    console.log("method-nullish-inline-await-return-await:", value);
});

new Worker("method-prelude-").preludeLocalInlineAwaitReturnMethod("class-").then((value: string): void => {
    console.log("method-prelude-local-inline-await-return:", value);
});

arrow().then((value: string): void => {
    console.log("arrow:", value);
});

arrowParam("value-").then((value: string): void => {
    console.log("arrow-param:", value);
});

arrowTwoAwait("value-").then((value: string): void => {
    console.log("arrow-two-await:", value);
});

arrowThreeAwait("value-").then((value: string): void => {
    console.log("arrow-three-await:", value);
});

arrowFourAwait("value-").then((value: string): void => {
    console.log("arrow-four-await:", value);
});

arrowFiveAwait("value-").then((value: string): void => {
    console.log("arrow-five-await:", value);
});

arrowInlineAwaitReturn("value-").then((value: string): void => {
    console.log("arrow-inline-await-return:", value);
});

arrowBranchReturnAwait(true).then((value: string): void => {
    console.log("arrow-branch-return-await-true:", value);
});

arrowBranchReturnAwait(false).then((value: string): void => {
    console.log("arrow-branch-return-await-false:", value);
});

arrowBranchInlineAwaitReturn(true, "value-").then((value: string): void => {
    console.log("arrow-branch-inline-await-return-true:", value);
});

arrowBranchInlineAwaitReturn(false, "value-").then((value: string): void => {
    console.log("arrow-branch-inline-await-return-false:", value);
});

arrowBranchMixedInlineAwaitReturn(true, "value-").then((value: string): void => {
    console.log("arrow-branch-mixed-inline-await-return-await:", value);
});

arrowBranchMixedInlineAwaitReturn(false, "value-").then((value: string): void => {
    console.log("arrow-branch-mixed-inline-await-return-sync:", value);
});

arrowBranchConditionalInlineAwaitReturn(true, true, "value-").then((value: string): void => {
    console.log("arrow-branch-conditional-inline-await-return-inner:", value);
});

arrowBranchConditionalInlineAwaitReturn(true, false, "value-").then((value: string): void => {
    console.log("arrow-branch-conditional-inline-await-return-sync:", value);
});

arrowBranchConditionalInlineAwaitReturn(false, false, "value-").then((value: string): void => {
    console.log("arrow-branch-conditional-inline-await-return-fallthrough:", value);
});

arrowNestedBranchInlineAwaitReturn(true, true, "value-").then((value: string): void => {
    console.log("arrow-nested-branch-inline-await-return-inner:", value);
});

arrowNestedBranchInlineAwaitReturn(true, false, "value-").then((value: string): void => {
    console.log("arrow-nested-branch-inline-await-return-outer:", value);
});

arrowNestedBranchInlineAwaitReturn(false, false, "value-").then((value: string): void => {
    console.log("arrow-nested-branch-inline-await-return-fallthrough:", value);
});

arrowConditionalInlineAwaitReturn(true, "value-").then((value: string): void => {
    console.log("arrow-conditional-inline-await-return-true:", value);
});

arrowConditionalInlineAwaitReturn(false, "value-").then((value: string): void => {
    console.log("arrow-conditional-inline-await-return-false:", value);
});

arrowConditionalMixedInlineAwaitReturn(true, "value-").then((value: string): void => {
    console.log("arrow-conditional-mixed-inline-await-return-await:", value);
});

arrowConditionalMixedInlineAwaitReturn(false, "value-").then((value: string): void => {
    console.log("arrow-conditional-mixed-inline-await-return-sync:", value);
});

arrowNestedConditionalInlineAwaitReturn(true, true, "value-").then((value: string): void => {
    console.log("arrow-nested-conditional-inline-await-return-inner:", value);
});

arrowNestedConditionalInlineAwaitReturn(true, false, "value-").then((value: string): void => {
    console.log("arrow-nested-conditional-inline-await-return-sync:", value);
});

arrowNestedConditionalInlineAwaitReturn(false, false, "value-").then((value: string): void => {
    console.log("arrow-nested-conditional-inline-await-return-fallthrough:", value);
});

arrowLogicalOrInlineAwaitReturn("arrow-logical-or-sync").then((value: string): void => {
    console.log("arrow-logical-or-inline-await-return-sync:", value);
});

arrowLogicalOrInlineAwaitReturn("").then((value: string): void => {
    console.log("arrow-logical-or-inline-await-return-await:", value);
});

arrowLogicalAndInlineAwaitReturn(false).then((value: any): void => {
    console.log("arrow-logical-and-inline-await-return-sync:", value);
});

arrowLogicalAndInlineAwaitReturn(true).then((value: any): void => {
    console.log("arrow-logical-and-inline-await-return-await:", value);
});

arrowNullishInlineAwaitReturn("arrow-nullish-sync").then((value: string): void => {
    console.log("arrow-nullish-inline-await-return-sync:", value);
});

arrowNullishInlineAwaitReturn(undefined).then((value: string): void => {
    console.log("arrow-nullish-inline-await-return-await:", value);
});

arrowPreludeLocalInlineAwaitReturn("value-").then((value: string): void => {
    console.log("arrow-prelude-local-inline-await-return:", value);
});
