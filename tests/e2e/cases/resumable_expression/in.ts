async function nestedReturn(): Promise<number> {
    return await Promise.resolve((await Promise.resolve(6)) + 7);
}

async function subject(): Promise<void> {
    const events: string[] = [];
    const receiver: any = {
        tag: 17, value: 3,
        get method() {
            events.push("get");
            return function (this: any, ...values: number[]): number {
                events.push("call:" + this.tag);
                let sum = 0;
                for (const value of values) sum += value;
                return sum;
            };
        },
    };
    function mark(value: number): number { events.push("mark:" + value); return value; }
    const change: any = { then(resolve: (value: number) => void): void {
        events.push("then");
        Object.defineProperty(receiver, "method", { value: () => -99, configurable: true });
        resolve(3);
    } };
    const result = receiver.method(mark(1), await change, ...[2, 4], mark(5));
    console.log("call:", result, events.join(","));
    events.length = 0;
    const changed: any = { then(resolve: (value: number) => void): void {
        receiver.value = 99; resolve(7);
    } };
    const assigned = receiver["value"] += await changed;
    console.log("reference:", assigned, receiver.value);
    const key: any = { toString(): string { events.push("key"); return "value"; } };
    const copied: any = { get copied(): any { events.push("copy"); return receiver; } };
    const literal = { ...copied, [key]: await Promise.resolve(23) };
    console.log("literal:", literal.copied === receiver, literal.value, events.join(","));
    events.length = 0;
    const conversion: any = { toString(): string { events.push("string"); return "text"; } };
    const text = `head:${conversion}:${await Promise.resolve("tail")}`;
    console.log("template:", text, events.join(","));
    const nested = await Promise.resolve((await Promise.resolve(2)) + 3);
    const values = [nested, , await nestedReturn()];
    console.log("nested:", values.length, 1 in values, values[0], values[2]);
    if (await Promise.resolve((await Promise.resolve(nested)) === 5)) console.log("condition:", true);
    const absent: any = null;
    const skipped = absent?.method(await mark(9)).value;
    console.log("optional:", skipped === undefined);
    let rejected = false;
    try { (absent?.method)(await mark(11)); } catch (error) { rejected = error instanceof TypeError; }
    console.log("boundary:", rejected, events.join(","));
}
subject();
