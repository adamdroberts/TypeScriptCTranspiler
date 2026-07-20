async function choose(flag: boolean): Promise<string> {
    if (await Promise.resolve(flag)) return "yes";
    return "no";
}

async function chooseNested(flag: boolean): Promise<string> {
    if (true) {
        if (await Promise.resolve(flag)) return "nested-yes";
        return "nested-no";
    }
    return "unreachable";
}

async function chooseBranchMultipleAwaitDeclarators(flag: boolean): Promise<string> {
    if (flag) {
        const first = await Promise.resolve("branch-first"), second = await Promise.resolve(first + "-second");
        return second;
    }
    return "branch-no";
}

async function chooseTryMultipleAwaitDeclarators(): Promise<string> {
    try {
        const first = await Promise.resolve("try-first"), second = await Promise.resolve(first + "-second");
        return second;
    } catch {
        return "try-caught";
    }
}

choose(true).then((value) => console.log("await-if-true", value));
choose(false).then((value) => console.log("await-if-false", value));
chooseNested(true).then((value) => console.log("await-if-nested-true", value));
chooseNested(false).then((value) => console.log("await-if-nested-false", value));
chooseBranchMultipleAwaitDeclarators(true).then((value) => console.log("await-if-branch-multiple-true", value));
chooseBranchMultipleAwaitDeclarators(false).then((value) => console.log("await-if-branch-multiple-false", value));
chooseTryMultipleAwaitDeclarators().then((value) => console.log("await-try-multiple-declarators", value));

class Chooser {
    async pick(flag: boolean): Promise<string> {
        if (await Promise.resolve(flag)) return "method-yes";
        return "method-no";
    }
}

const chooseValue = async (flag: boolean): Promise<string> => {
    if (await Promise.resolve(flag)) return "value-yes";
    return "value-no";
};

new Chooser().pick(true).then((value) => console.log("await-if-method-true", value));
new Chooser().pick(false).then((value) => console.log("await-if-method-false", value));
chooseValue(true).then((value) => console.log("await-if-value-true", value));
chooseValue(false).then((value) => console.log("await-if-value-false", value));
