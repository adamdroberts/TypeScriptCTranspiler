console.log(eval('var source="41;";with({source:"43;"}){eval(source);}'));
console.log(eval('var source="41;";with({source:"43;"}){source="47;";eval(source);}'));
console.log(eval('var method=function(){return "67;";};with({text:"71;",method:function(){return this.text;}}){var code=method();eval(code);}'));
console.log(eval('with({}){var invoke=function(eval){return eval({value:83});};invoke(function(value){return value.value;});}'));
console.log(eval('with({eval:globalThis.eval}){let eval=function(value){return value.value;};eval({value:89});}'));
