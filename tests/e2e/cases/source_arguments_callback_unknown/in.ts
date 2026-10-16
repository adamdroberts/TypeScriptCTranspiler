declare function opaque(value:any):void;
declare function external():string;
console.log(eval('{let body="17;";const run=function(value){value=()=>{body=external();};opaque(arguments);};run(null);eval(body);}'));
