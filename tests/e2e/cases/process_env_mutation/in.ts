const key = "TSC2C_PROCESS_ENV_MUTATION";

delete process.env.TSC2C_PROCESS_ENV_MUTATION;
console.log("initial:", process.env.TSC2C_PROCESS_ENV_MUTATION === undefined);

process.env.TSC2C_PROCESS_ENV_MUTATION = "alpha";
console.log("property:", process.env.TSC2C_PROCESS_ENV_MUTATION, process.env[key]);

process.env[key] = "beta";
console.log("element:", process.env.TSC2C_PROCESS_ENV_MUTATION, process.env[key]);

console.log("delete:", delete process.env[key], process.env.TSC2C_PROCESS_ENV_MUTATION === undefined);
