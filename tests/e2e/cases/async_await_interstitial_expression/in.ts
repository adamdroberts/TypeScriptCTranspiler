import { setTimeout as delay } from "node:timers/promises";

async function leadingVoid(): Promise<string> {
    await delay(9);
    return await delay(10, "leading-void");
}

async function interstitialCatchBinding(): Promise<string> {
    const first = await delay(480, "catch-first");
    let label = "catch-label";
    try {
        throw first;
    } catch (error) {
        label = label + ":" + error;
    }
    const second = await delay(481, label);
    return second;
}

async function directCatchBindingPrelude(): Promise<string> {
    let label = "direct-catch";
    try {
        throw "caught";
    } catch (error) {
        label = label + ":" + error;
    }
    return await delay(482, label);
}

async function directReturnAwaitPrelude(): Promise<string> {
    console.log("direct-prelude");
    let prefix: string;
    prefix = "direct-";
    return await delay(12, prefix + "return-await");
}

async function nestedDirectReturnAwait(): Promise<string> {
    const prefix = "nested-";
    return await (await delay(100, prefix + "return-await"));
}

async function nestedExpressionReturnAwait(): Promise<string> {
    const prefix = "nested-expression-";
    return await Promise.resolve(await delay(101, prefix + "return-await"));
}

async function nestedConditionalReturnAwait(flag: boolean): Promise<string> {
    return await (flag
        ? await delay(110, "nested-conditional-true")
        : await delay(111, "nested-conditional-false"));
}

async function nestedMixedConditionalReturnAwait(flag: boolean): Promise<string> {
    return await (flag
        ? await delay(120, "nested-mixed-await")
        : "nested-mixed-sync");
}

async function nestedConditionalTreeReturnAwait(first: boolean, second: boolean): Promise<string> {
    return await (first
        ? (second
            ? await delay(130, "nested-tree-true-true")
            : await delay(131, "nested-tree-true-false"))
        : await delay(132, "nested-tree-false"));
}

async function nestedShortCircuitReturnAwait(prefix: string): Promise<string> {
    return await (prefix || await delay(140, "nested-short-or-await"));
}

async function nestedAndReturnAwait(flag: boolean): Promise<any> {
    return await (flag && await delay(141, "nested-short-and-await"));
}

async function nestedNullishReturnAwait(prefix: string | undefined): Promise<string> {
    return await (prefix ?? await delay(142, "nested-short-nullish-await"));
}

async function nestedShortCircuitTreeReturnAwait(outer: boolean, inner: string): Promise<any> {
    return await (outer && (inner || await delay(150, "nested-short-tree-await")));
}

async function nestedNonPromiseReturnAwait(): Promise<string> {
    return await ((await delay(160, "nested-nonpromise")) + "-outer");
}

async function twoInnerReturnAwait(): Promise<string> {
    const prefix = "two-inner-";
    return await ((await delay(170, prefix + "left")) + (await delay(171, prefix + "right")));
}

async function threeInnerReturnAwait(): Promise<string> {
    const prefix = "three-inner-";
    return await (((await delay(180, prefix + "left")) + (await delay(181, prefix + "middle"))) +
        (await delay(182, prefix + "right")));
}

async function fourInnerReturnAwait(): Promise<string> {
    const prefix = "four-inner-";
    return await ((((await delay(190, prefix + "left")) + (await delay(191, prefix + "middle"))) +
        (await delay(192, prefix + "next"))) + (await delay(193, prefix + "right")));
}

async function fiveInnerReturnAwait(): Promise<string> {
    const prefix = "five-inner-";
    return await (((((await delay(200, prefix + "left")) + (await delay(201, prefix + "middle"))) +
        (await delay(202, prefix + "next"))) + (await delay(203, prefix + "later"))) +
        (await delay(204, prefix + "right")));
}

async function templateInnerReturnAwait(): Promise<string> {
    const prefix = "template-inner-";
    return await `${await delay(210, prefix + "left")}:${await delay(211, prefix + "middle")}:${await delay(212, prefix + "right")}`;
}

async function mixedTemplateInnerReturnAwait(): Promise<string> {
    const prefix = "mixed-template-inner-";
    return await `${await delay(370, prefix + "left")}:${"literal"}:${await delay(371, prefix + "right")}`;
}

async function arrayInnerReturnAwait(): Promise<string[]> {
    const prefix = "array-inner-";
    return await [await delay(220, prefix + "left"), await delay(221, prefix + "middle"), await delay(222, prefix + "right")];
}

async function mixedArrayInnerReturnAwait(): Promise<string[]> {
    const prefix = "mixed-array-inner-";
    return await [await delay(350, prefix + "left"), "literal", await delay(351, prefix + "right")];
}

