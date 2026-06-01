new URLSearchParams("top_level_dead_url_search_params");
new URLSearchParams("?top_level_dead_url_search_params_query=1");
new URLSearchParams(undefined);

function localDead(): void {
    const unused_local_params = new URLSearchParams("local_dead_url_search_params");
    const unused_local_empty = new URLSearchParams();
    void unused_local_empty;
    void unused_local_params;
}

console.log("kept_url_search_params_dce");
