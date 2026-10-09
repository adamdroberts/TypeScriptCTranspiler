#include "tsc_internal.h"

static void* dynamic_storage_root(size_t width, const void* storage) {
    if (width != sizeof(tsc_value_t) || !storage) return NULL;
    tsc_value_t value;
    memcpy(&value, storage, sizeof(value));
    return tsc_value_gc_root(value);
}

static const void* collection_canonical_key(tsc_key_kind_t kind, size_t width,
    const void* storage, tsc_value_t* normalized) {
    if (width != sizeof(*normalized)) return storage;
    if (kind == TSC_KEY_NUM) {
        double number;
        memcpy(&number, storage, sizeof(number));
        if (number != 0) return storage;
    } else if (kind == TSC_KEY_VALUE) {
        tsc_value_t value;
        memcpy(&value, storage, sizeof(value));
        if (value_is_box(value) || value_as_num(value) != 0) return storage;
    } else return storage;
    *normalized = tsc_value_num(0);
    return normalized;
}

static void collection_order_initialize(tsc_collection_order_t* order) {
    *order = (tsc_collection_order_t){0};
    order->head = order->tail = TSC_GC_MALLOC(sizeof(*order->head));
    *order->head = (tsc_collection_order_node_t){0};
}

static void collection_order_append(tsc_collection_order_t* order, size_t index) {
    tsc_collection_order_node_t* node = TSC_GC_MALLOC(sizeof(*node));
    *node = (tsc_collection_order_node_t){ .index = index, .active = true };
    order->entries[index] = node;
    order->tail->next = node;
    order->tail = node;
}

static void collection_order_delete(tsc_collection_order_t* order, size_t index, size_t length) {
    order->entries[index]->active = false;
    memmove(order->entries + index, order->entries + index + 1,
        (length - index - 1) * sizeof(*order->entries));
    order->entries[length - 1] = NULL;
    for (size_t current = index; current + 1 < length; ++current) {
        order->entries[current]->index = current;
    }
    while (order->head->next && !order->head->next->active) {
        order->head = order->head->next;
    }
}

static void collection_order_clear(tsc_collection_order_t* order, size_t length) {
    for (size_t index = 0; index < length; ++index) order->entries[index]->active = false;
    if (length) memset(order->entries, 0, length * sizeof(*order->entries));
    order->head = order->tail;
}

tsc_map_t* tsc_map_new(size_t ks, size_t vs, int kk, size_t initial_cap) {
    tsc_map_t* m = (tsc_map_t*)TSC_GC_MALLOC(sizeof(tsc_map_t));
    *m = (tsc_map_t){0};
    m->ks = ks; m->vs = vs; m->kk = (tsc_key_kind_t)kk;
    m->len = 0; m->cap = 0; m->keys = NULL; m->values = NULL;
    m->key_roots = NULL; m->value_roots = NULL;
    m->buckets = NULL; m->bucket_cap = 0;
    collection_order_initialize(&m->order);
    if (initial_cap > 0) map_grow_ordered(m, initial_cap);
    (void)tsc_value_map(m);
    return m;
}

void tsc_map_set_raw(tsc_map_t* m, const void* k, const void* v) {
    tsc_value_t normalized;
    k = collection_canonical_key(m->kk, m->ks, k, &normalized);
    void* volatile key_gc_root = dynamic_storage_root(m->ks, k);
    void* volatile value_gc_root = dynamic_storage_root(m->vs, v);
    (void)key_gc_root; (void)value_gc_root;
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
        if (m->value_roots) m->value_roots[e] = dynamic_storage_root(m->vs, v);
        return;
    }
    map_grow_ordered(m, m->len + 1);
    memcpy((char*)m->keys + m->len * m->ks, k, m->ks);
    memcpy((char*)m->values + m->len * m->vs, v, m->vs);
    if (m->key_roots) m->key_roots[m->len] = dynamic_storage_root(m->ks, k);
    if (m->value_roots) m->value_roots[m->len] = dynamic_storage_root(m->vs, v);
    m->buckets[slot] = m->len;
    collection_order_append(&m->order, m->len);
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
    collection_order_append(&m->order, m->len);
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
    collection_order_delete(&m->order, e, m->len);
    size_t tail = m->len - e - 1;
    if (tail > 0) {
        memmove((char*)m->keys + e * m->ks, (const char*)m->keys + (e + 1) * m->ks, tail * m->ks);
        memmove((char*)m->values + e * m->vs, (const char*)m->values + (e + 1) * m->vs, tail * m->vs);
        if (m->key_roots) memmove(m->key_roots + e, m->key_roots + e + 1, tail * sizeof(void*));
        if (m->value_roots) memmove(m->value_roots + e, m->value_roots + e + 1, tail * sizeof(void*));
    }
    m->len--;
    memset((char*)m->keys + m->len * m->ks, 0, m->ks);
    memset((char*)m->values + m->len * m->vs, 0, m->vs);
    if (m->key_roots) m->key_roots[m->len] = NULL;
    if (m->value_roots) m->value_roots[m->len] = NULL;
    if (m->bucket_cap > 0) map_rebuild_buckets(m, m->bucket_cap);
    return true;
}

