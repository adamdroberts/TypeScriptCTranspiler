console.log('last:',eval(eval('"17;";"19;";')));
console.log('empty:',eval(eval('"17;";if(false){"19;";}')));
console.log('finally:',eval(eval('try{"23;";}finally{"29;";}')));
try{eval('throw "31;";');}catch(source){console.log('throw:',eval(source as any));}
