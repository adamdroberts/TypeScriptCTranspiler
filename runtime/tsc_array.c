#include "tsc_internal.h"

/* ---------------- arrays ---------------- */

static tsc_value_t tsc_array_default_prototype(void) {
    static bool initialized = false;
    static tsc_value_t prototype;
    if (!initialized) {
        prototype = tsc_value_object(tsc_object_new());
        initialized = true;
    }
    return prototype;
}

tsc_array_t* tsc_array_new(size_t elem_size, size_t initial_cap) {
    tsc_array_t* a = (tsc_array_t*)TSC_GC_MALLOC(sizeof(tsc_array_t));
    a->len = 0;
    a->cap = initial_cap;
    a->es = elem_size;
    a->extensible = true;
    a->sealed = false;
    a->frozen = false;
    a->prototype = tsc_array_default_prototype();
    a->iter_pos = 0;
    a->data = initial_cap ? TSC_GC_MALLOC(initial_cap * elem_size) : NULL;
    return a;
}

tsc_array_t* tsc_array_new_atomic(size_t elem_size, size_t initial_cap) {
    tsc_array_t* a = (tsc_array_t*)TSC_GC_MALLOC(sizeof(tsc_array_t));
    a->len = 0;
    a->cap = initial_cap;
    a->es = elem_size;
    a->extensible = true;
    a->sealed = false;
    a->frozen = false;
    a->prototype = tsc_array_default_prototype();
    a->iter_pos = 0;
    a->data = initial_cap ? TSC_GC_MALLOC_ATOMIC(initial_cap * elem_size) : NULL;
    return a;
}

tsc_array_t* tsc_array_from_buf(size_t elem_size, const void* src, size_t n) {
    tsc_array_t* a = tsc_array_new(elem_size, n > 0 ? n : 1);
    if (n > 0) memcpy(a->data, src, n * elem_size);
    a->len = n;
    return a;
}

bool tsc_str_is_length_key(const tsc_str_t* key) {
    return key && key->len == 6 && memcmp(key->data, "length", 6) == 0;
}

bool tsc_str_array_index(const tsc_str_t* key, size_t* out) {
    if (!key || key->len == 0) return false;
    if (key->len > 1 && key->data[0] == '0') return false;
    size_t value = 0;
    for (size_t i = 0; i < key->len; i++) {
        unsigned char ch = (unsigned char)key->data[i];
        if (ch < '0' || ch > '9') return false;
        size_t digit = (size_t)(ch - '0');
        if (value > (SIZE_MAX - digit) / 10) return false;
        value = value * 10 + digit;
    }
    *out = value;
    return true;
}

bool tsc_array_has_own_key(const tsc_array_t* a, const tsc_str_t* key) {
    if (!a) return false;
    if (tsc_str_is_length_key(key)) return true;
    size_t idx = 0;
    return tsc_str_array_index(key, &idx) && idx < a->len;
}

bool tsc_array_property_is_enumerable_key(const tsc_array_t* a, const tsc_str_t* key) {
    if (!a || tsc_str_is_length_key(key)) return false;
    size_t idx = 0;
    return tsc_str_array_index(key, &idx) && idx < a->len;
}

void tsc_array_reserve(tsc_array_t* a, size_t new_cap) {
    if (new_cap <= a->cap) return;
    /* Start growth at 8 so a fresh `[]` followed by N pushes amortizes well. */
    size_t cap = a->cap ? a->cap : 8;
    while (cap < new_cap) cap *= 2;
    void* nd = a->data ? TSC_GC_REALLOC(a->data, cap * a->es) : TSC_GC_MALLOC(cap * a->es);
    a->data = nd;
    a->cap = cap;
}

void tsc_array_push_raw(tsc_array_t* a, const void* elem) {
    if (a->len + 1 > a->cap) tsc_array_reserve(a, a->len + 1);
    memcpy((char*)a->data + a->len * a->es, elem, a->es);
    a->len++;
}

void tsc_array_pop_raw(tsc_array_t* a) {
    if (a->len > 0) a->len--;
}

void tsc_array_shift_raw(tsc_array_t* a) {
    if (a->len == 0) return;
    memmove(a->data, (char*)a->data + a->es, (a->len - 1) * a->es);
    a->len--;
}

void tsc_array_unshift_raw(tsc_array_t* a, const void* elem) {
    if (a->len + 1 > a->cap) tsc_array_reserve(a, a->len + 1);
    memmove((char*)a->data + a->es, a->data, a->len * a->es);
    memcpy(a->data, elem, a->es);
    a->len++;
}

tsc_array_t* tsc_array_reverse(tsc_array_t* a) {
    if (a->len < 2) return a;
    char* lo = (char*)a->data;
    char* hi = lo + (a->len - 1) * a->es;
    char tmp[256]; /* element size limit for stack swap; larger uses heap */
    char* swap = a->es <= sizeof(tmp) ? tmp : (char*)TSC_GC_MALLOC(a->es);
    while (lo < hi) {
        memcpy(swap, lo, a->es);
        memcpy(lo, hi, a->es);
        memcpy(hi, swap, a->es);
        lo += a->es;
        hi -= a->es;
    }
    return a;
}

tsc_array_t* tsc_array_to_reversed(const tsc_array_t* a) {
    return tsc_array_reverse(tsc_array_slice(a, 0.0, (double)a->len));
}

