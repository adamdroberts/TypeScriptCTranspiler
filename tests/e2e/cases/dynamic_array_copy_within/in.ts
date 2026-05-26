const values: any = [1, 2, 3, 4, 5];

values.copyWithin(1, 3, 5);
console.log(values.join("|"));

const nullEnd: any = [1, 2, 3, 4];
nullEnd.copyWithin(1, 2, null);
console.log(nullEnd.join("|"));
