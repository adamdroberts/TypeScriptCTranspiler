let pushConstructorLabel: any = "push-before";
let unshiftConstructorLabel: any = "unshift-before";
let constructions = 0;

class Token {
    label: string;

    constructor(label: string) {
        constructions++;
        this.label = label;
    }
}

function* multiYieldPushConstructorArgumentAccessDeclarationInitializer(): Generator<string, string, any> {
    for (
        let value: any = (yield "push-receiver").push(
            new Token(pushConstructorLabel),
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

function* multiYieldUnshiftConstructorArgumentAccessDeclarationInitializer(): Generator<string, string, any> {
    for (
        let value: any = (yield "unshift-receiver").unshift(
            new Token(unshiftConstructorLabel),
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
const pushIterator = multiYieldPushConstructorArgumentAccessDeclarationInitializer();
const pushFirst: any = pushIterator.next();
console.log("push-first", pushReceiver.length, pushFirst.done, pushFirst.value, constructions);
const pushSecond: any = pushIterator.next(pushReceiver);
console.log("push-second", pushReceiver.length, pushSecond.done, pushSecond.value, constructions);
pushConstructorLabel = "push-after";
const pushThird: any = pushIterator.next("push-direct");
console.log("push-third", pushReceiver.length, pushThird.done, pushThird.value, constructions);
const pushFourth: any = pushIterator.next(pushSpread);
console.log("push-fourth", pushReceiver.length, pushReceiver[1] instanceof Token, pushFourth.done, pushFourth.value, constructions);
const pushFifth: any = pushIterator.next("push-missing");
console.log("push-fifth", pushReceiver.length, pushReceiver[1] instanceof Token, pushFifth.done, pushFifth.value, constructions);
const pushDone: any = pushIterator.next();
console.log("push-done", pushReceiver.length, pushReceiver[1] instanceof Token, pushDone.done, pushDone.value, constructions);

const unshiftReceiver: any = ["unshift-first"];
const unshiftSpread: any = ["unshift-spread-one", "unshift-spread-two"];
const unshiftIterator = multiYieldUnshiftConstructorArgumentAccessDeclarationInitializer();
const unshiftFirst: any = unshiftIterator.next();
console.log("unshift-first", unshiftReceiver.length, unshiftFirst.done, unshiftFirst.value, constructions);
const unshiftSecond: any = unshiftIterator.next(unshiftReceiver);
console.log("unshift-second", unshiftReceiver.length, unshiftSecond.done, unshiftSecond.value, constructions);
unshiftConstructorLabel = "unshift-after";
const unshiftThird: any = unshiftIterator.next("unshift-direct");
console.log("unshift-third", unshiftReceiver.length, unshiftThird.done, unshiftThird.value, constructions);
const unshiftFourth: any = unshiftIterator.next(unshiftSpread);
console.log("unshift-fourth", unshiftReceiver.length, unshiftReceiver[0] instanceof Token, unshiftFourth.done, unshiftFourth.value, constructions);
const unshiftFifth: any = unshiftIterator.next("unshift-missing");
console.log("unshift-fifth", unshiftReceiver.length, unshiftReceiver[0] instanceof Token, unshiftFifth.done, unshiftFifth.value, constructions);
const unshiftDone: any = unshiftIterator.next();
console.log("unshift-done", unshiftReceiver.length, unshiftReceiver[0] instanceof Token, unshiftDone.done, unshiftDone.value, constructions);
