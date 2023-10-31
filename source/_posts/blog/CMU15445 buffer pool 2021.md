---
title: CMU15445 buffer pool 2021
date: 2022-01-06 16:58:07
tags: c++ CMU15445 buffer pool
categories: 国外课程实验
---
<meta name="referrer" content="no-referrer" />



**cmu汇总博客：[CMU15445 2021](https://www.jiasun.top/blog/CMU15445%202021.html)**


[lab1地址](https://15445.courses.cs.cmu.edu/fall2021/project1/)
实验背景：
BufferManager运行时内部维护一份高速缓存，其中有些page是正在被使用的，有些page是不被使用但但仍有意义的(unpinned)，Repalcer则是维护那些unpinned page，在必要的时候将其中某些page替换出去。
page_id和frame_id：
前者指的是某一个page编号，比如disk上第十个page；后者指的是BufferPoolManager中的页框号码。
前者需要通过disk层获取，后者是BufferPoolManager中固定的，从0开始。
[《CMU15445》 && \[BufferPoolManager\]](https://zhuanlan.zhihu.com/p/366788722)
### 心得体会
本来打算使用Gradescope测试一下代码正确性，但没找到注册码，所以以下代码仅仅通过自带的测试代码。不过我写这个就是为了熟悉C++，正确性倒对我没太大影响，如果有办法注册Gradescope望请告知。
在函数中我大多使用lock_guard进行加锁，只是为了图方便，也不知道是否实现了线程安全。但一个持有锁的函数调用另一个加锁的函数会造成死锁，可以使用recursive_mutex解决该问题，但我后面才知道recursive_mutex，懒得再改了。
[\[c++\] 同一线程两次加锁可能导致死锁问题](https://blog.csdn.net/ykun089/article/details/113697205)
[c++11 std::recursive_mutex](https://blog.csdn.net/weixin_40179091/article/details/108650433)

**LRU Replacement Policy**
根据测试代码推出，对同一个元素调用两次unpin函数，第二次无效
GNU C 的一大特色就是__attribute__ 机制。attribute 可以设置函数属性（Function Attribute）、变量属性（Variable Attribute）和类型属性（Type Attribute）。
其位置约束为： 放于声明的尾部“;” 之前
attribute 书写特征为: attribute 前后都有两个下划线，并切后面会紧跟一对原括弧，括弧里面是相应的__attribute__ 参数。
attribute 语法格式为: attribute ((attribute-list))
attribute((unused)) 其作用是即使没有使用这个函数，编译器也不警告。
**Buffer Pool Manager Instance**
这个部分我都是按照给出的提示写的，倒也没太大问题，就是刚开始都没发现要用disk_manager_成员，要修改Page，后面简单看了这两个类的定义才正确实现了函数的功能。
**Parallel Buffer Pool Manager**
这个部分功能本来是最简单的，调用一下第二部分的代码就结束了。然而当时写的太快，一些符号写错了。

```cpp
do {
  page = instances_[index]->NewPage(page_id);
  if (page != nullptr) {
    start_index_ = (start_index_ + 1) % num_instances_;
    return page;
  }
  index = (index + 1) % num_instances_;
} while (index != start_index_);
//其中索引加1时 = 写成了 +=
bool ParallelBufferPoolManager::FlushPgImp(page_id_t page_id) {
  // Flush page_id from responsible BufferPoolManagerInstance
  BufferPoolManager *manager = GetBufferPoolManager(page_id);
  return manager->FlushPage(page_id);
}
//其中manager->FlushPage(page_id);写成了manager->FetchPage(page_id); 
```
这就引来了一堆错误，一进行测试就产生段错误（数组越界）。然后就开始了几小时的debug。我觉得这过程还比较有纪念意义的，故记录在此。
>debug

```bash
1 mkdir build_debug  #创建专用于debug的文件夹
2 cmake -DCMAKE_BUILD_TYPE=DEBUG .. #看CMakeLists.txt实际上就是加了一个-g选项，生成调试信息。
# CMakeLists.txt
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -fPIC -Wall -Wextra -Werror -march=native")
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -Wno-unused-parameter -Wno-attributes") #TODO: remove
set(CMAKE_CXX_FLAGS_DEBUG "${CMAKE_CXX_FLAGS_DEBUG} -O0 -ggdb -fsanitize=address -fno-omit-frame-pointer -fno-optimize-sibling-calls")
set(CMAKE_EXE_LINKER_FLAGS  "${CMAKE_EXE_LINKER_FLAGS} -fPIC")
set(CMAKE_SHARED_LINKER_FLAGS "${CMAKE_SHARED_LINKER_FLAGS} -fPIC")
set(CMAKE_STATIC_LINKER_FLAGS "${CMAKE_STATIC_LINKER_FLAGS} -fPIC")
3 make parallel_buffer_pool_manager_test -j12
```
段错误实际上是最好调试的（我gbd就会几个命令）
```bash
gdb./test/parallel_buffer_pool_manager_test  
r # 执行
bt # 查看调用栈
frame n # 转到栈n的上下文
p var # 输出变量值 
```
通过以上这几个步骤我那个=误写成+=的错误就被找出来了。而FlushPage不小心写成FetchPage的错误就非常难找的（vscode自动补全）。

```cpp
//parallel_buffer_pool_manager_test.cpp
for (int i = 0; i < 5; ++i) {
  EXPECT_EQ(true, bpm->UnpinPage(i, true));
  bpm->FlushPage(i);
}
for (int i = 0; i < 5; ++i) {
  EXPECT_NE(nullptr, bpm->NewPage(&page_id_temp));
  bpm->UnpinPage(page_id_temp, false);
}
```
测试代码段的大意为：通过5次UnpinPage操作，应该多了5个可被淘汰的页，也就能新建5个新页。
运行测试代码时，EXPECT_NE(nullptr, bpm->NewPage(&page_id_temp));一行报错。在此打断点（b parallel_buffer_pool_manager_test.cpp：73）后发现仅仅第一次时报错，后续4次成功。当然这是74行再次调用UnpinPage函数的结果。这也就是说第一个for循环并没有成功将5页放入replacer中，所以我错误地一直研究UnpinPage函数的调用路径。

```bash
gdb./test/parallel_buffer_pool_manager_test  
b parallel_buffer_pool_manager_test.cpp：73
r # 执行
n # 下一步，但不进入函数
s # 下一步，进入函数
c # 下一个断点
```
在设置许多个printf语句，通过n或s进入UnpinPage函数内部执行路径，一直没有发现问题。而后直接在测试代码处查看UnpinPage是否改变了相应replacer的size，没想到居然改变了，而执行完bpm->FlushPage(i);
后又变成0了，我就知道是FlushPage函数的问题，稍微检查一下后即发现是拼写错误。流程如下

```bash
 gdb ./test/parallel_buffer_pool_manager_test 
 b parallel_buffer_pool_manager_test.cpp:69
 r
 #69          EXPECT_EQ(true, bpm->UnpinPage(i, true));
 p bpm->instances_ [0]->replacer_ ->Size()
 #0
 n
 #70          bpm->FlushPage(i);
 p bpm->instances_ [0]->replacer_ ->Size()
 #1
 n
 #68        for (int i = 0; i < 5; ++i) {
 p bpm->instances_ [0]->replacer_ ->Size()
 #0
```
这也算一次比较奇葩的经历。在debug这个之后，编译器提示内存泄漏，显示我在构造函数申请的空间没有释放，这是因为我析构函数刚开始只有delete[] instances_;,我以为这样能顺带把指针数组里指向的对象也释放掉呢。<mark>实际上用了多少次new，就要使用多少次delete</mark>。

```cpp
ParallelBufferPoolManager::ParallelBufferPoolManager(size_t num_instances, size_t pool_size, DiskManager *disk_manager,
                                                     LogManager *log_manager) {
  // Allocate and create individual BufferPoolManagerInstances
  num_instances_ = num_instances;
  pool_size_ = pool_size;
  start_index_ = 0;
  instances_ = new BufferPoolManagerInstance *[num_instances];
  for (size_t i = 0; i < num_instances; i++) {
    instances_[i] = new BufferPoolManagerInstance(pool_size, num_instances, i, disk_manager, log_manager);
  }
}
ParallelBufferPoolManager::~ParallelBufferPoolManager() {
  for (size_t i = 0; i < num_instances_; i++) {  //释放指针所指对象空间
    delete instances_[i];
  }
  delete[] instances_;  //释放指针空间
}
```
### Gradescope测试
在知道如何注册Gradescope后[MU15445 C++ primer 2021](https://www.jiasun.top/blog/CMU15445%20C++%20primer%202021.html)， 我将我的代码提交到Gradescope，结果只得了85分。分别是

```cpp
// test_build显示的报错信息
#RoundRobinNewPage
Expected equality of these values:
  unpin_page + num_instances
    Which is: 11
  page_id_temp
    Which is: 13
#test_memory_safety
Timeout Happened during valgrind
#ParallelBufferPoolManager_HardTestD
这个好像就是我调试时用的printf语句没删去，执行太慢所以报错了
```
3个测试没通过
如果编译通过但测试一个没过有可能就是死锁了。<mark>修改代码后先通过本地样例，再进行格式调整，再进行提交</mark>
1 我认为LRUReplacer中的容量是没什么用的，因为replacer_和pages_的大小一样，不可能超
2 为减少执行时间，将LRUReplacer的实现从普通的链表变成链表+map（降低时间复杂度），但我当时为了通过RoundRobinNewPage，map的value是pair，实际上这是没必要的，用iterator当value就可以了
3 DeletePgImp中同时把replacer里的页删去（好像没影响）
4 NewPgImp中创建新页后立即写入磁盘，防止被淘汰后找不到页号（我没改也过了全部测试）
5 ParallelBufferPoolManager::NewPgImp中的起始索引，我改了半天，最后发现调换个位置就成了。

```cpp
size_t index = start_index_;
 // printf("index is %ld\n",index);
 do {
   page = instances_[index]->NewPage(page_id);
   if (page != nullptr) {
   	 // 原先在这增加起始索引
     break;
   }
   index = (index + 1) % num_instances_;
 } while (index != start_index_);
 // 改到这里
 start_index_ = (start_index_ + 1) % num_instances_;
```
测试通过截图
![](https://img-blog.csdnimg.cn/ae083617b52e45a6b9d32dc04899c0fa.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5pyA5L2z5o2f5Y-LMTAyMA==,size_20,color_FFFFFF,t_70,g_se,x_16)
参考博客：
[CMU15-445 数据库实验全满分通过笔记 2021 Fall bustub-cmudb](https://blog.csdn.net/twentyonepilots/article/details/120868216)
[CMU数据库（15-445）实验1-BufferPoolManager](https://www.cnblogs.com/JayL-zxl/p/14311883.html) 
[CMU 15445 Project 1 Buffer Pool | 手摸手带你撸一个内存管理池](https://zhuanlan.zhihu.com/p/382151977)

### 源代码（仅供参考）
#### LRU Replacement Policy

```cpp
//lru_replacer.h
#pragma once

#include <list>
#include <mutex>  // NOLINT
#include <unordered_map>
#include <utility>
#include <vector>

#include "buffer/replacer.h"
#include "common/config.h"

namespace bustub {

/**
 * LRUReplacer implements the Least Recently Used replacement policy.
 */
class LRUReplacer : public Replacer {
 public:
  /**
   * Create a new LRUReplacer.
   * @param num_pages the maximum number of pages the LRUReplacer will be required to store
   */
  explicit LRUReplacer(size_t num_pages);

  /**
   * Destroys the LRUReplacer.
   */
  ~LRUReplacer() override;

  bool Victim(frame_id_t *frame_id) override;

  void Pin(frame_id_t frame_id) override;

  void Unpin(frame_id_t frame_id) override;

  size_t Size() override;

 private:
  // TODO(student): implement me!
  using IteratorPair = std::pair<bool, std::list<frame_id_t>::iterator>;
  std::mutex lock_;
  std::list<frame_id_t> data_;
  std::unordered_map<frame_id_t, IteratorPair> map_;
  // size_t capacity_;
};

}  // namespace bustub

//lru_replacer.cpp
#include "buffer/lru_replacer.h"

namespace bustub {

LRUReplacer::LRUReplacer(size_t num_pages) {
  // capacity_ = num_pages;
  IteratorPair null_data(false, data_.end());
  frame_id_t max_frame_id = static_cast<frame_id_t>(num_pages);
  for (frame_id_t i = 0; i < max_frame_id; i++) {
    map_[i] = null_data;
  }
}

LRUReplacer::~LRUReplacer() = default;

bool LRUReplacer::Victim(frame_id_t *frame_id) {
  std::lock_guard<std::mutex> lock(lock_);
  if (data_.empty()) {
    return false;
  }
  *frame_id = data_.front();
  map_[*frame_id].first = false;
  data_.pop_front();
  return true;
}

void LRUReplacer::Pin(frame_id_t frame_id) {
  std::lock_guard<std::mutex> lock(lock_);
  if (map_[frame_id].first) {
    data_.erase(map_[frame_id].second);
    map_[frame_id].first = false;
  }
}

void LRUReplacer::Unpin(frame_id_t frame_id) {
  std::lock_guard<std::mutex> lock(lock_);
  // 我认为容量是没有用的，因为replacer的大小和pages大小一样，不可能超过
  if (!map_[frame_id].first) {
    data_.push_back(frame_id);
    map_[frame_id].first = true;
    map_[frame_id].second = --data_.end();
  }
}

size_t LRUReplacer::Size() {
  std::lock_guard<std::mutex> lock(lock_);
  return data_.size();
}

}  // namespace bustub

```
#### Buffer Pool Manager Instance

```cpp
//buffer_pool_manager_instance.h 未修改
#pragma once

#include <list>
#include <mutex>  // NOLINT
#include <unordered_map>

#include "buffer/buffer_pool_manager.h"
#include "buffer/lru_replacer.h"
#include "recovery/log_manager.h"
#include "storage/disk/disk_manager.h"
#include "storage/page/page.h"

namespace bustub {

/**
 * BufferPoolManager reads disk pages to and from its internal buffer pool.
 */
class BufferPoolManagerInstance : public BufferPoolManager {
 public:
  /**
   * Creates a new BufferPoolManagerInstance.
   * @param pool_size the size of the buffer pool
   * @param disk_manager the disk manager
   * @param log_manager the log manager (for testing only: nullptr = disable logging)
   */
  BufferPoolManagerInstance(size_t pool_size, DiskManager *disk_manager, LogManager *log_manager = nullptr);
  /**
   * Creates a new BufferPoolManagerInstance.
   * @param pool_size the size of the buffer pool
   * @param num_instances total number of BPIs in parallel BPM
   * @param instance_index index of this BPI in the parallel BPM
   * @param disk_manager the disk manager
   * @param log_manager the log manager (for testing only: nullptr = disable logging)
   */
  BufferPoolManagerInstance(size_t pool_size, uint32_t num_instances, uint32_t instance_index,
                            DiskManager *disk_manager, LogManager *log_manager = nullptr);

  /**
   * Destroys an existing BufferPoolManagerInstance.
   */
  ~BufferPoolManagerInstance() override;

  /** @return size of the buffer pool */
  size_t GetPoolSize() override { return pool_size_; }

  /** @return pointer to all the pages in the buffer pool */
  Page *GetPages() { return pages_; }

 protected:
  /**
   * Fetch the requested page from the buffer pool.
   * @param page_id id of page to be fetched
   * @return the requested page
   */
  Page *FetchPgImp(page_id_t page_id) override;

  /**
   * Unpin the target page from the buffer pool.
   * @param page_id id of page to be unpinned
   * @param is_dirty true if the page should be marked as dirty, false otherwise
   * @return false if the page pin count is <= 0 before this call, true otherwise
   */
  bool UnpinPgImp(page_id_t page_id, bool is_dirty) override;

  /**
   * Flushes the target page to disk.
   * @param page_id id of page to be flushed, cannot be INVALID_PAGE_ID
   * @return false if the page could not be found in the page table, true otherwise
   */
  bool FlushPgImp(page_id_t page_id) override;

  /**
   * Creates a new page in the buffer pool.
   * @param[out] page_id id of created page
   * @return nullptr if no new pages could be created, otherwise pointer to new page
   */
  Page *NewPgImp(page_id_t *page_id) override;

  /**
   * Deletes a page from the buffer pool.
   * @param page_id id of page to be deleted
   * @return false if the page exists but could not be deleted, true if the page didn't exist or deletion succeeded
   */
  bool DeletePgImp(page_id_t page_id) override;

  /**
   * Flushes all the pages in the buffer pool to disk.
   */
  void FlushAllPgsImp() override;

  /**
   * Allocate a page on disk.∂
   * @return the id of the allocated page
   */
  page_id_t AllocatePage();

  /**
   * Deallocate a page on disk.
   * @param page_id id of the page to deallocate
   */
  void DeallocatePage(__attribute__((unused)) page_id_t page_id) {
    // This is a no-nop right now without a more complex data structure to track deallocated pages
  }

  /**
   * Validate that the page_id being used is accessible to this BPI. This can be used in all of the functions to
   * validate input data and ensure that a parallel BPM is routing requests to the correct BPI
   * @param page_id
   */
  void ValidatePageId(page_id_t page_id) const;

  /** Number of pages in the buffer pool. */
  const size_t pool_size_;
  /** How many instances are in the parallel BPM (if present, otherwise just 1 BPI) */
  const uint32_t num_instances_ = 1;
  /** Index of this BPI in the parallel BPM (if present, otherwise just 0) */
  const uint32_t instance_index_ = 0;
  /** Each BPI maintains its own counter for page_ids to hand out, must ensure they mod back to its instance_index_ */
  std::atomic<page_id_t> next_page_id_ = instance_index_;

  /** Array of buffer pool pages. */
  Page *pages_;
  /** Pointer to the disk manager. */
  DiskManager *disk_manager_ __attribute__((__unused__));
  /** Pointer to the log manager. */
  LogManager *log_manager_ __attribute__((__unused__));
  /** Page table for keepi__attribute__ng track of buffer pool pages. */
  std::unordered_map<page_id_t, frame_id_t> page_table_;
  /** Replacer to find unpinned pages for replacement. */
  Replacer *replacer_;
  /** List of free pages. */
  std::list<frame_id_t> free_list_;
  /** This latch protects shared data structures. We recommend updating this comment to describe what it protects. */
  std::mutex latch_;
};
}  // namespace bustub


// buffer_pool_manager_instance.cpp
#include "buffer/buffer_pool_manager_instance.h"

#include "common/macros.h"

namespace bustub {

BufferPoolManagerInstance::BufferPoolManagerInstance(size_t pool_size, DiskManager *disk_manager,
                                                     LogManager *log_manager)
    : BufferPoolManagerInstance(pool_size, 1, 0, disk_manager, log_manager) {}

BufferPoolManagerInstance::BufferPoolManagerInstance(size_t pool_size, uint32_t num_instances, uint32_t instance_index,
                                                     DiskManager *disk_manager, LogManager *log_manager)
    : pool_size_(pool_size),
      num_instances_(num_instances),
      instance_index_(instance_index),
      next_page_id_(instance_index),
      disk_manager_(disk_manager),
      log_manager_(log_manager) {
  BUSTUB_ASSERT(num_instances > 0, "If BPI is not part of a pool, then the pool size should just be 1");
  BUSTUB_ASSERT(
      instance_index < num_instances,
      "BPI index cannot be greater than the number of BPIs in the pool. In non-parallel case, index should just be 1.");
  // We allocate a consecutive memory space for the buffer pool.
  pages_ = new Page[pool_size_];
  replacer_ = new LRUReplacer(pool_size);

  // Initially, every page is in the free list.
  for (size_t i = 0; i < pool_size_; ++i) {
    free_list_.emplace_back(static_cast<int>(i));
  }
}

BufferPoolManagerInstance::~BufferPoolManagerInstance() {
  delete[] pages_;
  delete replacer_;
}

bool BufferPoolManagerInstance::FlushPgImp(page_id_t page_id) {
  // Make sure you call DiskManager::WritePage!
  std::lock_guard<std::mutex> lock(latch_);  // 加锁
  if (page_table_.find(page_id) == page_table_.end()) {
    return false;
  }

  frame_id_t frame_id = page_table_[page_id];
  if (pages_[frame_id].IsDirty()) {
    disk_manager_->WritePage(page_id, pages_[frame_id].data_);
    pages_[frame_id].is_dirty_ = false;
  }

  return true;
}

void BufferPoolManagerInstance::FlushAllPgsImp() {
  // You can do it!
  std::lock_guard<std::mutex> lock(latch_);  // 加锁
  auto iter = page_table_.begin();
  while (iter != page_table_.end()) {
    page_id_t page_id = iter->first;
    frame_id_t frame_id = page_table_[page_id];
    if (pages_[frame_id].IsDirty()) {
      disk_manager_->WritePage(page_id, pages_[frame_id].data_);
      pages_[frame_id].is_dirty_ = false;
    }
  }
}

Page *BufferPoolManagerInstance::NewPgImp(page_id_t *page_id) {
  // 0.   Make sure you call AllocatePage!
  // 1.   If all the pages in the buffer pool are pinned, return nullptr.
  // 2.   Pick a victim page P from either the free list or the replacer. Always pick from the free list first.
  // 3.   Update P's metadata, zero out memory and add P to the page table.
  // 4.   Set the page ID output parameter. Return a pointer to P.
  frame_id_t frame_id;
  std::lock_guard<std::mutex> lock(latch_);  // 加锁

  if (!free_list_.empty()) {  // 存在空余页
    frame_id = free_list_.back();
    free_list_.pop_back();
  } else {  // 需根据LRU算法淘汰一页
    bool res = replacer_->Victim(&frame_id);
    if (!res) {
      return nullptr;  // 淘汰失败
    }
    // 在这里调用disk_manager_->WritePage方法实际上破坏了API的一致性，但FlushPgImp函数需解锁，比较麻烦
    if (pages_[frame_id].IsDirty()) {
      disk_manager_->WritePage(pages_[frame_id].page_id_, pages_[frame_id].data_);
    }
    page_table_.erase(pages_[frame_id].page_id_);  // 在page_table中删除该frame对应的页
  }

  *page_id = AllocatePage();
  page_table_[*page_id] = frame_id;

  pages_[frame_id].page_id_ = *page_id;
  pages_[frame_id].is_dirty_ = false;
  pages_[frame_id].pin_count_ = 1;
  pages_[frame_id].ResetMemory();
  // 创建新页也需要写回磁盘，如果不这样 newpage unpin 然后再被淘汰出去 fetchpage时就会报错（磁盘中并无此页）
  // 但不能直接is_dirty_置为true，测试会报错
  disk_manager_->WritePage(pages_[frame_id].page_id_, pages_[frame_id].data_);
  return &pages_[frame_id];
}

Page *BufferPoolManagerInstance::FetchPgImp(page_id_t page_id) {
  // 1.     Search the page table for the requested page (P).
  // 1.1    If P exists, pin it and return it immediately.
  // 1.2    If P does not exist, find a replacement page (R) from either the free list or the replacer.
  //        Note that pages are always found from the free list first.
  // 2.     If R is dirty, write it back to the disk.
  // 3.     Delete R from the page table and insert P.
  // 4.     Update P's metadata, read in the page content from disk, and then return a pointer to P.
  frame_id_t frame_id;
  std::lock_guard<std::mutex> lock(latch_);  // 加锁

  auto iter = page_table_.find(page_id);
  if (iter != page_table_.end()) {  // 原先就在buffer里
    frame_id = page_table_[page_id];
    if (pages_[frame_id].pin_count_ == 0) {
      replacer_->Pin(frame_id);  // 只有pin_count为0才有可能在replacer里
    }
    pages_[frame_id].pin_count_++;
    return &pages_[frame_id];
  }
  if (!free_list_.empty()) {  // 存在空余页
    frame_id = free_list_.back();
    free_list_.pop_back();
  } else {  // 需根据LRU算法淘汰一页
    bool res = replacer_->Victim(&frame_id);
    if (!res) {
      return nullptr;  // 淘汰失败
    }
    if (pages_[frame_id].IsDirty()) {
      disk_manager_->WritePage(pages_[frame_id].page_id_, pages_[frame_id].data_);
    }
    page_table_.erase(pages_[frame_id].page_id_);  // 在page_table中删除该frame对应的页
  }
  page_table_[page_id] = frame_id;

  pages_[frame_id].is_dirty_ = false;
  pages_[frame_id].page_id_ = page_id;
  pages_[frame_id].pin_count_ = 1;
  disk_manager_->ReadPage(page_id, pages_[frame_id].data_);
  return &pages_[frame_id];
}

bool BufferPoolManagerInstance::DeletePgImp(page_id_t page_id) {
  // 0.   Make sure you call DeallocatePage!
  // 1.   Search the page table for the requested page (P).
  // 1.   If P does not exist, return true.
  // 2.   If P exists, but has a non-zero pin-count, return false. Someone is using the page.
  // 3.   Otherwise, P can be deleted. Remove P from the page table, reset its metadata and return it to the free list.
  frame_id_t frame_id;
  std::lock_guard<std::mutex> lock(latch_);  // 加锁
  if (page_table_.find(page_id) == page_table_.end()) {
    return true;
  }

  frame_id = page_table_[page_id];
  if (pages_[frame_id].pin_count_ != 0) {
    return false;
  }
  if (pages_[frame_id].IsDirty()) {
    disk_manager_->WritePage(pages_[frame_id].page_id_, pages_[frame_id].data_);
  }
  page_table_.erase(page_id);
  replacer_->Pin(frame_id);  // 从replacer中删除该页
  pages_[frame_id].page_id_ = INVALID_PAGE_ID;
  pages_[frame_id].pin_count_ = 0;
  pages_[frame_id].is_dirty_ = false;
  free_list_.push_back(frame_id);
  return true;
}

bool BufferPoolManagerInstance::UnpinPgImp(page_id_t page_id, bool is_dirty) {
  std::lock_guard<std::mutex> lock(latch_);  // 加锁
  if (page_table_.find(page_id) == page_table_.end()) {
    return false;
  }

  frame_id_t frame_id = page_table_[page_id];
  if (pages_[frame_id].pin_count_ <= 0) {
    return false;
  }

  if (is_dirty) {
    pages_[frame_id].is_dirty_ = true;  // 不能直接赋值
  }
  pages_[frame_id].pin_count_--;
  if (pages_[frame_id].pin_count_ == 0) {
    replacer_->Unpin(frame_id);
  }
  return true;
}

page_id_t BufferPoolManagerInstance::AllocatePage() {
  const page_id_t next_page_id = next_page_id_;
  next_page_id_ += num_instances_;
  ValidatePageId(next_page_id);
  return next_page_id;
}

void BufferPoolManagerInstance::ValidatePageId(const page_id_t page_id) const {
  assert(page_id % num_instances_ == instance_index_);  // allocated pages mod back to this BPI
}

}  // namespace bustub
```
#### Parallel Buffer Pool Manager

```cpp
//parallel_buffer_pool_manager.h
#pragma once

#include "buffer/buffer_pool_manager.h"
#include "buffer/buffer_pool_manager_instance.h"
#include "recovery/log_manager.h"
#include "storage/disk/disk_manager.h"
#include "storage/page/page.h"

namespace bustub {

class ParallelBufferPoolManager : public BufferPoolManager {
 public:
  /**
   * Creates a new ParallelBufferPoolManager.
   * @param the number of individual BufferPoolManagerInstances to store
   * @param pool_size the pool size of each BufferPoolManagerInstance
   * @param disk_manager the disk manager
   * @param log_manager the log manager (for testing only: nullptr = disable logging)
   */
  ParallelBufferPoolManager(size_t num_instances, size_t pool_size, DiskManager *disk_manager,
                            LogManager *log_manager = nullptr);

  /**
   * Destroys an existing ParallelBufferPoolManager.
   */
  ~ParallelBufferPoolManager() override;

  /** @return size of the buffer pool */
  size_t GetPoolSize() override;

 protected:
  /**
   * @param page_id id of page
   * @return pointer to the BufferPoolManager responsible for handling given page id
   */
  BufferPoolManager *GetBufferPoolManager(page_id_t page_id);

  /**
   * Fetch the requested page from the buffer pool.
   * @param page_id id of page to be fetched
   * @return the requested page
   */
  Page *FetchPgImp(page_id_t page_id) override;

  /**
   * Unpin the target page from the buffer pool.
   * @param page_id id of page to be unpinned
   * @param is_dirty true if the page should be marked as dirty, false otherwise
   * @return false if the page pin count is <= 0 before this call, true otherwise
   */
  bool UnpinPgImp(page_id_t page_id, bool is_dirty) override;

  /**
   * Flushes the target page to disk.
   * @param page_id id of page to be flushed, cannot be INVALID_PAGE_ID
   * @return false if the page could not be found in the page table, true otherwise
   */
  bool FlushPgImp(page_id_t page_id) override;

  /**
   * Creates a new page in the buffer pool.
   * @param[out] page_id id of created page
   * @return nullptr if no new pages could be created, otherwise pointer to new page
   */
  Page *NewPgImp(page_id_t *page_id) override;

  /**
   * Deletes a page from the buffer pool.
   * @param page_id id of page to be deleted
   * @return false if the page exists but could not be deleted, true if the page didn't exist or deletion succeeded
   */
  bool DeletePgImp(page_id_t page_id) override;

  /**
   * Flushes all the pages in the buffer pool to disk.
   */
  void FlushAllPgsImp() override;

 private:
  BufferPoolManagerInstance **instances_;
  size_t num_instances_;
  size_t pool_size_;
  size_t start_index_;
};
}  // namespace bustub

//parallel_buffer_pool_manager.cpp
#include "buffer/parallel_buffer_pool_manager.h"

namespace bustub {

ParallelBufferPoolManager::ParallelBufferPoolManager(size_t num_instances, size_t pool_size, DiskManager *disk_manager,
                                                     LogManager *log_manager) {
  // Allocate and create individual BufferPoolManagerInstances
  num_instances_ = num_instances;
  pool_size_ = pool_size;
  start_index_ = 0;
  instances_ = new BufferPoolManagerInstance *[num_instances];
  for (size_t i = 0; i < num_instances; i++) {
    instances_[i] = new BufferPoolManagerInstance(pool_size, num_instances, i, disk_manager, log_manager);
  }
}

// Update constructor to destruct all BufferPoolManagerInstances and deallocate any associated memory
ParallelBufferPoolManager::~ParallelBufferPoolManager() {
  for (size_t i = 0; i < num_instances_; i++) {  // 释放指针所指对象空间
    delete instances_[i];
  }
  delete[] instances_;  // 释放指针空间
}

size_t ParallelBufferPoolManager::GetPoolSize() {
  // Get size of all BufferPoolManagerInstances
  return pool_size_ * num_instances_;
}

BufferPoolManager *ParallelBufferPoolManager::GetBufferPoolManager(page_id_t page_id) {
  // Get BufferPoolManager responsible for handling given page id. You can use this method in your other methods.
  return instances_[page_id % num_instances_];
}

Page *ParallelBufferPoolManager::FetchPgImp(page_id_t page_id) {
  // Fetch page for page_id from responsible BufferPoolManagerInstance
  BufferPoolManager *manager = GetBufferPoolManager(page_id);
  return manager->FetchPage(page_id);
}

bool ParallelBufferPoolManager::UnpinPgImp(page_id_t page_id, bool is_dirty) {
  // Unpin page_id from responsible BufferPoolManagerInstance
  BufferPoolManager *manager = GetBufferPoolManager(page_id);
  return manager->UnpinPage(page_id, is_dirty);
}

bool ParallelBufferPoolManager::FlushPgImp(page_id_t page_id) {
  // Flush page_id from responsible BufferPoolManagerInstance
  BufferPoolManager *manager = GetBufferPoolManager(page_id);
  return manager->FlushPage(page_id);
}

Page *ParallelBufferPoolManager::NewPgImp(page_id_t *page_id) {
  // create new page. We will request page allocation in a round robin manner from the underlying
  // BufferPoolManagerInstances
  // 1.   From a starting index of the BPMIs, call NewPageImpl until either 1) success and return 2) looped around to
  // starting index and return nullptr
  // 2.   Bump the starting index (mod number of instances) to start search at a different BPMI each time this function
  // is called
  Page *page;
  size_t index = start_index_;
  // printf("index is %ld\n",index);
  do {
    page = instances_[index]->NewPage(page_id);
    if (page != nullptr) {
      break;
    }
    index = (index + 1) % num_instances_;
  } while (index != start_index_);
  start_index_ = (start_index_ + 1) % num_instances_;
  return page;
}

bool ParallelBufferPoolManager::DeletePgImp(page_id_t page_id) {
  // Delete page_id from responsible BufferPoolManagerInstance
  BufferPoolManager *manager = GetBufferPoolManager(page_id);
  return manager->DeletePage(page_id);
}

void ParallelBufferPoolManager::FlushAllPgsImp() {
  // flush all pages from all BufferPoolManagerInstances
  for (size_t i = 0; i < num_instances_; i++) {
    instances_[i]->FlushAllPages();
  }
}

}  // namespace bustub

```

