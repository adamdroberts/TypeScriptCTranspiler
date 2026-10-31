// util.inspect shapes: null-prototype objects and anonymous functions.
const bare = Object.create(null); bare.a = 1;
console.log(Object.create(null), bare, [Object.create(null)], { inner: Object.create(null) });
console.log(function () {}, () => 0, function named() {}, [function () {}], { f: () => 1 });
