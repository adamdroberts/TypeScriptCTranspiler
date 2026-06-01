const result = (
    typeof new Date("dead_typeof_new_date") === "object" &&
    typeof new Error("dead_typeof_new_error") === "object" &&
    typeof new Map([["dead_typeof_new_map_key", 1]]) === "object" &&
    typeof new Set(["dead_typeof_new_set"]) === "object" &&
    typeof new URL("https://example.com/dead_typeof_new_url") === "object"
) ? "kept-typeof-new" : "dead-typeof-new";

console.log(result);
