console.log(eval('var [first,...rest]=[31,37,41];first+rest[0]+rest[1];'));
console.log(eval('var {value,...rest}={value:43,other:47};value+rest.other;'));
console.log(eval('function f(...[first,second]){return first+second;}f(53,59);'));
console.log(eval('try{throw [61,67,71];}catch([head,...tail]){head+tail[0]+tail[1];}'));
