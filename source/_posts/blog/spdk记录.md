---
title: spdk记录
date: 2023-05-30 23:10:34
tags: spdk bdev
categories: 
- [学习记录]
- [zns ssd-femu-nvme-spdk-dpdk]
index_img: https://img-blog.csdnimg.cn/ac3c70cf91cc4937bb10503ca77fc1ce.png
---
<meta name="referrer" content="no-referrer" />



往期文章：
[spdk环境搭建](https://www.jiasun.top/blog/spdk%E7%8E%AF%E5%A2%83%E6%90%AD%E5%BB%BA.html)


# hello_bdev
代码路径：examples/bdev/hello_world/hello_bdev.c
可执行文件路径：build/examples/hello_bdev

刚开始直接执行hello_bdev显示找不到Malloc0
```bash
./build/examples/hello_bdev
[2023-05-30 20:27:02.389489] Starting SPDK v23.05-pre git sha1 ee06693c3 / DPDK 22.11.1 initialization...
[2023-05-30 20:27:02.390910] [ DPDK EAL parameters: hello_bdev --no-shconf -c 0x1 --huge-unlink --log-level=lib.eal:6 --log-level=lib.cryptodev:5 --log-level=user1:6 --iova-mode=pa --base-virtaddr=0x200000000000 --match-allocations --file-prefix=spdk_pid11584 ]
TELEMETRY: No legacy callbacks, legacy socket not created
[2023-05-30 20:27:02.511380] app.c: 738:spdk_app_start: *NOTICE*: Total cores available: 1
[2023-05-30 20:27:02.561201] reactor.c: 937:reactor_run: *NOTICE*: Reactor started on core 0
[2023-05-30 20:27:02.600284] accel_sw.c: 601:sw_accel_module_init: *NOTICE*: Accel framework software module initialized.
[2023-05-30 20:27:02.621229] hello_bdev.c: 222:hello_start: *NOTICE*: Successfully started the application
[2023-05-30 20:27:02.621612] hello_bdev.c: 231:hello_start: *NOTICE*: Opening the bdev Malloc0
[2023-05-30 20:27:02.621691] bdev.c:7681:spdk_bdev_open_ext: *NOTICE*: Currently unable to find bdev with name: Malloc0
[2023-05-30 20:27:02.621761] hello_bdev.c: 235:hello_start: *ERROR*: Could not open bdev: Malloc0
[2023-05-30 20:27:02.621852] app.c: 844:spdk_app_stop: *WARNING*: spdk_app_stop'd on non-zero
[2023-05-30 20:27:02.691191] hello_bdev.c: 308:main: *ERROR*: ERROR starting application
```
在网上找到了相应issue，[https://github.com/spdk/spdk/issues/1550](https://github.com/spdk/spdk/issues/1550)
![](https://img-blog.csdnimg.cn/d61e13f0cbad4bd68da4d18966772076.png)
正确的执行方式为：

```bash
./build/examples/hello_bdev -c ./examples/bdev/hello_world/bdev.json -b Malloc0


[2023-05-30 20:25:59.131197] Starting SPDK v23.05-pre git sha1 ee06693c3 / DPDK 22.11.1 initialization...
[2023-05-30 20:25:59.132037] [ DPDK EAL parameters: hello_bdev --no-shconf -c 0x1 --huge-unlink --log-level=lib.eal:6 --log-level=lib.cryptodev:5 --log-level=user1:6 --iova-mode=pa --base-virtaddr=0x200000000000 --match-allocations --file-prefix=spdk_pid11462 ]
TELEMETRY: No legacy callbacks, legacy socket not created
[2023-05-30 20:25:59.252268] app.c: 738:spdk_app_start: *NOTICE*: Total cores available: 1
[2023-05-30 20:25:59.303646] reactor.c: 937:reactor_run: *NOTICE*: Reactor started on core 0
[2023-05-30 20:25:59.359161] accel_sw.c: 601:sw_accel_module_init: *NOTICE*: Accel framework software module initialized.
[2023-05-30 20:25:59.387635] hello_bdev.c: 222:hello_start: *NOTICE*: Successfully started the application
[2023-05-30 20:25:59.388053] hello_bdev.c: 231:hello_start: *NOTICE*: Opening the bdev Malloc0
[2023-05-30 20:25:59.388153] hello_bdev.c: 244:hello_start: *NOTICE*: Opening io channel
[2023-05-30 20:25:59.388529] hello_bdev.c: 138:hello_write: *NOTICE*: Writing to the bdev
[2023-05-30 20:25:59.388757] hello_bdev.c: 117:write_complete: *NOTICE*: bdev io write completed successfully
[2023-05-30 20:25:59.388931] hello_bdev.c:  84:hello_read: *NOTICE*: Reading io
[2023-05-30 20:25:59.389019] hello_bdev.c:  65:read_complete: *NOTICE*: Read string from bdev : Hello World!

[2023-05-30 20:25:59.389128] hello_bdev.c:  74:read_complete: *NOTICE*: Stopping app
```

## 命令行参数
-b参数
```c
static char *g_bdev_name = "Malloc0";
/*
 * Usage function for printing parameters that are specific to this application
 */
static void
hello_bdev_usage(void)
{
	printf(" -b <bdev>                 name of the bdev to use\n");
}

/*
 * This function is called to parse the parameters that are specific to this application
 */
static int
hello_bdev_parse_arg(int ch, char *arg)
{
	switch (ch) {
	case 'b':
		g_bdev_name = arg;
		break;
	default:
		return -EINVAL;
	}
	return 0;
}
spdk_app_parse_args(argc, argv, &opts, "b:", NULL, hello_bdev_parse_arg, hello_bdev_usage)
hello_context.bdev_name = g_bdev_name;
```
可以看出，g_bdev_name本来就是Malloc0，-b Malloc0没啥用

-c参数

```bash
static void
usage(void (*app_usage)(void))
{
	printf("%s [options]\n", g_executable_name);
	printf("options:\n");
	printf(" -c, --config <config>     JSON config file (default %s)\n",
	       g_default_opts.json_config_file != NULL ? g_default_opts.json_config_file : "none");
```
-c后加json配置文件名，bdev.json文件内容如下：
```bash
{
  "subsystems": [
    {
      "subsystem": "bdev",
      "config": [
        {
          "method": "bdev_malloc_create",
          "params": {
            "name": "Malloc0",
            "num_blocks": 32768,
            "block_size": 512
          }
        }
      ]
    }
  ]
}
```
简要看json的解析过程，全局查询json_config_file，找到spdk_subsystem_init_from_json_config函数

```c
void
spdk_subsystem_init_from_json_config(const char *json_config_file, const char *rpc_addr,
				     spdk_subsystem_init_fn cb_fn, void *cb_arg,
				     bool stop_on_error)
{
	struct load_json_config_ctx *ctx = calloc(1, sizeof(*ctx));
	int rc;

	assert(cb_fn);
	if (!ctx) {
		cb_fn(-ENOMEM, cb_arg);
		return;
	}

	ctx->cb_fn = cb_fn;
	ctx->cb_arg = cb_arg;
	ctx->stop_on_error = stop_on_error;
	ctx->thread = spdk_get_thread();

	rc = app_json_config_read(json_config_file, ctx);
	if (rc) {
		goto fail;
	}

	/* Capture subsystems array */
	rc = spdk_json_find_array(ctx->values, "subsystems", NULL, &ctx->subsystems);
	switch (rc) {
	case 0:
		/* Get first subsystem */
		ctx->subsystems_it = spdk_json_array_first(ctx->subsystems);
		if (ctx->subsystems_it == NULL) {
			SPDK_NOTICELOG("'subsystems' configuration is empty\n");
		}
		break;
	case -EPROTOTYPE:
		SPDK_ERRLOG("Invalid JSON configuration: not enclosed in {}.\n");
		goto fail;
	case -ENOENT:
		SPDK_WARNLOG("No 'subsystems' key JSON configuration file.\n");
		break;
	case -EDOM:
		SPDK_ERRLOG("Invalid JSON configuration: 'subsystems' should be an array.\n");
		goto fail;
	default:
		SPDK_ERRLOG("Failed to parse JSON configuration.\n");
		goto fail;
	}

	/* If rpc_addr is not an Unix socket use default address as prefix. */
	if (rpc_addr == NULL || rpc_addr[0] != '/') {
		rpc_addr = SPDK_DEFAULT_RPC_ADDR;
	}

	/* FIXME: rpc client should use socketpair() instead of this temporary socket nonsense */
	rc = snprintf(ctx->rpc_socket_path_temp, sizeof(ctx->rpc_socket_path_temp), "%s.%d_config",
		      rpc_addr, getpid());
	if (rc >= (int)sizeof(ctx->rpc_socket_path_temp)) {
		SPDK_ERRLOG("Socket name create failed\n");
		goto fail;
	}

	rc = spdk_rpc_initialize(ctx->rpc_socket_path_temp);
	if (rc) {
		goto fail;
	}

	ctx->client_conn = spdk_jsonrpc_client_connect(ctx->rpc_socket_path_temp, AF_UNIX);
	if (ctx->client_conn == NULL) {
		SPDK_ERRLOG("Failed to connect to '%s'\n", ctx->rpc_socket_path_temp);
		goto fail;
	}

	rpc_client_set_timeout(ctx, RPC_CLIENT_CONNECT_TIMEOUT_US);
	ctx->client_conn_poller = SPDK_POLLER_REGISTER(rpc_client_connect_poller, ctx, 100);
	return;

fail:
	app_json_config_load_done(ctx, -EINVAL);
}
```
全局查询bdev_malloc_create，找到rpc_bdev_malloc_create函数

```c
static void
rpc_bdev_malloc_create(struct spdk_jsonrpc_request *request,
		       const struct spdk_json_val *params)
{
	struct malloc_bdev_opts req = {NULL};
	struct spdk_json_write_ctx *w;
	struct spdk_bdev *bdev;
	int rc = 0;

	if (spdk_json_decode_object(params, rpc_construct_malloc_decoders,
				    SPDK_COUNTOF(rpc_construct_malloc_decoders),
				    &req)) {
		SPDK_DEBUGLOG(bdev_malloc, "spdk_json_decode_object failed\n");
		spdk_jsonrpc_send_error_response(request, SPDK_JSONRPC_ERROR_INTERNAL_ERROR,
						 "spdk_json_decode_object failed");
		goto cleanup;
	}

	rc = create_malloc_disk(&bdev, &req);
	if (rc) {
		spdk_jsonrpc_send_error_response(request, rc, spdk_strerror(-rc));
		goto cleanup;
	}

	free_rpc_construct_malloc(&req);

	w = spdk_jsonrpc_begin_result(request);
	spdk_json_write_string(w, spdk_bdev_get_name(bdev));
	spdk_jsonrpc_end_result(request, w);
	return;

cleanup:
	free_rpc_construct_malloc(&req);
}
SPDK_RPC_REGISTER("bdev_malloc_create", rpc_bdev_malloc_create, SPDK_RPC_RUNTIME)  
```
运行到该函数的回溯栈为

```c
(gdb) bt
#0  rpc_bdev_malloc_create (request=0xcac1f474c379e400, params=0x555555cc9570) at bdev_malloc_rpc.c:49
#1  0x00005555556b0a53 in jsonrpc_handler (request=0x555555cc04e0, method=0x555555c648e0, params=0x555555c64900) at rpc.c:124
#2  0x00005555556b2c5e in jsonrpc_server_handle_request (request=0x555555cc04e0, method=0x555555c648e0, params=0x555555c64900) at jsonrpc_server_tcp.c:222
#3  0x00005555556b1665 in parse_single_request (request=0x555555cc04e0, values=0x555555c64880) at jsonrpc_server.c:75
#4  0x00005555556b1c68 in jsonrpc_parse_request (conn=0x7ffff5f7e040, json=0x7ffff5f7e058, size=172) at jsonrpc_server.c:205
#5  0x00005555556b2eaa in jsonrpc_server_conn_recv (conn=0x7ffff5f7e040) at jsonrpc_server_tcp.c:284
#6  0x00005555556b3297 in spdk_jsonrpc_server_poll (server=0x7ffff5f7e010) at jsonrpc_server_tcp.c:402
#7  0x00005555556b0d59 in spdk_rpc_accept () at rpc.c:213
#8  0x00005555556a13c4 in rpc_subsystem_poll (arg=0x0) at rpc.c:21
#9  0x00005555556a82fd in thread_execute_timed_poller (thread=0x555555c9ec00, poller=0x555555cbf2c0, now=41542509569737) at thread.c:970
#10 0x00005555556a8613 in thread_poll (thread=0x555555c9ec00, max_msgs=0, now=41542509569737) at thread.c:1060
#11 0x00005555556a8837 in spdk_thread_poll (thread=0x555555c9ec00, max_msgs=0, now=41542509569737) at thread.c:1119
#12 0x000055555566d309 in _reactor_run (reactor=0x555555c7b780) at reactor.c:914
#13 0x000055555566d3fb in reactor_run (arg=0x555555c7b780) at reactor.c:952
#14 0x000055555566d887 in spdk_reactors_start () at reactor.c:1068
#15 0x0000555555669c5d in spdk_app_start (opts_user=0x7fffffffdea0, start_fn=0x55555556e1fb <hello_start>, arg1=0x7fffffffde40) at app.c:779
#16 0x000055555556e5d9 in main (argc=5, argv=0x7fffffffe078) at hello_bdev.c:306

p req
$19 = {name = 0x555555cc9580 "Malloc0", uuid = {u = {raw = '\000' <repeats 15 times>}}, num_blocks = 32768, block_size = 512, physical_block_size = 0, optimal_io_boundary = 0, md_size = 0, 
  md_interleave = false, dif_type = SPDK_DIF_DISABLE, dif_is_head_of_md = false}
```
猜测rpc_bdev_malloc_create函数与spdk_subsystem_init_from_json_config中的
SPDK_POLLER_REGISTER(rpc_client_connect_poller, ctx, 100);有关。

有兴趣的可以继续研究rpc_bdev_malloc_create函数中的create_malloc_disk函数


## 示例函数
hello_bdev.c中的代码逻辑比较简单，执行顺序为

```c
spdk_app_start
	hello_start
		hello_write
			write_complete
				hello_read
					read_complete
```
与spdk/examples/nvme/hello_world/hello_world.c中做的事情类似

hello_start函数首先通过spdk_bdev_open_ext得到文件描述符，而后获取bdev设备，IO通道，申请缓冲区，写入"Hello World!\n"，调用spdk_bdev_write将缓冲区数据写入Malloc0设备，偏移量为0，写完成后重置缓冲区数据，调用spdk_bdev_read读取相同位置数据，读完成后打印返回数据，释放之前申请的IO通道，块设备描述符。

简要分析hello_write的调用过程
```c
// 函数调用栈
(gdb) bt
#0  _sw_accel_copy_iovs (dst_iovs=0x555555cca0b8, dst_iovcnt=1, src_iovs=0x555555cca0a8, src_iovcnt=1) at accel_sw.c:115
#1  0x0000555555696577 in sw_accel_submit_tasks (ch=0x555555dadfd0, accel_task=0x555555cc9fb0) at accel_sw.c:455
#2  0x000055555568e5a2 in accel_submit_task (accel_ch=0x555555e51190, task=0x555555cc9fb0) at accel.c:305
#3  0x000055555568e723 in spdk_accel_submit_copy (ch=0x555555e51130, dst=0x200016600000, src=0x2000162efd00, nbytes=512, flags=0, cb_fn=0x55555556e83f <malloc_done>, cb_arg=0x200010aa2ae0) at accel.c:340
#4  0x000055555556eec4 in bdev_malloc_writev (mdisk=0x555555cc95c0, ch=0x555555e51130, task=0x200010aa2ae0, iov=0x200010aa2710, iovcnt=1, len=512, offset=0, md_buf=0x0, md_len=0, md_offset=0) at bdev_malloc.c:277
#5  0x000055555556f43b in _bdev_malloc_submit_request (mch=0x555555e50e60, bdev_io=0x200010aa2700) at bdev_malloc.c:382
#6  0x000055555556f69c in bdev_malloc_submit_request (ch=0x555555e50e00, bdev_io=0x200010aa2700) at bdev_malloc.c:457
#7  0x0000555555674c66 in bdev_submit_request (bdev=0x555555cc95c0, ioch=0x555555e50e00, bdev_io=0x200010aa2700) at bdev.c:1297
#8  0x000055555567784d in bdev_io_do_submit (bdev_ch=0x555555e50d50, bdev_io=0x200010aa2700) at bdev.c:2477
#9  0x000055555567947a in _bdev_io_submit (ctx=0x200010aa2700) at bdev.c:3173
#10 0x0000555555679a48 in bdev_io_submit (bdev_io=0x200010aa2700) at bdev.c:3293
#11 0x000055555567e0f7 in bdev_write_blocks_with_md (desc=0x555555e50b60, ch=0x555555e50cf0, buf=0x2000162efd00, md_buf=0x0, offset_blocks=0, num_blocks=1, cb=0x55555556dd5e <write_complete>, cb_arg=0x7fffffffde40) at bdev.c:5195
#12 0x000055555567e1df in spdk_bdev_write_blocks (desc=0x555555e50b60, ch=0x555555e50cf0, buf=0x2000162efd00, offset_blocks=0, num_blocks=1, cb=0x55555556dd5e <write_complete>, cb_arg=0x7fffffffde40) at bdev.c:5219
#13 0x000055555567e188 in spdk_bdev_write (desc=0x555555e50b60, ch=0x555555e50cf0, buf=0x2000162efd00, offset=0, nbytes=512, cb=0x55555556dd5e <write_complete>, cb_arg=0x7fffffffde40) at bdev.c:5211
#14 0x000055555556decc in hello_write (arg=0x7fffffffde40) at hello_bdev.c:139
#15 0x000055555556e4d3 in hello_start (arg1=0x7fffffffde40) at hello_bdev.c:276
#16 0x00005555556683f7 in app_start_application () at app.c:264
#17 0x0000555555668478 in app_start_rpc (rc=0, arg1=0x0) at app.c:285
#18 0x000055555569f259 in app_json_config_load_done (ctx=0x555555c9f000, rc=0) at json_config.c:111
#19 0x000055555569ffa6 in app_json_config_load_subsystem (_ctx=0x555555c9f000) at json_config.c:473
#20 0x00005555556a7bd0 in msg_queue_run_batch (thread=0x555555c9ec00, max_msgs=8) at thread.c:804
#21 0x00005555556a8528 in thread_poll (thread=0x555555c9ec00, max_msgs=0, now=121496004745246) at thread.c:1026
#22 0x00005555556a8837 in spdk_thread_poll (thread=0x555555c9ec00, max_msgs=0, now=121496004745246) at thread.c:1119
#23 0x000055555566d309 in _reactor_run (reactor=0x555555c7b780) at reactor.c:914
#24 0x000055555566d3fb in reactor_run (arg=0x555555c7b780) at reactor.c:952
#25 0x000055555566d887 in spdk_reactors_start () at reactor.c:1068
#26 0x0000555555669c5d in spdk_app_start (opts_user=0x7fffffffdea0, start_fn=0x55555556e1fb <hello_start>, arg1=0x7fffffffde40) at app.c:779
#27 0x000055555556e5d9 in main (argc=5, argv=0x7fffffffe078) at hello_bdev.c:306
```
追溯到最后，就是使用memcpy拷贝数据，那么src与dst分别是什么呢
```c
static void
_sw_accel_copy_iovs(struct iovec *dst_iovs, uint32_t dst_iovcnt,
		    struct iovec *src_iovs, uint32_t src_iovcnt)
{
	struct spdk_ioviter iter;
	void *src, *dst;
	size_t len;

	for (len = spdk_ioviter_first(&iter, src_iovs, src_iovcnt,
				      dst_iovs, dst_iovcnt, &src, &dst);
	     len != 0;
	     len = spdk_ioviter_next(&iter, &src, &dst)) {
		memcpy(dst, src, len);
	}
}
```
src为hello_context->buff，dst为mdisk->malloc_buf + offset，故在Malloc bdev中写入数据只是简单地将数据拷贝到bdev相应的缓冲区，没看到sq cq之类的操作。
```c
(gdb) p src
$11 = (void *) 0x2000162efd00
(gdb) p dst
$12 = (void *) 0x200016600000
(gdb) p len
$13 = 512
(gdb) f 4
#4  0x000055555556eec4 in bdev_malloc_writev (mdisk=0x555555cc95c0, ch=0x555555e51130, task=0x200010aa2ae0, iov=0x200010aa2710, iovcnt=1, len=512, offset=0, md_buf=0x0, md_len=0, md_offset=0) at bdev_malloc.c:277
277                     res = spdk_accel_submit_copy(ch, dst, iov[i].iov_base,
(gdb) p mdisk->malloc_buf + offset
$14 = (void *) 0x200016600000
(gdb) f 13
#13 0x000055555567e188 in spdk_bdev_write (desc=0x555555e50b60, ch=0x555555e50cf0, buf=0x2000162efd00, offset=0, nbytes=512, cb=0x55555556dd5e <write_complete>, cb_arg=0x7fffffffde40) at bdev.c:5211
5211            return spdk_bdev_write_blocks(desc, ch, buf, offset_blocks, num_blocks, cb, cb_arg);
(gdb) p buf
$15 = (void *) 0x2000162efd00
```
在调用栈需要特别关注的就是bdev_write_blocks_with_md函数，在这个函数中创建了spdk_bdev_io结构体，当一个IO请求完成，都会调用spdk_bdev_free_io释放对应空间

```c
static int
bdev_write_blocks_with_md(struct spdk_bdev_desc *desc, struct spdk_io_channel *ch,
			  void *buf, void *md_buf, uint64_t offset_blocks, uint64_t num_blocks,
			  spdk_bdev_io_completion_cb cb, void *cb_arg)
{
	struct spdk_bdev *bdev = spdk_bdev_desc_get_bdev(desc);
	struct spdk_bdev_io *bdev_io;
	struct spdk_bdev_channel *channel = __io_ch_to_bdev_ch(ch);

	if (!desc->write) {
		return -EBADF;
	}

	if (!bdev_io_valid_blocks(bdev, offset_blocks, num_blocks)) {
		return -EINVAL;
	}

	bdev_io = bdev_channel_get_io(channel);
	if (!bdev_io) {
		return -ENOMEM;
	}
	// 设置IO请求信息
	bdev_io->internal.ch = channel;
	bdev_io->internal.desc = desc;
	bdev_io->type = SPDK_BDEV_IO_TYPE_WRITE;
	bdev_io->u.bdev.iovs = &bdev_io->iov;
	bdev_io->u.bdev.iovs[0].iov_base = buf;
	bdev_io->u.bdev.iovs[0].iov_len = num_blocks * bdev->blocklen;
	bdev_io->u.bdev.iovcnt = 1;
	bdev_io->u.bdev.md_buf = md_buf;
	bdev_io->u.bdev.num_blocks = num_blocks;
	bdev_io->u.bdev.offset_blocks = offset_blocks;
	bdev_io->u.bdev.memory_domain = NULL;
	bdev_io->u.bdev.memory_domain_ctx = NULL;
	bdev_io->u.bdev.accel_sequence = NULL;
	bdev_io_init(bdev_io, bdev, cb_arg, cb); // 设置回调函数

	bdev_io_submit(bdev_io);
	return 0;
}
```
函数调用中有几次都通过函数指针跳转，最关键的即为bdev_submit_request->bdev_malloc_submit_reques

```c
static inline void
bdev_submit_request(struct spdk_bdev *bdev, struct spdk_io_channel *ioch,
		    struct spdk_bdev_io *bdev_io)
{
	/* After a request is submitted to a bdev module, the ownership of an accel sequence
	 * associated with that bdev_io is transferred to the bdev module. So, clear the internal
	 * sequence pointer to make sure we won't touch it anymore. */
	if ((bdev_io->type == SPDK_BDEV_IO_TYPE_WRITE ||
	     bdev_io->type == SPDK_BDEV_IO_TYPE_READ) && bdev_io->u.bdev.accel_sequence != NULL) {
		assert(!bdev_io_needs_sequence_exec(bdev_io->internal.desc, bdev_io));
		bdev_io->internal.accel_sequence = NULL;
	}

	bdev->fn_table->submit_request(ioch, bdev_io);
}
```
其中spdk_bdev_fn_table结构体定义为

```c
/**
 * Function table for a block device backend.
 *
 * The backend block device function table provides a set of APIs to allow
 * communication with a backend. The main commands are read/write API
 * calls for I/O via submit_request.
 */
struct spdk_bdev_fn_table {
	/** Destroy the backend block device object */
	int (*destruct)(void *ctx);

	/** Process the IO. */
	void (*submit_request)(struct spdk_io_channel *ch, struct spdk_bdev_io *);

	/** Check if the block device supports a specific I/O type. */
	bool (*io_type_supported)(void *ctx, enum spdk_bdev_io_type);

	/** Get an I/O channel for the specific bdev for the calling thread. */
	struct spdk_io_channel *(*get_io_channel)(void *ctx);

	/**
	 * Output driver-specific information to a JSON stream. Optional - may be NULL.
	 *
	 * The JSON write context will be initialized with an open object, so the bdev
	 * driver should write a name (based on the driver name) followed by a JSON value
	 * (most likely another nested object).
	 */
	int (*dump_info_json)(void *ctx, struct spdk_json_write_ctx *w);

	/**
	 * Output bdev-specific RPC configuration to a JSON stream. Optional - may be NULL.
	 *
	 * This function should only be implemented for bdevs which can be configured
	 * independently of other bdevs.  For example, RPCs to create a bdev for an NVMe
	 * namespace may not be generated by this function, since enumerating an NVMe
	 * namespace requires attaching to an NVMe controller, and that controller may
	 * contain multiple namespaces.  The spdk_bdev_module's config_json function should
	 * be used instead for these cases.
	 *
	 * The JSON write context will be initialized with an open object, so the bdev
	 * driver should write all data necessary to recreate this bdev by invoking
	 * constructor method. No other data should be written.
	 */
	void (*write_config_json)(struct spdk_bdev *bdev, struct spdk_json_write_ctx *w);

	/** Get spin-time per I/O channel in microseconds.
	 *  Optional - may be NULL.
	 */
	uint64_t (*get_spin_time)(struct spdk_io_channel *ch);

	/** Get bdev module context. */
	void *(*get_module_ctx)(void *ctx);

	/** Get memory domains used by bdev. Optional - may be NULL.
	 * Vbdev module implementation should call \ref spdk_bdev_get_memory_domains for underlying bdev.
	 * Vbdev module must inspect types of memory domains returned by base bdev and report only those
	 * memory domains that it can work with. */
	int (*get_memory_domains)(void *ctx, struct spdk_memory_domain **domains, int array_size);

	/**
	 * Reset I/O statistics specific for this bdev context.
	 */
	void (*reset_device_stat)(void *ctx);

	/**
	 * Dump I/O statistics specific for this bdev context.
	 */
	void (*dump_device_stat_json)(void *ctx, struct spdk_json_write_ctx *w);

	/** Check if bdev can handle spdk_accel_sequence to handle I/O of specific type. */
	bool (*accel_sequence_supported)(void *ctx, enum spdk_bdev_io_type type);
};
```
在命令行参数解析时的rpc_bdev_malloc_create函数中调用了create_malloc_disk，在该函数中设置了相关信息

```c
struct malloc_disk {
	struct spdk_bdev		disk;
	void				*malloc_buf;
	void				*malloc_md_buf;
	TAILQ_ENTRY(malloc_disk)	link;
};

static const struct spdk_bdev_fn_table malloc_fn_table = {
	.destruct		= bdev_malloc_destruct,
	.submit_request		= bdev_malloc_submit_request,
	.io_type_supported	= bdev_malloc_io_type_supported,
	.get_io_channel		= bdev_malloc_get_io_channel,
	.write_config_json	= bdev_malloc_write_json_config,
};

static struct spdk_bdev_module malloc_if = {
	.name = "malloc",
	.module_init = bdev_malloc_initialize,
	.module_fini = bdev_malloc_deinitialize,
	.get_ctx_size = bdev_malloc_get_ctx_size,

};

int
create_malloc_disk(struct spdk_bdev **bdev, const struct malloc_bdev_opts *opts)
	/*
	 * Allocate the large backend memory buffer from pinned memory.
	 *
	 * TODO: need to pass a hint so we know which socket to allocate
	 *  from on multi-socket systems.
	 */
	mdisk->malloc_buf = spdk_zmalloc(opts->num_blocks * block_size, 2 * 1024 * 1024, NULL,
					 SPDK_ENV_LCORE_ID_ANY, SPDK_MALLOC_DMA);
	mdisk->disk.max_copy = 0;
	mdisk->disk.ctxt = mdisk;
	mdisk->disk.fn_table = &malloc_fn_table;
	mdisk->disk.module = &malloc_if;

	rc = spdk_bdev_register(&mdisk->disk);
	TAILQ_INSERT_TAIL(&g_malloc_disks, mdisk, link);
}
```
spdk文档中有关于自定义块设备的介绍 [Writing a Custom Block Device Module](https://spdk.io/doc/bdev_module.html)

![](https://img-blog.csdnimg.cn/5cd676d392734977a635763153a6ca52.png)

spdk bdev的用户指南：[Block Device User Guide](https://spdk.io/doc/bdev.html)
![](https://img-blog.csdnimg.cn/9f9365593bb24e5fadcb8b986ab5be69.png)
![](https://img-blog.csdnimg.cn/7b0083b3450f4996b3b81ec0c6e9d903.png)
malloc bdev设备申请的malloc_buf没看见有持久化操作，故malloc bdev数据只存在于内存之中

# nvme bdev
刚开始一直不知道怎么生成类似于Malloc dev的json配置文件，在集成rocksdb的时候看到了gen_nvme.sh脚本
```bash
scripts/gen_nvme.sh --json-with-subsystems
# 内容
{
    "subsystems": [
        {
            "subsystem": "bdev",
            "config": [
                {
                    "method": "bdev_nvme_attach_controller",
                    "params": {
                        "trtype": "PCIe",
                        "name": "Nvme0",
                        "traddr": "0000:03:00.0"
                    }
                },
                {
                    "method": "bdev_nvme_attach_controller",
                    "params": {
                        "trtype": "PCIe",
                        "name": "Nvme1",
                        "traddr": "0000:0b:00.0"
                    }
                },
                {
                    "method": "bdev_nvme_attach_controller",
                    "params": {
                        "trtype": "PCIe",
                        "name": "Nvme2",
                        "traddr": "0000:13:00.0"
                    }
                }
            ]
        }
    ]
}
```
照猫画虎执行以下命令却执行失败

```bash
./build/examples/hello_bdev -c ./examples/bdev/hello_world/nvme.json -b Nvme0
[2023-06-23 10:19:01.096287] Starting SPDK v23.05-pre git sha1 ee06693c3 / DPDK 22.11.1 initialization...
[2023-06-23 10:19:01.096442] [ DPDK EAL parameters: hello_bdev --no-shconf -c 0x1 --huge-unlink --log-level=lib.eal:6 --log-level=lib.cryptodev:5 --log-level=user1:6 --iova-mode=pa --base-virtaddr=0x200000000000 --match-allocations --file-prefix=spdk_pid6092 ]
TELEMETRY: No legacy callbacks, legacy socket not created
[2023-06-23 10:19:01.215133] app.c: 738:spdk_app_start: *NOTICE*: Total cores available: 1
[2023-06-23 10:19:01.267987] reactor.c: 937:reactor_run: *NOTICE*: Reactor started on core 0
[2023-06-23 10:19:01.311606] accel_sw.c: 601:sw_accel_module_init: *NOTICE*: Accel framework software module initialized.
[2023-06-23 10:19:01.476591] hello_bdev.c: 222:hello_start: *NOTICE*: Successfully started the application
[2023-06-23 10:19:01.476916] hello_bdev.c: 231:hello_start: *NOTICE*: Opening the bdev Nvme0
[2023-06-23 10:19:01.477001] bdev.c:7681:spdk_bdev_open_ext: *NOTICE*: Currently unable to find bdev with name: Nvme0
[2023-06-23 10:19:01.477110] hello_bdev.c: 235:hello_start: *ERROR*: Could not open bdev: Nvme0
[2023-06-23 10:19:01.477180] app.c: 844:spdk_app_stop: *WARNING*: spdk_app_stop'd on non-zero
[2023-06-23 10:19:01.553524] hello_bdev.c: 308:main: *ERROR*: ERROR starting application
```
查看rpc_bdev_nvme_attach_controller函数出现的名字确实是Nvme0，全局搜索-b Nvme0

**spdk/doc/bdev.md**
There are two ways to create block device based on NVMe device in SPDK. First way is to connect local PCIe drive and second one is to connect NVMe-oF device. In both cases user should use `bdev_nvme_attach_controller` RPC command to achieve that.

Example commands
`rpc.py bdev_nvme_attach_controller -b NVMe1 -t PCIe -a 0000:01:00.0`
This command will create NVMe bdev of physical device in the system.
`rpc.py bdev_nvme_attach_controller -b Nvme0 -t RDMA -a 192.168.100.1 -f IPv4 -s 4420 -n nqn.2016-06.io.spdk:cnode1`
This command will create NVMe bdev of NVMe-oF resource.

To remove an NVMe controller use the bdev_nvme_detach_controller command.
`rpc.py bdev_nvme_detach_controller Nvme0`
This command will remove NVMe bdev named Nvme0.

**spdk/scripts/vagrant/README.md**
```bash
  $ sudo scripts/setup.sh
  $ sudo scripts/gen_nvme.sh --json-with-subsystems > ./build/examples/hello_bdev.json
  $ sudo ./build/examples/hello_bdev --json ./build/examples/hello_bdev.json -b Nvme0n1
```
故使用Nvme0n1试一试，发现成功

```bash
./build/examples/hello_bdev -c examples/bdev/hello_world/nvme.json -b Nvme0n1
[2023-06-23 11:15:10.141844] Starting SPDK v23.05-pre git sha1 ee06693c3 / DPDK 22.11.1 initialization...
[2023-06-23 11:15:10.141985] [ DPDK EAL parameters: hello_bdev --no-shconf -c 0x1 --huge-unlink --log-level=lib.eal:6 --log-level=lib.cryptodev:5 --log-level=user1:6 --iova-mode=pa --base-virtaddr=0x200000000000 --match-allocations --file-prefix=spdk_pid12910 ]
TELEMETRY: No legacy callbacks, legacy socket not created
[2023-06-23 11:15:10.265816] app.c: 738:spdk_app_start: *NOTICE*: Total cores available: 1
[2023-06-23 11:15:10.320068] reactor.c: 937:reactor_run: *NOTICE*: Reactor started on core 0
[2023-06-23 11:15:10.373112] accel_sw.c: 601:sw_accel_module_init: *NOTICE*: Accel framework software module initialized.
[2023-06-23 11:15:10.542735] hello_bdev.c: 222:hello_start: *NOTICE*: Successfully started the application
[2023-06-23 11:15:10.543367] hello_bdev.c: 231:hello_start: *NOTICE*: Opening the bdev Nvme0n1
[2023-06-23 11:15:10.543648] hello_bdev.c: 244:hello_start: *NOTICE*: Opening io channel
[2023-06-23 11:15:10.544289] hello_bdev.c: 138:hello_write: *NOTICE*: Writing to the bdev
[2023-06-23 11:15:10.545329] hello_bdev.c: 117:write_complete: *NOTICE*: bdev io write completed successfully
[2023-06-23 11:15:10.546495] hello_bdev.c:  84:hello_read: *NOTICE*: Reading io
[2023-06-23 11:15:10.546975] hello_bdev.c:  65:read_complete: *NOTICE*: Read string from bdev : Hello World!

[2023-06-23 11:15:10.548061] hello_bdev.c:  74:read_complete: *NOTICE*: Stopping app
```

简要看一下nvme bdev的一些不同，直接到分叉点bdev_submit_request函数

```c
Thread 1 "reactor_0" hit Breakpoint 1, bdev_submit_request (bdev=0x555555cd8350, ioch=0x555555cca200, bdev_io=0x200010aa2700) at bdev.c:1291
1291            if ((bdev_io->type == SPDK_BDEV_IO_TYPE_WRITE ||
(gdb) bt
#0  bdev_submit_request (bdev=0x555555cd8350, ioch=0x555555cca200, bdev_io=0x200010aa2700) at bdev.c:1291
#1  0x000055555567784d in bdev_io_do_submit (bdev_ch=0x555555cca150, bdev_io=0x200010aa2700) at bdev.c:2477
#2  0x000055555567947a in _bdev_io_submit (ctx=0x200010aa2700) at bdev.c:3173
#3  0x0000555555679a48 in bdev_io_submit (bdev_io=0x200010aa2700) at bdev.c:3293
#4  0x000055555567e0f7 in bdev_write_blocks_with_md (desc=0x555555e600d0, ch=0x555555cca0f0, buf=0x200003aeb340, md_buf=0x0, offset_blocks=0, num_blocks=1, cb=0x55555556dd5e <write_complete>, cb_arg=0x7fffffffde40) at bdev.c:5195
#5  0x000055555567e1df in spdk_bdev_write_blocks (desc=0x555555e600d0, ch=0x555555cca0f0, buf=0x200003aeb340, offset_blocks=0, num_blocks=1, cb=0x55555556dd5e <write_complete>, cb_arg=0x7fffffffde40) at bdev.c:5219
#6  0x000055555567e188 in spdk_bdev_write (desc=0x555555e600d0, ch=0x555555cca0f0, buf=0x200003aeb340, offset=0, nbytes=512, cb=0x55555556dd5e <write_complete>, cb_arg=0x7fffffffde40) at bdev.c:5211
#7  0x000055555556decc in hello_write (arg=0x7fffffffde40) at hello_bdev.c:139
#8  0x000055555556e4d3 in hello_start (arg1=0x7fffffffde40) at hello_bdev.c:276
#9  0x00005555556683f7 in app_start_application () at app.c:264
#10 0x0000555555668478 in app_start_rpc (rc=0, arg1=0x0) at app.c:285
#11 0x000055555569f259 in app_json_config_load_done (ctx=0x555555c9f000, rc=0) at json_config.c:111
#12 0x000055555569ffa6 in app_json_config_load_subsystem (_ctx=0x555555c9f000) at json_config.c:473
#13 0x00005555556a7bd0 in msg_queue_run_batch (thread=0x555555c9ec00, max_msgs=8) at thread.c:804
#14 0x00005555556a8528 in thread_poll (thread=0x555555c9ec00, max_msgs=0, now=9579853985352) at thread.c:1026
#15 0x00005555556a8837 in spdk_thread_poll (thread=0x555555c9ec00, max_msgs=0, now=9579853985352) at thread.c:1119
#16 0x000055555566d309 in _reactor_run (reactor=0x555555c7b780) at reactor.c:914
#17 0x000055555566d3fb in reactor_run (arg=0x555555c7b780) at reactor.c:952
#18 0x000055555566d887 in spdk_reactors_start () at reactor.c:1068
#19 0x0000555555669c5d in spdk_app_start (opts_user=0x7fffffffdea0, start_fn=0x55555556e1fb <hello_start>, arg1=0x7fffffffde40) at app.c:779
#20 0x000055555556e5d9 in main (argc=5, argv=0x7fffffffe078) at hello_bdev.c:306
(gdb) n
1292                 bdev_io->type == SPDK_BDEV_IO_TYPE_READ) && bdev_io->u.bdev.accel_sequence != NULL) {
(gdb) n
1297            bdev->fn_table->submit_request(ioch, bdev_io);
(gdb) p bdev->fn_table
$1 = (const struct spdk_bdev_fn_table *) 0x555555a10c80 <nvmelib_fn_table>
```
![](https://img-blog.csdnimg.cn/b0960caf7fdb45a7a19de4abfea9a9a2.png)

```c
static const struct spdk_bdev_fn_table nvmelib_fn_table = {
	.destruct		= bdev_nvme_destruct,
	.submit_request		= bdev_nvme_submit_request,
	.io_type_supported	= bdev_nvme_io_type_supported,
	.get_io_channel		= bdev_nvme_get_io_channel,
	.dump_info_json		= bdev_nvme_dump_info_json,
	.write_config_json	= bdev_nvme_write_config_json,
	.get_spin_time		= bdev_nvme_get_spin_time,
	.get_module_ctx		= bdev_nvme_get_module_ctx,
	.get_memory_domains	= bdev_nvme_get_memory_domains,
	.reset_device_stat	= bdev_nvme_reset_device_stat,
	.dump_device_stat_json	= bdev_nvme_dump_device_stat_json,
};

static struct spdk_bdev_module nvme_if = {
	.name = "nvme",
	.async_fini = true,
	.module_init = bdev_nvme_library_init,
	.module_fini = bdev_nvme_library_fini,
	.config_json = bdev_nvme_config_json,
	.get_ctx_size = bdev_nvme_get_ctx_size,

};
// 省略大部分代码
static int
nvme_disk_create(struct spdk_bdev *disk, const char *base_name,
		 struct spdk_nvme_ctrlr *ctrlr, struct spdk_nvme_ns *ns,
		 uint32_t prchk_flags, void *ctx)
{
	disk->name = spdk_sprintf_alloc("%sn%d", base_name, spdk_nvme_ns_get_id(ns));
	disk->blocklen = spdk_nvme_ns_get_extended_sector_size(ns);
	disk->blockcnt = spdk_nvme_ns_get_num_sectors(ns);
	disk->max_segment_size = spdk_nvme_ctrlr_get_max_xfer_size(ctrlr);
	disk->ctxt = ctx;
	disk->fn_table = &nvmelib_fn_table;
	disk->module = &nvme_if;

	return 0;
}

Thread 1 "reactor_0" hit Breakpoint 2, nvme_disk_create (disk=0x770000007c, base_name=0x0, ctrlr=0x0, ns=0x1, prchk_flags=57, ctx=0x9) at bdev_nvme.c:3274
3274    {
(gdb) bt
#0  nvme_disk_create (disk=0x770000007c, base_name=0x0, ctrlr=0x0, ns=0x1, prchk_flags=57, ctx=0x9) at bdev_nvme.c:3274
#1  0x000055555557ab49 in nvme_bdev_create (nvme_ctrlr=0x555555cd7b10, nvme_ns=0x555555cd82d0) at bdev_nvme.c:3429
#2  0x000055555557b883 in nvme_ctrlr_populate_namespace (nvme_ctrlr=0x555555cd7b10, nvme_ns=0x555555cd82d0) at bdev_nvme.c:3752
#3  0x000055555557bdac in nvme_ctrlr_populate_namespaces (nvme_ctrlr=0x555555cd7b10, ctx=0x555555cc9f50) at bdev_nvme.c:3911
#4  0x000055555557cdcf in nvme_ctrlr_create_done (nvme_ctrlr=0x555555cd7b10, ctx=0x555555cc9f50) at bdev_nvme.c:4387
#5  0x000055555557d7cd in nvme_ctrlr_create (ctrlr=0x2000162ec0c0, name=0x555555cc0650 "Nvme0", trid=0x555555cc9f78, ctx=0x555555cc9f50) at bdev_nvme.c:4628
#6  0x000055555557e779 in connect_attach_cb (cb_ctx=0x555555cca1c0, trid=0x2000162ec0e8, ctrlr=0x2000162ec0c0, opts=0x2000162ed6c8) at bdev_nvme.c:5054
#7  0x00005555555f5271 in nvme_ctrlr_poll_internal (ctrlr=0x2000162ec0c0, probe_ctx=0x555555cca520) at nvme.c:737
#8  0x00005555555f743a in spdk_nvme_probe_poll_async (probe_ctx=0x555555cca520) at nvme.c:1510
#9  0x000055555557e856 in bdev_nvme_async_poll (arg=0x555555cc9f50) at bdev_nvme.c:5089
#10 0x00005555556a82fd in thread_execute_timed_poller (thread=0x555555c9ec00, poller=0x555555cd7940, now=13419228290350) at thread.c:970
#11 0x00005555556a8613 in thread_poll (thread=0x555555c9ec00, max_msgs=0, now=13419228290350) at thread.c:1060
#12 0x00005555556a8837 in spdk_thread_poll (thread=0x555555c9ec00, max_msgs=0, now=13419228290350) at thread.c:1119
#13 0x000055555566d309 in _reactor_run (reactor=0x555555c7b780) at reactor.c:914
#14 0x000055555566d3fb in reactor_run (arg=0x555555c7b780) at reactor.c:952
--Type <RET> for more, q to quit, c to continue without paging--
#15 0x000055555566d887 in spdk_reactors_start () at reactor.c:1068
#16 0x0000555555669c5d in spdk_app_start (opts_user=0x7fffffffdea0, start_fn=0x55555556e1fb <hello_start>, arg1=0x7fffffffde40) at app.c:779
#17 0x000055555556e5d9 in main (argc=5, argv=0x7fffffffe078) at hello_bdev.c:306

// -b Nvme0n1的原因
(gdb) p disk->name
$2 = 0x555555c7a0f0 "Nvme0n1"
```

```bash
 ./build/examples/hello_bdev -c examples/bdev/hello_world/nvme.json -b Nvme0n1 -L all
[2023-06-23 11:54:08.054234] json_config.c: 383:app_json_config_load_subsystem_config_entry: *DEBUG*:   params: {
                        "trtype": "PCIe",
                        "name": "Nvme0",
                        "traddr": "0000:03:00.0"
                    }
 
 [2023-06-23 11:54:08.111049] jsonrpc_client.c:  67:jsonrpc_parse_response: *DEBUG*: JSON string is :
{"jsonrpc":"2.0","id":0,"result":["Nvme0n1"]} 

[2023-06-23 11:54:08.111082] json_config.c: 383:app_json_config_load_subsystem_config_entry: *DEBUG*:   params: {
                        "trtype": "PCIe",
                        "name": "Nvme1",
                        "traddr": "0000:0b:00.0"
                    }    
{"jsonrpc":"2.0","id":0,"result":[]}
[2023-06-23 11:54:08.160526] json_config.c: 383:app_json_config_load_subsystem_config_entry: *DEBUG*:   params: {
                        "trtype": "PCIe",
                        "name": "Nvme2",
                        "traddr": "0000:13:00.0"
                    }    
{"jsonrpc":"2.0","id":0,"result":[]}

[2023-06-23 11:54:08.211102] hello_bdev.c: 138:hello_write: *NOTICE*: Writing to the bdev
[2023-06-23 11:54:08.211328] bdev_nvme.c:6613:bdev_nvme_writev: *DEBUG*: write 1 blocks with offset 0
[2023-06-23 11:54:08.211363] nvme_qpair.c: 474:spdk_nvme_print_completion: *NOTICE*: SUCCESS (00/00) qid:0 cid:186 cdw0:0 sqhd:000d p:1 m:0 dnr:0
[2023-06-23 11:54:08.211496] nvme_qpair.c: 223:nvme_admin_qpair_print_command: *NOTICE*: CREATE IO SQ (01) qid:0 cid:191 nsid:0 cdw10:00ff0001 cdw11:00010001 PRP1 0x18a608000 PRP2 0x0
[2023-06-23 11:54:08.213185] nvme_qpair.c: 474:spdk_nvme_print_completion: *NOTICE*: SUCCESS (00/00) qid:0 cid:191 cdw0:0 sqhd:000e p:1 m:0 dnr:0
[2023-06-23 11:54:08.213517] nvme_pcie_common.c:1207:nvme_pcie_prp_list_append: *DEBUG*: prp_index:0 virt_addr:0x200003aec0c0 len:512
[2023-06-23 11:54:08.213555] nvme_pcie_common.c:1235:nvme_pcie_prp_list_append: *DEBUG*: prp1 = 0x190cec0c0
[2023-06-23 11:54:08.213573] nvme_qpair.c: 243:nvme_io_qpair_print_command: *NOTICE*: WRITE sqid:1 cid:191 nsid:1 lba:0 len:1 PRP1 0x190cec0c0 PRP2 0x0
[2023-06-23 11:54:08.213836] nvme_qpair.c: 474:spdk_nvme_print_completion: *NOTICE*: SUCCESS (00/00) qid:1 cid:191 cdw0:0 sqhd:0001 p:1 m:0 dnr:0
[2023-06-23 11:54:08.213967] hello_bdev.c: 117:write_complete: *NOTICE*: bdev io write completed successfully
[2023-06-23 11:54:08.214070] hello_bdev.c:  84:hello_read: *NOTICE*: Reading io
[2023-06-23 11:54:08.214150] bdev_nvme.c:6567:bdev_nvme_readv: *DEBUG*: read 1 blocks with offset 0
[2023-06-23 11:54:08.214177] nvme_pcie_common.c:1207:nvme_pcie_prp_list_append: *DEBUG*: prp_index:0 virt_addr:0x200003aec0c0 len:512
[2023-06-23 11:54:08.214187] nvme_pcie_common.c:1235:nvme_pcie_prp_list_append: *DEBUG*: prp1 = 0x190cec0c0
[2023-06-23 11:54:08.214200] nvme_qpair.c: 243:nvme_io_qpair_print_command: *NOTICE*: READ sqid:1 cid:190 nsid:1 lba:0 len:1 PRP1 0x190cec0c0 PRP2 0x0
[2023-06-23 11:54:08.214363] nvme_qpair.c: 474:spdk_nvme_print_completion: *NOTICE*: SUCCESS (00/00) qid:1 cid:190 cdw0:0 sqhd:0002 p:1 m:0 dnr:0
[2023-06-23 11:54:08.214492] hello_bdev.c:  65:read_complete: *NOTICE*: Read string from bdev : Hello World!       
```

# 文档摘录

spdk采用轮询而不是中断的原因：
1）大部分硬件设计不支持用户空间中断机制
2）中断会引发上下文切换，产生比较大的开销，轮询由于只需通过主机内存而不是MMIO查看相应位是否发生翻转，一些技术例如intel的DDIO可以保证这部分主机内存在于CPU缓存中
```c
// 4.19版本nvme 驱动
152  /*
153   * An NVM Express queue.  Each device has at least two (one for admin
154   * commands and one for I/O commands).
155   */
156  struct nvme_queue {
157  	struct device *q_dmadev;
158  	struct nvme_dev *dev;
159  	spinlock_t sq_lock;
160  	struct nvme_command *sq_cmds;	// SQ内存地址
161  	struct nvme_command __iomem *sq_cmds_io; // 使用CMB的SQ IO地址
162  	spinlock_t cq_lock ____cacheline_aligned_in_smp;
163  	volatile struct nvme_completion *cqes; // CQ内存地址
164  	struct blk_mq_tags **tags;
165  	dma_addr_t sq_dma_addr;		// SQ总线地址
166  	dma_addr_t cq_dma_addr;		// CQ总线地址
167  	u32 __iomem *q_db;			// DB寄存器 IO地址
168  	u16 q_depth;
169  	s16 cq_vector;
170  	u16 sq_tail;			   // 主机能写的两个DB寄存器的值
171  	u16 cq_head;
172  	u16 last_cq_head;
173  	u16 qid;
174  	u8 cq_phase;
175  	u32 *dbbuf_sq_db;		  	
176  	u32 *dbbuf_cq_db;
177  	u32 *dbbuf_sq_ei;
178  	u32 *dbbuf_cq_ei;
179  };
```
![](https://img-blog.csdnimg.cn/6f5db08cae7247c4b009c0d6b8dc74c4.png)
[可乐学习NVMe之二：三只熊SQ/CQ/DB](https://blog.csdn.net/sinat_43629962/article/details/123985710)

```c
// spdk相关的CQ轮询代码
int32_t
nvme_pcie_qpair_process_completions(struct spdk_nvme_qpair *qpair, uint32_t max_completions)
{
	while (1) {
		cpl = &pqpair->cpl[pqpair->cq_head];

		if (!next_is_valid && cpl->status.p != pqpair->flags.phase) {
			break;
		}

		if (spdk_likely(pqpair->cq_head + 1 != pqpair->num_entries)) {
			next_cq_head = pqpair->cq_head + 1;
			next_phase = pqpair->flags.phase;
		} else {
			next_cq_head = 0;
			next_phase = !pqpair->flags.phase;
		}
		next_cpl = &pqpair->cpl[next_cq_head];
		next_is_valid = (next_cpl->status.p == next_phase);
		if (next_is_valid) {
			__builtin_prefetch(&pqpair->tr[next_cpl->cid]);
		}

		tr = &pqpair->tr[cpl->cid];
		pqpair->sq_head = cpl->sqhd;
		__builtin_prefetch(&tr->req->stailq);
		nvme_pcie_qpair_complete_tracker(qpair, tr, cpl, true);
		if (++num_completions == max_completions) {
			break;
		}
	}
}
```

![](https://img-blog.csdnimg.cn/2dad6b6ac1a147b19320c22fd6c6d478.png)

SPDK 驱动程序选择将硬件队列直接暴露给应用程序，并要求一次只能从一个线程访问硬件队列。实际上，应用程序为每个线程分配一个硬件队列（而不是内核驱动程序中每个核心一个硬件队列）。这保证了线程可以提交请求，而不必与系统中的其他线程执行任何类型的协调（即锁定）。
[SPDK（存储性能开发套件）官方文档中文版](https://www.cnblogs.com/whl320124/p/11398951.html#:~:text=SPDK%EF%BC%88%E5%AD%98%E5%82%A8%E6%80%A7%E8%83%BD%E5%BC%80%E5%8F%91%E5%A5%97%E4%BB%B6%EF%BC%89%E5%AE%98%E6%96%B9%E6%96%87%E6%A1%A3%E4%B8%AD%E6%96%87%E7%89%88,%EF%BC%882019%E5%B9%B48%E6%9C%88%E7%89%88%EF%BC%8C%E8%AF%91%EF%BC%9A%E7%8E%8B%E6%B5%B7%E4%BA%AE%EF%BC%89)

![](https://img-blog.csdnimg.cn/09daeff41d3a4e99b525e3462f110ed1.png)

# SDC摘录
![](https://img-blog.csdnimg.cn/d942d64a463941a18ccdcba7bdcb3705.png)
[Educational Library](https://www.snia.org/educational-library?search=spdk&field_edu_content_type_tid=All&field_assoc_event_name_tid=All&field_release_date_value_2%5Bvalue%5D%5Byear%5D=&field_focus_areas_tid=All&field_author_tid=&field_release_date_value=All&items_per_page=20&captcha_sid=2529762&captcha_token=6c10ffa172586a5741aa802ca34ae1d7&captcha_cacheable=1&page=2)
## SPDK NVMe: An In-depth Look at its Architecture and Design
PPT与SPDK代码简单对应
![](https://img-blog.csdnimg.cn/69113a499d9648b2882d58b352cfdd1a.png)

```c
// env.h
/**
 * Enumerate all PCI devices supported by the provided driver and try to
 * attach those that weren't attached yet. The provided callback will be
 * called for each such device and its return code will decide whether that
 * device is attached or not. Attached devices have to be manually detached
 * with spdk_pci_device_detach() to be attach-able again.
 *
 * During enumeration all registered pci devices with exposed access to
 * userspace are getting probed internally unless not explicitly specified
 * on denylist. Because of that it becomes not possible to either use such
 * devices with another application or unbind the driver (e.g. vfio).
 *
 * 2s asynchronous delay is introduced to avoid race conditions between
 * user space software initialization and in-kernel device handling for
 * newly inserted devices. Subsequent enumerate call after the delay
 * shall allow for a successful device attachment.
 *
 * \param driver Driver for a specific device type.
 * \param enum_cb Callback to be called for each non-attached PCI device.
 * \param enum_ctx Additional context passed to the callback function.
 *
 * \return -1 if an internal error occurred or the provided callback returned -1,
 *         0 otherwise
 */
int spdk_pci_enumerate(struct spdk_pci_driver *driver, spdk_pci_enum_cb enum_cb, void *enum_ctx);

/**
 * Allocate dma/sharable memory based on a given dma_flg. It is a memory buffer
 * with the given size, alignment and socket id.
 *
 * \param size Size in bytes.
 * \param align If non-zero, the allocated buffer is aligned to a multiple of
 * align. In this case, it must be a power of two. The returned buffer is always
 * aligned to at least cache line size.
 * \param phys_addr **Deprecated**. Please use spdk_vtophys() for retrieving physical
 * addresses. A pointer to the variable to hold the physical address of
 * the allocated buffer is passed. If NULL, the physical address is not returned.
 * \param socket_id Socket ID to allocate memory on, or SPDK_ENV_SOCKET_ID_ANY
 * for any socket.
 * \param flags Combination of SPDK_MALLOC flags (\ref SPDK_MALLOC_DMA, \ref SPDK_MALLOC_SHARE).
 * At least one flag must be specified.
 *
 * \return a pointer to the allocated memory buffer.
 */
void *spdk_malloc(size_t size, size_t align, uint64_t *phys_addr, int socket_id, uint32_t flags);

```
![](https://img-blog.csdnimg.cn/5664e42dd65e48cc8d9ee1870e79a382.png)

```c
// 省略一些成员
struct spdk_nvme_transport_ops {
	struct spdk_nvme_ctrlr *(*ctrlr_construct)(const struct spdk_nvme_transport_id *trid,
			const struct spdk_nvme_ctrlr_opts *opts,
			void *devhandle);			
	int (*ctrlr_destruct)(struct spdk_nvme_ctrlr *ctrlr);

	int (*ctrlr_set_reg_4)(struct spdk_nvme_ctrlr *ctrlr, uint32_t offset, uint32_t value);

	int (*ctrlr_get_reg_4)(struct spdk_nvme_ctrlr *ctrlr, uint32_t offset, uint32_t *value);

	struct spdk_nvme_qpair *(*ctrlr_create_io_qpair)(struct spdk_nvme_ctrlr *ctrlr, uint16_t qid,
			const struct spdk_nvme_io_qpair_opts *opts);

	int (*ctrlr_delete_io_qpair)(struct spdk_nvme_ctrlr *ctrlr, struct spdk_nvme_qpair *qpair);

	int (*qpair_submit_request)(struct spdk_nvme_qpair *qpair, struct nvme_request *req);

	int32_t (*qpair_process_completions)(struct spdk_nvme_qpair *qpair, uint32_t max_completions);
};
```
![](https://img-blog.csdnimg.cn/ee799ff98acf44d9b43d077b6cc44ad2.png)

```c
/**
 * Enumerate the bus indicated by the transport ID and attach the userspace NVMe
 * driver to each device found if desired.
 *
 * This function is not thread safe and should only be called from one thread at
 * a time while no other threads are actively using any NVMe devices.
 *
 * If called from a secondary process, only devices that have been attached to
 * the userspace driver in the primary process will be probed.
 *
 * If called more than once, only devices that are not already attached to the
 * SPDK NVMe driver will be reported.
 *
 * To stop using the the controller and release its associated resources,
 * call spdk_nvme_detach() with the spdk_nvme_ctrlr instance from the attach_cb()
 * function.
 *
 * \param trid The transport ID indicating which bus to enumerate. If the trtype
 * is PCIe or trid is NULL, this will scan the local PCIe bus. If the trtype is
 * RDMA, the traddr and trsvcid must point at the location of an NVMe-oF discovery
 * service.
 * \param cb_ctx Opaque value which will be passed back in cb_ctx parameter of
 * the callbacks.
 * \param probe_cb will be called once per NVMe device found in the system.
 * \param attach_cb will be called for devices for which probe_cb returned true
 * once that NVMe controller has been attached to the userspace driver.
 * \param remove_cb will be called for devices that were attached in a previous
 * spdk_nvme_probe() call but are no longer attached to the system. Optional;
 * specify NULL if removal notices are not desired.
 *
 * \return 0 on success, -1 on failure.
 */
int spdk_nvme_probe(const struct spdk_nvme_transport_id *trid,
		    void *cb_ctx,
		    spdk_nvme_probe_cb probe_cb,
		    spdk_nvme_attach_cb attach_cb,
		    spdk_nvme_remove_cb remove_cb);
```
![](https://img-blog.csdnimg.cn/6f8cbd246db94fb3b7fa6d33f81a103b.png)

```c
/**
 * Allocate an I/O queue pair (submission and completion queue).
 *
 * This function by default also performs any connection activities required for
 * a newly created qpair. To avoid that behavior, the user should set the create_only
 * flag in the opts structure to true.
 *
 * Each queue pair should only be used from a single thread at a time (mutual
 * exclusion must be enforced by the user).
 *
 * \param ctrlr NVMe controller for which to allocate the I/O queue pair.
 * \param opts I/O qpair creation options, or NULL to use the defaults as returned
 * by spdk_nvme_ctrlr_get_default_io_qpair_opts().
 * \param opts_size Must be set to sizeof(struct spdk_nvme_io_qpair_opts), or 0
 * if opts is NULL.
 *
 * \return a pointer to the allocated I/O queue pair.
 */
struct spdk_nvme_qpair *spdk_nvme_ctrlr_alloc_io_qpair(struct spdk_nvme_ctrlr *ctrlr,
		const struct spdk_nvme_io_qpair_opts *opts,
		size_t opts_size);

// 省略一些成员		
/**
 * NVMe I/O queue pair initialization options.
 *
 * These options may be passed to spdk_nvme_ctrlr_alloc_io_qpair() to configure queue pair
 * options at queue creation time.
 *
 * The user may retrieve the default I/O queue pair creation options for a controller using
 * spdk_nvme_ctrlr_get_default_io_qpair_opts().
 */
struct spdk_nvme_io_qpair_opts {
	/**
	 * Queue priority for weighted round robin arbitration.  If a different arbitration
	 * method is in use, pass 0.
	 */
	enum spdk_nvme_qprio qprio;

	/**
	 * The queue depth of this NVMe I/O queue. Overrides spdk_nvme_ctrlr_opts::io_queue_size.
	 */
	uint32_t io_queue_size;

	/**
	 * The number of requests to allocate for this NVMe I/O queue.
	 *
	 * Overrides spdk_nvme_ctrlr_opts::io_queue_requests.
	 *
	 * This should be at least as large as io_queue_size.
	 *
	 * A single I/O may allocate more than one request, since splitting may be
	 * necessary to conform to the device's maximum transfer size, PRP list
	 * compatibility requirements, or driver-assisted striping.
	 */
	uint32_t io_queue_requests;

} __attribute__((packed));
```
![](https://img-blog.csdnimg.cn/25115eed85f944318a5e603745373fd0.png)

```c
/**
 * \brief Submits a read I/O to the specified NVMe namespace.
 *
 * The command is submitted to a qpair allocated by spdk_nvme_ctrlr_alloc_io_qpair().
 * The user must ensure that only one thread submits I/O on a given qpair at any
 * given time.
 *
 * \param ns NVMe namespace to submit the read I/O.
 * \param qpair I/O queue pair to submit the request.
 * \param payload Virtual address pointer to the data payload.
 * \param lba Starting LBA to read the data.
 * \param lba_count Length (in sectors) for the read operation.
 * \param cb_fn Callback function to invoke when the I/O is completed.
 * \param cb_arg Argument to pass to the callback function.
 * \param io_flags Set flags, defined in nvme_spec.h, for this I/O.
 *
 * \return 0 if successfully submitted, negated errnos on the following error conditions:
 * -EINVAL: The request is malformed.
 * -ENOMEM: The request cannot be allocated.
 * -ENXIO: The qpair is failed at the transport level.
 */
int spdk_nvme_ns_cmd_read(struct spdk_nvme_ns *ns, struct spdk_nvme_qpair *qpair, void *payload,
			  uint64_t lba, uint32_t lba_count, spdk_nvme_cmd_cb cb_fn,
			  void *cb_arg, uint32_t io_flags);
```
![](https://img-blog.csdnimg.cn/b61a2023ebb9406b8f8ac4db150731be.png)

```c
/**
 * Process any outstanding completions for I/O submitted on a queue pair.
 *
 * This call is non-blocking, i.e. it only processes completions that are ready
 * at the time of this function call. It does not wait for outstanding commands
 * to finish.
 *
 * For each completed command, the request's callback function will be called if
 * specified as non-NULL when the request was submitted.
 *
 * The caller must ensure that each queue pair is only used from one thread at a
 * time.
 *
 * This function may be called at any point while the controller is attached to
 * the SPDK NVMe driver.
 *
 * \sa spdk_nvme_cmd_cb
 *
 * \param qpair Queue pair to check for completions.
 * \param max_completions Limit the number of completions to be processed in one
 * call, or 0 for unlimited.
 *
 * \return number of completions processed (may be 0) or negated on error. -ENXIO
 * in the special case that the qpair is failed at the transport layer.
 */
int32_t spdk_nvme_qpair_process_completions(struct spdk_nvme_qpair *qpair,
		uint32_t max_completions);
```
![](https://img-blog.csdnimg.cn/c1346376aff2463c8d09e3684c5a2ad8.png)

```c
// qpair->transport->ops.qpair_submit_request(qpair, req);
struct nvme_request {
	struct spdk_nvme_cmd		cmd;

	uint8_t				retries;

	uint8_t				timed_out : 1;

	/**
	 * True if the request is in the queued_req list.
	 */
	uint8_t				queued : 1;
	uint8_t				reserved : 6;

	/**
	 * Number of children requests still outstanding for this
	 *  request which was split into multiple child requests.
	 */
	uint16_t			num_children;

	/**
	 * Offset in bytes from the beginning of payload for this request.
	 * This is used for I/O commands that are split into multiple requests.
	 */
	uint32_t			payload_offset;
	uint32_t			md_offset;

	uint32_t			payload_size;

	/**
	 * Timeout ticks for error injection requests, can be extended in future
	 * to support per-request timeout feature.
	 */
	uint64_t			timeout_tsc;

	/**
	 * Data payload for this request's command.
	 */
	struct nvme_payload		payload;

	spdk_nvme_cmd_cb		cb_fn;
	void				*cb_arg;
	STAILQ_ENTRY(nvme_request)	stailq;

	struct spdk_nvme_qpair		*qpair;

	/*
	 * The value of spdk_get_ticks() when the request was submitted to the hardware.
	 * Only set if ctrlr->timeout_enabled is true.
	 */
	uint64_t			submit_tick;

	/**
	 * The active admin request can be moved to a per process pending
	 *  list based on the saved pid to tell which process it belongs
	 *  to. The cpl saves the original completion information which
	 *  is used in the completion callback.
	 * NOTE: these below two fields are only used for admin request.
	 */
	pid_t				pid;
	struct spdk_nvme_cpl		cpl;

	uint32_t			md_size;

	/**
	 * The following members should not be reordered with members
	 *  above.  These members are only needed when splitting
	 *  requests which is done rarely, and the driver is careful
	 *  to not touch the following fields until a split operation is
	 *  needed, to avoid touching an extra cacheline.
	 */

	/**
	 * Points to the outstanding child requests for a parent request.
	 *  Only valid if a request was split into multiple children
	 *  requests, and is not initialized for non-split requests.
	 */
	TAILQ_HEAD(, nvme_request)	children;

	/**
	 * Linked-list pointers for a child request in its parent's list.
	 */
	TAILQ_ENTRY(nvme_request)	child_tailq;

	/**
	 * Points to a parent request if part of a split request,
	 *   NULL otherwise.
	 */
	struct nvme_request		*parent;

	/**
	 * Completion status for a parent request.  Initialized to all 0's
	 *  (SUCCESS) before child requests are submitted.  If a child
	 *  request completes with error, the error status is copied here,
	 *  to ensure that the parent request is also completed with error
	 *  status once all child requests are completed.
	 */
	struct spdk_nvme_cpl		parent_status;

	/**
	 * The user_cb_fn and user_cb_arg fields are used for holding the original
	 * callback data when using nvme_allocate_request_user_copy.
	 */
	spdk_nvme_cmd_cb		user_cb_fn;
	void				*user_cb_arg;
	void				*user_buffer;
};
```
![](https://img-blog.csdnimg.cn/5e19774af1fd4bfeb4a26e2b1cdad2a7.png)

```c
struct __attribute__((packed)) spdk_nvme_ctrlr_data {
	/* bytes 0-255: controller capabilities and features */

	/** maximum data transfer size */
	uint8_t			mdts;
}

struct spdk_nvme_ns_data {
	/** namespace optimal I/O boundary in logical blocks */
	uint16_t		noiob;
}
```
![](https://img-blog.csdnimg.cn/7ed2cec387604c48a68d66be43775e23.png)
```c
/**
 * Submit a write I/O to the specified NVMe namespace.
 *
 * The command is submitted to a qpair allocated by spdk_nvme_ctrlr_alloc_io_qpair().
 * The user must ensure that only one thread submits I/O on a given qpair at any
 * given time.
 *
 * \param ns NVMe namespace to submit the write I/O.
 * \param qpair I/O queue pair to submit the request.
 * \param lba Starting LBA to write the data.
 * \param lba_count Length (in sectors) for the write operation.
 * \param cb_fn Callback function to invoke when the I/O is completed.
 * \param cb_arg Argument to pass to the callback function.
 * \param io_flags Set flags, defined in nvme_spec.h, for this I/O.
 * \param reset_sgl_fn Callback function to reset scattered payload.
 * \param next_sge_fn Callback function to iterate each scattered payload memory
 * segment.
 *
 * \return 0 if successfully submitted, negated errnos on the following error conditions:
 * -EINVAL: The request is malformed.
 * -ENOMEM: The request cannot be allocated.
 * -ENXIO: The qpair is failed at the transport level.
 */
int spdk_nvme_ns_cmd_writev(struct spdk_nvme_ns *ns, struct spdk_nvme_qpair *qpair,
			    uint64_t lba, uint32_t lba_count,
			    spdk_nvme_cmd_cb cb_fn, void *cb_arg, uint32_t io_flags,
			    spdk_nvme_req_reset_sgl_cb reset_sgl_fn,
			    spdk_nvme_req_next_sge_cb next_sge_fn);

```

## SPDK Blobstore: A Look Inside the NVM Optimized Allocator
PPT中介绍的代码：spdk/examples/blob/hello_world/hello_blob.c

```c
./build/examples/hello_blob  ./examples/blob/hello_world/hello_blob.json
[2023-06-20 18:58:03.591974] Starting SPDK v23.05-pre git sha1 ee06693c3 / DPDK 22.11.1 initialization...
[2023-06-20 18:58:03.592772] [ DPDK EAL parameters: hello_blob --no-shconf -c 0x1 --huge-unlink --log-level=lib.eal:6 --log-level=lib.cryptodev:5 --log-level=user1:6 --iova-mode=pa --base-virtaddr=0x200000000000 --match-allocations --file-prefix=spdk_pid59413 ]
TELEMETRY: No legacy callbacks, legacy socket not created
[2023-06-20 18:58:03.732576] app.c: 738:spdk_app_start: *NOTICE*: Total cores available: 1
[2023-06-20 18:58:04.022598] reactor.c: 937:reactor_run: *NOTICE*: Reactor started on core 0
[2023-06-20 18:58:04.420790] accel_sw.c: 601:sw_accel_module_init: *NOTICE*: Accel framework software module initialized.
[2023-06-20 18:58:04.692072] hello_blob.c: 386:hello_start: *NOTICE*: entry
[2023-06-20 18:58:04.695777] hello_blob.c: 345:bs_init_complete: *NOTICE*: entry
[2023-06-20 18:58:04.696207] hello_blob.c: 353:bs_init_complete: *NOTICE*: blobstore: 0x563aa7539de0
[2023-06-20 18:58:04.696298] hello_blob.c: 332:create_blob: *NOTICE*: entry
[2023-06-20 18:58:04.696457] hello_blob.c: 311:blob_create_complete: *NOTICE*: entry
[2023-06-20 18:58:04.696579] hello_blob.c: 319:blob_create_complete: *NOTICE*: new blob id 4294967296
[2023-06-20 18:58:04.696689] hello_blob.c: 280:open_complete: *NOTICE*: entry
[2023-06-20 18:58:04.696801] hello_blob.c: 290:open_complete: *NOTICE*: blobstore has FREE clusters of 15
[2023-06-20 18:58:04.696911] hello_blob.c: 256:resize_complete: *NOTICE*: resized blob now has USED clusters of 15
[2023-06-20 18:58:04.697014] hello_blob.c: 233:sync_complete: *NOTICE*: entry
[2023-06-20 18:58:04.697098] hello_blob.c: 195:blob_write: *NOTICE*: entry
[2023-06-20 18:58:04.697263] hello_blob.c: 178:write_complete: *NOTICE*: entry
[2023-06-20 18:58:04.697386] hello_blob.c: 153:read_blob: *NOTICE*: entry
[2023-06-20 18:58:04.697475] hello_blob.c: 126:read_complete: *NOTICE*: entry
[2023-06-20 18:58:04.697568] hello_blob.c: 140:read_complete: *NOTICE*: read SUCCESS and data matches!
[2023-06-20 18:58:04.697703] hello_blob.c: 106:delete_blob: *NOTICE*: entry
[2023-06-20 18:58:04.699957] hello_blob.c:  87:delete_complete: *NOTICE*: entry
[2023-06-20 18:58:04.700400] hello_blob.c:  50:unload_complete: *NOTICE*: entry
[2023-06-20 18:58:04.783541] hello_blob.c: 459:main: *NOTICE*: SUCCESS!
```
配置文件并不用-c指定而是硬编码

```c
	/*
	 * Setup a few specifics before we init, for most SPDK cmd line
	 * apps, the config file will be passed in as an arg but to make
	 * this example super simple we just hardcode it. We also need to
	 * specify a name for the app.
	 */
	opts.name = "hello_blob";
	opts.json_config_file = argv[1];
```

hello_blob.c简单易懂，全都是回调函数，由下至上看过去就可以了，主要就是看看各个api的使用

&emsp; Message passing is efficient, but it results in asynchronous code. Unfortunately, asynchronous code is a challenge in C. It's often implemented by passing function pointers that are called when an operation completes. This chops up the code so that it isn't easy to follow, especially through logic branches. The best solution is to use a language with support for futures and promises, such as C++, Rust, Go, or almost any other higher level language. However, SPDK is a low level library and requires very wide compatibility and portability, so we've elected to stay with plain old C.
&emsp; We do have a few recommendations to share, though. For simple callback chains, it's easiest if you write the functions from bottom to top. By that we mean if function foo performs some asynchronous operation and when that completes function bar is called, then function bar performs some operation that calls function baz on completion, a good way to write it is as such:

```c
void baz(void *ctx) {
        ...
}
 
void bar(void *ctx) {
        async_op(baz, ctx);
}
 
void foo(void *ctx) {
        async_op(bar, ctx);
}
```
&emsp; Don't split these functions up - keep them as a nice unit that can be read from bottom to top.

看了event的代码与文档
spdk/include/spdk/env.h
/spdk/doc/event.md

```c
/**
 * Start the framework.
 *
 * Before calling this function, opts must be initialized by
 * spdk_app_opts_init(). Once started, the framework will call start_fn on
 * an spdk_thread running on the current system thread with the
 * argument provided.
 *
 * If opts->delay_subsystem_init is set
 * (e.g. through --wait-for-rpc flag in spdk_app_parse_args())
 * this function will only start a limited RPC server accepting
 * only a few RPC commands - mostly related to pre-initialization.
 * With this option, the framework won't be started and start_fn
 * won't be called until the user sends an `rpc_framework_start_init`
 * RPC command, which marks the pre-initialization complete and
 * allows start_fn to be finally called.
 *
 * This call will block until spdk_app_stop() is called. If an error
 * condition occurs during the initialization code within spdk_app_start(),
 * this function will immediately return before invoking start_fn.
 *
 * \param opts_user Initialization options used for this application. It should not be
 *             NULL. And the opts_size value inside the opts structure should not be zero.
 * \param start_fn Entry point that will execute on an internally created thread
 *                 once the framework has been started.
 * \param ctx Argument passed to function start_fn.
 *
 * \return 0 on success or non-zero on failure.
 */
int spdk_app_start(struct spdk_app_opts *opts_user, spdk_msg_fn start_fn,
		   void *ctx);

/**
 * Perform final shutdown operations on an application using the event framework.
 */
void spdk_app_fini(void);

/**
 * Start shutting down the framework.
 *
 * Typically this function is not called directly, and the shutdown process is
 * started implicitly by a process signal. But in applications that are using
 * SPDK for a subset of its process threads, this function can be called in lieu
 * of a signal.
 */
void spdk_app_start_shutdown(void);
/**
 * Stop the framework.
 *
 * This does not wait for all threads to exit. Instead, it kicks off the shutdown
 * process and returns. Once the shutdown process is complete, spdk_app_start()
 * will return.
 *
 * \param rc The rc value specified here will be returned to caller of spdk_app_start().
 */
void spdk_app_stop(int rc);
```
### spdk+rocksdb
参考：[RocksDB Integration](https://spdk.io/doc/blobfs.html)

```bash
# 需安装gflags后再编译rocksdb
git clone https://github.com/gflags/gflags.git 
cd gflags
mkdir build 
cd build
cmake -DBUILD_SHARED_LIBS=ON -DBUILD_STATIC_LIBS=ON -DINSTALL_HEADERS=ON -DINSTALL_SHARED_LIBS=ON -DINSTALL_STATIC_LIBS=ON ..
make && make install
# 编译生成db_bench可执行文件
cd ../..
git clone -b 6.15.fb https://github.com/spdk/rocksdb.git
cd rocksdb
make db_bench SPDK_DIR=../spdk

# 创建blobfs
scripts/gen_nvme.sh --json-with-subsystems > ../rocksdb.json
test/blobfs/mkfs/mkfs ../rocksdb.json Nvme0n1
```
文件夹示意图
![](https://img-blog.csdnimg.cn/7badc3117f2146e5b829650b10f8302a.png)

[Ubuntu20.04安装gflags](https://zhuanlan.zhihu.com/p/458997512)
若未安装gflags则执行db_bench显示如下：
```c
 ./db_bench 
Please install gflags to run rocksdb tools

// 相关代码:db_bench.cc
#ifndef GFLAGS
#include <cstdio>
int main() {
  fprintf(stderr, "Please install gflags to run rocksdb tools\n");
  return 1;
}
#else
#include <rocksdb/db_bench_tool.h>
int main(int argc, char** argv) {
  return ROCKSDB_NAMESPACE::db_bench_tool(argc, argv);
}
#endif  // GFLAGS
```

#### libgflags.so.2.2: cannot open shared object file: No such file or directory

```bash
./db_bench
./db_bench: error while loading shared libraries: libgflags.so.2.2: cannot open shared object file: No such file or directory
ldd db_bench 
        linux-vdso.so.1 (0x00007fff14f4b000)
        libdl.so.2 => /lib/x86_64-linux-gnu/libdl.so.2 (0x00007fda223f7000)
        libpthread.so.0 => /lib/x86_64-linux-gnu/libpthread.so.0 (0x00007fda223d4000)
        libgflags.so.2.2 => not found  
        libz.so.1 => /lib/x86_64-linux-gnu/libz.so.1 (0x00007fda223b8000)
        libnuma.so.1 => /lib/x86_64-linux-gnu/libnuma.so.1 (0x00007fda223ab000)
        librt.so.1 => /lib/x86_64-linux-gnu/librt.so.1 (0x00007fda223a1000)
        libuuid.so.1 => /lib/x86_64-linux-gnu/libuuid.so.1 (0x00007fda22396000)
        libssl.so.1.1 => /lib/x86_64-linux-gnu/libssl.so.1.1 (0x00007fda22303000)
        libcrypto.so.1.1 => /lib/x86_64-linux-gnu/libcrypto.so.1.1 (0x00007fda2202d000)
        libaio.so.1 => /lib/x86_64-linux-gnu/libaio.so.1 (0x00007fda22028000)
        libstdc++.so.6 => /lib/x86_64-linux-gnu/libstdc++.so.6 (0x00007fda21e46000)
        libm.so.6 => /lib/x86_64-linux-gnu/libm.so.6 (0x00007fda21cf7000)
        libgcc_s.so.1 => /lib/x86_64-linux-gnu/libgcc_s.so.1 (0x00007fda21cda000)
        libc.so.6 => /lib/x86_64-linux-gnu/libc.so.6 (0x00007fda21ae8000)
        /lib64/ld-linux-x86-64.so.2 (0x00007fda23113000)
```
libgflags.so.2.2路径未知，查看gflags make install输出

```bash
 make install
[ 25%] Built target gflags_nothreads_shared
[ 50%] Built target gflags_shared
[ 75%] Built target gflags_nothreads_static
[100%] Built target gflags_static
Install the project...
-- Install configuration: "Release"
-- Installing: /usr/local/lib/libgflags.so.2.2.2
-- Installing: /usr/local/lib/libgflags.so.2.2
-- Installing: /usr/local/lib/libgflags.so
-- Installing: /usr/local/lib/libgflags_nothreads.so.2.2.2
-- Installing: /usr/local/lib/libgflags_nothreads.so.2.2
-- Installing: /usr/local/lib/libgflags_nothreads.so
-- Installing: /usr/local/lib/libgflags.a
-- Installing: /usr/local/lib/libgflags_nothreads.a
-- Installing: /usr/local/include/gflags/gflags.h
-- Installing: /usr/local/include/gflags/gflags_declare.h
-- Installing: /usr/local/include/gflags/gflags_completions.h
-- Installing: /usr/local/include/gflags/gflags_gflags.h
-- Installing: /usr/local/lib/cmake/gflags/gflags-config.cmake
-- Installing: /usr/local/lib/cmake/gflags/gflags-config-version.cmake
-- Installing: /usr/local/lib/cmake/gflags/gflags-targets.cmake
-- Installing: /usr/local/lib/cmake/gflags/gflags-targets-release.cmake
-- Installing: /usr/local/lib/cmake/gflags/gflags-nonamespace-targets.cmake
-- Installing: /usr/local/lib/cmake/gflags/gflags-nonamespace-targets-release.cmake
-- Installing: /usr/local/bin/gflags_completions.sh
-- Installing: /usr/local/lib/pkgconfig/gflags.pc
-- Installing: /root/.cmake/packages/gflags/e5f7ce61772240490d3164df06f58ce9
```
增加动态库搜索路径：/usr/local/lib
```bash
export LD_LIBRARY_PATH=$LD_LIBRARY_PATH:/usr/local/lib
```

```bash
ldd db_bench 
        linux-vdso.so.1 (0x00007ffcdeff2000)
        libdl.so.2 => /lib/x86_64-linux-gnu/libdl.so.2 (0x00007f6cfa436000)
        libpthread.so.0 => /lib/x86_64-linux-gnu/libpthread.so.0 (0x00007f6cfa413000)
        libgflags.so.2.2 => /usr/local/lib/libgflags.so.2.2 (0x00007f6cfa3e6000)
        libz.so.1 => /lib/x86_64-linux-gnu/libz.so.1 (0x00007f6cfa3ca000)
        libnuma.so.1 => /lib/x86_64-linux-gnu/libnuma.so.1 (0x00007f6cfa3bd000)
        librt.so.1 => /lib/x86_64-linux-gnu/librt.so.1 (0x00007f6cfa3b3000)
        libuuid.so.1 => /lib/x86_64-linux-gnu/libuuid.so.1 (0x00007f6cfa3a8000)
        libssl.so.1.1 => /lib/x86_64-linux-gnu/libssl.so.1.1 (0x00007f6cfa315000)
        libcrypto.so.1.1 => /lib/x86_64-linux-gnu/libcrypto.so.1.1 (0x00007f6cfa03f000)
        libaio.so.1 => /lib/x86_64-linux-gnu/libaio.so.1 (0x00007f6cfa03a000)
        libstdc++.so.6 => /lib/x86_64-linux-gnu/libstdc++.so.6 (0x00007f6cf9e58000)
        libm.so.6 => /lib/x86_64-linux-gnu/libm.so.6 (0x00007f6cf9d09000)
        libgcc_s.so.1 => /lib/x86_64-linux-gnu/libgcc_s.so.1 (0x00007f6cf9cec000)
        libc.so.6 => /lib/x86_64-linux-gnu/libc.so.6 (0x00007f6cf9afa000)
        /lib64/ld-linux-x86-64.so.2 (0x00007f6cfb152000)
```
**spdk与内核文件系统简单对比**
db_bench spdk相关参数

```c
// rocksdb/tools/db_bench_tool.cc
DEFINE_string(spdk, "", "Name of SPDK configuration file");
DEFINE_string(spdk_bdev, "", "Name of SPDK blockdev to load");
DEFINE_uint64(spdk_cache_size, 4096, "Size of SPDK filesystem cache (in MB)");
```

```bash
root@driver-virtual-machine ~/s/rocksdb (6.15.fb)# ./db_bench --spdk=../rocksdb.json --spdk_bdev=Nvme0n1  --benchmarks=fillrandom --num=1000000 --compression_type=none --spdk_cache_size=1024
[2023-06-20 22:18:35.512845] Starting SPDK v23.05-pre git sha1 ee06693c3 / DPDK 22.11.1 initialization...
[2023-06-20 22:18:35.513502] [ DPDK EAL parameters: rocksdb --no-shconf -c 0x1 --huge-unlink --log-level=lib.eal:6 --log-level=lib.cryptodev:5 --log-level=user1:6 --iova-mode=pa --base-virtaddr=0x200000000000 --match-allocations --file-prefix=spdk_pid136961 ]
TELEMETRY: No legacy callbacks, legacy socket not created
[2023-06-20 22:18:35.634516] app.c: 738:spdk_app_start: *NOTICE*: Total cores available: 1
[2023-06-20 22:18:35.685057] app.c: 447:app_setup_trace: *NOTICE*: Tracepoint Group Mask 0x80 specified.
[2023-06-20 22:18:35.685576] app.c: 448:app_setup_trace: *NOTICE*: Use 'spdk_trace -s rocksdb -p 136961' to capture a snapshot of events at runtime.
[2023-06-20 22:18:35.687013] app.c: 453:app_setup_trace: *NOTICE*: Or copy /dev/shm/rocksdb_trace.pid136961 for offline analysis/debug.
[2023-06-20 22:18:35.687997] reactor.c: 937:reactor_run: *NOTICE*: Reactor started on core 0
[2023-06-20 22:18:35.736796] accel_sw.c: 601:sw_accel_module_init: *NOTICE*: Accel framework software module initialized.
using bdev Nvme0n1
Initializing RocksDB Options from the specified file
Initializing RocksDB Options from command-line flags
RocksDB:    version 6.15
Date:       Tue Jun 20 22:18:36 2023
CPU:        2 * AMD Ryzen 5 4600U with Radeon Graphics
CPUCache:   512 KB
Keys:       16 bytes each (+ 0 bytes user-defined timestamp)
Values:     100 bytes each (50 bytes after compression)
Entries:    1000000
Prefix:    0 bytes
Keys per prefix:    0
RawSize:    110.6 MB (estimated)
FileSize:   62.9 MB (estimated)
Write rate: 0 bytes/second
Read rate: 0 ops/second
Compression: NoCompression
Compression sampling rate: 0
Memtablerep: skip_list
Perf Level: 1
WARNING: Assertions are enabled; benchmarks unnecessarily slow
------------------------------------------------
Initializing RocksDB Options from the specified file
Initializing RocksDB Options from command-line flags
DB path: [/tmp/rocksdbtest-0/dbbench]
fillrandom   :       6.511 micros/op 153577 ops/sec;   17.0 MB/s
```
```bash
root@driver-virtual-machine ~/s/rocksdb (6.15.fb)# ./db_bench   --benchmarks=fillrandom --num=1000000 --compression_type=none 
Initializing RocksDB Options from the specified file
Initializing RocksDB Options from command-line flags
RocksDB:    version 6.15
Date:       Tue Jun 20 22:47:23 2023
CPU:        2 * AMD Ryzen 5 4600U with Radeon Graphics
CPUCache:   512 KB
Keys:       16 bytes each (+ 0 bytes user-defined timestamp)
Values:     100 bytes each (50 bytes after compression)
Entries:    1000000
Prefix:    0 bytes
Keys per prefix:    0
RawSize:    110.6 MB (estimated)
FileSize:   62.9 MB (estimated)
Write rate: 0 bytes/second
Read rate: 0 ops/second
Compression: NoCompression
Compression sampling rate: 0
Memtablerep: skip_list
Perf Level: 1
WARNING: Assertions are enabled; benchmarks unnecessarily slow
------------------------------------------------
Initializing RocksDB Options from the specified file
Initializing RocksDB Options from command-line flags
DB path: [/tmp/rocksdbtest-0/dbbench]
fillrandom   :       8.553 micros/op 116911 ops/sec;   12.9 MB/s
```



# hello_blob

## 文档与源码简要阅读

分支切到23.09，阅读[Blobstore Programmer's Guide](https://spdk.io/doc/blob.html)

![](https://img-blog.csdnimg.cn/5f20c324ddbb4fdb903f52d9a2f15181.png)

![](https://img-blog.csdnimg.cn/05933bb0f16b4a0fa3aaabb6e3ffbe56.png)



**运行hello_blob程序，查看输出**

```bash
root@osd-node0 ~/l/s/b/examples (v23.09.x)# ./hello_blob /root/xxx/spdk/examples/blob/hello_world/hello_blob.json
[2023-10-30 10:42:55.201033] Starting SPDK v23.09.1-pre git sha1 aa8059716 / DPDK 23.07.0 initialization...
[2023-10-30 10:42:55.201151] [ DPDK EAL parameters: hello_blob --no-shconf -c 0x1 --huge-unlink --log-level=lib.eal:6 --log-level=lib.cryptodev:5 --log-level=user1:6 --iova-mode=pa --base-virtaddr=0x200000000000 --match-allocations --file-prefix=spdk_pid247614 ]
TELEMETRY: No legacy callbacks, legacy socket not created
[2023-10-30 10:42:55.209967] app.c: 786:spdk_app_start: *NOTICE*: Total cores available: 1
[2023-10-30 10:42:55.237068] reactor.c: 937:reactor_run: *NOTICE*: Reactor started on core 0
[2023-10-30 10:42:55.307336] hello_blob.c: 386:hello_start: *NOTICE*: entry
[2023-10-30 10:42:55.308734] hello_blob.c: 345:bs_init_complete: *NOTICE*: entry
[2023-10-30 10:42:55.308751] hello_blob.c: 353:bs_init_complete: *NOTICE*: blobstore: 0x560b5be05540
[2023-10-30 10:42:55.308755] hello_blob.c: 332:create_blob: *NOTICE*: entry
[2023-10-30 10:42:55.308763] hello_blob.c: 311:blob_create_complete: *NOTICE*: entry
[2023-10-30 10:42:55.308766] hello_blob.c: 319:blob_create_complete: *NOTICE*: new blob id 4294967296
[2023-10-30 10:42:55.308772] hello_blob.c: 280:open_complete: *NOTICE*: entry
[2023-10-30 10:42:55.308775] hello_blob.c: 290:open_complete: *NOTICE*: blobstore has FREE clusters of 15
[2023-10-30 10:42:55.308781] hello_blob.c: 256:resize_complete: *NOTICE*: resized blob now has USED clusters of 15
[2023-10-30 10:42:55.308786] hello_blob.c: 233:sync_complete: *NOTICE*: entry
[2023-10-30 10:42:55.308789] hello_blob.c: 195:blob_write: *NOTICE*: entry
[2023-10-30 10:42:55.308794] hello_blob.c: 178:write_complete: *NOTICE*: entry
[2023-10-30 10:42:55.308797] hello_blob.c: 153:read_blob: *NOTICE*: entry
[2023-10-30 10:42:55.308800] hello_blob.c: 126:read_complete: *NOTICE*: entry
[2023-10-30 10:42:55.308803] hello_blob.c: 140:read_complete: *NOTICE*: read SUCCESS and data matches!
[2023-10-30 10:42:55.308807] hello_blob.c: 106:delete_blob: *NOTICE*: entry
[2023-10-30 10:42:55.309275] hello_blob.c:  87:delete_complete: *NOTICE*: entry
[2023-10-30 10:42:55.309289] hello_blob.c:  50:unload_complete: *NOTICE*: entry
[2023-10-30 10:42:55.374886] hello_blob.c: 459:main: *NOTICE*: SUCCESS!
```





**调用API顺序**

```c
// Create a blobstore block device from a bdev.
rc = spdk_bdev_create_bs_dev_ext("Malloc0", base_bdev_event_cb, NULL, &bs_dev);

// Initialize a blobstore on the given device.
spdk_bs_init(bs_dev, NULL, bs_init_complete, hello_context);

// Create a new blob with default option values on the given blobstore. The new blob id will be passed to the callback function.
spdk_bs_create_blob(hello_context->bs, blob_create_complete, hello_context);

// Open a blob from the given blobstore.
spdk_bs_open_blob(hello_context->bs, hello_context->blobid, open_complete, hello_context);

// Resize a blob to 'sz' clusters. These changes are not persisted to disk until spdk_bs_md_sync_blob() is called. If called before previous resize finish, it will fail with errno -EBUSY
spdk_blob_resize(hello_context->blob, free, resize_complete, hello_context);

// Sync a blob. Make a blob persistent. This applies to open, resize, set xattr, and remove xattr. These operations will not be persistent until the blob has been synced.
spdk_blob_sync_md(hello_context->blob, sync_complete, hello_context);

// Allocate an I/O channel for the given blobstore.
hello_context->channel = spdk_bs_alloc_io_channel(hello_context->bs);

// Write data to a blob.
spdk_blob_io_write(hello_context->blob, hello_context->channel, hello_context->write_buff, 0, 1, write_complete, hello_context);

// Read data from a blob.
spdk_blob_io_read(hello_context->blob, hello_context->channel, hello_context->read_buff, 0, 1, read_complete, hello_context);

// Close a blob. This will automatically sync.
spdk_blob_close(hello_context->blob, delete_blob, hello_context);

// Delete an existing blob from the given blobstore.
spdk_bs_delete_blob(hello_context->bs, hello_context->blobid, delete_complete, hello_context);

// Free the I/O channel.
spdk_bs_free_io_channel(hello_context->channel);

// Unload the blobstore. It will flush all volatile data to disk.
spdk_bs_unload(hello_context->bs, unload_complete, hello_context);


// 其他API

// Get the io unit size in bytes.
hello_context->io_unit_size = spdk_bs_get_io_unit_size(hello_context->bs);

// Get the number of free clusters.
free = spdk_bs_free_cluster_count(hello_context->bs);

// Get the number of clusters allocated to the blob.
total = spdk_blob_get_num_clusters(hello_context->blob);



struct hello_context_t {
	struct spdk_blob_store *bs;
	struct spdk_blob *blob;
	spdk_blob_id blobid;
	struct spdk_io_channel *channel;
	uint8_t *read_buff;
	uint8_t *write_buff;
	uint64_t io_unit_size;
	int rc;
};
```

更改打印级别，查看debug输出

```c
./configure --enable-debug
    
static void hello_start(void *arg1) {
  spdk_log_set_flag("all");
  spdk_log_set_print_level(SPDK_LOG_DEBUG);
  // ...
}
```



## 问题研究

### blob id相关

**blob id的分配**

```c
// 相关代码
spdk_bs_create_blob
	bs_create_blob
    
	spdk_spin_lock(&bs->used_lock);
	// 找到第一个为0的位置
	page_idx = spdk_bit_array_find_first_clear(bs->used_md_pages, 0);
	if (page_idx == UINT32_MAX) {
		spdk_spin_unlock(&bs->used_lock);
		cb_fn(cb_arg, 0, -ENOMEM);
		return;
	}
	// 将对应位置位
	spdk_bit_array_set(bs->used_blobids, page_idx);
	bs_claim_md_page(bs, page_idx);
	spdk_spin_unlock(&bs->used_lock);
	// 计算索引对应id
	id = bs_page_to_blobid(page_idx);

	SPDK_DEBUGLOG(blob, "Creating blob with id 0x%" PRIx64 " at page %u\n", id, page_idx);

// 输出
blobstore.c:5989:bs_create_blob: *DEBUG*: Creating blob with id 0x100000000 at page 0
```



```c
// 涉及的成员变量（两个bitmap）
struct spdk_blob_store {
    struct spdk_bit_array		*used_md_pages;		/* Protected by used_lock */
    struct spdk_bit_array		*used_blobids;
}

// used_md_pages的大小
	if (opts.num_md_pages == SPDK_BLOB_OPTS_NUM_MD_PAGES) {
		/* By default, allocate 1 page per cluster.
		 * Technically, this over-allocates metadata
		 * because more metadata will reduce the number
		 * of usable clusters. This can be addressed with
		 * more complex math in the future.
		 */
        // 一个cluster一个元数据页
		bs->md_len = bs->total_clusters;
	} else {
		bs->md_len = opts.num_md_pages;
	}
	rc = spdk_bit_array_resize(&bs->used_md_pages, bs->md_len);
	rc = spdk_bit_array_resize(&bs->used_blobids, bs->md_len);
```

**页索引与blob id的匹配**

```c
// 元数据页索引& (1<<32)即为对应blob id，之所以这样操作是为了避免程序将元数据索引与blob id混用
static inline uint64_t
bs_blobid_to_page(spdk_blob_id id)
{
	return id & 0xFFFFFFFF;
}

/* The blob id is a 64 bit number. The lower 32 bits are the page_idx. The upper
 * 32 bits are not currently used. Stick a 1 there just to catch bugs where the
 * code assumes blob id == page_idx.
 */
static inline spdk_blob_id
bs_page_to_blobid(uint64_t page_idx)
{
	if (page_idx > UINT32_MAX) {
		return SPDK_BLOBID_INVALID;
	}
	return SPDK_BLOB_BLOBID_HIGH_BIT | page_idx;
}

```





元数据线程









super block格式



元数据区域格式



blob 元数据格式



写数据流程



读数据流程

# SPDK接口使用方式

代码来自：[leveldb-direct](https://github.com/ls4154/leveldb-direct)，使用spdk底层驱动接口实现leveldb env接口

```c++
void write_complete(void *arg, const struct spdk_nvme_cpl *completion)  // 写回调函数
{
  int* compl_status = static_cast<int*>(arg);
  *compl_status = 1;
  if (spdk_nvme_cpl_is_error(completion)) {
    fprintf(stderr, "spdk write cpl error\n");
    *compl_status = 2;
  }
}
// 同步调用时chk_compl为nullptr，异步调用时chk_compl指向int变量compl_status_
void write_from_buf(struct spdk_nvme_ns *ns, struct spdk_nvme_qpair *qpair,
                    void *buf, uint64_t lba, uint32_t cnt, int* chk_compl)
{
  int rc;

  if (chk_compl != nullptr) {  // 异步调用，调用spdk_nvme_ns_cmd_write后不需要阻塞等待，直接返回
    rc = spdk_nvme_ns_cmd_write(ns, qpair, buf, lba, cnt, write_complete, chk_compl, 0);
    if (rc != 0) {
      fprintf(stderr, "spdk cmd wirte failed\n");
      exit(1);
    }
    return;
  }
  // 同步调用，调用spdk_nvme_ns_cmd_write接口后轮询CQ，直到执行完成
  int l_chk_cpl = 0;
  rc = spdk_nvme_ns_cmd_write(ns, qpair, buf, lba, cnt, write_complete, &l_chk_cpl, 0);
  if (rc != 0) {
    fprintf(stderr, "spdk write failed\n");
    exit(1);
  }
  while (!l_chk_cpl)
    spdk_nvme_qpair_process_completions(qpair, 0);
}
```





# 相关资料

[SPDK: A Development Kit to Build High Performance Storage Applications](https://ieeexplore.ieee.org/abstract/document/8241103)

[SPDK NVMe: An In-depth Look at its Architecture and Design](https://www.snia.org/educational-library/spdk-nvme-depth-look-its-architecture-and-design-2018)

[硬核虚拟化技术 SR-IOV的原理及探索](https://blog.csdn.net/Memblaze_2011/article/details/88635993)
[DPU和CPU互联的接口之争：Virtio还是SR-IOV？](https://aijishu.com/a/1060000000228117#item-2)
[SPDK概览](https://blog.csdn.net/ZVAyIVqt0UFji/article/details/119396007?spm=1001.2014.3001.5502)
[SPDK bdev详解](https://blog.csdn.net/ZVAyIVqt0UFji/article/details/121279191?spm=1001.2014.3001.5502)
