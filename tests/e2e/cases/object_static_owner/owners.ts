export const objectOwner: ObjectConstructor = Object;
export const reflectOwner = Reflect;
export function copied(target: any, source: any): any {
    return Object.assign(target, source);
}
