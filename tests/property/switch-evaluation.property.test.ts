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

        let hoistedCaseFunction = function() { return "outside"; };
        var functionDiscriminator, functionSelector, functionBodyTdz = false;
        var functionOriginal, functionOriginalValue, functionPeerValue, functionReplacement;
        switch ((functionDiscriminator = function() { return hoistedCaseFunction; }, 0)) {
            case (functionSelector = function() { return hoistedCaseFunction; },
                (function() {
                    try { hoistedCaseFunction(1); }
                    catch (error) { functionBodyTdz = error instanceof ReferenceError; }
                    return 0;
                })()):
                function hoistedCaseFunction(depth) {
                    return depth === 0 ? caseFunctionLeaf : hoistedCaseFunction(depth - 1) + 1;
                }
                function caseFunctionPeer() { return hoistedCaseFunction(2); }
                let caseFunctionLeaf = 40;
                functionOriginal = functionSelector();
                functionOriginalValue = functionOriginal(2);
                functionPeerValue = caseFunctionPeer();
                hoistedCaseFunction = function() { return 99; };
                functionReplacement = functionSelector();
                break;
        }
        check(functionDiscriminator()() === "outside", "function discriminator environment");
        check(functionBodyTdz, "function body observes later CaseBlock TDZ");
        check(functionOriginalValue === 42 && functionPeerValue === 42,
            "hoisted function recursion and cross-reference");
        check(functionOriginal !== functionReplacement && functionOriginal(2) === 100 &&
            functionReplacement() === 99,
            "mutable function binding identity");
        check(functionOriginal.name === "hoistedCaseFunction" && functionOriginal.length === 1,
            "hoisted function metadata");

        var caseConstructor, constructedCase;
        switch (0) {
            case (caseConstructor = HoistedCaseConstructor, 0):
                function HoistedCaseConstructor(value) { this.value = value; }
                constructedCase = new caseConstructor(37);
                break;
        }
        check(constructedCase.value === 37 && caseConstructor.name === "HoistedCaseConstructor",
            "hoisted function construction");

        var caseGenerator, caseGeneratorTdz = false;
        switch (0) {
            case (caseGenerator = hoistedCaseGenerator,
                (function() {
                    try { caseGenerator().next(); }
                    catch (error) { caseGeneratorTdz = error instanceof ReferenceError; }
                    return 0;
                })()):
                function* hoistedCaseGenerator() {
                    yield caseGeneratorLeaf;
                    yield hoistedCaseGenerator === caseGenerator;
                }
                let caseGeneratorLeaf = 73;
                break;
        }
        const caseGeneratorOriginal = caseGenerator;
        const caseGeneratorIterator = caseGeneratorOriginal();
        check(caseGeneratorTdz && caseGeneratorIterator.next().value === 73,
            "hoisted generator lexical environment and TDZ");
        caseGenerator = function* replacementCaseGenerator() { yield 99; };
        check(caseGeneratorIterator.next().value === false && caseGeneratorIterator.next().done,
            "hoisted generator live function binding");
        check(caseGeneratorOriginal.name === "hoistedCaseGenerator" && caseGeneratorOriginal.length === 0,
            "hoisted generator metadata");

        var caseAsyncFunction, caseAsyncFunctionOriginal, caseAsyncFunctionSet;
        var caseAsyncTdzPromise;
        switch (0) {
            case (caseAsyncFunction = hoistedCaseAsyncFunction,
                caseAsyncTdzPromise = caseAsyncFunction(0), 0):
                async function hoistedCaseAsyncFunction(depth) {
                    const leaf = caseAsyncFunctionLeaf;
                    await Promise.resolve();
                    if (depth === 0) return leaf;
                    return (await hoistedCaseAsyncFunction(depth - 1)) + 1;
                }
                let caseAsyncFunctionLeaf = 61;
                caseAsyncFunctionOriginal = caseAsyncFunction;
                caseAsyncFunctionSet = function(value) { hoistedCaseAsyncFunction = value; };
                break;
        }

        var defaultFunction, defaultFunctionTdz = false, defaultFunctionValue;
        switch (0) {
            case (defaultFunction = hoistedDefaultFunction,
                (function() {
                    try { defaultFunction(); }
                    catch (error) { defaultFunctionTdz = error instanceof ReferenceError; }
                    return 0;
                })()):
                function hoistedDefaultFunction(value = defaultFunctionLeaf) { return value; }
                let defaultFunctionLeaf = 84;
                defaultFunctionValue = defaultFunction();
                break;
        }
        check(defaultFunctionTdz && defaultFunctionValue === 84,
            "hoisted function parameter environment capture");

        var unselectedFunction;
        switch (0) {
            case (unselectedFunction = functionFromUnselectedClause, 0):
                break;
            default:
                function functionFromUnselectedClause() { return "unselected"; }
        }
        check(unselectedFunction() === "unselected", "unselected clause function instantiation");

        var duplicateFunction;
        switch (0) {
            case 0:
                function duplicateCaseFunction() { return "first"; }
                duplicateFunction = duplicateCaseFunction;
                break;
            default:
                function duplicateCaseFunction() { return "last"; }
        }
        check(duplicateFunction() === "last", "sloppy duplicate function replacement");

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
            var caseAsyncTdz = false;
            try { await caseAsyncTdzPromise; }
            catch (error) { caseAsyncTdz = error instanceof ReferenceError; }
            check(caseAsyncTdz, "hoisted async function observes CaseBlock TDZ");
            check(await caseAsyncFunctionOriginal(2) === 63,
                "hoisted async function capture and recursion");
            caseAsyncFunctionSet(async function replacementCaseAsyncFunction() { return 90; });
            check(await caseAsyncFunctionOriginal(1) === 91,
                "hoisted async function live binding across suspension");
            check(caseAsyncFunctionOriginal.name === "hoistedCaseAsyncFunction" &&
                caseAsyncFunctionOriginal.length === 1,
                "hoisted async function metadata");

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

            var asyncHoistedSelector, asyncHoistedAfter, asyncFunctionBodyTdz = false;
            var asyncNestedSelector, asyncNestedAfter, asyncNestedTdzPromise;
            switch (await Promise.resolve(0)) {
                case (asyncHoistedSelector = function() { return asyncHoistedFunction; },
                    asyncNestedSelector = asyncNestedCaseFunction,
                    asyncNestedTdzPromise = asyncNestedSelector(0),
                    (function() {
                        try { asyncHoistedFunction(0); }
                        catch (error) { asyncFunctionBodyTdz = error instanceof ReferenceError; }
                        return 0;
                    })(), await Promise.resolve(0)):
                    function asyncHoistedFunction(depth) {
                        return depth === 0 ? asyncFunctionLeaf : asyncHoistedFunction(depth - 1) + 1;
                    }
                    async function asyncNestedCaseFunction(depth) {
                        const leaf = asyncFunctionLeaf;
                        await Promise.resolve();
                        if (depth === 0) return leaf;
                        return (await asyncNestedCaseFunction(depth - 1)) + 1;
                    }
                    let asyncFunctionLeaf = 21;
                    await Promise.resolve();
                    asyncHoistedAfter = asyncHoistedFunction;
                    asyncNestedAfter = asyncNestedCaseFunction;
                    break;
            }
            check(asyncFunctionBodyTdz, "async function body observes later CaseBlock TDZ");
            check(asyncHoistedSelector() === asyncHoistedAfter && asyncHoistedAfter(2) === 23,
                "async hoisted function identity and capture");
            var asyncNestedTdz = false;
            try { await asyncNestedTdzPromise; }
            catch (error) { asyncNestedTdz = error instanceof ReferenceError; }
            const asyncNestedValue = await asyncNestedAfter(2);
            check(asyncNestedTdz && asyncNestedSelector === asyncNestedAfter &&
                asyncNestedValue === 23,
                "async CFG hoisted async function identity, TDZ, and capture");

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
