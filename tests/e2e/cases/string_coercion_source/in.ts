let body="17;";
const owner:any={109(){},constructor(){body=String(Math.random());}};
owner[String(Math.floor(Math.random())+109)]();
console.log(eval(body));
const symbol=Symbol("17");
let joinedBody="17;";
for(const value of [symbol,{[Symbol.toPrimitive](){return symbol;}}]){
  try{String(value);}catch(error){joinedBody="41;";}
}
console.log(eval(joinedBody));
console.log("complete");
