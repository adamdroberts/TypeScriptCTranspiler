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
const callMemberChild: any = { value: 70 };
const callMemberBox: any = [callMemberChild];
const callChainChild: any = { value: 90 };
const callChainBox: any = [callChainChild];
const callArgumentChild: any = { value: 110 };
const callArgumentBox: any = [callArgumentChild];
const callSpreadChild: any = { value: 140 };
const callSpreadBox: any = [callSpreadChild];
const callSpreadInserted: any = { value: 150 };
const callSpreadItems: any = [callSpreadInserted];
const concatSpreadBase: any = { value: 180 };
const concatSpreadBox: any = [concatSpreadBase];
const concatSpreadInserted: any = { value: 190 };
const concatSpreadItems: any = [concatSpreadInserted];

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

function* intermediateCallMemberReturn(): Generator<any, number, any> {
    return ++(yield callMemberBox).pop()[(yield "value")];
}

function* intermediateCallChainReturn(): Generator<any, number, any> {
    return ++(yield callChainBox).splice(0, 1).pop()[(yield "value")];
}

function* intermediateCallArgumentReturn(): Generator<any, number, any> {
    return ++(yield callArgumentBox).splice(0, (yield "count")).pop()[(yield "value")];
}

function* intermediateCallSpreadReturn(): Generator<any, number, any> {
    return ++(yield callSpreadBox).splice(0, 1, ...(yield "items")).pop()[(yield "value")];
}

function* intermediateConcatSpreadReturn(): Generator<any, number, any> {
    return ++(yield concatSpreadBox).concat(...(yield "items")).pop()[(yield "value")];
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

const intermediateCallMemberIterator = intermediateCallMemberReturn();
const intermediateCallMemberFirst: any = intermediateCallMemberIterator.next();
const intermediateCallMemberSecond: any = intermediateCallMemberIterator.next(callMemberBox);
const intermediateCallMemberDone: any = intermediateCallMemberIterator.next("value");
console.log("call-member", intermediateCallMemberFirst.done, intermediateCallMemberFirst.value === callMemberBox, intermediateCallMemberSecond.done, intermediateCallMemberSecond.value, intermediateCallMemberDone.done, intermediateCallMemberDone.value, callMemberBox.length, callMemberChild.value);

const intermediateCallChainIterator = intermediateCallChainReturn();
const intermediateCallChainFirst: any = intermediateCallChainIterator.next();
const intermediateCallChainSecond: any = intermediateCallChainIterator.next(callChainBox);
const intermediateCallChainDone: any = intermediateCallChainIterator.next("value");
console.log("call-chain", intermediateCallChainFirst.done, intermediateCallChainFirst.value === callChainBox, intermediateCallChainSecond.done, intermediateCallChainSecond.value, intermediateCallChainDone.done, intermediateCallChainDone.value, callChainBox.length, callChainChild.value);

const intermediateCallArgumentIterator = intermediateCallArgumentReturn();
const intermediateCallArgumentFirst: any = intermediateCallArgumentIterator.next();
const intermediateCallArgumentSecond: any = intermediateCallArgumentIterator.next(callArgumentBox);
const intermediateCallArgumentThird: any = intermediateCallArgumentIterator.next(1);
const intermediateCallArgumentDone: any = intermediateCallArgumentIterator.next("value");
console.log("call-argument", intermediateCallArgumentFirst.done, intermediateCallArgumentFirst.value === callArgumentBox, intermediateCallArgumentSecond.done, intermediateCallArgumentSecond.value, intermediateCallArgumentThird.done, intermediateCallArgumentThird.value, intermediateCallArgumentDone.done, intermediateCallArgumentDone.value, callArgumentBox.length, callArgumentChild.value);

const intermediateCallSpreadIterator = intermediateCallSpreadReturn();
const intermediateCallSpreadFirst: any = intermediateCallSpreadIterator.next();
const intermediateCallSpreadSecond: any = intermediateCallSpreadIterator.next(callSpreadBox);
const intermediateCallSpreadThird: any = intermediateCallSpreadIterator.next(callSpreadItems);
const intermediateCallSpreadDone: any = intermediateCallSpreadIterator.next("value");
console.log("call-spread", intermediateCallSpreadFirst.done, intermediateCallSpreadFirst.value === callSpreadBox, intermediateCallSpreadSecond.done, intermediateCallSpreadSecond.value, intermediateCallSpreadThird.done, intermediateCallSpreadThird.value, intermediateCallSpreadDone.done, intermediateCallSpreadDone.value, callSpreadBox.length, callSpreadBox[0].value, callSpreadChild.value);

const intermediateConcatSpreadIterator = intermediateConcatSpreadReturn();
const intermediateConcatSpreadFirst: any = intermediateConcatSpreadIterator.next();
const intermediateConcatSpreadSecond: any = intermediateConcatSpreadIterator.next(concatSpreadBox);
const intermediateConcatSpreadThird: any = intermediateConcatSpreadIterator.next(concatSpreadItems);
const intermediateConcatSpreadDone: any = intermediateConcatSpreadIterator.next("value");
console.log("concat-spread", intermediateConcatSpreadFirst.done, intermediateConcatSpreadFirst.value === concatSpreadBox, intermediateConcatSpreadSecond.done, intermediateConcatSpreadSecond.value, intermediateConcatSpreadThird.done, intermediateConcatSpreadThird.value, intermediateConcatSpreadDone.done, intermediateConcatSpreadDone.value, concatSpreadBox.length, concatSpreadInserted.value);
