let constructions = 0;

class Token {
    label: string;

    constructor(label: string) {
        constructions++;
        this.label = label;
    }
}

function pushNestedTokenCallback(token: Token): any {
    return "push-token-" + token.label;
}

function unshiftNestedTokenCallback(token: Token): any {
    return "unshift-token-" + token.label;
}

function* multiYieldPushOptionalCallNestedConstructorYieldArgumentAccessDeclarationInitializer(): Generator<string, string, any> {
    for (
        let value: any = (yield "push-receiver").push(
            pushNestedTokenCallback?.(new Token(yield "push-constructor")),
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

function* multiYieldUnshiftOptionalCallNestedConstructorYieldArgumentAccessDeclarationInitializer(): Generator<string, string, any> {
    for (
        let value: any = (yield "unshift-receiver").unshift(
            unshiftNestedTokenCallback?.(new Token(yield "unshift-constructor")),
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
const pushIterator = multiYieldPushOptionalCallNestedConstructorYieldArgumentAccessDeclarationInitializer();
const pushFirst: any = pushIterator.next();
console.log("push-first", pushReceiver.join(","), constructions, pushFirst.done, pushFirst.value);
const pushSecond: any = pushIterator.next(pushReceiver);
console.log("push-second", pushReceiver.join(","), constructions, pushSecond.done, pushSecond.value);
const pushThird: any = pushIterator.next("push-after");
console.log("push-third", pushReceiver.join(","), constructions, pushThird.done, pushThird.value);
const pushFourth: any = pushIterator.next("push-direct");
console.log("push-fourth", pushReceiver.join(","), constructions, pushFourth.done, pushFourth.value);
const pushFifth: any = pushIterator.next(pushSpread);
console.log("push-fifth", pushReceiver.join(","), constructions, pushFifth.done, pushFifth.value);
const pushSixth: any = pushIterator.next("push-missing");
console.log("push-sixth", pushReceiver.join(","), constructions, pushSixth.done, pushSixth.value);
const pushDone: any = pushIterator.next();
console.log("push-done", pushReceiver.join(","), constructions, pushDone.done, pushDone.value);

const unshiftReceiver: any = ["unshift-first"];
const unshiftSpread: any = ["unshift-spread-one", "unshift-spread-two"];
const unshiftIterator = multiYieldUnshiftOptionalCallNestedConstructorYieldArgumentAccessDeclarationInitializer();
const unshiftFirst: any = unshiftIterator.next();
console.log("unshift-first", unshiftReceiver.join(","), constructions, unshiftFirst.done, unshiftFirst.value);
const unshiftSecond: any = unshiftIterator.next(unshiftReceiver);
console.log("unshift-second", unshiftReceiver.join(","), constructions, unshiftSecond.done, unshiftSecond.value);
const unshiftThird: any = unshiftIterator.next("unshift-after");
console.log("unshift-third", unshiftReceiver.join(","), constructions, unshiftThird.done, unshiftThird.value);
const unshiftFourth: any = unshiftIterator.next("unshift-direct");
console.log("unshift-fourth", unshiftReceiver.join(","), constructions, unshiftFourth.done, unshiftFourth.value);
const unshiftFifth: any = unshiftIterator.next(unshiftSpread);
console.log("unshift-fifth", unshiftReceiver.join(","), constructions, unshiftFifth.done, unshiftFifth.value);
const unshiftSixth: any = unshiftIterator.next("unshift-missing");
console.log("unshift-sixth", unshiftReceiver.join(","), constructions, unshiftSixth.done, unshiftSixth.value);
const unshiftDone: any = unshiftIterator.next();
console.log("unshift-done", unshiftReceiver.join(","), constructions, unshiftDone.done, unshiftDone.value);
