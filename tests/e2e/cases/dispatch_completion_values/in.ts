const queue = new DispatchQueue("completion-values");
try {
    dispatch.sync(queue, () => { throw queue; });
} catch (reason) {
    console.log("sync owner:", reason === queue);
}
try {
    dispatch.sync(queue, () => { throw undefined; });
} catch (reason) {
    console.log("sync undefined:", reason === undefined);
}
dispatch.async(queue, () => { throw queue; }).catch(reason => {
    console.log("async owner:", reason === queue);
    return dispatch.after(0, queue, () => { throw Symbol.for("dispatch-completion"); }).catch(reason => {
        console.log("async symbol:", reason === Symbol.for("dispatch-completion"));
    });
});