function joinAwaitedParts(left: string, middle: string, right: string): string {
    return `${left}:${middle}:${right}`;
}

async function callInnerReturnAwait(): Promise<string> {
    const prefix = "call-inner-";
    return await joinAwaitedParts(
        await delay(230, prefix + "left"),
        await delay(231, prefix + "middle"),
        await delay(232, prefix + "right"),
    );
}

async function mixedCallInnerReturnAwait(): Promise<string> {
    const prefix = "mixed-call-inner-";
    return await joinAwaitedParts(
        await delay(420, prefix + "left"),
        "literal",
        await delay(421, prefix + "right"),
    );
}

interface AwaitedRecord {
    left: string;
    middle: string;
    right: string;
}

async function objectInnerReturnAwait(): Promise<AwaitedRecord> {
    const prefix = "object-inner-";
    return await {
        left: await delay(240, prefix + "left"),
        middle: await delay(241, prefix + "middle"),
        right: await delay(242, prefix + "right"),
    };
}

async function mixedObjectInnerReturnAwait(): Promise<AwaitedRecord> {
    const prefix = "mixed-object-inner-";
    return await {
        left: await delay(360, prefix + "left"),
        middle: "literal",
        right: await delay(361, prefix + "right"),
    };
}

class AwaitedParts {
    left: string;
    middle: string;
    right: string;

    constructor(left: string, middle: string, right: string) {
        this.left = left;
        this.middle = middle;
        this.right = right;
    }
}

async function newInnerReturnAwait(): Promise<AwaitedParts> {
    const prefix = "new-inner-";
    return await new AwaitedParts(
        await delay(250, prefix + "left"),
        await delay(251, prefix + "middle"),
        await delay(252, prefix + "right"),
    );
}

async function mixedNewInnerReturnAwait(): Promise<AwaitedParts> {
    const prefix = "mixed-new-inner-";
    return await new AwaitedParts(
        await delay(430, prefix + "left"),
        "literal",
        await delay(431, prefix + "right"),
    );
}

function joinArrayParts(parts: string[]): string {
    return parts.join(":");
}

function formatAwaitedTagged(strings: TemplateStringsArray, left: string, right: string): string {
    return strings[0] + left + strings[1] + right + strings[2];
}

function formatMixedAwaitedTagged(strings: TemplateStringsArray, left: string, middle: string, right: string): string {
    return strings[0] + left + strings[1] + middle + strings[2] + right + strings[3];
}

function awaitedJoiner(): Promise<any> {
    return Promise.resolve(joinAwaitedParts);
}

function ConstructedAwaitedParts(left: string, middle: string, right: string): AwaitedParts {
    return new AwaitedParts(left, middle, right);
}

function awaitedConstructor(): Promise<any> {
    return Promise.resolve(ConstructedAwaitedParts);
}

async function nestedArrayArgumentReturnAwait(): Promise<string> {
    const prefix = "all-inner-";
    return await joinArrayParts([
        await delay(260, prefix + "left"),
        await delay(261, prefix + "middle"),
        await delay(262, prefix + "right"),
    ]);
}

async function taggedInnerReturnAwait(): Promise<string> {
    const prefix = "tagged-inner-";
    return await formatAwaitedTagged`tag-${await delay(270, prefix + "left")}-${await delay(271, prefix + "right")}!`;
}

async function mixedTaggedInnerReturnAwait(): Promise<string> {
    const prefix = "mixed-tagged-inner-";
    return await formatMixedAwaitedTagged`tag-${await delay(390, prefix + "left")}-${"literal"}-${await delay(391, prefix + "right")}!`;
}

async function awaitedCalleeReturnAwait(): Promise<string> {
    const prefix = "callee-inner-";
    return await (await awaitedJoiner())(
        await delay(280, prefix + "left"),
        await delay(281, prefix + "middle"),
        await delay(282, prefix + "right"),
    );
}

async function propertyAccessReturnAwait(): Promise<number> {
    return await ((await delay(290, "property-inner")).length + await delay(291, 1));
}

async function elementAccessReturnAwait(): Promise<string> {
    return await (await delay(292, "element-inner"))[await delay(293, 0)];
}

async function mixedElementLiteralReturnAwait(): Promise<string> {
    return await ((await delay(440, "element-literal"))[0] + await delay(441, "tail"));
}

async function memberCallReturnAwait(): Promise<string> {
    return await (await delay(300, "member-inner-")).concat(
        await delay(301, "left"),
        await delay(302, "right"),
    );
}

async function prefixUnaryReturnAwait(): Promise<number> {
    return await ((-(await delay(310, 2))) + await delay(311, 3));
}

async function logicalPrefixReturnAwait(): Promise<number> {
    return await ((~(await delay(312, 0))) + await delay(313, 1));
}

