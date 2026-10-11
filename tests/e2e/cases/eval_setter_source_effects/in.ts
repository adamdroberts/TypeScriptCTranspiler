console.log(eval('class C {}class Reader {static set mark(value){C.toString=value;}}Reader.mark=function(){return "71;";};eval(C.toString());'));
