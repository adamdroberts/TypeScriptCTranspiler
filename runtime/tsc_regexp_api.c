#include "tsc_internal.h"
#define RE_UNSET SIZE_MAX

/* Native consumers: every offset and capture refers to the same UTF-16 collection. */
tsc_regexp_t* tsc_regexp_from_constructor_args(
    tsc_value_t pattern,
    tsc_value_t flags,
    bool as_function_call
) {
    tsc_regexp_t* source_regexp = NULL;
    if (value_is_box(pattern) && value_tag(pattern) == TSC_VALUE_TAG_OBJECT) {
        const tsc_object_t* object = (const tsc_object_t*)value_ptr(pattern);
        if (object && object->is_regexp) {
            source_regexp = (tsc_regexp_t*)object->class_ptr;
        }
    }

    const bool flags_undefined = tsc_value_is_undefined(flags);
    if (as_function_call && source_regexp && flags_undefined) {
        return source_regexp;
    }

    const tsc_str_t* pattern_text;
    if (source_regexp) {
        pattern_text = source_regexp->source;
    } else if (tsc_value_is_undefined(pattern)) {
        pattern_text = tsc_str_from_lit("", 0);
    } else {
        pattern_text = tsc_value_to_string(pattern);
    }

    const tsc_str_t* flags_text;
    if (!flags_undefined) {
        flags_text = tsc_value_to_string(flags);
    } else if (source_regexp) {
        flags_text = source_regexp->flags;
    } else {
        flags_text = tsc_str_from_lit("", 0);
    }
    return tsc_regexp_new(pattern_text, flags_text);
}

