#include "tsc_internal.h"
#define RE_UNSET SIZE_MAX

/* Native consumers: every offset and capture refers to the same UTF-16 collection. */
/* Output collection is GC-owned: callback/abrupt exits never abandon native
 * allocations. Its materializer is the shared surrogate-preserving String ABI. */
typedef struct { uint16_t* units; size_t len, capacity; } regexp_output_t;
static void regexp_append(regexp_output_t* out, const uint16_t* units, size_t start, size_t count) {
    if (count > SIZE_MAX - out->len) abort();
    if (out->len + count > out->capacity) {
        size_t next = out->capacity ? out->capacity : 64;
        while (next < out->len + count) { if (next > SIZE_MAX / 2) abort(); next *= 2; }
        if (next > SIZE_MAX / sizeof(*out->units)) abort();
        out->units = TSC_GC_REALLOC(out->units, next * sizeof(*out->units));
        out->capacity = next;
    }
    if (count) memcpy(out->units + out->len, units + start, count * sizeof(*units));
    out->len += count;
}
/* The ordinary argument List feeds both [[Call]] and [[Construct]]. IsRegExp,
 * property reads, prototype selection and conversion retain their spec order. */
tsc_value_t tsc_regexp_constructor_apply(void* env, tsc_value_t receiver, tsc_array_t* args) {
    (void)env; (void)receiver;
    tsc_value_t pattern = args && args->len ? TSC_ARR(tsc_value_t, args, 0) : tsc_value_undefined();
    tsc_value_t flags = args && args->len > 1 ? TSC_ARR(tsc_value_t, args, 1) : tsc_value_undefined();
    bool pattern_is_regexp = tsc_value_is_regexp(pattern);
    tsc_value_t new_target = tsc_value_current_new_target();
    if (tsc_value_is_undefined(new_target)) {
        new_target = tsc_value_current_callee();
        if (pattern_is_regexp && tsc_value_is_undefined(flags) &&
            tsc_value_get_prop(pattern, tsc_str_from_lit("constructor", 11)) == new_target) return pattern;
    }
    const tsc_regexp_t* native = NULL;
    if (value_is_box(pattern) && value_tag(pattern) == TSC_VALUE_TAG_OBJECT) {
        const tsc_object_t* object = value_ptr(pattern);
        if (object->is_regexp) native = object->class_ptr;
    }
    tsc_value_t source = pattern;
    if (native) {
        source = tsc_value_string(native->source);
        if (tsc_value_is_undefined(flags)) flags = tsc_value_string(native->flags);
    } else if (pattern_is_regexp) {
        source = tsc_value_get_prop(pattern, tsc_str_from_lit("source", 6));
        if (tsc_value_is_undefined(flags)) flags = tsc_value_get_prop(pattern, tsc_str_from_lit("flags", 5));
    }
    void* volatile source_root = tsc_value_gc_root(source); (void)source_root;
    void* volatile flags_root = tsc_value_gc_root(flags); (void)flags_root;
    tsc_value_t prototype = tsc_value_get_prototype_from_constructor(new_target, TSC_INTRINSIC_DEFAULT_REGEXP_PROTOTYPE);
    void* volatile prototype_root = tsc_value_gc_root(prototype); (void)prototype_root;
    tsc_str_t* pattern_text = tsc_value_is_undefined(source) ? tsc_str_from_lit("", 0) : tsc_value_to_string(source);
    tsc_str_t* flags_text = tsc_value_is_undefined(flags) ? tsc_str_from_lit("", 0) : tsc_value_to_string(flags);
    tsc_regexp_t* regexp = tsc_regexp_new(pattern_text, flags_text);
    regexp->prototype = prototype;
    regexp->prototype_gc_root = tsc_value_gc_root(prototype);
    return tsc_value_regexp(regexp);
}

