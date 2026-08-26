import { expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { compile } from "../../src/compile";

function nestedSwitchFixture(depth: number): string {
    const lines: string[] = ["var nestedWitness;"];
    for (let index = 0; index < depth; index++) {
        lines.push(
            "switch (0) { case 0:",
            `let nested_${index} = ${index};`,
            `nestedWitness = nested_${index};`,
        );
    }
    for (let index = 0; index < depth; index++) lines.push("break; }");
    lines.push(`check(nestedWitness === ${depth - 1}, "nested switch environments");`);
    return lines.join("\n");
}

function subjectSource(): string {
    return `
        function check(condition, label) {
            if (!condition) throw new Error(label);
        }

        let shared = "outside";
        var discriminatorProbe, selectorProbe, beforeProbe, afterProbe;
        switch ((discriminatorProbe = function() { return shared; }, 0)) {
            case (selectorProbe = function() { return shared; }, 0):
                beforeProbe = function() { return shared; };
                let shared = "inside";
                afterProbe = function() { return shared; };
                break;
        }
        check(discriminatorProbe() === "outside", "discriminator environment");
        check(selectorProbe() === "inside", "selector environment");
        check(beforeProbe() === "inside", "closure before initialization");
        check(afterProbe() === "inside", "closure after initialization");
        check(shared === "outside", "switch environment restoration");

        var selectorTdz = false;
        try {
            switch (0) {
                case (function() { return selectorLexical; })(), 0:
                    let selectorLexical = 1;
            }
        } catch (error) { selectorTdz = error instanceof ReferenceError; }
        check(selectorTdz, "selector TDZ");

        var typeofTdz = false;
        try {
            switch (0) {
                case typeof typeofLexical:
                    let typeofLexical = 1;
            }
        } catch (error) { typeofTdz = error instanceof ReferenceError; }
        check(typeofTdz, "typeof TDZ");

        var initializerTdz = false;
        try {
            switch (0) { case 0: let selfReference = selfReference; }
        } catch (error) { initializerTdz = error instanceof ReferenceError; }
        check(initializerTdz, "initializer TDZ");

        var assignmentRhsRan = false;
        var assignmentTdz = false;
        try {
            switch (0) {
                case (preInitialization = (assignmentRhsRan = true, 1), 0):
                    let preInitialization = 2;
            }
        } catch (error) { assignmentTdz = error instanceof ReferenceError; }
        check(assignmentTdz && assignmentRhsRan, "TDZ assignment order");

        var immutableRhs = null;
        var immutableError = false;
        switch (0) {
            case 0:
                const immutable = {};
                const immutableIdentity = immutable;
                try { immutable = (immutableRhs = {}, immutableRhs); }
                catch (error) { immutableError = error instanceof TypeError; }
                check(immutable === immutableIdentity, "const identity");
                break;
        }
        check(immutableError && immutableRhs !== null, "const write order");

        var clauseOne, clauseTwo;
        switch (0) {
            case 0:
                let acrossClauses = "shared";
                clauseOne = function() { return acrossClauses; };
            default:
                clauseTwo = function() { return acrossClauses; };
        }
        check(clauseOne() === "shared" && clauseTwo() === "shared", "clause sharing");

        var patternBefore, patternAfter, patternImmutable = false;
        var patternEvents = [];
        function patternKey() { patternEvents.push("key"); return "selected"; }
        function patternDefault() { patternEvents.push("default"); return 7; }
        function patternSource() {
            patternEvents.push("source");
            return { selected: undefined, nested: [10, 11, 12, 13], retained: "rest" };
        }
        switch (0) {
            case (patternBefore = function() { return patternLeaf; }, 0):
                const {
                    [patternKey()]: patternLeaf = patternDefault(),
                    nested: [patternFirst, , ...patternTail],
                    ...patternRest
                } = patternSource();
                patternAfter = function() {
                    return [patternLeaf, patternFirst, patternTail, patternRest];
                };
                try { patternLeaf = 9; }
                catch (error) { patternImmutable = error instanceof TypeError; }
                break;
        }
        const patternValues = patternAfter();
        check(patternBefore() === 7, "pattern closure before initialization");
        check(patternValues[0] === 7 && patternValues[1] === 10,
            "object/array pattern leaves");
        check(patternValues[2].length === 2 && patternValues[2][0] === 12 &&
            patternValues[2][1] === 13, "array pattern elision/rest");
        check(patternValues[3].retained === "rest" &&
            !("selected" in patternValues[3]) && !("nested" in patternValues[3]),
            "object pattern rest exclusions");
        check(patternEvents.join("|") === "source|key|default", "pattern evaluation order");
        check(patternImmutable && patternBefore() === 7, "pattern const leaf");

        var patternLeafTdz = false;
        try {
            switch (0) {
                case 0:
                    let { missing: patternEarly = patternLater, later: patternLater } = { later: 3 };
            }
        } catch (error) { patternLeafTdz = error instanceof ReferenceError; }
        check(patternLeafTdz, "pattern leaves preallocated in TDZ");

        ${nestedSwitchFixture(3)}

        async function asyncCaseBlock() {
            let asyncShared = "outside";
            var asyncDiscriminator, asyncSelector, asyncBefore, asyncAfter;
            switch ((asyncDiscriminator = function() { return asyncShared; }, await Promise.resolve(0))) {
                case (asyncSelector = function() { return asyncShared; }, await Promise.resolve(0)):
                    asyncBefore = function() { return asyncShared; };
                    let asyncShared = await Promise.resolve("inside");
                    asyncAfter = function() { return asyncShared; };
                    break;
            }
            check(asyncDiscriminator() === "outside", "async discriminator environment");
            check(asyncSelector() === "inside", "async selector environment");
            check(asyncBefore() === "inside" && asyncAfter() === "inside", "async closure environment");
            check(asyncShared === "outside", "async environment restoration");

            var asyncTdz = false;
            try {
                switch (await Promise.resolve(0)) {
                    case (await Promise.resolve(0), asyncLexical):
                        let asyncLexical = 1;
                }
            } catch (_error) { asyncTdz = true; }
            check(asyncTdz, "async selector TDZ");

            var asyncConstRhs = false;
            var asyncConstError = false;
            switch (0) {
                case 0:
                    const asyncImmutable = 1;
                    try { asyncImmutable = await (asyncConstRhs = true, Promise.resolve(2)); }
                    catch (_error) { asyncConstError = true; }
                    break;
            }
            check(asyncConstRhs && asyncConstError, "async const write order");

            var asyncPatternBefore;
            switch (await Promise.resolve(0)) {
                case (asyncPatternBefore = function() { return asyncPatternLeaf; }, await Promise.resolve(0)):
                    const {
                        value: asyncPatternLeaf,
                        nested: [asyncPatternFirst, asyncPatternSecond]
                    } = await Promise.resolve({ value: 21, nested: [22, 23, 24] });
                    await Promise.resolve();
                    check(asyncPatternBefore() === 21 && asyncPatternFirst === 22 &&
                        asyncPatternSecond === 23,
                        "async CaseBlock BindingInitialization");
                    break;
            }
            return "switch-evaluation-ok";
        }

        asyncCaseBlock().then(
            function(value) { console.log(value); },
            function(error) { console.log("switch-evaluation-error:" + String(error)); }
        );
    `;
}

test("Switch Evaluation uses one CaseBlock lexical environment across synchronous and suspended paths", async () => {
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-switch-evaluation-property-"));
    const entry = path.join(temporary, "subject.js");
    try {
        await fs.writeFile(entry, subjectSource(), "utf8");
        for (const noGc of [false, true]) {
            const mode = noGc ? "no-gc" : "gc";
            const executable = path.join(temporary, `subject-${mode}`);
            const diagnostics: string[] = [];
            const result = await compile({
                entry,
                output: executable,
                buildDir: path.join(temporary, `build-${mode}`),
                noGc,
                diagnosticWriter: (message) => diagnostics.push(message),
            });
            expect(diagnostics.join("")).toBe("");
            expect(result.exitCode).toBe(0);
            const process = Bun.spawnSync([executable], { stdout: "pipe", stderr: "pipe" });
            expect(process.exitCode).toBe(0);
            expect(process.stderr.toString()).toBe("");
            expect(process.stdout.toString()).toBe("switch-evaluation-ok\n");
        }
    } finally {
        await fs.rm(temporary, { recursive: true, force: true });
    }
}, 90_000);
