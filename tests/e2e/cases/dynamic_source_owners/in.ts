const factory: (label: string) => (value: string) => string = Function("label", "return function(value) { return label + ':' + value; };");
const otherFactory: (label: string) => (value: string) => string = Function("label", "return function(value) { return label + ':' + value; };");
const first = factory("first"), second = factory("second"), other = otherFactory("other");
console.log(first("a"), second("b"), other("c"), factory === otherFactory);
const GeneratorFunction = (function*(): Generator<string, string, unknown> { return ""; }).constructor;
const AsyncFunction = (async function(): Promise<string> { return ""; }).constructor;
const AsyncGeneratorFunction = (async function*(): AsyncGenerator<string, string, unknown> { return ""; }).constructor;
const generate: (label: string) => Generator<string, string, unknown> = GeneratorFunction("label", "try { yield label; return label + ':done'; } finally { yield label + ':cleanup'; }");
const resolve: (label: string) => Promise<string> = AsyncFunction("label", "await 0; return label + ':resolved';");
const generateAsync: (label: string) => AsyncGenerator<string, string, unknown> = AsyncGeneratorFunction("label", "yield label; await 0; return label + ':done';");
const left = generate("left"), right = generate("right");
console.log(left.next().value, right.next().value, left.next().value, right.next().value, left.next().value);
async function run(): Promise<void> {
    const values = await Promise.all([resolve("left"), resolve("right")]);
    console.log(values.join(","));
    const iterator = generateAsync("queued");
    const results = await Promise.all([iterator.next(), iterator.next()]);
    for (const result of results) console.log(result.value, result.done);
    console.log(first("retained"), second("retained"));
}
run();
