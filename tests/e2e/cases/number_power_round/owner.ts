export function power(base:number,exponent:number):number{return base**exponent;}
export function compound(base:number,exponent:number):number{base**=exponent;return base;}
export async function delayed(base:number,exponent:number):Promise<any>{return Math.pow(base,await Promise.resolve(exponent));}
