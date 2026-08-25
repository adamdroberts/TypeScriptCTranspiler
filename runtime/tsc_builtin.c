#include "tsc_internal.h"

/* ---------------- Symbol ---------------- */

typedef struct tsc_symbol_registry_entry {
    tsc_str_t* key;
    tsc_symbol_t* sym;
    struct tsc_symbol_registry_entry* next;
} tsc_symbol_registry_entry_t;

static uint64_t tsc_next_symbol_id = 1;
static tsc_symbol_registry_entry_t* tsc_symbol_registry = NULL;

typedef struct {
    tsc_well_known_symbol_descriptor_t descriptor;
    tsc_symbol_t* value;
} tsc_well_known_symbol_entry_t;

#define TSC_WELL_KNOWN_SYMBOL_ENTRY(property, description, internal_key) \
    { { property, sizeof(property) - 1, description, sizeof(description) - 1, \
        internal_key, sizeof(internal_key) - 1 }, NULL }

static tsc_well_known_symbol_entry_t tsc_well_known_symbols[TSC_WELL_KNOWN_SYMBOL_COUNT] = {
    [TSC_WELL_KNOWN_SYMBOL_ASYNC_ITERATOR] = TSC_WELL_KNOWN_SYMBOL_ENTRY("asyncIterator", "Symbol.asyncIterator", "__tsc_symbol_asyncIterator"),
    [TSC_WELL_KNOWN_SYMBOL_ASYNC_DISPOSE] = TSC_WELL_KNOWN_SYMBOL_ENTRY("asyncDispose", "Symbol.asyncDispose", "__tsc_symbol_asyncDispose"),
    [TSC_WELL_KNOWN_SYMBOL_DISPOSE] = TSC_WELL_KNOWN_SYMBOL_ENTRY("dispose", "Symbol.dispose", "__tsc_symbol_dispose"),
    [TSC_WELL_KNOWN_SYMBOL_HAS_INSTANCE] = TSC_WELL_KNOWN_SYMBOL_ENTRY("hasInstance", "Symbol.hasInstance", "__tsc_symbol_hasInstance"),
    [TSC_WELL_KNOWN_SYMBOL_IS_CONCAT_SPREADABLE] = TSC_WELL_KNOWN_SYMBOL_ENTRY("isConcatSpreadable", "Symbol.isConcatSpreadable", "__tsc_symbol_isConcatSpreadable"),
    [TSC_WELL_KNOWN_SYMBOL_ITERATOR] = TSC_WELL_KNOWN_SYMBOL_ENTRY("iterator", "Symbol.iterator", "__tsc_symbol_iterator"),
    [TSC_WELL_KNOWN_SYMBOL_MATCH] = TSC_WELL_KNOWN_SYMBOL_ENTRY("match", "Symbol.match", "__tsc_symbol_match"),
    [TSC_WELL_KNOWN_SYMBOL_MATCH_ALL] = TSC_WELL_KNOWN_SYMBOL_ENTRY("matchAll", "Symbol.matchAll", "__tsc_symbol_matchAll"),
    [TSC_WELL_KNOWN_SYMBOL_REPLACE] = TSC_WELL_KNOWN_SYMBOL_ENTRY("replace", "Symbol.replace", "__tsc_symbol_replace"),
    [TSC_WELL_KNOWN_SYMBOL_SEARCH] = TSC_WELL_KNOWN_SYMBOL_ENTRY("search", "Symbol.search", "__tsc_symbol_search"),
    [TSC_WELL_KNOWN_SYMBOL_SPECIES] = TSC_WELL_KNOWN_SYMBOL_ENTRY("species", "Symbol.species", "__tsc_symbol_species"),
    [TSC_WELL_KNOWN_SYMBOL_SPLIT] = TSC_WELL_KNOWN_SYMBOL_ENTRY("split", "Symbol.split", "__tsc_symbol_split"),
    [TSC_WELL_KNOWN_SYMBOL_TO_PRIMITIVE] = TSC_WELL_KNOWN_SYMBOL_ENTRY("toPrimitive", "Symbol.toPrimitive", "__tsc_symbol_toPrimitive"),
    [TSC_WELL_KNOWN_SYMBOL_TO_STRING_TAG] = TSC_WELL_KNOWN_SYMBOL_ENTRY("toStringTag", "Symbol.toStringTag", "__tsc_symbol_toStringTag"),
    [TSC_WELL_KNOWN_SYMBOL_UNSCOPABLES] = TSC_WELL_KNOWN_SYMBOL_ENTRY("unscopables", "Symbol.unscopables", "__tsc_symbol_unscopables"),
};

#undef TSC_WELL_KNOWN_SYMBOL_ENTRY

tsc_symbol_t* tsc_symbol_new(const tsc_str_t* description) {
    tsc_symbol_t* sym = (tsc_symbol_t*)TSC_GC_MALLOC(sizeof(tsc_symbol_t));
    sym->id = TSC_ID_INC(tsc_next_symbol_id) - 1;
    sym->description = (tsc_str_t*)description;
    sym->global_key = NULL;
    return sym;
}

tsc_symbol_t* tsc_symbol_for(const tsc_str_t* key) {
    tsc_runtime_lock();
    for (tsc_symbol_registry_entry_t* e = tsc_symbol_registry; e; e = e->next) {
        if (tsc_str_eq(e->key, key)) {
            tsc_runtime_unlock();
            return e->sym;
        }
    }
    tsc_symbol_t* sym = tsc_symbol_new(key);
    sym->global_key = (tsc_str_t*)key;
    tsc_symbol_registry_entry_t* entry =
        (tsc_symbol_registry_entry_t*)TSC_GC_MALLOC(sizeof(tsc_symbol_registry_entry_t));
    entry->key = (tsc_str_t*)key;
    entry->sym = sym;
    entry->next = tsc_symbol_registry;
    tsc_symbol_registry = entry;
    tsc_runtime_unlock();
    return sym;
}

tsc_str_t* tsc_symbol_key_for(const tsc_symbol_t* sym) {
    return sym ? sym->global_key : NULL;
}

const tsc_well_known_symbol_descriptor_t* tsc_symbol_well_known_descriptor(
    tsc_well_known_symbol_kind_t kind
) {
    if ((size_t)kind >= TSC_WELL_KNOWN_SYMBOL_COUNT) return NULL;
    return &tsc_well_known_symbols[(size_t)kind].descriptor;
}

tsc_symbol_t* tsc_symbol_well_known(tsc_well_known_symbol_kind_t kind) {
    if ((size_t)kind >= TSC_WELL_KNOWN_SYMBOL_COUNT) return NULL;
    tsc_well_known_symbol_entry_t* entry = &tsc_well_known_symbols[(size_t)kind];
    if (!entry->value) {
        tsc_runtime_lock();
        if (!entry->value) {
            entry->value = tsc_symbol_new(tsc_str_from_lit(
                entry->descriptor.description,
                entry->descriptor.description_len
            ));
        }
        tsc_runtime_unlock();
    }
    return entry->value;
}

tsc_symbol_t* tsc_symbol_async_iterator(void) { return tsc_symbol_well_known(TSC_WELL_KNOWN_SYMBOL_ASYNC_ITERATOR); }
tsc_symbol_t* tsc_symbol_async_dispose(void) { return tsc_symbol_well_known(TSC_WELL_KNOWN_SYMBOL_ASYNC_DISPOSE); }
tsc_symbol_t* tsc_symbol_dispose(void) { return tsc_symbol_well_known(TSC_WELL_KNOWN_SYMBOL_DISPOSE); }
tsc_symbol_t* tsc_symbol_has_instance(void) { return tsc_symbol_well_known(TSC_WELL_KNOWN_SYMBOL_HAS_INSTANCE); }
tsc_symbol_t* tsc_symbol_is_concat_spreadable(void) { return tsc_symbol_well_known(TSC_WELL_KNOWN_SYMBOL_IS_CONCAT_SPREADABLE); }
tsc_symbol_t* tsc_symbol_iterator(void) { return tsc_symbol_well_known(TSC_WELL_KNOWN_SYMBOL_ITERATOR); }
tsc_symbol_t* tsc_symbol_match(void) { return tsc_symbol_well_known(TSC_WELL_KNOWN_SYMBOL_MATCH); }
tsc_symbol_t* tsc_symbol_match_all(void) { return tsc_symbol_well_known(TSC_WELL_KNOWN_SYMBOL_MATCH_ALL); }
tsc_symbol_t* tsc_symbol_replace(void) { return tsc_symbol_well_known(TSC_WELL_KNOWN_SYMBOL_REPLACE); }
tsc_symbol_t* tsc_symbol_search(void) { return tsc_symbol_well_known(TSC_WELL_KNOWN_SYMBOL_SEARCH); }
tsc_symbol_t* tsc_symbol_species(void) { return tsc_symbol_well_known(TSC_WELL_KNOWN_SYMBOL_SPECIES); }
tsc_symbol_t* tsc_symbol_split(void) { return tsc_symbol_well_known(TSC_WELL_KNOWN_SYMBOL_SPLIT); }
tsc_symbol_t* tsc_symbol_to_primitive(void) { return tsc_symbol_well_known(TSC_WELL_KNOWN_SYMBOL_TO_PRIMITIVE); }
tsc_symbol_t* tsc_symbol_to_string_tag(void) { return tsc_symbol_well_known(TSC_WELL_KNOWN_SYMBOL_TO_STRING_TAG); }
tsc_symbol_t* tsc_symbol_unscopables(void) { return tsc_symbol_well_known(TSC_WELL_KNOWN_SYMBOL_UNSCOPABLES); }

tsc_str_t* tsc_symbol_description(const tsc_symbol_t* sym) {
    return sym ? sym->description : NULL;
}

tsc_str_t* tsc_symbol_to_string(const tsc_symbol_t* sym) {
    if (!sym || !sym->description) return tsc_str_from_lit("Symbol()", 8);
    return tsc_str_concat(
        tsc_str_concat(tsc_str_from_lit("Symbol(", 7), sym->description),
        tsc_str_from_lit(")", 1)
    );
}

/* ---------------- WeakRef ---------------- */

tsc_weakref_t* tsc_weakref_new(void* target) {
    tsc_weakref_t* ref = (tsc_weakref_t*)TSC_GC_MALLOC(sizeof(tsc_weakref_t));
    ref->target = target;
    return ref;
}

void* tsc_weakref_deref(const tsc_weakref_t* ref) {
    return ref ? ref->target : NULL;
}

/* ---------------- FinalizationRegistry ---------------- */

tsc_finregistry_t* tsc_finregistry_new(void) {
    return (tsc_finregistry_t*)TSC_GC_MALLOC(sizeof(tsc_finregistry_t));
}

void tsc_finregistry_register(tsc_finregistry_t* r, void* token) {
    if (!r) return;
    if (r->len == r->cap) {
        size_t ncap = r->cap ? r->cap * 2 : 4;
        r->entries = (tsc_finregistry_entry_t*)TSC_GC_REALLOC(
            r->entries, ncap * sizeof(tsc_finregistry_entry_t));
        r->cap = ncap;
    }
    r->entries[r->len++].unregister_token = token;
}

bool tsc_finregistry_unregister(tsc_finregistry_t* r, void* token) {
    if (!r || !token) return false;
    bool found = false;
    size_t w = 0;
    for (size_t i = 0; i < r->len; i++) {
        if (r->entries[i].unregister_token == token) {
            found = true;
        } else {
            r->entries[w++] = r->entries[i];
        }
    }
    r->len = w;
    return found;
}

/* ---------------- numbers ---------------- */
/* tsc_num_mod is defined as `static inline` in tsc_runtime.h. */

double tsc_parse_float(const tsc_str_t* s) {
    if (!s || s->len == 0) return NAN;
    char buf[64];
    size_t n = s->len < 63 ? s->len : 63;
    memcpy(buf, s->data, n);
    buf[n] = '\0';
    char* end;
    double v = strtod(buf, &end);
    if (end == buf) return NAN;
    return v;
}

double tsc_parse_int(const tsc_str_t* s, double radix) {
    if (!s || s->len == 0) return NAN;
    char buf[64];
    size_t n = s->len < 63 ? s->len : 63;
    memcpy(buf, s->data, n);
    buf[n] = '\0';
    int base = (isfinite(radix) ? (int)radix : 0);
    if (base != 0 && (base < 2 || base > 36)) return NAN;
    if (base == 0) {
        const char* p = buf;
        while (isspace((unsigned char)*p)) p++;
        if (*p == '+' || *p == '-') p++;
        base = (p[0] == '0' && (p[1] == 'x' || p[1] == 'X')) ? 16 : 10;
    }
    char* end;
    long v = strtol(buf, &end, base);
    if (end == buf) return NAN;
    return (double)v;
}

