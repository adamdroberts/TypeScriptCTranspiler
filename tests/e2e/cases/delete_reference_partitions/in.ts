console.log(eval('(function(){try{throw 31;}catch(x){return (delete x)+":"+x;}})();'));
console.log(eval('(function(){var result=delete x;let x=37;return result+":"+x;})();'));
console.log(eval('var count=0;var result=delete void (++count);result+":"+count;'));
