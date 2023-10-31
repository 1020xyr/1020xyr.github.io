---
title: linux UIO驱动实践
date: 2023-03-07 22:25:33
tags: UIO
categories: 
- [踩坑日记]
- [内核驱动开发记录]
- [zns ssd-femu-nvme-spdk-dpdk]
index_img: https://img-blog.csdnimg.cn/693bfec7358749978e789cce6e7df1c1.png
---
<meta name="referrer" content="no-referrer" />





# 环境搭建
[Ubuntu20地址](https://repo.huaweicloud.com/ubuntu-releases/20.04/)
虚拟机安装与配置见博客开头：[驱动虚拟环境搭建记录](https://editor.csdn.net/md/?articleId=125817124)

一直以为用镜像直接安装的Ubuntu没有内核源码，不能用来编译驱动，只能由源码编译内核后切换内核才能进行驱动的编译，没想到一安装完就可以编译了，错误的印象。
**用hello world测试环境是否搭建成功**
```c
#include <linux/init.h>
#include <linux/module.h>

MODULE_LICENSE("Dual BSD/GPL");
MODULE_AUTHOR("Hcamal");

int hello_init(void)
{
    printk(KERN_INFO "Hello World\n");
    return 0;
}

void hello_exit(void)
{
    printk(KERN_INFO "Goodbye World\n");
}

module_init(hello_init);
module_exit(hello_exit);
```

```bash
obj-m+=hello.o
all:
	make -C /lib/modules/$(shell uname -r)/build/ M=$(PWD) modules
clean:
	make -C /lib/modules/$(shell uname -r)/build/ M=$(PWD) clean
```



# platform 设备驱动
本来想直接编译运行[Linux UIO驱动实例介绍](https://blog.csdn.net/hpu11/article/details/109405906)的代码看一下效果，但遇到了一些问题：
Skipping BTF generation for /root/driver/test/hello.ko due to unavailability of vmlinux

移动/sys/kernel/btf/vmlinux至/lib/modules/$(shell uname -r)/build/目录
[Skipping BTF generation xxx. due to unavailability of vmlinux on Ubuntu 21.04](https://askubuntu.com/questions/1348250/skipping-btf-generation-xxx-due-to-unavailability-of-vmlinux-on-ubuntu-21-04)

[ 6657.847233] hello: Unknown symbol __uio_register_device (err -2)
[ 6657.847260] hello: Unknown symbol uio_unregister_device (err -2)

运行modprobe uio
[安装驱动错误 Unknown symbol __uio_register_device (err -2)](https://www.jianshu.com/p/5add5feea148)

Driver 'test' needs updating - please use bus_type methods
![](https://img-blog.csdnimg.cn/a4944b5f4c8b4104842f7adddda069a8.png)
[linux设备驱动(3)devive_driver 详解](https://www.cnblogs.com/xinghuo123/p/12871997.html)


想了想，还是自己写一个简单的demo，加深一下印象。由于没有实际的物理设备，为了触发驱动的探测函数，就需要借助platform设备与platform驱动。推荐博客：
[Linux 设备驱动开发 —— platform 设备驱动](https://blog.csdn.net/zqixiao_09/article/details/50865480)
[Linux platform device driver and design](https://hackmd.io/@ztex/S1zGKxQHF)
[platform_driver——dm9000.c](https://elixir.bootlin.com/linux/latest/source/drivers/net/ethernet/davicom/dm9000.c)
[platform_device——board-dm355-evm.c](https://elixir.bootlin.com/linux/latest/source/arch/arm/mach-davinci/board-dm355-evm.c#L102)

hello world demo如下：
```c
#include <linux/module.h>
#include <linux/platform_device.h>
#define DRV_NAME "test"
static int drv_probe(struct platform_device *pdev) {
  printk("call probe function dev name is:%s\n", pdev->name);
  return 0;
}

static int drv_remove(struct platform_device *pdev) {
  printk("call remove function dev name is:%s\n", pdev->name);
  return 0;
}
static struct platform_device *test_device;
static struct platform_driver test_driver = {
    .driver =
        {
            .name = DRV_NAME,
        },
    .probe = drv_probe,
    .remove = drv_remove,
};

static int __init test_init(void) {
  test_device = platform_device_register_simple(DRV_NAME, -1, NULL, 0);
  return platform_driver_register(&test_driver);
}

static void __exit test_exit(void) {
  platform_device_unregister(test_device);
  platform_driver_unregister(&test_driver);
}

MODULE_LICENSE("GPL");
MODULE_DESCRIPTION("test driver");
module_init(test_init);
module_exit(test_exit);
```
![](https://img-blog.csdnimg.cn/a6a3ec06e19a428bb62daf44ff29bb81.png)
相关函数与结构体
```c
struct platform_device {
	const char	*name;
	int		id;
	bool		id_auto;
	struct device	dev;
	u64		platform_dma_mask;
	struct device_dma_parameters dma_parms;
	u32		num_resources;
	struct resource	*resource;

	const struct platform_device_id	*id_entry;
	/*
	 * Driver name to force a match.  Do not set directly, because core
	 * frees it.  Use driver_set_override() to set or clear it.
	 */
	const char *driver_override;

	/* MFD cell pointer */
	struct mfd_cell *mfd_cell;

	/* arch specific additions */
	struct pdev_archdata	archdata;
};

struct platform_driver {
	int (*probe)(struct platform_device *);
	int (*remove)(struct platform_device *);
	void (*shutdown)(struct platform_device *);
	int (*suspend)(struct platform_device *, pm_message_t state);
	int (*resume)(struct platform_device *);
	struct device_driver driver;
	const struct platform_device_id *id_table;
	bool prevent_deferred_probe;
	/*
	 * For most device drivers, no need to care about this flag as long as
	 * all DMAs are handled through the kernel DMA API. For some special
	 * ones, for example VFIO drivers, they know how to manage the DMA
	 * themselves and set this flag so that the IOMMU layer will allow them
	 * to setup and manage their own I/O address space.
	 */
	bool driver_managed_dma;
};

/**
 * platform_device_register_simple - add a platform-level device and its resources
 * @name: base name of the device we're adding
 * @id: instance id
 * @res: set of resources that needs to be allocated for the device
 * @num: number of resources
 *
 * This function creates a simple platform device that requires minimal
 * resource and memory management. Canned release function freeing memory
 * allocated for the device allows drivers using such devices to be
 * unloaded without waiting for the last reference to the device to be
 * dropped.
 *
 * This interface is primarily intended for use with legacy drivers which
 * probe hardware directly.  Because such drivers create sysfs device nodes
 * themselves, rather than letting system infrastructure handle such device
 * enumeration tasks, they don't fully conform to the Linux driver model.
 * In particular, when such drivers are built as modules, they can't be
 * "hotplugged".
 *
 * Returns &struct platform_device pointer on success, or ERR_PTR() on error.
 */
static inline struct platform_device *platform_device_register_simple(
		const char *name, int id,
		const struct resource *res, unsigned int num)
{
	return platform_device_register_resndata(NULL, name, id,
			res, num, NULL, 0);
}
```

# UIO驱动
代码主体仍然来自于[Linux UIO驱动实例介绍](https://blog.csdn.net/hpu11/article/details/109405906)，只不过为了简洁，忽略错误处理代码
**驱动代码**
```c
#include <linux/module.h>
#include <linux/platform_device.h>
#include <linux/uio_driver.h>
#include <linux/slab.h>

#define DRV_NAME "test"
#define MEMORY_SIZE (1 << 12)

struct uio_info test_info = {
    .name = "test_uio",
    .version = "1.0",
    .irq = UIO_IRQ_NONE,
};

static int drv_probe(struct platform_device *pdev) {
  printk("call probe function dev name is:%s\n", pdev->name);
  struct device *dev = &pdev->dev;
  void *p = kmalloc(MEMORY_SIZE, GFP_KERNEL);  // 申请内存空间
  strcpy(p, "123456");                         // 写入一些数据
  test_info.mem[0].name = "area1";
  test_info.mem[0].addr = (unsigned long)p;
  test_info.mem[0].memtype = UIO_MEM_LOGICAL;
  test_info.mem[0].size = MEMORY_SIZE;
  uio_register_device(dev, &test_info);
  return 0;
}

static int drv_remove(struct platform_device *pdev) {
  printk("call remove function dev name is:%s\n", pdev->name);
  printk("memory data:%s\n", test_info.mem[0].addr);  // 输出内存数据
  uio_unregister_device(&test_info);
  return 0;
}
static struct platform_device *test_device;
static struct platform_driver test_driver = {
    .driver =
        {
            .name = DRV_NAME,
        },
    .probe = drv_probe,
    .remove = drv_remove,
};

static int __init test_init(void) {
  test_device = platform_device_register_simple(DRV_NAME, -1, NULL, 0);
  return platform_driver_register(&test_driver);
}

static void __exit test_exit(void) {
  platform_device_unregister(test_device);
  platform_driver_unregister(&test_driver);
}

MODULE_LICENSE("GPL");
MODULE_DESCRIPTION("test driver");
module_init(test_init);
module_exit(test_exit);
```
相较于platform的demo，只是加入了一些uio_info相关的代码，函数构成一致。
**用户程序**
```c
#include <stdio.h>
#include <fcntl.h>
#include <stdlib.h>
#include <unistd.h>
#include <string.h>
#include <sys/mman.h>
#include <errno.h>

#define UIO_DEV "/dev/uio0"
#define UIO_ADDR "/sys/class/uio/uio0/maps/map0/addr"
#define UIO_SIZE "/sys/class/uio/uio0/maps/map0/size"

int main(void) {
  int uio_fd, addr_fd, size_fd;
  char uio_addr_buf[16], uio_size_buf[16];
  int uio_size;
  void *uio_addr, *access_address;
  uio_fd = open(UIO_DEV, O_RDWR);
  addr_fd = open(UIO_ADDR, O_RDONLY);  // 起始地址
  size_fd = open(UIO_SIZE, O_RDONLY);  // 内存大小
  read(addr_fd, uio_addr_buf, sizeof(uio_addr_buf));
  read(size_fd, uio_size_buf, sizeof(uio_size_buf));
  uio_addr = (void *)strtoul(uio_addr_buf, NULL, 0);
  uio_size = (int)strtol(uio_size_buf, NULL, 0);
  access_address = mmap(NULL, uio_size, PROT_READ | PROT_WRITE, MAP_SHARED, uio_fd, 0);  // 进行mmap映射
  printf("memory data:%s\n", access_address);                                            // 读取内存数据
  strcpy(access_address, "00000000");                                                    // 写入内存数据
  printf("memory data:%s\n", access_address);                                            // 再次读取内存数据
  return 0;
}
```
用户代码首先读取内存数据，而后写入一些数据，驱动在设备移除函数中读取内存数据，验证用户程序是否成功写入
```bash
驱动在drv_probe中写入123456
用户程序读取内存，得到123456
用户程序写入00000000
驱动在drv_remove中读到00000000
```
![](https://img-blog.csdnimg.cn/c3c98c834bb845069736a40a952a719c.png)

```cpp
root@driver-virtual-machine ~/d/test# tree /sys/class/uio/uio0/
/sys/class/uio/uio0/
├── dev
├── device -> ../../../test
├── event
├── maps
│   └── map0
│       ├── addr
│       ├── name
│       ├── offset
│       └── size
├── name
├── power
│   ├── async
│   ├── autosuspend_delay_ms
│   ├── control
│   ├── runtime_active_kids
│   ├── runtime_active_time
│   ├── runtime_enabled
│   ├── runtime_status
│   ├── runtime_suspended_time
│   └── runtime_usage
├── subsystem -> ../../../../../class/uio
├── uevent
└── version

5 directories, 18 files
root@driver-virtual-machine ~/d/test# cat /sys/class/uio/uio0/name 
test_uio
root@driver-virtual-machine ~/d/test# cat /sys/class/uio/uio0/version 
1.0
root@driver-virtual-machine ~/d/test# cat /sys/class/uio/uio0/maps/map0/addr
0xffff9c2f5380c000
root@driver-virtual-machine ~/d/test# cat /sys/class/uio/uio0/maps/map0/name 
area1
root@driver-virtual-machine ~/d/test# cat /sys/class/uio/uio0/maps/map0/size
0x0000000000001000

```

相关函数与结构体

```c
/* defines for uio_info->irq */
#define UIO_IRQ_CUSTOM	-1
#define UIO_IRQ_NONE	0

/* defines for uio_mem->memtype */
#define UIO_MEM_NONE	0
#define UIO_MEM_PHYS	1
#define UIO_MEM_LOGICAL	2
#define UIO_MEM_VIRTUAL 3
#define UIO_MEM_IOVA	4

/* defines for uio_port->porttype */
#define UIO_PORT_NONE	0
#define UIO_PORT_X86	1
#define UIO_PORT_GPIO	2
#define UIO_PORT_OTHER	3

/**
 * struct uio_mem - description of a UIO memory region
 * @name:		name of the memory region for identification
 * @addr:               address of the device's memory rounded to page
 *			size (phys_addr is used since addr can be
 *			logical, virtual, or physical & phys_addr_t
 *			should always be large enough to handle any of
 *			the address types)
 * @offs:               offset of device memory within the page
 * @size:		size of IO (multiple of page size)
 * @memtype:		type of memory addr points to
 * @internal_addr:	ioremap-ped version of addr, for driver internal use
 * @map:		for use by the UIO core only.
 */
struct uio_mem {
	const char		*name;
	phys_addr_t		addr;
	unsigned long		offs;
	resource_size_t		size;
	int			memtype;
	void __iomem		*internal_addr;
	struct uio_map		*map;
};

/**
 * struct uio_info - UIO device capabilities
 * @uio_dev:		the UIO device this info belongs to
 * @name:		device name
 * @version:		device driver version
 * @mem:		list of mappable memory regions, size==0 for end of list
 * @port:		list of port regions, size==0 for end of list
 * @irq:		interrupt number or UIO_IRQ_CUSTOM
 * @irq_flags:		flags for request_irq()
 * @priv:		optional private data
 * @handler:		the device's irq handler
 * @mmap:		mmap operation for this uio device
 * @open:		open operation for this uio device
 * @release:		release operation for this uio device
 * @irqcontrol:		disable/enable irqs when 0/1 is written to /dev/uioX
 */
struct uio_info {
	struct uio_device	*uio_dev;
	const char		*name;
	const char		*version;
	struct uio_mem		mem[MAX_UIO_MAPS];
	struct uio_port		port[MAX_UIO_PORT_REGIONS];
	long			irq;
	unsigned long		irq_flags;
	void			*priv;
	irqreturn_t (*handler)(int irq, struct uio_info *dev_info);
	int (*mmap)(struct uio_info *info, struct vm_area_struct *vma);
	int (*open)(struct uio_info *info, struct inode *inode);
	int (*release)(struct uio_info *info, struct inode *inode);
	int (*irqcontrol)(struct uio_info *info, s32 irq_on);
};
```


[drivers-session3-uio-4public.pdf](https://blog.idv-tech.com/wp-content/uploads/2014/09/drivers-session3-uio-4public.pdf)
