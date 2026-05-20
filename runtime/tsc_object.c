#include "tsc_internal.h"


tsc_object_t* tsc_object_new(void) {
    tsc_object_t* o = (tsc_object_t*)TSC_GC_MALLOC(sizeof(tsc_object_t));
    o->len = 0;
    o->cap = 4;
    o->extensible = true;
    o->prototype = tsc_value_null();
    o->props = (tsc_object_prop_t*)TSC_GC_MALLOC(sizeof(tsc_object_prop_t) * o->cap);
    return o;
}

void object_reserve(tsc_object_t* o, size_t cap) {
    if (cap <= o->cap) return;
    size_t next = o->cap ? o->cap : 4;
    while (next < cap) next *= 2;
    tsc_object_prop_t* props = (tsc_object_prop_t*)TSC_GC_MALLOC(sizeof(tsc_object_prop_t) * next);
    if (o->props && o->len > 0) memcpy(props, o->props, sizeof(tsc_object_prop_t) * o->len);
    o->props = props;
    o->cap = next;
}

ssize_t object_find(const tsc_object_t* o, const tsc_str_t* key) {
    if (!o) return -1;
    for (size_t i = 0; i < o->len; i++) {
        if (tsc_str_eq(o->props[i].key, key)) return (ssize_t)i;
    }
    return -1;
}

const tsc_object_t* object_prototype_object(const tsc_object_t* o) {
    if (!o || !value_is_object_value(o->prototype)) return NULL;
    return (const tsc_object_t*)value_ptr(o->prototype);
}

const tsc_object_prop_t* object_find_chain_prop(const tsc_object_t* o, const tsc_str_t* key) {
    const tsc_object_t* cur = o;
    while (cur) {
        ssize_t found = object_find(cur, key);
        if (found >= 0) return &cur->props[(size_t)found];
        cur = object_prototype_object(cur);
    }
    return NULL;
}

bool object_chain_contains(tsc_value_t prototype, const tsc_object_t* needle) {
    while (value_is_object_value(prototype)) {
        const tsc_object_t* cur = (const tsc_object_t*)value_ptr(prototype);
        if (cur == needle) return true;
        prototype = cur->prototype;
    }
    return false;
}

bool tsc_object_is_prototype_of(const tsc_object_t* prototype, const tsc_object_t* object) {
    if (!prototype || !object) return false;
    return object_chain_contains(object->prototype, prototype);
}

bool object_set_own_data(tsc_object_t* o, tsc_str_t* key, tsc_value_t value) {
    ssize_t found = object_find(o, key);
    if (found >= 0) {
        tsc_object_prop_t* prop = &o->props[(size_t)found];
        if (prop->accessor || !prop->writable) return false;
        prop->value = value;
        return true;
    }
    if (!o->extensible) return false;
    object_reserve(o, o->len + 1);
    o->props[o->len].key = key;
    o->props[o->len].value = value;
    o->props[o->len].accessor = false;
    o->props[o->len].getter = NULL;
    o->props[o->len].getter_env = NULL;
    o->props[o->len].getter_value = tsc_value_undefined();
    o->props[o->len].setter = NULL;
    o->props[o->len].setter_env = NULL;
    o->props[o->len].setter_value = tsc_value_undefined();
    o->props[o->len].writable = true;
    o->props[o->len].enumerable = true;
    o->props[o->len].configurable = true;
    o->len++;
    return true;
}

bool value_set_receiver_own_data(tsc_value_t receiver, tsc_str_t* key, tsc_value_t value) {
    if (value_is_box(receiver) && value_tag(receiver) == TSC_VALUE_TAG_OBJECT) {
        return object_set_own_data((tsc_object_t*)value_ptr(receiver), key, value);
    }
    if (value_is_box(receiver) && value_tag(receiver) == TSC_VALUE_TAG_ARRAY) {
        return tsc_value_set_prop(receiver, key, value);
    }
    return false;
}

