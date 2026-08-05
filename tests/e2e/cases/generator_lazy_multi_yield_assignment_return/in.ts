let assigned = 0;
const box: any = { value: 1 };
const nestedRhsBox: any = { value: 1 };
const spreadRhsEvents: string[] = [];
const spreadRhsBox: any = { value: null };
const spreadRhsItems: any = [5, 6];
Object.defineProperty(spreadRhsItems, "0", {
    get: () => {
        spreadRhsEvents.push("spread");
        return 5;
    },
});
const computedKeyEvents: string[] = [];
const computedKeyBox: any = { value: null };
function formatComputedKey(value: any): string {
    computedKeyEvents.push("key");
    return String(value);
}

function* directAssignmentReturn(): Generator<number, number, number> {
    return (assigned = yield 7) + (yield 8);
}

function* compoundAssignmentReturn(): Generator<number, number, number> {
    return (box.value += yield 8) + (yield 9);
}

function* computedAssignmentReturn(): Generator<any, number, any> {
    return (yield box)[yield "value"] += yield 2;
}

function* nestedRhsAssignmentReturn(): Generator<any, number, any> {
    return (yield nestedRhsBox)[yield "value"] = (yield "rhs-left") + (yield "rhs-right");
}

function* spreadRhsAssignmentReturn(): Generator<any, any, any> {
    return (yield "spread-rhs-receiver")[yield "spread-rhs-key"] = {
        items: [yield "spread-rhs-array", ...(yield "spread-rhs-items")],
        after: yield "spread-rhs-after",
    };
}

function* computedKeyAssignmentReturn(): Generator<any, any, any> {
    return (yield "computed-key-receiver")[yield "computed-key-slot"] = {
        [formatComputedKey(yield "computed-key-name")]: yield "computed-key-value",
        after: yield "computed-key-after",
    };
}

const directIterator = directAssignmentReturn();
const directFirst: any = directIterator.next();
console.log("direct-before", assigned, directFirst.done, directFirst.value);
const directSecond: any = directIterator.next(4);
console.log("direct-middle", assigned, directSecond.done, directSecond.value);
const directDone: any = directIterator.next(5);
console.log("direct-done", assigned, directDone.done, directDone.value);

const compoundIterator = compoundAssignmentReturn();
const compoundFirst: any = compoundIterator.next();
console.log("compound-before", box.value, compoundFirst.done, compoundFirst.value);
const compoundSecond: any = compoundIterator.next(4);
console.log("compound-middle", box.value, compoundSecond.done, compoundSecond.value);
const compoundDone: any = compoundIterator.next(6);
console.log("compound-done", box.value, compoundDone.done, compoundDone.value);

const computedIterator = computedAssignmentReturn();
const computedFirst: any = computedIterator.next();
console.log("computed-before", box.value, computedFirst.done, computedFirst.value.value);
const computedSecond: any = computedIterator.next(box);
console.log("computed-middle-key", box.value, computedSecond.done, computedSecond.value);
const computedThird: any = computedIterator.next("value");
console.log("computed-middle-rhs", box.value, computedThird.done, computedThird.value);
const computedDone: any = computedIterator.next(3);
console.log("computed-done", box.value, computedDone.done, computedDone.value);

const nestedRhsIterator = nestedRhsAssignmentReturn();
const nestedRhsFirst: any = nestedRhsIterator.next();
console.log("nested-rhs-before", nestedRhsBox.value, nestedRhsFirst.done, nestedRhsFirst.value.value);
const nestedRhsSecond: any = nestedRhsIterator.next(nestedRhsBox);
console.log("nested-rhs-key", nestedRhsBox.value, nestedRhsSecond.done, nestedRhsSecond.value);
const nestedRhsThird: any = nestedRhsIterator.next("value");
console.log("nested-rhs-left", nestedRhsBox.value, nestedRhsThird.done, nestedRhsThird.value);
const nestedRhsFourth: any = nestedRhsIterator.next(4);
console.log("nested-rhs-right", nestedRhsBox.value, nestedRhsFourth.done, nestedRhsFourth.value);
const nestedRhsDone: any = nestedRhsIterator.next(5);
console.log("nested-rhs-done", nestedRhsBox.value, nestedRhsDone.done, nestedRhsDone.value);

const spreadRhsIterator = spreadRhsAssignmentReturn();
const spreadRhsFirst: any = spreadRhsIterator.next();
console.log("spread-rhs-before", spreadRhsFirst.done, spreadRhsFirst.value);
const spreadRhsSecond: any = spreadRhsIterator.next(spreadRhsBox);
console.log("spread-rhs-key", spreadRhsSecond.done, spreadRhsSecond.value);
const spreadRhsThird: any = spreadRhsIterator.next("value");
console.log("spread-rhs-array", spreadRhsThird.done, spreadRhsThird.value);
const spreadRhsFourth: any = spreadRhsIterator.next(4);
console.log("spread-rhs-items", spreadRhsFourth.done, spreadRhsFourth.value);
const spreadRhsFifth: any = spreadRhsIterator.next(spreadRhsItems);
console.log("spread-rhs-after", spreadRhsEvents.join(","), spreadRhsFifth.done, spreadRhsFifth.value);
const spreadRhsDone: any = spreadRhsIterator.next("spread-rhs-after");
console.log("spread-rhs-done", spreadRhsDone.done, spreadRhsDone.value, spreadRhsBox.value.items.length, spreadRhsBox.value.items[0], spreadRhsBox.value.items[2], spreadRhsBox.value.after);

const computedKeyIterator = computedKeyAssignmentReturn();
const computedKeyFirst: any = computedKeyIterator.next();
console.log("computed-key-before", computedKeyFirst.done, computedKeyFirst.value);
const computedKeySecond: any = computedKeyIterator.next(computedKeyBox);
console.log("computed-key-slot", computedKeySecond.done, computedKeySecond.value);
const computedKeyThird: any = computedKeyIterator.next("value");
console.log("computed-key-name", computedKeyThird.done, computedKeyThird.value);
const computedKeyFourth: any = computedKeyIterator.next("name");
console.log("computed-key-value", computedKeyEvents.join(","), computedKeyFourth.done, computedKeyFourth.value);
const computedKeyFifth: any = computedKeyIterator.next(4);
console.log("computed-key-after", computedKeyEvents.join(","), computedKeyFifth.done, computedKeyFifth.value);
const computedKeyDone: any = computedKeyIterator.next("after");
console.log("computed-key-done", computedKeyDone.done, computedKeyDone.value, computedKeyBox.value.name, computedKeyBox.value.after);
