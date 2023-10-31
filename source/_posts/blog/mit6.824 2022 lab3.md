---
title: mit6.824 2022 lab3
date: 2022-11-23 10:49:27
tags: Key/Value 6.824 lab3 kvraft
categories: 国外课程实验
---
<meta name="referrer" content="no-referrer" />



汇总博客：[MIT6.824 2022](https://www.jiasun.top/blog/mit6.824%202022.html)

推荐博客：
[如何的才能更好地学习 MIT6.824 分布式系统课程？](https://www.zhihu.com/question/29597104/answer/128443409)
[SOFAJRaft 日志复制 - pipeline 实现剖析 | SOFAJRaft 实现原理](https://www.sofastack.tech/blog/sofa-jraft-pipeline-principle/)
[raft在处理用户请求超时的时候，如何避免重试的请求被多次应用？](https://www.zhihu.com/question/278551592)
[一致性模型与共识算法](https://tanxinyu.work/consistency-and-consensus/#etcd-%E7%9A%84-Raft) 

lab3总体来说比lab2简单很多（至少通过一次全部测试简单很多），简单记录一下实验中遇到的问题。
## 3A
step 1：通过TestBasic3A测试
基本思路：

```go
Clerk.PutAppend 
	KVServer.PutAppend
		Raft.Start
		定时轮询，查看相应请求是否执行，获取请求结果
receiveTask：
	接收raft msg
	执行请求，修改数据结构，存入请求执行结果
```

step2：处理失败与重复执行问题
处理失败只需要加一个检测机制与超时机制
```go
Clerk.PutAppend 
	KVServer.PutAppend
		Raft.Start
		定时轮询，查看相应请求是否执行，获取请求结果
		检测相应位置是否出现了其他的命令（实际上就是比较commit index与cmd index），返回leader错误
		若超过一段时间请求仍未执行，返回超时错误
receiveTask：
	接收raft msg
	执行请求，修改数据结构，存入请求执行结果
```
client在接收到RPC回复leader错误/超时错误后尝试其他server。
由于理解错了以下这段文本的意思，在刚开始测试的时候没有加入超时机制

> One way to do this is for the server to detect that it has lost leadership, by noticing that a different request has appeared at the index returned by Start(), or that Raft's term has changed. If the ex-leader is partitioned by itself, it won't know about new leaders; but any client in the same partition won't be able to talk to a new leader either, so it's OK in this case for the server and client to wait indefinitely until the partition heals.

wait indefinitely 的前提条件是ex-leader被置于一个分区，**且**client也无法与其他server通信。
在运行TestManyPartitionsOneClient3A测试时，由于没有超时机制，sever一直等待raft执行刚下发的命令，但相应位置一直没有刚下发的命令，也没有其他命令，就卡死了。这时候client应该与另一个分区的leader通信，才能正常执行请求。

重复执行问题与及时释放内存实际上可以一起实现，最关键是理解It's OK to assume that a client will make only one call into a Clerk at a time.的含义。我将它理解成raft已提交日志中一旦出现新的请求，旧的请求结果就不用保存了，重复执行策略只针对一段时间重复出现的请求。
```go
commit log只可能出现
0 0 0 1
commit log不可能出现
0 0 1 0
```
client相关的数据结构见[raft在处理用户请求超时的时候，如何避免重试的请求被多次应用？](https://www.zhihu.com/question/278551592)，不过由于client的make only one call前提，就不需要最大成功回复的proposal的序列号了。
```go
type ReqResult struct { // 命令执行返回
	SequenceNum int64  // 命令序列号
	Status      Err    // 命令执行状态
	Value       string // 命令执行结果
}
clientCache       map[int64]ReqResult // 存放各个客户端最新结果
```
使用一个map数据结构存放各个客户端最新请求的执行结果，如果接收raft消息后发现相应SequenceNum等于cache的SequenceNum，就不再执行该请求；如果大于则执行相应请求，此时也相当于释放了之前请求结果的内存。

## 3B
这部分需要回答两个问题：在什么时候检查raftstate大小并生成快照？快照中需要包含什么数据？
一：可以在Get或PutAppend中检查raftstate大小吗？ 答案是不行，非leader的这两个RPC一般不会被调用，有可能会超过maxraftstate。所以我选择开启一个协程，定时检查raftstate大小并生成快照。(后面又改成了在receiveTask中检查，省的另开一个协程）
二：避免生成无用的快照
在lab2的Snapshot中我比较了当前快照索引与函数的快照索引
```go
func (rf *Raft) Snapshot(index int, snapshot []byte) {
	rf.mu.Lock()
	defer rf.mu.Unlock()
	if index <= rf.lastIncludedIndex { // 至少得比当前快照更新
		WPrintf("server%v no use snapshot.this index:%v last index:%v\n", rf.me, rf.lastIncludedIndex, index)
		return
	}
	// rf.log = rf.log[index-rf.lastIncludedIndex:]
	rf.log = append([]logEntry{}, rf.log[index-rf.lastIncludedIndex:]...)
	rf.lastIncludedIndex = index
	rf.lastIncludedTerm = rf.log[0].Term // 日志0位的term
	rf.snapshot = snapshot
	rf.persistStateAndSnapshot()
	// DPrintf("generate Snapshot. server id:%v Snapshot index:%v  log len:%v   commmit index:%v apply index:%v", rf.me, index, len(rf.log), rf.commitIndex, rf.lastApplied)
}
```
在3B测试中打印了一堆no use snapshot，并且两个索引一模一样，故记录上次生成快照时的索引大小，仅仅在commit index大于lastSnapshotIndex时才生成快照。

```go
if kv.persister.RaftStateSize() > kv.snapshotThreshold && kv.commitIndex > kv.lastSnapshotIndex
```
由此又考虑了另外一个问题，快照只能减小由commit log带来的空间开销，如果log中的日志全部为未提交，那么再怎么生成快照也没用。所以存在一种可能，不断进入的client请求可以让raftstate超过maxraftstate，故我在900时就开始生成快照（max是1000），并且在请求加入时判断当前raftstate是否超过maxraftstate，如果超过就等待。

```go
	for !kv.killed() {
		kv.mu.Lock()
		_, isLeader := kv.rf.GetState()
		isLogFull := kv.persister.RaftStateSize() > kv.maxraftstate
		kv.mu.Unlock()
		if !isLogFull && isLeader {
			break
		}
		if !isLeader {
			reply.Status = ErrWrongLeader
			return
		}
		if isLogFull && time.Since(requestBegin) > TimeoutThreshold {
			reply.Status = ErrLogFull
			return
		}
		time.Sleep(GeneralPollFrequency)
	}
```
但运行TestPersistConcurrent3A测试卡死了，查看状态后发现leader处于如下状态
![](https://img-blog.csdnimg.cn/40c2aa6ca58546a6803cbdb22bfe5334.png)
虽然match index全部为847，但不是当前term，commit index无法更新，但raftstate（1027）已经大于max（1000），请求又无法加入，就一直卡死了。所以看之前有个建议非常好，每当节点被选举为leader，就向日志中加入一条空指令，这样就能最快地更新commit index。
	最后我将以上这段代码删掉了，但实际上也不会报错，因为每个client一段时间只会执行一个请求，请求的key value又比较小，且client的数目比较少，而且在最后测试时比较的不是maxraftstate，而是8*maxraftstate。

```go
// Maximum log size across all servers
func (cfg *config) LogSize() int {
	logsize := 0
	for i := 0; i < cfg.n; i++ {
		n := cfg.saved[i].RaftStateSize()
		if n > logsize {
			logsize = n
		}
	}
	return logsize
}

if maxraftstate > 0 {
	// Check maximum after the servers have processed all client
	// requests and had time to checkpoint.
	sz := cfg.LogSize()
	if sz > 8*maxraftstate {
		t.Fatalf("logs were not trimmed (%v > 8*%v)", sz, maxraftstate)
	}
}
```


三：为了避免重复执行请求，在生成快照时需要将client cache编码进去

```go
func (kv *KVServer) generateSnapshotTask() {
	for !kv.killed() {
		kv.mu.Lock()
		if kv.persister.RaftStateSize() > kv.maxraftstate && kv.commitIndex > kv.lastSnapshotIndex {
			w := new(bytes.Buffer)
			e := labgob.NewEncoder(w)
			e.Encode(kv.commitIndex)
			e.Encode(kv.clientCache)
			e.Encode(kv.kvData)
			snapshot := w.Bytes()
			kv.rf.Snapshot(kv.commitIndex, snapshot)
			kv.lastSnapshotIndex = kv.commitIndex
		}
		kv.mu.Unlock()
		time.Sleep(SnapshotPollFrequency)
	}
}
```

在整个实验中我都没有用到term，只用了commit index。

**复用RPC回复警告**

```go
Test: one client (3A) ...
labgob warning: Decoding into a non-default variable/field Err may not work
  ... Passed --  15.1  5  7809  722
// 不好的  
    args := GetArgs{Key: key}
    reply := GetReply{}
    for i := 0; ; i = (i + 1) % ck.serverNumber {
		ok := ck.servers[i].Call("KVServer.Get", &args, &reply)
// 推荐的      
	args := GetArgs{Key: key}
	for i := 0; ; i = (i + 1) % ck.serverNumber {
		reply := GetReply{}
         ok := ck.servers[i].Call("KVServer.Get", &args, &reply)

// this warning typically arises if code re-uses the same RPC reply
// variable for multiple RPC calls, or if code restores persisted
// state into variable that already have non-default values.
fmt.Printf("labgob warning: Decoding into a non-default variable/field %v may not work\n",
           what)
```

## 实验结果与speed问题
```bash
go test 
Test: one client (3A) ...
  ... Passed --  15.1  5 10613 1350
Test: ops complete fast enough (3A) ...
  ... Passed --  11.2  3  6710    0
Test: many clients (3A) ...
  ... Passed --  15.3  5 26714 3478
Test: unreliable net, many clients (3A) ...
  ... Passed --  16.0  5 10565 1510
Test: concurrent append to same key, unreliable (3A) ...
  ... Passed --   0.9  3   271   52
Test: progress in majority (3A) ...
  ... Passed --   0.6  5    66    2
Test: no progress in minority (3A) ...
  ... Passed --   1.0  5   158    3
Test: completion after heal (3A) ...
  ... Passed --   1.0  5    63    3
Test: partitions, one client (3A) ...
  ... Passed --  22.8  5 15661 1252
Test: partitions, many clients (3A) ...
  ... Passed --  22.9  5 106202 3216
Test: restarts, one client (3A) ...
  ... Passed --  19.4  5 22991 1347
Test: restarts, many clients (3A) ...
  ... Passed --  20.1  5 72489 3498
Test: unreliable net, restarts, many clients (3A) ...
  ... Passed --  21.6  5 11451 1425
Test: restarts, partitions, many clients (3A) ...
  ... Passed --  26.8  5 69832 3170
Test: unreliable net, restarts, partitions, many clients (3A) ...
  ... Passed --  28.5  5 10220 1079
Test: unreliable net, restarts, partitions, random keys, many clients (3A) ...
2022/11/27 02:39:42 The corresponding position appears other cmd.
  ... Passed --  31.3  7 30530 2410
Test: InstallSnapshot RPC (3B) ...
2022/11/27 02:39:50 The corresponding position appears other cmd.
  ... Passed --   2.8  3  4327   63
Test: snapshot size is reasonable (3B) ...
  ... Passed --   9.1  3  6994  800
Test: ops complete fast enough (3B) ...
  ... Passed --  11.3  3  7798    0
Test: restarts, snapshots, one client (3B) ...
  ... Passed --  19.3  5 23214 1357
Test: restarts, snapshots, many clients (3B) ...
  ... Passed --  20.3  5 176897 21987
Test: unreliable net, snapshots, many clients (3B) ...
  ... Passed --  16.0  5 10725 1465
Test: unreliable net, restarts, snapshots, many clients (3B) ...
  ... Passed --  21.4  5 11779 1496
Test: unreliable net, restarts, partitions, snapshots, many clients (3B) ...
2022/11/27 02:41:30 The corresponding position appears other cmd.
  ... Passed --  27.4  5 10399 1173
Test: unreliable net, restarts, partitions, snapshots, random keys, many clients (3B) ...
2022/11/27 02:42:18 local server snapshot is newer. server id:5 lastIncludedIndex:3484  log len:1
2022/11/27 02:42:18 local server snapshot is newer. server id:5 lastIncludedIndex:3484  log len:1
2022/11/27 02:42:18 local server snapshot is newer. server id:5 lastIncludedIndex:3484  log len:1
  ... Passed --  30.3  7 39452 3402
PASS
ok      6.824/kvraft    412.917s
```
```bash
go test -race
Test: one client (3A) ...
  ... Passed --  15.1  5  4525  655
Test: ops complete fast enough (3A) ...
  ... Passed --  26.1  3  4341    0
Test: many clients (3A) ...
  ... Passed --  15.7  5  6705  991
Test: unreliable net, many clients (3A) ...
  ... Passed --  16.4  5  6162  841
Test: concurrent append to same key, unreliable (3A) ...
  ... Passed --   1.0  3   255   52
Test: progress in majority (3A) ...
  ... Passed --   0.4  5    47    2
Test: no progress in minority (3A) ...
  ... Passed --   1.0  5   150    3
Test: completion after heal (3A) ...
  ... Passed --   1.0  5   601    3
Test: partitions, one client (3A) ...
  ... Passed --  22.4  5  5848  628
Test: partitions, many clients (3A) ...
  ... Passed --  23.2  5 14463 1048
Test: restarts, one client (3A) ...
  ... Passed --  19.6  5  5745  616
Test: restarts, many clients (3A) ...
  ... Passed --  21.5  5 11644  907
Test: unreliable net, restarts, many clients (3A) ...
  ... Passed --  21.3  5  6786  764
Test: restarts, partitions, many clients (3A) ...
  ... Passed --  27.6  5 13994  865
Test: unreliable net, restarts, partitions, many clients (3A) ...
  ... Passed --  29.3  5  7442  694
Test: unreliable net, restarts, partitions, random keys, many clients (3A) ...
  ... Passed --  30.9  7 15310  605
Test: InstallSnapshot RPC (3B) ...
2022/11/27 02:49:36 The corresponding position appears other cmd.
  ... Passed --   3.0  3   828   63
Test: snapshot size is reasonable (3B) ...
  ... Passed --   9.2  3  3160  800
Test: ops complete fast enough (3B) ...
  ... Passed --  11.4  3  3797    0
Test: restarts, snapshots, one client (3B) ...
  ... Passed --  20.0  5 10775 1352
Test: restarts, snapshots, many clients (3B) ...
  ... Passed --  20.9  5 28711 3907
Test: unreliable net, snapshots, many clients (3B) ...
  ... Passed --  15.9  5 10020 1375
Test: unreliable net, restarts, snapshots, many clients (3B) ...
  ... Passed --  20.7  5 10768 1405
Test: unreliable net, restarts, partitions, snapshots, many clients (3B) ...
  ... Passed --  28.9  5  9563 1046
Test: unreliable net, restarts, partitions, snapshots, random keys, many clients (3B) ...
2022/11/27 02:51:46 local server snapshot is newer. server id:1 lastIncludedIndex:398  log len:13
2022/11/27 02:51:57 local server snapshot is newer. server id:4 lastIncludedIndex:1004  log len:15
  ... Passed --  31.3  7 28028 1956
PASS
ok      6.824/kvraft    435.349s
```
```bash
for i in {1..10000}; do go test -run TestSpeed3A -race; done
Test: ops complete fast enough (3A) ...
  ... Passed --  25.3  3  4321    0
PASS
ok      6.824/kvraft    26.307s
Test: ops complete fast enough (3A) ...
  ... Passed --  25.2  3  4182    0
PASS
ok      6.824/kvraft    26.171s
Test: ops complete fast enough (3A) ...
  ... Passed --  25.6  3  4179    0
PASS
ok      6.824/kvraft    26.610s
Test: ops complete fast enough (3A) ...
  ... Passed --  25.2  3  4038    0
PASS
ok      6.824/kvraft    26.181s
Test: ops complete fast enough (3A) ...
  ... Passed --  27.1  3  4337    0
PASS
ok      6.824/kvraft    28.115s
Test: ops complete fast enough (3A) ...
  ... Passed --  26.4  3  3963    0
PASS
ok      6.824/kvraft    27.423s
Test: ops complete fast enough (3A) ...
  ... Passed --  27.4  3  4364    0
PASS
ok      6.824/kvraft    28.387s
Test: ops complete fast enough (3A) ...
  ... Passed --  26.9  3  4088    0
PASS
ok      6.824/kvraft    27.906s
Test: ops complete fast enough (3A) ...
  ... Passed --  26.9  3  4210    0
PASS
ok      6.824/kvraft    27.884s
Test: ops complete fast enough (3A) ...
  ... Passed --  27.3  3  3900    0
PASS
ok      6.824/kvraft    28.368s
```
```bash
for i in {1..10}; do go test -run TestSpeed3A; done
Test: ops complete fast enough (3A) ...
  ... Passed --  11.2  3  6080    0
PASS
ok      6.824/kvraft    11.217s
Test: ops complete fast enough (3A) ...
  ... Passed --  11.3  3  6626    0
PASS
ok      6.824/kvraft    11.293s
Test: ops complete fast enough (3A) ...
  ... Passed --  11.3  3  6828    0
PASS
ok      6.824/kvraft    11.263s
Test: ops complete fast enough (3A) ...
  ... Passed --  11.2  3  7360    0
PASS
ok      6.824/kvraft    11.232s
Test: ops complete fast enough (3A) ...
  ... Passed --  10.9  3  5927    0
PASS
ok      6.824/kvraft    10.909s
Test: ops complete fast enough (3A) ...
  ... Passed --  11.3  3  5564    0
PASS
ok      6.824/kvraft    11.305s
Test: ops complete fast enough (3A) ...
  ... Passed --  11.2  3  5945    0
PASS
ok      6.824/kvraft    11.227s
Test: ops complete fast enough (3A) ...
  ... Passed --  11.3  3  6776    0
PASS
ok      6.824/kvraft    11.307s
Test: ops complete fast enough (3A) ...
  ... Passed --  11.2  3  5000    0
PASS
ok      6.824/kvraft    11.237s
Test: ops complete fast enough (3A) ...
  ... Passed --  11.2  3  6073    0
PASS
ok      6.824/kvraft    11.203s
```
不知道为什么，-race对TestSpeed3A测试影响很大，不加-race就是11s左右，加了-race选项就是25~30s，有时候也能跑到35s，不过正式测试也不加race，也就无所谓了。

## 参考代码
我一直试图使用select实现超时处理，但使用select就意味着需要使用通道传递返回信息，但如果为每一个请求创建一个通道，如何及时释放这些空间又是一个问题，没想到非常好的解决方案，就还是使用轮询的老方法。

**client.go**

```go
type Clerk struct {
	servers []*labrpc.ClientEnd
	// You will have to modify this struct.
	serverNumber  int   // 服务器节点数
	clientId      int64 // 随机生成的客户端ID
	currentSeqNum int64 // 当前序列号
	lastLeader    int   // 上次成功连接的leader
}

func nrand() int64 {
	max := big.NewInt(int64(1) << 62)
	bigx, _ := rand.Int(rand.Reader, max)
	x := bigx.Int64()
	return x
}

func MakeClerk(servers []*labrpc.ClientEnd) *Clerk {
	ck := new(Clerk)
	ck.servers = servers
	// You'll have to add code here.
	ck.serverNumber = len(servers)
	ck.clientId = nrand() // 生成随机的ID
	ck.currentSeqNum = 1  // 起始序列号为1
	return ck
}


func (ck *Clerk) Get(key string) string {
	args := GetArgs{Key: key, ClientId: ck.clientId, SequenceNum: atomic.AddInt64(&ck.currentSeqNum, 1)}
	for {
		for i := ck.lastLeader; i < ck.lastLeader+ck.serverNumber; i++ { // 持续尝试不同节点
			reply := GetReply{}
			ok := ck.servers[i%ck.serverNumber].Call("KVServer.Get", &args, &reply)
			if ok && reply.Status == ErrNoKey {
				ck.lastLeader = i
				return ""
			}
			if ok && reply.Status == OK {
				ck.lastLeader = i
				return reply.Value
			}
		}
		time.Sleep(100 * time.Millisecond)
	}

}

func (ck *Clerk) PutAppend(key string, value string, op string) {
	args := PutAppendArgs{Key: key, Value: value, Op: op, ClientId: ck.clientId, SequenceNum: atomic.AddInt64(&ck.currentSeqNum, 1)}
	for {
		for i := ck.lastLeader; i < ck.lastLeader+ck.serverNumber; i++ { // 持续尝试不同节点
			reply := PutAppendReply{}
			ok := ck.servers[i%ck.serverNumber].Call("KVServer.PutAppend", &args, &reply)
			if ok && reply.Status == OK {
				ck.lastLeader = i
				return
			}
		}
		time.Sleep(100 * time.Millisecond)
	}

}

func (ck *Clerk) Put(key string, value string) {
	ck.PutAppend(key, value, "Put")
}
func (ck *Clerk) Append(key string, value string) {
	ck.PutAppend(key, value, "Append")
}
```
**common.go**
```go
const ( // 错误类型
	OK             = "OK"
	ErrNoKey       = "ErrNoKey"
	ErrWrongLeader = "ErrWrongLeader"
	ErrTimeout     = "ErrTimeout"
	ErrOldRequest  = "ErrOldRequest" // 未出现
	ErrLogFull     = "ErrLogFull"    // 未用到
)

type Err string

type ReqResult struct { // 命令执行返回
	SequenceNum int64  // 命令序列号
	Status      Err    // 命令执行状态
	Value       string // 命令执行结果
}

// Put or Append
type PutAppendArgs struct {
	Key   string
	Value string
	Op    string // "Put" or "Append"
	// 附带client id与序列号
	ClientId    int64
	SequenceNum int64
}

type PutAppendReply struct {
	Status Err
}

type GetArgs struct {
	Key string
	// 附带client id与序列号
	ClientId    int64
	SequenceNum int64
}

type GetReply struct {
	Status Err
	Value  string
}
```
**server.go**

```go
const Debug = true

func DPrintf(format string, a ...interface{}) (n int, err error) {
	if Debug {
		log.Printf(format, a...)
	}
	return
}

const (
	GeneralPollFrequency  = 10 * time.Millisecond  // 轮询时间
	TimeoutThreshold      = 200 * time.Millisecond // 超时阈值
	SnapshotPollFrequency = 100 * time.Millisecond // 快照轮询时间
)

type KVServer struct {
	mu           sync.Mutex
	me           int
	rf           *raft.Raft
	applyCh      chan raft.ApplyMsg
	dead         int32 // set by Kill()
	maxraftstate int   // snapshot if log grows this big

	persister         *raft.Persister
	kvData            map[string]string   // 存放kv数据
	clientCache       map[int64]ReqResult // 存放各个客户端最新结果
	commitIndex       int                 // server当前commit index
	lastSnapshotIndex int                 // 上次快照的commit index
}

func (kv *KVServer) Get(args *GetArgs, reply *GetReply) {
	requestBegin := time.Now()
	kv.mu.Lock()
	index, _, isLeader := kv.rf.Start(*args) // 开始协商用户请求
	kv.mu.Unlock()
	if !isLeader { // 当前节点不是leader节点，返回错误
		reply.Status = ErrWrongLeader
		return
	}
	for {
		kv.mu.Lock()
		outCycle := false
		cache := kv.clientCache[args.ClientId]
		if cache.SequenceNum < args.SequenceNum { // 仍未执行相应请求
			if kv.commitIndex >= index { // 相应位置出现了其他的命令
				reply.Status = ErrWrongLeader
				outCycle = true
			} else if time.Since(requestBegin) > TimeoutThreshold { // 等待超时
				reply.Status = ErrTimeout
				outCycle = true
			}
		} else if cache.SequenceNum == args.SequenceNum { // 请求执行成功
			reply.Status = cache.Status
			reply.Value = cache.Value
			outCycle = true
		} else if cache.SequenceNum > args.SequenceNum {
			reply.Status = ErrOldRequest
			outCycle = true
		}
		kv.mu.Unlock()
		if outCycle {
			return
		}
		time.Sleep(GeneralPollFrequency)
	}
}

func (kv *KVServer) PutAppend(args *PutAppendArgs, reply *PutAppendReply) {
	requestBegin := time.Now()
	kv.mu.Lock()
	index, _, isLeader := kv.rf.Start(*args) // 开始协商用户请求
	kv.mu.Unlock()
	if !isLeader {
		reply.Status = ErrWrongLeader
		return
	}
	for {
		kv.mu.Lock()
		outCycle := false
		cache := kv.clientCache[args.ClientId]
		if cache.SequenceNum < args.SequenceNum { // 仍未执行相应请求
			if kv.commitIndex >= index { // 相应位置出现了其他的命令
				reply.Status = ErrWrongLeader
				outCycle = true
			} else if time.Since(requestBegin) > TimeoutThreshold { // 等待超时
				reply.Status = ErrTimeout
				outCycle = true
			}
		} else if cache.SequenceNum == args.SequenceNum { // 请求执行成功
			reply.Status = OK
			outCycle = true
		} else if cache.SequenceNum > args.SequenceNum {
			reply.Status = ErrOldRequest
			outCycle = true
		}
		kv.mu.Unlock()
		if outCycle {
			return
		}
		time.Sleep(GeneralPollFrequency)
	}
}


func (kv *KVServer) Kill() {
	atomic.StoreInt32(&kv.dead, 1)
	kv.rf.Kill()
	// Your code here, if desired.
}

func (kv *KVServer) killed() bool {
	z := atomic.LoadInt32(&kv.dead)
	return z == 1
}

// 接受raft消息
func (kv *KVServer) receiveTask() {
	for !kv.killed() {
		msg := <-kv.applyCh
		kv.mu.Lock()
		if msg.CommandValid { // 普通的日志消息
			kv.commitIndex = msg.CommandIndex
			switch data := msg.Command.(type) {
			case GetArgs:
				cache := kv.clientCache[data.ClientId]    // 查看相应客户端缓存
				if cache.SequenceNum < data.SequenceNum { // 执行请求，自动覆盖之前的结果
					value, ok := kv.kvData[data.Key]
					if !ok { // 判断是否存在相应key，返回错误码
						kv.clientCache[data.ClientId] = ReqResult{SequenceNum: data.SequenceNum, Status: ErrNoKey}
					} else {
						kv.clientCache[data.ClientId] = ReqResult{SequenceNum: data.SequenceNum, Status: OK, Value: value}
					}
				}
			case PutAppendArgs:
				cache := kv.clientCache[data.ClientId]    // 查看相应客户端缓存
				if cache.SequenceNum < data.SequenceNum { // 执行请求，自动覆盖之前的结果
					if data.Op == "Put" {
						kv.kvData[data.Key] = data.Value
					} else {
						kv.kvData[data.Key] += data.Value
					}

					kv.clientCache[data.ClientId] = ReqResult{SequenceNum: data.SequenceNum, Status: OK}
				}
			}
		} else if msg.SnapshotValid { // 快照消息
			r := bytes.NewBuffer(msg.Snapshot)
			d := labgob.NewDecoder(r)
			var commitIndex int
			var clientCache map[int64]ReqResult
			var kvData map[string]string
			if d.Decode(&commitIndex) != nil || d.Decode(&clientCache) != nil || d.Decode(&kvData) != nil {
				log.Panicf("snapshot decode error")
			} else {
				kv.commitIndex = commitIndex
				kv.clientCache = clientCache
				kv.kvData = kvData
				// 更新lastSnapshotIndex
				kv.lastSnapshotIndex = commitIndex
			}
		}
		// 检查raft state大小，生成快照
		if kv.maxraftstate > 0 && kv.persister.RaftStateSize() > kv.maxraftstate && kv.commitIndex > kv.lastSnapshotIndex {
			w := new(bytes.Buffer)
			e := labgob.NewEncoder(w)
			e.Encode(kv.commitIndex)
			e.Encode(kv.clientCache)
			e.Encode(kv.kvData)
			snapshot := w.Bytes()
			kv.rf.Snapshot(kv.commitIndex, snapshot)
			kv.lastSnapshotIndex = kv.commitIndex
		}
		kv.mu.Unlock()
	}
}


func StartKVServer(servers []*labrpc.ClientEnd, me int, persister *raft.Persister, maxraftstate int) *KVServer {
	// call labgob.Register on structures you want
	// Go's RPC library to marshall/unmarshall.
	labgob.Register(GetArgs{})
	labgob.Register(PutAppendArgs{})

	kv := new(KVServer)
	kv.me = me
	kv.maxraftstate = maxraftstate

	// You may need initialization code here.

	kv.applyCh = make(chan raft.ApplyMsg)
	kv.rf = raft.Make(servers, me, persister, kv.applyCh)

	// You may need initialization code here.
	kv.kvData = make(map[string]string)
	kv.clientCache = map[int64]ReqResult{}
	kv.persister = persister
	go kv.receiveTask()
	return kv
}
```

