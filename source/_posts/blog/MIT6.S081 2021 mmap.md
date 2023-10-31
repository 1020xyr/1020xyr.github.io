---
title: MIT6.S081 2021 mmap
date: 2022-08-27 22:02:08
tags: 6.081 mmap
categories: 国外课程实验
---
<meta name="referrer" content="no-referrer" />


>You should implement enough mmap and munmap functionality to make the mmaptest test program work. If mmaptest doesn't use a mmap feature, you don't need to implement that feature.

这个实验还是比较复杂的，用gdb调了很多次才最终通过所有测试，当然通过测试不代表程序就是对的。
## hints
首先简要地翻译一下hints
>Start by adding _mmaptest to UPROGS, and mmap and munmap system calls, in order to get user/mmaptest.c to compile. For now, just return errors from mmap and munmap. We defined PROT_READ etc for you in kernel/fcntl.h. Run mmaptest, which will fail at the first mmap call.

补全mmap和munmap两个系统调用路径，并将_mmaptest加入用户程序
>Fill in the page table lazily, in response to page faults. That is, mmap should not allocate physical memory or read the file. Instead, do that in page fault handling code in (or called by) usertrap, as in the lazy page allocation lab. The reason to be lazy is to ensure that mmap of a large file is fast, and that mmap of a file larger than physical memory is possible.

在mmap中并不实际分配物理页，而是在页错误处理代码（usertrap）中进行处理，以便快速处理大文件的mmap调用
>Keep track of what mmap has mapped for each process. Define a structure corresponding to the VMA (virtual memory area) described in Lecture 15, recording the address, length, permissions, file, etc. for a virtual memory range created by mmap. Since the xv6 kernel doesn't have a memory allocator in the kernel, it's OK to declare a fixed-size array of VMAs and allocate from that array as needed. A size of 16 should be sufficient.

创建一个结构体来描述mmap映射的内存区域，阅读《linux内核设计与实现》第15章进程地址空间，定义一个vm_area_struct类似的结构体，由于不能动态分配内存，故使用静态数组的方式来分配内存区域。
>Implement mmap: find an unused region in the process's address space in which to map the file, and add a VMA to the process's table of mapped regions. The VMA should contain a pointer to a struct file for the file being mapped; mmap should increase the file's reference count so that the structure doesn't disappear when the file is closed (hint: see filedup). Run mmaptest: the first mmap should succeed, but the first access to the mmap-ed memory will cause a page fault and kill mmaptest.

在mmap的实现中分配一个vm_area结构体记录mmap信息，将文件映射到一个未使用的地址空间，并增加文件的引用次数

>Add code to cause a page-fault in a mmap-ed region to allocate a page of physical memory, read 4096 bytes of the relevant file into that page, and map it into the user address space. Read the file with readi, which takes an offset argument at which to read in the file (but you will have to lock/unlock the inode passed to readi). Don't forget to set the permissions correctly on the page. Run mmaptest; it should get to the first munmap.

在usertrap函数中对映射区域发生的load/store page fault进行处理，分配物理页并读入文件内容。注意读入文件内容需加inode锁并正确设置页权限。
>Implement munmap: find the VMA for the address range and unmap the specified pages (hint: use uvmunmap). If munmap removes all pages of a previous mmap, it should decrement the reference count of the corresponding struct file. If an unmapped page has been modified and the file is mapped MAP_SHARED, write the page back to the file. Look at filewrite for inspiration.

找到unmap对应的区域并修改其地址范围，取消相应的映射。如果将mmap映射的区域全部移除则降低文件的引用计数并且将内容写入文件
>Ideally your implementation would only write back MAP_SHARED pages that the program actually modified. The dirty bit (D) in the RISC-V PTE indicates whether a page has been written. However, mmaptest does not check that non-dirty pages are not written back; thus you can get away with writing pages back without looking at D bits.

页表项中记录了该物理页是否被修改，最好的解决方案应该只在该页被修改时才进行文件写入操作。
>Modify exit to unmap the process's mapped regions as if munmap had been called. Run mmaptest; mmap_test should pass, but probably not fork_test.

