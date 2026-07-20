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

choose(true).then((value) => console.log("await-if-true", value));
choose(false).then((value) => console.log("await-if-false", value));
chooseNested(true).then((value) => console.log("await-if-nested-true", value));
chooseNested(false).then((value) => console.log("await-if-nested-false", value));

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
