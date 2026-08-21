function select(mode: number, label: string): number {
    console.log("discriminant", label);
    return mode;
}

async function nestedLexicalSwitch(
    mode: number,
    reject: boolean,
    label: string,
): Promise<string> {
    {
        const outer = "outer-" + label;
        switch (select(mode, label)) {
            case 1: {
                const outer = await (reject
                    ? Promise.reject("reject-" + label)
                    : Promise.resolve("inner-" + label));
                console.log("case-one", label, outer);
                break;
            }
            default:
                console.log("default-entry", label, outer);
            case 2:
                console.log("case-two", label, outer);
                break;
        }
        console.log("tail", label, outer);
    }
    return "done-" + label;
}

nestedLexicalSwitch(1, false, "one")
    .then((value) => console.log("result", value));
nestedLexicalSwitch(0, false, "default")
    .then((value) => console.log("result", value));
nestedLexicalSwitch(2, false, "two")
    .then((value) => console.log("result", value));
nestedLexicalSwitch(1, true, "error")
    .then(
        (value) => console.log("unexpected", value),
        (reason) => console.log("rejected", reason),
    );
