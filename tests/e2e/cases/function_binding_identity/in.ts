// @ts-nocheck
function check(value, label) { if (!value) throw new Error(label); }
function exercise(seed) {
    var escaped;
    {
        function Local(value) { this.value = value; return value === undefined ? Local : value; }
        var before = Local;
        Local.prototype = { label: seed };
        Local.extra = seed;
        var read = function() { return Local; };
        var made = Reflect.construct(Local, [seed]);
        check(made.value === seed && made.label === seed && Object.getPrototypeOf(made) === Local.prototype, "new-target");
        check(before === Local && read() === Local && Local() === Local, "identity-and-recursion");
        escaped = { read: read, original: Local, made: made };
        Local = function replacement() { return seed + 1; };
        check(read() === Local && before !== Local && read()() === seed + 1, "live-rebinding");
        { function Local() { return "shadow"; } Local.mark = "inner"; check(Local() === "shadow" && Local.mark === "inner", "shadow"); }
        check(read() === Local && Local() === seed + 1, "outer-restored");
    }
    return escaped;
}
var first = exercise(17), second = exercise(23);
check(first.original !== second.original && first.read() !== second.read(), "fresh-environments");
check(first.original.extra === 17 && second.original.extra === 23 && first.read()() === 18, "escaped-owners");
function formalAlias(Shared) {
    function Shared() { return Shared; }
    Shared.prototype = { retained: true };
    return [Shared, function() { return Shared; }];
}
var aliased = formalAlias(null);
check(aliased[0]() === aliased[0] && aliased[1]() === aliased[0], "simple-formal-alias");
var tree = null;
for (var depth = 0; depth < 512; depth++) tree = { value: exercise(depth), previous: tree };
var cursor = tree, expected = 511;
while (cursor) {
    check(cursor.value.original.extra === expected && cursor.value.read()() === expected + 1 && cursor.value.made.value === expected, "retained-worklist");
    cursor = cursor.previous;
    expected--;
}
check(expected === -1, "worklist-complete");
console.log("function-binding-identity-ok");