double tsc_math_random(void) {
    return (double)rand() / ((double)RAND_MAX + 1.0);
}

double tsc_math_round(double x) {
    if (isnan(x) || isinf(x) || x == 0.0) return x;
    if (x >= -0.5 && x < 0.0) return -0.0;
    return floor(x + 0.5);
}

double tsc_math_sign(double x) {
    if (isnan(x) || x == 0.0) return x;
    return x > 0.0 ? 1.0 : -1.0;
}

uint32_t tsc_to_uint32(double n) {
    if (!isfinite(n) || n == 0.0) return 0;
    double i = n < 0.0 ? ceil(n) : floor(n);
    double mod = fmod(i, 4294967296.0);
    if (mod < 0.0) mod += 4294967296.0;
    return (uint32_t)mod;
}

int32_t tsc_to_int32(double n) {
    uint32_t u = tsc_to_uint32(n);
    return u >= 0x80000000u ? (int32_t)((int64_t)u - 4294967296LL) : (int32_t)u;
}

int32_t tsc_int32_from_uint32(uint32_t u) {
    return u >= 0x80000000u ? (int32_t)((int64_t)u - 4294967296LL) : (int32_t)u;
}

int32_t tsc_shift_right_int32(int32_t value, uint32_t shift) {
    if (shift == 0) return value;
    uint32_t u = (uint32_t)value;
    uint32_t shifted = u >> shift;
    if (value < 0) shifted |= ~(UINT32_MAX >> shift);
    return tsc_int32_from_uint32(shifted);
}

double tsc_math_imul(double a, double b) {
    uint32_t ua = (uint32_t)tsc_to_int32(a);
    uint32_t ub = (uint32_t)tsc_to_int32(b);
    uint32_t product = (uint32_t)((uint64_t)ua * (uint64_t)ub);
    int32_t signed_product =
        product >= 0x80000000u ? (int32_t)((int64_t)product - 4294967296LL) : (int32_t)product;
    return (double)signed_product;
}

double tsc_math_clz32(double x) {
    uint32_t u = tsc_to_uint32(x);
    if (u == 0) return 32.0;
    double count = 0.0;
    for (int bit = 31; bit >= 0; bit--) {
        if ((u & (1u << bit)) != 0) break;
        count += 1.0;
    }
    return count;
}

double tsc_math_fround(double x) {
    return (double)(float)x;
}

double tsc_math_f16round(double x) {
    union { float f; uint32_t u; } in;
    in.f = (float)x;

    uint32_t f32 = in.u;
    uint32_t sign = (f32 >> 16) & 0x8000u;
    uint32_t exp = (f32 >> 23) & 0xffu;
    uint32_t mant = f32 & 0x7fffffu;
    uint32_t f16;

    if (exp == 0xffu) {
        f16 = sign | 0x7c00u | (mant ? 0x0200u : 0u);
    } else {
        int32_t exp16 = (int32_t)exp - 127 + 15;
        if (exp16 >= 0x1f) {
            f16 = sign | 0x7c00u;
        } else if (exp16 <= 0) {
            if (exp16 < -10) {
                f16 = sign;
            } else {
                mant |= 0x800000u;
                uint32_t shift = (uint32_t)(14 - exp16);
                uint32_t halfMant = mant >> shift;
                uint32_t roundBit = (mant >> (shift - 1u)) & 1u;
                uint32_t sticky = mant & ((1u << (shift - 1u)) - 1u);
                if (roundBit && (sticky || (halfMant & 1u))) halfMant++;
                f16 = sign | halfMant;
            }
        } else {
            uint32_t halfExp = (uint32_t)exp16 << 10;
            uint32_t halfMant = mant >> 13;
            uint32_t roundBit = (mant >> 12) & 1u;
            uint32_t sticky = mant & 0xfffu;
            if (roundBit && (sticky || (halfMant & 1u))) {
                halfMant++;
                if (halfMant == 0x400u) {
                    halfMant = 0;
                    halfExp += 0x400u;
                    if (halfExp >= 0x7c00u) {
                        f16 = sign | 0x7c00u;
                        goto decode;
                    }
                }
            }
            f16 = sign | halfExp | halfMant;
        }
    }

decode:
    sign = (f16 & 0x8000u) << 16;
    exp = (f16 >> 10) & 0x1fu;
    mant = f16 & 0x03ffu;
    uint32_t out;
    if (exp == 0x1fu) {
        out = sign | 0x7f800000u | (mant ? (mant << 13) : 0u);
    } else if (exp == 0u) {
        if (mant == 0u) {
            out = sign;
        } else {
            int32_t e = -14;
            while ((mant & 0x0400u) == 0u) {
                mant <<= 1;
                e--;
            }
            mant &= 0x03ffu;
            out = sign | ((uint32_t)(e + 127) << 23) | (mant << 13);
        }
    } else {
        out = sign | ((exp - 15u + 127u) << 23) | (mant << 13);
    }
    union { uint32_t u; float f; } result;
    result.u = out;
    return (double)result.f;
}

/* ---------------- BigInt (GMP-backed) ---------------- */

tsc_bigint_t* bigint_alloc(void) {
    tsc_bigint_t* b = (tsc_bigint_t*)TSC_GC_MALLOC(sizeof(tsc_bigint_t));
    mpz_init(b->value);
    return b;
}

const char* bigint_digits_for(const char* s, int* base) {
    if (!s) {
        *base = 10;
        return "";
    }
    const char* p = s;
    char sign = '\0';
    if (*p == '-' || *p == '+') {
        sign = *p;
        p++;
    }
    if (p[0] == '0' && (p[1] == 'x' || p[1] == 'X' || p[1] == 'o' || p[1] == 'O' || p[1] == 'b' || p[1] == 'B')) {
        *base = (p[1] == 'x' || p[1] == 'X') ? 16 : (p[1] == 'o' || p[1] == 'O') ? 8 : 2;
        p += 2;
        size_t len = strlen(p);
        char* out = (char*)TSC_GC_MALLOC_ATOMIC(len + (sign ? 2 : 1));
        size_t pos = 0;
        if (sign) out[pos++] = sign;
        memcpy(out + pos, p, len);
        out[pos + len] = '\0';
        return out;
    }
    *base = 10;
    return s;
}

tsc_bigint_t* tsc_bigint_from_lit(const char* lit) {
    tsc_bigint_t* b = bigint_alloc();
    int base = 10;
    const char* digits = bigint_digits_for(lit, &base);
    if (mpz_set_str(b->value, digits, base) != 0) {
        tsc_throw_str(tsc_str_from_cstr("BigInt: invalid literal"));
    }
    return b;
}

tsc_bigint_t* tsc_bigint_from_str(const tsc_str_t* s) {
    char* c = cstr_dup(s);
    tsc_bigint_t* b = bigint_alloc();
    int base = 10;
    const char* digits = bigint_digits_for(c, &base);
    if (mpz_set_str(b->value, digits, base) != 0) {
        tsc_throw_str(tsc_str_from_cstr("BigInt: invalid string"));
    }
    return b;
}

tsc_bigint_t* tsc_bigint_try_from_str(const tsc_str_t* s) {
    char* raw = cstr_dup(s);
    char* start = raw;
    while (isspace((unsigned char)*start)) start++;
    char* end = start + strlen(start);
    while (end > start && isspace((unsigned char)end[-1])) end--;
    *end = '\0';
    if (*start == '\0') start = "0";
    tsc_bigint_t* b = bigint_alloc();
    int base = 10;
    const char* digits = bigint_digits_for(start, &base);
    const bool valid = mpz_set_str(b->value, digits, base) == 0;
    free(raw);
    return valid ? b : NULL;
}

tsc_bigint_t* tsc_bigint_from_num(double n) {
    if (isnan(n) || isinf(n) || floor(n) != n) {
        tsc_throw_str(tsc_str_from_cstr("BigInt: number must be a finite integer"));
    }
    tsc_bigint_t* b = bigint_alloc();
    mpz_set_d(b->value, n);
    return b;
}

tsc_bigint_t* tsc_bigint_from_bool(bool v) {
    tsc_bigint_t* b = bigint_alloc();
    mpz_set_ui(b->value, v ? 1u : 0u);
    return b;
}

double tsc_bigint_to_number(const tsc_bigint_t* value) {
    if (!value || mpz_sgn(value->value) == 0) return 0.0;

    const int sign = mpz_sgn(value->value);
    mpz_t magnitude;
    mpz_init(magnitude);
    mpz_abs(magnitude, value->value);
    const size_t bit_length = mpz_sizeinbase(magnitude, 2);

    if (bit_length <= 53) {
        const double exact = mpz_get_d(magnitude);
        mpz_clear(magnitude);
        return sign < 0 ? -exact : exact;
    }
    if (bit_length > 1024) {
        mpz_clear(magnitude);
        return sign < 0 ? -INFINITY : INFINITY;
    }

    mp_bitcnt_t shift = (mp_bitcnt_t)(bit_length - 53);
    mpz_t significand;
    mpz_t remainder;
    mpz_t halfway;
    mpz_init(significand);
    mpz_init(remainder);
    mpz_init_set_ui(halfway, 1u);
    mpz_fdiv_q_2exp(significand, magnitude, shift);
    mpz_fdiv_r_2exp(remainder, magnitude, shift);
    mpz_mul_2exp(halfway, halfway, shift - 1);

    const int halfway_comparison = mpz_cmp(remainder, halfway);
    if (
        halfway_comparison > 0 ||
        (halfway_comparison == 0 && mpz_odd_p(significand))
    ) {
        mpz_add_ui(significand, significand, 1u);
    }
    if (mpz_sizeinbase(significand, 2) > 53) {
        mpz_fdiv_q_2exp(significand, significand, 1);
        shift++;
    }

    const double rounded = ldexp(mpz_get_d(significand), (int)shift);
    mpz_clear(halfway);
    mpz_clear(remainder);
    mpz_clear(significand);
    mpz_clear(magnitude);
    return sign < 0 ? -rounded : rounded;
}

tsc_bigint_t* tsc_bigint_neg(const tsc_bigint_t* a) {
    tsc_bigint_t* r = bigint_alloc();
    mpz_neg(r->value, a->value);
    return r;
}

tsc_bigint_t* tsc_bigint_add(const tsc_bigint_t* a, const tsc_bigint_t* b) {
    tsc_bigint_t* r = bigint_alloc();
    mpz_add(r->value, a->value, b->value);
    return r;
}

tsc_bigint_t* tsc_bigint_sub(const tsc_bigint_t* a, const tsc_bigint_t* b) {
    tsc_bigint_t* r = bigint_alloc();
    mpz_sub(r->value, a->value, b->value);
    return r;
}

tsc_bigint_t* tsc_bigint_mul(const tsc_bigint_t* a, const tsc_bigint_t* b) {
    tsc_bigint_t* r = bigint_alloc();
    mpz_mul(r->value, a->value, b->value);
    return r;
}

tsc_bigint_t* tsc_bigint_div(const tsc_bigint_t* a, const tsc_bigint_t* b) {
    if (mpz_sgn(b->value) == 0) tsc_throw_str(tsc_str_from_cstr("BigInt: division by zero"));
    tsc_bigint_t* r = bigint_alloc();
    mpz_tdiv_q(r->value, a->value, b->value);
    return r;
}

tsc_bigint_t* tsc_bigint_mod(const tsc_bigint_t* a, const tsc_bigint_t* b) {
    if (mpz_sgn(b->value) == 0) tsc_throw_str(tsc_str_from_cstr("BigInt: modulo by zero"));
    tsc_bigint_t* r = bigint_alloc();
    mpz_tdiv_r(r->value, a->value, b->value);
    return r;
}

tsc_bigint_t* tsc_bigint_pow(const tsc_bigint_t* a, const tsc_bigint_t* b) {
    if (mpz_sgn(b->value) < 0) tsc_throw_str(tsc_str_from_cstr("BigInt: negative exponent"));
    if (!mpz_fits_ulong_p(b->value)) tsc_throw_str(tsc_str_from_cstr("BigInt: exponent too large"));
    tsc_bigint_t* r = bigint_alloc();
    mpz_pow_ui(r->value, a->value, mpz_get_ui(b->value));
    return r;
}

tsc_bigint_t* tsc_bigint_bit_not(const tsc_bigint_t* a) {
    tsc_bigint_t* r = bigint_alloc();
    mpz_com(r->value, a->value);
    return r;
}

