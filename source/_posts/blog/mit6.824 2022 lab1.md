---
title: mit6.824 2022 lab1
date: 2022-11-22 20:25:36
tags: mapreduce 6.824 mit6.824 lab1 lab1
categories: 国外课程实验
---
<meta name="referrer" content="no-referrer" />



以前写的lab1博客：[MIT6.824 lab1](https://www.jiasun.top/blog/MIT6.824%20lab1.html)
汇总博客：[MIT6.824 2022](https://www.jiasun.top/blog/mit6.824%202022.html)
## 基本实现
Coordinator：
1 Worker通过RPC申请任务，实现该RPC处理逻辑
我的实现是通过一个管道，Coordinator往里面写入任务，RPC处理函数从里面获取任务
2 调度任务
```go
wg.Add(nMap)
开启nMap个goroutine监督完成map task
wg.Wait()
wg.Add(nReduce)
开启nReduce个goroutine监督完成reduce task
wg.Wait()
设置完成标志
```
Worker：
1 一直调用Coordinator RPC申请任务
2 执行相应的Map任务与Reduce任务

2022版的lab1与2018的lab1虽然有一些不一样，但关键步骤差不多。在实现中比较重要的一点就是worker如何告知master任务已完成，之前lab1 master调用worker的方法，由于是RPC是同步调用，可以通过res判断任务执行状态

```go
func schedule(jobName string, mapFiles []string, nReduce int, phase jobPhase, registerChan chan string) {
	var ntasks int	// 当前阶段任务数目
	var n_other int // number of inputs (for reduce) or outputs (for map)
	switch phase {
	case mapPhase:
		ntasks = len(mapFiles)
		n_other = nReduce
	case reducePhase:
		ntasks = nReduce
		n_other = len(mapFiles)
	}

	fmt.Printf("Schedule: %v %v tasks (%d I/Os)\n", ntasks, phase, n_other)
	var wg sync.WaitGroup
	wg.Add(ntasks)
	for i := 0; i < ntasks; i++ {
		var arg DoTaskArgs
		if phase == mapPhase {
			arg = DoTaskArgs{JobName: jobName, File: mapFiles[i], Phase: phase, TaskNumber: i, NumOtherPhase: n_other}
		} else {
			arg = DoTaskArgs{JobName: jobName, File: "", Phase: phase, TaskNumber: i, NumOtherPhase: n_other}
		}
		go func(args DoTaskArgs, registerChan chan string) {
			res := false
			var workerAddress string
			for res == false {
				workerAddress = <-registerChan // 等待Worker到来
				res = call(workerAddress, "Worker.DoTask", arg, nil) // 调用Worker的RPC执行任务
			}
			go func() {
				registerChan <- workerAddress // 将Worker放回队列
			}()
			wg.Done()
		}(arg, registerChan)
	}
	wg.Wait()
	fmt.Printf("Schedule: %v done\n", phase)

}
```
而2022是worker调用master方法申请任务，可选的通知方式有：
 - master通过判断预期的输出文件是否存在来间接判断下发的任务是否执行完成（不推荐）
 - worker在任务完成后调用rpc方法，告知master

第一种方式相关代码
```go
for {
	c.tasks <- RequestReply{Type: MapTask, Filename: filename, Index: index, Number: nReduce}
	time.Sleep(time.Second * 10)
	// 是否生成所有中间文件
	status := true
	for j := 0; j < nReduce; j++ {
		expectFilename := fmt.Sprintf("mr-%d-%d", index, j)
		_, err := os.Stat(expectFilename)
		// 任务失败，重启任务
		if os.IsNotExist(err) {
			fmt.Printf("expect name:%s\n", expectFilename)
			status = false
			break
		}
	}
	if status { // 任务完成
		return
	}
}
```

第二种方式显然是更好的，不过实现上还有一些问题。我刚开始是使用两个map存放各个阶段的完成结果，超时处理则是直接过10s再查看是否完成任务，效率比较低。
```go
type Coordinator struct {
	// Your definitions here.
	tasks        chan RequestReply
	isDone       *int32		  
	mu           sync.Mutex   // 保护以下两个成员
	mapResult    map[int]bool // map阶段执行结果
	reduceResult map[int]bool // reduce阶段执行结果
}

func (c *Coordinator) Notify(args *NotifyArgs, reply *NotifyReply) error {
	c.mu.Lock()
	if args.Type == MapTask {
		c.mapResult[args.Index] = true
	} else {
		c.reduceResult[args.Index] = true
	}
	c.mu.Unlock()
	return nil
}

for {
	c.tasks <- RequestReply{Type: MapTask, Filename: filename, Index: index, Number: nReduce}
	time.Sleep(time.Second * 10)
	c.mu.Lock()
	_, ok := c.mapResult[index] // 获取任务执行情况
	c.mu.Unlock()
	if ok {
		break
	}
}
```
看了《Go语言并发之道》后，使用select实现超时处理，相关代码如下

```go
type Coordinator struct {
	// Your definitions here.
	taskChan         chan RequestTaskReply
	isDone           *int32
	mapNotifyChan    []chan struct{}
	reduceNotifyChan []chan struct{}
}

func (c *Coordinator) InformCompletion(args *InformCompletionArgs, reply *InformCompletionReply) error {
	go func() { // 使用协程避免worker阻塞在此（相同任务的RPC）
		if args.Type == MapTask {
			c.mapNotifyChan[args.Index] <- struct{}{}
		} else {
			c.reduceNotifyChan[args.Index] <- struct{}{}
		}
	}()
	return nil
}

wg.Add(nMap)
for i, file := range files {
	go func(index int, filename string) {
		defer wg.Done()
	loop:
		for {
			c.taskChan <- RequestTaskReply{Type: MapTask, Filename: filename, Index: index, Number: nReduce} // 发布任务
			select {
			case <-c.mapNotifyChan[index]: // 任务完成
				break loop // 跳出for循环
			case <-time.After(10 * time.Second): // 超时
			}
		}

	}(i, file)
}
```
当Coordinator完成所有任务后，可以发布一个假任务使worker退出循环，相关代码如下：

```go
// 关闭任务通道
close(c.taskChan)
// 设置完成标志
atomic.StoreInt32(c.isDone, 1)


func (c *Coordinator) RequestTask(args *RequestTaskArgs, reply *RequestTaskReply) error {
	task, ok := <-c.taskChan
	if !ok { // 通道被关闭
		reply.Type = KillTask
	} else {
		*reply = task
	}
	return nil
}

func Worker(mapf func(string, string) []KeyValue,
	reducef func(string, []string) string) {

	// Your worker implementation here.

	for {
		args := RequestTaskArgs{}
		reply := RequestTaskReply{}
		ok := call("Coordinator.RequestTask", &args, &reply)
		if !ok || reply.Type == KillTask { // 任务完成，工作进程退出
			break
		}
		if reply.Type == MapTask { // 执行map阶段
			doMap(reply.Filename, reply.Index, reply.Number, mapf)
		}
		if reply.Type == ReduceTask { // 执行reduce阶段
			doReduce(reply.Index, reply.Number, reducef)
		}
	}

}
```

## 参考代码
**coordinator.go**
```go
type Coordinator struct {
	// Your definitions here.
	taskChan         chan RequestTaskReply
	isDone           *int32
	mapNotifyChan    []chan struct{}
	reduceNotifyChan []chan struct{}
}

func (c *Coordinator) RequestTask(args *RequestTaskArgs, reply *RequestTaskReply) error {
	task, ok := <-c.taskChan
	if !ok { // 通道被关闭
		reply.Type = KillTask
	} else {
		*reply = task
	}
	return nil
}

func (c *Coordinator) InformCompletion(args *InformCompletionArgs, reply *InformCompletionReply) error {
	go func() { // 使用协程避免worker阻塞在此（相同任务的RPC）
		if args.Type == MapTask {
			c.mapNotifyChan[args.Index] <- struct{}{}
		} else {
			c.reduceNotifyChan[args.Index] <- struct{}{}
		}
	}()
	return nil
}

//
// start a thread that listens for RPCs from worker.go
//
func (c *Coordinator) server() {
	rpc.Register(c)
	rpc.HandleHTTP()
	//l, e := net.Listen("tcp", ":1234")
	sockname := coordinatorSock()
	os.Remove(sockname)
	l, e := net.Listen("unix", sockname)
	if e != nil {
		log.Fatal("listen error:", e)
	}
	go http.Serve(l, nil)
}

func (c *Coordinator) schedule(files []string, nReduce int) {
	nMap := len(files)
	var wg sync.WaitGroup
	// 执行map阶段
	wg.Add(nMap)
	for i, file := range files {
		go func(index int, filename string) {
			defer wg.Done()
		loop:
			for {
				c.taskChan <- RequestTaskReply{Type: MapTask, Filename: filename, Index: index, Number: nReduce} // 发布任务
				select {
				case <-c.mapNotifyChan[index]: // 任务完成
					break loop // 跳出for循环
				case <-time.After(10 * time.Second): // 超时
				}
			}

		}(i, file)
	}
	wg.Wait()
	// 执行reduce阶段
	wg.Add(nReduce)
	for i := 0; i < nReduce; i++ {
		go func(index int) {
			defer wg.Done()
		loop:
			for {
				c.taskChan <- RequestTaskReply{Type: ReduceTask, Index: index, Number: nMap} // 发布任务
				select {
				case <-c.reduceNotifyChan[index]: // 任务完成
					break loop // 跳出for循环
				case <-time.After(10 * time.Second): // 超时
				}
			}
		}(i)
	}
	wg.Wait()
	// 关闭任务通道
	close(c.taskChan)
	// 设置完成标志
	atomic.StoreInt32(c.isDone, 1)
}

//
// main/mrcoordinator.go calls Done() periodically to find out
// if the entire job has finished.
//
func (c *Coordinator) Done() bool {
	// Your code here.
	return atomic.LoadInt32(c.isDone) == 1
}

//
// create a Coordinator.
// main/mrcoordinator.go calls this function.
// nReduce is the number of reduce tasks to use.
//
func MakeCoordinator(files []string, nReduce int) *Coordinator {
	c := Coordinator{}
	// 类成员初始化
	c.taskChan = make(chan RequestTaskReply)
	c.isDone = new(int32)
	nMap := len(files)
	c.mapNotifyChan = make([]chan struct{}, nMap)
	c.reduceNotifyChan = make([]chan struct{}, nReduce)
	for i := 0; i < nMap; i++ {
		c.mapNotifyChan[i] = make(chan struct{})
	}
	for i := 0; i < nReduce; i++ {
		c.reduceNotifyChan[i] = make(chan struct{})
	}

	// Your code here.
	go c.schedule(files, nReduce)
	c.server()
	return &c
}
```
**rpc.go**
```go
type TaskType int

const (
	MapTask TaskType = iota
	ReduceTask
	KillTask
)

type RequestTaskArgs struct {
}

type RequestTaskReply struct {
	Type     TaskType // 任务类型
	Filename string   // 输入文件名（仅在map阶段使用）
	Index    int      // 任务序号
	Number   int      // 另一个阶段任务总数
}

type InformCompletionArgs struct {
	Type  TaskType // 任务类型
	Index int      // 任务序号
}

type InformCompletionReply struct {
}
```
**worker.go**

```go
func Worker(mapf func(string, string) []KeyValue,
	reducef func(string, []string) string) {

	// Your worker implementation here.

	for {
		args := RequestTaskArgs{}
		reply := RequestTaskReply{}
		ok := call("Coordinator.RequestTask", &args, &reply)
		if !ok || reply.Type == KillTask { // 任务完成，工作进程退出
			break
		}
		if reply.Type == MapTask { // 执行map阶段
			doMap(reply.Filename, reply.Index, reply.Number, mapf)
		}
		if reply.Type == ReduceTask { // 执行reduce阶段
			doReduce(reply.Index, reply.Number, reducef)
		}
	}

}

func doMap(
	filename string,
	index int,
	nReduce int,
	mapf func(string, string) []KeyValue,
) {
	// 读取输入文件内容
	file, err := os.Open(filename)
	if err != nil {
		log.Fatalf("doMap cannot open %v", filename)
	}
	content, err := ioutil.ReadAll(file)
	if err != nil {
		log.Fatalf("doMap cannot read %v", filename)
	}
	file.Close()
	// 执行map函数，存储中间结果
	intermediate := mapf(filename, string(content))

	// 生成nReduce个输入文件流
	files := make([]*os.File, nReduce)
	enc := make([]*json.Encoder, nReduce)
	for r := 0; r < nReduce; r++ {
		// 创建临时文件
		tmepfile, err := ioutil.TempFile(".", "tmp-*.txt")
		if err != nil {
			log.Fatalf("doMap Create temp file: %v", err)
			return
		}
		defer tmepfile.Close()
		files[r] = tmepfile
		enc[r] = json.NewEncoder(tmepfile)
	}
	// 将中间结果写入文件
	for _, kv := range intermediate {
		reduceID := ihash(kv.Key) % nReduce
		enc[reduceID].Encode(kv)
	}
	// 将各个临时文件重命名
	for r := 0; r < nReduce; r++ {
		filename := fmt.Sprintf("mr-%d-%d", index, r)
		os.Rename(files[r].Name(), filename)
	}
	// 告知master任务已完成
	args := InformCompletionArgs{Type: MapTask, Index: index}
	reply := InformCompletionReply{}
	call("Coordinator.InformCompletion", &args, &reply)
}
func doReduce(
	index int,
	nMap int,
	reducef func(string, []string) string,
) {
	// 读取中间文件数据，利用map数据结构实现key值相同的value聚合
	inputData := make(map[string][]string)
	for m := 0; m < nMap; m++ {
		filename := fmt.Sprintf("mr-%d-%d", m, index) // map阶段输出文件
		inputFileStream, err := os.Open(filename)
		if err != nil {
			log.Fatalf("doReduce open input file fail:%v", filename)
			return
		}
		dec := json.NewDecoder(inputFileStream)
		for {
			var kv KeyValue
			err = dec.Decode(&kv)
			if err != nil {
				break
			}
			inputData[kv.Key] = append(inputData[kv.Key], kv.Value)
		}
		inputFileStream.Close()
	}
	//创建输出文件
	fileStream, err := ioutil.TempFile(".", "tmp-*.txt")
	if err != nil {
		log.Fatalf("doReduce create tmpfile fail: %v", err)
		return
	}
	defer fileStream.Close()
	// 写入目标文件
	for k, v := range inputData {
		res := reducef(k, v)
		fmt.Fprintf(fileStream, "%v %v\n", k, res)
	}
	outFile := fmt.Sprintf("mr-out-%d", index)
	// 文件重命名
	os.Rename(fileStream.Name(), outFile)
	// 告知master任务已完成
	args := InformCompletionArgs{Type: ReduceTask, Index: index}
	reply := InformCompletionReply{}
	call("Coordinator.InformCompletion", &args, &reply)
}
```
## 通过截图
![](https://img-blog.csdnimg.cn/80e2f6e8c641431e8f169a7885bc59a7.png)

**知识：**

**plugin模式**
```bash
go build -race -buildmode=plugin ../mrapps/wc.go  # 将源文件编译成go插件
```
plugin 模式是 golang 1.8 才推出的一个特殊的构建方式，它将 package main 编译为一个 go 插件，并可在运行时动态加载。
```go
// 插件加载
func loadPlugin(filename string) (func(string, string) []mr.KeyValue, func(string, []string) string) {
	p, err := plugin.Open(filename)
	if err != nil {
		log.Fatalf("cannot load plugin %v", filename)
	}
	xmapf, err := p.Lookup("Map")
	if err != nil {
		log.Fatalf("cannot find Map in %v", filename)
	}
	mapf := xmapf.(func(string, string) []mr.KeyValue)
	xreducef, err := p.Lookup("Reduce")
	if err != nil {
		log.Fatalf("cannot find Reduce in %v", filename)
	}
	reducef := xreducef.(func(string, []string) string)

	return mapf, reducef
}
```
[Go 编译模式](https://www.cnblogs.com/bergus/articles/go-plugin.html)
**[[: not found**
test-mr.sh: 10: [[: not found
test-mr.sh: 38: TIMEOUT+= -k 2s 180s : not found

bash与sh是有区别的，两者是不同的命令，且bash是sh的增强版，，而"[[]]"是bash脚本中的命令，因此在执行时，使用sh命令会报错，将sh替换为bash命令即可。即使sh链接的是bash，仍然会开启posix模式，和普通的bash还是有区别。

[运行shell脚本时报错"\[\[ : not found"解决方法](https://www.cnblogs.com/han-1034683568/p/7211392.html)

**new与make**
Go提供了两种分配原语，即内建函数 new 和 make。 它们所做的事情不同，所应用的类型也不同。go中的new函数不会初始化内存，只会将**内存置零**。 也就是说，new(T) 会为类型为 T 的新项分配已置零的内存空间， 并返回它的地址，也就是一个类型为 *T 的值。用Go的术语来说，它返回一个指针， 该指针指向新分配的，类型为 T 的零值。
内建函数 make(T, args) 的目的不同于 new(T)。它只用于创建切片、映射和信道，并返回类型为 T（而非 *T）的一个**已初始化 （而非置零）** 的值。 出现这种用差异的原因在于，这三种类型本质上为引用数据类型，它们在使用前必须初始化。 例如，切片是一个具有三项内容的描述符，包含一个指向（数组内部）数据的指针、长度以及容量， 在这三项被初始化之前，该切片为 nil。对于切片、映射和信道，make 用于初始化其内部的数据结构并准备好将要使用的值。
