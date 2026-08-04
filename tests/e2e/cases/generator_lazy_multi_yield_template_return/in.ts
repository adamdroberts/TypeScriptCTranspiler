let taggedCalls = 0;

function tag(strings: TemplateStringsArray, first: string, second: string): string {
    taggedCalls++;
    return strings[0] + first.toUpperCase() + strings[1] + second.toUpperCase() + strings[2];
}

function* templateReturn(): Generator<string, string, string> {
    return `left ${yield "first"} middle ${yield "second"} right`;
}

function* taggedReturn(): Generator<string, string, string> {
    return tag`start ${yield "third"} end ${yield "fourth"}!`;
}

const templateIterator = templateReturn();
const templateFirst: any = templateIterator.next();
console.log("template-before", templateFirst.done, templateFirst.value);
const templateSecond: any = templateIterator.next("A");
console.log("template-middle", templateSecond.done, templateSecond.value);
const templateDone: any = templateIterator.next("B");
console.log("template-done", templateDone.done, templateDone.value);

const taggedIterator = taggedReturn();
const taggedFirst: any = taggedIterator.next();
console.log("tagged-before", taggedCalls, taggedFirst.done, taggedFirst.value);
const taggedSecond: any = taggedIterator.next("C");
console.log("tagged-middle", taggedCalls, taggedSecond.done, taggedSecond.value);
const taggedDone: any = taggedIterator.next("D");
console.log("tagged-done", taggedCalls, taggedDone.done, taggedDone.value);