tsc_bigint_t* tsc_bigint_bit_and(const tsc_bigint_t* a, const tsc_bigint_t* b) {
    tsc_bigint_t* r = bigint_alloc();
    mpz_and(r->value, a->value, b->value);
    return r;
}

tsc_bigint_t* tsc_bigint_bit_or(const tsc_bigint_t* a, const tsc_bigint_t* b) {
    tsc_bigint_t* r = bigint_alloc();
    mpz_ior(r->value, a->value, b->value);
    return r;
}

tsc_bigint_t* tsc_bigint_bit_xor(const tsc_bigint_t* a, const tsc_bigint_t* b) {
    tsc_bigint_t* r = bigint_alloc();
    mpz_xor(r->value, a->value, b->value);
    return r;
}

static tsc_bigint_t* bigint_shift(
    const tsc_bigint_t* value,
    const tsc_bigint_t* count,
    bool left
) {
    bool negative = mpz_sgn(count->value) < 0;
    mpz_t magnitude;
    mpz_init(magnitude);
    mpz_abs(magnitude, count->value);
    bool effective_left = left != negative;
    if (!mpz_fits_ulong_p(magnitude)) {
        mpz_clear(magnitude);
        if (effective_left) {
            tsc_throw_error(
                TSC_ERROR_RANGE,
                tsc_str_from_cstr("BigInt shift count exceeds runtime limit")
            );
        }
        tsc_bigint_t* saturated = bigint_alloc();
        mpz_set_si(saturated->value, mpz_sgn(value->value) < 0 ? -1 : 0);
        return saturated;
    }
    unsigned long bits = mpz_get_ui(magnitude);
    mpz_clear(magnitude);
    tsc_bigint_t* result = bigint_alloc();
    if (effective_left) {
        mpz_mul_2exp(result->value, value->value, bits);
    } else {
        mpz_fdiv_q_2exp(result->value, value->value, bits);
    }
    return result;
}

tsc_bigint_t* tsc_bigint_shl(const tsc_bigint_t* a, const tsc_bigint_t* b) {
    return bigint_shift(a, b, true);
}

tsc_bigint_t* tsc_bigint_shr(const tsc_bigint_t* a, const tsc_bigint_t* b) {
    return bigint_shift(a, b, false);
}

int tsc_bigint_cmp(const tsc_bigint_t* a, const tsc_bigint_t* b) {
    return mpz_cmp(a->value, b->value);
}

bool tsc_bigint_eq(const tsc_bigint_t* a, const tsc_bigint_t* b) {
    return mpz_cmp(a->value, b->value) == 0;
}

tsc_str_t* tsc_bigint_to_string(const tsc_bigint_t* a, double radix) {
    int base = isnan(radix) || radix == 0.0 ? 10 : (int)radix;
    if (base < 2 || base > 36) tsc_throw_str(tsc_str_from_cstr("BigInt.toString: radix must be 2..36"));
    char* raw = mpz_get_str(NULL, base, a->value);
    tsc_str_t* out = tsc_str_from_cstr(raw);
    free(raw);
    return out;
}

tsc_bigint_t* tsc_process_hrtime_bigint(void) {
    struct timespec now;
    if (clock_gettime(CLOCK_MONOTONIC, &now) != 0) {
        now.tv_sec = 0;
        now.tv_nsec = 0;
    }
    tsc_bigint_t* out = bigint_alloc();
    mpz_set_ui(out->value, (unsigned long)now.tv_sec);
    mpz_mul_ui(out->value, out->value, 1000000000ul);
    mpz_add_ui(out->value, out->value, (unsigned long)now.tv_nsec);
    return out;
}

/* ---------------- RegExp (PCRE2-backed) ---------------- */

tsc_regexp_t* tsc_regexp_new(const tsc_str_t* pattern, const tsc_str_t* flags) {
    tsc_regexp_t* r = (tsc_regexp_t*)TSC_GC_MALLOC(sizeof(tsc_regexp_t));
    r->source = (tsc_str_t*)pattern;
    r->flags = (tsc_str_t*)flags;
    r->global = false;
    r->has_indices = false;
    r->ignore_case = false;
    r->multiline = false;
    r->dot_all = false;
    r->sticky = false;
    r->unicode = false;
    r->compiled = false;
    r->jit = false;
    r->cached_md = NULL;
    r->capture_count = 0;
    if (flags) {
        for (size_t i = 0; i < flags->len; i++) {
            switch (flags->data[i]) {
                case 'd': r->has_indices = true; break;
                case 'g': r->global = true; break;
                case 'i': r->ignore_case = true; break;
                case 'm': r->multiline = true; break;
                case 's': r->dot_all = true; break;
                case 'y': r->sticky = true; break;
                case 'u': r->unicode = true; break;
            }
        }
    }
    uint32_t opts = PCRE2_UTF | PCRE2_UCP;
    if (r->ignore_case) opts |= PCRE2_CASELESS;
    if (r->multiline) opts |= PCRE2_MULTILINE;
    if (r->dot_all) opts |= PCRE2_DOTALL;
    int error = 0;
    PCRE2_SIZE error_offset = 0;
    r->re = pcre2_compile((PCRE2_SPTR)pattern->data, pattern->len, opts, &error, &error_offset, NULL);
    if (r->re) {
        r->compiled = true;
        uint32_t captures = 0;
        if (pcre2_pattern_info(r->re, PCRE2_INFO_CAPTURECOUNT, &captures) == 0) {
            r->capture_count = captures;
        }
        /* JIT-compile if available; failure is non-fatal — we fall back to interpreter. */
        if (pcre2_jit_compile(r->re, PCRE2_JIT_COMPLETE) == 0) {
            r->jit = true;
        }
    }
    return r;
}

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

/* Helper: get or lazily allocate the regex's cached match_data buffer. */
pcre2_match_data* re_md(const tsc_regexp_t* re) {
    if (!re->cached_md) {
        ((tsc_regexp_t*)re)->cached_md =
            pcre2_match_data_create_from_pattern(re->re, NULL);
    }
    return re->cached_md;
}

static inline int re_match(
    const tsc_regexp_t* re,
    const tsc_str_t* s,
    size_t offset,
    uint32_t options,
    pcre2_match_data* md
) {
    if (re->jit) {
        return pcre2_jit_match(re->re, (PCRE2_SPTR)s->data, s->len, offset, options, md, NULL);
    }
    return pcre2_match(re->re, (PCRE2_SPTR)s->data, s->len, offset, options, md, NULL);
}

/* tsc_regexp_test is now `static inline` in tsc_runtime.h. */

tsc_array_t* tsc_regexp_exec(const tsc_regexp_t* re, const tsc_str_t* s) {
    if (!re->compiled) return NULL;
    pcre2_match_data* md = re_md(re);
    int rc = re_match(re, s, 0, 0, md);
    if (rc < 0) return NULL;
    PCRE2_SIZE* ovec = pcre2_get_ovector_pointer(md);
    if (ovec[0] == PCRE2_UNSET) return NULL;
    size_t nmatch = (size_t)rc;
    tsc_array_t* a = tsc_array_new(sizeof(tsc_str_t*), nmatch ? nmatch : 1);
    for (size_t i = 0; i < nmatch; i++) {
        tsc_str_t* part;
        if (ovec[2 * i] == PCRE2_UNSET) {
            part = tsc_str_from_lit("", 0);
        } else {
            size_t n = (size_t)(ovec[2 * i + 1] - ovec[2 * i]);
            part = str_alloc(n);
            memcpy((char*)part->data, s->data + ovec[2 * i], n);
        }
        tsc_array_push_raw(a, &part);
    }
    return a;
}

tsc_str_t* tsc_regexp_to_string(const tsc_regexp_t* re) {
    tsc_str_t* head = tsc_str_concat(tsc_str_from_lit("/", 1), re->source);
    tsc_str_t* tail = tsc_str_concat(tsc_str_from_lit("/", 1), re->flags);
    return tsc_str_concat(head, tail);
}

tsc_array_t* tsc_str_match_regex(const tsc_str_t* s, const tsc_regexp_t* re) {
    if (!re->compiled) return NULL;
    tsc_array_t* a = tsc_array_new(sizeof(tsc_str_t*), 4);
    pcre2_match_data* md = re_md(re);
    size_t offset = 0;
    while (offset <= s->len) {
        int rc = re_match(re, s, offset, offset == 0 ? 0 : PCRE2_NOTBOL, md);
        if (rc < 0) break;
        PCRE2_SIZE* ovec = pcre2_get_ovector_pointer(md);
        if (ovec[0] == PCRE2_UNSET) break;
        if (!re->global) {
            size_t nmatch = (size_t)rc;
            for (size_t i = 0; i < nmatch; i++) {
                tsc_str_t* part;
                if (ovec[2 * i] == PCRE2_UNSET) {
                    part = tsc_str_from_lit("", 0);
                } else {
                    size_t n = (size_t)(ovec[2 * i + 1] - ovec[2 * i]);
                    part = str_alloc(n);
                    memcpy((char*)part->data, s->data + ovec[2 * i], n);
                }
                tsc_array_push_raw(a, &part);
            }
            break;
        }
        size_t n = (size_t)(ovec[1] - ovec[0]);
        tsc_str_t* match = str_alloc(n);
        memcpy((char*)match->data, s->data + ovec[0], n);
        tsc_array_push_raw(a, &match);
        if (ovec[1] == ovec[0]) {
            if (offset < s->len) offset = (size_t)ovec[1] + 1;
            else break;
        } else {
            offset = (size_t)ovec[1];
        }
    }
    return a->len > 0 ? a : NULL;
}

tsc_array_t* tsc_str_match_all_regex(const tsc_str_t* s, const tsc_regexp_t* re) {
    tsc_array_t* out = tsc_array_new(sizeof(tsc_array_t*), 4);
    if (!re->compiled) return out;
    pcre2_match_data* md = re_md(re);
    size_t offset = 0;
    while (offset <= s->len) {
        int rc = re_match(re, s, offset, offset == 0 ? 0 : PCRE2_NOTBOL, md);
        if (rc < 0) break;
        PCRE2_SIZE* ovec = pcre2_get_ovector_pointer(md);
        if (ovec[0] == PCRE2_UNSET) break;
        size_t nmatch = (size_t)rc;
        tsc_array_t* group = tsc_array_new(sizeof(tsc_str_t*), nmatch);
        for (size_t i = 0; i < nmatch; i++) {
            tsc_str_t* part;
            if (ovec[2 * i] == PCRE2_UNSET) {
                part = tsc_str_from_lit("", 0);
            } else {
                size_t n = (size_t)(ovec[2 * i + 1] - ovec[2 * i]);
                part = str_alloc(n);
                memcpy((char*)part->data, s->data + ovec[2 * i], n);
            }
            tsc_array_push_raw(group, &part);
        }
        tsc_array_push_raw(out, &group);
        if (ovec[1] == ovec[0]) {
            if (offset < s->len) offset = (size_t)ovec[1] + 1;
            else break;
        } else {
            offset = (size_t)ovec[1];
        }
    }
    return out;
}

double tsc_str_search_regex(const tsc_str_t* s, const tsc_regexp_t* re) {
    if (!re->compiled) return -1.0;
    pcre2_match_data* md = re_md(re);
    int rc = re_match(re, s, 0, 0, md);
    if (rc < 0) return -1.0;
    PCRE2_SIZE* ovec = pcre2_get_ovector_pointer(md);
    if (ovec[0] == PCRE2_UNSET) return -1.0;
    return (double)ovec[0];
}

void replace_append(char** out, size_t* pos, size_t* cap, const char* data, size_t len) {
    if (len == 0) return;
    if (*pos + len >= *cap) {
        *cap = *pos + len + 64;
        *out = (char*)realloc(*out, *cap);
    }
    memcpy(*out + *pos, data, len);
    *pos += len;
}

void replace_append_string_expanded(
    char** out,
    size_t* pos,
    size_t* cap,
    const tsc_str_t* source,
    const tsc_str_t* repl,
    size_t start,
    size_t end
) {
    for (size_t i = 0; i < repl->len; i++) {
        char ch = repl->data[i];
        if (ch != '$' || i + 1 >= repl->len) {
            replace_append(out, pos, cap, &ch, 1);
            continue;
        }
        char next = repl->data[++i];
        if (next == '$') {
            replace_append(out, pos, cap, "$", 1);
        } else if (next == '&') {
            replace_append(out, pos, cap, source->data + start, end - start);
        } else if (next == '`') {
            replace_append(out, pos, cap, source->data, start);
        } else if (next == '\'') {
            replace_append(out, pos, cap, source->data + end, source->len - end);
        } else {
            replace_append(out, pos, cap, "$", 1);
            replace_append(out, pos, cap, &next, 1);
        }
    }
}

