const pieces=['1','7;'];
console.log('joined:',eval(pieces.join('')));
const borrowed=Array.prototype.join;
console.log('borrowed:',eval(borrowed.call(['2','3;'],'')));
const separator={toString(){pieces[1]='9;';return '';}};
console.log('live:',eval(pieces.join(separator as any)));
