console.log(eval('try{throw "31;";}catch(source){eval(source);}'));
console.log(eval('function fail(value){throw value;}try{fail("37;");}catch(source){eval(source);}'));
console.log(eval('var holder={get value(){throw "41;";}};try{holder.value;}catch(source){eval(source);}'));
console.log(eval('try{try{throw "43;";}catch(inner){throw inner;}}catch(source){eval(source);}'));
console.log(eval('try{throw {};}catch({value=47}){value;}'));
console.log(eval('var holder={get value(){throw "53;";}};try{try{throw holder;}catch({value}){}}catch(source){eval(source);}'));
console.log(eval('function key(){throw "59;";}try{({[key()](){}});}catch(source){eval(source);}'));
