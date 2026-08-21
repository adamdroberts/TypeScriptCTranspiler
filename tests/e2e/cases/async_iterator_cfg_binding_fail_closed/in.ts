async function unsupportedBindingSuspension(values: any): Promise<number> {
    for await (const [value = await Promise.resolve(1)] of values) {
        return value;
    }
    return 0;
}

unsupportedBindingSuspension([]).then(console.log);
