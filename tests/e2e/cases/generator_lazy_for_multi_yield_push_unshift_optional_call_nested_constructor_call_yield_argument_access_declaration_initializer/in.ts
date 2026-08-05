function pushNestedConstructorInner(value: any): any {
    return "push-inner-" + value;
}

function unshiftNestedConstructorInner(value: any): any {
    return "unshift-inner-" + value;
}

let pushConstructed: any = "<empty>";
let unshiftConstructed: any = "<empty>";

class PushNestedConstructor {
    value: any;

    constructor(value: any) {
        this.value = value;
        pushConstructed = value;
    }

    toString(): string {
        return "push-ctor-" + this.value;
    }
}

class UnshiftNestedConstructor {
    value: any;

    constructor(value: any) {
        this.value = value;
        unshiftConstructed = value;
    }

    toString(): string {
        return "unshift-ctor-" + this.value;
    }
}

function* multiYieldPushNestedConstructorCallArgumentAccessDeclarationInitializer(): Generator<string, string, any> {
    for (
        let value: any = (yield "push-receiver").push(
            new PushNestedConstructor(pushNestedConstructorInner(yield "push-nested")),
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

function* multiYieldUnshiftNestedConstructorCallArgumentAccessDeclarationInitializer(): Generator<string, string, any> {
    for (
        let value: any = (yield "unshift-receiver").unshift(
            new UnshiftNestedConstructor(unshiftNestedConstructorInner?.(yield "unshift-nested")),
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
const pushIterator = multiYieldPushNestedConstructorCallArgumentAccessDeclarationInitializer();
const pushFirst: any = pushIterator.next();
console.log("push-first", pushReceiver.join(","), pushFirst.done, pushFirst.value);
const pushSecond: any = pushIterator.next(pushReceiver);
console.log("push-second", pushReceiver.join(","), pushSecond.done, pushSecond.value);
console.log("push-constructed-after-nested", pushConstructed);
const pushThird: any = pushIterator.next("push-nested-value");
console.log("push-third", pushReceiver.join(","), pushThird.done, pushThird.value);
const pushFourth: any = pushIterator.next("push-direct");
console.log("push-fourth", pushReceiver.join(","), pushFourth.done, pushFourth.value);
const pushFifth: any = pushIterator.next(pushSpread);
console.log("push-fifth", pushReceiver.join(","), pushFifth.done, pushFifth.value);
console.log("push-constructed-after-key", pushConstructed);
const pushSixth: any = pushIterator.next("push-missing");
console.log("push-sixth", pushReceiver.join(","), pushSixth.done, pushSixth.value);
const pushDone: any = pushIterator.next();
console.log("push-done", pushReceiver.join(","), pushDone.done, pushDone.value);

const unshiftReceiver: any = ["unshift-first"];
const unshiftSpread: any = ["unshift-spread-one", "unshift-spread-two"];
const unshiftIterator = multiYieldUnshiftNestedConstructorCallArgumentAccessDeclarationInitializer();
const unshiftFirst: any = unshiftIterator.next();
console.log("unshift-first", unshiftReceiver.join(","), unshiftFirst.done, unshiftFirst.value);
const unshiftSecond: any = unshiftIterator.next(unshiftReceiver);
console.log("unshift-second", unshiftReceiver.join(","), unshiftSecond.done, unshiftSecond.value);
console.log("unshift-constructed-after-nested", unshiftConstructed);
const unshiftThird: any = unshiftIterator.next("unshift-nested-value");
console.log("unshift-third", unshiftReceiver.join(","), unshiftThird.done, unshiftThird.value);
const unshiftFourth: any = unshiftIterator.next("unshift-direct");
console.log("unshift-fourth", unshiftReceiver.join(","), unshiftFourth.done, unshiftFourth.value);
const unshiftFifth: any = unshiftIterator.next(unshiftSpread);
console.log("unshift-fifth", unshiftReceiver.join(","), unshiftFifth.done, unshiftFifth.value);
console.log("unshift-constructed-after-key", unshiftConstructed);
const unshiftSixth: any = unshiftIterator.next("unshift-missing");
console.log("unshift-sixth", unshiftReceiver.join(","), unshiftSixth.done, unshiftSixth.value);
const unshiftDone: any = unshiftIterator.next();
console.log("unshift-done", unshiftReceiver.join(","), unshiftDone.done, unshiftDone.value);
