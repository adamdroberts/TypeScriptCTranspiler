const ascii = String.fromCharCode(65, 66, 67);
console.log(ascii);

const omega = String.fromCharCode(937);
console.log(omega.codePointAt(0));

const face = String.fromCharCode(0xd83d, 0xde00);
console.log(face.codePointAt(0));
console.log(face.codePointAt(1));
console.log(face.codePointAt(2));
