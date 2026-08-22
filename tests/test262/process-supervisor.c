#define _GNU_SOURCE
#include <errno.h>
#include <fcntl.h>
#include <poll.h>
#include <signal.h>
#include <stdbool.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/prctl.h>
#include <sys/types.h>
#include <sys/wait.h>
#include <time.h>
#include <unistd.h>

static volatile sig_atomic_t termination_requested = 0;

static void request_termination(int signal_number) {
    (void)signal_number;
    termination_requested = 1;
}

static long long monotonic_milliseconds(void) {
    struct timespec now;
    if (clock_gettime(CLOCK_MONOTONIC, &now) != 0) return -1;
    return (long long)now.tv_sec * 1000LL + now.tv_nsec / 1000000LL;
}

static int direct_children(pid_t **children, size_t *count) {
    char filename[128];
    if (snprintf(filename, sizeof(filename), "/proc/self/task/%ld/children", (long)getpid()) < 0) return -1;
    FILE *stream = fopen(filename, "r");
    if (stream == NULL) return -1;
    size_t capacity = 128;
    size_t length = 0;
    pid_t *result = malloc(capacity * sizeof(*result));
    if (result == NULL) {
        fclose(stream);
        return -1;
    }
    long value;
    while (fscanf(stream, "%ld", &value) == 1) {
        if (value <= 0) {
            free(result);
            fclose(stream);
            errno = EPROTO;
            return -1;
        }
        if (length == capacity) {
            if (capacity > 1048576 / 2) {
                free(result);
                fclose(stream);
                errno = EOVERFLOW;
                return -1;
            }
            capacity *= 2;
            pid_t *grown = realloc(result, capacity * sizeof(*grown));
            if (grown == NULL) {
                free(result);
                fclose(stream);
                return -1;
            }
            result = grown;
        }
        result[length++] = (pid_t)value;
    }
    if (ferror(stream)) {
        free(result);
        fclose(stream);
        return -1;
    }
    fclose(stream);
    *children = result;
    *count = length;
    return 0;
}

/* Returns 1 when a surviving descendant was killed, 0 when none existed, -1 on containment failure. */
static int terminate_descendants(void) {
    bool observed = false;
    for (int round = 0; round < 1000; round++) {
        pid_t *children = NULL;
        size_t count = 0;
        if (direct_children(&children, &count) != 0) return -1;
        if (count == 0) {
            free(children);
            while (waitpid(-1, NULL, WNOHANG) > 0) {}
            if (direct_children(&children, &count) != 0) return -1;
            if (count == 0) {
                free(children);
                return observed ? 1 : 0;
            }
        }
        observed = true;
        for (size_t index = 0; index < count; index++) {
            if (kill(children[index], SIGKILL) != 0 && errno != ESRCH) {
                free(children);
                return -1;
            }
        }
        free(children);
        while (waitpid(-1, NULL, WNOHANG) > 0) {}
        struct timespec pause = { .tv_sec = 0, .tv_nsec = 1000000L };
        nanosleep(&pause, NULL);
    }
    errno = EBUSY;
    return -1;
}

static int usage(void) {
    fputs("usage: process-supervisor --timeout-ms N [--native-guard FILE] -- COMMAND [ARG ...]\n", stderr);
    return 2;
}

static int verify_guard_marker(int descriptor, long long timeout_ms) {
    static const char expected[] = "TSC2C_SECCOMP_V1\n";
    char observed[sizeof(expected) - 1];
    size_t offset = 0;
    const long long started = monotonic_milliseconds();
    while (offset < sizeof(observed)) {
        const long long now = monotonic_milliseconds();
        if (started < 0 || now < 0 || now - started >= timeout_ms) {
            errno = ETIMEDOUT;
            return -1;
        }
        long long remaining = timeout_ms - (now - started);
        int poll_timeout = remaining > 1000 ? 1000 : (int)remaining;
        struct pollfd wait_for_marker = { .fd = descriptor, .events = POLLIN | POLLHUP };
        int ready = poll(&wait_for_marker, 1, poll_timeout);
        if (ready < 0 && errno == EINTR) continue;
        if (ready <= 0) continue;
        ssize_t count = read(descriptor, observed + offset, sizeof(observed) - offset);
        if (count < 0 && errno == EINTR) continue;
        if (count <= 0) {
            errno = EPROTO;
            return -1;
        }
        offset += (size_t)count;
    }
    if (memcmp(observed, expected, sizeof(observed)) != 0) {
        errno = EPROTO;
        return -1;
    }
    return 0;
}

static int verify_guard_kernel_state(pid_t child) {
    char filename[128];
    if (snprintf(filename, sizeof(filename), "/proc/%ld/status", (long)child) < 0) return -1;
    FILE *stream = fopen(filename, "r");
    if (stream == NULL) return -1;
    bool no_new_privs = false;
    bool seccomp_filter = false;
    char line[256];
    while (fgets(line, sizeof(line), stream) != NULL) {
        if (strcmp(line, "NoNewPrivs:\t1\n") == 0) no_new_privs = true;
        if (strcmp(line, "Seccomp:\t2\n") == 0) seccomp_filter = true;
    }
    if (ferror(stream)) {
        fclose(stream);
        return -1;
    }
    fclose(stream);
    if (!no_new_privs || !seccomp_filter) {
        errno = EACCES;
        return -1;
    }
    return 0;
}

static int send_guard_ack(int descriptor) {
    static const char ack[] = "TSC2C_ACK_V1\n";
    size_t offset = 0;
    while (offset < sizeof(ack) - 1) {
        ssize_t written = write(descriptor, ack + offset, sizeof(ack) - 1 - offset);
        if (written < 0 && errno == EINTR) continue;
        if (written <= 0) return -1;
        offset += (size_t)written;
    }
    return 0;
}