修改exit函数，在进程退出时unmap所有已经映射的内存区域
>Modify fork to ensure that the child has the same mapped regions as the parent. Don't forget to increment the reference count for a VMA's struct file. In the page fault handler of the child, it is OK to allocate a new physical page instead of sharing a page with the parent. The latter would be cooler, but it would require more implementation work. Run mmaptest; it should pass both mmap_test and fork_test.

修改fork函数，使子进程拥有父进程拥有的内存区域，同时增加文件的引用计数，在页错误处理部分可以分配新的物理页
## 代码
<mark>以下代码仅做简单的参考，注意处理好头文件</mark>
按照hints编写程序，第一步不思考如何实现mmap，而是读懂测试代码
**补全系统调用路径**
```c
// 用户空间调用
char *p = mmap(0, PGSIZE * 2, PROT_READ, MAP_PRIVATE, fd, 0);
if (p == MAP_FAILED) err("mmap (1)");
_v1(p);
if (munmap(p, PGSIZE * 2) == -1) err("munmap (1)");
// user.h中添加函数声明
char *mmap(const char *, int, int, int, int, int);
int munmap(const char *, int);
// syscall.h中加入调用号
#define SYS_mmap 22
#define SYS_munmap 23
// usys.pl加入函数入口点
entry("mmap");
entry("munmap");
生成代码：
.global mmap
mmap:
 li a7, SYS_mmap
 ecall
 ret
.global munmap
munmap:
 li a7, SYS_munmap
 ecall
 ret
// syscall.c中加入系统调用函数项
extern uint64 sys_mmap(void);
extern uint64 sys_munmap(void);
static uint64 (*syscalls[])(void) = {
[SYS_mmap]    sys_mmap,
[SYS_munmap]  sys_munmap,
};
// 在sysfile.c中添加空函数
uint64 sys_mmap(void) {
	return -1;
}
uint64 sys_munmap(void) {
	return -1;
}
// 修改Makefile
UPROGS=\
	$U/_cat\
	$U/_echo\
	$U/_forktest\
	$U/_grep\
	$U/_init\
	$U/_kill\
	$U/_ln\
	$U/_ls\
	$U/_mkdir\
	$U/_rm\
	$U/_sh\
	$U/_stressfs\
	$U/_usertests\
	$U/_grind\
	$U/_wc\
	$U/_zombie\
	$U/_mmaptest\
```
在本实验中我定义了两个结构体，struct shared_memory和struct vm_area，其中shared_memory为共享物理页，分配给MAP_SHARED模式的mmap系统调用，vm_area描述文件映射的区域信息。其定义如下：
```c
// my_type.h
#include "types.h"
struct shared_memory {
  char *page;         // 物理页地址
  int ref_cnt;        // 物理页引用次数
  struct file *file;  // 物理页对应的文件
  int length;         // 文件长度
  uint inum;          // inode号与文件偏移，用来作为共享物理页的唯一标识
  int offset;
  int is_dirty;  // 该物理页是否被修改过
  int used;      // 该共享页是否正在被使用
  struct shared_memory *next;
};
struct vm_area {
  uint64 va_start;    // 虚拟区域起始地址
  uint64 va_end;      // 虚拟区域结束地址
  uint64 file_start;  // 文件开始的虚拟地址
  int prot;           // 文件权限
  int flags;          // mmap模式
  struct file *file;  // 映射的文件
  uint inum;          // inode号
  int size;           // 文件大小
  int used;           // 是否正在被使用
};
```
先不看这些结构体的相关操作，着眼于sys_mmap sys_munmap fork exit函数的修改
在这里我是从MAXVA递减分配空闲地址的，每次分配完更新一下分配点，避免多个mmap映射到同一块区域
```c
// proc.h 
// 修改proc结构体，增加vm_area数组和内存分配点
#define MMAP_SIZE 16
// Per-process state
struct proc {
  struct vm_area mmap[MMAP_SIZE];  // 内存区域数组
  uint64 free_memory_start;        // 空闲地址分配点
};
// proc.c
static struct proc *allocproc(void) {
found:
  // 初始化内存区域数组以及空闲地址分配点
  for (int i = 0; i < MMAP_SIZE; i++) {
    p->mmap[i].used = 0;
  }
  p->free_memory_start = MAXVA - 2 * PGSIZE;		// 除去TRAMPOLINE和TRAPFRAME
  return p;
}
// 分配空闲地址
uint64 find_unused_region(struct proc *p, int npages) {
  uint64 va;
  int i = 0;
  int find_slot = 1;
  pagetable_t pagetable = p->pagetable;
  for (va = p->free_memory_start - npages * PGSIZE; va > 0; va -= PGSIZE) {
    for (i = 0; i < npages; i++) {
      if (walkaddr(pagetable, va + i * PGSIZE) != 0) {
        find_slot = 0;
      }
    }
    if (find_slot == 1) {
      printf("virtual address:%p \n", va);
      printf("MAXVA distance:%dth page npages:%d\n", (MAXVA - va) / PGSIZE, npages);
      p->free_memory_start = va;		// 更新分配点
      return va;
    }
  }
  return 0;
}
uint64 sys_mmap(void) {
  int length;
  int prot;
  int flags;
  struct file *f;

  // 读取需要的参数
  if (argint(1, &length) < 0) return -1;
  if (argint(2, &prot) < 0) return -1;
  if (argint(3, &flags) < 0) return -1;
  if (argfd(4, 0, &f) < 0) return -1;

  // 检验参数
  if (flags == MAP_SHARED) {
    if ((prot & PROT_READ) && (f->readable != 1)) return -1;
    if ((prot & PROT_WRITE) && (f->writable != 1)) return -1;
  }
  // 分配未使用的vm_area和内存地址
  struct proc *p = myproc();
  int npages = (length - 1) / PGSIZE + 1;
  struct vm_area *area = alloc_area(p);
  uint64 va = find_unused_region(p, npages);
  if (area == 0 || va == 0) return -1;
  // 读取文件信息
  ilock(f->ip);
  area->inum = f->ip->inum;
  area->size = f->ip->size;
  iunlock(f->ip);
  // 对该虚拟区域进行赋值并增加文件引用计数
  area->va_start = va;
  area->va_end = va + length;
  area->file_start = va;
  area->prot = prot;
  area->flags = flags;
  area->file = f;
  filedup(f);  // 增加文件引用计数
  printf("map start-end:%p-%p\n", area->va_start, area->va_end);
  return va;
}
uint64 sys_munmap(void) {
  uint64 addr;
  int length;
  // 读取相关参数
  if (argaddr(0, &addr) < 0) return -1;
  if (argint(1, &length) < 0) return -1;
  printf("munmap start-end:%p-%p\n", addr, addr + length);
  struct proc *p = myproc();
  return delete_area(p, addr, addr + length);
}
```
在sysmap函数中检验参数步骤是由mmaptest中的测试得来的，单独记录file_start是因为unmap可能取消部分映射，所以文件的偏移量就不能从va_start计算