async function awaitedConstructorReturnAwait(): Promise<AwaitedParts> {
    const prefix = "ctor-inner-";
    return await new (await awaitedConstructor())(
        await delay(320, prefix + "left"),
        await delay(321, prefix + "middle"),
        await delay(322, prefix + "right"),
    );
}

async function awaitedConstructorMixedArgsReturnAwait(): Promise<AwaitedParts> {
    const prefix = "ctor-mixed-inner-";
    return await new (await awaitedConstructor())(
        await delay(450, prefix + "left"),
        "literal",
        await delay(451, prefix + "right"),
    );
}

async function typeOfReturnAwait(): Promise<string> {
    return await (typeof (await delay(330, "type")) + ":" + typeof undefined + ":" + typeof null + ":" + typeof 1n + ":" + typeof /literal/ + ":" + typeof void 0 + ":" + typeof (await delay(331, 1)));
}

async function mixedVoidLiteralReturnAwait(): Promise<string> {
    return await ("prefix:" + void 0 + ":" + await delay(460, "one") + ":" + await delay(461, "two") + ":" + await delay(462, "three") + ":" + await delay(463, "four") + ":" + await delay(464, "five"));
}

async function directReturnAwaitControlPrelude(): Promise<string> {
    if (true) {
        const branchLabel = "direct-control-if";
        console.log(branchLabel);
    }
    switch (1) {
        case 1:
            console.log("direct-control-switch");
            break;
    }
    let count = 0;
    while (count < 2) {
        console.log("direct-control-loop:", count);
        count++;
    }
    try {
        console.log("direct-control-try");
    } finally {
        console.log("direct-control-finally");
    }
    return await delay(15, "direct-control-return-await");
}

async function declaration(): Promise<string> {
    const first = await delay(1, "one");
    const trace = first.toUpperCase();
    console.log("declaration-between:", trace);
    if (trace === "ONE") console.log("declaration-if");
    switch (trace) {
        case "ONE":
            console.log("declaration-switch");
            break;
        default:
            console.log("declaration-switch-default");
    }
    try {
        console.log("declaration-try");
    } catch {
        console.log("declaration-catch");
    } finally {
        console.log("declaration-finally");
    }
    const second = await delay(2, trace + "-TWO");
    const third = await delay(3, second + ":" + trace);
    return await delay(11, third + "!");
}

class Runner {
    async directReturnAwait(): Promise<string> {
        console.log("method-direct-prelude");
        let prefix: string;
        prefix = "method-direct-";
        return await delay(13, prefix + "return-await");
    }

    async method(): Promise<string> {
        const first = await delay(3, "alpha");
        let trace: string;
        trace = first + "-middle";
        console.log("method-between:", trace);
        if (trace.length > 0) console.log("method-if");
        switch (trace) {
            case "alpha-middle":
                console.log("method-switch");
                break;
        }
        try {
            console.log("method-try");
        } finally {
            console.log("method-finally");
        }
        const second = await delay(4, trace + "-omega");
        return second + ":" + trace;
    }
}

const value = async (): Promise<string> => {
    const first = await delay(5, "left");
    console.log("between:", first);
    if (first === "left") console.log("value-if");
    switch (first) {
        case "left":
            console.log("value-switch");
            break;
    }
    try {
        console.log("value-try");
    } catch {
        console.log("value-catch");
    }
    let count = 0;
    while (count < 2) {
        console.log("value-loop:", count);
        count++;
    }
    await delay(7);
    const second = await delay(6, first + "-right");
    return second;
};

const directValue = async (): Promise<string> => {
    console.log("value-direct-prelude");
    let prefix: string;
    prefix = "value-direct-";
    return await delay(14, prefix + "return-await");
};

