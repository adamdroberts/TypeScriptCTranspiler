let pushTemplateConstructed: any = "<empty>";
let unshiftTemplateConstructed: any = "<empty>";

class PushTemplateConstructor {
    value: any;

    constructor(value: any) {
        this.value = value;
        pushTemplateConstructed = value;
    }

    toString(): string {
        return "push-ctor-" + this.value;
    }
}

class UnshiftTemplateConstructor {
    value: any;

    constructor(value: any) {
        this.value = value;
        unshiftTemplateConstructed = value;
    }

    toString(): string {
        return "unshift-ctor-" + this.value;
    }
}

function pushNestedTemplateConstructorCallback(value: any): any {
    return "push-template-constructor-" + value;
}

function unshiftNestedTemplateConstructorCallback(value: any): any {
    return "unshift-template-constructor-" + value;
}

function* multiYieldPushNestedTemplateConstructorArgumentAccessDeclarationInitializer(): Generator<string, string, any> {
    for (
        let value: any = (yield "push-receiver").push(
            pushNestedTemplateConstructorCallback?.(`push-${new PushTemplateConstructor(yield "push-constructor")}-${yield "push-tail"}`),
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

function* multiYieldUnshiftNestedTemplateConstructorArgumentAccessDeclarationInitializer(): Generator<string, string, any> {
    for (
        let value: any = (yield "unshift-receiver").unshift(
            unshiftNestedTemplateConstructorCallback?.(String.raw`unshift-${new UnshiftTemplateConstructor(yield "unshift-constructor")}-${yield "unshift-tail"}`),
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
const pushIterator = multiYieldPushNestedTemplateConstructorArgumentAccessDeclarationInitializer();
const pushFirst: any = pushIterator.next();
console.log("push-first", pushReceiver.join(","), pushTemplateConstructed, pushFirst.done, pushFirst.value);
const pushSecond: any = pushIterator.next(pushReceiver);
console.log("push-second", pushReceiver.join(","), pushTemplateConstructed, pushSecond.done, pushSecond.value);
const pushThird: any = pushIterator.next("push-constructor-value");
console.log("push-third", pushReceiver.join(","), pushTemplateConstructed, pushThird.done, pushThird.value);
const pushFourth: any = pushIterator.next("push-tail-value");
console.log("push-fourth", pushReceiver.join(","), pushTemplateConstructed, pushFourth.done, pushFourth.value);
const pushFifth: any = pushIterator.next("push-direct");
console.log("push-fifth", pushReceiver.join(","), pushTemplateConstructed, pushFifth.done, pushFifth.value);
const pushSixth: any = pushIterator.next(pushSpread);
console.log("push-sixth", pushReceiver.join(","), pushTemplateConstructed, pushSixth.done, pushSixth.value);
const pushSeventh: any = pushIterator.next("push-missing");
console.log("push-seventh", pushReceiver.join(","), pushTemplateConstructed, pushSeventh.done, pushSeventh.value);
const pushDone: any = pushIterator.next();
console.log("push-done", pushReceiver.join(","), pushTemplateConstructed, pushDone.done, pushDone.value);

const unshiftReceiver: any = ["unshift-first"];
const unshiftSpread: any = ["unshift-spread-one", "unshift-spread-two"];
const unshiftIterator = multiYieldUnshiftNestedTemplateConstructorArgumentAccessDeclarationInitializer();
const unshiftFirst: any = unshiftIterator.next();
console.log("unshift-first", unshiftReceiver.join(","), unshiftTemplateConstructed, unshiftFirst.done, unshiftFirst.value);
const unshiftSecond: any = unshiftIterator.next(unshiftReceiver);
console.log("unshift-second", unshiftReceiver.join(","), unshiftTemplateConstructed, unshiftSecond.done, unshiftSecond.value);
const unshiftThird: any = unshiftIterator.next("unshift-constructor-value");
console.log("unshift-third", unshiftReceiver.join(","), unshiftTemplateConstructed, unshiftThird.done, unshiftThird.value);
const unshiftFourth: any = unshiftIterator.next("unshift-tail-value");
console.log("unshift-fourth", unshiftReceiver.join(","), unshiftTemplateConstructed, unshiftFourth.done, unshiftFourth.value);
const unshiftFifth: any = unshiftIterator.next("unshift-direct");
console.log("unshift-fifth", unshiftReceiver.join(","), unshiftTemplateConstructed, unshiftFifth.done, unshiftFifth.value);
const unshiftSixth: any = unshiftIterator.next(unshiftSpread);
console.log("unshift-sixth", unshiftReceiver.join(","), unshiftTemplateConstructed, unshiftSixth.done, unshiftSixth.value);
const unshiftSeventh: any = unshiftIterator.next("unshift-missing");
console.log("unshift-seventh", unshiftReceiver.join(","), unshiftTemplateConstructed, unshiftSeventh.done, unshiftSeventh.value);
const unshiftDone: any = unshiftIterator.next();
console.log("unshift-done", unshiftReceiver.join(","), unshiftTemplateConstructed, unshiftDone.done, unshiftDone.value);
