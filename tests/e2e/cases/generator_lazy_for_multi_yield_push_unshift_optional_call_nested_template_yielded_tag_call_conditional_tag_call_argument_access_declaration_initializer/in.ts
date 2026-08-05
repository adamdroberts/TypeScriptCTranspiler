const pushTagEvents: any[] = [];
const unshiftTagEvents: any[] = [];

function pushConditionalTagCallOuter(strings: TemplateStringsArray, value: any): any {
    return "push-outer-" + strings[0] + value + strings[1];
}

function unshiftConditionalTagCallOuter(strings: TemplateStringsArray, value: any): any {
    return "unshift-outer-" + strings[0] + value + strings[1];
}

function getPushConditionalTagCallOuter(seed: any): any {
    pushTagEvents.push("outer-" + seed);
    return pushConditionalTagCallOuter;
}

function getUnshiftConditionalTagCallOuter(seed: any): any {
    unshiftTagEvents.push("outer-" + seed);
    return unshiftConditionalTagCallOuter;
}

function pushConditionalTagCallArm(strings: TemplateStringsArray, value: any): any {
    return "push-arm-" + strings[0] + value + strings[1];
}

function unshiftConditionalTagCallArm(strings: TemplateStringsArray, value: any): any {
    return "unshift-arm-" + strings[0] + value + strings[1];
}

function getPushConditionalTagCallArm(seed: any): any {
    pushTagEvents.push("arm-" + seed);
    return pushConditionalTagCallArm;
}

function getUnshiftConditionalTagCallArm(seed: any): any {
    unshiftTagEvents.push("arm-" + seed);
    return unshiftConditionalTagCallArm;
}

function pushConditionalTagCallCallback(value: any): any {
    return "push-tagged-" + value;
}

function unshiftConditionalTagCallCallback(value: any): any {
    return "unshift-tagged-" + value;
}

function* multiYieldPushConditionalTagCallArgumentAccessDeclarationInitializer(): Generator<string, string, any> {
    for (
        let value: any = (yield "push-receiver").push(
            pushConditionalTagCallCallback?.(`push-${getPushConditionalTagCallOuter(
                (yield "push-selector")
                    ? getPushConditionalTagCallArm((yield "push-arm-seed"))`arm-${yield "push-arm-value"}`
                    : "push-fallback"
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

function* multiYieldUnshiftConditionalTagCallArgumentAccessDeclarationInitializer(): Generator<string, string, any> {
    for (
        let value: any = (yield "unshift-receiver").unshift(
            unshiftConditionalTagCallCallback?.(String.raw`unshift-${getUnshiftConditionalTagCallOuter(
                (yield "unshift-selector")
                    ? getUnshiftConditionalTagCallArm((yield "unshift-arm-seed"))`arm-${yield "unshift-arm-value"}`
                    : "unshift-fallback"
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

const pushReceiver: any = ["push-first"];
const pushIterator = multiYieldPushConditionalTagCallArgumentAccessDeclarationInitializer();
const pushFirst: any = pushIterator.next();
console.log("push-first", pushTagEvents.join(","), pushReceiver.join(","), pushFirst.done, pushFirst.value);
const pushSecond: any = pushIterator.next(pushReceiver);
console.log("push-second", pushTagEvents.join(","), pushReceiver.join(","), pushSecond.done, pushSecond.value);
const pushThird: any = pushIterator.next(true);
console.log("push-third", pushTagEvents.join(","), pushReceiver.join(","), pushThird.done, pushThird.value);
const pushFourth: any = pushIterator.next("push-arm-seed-value");
console.log("push-fourth", pushTagEvents.join(","), pushReceiver.join(","), pushFourth.done, pushFourth.value);
const pushFifth: any = pushIterator.next("push-arm-value");
console.log("push-fifth", pushTagEvents.join(","), pushReceiver.join(","), pushFifth.done, pushFifth.value);
const pushSixth: any = pushIterator.next("push-inner-value");
console.log("push-sixth", pushTagEvents.join(","), pushReceiver.join(","), pushSixth.done, pushSixth.value);
const pushSeventh: any = pushIterator.next("push-outer-value");
console.log("push-seventh", pushTagEvents.join(","), pushReceiver.join(","), pushSeventh.done, pushSeventh.value);
const pushEighth: any = pushIterator.next("push-item-value");
console.log("push-eighth", pushTagEvents.join(","), pushReceiver.join(","), pushEighth.done, pushEighth.value);
const pushNinth: any = pushIterator.next("push-key-value");
console.log("push-ninth", pushTagEvents.join(","), pushReceiver.join(","), pushNinth.done, pushNinth.value);
const pushDone: any = pushIterator.next();
console.log("push-done", pushTagEvents.join(","), pushReceiver.join(","), pushDone.done, pushDone.value);

const unshiftReceiver: any = ["unshift-first"];
const unshiftIterator = multiYieldUnshiftConditionalTagCallArgumentAccessDeclarationInitializer();
const unshiftFirst: any = unshiftIterator.next();
console.log("unshift-first", unshiftTagEvents.join(","), unshiftReceiver.join(","), unshiftFirst.done, unshiftFirst.value);
const unshiftSecond: any = unshiftIterator.next(unshiftReceiver);
console.log("unshift-second", unshiftTagEvents.join(","), unshiftReceiver.join(","), unshiftSecond.done, unshiftSecond.value);
const unshiftThird: any = unshiftIterator.next(true);
console.log("unshift-third", unshiftTagEvents.join(","), unshiftReceiver.join(","), unshiftThird.done, unshiftThird.value);
const unshiftFourth: any = unshiftIterator.next("unshift-arm-seed-value");
console.log("unshift-fourth", unshiftTagEvents.join(","), unshiftReceiver.join(","), unshiftFourth.done, unshiftFourth.value);
const unshiftFifth: any = unshiftIterator.next("unshift-arm-value");
console.log("unshift-fifth", unshiftTagEvents.join(","), unshiftReceiver.join(","), unshiftFifth.done, unshiftFifth.value);
const unshiftSixth: any = unshiftIterator.next("unshift-inner-value");
console.log("unshift-sixth", unshiftTagEvents.join(","), unshiftReceiver.join(","), unshiftSixth.done, unshiftSixth.value);
const unshiftSeventh: any = unshiftIterator.next("unshift-outer-value");
console.log("unshift-seventh", unshiftTagEvents.join(","), unshiftReceiver.join(","), unshiftSeventh.done, unshiftSeventh.value);
const unshiftEighth: any = unshiftIterator.next("unshift-item-value");
console.log("unshift-eighth", unshiftTagEvents.join(","), unshiftReceiver.join(","), unshiftEighth.done, unshiftEighth.value);
const unshiftNinth: any = unshiftIterator.next("unshift-key-value");
console.log("unshift-ninth", unshiftTagEvents.join(","), unshiftReceiver.join(","), unshiftNinth.done, unshiftNinth.value);
const unshiftDone: any = unshiftIterator.next();
console.log("unshift-done", unshiftTagEvents.join(","), unshiftReceiver.join(","), unshiftDone.done, unshiftDone.value);