int main(int argc, char **argv) {
    if (argc < 5 || strcmp(argv[1], "--timeout-ms") != 0) return usage();
    char *end = NULL;
    errno = 0;
    long long timeout_ms = strtoll(argv[2], &end, 10);
    if (errno != 0 || end == argv[2] || *end != '\0' || timeout_ms < 1) return usage();
    const char *native_guard = NULL;
    int command_index = 4;
    if (strcmp(argv[3], "--native-guard") == 0) {
        if (argc < 7 || argv[4][0] != '/' || strcmp(argv[5], "--") != 0) return usage();
        native_guard = argv[4];
        command_index = 6;
    } else if (strcmp(argv[3], "--") != 0) {
        return usage();
    }
    if (prctl(PR_SET_CHILD_SUBREAPER, 1, 0, 0, 0) != 0) {
        perror("process-supervisor: PR_SET_CHILD_SUBREAPER");
        return 125;
    }
    struct sigaction action;
    memset(&action, 0, sizeof(action));
    action.sa_handler = request_termination;
    sigemptyset(&action.sa_mask);
    if (sigaction(SIGTERM, &action, NULL) != 0 || sigaction(SIGINT, &action, NULL) != 0) {
        perror("process-supervisor: sigaction");
        return 125;
    }
    int guard_pipe[2] = { -1, -1 };
    int guard_ack_pipe[2] = { -1, -1 };
    if (native_guard != NULL) {
        if (pipe2(guard_pipe, O_CLOEXEC) != 0 || pipe2(guard_ack_pipe, O_CLOEXEC) != 0) {
            perror("process-supervisor: guard pipes");
            return 125;
        }
    }
    const long long started = monotonic_milliseconds();
    if (started < 0) {
        perror("process-supervisor: monotonic clock");
        return 125;
    }
    pid_t primary = fork();
    if (primary < 0) {
        perror("process-supervisor: fork");
        return 125;
    }
    if (primary == 0) {
        pid_t expected_parent = getppid();
        if (prctl(PR_SET_PDEATHSIG, SIGKILL, 0, 0, 0) != 0 || getppid() != expected_parent) _exit(125);
        if (guard_pipe[0] >= 0) close(guard_pipe[0]);
        if (guard_ack_pipe[1] >= 0) close(guard_ack_pipe[1]);
        if (native_guard != NULL) {
            if (dup2(guard_pipe[1], 3) < 0) _exit(125);
            if (fcntl(3, F_SETFD, 0) != 0) _exit(125);
            if (guard_pipe[1] != 3) close(guard_pipe[1]);
            if (dup2(guard_ack_pipe[0], 4) < 0) _exit(125);
            if (fcntl(4, F_SETFD, 0) != 0) _exit(125);
            if (guard_ack_pipe[0] != 4) close(guard_ack_pipe[0]);
            if (
                setenv("TSC2C_GUARD_FD", "3", 1) != 0 ||
                setenv("TSC2C_GUARD_ACK_FD", "4", 1) != 0 ||
                setenv("LD_PRELOAD", native_guard, 1) != 0
            ) _exit(125);
        }
        if (prctl(PR_SET_NO_NEW_PRIVS, 1, 0, 0, 0) != 0) _exit(125);
        execvp(argv[command_index], &argv[command_index]);
        perror("process-supervisor: execvp");
        _exit(127);
    }
    if (guard_pipe[1] >= 0) close(guard_pipe[1]);
    if (guard_ack_pipe[0] >= 0) close(guard_ack_pipe[0]);

    bool guard_failed = false;
    if (native_guard != NULL) {
        if (
            verify_guard_marker(guard_pipe[0], timeout_ms) != 0 ||
            verify_guard_kernel_state(primary) != 0 ||
            send_guard_ack(guard_ack_pipe[1]) != 0
        ) {
            perror("process-supervisor: native guard did not activate");
            guard_failed = true;
            termination_requested = 1;
        }
        close(guard_pipe[0]);
        close(guard_ack_pipe[1]);
    }

    int primary_status = 0;
    bool timed_out = false;
    while (true) {
        pid_t waited = waitpid(primary, &primary_status, WNOHANG);
        if (waited == primary) break;
        if (waited < 0 && errno != EINTR) {
            perror("process-supervisor: waitpid");
            termination_requested = 1;
            break;
        }
        const long long now = monotonic_milliseconds();
        if (termination_requested || started < 0 || now < 0 || now - started >= timeout_ms) {
            timed_out = !termination_requested;
            break;
        }
        struct timespec pause = { .tv_sec = 0, .tv_nsec = 10000000L };
        nanosleep(&pause, NULL);
    }

    int descendants = terminate_descendants();
    if (descendants < 0) {
        perror("process-supervisor: could not empty descendant worklist");
        return 125;
    }
    while (waitpid(-1, NULL, WNOHANG) > 0) {}
    if (timed_out) {
        fputs("process-supervisor: command exceeded its timeout\n", stderr);
        return 124;
    }
    if (termination_requested) {
        fputs(guard_failed
            ? "process-supervisor: native execution guard failed closed\n"
            : "process-supervisor: command was terminated by the runner\n", stderr);
        return 125;
    }
    if (descendants > 0) {
        fputs("process-supervisor: command left a surviving descendant\n", stderr);
        return 126;
    }
    if (WIFEXITED(primary_status)) return WEXITSTATUS(primary_status);
    if (WIFSIGNALED(primary_status)) return 128 + WTERMSIG(primary_status);
    return 125;
}
