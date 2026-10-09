const GeneratorFunction = (function*(): Generator<number, void, unknown> {}).constructor;
const AsyncFunction = (async function(): Promise<void> {}).constructor;
function pick(value: Function): Function { return value; }
const record = { selected: GeneratorFunction, get read(): Function { return pick(record.selected); } };
const fromGetter: () => Generator<number, void, unknown> = record.read("yield 31;");
const factory: () => Function = Function("return (function*(){}).constructor;");
const fromResult: () => Generator<number, void, unknown> = factory()("yield 37;");
const bound = pick(GeneratorFunction).bind(null, "value");
const applied: (value: number) => Generator<number, void, unknown> = bound.apply(null, ["yield value + 41;"]);
const constructed: (value: number) => Generator<number, void, unknown> = Reflect.construct(bound, ["yield value + 43;"]);
const argumentsList = ["value", "return await value;"];
argumentsList[1] = "return await value + 1;";
const awaited: (value: number) => Promise<number> = AsyncFunction.apply(null, argumentsList);
const spread: (value: number) => Generator<number, void, unknown> = GeneratorFunction(...["value", "yield value;"]);
console.log("member-result", fromGetter().next().value, fromResult().next().value);
console.log("bound-list", applied(2).next().value, constructed(2).next().value);
console.log("spread-list", spread(47).next().value);
async function run(): Promise<void> { const value = await awaited(53); console.log("async-list", value); }
run();
