import { setTimeout as delay } from "node:timers/promises";
import crypto from "node:crypto";
import { EventEmitter } from "node:events";
import fs from "node:fs";

class PreludeCaptureBox {
    label: string;

    constructor(label: string) {
        this.label = label;
    }

    suffix(value: string): string {
        return this.label + value;
    }
}

interface PreludeCaptureRecord {
    label: string;
    suffix: string;
}

interface PreludeCaptureKey {
    id: string;
}

function preludeFinalizationCleanup(_heldValue: string): void {
}

let directAssignmentInitTrace = "";

function recordDirectAssignmentInit(label: string): string {
    directAssignmentInitTrace = directAssignmentInitTrace + label;
    return label;
}

async function suffix(): Promise<string> {
    const value = await delay(5, "ready");
    return value + "!";
}

async function doubled(): Promise<number> {
    const value = await delay(10, 21);
    return value * 2;
}

async function letAwaitAlias(prefix: string): Promise<string> {
    let value = await delay(11, "let-alias");
    return prefix + value;
}

async function parenthesizedLetAwaitAlias(prefix: string): Promise<string> {
    let value = await delay(12, prefix + "parenthesized-let-alias");
    return (value);
}

async function tagged(prefix: string): Promise<string> {
    const value = await delay(12, "tag");
    return prefix + value;
}

async function directAssignmentAwaitReturn(prefix: string): Promise<string> {
    let value: string;
    value = await delay(13, prefix + "direct-assignment");
    return value;
}

async function initializedDirectAssignmentAwaitReturn(prefix: string): Promise<string> {
    let value = recordDirectAssignmentInit(prefix + "init|");
    value = await delay(15, prefix + "initialized-direct-assignment");
    return value;
}

async function staged(prefix: string): Promise<string> {
    const value = await delay(14, "stage");
    const decorated = prefix + value;
    const finalLabel = decorated + "!";
    return finalLabel;
}

async function initializerExpressionAwaitReturn(prefix: string): Promise<string> {
    const decorated = prefix + await delay(16, "initializer") + "!";
    return decorated;
}

async function assignmentExpressionAwaitReturn(prefix: string): Promise<string> {
    let decorated: string;
    decorated = prefix + await delay(17, "assignment") + "!";
    return decorated;
}

async function initializedAssignmentExpressionAwaitReturn(prefix: string): Promise<string> {
    let decorated = prefix + "init-";
    decorated = decorated + await delay(18, "assignment") + "!";
    return decorated;
}

async function twoAwait(prefix: string): Promise<string> {
    const first = await delay(45, "one");
    const second = await delay(46, prefix + first + "-two");
    return first + ":" + second + "!";
}

async function threeAwait(prefix: string): Promise<string> {
    const first = await delay(51, "one");
    const second = await delay(52, prefix + first + "-two");
    const third = await delay(53, first + ":" + second + "-three");
    return first + ":" + second + ":" + third + "!";
}

async function fourAwait(prefix: string): Promise<string> {
    const first = await delay(60, "one");
    const second = await delay(61, prefix + first + "-two");
    const third = await delay(62, first + ":" + second + "-three");
    const fourth = await delay(63, first + ":" + second + ":" + third + "-four");
    return first + ":" + second + ":" + third + ":" + fourth + "!";
}

async function fiveAwait(prefix: string): Promise<string> {
    const first = await delay(72, "one");
    const second = await delay(73, prefix + first + "-two");
    const third = await delay(74, first + ":" + second + "-three");
    const fourth = await delay(75, first + ":" + second + ":" + third + "-four");
    const fifth = await delay(76, first + ":" + second + ":" + third + ":" + fourth + "-five");
    return first + ":" + second + ":" + third + ":" + fourth + ":" + fifth + "!";
}

async function preludeExpressionStatementFiveAwait(prefix: string): Promise<string> {
    prefix = prefix + "expr-";
    prefix = prefix + "five-";
    const first = await delay(240, "one");
    const second = await delay(241, prefix + first + "-two");
    const third = await delay(242, first + ":" + second + "-three");
    const fourth = await delay(243, first + ":" + second + ":" + third + "-four");
    const fifth = await delay(244, first + ":" + second + ":" + third + ":" + fourth + "-five");
    return first + ":" + second + ":" + third + ":" + fourth + ":" + fifth + "!";
}

async function preludeLocalFiveAwait(prefix: string): Promise<string> {
    const label = prefix + "local-five-";
    const first = await delay(1, label + "one");
    const second = await delay(2, label + first + "-two");
    const third = await delay(3, label + first + ":" + second + "-three");
    const fourth = await delay(4, label + first + ":" + second + ":" + third + "-four");
    const fifth = await delay(5, label + first + ":" + second + ":" + third + ":" + fourth + "-five");
    return label + first + ":" + second + ":" + third + ":" + fourth + ":" + fifth + "!";
}

async function inlineAwaitReturn(prefix: string): Promise<string> {
    return prefix + await delay(87, "inline") + "!";
}

async function branchReturnAwait(flag: boolean): Promise<string> {
    if (flag) return await delay(90, "branch-true");
    return await delay(91, "branch-false");
}

async function branchInlineAwaitReturn(flag: boolean, prefix: string): Promise<string> {
    if (flag) return prefix + await delay(96, "inline-true") + "!";
    return prefix + await delay(97, "inline-false") + "!";
}

async function branchMixedInlineAwaitReturn(flag: boolean, prefix: string): Promise<string> {
    if (flag) return prefix + await delay(120, "branch-mixed-await") + "!";
    return prefix + "branch-mixed-sync!";
}

async function branchConditionalInlineAwaitReturn(outer: boolean, inner: boolean, prefix: string): Promise<string> {
    if (outer) {
        return inner
            ? prefix + await delay(129, "branch-conditional-inner") + "!"
            : prefix + "branch-conditional-sync!";
    }
    return prefix + await delay(130, "branch-conditional-fallthrough") + "!";
}

async function nestedBranchInlineAwaitReturn(outer: boolean, inner: boolean, prefix: string): Promise<string> {
    if (outer) {
        if (inner) return prefix + await delay(102, "nested-inner") + "!";
        return prefix + await delay(103, "nested-outer") + "!";
    }
    return prefix + await delay(104, "nested-fallthrough") + "!";
}

async function conditionalInlineAwaitReturn(flag: boolean, prefix: string): Promise<string> {
    return flag
        ? prefix + await delay(111, "conditional-true") + "!"
        : prefix + await delay(112, "conditional-false") + "!";
}

async function conditionalMixedInlineAwaitReturn(flag: boolean, prefix: string): Promise<string> {
    return flag
        ? prefix + await delay(117, "conditional-mixed-await") + "!"
        : prefix + "conditional-mixed-sync!";
}

async function nestedConditionalInlineAwaitReturn(outer: boolean, inner: boolean, prefix: string): Promise<string> {
    return outer
        ? inner
            ? prefix + await delay(123, "nested-conditional-inner") + "!"
            : prefix + "nested-conditional-sync!"
        : prefix + await delay(124, "nested-conditional-fallthrough") + "!";
}

async function logicalOrInlineAwaitReturn(prefix: string): Promise<string> {
    return prefix || await delay(135, "logical-or-await");
}

async function logicalAndInlineAwaitReturn(flag: boolean): Promise<any> {
    return flag && await delay(136, "logical-and-await");
}

async function nullishInlineAwaitReturn(prefix: string | undefined): Promise<string> {
    return prefix ?? await delay(141, "nullish-await");
}

async function preludeLocalInlineAwaitReturn(prefix: string): Promise<string> {
    const label = prefix + "prelude-local-";
    return label + await delay(144, "await") + "!";
}

async function preludeConditionalLocalInlineAwaitReturn(flag: boolean, prefix: string): Promise<string> {
    const label = prefix + "prelude-conditional-";
    return flag ? label + await delay(147, "await") + "!" : label + "sync!";
}

async function preludeDirectReturnAwait(prefix: string): Promise<string> {
    const label = prefix + "prelude-direct-";
    return await delay(150, label + "await");
}

async function preludeIfBranchInlineAwaitReturn(flag: boolean, prefix: string): Promise<string> {
    const label = prefix + "prelude-if-";
    if (flag) return label + await delay(153, "await") + "!";
    return label + "sync!";
}

async function preludeNestedIfBranchInlineAwaitReturn(outer: boolean, inner: boolean, prefix: string): Promise<string> {
    const label = prefix + "prelude-nested-if-";
    if (outer) {
        if (inner) return label + await delay(170, "inner") + "!";
        return label + await delay(171, "outer") + "!";
    }
    return label + await delay(172, "fallthrough") + "!";
}

async function preludeBranchConditionalInlineAwaitReturn(outer: boolean, inner: boolean, prefix: string): Promise<string> {
    const label = prefix + "prelude-branch-conditional-";
    if (outer) {
        return inner
            ? label + await delay(180, "inner") + "!"
            : label + "sync!";
    }
    return label + await delay(181, "fallthrough") + "!";
}

async function preludeNestedConditionalInlineAwaitReturn(outer: boolean, inner: boolean, prefix: string): Promise<string> {
    const label = prefix + "prelude-nested-conditional-";
    return outer
        ? inner
            ? label + await delay(190, "inner") + "!"
            : label + "sync!"
        : label + await delay(191, "fallthrough") + "!";
}

async function preludeLogicalOrLocalInlineAwaitReturn(prefix: string): Promise<string> {
    const left = "";
    const label = prefix + "prelude-logical-or-";
    return left || label + await delay(200, "await") + "!";
}

async function preludeExpressionStatementInlineAwaitReturn(prefix: string): Promise<string> {
    let trace = "expr-";
    trace = trace + "tail-";
    const label = prefix + trace + "prelude-expr-";
    trace = trace + "again-";
    return label + trace + await delay(210, "await") + "!";
}

async function preludeExpressionStatementDirectReturnAwait(prefix: string): Promise<string> {
    let trace = "direct-";
    trace = trace + "expr-";
    const label = prefix + trace + "prelude-direct-expr-";
    trace = trace + "tail";
    return await delay(220, label + trace);
}

async function preludeExpressionStatementAwaitedLocalReturn(prefix: string): Promise<string> {
    prefix = prefix + "awaited-";
    prefix = prefix + "expr-";
    const value = await delay(230, "local");
    return prefix + value + "!";
}

