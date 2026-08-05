const pushEvents: any[] = [];
const unshiftEvents: any[] = [];

function pushOuter(strings: TemplateStringsArray, value: any): any {
    return "push-outer-" + strings[0] + value + strings[1];
}

function unshiftOuter(strings: TemplateStringsArray, value: any): any {
    return "unshift-outer-" + strings[0] + value + strings[1];
}

function pushArm(strings: TemplateStringsArray, value: any): any {
    return "push-arm-" + strings[0] + value + strings[1];
}

function unshiftArm(strings: TemplateStringsArray, value: any): any {
    return "unshift-arm-" + strings[0] + value + strings[1];
}

function pushNested(strings: TemplateStringsArray, callValue: any, value: any): any {
    pushEvents.push("nested-" + callValue + "-" + value);
    return "push-nested-" + strings[0] + callValue + strings[1] + value + strings[2];
}

function unshiftNested(strings: TemplateStringsArray, callValue: any, value: any): any {
    unshiftEvents.push("nested-" + callValue + "-" + value);
    return "unshift-nested-" + strings[0] + callValue + strings[1] + value + strings[2];
}

function getPushOuter(seed: any): any {
    pushEvents.push("outer-" + seed);
    return pushOuter;
}

function getUnshiftOuter(seed: any): any {
    unshiftEvents.push("outer-" + seed);
    return unshiftOuter;
}

function getPushArm(seed: any): any {
    pushEvents.push("arm-" + seed);
    return pushArm;
}

function getUnshiftArm(seed: any): any {
    unshiftEvents.push("arm-" + seed);
    return unshiftArm;
}

function pushArmCall(value: any): any {
    pushEvents.push("call-" + value);
    return "push-call-result-" + value;
}

function unshiftArmCall(value: any): any {
    unshiftEvents.push("call-" + value);
    return "unshift-call-result-" + value;
}

function invokePushNested(callValue: any, value: any): any {
    return pushNested`nested-${callValue}-${value}`;
}

function invokeUnshiftNested(callValue: any, value: any): any {
    return unshiftNested`nested-${callValue}-${value}`;
}

function pushCallback(value: any): any {
    return "push-callback-" + value;
}

function unshiftCallback(value: any): any {
    return "unshift-callback-" + value;
}

function* pushNestedCallTagCallArms(): Generator<string, string, any> {
    for (
        let value: any = (yield "push-receiver").push(
            pushCallback?.(`push-${getPushOuter(
                (yield "push-selector")
                    ? getPushArm(invokePushNested(pushArmCall?.(yield "push-call-argument"), yield "push-nested-value"))`arm-${yield "push-arm-value"}`
                    : getPushArm("push-fallback")`arm-${yield "push-fallback-arm-value"}`
            )`inner-${yield "push-inner"}`}-${yield "push-outer"}`),
            yield "push-item"
        )[yield "push-key"],
        count = 0;
        count < 1;
        count++
    ) {
        yield "push-body-" + typeof value;
    }
    return "push-done";
}

function* unshiftNestedCallTagCallArms(): Generator<string, string, any> {
    for (
        let value: any = (yield "unshift-receiver").unshift(
            unshiftCallback?.(String.raw`unshift-${getUnshiftOuter(
                (yield "unshift-selector")
                    ? getUnshiftArm("unshift-fallback")`arm-${yield "unshift-fallback-arm-value"}`
                    : getUnshiftArm(invokeUnshiftNested(unshiftArmCall?.(yield "unshift-call-argument"), yield "unshift-nested-value"))`arm-${yield "unshift-arm-value"}`
            )`inner-${yield "unshift-inner"}`}-${yield "unshift-outer"}`),
            yield "unshift-item"
        )[yield "unshift-key"],
        count = 0;
        count < 1;
        count++
    ) {
        yield "unshift-body-" + typeof value;
    }
    return "unshift-done";
}

