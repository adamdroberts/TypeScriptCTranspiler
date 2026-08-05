let pushTagLeft: any = "push-before-left";
let pushTagRight: any = "push-before-right";
let unshiftTagLeft: any = "unshift-before-left";
let unshiftTagRight: any = "unshift-before-right";
let tagCalls = 0;

function formatArgument(strings: TemplateStringsArray, left: any, right: any): string {
    tagCalls++;
    return strings[0] + left + strings[1] + right + strings[2];
}

function* multiYieldPushTaggedTemplateArgumentAccessDeclarationInitializer(): Generator<string, string, any> {
    for (
        let value: any = (yield "push-receiver").push(
            formatArgument`push-${pushTagLeft}-${pushTagRight}`,
            yield "push-item",
            ...(yield "push-spread")
        )[yield "push-key"],
        count = 0;
        count < 1;
        count++
    ) {
        yield "push-body-" + typeof value;
    }
    return "push-done";
}

function* multiYieldUnshiftTaggedTemplateArgumentAccessDeclarationInitializer(): Generator<string, string, any> {
    for (
        let value: any = (yield "unshift-receiver").unshift(
            formatArgument`unshift-${unshiftTagLeft}-${unshiftTagRight}`,
            yield "unshift-item",
            ...(yield "unshift-spread")
        )[yield "unshift-key"],
        count = 0;
        count < 1;
        count++
    ) {
        yield "unshift-body-" + typeof value;
    }
    return "unshift-done";
}

const pushReceiver: any = ["push-first"];
const pushSpread: any = ["push-spread-one", "push-spread-two"];
const pushIterator = multiYieldPushTaggedTemplateArgumentAccessDeclarationInitializer();
const pushFirst: any = pushIterator.next();
console.log("push-first", pushReceiver.join(","), pushFirst.done, pushFirst.value, tagCalls);
const pushSecond: any = pushIterator.next(pushReceiver);
console.log("push-second", pushReceiver.join(","), pushSecond.done, pushSecond.value, tagCalls);
pushTagLeft = "push-after-left";
pushTagRight = "push-after-right";
const pushThird: any = pushIterator.next("push-direct");
console.log("push-third", pushReceiver.join(","), pushThird.done, pushThird.value, tagCalls);
const pushFourth: any = pushIterator.next(pushSpread);
console.log("push-fourth", pushReceiver.join(","), pushFourth.done, pushFourth.value, tagCalls);
const pushFifth: any = pushIterator.next("push-missing");
console.log("push-fifth", pushReceiver.join(","), pushFifth.done, pushFifth.value, tagCalls);
const pushDone: any = pushIterator.next();
console.log("push-done", pushReceiver.join(","), pushDone.done, pushDone.value, tagCalls);

const unshiftReceiver: any = ["unshift-first"];
const unshiftSpread: any = ["unshift-spread-one", "unshift-spread-two"];
const unshiftIterator = multiYieldUnshiftTaggedTemplateArgumentAccessDeclarationInitializer();
const unshiftFirst: any = unshiftIterator.next();
console.log("unshift-first", unshiftReceiver.join(","), unshiftFirst.done, unshiftFirst.value, tagCalls);
const unshiftSecond: any = unshiftIterator.next(unshiftReceiver);
console.log("unshift-second", unshiftReceiver.join(","), unshiftSecond.done, unshiftSecond.value, tagCalls);
unshiftTagLeft = "unshift-after-left";
unshiftTagRight = "unshift-after-right";
const unshiftThird: any = unshiftIterator.next("unshift-direct");
console.log("unshift-third", unshiftReceiver.join(","), unshiftThird.done, unshiftThird.value, tagCalls);
const unshiftFourth: any = unshiftIterator.next(unshiftSpread);
console.log("unshift-fourth", unshiftReceiver.join(","), unshiftFourth.done, unshiftFourth.value, tagCalls);
const unshiftFifth: any = unshiftIterator.next("unshift-missing");
console.log("unshift-fifth", unshiftReceiver.join(","), unshiftFifth.done, unshiftFifth.value, tagCalls);
const unshiftDone: any = unshiftIterator.next();
console.log("unshift-done", unshiftReceiver.join(","), unshiftDone.done, unshiftDone.value, tagCalls);