bool tsc_object_set_receiver(tsc_object_t* o, tsc_str_t* key, tsc_value_t value, tsc_value_t receiver) {
    const tsc_object_prop_t* prop = object_find_chain_prop(o, key);
    if (prop) {
        if (prop->accessor) {
            return prop->setter ? prop->setter(prop->setter_env, receiver, value) : false;
        }
        if (!prop->writable) return false;
        return value_set_receiver_own_data(receiver, key, value);
    }
    return value_set_receiver_own_data(receiver, key, value);
}

bool tsc_object_set(tsc_object_t* o, tsc_str_t* key, tsc_value_t value) {
    return tsc_object_set_receiver(o, key, value, tsc_value_object(o));
}

bool tsc_object_define_desc(tsc_object_t* o, tsc_str_t* key, tsc_value_t value, bool has_value, bool writable, bool has_writable, bool enumerable, bool has_enumerable, bool configurable, bool has_configurable) {
    ssize_t found = object_find(o, key);
    if (found >= 0) {
        tsc_object_prop_t* prop = &o->props[(size_t)found];
        tsc_value_t next_value = has_value ? value : prop->value;
        bool next_writable = has_writable ? writable : prop->writable;
        bool next_enumerable = has_enumerable ? enumerable : prop->enumerable;
        bool next_configurable = has_configurable ? configurable : prop->configurable;
        if (!prop->configurable) {
            if (prop->accessor) return false;
            if (next_configurable || next_enumerable != prop->enumerable) return false;
            if (!prop->writable) {
                if (next_writable) return false;
                if (!tsc_value_object_is(prop->value, next_value)) return false;
            }
            prop->value = next_value;
            prop->writable = next_writable;
            return true;
        }
        prop->value = next_value;
        prop->accessor = false;
        prop->getter = NULL;
        prop->getter_env = NULL;
        prop->getter_value = tsc_value_undefined();
        prop->setter = NULL;
        prop->setter_env = NULL;
        prop->setter_value = tsc_value_undefined();
        prop->writable = next_writable;
        prop->enumerable = next_enumerable;
        prop->configurable = next_configurable;
        return true;
    }
    if (!o->extensible) return false;
    object_reserve(o, o->len + 1);
    o->props[o->len].key = key;
    o->props[o->len].value = has_value ? value : tsc_value_undefined();
    o->props[o->len].accessor = false;
    o->props[o->len].getter = NULL;
    o->props[o->len].getter_env = NULL;
    o->props[o->len].getter_value = tsc_value_undefined();
    o->props[o->len].setter = NULL;
    o->props[o->len].setter_env = NULL;
    o->props[o->len].setter_value = tsc_value_undefined();
    o->props[o->len].writable = has_writable ? writable : false;
    o->props[o->len].enumerable = has_enumerable ? enumerable : false;
    o->props[o->len].configurable = has_configurable ? configurable : false;
    o->len++;
    return true;
}

bool tsc_object_define(tsc_object_t* o, tsc_str_t* key, tsc_value_t value, bool writable, bool enumerable, bool configurable) {
    return tsc_object_define_desc(o, key, value, true, writable, true, enumerable, true, configurable, true);
}