static void regexp_output_unit(regexp_output_t* out, uint16_t unit) {
    regexp_append(out, &unit, 0, 1);
}
static void regexp_output_hex(regexp_output_t* out, uint16_t unit, bool unicode) {
    static const uint16_t hex[] = {'0','1','2','3','4','5','6','7','8','9','a','b','c','d','e','f'};
    regexp_output_unit(out, '\\');
    regexp_output_unit(out, unicode ? 'u' : 'x');
    for (unsigned shift = unicode ? 16 : 8; shift;) {
        shift -= 4;
        regexp_output_unit(out, hex[(unit >> shift) & 15]);
    }
}

tsc_str_t* tsc_regexp_escape(const tsc_str_t* input) {
    size_t len;
    const uint16_t* units = tsc_str_utf16_units(input, &len);
    regexp_output_t output = {0};
    for (size_t index = 0; index < len; index++) {
        uint16_t unit = units[index];
        if (is_high_surrogate(unit) && index + 1 < len && is_low_surrogate(units[index + 1])) {
            regexp_append(&output, units, index++, 2);
            continue;
        }
        bool leading_alnum = index == 0 && ((unit >= '0' && unit <= '9') ||
            (unit >= 'A' && unit <= 'Z') || (unit >= 'a' && unit <= 'z'));
        bool syntax = unit < 128 && strchr("^$\\.*+?()[]{}|/", unit) != NULL && unit != 0;
        uint16_t control = unit == '\t' ? 't' : unit == '\n' ? 'n' : unit == '\v' ? 'v' :
            unit == '\f' ? 'f' : unit == '\r' ? 'r' : 0;
        bool punctuation = unit < 128 && unit != 0 && strchr(",-=<>#&!%:;@~'`\"", unit) != NULL;
        if (leading_alnum) regexp_output_hex(&output, unit, false);
        else if (syntax || control) {
            regexp_output_unit(&output, '\\');
            regexp_output_unit(&output, control ? control : unit);
        } else if (punctuation || tsc_is_whitespace_unit(unit) || is_high_surrogate(unit) || is_low_surrogate(unit)) {
            regexp_output_hex(&output, unit, unit > 0xff);
        } else regexp_output_unit(&output, unit);
    }
    return tsc_str_from_units_range(output.units, 0, output.len);
}

/* EscapeRegExpPattern serializes the immutable original pattern. Escaped
 * units are consumed together, so a delimiter is never escaped twice and a
 * backslash before a raw line terminator becomes its equivalent escape. */
tsc_str_t* tsc_regexp_source(const tsc_regexp_t* regexp) {
    size_t len;
    const uint16_t* units = tsc_str_utf16_units(regexp->source, &len);
    if (!len) return tsc_str_from_lit("(?:)", 4);
    regexp_output_t output = {0};
    size_t class_depth = 0;
    for (size_t index = 0; index < len; index++) {
        uint16_t unit = units[index];
        bool escaped = unit == '\\' && index + 1 < len;
        if (escaped) unit = units[++index];
        if (unit == '\n' || unit == '\r') {
            regexp_output_unit(&output, '\\');
            regexp_output_unit(&output, unit == '\n' ? 'n' : 'r');
        } else if (unit == 0x2028 || unit == 0x2029) {
            regexp_output_hex(&output, unit, true);
        } else {
            if (escaped || (unit == '/' && !class_depth)) regexp_output_unit(&output, '\\');
            regexp_output_unit(&output, unit);
            if (!escaped) {
                if (unit == '[' && (!class_depth || regexp->unicode_sets)) class_depth++;
                else if (unit == ']' && class_depth) class_depth--;
            }
        }
    }
    return tsc_str_from_units_range(output.units, 0, output.len);
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
    result->prototype = tsc_regexp_prototype_value();
    result->prototype_gc_root = tsc_value_gc_root(result->prototype);
    return result;
}