async function preludeLocalAwaitedLocalReturn(prefix: string): Promise<string> {
    const label = prefix + "local-awaited-";
    const value = await delay(1, "local");
    return label + value + "!";
}

async function awaitExpressionStatementReturn(prefix: string): Promise<string> {
    await delay(1, "ignored");
    return prefix + "await-expression-done";
}

async function preludeAwaitExpressionStatementReturn(prefix: string): Promise<string> {
    const label = prefix + "prelude-await-expression-";
    await delay(1, "ignored");
    return label + "done";
}

async function preludeArrayAwaitedLocalReturn(prefix: string): Promise<string> {
    const parts = [prefix, "array-local-"];
    const value = await delay(260, "value");
    return parts[0] + parts[1] + parts.length + "-" + value;
}

async function preludeArrayInlineAwaitReturn(prefix: string): Promise<string> {
    const parts = [prefix, "array-inline-"];
    return parts[0] + parts[1] + await delay(261, "value") + "-" + parts.length;
}

async function preludeArrayFiveAwait(prefix: string): Promise<string> {
    const parts = [prefix, "array-five-"];
    const first = await delay(262, parts[0] + "one");
    const second = await delay(263, parts[1] + first + "-two");
    const third = await delay(264, first + ":" + second + "-three");
    const fourth = await delay(265, first + ":" + second + ":" + third + "-four");
    const fifth = await delay(266, first + ":" + second + ":" + third + ":" + fourth + "-five");
    return parts[0] + parts[1] + first + ":" + second + ":" + third + ":" + fourth + ":" + fifth;
}

async function preludeClassAwaitedLocalReturn(prefix: string): Promise<string> {
    const box = new PreludeCaptureBox(prefix + "class-local-");
    const value = await delay(267, "value");
    return box.suffix(value);
}

async function preludeClassInlineAwaitReturn(prefix: string): Promise<string> {
    const box = new PreludeCaptureBox(prefix + "class-inline-");
    return box.suffix(await delay(268, "value"));
}

async function preludeClassFiveAwait(prefix: string): Promise<string> {
    const box = new PreludeCaptureBox(prefix + "class-five-");
    const first = await delay(269, box.suffix("one"));
    const second = await delay(270, box.suffix(first + "-two"));
    const third = await delay(271, first + ":" + second + "-three");
    const fourth = await delay(272, first + ":" + second + ":" + third + "-four");
    const fifth = await delay(273, first + ":" + second + ":" + third + ":" + fourth + "-five");
    return box.suffix(first + ":" + second + ":" + third + ":" + fourth + ":" + fifth);
}

async function preludeObjectLiteralAwaitedLocalReturn(prefix: string): Promise<string> {
    const record: PreludeCaptureRecord = { label: prefix + "object-local-", suffix: "tail" };
    const value = await delay(274, "value");
    return record.label + value + "-" + record.suffix;
}

async function preludeMapSetAwaitedLocalReturn(prefix: string): Promise<string> {
    const labels = new Map<string, string>();
    labels.set("label", prefix + "map-local-");
    const seen = new Set<string>();
    seen.add("set");
    const value = await delay(275, "value");
    return labels.get("label") + value + "-" + (seen.has("set") ? "true" : "false");
}

async function preludeMapInlineAwaitReturn(prefix: string): Promise<string> {
    const labels = new Map<string, string>();
    labels.set("label", prefix + "map-inline-");
    return labels.get("label") + await delay(276, "value");
}

async function preludeSetFiveAwait(prefix: string): Promise<string> {
    const seen = new Set<string>();
    seen.add(prefix + "set-five-");
    const first = await delay(277, prefix + "one");
    const second = await delay(278, first + "-two");
    const third = await delay(279, first + ":" + second + "-three");
    const fourth = await delay(280, first + ":" + second + ":" + third + "-four");
    const fifth = await delay(281, first + ":" + second + ":" + third + ":" + fourth + "-five");
    return (seen.has(prefix + "set-five-") ? "true" : "false") + ":" + first + ":" + second + ":" + third + ":" + fourth + ":" + fifth;
}

async function preludeWeakMapSetAwaitedLocalReturn(prefix: string): Promise<string> {
    const key: PreludeCaptureKey = { id: prefix + "weak-key" };
    const labels = new WeakMap<PreludeCaptureKey, string>();
    labels.set(key, prefix + "weak-map-local-");
    const seen = new WeakSet<PreludeCaptureKey>();
    seen.add(key);
    const value = await delay(282, "value");
    return labels.get(key) + value + "-" + (seen.has(key) ? "true" : "false");
}

async function preludeWeakMapInlineAwaitReturn(prefix: string): Promise<string> {
    const key: PreludeCaptureKey = { id: prefix + "weak-inline-key" };
    const labels = new WeakMap<PreludeCaptureKey, string>();
    labels.set(key, prefix + "weak-map-inline-");
    return labels.get(key) + await delay(283, "value");
}

async function preludeWeakRefFinalizationAwaitedLocalReturn(prefix: string): Promise<string> {
    const target: PreludeCaptureRecord = { label: prefix + "weak-ref-local", suffix: "!" };
    const token: PreludeCaptureKey = { id: prefix + "weak-ref-token" };
    const ref = new WeakRef<PreludeCaptureRecord>(target);
    const registry = new FinalizationRegistry<string>(preludeFinalizationCleanup);
    const value = await delay(284, prefix + "weak-ref-value");
    const found = ref.deref();
    registry.register(target, value, token);
    return (found?.label ?? "missing") + found?.suffix + ":" + registry.unregister(token) + ":" + ref.toString() + ":" + registry.toString() + ":" + value;
}

async function preludeWeakSetFiveAwait(prefix: string): Promise<string> {
    const key: PreludeCaptureKey = { id: prefix + "weak-set-five-key" };
    const seen = new WeakSet<PreludeCaptureKey>();
    seen.add(key);
    const first = await delay(284, prefix + "one");
    const second = await delay(285, first + "-two");
    const third = await delay(286, first + ":" + second + "-three");
    const fourth = await delay(287, first + ":" + second + ":" + third + "-four");
    const fifth = await delay(288, first + ":" + second + ":" + third + ":" + fourth + "-five");
    return (seen.has(key) ? "true" : "false") + ":" + first + ":" + second + ":" + third + ":" + fourth + ":" + fifth;
}

async function preludeBuiltinsAwaitedLocalReturn(prefix: string): Promise<string> {
    const pattern = new RegExp("^" + prefix + "value$");
    const stamp = new Date(Date.UTC(2020, 1, 3, 4, 5, 6, 7));
    const problem = new Error(prefix + "error");
    const value = await delay(289, "value");
    return (pattern.test(prefix + value) ? "true" : "false") + ":" + stamp.toISOString() + ":" + problem.toString();
}

async function preludeAggregateErrorAwaitedLocalReturn(prefix: string): Promise<string> {
    const problem = new AggregateError([prefix + "first", prefix + "second"], prefix + "aggregate", { cause: prefix + "cause" });
    const value = await delay(289, prefix + "aggregate-value");
    return problem.name + ":" + problem.message + ":" + problem.errors.length + ":" + problem.errors[0] + ":" + problem.cause + ":" + problem.toString() + ":" + value;
}

async function preludeFsObjectsAwaitedLocalReturn(prefix: string): Promise<string> {
    const root = fs.mkdtempSync("/tmp/tsc2c-async-prelude-fs-");
    const file = root + "/" + prefix + "fs.txt";
    fs.writeFileSync(file, prefix + "fs-data");
    const stat = fs.statSync(file);
    const entry = fs.readdirSync(root, { withFileTypes: true })[0];
    fs.rmSync(root, { recursive: true, force: true });
    const value = await delay(289, prefix + "fs-value");
    return stat.isFile() + ":" + stat.size + ":" + entry.name + ":" + entry.isFile() + ":" + stat.toString() + ":" + entry.toString() + ":" + value;
}

async function preludeFunctionAwaitedLocalReturn(prefix: string): Promise<string> {
    const decorate = (text: string): string => prefix + text.toUpperCase() + "!";
    const value = await delay(289, "function-value");
    return decorate(value) + ":" + typeof decorate;
}

async function preludeSymbolBigIntAwaitedLocalReturn(prefix: string): Promise<string> {
    const marker: symbol = Symbol(prefix + "symbol-local");
    const count: bigint = BigInt(40) + 2n;
    const value = await delay(289, "value");
    return marker.description + ":" + count.toString() + ":" + value;
}

async function preludePromiseRaceReturn(prefix: string): Promise<string> {
    const ready: Promise<string> = Promise.resolve(prefix + "promise-local");
    const value = await delay(289, "value");
    return (ready === ready ? "same" : "different") + ":" + value;
}

async function preludeTextCodecAwaitedLocalReturn(prefix: string): Promise<string> {
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const value = await delay(289, prefix + "codec");
    const encoded = encoder.encode(value);
    return decoder.decode(encoded) + ":" + encoded.length;
}

async function preludeCryptoDigestAwaitedLocalReturn(prefix: string): Promise<string> {
    const hash = crypto.createHash("sha1");
    const hmac = crypto.createHmac("sha256", "secret");
    const value = await delay(289, prefix + "crypto");
    return hash.update(value).digest("hex").slice(0, 8) + ":" + hmac.update(value).digest("hex").slice(0, 8);
}

async function preludeEventEmitterAwaitedLocalReturn(prefix: string): Promise<string> {
    const emitter = new EventEmitter();
    let total = 0;
    emitter.on("tick", (amount: number): void => {
        total += amount;
    });
    const value = await delay(289, prefix + "event");
    const emitted = emitter.emit("tick", value.length);
    return (emitted ? "true" : "false") + ":" + total + ":" + emitter.listenerCount("tick");
}

async function preludeEventTargetAwaitedLocalReturn(prefix: string): Promise<string> {
    const target = new EventTarget();
    const event = new Event(prefix + "ready", { cancelable: true });
    const value = await delay(291, prefix + "target");
    return (target.dispatchEvent(event) ? "true" : "false") + ":" + event.type + ":" + event.cancelable + ":" + value;
}