int64_t array_strict_index(double value, int64_t len) {
    if (isnan(value)) value = 0.0;
    if (isinf(value)) tsc_panic("Array.with index out of range");
    if (value < 0) value = (double)len + value;
    if (value < 0 || value >= (double)len) {
        tsc_panic("Array.with index out of range");
    }
    return (int64_t)value;
}

tsc_array_t* tsc_array_with(const tsc_array_t* a, double index, const void* elem) {
    int64_t at = array_strict_index(index, (int64_t)a->len);
    tsc_array_t* copy = tsc_array_slice(a, 0.0, (double)a->len);
    memcpy((char*)copy->data + (size_t)at * copy->es, elem, copy->es);
    return copy;
}

int64_t array_range_index(double value, int64_t len, double fallback) {
    double n = isnan(value) ? fallback : value;
    if (isnan(n)) n = 0.0;
    if (isinf(n)) return n < 0 ? 0 : len;
    if (n < 0) n = (double)len + n;
    if (n < 0) return 0;
    if (n >= (double)len) return len;
    return (int64_t)n;
}

tsc_array_t* tsc_array_to_spliced(const tsc_array_t* a, double start, double delete_count, int argc, const tsc_array_t* items) {
    int64_t len = (int64_t)a->len;
    int64_t at = argc <= 0 ? 0 : array_range_index(start, len, 0.0);
    int64_t del = 0;
    if (argc == 1) {
        del = len - at;
    } else if (argc >= 2) {
        double raw = isnan(delete_count) || delete_count < 0 ? 0.0 : delete_count;
        if (isinf(raw)) raw = raw < 0 ? 0.0 : (double)(len - at);
        del = (int64_t)raw;
        if (del > len - at) del = len - at;
    }

    size_t insert_len = items ? items->len : 0;
    size_t new_len = a->len - (size_t)del + insert_len;
    tsc_array_t* out = tsc_array_new(a->es, new_len > 0 ? new_len : 1);
    if (at > 0) {
        memcpy(out->data, a->data, (size_t)at * a->es);
        out->len = (size_t)at;
    }
    if (insert_len > 0) {
        memcpy((char*)out->data + out->len * out->es, items->data, insert_len * out->es);
        out->len += insert_len;
    }
    size_t tail_start = (size_t)(at + del);
    size_t tail_len = a->len - tail_start;
    if (tail_len > 0) {
        memcpy((char*)out->data + out->len * out->es, (char*)a->data + tail_start * a->es, tail_len * a->es);
        out->len += tail_len;
    }
    return out;
}

tsc_array_t* tsc_array_fill(tsc_array_t* a, const void* elem, double start, double end) {
    int64_t len = (int64_t)a->len;
    int64_t i0 = array_range_index(start, len, 0.0);
    int64_t i1 = array_range_index(end, len, (double)len);
    if (i1 < i0) i1 = i0;
    for (int64_t i = i0; i < i1; i++) {
        memcpy((char*)a->data + (size_t)i * a->es, elem, a->es);
    }
    return a;
}

tsc_array_t* tsc_array_copy_within(tsc_array_t* a, double target, double start, double end) {
    int64_t len = (int64_t)a->len;
    int64_t to = array_range_index(target, len, 0.0);
    int64_t from = array_range_index(start, len, 0.0);
    int64_t final = array_range_index(end, len, (double)len);
    int64_t count = final - from;
    int64_t room = len - to;
    if (count > room) count = room;
    if (count > 0) {
        memmove(
            (char*)a->data + (size_t)to * a->es,
            (char*)a->data + (size_t)from * a->es,
            (size_t)count * a->es
        );
    }
    return a;
}

tsc_array_t* tsc_array_slice(const tsc_array_t* a, double start, double end) {
    int64_t slen = (int64_t)a->len;
    int64_t i0 = (int64_t)start;
    int64_t i1 = (int64_t)end;
    if (i0 < 0) i0 = slen + i0;
    if (i1 < 0) i1 = slen + i1;
    if (i0 < 0) i0 = 0;
    if (i1 > slen) i1 = slen;
    if (i0 > i1) i0 = i1;
    size_t n = (size_t)(i1 - i0);
    tsc_array_t* r = tsc_array_new(a->es, n > 0 ? n : 1);
    if (n > 0) memcpy(r->data, (char*)a->data + (size_t)i0 * a->es, n * a->es);
    r->len = n;
    return r;
}

tsc_array_t* tsc_array_append(tsc_array_t* dst, const tsc_array_t* src) {
    if (src->len == 0) return dst;
    tsc_array_reserve(dst, dst->len + src->len);
    memcpy((char*)dst->data + dst->len * dst->es, src->data, src->len * src->es);
    dst->len += src->len;
    return dst;
}

tsc_array_t* tsc_array_flat_once(const tsc_array_t* outer, size_t elem_size) {
    tsc_array_t* dst = tsc_array_new(elem_size, outer->len);
    for (size_t i = 0; i < outer->len; i++) {
        tsc_array_t* inner = TSC_ARR(tsc_array_t*, outer, i);
        if (inner) tsc_array_append(dst, inner);
    }
    return dst;
}

double tsc_array_length(const tsc_array_t* a) { return (double)a->len; }

void tsc_array_oob(const tsc_array_t* a, double i) { (void)a; (void)i; }