static double regexp_advance(const uint16_t* units, size_t len, double index, bool unicode) {
    if (index >= (double)len) return index + 1;
    size_t pos = (size_t)index;
    if (unicode && pos + 1 < len &&
        units[pos] >= 0xd800 && units[pos] <= 0xdbff && units[pos + 1] >= 0xdc00 && units[pos + 1] <= 0xdfff) return pos + 2;
    return index + 1;
}
static size_t* regexp_captures(const tsc_regexp_t* re) {
    return TSC_GC_MALLOC((re->capture_count + 1) * 2 * sizeof(size_t));
}
static bool regexp_find(const tsc_regexp_t* re, const uint16_t* units, size_t len,
                        size_t offset, bool sticky, size_t* captures) {
    for (size_t pos = offset; pos <= len; pos = (size_t)regexp_advance(units, len, pos, re->unicode || re->unicode_sets)) {
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

static void regexp_set_last_index_value(tsc_value_t receiver, tsc_value_t index) {
    if (!tsc_value_set_prop(receiver, tsc_str_from_lit("lastIndex", 9), index))
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
        if (!tsc_re_named_at(re->re, i, captures, &name, &name_len, &group_index)) abort();
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
        if (stateful) regexp_set_last_index_value(receiver, tsc_value_num(0));
        return NULL;
    }
    size_t offset = (size_t)last_index;
    if ((re->unicode || re->unicode_sets) && offset > 0 && offset < len &&
        units[offset] >= 0xdc00 && units[offset] <= 0xdfff &&
        units[offset - 1] >= 0xd800 && units[offset - 1] <= 0xdbff) offset--;
    if (!regexp_find(re, units, len, offset, re->sticky, captures)) {
        if (stateful) regexp_set_last_index_value(receiver, tsc_value_num(0));
        return NULL;
    }
    if (stateful) regexp_set_last_index_value(receiver, tsc_value_num((double)captures[1]));
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
        void* volatile exec_gc_root = tsc_value_gc_root(exec);
        (void)exec_gc_root;
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
tsc_value_t tsc_regexp_match_apply(void* env, tsc_value_t receiver, tsc_array_t* args) {
    (void)env;
    if (!tsc_value_is_object(receiver))
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("RegExp match called on non-object"));
    tsc_str_t* string = tsc_value_to_string(args && args->len ? TSC_ARR(tsc_value_t, args, 0) : tsc_value_undefined());
    tsc_str_t* flags = tsc_value_to_string(tsc_value_get_prop(receiver, tsc_str_from_lit("flags", 5)));
    if (!tsc_str_includes(flags, tsc_str_from_lit("g", 1), 0)) return regexp_exec_value(receiver, string);
    bool unicode = tsc_str_includes(flags, tsc_str_from_lit("u", 1), 0) ||
                   tsc_str_includes(flags, tsc_str_from_lit("v", 1), 0);
    regexp_set_last_index_value(receiver, tsc_value_num(0));
    tsc_array_t* matches = tsc_array_new(sizeof(tsc_value_t), 4);
    size_t len; const uint16_t* units = tsc_str_utf16_units(string, &len);
    for (;;) {
        tsc_value_t result = regexp_exec_value(receiver, string);
        if (result == tsc_value_null()) return matches->len ? tsc_value_array(matches) : tsc_value_null();
        tsc_str_t* match = tsc_value_to_string(tsc_value_get_prop(result, tsc_str_from_lit("0", 1)));
        tsc_array_push_value(matches, tsc_value_string(match));
        if (!match->len) {
            double index = tsc_value_to_length(tsc_value_get_prop(receiver, tsc_str_from_lit("lastIndex", 9)));
            regexp_set_last_index_value(receiver, tsc_value_num(regexp_advance(units, len, index, unicode)));
        }
    }
}
tsc_value_t tsc_regexp_search_apply(void* env, tsc_value_t receiver, tsc_array_t* args) {
    (void)env;
    if (!tsc_value_is_object(receiver))
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("RegExp search called on non-object"));
    tsc_str_t* string = tsc_value_to_string(args && args->len ? TSC_ARR(tsc_value_t, args, 0) : tsc_value_undefined());
    tsc_str_t* key = tsc_str_from_lit("lastIndex", 9);
    tsc_value_t previous = tsc_value_get_prop(receiver, key);
    if (!tsc_value_object_is(previous, tsc_value_num(0)))
        regexp_set_last_index_value(receiver, tsc_value_num(0));
    tsc_value_t result = regexp_exec_value(receiver, string);
    tsc_value_t current = tsc_value_get_prop(receiver, key);
    if (!tsc_value_object_is(current, previous)) regexp_set_last_index_value(receiver, previous);
    return result == tsc_value_null() ? tsc_value_num(-1) :
        tsc_value_get_prop(result, tsc_str_from_lit("index", 5));
}
/* Every matchAll invocation owns one matcher/string/state record. The next
 * operation performs precisely one ordinary RegExpExec, without a result
 * count, capture count, pattern shape or native/custom matcher path. */