tsc_str_t* tsc_regexp_escape(const tsc_str_t* input) {
    static const char* hex = "0123456789abcdef";
    tsc_str_t* out = str_alloc(input->len * 4);
    char* dst = (char*)out->data;
    size_t pos = 0;
    for (size_t i = 0; i < input->len; i++) {
        unsigned char c = (unsigned char)input->data[i];
        bool leading_alnum = i == 0 && ((c >= '0' && c <= '9') || (c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z'));
        if (leading_alnum) {
            dst[pos++] = '\\';
            dst[pos++] = 'x';
            dst[pos++] = hex[c >> 4];
            dst[pos++] = hex[c & 0x0f];
            continue;
        }
        switch (c) {
            case '^':
            case '$':
            case '\\':
            case '.':
            case '*':
            case '+':
            case '?':
            case '(':
            case ')':
            case '[':
            case ']':
            case '{':
            case '}':
            case '|':
            case '/':
                dst[pos++] = '\\';
                dst[pos++] = (char)c;
                break;
            case '\n':
                dst[pos++] = '\\';
                dst[pos++] = 'n';
                break;
            case '\r':
                dst[pos++] = '\\';
                dst[pos++] = 'r';
                break;
            case '\t':
                dst[pos++] = '\\';
                dst[pos++] = 't';
                break;
            case '\f':
                dst[pos++] = '\\';
                dst[pos++] = 'f';
                break;
            case '\v':
                dst[pos++] = '\\';
                dst[pos++] = 'v';
                break;
            case '-':
            case ' ':
            case ',':
            case '=':
            case '<':
            case '>':
            case '#':
            case '&':
            case '!':
            case '%':
            case ':':
            case ';':
            case '@':
            case '~':
            case '\'':
            case '`':
            case '"':
                dst[pos++] = '\\';
                dst[pos++] = 'x';
                dst[pos++] = hex[c >> 4];
                dst[pos++] = hex[c & 0x0f];
                break;
            default:
                if (c < 0x20 || c == 0x7f) {
                    dst[pos++] = '\\';
                    dst[pos++] = 'x';
                    dst[pos++] = hex[c >> 4];
                    dst[pos++] = hex[c & 0x0f];
                } else {
                    dst[pos++] = (char)c;
                }
                break;
        }
    }
    dst[pos] = '\0';
    out->len = pos;
    return out;
}


tsc_regexp_t* tsc_regexp_new(const tsc_str_t* pattern, const tsc_str_t* flags) {
    size_t pn, fn;
    const uint16_t* pu = tsc_str_utf16_units(pattern, &pn);
    const uint16_t* fu = tsc_str_utf16_units(flags, &fn);
    tsc_re_flags_t options;
    tsc_re_error_t error;
    if (tsc_re_parse_flags(fu, fn, &options) != TSC_RE_OK)
        tsc_throw_error(TSC_ERROR_SYNTAX, tsc_str_from_cstr("Invalid regular expression flags"));
    tsc_re_compiled_t* compiled = tsc_re_compile(pu, pn, options, &error);
    if (!compiled)
        tsc_throw_error(TSC_ERROR_SYNTAX, tsc_str_from_cstr("Invalid regular expression pattern"));
    tsc_regexp_t* result = TSC_GC_MALLOC(sizeof(*result));
    result->re = compiled;
    result->source = (tsc_str_t*)pattern;
    char canonical[8]; size_t count = 0;
    if (options.has_indices) canonical[count++] = 'd';
    if (options.global) canonical[count++] = 'g';
    if (options.ignore_case) canonical[count++] = 'i';
    if (options.multiline) canonical[count++] = 'm';
    if (options.dot_all) canonical[count++] = 's';
    if (options.unicode) canonical[count++] = 'u';
    if (options.unicode_sets) canonical[count++] = 'v';
    if (options.sticky) canonical[count++] = 'y';
    result->flags = str_alloc(count);
    memcpy((char*)result->flags->data, canonical, count);
    result->global = options.global;
    result->has_indices = options.has_indices;
    result->ignore_case = options.ignore_case;
    result->multiline = options.multiline;
    result->dot_all = options.dot_all;
    result->unicode = options.unicode;
    result->unicode_sets = options.unicode_sets;
    result->sticky = options.sticky;
    result->compiled = true;
    result->capture_count = tsc_re_group_count(compiled);
    result->prototype = value_ptr(tsc_regexp_prototype_value());
    return result;
}

static size_t regexp_advance(const tsc_regexp_t* re, const uint16_t* units, size_t len, size_t pos) {
    if ((re->unicode || re->unicode_sets) && pos + 1 < len &&
        units[pos] >= 0xd800 && units[pos] <= 0xdbff && units[pos + 1] >= 0xdc00 && units[pos + 1] <= 0xdfff) return pos + 2;
    return pos + 1;
}
static size_t* regexp_captures(const tsc_regexp_t* re) {
    return TSC_GC_MALLOC((re->capture_count + 1) * 2 * sizeof(size_t));
}
static bool regexp_find(const tsc_regexp_t* re, const uint16_t* units, size_t len,
                        size_t offset, bool sticky, size_t* captures) {
    for (size_t pos = offset; pos <= len; pos = regexp_advance(re, units, len, pos)) {
        size_t start, end;
        if (tsc_re_match_at(re->re, units, len, pos, captures, &start, &end)) return true;
        if (sticky) break;
    }
    return false;
}
static tsc_str_t* regexp_capture(const uint16_t* units, const size_t* captures, size_t index) {
    size_t start = captures[2 * index], end = captures[2 * index + 1];
    return start == RE_UNSET ? NULL : tsc_str_from_units_range(units, start, end - start);
}
static tsc_array_t* regexp_capture_array(const tsc_regexp_t* re, const uint16_t* units,
                                        const size_t* captures) {
    tsc_array_t* result = tsc_array_new(sizeof(tsc_str_t*), re->capture_count + 1);
    for (size_t i = 0; i <= re->capture_count; i++) {
        tsc_str_t* part = regexp_capture(units, captures, i);
        tsc_array_push_raw(result, &part);
    }
    return result;
}

static void regexp_set_last_index(tsc_value_t receiver, double index) {
    if (!tsc_value_set_prop(receiver, tsc_str_from_lit("lastIndex", 9), tsc_value_num(index)))
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Cannot assign RegExp lastIndex"));
}
static tsc_regexp_t* regexp_require_matcher(tsc_value_t receiver) {
    if (value_is_box(receiver) && value_tag(receiver) == TSC_VALUE_TAG_OBJECT) {
        tsc_object_t* object = value_ptr(receiver);
        if (object->is_regexp && object->class_ptr) return object->class_ptr;
    }
    tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("RegExp exec called on incompatible receiver"));
}
static tsc_value_t regexp_named_values(const tsc_regexp_t* re, const uint16_t* units,
                                       const size_t* captures, const tsc_array_t* indices) {
    if (!tsc_re_named_count(re->re)) return tsc_value_undefined();
    tsc_object_t* object = tsc_object_new(); object->prototype = tsc_value_null();
    for (size_t i = 0; i < tsc_re_named_count(re->re); i++) {
        const char* name; size_t name_len, group_index;
        if (!tsc_re_named_at(re->re, i, &name, &name_len, &group_index)) abort();
        tsc_str_t* part = regexp_capture(units, captures, group_index);
        tsc_value_t value = indices ? TSC_ARR(tsc_value_t, indices, group_index) :
            part ? tsc_value_string(part) : tsc_value_undefined();
        tsc_object_set(object, tsc_str_from_lit(name, name_len), value);
    }
    return tsc_value_object(object);
}
static tsc_array_t* regexp_match_result(const tsc_regexp_t* re, const tsc_str_t* string,
                                        const uint16_t* units, const size_t* captures) {
    tsc_array_t* result = regexp_capture_array(re, units, captures);
    result->props = tsc_object_new();
    tsc_object_set(result->props, tsc_str_from_lit("index", 5), tsc_value_num((double)captures[0]));
    tsc_object_set(result->props, tsc_str_from_lit("input", 5), tsc_value_string((tsc_str_t*)string));
    tsc_object_set(result->props, tsc_str_from_lit("groups", 6), regexp_named_values(re, units, captures, NULL));
    if (re->has_indices) {
        tsc_array_t* indices = tsc_array_new(sizeof(tsc_value_t), re->capture_count + 1);
        for (size_t i = 0; i <= re->capture_count; i++) {
            tsc_value_t value = tsc_value_undefined();
            if (captures[2 * i] != RE_UNSET) {
                tsc_array_t* pair = tsc_array_new(sizeof(tsc_value_t), 2);
                tsc_array_push_value(pair, tsc_value_num((double)captures[2 * i]));
                tsc_array_push_value(pair, tsc_value_num((double)captures[2 * i + 1]));
                value = tsc_value_array(pair);
            }
            tsc_array_push_value(indices, value);
        }
        indices->props = tsc_object_new();
        tsc_object_set(indices->props, tsc_str_from_lit("groups", 6), regexp_named_values(re, units, captures, indices));
        tsc_object_set(result->props, tsc_str_from_lit("indices", 7), tsc_value_array(indices));
    }
    return result;
}
tsc_array_t* tsc_regexp_exec(const tsc_regexp_t* re, const tsc_str_t* string) {
    size_t len; const uint16_t* units = tsc_str_utf16_units(string, &len);
    tsc_value_t receiver = tsc_value_regexp((tsc_regexp_t*)re);
    double last_index = tsc_value_to_length(tsc_value_get_prop(receiver, tsc_str_from_lit("lastIndex", 9)));
    bool stateful = re->global || re->sticky;
    if (!stateful) last_index = 0;
    size_t* captures = regexp_captures(re);
    if (last_index > (double)len) {
        if (stateful) regexp_set_last_index(receiver, 0);
        return NULL;
    }
    size_t offset = (size_t)last_index;
    if ((re->unicode || re->unicode_sets) && offset > 0 && offset < len &&
        units[offset] >= 0xdc00 && units[offset] <= 0xdfff &&
        units[offset - 1] >= 0xd800 && units[offset - 1] <= 0xdbff) offset--;
    if (!regexp_find(re, units, len, offset, re->sticky, captures)) {
        if (stateful) regexp_set_last_index(receiver, 0);
        return NULL;
    }
    if (stateful) regexp_set_last_index(receiver, (double)captures[1]);
    return regexp_match_result(re, string, units, captures);
}
tsc_value_t tsc_regexp_exec_apply(void* env, tsc_value_t receiver, tsc_array_t* args) {
    (void)env;
    tsc_regexp_t* re = regexp_require_matcher(receiver);
    tsc_str_t* string = tsc_value_to_string(args && args->len ? TSC_ARR(tsc_value_t, args, 0) : tsc_value_undefined());
    tsc_array_t* result = tsc_regexp_exec(re, string);
    return result ? tsc_value_array(value_array_from_string_array(result)) : tsc_value_null();
}
static tsc_value_t regexp_exec_value(tsc_value_t receiver, const tsc_str_t* string) {
    tsc_value_t exec = tsc_value_get_prop(receiver, tsc_str_from_lit("exec", 4));
    if (tsc_value_is_callable(exec)) {
        tsc_array_t* args = tsc_array_new(sizeof(tsc_value_t), 1);
        tsc_array_push_value(args, tsc_value_string((tsc_str_t*)string));
        tsc_value_t result = tsc_value_apply_function(exec, receiver, tsc_value_array(args));
        if (!tsc_value_is_object(result) && result != tsc_value_null())
            tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("RegExp exec must return an object or null"));
        return result;
    }
    tsc_array_t* result = tsc_regexp_exec(regexp_require_matcher(receiver), string);
    return result ? tsc_value_array(value_array_from_string_array(result)) : tsc_value_null();
}
tsc_value_t tsc_regexp_test_apply(void* env, tsc_value_t receiver, tsc_array_t* args) {
    (void)env;
    if (!tsc_value_is_object(receiver))
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("RegExp test called on non-object"));
    tsc_str_t* string = tsc_value_to_string(args && args->len ? TSC_ARR(tsc_value_t, args, 0) : tsc_value_undefined());
    return tsc_value_bool(regexp_exec_value(receiver, string) != tsc_value_null());
}
bool tsc_regexp_test(const tsc_regexp_t* re, const tsc_str_t* string) {
    return regexp_exec_value(tsc_value_regexp((tsc_regexp_t*)re), string) != tsc_value_null();
}
tsc_str_t* tsc_regexp_to_string(const tsc_regexp_t* re) {
    tsc_str_t* head = tsc_str_concat(tsc_str_from_lit("/", 1), re->source);
    return tsc_str_concat(head, tsc_str_concat(tsc_str_from_lit("/", 1), re->flags));
}
tsc_array_t* tsc_str_match_regex(const tsc_str_t* string, const tsc_regexp_t* re) {
    if (!re->global) return tsc_regexp_exec(re, string);
    size_t len; const uint16_t* units = tsc_str_utf16_units(string, &len);
    size_t* captures = regexp_captures(re);
    tsc_array_t* result = tsc_array_new(sizeof(tsc_str_t*), 4);
    size_t offset = 0;
    while (regexp_find(re, units, len, offset, re->sticky, captures)) {
        tsc_str_t* part = regexp_capture(units, captures, 0);
        tsc_array_push_raw(result, &part);
        offset = captures[1];
        if (captures[0] == offset) offset = regexp_advance(re, units, len, offset);
    }
    return result->len ? result : NULL;
}
tsc_array_t* tsc_str_match_all_regex(const tsc_str_t* string, const tsc_regexp_t* re) {
    size_t len; const uint16_t* units = tsc_str_utf16_units(string, &len);
    size_t* captures = regexp_captures(re);
    tsc_array_t* result = tsc_array_new(sizeof(tsc_array_t*), 4);
    size_t offset = 0;
    while (regexp_find(re, units, len, offset, re->sticky, captures)) {
        tsc_array_t* part = regexp_capture_array(re, units, captures);
        tsc_array_push_raw(result, &part);
        if (!re->global) break;
        offset = captures[1];
        if (captures[0] == offset) offset = regexp_advance(re, units, len, offset);
    }
    return result;
}
double tsc_str_search_regex(const tsc_str_t* string, const tsc_regexp_t* re) {
    size_t len; const uint16_t* units = tsc_str_utf16_units(string, &len);
    size_t* captures = regexp_captures(re);
    return regexp_find(re, units, len, 0, re->sticky, captures) ? (double)captures[0] : -1.0;
}

