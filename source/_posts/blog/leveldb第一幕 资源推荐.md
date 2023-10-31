---
title: leveldb第一幕 资源推荐
date: 2023-01-14 09:56:23
tags: 资源推荐 leveldb
categories: leveldb学习日记
---
<meta name="referrer" content="no-referrer" />



## 博客推荐
**书籍**
[那岩. Leveldb实现解析.pdf](https://github.com/AngryHacker/code-with-comments/blob/master/attachment/leveldb%E5%AE%9E%E7%8E%B0%E8%A7%A3%E6%9E%90.pdf)
**相关博客**
[leveldb实现原理](https://www.cnblogs.com/zhihaowu/p/7884424.html)
[一文带你看透基于LSM-tree的NoSQL系统优化方向（到2020年为止 最全、最新）](https://blog.csdn.net/Z_Stand/article/details/113838404)
[浅析 Bigtable 和 LevelDB 的实现](https://juejin.cn/post/6844903962244546573)
[LevelDB之Compaction实现](http://www.calvinneo.com/2021/04/18/leveldb-compaction/)
[庖丁解LevelDB之概览](http://catkang.github.io/2017/01/07/leveldb-summary.html)
[Leveldb二三事](https://segmentfault.com/a/1190000009707717)
[leveldb为什么要设计为多层结构呢？](https://zhuanlan.zhihu.com/p/46718964)
[LevelDB 之 Compaction](https://zhuanlan.zhihu.com/p/46718964)
**系列博客**
[leveldb中的LRUCache设计](http://bean-li.github.io/leveldb-LRUCache/)
![](https://img-blog.csdnimg.cn/fb15cb489c374be8878a63e23f24cbd6.png)
[LevelDB 源码分析](https://sf-zhou.github.io/)
![](https://img-blog.csdnimg.cn/4736b351b2224d939a81159987b2eb04.png)
[leveldb笔记](https://izualzhy.cn/archive.html?tag=leveldb)
![](https://img-blog.csdnimg.cn/d9b95d619e464f35b58e3e73e3419ceb.png)
[leveldb-handbook  有挺多图，不过是go的](https://leveldb-handbook.readthedocs.io/zh/latest/index.html#)
![](https://img-blog.csdnimg.cn/5c6ea3d693994f39806b9e70153e3d1a.png)
**相关论文**
《Skip Lists: A Probabilistic Alternative to Balanced Trees》
《Bigtable: A Distributed Storage System for Structured Data》

## 阅读顺序
### 1 实现一个跳表
[github Skiplist-CPP](https://github.com/youngyangyang04/Skiplist-CPP)
[LeetCode 1206. 设计跳表](https://leetcode.cn/problems/design-skiplist/)

简单了解跳表原理后阅读一些实现代码，最后参考LeetCode官方题解，简单实现一个跳表，加深印象。

```cpp
const int kMaxLevel = 30;
const int kProb = 25;
struct SkiplistNode {
  SkiplistNode(int key, int level) {
    key_ = key;
    forward_ = vector<SkiplistNode*>(level, nullptr);
  }
  vector<SkiplistNode*> forward_;
  int key_;
};
class Skiplist {
 public:
  Skiplist() {
    head_ = new SkiplistNode(-1, kMaxLevel);
    cur_level_ = 0;
  }

  bool search(int target) {
    SkiplistNode* cur = head_;
    for (int i = cur_level_ - 1; i >= 0; i--) {
      // 找到小于且最接近目标
      while (cur->forward_[i] != nullptr && cur->forward_[i]->key_ < target) {
        cur = cur->forward_[i];
      }
    }
    // 该节点的下一个节点，若不为空且相等则找到目标
    cur = cur->forward_[0];
    return cur != nullptr && cur->key_ == target;
  }

  void add(int num) {
    vector<SkiplistNode*> update(kMaxLevel, head_);  // 待更新指针
    SkiplistNode* cur = head_;
    for (int i = cur_level_ - 1; i >= 0; i--) {
      while (cur->forward_[i] != nullptr && cur->forward_[i]->key_ < num) {
        cur = cur->forward_[i];
      }
      update[i] = cur;  // 记录该层前缀节点指针
    }
    int node_level = get_random_level();
    cur_level_ = max(cur_level_, node_level);
    SkiplistNode* new_node = new SkiplistNode(num, node_level);
    for (int i = 0; i < node_level; i++) {  // 从0-node_level修改前缀节点
      new_node->forward_[i] = update[i]->forward_[i];
      update[i]->forward_[i] = new_node;
    }
  }

  bool erase(int num) {
    vector<SkiplistNode*> update(cur_level_, head_);
    SkiplistNode* cur = head_;
    for (int i = cur_level_ - 1; i >= 0; i--) {
      while (cur->forward_[i] != nullptr && cur->forward_[i]->key_ < num) {
        cur = cur->forward_[i];
      }
      update[i] = cur;
    }
    cur = cur->forward_[0];
    if (cur == nullptr || cur->key_ != num) {  // 目标不存在
      return false;
    }
    for (int i = 0; i < cur_level_; i++) {
      if (update[i]->forward_[i] != cur) {  // 到达节点层数
        break;
      }
      update[i]->forward_[i] = cur->forward_[i];
    }
    delete cur;
    /* 更新当前的 level */
    while (cur_level_ > 1 && head_->forward_[cur_level_ - 1] == nullptr) {
      cur_level_--;
    }
    return true;
  }

  int get_random_level() {
    int level = 1;
    while (level < kMaxLevel && rand() % 100 < kProb) {
      level++;
    }
    return level;
  }

  void display_list() {
    cout << "*****Skip List*****" << endl;
    for (int i = 0; i < cur_level_; i++) {
      SkiplistNode* cur = head_->forward_[i];
      cout << "Level " << i << ": ";
      while (cur != nullptr) {
        cout << cur->key_ << "->";
        cur = cur->forward_[i];
      }
      cout << endl;
    }
  }

 private:
  SkiplistNode* head_;
  int cur_level_;
};
```
### 2 阅读leveldb各个模块的代码
对照一个leveldb系列博客，大致过一遍各个模块的主要代码
![](https://img-blog.csdnimg.cn/fb15cb489c374be8878a63e23f24cbd6.png)
[leveldb中的LRUCache设计](http://bean-li.github.io/leveldb-LRUCache/)
```cpp
include/leveldb/cache.h
util/cache.cc
```
[leveldb之log文件](http://bean-li.github.io/leveldb-log/)
```cpp
db/log_format.h
db/log_writer.h
db/log_writer.cc
// log_reader不需要看
```
[leveldb中的SSTable (1)  data-block](http://bean-li.github.io/leveldb-sstable/)
[leveldb中的SSTable (2)  index-block](http://bean-li.github.io/leveldb-sstable-index-block/)
[leveldb中的SSTable (3)  bloom-filter](http://bean-li.github.io/leveldb-sstable-bloom-filter/)
```cpp
table/format.h
table/format.cc
table/block.h
table/block.cc
table/block_builder.h
table/block_builder.cc
include/leveldb/filter_policy.h
util/bloom.cc
table/filter_block.h
table/filter_block.cc
include/leveldb/table_builder.h
table/table_builder.cc
```

[leveldb中的memtable](http://bean-li.github.io/leveldb-memtable/)
```cpp
util/arena.h
util/arena.cc
db/skiplist.h
db/dbformat.h
db/dbformat.cc
db/memtable.h
db/memtable.cc
```

[leveldb之Compaction (1) --从MemTable到SSTable文件](http://bean-li.github.io/leveldb-compaction/)
[leveldb之Version VersionEdit and VersionSet](http://bean-li.github.io/leveldb-version/)
[leveldb之MANIFEST](http://bean-li.github.io/leveldb-manifest/)
[leveldb之Compaction (2)--何时需要Compaction](http://bean-li.github.io/leveldb-compaction-2/)
[leveldb之Compaction（3）－－选择参战文件](http://bean-li.github.io/leveldb-compaction-3/)
```cpp
db/db_impl.h
db/db_impl.cc
db/version_edit.h
db/version_edit.cc
db/version_set.h
db/version_set.cc
```

而后看其他的leveldb系列博客，以其他角度再看一遍代码，这样就能大致了解leveldb的代码框架

[什么是uintptr_t数据类型？](https://cloud.tencent.com/developer/ask/sof/28262)
[详解varint编码原理](https://zhuanlan.zhihu.com/p/84250836)
[C++ 工程实践(2)：不要重载全局 ::operator new()](http://www.cppblog.com/Solstice/archive/2011/02/22/140410.aspx)
[Memory Order浅析（以LevelDB中的跳表为例](https://zjuytw.github.io/2022/06/25/Memory%20Order%E6%B5%85%E6%9E%90%28%E4%BB%A5LevelDB%E4%B8%AD%E7%9A%84%E8%B7%B3%E8%A1%A8%E4%B8%BA%E4%BE%8B%29/)
[编译防火墙——C++的Pimpl惯用法解析](https://blog.csdn.net/lihao21/article/details/47610309)
[C++工厂模式（简单工厂、工厂方法、抽象工厂）](https://blog.csdn.net/m0_46308273/article/details/117126962)
[工厂模式和抽象工厂的区别是什么？](https://www.cnblogs.com/yangming1996/p/14674281.html)
[C++设计模式——策略模式](https://www.cnblogs.com/ring1992/p/9593575.html) 
[leveldb源码剖析---迭代器设计](https://blog.csdn.net/swartz2015/article/details/71404211)
### 3 运行简单demo
**第一步git clone就遇到问题，一直clone失败**
 1. 关闭电脑代理，重置git代理
```bash
git config --global --unset http.proxy 
git config --global --unset https.proxy
```
 2. 修改hosts文件，添加github与ip地址映射 [https://github.com/521xueweihan/GitHub520](https://github.com/521xueweihan/GitHub520)
 3. 重启网络或主机
 4. [彻底解决git clone以及 recursive慢的问题](https://blog.csdn.net/m0_37604813/article/details/107130881)
将git clone --recurse-submodules命令拆分成git clone和git submodule update --init

不过最后还是重启比较有效，git主打一个运气

**编译生成静态库和可执行文件**
```bash
mkdir -p build && cd build
cmake -DCMAKE_BUILD_TYPE=Release .. && cmake --build .
```
将静态库和头文件拷贝至系统目录
```bash
cp build/libleveldb.a /usr/local/lib/
cp -r include/leveldb/ /usr/local/include/
```

**编写简单代码，查看生成文件**
```cpp
#include <cassert>
#include <iostream>
#include <string>
#include <chrono>
#include <leveldb/db.h>

std::string RandStr(int len) /*参数为字符串的长度*/
{
  std::string str;
  char c;
  int idx;
  /*循环向字符串中添加随机生成的字符*/
  for (idx = 0; idx < len; idx++) {
    c = 'a' + rand() % 26;
    str.push_back(c);
  }
  return str;
}
void PrintStats(leveldb::DB* db, std::string key) {
  std::string stats;
  if (!db->GetProperty(key, &stats)) {
    stats = "(failed)";
  }
  std::cout << key << std::endl << stats << std::endl;
}
int main() {
  leveldb::DB* db;
  leveldb::Options options;
  options.create_if_missing = true;  // 不存在时创建数据库
  leveldb::Status status = leveldb::DB::Open(options, "./testdb", &db);
  assert(status.ok());
  int total_size = 1 << 30;              // 写入1G数据
  int times = total_size / (16 + 1024);  // key 16 vlaue 1024
  std::string key;
  std::string value(1024, 'a');
  auto start = std::chrono::system_clock::now();
  for (int i = 0; i < times; i++) {
    key = RandStr(16);
    leveldb::Status s = db->Put(leveldb::WriteOptions(), key, value);
    assert(status.ok());
  }
  auto end = std::chrono::system_clock::now();
  printf("用时:%ldms\n", std::chrono::duration_cast<std::chrono::milliseconds>(end - start).count());
  PrintStats(db, "leveldb.num-files-at-level0");
  PrintStats(db, "leveldb.num-files-at-level1");
  PrintStats(db, "leveldb.num-files-at-level2");
  PrintStats(db, "leveldb.num-files-at-level3");
  PrintStats(db, "leveldb.num-files-at-level4");
  PrintStats(db, "leveldb.num-files-at-level5");
  PrintStats(db, "leveldb.num-files-at-level6");
  PrintStats(db, "leveldb.stats");
  PrintStats(db, "leveldb.approximate-memory-usage");
  PrintStats(db, "leveldb.sstables");
  delete db;
  return 0;
}
```

```bash
g++ -o demo demo.cpp -pthread -lleveldb
./demo

用时:40s
leveldb.num-files-at-level0
2
leveldb.num-files-at-level1
30
leveldb.num-files-at-level2
116
leveldb.num-files-at-level3
390
leveldb.num-files-at-level4
0
leveldb.num-files-at-level5
0
leveldb.num-files-at-level6
0
leveldb.stats
                               Compactions
Level  Files Size(MB) Time(sec) Read(MB) Write(MB)
--------------------------------------------------
  0        2        8         5        0      1032
  1       30       50         8     1614      1617
  2      116      199        19     3885      3888
  3      390      781         5     1177      1177

leveldb.approximate-memory-usage
5342031
leveldb.sstables
--- level 0 ---
 4265:4128694['aaafdmocvosxkzze' @ 1025108 : 1 .. 'zzxgkzexldoiizif' @ 1024461 : 1]
 4262:4128673['aadcxohcjlpnxhsm' @ 1020133 : 1 .. 'zzvucctuyeuwfbil' @ 1023520 : 1]
--- level 1 ---
 4231:1862625['aaajezvmsitnnejz' @ 1001937 : 1 .. 'blbakcmfgrtwyehv' @ 993423 : 1]
 4232:1784123['blcjhooocioixoit' @ 991308 : 1 .. 'cwlrttrlmjxefwup' @ 996329 : 1]
 4233:2113022['cwogxfqhvzevrrrc' @ 1012061 : 1 .. 'eocfiqlpwfbccmxg' @ 1018021 : 1]
 4234:210059['eodffvofatfsarkw' @ 991815 : 1 .. 'erwdzkmquwismiiy' @ 1008734 : 1]
 4235:2113056['erwopxgomtjszntr' @ 1000592 : 1 .. 'giewlotxatqzjovf' @ 1000600 : 1]
...
--- level 2 ---
 4083:2116195['aaacbsiejgeezqcb' @ 811752 : 1 .. 'adpimzodsychkglw' @ 807737 : 1]
 4084:2112026['adpkdfqbzpkxhjbk' @ 701446 : 1 .. 'ahiwydsxabdveorg' @ 847054 : 1]
 4085:2111979['ahixgxhavdrfhjqe' @ 814576 : 1 .. 'albnszihiruchzxc' @ 916447 : 1]
 4087:2116348['albpqapkmwsdklrw' @ 653044 : 1 .. 'aozdjvizjuffkjeo' @ 880899 : 1]
 4088:2112328['aozelvnoqwfrtuza' @ 753385 : 1 .. 'asrkxqalejefizpz' @ 805938 : 1]
 4089:2112075['asrlmyhsqldruhwa' @ 657241 : 1 .. 'awjoalxbekuyajeb' @ 983336 : 1]
 4090:2116197['awjobiuxkcadgoqj' @ 702399 : 1 .. 'babseezqzwxszhph' @ 839189 : 1]
 4093:2111908['babuvanukgkzeiyn' @ 912793 : 1 .. 'bdukrjhtrdbmqabo' @ 891071 : 1]
 4094:2116285['bdulpfqvudbraomp' @ 962101 : 1 .. 'bhkrhgcisgxlsbhu' @ 652288 : 1]
 4095:2116202['bhkricsgbfqlmqro' @ 971464 : 1 .. 'blcabgzpebkcyewj' @ 860948 : 1]
 4096:2111987['blcavpdtcnirxywg' @ 736071 : 1 .. 'boppeljwxlaxvcuk' @ 700794 : 1]
 4099:2111985['bopsjkfsxvwsxntg' @ 821203 : 1 .. 'bsizelryvsgunyor' @ 794552 : 1]
 4100:2116075['bsjbcmdwczovdkne' @ 670718 : 1 .. 'bvxmmpgmfkanzjwy' @ 983860 : 1]
 4101:1318883['bvxozsylkgilzxoy' @ 764579 : 1 .. 'byfssdrbywgwzemk' @ 824470 : 1]
...
--- level 3 ---
 2302:2116303['aaaaedomfzmckunq' @ 68453 : 1 .. 'acftfqgsejbnrooa' @ 105019 : 1]
 2304:2116275['acfuycrunfdbtnwf' @ 385636 : 1 .. 'aeitjoqmjyqonijv' @ 406785 : 1]
 2305:2116111['aeitmomvtohtrmxc' @ 326599 : 1 .. 'agmpdrsfiomtyoed' @ 332878 : 1]
 2307:2116162['agmpyfjydndrpwfv' @ 579213 : 1 .. 'aiqpprewufpwehbv' @ 217885 : 1]
 2309:2116227['aiqreckjfqqdyywn' @ 386880 : 1 .. 'akuwnaqfcfruwyuj' @ 60287 : 1]
 2310:2116114['akuwnjedlijvkzzc' @ 168449 : 1 .. 'amxoogjgysayudkk' @ 445482 : 1]
 2312:2116338['amxpjqqozxhwwebi' @ 532763 : 1 .. 'apczcpxyebndtipg' @ 413790 : 1]
 2313:2116136['apczftmdwgtqnkun' @ 182210 : 1 .. 'argphiqyodlxpekl' @ 413548 : 1]
 2315:2116301['argqhznzjjttaybf' @ 442321 : 1 .. 'atlgpojnnugmrdvo' @ 121827 : 1]
 2317:2116020['atlhhjtdbfhpcjej' @ 246234 : 1 .. 'avqflubxksiwlwej' @ 602243 : 1]
 2318:2116127['avqgdaltaazxjwxy' @ 318657 : 1 .. 'axvzgqwldofmtxxk' @ 170644 : 1]
 2320:2116193['axvzlblntufikupp' @ 466999 : 1 .. 'azzfqwhgsqyjzmmc' @ 283429 : 1]
 2321:2116178['azzfwhrzqphklobz' @ 168765 : 1 .. 'bcddotmmlssslypd' @ 186740 : 1]
 2323:2116161['bcddshulvefwfjcm' @ 231223 : 1 .. 'beilqtvrhuwfgttv' @ 523325 : 1]
 ...
--- level 4 ---
--- level 5 ---
--- level 6 ---
```
**生成文件**
![](https://img-blog.csdnimg.cn/0dcefa36af6e484489c1aa583d36155b.png)

```c
// CURRENT文件内容
MANIFEST-000002
// LOG文件内容
2023/02/11-06:35:32.870487 140210496087872 Creating DB ./testdb since it was missing.
2023/02/11-06:35:32.875001 140210496087872 Delete type=3 #1
2023/02/11-06:35:32.898943 140210496083712 Level-0 table #5: started
2023/02/11-06:35:32.915567 140210496083712 Level-0 table #5: 4128690 bytes OK
2023/02/11-06:35:32.916400 140210496083712 Delete type=0 #3
2023/02/11-06:35:32.920415 140210496083712 Level-0 table #7: started
2023/02/11-06:35:32.934316 140210496083712 Level-0 table #7: 4128807 bytes OK
2023/02/11-06:35:32.935451 140210496083712 Delete type=0 #4
2023/02/11-06:35:32.941378 140210496083712 Level-0 table #9: started
2023/02/11-06:35:32.957089 140210496083712 Level-0 table #9: 4128769 bytes OK
2023/02/11-06:35:32.958093 140210496083712 Delete type=0 #6
2023/02/11-06:35:32.963023 140210496083712 Level-0 table #11: started
2023/02/11-06:35:32.978190 140210496083712 Level-0 table #11: 4128815 bytes OK
2023/02/11-06:35:32.979442 140210496083712 Delete type=0 #8
2023/02/11-06:35:32.985640 140210496083712 Level-0 table #13: started
2023/02/11-06:35:32.999842 140210496083712 Level-0 table #13: 4128777 bytes OK
2023/02/11-06:35:33.001029 140210496083712 Delete type=0 #10
2023/02/11-06:35:33.006239 140210496083712 Level-0 table #15: started
2023/02/11-06:35:33.020803 140210496083712 Level-0 table #15: 4128955 bytes OK
2023/02/11-06:35:33.022021 140210496083712 Delete type=0 #12
2023/02/11-06:35:33.022766 140210496083712 Compacting 4@0 + 1@1 files
2023/02/11-06:35:33.031179 140210496083712 Generated table #16@0: 1992 keys, 2113270 bytes
2023/02/11-06:35:33.031215 140210496083712 Level-0 table #18: started
2023/02/11-06:35:33.046107 140210496083712 Level-0 table #18: 4128778 bytes OK
2023/02/11-06:35:33.047097 140210496083712 Delete type=0 #14
2023/02/11-06:35:33.050682 140210496083712 Level-0 table #21: started
2023/02/11-06:35:33.064028 140210496083712 Level-0 table #21: 4128553 bytes OK
2023/02/11-06:35:33.065309 140210496083712 Delete type=0 #17
2023/02/11-06:35:33.071441 140210496083712 Generated table #19@0: 1992 keys, 2113325 bytes
2023/02/11-06:35:33.071563 140210496083712 Level-0 table #24: started
2023/02/11-06:35:33.088064 140210496083712 Level-0 table #24: 4129123 bytes OK
2023/02/11-06:35:33.089207 140210496083712 Delete type=0 #20
2023/02/11-06:35:33.092185 140210496083712 Level-0 table #26: started
2023/02/11-06:35:33.105934 140210496083712 Level-0 table #26: 4128935 bytes OK
2023/02/11-06:35:33.107231 140210496083712 Delete type=0 #22
2023/02/11-06:35:33.113728 140210496083712 Generated table #23@0: 1992 keys, 2113261 bytes
2023/02/11-06:35:33.121746 140210496083712 Generated table #27@0: 1992 keys, 2113321 bytes
2023/02/11-06:35:33.129264 140210496083712 Generated table #28@0: 1992 keys, 2113146 bytes
2023/02/11-06:35:33.139340 140210496083712 Generated table #29@0: 1992 keys, 2113242 bytes
2023/02/11-06:35:33.147956 140210496083712 Generated table #30@0: 1992 keys, 2113192 bytes
2023/02/11-06:35:33.155818 140210496083712 Generated table #31@0: 1992 keys, 2113304 bytes
2023/02/11-06:35:33.164075 140210496083712 Generated table #32@0: 1992 keys, 2113287 bytes
2023/02/11-06:35:33.170066 140210496083712 Generated table #33@0: 1532 keys, 1625207 bytes
2023/02/11-06:35:33.170096 140210496083712 Compacted 4@0 + 1@1 files => 20644555 bytes
2023/02/11-06:35:33.170781 140210496083712 compacted to: files[ 4 10 1 0 0 0 0 ]
```

[leveldb的入门级使用](https://evil-crow.github.io/leveldb-usage/)
[linux下leveldb的安装与编译](https://blog.csdn.net/a1165741556/article/details/104028855)
sst_dump工具可用于转存数据，查看分析具体的SST 文件。sst_dump可以对 SST 文件执行多种操作
[Administration and Data Access Tool](https://wleoo.gitee.io/wleoo/2022/12/07/RocksDB%EF%BC%88%E4%BA%8C%EF%BC%89%EF%BC%9AAdministration-and-Data-Access-Tool/)
