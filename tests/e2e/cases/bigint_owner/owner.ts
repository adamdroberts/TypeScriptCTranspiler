export function convert(value:number):bigint{return BigInt(value);}
export async function delayed(bits:number,value:bigint):Promise<any>{return BigInt.asIntN(bits,await Promise.resolve(value));}