bool tsc_object_define_accessor(tsc_object_t* o, tsc_str_t* key, tsc_accessor_getter_t getter, void* getter_env, bool has_getter, tsc_accessor_setter_t setter, void* setter_env, bool has_setter, bool enumerable, bool has_enumerable, bool configurable, bool has_configurable) {
    ssize_t found = object_find(o, key);
    if (found >= 0) {
        tsc_object_prop_t* prop = &o->props[(size_t)found];
        if (!prop->configurable) {
            if (!prop->accessor) return false;
            if (has_configurable && configurable) return false;
            if (has_enumerable && enumerable != prop->enumerable) return false;
            if (
                (has_getter && (getter != prop->getter || getter_env != prop->getter_env)) ||
                (has_setter && (setter != prop->setter || setter_env != prop->setter_env))
            ) {
                return false;
            }
            return true;
        }
        tsc_accessor_getter_t next_getter = has_getter ? getter : (prop->accessor ? prop->getter : NULL);
        void* next_getter_env = has_getter ? getter_env : (prop->accessor ? prop->getter_env : NULL);
        tsc_accessor_setter_t next_setter = has_setter ? setter : (prop->accessor ? prop->setter : NULL);
        void* next_setter_env = has_setter ? setter_env : (prop->accessor ? prop->setter_env : NULL);
        bool next_enumerable = has_enumerable ? enumerable : prop->enumerable;
        bool next_configurable = has_configurable ? configurable : prop->configurable;
        prop->value = tsc_value_undefined();
        prop->accessor = true;
        prop->getter = next_getter;
        prop->getter_env = next_getter_env;
        prop->getter_value = value_accessor_getter_identity(next_getter, next_getter_env);
        prop->setter = next_setter;
        prop->setter_env = next_setter_env;
        prop->setter_value = value_accessor_setter_identity(next_setter, next_setter_env);
        prop->writable = false;
        prop->enumerable = next_enumerable;
        prop->configurable = next_configurable;
        return true;
    }
    if (!o->extensible) return false;
    object_reserve(o, o->len + 1);
    o->props[o->len].key = key;
    o->props[o->len].value = tsc_value_undefined();
    o->props[o->len].accessor = true;
    o->props[o->len].getter = has_getter ? getter : NULL;
    o->props[o->len].getter_env = has_getter ? getter_env : NULL;
    o->props[o->len].getter_value = value_accessor_getter_identity(o->props[o->len].getter, o->props[o->len].getter_env);
    o->props[o->len].setter = has_setter ? setter : NULL;
    o->props[o->len].setter_env = has_setter ? setter_env : NULL;
    o->props[o->len].setter_value = value_accessor_setter_identity(o->props[o->len].setter, o->props[o->len].setter_env);
    o->props[o->len].writable = false;
    o->props[o->len].enumerable = has_enumerable ? enumerable : false;
    o->props[o->len].configurable = has_configurable ? configurable : false;
    o->len++;
    return true;
}

tsc_value_t tsc_object_get_prototype_of(const tsc_object_t* o) {
    return o ? o->prototype : tsc_value_undefined();
}

bool tsc_object_set_prototype_of(tsc_object_t* o, tsc_value_t prototype) {
    if (!o || !value_is_valid_prototype(prototype)) return false;
    if (o->prototype == prototype) return true;
    if (!o->extensible) return false;
    if (object_chain_contains(prototype, o)) return false;
    o->prototype = prototype;
    return true;
}

tsc_value_t tsc_object_get_receiver(const tsc_object_t* o, const tsc_str_t* key, tsc_value_t receiver) {
    const tsc_object_prop_t* prop = object_find_chain_prop(o, key);
    if (prop) {
        if (prop->accessor) return prop->getter ? prop->getter(prop->getter_env, receiver) : tsc_value_undefined();
        return prop->value;
    }
    return tsc_value_undefined();
}

tsc_value_t tsc_object_get(const tsc_object_t* o, const tsc_str_t* key) {
    return tsc_object_get_receiver(o, key, tsc_value_object((tsc_object_t*)o));
}

bool tsc_object_has_own(const tsc_object_t* o, const tsc_str_t* key) {
    return object_find(o, key) >= 0;
}

bool tsc_object_property_is_enumerable(const tsc_object_t* o, const tsc_str_t* key) {
    ssize_t found = object_find(o, key);
    return found >= 0 && o->props[(size_t)found].enumerable;
}

bool tsc_object_has(const tsc_object_t* o, const tsc_str_t* key) {
    return object_find_chain_prop(o, key) != NULL;
}

bool tsc_object_delete(tsc_object_t* o, const tsc_str_t* key) {
    ssize_t found = object_find(o, key);
    if (found < 0) return true;
    size_t idx = (size_t)found;
    if (!o->props[idx].configurable) return false;
    for (size_t i = idx + 1; i < o->len; i++) {
        o->props[i - 1] = o->props[i];
    }
    o->len--;
    return true;
}

bool tsc_object_is_extensible(const tsc_object_t* o) {
    return o && o->extensible;
}

bool tsc_object_prevent_extensions(tsc_object_t* o) {
    if (!o) return false;
    o->extensible = false;
    return true;
}