typedef struct {
    tsc_value_t matcher;
    void* matcher_gc_root;
    tsc_str_t* string;
    bool global, unicode, done;
} regexp_string_iterator_t;

static const char regexp_string_iterator_prototype_key = 0;

static tsc_value_t regexp_string_iterator_next(void* env, tsc_value_t receiver, tsc_array_t* args) {
    (void)env; (void)args;
    if (!value_is_box(receiver) || value_tag(receiver) != TSC_VALUE_TAG_OBJECT ||
        !((tsc_object_t*)value_ptr(receiver))->is_regexp_string_iterator)
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("RegExp String Iterator next called on incompatible receiver"));
    void* volatile receiver_gc_root = tsc_value_gc_root(receiver);
    (void)receiver_gc_root;
    regexp_string_iterator_t* state = ((tsc_object_t*)value_ptr(receiver))->class_ptr;
    if (state->done) return tsc_iterator_result(tsc_value_undefined(), true);
    tsc_value_t matcher = state->matcher;
    tsc_str_t* string = state->string;
    tsc_value_t match = regexp_exec_value(matcher, string);
    void* volatile match_gc_root = tsc_value_gc_root(match);
    (void)match_gc_root;
    if (match == tsc_value_null()) {
        state->done = true;
        return tsc_iterator_result(tsc_value_undefined(), true);
    }
    if (!state->global) state->done = true;
    else {
        tsc_str_t* matched = tsc_value_to_string(tsc_value_get_index(match, 0));
        if (!tsc_str_length(matched)) {
            double index = tsc_value_to_length(tsc_value_get_prop(matcher, tsc_str_from_lit("lastIndex", 9)));
            size_t length; const uint16_t* units = tsc_str_utf16_units(string, &length);
            regexp_set_last_index_value(matcher, tsc_value_num(regexp_advance(units, length, index, state->unicode)));
        }
    }
    return tsc_iterator_result(match, false);
}

static tsc_value_t regexp_string_iterator_prototype(void) {
    tsc_object_t* prototype = tsc_realm_state_get(&regexp_string_iterator_prototype_key);
    if (!prototype) {
        prototype = tsc_object_new_with_prototype(tsc_iterator_prototype_value());
        tsc_realm_state_set(&regexp_string_iterator_prototype_key, prototype);
        tsc_object_define(prototype, tsc_str_from_lit("next", 4),
            tsc_value_function_builtin_named(regexp_string_iterator_next, NULL, 0,
                tsc_str_from_lit("next", 4)), true, false, true);
        tsc_object_define(prototype, tsc_symbol_property_key(tsc_symbol_to_string_tag()),
            tsc_value_string(tsc_str_from_lit("RegExp String Iterator", 22)), false, false, true);
    }
    return tsc_value_object(prototype);
}

