console.log(eval('var let=31;var trace=[];with({let:37})let\n{trace.push(let);}trace[0];'));
console.log(eval('var let=[41];with({let:[43]})l\\u0065t\n[0];'));
console.log(eval('var let=47;var trace=[];for(var i=0;i<2;i++)let\n{trace.push(let);}trace.join(",");'));
