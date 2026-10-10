declare var Array:ArrayConstructor;
declare const AbortController:{new():any};
export function makeController():any{return new AbortController();}
export function copy(value:any):any{return Array.from([value]);}
export function sparse():any{return new Array(2);}
export function retain(Array:any):any{return ()=>Array;}