bool tsc_object_seal(tsc_object_t* o) {
    if (!o) return false;
    o->extensible = false;
    for (size_t i = 0; i < o->len; i++) {
        o->props[i].configurable = false;
    }
    return true;
}

bool tsc_object_freeze(tsc_object_t* o) {
    if (!tsc_object_seal(o)) return false;
    for (size_t i = 0; i < o->len; i++) {
        o->props[i].writable = false;
    }
    return true;
}

bool tsc_object_is_sealed(const tsc_object_t* o) {
    if (!o || o->extensible) return false;
    for (size_t i = 0; i < o->len; i++) {
        if (o->props[i].configurable) return false;
    }
    return true;
}

bool tsc_object_is_frozen(const tsc_object_t* o) {
    if (!tsc_object_is_sealed(o)) return false;
    for (size_t i = 0; i < o->len; i++) {
        if (!o->props[i].accessor && o->props[i].writable) return false;
    }
    return true;
}

tsc_array_t* tsc_object_keys_dyn(const tsc_object_t* o) {
    tsc_array_t* a = tsc_array_new(sizeof(tsc_str_t*), o ? o->len : 1);
    if (!o) return a;
    for (size_t i = 0; i < o->len; i++) {
        if (!o->props[i].enumerable) continue;
        tsc_str_t* key = o->props[i].key;
        tsc_array_push_raw(a, &key);
    }
    return a;
}

tsc_array_t* tsc_object_own_keys_dyn(const tsc_object_t* o) {
    tsc_array_t* a = tsc_array_new(sizeof(tsc_str_t*), o ? o->len : 1);
    if (!o) return a;
    for (size_t i = 0; i < o->len; i++) {
        tsc_str_t* key = o->props[i].key;
        tsc_array_push_raw(a, &key);
    }
    return a;
}

tsc_array_t* tsc_object_values_dyn(const tsc_object_t* o) {
    tsc_array_t* a = tsc_array_new(sizeof(tsc_value_t), o ? o->len : 1);
    if (!o) return a;
    for (size_t i = 0; i < o->len; i++) {
        if (!o->props[i].enumerable) continue;
        tsc_value_t v = tsc_object_get(o, o->props[i].key);
        tsc_array_push_raw(a, &v);
    }
    return a;
}

tsc_array_t* tsc_object_entries_dyn(const tsc_object_t* o) {
    tsc_array_t* a = tsc_array_new(sizeof(tsc_value_t), o ? o->len : 1);
    if (!o) return a;
    for (size_t i = 0; i < o->len; i++) {
        if (!o->props[i].enumerable) continue;
        tsc_array_t* pair = tsc_array_new(sizeof(tsc_value_t), 2);
        tsc_value_t key = tsc_value_string(o->props[i].key);
        tsc_value_t value = tsc_object_get(o, o->props[i].key);
        tsc_array_push_raw(pair, &key);
        tsc_array_push_raw(pair, &value);
        tsc_value_t boxed = tsc_value_array(pair);
        tsc_array_push_raw(a, &boxed);
    }
    return a;
}

bool value_json_omits_object_property(tsc_value_t v) {
    return value_is_box(v) && (value_tag(v) == TSC_VALUE_TAG_UNDEFINED || value_tag(v) == TSC_VALUE_TAG_FUNCTION);
}

