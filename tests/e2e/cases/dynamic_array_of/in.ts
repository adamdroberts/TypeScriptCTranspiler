const values: any = Array.of<any>(1, "two", 3);

console.log("is array:", Array.isArray(values));
console.log("join:", values.join("|"));
values.push("four");
console.log("after:", values.join(","));
