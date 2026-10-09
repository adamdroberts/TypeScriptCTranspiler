function capture(strings: TemplateStringsArray, ...values: number[]): TemplateStringsArray { return strings; }
function site(): TemplateStringsArray { return capture`line\n${1}tail`; }
const first = site();
console.log(first === site(), first.raw[0], Object.isFrozen(first), Object.isFrozen(first.raw));
console.log(Object.getOwnPropertyDescriptor(first, "raw")?.enumerable);
let events = "";
const receiver = { name: "owner", tag(this: { name: string }, strings: TemplateStringsArray, value: number): string {
    events += "call"; return this.name + ":" + strings.raw[0] + ":" + value;
} };
function value(): number { events += "value,"; return 7; }
console.log(receiver.tag`raw\n${value()}`, events);
function* suspended(): Generator<string, string, number> {
    return receiver.tag`resume${yield "ready"}`;
}
const iterator = suspended();
console.log(iterator.next().value, iterator.next(11).value);
async function main(): Promise<void> {
    const awaited = receiver.tag`await${await Promise.resolve(13)}`;
    console.log(awaited);
    async function* asyncSite(): AsyncGenerator<string, void, number> {
        yield receiver.tag`async${await 17}`;
    }
    const asynchronous = asyncSite();
    const next = await asynchronous.next();
    console.log(next.value);
}
main();
