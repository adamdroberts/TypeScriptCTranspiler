let n = 2;
n **= 5;
console.log("num:", n);

let b = 3n;
b **= 4n;
console.log("big:", b.toString());

let v: any = 4;
v **= 3;
console.log("dyn:", v);