void tsc_map_clear(tsc_map_t* m) {
    collection_order_clear(&m->order, m->len);
    if (m->len) {
        memset(m->keys, 0, m->len * m->ks);
        memset(m->values, 0, m->len * m->vs);
    }
    if (m->key_roots) memset(m->key_roots, 0, m->len * sizeof(void*));
    if (m->value_roots) memset(m->value_roots, 0, m->len * sizeof(void*));
    m->len = 0;
    if (m->bucket_cap > 0) {
        for (size_t i = 0; i < m->bucket_cap; i++) m->buckets[i] = TSC_BKT_EMPTY;
    }
}
double tsc_map_size(const tsc_map_t* m) { return (double)m->len; }

tsc_array_t* tsc_map_keys(const tsc_map_t* m) {
    return tsc_array_from_buf(m->ks, m->keys, m->len);
}

tsc_array_t* tsc_map_values(const tsc_map_t* m) {
    return tsc_array_from_buf(m->vs, m->values, m->len);
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
    const size_t old_cap = s->cap;
    void* nd = s->data ? TSC_GC_REALLOC(s->data, cap * s->es) : TSC_GC_MALLOC(cap * s->es);
    s->data = nd;
    s->order.entries = TSC_GC_REALLOC(s->order.entries, cap * sizeof(*s->order.entries));
    memset(s->order.entries + old_cap, 0, (cap - old_cap) * sizeof(*s->order.entries));
    if (s->es == sizeof(tsc_value_t)) {
        s->value_roots = s->value_roots
            ? (void**)TSC_GC_REALLOC(s->value_roots, cap * sizeof(void*))
            : (void**)TSC_GC_MALLOC(cap * sizeof(void*));
        memset(s->value_roots + old_cap, 0, (cap - old_cap) * sizeof(void*));
    }
    s->cap = cap;
}

void set_grow_ordered_atomic(tsc_set_t* s, size_t want) {
    if (want <= s->cap) return;
    size_t cap = s->cap ? s->cap : 512;
    while (cap < want) cap *= 2;
    const size_t old_cap = s->cap;
    void* nd = s->data ? TSC_GC_REALLOC(s->data, cap * s->es) : TSC_GC_MALLOC_ATOMIC(cap * s->es);
    s->data = nd;
    s->order.entries = TSC_GC_REALLOC(s->order.entries, cap * sizeof(*s->order.entries));
    memset(s->order.entries + old_cap, 0, (cap - old_cap) * sizeof(*s->order.entries));
    if (s->es == sizeof(tsc_value_t)) {
        s->value_roots = s->value_roots
            ? (void**)TSC_GC_REALLOC(s->value_roots, cap * sizeof(void*))
            : (void**)TSC_GC_MALLOC(cap * sizeof(void*));
        memset(s->value_roots + old_cap, 0, (cap - old_cap) * sizeof(void*));
    }
    s->cap = cap;
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
    *s = (tsc_set_t){0};
    s->es = es; s->kk = (tsc_key_kind_t)kk;
    s->len = 0; s->cap = 0; s->data = NULL; s->value_roots = NULL;
    s->buckets = NULL; s->bucket_cap = 0;
    collection_order_initialize(&s->order);
    if (initial_cap > 0) set_grow_ordered(s, initial_cap);
    (void)tsc_value_set(s);
    return s;
}

