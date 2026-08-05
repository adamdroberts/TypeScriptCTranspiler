let box: any = { value: 10, other: 3, child: { value: 20 } };

function* assignmentMutation(): Generator<string, string, any> {
    (yield "assign-receiver")[yield "assign-key"] = 42;
    return "assign-done";
}

function* assignmentWithYieldedRight(): Generator<string, string, any> {
    (yield "rhs-receiver")[yield "rhs-key"] = yield "rhs-value";
    return "rhs-done";
}

function* nestedMutation(): Generator<string, string, any> {
    (yield "nested-receiver")[(yield "nested-outer-key")][(yield "nested-inner-key")]++;
    return "nested-done";
}

function* postfixMutation(): Generator<string, string, any> {
    (yield "postfix-receiver")[yield "postfix-key"]++;
    return "postfix-done";
}

function* deleteMutation(): Generator<string, string, any> {
    delete (yield "delete-receiver")[yield "delete-key"];
    return "delete-done";
}

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
const stableComputedMemberEvents: string[] = [];
const stableComputedMemberChild: any = { value: 50 };
const stableComputedMemberBox: any = {};
Object.defineProperty(stableComputedMemberBox, "outer", {
    get: () => {
        stableComputedMemberEvents.push("getter");
        return stableComputedMemberChild;
    },
});
const callMemberChild: any = { value: 60 };
const callMemberBox: any = [callMemberChild];
const callChainChild: any = { value: 80 };
const callChainBox: any = [callChainChild];
const callArgumentChild: any = { value: 100 };
const callArgumentBox: any = [callArgumentChild];
const nestedRhsBox: any = { value: 1 };
const callSpreadChild: any = { value: 120 };
const callSpreadBox: any = [callSpreadChild];
const callSpreadInserted: any = { value: 130 };
const callSpreadItems: any = [callSpreadInserted];
const concatSpreadBase: any = { value: 160 };
const concatSpreadBox: any = [concatSpreadBase];
const concatSpreadInserted: any = { value: 170 };
const concatSpreadItems: any = [concatSpreadInserted];
const pushSpreadBox: any = [];
const pushSpreadFirst: any = { value: 200 };
const pushSpreadSecond: any = { value: 210 };
const pushSpreadItems: any = [pushSpreadFirst, pushSpreadSecond];
const callMethodSpreadEvents: string[] = [];
function callMethodSpreadTarget(this: any, value: any): any {
    callMethodSpreadEvents.push(value.value);
    return { value: 260 };
}
const callMethodSpreadFn: any = callMethodSpreadTarget as any;
const callMethodSpreadArg: any = { value: "call-arg" };
const callMethodSpreadItems: any = [callMethodSpreadArg];

function* memberBetweenYields(): Generator<string, string, any> {
    (yield "member-receiver").child[(yield "member-key")]++;
    return "member-done";
}

function* computedMemberBetweenYields(): Generator<string, string, any> {
    (yield "computed-member-receiver")[(yield "computed-member-outer-key")][(yield "computed-member-inner-key")]++;
    return "computed-member-done";
}

function* stableComputedMemberBetweenYields(): Generator<string, string, any> {
    (yield "stable-computed-member-receiver")["outer"][(yield "stable-computed-member-inner-key")]++;
    return "stable-computed-member-done";
}

function* callMemberBetweenYields(): Generator<string, string, any> {
    (yield "call-member-receiver").pop()[(yield "call-member-key")]++;
    return "call-member-done";
}

function* callChainBetweenYields(): Generator<string, string, any> {
    (yield "call-chain-receiver").splice(0, 1).pop()[(yield "call-chain-key")]++;
    return "call-chain-done";
}

function* callArgumentBetweenYields(): Generator<string, string, any> {
    (yield "call-argument-receiver").splice(0, (yield "call-argument-count")).pop()[(yield "call-argument-key")]++;
    return "call-argument-done";
}

function* callSpreadBetweenYields(): Generator<string, string, any> {
    (yield "call-spread-receiver").splice(0, 1, ...(yield "call-spread-items")).pop()[(yield "call-spread-key")]++;
    return "call-spread-done";
}

function* concatSpreadBetweenYields(): Generator<string, string, any> {
    (yield "concat-spread-receiver").concat(...(yield "concat-spread-items")).pop()[(yield "concat-spread-key")]++;
    return "concat-spread-done";
}

function* pushSpreadBetweenYields(): Generator<string, string, any> {
    (yield "push-spread-receiver").push(...(yield "push-spread-items"))[(yield "push-spread-key")]++;
    return "push-spread-done";
}

