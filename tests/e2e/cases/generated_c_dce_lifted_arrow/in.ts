const used_arrow = (value: number): number => {
    const unused_local_arrow = (inner: number): number => inner * 200;
    const unused_local_function_expression = function(inner: number): number {
        return inner * 300;
    };
    return value + 4;
};

const unused_arrow = (value: number): number => value * 100;

console.log(used_arrow(3));
