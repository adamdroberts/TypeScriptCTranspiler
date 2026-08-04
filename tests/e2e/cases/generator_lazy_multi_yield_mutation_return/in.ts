const box: any = { value: 10, present: true };

function* prefixReturn(): Generator<any, number, any> {
    return ++(yield box).value;
}

function* postfixReturn(): Generator<any, number, any> {
    return (yield box).value++;
}

function* deleteReturn(): Generator<any, boolean, any> {
    return delete (yield box).present;
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