void tsc_set_add_raw(tsc_set_t* s, const void* v) {
    tsc_value_t normalized;
    v = collection_canonical_key(s->kk, s->es, v, &normalized);
    void* volatile value_gc_root = dynamic_storage_root(s->es, v);
    (void)value_gc_root;
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
    if (s->value_roots) s->value_roots[s->len] = dynamic_storage_root(s->es, v);
    s->buckets[slot] = s->len;
    collection_order_append(&s->order, s->len);
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
    collection_order_append(&s->order, s->len);
    s->len++;
}

void tsc_set_add_num(tsc_set_t* s, double v) {
    if (v == 0) v = 0;
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
    collection_order_append(&s->order, s->len);
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
    collection_order_delete(&s->order, e, s->len);
    size_t tail = s->len - e - 1;
    if (tail > 0) {
        memmove((char*)s->data + e * s->es, (const char*)s->data + (e + 1) * s->es, tail * s->es);
        if (s->value_roots) memmove(s->value_roots + e, s->value_roots + e + 1, tail * sizeof(void*));
    }
    s->len--;
    memset((char*)s->data + s->len * s->es, 0, s->es);
    if (s->value_roots) s->value_roots[s->len] = NULL;
    if (s->bucket_cap > 0) set_rebuild_buckets(s, s->bucket_cap);
    return true;
}

void tsc_set_clear(tsc_set_t* s) {
    collection_order_clear(&s->order, s->len);
    if (s->len) memset(s->data, 0, s->len * s->es);
    if (s->value_roots) memset(s->value_roots, 0, s->len * sizeof(void*));
    s->len = 0;
    if (s->bucket_cap > 0) {
        for (size_t i = 0; i < s->bucket_cap; i++) s->buckets[i] = TSC_BKT_EMPTY;
    }
}
double tsc_set_size(const tsc_set_t* s) { return (double)s->len; }

tsc_array_t* tsc_set_values(const tsc_set_t* s) {
    return tsc_array_from_buf(s->es, s->data, s->len);
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

/* Ordinary collection objects and iterators share one operation collection
 * and insertion-link cursor algorithm. Native dense layouts cross this
 * boundary through the same element codecs as ordinary Array consumers. */
typedef enum {
    COLLECTION_GET, COLLECTION_HAS, COLLECTION_DELETE, COLLECTION_CLEAR,
    COLLECTION_WRITE, COLLECTION_KEYS, COLLECTION_VALUES, COLLECTION_ENTRIES,
    COLLECTION_FOR_EACH, COLLECTION_SIZE,
} collection_operation_t;

typedef struct {
    bool is_map;
    collection_operation_t operation;
    tsc_object_t* iterator_prototype;
} collection_method_t;

typedef struct {
    bool is_map;
    collection_operation_t kind;
    tsc_map_t* map;
    tsc_set_t* set;
    tsc_collection_order_node_t* cursor;
} collection_iterator_t;

typedef struct {
    tsc_object_t* prototype;
    tsc_object_t* iterator_prototype;
    tsc_value_t constructor;
    void* constructor_root;
    bool is_map;
} collection_intrinsics_t;

static const char collection_intrinsics_keys[2] = {0};
static collection_intrinsics_t* collection_intrinsics(bool is_map);

static tsc_value_t collection_argument(tsc_array_t* args, size_t index) {
    return args && index < args->len ? TSC_ARR(tsc_value_t, args, index) : tsc_value_undefined();
}

tsc_map_t* tsc_map_set_value_codecs(tsc_map_t* map,
    tsc_array_box_element_fn box_key, tsc_array_unbox_element_fn unbox_key,
    tsc_array_box_element_fn box_value, tsc_array_unbox_element_fn unbox_value) {
    if (map) {
        map->box_key = box_key; map->unbox_key = unbox_key;
        map->box_value = box_value; map->unbox_value = unbox_value;
    }
    return map;
}

tsc_set_t* tsc_set_set_value_codec(tsc_set_t* set,
    tsc_array_box_element_fn box_value, tsc_array_unbox_element_fn unbox_value) {
    if (set) { set->box_value = box_value; set->unbox_value = unbox_value; }
    return set;
}

static tsc_value_t collection_box(tsc_array_box_element_fn box, const void* storage, size_t width) {
    if (box) return box(storage);
    if (width != sizeof(tsc_value_t)) {
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("collection storage requires an element codec"));
    }
    tsc_value_t value;
    memcpy(&value, storage, sizeof(value));
    return value;
}

