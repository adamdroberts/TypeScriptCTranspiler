console.log(eval('class Holder {method=function(){return 41;};}var item=new Holder();eval("("+item.method.toString()+")()");'));
console.log(eval('class Base {constructor(){this.method=function(){return 43;};}}class Derived extends Base {}var item=new Derived();eval("("+item.method.toString()+")()");'));
