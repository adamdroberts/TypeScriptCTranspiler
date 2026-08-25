import { expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { compile } from "../../src/compile";
import { hostProtocolVersion, parseHostObservation } from "../test262/protocol";

interface MethodDescriptor {
    readonly name: string;
    readonly length: number;
    readonly valueName?: string;
}

const prototypeMethods: readonly MethodDescriptor[] = [
    { name: "getTime", length: 0 },
    { name: "valueOf", length: 0 },
    { name: "getUTCFullYear", length: 0 },
    { name: "getUTCMonth", length: 0 },
    { name: "getUTCDate", length: 0 },
    { name: "getUTCDay", length: 0 },
    { name: "getUTCHours", length: 0 },
    { name: "getUTCMinutes", length: 0 },
    { name: "getUTCSeconds", length: 0 },
    { name: "getUTCMilliseconds", length: 0 },
    { name: "getFullYear", length: 0 },
    { name: "getYear", length: 0 },
    { name: "getMonth", length: 0 },
    { name: "getDate", length: 0 },
    { name: "getDay", length: 0 },
    { name: "getHours", length: 0 },
    { name: "getMinutes", length: 0 },
    { name: "getSeconds", length: 0 },
    { name: "getMilliseconds", length: 0 },
    { name: "getTimezoneOffset", length: 0 },
    { name: "setTime", length: 1 },
    { name: "setUTCFullYear", length: 3 },
    { name: "setUTCMonth", length: 2 },
    { name: "setUTCDate", length: 1 },
    { name: "setUTCHours", length: 4 },
    { name: "setUTCMinutes", length: 3 },
    { name: "setUTCSeconds", length: 2 },
    { name: "setUTCMilliseconds", length: 1 },
    { name: "setFullYear", length: 3 },
    { name: "setMonth", length: 2 },
    { name: "setDate", length: 1 },
    { name: "setHours", length: 4 },
    { name: "setMinutes", length: 3 },
    { name: "setSeconds", length: 2 },
    { name: "setMilliseconds", length: 1 },
    { name: "setYear", length: 1 },
    { name: "toString", length: 0 },
    { name: "toDateString", length: 0 },
    { name: "toTimeString", length: 0 },
    { name: "toUTCString", length: 0 },
    { name: "toGMTString", length: 0, valueName: "toUTCString" },
    { name: "toISOString", length: 0 },
    { name: "toLocaleString", length: 0 },
    { name: "toLocaleDateString", length: 0 },
    { name: "toLocaleTimeString", length: 0 },
    { name: "toJSON", length: 1 },
] as const;

const staticMethods: readonly MethodDescriptor[] = [
    { name: "now", length: 0 },
    { name: "parse", length: 1 },
    { name: "UTC", length: 7 },
] as const;

interface StressOperation {
    readonly method: "setUTCSeconds" | "setUTCMilliseconds";
    readonly value: number;
}

function stressPlan(seed: number, length: number): StressOperation[] {
    const operations: StressOperation[] = [];
    let state = seed >>> 0;
    while (operations.length < length) {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
        operations.push(
            operations.length % 2 === 0
                ? { method: "setUTCSeconds", value: state % 60 }
                : { method: "setUTCMilliseconds", value: state % 1000 },
        );
    }
    return operations;
}

function descriptorChecks(
    owner: string,
    descriptors: readonly MethodDescriptor[],
): string {
    return descriptors.map(({ name, length, valueName = name }) => `
        descriptor = Object.getOwnPropertyDescriptor(${owner}, ${JSON.stringify(name)});
        if (!descriptor || descriptor.writable !== true || descriptor.enumerable !== false ||
            descriptor.configurable !== true || descriptor.value.name !== ${JSON.stringify(valueName)} ||
            descriptor.value.length !== ${length}) metadataFailures++;
    `).join("\n");
}

function subjectSource(stress: readonly StressOperation[]): string {
    return `
        function errorKind(callback, sentinel) {
            try { callback(); return "missing"; }
            catch (error) {
                if (error === sentinel) return "identity";
                return error && error.constructor === TypeError ? "TypeError" : "other";
            }
        }
        function boxTwice(value) { return value === value; }
        function prototypeOf(value) { return Object.getPrototypeOf(value); }
        function staticBoxIdentity() {
            var local = new Date(0);
            return boxTwice(local) && boxTwice(local);
        }

        var D = Date;
        var metadataFailures = 0;
        var descriptor = Object.getOwnPropertyDescriptor(D, "prototype");
        if (!descriptor || descriptor.writable !== false || descriptor.enumerable !== false ||
            descriptor.configurable !== false || D.name !== "Date" || D.length !== 7 ||
            D.prototype.constructor !== D) metadataFailures++;
        ${descriptorChecks("D.prototype", prototypeMethods)}
        ${descriptorChecks("D", staticMethods)}
        var primitiveDescriptor = Object.getOwnPropertyDescriptor(D.prototype, Symbol.toPrimitive);
        if (!primitiveDescriptor || primitiveDescriptor.writable !== false ||
            primitiveDescriptor.enumerable !== false || primitiveDescriptor.configurable !== true ||
            primitiveDescriptor.value.name !== "[Symbol.toPrimitive]" ||
            primitiveDescriptor.value.length !== 1) metadataFailures++;
        print("date-metadata:" + (metadataFailures === 0 ? "ok" : "fail"));

        var date = new D(D.UTC(2000, 0, 2, 3, 4, 5, 6));
        print("date-identity:" + String(D === globalThis.Date) + ":" +
            String(prototypeOf(date) === D.prototype) + ":" +
            String(date instanceof D) + ":" + String(staticBoxIdentity()));
        print("date-brand:" + Object.prototype.toString.call(date) + ":" +
            String(Number.isNaN(D.prototype.getTime())));
        print("date-parts:" + [
            date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(),
            date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds(),
            date.getUTCMilliseconds()
        ].join(","));
        print("date-strings:" + date.toISOString() + ":" +
            String(date.toGMTString === date.toUTCString));

        var order = "";
        function numeric(label, value) {
            return { valueOf: function () { order += label; return value; } };
        }
        date.setUTCHours(numeric("h", 8), numeric("m", 9), numeric("s", 10), numeric("x", 11));
        print("date-setter:" + order + ":" + date.toISOString());
        order = "";
        Date.UTC(
            numeric("y", 1970), numeric("m", 0), numeric("d", 1),
            numeric("h", 0), numeric("i", 0), numeric("s", 1), numeric("x", 0)
        );
        print("date-utc-order:" + order);
        date.setTime(-0);
        print("date-clip:" + String(Object.is(date.getTime(), 0)) + ":" +
            String(Number.isNaN(new D(8640000000000001).getTime())));

        var defaultOrder = "";
        var ordinary = {
            toString: function () { defaultOrder += "s"; return "ordinary"; },
            valueOf: function () { defaultOrder += "v"; return 7; }
        };
        var toPrimitive = D.prototype[Symbol.toPrimitive];
        print("date-primitive:" + toPrimitive.call(ordinary, "default") + ":" + defaultOrder);
        defaultOrder = "";
        print("date-number-primitive:" + toPrimitive.call(ordinary, "number") + ":" + defaultOrder);
        print("date-json:" + D.prototype.toJSON.call({
            valueOf: function () { return 1; },
            toISOString: function () { return "generic-json"; }
        }));

        var sentinel = { marker: "sentinel" };
        print("date-receiver-error:" + errorKind(function () {
            D.prototype.getTime.call({});
        }, sentinel));
        print("date-abrupt:" + errorKind(function () {
            date.setTime({ valueOf: function () { throw sentinel; } });
        }, sentinel));
        print("date-call:" + typeof D({
            [Symbol.toPrimitive]: function () { throw sentinel; }
        }));
        print("date-static:" + D.parse("1970-01-01T00:00:01.000Z") + ":" +
            D.UTC(1970, 0, 1, 0, 0, 1, 0));

        var stress = new D(0);
        ${stress.map(({ method, value }) => `stress.${method}(${value});`).join("\n")}
        print("date-stress:" + stress.getTime());
    `;
}

function expectedOutput(stress: readonly StressOperation[]): string {
    let seconds = 0;
    let milliseconds = 0;
    for (const operation of stress) {
        if (operation.method === "setUTCSeconds") seconds = operation.value;
        else milliseconds = operation.value;
    }
    return [
        "date-metadata:ok",
        "date-identity:true:true:true:true",
        "date-brand:[object Date]:true",
        "date-parts:2000,0,2,3,4,5,6",
        "date-strings:2000-01-02T03:04:05.006Z:true",
        "date-setter:hmsx:2000-01-02T08:09:10.011Z",
        "date-utc-order:ymdhisx",
        "date-clip:true:true",
        "date-primitive:ordinary:s",
        "date-number-primitive:7:v",
        "date-json:generic-json",
        "date-receiver-error:TypeError",
        "date-abrupt:identity",
        "date-call:string",
        "date-static:1000:1000",
        `date-stress:${seconds * 1000 + milliseconds}`,
        "",
    ].join("\n");
}

test("Date values share one intrinsic descriptor and operation plan", async () => {
    const stress = stressPlan(0xda7e2026, 41);
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-date-intrinsic-property-"));
    const entry = path.join(temporary, "subject.js");
    const scenarioId = "property/date-intrinsic.js#sloppy";
    try {
        await fs.writeFile(entry, subjectSource(stress), "utf8");
        for (const noGc of [false, true]) {
            const mode = noGc ? "no-gc" : "gc";
            const executable = path.join(temporary, `subject-${mode}`);
            const diagnostics: string[] = [];
            const result = await compile({
                entry,
                output: executable,
                buildDir: path.join(temporary, `build-${mode}`),
                initializationEntries: [entry],
                noGc,
                test262Observation: {
                    kind: "test262-native-observation",
                    scenarioId,
                    setupEntries: [],
                    testEntry: entry,
                    async: false,
                },
                diagnosticWriter: (message) => diagnostics.push(message),
            });
            expect(diagnostics.join("")).toBe("");
            expect(result.exitCode).toBe(0);

            const process = Bun.spawnSync([executable], { stdout: "pipe", stderr: "pipe" });
            expect(process.exitCode).toBe(0);
            expect(process.stderr.toString()).toBe("");
            expect(parseHostObservation(JSON.parse(process.stdout.toString()))).toEqual({
                protocolVersion: hostProtocolVersion,
                scenarioId,
                kind: "normal",
                asyncCompletion: undefined,
                stdout: expectedOutput(stress),
                stderr: undefined,
                nativeTranscript: undefined,
            });
        }
    } finally {
        await fs.rm(temporary, { recursive: true, force: true });
    }
}, 90_000);
