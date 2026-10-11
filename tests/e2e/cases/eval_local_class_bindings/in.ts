console.log(eval('{class C {static value=41;}class Reader {static get touch(){C.toString=()=>"43;";return 1;}}Reader.touch;eval(C.toString());}'));
function typed(): any {class Local {static value: number=61;}return eval("Local.value");}
console.log(typed());