static void replace_append_expanded(
    char** out,
    size_t* pos,
    size_t* cap,
    const tsc_str_t* source,
    const tsc_str_t* repl,
    const PCRE2_SIZE* ovec,
    int rc
) {
    for (size_t i = 0; i < repl->len; i++) {
        char ch = repl->data[i];
        if (ch != '$' || i + 1 >= repl->len) {
            replace_append(out, pos, cap, &ch, 1);
            continue;
        }
        char next = repl->data[++i];
        if (next == '$') {
            replace_append(out, pos, cap, "$", 1);
        } else if (next == '&') {
            replace_append(out, pos, cap, source->data + ovec[0], (size_t)(ovec[1] - ovec[0]));
        } else if (next == '`') {
            replace_append(out, pos, cap, source->data, (size_t)ovec[0]);
        } else if (next == '\'') {
            replace_append(out, pos, cap, source->data + ovec[1], source->len - (size_t)ovec[1]);
        } else if (next >= '1' && next <= '9') {
            int group = next - '0';
            if (group < rc) {
                PCRE2_SIZE start = ovec[(size_t)group * 2];
                PCRE2_SIZE end = ovec[(size_t)group * 2 + 1];
                if (start != PCRE2_UNSET && end != PCRE2_UNSET) {
                    replace_append(out, pos, cap, source->data + start, (size_t)(end - start));
                }
            } else {
                replace_append(out, pos, cap, "$", 1);
                replace_append(out, pos, cap, &next, 1);
            }
        } else {
            replace_append(out, pos, cap, "$", 1);
            replace_append(out, pos, cap, &next, 1);
        }
    }
}

tsc_str_t* tsc_str_replace_regex(const tsc_str_t* s, const tsc_regexp_t* re, const tsc_str_t* repl) {
    if (!re->compiled) return (tsc_str_t*)s;
    size_t cap = s->len + 64;
    char* out = (char*)malloc(cap);
    size_t pos = 0;
    size_t offset = 0;
    pcre2_match_data* md = re_md(re);
    while (offset <= s->len) {
        int rc = re_match(re, s, offset, offset == 0 ? 0 : PCRE2_NOTBOL, md);
        if (rc < 0) {
            size_t n = s->len - offset;
            if (pos + n >= cap) { cap = pos + n + 32; out = (char*)realloc(out, cap); }
            memcpy(out + pos, s->data + offset, n);
            pos += n;
            break;
        }
        PCRE2_SIZE* ovec = pcre2_get_ovector_pointer(md);
        if (ovec[0] == PCRE2_UNSET) break;
        size_t pre = (size_t)ovec[0] - offset;
        replace_append(&out, &pos, &cap, s->data + offset, pre);
        replace_append_expanded(&out, &pos, &cap, s, repl, ovec, rc);
        if (ovec[1] == ovec[0]) {
            if (ovec[1] < s->len) {
                replace_append(&out, &pos, &cap, s->data + ovec[1], 1);
                offset = (size_t)ovec[1] + 1;
            } else {
                break;
            }
        } else {
            offset = (size_t)ovec[1];
        }
        if (!re->global) {
            size_t n = s->len - offset;
            if (pos + n >= cap) { cap = pos + n + 32; out = (char*)realloc(out, cap); }
            memcpy(out + pos, s->data + offset, n);
            pos += n;
            break;
        }
    }
    tsc_str_t* r = str_alloc(pos);
    memcpy((char*)r->data, out, pos);
    free(out);
    return r;
}

tsc_array_t* tsc_str_split_regex_limit(const tsc_str_t* s, const tsc_regexp_t* re, uint32_t limit) {
    tsc_array_t* a = tsc_array_new(sizeof(tsc_str_t*), 4);
    if (limit == 0) return a;
    if (!re->compiled) {
        tsc_str_t* copy = str_alloc(s->len);
        memcpy((char*)copy->data, s->data, s->len);
        tsc_array_push_raw(a, &copy);
        return a;
    }
    size_t offset = 0;
    pcre2_match_data* md = re_md(re);
    while (offset <= s->len && a->len < limit) {
        int rc = re_match(re, s, offset, offset == 0 ? 0 : PCRE2_NOTBOL, md);
        if (rc < 0) break;
        PCRE2_SIZE* ovec = pcre2_get_ovector_pointer(md);
        if (ovec[0] == PCRE2_UNSET) break;
        size_t pre = (size_t)ovec[0] - offset;
        tsc_str_t* part = str_alloc(pre);
        if (pre > 0) memcpy((char*)part->data, s->data + offset, pre);
        tsc_array_push_raw(a, &part);
        if (a->len >= limit) return a;
        for (int group = 1; group < rc && a->len < limit; group++) {
            PCRE2_SIZE start = ovec[group * 2];
            PCRE2_SIZE end = ovec[group * 2 + 1];
            if (start == PCRE2_UNSET || end == PCRE2_UNSET) continue;
            size_t cap_len = (size_t)(end - start);
            tsc_str_t* captured = str_alloc(cap_len);
            if (cap_len > 0) memcpy((char*)captured->data, s->data + start, cap_len);
            tsc_array_push_raw(a, &captured);
        }
        if (a->len >= limit) return a;
        if (ovec[1] == ovec[0]) {
            if (ovec[1] < s->len) offset = (size_t)ovec[1] + 1;
            else break;
        } else {
            offset = (size_t)ovec[1];
        }
    }
    if (a->len < limit) {
        size_t n = s->len - offset;
        tsc_str_t* tail = str_alloc(n);
        if (n > 0) memcpy((char*)tail->data, s->data + offset, n);
        tsc_array_push_raw(a, &tail);
    }
    return a;
}

tsc_array_t* tsc_str_split_regex(const tsc_str_t* s, const tsc_regexp_t* re) {
    return tsc_str_split_regex_limit(s, re, UINT32_MAX);
}

tsc_array_t* tsc_str_split_regex_limit_num(const tsc_str_t* s, const tsc_regexp_t* re, double limit) {
    return tsc_str_split_regex_limit(s, re, split_limit_from_num(limit));
}

/* ---------------- JSON helpers ---------------- */

tsc_str_t* tsc_json_escape_string(const tsc_str_t* s) {
    /* Upper bound: 6x expansion for \uXXXX of every byte. */
    size_t cap = s->len * 6 + 3;
    tsc_str_t* out = (tsc_str_t*)TSC_GC_MALLOC(sizeof(tsc_str_t));
    char* buf = (char*)TSC_GC_MALLOC_ATOMIC(cap);
    size_t pos = 0;
    buf[pos++] = '"';
    for (size_t i = 0; i < s->len; i++) {
        unsigned char c = (unsigned char)s->data[i];
        switch (c) {
            case '"':  buf[pos++] = '\\'; buf[pos++] = '"'; break;
            case '\\': buf[pos++] = '\\'; buf[pos++] = '\\'; break;
            case '\n': buf[pos++] = '\\'; buf[pos++] = 'n'; break;
            case '\r': buf[pos++] = '\\'; buf[pos++] = 'r'; break;
            case '\t': buf[pos++] = '\\'; buf[pos++] = 't'; break;
            case '\b': buf[pos++] = '\\'; buf[pos++] = 'b'; break;
            case '\f': buf[pos++] = '\\'; buf[pos++] = 'f'; break;
            default:
                if (c < 0x20) {
                    pos += (size_t)snprintf(buf + pos, cap - pos, "\\u%04x", c);
                } else {
                    buf[pos++] = (char)c;
                }
        }
    }
    buf[pos++] = '"';
    buf[pos] = '\0';
    out->data = buf;
    out->len = pos;
    out->hash = 0;
    return out;
}

tsc_str_t* tsc_json_num(double n) {
    /* NaN and Infinity are invalid in JSON — emit "null" (matches JS). */
    if (isnan(n) || isinf(n)) return tsc_str_from_lit("null", 4);
    return tsc_str_from_num(n);
}

/* ---------------- Buffer ---------------- */

uint8_t byte_from_double(double n) {
    if (isnan(n) || isinf(n)) return 0;
    int64_t i = (int64_t)n;
    return (uint8_t)(i & 0xff);
}

tsc_buffer_t* buffer_alloc_len(size_t len) {
    tsc_buffer_t* b = (tsc_buffer_t*)TSC_GC_MALLOC(sizeof(tsc_buffer_t));
    b->len = len;
    b->data = (uint8_t*)TSC_GC_MALLOC_ATOMIC(len ? len : 1);
    if (len == 0) b->data[0] = 0;
    return b;
}

static size_t array_buffer_to_index(double n, const char* label) {
    if (isnan(n) || isinf(n) || n < 0.0 || floor(n) != n || n > (double)SIZE_MAX) {
        tsc_throw_str(tsc_str_from_cstr(label));
    }
    return (size_t)n;
}

tsc_array_buffer_t* tsc_array_buffer_new(double byte_length) {
    size_t len = array_buffer_to_index(byte_length, "ArrayBuffer byteLength must be a non-negative finite integer");
    tsc_array_buffer_t* b = (tsc_array_buffer_t*)TSC_GC_MALLOC(sizeof(tsc_array_buffer_t));
    b->byte_length = len;
    b->data = (uint8_t*)TSC_GC_MALLOC_ATOMIC(len ? len : 1);
    b->detached = false;
    b->object = NULL;
    if (len == 0) b->data[0] = 0;
    return b;
}

double tsc_array_buffer_byte_length(const tsc_array_buffer_t* b) {
    return b ? (double)b->byte_length : 0.0;
}

void tsc_array_buffer_detach(tsc_array_buffer_t* b) {
    if (!b || b->detached) return;
    b->byte_length = 0;
    b->data = NULL;
    b->detached = true;
}

static void data_view_require_attached(const tsc_data_view_t* view) {
    if (!view || !view->buffer || view->buffer->detached) {
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("DataView buffer is detached"));
    }
}

tsc_data_view_t* tsc_data_view_new(tsc_array_buffer_t* buffer, double byte_offset, double byte_length, bool has_byte_length) {
    if (!buffer) tsc_throw_str(tsc_str_from_cstr("DataView buffer must be an ArrayBuffer"));
    if (buffer->detached) {
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("DataView buffer is detached"));
    }
    size_t offset = array_buffer_to_index(byte_offset, "DataView byteOffset must be a non-negative finite integer");
    if (offset > buffer->byte_length) {
        tsc_throw_str(tsc_str_from_cstr("DataView byteOffset is outside the ArrayBuffer"));
    }
    size_t remaining = buffer->byte_length - offset;
    size_t length = has_byte_length
        ? array_buffer_to_index(byte_length, "DataView byteLength must be a non-negative finite integer")
        : remaining;
    if (length > remaining) {
        tsc_throw_str(tsc_str_from_cstr("DataView byteLength is outside the ArrayBuffer"));
    }
    tsc_data_view_t* v = (tsc_data_view_t*)TSC_GC_MALLOC(sizeof(tsc_data_view_t));
    v->buffer = buffer;
    v->byte_offset = offset;
    v->byte_length = length;
    v->object = NULL;
    return v;
}

tsc_array_buffer_t* tsc_data_view_buffer(const tsc_data_view_t* v) {
    return v ? v->buffer : NULL;
}

double tsc_data_view_byte_offset(const tsc_data_view_t* v) {
    data_view_require_attached(v);
    return v ? (double)v->byte_offset : 0.0;
}

double tsc_data_view_byte_length(const tsc_data_view_t* v) {
    data_view_require_attached(v);
    return v ? (double)v->byte_length : 0.0;
}

int hex_value(unsigned char c) {
    if (c >= '0' && c <= '9') return (int)(c - '0');
    if (c >= 'a' && c <= 'f') return 10 + (int)(c - 'a');
    if (c >= 'A' && c <= 'F') return 10 + (int)(c - 'A');
    return -1;
}

bool buffer_encoding_is_utf8(const tsc_str_t* encoding) {
    return !encoding || str_lit_eq(encoding, "utf8") || str_lit_eq(encoding, "utf-8");
}

bool buffer_encoding_is_base64(const tsc_str_t* encoding) {
    return str_lit_eq(encoding, "base64");
}

bool buffer_encoding_is_latin1(const tsc_str_t* encoding) {
    return encoding && (str_lit_eq(encoding, "latin1") || str_lit_eq(encoding, "binary"));
}

