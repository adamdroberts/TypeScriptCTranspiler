console.log(eval('(function(value){once:{try{value=31;throw 0;}finally{break once;}}return value;})(0);'));
console.log(eval('(function(){var value={tag:0};try{value={tag:37};throw 0;}catch(error){}return value.tag;})();'));
console.log(eval('(function(value){for(var index=0;index<1;index++){try{value="after";throw 0;}finally{continue;}}return value;})("before");'));
