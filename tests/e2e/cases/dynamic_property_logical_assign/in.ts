let calls = 0;

function mark(value: number): number {
    calls++;
    return value;
}

const obj: any = { a: 0, b: 2, c: null, d: 3 };

obj.a ||= mark(5);
obj.b ||= mark(9);
obj.b &&= mark(4);
obj.c ??= mark(7);
obj.d **= 3;

console.log("props:", obj.a, obj.b, obj.c, obj.d, calls);

const arr: any = [0, 2, null];
arr[0] ||= mark(11);
arr[1] &&= mark(13);
arr[2] ??= mark(17);
arr[1] **= 2;

console.log("array:", arr[0], arr[1], arr[2], calls);
