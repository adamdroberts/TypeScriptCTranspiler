let total = 0;
const values: any = [1, 2, 3, 4];

values.forEach((x: any, i: number) => total = total + x + i);

console.log("total:", total);
console.log("some:", values.some((x: any) => x > 3));
console.log("every:", values.every((x: any) => x < 5));
console.log("find:", values.find((x: any) => x > 2));
console.log("findIndex:", values.findIndex((x: any) => x === 3));
console.log("missing:", values.find((x: any) => x > 9));
