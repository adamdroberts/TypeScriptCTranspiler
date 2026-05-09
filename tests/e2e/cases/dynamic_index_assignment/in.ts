const arr: any = [1, 2];

arr[1] = 5;
arr[3] = 7;
arr[0] += 4;

console.log("arr:", arr.join(","), arr.length, arr[0], arr[2], arr[3]);
