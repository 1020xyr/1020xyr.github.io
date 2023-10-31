---
title: leveldb自定义env
date: 2023-05-05 21:35:45
tags: LevelDB 自定义env
categories: leveldb学习日记
index_img: https://img-blog.csdnimg.cn/3107463f4f7a429b9ae1ecc36c764762.png
---
<meta name="referrer" content="no-referrer" />




由于项目需求，需要自定义LevelDB的env，也就是以块接口实现env中各个文件接口，在网上没找到类似的代码，就打算自己参照**util/env_posix.cc**实现一个简单的demo，等到功能实现差不多的时候，却发现leveldb有一个类似功能的代码**helpers/memenv/memenv.cc**，且各方面都写的比我好，故这篇博客主要记录实现过程中遇到的问题。
增加了四个文件 filesystem.h filesystem.c simple_env.h simple_env.c

代码链接：[leveldb_env](https://github.com/1020xyr/leveldb_env)

### 修改记录
version0是自己写的版本，version1是我对照InMemoryEnv修改过的版本

主要的修改点在于：
1 头文件的放置
![](https://img-blog.csdnimg.cn/58047506897d4e79ba5d1d9bdf9e7e89.png)
刚开始我把自己定义的类都放在头文件中，而后放在include/leveldb，想要提供给测试程序使用，后面看InMemoryEnv发现并不需要这样，在程序使用自定义env时只需要Env*就可以了，并不需要那么多的实现细节，这也是虚函数的意义所在，故将头文件放在myenv目录下，env.h中添加函数声明
```cpp
class LEVELDB_EXPORT Env {
  static Env* GetSimpleEnv();
}
```
在simle_env.cc中实现函数

```cpp
Env* Env::GetSimpleEnv() { return SimpleEnv::GetInstance(); }
```
2 使用锁-引用计数保护数据结构


3 代码中的简单出错处理

4 不同文件类型的处理逻辑

```bash
NewSequentialFile: 文件不存在则返回错误
NewRandomAccessFile: 文件不存在则返回错误
NewWritableFile: 文件不存在则创建，存在则清空数据
NewAppendableFile: 文件不存在则创建
```

### undefined reference to `typeinfo for leveldb::Env
编译测试程序的时候出现以下错误
```bash
/usr/bin/ld: /tmp/ccXgrLBz.o:(.data.rel.ro._ZTIN7leveldb9SimpleEnvE[_ZTIN7leveldb9SimpleEnvE]+0x10): undefined reference to `typeinfo for leveldb::Env'
/usr/bin/ld: /tmp/ccXgrLBz.o:(.data.rel.ro._ZTIN7leveldb18SimpleWritableFileE[_ZTIN7leveldb18SimpleWritableFileE]+0x10): undefined reference to `typeinfo for leveldb::WritableFile'
/usr/bin/ld: /tmp/ccXgrLBz.o:(.data.rel.ro._ZTIN7leveldb22SimpleRandomAccessFileE[_ZTIN7leveldb22SimpleRandomAccessFileE]+0x10): undefined reference to `typeinfo for leveldb::RandomAccessFile'
/usr/bin/ld: /tmp/ccXgrLBz.o:(.data.rel.ro._ZTIN7leveldb20SimpleSequentialFileE[_ZTIN7leveldb20SimpleSequentialFileE]+0x10): undefined reference to `typeinfo for leveldb::SequentialFile'
```
自然而然地，看到undefined我就使用nm命令列出了simple_env.o定义的符号，却发现没有我定义那些函数，我就认为问题出现在这里，实际上当时我将所有的实现都写在了头文件里，也就是说全都是内联函数，**内联函数本来就不会出现在符号表中**。
简单测试：
```cpp
class Test {
 public:
  int info() { return a; }  // 内联函数
  void print();             // 非内联函数

 private:
  int a;
};

void Test::print() {
  int a;
  int b = a + 1;
}
```

```bash
root@ubuntu ~/l/l/test (main)# g++ inline_test.cpp -c
root@ubuntu ~/l/l/test (main)# nm inline_test.o
0000000000000000 T _ZN4Test5printEv
```
[C++内联函数的使用](https://www.cnblogs.com/2018shawn/p/10851779.html)

而后调转方向，查看undefined reference to `typeinfo for leveldb::SequentialFile'错误信息的相关博客，找到了以下博客
[Undefined Reference to Typeinfo](https://blog.csdn.net/heli200482128/article/details/80053728)
混用了no-RTTI代码和RTTI代码，查看LevelDB的CMakeLists.txt，发现确实禁用了RTTI
```bash
  # Disable RTTI.
  string(REGEX REPLACE "-frtti" "" CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS}")
  set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -fno-rtti")
```
故编译测试程序时加上编译选项-fno-rtti

```cpp
g++ test.cpp -o test -g -pthread -lleveldb -fno-rtti
```
编译成功！

阅读RTTI的相关博客
[Is there life without RTTI or How we wrote our own dynamic_cast](https://pvs-studio.com/fr/blog/posts/cpp/0998/)
[谷歌C++风格指南 运行时类型识别](https://zh-google-styleguide.readthedocs.io/en/latest/google-cpp-styleguide/others/)
[运行时类型信息RTTI](https://blog.csdn.net/techx/article/details/44462225)

<mark>后面我调整了头文件的位置，只暴露Env* GetSimpleEnv()接口，即使不加-fno-rtti也不报错。</mark>




### cmake相关
刚开始我是手动拷贝头文件与库文件，比较麻烦
```bash
cp build/libleveldb.a /usr/local/lib/
cp -r include/leveldb/ /usr/local/include/
```
看CMakeLists.txt里发现有install，故直接make install安装头文件与库文件

```bash
if(LEVELDB_INSTALL)
  install(TARGETS leveldb
    EXPORT leveldbTargets
    RUNTIME DESTINATION ${CMAKE_INSTALL_BINDIR}
    LIBRARY DESTINATION ${CMAKE_INSTALL_LIBDIR}
    ARCHIVE DESTINATION ${CMAKE_INSTALL_LIBDIR}
  )
  install(
    FILES
      "${LEVELDB_PUBLIC_INCLUDE_DIR}/c.h"
      "${LEVELDB_PUBLIC_INCLUDE_DIR}/cache.h"
      "${LEVELDB_PUBLIC_INCLUDE_DIR}/comparator.h"
      "${LEVELDB_PUBLIC_INCLUDE_DIR}/db.h"
      "${LEVELDB_PUBLIC_INCLUDE_DIR}/dumpfile.h"
      "${LEVELDB_PUBLIC_INCLUDE_DIR}/env.h"
      "${LEVELDB_PUBLIC_INCLUDE_DIR}/export.h"
      "${LEVELDB_PUBLIC_INCLUDE_DIR}/filter_policy.h"
      "${LEVELDB_PUBLIC_INCLUDE_DIR}/iterator.h"
      "${LEVELDB_PUBLIC_INCLUDE_DIR}/options.h"
      "${LEVELDB_PUBLIC_INCLUDE_DIR}/slice.h"
      "${LEVELDB_PUBLIC_INCLUDE_DIR}/status.h"
      "${LEVELDB_PUBLIC_INCLUDE_DIR}/table_builder.h"
      "${LEVELDB_PUBLIC_INCLUDE_DIR}/table.h"
      "${LEVELDB_PUBLIC_INCLUDE_DIR}/write_batch.h"
    DESTINATION "${CMAKE_INSTALL_INCLUDEDIR}/leveldb"
  )

  include(CMakePackageConfigHelpers)
  configure_package_config_file(
    "cmake/${PROJECT_NAME}Config.cmake.in"
    "${PROJECT_BINARY_DIR}/cmake/${PROJECT_NAME}Config.cmake"
    INSTALL_DESTINATION "${CMAKE_INSTALL_LIBDIR}/cmake/${PROJECT_NAME}"
  )
  write_basic_package_version_file(
    "${PROJECT_BINARY_DIR}/cmake/${PROJECT_NAME}ConfigVersion.cmake"
    COMPATIBILITY SameMajorVersion
  )
  install(
    EXPORT leveldbTargets
    NAMESPACE leveldb::
    DESTINATION "${CMAKE_INSTALL_LIBDIR}/cmake/${PROJECT_NAME}"
  )
  install(
    FILES
      "${PROJECT_BINARY_DIR}/cmake/${PROJECT_NAME}Config.cmake"
      "${PROJECT_BINARY_DIR}/cmake/${PROJECT_NAME}ConfigVersion.cmake"
    DESTINATION "${CMAKE_INSTALL_LIBDIR}/cmake/${PROJECT_NAME}"
  )
endif(LEVELDB_INSTALL)
```
[CMake之install方法的使用](https://zhuanlan.zhihu.com/p/102955723)

[CMAKE 里PRIVATE、PUBLIC、INTERFACE属性示例详解](https://blog.csdn.net/weixin_43862847/article/details/119762230)
![](https://img-blog.csdnimg.cn/698af498d1bf411eb25ac14a9afbc653.png)



### InMemoryEnv中引用计数的处理

leveldb中env 文件操作的使用示例

```c
Status BuildTable(const std::string& dbname, Env* env, const Options& options,
                  TableCache* table_cache, Iterator* iter, FileMetaData* meta) {
  Status s;
  meta->file_size = 0;
  iter->SeekToFirst();

  std::string fname = TableFileName(dbname, meta->number);
  if (iter->Valid()) {
    WritableFile* file;
    s = env->NewWritableFile(fname, &file);
    if (!s.ok()) {
      return s;
    }

    TableBuilder* builder = new TableBuilder(options, file);
    meta->smallest.DecodeFrom(iter->key());
    Slice key;
    for (; iter->Valid(); iter->Next()) {
      key = iter->key();
      builder->Add(key, iter->value());
    }
    if (!key.empty()) {
      meta->largest.DecodeFrom(key);
    }

    // Finish and check for builder errors
    s = builder->Finish();
    if (s.ok()) {
      meta->file_size = builder->FileSize();
      assert(meta->file_size > 0);
    }
    delete builder;

    // Finish and check for file errors
    if (s.ok()) {
      s = file->Sync();
    }
    if (s.ok()) {
      s = file->Close();
    }
    delete file;
    file = nullptr;

    if (s.ok()) {
      // Verify that the table is usable
      Iterator* it = table_cache->NewIterator(ReadOptions(), meta->number,
                                              meta->file_size);
      s = it->status();
      delete it;
    }
  }

  // Check for input iterator errors
  if (!iter->status().ok()) {
    s = iter->status();
  }

  if (s.ok() && meta->file_size > 0) {
    // Keep it
  } else {
    env->RemoveFile(fname);
  }
  return s;
}
```

关注以下两行，阅读InMemoryEnv的相关实现
```c
s = env->NewWritableFile(fname, &file);
delete file;
```

```c
class FileState {
  // Increase the reference count.
  void Ref() {		// 增加文件引用计数
    MutexLock lock(&refs_mutex_);
    ++refs_;
  }

  // Decrease the reference count. Delete if this is the last reference.
  void Unref() {	// 减小文件引用计数，为0时删除指向对象	
    bool do_delete = false;

    {
      MutexLock lock(&refs_mutex_);
      --refs_;
      assert(refs_ >= 0);
      if (refs_ <= 0) {
        do_delete = true;
      }
    }

    if (do_delete) {
      delete this;
    }
  }
 private:
  int refs_ GUARDED_BY(refs_mutex_);
};

class InMemoryEnv : public EnvWrapper {
 public:
  explicit InMemoryEnv(Env* base_env) : EnvWrapper(base_env) {}

  ~InMemoryEnv() override {
    for (const auto& kvp : file_map_) {
      kvp.second->Unref();				// 减小现存文件的引用计数
    }
  }
 private:
  // Map from filenames to FileState objects, representing a simple file system.
  typedef std::map<std::string, FileState*> FileSystem;	// 文件名与文件对象映射

  port::Mutex mutex_;
  FileSystem file_map_ GUARDED_BY(mutex_);
};

class WritableFileImpl : public WritableFile {
 public:
  WritableFileImpl(FileState* file) : file_(file) { file_->Ref(); }

  ~WritableFileImpl() override { file_->Unref(); }
  
 private:
  FileState* file_;
};


Status NewWritableFile(const std::string& fname, WritableFile** result) override {
  MutexLock lock(&mutex_);
  FileSystem::iterator it = file_map_.find(fname);

  FileState* file;
  if (it == file_map_.end()) {
    // File is not currently open.
    file = new FileState(); // 此时文件引用计数为0
    file->Ref();			  // 此时文件引用计数为1
    file_map_[fname] = file;
  } else {  // 文件已存在，引用计数为1
    file = it->second;
    file->Truncate();
  }

  *result = new WritableFileImpl(file);	// 此时文件引用计数为2
  return Status::OK();
}
```

可以看出，在leveldb使用过程中，只要文件未删除（Env的RemoveFile），即使调用delete语句删除文件对象，文件对象的引用计数只是从2变成1，仍然存在于内存中


### 单线程写入
leveldb使用单线程合并sst文件

```c
void DBImpl::MaybeScheduleCompaction() {
  mutex_.AssertHeld();
  if (background_compaction_scheduled_) {
    // Already scheduled
  } else if (shutting_down_.load(std::memory_order_acquire)) {
    // DB is being deleted; no more background compactions
  } else if (!bg_error_.ok()) {
    // Already got an error; no more changes
  } else if (imm_ == nullptr && manual_compaction_ == nullptr && !versions_->NeedsCompaction()) {
    // No work to be done
  } else {
    background_compaction_scheduled_ = true;
    env_->Schedule(&DBImpl::BGWork, this);
  }
}

// 关注Schedule posix实现
void PosixEnv::Schedule(
    void (*background_work_function)(void* background_work_arg),
    void* background_work_arg) {
  background_work_mutex_.Lock();

  // Start the background thread, if we haven't done so already.
  if (!started_background_thread_) {  	// 只开启一个线程进行合并操作
    started_background_thread_ = true;
    std::thread background_thread(PosixEnv::BackgroundThreadEntryPoint, this);
    background_thread.detach();
  }

  // If the queue is empty, the background thread may be waiting for work.
  if (background_work_queue_.empty()) {
    background_work_cv_.Signal();
  }

  background_work_queue_.emplace(background_work_function, background_work_arg);
  background_work_mutex_.Unlock();
}

// 线程主函数
static void BackgroundThreadEntryPoint(PosixEnv* env) {
  env->BackgroundThreadMain();
}
// 没有任务时休眠，有任务时一次执行一个任务
void PosixEnv::BackgroundThreadMain() {
  while (true) {
    background_work_mutex_.Lock();

    // Wait until there is work to be done.
    while (background_work_queue_.empty()) {
      background_work_cv_.Wait();
    }

    assert(!background_work_queue_.empty());
    auto background_work_function = background_work_queue_.front().function;
    void* background_work_arg = background_work_queue_.front().arg;
    background_work_queue_.pop();

    background_work_mutex_.Unlock();
    background_work_function(background_work_arg);
  }
}
```

### GetChildren
该方法返回相当于目录的相对路径
```cpp
  // Store in *result the names of the children of the specified directory.
  // The names are relative to "dir".
  // Original contents of *results are dropped.
  virtual Status GetChildren(const std::string& dir,
                             std::vector<std::string>* result) = 0;
 // 使用场景，若GetChildren实现错误则RemoveObsoleteFiles无法移除无用文件
 void DBImpl::RemoveObsoleteFiles() {
  mutex_.AssertHeld();

  if (!bg_error_.ok()) {
    // After a background error, we don't know whether a new version may
    // or may not have been committed, so we cannot safely garbage collect.
    return;
  }

  // Make a set of all of the live files
  std::set<uint64_t> live = pending_outputs_;
  versions_->AddLiveFiles(&live);

  std::vector<std::string> filenames;
  env_->GetChildren(dbname_, &filenames);  // Ignoring errors on purpose
  uint64_t number;
  FileType type;
  std::vector<std::string> files_to_delete;
  for (std::string& filename : filenames) {
    if (ParseFileName(filename, &number, &type)) {
      bool keep = true;
      switch (type) {
        case kLogFile:
          keep = ((number >= versions_->LogNumber()) || (number == versions_->PrevLogNumber()));
          break;
        case kDescriptorFile:
          // Keep my manifest file, and any newer incarnations'
          // (in case there is a race that allows other incarnations)
          keep = (number >= versions_->ManifestFileNumber());
          break;
        case kTableFile:
          keep = (live.find(number) != live.end());
          break;
        case kTempFile:
          // Any temp files that are currently being written to must
          // be recorded in pending_outputs_, which is inserted into "live"
          keep = (live.find(number) != live.end());
          break;
        case kCurrentFile:
        case kDBLockFile:
        case kInfoLogFile:
          keep = true;
          break;
      }

      if (!keep) {
        files_to_delete.push_back(std::move(filename));
        if (type == kTableFile) {
          table_cache_->Evict(number);
        }
        Log(options_.info_log, "Delete type=%d #%lld\n", static_cast<int>(type), static_cast<unsigned long long>(number));
      }
    }
  }

  // While deleting all files unblock other threads. All files being deleted
  // have unique names which will not collide with newly created files and
  // are therefore safe to delete while allowing other threads to proceed.
  mutex_.Unlock();
  for (const std::string& filename : files_to_delete) {
    env_->RemoveFile(dbname_ + "/" + filename);
  }
  mutex_.Lock();
}

```


修改leveldb实现后记得make && make install，保证应用程序使用的库已更新
