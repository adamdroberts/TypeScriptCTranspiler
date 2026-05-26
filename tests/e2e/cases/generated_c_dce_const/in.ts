import { ADDRCONFIG, ALL, V4MAPPED as dnsV4Mapped } from "dns";
import { createHash } from "crypto";
import { EventEmitter, EventEmitter as ImportedEventEmitter, defaultMaxListeners, getMaxListeners, listenerCount, once as eventsOnce, setMaxListeners } from "events";
import { constants as fsConstants } from "fs";
import * as nodeCrypto from "node:crypto";
import * as nodeDns from "node:dns";
import * as nodeEvents from "node:events";
import * as nodeFs from "node:fs";
import * as nodeNet from "node:net";
import streamDefault, { isDestroyed, isDestroyed as streamDestroyedAlias, isReadable, isReadable as streamReadableAlias } from "node:stream";
import * as nodeStream from "stream";
import { EOL as osEOL, arch as osArch, availableParallelism, devNull as osDevNull, userInfo as osUserInfo } from "os";
import { isIP as netIsIP, isIPv6 as netIsIPv6 } from "net";
import * as nodeOs from "node:os";
import { delimiter as pathDelimiter, format as pathFormat, isAbsolute as pathIsAbsolute, normalize as pathNormalize, parse as pathParse, posix as pathPosix, sep as pathSep } from "path";
import * as nodePath from "node:path";

const used_count = 4;
const unused_count = 99;
const unused_label = "dead";
const unused_flag = true;
const unused_false = false;
const unused_default_option = undefined;
const unused_hash_digest_default_encoding = unused_default_option as unknown as "hex";
const unused_utf8 = "utf8";
const unused_utf8_dash = "utf-8";
const unused_bigint_literal = 123n;
const unused_regexp_literal = /dead-regexp/g;
const unused_array = [1, 2, [3, 4]];
const unused_object = { label: "dead", count: 2, nested: { flag: false } };
const unused_math = (1 + 2) * 3;
const unused_template = `dead-${1 + 2}`;
const unused_conditional = true ? "dead" : "live";
const unused_satisfies = ("dead" satisfies string);
const unused_non_null = ("dead"!);
const unused_spread_array = [0, ...[1, 2], ..."ab"];
const unused_spread_map_array = [...new Map([["dead_spread_map_key", "dead_spread_map_value"]])];
const unused_spread_set_array = [...new Set(["dead_spread_set", "dead_spread_set_tail"])];
const unused_spread_object = { ok: true, ...{ label: "dead" } };
const unused_spread_source_array = [5, 6];
const unused_spread_source_object = { extra: "dead" };
const unused_from_entries_source: ObjectEntry<string>[] = [["dead_object_from_entries_const_key", "dead_object_from_entries_const_value"]];
const unused_string_method_source = "dead_string_method_source";
const unused_const_spread_array = [0, ...unused_spread_source_array];
const unused_const_spread_object = { ok: true, ...unused_spread_source_object };
const unused_string_length = "dead".length;
const unused_array_length = [1, 2, 3].length;
const unused_const_array_length = unused_spread_source_array.length;
const unused_string_index = "dead"[1];
const unused_array_index = [1, 2, 3][0];
const unused_const_array_index = unused_spread_source_array[0];
const unused_object_prop = { label: "dead" }.label;
const unused_const_object_prop = unused_spread_source_object.extra;
const unused_object_key_index = { label: "dead" }["label"];
const unused_in_object = "label" in { label: "dead" };
const unused_in_array = 0 in [1, 2, 3];
const unused_in_const_object = "extra" in unused_spread_source_object;
const unused_delete_object = delete ({ label: "dead" } as any).label;
const unused_delete_array = delete ([1, 2, 3] as any)[0];
const unused_delete_const_object = delete (unused_spread_source_object as any).extra;
const unused_array_is_array = Array.isArray([1, 2, 3]);
const unused_const_array_is_array = Array.isArray(unused_spread_source_array);
const unused_array_of_call = Array.of("dead_array_of", "dead_array_of_tail");
const unused_array_from_array_call = Array.from(["dead_array_from_array"]);
const unused_array_from_string_call = Array.from("dead_array_from_string");
const unused_array_from_map_call = Array.from(new Map([["dead_array_from_map_key", "dead_array_from_map_value"]]));
const unused_array_from_set_call = Array.from(new Set(["dead_array_from_set", "dead_array_from_set_tail"]));
const unused_array_from_empty_const_source: number[] = [];
const unused_array_from_empty_const_copy_source = Array.from(unused_array_from_empty_const_source);
const unused_array_from_empty_set_source = new Set<number>();
const unused_array_from_empty_set_copy_source = new Set(unused_array_from_empty_set_source);
const unused_array_from_empty_map_source = new Map<string, number>();
const unused_array_from_empty_map_copy_source = new Map(unused_array_from_empty_map_source);
const unused_array_from_empty_array_mapper_call = Array.from([] as number[], (value) => value + "dead_array_from_empty_array_mapper".length);
const unused_array_from_empty_const_mapper_call = Array.from(unused_array_from_empty_const_source, (value) => value + "dead_array_from_empty_const_mapper".length);
const unused_array_from_empty_const_copy_mapper_call = Array.from(unused_array_from_empty_const_copy_source, (value) => value + "dead_array_from_empty_const_copy_mapper".length);
const unused_array_from_empty_string_mapper_call = Array.from("", (value) => value + "dead_array_from_empty_string_mapper");
const unused_array_from_empty_mapped_map_call = Array.from([] as number[], (value) => value + "dead_array_from_empty_mapped_map_mapper".length).map(() => "dead_array_from_empty_mapped_map");
const unused_array_from_empty_map_const_mapper_call = Array.from(unused_array_from_empty_map_source, (entry) => entry[1] + "dead_array_from_empty_map_const_mapper".length);
const unused_array_from_empty_map_copy_mapper_call = Array.from(unused_array_from_empty_map_copy_source, (entry) => entry[1] + "dead_array_from_empty_map_copy_mapper".length);
const unused_array_from_empty_map_mapper_call = Array.from(new Map<string, number>(), (entry) => entry[1] + "dead_array_from_empty_map_mapper".length);
const unused_array_from_empty_set_const_mapper_call = Array.from(unused_array_from_empty_set_source, (value) => value + "dead_array_from_empty_set_const_mapper".length);
const unused_array_from_empty_set_copy_mapper_call = Array.from(unused_array_from_empty_set_copy_source, (value) => value + "dead_array_from_empty_set_copy_mapper".length);
const unused_array_from_empty_set_mapper_call = Array.from(new Set<number>(), (value) => value + "dead_array_from_empty_set_mapper".length);
Array.from(new Set(["kept_array_from_non_empty_set_mapper"]), (value) => value);
const unused_const_array_from_call = Array.from(unused_spread_source_array);
const unused_number_is_finite = Number.isFinite(1);
const unused_number_is_integer = Number.isInteger(2);
const unused_number_is_safe_integer = Number.isSafeInteger(3);
const unused_number_is_nan = Number.isNaN(0 / 0);
const unused_math_pi_read = Math.PI + "dead_math_pi_read".length;
const unused_math_sqrt_read = Math.SQRT1_2 + "dead_math_sqrt_read".length;
const unused_number_epsilon_read = Number.EPSILON + "dead_number_epsilon_read".length;
const unused_number_nan_read = Number.NaN + "dead_number_nan_read".length;
const unused_symbol_iterator_read = Symbol.iterator;
const unused_symbol_async_iterator_description_read = (Symbol.asyncIterator.description, "dead_symbol_async_iterator_description_read".length);
const unused_process_platform_read = process.platform;
const unused_process_pid_read = process.pid;
const unused_process_exec_path_read = (process.execPath, "dead_process_exec_path_read".length);
const unused_process_versions_node_read = process.versions.node + "dead_process_versions_node_read";
const unused_process_release_name_read = process.release.name + "dead_process_release_name_read";
const unused_process_features_tls_read = process.features.tls || "dead_process_features_tls_read";
const unused_process_platform_length_read = process.platform.length + "dead_process_platform_length_read".length;
const unused_process_version_upper_call = (process.version.toUpperCase(), "dead_process_version_upper_call".length);
const unused_process_versions_node_index_read = (process.versions.node[0], "dead_process_versions_node_index_read".length);
const unused_process_release_name_includes_call = (process.release.name.includes("node"), "dead_process_release_name_includes_call".length);
const unused_process_cwd_length_call = process.cwd("dead_process_cwd_length_ignored".length).length;
const unused_process_stdin_fd_read = (process.stdin.fd, "dead_process_stdin_fd_read".length);
const unused_process_stdin_destroyed_read = (process.stdin.destroyed, "dead_process_stdin_destroyed_read".length);
const unused_process_stdin_flowing_read = (process.stdin.readableFlowing, "dead_process_stdin_flowing_read".length);
const unused_process_stdout_writable_read = process.stdout.writable;
const unused_process_stdout_corked_read = process.stdout.writableCorked + "dead_process_stdout_corked_read".length;
const unused_process_stdout_finished_read = (process.stdout.writableFinished, "dead_process_stdout_finished_read".length);
const unused_process_stdout_readable_read = (process.stdout as any).readable;
const unused_process_stderr_closed_read = (process.stderr.closed, "dead_process_stderr_closed_read".length);
const unused_process_stderr_errored_read = (process.stderr.errored === null, "dead_process_stderr_errored_read".length);
const unused_process_stderr_readable_read = (process.stderr as any).readable;
const unused_process_stdin_is_paused_call = process.stdin.isPaused("dead_process_stdin_is_paused_call".length);
const unused_process_stdin_set_encoding_call = process.stdin.setEncoding("utf8", "dead_process_stdin_set_encoding_call".length);
const unused_process_stdin_pause_call = process.stdin.pause("dead_process_stdin_pause_call".length);
const unused_process_stdin_resume_call = process.stdin.resume("dead_process_stdin_resume_call".length);
const unused_process_stdin_pipe_call = process.stdin.pipe(process.stdout, "dead_process_stdin_pipe_call".length);
const unused_process_stdin_unpipe_call = process.stdin.unpipe(process.stderr, "dead_process_stdin_unpipe_call".length);
const unused_process_stdin_remove_all_call = process.stdin.removeAllListeners("dead_process_stdin_remove_all_call");
const unused_process_stdin_on_call = process.stdin.on("dead_process_stdin_on_call", () => undefined);
const unused_process_stdout_set_default_encoding_call = process.stdout.setDefaultEncoding("utf8", "dead_process_stdout_set_default_encoding_call".length);
const unused_process_stdout_cork_call = process.stdout.cork("dead_process_stdout_cork_call".length);
const unused_process_stderr_uncork_call = process.stderr.uncork("dead_process_stderr_uncork_call".length);
const unused_stream_named_readable_stdin_call = isReadable(process.stdin, "dead_stream_named_readable_stdin_call".length);
const unused_stream_named_alias_readable_stdin_call = streamReadableAlias(process.stdin, "dead_stream_named_alias_readable_stdin_call".length);
const unused_stream_namespace_writable_stdout_call = nodeStream.isWritable(process.stdout, "dead_stream_namespace_writable_stdout_call".length);
const unused_stream_default_disturbed_stderr_call = streamDefault.isDisturbed(process.stderr, "dead_stream_default_disturbed_stderr_call".length);
const unused_stream_named_destroyed_plain_call = isDestroyed({ dead_stream_named_destroyed_plain_call: true }, "dead_stream_named_destroyed_plain_ignored".length);
const unused_stream_named_alias_destroyed_plain_call = streamDestroyedAlias({ dead_stream_named_alias_destroyed_plain_call: true }, "dead_stream_named_alias_destroyed_plain_ignored".length);
const unused_stream_namespace_errored_null_call = nodeStream.isErrored(null, "dead_stream_namespace_errored_null_call".length);
const unused_process_cwd_call = process.cwd("dead_process_cwd_ignored".length);
const unused_process_uptime_call = process.uptime("dead_process_uptime_ignored".length);
const unused_process_hrtime_call = process.hrtime();
const unused_process_hrtime_bigint_call = process.hrtime.bigint("dead_process_hrtime_bigint_ignored".length);
const unused_process_getgroups_call = process.getgroups("dead_process_getgroups_ignored".length);
const unused_process_cpu_user_read = process.cpuUsage().user + "dead_process_cpu_user_read".length;
const unused_process_memory_usage_call = process.memoryUsage("dead_process_memory_usage_ignored".length);
const unused_process_resource_usage_call = process.resourceUsage("dead_process_resource_usage_ignored".length);
const unused_process_memory_rss_read = process.memoryUsage("dead_process_memory_rss_ignored".length).rss;
const unused_process_resource_user_cpu_read = process.resourceUsage("dead_process_resource_user_cpu_ignored".length).userCPUTime;
const unused_filename_read = __filename.length + "dead_filename_read".length;
const unused_dirname_read = __dirname;
const unused_module_filename_read = module.filename;
const unused_module_loaded_read = (module.loaded, "dead_module_loaded_read".length);
const unused_dirname_upper_call = (__dirname.toUpperCase(), "dead_dirname_upper_call".length);
const unused_module_filename_length_read = module.filename.length + "dead_module_filename_length_read".length;
const unused_module_id_index_read = (module.id[0], "dead_module_id_index_read".length);
const unused_module_path_includes_call = (module.path.includes("node_modules"), "dead_module_path_includes_call".length);
const unused_fs_constant_read = nodeFs.constants.F_OK + "dead_fs_constant_read".length;
const unused_fs_named_constant_read = fsConstants.COPYFILE_EXCL + "dead_fs_named_constant_read".length;
const unused_path_constant_read = nodePath.sep.length + "dead_path_constant_read".length;
const unused_path_named_constant_read = pathDelimiter.length + "dead_path_named_constant_read".length;
const unused_os_constant_read = nodeOs.EOL.length + "dead_os_constant_read".length;
const unused_os_named_constant_read = osDevNull.length + "dead_os_named_constant_read".length;
const unused_path_constant_upper_call = (nodePath.sep.toUpperCase(), "dead_path_constant_upper_call".length);
const unused_path_named_constant_index_read = (pathDelimiter[0], "dead_path_named_constant_index_read".length);
const unused_os_constant_index_read = (nodeOs.EOL[0], "dead_os_constant_index_read".length);
const unused_os_named_constant_upper_call = (osDevNull.toUpperCase(), "dead_os_named_constant_upper_call".length);
const unused_dns_constant_read = nodeDns.ADDRCONFIG + "dead_dns_constant_read".length;
const unused_dns_named_constant_read = ALL + "dead_dns_named_constant_read".length;
const unused_dns_alias_constant_read = dnsV4Mapped + "dead_dns_alias_constant_read".length;
const unused_event_default_read = EventEmitter.defaultMaxListeners + "dead_event_default_read".length;
const unused_event_namespace_default_read = nodeEvents.defaultMaxListeners + "dead_event_namespace_default_read".length;
const unused_event_named_default_read = defaultMaxListeners + "dead_event_named_default_read".length;
const unused_event_alias_default_read = ImportedEventEmitter.defaultMaxListeners + "dead_event_alias_default_read".length;
const unused_new_event_emitter_call = new EventEmitter("dead_new_event_emitter_ignored".length);
const unused_new_imported_event_emitter_call = new ImportedEventEmitter("dead_new_imported_event_emitter_ignored".length);
const unused_event_emitter_get_max_call = new EventEmitter().getMaxListeners("dead_event_emitter_get_max_ignored".length);
const unused_imported_event_emitter_listener_count_call = new ImportedEventEmitter().listenerCount("dead_imported_event_emitter_listener_count");
const unused_event_emitter_listeners_call = new EventEmitter().listeners("dead_event_emitter_listeners");
const unused_event_emitter_event_names_call = new EventEmitter().eventNames("dead_event_emitter_event_names_ignored".length);
const unused_event_emitter_to_string_call = new EventEmitter().toString("dead_event_emitter_to_string_ignored".length);
const unused_event_static_listener_count_call = EventEmitter.listenerCount(new EventEmitter(), "dead_event_static_listener_count");
const unused_events_namespace_get_max_call = nodeEvents.getMaxListeners(new EventEmitter(), "dead_events_namespace_get_max_ignored".length);
const unused_events_named_get_max_call = getMaxListeners(new EventEmitter(), "dead_events_named_get_max_ignored".length);
const unused_events_named_listener_count_call = listenerCount(new EventEmitter(), "dead_events_named_listener_count");
const unused_events_namespace_get_event_listeners_call = nodeEvents.getEventListeners(new EventEmitter(), "dead_events_namespace_get_event_listeners");
const unused_event_emitter_set_max_call = new EventEmitter().setMaxListeners(11);
const unused_event_emitter_remove_all_call = new EventEmitter().removeAllListeners("dead_event_emitter_remove_all");
const unused_event_emitter_on_call = new EventEmitter().on("dead_event_emitter_on", () => undefined);
const unused_event_emitter_once_call = new EventEmitter().once("dead_event_emitter_once", () => undefined);
const unused_event_emitter_off_call = new EventEmitter().off("dead_event_emitter_off", () => undefined);
const unused_event_emitter_emit_call = new EventEmitter().emit("dead_event_emitter_emit", "dead_event_emitter_emit_payload");
const unused_events_namespace_once_call = nodeEvents.once(new EventEmitter(), "dead_events_namespace_once");
const unused_events_named_once_call = eventsOnce(new EventEmitter(), "dead_events_named_once");
const unused_events_namespace_once_undefined_options_call = nodeEvents.once(new EventEmitter(), "dead_events_namespace_once_undefined_options", undefined);
const unused_events_named_once_signal_undefined_call = eventsOnce(new EventEmitter(), "dead_events_named_once_signal_undefined", { signal: undefined });
const unused_events_named_once_signal_alias_call = eventsOnce(new EventEmitter(), "dead_events_named_once_signal_alias", { signal: unused_default_option });
const unused_crypto_hash_call = crypto.createHash("sha256");
const unused_crypto_named_hash_call = createHash("sha1");
const unused_crypto_namespace_hash_update_call = nodeCrypto.createHash("sha512").update("dead_crypto_namespace_hash_update");
const unused_crypto_hash_digest_call = crypto.createHash("sha256").update("dead_crypto_hash_digest").digest("hex");
const unused_crypto_hash_buffer_digest_call = createHash("sha1").update(Buffer.from("dead_crypto_hash_buffer_digest")).digest("base64");
const unused_crypto_hash_default_digest_call = crypto.createHash("sha256").update("dead_crypto_hash_default_digest").digest(unused_hash_digest_default_encoding);
const unused_crypto_namespace_hash_digest_call = nodeCrypto.createHash("sha256").update("dead_crypto_namespace_hash_digest").digest("hex");
const unused_crypto_hash_digest_length_read = crypto.createHash("sha256").update("dead_crypto_hash_digest_length_read").digest("hex").length;
const unused_crypto_hash_digest_upper_call = (createHash("sha1").update("dead_crypto_hash_digest_upper_call").digest("base64").toUpperCase(), "dead_crypto_hash_digest_upper_call_marker".length);
const unused_crypto_hash_digest_index_read = (nodeCrypto.createHash("sha512").update("dead_crypto_hash_digest_index_read").digest("hex")[0], "dead_crypto_hash_digest_index_read_marker".length);
const unused_new_event_target_call = new EventTarget("dead_new_event_target_ignored".length);
const unused_new_event_call = new Event("dead_new_event_type", { cancelable: true });
const unused_new_event_alias_options_call = new Event("dead_new_event_alias_options", { cancelable: unused_false });
const unused_event_type_read = new Event("dead_event_type_read").type;
const unused_event_type_length_read = new Event("dead_event_type_length_read").type.length;
const unused_event_type_upper_call = (new Event("dead_event_type_upper_call").type.toUpperCase(), "dead_event_type_upper_call_marker".length);
const unused_event_type_index_read = (new Event("dead_event_type_index_read").type[0], "dead_event_type_index_read_marker".length);
const unused_event_cancelable_read = new Event("dead_event_cancelable_read", { cancelable: true }).cancelable;
const unused_event_default_prevented_read = new Event("dead_event_default_prevented_read").defaultPrevented;
const unused_event_target_read = new Event("dead_event_target_read").target;
const unused_event_current_target_read = new Event("dead_event_current_target_read").currentTarget;
const unused_event_prevent_default_call = new Event("dead_event_prevent_default_call", { cancelable: true }).preventDefault("dead_event_prevent_default_ignored".length);
const unused_event_to_string_call = new Event("dead_event_to_string_call").toString("dead_event_to_string_ignored".length);
const unused_event_target_dispatch_call = new EventTarget().dispatchEvent(new Event("dead_event_target_dispatch_call", { cancelable: true }));
const unused_event_target_alias_options_call = new EventTarget().addEventListener("dead_event_target_alias_options", () => undefined, { once: unused_false, capture: unused_default_option, passive: unused_false });
const unused_event_target_to_string_call = new EventTarget().toString("dead_event_target_to_string_ignored".length);
const unused_event_to_string_length_read = new Event("dead_event_to_string_length_read").toString().length;
const unused_event_target_to_locale_upper_call = (new EventTarget().toLocaleString().toUpperCase(), "dead_event_target_to_locale_upper_call_marker".length);
const unused_event_emitter_to_string_index_read = (new EventEmitter().toString()[0], "dead_event_emitter_to_string_index_read_marker".length);
const unused_os_platform_call = nodeOs.platform("dead_os_platform_ignored".length);
const unused_os_named_arch_call = osArch("dead_os_named_arch_ignored".length);
const unused_os_loadavg_call = nodeOs.loadavg("dead_os_loadavg_ignored".length);
const unused_os_user_info_call = nodeOs.userInfo({ encoding: unused_utf8 });
const unused_os_user_info_username_read = os.userInfo({ encoding: undefined }).username + "dead_os_user_info_username_read";
const unused_os_user_info_alias_undefined_read = os.userInfo({ encoding: unused_default_option }).username + "dead_os_user_info_alias_undefined_read";
const unused_os_named_user_info_uid_read = osUserInfo().uid + "dead_os_named_user_info_uid_read".length;
const unused_os_user_info_username_length_read = nodeOs.userInfo().username.length + "dead_os_user_info_username_length_read".length;
const unused_os_named_user_info_shell_upper_call = osUserInfo({ encoding: unused_utf8 }).shell.toUpperCase();
const unused_os_global_user_info_homedir_index_read = os.userInfo().homedir[0];
const unused_path_join_call = nodePath.join("dead_path_join_ignored", "tail");
const unused_path_named_normalize_call = pathNormalize("dead_path_named_normalize_ignored/..");
const unused_path_parse_call = nodePath.parse("dead_path_parse_ignored");
const unused_path_posix_join_call = nodePath.posix.join("dead_path_posix_join_ignored", "tail");
const unused_path_named_posix_normalize_call = pathPosix.normalize("dead_path_named_posix_normalize_ignored/..");
const unused_path_global_posix_parse_call = path.posix.parse("dead_path_global_posix_parse_ignored");
const unused_path_format_call = pathFormat({ dir: "/dead_path_format_dir", name: "dead_path_format_name", ext: ".txt" }, "dead_path_format_ignored".length);
const unused_path_format_alias_default_call = pathFormat({ dir: "/dead_path_format_alias_default_dir", name: unused_default_option, ext: ".txt" });
const unused_path_posix_format_call = pathPosix.format({ root: "/", base: "dead_path_posix_format_base.txt" });
const unused_path_parse_base_read = nodePath.parse("dead_path_parse_base_read.txt").base;
const unused_path_named_parse_ext_read = pathParse("dead_path_named_parse_ext_read.txt").ext;
const unused_path_posix_parse_name_read = pathPosix.parse("/tmp/dead_path_posix_parse_name_read.txt").name;
const unused_path_global_posix_parse_dir_read = path.posix.parse("/tmp/dead_path_global_posix_parse_dir_read.txt").dir;
const unused_path_parse_base_length_read = nodePath.parse("dead_path_parse_base_length_read.txt").base.length;
const unused_path_named_parse_ext_length_read = pathParse("dead_path_named_parse_ext_length_read.txt").ext.length;
const unused_path_parse_base_upper_call = nodePath.parse("dead_path_parse_base_upper_call.txt").base.toUpperCase();
const unused_path_named_parse_ext_starts_call = pathParse("dead_path_named_parse_ext_starts_call.txt").ext.startsWith(".");
const unused_path_posix_parse_name_index_read = pathPosix.parse("/tmp/dead_path_posix_parse_name_index_read.txt").name[0];
const unused_path_format_length_read = pathFormat({ dir: "/dead_path_format_length_dir", name: "dead_path_format_length_name", ext: ".txt" }).length;
const unused_path_basename_upper_call = nodePath.basename("dead_path_basename_upper_call.txt", ".txt").toUpperCase();
const unused_path_posix_dirname_index_read = pathPosix.dirname("/tmp/dead_path_posix_dirname_index_read/file.txt")[0];
const unused_net_is_ip_call = nodeNet.isIP("dead_net_is_ip_ignored");
const unused_net_named_is_ip_call = netIsIP("dead_net_named_is_ip_ignored");
const unused_net_global_is_ipv4_call = net.isIPv4("dead_net_global_is_ipv4_ignored");
const unused_buffer_byte_length_call = Buffer.byteLength("dead_buffer_byte_length_ignored", unused_utf8);
const unused_buffer_is_encoding_call = Buffer.isEncoding("dead_buffer_is_encoding_ignored");
const unused_buffer_is_buffer_call = Buffer.isBuffer("dead_buffer_is_buffer_ignored");
const unused_buffer_from_call = Buffer.from("dead_buffer_from_ignored", unused_utf8);
const unused_buffer_byte_length_default_alias_call = Buffer.byteLength("dead_buffer_byte_length_default_alias", unused_default_option);
const unused_buffer_from_default_alias_call = Buffer.from("dead_buffer_from_default_alias", unused_default_option);
const unused_buffer_alloc_call = Buffer.alloc(2, 65);
const unused_buffer_alloc_unsafe_call = Buffer.allocUnsafe(2);
const unused_buffer_to_string_call = Buffer.from("dead_buffer_to_string_ignored").toString(unused_utf8);
const unused_buffer_to_string_default_alias_call = Buffer.from("dead_buffer_to_string_default_alias").toString(unused_default_option);
const unused_buffer_to_locale_string_call = Buffer.from("dead_buffer_to_locale_string_ignored").toLocaleString();
const unused_buffer_value_of_call = Buffer.from("dead_buffer_value_of_ignored").valueOf();
const unused_buffer_to_string_length_read = Buffer.from("dead_buffer_to_string_length_read").toString().length;
const unused_buffer_to_string_upper_call = (Buffer.from("dead_buffer_to_string_upper_call").toString(unused_utf8).toUpperCase(), "dead_buffer_to_string_upper_call_marker".length);
const unused_buffer_to_locale_string_index_read = (Buffer.from("dead_buffer_to_locale_string_index_read").toLocaleString()[0], "dead_buffer_to_locale_string_index_read_marker".length);
const unused_global_parse_int = parseInt("dead_global_parse_int", 10);
const unused_global_parse_float = parseFloat("dead_global_parse_float");
const unused_global_is_nan = isNaN("dead_global_is_nan");
const unused_global_is_finite = isFinite("dead_global_is_finite");
const unused_btoa_call = btoa("dead_btoa_call");
const unused_atob_call = atob("ZGVhZF9hdG9iX2NhbGw=");
const unused_btoa_length_read = btoa("dead_btoa_length_read").length;
const unused_atob_upper_call = (atob("ZGVhZF9hdG9iX3VwcGVyX2NhbGw=").toUpperCase(), "dead_atob_upper_call_marker".length);
const unused_btoa_index_read = (btoa("dead_btoa_index_read")[0], "dead_btoa_index_read_marker".length);
const unused_number_parse_int = Number.parseInt("dead_number_parse_int", 10);
const unused_number_parse_float = Number.parseFloat("dead_number_parse_float");
const unused_string_constructor_call = String("dead_string_constructor");
const unused_string_constructor_length_read = String("dead_string_constructor_length_read").length;
const unused_string_constructor_upper_call = (String("dead_string_constructor_upper_call").toUpperCase(), "dead_string_constructor_upper_call_marker".length);
const unused_string_constructor_index_read = (String("dead_string_constructor_index_read")[0], "dead_string_constructor_index_read_marker".length);
const unused_number_constructor_call = Number("123");
const unused_boolean_constructor_call = Boolean("dead_boolean_constructor");
const unused_date_callable_call = Date("dead_date_callable_ignored");
const unused_date_callable_length_read = Date("dead_date_callable_length_ignored").length;
const unused_date_callable_upper_call = (Date("dead_date_callable_upper_ignored").toUpperCase(), "dead_date_callable_upper_call_marker".length);
const unused_date_callable_index_read = (Date("dead_date_callable_index_ignored")[0], "dead_date_callable_index_read_marker".length);
const unused_date_now_call = Date.now("dead_date_now_ignored");
const unused_date_parse_call = Date.parse("2020-01-02T03:04:05Z");
const unused_date_utc_call = Date.UTC(2020, 0, 2, 3, 4, 5, 6);
const unused_new_date_empty_call = new Date();
const unused_new_date_string_call = new Date("2020-01-03T04:05:06Z");
const unused_new_date_number_call = new Date(1234567);
const unused_new_date_parts_call = new Date(2020, 0, 3, 4, 5, 6, 7);
const unused_date_to_utc_string_length_read = new Date("2020-01-04T05:06:07Z").toUTCString().length;
const unused_date_to_date_string_upper_call = (new Date("2020-01-05T06:07:08Z").toDateString().toUpperCase(), "dead_date_to_date_string_upper_call_marker".length);
const unused_date_to_time_string_index_read = (new Date("2020-01-06T07:08:09Z").toTimeString()[0], "dead_date_to_time_string_index_read_marker".length);
const unused_new_url_call = new URL("https://dead-new-url.test/path?q=1");
const unused_new_url_base_call = new URL("child", "https://dead-new-url-base.test/root/");
const unused_url_to_string_call = new URL("https://dead-url-to-string.test/path").toString("dead_url_to_string_ignored");
const unused_url_to_json_call = new URL("https://dead-url-to-json.test/path").toJSON("dead_url_to_json_ignored");
const unused_url_value_of_call = new URL("https://dead-url-value-of.test/path").valueOf("dead_url_value_of_ignored");
const unused_url_has_own_call = new URL("https://dead-url-has-own.test/path").hasOwnProperty("dead_url_has_own", "dead_url_has_own_ignored");
const unused_url_href_read = new URL("https://dead-url-href-read.test/path?q=1#hash").href;
const unused_url_pathname_read = new URL("https://dead-url-pathname-read.test/path?q=1#hash").pathname;
const unused_url_href_length_read = new URL("https://dead-url-href-length-read.test/path?q=1").href.length;
const unused_url_pathname_upper_call = (new URL("https://dead-url-pathname-upper-call.test/path").pathname.toUpperCase(), "dead_url_pathname_upper_call_marker".length);
const unused_url_host_index_read = (new URL("https://dead-url-host-index-read.test/path").host[0], "dead_url_host_index_read_marker".length);
const unused_new_map_empty_call = new Map<string, number>();
const unused_new_map_entries_call = new Map([["dead_new_map_entries_key", "dead_new_map_entries_value"]]);
const unused_new_map_ignored_extra_entry_call = new Map([
    (["dead_new_map_ignored_extra_key", "dead_new_map_ignored_extra_value", "dead_new_map_ignored_extra"] as unknown as ObjectEntry<string>),
]);
const unused_new_map_object_entries_call = new Map(Object.entries({ dead_new_map_object_entries_key: "dead_new_map_object_entries_value" }));
const unused_new_map_copy_call = new Map(new Map([["dead_new_map_copy_key", "dead_new_map_copy_value"]]));
const unused_map_get_call = new Map([["dead_map_get_key", "dead_map_get_value"]]).get("dead_map_get_key");
const unused_map_has_call = new Map([["dead_map_has_key", "dead_map_has_value"]]).has("dead_map_has_key");
const unused_map_keys_call = new Map([["dead_map_keys_key", "dead_map_keys_value"]]).keys();
const unused_map_values_call = new Map([["dead_map_values_key", "dead_map_values_value"]]).values();
const unused_map_entries_call = new Map([["dead_map_entries_key", "dead_map_entries_value"]]).entries();
const unused_map_size_read = new Map([["dead_map_size_key", "dead_map_size_value"]]).size;
const unused_map_object_to_string_call = new Map([["dead_map_object_to_string_key", "dead_map_object_to_string_value"]]).toString("dead_map_object_to_string_ignored");
const unused_set_object_value_of_call = new Set(["dead_set_object_value_of"]).valueOf("dead_set_object_value_of_ignored");
const unused_weak_map_object_to_locale_string_call = new WeakMap<object, string>().toLocaleString("dead_weak_map_object_to_locale_string_ignored");
const unused_weak_set_object_has_own_call = new WeakSet<object>().hasOwnProperty("dead_weak_set_object_has_own", "dead_weak_set_object_has_own_ignored");
const unused_weak_ref_object_property_enum_call = new WeakRef<object>({ label: "dead_weak_ref_object_property_enum_target" }).propertyIsEnumerable("dead_weak_ref_object_property_enum", "dead_weak_ref_object_property_enum_ignored");
const unused_finregistry_object_to_string_call = new FinalizationRegistry<string>((held) => {
    "dead_finregistry_object_to_string_callback";
}).toString("dead_finregistry_object_to_string_ignored");
const unused_map_object_to_string_length_read = new Map([["dead_map_object_to_string_length_key", "dead_map_object_to_string_length_value"]]).toString().length + "dead_map_object_to_string_length_read".length;
const unused_weak_map_object_to_locale_upper_call = (new WeakMap<object, string>().toLocaleString().toUpperCase(), "dead_weak_map_object_to_locale_upper_call_marker".length);
const unused_finregistry_object_to_string_index_read = (new FinalizationRegistry<string>((held) => {
    "dead_finregistry_object_to_string_index_callback";
}).toString()[0], "dead_finregistry_object_to_string_index_read_marker".length);
const unused_new_set_empty_call = new Set<number>();
const unused_new_set_array_call = new Set(["dead_new_set_array", "dead_new_set_array_tail"]);
const unused_new_set_copy_call = new Set(new Set(["dead_new_set_copy", "dead_new_set_copy_tail"]));
const unused_set_has_call = new Set(["dead_set_has"]).has("dead_set_has");
const unused_set_keys_call = new Set(["dead_set_keys"]).keys();
const unused_set_values_call = new Set(["dead_set_values"]).values();
const unused_set_size_read = new Set(["dead_set_size"]).size;
const unused_set_union_call = new Set(["dead_set_union"]).union(new Set(["dead_set_union_other"]));
const unused_set_intersection_call = new Set(["dead_set_intersection"]).intersection(new Set(["dead_set_intersection_other"]));
const unused_set_difference_call = new Set(["dead_set_difference"]).difference(new Set(["dead_set_difference_other"]));
const unused_set_symmetric_difference_call = new Set(["dead_set_symmetric_difference"]).symmetricDifference(new Set(["dead_set_symmetric_difference_other"]));
const unused_set_subset_call = new Set(["dead_set_subset"]).isSubsetOf(new Set(["dead_set_subset_other"]));
const unused_set_superset_call = new Set(["dead_set_superset"]).isSupersetOf(new Set(["dead_set_superset_other"]));
const unused_set_disjoint_call = new Set(["dead_set_disjoint"]).isDisjointFrom(new Set(["dead_set_disjoint_other"]));
const unused_new_weak_map_empty_call = new WeakMap<object, string>();
const unused_new_weak_map_static_source_call = new WeakMap<object, string>([
    [{ dead_new_weak_map_static_key: 1 }, "dead_new_weak_map_static_value"],
    [{ dead_new_weak_map_static_tail_key: 2 }, "dead_new_weak_map_static_tail_value"],
]);
const unused_new_weak_map_ignored_extra_entry_call = new WeakMap<object, string>([
    ([{ dead_new_weak_map_ignored_extra_key: 1 }, "dead_new_weak_map_ignored_extra_value", "dead_new_weak_map_ignored_extra"] as unknown as [object, string]),
]);
const unused_new_weak_map_map_source_call = new WeakMap<object, string>(new Map<object, string>());
const unused_weak_map_get_call = new WeakMap<object, string>().get({ dead_weak_map_get_key: 1 });
const unused_weak_map_has_call = new WeakMap<object, string>([[{ dead_weak_map_has_source_key: 1 }, "dead_weak_map_has_source_value"]]).has({ dead_weak_map_has_key: 1 });
const unused_new_weak_set_empty_call = new WeakSet<object>();
const unused_new_weak_set_static_source_call = new WeakSet<object>([
    { dead_new_weak_set_static_value: 1 },
    { dead_new_weak_set_static_tail: 2 },
]);
const unused_new_weak_set_set_source_call = new WeakSet<object>(new Set<object>());
const unused_new_weak_set_object_set_source_call = new WeakSet<object>(new Set<object>([
    { dead_new_weak_set_object_set_source_value: 1 },
]));
const unused_weak_set_has_call = new WeakSet<object>([{ dead_weak_set_has_source: 1 }]).has({ dead_weak_set_has_key: 1 });
const unused_new_weak_ref_call = new WeakRef<object>({ label: "dead_weak_ref_target" });
const unused_weak_ref_deref_call = new WeakRef<object>({ label: "dead_weak_ref_deref_target" }).deref("dead_weak_ref_deref_ignored");
const unused_new_finalization_registry_call = new FinalizationRegistry<string>((held) => {
    "dead_finalization_registry_callback";
});
const unused_finregistry_register_call = new FinalizationRegistry<string>((held) => {
    "dead_finregistry_register_callback";
}).register({ label: "dead_finregistry_register_target" }, "dead_finregistry_register_held", { label: "dead_finregistry_register_token" });
const unused_finregistry_unregister_call = new FinalizationRegistry<string>((held) => {
    "dead_finregistry_unregister_callback";
}).unregister({ label: "dead_finregistry_unregister_token" }, "dead_finregistry_unregister_ignored");
const unused_uri_source = "dead_uri_source";
const unused_url_can_parse_call = URL.canParse("https://dead-url-can-parse.test/path");
const unused_url_can_parse_base_call = URL.canParse("dead-url-can-parse-child", "https://dead-url-can-parse-base.test/root/");
const unused_promise_resolve_call = Promise.resolve("dead_promise_resolve", "dead_promise_resolve_ignored");
const unused_promise_empty_array_source: Promise<string>[] = [];
const unused_promise_empty_array_copy_source = Array.from(unused_promise_empty_array_source);
const unused_promise_all_empty_call = Promise.all([] as Promise<string>[]);
const unused_promise_all_settled_empty_call = Promise.allSettled([] as Promise<string>[]);
const unused_promise_any_empty_call = Promise.any([] as Promise<string>[]);
const unused_promise_race_empty_call = Promise.race([] as Promise<string>[]);
const unused_promise_all_empty_const_array_call = Promise.all(unused_promise_empty_array_source);
const unused_promise_all_settled_empty_const_array_call = Promise.allSettled(unused_promise_empty_array_source);
const unused_promise_any_empty_const_array_call = Promise.any(unused_promise_empty_array_source);
const unused_promise_race_empty_const_array_call = Promise.race(unused_promise_empty_array_source);
const unused_promise_all_empty_array_copy_call = Promise.all(unused_promise_empty_array_copy_source);
const unused_promise_all_settled_empty_array_copy_call = Promise.allSettled(unused_promise_empty_array_copy_source);
const unused_promise_any_empty_array_copy_call = Promise.any(unused_promise_empty_array_copy_source);
const unused_promise_race_empty_array_copy_call = Promise.race(unused_promise_empty_array_copy_source);
const unused_promise_all_empty_const_array_then_call = Promise.all(unused_promise_empty_array_source)
    .then(() => "dead_promise_all_empty_const_array_then_callback");
const unused_promise_all_settled_empty_const_array_then_call = Promise.allSettled(unused_promise_empty_array_source)
    .then(() => "dead_promise_all_settled_empty_const_array_then_callback");
const unused_promise_any_empty_const_array_catch_call = Promise.any(unused_promise_empty_array_source)
    .catch(() => "dead_promise_any_empty_const_array_catch_callback");
const unused_promise_race_empty_const_array_finally_call = Promise.race(unused_promise_empty_array_source)
    .finally(() => "dead_promise_race_empty_const_array_finally_callback");
const unused_promise_all_empty_array_copy_then_call = Promise.all(unused_promise_empty_array_copy_source)
    .then(() => "dead_promise_all_empty_array_copy_then_callback");
const unused_promise_all_settled_empty_array_copy_then_call = Promise.allSettled(unused_promise_empty_array_copy_source)
    .then(() => "dead_promise_all_settled_empty_array_copy_then_callback");
const unused_promise_any_empty_array_copy_catch_call = Promise.any(unused_promise_empty_array_copy_source)
    .catch(() => "dead_promise_any_empty_array_copy_catch_callback");
const unused_promise_race_empty_array_copy_finally_call = Promise.race(unused_promise_empty_array_copy_source)
    .finally(() => "dead_promise_race_empty_array_copy_finally_callback");
const unused_promise_all_array_of_empty_call = Promise.all(Array.of<Promise<string>>());
const unused_promise_all_settled_array_from_empty_call = Promise.allSettled(Array.from([] as Promise<string>[]));
const unused_promise_any_array_from_empty_call = Promise.any(Array.from([] as Promise<string>[]));
const unused_promise_race_array_from_empty_call = Promise.race(Array.from([] as Promise<string>[]));
const unused_promise_any_nested_array_from_empty_call = Promise.any(Array.from(Array.of<Promise<string>>()));
const unused_promise_race_nested_array_from_empty_call = Promise.race(Array.from(Array.of<Promise<string>>()));
const unused_promise_empty_set_source = new Set<Promise<string>>();
const unused_promise_empty_set_copy_source = new Set(unused_promise_empty_set_source);
const unused_promise_all_empty_set_call = Promise.all(new Set<Promise<string>>());
const unused_promise_all_settled_empty_set_call = Promise.allSettled(new Set<Promise<string>>());
const unused_promise_any_empty_set_call = Promise.any(new Set<Promise<string>>());
const unused_promise_race_empty_set_call = Promise.race(new Set<Promise<string>>());
const unused_promise_all_empty_const_set_call = Promise.all(unused_promise_empty_set_source);
const unused_promise_all_settled_empty_const_set_call = Promise.allSettled(unused_promise_empty_set_source);
const unused_promise_any_empty_const_set_call = Promise.any(unused_promise_empty_set_source);
const unused_promise_race_empty_const_set_call = Promise.race(unused_promise_empty_set_source);
const unused_promise_all_empty_set_copy_call = Promise.all(unused_promise_empty_set_copy_source);
const unused_promise_all_settled_empty_set_copy_call = Promise.allSettled(unused_promise_empty_set_copy_source);
const unused_promise_any_empty_set_copy_call = Promise.any(unused_promise_empty_set_copy_source);
const unused_promise_race_empty_set_copy_call = Promise.race(unused_promise_empty_set_copy_source);
const unused_promise_all_empty_const_set_then_call = Promise.all(unused_promise_empty_set_source)
    .then((value) => "dead_promise_all_empty_const_set_then_callback");
const unused_promise_all_settled_empty_const_set_then_call = Promise.allSettled(unused_promise_empty_set_source)
    .then((value) => "dead_promise_all_settled_empty_const_set_then_callback");
const unused_promise_any_empty_const_set_catch_call = Promise.any(unused_promise_empty_set_source)
    .catch((reason) => "dead_promise_any_empty_const_set_catch_callback");
const unused_promise_race_empty_const_set_finally_call = Promise.race(unused_promise_empty_set_source)
    .finally(() => "dead_promise_race_empty_const_set_finally_callback");
const unused_promise_all_empty_set_copy_then_call = Promise.all(unused_promise_empty_set_copy_source)
    .then((value) => "dead_promise_all_empty_set_copy_then_callback");
const unused_promise_all_settled_empty_set_copy_then_call = Promise.allSettled(unused_promise_empty_set_copy_source)
    .then((value) => "dead_promise_all_settled_empty_set_copy_then_callback");
const unused_promise_any_empty_set_copy_catch_call = Promise.any(unused_promise_empty_set_copy_source)
    .catch((reason) => "dead_promise_any_empty_set_copy_catch_callback");
const unused_promise_race_empty_set_copy_finally_call = Promise.race(unused_promise_empty_set_copy_source)
    .finally(() => "dead_promise_race_empty_set_copy_finally_callback");
const unused_promise_resolve_bigint_call = Promise.resolve(123456789n);
const unused_promise_resolve_signed_number_call = Promise.resolve(-123456.5);
const unused_promise_resolve_nan_call = Promise.resolve(NaN, "dead_promise_resolve_nan_ignored");
const unused_promise_resolve_infinity_call = Promise.resolve(-Infinity, "dead_promise_resolve_infinity_ignored");
const unused_promise_resolve_btoa_call = Promise.resolve(btoa("dead_promise_resolve_btoa_call"));
const unused_promise_resolve_atob_call = Promise.resolve(atob("ZGVhZF9wcm9taXNlX3Jlc29sdmVfYXRvYl9jYWxs"));
const unused_promise_resolve_btoa_length_read = Promise.resolve(btoa("dead_promise_resolve_btoa_length_read").length);
const unused_promise_resolve_atob_upper_call = Promise.resolve((atob("ZGVhZF9wcm9taXNlX3Jlc29sdmVfYXRvYl91cHBlcl9jYWxs").toUpperCase(), "dead_promise_resolve_atob_upper_call_marker"));
const unused_promise_resolve_btoa_index_read = Promise.resolve((btoa("dead_promise_resolve_btoa_index_read")[0], "dead_promise_resolve_btoa_index_read_marker"));
const unused_promise_resolve_string_constructor_call = Promise.resolve(String("dead_promise_resolve_string_constructor"));
const unused_promise_resolve_string_constructor_length_read = Promise.resolve(String("dead_promise_resolve_string_constructor_length_read").length);
const unused_promise_resolve_string_constructor_upper_call = Promise.resolve((String("dead_promise_resolve_string_constructor_upper_call").toUpperCase(), "dead_promise_resolve_string_constructor_upper_call_marker"));
const unused_promise_resolve_string_constructor_index_read = Promise.resolve((String("dead_promise_resolve_string_constructor_index_read")[0], "dead_promise_resolve_string_constructor_index_read_marker"));
const unused_promise_resolve_number_constructor_call = Promise.resolve(Number("dead_promise_resolve_number_constructor"));
const unused_promise_resolve_boolean_constructor_call = Promise.resolve(Boolean("dead_promise_resolve_boolean_constructor"));
const unused_promise_resolve_bigint_constructor_call = Promise.resolve(BigInt("456789123"));
const unused_promise_resolve_symbol_call = Promise.resolve(Symbol("dead_promise_resolve_symbol"));
const unused_promise_resolve_date_callable_call = Promise.resolve(Date("dead_promise_resolve_date_callable_ignored"));
const unused_promise_resolve_date_callable_length_read = Promise.resolve(Date("dead_promise_resolve_date_callable_length_ignored").length);
const unused_promise_resolve_date_callable_upper_call = Promise.resolve((Date("dead_promise_resolve_date_callable_upper_ignored").toUpperCase(), "dead_promise_resolve_date_callable_upper_call_marker"));
const unused_promise_resolve_date_callable_index_read = Promise.resolve((Date("dead_promise_resolve_date_callable_index_ignored")[0], "dead_promise_resolve_date_callable_index_read_marker"));
const unused_promise_resolve_date_now_call = Promise.resolve(Date.now("dead_promise_resolve_date_now_ignored"));
const unused_promise_resolve_date_parse_call = Promise.resolve(Date.parse("2099-01-02T03:04:05Z"));
const unused_promise_resolve_date_utc_call = Promise.resolve(Date.UTC(2099, 0, 2, 3, 4, 5, 6));
const unused_promise_resolve_url_to_string_call = Promise.resolve(new URL("https://dead-promise-resolve-url-to-string.test/path").toString("dead_promise_resolve_url_to_string_ignored"));
const unused_promise_resolve_url_to_json_call = Promise.resolve(new URL("https://dead-promise-resolve-url-to-json.test/path").toJSON("dead_promise_resolve_url_to_json_ignored"));
const unused_promise_resolve_url_has_own_call = Promise.resolve(new URL("https://dead-promise-resolve-url-has-own.test/path").hasOwnProperty("dead_promise_resolve_url_has_own", "dead_promise_resolve_url_has_own_ignored"));
const unused_promise_resolve_url_href_read = Promise.resolve(new URL("https://dead-promise-resolve-url-href-read.test/path").href);
const unused_promise_resolve_url_origin_read = Promise.resolve(new URL("https://dead-promise-resolve-url-origin-read.test/path").origin);
const unused_promise_resolve_url_href_length_read = Promise.resolve(new URL("https://dead-promise-resolve-url-href-length-read.test/path").href.length);
const unused_promise_resolve_url_pathname_upper_call = Promise.resolve((new URL("https://dead-promise-resolve-url-pathname-upper-call.test/path").pathname.toUpperCase(), "dead_promise_resolve_url_pathname_upper_call_marker"));
const unused_promise_resolve_url_host_index_read = Promise.resolve((new URL("https://dead-promise-resolve-url-host-index-read.test/path").host[0], "dead_promise_resolve_url_host_index_read_marker"));
const unused_promise_resolve_string_static_call = Promise.resolve(String.fromCharCode("dead_promise_resolve_string_static".length));
const unused_promise_resolve_string_code_point_call = Promise.resolve(String.fromCodePoint(0x1f680));
const unused_promise_resolve_regexp_escape_call = Promise.resolve(RegExp.escape("dead_promise_resolve_regexp_escape"));
const unused_promise_resolve_string_raw_tagged_template = Promise.resolve(String.raw`dead_promise_resolve_string_raw_tagged_template`);
const unused_promise_resolve_string_raw_length_read = Promise.resolve(String.raw`dead_promise_resolve_string_raw_length_${"dead_promise_resolve_string_raw_length_expr".length}`.length);
const unused_promise_resolve_string_raw_upper_call = Promise.resolve((String.raw`dead_promise_resolve_string_raw_upper_${"dead_promise_resolve_string_raw_upper_expr"}`.toUpperCase(), "dead_promise_resolve_string_raw_upper_call_marker"));
const unused_promise_resolve_string_raw_index_read = Promise.resolve((String.raw`dead_promise_resolve_string_raw_index_read`[0], "dead_promise_resolve_string_raw_index_read_marker"));
const unused_promise_resolve_json_stringify_call = Promise.resolve(JSON.stringify({ dead_promise_resolve_json_stringify_key: "dead_promise_resolve_json_stringify_value" }));
const unused_promise_resolve_json_stringify_length_read = Promise.resolve(JSON.stringify(["dead_promise_resolve_json_stringify_length_read", true]).length);
const unused_promise_resolve_json_stringify_upper_call = Promise.resolve((JSON.stringify("dead_promise_resolve_json_stringify_upper_call").toUpperCase(), "dead_promise_resolve_json_stringify_upper_call_marker"));
const unused_promise_resolve_json_stringify_index_read = Promise.resolve((JSON.stringify({ label: "dead_promise_resolve_json_stringify_index_read" })[0], "dead_promise_resolve_json_stringify_index_read_marker"));
const unused_promise_resolve_string_method_to_well_formed_call = Promise.resolve("dead_promise_resolve_string_method_to_well_formed".toWellFormed());
const unused_promise_resolve_string_method_to_well_formed_length_read = Promise.resolve("dead_promise_resolve_string_method_to_well_formed_length_read".toWellFormed().length);
const unused_promise_resolve_string_method_trim_upper_call = Promise.resolve((" dead_promise_resolve_string_method_trim_upper_call ".trim().toUpperCase(), "dead_promise_resolve_string_method_trim_upper_call_marker"));
const unused_promise_resolve_string_method_normalize_index_read = Promise.resolve(("dead_promise_resolve_string_method_normalize_index_read".normalize()[0], "dead_promise_resolve_string_method_normalize_index_read_marker"));
const unused_promise_resolve_string_static_length_read = Promise.resolve(String.fromCharCode("dead_promise_resolve_string_static_length_read".length).length);
const unused_promise_resolve_string_code_point_upper_call = Promise.resolve((String.fromCodePoint(0x41, 0x42).toUpperCase(), "dead_promise_resolve_string_code_point_upper_call_marker"));
const unused_promise_resolve_regexp_escape_index_read = Promise.resolve((RegExp.escape("dead_promise_resolve_regexp_escape_index_read")[0], "dead_promise_resolve_regexp_escape_index_read_marker"));
const unused_promise_resolve_array_is_array_call = Promise.resolve(Array.isArray(["dead_promise_resolve_array_is_array"]));
const unused_promise_resolve_object_is_call = Promise.resolve(Object.is("dead_promise_resolve_object_is", "dead_promise_resolve_object_is"));
const unused_promise_resolve_map_size_call = Promise.resolve(new Map([["dead_promise_resolve_map_size_key", "dead_promise_resolve_map_size_value"]]).size);
const unused_promise_resolve_set_size_call = Promise.resolve(new Set(["dead_promise_resolve_set_size"]).size);
const unused_promise_resolve_map_object_to_string_call = Promise.resolve(new Map([["dead_promise_resolve_map_object_to_string_key", "dead_promise_resolve_map_object_to_string_value"]]).toString("dead_promise_resolve_map_object_to_string_ignored"));
const unused_promise_resolve_set_object_has_own_call = Promise.resolve(new Set(["dead_promise_resolve_set_object_has_own"]).hasOwnProperty("dead_promise_resolve_set_object_has_own", "dead_promise_resolve_set_object_has_own_ignored"));
const unused_promise_resolve_weak_ref_object_to_locale_string_call = Promise.resolve(new WeakRef<object>({ label: "dead_promise_resolve_weak_ref_object_to_locale_string_target" }).toLocaleString("dead_promise_resolve_weak_ref_object_to_locale_string_ignored"));
const unused_promise_resolve_map_object_to_string_length_read = Promise.resolve(new Map([["dead_promise_resolve_map_object_to_string_length_key", "dead_promise_resolve_map_object_to_string_length_value"]]).toString().length + "dead_promise_resolve_map_object_to_string_length_read".length);
const unused_promise_resolve_weak_map_object_to_locale_upper_call = Promise.resolve((new WeakMap<object, string>().toLocaleString().toUpperCase(), "dead_promise_resolve_weak_map_object_to_locale_upper_call_marker"));
const unused_promise_resolve_finregistry_object_to_string_index_read = Promise.resolve((new FinalizationRegistry<string>((held) => {
    "dead_promise_resolve_finregistry_object_to_string_index_callback";
}).toString()[0], "dead_promise_resolve_finregistry_object_to_string_index_read_marker"));
const unused_promise_resolve_object_has_own_call = Promise.resolve(Object.hasOwn({ dead_promise_resolve_object_has_own: 1 }, "dead_promise_resolve_object_has_own"));
const unused_promise_resolve_object_symbols_length = Promise.resolve(Object.getOwnPropertySymbols({ dead_promise_resolve_object_symbols: 1 }).length);
const unused_promise_resolve_object_symbols_element = Promise.resolve(Object.getOwnPropertySymbols({ dead_promise_resolve_object_symbols_element: 1 })[0]);
const unused_promise_resolve_object_symbols_at = Promise.resolve(Object.getOwnPropertySymbols({ dead_promise_resolve_object_symbols_at: 1 }).at(0));
const unused_promise_resolve_object_symbols_join = Promise.resolve(Object.getOwnPropertySymbols({ dead_promise_resolve_object_symbols_join: 1 }).join("dead_promise_resolve_object_symbols_join_separator"));
const unused_promise_resolve_object_symbols_to_string = Promise.resolve(Object.getOwnPropertySymbols({ dead_promise_resolve_object_symbols_to_string: 1 }).toString());
const unused_promise_resolve_array_of_at_call = Promise.resolve(Array.of("dead_promise_resolve_array_of_at").at(0));
const unused_promise_resolve_array_of_negative_at_call = Promise.resolve(Array.of("dead_promise_resolve_array_of_negative_at_head", "dead_promise_resolve_array_of_negative_at").at(-1));
const unused_array_from_object_symbols_set_empty_map_call = Array.from(new Set(Object.getOwnPropertySymbols({ dead_array_from_object_symbols_set_empty_map: 1 }))).map(() => "dead_array_from_object_symbols_set_empty_map_callback");
const unused_promise_resolve_empty_array_some_call = Promise.resolve([].some(() => "dead_promise_resolve_empty_array_some".length > 0));
const unused_promise_resolve_object_symbols_every_call = Promise.resolve(Object.getOwnPropertySymbols({ dead_promise_resolve_object_symbols_every: 1 }).every(() => "dead_promise_resolve_object_symbols_every_callback".length > 0));
const unused_promise_resolve_object_symbols_find_call = Promise.resolve(Object.getOwnPropertySymbols({ dead_promise_resolve_object_symbols_find: 1 }).find(() => "dead_promise_resolve_object_symbols_find_callback".length > 0));
const unused_promise_resolve_object_symbols_find_index_call = Promise.resolve(Object.getOwnPropertySymbols({ dead_promise_resolve_object_symbols_find_index: 1 }).findIndex(() => "dead_promise_resolve_object_symbols_find_index_callback".length > 0));
const unused_promise_resolve_empty_array_reduce_call = Promise.resolve([].reduce((acc: string) => acc + "dead_promise_resolve_empty_array_reduce_callback", "dead_promise_resolve_empty_array_reduce_initial"));
const unused_promise_resolve_object_symbols_reduce_right_call = Promise.resolve(Object.getOwnPropertySymbols({ dead_promise_resolve_object_symbols_reduce_right: 1 }).reduceRight((acc: string) => acc + "dead_promise_resolve_object_symbols_reduce_right_callback", "dead_promise_resolve_object_symbols_reduce_right_initial"));
const unused_promise_resolve_object_symbols_slice_length = Promise.resolve(Object.getOwnPropertySymbols({ dead_promise_resolve_object_symbols_slice_length: 1 }).slice().length);
const unused_promise_resolve_object_symbols_to_reversed_length = Promise.resolve(Object.getOwnPropertySymbols({ dead_promise_resolve_object_symbols_to_reversed_length: 1 }).toReversed().length);
const unused_promise_resolve_object_symbols_keys_length = Promise.resolve(Object.getOwnPropertySymbols({ dead_promise_resolve_object_symbols_keys_length: 1 }).keys().length);
const unused_promise_resolve_object_symbols_slice_element = Promise.resolve(Object.getOwnPropertySymbols({ dead_promise_resolve_object_symbols_slice_element: 1 }).slice()[0]);
const unused_promise_resolve_object_symbols_keys_element = Promise.resolve(Object.getOwnPropertySymbols({ dead_promise_resolve_object_symbols_keys_element: 1 }).keys()[0]);
const unused_promise_resolve_object_symbols_concat_length = Promise.resolve(Object.getOwnPropertySymbols({ dead_promise_resolve_object_symbols_concat_length: 1 }).concat().length);
const unused_promise_resolve_object_symbols_flat_length = Promise.resolve(Object.getOwnPropertySymbols({ dead_promise_resolve_object_symbols_flat_length: 1 }).flat(0).length);
const unused_promise_resolve_object_symbols_concat_element = Promise.resolve(Object.getOwnPropertySymbols({ dead_promise_resolve_object_symbols_concat_element: 1 }).concat()[0]);
const unused_promise_resolve_object_symbols_to_spliced_length = Promise.resolve(Object.getOwnPropertySymbols({ dead_promise_resolve_object_symbols_to_spliced_length: 1 }).toSpliced(0, 0).length);
const unused_promise_resolve_object_symbols_copy_within_length = Promise.resolve(Object.getOwnPropertySymbols({ dead_promise_resolve_object_symbols_copy_within_length: 1 }).copyWithin(0, 0).length);
const unused_promise_resolve_object_symbols_fill_length = Promise.resolve(Object.getOwnPropertySymbols({ dead_promise_resolve_object_symbols_fill_length: 1 }).fill(Symbol("dead_promise_resolve_object_symbols_fill_value")).length);
const unused_promise_resolve_object_symbols_to_spliced_insert_length = Promise.resolve(Object.getOwnPropertySymbols({ dead_promise_resolve_object_symbols_to_spliced_insert_length: 1 }).toSpliced(0, 0, Symbol("dead_promise_resolve_object_symbols_to_spliced_insert_value")).length);
const unused_promise_resolve_object_symbols_to_spliced_insert_element = Promise.resolve(Object.getOwnPropertySymbols({ dead_promise_resolve_object_symbols_to_spliced_insert_element: 1 }).toSpliced(0, 0, Symbol("dead_promise_resolve_object_symbols_to_spliced_insert_element_value"))[0]);
const unused_promise_resolve_object_symbols_reverse_length = Promise.resolve(Object.getOwnPropertySymbols({ dead_promise_resolve_object_symbols_reverse_length: 1 }).reverse().length);
const unused_promise_resolve_object_symbols_sort_length = Promise.resolve(Object.getOwnPropertySymbols({ dead_promise_resolve_object_symbols_sort_length: 1 }).sort().length);
const unused_promise_resolve_object_symbols_to_sorted_length = Promise.resolve(Object.getOwnPropertySymbols({ dead_promise_resolve_object_symbols_to_sorted_length: 1 }).toSorted().length);
const unused_promise_resolve_object_symbols_reverse_element = Promise.resolve(Object.getOwnPropertySymbols({ dead_promise_resolve_object_symbols_reverse_element: 1 }).reverse()[0]);
const unused_promise_resolve_object_symbols_sort_element = Promise.resolve(Object.getOwnPropertySymbols({ dead_promise_resolve_object_symbols_sort_element: 1 }).sort()[0]);
const unused_promise_resolve_object_symbols_to_sorted_element = Promise.resolve(Object.getOwnPropertySymbols({ dead_promise_resolve_object_symbols_to_sorted_element: 1 }).toSorted()[0]);
const unused_promise_resolve_object_symbols_map_length = Promise.resolve(Object.getOwnPropertySymbols({ dead_promise_resolve_object_symbols_map_length: 1 }).map(() => "dead_promise_resolve_object_symbols_map_length_callback").length);
const unused_promise_resolve_object_symbols_filter_length = Promise.resolve(Object.getOwnPropertySymbols({ dead_promise_resolve_object_symbols_filter_length: 1 }).filter(() => "dead_promise_resolve_object_symbols_filter_length_callback".length > 0).length);
const unused_promise_resolve_object_symbols_flat_map_length = Promise.resolve(Object.getOwnPropertySymbols({ dead_promise_resolve_object_symbols_flat_map_length: 1 }).flatMap(() => ["dead_promise_resolve_object_symbols_flat_map_length_callback"]).length);
const unused_promise_resolve_object_symbols_map_element = Promise.resolve(Object.getOwnPropertySymbols({ dead_promise_resolve_object_symbols_map_element: 1 }).map(() => "dead_promise_resolve_object_symbols_map_element_callback")[0]);
const unused_promise_resolve_object_symbols_filter_element = Promise.resolve(Object.getOwnPropertySymbols({ dead_promise_resolve_object_symbols_filter_element: 1 }).filter(() => "dead_promise_resolve_object_symbols_filter_element_callback".length > 0)[0]);
const unused_promise_resolve_object_symbols_flat_map_element = Promise.resolve(Object.getOwnPropertySymbols({ dead_promise_resolve_object_symbols_flat_map_element: 1 }).flatMap(() => ["dead_promise_resolve_object_symbols_flat_map_element_callback"])[0]);
const unused_promise_resolve_object_symbols_slice_from_length = Promise.resolve(Object.getOwnPropertySymbols({ dead_promise_resolve_object_symbols_slice_from_length: 1 }).slice(1).length);
const unused_promise_resolve_object_symbols_slice_range_element = Promise.resolve(Object.getOwnPropertySymbols({ dead_promise_resolve_object_symbols_slice_range_element: 1 }).slice(1, 2)[0]);
const unused_promise_resolve_object_symbols_pop_call = Promise.resolve(Object.getOwnPropertySymbols({ dead_promise_resolve_object_symbols_pop: 1 }).pop());
const unused_promise_resolve_object_symbols_shift_call = Promise.resolve(Object.getOwnPropertySymbols({ dead_promise_resolve_object_symbols_shift: 1 }).shift());
const unused_promise_resolve_object_symbols_push_call = Promise.resolve(Object.getOwnPropertySymbols({ dead_promise_resolve_object_symbols_push: 1 }).push(Symbol("dead_promise_resolve_object_symbols_push_value")));
const unused_promise_resolve_object_symbols_unshift_call = Promise.resolve(Object.getOwnPropertySymbols({ dead_promise_resolve_object_symbols_unshift: 1 }).unshift(Symbol("dead_promise_resolve_object_symbols_unshift_value")));
const unused_promise_resolve_object_extensible_call = Promise.resolve(Object.isExtensible({ dead_promise_resolve_object_extensible: 1 }));
const unused_promise_resolve_object_sealed_call = Promise.resolve(Object.isSealed({ dead_promise_resolve_object_sealed: 1 }));
const unused_promise_resolve_object_frozen_call = Promise.resolve(Object.isFrozen({ dead_promise_resolve_object_frozen: 1 }));
const unused_promise_resolve_url_can_parse_call = Promise.resolve(URL.canParse("https://dead-promise-resolve-url-can-parse.test/"));
const unused_promise_resolve_reflect_has_call = Promise.resolve(Reflect.has({ dead_promise_resolve_reflect_has: 1 }, "dead_promise_resolve_reflect_has"));
const unused_promise_resolve_reflect_extensible_call = Promise.resolve(Reflect.isExtensible({ dead_promise_resolve_reflect_extensible: 1 }));
const unused_promise_resolve_math_constant_read = Promise.resolve(Math.LOG2E + "dead_promise_resolve_math_constant_read".length);
const unused_promise_resolve_number_constant_read = Promise.resolve(Number.MAX_SAFE_INTEGER + "dead_promise_resolve_number_constant_read".length);
const unused_promise_resolve_symbol_iterator_read = Promise.resolve(Symbol.iterator);
const unused_promise_resolve_well_known_symbol_description_read = Promise.resolve((Symbol.iterator.description, "dead_promise_resolve_well_known_symbol_description_read".length));
const unused_promise_resolve_process_platform_read = Promise.resolve(process.platform);
const unused_promise_resolve_process_ppid_read = Promise.resolve((process.ppid, "dead_promise_resolve_process_ppid_read".length));
const unused_promise_resolve_process_versions_openssl_read = Promise.resolve(process.versions.openssl);
const unused_promise_resolve_process_release_headers_read = Promise.resolve(process.release.headersUrl);
const unused_promise_resolve_process_features_cached_read = Promise.resolve(process.features.cached_builtins);
const unused_promise_resolve_process_platform_length_read = Promise.resolve(process.platform.length);
const unused_promise_resolve_process_version_upper_call = Promise.resolve((process.version.toUpperCase(), "dead_promise_resolve_process_version_upper_call"));
const unused_promise_resolve_process_versions_node_index_read = Promise.resolve((process.versions.node[0], "dead_promise_resolve_process_versions_node_index_read"));
const unused_promise_resolve_process_release_name_includes_call = Promise.resolve((process.release.name.includes("node"), "dead_promise_resolve_process_release_name_includes_call"));
const unused_promise_resolve_process_cwd_upper_call = Promise.resolve(process.cwd("dead_promise_resolve_process_cwd_upper_ignored".length).toUpperCase());
const unused_promise_resolve_process_stderr_tty_read = Promise.resolve(process.stderr.isTTY);
const unused_promise_resolve_process_stdin_readable_read = Promise.resolve((process.stdin.readable, "dead_promise_resolve_process_stdin_readable_read".length));
const unused_promise_resolve_process_stdout_readable_read = Promise.resolve(((process.stdout as any).readable, "dead_promise_resolve_process_stdout_readable_read".length));
const unused_promise_resolve_process_stderr_readable_read = Promise.resolve(((process.stderr as any).readable, "dead_promise_resolve_process_stderr_readable_read".length));
const unused_promise_resolve_process_stdin_is_paused_call = Promise.resolve(process.stdin.isPaused("dead_promise_resolve_process_stdin_is_paused_call".length));
const unused_promise_resolve_process_stdin_pause_call = Promise.resolve(process.stdin.pause("dead_promise_resolve_process_stdin_pause_call".length));
const unused_promise_resolve_process_stdin_resume_call = Promise.resolve(process.stdin.resume("dead_promise_resolve_process_stdin_resume_call".length));
const unused_promise_resolve_process_stdout_cork_call = Promise.resolve(process.stdout.cork("dead_promise_resolve_process_stdout_cork_call".length));
const unused_promise_resolve_process_stderr_uncork_call = Promise.resolve(process.stderr.uncork("dead_promise_resolve_process_stderr_uncork_call".length));
const unused_promise_resolve_stream_named_readable_stdin_call = Promise.resolve(isReadable(process.stdin, "dead_promise_resolve_stream_named_readable_stdin_call".length));
const unused_promise_resolve_stream_named_alias_readable_stdin_call = Promise.resolve(streamReadableAlias(process.stdin, "dead_promise_resolve_stream_named_alias_readable_stdin_call".length));
const unused_promise_resolve_stream_namespace_writable_stdout_call = Promise.resolve(nodeStream.isWritable(process.stdout, "dead_promise_resolve_stream_namespace_writable_stdout_call".length));
const unused_promise_resolve_stream_default_destroyed_plain_call = Promise.resolve(streamDefault.isDestroyed({ dead_promise_resolve_stream_default_destroyed_plain_call: true }, "dead_promise_resolve_stream_default_destroyed_plain_ignored".length));
const unused_promise_resolve_stream_named_alias_destroyed_plain_call = Promise.resolve(streamDestroyedAlias({ dead_promise_resolve_stream_named_alias_destroyed_plain_call: true }, "dead_promise_resolve_stream_named_alias_destroyed_plain_ignored".length));
const unused_promise_resolve_stream_namespace_disturbed_null_call = Promise.resolve(nodeStream.isDisturbed(null, "dead_promise_resolve_stream_namespace_disturbed_null_call".length));
const unused_promise_resolve_process_cwd_call = Promise.resolve(process.cwd("dead_promise_resolve_process_cwd_ignored".length));
const unused_promise_resolve_process_uptime_call = Promise.resolve(process.uptime("dead_promise_resolve_process_uptime_ignored".length));
const unused_promise_resolve_process_cpu_system_read = Promise.resolve(process.cpuUsage().system + "dead_promise_resolve_process_cpu_system_read".length);
const unused_promise_resolve_process_memory_heap_read = Promise.resolve(process.memoryUsage("dead_promise_resolve_process_memory_heap_ignored".length).heapUsed);
const unused_promise_resolve_process_resource_rss_read = Promise.resolve(process.resourceUsage("dead_promise_resolve_process_resource_rss_ignored".length).maxRSS);
const unused_promise_resolve_filename_read = Promise.resolve(__filename);
const unused_promise_resolve_module_id_read = Promise.resolve((module.id, "dead_promise_resolve_module_id_read".length));
const unused_promise_resolve_dirname_upper_call = Promise.resolve((__dirname.toUpperCase(), "dead_promise_resolve_dirname_upper_call"));
const unused_promise_resolve_module_filename_length_read = Promise.resolve(module.filename.length + "dead_promise_resolve_module_filename_length_read".length);
const unused_promise_resolve_module_id_index_read = Promise.resolve((module.id[0], "dead_promise_resolve_module_id_index_read"));
const unused_promise_resolve_module_path_includes_call = Promise.resolve((module.path.includes("node_modules"), "dead_promise_resolve_module_path_includes_call"));
const unused_promise_resolve_fs_constant_read = Promise.resolve(nodeFs.constants.R_OK + "dead_promise_resolve_fs_constant_read".length);
const unused_promise_resolve_path_constant_read = Promise.resolve(pathSep.length + "dead_promise_resolve_path_constant_read".length);
const unused_promise_resolve_os_constant_read = Promise.resolve(osEOL.length + "dead_promise_resolve_os_constant_read".length);
const unused_promise_resolve_path_constant_upper_call = Promise.resolve((nodePath.sep.toUpperCase(), "dead_promise_resolve_path_constant_upper_call"));
const unused_promise_resolve_path_named_constant_index_read = Promise.resolve((pathDelimiter[0], "dead_promise_resolve_path_named_constant_index_read"));
const unused_promise_resolve_os_constant_index_read = Promise.resolve((nodeOs.EOL[0], "dead_promise_resolve_os_constant_index_read"));
const unused_promise_resolve_os_named_constant_upper_call = Promise.resolve((osDevNull.toUpperCase(), "dead_promise_resolve_os_named_constant_upper_call"));
const unused_promise_resolve_dns_constant_read = Promise.resolve(nodeDns.V4MAPPED + "dead_promise_resolve_dns_constant_read".length);
const unused_promise_resolve_dns_named_constant_read = Promise.resolve(ADDRCONFIG + "dead_promise_resolve_dns_named_constant_read".length);
const unused_promise_resolve_dns_alias_constant_read = Promise.resolve(dnsV4Mapped + "dead_promise_resolve_dns_alias_constant_read".length);
const unused_promise_resolve_event_default_read = Promise.resolve(nodeEvents.EventEmitter.defaultMaxListeners + "dead_promise_resolve_event_default_read".length);
const unused_promise_resolve_event_named_default_read = Promise.resolve(defaultMaxListeners + "dead_promise_resolve_event_named_default_read".length);
const unused_promise_resolve_event_alias_default_read = Promise.resolve(ImportedEventEmitter.defaultMaxListeners + "dead_promise_resolve_event_alias_default_read".length);
const unused_promise_resolve_event_type_read = Promise.resolve(new Event("dead_promise_resolve_event_type_read").type);
const unused_promise_resolve_event_type_length_read = Promise.resolve(new Event("dead_promise_resolve_event_type_length_read").type.length);
const unused_promise_resolve_event_type_upper_call = Promise.resolve((new Event("dead_promise_resolve_event_type_upper_call").type.toUpperCase(), "dead_promise_resolve_event_type_upper_call_marker"));
const unused_promise_resolve_event_type_index_read = Promise.resolve((new Event("dead_promise_resolve_event_type_index_read").type[0], "dead_promise_resolve_event_type_index_read_marker"));
const unused_promise_resolve_event_cancelable_read = Promise.resolve(new Event("dead_promise_resolve_event_cancelable_read", { cancelable: true }).cancelable);
const unused_promise_resolve_event_default_prevented_read = Promise.resolve(new Event("dead_promise_resolve_event_default_prevented_read").defaultPrevented);
const unused_promise_resolve_event_emitter_get_max_call = Promise.resolve(new EventEmitter().getMaxListeners("dead_promise_resolve_event_emitter_get_max_ignored".length));
const unused_promise_resolve_imported_event_emitter_listener_count_call = Promise.resolve(new ImportedEventEmitter().listenerCount("dead_promise_resolve_imported_event_emitter_listener_count"));
const unused_promise_resolve_event_emitter_to_string_call = Promise.resolve(new EventEmitter().toString("dead_promise_resolve_event_emitter_to_string_ignored".length));
const unused_promise_resolve_event_static_listener_count_call = Promise.resolve(EventEmitter.listenerCount(new EventEmitter(), "dead_promise_resolve_event_static_listener_count"));
const unused_promise_resolve_events_namespace_get_max_call = Promise.resolve(nodeEvents.getMaxListeners(new EventEmitter(), "dead_promise_resolve_events_namespace_get_max_ignored".length));
const unused_promise_resolve_events_named_get_max_call = Promise.resolve(getMaxListeners(new EventEmitter(), "dead_promise_resolve_events_named_get_max_ignored".length));
const unused_promise_resolve_events_namespace_set_max_call = Promise.resolve(nodeEvents.setMaxListeners(12, new EventEmitter()));
const unused_promise_resolve_events_named_set_max_call = Promise.resolve(setMaxListeners(13, new EventEmitter()));
const unused_promise_resolve_event_emitter_emit_call = Promise.resolve(new EventEmitter().emit("dead_promise_resolve_event_emitter_emit", "dead_promise_resolve_event_emitter_emit_payload"));
const unused_promise_resolve_event_prevent_default_call = Promise.resolve(new Event("dead_promise_resolve_event_prevent_default_call", { cancelable: true }).preventDefault("dead_promise_resolve_event_prevent_default_ignored".length));
const unused_promise_resolve_event_to_string_call = Promise.resolve(new Event("dead_promise_resolve_event_to_string_call").toString("dead_promise_resolve_event_to_string_ignored".length));
const unused_promise_resolve_event_target_dispatch_call = Promise.resolve(new EventTarget().dispatchEvent(new Event("dead_promise_resolve_event_target_dispatch_call")));
const unused_promise_resolve_event_target_to_string_call = Promise.resolve(new EventTarget().toString("dead_promise_resolve_event_target_to_string_ignored".length));
const unused_promise_resolve_event_to_string_length_read = Promise.resolve(new Event("dead_promise_resolve_event_to_string_length_read").toString().length);
const unused_promise_resolve_event_target_to_locale_upper_call = Promise.resolve((new EventTarget().toLocaleString().toUpperCase(), "dead_promise_resolve_event_target_to_locale_upper_call_marker"));
const unused_promise_resolve_event_emitter_to_string_index_read = Promise.resolve((new EventEmitter().toString()[0], "dead_promise_resolve_event_emitter_to_string_index_read_marker"));
const unused_promise_resolve_event_target_add_call = Promise.resolve(new EventTarget().addEventListener("dead_promise_resolve_event_target_add", () => undefined, { once: true }));
const unused_promise_resolve_event_target_remove_call = Promise.resolve(new EventTarget().removeEventListener("dead_promise_resolve_event_target_remove", () => undefined, false));
const unused_promise_resolve_crypto_hash_digest_call = Promise.resolve(crypto.createHash("sha256").update("dead_promise_resolve_crypto_hash_digest").digest("hex"));
const unused_promise_resolve_crypto_hash_digest_length_read = Promise.resolve(crypto.createHash("sha256").update("dead_promise_resolve_crypto_hash_digest_length_read").digest("hex").length);
const unused_promise_resolve_crypto_hash_digest_upper_call = Promise.resolve((createHash("sha1").update("dead_promise_resolve_crypto_hash_digest_upper_call").digest("base64").toUpperCase(), "dead_promise_resolve_crypto_hash_digest_upper_call_marker"));
const unused_promise_resolve_crypto_hash_digest_index_read = Promise.resolve((nodeCrypto.createHash("sha512").update("dead_promise_resolve_crypto_hash_digest_index_read").digest("hex")[0], "dead_promise_resolve_crypto_hash_digest_index_read_marker"));
const unused_promise_resolve_crypto_named_hash_digest_call = Promise.resolve(createHash("sha1").update(Buffer.from("dead_promise_resolve_crypto_named_hash_digest")).digest("base64"));
const unused_promise_resolve_crypto_namespace_hash_digest_call = Promise.resolve(nodeCrypto.createHash("sha512").update("dead_promise_resolve_crypto_namespace_hash_digest").digest("hex"));
const unused_promise_resolve_os_platform_call = Promise.resolve(nodeOs.platform("dead_promise_resolve_os_platform_ignored".length));
const unused_promise_resolve_os_named_call = Promise.resolve(availableParallelism("dead_promise_resolve_os_named_ignored".length));
const unused_promise_resolve_os_user_info_homedir_read = Promise.resolve(nodeOs.userInfo({ encoding: unused_utf8_dash }).homedir);
const unused_promise_resolve_os_named_user_info_gid_read = Promise.resolve(osUserInfo({ encoding: undefined }).gid + "dead_promise_resolve_os_named_user_info_gid_read".length);
const unused_promise_resolve_os_user_info_username_length_read = Promise.resolve(nodeOs.userInfo().username.length);
const unused_promise_resolve_os_named_user_info_shell_upper_call = Promise.resolve(osUserInfo({ encoding: unused_utf8 }).shell.toUpperCase());
const unused_promise_resolve_os_global_user_info_homedir_index_read = Promise.resolve(os.userInfo().homedir[0]);
const unused_promise_resolve_path_absolute_call = Promise.resolve(nodePath.isAbsolute("dead_promise_resolve_path_absolute_ignored"));
const unused_promise_resolve_path_named_absolute_call = Promise.resolve(pathIsAbsolute("/dead_promise_resolve_path_named_absolute_ignored"));
const unused_promise_resolve_path_posix_basename_call = Promise.resolve(nodePath.posix.basename("dead_promise_resolve_path_posix_basename_ignored.txt", ".txt"));
const unused_promise_resolve_path_named_posix_relative_call = Promise.resolve(pathPosix.relative("dead_promise_resolve_path_named_posix_relative_from", "dead_promise_resolve_path_named_posix_relative_to"));
const unused_promise_resolve_path_format_call = Promise.resolve(path.format({ dir: "/dead_promise_resolve_path_format_dir", name: "dead_promise_resolve_path_format_name", ext: ".txt" }));
const unused_promise_resolve_path_posix_format_call = Promise.resolve(nodePath.posix.format({ root: "/", base: "dead_promise_resolve_path_posix_format_base.txt" }));
const unused_promise_resolve_path_parse_base_read = Promise.resolve(nodePath.parse("dead_promise_resolve_path_parse_base_read.txt").base);
const unused_promise_resolve_path_named_parse_ext_read = Promise.resolve(pathParse("dead_promise_resolve_path_named_parse_ext_read.txt").ext);
const unused_promise_resolve_path_posix_parse_name_read = Promise.resolve(pathPosix.parse("/tmp/dead_promise_resolve_path_posix_parse_name_read.txt").name);
const unused_promise_resolve_path_parse_base_length_read = Promise.resolve(nodePath.parse("dead_promise_resolve_path_parse_base_length_read.txt").base.length);
const unused_promise_resolve_path_parse_base_upper_call = Promise.resolve(nodePath.parse("dead_promise_resolve_path_parse_base_upper_call.txt").base.toUpperCase());
const unused_promise_resolve_path_named_parse_ext_starts_call = Promise.resolve(pathParse("dead_promise_resolve_path_named_parse_ext_starts_call.txt").ext.startsWith("."));
const unused_promise_resolve_path_posix_parse_name_index_read = Promise.resolve(pathPosix.parse("/tmp/dead_promise_resolve_path_posix_parse_name_index_read.txt").name[0]);
const unused_promise_resolve_path_format_length_read = Promise.resolve(pathFormat({ dir: "/dead_promise_resolve_path_format_length_dir", name: "dead_promise_resolve_path_format_length_name", ext: ".txt" }).length);
const unused_promise_resolve_path_basename_upper_call = Promise.resolve(nodePath.basename("dead_promise_resolve_path_basename_upper_call.txt", ".txt").toUpperCase());
const unused_promise_resolve_path_posix_dirname_index_read = Promise.resolve(pathPosix.dirname("/tmp/dead_promise_resolve_path_posix_dirname_index_read/file.txt")[0]);
const unused_promise_resolve_net_is_ipv6_call = Promise.resolve(nodeNet.isIPv6("dead_promise_resolve_net_is_ipv6_ignored"));
const unused_promise_resolve_net_named_is_ipv6_call = Promise.resolve(netIsIPv6("dead_promise_resolve_net_named_is_ipv6_ignored"));
const unused_promise_resolve_buffer_byte_length_call = Promise.resolve(Buffer.byteLength("dead_promise_resolve_buffer_byte_length_ignored", unused_utf8_dash));
const unused_promise_resolve_buffer_is_encoding_call = Promise.resolve(Buffer.isEncoding("dead_promise_resolve_buffer_is_encoding_ignored"));
const unused_promise_resolve_buffer_to_string_call = Promise.resolve(Buffer.from("dead_promise_resolve_buffer_to_string_ignored").toString());
const unused_promise_resolve_buffer_to_string_default_alias_call = Promise.resolve(Buffer.from("dead_promise_resolve_buffer_to_string_default_alias").toString(unused_default_option));
const unused_promise_resolve_buffer_to_string_length_read = Promise.resolve(Buffer.from("dead_promise_resolve_buffer_to_string_length_read").toString().length);
const unused_promise_resolve_buffer_to_string_upper_call = Promise.resolve((Buffer.from("dead_promise_resolve_buffer_to_string_upper_call").toString(unused_utf8).toUpperCase(), "dead_promise_resolve_buffer_to_string_upper_call_marker"));
const unused_promise_resolve_buffer_to_locale_string_index_read = Promise.resolve((Buffer.from("dead_promise_resolve_buffer_to_locale_string_index_read").toLocaleString()[0], "dead_promise_resolve_buffer_to_locale_string_index_read_marker"));
const unused_promise_resolve_string_method_call = Promise.resolve("dead_promise_resolve_string_method".toUpperCase());
const unused_promise_resolve_string_search_call = Promise.resolve("dead_promise_resolve_string_search".search("resolve"));
const unused_promise_resolve_regexp_test_call = Promise.resolve(/dead_promise_resolve_regexp_test/.test("dead_promise_resolve_regexp_test"));
const unused_promise_resolve_regexp_string_call = Promise.resolve(/dead_promise_resolve_regexp_string/.toString());
const unused_promise_resolve_array_includes_call = Promise.resolve(["dead_promise_resolve_array_includes"].includes("missing"));
const unused_promise_resolve_array_index_call = Promise.resolve(["dead_promise_resolve_array_index"].indexOf("missing"));
const unused_promise_resolve_array_join_call = Promise.resolve(["dead_promise_resolve_array_join"].join(","));
const unused_promise_resolve_array_string_call = Promise.resolve(["dead_promise_resolve_array_string"].toString());
const unused_promise_resolve_array_join_length_read = Promise.resolve(["dead_promise_resolve_array_join_length_read"].join(",").length);
const unused_promise_resolve_array_to_string_upper_call = Promise.resolve((["dead_promise_resolve_array_to_string_upper_call"].toString().toUpperCase(), "dead_promise_resolve_array_to_string_upper_call_marker"));
const unused_promise_resolve_array_to_locale_index_read = Promise.resolve((["dead_promise_resolve_array_to_locale_index_read"].toLocaleString()[0], "dead_promise_resolve_array_to_locale_index_read_marker"));
const unused_promise_resolve_string_length_call = Promise.resolve("dead_promise_resolve_string_length".length);
const unused_promise_resolve_array_length_call = Promise.resolve(["dead_promise_resolve_array_length"].length);
const unused_promise_resolve_string_element_call = Promise.resolve("dead_promise_resolve_string_element"[0]);
const unused_promise_resolve_template_call = Promise.resolve(`dead_promise_resolve_template_${"value"}`);
const unused_promise_resolve_conditional_call = Promise.resolve(true ? "dead_promise_resolve_conditional_true" : "dead_promise_resolve_conditional_false");
const unused_promise_resolve_logical_source: string = String("dead_promise_resolve_logical_left");
const unused_promise_resolve_nullish_source: string | undefined = String("dead_promise_resolve_nullish_left");
const unused_promise_resolve_logical_call = Promise.resolve(unused_promise_resolve_logical_source && "dead_promise_resolve_logical_right");
const unused_promise_resolve_nullish_call = Promise.resolve(unused_promise_resolve_nullish_source ?? "dead_promise_resolve_nullish_right");
const unused_promise_resolve_comma_call = Promise.resolve((String("dead_promise_resolve_comma_left"), "dead_promise_resolve_comma_right"));
const unused_promise_resolve_arithmetic_call = Promise.resolve("dead_promise_resolve_arithmetic".length + 3);
const unused_promise_resolve_comparison_call = Promise.resolve("dead_promise_resolve_comparison".length > 2);
const unused_promise_resolve_equality_call = Promise.resolve(String("dead_promise_resolve_equality") === "missing");
const unused_promise_resolve_in_call = Promise.resolve("dead_promise_resolve_in_key" in { dead_promise_resolve_in_key: true });
const unused_promise_resolve_delete_call = Promise.resolve(delete ({ dead_promise_resolve_delete_key: true } as { dead_promise_resolve_delete_key?: boolean }).dead_promise_resolve_delete_key);
const unused_promise_resolve_void_call = Promise.resolve(void String("dead_promise_resolve_void"));
const unused_promise_resolve_typeof_call = Promise.resolve(typeof String("dead_promise_resolve_typeof"));
const unused_promise_resolve_prefix_call = Promise.resolve(!"dead_promise_resolve_prefix_bang".length);
const unused_promise_resolve_bitwise_not_call = Promise.resolve(~"dead_promise_resolve_prefix_tilde".length);
const unused_promise_reject_literal_call = Promise.reject("dead_promise_reject_literal");
const unused_promise_reject_string_call = Promise.reject(String("dead_promise_reject_string"));
const unused_promise_reject_void_call = Promise.reject(void String("dead_promise_reject_void"));
const unused_promise_try_literal_call = Promise.try(() => "dead_promise_try_literal");
const unused_promise_try_function_call = Promise.try(function () {
    return String("dead_promise_try_function");
});
const unused_promise_try_empty_call = Promise.try(() => {
});
const unused_promise_try_resolve_call = Promise.try(() => Promise.resolve("dead_promise_try_resolve"));
const unused_promise_try_reject_call = Promise.try(() => Promise.reject("dead_promise_try_reject"));
const unused_promise_try_all_empty_call = Promise.try(() => Promise.all([] as Promise<string>[]));
const unused_promise_try_all_empty_const_array_call = Promise.try(() => Promise.all(unused_promise_empty_array_source));
const unused_promise_try_race_empty_array_copy_call = Promise.try(() => Promise.race(unused_promise_empty_array_copy_source));
const unused_promise_try_all_empty_const_set_call = Promise.try(() => Promise.all(unused_promise_empty_set_source));
const unused_promise_try_race_empty_set_copy_call = Promise.try(() => Promise.race(unused_promise_empty_set_copy_source));
const unused_promise_try_then_call = Promise.try(() => "dead_promise_try_then_source")
    .then(() => "dead_promise_try_then_callback");
const unused_promise_try_catch_call = Promise.try(() => Promise.reject("dead_promise_try_catch_source"))
    .catch(() => "dead_promise_try_catch_callback");
const unused_promise_try_finally_call = Promise.try(() => Promise.resolve("dead_promise_try_finally_source"))
    .finally(() => "dead_promise_try_finally_callback");
const unused_promise_try_then_passthrough_call = Promise.try(() =>
    Promise.resolve("dead_promise_try_then_passthrough_source").then(),
)
    .then((value) => "dead_promise_try_then_passthrough_callback");
const unused_promise_try_catch_passthrough_call = Promise.try(() =>
    Promise.reject<string>("dead_promise_try_catch_passthrough_source").catch(),
)
    .catch((reason) => "dead_promise_try_catch_passthrough_callback");
const unused_promise_try_pending_instance_then_call = Promise.try(() =>
    Promise.race([] as Promise<string>[]).then((value) => "dead_promise_try_pending_instance_then_unreached"),
)
    .finally(() => "dead_promise_try_pending_instance_then_finally_callback");
const unused_promise_all_empty_then_call = Promise.all([] as Promise<string>[])
    .then(() => "dead_promise_all_empty_then_callback");
const unused_promise_all_settled_empty_then_call = Promise.allSettled([] as Promise<string>[])
    .then(() => "dead_promise_all_settled_empty_then_callback");
const unused_promise_any_empty_catch_call = Promise.any([] as Promise<string>[])
    .catch(() => "dead_promise_any_empty_catch_callback");
const unused_promise_all_empty_finally_call = Promise.all([] as Promise<string>[])
    .finally(() => "dead_promise_all_empty_finally_callback");
const unused_promise_any_empty_finally_call = Promise.any([] as Promise<string>[])
    .finally(() => "dead_promise_any_empty_finally_callback");
const unused_promise_resolve_adopt_resolve_then_call = Promise.resolve(Promise.resolve("dead_promise_resolve_adopt_resolve_source"))
    .then(() => "dead_promise_resolve_adopt_resolve_then_callback");
const unused_promise_resolve_adopt_reject_catch_call = Promise.resolve(Promise.reject("dead_promise_resolve_adopt_reject_source"))
    .catch(() => "dead_promise_resolve_adopt_reject_catch_callback");
const unused_promise_resolve_adopt_all_finally_call = Promise.resolve(Promise.all([] as Promise<string>[]))
    .finally(() => "dead_promise_resolve_adopt_all_finally_callback");
const unused_promise_all_fulfilled_then_call = Promise.all([Promise.resolve("dead_promise_all_fulfilled_source")])
    .then(() => "dead_promise_all_fulfilled_then_callback");
const unused_promise_all_rejected_catch_call = Promise.all([Promise.reject<string>("dead_promise_all_rejected_source")])
    .catch(() => "dead_promise_all_rejected_catch_callback");
const unused_promise_any_fulfilled_then_call = Promise.any([
    Promise.reject<string>("dead_promise_any_fulfilled_rejected_source"),
    Promise.resolve("dead_promise_any_fulfilled_source"),
])
    .then(() => "dead_promise_any_fulfilled_then_callback");
const unused_promise_all_settled_nonempty_then_call = Promise.allSettled([
    Promise.resolve("dead_promise_all_settled_nonempty_resolve_source"),
    Promise.reject<string>("dead_promise_all_settled_nonempty_reject_source"),
])
    .then(() => "dead_promise_all_settled_nonempty_then_callback");
const unused_promise_race_fulfilled_then_call = Promise.race([Promise.resolve("dead_promise_race_fulfilled_source")])
    .then(() => "dead_promise_race_fulfilled_then_callback");
const unused_promise_race_empty_then_call = Promise.race([] as Promise<string>[])
    .then(() => "dead_promise_race_empty_then_callback");
const unused_promise_race_empty_catch_call = Promise.race([] as Promise<string>[])
    .catch(() => "dead_promise_race_empty_catch_callback");
const unused_promise_race_empty_finally_call = Promise.race([] as Promise<string>[])
    .finally(() => "dead_promise_race_empty_finally_callback");
const unused_promise_resolve_adopt_pending_finally_call = Promise.resolve(Promise.race([] as Promise<string>[]))
    .finally(() => "dead_promise_resolve_adopt_pending_finally_callback");
const unused_promise_resolve_adopt_then_passthrough_call = Promise.resolve(
    Promise.resolve("dead_promise_resolve_adopt_then_passthrough_source").then(),
)
    .then((value) => "dead_promise_resolve_adopt_then_passthrough_callback");
const unused_promise_resolve_adopt_catch_passthrough_call = Promise.resolve(
    Promise.reject<string>("dead_promise_resolve_adopt_catch_passthrough_source").catch(),
)
    .catch((reason) => "dead_promise_resolve_adopt_catch_passthrough_callback");
const unused_promise_resolve_adopt_pending_then_call = Promise.resolve(
    Promise.race([] as Promise<string>[]).then(() => "dead_promise_resolve_adopt_pending_then_unreached"),
)
    .finally(() => "dead_promise_resolve_adopt_pending_then_finally_callback");
const unused_promise_try_pending_then_call = Promise.try(() => Promise.race([] as Promise<string>[]))
    .then(() => "dead_promise_try_pending_then_callback");
const unused_new_promise_empty_then_call = new Promise<string>(() => {
})
    .then(() => "dead_new_promise_empty_then_callback");
const unused_new_promise_empty_finally_call = new Promise<string>(() => {
})
    .finally(() => "dead_new_promise_empty_finally_callback");
const unused_promise_all_pending_rejected_catch_call = Promise.all([
    Promise.race([] as Promise<string>[]),
    Promise.reject<string>("dead_promise_all_pending_rejected_source"),
])
    .catch(() => "dead_promise_all_pending_rejected_catch_callback");
const unused_promise_all_then_passthrough_element_call = Promise.all([
    Promise.resolve("dead_promise_all_then_passthrough_element_source").then(),
])
    .then((value) => "dead_promise_all_then_passthrough_element_callback");
const unused_promise_all_rejected_then_passthrough_element_call = Promise.all([
    Promise.reject<string>("dead_promise_all_rejected_then_passthrough_element_source").then(undefined),
])
    .catch((reason) => "dead_promise_all_rejected_then_passthrough_element_callback");
const unused_promise_all_pending_then_element_call = Promise.all([
    Promise.race([] as Promise<string>[]).then((value) => "dead_promise_all_pending_then_element_unreached"),
])
    .finally(() => "dead_promise_all_pending_then_element_finally_callback");
const unused_promise_all_settled_then_passthrough_element_call = Promise.allSettled([
    Promise.resolve("dead_promise_all_settled_then_passthrough_fulfilled_element").then(),
    Promise.reject<string>("dead_promise_all_settled_then_passthrough_rejected_element").catch(),
])
    .then((value) => "dead_promise_all_settled_then_passthrough_element_callback");
const unused_promise_all_settled_pending_then_element_call = Promise.allSettled([
    Promise.race([] as Promise<string>[]).then((value) => "dead_promise_all_settled_pending_then_element_unreached"),
])
    .finally(() => "dead_promise_all_settled_pending_then_element_finally_callback");
const unused_promise_any_then_passthrough_element_call = Promise.any([
    Promise.reject<string>("dead_promise_any_then_passthrough_rejected_element").then(undefined),
    Promise.resolve("dead_promise_any_then_passthrough_fulfilled_element").then(),
])
    .then((value) => "dead_promise_any_then_passthrough_element_callback");
const unused_promise_any_pending_then_element_call = Promise.any([
    Promise.race([] as Promise<string>[]).then((value) => "dead_promise_any_pending_then_element_unreached"),
    Promise.reject<string>("dead_promise_any_pending_then_rejected_element").then(undefined),
])
    .finally(() => "dead_promise_any_pending_then_element_finally_callback");
const unused_promise_race_then_passthrough_element_call = Promise.race([
    Promise.resolve("dead_promise_race_then_passthrough_element_source").then(),
])
    .then((value) => "dead_promise_race_then_passthrough_element_callback");
const unused_promise_any_pending_fulfilled_then_call = Promise.any([
    Promise.race([] as Promise<string>[]),
    Promise.resolve("dead_promise_any_pending_fulfilled_source"),
])
    .then(() => "dead_promise_any_pending_fulfilled_then_callback");
const unused_promise_race_pending_fulfilled_then_call = Promise.race([
    Promise.race([] as Promise<string>[]),
    Promise.resolve("dead_promise_race_pending_fulfilled_source"),
])
    .then(() => "dead_promise_race_pending_fulfilled_then_callback");
const unused_promise_race_pending_rejected_catch_call = Promise.race([
    Promise.race([] as Promise<string>[]),
    Promise.reject<string>("dead_promise_race_pending_rejected_source"),
])
    .catch(() => "dead_promise_race_pending_rejected_catch_callback");
const unused_promise_then_passthrough_then_call = Promise.resolve("dead_promise_then_passthrough_source")
    .then()
    .then(() => "dead_promise_then_passthrough_callback");
const kept_promise_then_passthrough_unreached_reject_arg = Promise.resolve("kept_promise_then_passthrough_unreached_reject_source")
    .then(undefined, (Math.random(), (reason: any) => "kept_promise_then_passthrough_unreached_reject_handler"))
    .then((value) => "kept_promise_then_passthrough_unreached_reject_callback");
const kept_promise_then_rejected_passthrough_unreached_fulfill_arg = Promise.reject<string>("kept_promise_then_rejected_passthrough_unreached_fulfill_source")
    .then((Math.random(), (value: string) => "kept_promise_then_rejected_passthrough_unreached_fulfill_handler"))
    .catch((reason) => "kept_promise_then_rejected_passthrough_unreached_fulfill_callback");
const kept_promise_then_fulfilled_reachable_side_effectful_reject_arg = Promise.resolve("kept_promise_then_fulfilled_reachable_side_effectful_reject_source")
    .then(
        (value) => "kept_promise_then_fulfilled_reachable_side_effectful_reject_value",
        (Math.random(), (reason: any) => "kept_promise_then_fulfilled_reachable_side_effectful_reject_handler"),
    )
    .then((value) => "kept_promise_then_fulfilled_reachable_side_effectful_reject_callback");
const kept_promise_then_rejected_reachable_side_effectful_fulfill_arg = Promise.reject<string>("kept_promise_then_rejected_reachable_side_effectful_fulfill_source")
    .then(
        (Math.random(), (value: string) => "kept_promise_then_rejected_reachable_side_effectful_fulfill_handler"),
        (reason) => "kept_promise_then_rejected_reachable_side_effectful_fulfill_value",
    )
    .then((value) => "kept_promise_then_rejected_reachable_side_effectful_fulfill_callback");
const unused_promise_catch_passthrough_catch_call = Promise.reject<string>("dead_promise_catch_passthrough_source")
    .catch()
    .catch((reason) => "dead_promise_catch_passthrough_callback");
const unused_promise_finally_passthrough_then_call = Promise.resolve("dead_promise_finally_passthrough_source")
    .finally(undefined)
    .then(() => "dead_promise_finally_passthrough_callback");
const unused_promise_finally_callback_then_call = Promise.resolve("dead_promise_finally_callback_source")
    .finally(() => "dead_promise_finally_callback_passthrough")
    .then(() => "dead_promise_finally_callback_then_callback");
const unused_promise_reject_finally_callback_catch_call = Promise.reject<string>("dead_promise_reject_finally_callback_source")
    .finally(() => "dead_promise_reject_finally_callback_passthrough")
    .catch((reason) => "dead_promise_reject_finally_callback_catch_callback");
const unused_promise_catch_fulfilled_passthrough_then_call = Promise.resolve("dead_promise_catch_fulfilled_passthrough_source")
    .catch((reason) => "dead_promise_catch_fulfilled_unreached")
    .then(() => "dead_promise_catch_fulfilled_passthrough_callback");
const unused_promise_pending_nested_finally_call = Promise.race([] as Promise<string>[])
    .then(() => "dead_promise_pending_nested_then_callback")
    .finally(() => "dead_promise_pending_nested_finally_callback");
const unused_new_promise_empty_executor_call = new Promise<string>(() => {
});
const unused_new_promise_resolve_call = new Promise<string>((resolve) => resolve("dead_new_promise_resolve"));
const unused_new_promise_reject_call = new Promise<string>((resolve, reject) => {
    reject("dead_new_promise_reject");
});
const unused_new_promise_then_resolve_call = new Promise<string>((resolve) => resolve("dead_new_promise_then_resolve_source"))
    .then(() => "dead_new_promise_then_resolve_callback");
const unused_new_promise_catch_reject_call = new Promise<string>((resolve, reject) => reject("dead_new_promise_catch_reject_source"))
    .catch(() => "dead_new_promise_catch_reject_callback");
const unused_new_promise_finally_resolve_call = new Promise<string>((resolve) => resolve("dead_new_promise_finally_resolve_source"))
    .finally(() => "dead_new_promise_finally_resolve_callback");
const unused_new_promise_finally_reject_call = new Promise<string>((resolve, reject) => reject("dead_new_promise_finally_reject_source"))
    .finally(() => "dead_new_promise_finally_reject_callback");
const unused_new_promise_resolve_adopt_then_passthrough_call = new Promise<Promise<string>>((resolve) =>
    resolve(Promise.resolve("dead_new_promise_resolve_adopt_then_passthrough_source").then()),
)
    .then((value) => "dead_new_promise_resolve_adopt_then_passthrough_callback");
const unused_new_promise_reject_reason_then_passthrough_call = new Promise<string>((resolve, reject) =>
    reject(Promise.resolve("dead_new_promise_reject_reason_then_passthrough_source").then()),
)
    .catch((reason) => "dead_new_promise_reject_reason_then_passthrough_callback");
const unused_new_promise_resolve_pending_then_call = new Promise<Promise<string>>((resolve) =>
    resolve(Promise.race([] as Promise<string>[]).then((value) => "dead_new_promise_resolve_pending_then_unreached")),
)
    .finally(() => "dead_new_promise_resolve_pending_then_finally_callback");
const unused_promise_then_call = Promise.resolve("dead_promise_then_source").then(() => "dead_promise_then_callback");
const unused_promise_then_fulfilled_two_arg_call = Promise.resolve("dead_promise_then_fulfilled_two_arg_source").then(
    () => "dead_promise_then_fulfilled_two_arg_callback",
    () => "dead_promise_then_fulfilled_two_arg_unreached",
);
const unused_promise_then_rejected_two_arg_call = Promise.reject<string>("dead_promise_then_rejected_two_arg_source").then(
    () => "dead_promise_then_rejected_two_arg_unreached",
    () => "dead_promise_then_rejected_two_arg_callback",
);
const unused_promise_catch_call = Promise.reject<string>("dead_promise_catch_source").catch(() => "dead_promise_catch_callback");
const unused_promise_catch_fulfilled_direct_call = Promise.resolve("dead_promise_catch_fulfilled_direct_source")
    .catch((reason) => "dead_promise_catch_fulfilled_direct_callback");
const unused_promise_finally_resolve_call = Promise.resolve("dead_promise_finally_resolve_source").finally(() => {
    String("dead_promise_finally_resolve_callback");
});
const unused_promise_finally_reject_call = Promise.reject<string>("dead_promise_finally_reject_source").finally(() => {
    String("dead_promise_finally_reject_callback");
});
const dead_promise_resolve_object_shorthand = "dead_promise_resolve_object_shorthand";
const unused_promise_resolve_object_shorthand_call = Promise.resolve({ dead_promise_resolve_object_shorthand }.dead_promise_resolve_object_shorthand);
const dead_promise_resolve_object_spread_source = { dead_promise_resolve_object_spread: "dead_promise_resolve_object_spread" };
const unused_promise_resolve_object_spread_call = Promise.resolve({ ...dead_promise_resolve_object_spread_source }.dead_promise_resolve_object_spread);
const dead_promise_resolve_object_assign_source = { dead_promise_resolve_object_assign: "dead_promise_resolve_object_assign" };
const unused_promise_resolve_object_assign_call = Promise.resolve(Object.assign({}, dead_promise_resolve_object_assign_source).dead_promise_resolve_object_assign);
const unused_promise_resolve_object_from_entries_call = Promise.resolve(Object.fromEntries<{ dead_promise_resolve_object_from_entries: string }>([["dead_promise_resolve_object_from_entries", "dead_promise_resolve_object_from_entries"]]).dead_promise_resolve_object_from_entries);
const unused_promise_resolve_object_entries_from_entries_call = Promise.resolve(Object.fromEntries<{ dead_promise_resolve_object_entries_from_entries: string }>(Object.entries({ dead_promise_resolve_object_entries_from_entries: "dead_promise_resolve_object_entries_from_entries" })).dead_promise_resolve_object_entries_from_entries);
const unused_promise_resolve_object_entries_spread_from_entries_call = Promise.resolve(Object.fromEntries<{ dead_promise_resolve_object_entries_spread_from_entries: string }>(Object.entries({ ...{ dead_promise_resolve_object_entries_spread_from_entries: "dead_promise_resolve_object_entries_spread_from_entries" } })).dead_promise_resolve_object_entries_spread_from_entries);
const unused_promise_resolve_from_entries_empty_map_source = new Map<string, string>();
const unused_promise_resolve_from_entries_empty_map_copy_source = new Map(unused_promise_resolve_from_entries_empty_map_source);
const unused_promise_resolve_object_has_own_from_entries_empty_map_const_call = Promise.resolve(Object.hasOwn(Object.fromEntries(unused_promise_resolve_from_entries_empty_map_source), "missing"));
const unused_promise_resolve_reflect_has_from_entries_empty_map_copy_call = Promise.resolve(Reflect.has(Object.fromEntries(unused_promise_resolve_from_entries_empty_map_copy_source), "missing"));
const unused_promise_resolve_object_keys_from_entries_empty_map_length_call = Promise.resolve(Object.keys(Object.fromEntries(unused_promise_resolve_from_entries_empty_map_source)).length);
const unused_promise_resolve_reflect_own_keys_from_entries_empty_map_join_call = Promise.resolve(Reflect.ownKeys(Object.fromEntries(unused_promise_resolve_from_entries_empty_map_copy_source)).join("|"));
const unused_promise_resolve_object_from_entries_empty_map_missing_const_call = Promise.resolve(Object.fromEntries<{ missing?: string }>(unused_promise_resolve_from_entries_empty_map_source).missing);
const unused_promise_resolve_object_from_entries_empty_map_missing_copy_call = Promise.resolve(Object.fromEntries<{ missing?: string }>(unused_promise_resolve_from_entries_empty_map_copy_source).missing);
const unused_promise_resolve_object_define_property_call = Promise.resolve(Object.defineProperty({} as { dead_promise_resolve_object_define_property: string }, "dead_promise_resolve_object_define_property", { value: "dead_promise_resolve_object_define_property", enumerable: true }).dead_promise_resolve_object_define_property);
const unused_promise_resolve_object_define_properties_call = Promise.resolve(Object.defineProperties({} as { dead_promise_resolve_object_define_properties: string }, { dead_promise_resolve_object_define_properties: { value: "dead_promise_resolve_object_define_properties", configurable: true } }).dead_promise_resolve_object_define_properties);
const unused_promise_resolve_object_create_descriptor_call = Promise.resolve(Object.create(null, { dead_promise_resolve_object_create_descriptor: { value: "dead_promise_resolve_object_create_descriptor", enumerable: true } }).dead_promise_resolve_object_create_descriptor);
const unused_promise_resolve_object_freeze_call = Promise.resolve(Object.freeze({ dead_promise_resolve_object_freeze: "dead_promise_resolve_object_freeze" }).dead_promise_resolve_object_freeze);
const unused_promise_resolve_object_seal_call = Promise.resolve(Object.seal({ dead_promise_resolve_object_seal: "dead_promise_resolve_object_seal" }).dead_promise_resolve_object_seal);
const unused_promise_resolve_object_prevent_extensions_call = Promise.resolve(Object.preventExtensions({ dead_promise_resolve_object_prevent_extensions: "dead_promise_resolve_object_prevent_extensions" }).dead_promise_resolve_object_prevent_extensions);
const unused_promise_resolve_object_set_prototype_call = Promise.resolve(Object.setPrototypeOf({ dead_promise_resolve_object_set_prototype: "dead_promise_resolve_object_set_prototype" }, null).dead_promise_resolve_object_set_prototype);
const unused_promise_resolve_object_property_call = Promise.resolve({ dead_promise_resolve_object_property: "dead_promise_resolve_object_property" }.dead_promise_resolve_object_property);
const unused_promise_resolve_object_property_missing_call = Promise.resolve(({ dead_promise_resolve_object_property_missing_source: 1 } as { [key: string]: number }).dead_promise_resolve_object_property_missing);
const unused_promise_resolve_reflect_get_call = Promise.resolve(Reflect.get({ dead_promise_resolve_reflect_get: "dead_promise_resolve_reflect_get" }, "dead_promise_resolve_reflect_get"));
const unused_promise_resolve_reflect_get_array_call = Promise.resolve(Reflect.get(["dead_promise_resolve_reflect_get_array"], "0"));
const unused_promise_resolve_descriptor_value_call = Promise.resolve(Object.getOwnPropertyDescriptor({ dead_promise_resolve_descriptor_value: "dead_promise_resolve_descriptor_value" }, "dead_promise_resolve_descriptor_value")!.value);
const unused_promise_resolve_reflect_descriptor_value_call = Promise.resolve(Reflect.getOwnPropertyDescriptor(["dead_promise_resolve_reflect_descriptor_value"], "0")!.value);
const unused_promise_resolve_object_has_own_freeze_call = Promise.resolve(Object.hasOwn(Object.freeze({ dead_promise_resolve_object_has_own_freeze: 1 }), "dead_promise_resolve_object_has_own_freeze"));
const unused_promise_resolve_reflect_get_freeze_call = Promise.resolve(Reflect.get(Object.freeze({ dead_promise_resolve_reflect_get_freeze: "dead_promise_resolve_reflect_get_freeze" }), "dead_promise_resolve_reflect_get_freeze"));
const unused_promise_resolve_reflect_has_freeze_call = Promise.resolve(Reflect.has(Object.freeze({ dead_promise_resolve_reflect_has_freeze: 1 }), "dead_promise_resolve_reflect_has_freeze"));
const unused_promise_resolve_reflect_set_array_from_call = Promise.resolve(Reflect.set(Array.from(["dead_promise_resolve_reflect_set_array_from_target"]), "0", "dead_promise_resolve_reflect_set_array_from_value"));
const unused_promise_resolve_reflect_delete_object_keys_call = Promise.resolve(Reflect.deleteProperty(Object.keys({ dead_promise_resolve_reflect_delete_object_keys_target: 1 }), "0"));
const unused_promise_resolve_reflect_define_array_of_call = Promise.resolve(Reflect.defineProperty(Array.of("dead_promise_resolve_reflect_define_array_of_target"), "1", { value: "dead_promise_resolve_reflect_define_array_of_value", configurable: true }));
const unused_promise_resolve_reflect_prevent_extensions_object_values_call = Promise.resolve(Reflect.preventExtensions(Object.values({ dead_promise_resolve_reflect_prevent_extensions_object_values_target: 1 })));
const unused_promise_resolve_reflect_set_prototype_from_entries_call = Promise.resolve(Reflect.setPrototypeOf(Object.fromEntries(unused_promise_resolve_from_entries_empty_map_source), null));
const unused_promise_resolve_descriptor_value_freeze_call = Promise.resolve(Object.getOwnPropertyDescriptor(Object.freeze({ dead_promise_resolve_descriptor_value_freeze: "dead_promise_resolve_descriptor_value_freeze" }), "dead_promise_resolve_descriptor_value_freeze")!.value);
const unused_promise_resolve_reflect_descriptor_value_freeze_call = Promise.resolve(Reflect.getOwnPropertyDescriptor(Object.freeze(["dead_promise_resolve_reflect_descriptor_value_freeze"]), "0")!.value);
const unused_promise_resolve_object_keys_length_call = Promise.resolve(Object.keys({ dead_promise_resolve_object_keys_length: 1 }).length);
const unused_promise_resolve_reflect_own_keys_length_call = Promise.resolve(Reflect.ownKeys(["dead_promise_resolve_reflect_own_keys_length"]).length);
const unused_promise_resolve_reflect_own_keys_array_from_length_call = Promise.resolve(Reflect.ownKeys(Array.from(["dead_promise_resolve_reflect_own_keys_array_from_length"])).length);
const unused_promise_resolve_descriptors_value_call = Promise.resolve(Object.getOwnPropertyDescriptors({ dead_promise_resolve_descriptors_value: "dead_promise_resolve_descriptors_value" }).dead_promise_resolve_descriptors_value.value);
const unused_promise_resolve_descriptors_array_value_call = Promise.resolve(Object.getOwnPropertyDescriptors(["dead_promise_resolve_descriptors_array_value"])["0"].value);
const unused_promise_resolve_array_of_element_call = Promise.resolve(Array.of("dead_promise_resolve_array_of_element")[0]);
const unused_promise_resolve_array_from_array_element_call = Promise.resolve(Array.from(["dead_promise_resolve_array_from_array_element"])[0]);
const unused_promise_resolve_array_from_returned_element_call = Promise.resolve(Array.from(Array.of("dead_promise_resolve_array_from_returned_element", "dead_promise_resolve_array_from_returned_element_hit").slice(1))[0]);
const unused_promise_resolve_array_from_returned_absent_call = Promise.resolve(Array.from(Array.of("dead_promise_resolve_array_from_returned_absent").slice(1))[0]);
const unused_promise_resolve_array_spread_returned_element_call = Promise.resolve([...Array.of("dead_promise_resolve_array_spread_returned_element", "dead_promise_resolve_array_spread_returned_element_hit").slice(1)][0]);
const unused_promise_resolve_array_spread_returned_absent_call = Promise.resolve([...Array.of("dead_promise_resolve_array_spread_returned_absent").slice(1)][0]);
const unused_promise_resolve_array_from_string_element_call = Promise.resolve(Array.from("dead_promise_resolve_array_from_string_element")[0]);
const unused_promise_resolve_object_keys_element_call = Promise.resolve(Object.keys({ dead_promise_resolve_object_keys_element: 1 })[0]);
const unused_promise_resolve_object_property_names_element_call = Promise.resolve(Object.getOwnPropertyNames(["dead_promise_resolve_object_property_names_element"])[0]);
const unused_promise_resolve_array_from_set_element_call = Promise.resolve(Array.from(new Set(["dead_promise_resolve_array_from_set_element"]))[0]);
const unused_promise_resolve_array_from_set_returned_element_call = Promise.resolve(Array.from(new Set(Array.of("dead_promise_resolve_array_from_set_returned_element").slice(0)))[0]);
const unused_promise_resolve_array_from_set_returned_absent_call = Promise.resolve(Array.from(new Set(Array.of("dead_promise_resolve_array_from_set_returned_absent").slice(1)))[0]);
const unused_promise_resolve_array_from_set_returned_length_call = Promise.resolve(Array.from(new Set(Array.of("dead_promise_resolve_array_from_set_returned_length_drop", "dead_promise_resolve_array_from_set_returned_length", "dead_promise_resolve_array_from_set_returned_length_tail").slice(1))).length);
const unused_promise_resolve_array_from_set_concat_length_call = Promise.resolve(Array.from(new Set(Array.of("dead_promise_resolve_array_from_set_concat_length").concat(Array.of("dead_promise_resolve_array_from_set_concat_length_tail")))).length);
const unused_promise_resolve_array_from_set_flat_length_call = Promise.resolve(Array.from(new Set(Array.of("dead_promise_resolve_array_from_set_flat_length", "dead_promise_resolve_array_from_set_flat_length_tail").flat(0))).length);
const unused_promise_resolve_array_from_set_with_length_call = Promise.resolve(Array.from(new Set(Array.of("dead_promise_resolve_array_from_set_with_length_old", "dead_promise_resolve_array_from_set_with_length_tail").with(0, "dead_promise_resolve_array_from_set_with_length"))).length);
const unused_promise_resolve_array_from_set_to_spliced_length_call = Promise.resolve(Array.from(new Set(Array.of("dead_promise_resolve_array_from_set_to_spliced_length_old", "dead_promise_resolve_array_from_set_to_spliced_length_tail").toSpliced(0, 1, "dead_promise_resolve_array_from_set_to_spliced_length"))).length);
const unused_promise_resolve_array_from_set_fill_length_call = Promise.resolve(Array.from(new Set(Array.of("dead_promise_resolve_array_from_set_fill_length_old", "dead_promise_resolve_array_from_set_fill_length_tail").fill("dead_promise_resolve_array_from_set_fill_length", 0, 1))).length);
const unused_promise_resolve_array_from_set_copy_within_length_call = Promise.resolve(Array.from(new Set(Array.of("dead_promise_resolve_array_from_set_copy_within_length_old", "dead_promise_resolve_array_from_set_copy_within_length", "dead_promise_resolve_array_from_set_copy_within_length_tail").copyWithin(0, 1, 2))).length);
const unused_promise_resolve_array_from_set_reversed_length_call = Promise.resolve(Array.from(new Set(Array.of("dead_promise_resolve_array_from_set_reversed_length", "dead_promise_resolve_array_from_set_reversed_length_tail").toReversed())).length);
const unused_promise_resolve_array_from_set_sorted_length_call = Promise.resolve(Array.from(new Set(Array.of("dead_promise_resolve_array_from_set_sorted_length_b", "dead_promise_resolve_array_from_set_sorted_length_a").toSorted())).length);
const unused_promise_resolve_array_from_empty_map_returned_length_call = Promise.resolve(Array.from(new Map(Array.of(["dead_promise_resolve_array_from_empty_map_returned_length", "dead_promise_resolve_array_from_empty_map_returned_length_value"] as ObjectEntry<string>).slice(1))).length);
const unused_promise_resolve_array_from_empty_map_returned_absent_call = Promise.resolve(Array.from(new Map(Array.of(["dead_promise_resolve_array_from_empty_map_returned_absent", "dead_promise_resolve_array_from_empty_map_returned_absent_value"] as ObjectEntry<string>).slice(1)))[0]);
const unused_promise_resolve_array_from_map_returned_length_call = Promise.resolve(Array.from(new Map(Array.of(["dead_promise_resolve_array_from_map_returned_length", "dead_promise_resolve_array_from_map_returned_length_value"] as ObjectEntry<string>, ["dead_promise_resolve_array_from_map_returned_length_tail", "dead_promise_resolve_array_from_map_returned_length_tail_value"] as ObjectEntry<string>).slice(1))).length);
const unused_promise_resolve_array_from_map_concat_length_call = Promise.resolve(Array.from(new Map(Array.of(["dead_promise_resolve_array_from_map_concat_length", "dead_promise_resolve_array_from_map_concat_length_value"] as ObjectEntry<string>).concat(Array.of(["dead_promise_resolve_array_from_map_concat_length_tail", "dead_promise_resolve_array_from_map_concat_length_tail_value"] as ObjectEntry<string>)))).length);
const unused_promise_resolve_array_from_map_flat_length_call = Promise.resolve(Array.from(new Map(Array.of(["dead_promise_resolve_array_from_map_flat_length", "dead_promise_resolve_array_from_map_flat_length_value"] as ObjectEntry<string>, ["dead_promise_resolve_array_from_map_flat_length_tail", "dead_promise_resolve_array_from_map_flat_length_tail_value"] as ObjectEntry<string>).flat(0))).length);
const unused_promise_resolve_array_from_map_with_length_call = Promise.resolve(Array.from(new Map(Array.of(["dead_promise_resolve_array_from_map_with_length_old", "dead_promise_resolve_array_from_map_with_length_old_value"] as ObjectEntry<string>, ["dead_promise_resolve_array_from_map_with_length_tail", "dead_promise_resolve_array_from_map_with_length_tail_value"] as ObjectEntry<string>).with(0, ["dead_promise_resolve_array_from_map_with_length", "dead_promise_resolve_array_from_map_with_length_value"] as ObjectEntry<string>))).length);
const unused_promise_resolve_array_from_map_to_spliced_length_call = Promise.resolve(Array.from(new Map(Array.of(["dead_promise_resolve_array_from_map_to_spliced_length_old", "dead_promise_resolve_array_from_map_to_spliced_length_old_value"] as ObjectEntry<string>, ["dead_promise_resolve_array_from_map_to_spliced_length_tail", "dead_promise_resolve_array_from_map_to_spliced_length_tail_value"] as ObjectEntry<string>).toSpliced(0, 1, ["dead_promise_resolve_array_from_map_to_spliced_length", "dead_promise_resolve_array_from_map_to_spliced_length_value"] as ObjectEntry<string>))).length);
const unused_promise_resolve_array_from_map_fill_length_call = Promise.resolve(Array.from(new Map(Array.of(["dead_promise_resolve_array_from_map_fill_length_old", "dead_promise_resolve_array_from_map_fill_length_old_value"] as ObjectEntry<string>, ["dead_promise_resolve_array_from_map_fill_length_tail", "dead_promise_resolve_array_from_map_fill_length_tail_value"] as ObjectEntry<string>).fill(["dead_promise_resolve_array_from_map_fill_length", "dead_promise_resolve_array_from_map_fill_length_value"] as ObjectEntry<string>, 0, 1))).length);
const unused_promise_resolve_array_from_map_copy_within_length_call = Promise.resolve(Array.from(new Map(Array.of(["dead_promise_resolve_array_from_map_copy_within_length_old", "dead_promise_resolve_array_from_map_copy_within_length_old_value"] as ObjectEntry<string>, ["dead_promise_resolve_array_from_map_copy_within_length", "dead_promise_resolve_array_from_map_copy_within_length_value"] as ObjectEntry<string>, ["dead_promise_resolve_array_from_map_copy_within_length_tail", "dead_promise_resolve_array_from_map_copy_within_length_tail_value"] as ObjectEntry<string>).copyWithin(0, 1, 2))).length);
const unused_promise_resolve_array_from_map_reversed_length_call = Promise.resolve(Array.from(new Map(Array.of(["dead_promise_resolve_array_from_map_reversed_length", "dead_promise_resolve_array_from_map_reversed_length_value"] as ObjectEntry<string>, ["dead_promise_resolve_array_from_map_reversed_length_tail", "dead_promise_resolve_array_from_map_reversed_length_tail_value"] as ObjectEntry<string>).toReversed())).length);
const unused_promise_resolve_array_from_map_sorted_length_call = Promise.resolve(Array.from(new Map(Array.of(["dead_promise_resolve_array_from_map_sorted_length_b", "dead_promise_resolve_array_from_map_sorted_length_b_value"] as ObjectEntry<string>, ["dead_promise_resolve_array_from_map_sorted_length_a", "dead_promise_resolve_array_from_map_sorted_length_a_value"] as ObjectEntry<string>).toSorted())).length);
const unused_promise_resolve_object_entries_array_from_returned_key_call = Promise.resolve(Object.entries(Array.from(Array.of("dead_promise_resolve_object_entries_array_from_returned_key").slice(0)))[0][0]);
const unused_promise_resolve_object_entries_array_spread_returned_key_call = Promise.resolve(Object.entries([...Array.of("dead_promise_resolve_object_entries_array_spread_returned_key").slice(0)])[0][0]);
const unused_promise_resolve_object_entries_array_from_set_returned_key_call = Promise.resolve(Object.entries(Array.from(new Set(Array.of("dead_promise_resolve_object_entries_array_from_set_returned_key").slice(0))))[0][0]);
const unused_promise_resolve_object_entries_array_from_set_returned_tail_key_call = Promise.resolve(Object.entries(Array.from(new Set(Array.of("dead_promise_resolve_object_entries_array_from_set_returned_tail_key_drop", "dead_promise_resolve_object_entries_array_from_set_returned_tail_key", "dead_promise_resolve_object_entries_array_from_set_returned_tail_key_tail").slice(1))))[1][0]);
const unused_promise_resolve_object_entries_array_from_set_concat_key_call = Promise.resolve(Object.entries(Array.from(new Set(Array.of("dead_promise_resolve_object_entries_array_from_set_concat_key").concat(Array.of("dead_promise_resolve_object_entries_array_from_set_concat_key_tail")))))[1][0]);
const unused_promise_resolve_object_entries_array_from_set_flat_key_call = Promise.resolve(Object.entries(Array.from(new Set(Array.of("dead_promise_resolve_object_entries_array_from_set_flat_key_drop", "dead_promise_resolve_object_entries_array_from_set_flat_key", "dead_promise_resolve_object_entries_array_from_set_flat_key_tail").flat(0))))[1][0]);
const unused_promise_resolve_object_entries_array_from_set_with_key_call = Promise.resolve(Object.entries(Array.from(new Set(Array.of("dead_promise_resolve_object_entries_array_from_set_with_key_drop", "dead_promise_resolve_object_entries_array_from_set_with_key_old").with(1, "dead_promise_resolve_object_entries_array_from_set_with_key"))))[1][0]);
const unused_promise_resolve_object_entries_array_from_set_to_spliced_key_call = Promise.resolve(Object.entries(Array.from(new Set(Array.of("dead_promise_resolve_object_entries_array_from_set_to_spliced_key_drop", "dead_promise_resolve_object_entries_array_from_set_to_spliced_key_old").toSpliced(1, 1, "dead_promise_resolve_object_entries_array_from_set_to_spliced_key"))))[1][0]);
const unused_promise_resolve_object_entries_array_from_set_fill_key_call = Promise.resolve(Object.entries(Array.from(new Set(Array.of("dead_promise_resolve_object_entries_array_from_set_fill_key_drop", "dead_promise_resolve_object_entries_array_from_set_fill_key_old").fill("dead_promise_resolve_object_entries_array_from_set_fill_key", 1, 2))))[1][0]);
const unused_promise_resolve_object_entries_array_from_set_copy_within_key_call = Promise.resolve(Object.entries(Array.from(new Set(Array.of("dead_promise_resolve_object_entries_array_from_set_copy_within_key_drop", "dead_promise_resolve_object_entries_array_from_set_copy_within_key_old", "dead_promise_resolve_object_entries_array_from_set_copy_within_key").copyWithin(1, 2, 3))))[1][0]);
const unused_promise_resolve_object_entries_array_from_set_reversed_key_call = Promise.resolve(Object.entries(Array.from(new Set(Array.of("dead_promise_resolve_object_entries_array_from_set_reversed_key", "dead_promise_resolve_object_entries_array_from_set_reversed_key_tail").reverse())))[1][0]);
const unused_promise_resolve_object_entries_array_from_set_sorted_key_call = Promise.resolve(Object.entries(Array.from(new Set(Array.of("dead_promise_resolve_object_entries_array_from_set_sorted_key_b", "dead_promise_resolve_object_entries_array_from_set_sorted_key_a").sort())))[1][0]);
const unused_promise_resolve_object_entries_array_from_empty_map_returned_key_call = Promise.resolve(Object.entries(Array.from(new Map(Array.of(["dead_promise_resolve_object_entries_array_from_empty_map_returned_key", "dead_promise_resolve_object_entries_array_from_empty_map_returned_key_value"] as ObjectEntry<string>).slice(1))))[0][0]);
const unused_promise_resolve_object_entries_array_from_map_returned_key_call = Promise.resolve(Object.entries(Array.from(new Map(Array.of(["dead_promise_resolve_object_entries_array_from_map_returned_key", "dead_promise_resolve_object_entries_array_from_map_returned_key_value"] as ObjectEntry<string>, ["dead_promise_resolve_object_entries_array_from_map_returned_key_tail", "dead_promise_resolve_object_entries_array_from_map_returned_key_tail_value"] as ObjectEntry<string>).slice(1))))[0][0]);
const unused_promise_resolve_object_entries_array_from_map_concat_key_call = Promise.resolve(Object.entries(Array.from(new Map(Array.of(["dead_promise_resolve_object_entries_array_from_map_concat_key", "dead_promise_resolve_object_entries_array_from_map_concat_key_value"] as ObjectEntry<string>).concat(Array.of(["dead_promise_resolve_object_entries_array_from_map_concat_key_tail", "dead_promise_resolve_object_entries_array_from_map_concat_key_tail_value"] as ObjectEntry<string>)))))[1][0]);
const unused_promise_resolve_object_entries_array_from_map_flat_key_call = Promise.resolve(Object.entries(Array.from(new Map(Array.of(["dead_promise_resolve_object_entries_array_from_map_flat_key", "dead_promise_resolve_object_entries_array_from_map_flat_key_value"] as ObjectEntry<string>, ["dead_promise_resolve_object_entries_array_from_map_flat_key_tail", "dead_promise_resolve_object_entries_array_from_map_flat_key_tail_value"] as ObjectEntry<string>).flat(0))))[1][0]);
const unused_promise_resolve_object_entries_array_from_map_with_key_call = Promise.resolve(Object.entries(Array.from(new Map(Array.of(["dead_promise_resolve_object_entries_array_from_map_with_key", "dead_promise_resolve_object_entries_array_from_map_with_key_value"] as ObjectEntry<string>, ["dead_promise_resolve_object_entries_array_from_map_with_key_old", "dead_promise_resolve_object_entries_array_from_map_with_key_old_value"] as ObjectEntry<string>).with(1, ["dead_promise_resolve_object_entries_array_from_map_with_key_tail", "dead_promise_resolve_object_entries_array_from_map_with_key_tail_value"] as ObjectEntry<string>))))[1][0]);
const unused_promise_resolve_object_entries_array_from_map_to_spliced_key_call = Promise.resolve(Object.entries(Array.from(new Map(Array.of(["dead_promise_resolve_object_entries_array_from_map_to_spliced_key", "dead_promise_resolve_object_entries_array_from_map_to_spliced_key_value"] as ObjectEntry<string>, ["dead_promise_resolve_object_entries_array_from_map_to_spliced_key_old", "dead_promise_resolve_object_entries_array_from_map_to_spliced_key_old_value"] as ObjectEntry<string>).toSpliced(1, 1, ["dead_promise_resolve_object_entries_array_from_map_to_spliced_key_tail", "dead_promise_resolve_object_entries_array_from_map_to_spliced_key_tail_value"] as ObjectEntry<string>))))[1][0]);
const unused_promise_resolve_object_entries_array_from_map_fill_key_call = Promise.resolve(Object.entries(Array.from(new Map(Array.of(["dead_promise_resolve_object_entries_array_from_map_fill_key", "dead_promise_resolve_object_entries_array_from_map_fill_key_value"] as ObjectEntry<string>, ["dead_promise_resolve_object_entries_array_from_map_fill_key_old", "dead_promise_resolve_object_entries_array_from_map_fill_key_old_value"] as ObjectEntry<string>).fill(["dead_promise_resolve_object_entries_array_from_map_fill_key_tail", "dead_promise_resolve_object_entries_array_from_map_fill_key_tail_value"] as ObjectEntry<string>, 1, 2))))[1][0]);
const unused_promise_resolve_object_entries_array_from_map_copy_within_key_call = Promise.resolve(Object.entries(Array.from(new Map(Array.of(["dead_promise_resolve_object_entries_array_from_map_copy_within_key", "dead_promise_resolve_object_entries_array_from_map_copy_within_key_value"] as ObjectEntry<string>, ["dead_promise_resolve_object_entries_array_from_map_copy_within_key_old", "dead_promise_resolve_object_entries_array_from_map_copy_within_key_old_value"] as ObjectEntry<string>, ["dead_promise_resolve_object_entries_array_from_map_copy_within_key_tail", "dead_promise_resolve_object_entries_array_from_map_copy_within_key_tail_value"] as ObjectEntry<string>).copyWithin(1, 2, 3))))[1][0]);
const unused_promise_resolve_object_entries_array_from_map_reversed_key_call = Promise.resolve(Object.entries(Array.from(new Map(Array.of(["dead_promise_resolve_object_entries_array_from_map_reversed_key", "dead_promise_resolve_object_entries_array_from_map_reversed_key_value"] as ObjectEntry<string>, ["dead_promise_resolve_object_entries_array_from_map_reversed_key_tail", "dead_promise_resolve_object_entries_array_from_map_reversed_key_tail_value"] as ObjectEntry<string>).reverse())))[1][0]);
const unused_promise_resolve_object_entries_array_from_map_sorted_key_call = Promise.resolve(Object.entries(Array.from(new Map(Array.of(["dead_promise_resolve_object_entries_array_from_map_sorted_key_b", "dead_promise_resolve_object_entries_array_from_map_sorted_key_b_value"] as ObjectEntry<string>, ["dead_promise_resolve_object_entries_array_from_map_sorted_key_a", "dead_promise_resolve_object_entries_array_from_map_sorted_key_a_value"] as ObjectEntry<string>).sort())))[1][0]);
const unused_promise_resolve_reflect_own_keys_element_call = Promise.resolve(Reflect.ownKeys({ dead_promise_resolve_reflect_own_keys_element: 1 })[0]);
const unused_promise_resolve_object_keys_freeze_element_call = Promise.resolve(Object.keys(Object.freeze({ dead_promise_resolve_object_keys_freeze_element: 1 }))[0]);
const unused_promise_resolve_object_property_names_freeze_element_call = Promise.resolve(Object.getOwnPropertyNames(Object.freeze(["dead_promise_resolve_object_property_names_freeze_element"]))[0]);
const unused_promise_resolve_reflect_own_keys_freeze_element_call = Promise.resolve(Reflect.ownKeys(Object.freeze({ dead_promise_resolve_reflect_own_keys_freeze_element: 1 }))[0]);
const unused_promise_resolve_object_keys_join_call = Promise.resolve(Object.keys({ dead_promise_resolve_object_keys_join: 1 }).join("|"));
const unused_promise_resolve_object_property_names_join_call = Promise.resolve(Object.getOwnPropertyNames(["dead_promise_resolve_object_property_names_join"]).join("|"));
const unused_promise_resolve_object_keys_includes_call = Promise.resolve(Object.keys({ dead_promise_resolve_object_keys_includes: 1 }).includes("dead_promise_resolve_object_keys_includes"));
const unused_promise_resolve_object_keys_assign_join_call = Promise.resolve(Object.keys(Object.assign({}, { dead_promise_resolve_object_keys_assign_join: 1 })).join("|"));
const unused_promise_resolve_object_property_names_from_entries_join_call = Promise.resolve(Object.getOwnPropertyNames(Object.fromEntries<{ dead_promise_resolve_object_property_names_from_entries_join: number }>([["dead_promise_resolve_object_property_names_from_entries_join", 1]])).join("|"));
const unused_promise_resolve_object_keys_create_descriptor_to_string_call = Promise.resolve(Object.keys(Object.create(null, { dead_promise_resolve_object_keys_create_descriptor_to_string: { value: 1, enumerable: true } })).toString());
const unused_promise_resolve_object_property_names_define_property_includes_call = Promise.resolve(Object.getOwnPropertyNames(Object.defineProperty({}, "dead_promise_resolve_object_property_names_define_property_includes", { value: 1, enumerable: true })).includes("dead_promise_resolve_object_property_names_define_property_includes"));
const unused_promise_resolve_reflect_own_keys_join_call = Promise.resolve(Reflect.ownKeys({ dead_promise_resolve_reflect_own_keys_join: 1 }).join("|"));
const unused_promise_resolve_reflect_own_keys_to_string_call = Promise.resolve(Reflect.ownKeys(["dead_promise_resolve_reflect_own_keys_to_string"]).toString());
const unused_promise_resolve_reflect_own_keys_assign_join_call = Promise.resolve(Reflect.ownKeys(Object.assign({}, { dead_promise_resolve_reflect_own_keys_assign_join: 1 })).join("|"));
const unused_promise_resolve_reflect_own_keys_from_entries_join_call = Promise.resolve(Reflect.ownKeys(Object.fromEntries<{ dead_promise_resolve_reflect_own_keys_from_entries_join: number }>([["dead_promise_resolve_reflect_own_keys_from_entries_join", 1]])).join("|"));
const unused_promise_resolve_reflect_own_keys_create_descriptor_join_call = Promise.resolve(Reflect.ownKeys(Object.create(null, { dead_promise_resolve_reflect_own_keys_create_descriptor_join: { value: 1, enumerable: true } })).join("|"));
const unused_promise_resolve_reflect_own_keys_define_properties_join_call = Promise.resolve(Reflect.ownKeys(Object.defineProperties({}, { dead_promise_resolve_reflect_own_keys_define_properties_join: { value: 1, enumerable: true } })).join("|"));
const unused_promise_resolve_array_of_length_call = Promise.resolve(Array.of("dead_promise_resolve_array_of_length").length);
const unused_promise_resolve_array_from_length_call = Promise.resolve(Array.from(["dead_promise_resolve_array_from_length"]).length);
const unused_promise_resolve_array_from_set_length_call = Promise.resolve(Array.from(new Set(["dead_promise_resolve_array_from_set_length"])).length);
const unused_promise_resolve_array_of_join_call = Promise.resolve(Array.of("dead_promise_resolve_array_of_join").join("|"));
const unused_promise_resolve_array_from_join_call = Promise.resolve(Array.from(["dead_promise_resolve_array_from_join"]).join("|"));
const unused_promise_resolve_array_from_string_to_string_call = Promise.resolve(Array.from("dead_promise_resolve_array_from_string_to_string").toString());
const unused_promise_resolve_array_from_includes_call = Promise.resolve(Array.from(["dead_promise_resolve_array_from_includes"]).includes("dead_promise_resolve_array_from_includes"));
const unused_promise_resolve_array_from_set_join_call = Promise.resolve(Array.from(new Set(["dead_promise_resolve_array_from_set_join"])).join("|"));
const unused_promise_resolve_array_from_set_to_string_call = Promise.resolve(Array.from(new Set(["dead_promise_resolve_array_from_set_to_string"])).toString());
const unused_promise_resolve_object_values_array_element_call = Promise.resolve(Object.values(["dead_promise_resolve_object_values_array_element"])[0]);
const unused_promise_resolve_object_values_array_of_element_call = Promise.resolve(Object.values(Array.of("dead_promise_resolve_object_values_array_of_element"))[0]);
const unused_promise_resolve_object_values_array_from_element_call = Promise.resolve(Object.values(Array.from(["dead_promise_resolve_object_values_array_from_element"]))[0]);
const unused_promise_resolve_object_values_string_element_call = Promise.resolve(Object.values("dead_promise_resolve_object_values_string_element")[0]);
const unused_promise_resolve_object_values_object_element_call = Promise.resolve(Object.values({ dead_promise_resolve_object_values_object_element: "dead_promise_resolve_object_values_object_element" })[0]);
const unused_promise_resolve_object_values_spread_element_call = Promise.resolve(Object.values({ ...{ dead_promise_resolve_object_values_spread_element: "dead_promise_resolve_object_values_spread_element" }, dead_promise_resolve_object_values_spread_tail: "dead_promise_resolve_object_values_spread_tail" })[1]);
const unused_promise_resolve_object_values_array_join_call = Promise.resolve(Object.values(["dead_promise_resolve_object_values_array_join"]).join("|"));
const unused_promise_resolve_object_values_string_to_string_call = Promise.resolve(Object.values("dead_promise_resolve_object_values_string_to_string").toString());
const unused_promise_resolve_object_values_object_join_call = Promise.resolve(Object.values({ dead_promise_resolve_object_values_object_join: "dead_promise_resolve_object_values_object_join" }).join("|"));
const unused_promise_resolve_object_values_spread_join_call = Promise.resolve(Object.values({ ...{ dead_promise_resolve_object_values_spread_join: "dead_promise_resolve_object_values_spread_join" }, dead_promise_resolve_object_values_spread_join_tail: "dead_promise_resolve_object_values_spread_join_tail" }).join("|"));
const unused_promise_resolve_object_values_number_join_call = Promise.resolve(Object.values("dead_promise_resolve_object_values_number_join".length).join("|"));
const unused_promise_resolve_object_values_boolean_to_string_call = Promise.resolve(Object.values(true).toString("dead_promise_resolve_object_values_boolean_to_string"));
const unused_promise_resolve_object_values_bigint_includes_call = Promise.resolve(Object.values(123n).includes("dead_promise_resolve_object_values_bigint_includes"));
const unused_promise_resolve_object_values_array_of_join_call = Promise.resolve(Object.values(Array.of("dead_promise_resolve_object_values_array_of_join")).join("|"));
const unused_promise_resolve_object_values_array_from_to_string_call = Promise.resolve(Object.values(Array.from(["dead_promise_resolve_object_values_array_from_to_string"])).toString());
const unused_promise_resolve_object_values_object_keys_includes_call = Promise.resolve(Object.values(Object.keys({ dead_promise_resolve_object_values_object_keys_includes: 1 })).includes("dead_promise_resolve_object_values_object_keys_includes"));
const unused_promise_resolve_object_values_map_join_call = Promise.resolve(Object.values(new Map([["dead_promise_resolve_object_values_map_join", 1]])).join("|"));
const unused_promise_resolve_object_values_set_to_string_call = Promise.resolve(Object.values(new Set(["dead_promise_resolve_object_values_set_to_string"])).toString());
const unused_promise_resolve_object_values_weak_map_to_string_call = Promise.resolve(Object.values(new WeakMap<object, string>()).toString("dead_promise_resolve_object_values_weak_map_to_string"));
const unused_promise_resolve_object_values_assign_join_call = Promise.resolve(Object.values(Object.assign({} as { dead_promise_resolve_object_values_assign_join: string }, { dead_promise_resolve_object_values_assign_join: "dead_promise_resolve_object_values_assign_join" })).join("|"));
const unused_promise_resolve_object_values_from_entries_join_call = Promise.resolve(Object.values(Object.fromEntries<{ dead_promise_resolve_object_values_from_entries_join: string }>([["dead_promise_resolve_object_values_from_entries_join", "dead_promise_resolve_object_values_from_entries_join"]])).join("|"));
const unused_promise_resolve_object_values_entries_from_entries_join_call = Promise.resolve(Object.values(Object.fromEntries<{ dead_promise_resolve_object_values_entries_from_entries_join: string }>(Object.entries({ dead_promise_resolve_object_values_entries_from_entries_join: "dead_promise_resolve_object_values_entries_from_entries_join" }))).join("|"));
const unused_promise_resolve_object_values_create_descriptor_join_call = Promise.resolve(Object.values(Object.create(null, { dead_promise_resolve_object_values_create_descriptor_join: { value: "dead_promise_resolve_object_values_create_descriptor_join", enumerable: true } })).join("|"));
const unused_promise_resolve_object_values_define_property_join_call = Promise.resolve(Object.values(Object.defineProperty({} as { dead_promise_resolve_object_values_define_property_join: string }, "dead_promise_resolve_object_values_define_property_join", { value: "dead_promise_resolve_object_values_define_property_join", enumerable: true })).join("|"));
const unused_promise_resolve_object_values_define_properties_join_call = Promise.resolve(Object.values(Object.defineProperties({} as { dead_promise_resolve_object_values_define_properties_join: string }, { dead_promise_resolve_object_values_define_properties_join: { value: "dead_promise_resolve_object_values_define_properties_join", enumerable: true } })).join("|"));
const unused_promise_resolve_object_entries_key_call = Promise.resolve(Object.entries({ dead_promise_resolve_object_entries_key: "dead_promise_resolve_object_entries_value" })[0][0]);
const unused_promise_resolve_object_entries_array_object_key_call = Promise.resolve(Object.entries([{ label: "dead_promise_resolve_object_entries_array_object_key" }])[0][0]);
const unused_promise_resolve_object_entries_array_of_object_key_call = Promise.resolve(Object.entries(Array.of({ label: "dead_promise_resolve_object_entries_array_of_object_key" }))[0][0]);
const unused_promise_resolve_object_entries_array_from_object_key_call = Promise.resolve(Object.entries(Array.from([{ label: "dead_promise_resolve_object_entries_array_from_object_key" }]))[0][0]);
const unused_promise_resolve_object_entries_array_from_set_object_key_call = Promise.resolve(Object.entries(Array.from(new Set<object>([{ label: "dead_promise_resolve_object_entries_array_from_set_object_key" }])))[0][0]);
const unused_promise_resolve_object_entries_array_from_map_object_key_call = Promise.resolve(Object.entries(Array.from(new Map<object, string>([[{ id: "dead_promise_resolve_object_entries_array_from_map_object_key" }, "dead_promise_resolve_object_entries_array_from_map_object_value"] as ObjectEntry<string, object>])))[0][0]);
const unused_promise_resolve_object_entries_value_call = Promise.resolve(Object.entries({ dead_promise_resolve_object_entries_value_key: "dead_promise_resolve_object_entries_value" })[0][1]);
const unused_promise_resolve_object_entries_spread_value_call = Promise.resolve(Object.entries({ ...{ dead_promise_resolve_object_entries_spread_value_key: "dead_promise_resolve_object_entries_spread_value" }, dead_promise_resolve_object_entries_spread_tail_key: "dead_promise_resolve_object_entries_spread_tail_value" })[1][1]);
const unused_promise_resolve_object_entries_array_value_call = Promise.resolve(Object.entries(["dead_promise_resolve_object_entries_array_value"])[0][1]);
const unused_promise_resolve_object_entries_array_of_value_call = Promise.resolve(Object.entries(Array.of("dead_promise_resolve_object_entries_array_of_value"))[0][1]);
const unused_promise_resolve_object_entries_array_from_value_call = Promise.resolve(Object.entries(Array.from(["dead_promise_resolve_object_entries_array_from_value"]))[0][1]);
const unused_promise_resolve_object_entries_string_value_call = Promise.resolve(Object.entries("dead_promise_resolve_object_entries_string_value")[0][1]);
const unused_promise_resolve_object_entries_map_join_call = Promise.resolve(Object.entries(new Map([["dead_promise_resolve_object_entries_map_join", 1]])).join("|"));
const unused_promise_resolve_object_entries_set_to_string_call = Promise.resolve(Object.entries(new Set(["dead_promise_resolve_object_entries_set_to_string"])).toString("dead_promise_resolve_object_entries_set_to_string_ignored"));
const unused_promise_resolve_object_entries_weak_set_to_string_call = Promise.resolve(Object.entries(new WeakSet<object>()).toString("dead_promise_resolve_object_entries_weak_set_to_string"));
const unused_promise_resolve_object_entries_number_join_call = Promise.resolve(Object.entries("dead_promise_resolve_object_entries_number_join".length).join("|"));
const unused_promise_resolve_object_entries_boolean_to_string_call = Promise.resolve(Object.entries(false).toString("dead_promise_resolve_object_entries_boolean_to_string"));
const unused_promise_resolve_object_entries_bigint_to_string_call = Promise.resolve(Object.entries(123n).toString("dead_promise_resolve_object_entries_bigint_to_string"));
const unused_promise_resolve_object_entries_object_join_call = Promise.resolve(Object.entries({ dead_promise_resolve_object_entries_object_join: "dead_promise_resolve_object_entries_object_join" }).join("|"));
const unused_promise_resolve_object_entries_spread_join_call = Promise.resolve(Object.entries({ ...{ dead_promise_resolve_object_entries_spread_join: "dead_promise_resolve_object_entries_spread_join" }, dead_promise_resolve_object_entries_spread_join_tail: "dead_promise_resolve_object_entries_spread_join_tail" }).join("|"));
const unused_promise_resolve_object_entries_assign_to_string_call = Promise.resolve(Object.entries(Object.assign({} as { dead_promise_resolve_object_entries_assign_to_string: string }, { dead_promise_resolve_object_entries_assign_to_string: "dead_promise_resolve_object_entries_assign_to_string" })).toString());
const unused_promise_resolve_object_entries_from_entries_join_call = Promise.resolve(Object.entries(Object.fromEntries<{ dead_promise_resolve_object_entries_from_entries_join: string }>([["dead_promise_resolve_object_entries_from_entries_join", "dead_promise_resolve_object_entries_from_entries_join"]])).join("|"));
const unused_promise_resolve_object_values_freeze_call = Promise.resolve(Object.values(Object.freeze({ dead_promise_resolve_object_values_freeze: "dead_promise_resolve_object_values_freeze" }))[0]);
const unused_promise_resolve_object_entries_freeze_call = Promise.resolve(Object.entries(Object.freeze({ dead_promise_resolve_object_entries_freeze: "dead_promise_resolve_object_entries_freeze" }))[0][1]);
const dead_promise_resolve_array_spread_source = ["dead_promise_resolve_array_spread"];
const unused_promise_resolve_array_spread_call = Promise.resolve([0, ...dead_promise_resolve_array_spread_source][1]);
const unused_promise_resolve_string_spread_call = Promise.resolve([..."dead_promise_resolve_string_spread"][2]);
const unused_promise_resolve_array_element_call = Promise.resolve(["dead_promise_resolve_array_element"][0]);
const unused_promise_resolve_array_element_oob_call = Promise.resolve(["dead_promise_resolve_array_element_oob"][4]);
const unused_promise_resolve_date_getter_call = Promise.resolve(new Date("2101-01-02T03:04:05Z").getTime("dead_promise_resolve_date_getter_ignored"));
const unused_promise_resolve_date_string_call = Promise.resolve(new Date("2101-02-03T04:05:06Z").toUTCString("dead_promise_resolve_date_string_ignored"));
const unused_promise_resolve_date_to_utc_string_length_read = Promise.resolve(new Date("2101-03-04T05:06:07Z").toUTCString().length);
const unused_promise_resolve_date_to_date_string_upper_call = Promise.resolve((new Date("2101-04-05T06:07:08Z").toDateString().toUpperCase(), "dead_promise_resolve_date_to_date_string_upper_call_marker"));
const unused_promise_resolve_date_to_time_string_index_read = Promise.resolve((new Date("2101-05-06T07:08:09Z").toTimeString()[0], "dead_promise_resolve_date_to_time_string_index_read_marker"));
const unused_promise_resolve_error_string_call = Promise.resolve(new Error("dead_promise_resolve_error_message").toString("dead_promise_resolve_error_ignored"));
const unused_promise_resolve_aggregate_error_string_call = Promise.resolve(new AggregateError(["dead_promise_resolve_aggregate_error_item"], "dead_promise_resolve_aggregate_error_message").toLocaleString("dead_promise_resolve_aggregate_error_ignored"));
const unused_promise_resolve_error_to_string_length_read = Promise.resolve(new Error("dead_promise_resolve_error_to_string_length_read").toString().length);
const unused_promise_resolve_error_to_locale_upper_call = Promise.resolve((new TypeError("dead_promise_resolve_error_to_locale_upper_call").toLocaleString().toUpperCase(), "dead_promise_resolve_error_to_locale_upper_call_marker"));
const unused_promise_resolve_aggregate_error_to_string_index_read = Promise.resolve((new AggregateError(["dead_promise_resolve_aggregate_error_to_string_index_item"], "dead_promise_resolve_aggregate_error_to_string_index_read").toString()[0], "dead_promise_resolve_aggregate_error_to_string_index_read_marker"));
const unused_promise_resolve_error_message_read = Promise.resolve(new Error("dead_promise_resolve_error_message_read").message);
const unused_promise_resolve_type_error_name_read = Promise.resolve(new TypeError("dead_promise_resolve_type_error_name_read").name);
const unused_promise_resolve_error_message_length_read = Promise.resolve(new Error("dead_promise_resolve_error_message_length_read").message.length);
const unused_promise_resolve_error_name_upper_call = Promise.resolve((new TypeError("dead_promise_resolve_error_name_upper_call").name.toUpperCase(), "dead_promise_resolve_error_name_upper_call_marker"));
const unused_promise_resolve_error_message_index_read = Promise.resolve((new SyntaxError("dead_promise_resolve_error_message_index_read").message[0], "dead_promise_resolve_error_message_index_read_marker"));
const unused_promise_resolve_regexp_source_read = Promise.resolve(/dead_promise_resolve_regexp_source_read/gi.source);
const unused_promise_resolve_regexp_global_read = Promise.resolve(new RegExp("dead_promise_resolve_regexp_global_read", "g").global);
const unused_promise_resolve_regexp_source_length_read = Promise.resolve(/dead_promise_resolve_regexp_source_length_read/gi.source.length);
const unused_promise_resolve_regexp_flags_upper_call = Promise.resolve((new RegExp("dead_promise_resolve_regexp_flags_upper_call", "ms").flags.toUpperCase(), "dead_promise_resolve_regexp_flags_upper_call_marker"));
const unused_promise_resolve_regexp_source_index_read = Promise.resolve((/dead_promise_resolve_regexp_source_index_read/.source[0], "dead_promise_resolve_regexp_source_index_read_marker"));
const unused_promise_resolve_regexp_to_string_length_read = Promise.resolve(/dead_promise_resolve_regexp_to_string_length_read/.toString().length);
const unused_promise_resolve_regexp_to_locale_upper_call = Promise.resolve((new RegExp("dead_promise_resolve_regexp_to_locale_upper_call", "i").toLocaleString().toUpperCase(), "dead_promise_resolve_regexp_to_locale_upper_call_marker"));
const unused_promise_resolve_regexp_to_string_index_read = Promise.resolve((/dead_promise_resolve_regexp_to_string_index_read/.toString()[0], "dead_promise_resolve_regexp_to_string_index_read_marker"));
const unused_promise_resolve_symbol_description_read = Promise.resolve(Symbol("dead_promise_resolve_symbol_description_read").description);
const unused_promise_resolve_symbol_description_length_read = Promise.resolve(Symbol("dead_promise_resolve_symbol_description_length_read").description!.length);
const unused_promise_resolve_symbol_to_string_upper_call = Promise.resolve((Symbol("dead_promise_resolve_symbol_to_string_upper_call").toString().toUpperCase(), "dead_promise_resolve_symbol_to_string_upper_call_marker"));
const unused_promise_resolve_well_known_symbol_description_index_read = Promise.resolve((Symbol.iterator.description![0], "dead_promise_resolve_well_known_symbol_description_index_read_marker"));
const unused_promise_resolve_number_to_string_length_read = Promise.resolve((456).toString().length + "dead_promise_resolve_number_to_string_length_read".length);
const unused_promise_resolve_boolean_to_locale_upper_call = Promise.resolve(((false).toLocaleString().toUpperCase(), "dead_promise_resolve_boolean_to_locale_upper_call_marker"));
const unused_promise_resolve_bigint_to_string_index_read = Promise.resolve(((456n).toString()[0], "dead_promise_resolve_bigint_to_string_index_read_marker"));
const unused_promise_resolve_object_prototype_to_string_length_read = Promise.resolve(Object.prototype.toString.call({ dead_promise_resolve_object_prototype_to_string_length_target: 1 }).length + "dead_promise_resolve_object_prototype_to_string_length_read".length);
const unused_promise_resolve_object_prototype_to_string_upper_call = Promise.resolve((Object.prototype.toString.call(["dead_promise_resolve_object_prototype_to_string_upper_target"]).toUpperCase(), "dead_promise_resolve_object_prototype_to_string_upper_call_marker"));
const unused_promise_resolve_object_prototype_to_string_index_read = Promise.resolve((Object.prototype.toString.call(null)[0], "dead_promise_resolve_object_prototype_to_string_index_read_marker"));
const unused_promise_resolve_object_prototype_to_locale_length_read = Promise.resolve(Object.prototype.toLocaleString.call("dead_promise_resolve_object_prototype_to_locale_length").length + "dead_promise_resolve_object_prototype_to_locale_length_read".length);
const unused_promise_resolve_object_prototype_to_locale_upper_call = Promise.resolve((Object.prototype.toLocaleString.call(false).toUpperCase(), "dead_promise_resolve_object_prototype_to_locale_upper_call_marker"));
const unused_promise_resolve_object_prototype_to_locale_index_read = Promise.resolve((Object.prototype.toLocaleString.call(789n)[0], "dead_promise_resolve_object_prototype_to_locale_index_read_marker"));
const unused_promise_resolve_object_prototype_to_string_call = Promise.resolve(Object.prototype.toString.call({ dead_promise_resolve_object_prototype_to_string_call: 1 }));
const unused_promise_resolve_object_prototype_to_locale_call = Promise.resolve(Object.prototype.toLocaleString.call("dead_promise_resolve_object_prototype_to_locale_call"));
const unused_promise_resolve_parser_call = Promise.resolve(parseInt("456789", 10));
const unused_promise_resolve_number_parse_call = Promise.resolve(Number.parseInt("dead_promise_resolve_number_parse", 10));
const unused_promise_resolve_number_predicate_call = Promise.resolve(Number.isSafeInteger("dead_promise_resolve_number_predicate".length));
const unused_promise_resolve_uri_call = Promise.resolve(encodeURIComponent("dead promise resolve uri"));
const unused_promise_resolve_uri_length_read = Promise.resolve(encodeURI("dead promise resolve uri length").length);
const unused_promise_resolve_uri_upper_call = Promise.resolve((decodeURIComponent("dead-promise-resolve-uri-upper").toUpperCase(), "dead_promise_resolve_uri_upper_call_marker"));
const unused_promise_resolve_uri_index_read = Promise.resolve((encodeURIComponent("dead promise resolve uri index")[0], "dead_promise_resolve_uri_index_read_marker"));
const unused_promise_resolve_math_call = Promise.resolve(Math.hypot("dead_promise_resolve_math".length, 4));
const unused_encode_uri_call = encodeURI("dead encode uri");
const unused_encode_uri_component_call = encodeURIComponent(unused_uri_source);
const unused_decode_uri_call = decodeURI("dead-decode-uri");
const unused_decode_uri_component_call = decodeURIComponent("dead-decode-uri-component");
const unused_encode_uri_length_read = encodeURI("dead encode uri length").length;
const unused_decode_uri_upper_call = (decodeURIComponent("dead-decode-uri-upper").toUpperCase(), "dead_decode_uri_upper_call_marker".length);
const unused_encode_uri_component_index_read = (encodeURIComponent("dead encode uri component index")[0], "dead_encode_uri_component_index_read_marker".length);
const unused_bigint_constructor_string_call = BigInt("123456");
const unused_bigint_constructor_number_call = BigInt(42);
const unused_bigint_constructor_boolean_call = BigInt(true);
const unused_regexp_constructor_call = RegExp("dead_regexp_constructor", "g");
const unused_new_regexp_constructor_call = new RegExp("dead_new_regexp_constructor");
const unused_regexp_test_call = /dead_regexp_test/.test("dead_regexp_test_input");
const unused_regexp_exec_call = RegExp("dead_regexp_exec").exec("dead_regexp_exec_input");
const unused_regexp_to_string_call = /dead_regexp_to_string/.toString();
const unused_regexp_to_locale_string_call = new RegExp("dead_regexp_to_locale_string").toLocaleString();
const unused_regexp_value_of_call = /dead_regexp_value_of/.valueOf();
const unused_symbol_constructor_call = Symbol("dead_symbol_constructor");
const unused_string_char_at_call = "dead_string_char_at".charAt(1);
const unused_string_index_of_call = "dead_string_index_of".indexOf("string");
const unused_string_slice_call = "dead_string_slice".slice(1, 4);
const unused_string_case_call = "dead_string_case".toUpperCase();
const unused_const_string_trim_call = unused_string_method_source.trim();
const unused_string_normalize_call = "dead_string_normalize".normalize("NFC");
const unused_string_repeat_call = "dead_string_repeat".repeat(2);
const unused_string_pad_call = "dead_string_pad".padStart(18, ".");
const unused_string_replace_call = "dead_string_replace".replace("replace", "replacement");
const unused_string_replace_all_call = "dead_string_replace_all".replaceAll("dead", "replacement");
const unused_string_replace_regex_call = "dead_string_replace_regex".replace(/replace_regex/, "replacement");
const unused_string_replace_all_regex_call = "dead_string_replace_all_regex".replaceAll(/replace_all_regex/g, "replacement");
const unused_string_split_call = "dead_string_split,dead_string_split_tail".split(",", 1);
const unused_string_split_regex_call = "dead_string_split_regex dead_string_split_regex_tail".split(/\\s+/, 1);
const unused_string_match_call = "dead_string_match".match("string_match");
const unused_string_match_all_call = "dead_string_match_all".matchAll("string_match_all");
const unused_string_search_call = "dead_string_search".search("string_search");
const unused_array_slice_call = ["dead_array_slice"].slice(0, 1);
const unused_array_at_call = ["dead_array_at"].at(0);
const unused_array_includes_call = ["dead_array_includes"].includes("dead_array_includes");
const unused_array_keys_method_call = ["dead_array_keys_method"].keys();
const unused_array_values_method_call = ["dead_array_values_method"].values();
const unused_array_entries_method_call = ["dead_array_entries_method"].entries();
const unused_array_concat_call = ["dead_array_concat"].concat(["dead_array_concat_tail"]);
const unused_array_flat_call = [["dead_array_flat"]].flat();
const unused_array_join_call = ["dead_array_join", "dead_array_join_tail"].join("|");
const unused_array_pop_call = ["dead_array_pop"].pop();
const unused_array_shift_call = ["dead_array_shift"].shift();
const unused_promise_resolve_array_of_pop_call = Promise.resolve(Array.of("dead_promise_resolve_array_of_pop").pop());
const unused_promise_resolve_array_from_shift_call = Promise.resolve(Array.from(["dead_promise_resolve_array_from_shift"]).shift());
const unused_array_reverse_call = ["dead_array_reverse"].reverse();
const unused_object_keys_reverse_call = Object.keys({ dead_object_keys_reverse: 1 }).reverse();
const unused_object_values_pop_call = Object.values({ dead_object_values_pop: "dead_object_values_pop" }).pop();
const unused_array_from_set_shift_call = Array.from(new Set(["dead_array_from_set_shift"])).shift();
const unused_array_fill_call = ["dead_array_fill", "dead_array_fill_tail"].fill("dead_array_fill_value", 0, 1);
const unused_array_copy_within_call = ["dead_array_copy_within", "dead_array_copy_within_tail"].copyWithin(0, 1);
const unused_promise_resolve_array_of_fill_length = Promise.resolve(Array.of("dead_promise_resolve_array_of_fill_length", "dead_promise_resolve_array_of_fill_length_tail").fill("dead_promise_resolve_array_of_fill_length_value").length);
const unused_promise_resolve_array_of_copy_within_length = Promise.resolve(Array.of("dead_promise_resolve_array_of_copy_within_length", "dead_promise_resolve_array_of_copy_within_length_tail").copyWithin(0, 1).length);
const unused_promise_resolve_array_of_fill_absent_element = Promise.resolve(Array.of("dead_promise_resolve_array_of_fill_absent_element", "dead_promise_resolve_array_of_fill_absent_element_tail").fill("dead_promise_resolve_array_of_fill_absent_element_value")[2]);
const unused_promise_resolve_array_of_fill_element = Promise.resolve(Array.of("dead_promise_resolve_array_of_fill_element", "dead_promise_resolve_array_of_fill_element_old").fill("dead_promise_resolve_array_of_fill_element_value", 1, 2)[1]);
const unused_promise_resolve_array_of_fill_retained_element = Promise.resolve(Array.of("dead_promise_resolve_array_of_fill_retained_element", "dead_promise_resolve_array_of_fill_retained_element_old").fill("dead_promise_resolve_array_of_fill_retained_element_value", 1, 2)[0]);
const unused_promise_resolve_array_of_copy_within_absent_element = Promise.resolve(Array.of("dead_promise_resolve_array_of_copy_within_absent_element", "dead_promise_resolve_array_of_copy_within_absent_element_tail").copyWithin(0, 1)[2]);
const unused_promise_resolve_array_of_copy_within_element = Promise.resolve(Array.of("dead_promise_resolve_array_of_copy_within_element", "dead_promise_resolve_array_of_copy_within_element_hit", "dead_promise_resolve_array_of_copy_within_element_tail").copyWithin(0, 1, 2)[0]);
const unused_promise_resolve_array_of_copy_within_retained_element = Promise.resolve(Array.of("dead_promise_resolve_array_of_copy_within_retained_element", "dead_promise_resolve_array_of_copy_within_retained_element_hit", "dead_promise_resolve_array_of_copy_within_retained_element_tail").copyWithin(0, 1, 2)[2]);
const unused_promise_resolve_array_of_to_spliced_length = Promise.resolve(Array.of("dead_promise_resolve_array_of_to_spliced_length", "dead_promise_resolve_array_of_to_spliced_length_tail").toSpliced(1, 1, "dead_promise_resolve_array_of_to_spliced_length_insert", "dead_promise_resolve_array_of_to_spliced_length_insert_tail").length);
const unused_promise_resolve_array_of_to_spliced_absent_element = Promise.resolve(Array.of("dead_promise_resolve_array_of_to_spliced_absent_element", "dead_promise_resolve_array_of_to_spliced_absent_element_tail").toSpliced(1, 1, "dead_promise_resolve_array_of_to_spliced_absent_element_insert")[2]);
const unused_promise_resolve_array_of_to_spliced_insert_element = Promise.resolve(Array.of("dead_promise_resolve_array_of_to_spliced_insert_element", "dead_promise_resolve_array_of_to_spliced_insert_element_deleted", "dead_promise_resolve_array_of_to_spliced_insert_element_tail").toSpliced(1, 1, "dead_promise_resolve_array_of_to_spliced_insert_element_insert")[1]);
const unused_promise_resolve_array_of_to_spliced_tail_element = Promise.resolve(Array.of("dead_promise_resolve_array_of_to_spliced_tail_element", "dead_promise_resolve_array_of_to_spliced_tail_element_deleted", "dead_promise_resolve_array_of_to_spliced_tail_element_tail").toSpliced(1, 1, "dead_promise_resolve_array_of_to_spliced_tail_element_insert")[2]);
const unused_promise_resolve_array_of_slice_length = Promise.resolve(Array.of("dead_promise_resolve_array_of_slice_length", "dead_promise_resolve_array_of_slice_length_tail", "dead_promise_resolve_array_of_slice_length_extra").slice(1, 2).length);
const unused_promise_resolve_array_of_slice_absent_element = Promise.resolve(Array.of("dead_promise_resolve_array_of_slice_absent_element", "dead_promise_resolve_array_of_slice_absent_element_tail", "dead_promise_resolve_array_of_slice_absent_element_extra").slice(-2, -1)[1]);
const unused_promise_resolve_array_of_slice_element = Promise.resolve(Array.of("dead_promise_resolve_array_of_slice_element", "dead_promise_resolve_array_of_slice_element_hit", "dead_promise_resolve_array_of_slice_element_tail").slice(1, 3)[0]);
const unused_promise_resolve_array_of_concat_length = Promise.resolve(Array.of("dead_promise_resolve_array_of_concat_length").concat(Array.of("dead_promise_resolve_array_of_concat_length_arg", "dead_promise_resolve_array_of_concat_length_arg_tail")).length);
const unused_promise_resolve_array_of_concat_absent_element = Promise.resolve(Array.of("dead_promise_resolve_array_of_concat_absent_element").concat(Array.of("dead_promise_resolve_array_of_concat_absent_element_arg", "dead_promise_resolve_array_of_concat_absent_element_arg_tail"))[3]);
const unused_promise_resolve_array_of_concat_element = Promise.resolve(Array.of("dead_promise_resolve_array_of_concat_element").concat(Array.of("dead_promise_resolve_array_of_concat_element_hit", "dead_promise_resolve_array_of_concat_element_tail"))[1]);
const unused_promise_resolve_array_of_flat_zero_length = Promise.resolve(Array.of("dead_promise_resolve_array_of_flat_zero_length", "dead_promise_resolve_array_of_flat_zero_length_tail").flat(0).length);
const unused_promise_resolve_array_of_flat_zero_absent_element = Promise.resolve(Array.of("dead_promise_resolve_array_of_flat_zero_absent_element", "dead_promise_resolve_array_of_flat_zero_absent_element_tail").flat(0)[2]);
const unused_promise_resolve_array_of_flat_zero_element = Promise.resolve(Array.of("dead_promise_resolve_array_of_flat_zero_element", "dead_promise_resolve_array_of_flat_zero_element_hit").flat(0)[1]);
const unused_promise_resolve_array_of_sort_length = Promise.resolve(Array.of("dead_promise_resolve_array_of_sort_length_b", "dead_promise_resolve_array_of_sort_length_a").sort().length);
const unused_promise_resolve_array_of_to_sorted_absent_element = Promise.resolve(Array.of("dead_promise_resolve_array_of_to_sorted_absent_element_b", "dead_promise_resolve_array_of_to_sorted_absent_element_a").toSorted()[2]);
const unused_promise_resolve_array_of_sort_element = Promise.resolve(Array.of("dead_promise_resolve_array_of_sort_element_b", "dead_promise_resolve_array_of_sort_element_a").sort()[0]);
const unused_promise_resolve_array_of_to_sorted_element = Promise.resolve(Array.of("dead_promise_resolve_array_of_to_sorted_element_b", "dead_promise_resolve_array_of_to_sorted_element_a").toSorted()[0]);
const unused_promise_resolve_array_of_reverse_element = Promise.resolve(Array.of("dead_promise_resolve_array_of_reverse_element", "dead_promise_resolve_array_of_reverse_element_hit").reverse()[0]);
const unused_promise_resolve_array_of_to_reversed_element = Promise.resolve(Array.of("dead_promise_resolve_array_of_to_reversed_element", "dead_promise_resolve_array_of_to_reversed_element_hit").toReversed()[0]);
const unused_promise_resolve_array_of_with_element = Promise.resolve(Array.of("dead_promise_resolve_array_of_with_element", "dead_promise_resolve_array_of_with_element_old").with(1, "dead_promise_resolve_array_of_with_element_replacement")[1]);
const unused_promise_resolve_array_of_with_retained_element = Promise.resolve(Array.of("dead_promise_resolve_array_of_with_retained_element", "dead_promise_resolve_array_of_with_retained_element_old").with(1, "dead_promise_resolve_array_of_with_retained_element_replacement")[0]);
const unused_promise_resolve_array_of_keys_element = Promise.resolve(Array.of("dead_promise_resolve_array_of_keys_element", "dead_promise_resolve_array_of_keys_element_tail").keys()[1]);
const unused_promise_resolve_array_of_values_element = Promise.resolve(Array.of("dead_promise_resolve_array_of_values_element", "dead_promise_resolve_array_of_values_element_hit").values()[1]);
const unused_promise_resolve_array_of_entries_key = Promise.resolve(Array.of("dead_promise_resolve_array_of_entries_key", "dead_promise_resolve_array_of_entries_key_tail").entries()[1][0]);
const unused_promise_resolve_array_of_entries_value = Promise.resolve(Array.of("dead_promise_resolve_array_of_entries_value", "dead_promise_resolve_array_of_entries_value_hit").entries()[1][1]);
const unused_array_push_call = ["dead_array_push"].push("dead_array_push_value");
const unused_array_unshift_call = ["dead_array_unshift"].unshift("dead_array_unshift_value");
const unused_object_keys_fill_call = Object.keys({ dead_object_keys_fill: 1 }).fill("dead_object_keys_fill_value");
const unused_object_values_copy_within_call = Object.values({ dead_object_values_copy_within: "dead_object_values_copy_within" }).copyWithin(0, 0);
const unused_array_from_set_push_call = Array.from(new Set(["dead_array_from_set_push"])).push("dead_array_from_set_push_value");
const unused_array_from_unshift_call = Array.from(["dead_array_from_unshift"]).unshift("dead_array_from_unshift_value");
const unused_array_sort_call = ["dead_array_sort_b", "dead_array_sort_a"].sort();
const unused_object_keys_sort_call = Object.keys({ dead_object_keys_sort: 1 }).sort();
const unused_object_values_sort_call = Object.values({ dead_object_values_sort: "dead_object_values_sort" }).sort();
const unused_array_from_set_sort_call = Array.from(new Set(["dead_array_from_set_sort"])).sort();
const unused_array_sort_comparator_call = [1].sort((a, b) => "dead_array_sort_comparator".length + a - b);
const unused_array_of_sort_comparator_call = Array.of("dead_array_of_sort_comparator").sort((a, b) => "dead_array_of_sort_comparator".length + a.localeCompare(b));
const unused_array_from_sort_comparator_call = Array.from(["dead_array_from_sort_comparator"]).sort((a, b) => "dead_array_from_sort_comparator".length + a.localeCompare(b));
const unused_array_from_set_sort_comparator_call = Array.from(new Set(["dead_array_from_set_sort_comparator"])).sort((a, b) => "dead_array_from_set_sort_comparator".length + a.localeCompare(b));
const unused_array_from_map_sort_comparator_call = Array.from(new Map([["dead_array_from_map_sort_comparator_key", "dead_array_from_map_sort_comparator_value"]])).sort((a, b) => "dead_array_from_map_sort_comparator".length + a[0].localeCompare(b[0]));
const unused_object_keys_sort_comparator_call = Object.keys({ dead_object_keys_sort_comparator: 1 }).sort((a, b) => "dead_object_keys_sort_comparator".length + a.localeCompare(b));
const unused_object_keys_array_sort_comparator_call = Object.keys(["dead_object_keys_array_sort_comparator"]).sort((a, b) => "dead_object_keys_array_sort_comparator".length + a.localeCompare(b));
const unused_object_property_names_sort_comparator_call = Object.getOwnPropertyNames({ dead_object_property_names_sort_comparator: 1 }).sort((a, b) => "dead_object_property_names_sort_comparator".length + a.localeCompare(b));
const unused_object_values_sort_comparator_call = Object.values({ dead_object_values_sort_comparator: "dead_object_values_sort_comparator" }).sort((a, b) => "dead_object_values_sort_comparator".length + a.localeCompare(b));
const unused_object_entries_sort_comparator_call = Object.entries({ dead_object_entries_sort_comparator: "dead_object_entries_sort_comparator" }).sort((a, b) => "dead_object_entries_sort_comparator".length + a[0].localeCompare(b[0]));
const unused_reflect_own_keys_sort_comparator_call = Reflect.ownKeys({ dead_reflect_own_keys_sort_comparator: 1 }).sort((a, b) => "dead_reflect_own_keys_sort_comparator".length + a.localeCompare(b));
const unused_empty_array_map_call = [].map(() => "dead_empty_array_map");
const unused_array_of_empty_map_call = Array.of<string>().map(() => "dead_array_of_empty_map");
const unused_array_from_empty_filter_call = Array.from([] as string[]).filter(() => "dead_array_from_empty_filter".length > 0);
const unused_array_from_empty_set_map_call = Array.from(new Set<string>()).map(() => "dead_array_from_empty_set_map");
const unused_array_from_empty_map_map_call = Array.from(new Map<string, string>()).map(() => "dead_array_from_empty_map_map");
const unused_array_from_object_keys_empty_set_mapper_call = Array.from(new Set(Object.keys({})), (value) => value + "dead_array_from_object_keys_empty_set_mapper");
const unused_array_from_object_entries_empty_map_mapper_call = Array.from(new Map(Object.entries({})), (entry) => entry[0] + "dead_array_from_object_entries_empty_map_mapper");
const unused_object_keys_empty_map_call = Object.keys({}).map(() => "dead_object_keys_empty_map");
const unused_object_keys_array_empty_map_call = Object.keys([] as string[]).map(() => "dead_object_keys_array_empty_map");
const unused_object_property_names_empty_map_call = Object.getOwnPropertyNames({}).map(() => "dead_object_property_names_empty_map");
const unused_object_values_empty_map_call = Object.values({}).map(() => "dead_object_values_empty_map");
const unused_object_entries_empty_map_call = Object.entries({}).map(() => "dead_object_entries_empty_map");
const unused_reflect_own_keys_empty_map_call = Reflect.ownKeys({}).map(() => "dead_reflect_own_keys_empty_map");
const unused_empty_array_flat_map_call = [].flatMap(() => ["dead_empty_array_flat_map"]);
const unused_empty_array_filter_call = [].filter(() => "dead_empty_array_filter".length > 0);
const unused_empty_array_for_each_call = [].forEach(() => "dead_empty_array_for_each");
const unused_array_from_empty_for_each_call = Array.from("").forEach(() => "dead_array_from_empty_for_each");
const unused_empty_array_some_call = [].some(() => "dead_empty_array_some".length > 0);
const unused_array_of_empty_some_call = Array.of<string>().some(() => "dead_array_of_empty_some".length > 0);
const unused_empty_array_every_call = [].every(() => "dead_empty_array_every".length > 0);
const unused_empty_array_find_call = [].find(() => "dead_empty_array_find".length > 0);
const unused_empty_array_find_index_call = [].findIndex(() => "dead_empty_array_find_index".length > 0);
const unused_empty_array_find_last_call = [].findLast(() => "dead_empty_array_find_last".length > 0);
const unused_empty_array_find_last_index_call = [].findLastIndex(() => "dead_empty_array_find_last_index".length > 0);
const unused_empty_array_reduce_call = [].reduce((acc: number) => acc + "dead_empty_array_reduce".length, 0);
const unused_array_from_empty_reduce_call = Array.from([] as number[]).reduce((acc: number) => acc + "dead_array_from_empty_reduce".length, 0);
const unused_empty_array_reduce_right_call = [].reduceRight((acc: number) => acc + "dead_empty_array_reduce_right".length, 0);
const unused_array_to_sorted_call = ["dead_array_to_sorted"].toSorted();
const unused_array_to_sorted_comparator_call = [1].toSorted((a, b) => "dead_array_to_sorted_comparator".length + a - b);
const unused_array_of_to_sorted_comparator_call = Array.of("dead_array_of_to_sorted_comparator").toSorted((a, b) => "dead_array_of_to_sorted_comparator".length + a.localeCompare(b));
const unused_array_from_string_to_sorted_comparator_call = Array.from("x").toSorted((a, b) => "dead_array_from_string_to_sorted_comparator".length + a.localeCompare(b));
const unused_array_from_set_to_sorted_comparator_call = Array.from(new Set(["dead_array_from_set_to_sorted_comparator"])).toSorted((a, b) => "dead_array_from_set_to_sorted_comparator".length + a.localeCompare(b));
const unused_array_from_map_to_sorted_comparator_call = Array.from(new Map([["dead_array_from_map_to_sorted_comparator_key", "dead_array_from_map_to_sorted_comparator_value"]])).toSorted((a, b) => "dead_array_from_map_to_sorted_comparator".length + a[0].localeCompare(b[0]));
const unused_object_keys_array_to_sorted_comparator_call = Object.keys(["dead_object_keys_array_to_sorted_comparator"]).toSorted((a, b) => "dead_object_keys_array_to_sorted_comparator".length + a.localeCompare(b));
const unused_array_to_spliced_call = ["dead_array_to_spliced"].toSpliced(0, 0, "dead_array_to_spliced_insert");
const unused_array_to_reversed_call = ["dead_array_to_reversed"].toReversed();
const unused_array_with_call = ["dead_array_with", "dead_array_with_tail"].with(1, "dead_array_with_replacement");
const unused_array_of_with_call = Array.of("dead_array_of_with").with(0, "dead_array_of_with_replacement");
const unused_array_from_with_call = Array.from(["dead_array_from_with"]).with(-1, "dead_array_from_with_replacement");
const unused_array_from_set_with_call = Array.from(new Set(["dead_array_from_set_with"])).with(0, "dead_array_from_set_with_replacement");
const unused_promise_resolve_array_of_with_length = Promise.resolve(Array.of("dead_promise_resolve_array_of_with_length").with(0, "dead_promise_resolve_array_of_with_length_replacement").length);
const unused_promise_resolve_array_of_with_absent_element = Promise.resolve(Array.of("dead_promise_resolve_array_of_with_absent_element").with(0, "dead_promise_resolve_array_of_with_absent_element_replacement")[1]);
const unused_array_from_set_multi_with_call = Array.from(new Set(["dead_array_from_set_multi_with", "dead_array_from_set_multi_with_tail"])).with(1, "dead_array_from_set_multi_with_replacement");
const unused_array_from_object_set_multi_with_call = Array.from(new Set<object>([{ label: "dead_array_from_object_set_multi_with" }, { label: "dead_array_from_object_set_multi_with_tail" }])).with(1, { label: "dead_array_from_object_set_multi_with_replacement" });
const dead_array_from_const_object_set_multi_with_value = { label: "dead_array_from_const_object_set_multi_with_value" };
const unused_array_from_const_object_set_multi_with_call = Array.from(new Set<object>([dead_array_from_const_object_set_multi_with_value, dead_array_from_const_object_set_multi_with_value, { label: "dead_array_from_const_object_set_multi_with_tail" }])).with(1, { label: "dead_array_from_const_object_set_multi_with_replacement" });
const dead_array_from_wrapped_const_object_set_multi_with_value = Object.freeze({ label: "dead_array_from_wrapped_const_object_set_multi_with_value" });
const unused_array_from_wrapped_const_object_set_multi_with_call = Array.from(new Set<object>([dead_array_from_wrapped_const_object_set_multi_with_value, dead_array_from_wrapped_const_object_set_multi_with_value, { label: "dead_array_from_wrapped_const_object_set_multi_with_tail" }])).with(1, { label: "dead_array_from_wrapped_const_object_set_multi_with_replacement" });
const unused_array_from_numeric_set_multi_with_call = Array.from(new Set([1, 1, 2])).with(1, "dead_array_from_numeric_set_multi_with_replacement".length);
const unused_array_from_nan_set_with_call = Array.from(new Set([NaN, NaN])).with(0, "dead_array_from_nan_set_with_replacement".length);
const unused_array_from_infinity_set_with_call = Array.from(new Set([Infinity, Infinity])).with(0, "dead_array_from_infinity_set_with_replacement".length);
const unused_array_from_signed_zero_set_with_call = Array.from(new Set([-0, 0])).with(0, "dead_array_from_signed_zero_set_with_replacement".length);
const unused_array_from_boolean_set_multi_with_call = Array.from(new Set([true, true, false])).with(1, "dead_array_from_boolean_set_multi_with_replacement".length > 0);
const unused_array_from_array_of_string_set_multi_with_call = Array.from(new Set(Array.of("dead_array_from_array_of_string_set_multi_with", "dead_array_from_array_of_string_set_multi_with", "dead_array_from_array_of_string_set_multi_with_tail"))).with(1, "dead_array_from_array_of_string_set_multi_with_replacement");
const unused_array_from_array_of_numeric_set_multi_with_call = Array.from(new Set(Array.of(1, 1, 2))).with(1, "dead_array_from_array_of_numeric_set_multi_with_replacement".length);
const unused_array_from_array_of_boolean_set_multi_with_call = Array.from(new Set(Array.of(true, true, false))).with(1, "dead_array_from_array_of_boolean_set_multi_with_replacement".length > 0);
const unused_array_from_array_from_string_set_multi_with_call = Array.from(new Set(Array.from(["dead_array_from_array_from_string_set_multi_with", "dead_array_from_array_from_string_set_multi_with", "dead_array_from_array_from_string_set_multi_with_tail"]))).with(1, "dead_array_from_array_from_string_set_multi_with_replacement");
const unused_array_from_array_from_numeric_set_multi_with_call = Array.from(new Set(Array.from([1, 1, 2]))).with(1, "dead_array_from_array_from_numeric_set_multi_with_replacement".length);
const unused_array_from_array_from_boolean_set_multi_with_call = Array.from(new Set(Array.from([true, true, false]))).with(1, "dead_array_from_array_from_boolean_set_multi_with_replacement".length > 0);
const dead_array_from_array_from_const_string_set_source = ["dead_array_from_array_from_const_string_set_multi_with", "dead_array_from_array_from_const_string_set_multi_with", "dead_array_from_array_from_const_string_set_multi_with_tail"];
const dead_array_from_array_from_const_numeric_set_source = [1, 1, 2];
const dead_array_from_array_from_const_boolean_set_source = [true, true, false];
const unused_array_from_array_from_const_string_set_multi_with_call = Array.from(new Set(Array.from(dead_array_from_array_from_const_string_set_source))).with(1, "dead_array_from_array_from_const_string_set_multi_with_replacement");
const unused_array_from_array_from_const_numeric_set_multi_with_call = Array.from(new Set(Array.from(dead_array_from_array_from_const_numeric_set_source))).with(1, "dead_array_from_array_from_const_numeric_set_multi_with_replacement".length);
const unused_array_from_array_from_const_boolean_set_multi_with_call = Array.from(new Set(Array.from(dead_array_from_array_from_const_boolean_set_source))).with(1, "dead_array_from_array_from_const_boolean_set_multi_with_replacement".length > 0);
const dead_array_from_spread_string_set_source = ["dead_array_from_spread_string_set_multi_with", "dead_array_from_spread_string_set_multi_with_tail"];
const dead_array_from_spread_numeric_set_source = [1, 2];
const dead_array_from_spread_boolean_set_source = [true, false];
const unused_array_from_spread_string_set_multi_with_call = Array.from(new Set(["dead_array_from_spread_string_set_multi_with", ...dead_array_from_spread_string_set_source])).with(1, "dead_array_from_spread_string_set_multi_with_replacement");
const unused_array_from_spread_numeric_set_multi_with_call = Array.from(new Set([1, ...dead_array_from_spread_numeric_set_source])).with(1, "dead_array_from_spread_numeric_set_multi_with_replacement".length);
const unused_array_from_spread_boolean_set_multi_with_call = Array.from(new Set([true, ...dead_array_from_spread_boolean_set_source])).with(1, "dead_array_from_spread_boolean_set_multi_with_replacement".length > 0);
const unused_array_from_object_keys_set_multi_with_call = Array.from(new Set(Object.keys({ dead_array_from_object_keys_set_multi_with: 1, dead_array_from_object_keys_set_multi_with_tail: 2 }))).with(1, "dead_array_from_object_keys_set_multi_with_replacement");
const unused_array_from_object_property_names_set_multi_with_call = Array.from(new Set(Object.getOwnPropertyNames({ dead_array_from_object_property_names_set_multi_with: 1, dead_array_from_object_property_names_set_multi_with_tail: 2 }))).with(1, "dead_array_from_object_property_names_set_multi_with_replacement");
const unused_array_from_reflect_own_keys_set_multi_with_call = Array.from(new Set(Reflect.ownKeys({ dead_array_from_reflect_own_keys_set_multi_with: 1, dead_array_from_reflect_own_keys_set_multi_with_tail: 2 }))).with(1, "dead_array_from_reflect_own_keys_set_multi_with_replacement");
const unused_array_from_object_values_set_multi_with_call = Array.from(new Set(Object.values({ dead_array_from_object_values_set_multi_with_a: "dead_array_from_object_values_set_multi_with", dead_array_from_object_values_set_multi_with_b: "dead_array_from_object_values_set_multi_with", dead_array_from_object_values_set_multi_with_tail: "dead_array_from_object_values_set_multi_with_tail" }))).with(1, "dead_array_from_object_values_set_multi_with_replacement");
const unused_array_from_object_values_numeric_set_multi_with_call = Array.from(new Set(Object.values({ dead_array_from_object_values_numeric_set_multi_with_a: 1, dead_array_from_object_values_numeric_set_multi_with_b: 1, dead_array_from_object_values_numeric_set_multi_with_tail: 2 }))).with(1, "dead_array_from_object_values_numeric_set_multi_with_replacement".length);
const unused_array_from_object_values_boolean_set_multi_with_call = Array.from(new Set(Object.values({ dead_array_from_object_values_boolean_set_multi_with_a: true, dead_array_from_object_values_boolean_set_multi_with_b: true, dead_array_from_object_values_boolean_set_multi_with_tail: false }))).with(1, "dead_array_from_object_values_boolean_set_multi_with_replacement".length > 0);
const unused_array_from_object_values_object_set_multi_with_call = Array.from(new Set<object>(Object.values({ dead_array_from_object_values_object_set_multi_with_a: { value: 1 }, dead_array_from_object_values_object_set_multi_with_tail: { value: 2 } }))).with(1, { value: "dead_array_from_object_values_object_set_multi_with_replacement" });
const dead_array_from_object_values_const_object_set_multi_with_value = { value: "dead_array_from_object_values_const_object_set_multi_with_value" };
const unused_array_from_object_values_const_object_set_multi_with_call = Array.from(new Set<object>(Object.values({ dead_array_from_object_values_const_object_set_multi_with_a: dead_array_from_object_values_const_object_set_multi_with_value, dead_array_from_object_values_const_object_set_multi_with_b: dead_array_from_object_values_const_object_set_multi_with_value, dead_array_from_object_values_const_object_set_multi_with_tail: { value: "dead_array_from_object_values_const_object_set_multi_with_tail" } }))).with(1, { value: "dead_array_from_object_values_const_object_set_multi_with_replacement" });
const dead_array_from_object_values_array_const_object_set_multi_with_value = { value: "dead_array_from_object_values_array_const_object_set_multi_with_value" };
const unused_array_from_object_values_array_const_object_set_multi_with_call = Array.from(new Set<object>(Object.values([dead_array_from_object_values_array_const_object_set_multi_with_value, dead_array_from_object_values_array_const_object_set_multi_with_value, { value: "dead_array_from_object_values_array_const_object_set_multi_with_tail" }]))).with(1, { value: "dead_array_from_object_values_array_const_object_set_multi_with_replacement" });
const unused_array_from_from_entries_values_set_multi_with_call = Array.from(new Set(Object.values(Object.fromEntries<{ dead_array_from_from_entries_values_set_multi_with_a: string; dead_array_from_from_entries_values_set_multi_with_b: string; dead_array_from_from_entries_values_set_multi_with_tail: string }>([["dead_array_from_from_entries_values_set_multi_with_a", "dead_array_from_from_entries_values_set_multi_with"], ["dead_array_from_from_entries_values_set_multi_with_b", "dead_array_from_from_entries_values_set_multi_with"], ["dead_array_from_from_entries_values_set_multi_with_tail", "dead_array_from_from_entries_values_set_multi_with_tail"]])))).with(1, "dead_array_from_from_entries_values_set_multi_with_replacement");
const unused_array_from_from_entries_values_numeric_set_multi_with_call = Array.from(new Set(Object.values(Object.fromEntries<{ dead_array_from_from_entries_values_numeric_set_multi_with_a: number; dead_array_from_from_entries_values_numeric_set_multi_with_b: number; dead_array_from_from_entries_values_numeric_set_multi_with_tail: number }>([["dead_array_from_from_entries_values_numeric_set_multi_with_a", 1], ["dead_array_from_from_entries_values_numeric_set_multi_with_b", 1], ["dead_array_from_from_entries_values_numeric_set_multi_with_tail", 2]])))).with(1, "dead_array_from_from_entries_values_numeric_set_multi_with_replacement".length);
const unused_array_from_from_entries_values_boolean_set_multi_with_call = Array.from(new Set(Object.values(Object.fromEntries<{ dead_array_from_from_entries_values_boolean_set_multi_with_a: boolean; dead_array_from_from_entries_values_boolean_set_multi_with_b: boolean; dead_array_from_from_entries_values_boolean_set_multi_with_tail: boolean }>([["dead_array_from_from_entries_values_boolean_set_multi_with_a", true], ["dead_array_from_from_entries_values_boolean_set_multi_with_b", true], ["dead_array_from_from_entries_values_boolean_set_multi_with_tail", false]])))).with(1, "dead_array_from_from_entries_values_boolean_set_multi_with_replacement".length > 0);
const unused_array_from_from_entries_values_object_set_multi_with_call = Array.from(new Set<object>(Object.values(Object.fromEntries<{ dead_array_from_from_entries_values_object_set_multi_with_a: object; dead_array_from_from_entries_values_object_set_multi_with_tail: object }>([["dead_array_from_from_entries_values_object_set_multi_with_a", { value: 1 }], ["dead_array_from_from_entries_values_object_set_multi_with_tail", { value: 2 }]])))).with(1, { value: "dead_array_from_from_entries_values_object_set_multi_with_replacement" });
const unused_array_from_from_entries_values_const_object_set_multi_with_call = Array.from(new Set<object>(Object.values(Object.fromEntries<{ dead_array_from_from_entries_values_const_object_set_multi_with_a: object; dead_array_from_from_entries_values_const_object_set_multi_with_b: object; dead_array_from_from_entries_values_const_object_set_multi_with_tail: object }>([["dead_array_from_from_entries_values_const_object_set_multi_with_a", dead_array_from_object_values_const_object_set_multi_with_value], ["dead_array_from_from_entries_values_const_object_set_multi_with_b", dead_array_from_object_values_const_object_set_multi_with_value], ["dead_array_from_from_entries_values_const_object_set_multi_with_tail", { value: "dead_array_from_from_entries_values_const_object_set_multi_with_tail" }]])))).with(1, { value: "dead_array_from_from_entries_values_const_object_set_multi_with_replacement" });
const unused_array_from_assign_values_set_multi_with_call = Array.from(new Set(Object.values(Object.assign({} as { dead_array_from_assign_values_set_multi_with_a: string; dead_array_from_assign_values_set_multi_with_b: string; dead_array_from_assign_values_set_multi_with_tail: string }, { dead_array_from_assign_values_set_multi_with_a: "dead_array_from_assign_values_set_multi_with", dead_array_from_assign_values_set_multi_with_b: "dead_array_from_assign_values_set_multi_with" }, { dead_array_from_assign_values_set_multi_with_tail: "dead_array_from_assign_values_set_multi_with_tail" })))).with(1, "dead_array_from_assign_values_set_multi_with_replacement");
const unused_array_from_assign_values_numeric_set_multi_with_call = Array.from(new Set(Object.values(Object.assign({} as { dead_array_from_assign_values_numeric_set_multi_with_a: number; dead_array_from_assign_values_numeric_set_multi_with_b: number; dead_array_from_assign_values_numeric_set_multi_with_tail: number }, { dead_array_from_assign_values_numeric_set_multi_with_a: 1, dead_array_from_assign_values_numeric_set_multi_with_b: 1 }, { dead_array_from_assign_values_numeric_set_multi_with_tail: 2 })))).with(1, "dead_array_from_assign_values_numeric_set_multi_with_replacement".length);
const unused_array_from_assign_values_boolean_set_multi_with_call = Array.from(new Set(Object.values(Object.assign({} as { dead_array_from_assign_values_boolean_set_multi_with_a: boolean; dead_array_from_assign_values_boolean_set_multi_with_b: boolean; dead_array_from_assign_values_boolean_set_multi_with_tail: boolean }, { dead_array_from_assign_values_boolean_set_multi_with_a: true, dead_array_from_assign_values_boolean_set_multi_with_b: true }, { dead_array_from_assign_values_boolean_set_multi_with_tail: false })))).with(1, "dead_array_from_assign_values_boolean_set_multi_with_replacement".length > 0);
const unused_array_from_assign_values_object_set_multi_with_call = Array.from(new Set<object>(Object.values(Object.assign({} as { dead_array_from_assign_values_object_set_multi_with_a: object; dead_array_from_assign_values_object_set_multi_with_tail: object }, { dead_array_from_assign_values_object_set_multi_with_a: { value: 1 } }, { dead_array_from_assign_values_object_set_multi_with_tail: { value: 2 } })))).with(1, { value: "dead_array_from_assign_values_object_set_multi_with_replacement" });
const unused_array_from_assign_values_const_object_set_multi_with_call = Array.from(new Set<object>(Object.values(Object.assign({} as { dead_array_from_assign_values_const_object_set_multi_with_a: object; dead_array_from_assign_values_const_object_set_multi_with_b: object; dead_array_from_assign_values_const_object_set_multi_with_tail: object }, { dead_array_from_assign_values_const_object_set_multi_with_a: dead_array_from_object_values_const_object_set_multi_with_value, dead_array_from_assign_values_const_object_set_multi_with_b: dead_array_from_object_values_const_object_set_multi_with_value }, { dead_array_from_assign_values_const_object_set_multi_with_tail: { value: "dead_array_from_assign_values_const_object_set_multi_with_tail" } })))).with(1, { value: "dead_array_from_assign_values_const_object_set_multi_with_replacement" });
const unused_array_from_object_entries_set_multi_with_call = Array.from(new Set(Object.entries({ dead_array_from_object_entries_set_multi_with: "dead_array_from_object_entries_set_multi_with_value", dead_array_from_object_entries_set_multi_with_tail: "dead_array_from_object_entries_set_multi_with_tail_value" }))).with(1, ["dead_array_from_object_entries_set_multi_with_replacement", "dead_array_from_object_entries_set_multi_with_replacement_value"]);
const unused_array_from_map_with_call = Array.from(new Map([["dead_array_from_map_with", "dead_array_from_map_with_value"]])).with(0, ["dead_array_from_map_with_replacement", "dead_array_from_map_with_replacement_value"]);
const unused_array_from_map_multi_with_call = Array.from(new Map([["dead_array_from_map_multi_with", "dead_array_from_map_multi_with_value"], ["dead_array_from_map_multi_with_tail", "dead_array_from_map_multi_with_tail_value"]])).with(1, ["dead_array_from_map_multi_with_replacement", "dead_array_from_map_multi_with_replacement_value"]);
const unused_array_from_numeric_map_multi_with_call = Array.from(new Map<number, string>([[1, "dead_array_from_numeric_map_multi_with"] as ObjectEntry<string, number>, [1, "dead_array_from_numeric_map_multi_with_overwrite"] as ObjectEntry<string, number>, [2, "dead_array_from_numeric_map_multi_with_tail"] as ObjectEntry<string, number>])).with(1, [2, "dead_array_from_numeric_map_multi_with_replacement"] as ObjectEntry<string, number>);
const unused_array_from_boolean_map_multi_with_call = Array.from(new Map<boolean, string>([[true, "dead_array_from_boolean_map_multi_with"] as ObjectEntry<string, boolean>, [true, "dead_array_from_boolean_map_multi_with_overwrite"] as ObjectEntry<string, boolean>, [false, "dead_array_from_boolean_map_multi_with_tail"] as ObjectEntry<string, boolean>])).with(1, [false, "dead_array_from_boolean_map_multi_with_replacement"] as ObjectEntry<string, boolean>);
const unused_array_from_object_map_multi_with_call = Array.from(new Map<object, string>([[{ id: 1 }, "dead_array_from_object_map_multi_with"] as ObjectEntry<string, object>, [{ id: 2 }, "dead_array_from_object_map_multi_with_tail"] as ObjectEntry<string, object>])).with(1, [{ id: 3 }, "dead_array_from_object_map_multi_with_replacement"] as ObjectEntry<string, object>);
const dead_array_from_const_object_map_multi_with_key = { id: "dead_array_from_const_object_map_multi_with_key" };
const unused_array_from_const_object_map_multi_with_call = Array.from(new Map<object, string>([[dead_array_from_const_object_map_multi_with_key, "dead_array_from_const_object_map_multi_with"] as ObjectEntry<string, object>, [dead_array_from_const_object_map_multi_with_key, "dead_array_from_const_object_map_multi_with_overwrite"] as ObjectEntry<string, object>, [{ id: 2 }, "dead_array_from_const_object_map_multi_with_tail"] as ObjectEntry<string, object>])).with(1, [{ id: 3 }, "dead_array_from_const_object_map_multi_with_replacement"] as ObjectEntry<string, object>);
const dead_array_from_wrapped_const_object_map_multi_with_key = Object.freeze({ id: "dead_array_from_wrapped_const_object_map_multi_with_key" });
const unused_array_from_wrapped_const_object_map_multi_with_call = Array.from(new Map<object, string>([[dead_array_from_wrapped_const_object_map_multi_with_key, "dead_array_from_wrapped_const_object_map_multi_with"] as ObjectEntry<string, object>, [dead_array_from_wrapped_const_object_map_multi_with_key, "dead_array_from_wrapped_const_object_map_multi_with_overwrite"] as ObjectEntry<string, object>, [{ id: 2 }, "dead_array_from_wrapped_const_object_map_multi_with_tail"] as ObjectEntry<string, object>])).with(1, [{ id: 3 }, "dead_array_from_wrapped_const_object_map_multi_with_replacement"] as ObjectEntry<string, object>);
const unused_array_from_object_entries_map_multi_with_call = Array.from(new Map(Object.entries({ dead_array_from_object_entries_map_multi_with: "dead_array_from_object_entries_map_multi_with_value", dead_array_from_object_entries_map_multi_with_tail: "dead_array_from_object_entries_map_multi_with_tail_value" }))).with(1, ["dead_array_from_object_entries_map_multi_with_replacement", "dead_array_from_object_entries_map_multi_with_replacement_value"]);
const unused_array_from_array_of_map_multi_with_call = Array.from(new Map(Array.of(["dead_array_from_array_of_map_multi_with", "dead_array_from_array_of_map_multi_with_value"] as ObjectEntry<string>, ["dead_array_from_array_of_map_multi_with", "dead_array_from_array_of_map_multi_with_overwrite"] as ObjectEntry<string>, ["dead_array_from_array_of_map_multi_with_tail", "dead_array_from_array_of_map_multi_with_tail_value"] as ObjectEntry<string>))).with(1, ["dead_array_from_array_of_map_multi_with_replacement", "dead_array_from_array_of_map_multi_with_replacement_value"]);
const dead_array_from_array_of_const_entry_map_entry_a = ["dead_array_from_array_of_const_entry_map_multi_with", "dead_array_from_array_of_const_entry_map_multi_with_value"] as ObjectEntry<string>;
const dead_array_from_array_of_const_entry_map_entry_b = ["dead_array_from_array_of_const_entry_map_multi_with", "dead_array_from_array_of_const_entry_map_multi_with_overwrite"] as ObjectEntry<string>;
const dead_array_from_array_of_const_entry_map_entry_c = ["dead_array_from_array_of_const_entry_map_multi_with_tail", "dead_array_from_array_of_const_entry_map_multi_with_tail_value"] as ObjectEntry<string>;
const unused_array_from_array_of_const_entry_map_multi_with_call = Array.from(new Map(Array.of(dead_array_from_array_of_const_entry_map_entry_a, dead_array_from_array_of_const_entry_map_entry_b, dead_array_from_array_of_const_entry_map_entry_c))).with(1, ["dead_array_from_array_of_const_entry_map_multi_with_replacement", "dead_array_from_array_of_const_entry_map_multi_with_replacement_value"]);
const dead_array_from_array_from_map_source: ObjectEntry<string>[] = [["dead_array_from_array_from_map_multi_with", "dead_array_from_array_from_map_multi_with_value"], ["dead_array_from_array_from_map_multi_with", "dead_array_from_array_from_map_multi_with_overwrite"], ["dead_array_from_array_from_map_multi_with_tail", "dead_array_from_array_from_map_multi_with_tail_value"]];
const unused_array_from_array_from_map_multi_with_call = Array.from(new Map(Array.from(dead_array_from_array_from_map_source))).with(1, ["dead_array_from_array_from_map_multi_with_replacement", "dead_array_from_array_from_map_multi_with_replacement_value"]);
const dead_array_from_spread_map_source: ObjectEntry<string>[] = [["dead_array_from_spread_map_multi_with", "dead_array_from_spread_map_multi_with_overwrite"], ["dead_array_from_spread_map_multi_with_tail", "dead_array_from_spread_map_multi_with_tail_value"]];
const unused_array_from_spread_map_multi_with_call = Array.from(new Map([["dead_array_from_spread_map_multi_with", "dead_array_from_spread_map_multi_with_value"] as ObjectEntry<string>, ...dead_array_from_spread_map_source])).with(1, ["dead_array_from_spread_map_multi_with_replacement", "dead_array_from_spread_map_multi_with_replacement_value"]);
const unused_object_keys_with_call = Object.keys({ dead_object_keys_with: 1 }).with(0, "dead_object_keys_with_replacement");
const unused_object_keys_array_from_with_call = Object.keys(Array.from(["dead_object_keys_array_from_with"])).with(0, "dead_object_keys_array_from_replacement");
const unused_object_keys_spread_with_call = Object.keys({ ...{ dead_object_keys_spread_with: 1 }, dead_object_keys_spread_with_tail: 2 }).with(1, "dead_object_keys_spread_with_replacement");
const unused_object_keys_array_with_call = Object.keys(["dead_object_keys_array_with"]).with(0, "dead_object_keys_array_with_replacement");
const unused_object_from_entries_empty_map_source = new Map<string, string>();
const unused_object_from_entries_empty_map_copy_source = new Map(unused_object_from_entries_empty_map_source);
const unused_object_keys_from_entries_with_call = Object.keys(Object.fromEntries<{ dead_object_keys_from_entries_with: number; dead_object_keys_from_entries_tail: number }>([["dead_object_keys_from_entries_with", 1], ["dead_object_keys_from_entries_tail", 2]])).with(1, "dead_object_keys_from_entries_replacement");
const unused_object_keys_from_entries_empty_map_const_call = Object.keys(Object.fromEntries(unused_object_from_entries_empty_map_source));
const unused_object_keys_from_entries_empty_map_copy_call = Object.keys(Object.fromEntries(unused_object_from_entries_empty_map_copy_source));
const unused_object_keys_create_descriptor_with_call = Object.keys(Object.create(null, { dead_object_keys_create_descriptor_with: { value: 1, enumerable: true }, dead_object_keys_create_descriptor_tail: { value: 2, enumerable: true } })).with(1, "dead_object_keys_create_descriptor_replacement");
const unused_object_keys_freeze_with_call = Object.keys(Object.freeze({ dead_object_keys_freeze_with: 1, dead_object_keys_freeze_tail: 2 })).with(1, "dead_object_keys_freeze_replacement");
const unused_object_property_names_with_call = Object.getOwnPropertyNames({ dead_object_property_names_with: 1 }).with(0, "dead_object_property_names_with_replacement");
const unused_object_property_names_spread_with_call = Object.getOwnPropertyNames({ ...{ dead_object_property_names_spread_with: 1 }, dead_object_property_names_spread_with_tail: 2 }).with(1, "dead_object_property_names_spread_with_replacement");
const unused_object_property_names_assign_with_call = Object.getOwnPropertyNames(Object.assign({} as { dead_object_property_names_assign_with: number; dead_object_property_names_assign_tail: number }, { dead_object_property_names_assign_with: 1 }, { dead_object_property_names_assign_tail: 2 })).with(1, "dead_object_property_names_assign_replacement");
const unused_object_property_names_define_property_with_call = Object.getOwnPropertyNames(Object.defineProperty({} as { dead_object_property_names_define_property_with: number }, "dead_object_property_names_define_property_with", { value: 1 })).with(0, "dead_object_property_names_define_property_replacement");
const unused_object_property_names_seal_with_call = Object.getOwnPropertyNames(Object.seal({ dead_object_property_names_seal_with: 1, dead_object_property_names_seal_tail: 2 })).with(1, "dead_object_property_names_seal_replacement");
const unused_object_property_names_from_entries_empty_map_const_call = Object.getOwnPropertyNames(Object.fromEntries(unused_object_from_entries_empty_map_source));
const unused_object_property_names_from_entries_empty_map_copy_call = Object.getOwnPropertyNames(Object.fromEntries(unused_object_from_entries_empty_map_copy_source));
const unused_object_values_with_call = Object.values({ dead_object_values_with: "dead_object_values_with" }).with(0, "dead_object_values_with_replacement");
const unused_object_values_array_from_with_call = Object.values(Array.from(["dead_object_values_array_from_with"])).with(0, "dead_object_values_array_from_replacement");
const unused_object_values_spread_with_call = Object.values({ ...{ dead_object_values_spread_with: "dead_object_values_spread_with" }, dead_object_values_spread_with_tail: "dead_object_values_spread_with_tail" }).with(1, "dead_object_values_spread_with_replacement");
const unused_object_values_from_entries_with_call = Object.values(Object.fromEntries<{ dead_object_values_from_entries_with: string; dead_object_values_from_entries_tail: string }>([["dead_object_values_from_entries_with", "dead_object_values_from_entries_with"], ["dead_object_values_from_entries_tail", "dead_object_values_from_entries_tail"]])).with(1, "dead_object_values_from_entries_replacement");
const unused_object_values_from_entries_empty_map_const_call = Object.values(Object.fromEntries(unused_object_from_entries_empty_map_source));
const unused_object_values_from_entries_empty_map_copy_call = Object.values(Object.fromEntries(unused_object_from_entries_empty_map_copy_source));
const unused_object_values_define_properties_with_call = Object.values(Object.defineProperties({} as { dead_object_values_define_properties_with: string; dead_object_values_define_properties_tail: string }, { dead_object_values_define_properties_with: { value: "dead_object_values_define_properties_with", enumerable: true }, dead_object_values_define_properties_tail: { value: "dead_object_values_define_properties_tail", enumerable: true } })).with(1, "dead_object_values_define_properties_replacement");
const unused_object_values_prevent_extensions_with_call = Object.values(Object.preventExtensions({ dead_object_values_prevent_extensions_with: "dead_object_values_prevent_extensions_with", dead_object_values_prevent_extensions_tail: "dead_object_values_prevent_extensions_tail" })).with(1, "dead_object_values_prevent_extensions_replacement");
const unused_object_entries_with_call = Object.entries({ dead_object_entries_with: "dead_object_entries_with" }).with(0, ["dead_object_entries_with_key", "dead_object_entries_with_value"]);
const unused_object_entries_array_from_with_call = Object.entries(Array.from(["dead_object_entries_array_from_with"])).with(0, ["0", "dead_object_entries_array_from_replacement"]);
const unused_object_entries_from_entries_empty_map_const_call = Object.entries(Object.fromEntries(unused_object_from_entries_empty_map_source));
const unused_object_entries_from_entries_empty_map_copy_call = Object.entries(Object.fromEntries(unused_object_from_entries_empty_map_copy_source));
const unused_reflect_own_keys_array_from_with_call = Reflect.ownKeys(Array.from(["dead_reflect_own_keys_array_from_with"])).with(0, "dead_reflect_own_keys_array_from_replacement");
const unused_reflect_own_keys_array_of_call = Reflect.ownKeys(Array.of("dead_reflect_own_keys_array_of"));
const unused_object_entries_spread_with_call = Object.entries({ ...{ dead_object_entries_spread_with: "dead_object_entries_spread_with" }, dead_object_entries_spread_with_tail: "dead_object_entries_spread_with_tail" }).with(1, ["dead_object_entries_spread_with_key", "dead_object_entries_spread_with_value"]);
const unused_object_entries_assign_with_call = Object.entries(Object.assign({} as { dead_object_entries_assign_with: string; dead_object_entries_assign_tail: string }, { dead_object_entries_assign_with: "dead_object_entries_assign_with" }, { dead_object_entries_assign_tail: "dead_object_entries_assign_tail" })).with(1, ["dead_object_entries_assign_key", "dead_object_entries_assign_value"]);
const unused_object_entries_create_descriptor_with_call = Object.entries(Object.create(null, { dead_object_entries_create_descriptor_with: { value: "dead_object_entries_create_descriptor_with", enumerable: true }, dead_object_entries_create_descriptor_tail: { value: "dead_object_entries_create_descriptor_tail", enumerable: true } })).with(1, ["dead_object_entries_create_descriptor_key", "dead_object_entries_create_descriptor_value"]);
const unused_object_entries_set_prototype_with_call = Object.entries(Object.setPrototypeOf({ dead_object_entries_set_prototype_with: "dead_object_entries_set_prototype_with", dead_object_entries_set_prototype_tail: "dead_object_entries_set_prototype_tail" }, null)).with(1, ["dead_object_entries_set_prototype_key", "dead_object_entries_set_prototype_value"]);
const unused_reflect_own_keys_with_call = Reflect.ownKeys({ dead_reflect_own_keys_with: 1 }).with(0, "dead_reflect_own_keys_with_replacement");
const unused_reflect_own_keys_from_entries_empty_map_const_call = Reflect.ownKeys(Object.fromEntries(unused_object_from_entries_empty_map_source));
const unused_reflect_own_keys_from_entries_empty_map_copy_call = Reflect.ownKeys(Object.fromEntries(unused_object_from_entries_empty_map_copy_source));
const unused_reflect_own_keys_spread_with_call = Reflect.ownKeys({ ...{ dead_reflect_own_keys_spread_with: 1 }, dead_reflect_own_keys_spread_with_tail: 2 }).with(1, "dead_reflect_own_keys_spread_with_replacement");
const unused_reflect_own_keys_assign_with_call = Reflect.ownKeys(Object.assign({} as { dead_reflect_own_keys_assign_with: number; dead_reflect_own_keys_assign_tail: number }, { dead_reflect_own_keys_assign_with: 1 }, { dead_reflect_own_keys_assign_tail: 2 })).with(1, "dead_reflect_own_keys_assign_replacement");
const unused_reflect_own_keys_define_properties_with_call = Reflect.ownKeys(Object.defineProperties({} as { dead_reflect_own_keys_define_properties_with: number; dead_reflect_own_keys_define_properties_tail: number }, { dead_reflect_own_keys_define_properties_with: { value: 1 }, dead_reflect_own_keys_define_properties_tail: { value: 2 } })).with(1, "dead_reflect_own_keys_define_properties_replacement");
const unused_reflect_own_keys_freeze_with_call = Reflect.ownKeys(Object.freeze({ dead_reflect_own_keys_freeze_with: 1, dead_reflect_own_keys_freeze_tail: 2 })).with(1, "dead_reflect_own_keys_freeze_replacement");
const unused_array_to_string_call = ["dead_array_to_string", "dead_array_to_string_tail"].toString();
const unused_array_to_locale_string_call = ["dead_array_to_locale_string", "dead_array_to_locale_string_tail"].toLocaleString();
const unused_array_join_length_read = ["dead_array_join_length_read"].join("|").length;
const unused_array_to_string_upper_call = (["dead_array_to_string_upper_call"].toString().toUpperCase(), "dead_array_to_string_upper_call_marker".length);
const unused_array_to_locale_index_read = (["dead_array_to_locale_index_read"].toLocaleString()[0], "dead_array_to_locale_index_read_marker".length);
const unused_array_value_of_call = unused_spread_source_array.valueOf();
Object.keys("kept_object_keys_string_map").map((key) => key + "kept_object_keys_string_map_callback");
Object.getOwnPropertyNames("x").map((key) => key + "kept_object_property_names_string_map_callback");
Object.values("x").map((value) => value + "kept_object_values_string_map_callback");
Object.entries("x").map((entry) => entry[0] + "kept_object_entries_string_map_callback");
Object.keys(["kept_object_keys_array_sort_comparator_a", "kept_object_keys_array_sort_comparator_b"]).sort((a, b) => "kept_object_keys_array_sort_comparator_callback".length + a.localeCompare(b));
Array.from(new Set(["kept_array_from_set_sort_comparator_a", "kept_array_from_set_sort_comparator_b"])).sort((a, b) => "kept_array_from_set_sort_comparator_callback".length + a.localeCompare(b));
const unused_error_constructor = new Error("dead_error_constructor");
const unused_type_error_constructor = new TypeError("dead_type_error_constructor");
const unused_aggregate_error_constructor = new AggregateError(["dead_aggregate_error_item"], "dead_aggregate_error_message", { cause: "dead_aggregate_error_cause" });
const unused_aggregate_error_call = AggregateError(["dead_aggregate_error_call_item"], "dead_aggregate_error_call_message");
const unused_error_message_read = new Error("dead_error_message_read").message;
const unused_type_error_name_read = new TypeError("dead_type_error_name_read").name;
const unused_error_cause_read = new Error("dead_error_cause_read_message", { cause: "dead_error_cause_read" }).cause;
const unused_aggregate_error_errors_read = new AggregateError(["dead_aggregate_error_errors_read"], "dead_aggregate_error_errors_read_message").errors;
const unused_error_message_length_read = new Error("dead_error_message_length_read").message.length;
const unused_error_name_upper_call = (new TypeError("dead_error_name_upper_call").name.toUpperCase(), "dead_error_name_upper_call_marker".length);
const unused_error_message_index_read = (new SyntaxError("dead_error_message_index_read").message[0], "dead_error_message_index_read_marker".length);
const unused_error_to_string_length_read = new Error("dead_error_to_string_length_read").toString().length;
const unused_error_to_locale_upper_call = (new TypeError("dead_error_to_locale_upper_call").toLocaleString().toUpperCase(), "dead_error_to_locale_upper_call_marker".length);
const unused_aggregate_error_to_string_index_read = (new AggregateError(["dead_aggregate_error_to_string_index_item"], "dead_aggregate_error_to_string_index_read").toString()[0], "dead_aggregate_error_to_string_index_read_marker".length);
const unused_regexp_source_read = /dead_regexp_source_read/gi.source;
const unused_regexp_flags_read = new RegExp("dead_regexp_flags_read", "ms").flags;
const unused_regexp_boolean_read = /dead_regexp_boolean_read/y.sticky;
const unused_regexp_source_length_read = /dead_regexp_source_length_read/gi.source.length;
const unused_regexp_flags_upper_call = (new RegExp("dead_regexp_flags_upper_call", "ms").flags.toUpperCase(), "dead_regexp_flags_upper_call_marker".length);
const unused_regexp_source_index_read = (/dead_regexp_source_index_read/.source[0], "dead_regexp_source_index_read_marker".length);
const unused_regexp_to_string_length_read = /dead_regexp_to_string_length_read/.toString().length;
const unused_regexp_to_locale_upper_call = (new RegExp("dead_regexp_to_locale_upper_call", "i").toLocaleString().toUpperCase(), "dead_regexp_to_locale_upper_call_marker".length);
const unused_regexp_to_string_index_read = (/dead_regexp_to_string_index_read/.toString()[0], "dead_regexp_to_string_index_read_marker".length);
const unused_symbol_description_read = Symbol("dead_symbol_description_read").description;
const unused_symbol_description_length_read = Symbol("dead_symbol_description_length_read").description!.length;
const unused_symbol_to_locale_upper_call = (Symbol("dead_symbol_to_locale_upper_call").toLocaleString().toUpperCase(), "dead_symbol_to_locale_upper_call_marker".length);
const unused_well_known_symbol_description_index_read = (Symbol.asyncIterator.description![0], "dead_well_known_symbol_description_index_read_marker".length);
const unused_number_to_string_length_read = (123).toString().length + "dead_number_to_string_length_read".length;
const unused_boolean_to_locale_upper_call = ((true).toLocaleString().toUpperCase(), "dead_boolean_to_locale_upper_call_marker".length);
const unused_bigint_to_string_index_read = ((123n).toString()[0], "dead_bigint_to_string_index_read_marker".length);
const unused_object_prototype_to_string_length_read = Object.prototype.toString.call({ dead_object_prototype_to_string_length_target: 1 }).length + "dead_object_prototype_to_string_length_read".length;
const unused_object_prototype_to_string_upper_call = (Object.prototype.toString.call(["dead_object_prototype_to_string_upper_target"]).toUpperCase(), "dead_object_prototype_to_string_upper_call_marker".length);
const unused_object_prototype_to_string_index_read = (Object.prototype.toString.call(null)[0], "dead_object_prototype_to_string_index_read_marker".length);
const unused_object_prototype_to_locale_length_read = Object.prototype.toLocaleString.call("dead_object_prototype_to_locale_length").length + "dead_object_prototype_to_locale_length_read".length;
const unused_object_prototype_to_locale_upper_call = (Object.prototype.toLocaleString.call(123).toUpperCase(), "dead_object_prototype_to_locale_upper_call_marker".length);
const unused_object_prototype_to_locale_index_read = (Object.prototype.toLocaleString.call(456n)[0], "dead_object_prototype_to_locale_index_read_marker".length);
const unused_object_prototype_to_string_call = Object.prototype.toString.call({ dead_object_prototype_to_string_call: 1 });
const unused_object_prototype_to_locale_call = Object.prototype.toLocaleString.call("dead_object_prototype_to_locale_call");
const unused_object_prototype_has_own_call = Object.prototype.hasOwnProperty.call({ dead_object_prototype_has_own: 1 }, "dead_object_prototype_has_own");
const unused_object_prototype_property_is_enumerable_call = Object.prototype.propertyIsEnumerable.call({ dead_object_prototype_property_is_enumerable: 1 }, "dead_object_prototype_property_is_enumerable");
const unused_object_prototype_is_prototype_of_call = Object.prototype.isPrototypeOf.call({ dead_object_prototype_is_prototype_of: 1 }, {});
const unused_object_prototype_value_of_call = Object.prototype.valueOf.call({ dead_object_prototype_value_of: 1 });
const unused_object_prototype_value_of_property_read = (Object.prototype.valueOf.call({ dead_object_prototype_value_of_property_read: 1 }) as { dead_object_prototype_value_of_property_read: number }).dead_object_prototype_value_of_property_read;
const unused_object_prototype_value_of_element_read = (Object.prototype.valueOf.call(["dead_object_prototype_value_of_element_read"]) as string[])[0];
const unused_object_prototype_value_of_freeze_property_read = (Object.prototype.valueOf.call(Object.freeze({ dead_object_prototype_value_of_freeze_property_read: 1 })) as { dead_object_prototype_value_of_freeze_property_read: number }).dead_object_prototype_value_of_freeze_property_read;
const unused_object_prototype_value_of_seal_element_read = (Object.prototype.valueOf.call(Object.seal(["dead_object_prototype_value_of_seal_element_read"])) as string[])[0];
const unused_object_prototype_value_of_assign_read = (Object.prototype.valueOf.call(Object.assign({}, { dead_object_prototype_value_of_assign_read: 1 })) as { dead_object_prototype_value_of_assign_read: number }).dead_object_prototype_value_of_assign_read;
const unused_object_prototype_value_of_create_read = (Object.prototype.valueOf.call(Object.create(null, { dead_object_prototype_value_of_create_read: { value: 1 } })) as { dead_object_prototype_value_of_create_read: number }).dead_object_prototype_value_of_create_read;
const unused_object_prototype_value_of_define_property_read = (Object.prototype.valueOf.call(Object.defineProperty({}, "dead_object_prototype_value_of_define_property_read", { value: 1 })) as { dead_object_prototype_value_of_define_property_read: number }).dead_object_prototype_value_of_define_property_read;
const unused_object_prototype_value_of_define_properties_read = (Object.prototype.valueOf.call(Object.defineProperties({}, { dead_object_prototype_value_of_define_properties_read: { value: 1 } })) as { dead_object_prototype_value_of_define_properties_read: number }).dead_object_prototype_value_of_define_properties_read;
const unused_object_prototype_value_of_from_entries_read = (Object.prototype.valueOf.call(Object.fromEntries([["dead_object_prototype_value_of_from_entries_read", 1]])) as { dead_object_prototype_value_of_from_entries_read: number }).dead_object_prototype_value_of_from_entries_read;
const unused_promise_resolve_object_prototype_has_own_call = Promise.resolve(Object.prototype.hasOwnProperty.call({ dead_promise_resolve_object_prototype_has_own: 1 }, "dead_promise_resolve_object_prototype_has_own"));
const unused_promise_resolve_object_prototype_property_is_enumerable_call = Promise.resolve(Object.prototype.propertyIsEnumerable.call({ dead_promise_resolve_object_prototype_property_is_enumerable: 1 }, "dead_promise_resolve_object_prototype_property_is_enumerable"));
const unused_promise_resolve_object_prototype_is_prototype_of_call = Promise.resolve(Object.prototype.isPrototypeOf.call({ dead_promise_resolve_object_prototype_is_prototype_of: 1 }, {}));
const unused_promise_resolve_object_prototype_value_of_property_read = Promise.resolve((Object.prototype.valueOf.call({ dead_promise_resolve_object_prototype_value_of_property_read: 1 }) as { dead_promise_resolve_object_prototype_value_of_property_read: number }).dead_promise_resolve_object_prototype_value_of_property_read);
const unused_promise_resolve_object_prototype_value_of_element_read = Promise.resolve((Object.prototype.valueOf.call(["dead_promise_resolve_object_prototype_value_of_element_read"]) as string[])[0]);
const unused_promise_resolve_object_prototype_value_of_freeze_property_read = Promise.resolve((Object.prototype.valueOf.call(Object.freeze({ dead_promise_resolve_object_prototype_value_of_freeze_property_read: 1 })) as { dead_promise_resolve_object_prototype_value_of_freeze_property_read: number }).dead_promise_resolve_object_prototype_value_of_freeze_property_read);
const unused_promise_resolve_object_prototype_value_of_seal_element_read = Promise.resolve((Object.prototype.valueOf.call(Object.seal(["dead_promise_resolve_object_prototype_value_of_seal_element_read"])) as string[])[0]);
const unused_promise_resolve_object_prototype_value_of_assign_read = Promise.resolve((Object.prototype.valueOf.call(Object.assign({}, { dead_promise_resolve_object_prototype_value_of_assign_read: 1 })) as { dead_promise_resolve_object_prototype_value_of_assign_read: number }).dead_promise_resolve_object_prototype_value_of_assign_read);
const unused_promise_resolve_object_prototype_value_of_create_read = Promise.resolve((Object.prototype.valueOf.call(Object.create(null, { dead_promise_resolve_object_prototype_value_of_create_read: { value: 1 } })) as { dead_promise_resolve_object_prototype_value_of_create_read: number }).dead_promise_resolve_object_prototype_value_of_create_read);
const unused_promise_resolve_object_prototype_value_of_define_property_read = Promise.resolve((Object.prototype.valueOf.call(Object.defineProperty({}, "dead_promise_resolve_object_prototype_value_of_define_property_read", { value: 1 })) as { dead_promise_resolve_object_prototype_value_of_define_property_read: number }).dead_promise_resolve_object_prototype_value_of_define_property_read);
const unused_promise_resolve_object_prototype_value_of_define_properties_read = Promise.resolve((Object.prototype.valueOf.call(Object.defineProperties({}, { dead_promise_resolve_object_prototype_value_of_define_properties_read: { value: 1 } })) as { dead_promise_resolve_object_prototype_value_of_define_properties_read: number }).dead_promise_resolve_object_prototype_value_of_define_properties_read);
const unused_promise_resolve_object_prototype_value_of_from_entries_read = Promise.resolve((Object.prototype.valueOf.call(Object.fromEntries([["dead_promise_resolve_object_prototype_value_of_from_entries_read", 1]])) as { dead_promise_resolve_object_prototype_value_of_from_entries_read: number }).dead_promise_resolve_object_prototype_value_of_from_entries_read);
const unused_object_is = Object.is("dead", unused_label);
const unused_math_abs_call = Math.abs(-1);
const unused_math_max_call = Math.max(1, 2, 3);
const unused_math_hypot_call = Math.hypot(3, 4);
const unused_string_from_char_code = String.fromCharCode(65, 66);
const unused_string_from_code_point = String.fromCodePoint(0x41, 0x1f600);
const unused_regexp_escape_call = RegExp.escape("dead_regexp_escape");
const unused_string_raw_tagged_template = String.raw`dead_string_raw_tagged_template`;
const unused_string_raw_length_read = String.raw`dead_string_raw_length_${"dead_string_raw_length_expr".length}`.length;
const unused_string_raw_upper_call = (String.raw`dead_string_raw_upper_${"dead_string_raw_upper_expr"}`.toUpperCase(), "dead_string_raw_upper_call_marker".length);
const unused_string_raw_index_read = (String.raw`dead_string_raw_index_read`[0], "dead_string_raw_index_read_marker".length);
const unused_json_stringify_call = JSON.stringify({ dead_json_stringify_key: "dead_json_stringify_value", count: 1 });
const unused_json_stringify_length_read = JSON.stringify(["dead_json_stringify_length_read", 2]).length;
const unused_json_stringify_upper_call = (JSON.stringify("dead_json_stringify_upper_call").toUpperCase(), "dead_json_stringify_upper_call_marker".length);
const unused_json_stringify_index_read = (JSON.stringify({ label: "dead_json_stringify_index_read" })[0], "dead_json_stringify_index_read_marker".length);
const unused_string_method_to_well_formed_length_read = "dead_string_method_to_well_formed_length_read".toWellFormed().length;
const unused_string_method_trim_upper_call = (" dead_string_method_trim_upper_call ".trim().toUpperCase(), "dead_string_method_trim_upper_call_marker".length);
const unused_string_method_normalize_index_read = ("dead_string_method_normalize_index_read".normalize()[0], "dead_string_method_normalize_index_read_marker".length);
const unused_string_from_char_code_length_read = String.fromCharCode("dead_string_from_char_code_length_read".length).length;
const unused_string_from_code_point_upper_call = (String.fromCodePoint(0x41, 0x42).toUpperCase(), "dead_string_from_code_point_upper_call_marker".length);
const unused_regexp_escape_index_read = (RegExp.escape("dead_regexp_escape_index_read")[0], "dead_regexp_escape_index_read_marker".length);
const unused_object_keys_call = Object.keys({ dead_object_keys: 1 });
const unused_object_values_call = Object.values({ dead_object_values: 2 });
const unused_object_entries_call = Object.entries({ dead_object_entries: 3 });
const unused_const_object_keys_call = Object.keys(unused_spread_source_object);
const unused_array_keys_call = Object.keys([1, 2, 3]);
const unused_object_has_own_call = Object.hasOwn({ dead_object_has_own: true }, "dead_object_has_own");
const unused_array_has_own_call = Object.hasOwn([1, 2, 3], "0");
const unused_object_property_names_call = Object.getOwnPropertyNames({ dead_object_property_names: 1 });
const unused_object_property_descriptor_call = Object.getOwnPropertyDescriptor({ dead_object_property_descriptor: 1 }, "dead_object_property_descriptor");
const unused_object_property_descriptors_call = Object.getOwnPropertyDescriptors({ dead_object_property_descriptors: 1 });
const unused_array_property_names_call = Object.getOwnPropertyNames([1, 2, 3]);
const unused_object_get_prototype_call = Object.getPrototypeOf({ dead_object_get_prototype: 1 });
const unused_object_is_extensible_call = Object.isExtensible({ dead_object_is_extensible: 1 });
const unused_object_is_sealed_call = Object.isSealed(["dead_object_is_sealed"]);
const unused_object_is_frozen_call = Object.isFrozen(unused_spread_source_object);
const unused_object_prevent_extensions_call = Object.preventExtensions({ dead_object_prevent_extensions: 1 });
const unused_object_seal_call = Object.seal({ dead_object_seal: 1 });
const unused_object_freeze_call = Object.freeze(["dead_object_freeze"]);
const unused_object_set_prototype_call = Object.setPrototypeOf({ dead_object_set_prototype: 1 }, { proto: "dead_object_set_prototype_proto" });
const unused_object_primitive_keys_call = Object.keys("dead_object_primitive_keys");
const unused_object_primitive_values_call = Object.values("dead_object_primitive_values");
const unused_object_primitive_entries_call = Object.entries("dead_object_primitive_entries");
const unused_object_primitive_property_names_call = Object.getOwnPropertyNames("dead_object_primitive_property_names");
const unused_object_primitive_descriptor_call = Object.getOwnPropertyDescriptor("dead_object_primitive_descriptor", "0");
const unused_object_primitive_descriptors_call = Object.getOwnPropertyDescriptors("dead_object_primitive_descriptors");
const unused_object_primitive_has_own_call = Object.hasOwn("dead_object_primitive_has_own", "0");
const unused_object_primitive_get_prototype_call = Object.getPrototypeOf("dead_object_primitive_get_prototype");
const unused_object_primitive_is_extensible_call = Object.isExtensible("dead_object_primitive_is_extensible");
const unused_object_primitive_is_sealed_call = Object.isSealed("dead_object_primitive_is_sealed");
const unused_object_primitive_is_frozen_call = Object.isFrozen("dead_object_primitive_is_frozen");
const unused_object_primitive_prevent_extensions_call = Object.preventExtensions("dead_object_primitive_prevent_extensions");
const unused_object_primitive_seal_call = Object.seal("dead_object_primitive_seal");
const unused_object_primitive_freeze_call = Object.freeze("dead_object_primitive_freeze");
const unused_object_create_null_call = Object.create(null);
const unused_object_create_object_call = Object.create({ dead_object_create_object: 1 });
const unused_object_create_const_call = Object.create(unused_spread_source_object);
const unused_object_create_descriptors_call = Object.create({ dead_object_create_descriptors_proto: 1 }, { dead_object_create_descriptors_key: { value: "dead_object_create_descriptors_value", enumerable: true } });
const unused_object_assign_object_call = Object.assign({ dead_object_assign_target: 1 }, { dead_object_assign_source: 2 });
const unused_object_assign_array_call = Object.assign(["dead_object_assign_array_target"], ["dead_object_assign_array_source"]);
const unused_object_assign_array_from_target_call = Object.assign(Array.from(["dead_object_assign_array_from_target"]), { dead_object_assign_array_from_source: 1 });
const unused_object_assign_const_source_call = Object.assign({ dead_object_assign_const_target: 1 }, unused_spread_source_object);
const unused_object_assign_primitive_source_call = Object.assign({ dead_object_assign_primitive_target: 1 }, "dead_object_assign_primitive_source");
const unused_object_assign_nullish_source_call = Object.assign({ dead_object_assign_nullish_target: 1 }, null, undefined, "dead_object_assign_nullish_primitive_source");
const unused_object_assign_from_entries_empty_map_call = Object.assign(Object.fromEntries(unused_object_from_entries_empty_map_source), { dead_object_assign_from_entries_empty_map_source: 1 });
const unused_object_define_property_call = Object.defineProperty({ dead_object_define_property_target: 1 }, "dead_object_define_property_key", { value: "dead_object_define_property_value", enumerable: true });
const unused_object_define_property_from_entries_empty_map_call = Object.defineProperty(Object.fromEntries(unused_object_from_entries_empty_map_copy_source), "dead_object_define_property_from_entries_empty_map_key", { value: "dead_object_define_property_from_entries_empty_map_value", enumerable: true });
const unused_object_define_properties_call = Object.defineProperties({ dead_object_define_properties_target: 1 }, { dead_object_define_properties_key: { value: "dead_object_define_properties_value", configurable: true } });
const unused_object_define_properties_from_entries_empty_map_call = Object.defineProperties(Object.fromEntries(unused_object_from_entries_empty_map_source), { dead_object_define_properties_from_entries_empty_map_key: { value: "dead_object_define_properties_from_entries_empty_map_value", configurable: true } });
const unused_object_from_entries_call = Object.fromEntries([["dead_object_from_entries_key", "dead_object_from_entries_value"]]);
const unused_object_from_entries_const_call = Object.fromEntries(unused_from_entries_source);
const unused_object_from_entries_object_entries_call = Object.fromEntries(Object.entries({ dead_object_from_entries_object_entries_key: "dead_object_from_entries_object_entries_value" }));
const unused_object_from_entries_empty_map_call = Object.fromEntries(new Map<string, string>());
const unused_object_from_entries_empty_map_const_call = Object.fromEntries(unused_object_from_entries_empty_map_source);
const unused_object_from_entries_empty_map_copy_call = Object.fromEntries(unused_object_from_entries_empty_map_copy_source);
const unused_object_prevent_extensions_from_entries_empty_map_call = Object.preventExtensions(Object.fromEntries(unused_object_from_entries_empty_map_source));
const unused_object_seal_from_entries_empty_map_call = Object.seal(Object.fromEntries(unused_object_from_entries_empty_map_copy_source));
const unused_object_freeze_from_entries_empty_map_call = Object.freeze(Object.fromEntries(unused_object_from_entries_empty_map_source));
const unused_object_set_prototype_from_entries_empty_map_call = Object.setPrototypeOf(Object.fromEntries(unused_object_from_entries_empty_map_copy_source), null);
const unused_object_assign_set_prototype_from_entries_empty_map_call = Object.assign(Object.setPrototypeOf(Object.fromEntries(unused_object_from_entries_empty_map_source), null), { dead_object_assign_set_prototype_from_entries_empty_map_source: 1 });
const unused_object_define_property_value_of_from_entries_empty_map_call = Object.defineProperty(Object.prototype.valueOf.call(Object.fromEntries(unused_object_from_entries_empty_map_copy_source)), "dead_object_define_property_value_of_from_entries_empty_map_key", { value: "dead_object_define_property_value_of_from_entries_empty_map_value", enumerable: true });
const unused_object_define_property_array_of_target_call = Object.defineProperty(Array.of("dead_object_define_property_array_of_target"), "1", { value: "dead_object_define_property_array_of_value", enumerable: true });
const unused_object_define_property_object_keys_target_call = Object.defineProperty(Object.keys({ dead_object_define_property_object_keys_target: 1 }), "1", { value: "dead_object_define_property_object_keys_value", enumerable: true });
const unused_object_prevent_extensions_array_from_target_call = Object.preventExtensions(Array.from(["dead_object_prevent_extensions_array_from_target"]));
const unused_object_prevent_extensions_object_values_target_call = Object.preventExtensions(Object.values({ dead_object_prevent_extensions_object_values_target: 1 }));
const unused_object_has_own_from_entries_empty_map_const_call = Object.hasOwn(Object.fromEntries(unused_object_from_entries_empty_map_source), "missing");
const unused_object_has_own_from_entries_empty_map_copy_call = Object.hasOwn(Object.fromEntries(unused_object_from_entries_empty_map_copy_source), "missing");
const unused_object_descriptor_from_entries_empty_map_const_call = Object.getOwnPropertyDescriptor(Object.fromEntries(unused_object_from_entries_empty_map_source), "missing");
const unused_reflect_has_from_entries_empty_map_const_call = Reflect.has(Object.fromEntries(unused_object_from_entries_empty_map_source), "missing");
const unused_reflect_descriptor_from_entries_empty_map_copy_call = Reflect.getOwnPropertyDescriptor(Object.fromEntries(unused_object_from_entries_empty_map_copy_source), "missing");
const unused_group_by_empty_array_source: number[] = [];
const unused_group_by_empty_array_copy_source = Array.from(unused_group_by_empty_array_source);
const unused_group_by_empty_string_source = "";
const unused_group_by_empty_set_source = new Set<number>();
const unused_group_by_empty_set_copy_source = new Set(unused_group_by_empty_set_source);
const unused_group_by_empty_map_source = new Map<string, number>();
const unused_group_by_empty_map_copy_source = new Map(unused_group_by_empty_map_source);
const unused_object_group_by_empty_call = Object.groupBy([] as number[], (value) => "dead_object_group_by_empty" + value);
const unused_map_group_by_empty_call = Map.groupBy([] as number[], (value) => "dead_map_group_by_empty" + value);
const unused_object_group_by_empty_array_const_call = Object.groupBy(unused_group_by_empty_array_source, (value) => "dead_object_group_by_empty_array_const" + value);
const unused_map_group_by_empty_array_copy_call = Map.groupBy(unused_group_by_empty_array_copy_source, (value) => "dead_map_group_by_empty_array_copy" + value);
const unused_object_group_by_array_from_empty_call = Object.groupBy(Array.from(""), (value) => "dead_object_group_by_array_from_empty" + value);
const unused_map_group_by_array_of_empty_call = Map.groupBy(Array.of<number>(), (value) => "dead_map_group_by_array_of_empty" + value);
const unused_object_group_by_empty_set_call = Object.groupBy(new Set<number>(), (value) => "dead_object_group_by_empty_set" + value);
const unused_map_group_by_empty_set_call = Map.groupBy(new Set<number>(), (value) => "dead_map_group_by_empty_set" + value);
const unused_object_group_by_empty_set_const_call = Object.groupBy(unused_group_by_empty_set_source, (value) => "dead_object_group_by_empty_set_const" + value);
const unused_map_group_by_empty_set_copy_call = Map.groupBy(unused_group_by_empty_set_copy_source, (value) => "dead_map_group_by_empty_set_copy" + value);
const unused_object_group_by_empty_string_call = Object.groupBy("", (value) => "dead_object_group_by_empty_string" + value);
const unused_map_group_by_empty_string_call = Map.groupBy("", (value) => "dead_map_group_by_empty_string" + value);
const unused_object_group_by_empty_string_const_call = Object.groupBy(unused_group_by_empty_string_source, (value) => "dead_object_group_by_empty_string_const" + value);
const unused_map_group_by_empty_string_const_call = Map.groupBy(unused_group_by_empty_string_source, (value) => "dead_map_group_by_empty_string_const" + value);
const unused_object_group_by_empty_map_call = Object.groupBy(new Map<string, number>(), (entry) => "dead_object_group_by_empty_map" + entry[0] + entry[1]);
const unused_map_group_by_empty_map_call = Map.groupBy(new Map<string, number>(), (entry) => "dead_map_group_by_empty_map" + entry[0] + entry[1]);
const unused_object_group_by_empty_map_const_call = Object.groupBy(unused_group_by_empty_map_source, (entry) => "dead_object_group_by_empty_map_const" + entry[0] + entry[1]);
const unused_map_group_by_empty_map_copy_call = Map.groupBy(unused_group_by_empty_map_copy_source, (entry) => "dead_map_group_by_empty_map_copy" + entry[0] + entry[1]);
const unused_collection_object_keys_call = Object.keys(new Map<string, number>());
const unused_collection_object_has_own_call = Object.hasOwn(new Set<string>(), "dead_collection_has_own");
const unused_collection_reflect_own_keys_call = Reflect.ownKeys(new WeakRef<object>({ label: "dead_collection_reflect_weak_ref" }));
const unused_url_object_keys_call = Object.keys(new URL("https://dead-url-object-keys.test/path"));
const unused_url_reflect_own_keys_call = Reflect.ownKeys(new URL("https://dead-url-reflect-own-keys.test/path"));
const unused_reflect_has_call = Reflect.has({ dead_reflect_has: 1 }, "dead_reflect_has");
const unused_reflect_own_keys_call = Reflect.ownKeys({ dead_reflect_own_keys: 1 });
const unused_reflect_get_call = Reflect.get({ dead_reflect_get: 1 }, "dead_reflect_get");
const unused_reflect_get_array_call = Reflect.get(["dead_reflect_get_array"], "0");
const unused_reflect_set_call = Reflect.set({ dead_reflect_set_target: 1 }, "dead_reflect_set_key", "dead_reflect_set_value");
const unused_reflect_set_array_call = Reflect.set(["dead_reflect_set_array_target"], "0", "dead_reflect_set_array_value");
const unused_reflect_set_array_from_target_call = Reflect.set(Array.from(["dead_reflect_set_array_from_target"]), "0", "dead_reflect_set_array_from_value");
const unused_reflect_set_from_entries_empty_map_const_call = Reflect.set(Object.fromEntries(unused_object_from_entries_empty_map_source), "dead_reflect_set_from_entries_empty_map_key", "dead_reflect_set_from_entries_empty_map_value");
const unused_reflect_set_from_entries_empty_map_copy_call = Reflect.set(Object.fromEntries(unused_object_from_entries_empty_map_copy_source), "dead_reflect_set_from_entries_empty_map_copy_key", "dead_reflect_set_from_entries_empty_map_copy_value");
const unused_reflect_descriptor_call = Reflect.getOwnPropertyDescriptor({ dead_reflect_descriptor: 1 }, "dead_reflect_descriptor");
const unused_reflect_delete_property_call = Reflect.deleteProperty({ dead_reflect_delete_property: 1 }, "dead_reflect_delete_property");
const unused_reflect_delete_property_from_entries_empty_map_call = Reflect.deleteProperty(Object.fromEntries(unused_object_from_entries_empty_map_source), "dead_reflect_delete_from_entries_empty_map_key");
const unused_reflect_define_property_call = Reflect.defineProperty({ dead_reflect_define_property_target: 1 }, "dead_reflect_define_property_key", { value: "dead_reflect_define_property_value", configurable: true });
const unused_reflect_define_property_from_entries_empty_map_call = Reflect.defineProperty(Object.fromEntries(unused_object_from_entries_empty_map_copy_source), "dead_reflect_define_from_entries_empty_map_key", { value: "dead_reflect_define_from_entries_empty_map_value", configurable: true });
const unused_reflect_get_prototype_call = Reflect.getPrototypeOf({ dead_reflect_get_prototype: 1 });
const unused_reflect_is_extensible_call = Reflect.isExtensible(["dead_reflect_is_extensible"]);
const unused_reflect_prevent_extensions_call = Reflect.preventExtensions({ dead_reflect_prevent_extensions: 1 });
const unused_reflect_prevent_extensions_from_entries_empty_map_call = Reflect.preventExtensions(Object.fromEntries(unused_object_from_entries_empty_map_source));
const unused_reflect_set_prototype_call = Reflect.setPrototypeOf({ dead_reflect_set_prototype: 1 }, null);
const unused_reflect_set_prototype_from_entries_empty_map_call = Reflect.setPrototypeOf(Object.fromEntries(unused_object_from_entries_empty_map_copy_source), null);
const unused_reflect_set_set_prototype_from_entries_empty_map_call = Reflect.set(Object.setPrototypeOf(Object.fromEntries(unused_object_from_entries_empty_map_source), null), "dead_reflect_set_set_prototype_from_entries_empty_map_key", "dead_reflect_set_set_prototype_from_entries_empty_map_value");
const unused_reflect_define_value_of_from_entries_empty_map_call = Reflect.defineProperty(Object.prototype.valueOf.call(Object.fromEntries(unused_object_from_entries_empty_map_copy_source)), "dead_reflect_define_value_of_from_entries_empty_map_key", { value: "dead_reflect_define_value_of_from_entries_empty_map_value", configurable: true });
const unused_reflect_define_array_of_target_call = Reflect.defineProperty(Array.of("dead_reflect_define_array_of_target"), "1", { value: "dead_reflect_define_array_of_value", configurable: true });
const unused_reflect_define_object_entries_target_call = Reflect.defineProperty(Object.entries({ dead_reflect_define_object_entries_target: 1 }), "1", { value: "dead_reflect_define_object_entries_value", configurable: true });
const unused_reflect_prevent_extensions_array_from_target_call = Reflect.preventExtensions(Array.from(["dead_reflect_prevent_extensions_array_from_target"]));
const unused_reflect_set_own_keys_target_call = Reflect.set(Reflect.ownKeys({ dead_reflect_set_own_keys_target: 1 }), "0", "dead_reflect_set_own_keys_value");
const unused_chain_seed = "dead";
const unused_chain_mid = unused_chain_seed;
const unused_chain_object = { label: unused_chain_mid };
const unused_other_key = "gone";
const unused_computed_key_object = { ["dead"]: 1, [unused_other_key]: 2 };
// @ts-ignore: intentional pure comma expression for generated-C DCE coverage.
const unused_comma_expr = (1, "dead");
const top_level_static_false = false;
const unused_static_conditional_dead_call = top_level_static_false ? console.log("dead_static_conditional_call") : "dead_static_conditional_value";
const unused_static_and_dead_call = top_level_static_false && console.log("dead_static_and_call");
const unused_static_or_dead_call = !top_level_static_false || console.log("dead_static_or_call");
const top_level_static_non_nullish = "alive";
const unused_static_nullish_dead_call = top_level_static_non_nullish ?? console.log("dead_static_nullish_call");
const unused_static_nullish_fallback = (undefined as string | undefined) ?? "dead_static_nullish_fallback_value";
const top_level_static_truthy_string: string = "static truthy";
let unused_let = 42;
let unused_empty: number;
"top_level_dead_expr";
123n;
/top_level_dead_regex/g;
[...new Map([["top_level_dead_spread_map_key", "top_level_dead_spread_map_value"]])];
[...new Set(["top_level_dead_spread_set", "top_level_dead_spread_set_tail"])];
"top_level_dead_in" in { top_level_dead_in: true };
delete ({ top_level_dead_delete: true } as any).top_level_dead_delete;
Array.isArray(["top_level_dead_array_is_array"]);
Array.of("top_level_dead_array_of", "top_level_dead_array_of_tail");
Array.from(["top_level_dead_array_from_array"]);
Array.from("top_level_dead_array_from_string");
Array.from(new Map([["top_level_dead_array_from_map_key", "top_level_dead_array_from_map_value"]]));
Array.from(new Set(["top_level_dead_array_from_set", "top_level_dead_array_from_set_tail"]));
Array.from([] as number[], (value) => value + "top_level_dead_array_from_empty_array_mapper".length);
Array.from(unused_array_from_empty_const_source, (value) => value + "top_level_dead_array_from_empty_const_mapper".length);
Array.from(unused_array_from_empty_const_copy_source, (value) => value + "top_level_dead_array_from_empty_const_copy_mapper".length);
Array.from("", (value) => value + "top_level_dead_array_from_empty_string_mapper");
Array.from([] as number[], (value) => value + "top_level_dead_array_from_empty_mapped_map_mapper".length).map(() => "top_level_dead_array_from_empty_mapped_map");
Array.from(unused_array_from_empty_map_source, (entry) => entry[1] + "top_level_dead_array_from_empty_map_const_mapper".length);
Array.from(unused_array_from_empty_map_copy_source, (entry) => entry[1] + "top_level_dead_array_from_empty_map_copy_mapper".length);
Array.from(new Map<string, number>(), (entry) => entry[1] + "top_level_dead_array_from_empty_map_mapper".length);
Array.from(unused_array_from_empty_set_source, (value) => value + "top_level_dead_array_from_empty_set_const_mapper".length);
Array.from(unused_array_from_empty_set_copy_source, (value) => value + "top_level_dead_array_from_empty_set_copy_mapper".length);
Array.from(new Set<number>(), (value) => value + "top_level_dead_array_from_empty_set_mapper".length);
Number.isFinite("top_level_dead_number_is_finite".length);
Math.E + "top_level_dead_math_constant_read".length;
Number.POSITIVE_INFINITY + "top_level_dead_number_constant_read".length;
Promise.resolve(Math.LN10 + "top_level_dead_promise_resolve_math_constant_read".length);
Promise.resolve(Number.MIN_SAFE_INTEGER + "top_level_dead_promise_resolve_number_constant_read".length);
Symbol.iterator;
(Symbol.asyncIterator.description, "top_level_dead_symbol_description_read".length);
Promise.resolve(Symbol.asyncIterator);
Promise.resolve((Symbol.iterator.description, "top_level_dead_promise_resolve_well_known_symbol_description_read".length));
(process.arch, "top_level_dead_process_arch_read".length);
(process.version, "top_level_dead_process_version_read".length);
process.versions.node + "top_level_dead_process_versions_node_read";
process.release.name + "top_level_dead_process_release_name_read";
process.features.tls || "top_level_dead_process_features_tls_read";
process.platform.length + "top_level_dead_process_platform_length_read".length;
(process.version.toUpperCase(), "top_level_dead_process_version_upper_call".length);
(process.versions.node[0], "top_level_dead_process_versions_node_index_read".length);
(process.release.name.includes("node"), "top_level_dead_process_release_name_includes_call".length);
process.cwd("top_level_dead_process_cwd_length_ignored".length).length;
Promise.resolve(process.title);
Promise.resolve((process.argv0, "top_level_dead_promise_resolve_process_argv0_read".length));
Promise.resolve((process.versions.tsc2c, "top_level_dead_promise_resolve_process_versions_tsc2c_read"));
Promise.resolve((process.release.libUrl, "top_level_dead_promise_resolve_process_release_lib_read"));
Promise.resolve((process.features.inspector, "top_level_dead_promise_resolve_process_features_inspector_read"));
Promise.resolve(process.platform.length + "top_level_dead_promise_resolve_process_platform_length_read".length);
Promise.resolve((process.version.toUpperCase(), "top_level_dead_promise_resolve_process_version_upper_call"));
Promise.resolve((process.versions.node[0], "top_level_dead_promise_resolve_process_versions_node_index_read"));
Promise.resolve((process.release.name.includes("node"), "top_level_dead_promise_resolve_process_release_name_includes_call"));
Promise.resolve(process.cwd("top_level_dead_promise_resolve_process_cwd_upper_ignored".length).toUpperCase());
(process.stdin.isTTY, "top_level_dead_process_stdin_tty_read".length);
(process.stdin.readableLength, "top_level_dead_process_stdin_readable_length_read".length);
(process.stderr.writable, "top_level_dead_process_stderr_writable_read".length);
((process.stderr as any).writableNeedDrain, "top_level_dead_process_stderr_need_drain_read".length);
((process.stdout as any).readable, "top_level_dead_process_stdout_readable_read".length);
((process.stderr as any).readable, "top_level_dead_process_stderr_readable_read".length);
Promise.resolve(process.stdout.fd);
Promise.resolve((process.stdout.isTTY, "top_level_dead_promise_resolve_process_stdout_tty_read".length));
Promise.resolve((process.stdout.writableEnded, "top_level_dead_promise_resolve_process_stdout_ended_read".length));
process.stdin.isPaused("top_level_dead_process_stdin_is_paused_call".length);
process.stdin.setEncoding("utf8", "top_level_dead_process_stdin_set_encoding_call".length);
process.stdin.pause("top_level_dead_process_stdin_pause_call".length);
process.stdin.resume("top_level_dead_process_stdin_resume_call".length);
process.stdin.pipe(process.stdout, "top_level_dead_process_stdin_pipe_call".length);
process.stdin.unpipe(process.stderr, "top_level_dead_process_stdin_unpipe_call".length);
process.stdin.removeAllListeners("top_level_dead_process_stdin_remove_all_call");
process.stdin.on("top_level_dead_process_stdin_on_call", () => undefined);
process.stdout.setDefaultEncoding("utf8", "top_level_dead_process_stdout_set_default_encoding_call".length);
process.stdout.cork("top_level_dead_process_stdout_cork_call".length);
process.stderr.uncork("top_level_dead_process_stderr_uncork_call".length);
isReadable(process.stdin, "top_level_dead_stream_named_readable_stdin_call".length);
streamReadableAlias(process.stdin, "top_level_dead_stream_named_alias_readable_stdin_call".length);
nodeStream.isWritable(process.stdout, "top_level_dead_stream_namespace_writable_stdout_call".length);
streamDefault.isDisturbed(process.stderr, "top_level_dead_stream_default_disturbed_stderr_call".length);
isDestroyed({ top_level_dead_stream_named_destroyed_plain_call: true }, "top_level_dead_stream_named_destroyed_plain_ignored".length);
streamDestroyedAlias({ top_level_dead_stream_named_alias_destroyed_plain_call: true }, "top_level_dead_stream_named_alias_destroyed_plain_ignored".length);
nodeStream.isErrored(null, "top_level_dead_stream_namespace_errored_null_call".length);
Promise.resolve(process.stdin.isPaused("top_level_dead_promise_resolve_process_stdin_is_paused_call".length));
Promise.resolve(process.stdin.pause("top_level_dead_promise_resolve_process_stdin_pause_call".length));
Promise.resolve(process.stdin.resume("top_level_dead_promise_resolve_process_stdin_resume_call".length));
Promise.resolve(process.stdout.cork("top_level_dead_promise_resolve_process_stdout_cork_call".length));
Promise.resolve(process.stderr.uncork("top_level_dead_promise_resolve_process_stderr_uncork_call".length));
Promise.resolve(isReadable(process.stdin, "top_level_dead_promise_resolve_stream_named_readable_stdin_call".length));
Promise.resolve(streamReadableAlias(process.stdin, "top_level_dead_promise_resolve_stream_named_alias_readable_stdin_call".length));
Promise.resolve(nodeStream.isWritable(process.stdout, "top_level_dead_promise_resolve_stream_namespace_writable_stdout_call".length));
Promise.resolve(streamDefault.isDestroyed({ top_level_dead_promise_resolve_stream_default_destroyed_plain_call: true }, "top_level_dead_promise_resolve_stream_default_destroyed_plain_ignored".length));
Promise.resolve(streamDestroyedAlias({ top_level_dead_promise_resolve_stream_named_alias_destroyed_plain_call: true }, "top_level_dead_promise_resolve_stream_named_alias_destroyed_plain_ignored".length));
Promise.resolve(nodeStream.isDisturbed(null, "top_level_dead_promise_resolve_stream_namespace_disturbed_null_call".length));
process.cwd("top_level_dead_process_cwd_ignored".length);
process.uptime("top_level_dead_process_uptime_ignored".length);
process.hrtime();
process.hrtime.bigint("top_level_dead_process_hrtime_bigint_ignored".length);
process.getgroups("top_level_dead_process_getgroups_ignored".length);
process.cpuUsage().user + "top_level_dead_process_cpu_user_read".length;
process.memoryUsage("top_level_dead_process_memory_usage_ignored".length);
process.resourceUsage("top_level_dead_process_resource_usage_ignored".length);
process.memoryUsage("top_level_dead_process_memory_external_ignored".length).external;
process.resourceUsage("top_level_dead_process_resource_fs_read_ignored".length).fsRead;
Promise.resolve(process.cwd("top_level_dead_promise_resolve_process_cwd_ignored".length));
Promise.resolve(process.uptime("top_level_dead_promise_resolve_process_uptime_ignored".length));
Promise.resolve(process.cpuUsage().system + "top_level_dead_promise_resolve_process_cpu_system_read".length);
Promise.resolve(process.memoryUsage("top_level_dead_promise_resolve_process_memory_array_buffers_ignored".length).arrayBuffers);
Promise.resolve(process.resourceUsage("top_level_dead_promise_resolve_process_resource_context_ignored".length).voluntaryContextSwitches);
__dirname.length + "top_level_dead_dirname_read".length;
(module.path, "top_level_dead_module_path_read".length);
(__dirname.toUpperCase(), "top_level_dead_dirname_upper_call".length);
module.filename.length + "top_level_dead_module_filename_length_read".length;
(module.id[0], "top_level_dead_module_id_index_read".length);
(module.path.includes("node_modules"), "top_level_dead_module_path_includes_call".length);
Promise.resolve(__filename);
Promise.resolve((module.loaded, "top_level_dead_promise_resolve_module_loaded_read".length));
Promise.resolve((__dirname.toUpperCase(), "top_level_dead_promise_resolve_dirname_upper_call"));
Promise.resolve(module.filename.length + "top_level_dead_promise_resolve_module_filename_length_read".length);
Promise.resolve((module.id[0], "top_level_dead_promise_resolve_module_id_index_read"));
Promise.resolve((module.path.includes("node_modules"), "top_level_dead_promise_resolve_module_path_includes_call"));
nodeFs.constants.W_OK + "top_level_dead_fs_constant_read".length;
fsConstants.COPYFILE_FICLONE + "top_level_dead_fs_named_constant_read".length;
nodePath.posix.sep.length + "top_level_dead_path_posix_constant_read".length;
pathSep.length + "top_level_dead_path_named_constant_read".length;
nodeOs.devNull.length + "top_level_dead_os_constant_read".length;
osEOL.length + "top_level_dead_os_named_constant_read".length;
(nodePath.sep.toUpperCase(), "top_level_dead_path_constant_upper_call".length);
(pathDelimiter[0], "top_level_dead_path_named_constant_index_read".length);
(nodeOs.EOL[0], "top_level_dead_os_constant_index_read".length);
(osDevNull.toUpperCase(), "top_level_dead_os_named_constant_upper_call".length);
Promise.resolve(nodeFs.constants.X_OK + "top_level_dead_promise_resolve_fs_constant_read".length);
Promise.resolve(nodePath.delimiter.length + "top_level_dead_promise_resolve_path_constant_read".length);
Promise.resolve(nodeOs.EOL.length + "top_level_dead_promise_resolve_os_constant_read".length);
Promise.resolve((nodePath.sep.toUpperCase(), "top_level_dead_promise_resolve_path_constant_upper_call"));
Promise.resolve((pathDelimiter[0], "top_level_dead_promise_resolve_path_named_constant_index_read"));
Promise.resolve((nodeOs.EOL[0], "top_level_dead_promise_resolve_os_constant_index_read"));
Promise.resolve((osDevNull.toUpperCase(), "top_level_dead_promise_resolve_os_named_constant_upper_call"));
nodeDns.ALL + "top_level_dead_dns_constant_read".length;
ADDRCONFIG + "top_level_dead_dns_named_constant_read".length;
Promise.resolve(nodeDns.ADDRCONFIG + "top_level_dead_promise_resolve_dns_constant_read".length);
Promise.resolve(ALL + "top_level_dead_promise_resolve_dns_named_constant_read".length);
EventEmitter.defaultMaxListeners + "top_level_dead_event_default_read".length;
nodeEvents.EventEmitter.defaultMaxListeners + "top_level_dead_event_namespace_default_read".length;
defaultMaxListeners + "top_level_dead_event_named_default_read".length;
new EventEmitter("top_level_dead_new_event_emitter_ignored".length);
new ImportedEventEmitter("top_level_dead_new_imported_event_emitter_ignored".length);
new EventEmitter().getMaxListeners("top_level_dead_event_emitter_get_max_ignored".length);
new ImportedEventEmitter().listenerCount("top_level_dead_imported_event_emitter_listener_count");
new EventEmitter().listeners("top_level_dead_event_emitter_listeners");
new EventEmitter().eventNames("top_level_dead_event_emitter_event_names_ignored".length);
new EventEmitter().toString("top_level_dead_event_emitter_to_string_ignored".length);
EventEmitter.listenerCount(new EventEmitter(), "top_level_dead_event_static_listener_count");
nodeEvents.getMaxListeners(new EventEmitter(), "top_level_dead_events_namespace_get_max_ignored".length);
getMaxListeners(new EventEmitter(), "top_level_dead_events_named_get_max_ignored".length);
listenerCount(new EventEmitter(), "top_level_dead_events_named_listener_count");
nodeEvents.getEventListeners(new EventEmitter(), "top_level_dead_events_namespace_get_event_listeners");
new EventEmitter().setMaxListeners(14);
new EventEmitter().removeAllListeners("top_level_dead_event_emitter_remove_all");
new EventEmitter().addListener("top_level_dead_event_emitter_add_listener", () => undefined);
new EventEmitter().prependOnceListener("top_level_dead_event_emitter_prepend_once", () => undefined);
new EventEmitter().removeListener("top_level_dead_event_emitter_remove_listener", () => undefined);
new EventEmitter().emit("top_level_dead_event_emitter_emit", "top_level_dead_event_emitter_emit_payload");
nodeEvents.setMaxListeners(15, new EventEmitter());
setMaxListeners(16, new EventEmitter());
nodeEvents.once(new EventEmitter(), "top_level_dead_events_namespace_once");
eventsOnce(new EventEmitter(), "top_level_dead_events_named_once");
nodeEvents.once(new EventEmitter(), "top_level_dead_events_namespace_once_undefined_options", undefined);
eventsOnce(new EventEmitter(), "top_level_dead_events_named_once_signal_undefined", { signal: undefined });
crypto.createHash("sha256");
createHash("sha1");
nodeCrypto.createHash("sha512").update("top_level_dead_crypto_hash_update");
crypto.createHash("sha256").update("top_level_dead_crypto_hash_digest").digest("hex");
createHash("sha1").update(Buffer.from("top_level_dead_crypto_hash_buffer_digest")).digest("base64");
crypto.createHash("sha256").update("top_level_dead_crypto_hash_default_digest").digest(unused_hash_digest_default_encoding);
crypto.createHash("sha256").update("top_level_dead_crypto_hash_digest_length_read").digest("hex").length;
(createHash("sha1").update("top_level_dead_crypto_hash_digest_upper_call").digest("base64").toUpperCase(), "top_level_dead_crypto_hash_digest_upper_call_marker".length);
(nodeCrypto.createHash("sha512").update("top_level_dead_crypto_hash_digest_index_read").digest("hex")[0], "top_level_dead_crypto_hash_digest_index_read_marker".length);
Promise.resolve(nodeCrypto.createHash("sha512").update("top_level_dead_promise_resolve_crypto_hash_digest").digest("hex"));
Promise.resolve(nodeCrypto.createHash("sha512").update("top_level_dead_promise_resolve_crypto_hash_digest_length_read").digest("hex").length);
Promise.resolve((createHash("sha1").update("top_level_dead_promise_resolve_crypto_hash_digest_upper_call").digest("base64").toUpperCase(), "top_level_dead_promise_resolve_crypto_hash_digest_upper_call_marker"));
Promise.resolve((crypto.createHash("sha256").update("top_level_dead_promise_resolve_crypto_hash_digest_index_read").digest("hex")[0], "top_level_dead_promise_resolve_crypto_hash_digest_index_read_marker"));
new EventTarget("top_level_dead_new_event_target_ignored".length);
new Event("top_level_dead_new_event_type", { cancelable: true });
new Event("top_level_dead_event_type_read").type;
new Event("top_level_dead_event_type_length_read").type.length;
(new Event("top_level_dead_event_type_upper_call").type.toUpperCase(), "top_level_dead_event_type_upper_call_marker".length);
(new Event("top_level_dead_event_type_index_read").type[0], "top_level_dead_event_type_index_read_marker".length);
new Event("top_level_dead_event_cancelable_read", { cancelable: true }).cancelable;
new Event("top_level_dead_event_default_prevented_read").defaultPrevented;
new Event("top_level_dead_event_target_read").target;
new Event("top_level_dead_event_current_target_read").currentTarget;
new Event("top_level_dead_event_prevent_default_call", { cancelable: true }).preventDefault("top_level_dead_event_prevent_default_ignored".length);
new Event("top_level_dead_event_to_string_call").toString("top_level_dead_event_to_string_ignored".length);
new EventTarget().dispatchEvent(new Event("top_level_dead_event_target_dispatch_call", { cancelable: true }));
new EventTarget().toString("top_level_dead_event_target_to_string_ignored".length);
new Event("top_level_dead_event_to_string_length_read").toString().length;
(new EventTarget().toLocaleString().toUpperCase(), "top_level_dead_event_target_to_locale_upper_call_marker".length);
(new EventEmitter().toString()[0], "top_level_dead_event_emitter_to_string_index_read_marker".length);
new EventTarget().addEventListener("top_level_dead_event_target_add", () => undefined, { once: true, passive: false });
new EventTarget().removeEventListener("top_level_dead_event_target_remove", () => undefined, true);
Promise.resolve(nodeEvents.defaultMaxListeners + "top_level_dead_promise_resolve_event_default_read".length);
Promise.resolve(defaultMaxListeners + "top_level_dead_promise_resolve_event_named_default_read".length);
Promise.resolve(new Event("top_level_dead_promise_resolve_event_type_read").type);
Promise.resolve(new Event("top_level_dead_promise_resolve_event_type_length_read").type.length);
Promise.resolve((new Event("top_level_dead_promise_resolve_event_type_upper_call").type.toUpperCase(), "top_level_dead_promise_resolve_event_type_upper_call_marker"));
Promise.resolve((new Event("top_level_dead_promise_resolve_event_type_index_read").type[0], "top_level_dead_promise_resolve_event_type_index_read_marker"));
Promise.resolve(new Event("top_level_dead_promise_resolve_event_cancelable_read", { cancelable: true }).cancelable);
Promise.resolve(new Event("top_level_dead_promise_resolve_event_default_prevented_read").defaultPrevented);
Promise.resolve(new EventEmitter().getMaxListeners("top_level_dead_promise_resolve_event_emitter_get_max_ignored".length));
Promise.resolve(new ImportedEventEmitter().listenerCount("top_level_dead_promise_resolve_imported_event_emitter_listener_count"));
Promise.resolve(new EventEmitter().toString("top_level_dead_promise_resolve_event_emitter_to_string_ignored".length));
Promise.resolve(EventEmitter.listenerCount(new EventEmitter(), "top_level_dead_promise_resolve_event_static_listener_count"));
Promise.resolve(nodeEvents.getMaxListeners(new EventEmitter(), "top_level_dead_promise_resolve_events_namespace_get_max_ignored".length));
Promise.resolve(getMaxListeners(new EventEmitter(), "top_level_dead_promise_resolve_events_named_get_max_ignored".length));
Promise.resolve(nodeEvents.setMaxListeners(17, new EventEmitter()));
Promise.resolve(setMaxListeners(18, new EventEmitter()));
Promise.resolve(new EventEmitter().emit("top_level_dead_promise_resolve_event_emitter_emit", "top_level_dead_promise_resolve_event_emitter_emit_payload"));
Promise.resolve(new Event("top_level_dead_promise_resolve_event_prevent_default_call", { cancelable: true }).preventDefault("top_level_dead_promise_resolve_event_prevent_default_ignored".length));
Promise.resolve(new Event("top_level_dead_promise_resolve_event_to_string_call").toString("top_level_dead_promise_resolve_event_to_string_ignored".length));
Promise.resolve(new EventTarget().dispatchEvent(new Event("top_level_dead_promise_resolve_event_target_dispatch_call")));
Promise.resolve(new EventTarget().toString("top_level_dead_promise_resolve_event_target_to_string_ignored".length));
Promise.resolve(new Event("top_level_dead_promise_resolve_event_to_string_length_read").toString().length);
Promise.resolve((new EventTarget().toLocaleString().toUpperCase(), "top_level_dead_promise_resolve_event_target_to_locale_upper_call_marker"));
Promise.resolve((new EventEmitter().toString()[0], "top_level_dead_promise_resolve_event_emitter_to_string_index_read_marker"));
Promise.resolve(new EventTarget().addEventListener("top_level_dead_promise_resolve_event_target_add", () => undefined, { capture: false }));
Promise.resolve(new EventTarget().removeEventListener("top_level_dead_promise_resolve_event_target_remove", () => undefined));
nodeOs.type("top_level_dead_os_type_ignored".length);
osArch("top_level_dead_os_named_arch_ignored".length);
nodeOs.cpus("top_level_dead_os_cpus_ignored".length);
nodeOs.userInfo({ encoding: unused_utf8 });
os.userInfo({ encoding: undefined }).username + "top_level_dead_os_user_info_username_read";
osUserInfo().uid + "top_level_dead_os_named_user_info_uid_read".length;
nodeOs.userInfo().username.length + "top_level_dead_os_user_info_username_length_read".length;
osUserInfo({ encoding: unused_utf8 }).shell.toUpperCase();
os.userInfo().homedir[0];
Promise.resolve(nodeOs.uptime("top_level_dead_promise_resolve_os_uptime_ignored".length));
Promise.resolve(availableParallelism("top_level_dead_promise_resolve_os_named_ignored".length));
Promise.resolve(nodeOs.userInfo({ encoding: unused_utf8_dash }).homedir);
Promise.resolve(osUserInfo({ encoding: undefined }).gid + "top_level_dead_promise_resolve_os_named_user_info_gid_read".length);
Promise.resolve(nodeOs.userInfo().username.length + "top_level_dead_promise_resolve_os_user_info_username_length_read".length);
Promise.resolve(osUserInfo({ encoding: unused_utf8 }).shell.toUpperCase());
nodePath.relative("top_level_dead_path_relative_from", "top_level_dead_path_relative_to");
pathNormalize("top_level_dead_path_named_normalize_ignored/..");
nodePath.parse("top_level_dead_path_parse_ignored");
nodePath.posix.join("top_level_dead_path_posix_join_ignored", "tail");
pathPosix.normalize("top_level_dead_path_named_posix_normalize_ignored/..");
path.posix.toNamespacedPath("top_level_dead_path_global_posix_namespaced_ignored");
pathFormat({ dir: "/top_level_dead_path_format_dir", name: "top_level_dead_path_format_name", ext: ".txt" });
pathPosix.format({ root: "/", base: "top_level_dead_path_posix_format_base.txt" });
nodePath.parse("top_level_dead_path_parse_base_read.txt").base;
pathParse("top_level_dead_path_named_parse_ext_read.txt").ext;
pathPosix.parse("/tmp/top_level_dead_path_posix_parse_name_read.txt").name;
nodePath.parse("top_level_dead_path_parse_base_length_read.txt").base.length;
nodePath.parse("top_level_dead_path_parse_base_upper_call.txt").base.toUpperCase();
pathParse("top_level_dead_path_named_parse_ext_starts_call.txt").ext.startsWith(".");
pathPosix.parse("/tmp/top_level_dead_path_posix_parse_name_index_read.txt").name[0];
pathFormat({ dir: "/top_level_dead_path_format_length_dir", name: "top_level_dead_path_format_length_name", ext: ".txt" }).length;
nodePath.basename("top_level_dead_path_basename_upper_call.txt", ".txt").toUpperCase();
pathPosix.dirname("/tmp/top_level_dead_path_posix_dirname_index_read/file.txt")[0];
Promise.resolve(path.posix.parse("/tmp/top_level_dead_promise_resolve_path_global_posix_parse_dir_read.txt").dir);
Promise.resolve(pathParse("top_level_dead_promise_resolve_path_named_parse_ext_length_read.txt").ext.length);
Promise.resolve(nodePath.parse("top_level_dead_promise_resolve_path_parse_base_upper_call.txt").base.toUpperCase());
Promise.resolve(pathFormat({ dir: "/top_level_dead_promise_resolve_path_format_length_dir", name: "top_level_dead_promise_resolve_path_format_length_name", ext: ".txt" }).length);
Promise.resolve(nodePath.basename("top_level_dead_promise_resolve_path_basename_ignored.txt", ".txt"));
Promise.resolve(pathIsAbsolute("/top_level_dead_promise_resolve_path_named_absolute_ignored"));
Promise.resolve(nodePath.posix.basename("top_level_dead_promise_resolve_path_posix_basename_ignored.txt", ".txt"));
Promise.resolve(pathPosix.relative("top_level_dead_promise_resolve_path_named_posix_relative_from", "top_level_dead_promise_resolve_path_named_posix_relative_to"));
Promise.resolve(path.format({ dir: "/top_level_dead_promise_resolve_path_format_dir", name: "top_level_dead_promise_resolve_path_format_name", ext: ".txt" }));
Promise.resolve(nodePath.posix.format({ root: "/", base: "top_level_dead_promise_resolve_path_posix_format_base.txt" }));
nodeNet.isIPv4("top_level_dead_net_is_ipv4_ignored");
netIsIP("top_level_dead_net_named_is_ip_ignored");
Promise.resolve(nodeNet.isIP("top_level_dead_promise_resolve_net_is_ip_ignored"));
Promise.resolve(netIsIPv6("top_level_dead_promise_resolve_net_named_is_ipv6_ignored"));
Buffer.byteLength("top_level_dead_buffer_byte_length_ignored", unused_utf8);
Buffer.isEncoding("top_level_dead_buffer_is_encoding_ignored");
Buffer.from("top_level_dead_buffer_from_ignored");
Buffer.byteLength("top_level_dead_buffer_byte_length_default_alias", unused_default_option);
Buffer.from("top_level_dead_buffer_from_default_alias", unused_default_option);
Buffer.alloc(2, 65);
Buffer.allocUnsafe(2);
Buffer.from("top_level_dead_buffer_to_string_ignored").toString(unused_utf8);
Buffer.from("top_level_dead_buffer_to_string_default_alias").toString(unused_default_option);
Buffer.from("top_level_dead_buffer_to_locale_string_ignored").toLocaleString();
Buffer.from("top_level_dead_buffer_value_of_ignored").valueOf();
Buffer.from("top_level_dead_buffer_to_string_length_read").toString().length;
(Buffer.from("top_level_dead_buffer_to_string_upper_call").toString(unused_utf8).toUpperCase(), "top_level_dead_buffer_to_string_upper_call_marker".length);
(Buffer.from("top_level_dead_buffer_to_locale_string_index_read").toLocaleString()[0], "top_level_dead_buffer_to_locale_string_index_read_marker".length);
Promise.resolve(Buffer.byteLength("top_level_dead_promise_resolve_buffer_byte_length_ignored"));
Promise.resolve(Buffer.isBuffer("top_level_dead_promise_resolve_buffer_is_buffer_ignored"));
Promise.resolve(Buffer.from("top_level_dead_promise_resolve_buffer_to_string_ignored").toString());
Promise.resolve(Buffer.from("top_level_dead_promise_resolve_buffer_to_string_default_alias").toString(unused_default_option));
Promise.resolve(Buffer.from("top_level_dead_promise_resolve_buffer_to_string_length_read").toString().length);
Promise.resolve((Buffer.from("top_level_dead_promise_resolve_buffer_to_string_upper_call").toString(unused_utf8).toUpperCase(), "top_level_dead_promise_resolve_buffer_to_string_upper_call_marker"));
Promise.resolve((Buffer.from("top_level_dead_promise_resolve_buffer_to_locale_string_index_read").toLocaleString()[0], "top_level_dead_promise_resolve_buffer_to_locale_string_index_read_marker"));
parseInt("top_level_dead_global_parse_int", 10);
parseFloat("top_level_dead_global_parse_float");
isNaN("top_level_dead_global_is_nan");
isFinite("top_level_dead_global_is_finite");
btoa("top_level_dead_btoa_call");
atob("dG9wX2xldmVsX2RlYWRfYXRvYl9jYWxs");
btoa("top_level_dead_btoa_length_read").length;
(atob("dG9wX2xldmVsX2RlYWRfYXRvYl91cHBlcl9jYWxs").toUpperCase(), "top_level_dead_atob_upper_call_marker".length);
(btoa("top_level_dead_btoa_index_read")[0], "top_level_dead_btoa_index_read_marker".length);
Number.parseInt("top_level_dead_number_parse_int", 10);
Number.parseFloat("top_level_dead_number_parse_float");
String("top_level_dead_string_constructor");
String("top_level_dead_string_constructor_length_read").length;
(String("top_level_dead_string_constructor_upper_call").toUpperCase(), "top_level_dead_string_constructor_upper_call_marker".length);
(String("top_level_dead_string_constructor_index_read")[0], "top_level_dead_string_constructor_index_read_marker".length);
Number("456");
Boolean("top_level_dead_boolean_constructor");
Date("top_level_dead_date_callable_ignored");
Date("top_level_dead_date_callable_length_ignored").length;
(Date("top_level_dead_date_callable_upper_ignored").toUpperCase(), "top_level_dead_date_callable_upper_call_marker".length);
(Date("top_level_dead_date_callable_index_ignored")[0], "top_level_dead_date_callable_index_read_marker".length);
Date.now("top_level_dead_date_now_ignored");
Date.parse("2020-02-03T04:05:06Z");
Date.UTC(2020, 1, 3, 4, 5, 6, 7);
new Date("2020-02-04T05:06:07Z");
new Date(2234567);
new Date(2020, 1, 4, 5, 6, 7, 8);
new Date("2020-02-05T06:07:08Z").toUTCString().length;
(new Date("2020-02-06T07:08:09Z").toDateString().toUpperCase(), "top_level_dead_date_to_date_string_upper_call_marker".length);
(new Date("2020-02-07T08:09:10Z").toTimeString()[0], "top_level_dead_date_to_time_string_index_read_marker".length);
new URL("https://top-level-dead-new-url.test/path");
new URL("child", "https://top-level-dead-new-url-base.test/root/");
new URL("https://top-level-dead-url-to-string.test/path").toString("top_level_dead_url_to_string_ignored");
new URL("https://top-level-dead-url-to-json.test/path").toJSON("top_level_dead_url_to_json_ignored");
new URL("https://top-level-dead-url-value-of.test/path").valueOf("top_level_dead_url_value_of_ignored");
new URL("https://top-level-dead-url-has-own.test/path").hasOwnProperty("top_level_dead_url_has_own", "top_level_dead_url_has_own_ignored");
new URL("https://top-level-dead-url-href-read.test/path?q=1#hash").href;
new URL("https://top-level-dead-url-origin-read.test/path").origin;
new URL("https://top-level-dead-url-href-length-read.test/path").href.length;
(new URL("https://top-level-dead-url-pathname-upper-call.test/path").pathname.toUpperCase(), "top_level_dead_url_pathname_upper_call_marker".length);
(new URL("https://top-level-dead-url-host-index-read.test/path").host[0], "top_level_dead_url_host_index_read_marker".length);
new Map<string, number>();
new Map([["top_level_dead_new_map_entries_key", "top_level_dead_new_map_entries_value"]]);
new Map([
    (["top_level_dead_new_map_ignored_extra_key", "top_level_dead_new_map_ignored_extra_value", "top_level_dead_new_map_ignored_extra"] as unknown as ObjectEntry<string>),
]);
new Map(Object.entries({ top_level_dead_new_map_object_entries_key: "top_level_dead_new_map_object_entries_value" }));
new Map(new Map([["top_level_dead_new_map_copy_key", "top_level_dead_new_map_copy_value"]]));
new Map([["top_level_dead_map_get_key", "top_level_dead_map_get_value"]]).get("top_level_dead_map_get_key");
new Map([["top_level_dead_map_has_key", "top_level_dead_map_has_value"]]).has("top_level_dead_map_has_key");
new Map([["top_level_dead_map_keys_key", "top_level_dead_map_keys_value"]]).keys();
new Map([["top_level_dead_map_values_key", "top_level_dead_map_values_value"]]).values();
new Map([["top_level_dead_map_entries_key", "top_level_dead_map_entries_value"]]).entries();
new Map([["top_level_dead_map_size_key", "top_level_dead_map_size_value"]]).size;
new Map([["top_level_dead_map_object_to_string_key", "top_level_dead_map_object_to_string_value"]]).toString("top_level_dead_map_object_to_string_ignored");
new Set(["top_level_dead_set_object_value_of"]).valueOf("top_level_dead_set_object_value_of_ignored");
new WeakMap<object, string>().toLocaleString("top_level_dead_weak_map_object_to_locale_string_ignored");
new WeakSet<object>().hasOwnProperty("top_level_dead_weak_set_object_has_own", "top_level_dead_weak_set_object_has_own_ignored");
new Map([["top_level_dead_map_object_to_string_length_key", "top_level_dead_map_object_to_string_length_value"]]).toString().length + "top_level_dead_map_object_to_string_length_read".length;
(new WeakMap<object, string>().toLocaleString().toUpperCase(), "top_level_dead_weak_map_object_to_locale_upper_call_marker".length);
(new FinalizationRegistry<string>((held) => {
    "top_level_dead_finregistry_object_to_string_index_callback";
}).toString()[0], "top_level_dead_finregistry_object_to_string_index_read_marker".length);
new WeakRef<object>({ label: "top_level_dead_weak_ref_object_property_enum_target" }).propertyIsEnumerable("top_level_dead_weak_ref_object_property_enum", "top_level_dead_weak_ref_object_property_enum_ignored");
new FinalizationRegistry<string>((held) => {
    "top_level_dead_finregistry_object_to_string_callback";
}).toString("top_level_dead_finregistry_object_to_string_ignored");
new Set<number>();
new Set(["top_level_dead_new_set_array", "top_level_dead_new_set_array_tail"]);
new Set(new Set(["top_level_dead_new_set_copy", "top_level_dead_new_set_copy_tail"]));
new Set(["top_level_dead_set_has"]).has("top_level_dead_set_has");
new Set(["top_level_dead_set_keys"]).keys();
new Set(["top_level_dead_set_values"]).values();
new Set(["top_level_dead_set_size"]).size;
new Set(["top_level_dead_set_union"]).union(new Set(["top_level_dead_set_union_other"]));
new Set(["top_level_dead_set_intersection"]).intersection(new Set(["top_level_dead_set_intersection_other"]));
new Set(["top_level_dead_set_difference"]).difference(new Set(["top_level_dead_set_difference_other"]));
new Set(["top_level_dead_set_symmetric_difference"]).symmetricDifference(new Set(["top_level_dead_set_symmetric_difference_other"]));
new Set(["top_level_dead_set_subset"]).isSubsetOf(new Set(["top_level_dead_set_subset_other"]));
new Set(["top_level_dead_set_superset"]).isSupersetOf(new Set(["top_level_dead_set_superset_other"]));
new Set(["top_level_dead_set_disjoint"]).isDisjointFrom(new Set(["top_level_dead_set_disjoint_other"]));
new WeakMap<object, string>();
new WeakMap<object, string>([
    [{ top_level_dead_new_weak_map_static_key: 1 }, "top_level_dead_new_weak_map_static_value"],
    [{ top_level_dead_new_weak_map_static_tail_key: 2 }, "top_level_dead_new_weak_map_static_tail_value"],
]);
new WeakMap<object, string>([
    ([{ top_level_dead_new_weak_map_ignored_extra_key: 1 }, "top_level_dead_new_weak_map_ignored_extra_value", "top_level_dead_new_weak_map_ignored_extra"] as unknown as [object, string]),
]);
new WeakMap<object, string>(new Map<object, string>());
new WeakMap<object, string>().get({ top_level_dead_weak_map_get_key: 1 });
new WeakMap<object, string>([[{ top_level_dead_weak_map_has_source_key: 1 }, "top_level_dead_weak_map_has_source_value"]]).has({ top_level_dead_weak_map_has_key: 1 });
new WeakSet<object>();
new WeakSet<object>([
    { top_level_dead_new_weak_set_static_value: 1 },
    { top_level_dead_new_weak_set_static_tail: 2 },
]);
new WeakSet<object>(new Set<object>());
new WeakSet<object>(new Set<object>([
    { top_level_dead_new_weak_set_object_set_source_value: 1 },
]));
new WeakSet<object>([{ top_level_dead_weak_set_has_source: 1 }]).has({ top_level_dead_weak_set_has_key: 1 });
new WeakRef<object>({ label: "top_level_dead_weak_ref_target" });
new WeakRef<object>({ label: "top_level_dead_weak_ref_deref_target" }).deref("top_level_dead_weak_ref_deref_ignored");
new FinalizationRegistry<string>((held) => {
    "top_level_dead_finalization_registry_callback";
});
new FinalizationRegistry<string>((held) => {
    "top_level_dead_finregistry_register_callback";
}).register({ label: "top_level_dead_finregistry_register_target" }, "top_level_dead_finregistry_register_held", { label: "top_level_dead_finregistry_register_token" });
new FinalizationRegistry<string>((held) => {
    "top_level_dead_finregistry_unregister_callback";
}).unregister({ label: "top_level_dead_finregistry_unregister_token" }, "top_level_dead_finregistry_unregister_ignored");
URL.canParse("https://top-level-dead-url-can-parse.test/path");
URL.canParse("top-level-dead-url-can-parse-child", "https://top-level-dead-url-can-parse-base.test/root/");
Promise.resolve("top_level_dead_promise_resolve", "top_level_dead_promise_resolve_ignored");
Promise.all([] as Promise<string>[]);
Promise.allSettled([] as Promise<string>[]);
Promise.any([] as Promise<string>[]);
Promise.race([] as Promise<string>[]);
Promise.all(Array.of<Promise<string>>());
Promise.allSettled(Array.from([] as Promise<string>[]));
Promise.any(Array.from([] as Promise<string>[]));
Promise.race(Array.from([] as Promise<string>[]));
Promise.any(Array.from(Array.of<Promise<string>>()));
Promise.race(Array.from(Array.of<Promise<string>>()));
Promise.resolve(987654321n);
Promise.resolve(+765432.25);
Promise.resolve(NaN, "top_level_dead_promise_resolve_nan_ignored");
Promise.resolve(Infinity, "top_level_dead_promise_resolve_infinity_ignored");
Promise.resolve(btoa("top_level_dead_promise_resolve_btoa_call"));
Promise.resolve(atob("dG9wX2xldmVsX2RlYWRfcHJvbWlzZV9yZXNvbHZlX2F0b2JfY2FsbA=="));
Promise.resolve(btoa("top_level_dead_promise_resolve_btoa_length_read").length);
Promise.resolve((atob("dG9wX2xldmVsX2RlYWRfcHJvbWlzZV9yZXNvbHZlX2F0b2JfdXBwZXJfY2FsbA==").toUpperCase(), "top_level_dead_promise_resolve_atob_upper_call_marker"));
Promise.resolve((btoa("top_level_dead_promise_resolve_btoa_index_read")[0], "top_level_dead_promise_resolve_btoa_index_read_marker"));
Promise.resolve(String("top_level_dead_promise_resolve_string_constructor"));
Promise.resolve(String("top_level_dead_promise_resolve_string_constructor_length_read").length);
Promise.resolve((String("top_level_dead_promise_resolve_string_constructor_upper_call").toUpperCase(), "top_level_dead_promise_resolve_string_constructor_upper_call_marker"));
Promise.resolve((String("top_level_dead_promise_resolve_string_constructor_index_read")[0], "top_level_dead_promise_resolve_string_constructor_index_read_marker"));
Promise.resolve(Number("top_level_dead_promise_resolve_number_constructor"));
Promise.resolve(Boolean("top_level_dead_promise_resolve_boolean_constructor"));
Promise.resolve(BigInt(567891234));
Promise.resolve(Symbol("top_level_dead_promise_resolve_symbol"));
Promise.resolve(Date("top_level_dead_promise_resolve_date_callable_ignored"));
Promise.resolve(Date("top_level_dead_promise_resolve_date_callable_length_ignored").length);
Promise.resolve((Date("top_level_dead_promise_resolve_date_callable_upper_ignored").toUpperCase(), "top_level_dead_promise_resolve_date_callable_upper_call_marker"));
Promise.resolve((Date("top_level_dead_promise_resolve_date_callable_index_ignored")[0], "top_level_dead_promise_resolve_date_callable_index_read_marker"));
Promise.resolve(Date.now("top_level_dead_promise_resolve_date_now_ignored"));
Promise.resolve(Date.parse("2099-02-03T04:05:06Z"));
Promise.resolve(Date.UTC(2099, 1, 3, 4, 5, 6, 7));
Promise.resolve(String.fromCharCode("top_level_dead_promise_resolve_string_static".length));
Promise.resolve(String.fromCodePoint(0x1f682));
Promise.resolve(RegExp.escape("top_level_dead_promise_resolve_regexp_escape"));
Promise.resolve(String.raw`top_level_dead_promise_resolve_string_raw_tagged_template`);
Promise.resolve(String.raw`top_level_dead_promise_resolve_string_raw_length_${"top_level_dead_promise_resolve_string_raw_length_expr".length}`.length);
Promise.resolve((String.raw`top_level_dead_promise_resolve_string_raw_upper_${"top_level_dead_promise_resolve_string_raw_upper_expr"}`.toUpperCase(), "top_level_dead_promise_resolve_string_raw_upper_call_marker"));
Promise.resolve((String.raw`top_level_dead_promise_resolve_string_raw_index_read`[0], "top_level_dead_promise_resolve_string_raw_index_read_marker"));
Promise.resolve(JSON.stringify({ top_level_dead_promise_resolve_json_stringify_key: "top_level_dead_promise_resolve_json_stringify_value" }));
Promise.resolve(JSON.stringify(["top_level_dead_promise_resolve_json_stringify_length_read", true]).length);
Promise.resolve((JSON.stringify("top_level_dead_promise_resolve_json_stringify_upper_call").toUpperCase(), "top_level_dead_promise_resolve_json_stringify_upper_call_marker"));
Promise.resolve((JSON.stringify({ label: "top_level_dead_promise_resolve_json_stringify_index_read" })[0], "top_level_dead_promise_resolve_json_stringify_index_read_marker"));
Promise.resolve("top_level_dead_promise_resolve_string_method_to_well_formed".toWellFormed());
Promise.resolve("top_level_dead_promise_resolve_string_method_to_well_formed_length_read".toWellFormed().length);
Promise.resolve((" top_level_dead_promise_resolve_string_method_trim_upper_call ".trim().toUpperCase(), "top_level_dead_promise_resolve_string_method_trim_upper_call_marker"));
Promise.resolve(("top_level_dead_promise_resolve_string_method_normalize_index_read".normalize()[0], "top_level_dead_promise_resolve_string_method_normalize_index_read_marker"));
Promise.resolve(String.fromCharCode("top_level_dead_promise_resolve_string_static_length_read".length).length);
Promise.resolve((String.fromCodePoint(0x41, 0x43).toUpperCase(), "top_level_dead_promise_resolve_string_code_point_upper_call_marker"));
Promise.resolve((RegExp.escape("top_level_dead_promise_resolve_regexp_escape_index_read")[0], "top_level_dead_promise_resolve_regexp_escape_index_read_marker"));
Promise.resolve(Array.isArray(["top_level_dead_promise_resolve_array_is_array"]));
Promise.resolve(Object.is("top_level_dead_promise_resolve_object_is", "top_level_dead_promise_resolve_object_is"));
Promise.resolve(new Map([["top_level_dead_promise_resolve_map_size_key", "top_level_dead_promise_resolve_map_size_value"]]).size);
Promise.resolve(new Set(["top_level_dead_promise_resolve_set_size"]).size);
Promise.resolve(new Map([["top_level_dead_promise_resolve_map_object_to_string_length_key", "top_level_dead_promise_resolve_map_object_to_string_length_value"]]).toString().length + "top_level_dead_promise_resolve_map_object_to_string_length_read".length);
Promise.resolve((new WeakMap<object, string>().toLocaleString().toUpperCase(), "top_level_dead_promise_resolve_weak_map_object_to_locale_upper_call_marker"));
Promise.resolve((new FinalizationRegistry<string>((held) => {
    "top_level_dead_promise_resolve_finregistry_object_to_string_index_callback";
}).toString()[0], "top_level_dead_promise_resolve_finregistry_object_to_string_index_read_marker"));
Promise.resolve(Object.hasOwn({ top_level_dead_promise_resolve_object_has_own: 1 }, "top_level_dead_promise_resolve_object_has_own"));
Promise.resolve(Object.isExtensible({ top_level_dead_promise_resolve_object_extensible: 1 }));
Promise.resolve(Object.isSealed({ top_level_dead_promise_resolve_object_sealed: 1 }));
Promise.resolve(Object.isFrozen({ top_level_dead_promise_resolve_object_frozen: 1 }));
Promise.resolve(URL.canParse("https://top-level-dead-promise-resolve-url-can-parse.test/"));
Promise.resolve(Reflect.has({ top_level_dead_promise_resolve_reflect_has: 1 }, "top_level_dead_promise_resolve_reflect_has"));
Promise.resolve(Reflect.isExtensible({ top_level_dead_promise_resolve_reflect_extensible: 1 }));
Promise.resolve("top_level_dead_promise_resolve_string_method".trim());
Promise.resolve("top_level_dead_promise_resolve_string_replace".replace("replace", "done"));
Promise.resolve(/top_level_dead_promise_resolve_regexp_test/.test("top_level_dead_promise_resolve_regexp_test"));
Promise.resolve(/top_level_dead_promise_resolve_regexp_string/.toString());
Promise.resolve(["top_level_dead_promise_resolve_array_includes"].includes("missing"));
Promise.resolve(["top_level_dead_promise_resolve_array_index"].lastIndexOf("missing"));
Promise.resolve(["top_level_dead_promise_resolve_array_join"].join("|"));
Promise.resolve(["top_level_dead_promise_resolve_array_string"].toLocaleString());
Promise.resolve(["top_level_dead_promise_resolve_array_join_length_read"].join("|").length);
Promise.resolve((["top_level_dead_promise_resolve_array_to_string_upper_call"].toString().toUpperCase(), "top_level_dead_promise_resolve_array_to_string_upper_call_marker"));
Promise.resolve((["top_level_dead_promise_resolve_array_to_locale_index_read"].toLocaleString()[0], "top_level_dead_promise_resolve_array_to_locale_index_read_marker"));
Promise.resolve((654).toString().length + "top_level_dead_promise_resolve_number_to_string_length_read".length);
Promise.resolve(((true).toLocaleString().toUpperCase(), "top_level_dead_promise_resolve_boolean_to_locale_upper_call_marker"));
Promise.resolve(((654n).toString()[0], "top_level_dead_promise_resolve_bigint_to_string_index_read_marker"));
Promise.resolve(Object.prototype.toString.call({ top_level_dead_promise_resolve_object_prototype_to_string_length_target: 1 }).length + "top_level_dead_promise_resolve_object_prototype_to_string_length_read".length);
Promise.resolve((Object.prototype.toString.call(["top_level_dead_promise_resolve_object_prototype_to_string_upper_target"]).toUpperCase(), "top_level_dead_promise_resolve_object_prototype_to_string_upper_call_marker"));
Promise.resolve((Object.prototype.toString.call(null)[0], "top_level_dead_promise_resolve_object_prototype_to_string_index_read_marker"));
Promise.resolve(Object.prototype.toLocaleString.call("top_level_dead_promise_resolve_object_prototype_to_locale_length").length + "top_level_dead_promise_resolve_object_prototype_to_locale_length_read".length);
Promise.resolve((Object.prototype.toLocaleString.call(true).toUpperCase(), "top_level_dead_promise_resolve_object_prototype_to_locale_upper_call_marker"));
Promise.resolve((Object.prototype.toLocaleString.call(654n)[0], "top_level_dead_promise_resolve_object_prototype_to_locale_index_read_marker"));
Promise.resolve(Object.prototype.toString.call({ top_level_dead_promise_resolve_object_prototype_to_string_call: 1 }));
Promise.resolve(Object.prototype.toLocaleString.call("top_level_dead_promise_resolve_object_prototype_to_locale_call"));
Promise.resolve("top_level_dead_promise_resolve_string_length".length);
Promise.resolve(["top_level_dead_promise_resolve_array_length"].length);
Promise.resolve("top_level_dead_promise_resolve_string_element"[1]);
Promise.resolve(`top_level_dead_promise_resolve_template_${"value"}`);
Promise.resolve(false ? "top_level_dead_promise_resolve_conditional_true" : "top_level_dead_promise_resolve_conditional_false");
const top_level_dead_promise_resolve_logical_source: string = String("top_level_dead_promise_resolve_logical_left");
const top_level_dead_promise_resolve_nullish_source: string | undefined = String("top_level_dead_promise_resolve_nullish_left");
Promise.resolve(top_level_dead_promise_resolve_logical_source || "top_level_dead_promise_resolve_logical_right");
Promise.resolve(top_level_dead_promise_resolve_nullish_source ?? "top_level_dead_promise_resolve_nullish_right");
Promise.resolve((String("top_level_dead_promise_resolve_comma_left"), "top_level_dead_promise_resolve_comma_right"));
Promise.resolve("top_level_dead_promise_resolve_arithmetic".length * 2);
Promise.resolve("top_level_dead_promise_resolve_comparison".length <= 99);
Promise.resolve(String("top_level_dead_promise_resolve_equality") !== "missing");
Promise.resolve("top_level_dead_promise_resolve_in_key" in { top_level_dead_promise_resolve_in_key: true });
Promise.resolve(delete ({ top_level_dead_promise_resolve_delete_key: true } as { top_level_dead_promise_resolve_delete_key?: boolean }).top_level_dead_promise_resolve_delete_key);
Promise.resolve(void String("top_level_dead_promise_resolve_void"));
Promise.resolve(typeof String("top_level_dead_promise_resolve_typeof"));
Promise.resolve(!"top_level_dead_promise_resolve_prefix_bang".length);
Promise.resolve(~"top_level_dead_promise_resolve_prefix_tilde".length);
Promise.try(() => "top_level_dead_promise_try_literal");
Promise.try(function () {
    return String("top_level_dead_promise_try_function");
});
Promise.try(() => {
});
Promise.try(() => Promise.resolve("top_level_dead_promise_try_resolve"));
Promise.try(() => Promise.reject("top_level_dead_promise_try_reject"));
Promise.try(() => Promise.any([] as Promise<string>[]));
Promise.try(() => "top_level_dead_promise_try_then_source")
    .then(() => "top_level_dead_promise_try_then_callback");
Promise.try(() => Promise.reject("top_level_dead_promise_try_catch_source"))
    .catch(() => "top_level_dead_promise_try_catch_callback");
Promise.try(() => Promise.resolve("top_level_dead_promise_try_finally_source"))
    .finally(() => "top_level_dead_promise_try_finally_callback");
Promise.try(() =>
    Promise.resolve("top_level_dead_promise_try_then_passthrough_source").then(),
)
    .then((value) => "top_level_dead_promise_try_then_passthrough_callback");
Promise.try(() =>
    Promise.reject<string>("top_level_dead_promise_try_catch_passthrough_source").catch(),
)
    .catch((reason) => "top_level_dead_promise_try_catch_passthrough_callback");
Promise.try(() =>
    Promise.race([] as Promise<string>[]).then((value) => "top_level_dead_promise_try_pending_then_unreached"),
)
    .finally(() => "top_level_dead_promise_try_pending_then_finally_callback");
Promise.all([] as Promise<string>[])
    .then(() => "top_level_dead_promise_all_empty_then_callback");
Promise.allSettled([] as Promise<string>[])
    .then(() => "top_level_dead_promise_all_settled_empty_then_callback");
Promise.any([] as Promise<string>[])
    .catch(() => "top_level_dead_promise_any_empty_catch_callback");
Promise.all([] as Promise<string>[])
    .finally(() => "top_level_dead_promise_all_empty_finally_callback");
Promise.any([] as Promise<string>[])
    .finally(() => "top_level_dead_promise_any_empty_finally_callback");
Promise.resolve(Promise.resolve("top_level_dead_promise_resolve_adopt_resolve_source"))
    .then(() => "top_level_dead_promise_resolve_adopt_resolve_then_callback");
Promise.resolve(Promise.reject("top_level_dead_promise_resolve_adopt_reject_source"))
    .catch(() => "top_level_dead_promise_resolve_adopt_reject_catch_callback");
Promise.resolve(Promise.all([] as Promise<string>[]))
    .finally(() => "top_level_dead_promise_resolve_adopt_all_finally_callback");
Promise.all([Promise.resolve("top_level_dead_promise_all_fulfilled_source")])
    .then(() => "top_level_dead_promise_all_fulfilled_then_callback");
Promise.all([Promise.reject<string>("top_level_dead_promise_all_rejected_source")])
    .catch(() => "top_level_dead_promise_all_rejected_catch_callback");
Promise.any([
    Promise.reject<string>("top_level_dead_promise_any_fulfilled_rejected_source"),
    Promise.resolve("top_level_dead_promise_any_fulfilled_source"),
])
    .then(() => "top_level_dead_promise_any_fulfilled_then_callback");
Promise.allSettled([
    Promise.resolve("top_level_dead_promise_all_settled_nonempty_resolve_source"),
    Promise.reject<string>("top_level_dead_promise_all_settled_nonempty_reject_source"),
])
    .then(() => "top_level_dead_promise_all_settled_nonempty_then_callback");
Promise.race([Promise.resolve("top_level_dead_promise_race_fulfilled_source")])
    .then(() => "top_level_dead_promise_race_fulfilled_then_callback");
Promise.race([] as Promise<string>[])
    .then(() => "top_level_dead_promise_race_empty_then_callback");
Promise.race([] as Promise<string>[])
    .catch(() => "top_level_dead_promise_race_empty_catch_callback");
Promise.race([] as Promise<string>[])
    .finally(() => "top_level_dead_promise_race_empty_finally_callback");
Promise.resolve(Promise.race([] as Promise<string>[]))
    .finally(() => "top_level_dead_promise_resolve_adopt_pending_finally_callback");
Promise.resolve(
    Promise.resolve("top_level_dead_promise_resolve_adopt_then_passthrough_source").then(),
)
    .then((value) => "top_level_dead_promise_resolve_adopt_then_passthrough_callback");
Promise.resolve(
    Promise.reject<string>("top_level_dead_promise_resolve_adopt_catch_passthrough_source").catch(),
)
    .catch((reason) => "top_level_dead_promise_resolve_adopt_catch_passthrough_callback");
Promise.resolve(
    Promise.race([] as Promise<string>[]).then(() => "top_level_dead_promise_resolve_adopt_pending_then_unreached"),
)
    .finally(() => "top_level_dead_promise_resolve_adopt_pending_then_finally_callback");
Promise.try(() => Promise.race([] as Promise<string>[]))
    .then(() => "top_level_dead_promise_try_pending_then_callback");
new Promise<string>(() => {
})
    .then(() => "top_level_dead_new_promise_empty_then_callback");
new Promise<string>(() => {
})
    .finally(() => "top_level_dead_new_promise_empty_finally_callback");
Promise.all([
    Promise.race([] as Promise<string>[]),
    Promise.reject<string>("top_level_dead_promise_all_pending_rejected_source"),
])
    .catch(() => "top_level_dead_promise_all_pending_rejected_catch_callback");
Promise.all([
    Promise.resolve("top_level_dead_promise_all_then_passthrough_element_source").then(),
])
    .then((value) => "top_level_dead_promise_all_then_passthrough_element_callback");
Promise.all([
    Promise.reject<string>("top_level_dead_promise_all_rejected_then_passthrough_element_source").then(undefined),
])
    .catch((reason) => "top_level_dead_promise_all_rejected_then_passthrough_element_callback");
Promise.all([
    Promise.race([] as Promise<string>[]).then((value) => "top_level_dead_promise_all_pending_then_element_unreached"),
])
    .finally(() => "top_level_dead_promise_all_pending_then_element_finally_callback");
Promise.allSettled([
    Promise.resolve("top_level_dead_promise_all_settled_then_passthrough_fulfilled_element").then(),
    Promise.reject<string>("top_level_dead_promise_all_settled_then_passthrough_rejected_element").catch(),
])
    .then((value) => "top_level_dead_promise_all_settled_then_passthrough_element_callback");
Promise.allSettled([
    Promise.race([] as Promise<string>[]).then((value) => "top_level_dead_promise_all_settled_pending_then_element_unreached"),
])
    .finally(() => "top_level_dead_promise_all_settled_pending_then_element_finally_callback");
Promise.any([
    Promise.reject<string>("top_level_dead_promise_any_then_passthrough_rejected_element").then(undefined),
    Promise.resolve("top_level_dead_promise_any_then_passthrough_fulfilled_element").then(),
])
    .then((value) => "top_level_dead_promise_any_then_passthrough_element_callback");
Promise.any([
    Promise.race([] as Promise<string>[]).then((value) => "top_level_dead_promise_any_pending_then_element_unreached"),
    Promise.reject<string>("top_level_dead_promise_any_pending_then_rejected_element").then(undefined),
])
    .finally(() => "top_level_dead_promise_any_pending_then_element_finally_callback");
Promise.race([
    Promise.resolve("top_level_dead_promise_race_then_passthrough_element_source").then(),
])
    .then((value) => "top_level_dead_promise_race_then_passthrough_element_callback");
Promise.any([
    Promise.race([] as Promise<string>[]),
    Promise.resolve("top_level_dead_promise_any_pending_fulfilled_source"),
])
    .then(() => "top_level_dead_promise_any_pending_fulfilled_then_callback");
Promise.race([
    Promise.race([] as Promise<string>[]),
    Promise.resolve("top_level_dead_promise_race_pending_fulfilled_source"),
])
    .then(() => "top_level_dead_promise_race_pending_fulfilled_then_callback");
Promise.race([
    Promise.race([] as Promise<string>[]),
    Promise.reject<string>("top_level_dead_promise_race_pending_rejected_source"),
])
    .catch(() => "top_level_dead_promise_race_pending_rejected_catch_callback");
Promise.resolve("top_level_dead_promise_then_passthrough_source")
    .then()
    .then(() => "top_level_dead_promise_then_passthrough_callback");
Promise.reject<string>("top_level_dead_promise_catch_passthrough_source")
    .catch()
    .catch((reason) => "top_level_dead_promise_catch_passthrough_callback");
Promise.resolve("top_level_dead_promise_finally_passthrough_source")
    .finally(undefined)
    .then(() => "top_level_dead_promise_finally_passthrough_callback");
Promise.resolve("top_level_dead_promise_finally_callback_source")
    .finally(() => "top_level_dead_promise_finally_callback_passthrough")
    .then(() => "top_level_dead_promise_finally_callback_then_callback");
Promise.reject<string>("top_level_dead_promise_reject_finally_callback_source")
    .finally(() => "top_level_dead_promise_reject_finally_callback_passthrough")
    .catch((reason) => "top_level_dead_promise_reject_finally_callback_catch_callback");
Promise.resolve("top_level_dead_promise_catch_fulfilled_passthrough_source")
    .catch((reason) => "top_level_dead_promise_catch_fulfilled_unreached")
    .then(() => "top_level_dead_promise_catch_fulfilled_passthrough_callback");
Promise.race([] as Promise<string>[])
    .then(() => "top_level_dead_promise_pending_nested_then_callback")
    .finally(() => "top_level_dead_promise_pending_nested_finally_callback");
new Promise<string>(() => {
});
new Promise<string>((resolve) => resolve("top_level_dead_new_promise_resolve"));
new Promise<string>((resolve, reject) => {
    reject("top_level_dead_new_promise_reject");
});
new Promise<string>((resolve) => resolve("top_level_dead_new_promise_then_resolve_source"))
    .then(() => "top_level_dead_new_promise_then_resolve_callback");
new Promise<string>((resolve, reject) => reject("top_level_dead_new_promise_catch_reject_source"))
    .catch(() => "top_level_dead_new_promise_catch_reject_callback");
new Promise<string>((resolve) => resolve("top_level_dead_new_promise_finally_resolve_source"))
    .finally(() => "top_level_dead_new_promise_finally_resolve_callback");
new Promise<string>((resolve, reject) => reject("top_level_dead_new_promise_finally_reject_source"))
    .finally(() => "top_level_dead_new_promise_finally_reject_callback");
new Promise<Promise<string>>((resolve) =>
    resolve(Promise.resolve("top_level_dead_new_promise_resolve_adopt_then_passthrough_source").then()),
)
    .then((value) => "top_level_dead_new_promise_resolve_adopt_then_passthrough_callback");
new Promise<string>((resolve, reject) =>
    reject(Promise.resolve("top_level_dead_new_promise_reject_reason_then_passthrough_source").then()),
)
    .catch((reason) => "top_level_dead_new_promise_reject_reason_then_passthrough_callback");
new Promise<Promise<string>>((resolve) =>
    resolve(Promise.race([] as Promise<string>[]).then((value) => "top_level_dead_new_promise_resolve_pending_then_unreached")),
)
    .finally(() => "top_level_dead_new_promise_resolve_pending_then_finally_callback");
Promise.resolve("top_level_dead_promise_then_source").then(() => "top_level_dead_promise_then_callback");
Promise.resolve("top_level_dead_promise_then_fulfilled_two_arg_source").then(
    () => "top_level_dead_promise_then_fulfilled_two_arg_callback",
    () => "top_level_dead_promise_then_fulfilled_two_arg_unreached",
);
Promise.reject<string>("top_level_dead_promise_then_rejected_two_arg_source").then(
    () => "top_level_dead_promise_then_rejected_two_arg_unreached",
    () => "top_level_dead_promise_then_rejected_two_arg_callback",
);
Promise.reject<string>("top_level_dead_promise_catch_source").catch(() => "top_level_dead_promise_catch_callback");
Promise.resolve("top_level_dead_promise_catch_fulfilled_direct_source")
    .catch((reason) => "top_level_dead_promise_catch_fulfilled_direct_callback");
Promise.resolve("top_level_dead_promise_finally_source").finally(() => {
    String("top_level_dead_promise_finally_callback");
});
const top_level_dead_promise_resolve_object_shorthand = "top_level_dead_promise_resolve_object_shorthand";
Promise.resolve({ top_level_dead_promise_resolve_object_shorthand }.top_level_dead_promise_resolve_object_shorthand);
const top_level_dead_promise_resolve_object_spread_source = { top_level_dead_promise_resolve_object_spread: "top_level_dead_promise_resolve_object_spread" };
Promise.resolve({ ...top_level_dead_promise_resolve_object_spread_source }.top_level_dead_promise_resolve_object_spread);
const top_level_dead_promise_resolve_object_assign_source = { top_level_dead_promise_resolve_object_assign: "top_level_dead_promise_resolve_object_assign" };
Promise.resolve(Object.assign({}, top_level_dead_promise_resolve_object_assign_source).top_level_dead_promise_resolve_object_assign);
Promise.resolve(Object.fromEntries<{ top_level_dead_promise_resolve_object_from_entries: string }>([["top_level_dead_promise_resolve_object_from_entries", "top_level_dead_promise_resolve_object_from_entries"]]).top_level_dead_promise_resolve_object_from_entries);
Promise.resolve(Object.fromEntries<{ top_level_dead_promise_resolve_object_entries_from_entries: string }>(Object.entries({ top_level_dead_promise_resolve_object_entries_from_entries: "top_level_dead_promise_resolve_object_entries_from_entries" })).top_level_dead_promise_resolve_object_entries_from_entries);
Promise.resolve(Object.fromEntries<{ top_level_dead_promise_resolve_object_entries_spread_from_entries: string }>(Object.entries({ ...{ top_level_dead_promise_resolve_object_entries_spread_from_entries: "top_level_dead_promise_resolve_object_entries_spread_from_entries" } })).top_level_dead_promise_resolve_object_entries_spread_from_entries);
Promise.resolve(Object.defineProperty({} as { top_level_dead_promise_resolve_object_define_property: string }, "top_level_dead_promise_resolve_object_define_property", { value: "top_level_dead_promise_resolve_object_define_property", writable: true }).top_level_dead_promise_resolve_object_define_property);
Promise.resolve(Object.defineProperties({} as { top_level_dead_promise_resolve_object_define_properties: string }, { top_level_dead_promise_resolve_object_define_properties: { value: "top_level_dead_promise_resolve_object_define_properties", enumerable: true } }).top_level_dead_promise_resolve_object_define_properties);
Promise.resolve(Object.create(null, { top_level_dead_promise_resolve_object_create_descriptor: { value: "top_level_dead_promise_resolve_object_create_descriptor", configurable: true } }).top_level_dead_promise_resolve_object_create_descriptor);
Promise.resolve(Object.freeze({ top_level_dead_promise_resolve_object_freeze: "top_level_dead_promise_resolve_object_freeze" }).top_level_dead_promise_resolve_object_freeze);
Promise.resolve(Object.seal({ top_level_dead_promise_resolve_object_seal: "top_level_dead_promise_resolve_object_seal" }).top_level_dead_promise_resolve_object_seal);
Promise.resolve(Object.preventExtensions({ top_level_dead_promise_resolve_object_prevent_extensions: "top_level_dead_promise_resolve_object_prevent_extensions" }).top_level_dead_promise_resolve_object_prevent_extensions);
Promise.resolve(Object.setPrototypeOf({ top_level_dead_promise_resolve_object_set_prototype: "top_level_dead_promise_resolve_object_set_prototype" }, null).top_level_dead_promise_resolve_object_set_prototype);
Promise.resolve({ top_level_dead_promise_resolve_object_property: "top_level_dead_promise_resolve_object_property" }.top_level_dead_promise_resolve_object_property);
Promise.resolve(({ top_level_dead_promise_resolve_object_property_missing_source: 1 } as { [key: string]: number }).top_level_dead_promise_resolve_object_property_missing);
Promise.resolve(Reflect.get({ top_level_dead_promise_resolve_reflect_get: "top_level_dead_promise_resolve_reflect_get" }, "top_level_dead_promise_resolve_reflect_get"));
Promise.resolve(Reflect.get(["top_level_dead_promise_resolve_reflect_get_array"], "0"));
Promise.resolve(Object.getOwnPropertyDescriptor({ top_level_dead_promise_resolve_descriptor_value: "top_level_dead_promise_resolve_descriptor_value" }, "top_level_dead_promise_resolve_descriptor_value")!.value);
Promise.resolve(Reflect.getOwnPropertyDescriptor(["top_level_dead_promise_resolve_reflect_descriptor_value"], "0")!.value);
Promise.resolve(Object.hasOwn(Object.freeze({ top_level_dead_promise_resolve_object_has_own_freeze: 1 }), "top_level_dead_promise_resolve_object_has_own_freeze"));
Promise.resolve(Reflect.get(Object.freeze({ top_level_dead_promise_resolve_reflect_get_freeze: "top_level_dead_promise_resolve_reflect_get_freeze" }), "top_level_dead_promise_resolve_reflect_get_freeze"));
Promise.resolve(Reflect.has(Object.freeze({ top_level_dead_promise_resolve_reflect_has_freeze: 1 }), "top_level_dead_promise_resolve_reflect_has_freeze"));
Promise.resolve(Object.getOwnPropertyDescriptor(Object.freeze({ top_level_dead_promise_resolve_descriptor_value_freeze: "top_level_dead_promise_resolve_descriptor_value_freeze" }), "top_level_dead_promise_resolve_descriptor_value_freeze")!.value);
Promise.resolve(Reflect.getOwnPropertyDescriptor(Object.freeze(["top_level_dead_promise_resolve_reflect_descriptor_value_freeze"]), "0")!.value);
Promise.resolve(Object.keys({ top_level_dead_promise_resolve_object_keys_length: 1 }).length);
Promise.resolve(Reflect.ownKeys(["top_level_dead_promise_resolve_reflect_own_keys_length"]).length);
Promise.resolve(Object.getOwnPropertyDescriptors({ top_level_dead_promise_resolve_descriptors_value: "top_level_dead_promise_resolve_descriptors_value" }).top_level_dead_promise_resolve_descriptors_value.value);
Promise.resolve(Object.getOwnPropertyDescriptors(["top_level_dead_promise_resolve_descriptors_array_value"])["0"].value);
Promise.resolve(Array.of("top_level_dead_promise_resolve_array_of_element")[0]);
Promise.resolve(Array.from(["top_level_dead_promise_resolve_array_from_array_element"])[0]);
Promise.resolve(Array.from(Array.of("top_level_dead_promise_resolve_array_from_returned_element", "top_level_dead_promise_resolve_array_from_returned_element_hit").slice(1))[0]);
Promise.resolve(Array.from(Array.of("top_level_dead_promise_resolve_array_from_returned_absent").slice(1))[0]);
Promise.resolve([...Array.of("top_level_dead_promise_resolve_array_spread_returned_element", "top_level_dead_promise_resolve_array_spread_returned_element_hit").slice(1)][0]);
Promise.resolve([...Array.of("top_level_dead_promise_resolve_array_spread_returned_absent").slice(1)][0]);
Promise.resolve(Array.from("top_level_dead_promise_resolve_array_from_string_element")[0]);
Promise.resolve(Object.keys({ top_level_dead_promise_resolve_object_keys_element: 1 })[0]);
Promise.resolve(Object.getOwnPropertyNames(["top_level_dead_promise_resolve_object_property_names_element"])[0]);
Promise.resolve(Array.from(new Set(["top_level_dead_promise_resolve_array_from_set_element"]))[0]);
Promise.resolve(Array.from(new Set(Array.of("top_level_dead_promise_resolve_array_from_set_returned_element").slice(0)))[0]);
Promise.resolve(Array.from(new Set(Array.of("top_level_dead_promise_resolve_array_from_set_returned_absent").slice(1)))[0]);
Promise.resolve(Array.from(new Set(Array.of("top_level_dead_promise_resolve_array_from_set_returned_length_drop", "top_level_dead_promise_resolve_array_from_set_returned_length", "top_level_dead_promise_resolve_array_from_set_returned_length_tail").slice(1))).length);
Promise.resolve(Array.from(new Set(Array.of("top_level_dead_promise_resolve_array_from_set_concat_length").concat(Array.of("top_level_dead_promise_resolve_array_from_set_concat_length_tail")))).length);
Promise.resolve(Array.from(new Set(Array.of("top_level_dead_promise_resolve_array_from_set_reversed_length", "top_level_dead_promise_resolve_array_from_set_reversed_length_tail").toReversed())).length);
Promise.resolve(Array.from(new Set(Array.of("top_level_dead_promise_resolve_array_from_set_sorted_length_b", "top_level_dead_promise_resolve_array_from_set_sorted_length_a").toSorted())).length);
Promise.resolve(Array.from(new Map(Array.of(["top_level_dead_promise_resolve_array_from_empty_map_returned_length", "top_level_dead_promise_resolve_array_from_empty_map_returned_length_value"] as ObjectEntry<string>).slice(1))).length);
Promise.resolve(Array.from(new Map(Array.of(["top_level_dead_promise_resolve_array_from_empty_map_returned_absent", "top_level_dead_promise_resolve_array_from_empty_map_returned_absent_value"] as ObjectEntry<string>).slice(1)))[0]);
Promise.resolve(Array.from(new Map(Array.of(["top_level_dead_promise_resolve_array_from_map_returned_length", "top_level_dead_promise_resolve_array_from_map_returned_length_value"] as ObjectEntry<string>, ["top_level_dead_promise_resolve_array_from_map_returned_length_tail", "top_level_dead_promise_resolve_array_from_map_returned_length_tail_value"] as ObjectEntry<string>).slice(1))).length);
Promise.resolve(Array.from(new Map(Array.of(["top_level_dead_promise_resolve_array_from_map_concat_length", "top_level_dead_promise_resolve_array_from_map_concat_length_value"] as ObjectEntry<string>).concat(Array.of(["top_level_dead_promise_resolve_array_from_map_concat_length_tail", "top_level_dead_promise_resolve_array_from_map_concat_length_tail_value"] as ObjectEntry<string>)))).length);
Promise.resolve(Array.from(new Map(Array.of(["top_level_dead_promise_resolve_array_from_map_reversed_length", "top_level_dead_promise_resolve_array_from_map_reversed_length_value"] as ObjectEntry<string>, ["top_level_dead_promise_resolve_array_from_map_reversed_length_tail", "top_level_dead_promise_resolve_array_from_map_reversed_length_tail_value"] as ObjectEntry<string>).toReversed())).length);
Promise.resolve(Array.from(new Map(Array.of(["top_level_dead_promise_resolve_array_from_map_sorted_length_b", "top_level_dead_promise_resolve_array_from_map_sorted_length_b_value"] as ObjectEntry<string>, ["top_level_dead_promise_resolve_array_from_map_sorted_length_a", "top_level_dead_promise_resolve_array_from_map_sorted_length_a_value"] as ObjectEntry<string>).toSorted())).length);
Promise.resolve(Object.entries(Array.from(Array.of("top_level_dead_promise_resolve_object_entries_array_from_returned_key").slice(0)))[0][0]);
Promise.resolve(Object.entries([...Array.of("top_level_dead_promise_resolve_object_entries_array_spread_returned_key").slice(0)])[0][0]);
Promise.resolve(Object.entries(Array.from(new Set(Array.of("top_level_dead_promise_resolve_object_entries_array_from_set_returned_key").slice(0))))[0][0]);
Promise.resolve(Object.entries(Array.from(new Set(Array.of("top_level_dead_promise_resolve_object_entries_array_from_set_returned_tail_key_drop", "top_level_dead_promise_resolve_object_entries_array_from_set_returned_tail_key", "top_level_dead_promise_resolve_object_entries_array_from_set_returned_tail_key_tail").slice(1))))[1][0]);
Promise.resolve(Object.entries(Array.from(new Set(Array.of("top_level_dead_promise_resolve_object_entries_array_from_set_concat_key").concat(Array.of("top_level_dead_promise_resolve_object_entries_array_from_set_concat_key_tail")))))[1][0]);
Promise.resolve(Object.entries(Array.from(new Set(Array.of("top_level_dead_promise_resolve_object_entries_array_from_set_reversed_key", "top_level_dead_promise_resolve_object_entries_array_from_set_reversed_key_tail").reverse())))[1][0]);
Promise.resolve(Object.entries(Array.from(new Set(Array.of("top_level_dead_promise_resolve_object_entries_array_from_set_sorted_key_b", "top_level_dead_promise_resolve_object_entries_array_from_set_sorted_key_a").sort())))[1][0]);
Promise.resolve(Object.entries(Array.from(new Map(Array.of(["top_level_dead_promise_resolve_object_entries_array_from_empty_map_returned_key", "top_level_dead_promise_resolve_object_entries_array_from_empty_map_returned_key_value"] as ObjectEntry<string>).slice(1))))[0][0]);
Promise.resolve(Object.entries(Array.from(new Map(Array.of(["top_level_dead_promise_resolve_object_entries_array_from_map_returned_key", "top_level_dead_promise_resolve_object_entries_array_from_map_returned_key_value"] as ObjectEntry<string>, ["top_level_dead_promise_resolve_object_entries_array_from_map_returned_key_tail", "top_level_dead_promise_resolve_object_entries_array_from_map_returned_key_tail_value"] as ObjectEntry<string>).slice(1))))[0][0]);
Promise.resolve(Object.entries(Array.from(new Map(Array.of(["top_level_dead_promise_resolve_object_entries_array_from_map_concat_key", "top_level_dead_promise_resolve_object_entries_array_from_map_concat_key_value"] as ObjectEntry<string>).concat(Array.of(["top_level_dead_promise_resolve_object_entries_array_from_map_concat_key_tail", "top_level_dead_promise_resolve_object_entries_array_from_map_concat_key_tail_value"] as ObjectEntry<string>)))))[1][0]);
Promise.resolve(Object.entries(Array.from(new Map(Array.of(["top_level_dead_promise_resolve_object_entries_array_from_map_reversed_key", "top_level_dead_promise_resolve_object_entries_array_from_map_reversed_key_value"] as ObjectEntry<string>, ["top_level_dead_promise_resolve_object_entries_array_from_map_reversed_key_tail", "top_level_dead_promise_resolve_object_entries_array_from_map_reversed_key_tail_value"] as ObjectEntry<string>).reverse())))[1][0]);
Promise.resolve(Object.entries(Array.from(new Map(Array.of(["top_level_dead_promise_resolve_object_entries_array_from_map_sorted_key_b", "top_level_dead_promise_resolve_object_entries_array_from_map_sorted_key_b_value"] as ObjectEntry<string>, ["top_level_dead_promise_resolve_object_entries_array_from_map_sorted_key_a", "top_level_dead_promise_resolve_object_entries_array_from_map_sorted_key_a_value"] as ObjectEntry<string>).sort())))[1][0]);
Promise.resolve(Reflect.ownKeys({ top_level_dead_promise_resolve_reflect_own_keys_element: 1 })[0]);
Promise.resolve(Object.keys(Object.freeze({ top_level_dead_promise_resolve_object_keys_freeze_element: 1 }))[0]);
Promise.resolve(Object.getOwnPropertyNames(Object.freeze(["top_level_dead_promise_resolve_object_property_names_freeze_element"]))[0]);
Promise.resolve(Reflect.ownKeys(Object.freeze({ top_level_dead_promise_resolve_reflect_own_keys_freeze_element: 1 }))[0]);
Promise.resolve(Object.keys({ top_level_dead_promise_resolve_object_keys_join: 1 }).join("|"));
Promise.resolve(Object.getOwnPropertyNames(["top_level_dead_promise_resolve_object_property_names_join"]).join("|"));
Promise.resolve(Object.keys({ top_level_dead_promise_resolve_object_keys_includes: 1 }).includes("top_level_dead_promise_resolve_object_keys_includes"));
Promise.resolve(Object.keys(Object.assign({}, { top_level_dead_promise_resolve_object_keys_assign_join: 1 })).join("|"));
Promise.resolve(Object.getOwnPropertyNames(Object.fromEntries<{ top_level_dead_promise_resolve_object_property_names_from_entries_join: number }>([["top_level_dead_promise_resolve_object_property_names_from_entries_join", 1]])).join("|"));
Promise.resolve(Object.keys(Object.create(null, { top_level_dead_promise_resolve_object_keys_create_descriptor_to_string: { value: 1, enumerable: true } })).toString());
Promise.resolve(Object.getOwnPropertyNames(Object.defineProperty({}, "top_level_dead_promise_resolve_object_property_names_define_property_includes", { value: 1, enumerable: true })).includes("top_level_dead_promise_resolve_object_property_names_define_property_includes"));
Promise.resolve(Reflect.ownKeys({ top_level_dead_promise_resolve_reflect_own_keys_join: 1 }).join("|"));
Promise.resolve(Reflect.ownKeys(["top_level_dead_promise_resolve_reflect_own_keys_to_string"]).toString());
Promise.resolve(Reflect.ownKeys(Object.assign({}, { top_level_dead_promise_resolve_reflect_own_keys_assign_join: 1 })).join("|"));
Promise.resolve(Reflect.ownKeys(Object.fromEntries<{ top_level_dead_promise_resolve_reflect_own_keys_from_entries_join: number }>([["top_level_dead_promise_resolve_reflect_own_keys_from_entries_join", 1]])).join("|"));
Promise.resolve(Reflect.ownKeys(Object.create(null, { top_level_dead_promise_resolve_reflect_own_keys_create_descriptor_join: { value: 1, enumerable: true } })).join("|"));
Promise.resolve(Reflect.ownKeys(Object.defineProperties({}, { top_level_dead_promise_resolve_reflect_own_keys_define_properties_join: { value: 1, enumerable: true } })).join("|"));
Promise.resolve(Array.of("top_level_dead_promise_resolve_array_of_length").length);
Promise.resolve(Array.from(["top_level_dead_promise_resolve_array_from_length"]).length);
Promise.resolve(Array.from(new Set(["top_level_dead_promise_resolve_array_from_set_length"])).length);
Promise.resolve(Array.of("top_level_dead_promise_resolve_array_of_join").join("|"));
Promise.resolve(Array.from(["top_level_dead_promise_resolve_array_from_join"]).join("|"));
Promise.resolve(Array.from("top_level_dead_promise_resolve_array_from_string_to_string").toString());
Promise.resolve(Array.from(["top_level_dead_promise_resolve_array_from_includes"]).includes("top_level_dead_promise_resolve_array_from_includes"));
Promise.resolve(Array.from(new Set(["top_level_dead_promise_resolve_array_from_set_join"])).join("|"));
Promise.resolve(Array.from(new Set(["top_level_dead_promise_resolve_array_from_set_to_string"])).toString());
Promise.resolve(Object.values(["top_level_dead_promise_resolve_object_values_array_element"])[0]);
Promise.resolve(Object.values("top_level_dead_promise_resolve_object_values_string_element")[0]);
Promise.resolve(Object.values({ top_level_dead_promise_resolve_object_values_object_element: "top_level_dead_promise_resolve_object_values_object_element" })[0]);
Promise.resolve(Object.values({ ...{ top_level_dead_promise_resolve_object_values_spread_element: "top_level_dead_promise_resolve_object_values_spread_element" }, top_level_dead_promise_resolve_object_values_spread_tail: "top_level_dead_promise_resolve_object_values_spread_tail" })[1]);
Promise.resolve(Object.values(["top_level_dead_promise_resolve_object_values_array_join"]).join("|"));
Promise.resolve(Object.values("top_level_dead_promise_resolve_object_values_string_to_string").toString());
Promise.resolve(Object.values({ top_level_dead_promise_resolve_object_values_object_join: "top_level_dead_promise_resolve_object_values_object_join" }).join("|"));
Promise.resolve(Object.values({ ...{ top_level_dead_promise_resolve_object_values_spread_join: "top_level_dead_promise_resolve_object_values_spread_join" }, top_level_dead_promise_resolve_object_values_spread_join_tail: "top_level_dead_promise_resolve_object_values_spread_join_tail" }).join("|"));
Promise.resolve(Object.values("top_level_dead_promise_resolve_object_values_number_join".length).join("|"));
Promise.resolve(Object.values(false).toString("top_level_dead_promise_resolve_object_values_boolean_to_string"));
Promise.resolve(Object.values(456n).includes("top_level_dead_promise_resolve_object_values_bigint_includes"));
Promise.resolve(Object.values(Array.of("top_level_dead_promise_resolve_object_values_array_of_join")).join("|"));
Promise.resolve(Object.values(Array.from(["top_level_dead_promise_resolve_object_values_array_from_to_string"])).toString());
Promise.resolve(Object.values(Object.keys({ top_level_dead_promise_resolve_object_values_object_keys_includes: 1 })).includes("top_level_dead_promise_resolve_object_values_object_keys_includes"));
Promise.resolve(Object.values(new Map([["top_level_dead_promise_resolve_object_values_map_join", 1]])).join("|"));
Promise.resolve(Object.values(new Set(["top_level_dead_promise_resolve_object_values_set_to_string"])).toString());
Promise.resolve(Object.values(new WeakMap<object, string>()).toString("top_level_dead_promise_resolve_object_values_weak_map_to_string"));
Promise.resolve(Object.values(Object.assign({} as { top_level_dead_promise_resolve_object_values_assign_join: string }, { top_level_dead_promise_resolve_object_values_assign_join: "top_level_dead_promise_resolve_object_values_assign_join" })).join("|"));
Promise.resolve(Object.values(Object.fromEntries<{ top_level_dead_promise_resolve_object_values_from_entries_join: string }>([["top_level_dead_promise_resolve_object_values_from_entries_join", "top_level_dead_promise_resolve_object_values_from_entries_join"]])).join("|"));
Promise.resolve(Object.values(Object.fromEntries<{ top_level_dead_promise_resolve_object_values_entries_from_entries_join: string }>(Object.entries({ top_level_dead_promise_resolve_object_values_entries_from_entries_join: "top_level_dead_promise_resolve_object_values_entries_from_entries_join" }))).join("|"));
Promise.resolve(Object.values(Object.create(null, { top_level_dead_promise_resolve_object_values_create_descriptor_join: { value: "top_level_dead_promise_resolve_object_values_create_descriptor_join", enumerable: true } })).join("|"));
Promise.resolve(Object.values(Object.defineProperty({} as { top_level_dead_promise_resolve_object_values_define_property_join: string }, "top_level_dead_promise_resolve_object_values_define_property_join", { value: "top_level_dead_promise_resolve_object_values_define_property_join", enumerable: true })).join("|"));
Promise.resolve(Object.values(Object.defineProperties({} as { top_level_dead_promise_resolve_object_values_define_properties_join: string }, { top_level_dead_promise_resolve_object_values_define_properties_join: { value: "top_level_dead_promise_resolve_object_values_define_properties_join", enumerable: true } })).join("|"));
Promise.resolve(Object.entries({ top_level_dead_promise_resolve_object_entries_key: "top_level_dead_promise_resolve_object_entries_value" })[0][0]);
Promise.resolve(Object.entries({ top_level_dead_promise_resolve_object_entries_value_key: "top_level_dead_promise_resolve_object_entries_value" })[0][1]);
Promise.resolve(Object.entries({ ...{ top_level_dead_promise_resolve_object_entries_spread_value_key: "top_level_dead_promise_resolve_object_entries_spread_value" }, top_level_dead_promise_resolve_object_entries_spread_tail_key: "top_level_dead_promise_resolve_object_entries_spread_tail_value" })[1][1]);
Promise.resolve(Object.entries(["top_level_dead_promise_resolve_object_entries_array_value"])[0][1]);
Promise.resolve(Object.entries("top_level_dead_promise_resolve_object_entries_string_value")[0][1]);
Promise.resolve(Object.entries(new Map([["top_level_dead_promise_resolve_object_entries_map_join", 1]])).join("|"));
Promise.resolve(Object.entries(new Set(["top_level_dead_promise_resolve_object_entries_set_to_string"])).toString("top_level_dead_promise_resolve_object_entries_set_to_string_ignored"));
Promise.resolve(Object.entries(new WeakSet<object>()).toString("top_level_dead_promise_resolve_object_entries_weak_set_to_string"));
Promise.resolve(Object.entries("top_level_dead_promise_resolve_object_entries_number_join".length).join("|"));
Promise.resolve(Object.entries(true).toString("top_level_dead_promise_resolve_object_entries_boolean_to_string"));
Promise.resolve(Object.entries(456n).toString("top_level_dead_promise_resolve_object_entries_bigint_to_string"));
Promise.resolve(Object.entries({ top_level_dead_promise_resolve_object_entries_object_join: "top_level_dead_promise_resolve_object_entries_object_join" }).join("|"));
Promise.resolve(Object.entries({ ...{ top_level_dead_promise_resolve_object_entries_spread_join: "top_level_dead_promise_resolve_object_entries_spread_join" }, top_level_dead_promise_resolve_object_entries_spread_join_tail: "top_level_dead_promise_resolve_object_entries_spread_join_tail" }).join("|"));
Promise.resolve(Object.entries(Object.assign({} as { top_level_dead_promise_resolve_object_entries_assign_to_string: string }, { top_level_dead_promise_resolve_object_entries_assign_to_string: "top_level_dead_promise_resolve_object_entries_assign_to_string" })).toString());
Promise.resolve(Object.entries(Object.fromEntries<{ top_level_dead_promise_resolve_object_entries_from_entries_join: string }>([["top_level_dead_promise_resolve_object_entries_from_entries_join", "top_level_dead_promise_resolve_object_entries_from_entries_join"]])).join("|"));
Promise.resolve(Object.values(Object.freeze({ top_level_dead_promise_resolve_object_values_freeze: "top_level_dead_promise_resolve_object_values_freeze" }))[0]);
Promise.resolve(Object.entries(Object.freeze({ top_level_dead_promise_resolve_object_entries_freeze: "top_level_dead_promise_resolve_object_entries_freeze" }))[0][1]);
const top_level_dead_promise_resolve_array_spread_source = ["top_level_dead_promise_resolve_array_spread"];
Promise.resolve([0, ...top_level_dead_promise_resolve_array_spread_source][1]);
Promise.resolve([..."top_level_dead_promise_resolve_string_spread"][3]);
Promise.resolve(["top_level_dead_promise_resolve_array_element"][0]);
Promise.resolve(["top_level_dead_promise_resolve_array_element_oob"][4]);
Promise.resolve(new Date("2102-01-02T03:04:05Z").getUTCFullYear("top_level_dead_promise_resolve_date_getter_ignored"));
Promise.resolve(new Date("2102-02-03T04:05:06Z").toDateString("top_level_dead_promise_resolve_date_string_ignored"));
Promise.resolve(new Date("2102-03-04T05:06:07Z").toUTCString().length);
Promise.resolve((new Date("2102-04-05T06:07:08Z").toDateString().toUpperCase(), "top_level_dead_promise_resolve_date_to_date_string_upper_call_marker"));
Promise.resolve((new Date("2102-05-06T07:08:09Z").toTimeString()[0], "top_level_dead_promise_resolve_date_to_time_string_index_read_marker"));
Promise.resolve(new TypeError("top_level_dead_promise_resolve_error_message").toLocaleString("top_level_dead_promise_resolve_error_ignored"));
Promise.resolve(new AggregateError(["top_level_dead_promise_resolve_aggregate_error_item"], "top_level_dead_promise_resolve_aggregate_error_message").toString("top_level_dead_promise_resolve_aggregate_error_ignored"));
Promise.resolve(new Error("top_level_dead_promise_resolve_error_to_string_length_read").toString().length);
Promise.resolve((new TypeError("top_level_dead_promise_resolve_error_to_locale_upper_call").toLocaleString().toUpperCase(), "top_level_dead_promise_resolve_error_to_locale_upper_call_marker"));
Promise.resolve((new AggregateError(["top_level_dead_promise_resolve_aggregate_error_to_string_index_item"], "top_level_dead_promise_resolve_aggregate_error_to_string_index_read").toString()[0], "top_level_dead_promise_resolve_aggregate_error_to_string_index_read_marker"));
Promise.resolve(new Error("top_level_dead_promise_resolve_error_message_read").message);
Promise.resolve(new RangeError("top_level_dead_promise_resolve_error_name_read").name);
Promise.resolve(new Error("top_level_dead_promise_resolve_error_message_length_read").message.length);
Promise.resolve((new TypeError("top_level_dead_promise_resolve_error_name_upper_call").name.toUpperCase(), "top_level_dead_promise_resolve_error_name_upper_call_marker"));
Promise.resolve((new SyntaxError("top_level_dead_promise_resolve_error_message_index_read").message[0], "top_level_dead_promise_resolve_error_message_index_read_marker"));
Promise.resolve(/top_level_dead_promise_resolve_regexp_source_read/i.source);
Promise.resolve(new RegExp("top_level_dead_promise_resolve_regexp_unicode_read", "u").unicode);
Promise.resolve(/top_level_dead_promise_resolve_regexp_source_length_read/i.source.length);
Promise.resolve((new RegExp("top_level_dead_promise_resolve_regexp_flags_upper_call", "ms").flags.toUpperCase(), "top_level_dead_promise_resolve_regexp_flags_upper_call_marker"));
Promise.resolve((/top_level_dead_promise_resolve_regexp_source_index_read/.source[0], "top_level_dead_promise_resolve_regexp_source_index_read_marker"));
Promise.resolve(/top_level_dead_promise_resolve_regexp_to_string_length_read/.toString().length);
Promise.resolve((new RegExp("top_level_dead_promise_resolve_regexp_to_locale_upper_call", "i").toLocaleString().toUpperCase(), "top_level_dead_promise_resolve_regexp_to_locale_upper_call_marker"));
Promise.resolve((/top_level_dead_promise_resolve_regexp_to_string_index_read/.toString()[0], "top_level_dead_promise_resolve_regexp_to_string_index_read_marker"));
Promise.resolve(Symbol("top_level_dead_promise_resolve_symbol_description_read").description);
Promise.resolve(Symbol("top_level_dead_promise_resolve_symbol_description_length_read").description!.length);
Promise.resolve((Symbol("top_level_dead_promise_resolve_symbol_to_string_upper_call").toString().toUpperCase(), "top_level_dead_promise_resolve_symbol_to_string_upper_call_marker"));
Promise.resolve((Symbol.iterator.description![0], "top_level_dead_promise_resolve_well_known_symbol_description_index_read_marker"));
Promise.resolve(parseFloat("765432.25"));
Promise.resolve(Number.parseFloat("top_level_dead_promise_resolve_number_parse"));
Promise.resolve(Number.isInteger("top_level_dead_promise_resolve_number_predicate".length));
Promise.resolve(encodeURI("top level dead promise resolve uri"));
Promise.resolve(encodeURI("top level dead promise resolve uri length").length);
Promise.resolve((decodeURIComponent("top-level-dead-promise-resolve-uri-upper").toUpperCase(), "top_level_dead_promise_resolve_uri_upper_call_marker"));
Promise.resolve((encodeURIComponent("top level dead promise resolve uri index")[0], "top_level_dead_promise_resolve_uri_index_read_marker"));
Promise.resolve(Math.max("top_level_dead_promise_resolve_math".length, 1));
encodeURI("top level dead encode uri");
encodeURIComponent("top-level-dead-encode-uri-component");
decodeURI("top-level-dead-decode-uri");
decodeURIComponent("top-level-dead-decode-uri-component");
encodeURI("top level dead encode uri length").length;
(decodeURIComponent("top-level-dead-decode-uri-upper").toUpperCase(), "top_level_dead_decode_uri_upper_call_marker".length);
(encodeURIComponent("top level dead encode uri component index")[0], "top_level_dead_encode_uri_component_index_read_marker".length);
BigInt("234567");
BigInt(43);
BigInt(false);
RegExp("top_level_dead_regexp_constructor", "i");
new RegExp("top_level_dead_new_regexp_constructor");
/top_level_dead_regexp_test/.test("top_level_dead_regexp_test_input");
new RegExp("top_level_dead_regexp_exec").exec("top_level_dead_regexp_exec_input");
/top_level_dead_regexp_to_string/.toString();
new RegExp("top_level_dead_regexp_to_locale_string").toLocaleString();
/top_level_dead_regexp_value_of/.valueOf();
Symbol("top_level_dead_symbol_constructor");
"top_level_dead_string_char_at".charAt(1);
"top_level_dead_string_includes".includes("string");
"top_level_dead_string_slice".slice(1, 4);
"top_level_dead_string_case".toLowerCase();
"top_level_dead_string_trim".trimStart();
"top_level_dead_string_normalize".normalize("NFD");
"top_level_dead_string_repeat".repeat(2);
"top_level_dead_string_pad".padEnd(28, ".");
"top_level_dead_string_replace".replace("replace", "replacement");
"top_level_dead_string_replace_all".replaceAll("dead", "replacement");
"top_level_dead_string_replace_regex".replace(/replace_regex/, "replacement");
"top_level_dead_string_replace_all_regex".replaceAll(/replace_all_regex/g, "replacement");
"top_level_dead_string_split/top_level_dead_string_split_tail".split("/");
"top_level_dead_string_split_regex top_level_dead_string_split_regex_tail".split(/\\s+/);
"top_level_dead_string_match".match("string_match");
"top_level_dead_string_match_all".matchAll("string_match_all");
"top_level_dead_string_search".search("string_search");
["top_level_dead_array_slice"].slice(0, 1);
["top_level_dead_array_at"].at(0);
["top_level_dead_array_includes"].includes("top_level_dead_array_includes");
["top_level_dead_array_keys_method"].keys();
["top_level_dead_array_concat"].concat(["top_level_dead_array_concat_tail"]);
[["top_level_dead_array_flat", "top_level_dead_array_flat_tail"]].flat();
["top_level_dead_array_join", "top_level_dead_array_join_tail"].join("/");
["top_level_dead_array_pop"].pop();
["top_level_dead_array_shift"].shift();
["top_level_dead_array_reverse"].reverse();
Object.keys({ top_level_dead_object_keys_reverse: 1 }).reverse();
Object.values({ top_level_dead_object_values_pop: "top_level_dead_object_values_pop" }).pop();
Array.from(new Set(["top_level_dead_array_from_set_shift"])).shift();
["top_level_dead_array_fill", "top_level_dead_array_fill_tail"].fill("top_level_dead_array_fill_value", 0, 1);
["top_level_dead_array_copy_within", "top_level_dead_array_copy_within_tail"].copyWithin(0, 1);
["top_level_dead_array_push"].push("top_level_dead_array_push_value");
["top_level_dead_array_unshift"].unshift("top_level_dead_array_unshift_value");
Object.keys({ top_level_dead_object_keys_fill: 1 }).fill("top_level_dead_object_keys_fill_value");
Object.values({ top_level_dead_object_values_copy_within: "top_level_dead_object_values_copy_within" }).copyWithin(0, 0);
Array.from(new Set(["top_level_dead_array_from_set_push"])).push("top_level_dead_array_from_set_push_value");
Array.from(["top_level_dead_array_from_unshift"]).unshift("top_level_dead_array_from_unshift_value");
["top_level_dead_array_sort_b", "top_level_dead_array_sort_a"].sort();
Object.keys({ top_level_dead_object_keys_sort: 1 }).sort();
Object.values({ top_level_dead_object_values_sort: "top_level_dead_object_values_sort" }).sort();
Array.from(new Set(["top_level_dead_array_from_set_sort"])).sort();
[1].sort((a, b) => "top_level_dead_array_sort_comparator".length + a - b);
Array.of("top_level_dead_array_of_sort_comparator").sort((a, b) => "top_level_dead_array_of_sort_comparator".length + a.localeCompare(b));
Array.from(["top_level_dead_array_from_sort_comparator"]).sort((a, b) => "top_level_dead_array_from_sort_comparator".length + a.localeCompare(b));
Array.from(new Set(["top_level_dead_array_from_set_sort_comparator"])).sort((a, b) => "top_level_dead_array_from_set_sort_comparator".length + a.localeCompare(b));
Array.from(new Map([["top_level_dead_array_from_map_sort_comparator_key", "top_level_dead_array_from_map_sort_comparator_value"]])).sort((a, b) => "top_level_dead_array_from_map_sort_comparator".length + a[0].localeCompare(b[0]));
Object.keys({ top_level_dead_object_keys_sort_comparator: 1 }).sort((a, b) => "top_level_dead_object_keys_sort_comparator".length + a.localeCompare(b));
Object.keys(["top_level_dead_object_keys_array_sort_comparator"]).sort((a, b) => "top_level_dead_object_keys_array_sort_comparator".length + a.localeCompare(b));
Object.getOwnPropertyNames({ top_level_dead_object_property_names_sort_comparator: 1 }).sort((a, b) => "top_level_dead_object_property_names_sort_comparator".length + a.localeCompare(b));
Object.values({ top_level_dead_object_values_sort_comparator: "top_level_dead_object_values_sort_comparator" }).sort((a, b) => "top_level_dead_object_values_sort_comparator".length + a.localeCompare(b));
Object.entries({ top_level_dead_object_entries_sort_comparator: "top_level_dead_object_entries_sort_comparator" }).sort((a, b) => "top_level_dead_object_entries_sort_comparator".length + a[0].localeCompare(b[0]));
Reflect.ownKeys({ top_level_dead_reflect_own_keys_sort_comparator: 1 }).sort((a, b) => "top_level_dead_reflect_own_keys_sort_comparator".length + a.localeCompare(b));
[].map(() => "top_level_dead_empty_array_map");
Array.of<string>().map(() => "top_level_dead_array_of_empty_map");
Array.from([] as string[]).filter(() => "top_level_dead_array_from_empty_filter".length > 0);
Array.from(new Set<string>()).map(() => "top_level_dead_array_from_empty_set_map");
Array.from(new Map<string, string>()).map(() => "top_level_dead_array_from_empty_map_map");
Array.from(new Set(Object.keys({})), (value) => value + "top_level_dead_array_from_object_keys_empty_set_mapper");
Array.from(new Map(Object.entries({})), (entry) => entry[0] + "top_level_dead_array_from_object_entries_empty_map_mapper");
Object.keys({}).map(() => "top_level_dead_object_keys_empty_map");
Object.keys([] as string[]).map(() => "top_level_dead_object_keys_array_empty_map");
Object.getOwnPropertyNames({}).map(() => "top_level_dead_object_property_names_empty_map");
Object.values({}).map(() => "top_level_dead_object_values_empty_map");
Object.entries({}).map(() => "top_level_dead_object_entries_empty_map");
Reflect.ownKeys({}).map(() => "top_level_dead_reflect_own_keys_empty_map");
[].flatMap(() => ["top_level_dead_empty_array_flat_map"]);
[].filter(() => "top_level_dead_empty_array_filter".length > 0);
[].forEach(() => "top_level_dead_empty_array_for_each");
Array.from("").forEach(() => "top_level_dead_array_from_empty_for_each");
[].some(() => "top_level_dead_empty_array_some".length > 0);
Array.of<string>().some(() => "top_level_dead_array_of_empty_some".length > 0);
[].every(() => "top_level_dead_empty_array_every".length > 0);
[].find(() => "top_level_dead_empty_array_find".length > 0);
[].findIndex(() => "top_level_dead_empty_array_find_index".length > 0);
[].findLast(() => "top_level_dead_empty_array_find_last".length > 0);
[].findLastIndex(() => "top_level_dead_empty_array_find_last_index".length > 0);
[].reduce((acc: number) => acc + "top_level_dead_empty_array_reduce".length, 0);
Array.from([] as number[]).reduce((acc: number) => acc + "top_level_dead_array_from_empty_reduce".length, 0);
[].reduceRight((acc: number) => acc + "top_level_dead_empty_array_reduce_right".length, 0);
["top_level_dead_array_to_sorted"].toSorted();
[1].toSorted((a, b) => "top_level_dead_array_to_sorted_comparator".length + a - b);
Array.of("top_level_dead_array_of_to_sorted_comparator").toSorted((a, b) => "top_level_dead_array_of_to_sorted_comparator".length + a.localeCompare(b));
Array.from("x").toSorted((a, b) => "top_level_dead_array_from_string_to_sorted_comparator".length + a.localeCompare(b));
Array.from(new Set(["top_level_dead_array_from_set_to_sorted_comparator"])).toSorted((a, b) => "top_level_dead_array_from_set_to_sorted_comparator".length + a.localeCompare(b));
Array.from(new Map([["top_level_dead_array_from_map_to_sorted_comparator_key", "top_level_dead_array_from_map_to_sorted_comparator_value"]])).toSorted((a, b) => "top_level_dead_array_from_map_to_sorted_comparator".length + a[0].localeCompare(b[0]));
Object.keys(["top_level_dead_object_keys_array_to_sorted_comparator"]).toSorted((a, b) => "top_level_dead_object_keys_array_to_sorted_comparator".length + a.localeCompare(b));
["top_level_dead_array_to_spliced"].toSpliced(0, 0, "top_level_dead_array_to_spliced_insert");
["top_level_dead_array_to_reversed"].toReversed();
["top_level_dead_array_with", "top_level_dead_array_with_tail"].with(-1, "top_level_dead_array_with_replacement");
Array.of("top_level_dead_array_of_with").with(0, "top_level_dead_array_of_with_replacement");
Array.from(["top_level_dead_array_from_with"]).with(-1, "top_level_dead_array_from_with_replacement");
Array.from(new Set(["top_level_dead_array_from_set_with"])).with(0, "top_level_dead_array_from_set_with_replacement");
Array.from(new Set(["top_level_dead_array_from_set_multi_with", "top_level_dead_array_from_set_multi_with_tail"])).with(1, "top_level_dead_array_from_set_multi_with_replacement");
Array.from(new Set<object>([{ label: "top_level_dead_array_from_object_set_multi_with" }, { label: "top_level_dead_array_from_object_set_multi_with_tail" }])).with(1, { label: "top_level_dead_array_from_object_set_multi_with_replacement" });
const top_level_dead_array_from_const_object_set_multi_with_value = { label: "top_level_dead_array_from_const_object_set_multi_with_value" };
Array.from(new Set<object>([top_level_dead_array_from_const_object_set_multi_with_value, top_level_dead_array_from_const_object_set_multi_with_value, { label: "top_level_dead_array_from_const_object_set_multi_with_tail" }])).with(1, { label: "top_level_dead_array_from_const_object_set_multi_with_replacement" });
Array.from(new Set([1, 1, 2])).with(1, "top_level_dead_array_from_numeric_set_multi_with_replacement".length);
Array.from(new Set([NaN, NaN])).with(0, "top_level_dead_array_from_nan_set_with_replacement".length);
Array.from(new Set([Infinity, Infinity])).with(0, "top_level_dead_array_from_infinity_set_with_replacement".length);
Array.from(new Set([-0, 0])).with(0, "top_level_dead_array_from_signed_zero_set_with_replacement".length);
Array.from(new Set([true, true, false])).with(1, "top_level_dead_array_from_boolean_set_multi_with_replacement".length > 0);
Array.from(new Set(Array.of("top_level_dead_array_from_array_of_string_set_multi_with", "top_level_dead_array_from_array_of_string_set_multi_with", "top_level_dead_array_from_array_of_string_set_multi_with_tail"))).with(1, "top_level_dead_array_from_array_of_string_set_multi_with_replacement");
Array.from(new Set(Array.of(1, 1, 2))).with(1, "top_level_dead_array_from_array_of_numeric_set_multi_with_replacement".length);
Array.from(new Set(Array.of(true, true, false))).with(1, "top_level_dead_array_from_array_of_boolean_set_multi_with_replacement".length > 0);
Array.from(new Set(Array.from(["top_level_dead_array_from_array_from_string_set_multi_with", "top_level_dead_array_from_array_from_string_set_multi_with", "top_level_dead_array_from_array_from_string_set_multi_with_tail"]))).with(1, "top_level_dead_array_from_array_from_string_set_multi_with_replacement");
Array.from(new Set(Array.from([1, 1, 2]))).with(1, "top_level_dead_array_from_array_from_numeric_set_multi_with_replacement".length);
Array.from(new Set(Array.from([true, true, false]))).with(1, "top_level_dead_array_from_array_from_boolean_set_multi_with_replacement".length > 0);
const top_level_dead_array_from_array_from_const_string_set_source = ["top_level_dead_array_from_array_from_const_string_set_multi_with", "top_level_dead_array_from_array_from_const_string_set_multi_with", "top_level_dead_array_from_array_from_const_string_set_multi_with_tail"];
const top_level_dead_array_from_array_from_const_numeric_set_source = [1, 1, 2];
const top_level_dead_array_from_array_from_const_boolean_set_source = [true, true, false];
Array.from(new Set(Array.from(top_level_dead_array_from_array_from_const_string_set_source))).with(1, "top_level_dead_array_from_array_from_const_string_set_multi_with_replacement");
Array.from(new Set(Array.from(top_level_dead_array_from_array_from_const_numeric_set_source))).with(1, "top_level_dead_array_from_array_from_const_numeric_set_multi_with_replacement".length);
Array.from(new Set(Array.from(top_level_dead_array_from_array_from_const_boolean_set_source))).with(1, "top_level_dead_array_from_array_from_const_boolean_set_multi_with_replacement".length > 0);
const top_level_dead_array_from_spread_string_set_source = ["top_level_dead_array_from_spread_string_set_multi_with", "top_level_dead_array_from_spread_string_set_multi_with_tail"];
const top_level_dead_array_from_spread_numeric_set_source = [1, 2];
const top_level_dead_array_from_spread_boolean_set_source = [true, false];
Array.from(new Set(["top_level_dead_array_from_spread_string_set_multi_with", ...top_level_dead_array_from_spread_string_set_source])).with(1, "top_level_dead_array_from_spread_string_set_multi_with_replacement");
Array.from(new Set([1, ...top_level_dead_array_from_spread_numeric_set_source])).with(1, "top_level_dead_array_from_spread_numeric_set_multi_with_replacement".length);
Array.from(new Set([true, ...top_level_dead_array_from_spread_boolean_set_source])).with(1, "top_level_dead_array_from_spread_boolean_set_multi_with_replacement".length > 0);
Array.from(new Set(Object.keys({ top_level_dead_array_from_object_keys_set_multi_with: 1, top_level_dead_array_from_object_keys_set_multi_with_tail: 2 }))).with(1, "top_level_dead_array_from_object_keys_set_multi_with_replacement");
Array.from(new Set(Object.getOwnPropertyNames({ top_level_dead_array_from_object_property_names_set_multi_with: 1, top_level_dead_array_from_object_property_names_set_multi_with_tail: 2 }))).with(1, "top_level_dead_array_from_object_property_names_set_multi_with_replacement");
Array.from(new Set(Reflect.ownKeys({ top_level_dead_array_from_reflect_own_keys_set_multi_with: 1, top_level_dead_array_from_reflect_own_keys_set_multi_with_tail: 2 }))).with(1, "top_level_dead_array_from_reflect_own_keys_set_multi_with_replacement");
Array.from(new Set(Object.values({ top_level_dead_array_from_object_values_set_multi_with_a: "top_level_dead_array_from_object_values_set_multi_with", top_level_dead_array_from_object_values_set_multi_with_b: "top_level_dead_array_from_object_values_set_multi_with", top_level_dead_array_from_object_values_set_multi_with_tail: "top_level_dead_array_from_object_values_set_multi_with_tail" }))).with(1, "top_level_dead_array_from_object_values_set_multi_with_replacement");
Array.from(new Set(Object.values({ top_level_dead_array_from_object_values_numeric_set_multi_with_a: 1, top_level_dead_array_from_object_values_numeric_set_multi_with_b: 1, top_level_dead_array_from_object_values_numeric_set_multi_with_tail: 2 }))).with(1, "top_level_dead_array_from_object_values_numeric_set_multi_with_replacement".length);
Array.from(new Set(Object.values({ top_level_dead_array_from_object_values_boolean_set_multi_with_a: true, top_level_dead_array_from_object_values_boolean_set_multi_with_b: true, top_level_dead_array_from_object_values_boolean_set_multi_with_tail: false }))).with(1, "top_level_dead_array_from_object_values_boolean_set_multi_with_replacement".length > 0);
Array.from(new Set<object>(Object.values({ top_level_dead_array_from_object_values_object_set_multi_with_a: { value: 1 }, top_level_dead_array_from_object_values_object_set_multi_with_tail: { value: 2 } }))).with(1, { value: "top_level_dead_array_from_object_values_object_set_multi_with_replacement" });
const top_level_dead_array_from_object_values_array_const_object_set_multi_with_value = { value: "top_level_dead_array_from_object_values_array_const_object_set_multi_with_value" };
Array.from(new Set<object>(Object.values([top_level_dead_array_from_object_values_array_const_object_set_multi_with_value, top_level_dead_array_from_object_values_array_const_object_set_multi_with_value, { value: "top_level_dead_array_from_object_values_array_const_object_set_multi_with_tail" }]))).with(1, { value: "top_level_dead_array_from_object_values_array_const_object_set_multi_with_replacement" });
Array.from(new Set(Object.values(Object.fromEntries<{ top_level_dead_array_from_from_entries_values_set_multi_with_a: string; top_level_dead_array_from_from_entries_values_set_multi_with_b: string; top_level_dead_array_from_from_entries_values_set_multi_with_tail: string }>([["top_level_dead_array_from_from_entries_values_set_multi_with_a", "top_level_dead_array_from_from_entries_values_set_multi_with"], ["top_level_dead_array_from_from_entries_values_set_multi_with_b", "top_level_dead_array_from_from_entries_values_set_multi_with"], ["top_level_dead_array_from_from_entries_values_set_multi_with_tail", "top_level_dead_array_from_from_entries_values_set_multi_with_tail"]])))).with(1, "top_level_dead_array_from_from_entries_values_set_multi_with_replacement");
Array.from(new Set(Object.values(Object.fromEntries<{ top_level_dead_array_from_from_entries_values_numeric_set_multi_with_a: number; top_level_dead_array_from_from_entries_values_numeric_set_multi_with_b: number; top_level_dead_array_from_from_entries_values_numeric_set_multi_with_tail: number }>([["top_level_dead_array_from_from_entries_values_numeric_set_multi_with_a", 1], ["top_level_dead_array_from_from_entries_values_numeric_set_multi_with_b", 1], ["top_level_dead_array_from_from_entries_values_numeric_set_multi_with_tail", 2]])))).with(1, "top_level_dead_array_from_from_entries_values_numeric_set_multi_with_replacement".length);
Array.from(new Set(Object.values(Object.fromEntries<{ top_level_dead_array_from_from_entries_values_boolean_set_multi_with_a: boolean; top_level_dead_array_from_from_entries_values_boolean_set_multi_with_b: boolean; top_level_dead_array_from_from_entries_values_boolean_set_multi_with_tail: boolean }>([["top_level_dead_array_from_from_entries_values_boolean_set_multi_with_a", true], ["top_level_dead_array_from_from_entries_values_boolean_set_multi_with_b", true], ["top_level_dead_array_from_from_entries_values_boolean_set_multi_with_tail", false]])))).with(1, "top_level_dead_array_from_from_entries_values_boolean_set_multi_with_replacement".length > 0);
Array.from(new Set<object>(Object.values(Object.fromEntries<{ top_level_dead_array_from_from_entries_values_object_set_multi_with_a: object; top_level_dead_array_from_from_entries_values_object_set_multi_with_tail: object }>([["top_level_dead_array_from_from_entries_values_object_set_multi_with_a", { value: 1 }], ["top_level_dead_array_from_from_entries_values_object_set_multi_with_tail", { value: 2 }]])))).with(1, { value: "top_level_dead_array_from_from_entries_values_object_set_multi_with_replacement" });
Array.from(new Set(Object.values(Object.assign({} as { top_level_dead_array_from_assign_values_set_multi_with_a: string; top_level_dead_array_from_assign_values_set_multi_with_b: string; top_level_dead_array_from_assign_values_set_multi_with_tail: string }, { top_level_dead_array_from_assign_values_set_multi_with_a: "top_level_dead_array_from_assign_values_set_multi_with", top_level_dead_array_from_assign_values_set_multi_with_b: "top_level_dead_array_from_assign_values_set_multi_with" }, { top_level_dead_array_from_assign_values_set_multi_with_tail: "top_level_dead_array_from_assign_values_set_multi_with_tail" })))).with(1, "top_level_dead_array_from_assign_values_set_multi_with_replacement");
Array.from(new Set(Object.values(Object.assign({} as { top_level_dead_array_from_assign_values_numeric_set_multi_with_a: number; top_level_dead_array_from_assign_values_numeric_set_multi_with_b: number; top_level_dead_array_from_assign_values_numeric_set_multi_with_tail: number }, { top_level_dead_array_from_assign_values_numeric_set_multi_with_a: 1, top_level_dead_array_from_assign_values_numeric_set_multi_with_b: 1 }, { top_level_dead_array_from_assign_values_numeric_set_multi_with_tail: 2 })))).with(1, "top_level_dead_array_from_assign_values_numeric_set_multi_with_replacement".length);
Array.from(new Set(Object.values(Object.assign({} as { top_level_dead_array_from_assign_values_boolean_set_multi_with_a: boolean; top_level_dead_array_from_assign_values_boolean_set_multi_with_b: boolean; top_level_dead_array_from_assign_values_boolean_set_multi_with_tail: boolean }, { top_level_dead_array_from_assign_values_boolean_set_multi_with_a: true, top_level_dead_array_from_assign_values_boolean_set_multi_with_b: true }, { top_level_dead_array_from_assign_values_boolean_set_multi_with_tail: false })))).with(1, "top_level_dead_array_from_assign_values_boolean_set_multi_with_replacement".length > 0);
Array.from(new Set<object>(Object.values(Object.assign({} as { top_level_dead_array_from_assign_values_object_set_multi_with_a: object; top_level_dead_array_from_assign_values_object_set_multi_with_tail: object }, { top_level_dead_array_from_assign_values_object_set_multi_with_a: { value: 1 } }, { top_level_dead_array_from_assign_values_object_set_multi_with_tail: { value: 2 } })))).with(1, { value: "top_level_dead_array_from_assign_values_object_set_multi_with_replacement" });
Array.from(new Set(Object.entries({ top_level_dead_array_from_object_entries_set_multi_with: "top_level_dead_array_from_object_entries_set_multi_with_value", top_level_dead_array_from_object_entries_set_multi_with_tail: "top_level_dead_array_from_object_entries_set_multi_with_tail_value" }))).with(1, ["top_level_dead_array_from_object_entries_set_multi_with_replacement", "top_level_dead_array_from_object_entries_set_multi_with_replacement_value"]);
Array.from(new Map([["top_level_dead_array_from_map_with", "top_level_dead_array_from_map_with_value"]])).with(0, ["top_level_dead_array_from_map_with_replacement", "top_level_dead_array_from_map_with_replacement_value"]);
Array.from(new Map([["top_level_dead_array_from_map_multi_with", "top_level_dead_array_from_map_multi_with_value"], ["top_level_dead_array_from_map_multi_with_tail", "top_level_dead_array_from_map_multi_with_tail_value"]])).with(1, ["top_level_dead_array_from_map_multi_with_replacement", "top_level_dead_array_from_map_multi_with_replacement_value"]);
Array.from(new Map<object, string>([[{ id: 1 }, "top_level_dead_array_from_object_map_multi_with"] as ObjectEntry<string, object>, [{ id: 2 }, "top_level_dead_array_from_object_map_multi_with_tail"] as ObjectEntry<string, object>])).with(1, [{ id: 3 }, "top_level_dead_array_from_object_map_multi_with_replacement"] as ObjectEntry<string, object>);
const top_level_dead_array_from_const_object_map_multi_with_key = { id: "top_level_dead_array_from_const_object_map_multi_with_key" };
Array.from(new Map<object, string>([[top_level_dead_array_from_const_object_map_multi_with_key, "top_level_dead_array_from_const_object_map_multi_with"] as ObjectEntry<string, object>, [top_level_dead_array_from_const_object_map_multi_with_key, "top_level_dead_array_from_const_object_map_multi_with_overwrite"] as ObjectEntry<string, object>, [{ id: 2 }, "top_level_dead_array_from_const_object_map_multi_with_tail"] as ObjectEntry<string, object>])).with(1, [{ id: 3 }, "top_level_dead_array_from_const_object_map_multi_with_replacement"] as ObjectEntry<string, object>);
Array.from(new Map(Object.entries({ top_level_dead_array_from_object_entries_map_multi_with: "top_level_dead_array_from_object_entries_map_multi_with_value", top_level_dead_array_from_object_entries_map_multi_with_tail: "top_level_dead_array_from_object_entries_map_multi_with_tail_value" }))).with(1, ["top_level_dead_array_from_object_entries_map_multi_with_replacement", "top_level_dead_array_from_object_entries_map_multi_with_replacement_value"]);
Array.from(new Map(Array.of(["top_level_dead_array_from_array_of_map_multi_with", "top_level_dead_array_from_array_of_map_multi_with_value"] as ObjectEntry<string>, ["top_level_dead_array_from_array_of_map_multi_with", "top_level_dead_array_from_array_of_map_multi_with_overwrite"] as ObjectEntry<string>, ["top_level_dead_array_from_array_of_map_multi_with_tail", "top_level_dead_array_from_array_of_map_multi_with_tail_value"] as ObjectEntry<string>))).with(1, ["top_level_dead_array_from_array_of_map_multi_with_replacement", "top_level_dead_array_from_array_of_map_multi_with_replacement_value"]);
const top_level_dead_array_from_array_of_const_entry_map_entry_a = ["top_level_dead_array_from_array_of_const_entry_map_multi_with", "top_level_dead_array_from_array_of_const_entry_map_multi_with_value"] as ObjectEntry<string>;
const top_level_dead_array_from_array_of_const_entry_map_entry_b = ["top_level_dead_array_from_array_of_const_entry_map_multi_with", "top_level_dead_array_from_array_of_const_entry_map_multi_with_overwrite"] as ObjectEntry<string>;
const top_level_dead_array_from_array_of_const_entry_map_entry_c = ["top_level_dead_array_from_array_of_const_entry_map_multi_with_tail", "top_level_dead_array_from_array_of_const_entry_map_multi_with_tail_value"] as ObjectEntry<string>;
Array.from(new Map(Array.of(top_level_dead_array_from_array_of_const_entry_map_entry_a, top_level_dead_array_from_array_of_const_entry_map_entry_b, top_level_dead_array_from_array_of_const_entry_map_entry_c))).with(1, ["top_level_dead_array_from_array_of_const_entry_map_multi_with_replacement", "top_level_dead_array_from_array_of_const_entry_map_multi_with_replacement_value"]);
const top_level_dead_array_from_array_from_map_source: ObjectEntry<string>[] = [["top_level_dead_array_from_array_from_map_multi_with", "top_level_dead_array_from_array_from_map_multi_with_value"], ["top_level_dead_array_from_array_from_map_multi_with", "top_level_dead_array_from_array_from_map_multi_with_overwrite"], ["top_level_dead_array_from_array_from_map_multi_with_tail", "top_level_dead_array_from_array_from_map_multi_with_tail_value"]];
Array.from(new Map(Array.from(top_level_dead_array_from_array_from_map_source))).with(1, ["top_level_dead_array_from_array_from_map_multi_with_replacement", "top_level_dead_array_from_array_from_map_multi_with_replacement_value"]);
const top_level_dead_array_from_spread_map_source: ObjectEntry<string>[] = [["top_level_dead_array_from_spread_map_multi_with", "top_level_dead_array_from_spread_map_multi_with_overwrite"], ["top_level_dead_array_from_spread_map_multi_with_tail", "top_level_dead_array_from_spread_map_multi_with_tail_value"]];
Array.from(new Map([["top_level_dead_array_from_spread_map_multi_with", "top_level_dead_array_from_spread_map_multi_with_value"] as ObjectEntry<string>, ...top_level_dead_array_from_spread_map_source])).with(1, ["top_level_dead_array_from_spread_map_multi_with_replacement", "top_level_dead_array_from_spread_map_multi_with_replacement_value"]);
Object.keys({ top_level_dead_object_keys_with: 1 }).with(0, "top_level_dead_object_keys_with_replacement");
Object.keys({ ...{ top_level_dead_object_keys_spread_with: 1 }, top_level_dead_object_keys_spread_with_tail: 2 }).with(1, "top_level_dead_object_keys_spread_with_replacement");
Object.keys(["top_level_dead_object_keys_array_with"]).with(0, "top_level_dead_object_keys_array_with_replacement");
Object.keys(Object.fromEntries<{ top_level_dead_object_keys_from_entries_with: number; top_level_dead_object_keys_from_entries_tail: number }>([["top_level_dead_object_keys_from_entries_with", 1], ["top_level_dead_object_keys_from_entries_tail", 2]])).with(1, "top_level_dead_object_keys_from_entries_replacement");
Object.keys(Object.create(null, { top_level_dead_object_keys_create_descriptor_with: { value: 1, enumerable: true }, top_level_dead_object_keys_create_descriptor_tail: { value: 2, enumerable: true } })).with(1, "top_level_dead_object_keys_create_descriptor_replacement");
Object.keys(Object.freeze({ top_level_dead_object_keys_freeze_with: 1, top_level_dead_object_keys_freeze_tail: 2 })).with(1, "top_level_dead_object_keys_freeze_replacement");
Object.getOwnPropertyNames({ top_level_dead_object_property_names_with: 1 }).with(0, "top_level_dead_object_property_names_with_replacement");
Object.getOwnPropertyNames(Object.assign({} as { top_level_dead_object_property_names_assign_with: number; top_level_dead_object_property_names_assign_tail: number }, { top_level_dead_object_property_names_assign_with: 1 }, { top_level_dead_object_property_names_assign_tail: 2 })).with(1, "top_level_dead_object_property_names_assign_replacement");
Object.getOwnPropertyNames(Object.defineProperty({} as { top_level_dead_object_property_names_define_property_with: number }, "top_level_dead_object_property_names_define_property_with", { value: 1 })).with(0, "top_level_dead_object_property_names_define_property_replacement");
Object.getOwnPropertyNames(Object.seal({ top_level_dead_object_property_names_seal_with: 1, top_level_dead_object_property_names_seal_tail: 2 })).with(1, "top_level_dead_object_property_names_seal_replacement");
Object.values({ top_level_dead_object_values_with: "top_level_dead_object_values_with" }).with(0, "top_level_dead_object_values_with_replacement");
Object.values(Object.fromEntries<{ top_level_dead_object_values_from_entries_with: string; top_level_dead_object_values_from_entries_tail: string }>([["top_level_dead_object_values_from_entries_with", "top_level_dead_object_values_from_entries_with"], ["top_level_dead_object_values_from_entries_tail", "top_level_dead_object_values_from_entries_tail"]])).with(1, "top_level_dead_object_values_from_entries_replacement");
Object.values(Object.defineProperties({} as { top_level_dead_object_values_define_properties_with: string; top_level_dead_object_values_define_properties_tail: string }, { top_level_dead_object_values_define_properties_with: { value: "top_level_dead_object_values_define_properties_with", enumerable: true }, top_level_dead_object_values_define_properties_tail: { value: "top_level_dead_object_values_define_properties_tail", enumerable: true } })).with(1, "top_level_dead_object_values_define_properties_replacement");
Object.values(Object.preventExtensions({ top_level_dead_object_values_prevent_extensions_with: "top_level_dead_object_values_prevent_extensions_with", top_level_dead_object_values_prevent_extensions_tail: "top_level_dead_object_values_prevent_extensions_tail" })).with(1, "top_level_dead_object_values_prevent_extensions_replacement");
Object.entries({ top_level_dead_object_entries_with: "top_level_dead_object_entries_with" }).with(0, ["top_level_dead_object_entries_with_key", "top_level_dead_object_entries_with_value"]);
Object.entries(Object.assign({} as { top_level_dead_object_entries_assign_with: string; top_level_dead_object_entries_assign_tail: string }, { top_level_dead_object_entries_assign_with: "top_level_dead_object_entries_assign_with" }, { top_level_dead_object_entries_assign_tail: "top_level_dead_object_entries_assign_tail" })).with(1, ["top_level_dead_object_entries_assign_key", "top_level_dead_object_entries_assign_value"]);
Object.entries(Object.create(null, { top_level_dead_object_entries_create_descriptor_with: { value: "top_level_dead_object_entries_create_descriptor_with", enumerable: true }, top_level_dead_object_entries_create_descriptor_tail: { value: "top_level_dead_object_entries_create_descriptor_tail", enumerable: true } })).with(1, ["top_level_dead_object_entries_create_descriptor_key", "top_level_dead_object_entries_create_descriptor_value"]);
Object.entries(Object.setPrototypeOf({ top_level_dead_object_entries_set_prototype_with: "top_level_dead_object_entries_set_prototype_with", top_level_dead_object_entries_set_prototype_tail: "top_level_dead_object_entries_set_prototype_tail" }, null)).with(1, ["top_level_dead_object_entries_set_prototype_key", "top_level_dead_object_entries_set_prototype_value"]);
Reflect.ownKeys({ top_level_dead_reflect_own_keys_with: 1 }).with(0, "top_level_dead_reflect_own_keys_with_replacement");
Reflect.ownKeys(Object.assign({} as { top_level_dead_reflect_own_keys_assign_with: number; top_level_dead_reflect_own_keys_assign_tail: number }, { top_level_dead_reflect_own_keys_assign_with: 1 }, { top_level_dead_reflect_own_keys_assign_tail: 2 })).with(1, "top_level_dead_reflect_own_keys_assign_replacement");
Reflect.ownKeys(Object.defineProperties({} as { top_level_dead_reflect_own_keys_define_properties_with: number; top_level_dead_reflect_own_keys_define_properties_tail: number }, { top_level_dead_reflect_own_keys_define_properties_with: { value: 1 }, top_level_dead_reflect_own_keys_define_properties_tail: { value: 2 } })).with(1, "top_level_dead_reflect_own_keys_define_properties_replacement");
Reflect.ownKeys(Object.freeze({ top_level_dead_reflect_own_keys_freeze_with: 1, top_level_dead_reflect_own_keys_freeze_tail: 2 })).with(1, "top_level_dead_reflect_own_keys_freeze_replacement");
["top_level_dead_array_to_string", "top_level_dead_array_to_string_tail"].toString();
["top_level_dead_array_to_locale_string", "top_level_dead_array_to_locale_string_tail"].toLocaleString();
["top_level_dead_array_join_length_read"].join("|").length;
(["top_level_dead_array_to_string_upper_call"].toString().toUpperCase(), "top_level_dead_array_to_string_upper_call_marker".length);
(["top_level_dead_array_to_locale_index_read"].toLocaleString()[0], "top_level_dead_array_to_locale_index_read_marker".length);
new Error("top_level_dead_error_constructor");
new RangeError("top_level_dead_range_error_constructor");
new AggregateError(["top_level_dead_aggregate_error_item"], "top_level_dead_aggregate_error_message", { cause: "top_level_dead_aggregate_error_cause" });
AggregateError(["top_level_dead_aggregate_error_call_item"], "top_level_dead_aggregate_error_call_message");
new Error("top_level_dead_error_message_read").message;
new SyntaxError("top_level_dead_error_name_read").name;
new Error("top_level_dead_error_cause_read_message", { cause: "top_level_dead_error_cause_read" }).cause;
new AggregateError(["top_level_dead_aggregate_error_errors_read"], "top_level_dead_aggregate_error_errors_read_message").errors;
new Error("top_level_dead_error_message_length_read").message.length;
(new TypeError("top_level_dead_error_name_upper_call").name.toUpperCase(), "top_level_dead_error_name_upper_call_marker".length);
(new SyntaxError("top_level_dead_error_message_index_read").message[0], "top_level_dead_error_message_index_read_marker".length);
new Error("top_level_dead_error_to_string_length_read").toString().length;
(new TypeError("top_level_dead_error_to_locale_upper_call").toLocaleString().toUpperCase(), "top_level_dead_error_to_locale_upper_call_marker".length);
(new AggregateError(["top_level_dead_aggregate_error_to_string_index_item"], "top_level_dead_aggregate_error_to_string_index_read").toString()[0], "top_level_dead_aggregate_error_to_string_index_read_marker".length);
/top_level_dead_regexp_source_read/g.source;
new RegExp("top_level_dead_regexp_flags_read", "im").flags;
new RegExp("top_level_dead_regexp_boolean_read", "s").dotAll;
/top_level_dead_regexp_source_length_read/g.source.length;
(new RegExp("top_level_dead_regexp_flags_upper_call", "im").flags.toUpperCase(), "top_level_dead_regexp_flags_upper_call_marker".length);
(/top_level_dead_regexp_source_index_read/.source[0], "top_level_dead_regexp_source_index_read_marker".length);
/top_level_dead_regexp_to_string_length_read/.toString().length;
(new RegExp("top_level_dead_regexp_to_locale_upper_call", "i").toLocaleString().toUpperCase(), "top_level_dead_regexp_to_locale_upper_call_marker".length);
(/top_level_dead_regexp_to_string_index_read/.toString()[0], "top_level_dead_regexp_to_string_index_read_marker".length);
Symbol("top_level_dead_symbol_description_read").description;
Symbol("top_level_dead_symbol_description_length_read").description!.length;
(Symbol("top_level_dead_symbol_to_locale_upper_call").toLocaleString().toUpperCase(), "top_level_dead_symbol_to_locale_upper_call_marker".length);
(Symbol.asyncIterator.description![0], "top_level_dead_well_known_symbol_description_index_read_marker".length);
(789).toString().length + "top_level_dead_number_to_string_length_read".length;
((false).toLocaleString().toUpperCase(), "top_level_dead_boolean_to_locale_upper_call_marker".length);
((789n).toString()[0], "top_level_dead_bigint_to_string_index_read_marker".length);
Object.prototype.toString.call({ top_level_dead_object_prototype_to_string_length_target: 1 }).length + "top_level_dead_object_prototype_to_string_length_read".length;
(Object.prototype.toString.call(["top_level_dead_object_prototype_to_string_upper_target"]).toUpperCase(), "top_level_dead_object_prototype_to_string_upper_call_marker".length);
(Object.prototype.toString.call(null)[0], "top_level_dead_object_prototype_to_string_index_read_marker".length);
Object.prototype.toLocaleString.call("top_level_dead_object_prototype_to_locale_length").length + "top_level_dead_object_prototype_to_locale_length_read".length;
(Object.prototype.toLocaleString.call(false).toUpperCase(), "top_level_dead_object_prototype_to_locale_upper_call_marker".length);
(Object.prototype.toLocaleString.call(987n)[0], "top_level_dead_object_prototype_to_locale_index_read_marker".length);
Object.prototype.toString.call({ top_level_dead_object_prototype_to_string_call: 1 });
Object.prototype.toLocaleString.call("top_level_dead_object_prototype_to_locale_call");
Object.prototype.hasOwnProperty.call({ top_level_dead_object_prototype_has_own: 1 }, "top_level_dead_object_prototype_has_own");
Object.prototype.propertyIsEnumerable.call({ top_level_dead_object_prototype_property_is_enumerable: 1 }, "top_level_dead_object_prototype_property_is_enumerable");
Object.prototype.isPrototypeOf.call({ top_level_dead_object_prototype_is_prototype_of: 1 }, {});
Object.prototype.valueOf.call({ top_level_dead_object_prototype_value_of: 1 });
(Object.prototype.valueOf.call({ top_level_dead_object_prototype_value_of_property_read: 1 }) as { top_level_dead_object_prototype_value_of_property_read: number }).top_level_dead_object_prototype_value_of_property_read;
(Object.prototype.valueOf.call(["top_level_dead_object_prototype_value_of_element_read"]) as string[])[0];
(Object.prototype.valueOf.call(Object.freeze({ top_level_dead_object_prototype_value_of_freeze_property_read: 1 })) as { top_level_dead_object_prototype_value_of_freeze_property_read: number }).top_level_dead_object_prototype_value_of_freeze_property_read;
(Object.prototype.valueOf.call(Object.seal(["top_level_dead_object_prototype_value_of_seal_element_read"])) as string[])[0];
(Object.prototype.valueOf.call(Object.assign({}, { top_level_dead_object_prototype_value_of_assign_read: 1 })) as { top_level_dead_object_prototype_value_of_assign_read: number }).top_level_dead_object_prototype_value_of_assign_read;
(Object.prototype.valueOf.call(Object.create(null, { top_level_dead_object_prototype_value_of_create_read: { value: 1 } })) as { top_level_dead_object_prototype_value_of_create_read: number }).top_level_dead_object_prototype_value_of_create_read;
(Object.prototype.valueOf.call(Object.defineProperty({}, "top_level_dead_object_prototype_value_of_define_property_read", { value: 1 })) as { top_level_dead_object_prototype_value_of_define_property_read: number }).top_level_dead_object_prototype_value_of_define_property_read;
(Object.prototype.valueOf.call(Object.defineProperties({}, { top_level_dead_object_prototype_value_of_define_properties_read: { value: 1 } })) as { top_level_dead_object_prototype_value_of_define_properties_read: number }).top_level_dead_object_prototype_value_of_define_properties_read;
(Object.prototype.valueOf.call(Object.fromEntries([["top_level_dead_object_prototype_value_of_from_entries_read", 1]])) as { top_level_dead_object_prototype_value_of_from_entries_read: number }).top_level_dead_object_prototype_value_of_from_entries_read;
Promise.resolve(Object.prototype.hasOwnProperty.call({ top_level_dead_promise_resolve_object_prototype_has_own: 1 }, "top_level_dead_promise_resolve_object_prototype_has_own"));
Promise.resolve(Object.prototype.propertyIsEnumerable.call({ top_level_dead_promise_resolve_object_prototype_property_is_enumerable: 1 }, "top_level_dead_promise_resolve_object_prototype_property_is_enumerable"));
Promise.resolve(Object.prototype.isPrototypeOf.call({ top_level_dead_promise_resolve_object_prototype_is_prototype_of: 1 }, {}));
Promise.resolve((Object.prototype.valueOf.call({ top_level_dead_promise_resolve_object_prototype_value_of_property_read: 1 }) as { top_level_dead_promise_resolve_object_prototype_value_of_property_read: number }).top_level_dead_promise_resolve_object_prototype_value_of_property_read);
Promise.resolve((Object.prototype.valueOf.call(["top_level_dead_promise_resolve_object_prototype_value_of_element_read"]) as string[])[0]);
Promise.resolve((Object.prototype.valueOf.call(Object.freeze({ top_level_dead_promise_resolve_object_prototype_value_of_freeze_property_read: 1 })) as { top_level_dead_promise_resolve_object_prototype_value_of_freeze_property_read: number }).top_level_dead_promise_resolve_object_prototype_value_of_freeze_property_read);
Promise.resolve((Object.prototype.valueOf.call(Object.seal(["top_level_dead_promise_resolve_object_prototype_value_of_seal_element_read"])) as string[])[0]);
Promise.resolve((Object.prototype.valueOf.call(Object.assign({}, { top_level_dead_promise_resolve_object_prototype_value_of_assign_read: 1 })) as { top_level_dead_promise_resolve_object_prototype_value_of_assign_read: number }).top_level_dead_promise_resolve_object_prototype_value_of_assign_read);
Promise.resolve((Object.prototype.valueOf.call(Object.create(null, { top_level_dead_promise_resolve_object_prototype_value_of_create_read: { value: 1 } })) as { top_level_dead_promise_resolve_object_prototype_value_of_create_read: number }).top_level_dead_promise_resolve_object_prototype_value_of_create_read);
Promise.resolve((Object.prototype.valueOf.call(Object.defineProperty({}, "top_level_dead_promise_resolve_object_prototype_value_of_define_property_read", { value: 1 })) as { top_level_dead_promise_resolve_object_prototype_value_of_define_property_read: number }).top_level_dead_promise_resolve_object_prototype_value_of_define_property_read);
Promise.resolve((Object.prototype.valueOf.call(Object.defineProperties({}, { top_level_dead_promise_resolve_object_prototype_value_of_define_properties_read: { value: 1 } })) as { top_level_dead_promise_resolve_object_prototype_value_of_define_properties_read: number }).top_level_dead_promise_resolve_object_prototype_value_of_define_properties_read);
Promise.resolve((Object.prototype.valueOf.call(Object.fromEntries([["top_level_dead_promise_resolve_object_prototype_value_of_from_entries_read", 1]])) as { top_level_dead_promise_resolve_object_prototype_value_of_from_entries_read: number }).top_level_dead_promise_resolve_object_prototype_value_of_from_entries_read);
Object.is("top_level_dead_object_is", "dead");
Math.max("top_level_dead_math_call".length, 1);
String.fromCharCode("top_level_dead_from_char_code".length);
String.fromCodePoint(0x42, 0x1f601);
RegExp.escape("top_level_dead_regexp_escape");
String.raw`top_level_dead_string_raw_tagged_template`;
String.raw`top_level_dead_string_raw_length_${"top_level_dead_string_raw_length_expr".length}`.length;
(String.raw`top_level_dead_string_raw_upper_${"top_level_dead_string_raw_upper_expr"}`.toUpperCase(), "top_level_dead_string_raw_upper_call_marker".length);
(String.raw`top_level_dead_string_raw_index_read`[0], "top_level_dead_string_raw_index_read_marker".length);
JSON.stringify({ top_level_dead_json_stringify_key: "top_level_dead_json_stringify_value", count: 1 });
JSON.stringify(["top_level_dead_json_stringify_length_read", 2]).length;
(JSON.stringify("top_level_dead_json_stringify_upper_call").toUpperCase(), "top_level_dead_json_stringify_upper_call_marker".length);
(JSON.stringify({ label: "top_level_dead_json_stringify_index_read" })[0], "top_level_dead_json_stringify_index_read_marker".length);
"top_level_dead_string_method_to_well_formed_length_read".toWellFormed().length;
(" top_level_dead_string_method_trim_upper_call ".trim().toUpperCase(), "top_level_dead_string_method_trim_upper_call_marker".length);
("top_level_dead_string_method_normalize_index_read".normalize()[0], "top_level_dead_string_method_normalize_index_read_marker".length);
String.fromCharCode("top_level_dead_string_from_char_code_length_read".length).length;
(String.fromCodePoint(0x41, 0x44).toUpperCase(), "top_level_dead_string_from_code_point_upper_call_marker".length);
(RegExp.escape("top_level_dead_regexp_escape_index_read")[0], "top_level_dead_regexp_escape_index_read_marker".length);
Object.keys({ top_level_dead_object_keys: 1 });
Object.values({ top_level_dead_object_values: 2 });
Object.hasOwn({ top_level_dead_object_has_own: 1 }, "top_level_dead_object_has_own");
Object.getOwnPropertyNames({ top_level_dead_property_names: 1 });
Object.getOwnPropertyDescriptor({ top_level_dead_property_descriptor: 1 }, "top_level_dead_property_descriptor");
Object.getPrototypeOf({ top_level_dead_get_prototype: 1 });
Object.isExtensible({ top_level_dead_is_extensible: 1 });
Object.isSealed(["top_level_dead_is_sealed"]);
Object.isFrozen({ top_level_dead_is_frozen: 1 });
Object.preventExtensions({ top_level_dead_prevent_extensions: 1 });
Object.seal({ top_level_dead_seal: 1 });
Object.freeze(["top_level_dead_freeze"]);
Object.setPrototypeOf({ top_level_dead_set_prototype: 1 }, { proto: "top_level_dead_set_prototype_proto" });
Object.keys("top_level_dead_object_primitive_keys");
Object.values("top_level_dead_object_primitive_values");
Object.entries("top_level_dead_object_primitive_entries");
Object.getOwnPropertyNames("top_level_dead_object_primitive_property_names");
Object.getOwnPropertyDescriptor("top_level_dead_object_primitive_descriptor", "0");
Object.getOwnPropertyDescriptors("top_level_dead_object_primitive_descriptors");
Object.hasOwn("top_level_dead_object_primitive_has_own", "0");
Object.getPrototypeOf("top_level_dead_object_primitive_get_prototype");
Object.isExtensible("top_level_dead_object_primitive_is_extensible");
Object.isSealed("top_level_dead_object_primitive_is_sealed");
Object.isFrozen("top_level_dead_object_primitive_is_frozen");
Object.preventExtensions("top_level_dead_object_primitive_prevent_extensions");
Object.seal("top_level_dead_object_primitive_seal");
Object.freeze("top_level_dead_object_primitive_freeze");
Object.create(null);
Object.create({ top_level_dead_create_object: 1 });
Object.create({ top_level_dead_create_descriptors_proto: 1 }, { top_level_dead_create_descriptors_key: { value: "top_level_dead_create_descriptors_value", configurable: true } });
Object.assign({ top_level_dead_assign_target: 1 }, { top_level_dead_assign_source: 2 });
Object.assign(["top_level_dead_assign_array_target"], ["top_level_dead_assign_array_source"]);
Object.assign({ top_level_dead_assign_primitive_target: 1 }, "top_level_dead_assign_primitive_source");
Object.assign({ top_level_dead_assign_nullish_target: 1 }, null, undefined, "top_level_dead_assign_nullish_primitive_source");
Object.defineProperty({ top_level_dead_define_property_target: 1 }, "top_level_dead_define_property_key", { value: "top_level_dead_define_property_value", writable: true });
Object.defineProperties({ top_level_dead_define_properties_target: 1 }, { top_level_dead_define_properties_key: { value: "top_level_dead_define_properties_value", enumerable: true } });
Object.fromEntries([["top_level_dead_from_entries_key", "top_level_dead_from_entries_value"]]);
Object.fromEntries(Object.entries({ top_level_dead_from_entries_object_entries_key: "top_level_dead_from_entries_object_entries_value" }));
Object.fromEntries(new Map<string, string>());
Object.groupBy([] as number[], (value) => "top_level_dead_object_group_by_empty" + value);
Map.groupBy([] as number[], (value) => "top_level_dead_map_group_by_empty" + value);
Object.groupBy(Array.from(unused_group_by_empty_array_source), (value) => "top_level_dead_object_group_by_empty_array_copy" + value);
Map.groupBy(Array.from(unused_group_by_empty_array_source), (value) => "top_level_dead_map_group_by_empty_array_copy" + value);
Object.groupBy(Array.from(""), (value) => "top_level_dead_object_group_by_array_from_empty" + value);
Map.groupBy(Array.of<number>(), (value) => "top_level_dead_map_group_by_array_of_empty" + value);
Object.groupBy(new Set<number>(), (value) => "top_level_dead_object_group_by_empty_set" + value);
Map.groupBy(new Set<number>(), (value) => "top_level_dead_map_group_by_empty_set" + value);
Object.groupBy(new Set(unused_group_by_empty_set_source), (value) => "top_level_dead_object_group_by_empty_set_copy" + value);
Map.groupBy(new Set(unused_group_by_empty_set_source), (value) => "top_level_dead_map_group_by_empty_set_copy" + value);
Object.groupBy("", (value) => "top_level_dead_object_group_by_empty_string" + value);
Map.groupBy("", (value) => "top_level_dead_map_group_by_empty_string" + value);
Object.groupBy(unused_group_by_empty_string_source, (value) => "top_level_dead_object_group_by_empty_string_const" + value);
Map.groupBy(unused_group_by_empty_string_source, (value) => "top_level_dead_map_group_by_empty_string_const" + value);
Object.groupBy(new Map<string, number>(), (entry) => "top_level_dead_object_group_by_empty_map" + entry[0] + entry[1]);
Map.groupBy(new Map<string, number>(), (entry) => "top_level_dead_map_group_by_empty_map" + entry[0] + entry[1]);
Object.groupBy(new Map(unused_group_by_empty_map_source), (entry) => "top_level_dead_object_group_by_empty_map_copy" + entry[0] + entry[1]);
Map.groupBy(new Map(unused_group_by_empty_map_source), (entry) => "top_level_dead_map_group_by_empty_map_copy" + entry[0] + entry[1]);
Object.keys(new WeakMap<object, string>());
Object.hasOwn(new FinalizationRegistry<string>(() => "top_level_dead_collection_finregistry"), "top_level_dead_collection_has_own");
Reflect.ownKeys(new WeakRef<object>({ label: "top_level_dead_collection_reflect_weak_ref" }));
Object.keys(new URL("https://top-level-dead-url-object-keys.test/path"));
Reflect.ownKeys(new URL("https://top-level-dead-url-reflect-own-keys.test/path"));
Reflect.has({ top_level_dead_reflect_has: 1 }, "top_level_dead_reflect_has");
Reflect.ownKeys({ top_level_dead_reflect_own_keys: 1 });
Reflect.get({ top_level_dead_reflect_get: 1 }, "top_level_dead_reflect_get");
Reflect.get(["top_level_dead_reflect_get_array"], "0");
Reflect.set({ top_level_dead_reflect_set_target: 1 }, "top_level_dead_reflect_set_key", "top_level_dead_reflect_set_value");
Reflect.set(["top_level_dead_reflect_set_array_target"], "0", "top_level_dead_reflect_set_array_value");
Reflect.deleteProperty({ top_level_dead_reflect_delete_property: 1 }, "top_level_dead_reflect_delete_property");
Reflect.defineProperty({ top_level_dead_reflect_define_property_target: 1 }, "top_level_dead_reflect_define_property_key", { value: "top_level_dead_reflect_define_property_value", enumerable: true });
Reflect.getPrototypeOf({ top_level_dead_reflect_get_prototype: 1 });
Reflect.isExtensible(["top_level_dead_reflect_is_extensible"]);
Reflect.preventExtensions({ top_level_dead_reflect_prevent_extensions: 1 });
Reflect.setPrototypeOf({ top_level_dead_reflect_set_prototype: 1 }, null);
(1 + 2) * 3;
"top_level_dead_length".length;
"top_level_dead_index"[0];
({ label: "top_level_dead_prop" }).label;
// @ts-ignore: intentional pure comma expression for generated-C DCE coverage.
(1, "top_level_dead_comma");
if (top_level_static_false) {
    console.log("top_level_dead_static_if");
}
if (!top_level_static_false) {
    "top_level_dead_static_true_branch";
} else {
    console.log("top_level_dead_static_else");
}
while (false) {
    console.log("top_level_dead_while_false");
}
for (; false; console.log("top_level_dead_for_false_increment")) {
    console.log("top_level_dead_for_false_body");
}
if (0 as number) {
    console.log("top_level_dead_zero_if");
}
if (top_level_static_truthy_string) {
    "top_level_dead_truthy_then";
} else {
    console.log("top_level_dead_truthy_else");
}
top_level_static_false ? console.log("top_level_dead_static_conditional_call") : "top_level_dead_static_conditional_value";
top_level_static_false && console.log("top_level_dead_static_and_call");
!top_level_static_false || console.log("top_level_dead_static_or_call");
top_level_static_non_nullish ?? console.log("top_level_dead_static_nullish_call");
(undefined as string | undefined) ?? "top_level_dead_static_nullish_fallback";

namespace DceNamespace {
    const unused_namespace_value = { label: "dead", count: 4 };
    export const kept = 7;
}

function usedLocal(value: number): number {
    const unused_local_const = { label: "dead", count: 9 };
    let unused_local_let = `dead-${1 + 2}`;
    let unused_local_empty: string;
    "local_dead_expr";
    456n;
    /local_dead_regex/g;
    [...new Map([["local_dead_spread_map_key", "local_dead_spread_map_value"]])];
    [...new Set(["local_dead_spread_set", "local_dead_spread_set_tail"])];
    "local_dead_in" in { local_dead_in: true };
    delete ({ local_dead_delete: true } as any).local_dead_delete;
    Array.isArray(["local_dead_array_is_array"]);
    Array.of("local_dead_array_of", "local_dead_array_of_tail");
    Array.from(["local_dead_array_from_array"]);
    Array.from("local_dead_array_from_string");
    Array.from(new Map([["local_dead_array_from_map_key", "local_dead_array_from_map_value"]]));
    Array.from(new Set(["local_dead_array_from_set", "local_dead_array_from_set_tail"]));
    Array.from([] as number[], (value) => value + "local_dead_array_from_empty_array_mapper".length);
    Array.from(unused_array_from_empty_const_source, (value) => value + "local_dead_array_from_empty_const_mapper".length);
    Array.from(unused_array_from_empty_const_copy_source, (value) => value + "local_dead_array_from_empty_const_copy_mapper".length);
    Array.from("", (value) => value + "local_dead_array_from_empty_string_mapper");
    Array.from([] as number[], (value) => value + "local_dead_array_from_empty_mapped_map_mapper".length).map(() => "local_dead_array_from_empty_mapped_map");
    Array.from(unused_array_from_empty_map_source, (entry) => entry[1] + "local_dead_array_from_empty_map_const_mapper".length);
    Array.from(unused_array_from_empty_map_copy_source, (entry) => entry[1] + "local_dead_array_from_empty_map_copy_mapper".length);
    Array.from(new Map<string, number>(), (entry) => entry[1] + "local_dead_array_from_empty_map_mapper".length);
    Array.from(unused_array_from_empty_set_source, (value) => value + "local_dead_array_from_empty_set_const_mapper".length);
    Array.from(unused_array_from_empty_set_copy_source, (value) => value + "local_dead_array_from_empty_set_copy_mapper".length);
    Array.from(new Set<number>(), (value) => value + "local_dead_array_from_empty_set_mapper".length);
    Number.isInteger("local_dead_number_is_integer".length);
    Math.SQRT2 + "local_dead_math_constant_read".length;
    Number.NEGATIVE_INFINITY + "local_dead_number_constant_read".length;
    Promise.resolve(Math.LOG10E + "local_dead_promise_resolve_math_constant_read".length);
    Promise.resolve(Number.MIN_VALUE + "local_dead_promise_resolve_number_constant_read".length);
    Symbol.iterator;
    (Symbol.asyncIterator.description, "local_dead_symbol_description_read".length);
    Promise.resolve(Symbol.asyncIterator);
    Promise.resolve((Symbol.iterator.description, "local_dead_promise_resolve_well_known_symbol_description_read".length));
    (process.arch, "local_dead_process_arch_read".length);
    (process.version, "local_dead_process_version_read".length);
    process.versions.node + "local_dead_process_versions_node_read";
    process.release.name + "local_dead_process_release_name_read";
    process.features.tls || "local_dead_process_features_tls_read";
    process.platform.length + "local_dead_process_platform_length_read".length;
    (process.version.toUpperCase(), "local_dead_process_version_upper_call".length);
    (process.versions.node[0], "local_dead_process_versions_node_index_read".length);
    (process.release.name.includes("node"), "local_dead_process_release_name_includes_call".length);
    process.cwd("local_dead_process_cwd_length_ignored".length).length;
    Promise.resolve(process.title);
    Promise.resolve((process.argv0, "local_dead_promise_resolve_process_argv0_read".length));
    Promise.resolve((process.versions.tsc2c, "local_dead_promise_resolve_process_versions_tsc2c_read"));
    Promise.resolve((process.release.libUrl, "local_dead_promise_resolve_process_release_lib_read"));
    Promise.resolve((process.features.inspector, "local_dead_promise_resolve_process_features_inspector_read"));
    Promise.resolve(process.platform.length + "local_dead_promise_resolve_process_platform_length_read".length);
    Promise.resolve((process.version.toUpperCase(), "local_dead_promise_resolve_process_version_upper_call"));
    Promise.resolve((process.versions.node[0], "local_dead_promise_resolve_process_versions_node_index_read"));
    Promise.resolve((process.release.name.includes("node"), "local_dead_promise_resolve_process_release_name_includes_call"));
    Promise.resolve(process.cwd("local_dead_promise_resolve_process_cwd_upper_ignored".length).toUpperCase());
    (process.stdin.isTTY, "local_dead_process_stdin_tty_read".length);
    (process.stdin.readableEnded, "local_dead_process_stdin_readable_ended_read".length);
    (process.stderr.writable, "local_dead_process_stderr_writable_read".length);
    ((process.stderr as any).writableLength, "local_dead_process_stderr_writable_length_read".length);
    ((process.stdout as any).readable, "local_dead_process_stdout_readable_read".length);
    ((process.stderr as any).readable, "local_dead_process_stderr_readable_read".length);
    Promise.resolve(process.stdout.fd);
    Promise.resolve((process.stdout.isTTY, "local_dead_promise_resolve_process_stdout_tty_read".length));
    Promise.resolve((process.stdout.writableFinished, "local_dead_promise_resolve_process_stdout_finished_read".length));
    process.stdin.isPaused("local_dead_process_stdin_is_paused_call".length);
    process.stdin.setEncoding("utf8", "local_dead_process_stdin_set_encoding_call".length);
    process.stdin.pause("local_dead_process_stdin_pause_call".length);
    process.stdin.resume("local_dead_process_stdin_resume_call".length);
    process.stdin.pipe(process.stdout, "local_dead_process_stdin_pipe_call".length);
    process.stdin.unpipe(process.stderr, "local_dead_process_stdin_unpipe_call".length);
    process.stdin.removeAllListeners("local_dead_process_stdin_remove_all_call");
    process.stdin.on("local_dead_process_stdin_on_call", () => undefined);
    process.stdout.setDefaultEncoding("utf8", "local_dead_process_stdout_set_default_encoding_call".length);
    process.stdout.cork("local_dead_process_stdout_cork_call".length);
    process.stderr.uncork("local_dead_process_stderr_uncork_call".length);
    isReadable(process.stdin, "local_dead_stream_named_readable_stdin_call".length);
    streamReadableAlias(process.stdin, "local_dead_stream_named_alias_readable_stdin_call".length);
    nodeStream.isWritable(process.stdout, "local_dead_stream_namespace_writable_stdout_call".length);
    streamDefault.isDisturbed(process.stderr, "local_dead_stream_default_disturbed_stderr_call".length);
    isDestroyed({ local_dead_stream_named_destroyed_plain_call: true }, "local_dead_stream_named_destroyed_plain_ignored".length);
    streamDestroyedAlias({ local_dead_stream_named_alias_destroyed_plain_call: true }, "local_dead_stream_named_alias_destroyed_plain_ignored".length);
    nodeStream.isErrored(null, "local_dead_stream_namespace_errored_null_call".length);
    Promise.resolve(process.stdin.isPaused("local_dead_promise_resolve_process_stdin_is_paused_call".length));
    Promise.resolve(process.stdin.pause("local_dead_promise_resolve_process_stdin_pause_call".length));
    Promise.resolve(process.stdin.resume("local_dead_promise_resolve_process_stdin_resume_call".length));
    Promise.resolve(process.stdout.cork("local_dead_promise_resolve_process_stdout_cork_call".length));
    Promise.resolve(process.stderr.uncork("local_dead_promise_resolve_process_stderr_uncork_call".length));
    Promise.resolve(isReadable(process.stdin, "local_dead_promise_resolve_stream_named_readable_stdin_call".length));
    Promise.resolve(streamReadableAlias(process.stdin, "local_dead_promise_resolve_stream_named_alias_readable_stdin_call".length));
    Promise.resolve(nodeStream.isWritable(process.stdout, "local_dead_promise_resolve_stream_namespace_writable_stdout_call".length));
    Promise.resolve(streamDefault.isDestroyed({ local_dead_promise_resolve_stream_default_destroyed_plain_call: true }, "local_dead_promise_resolve_stream_default_destroyed_plain_ignored".length));
    Promise.resolve(streamDestroyedAlias({ local_dead_promise_resolve_stream_named_alias_destroyed_plain_call: true }, "local_dead_promise_resolve_stream_named_alias_destroyed_plain_ignored".length));
    Promise.resolve(nodeStream.isDisturbed(null, "local_dead_promise_resolve_stream_namespace_disturbed_null_call".length));
    process.cwd("local_dead_process_cwd_ignored".length);
    process.uptime("local_dead_process_uptime_ignored".length);
    process.hrtime();
    process.hrtime.bigint("local_dead_process_hrtime_bigint_ignored".length);
    process.getgroups("local_dead_process_getgroups_ignored".length);
    process.cpuUsage().user + "local_dead_process_cpu_user_read".length;
    process.memoryUsage("local_dead_process_memory_usage_ignored".length);
    process.resourceUsage("local_dead_process_resource_usage_ignored".length);
    process.memoryUsage("local_dead_process_memory_external_ignored".length).external;
    process.resourceUsage("local_dead_process_resource_fs_write_ignored".length).fsWrite;
    Promise.resolve(process.cwd("local_dead_promise_resolve_process_cwd_ignored".length));
    Promise.resolve(process.uptime("local_dead_promise_resolve_process_uptime_ignored".length));
    Promise.resolve(process.cpuUsage().system + "local_dead_promise_resolve_process_cpu_system_read".length);
    Promise.resolve(process.memoryUsage("local_dead_promise_resolve_process_memory_heap_total_ignored".length).heapTotal);
    Promise.resolve(process.resourceUsage("local_dead_promise_resolve_process_resource_signal_ignored".length).signalsCount);
    __dirname.length + "local_dead_dirname_read".length;
    (module.path, "local_dead_module_path_read".length);
    (__dirname.toUpperCase(), "local_dead_dirname_upper_call".length);
    module.filename.length + "local_dead_module_filename_length_read".length;
    (module.id[0], "local_dead_module_id_index_read".length);
    (module.path.includes("node_modules"), "local_dead_module_path_includes_call".length);
    Promise.resolve(__filename);
    Promise.resolve((module.loaded, "local_dead_promise_resolve_module_loaded_read".length));
    Promise.resolve((__dirname.toUpperCase(), "local_dead_promise_resolve_dirname_upper_call"));
    Promise.resolve(module.filename.length + "local_dead_promise_resolve_module_filename_length_read".length);
    Promise.resolve((module.id[0], "local_dead_promise_resolve_module_id_index_read"));
    Promise.resolve((module.path.includes("node_modules"), "local_dead_promise_resolve_module_path_includes_call"));
    nodeFs.constants.W_OK + "local_dead_fs_constant_read".length;
    fsConstants.COPYFILE_FICLONE + "local_dead_fs_named_constant_read".length;
    nodePath.posix.sep.length + "local_dead_path_posix_constant_read".length;
    pathSep.length + "local_dead_path_named_constant_read".length;
    nodeOs.devNull.length + "local_dead_os_constant_read".length;
    osEOL.length + "local_dead_os_named_constant_read".length;
    (nodePath.sep.toUpperCase(), "local_dead_path_constant_upper_call".length);
    (pathDelimiter[0], "local_dead_path_named_constant_index_read".length);
    (nodeOs.EOL[0], "local_dead_os_constant_index_read".length);
    (osDevNull.toUpperCase(), "local_dead_os_named_constant_upper_call".length);
    Promise.resolve(nodeFs.constants.X_OK + "local_dead_promise_resolve_fs_constant_read".length);
    Promise.resolve(nodePath.delimiter.length + "local_dead_promise_resolve_path_constant_read".length);
    Promise.resolve(nodeOs.EOL.length + "local_dead_promise_resolve_os_constant_read".length);
    Promise.resolve((nodePath.sep.toUpperCase(), "local_dead_promise_resolve_path_constant_upper_call"));
    Promise.resolve((pathDelimiter[0], "local_dead_promise_resolve_path_named_constant_index_read"));
    Promise.resolve((nodeOs.EOL[0], "local_dead_promise_resolve_os_constant_index_read"));
    Promise.resolve((osDevNull.toUpperCase(), "local_dead_promise_resolve_os_named_constant_upper_call"));
    nodeDns.ALL + "local_dead_dns_constant_read".length;
    ADDRCONFIG + "local_dead_dns_named_constant_read".length;
    Promise.resolve(nodeDns.ADDRCONFIG + "local_dead_promise_resolve_dns_constant_read".length);
    Promise.resolve(ALL + "local_dead_promise_resolve_dns_named_constant_read".length);
    EventEmitter.defaultMaxListeners + "local_dead_event_default_read".length;
    nodeEvents.EventEmitter.defaultMaxListeners + "local_dead_event_namespace_default_read".length;
    defaultMaxListeners + "local_dead_event_named_default_read".length;
    new EventEmitter("local_dead_new_event_emitter_ignored".length);
    new ImportedEventEmitter("local_dead_new_imported_event_emitter_ignored".length);
    new EventEmitter().getMaxListeners("local_dead_event_emitter_get_max_ignored".length);
    new ImportedEventEmitter().listenerCount("local_dead_imported_event_emitter_listener_count");
    new EventEmitter().listeners("local_dead_event_emitter_listeners");
    new EventEmitter().eventNames("local_dead_event_emitter_event_names_ignored".length);
    new EventEmitter().toString("local_dead_event_emitter_to_string_ignored".length);
    EventEmitter.listenerCount(new EventEmitter(), "local_dead_event_static_listener_count");
    nodeEvents.getMaxListeners(new EventEmitter(), "local_dead_events_namespace_get_max_ignored".length);
    getMaxListeners(new EventEmitter(), "local_dead_events_named_get_max_ignored".length);
    listenerCount(new EventEmitter(), "local_dead_events_named_listener_count");
    nodeEvents.getEventListeners(new EventEmitter(), "local_dead_events_namespace_get_event_listeners");
    new EventEmitter().setMaxListeners(19);
    new EventEmitter().removeAllListeners("local_dead_event_emitter_remove_all");
    new EventEmitter().on("local_dead_event_emitter_on", () => undefined);
    new EventEmitter().once("local_dead_event_emitter_once", () => undefined);
    new EventEmitter().off("local_dead_event_emitter_off", () => undefined);
    new EventEmitter().emit("local_dead_event_emitter_emit", "local_dead_event_emitter_emit_payload");
    nodeEvents.setMaxListeners(20, new EventEmitter());
    setMaxListeners(21, new EventEmitter());
    const unused_local_events_namespace_once_call = nodeEvents.once(new EventEmitter(), "local_dead_events_namespace_once");
    const unused_local_events_named_once_call = eventsOnce(new EventEmitter(), "local_dead_events_named_once");
    const unused_local_events_namespace_once_undefined_options_call = nodeEvents.once(new EventEmitter(), "local_dead_events_namespace_once_undefined_options", undefined);
    const unused_local_events_named_once_signal_undefined_call = eventsOnce(new EventEmitter(), "local_dead_events_named_once_signal_undefined", { signal: undefined });
    crypto.createHash("sha256");
    createHash("sha1");
    nodeCrypto.createHash("sha512").update("local_dead_crypto_hash_update");
    crypto.createHash("sha256").update("local_dead_crypto_hash_digest").digest("hex");
    createHash("sha1").update(Buffer.from("local_dead_crypto_hash_buffer_digest")).digest("base64");
    crypto.createHash("sha256").update("local_dead_crypto_hash_default_digest").digest(unused_hash_digest_default_encoding);
    crypto.createHash("sha256").update("local_dead_crypto_hash_digest_length_read").digest("hex").length;
    (createHash("sha1").update("local_dead_crypto_hash_digest_upper_call").digest("base64").toUpperCase(), "local_dead_crypto_hash_digest_upper_call_marker".length);
    (nodeCrypto.createHash("sha512").update("local_dead_crypto_hash_digest_index_read").digest("hex")[0], "local_dead_crypto_hash_digest_index_read_marker".length);
    Promise.resolve(nodeCrypto.createHash("sha512").update("local_dead_promise_resolve_crypto_hash_digest").digest("hex"));
    Promise.resolve(nodeCrypto.createHash("sha512").update("local_dead_promise_resolve_crypto_hash_digest_length_read").digest("hex").length);
    Promise.resolve((createHash("sha1").update("local_dead_promise_resolve_crypto_hash_digest_upper_call").digest("base64").toUpperCase(), "local_dead_promise_resolve_crypto_hash_digest_upper_call_marker"));
    Promise.resolve((crypto.createHash("sha256").update("local_dead_promise_resolve_crypto_hash_digest_index_read").digest("hex")[0], "local_dead_promise_resolve_crypto_hash_digest_index_read_marker"));
    new EventTarget("local_dead_new_event_target_ignored".length);
    new Event("local_dead_new_event_type", { cancelable: true });
    new Event("local_dead_event_type_read").type;
    new Event("local_dead_event_type_length_read").type.length;
    (new Event("local_dead_event_type_upper_call").type.toUpperCase(), "local_dead_event_type_upper_call_marker".length);
    (new Event("local_dead_event_type_index_read").type[0], "local_dead_event_type_index_read_marker".length);
    new Event("local_dead_event_cancelable_read", { cancelable: true }).cancelable;
    new Event("local_dead_event_default_prevented_read").defaultPrevented;
    new Event("local_dead_event_target_read").target;
    new Event("local_dead_event_current_target_read").currentTarget;
    new Event("local_dead_event_prevent_default_call", { cancelable: true }).preventDefault("local_dead_event_prevent_default_ignored".length);
    new Event("local_dead_event_to_string_call").toString("local_dead_event_to_string_ignored".length);
    new EventTarget().dispatchEvent(new Event("local_dead_event_target_dispatch_call", { cancelable: true }));
    new EventTarget().toString("local_dead_event_target_to_string_ignored".length);
    new Event("local_dead_event_to_string_length_read").toString().length;
    (new EventTarget().toLocaleString().toUpperCase(), "local_dead_event_target_to_locale_upper_call_marker".length);
    (new EventEmitter().toString()[0], "local_dead_event_emitter_to_string_index_read_marker".length);
    new EventTarget().addEventListener("local_dead_event_target_add", () => undefined, { once: undefined });
    new EventTarget().removeEventListener("local_dead_event_target_remove", () => undefined);
    Promise.resolve(nodeEvents.defaultMaxListeners + "local_dead_promise_resolve_event_default_read".length);
    Promise.resolve(defaultMaxListeners + "local_dead_promise_resolve_event_named_default_read".length);
    Promise.resolve(new Event("local_dead_promise_resolve_event_type_read").type);
    Promise.resolve(new Event("local_dead_promise_resolve_event_type_length_read").type.length);
    Promise.resolve((new Event("local_dead_promise_resolve_event_type_upper_call").type.toUpperCase(), "local_dead_promise_resolve_event_type_upper_call_marker"));
    Promise.resolve((new Event("local_dead_promise_resolve_event_type_index_read").type[0], "local_dead_promise_resolve_event_type_index_read_marker"));
    Promise.resolve(new Event("local_dead_promise_resolve_event_cancelable_read", { cancelable: true }).cancelable);
    Promise.resolve(new Event("local_dead_promise_resolve_event_default_prevented_read").defaultPrevented);
    Promise.resolve(new EventEmitter().getMaxListeners("local_dead_promise_resolve_event_emitter_get_max_ignored".length));
    Promise.resolve(new ImportedEventEmitter().listenerCount("local_dead_promise_resolve_imported_event_emitter_listener_count"));
    Promise.resolve(new EventEmitter().toString("local_dead_promise_resolve_event_emitter_to_string_ignored".length));
    Promise.resolve(EventEmitter.listenerCount(new EventEmitter(), "local_dead_promise_resolve_event_static_listener_count"));
    Promise.resolve(nodeEvents.getMaxListeners(new EventEmitter(), "local_dead_promise_resolve_events_namespace_get_max_ignored".length));
    Promise.resolve(getMaxListeners(new EventEmitter(), "local_dead_promise_resolve_events_named_get_max_ignored".length));
    Promise.resolve(nodeEvents.setMaxListeners(22, new EventEmitter()));
    Promise.resolve(setMaxListeners(23, new EventEmitter()));
    Promise.resolve(new EventEmitter().emit("local_dead_promise_resolve_event_emitter_emit", "local_dead_promise_resolve_event_emitter_emit_payload"));
    Promise.resolve(new Event("local_dead_promise_resolve_event_prevent_default_call", { cancelable: true }).preventDefault("local_dead_promise_resolve_event_prevent_default_ignored".length));
    Promise.resolve(new Event("local_dead_promise_resolve_event_to_string_call").toString("local_dead_promise_resolve_event_to_string_ignored".length));
    Promise.resolve(new EventTarget().dispatchEvent(new Event("local_dead_promise_resolve_event_target_dispatch_call")));
    Promise.resolve(new EventTarget().toString("local_dead_promise_resolve_event_target_to_string_ignored".length));
    Promise.resolve(new Event("local_dead_promise_resolve_event_to_string_length_read").toString().length);
    Promise.resolve((new EventTarget().toLocaleString().toUpperCase(), "local_dead_promise_resolve_event_target_to_locale_upper_call_marker"));
    Promise.resolve((new EventEmitter().toString()[0], "local_dead_promise_resolve_event_emitter_to_string_index_read_marker"));
    Promise.resolve(new EventTarget().addEventListener("local_dead_promise_resolve_event_target_add", () => undefined));
    Promise.resolve(new EventTarget().removeEventListener("local_dead_promise_resolve_event_target_remove", () => undefined, { capture: true }));
    nodeOs.type("local_dead_os_type_ignored".length);
    osArch("local_dead_os_named_arch_ignored".length);
    nodeOs.cpus("local_dead_os_cpus_ignored".length);
    nodeOs.userInfo({ encoding: "utf8" });
    os.userInfo({ encoding: undefined }).username + "local_dead_os_user_info_username_read";
    osUserInfo().uid + "local_dead_os_named_user_info_uid_read".length;
    nodeOs.userInfo().username.length + "local_dead_os_user_info_username_length_read".length;
    osUserInfo({ encoding: "utf8" }).shell.toUpperCase();
    os.userInfo().homedir[0];
    Promise.resolve(nodeOs.uptime("local_dead_promise_resolve_os_uptime_ignored".length));
    Promise.resolve(availableParallelism("local_dead_promise_resolve_os_named_ignored".length));
    Promise.resolve(nodeOs.userInfo({ encoding: "utf-8" }).homedir);
    Promise.resolve(osUserInfo({ encoding: undefined }).gid + "local_dead_promise_resolve_os_named_user_info_gid_read".length);
    Promise.resolve(nodeOs.userInfo().username.length + "local_dead_promise_resolve_os_user_info_username_length_read".length);
    Promise.resolve(osUserInfo({ encoding: "utf8" }).shell.toUpperCase());
    nodePath.relative("local_dead_path_relative_from", "local_dead_path_relative_to");
    pathNormalize("local_dead_path_named_normalize_ignored/..");
    nodePath.parse("local_dead_path_parse_ignored");
    nodePath.posix.join("local_dead_path_posix_join_ignored", "tail");
    pathPosix.normalize("local_dead_path_named_posix_normalize_ignored/..");
    path.posix.toNamespacedPath("local_dead_path_global_posix_namespaced_ignored");
    pathFormat({ dir: "/local_dead_path_format_dir", name: "local_dead_path_format_name", ext: ".txt" });
    pathPosix.format({ root: "/", base: "local_dead_path_posix_format_base.txt" });
    nodePath.parse("local_dead_path_parse_base_read.txt").base;
    pathParse("local_dead_path_named_parse_ext_read.txt").ext;
    pathPosix.parse("/tmp/local_dead_path_posix_parse_name_read.txt").name;
    nodePath.parse("local_dead_path_parse_base_length_read.txt").base.length;
    nodePath.parse("local_dead_path_parse_base_upper_call.txt").base.toUpperCase();
    pathParse("local_dead_path_named_parse_ext_starts_call.txt").ext.startsWith(".");
    pathPosix.parse("/tmp/local_dead_path_posix_parse_name_index_read.txt").name[0];
    pathFormat({ dir: "/local_dead_path_format_length_dir", name: "local_dead_path_format_length_name", ext: ".txt" }).length;
    nodePath.basename("local_dead_path_basename_upper_call.txt", ".txt").toUpperCase();
    pathPosix.dirname("/tmp/local_dead_path_posix_dirname_index_read/file.txt")[0];
    Promise.resolve(path.posix.parse("/tmp/local_dead_promise_resolve_path_global_posix_parse_dir_read.txt").dir);
    Promise.resolve(pathParse("local_dead_promise_resolve_path_named_parse_ext_length_read.txt").ext.length);
    Promise.resolve(nodePath.parse("local_dead_promise_resolve_path_parse_base_upper_call.txt").base.toUpperCase());
    Promise.resolve(pathFormat({ dir: "/local_dead_promise_resolve_path_format_length_dir", name: "local_dead_promise_resolve_path_format_length_name", ext: ".txt" }).length);
    Promise.resolve(nodePath.basename("local_dead_promise_resolve_path_basename_ignored.txt", ".txt"));
    Promise.resolve(pathIsAbsolute("/local_dead_promise_resolve_path_named_absolute_ignored"));
    Promise.resolve(nodePath.posix.basename("local_dead_promise_resolve_path_posix_basename_ignored.txt", ".txt"));
    Promise.resolve(pathPosix.relative("local_dead_promise_resolve_path_named_posix_relative_from", "local_dead_promise_resolve_path_named_posix_relative_to"));
    Promise.resolve(path.format({ dir: "/local_dead_promise_resolve_path_format_dir", name: "local_dead_promise_resolve_path_format_name", ext: ".txt" }));
    Promise.resolve(nodePath.posix.format({ root: "/", base: "local_dead_promise_resolve_path_posix_format_base.txt" }));
    nodeNet.isIPv6("local_dead_net_is_ipv6_ignored");
    netIsIP("local_dead_net_named_is_ip_ignored");
    Promise.resolve(nodeNet.isIP("local_dead_promise_resolve_net_is_ip_ignored"));
    Promise.resolve(netIsIPv6("local_dead_promise_resolve_net_named_is_ipv6_ignored"));
    Buffer.byteLength("local_dead_buffer_byte_length_ignored", unused_utf8);
    Buffer.isEncoding("local_dead_buffer_is_encoding_ignored");
    Buffer.from("local_dead_buffer_from_ignored");
    Buffer.byteLength("local_dead_buffer_byte_length_default_alias", unused_default_option);
    Buffer.from("local_dead_buffer_from_default_alias", unused_default_option);
    Buffer.alloc(2, 65);
    Buffer.allocUnsafe(2);
    Buffer.from("local_dead_buffer_to_string_ignored").toString(unused_utf8);
    Buffer.from("local_dead_buffer_to_string_default_alias").toString(unused_default_option);
    Buffer.from("local_dead_buffer_to_locale_string_ignored").toLocaleString();
    Buffer.from("local_dead_buffer_value_of_ignored").valueOf();
    Buffer.from("local_dead_buffer_to_string_length_read").toString().length;
    (Buffer.from("local_dead_buffer_to_string_upper_call").toString(unused_utf8).toUpperCase(), "local_dead_buffer_to_string_upper_call_marker".length);
    (Buffer.from("local_dead_buffer_to_locale_string_index_read").toLocaleString()[0], "local_dead_buffer_to_locale_string_index_read_marker".length);
    Promise.resolve(Buffer.byteLength("local_dead_promise_resolve_buffer_byte_length_ignored"));
    Promise.resolve(Buffer.isBuffer("local_dead_promise_resolve_buffer_is_buffer_ignored"));
    Promise.resolve(Buffer.from("local_dead_promise_resolve_buffer_to_string_ignored").toString());
    Promise.resolve(Buffer.from("local_dead_promise_resolve_buffer_to_string_default_alias").toString(unused_default_option));
    Promise.resolve(Buffer.from("local_dead_promise_resolve_buffer_to_string_length_read").toString().length);
    Promise.resolve((Buffer.from("local_dead_promise_resolve_buffer_to_string_upper_call").toString(unused_utf8).toUpperCase(), "local_dead_promise_resolve_buffer_to_string_upper_call_marker"));
    Promise.resolve((Buffer.from("local_dead_promise_resolve_buffer_to_locale_string_index_read").toLocaleString()[0], "local_dead_promise_resolve_buffer_to_locale_string_index_read_marker"));
    parseInt("local_dead_global_parse_int", 10);
    parseFloat("local_dead_global_parse_float");
    isNaN("local_dead_global_is_nan");
    isFinite("local_dead_global_is_finite");
    btoa("local_dead_btoa_call");
    atob("bG9jYWxfZGVhZF9hdG9iX2NhbGw=");
    btoa("local_dead_btoa_length_read").length;
    (atob("bG9jYWxfZGVhZF9hdG9iX3VwcGVyX2NhbGw=").toUpperCase(), "local_dead_atob_upper_call_marker".length);
    (btoa("local_dead_btoa_index_read")[0], "local_dead_btoa_index_read_marker".length);
    Number.parseInt("local_dead_number_parse_int", 10);
    Number.parseFloat("local_dead_number_parse_float");
    String("local_dead_string_constructor");
    String("local_dead_string_constructor_length_read").length;
    (String("local_dead_string_constructor_upper_call").toUpperCase(), "local_dead_string_constructor_upper_call_marker".length);
    (String("local_dead_string_constructor_index_read")[0], "local_dead_string_constructor_index_read_marker".length);
    Number("789");
    Boolean("local_dead_boolean_constructor");
    Date("local_dead_date_callable_ignored");
    Date("local_dead_date_callable_length_ignored").length;
    (Date("local_dead_date_callable_upper_ignored").toUpperCase(), "local_dead_date_callable_upper_call_marker".length);
    (Date("local_dead_date_callable_index_ignored")[0], "local_dead_date_callable_index_read_marker".length);
    Date.now("local_dead_date_now_ignored");
    Date.parse("2020-03-04T05:06:07Z");
    Date.UTC(2020, 2, 4, 5, 6, 7, 8);
    new Date("2020-03-05T06:07:08Z");
    new Date(3234567);
    new Date(2020, 2, 5, 6, 7, 8, 9);
    new Date("2020-03-06T07:08:09Z").toUTCString().length;
    (new Date("2020-03-07T08:09:10Z").toDateString().toUpperCase(), "local_dead_date_to_date_string_upper_call_marker".length);
    (new Date("2020-03-08T09:10:11Z").toTimeString()[0], "local_dead_date_to_time_string_index_read_marker".length);
    new URL("https://local-dead-new-url.test/path");
    new URL("child", "https://local-dead-new-url-base.test/root/");
    new URL("https://local-dead-url-to-string.test/path").toString("local_dead_url_to_string_ignored");
    new URL("https://local-dead-url-to-json.test/path").toJSON("local_dead_url_to_json_ignored");
    new URL("https://local-dead-url-value-of.test/path").valueOf("local_dead_url_value_of_ignored");
    new URL("https://local-dead-url-has-own.test/path").hasOwnProperty("local_dead_url_has_own", "local_dead_url_has_own_ignored");
    new URL("https://local-dead-url-href-read.test/path?q=1#hash").href;
    new URL("https://local-dead-url-origin-read.test/path").origin;
    new URL("https://local-dead-url-href-length-read.test/path").href.length;
    (new URL("https://local-dead-url-pathname-upper-call.test/path").pathname.toUpperCase(), "local_dead_url_pathname_upper_call_marker".length);
    (new URL("https://local-dead-url-host-index-read.test/path").host[0], "local_dead_url_host_index_read_marker".length);
    new Map<string, number>();
    new Map([["local_dead_new_map_entries_key", "local_dead_new_map_entries_value"]]);
    new Map([
        (["local_dead_new_map_ignored_extra_key", "local_dead_new_map_ignored_extra_value", "local_dead_new_map_ignored_extra"] as unknown as ObjectEntry<string>),
    ]);
    new Map(Object.entries({ local_dead_new_map_object_entries_key: "local_dead_new_map_object_entries_value" }));
    new Map(new Map([["local_dead_new_map_copy_key", "local_dead_new_map_copy_value"]]));
    new Map([["local_dead_map_get_key", "local_dead_map_get_value"]]).get("local_dead_map_get_key");
    new Map([["local_dead_map_has_key", "local_dead_map_has_value"]]).has("local_dead_map_has_key");
    new Map([["local_dead_map_keys_key", "local_dead_map_keys_value"]]).keys();
    new Map([["local_dead_map_values_key", "local_dead_map_values_value"]]).values();
    new Map([["local_dead_map_entries_key", "local_dead_map_entries_value"]]).entries();
    new Map([["local_dead_map_size_key", "local_dead_map_size_value"]]).size;
    new Map([["local_dead_map_object_to_string_key", "local_dead_map_object_to_string_value"]]).toString("local_dead_map_object_to_string_ignored");
    new Set(["local_dead_set_object_value_of"]).valueOf("local_dead_set_object_value_of_ignored");
    new WeakMap<object, string>().toLocaleString("local_dead_weak_map_object_to_locale_string_ignored");
    new WeakSet<object>().hasOwnProperty("local_dead_weak_set_object_has_own", "local_dead_weak_set_object_has_own_ignored");
    new Map([["local_dead_map_object_to_string_length_key", "local_dead_map_object_to_string_length_value"]]).toString().length + "local_dead_map_object_to_string_length_read".length;
    (new WeakMap<object, string>().toLocaleString().toUpperCase(), "local_dead_weak_map_object_to_locale_upper_call_marker".length);
    (new FinalizationRegistry<string>((held) => {
        "local_dead_finregistry_object_to_string_index_callback";
    }).toString()[0], "local_dead_finregistry_object_to_string_index_read_marker".length);
    new WeakRef<object>({ label: "local_dead_weak_ref_object_property_enum_target" }).propertyIsEnumerable("local_dead_weak_ref_object_property_enum", "local_dead_weak_ref_object_property_enum_ignored");
    new FinalizationRegistry<string>((held) => {
        "local_dead_finregistry_object_to_string_callback";
    }).toString("local_dead_finregistry_object_to_string_ignored");
    new Set<number>();
    new Set(["local_dead_new_set_array", "local_dead_new_set_array_tail"]);
    new Set(new Set(["local_dead_new_set_copy", "local_dead_new_set_copy_tail"]));
    new Set(["local_dead_set_has"]).has("local_dead_set_has");
    new Set(["local_dead_set_keys"]).keys();
    new Set(["local_dead_set_values"]).values();
    new Set(["local_dead_set_size"]).size;
    new Set(["local_dead_set_union"]).union(new Set(["local_dead_set_union_other"]));
    new Set(["local_dead_set_intersection"]).intersection(new Set(["local_dead_set_intersection_other"]));
    new Set(["local_dead_set_difference"]).difference(new Set(["local_dead_set_difference_other"]));
    new Set(["local_dead_set_symmetric_difference"]).symmetricDifference(new Set(["local_dead_set_symmetric_difference_other"]));
    new Set(["local_dead_set_subset"]).isSubsetOf(new Set(["local_dead_set_subset_other"]));
    new Set(["local_dead_set_superset"]).isSupersetOf(new Set(["local_dead_set_superset_other"]));
    new Set(["local_dead_set_disjoint"]).isDisjointFrom(new Set(["local_dead_set_disjoint_other"]));
    new WeakMap<object, string>();
    new WeakMap<object, string>([
        [{ local_dead_new_weak_map_static_key: 1 }, "local_dead_new_weak_map_static_value"],
        [{ local_dead_new_weak_map_static_tail_key: 2 }, "local_dead_new_weak_map_static_tail_value"],
    ]);
    new WeakMap<object, string>([
        ([{ local_dead_new_weak_map_ignored_extra_key: 1 }, "local_dead_new_weak_map_ignored_extra_value", "local_dead_new_weak_map_ignored_extra"] as unknown as [object, string]),
    ]);
    new WeakMap<object, string>(new Map<object, string>());
    new WeakMap<object, string>().get({ local_dead_weak_map_get_key: 1 });
    new WeakMap<object, string>([[{ local_dead_weak_map_has_source_key: 1 }, "local_dead_weak_map_has_source_value"]]).has({ local_dead_weak_map_has_key: 1 });
    new WeakSet<object>();
    new WeakSet<object>([
        { local_dead_new_weak_set_static_value: 1 },
        { local_dead_new_weak_set_static_tail: 2 },
    ]);
    new WeakSet<object>(new Set<object>());
    new WeakSet<object>(new Set<object>([
        { local_dead_new_weak_set_object_set_source_value: 1 },
    ]));
    new WeakSet<object>([{ local_dead_weak_set_has_source: 1 }]).has({ local_dead_weak_set_has_key: 1 });
    new WeakRef<object>({ label: "local_dead_weak_ref_target" });
    new WeakRef<object>({ label: "local_dead_weak_ref_deref_target" }).deref("local_dead_weak_ref_deref_ignored");
    new FinalizationRegistry<string>((held) => {
        "local_dead_finalization_registry_callback";
    });
    new FinalizationRegistry<string>((held) => {
        "local_dead_finregistry_register_callback";
    }).register({ label: "local_dead_finregistry_register_target" }, "local_dead_finregistry_register_held", { label: "local_dead_finregistry_register_token" });
    new FinalizationRegistry<string>((held) => {
        "local_dead_finregistry_unregister_callback";
    }).unregister({ label: "local_dead_finregistry_unregister_token" }, "local_dead_finregistry_unregister_ignored");
    URL.canParse("https://local-dead-url-can-parse.test/path");
    URL.canParse("local-dead-url-can-parse-child", "https://local-dead-url-can-parse-base.test/root/");
    Promise.resolve("local_dead_promise_resolve", "local_dead_promise_resolve_ignored");
    Promise.all([] as Promise<string>[]);
    Promise.allSettled([] as Promise<string>[]);
    Promise.any([] as Promise<string>[]);
    Promise.race([] as Promise<string>[]);
    Promise.all(Array.of<Promise<string>>());
    Promise.allSettled(Array.from([] as Promise<string>[]));
    Promise.any(Array.from([] as Promise<string>[]));
    Promise.race(Array.from([] as Promise<string>[]));
    Promise.any(Array.from(Array.of<Promise<string>>()));
    Promise.race(Array.from(Array.of<Promise<string>>()));
    Promise.resolve(234567891n);
    Promise.resolve(-345678.75);
    Promise.resolve(-NaN, "local_dead_promise_resolve_nan_ignored");
    Promise.resolve(+Infinity, "local_dead_promise_resolve_infinity_ignored");
    Promise.resolve(btoa("local_dead_promise_resolve_btoa_call"));
    Promise.resolve(atob("bG9jYWxfZGVhZF9wcm9taXNlX3Jlc29sdmVfYXRvYl9jYWxs"));
    Promise.resolve(btoa("local_dead_promise_resolve_btoa_length_read").length);
    Promise.resolve((atob("bG9jYWxfZGVhZF9wcm9taXNlX3Jlc29sdmVfYXRvYl91cHBlcl9jYWxs").toUpperCase(), "local_dead_promise_resolve_atob_upper_call_marker"));
    Promise.resolve((btoa("local_dead_promise_resolve_btoa_index_read")[0], "local_dead_promise_resolve_btoa_index_read_marker"));
    Promise.resolve(String("local_dead_promise_resolve_string_constructor"));
    Promise.resolve(String("local_dead_promise_resolve_string_constructor_length_read").length);
    Promise.resolve((String("local_dead_promise_resolve_string_constructor_upper_call").toUpperCase(), "local_dead_promise_resolve_string_constructor_upper_call_marker"));
    Promise.resolve((String("local_dead_promise_resolve_string_constructor_index_read")[0], "local_dead_promise_resolve_string_constructor_index_read_marker"));
    Promise.resolve(Number("local_dead_promise_resolve_number_constructor"));
    Promise.resolve(Boolean("local_dead_promise_resolve_boolean_constructor"));
    Promise.resolve(BigInt(true));
    Promise.resolve(Symbol("local_dead_promise_resolve_symbol"));
    Promise.resolve(Date("local_dead_promise_resolve_date_callable_ignored"));
    Promise.resolve(Date("local_dead_promise_resolve_date_callable_length_ignored").length);
    Promise.resolve((Date("local_dead_promise_resolve_date_callable_upper_ignored").toUpperCase(), "local_dead_promise_resolve_date_callable_upper_call_marker"));
    Promise.resolve((Date("local_dead_promise_resolve_date_callable_index_ignored")[0], "local_dead_promise_resolve_date_callable_index_read_marker"));
    Promise.resolve(Date.now("local_dead_promise_resolve_date_now_ignored"));
    Promise.resolve(Date.parse("2099-03-04T05:06:07Z"));
    Promise.resolve(Date.UTC(2099, 2, 4, 5, 6, 7, 8));
    Promise.resolve(String.fromCharCode("local_dead_promise_resolve_string_static".length));
    Promise.resolve(String.fromCodePoint(0x1f681));
    Promise.resolve(RegExp.escape("local_dead_promise_resolve_regexp_escape"));
    Promise.resolve(String.raw`local_dead_promise_resolve_string_raw_tagged_template`);
    Promise.resolve(String.raw`local_dead_promise_resolve_string_raw_length_${"local_dead_promise_resolve_string_raw_length_expr".length}`.length);
    Promise.resolve((String.raw`local_dead_promise_resolve_string_raw_upper_${"local_dead_promise_resolve_string_raw_upper_expr"}`.toUpperCase(), "local_dead_promise_resolve_string_raw_upper_call_marker"));
    Promise.resolve((String.raw`local_dead_promise_resolve_string_raw_index_read`[0], "local_dead_promise_resolve_string_raw_index_read_marker"));
    Promise.resolve(JSON.stringify({ local_dead_promise_resolve_json_stringify_key: "local_dead_promise_resolve_json_stringify_value" }));
    Promise.resolve(JSON.stringify(["local_dead_promise_resolve_json_stringify_length_read", true]).length);
    Promise.resolve((JSON.stringify("local_dead_promise_resolve_json_stringify_upper_call").toUpperCase(), "local_dead_promise_resolve_json_stringify_upper_call_marker"));
    Promise.resolve((JSON.stringify({ label: "local_dead_promise_resolve_json_stringify_index_read" })[0], "local_dead_promise_resolve_json_stringify_index_read_marker"));
    Promise.resolve("local_dead_promise_resolve_string_method_to_well_formed".toWellFormed());
    Promise.resolve("local_dead_promise_resolve_string_method_to_well_formed_length_read".toWellFormed().length);
    Promise.resolve((" local_dead_promise_resolve_string_method_trim_upper_call ".trim().toUpperCase(), "local_dead_promise_resolve_string_method_trim_upper_call_marker"));
    Promise.resolve(("local_dead_promise_resolve_string_method_normalize_index_read".normalize()[0], "local_dead_promise_resolve_string_method_normalize_index_read_marker"));
    Promise.resolve(String.fromCharCode("local_dead_promise_resolve_string_static_length_read".length).length);
    Promise.resolve((String.fromCodePoint(0x41, 0x45).toUpperCase(), "local_dead_promise_resolve_string_code_point_upper_call_marker"));
    Promise.resolve((RegExp.escape("local_dead_promise_resolve_regexp_escape_index_read")[0], "local_dead_promise_resolve_regexp_escape_index_read_marker"));
    Promise.resolve(Array.isArray(["local_dead_promise_resolve_array_is_array"]));
    Promise.resolve(Object.is("local_dead_promise_resolve_object_is", "local_dead_promise_resolve_object_is"));
    Promise.resolve(new Map([["local_dead_promise_resolve_map_size_key", "local_dead_promise_resolve_map_size_value"]]).size);
    Promise.resolve(new Set(["local_dead_promise_resolve_set_size"]).size);
    Promise.resolve(new Map([["local_dead_promise_resolve_map_object_to_string_length_key", "local_dead_promise_resolve_map_object_to_string_length_value"]]).toString().length + "local_dead_promise_resolve_map_object_to_string_length_read".length);
    Promise.resolve((new WeakMap<object, string>().toLocaleString().toUpperCase(), "local_dead_promise_resolve_weak_map_object_to_locale_upper_call_marker"));
    Promise.resolve((new FinalizationRegistry<string>((held) => {
        "local_dead_promise_resolve_finregistry_object_to_string_index_callback";
    }).toString()[0], "local_dead_promise_resolve_finregistry_object_to_string_index_read_marker"));
    Promise.resolve(Object.hasOwn({ local_dead_promise_resolve_object_has_own: 1 }, "local_dead_promise_resolve_object_has_own"));
    Promise.resolve(Object.isExtensible({ local_dead_promise_resolve_object_extensible: 1 }));
    Promise.resolve(Object.isSealed({ local_dead_promise_resolve_object_sealed: 1 }));
    Promise.resolve(Object.isFrozen({ local_dead_promise_resolve_object_frozen: 1 }));
    Promise.resolve(URL.canParse("https://local-dead-promise-resolve-url-can-parse.test/"));
    Promise.resolve(Reflect.has({ local_dead_promise_resolve_reflect_has: 1 }, "local_dead_promise_resolve_reflect_has"));
    Promise.resolve(Reflect.isExtensible({ local_dead_promise_resolve_reflect_extensible: 1 }));
    Promise.resolve("local_dead_promise_resolve_string_method".toLowerCase());
    Promise.resolve("local_dead_promise_resolve_string_prefix".startsWith("local"));
    Promise.resolve(/local_dead_promise_resolve_regexp_test/.test("local_dead_promise_resolve_regexp_test"));
    Promise.resolve(/local_dead_promise_resolve_regexp_string/.toString());
    Promise.resolve(["local_dead_promise_resolve_array_includes"].includes("missing"));
    Promise.resolve(["local_dead_promise_resolve_array_index"].indexOf("missing"));
    Promise.resolve(["local_dead_promise_resolve_array_join"].join("/"));
    Promise.resolve(["local_dead_promise_resolve_array_string"].toString());
    Promise.resolve(["local_dead_promise_resolve_array_join_length_read"].join("/").length);
    Promise.resolve((["local_dead_promise_resolve_array_to_string_upper_call"].toString().toUpperCase(), "local_dead_promise_resolve_array_to_string_upper_call_marker"));
    Promise.resolve((["local_dead_promise_resolve_array_to_locale_index_read"].toLocaleString()[0], "local_dead_promise_resolve_array_to_locale_index_read_marker"));
    Promise.resolve((987).toString().length + "local_dead_promise_resolve_number_to_string_length_read".length);
    Promise.resolve(((false).toLocaleString().toUpperCase(), "local_dead_promise_resolve_boolean_to_locale_upper_call_marker"));
    Promise.resolve(((987n).toString()[0], "local_dead_promise_resolve_bigint_to_string_index_read_marker"));
    Promise.resolve(Object.prototype.toString.call({ local_dead_promise_resolve_object_prototype_to_string_length_target: 1 }).length + "local_dead_promise_resolve_object_prototype_to_string_length_read".length);
    Promise.resolve((Object.prototype.toString.call(["local_dead_promise_resolve_object_prototype_to_string_upper_target"]).toUpperCase(), "local_dead_promise_resolve_object_prototype_to_string_upper_call_marker"));
    Promise.resolve((Object.prototype.toString.call(null)[0], "local_dead_promise_resolve_object_prototype_to_string_index_read_marker"));
    Promise.resolve(Object.prototype.toLocaleString.call("local_dead_promise_resolve_object_prototype_to_locale_length").length + "local_dead_promise_resolve_object_prototype_to_locale_length_read".length);
    Promise.resolve((Object.prototype.toLocaleString.call(false).toUpperCase(), "local_dead_promise_resolve_object_prototype_to_locale_upper_call_marker"));
    Promise.resolve((Object.prototype.toLocaleString.call(321n)[0], "local_dead_promise_resolve_object_prototype_to_locale_index_read_marker"));
    Promise.resolve(Object.prototype.toString.call({ local_dead_promise_resolve_object_prototype_to_string_call: 1 }));
    Promise.resolve(Object.prototype.toLocaleString.call("local_dead_promise_resolve_object_prototype_to_locale_call"));
    Promise.resolve("local_dead_promise_resolve_string_length".length);
    Promise.resolve(["local_dead_promise_resolve_array_length"].length);
    Promise.resolve("local_dead_promise_resolve_string_element"[2]);
    Promise.resolve(`local_dead_promise_resolve_template_${"value"}`);
    Promise.resolve(true ? "local_dead_promise_resolve_conditional_true" : "local_dead_promise_resolve_conditional_false");
    const local_dead_promise_resolve_logical_source: string = String("local_dead_promise_resolve_logical_left");
    const local_dead_promise_resolve_nullish_source: string | undefined = String("local_dead_promise_resolve_nullish_left");
    Promise.resolve(local_dead_promise_resolve_logical_source && "local_dead_promise_resolve_logical_right");
    Promise.resolve(local_dead_promise_resolve_nullish_source ?? "local_dead_promise_resolve_nullish_right");
    Promise.resolve((String("local_dead_promise_resolve_comma_left"), "local_dead_promise_resolve_comma_right"));
    Promise.resolve("local_dead_promise_resolve_arithmetic".length - 1);
    Promise.resolve("local_dead_promise_resolve_comparison".length >= 1);
    Promise.resolve(String("local_dead_promise_resolve_equality") == "missing");
    Promise.resolve("local_dead_promise_resolve_in_key" in { local_dead_promise_resolve_in_key: true });
    Promise.resolve(delete ({ local_dead_promise_resolve_delete_key: true } as { local_dead_promise_resolve_delete_key?: boolean }).local_dead_promise_resolve_delete_key);
    Promise.resolve(void String("local_dead_promise_resolve_void"));
    Promise.resolve(typeof String("local_dead_promise_resolve_typeof"));
    Promise.resolve(!"local_dead_promise_resolve_prefix_bang".length);
    Promise.resolve(~"local_dead_promise_resolve_prefix_tilde".length);
    Promise.try(() => "local_dead_promise_try_literal");
    Promise.try(function () {
        return String("local_dead_promise_try_function");
    });
    Promise.try(() => {
    });
    Promise.try(() => Promise.resolve("local_dead_promise_try_resolve"));
    Promise.try(() => Promise.reject("local_dead_promise_try_reject"));
    Promise.try(() => Promise.race([] as Promise<string>[]));
    Promise.try(() => "local_dead_promise_try_then_source")
        .then(() => "local_dead_promise_try_then_callback");
    Promise.try(() => Promise.reject("local_dead_promise_try_catch_source"))
        .catch(() => "local_dead_promise_try_catch_callback");
    Promise.try(() => Promise.resolve("local_dead_promise_try_finally_source"))
        .finally(() => "local_dead_promise_try_finally_callback");
    Promise.try(() =>
        Promise.resolve("local_dead_promise_try_then_passthrough_source").then(),
    )
        .then((value) => "local_dead_promise_try_then_passthrough_callback");
    Promise.try(() =>
        Promise.reject<string>("local_dead_promise_try_catch_passthrough_source").catch(),
    )
        .catch((reason) => "local_dead_promise_try_catch_passthrough_callback");
    Promise.try(() =>
        Promise.race([] as Promise<string>[]).then((value) => "local_dead_promise_try_pending_then_unreached"),
    )
        .finally(() => "local_dead_promise_try_pending_then_finally_callback");
    Promise.all([] as Promise<string>[])
        .then(() => "local_dead_promise_all_empty_then_callback");
    Promise.allSettled([] as Promise<string>[])
        .then(() => "local_dead_promise_all_settled_empty_then_callback");
    Promise.any([] as Promise<string>[])
        .catch(() => "local_dead_promise_any_empty_catch_callback");
    Promise.all([] as Promise<string>[])
        .finally(() => "local_dead_promise_all_empty_finally_callback");
    Promise.any([] as Promise<string>[])
        .finally(() => "local_dead_promise_any_empty_finally_callback");
    Promise.resolve(Promise.resolve("local_dead_promise_resolve_adopt_resolve_source"))
        .then(() => "local_dead_promise_resolve_adopt_resolve_then_callback");
    Promise.resolve(Promise.reject("local_dead_promise_resolve_adopt_reject_source"))
        .catch(() => "local_dead_promise_resolve_adopt_reject_catch_callback");
    Promise.resolve(Promise.all([] as Promise<string>[]))
        .finally(() => "local_dead_promise_resolve_adopt_all_finally_callback");
    Promise.all([Promise.resolve("local_dead_promise_all_fulfilled_source")])
        .then(() => "local_dead_promise_all_fulfilled_then_callback");
    Promise.all([Promise.reject<string>("local_dead_promise_all_rejected_source")])
        .catch(() => "local_dead_promise_all_rejected_catch_callback");
    Promise.any([
        Promise.reject<string>("local_dead_promise_any_fulfilled_rejected_source"),
        Promise.resolve("local_dead_promise_any_fulfilled_source"),
    ])
        .then(() => "local_dead_promise_any_fulfilled_then_callback");
    Promise.allSettled([
        Promise.resolve("local_dead_promise_all_settled_nonempty_resolve_source"),
        Promise.reject<string>("local_dead_promise_all_settled_nonempty_reject_source"),
    ])
        .then(() => "local_dead_promise_all_settled_nonempty_then_callback");
    Promise.race([Promise.resolve("local_dead_promise_race_fulfilled_source")])
        .then(() => "local_dead_promise_race_fulfilled_then_callback");
    Promise.race([] as Promise<string>[])
        .then(() => "local_dead_promise_race_empty_then_callback");
    Promise.race([] as Promise<string>[])
        .catch(() => "local_dead_promise_race_empty_catch_callback");
    Promise.race([] as Promise<string>[])
        .finally(() => "local_dead_promise_race_empty_finally_callback");
    Promise.resolve(Promise.race([] as Promise<string>[]))
        .finally(() => "local_dead_promise_resolve_adopt_pending_finally_callback");
    Promise.resolve(
        Promise.resolve("local_dead_promise_resolve_adopt_then_passthrough_source").then(),
    )
        .then((value) => "local_dead_promise_resolve_adopt_then_passthrough_callback");
    Promise.resolve(
        Promise.reject<string>("local_dead_promise_resolve_adopt_catch_passthrough_source").catch(),
    )
        .catch((reason) => "local_dead_promise_resolve_adopt_catch_passthrough_callback");
    Promise.resolve(
        Promise.race([] as Promise<string>[]).then(() => "local_dead_promise_resolve_adopt_pending_then_unreached"),
    )
        .finally(() => "local_dead_promise_resolve_adopt_pending_then_finally_callback");
    Promise.try(() => Promise.race([] as Promise<string>[]))
        .then(() => "local_dead_promise_try_pending_then_callback");
    new Promise<string>(() => {
    })
        .then(() => "local_dead_new_promise_empty_then_callback");
    new Promise<string>(() => {
    })
        .finally(() => "local_dead_new_promise_empty_finally_callback");
    Promise.all([
        Promise.race([] as Promise<string>[]),
        Promise.reject<string>("local_dead_promise_all_pending_rejected_source"),
    ])
        .catch(() => "local_dead_promise_all_pending_rejected_catch_callback");
    Promise.all([
        Promise.resolve("local_dead_promise_all_then_passthrough_element_source").then(),
    ])
        .then((value) => "local_dead_promise_all_then_passthrough_element_callback");
    Promise.all([
        Promise.reject<string>("local_dead_promise_all_rejected_then_passthrough_element_source").then(undefined),
    ])
        .catch((reason) => "local_dead_promise_all_rejected_then_passthrough_element_callback");
    Promise.all([
        Promise.race([] as Promise<string>[]).then((value) => "local_dead_promise_all_pending_then_element_unreached"),
    ])
        .finally(() => "local_dead_promise_all_pending_then_element_finally_callback");
    Promise.allSettled([
        Promise.resolve("local_dead_promise_all_settled_then_passthrough_fulfilled_element").then(),
        Promise.reject<string>("local_dead_promise_all_settled_then_passthrough_rejected_element").catch(),
    ])
        .then((value) => "local_dead_promise_all_settled_then_passthrough_element_callback");
    Promise.allSettled([
        Promise.race([] as Promise<string>[]).then((value) => "local_dead_promise_all_settled_pending_then_element_unreached"),
    ])
        .finally(() => "local_dead_promise_all_settled_pending_then_element_finally_callback");
    Promise.any([
        Promise.reject<string>("local_dead_promise_any_then_passthrough_rejected_element").then(undefined),
        Promise.resolve("local_dead_promise_any_then_passthrough_fulfilled_element").then(),
    ])
        .then((value) => "local_dead_promise_any_then_passthrough_element_callback");
    Promise.any([
        Promise.race([] as Promise<string>[]).then((value) => "local_dead_promise_any_pending_then_element_unreached"),
        Promise.reject<string>("local_dead_promise_any_pending_then_rejected_element").then(undefined),
    ])
        .finally(() => "local_dead_promise_any_pending_then_element_finally_callback");
    Promise.race([
        Promise.resolve("local_dead_promise_race_then_passthrough_element_source").then(),
    ])
        .then((value) => "local_dead_promise_race_then_passthrough_element_callback");
    Promise.any([
        Promise.race([] as Promise<string>[]),
        Promise.resolve("local_dead_promise_any_pending_fulfilled_source"),
    ])
        .then(() => "local_dead_promise_any_pending_fulfilled_then_callback");
    Promise.race([
        Promise.race([] as Promise<string>[]),
        Promise.resolve("local_dead_promise_race_pending_fulfilled_source"),
    ])
        .then(() => "local_dead_promise_race_pending_fulfilled_then_callback");
    Promise.race([
        Promise.race([] as Promise<string>[]),
        Promise.reject<string>("local_dead_promise_race_pending_rejected_source"),
    ])
        .catch(() => "local_dead_promise_race_pending_rejected_catch_callback");
    Promise.resolve("local_dead_promise_then_passthrough_source")
        .then()
        .then(() => "local_dead_promise_then_passthrough_callback");
    Promise.reject<string>("local_dead_promise_catch_passthrough_source")
        .catch()
        .catch((reason) => "local_dead_promise_catch_passthrough_callback");
    Promise.resolve("local_dead_promise_finally_passthrough_source")
        .finally(undefined)
        .then(() => "local_dead_promise_finally_passthrough_callback");
    Promise.resolve("local_dead_promise_finally_callback_source")
        .finally(() => "local_dead_promise_finally_callback_passthrough")
        .then(() => "local_dead_promise_finally_callback_then_callback");
    Promise.reject<string>("local_dead_promise_reject_finally_callback_source")
        .finally(() => "local_dead_promise_reject_finally_callback_passthrough")
        .catch((reason) => "local_dead_promise_reject_finally_callback_catch_callback");
    Promise.resolve("local_dead_promise_catch_fulfilled_passthrough_source")
        .catch((reason) => "local_dead_promise_catch_fulfilled_unreached")
        .then(() => "local_dead_promise_catch_fulfilled_passthrough_callback");
    Promise.race([] as Promise<string>[])
        .then(() => "local_dead_promise_pending_nested_then_callback")
        .finally(() => "local_dead_promise_pending_nested_finally_callback");
    new Promise<string>(() => {
    });
    new Promise<string>((resolve) => resolve("local_dead_new_promise_resolve"));
    new Promise<string>((resolve, reject) => {
        reject("local_dead_new_promise_reject");
    });
    new Promise<string>((resolve) => resolve("local_dead_new_promise_then_resolve_source"))
        .then(() => "local_dead_new_promise_then_resolve_callback");
    new Promise<string>((resolve, reject) => reject("local_dead_new_promise_catch_reject_source"))
        .catch(() => "local_dead_new_promise_catch_reject_callback");
    new Promise<string>((resolve) => resolve("local_dead_new_promise_finally_resolve_source"))
        .finally(() => "local_dead_new_promise_finally_resolve_callback");
    new Promise<string>((resolve, reject) => reject("local_dead_new_promise_finally_reject_source"))
        .finally(() => "local_dead_new_promise_finally_reject_callback");
    new Promise<Promise<string>>((resolve) =>
        resolve(Promise.resolve("local_dead_new_promise_resolve_adopt_then_passthrough_source").then()),
    )
        .then((value) => "local_dead_new_promise_resolve_adopt_then_passthrough_callback");
    new Promise<string>((resolve, reject) =>
        reject(Promise.resolve("local_dead_new_promise_reject_reason_then_passthrough_source").then()),
    )
        .catch((reason) => "local_dead_new_promise_reject_reason_then_passthrough_callback");
    new Promise<Promise<string>>((resolve) =>
        resolve(Promise.race([] as Promise<string>[]).then((value) => "local_dead_new_promise_resolve_pending_then_unreached")),
    )
        .finally(() => "local_dead_new_promise_resolve_pending_then_finally_callback");
    Promise.resolve("local_dead_promise_then_source").then(() => "local_dead_promise_then_callback");
    Promise.resolve("local_dead_promise_then_fulfilled_two_arg_source").then(
        () => "local_dead_promise_then_fulfilled_two_arg_callback",
        () => "local_dead_promise_then_fulfilled_two_arg_unreached",
    );
    Promise.reject<string>("local_dead_promise_then_rejected_two_arg_source").then(
        () => "local_dead_promise_then_rejected_two_arg_unreached",
        () => "local_dead_promise_then_rejected_two_arg_callback",
    );
    Promise.reject<string>("local_dead_promise_catch_source").catch(() => "local_dead_promise_catch_callback");
    Promise.resolve("local_dead_promise_catch_fulfilled_direct_source")
        .catch((reason) => "local_dead_promise_catch_fulfilled_direct_callback");
    Promise.resolve("local_dead_promise_finally_source").finally(() => {
        String("local_dead_promise_finally_callback");
    });
    const local_dead_promise_resolve_object_shorthand = "local_dead_promise_resolve_object_shorthand";
    Promise.resolve({ local_dead_promise_resolve_object_shorthand }.local_dead_promise_resolve_object_shorthand);
    const local_dead_promise_resolve_object_spread_source = { local_dead_promise_resolve_object_spread: "local_dead_promise_resolve_object_spread" };
    Promise.resolve({ ...local_dead_promise_resolve_object_spread_source }.local_dead_promise_resolve_object_spread);
    const local_dead_promise_resolve_object_assign_source = { local_dead_promise_resolve_object_assign: "local_dead_promise_resolve_object_assign" };
    Promise.resolve(Object.assign({}, local_dead_promise_resolve_object_assign_source).local_dead_promise_resolve_object_assign);
    Promise.resolve(Object.fromEntries<{ local_dead_promise_resolve_object_from_entries: string }>([["local_dead_promise_resolve_object_from_entries", "local_dead_promise_resolve_object_from_entries"]]).local_dead_promise_resolve_object_from_entries);
    Promise.resolve(Object.fromEntries<{ local_dead_promise_resolve_object_entries_from_entries: string }>(Object.entries({ local_dead_promise_resolve_object_entries_from_entries: "local_dead_promise_resolve_object_entries_from_entries" })).local_dead_promise_resolve_object_entries_from_entries);
    Promise.resolve(Object.fromEntries<{ local_dead_promise_resolve_object_entries_spread_from_entries: string }>(Object.entries({ ...{ local_dead_promise_resolve_object_entries_spread_from_entries: "local_dead_promise_resolve_object_entries_spread_from_entries" } })).local_dead_promise_resolve_object_entries_spread_from_entries);
    Promise.resolve(Object.defineProperty({} as { local_dead_promise_resolve_object_define_property: string }, "local_dead_promise_resolve_object_define_property", { value: "local_dead_promise_resolve_object_define_property", enumerable: true }).local_dead_promise_resolve_object_define_property);
    Promise.resolve(Object.defineProperties({} as { local_dead_promise_resolve_object_define_properties: string }, { local_dead_promise_resolve_object_define_properties: { value: "local_dead_promise_resolve_object_define_properties", configurable: true } }).local_dead_promise_resolve_object_define_properties);
    Promise.resolve(Object.create(null, { local_dead_promise_resolve_object_create_descriptor: { value: "local_dead_promise_resolve_object_create_descriptor", enumerable: true } }).local_dead_promise_resolve_object_create_descriptor);
    Promise.resolve(Object.freeze({ local_dead_promise_resolve_object_freeze: "local_dead_promise_resolve_object_freeze" }).local_dead_promise_resolve_object_freeze);
    Promise.resolve(Object.seal({ local_dead_promise_resolve_object_seal: "local_dead_promise_resolve_object_seal" }).local_dead_promise_resolve_object_seal);
    Promise.resolve(Object.preventExtensions({ local_dead_promise_resolve_object_prevent_extensions: "local_dead_promise_resolve_object_prevent_extensions" }).local_dead_promise_resolve_object_prevent_extensions);
    Promise.resolve(Object.setPrototypeOf({ local_dead_promise_resolve_object_set_prototype: "local_dead_promise_resolve_object_set_prototype" }, null).local_dead_promise_resolve_object_set_prototype);
    Promise.resolve({ local_dead_promise_resolve_object_property: "local_dead_promise_resolve_object_property" }.local_dead_promise_resolve_object_property);
    Promise.resolve(({ local_dead_promise_resolve_object_property_missing_source: 1 } as { [key: string]: number }).local_dead_promise_resolve_object_property_missing);
    Promise.resolve(Reflect.get({ local_dead_promise_resolve_reflect_get: "local_dead_promise_resolve_reflect_get" }, "local_dead_promise_resolve_reflect_get"));
    Promise.resolve(Reflect.get(["local_dead_promise_resolve_reflect_get_array"], "0"));
    Promise.resolve(Object.getOwnPropertyDescriptor({ local_dead_promise_resolve_descriptor_value: "local_dead_promise_resolve_descriptor_value" }, "local_dead_promise_resolve_descriptor_value")!.value);
    Promise.resolve(Reflect.getOwnPropertyDescriptor(["local_dead_promise_resolve_reflect_descriptor_value"], "0")!.value);
    Promise.resolve(Object.hasOwn(Object.freeze({ local_dead_promise_resolve_object_has_own_freeze: 1 }), "local_dead_promise_resolve_object_has_own_freeze"));
    Promise.resolve(Reflect.get(Object.freeze({ local_dead_promise_resolve_reflect_get_freeze: "local_dead_promise_resolve_reflect_get_freeze" }), "local_dead_promise_resolve_reflect_get_freeze"));
    Promise.resolve(Reflect.has(Object.freeze({ local_dead_promise_resolve_reflect_has_freeze: 1 }), "local_dead_promise_resolve_reflect_has_freeze"));
    Promise.resolve(Object.getOwnPropertyDescriptor(Object.freeze({ local_dead_promise_resolve_descriptor_value_freeze: "local_dead_promise_resolve_descriptor_value_freeze" }), "local_dead_promise_resolve_descriptor_value_freeze")!.value);
    Promise.resolve(Reflect.getOwnPropertyDescriptor(Object.freeze(["local_dead_promise_resolve_reflect_descriptor_value_freeze"]), "0")!.value);
    Promise.resolve(Object.keys({ local_dead_promise_resolve_object_keys_length: 1 }).length);
    Promise.resolve(Reflect.ownKeys(["local_dead_promise_resolve_reflect_own_keys_length"]).length);
    Promise.resolve(Object.getOwnPropertyDescriptors({ local_dead_promise_resolve_descriptors_value: "local_dead_promise_resolve_descriptors_value" }).local_dead_promise_resolve_descriptors_value.value);
    Promise.resolve(Object.getOwnPropertyDescriptors(["local_dead_promise_resolve_descriptors_array_value"])["0"].value);
    Promise.resolve(Array.of("local_dead_promise_resolve_array_of_element")[0]);
    Promise.resolve(Array.from(["local_dead_promise_resolve_array_from_array_element"])[0]);
    Promise.resolve(Array.from(Array.of("local_dead_promise_resolve_array_from_returned_element", "local_dead_promise_resolve_array_from_returned_element_hit").slice(1))[0]);
    Promise.resolve(Array.from(Array.of("local_dead_promise_resolve_array_from_returned_absent").slice(1))[0]);
    Promise.resolve([...Array.of("local_dead_promise_resolve_array_spread_returned_element", "local_dead_promise_resolve_array_spread_returned_element_hit").slice(1)][0]);
    Promise.resolve([...Array.of("local_dead_promise_resolve_array_spread_returned_absent").slice(1)][0]);
    Promise.resolve(Array.from("local_dead_promise_resolve_array_from_string_element")[0]);
    Promise.resolve(Object.keys({ local_dead_promise_resolve_object_keys_element: 1 })[0]);
    Promise.resolve(Object.getOwnPropertyNames(["local_dead_promise_resolve_object_property_names_element"])[0]);
    Promise.resolve(Array.from(new Set(["local_dead_promise_resolve_array_from_set_element"]))[0]);
    Promise.resolve(Array.from(new Set(Array.of("local_dead_promise_resolve_array_from_set_returned_element").slice(0)))[0]);
    Promise.resolve(Array.from(new Set(Array.of("local_dead_promise_resolve_array_from_set_returned_absent").slice(1)))[0]);
    Promise.resolve(Array.from(new Set(Array.of("local_dead_promise_resolve_array_from_set_returned_length_drop", "local_dead_promise_resolve_array_from_set_returned_length", "local_dead_promise_resolve_array_from_set_returned_length_tail").slice(1))).length);
    Promise.resolve(Array.from(new Set(Array.of("local_dead_promise_resolve_array_from_set_concat_length").concat(Array.of("local_dead_promise_resolve_array_from_set_concat_length_tail")))).length);
    Promise.resolve(Array.from(new Set(Array.of("local_dead_promise_resolve_array_from_set_reversed_length", "local_dead_promise_resolve_array_from_set_reversed_length_tail").toReversed())).length);
    Promise.resolve(Array.from(new Set(Array.of("local_dead_promise_resolve_array_from_set_sorted_length_b", "local_dead_promise_resolve_array_from_set_sorted_length_a").toSorted())).length);
    Promise.resolve(Array.from(new Map(Array.of(["local_dead_promise_resolve_array_from_empty_map_returned_length", "local_dead_promise_resolve_array_from_empty_map_returned_length_value"] as ObjectEntry<string>).slice(1))).length);
    Promise.resolve(Array.from(new Map(Array.of(["local_dead_promise_resolve_array_from_empty_map_returned_absent", "local_dead_promise_resolve_array_from_empty_map_returned_absent_value"] as ObjectEntry<string>).slice(1)))[0]);
    Promise.resolve(Array.from(new Map(Array.of(["local_dead_promise_resolve_array_from_map_returned_length", "local_dead_promise_resolve_array_from_map_returned_length_value"] as ObjectEntry<string>, ["local_dead_promise_resolve_array_from_map_returned_length_tail", "local_dead_promise_resolve_array_from_map_returned_length_tail_value"] as ObjectEntry<string>).slice(1))).length);
    Promise.resolve(Array.from(new Map(Array.of(["local_dead_promise_resolve_array_from_map_concat_length", "local_dead_promise_resolve_array_from_map_concat_length_value"] as ObjectEntry<string>).concat(Array.of(["local_dead_promise_resolve_array_from_map_concat_length_tail", "local_dead_promise_resolve_array_from_map_concat_length_tail_value"] as ObjectEntry<string>)))).length);
    Promise.resolve(Array.from(new Map(Array.of(["local_dead_promise_resolve_array_from_map_reversed_length", "local_dead_promise_resolve_array_from_map_reversed_length_value"] as ObjectEntry<string>, ["local_dead_promise_resolve_array_from_map_reversed_length_tail", "local_dead_promise_resolve_array_from_map_reversed_length_tail_value"] as ObjectEntry<string>).toReversed())).length);
    Promise.resolve(Array.from(new Map(Array.of(["local_dead_promise_resolve_array_from_map_sorted_length_b", "local_dead_promise_resolve_array_from_map_sorted_length_b_value"] as ObjectEntry<string>, ["local_dead_promise_resolve_array_from_map_sorted_length_a", "local_dead_promise_resolve_array_from_map_sorted_length_a_value"] as ObjectEntry<string>).toSorted())).length);
    Promise.resolve(Object.entries(Array.from(Array.of("local_dead_promise_resolve_object_entries_array_from_returned_key").slice(0)))[0][0]);
    Promise.resolve(Object.entries([...Array.of("local_dead_promise_resolve_object_entries_array_spread_returned_key").slice(0)])[0][0]);
    Promise.resolve(Object.entries(Array.from(new Set(Array.of("local_dead_promise_resolve_object_entries_array_from_set_returned_key").slice(0))))[0][0]);
    Promise.resolve(Object.entries(Array.from(new Set(Array.of("local_dead_promise_resolve_object_entries_array_from_set_returned_tail_key_drop", "local_dead_promise_resolve_object_entries_array_from_set_returned_tail_key", "local_dead_promise_resolve_object_entries_array_from_set_returned_tail_key_tail").slice(1))))[1][0]);
    Promise.resolve(Object.entries(Array.from(new Set(Array.of("local_dead_promise_resolve_object_entries_array_from_set_concat_key").concat(Array.of("local_dead_promise_resolve_object_entries_array_from_set_concat_key_tail")))))[1][0]);
    Promise.resolve(Object.entries(Array.from(new Set(Array.of("local_dead_promise_resolve_object_entries_array_from_set_reversed_key", "local_dead_promise_resolve_object_entries_array_from_set_reversed_key_tail").reverse())))[1][0]);
    Promise.resolve(Object.entries(Array.from(new Set(Array.of("local_dead_promise_resolve_object_entries_array_from_set_sorted_key_b", "local_dead_promise_resolve_object_entries_array_from_set_sorted_key_a").sort())))[1][0]);
    Promise.resolve(Object.entries(Array.from(new Map(Array.of(["local_dead_promise_resolve_object_entries_array_from_empty_map_returned_key", "local_dead_promise_resolve_object_entries_array_from_empty_map_returned_key_value"] as ObjectEntry<string>).slice(1))))[0][0]);
    Promise.resolve(Object.entries(Array.from(new Map(Array.of(["local_dead_promise_resolve_object_entries_array_from_map_returned_key", "local_dead_promise_resolve_object_entries_array_from_map_returned_key_value"] as ObjectEntry<string>, ["local_dead_promise_resolve_object_entries_array_from_map_returned_key_tail", "local_dead_promise_resolve_object_entries_array_from_map_returned_key_tail_value"] as ObjectEntry<string>).slice(1))))[0][0]);
    Promise.resolve(Object.entries(Array.from(new Map(Array.of(["local_dead_promise_resolve_object_entries_array_from_map_concat_key", "local_dead_promise_resolve_object_entries_array_from_map_concat_key_value"] as ObjectEntry<string>).concat(Array.of(["local_dead_promise_resolve_object_entries_array_from_map_concat_key_tail", "local_dead_promise_resolve_object_entries_array_from_map_concat_key_tail_value"] as ObjectEntry<string>)))))[1][0]);
    Promise.resolve(Object.entries(Array.from(new Map(Array.of(["local_dead_promise_resolve_object_entries_array_from_map_reversed_key", "local_dead_promise_resolve_object_entries_array_from_map_reversed_key_value"] as ObjectEntry<string>, ["local_dead_promise_resolve_object_entries_array_from_map_reversed_key_tail", "local_dead_promise_resolve_object_entries_array_from_map_reversed_key_tail_value"] as ObjectEntry<string>).reverse())))[1][0]);
    Promise.resolve(Object.entries(Array.from(new Map(Array.of(["local_dead_promise_resolve_object_entries_array_from_map_sorted_key_b", "local_dead_promise_resolve_object_entries_array_from_map_sorted_key_b_value"] as ObjectEntry<string>, ["local_dead_promise_resolve_object_entries_array_from_map_sorted_key_a", "local_dead_promise_resolve_object_entries_array_from_map_sorted_key_a_value"] as ObjectEntry<string>).sort())))[1][0]);
    Promise.resolve(Reflect.ownKeys({ local_dead_promise_resolve_reflect_own_keys_element: 1 })[0]);
    Promise.resolve(Object.keys(Object.freeze({ local_dead_promise_resolve_object_keys_freeze_element: 1 }))[0]);
    Promise.resolve(Object.getOwnPropertyNames(Object.freeze(["local_dead_promise_resolve_object_property_names_freeze_element"]))[0]);
    Promise.resolve(Reflect.ownKeys(Object.freeze({ local_dead_promise_resolve_reflect_own_keys_freeze_element: 1 }))[0]);
    Promise.resolve(Object.keys({ local_dead_promise_resolve_object_keys_join: 1 }).join("|"));
    Promise.resolve(Object.getOwnPropertyNames(["local_dead_promise_resolve_object_property_names_join"]).join("|"));
    Promise.resolve(Object.keys({ local_dead_promise_resolve_object_keys_includes: 1 }).includes("local_dead_promise_resolve_object_keys_includes"));
    Promise.resolve(Object.keys(Object.assign({}, { local_dead_promise_resolve_object_keys_assign_join: 1 })).join("|"));
    Promise.resolve(Object.getOwnPropertyNames(Object.fromEntries<{ local_dead_promise_resolve_object_property_names_from_entries_join: number }>([["local_dead_promise_resolve_object_property_names_from_entries_join", 1]])).join("|"));
    Promise.resolve(Object.keys(Object.create(null, { local_dead_promise_resolve_object_keys_create_descriptor_to_string: { value: 1, enumerable: true } })).toString());
    Promise.resolve(Object.getOwnPropertyNames(Object.defineProperty({}, "local_dead_promise_resolve_object_property_names_define_property_includes", { value: 1, enumerable: true })).includes("local_dead_promise_resolve_object_property_names_define_property_includes"));
    Promise.resolve(Reflect.ownKeys({ local_dead_promise_resolve_reflect_own_keys_join: 1 }).join("|"));
    Promise.resolve(Reflect.ownKeys(["local_dead_promise_resolve_reflect_own_keys_to_string"]).toString());
    Promise.resolve(Reflect.ownKeys(Object.assign({}, { local_dead_promise_resolve_reflect_own_keys_assign_join: 1 })).join("|"));
    Promise.resolve(Reflect.ownKeys(Object.fromEntries<{ local_dead_promise_resolve_reflect_own_keys_from_entries_join: number }>([["local_dead_promise_resolve_reflect_own_keys_from_entries_join", 1]])).join("|"));
    Promise.resolve(Reflect.ownKeys(Object.create(null, { local_dead_promise_resolve_reflect_own_keys_create_descriptor_join: { value: 1, enumerable: true } })).join("|"));
    Promise.resolve(Reflect.ownKeys(Object.defineProperties({}, { local_dead_promise_resolve_reflect_own_keys_define_properties_join: { value: 1, enumerable: true } })).join("|"));
    Promise.resolve(Array.of("local_dead_promise_resolve_array_of_length").length);
    Promise.resolve(Array.from(["local_dead_promise_resolve_array_from_length"]).length);
    Promise.resolve(Array.from(new Set(["local_dead_promise_resolve_array_from_set_length"])).length);
    Promise.resolve(Array.of("local_dead_promise_resolve_array_of_join").join("|"));
    Promise.resolve(Array.from(["local_dead_promise_resolve_array_from_join"]).join("|"));
    Promise.resolve(Array.from("local_dead_promise_resolve_array_from_string_to_string").toString());
    Promise.resolve(Array.from(["local_dead_promise_resolve_array_from_includes"]).includes("local_dead_promise_resolve_array_from_includes"));
    Promise.resolve(Array.from(new Set(["local_dead_promise_resolve_array_from_set_join"])).join("|"));
    Promise.resolve(Array.from(new Set(["local_dead_promise_resolve_array_from_set_to_string"])).toString());
    Promise.resolve(Object.values(["local_dead_promise_resolve_object_values_array_element"])[0]);
    Promise.resolve(Object.values("local_dead_promise_resolve_object_values_string_element")[0]);
    Promise.resolve(Object.values({ local_dead_promise_resolve_object_values_object_element: "local_dead_promise_resolve_object_values_object_element" })[0]);
    Promise.resolve(Object.values({ ...{ local_dead_promise_resolve_object_values_spread_element: "local_dead_promise_resolve_object_values_spread_element" }, local_dead_promise_resolve_object_values_spread_tail: "local_dead_promise_resolve_object_values_spread_tail" })[1]);
    Promise.resolve(Object.values(["local_dead_promise_resolve_object_values_array_join"]).join("|"));
    Promise.resolve(Object.values("local_dead_promise_resolve_object_values_string_to_string").toString());
    Promise.resolve(Object.values({ local_dead_promise_resolve_object_values_object_join: "local_dead_promise_resolve_object_values_object_join" }).join("|"));
    Promise.resolve(Object.values({ ...{ local_dead_promise_resolve_object_values_spread_join: "local_dead_promise_resolve_object_values_spread_join" }, local_dead_promise_resolve_object_values_spread_join_tail: "local_dead_promise_resolve_object_values_spread_join_tail" }).join("|"));
    Promise.resolve(Object.values("local_dead_promise_resolve_object_values_number_join".length).join("|"));
    Promise.resolve(Object.values(true).toString("local_dead_promise_resolve_object_values_boolean_to_string"));
    Promise.resolve(Object.values(789n).includes("local_dead_promise_resolve_object_values_bigint_includes"));
    Promise.resolve(Object.values(Array.of("local_dead_promise_resolve_object_values_array_of_join")).join("|"));
    Promise.resolve(Object.values(Array.from(["local_dead_promise_resolve_object_values_array_from_to_string"])).toString());
    Promise.resolve(Object.values(Object.keys({ local_dead_promise_resolve_object_values_object_keys_includes: 1 })).includes("local_dead_promise_resolve_object_values_object_keys_includes"));
    Promise.resolve(Object.values(new Map([["local_dead_promise_resolve_object_values_map_join", 1]])).join("|"));
    Promise.resolve(Object.values(new Set(["local_dead_promise_resolve_object_values_set_to_string"])).toString());
    Promise.resolve(Object.values(new WeakMap<object, string>()).toString("local_dead_promise_resolve_object_values_weak_map_to_string"));
    Promise.resolve(Object.values(Object.assign({} as { local_dead_promise_resolve_object_values_assign_join: string }, { local_dead_promise_resolve_object_values_assign_join: "local_dead_promise_resolve_object_values_assign_join" })).join("|"));
    Promise.resolve(Object.values(Object.fromEntries<{ local_dead_promise_resolve_object_values_from_entries_join: string }>([["local_dead_promise_resolve_object_values_from_entries_join", "local_dead_promise_resolve_object_values_from_entries_join"]])).join("|"));
    Promise.resolve(Object.values(Object.fromEntries<{ local_dead_promise_resolve_object_values_entries_from_entries_join: string }>(Object.entries({ local_dead_promise_resolve_object_values_entries_from_entries_join: "local_dead_promise_resolve_object_values_entries_from_entries_join" }))).join("|"));
    Promise.resolve(Object.values(Object.create(null, { local_dead_promise_resolve_object_values_create_descriptor_join: { value: "local_dead_promise_resolve_object_values_create_descriptor_join", enumerable: true } })).join("|"));
    Promise.resolve(Object.values(Object.defineProperty({} as { local_dead_promise_resolve_object_values_define_property_join: string }, "local_dead_promise_resolve_object_values_define_property_join", { value: "local_dead_promise_resolve_object_values_define_property_join", enumerable: true })).join("|"));
    Promise.resolve(Object.values(Object.defineProperties({} as { local_dead_promise_resolve_object_values_define_properties_join: string }, { local_dead_promise_resolve_object_values_define_properties_join: { value: "local_dead_promise_resolve_object_values_define_properties_join", enumerable: true } })).join("|"));
    Promise.resolve(Object.entries({ local_dead_promise_resolve_object_entries_key: "local_dead_promise_resolve_object_entries_value" })[0][0]);
    Promise.resolve(Object.entries({ local_dead_promise_resolve_object_entries_value_key: "local_dead_promise_resolve_object_entries_value" })[0][1]);
    Promise.resolve(Object.entries({ ...{ local_dead_promise_resolve_object_entries_spread_value_key: "local_dead_promise_resolve_object_entries_spread_value" }, local_dead_promise_resolve_object_entries_spread_tail_key: "local_dead_promise_resolve_object_entries_spread_tail_value" })[1][1]);
    Promise.resolve(Object.entries(["local_dead_promise_resolve_object_entries_array_value"])[0][1]);
    Promise.resolve(Object.entries("local_dead_promise_resolve_object_entries_string_value")[0][1]);
    Promise.resolve(Object.entries(new Map([["local_dead_promise_resolve_object_entries_map_join", 1]])).join("|"));
    Promise.resolve(Object.entries(new Set(["local_dead_promise_resolve_object_entries_set_to_string"])).toString("local_dead_promise_resolve_object_entries_set_to_string_ignored"));
    Promise.resolve(Object.entries(new WeakSet<object>()).toString("local_dead_promise_resolve_object_entries_weak_set_to_string"));
    Promise.resolve(Object.entries("local_dead_promise_resolve_object_entries_number_join".length).join("|"));
    Promise.resolve(Object.entries(false).toString("local_dead_promise_resolve_object_entries_boolean_to_string"));
    Promise.resolve(Object.entries(789n).toString("local_dead_promise_resolve_object_entries_bigint_to_string"));
    Promise.resolve(Object.entries({ local_dead_promise_resolve_object_entries_object_join: "local_dead_promise_resolve_object_entries_object_join" }).join("|"));
    Promise.resolve(Object.entries({ ...{ local_dead_promise_resolve_object_entries_spread_join: "local_dead_promise_resolve_object_entries_spread_join" }, local_dead_promise_resolve_object_entries_spread_join_tail: "local_dead_promise_resolve_object_entries_spread_join_tail" }).join("|"));
    Promise.resolve(Object.entries(Object.assign({} as { local_dead_promise_resolve_object_entries_assign_to_string: string }, { local_dead_promise_resolve_object_entries_assign_to_string: "local_dead_promise_resolve_object_entries_assign_to_string" })).toString());
    Promise.resolve(Object.entries(Object.fromEntries<{ local_dead_promise_resolve_object_entries_from_entries_join: string }>([["local_dead_promise_resolve_object_entries_from_entries_join", "local_dead_promise_resolve_object_entries_from_entries_join"]])).join("|"));
    Promise.resolve(Object.values(Object.freeze({ local_dead_promise_resolve_object_values_freeze: "local_dead_promise_resolve_object_values_freeze" }))[0]);
    Promise.resolve(Object.entries(Object.freeze({ local_dead_promise_resolve_object_entries_freeze: "local_dead_promise_resolve_object_entries_freeze" }))[0][1]);
    const local_dead_promise_resolve_array_spread_source = ["local_dead_promise_resolve_array_spread"];
    Promise.resolve([0, ...local_dead_promise_resolve_array_spread_source][1]);
    Promise.resolve([..."local_dead_promise_resolve_string_spread"][4]);
    Promise.resolve(["local_dead_promise_resolve_array_element"][0]);
    Promise.resolve(["local_dead_promise_resolve_array_element_oob"][4]);
    Promise.resolve(new Date("2103-01-02T03:04:05Z").valueOf("local_dead_promise_resolve_date_getter_ignored"));
    Promise.resolve(new Date("2103-02-03T04:05:06Z").toTimeString("local_dead_promise_resolve_date_string_ignored"));
    Promise.resolve(new Date("2103-03-04T05:06:07Z").toUTCString().length);
    Promise.resolve((new Date("2103-04-05T06:07:08Z").toDateString().toUpperCase(), "local_dead_promise_resolve_date_to_date_string_upper_call_marker"));
    Promise.resolve((new Date("2103-05-06T07:08:09Z").toTimeString()[0], "local_dead_promise_resolve_date_to_time_string_index_read_marker"));
    Promise.resolve(new RangeError("local_dead_promise_resolve_error_message").toString("local_dead_promise_resolve_error_ignored"));
    Promise.resolve(new AggregateError(["local_dead_promise_resolve_aggregate_error_item"], "local_dead_promise_resolve_aggregate_error_message").toLocaleString("local_dead_promise_resolve_aggregate_error_ignored"));
    Promise.resolve(new Error("local_dead_promise_resolve_error_to_string_length_read").toString().length);
    Promise.resolve((new TypeError("local_dead_promise_resolve_error_to_locale_upper_call").toLocaleString().toUpperCase(), "local_dead_promise_resolve_error_to_locale_upper_call_marker"));
    Promise.resolve((new AggregateError(["local_dead_promise_resolve_aggregate_error_to_string_index_item"], "local_dead_promise_resolve_aggregate_error_to_string_index_read").toString()[0], "local_dead_promise_resolve_aggregate_error_to_string_index_read_marker"));
    Promise.resolve(new Error("local_dead_promise_resolve_error_message_read").message);
    Promise.resolve(new TypeError("local_dead_promise_resolve_error_name_read").name);
    Promise.resolve(new Error("local_dead_promise_resolve_error_message_length_read").message.length);
    Promise.resolve((new TypeError("local_dead_promise_resolve_error_name_upper_call").name.toUpperCase(), "local_dead_promise_resolve_error_name_upper_call_marker"));
    Promise.resolve((new SyntaxError("local_dead_promise_resolve_error_message_index_read").message[0], "local_dead_promise_resolve_error_message_index_read_marker"));
    Promise.resolve(/local_dead_promise_resolve_regexp_source_read/m.source);
    Promise.resolve(new RegExp("local_dead_promise_resolve_regexp_multiline_read", "m").multiline);
    Promise.resolve(/local_dead_promise_resolve_regexp_source_length_read/m.source.length);
    Promise.resolve((new RegExp("local_dead_promise_resolve_regexp_flags_upper_call", "ms").flags.toUpperCase(), "local_dead_promise_resolve_regexp_flags_upper_call_marker"));
    Promise.resolve((/local_dead_promise_resolve_regexp_source_index_read/.source[0], "local_dead_promise_resolve_regexp_source_index_read_marker"));
    Promise.resolve(/local_dead_promise_resolve_regexp_to_string_length_read/.toString().length);
    Promise.resolve((new RegExp("local_dead_promise_resolve_regexp_to_locale_upper_call", "i").toLocaleString().toUpperCase(), "local_dead_promise_resolve_regexp_to_locale_upper_call_marker"));
    Promise.resolve((/local_dead_promise_resolve_regexp_to_string_index_read/.toString()[0], "local_dead_promise_resolve_regexp_to_string_index_read_marker"));
    Promise.resolve(Symbol("local_dead_promise_resolve_symbol_description_read").description);
    Promise.resolve(Symbol("local_dead_promise_resolve_symbol_description_length_read").description!.length);
    Promise.resolve((Symbol("local_dead_promise_resolve_symbol_to_string_upper_call").toString().toUpperCase(), "local_dead_promise_resolve_symbol_to_string_upper_call_marker"));
    Promise.resolve((Symbol.iterator.description![0], "local_dead_promise_resolve_well_known_symbol_description_index_read_marker"));
    Promise.resolve(isFinite("123"));
    Promise.resolve(Number.parseInt("local_dead_promise_resolve_number_parse", 10));
    Promise.resolve(Number.isFinite("local_dead_promise_resolve_number_predicate".length));
    Promise.resolve(decodeURIComponent("local-dead-promise-resolve-uri"));
    Promise.resolve(encodeURI("local dead promise resolve uri length").length);
    Promise.resolve((decodeURIComponent("local-dead-promise-resolve-uri-upper").toUpperCase(), "local_dead_promise_resolve_uri_upper_call_marker"));
    Promise.resolve((encodeURIComponent("local dead promise resolve uri index")[0], "local_dead_promise_resolve_uri_index_read_marker"));
    Promise.resolve(Math.min("local_dead_promise_resolve_math".length, 1));
    encodeURI("local dead encode uri");
    encodeURIComponent("local-dead-encode-uri-component");
    decodeURI("local-dead-decode-uri");
    decodeURIComponent("local-dead-decode-uri-component");
    encodeURI("local dead encode uri length").length;
    (decodeURIComponent("local-dead-decode-uri-upper").toUpperCase(), "local_dead_decode_uri_upper_call_marker".length);
    (encodeURIComponent("local dead encode uri component index")[0], "local_dead_encode_uri_component_index_read_marker".length);
    BigInt("345678");
    BigInt(44);
    BigInt(true);
    RegExp("local_dead_regexp_constructor", "m");
    new RegExp("local_dead_new_regexp_constructor");
    /local_dead_regexp_test/.test("local_dead_regexp_test_input");
    RegExp("local_dead_regexp_exec").exec("local_dead_regexp_exec_input");
    /local_dead_regexp_to_string/.toString();
    new RegExp("local_dead_regexp_to_locale_string").toLocaleString();
    /local_dead_regexp_value_of/.valueOf();
    Symbol("local_dead_symbol_constructor");
    "local_dead_string_char_at".charAt(1);
    "local_dead_string_starts_with".startsWith("local");
    "local_dead_string_substring".substring(1, 4);
    "local_dead_string_case".toUpperCase();
    "local_dead_string_trim".trimEnd();
    "local_dead_string_normalize".normalize("NFKC");
    "local_dead_string_repeat".repeat(2);
    "local_dead_string_pad".padStart(24, ".");
    "local_dead_string_replace".replace("replace", "replacement");
    "local_dead_string_replace_all".replaceAll("dead", "replacement");
    "local_dead_string_replace_regex".replace(/replace_regex/, "replacement");
    "local_dead_string_replace_all_regex".replaceAll(/replace_all_regex/g, "replacement");
    "local_dead_string_split:local_dead_string_split_tail".split(":", 1);
    "local_dead_string_split_regex local_dead_string_split_regex_tail".split(/\\s+/, 1);
    "local_dead_string_match".match("string_match");
    "local_dead_string_match_all".matchAll("string_match_all");
    "local_dead_string_search".search("string_search");
    ["local_dead_array_slice"].slice(0, 1);
    ["local_dead_array_at"].at(0);
    ["local_dead_array_includes"].includes("local_dead_array_includes");
    ["local_dead_array_values_method"].values();
    ["local_dead_array_entries_method"].entries();
    ["local_dead_array_concat"].concat(["local_dead_array_concat_tail"]);
    [["local_dead_array_flat"]].flat();
    ["local_dead_array_join", "local_dead_array_join_tail"].join(":");
    ["local_dead_array_pop"].pop();
    ["local_dead_array_shift"].shift();
    Array.of("local_dead_array_of_pop").pop();
    Array.from(["local_dead_array_from_shift"]).shift();
    ["local_dead_array_reverse"].reverse();
    Object.keys({ local_dead_object_keys_reverse: 1 }).reverse();
    Object.values({ local_dead_object_values_pop: "local_dead_object_values_pop" }).pop();
    Array.from(new Set(["local_dead_array_from_set_shift"])).shift();
    ["local_dead_array_fill", "local_dead_array_fill_tail"].fill("local_dead_array_fill_value", 0, 1);
    ["local_dead_array_copy_within", "local_dead_array_copy_within_tail"].copyWithin(0, 1);
    Array.of("local_dead_array_of_fill_length", "local_dead_array_of_fill_length_tail").fill("local_dead_array_of_fill_length_value").length;
    Array.of("local_dead_array_of_copy_within_length", "local_dead_array_of_copy_within_length_tail").copyWithin(0, 1).length;
    Array.of("local_dead_array_of_fill_absent_element", "local_dead_array_of_fill_absent_element_tail").fill("local_dead_array_of_fill_absent_element_value")[2];
    Array.of("local_dead_array_of_fill_element", "local_dead_array_of_fill_element_old").fill("local_dead_array_of_fill_element_value", 1, 2)[1];
    Array.of("local_dead_array_of_fill_retained_element", "local_dead_array_of_fill_retained_element_old").fill("local_dead_array_of_fill_retained_element_value", 1, 2)[0];
    Array.of("local_dead_array_of_copy_within_absent_element", "local_dead_array_of_copy_within_absent_element_tail").copyWithin(0, 1)[2];
    Array.of("local_dead_array_of_copy_within_element", "local_dead_array_of_copy_within_element_hit", "local_dead_array_of_copy_within_element_tail").copyWithin(0, 1, 2)[0];
    Array.of("local_dead_array_of_copy_within_retained_element", "local_dead_array_of_copy_within_retained_element_hit", "local_dead_array_of_copy_within_retained_element_tail").copyWithin(0, 1, 2)[2];
    Array.of("local_dead_array_of_to_spliced_length", "local_dead_array_of_to_spliced_length_tail").toSpliced(1, 1, "local_dead_array_of_to_spliced_length_insert", "local_dead_array_of_to_spliced_length_insert_tail").length;
    Array.of("local_dead_array_of_to_spliced_absent_element", "local_dead_array_of_to_spliced_absent_element_tail").toSpliced(1, 1, "local_dead_array_of_to_spliced_absent_element_insert")[2];
    Array.of("local_dead_array_of_to_spliced_insert_element", "local_dead_array_of_to_spliced_insert_element_deleted", "local_dead_array_of_to_spliced_insert_element_tail").toSpliced(1, 1, "local_dead_array_of_to_spliced_insert_element_insert")[1];
    Array.of("local_dead_array_of_to_spliced_tail_element", "local_dead_array_of_to_spliced_tail_element_deleted", "local_dead_array_of_to_spliced_tail_element_tail").toSpliced(1, 1, "local_dead_array_of_to_spliced_tail_element_insert")[2];
    Array.of("local_dead_array_of_slice_length", "local_dead_array_of_slice_length_tail", "local_dead_array_of_slice_length_extra").slice(1, 2).length;
    Array.of("local_dead_array_of_slice_absent_element", "local_dead_array_of_slice_absent_element_tail", "local_dead_array_of_slice_absent_element_extra").slice(-2, -1)[1];
    Array.of("local_dead_array_of_slice_element", "local_dead_array_of_slice_element_hit", "local_dead_array_of_slice_element_tail").slice(1, 3)[0];
    Array.of("local_dead_array_of_concat_length").concat(Array.of("local_dead_array_of_concat_length_arg", "local_dead_array_of_concat_length_arg_tail")).length;
    Array.of("local_dead_array_of_concat_absent_element").concat(Array.of("local_dead_array_of_concat_absent_element_arg", "local_dead_array_of_concat_absent_element_arg_tail"))[3];
    Array.of("local_dead_array_of_concat_element").concat(Array.of("local_dead_array_of_concat_element_hit", "local_dead_array_of_concat_element_tail"))[1];
    Array.of("local_dead_array_of_flat_zero_length", "local_dead_array_of_flat_zero_length_tail").flat(0).length;
    Array.of("local_dead_array_of_flat_zero_absent_element", "local_dead_array_of_flat_zero_absent_element_tail").flat(0)[2];
    Array.of("local_dead_array_of_flat_zero_element", "local_dead_array_of_flat_zero_element_hit").flat(0)[1];
    Array.of("local_dead_array_of_sort_length_b", "local_dead_array_of_sort_length_a").sort().length;
    Array.of("local_dead_array_of_to_sorted_absent_element_b", "local_dead_array_of_to_sorted_absent_element_a").toSorted()[2];
    Array.of("local_dead_array_of_sort_element_b", "local_dead_array_of_sort_element_a").sort()[0];
    Array.of("local_dead_array_of_to_sorted_element_b", "local_dead_array_of_to_sorted_element_a").toSorted()[0];
    Array.of("local_dead_array_of_reverse_element", "local_dead_array_of_reverse_element_hit").reverse()[0];
    Array.of("local_dead_array_of_to_reversed_element", "local_dead_array_of_to_reversed_element_hit").toReversed()[0];
    Array.of("local_dead_array_of_with_element", "local_dead_array_of_with_element_old").with(1, "local_dead_array_of_with_element_replacement")[1];
    Array.of("local_dead_array_of_with_retained_element", "local_dead_array_of_with_retained_element_old").with(1, "local_dead_array_of_with_retained_element_replacement")[0];
    Array.of("local_dead_array_of_keys_element", "local_dead_array_of_keys_element_tail").keys()[1];
    Array.of("local_dead_array_of_values_element", "local_dead_array_of_values_element_hit").values()[1];
    Array.of("local_dead_array_of_entries_key", "local_dead_array_of_entries_key_tail").entries()[1][0];
    Array.of("local_dead_array_of_entries_value", "local_dead_array_of_entries_value_hit").entries()[1][1];
    Array.from(Array.of("local_dead_array_from_returned_element", "local_dead_array_from_returned_element_hit").slice(1))[0];
    Array.from(Array.of("local_dead_array_from_returned_absent").slice(1))[0];
    Object.entries(Array.from(Array.of("local_dead_object_entries_array_from_returned_key").slice(0)))[0][0];
    [...Array.of("local_dead_array_spread_returned_element", "local_dead_array_spread_returned_element_hit").slice(1)][0];
    [...Array.of("local_dead_array_spread_returned_absent").slice(1)][0];
    Object.entries([...Array.of("local_dead_object_entries_array_spread_returned_key").slice(0)])[0][0];
    Array.from(new Set(Array.of("local_dead_array_from_set_returned_element").slice(0)))[0];
    Array.from(new Set(Array.of("local_dead_array_from_set_returned_absent").slice(1)))[0];
    Object.entries(Array.from(new Set(Array.of("local_dead_object_entries_array_from_set_returned_key").slice(0))))[0][0];
    Array.from(new Set(Array.of("local_dead_array_from_set_returned_with_drop", "local_dead_array_from_set_returned_with", "local_dead_array_from_set_returned_with_tail").slice(1))).with(1, "local_dead_array_from_set_returned_with_replacement");
    Object.entries(Array.from(new Set(Array.of("local_dead_object_entries_array_from_set_returned_tail_key_drop", "local_dead_object_entries_array_from_set_returned_tail_key", "local_dead_object_entries_array_from_set_returned_tail_key_tail").slice(1))))[1][0];
    Array.from(new Set(Array.of("local_dead_array_from_set_concat_with").concat(Array.of("local_dead_array_from_set_concat_with_tail")))).with(1, "local_dead_array_from_set_concat_with_replacement");
    Object.entries(Array.from(new Set(Array.of("local_dead_object_entries_array_from_set_concat_key").concat(Array.of("local_dead_object_entries_array_from_set_concat_key_tail")))))[1][0];
    Array.from(new Set(Array.of("local_dead_array_from_set_reversed_with", "local_dead_array_from_set_reversed_with_tail").reverse())).with(1, "local_dead_array_from_set_reversed_with_replacement");
    Object.entries(Array.from(new Set(Array.of("local_dead_object_entries_array_from_set_reversed_key", "local_dead_object_entries_array_from_set_reversed_key_tail").toReversed())))[1][0];
    Array.from(new Set(Array.of("local_dead_array_from_set_sorted_with_b", "local_dead_array_from_set_sorted_with_a").sort())).with(1, "local_dead_array_from_set_sorted_with_replacement");
    Object.entries(Array.from(new Set(Array.of("local_dead_object_entries_array_from_set_sorted_key_b", "local_dead_object_entries_array_from_set_sorted_key_a").toSorted())))[1][0];
    Array.from(new Map(Array.of(["local_dead_array_from_empty_map_returned_length", "local_dead_array_from_empty_map_returned_length_value"] as ObjectEntry<string>).slice(1))).length;
    Array.from(new Map(Array.of(["local_dead_array_from_empty_map_returned_absent", "local_dead_array_from_empty_map_returned_absent_value"] as ObjectEntry<string>).slice(1)))[0];
    Object.entries(Array.from(new Map(Array.of(["local_dead_object_entries_array_from_empty_map_returned_key", "local_dead_object_entries_array_from_empty_map_returned_key_value"] as ObjectEntry<string>).slice(1))))[0][0];
    Array.from(new Map(Array.of(["local_dead_array_from_map_returned_with", "local_dead_array_from_map_returned_with_value"] as ObjectEntry<string>, ["local_dead_array_from_map_returned_with_tail", "local_dead_array_from_map_returned_with_tail_value"] as ObjectEntry<string>).slice(1))).with(0, ["local_dead_array_from_map_returned_with_replacement", "local_dead_array_from_map_returned_with_replacement_value"]);
    Object.entries(Array.from(new Map(Array.of(["local_dead_object_entries_array_from_map_returned_key", "local_dead_object_entries_array_from_map_returned_key_value"] as ObjectEntry<string>, ["local_dead_object_entries_array_from_map_returned_key_tail", "local_dead_object_entries_array_from_map_returned_key_tail_value"] as ObjectEntry<string>).slice(1))))[0][0];
    Array.from(new Map(Array.of(["local_dead_array_from_map_concat_with", "local_dead_array_from_map_concat_with_value"] as ObjectEntry<string>).concat(Array.of(["local_dead_array_from_map_concat_with_tail", "local_dead_array_from_map_concat_with_tail_value"] as ObjectEntry<string>)))).with(1, ["local_dead_array_from_map_concat_with_replacement", "local_dead_array_from_map_concat_with_replacement_value"]);
    Object.entries(Array.from(new Map(Array.of(["local_dead_object_entries_array_from_map_concat_key", "local_dead_object_entries_array_from_map_concat_key_value"] as ObjectEntry<string>).concat(Array.of(["local_dead_object_entries_array_from_map_concat_key_tail", "local_dead_object_entries_array_from_map_concat_key_tail_value"] as ObjectEntry<string>)))))[1][0];
    Array.from(new Map(Array.of(["local_dead_array_from_map_reversed_with", "local_dead_array_from_map_reversed_with_value"] as ObjectEntry<string>, ["local_dead_array_from_map_reversed_with_tail", "local_dead_array_from_map_reversed_with_tail_value"] as ObjectEntry<string>).reverse())).with(1, ["local_dead_array_from_map_reversed_with_replacement", "local_dead_array_from_map_reversed_with_replacement_value"]);
    Object.entries(Array.from(new Map(Array.of(["local_dead_object_entries_array_from_map_reversed_key", "local_dead_object_entries_array_from_map_reversed_key_value"] as ObjectEntry<string>, ["local_dead_object_entries_array_from_map_reversed_key_tail", "local_dead_object_entries_array_from_map_reversed_key_tail_value"] as ObjectEntry<string>).toReversed())))[1][0];
    Array.from(new Map(Array.of(["local_dead_array_from_map_sorted_with_b", "local_dead_array_from_map_sorted_with_b_value"] as ObjectEntry<string>, ["local_dead_array_from_map_sorted_with_a", "local_dead_array_from_map_sorted_with_a_value"] as ObjectEntry<string>).sort())).with(1, ["local_dead_array_from_map_sorted_with_replacement", "local_dead_array_from_map_sorted_with_replacement_value"]);
    Object.entries(Array.from(new Map(Array.of(["local_dead_object_entries_array_from_map_sorted_key_b", "local_dead_object_entries_array_from_map_sorted_key_b_value"] as ObjectEntry<string>, ["local_dead_object_entries_array_from_map_sorted_key_a", "local_dead_object_entries_array_from_map_sorted_key_a_value"] as ObjectEntry<string>).toSorted())))[1][0];
    ["local_dead_array_push"].push("local_dead_array_push_value");
    ["local_dead_array_unshift"].unshift("local_dead_array_unshift_value");
    Object.keys({ local_dead_object_keys_fill: 1 }).fill("local_dead_object_keys_fill_value");
    Object.values({ local_dead_object_values_copy_within: "local_dead_object_values_copy_within" }).copyWithin(0, 0);
    Array.from(new Set(["local_dead_array_from_set_push"])).push("local_dead_array_from_set_push_value");
    Array.from(["local_dead_array_from_unshift"]).unshift("local_dead_array_from_unshift_value");
    ["local_dead_array_sort_b", "local_dead_array_sort_a"].sort();
    Object.keys({ local_dead_object_keys_sort: 1 }).sort();
    Object.values({ local_dead_object_values_sort: "local_dead_object_values_sort" }).sort();
    Array.from(new Set(["local_dead_array_from_set_sort"])).sort();
    [1].sort((a, b) => "local_dead_array_sort_comparator".length + a - b);
    Array.of("local_dead_array_of_sort_comparator").sort((a, b) => "local_dead_array_of_sort_comparator".length + a.localeCompare(b));
    Array.from(["local_dead_array_from_sort_comparator"]).sort((a, b) => "local_dead_array_from_sort_comparator".length + a.localeCompare(b));
    Array.from(new Set(["local_dead_array_from_set_sort_comparator"])).sort((a, b) => "local_dead_array_from_set_sort_comparator".length + a.localeCompare(b));
    Array.from(new Map([["local_dead_array_from_map_sort_comparator_key", "local_dead_array_from_map_sort_comparator_value"]])).sort((a, b) => "local_dead_array_from_map_sort_comparator".length + a[0].localeCompare(b[0]));
    Object.keys({ local_dead_object_keys_sort_comparator: 1 }).sort((a, b) => "local_dead_object_keys_sort_comparator".length + a.localeCompare(b));
    Object.keys(["local_dead_object_keys_array_sort_comparator"]).sort((a, b) => "local_dead_object_keys_array_sort_comparator".length + a.localeCompare(b));
    Object.getOwnPropertyNames({ local_dead_object_property_names_sort_comparator: 1 }).sort((a, b) => "local_dead_object_property_names_sort_comparator".length + a.localeCompare(b));
    Object.values({ local_dead_object_values_sort_comparator: "local_dead_object_values_sort_comparator" }).sort((a, b) => "local_dead_object_values_sort_comparator".length + a.localeCompare(b));
    Object.entries({ local_dead_object_entries_sort_comparator: "local_dead_object_entries_sort_comparator" }).sort((a, b) => "local_dead_object_entries_sort_comparator".length + a[0].localeCompare(b[0]));
    Reflect.ownKeys({ local_dead_reflect_own_keys_sort_comparator: 1 }).sort((a, b) => "local_dead_reflect_own_keys_sort_comparator".length + a.localeCompare(b));
    [].map(() => "local_dead_empty_array_map");
    Array.of<string>().map(() => "local_dead_array_of_empty_map");
    Array.from([] as string[]).filter(() => "local_dead_array_from_empty_filter".length > 0);
    Array.from(new Set<string>()).map(() => "local_dead_array_from_empty_set_map");
    Array.from(new Map<string, string>()).map(() => "local_dead_array_from_empty_map_map");
    Array.from(new Set(Object.keys({})), (value) => value + "local_dead_array_from_object_keys_empty_set_mapper");
    Array.from(new Map(Object.entries({})), (entry) => entry[0] + "local_dead_array_from_object_entries_empty_map_mapper");
    Object.keys({}).map(() => "local_dead_object_keys_empty_map");
    Object.keys([] as string[]).map(() => "local_dead_object_keys_array_empty_map");
    Object.getOwnPropertyNames({}).map(() => "local_dead_object_property_names_empty_map");
    Object.values({}).map(() => "local_dead_object_values_empty_map");
    Object.entries({}).map(() => "local_dead_object_entries_empty_map");
    Reflect.ownKeys({}).map(() => "local_dead_reflect_own_keys_empty_map");
    [].flatMap(() => ["local_dead_empty_array_flat_map"]);
    [].filter(() => "local_dead_empty_array_filter".length > 0);
    [].forEach(() => "local_dead_empty_array_for_each");
    Array.from("").forEach(() => "local_dead_array_from_empty_for_each");
    [].some(() => "local_dead_empty_array_some".length > 0);
    Array.of<string>().some(() => "local_dead_array_of_empty_some".length > 0);
    [].every(() => "local_dead_empty_array_every".length > 0);
    [].find(() => "local_dead_empty_array_find".length > 0);
    [].findIndex(() => "local_dead_empty_array_find_index".length > 0);
    [].findLast(() => "local_dead_empty_array_find_last".length > 0);
    [].findLastIndex(() => "local_dead_empty_array_find_last_index".length > 0);
    [].reduce((acc: number) => acc + "local_dead_empty_array_reduce".length, 0);
    Array.from([] as number[]).reduce((acc: number) => acc + "local_dead_array_from_empty_reduce".length, 0);
    [].reduceRight((acc: number) => acc + "local_dead_empty_array_reduce_right".length, 0);
    ["local_dead_array_to_sorted"].toSorted();
    [1].toSorted((a, b) => "local_dead_array_to_sorted_comparator".length + a - b);
    Array.of("local_dead_array_of_to_sorted_comparator").toSorted((a, b) => "local_dead_array_of_to_sorted_comparator".length + a.localeCompare(b));
    Array.from("x").toSorted((a, b) => "local_dead_array_from_string_to_sorted_comparator".length + a.localeCompare(b));
    Array.from(new Set(["local_dead_array_from_set_to_sorted_comparator"])).toSorted((a, b) => "local_dead_array_from_set_to_sorted_comparator".length + a.localeCompare(b));
    Array.from(new Map([["local_dead_array_from_map_to_sorted_comparator_key", "local_dead_array_from_map_to_sorted_comparator_value"]])).toSorted((a, b) => "local_dead_array_from_map_to_sorted_comparator".length + a[0].localeCompare(b[0]));
    Object.keys(["local_dead_object_keys_array_to_sorted_comparator"]).toSorted((a, b) => "local_dead_object_keys_array_to_sorted_comparator".length + a.localeCompare(b));
    ["local_dead_array_to_spliced"].toSpliced(0, 0, "local_dead_array_to_spliced_insert");
    ["local_dead_array_with", "local_dead_array_with_tail"].with(0, "local_dead_array_with_replacement");
    Array.of("local_dead_array_of_with").with(0, "local_dead_array_of_with_replacement");
    Array.from(["local_dead_array_from_with"]).with(-1, "local_dead_array_from_with_replacement");
    Array.from(new Set(["local_dead_array_from_set_with"])).with(0, "local_dead_array_from_set_with_replacement");
    Array.of("local_dead_array_of_with_length").with(0, "local_dead_array_of_with_length_replacement").length;
    Array.of("local_dead_array_of_with_absent_element").with(0, "local_dead_array_of_with_absent_element_replacement")[1];
    Array.from(new Set(["local_dead_array_from_set_multi_with", "local_dead_array_from_set_multi_with_tail"])).with(1, "local_dead_array_from_set_multi_with_replacement");
    Array.from(new Set<object>([{ label: "local_dead_array_from_object_set_multi_with" }, { label: "local_dead_array_from_object_set_multi_with_tail" }])).with(1, { label: "local_dead_array_from_object_set_multi_with_replacement" });
    const local_dead_array_from_const_object_set_multi_with_value = { label: "local_dead_array_from_const_object_set_multi_with_value" };
    Array.from(new Set<object>([local_dead_array_from_const_object_set_multi_with_value, local_dead_array_from_const_object_set_multi_with_value, { label: "local_dead_array_from_const_object_set_multi_with_tail" }])).with(1, { label: "local_dead_array_from_const_object_set_multi_with_replacement" });
    Array.from(new Set([1, 1, 2])).with(1, "local_dead_array_from_numeric_set_multi_with_replacement".length);
    Array.from(new Set([NaN, NaN])).with(0, "local_dead_array_from_nan_set_with_replacement".length);
    Array.from(new Set([Infinity, Infinity])).with(0, "local_dead_array_from_infinity_set_with_replacement".length);
    Array.from(new Set([-0, 0])).with(0, "local_dead_array_from_signed_zero_set_with_replacement".length);
    Array.from(new Set([true, true, false])).with(1, "local_dead_array_from_boolean_set_multi_with_replacement".length > 0);
    Array.from(new Set(Array.of("local_dead_array_from_array_of_string_set_multi_with", "local_dead_array_from_array_of_string_set_multi_with", "local_dead_array_from_array_of_string_set_multi_with_tail"))).with(1, "local_dead_array_from_array_of_string_set_multi_with_replacement");
    Array.from(new Set(Array.of(1, 1, 2))).with(1, "local_dead_array_from_array_of_numeric_set_multi_with_replacement".length);
    Array.from(new Set(Array.of(true, true, false))).with(1, "local_dead_array_from_array_of_boolean_set_multi_with_replacement".length > 0);
    Array.from(new Set(Array.from(["local_dead_array_from_array_from_string_set_multi_with", "local_dead_array_from_array_from_string_set_multi_with", "local_dead_array_from_array_from_string_set_multi_with_tail"]))).with(1, "local_dead_array_from_array_from_string_set_multi_with_replacement");
    Array.from(new Set(Array.from([1, 1, 2]))).with(1, "local_dead_array_from_array_from_numeric_set_multi_with_replacement".length);
    Array.from(new Set(Array.from([true, true, false]))).with(1, "local_dead_array_from_array_from_boolean_set_multi_with_replacement".length > 0);
    const local_dead_array_from_array_from_const_string_set_source = ["local_dead_array_from_array_from_const_string_set_multi_with", "local_dead_array_from_array_from_const_string_set_multi_with", "local_dead_array_from_array_from_const_string_set_multi_with_tail"];
    const local_dead_array_from_array_from_const_numeric_set_source = [1, 1, 2];
    const local_dead_array_from_array_from_const_boolean_set_source = [true, true, false];
    Array.from(new Set(Array.from(local_dead_array_from_array_from_const_string_set_source))).with(1, "local_dead_array_from_array_from_const_string_set_multi_with_replacement");
    Array.from(new Set(Array.from(local_dead_array_from_array_from_const_numeric_set_source))).with(1, "local_dead_array_from_array_from_const_numeric_set_multi_with_replacement".length);
    Array.from(new Set(Array.from(local_dead_array_from_array_from_const_boolean_set_source))).with(1, "local_dead_array_from_array_from_const_boolean_set_multi_with_replacement".length > 0);
    const local_dead_array_from_spread_string_set_source = ["local_dead_array_from_spread_string_set_multi_with", "local_dead_array_from_spread_string_set_multi_with_tail"];
    const local_dead_array_from_spread_numeric_set_source = [1, 2];
    const local_dead_array_from_spread_boolean_set_source = [true, false];
    Array.from(new Set(["local_dead_array_from_spread_string_set_multi_with", ...local_dead_array_from_spread_string_set_source])).with(1, "local_dead_array_from_spread_string_set_multi_with_replacement");
    Array.from(new Set([1, ...local_dead_array_from_spread_numeric_set_source])).with(1, "local_dead_array_from_spread_numeric_set_multi_with_replacement".length);
    Array.from(new Set([true, ...local_dead_array_from_spread_boolean_set_source])).with(1, "local_dead_array_from_spread_boolean_set_multi_with_replacement".length > 0);
    Array.from(new Set(Object.keys({ local_dead_array_from_object_keys_set_multi_with: 1, local_dead_array_from_object_keys_set_multi_with_tail: 2 }))).with(1, "local_dead_array_from_object_keys_set_multi_with_replacement");
    Array.from(new Set(Object.getOwnPropertyNames({ local_dead_array_from_object_property_names_set_multi_with: 1, local_dead_array_from_object_property_names_set_multi_with_tail: 2 }))).with(1, "local_dead_array_from_object_property_names_set_multi_with_replacement");
    Array.from(new Set(Reflect.ownKeys({ local_dead_array_from_reflect_own_keys_set_multi_with: 1, local_dead_array_from_reflect_own_keys_set_multi_with_tail: 2 }))).with(1, "local_dead_array_from_reflect_own_keys_set_multi_with_replacement");
    Array.from(new Set(Object.values({ local_dead_array_from_object_values_set_multi_with_a: "local_dead_array_from_object_values_set_multi_with", local_dead_array_from_object_values_set_multi_with_b: "local_dead_array_from_object_values_set_multi_with", local_dead_array_from_object_values_set_multi_with_tail: "local_dead_array_from_object_values_set_multi_with_tail" }))).with(1, "local_dead_array_from_object_values_set_multi_with_replacement");
    Array.from(new Set(Object.values({ local_dead_array_from_object_values_numeric_set_multi_with_a: 1, local_dead_array_from_object_values_numeric_set_multi_with_b: 1, local_dead_array_from_object_values_numeric_set_multi_with_tail: 2 }))).with(1, "local_dead_array_from_object_values_numeric_set_multi_with_replacement".length);
    Array.from(new Set(Object.values({ local_dead_array_from_object_values_boolean_set_multi_with_a: true, local_dead_array_from_object_values_boolean_set_multi_with_b: true, local_dead_array_from_object_values_boolean_set_multi_with_tail: false }))).with(1, "local_dead_array_from_object_values_boolean_set_multi_with_replacement".length > 0);
    Array.from(new Set<object>(Object.values({ local_dead_array_from_object_values_object_set_multi_with_a: { value: 1 }, local_dead_array_from_object_values_object_set_multi_with_tail: { value: 2 } }))).with(1, { value: "local_dead_array_from_object_values_object_set_multi_with_replacement" });
    const local_dead_array_from_object_values_array_const_object_set_multi_with_value = { value: "local_dead_array_from_object_values_array_const_object_set_multi_with_value" };
    Array.from(new Set<object>(Object.values([local_dead_array_from_object_values_array_const_object_set_multi_with_value, local_dead_array_from_object_values_array_const_object_set_multi_with_value, { value: "local_dead_array_from_object_values_array_const_object_set_multi_with_tail" }]))).with(1, { value: "local_dead_array_from_object_values_array_const_object_set_multi_with_replacement" });
    Array.from(new Set(Object.values(Object.fromEntries<{ local_dead_array_from_from_entries_values_set_multi_with_a: string; local_dead_array_from_from_entries_values_set_multi_with_b: string; local_dead_array_from_from_entries_values_set_multi_with_tail: string }>([["local_dead_array_from_from_entries_values_set_multi_with_a", "local_dead_array_from_from_entries_values_set_multi_with"], ["local_dead_array_from_from_entries_values_set_multi_with_b", "local_dead_array_from_from_entries_values_set_multi_with"], ["local_dead_array_from_from_entries_values_set_multi_with_tail", "local_dead_array_from_from_entries_values_set_multi_with_tail"]])))).with(1, "local_dead_array_from_from_entries_values_set_multi_with_replacement");
    Array.from(new Set(Object.values(Object.fromEntries<{ local_dead_array_from_from_entries_values_numeric_set_multi_with_a: number; local_dead_array_from_from_entries_values_numeric_set_multi_with_b: number; local_dead_array_from_from_entries_values_numeric_set_multi_with_tail: number }>([["local_dead_array_from_from_entries_values_numeric_set_multi_with_a", 1], ["local_dead_array_from_from_entries_values_numeric_set_multi_with_b", 1], ["local_dead_array_from_from_entries_values_numeric_set_multi_with_tail", 2]])))).with(1, "local_dead_array_from_from_entries_values_numeric_set_multi_with_replacement".length);
    Array.from(new Set(Object.values(Object.fromEntries<{ local_dead_array_from_from_entries_values_boolean_set_multi_with_a: boolean; local_dead_array_from_from_entries_values_boolean_set_multi_with_b: boolean; local_dead_array_from_from_entries_values_boolean_set_multi_with_tail: boolean }>([["local_dead_array_from_from_entries_values_boolean_set_multi_with_a", true], ["local_dead_array_from_from_entries_values_boolean_set_multi_with_b", true], ["local_dead_array_from_from_entries_values_boolean_set_multi_with_tail", false]])))).with(1, "local_dead_array_from_from_entries_values_boolean_set_multi_with_replacement".length > 0);
    Array.from(new Set<object>(Object.values(Object.fromEntries<{ local_dead_array_from_from_entries_values_object_set_multi_with_a: object; local_dead_array_from_from_entries_values_object_set_multi_with_tail: object }>([["local_dead_array_from_from_entries_values_object_set_multi_with_a", { value: 1 }], ["local_dead_array_from_from_entries_values_object_set_multi_with_tail", { value: 2 }]])))).with(1, { value: "local_dead_array_from_from_entries_values_object_set_multi_with_replacement" });
    Array.from(new Set(Object.values(Object.assign({} as { local_dead_array_from_assign_values_set_multi_with_a: string; local_dead_array_from_assign_values_set_multi_with_b: string; local_dead_array_from_assign_values_set_multi_with_tail: string }, { local_dead_array_from_assign_values_set_multi_with_a: "local_dead_array_from_assign_values_set_multi_with", local_dead_array_from_assign_values_set_multi_with_b: "local_dead_array_from_assign_values_set_multi_with" }, { local_dead_array_from_assign_values_set_multi_with_tail: "local_dead_array_from_assign_values_set_multi_with_tail" })))).with(1, "local_dead_array_from_assign_values_set_multi_with_replacement");
    Array.from(new Set(Object.values(Object.assign({} as { local_dead_array_from_assign_values_numeric_set_multi_with_a: number; local_dead_array_from_assign_values_numeric_set_multi_with_b: number; local_dead_array_from_assign_values_numeric_set_multi_with_tail: number }, { local_dead_array_from_assign_values_numeric_set_multi_with_a: 1, local_dead_array_from_assign_values_numeric_set_multi_with_b: 1 }, { local_dead_array_from_assign_values_numeric_set_multi_with_tail: 2 })))).with(1, "local_dead_array_from_assign_values_numeric_set_multi_with_replacement".length);
    Array.from(new Set(Object.values(Object.assign({} as { local_dead_array_from_assign_values_boolean_set_multi_with_a: boolean; local_dead_array_from_assign_values_boolean_set_multi_with_b: boolean; local_dead_array_from_assign_values_boolean_set_multi_with_tail: boolean }, { local_dead_array_from_assign_values_boolean_set_multi_with_a: true, local_dead_array_from_assign_values_boolean_set_multi_with_b: true }, { local_dead_array_from_assign_values_boolean_set_multi_with_tail: false })))).with(1, "local_dead_array_from_assign_values_boolean_set_multi_with_replacement".length > 0);
    Array.from(new Set<object>(Object.values(Object.assign({} as { local_dead_array_from_assign_values_object_set_multi_with_a: object; local_dead_array_from_assign_values_object_set_multi_with_tail: object }, { local_dead_array_from_assign_values_object_set_multi_with_a: { value: 1 } }, { local_dead_array_from_assign_values_object_set_multi_with_tail: { value: 2 } })))).with(1, { value: "local_dead_array_from_assign_values_object_set_multi_with_replacement" });
    Array.from(new Set(Object.entries({ local_dead_array_from_object_entries_set_multi_with: "local_dead_array_from_object_entries_set_multi_with_value", local_dead_array_from_object_entries_set_multi_with_tail: "local_dead_array_from_object_entries_set_multi_with_tail_value" }))).with(1, ["local_dead_array_from_object_entries_set_multi_with_replacement", "local_dead_array_from_object_entries_set_multi_with_replacement_value"]);
    Array.from(new Set(Array.of("local_dead_array_from_flat_set_multi_with", "local_dead_array_from_flat_set_multi_with_tail").flat(0))).with(1, "local_dead_array_from_flat_set_multi_with_replacement");
    Array.from(new Set(Array.of("local_dead_array_from_with_source_set_multi_with", "local_dead_array_from_with_source_set_multi_with_old").with(-1, "local_dead_array_from_with_source_set_multi_with_tail"))).with(1, "local_dead_array_from_with_source_set_multi_with_replacement");
    Array.from(new Set(Array.of("local_dead_array_from_to_spliced_set_multi_with", "local_dead_array_from_to_spliced_set_multi_with_old").toSpliced(1, 1, "local_dead_array_from_to_spliced_set_multi_with_tail"))).with(1, "local_dead_array_from_to_spliced_set_multi_with_replacement");
    Array.from(new Set(Array.of("local_dead_array_from_fill_set_multi_with", "local_dead_array_from_fill_set_multi_with_old").fill("local_dead_array_from_fill_set_multi_with_tail", 1, 2))).with(1, "local_dead_array_from_fill_set_multi_with_replacement");
    Array.from(new Set(Array.of("local_dead_array_from_copy_within_set_multi_with", "local_dead_array_from_copy_within_set_multi_with_old", "local_dead_array_from_copy_within_set_multi_with_tail").copyWithin(1, 2, 3))).with(1, "local_dead_array_from_copy_within_set_multi_with_replacement");
    Array.from(new Map([["local_dead_array_from_map_with", "local_dead_array_from_map_with_value"]])).with(0, ["local_dead_array_from_map_with_replacement", "local_dead_array_from_map_with_replacement_value"]);
    Array.from(new Map([["local_dead_array_from_map_multi_with", "local_dead_array_from_map_multi_with_value"], ["local_dead_array_from_map_multi_with_tail", "local_dead_array_from_map_multi_with_tail_value"]])).with(1, ["local_dead_array_from_map_multi_with_replacement", "local_dead_array_from_map_multi_with_replacement_value"]);
    Array.from(new Map<number, string>([[1, "local_dead_array_from_numeric_map_multi_with"] as ObjectEntry<string, number>, [1, "local_dead_array_from_numeric_map_multi_with_overwrite"] as ObjectEntry<string, number>, [2, "local_dead_array_from_numeric_map_multi_with_tail"] as ObjectEntry<string, number>])).with(1, [2, "local_dead_array_from_numeric_map_multi_with_replacement"] as ObjectEntry<string, number>);
    Array.from(new Map<boolean, string>([[true, "local_dead_array_from_boolean_map_multi_with"] as ObjectEntry<string, boolean>, [true, "local_dead_array_from_boolean_map_multi_with_overwrite"] as ObjectEntry<string, boolean>, [false, "local_dead_array_from_boolean_map_multi_with_tail"] as ObjectEntry<string, boolean>])).with(1, [false, "local_dead_array_from_boolean_map_multi_with_replacement"] as ObjectEntry<string, boolean>);
    Array.from(new Map<object, string>([[{ id: 1 }, "local_dead_array_from_object_map_multi_with"] as ObjectEntry<string, object>, [{ id: 2 }, "local_dead_array_from_object_map_multi_with_tail"] as ObjectEntry<string, object>])).with(1, [{ id: 3 }, "local_dead_array_from_object_map_multi_with_replacement"] as ObjectEntry<string, object>);
    const local_dead_array_from_const_object_map_multi_with_key = { id: "local_dead_array_from_const_object_map_multi_with_key" };
    Array.from(new Map<object, string>([[local_dead_array_from_const_object_map_multi_with_key, "local_dead_array_from_const_object_map_multi_with"] as ObjectEntry<string, object>, [local_dead_array_from_const_object_map_multi_with_key, "local_dead_array_from_const_object_map_multi_with_overwrite"] as ObjectEntry<string, object>, [{ id: 2 }, "local_dead_array_from_const_object_map_multi_with_tail"] as ObjectEntry<string, object>])).with(1, [{ id: 3 }, "local_dead_array_from_const_object_map_multi_with_replacement"] as ObjectEntry<string, object>);
    Array.from(new Map(Object.entries({ local_dead_array_from_object_entries_map_multi_with: "local_dead_array_from_object_entries_map_multi_with_value", local_dead_array_from_object_entries_map_multi_with_tail: "local_dead_array_from_object_entries_map_multi_with_tail_value" }))).with(1, ["local_dead_array_from_object_entries_map_multi_with_replacement", "local_dead_array_from_object_entries_map_multi_with_replacement_value"]);
    Array.from(new Map(Array.of(["local_dead_array_from_array_of_map_multi_with", "local_dead_array_from_array_of_map_multi_with_value"] as ObjectEntry<string>, ["local_dead_array_from_array_of_map_multi_with", "local_dead_array_from_array_of_map_multi_with_overwrite"] as ObjectEntry<string>, ["local_dead_array_from_array_of_map_multi_with_tail", "local_dead_array_from_array_of_map_multi_with_tail_value"] as ObjectEntry<string>))).with(1, ["local_dead_array_from_array_of_map_multi_with_replacement", "local_dead_array_from_array_of_map_multi_with_replacement_value"]);
    const local_dead_array_from_array_of_const_entry_map_entry_a = ["local_dead_array_from_array_of_const_entry_map_multi_with", "local_dead_array_from_array_of_const_entry_map_multi_with_value"] as ObjectEntry<string>;
    const local_dead_array_from_array_of_const_entry_map_entry_b = ["local_dead_array_from_array_of_const_entry_map_multi_with", "local_dead_array_from_array_of_const_entry_map_multi_with_overwrite"] as ObjectEntry<string>;
    const local_dead_array_from_array_of_const_entry_map_entry_c = ["local_dead_array_from_array_of_const_entry_map_multi_with_tail", "local_dead_array_from_array_of_const_entry_map_multi_with_tail_value"] as ObjectEntry<string>;
    Array.from(new Map(Array.of(local_dead_array_from_array_of_const_entry_map_entry_a, local_dead_array_from_array_of_const_entry_map_entry_b, local_dead_array_from_array_of_const_entry_map_entry_c))).with(1, ["local_dead_array_from_array_of_const_entry_map_multi_with_replacement", "local_dead_array_from_array_of_const_entry_map_multi_with_replacement_value"]);
    const local_dead_array_from_array_from_map_source: ObjectEntry<string>[] = [["local_dead_array_from_array_from_map_multi_with", "local_dead_array_from_array_from_map_multi_with_value"], ["local_dead_array_from_array_from_map_multi_with", "local_dead_array_from_array_from_map_multi_with_overwrite"], ["local_dead_array_from_array_from_map_multi_with_tail", "local_dead_array_from_array_from_map_multi_with_tail_value"]];
    Array.from(new Map(Array.from(local_dead_array_from_array_from_map_source))).with(1, ["local_dead_array_from_array_from_map_multi_with_replacement", "local_dead_array_from_array_from_map_multi_with_replacement_value"]);
    const local_dead_array_from_spread_map_source: ObjectEntry<string>[] = [["local_dead_array_from_spread_map_multi_with", "local_dead_array_from_spread_map_multi_with_overwrite"], ["local_dead_array_from_spread_map_multi_with_tail", "local_dead_array_from_spread_map_multi_with_tail_value"]];
    Array.from(new Map([["local_dead_array_from_spread_map_multi_with", "local_dead_array_from_spread_map_multi_with_value"] as ObjectEntry<string>, ...local_dead_array_from_spread_map_source])).with(1, ["local_dead_array_from_spread_map_multi_with_replacement", "local_dead_array_from_spread_map_multi_with_replacement_value"]);
    Array.from(new Map(Array.of(["local_dead_array_from_flat_map_multi_with", "local_dead_array_from_flat_map_multi_with_value"] as ObjectEntry<string>, ["local_dead_array_from_flat_map_multi_with_tail", "local_dead_array_from_flat_map_multi_with_tail_value"] as ObjectEntry<string>).flat(0))).with(1, ["local_dead_array_from_flat_map_multi_with_replacement", "local_dead_array_from_flat_map_multi_with_replacement_value"]);
    Array.from(new Map(Array.of(["local_dead_array_from_with_source_map_multi_with", "local_dead_array_from_with_source_map_multi_with_value"] as ObjectEntry<string>, ["local_dead_array_from_with_source_map_multi_with_old", "local_dead_array_from_with_source_map_multi_with_old_value"] as ObjectEntry<string>).with(1, ["local_dead_array_from_with_source_map_multi_with_tail", "local_dead_array_from_with_source_map_multi_with_tail_value"] as ObjectEntry<string>))).with(1, ["local_dead_array_from_with_source_map_multi_with_replacement", "local_dead_array_from_with_source_map_multi_with_replacement_value"]);
    Array.from(new Map(Array.of(["local_dead_array_from_to_spliced_map_multi_with", "local_dead_array_from_to_spliced_map_multi_with_value"] as ObjectEntry<string>, ["local_dead_array_from_to_spliced_map_multi_with_old", "local_dead_array_from_to_spliced_map_multi_with_old_value"] as ObjectEntry<string>).toSpliced(1, 1, ["local_dead_array_from_to_spliced_map_multi_with_tail", "local_dead_array_from_to_spliced_map_multi_with_tail_value"] as ObjectEntry<string>))).with(1, ["local_dead_array_from_to_spliced_map_multi_with_replacement", "local_dead_array_from_to_spliced_map_multi_with_replacement_value"]);
    Array.from(new Map(Array.of(["local_dead_array_from_fill_map_multi_with", "local_dead_array_from_fill_map_multi_with_value"] as ObjectEntry<string>, ["local_dead_array_from_fill_map_multi_with_old", "local_dead_array_from_fill_map_multi_with_old_value"] as ObjectEntry<string>).fill(["local_dead_array_from_fill_map_multi_with_tail", "local_dead_array_from_fill_map_multi_with_tail_value"] as ObjectEntry<string>, 1, 2))).with(1, ["local_dead_array_from_fill_map_multi_with_replacement", "local_dead_array_from_fill_map_multi_with_replacement_value"]);
    Array.from(new Map(Array.of(["local_dead_array_from_copy_within_map_multi_with", "local_dead_array_from_copy_within_map_multi_with_value"] as ObjectEntry<string>, ["local_dead_array_from_copy_within_map_multi_with_old", "local_dead_array_from_copy_within_map_multi_with_old_value"] as ObjectEntry<string>, ["local_dead_array_from_copy_within_map_multi_with_tail", "local_dead_array_from_copy_within_map_multi_with_tail_value"] as ObjectEntry<string>).copyWithin(1, 2, 3))).with(1, ["local_dead_array_from_copy_within_map_multi_with_replacement", "local_dead_array_from_copy_within_map_multi_with_replacement_value"]);
    Object.keys({ local_dead_object_keys_with: 1 }).with(0, "local_dead_object_keys_with_replacement");
    Object.keys({ ...{ local_dead_object_keys_spread_with: 1 }, local_dead_object_keys_spread_with_tail: 2 }).with(1, "local_dead_object_keys_spread_with_replacement");
    Object.keys(["local_dead_object_keys_array_with"]).with(0, "local_dead_object_keys_array_with_replacement");
    Object.keys(Object.fromEntries<{ local_dead_object_keys_from_entries_with: number; local_dead_object_keys_from_entries_tail: number }>([["local_dead_object_keys_from_entries_with", 1], ["local_dead_object_keys_from_entries_tail", 2]])).with(1, "local_dead_object_keys_from_entries_replacement");
    Object.keys(Object.create(null, { local_dead_object_keys_create_descriptor_with: { value: 1, enumerable: true }, local_dead_object_keys_create_descriptor_tail: { value: 2, enumerable: true } })).with(1, "local_dead_object_keys_create_descriptor_replacement");
    Object.keys(Object.freeze({ local_dead_object_keys_freeze_with: 1, local_dead_object_keys_freeze_tail: 2 })).with(1, "local_dead_object_keys_freeze_replacement");
    Object.getOwnPropertyNames({ local_dead_object_property_names_with: 1 }).with(0, "local_dead_object_property_names_with_replacement");
    Object.getOwnPropertyNames(Object.assign({} as { local_dead_object_property_names_assign_with: number; local_dead_object_property_names_assign_tail: number }, { local_dead_object_property_names_assign_with: 1 }, { local_dead_object_property_names_assign_tail: 2 })).with(1, "local_dead_object_property_names_assign_replacement");
    Object.getOwnPropertyNames(Object.defineProperty({} as { local_dead_object_property_names_define_property_with: number }, "local_dead_object_property_names_define_property_with", { value: 1 })).with(0, "local_dead_object_property_names_define_property_replacement");
    Object.getOwnPropertyNames(Object.seal({ local_dead_object_property_names_seal_with: 1, local_dead_object_property_names_seal_tail: 2 })).with(1, "local_dead_object_property_names_seal_replacement");
    Object.values({ local_dead_object_values_with: "local_dead_object_values_with" }).with(0, "local_dead_object_values_with_replacement");
    Object.values(Object.fromEntries<{ local_dead_object_values_from_entries_with: string; local_dead_object_values_from_entries_tail: string }>([["local_dead_object_values_from_entries_with", "local_dead_object_values_from_entries_with"], ["local_dead_object_values_from_entries_tail", "local_dead_object_values_from_entries_tail"]])).with(1, "local_dead_object_values_from_entries_replacement");
    Object.values(Object.defineProperties({} as { local_dead_object_values_define_properties_with: string; local_dead_object_values_define_properties_tail: string }, { local_dead_object_values_define_properties_with: { value: "local_dead_object_values_define_properties_with", enumerable: true }, local_dead_object_values_define_properties_tail: { value: "local_dead_object_values_define_properties_tail", enumerable: true } })).with(1, "local_dead_object_values_define_properties_replacement");
    Object.values(Object.preventExtensions({ local_dead_object_values_prevent_extensions_with: "local_dead_object_values_prevent_extensions_with", local_dead_object_values_prevent_extensions_tail: "local_dead_object_values_prevent_extensions_tail" })).with(1, "local_dead_object_values_prevent_extensions_replacement");
    Object.entries({ local_dead_object_entries_with: "local_dead_object_entries_with" }).with(0, ["local_dead_object_entries_with_key", "local_dead_object_entries_with_value"]);
    Object.entries(Object.assign({} as { local_dead_object_entries_assign_with: string; local_dead_object_entries_assign_tail: string }, { local_dead_object_entries_assign_with: "local_dead_object_entries_assign_with" }, { local_dead_object_entries_assign_tail: "local_dead_object_entries_assign_tail" })).with(1, ["local_dead_object_entries_assign_key", "local_dead_object_entries_assign_value"]);
    Object.entries(Object.create(null, { local_dead_object_entries_create_descriptor_with: { value: "local_dead_object_entries_create_descriptor_with", enumerable: true }, local_dead_object_entries_create_descriptor_tail: { value: "local_dead_object_entries_create_descriptor_tail", enumerable: true } })).with(1, ["local_dead_object_entries_create_descriptor_key", "local_dead_object_entries_create_descriptor_value"]);
    Object.entries(Object.setPrototypeOf({ local_dead_object_entries_set_prototype_with: "local_dead_object_entries_set_prototype_with", local_dead_object_entries_set_prototype_tail: "local_dead_object_entries_set_prototype_tail" }, null)).with(1, ["local_dead_object_entries_set_prototype_key", "local_dead_object_entries_set_prototype_value"]);
    Reflect.ownKeys({ local_dead_reflect_own_keys_with: 1 }).with(0, "local_dead_reflect_own_keys_with_replacement");
    Reflect.ownKeys(Object.assign({} as { local_dead_reflect_own_keys_assign_with: number; local_dead_reflect_own_keys_assign_tail: number }, { local_dead_reflect_own_keys_assign_with: 1 }, { local_dead_reflect_own_keys_assign_tail: 2 })).with(1, "local_dead_reflect_own_keys_assign_replacement");
    Reflect.ownKeys(Object.defineProperties({} as { local_dead_reflect_own_keys_define_properties_with: number; local_dead_reflect_own_keys_define_properties_tail: number }, { local_dead_reflect_own_keys_define_properties_with: { value: 1 }, local_dead_reflect_own_keys_define_properties_tail: { value: 2 } })).with(1, "local_dead_reflect_own_keys_define_properties_replacement");
    Reflect.ownKeys(Object.freeze({ local_dead_reflect_own_keys_freeze_with: 1, local_dead_reflect_own_keys_freeze_tail: 2 })).with(1, "local_dead_reflect_own_keys_freeze_replacement");
    ["local_dead_array_to_string", "local_dead_array_to_string_tail"].toString();
    ["local_dead_array_to_locale_string", "local_dead_array_to_locale_string_tail"].toLocaleString();
    ["local_dead_array_join_length_read"].join("/").length;
    (["local_dead_array_to_string_upper_call"].toString().toUpperCase(), "local_dead_array_to_string_upper_call_marker".length);
    (["local_dead_array_to_locale_index_read"].toLocaleString()[0], "local_dead_array_to_locale_index_read_marker".length);
    new Error("local_dead_error_constructor");
    new SyntaxError("local_dead_syntax_error_constructor");
    new AggregateError(["local_dead_aggregate_error_item"], "local_dead_aggregate_error_message", { cause: "local_dead_aggregate_error_cause" });
    AggregateError(["local_dead_aggregate_error_call_item"], "local_dead_aggregate_error_call_message");
    new Error("local_dead_error_message_read").message;
    new RangeError("local_dead_error_name_read").name;
    new Error("local_dead_error_cause_read_message", { cause: "local_dead_error_cause_read" }).cause;
    new AggregateError(["local_dead_aggregate_error_errors_read"], "local_dead_aggregate_error_errors_read_message").errors;
    new Error("local_dead_error_message_length_read").message.length;
    (new TypeError("local_dead_error_name_upper_call").name.toUpperCase(), "local_dead_error_name_upper_call_marker".length);
    (new SyntaxError("local_dead_error_message_index_read").message[0], "local_dead_error_message_index_read_marker".length);
    new Error("local_dead_error_to_string_length_read").toString().length;
    (new TypeError("local_dead_error_to_locale_upper_call").toLocaleString().toUpperCase(), "local_dead_error_to_locale_upper_call_marker".length);
    (new AggregateError(["local_dead_aggregate_error_to_string_index_item"], "local_dead_aggregate_error_to_string_index_read").toString()[0], "local_dead_aggregate_error_to_string_index_read_marker".length);
    /local_dead_regexp_source_read/g.source;
    new RegExp("local_dead_regexp_flags_read", "im").flags;
    new RegExp("local_dead_regexp_boolean_read", "s").dotAll;
    /local_dead_regexp_source_length_read/g.source.length;
    (new RegExp("local_dead_regexp_flags_upper_call", "im").flags.toUpperCase(), "local_dead_regexp_flags_upper_call_marker".length);
    (/local_dead_regexp_source_index_read/.source[0], "local_dead_regexp_source_index_read_marker".length);
    /local_dead_regexp_to_string_length_read/.toString().length;
    (new RegExp("local_dead_regexp_to_locale_upper_call", "i").toLocaleString().toUpperCase(), "local_dead_regexp_to_locale_upper_call_marker".length);
    (/local_dead_regexp_to_string_index_read/.toString()[0], "local_dead_regexp_to_string_index_read_marker".length);
    Symbol("local_dead_symbol_description_read").description;
    Symbol("local_dead_symbol_description_length_read").description!.length;
    (Symbol("local_dead_symbol_to_locale_upper_call").toLocaleString().toUpperCase(), "local_dead_symbol_to_locale_upper_call_marker".length);
    (Symbol.asyncIterator.description![0], "local_dead_well_known_symbol_description_index_read_marker".length);
    (321).toString().length + "local_dead_number_to_string_length_read".length;
    ((true).toLocaleString().toUpperCase(), "local_dead_boolean_to_locale_upper_call_marker".length);
    ((321n).toString()[0], "local_dead_bigint_to_string_index_read_marker".length);
    Object.prototype.toString.call({ local_dead_object_prototype_to_string_length_target: 1 }).length + "local_dead_object_prototype_to_string_length_read".length;
    (Object.prototype.toString.call(["local_dead_object_prototype_to_string_upper_target"]).toUpperCase(), "local_dead_object_prototype_to_string_upper_call_marker".length);
    (Object.prototype.toString.call(null)[0], "local_dead_object_prototype_to_string_index_read_marker".length);
    Object.prototype.toLocaleString.call("local_dead_object_prototype_to_locale_length").length + "local_dead_object_prototype_to_locale_length_read".length;
    (Object.prototype.toLocaleString.call(true).toUpperCase(), "local_dead_object_prototype_to_locale_upper_call_marker".length);
    (Object.prototype.toLocaleString.call(789n)[0], "local_dead_object_prototype_to_locale_index_read_marker".length);
    Object.prototype.toString.call({ local_dead_object_prototype_to_string_call: 1 });
    Object.prototype.toLocaleString.call("local_dead_object_prototype_to_locale_call");
    Object.prototype.hasOwnProperty.call({ local_dead_object_prototype_has_own: 1 }, "local_dead_object_prototype_has_own");
    Object.prototype.propertyIsEnumerable.call({ local_dead_object_prototype_property_is_enumerable: 1 }, "local_dead_object_prototype_property_is_enumerable");
    Object.prototype.isPrototypeOf.call({ local_dead_object_prototype_is_prototype_of: 1 }, {});
    Object.prototype.valueOf.call({ local_dead_object_prototype_value_of: 1 });
    (Object.prototype.valueOf.call({ local_dead_object_prototype_value_of_property_read: 1 }) as { local_dead_object_prototype_value_of_property_read: number }).local_dead_object_prototype_value_of_property_read;
    (Object.prototype.valueOf.call(["local_dead_object_prototype_value_of_element_read"]) as string[])[0];
    (Object.prototype.valueOf.call(Object.freeze({ local_dead_object_prototype_value_of_freeze_property_read: 1 })) as { local_dead_object_prototype_value_of_freeze_property_read: number }).local_dead_object_prototype_value_of_freeze_property_read;
    (Object.prototype.valueOf.call(Object.seal(["local_dead_object_prototype_value_of_seal_element_read"])) as string[])[0];
    (Object.prototype.valueOf.call(Object.assign({}, { local_dead_object_prototype_value_of_assign_read: 1 })) as { local_dead_object_prototype_value_of_assign_read: number }).local_dead_object_prototype_value_of_assign_read;
    (Object.prototype.valueOf.call(Object.create(null, { local_dead_object_prototype_value_of_create_read: { value: 1 } })) as { local_dead_object_prototype_value_of_create_read: number }).local_dead_object_prototype_value_of_create_read;
    (Object.prototype.valueOf.call(Object.defineProperty({}, "local_dead_object_prototype_value_of_define_property_read", { value: 1 })) as { local_dead_object_prototype_value_of_define_property_read: number }).local_dead_object_prototype_value_of_define_property_read;
    (Object.prototype.valueOf.call(Object.defineProperties({}, { local_dead_object_prototype_value_of_define_properties_read: { value: 1 } })) as { local_dead_object_prototype_value_of_define_properties_read: number }).local_dead_object_prototype_value_of_define_properties_read;
    (Object.prototype.valueOf.call(Object.fromEntries([["local_dead_object_prototype_value_of_from_entries_read", 1]])) as { local_dead_object_prototype_value_of_from_entries_read: number }).local_dead_object_prototype_value_of_from_entries_read;
    Promise.resolve(Object.prototype.hasOwnProperty.call({ local_dead_promise_resolve_object_prototype_has_own: 1 }, "local_dead_promise_resolve_object_prototype_has_own"));
    Promise.resolve(Object.prototype.propertyIsEnumerable.call({ local_dead_promise_resolve_object_prototype_property_is_enumerable: 1 }, "local_dead_promise_resolve_object_prototype_property_is_enumerable"));
    Promise.resolve(Object.prototype.isPrototypeOf.call({ local_dead_promise_resolve_object_prototype_is_prototype_of: 1 }, {}));
    Promise.resolve((Object.prototype.valueOf.call({ local_dead_promise_resolve_object_prototype_value_of_property_read: 1 }) as { local_dead_promise_resolve_object_prototype_value_of_property_read: number }).local_dead_promise_resolve_object_prototype_value_of_property_read);
    Promise.resolve((Object.prototype.valueOf.call(["local_dead_promise_resolve_object_prototype_value_of_element_read"]) as string[])[0]);
    Promise.resolve((Object.prototype.valueOf.call(Object.freeze({ local_dead_promise_resolve_object_prototype_value_of_freeze_property_read: 1 })) as { local_dead_promise_resolve_object_prototype_value_of_freeze_property_read: number }).local_dead_promise_resolve_object_prototype_value_of_freeze_property_read);
    Promise.resolve((Object.prototype.valueOf.call(Object.seal(["local_dead_promise_resolve_object_prototype_value_of_seal_element_read"])) as string[])[0]);
    Promise.resolve((Object.prototype.valueOf.call(Object.assign({}, { local_dead_promise_resolve_object_prototype_value_of_assign_read: 1 })) as { local_dead_promise_resolve_object_prototype_value_of_assign_read: number }).local_dead_promise_resolve_object_prototype_value_of_assign_read);
    Promise.resolve((Object.prototype.valueOf.call(Object.create(null, { local_dead_promise_resolve_object_prototype_value_of_create_read: { value: 1 } })) as { local_dead_promise_resolve_object_prototype_value_of_create_read: number }).local_dead_promise_resolve_object_prototype_value_of_create_read);
    Promise.resolve((Object.prototype.valueOf.call(Object.defineProperty({}, "local_dead_promise_resolve_object_prototype_value_of_define_property_read", { value: 1 })) as { local_dead_promise_resolve_object_prototype_value_of_define_property_read: number }).local_dead_promise_resolve_object_prototype_value_of_define_property_read);
    Promise.resolve((Object.prototype.valueOf.call(Object.defineProperties({}, { local_dead_promise_resolve_object_prototype_value_of_define_properties_read: { value: 1 } })) as { local_dead_promise_resolve_object_prototype_value_of_define_properties_read: number }).local_dead_promise_resolve_object_prototype_value_of_define_properties_read);
    Promise.resolve((Object.prototype.valueOf.call(Object.fromEntries([["local_dead_promise_resolve_object_prototype_value_of_from_entries_read", 1]])) as { local_dead_promise_resolve_object_prototype_value_of_from_entries_read: number }).local_dead_promise_resolve_object_prototype_value_of_from_entries_read);
    Object.is("local_dead_object_is", "dead");
    Math.min("local_dead_math_call".length, 1);
    String.fromCharCode("local_dead_from_char_code".length);
    String.fromCodePoint(0x43, 0x1f602);
    RegExp.escape("local_dead_regexp_escape");
    String.raw`local_dead_string_raw_tagged_template`;
    String.raw`local_dead_string_raw_length_${"local_dead_string_raw_length_expr".length}`.length;
    (String.raw`local_dead_string_raw_upper_${"local_dead_string_raw_upper_expr"}`.toUpperCase(), "local_dead_string_raw_upper_call_marker".length);
    (String.raw`local_dead_string_raw_index_read`[0], "local_dead_string_raw_index_read_marker".length);
    JSON.stringify({ local_dead_json_stringify_key: "local_dead_json_stringify_value", count: 1 });
    JSON.stringify(["local_dead_json_stringify_length_read", 2]).length;
    (JSON.stringify("local_dead_json_stringify_upper_call").toUpperCase(), "local_dead_json_stringify_upper_call_marker".length);
    (JSON.stringify({ label: "local_dead_json_stringify_index_read" })[0], "local_dead_json_stringify_index_read_marker".length);
    "local_dead_string_method_to_well_formed_length_read".toWellFormed().length;
    (" local_dead_string_method_trim_upper_call ".trim().toUpperCase(), "local_dead_string_method_trim_upper_call_marker".length);
    ("local_dead_string_method_normalize_index_read".normalize()[0], "local_dead_string_method_normalize_index_read_marker".length);
    String.fromCharCode("local_dead_string_from_char_code_length_read".length).length;
    (String.fromCodePoint(0x41, 0x46).toUpperCase(), "local_dead_string_from_code_point_upper_call_marker".length);
    (RegExp.escape("local_dead_regexp_escape_index_read")[0], "local_dead_regexp_escape_index_read_marker".length);
    Object.entries({ local_dead_object_entries: 3 });
    Object.keys(["local_dead_array_keys"]);
    Object.hasOwn({ local_dead_object_has_own: 1 }, "local_dead_object_has_own");
    Object.getOwnPropertyDescriptors({ local_dead_property_descriptors: 1 });
    Object.getOwnPropertyNames(["local_dead_array_property_names"]);
    Object.getPrototypeOf({ local_dead_get_prototype: 1 });
    Object.isExtensible({ local_dead_is_extensible: 1 });
    Object.isSealed(["local_dead_is_sealed"]);
    Object.isFrozen({ local_dead_is_frozen: 1 });
    Object.preventExtensions({ local_dead_prevent_extensions: 1 });
    Object.seal({ local_dead_seal: 1 });
    Object.freeze(["local_dead_freeze"]);
    Object.setPrototypeOf({ local_dead_set_prototype: 1 }, { proto: "local_dead_set_prototype_proto" });
    Object.keys("local_dead_object_primitive_keys");
    Object.values("local_dead_object_primitive_values");
    Object.entries("local_dead_object_primitive_entries");
    Object.getOwnPropertyNames("local_dead_object_primitive_property_names");
    Object.getOwnPropertySymbols({ local_dead_object_symbols: 1 });
    Object.getOwnPropertySymbols(Object.freeze({ local_dead_object_symbols_freeze: 1 })).length;
    Object.getOwnPropertySymbols(Object.setPrototypeOf({ local_dead_object_symbols_set_prototype: 1 }, null))[0];
    Object.getOwnPropertySymbols(Object.assign({}, { local_dead_object_symbols_assign: 1 })).map(() => "local_dead_object_symbols_empty_map_callback");
    Object.getOwnPropertySymbols(Object.freeze({ local_dead_object_symbols_at: 1 })).at(-1);
    Object.getOwnPropertySymbols(Object.freeze({ local_dead_object_symbols_to_locale_string: 1 })).toLocaleString("local_dead_object_symbols_to_locale_ignored");
    Array.from(new Set(Object.getOwnPropertySymbols(Object.freeze({ local_dead_array_from_object_symbols_set_empty_for_each: 1 })))).forEach(() => "local_dead_array_from_object_symbols_set_empty_for_each_callback");
    Object.getOwnPropertySymbols(Object.freeze({ local_dead_object_symbols_find_last: 1 })).findLast(() => "local_dead_object_symbols_find_last_callback".length > 0);
    Object.getOwnPropertySymbols(Object.freeze({ local_dead_object_symbols_find_last_index: 1 })).findLastIndex(() => "local_dead_object_symbols_find_last_index_callback".length > 0);
    Object.getOwnPropertySymbols(Object.freeze({ local_dead_object_symbols_reduce: 1 })).reduce((acc: string) => acc + "local_dead_object_symbols_reduce_callback", "local_dead_object_symbols_reduce_initial");
    Object.getOwnPropertySymbols(Object.freeze({ local_dead_object_symbols_values_length: 1 })).values("local_dead_object_symbols_values_ignored").length;
    Object.getOwnPropertySymbols(Object.freeze({ local_dead_object_symbols_entries_length: 1 })).entries("local_dead_object_symbols_entries_ignored").length;
    Object.getOwnPropertySymbols(Object.freeze({ local_dead_object_symbols_to_reversed_element: 1 })).toReversed()[0];
    Object.getOwnPropertySymbols(Object.freeze({ local_dead_object_symbols_flat_element: 1 })).flat(0)[0];
    Object.getOwnPropertySymbols(Object.freeze({ local_dead_object_symbols_to_spliced_element: 1 })).toSpliced(0)[0];
    Object.getOwnPropertySymbols(Object.freeze({ local_dead_object_symbols_to_spliced_insert_length: 1 })).toSpliced(0, 0, Symbol("local_dead_object_symbols_to_spliced_insert_value")).length;
    Object.getOwnPropertySymbols(Object.freeze({ local_dead_object_symbols_to_spliced_insert_absent: 1 })).toSpliced(0, 0, Symbol("local_dead_object_symbols_to_spliced_insert_absent_value"))[1];
    Object.getOwnPropertySymbols(Object.freeze({ local_dead_object_symbols_reverse_length: 1 })).reverse().length;
    Object.getOwnPropertySymbols(Object.freeze({ local_dead_object_symbols_sort_length: 1 })).sort().length;
    Object.getOwnPropertySymbols(Object.freeze({ local_dead_object_symbols_to_sorted_length: 1 })).toSorted().length;
    Object.getOwnPropertySymbols(Object.freeze({ local_dead_object_symbols_reverse_element: 1 })).reverse()[0];
    Object.getOwnPropertySymbols(Object.freeze({ local_dead_object_symbols_sort_element: 1 })).sort()[0];
    Object.getOwnPropertySymbols(Object.freeze({ local_dead_object_symbols_to_sorted_element: 1 })).toSorted()[0];
    Object.getOwnPropertySymbols(Object.freeze({ local_dead_object_symbols_map_length: 1 })).map(() => "local_dead_object_symbols_map_length_callback").length;
    Object.getOwnPropertySymbols(Object.freeze({ local_dead_object_symbols_filter_length: 1 })).filter(() => "local_dead_object_symbols_filter_length_callback".length > 0).length;
    Object.getOwnPropertySymbols(Object.freeze({ local_dead_object_symbols_flat_map_length: 1 })).flatMap(() => ["local_dead_object_symbols_flat_map_length_callback"]).length;
    Object.getOwnPropertySymbols(Object.freeze({ local_dead_object_symbols_map_element: 1 })).map(() => "local_dead_object_symbols_map_element_callback")[0];
    Object.getOwnPropertySymbols(Object.freeze({ local_dead_object_symbols_filter_element: 1 })).filter(() => "local_dead_object_symbols_filter_element_callback".length > 0)[0];
    Object.getOwnPropertySymbols(Object.freeze({ local_dead_object_symbols_flat_map_element: 1 })).flatMap(() => ["local_dead_object_symbols_flat_map_element_callback"])[0];
    Object.getOwnPropertySymbols(Object.freeze({ local_dead_object_symbols_slice_from_length: 1 })).slice(1).length;
    Object.getOwnPropertySymbols(Object.freeze({ local_dead_object_symbols_slice_range_element: 1 })).slice(1, 2)[0];
    Object.getOwnPropertySymbols(Object.freeze({ local_dead_object_symbols_pop: 1 })).pop();
    Object.getOwnPropertySymbols(Object.freeze({ local_dead_object_symbols_shift: 1 })).shift();
    Object.getOwnPropertySymbols(Object.freeze({ local_dead_object_symbols_push: 1 })).push(Symbol("local_dead_object_symbols_push_value"));
    Object.getOwnPropertySymbols(Object.freeze({ local_dead_object_symbols_unshift: 1 })).unshift(Symbol("local_dead_object_symbols_unshift_value"));
    Object.getOwnPropertyDescriptor("local_dead_object_primitive_descriptor", "0");
    Object.getOwnPropertyDescriptors("local_dead_object_primitive_descriptors");
    Object.hasOwn("local_dead_object_primitive_has_own", "0");
    Object.getPrototypeOf("local_dead_object_primitive_get_prototype");
    Object.isExtensible("local_dead_object_primitive_is_extensible");
    Object.isSealed("local_dead_object_primitive_is_sealed");
    Object.isFrozen("local_dead_object_primitive_is_frozen");
    Object.preventExtensions("local_dead_object_primitive_prevent_extensions");
    Object.seal("local_dead_object_primitive_seal");
    Object.freeze("local_dead_object_primitive_freeze");
    Object.create(null);
    Object.create({ local_dead_create_object: 1 });
    Object.create({ local_dead_create_descriptors_proto: 1 }, { local_dead_create_descriptors_key: { value: "local_dead_create_descriptors_value", writable: true } });
    Object.assign({ local_dead_assign_target: 1 }, { local_dead_assign_source: 2 });
    Object.assign(["local_dead_assign_array_target"], ["local_dead_assign_array_source"]);
    Object.assign({ local_dead_assign_primitive_target: 1 }, "local_dead_assign_primitive_source");
    Object.assign({ local_dead_assign_nullish_target: 1 }, null, undefined, "local_dead_assign_nullish_primitive_source");
    Object.defineProperty({ local_dead_define_property_target: 1 }, "local_dead_define_property_key", { value: "local_dead_define_property_value", enumerable: true });
    Object.defineProperties({ local_dead_define_properties_target: 1 }, { local_dead_define_properties_key: { value: "local_dead_define_properties_value", configurable: true } });
    Object.fromEntries([["local_dead_from_entries_key", "local_dead_from_entries_value"]]);
    Object.fromEntries(Object.entries({ local_dead_from_entries_object_entries_key: "local_dead_from_entries_object_entries_value" }));
    Object.fromEntries(new Map<string, string>());
    Object.groupBy([] as number[], (value) => "local_dead_object_group_by_empty" + value);
    Map.groupBy([] as number[], (value) => "local_dead_map_group_by_empty" + value);
    Object.groupBy(Array.from(unused_group_by_empty_array_source), (value) => "local_dead_object_group_by_empty_array_copy" + value);
    Map.groupBy(Array.from(unused_group_by_empty_array_source), (value) => "local_dead_map_group_by_empty_array_copy" + value);
    Object.groupBy(Array.from(""), (value) => "local_dead_object_group_by_array_from_empty" + value);
    Map.groupBy(Array.of<number>(), (value) => "local_dead_map_group_by_array_of_empty" + value);
    Object.groupBy(new Set<number>(), (value) => "local_dead_object_group_by_empty_set" + value);
    Map.groupBy(new Set<number>(), (value) => "local_dead_map_group_by_empty_set" + value);
    Object.groupBy(new Set(unused_group_by_empty_set_source), (value) => "local_dead_object_group_by_empty_set_copy" + value);
    Map.groupBy(new Set(unused_group_by_empty_set_source), (value) => "local_dead_map_group_by_empty_set_copy" + value);
    Object.groupBy("", (value) => "local_dead_object_group_by_empty_string" + value);
    Map.groupBy("", (value) => "local_dead_map_group_by_empty_string" + value);
    Object.groupBy(unused_group_by_empty_string_source, (value) => "local_dead_object_group_by_empty_string_const" + value);
    Map.groupBy(unused_group_by_empty_string_source, (value) => "local_dead_map_group_by_empty_string_const" + value);
    Object.groupBy(new Map<string, number>(), (entry) => "local_dead_object_group_by_empty_map" + entry[0] + entry[1]);
    Map.groupBy(new Map<string, number>(), (entry) => "local_dead_map_group_by_empty_map" + entry[0] + entry[1]);
    Object.groupBy(new Map(unused_group_by_empty_map_source), (entry) => "local_dead_object_group_by_empty_map_copy" + entry[0] + entry[1]);
    Map.groupBy(new Map(unused_group_by_empty_map_source), (entry) => "local_dead_map_group_by_empty_map_copy" + entry[0] + entry[1]);
    Object.keys(new Set<string>());
    Object.hasOwn(new FinalizationRegistry<string>(() => "local_dead_collection_finregistry"), "local_dead_collection_has_own");
    Reflect.ownKeys(new WeakRef<object>({ label: "local_dead_collection_reflect_weak_ref" }));
    Object.keys(new URL("https://local-dead-url-object-keys.test/path"));
    Reflect.ownKeys(new URL("https://local-dead-url-reflect-own-keys.test/path"));
    Reflect.get({ local_dead_reflect_get: 1 }, "local_dead_reflect_get");
    Reflect.get(["local_dead_reflect_get_array"], "0");
    Reflect.set({ local_dead_reflect_set_target: 1 }, "local_dead_reflect_set_key", "local_dead_reflect_set_value");
    Reflect.set(["local_dead_reflect_set_array_target"], "0", "local_dead_reflect_set_array_value");
    Reflect.getOwnPropertyDescriptor({ local_dead_reflect_descriptor: 1 }, "local_dead_reflect_descriptor");
    Reflect.ownKeys(["local_dead_reflect_array_keys"]);
    Reflect.deleteProperty({ local_dead_reflect_delete_property: 1 }, "local_dead_reflect_delete_property");
    Reflect.defineProperty({ local_dead_reflect_define_property_target: 1 }, "local_dead_reflect_define_property_key", { value: "local_dead_reflect_define_property_value", configurable: true });
    Reflect.getPrototypeOf({ local_dead_reflect_get_prototype: 1 });
    Reflect.isExtensible(["local_dead_reflect_is_extensible"]);
    Reflect.preventExtensions({ local_dead_reflect_prevent_extensions: 1 });
    Reflect.setPrototypeOf({ local_dead_reflect_set_prototype: 1 }, null);
    "local_dead_length".length;
    "local_dead_index"[0];
    ({ label: "local_dead_prop" }).label;
    // @ts-ignore: intentional pure comma expression for generated-C DCE coverage.
    (1, "local_dead_comma");
    const unused_local_static_conditional = false ? console.log("local_dead_static_conditional_call") : "local_dead_static_conditional_value";
    false ? console.log("local_dead_static_conditional_expr_call") : "local_dead_static_conditional_expr_value";
    const unused_local_static_and = false && console.log("local_dead_static_and_call");
    const unused_local_static_or = true || console.log("local_dead_static_or_call");
    false && console.log("local_dead_static_and_expr_call");
    true || console.log("local_dead_static_or_expr_call");
    const local_static_non_nullish = { ok: true };
    const unused_local_static_nullish = local_static_non_nullish ?? console.log("local_dead_static_nullish_call");
    const unused_local_static_nullish_fallback = (undefined as string | undefined) ?? "local_dead_static_nullish_fallback";
    local_static_non_nullish ?? console.log("local_dead_static_nullish_expr_call");
    (undefined as string | undefined) ?? "local_dead_static_nullish_expr_fallback";
    for (; false; console.log("local_dead_for_false_increment")) {
        console.log("local_dead_for_false_body");
    }
    const unused_local_seed = "dead";
    const unused_local_chain = unused_local_seed;
    const kept_local = value + 3;
    return kept_local;
    const unreachable_local = "dead";
    console.log(unreachable_local);
}

function constantBranch(value: number): number {
    const local_static_false = false;
    if (local_static_false) {
        const local_dead_static_if_value = "local_dead_static_if";
        console.log(local_dead_static_if_value);
        return 900;
    }
    if (!local_static_false) {
        return value + 80;
    } else {
        console.log("local_dead_static_else");
        return 901;
    }
    const static_branch_after_exit = 902;
    console.log(static_branch_after_exit);
    return static_branch_after_exit;
}

function branchInnerExit(value: boolean): number {
    if (value) {
        return 85;
        const branch_inner_after_return = 86;
        console.log(branch_inner_after_return);
    } else {
        {
            return 87;
            const nested_branch_inner_after_return = 88;
            console.log(nested_branch_inner_after_return);
        }
    }
}

function elseIfStatic(value: number): number {
    if (value < 0) {
        return 88;
    } else if (false) {
        console.log("else_if_static_dead");
        return 89;
    } else if (true) {
        return 90;
    } else {
        console.log("else_if_static_dead_tail");
        return 91;
    }
}

function literalTruthiness(): number {
    const local_static_empty_string: string = "";
    if (local_static_empty_string) {
        console.log("local_dead_empty_string_if");
        return 92;
    } else if (1 as number) {
        return 93;
    } else {
        console.log("local_dead_truthy_tail");
        return 94;
    }
}

function staticSwitchDce(): number {
    const local_static_switch_key: "a" | "b" = top_level_static_false ? "a" : "b";
    switch (local_static_switch_key) {
        case "a":
            console.log("local_dead_static_switch_a");
            return 95;
        case "b":
            return 96;
        default:
            console.log("local_dead_static_switch_default");
            return 97;
    }
}

function branchExit(value: boolean): number {
    const branch_only_dead = "dead";
    if (value) {
        return 11;
    } else {
        return 12;
    }
    console.log(branch_only_dead);
    const branch_after_exit = 13;
    return branch_after_exit;
}

function nestedBlockExit(): number {
    {
        return 14;
    }
    const nested_after_block = 15;
    return nested_after_block;
}

function tryExit(value: boolean): number {
    try {
        if (value) {
            return 20;
        } else {
            return 21;
        }
    } finally {
    }
    const try_after_exit = 22;
    console.log(try_after_exit);
    return try_after_exit;
}

function tryCatchExit(value: boolean): number {
    try {
        if (value) {
            throw "try_catch_dead";
        }
        return 30;
    } catch (err) {
        return 31;
    }
    const try_catch_after_exit = 32;
    console.log(try_catch_after_exit);
    return try_catch_after_exit;
}

function switchExit(value: "a" | "b"): number {
    switch (value) {
        case "a":
            return 40;
        case "b":
            return 41;
        default:
            return 42;
    }
    const switch_after_exit = 43;
    console.log(switch_after_exit);
    return switch_after_exit;
}

function exhaustiveSwitchExit(value: "x" | "y"): number {
    switch (value) {
        case "x":
            return 44;
        case "y":
            return 45;
    }
    const exhaustive_switch_after_exit = 46;
    console.log(exhaustive_switch_after_exit);
    return exhaustive_switch_after_exit;
}

function fallthroughSwitchExit(value: "p" | "q"): number {
    switch (value) {
        case "p":
        case "q":
            return 47;
    }
    const fallthrough_switch_after_exit = 48;
    console.log(fallthrough_switch_after_exit);
    return fallthrough_switch_after_exit;
}

function whileExit(): number {
    while (true) {
        return 50;
    }
    const while_after_exit = 51;
    console.log(while_after_exit);
    return while_after_exit;
}

function forExit(): number {
    for (;;) {
        return 60;
    }
    const for_after_exit = 61;
    console.log(for_after_exit);
    return for_after_exit;
}

function doExit(value: boolean): number {
    do {
        return 70;
    } while (value);
    const do_after_exit = 71;
    console.log(do_after_exit);
    return do_after_exit;
}

function observedMutatingCollectionSources(): string {
    const setSource = ["kept_mutating_set_source_head", "kept_mutating_set_source_tail"];
    new Set(setSource.reverse());
    const mapSource: ObjectEntry<string>[] = [
        ["kept_mutating_map_source_head", "kept_mutating_map_source_head_value"],
        ["kept_mutating_map_source_tail", "kept_mutating_map_source_tail_value"],
    ];
    new Map(mapSource.reverse());
    return setSource[0] + " " + mapSource[0]![0];
}

function observedMutatingLengthProofs(): string {
    const reverseSource = ["kept_reverse_length_head", "kept_reverse_length_tail"];
    Promise.resolve(reverseSource.reverse().length);
    const sortSource = ["kept_sort_length_tail", "kept_sort_length_head"];
    Promise.resolve(sortSource.sort().length);
    const fillSource = ["kept_fill_length_head", "kept_fill_length_tail"];
    Promise.resolve(fillSource.fill("kept_fill_length_mid", 0, 1).length);
    const copySource = ["kept_copy_length_head", "kept_copy_length_tail"];
    Promise.resolve(copySource.copyWithin(0, 1).length);
    return reverseSource[0] + " " + sortSource[0] + " " + fillSource[0] + " " + copySource[0];
}

console.log(
    usedLocal(used_count),
    constantBranch(used_count),
    branchInnerExit(true),
    elseIfStatic(used_count),
    literalTruthiness(),
    staticSwitchDce(),
    branchExit(true),
    nestedBlockExit(),
    tryExit(false),
    tryCatchExit(false),
    switchExit("a"),
    exhaustiveSwitchExit("y"),
    fallthroughSwitchExit("p"),
    whileExit(),
    forExit(),
    doExit(false),
    observedMutatingCollectionSources(),
    observedMutatingLengthProofs(),
    DceNamespace.kept,
);