/* Output collection is GC-owned: callback/abrupt exits never abandon native
 * allocations. Its materializer is the shared surrogate-preserving String ABI. */
typedef struct { uint16_t* units; size_t len, capacity; } regexp_output_t;
static void regexp_append(regexp_output_t* out, const uint16_t* units, size_t start, size_t count) {
    if (count > SIZE_MAX - out->len) abort();
    if (out->len + count > out->capacity) {
        size_t next = out->capacity ? out->capacity : 64;
        while (next < out->len + count) { if (next > SIZE_MAX / 2) abort(); next *= 2; }
        out->units = TSC_GC_REALLOC(out->units, next * sizeof(*out->units));
        out->capacity = next;
    }
    if (count) memcpy(out->units + out->len, units + start, count * sizeof(*units));
    out->len += count;
}
static void regexp_substitute(regexp_output_t* out, const tsc_regexp_t* re,
                              const uint16_t* source, size_t len, const size_t* captures,
                              const uint16_t* replacement, size_t replacement_len) {
    for (size_t i = 0; i < replacement_len; i++) {
        if (replacement[i] != '$' || i + 1 == replacement_len) {
            regexp_append(out, replacement, i, 1); continue;
        }
        uint16_t next = replacement[i + 1];
        size_t start = 0, end = 0, consumed = 2;
        if (next == '$') { regexp_append(out, replacement, i, 1); i++; continue; }
        if (next == '&') { start = captures[0]; end = captures[1]; }
        else if (next == '`') end = captures[0];
        else if (next == '\'') { start = captures[1]; end = len; }
        else if (next >= '0' && next <= '9') {
            size_t index = next - '0';
            if (i + 2 < replacement_len && replacement[i + 2] >= '0' && replacement[i + 2] <= '9') {
                size_t two = index * 10 + replacement[i + 2] - '0';
                if (two > 0 && two <= re->capture_count) { index = two; consumed++; }
            }
            if (index == 0 || index > re->capture_count) { regexp_append(out, replacement, i, 1); continue; }
            start = captures[index * 2]; end = captures[index * 2 + 1];
        } else if (next == '<' && tsc_re_named_count(re->re)) {
            size_t close = i + 2;
            while (close < replacement_len && replacement[close] != '>') close++;
            if (close == replacement_len) { regexp_append(out, replacement, i, 1); continue; }
            tsc_str_t* name = tsc_str_from_units_range(replacement, i + 2, close - i - 2);
            size_t index = tsc_re_named_group(re->re, name->data, name->len);
            if (index != RE_UNSET) { start = captures[index * 2]; end = captures[index * 2 + 1]; }
            consumed = close - i + 1;
        } else { regexp_append(out, replacement, i, 1); continue; }
        if (start != RE_UNSET) regexp_append(out, source, start, end - start);
        i += consumed - 1;
    }
}
static tsc_str_t* regexp_functional_replacement(
    const tsc_regexp_t* re, const tsc_str_t* source, const uint16_t* units,
    const size_t* captures, tsc_value_t replacement
) {
    tsc_array_t* args = tsc_array_new(sizeof(tsc_value_t), re->capture_count + 4);
    for (size_t i = 0; i <= re->capture_count; i++) {
        tsc_str_t* part = regexp_capture(units, captures, i);
        tsc_value_t value = part ? tsc_value_string(part) : tsc_value_undefined();
        tsc_array_push_raw(args, &value);
    }
    tsc_value_t position = tsc_value_num((double)captures[0]);
    tsc_array_push_raw(args, &position);
    tsc_value_t original = tsc_value_string((tsc_str_t*)source);
    tsc_array_push_raw(args, &original);
    if (tsc_re_named_count(re->re)) {
        tsc_object_t* group_object = tsc_object_new();
        group_object->prototype = tsc_value_null();
        tsc_value_t groups = tsc_value_object(group_object);
        for (size_t i = 0; i < tsc_re_named_count(re->re); i++) {
            const char* name; size_t name_len, group_index;
            if (!tsc_re_named_at(re->re, i, &name, &name_len, &group_index)) abort();
            tsc_str_t* part = regexp_capture(units, captures, group_index);
            tsc_value_set_prop(groups, tsc_str_from_lit(name, name_len),
                part ? tsc_value_string(part) : tsc_value_undefined());
        }
        tsc_array_push_raw(args, &groups);
    }
    return tsc_value_to_string(tsc_value_apply_function(replacement, tsc_value_undefined(), tsc_value_array(args)));
}

