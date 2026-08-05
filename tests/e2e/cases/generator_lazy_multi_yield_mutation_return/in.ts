const box: any = { value: 10, present: true };
const memberEvents: string[] = [];
const memberChild: any = { value: 30 };
const memberBox: any = {};
Object.defineProperty(memberBox, "child", {
    get: () => {
        memberEvents.push("getter");
        return memberChild;
    },
});
const computedMemberEvents: string[] = [];
const computedMemberChild: any = { value: 40 };
const computedMemberBox: any = {};
Object.defineProperty(computedMemberBox, "outer", {
    get: () => {
        computedMemberEvents.push("getter");
        return computedMemberChild;
    },
});

function* prefixReturn(): Generator<any, number, any> {
    return ++(yield box).value;
}

function* postfixReturn(): Generator<any, number, any> {
    return (yield box).value++;
}

function* deleteReturn(): Generator<any, boolean, any> {
    return delete (yield box).present;
}

function* keyedPrefixReturn(): Generator<any, number, any> {
    return ++(yield box)[yield "value"];
}

function* keyedDeleteReturn(): Generator<any, boolean, any> {
    return delete (yield box)[yield "present"];
}

function* intermediateMemberReturn(): Generator<any, number, any> {
    return ++(yield memberBox).child[(yield "value")];
}

function* intermediateComputedMemberReturn(): Generator<any, number, any> {
    return ++(yield computedMemberBox)[(yield "outer")][(yield "value")];
}

const prefixIterator = prefixReturn();
const prefixFirst: any = prefixIterator.next();
console.log("prefix-before", box.value, prefixFirst.done, prefixFirst.value.value);
const prefixDone: any = prefixIterator.next(box);
console.log("prefix-done", box.value, prefixDone.done, prefixDone.value);

const postfixIterator = postfixReturn();
const postfixFirst: any = postfixIterator.next();
console.log("postfix-before", box.value, postfixFirst.done, postfixFirst.value.value);
const postfixDone: any = postfixIterator.next(box);
console.log("postfix-done", box.value, postfixDone.done, postfixDone.value);

const deleteIterator = deleteReturn();
const deleteFirst: any = deleteIterator.next();
console.log("delete-before", box.present, deleteFirst.done, deleteFirst.value.present);
const deleteDone: any = deleteIterator.next(box);
console.log("delete-done", box.present === undefined, deleteDone.done, deleteDone.value);

const keyedPrefixIterator = keyedPrefixReturn();
const keyedPrefixFirst: any = keyedPrefixIterator.next();
console.log("keyed-prefix-before", box.value, keyedPrefixFirst.done, keyedPrefixFirst.value.value);
const keyedPrefixSecond: any = keyedPrefixIterator.next(box);
console.log("keyed-prefix-middle", box.value, keyedPrefixSecond.done, keyedPrefixSecond.value);
const keyedPrefixDone: any = keyedPrefixIterator.next("value");
console.log("keyed-prefix-done", box.value, keyedPrefixDone.done, keyedPrefixDone.value);

box.present = true;
const keyedDeleteIterator = keyedDeleteReturn();
const keyedDeleteFirst: any = keyedDeleteIterator.next();
console.log("keyed-delete-before", box.present, keyedDeleteFirst.done, keyedDeleteFirst.value.present);
const keyedDeleteSecond: any = keyedDeleteIterator.next(box);
console.log("keyed-delete-middle", box.present, keyedDeleteSecond.done, keyedDeleteSecond.value);
const keyedDeleteDone: any = keyedDeleteIterator.next("present");
console.log("keyed-delete-done", box.present === undefined, keyedDeleteDone.done, keyedDeleteDone.value);

const intermediateMemberIterator = intermediateMemberReturn();
const intermediateMemberFirst: any = intermediateMemberIterator.next();
console.log("member-before", memberChild.value, intermediateMemberFirst.done, intermediateMemberFirst.value === memberBox);
const intermediateMemberSecond: any = intermediateMemberIterator.next(memberBox);
console.log("member-middle", memberEvents.join(","), intermediateMemberSecond.done, intermediateMemberSecond.value);
const intermediateMemberDone: any = intermediateMemberIterator.next("value");
console.log("member-done", memberEvents.join(","), memberChild.value, intermediateMemberDone.done, intermediateMemberDone.value);

const intermediateComputedMemberIterator = intermediateComputedMemberReturn();
const intermediateComputedMemberFirst: any = intermediateComputedMemberIterator.next();
const intermediateComputedMemberSecond: any = intermediateComputedMemberIterator.next(computedMemberBox);
const intermediateComputedMemberThird: any = intermediateComputedMemberIterator.next("outer");
const intermediateComputedMemberDone: any = intermediateComputedMemberIterator.next("value");
console.log("computed-member", intermediateComputedMemberFirst.done, intermediateComputedMemberFirst.value === computedMemberBox, intermediateComputedMemberSecond.done, intermediateComputedMemberSecond.value, intermediateComputedMemberThird.done, intermediateComputedMemberThird.value, intermediateComputedMemberDone.done, intermediateComputedMemberDone.value, computedMemberEvents.join(","), computedMemberChild.value);