```c
  // should be able to map file opened read-only with private writable
  // mapping

  // check that mmap doesn't allow read/write mapping of a
  // file opened read-only.
```

页错误处理函，scause=13/15为读写页错误，修改usertrap函数
![](https://img-blog.csdnimg.cn/3947e7fde7ae400d89106ec81bc9ae6c.png)
```c
else if ((which_dev = devintr()) != 0) {
    // ok
} else if (r_scause() == 13 || r_scause() == 15) {
  uint64 va = r_stval();
  struct proc *p = myproc();
  if (process_mmap_page(p, va) != 0) {
    p->killed = 1;
  }
} 

// proc.c
// 首先检查是否需要分配页，然后对不同模式的mmap进行处理，记录文件部分的长度是为了保持文件原本的大小
// 映射页时确保PTE_U位置位
int process_mmap_page(struct proc *p, uint64 va) {  // page fault时调用
  va = PGROUNDDOWN(va);
  char *page = 0;  // 物理页地址
  struct vm_area *area = find_area(p, va);
  if (area == 0) {
    printf("va:%p no such area\n", va);
    return -1;
  }
  if (walkaddr(p->pagetable, va) != 0) {
    printf("va:%p already mapped\n", va);
    return 0;
  }

  int offset = va - area->file_start;
  struct file *f = area->file;
  int length;
  if (area->flags == MAP_SHARED) {
    struct shared_memory *memory = reuse_shared_memory(area->inum, offset);    // 尝试复用已经存在的共享页
    if (memory == 0) {                                                         // 不存在相同文件文件的映射
      length = (offset + PGSIZE > area->size) ? area->size - offset : PGSIZE;  // 文件部分长度（unmap不应该扩大文件大小）
      memory = alloc_shared_memory(f, area->inum, offset, length);             // 分配共享物理页并设置文件信息
      kernel_fileread(f, (uint64)memory->page, offset, PGSIZE);                // 从文件中读取相应数据至物理页
    }
    page = memory->page;

  } else if (area->flags == MAP_PRIVATE) {
    page = kalloc();
    memset(page, 0, PGSIZE);
    kernel_fileread(f, (uint64)page, offset, PGSIZE);  // 从文件中读取相应数据至物理页
  }

  int prot = PTE_U;  // 页权限
  if (area->prot & PROT_EXEC) {
    prot |= PTE_X;
  }
  if ((area->prot & PROT_READ)) {
    prot |= PTE_R;
  }
  if ((area->prot & PROT_WRITE)) {
    prot |= PTE_W;
  }
  if (mappages(p->pagetable, va, PGSIZE, (uint64)page, prot) != 0) {
    kfree(page);
    printf("map failed\n");
    return -1;
  }
  printf("map va:%p to pa:%p\n", va, (uint64)page);
  printf("file offset:%d\n", offset);
  printf("process id is %d\n", p->pid);
  return 0;
}
```
修改exit函数，在进程退出时unmap使用映射区域（调用free_all_area函数即可）

```c
// Exit the current process.  Does not return.
// An exited process remains in the zombie state
// until its parent calls wait().
void exit(int status) {
  struct proc *p = myproc();

  if (p == initproc) panic("init exiting");

  // Close all open files.
  for (int fd = 0; fd < NOFILE; fd++) {
    if (p->ofile[fd]) {
      struct file *f = p->ofile[fd];
      fileclose(f);
      p->ofile[fd] = 0;
    }
  }

  // 释放所有内存区域
  free_all_area(p);
  
  begin_op();
  iput(p->cwd);
  end_op();
  p->cwd = 0;

  acquire(&wait_lock);

  // Give any children to init.
  reparent(p);

  // Parent might be sleeping in wait().
  wakeup(p->parent);

  acquire(&p->lock);

  p->xstate = status;
  p->state = ZOMBIE;

  release(&wait_lock);

  // Jump into the scheduler, never to return.
  sched();
  panic("zombie exit");
}
```
注意free_all_area函数一定要在acquire(&p->lock);语句之前，不然会发生重复请求锁错误
![](https://img-blog.csdnimg.cn/366e36b2dc4942b8ab3b940a5c6dc925.png)
这是因为unmap内存区域时有可能会进行文件写入操作，在进行文件写入时调用bwrite函数，其中调用了sleep函数，该函数再次请求p->lock
```c
// Atomically release lock and sleep on chan.
// Reacquires lock when awakened.
void sleep(void *chan, struct spinlock *lk) {
  struct proc *p = myproc();
  acquire(&p->lock);  // DOC: sleeplock1
}
```

修改fork函数，复制父进程的内存区域并增加文件引用计数
```c
int fork(void) {
  // 复制内存区域并增加文件计数
  for (int i = 0; i < MMAP_SIZE; i++) {
    if (p->mmap[i].used == 1) {
      np->mmap[i] = p->mmap[i];
      filedup(np->mmap[i].file);
    }
  }
  // 复制空闲地址分配点
  np->free_memory_start = p->free_memory_start;
  return pid;
}
```
辅助的文件读写操作定义在file.c，传入的地址为内核地址
```c
int kernel_fileread(struct file *f, uint64 addr, int offset, int size) {
  ilock(f->ip);
  if ((readi(f->ip, 0, addr, offset, size)) <= 0) {
    printf("read file error\n");
    iunlock(f->ip);
    return -1;
  }
  iunlock(f->ip);
  return 0;
}

int kernel_filewrite(struct file *f, uint64 addr, int offset, int n) {
  // write a few blocks at a time to avoid exceeding
  // the maximum log transaction size, including
  // i-node, indirect block, allocation blocks,
  // and 2 blocks of slop for non-aligned writes.
  // this really belongs lower down, since writei()
  // might be writing a device like the console.
  int r, ret = 0;
  int max = ((MAXOPBLOCKS - 1 - 1 - 2) / 2) * BSIZE;
  int i = 0;
  f->off = offset;
  while (i < n) {
    int n1 = n - i;
    if (n1 > max) n1 = max;

    begin_op();
    ilock(f->ip);
    if ((r = writei(f->ip, 0, addr + i, f->off, n1)) > 0) f->off += r;
    iunlock(f->ip);
    end_op();

    if (r != n1) {
      // error from writei
      break;
    }
    i += r;
  }
  ret = (i == n ? n : -1);
  return ret;
}

```

与shared_memory相关的操作定义在kalloc.c文件中，由于不能动态分配内存，使用静态数组的方式分配链表节点，共享物理页以单向链表的形式连接起来。
```c
void kinit() {
  initlock(&kmem.lock, "kmem");
  freerange(end, (void *)PHYSTOP);
  // 增加链表数组初始化与共享物理页链表初始化函数
  resource_init();
  init_shared_memory();
}

#define RESOURCE_SIZE 16
struct shared_memory resource[RESOURCE_SIZE];  // 共享物理页链表数组
void resource_init() {
  for (int i = 0; i < RESOURCE_SIZE; i++) {
    resource[i].used = 0;
  }
}
struct shared_memory *find_unused_resource() {
  for (int i = 0; i < RESOURCE_SIZE; i++) {
    if (resource[i].used == 0) {
      resource[i].used = 1;
      return &resource[i];
    }
  }
  return 0;
}

struct shared_memory *head;           // 共享物理页链表头指针
struct sleeplock shared_memory_lock;  // 共享物理页链表锁
void init_shared_memory() {           // 初始化共享物理页链表
  head = find_unused_resource();
  head->next = 0;
  initsleeplock(&shared_memory_lock, "shared_memory");
}
struct shared_memory *alloc_shared_memory(struct file *file, uint inum, int offset, int length) {  // 分配新的共享物理页节点
  acquiresleep(&shared_memory_lock);
  struct shared_memory *node = find_unused_resource();
  if (node == 0) {
    releasesleep(&shared_memory_lock);
    return 0;
  }
  node->page = kalloc();  // 申请物理页并清零
  if (node->page == 0) {
    releasesleep(&shared_memory_lock);
    return 0;
  }
  memset(node->page, 0, PGSIZE);
  // 加入链表
  node->next = head->next;
  head->next = node;
  // 设置属性
  node->file = file;
  node->offset = offset;
  node->length = length;
  node->inum = inum;
  node->ref_cnt = 1;
  node->is_dirty = 0;
  releasesleep(&shared_memory_lock);
  return node;
}
// 以inode号与文件偏移作为索引寻找共享物理页
struct shared_memory *find_shared_memory(uint inum, int offset, struct shared_memory **parent) {
  struct shared_memory *p = head;
  while (p->next != 0) {
    if (p->next->inum == inum && p->next->offset == offset) {
      if (parent != 0) {
        *parent = p;
      }
      return p->next;
    }
    p = p->next;
  }
  return 0;
}

// 尝试重用现有的共享物理页，失败返回0
struct shared_memory *reuse_shared_memory(uint inum, int offset) {
  acquiresleep(&shared_memory_lock);
  struct shared_memory *p = find_shared_memory(inum, offset, 0);
  if (p == 0) {
    releasesleep(&shared_memory_lock);
    return 0;
  }
  p->ref_cnt++;
  releasesleep(&shared_memory_lock);
  return p;
}
// 降低共享物理页引用次数，引用次数为0则删除该物理页
void delete_shared_memory(uint inum, int offset, int is_dirty) {
  acquiresleep(&shared_memory_lock);
  struct shared_memory *parent;
  struct shared_memory *memory = find_shared_memory(inum, offset, &parent);
  if (memory == 0) {
    releasesleep(&shared_memory_lock);
    return;
  }
  memory->ref_cnt--;
  if (is_dirty != 0) {
    memory->is_dirty = 1;
  }
  if (memory->ref_cnt == 0) {     // 引用次数为0
    if (memory->is_dirty == 1) {  // 内容被修改，写入文件
      kernel_filewrite(memory->file, (uint64)memory->page, memory->offset, memory->length);
    }
    kfree(memory->page);
    memory->used = 0;
    // 在链表中删除该节点
    parent->next = memory->next;
  }
  releasesleep(&shared_memory_lock);
}
```
注意这里使用的sleeplock，如果使用spinlock，在kernel_filewrite中会调用sleep函数，导致sched locks错误。
也就是说<mark>自旋锁中不能调用休眠函数</mark>
[为什么拥有自旋锁的代码段不能睡眠？](https://blog.csdn.net/liaojunwu/article/details/120398320)
```c
void
acquire(struct spinlock *lk)
{
  push_off(); // disable interrupts to avoid deadlock.
}
// 调用完acquire函数后，mycpu()->noff!=1
void sleep(void *chan, struct spinlock *lk) {
  sched();
}
void sched(void) {
  int intena;
  struct proc *p = myproc();

  if (!holding(&p->lock)) panic("sched p->lock");
  if (mycpu()->noff != 1) panic("sched locks");
  if (p->state == RUNNING) panic("sched running");
  if (intr_get()) panic("sched interruptible");

  intena = mycpu()->intena;
  swtch(&p->context, &mycpu()->context);
  mycpu()->intena = intena;
}
```


与vm_area相关的操作定义在proc.c，同样是使用proc中的静态数组分配结构体，注意在delete_area时有可能一些区域从头到尾都没有被访问，也就没有分配对应的物理页，故不需要释放物理页
```c
struct vm_area *alloc_area(struct proc *p) {  // 分配未使用的内存区域
  struct vm_area *area;
  for (int i = 0; i < MMAP_SIZE; i++) {
    if (p->mmap[i].used == 0) {
      area = &p->mmap[i];
      area->used = 1;
      return area;
    }
  }
  return 0;
}

struct vm_area *find_area(struct proc *p, uint64 va) {  // 找到虚拟地址对应的内存区域
  int i;
  struct vm_area *area;
  for (i = 0; i < MMAP_SIZE; i++) {
    area = &p->mmap[i];
    if (area->used == 1 && va >= area->va_start && va < area->va_end) {
      return area;
    }
  }
  return 0;
}

int delete_area(struct proc *p, uint64 va_start, uint64 va_end) {  // 删除该段地址空间
  pte_t *pte;
  int is_dirty;
  struct vm_area *area = find_area(p, va_start);
  if (area == 0) return -1;

  for (uint64 va = va_start; va < va_end; va += PGSIZE) {
    if (walkaddr(p->pagetable, va) == 0) {
      printf("this page is not map,ignored. address:%p\n", va);
      continue;
    }
    if (area->flags == MAP_SHARED) {
      pte = walk(p->pagetable, va, 0);
      is_dirty = *pte & PTE_D;                                            // 获取dirty bit
      delete_shared_memory(area->inum, va - area->file_start, is_dirty);  // 删除共享物理页（减小引用计数）
      uvmunmap(p->pagetable, va, 1, 0);                                   // 取消映射，但不释放物理页
    } else if (area->flags == MAP_PRIVATE) {
      uvmunmap(p->pagetable, va, 1, 1);  // 取消映射同时释放物理页
    }
    printf("unmap address:%p\n", va);
  }
  if ((area->va_start = va_start) && (area->va_end == va_end)) {  // 完全删除
    fileclose(area->file);                                        // 减小文件引用计数
    area->used = 0;
  } else {  // 部分删除，修改虚拟内存区域
    if (area->va_start == va_start) {
      area->va_start = va_end;
    }
    if (area->va_end == va_end) {
      area->va_end = va_start;
    }
  }
  return 0;
}
void free_all_area(struct proc *p) {  // 释放所有内存区域，在exit时调用
  struct vm_area *area;
  for (int i = 0; i < MMAP_SIZE; i++) {
    if (p->mmap[i].used == 1) {
      area = &p->mmap[i];
      delete_area(p, area->va_start, area->va_end);
    }
  }
}
```

gdb时输出变量显示optimized out，修改Makefile中的优化等级

```bash
CFLAGS = -Wall -Werror -O0 -fno-omit-frame-pointer -ggdb
```
**通过截图**
![](https://img-blog.csdnimg.cn/8b9db43881dc4eb682d729ea43bcbf3b.png)

<mark>若有遗漏的地方，望请告知</mark>