static void collection_unbox(tsc_value_t value, void* storage, size_t width,
    tsc_array_box_element_fn box, tsc_array_unbox_element_fn unbox) {
    if (unbox) {
        if (unbox(value, storage) && tsc_value_same_value_zero(value, box(storage))) return;
    } else if (width == sizeof(value)) {
        memcpy(storage, &value, sizeof(value));
        return;
    }
    tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("collection storage cannot represent this value"));
}

static size_t collection_find(collection_iterator_t* source, tsc_value_t key) {
    void* volatile key_root = tsc_value_gc_root(key);
    if (source->is_map && source->map->kk == TSC_KEY_VALUE && !source->map->box_key) {
        return map_lookup(source->map, &key, NULL);
    }
    if (!source->is_map && source->set->kk == TSC_KEY_VALUE && !source->set->box_value) {
        return set_lookup(source->set, &key, NULL);
    }
    size_t length = source->is_map ? source->map->len : source->set->len;
    for (size_t index = 0; index < length; ++index) {
        tsc_value_t stored = source->is_map
            ? collection_box(source->map->box_key, (char*)source->map->keys + index * source->map->ks, source->map->ks)
            : collection_box(source->set->box_value, (char*)source->set->data + index * source->set->es, source->set->es);
        if (tsc_value_same_value_zero(key, stored)) { (void)key_root; return index; }
    }
    (void)key_root;
    return TSC_BKT_EMPTY;
}

static collection_iterator_t* collection_cursor(bool is_map, tsc_value_t receiver, collection_operation_t kind) {
    tsc_map_t* map = is_map ? tsc_value_as_map(receiver) : NULL;
    tsc_set_t* set = is_map ? NULL : tsc_value_as_set(receiver);
    collection_iterator_t* state = TSC_GC_MALLOC(sizeof(*state));
    *state = (collection_iterator_t){ .is_map = is_map, .kind = kind, .map = map, .set = set,
        .cursor = is_map ? map->order.head : set->order.head };
    return state;
}

static bool collection_step(collection_iterator_t* state, tsc_value_t* key, tsc_value_t* value) {
    if (!state->map && !state->set) return false;
    tsc_collection_order_node_t* node = state->cursor->next;
    while (node && !node->active) node = node->next;
    if (!node) {
        state->map = NULL; state->set = NULL; state->cursor = NULL;
        return false;
    }
    state->cursor = node;
    size_t index = node->index;
    if (state->is_map) {
        *key = state->kind == COLLECTION_VALUES ? tsc_value_undefined()
            : collection_box(state->map->box_key,
                (char*)state->map->keys + index * state->map->ks, state->map->ks);
        void* volatile key_root = tsc_value_gc_root(*key);
        *value = state->kind == COLLECTION_KEYS ? tsc_value_undefined()
            : collection_box(state->map->box_value,
                (char*)state->map->values + index * state->map->vs, state->map->vs);
        (void)key_root;
    } else {
        *key = *value = collection_box(state->set->box_value,
            (char*)state->set->data + index * state->set->es, state->set->es);
    }
    return true;
}

static tsc_value_t collection_iterator_next(void* env, tsc_value_t receiver, tsc_array_t* args) {
    (void)args;
    const collection_intrinsics_t* intrinsic = env;
    if (!value_is_box(receiver) || value_tag(receiver) != TSC_VALUE_TAG_OBJECT) {
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("collection iterator next called on incompatible receiver"));
    }
    tsc_object_t* object = value_ptr(receiver);
    collection_iterator_t* state = object->is_collection_iterator ? object->class_ptr : NULL;
    if (!state || state->is_map != intrinsic->is_map) {
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("collection iterator next called on incompatible receiver"));
    }
    tsc_value_t key, value;
    if (!collection_step(state, &key, &value)) return tsc_iterator_result(tsc_value_undefined(), true);
    void* volatile key_root = tsc_value_gc_root(key);
    void* volatile value_root = tsc_value_gc_root(value);
    tsc_value_t result = state->kind == COLLECTION_KEYS ? key : value;
    if (state->kind == COLLECTION_ENTRIES) {
        tsc_array_t* pair = tsc_array_new(sizeof(tsc_value_t), 2);
        tsc_array_push_raw(pair, &key);
        tsc_array_push_raw(pair, &value);
        result = tsc_value_array(pair);
    }
    (void)key_root; (void)value_root;
    return tsc_iterator_result(result, false);
}