tsc_value_t tsc_regexp_match_all_apply(void* env, tsc_value_t receiver, tsc_array_t* args) {
    (void)env;
    if (!tsc_value_is_object(receiver))
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("RegExp matchAll called on non-object"));
    tsc_str_t* string = tsc_value_to_string(args && args->len ? TSC_ARR(tsc_value_t, args, 0) : tsc_value_undefined());
    tsc_str_t* volatile string_gc_root = string;
    (void)string_gc_root;
    tsc_value_t constructor = tsc_value_species_constructor(receiver, tsc_regexp_constructor_value());
    void* volatile constructor_gc_root = tsc_value_gc_root(constructor);
    (void)constructor_gc_root;
    tsc_str_t* flags = tsc_value_to_string(tsc_value_get_prop(receiver, tsc_str_from_lit("flags", 5)));
    tsc_str_t* volatile flags_gc_root = flags;
    (void)flags_gc_root;
    tsc_array_t* constructor_args = tsc_array_new(sizeof(tsc_value_t), 2);
    tsc_array_push_value(constructor_args, receiver);
    tsc_array_push_value(constructor_args, tsc_value_string(flags));
    tsc_value_t matcher = tsc_value_construct(constructor, tsc_value_array(constructor_args));
    void* volatile matcher_gc_root = tsc_value_gc_root(matcher);
    (void)matcher_gc_root;
    double last_index = tsc_value_to_length(tsc_value_get_prop(receiver, tsc_str_from_lit("lastIndex", 9)));
    regexp_set_last_index_value(matcher, tsc_value_num(last_index));
    bool global = tsc_str_includes(flags, tsc_str_from_lit("g", 1), 0);
    bool unicode = tsc_str_includes(flags, tsc_str_from_lit("u", 1), 0) || tsc_str_includes(flags, tsc_str_from_lit("v", 1), 0);
    regexp_string_iterator_t* state = TSC_GC_MALLOC(sizeof(*state));
    state->matcher = matcher;
    state->matcher_gc_root = tsc_value_gc_root(matcher);
    state->string = string;
    state->global = global;
    state->unicode = unicode;
    state->done = false;
    tsc_object_t* iterator = tsc_object_new_with_prototype(regexp_string_iterator_prototype());
    iterator->is_regexp_string_iterator = true;
    iterator->class_ptr = state;
    return tsc_value_object(iterator);
}
/* GetSubstitution consumes captures as an ordered List of String/undefined
 * values, independent of native match storage or the number of captures. */
tsc_str_t* tsc_string_get_substitution(const tsc_str_t* matched, const tsc_str_t* string,
    size_t position, const tsc_array_t* captures, tsc_value_t named, const tsc_str_t* replacement) {
    size_t len, match_len, replacement_len;
    const uint16_t* units = tsc_str_utf16_units(string, &len);
    const uint16_t* match_units = tsc_str_utf16_units(matched, &match_len);
    const uint16_t* template = tsc_str_utf16_units(replacement, &replacement_len);
    size_t count = captures ? captures->len : 0;
    void* volatile named_root = tsc_value_gc_root(named); (void)named_root;
    regexp_output_t output = {0};
    for (size_t index = 0; index < replacement_len; index++) {
        if (template[index] != '$' || index + 1 == replacement_len) {
            regexp_append(&output, template, index, 1); continue;
        }
        uint16_t next = template[index + 1];
        size_t consumed = 2;
        tsc_value_t capture = tsc_value_undefined();
        if (next == '$') regexp_output_unit(&output, '$');
        else if (next == '&') regexp_append(&output, match_units, 0, match_len);
        else if (next == '`') regexp_append(&output, units, 0, position);
        else if (next == '\'') {
            size_t tail = match_len > len - position ? len : position + match_len;
            regexp_append(&output, units, tail, len - tail);
        } else if (next >= '0' && next <= '9') {
            size_t number = next - '0';
            if (index + 2 < replacement_len && template[index + 2] >= '0' && template[index + 2] <= '9') {
                size_t pair = number * 10 + template[index + 2] - '0';
                if (pair <= count) { number = pair; consumed = 3; }
            }
            if (!number || number > count) {
                regexp_append(&output, template, index, consumed);
            } else capture = TSC_ARR(tsc_value_t, captures, number - 1);
        } else if (next == '<' && !tsc_value_is_undefined(named)) {
            size_t close = index + 2;
            while (close < replacement_len && template[close] != '>') close++;
            if (close == replacement_len) { regexp_append(&output, template, index, 1); continue; }
            tsc_str_t* name = tsc_str_from_units_range(template, index + 2, close - index - 2);
            capture = tsc_value_get_prop(named, name);
            consumed = close - index + 1;
        } else { regexp_append(&output, template, index, 1); continue; }
        if (!tsc_value_is_undefined(capture)) {
            tsc_str_t* text = tsc_value_to_string(capture);
            size_t text_len; const uint16_t* text_units = tsc_str_utf16_units(text, &text_len);
            regexp_append(&output, text_units, 0, text_len);
        }
        index += consumed - 1;
    }
    return tsc_str_from_units_range(output.units, 0, output.len);
}