tsc_str_t* tsc_str_replace_regex_value(const tsc_str_t* string, const tsc_regexp_t* re, tsc_value_t replacement) {
    size_t len, replacement_len = 0;
    const uint16_t* units = tsc_str_utf16_units(string, &len);
    bool functional = tsc_value_is_callable(replacement);
    const uint16_t* replacement_units = functional ? NULL :
        tsc_str_utf16_units(tsc_value_to_string(replacement), &replacement_len);
    tsc_array_t* matches = tsc_array_new(sizeof(size_t*), 4);
    size_t offset = 0;
    for (;;) {
        size_t* captures = regexp_captures(re);
        if (!regexp_find(re, units, len, offset, re->sticky, captures)) break;
        tsc_array_push_raw(matches, &captures);
        if (!re->global) break;
        offset = captures[1];
        if (captures[0] == offset) offset = regexp_advance(re, units, len, offset);
    }
    regexp_output_t output = {0};
    size_t copied = 0;
    for (size_t i = 0; i < matches->len; i++) {
        size_t* captures = TSC_ARR(size_t*, matches, i);
        regexp_append(&output, units, copied, captures[0] - copied);
        if (functional) {
            tsc_str_t* text = regexp_functional_replacement(re, string, units, captures, replacement);
            size_t text_len; const uint16_t* text_units = tsc_str_utf16_units(text, &text_len);
            regexp_append(&output, text_units, 0, text_len);
        } else regexp_substitute(&output, re, units, len, captures, replacement_units, replacement_len);
        copied = captures[1];
    }
    regexp_append(&output, units, copied, len - copied);
    return tsc_str_from_units_range(output.units, 0, output.len);
}