static tsc_value_t collection_method_apply(void* env, tsc_value_t receiver, tsc_array_t* args) {
    const collection_method_t* method = env;
    collection_iterator_t* source = collection_cursor(method->is_map, receiver, method->operation);
    tsc_map_t* map = source->map;
    tsc_set_t* set = source->set;
    tsc_value_t key = collection_argument(args, 0);
    tsc_value_t value = method->is_map ? collection_argument(args, 1) : key;
    void* volatile key_root = tsc_value_gc_root(key);
    void* volatile value_root = tsc_value_gc_root(value);
    switch (method->operation) {
        case COLLECTION_KEYS: case COLLECTION_VALUES: case COLLECTION_ENTRIES: {
            tsc_object_t* iterator = tsc_object_new_with_prototype(tsc_value_object(method->iterator_prototype));
            iterator->class_ptr = source;
            iterator->is_collection_iterator = true;
            return tsc_value_object(iterator);
        }
        case COLLECTION_SIZE: return tsc_value_num((double)(map ? map->len : set->len));
        case COLLECTION_CLEAR:
            if (map) tsc_map_clear(map); else tsc_set_clear(set);
            return tsc_value_undefined();
        case COLLECTION_WRITE: {
            if (!value_is_box(key) && value_as_num(key) == 0) key = tsc_value_num(0);
            if (!map) value = key;
            size_t key_width = map ? map->ks : set->es;
            void* key_storage = TSC_GC_MALLOC(key_width);
            collection_unbox(key, key_storage, key_width,
                map ? map->box_key : set->box_value, map ? map->unbox_key : set->unbox_value);
            if (map) {
                void* value_storage = TSC_GC_MALLOC(map->vs);
                collection_unbox(value, value_storage, map->vs, map->box_value, map->unbox_value);
                tsc_map_set_raw(map, key_storage, value_storage);
            } else tsc_set_add_raw(set, key_storage);
            return receiver;
        }
        case COLLECTION_FOR_EACH: {
            tsc_value_t callback = key;
            tsc_value_t this_arg = collection_argument(args, 1);
            void* volatile this_root = tsc_value_gc_root(this_arg);
            if (!tsc_value_is_callable(callback)) {
                tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("collection forEach callback is not callable"));
            }
            tsc_value_t entry_key, entry_value;
            while (collection_step(source, &entry_key, &entry_value)) {
                void* volatile entry_key_root = tsc_value_gc_root(entry_key);
                void* volatile entry_value_root = tsc_value_gc_root(entry_value);
                tsc_array_t* actual = tsc_array_new(sizeof(tsc_value_t), 3);
                tsc_array_push_raw(actual, &entry_value);
                tsc_array_push_raw(actual, &entry_key);
                tsc_array_push_raw(actual, &receiver);
                (void)tsc_value_apply_function(callback, this_arg, tsc_value_array(actual));
                (void)entry_key_root; (void)entry_value_root;
            }
            (void)this_root;
            return tsc_value_undefined();
        }
        default: {
            size_t index = collection_find(source, key);
            if (method->operation == COLLECTION_HAS) return tsc_value_bool(index != TSC_BKT_EMPTY);
            if (method->operation == COLLECTION_GET) {
                return index == TSC_BKT_EMPTY ? tsc_value_undefined()
                    : collection_box(map->box_value, (char*)map->values + index * map->vs, map->vs);
            }
            if (index == TSC_BKT_EMPTY) return tsc_value_bool(false);
            // The actual stored key owns the native lookup representation.
            if (map) {
                void* stored = (char*)map->keys + index * map->ks;
                return tsc_value_bool(tsc_map_delete_raw(map, stored));
            }
            void* stored = (char*)set->data + index * set->es;
            return tsc_value_bool(tsc_set_delete_raw(set, stored));
        }
    }
    (void)key_root; (void)value_root;
}

static tsc_value_t collection_species_get(void* env, tsc_value_t receiver, tsc_array_t* args) {
    (void)env; (void)args;
    return receiver;
}

