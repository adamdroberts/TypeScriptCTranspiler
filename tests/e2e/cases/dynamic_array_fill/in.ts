const values: any = [1, 2, 3, 4];

values.fill("x", 1, 3);
console.log(values.join("|"));

const nullEnd: any = [1, 2, 3, 4];
nullEnd.fill("z", 1, null);
console.log(nullEnd.join("|"));
