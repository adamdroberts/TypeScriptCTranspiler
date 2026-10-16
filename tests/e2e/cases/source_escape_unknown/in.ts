class C{constructor(body:string){console.log(eval(body));}}
const owner:any={callback:C};
[owner.callback,owner.callback].sort(function(callback:any){new callback("19;");return 0;});