static tsc_value_t collection_constructor_apply(void* env, tsc_value_t receiver, tsc_array_t* args) {
    (void)receiver;
    collection_intrinsics_t* intrinsic = env;
    tsc_value_t new_target = tsc_value_current_new_target();
    if (tsc_value_is_undefined(new_target)) {
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("collection constructor requires new"));
    }
    tsc_value_t prototype = tsc_value_get_prototype_from_constructor(new_target, intrinsic->is_map
        ? TSC_INTRINSIC_DEFAULT_MAP_PROTOTYPE : TSC_INTRINSIC_DEFAULT_SET_PROTOTYPE);
    void* volatile prototype_root = tsc_value_gc_root(prototype);
    tsc_value_t result = intrinsic->is_map
        ? tsc_value_map(tsc_map_new(sizeof(tsc_value_t), sizeof(tsc_value_t), TSC_KEY_VALUE, 0))
        : tsc_value_set(tsc_set_new(sizeof(tsc_value_t), TSC_KEY_VALUE, 0));
    void* volatile result_root = tsc_value_gc_root(result);
    (void)tsc_value_set_prototype_of(result, prototype);
    tsc_value_t input = collection_argument(args, 0);
    if (tsc_value_is_nullish(input)) return result;
    tsc_value_t adder = tsc_value_get_prop(result, tsc_str_from_cstr(intrinsic->is_map ? "set" : "add"));
    void* volatile adder_root = tsc_value_gc_root(adder);
    if (!tsc_value_is_callable(adder)) {
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("collection constructor adder is not callable"));
    }
    tsc_sync_iterator_t* iterator = TSC_GC_MALLOC(sizeof(*iterator));
    *iterator = tsc_sync_iterator_open(input);
    TSC_TRY_FRAME(frame);
    tsc_try_push(&frame);
    if (setjmp(frame.jb) == 0) {
        tsc_value_t item;
        while (tsc_sync_iterator_step(iterator, &item)) {
            void* volatile item_root = tsc_value_gc_root(item);
            tsc_value_t key = item;
            if (intrinsic->is_map) {
                if (!tsc_value_is_object(item)) {
                    tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Map constructor entry is not an object"));
                }
                key = tsc_value_get_prop(item, tsc_str_from_lit("0", 1));
            }
            void* volatile key_root = tsc_value_gc_root(key);
            tsc_value_t value = intrinsic->is_map ? tsc_value_get_prop(item, tsc_str_from_lit("1", 1)) : key;
            void* volatile value_root = tsc_value_gc_root(value);
            tsc_array_t* actual = tsc_array_new(sizeof(tsc_value_t), intrinsic->is_map ? 2 : 1);
            tsc_array_push_raw(actual, &key);
            if (intrinsic->is_map) tsc_array_push_raw(actual, &value);
            (void)tsc_value_apply_function(adder, result, tsc_value_array(actual));
            (void)item_root; (void)key_root; (void)value_root;
        }
        tsc_try_pop();
    } else {
        tsc_value_t error = tsc_current_error_value();
        tsc_try_pop();
        tsc_sync_iterator_close_abrupt(iterator, error);
    }
    (void)prototype_root; (void)result_root; (void)adder_root;
    return result;
}

