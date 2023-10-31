---
title: MIT6.S081 Multithreading
date: 2022-08-28 23:05:29
tags: mit6.081 multithread
categories: 国外课程实验
---
<meta name="referrer" content="no-referrer" />


## xv6 book记录
阅读xv6 book之前，简要看一下《深入了解linux内核》进程一章（不怎么看得懂），当然xv6 book也看的犯困。该实验比较简单，就看书花点时间。

 >First, xv6’s sleep and wakeup mechanism switches when a process waits for device or pipe I/O to complete,
or waits for a child to exit, or waits in the sleep system call. Second, xv6 periodically forces a switch to cope with processes that compute for long periods without sleeping.This multiplexing creates the illusion that each process has its own CPU, much as xv6 uses the memory allocator and hardware page tables to create the illusion that each process has its own memory.

xv6或者通过sleep wakeup主动让出cpu，或者定时强制切换进程。这种分时共享的技术创建了每个进程都拥有自己独立的CPU的假象，就像内存分配器与独立页表制造了每个进程都有独立地址空间的假象。

![](https://img-blog.csdnimg.cn/986aec337e5847a38fc01ea48d10c8ca.png)
先切换到调度器线程，然后再切换到其他线程。swtch不保存pc寄存器，而保存ra寄存器，即从swtch函数返回的地址。为保证进程状态与上下文设置正确，swtch的调用者需持有p->lock。通过线程切换有意地将控制传递给彼此的过程有时被称为协程;在这个例子中，sched和scheduler是彼此的协程。

在上下文切换时进程需持有p->lock并且不释放，由调度器负责释放，流程如下：
进程p1切换到进程p2
```c
p1: acquire p1->lock
scheduler: release p1->lock acquire p2->lock
p2: release p2->lock

// yield	p1-> scheduler
struct proc *p = myproc();
acquire(&p->lock);
p->state = RUNNABLE;
int intena;
struct proc *p = myproc();

if(!holding(&p->lock))
    panic("sched p->lock");
if(mycpu()->noff != 1)
    panic("sched locks");
if(p->state == RUNNING)
    panic("sched running");
if(intr_get())
    panic("sched interruptible");

intena = mycpu()->intena;
swtch(&p->context, &mycpu()->context);
// scheduler
c->proc = 0;
}
release(&p->lock);


// scheduler -> p2
acquire(&p->lock);
if(p->state == RUNNABLE) {
    // Switch to chosen process.  It is the process's job
    // to release its lock and then reacquire it
    // before jumping back to us.
    p->state = RUNNING;
    c->proc = p;
    swtch(&c->context, &p->context);
 // sched p2
mycpu()->intena = intena;
 // yield
 release(&p->lock);
```
为了能获取到当前运行进程的proc结构体，每个CPU保存一系列数据记录相关信息
丢失唤醒问题：
```c
while(s->count==0){
    // 中间可能丢失唤醒
    sleep(s);
}
```
解决：
```c
acquire(&s->lock);
while(s->count == 0)
    sleep(s, &s->lock);
```

父进程wait与子进程exit的竞争，或者父进程exit与子进程exit的竞争
通过同样顺序申请wait_lock和p->lock避免死锁
kill系统调用只是修改killed和进程状态，在有些不重要的时候sleep所在循环会额外检查p->killed
```c
  while(pi->nread == pi->nwrite && pi->writeopen){  //DOC: pipe-empty
    if(pr->killed){
      release(&pi->lock);
      return -1;
    }
    sleep(&pi->nread, &pi->lock); //DOC: piperead-sleep
  }
```
但在一些重要操作的时候，sleep循环并不检查killed，保证操作的原子性或IO正确性

proc结构体各锁保护对象
```c
  // p->lock must be held when using these:
  enum procstate state;        // Process state
  void *chan;                  // If non-zero, sleeping on chan
  int killed;                  // If non-zero, have been killed
  int xstate;                  // Exit status to be returned to parent's wait
  int pid;                     // Process ID

  // wait_lock must be held when using this:
  struct proc *parent;         // Parent process
```
signal只唤醒等待队列中的一个进程，而broadcast唤醒所有等待队列的进程
sleep与kill也存在竞态：在killed检查与sleep语句之间

## Uthread
>Your job is to come up with a plan to create threads and save/restore registers to switch between threads, and implement that plan. When you're done, make grade should say that your solution passes the uthread test.
>
这部分只需要简单抄一下allocproc函数和swtch.S就可以了

```c
// allocproc
 // Set up new context to start executing at forkret,
 // which returns to user space.
 memset(&p->context, 0, sizeof(p->context));
 p->context.ra = (uint64)forkret;
 p->context.sp = p->kstack + PGSIZE;
```
实验代码
```c
// Saved registers for kernel context switches.
struct context {
  uint64 ra;
  uint64 sp;

  // callee-saved
  uint64 s0;
  uint64 s1;
  uint64 s2;
  uint64 s3;
  uint64 s4;
  uint64 s5;
  uint64 s6;
  uint64 s7;
  uint64 s8;
  uint64 s9;
  uint64 s10;
  uint64 s11;
};

struct thread {
  char stack[STACK_SIZE]; /* the thread's stack */
  int state;              /* FREE, RUNNING, RUNNABLE */
  struct context context;
};
extern void thread_switch(struct context *, struct context *);
// thread_create
// YOUR CODE HERE
memset(&t->context, 0, sizeof(t->context));
t->context.ra = (uint64)func;
t->context.sp = (uint64)(t->stack + STACK_SIZE - 1);

// thread_schedule
/* YOUR CODE HERE
 * Invoke thread_switch to switch from t to next_thread:
 * thread_switch(??, ??);
 */
thread_switch(&t->context, &current_thread->context);

// uthread_switch.S
	.globl thread_switch
thread_switch:
	sd ra, 0(a0)
	sd sp, 8(a0)
	sd s0, 16(a0)
	sd s1, 24(a0)
	sd s2, 32(a0)
	sd s3, 40(a0)
	sd s4, 48(a0)
	sd s5, 56(a0)
	sd s6, 64(a0)
	sd s7, 72(a0)
	sd s8, 80(a0)
	sd s9, 88(a0)
	sd s10, 96(a0)
	sd s11, 104(a0)

	ld ra, 0(a1)
	ld sp, 8(a1)
	ld s0, 16(a1)
	ld s1, 24(a1)
	ld s2, 32(a1)
	ld s3, 40(a1)
	ld s4, 48(a1)
	ld s5, 56(a1)
	ld s6, 64(a1)
	ld s7, 72(a1)
	ld s8, 80(a1)
	ld s9, 88(a1)
	ld s10, 96(a1)
	ld s11, 104(a1)
    
	ret    /* return to ra */
```
刚开始一直想着怎么让调度完后跳转到thread_x函数中调用thread_yield();后面的语句，后面才想到只需要跳转thread_schedule最后一条语句后面并且设置好各寄存器，就可以一直函数返回到预期的指令地址了。

开始写代码时把其他代码都抄了，却没注意p->context.sp = p->kstack + PGSIZE;语句，导致一直在执行c函数，其他进程的state都很奇怪。后面才想到要设置栈（sp）。
![](https://img-blog.csdnimg.cn/387e65f9193c4dff848698de9bf0b3ac.png)
## Using threads
>To avoid this sequence of events, insert lock and unlock statements in put and get in notxv6/ph.c so that the number of keys missing is always 0 with two threads. The relevant pthread calls are:
pthread_mutex_t lock;            // declare a lock
pthread_mutex_init(&lock, NULL); // initialize the lock
pthread_mutex_lock(&lock);       // acquire lock
pthread_mutex_unlock(&lock);     // release lock
You're done when make grade says that your code passes the ph_safe test, which requires zero missing keys with two threads. It's OK at this point to fail the ph_fast test.

丢失键值的原因只需要看两行语句就可以了
```c
// p : &table[i] n : table[i]
e->next = n;
*p = e;
```
多个线程同时修改table的值，假设以如下顺序执行

```c
// 线程1为e1，线程2为e2
 e1->next = n;
 e2->next = n;
 *p = e2;
 *p = e1;
```
则e2丢失
![](https://img-blog.csdnimg.cn/fc3d79944d134e3581ca4254d21b9c04.jpeg)
代码部分：
首先增大NBUCKET，降低各线程冲突概率
```c
#define NBUCKET 100
```
声明并初始化互斥锁
```c
struct entry {
  int key;
  int value;
  struct entry *next;
};
struct entry *table[NBUCKET];
pthread_mutex_t lock[NBUCKET];  // declare a lock
int keys[NKEYS];
int nthread = 1;

int main(int argc, char *argv[]) {
  pthread_t *tha;
  void *value;
  double t1, t0;

  if (argc < 2) {
    fprintf(stderr, "Usage: %s nthreads\n", argv[0]);
    exit(-1);
  }
  nthread = atoi(argv[1]);
  tha = malloc(sizeof(pthread_t) * nthread);
  srandom(0);
  assert(NKEYS % nthread == 0);
  for (int i = 0; i < NKEYS; i++) {
    keys[i] = random();
  }

  // 初始化互斥锁锁
  for (int i = 0; i < NBUCKET; i++) {
    pthread_mutex_init(&lock[i], NULL);
  }
  ...
}
```
put函数的模式为：
	查询是否存在key
	不存在：插入key，value
	存在：更新value
故需对整段代码加锁，保证逻辑的正确性（不存在相同的key），如果不对查询段加锁则可能导致插入两个相同的key

get函数进行读操作，本来是需要加锁的，但程序的顺序保证此时只有读操作，故不需要加锁

```c
  //
  // first the puts
  //
  t0 = now();
  for (int i = 0; i < nthread; i++) {
    assert(pthread_create(&tha[i], NULL, put_thread, (void *)(long)i) == 0);
  }
  for (int i = 0; i < nthread; i++) {
    assert(pthread_join(tha[i], &value) == 0);
  }
  t1 = now();

  printf("%d puts, %.3f seconds, %.0f puts/second\n", NKEYS, t1 - t0, NKEYS / (t1 - t0));

  //
  // now the gets
  //
  t0 = now();
  for (int i = 0; i < nthread; i++) {
    assert(pthread_create(&tha[i], NULL, get_thread, (void *)(long)i) == 0);
  }
  for (int i = 0; i < nthread; i++) {
    assert(pthread_join(tha[i], &value) == 0);
  }
  t1 = now();

  printf("%d gets, %.3f seconds, %.0f gets/second\n", NKEYS * nthread, t1 - t0, (NKEYS * nthread) / (t1 - t0));
```

```c
static void put(int key, int value) {
  int i = key % NBUCKET;

  // is the key already present?
  struct entry *e = 0;
  pthread_mutex_lock(&lock[i]);
  for (e = table[i]; e != 0; e = e->next) {
    if (e->key == key) break;
  }
  if (e) {
    // update the existing key.
    e->value = value;
  } else {
    // the new is new.
    insert(key, value, &table[i], table[i]);
  }
  pthread_mutex_unlock(&lock[i]);
}
```
## Barrier
>Your goal is to achieve the desired barrier behavior. In addition to the lock primitives that you have seen in the ph assignment, you will need the following new pthread primitives; look here and here for details.
pthread_cond_wait(&cond, &mutex);  // go to sleep on cond, releasing lock mutex, acquiring upon wake up
pthread_cond_broadcast(&cond);     // wake up every thread sleeping on cond
Make sure your solution passes make grade's barrier test.

非常简单，直接贴代码

```c
static void barrier_init(void) {
  assert(pthread_mutex_init(&bstate.barrier_mutex, NULL) == 0);
  assert(pthread_cond_init(&bstate.barrier_cond, NULL) == 0);
  bstate.nthread = 0;
  bstate.round = 0;
}
static void barrier() {
  // YOUR CODE HERE
  //
  // Block until all threads have called barrier() and
  // then increment bstate.round.
  //
  pthread_mutex_lock(&bstate.barrier_mutex);
  bstate.nthread++;
  if (bstate.nthread == nthread) {
    bstate.round++;
    pthread_cond_broadcast(&bstate.barrier_cond);
    bstate.nthread = 0;
  } else {
    pthread_cond_wait(&bstate.barrier_cond, &bstate.barrier_mutex);
  }
  pthread_mutex_unlock(&bstate.barrier_mutex);
}
```

**通过截图**
![](https://img-blog.csdnimg.cn/5ced4658943e43b38752932ea9a5d5a3.png)

