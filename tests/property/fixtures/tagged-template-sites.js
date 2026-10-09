var host = globalThis;
function check(value, label) { if (!value) throw label; host.print(label + ":true"); }
function collect() { if (NATIVE_GC) host.$262.gc(); }
function capture(strings) { return strings; }
function site() { return capture`head\n${1}tail`; }
async function main() {
    const template = site(); collect();
    check(template === site() && template.raw === site().raw && template !== capture`head\n${1}tail`, "site-identity");
    const index = Object.getOwnPropertyDescriptor(template, "0");
    const length = Object.getOwnPropertyDescriptor(template, "length");
    const raw = Object.getOwnPropertyDescriptor(template, "raw");
    check(Object.isFrozen(template) && Object.isFrozen(template.raw) &&
        index.value === "head\n" && !index.writable && index.enumerable && !index.configurable &&
        !length.writable && !length.enumerable && !length.configurable &&
        raw.value === template.raw && !raw.writable && !raw.enumerable && !raw.configurable &&
        !Reflect.set(template, "0", "changed") && !Reflect.deleteProperty(template.raw, "0"), "frozen-descriptors");
    function strictWrites() {
        "use strict";
        const symbol = Symbol("extra");
        const writes = [() => template.extra = true, () => template.raw.extra = true,
            () => template[0] = "changed", () => template.length = 0, () => template[0] += "changed",
            () => template.raw[0]++, () => template[symbol] = true, () => delete template[0], () => delete template.raw[0]];
        for (const write of writes) {
            let rejected = false;
            try { write(); } catch (reason) { rejected = reason instanceof TypeError; }
            if (!rejected) throw "strict integrity operation";
        }
        check(template[0] === "head\n", "strict-integrity-completions");
    }
    strictWrites();
    const invalid = capture`\u{110000}${0}\xZ`;
    const utf16 = capture`\uD800${0}😀`;
    check(invalid[0] === undefined && invalid[1] === undefined && invalid.raw[0] === "\\u{110000}" &&
        utf16[0].charCodeAt(0) === 0xD800 && utf16[1].length === 2 && utf16[1].charCodeAt(1) === 0xDE00,
        "raw-cooked-and-utf16");
    const events = [], receiver = { name: "receiver", get tag() {
        events.push("get"); return function(strings, value) { events.push(this.name); return [strings, value]; };
    } };
    const result = receiver.tag`order${(events.push("value"), 7)}`;
    const computed = receiver[(events.push("key"), "tag")]`computed${(events.push("computed-value"), 11)}`;
    check(result[1] === 7 && computed[1] === 11 && events.join(",") === "get,value,receiver,key,get,computed-value,receiver",
        "reference-and-argument-order");
    let rawCalls = 0; const original = String.raw;
    String.raw = function(strings, value) { ++rawCalls; return strings.raw[0] + value; };
    check(String.raw`live${13}` === "live13" && rawCalls === 1, "mutable-string-raw"); String.raw = original;
    function* generator() { return receiver.tag`generator${yield 17}`; }
    const iterator = generator(); const first = iterator.next(); collect(); const completed = iterator.next(19);
    check(first.value === 17 && !first.done && completed.done && completed.value[1] === 19,
        "generator-tagged-call");
    async function awaited() { return receiver.tag`awaited${await 23}`; }
    const awaitedResult = await awaited(); check(awaitedResult[1] === 23, "async-tagged-call");
    async function* asynchronous() { yield receiver.tag`async-generator${await 29}`; }
    const asyncIterator = asynchronous(); const asyncResult = await asyncIterator.next();
    check(asyncResult.value[1] === 29 && !asyncResult.done, "async-generator-tagged-call");
    const reason = {}; let substituted = false;
    const throwing = { get tag() { throw reason; } };
    try { throwing.tag`abrupt${(substituted = true)}`; } catch (caught) {
        check(caught === reason && !substituted, "abrupt-callee-before-substitution");
    }
    let optionalEffects = ""; const absent = null;
    try { (absent?.tag)`optional${(optionalEffects += "substitution")}`; } catch (caught) {
        check(caught instanceof TypeError && optionalEffects === "substitution", "optional-reference-tag-call");
    }
    optionalEffects = "";
    try { (absent?.[(optionalEffects += "key", "tag")])`optional${(optionalEffects += "substitution")}`; } catch (caught) {
        check(caught instanceof TypeError && optionalEffects === "substitution", "optional-computed-tag-call");
    }
    function* yieldedTag() { return (yield capture)`yielded${yield 31}`; }
    const yielded = yieldedTag(); yielded.next(); const middle = yielded.next(capture); const last = yielded.next(37);
    check(middle.value === 31 && last.done && last.value.raw[0] === "yielded", "yielded-callee-and-substitution");
    const factory = Function("return function(){return (s => s)`dynamic-site`;};");
    const sibling = factory(), escaped = factory();
    const fresh = Function("return function(){return (s => s)`dynamic-site`;};")(); collect();
    check(sibling() === escaped() && sibling() !== fresh() && sibling() === sibling(), "fresh-parse-and-retained-closure");
    const staticFromDynamic = Function("capture", "return capture();");
    check(staticFromDynamic(site) === template, "static-site-under-dynamic-caller");
    const text = "(function(){ return function(){return (s => s)`eval-site`;};})()";
    const evaluated = eval(text), separatelyEvaluated = eval(text); collect();
    check(evaluated() === evaluated() && evaluated() !== separatelyEvaluated(), "fresh-eval-parse");
    const foreign = host.$262.createRealm();
    const foreignFactory = foreign.global.Function("return function(){return (s => s)`dynamic-site`;};");
    const foreignSite = foreignFactory()();
    check(Object.getPrototypeOf(foreignSite) === foreign.global.Array.prototype && foreignSite !== sibling(), "realm-owned-template-map");
    const foreignEval = foreign.evalScript("(s => s)`foreign-site`");
    check(foreignEval !== foreign.evalScript("(s => s)`foreign-site`") && Object.getPrototypeOf(foreignEval.raw) === foreign.global.Array.prototype,
        "foreign-evaluation-context");
    let chain = null;
    for (let index = 0; index < 4096; ++index) {
        chain = Function("previous", "return function(){return {previous, site: (s => s)`retained-site`};};")(chain);
    }
    collect(); let visited = 0, preceding = null;
    while (chain !== null) {
        const record = chain(); const again = chain();
        if (record.site !== again.site || record.site === preceding) throw "retained template ownership";
        preceding = record.site; chain = record.previous; ++visited;
        if (visited % 127 === 0) collect();
    }
    check(visited === 4096, "deep-retained-parse-owners");
}
main();
