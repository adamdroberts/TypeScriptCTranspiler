import { λ as imported, $x as importedDollar } from "./names";
const log = 11, nan = 13, sin = 17, int = 19, ts_int = 23;
const $x = 29, _x = 31, λ = 37, 变量 = 41, 𐐀 = 43;
namespace A { export const b_c = 47; }
namespace A_b { export const c = 53; }
namespace Outer {
    const λ = 89;
    export namespace Inner { export function read(): number { return λ; } }
}
const A_b_c = 59;
function printf(log: number, nan: number, λ: number): number {
    let _x = log + nan;
    const capture = () => _x + λ;
    _x += 1;
    return capture();
}
class Fields {
    __tsc_type: string = "type";
    __tsc_root_value: string = "root";
    λ: number = 61;
    $x: number = 67;
    _x: number = 71;
    method(int: number): number { return this.λ + this.$x + this._x + int; }
}
console.log("headers:", log, nan, sin, int, ts_int);
console.log("spellings:", $x, _x, λ, 变量, 𐐀);
console.log("boundaries:", A.b_c, A_b.c, A_b_c);
console.log("bindings:", printf(log, nan, λ), imported, importedDollar);
console.log("namespace-capture:", Outer.Inner.read());
const fields = new Fields();
console.log("fields:", fields.__tsc_type, fields.__tsc_root_value, fields.method(73));
