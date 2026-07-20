async function choose(flag: boolean): Promise<string> {
    if (await Promise.resolve(flag)) return "yes";
    return "no";
}

choose(true).then((value) => console.log("await-if-true", value));
choose(false).then((value) => console.log("await-if-false", value));