function* nestedRhsAssignmentBetweenYields(): Generator<string, string, any> {
    (yield "nested-rhs-receiver")[yield "nested-rhs-key"] = (yield "nested-rhs-left") + (yield "nested-rhs-right");
    return "nested-rhs-done";
}

function* callMethodSpreadBetweenYields(): Generator<string, string, any> {
    (yield "call-method-spread-receiver").call(null, ...(yield "call-method-spread-items"))[(yield "call-method-spread-key")]++;
    return "call-method-spread-done";
}

const assignment = assignmentMutation();
const assignmentFirst: any = assignment.next();
const assignmentSecond: any = assignment.next(box);
const assignmentDone: any = assignment.next("value");
console.log("assignment", assignmentFirst.done, assignmentFirst.value, assignmentSecond.done, assignmentSecond.value, assignmentDone.done, assignmentDone.value, box.value);

const rhsAssignment = assignmentWithYieldedRight();
const rhsFirst: any = rhsAssignment.next();
const rhsSecond: any = rhsAssignment.next(box);
const rhsThird: any = rhsAssignment.next("value");
const rhsDone: any = rhsAssignment.next(42);
console.log("assignment-rhs", rhsFirst.done, rhsFirst.value, rhsSecond.done, rhsSecond.value, rhsThird.done, rhsThird.value, rhsDone.done, rhsDone.value, box.value);

const nestedRhsAssignment = nestedRhsAssignmentBetweenYields();
const nestedRhsAssignmentFirst: any = nestedRhsAssignment.next();
const nestedRhsAssignmentSecond: any = nestedRhsAssignment.next(nestedRhsBox);
const nestedRhsAssignmentThird: any = nestedRhsAssignment.next("value");
const nestedRhsAssignmentFourth: any = nestedRhsAssignment.next(4);
const nestedRhsAssignmentDone: any = nestedRhsAssignment.next(5);
console.log("assignment-nested-rhs", nestedRhsAssignmentFirst.done, nestedRhsAssignmentFirst.value, nestedRhsAssignmentSecond.done, nestedRhsAssignmentSecond.value, nestedRhsAssignmentThird.done, nestedRhsAssignmentThird.value, nestedRhsAssignmentFourth.done, nestedRhsAssignmentFourth.value, nestedRhsAssignmentDone.done, nestedRhsAssignmentDone.value, nestedRhsBox.value);

const nested = nestedMutation();
const nestedFirst: any = nested.next();
const nestedSecond: any = nested.next(box);
const nestedThird: any = nested.next("child");
const nestedDone: any = nested.next("value");
console.log("nested", nestedFirst.done, nestedFirst.value, nestedSecond.done, nestedSecond.value, nestedThird.done, nestedThird.value, nestedDone.done, nestedDone.value, box.child.value);

box.value = 10;
const postfix = postfixMutation();
const postfixFirst: any = postfix.next();
const postfixSecond: any = postfix.next(box);
const postfixDone: any = postfix.next("value");
console.log("postfix", postfixFirst.done, postfixFirst.value, postfixSecond.done, postfixSecond.value, postfixDone.done, postfixDone.value, box.value);

box.other = 3;
const deletion = deleteMutation();
const deletionFirst: any = deletion.next();
const deletionSecond: any = deletion.next(box);
const deletionDone: any = deletion.next("other");
console.log("delete", deletionFirst.done, deletionFirst.value, deletionSecond.done, deletionSecond.value, deletionDone.done, deletionDone.value, Object.hasOwn(box, "other"));

const member = memberBetweenYields();
const memberFirst: any = member.next();
const memberSecond: any = member.next(memberBox);
const memberDone: any = member.next("value");
console.log("member", memberFirst.done, memberFirst.value, memberSecond.done, memberSecond.value, memberDone.done, memberDone.value, memberEvents.join(","), memberChild.value);

const computedMember = computedMemberBetweenYields();
const computedMemberFirst: any = computedMember.next();
const computedMemberSecond: any = computedMember.next(computedMemberBox);
const computedMemberThird: any = computedMember.next("outer");
const computedMemberDone: any = computedMember.next("value");
console.log("computed-member", computedMemberFirst.done, computedMemberFirst.value, computedMemberSecond.done, computedMemberSecond.value, computedMemberThird.done, computedMemberThird.value, computedMemberDone.done, computedMemberDone.value, computedMemberEvents.join(","), computedMemberChild.value);