bool buffer_encoding_is_ascii(const tsc_str_t* encoding) {
    return encoding && str_lit_eq(encoding, "ascii");
}

size_t tsc_str_utf16_len(const tsc_str_t* s) {
    size_t count = 0;
    size_t pos = 0;
    while (pos < s->len) {
        uint32_t cp = 0xfffd;
        size_t adv = 1;
        decode_utf8_at(s, pos, &cp, &adv);
        if (cp > 0xffff) {
            count += 2;
        } else {
            count += 1;
        }
        pos += adv;
    }
    return count;
}

tsc_buffer_t* buffer_from_latin1_ascii(const tsc_str_t* input, bool is_ascii) {
    size_t len = tsc_str_utf16_len(input);
    tsc_buffer_t* b = buffer_alloc_len(len);
    size_t pos = 0;
    size_t out_idx = 0;
    uint8_t mask = is_ascii ? 0x7f : 0xff;
    while (pos < input->len) {
        uint32_t cp = 0xfffd;
        size_t adv = 1;
        decode_utf8_at(input, pos, &cp, &adv);
        if (cp > 0xffff) {
            uint32_t shifted = cp - 0x10000u;
            uint16_t hi = (uint16_t)(0xd800u + (shifted >> 10));
            uint16_t lo = (uint16_t)(0xdc00u + (shifted & 0x3ffu));
            b->data[out_idx++] = (uint8_t)(hi & mask);
            b->data[out_idx++] = (uint8_t)(lo & mask);
        } else {
            b->data[out_idx++] = (uint8_t)(cp & mask);
        }
        pos += adv;
    }
    return b;
}

tsc_str_t* string_to_latin1(const uint8_t* data, size_t len) {
    size_t utf8_len = 0;
    for (size_t i = 0; i < len; i++) {
        utf8_len += (data[i] < 0x80) ? 1 : 2;
    }
    tsc_str_t* out = str_alloc(utf8_len);
    char* p = (char*)out->data;
    size_t pos = 0;
    for (size_t i = 0; i < len; i++) {
        uint8_t b = data[i];
        if (b < 0x80) {
            p[pos++] = (char)b;
        } else {
            p[pos++] = (char)(0xc0 | (b >> 6));
            p[pos++] = (char)(0x80 | (b & 0x3f));
        }
    }
    return out;
}

tsc_str_t* string_to_ascii(const uint8_t* data, size_t len) {
    tsc_str_t* out = str_alloc(len);
    char* p = (char*)out->data;
    for (size_t i = 0; i < len; i++) {
        p[i] = (char)(data[i] & 0x7f);
    }
    return out;
}

size_t buffer_index(double raw, size_t len) {
    int64_t i = (int64_t)raw;
    if (i < 0) i = (int64_t)len + i;
    if (i < 0) i = 0;
    if ((size_t)i > len) i = (int64_t)len;
    return (size_t)i;
}

int base64_value(unsigned char c) {
    if (c >= 'A' && c <= 'Z') return (int)(c - 'A');
    if (c >= 'a' && c <= 'z') return 26 + (int)(c - 'a');
    if (c >= '0' && c <= '9') return 52 + (int)(c - '0');
    if (c == '+') return 62;
    if (c == '/') return 63;
    return -1;
}

void base64_decode_group(tsc_buffer_t* out, size_t* pos, const int* q, int qlen) {
    if (qlen < 2 || q[0] < 0 || q[1] < 0) return;
    out->data[(*pos)++] = (uint8_t)(((uint32_t)q[0] << 2) | ((uint32_t)q[1] >> 4));
    if (qlen >= 3 && q[2] >= 0) {
        out->data[(*pos)++] = (uint8_t)((((uint32_t)q[1] & 0x0fu) << 4) | ((uint32_t)q[2] >> 2));
    }
    if (qlen >= 4 && q[2] >= 0 && q[3] >= 0) {
        out->data[(*pos)++] = (uint8_t)((((uint32_t)q[2] & 0x03u) << 6) | (uint32_t)q[3]);
    }
}

tsc_buffer_t* buffer_from_base64(const tsc_str_t* input) {
    tsc_buffer_t* out = buffer_alloc_len((input->len / 4) * 3 + 3);
    size_t pos = 0;
    int q[4];
    int qlen = 0;
    for (size_t i = 0; i < input->len; i++) {
        unsigned char ch = (unsigned char)input->data[i];
        if (isspace(ch)) continue;
        int v = ch == '=' ? -2 : base64_value(ch);
        if (v < 0 && v != -2) tsc_throw_str(tsc_str_from_cstr("Buffer.from base64 input contains non-base64 digit"));
        q[qlen++] = v;
        if (qlen == 4) {
            base64_decode_group(out, &pos, q, qlen);
            qlen = 0;
        }
    }
    if (qlen > 0) base64_decode_group(out, &pos, q, qlen);
    out->len = pos;
    return out;
}

tsc_str_t* str_from_base64_bytes(const uint8_t* data, size_t len) {
    static const char alphabet[] = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    tsc_str_t* out = str_alloc(4 * ((len + 2) / 3));
    char* p = (char*)out->data;
    size_t pos = 0;
    for (size_t i = 0; i < len; i += 3) {
        uint32_t a = data[i];
        uint32_t b = i + 1 < len ? data[i + 1] : 0;
        uint32_t c = i + 2 < len ? data[i + 2] : 0;
        p[pos++] = alphabet[a >> 2];
        p[pos++] = alphabet[((a & 0x03u) << 4) | (b >> 4)];
        p[pos++] = i + 1 < len ? alphabet[((b & 0x0fu) << 2) | (c >> 6)] : '=';
        p[pos++] = i + 2 < len ? alphabet[c & 0x3fu] : '=';
    }
    return out;
}

tsc_buffer_t* tsc_buffer_from_str(const tsc_str_t* input, const tsc_str_t* encoding) {
    if (buffer_encoding_is_utf8(encoding)) {
        tsc_buffer_t* b = buffer_alloc_len(input->len);
        if (input->len > 0) memcpy(b->data, input->data, input->len);
        return b;
    }
    if (str_lit_eq(encoding, "hex")) {
        if ((input->len % 2) != 0) tsc_throw_str(tsc_str_from_cstr("Buffer.from hex input must have even length"));
        tsc_buffer_t* b = buffer_alloc_len(input->len / 2);
        for (size_t i = 0; i < b->len; i++) {
            int hi = hex_value((unsigned char)input->data[i * 2]);
            int lo = hex_value((unsigned char)input->data[i * 2 + 1]);
            if (hi < 0 || lo < 0) tsc_throw_str(tsc_str_from_cstr("Buffer.from hex input contains non-hex digit"));
            b->data[i] = (uint8_t)((hi << 4) | lo);
        }
        return b;
    }
    if (buffer_encoding_is_base64(encoding)) {
        return buffer_from_base64(input);
    }
    if (buffer_encoding_is_latin1(encoding)) {
        return buffer_from_latin1_ascii(input, false);
    }
    if (buffer_encoding_is_ascii(encoding)) {
        return buffer_from_latin1_ascii(input, false);
    }
    tsc_throw_str(tsc_str_from_cstr("Buffer.from: only utf8, hex, base64, latin1, ascii, and binary encodings are supported"));
    return NULL;
}

tsc_buffer_t* tsc_buffer_from_array(const tsc_array_t* input) {
    tsc_buffer_t* b = buffer_alloc_len(input->len);
    for (size_t i = 0; i < input->len; i++) {
        double n = TSC_ARR(double, input, i);
        b->data[i] = byte_from_double(n);
    }
    return b;
}

tsc_buffer_t* tsc_buffer_from_buffer(const tsc_buffer_t* input) {
    tsc_buffer_t* b = buffer_alloc_len(input ? input->len : 0);
    if (input && input->len > 0) memcpy(b->data, input->data, input->len);
    return b;
}

tsc_buffer_t* tsc_buffer_alloc(double size, double fill) {
    if (isnan(size) || isinf(size) || size < 0) {
        tsc_throw_str(tsc_str_from_cstr("Buffer.alloc size must be a non-negative finite number"));
    }
    size_t len = (size_t)size;
    uint8_t byte = byte_from_double(fill);
    tsc_buffer_t* b = buffer_alloc_len(len);
    if (len > 0) memset(b->data, byte, len);
    return b;
}

tsc_buffer_t* tsc_buffer_concat(const tsc_array_t* list) {
    size_t total = 0;
    for (size_t i = 0; i < list->len; i++) {
        tsc_buffer_t* part = TSC_ARR(tsc_buffer_t*, list, i);
        if (part) total += part->len;
    }
    tsc_buffer_t* out = buffer_alloc_len(total);
    size_t pos = 0;
    for (size_t i = 0; i < list->len; i++) {
        tsc_buffer_t* part = TSC_ARR(tsc_buffer_t*, list, i);
        if (!part || part->len == 0) continue;
        memcpy(out->data + pos, part->data, part->len);
        pos += part->len;
    }
    return out;
}

tsc_buffer_t* tsc_buffer_concat_len(const tsc_array_t* list, double total_length) {
    if (isnan(total_length) || isinf(total_length) || total_length < 0) {
        tsc_throw_str(tsc_str_from_cstr("Buffer.concat totalLength must be a non-negative finite number"));
    }
    size_t total = (size_t)total_length;
    tsc_buffer_t* out = buffer_alloc_len(total);
    if (total > 0) memset(out->data, 0, total);
    size_t pos = 0;
    for (size_t i = 0; i < list->len && pos < total; i++) {
        tsc_buffer_t* part = TSC_ARR(tsc_buffer_t*, list, i);
        if (!part || part->len == 0) continue;
        size_t n = part->len;
        if (n > total - pos) n = total - pos;
        memcpy(out->data + pos, part->data, n);
        pos += n;
    }
    return out;
}

tsc_str_t* tsc_buffer_to_string(const tsc_buffer_t* b, const tsc_str_t* encoding) {
    if (buffer_encoding_is_utf8(encoding)) {
        tsc_str_t* out = str_alloc(b->len);
        if (b->len > 0) memcpy((char*)out->data, b->data, b->len);
        return out;
    }
    if (str_lit_eq(encoding, "hex")) {
        static const char hex[] = "0123456789abcdef";
        tsc_str_t* out = str_alloc(b->len * 2);
        char* p = (char*)out->data;
        for (size_t i = 0; i < b->len; i++) {
            p[i * 2] = hex[b->data[i] >> 4];
            p[i * 2 + 1] = hex[b->data[i] & 0x0f];
        }
        return out;
    }
    if (buffer_encoding_is_base64(encoding)) {
        return str_from_base64_bytes(b->data, b->len);
    }
    if (buffer_encoding_is_latin1(encoding)) {
        return string_to_latin1(b->data, b->len);
    }
    if (buffer_encoding_is_ascii(encoding)) {
        return string_to_ascii(b->data, b->len);
    }
    tsc_throw_str(tsc_str_from_cstr("Buffer.toString: only utf8, hex, base64, latin1, ascii, and binary encodings are supported"));
    return NULL;
}

tsc_value_t tsc_buffer_to_json(const tsc_buffer_t* b) {
    tsc_object_t* out = tsc_object_new();
    tsc_array_t* data = tsc_array_new(sizeof(tsc_value_t), b->len);
    for (size_t i = 0; i < b->len; i++) {
        tsc_value_t value = tsc_value_num((double)b->data[i]);
        tsc_array_push_raw(data, &value);
    }
    tsc_object_set(out, tsc_str_from_lit("type", 4), tsc_value_string(tsc_str_from_lit("Buffer", 6)));
    tsc_object_set(out, tsc_str_from_lit("data", 4), tsc_value_array(data));
    return tsc_value_object(out);
}

tsc_str_t* tsc_btoa(const tsc_str_t* input) {
    return str_from_base64_bytes((const uint8_t*)input->data, input->len);
}

tsc_str_t* tsc_atob(const tsc_str_t* input) {
    tsc_buffer_t* decoded = buffer_from_base64(input);
    return tsc_buffer_to_string(decoded, tsc_str_from_lit("utf8", 4));
}

tsc_buffer_t* tsc_buffer_slice(const tsc_buffer_t* b, double start, double end) {
    size_t i0 = buffer_index(start, b->len);
    size_t i1 = buffer_index(end, b->len);
    if (i0 > i1) i0 = i1;
    size_t n = i1 - i0;
    tsc_buffer_t* out = buffer_alloc_len(n);
    if (n > 0) memcpy(out->data, b->data + i0, n);
    return out;
}

