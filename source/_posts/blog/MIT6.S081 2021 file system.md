---
title: MIT6.S081 2021 file system
date: 2022-08-21 19:41:06
tags: file system 6.081
categories: 国外课程实验
---
<meta name="referrer" content="no-referrer" />


## xv6 book记录
看pdf看困了，主要看看几张图，最后再看看real world就可以了
![](https://img-blog.csdnimg.cn/3281b19b5da4425d90808f4af65adfa2.png)
**xv6文件系统架构**
> The disk layer reads and writes blocks on an virtio hard drive. The buffer cache layer caches disk blocks and synchronizes access to them, making sure that only one kernel process at a time can modify the data stored in any particular block. The logging layer allows higher layers to wrap updates to several blocks in a transaction, and ensures that the blocks are updated atomically in the face of crashes (i.e., all of them are updated or none). The inode layer provides individual files, each represented as an inode with a unique i number and some blocks holding the file’s data. The directory layer implements each directory as a special kind of inode whose content is a sequence of directory entries, each of which contains a file’s name and i-number. The pathname layer provides hierarchical path names like /usr/rtm/xv6/fs.c, and resolves them with recursive lookup. The file descriptor layer abstracts many Unix resources (e.g., pipes, devices, files, etc.) using the file system interface, simplifying the lives of application programmers.

buffer cache：内存数据与硬盘数据映射（caching and synchronizing access to the disk）
> buffer cache维持双向链表，头部表示最近访问，尾部表示最久未访问
binit：在链表头部插入buf
bget：正向遍历现有buf，反向遍历空余位置
brelse：引用计数为0时将buf插入链表头部

logging：实现事务保证，先写入日志块，然后写入实际块（效率挺低的）（provide crash recovery）
inode：索引节点硬盘数据与内存数据的维护
directory：
```c
struct dirent {
  ushort inum;
  char name[DIRSIZ];
};
```
![](https://img-blog.csdnimg.cn/e88263d373824653b57aadd0faf179de.png)
**硬盘数据布局：**
引导块 超级块	日志块 索引节点	位图	数据块
![](https://img-blog.csdnimg.cn/6ceb5621012642d39b5d336e20e4fe54.png)
**索引节点结构：**
直接查找+一级索引

## Large files
>Modify bmap() so that it implements a doubly-indirect block, in addition to direct blocks and a singly-indirect block. You'll have to have only 11 direct blocks, rather than 12, to make room for your new doubly-indirect block; you're not allowed to change the size of an on-disk inode. The first 11 elements of ip->addrs[] should be direct blocks; the 12th should be a singly-indirect block (just like the current one); the 13th should be your new doubly-indirect block. You are done with this exercise when bigfile writes 65803 blocks and usertests runs successfully

这部分比较简单，只需要将一个直接查找的位置变成二级索引即可，根据hint实现较为简单。
修改dinode结构体与inode结构体定义
```c
#define NDIRECT 11
#define NINDIRECT (BSIZE / sizeof(uint))
#define NDOUBLYINDIRECT (BSIZE / sizeof(uint)) * NINDIRECT
#define MAXFILE (NDIRECT + NINDIRECT + NDOUBLYINDIRECT)

// On-disk inode structure
struct dinode {
  short type;               // File type
  short major;              // Major device number (T_DEVICE only)
  short minor;              // Minor device number (T_DEVICE only)
  short nlink;              // Number of links to inode in file system
  uint size;                // Size of file (bytes)
  uint addrs[NDIRECT + 2];  // Data block addresses
};

// in-memory copy of an inode
struct inode {
  uint dev;           // Device number
  uint inum;          // Inode number
  int ref;            // Reference count
  struct sleeplock lock; // protects everything below here
  int valid;          // inode has been read from disk?

  short type;         // copy of disk inode
  short major;
  short minor;
  short nlink;
  uint size;
  uint addrs[NDIRECT+2];
};
```
bmap函数，仿照一级索引块处理流程即可，二级索引块->一级索引块->数据块
```c
static uint bmap(struct inode *ip, uint bn) {
  uint addr, *a, *b;
  struct buf *bp, *buffer;
  uint blk_no, blk_index;  // 一级索引块块号以及索引块下标

  if (bn < NDIRECT) {
    if ((addr = ip->addrs[bn]) == 0) ip->addrs[bn] = addr = balloc(ip->dev);
    return addr;
  }

  bn -= NDIRECT;
  if (bn < NINDIRECT) {
    // Load indirect block, allocating if necessary.
    if ((addr = ip->addrs[NDIRECT]) == 0) ip->addrs[NDIRECT] = addr = balloc(ip->dev);
    bp = bread(ip->dev, addr);
    a = (uint *)bp->data;
    if ((addr = a[bn]) == 0) {
      a[bn] = addr = balloc(ip->dev);
      log_write(bp);
    }
    brelse(bp);
    return addr;
  }

  bn -= NINDIRECT;
  if (bn < NDOUBLYINDIRECT) {
    //  载入二级索引块
    if ((addr = ip->addrs[NDIRECT + 1]) == 0) ip->addrs[NDIRECT + 1] = addr = balloc(ip->dev);
    bp = bread(ip->dev, addr);
    a = (uint *)bp->data;
    // 计算块号与下标
    blk_no = bn / NINDIRECT;
    blk_index = bn % NINDIRECT;
    // 载入一级索引块
    if ((addr = a[blk_no]) == 0) {
      a[blk_no] = addr = balloc(ip->dev);
      log_write(bp);
    }
    buffer = bread(ip->dev, addr);
    b = (uint *)buffer->data;
    // 必要时分配数据块
    if ((addr = b[blk_index]) == 0) {
      b[blk_index] = addr = balloc(ip->dev);
      log_write(buffer);
    }
    // 释放buffer，返回数据块号
    brelse(buffer);
    brelse(bp);
    return addr;
  }

  panic("bmap: out of range");
}
```
 itrunc函数，对索引块先释放buffer再free，数据块则直接free
```c
void itrunc(struct inode *ip) {
  int i, j;
  struct buf *bp, *buffer;
  uint *a, *b;

  for (i = 0; i < NDIRECT; i++) {
    if (ip->addrs[i]) {
      bfree(ip->dev, ip->addrs[i]);
      ip->addrs[i] = 0;
    }
  }

  if (ip->addrs[NDIRECT]) {
    bp = bread(ip->dev, ip->addrs[NDIRECT]);
    a = (uint *)bp->data;
    for (j = 0; j < NINDIRECT; j++) {
      if (a[j]) bfree(ip->dev, a[j]);
    }
    brelse(bp);
    bfree(ip->dev, ip->addrs[NDIRECT]);
    ip->addrs[NDIRECT] = 0;
  }

  if (ip->addrs[NDIRECT + 1]) {
    // 载入二级索引块
    bp = bread(ip->dev, ip->addrs[NDIRECT + 1]);
    a = (uint *)bp->data;
    for (i = 0; i < NINDIRECT; i++) {
      // 载入一级索引块
      if (a[i] == 0) break;
      buffer = bread(ip->dev, a[i]);
      b = (uint *)buffer->data;
      for (j = 0; j < NINDIRECT; j++) {
        // 释放数据块
        if (b[j] == 0) break;
        bfree(ip->dev, b[j]);
      }
      // 释放一级索引块
      brelse(buffer);
      bfree(ip->dev, a[i]);
    }
    // 释放二级索引块
    brelse(bp);
    bfree(ip->dev, ip->addrs[NDIRECT + 1]);
    ip->addrs[NDIRECT + 1] = 0;
  }
  ip->size = 0;
  iupdate(ip);
}
```
## Symbolic links
>You will implement the symlink(char *target, char *path) system call, which creates a new symbolic link at path that refers to file named by target. For further information, see the man page symlink. To test, add symlinktest to the Makefile and run it. Your solution is complete when the tests produce the following output (including usertests succeeding).

这部分遇到了一些小问题，通过gdb解决了（第一次真正使用gdb调试qemu，之前调试都没啥效果）
首先补全symlink系统调用路径
```c
// 用户空间调用
r = symlink("/testsymlink/a", "/testsymlink/b");
// user.h中添加函数声明
int symlink(char *, char *);
// syscall.h中添加调用号
#define SYS_symlink 22
// usys.pl中加入函数入口点
entry("symlink");
生成代码：
.global symlink
symlink:
 li a7, SYS_symlink
 ecall
 ret
// syscall.c中加入symlink内核函数声明与表项，使syscall函数能够跳转到sys_symlink函数
extern uint64 sys_symlink(void);
static uint64 (*syscalls[])(void) = {
[SYS_symlink] sys_symlink,
};
```
然后定义文件类型与打开标志
```c
#define T_DIR 1      // Directory
#define T_FILE 2     // File
#define T_DEVICE 3   // Device
#define T_SYMLINK 4  // Symbolic links

#define O_RDONLY 0x000
#define O_WRONLY 0x001
#define O_RDWR 0x002
#define O_CREATE 0x200
#define O_TRUNC 0x400
#define O_NOFOLLOW 0x100
```

```c
static struct inode *create(char *path, short type, short major, short minor) {
  ilock(ip);
  ip->major = major;
  ip->minor = minor;
  ip->nlink = 1;
  iupdate(ip);
  return ip;
}
```
sys_symlink函数实际上只需在path处创建一个SYMLINK类型的文件，将target写入文件即可。需要注意的是create方法调用后已经持有了ip->lock，不需要再次加锁。另外各操作应在begin_op()——end_op()，不然会报log_write outside of trans错误。
sys_symlink实现代码如下：
```c
uint64 sys_symlink(void) {
  struct inode *ip;
  int ret;
  char target[MAXPATH], path[MAXPATH];
  // 读取用户参数
  if (argstr(0, target, MAXPATH) < 0) return -1;
  if (argstr(1, path, MAXPATH) < 0) return -1;
  begin_op();
  // 创建T_SYMLINK类型文件
  ip = create(path, T_SYMLINK, 0, 0);
  if (ip == 0) {
    end_op();
    return -1;
  }
  // 将链接的路径写入文件即可
  ret = writei(ip, 0, (uint64)target, 0, MAXPATH);
  iunlockput(ip);
  end_op();
  if (ret != MAXPATH) return -1;
  return 0;
}
```
sys_open中打开文件若没有O_NOFOLLOW标志则需要将inode节点指向真正链接的文件，拥有O_NOFOLLOW标志则照常运行。函数修改如下：
```c
struct inode *follow_link(const char *file_path) {
  char path[MAXPATH];
  struct inode *ip;
  int ret;
  int times = 0;
  // 拷贝相应路径
  strncpy(path, file_path, MAXPATH);
  // 循环迭代符号文件，深度超出10则报错
  for (times = 0; times < 10; times++) {
    if ((ip = namei(path)) == 0) return 0;
    // 加锁，访问索引节点内容
    ilock(ip);
    // 若不为符号链接文件则返回相应inode
    if (ip->type != T_SYMLINK) {
      iunlock(ip);
      return ip;
    }
    // 读取文件中链接路径
    ret = readi(ip, 0, (uint64)path, 0, MAXPATH);
    iunlock(ip);
    if (ret != MAXPATH) {
      return 0;
    }
  }
  return 0;
}
uint64 sys_open(void) {
  if (omode & O_CREATE) {
    ip = create(path, T_FILE, 0, 0);
    if (ip == 0) {
      end_op();
      return -1;
    }
  } else {
    if (omode & O_NOFOLLOW) {
      if ((ip = namei(path)) == 0) {
        end_op();
        return -1;
      }
    } else {
      if ((ip = follow_link(path)) == 0) {
        end_op();
        return -1;
      }
    }
    ilock(ip);
```

在follow_link函数实现时我错误地使用了iunlockput方法，使得inode的引用计数变为0了，在sys_open函数ilock的时候就会报ilock错误，实际上我在只需要调用iunlock解锁即可，不需要降低引用计数。
```c
void ilock(struct inode *ip) {
  if (ip == 0 || ip->ref < 1) panic("ilock");
}
```
gdb调试过程如下：
由于错误使用函数，故系统引导时就会报错
```c
xv6 kernel is booting
panic: ilock
```
参考博客[qemu xv6 使用GDB调试](https://xistor.github.io/post/6.s081/xv6-gdb/)
1	创建～/.gdbinit写入以下内容
```bash
add-auto-load-safe-path /home/x/xv6-labs-2021/.gdbinit
set auto-load safe-path /
```
2 在一个终端运行make qemu-gdb，另一个终端运行gdb-multiarch

在lab目录下的.gdbinit文件中已经导入了内核符号表（kernel/kernel），故不需要再次导入（调试用户程序需要导入相应的用户程序符号表）
```bash
set confirm off
set architecture riscv:rv64
target remote 127.0.0.1:25000
symbol-file kernel/kernel
set disassemble-next-line auto
set riscv use-compressed-breakpoints yes
```
![](https://img-blog.csdnimg.cn/19bf0ac903f541e284558e185d9b0957.png)
此时已经可以使用普通的gdb进行调试，判断错误在follow_link函数后，将该函数设置为断点
![](https://img-blog.csdnimg.cn/1c61bbdc27484c638b3e742f9d48ea9d.png)
此时就能明显发现iunlockput函数的错误使用。


修改Makefile，加入symlinktest

```bash
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
	$U/_symlinktest\
```

修改timeout时间，避免测试超时（全部加个0）
```python
@test(40, "running bigfile")
def test_bigfile():
    r.run_qemu(shell_script([
        'bigfile'
    ]), timeout=1800)
    r.match('^wrote 65803 blocks$')
    r.match('^bigfile done; ok$')

@test(0, "running symlinktest")
def test_symlinktest():
    r.run_qemu(shell_script([
        'symlinktest'
    ]), timeout=200)

@test(20, "symlinktest: symlinks", parent=test_symlinktest)
def test_symlinktest_symlinks():
    r.match("^test symlinks: ok$")

@test(20, "symlinktest: concurrent symlinks", parent=test_symlinktest)
def test_symlinktest_symlinks():
    r.match("^test concurrent symlinks: ok$")

@test(19, "usertests")
def test_usertests():
    r.run_qemu(shell_script([
        'usertests'
    ]), timeout=3600)
    r.match('^ALL TESTS PASSED$')

@test(1, "time")
def test_time():
    check_time()

```
测试通过截图：
![](https://img-blog.csdnimg.cn/e8b6cb3906ce4de4986ac3528f159fc5.png)

