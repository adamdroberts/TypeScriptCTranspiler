console.log(eval('function duplicate(x,x){x=31;return [x,arguments[0],arguments[1]].join("|");}duplicate(11,17);'));
console.log(eval('var duplicate=function(x,x){arguments[0]=41;return [x,arguments[0],arguments[1]].join("|");};duplicate(19);'));
console.log(eval('function duplicate(x,x){var args=arguments;return function(value){x=value;return [x,args[0],args[1]].join("|");};}duplicate(43,47)(53);'));