async function preludeRegExpInlineAwaitReturn(prefix: string): Promise<string> {
    const pattern = new RegExp("^" + prefix + "inline-value$");
    return pattern.toString() + ":" + await delay(290, prefix + "inline-value");
}

async function preludeDateErrorFiveAwait(prefix: string): Promise<string> {
    const stamp = new Date(Date.UTC(2021, 2, 4, 5, 6, 7, 8));
    const problem = new TypeError(prefix + "five-error");
    const first = await delay(291, prefix + "one");
    const second = await delay(292, first + "-two");
    const third = await delay(293, first + ":" + second + "-three");
    const fourth = await delay(294, first + ":" + second + ":" + third + "-four");
    const fifth = await delay(295, first + ":" + second + ":" + third + ":" + fourth + "-five");
    return stamp.toISOString() + ":" + problem.toString() + ":" + first + ":" + second + ":" + third + ":" + fourth + ":" + fifth;
}

async function preludeUrlParamsAwaitedLocalReturn(prefix: string): Promise<string> {
    const url = new URL("https://example.com/root/path?label=" + prefix + "url-local");
    const params = new URLSearchParams("a=" + prefix + "params-local&b=two");
    const value = await delay(296, "value");
    return url.pathname + ":" + url.searchParams.get("label") + ":" + params.get("a") + ":" + value;
}

async function preludeBufferInlineAwaitReturn(prefix: string): Promise<string> {
    const data = Buffer.from(prefix + "buffer-inline-");
    return data.toString() + await delay(297, "value") + ":" + data.length;
}

async function preludeBinaryFiveAwait(prefix: string): Promise<string> {
    const storage = new ArrayBuffer(8);
    const view = new DataView(storage, 2, 4);
    const data = Buffer.from(prefix + "buffer-five-");
    const first = await delay(298, prefix + "one");
    const second = await delay(299, first + "-two");
    const third = await delay(300, first + ":" + second + "-three");
    const fourth = await delay(301, first + ":" + second + ":" + third + "-four");
    const fifth = await delay(302, first + ":" + second + ":" + third + ":" + fourth + "-five");
    return storage.byteLength + ":" + view.byteOffset + ":" + view.byteLength + ":" + data.toString() + ":" + first + ":" + second + ":" + third + ":" + fourth + ":" + fifth;
}

class Worker {
    prefix: string;

    constructor(prefix: string) {
        this.prefix = prefix;
    }

    async label(): Promise<string> {
        const value = await delay(15, "method");
        return value + "!";
    }

    async letAwaitAliasMethod(suffix: string): Promise<string> {
        let value = await delay(16, "method-let-alias");
        return this.prefix + value + suffix;
    }

    async parenthesizedLetAwaitAliasMethod(suffix: string): Promise<string> {
        let value = await delay(17, this.prefix + "method-parenthesized-let-alias" + suffix);
        return (value);
    }

    async prefixed(prefix: string): Promise<string> {
        const value = await delay(18, "method-param");
        return prefix + value;
    }

    async thisPrefixed(): Promise<string> {
        const value = await delay(19, "this-param");
        return this.prefix + value;
    }

    async stagedThis(suffix: string): Promise<string> {
        const value = await delay(21, "method-stage");
        const decorated = this.prefix + value;
        const finalLabel = decorated + suffix;
        return finalLabel;
    }

    async initializerExpressionAwaitReturnMethod(suffix: string): Promise<string> {
        const decorated = this.prefix + await delay(22, "method-initializer") + suffix;
        return decorated;
    }

    async assignmentExpressionAwaitReturnMethod(suffix: string): Promise<string> {
        let decorated: string;
        decorated = this.prefix + await delay(23, "method-assignment") + suffix;
        return decorated;
    }

    async directAssignmentAwaitReturnMethod(suffix: string): Promise<string> {
        let value: string;
        value = await delay(20, this.prefix + "method-direct-assignment" + suffix);
        return value;
    }

    async initializedDirectAssignmentAwaitReturnMethod(suffix: string): Promise<string> {
        let value = recordDirectAssignmentInit(this.prefix + "method-init|");
        value = await delay(23, this.prefix + "method-initialized-direct-assignment" + suffix);
        return value;
    }

    async initializedAssignmentExpressionAwaitReturnMethod(suffix: string): Promise<string> {
        let decorated = this.prefix + "init-";
        decorated = decorated + await delay(24, "method-assignment") + suffix;
        return decorated;
    }

    async sideEffectThis(): Promise<string> {
        const value = await delay(23, "side");
        this.prefix = this.prefix + value;
        return this.prefix;
    }

    async conditionalSideEffect(flag: boolean): Promise<string> {
        const value = await delay(24, "branch");
        if (flag) {
            this.prefix = this.prefix + value;
        } else {
            this.prefix = this.prefix + "miss";
        }
        return this.prefix;
    }

    async branchLet(flag: boolean): Promise<string> {
        const value = await delay(25, "let");
        let result = "";
        if (flag) {
            result = this.prefix + value;
        } else {
            result = this.prefix + "miss";
        }
        return result;
    }

    async branchUninitializedLet(flag: boolean): Promise<string> {
        const value = await delay(flag ? 26 : 27, "uninit");
        let result: string;
        if (flag) {
            result = this.prefix + value;
        } else {
            result = this.prefix + "miss";
        }
        return result;
    }

    async loopAfterAwait(count: number): Promise<string> {
        const value = await delay(28, "loop");
        let result = this.prefix;
        let index = 0;
        while (index < count) {
            result = result + value;
            index = index + 1;
        }
        return result;
    }

    async doWhileAfterAwait(count: number): Promise<string> {
        const value = await delay(44, "do");
        let result = this.prefix;
        let index = 0;
        do {
            result = result + value + index;
            index = index + 1;
        } while (index < count);
        return result;
    }

    async forAfterAwait(count: number): Promise<string> {
        const value = await delay(29, "for");
        let result = this.prefix;
        for (let index = 0; index < count; index = index + 1) {
            result = result + value;
        }
        return result;
    }

    async forContinueAfterAwait(count: number): Promise<string> {
        const value = await delay(30, "for-continue");
        let result = this.prefix;
        for (let index = 0; index < count; index = index + 1) {
            if (index === 1) continue;
            result = result + value + index;
        }
        return result;
    }

    async forOfAfterAwait(): Promise<string> {
        const value = await delay(31, "of");
        const parts = [this.prefix, value, "!"];
        let result = "";
        for (const part of parts) {
            result = result + part;
        }
        return result;
    }

    async forInAfterAwait(): Promise<string> {
        const value = await delay(32, "in");
        let result = this.prefix;
        for (const key in [this.prefix, value, "!"]) {
            if (key === "1") continue;
            if (key === "2") break;
            result = result + key + value;
        }
        return result;
    }

    async loopControlAfterAwait(): Promise<string> {
        const value = await delay(33, "ctrl");
        let result = this.prefix;
        let index = 0;
        while (index < 5) {
            if (index === 1) {
                index = index + 1;
                continue;
            }
            if (index === 3) break;
            result = result + value + index;
            index = index + 1;
        }
        return result;
    }

    async tryCatchAfterAwait(): Promise<string> {
        const value = await delay(34, "try");
        let result = this.prefix;
        try {
            throw value + "!";
        } catch (e) {
            result = result + "caught-" + e;
        } finally {
            result = result + "-finally";
        }
        return result;
    }

    async throwAfterAwait(): Promise<string> {
        const value = await delay(35, "throw");
        throw this.prefix + value;
        return "never";
    }

    async earlyReturnAfterAwait(flag: boolean): Promise<string> {
        const value = await delay(flag ? 36 : 37, "return");
        if (flag) return this.prefix + value;
        return this.prefix + "late-" + value;
    }

    async switchReturnAfterAwait(kind: string): Promise<string> {
        const value = await delay(kind === "a" ? 38 : 39, kind);
        switch (value) {
            case "a":
                return this.prefix + "alpha";
            case "b":
                return this.prefix + "beta";
            default:
                return this.prefix + "other-" + value;
        }
        return "never";
    }

    async switchBreakAfterAwait(kind: string): Promise<string> {
        const value = await delay(kind === "b" ? 40 : 41, kind);
        let result = this.prefix;
        switch (value) {
            case "a":
                result = result + "alpha";
                break;
            case "b":
                result = result + "beta";
                break;
            default:
                result = result + "other-" + value;
                break;
        }
        return result;
    }

    async voidAfterAwait(): Promise<string> {
        const ignored = await delay(42);
        return this.prefix + "void";
    }

    async expressionlessReturnAfterAwait(): Promise<void> {
        const value = await delay(43, "done");
        this.prefix = this.prefix + value;
        return;
    }

    async twoAwaitMethod(prefix: string): Promise<string> {
        const first = await delay(47, "method-one");
        const second = await delay(48, prefix + this.prefix + first);
        return first + ":" + second + "!";
    }

    async threeAwaitMethod(prefix: string): Promise<string> {
        const first = await delay(54, "method-one");
        const second = await delay(55, prefix + this.prefix + first);
        const third = await delay(56, first + ":" + second + "-three");
        return first + ":" + second + ":" + third + "!";
    }

    async fourAwaitMethod(prefix: string): Promise<string> {
        const first = await delay(64, "method-one");
        const second = await delay(65, prefix + this.prefix + first);
        const third = await delay(66, first + ":" + second + "-three");
        const fourth = await delay(67, first + ":" + second + ":" + third + "-four");
        return first + ":" + second + ":" + third + ":" + fourth + "!";
    }

    async fiveAwaitMethod(prefix: string): Promise<string> {
        const first = await delay(77, "method-one");
        const second = await delay(78, prefix + this.prefix + first);
        const third = await delay(79, first + ":" + second + "-three");
        const fourth = await delay(80, first + ":" + second + ":" + third + "-four");
        const fifth = await delay(81, first + ":" + second + ":" + third + ":" + fourth + "-five");
        return first + ":" + second + ":" + third + ":" + fourth + ":" + fifth + "!";
    }

