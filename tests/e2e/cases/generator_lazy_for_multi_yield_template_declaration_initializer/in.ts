let taggedCalls = 0;

function tag(strings: TemplateStringsArray, first: string, second: string): string {
    taggedCalls++;
    return strings[0] + first.toUpperCase() + strings[1] + second.toUpperCase() + strings[2];
}

function* multiYieldTemplateDeclarationInitializer(): Generator<string, string, string> {
    for (
        let text = `left ${yield "standard-a"} middle ${yield "standard-b"} right`,
        count = 0;
        count < 1;
        count++
    ) {
        yield "body-" + text;
    }
    return "done";
}

function* multiYieldTaggedTemplateDeclarationInitializer(): Generator<string, string, string> {
    for (
        let text = tag`start ${yield "tagged-a"} end ${yield "tagged-b"}!`,
        count = 0;
        count < 1;
        count++
    ) {
        yield "body-" + text;
    }
    return "done";
}

const standardIterator = multiYieldTemplateDeclarationInitializer();
const standardFirst: any = standardIterator.next();
console.log("standard-first", standardFirst.done, standardFirst.value);
const standardSecond: any = standardIterator.next("A");
console.log("standard-second", standardSecond.done, standardSecond.value);
const standardThird: any = standardIterator.next("B");
console.log("standard-third", standardThird.done, standardThird.value);
const standardDone: any = standardIterator.next();
console.log("standard-done", standardDone.done, standardDone.value);

const taggedIterator = multiYieldTaggedTemplateDeclarationInitializer();
const taggedFirst: any = taggedIterator.next();
console.log("tagged-first", taggedCalls, taggedFirst.done, taggedFirst.value);
const taggedSecond: any = taggedIterator.next("C");
console.log("tagged-second", taggedCalls, taggedSecond.done, taggedSecond.value);
const taggedThird: any = taggedIterator.next("D");
console.log("tagged-third", taggedCalls, taggedThird.done, taggedThird.value);
const taggedDone: any = taggedIterator.next();
console.log("tagged-done", taggedCalls, taggedDone.done, taggedDone.value);
