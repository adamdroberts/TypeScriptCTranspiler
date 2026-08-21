async function nestedLexicalIf(
    flag: boolean,
    reject: boolean,
    label: string,
): Promise<string> {
    {
        const outer = "outer-" + label;
        if (flag) {
            const outer = await (reject
                ? Promise.reject("reject-" + label)
                : Promise.resolve("inner-" + label));
            console.log("branch", label, outer);
        } else {
            console.log("else", label, outer);
        }
        console.log("tail", label, outer);
    }
    return "done-" + label;
}

nestedLexicalIf(true, false, "true")
    .then((value) => console.log("result", value));
nestedLexicalIf(false, false, "false")
    .then((value) => console.log("result", value));
nestedLexicalIf(true, true, "error")
    .then(
        (value) => console.log("unexpected", value),
        (reason) => console.log("rejected", reason),
    );
