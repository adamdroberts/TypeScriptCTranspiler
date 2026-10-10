const date=new Date(0);
export function produce():number{return date.getTime();}
export function identity(value:number):number{return value;}
export const closure=(value:number):number=>value;
export function first(...values:number[]):number{return values[0];}
export class Owner {
    value:number=0;
    other:number=0;
    echo(value:number):number{this.value=value;return this.value;}
}
export function keyed():'value'|'other'{return 'value';}
export interface Slot {value:number;}
