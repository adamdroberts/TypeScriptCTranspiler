// util.inspect renders RegExp objects from [[OriginalSource]]/[[OriginalFlags]].
const r: any = /a\/b/gi; console.log(r, [r], { r });
r.x = 1; console.log(r);
console.log(new RegExp("\n"), new RegExp(""));
const d: any = new Date(0); console.log(d instanceof Date);
const replaced: any = /x/y; replaced.toString = () => "changed"; console.log(replaced, String(replaced));