const pushReceiver: any[] = ["push-first"];
const pushIterator = pushNestedCallTagCallArms();
const pushFirst: any = pushIterator.next();
console.log("push-first", pushEvents.join(","), pushReceiver.join(","), pushFirst.done, pushFirst.value);
const pushSecond: any = pushIterator.next(pushReceiver);
console.log("push-second", pushEvents.join(","), pushReceiver.join(","), pushSecond.done, pushSecond.value);
const pushThird: any = pushIterator.next(true);
console.log("push-third", pushEvents.join(","), pushReceiver.join(","), pushThird.done, pushThird.value);
const pushFourth: any = pushIterator.next("push-call-value");
console.log("push-fourth", pushEvents.join(","), pushReceiver.join(","), pushFourth.done, pushFourth.value);
const pushFifth: any = pushIterator.next("push-nested-value");
console.log("push-fifth", pushEvents.join(","), pushReceiver.join(","), pushFifth.done, pushFifth.value);
const pushSixth: any = pushIterator.next("push-arm-value");
console.log("push-sixth", pushEvents.join(","), pushReceiver.join(","), pushSixth.done, pushSixth.value);
const pushSeventh: any = pushIterator.next("push-inner-value");
console.log("push-seventh", pushEvents.join(","), pushReceiver.join(","), pushSeventh.done, pushSeventh.value);
const pushEighth: any = pushIterator.next("push-outer-value");
console.log("push-eighth", pushEvents.join(","), pushReceiver.join(","), pushEighth.done, pushEighth.value);
const pushNinth: any = pushIterator.next("push-item-value");
console.log("push-ninth", pushEvents.join(","), pushReceiver.join(","), pushNinth.done, pushNinth.value);
const pushTenth: any = pushIterator.next("push-key-value");
console.log("push-tenth", pushEvents.join(","), pushReceiver.join(","), pushTenth.done, pushTenth.value);
const pushDone: any = pushIterator.next();
console.log("push-done", pushEvents.join(","), pushReceiver.join(","), pushDone.done, pushDone.value);

const unshiftReceiver: any[] = ["unshift-first"];
const unshiftIterator = unshiftNestedCallTagCallArms();
const unshiftFirst: any = unshiftIterator.next();
console.log("unshift-first", unshiftEvents.join(","), unshiftReceiver.join(","), unshiftFirst.done, unshiftFirst.value);
const unshiftSecond: any = unshiftIterator.next(unshiftReceiver);
console.log("unshift-second", unshiftEvents.join(","), unshiftReceiver.join(","), unshiftSecond.done, unshiftSecond.value);
const unshiftThird: any = unshiftIterator.next(false);
console.log("unshift-third", unshiftEvents.join(","), unshiftReceiver.join(","), unshiftThird.done, unshiftThird.value);
const unshiftFourth: any = unshiftIterator.next("unshift-call-value");
console.log("unshift-fourth", unshiftEvents.join(","), unshiftReceiver.join(","), unshiftFourth.done, unshiftFourth.value);
const unshiftFifth: any = unshiftIterator.next("unshift-nested-value");
console.log("unshift-fifth", unshiftEvents.join(","), unshiftReceiver.join(","), unshiftFifth.done, unshiftFifth.value);
const unshiftSixth: any = unshiftIterator.next("unshift-arm-value");
console.log("unshift-sixth", unshiftEvents.join(","), unshiftReceiver.join(","), unshiftSixth.done, unshiftSixth.value);
const unshiftSeventh: any = unshiftIterator.next("unshift-inner-value");
console.log("unshift-seventh", unshiftEvents.join(","), unshiftReceiver.join(","), unshiftSeventh.done, unshiftSeventh.value);
const unshiftEighth: any = unshiftIterator.next("unshift-outer-value");
console.log("unshift-eighth", unshiftEvents.join(","), unshiftReceiver.join(","), unshiftEighth.done, unshiftEighth.value);
const unshiftNinth: any = unshiftIterator.next("unshift-item-value");
console.log("unshift-ninth", unshiftEvents.join(","), unshiftReceiver.join(","), unshiftNinth.done, unshiftNinth.value);
const unshiftTenth: any = unshiftIterator.next("unshift-key-value");
console.log("unshift-tenth", unshiftEvents.join(","), unshiftReceiver.join(","), unshiftTenth.done, unshiftTenth.value);
const unshiftDone: any = unshiftIterator.next();
console.log("unshift-done", unshiftEvents.join(","), unshiftReceiver.join(","), unshiftDone.done, unshiftDone.value);
