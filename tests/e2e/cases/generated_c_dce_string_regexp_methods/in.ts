const pattern = /dead_dce_string_match_regex_const/;
const searchPattern = new RegExp("dead_dce_string_search_new_regexp");

"dead_dce_string_match_regex_literal".match(/dead_dce_string_match_regex_literal_pattern/);
"dead_dce_string_match_regex_const_input".match(pattern);
"dead_dce_string_match_all_regex_literal".matchAll(/dead_dce_string_match_all_regex_literal_pattern/g);
"dead_dce_string_search_regex_literal".search(/dead_dce_string_search_regex_literal_pattern/);
"dead_dce_string_search_new_regexp_input".search(searchPattern);

console.log("kept string regexp DCE");
