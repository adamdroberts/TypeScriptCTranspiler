function pushYieldedCalleeCallback(value: any): any {
    return "push-yielded-" + value;
}

function* multiYieldPushOptionalCallNestedYieldedCalleeAccessDeclarationInitializer(): Generator<string, string, any> {
    for (
        let value: any = (yield "push-receiver").push(
            ((yield "push-callee"))?.("push-optional"),
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

function* multiYieldUnshiftOptionalCallNestedYieldedCalleeAccessDeclarationInitializer(): Generator<string, string, any> {
    for (
        let value: any = (yield "unshift-receiver").unshift(
            ((yield "unshift-callee"))?.("unshift-optional"),
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
const pushIterator = multiYieldPushOptionalCallNestedYieldedCalleeAccessDeclarationInitializer();
const pushFirst: any = pushIterator.next();
console.log("push-first", pushReceiver.join(","), pushFirst.done, pushFirst.value);
const pushSecond: any = pushIterator.next(pushReceiver);
console.log("push-second", pushReceiver.join(","), pushSecond.done, pushSecond.value);
const pushThird: any = pushIterator.next(pushYieldedCalleeCallback);
console.log("push-third", pushReceiver.join(","), pushThird.done, pushThird.value);
const pushFourth: any = pushIterator.next("push-direct");
console.log("push-fourth", pushReceiver.join(","), pushFourth.done, pushFourth.value);
const pushFifth: any = pushIterator.next(pushSpread);
console.log("push-fifth", pushReceiver.join(","), pushFifth.done, pushFifth.value);
const pushSixth: any = pushIterator.next("push-missing");
console.log("push-sixth", pushReceiver.join(","), pushSixth.done, pushSixth.value);
const pushDone: any = pushIterator.next();
console.log("push-done", pushReceiver.join(","), pushDone.done, pushDone.value);

const unshiftReceiver: any = ["unshift-first"];
const unshiftSpread: any = ["unshift-spread-one", "unshift-spread-two"];
const unshiftIterator = multiYieldUnshiftOptionalCallNestedYieldedCalleeAccessDeclarationInitializer();
const unshiftFirst: any = unshiftIterator.next();
console.log("unshift-first", unshiftReceiver.join(","), unshiftFirst.done, unshiftFirst.value);
const unshiftSecond: any = unshiftIterator.next(unshiftReceiver);
console.log("unshift-second", unshiftReceiver.join(","), unshiftSecond.done, unshiftSecond.value);
const unshiftThird: any = unshiftIterator.next(null);
console.log("unshift-third", unshiftReceiver.join(","), unshiftThird.done, unshiftThird.value);
const unshiftFourth: any = unshiftIterator.next("unshift-direct");
console.log("unshift-fourth", unshiftReceiver.join(","), unshiftFourth.done, unshiftFourth.value);
const unshiftFifth: any = unshiftIterator.next(unshiftSpread);
console.log("unshift-fifth", unshiftReceiver.join(","), unshiftFifth.done, unshiftFifth.value);
const unshiftSixth: any = unshiftIterator.next("unshift-missing");
console.log("unshift-sixth", unshiftReceiver.join(","), unshiftSixth.done, unshiftSixth.value);
const unshiftDone: any = unshiftIterator.next();
console.log("unshift-done", unshiftReceiver.join(","), unshiftDone.done, unshiftDone.value);
