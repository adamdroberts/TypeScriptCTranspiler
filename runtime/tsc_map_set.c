#include "tsc_internal.h"


tsc_map_t* tsc_map_new(size_t ks, size_t vs, int kk, size_t initial_cap) {
    tsc_map_t* m = (tsc_map_t*)TSC_GC_MALLOC(sizeof(tsc_map_t));
    m->ks = ks; m->vs = vs; m->kk = (tsc_key_kind_t)kk;
    m->len = 0; m->cap = 0; m->keys = NULL; m->values = NULL;
    m->buckets = NULL; m->bucket_cap = 0;
    if (initial_cap > 0) map_grow_ordered(m, initial_cap);
    return m;
}

void tsc_map_set_raw(tsc_map_t* m, const void* k, const void* v) {
    /* Ensure bucket table is at most 75% full *after* the insert. */
    if (m->bucket_cap == 0 || (m->len + 1) * 4 > m->bucket_cap * 3) {
        /* Bigger initial bucket cap saves rebucketings on the common
         * "fill map with N entries" pattern. 1024 buckets = 8KB of size_t
         * per fresh map — fine for short-lived hot-path collections. */
        size_t bc = m->bucket_cap ? m->bucket_cap * 2 : 1024;
        while ((m->len + 1) * 4 > bc * 3) bc *= 2;
        map_rebuild_buckets(m, bc);
    }
    size_t slot;
    size_t e = map_lookup(m, k, &slot);
    if (e != TSC_BKT_EMPTY) {
        memcpy((char*)m->values + e * m->vs, v, m->vs);
        return;
    }
    map_grow_ordered(m, m->len + 1);
    memcpy((char*)m->keys + m->len * m->ks, k, m->ks);
    memcpy((char*)m->values + m->len * m->vs, v, m->vs);
    m->buckets[slot] = m->len;
    m->len++;
}

void tsc_map_set_str_num(tsc_map_t* m, tsc_str_t* k, double v) {
    if (m->bucket_cap == 0 || (m->len + 1) * 4 > m->bucket_cap * 3) {
        size_t bc = m->bucket_cap ? m->bucket_cap * 2 : 512;
        while ((m->len + 1) * 4 > bc * 3) bc *= 2;
        map_rebuild_buckets(m, bc);
    }
    size_t slot;
    size_t e = map_lookup_str(m, k, &slot);
    if (e != TSC_BKT_EMPTY) {
        ((double*)m->values)[e] = v;
        return;
    }
    map_grow_ordered(m, m->len + 1);
    ((tsc_str_t**)m->keys)[m->len] = k;
    ((double*)m->values)[m->len] = v;
    m->buckets[slot] = m->len;
    m->len++;
}

bool tsc_map_get_raw(const tsc_map_t* m, const void* k, void* out) {
    size_t e = map_lookup(m, k, NULL);
    if (e == TSC_BKT_EMPTY) return false;
    memcpy(out, (const char*)m->values + e * m->vs, m->vs);
    return true;
}

double tsc_map_get_str_num(const tsc_map_t* m, tsc_str_t* k, double fallback) {
    size_t e = map_lookup_str(m, k, NULL);
    return e == TSC_BKT_EMPTY ? fallback : ((double*)m->values)[e];
}

bool tsc_map_has_raw(const tsc_map_t* m, const void* k) {
    return map_lookup(m, k, NULL) != TSC_BKT_EMPTY;
}

bool tsc_map_has_str(const tsc_map_t* m, tsc_str_t* k) {
    return map_lookup_str(m, k, NULL) != TSC_BKT_EMPTY;
}

bool tsc_map_delete_raw(tsc_map_t* m, const void* k) {
    size_t slot;
    size_t e = map_lookup(m, k, &slot);
    if (e == TSC_BKT_EMPTY) return false;
    m->buckets[slot] = TSC_BKT_TOMBSTONE;
    size_t tail = m->len - e - 1;
    if (tail > 0) {
        memmove((char*)m->keys + e * m->ks, (const char*)m->keys + (e + 1) * m->ks, tail * m->ks);
        memmove((char*)m->values + e * m->vs, (const char*)m->values + (e + 1) * m->vs, tail * m->vs);
    }
    m->len--;
    if (m->bucket_cap > 0) map_rebuild_buckets(m, m->bucket_cap);
    return true;
}

