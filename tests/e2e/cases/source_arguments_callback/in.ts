console.log(eval('var run=function(value){var body="41;";value=()=>{body="47;";};Array.prototype.forEach.call(arguments,fn=>fn());return eval(body);};run(null);'));
console.log("mapped-callback-complete");
