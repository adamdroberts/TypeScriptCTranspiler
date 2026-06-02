const arr: any = [1, 2];

arr[1] = 5;
arr[3] = 7;
arr[0] += 4;

console.log("arr:", arr.join(","), arr.length, arr[0], arr[2], arr[3]);

const inherited: any = Object.create(Object.getPrototypeOf(arr));
inherited[5] = "proto-five";
Object.setPrototypeOf(arr, inherited);
console.log("proto index:", arr[5], Reflect.has(arr, "5"), Object.prototype.hasOwnProperty.call(arr, "5"));