void tsc_map_clear(tsc_map_t* m) {
    m->len = 0;
    if (m->bucket_cap > 0) {
        for (size_t i = 0; i < m->bucket_cap; i++) m->buckets[i] = TSC_BKT_EMPTY;
    }
}
double tsc_map_size(const tsc_map_t* m) { return (double)m->len; }

tsc_array_t* tsc_map_keys(const tsc_map_t* m) {
    tsc_array_t* a = tsc_array_new(m->ks, m->len ? m->len : 1);
    if (m->len) memcpy(a->data, m->keys, m->len * m->ks);
    a->len = m->len;
    return a;
}

tsc_array_t* tsc_map_values(const tsc_map_t* m) {
    tsc_array_t* a = tsc_array_new(m->vs, m->len ? m->len : 1);
    if (m->len) memcpy(a->data, m->values, m->len * m->vs);
    a->len = m->len;
    return a;
}

/* Set ------------ — same architecture, single data array. */

void set_rebuild_buckets(tsc_set_t* s, size_t new_bucket_cap) {
    size_t* nb = (size_t*)TSC_GC_MALLOC_ATOMIC(new_bucket_cap * sizeof(size_t));
    for (size_t i = 0; i < new_bucket_cap; i++) nb[i] = TSC_BKT_EMPTY;
    size_t mask = new_bucket_cap - 1;
    for (size_t i = 0; i < s->len; i++) {
        const void* v = (const char*)s->data + i * s->es;
        size_t slot = (size_t)(key_hash(s->kk, v) & mask);
        while (nb[slot] != TSC_BKT_EMPTY) slot = (slot + 1) & mask;
        nb[slot] = i;
    }
    s->buckets = nb;
    s->bucket_cap = new_bucket_cap;
}

void set_grow_ordered(tsc_set_t* s, size_t want) {
    if (want <= s->cap) return;
    size_t cap = s->cap ? s->cap : 512;
    while (cap < want) cap *= 2;
    void* nd = s->data ? TSC_GC_REALLOC(s->data, cap * s->es) : TSC_GC_MALLOC(cap * s->es);
    s->data = nd; s->cap = cap;
}

void set_grow_ordered_atomic(tsc_set_t* s, size_t want) {
    if (want <= s->cap) return;
    size_t cap = s->cap ? s->cap : 512;
    while (cap < want) cap *= 2;
    void* nd = s->data ? TSC_GC_REALLOC(s->data, cap * s->es) : TSC_GC_MALLOC_ATOMIC(cap * s->es);
    s->data = nd; s->cap = cap;
}

size_t set_lookup(const tsc_set_t* s, const void* v, size_t* slot_out) {
    if (s->bucket_cap == 0) {
        if (slot_out) *slot_out = TSC_BKT_EMPTY;
        return TSC_BKT_EMPTY;
    }
    size_t mask = s->bucket_cap - 1;
    size_t slot = (size_t)(key_hash(s->kk, v) & mask);
    size_t first_tomb = TSC_BKT_EMPTY;
    while (1) {
        size_t e = s->buckets[slot];
        if (e == TSC_BKT_EMPTY) {
            if (slot_out) *slot_out = (first_tomb != TSC_BKT_EMPTY) ? first_tomb : slot;
            return TSC_BKT_EMPTY;
        }
        if (e == TSC_BKT_TOMBSTONE) {
            if (first_tomb == TSC_BKT_EMPTY) first_tomb = slot;
        } else if (key_eq(s->kk, s->es, (const char*)s->data + e * s->es, v)) {
            if (slot_out) *slot_out = slot;
            return e;
        }
        slot = (slot + 1) & mask;
    }
}

size_t set_lookup_num(const tsc_set_t* s, double v, size_t* slot_out) {
    if (s->bucket_cap == 0) {
        if (slot_out) *slot_out = TSC_BKT_EMPTY;
        return TSC_BKT_EMPTY;
    }
    size_t mask = s->bucket_cap - 1;
    size_t slot = (size_t)(num_hash(v) & mask);
    size_t first_tomb = TSC_BKT_EMPTY;
    double* data = (double*)s->data;
    while (1) {
        size_t e = s->buckets[slot];
        if (e == TSC_BKT_EMPTY) {
            if (slot_out) *slot_out = (first_tomb != TSC_BKT_EMPTY) ? first_tomb : slot;
            return TSC_BKT_EMPTY;
        }
        if (e == TSC_BKT_TOMBSTONE) {
            if (first_tomb == TSC_BKT_EMPTY) first_tomb = slot;
        } else if (num_eq(data[e], v)) {
            if (slot_out) *slot_out = slot;
            return e;
        }
        slot = (slot + 1) & mask;
    }
}

