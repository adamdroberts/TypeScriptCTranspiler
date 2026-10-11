console.log(eval('class Original {constructor(value){this.value=value;}read(){return this.value;}}var Copy=eval("("+Original.toString()+")");new Copy(41).read();'));
console.log(eval('class Base {static text(){return "43;";}}class Child extends Base {}eval(Child.text());'));
