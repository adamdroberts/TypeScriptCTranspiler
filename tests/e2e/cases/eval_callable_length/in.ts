console.log(eval('var fn=function(first,second=0,...rest){};eval(String(fn.length));'));
console.log(eval('var bound=(function(first,second,...rest){}).bind(null,1);eval(String(bound.length));'));
const typed: any = function(this: object, first: number, second: number = 0): void {};
console.log(typed.length);