tsc_buffer_t* tsc_buffer_fill(tsc_buffer_t* b, double value, double start, double end) {
    size_t i0 = buffer_index(start, b->len);
    size_t i1 = buffer_index(end, b->len);
    if (i0 > i1) i0 = i1;
    if (i1 > i0) memset(b->data + i0, byte_from_double(value), i1 - i0);
    return b;
}

double tsc_buffer_write(tsc_buffer_t* b, const tsc_str_t* input, double offset, double length, const tsc_str_t* encoding) {
    size_t start = buffer_index(offset, b->len);
    if (start >= b->len) return 0.0;
    size_t max = b->len - start;
    if (!isnan(length)) {
        if (isinf(length) || length <= 0) return 0.0;
        size_t requested = (size_t)length;
        if (requested < max) max = requested;
    }
    tsc_buffer_t* source = tsc_buffer_from_str(input, encoding);
    size_t n = source->len < max ? source->len : max;
    if (n > 0) memcpy(b->data + start, source->data, n);
    return (double)n;
}

double tsc_buffer_copy(const tsc_buffer_t* source, tsc_buffer_t* target, double target_start, double source_start, double source_end) {
    size_t t0 = buffer_index(target_start, target->len);
    size_t s0 = buffer_index(source_start, source->len);
    size_t s1 = buffer_index(source_end, source->len);
    if (s0 > s1) s0 = s1;
    size_t n = s1 - s0;
    if (n > target->len - t0) n = target->len - t0;
    if (n > 0) memmove(target->data + t0, source->data + s0, n);
    return (double)n;
}

double tsc_buffer_index_of_byte(const tsc_buffer_t* b, double value, double offset) {
    int64_t start = (int64_t)offset;
    if (start < 0) start = (int64_t)b->len + start;
    if (start < 0) start = 0;
    if ((size_t)start >= b->len) return -1.0;
    uint8_t needle = byte_from_double(value);
    for (size_t i = (size_t)start; i < b->len; i++) {
        if (b->data[i] == needle) return (double)i;
    }
    return -1.0;
}

double tsc_buffer_last_index_of_byte(const tsc_buffer_t* b, double value, double offset) {
    if (b->len == 0) return -1.0;
    int64_t start;
    if (isnan(offset)) {
        start = (int64_t)b->len - 1;
    } else {
        start = (int64_t)offset;
        if (start < 0) start = (int64_t)b->len + start;
        if (start >= (int64_t)b->len) start = (int64_t)b->len - 1;
    }
    if (start < 0) return -1.0;
    uint8_t needle = byte_from_double(value);
    for (int64_t i = start; i >= 0; i--) {
        if (b->data[i] == needle) return (double)i;
    }
    return -1.0;
}

double buffer_index_of_bytes(const tsc_buffer_t* b, const uint8_t* needle, size_t needle_len, double offset) {
    int64_t start = (int64_t)offset;
    if (start < 0) start = (int64_t)b->len + start;
    if (start < 0) start = 0;
    if ((size_t)start > b->len) start = (int64_t)b->len;
    if (needle_len == 0) return (double)start;
    if (needle_len > b->len || (size_t)start > b->len - needle_len) return -1.0;
    for (size_t i = (size_t)start; i <= b->len - needle_len; i++) {
        if (memcmp(b->data + i, needle, needle_len) == 0) return (double)i;
    }
    return -1.0;
}

double buffer_last_index_of_bytes(const tsc_buffer_t* b, const uint8_t* needle, size_t needle_len, double offset) {
    int64_t start;
    if (isnan(offset)) {
        start = (int64_t)b->len;
    } else {
        start = (int64_t)offset;
        if (start < 0) start = (int64_t)b->len + start;
    }
    if (start < 0) return -1.0;
    if (needle_len == 0) {
        if (start > (int64_t)b->len) start = (int64_t)b->len;
        return (double)start;
    }
    if (needle_len > b->len) return -1.0;
    int64_t max_start = (int64_t)(b->len - needle_len);
    if (start > max_start) start = max_start;
    for (int64_t i = start; i >= 0; i--) {
        if (memcmp(b->data + i, needle, needle_len) == 0) return (double)i;
    }
    return -1.0;
}

double tsc_buffer_index_of_str(const tsc_buffer_t* b, const tsc_str_t* value, double offset) {
    return buffer_index_of_bytes(b, (const uint8_t*)value->data, value->len, offset);
}

double tsc_buffer_last_index_of_str(const tsc_buffer_t* b, const tsc_str_t* value, double offset) {
    return buffer_last_index_of_bytes(b, (const uint8_t*)value->data, value->len, offset);
}

double tsc_buffer_index_of_buffer(const tsc_buffer_t* b, const tsc_buffer_t* value, double offset) {
    if (!value) return -1.0;
    return buffer_index_of_bytes(b, value->data, value->len, offset);
}

double tsc_buffer_last_index_of_buffer(const tsc_buffer_t* b, const tsc_buffer_t* value, double offset) {
    if (!value) return -1.0;
    return buffer_last_index_of_bytes(b, value->data, value->len, offset);
}

bool tsc_buffer_equals(const tsc_buffer_t* a, const tsc_buffer_t* b) {
    if (a == b) return true;
    if (!a || !b || a->len != b->len) return false;
    return a->len == 0 || memcmp(a->data, b->data, a->len) == 0;
}

double tsc_buffer_compare(const tsc_buffer_t* a, const tsc_buffer_t* b) {
    if (a == b) return 0.0;
    if (!a) return b && b->len > 0 ? -1.0 : 0.0;
    if (!b) return a->len > 0 ? 1.0 : 0.0;
    size_t n = a->len < b->len ? a->len : b->len;
    int cmp = n > 0 ? memcmp(a->data, b->data, n) : 0;
    if (cmp < 0) return -1.0;
    if (cmp > 0) return 1.0;
    if (a->len < b->len) return -1.0;
    if (a->len > b->len) return 1.0;
    return 0.0;
}

static void check_compare_bound(double val, const char* name, double max_val) {
    if (isnan(val) || isinf(val) || floor(val) != val) {
        char err_msg[128];
        if (isnan(val)) {
            snprintf(err_msg, sizeof(err_msg), "The value of \"%s\" is out of range. It must be an integer. Received NaN", name);
        } else if (isinf(val)) {
            snprintf(err_msg, sizeof(err_msg), "The value of \"%s\" is out of range. It must be an integer. Received Infinity", name);
        } else {
            snprintf(err_msg, sizeof(err_msg), "The value of \"%s\" is out of range. It must be an integer. Received %g", name, val);
        }
        tsc_throw_str(tsc_str_from_cstr(err_msg));
    }
    if (val < 0.0 || val > max_val) {
        char err_msg[128];
        snprintf(err_msg, sizeof(err_msg), "The value of \"%s\" is out of range. It must be >= 0 and <= %.0f. Received %g", name, max_val, val);
        tsc_throw_str(tsc_str_from_cstr(err_msg));
    }
}

double tsc_buffer_compare_ranges(const tsc_buffer_t* source, const tsc_buffer_t* target,
                                 double target_start, double target_end,
                                 double source_start, double source_end) {
    if (!source || !target) {
        return 0.0;
    }

    check_compare_bound(target_start, "targetStart", 4294967296.0);
    check_compare_bound(target_end, "targetEnd", (double)target->len);
    check_compare_bound(source_start, "sourceStart", 4294967296.0);
    check_compare_bound(source_end, "sourceEnd", (double)source->len);

    size_t s_start = (size_t)source_start;
    size_t s_end = (size_t)source_end;
    size_t t_start = (size_t)target_start;
    size_t t_end = (size_t)target_end;

    if (s_start > s_end) s_start = s_end;
    if (t_start > t_end) t_start = t_end;

    size_t s_len = s_end - s_start;
    size_t t_len = t_end - t_start;

    size_t n = s_len < t_len ? s_len : t_len;
    int cmp = n > 0 ? memcmp(source->data + s_start, target->data + t_start, n) : 0;
    if (cmp < 0) return -1.0;
    if (cmp > 0) return 1.0;
    if (s_len < t_len) return -1.0;
    if (s_len > t_len) return 1.0;
    return 0.0;
}



double tsc_buffer_byte_length_str(const tsc_str_t* input, const tsc_str_t* encoding) {
    if (buffer_encoding_is_utf8(encoding)) return (double)input->len;
    if (str_lit_eq(encoding, "hex")) return floor((double)input->len / 2.0);
    if (buffer_encoding_is_base64(encoding)) return (double)buffer_from_base64(input)->len;
    if (buffer_encoding_is_latin1(encoding) || buffer_encoding_is_ascii(encoding)) return (double)tsc_str_utf16_len(input);
    tsc_throw_str(tsc_str_from_cstr("Buffer.byteLength: only utf8, hex, base64, latin1, ascii, and binary encodings are supported"));
    return 0.0;
}

bool tsc_buffer_is_encoding(const tsc_str_t* encoding) {
    return buffer_encoding_is_utf8(encoding) || str_lit_eq(encoding, "hex") || buffer_encoding_is_base64(encoding) || buffer_encoding_is_latin1(encoding) || buffer_encoding_is_ascii(encoding);
}

tsc_buffer_t* tsc_buffer_transcode(const tsc_buffer_t* source, const tsc_str_t* from_enc, const tsc_str_t* to_enc) {
    if (!source) {
        tsc_throw_str(tsc_str_from_cstr("buffer.transcode: source must not be null"));
    }

    tsc_buffer_t* raw_buf = NULL;
    if (buffer_encoding_is_utf8(from_enc)) {
        raw_buf = tsc_buffer_from_buffer(source);
    } else if (str_lit_eq(from_enc, "hex")) {
        tsc_str_t* str = tsc_buffer_to_string(source, tsc_str_from_lit("utf8", 4));
        raw_buf = tsc_buffer_from_str(str, tsc_str_from_lit("hex", 3));
    } else if (buffer_encoding_is_base64(from_enc)) {
        tsc_str_t* str = tsc_buffer_to_string(source, tsc_str_from_lit("utf8", 4));
        raw_buf = tsc_buffer_from_str(str, tsc_str_from_lit("base64", 6));
    } else {
        tsc_throw_str(tsc_str_from_cstr("buffer.transcode: unsupported fromEnc"));
    }

    tsc_buffer_t* result = NULL;
    if (buffer_encoding_is_utf8(to_enc)) {
        result = raw_buf;
    } else if (str_lit_eq(to_enc, "hex")) {
        tsc_str_t* str = tsc_buffer_to_string(raw_buf, tsc_str_from_lit("hex", 3));
        result = tsc_buffer_from_str(str, tsc_str_from_lit("utf8", 4));
    } else if (buffer_encoding_is_base64(to_enc)) {
        tsc_str_t* str = tsc_buffer_to_string(raw_buf, tsc_str_from_lit("base64", 6));
        result = tsc_buffer_from_str(str, tsc_str_from_lit("utf8", 4));
    } else {
        tsc_throw_str(tsc_str_from_cstr("buffer.transcode: unsupported toEnc"));
    }

    return result;
}
double tsc_buffer_length(const tsc_buffer_t* b) { return (double)b->len; }

double tsc_buffer_get(const tsc_buffer_t* b, double idx) {
    if (isnan(idx) || isinf(idx) || idx < 0 || (size_t)idx >= b->len) return NAN;
    return (double)b->data[(size_t)idx];
}

double tsc_buffer_read_uint8(const tsc_buffer_t* b, double offset) {
    if (isnan(offset) || isinf(offset) || offset < 0 || (size_t)offset >= b->len) {
        tsc_throw_str(tsc_str_from_cstr("Buffer.readUInt8 offset out of range"));
    }
    return (double)b->data[(size_t)offset];
}

double tsc_buffer_write_uint8(tsc_buffer_t* b, double value, double offset) {
    if (isnan(offset) || isinf(offset) || offset < 0 || (size_t)offset >= b->len) {
        tsc_throw_str(tsc_str_from_cstr("Buffer.writeUInt8 offset out of range"));
    }
    size_t i = (size_t)offset;
    b->data[i] = byte_from_double(value);
    return (double)(i + 1);
}

double tsc_buffer_read_int8(const tsc_buffer_t* b, double offset) {
    if (isnan(offset) || isinf(offset) || offset < 0 || (size_t)offset >= b->len) {
        tsc_throw_str(tsc_str_from_cstr("Buffer.readInt8 offset out of range"));
    }
    uint8_t n = b->data[(size_t)offset];
    return n >= 0x80u ? (double)n - 256.0 : (double)n;
}

