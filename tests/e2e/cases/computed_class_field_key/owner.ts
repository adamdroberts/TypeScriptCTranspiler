export const publicKey: unique symbol = Symbol('imported-field');
export class ComputedOwner {
    static [publicKey]: any = () => 1;
    static ['projected']: any = class { static observed(): any { return this.name; } };
}