    async preludeExpressionStatementFiveAwaitMethod(prefix: string): Promise<string> {
        prefix = prefix + "expr-";
        prefix = prefix + "five-";
        const first = await delay(250, "method-one");
        const second = await delay(251, prefix + this.prefix + first);
        const third = await delay(252, first + ":" + second + "-three");
        const fourth = await delay(253, first + ":" + second + ":" + third + "-four");
        const fifth = await delay(254, first + ":" + second + ":" + third + ":" + fourth + "-five");
        return first + ":" + second + ":" + third + ":" + fourth + ":" + fifth + "!";
    }

    async preludeLocalFiveAwaitMethod(prefix: string): Promise<string> {
        const label = this.prefix + prefix + "method-local-five-";
        const first = await delay(1, label + "one");
        const second = await delay(2, label + first + "-two");
        const third = await delay(3, label + first + ":" + second + "-three");
        const fourth = await delay(4, label + first + ":" + second + ":" + third + "-four");
        const fifth = await delay(5, label + first + ":" + second + ":" + third + ":" + fourth + "-five");
        return label + first + ":" + second + ":" + third + ":" + fourth + ":" + fifth + "!";
    }

    async inlineAwaitReturnMethod(prefix: string): Promise<string> {
        return this.prefix + prefix + await delay(88, "method-inline") + "!";
    }

    async branchReturnAwaitMethod(flag: boolean): Promise<string> {
        if (flag) return await delay(92, this.prefix + "branch-true");
        return await delay(93, this.prefix + "branch-false");
    }

    async branchInlineAwaitReturnMethod(flag: boolean, prefix: string): Promise<string> {
        if (flag) return this.prefix + prefix + await delay(98, "method-inline-true") + "!";
        return this.prefix + prefix + await delay(99, "method-inline-false") + "!";
    }

    async branchMixedInlineAwaitReturnMethod(flag: boolean, prefix: string): Promise<string> {
        if (flag) return this.prefix + prefix + "method-branch-mixed-sync!";
        return this.prefix + prefix + await delay(121, "method-branch-mixed-await") + "!";
    }

    async branchConditionalInlineAwaitReturnMethod(outer: boolean, inner: boolean, prefix: string): Promise<string> {
        if (outer) {
            return inner
                ? this.prefix + prefix + await delay(131, "method-branch-conditional-inner") + "!"
                : this.prefix + prefix + "method-branch-conditional-sync!";
        }
        return this.prefix + prefix + await delay(132, "method-branch-conditional-fallthrough") + "!";
    }

    async nestedBranchInlineAwaitReturnMethod(outer: boolean, inner: boolean, prefix: string): Promise<string> {
        if (outer) {
            if (inner) return this.prefix + prefix + await delay(105, "method-nested-inner") + "!";
            return this.prefix + prefix + await delay(106, "method-nested-outer") + "!";
        }
        return this.prefix + prefix + await delay(107, "method-nested-fallthrough") + "!";
    }

    async conditionalInlineAwaitReturnMethod(flag: boolean, prefix: string): Promise<string> {
        return flag
            ? this.prefix + prefix + await delay(113, "method-conditional-true") + "!"
            : this.prefix + prefix + await delay(114, "method-conditional-false") + "!";
    }

    async conditionalMixedInlineAwaitReturnMethod(flag: boolean, prefix: string): Promise<string> {
        return flag
            ? this.prefix + prefix + "method-conditional-mixed-sync!"
            : this.prefix + prefix + await delay(118, "method-conditional-mixed-await") + "!";
    }

    async nestedConditionalInlineAwaitReturnMethod(outer: boolean, inner: boolean, prefix: string): Promise<string> {
        return outer
            ? inner
                ? this.prefix + prefix + await delay(125, "method-nested-conditional-inner") + "!"
                : this.prefix + prefix + "method-nested-conditional-sync!"
            : this.prefix + prefix + await delay(126, "method-nested-conditional-fallthrough") + "!";
    }

    async logicalOrInlineAwaitReturnMethod(): Promise<string> {
        return this.prefix || await delay(137, "method-logical-or-await");
    }

    async logicalAndInlineAwaitReturnMethod(flag: boolean): Promise<any> {
        return flag && await delay(138, "method-logical-and-await");
    }

    async nullishInlineAwaitReturnMethod(prefix: string | undefined): Promise<string> {
        return prefix ?? await delay(142, "method-nullish-await");
    }

    async preludeLocalInlineAwaitReturnMethod(prefix: string): Promise<string> {
        const label = this.prefix + prefix + "method-prelude-local-";
        return label + await delay(145, "await") + "!";
    }

    async preludeLogicalLocalInlineAwaitReturnMethod(flag: boolean, prefix: string): Promise<any> {
        const label = this.prefix + prefix + "method-prelude-logical-";
        return flag && label + await delay(148, "await") + "!";
    }

    async preludeDirectReturnAwaitMethod(prefix: string): Promise<string> {
        const label = this.prefix + prefix + "method-prelude-direct-";
        return await delay(151, label + "await");
    }

    async preludeIfBranchInlineAwaitReturnMethod(flag: boolean, prefix: string): Promise<string> {
        const label = this.prefix + prefix + "method-prelude-if-";
        if (flag) return label + await delay(154, "await") + "!";
        return label + "sync!";
    }

    async preludeNestedIfBranchInlineAwaitReturnMethod(outer: boolean, inner: boolean, prefix: string): Promise<string> {
        const label = this.prefix + prefix + "method-prelude-nested-if-";
        if (outer) {
            if (inner) return label + await delay(173, "inner") + "!";
            return label + await delay(174, "outer") + "!";
        }
        return label + await delay(175, "fallthrough") + "!";
    }

    async preludeBranchConditionalInlineAwaitReturnMethod(outer: boolean, inner: boolean, prefix: string): Promise<string> {
        const label = this.prefix + prefix + "method-prelude-branch-conditional-";
        if (outer) {
            return inner
                ? label + await delay(182, "inner") + "!"
                : label + "sync!";
        }
        return label + await delay(183, "fallthrough") + "!";
    }

    async preludeNestedConditionalInlineAwaitReturnMethod(outer: boolean, inner: boolean, prefix: string): Promise<string> {
        const label = this.prefix + prefix + "method-prelude-nested-conditional-";
        return outer
            ? inner
                ? label + await delay(192, "inner") + "!"
                : label + "sync!"
            : label + await delay(193, "fallthrough") + "!";
    }

    async preludeNullishLocalInlineAwaitReturnMethod(prefix: string): Promise<string> {
        const left: string | undefined = undefined;
        const label = this.prefix + prefix + "method-prelude-nullish-";
        return left ?? label + await delay(201, "await") + "!";
    }

    async preludeExpressionStatementInlineAwaitReturnMethod(prefix: string): Promise<string> {
        let trace = "expr-";
        trace = trace + "tail-";
        const label = this.prefix + prefix + trace + "method-prelude-expr-";
        trace = trace + "again-";
        return label + trace + await delay(211, "await") + "!";
    }

    async preludeExpressionStatementDirectReturnAwaitMethod(prefix: string): Promise<string> {
        let trace = "direct-";
        trace = trace + "expr-";
        const label = this.prefix + prefix + trace + "method-prelude-direct-expr-";
        trace = trace + "tail";
        return await delay(221, label + trace);
    }

    async preludeExpressionStatementAwaitedLocalReturnMethod(prefix: string): Promise<string> {
        prefix = prefix + "awaited-";
        prefix = prefix + "expr-";
        const value = await delay(231, "local");
        return this.prefix + prefix + value + "!";
    }

    async preludeLocalAwaitedLocalReturnMethod(prefix: string): Promise<string> {
        const label = this.prefix + prefix + "method-local-awaited-";
        const value = await delay(1, "local");
        return label + value + "!";
    }

    async awaitExpressionStatementReturnMethod(prefix: string): Promise<string> {
        await delay(1, "ignored");
        return this.prefix + prefix + "method-await-expression-done";
    }
}

const arrow = async (): Promise<string> => {
    const value = await delay(20, "arrow");
    return value + "!";
};

const arrowLetAwaitAlias = async (prefix: string): Promise<string> => {
    let value = await delay(21, "arrow-let-alias");
    return prefix + value;
};

const arrowParenthesizedLetAwaitAlias = async (prefix: string): Promise<string> => {
    let value = await delay(21, prefix + "arrow-parenthesized-let-alias");
    return (value);
};

const arrowParam = async (prefix: string): Promise<string> => {
    const value = await delay(22, "arrow-param");
    return prefix + value;
};

const arrowInitializerExpressionAwaitReturn = async (prefix: string): Promise<string> => {
    const decorated = prefix + await delay(24, "arrow-initializer") + "!";
    return decorated;
};

const arrowAssignmentExpressionAwaitReturn = async (prefix: string): Promise<string> => {
    let decorated: string;
    decorated = prefix + await delay(25, "arrow-assignment") + "!";
    return decorated;
};

const arrowDirectAssignmentAwaitReturn = async (prefix: string): Promise<string> => {
    let value: string;
    value = await delay(21, prefix + "arrow-direct-assignment");
    return value;
};

const arrowInitializedDirectAssignmentAwaitReturn = async (prefix: string): Promise<string> => {
    let value = recordDirectAssignmentInit(prefix + "arrow-init|");
    value = await delay(27, prefix + "arrow-initialized-direct-assignment");
    return value;
};

const arrowInitializedAssignmentExpressionAwaitReturn = async (prefix: string): Promise<string> => {
    let decorated = prefix + "init-";
    decorated = decorated + await delay(26, "arrow-assignment") + "!";
    return decorated;
};

const arrowTwoAwait = async (prefix: string): Promise<string> => {
    const first = await delay(49, "arrow-one");
    const second = await delay(50, prefix + first);
    return first + ":" + second + "!";
};

const arrowThreeAwait = async (prefix: string): Promise<string> => {
    const first = await delay(57, "arrow-one");
    const second = await delay(58, prefix + first);
    const third = await delay(59, first + ":" + second + "-three");
    return first + ":" + second + ":" + third + "!";
};

const arrowFourAwait = async (prefix: string): Promise<string> => {
    const first = await delay(68, "arrow-one");
    const second = await delay(69, prefix + first);
    const third = await delay(70, first + ":" + second + "-three");
    const fourth = await delay(71, first + ":" + second + ":" + third + "-four");
    return first + ":" + second + ":" + third + ":" + fourth + "!";
};

