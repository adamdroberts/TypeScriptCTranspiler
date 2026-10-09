const GeneratorFunction = (function* source(): Generator<number, void, unknown> { yield 0; }).constructor;
const AsyncFunction = (async function source(): Promise<number> { return 0; }).constructor;
const AsyncGeneratorFunction = (async function* source(): AsyncGenerator<number, void, unknown> { yield 0; }).constructor;
const generated: (value: number) => Generator<number, number, unknown> = GeneratorFunction("value", "yield value; return value + 1;");
const awaited: (value: number) => Promise<number> = AsyncFunction("value", "return await value;");
const asynchronous: (value: number) => AsyncGenerator<number, number, unknown> = AsyncGeneratorFunction("value", "try { yield value; return value + 6; } finally { yield 11; }");
async function run(): Promise<void> {
    console.log(GeneratorFunction.name, AsyncFunction.name, AsyncGeneratorFunction.name);
    console.log(Object.getPrototypeOf(GeneratorFunction) === Function);
    console.log(Object.getPrototypeOf(AsyncGeneratorFunction.prototype.prototype).constructor === Object);
    const iterator = generated(3);
    console.log(iterator.next().value, iterator.next().value);
    const value = await awaited(5);
    console.log(value);
    const asyncIterator = asynchronous(7);
    const requests = [asyncIterator.next(), asyncIterator.next(), asyncIterator.next()];
    for (const result of await Promise.all(requests)) console.log(result.value, result.done);
}
run();
