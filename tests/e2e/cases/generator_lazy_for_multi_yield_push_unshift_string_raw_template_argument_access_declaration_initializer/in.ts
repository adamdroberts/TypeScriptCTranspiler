let pushRawLeft: any = "push-before-left";
let pushRawRight: any = "push-before-right";
let unshiftRawLeft: any = "unshift-before-left";
let unshiftRawRight: any = "unshift-before-right";

function* multiYieldPushStringRawTemplateArgumentAccessDeclarationInitializer(): Generator<string, string, any> {
    for (
        let value: any = (yield "push-receiver").push(
            String.raw`push-${pushRawLeft}-${pushRawRight}`,
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

function* multiYieldUnshiftStringRawTemplateArgumentAccessDeclarationInitializer(): Generator<string, string, any> {
    for (
        let value: any = (yield "unshift-receiver").unshift(
            String.raw`unshift-${unshiftRawLeft}-${unshiftRawRight}`,
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
const pushIterator = multiYieldPushStringRawTemplateArgumentAccessDeclarationInitializer();
const pushFirst: any = pushIterator.next();
console.log("push-first", pushReceiver.join(","), pushFirst.done, pushFirst.value);
const pushSecond: any = pushIterator.next(pushReceiver);
console.log("push-second", pushReceiver.join(","), pushSecond.done, pushSecond.value);
pushRawLeft = "push-after-left";
pushRawRight = "push-after-right";
const pushThird: any = pushIterator.next("push-direct");
console.log("push-third", pushReceiver.join(","), pushThird.done, pushThird.value);
const pushFourth: any = pushIterator.next(pushSpread);
console.log("push-fourth", pushReceiver.join(","), pushFourth.done, pushFourth.value);
const pushFifth: any = pushIterator.next("push-missing");
console.log("push-fifth", pushReceiver.join(","), pushFifth.done, pushFifth.value);
const pushDone: any = pushIterator.next();
console.log("push-done", pushReceiver.join(","), pushDone.done, pushDone.value);

const unshiftReceiver: any = ["unshift-first"];
const unshiftSpread: any = ["unshift-spread-one", "unshift-spread-two"];
const unshiftIterator = multiYieldUnshiftStringRawTemplateArgumentAccessDeclarationInitializer();
const unshiftFirst: any = unshiftIterator.next();
console.log("unshift-first", unshiftReceiver.join(","), unshiftFirst.done, unshiftFirst.value);
const unshiftSecond: any = unshiftIterator.next(unshiftReceiver);
console.log("unshift-second", unshiftReceiver.join(","), unshiftSecond.done, unshiftSecond.value);
unshiftRawLeft = "unshift-after-left";
unshiftRawRight = "unshift-after-right";
const unshiftThird: any = unshiftIterator.next("unshift-direct");
console.log("unshift-third", unshiftReceiver.join(","), unshiftThird.done, unshiftThird.value);
const unshiftFourth: any = unshiftIterator.next(unshiftSpread);
console.log("unshift-fourth", unshiftReceiver.join(","), unshiftFourth.done, unshiftFourth.value);
const unshiftFifth: any = unshiftIterator.next("unshift-missing");
console.log("unshift-fifth", unshiftReceiver.join(","), unshiftFifth.done, unshiftFifth.value);
const unshiftDone: any = unshiftIterator.next();
console.log("unshift-done", unshiftReceiver.join(","), unshiftDone.done, unshiftDone.value);