size_t set_lookup_int(const tsc_set_t* s, int64_t v, size_t* slot_out) {
    if (s->bucket_cap == 0) {
        if (slot_out) *slot_out = TSC_BKT_EMPTY;
        return TSC_BKT_EMPTY;
    }
    size_t mask = s->bucket_cap - 1;
    size_t slot = (size_t)(((uint64_t)v * 11400714819323198485ULL) & mask);
    size_t first_tomb = TSC_BKT_EMPTY;
    double dv = (double)v;
    double* data = (double*)s->data;
    while (1) {
        size_t e = s->buckets[slot];
        if (e == TSC_BKT_EMPTY) {
            if (slot_out) *slot_out = (first_tomb != TSC_BKT_EMPTY) ? first_tomb : slot;
            return TSC_BKT_EMPTY;
        }
        if (e == TSC_BKT_TOMBSTONE) {
            if (first_tomb == TSC_BKT_EMPTY) first_tomb = slot;
        } else if (data[e] == dv) {
            if (slot_out) *slot_out = slot;
            return e;
        }
        slot = (slot + 1) & mask;
    }
}

tsc_set_t* tsc_set_new(size_t es, int kk, size_t initial_cap) {
    tsc_set_t* s = (tsc_set_t*)TSC_GC_MALLOC(sizeof(tsc_set_t));
    s->es = es; s->kk = (tsc_key_kind_t)kk;
    s->len = 0; s->cap = 0; s->data = NULL;
    s->buckets = NULL; s->bucket_cap = 0;
    if (initial_cap > 0) set_grow_ordered(s, initial_cap);
    return s;
}

void tsc_set_add_raw(tsc_set_t* s, const void* v) {
    if (s->bucket_cap == 0 || (s->len + 1) * 4 > s->bucket_cap * 3) {
        size_t bc = s->bucket_cap ? s->bucket_cap * 2 : 1024;
        while ((s->len + 1) * 4 > bc * 3) bc *= 2;
        set_rebuild_buckets(s, bc);
    }
    size_t slot;
    size_t e = set_lookup(s, v, &slot);
    if (e != TSC_BKT_EMPTY) return;
    /* Raw sets can contain pointers (strings, objects, or typed references).
     * Their backing storage must be scanned so entries remain alive. */
    set_grow_ordered(s, s->len + 1);
    memcpy((char*)s->data + s->len * s->es, v, s->es);
    s->buckets[slot] = s->len;
    s->len++;
}

void tsc_set_add_int(tsc_set_t* s, int64_t v) {
    if (s->bucket_cap == 0 || (s->len + 1) * 4 > s->bucket_cap * 3) {
        size_t bc = s->bucket_cap ? s->bucket_cap * 2 : 1024;
        while ((s->len + 1) * 4 > bc * 3) bc *= 2;
        set_rebuild_buckets(s, bc);
    }
    size_t slot;
    size_t e = set_lookup_int(s, v, &slot);
    if (e != TSC_BKT_EMPTY) return;
    set_grow_ordered_atomic(s, s->len + 1);
    ((double*)s->data)[s->len] = (double)v;
    s->buckets[slot] = s->len;
    s->len++;
}

void tsc_set_add_num(tsc_set_t* s, double v) {
    if (s->bucket_cap == 0 || (s->len + 1) * 4 > s->bucket_cap * 3) {
        size_t bc = s->bucket_cap ? s->bucket_cap * 2 : 1024;
        while ((s->len + 1) * 4 > bc * 3) bc *= 2;
        set_rebuild_buckets(s, bc);
    }
    size_t slot;
    size_t e = set_lookup_num(s, v, &slot);
    if (e != TSC_BKT_EMPTY) return;
    set_grow_ordered(s, s->len + 1);
    ((double*)s->data)[s->len] = v;
    s->buckets[slot] = s->len;
    s->len++;
}

bool tsc_set_has_raw(const tsc_set_t* s, const void* v) {
    return set_lookup(s, v, NULL) != TSC_BKT_EMPTY;
}

bool tsc_set_has_int(const tsc_set_t* s, int64_t v) {
    return set_lookup_int(s, v, NULL) != TSC_BKT_EMPTY;
}

