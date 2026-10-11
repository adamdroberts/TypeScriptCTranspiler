try {
    eval('try {} catch ([x, x]) {}');
    console.log("missed direct SyntaxError");
} catch (error: any) {
    console.log(error.name);
}
try {
    (0, eval)('try {} catch ([...x, y]) {}');
    console.log("missed indirect SyntaxError");
} catch (error: any) {
    console.log(error.name);
}
