export const callableKey: unique symbol = Symbol('imported-instance');
export const inheritedKey: unique symbol = Symbol('inherited-instance');
export const literalKey = 'projected';
export class ComputedBase {
    [inheritedKey]: any = { label: 'base' };
}
export class ComputedOwner extends ComputedBase {
    [callableKey]: any = () => 1;
    [literalKey]: any = class { static observed(): any { return this.name; } };
    read(): any { return this[callableKey]; }
}