static collection_intrinsics_t* collection_intrinsics(bool is_map) {
    const void* state_key = &collection_intrinsics_keys[is_map ? 0 : 1];
    collection_intrinsics_t* state = tsc_realm_state_get(state_key);
    if (state) return state;
    tsc_runtime_lock();
    state = tsc_realm_state_get(state_key);
    if (!state) {
        state = TSC_GC_MALLOC(sizeof(*state));
        *state = (collection_intrinsics_t){ .is_map = is_map, .prototype = tsc_object_new(),
            .iterator_prototype = tsc_object_new_with_prototype(tsc_iterator_prototype_value()) };
        tsc_realm_state_set(state_key, state);
        tsc_str_t* name = tsc_str_from_cstr(is_map ? "Map" : "Set");
        state->constructor = tsc_value_function_named_kind(collection_constructor_apply,
            collection_constructor_apply, state, 0, name, TSC_FUNCTION_IDENTITY_BUILTIN);
        state->constructor_root = tsc_value_gc_root(state->constructor);
        tsc_function_identity_t* identity = value_ptr(state->constructor);
        identity->construct_allocates_receiver = false;
        identity->construct_default_prototype = is_map
            ? TSC_INTRINSIC_DEFAULT_MAP_PROTOTYPE : TSC_INTRINSIC_DEFAULT_SET_PROTOTYPE;
        tsc_function_identity_set_own_prototype(identity, tsc_value_object(state->prototype));
        identity->func_prototype_writable = false;
        tsc_object_define(state->prototype, tsc_str_from_lit("constructor", 11), state->constructor, true, false, true);
        tsc_object_define(state->prototype, tsc_symbol_property_key(tsc_symbol_to_string_tag()),
            tsc_value_string(name), false, false, true);
        tsc_object_define(state->iterator_prototype, tsc_str_from_lit("next", 4),
            tsc_value_function_builtin_named(collection_iterator_next, state, 0, tsc_str_from_lit("next", 4)),
            true, false, true);
        tsc_object_define(state->iterator_prototype, tsc_symbol_property_key(tsc_symbol_to_string_tag()),
            tsc_value_string(tsc_str_from_cstr(is_map ? "Map Iterator" : "Set Iterator")), false, false, true);
        static const struct { const char* name; collection_operation_t operation; double length; bool map_only; } methods[] = {
            { "get", COLLECTION_GET, 1, true }, { "has", COLLECTION_HAS, 1, false },
            { "delete", COLLECTION_DELETE, 1, false }, { "clear", COLLECTION_CLEAR, 0, false },
            { "keys", COLLECTION_KEYS, 0, false }, { "values", COLLECTION_VALUES, 0, false },
            { "entries", COLLECTION_ENTRIES, 0, false }, { "forEach", COLLECTION_FOR_EACH, 1, false },
            { "size", COLLECTION_SIZE, 0, false }, { "write", COLLECTION_WRITE, 0, false },
        };
        tsc_value_t values_method = tsc_value_undefined();
        for (size_t index = 0; index < sizeof(methods) / sizeof(*methods); ++index) {
            if (methods[index].map_only && !is_map) continue;
            collection_operation_t operation = methods[index].operation;
            if (!is_map && operation == COLLECTION_KEYS) continue;
            collection_method_t* method = TSC_GC_MALLOC(sizeof(*method));
            *method = (collection_method_t){ .is_map = is_map, .operation = operation,
                .iterator_prototype = state->iterator_prototype };
            const char* method_name = operation == COLLECTION_WRITE ? (is_map ? "set" : "add")
                : operation == COLLECTION_SIZE ? "get size" : methods[index].name;
            double length = operation == COLLECTION_WRITE ? (is_map ? 2 : 1) : methods[index].length;
            tsc_value_t function = tsc_value_function_builtin_named(collection_method_apply, method, length,
                tsc_str_from_cstr(method_name));
            void* volatile function_root = tsc_value_gc_root(function);
            if (operation == COLLECTION_SIZE) {
                tsc_object_t* descriptor = tsc_object_new();
                tsc_object_set(descriptor, tsc_str_from_lit("get", 3), function);
                tsc_object_set(descriptor, tsc_str_from_lit("configurable", 12), tsc_value_bool(true));
                tsc_value_define_property_descriptor(tsc_value_object(state->prototype),
                    tsc_str_from_lit("size", 4), tsc_value_object(descriptor));
            } else {
                tsc_object_define(state->prototype, tsc_str_from_cstr(method_name), function, true, false, true);
                if (operation == COLLECTION_VALUES) values_method = function;
                if (operation == (is_map ? COLLECTION_ENTRIES : COLLECTION_VALUES)) {
                    tsc_object_define(state->prototype, tsc_symbol_property_key(tsc_symbol_iterator()), function, true, false, true);
                }
            }
            (void)function_root;
        }
        if (!is_map) tsc_object_define(state->prototype, tsc_str_from_lit("keys", 4), values_method, true, false, true);
        tsc_object_t* descriptor = tsc_object_new();
        tsc_object_set(descriptor, tsc_str_from_lit("get", 3), tsc_value_function_builtin_named(
            collection_species_get, NULL, 0, tsc_str_from_lit("get [Symbol.species]", 20)));
        tsc_object_set(descriptor, tsc_str_from_lit("configurable", 12), tsc_value_bool(true));
        tsc_value_define_property_descriptor(state->constructor,
            tsc_symbol_property_key(tsc_symbol_species()), tsc_value_object(descriptor));
    }
    tsc_runtime_unlock();
    return state;
}

tsc_value_t tsc_map_prototype_value(void) { return tsc_value_object(collection_intrinsics(true)->prototype); }
tsc_value_t tsc_set_prototype_value(void) { return tsc_value_object(collection_intrinsics(false)->prototype); }
tsc_value_t tsc_map_constructor_value(void) { return collection_intrinsics(true)->constructor; }
tsc_value_t tsc_set_constructor_value(void) { return collection_intrinsics(false)->constructor; }