double tsc_buffer_write_int8(tsc_buffer_t* b, double value, double offset) {
    if (isnan(offset) || isinf(offset) || offset < 0 || (size_t)offset >= b->len) {
        tsc_throw_str(tsc_str_from_cstr("Buffer.writeInt8 offset out of range"));
    }
    size_t i = (size_t)offset;
    b->data[i] = byte_from_double(value);
    return (double)(i + 1);
}

size_t buffer_checked_offset(const tsc_buffer_t* b, double offset, size_t width, const char* label) {
    if (isnan(offset) || isinf(offset) || offset < 0 || (size_t)offset > b->len || width > b->len - (size_t)offset) {
        tsc_throw_str(tsc_str_from_cstr(label));
    }
    return (size_t)offset;
}

uint32_t uint_from_double(double value) {
    if (isnan(value) || isinf(value) || value <= 0) return 0;
    return (uint32_t)value;
}

uint64_t uint64_from_double(double value) {
    if (isnan(value) || isinf(value)) return 0;
    if (value >= 18446744073709551615.0) return 0xffffffffffffffffULL;
    if (value <= -9223372036854775808.0) return 0x8000000000000000ULL;
    return (uint64_t)(int64_t)value;
}

double tsc_buffer_read_uint16_le(const tsc_buffer_t* b, double offset) {
    size_t i = buffer_checked_offset(b, offset, 2, "Buffer.readUInt16LE offset out of range");
    return (double)((uint16_t)b->data[i] | ((uint16_t)b->data[i + 1] << 8));
}

double tsc_buffer_read_uint16_be(const tsc_buffer_t* b, double offset) {
    size_t i = buffer_checked_offset(b, offset, 2, "Buffer.readUInt16BE offset out of range");
    return (double)(((uint16_t)b->data[i] << 8) | (uint16_t)b->data[i + 1]);
}

double tsc_buffer_write_uint16_le(tsc_buffer_t* b, double value, double offset) {
    size_t i = buffer_checked_offset(b, offset, 2, "Buffer.writeUInt16LE offset out of range");
    uint32_t n = uint_from_double(value);
    b->data[i] = (uint8_t)(n & 0xffu);
    b->data[i + 1] = (uint8_t)((n >> 8) & 0xffu);
    return (double)(i + 2);
}

double tsc_buffer_write_uint16_be(tsc_buffer_t* b, double value, double offset) {
    size_t i = buffer_checked_offset(b, offset, 2, "Buffer.writeUInt16BE offset out of range");
    uint32_t n = uint_from_double(value);
    b->data[i] = (uint8_t)((n >> 8) & 0xffu);
    b->data[i + 1] = (uint8_t)(n & 0xffu);
    return (double)(i + 2);
}

double tsc_buffer_read_int16_le(const tsc_buffer_t* b, double offset) {
    size_t i = buffer_checked_offset(b, offset, 2, "Buffer.readInt16LE offset out of range");
    uint16_t n = (uint16_t)b->data[i] | ((uint16_t)b->data[i + 1] << 8);
    return n >= 0x8000u ? (double)n - 65536.0 : (double)n;
}

double tsc_buffer_read_int16_be(const tsc_buffer_t* b, double offset) {
    size_t i = buffer_checked_offset(b, offset, 2, "Buffer.readInt16BE offset out of range");
    uint16_t n = ((uint16_t)b->data[i] << 8) | (uint16_t)b->data[i + 1];
    return n >= 0x8000u ? (double)n - 65536.0 : (double)n;
}

double tsc_buffer_write_int16_le(tsc_buffer_t* b, double value, double offset) {
    size_t i = buffer_checked_offset(b, offset, 2, "Buffer.writeInt16LE offset out of range");
    uint16_t n = (uint16_t)(int32_t)((isnan(value) || isinf(value)) ? 0 : value);
    b->data[i] = (uint8_t)(n & 0xffu);
    b->data[i + 1] = (uint8_t)((n >> 8) & 0xffu);
    return (double)(i + 2);
}

double tsc_buffer_write_int16_be(tsc_buffer_t* b, double value, double offset) {
    size_t i = buffer_checked_offset(b, offset, 2, "Buffer.writeInt16BE offset out of range");
    uint16_t n = (uint16_t)(int32_t)((isnan(value) || isinf(value)) ? 0 : value);
    b->data[i] = (uint8_t)((n >> 8) & 0xffu);
    b->data[i + 1] = (uint8_t)(n & 0xffu);
    return (double)(i + 2);
}

double tsc_buffer_read_uint32_le(const tsc_buffer_t* b, double offset) {
    size_t i = buffer_checked_offset(b, offset, 4, "Buffer.readUInt32LE offset out of range");
    uint32_t n = (uint32_t)b->data[i] |
        ((uint32_t)b->data[i + 1] << 8) |
        ((uint32_t)b->data[i + 2] << 16) |
        ((uint32_t)b->data[i + 3] << 24);
    return (double)n;
}

double tsc_buffer_read_uint32_be(const tsc_buffer_t* b, double offset) {
    size_t i = buffer_checked_offset(b, offset, 4, "Buffer.readUInt32BE offset out of range");
    uint32_t n = ((uint32_t)b->data[i] << 24) |
        ((uint32_t)b->data[i + 1] << 16) |
        ((uint32_t)b->data[i + 2] << 8) |
        (uint32_t)b->data[i + 3];
    return (double)n;
}

double tsc_buffer_write_uint32_le(tsc_buffer_t* b, double value, double offset) {
    size_t i = buffer_checked_offset(b, offset, 4, "Buffer.writeUInt32LE offset out of range");
    uint32_t n = uint_from_double(value);
    b->data[i] = (uint8_t)(n & 0xffu);
    b->data[i + 1] = (uint8_t)((n >> 8) & 0xffu);
    b->data[i + 2] = (uint8_t)((n >> 16) & 0xffu);
    b->data[i + 3] = (uint8_t)((n >> 24) & 0xffu);
    return (double)(i + 4);
}

double tsc_buffer_write_uint32_be(tsc_buffer_t* b, double value, double offset) {
    size_t i = buffer_checked_offset(b, offset, 4, "Buffer.writeUInt32BE offset out of range");
    uint32_t n = uint_from_double(value);
    b->data[i] = (uint8_t)((n >> 24) & 0xffu);
    b->data[i + 1] = (uint8_t)((n >> 16) & 0xffu);
    b->data[i + 2] = (uint8_t)((n >> 8) & 0xffu);
    b->data[i + 3] = (uint8_t)(n & 0xffu);
    return (double)(i + 4);
}

double tsc_buffer_read_int32_le(const tsc_buffer_t* b, double offset) {
    size_t i = buffer_checked_offset(b, offset, 4, "Buffer.readInt32LE offset out of range");
    uint32_t n = (uint32_t)b->data[i] |
        ((uint32_t)b->data[i + 1] << 8) |
        ((uint32_t)b->data[i + 2] << 16) |
        ((uint32_t)b->data[i + 3] << 24);
    return n >= 0x80000000u ? (double)(uint64_t)n - 4294967296.0 : (double)n;
}

double tsc_buffer_read_int32_be(const tsc_buffer_t* b, double offset) {
    size_t i = buffer_checked_offset(b, offset, 4, "Buffer.readInt32BE offset out of range");
    uint32_t n = ((uint32_t)b->data[i] << 24) |
        ((uint32_t)b->data[i + 1] << 16) |
        ((uint32_t)b->data[i + 2] << 8) |
        (uint32_t)b->data[i + 3];
    return n >= 0x80000000u ? (double)(uint64_t)n - 4294967296.0 : (double)n;
}

double tsc_buffer_write_int32_le(tsc_buffer_t* b, double value, double offset) {
    size_t i = buffer_checked_offset(b, offset, 4, "Buffer.writeInt32LE offset out of range");
    uint32_t n = (uint32_t)(int32_t)((isnan(value) || isinf(value)) ? 0 : value);
    b->data[i] = (uint8_t)(n & 0xffu);
    b->data[i + 1] = (uint8_t)((n >> 8) & 0xffu);
    b->data[i + 2] = (uint8_t)((n >> 16) & 0xffu);
    b->data[i + 3] = (uint8_t)((n >> 24) & 0xffu);
    return (double)(i + 4);
}

double tsc_buffer_write_int32_be(tsc_buffer_t* b, double value, double offset) {
    size_t i = buffer_checked_offset(b, offset, 4, "Buffer.writeInt32BE offset out of range");
    uint32_t n = (uint32_t)(int32_t)((isnan(value) || isinf(value)) ? 0 : value);
    b->data[i] = (uint8_t)((n >> 24) & 0xffu);
    b->data[i + 1] = (uint8_t)((n >> 16) & 0xffu);
    b->data[i + 2] = (uint8_t)((n >> 8) & 0xffu);
    b->data[i + 3] = (uint8_t)(n & 0xffu);
    return (double)(i + 4);
}

double double_from_float_bits(uint32_t bits) {
    float value;
    memcpy(&value, &bits, sizeof value);
    return (double)value;
}

uint32_t float_bits_from_double(double value) {
    float narrowed = (float)value;
    uint32_t bits;
    memcpy(&bits, &narrowed, sizeof bits);
    return bits;
}

double double_from_bits(uint64_t bits) {
    double value;
    memcpy(&value, &bits, sizeof value);
    return value;
}

uint64_t double_bits_from_double(double value) {
    uint64_t bits;
    memcpy(&bits, &value, sizeof bits);
    return bits;
}

double tsc_buffer_read_float_le(const tsc_buffer_t* b, double offset) {
    size_t i = buffer_checked_offset(b, offset, 4, "Buffer.readFloatLE offset out of range");
    uint32_t bits = (uint32_t)b->data[i] |
        ((uint32_t)b->data[i + 1] << 8) |
        ((uint32_t)b->data[i + 2] << 16) |
        ((uint32_t)b->data[i + 3] << 24);
    return double_from_float_bits(bits);
}

double tsc_buffer_read_float_be(const tsc_buffer_t* b, double offset) {
    size_t i = buffer_checked_offset(b, offset, 4, "Buffer.readFloatBE offset out of range");
    uint32_t bits = ((uint32_t)b->data[i] << 24) |
        ((uint32_t)b->data[i + 1] << 16) |
        ((uint32_t)b->data[i + 2] << 8) |
        (uint32_t)b->data[i + 3];
    return double_from_float_bits(bits);
}

double tsc_buffer_write_float_le(tsc_buffer_t* b, double value, double offset) {
    size_t i = buffer_checked_offset(b, offset, 4, "Buffer.writeFloatLE offset out of range");
    uint32_t bits = float_bits_from_double(value);
    b->data[i] = (uint8_t)(bits & 0xffu);
    b->data[i + 1] = (uint8_t)((bits >> 8) & 0xffu);
    b->data[i + 2] = (uint8_t)((bits >> 16) & 0xffu);
    b->data[i + 3] = (uint8_t)((bits >> 24) & 0xffu);
    return (double)(i + 4);
}

double tsc_buffer_write_float_be(tsc_buffer_t* b, double value, double offset) {
    size_t i = buffer_checked_offset(b, offset, 4, "Buffer.writeFloatBE offset out of range");
    uint32_t bits = float_bits_from_double(value);
    b->data[i] = (uint8_t)((bits >> 24) & 0xffu);
    b->data[i + 1] = (uint8_t)((bits >> 16) & 0xffu);
    b->data[i + 2] = (uint8_t)((bits >> 8) & 0xffu);
    b->data[i + 3] = (uint8_t)(bits & 0xffu);
    return (double)(i + 4);
}

double tsc_buffer_read_double_le(const tsc_buffer_t* b, double offset) {
    size_t i = buffer_checked_offset(b, offset, 8, "Buffer.readDoubleLE offset out of range");
    uint64_t bits = (uint64_t)b->data[i] |
        ((uint64_t)b->data[i + 1] << 8) |
        ((uint64_t)b->data[i + 2] << 16) |
        ((uint64_t)b->data[i + 3] << 24) |
        ((uint64_t)b->data[i + 4] << 32) |
        ((uint64_t)b->data[i + 5] << 40) |
        ((uint64_t)b->data[i + 6] << 48) |
        ((uint64_t)b->data[i + 7] << 56);
    return double_from_bits(bits);
}

