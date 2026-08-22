#define _GNU_SOURCE
#include <errno.h>
#include <linux/audit.h>
#include <linux/filter.h>
#include <linux/seccomp.h>
#include <sched.h>
#include <stdbool.h>
#include <stddef.h>
#include <sys/mman.h>
#include <sys/prctl.h>
#include <sys/syscall.h>

extern char **environ;

static long raw_syscall1(long number, long first) {
    long result;
    __asm__ volatile("syscall" : "=a"(result) : "a"(number), "D"(first) : "rcx", "r11", "memory");
    return result;
}

static long raw_syscall3(long number, long first, long second, long third) {
    long result;
    __asm__ volatile(
        "syscall"
        : "=a"(result)
        : "a"(number), "D"(first), "S"(second), "d"(third)
        : "rcx", "r11", "memory"
    );
    return result;
}

static long raw_syscall5(long number, long first, long second, long third, long fourth, long fifth) {
    register long r10 __asm__("r10") = fourth;
    register long r8 __asm__("r8") = fifth;
    long result;
    __asm__ volatile(
        "syscall"
        : "=a"(result)
        : "a"(number), "D"(first), "S"(second), "d"(third), "r"(r10), "r"(r8)
        : "rcx", "r11", "memory"
    );
    return result;
}

__attribute__((noreturn)) static void fail_closed(void) {
    raw_syscall1(__NR_exit_group, 126);
    for (;;) {}
}

static bool starts_with(const char *value, const char *prefix) {
    while (*prefix != '\0') {
        if (*value++ != *prefix++) return false;
    }
    return true;
}

static void scrub_guard_environment(void) {
    char **write_position = environ;
    for (char **read_position = environ; *read_position != NULL; read_position++) {
        if (
            starts_with(*read_position, "LD_PRELOAD=") ||
            starts_with(*read_position, "TSC2C_GUARD_FD=") ||
            starts_with(*read_position, "TSC2C_GUARD_ACK_FD=")
        ) continue;
        *write_position++ = *read_position;
    }
    *write_position = NULL;
}

#define DENY_SYSCALL(number, error_number) \
    BPF_JUMP(BPF_JMP | BPF_JEQ | BPF_K, (number), 0, 1), \
    BPF_STMT(BPF_RET | BPF_K, SECCOMP_RET_ERRNO | ((error_number) & SECCOMP_RET_DATA))

