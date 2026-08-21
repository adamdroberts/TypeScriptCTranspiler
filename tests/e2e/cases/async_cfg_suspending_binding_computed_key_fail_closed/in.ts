async function unsupportedComputedKey(): Promise<number> {
    const { [await Promise.resolve("value")]: selected }: any = { value: 1 };
    return selected;
}

unsupportedComputedKey().then((value) => console.log(value));
