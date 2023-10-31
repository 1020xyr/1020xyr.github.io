---
title: NVMe驱动 请求路径学习记录
date: 2022-05-25 21:05:52
tags: 学习 驱动开发 linux nvme驱动
categories: 
- [内核驱动开发记录]
- [学习记录]
- [zns ssd-femu-nvme-spdk-dpdk]
index_img: https://img-blog.csdnimg.cn/225b8979d7624d13a5645fa144894e8f.jpeg
---
<meta name="referrer" content="no-referrer" />


由《深入浅出SSD》 6.5节trace分析可知，主机读请求的执行流程如下：

 1. 主机准备好命令放在SQ
 2. 主机通过写SQ的Tail DB，通知SSD来取命令（Memory Write TLP）
 3. SSD收到通知，去主机端的SQ取指令（Memory Read TLP）
 4. SSD执行命令，把数据传给主机（Memory Write TLP）
 5. SSD往主机的CQ中返回状态
 6. SSD采用中断的方式告诉主机去处理CQ
 7. 主机处理相应CQ，更新CQ Head DB（Memory Write TLP）
 
可以合理猜测SQ CQ 用户数据存放均为DMA内存区域。

以4.19.90版本的kernel源码，简要分析请求路径，在之后的分析中忽略了非常多的部分。
主要涉及的文件有
```bash
drivers\nvme\host\nvme.h
\include\linux\nvme.h
drivers\nvme\host\pci.c
drivers\nvme\host\core.c
```
内核函数查询网站：[bootlin](https://elixir.bootlin.com/linux/v4.19.245/A/ident/nvme_queue_rq)
源码阅读环境：[Windows 搭建 opengrok|极客教程](https://geek-docs.com/personal/obama/windows-setup-opengrok.html)
涉及到的主要函数有
```c
1457  static const struct blk_mq_ops nvme_mq_admin_ops = {
1458  	.queue_rq	= nvme_queue_rq,		// 请求处理函数
1459  	.complete	= nvme_pci_complete_rq,	// 请求完成时调用的函数
1464  };
1465  
1466  static const struct blk_mq_ops nvme_mq_ops = {
1467  	.queue_rq	= nvme_queue_rq,       // 请求处理函数
1468  	.complete	= nvme_pci_complete_rq,// 请求完成时调用的函数
1474  };

937  static irqreturn_t nvme_irq(int irq, void *data)  // 中断处理函数
```

>阅读代码时，为了更快的了解代码大致功能，直接从请求的入口点函数开始看，而后对其关键的结构体，全局搜索结构体成员，找到初始化过程，这样看代码更有连贯性。阅读函数时，主要看函数对哪些关键结构体进行了填充或修改，只看最简单的分支。如果按顺序从模块加载函数—探测函数等一系列函数来看，看了几个嵌套的函数就全忘光了，抓不住重点。不过在刚开始看源码时可以先大致按顺序看一遍代码。

从入口点请求队列处理函数nvme_queue_rq开始分析
```c
806  static blk_status_t nvme_queue_rq(struct blk_mq_hw_ctx *hctx,
807  			 const struct blk_mq_queue_data *bd)
808  {
809  	struct nvme_ns *ns = hctx->queue->queuedata;
810  	struct nvme_queue *nvmeq = hctx->driver_data;
811  	struct nvme_dev *dev = nvmeq->dev;
812  	struct request *req = bd->rq;
813  	struct nvme_command cmnd;
814  	blk_status_t ret;
815  
816  	/*
817  	 * We should not need to do this, but we're still using this to
818  	 * ensure we can drain requests on a dying queue.
819  	 */
820  	if (unlikely(nvmeq->cq_vector < 0))
821  		return BLK_STS_IOERR;
822  
823  	ret = nvme_setup_cmd(ns, req, &cmnd);	// 设置nvme命令
824  	if (ret)
825  		return ret;
826  
827  	ret = nvme_init_iod(req, dev);			// 初始化请求元数据
828  	if (ret)
829  		goto out_free_cmd;
830  
831  	if (blk_rq_nr_phys_segments(req)) {
832  		ret = nvme_map_data(dev, req, &cmnd);	// 映射用户数据
833  		if (ret)
834  			goto out_cleanup_iod;
835  	}
836  
837  	blk_mq_start_request(req);
838  	nvme_submit_cmd(nvmeq, &cmnd);				// 将nvme命令复制到SQ，并写SQ的Tail DB
839  	return BLK_STS_OK;
840  out_cleanup_iod:
841  	nvme_free_iod(dev, req);
842  out_free_cmd:
843  	nvme_cleanup_cmd(req);
844  	return ret;
845  }
```
可以参考博客[linux里的nvme驱动代码分析（加载初始化）](https://blog.csdn.net/panzhenjie/article/details/51581063)，分析的很详细，但太长了，并且版本和我不一致，就没认真看，我只是大概看一下代码，看其中的一小部分。


其中 nvme_iod结构体存储数据，其定义如下

```c
181  /*
182   * The nvme_iod describes the data in an I/O, including the list of PRP
183   * entries.  You can't see it in this data structure because C doesn't let
184   * me express that.  Use nvme_init_iod to ensure there's enough space
185   * allocated to store the PRP list.
186   */
187  struct nvme_iod {
188  	struct nvme_request req;	// 在之后会遇到
189  	struct nvme_queue *nvmeq;
190  	bool use_sgl;
191  	int aborted;
192  	int npages;		/* In the PRP list. 0 means small pool in use */
193  	int nents;		/* Used in scatterlist */
194  	int length;		/* Of data, in bytes */
195  	dma_addr_t first_dma;
196  	struct scatterlist meta_sg; /* metadata requires single contiguous buffer */
197  	struct scatterlist *sg;
198  	struct scatterlist inline_sg[0];
199  };
```
驱动通过blk_mq_rq_to_pdu(rq)得到该结构体指针，结构体空间紧贴着request结构体
在这里存放nvme_iod结构体是为了在请求完成后更好地释放之前申请的数据空间。
```c
/**
 * blk_mq_rq_to_pdu - cast a request to a PDU
 * @rq: the request to be casted
 *
 * Return: pointer to the PDU
 *
 * Driver command data is immediately after the request. So add request to get
 * the PDU.
 */
static inline void *blk_mq_rq_to_pdu(struct request *rq)
{
	return rq + 1;
}

```
这个空间在tagset初始化时申请（全局搜索 cmd_size）

```c
1490  static int nvme_alloc_admin_tags(struct nvme_dev *dev)
1499  		dev->admin_tagset.cmd_size = nvme_pci_cmd_size(dev, false);

2030  static int nvme_dev_add(struct nvme_dev *dev)
2041  		dev->tagset.cmd_size = nvme_pci_cmd_size(dev, false);

374  static unsigned int nvme_pci_cmd_size(struct nvme_dev *dev, bool use_sgl)
375  {
376  	unsigned int alloc_size = nvme_pci_iod_alloc_size(dev,
377  				    NVME_INT_BYTES(dev), NVME_INT_PAGES,
378  				    use_sgl);
379  
380  	return sizeof(struct nvme_iod) + alloc_size;
381  }


```
在nvme_map_data函数中，从参数就可以知道cmnd是作为返回参数来使用，所以只需要关注对cmnd的操作即可。

```c
735  static blk_status_t nvme_map_data(struct nvme_dev *dev, struct request *req,
736  		struct nvme_command *cmnd)
751  	nr_mapped = dma_map_sg_attrs(dev->dev, iod->sg, iod->nents, dma_dir,
752  			DMA_ATTR_NO_WARN);

756  	if (iod->use_sgl)
757  		ret = nvme_pci_setup_sgls(dev, req, &cmnd->rw, nr_mapped);
758  	else
759  		ret = nvme_pci_setup_prps(dev, req, &cmnd->rw);

777  	if (blk_integrity_rq(req))
778  		cmnd->rw.metadata = cpu_to_le64(sg_dma_address(&iod->meta_sg));
```
我不太了解nvme命令格式，PRP SGL寻址的具体细节，但可以看出这个函数大体上就是申请一段空间（prp或sgl结构体首地址？），然后把地址写到nvme命令中。推荐阅读：[linux内核](https://blog.csdn.net/weixin_36145588/category_6954224.html)

接下来分析提交队列与完成队列的相关操作，nvme_queue结构体定义如下
```c
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
其中__iomem是用来个表示指针是指向一个I/O的内存空间。主要是为了驱动程序的通用性考虑。linux系统同时兼容了X86和ARM等类型的处理器平台，对于这两种典型的处理器平台而言，其寄存器访问方式是完全不同的。X86架构的处理器是基于IO指令进行寄存器访问的，而ARM架构的处理器是基于真实存在的32或64位的AMBA总线地址空间来访问寄存器的。

全局搜索以上成员，找到其初始化过程

```c
// sq_cmds
1328  static int nvme_alloc_sq_cmds(struct nvme_dev *dev, struct nvme_queue *nvmeq,
1329  				int qid, int depth)
1330  {
1331  	/* CMB SQEs will be mapped before creation */
1332  	if (qid && dev->cmb && use_cmb_sqes && (dev->cmbsz & NVME_CMBSZ_SQS))
1333  		return 0;
1334  
1335  	nvmeq->sq_cmds = dma_alloc_coherent(dev->dev, SQ_SIZE(depth),
1336  					    &nvmeq->sq_dma_addr, GFP_KERNEL);
1337  	if (!nvmeq->sq_cmds)
1338  		return -ENOMEM;
1339  	return 0;
1340  }
1341  
// cqes
1349  	nvmeq->cqes = dma_zalloc_coherent(dev->dev, CQ_SIZE(depth),
1350  					  &nvmeq->cq_dma_addr, GFP_KERNEL);
// sq_cmds_io
1413  	if (dev->cmb && use_cmb_sqes && (dev->cmbsz & NVME_CMBSZ_SQS)) {
1414  		unsigned offset = (qid - 1) * roundup(SQ_SIZE(nvmeq->q_depth),
1415  						      dev->ctrl.page_size);
1416  		nvmeq->sq_dma_addr = dev->cmb_bus_addr + offset;
1417  		nvmeq->sq_cmds_io = dev->cmb + offset;
1418  	}
// admin命令：将总线地址写入SSD寄存器
1579  	lo_hi_writeq(nvmeq->sq_dma_addr, dev->bar + NVME_REG_ASQ);  // Admin SQ Base Address
1580  	lo_hi_writeq(nvmeq->cq_dma_addr, dev->bar + NVME_REG_ACQ);  // Admin CQ Base Address

// IO命令SQ CQ
// adapter_alloc_sq
1053  	c.create_sq.opcode = nvme_admin_create_sq;
1054  	c.create_sq.prp1 = cpu_to_le64(nvmeq->sq_dma_addr);
1055  	c.create_sq.sqid = cpu_to_le16(qid);
1056  	c.create_sq.qsize = cpu_to_le16(nvmeq->q_depth - 1);
1057  	c.create_sq.sq_flags = cpu_to_le16(flags);
1058  	c.create_sq.cqid = cpu_to_le16(qid);
1059  
1060  	return nvme_submit_sync_cmd(dev->ctrl.admin_q, &c, NULL, 0);
// adapter_alloc_cq
1023  	c.create_cq.opcode = nvme_admin_create_cq;
1024  	c.create_cq.prp1 = cpu_to_le64(nvmeq->cq_dma_addr);
1025  	c.create_cq.cqid = cpu_to_le16(qid);
1026  	c.create_cq.qsize = cpu_to_le16(nvmeq->q_depth - 1);
1027  	c.create_cq.cq_flags = cpu_to_le16(flags);
1028  	c.create_cq.irq_vector = cpu_to_le16(vector);
1029  
1030  	return nvme_submit_sync_cmd(dev->ctrl.admin_q, &c, NULL, 0);
// CMB的映射
1682  	dev->cmb = ioremap_wc(pci_resource_start(pdev, bar) + offset, size);
1683  	if (!dev->cmb)
1684  		return;
1685  	dev->cmb_bus_addr = pci_bus_address(pdev, bar) + offset;
1686  	dev->cmb_size = size;
// q_db
nvmeq->q_db = &dev->dbs[qid * 2 * dev->db_stride];
adminq->q_db = dev->dbs;
//其中dev->dbs db_stride
dev->dbs = dev->bar + NVME_REG_DBS;
dev->db_stride = 1 << NVME_CAP_STRIDE(dev->ctrl.cap);
// 其中dev->bar
dev->bar = ioremap(pci_resource_start(pdev, 0), size);

```
关于SQ CQ DB的内容建议阅读[NVME-SQ、CQ & DoorBell](https://www.cnblogs.com/marton/p/12520406.html)


接下来看nvme_submit_cmd函数
```c
447  static void nvme_submit_cmd(struct nvme_queue *nvmeq, struct nvme_command *cmd)
448  {
449  	spin_lock(&nvmeq->sq_lock);
450  	if (nvmeq->sq_cmds_io)
451  		memcpy_toio(&nvmeq->sq_cmds_io[nvmeq->sq_tail], cmd,
452  				sizeof(*cmd));
453  	else
454  		memcpy(&nvmeq->sq_cmds[nvmeq->sq_tail], cmd, sizeof(*cmd));
455  
456  	if (++nvmeq->sq_tail == nvmeq->q_depth)
457  		nvmeq->sq_tail = 0;
458  	if (nvme_dbbuf_update_and_check_event(nvmeq->sq_tail,
459  			nvmeq->dbbuf_sq_db, nvmeq->dbbuf_sq_ei))
460  		writel(nvmeq->sq_tail, nvmeq->q_db);
461  	spin_unlock(&nvmeq->sq_lock);
462  }
463  
```

可以看出当ssd使用CMB时，采用memcpy_toio方式复制SQ命令
>CMB

SSD控制器只向host端暴露了很少量的寄存器存储空间，并未将其内部的数百兆甚至上GB的DRAM空间映射到host物理地址空间。而且，驱动程序先把对应的指针通知给SSD控制器，然后SSD控制器需要主动从Host主存取指令和数据。有人可能会想，为何驱动程序不直接将指令及数据写入到SSD的DRAM中呢？原因是CPU如果把这事都自己干了，那就忙不过来了，会深陷到Load/Stor指令移动数据，其他活就没法干了。

 但是如果CPU将整条指令而不是指针直接写到SSD端的DRAM的话，并不耗费太多资源，此时能够节省一次PCIE往返及一次SSD控制器内部的中断处理。于是，人们就想将SSD控制器上的一小段DRAM空间映射到host物理地址空间从而可以让驱动直接写指令进去，甚至写一些数据进去也是可以的。这块被映射到host物理地址空间的DRAM空间便被称为CMB了。 
[关于SSD HMB与CMB](https://blog.csdn.net/TV8MbnO2Y2RfU/article/details/78103780)

dbbuf_xxx的功能我不咋知道，就懒得管了。

```c
298  static inline int nvme_dbbuf_need_event(u16 event_idx, u16 new_idx, u16 old)
299  {
300  	return (u16)(new_idx - event_idx - 1) < (u16)(new_idx - old);
301  }
302  
303  /* Update dbbuf and return true if an MMIO is required */
304  static bool nvme_dbbuf_update_and_check_event(u16 value, u32 *dbbuf_db,
305  					      volatile u32 *dbbuf_ei)
306  {
307  	if (dbbuf_db) {
308  		u16 old_value;
309  
310  		/*
311  		 * Ensure that the queue is written before updating
312  		 * the doorbell in memory
313  		 */
314  		wmb();
315  
316  		old_value = *dbbuf_db;
317  		*dbbuf_db = value;
318  
319  		/*
320  		 * Ensure that the doorbell is updated before reading the event
321  		 * index from memory.  The controller needs to provide similar
322  		 * ordering to ensure the envent index is updated before reading
323  		 * the doorbell.
324  		 */
325  		mb();
326  
327  		if (!nvme_dbbuf_need_event(*dbbuf_ei, value, old_value))
328  			return false;
329  	}
330  
331  	return true;
332  }
```
可以看到nvme_submit_cmd函数的主要功能就是将nvme命令放到SQ中，并写sq tail DB。

之后的步骤全是SSD来完成，直接跳到第七步主机处理中断。
在中断请求处理函数驱动需要处理CQ中的应答信息，通知上层相应请求已完成并返回请求结果。
中断请求处理函数为

```c
937  static irqreturn_t nvme_irq(int irq, void *data)
938  {
939  	struct nvme_queue *nvmeq = data;
940  	irqreturn_t ret = IRQ_NONE;
941  	u16 start, end;
942  
943  	spin_lock(&nvmeq->cq_lock);
944  	if (nvmeq->cq_head != nvmeq->last_cq_head)
945  		ret = IRQ_HANDLED;
946  	nvme_process_cq(nvmeq, &start, &end, -1);		//找到当前CQ队列的尾部，并更新cq_head
947  	nvmeq->last_cq_head = nvmeq->cq_head;
948  	spin_unlock(&nvmeq->cq_lock);
949  
950  	if (start != end) {
951  		nvme_complete_cqes(nvmeq, start, end);	   // 依次处理CQ队列中的请求
952  		return IRQ_HANDLED;
953  	}
954  
955  	return ret;
956  }
```
nvme_process_cq函数

```c
919  static inline bool nvme_process_cq(struct nvme_queue *nvmeq, u16 *start,
920  		u16 *end, int tag)
921  {
922  	bool found = false;
923  
924  	*start = nvmeq->cq_head;
925  	while (!found && nvme_cqe_pending(nvmeq)) {
926  		if (nvmeq->cqes[nvmeq->cq_head].command_id == tag)	// -1应该代表当前位置并未请求
927  			found = true;
928  		nvme_update_cq_head(nvmeq);		// 当做环形队列，+1
929  	}
930  	*end = nvmeq->cq_head;
931  
932  	if (*start != *end)		// CQ Head需要更新
933  		nvme_ring_cq_doorbell(nvmeq);	// 和nvme_submit_cmd操作类似
934  	return found;
935  }
```
nvme_complete_cqes函数

```c
900  static void nvme_complete_cqes(struct nvme_queue *nvmeq, u16 start, u16 end)
901  {
902  	while (start != end) {
903  		nvme_handle_cqe(nvmeq, start);	// 处理单个请求
904  		if (++start == nvmeq->q_depth)
905  			start = 0;
906  	}
907  }

// unlikely分支不用看
871  static inline void nvme_handle_cqe(struct nvme_queue *nvmeq, u16 idx)
872  {
873  	volatile struct nvme_completion *cqe = &nvmeq->cqes[idx];
874  	struct request *req;
875  
876  	if (unlikely(cqe->command_id >= nvmeq->q_depth)) {
877  		dev_warn(nvmeq->dev->ctrl.device,
878  			"invalid id %d completed on queue %d\n",
879  			cqe->command_id, le16_to_cpu(cqe->sq_id));
880  		return;
881  	}
882  
883  	/*
884  	 * AEN requests are special as they don't time out and can
885  	 * survive any kind of queue freeze and often don't respond to
886  	 * aborts.  We don't even bother to allocate a struct request
887  	 * for them but rather special case them here.
888  	 */
889  	if (unlikely(nvmeq->qid == 0 &&
890  			cqe->command_id >= NVME_AQ_BLK_MQ_DEPTH)) {
891  		nvme_complete_async_event(&nvmeq->dev->ctrl,
892  				cqe->status, &cqe->result);
893  		return;
894  	}
895  
896  	req = blk_mq_tag_to_rq(*nvmeq->tags, cqe->command_id); // 由tag和索引，找到相应请求
897  	nvme_end_request(req, cqe->status, cqe->result);	
898  }

391  static inline void nvme_end_request(struct request *req, __le16 status,
392  		union nvme_result result)
393  {
394  	struct nvme_request *rq = nvme_req(req);	
395  
396  	rq->status = le16_to_cpu(status) >> 1;
397  	rq->result = result;
398  	/* inject error when permitted by fault injection framework */
399  	nvme_should_fail(req);
400  	blk_mq_complete_request(req);	// 将请求状态设置成完成
401  }
// 从request结构体后取出nvme_request结构体
118  static inline struct nvme_request *nvme_req(struct request *req)
119  {
120  	return blk_mq_rq_to_pdu(req);
121  }
122  
```
nvme_iod结构体和nvme_request结构体都是使用blk_mq_rq_to_pdu(req)方式取出的，实际上nvme_request结构体就是nvme_iod结构体的第一个成员。

在调用了blk_mq_complete_request函数之后，会自动地调用回调函数nvme_pci_complete_rq

```c
847  static void nvme_pci_complete_rq(struct request *req)
848  {
849  	struct nvme_iod *iod = blk_mq_rq_to_pdu(req);
850  
851  	nvme_unmap_data(iod->nvmeq->dev, req);	// 取消映射，释放空间
852  	nvme_complete_rq(req);
853  }
```

```c
251  void nvme_complete_rq(struct request *req)
252  {
253  	blk_status_t status = nvme_error_status(req);
254  
255  	trace_nvme_complete_rq(req);
256  
257  	if (unlikely(status != BLK_STS_OK && nvme_req_needs_retry(req))) {
258  		if ((req->cmd_flags & REQ_NVME_MPATH) &&
259  		    blk_path_error(status)) {
260  			nvme_failover_req(req);
261  			return;
262  		}
263  
264  		if (!blk_queue_dying(req->q)) {
265  			nvme_req(req)->retries++;
266  			blk_mq_requeue_request(req, true);
267  			return;
268  		}
269  	}
270  	blk_mq_end_request(req, status);	// 完成请求处理，返回状态
271  }
```
>blk_mq_start_request() - must be called before starting processing a request;   在nvme_queue_rq函数中调用
blk_mq_requeue_request() - to re-send the request in the queue;
blk_mq_end_request() - to end request processing and notify the upper layers.  在nvme_complete_rq函数中调用

至此就完成了请求路径的简单分析。建议还是自己对照源码看一遍。可以看我的另一篇博客[NVMe驱动学习记录-2](https://www.jiasun.top/blog/NVMe%E9%A9%B1%E5%8A%A8%E5%AD%A6%E4%B9%A0%E8%AE%B0%E5%BD%95-2.html)，在下一篇博客将分析从系统调用到驱动的数据通路。也就是read  write的buf怎样被读取或写入的。