static int install_guard(void) {
    struct sock_filter filter[] = {
        BPF_STMT(BPF_LD | BPF_W | BPF_ABS, offsetof(struct seccomp_data, arch)),
        BPF_JUMP(BPF_JMP | BPF_JEQ | BPF_K, AUDIT_ARCH_X86_64, 1, 0),
        BPF_STMT(BPF_RET | BPF_K, SECCOMP_RET_KILL_PROCESS),
        BPF_STMT(BPF_LD | BPF_W | BPF_ABS, offsetof(struct seccomp_data, nr)),
#ifdef __NR_execve
        DENY_SYSCALL(__NR_execve, EPERM),
#endif
#ifdef __NR_execveat
        DENY_SYSCALL(__NR_execveat, EPERM),
#endif
#ifdef __NR_fork
        DENY_SYSCALL(__NR_fork, EPERM),
#endif
#ifdef __NR_vfork
        DENY_SYSCALL(__NR_vfork, EPERM),
#endif
#ifdef __NR_clone3
        DENY_SYSCALL(__NR_clone3, ENOSYS),
#endif
#ifdef __NR_memfd_create
        DENY_SYSCALL(__NR_memfd_create, EPERM),
#endif
#ifdef __NR_ptrace
        DENY_SYSCALL(__NR_ptrace, EPERM),
#endif
#ifdef __NR_process_vm_writev
        DENY_SYSCALL(__NR_process_vm_writev, EPERM),
#endif
#ifdef __NR_bpf
        DENY_SYSCALL(__NR_bpf, EPERM),
#endif
#ifdef __NR_unshare
        DENY_SYSCALL(__NR_unshare, EPERM),
#endif
#ifdef __NR_setns
        DENY_SYSCALL(__NR_setns, EPERM),
#endif
#ifdef __NR_mount
        DENY_SYSCALL(__NR_mount, EPERM),
#endif
#ifdef __NR_umount2
        DENY_SYSCALL(__NR_umount2, EPERM),
#endif
#ifdef __NR_kexec_load
        DENY_SYSCALL(__NR_kexec_load, EPERM),
#endif
#ifdef __NR_userfaultfd
        DENY_SYSCALL(__NR_userfaultfd, EPERM),
#endif
#ifdef __NR_prctl
        DENY_SYSCALL(__NR_prctl, EPERM),
#endif
#ifdef __NR_setsid
        DENY_SYSCALL(__NR_setsid, EPERM),
#endif
#ifdef __NR_setpgid
        DENY_SYSCALL(__NR_setpgid, EPERM),
#endif
#ifdef __NR_kill
        DENY_SYSCALL(__NR_kill, EPERM),
#endif
#ifdef __NR_tkill
        DENY_SYSCALL(__NR_tkill, EPERM),
#endif
#ifdef __NR_tgkill
        DENY_SYSCALL(__NR_tgkill, EPERM),
#endif
#ifdef __NR_pidfd_send_signal
        DENY_SYSCALL(__NR_pidfd_send_signal, EPERM),
#endif
#ifdef __NR_clone
        BPF_JUMP(BPF_JMP | BPF_JEQ | BPF_K, __NR_clone, 0, 3),
        BPF_STMT(BPF_LD | BPF_W | BPF_ABS, offsetof(struct seccomp_data, args[0])),
        BPF_JUMP(BPF_JMP | BPF_JSET | BPF_K, CLONE_THREAD, 1, 0),
        BPF_STMT(BPF_RET | BPF_K, SECCOMP_RET_ERRNO | EPERM),
        BPF_STMT(BPF_LD | BPF_W | BPF_ABS, offsetof(struct seccomp_data, nr)),
#endif
#ifdef __NR_mmap
        BPF_JUMP(BPF_JMP | BPF_JEQ | BPF_K, __NR_mmap, 0, 3),
        BPF_STMT(BPF_LD | BPF_W | BPF_ABS, offsetof(struct seccomp_data, args[2])),
        BPF_JUMP(BPF_JMP | BPF_JSET | BPF_K, PROT_EXEC, 0, 1),
        BPF_STMT(BPF_RET | BPF_K, SECCOMP_RET_ERRNO | EPERM),
        BPF_STMT(BPF_LD | BPF_W | BPF_ABS, offsetof(struct seccomp_data, nr)),
#endif
#ifdef __NR_mprotect
        BPF_JUMP(BPF_JMP | BPF_JEQ | BPF_K, __NR_mprotect, 0, 3),
        BPF_STMT(BPF_LD | BPF_W | BPF_ABS, offsetof(struct seccomp_data, args[2])),
        BPF_JUMP(BPF_JMP | BPF_JSET | BPF_K, PROT_EXEC, 0, 1),
        BPF_STMT(BPF_RET | BPF_K, SECCOMP_RET_ERRNO | EPERM),
        BPF_STMT(BPF_LD | BPF_W | BPF_ABS, offsetof(struct seccomp_data, nr)),
#endif
#ifdef __NR_pkey_mprotect
        BPF_JUMP(BPF_JMP | BPF_JEQ | BPF_K, __NR_pkey_mprotect, 0, 3),
        BPF_STMT(BPF_LD | BPF_W | BPF_ABS, offsetof(struct seccomp_data, args[2])),
        BPF_JUMP(BPF_JMP | BPF_JSET | BPF_K, PROT_EXEC, 0, 1),
        BPF_STMT(BPF_RET | BPF_K, SECCOMP_RET_ERRNO | EPERM),
        BPF_STMT(BPF_LD | BPF_W | BPF_ABS, offsetof(struct seccomp_data, nr)),
#endif
        BPF_STMT(BPF_RET | BPF_K, SECCOMP_RET_ALLOW),
    };
    struct sock_fprog program = {
        .len = (unsigned short)(sizeof(filter) / sizeof(filter[0])),
        .filter = filter,
    };
    if (raw_syscall5(__NR_prctl, PR_SET_NO_NEW_PRIVS, 1, 0, 0, 0) < 0) return -1;
    return raw_syscall5(__NR_prctl, PR_SET_SECCOMP, SECCOMP_MODE_FILTER, (long)&program, 0, 0) < 0 ? -1 : 0;
}

__attribute__((constructor(101))) static void activate_native_execution_guard(void) {
    const int descriptor = 3;
    const int ack_descriptor = 4;
    if (install_guard() != 0) fail_closed();
    static const char marker[] = "TSC2C_SECCOMP_V1\n";
    size_t offset = 0;
    while (offset < sizeof(marker) - 1) {
        long written = raw_syscall3(__NR_write, descriptor, (long)(marker + offset), (long)(sizeof(marker) - 1 - offset));
        if (written == -EINTR) continue;
        if (written <= 0) fail_closed();
        offset += (size_t)written;
    }
    if (raw_syscall1(__NR_close, descriptor) < 0) fail_closed();
    static const char expected_ack[] = "TSC2C_ACK_V1\n";
    char ack[sizeof(expected_ack) - 1];
    offset = 0;
    while (offset < sizeof(ack)) {
        long count = raw_syscall3(__NR_read, ack_descriptor, (long)(ack + offset), (long)(sizeof(ack) - offset));
        if (count == -EINTR) continue;
        if (count <= 0) fail_closed();
        offset += (size_t)count;
    }
    for (offset = 0; offset < sizeof(ack); offset++) {
        if (ack[offset] != expected_ack[offset]) fail_closed();
    }
    if (raw_syscall1(__NR_close, ack_descriptor) < 0) fail_closed();
    scrub_guard_environment();
}
