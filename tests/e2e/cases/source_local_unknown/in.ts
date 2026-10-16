declare function opaque():string;
{const run=(body:string)=>{body=opaque();console.log(eval(body));};run("31;");}