const arrowFiveAwait = async (prefix: string): Promise<string> => {
    const first = await delay(82, "arrow-one");
    const second = await delay(83, prefix + first);
    const third = await delay(84, first + ":" + second + "-three");
    const fourth = await delay(85, first + ":" + second + ":" + third + "-four");
    const fifth = await delay(86, first + ":" + second + ":" + third + ":" + fourth + "-five");
    return first + ":" + second + ":" + third + ":" + fourth + ":" + fifth + "!";
};

const arrowPreludeExpressionStatementFiveAwait = async (prefix: string): Promise<string> => {
    prefix = prefix + "expr-";
    prefix = prefix + "five-";
    const first = await delay(260, "arrow-one");
    const second = await delay(261, prefix + first);
    const third = await delay(262, first + ":" + second + "-three");
    const fourth = await delay(263, first + ":" + second + ":" + third + "-four");
    const fifth = await delay(264, first + ":" + second + ":" + third + ":" + fourth + "-five");
    return first + ":" + second + ":" + third + ":" + fourth + ":" + fifth + "!";
};

const arrowPreludeLocalFiveAwait = async (prefix: string): Promise<string> => {
    const label = prefix + "arrow-local-five-";
    const first = await delay(1, label + "one");
    const second = await delay(2, label + first + "-two");
    const third = await delay(3, label + first + ":" + second + "-three");
    const fourth = await delay(4, label + first + ":" + second + ":" + third + "-four");
    const fifth = await delay(5, label + first + ":" + second + ":" + third + ":" + fourth + "-five");
    return label + first + ":" + second + ":" + third + ":" + fourth + ":" + fifth + "!";
};

const arrowInlineAwaitReturn = async (prefix: string): Promise<string> => {
    return prefix + await delay(89, "arrow-inline") + "!";
};

const arrowBranchReturnAwait = async (flag: boolean): Promise<string> => {
    if (flag) return await delay(94, "arrow-true");
    return await delay(95, "arrow-false");
};

const arrowBranchInlineAwaitReturn = async (flag: boolean, prefix: string): Promise<string> => {
    if (flag) return prefix + await delay(100, "arrow-inline-true") + "!";
    return prefix + await delay(101, "arrow-inline-false") + "!";
};

const arrowBranchMixedInlineAwaitReturn = async (flag: boolean, prefix: string): Promise<string> => {
    if (flag) return prefix + await delay(122, "arrow-branch-mixed-await") + "!";
    return prefix + "arrow-branch-mixed-sync!";
};

const arrowBranchConditionalInlineAwaitReturn = async (outer: boolean, inner: boolean, prefix: string): Promise<string> => {
    if (outer) {
        return inner
            ? prefix + await delay(133, "arrow-branch-conditional-inner") + "!"
            : prefix + "arrow-branch-conditional-sync!";
    }
    return prefix + await delay(134, "arrow-branch-conditional-fallthrough") + "!";
};

const arrowNestedBranchInlineAwaitReturn = async (outer: boolean, inner: boolean, prefix: string): Promise<string> => {
    if (outer) {
        if (inner) return prefix + await delay(108, "arrow-nested-inner") + "!";
        return prefix + await delay(109, "arrow-nested-outer") + "!";
    }
    return prefix + await delay(110, "arrow-nested-fallthrough") + "!";
};

const arrowConditionalInlineAwaitReturn = async (flag: boolean, prefix: string): Promise<string> => {
    return flag
        ? prefix + await delay(115, "arrow-conditional-true") + "!"
        : prefix + await delay(116, "arrow-conditional-false") + "!";
};

const arrowConditionalMixedInlineAwaitReturn = async (flag: boolean, prefix: string): Promise<string> => {
    return flag
        ? prefix + await delay(119, "arrow-conditional-mixed-await") + "!"
        : prefix + "arrow-conditional-mixed-sync!";
};

const arrowNestedConditionalInlineAwaitReturn = async (outer: boolean, inner: boolean, prefix: string): Promise<string> => {
    return outer
        ? inner
            ? prefix + await delay(127, "arrow-nested-conditional-inner") + "!"
            : prefix + "arrow-nested-conditional-sync!"
        : prefix + await delay(128, "arrow-nested-conditional-fallthrough") + "!";
};

const arrowLogicalOrInlineAwaitReturn = async (prefix: string): Promise<string> => {
    return prefix || await delay(139, "arrow-logical-or-await");
};

const arrowLogicalAndInlineAwaitReturn = async (flag: boolean): Promise<any> => {
    return flag && await delay(140, "arrow-logical-and-await");
};

const arrowNullishInlineAwaitReturn = async (prefix: string | undefined): Promise<string> => {
    return prefix ?? await delay(143, "arrow-nullish-await");
};

const arrowPreludeLocalInlineAwaitReturn = async (prefix: string): Promise<string> => {
    const label = prefix + "arrow-prelude-";
    const decorated = label + "local-";
    return decorated + await delay(146, "await") + "!";
};

const arrowPreludeNullishLocalInlineAwaitReturn = async (prefix: string | undefined): Promise<string> => {
    const fallback = "arrow-prelude-nullish-";
    return prefix ?? fallback + await delay(149, "await") + "!";
};

const arrowPreludeDirectReturnAwait = async (prefix: string): Promise<string> => {
    const label = prefix + "arrow-prelude-direct-";
    return await delay(152, label + "await");
};

const arrowPreludeIfBranchInlineAwaitReturn = async (flag: boolean, prefix: string): Promise<string> => {
    const label = prefix + "arrow-prelude-if-";
    if (flag) return label + await delay(155, "await") + "!";
    return label + "sync!";
};

const arrowPreludeNestedIfBranchInlineAwaitReturn = async (outer: boolean, inner: boolean, prefix: string): Promise<string> => {
    const label = prefix + "arrow-prelude-nested-if-";
    if (outer) {
        if (inner) return label + await delay(176, "inner") + "!";
        return label + await delay(177, "outer") + "!";
    }
    return label + await delay(178, "fallthrough") + "!";
};

const arrowPreludeBranchConditionalInlineAwaitReturn = async (outer: boolean, inner: boolean, prefix: string): Promise<string> => {
    const label = prefix + "arrow-prelude-branch-conditional-";
    if (outer) {
        return inner
            ? label + await delay(184, "inner") + "!"
            : label + "sync!";
    }
    return label + await delay(185, "fallthrough") + "!";
};

const arrowPreludeNestedConditionalInlineAwaitReturn = async (outer: boolean, inner: boolean, prefix: string): Promise<string> => {
    const label = prefix + "arrow-prelude-nested-conditional-";
    return outer
        ? inner
            ? label + await delay(194, "inner") + "!"
            : label + "sync!"
        : label + await delay(195, "fallthrough") + "!";
};

const arrowPreludeLogicalAndLocalInlineAwaitReturn = async (prefix: string): Promise<any> => {
    const left = true;
    const label = prefix + "arrow-prelude-logical-and-";
    return left && label + await delay(202, "await") + "!";
};

const arrowPreludeExpressionStatementInlineAwaitReturn = async (prefix: string): Promise<string> => {
    let trace = "expr-";
    trace = trace + "tail-";
    const label = prefix + trace + "arrow-prelude-expr-";
    trace = trace + "again-";
    return label + trace + await delay(212, "await") + "!";
};

const arrowPreludeExpressionStatementDirectReturnAwait = async (prefix: string): Promise<string> => {
    let trace = "direct-";
    trace = trace + "expr-";
    const label = prefix + trace + "arrow-prelude-direct-expr-";
    trace = trace + "tail";
    return await delay(222, label + trace);
};

const arrowPreludeExpressionStatementAwaitedLocalReturn = async (prefix: string): Promise<string> => {
    prefix = prefix + "awaited-";
    prefix = prefix + "expr-";
    const value = await delay(232, "local");
    return prefix + value + "!";
};

const arrowPreludeLocalAwaitedLocalReturn = async (prefix: string): Promise<string> => {
    const label = prefix + "arrow-local-awaited-";
    const value = await delay(1, "local");
    return label + value + "!";
};

const arrowAwaitExpressionStatementReturn = async (prefix: string): Promise<string> => {
    await delay(1, "ignored");
    return prefix + "arrow-await-expression-done";
};

suffix().then((value: string): void => {
    console.log("suffix:", value);
});

doubled().then((value: number): void => {
    console.log("double:", value);
});

letAwaitAlias("fn-").then((value: string): void => {
    console.log("let-await-alias:", value);
});

parenthesizedLetAwaitAlias("fn-").then((value: string): void => {
    console.log("parenthesized-let-await-alias:", value);
});

tagged("fn-").then((value: string): void => {
    console.log("tagged:", value);
});

directAssignmentAwaitReturn("fn-").then((value: string): void => {
    console.log("direct-assignment-await-return:", value);
});

initializedDirectAssignmentAwaitReturn("fn-").then((value: string): void => {
    console.log("initialized-direct-assignment-await-return:", value);
});

twoAwait("fn-").then((value: string): void => {
    console.log("two-await:", value);
});

threeAwait("fn-").then((value: string): void => {
    console.log("three-await:", value);
});

fourAwait("fn-").then((value: string): void => {
    console.log("four-await:", value);
});

fiveAwait("fn-").then((value: string): void => {
    console.log("five-await:", value);
});

preludeExpressionStatementFiveAwait("fn-").then((value: string): void => {
    console.log("prelude-expression-statement-five-await:", value);
});

inlineAwaitReturn("fn-").then((value: string): void => {
    console.log("inline-await-return:", value);
});

branchReturnAwait(true).then((value: string): void => {
    console.log("branch-return-await-true:", value);
});

branchReturnAwait(false).then((value: string): void => {
    console.log("branch-return-await-false:", value);
});

branchInlineAwaitReturn(true, "fn-").then((value: string): void => {
    console.log("branch-inline-await-return-true:", value);
});

branchInlineAwaitReturn(false, "fn-").then((value: string): void => {
    console.log("branch-inline-await-return-false:", value);
});

branchMixedInlineAwaitReturn(true, "fn-").then((value: string): void => {
    console.log("branch-mixed-inline-await-return-await:", value);
});

branchMixedInlineAwaitReturn(false, "fn-").then((value: string): void => {
    console.log("branch-mixed-inline-await-return-sync:", value);
});

