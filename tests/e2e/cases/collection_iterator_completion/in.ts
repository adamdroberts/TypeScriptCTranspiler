const map = new Map<number, number>([[1, 2]]);
const iterator = map.entries();
const next = Object.getPrototypeOf(iterator).next;
const first = next.call(iterator);
console.log("yield:" + first.value[0] + ":" + first.value[1]);
console.log("pair:" + (Object.getPrototypeOf(first.value) === Array.prototype));
const finish = next.call(iterator);
console.log("finish:" + (finish.done && Object.getPrototypeOf(finish) === Object.prototype));
map.set(3, 4);
const completed = next.call(iterator);
console.log("completed:" + (completed.done && Object.getPrototypeOf(completed) === Object.prototype));
try {
    next.call({});
} catch (error) {
    console.log("error:" + (error instanceof TypeError));
}
console.log("restored:" + (Object.getPrototypeOf({}) === Object.prototype));
