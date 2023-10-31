---
title: leveldb第二幕 代码阅读笔记
date: 2023-02-20 12:15:30
tags: c++ leveldb
categories: leveldb学习日记
---
<meta name="referrer" content="no-referrer" />



<mark>仅做个人记录</mark>
# 简单的Write路径
## 1 静态库与测试程序
以Debug模式生成静态库
```bash
mkdir -p build_dbg && cd build_dbg
cmake -DCMAKE_BUILD_TYPE=Debug .. && cmake --build .
cp libleveldb.a  libleveldb_dbg.a
mv libleveldb_dbg.a /usr/local/lib/
ls /usr/local/lib/
```
![](https://img-blog.csdnimg.cn/ea473a62e665405095a7ca0a1991a62f.png)
测试程序

```cpp
#include <cassert>
#include <iostream>
#include <string>
#include <chrono>
#include <leveldb/db.h>
#include <leveldb/write_batch.h>

int main() {
  leveldb::DB* db;
  leveldb::Options options;
  options.create_if_missing = true;  // 不存在时创建数据库
  leveldb::Status status = leveldb::DB::Open(options, "./testdb", &db);
  leveldb::WriteBatch batch;
  batch.Put("aaa", "bbb");
  batch.Put("ccc", "ddd");
  leveldb::Status s = db->Write(leveldb::WriteOptions(), &batch);
  assert(status.ok());
  delete db;
  return 0;
}

```
编译调试

```bash
g++ test.cpp -o  test -g -lleveldb_dbg -pthread
gdb ./test
```

## 2 调用路径
[参考博客：Leveldb之Put实现](https://kernelmaker.github.io/Leveldb_Put)

首先在WriteBatch::Put函数
```cpp
void WriteBatch::Put(const Slice& key, const Slice& value) {
  WriteBatchInternal::SetCount(this, WriteBatchInternal::Count(this) + 1);  // 计数加一
  rep_.push_back(static_cast<char>(kTypeValue));                            // 插入请求
  PutLengthPrefixedSlice(&rep_, key);                                       // 编码key至字符串
  PutLengthPrefixedSlice(&rep_, value);                                     // 编码value至字符串
}
```

```cpp
(gdb) n
14        batch.Put("aaa", "bbb");
(gdb) n
15        batch.Put("ccc", "ddd");
(gdb) n
16        leveldb::Status s = db->Write(leveldb::WriteOptions(), &batch);
(gdb) p batch
$1 = {rep_ = "\000\000\000\000\000\000\000\000\002\000\000\000\001\003aaa\003bbb\001\003ccc\003ddd"}
(gdb) p batch.rep_.size()
$2 = 30
(gdb) p batch.rep_.data()
$3 = 0x5555555d0da0 ""
(gdb) x/30xb 0x5555555d0da0
0x5555555d0da0: 0x00    0x00    0x00    0x00    0x00    0x00    0x00    0x00
0x5555555d0da8: 0x02    0x00    0x00    0x00    0x01    0x03    0x61    0x61
0x5555555d0db0: 0x61    0x03    0x62    0x62    0x62    0x01    0x03    0x63
0x5555555d0db8: 0x63    0x63    0x03    0x64    0x64    0x64
```
rep_数据构成
```cpp
// WriteBatch::rep_ :=
//    sequence: fixed64
//    count: fixed32
//    data: record[count]
// record :=
//    kTypeValue varstring varstring         |
//    kTypeDeletion varstring
// varstring :=
//    len: varint32
//    data: uint8[len]

0x00    0x00    0x00    0x00    0x00    0x00    0x00    0x00	// 序列号
0x02    0x00    0x00    0x00    // 数目
0x01    // 插入请求
0x03    0x61    0x61	0x61    // 3 aaa
0x03    0x62    0x62    0x62    // 3 bbb
0x01    // 插入请求
0x03    0x63	0x63    0x63    // 3 ccc
0x03    0x64    0x64    0x64	// 3 ddd
```
然后到DBImpl::Write函数

```cpp
// Information kept for every waiting writer
struct DBImpl::Writer {  // 写入过程抽象
  explicit Writer(port::Mutex* mu) : batch(nullptr), sync(false), done(false), cv(mu) {}

  Status status;      // 写入结果
  WriteBatch* batch;  // 写入的批处理数据
  bool sync;          // 同步写/异步写
  bool done;          // 是否写入完成
  port::CondVar cv;   // 条件变量，等待其他写入者完成任务
};

Status DBImpl::Write(const WriteOptions& options, WriteBatch* updates) {
  Writer w(&mutex_);
  w.batch = updates;
  w.sync = options.sync;
  w.done = false;

  MutexLock l(&mutex_);                        // 获取互斥锁
  writers_.push_back(&w);                      // 加入写者队列
  while (!w.done && &w != writers_.front()) {  // 写入完成或为写者队列队首则退出循环
    w.cv.Wait();
  }
  if (w.done) {  // 相应数据已被其他写者顺带写入，直接返回结果
    return w.status;
  }

  // May temporarily unlock and wait.
  Status status = MakeRoomForWrite(updates == nullptr);  //  做写入前的各种检查，如是不是该停写，是不是该切memtable，是不是该compact
```
在MakeRoomForWrite函数中于mem_->ApproximateMemoryUsage() <= options_.write_buffer_size分支处跳出
```cpp
1348                   (mem_->ApproximateMemoryUsage() <= options_.write_buffer_size)) {
(gdb) p mem_->ApproximateMemoryUsage()
$1 = 4104
(gdb) p options_.write_buffer_size
$2 = 4194304
```
系统只有一个写者，BuildBatchGroup函数没有加入其他请求数据
```cpp
  uint64_t last_sequence = versions_->LastSequence();
  Writer* last_writer = &w;
  if (status.ok() && updates != nullptr) {                            // nullptr batch is for compactions
    WriteBatch* write_batch = BuildBatchGroup(&last_writer);          // 顺带加入其他写者的数据
    WriteBatchInternal::SetSequence(write_batch, last_sequence + 1);  // 设置序列号
    last_sequence += WriteBatchInternal::Count(write_batch);          // 更新上一次使用序列号

// REQUIRES: Writer list must be non-empty
// REQUIRES: First writer must have a non-null batch
WriteBatch* DBImpl::BuildBatchGroup(Writer** last_writer) {
  mutex_.AssertHeld();
  assert(!writers_.empty());
  Writer* first = writers_.front();
  WriteBatch* result = first->batch;
  assert(result != nullptr);

  size_t size = WriteBatchInternal::ByteSize(first->batch);

  // Allow the group to grow up to a maximum size, but if the
  // original write is small, limit the growth so we do not slow
  // down the small write too much.
  size_t max_size = 1 << 20;  // 一次写入数据的最大值
  if (size <= (128 << 10)) {
    max_size = size + (128 << 10);
  }

  *last_writer = first;
  std::deque<Writer*>::iterator iter = writers_.begin();
  ++iter;  // Advance past "first"
  for (; iter != writers_.end(); ++iter) {
    Writer* w = *iter;
    if (w->sync && !first->sync) {  // 异步写批处理不加入同步写数据
      // Do not include a sync write into a batch handled by a non-sync write.
      break;
    }

    if (w->batch != nullptr) {
      size += WriteBatchInternal::ByteSize(w->batch);
      if (size > max_size) {  // 超出最大数据范围
        // Do not make batch too big
        break;
      }

      // Append to *result
      if (result == first->batch) {  // 切换为临时WriteBatch对象
        // Switch to temporary batch instead of disturbing caller's batch
        result = tmp_batch_;
        assert(WriteBatchInternal::Count(result) == 0);
        WriteBatchInternal::Append(result, first->batch);
      }
      WriteBatchInternal::Append(result, w->batch);  // 加入该写者数据
    }
    *last_writer = w;  // 最后一个写者
  }
  return result;
}
```

```cpp
1222        last_sequence += WriteBatchInternal::Count(write_batch);
(gdb) n
1229          mutex_.Unlock();
(gdb) p last_sequence
$22 = 2
(gdb) p write_batch.rep_.size()
$23 = 30
(gdb) p write_batch.rep_.data()
$24 = 0x5555555d0da0 "\001"
(gdb) x/30xb 0x5555555d0da0
0x5555555d0da0: 0x01    0x00    0x00    0x00    0x00    0x00    0x00    0x00	// 仅序列号发生改变
0x5555555d0da8: 0x02    0x00    0x00    0x00    0x01    0x03    0x61    0x61
0x5555555d0db0: 0x61    0x03    0x62    0x62    0x62    0x01    0x03    0x63
0x5555555d0db8: 0x63    0x63    0x03    0x64    0x64    0x64
```
而后跳到Writer::AddRecord函数，写入日志
```cpp
Status Writer::AddRecord(const Slice& slice) {
  const char* ptr = slice.data();
  size_t left = slice.size();

  // Fragment the record if necessary and emit it.  Note that if slice
  // is empty, we still want to iterate once to emit a single
  // zero-length record
  Status s;
  bool begin = true;
  do {
    const int leftover = kBlockSize - block_offset_;  // 日志块中剩余空间
    assert(leftover >= 0);
    if (leftover < kHeaderSize) {  // 剩余空间小于记录头部大小，直接填充0
      // Switch to a new block
      if (leftover > 0) {
        // Fill the trailer (literal below relies on kHeaderSize being 7)
        static_assert(kHeaderSize == 7, "");
        dest_->Append(Slice("\x00\x00\x00\x00\x00\x00", leftover));
      }
      block_offset_ = 0;  // 重置日志块偏移
    }

    // Invariant: we never leave < kHeaderSize bytes in a block.
    assert(kBlockSize - block_offset_ - kHeaderSize >= 0);

    const size_t avail = kBlockSize - block_offset_ - kHeaderSize;  // 实际数据可用空间
    const size_t fragment_length = (left < avail) ? left : avail;

    RecordType type;
    const bool end = (left == fragment_length);
    if (begin && end) {
      type = kFullType;
    } else if (begin) {
      type = kFirstType;
    } else if (end) {
      type = kLastType;
    } else {
      type = kMiddleType;
    }

    s = EmitPhysicalRecord(type, ptr, fragment_length);  // 提交一条记录
    ptr += fragment_length;
    left -= fragment_length;
    begin = false;
  } while (s.ok() && left > 0);
  return s;
}
```

```cpp
(gdb) n
69          s = EmitPhysicalRecord(type, ptr, fragment_length);  // 提交一条记录
(gdb) p type
$7 = leveldb::log::kFullType
(gdb) p fragment_length
$8 = 30
(gdb) p *this
$9 = {dest_ = 0x5555555d3770, block_offset_ = 0, type_crc_ = {1383945041, 2685849682, 3007718310, 1093509285, 2514994254}}
```
进入Writer::EmitPhysicalRecord函数，提交记录
```cpp
Status Writer::EmitPhysicalRecord(RecordType t, const char* ptr, size_t length) {
  assert(length <= 0xffff);  // Must fit in two bytes
  assert(block_offset_ + kHeaderSize + length <= kBlockSize);

  // Format the header
  char buf[kHeaderSize];
  // 编码记录长度
  buf[4] = static_cast<char>(length & 0xff);
  buf[5] = static_cast<char>(length >> 8);
  // 编码记录类型
  buf[6] = static_cast<char>(t);

  // Compute the crc of the record type and the payload.
  uint32_t crc = crc32c::Extend(type_crc_[t], ptr, length);
  crc = crc32c::Mask(crc);  // Adjust for storage
  // 编码校验和
  EncodeFixed32(buf, crc);

  // Write the header and the payload
  Status s = dest_->Append(Slice(buf, kHeaderSize));
  if (s.ok()) {
    s = dest_->Append(Slice(ptr, length));
    if (s.ok()) {
      s = dest_->Flush();
    }
  }
  block_offset_ += kHeaderSize + length;  // 更新块内偏移量
  return s;
}
```
查看头部信息
```cpp
(gdb) x/7xb buf
0x7fffffffdc91: 0x54    0x3e    0x5a    0xc8    0x1e    0x00    0x01
(gdb) p crc
$11 = 3361357396
(gdb) p/x crc
$12 = 0xc85a3e54


0x54    0x3e    0x5a    0xc8	// 校验和
0x1e    0x00   	// 长度 30
0x01	// 类型 kFullType
```
日志写入完成后
```cpp
103       block_offset_ += kHeaderSize + length;  // 更新块内偏移量
(gdb) n
104       return s;
(gdb) p *this
$13 = {dest_ = 0x5555555d3770, block_offset_ = 37, type_crc_ = {1383945041, 2685849682, 3007718310, 1093509285, 2514994254}}
```
日志内容
![](https://img-blog.csdnimg.cn/18877e8a5b8e4c55bd1a9d90bd9d179f.png)

而后跳到WriteBatchInternal::InsertInto函数-》WriteBatch::Iterate-》MemTableInserter::Put-》MemTable::Add函数，写入内存
```cpp
Status WriteBatchInternal::InsertInto(const WriteBatch* b, MemTable* memtable) {
  MemTableInserter inserter;
  inserter.sequence_ = WriteBatchInternal::Sequence(b);
  inserter.mem_ = memtable;
  return b->Iterate(&inserter);
}

Status WriteBatch::Iterate(Handler* handler) const {
  Slice input(rep_);
  if (input.size() < kHeader) {
    return Status::Corruption("malformed WriteBatch (too small)");
  }

  input.remove_prefix(kHeader);  // 移除头部信息（8字节序列号4字节数目）
  Slice key, value;
  int found = 0;
  while (!input.empty()) {
    found++;
    char tag = input[0];  // 当前请求类型
    input.remove_prefix(1);
    switch (tag) {
      case kTypeValue:  // 插入请求
        if (GetLengthPrefixedSlice(&input, &key) && GetLengthPrefixedSlice(&input, &value)) {
          handler->Put(key, value);
        } else {
          return Status::Corruption("bad WriteBatch Put");
        }
        break;
      case kTypeDeletion:  // 删除请求
        if (GetLengthPrefixedSlice(&input, &key)) {
          handler->Delete(key);
        } else {
          return Status::Corruption("bad WriteBatch Delete");
        }
        break;
      default:
        return Status::Corruption("unknown WriteBatch tag");
    }
  }
  if (found != WriteBatchInternal::Count(this)) {
    return Status::Corruption("WriteBatch has wrong count");
  } else {
    return Status::OK();
  }
}
```

```cpp
48        input.remove_prefix(kHeader);  // 移除头部信息（8字节序列号4字节数目）
(gdb) p input
$14 = {data_ = 0x5555555d0da0 "\001", size_ = 30}
(gdb) n
49        Slice key, value;
(gdb) p input
$15 = {data_ = 0x5555555d0dac "\001\003aaa\003bbb\001\003ccc\003ddd", size_ = 18}
(gdb) x/18xb 0x5555555d0dac
0x5555555d0dac: 0x01    0x03    0x61    0x61    0x61    0x03    0x62    0x62
0x5555555d0db4: 0x62    0x01    0x03    0x63    0x63    0x63    0x03    0x64
0x5555555d0dbc: 0x64    0x64
(gdb) n
50        int found = 0;
(gdb) n
51        while (!input.empty()) {
(gdb) n
52          found++;
(gdb) n
53          char tag = input[0];  // 当前请求类型
(gdb) n
54          input.remove_prefix(1);
(gdb) n
55          switch (tag) {
(gdb) n
57              if (GetLengthPrefixedSlice(&input, &key) && GetLengthPrefixedSlice(&input, &value)) {
(gdb) n
58                handler->Put(key, value);
(gdb) p key
$16 = {data_ = 0x5555555d0dae "aaa\003bbb\001\003ccc\003ddd", size_ = 3}
(gdb) p value
$17 = {data_ = 0x5555555d0db2 "bbb\001\003ccc\003ddd", size_ = 3}
```

```cpp
void Put(const Slice& key, const Slice& value) override {
  mem_->Add(sequence_, kTypeValue, key, value);  // 将key-value写入跳表
  sequence_++;                                   // 序列号加一
}

void MemTable::Add(SequenceNumber s, ValueType type, const Slice& key, const Slice& value) {
  // Format of an entry is concatenation of:
  //  key_size     : varint32 of internal_key.size()
  //  key bytes    : char[internal_key.size()]
  //  tag          : uint64((sequence << 8) | type)
  //  value_size   : varint32 of value.size()
  //  value bytes  : char[value.size()]
  size_t key_size = key.size();
  size_t val_size = value.size();
  size_t internal_key_size = key_size + 8;                                                                             // 内部key，额外编码了序列号与请求类型
  const size_t encoded_len = VarintLength(internal_key_size) + internal_key_size + VarintLength(val_size) + val_size;  // 数据整体长度
  char* buf = arena_.Allocate(encoded_len);
  // 编码internal_key部分                                                                        // 向内存池请求相应大小空间
  char* p = EncodeVarint32(buf, internal_key_size);
  std::memcpy(p, key.data(), key_size);
  p += key_size;
  EncodeFixed64(p, (s << 8) | type);
  p += 8;
  // 编码value部分
  p = EncodeVarint32(p, val_size);
  std::memcpy(p, value.data(), val_size);
  assert(p + val_size == buf + encoded_len);
  // 插入跳表
  table_.Insert(buf);
}
```

```cpp
97        table_.Insert(buf);
(gdb) p encoded_len // internal_key_size(1) key(3) tag(8) value_size(1) value(3)
$18 = 16
(gdb) x/16xb buf  // 十六进制输出
0x5555555e3838: 0x0b    0x61    0x61    0x61    0x01    0x01    0x00    0x00
0x5555555e3840: 0x00    0x00    0x00    0x00    0x03    0x62    0x62    0x62
(gdb) x/16xt buf // 二进制形式输出
0x5555555e3838: 00001011        01100001        01100001        01100001        00000001        00000001        00000000        00000000
0x5555555e3840: 00000000        00000000        00000000        00000000        00000011        01100010        01100010        01100010

0x0b	// internal_key_size 11
0x61    0x61    0x61	// aaa
0x01    // type
0x01    0x00    0x00	0x00    0x00    0x00    0x00	// sequence  
0x03    // val_size 3
0x62    0x62    0x62 // bbb
```
跳转到SkipList<Key, Comparator>::Insert，key为const char*，跳表相关操作见[1206. 设计跳表](https://leetcode.cn/problems/design-skiplist/)
```cpp
template <typename Key, class Comparator>
void SkipList<Key, Comparator>::Insert(const Key& key) {
  // TODO(opt): We can use a barrier-free variant of FindGreaterOrEqual()
  // here since Insert() is externally synchronized.
  Node* prev[kMaxHeight];
  Node* x = FindGreaterOrEqual(key, prev);

  // Our data structure does not allow duplicate insertion
  assert(x == nullptr || !Equal(key, x->key));

  int height = RandomHeight();
  if (height > GetMaxHeight()) {
    for (int i = GetMaxHeight(); i < height; i++) {
      prev[i] = head_;
    }
    // It is ok to mutate max_height_ without any synchronization
    // with concurrent readers.  A concurrent reader that observes
    // the new value of max_height_ will see either the old value of
    // new level pointers from head_ (nullptr), or a new value set in
    // the loop below.  In the former case the reader will
    // immediately drop to the next level since nullptr sorts after all
    // keys.  In the latter case the reader will use the new node.
    max_height_.store(height, std::memory_order_relaxed);
  }

  x = NewNode(key, height);
  for (int i = 0; i < height; i++) {
    // NoBarrier_SetNext() suffices since we will add a barrier when
    // we publish a pointer to "x" in prev[i].
    x->NoBarrier_SetNext(i, prev[i]->NoBarrier_Next(i));
    prev[i]->SetNext(i, x);
  }
}
```
直接看NewNode，申请跳表节点
```cpp
template <typename Key, class Comparator>
typename SkipList<Key, Comparator>::Node* SkipList<Key, Comparator>::NewNode(
    const Key& key, int height) {
  char* const node_memory = arena_->AllocateAligned(
      sizeof(Node) + sizeof(std::atomic<Node*>) * (height - 1));
  return new (node_memory) Node(key);
}
```

```cpp
182       char* const node_memory = arena_->AllocateAligned(
(gdb) p height
$25 = 2
(gdb) p key
$26 = (const char * const&) @0x7fffffffdaf0: 0x5555555e3838 "\vaaa\001\001"
(gdb) p sizeof(Node)
$27 = 16
leveldb::Arena::AllocateAligned (this=0x5555555e37d8, bytes=12884892048) at /root/leveldb/leveldb/util/arena.cc:38
38      char* Arena::AllocateAligned(size_t bytes) {
(gdb) s
39        const int align = (sizeof(void*) > 8) ? sizeof(void*) : 8;
(gdb) p bytes
$28 = 24

分配24字节内存，其中8字节存储char*指针，指向MemTable::Add申请的buf，其余16字节为长度为2的next数组，指向各层的下一个节点
```

```cpp
  for (int i = 0; i < height; i++) {
    // NoBarrier_SetNext() suffices since we will add a barrier when
    // we publish a pointer to "x" in prev[i].
    x->NoBarrier_SetNext(i, prev[i]->NoBarrier_Next(i));
    prev[i]->SetNext(i, x);
  }
```

```cpp
360       for (int i = 0; i < height; i++) {
(gdb) p x
$6 = (leveldb::SkipList<char const*, leveldb::MemTable::KeyComparator>::Node *) 0x5555555e3848
(gdb) p head_
$7 = (leveldb::SkipList<char const*, leveldb::MemTable::KeyComparator>::Node * const) 0x5555555e37d0
(gdb) p prev
$8 = {0x5555555e37d0, 0x5555555e37d0, 0x7fffffffda80, 
  0x55555556b71a <std::vector<std::__cxx11::basic_string<char, std::char_traits<char>, std::allocator<char> >, std::allocator<std::__cxx11::basic_string<char, std::char_traits<char>, std::allocator<char> > > >::_S_do_relocate(std::__cxx11::basic_string<char, std::char_traits<char>, std::allocator<char> >*, std::__cxx11::basic_string<char, std::char_traits<char>, std::allocator<char> >*, std::__cxx11::basic_string<char, std::char_traits<char>, std::allocator<char> >*, std::allocator<std::__cxx11::basic_string<char, std::char_traits<char>, std::allocator<char> > >&, std::integral_constant<bool, true>)+52>, 0x7fffffffdc20, 0x5555555d0dc0, 0x0, 0x7fffffffdb90, 
  0x7fffffffdaa0, 0x7fffffffdb3c, 0x300000101, 0x5555555e3844}
(gdb) p height 
$9 = 2
(gdb) p head_->next_[0]
$10 = {_M_b = {_M_p = 0x0}}
(gdb) p head_->next_[1]
$11 = {_M_b = {_M_p = 0x0}}
(gdb) n
363         x->NoBarrier_SetNext(i, prev[i]->NoBarrier_Next(i));
(gdb) n
364         prev[i]->SetNext(i, x);
(gdb) n
360       for (int i = 0; i < height; i++) {
(gdb) n
363         x->NoBarrier_SetNext(i, prev[i]->NoBarrier_Next(i));
(gdb) n
364         prev[i]->SetNext(i, x);
(gdb) n
360       for (int i = 0; i < height; i++) {
(gdb) p head_->next_[0]
$12 = {_M_b = {_M_p = 0x5555555e3848}}
(gdb) p head_->next_[1]
$13 = {_M_b = {_M_p = 0x5555555e3848}}
(gdb) p x->next_[0]
$14 = {_M_b = {_M_p = 0x0}}
(gdb) p x->next_[1]
$15 = {_M_b = {_M_p = 0x0}}
```
DBImpl::Write函数余下的部分
```cpp
        status = WriteBatchInternal::InsertInto(write_batch, mem_);  // 写入数据至内存
      }
      mutex_.Lock();
      if (sync_error) {
        // The state of the log file is indeterminate: the log record we
        // just added may or may not show up when the DB is re-opened.
        // So we force the DB into a mode where all future writes fail.
        RecordBackgroundError(status);
      }
    }
    if (write_batch == tmp_batch_) tmp_batch_->Clear();  // 清空临时WriteBatch

    versions_->SetLastSequence(last_sequence);  // 设置上一次序列号
  }

  // 唤醒顺带写入数据的写者
  while (true) {
    Writer* ready = writers_.front();
    writers_.pop_front();
    if (ready != &w) {
      ready->status = status;
      ready->done = true;
      ready->cv.Signal();
    }
    if (ready == last_writer) break;
  }

  // Notify new head of write queue
  if (!writers_.empty()) {
    writers_.front()->cv.Signal();
  }

  return status;
}
```
# Put与Delete
ValueType：Put的ValueType为kTypeValue，Delete的ValueType为kTypeDeletion
参数：Put操作参数为key，value，Delete操作参数为key
```cpp
Status DB::Put(const WriteOptions& opt, const Slice& key, const Slice& value) {
  WriteBatch batch;
  batch.Put(key, value);
  return Write(opt, &batch);
}

Status DB::Delete(const WriteOptions& opt, const Slice& key) {
  WriteBatch batch;
  batch.Delete(key);
  return Write(opt, &batch);
}

void WriteBatch::Put(const Slice& key, const Slice& value) {
  WriteBatchInternal::SetCount(this, WriteBatchInternal::Count(this) + 1);
  rep_.push_back(static_cast<char>(kTypeValue));
  PutLengthPrefixedSlice(&rep_, key);
  PutLengthPrefixedSlice(&rep_, value);
}

void WriteBatch::Delete(const Slice& key) {
  WriteBatchInternal::SetCount(this, WriteBatchInternal::Count(this) + 1);
  rep_.push_back(static_cast<char>(kTypeDeletion));
  PutLengthPrefixedSlice(&rep_, key);
}

class MemTableInserter : public WriteBatch::Handler {
 public:
  SequenceNumber sequence_;
  MemTable* mem_;

  void Put(const Slice& key, const Slice& value) override {
    mem_->Add(sequence_, kTypeValue, key, value);
    sequence_++;
  }
  void Delete(const Slice& key) override {
    mem_->Add(sequence_, kTypeDeletion, key, Slice());
    sequence_++;
  }
};
void MemTable::Add(SequenceNumber s, ValueType type, const Slice& key, const Slice& value)
```
# 序列号在读操作中的作用
首先阅读DBImpl::Get方法
```cpp
Status DBImpl::Get(const ReadOptions& options, const Slice& key, std::string* value) {
  Status s;
  MutexLock l(&mutex_);
  SequenceNumber snapshot;  // 用于查询的序列号
  if (options.snapshot != nullptr) {
    snapshot = static_cast<const SnapshotImpl*>(options.snapshot)->sequence_number();  // 快照读，读取快照前数据
  } else {
    snapshot = versions_->LastSequence();  // 读取最新数据
  }

  MemTable* mem = mem_;
  MemTable* imm = imm_;
  Version* current = versions_->current();
  // 增加各单元引用计数，避免使用过程中资源被不正确地释放
  mem->Ref();
  if (imm != nullptr) imm->Ref();
  current->Ref();

  bool have_stat_update = false;
  Version::GetStats stats;

  // Unlock while reading from files and memtables
  {
    mutex_.Unlock();
    // First look in the memtable, then in the immutable memtable (if any).
    LookupKey lkey(key, snapshot);
    if (mem->Get(lkey, value, &s)) {  // 从memtable读取
      // Done
    } else if (imm != nullptr && imm->Get(lkey, value, &s)) {  // 若immutable memtable存在，从immutable memtable读取
      // Done
    } else {  // 从ssttable中读取
      s = current->Get(options, lkey, value, &stats);
      have_stat_update = true;
    }
    mutex_.Lock();
  }

  if (have_stat_update && current->UpdateStats(stats)) {  // 更新无效seek次数
    MaybeScheduleCompaction();                            // 触发Seek Compaction
  }
  // 减小各单元引用计数
  mem->Unref();
  if (imm != nullptr) imm->Unref();
  current->Unref();
  return s;
}
```
主要以memtable中的Get方法展示序列号的作用
```cpp
bool MemTable::Get(const LookupKey& key, std::string* value, Status* s) {
  Slice memkey = key.memtable_key();  // 转变为Slice类型，数据内容不变
  Table::Iterator iter(&table_);
  iter.Seek(memkey.data());  // Advance to the first entry with a key >= target：找到第一个key大于等target的跳表节点
  if (iter.Valid()) {        // 迭代器有效
    // entry format is:
    //    klength  varint32
    //    userkey  char[klength]
    //    tag      uint64
    //    vlength  varint32
    //    value    char[vlength]
    // Check that it belongs to same user key.  We do not check the
    // sequence number since the Seek() call above should have skipped
    // all entries with overly large sequence numbers.
    const char* entry = iter.key();
    uint32_t key_length;
    const char* key_ptr = GetVarint32Ptr(entry, entry + 5, &key_length);
    if (comparator_.comparator.user_comparator()->Compare(Slice(key_ptr, key_length - 8), key.user_key()) == 0) {  // user key相等
      // Correct user key
      const uint64_t tag = DecodeFixed64(key_ptr + key_length - 8);
      switch (static_cast<ValueType>(tag & 0xff)) {
        case kTypeValue: {  // 正常数据
          Slice v = GetLengthPrefixedSlice(key_ptr + key_length);
          value->assign(v.data(), v.size());  // 赋值value
          return true;
        }
        case kTypeDeletion:  // 删除标记
          *s = Status::NotFound(Slice());
          return true;
      }
    }
  }
  return false;
}
```
关注Table::Iterator::Seek中的比较函数，函数调用关系如下
```cpp
template <typename Key, class Comparator>
inline void SkipList<Key, Comparator>::Iterator::Seek(const Key& target) {
  node_ = list_->FindGreaterOrEqual(target, nullptr);
}

SkipList<Key, Comparator>::FindGreaterOrEqual(const Key& key,
                                              Node** prev) const {
  Node* x = head_;
  int level = GetMaxHeight() - 1;
  while (true) {
    Node* next = x->Next(level);
    if (KeyIsAfterNode(key, next)) {
...
}

template <typename Key, class Comparator>
bool SkipList<Key, Comparator>::KeyIsAfterNode(const Key& key, Node* n) const {
  // null n is considered infinite
  return (n != nullptr) && (compare_(n->key, key) < 0);
}

// 最终调用Comparator compare_
template <typename Key, class Comparator>
class SkipList {
  explicit SkipList(Comparator cmp, Arena* arena);
  // Immutable after construction
  Comparator const compare_;
}

template <typename Key, class Comparator>
SkipList<Key, Comparator>::SkipList(Comparator cmp, Arena* arena)
    : compare_(cmp),
      arena_(arena),
      head_(NewNode(0 /* any key will do */, kMaxHeight)),
      max_height_(1),
      rnd_(0xdeadbeef) {
  for (int i = 0; i < kMaxHeight; i++) {
    head_->SetNext(i, nullptr);
  }
}

// 找到传入的Comparator cmp
class MemTable {
 public:
  // MemTables are reference counted.  The initial reference count
  // is zero and the caller must call Ref() at least once.
  explicit MemTable(const InternalKeyComparator& comparator);
  typedef SkipList<const char*, KeyComparator> Table;
  KeyComparator comparator_;
  int refs_;
  Arena arena_;
  Table table_;
};

MemTable::MemTable(const InternalKeyComparator& comparator) : comparator_(comparator), refs_(0), table_(comparator_, &arena_) {}

// 阅读KeyComparator实现
struct KeyComparator {
  const InternalKeyComparator comparator;
  explicit KeyComparator(const InternalKeyComparator& c) : comparator(c) {}
  int operator()(const char* a, const char* b) const;
};

int MemTable::KeyComparator::operator()(const char* aptr, const char* bptr) const {
  // Internal keys are encoded as length-prefixed strings.
  Slice a = GetLengthPrefixedSlice(aptr);
  Slice b = GetLengthPrefixedSlice(bptr);
  return comparator.Compare(a, b);
}

// 阅读InternalKeyComparator::Compare实现
int InternalKeyComparator::Compare(const Slice& akey, const Slice& bkey) const {
  // Order by:
  //    increasing user key (according to user-supplied comparator)
  //    decreasing sequence number
  //    decreasing type (though sequence# should be enough to disambiguate)
  int r = user_comparator_->Compare(ExtractUserKey(akey), ExtractUserKey(bkey));  // 先使用user key比较器进行比较
  if (r == 0) {                                                                   // 若user key相等则比较序列号
    const uint64_t anum = DecodeFixed64(akey.data() + akey.size() - 8);
    const uint64_t bnum = DecodeFixed64(bkey.data() + bkey.size() - 8);
    if (anum > bnum) {  // 按序列号降序排序
      r = -1;
    } else if (anum < bnum) {
      r = +1;
    }
  }
  return r;
}
```
最终结果：对于相同的user key，序列号越小越靠后，越大越靠前，序列号一直增加，这样就能保证读到最新的数据，也能传入特定序列号，读取该序列号之前的数据
```cpp
SequenceNumber snapshot;  // 用于查询的序列号
if (options.snapshot != nullptr) {
  snapshot = static_cast<const SnapshotImpl*>(options.snapshot)->sequence_number();  // 快照读，读取快照前数据
} else {
  snapshot = versions_->LastSequence();  // 读取最新数据
}


// Advance to the first entry with a key >= target
void Seek(const Key& target);

int InternalKeyComparator::Compare(const Slice& akey, const Slice& bkey) const {
  // Order by:
  //    increasing user key (according to user-supplied comparator)
  //    decreasing sequence number
  //    decreasing type (though sequence# should be enough to disambiguate)
  int r = user_comparator_->Compare(ExtractUserKey(akey), ExtractUserKey(bkey));  // 先使用user key比较器进行比较
  if (r == 0) {                                                                   // 若user key相等则比较序列号
    const uint64_t anum = DecodeFixed64(akey.data() + akey.size() - 8);
    const uint64_t bnum = DecodeFixed64(bkey.data() + bkey.size() - 8);
    if (anum > bnum) {  // 按序列号降序排序
      r = -1;
    } else if (anum < bnum) {
      r = +1;
    }
  }
  return r;
}
```