tsc_str_t* tsc_value_json_stringify(tsc_value_t v) {
    if (!value_is_box(v)) return tsc_json_num(value_as_num(v));
    switch (value_tag(v)) {
        case TSC_VALUE_TAG_FUNCTION:
        case TSC_VALUE_TAG_UNDEFINED:
        case TSC_VALUE_TAG_NULL:
            return tsc_str_from_lit("null", 4);
        case TSC_VALUE_TAG_FALSE:
            return tsc_str_from_lit("false", 5);
        case TSC_VALUE_TAG_TRUE:
            return tsc_str_from_lit("true", 4);
        case TSC_VALUE_TAG_STRING:
            return tsc_json_escape_string((tsc_str_t*)value_ptr(v));
        case TSC_VALUE_TAG_ARRAY: {
            tsc_array_t* a = (tsc_array_t*)value_ptr(v);
            tsc_str_t* out = tsc_str_from_lit("[", 1);
            for (size_t i = 0; i < a->len; i++) {
                if (i > 0) out = tsc_str_concat(out, tsc_str_from_lit(",", 1));
                out = tsc_str_concat(out, tsc_value_json_stringify(TSC_ARR(tsc_value_t, a, i)));
            }
            return tsc_str_concat(out, tsc_str_from_lit("]", 1));
        }
        case TSC_VALUE_TAG_OBJECT: {
            tsc_object_t* o = (tsc_object_t*)value_ptr(v);
            tsc_str_t* out = tsc_str_from_lit("{", 1);
            bool first = true;
            for (size_t i = 0; i < o->len; i++) {
                if (!o->props[i].enumerable) continue;
                tsc_value_t prop_value = tsc_object_get(o, o->props[i].key);
                if (value_json_omits_object_property(prop_value)) continue;
                if (!first) out = tsc_str_concat(out, tsc_str_from_lit(",", 1));
                first = false;
                out = tsc_str_concat(out, tsc_json_escape_string(o->props[i].key));
                out = tsc_str_concat(out, tsc_str_from_lit(":", 1));
                out = tsc_str_concat(out, tsc_value_json_stringify(prop_value));
            }
            return tsc_str_concat(out, tsc_str_from_lit("}", 1));
        }
    }
    return tsc_str_from_lit("null", 4);
}



void jp_ws(json_parser_t* p) {
    while (p->pos < p->len && isspace((unsigned char)p->s[p->pos])) p->pos++;
}

bool jp_lit(json_parser_t* p, const char* lit) {
    size_t n = strlen(lit);
    if (p->pos + n <= p->len && memcmp(p->s + p->pos, lit, n) == 0) {
        p->pos += n;
        return true;
    }
    return false;
}

tsc_value_t jp_value(json_parser_t* p);

tsc_str_t* jp_string(json_parser_t* p) {
    if (p->pos >= p->len || p->s[p->pos] != '"') tsc_panic("JSON.parse expected string");
    p->pos++;
    char* buf = (char*)TSC_GC_MALLOC_ATOMIC(p->len - p->pos + 1);
    size_t out = 0;
    while (p->pos < p->len) {
        unsigned char c = (unsigned char)p->s[p->pos++];
        if (c == '"') {
            tsc_str_t* s = str_alloc(out);
            memcpy((char*)s->data, buf, out);
            return s;
        }
        if (c == '\\') {
            if (p->pos >= p->len) tsc_panic("JSON.parse bad escape");
            c = (unsigned char)p->s[p->pos++];
            switch (c) {
                case '"': buf[out++] = '"'; break;
                case '\\': buf[out++] = '\\'; break;
                case '/': buf[out++] = '/'; break;
                case 'b': buf[out++] = '\b'; break;
                case 'f': buf[out++] = '\f'; break;
                case 'n': buf[out++] = '\n'; break;
                case 'r': buf[out++] = '\r'; break;
                case 't': buf[out++] = '\t'; break;
                default: tsc_panic("JSON.parse unsupported escape");
            }
        } else {
            buf[out++] = (char)c;
        }
    }
    tsc_panic("JSON.parse unterminated string");
    return tsc_str_from_lit("", 0);
}

tsc_value_t jp_array(json_parser_t* p) {
    p->pos++;
    tsc_array_t* a = tsc_array_new(sizeof(tsc_value_t), 4);
    jp_ws(p);
    if (p->pos < p->len && p->s[p->pos] == ']') {
        p->pos++;
        return tsc_value_array(a);
    }
    while (p->pos < p->len) {
        tsc_value_t v = jp_value(p);
        tsc_array_push_raw(a, &v);
        jp_ws(p);
        if (p->pos < p->len && p->s[p->pos] == ',') {
            p->pos++;
            continue;
        }
        if (p->pos < p->len && p->s[p->pos] == ']') {
            p->pos++;
            return tsc_value_array(a);
        }
        tsc_panic("JSON.parse expected array separator");
    }
    tsc_panic("JSON.parse unterminated array");
    return tsc_value_array(a);
}

