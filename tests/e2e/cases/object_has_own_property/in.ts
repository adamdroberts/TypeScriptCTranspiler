const proto: any = { inherited: 1 };
const obj: any = Object.create(proto);
obj.own = 2;

console.log("own:", obj.hasOwnProperty("own"));
console.log("inherited:", obj.hasOwnProperty("inherited"));
console.log("missing:", obj.hasOwnProperty("missing"));
