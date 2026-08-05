let pushCallLeft: any = "push-before-left";
let pushCallRight: any = "push-before-right";
let unshiftCallLeft: any = "unshift-before-left";
let unshiftCallRight: any = "unshift-before-right";
let callCount = 0;

function formatCall(left: any, right: any): string {
    callCount++;
    return left + "-" + right;
}

function* multiYieldPushCallArgumentAccessDeclarationInitializer(): Generator<string, string, any> {
    for (
        let value: any = (yield "push-receiver").push(
            formatCall(pushCallLeft, pushCallRight),
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

function* multiYieldUnshiftCallArgumentAccessDeclarationInitializer(): Generator<string, string, any> {
    for (
        let value: any = (yield "unshift-receiver").unshift(
            formatCall(unshiftCallLeft, unshiftCallRight),
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
const pushIterator = multiYieldPushCallArgumentAccessDeclarationInitializer();
const pushFirst: any = pushIterator.next();
console.log("push-first", pushReceiver.join(","), pushFirst.done, pushFirst.value, callCount);
const pushSecond: any = pushIterator.next(pushReceiver);
console.log("push-second", pushReceiver.join(","), pushSecond.done, pushSecond.value, callCount);
pushCallLeft = "push-after-left";
pushCallRight = "push-after-right";
const pushThird: any = pushIterator.next("push-direct");
console.log("push-third", pushReceiver.join(","), pushThird.done, pushThird.value, callCount);
const pushFourth: any = pushIterator.next(pushSpread);
console.log("push-fourth", pushReceiver.join(","), pushFourth.done, pushFourth.value, callCount);
const pushFifth: any = pushIterator.next("push-missing");
console.log("push-fifth", pushReceiver.join(","), pushFifth.done, pushFifth.value, callCount);
const pushDone: any = pushIterator.next();
console.log("push-done", pushReceiver.join(","), pushDone.done, pushDone.value, callCount);

const unshiftReceiver: any = ["unshift-first"];
const unshiftSpread: any = ["unshift-spread-one", "unshift-spread-two"];
const unshiftIterator = multiYieldUnshiftCallArgumentAccessDeclarationInitializer();
const unshiftFirst: any = unshiftIterator.next();
console.log("unshift-first", unshiftReceiver.join(","), unshiftFirst.done, unshiftFirst.value, callCount);
const unshiftSecond: any = unshiftIterator.next(unshiftReceiver);
console.log("unshift-second", unshiftReceiver.join(","), unshiftSecond.done, unshiftSecond.value, callCount);
unshiftCallLeft = "unshift-after-left";
unshiftCallRight = "unshift-after-right";
const unshiftThird: any = unshiftIterator.next("unshift-direct");
console.log("unshift-third", unshiftReceiver.join(","), unshiftThird.done, unshiftThird.value, callCount);
const unshiftFourth: any = unshiftIterator.next(unshiftSpread);
console.log("unshift-fourth", unshiftReceiver.join(","), unshiftFourth.done, unshiftFourth.value, callCount);
const unshiftFifth: any = unshiftIterator.next("unshift-missing");
console.log("unshift-fifth", unshiftReceiver.join(","), unshiftFifth.done, unshiftFifth.value, callCount);
const unshiftDone: any = unshiftIterator.next();
console.log("unshift-done", unshiftReceiver.join(","), unshiftDone.done, unshiftDone.value, callCount);
