console.log(eval('var outer="outer";try{throw "31";}catch(outer){var outer="37";console.log(outer);}outer;'));
console.log(eval('try{throw {value:41};}catch({value}){(function(){var value=43;return value;})();}'));
console.log(eval('var x="outer",other="before";try{throw "caught";}catch(x){var {x,other}={x:"47",other:"53"};console.log(x+":"+other);}x+":"+other;'));
function local(): void {
    var x=11,y=13;
    try{throw 17;}catch(x){var [x,y]=[19,23];console.log(x,y);}
    console.log(x,y);
}
local();
