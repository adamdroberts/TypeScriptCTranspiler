export class CallableOwner {
    reader: any = () => 1;
    named: any = function explicit() {};
    nested: any = class { static observed(): any { return this.name; } };
    static stored: any = async () => 1;
}
