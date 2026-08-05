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