bool tsc_set_has_num(const tsc_set_t* s, double v) {
    return set_lookup_num(s, v, NULL) != TSC_BKT_EMPTY;
}

bool tsc_set_delete_raw(tsc_set_t* s, const void* v) {
    size_t slot;
    size_t e = set_lookup(s, v, &slot);
    if (e == TSC_BKT_EMPTY) return false;
    s->buckets[slot] = TSC_BKT_TOMBSTONE;
    size_t tail = s->len - e - 1;
    if (tail > 0) {
        memmove((char*)s->data + e * s->es, (const char*)s->data + (e + 1) * s->es, tail * s->es);
    }
    s->len--;
    if (s->bucket_cap > 0) set_rebuild_buckets(s, s->bucket_cap);
    return true;
}

void tsc_set_clear(tsc_set_t* s) {
    s->len = 0;
    if (s->bucket_cap > 0) {
        for (size_t i = 0; i < s->bucket_cap; i++) s->buckets[i] = TSC_BKT_EMPTY;
    }
}
double tsc_set_size(const tsc_set_t* s) { return (double)s->len; }

tsc_array_t* tsc_set_values(const tsc_set_t* s) {
    tsc_array_t* a = tsc_array_new(s->es, s->len ? s->len : 1);
    if (s->len) memcpy(a->data, s->data, s->len * s->es);
    a->len = s->len;
    return a;
}

void set_copy_into(tsc_set_t* dst, const tsc_set_t* src) {
    for (size_t i = 0; i < src->len; i++) {
        tsc_set_add_raw(dst, (const char*)src->data + i * src->es);
    }
}

tsc_set_t* tsc_set_union(const tsc_set_t* a, const tsc_set_t* b) {
    tsc_set_t* out = tsc_set_new(a->es, (int)a->kk, a->len + b->len);
    set_copy_into(out, a);
    set_copy_into(out, b);
    return out;
}

tsc_set_t* tsc_set_intersection(const tsc_set_t* a, const tsc_set_t* b) {
    /* Iterate the smaller set to keep this O(min(|a|,|b|)). */
    const tsc_set_t* small = a->len <= b->len ? a : b;
    const tsc_set_t* large = small == a ? b : a;
    tsc_set_t* out = tsc_set_new(a->es, (int)a->kk, small->len);
    for (size_t i = 0; i < small->len; i++) {
        const void* v = (const char*)small->data + i * small->es;
        if (tsc_set_has_raw(large, v)) tsc_set_add_raw(out, v);
    }
    return out;
}

tsc_set_t* tsc_set_difference(const tsc_set_t* a, const tsc_set_t* b) {
    tsc_set_t* out = tsc_set_new(a->es, (int)a->kk, a->len);
    for (size_t i = 0; i < a->len; i++) {
        const void* v = (const char*)a->data + i * a->es;
        if (!tsc_set_has_raw(b, v)) tsc_set_add_raw(out, v);
    }
    return out;
}

tsc_set_t* tsc_set_symmetric_difference(const tsc_set_t* a, const tsc_set_t* b) {
    tsc_set_t* out = tsc_set_new(a->es, (int)a->kk, a->len + b->len);
    for (size_t i = 0; i < a->len; i++) {
        const void* v = (const char*)a->data + i * a->es;
        if (!tsc_set_has_raw(b, v)) tsc_set_add_raw(out, v);
    }
    for (size_t i = 0; i < b->len; i++) {
        const void* v = (const char*)b->data + i * b->es;
        if (!tsc_set_has_raw(a, v)) tsc_set_add_raw(out, v);
    }
    return out;
}

bool tsc_set_is_subset_of(const tsc_set_t* a, const tsc_set_t* b) {
    if (a->len > b->len) return false;
    for (size_t i = 0; i < a->len; i++) {
        const void* v = (const char*)a->data + i * a->es;
        if (!tsc_set_has_raw(b, v)) return false;
    }
    return true;
}

bool tsc_set_is_superset_of(const tsc_set_t* a, const tsc_set_t* b) {
    return tsc_set_is_subset_of(b, a);
}

bool tsc_set_is_disjoint_from(const tsc_set_t* a, const tsc_set_t* b) {
    const tsc_set_t* small = a->len <= b->len ? a : b;
    const tsc_set_t* large = small == a ? b : a;
    for (size_t i = 0; i < small->len; i++) {
        const void* v = (const char*)small->data + i * small->es;
        if (tsc_set_has_raw(large, v)) return false;
    }
    return true;
}