tsc_value_t jp_object(json_parser_t* p) {
    p->pos++;
    tsc_object_t* o = tsc_object_new();
    jp_ws(p);
    if (p->pos < p->len && p->s[p->pos] == '}') {
        p->pos++;
        return tsc_value_object(o);
    }
    while (p->pos < p->len) {
        jp_ws(p);
        tsc_str_t* key = jp_string(p);
        jp_ws(p);
        if (p->pos >= p->len || p->s[p->pos] != ':') tsc_panic("JSON.parse expected ':'");
        p->pos++;
        tsc_value_t value = jp_value(p);
        tsc_object_set(o, key, value);
        jp_ws(p);
        if (p->pos < p->len && p->s[p->pos] == ',') {
            p->pos++;
            continue;
        }
        if (p->pos < p->len && p->s[p->pos] == '}') {
            p->pos++;
            return tsc_value_object(o);
        }
        tsc_panic("JSON.parse expected object separator");
    }
    tsc_panic("JSON.parse unterminated object");
    return tsc_value_object(o);
}

tsc_value_t jp_number(json_parser_t* p) {
    const char* start = p->s + p->pos;
    char* end = NULL;
    double n = strtod(start, &end);
    if (end == start) tsc_panic("JSON.parse expected number");
    p->pos += (size_t)(end - start);
    return tsc_value_num(n);
}

tsc_value_t jp_value(json_parser_t* p) {
    jp_ws(p);
    if (p->pos >= p->len) tsc_panic("JSON.parse unexpected end");
    char c = p->s[p->pos];
    if (c == '"') return tsc_value_string(jp_string(p));
    if (c == '[') return jp_array(p);
    if (c == '{') return jp_object(p);
    if (jp_lit(p, "true")) return tsc_value_bool(true);
    if (jp_lit(p, "false")) return tsc_value_bool(false);
    if (jp_lit(p, "null")) return tsc_value_null();
    return jp_number(p);
}

tsc_value_t tsc_json_parse(tsc_str_t* text) {
    json_parser_t p = { text->data, text->len, 0 };
    tsc_value_t v = jp_value(&p);
    jp_ws(&p);
    if (p.pos != p.len) tsc_panic("JSON.parse trailing input");
    return v;
}

/* ---------------- Map / Set (hash + insertion-order array) ----------------
 *
 * Storage is split:
 *   - `keys` / `values` arrays hold entries in insertion order (the
 *     spec-mandated iteration order). The ordered array is the source of truth
 *     and is what `tsc_map_keys` / `tsc_map_values` returns.
 *   - `buckets` is a power-of-2 open-addressing table of *indices* into the
 *     ordered array, plus two sentinels:
 *         BKT_EMPTY     = SIZE_MAX     — never written
 *         BKT_TOMBSTONE = SIZE_MAX - 1 — vacated by delete
 *
 * Lookups: hash key → probe `buckets` linearly until empty (miss) or until
 * the slot points at an ordered-array entry whose key matches.
 *
 * Inserts: append to ordered array; write its index into the first free
 * (empty or tombstone) bucket on the probe.
 *
 * Deletes: compact the ordered array so iteration order is preserved, then
 * rebuild the bucket table because ordered indices may have shifted.
 *
 * Resizes when load > 75% — the bucket table doubles and is rebuilt by
 * re-inserting every ordered entry.
 */

uint64_t key_hash(tsc_key_kind_t kk, const void* k) {
    switch (kk) {
        case TSC_KEY_NUM: {
            double x; memcpy(&x, k, sizeof x);
            return num_hash(x);
        }
        case TSC_KEY_STR: {
            const tsc_str_t* s; memcpy(&s, k, sizeof s);
            return tsc_str_cached_hash(s);
        }
        case TSC_KEY_PTR: {
            void* p; memcpy(&p, k, sizeof p);
            return splitmix64_mix((uint64_t)(uintptr_t)p);
        }
        case TSC_KEY_BOOL: {
            bool b; memcpy(&b, k, sizeof b);
            return splitmix64_mix(b ? 0x9e3779b97f4a7c15ULL : 0x517cc1b727220a95ULL);
        }
    }
    return 0;
}

