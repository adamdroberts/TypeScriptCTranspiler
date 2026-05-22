let body = "return 1;";
const make = new Function(body);
console.log(make());
