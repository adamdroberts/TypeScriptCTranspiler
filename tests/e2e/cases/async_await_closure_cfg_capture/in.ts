function makeAppender(prefix: string): (left: string, right: string) => Promise<string> {
    return async (left: string, right: string): Promise<string> => {
        const first = await Promise.resolve(left);
        prefix = prefix + first;
        const second = await Promise.resolve(right);
        prefix = prefix + second;
        return prefix;
    };
}

makeAppender("start:")("A", "B").then((value: string): void => console.log(value));
