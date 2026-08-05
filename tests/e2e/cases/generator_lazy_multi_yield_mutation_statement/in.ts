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
