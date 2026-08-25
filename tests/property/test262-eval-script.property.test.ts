import { expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { compile } from "../../src/compile";
import { finiteEvalScriptSourceGraph } from "../test262/native-host";
import { hostProtocolVersion, parseHostObservation } from "../test262/protocol";

test("evalScript source discovery follows one transitive finite AST worklist", () => {
    const nested = '$262.evalScript("var nested = 1;");';
    const sibling = "var sibling = 3;";
    const branch = "var branch = 4;";
    const directSloppy = 'var directSloppy = 5; eval("var directNested = 6;");';
    const directSourceStrict = '"use strict"; var directSourceStrict = 7;';
    const strictRecord = '"use strict"; eval("var directCallerStrict = 8;");';
    const createdRealmRecord = "var createdRealmValue = 9;";
    const indirectSequence = 'var indirectSequence = 10; (0, eval)("var indirectNested = 11;");';
    const indirectAlias = "var indirectAliasValue = 12;";
    const indirectCall = "var indirectCallValue = 13;";
    const indirectApply = "var indirectApplyValue = 14;";
    const indirectConditional = '"use strict"; var indirectStrictValue = 15;';
    const root = finiteEvalScriptSourceGraph([{
        path: "root.js",
        source: `
            $262.evalScript(flag ? ${JSON.stringify(nested)} : "var alternate = 2;");
            $262.evalScript(${JSON.stringify(sibling)});
            flag && $262.evalScript(${JSON.stringify(branch)});
            eval(flag ? ${JSON.stringify(directSloppy)} : ${JSON.stringify(directSourceStrict)});
            $262.evalScript(${JSON.stringify(strictRecord)});
            $262.createRealm().evalScript(${JSON.stringify(createdRealmRecord)});
            var foreignEval = $262.createRealm().global.eval;
            (0, eval)(${JSON.stringify(indirectSequence)});
            foreignEval(${JSON.stringify(indirectAlias)});
            globalThis.eval.call(undefined, ${JSON.stringify(indirectCall)});
            eval.apply(undefined, [${JSON.stringify(indirectApply)}]);
            (flag ? eval : foreignEval)(${JSON.stringify(indirectConditional)});
        `,
    }]);
    expect(root.error).toBeNull();
    expect(new Set(root.sources)).toEqual(new Set([
        nested,
        "var nested = 1;",
        "var alternate = 2;",
        sibling,
        branch,
        strictRecord,
        createdRealmRecord,
    ]));
    expect(new Set(root.directEvalSources.map((entry) => JSON.stringify(entry)))).toEqual(new Set([
        JSON.stringify({ source: directSloppy, strictCaller: false, strict: false }),
        JSON.stringify({ source: "var directNested = 6;", strictCaller: false, strict: false }),
        JSON.stringify({ source: directSourceStrict, strictCaller: false, strict: true }),
        JSON.stringify({ source: "var directCallerStrict = 8;", strictCaller: true, strict: true }),
    ]));
    expect(new Set(root.indirectEvalSources.map((entry) => JSON.stringify(entry)))).toEqual(new Set([
        JSON.stringify({ source: indirectSequence, strict: false }),
        JSON.stringify({ source: "var indirectNested = 11;", strict: false }),
        JSON.stringify({ source: indirectAlias, strict: false }),
        JSON.stringify({ source: indirectCall, strict: false }),
        JSON.stringify({ source: indirectApply, strict: false }),
        JSON.stringify({ source: indirectConditional, strict: true }),
    ]));

    const nonFinite = finiteEvalScriptSourceGraph([{
        path: "root.js",
        source: "$262.evalScript(runtimeSource);",
    }]);
    expect(nonFinite.sources).toEqual([]);
    expect(nonFinite.error).toContain("not a finite static string expression");

    const nonFiniteDirect = finiteEvalScriptSourceGraph([{
        path: "root.js",
        source: "eval(runtimeSource);",
    }]);
    expect(nonFiniteDirect.directEvalSources).toEqual([]);
    expect(nonFiniteDirect.error).toContain("direct eval source is not a finite static string expression");

    const nonFiniteIndirect = finiteEvalScriptSourceGraph([{
        path: "root.js",
        source: "(0, eval)(runtimeSource);",
    }]);
    expect(nonFiniteIndirect.indirectEvalSources).toEqual([]);
    expect(nonFiniteIndirect.error).toBeNull();
});

test("finite AOT evalScript records parse and evaluate on every call", async () => {
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-test262-eval-script-property-"));
    const main = path.join(temporary, "main.js");
    const nestedEvalMain = path.join(temporary, "nested-eval.js");
    const mutationSource = "executions += 1; var created = executions; function readCreated() { return created; }";
    const throwSource = "throw sentinel;";
    const invalidSource = "let = ;";
    const directDeclarationSource = `
        var directEvalVar = 31;
        function directEvalFunction() { return 32; }
    `;
    const directShadowSource = `
        let directEvalVar = "lexical-var";
        let directEvalFunction = "lexical-function";
    `;
    const directSourceStrict = `
        "use strict";
        var directSourceStrictVar = 33;
        function directSourceStrictFunction() { return 34; }
    `;
    const directCallerStrictBody = `
        var directCallerStrictVar = 35;
        function directCallerStrictFunction() { return 36; }
    `;
    const directCallerStrictRecord = `
        "use strict";
        eval(${JSON.stringify(directCallerStrictBody)});
        if (typeof directCallerStrictVar !== "undefined" ||
            typeof directCallerStrictFunction !== "undefined") {
            throw new Error("strict-caller eval declarations escaped");
        }
    `;
    const directCompletionSource = "sentinel;";
    const directThrowSource = "throw sentinel;";
    const invalidDirectSource = "let = ;";
    const indirectDeclarationSource = `
        indirectInitial = indirectEvalFunction;
        var indirectEvalVar = 51;
        function indirectEvalFunction() { return 52; }
    `;
    const indirectStrictSource = `
        "use strict";
        var indirectStrictVar = 53;
        function indirectStrictFunction() { return 54; }
    `;
    const indirectCompletionSource = "sentinel;";
    const indirectThrowSource = "throw sentinel;";
    const indirectRealmSource = `
        globalThis.indirectRealmMark = 55;
        globalThis.indirectRealmReader = function () { return globalThis; };
        indirectRealmMark;
    `;
    const invalidIndirectSource = "let = ;";
    const realmDeclarationSource = `
        let realmLexical = 41;
        var realmVar = 42;
        globalThis.realmObject = {};
    `;
    const realmMutationSource = "realmLexical += 1; realmVar += 1;";
    const realmObservationSource = "({ lexical: realmLexical, variable: realmVar, object: realmObject });";
    const realmThrowSource = "throw realmSentinel;";
    const realmCallableSource = `
        globalThis.realmGlobalReader = function realmGlobalReader() { return globalThis; };
        var realmSetPrototypeOf = Object.setPrototypeOf;
        globalThis.realmThrower = function realmThrower() { return realmSetPrototypeOf(null, null); };
        globalThis.realmNewTarget = function RealmNewTarget() {};
        realmNewTarget.prototype = null;
    `;
    const lexicalSource = `
        var sawTdz = false;
        try { evalTdz; } catch (error) { sawTdz = error instanceof ReferenceError; }
        let evalTdz = 4;
        let evalLexical = sharedLexical += 1;
        const evalConstant = sharedConstant;
        class EvalClass {}
        if (!sawTdz || evalTdz !== 4 || evalLexical !== 11 ||
            evalConstant !== sharedConstant || typeof EvalClass !== "function") {
            throw new Error("global declarative environment differed");
        }
    `;
    const shadowSource = 'let shadowable = "lexical";';
    const varCollisionSource = "var sharedLexical; var collisionSideEffect;";
    const lexicalCollisionSource = "let sharedLexical; var collisionSideEffect;";
    const functionCollisionSource = "function blockedFunction() {}";
    const annexBUpdateSource = `
        if (false) function annexBNever() { return "never"; }
        if (true) function annexBBranch() { return "branch"; }
        { function annexBSequence() { return "first"; } }
        { function annexBSequence() { return "second"; } }
        switch (1) { case 1: function annexBCase() { return "case"; } }
        { function annexBExistingFunction() { return "inner"; } }
        function annexBExistingFunction() { return "outer"; }
        let annexBSuppressed = "lexical";
        { function annexBSuppressed() { return "wrong"; } }
        { function annexBExisting() { return "updated"; } }
    `;
    const annexBCollisionSource = "var annexBCollisionSideEffect; let annexBMain;";
    const annexBStrictSource = '"use strict"; { function annexBStrictOnly() {} }';
    const annexBNonExtensibleSource = "{ function annexBNonExtensible() {} }";
    const annexBStressSource = `${"{".repeat(96)}function annexBStress() { return "stress"; }${"}".repeat(96)}`;
    const duplicateFunctionSource = `
        function duplicateFunction() { return 1; }
        function duplicateFunction() { return 2; }
        function duplicateFunction() { return 3; }
    `;
    const duplicateFunctionStressSource = Array.from(
        { length: 64 },
        (_, index) => `function duplicateFunctionStress() { return ${index}; }`,
    ).join("\n");
    const existingVarSource = "var existingConfigurable; var existingRestricted;";
    const nonExtensibleSource = "var impossibleGlobal; var impossibleSideEffect;";
    const nonExtensibleLexicalSource = `
        let afterPreventLet = 21;
        const afterPreventConst = 22;
        class AfterPreventClass {}
    `;
    const completionEmptySource = "var completionOnlyDeclaration;";
    const completionIdentitySource = "sentinel; var completionTrailingDeclaration;";
    const completionBranchSource = "if (true) { 11; } else { 12; } ;";
    const completionLoopSource = `
        for (var completionIndex = 0; completionIndex < 3; completionIndex++) completionIndex;
    `;
    const completionCaughtEmptySource = `
        20;
        try { 21; throw sentinel; } catch (error) {}
    `;
    const completionCatchValueSource = `
        try { throw sentinel; } catch (error) { 30; }
    `;
    const completionFinallySource = `
        try { 40; } finally { 41; }
    `;
    const completionStressSource = `${"{".repeat(128)}sentinel;${"}".repeat(128)}`;
    const bindingPatternSource = `
        let {
            first: lexicalPatternFirst,
            nested: { value: lexicalPatternNested },
            [patternSymbol]: lexicalPatternSymbol,
            missing: lexicalPatternDefault = lexicalPatternFirst + 4,
            ...lexicalPatternRest
        } = patternObject;
        const [arrayPatternFirst = lexicalPatternDefault, , arrayPatternThird, ...arrayPatternRest] = patternArray;
        var { extra: varPatternExtra } = patternObject;
        var [varPatternFirst] = [7];
        if (true) { var { extra: blockVarPattern } = patternObject; }
        for (var [forPatternFirst, ...forPatternRest] of [[13, 14, 15]]) {}
        for (var [forInPatternFirst, ...forInPatternRest] in { xy: true }) {}
        function readPatternBindings() {
            return lexicalPatternFirst + arrayPatternThird + forPatternFirst;
        }
    `;
    const iteratorPatternSource = `
        let [iteratorPatternFirst] = patternIterable;
    `;
    const abruptIteratorPatternSource = `
        let [abruptPatternValue = throwPatternDefault()] = abruptPatternIterable;
    `;
    const bindingStressName = `${"[".repeat(64)}bindingStressValue${"]".repeat(64)}`;
    const bindingStressValue = `${"[".repeat(64)}99${"]".repeat(64)}`;
    const bindingStressSource = `let ${bindingStressName} = ${bindingStressValue};`;
    const compiledSources = [
        ["mutation.js", mutationSource],
        ["throw.js", throwSource],
        ["direct-shadow.js", directShadowSource],
        ["direct-caller-strict.js", directCallerStrictRecord],
        ["realm-declarations.js", realmDeclarationSource],
        ["realm-mutation.js", realmMutationSource],
        ["realm-observation.js", realmObservationSource],
        ["realm-throw.js", realmThrowSource],
        ["realm-callables.js", realmCallableSource],
        ["lexical.js", lexicalSource],
        ["shadow.js", shadowSource],
        ["var-collision.js", varCollisionSource],
        ["lexical-collision.js", lexicalCollisionSource],
        ["function-collision.js", functionCollisionSource],
        ["annex-b-update.js", annexBUpdateSource],
        ["annex-b-collision.js", annexBCollisionSource],
        ["annex-b-strict.js", annexBStrictSource],
        ["annex-b-non-extensible.js", annexBNonExtensibleSource],
        ["annex-b-stress.js", annexBStressSource],
        ["function-duplicates.js", duplicateFunctionSource],
        ["function-duplicates-stress.js", duplicateFunctionStressSource],
        ["existing-var.js", existingVarSource],
        ["non-extensible.js", nonExtensibleSource],
        ["non-extensible-lexical.js", nonExtensibleLexicalSource],
        ["completion-empty.js", completionEmptySource],
        ["completion-identity.js", completionIdentitySource],
        ["completion-branch.js", completionBranchSource],
        ["completion-loop.js", completionLoopSource],
        ["completion-caught-empty.js", completionCaughtEmptySource],
        ["completion-catch-value.js", completionCatchValueSource],
        ["completion-finally.js", completionFinallySource],
        ["completion-stress.js", completionStressSource],
        ["binding-pattern.js", bindingPatternSource],
        ["binding-iterator.js", iteratorPatternSource],
        ["binding-iterator-abrupt.js", abruptIteratorPatternSource],
        ["binding-stress.js", bindingStressSource],
    ] as const;
    const compiledEntries = compiledSources.map(([filename, source]) => ({
        source,
        entry: path.join(temporary, filename),
    }));
    const directEntries = [
        {
            source: directDeclarationSource,
            entry: path.join(temporary, "direct-declarations.js"),
            strictCaller: false,
            strict: false,
        },
        {
            source: directSourceStrict,
            entry: path.join(temporary, "direct-source-strict.js"),
            strictCaller: false,
            strict: true,
        },
        {
            source: directCallerStrictBody,
            entry: path.join(temporary, "direct-caller-strict-body.js"),
            strictCaller: true,
            strict: true,
        },
        {
            source: directCompletionSource,
            entry: path.join(temporary, "direct-completion.js"),
            strictCaller: false,
            strict: false,
        },
        {
            source: directThrowSource,
            entry: path.join(temporary, "direct-throw.js"),
            strictCaller: false,
            strict: false,
        },
    ] as const;
    const indirectEntries = [
        {
            source: indirectDeclarationSource,
            entry: path.join(temporary, "indirect-declarations.js"),
            strict: false,
        },
        {
            source: indirectStrictSource,
            entry: path.join(temporary, "indirect-strict.js"),
            strict: true,
        },
        {
            source: indirectCompletionSource,
            entry: path.join(temporary, "indirect-completion.js"),
            strict: false,
        },
        {
            source: indirectThrowSource,
            entry: path.join(temporary, "indirect-throw.js"),
            strict: false,
        },
        {
            source: indirectRealmSource,
            entry: path.join(temporary, "indirect-realm.js"),
            strict: false,
        },
    ] as const;
    const scenarioId = "property/test262-eval-script.js#sloppy";
    await Promise.all([
        ...compiledEntries.map(({ entry, source }) => fs.writeFile(entry, source, "utf8")),
        ...directEntries.map(({ entry, source }) => fs.writeFile(entry, source, "utf8")),
        ...indirectEntries.map(({ entry, source }) => fs.writeFile(entry, source, "utf8")),
        fs.writeFile(nestedEvalMain, 'function nested() { return eval("1"); } nested();', "utf8"),
        fs.writeFile(main, `
            var executions = 0;
            var completionTrailingDeclaration;
            var completionOnlyDeclaration;
            var completionIndex;
            var sentinel = {};
            if (true) { function annexBMain() { return "main"; } }
            var patternSymbol = Symbol("pattern-symbol");
            var patternObject = { first: 1, nested: { value: 2 }, extra: 3 };
            patternObject[patternSymbol] = 4;
            var patternArray = [undefined, "skip", 9, 10];
            var patternIteratorStep = 0;
            var patternIteratorClosed = 0;
            var patternIterable = {};
            patternIterable[Symbol.iterator] = function () {
                patternIteratorStep = 0;
                return {
                    next: function () {
                        if (patternIteratorStep++ === 0) return { done: false, value: 8 };
                        return { done: true, value: undefined };
                    },
                    return: function () {
                        patternIteratorClosed += 1;
                        return {};
                    }
                };
            };
            var abruptPatternIteratorClosed = 0;
            var abruptPatternIterable = {};
            abruptPatternIterable[Symbol.iterator] = function () {
                return {
                    next: function () { return { done: false, value: undefined }; },
                    return: function () {
                        abruptPatternIteratorClosed += 1;
                        return {};
                    }
                };
            };
            function throwPatternDefault() { throw sentinel; }
            let sharedLexical = 10;
            const sharedConstant = {};
            class SharedClass {}
            Object.defineProperty(globalThis, "shadowable", {
                value: "property", writable: true, configurable: true
            });
            Object.defineProperty(globalThis, "blockedFunction", {
                value: 1, writable: false, enumerable: false, configurable: false
            });
            Object.defineProperty(globalThis, "existingConfigurable", {
                value: 7, writable: false, enumerable: false, configurable: true
            });
            Object.defineProperty(globalThis, "existingRestricted", {
                value: 8, writable: false, enumerable: false, configurable: false
            });
            var primordialJoin = Function.prototype.call.bind(Array.prototype.join);
            var primordialPush = Function.prototype.call.bind(Array.prototype.push);
            var primordialHasOwn = Function.prototype.call.bind(Object.prototype.hasOwnProperty);
            var primordialEnumerable = Function.prototype.call.bind(Object.prototype.propertyIsEnumerable);
            var primordialArray = [];
            primordialPush(primordialArray, "pushed");
            if (primordialJoin(["a", "b"], "-") !== "a-b" ||
                Array.prototype.map.call([1, 2], String).join(", ") !== "1, 2" ||
                primordialArray[0] !== "pushed" ||
                !primordialHasOwn({ owned: true }, "owned") ||
                !primordialEnumerable({ visible: true }, "visible")) {
                throw new Error("primordial bound array method differed");
            }
            var directExtraArgument = 0;
            if (eval() !== undefined || eval(17, directExtraArgument = 1) !== 17 ||
                directExtraArgument !== 1) {
                throw new Error("direct eval non-string/argument evaluation differed");
            }
            var savedEval = eval;
            eval = function (value) { return value + 1; };
            if (eval(17) !== 18) throw new Error("reassigned eval was still treated as direct eval");
            eval = function (value) { "use strict"; return this === undefined ? value : -1; };
            if (eval(17) !== 17) throw new Error("reassigned strict eval receiver differed");
            eval = savedEval;

            if ((0, eval)(17) !== 17 || savedEval.call(undefined, true) !== true ||
                savedEval.apply(undefined, [null]) !== null) {
                throw new Error("indirect eval non-string identity differed");
            }
            var indirectInitial;
            (0, eval)(${JSON.stringify(indirectDeclarationSource)});
            var indirectDescriptor = Object.getOwnPropertyDescriptor(globalThis, "indirectEvalVar");
            if (indirectInitial !== indirectEvalFunction || indirectEvalVar !== 51 ||
                indirectEvalFunction() !== 52 || !indirectDescriptor ||
                !indirectDescriptor.writable || !indirectDescriptor.enumerable ||
                !indirectDescriptor.configurable) {
                throw new Error("sloppy indirect eval declaration instantiation differed");
            }
            savedEval.call(undefined, ${JSON.stringify(indirectStrictSource)});
            if (typeof indirectStrictVar !== "undefined" ||
                typeof indirectStrictFunction !== "undefined" ||
                "indirectStrictVar" in globalThis || "indirectStrictFunction" in globalThis) {
                throw new Error("strict indirect eval declarations escaped");
            }
            if (savedEval.apply(undefined, [${JSON.stringify(indirectCompletionSource)}]) !== sentinel ||
                savedEval.bind(null)(${JSON.stringify(indirectCompletionSource)}) !== sentinel) {
                throw new Error("indirect eval completion identity differed");
            }
            var indirectThrowExact = false;
            try { (0, eval)(${JSON.stringify(indirectThrowSource)}); }
            catch (error) { indirectThrowExact = error === sentinel; }
            if (!indirectThrowExact) throw new Error("indirect eval abrupt identity differed");
            var indirectSyntax = false;
            try { globalThis.eval(${JSON.stringify(invalidIndirectSource)}); }
            catch (error) { indirectSyntax = error instanceof SyntaxError; }
            if (!indirectSyntax) throw new Error("indirect eval ParseScript failure differed");
            var indirectUnknown = false;
            try { (0, eval)("runtime source outside graph"); }
            catch (error) { indirectUnknown = error instanceof TypeError; }
            if (!indirectUnknown) throw new Error("unproved indirect eval source did not fail closed");

            eval(${JSON.stringify(directDeclarationSource)});
            var directVarDescriptor = Object.getOwnPropertyDescriptor(globalThis, "directEvalVar");
            var directFunctionDescriptor = Object.getOwnPropertyDescriptor(globalThis, "directEvalFunction");
            if (directEvalVar !== 31 || directEvalFunction() !== 32 ||
                !directVarDescriptor || !directVarDescriptor.writable ||
                !directVarDescriptor.enumerable || !directVarDescriptor.configurable ||
                !directFunctionDescriptor || !directFunctionDescriptor.writable ||
                !directFunctionDescriptor.enumerable || !directFunctionDescriptor.configurable) {
                throw new Error("sloppy direct eval declaration instantiation differed");
            }
            $262.evalScript(${JSON.stringify(directShadowSource)});
            if (directEvalVar !== "lexical-var" || directEvalFunction !== "lexical-function" ||
                globalThis.directEvalVar !== 31 || typeof globalThis.directEvalFunction !== "function") {
                throw new Error("deletable direct eval bindings did not admit Script lexical shadowing");
            }
            eval(${JSON.stringify(directSourceStrict)});
            if (typeof directSourceStrictVar !== "undefined" ||
                typeof directSourceStrictFunction !== "undefined" ||
                "directSourceStrictVar" in globalThis || "directSourceStrictFunction" in globalThis) {
                throw new Error("source-strict eval declarations escaped");
            }
            $262.evalScript(${JSON.stringify(directCallerStrictRecord)});
            if (eval(${JSON.stringify(directCompletionSource)}) !== sentinel) {
                throw new Error("direct eval completion identity differed");
            }
            var directThrowExact = false;
            try { eval(${JSON.stringify(directThrowSource)}); }
            catch (error) { directThrowExact = error === sentinel; }
            if (!directThrowExact) throw new Error("direct eval abrupt identity differed");
            var directSyntax = false;
            try { eval(${JSON.stringify(invalidDirectSource)}); }
            catch (error) { directSyntax = error instanceof SyntaxError; }
            if (!directSyntax) throw new Error("direct eval ParseScript failure differed");

            var defaultRealmGlobal = globalThis;
            var realmA = $262.createRealm();
            var realmB = $262.createRealm();
            if (realmA === realmB || realmA.global === realmB.global ||
                realmA.global === defaultRealmGlobal || realmB.global === defaultRealmGlobal ||
                realmA.global.globalThis !== realmA.global || realmB.global.globalThis !== realmB.global) {
                throw new Error("createRealm did not create independent global identities");
            }
            if (realmA.global.eval(${JSON.stringify(indirectRealmSource)}) !== 55 ||
                realmA.global.indirectRealmMark !== 55 ||
                realmA.global.indirectRealmReader() !== realmA.global ||
                "indirectRealmMark" in globalThis) {
                throw new Error("indirect eval did not use the callee Realm");
            }
            realmA.evalScript(${JSON.stringify(realmDeclarationSource)});
            realmB.evalScript(${JSON.stringify(realmDeclarationSource)});
            realmA.evalScript(${JSON.stringify(realmMutationSource)});
            var realmAObservation = realmA.evalScript(${JSON.stringify(realmObservationSource)});
            var realmBObservation = realmB.evalScript(${JSON.stringify(realmObservationSource)});
            if (realmAObservation.lexical !== 42 || realmAObservation.variable !== 43 ||
                realmBObservation.lexical !== 41 || realmBObservation.variable !== 42 ||
                realmAObservation.object !== realmA.global.realmObject ||
                realmBObservation.object !== realmB.global.realmObject ||
                realmAObservation.object === realmBObservation.object ||
                typeof realmLexical !== "undefined" || typeof realmVar !== "undefined") {
                throw new Error("Realm global/declarative environment isolation differed");
            }
            realmA.global.realmSentinel = sentinel;
            var realmThrowExact = false;
            try { realmA.evalScript(${JSON.stringify(realmThrowSource)}); }
            catch (error) { realmThrowExact = error === sentinel; }
            if (!realmThrowExact || globalThis !== defaultRealmGlobal || $262.global !== defaultRealmGlobal) {
                throw new Error("abrupt cross-Realm evaluation did not restore the caller Realm");
            }

            var realmConstructorNames = [
                "Object", "Function", "Array", "String", "Number", "Boolean",
                "BigInt", "Symbol", "Date", "Error", "TypeError", "RangeError",
                "SyntaxError", "ReferenceError", "EvalError", "URIError",
                "AggregateError", "SuppressedError"
            ];
            for (var realmConstructorIndex = 0;
                realmConstructorIndex < realmConstructorNames.length;
                realmConstructorIndex += 1) {
                var realmConstructorName = realmConstructorNames[realmConstructorIndex];
                var defaultConstructor = defaultRealmGlobal[realmConstructorName];
                var realmAConstructor = realmA.global[realmConstructorName];
                var realmBConstructor = realmB.global[realmConstructorName];
                if (realmAConstructor === defaultConstructor ||
                    realmBConstructor === defaultConstructor ||
                    realmAConstructor === realmBConstructor ||
                    realmAConstructor.prototype === defaultConstructor.prototype ||
                    realmBConstructor.prototype === defaultConstructor.prototype ||
                    realmAConstructor.prototype === realmBConstructor.prototype) {
                    throw new Error("Realm constructor/prototype identity was shared: " + realmConstructorName);
                }
            }
            var realmNamespaceNames = ["Math", "JSON", "Reflect"];
            for (var realmNamespaceIndex = 0;
                realmNamespaceIndex < realmNamespaceNames.length;
                realmNamespaceIndex += 1) {
                var realmNamespaceName = realmNamespaceNames[realmNamespaceIndex];
                if (realmA.global[realmNamespaceName] === defaultRealmGlobal[realmNamespaceName] ||
                    realmB.global[realmNamespaceName] === defaultRealmGlobal[realmNamespaceName] ||
                    realmA.global[realmNamespaceName] === realmB.global[realmNamespaceName]) {
                    throw new Error("Realm namespace identity was shared: " + realmNamespaceName);
                }
            }
            var realmObjectMethodName = "defineProperty";
            if (realmA.global.Object[realmObjectMethodName] === Object[realmObjectMethodName] ||
                realmA.global.Array.prototype.map === Array.prototype.map ||
                realmA.global.Symbol.iterator !== Symbol.iterator) {
                throw new Error("Realm method or well-known Symbol identity differed");
            }
            realmA.evalScript(${JSON.stringify(realmCallableSource)});
            if (realmA.global.realmGlobalReader() !== realmA.global ||
                realmA.global.realmGlobalReader.bind(null)() !== realmA.global) {
                throw new Error("function or bound-function [[Realm]] differed");
            }
            var realmTypeError;
            try { realmA.global.realmThrower(); }
            catch (error) { realmTypeError = error; }
            if (!(realmTypeError instanceof realmA.global.TypeError) ||
                realmTypeError instanceof TypeError) {
                throw new Error("abrupt completion used the caller error intrinsic");
            }
            var realmConstructed = Reflect.construct(
                Object,
                [],
                realmA.global.realmNewTarget
            );
            if (Object.getPrototypeOf(realmConstructed) !== realmA.global.Object.prototype) {
                throw new Error("fallback prototype did not use the newTarget Realm");
            }
            var realmFallbackPrototypeValues = [undefined, null, true, "str", Symbol(), 1];
            for (var realmFallbackIndex = 0;
                realmFallbackIndex < realmFallbackPrototypeValues.length;
                realmFallbackIndex += 1) {
                realmA.global.realmNewTarget.prototype =
                    realmFallbackPrototypeValues[realmFallbackIndex];
                var realmArrayConstructed = Reflect.construct(
                    Array,
                    [],
                    realmA.global.realmNewTarget
                );
                if (Object.getPrototypeOf(realmArrayConstructed) !== realmA.global.Array.prototype) {
                    throw new Error("Array fallback prototype did not use the newTarget Realm");
                }
            }
            var realmWorklist = [realmA, realmB];
            for (var realmStressIndex = 0; realmStressIndex < 24; realmStressIndex += 1) {
                var realmStress = $262.createRealm();
                realmStress.global.realmStressMark = realmStressIndex;
                if (realmStress.global.Object === Object ||
                    realmStress.global.Object.prototype === Object.prototype ||
                    realmStress.global.realmStressMark !== realmStressIndex) {
                    throw new Error("Realm state worklist lost isolation");
                }
                realmWorklist.push(realmStress);
            }
            for (var realmCheckIndex = 0; realmCheckIndex < realmWorklist.length; realmCheckIndex += 1) {
                if (realmWorklist[realmCheckIndex].global.Object === Object ||
                    realmWorklist[realmCheckIndex].global.globalThis !== realmWorklist[realmCheckIndex].global) {
                    throw new Error("Realm worklist identity differed");
                }
            }

            $262.evalScript(${JSON.stringify(mutationSource)});
            if (executions !== 1 || created !== 1 || readCreated() !== 1) {
                throw new Error("first ScriptEvaluation differed");
            }
            $262.evalScript(${JSON.stringify(mutationSource)});
            if (executions !== 2 || created !== 2 || readCreated() !== 2) {
                throw new Error("Script record was cached instead of re-evaluated");
            }
            var exactThrow = false;
            try { $262.evalScript(${JSON.stringify(throwSource)}); } catch (error) { exactThrow = error === sentinel; }
            if (!exactThrow) throw new Error("evalScript did not preserve abrupt value identity");
            var syntax = false;
            try { $262.evalScript(${JSON.stringify(invalidSource)}); } catch (error) { syntax = error instanceof SyntaxError; }
            if (!syntax) throw new Error("ParseScript failure was not a native SyntaxError");

            $262.evalScript(${JSON.stringify(lexicalSource)});
            if (sharedLexical !== 11 || typeof SharedClass !== "function" ||
                evalLexical !== 11 || evalTdz !== 4 || !sawTdz ||
                evalConstant !== sharedConstant || typeof EvalClass !== "function" ||
                "evalLexical" in globalThis || "evalConstant" in globalThis || "EvalClass" in globalThis) {
                throw new Error("separate Script lexical visibility/reflection differed");
            }
            var immutableThrow = false;
            try { evalConstant = 1; } catch (error) { immutableThrow = error instanceof TypeError; }
            if (!immutableThrow || evalConstant !== sharedConstant) {
                throw new Error("immutable global lexical assignment differed");
            }
            if (delete evalLexical || evalLexical !== 11) {
                throw new Error("global lexical deletion differed");
            }

            $262.evalScript(${JSON.stringify(shadowSource)});
            if (shadowable !== "lexical" || globalThis.shadowable !== "property") {
                throw new Error("global lexical did not shadow a configurable property");
            }

            var varCollision = false;
            try { $262.evalScript(${JSON.stringify(varCollisionSource)}); }
            catch (error) { varCollision = error instanceof SyntaxError; }
            if (!varCollision || "collisionSideEffect" in globalThis) {
                throw new Error("var/lexical collision was not atomic");
            }
            var collisionReferenceError = false;
            try { collisionSideEffect; }
            catch (error) { collisionReferenceError = error instanceof ReferenceError; }
            if (!collisionReferenceError || typeof collisionSideEffect !== "undefined" ||
                !delete collisionSideEffect) {
                throw new Error("failed declaration left a resolvable binding");
            }
            var lexicalCollision = false;
            try { $262.evalScript(${JSON.stringify(lexicalCollisionSource)}); }
            catch (error) { lexicalCollision = error instanceof SyntaxError; }
            if (!lexicalCollision || "collisionSideEffect" in globalThis) {
                throw new Error("lexical collision was not atomic");
            }
            var functionCollision = false;
            try { $262.evalScript(${JSON.stringify(functionCollisionSource)}); }
            catch (error) { functionCollision = error instanceof TypeError; }
            if (!functionCollision || globalThis.blockedFunction !== 1) {
                throw new Error("function definability preflight differed");
            }
            Object.defineProperty(globalThis, "annexBExisting", {
                value: "existing", writable: true, enumerable: false, configurable: true
            });
            $262.evalScript(${JSON.stringify(annexBUpdateSource)});
            var annexBNeverDescriptor = Object.getOwnPropertyDescriptor(globalThis, "annexBNever");
            var annexBExistingDescriptor = Object.getOwnPropertyDescriptor(globalThis, "annexBExisting");
            if (annexBMain() !== "main" || annexBBranch() !== "branch" ||
                annexBSequence() !== "second" || annexBCase() !== "case" ||
                annexBExistingFunction() !== "inner" ||
                annexBSuppressed !== "lexical" || globalThis.annexBSuppressed !== undefined ||
                !annexBNeverDescriptor || annexBNeverDescriptor.value !== undefined ||
                !annexBNeverDescriptor.writable || !annexBNeverDescriptor.enumerable ||
                annexBNeverDescriptor.configurable || annexBExisting() !== "updated" ||
                annexBExistingDescriptor.enumerable || !annexBExistingDescriptor.configurable) {
                throw new Error("Annex B global block function instantiation/update differed");
            }
            var annexBCollision = false;
            try { $262.evalScript(${JSON.stringify(annexBCollisionSource)}); }
            catch (error) { annexBCollision = error instanceof SyntaxError; }
            if (!annexBCollision || "annexBCollisionSideEffect" in globalThis) {
                throw new Error("Annex B var/lexical collision was not atomic");
            }
            $262.evalScript(${JSON.stringify(annexBStrictSource)});
            $262.evalScript(${JSON.stringify(annexBStressSource)});
            if (typeof annexBStrictOnly !== "undefined" || annexBStress() !== "stress") {
                throw new Error("Annex B strict/deep source-tree partition differed");
            }
            $262.evalScript(${JSON.stringify(duplicateFunctionSource)});
            $262.evalScript(${JSON.stringify(duplicateFunctionStressSource)});
            if (duplicateFunction() !== 3 || duplicateFunctionStress() !== 63) {
                throw new Error("duplicate global function selection differed");
            }

            $262.evalScript(${JSON.stringify(bindingPatternSource)});
            if (lexicalPatternFirst !== 1 || lexicalPatternNested !== 2 ||
                lexicalPatternSymbol !== 4 || lexicalPatternDefault !== 5 ||
                lexicalPatternRest.extra !== 3 || "first" in lexicalPatternRest ||
                patternSymbol in lexicalPatternRest) {
                throw new Error("global object BindingInitialization differed");
            }
            if (arrayPatternFirst !== 5 || arrayPatternThird !== 9 ||
                arrayPatternRest.length !== 1 || arrayPatternRest[0] !== 10) {
                throw new Error("global array BindingInitialization differed");
            }
            if (varPatternExtra !== 3 || varPatternFirst !== 7 || blockVarPattern !== 3 ||
                forPatternFirst !== 13 || forPatternRest.length !== 2 ||
                forPatternRest[0] !== 14 || forPatternRest[1] !== 15 ||
                readPatternBindings() !== 23) {
                throw new Error("global var BindingInitialization differed");
            }
            if (forInPatternFirst !== "x" || forInPatternRest.length !== 1 ||
                forInPatternRest[0] !== "y" || globalThis.forInPatternFirst !== "x") {
                throw new Error("global for-in BindingInitialization differed");
            }
            if ("lexicalPatternFirst" in globalThis || "arrayPatternFirst" in globalThis ||
                globalThis.varPatternExtra !== 3 || globalThis.varPatternFirst !== 7 ||
                globalThis.blockVarPattern !== 3 || globalThis.forPatternFirst !== 13) {
                throw new Error("global binding reflection differed");
            }
            $262.evalScript(${JSON.stringify(iteratorPatternSource)});
            if (iteratorPatternFirst !== 8 || patternIteratorClosed !== 1) {
                throw new Error("normal IteratorClose differed");
            }
            var abruptPatternExact = false;
            try { $262.evalScript(${JSON.stringify(abruptIteratorPatternSource)}); }
            catch (error) { abruptPatternExact = error === sentinel; }
            if (!abruptPatternExact || abruptPatternIteratorClosed !== 1) {
                throw new Error("abrupt IteratorClose differed");
            }
            $262.evalScript(${JSON.stringify(bindingStressSource)});
            if (bindingStressValue !== 99) {
                throw new Error("deep BindingInitialization differed");
            }

            Object.preventExtensions(globalThis);
            $262.evalScript(${JSON.stringify(annexBNonExtensibleSource)});
            if (typeof annexBNonExtensible !== "undefined" ||
                "annexBNonExtensible" in globalThis) {
                throw new Error("Annex B non-extensible suppression differed");
            }
            $262.evalScript(${JSON.stringify(nonExtensibleLexicalSource)});
            afterPreventLet = 23;
            AfterPreventClass = 24;
            var afterPreventConstThrow = false;
            try { afterPreventConst = 25; }
            catch (error) { afterPreventConstThrow = error instanceof TypeError; }
            if (afterPreventLet !== 23 || afterPreventConst !== 22 ||
                AfterPreventClass !== 24 || !afterPreventConstThrow ||
                "afterPreventLet" in globalThis || "afterPreventConst" in globalThis ||
                "AfterPreventClass" in globalThis) {
                throw new Error("non-extensible global lexical declaration differed");
            }
            $262.evalScript(${JSON.stringify(existingVarSource)});
            var configurableDescriptor = Object.getOwnPropertyDescriptor(globalThis, "existingConfigurable");
            var restrictedDescriptor = Object.getOwnPropertyDescriptor(globalThis, "existingRestricted");
            if (existingConfigurable !== 7 || configurableDescriptor.writable ||
                configurableDescriptor.enumerable || !configurableDescriptor.configurable ||
                existingRestricted !== 8 || restrictedDescriptor.writable ||
                restrictedDescriptor.enumerable || restrictedDescriptor.configurable) {
                throw new Error("existing global var property was reconfigured");
            }
            var nonExtensible = false;
            try { $262.evalScript(${JSON.stringify(nonExtensibleSource)}); }
            catch (error) { nonExtensible = error instanceof TypeError; }
            if (!nonExtensible || "impossibleGlobal" in globalThis || "impossibleSideEffect" in globalThis) {
                throw new Error("non-extensible global preflight was not atomic");
            }
            if ($262.evalScript(${JSON.stringify(completionEmptySource)}) !== undefined ||
                $262.evalScript(${JSON.stringify(completionIdentitySource)}) !== sentinel ||
                $262.evalScript(${JSON.stringify(completionBranchSource)}) !== 11 ||
                $262.evalScript(${JSON.stringify(completionLoopSource)}) !== 2 ||
                $262.evalScript(${JSON.stringify(completionCaughtEmptySource)}) !== 20 ||
                $262.evalScript(${JSON.stringify(completionCatchValueSource)}) !== 30 ||
                $262.evalScript(${JSON.stringify(completionFinallySource)}) !== 40 ||
                $262.evalScript(${JSON.stringify(completionStressSource)}) !== sentinel) {
                throw new Error("ScriptEvaluation completion propagation differed");
            }
            print("test262-eval-script-ok");
        `, "utf8"),
    ]);

    try {
        for (const noGc of [false, true]) {
            const mode = noGc ? "no-gc" : "gc";
            const executable = path.join(temporary, `program-${mode}`);
            const diagnostics: string[] = [];
            const allCompiledRoots = [
                ...compiledEntries.map(({ entry }) => entry),
                ...directEntries.map(({ entry }) => entry),
                ...indirectEntries.map(({ entry }) => entry),
            ];
            const result = await compile({
                entry: main,
                output: executable,
                buildDir: path.join(temporary, `build-${mode}`),
                additionalRoots: allCompiledRoots,
                initializationEntries: [main],
                isolatedScriptRoots: [main, ...allCompiledRoots],
                ignoreCheckJsDirectiveRoots: [main, ...allCompiledRoots],
                noGc,
                test262Observation: {
                    kind: "test262-native-observation",
                    scenarioId,
                    setupEntries: [],
                    testEntry: main,
                    async: false,
                    scriptEntries: [main, ...compiledEntries.map(({ entry }) => entry)],
                    evalScriptEntries: [
                        { source: invalidSource, entry: null },
                        ...compiledEntries,
                    ],
                    directEvalEntries: [
                        { source: "17", entry: null, strictCaller: false, strict: false },
                        { source: invalidDirectSource, entry: null, strictCaller: false, strict: false },
                        ...directEntries,
                    ],
                    indirectEvalEntries: [
                        { source: invalidIndirectSource, entry: null, strict: false },
                        ...indirectEntries,
                    ],
                },
                diagnosticWriter: (message) => diagnostics.push(message),
            });
            expect(diagnostics.join("")).toBe("");
            expect(result.exitCode).toBe(0);
            const child = Bun.spawnSync([executable], { stdout: "pipe", stderr: "pipe" });
            expect(child.exitCode).toBe(0);
            expect(child.stderr.toString()).toBe("");
            const observation = parseHostObservation(JSON.parse(child.stdout.toString()));
            expect(observation.protocolVersion).toBe(hostProtocolVersion);
            expect(observation.scenarioId).toBe(scenarioId);
            if (observation.kind !== "normal") {
                throw new Error(`unexpected observation: ${JSON.stringify(observation)}`);
            }
            expect(observation.stdout).toBe("test262-eval-script-ok\n");
        }

        const nestedDiagnostics: string[] = [];
        const nestedResult = await compile({
            entry: nestedEvalMain,
            output: path.join(temporary, "nested-eval-program"),
            buildDir: path.join(temporary, "nested-eval-build"),
            initializationEntries: [nestedEvalMain],
            isolatedScriptRoots: [nestedEvalMain],
            ignoreCheckJsDirectiveRoots: [nestedEvalMain],
            test262Observation: {
                kind: "test262-native-observation",
                scenarioId: "property/test262-nested-eval.js#sloppy",
                setupEntries: [],
                testEntry: nestedEvalMain,
                async: false,
                scriptEntries: [nestedEvalMain],
                evalScriptEntries: [],
                directEvalEntries: [],
                indirectEvalEntries: [],
            },
            diagnosticWriter: (message) => nestedDiagnostics.push(message),
        });
        expect(nestedResult.exitCode).not.toBe(0);
        expect(nestedDiagnostics.join("")).toContain(
            "unknown eval() source requires --runtime-code-manifest allow-list",
        );
    } finally {
        await fs.rm(temporary, { recursive: true, force: true });
    }
}, 90_000);
