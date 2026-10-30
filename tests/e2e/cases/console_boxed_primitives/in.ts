// util.inspect renders primitive wrapper objects through [[PrimitiveData]].
console.log(new Number(5), new Number(-0), new Number(NaN), new String("ab"), new String("it's"), new Boolean(false));
console.log(Object(Symbol("s")), Object(10n), [new Number(1), new String("")], { n: new String("x"), b: new Boolean(true) });
console.log(Object("x") instanceof String, typeof new Number(1));