branchConditionalInlineAwaitReturn(true, true, "fn-").then((value: string): void => {
    console.log("branch-conditional-inline-await-return-inner:", value);
});

branchConditionalInlineAwaitReturn(true, false, "fn-").then((value: string): void => {
    console.log("branch-conditional-inline-await-return-sync:", value);
});

branchConditionalInlineAwaitReturn(false, false, "fn-").then((value: string): void => {
    console.log("branch-conditional-inline-await-return-fallthrough:", value);
});

nestedBranchInlineAwaitReturn(true, true, "fn-").then((value: string): void => {
    console.log("nested-branch-inline-await-return-inner:", value);
});

nestedBranchInlineAwaitReturn(true, false, "fn-").then((value: string): void => {
    console.log("nested-branch-inline-await-return-outer:", value);
});

nestedBranchInlineAwaitReturn(false, false, "fn-").then((value: string): void => {
    console.log("nested-branch-inline-await-return-fallthrough:", value);
});

conditionalInlineAwaitReturn(true, "fn-").then((value: string): void => {
    console.log("conditional-inline-await-return-true:", value);
});

conditionalInlineAwaitReturn(false, "fn-").then((value: string): void => {
    console.log("conditional-inline-await-return-false:", value);
});

conditionalMixedInlineAwaitReturn(true, "fn-").then((value: string): void => {
    console.log("conditional-mixed-inline-await-return-await:", value);
});

conditionalMixedInlineAwaitReturn(false, "fn-").then((value: string): void => {
    console.log("conditional-mixed-inline-await-return-sync:", value);
});

nestedConditionalInlineAwaitReturn(true, true, "fn-").then((value: string): void => {
    console.log("nested-conditional-inline-await-return-inner:", value);
});

nestedConditionalInlineAwaitReturn(true, false, "fn-").then((value: string): void => {
    console.log("nested-conditional-inline-await-return-sync:", value);
});

nestedConditionalInlineAwaitReturn(false, false, "fn-").then((value: string): void => {
    console.log("nested-conditional-inline-await-return-fallthrough:", value);
});

logicalOrInlineAwaitReturn("logical-or-sync").then((value: string): void => {
    console.log("logical-or-inline-await-return-sync:", value);
});

logicalOrInlineAwaitReturn("").then((value: string): void => {
    console.log("logical-or-inline-await-return-await:", value);
});

logicalAndInlineAwaitReturn(false).then((value: any): void => {
    console.log("logical-and-inline-await-return-sync:", value);
});

logicalAndInlineAwaitReturn(true).then((value: any): void => {
    console.log("logical-and-inline-await-return-await:", value);
});

nullishInlineAwaitReturn("nullish-sync").then((value: string): void => {
    console.log("nullish-inline-await-return-sync:", value);
});

nullishInlineAwaitReturn(undefined).then((value: string): void => {
    console.log("nullish-inline-await-return-await:", value);
});

preludeLocalInlineAwaitReturn("fn-").then((value: string): void => {
    console.log("prelude-local-inline-await-return:", value);
});

preludeConditionalLocalInlineAwaitReturn(true, "fn-").then((value: string): void => {
    console.log("prelude-conditional-local-inline-await-return:", value);
});

preludeDirectReturnAwait("fn-").then((value: string): void => {
    console.log("prelude-direct-return-await:", value);
});

preludeIfBranchInlineAwaitReturn(true, "fn-").then((value: string): void => {
    console.log("prelude-if-branch-inline-await-return:", value);
});

preludeNestedIfBranchInlineAwaitReturn(true, true, "fn-").then((value: string): void => {
    console.log("prelude-nested-if-branch-inline-await-return-inner:", value);
});

preludeBranchConditionalInlineAwaitReturn(true, true, "fn-").then((value: string): void => {
    console.log("prelude-branch-conditional-inline-await-return-inner:", value);
});

preludeNestedConditionalInlineAwaitReturn(false, false, "fn-").then((value: string): void => {
    console.log("prelude-nested-conditional-inline-await-return-fallthrough:", value);
});

preludeLogicalOrLocalInlineAwaitReturn("fn-").then((value: string): void => {
    console.log("prelude-logical-or-local-inline-await-return:", value);
});

preludeExpressionStatementInlineAwaitReturn("fn-").then((value: string): void => {
    console.log("prelude-expression-statement-inline-await-return:", value);
});

preludeExpressionStatementDirectReturnAwait("fn-").then((value: string): void => {
    console.log("prelude-expression-statement-direct-return-await:", value);
});

preludeExpressionStatementAwaitedLocalReturn("fn-").then((value: string): void => {
    console.log("prelude-expression-statement-awaited-local-return:", value);
});

staged("fn-").then((value: string): void => {
    console.log("staged:", value);
});

initializerExpressionAwaitReturn("fn-").then((value: string): void => {
    console.log("initializer-expression-await-return:", value);
});

assignmentExpressionAwaitReturn("fn-").then((value: string): void => {
    console.log("assignment-expression-await-return:", value);
});

initializedAssignmentExpressionAwaitReturn("fn-").then((value: string): void => {
    console.log("initialized-assignment-expression-await-return:", value);
});

new Worker("job-").label().then((value: string): void => {
    console.log("method:", value);
});

new Worker("this-").letAwaitAliasMethod("!").then((value: string): void => {
    console.log("method-let-await-alias:", value);
});

new Worker("this-").parenthesizedLetAwaitAliasMethod("!").then((value: string): void => {
    console.log("method-parenthesized-let-await-alias:", value);
});

new Worker("job-").prefixed("class-").then((value: string): void => {
    console.log("method-param:", value);
});

new Worker("this-").thisPrefixed().then((value: string): void => {
    console.log("method-this:", value);
});

new Worker("this-").stagedThis("!").then((value: string): void => {
    console.log("method-staged-this:", value);
});

new Worker("this-").initializerExpressionAwaitReturnMethod("!").then((value: string): void => {
    console.log("method-initializer-expression-await-return:", value);
});

new Worker("this-").assignmentExpressionAwaitReturnMethod("!").then((value: string): void => {
    console.log("method-assignment-expression-await-return:", value);
});

new Worker("this-").directAssignmentAwaitReturnMethod("!").then((value: string): void => {
    console.log("method-direct-assignment-await-return:", value);
});

new Worker("this-").initializedDirectAssignmentAwaitReturnMethod("!").then((value: string): void => {
    console.log("method-initialized-direct-assignment-await-return:", value);
});

new Worker("this-").initializedAssignmentExpressionAwaitReturnMethod("!").then((value: string): void => {
    console.log("method-initialized-assignment-expression-await-return:", value);
});

new Worker("effect-").sideEffectThis().then((value: string): void => {
    console.log("method-side-effect:", value);
});

new Worker("if-").conditionalSideEffect(true).then((value: string): void => {
    console.log("method-if-side-effect:", value);
});

new Worker("branch-").branchLet(true).then((value: string): void => {
    console.log("method-branch-let:", value);
});

new Worker("uninit-").branchUninitializedLet(true).then((value: string): void => {
    console.log("method-branch-uninit-let:", value);
});

new Worker("loop-").loopAfterAwait(2).then((value: string): void => {
    console.log("method-loop:", value);
});

new Worker("do-").doWhileAfterAwait(2).then((value: string): void => {
    console.log("method-do-while:", value);
});

new Worker("for-").forAfterAwait(2).then((value: string): void => {
    console.log("method-for:", value);
});

new Worker("for-continue-").forContinueAfterAwait(3).then((value: string): void => {
    console.log("method-for-continue:", value);
});

new Worker("forof-").forOfAfterAwait().then((value: string): void => {
    console.log("method-for-of:", value);
});

new Worker("forin-").forInAfterAwait().then((value: string): void => {
    console.log("method-for-in:", value);
});

new Worker("control-").loopControlAfterAwait().then((value: string): void => {
    console.log("method-loop-control:", value);
});

new Worker("try-").tryCatchAfterAwait().then((value: string): void => {
    console.log("method-try-catch:", value);
});

new Worker("reject-").throwAfterAwait().catch((reason: string): string => {
    console.log("method-throw:", reason);
    return "handled";
});

new Worker("return-").earlyReturnAfterAwait(true).then((value: string): void => {
    console.log("method-early-return:", value);
});

new Worker("return-").earlyReturnAfterAwait(false).then((value: string): void => {
    console.log("method-late-return:", value);
});

new Worker("switch-").switchReturnAfterAwait("a").then((value: string): void => {
    console.log("method-switch-a:", value);
});

new Worker("switch-").switchReturnAfterAwait("z").then((value: string): void => {
    console.log("method-switch-default:", value);
});

new Worker("switch-break-").switchBreakAfterAwait("b").then((value: string): void => {
    console.log("method-switch-break:", value);
});

new Worker("void-").voidAfterAwait().then((value: string): void => {
    console.log("method-void-await:", value);
});

const expressionlessWorker = new Worker("exprless-");
expressionlessWorker.expressionlessReturnAfterAwait().then((_value: any): void => {
    console.log("method-expressionless-return:", expressionlessWorker.prefix);
});

new Worker("method-two-").twoAwaitMethod("class-").then((value: string): void => {
    console.log("method-two-await:", value);
});

new Worker("method-three-").threeAwaitMethod("class-").then((value: string): void => {
    console.log("method-three-await:", value);
});

new Worker("method-four-").fourAwaitMethod("class-").then((value: string): void => {
    console.log("method-four-await:", value);
});

new Worker("method-five-").fiveAwaitMethod("class-").then((value: string): void => {
    console.log("method-five-await:", value);
});

new Worker("method-prelude-five-").preludeExpressionStatementFiveAwaitMethod("class-").then((value: string): void => {
    console.log("method-prelude-expression-statement-five-await:", value);
});

new Worker("method-inline-").inlineAwaitReturnMethod("class-").then((value: string): void => {
    console.log("method-inline-await-return:", value);
});

new Worker("method-").branchReturnAwaitMethod(true).then((value: string): void => {
    console.log("method-branch-return-await-true:", value);
});

new Worker("method-").branchReturnAwaitMethod(false).then((value: string): void => {
    console.log("method-branch-return-await-false:", value);
});