double tsc_buffer_read_double_be(const tsc_buffer_t* b, double offset) {
    size_t i = buffer_checked_offset(b, offset, 8, "Buffer.readDoubleBE offset out of range");
    uint64_t bits = ((uint64_t)b->data[i] << 56) |
        ((uint64_t)b->data[i + 1] << 48) |
        ((uint64_t)b->data[i + 2] << 40) |
        ((uint64_t)b->data[i + 3] << 32) |
        ((uint64_t)b->data[i + 4] << 24) |
        ((uint64_t)b->data[i + 5] << 16) |
        ((uint64_t)b->data[i + 6] << 8) |
        (uint64_t)b->data[i + 7];
    return double_from_bits(bits);
}

double tsc_buffer_write_double_le(tsc_buffer_t* b, double value, double offset) {
    size_t i = buffer_checked_offset(b, offset, 8, "Buffer.writeDoubleLE offset out of range");
    uint64_t bits = double_bits_from_double(value);
    for (size_t j = 0; j < 8; j++) {
        b->data[i + j] = (uint8_t)((bits >> (8 * j)) & 0xffu);
    }
    return (double)(i + 8);
}

double tsc_buffer_write_double_be(tsc_buffer_t* b, double value, double offset) {
    size_t i = buffer_checked_offset(b, offset, 8, "Buffer.writeDoubleBE offset out of range");
    uint64_t bits = double_bits_from_double(value);
    for (size_t j = 0; j < 8; j++) {
        b->data[i + j] = (uint8_t)((bits >> (8 * (7 - j))) & 0xffu);
    }
    return (double)(i + 8);
}

double tsc_buffer_read_uint_le(const tsc_buffer_t* b, double offset, double byte_len) {
    if (isnan(byte_len) || isinf(byte_len) || byte_len < 1.0 || byte_len > 6.0 || floor(byte_len) != byte_len) {
        tsc_throw_str(tsc_str_from_cstr("Buffer.readUIntLE byteLength must be between 1 and 6"));
    }
    size_t len = (size_t)byte_len;
    size_t i = buffer_checked_offset(b, offset, len, "Buffer.readUIntLE offset out of range");
    uint64_t val = 0;
    for (size_t j = 0; j < len; j++) {
        val |= ((uint64_t)b->data[i + j]) << (j * 8);
    }
    return (double)val;
}

double tsc_buffer_read_uint_be(const tsc_buffer_t* b, double offset, double byte_len) {
    if (isnan(byte_len) || isinf(byte_len) || byte_len < 1.0 || byte_len > 6.0 || floor(byte_len) != byte_len) {
        tsc_throw_str(tsc_str_from_cstr("Buffer.readUIntBE byteLength must be between 1 and 6"));
    }
    size_t len = (size_t)byte_len;
    size_t i = buffer_checked_offset(b, offset, len, "Buffer.readUIntBE offset out of range");
    uint64_t val = 0;
    for (size_t j = 0; j < len; j++) {
        val = (val << 8) | (uint64_t)b->data[i + j];
    }
    return (double)val;
}

double tsc_buffer_read_int_le(const tsc_buffer_t* b, double offset, double byte_len) {
    if (isnan(byte_len) || isinf(byte_len) || byte_len < 1.0 || byte_len > 6.0 || floor(byte_len) != byte_len) {
        tsc_throw_str(tsc_str_from_cstr("Buffer.readIntLE byteLength must be between 1 and 6"));
    }
    size_t len = (size_t)byte_len;
    size_t i = buffer_checked_offset(b, offset, len, "Buffer.readIntLE offset out of range");
    uint64_t val = 0;
    for (size_t j = 0; j < len; j++) {
        val |= ((uint64_t)b->data[i + j]) << (j * 8);
    }
    size_t shift = 64 - (len * 8);
    int64_t sval = (int64_t)(val << shift) >> shift;
    return (double)sval;
}

double tsc_buffer_read_int_be(const tsc_buffer_t* b, double offset, double byte_len) {
    if (isnan(byte_len) || isinf(byte_len) || byte_len < 1.0 || byte_len > 6.0 || floor(byte_len) != byte_len) {
        tsc_throw_str(tsc_str_from_cstr("Buffer.readIntBE byteLength must be between 1 and 6"));
    }
    size_t len = (size_t)byte_len;
    size_t i = buffer_checked_offset(b, offset, len, "Buffer.readIntBE offset out of range");
    uint64_t val = 0;
    for (size_t j = 0; j < len; j++) {
        val = (val << 8) | (uint64_t)b->data[i + j];
    }
    size_t shift = 64 - (len * 8);
    int64_t sval = (int64_t)(val << shift) >> shift;
    return (double)sval;
}

double tsc_buffer_write_uint_le(tsc_buffer_t* b, double value, double offset, double byte_len) {
    if (isnan(byte_len) || isinf(byte_len) || byte_len < 1.0 || byte_len > 6.0 || floor(byte_len) != byte_len) {
        tsc_throw_str(tsc_str_from_cstr("Buffer.writeUIntLE byteLength must be between 1 and 6"));
    }
    size_t len = (size_t)byte_len;
    size_t i = buffer_checked_offset(b, offset, len, "Buffer.writeUIntLE offset out of range");
    uint64_t n = uint64_from_double(value);
    for (size_t j = 0; j < len; j++) {
        b->data[i + j] = (uint8_t)((n >> (j * 8)) & 0xffu);
    }
    return (double)(i + len);
}

double tsc_buffer_write_uint_be(tsc_buffer_t* b, double value, double offset, double byte_len) {
    if (isnan(byte_len) || isinf(byte_len) || byte_len < 1.0 || byte_len > 6.0 || floor(byte_len) != byte_len) {
        tsc_throw_str(tsc_str_from_cstr("Buffer.writeUIntBE byteLength must be between 1 and 6"));
    }
    size_t len = (size_t)byte_len;
    size_t i = buffer_checked_offset(b, offset, len, "Buffer.writeUIntBE offset out of range");
    uint64_t n = uint64_from_double(value);
    for (size_t j = 0; j < len; j++) {
        b->data[i + len - 1 - j] = (uint8_t)((n >> (j * 8)) & 0xffu);
    }
    return (double)(i + len);
}

double tsc_buffer_write_int_le(tsc_buffer_t* b, double value, double offset, double byte_len) {
    if (isnan(byte_len) || isinf(byte_len) || byte_len < 1.0 || byte_len > 6.0 || floor(byte_len) != byte_len) {
        tsc_throw_str(tsc_str_from_cstr("Buffer.writeIntLE byteLength must be between 1 and 6"));
    }
    size_t len = (size_t)byte_len;
    size_t i = buffer_checked_offset(b, offset, len, "Buffer.writeIntLE offset out of range");
    uint64_t n = uint64_from_double(value);
    for (size_t j = 0; j < len; j++) {
        b->data[i + j] = (uint8_t)((n >> (j * 8)) & 0xffu);
    }
    return (double)(i + len);
}

double tsc_buffer_write_int_be(tsc_buffer_t* b, double value, double offset, double byte_len) {
    if (isnan(byte_len) || isinf(byte_len) || byte_len < 1.0 || byte_len > 6.0 || floor(byte_len) != byte_len) {
        tsc_throw_str(tsc_str_from_cstr("Buffer.writeIntBE byteLength must be between 1 and 6"));
    }
    size_t len = (size_t)byte_len;
    size_t i = buffer_checked_offset(b, offset, len, "Buffer.writeIntBE offset out of range");
    uint64_t n = uint64_from_double(value);
    for (size_t j = 0; j < len; j++) {
        b->data[i + len - 1 - j] = (uint8_t)((n >> (j * 8)) & 0xffu);
    }
    return (double)(i + len);
}

tsc_buffer_t* tsc_buffer_swap(tsc_buffer_t* b, size_t width) {
    if (width == 0 || (b->len % width) != 0) {
        tsc_throw_str(tsc_str_from_cstr("Buffer.swap length must be a multiple of the element size"));
    }
    for (size_t i = 0; i < b->len; i += width) {
        for (size_t j = 0; j < width / 2; j++) {
            uint8_t tmp = b->data[i + j];
            b->data[i + j] = b->data[i + width - 1 - j];
            b->data[i + width - 1 - j] = tmp;
        }
    }
    return b;
}

/* ------------- TextEncoder / TextDecoder ------------- */
tsc_text_encoder_t* tsc_text_encoder_new(void) {
    tsc_text_encoder_t* encoder = (tsc_text_encoder_t*)TSC_GC_MALLOC(sizeof(tsc_text_encoder_t));
    encoder->dummy = 0;
    return encoder;
}

tsc_buffer_t* tsc_text_encoder_encode(const tsc_text_encoder_t* encoder, const tsc_str_t* input) {
    (void)encoder;
    if (!input) {
        return tsc_buffer_alloc(0, 0);
    }
    return tsc_buffer_from_str(input, tsc_str_from_lit("utf8", 4));
}

tsc_text_decoder_t* tsc_text_decoder_new(const tsc_str_t* encoding) {
    if (encoding && !buffer_encoding_is_utf8(encoding)) {
        tsc_throw_str(tsc_str_from_cstr("TextDecoder: only utf-8 encoding is supported"));
    }
    tsc_text_decoder_t* decoder = (tsc_text_decoder_t*)TSC_GC_MALLOC(sizeof(tsc_text_decoder_t));
    decoder->dummy = 0;
    return decoder;
}

tsc_str_t* tsc_text_decoder_decode(const tsc_text_decoder_t* decoder, const tsc_buffer_t* input) {
    (void)decoder;
    if (!input) {
        return tsc_str_from_lit("", 0);
    }
    return tsc_buffer_to_string(input, tsc_str_from_lit("utf8", 4));
}

tsc_value_t tsc_proxy_new(tsc_value_t target, tsc_value_t handler) {
    if (
        !value_is_box(target) ||
        (
            value_tag(target) != TSC_VALUE_TAG_OBJECT &&
            value_tag(target) != TSC_VALUE_TAG_ARRAY &&
            value_tag(target) != TSC_VALUE_TAG_FUNCTION
        )
    ) {
            tsc_throw_str(tsc_str_from_cstr("Cannot create proxy with a non-object as target or handler"));
    }
    if (
        !value_is_box(handler) ||
        (
            value_tag(handler) != TSC_VALUE_TAG_OBJECT &&
            value_tag(handler) != TSC_VALUE_TAG_ARRAY &&
            value_tag(handler) != TSC_VALUE_TAG_FUNCTION
        )
    ) {
        tsc_throw_str(tsc_str_from_cstr("Cannot create proxy with a non-object as target or handler"));
    }
    tsc_object_t* o = (tsc_object_t*)TSC_GC_MALLOC(sizeof(tsc_object_t));
    o->len = 0;
    o->cap = 0;
    o->extensible = true;
    o->class_ptr = NULL;
    o->is_proxy = true;
    o->proxy_revoked = false;
    o->is_promise = false;
    o->is_date = false;
    o->is_regexp = false;
    o->is_map = false;
    o->is_set = false;
    o->is_error = false;
    o->is_typed_array = false;
    o->shape_version = 1;
    o->shape = NULL;
    o->object_id = 0;
    o->proxy_target = target;
    o->proxy_handler = handler;
    o->proxy_target_root = value_ptr(target);
    o->proxy_handler_root = value_ptr(handler);
    o->prototype = tsc_value_null();
    o->props = NULL;
    return tsc_value_object(o);
}

tsc_value_t tsc_proxy_revoke(void* env, tsc_value_t receiver, tsc_array_t* args) {
    (void)receiver;
    (void)args;
    tsc_value_t proxy_val = *(tsc_value_t*)env;
    if (value_is_box(proxy_val) && value_tag(proxy_val) == TSC_VALUE_TAG_OBJECT) {
        tsc_object_t* o = (tsc_object_t*)value_ptr(proxy_val);
        if (o->is_proxy) {
            o->proxy_revoked = true;
            o->proxy_handler = tsc_value_null();
            o->proxy_handler_root = NULL;
        }
    }
    return tsc_value_undefined();
}

tsc_value_t tsc_proxy_revocable(tsc_value_t target, tsc_value_t handler) {
    tsc_value_t proxy = tsc_proxy_new(target, handler);
    tsc_object_t* ret = tsc_object_new();
    tsc_object_set(ret, tsc_str_from_lit("proxy", 5), proxy);

    tsc_value_t* env = (tsc_value_t*)TSC_GC_MALLOC(sizeof(tsc_value_t));
    *env = proxy;
    tsc_value_t revoke_fn = tsc_value_function_closure_named(
        tsc_proxy_revoke,
        env,
        0.0,
        tsc_str_from_lit("", 0)
    );
    tsc_object_set(ret, tsc_str_from_lit("revoke", 6), revoke_fn);

    return tsc_value_object(ret);
}