tsc_value_t tsc_regexp_replace_apply(void* env, tsc_value_t receiver, tsc_array_t* args) {
    (void)env;
    if (!tsc_value_is_object(receiver))
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("RegExp replace called on non-object"));
    tsc_str_t* string = tsc_value_to_string(args && args->len ? TSC_ARR(tsc_value_t, args, 0) : tsc_value_undefined());
    tsc_value_t replacement = args && args->len > 1 ? TSC_ARR(tsc_value_t, args, 1) : tsc_value_undefined();
    bool functional = tsc_value_is_callable(replacement);
    tsc_str_t* replacement_string = functional ? NULL : tsc_value_to_string(replacement);
    tsc_str_t* flags = tsc_value_to_string(tsc_value_get_prop(receiver, tsc_str_from_lit("flags", 5)));
    bool global = tsc_str_includes(flags, tsc_str_from_lit("g", 1), 0);
    bool unicode = tsc_str_includes(flags, tsc_str_from_lit("u", 1), 0) || tsc_str_includes(flags, tsc_str_from_lit("v", 1), 0);
    if (global) regexp_set_last_index_value(receiver, tsc_value_num(0));
    size_t len; const uint16_t* units = tsc_str_utf16_units(string, &len);
    tsc_array_t* results = tsc_array_new(sizeof(tsc_value_t), 4);
    for (;;) {
        tsc_value_t result = regexp_exec_value(receiver, string);
        if (result == tsc_value_null()) break;
        tsc_array_push_value(results, result);
        if (!global) break;
        tsc_str_t* matched = tsc_value_to_string(tsc_value_get_index(result, 0));
        if (!tsc_str_length(matched)) {
            double index = tsc_value_to_length(tsc_value_get_prop(receiver, tsc_str_from_lit("lastIndex", 9)));
            regexp_set_last_index_value(receiver, tsc_value_num(regexp_advance(units, len, index, unicode)));
        }
    }
    regexp_output_t output = {0}; size_t copied = 0;
    for (size_t index = 0; index < results->len; index++) {
        tsc_value_t result = TSC_ARR(tsc_value_t, results, index);
        double result_len = tsc_value_to_length(tsc_value_get_prop(result, tsc_str_from_lit("length", 6)));
        tsc_str_t* matched = tsc_value_to_string(tsc_value_get_index(result, 0));
        size_t match_len = (size_t)tsc_str_length(matched);
        double position_number = tsc_value_to_number(tsc_value_get_prop(result, tsc_str_from_lit("index", 5)));
        size_t position = isnan(position_number) || position_number <= 0 ? 0 :
            position_number >= (double)len ? len : (size_t)floor(position_number);
        tsc_array_t* captures = tsc_array_new(sizeof(tsc_value_t), 4);
        for (double capture_index = 1; capture_index < result_len; capture_index++) {
            tsc_value_t capture = tsc_value_get_index(result, capture_index);
            if (!tsc_value_is_undefined(capture)) capture = tsc_value_string(tsc_value_to_string(capture));
            tsc_array_push_value(captures, capture);
        }
        tsc_value_t named = tsc_value_get_prop(result, tsc_str_from_lit("groups", 6));
        tsc_str_t* text;
        if (functional) {
            tsc_array_t* callback_args = tsc_array_new(sizeof(tsc_value_t), 4);
            tsc_array_push_value(callback_args, tsc_value_string(matched));
            for (size_t capture_index = 0; capture_index < captures->len; capture_index++)
                tsc_array_push_value(callback_args, TSC_ARR(tsc_value_t, captures, capture_index));
            tsc_array_push_value(callback_args, tsc_value_num((double)position));
            tsc_array_push_value(callback_args, tsc_value_string(string));
            if (!tsc_value_is_undefined(named)) tsc_array_push_value(callback_args, named);
            text = tsc_value_to_string(tsc_value_apply_function(replacement, tsc_value_undefined(), tsc_value_array(callback_args)));
        } else {
            if (!tsc_value_is_undefined(named)) named = tsc_value_to_object(named);
            text = tsc_string_get_substitution(matched, string, position, captures, named, replacement_string);
        }
        if (position >= copied) {
            regexp_append(&output, units, copied, position - copied);
            size_t text_len; const uint16_t* text_units = tsc_str_utf16_units(text, &text_len);
            regexp_append(&output, text_units, 0, text_len);
            copied = match_len > SIZE_MAX - position ? SIZE_MAX : position + match_len;
        }
    }
    if (copied < len) regexp_append(&output, units, copied, len - copied);
    return tsc_value_string(tsc_str_from_units_range(output.units, 0, output.len));
}

