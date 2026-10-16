declare function opaque():void;
{
 const read=(body:string)=>console.log(eval(body));
 read("17;");
 const prototype:any=Array.prototype;
 prototype.callback=read;
}
opaque();