new Worker("method-inline-").branchInlineAwaitReturnMethod(true, "class-").then((value: string): void => {
    console.log("method-branch-inline-await-return-true:", value);
});

new Worker("method-inline-").branchInlineAwaitReturnMethod(false, "class-").then((value: string): void => {
    console.log("method-branch-inline-await-return-false:", value);
});

new Worker("method-branch-mixed-").branchMixedInlineAwaitReturnMethod(true, "class-").then((value: string): void => {
    console.log("method-branch-mixed-inline-await-return-sync:", value);
});

new Worker("method-branch-mixed-").branchMixedInlineAwaitReturnMethod(false, "class-").then((value: string): void => {
    console.log("method-branch-mixed-inline-await-return-await:", value);
});

new Worker("method-branch-conditional-").branchConditionalInlineAwaitReturnMethod(true, true, "class-").then((value: string): void => {
    console.log("method-branch-conditional-inline-await-return-inner:", value);
});

new Worker("method-branch-conditional-").branchConditionalInlineAwaitReturnMethod(true, false, "class-").then((value: string): void => {
    console.log("method-branch-conditional-inline-await-return-sync:", value);
});

new Worker("method-branch-conditional-").branchConditionalInlineAwaitReturnMethod(false, false, "class-").then((value: string): void => {
    console.log("method-branch-conditional-inline-await-return-fallthrough:", value);
});

new Worker("method-nested-").nestedBranchInlineAwaitReturnMethod(true, true, "class-").then((value: string): void => {
    console.log("method-nested-branch-inline-await-return-inner:", value);
});

new Worker("method-nested-").nestedBranchInlineAwaitReturnMethod(true, false, "class-").then((value: string): void => {
    console.log("method-nested-branch-inline-await-return-outer:", value);
});

new Worker("method-nested-").nestedBranchInlineAwaitReturnMethod(false, false, "class-").then((value: string): void => {
    console.log("method-nested-branch-inline-await-return-fallthrough:", value);
});

new Worker("method-conditional-").conditionalInlineAwaitReturnMethod(true, "class-").then((value: string): void => {
    console.log("method-conditional-inline-await-return-true:", value);
});

new Worker("method-conditional-").conditionalInlineAwaitReturnMethod(false, "class-").then((value: string): void => {
    console.log("method-conditional-inline-await-return-false:", value);
});

new Worker("method-conditional-").conditionalMixedInlineAwaitReturnMethod(true, "class-").then((value: string): void => {
    console.log("method-conditional-mixed-inline-await-return-sync:", value);
});

new Worker("method-conditional-").conditionalMixedInlineAwaitReturnMethod(false, "class-").then((value: string): void => {
    console.log("method-conditional-mixed-inline-await-return-await:", value);
});

new Worker("method-nested-conditional-").nestedConditionalInlineAwaitReturnMethod(true, true, "class-").then((value: string): void => {
    console.log("method-nested-conditional-inline-await-return-inner:", value);
});

new Worker("method-nested-conditional-").nestedConditionalInlineAwaitReturnMethod(true, false, "class-").then((value: string): void => {
    console.log("method-nested-conditional-inline-await-return-sync:", value);
});

new Worker("method-nested-conditional-").nestedConditionalInlineAwaitReturnMethod(false, false, "class-").then((value: string): void => {
    console.log("method-nested-conditional-inline-await-return-fallthrough:", value);
});

new Worker("method-logical-or-sync").logicalOrInlineAwaitReturnMethod().then((value: string): void => {
    console.log("method-logical-or-inline-await-return-sync:", value);
});

new Worker("").logicalOrInlineAwaitReturnMethod().then((value: string): void => {
    console.log("method-logical-or-inline-await-return-await:", value);
});

new Worker("method-logical-and-sync").logicalAndInlineAwaitReturnMethod(false).then((value: any): void => {
    console.log("method-logical-and-inline-await-return-sync:", value);
});

new Worker("method-logical-and-source").logicalAndInlineAwaitReturnMethod(true).then((value: any): void => {
    console.log("method-logical-and-inline-await-return-await:", value);
});

new Worker("method-nullish-source").nullishInlineAwaitReturnMethod("method-nullish-sync").then((value: string): void => {
    console.log("method-nullish-inline-await-return-sync:", value);
});

new Worker("method-nullish-source").nullishInlineAwaitReturnMethod(undefined).then((value: string): void => {
    console.log("method-nullish-inline-await-return-await:", value);
});

new Worker("method-prelude-").preludeLocalInlineAwaitReturnMethod("class-").then((value: string): void => {
    console.log("method-prelude-local-inline-await-return:", value);
});

new Worker("method-prelude-").preludeLogicalLocalInlineAwaitReturnMethod(true, "class-").then((value: any): void => {
    console.log("method-prelude-logical-local-inline-await-return:", value);
});

new Worker("method-prelude-").preludeDirectReturnAwaitMethod("class-").then((value: string): void => {
    console.log("method-prelude-direct-return-await:", value);
});

new Worker("method-prelude-").preludeIfBranchInlineAwaitReturnMethod(true, "class-").then((value: string): void => {
    console.log("method-prelude-if-branch-inline-await-return:", value);
});

new Worker("method-prelude-").preludeNestedIfBranchInlineAwaitReturnMethod(true, false, "class-").then((value: string): void => {
    console.log("method-prelude-nested-if-branch-inline-await-return-outer:", value);
});

new Worker("method-prelude-").preludeBranchConditionalInlineAwaitReturnMethod(false, false, "class-").then((value: string): void => {
    console.log("method-prelude-branch-conditional-inline-await-return-fallthrough:", value);
});

new Worker("method-prelude-").preludeNestedConditionalInlineAwaitReturnMethod(true, true, "class-").then((value: string): void => {
    console.log("method-prelude-nested-conditional-inline-await-return-inner:", value);
});

new Worker("method-prelude-").preludeNullishLocalInlineAwaitReturnMethod("class-").then((value: string): void => {
    console.log("method-prelude-nullish-local-inline-await-return:", value);
});

new Worker("method-prelude-").preludeExpressionStatementInlineAwaitReturnMethod("class-").then((value: string): void => {
    console.log("method-prelude-expression-statement-inline-await-return:", value);
});

new Worker("method-prelude-").preludeExpressionStatementDirectReturnAwaitMethod("class-").then((value: string): void => {
    console.log("method-prelude-expression-statement-direct-return-await:", value);
});

new Worker("method-prelude-").preludeExpressionStatementAwaitedLocalReturnMethod("class-").then((value: string): void => {
    console.log("method-prelude-expression-statement-awaited-local-return:", value);
});

arrow().then((value: string): void => {
    console.log("arrow:", value);
});

arrowLetAwaitAlias("value-").then((value: string): void => {
    console.log("arrow-let-await-alias:", value);
});

arrowParenthesizedLetAwaitAlias("value-").then((value: string): void => {
    console.log("arrow-parenthesized-let-await-alias:", value);
});

arrowParam("value-").then((value: string): void => {
    console.log("arrow-param:", value);
});

arrowInitializerExpressionAwaitReturn("value-").then((value: string): void => {
    console.log("arrow-initializer-expression-await-return:", value);
});

arrowAssignmentExpressionAwaitReturn("value-").then((value: string): void => {
    console.log("arrow-assignment-expression-await-return:", value);
});

arrowDirectAssignmentAwaitReturn("value-").then((value: string): void => {
    console.log("arrow-direct-assignment-await-return:", value);
});

arrowInitializedDirectAssignmentAwaitReturn("value-").then((value: string): void => {
    console.log("arrow-initialized-direct-assignment-await-return:", value);
});

console.log("direct-assignment-init-trace:", directAssignmentInitTrace);

arrowInitializedAssignmentExpressionAwaitReturn("value-").then((value: string): void => {
    console.log("arrow-initialized-assignment-expression-await-return:", value);
});

arrowTwoAwait("value-").then((value: string): void => {
    console.log("arrow-two-await:", value);
});

arrowThreeAwait("value-").then((value: string): void => {
    console.log("arrow-three-await:", value);
});

arrowFourAwait("value-").then((value: string): void => {
    console.log("arrow-four-await:", value);
});

arrowFiveAwait("value-").then((value: string): void => {
    console.log("arrow-five-await:", value);
    preludeLocalFiveAwait("fn-").then((fnValue: string): void => {
        console.log("prelude-local-five-await:", fnValue);
        new Worker("method-prelude-five-").preludeLocalFiveAwaitMethod("class-").then((methodValue: string): void => {
            console.log("method-prelude-local-five-await:", methodValue);
            arrowPreludeLocalFiveAwait("value-").then((arrowValue: string): void => {
                console.log("arrow-prelude-local-five-await:", arrowValue);
            });
        });
    });
});

arrowPreludeExpressionStatementFiveAwait("value-").then((value: string): void => {
    console.log("arrow-prelude-expression-statement-five-await:", value);
});

arrowInlineAwaitReturn("value-").then((value: string): void => {
    console.log("arrow-inline-await-return:", value);
});

arrowBranchReturnAwait(true).then((value: string): void => {
    console.log("arrow-branch-return-await-true:", value);
});

arrowBranchReturnAwait(false).then((value: string): void => {
    console.log("arrow-branch-return-await-false:", value);
});

arrowBranchInlineAwaitReturn(true, "value-").then((value: string): void => {
    console.log("arrow-branch-inline-await-return-true:", value);
});

arrowBranchInlineAwaitReturn(false, "value-").then((value: string): void => {
    console.log("arrow-branch-inline-await-return-false:", value);
});

arrowBranchMixedInlineAwaitReturn(true, "value-").then((value: string): void => {
    console.log("arrow-branch-mixed-inline-await-return-await:", value);
});

arrowBranchMixedInlineAwaitReturn(false, "value-").then((value: string): void => {
    console.log("arrow-branch-mixed-inline-await-return-sync:", value);
});

arrowBranchConditionalInlineAwaitReturn(true, true, "value-").then((value: string): void => {
    console.log("arrow-branch-conditional-inline-await-return-inner:", value);
});

arrowBranchConditionalInlineAwaitReturn(true, false, "value-").then((value: string): void => {
    console.log("arrow-branch-conditional-inline-await-return-sync:", value);
});

arrowBranchConditionalInlineAwaitReturn(false, false, "value-").then((value: string): void => {
    console.log("arrow-branch-conditional-inline-await-return-fallthrough:", value);
});

