export const events:string[]=[];
export function makeBase():any{return class Base {value:number;target:any;constructor(value:number){this.value=value;this.target=new.target}read():number{return this.value}}}
export async function makeAsync(Base:any,label:number,key:symbol):Promise<any>{
 class Local extends (await Promise.resolve(Base)) {
  [await Promise.resolve(key)]():any{return [Local,label,super.read()]}
  field=(events.push('instance'),label);
  static {events.push('static')}
  constructor(value=label){super(value);this.inner=()=>Local}
 }
 return Local;
}
export function* makeGenerator(Base:any,label:number,key:symbol):any{
 return class Named extends (yield Base) {
  [yield key]():any{return [Named,label,super.read()]}
  field=(events.push('instance'),label);
  static {events.push('static')}
  constructor(value=label){super(value);this.inner=()=>Named}
 };
}
export async function* makeAsyncGenerator(Base:any,label:number,key:symbol):any{
 return class Named extends (await (yield Base)) {
  [await (yield key)]():any{return [Named,label,super.read()]}
  field=(events.push('instance'),label);
  static {events.push('static')}
  constructor(value=label){super(value);this.inner=()=>Named}
 };
}