const stableComputedMember = stableComputedMemberBetweenYields();
const stableComputedMemberFirst: any = stableComputedMember.next();
const stableComputedMemberSecond: any = stableComputedMember.next(stableComputedMemberBox);
const stableComputedMemberDone: any = stableComputedMember.next("value");
console.log("stable-computed-member", stableComputedMemberFirst.done, stableComputedMemberFirst.value, stableComputedMemberSecond.done, stableComputedMemberSecond.value, stableComputedMemberDone.done, stableComputedMemberDone.value, stableComputedMemberEvents.join(","), stableComputedMemberChild.value);

const callMember = callMemberBetweenYields();
const callMemberFirst: any = callMember.next();
const callMemberSecond: any = callMember.next(callMemberBox);
const callMemberDone: any = callMember.next("value");
console.log("call-member", callMemberFirst.done, callMemberFirst.value, callMemberSecond.done, callMemberSecond.value, callMemberDone.done, callMemberDone.value, callMemberBox.length, callMemberChild.value);

const callChain = callChainBetweenYields();
const callChainFirst: any = callChain.next();
const callChainSecond: any = callChain.next(callChainBox);
const callChainDone: any = callChain.next("value");
console.log("call-chain", callChainFirst.done, callChainFirst.value, callChainSecond.done, callChainSecond.value, callChainDone.done, callChainDone.value, callChainBox.length, callChainChild.value);

const callArgument = callArgumentBetweenYields();
const callArgumentFirst: any = callArgument.next();
const callArgumentSecond: any = callArgument.next(callArgumentBox);
const callArgumentThird: any = callArgument.next(1);
const callArgumentDone: any = callArgument.next("value");
console.log("call-argument", callArgumentFirst.done, callArgumentFirst.value, callArgumentSecond.done, callArgumentSecond.value, callArgumentThird.done, callArgumentThird.value, callArgumentDone.done, callArgumentDone.value, callArgumentBox.length, callArgumentChild.value);

const callSpread = callSpreadBetweenYields();
const callSpreadFirst: any = callSpread.next();
const callSpreadSecond: any = callSpread.next(callSpreadBox);
const callSpreadThird: any = callSpread.next(callSpreadItems);
const callSpreadDone: any = callSpread.next("value");
console.log("call-spread", callSpreadFirst.done, callSpreadFirst.value, callSpreadSecond.done, callSpreadSecond.value, callSpreadThird.done, callSpreadThird.value, callSpreadDone.done, callSpreadDone.value, callSpreadBox.length, callSpreadBox[0].value, callSpreadChild.value);

const concatSpread = concatSpreadBetweenYields();
const concatSpreadFirst: any = concatSpread.next();
const concatSpreadSecond: any = concatSpread.next(concatSpreadBox);
const concatSpreadThird: any = concatSpread.next(concatSpreadItems);
const concatSpreadDone: any = concatSpread.next("value");
console.log("concat-spread", concatSpreadFirst.done, concatSpreadFirst.value, concatSpreadSecond.done, concatSpreadSecond.value, concatSpreadThird.done, concatSpreadThird.value, concatSpreadDone.done, concatSpreadDone.value, concatSpreadBox.length, concatSpreadInserted.value);

const pushSpread = pushSpreadBetweenYields();
const pushSpreadIteratorFirst: any = pushSpread.next();
const pushSpreadIteratorSecond: any = pushSpread.next(pushSpreadBox);
const pushSpreadIteratorThird: any = pushSpread.next(pushSpreadItems);
const pushSpreadDone: any = pushSpread.next("value");
console.log("push-spread", pushSpreadIteratorFirst.done, pushSpreadIteratorFirst.value, pushSpreadIteratorSecond.done, pushSpreadIteratorSecond.value, pushSpreadIteratorThird.done, pushSpreadIteratorThird.value, pushSpreadDone.done, pushSpreadDone.value, pushSpreadBox.length, pushSpreadBox[0].value, pushSpreadBox[1].value);

const callMethodSpread = callMethodSpreadBetweenYields();
const callMethodSpreadFirst: any = callMethodSpread.next();
const callMethodSpreadSecond: any = callMethodSpread.next(callMethodSpreadFn);
const callMethodSpreadThird: any = callMethodSpread.next(callMethodSpreadItems);
const callMethodSpreadDone: any = callMethodSpread.next("value");
console.log("call-method-spread", callMethodSpreadFirst.done, callMethodSpreadFirst.value, callMethodSpreadSecond.done, callMethodSpreadSecond.value, callMethodSpreadThird.done, callMethodSpreadThird.value, callMethodSpreadDone.done, callMethodSpreadDone.value, callMethodSpreadEvents.join(","));
