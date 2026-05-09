const text: any = "one two one";
console.log("text:", text.indexOf("one"), text.lastIndexOf("one"), text.lastIndexOf("missing"));

const arr: any = [1, "x", 2, "x", 1];
console.log("arr:", arr.indexOf("x"), arr.lastIndexOf("x"), arr.lastIndexOf(1), arr.lastIndexOf(9));
