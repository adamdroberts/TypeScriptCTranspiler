export class Owner {
    field=0;
    stored=0;
    set value(next:number){this.stored=next;}
    get value():number{return this.stored;}
}
export function values():any{return [undefined,5,{value:17},19,23];}