tsc_str_t* tsc_str_replace_regex(const tsc_str_t* string, const tsc_regexp_t* re, const tsc_str_t* replacement) {
    return tsc_str_replace_regex_value(string, re, tsc_value_string((tsc_str_t*)replacement));
}
tsc_array_t* tsc_str_split_regex_limit(const tsc_str_t* string, const tsc_regexp_t* re, uint32_t limit) {
    size_t len; const uint16_t* units = tsc_str_utf16_units(string, &len);
    size_t* captures = regexp_captures(re);
    tsc_array_t* result = tsc_array_new(sizeof(tsc_str_t*), 4);
    if (!limit) return result;
    if (!len) {
        if (!regexp_find(re, units, len, 0, true, captures)) {
            tsc_str_t* part = (tsc_str_t*)string; tsc_array_push_raw(result, &part);
        }
        return result;
    }
    size_t copied = 0, offset = 0;
    while (offset < len) {
        if (!regexp_find(re, units, len, offset, true, captures) || captures[1] == copied) {
            offset = regexp_advance(re, units, len, offset); continue;
        }
        tsc_str_t* part = tsc_str_from_units_range(units, copied, offset - copied);
        tsc_array_push_raw(result, &part);
        if (result->len == limit) return result;
        copied = captures[1];
        for (size_t i = 1; i <= re->capture_count; i++) {
            part = regexp_capture(units, captures, i); tsc_array_push_raw(result, &part);
            if (result->len == limit) return result;
        }
        offset = copied;
    }
    tsc_str_t* tail = tsc_str_from_units_range(units, copied, len - copied);
    tsc_array_push_raw(result, &tail);
    return result;
}
tsc_array_t* tsc_str_split_regex(const tsc_str_t* string, const tsc_regexp_t* re) {
    return tsc_str_split_regex_limit(string, re, UINT32_MAX);
}
tsc_array_t* tsc_str_split_regex_limit_num(const tsc_str_t* string, const tsc_regexp_t* re, double limit) {
    return tsc_str_split_regex_limit(string, re, split_limit_from_num(limit));
}
