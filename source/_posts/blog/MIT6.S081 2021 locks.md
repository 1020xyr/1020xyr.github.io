---
title: MIT6.S081 2021 locks
date: 2022-08-29 15:36:18
tags: 6.081 locks
categories: 国外课程实验
---
<meta name="referrer" content="no-referrer" />


## xv6 book记录
**竞态**
```c
struct element {
	int data;
	struct element *next;
};
struct element *list = 0;

void push(int data)
{
	struct element *l;
	l = malloc(sizeof *l);
	l->data = data;
	l->next = list;
	list = l;
}
```
![](https://img-blog.csdnimg.cn/6e9aa2a2ed3d400d90854f0ca8d092d0.png)
race condition：以图中顺序执行指令，CPU2的更新丢失
竞争常常造成丢失更新或读到部分更新问题，竞争的结果取决于CPU的执行顺序，内存操作的重排序，它的结果是很微妙的，调试时一条输出语句就能改变执行顺序，使得bug无法复现。
>adding print statements while debugging push might change the timing of the execution enough to make the race disappear.

通过适当地加锁可以解决竞态问题
```c
struct element *list = 0;
struct lock listlock;
void push(int data)
{
	struct element *l;
	l = malloc(sizeof *l);
	l->data = data;
	acquire(&listlock);
	l->next = list;
	list = l;
	release(&listlock);
}
```
 acquire和release之间的代码段被称为临界区，当我们使用锁保护特定数据时，实际上是指保护该数据的一些不变量，这有点像ACID中的一致性：**对数据的一组特定约束必须始终成立。即不变量（invariants）**。
 
 在临界区中的操作可能会破坏这些不变量，但此时其他线程由于锁的存在无法访问该数据，只需要临界区结束前约束成立即可。在以上示例中，约束便是：list需指向链表头部节点，执行完临界区第一行代码后约束便被破坏了，第二行代码重新满足了约束。
 
可以通过重新设计数据结构与相应的算法来缓解锁争用问题。


**自旋锁的实现**
version1
```c
void acquire(struct spinlock *lk) // does not work!
{
	for(;;) {
		if(lk->locked == 0) {
			lk->locked = 1;
			break;
		}
	}
}
```
在以上实现中可能两个线程同时进入条件语句内部并获得锁，不符合互斥锁的语义。所以说需要让查询和设置语句一起拥有原子性。利用amoswap原子交换指令实现这个要求，以小的原子性获取大的原子性。
![](https://img-blog.csdnimg.cn/bb9d5b4e16fb4b2999d648b1bc66488e.png)
另外，许多编译器和CPU会对代码进行指令重排，乱序执行以获取更高的性能，为了不让临界区代码移出临界区，使用内存屏障，告知编译器和CPU不对屏障内部的load store指令进行重排。

**锁**
> it’s hard to reliably test whether code is free from locking errors and races.
很难通过可靠的测试来判断代码是否存在锁错误与竞态
Ultimately lock granularity decisions need to be driven by performance measurements as well as complexity considerations.
锁的粒度取决于性能需求与复杂度考量

![](https://img-blog.csdnimg.cn/b3c44c1405ba4d619b5f0eb0c88ddbf9.png)
通过在代码中以相同顺序请求锁来避免死锁问题，锁粒度越小越容易发生死锁问题。

可重入锁也不能真正解决死锁问题，而且可能引入逻辑错误

```c
struct spinlock lock;
int data = 0; // protected by lock
f() {
	acquire(&lock);
	if(data == 0){
		call_once();
		h();
		data = 1;
	}
	release(&lock);
}
g() {
	aquire(&lock);
	if(data == 0){
		call_once();
		data = 1;
	}
	release(&lock);
	}
```
如果h函数里面调用g函数，则call_once执行了两次。

>if a spinlock is used by an interrupt handler, a CPU must never hold that lock with interrupts enabled. Xv6 is more conservative: when a CPU acquires any lock, xv6 always disables interrupts on that CPU. Interrupts may still occur on other CPUs, so an interrupt’sacquire can wait for a thread to release a spinlock; just not on the same CPU.

如果一个自旋锁同时也被中断处理程序使用，那么获取锁前需关闭中断，而xv6采用更加保守的方式：直接在申请自旋锁前关闭中断。中断处理程序可以与另一个CPU的进程竞争自旋锁

> Holding a spinlock that long would lead to waste if another process wanted to acquire it, since the acquiring process would waste CPU for a long time while spinning. Another drawback of spinlocks is that a process cannot yield the CPU while retaining a spinlock

长时间持有自旋锁会浪费其他正在请求该锁的线程的CPU资源，并且一旦持有自旋锁该线程就不能让出CPU（调用休眠函数）

```c
void
acquiresleep(struct sleeplock *lk)
{
  acquire(&lk->lk);
  while (lk->locked) {
    sleep(lk, &lk->lk);
  }
  lk->locked = 1;
  lk->pid = myproc()->pid;
  release(&lk->lk);
}

void
releasesleep(struct sleeplock *lk)
{
  acquire(&lk->lk);
  lk->locked = 0;
  lk->pid = 0;
  wakeup(lk);
  release(&lk->lk);
}

```
可休眠锁不能在中断处理程序中使用，也不能在持有自旋锁时调用
总的来说，自旋锁适合短临界区，休眠锁适合长临界区。
>Lock-free programming is more complicated, however, than programming locks; for example, one must worry about instruction and memory reordering.

无锁数据结构和算法非常复杂，需要考虑指令重排与内存操作重排序问题

**重回并发性问题**
>This is a common pattern: one lock for the set of items, plus one lock per item

使用一个大锁对应于数据集合，小锁对应于单独的数据
>Ordinarily the same function that acquires a lock will release it. But a more precise way to view things is that a lock is acquired at the start of a sequence that must appear atomic, and released when that sequence ends

加锁操作位于想要表现原子性的操作前，解锁操作位于想要表现原子性的操作后

>freeing the object implicitly frees the embedded lock, which will cause the waiting thread to malfunction.

假如数据结构的释放也由其内嵌的锁控制的的话，一旦该数据结构释放，则其他同时请求该锁的线程则会‘失灵’，使用引用计数来解决该问题

>The file system uses struct inode reference counts as a kind of shared lock that can be held by multiple processes, in order to avoid deadlocks that would occur if the code used ordinary locks.

就像iget函数操作一样
```c
// Find the inode with number inum on device dev
// and return the in-memory copy. Does not lock
// the inode and does not read it from disk.
static struct inode*
iget(uint dev, uint inum)
{
  struct inode *ip, *empty;

  acquire(&itable.lock);

  // Is the inode already in the table?
  empty = 0;
  for(ip = &itable.inode[0]; ip < &itable.inode[NINODE]; ip++){
    if(ip->ref > 0 && ip->dev == dev && ip->inum == inum){
      ip->ref++;
      release(&itable.lock);
      return ip;
    }
    if(empty == 0 && ip->ref == 0)    // Remember empty slot.
      empty = ip;
  }

  // Recycle an inode entry.
  if(empty == 0)
    panic("iget: no inodes");

  ip = empty;
  ip->dev = dev;
  ip->inum = inum;
  ip->ref = 1;
  ip->valid = 0;
  release(&itable.lock);

  return ip;
}

```

>Some data items are protected by different mechanisms at different times
>For example, when a physical page is free, it is protected by kmem.lock (kernel/kalloc.c:24). If the page is then allocated as a pipe (kernel/pipe.c:23), it is protected by a different lock (the embedded pi->lock).

同一个数据结构可能在不同时刻由不同的锁保护，这实际上与它的使用方式有关

**物理内存分配**
>The allocator sometimes treats addresses as integers in order to perform arithmetic on them (e.g., traversing all pages in freerange), and sometimes uses addresses as pointers to read and write memory (e.g., manipulating the run structure stored in each page); this dual use of addresses is the main reason that the allocator code is full of C type casts. The other reason is that freeing and allocation inherently change the type of the memory.

**文件系统缓存层**
The buffer cache layer caches disk blocks and synchronizes access to them, making sure that only one kernel process at a time can modify the data stored in any particular block.

 The sleep-lock protects reads and writes of the block’s buffered content, while the bcache.lock protects information about which blocks are cached.
```c
struct buf {
  int valid;   // has data been read from disk?
  int disk;    // does disk "own" buf?
  uint dev;
  uint blockno;
  struct sleeplock lock;
  uint refcnt;
  struct buf *prev; // LRU cache list
  struct buf *next;
  uchar data[BSIZE];
};
struct {
  struct spinlock lock;
  struct buf buf[NBUF];

  // Linked list of all buffers, through prev/next.
  // Sorted by how recently the buffer was used.
  // head.next is most recent, head.prev is least.
  struct buf head;
} bcache;
```

 与上述锁模式相同，使用bcache.lock保护缓存集合，buf.lcok保护单个buffer的数据

## Memory allocator
>Your job is to implement per-CPU freelists, and stealing when a CPU's free list is empty. You must give all of your locks names that start with "kmem". That is, you should call initlock for each of your locks, and pass a name that starts with "kmem". Run kalloctest to see if your implementation has reduced lock contention. To check that it can still allocate all of memory, run usertests sbrkmuch. Your output will look similar to that shown below, with much-reduced contention in total on kmem locks, although the specific numbers will differ. Make sure all tests in usertests pass. make grade should say that the kalloctests pass.

该部分比较简单，原先的设计是所有CPU共同使用一个空闲页列表，在申请内存或释放内存时需请求同一个锁，造成锁争用问题。故修改数据结构，让每一个CPU都拥有自己的空闲页列表。在初始化时划分划分一定数目的物理页给各个CPU；在申请内存时，每个CPU首先从自己所属的空闲页列表获取内存，若为空则从其他CPU所属空闲页列表获取一定数目的空闲页；内存释放时则将页挂载到对应CPU的空闲页列表。实现比较简单，重点是steal_free_page函数的实现。

```c
// Physical memory allocator, for user processes,
// kernel stacks, page-table pages,
// and pipe buffers. Allocates whole 4096-byte pages.

#include "types.h"
#include "param.h"
#include "memlayout.h"
#include "spinlock.h"
#include "riscv.h"
#include "defs.h"

#define STEAL_NUMBER 200
void freerange(void *pa_start, void *pa_end);

extern char end[];  // first address after kernel.
                    // defined by kernel.ld.

struct run {
  struct run *next;
};

// 各个CPU的空闲页列表以及保护锁
struct {
  struct spinlock lock;
  struct run *freelist;
} kmem[NCPU];

// 获取当前CPU id
int get_cpuid() {
  push_off();
  int id = cpuid();
  pop_off();
  return id;
}

// 从其他cpu获取一些空闲页，并返回一个空闲页
// （追加）实际上不返回一个空闲页比较好，可以让这个函数功能更加单一
void *steal_free_page(int cur_id) {
  struct run *old_head = 0;
  struct run *new_head = 0;
  int cnt = 0;
  for (int id = 0; id < NCPU; id++) {
    if (id == cur_id) continue;
    acquire(&kmem[id].lock);
    if (kmem[id].freelist != 0) {
      old_head = new_head = kmem[id].freelist;
      // 最多获取STEAL_NUMBER页
      while (new_head != 0 && cnt < STEAL_NUMBER) {
        new_head = new_head->next;
        cnt++;
      }
      // 更新受害者空闲页列表
      if (new_head) {
        kmem[id].freelist = new_head->next;
        new_head->next = 0;  // （追加）取名有点问题，实际上此时new_head是截取链表的尾部，next置为0是将两链表断开连接
      } else {
        kmem[id].freelist = 0;
      }
    }
    release(&kmem[id].lock);
    // 获取到一些页，将第一页返回，其余页挂载在请求CPU的空闲页列表上
    if (old_head != 0) {
      acquire(&kmem[cur_id].lock);
      // （追加）存在竞态，有可能freelist不为0（kree），会导致遗失页，可以重构代码      
      // 不使用new_head而使用steal_list_tail指向截取链表的尾部（不为0）,这样就可以将steal_list_tail->next置为freelist
      kmem[cur_id].freelist = old_head->next;  

      release(&kmem[cur_id].lock);
      break;
    }
  }
  return old_head;
}

void kinit() {
  char buf[10];
  for (int i = 0; i < NCPU; i++) {
    snprintf(buf, 10, "kmem-%d", i);
    initlock(&kmem[i].lock, buf);
    kmem[i].freelist = 0;
  }
  freerange(end, (void *)PHYSTOP);
}

void freerange(void *pa_start, void *pa_end) {
  uint64 page_start = PGROUNDUP((uint64)pa_start);
  uint64 page_end = PGROUNDDOWN((uint64)pa_end);
  uint64 cpu_size = PGROUNDDOWN((page_end - page_start) / NCPU);
  printf("all page:%d  cpu page:%d\n", (page_end - page_start) / PGSIZE, cpu_size / PGSIZE);
  // 将物理页平均分配给各个CPU
  for (int i = 0; i < NCPU; i++) {
    for (uint64 pa = page_start + i * cpu_size; pa < page_start + (i + 1) * cpu_size; pa += PGSIZE) {
      if ((pa % PGSIZE) != 0 || (char *)pa < end || (uint64)pa >= PHYSTOP) panic("kfree");
      memset((void *)pa, 1, PGSIZE);
      struct run *r = (struct run *)pa;
      r->next = kmem[i].freelist;
      kmem[i].freelist = r;
    }
  }
  // 将剩余页加入cpu0的空闲页列表
  for (uint64 pa = page_start + NCPU * cpu_size; pa < page_end; pa += PGSIZE) {
    if ((pa % PGSIZE) != 0 || (char *)pa < end || (uint64)pa >= PHYSTOP) panic("kfree");
    memset((void *)pa, 1, PGSIZE);
    struct run *r = (struct run *)pa;
    r->next = kmem[0].freelist;
    kmem[0].freelist = r;
  }
}

// Free the page of physical memory pointed at by v,
// which normally should have been returned by a
// call to kalloc().  (The exception is when
// initializing the allocator; see kinit above.)
void kfree(void *pa) {
  struct run *r;

  if (((uint64)pa % PGSIZE) != 0 || (char *)pa < end || (uint64)pa >= PHYSTOP) panic("kfree");

  // Fill with junk to catch dangling refs.
  memset(pa, 1, PGSIZE);

  r = (struct run *)pa;
  // 将页放回当前CPU所属空闲页列表
  int id = get_cpuid();
  acquire(&kmem[id].lock);
  r->next = kmem[id].freelist;
  kmem[id].freelist = r;
  release(&kmem[id].lock);
}

// Allocate one 4096-byte page of physical memory.
// Returns a pointer that the kernel can use.
// Returns 0 if the memory cannot be allocated.
void *kalloc(void) {
  struct run *r;
  // 尝试从当前CPU对应空闲页列表分配内存
  int id = get_cpuid();
  acquire(&kmem[id].lock);
  r = kmem[id].freelist;
  if (r) kmem[id].freelist = r->next;
  release(&kmem[id].lock);
  // 若所属空闲页列表，从其他CPU空闲页列表获取一些页
  if (r == 0) r = steal_free_page(id);

  if (r) memset((char *)r, 5, PGSIZE);  // fill with junk
  return (void *)r;
}

```
## Buffer cache
>Modify the block cache so that the number of acquire loop iterations for all locks in the bcache is close to zero when running bcachetest. Ideally the sum of the counts for all locks involved in the block cache should be zero, but it's OK if the sum is less than 500. Modify bget and brelse so that concurrent lookups and releases for different blocks that are in the bcache are unlikely to conflict on locks (e.g., don't all have to wait for bcache.lock). You must maintain the invariant that at most one copy of each block is cached. When you are done, your output should be similar to that shown below (though not identical). Make sure usertests still passes. make grade should pass all tests when you are done.

这个实验还是比较难的，大致的思路是：
1：通过计算块号的哈希值（取余）将不同块请求分散至不同bucket
2：为每一个bucket配备一个锁，减少锁争用
3：记录最近访问时间，而不将节点移至链表首部
4：bucket可能会向其他bucket请求buffer，这可能造成死锁：a->b  b->a。故借助一个大锁c，避免这种死锁情况：c->a->b  c->b->a。
big lock-> bucket a -> bucket b
big lock-> bucket b -> bucket a
5:  为避免为同一个块分配多个buffer，分配前再次检查是否存在对应块
6：对属于本bucket的块与其他bucket的块进行分类处理

我当时一直没想到如何在各个bucket互相访问的情况下避免死锁，还是看了别人的实现才明白这一点。这篇博客写的挺不错的[\[mit6.s081\] 笔记 Lab8: Locks | 锁优化](https://juejin.cn/post/7021218568226209828) 

参考代码如下：

```cpp
struct buf {
  int valid;  // has data been read from disk?
  int disk;   // does disk "own" buf?
  uint dev;
  uint blockno;
  struct sleeplock lock;
  uint refcnt;
  struct buf *prev;  // LRU cache list
  struct buf *next;
  uchar data[BSIZE];

  uint access_time;  // 最近访问时间
  int owner;         // 所属的bucket
};

// Buffer cache.
//
// The buffer cache is a linked list of buf structures holding
// cached copies of disk block contents.  Caching disk blocks
// in memory reduces the number of disk reads and also provides
// a synchronization point for disk blocks used by multiple processes.
//
// Interface:
// * To get a buffer for a particular disk block, call bread.
// * After changing buffer data, call bwrite to write it to disk.
// * When done with the buffer, call brelse.
// * Do not use the buffer after calling brelse.
// * Only one process at a time can use a buffer,
//     so do not keep them longer than necessary.

#include "types.h"
#include "param.h"
#include "spinlock.h"
#include "sleeplock.h"
#include "riscv.h"
#include "defs.h"
#include "fs.h"
#include "buf.h"

#define BUCKET 13
#define NONE -1
struct {
  struct spinlock biglock;
  struct buf buf[NBUF];

  // Linked list of all buffers, through prev/next.
  // Sorted by how recently the buffer was used.
  // head.next is most recent, head.prev is least.
  // 不同桶对应的链表头节点与保护锁
  struct spinlock bucket_lock[BUCKET];
  struct buf head[BUCKET];
} bcache;

// 块号->桶号
int get_bucket_index(uint blockno) { return blockno % BUCKET; }

// 从双向链表中删除该节点
void delete_entry(struct buf *p) {
  p->next->prev = p->prev;
  p->prev->next = p->next;
}

// 在双向链表中插入该节点
void add_entry(struct buf *head, struct buf *b) {
  b->prev = head;
  b->next = head->next;
  head->next->prev = b;
  head->next = b;
}

// 选择最久未使用的buffer
struct buf *least_recent_used_bufffer() {
  int index = -1;
  uint min_tick = 0xffffffff;
  for (int i = 0; i < NBUF; i++) {
    // 该buffer未被使用
    if (bcache.buf[i].owner == NONE) {
      return &bcache.buf[i];
    }

    // 选择引用计数为0且访问时间最小的buffer
    if (bcache.buf[i].refcnt == 0 && bcache.buf[i].access_time < min_tick) {
      index = i;
      min_tick = bcache.buf[i].access_time;
    }
  }
  if (index == -1) return 0;
  return &bcache.buf[index];
}

void binit(void) {
  struct buf *b;
  char buf[16];
  initlock(&bcache.biglock, "bcache-bigblock");
  // 初始化各桶的链表头部与保护锁
  for (int i = 0; i < BUCKET; i++) {
    snprintf(buf, 16, "bcache-%d", i);
    initlock(&bcache.bucket_lock[i], buf);
    bcache.head[i].prev = &bcache.head[i];
    bcache.head[i].next = &bcache.head[i];
  }
  // 初始化各个buffer的拥有者与保护锁
  for (b = bcache.buf; b < bcache.buf + NBUF; b++) {
    initsleeplock(&b->lock, "buffer");
    b->owner = NONE;
  }
}

// Look through buffer cache for block on device dev.
// If not found, allocate a buffer.
// In either case, return locked buffer.
static struct buf *bget(uint dev, uint blockno) {
  struct buf *b;
  int index = get_bucket_index(blockno);
  acquire(&bcache.bucket_lock[index]);
  // 遍历该桶链表，查询是否缓存该块
  for (b = bcache.head[index].next; b != &bcache.head[index]; b = b->next) {
    if (b->dev == dev && b->blockno == blockno) {
      b->refcnt++;

      release(&bcache.bucket_lock[index]);
      acquiresleep(&b->lock);
      return b;
    }
  }
  release(&bcache.bucket_lock[index]);
  // 未缓存该块，分配新块存放对应数据
  // 先获取大锁，再获取bucket锁，避免死锁发生
  acquire(&bcache.biglock);
  acquire(&bcache.bucket_lock[index]);
  // 再次检查是否存在对应buffer，避免为同一个块分配两个buffer
  for (b = bcache.head[index].next; b != &bcache.head[index]; b = b->next) {
    if (b->dev == dev && b->blockno == blockno) {
      b->refcnt++;
      release(&bcache.bucket_lock[index]);
      release(&bcache.biglock);
      acquiresleep(&b->lock);
      return b;
    }
  }
  // 分配一个buffer存放相应数据
  while (1) {
    b = least_recent_used_bufffer();
    if (b == 0) {
      printf("no buffer\n");
      continue;
    }
    int old_owner = b->owner;
    // 若拥有者就是本身或未使用则不需要加其他锁
    if (old_owner == NONE || old_owner == index) {
      b->dev = dev;
      b->blockno = blockno;
      b->valid = 0;
      b->refcnt = 1;
      b->owner = index;

      // 之前未使用，需加入到对应链表
      if (old_owner == NONE) add_entry(&bcache.head[index], b);

      release(&bcache.bucket_lock[index]);
      release(&bcache.biglock);
      acquiresleep(&b->lock);
      return b;
    } else {
      // 拥有者为其他bucket，需要加锁
      acquire(&bcache.bucket_lock[old_owner]);
      if (b->refcnt != 0) {  // 引用计数不为0，中途被改变，重新执行分配过程
        printf("reference count change. b->refcnt:%d\n", b->refcnt);
        release(&bcache.bucket_lock[old_owner]);
        continue;
      }
      b->dev = dev;
      b->blockno = blockno;
      b->valid = 0;
      b->refcnt = 1;
      b->owner = index;

      delete_entry(b);                    // 从原有链表中删除该节点
      add_entry(&bcache.head[index], b);  // 在本桶链表中加入该节点

      release(&bcache.bucket_lock[old_owner]);
      release(&bcache.bucket_lock[index]);
      release(&bcache.biglock);
      acquiresleep(&b->lock);
      return b;
    }
  }
  release(&bcache.bucket_lock[index]);
  release(&bcache.biglock);
  panic("bget: no buffers");
}

// Return a locked buf with the contents of the indicated block.
struct buf *bread(uint dev, uint blockno) {
  struct buf *b;

  b = bget(dev, blockno);
  if (!b->valid) {
    virtio_disk_rw(b, 0);
    b->valid = 1;
  }
  return b;
}

// Write b's contents to disk.  Must be locked.
void bwrite(struct buf *b) {
  if (!holdingsleep(&b->lock)) panic("bwrite");
  virtio_disk_rw(b, 1);
}

// Release a locked buffer.
// Move to the head of the most-recently-used list.
void brelse(struct buf *b) {
  if (!holdingsleep(&b->lock)) panic("brelse");
  releasesleep(&b->lock);
  int index = get_bucket_index(b->blockno);
  acquire(&bcache.bucket_lock[index]);
  b->refcnt--;
  // 引用计数为0时记录访问时间
  if (b->refcnt == 0) {
    b->access_time = ticks;
  }
  release(&bcache.bucket_lock[index]);
}

void bpin(struct buf *b) {
  int index = get_bucket_index(b->blockno);
  acquire(&bcache.bucket_lock[index]);
  b->refcnt++;
  release(&bcache.bucket_lock[index]);
}

void bunpin(struct buf *b) {
  int index = get_bucket_index(b->blockno);
  acquire(&bcache.bucket_lock[index]);
  b->refcnt--;
  release(&bcache.bucket_lock[index]);
}
```

**通过截图**
![](https://img-blog.csdnimg.cn/86abbcad3a9e4e5fa02182f53ef29947.png)