void map_rebuild_buckets(tsc_map_t* m, size_t new_bucket_cap) {
    size_t* nb = (size_t*)TSC_GC_MALLOC_ATOMIC(new_bucket_cap * sizeof(size_t));
    for (size_t i = 0; i < new_bucket_cap; i++) nb[i] = TSC_BKT_EMPTY;
    size_t mask = new_bucket_cap - 1;
    for (size_t i = 0; i < m->len; i++) {
        const void* k = (const char*)m->keys + i * m->ks;
        size_t slot = (size_t)(key_hash(m->kk, k) & mask);
        while (nb[slot] != TSC_BKT_EMPTY) slot = (slot + 1) & mask;
        nb[slot] = i;
    }
    m->buckets = nb;
    m->bucket_cap = new_bucket_cap;
}

void map_grow_ordered(tsc_map_t* m, size_t want) {
    if (want <= m->cap) return;
    size_t cap = m->cap ? m->cap : 256;
    while (cap < want) cap *= 2;
    void* nk = m->keys ? TSC_GC_REALLOC(m->keys, cap * m->ks) : TSC_GC_MALLOC(cap * m->ks);
    void* nv = m->values ? TSC_GC_REALLOC(m->values, cap * m->vs) : TSC_GC_MALLOC(cap * m->vs);
    m->keys = nk; m->values = nv; m->cap = cap;
}

/* Returns ordered-index if the key is in the map, else TSC_BKT_EMPTY.
 * Output `*slot_out` (if non-NULL) receives the bucket index where an
 * insert should write — preferring the first tombstone seen during probe. */
size_t map_lookup(const tsc_map_t* m, const void* k, size_t* slot_out) {
    if (m->bucket_cap == 0) {
        if (slot_out) *slot_out = TSC_BKT_EMPTY;
        return TSC_BKT_EMPTY;
    }
    size_t mask = m->bucket_cap - 1;
    size_t slot = (size_t)(key_hash(m->kk, k) & mask);
    size_t first_tomb = TSC_BKT_EMPTY;
    while (1) {
        size_t e = m->buckets[slot];
        if (e == TSC_BKT_EMPTY) {
            if (slot_out) *slot_out = (first_tomb != TSC_BKT_EMPTY) ? first_tomb : slot;
            return TSC_BKT_EMPTY;
        }
        if (e == TSC_BKT_TOMBSTONE) {
            if (first_tomb == TSC_BKT_EMPTY) first_tomb = slot;
        } else if (key_eq(m->kk, m->ks, (const char*)m->keys + e * m->ks, k)) {
            if (slot_out) *slot_out = slot;
            return e;
        }
        slot = (slot + 1) & mask;
    }
}

size_t map_lookup_str(const tsc_map_t* m, const tsc_str_t* k, size_t* slot_out) {
    if (m->bucket_cap == 0) {
        if (slot_out) *slot_out = TSC_BKT_EMPTY;
        return TSC_BKT_EMPTY;
    }
    size_t mask = m->bucket_cap - 1;
    size_t slot = (size_t)(tsc_str_cached_hash(k) & mask);
    size_t first_tomb = TSC_BKT_EMPTY;
    tsc_str_t** keys = (tsc_str_t**)m->keys;
    while (1) {
        size_t e = m->buckets[slot];
        if (e == TSC_BKT_EMPTY) {
            if (slot_out) *slot_out = (first_tomb != TSC_BKT_EMPTY) ? first_tomb : slot;
            return TSC_BKT_EMPTY;
        }
        if (e == TSC_BKT_TOMBSTONE) {
            if (first_tomb == TSC_BKT_EMPTY) first_tomb = slot;
        } else if (tsc_str_eq(keys[e], k)) {
            if (slot_out) *slot_out = slot;
            return e;
        }
        slot = (slot + 1) & mask;
    }
}

