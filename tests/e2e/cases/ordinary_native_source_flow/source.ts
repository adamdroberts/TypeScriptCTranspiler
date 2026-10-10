const date=new Date(0);
export function produce(){return date.getTime();}
export const closure=()=>produce();
export function record(){return {value:closure()};}
export function collection(){return [produce()];}
export class Owner {
    value=produce();
    read(){return this.value;}
    get result(){return this.value;}
}
export async function suspended(){await Promise.resolve(0);return produce();}