declaration().then((result) => console.log("declaration:", result));
const runner = new Runner();
runner.method().then((result) => console.log("method:", result));
runner.directReturnAwait().then((result) => console.log("method-direct:", result));
value().then((result) => console.log("value:", result));
directValue().then((result) => console.log("value-direct:", result));
leadingVoid().then((result) => console.log("leading-void:", result));
directReturnAwaitPrelude().then((result) => console.log("direct-return-await:", result));
directReturnAwaitControlPrelude().then((result) => console.log("direct-control-return-await:", result));
nestedDirectReturnAwait().then((result) => console.log("nested-direct-return-await:", result));
nestedExpressionReturnAwait().then((result) => console.log("nested-expression-return-await:", result));
nestedConditionalReturnAwait(true).then((result) => console.log("nested-conditional-return-await:", result));
nestedConditionalReturnAwait(false).then((result) => console.log("nested-conditional-return-await:", result));
nestedMixedConditionalReturnAwait(false).then((result) => console.log("nested-mixed-return-await:", result));
nestedMixedConditionalReturnAwait(true).then((result) => console.log("nested-mixed-return-await:", result));
nestedConditionalTreeReturnAwait(true, true).then((result) => console.log("nested-tree-return-await:", result));
nestedConditionalTreeReturnAwait(true, false).then((result) => console.log("nested-tree-return-await:", result));
nestedConditionalTreeReturnAwait(false, true).then((result) => console.log("nested-tree-return-await:", result));
nestedShortCircuitReturnAwait("present").then((result) => console.log("nested-short-or-return-await:", result));
nestedShortCircuitReturnAwait("").then((result) => console.log("nested-short-or-return-await:", result));
nestedAndReturnAwait(false).then((result) => console.log("nested-short-and-return-await:", result));
nestedAndReturnAwait(true).then((result) => console.log("nested-short-and-return-await:", result));
nestedNullishReturnAwait("present").then((result) => console.log("nested-short-nullish-return-await:", result));
nestedNullishReturnAwait(undefined).then((result) => console.log("nested-short-nullish-return-await:", result));
nestedShortCircuitTreeReturnAwait(false, "unused").then((result) => console.log("nested-short-tree-return-await:", result));
nestedShortCircuitTreeReturnAwait(true, "present").then((result) => console.log("nested-short-tree-return-await:", result));
nestedShortCircuitTreeReturnAwait(true, "").then((result) => console.log("nested-short-tree-return-await:", result));
nestedNonPromiseReturnAwait().then((result) => console.log("nested-nonpromise-return-await:", result));
twoInnerReturnAwait().then((result) => console.log("two-inner-return-await:", result));
threeInnerReturnAwait().then((result) => console.log("three-inner-return-await:", result));
fourInnerReturnAwait().then((result) => console.log("four-inner-return-await:", result));
fiveInnerReturnAwait().then((result) => console.log("five-inner-return-await:", result));
templateInnerReturnAwait().then((result) => console.log("template-inner-return-await:", result));
mixedTemplateInnerReturnAwait().then((result) => console.log("mixed-template-inner-return-await:", result));
arrayInnerReturnAwait().then((result) => console.log("array-inner-return-await:", result.join(":")));
mixedArrayInnerReturnAwait().then((result) => console.log("mixed-array-inner-return-await:", result.join(":")));
callInnerReturnAwait().then((result) => console.log("call-inner-return-await:", result));
mixedCallInnerReturnAwait().then((result) => console.log("mixed-call-inner-return-await:", result));
objectInnerReturnAwait().then((result) => console.log("object-inner-return-await:", result.left + ":" + result.middle + ":" + result.right));
mixedObjectInnerReturnAwait().then((result) => console.log("mixed-object-inner-return-await:", result.left + ":" + result.middle + ":" + result.right));
newInnerReturnAwait().then((result) => console.log("new-inner-return-await:", result.left + ":" + result.middle + ":" + result.right));
mixedNewInnerReturnAwait().then((result) => console.log("mixed-new-inner-return-await:", result.left + ":" + result.middle + ":" + result.right));
nestedArrayArgumentReturnAwait().then((result) => console.log("nested-array-argument-return-await:", result));
taggedInnerReturnAwait().then((result) => console.log("tagged-inner-return-await:", result));
mixedTaggedInnerReturnAwait().then((result) => console.log("mixed-tagged-inner-return-await:", result));
awaitedCalleeReturnAwait().then((result) => console.log("awaited-callee-return-await:", result));
propertyAccessReturnAwait().then((result) => console.log("property-access-return-await:", result));
elementAccessReturnAwait().then((result) => console.log("element-access-return-await:", result));
mixedElementLiteralReturnAwait().then((result) => console.log("mixed-element-literal-return-await:", result));
memberCallReturnAwait().then((result) => console.log("member-call-return-await:", result));
prefixUnaryReturnAwait().then((result) => console.log("prefix-unary-return-await:", result));
logicalPrefixReturnAwait().then((result) => console.log("logical-prefix-return-await:", result));
awaitedConstructorReturnAwait().then((result) => console.log("awaited-constructor-return-await:", result.left + ":" + result.middle + ":" + result.right));
awaitedConstructorMixedArgsReturnAwait().then((result) => console.log("awaited-constructor-mixed-args-return-await:", result.left + ":" + result.middle + ":" + result.right));
typeOfReturnAwait().then((result) => console.log("typeof-return-await:", result));
mixedVoidLiteralReturnAwait().then((result) => console.log("mixed-void-literal-return-await:", result));
interstitialCatchBinding().then((result) => console.log("interstitial-catch-binding:", result));
directCatchBindingPrelude().then((result) => console.log("direct-catch-binding-prelude:", result));
