async function choose(flag: boolean, prefix: string): Promise<string> {
    while (await Promise.resolve(flag)) {
        if (flag) prefix += "-branch";
        const source = prefix + "-prelude";
        const first = await Promise.resolve(source + "-first");
        const second = await Promise.resolve(first + "-second");
        return second;
    }
    return prefix + "-fallthrough";
}

choose(true, "value").then((value: string): void => console.log(value));
choose(false, "value").then((value: string): void => console.log(value));