tsc_value_t tsc_regexp_split_apply(void* env, tsc_value_t receiver, tsc_array_t* args) {
    (void)env;
    if (!tsc_value_is_object(receiver))
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("RegExp split called on non-object"));
    tsc_str_t* volatile string = tsc_value_to_string(args && args->len ? TSC_ARR(tsc_value_t, args, 0) : tsc_value_undefined());
    tsc_value_t constructor = tsc_value_species_constructor(receiver, tsc_regexp_constructor_value());
    void* volatile constructor_root = tsc_value_gc_root(constructor);
    tsc_str_t* volatile flags = tsc_value_to_string(tsc_value_get_prop(receiver, tsc_str_from_lit("flags", 5)));
    bool unicode = tsc_str_includes(flags, tsc_str_from_lit("u", 1), 0) || tsc_str_includes(flags, tsc_str_from_lit("v", 1), 0);
    if (!tsc_str_includes(flags, tsc_str_from_lit("y", 1), 0)) flags = tsc_str_concat(flags, tsc_str_from_lit("y", 1));
    tsc_array_t* volatile actual = tsc_array_new(sizeof(tsc_value_t), 2);
    tsc_array_push_value(actual, receiver); tsc_array_push_value(actual, tsc_value_string(flags));
    tsc_value_t splitter = tsc_value_construct(constructor, tsc_value_array(actual));
    void* volatile splitter_root = tsc_value_gc_root(splitter);
    tsc_array_t* volatile result = tsc_array_new(sizeof(tsc_value_t), 0);
    tsc_array_use_value_storage(result);
    uint32_t limit = split_limit_from_value(args && args->len > 1 ? TSC_ARR(tsc_value_t, args, 1) : tsc_value_undefined());
    if (!limit) return tsc_value_array(result);
    size_t length; const uint16_t* units = tsc_str_utf16_units(string, &length);
    if (!length) {
        if (regexp_exec_value(splitter, string) == tsc_value_null()) tsc_array_push_value(result, tsc_value_string(string));
        return tsc_value_array(result);
    }
    size_t copied = 0, offset = 0;
    while (offset < length) {
        regexp_set_last_index_value(splitter, tsc_value_num(offset));
        tsc_value_t match = regexp_exec_value(splitter, string);
        void* volatile match_root = tsc_value_gc_root(match);
        if (match == tsc_value_null()) offset = (size_t)regexp_advance(units, length, offset, unicode);
        else {
            double end_number = tsc_value_to_length(tsc_value_get_prop(splitter, tsc_str_from_lit("lastIndex", 9)));
            size_t end = end_number >= (double)length ? length : (size_t)end_number;
            if (end == copied) offset = (size_t)regexp_advance(units, length, offset, unicode);
            else {
                tsc_array_push_value(result, tsc_value_string(tsc_str_from_units_range(units, copied, offset - copied)));
                if (result->len == limit) return tsc_value_array(result);
                copied = end;
                size_t captures = tsc_value_length_of_array_like(match);
                for (size_t index = 1; index < captures; ++index) {
                    tsc_array_push_value(result, tsc_value_get_index(match, index));
                    if (result->len == limit) return tsc_value_array(result);
                }
                offset = copied;
            }
        }
        (void)match_root;
    }
    tsc_array_push_value(result, tsc_value_string(tsc_str_from_units_range(units, copied, length - copied)));
    (void)constructor_root; (void)splitter_root;
    return tsc_value_array(result);
}