arrowNestedBranchInlineAwaitReturn(true, true, "value-").then((value: string): void => {
    console.log("arrow-nested-branch-inline-await-return-inner:", value);
});

arrowNestedBranchInlineAwaitReturn(true, false, "value-").then((value: string): void => {
    console.log("arrow-nested-branch-inline-await-return-outer:", value);
});

arrowNestedBranchInlineAwaitReturn(false, false, "value-").then((value: string): void => {
    console.log("arrow-nested-branch-inline-await-return-fallthrough:", value);
});

arrowConditionalInlineAwaitReturn(true, "value-").then((value: string): void => {
    console.log("arrow-conditional-inline-await-return-true:", value);
});

arrowConditionalInlineAwaitReturn(false, "value-").then((value: string): void => {
    console.log("arrow-conditional-inline-await-return-false:", value);
});

arrowConditionalMixedInlineAwaitReturn(true, "value-").then((value: string): void => {
    console.log("arrow-conditional-mixed-inline-await-return-await:", value);
});

arrowConditionalMixedInlineAwaitReturn(false, "value-").then((value: string): void => {
    console.log("arrow-conditional-mixed-inline-await-return-sync:", value);
});

arrowNestedConditionalInlineAwaitReturn(true, true, "value-").then((value: string): void => {
    console.log("arrow-nested-conditional-inline-await-return-inner:", value);
});

arrowNestedConditionalInlineAwaitReturn(true, false, "value-").then((value: string): void => {
    console.log("arrow-nested-conditional-inline-await-return-sync:", value);
});

arrowNestedConditionalInlineAwaitReturn(false, false, "value-").then((value: string): void => {
    console.log("arrow-nested-conditional-inline-await-return-fallthrough:", value);
});

arrowLogicalOrInlineAwaitReturn("arrow-logical-or-sync").then((value: string): void => {
    console.log("arrow-logical-or-inline-await-return-sync:", value);
});

arrowLogicalOrInlineAwaitReturn("").then((value: string): void => {
    console.log("arrow-logical-or-inline-await-return-await:", value);
});

arrowLogicalAndInlineAwaitReturn(false).then((value: any): void => {
    console.log("arrow-logical-and-inline-await-return-sync:", value);
});

arrowLogicalAndInlineAwaitReturn(true).then((value: any): void => {
    console.log("arrow-logical-and-inline-await-return-await:", value);
});

arrowNullishInlineAwaitReturn("arrow-nullish-sync").then((value: string): void => {
    console.log("arrow-nullish-inline-await-return-sync:", value);
});

arrowNullishInlineAwaitReturn(undefined).then((value: string): void => {
    console.log("arrow-nullish-inline-await-return-await:", value);
});

arrowPreludeLocalInlineAwaitReturn("value-").then((value: string): void => {
    console.log("arrow-prelude-local-inline-await-return:", value);
});

arrowPreludeNullishLocalInlineAwaitReturn(undefined).then((value: string): void => {
    console.log("arrow-prelude-nullish-local-inline-await-return:", value);
});

arrowPreludeDirectReturnAwait("value-").then((value: string): void => {
    console.log("arrow-prelude-direct-return-await:", value);
});

arrowPreludeIfBranchInlineAwaitReturn(true, "value-").then((value: string): void => {
    console.log("arrow-prelude-if-branch-inline-await-return:", value);
});

arrowPreludeNestedIfBranchInlineAwaitReturn(false, false, "value-").then((value: string): void => {
    console.log("arrow-prelude-nested-if-branch-inline-await-return-fallthrough:", value);
});

arrowPreludeBranchConditionalInlineAwaitReturn(true, false, "value-").then((value: string): void => {
    console.log("arrow-prelude-branch-conditional-inline-await-return-sync:", value);
});

arrowPreludeNestedConditionalInlineAwaitReturn(true, false, "value-").then((value: string): void => {
    console.log("arrow-prelude-nested-conditional-inline-await-return-sync:", value);
});

arrowPreludeLogicalAndLocalInlineAwaitReturn("value-").then((value: any): void => {
    console.log("arrow-prelude-logical-and-local-inline-await-return:", value);
});

arrowPreludeExpressionStatementInlineAwaitReturn("value-").then((value: string): void => {
    console.log("arrow-prelude-expression-statement-inline-await-return:", value);
});

arrowPreludeExpressionStatementDirectReturnAwait("value-").then((value: string): void => {
    console.log("arrow-prelude-expression-statement-direct-return-await:", value);
});

arrowPreludeExpressionStatementAwaitedLocalReturn("value-").then((value: string): void => {
    console.log("arrow-prelude-expression-statement-awaited-local-return:", value);
    preludeLocalAwaitedLocalReturn("fn-").then((fnValue: string): void => {
        console.log("prelude-local-awaited-local-return:", fnValue);
        new Worker("method-prelude-").preludeLocalAwaitedLocalReturnMethod("class-").then((methodValue: string): void => {
            console.log("method-prelude-local-awaited-local-return:", methodValue);
            arrowPreludeLocalAwaitedLocalReturn("value-").then((arrowValue: string): void => {
                console.log("arrow-prelude-local-awaited-local-return:", arrowValue);
                awaitExpressionStatementReturn("fn-").then((fnAwaitExpressionValue: string): void => {
                    console.log("await-expression-statement-return:", fnAwaitExpressionValue);
                    new Worker("method-await-expression-").awaitExpressionStatementReturnMethod("class-").then((methodAwaitExpressionValue: string): void => {
                        console.log("method-await-expression-statement-return:", methodAwaitExpressionValue);
                        arrowAwaitExpressionStatementReturn("value-").then((arrowAwaitExpressionValue: string): void => {
                            console.log("arrow-await-expression-statement-return:", arrowAwaitExpressionValue);
                            preludeAwaitExpressionStatementReturn("fn-").then((preludeAwaitExpressionValue: string): void => {
                                console.log("prelude-await-expression-statement-return:", preludeAwaitExpressionValue);
                            });
                        });
                    });
                });
            });
        });
    });
});

preludeArrayAwaitedLocalReturn("fn-").then((value: string): void => {
    console.log("prelude-array-awaited-local-return:", value);
});

preludeArrayInlineAwaitReturn("fn-").then((value: string): void => {
    console.log("prelude-array-inline-await-return:", value);
});

preludeArrayFiveAwait("fn-").then((value: string): void => {
    console.log("prelude-array-five-await:", value);
});

preludeClassAwaitedLocalReturn("fn-").then((value: string): void => {
    console.log("prelude-class-awaited-local-return:", value);
});

preludeClassInlineAwaitReturn("fn-").then((value: string): void => {
    console.log("prelude-class-inline-await-return:", value);
});

preludeClassFiveAwait("fn-").then((value: string): void => {
    console.log("prelude-class-five-await:", value);
});

preludeObjectLiteralAwaitedLocalReturn("fn-").then((value: string): void => {
    console.log("prelude-object-literal-awaited-local-return:", value);
});

preludeMapSetAwaitedLocalReturn("fn-").then((value: string): void => {
    console.log("prelude-map-set-awaited-local-return:", value);
});

preludeMapInlineAwaitReturn("fn-").then((value: string): void => {
    console.log("prelude-map-inline-await-return:", value);
});

preludeSetFiveAwait("fn-").then((value: string): void => {
    console.log("prelude-set-five-await:", value);
});

preludeWeakMapSetAwaitedLocalReturn("fn-").then((value: string): void => {
    console.log("prelude-weak-map-set-awaited-local-return:", value);
});

preludeWeakMapInlineAwaitReturn("fn-").then((value: string): void => {
    console.log("prelude-weak-map-inline-await-return:", value);
});

preludeWeakRefFinalizationAwaitedLocalReturn("fn-").then((value: string): void => {
    console.log("prelude-weak-ref-finalization-awaited-local-return:", value);
});

preludeWeakSetFiveAwait("fn-").then((value: string): void => {
    console.log("prelude-weak-set-five-await:", value);
});

preludeBuiltinsAwaitedLocalReturn("fn-").then((value: string): void => {
    console.log("prelude-builtins-awaited-local-return:", value);
});

preludeAggregateErrorAwaitedLocalReturn("fn-").then((value: string): void => {
    console.log("prelude-aggregate-error-awaited-local-return:", value);
});

preludeFsObjectsAwaitedLocalReturn("fn-").then((value: string): void => {
    console.log("prelude-fs-objects-awaited-local-return:", value);
});

preludeFunctionAwaitedLocalReturn("fn-").then((value: string): void => {
    console.log("prelude-function-awaited-local-return:", value);
});

preludeSymbolBigIntAwaitedLocalReturn("fn-").then((value: string): void => {
    console.log("prelude-symbol-bigint-awaited-local-return:", value);
});

preludePromiseRaceReturn("fn-").then((value: string): void => {
    console.log("prelude-promise-race-return:", value);
});

preludeTextCodecAwaitedLocalReturn("fn-").then((value: string): void => {
    console.log("prelude-text-codec-awaited-local-return:", value);
});

preludeCryptoDigestAwaitedLocalReturn("fn-").then((value: string): void => {
    console.log("prelude-crypto-digest-awaited-local-return:", value);
});

preludeEventEmitterAwaitedLocalReturn("fn-").then((value: string): void => {
    console.log("prelude-event-emitter-awaited-local-return:", value);
});

preludeEventTargetAwaitedLocalReturn("fn-").then((value: string): void => {
    console.log("prelude-event-target-awaited-local-return:", value);
});

preludeRegExpInlineAwaitReturn("fn-").then((value: string): void => {
    console.log("prelude-regexp-inline-await-return:", value);
});

preludeDateErrorFiveAwait("fn-").then((value: string): void => {
    console.log("prelude-date-error-five-await:", value);
});

preludeUrlParamsAwaitedLocalReturn("fn-").then((value: string): void => {
    console.log("prelude-url-params-awaited-local-return:", value);
});

preludeBufferInlineAwaitReturn("fn-").then((value: string): void => {
    console.log("prelude-buffer-inline-await-return:", value);
});

preludeBinaryFiveAwait("fn-").then((value: string): void => {
    console.log("prelude-binary-five-await:", value);
});
