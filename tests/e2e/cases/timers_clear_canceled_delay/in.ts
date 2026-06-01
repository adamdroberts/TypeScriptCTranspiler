let seen = "";

const canceled = setTimeout(() => {
    seen += "timeout";
}, 25);

clearTimeout(canceled);

setImmediate(() => {
    seen += "immediate";
    console.log("after-clear:", seen);
});
