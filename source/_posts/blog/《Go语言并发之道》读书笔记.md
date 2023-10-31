---
title: 《Go语言并发之道》读书笔记
date: 2022-12-19 23:37:11
tags: golang 读书笔记
categories: 学习记录
index_img: https://img-blog.csdnimg.cn/72e6d9806af948718d356d0701efa18d.jpeg
---
<meta name="referrer" content="no-referrer" />



<mark>由于不怎么熟悉GO，只做简单的摘录，敲敲示例代码 </mark>
鸭子类型：当看到一只鸟走起来像鸭子、游泳起来像鸭子、叫起来也像鸭子，那么这只鸟就可以被称为鸭子。
[面试扣分点：什么是鸭子类型](https://cloud.tencent.com/developer/article/1849579)

[Go-FAQ 翻译 | Seeker](https://blog.mazhuang.vip/language/go/go-faq-247d2da13bbf/#:~:text=Go-FAQ%20%E7%BF%BB%E8%AF%91%201%20%E8%B5%B7%E6%BA%90%20%E8%AF%A5%E9%A1%B9%E7%9B%AE%E7%9A%84%E7%9B%AE%E7%9A%84%E6%98%AF%E4%BB%80%E4%B9%88%EF%BC%9F%20%E5%9C%A8%20Go%20%E8%AF%9E%E7%94%9F%E4%B9%8B%E6%97%B6%EF%BC%8C%E4%B9%9F%E5%B0%B1%E6%98%AF%E5%8D%81%E5%B9%B4%E5%89%8D%EF%BC%8C%E7%BC%96%E7%A8%8B%E4%B8%96%E7%95%8C%E4%B8%8E%E4%BB%8A%E5%A4%A9%E4%B8%8D%E5%90%8C%E3%80%82,Go%20%E7%A1%AE%E5%AE%9E%E6%9C%89%E4%B8%80%E4%B8%AA%E6%89%A9%E5%B1%95%E7%9A%84%E5%BA%93%EF%BC%8C%E7%A7%B0%E4%B8%BA%E8%BF%90%E8%A1%8C%E6%97%B6%EF%BC%8C%E5%AE%83%E6%98%AF%E6%AF%8F%E4%B8%AA%20Go%20%E7%A8%8B%E5%BA%8F%E7%9A%84%E4%B8%80%E9%83%A8%E5%88%86%E3%80%82%20%E8%BF%90%E8%A1%8C%E6%97%B6%E5%BA%93%E5%AE%9E%E7%8E%B0%E4%BA%86%20Go%20%E8%AF%AD%E8%A8%80%E7%9A%84%E5%9E%83%E5%9C%BE%E6%94%B6%E9%9B%86%E3%80%81%E5%B9%B6%E5%8F%91%E3%80%81%E5%A0%86%E6%A0%88%E7%AE%A1%E7%90%86%E5%92%8C%E5%85%B6%E4%BB%96%E5%85%B3%E9%94%AE%E7%89%B9%E6%80%A7%E3%80%82%20)
[Go interface & struct 接口与结构体](https://studygolang.com/articles/24232#:~:text=interface%20&%20struct%20%E6%8E%A5%E5%8F%A3%E4%B8%8E%E7%BB%93%E6%9E%84%E4%BD%93%20GO%20%E8%AF%AD%E8%A8%80%E7%9A%84%E5%9F%BA%E7%A1%80%E7%89%B9%E6%80%A7%20interface,%E5%8F%AF%E4%BB%A5%E7%90%86%E8%A7%A3%E4%B8%BA%E4%B8%80%E7%A7%8D%E7%B1%BB%E5%9E%8B%E7%9A%84%E8%A7%84%E8%8C%83%E6%88%96%E8%80%85%E7%BA%A6%E5%AE%9A%E3%80%82%20%E5%AE%83%E8%B7%9Fjava%EF%BC%8CC#%20%E4%B8%8D%E5%A4%AA%E4%B8%80%E6%A0%B7%EF%BC%8C%E4%B8%8D%E9%9C%80%E8%A6%81%E6%98%BE%E7%A4%BA%E8%AF%B4%E6%98%8E%E5%AE%9E%E7%8E%B0%E4%BA%86%E6%9F%90%E4%B8%AA%E6%8E%A5%E5%8F%A3%EF%BC%8C%E5%AE%83%E6%B2%A1%E6%9C%89%E7%BB%A7%E6%89%BF%E6%88%96%E5%AD%90%E7%B1%BB%E6%88%96%20implements%20%E5%85%B3%E9%94%AE%E5%AD%97%EF%BC%8C%E5%8F%AA%E6%98%AF%E9%80%9A%E8%BF%87%E7%BA%A6%E5%AE%9A%E7%9A%84%E5%BD%A2%E5%BC%8F%EF%BC%8C%E9%9A%90%E5%BC%8F%E7%9A%84%E5%AE%9E%E7%8E%B0%20interface%20%E4%B8%AD%E7%9A%84%E6%96%B9%E6%B3%95%E5%8D%B3%E5%8F%AF%E3%80%82)
[Go: break label与goto label的区别](https://blog.csdn.net/itbsl/article/details/73380537)
[Go语言interface详解](https://cloud.tencent.com/developer/article/1072536)
[go结构体和结构体指针的应用，该怎么选择？](https://www.zhihu.com/question/400373520)
[Go小知识：%v %+v %#v的区别](https://zhuanlan.zhihu.com/p/371738541)
[Go常见错误集锦之令人困惑的nil切片和空切片](https://zhuanlan.zhihu.com/p/419959268)
### 第一章： 并发概述
令人尴尬的并行问题：
>Many may wonder the etymology of the term “embarrassingly”. In this case, embarrassingly has nothing to do with embarrassment; in fact, it means an overabundance—here referring to parallelization problems which are “embarrassingly easy”.

[cpu并行算法和gpu并行_令人尴尬的并行算法介绍](https://blog.csdn.net/cumian8165/article/details/108153750)
[Web-Scale IT 我之见！](https://www.cnblogs.com/oneapm/p/5091133.html)

**竞争条件**
当两个或多个操作必须按正确的顺序执行，而程序并未保证这个顺序，就会发生竞争条件。
```go
// 循环执行示例程序，记录各个结果出现次数
func main() {
	var cnt [2]int
	for i := 0; i < 10000000; i++ {
		var data int
		go func() {
			data++
		}()
		if data == 0 {
			cnt[data]++
		}
	}
	fmt.Printf("cnt:%v", cnt)
}
// 执行三次
go run compete.go
cnt:[9999977 0]                                                                                                                                                          
cnt:[9999992 0]                                                                                                                                                           
cnt:[9999980 0]
```
在大多数情况下，引入数据竞争的原因是因为开发人员用顺序性的思维来思考问题。他们假设，某一行代码逻辑会在另一行代码逻辑之前先运行。我发现，有时候想象在两个操作之间会间隔很长一段时间是很有帮助的。
你应该始终以逻辑正确性为目标。在代码中引入休眠可以方便调试程序，但这并不能称之为一个解决方案。

**原子性**
当某些东西被认为是原子的，或者具有原子性的时候，这意味着在它运行的环境中，它是不可分割的或不可中断的。
在考虑原子性时，经常第一件需要做的事就是定义上下文或范围，然后再考虑这些操作是否是原子性的。一切都应当遵循这个原则。

**死锁**
死锁程序是所有并发进程彼此等待的程序。在这种情况下，如果没有外界的干预，这个程序将永远无法恢复。

**示例程序**
```go
type value struct {
	mu  sync.Mutex
	val int
}

func main() {
	var wg sync.WaitGroup
	// 获取锁后睡眠两秒再次获取另一个锁
	printSum := func(v1, v2 *value) {
		defer wg.Done()
		v1.mu.Lock()
		defer v1.mu.Unlock()
		time.Sleep(2 * time.Second)

		v2.mu.Lock()
		defer v2.mu.Unlock()
		fmt.Printf("sum=%v\n", v1.val+v2.val)
	}
	var a, b value
	wg.Add(2)
	go printSum(&a, &b)
	go printSum(&b, &a)
	wg.Wait()
}
```
运行输出
```go
fatal error: all goroutines are asleep - deadlock!

goroutine 1 [semacquire]:
sync.runtime_Semacquire(0xc0000a6018)
        /usr/lib/go-1.13/src/runtime/sema.go:56 +0x42
sync.(*WaitGroup).Wait(0xc0000a6010)
        /usr/lib/go-1.13/src/sync/waitgroup.go:130 +0x64
main.main()
        /root/mit6.824/6.824/src/expr/deadlock.go:30 +0x122

goroutine 18 [semacquire]:
sync.runtime_SemacquireMutex(0xc0000a6034, 0x1300, 0x1)
        /usr/lib/go-1.13/src/runtime/sema.go:71 +0x47
sync.(*Mutex).lockSlow(0xc0000a6030)
        /usr/lib/go-1.13/src/sync/mutex.go:138 +0xfc
sync.(*Mutex).Lock(...)
        /usr/lib/go-1.13/src/sync/mutex.go:81
main.main.func1(0xc0000a6020, 0xc0000a6030)
        /root/mit6.824/6.824/src/expr/deadlock.go:22 +0x1f4
created by main.main
        /root/mit6.824/6.824/src/expr/deadlock.go:28 +0xea

goroutine 19 [semacquire]:
sync.runtime_SemacquireMutex(0xc0000a6024, 0x1300, 0x1)
        /usr/lib/go-1.13/src/runtime/sema.go:71 +0x47
sync.(*Mutex).lockSlow(0xc0000a6020)
        /usr/lib/go-1.13/src/sync/mutex.go:138 +0xfc
sync.(*Mutex).Lock(...)
        /usr/lib/go-1.13/src/sync/mutex.go:81
main.main.func1(0xc0000a6030, 0xc0000a6020)
        /root/mit6.824/6.824/src/expr/deadlock.go:22 +0x1f4
created by main.main
        /root/mit6.824/6.824/src/expr/deadlock.go:29 +0x114
exit status 2
root@ubuntu ~/m/6/s/expr (master) [1]# go run deadlock.go 
fatal error: all goroutines are asleep - deadlock!

goroutine 1 [semacquire]:
sync.runtime_Semacquire(0xc0000a6018)
        /usr/lib/go-1.13/src/runtime/sema.go:56 +0x42
sync.(*WaitGroup).Wait(0xc0000a6010)
        /usr/lib/go-1.13/src/sync/waitgroup.go:130 +0x64
main.main()
        /root/mit6.824/6.824/src/expr/deadlock.go:30 +0x122

goroutine 18 [semacquire]:
sync.runtime_SemacquireMutex(0xc0000a6034, 0x1300, 0x1)
        /usr/lib/go-1.13/src/runtime/sema.go:71 +0x47
sync.(*Mutex).lockSlow(0xc0000a6030)
        /usr/lib/go-1.13/src/sync/mutex.go:138 +0xfc
sync.(*Mutex).Lock(...)
        /usr/lib/go-1.13/src/sync/mutex.go:81
main.main.func1(0xc0000a6020, 0xc0000a6030)
        /root/mit6.824/6.824/src/expr/deadlock.go:22 +0x1f4
created by main.main
        /root/mit6.824/6.824/src/expr/deadlock.go:28 +0xea

goroutine 19 [semacquire]:
sync.runtime_SemacquireMutex(0xc0000a6024, 0x1300, 0x1)
        /usr/lib/go-1.13/src/runtime/sema.go:71 +0x47
sync.(*Mutex).lockSlow(0xc0000a6020)
        /usr/lib/go-1.13/src/sync/mutex.go:138 +0xfc
sync.(*Mutex).Lock(...)
        /usr/lib/go-1.13/src/sync/mutex.go:81
main.main.func1(0xc0000a6030, 0xc0000a6020)
        /root/mit6.824/6.824/src/expr/deadlock.go:22 +0x1f4
created by main.main
        /root/mit6.824/6.824/src/expr/deadlock.go:29 +0x114
exit status 2
```

一个逻辑上“完美”的死锁将需要正确地同步。
Coffman死锁条件如下：
相互排斥
&emsp;并发进程同时拥有资源的独占性
等待条件
&emsp;并发进程必须同时拥有一个资源并等待额外的资源。
没有抢占
&emsp;并发进程拥有的资源只能被该进程释放即可满足这个条件
循环等待
&emsp;一个并发进程（P1）必须等待其余并发进程（P2），这些并发进程同时也在等待进程（P1）

**活锁**
活锁是正在主动执行并发操作的程序，但是这些操作无法向前推进程序的状态。

```go
func main() {
	cadence := sync.NewCond(&sync.Mutex{})
	go func() {
		for range time.Tick(1 * time.Millisecond) { // 定时发布广播
			cadence.Broadcast()
		}
	}()
	takeStep := func() {
		cadence.L.Lock()
		cadence.Wait() // 等待唤醒
		cadence.L.Unlock()
	}
	tryDir := func(dirName string, dir *int32, out *bytes.Buffer) bool {
		fmt.Fprintf(out, " %v", dirName)
		atomic.AddInt32(dir, 1)
		takeStep()
		if atomic.LoadInt32(dir) == 1 { // 只有一个进程选择该方向
			fmt.Fprintf(out, ".success!")
		}
		takeStep()
		atomic.AddInt32(dir, -1)
		return false
	}
	var left, right int32
	tryLeft := func(out *bytes.Buffer) bool {
		return tryDir("left", &left, out)
	}
	tryRight := func(out *bytes.Buffer) bool {
		return tryDir("right", &right, out)
	}
	walk := func(walking *sync.WaitGroup, name string) {
		var out bytes.Buffer
		defer walking.Done()
		defer func() { // 需放在Done后面保证一定输出
			fmt.Println(out.String())
		}()
		fmt.Fprintf(&out, "%v is try to scoot:", name)
		for i := 0; i < 5; i++ {
			if tryLeft(&out) || tryRight(&out) {
				return
			}
		}
		fmt.Fprintf(&out, "\n%v tosses her hands up in exasperation!", name)
	}
	var peopleInHallway sync.WaitGroup
	peopleInHallway.Add(2)
	go walk(&peopleInHallway, "Alice")
	go walk(&peopleInHallway, "Bob")
	peopleInHallway.Wait()
}

/*
Bob is try to scoot: left right left right left right left right left right
Bob tosses her hands up in exasperation!
Alice is try to scoot: left right left right left right left right left right
Alice tosses her hands up in exasperation!
*/
```
**饥饿**
饥饿是在任何情况下，并发进程都无法获得执行工作所需的所有资源。

```go
func main() {
	var wg sync.WaitGroup
	var sharedLock sync.Mutex
	const runtime = 1 * time.Second
	greedWorker := func() {
		defer wg.Done()
		var count int
		for begin := time.Now(); time.Since(begin) < runtime; {
			sharedLock.Lock()
			time.Sleep(3 * time.Nanosecond)
			sharedLock.Unlock()
			count++
		}
		fmt.Printf("Greedy worker was able to execute %v work loops\n", count)
	}
	politeWorker := func() {
		defer wg.Done()
		var count int
		for begin := time.Now(); time.Since(begin) < runtime; {
			sharedLock.Lock()
			time.Sleep(1 * time.Nanosecond)
			sharedLock.Unlock()

			sharedLock.Lock()
			time.Sleep(1 * time.Nanosecond)
			sharedLock.Unlock()

			sharedLock.Lock()
			time.Sleep(1 * time.Nanosecond)
			sharedLock.Unlock()
			count++
		}
		fmt.Printf("Polite worker was able to execute %v work loops\n", count)
	}
	wg.Add(2)
	go greedWorker()
	go politeWorker()
	wg.Wait()
}
/*
Greedy worker was able to execute 831906 work loops
Polite worker was able to execute 564963 work loops
*/
```

### 第二章：对你的代码建模：通信顺序进程
<mark>并发属于代码，并行属于一个运行中的程序</mark>

 1. 首先，我们并没有编写并行的代码，只有我们希望可以并行执行的并发代码。另外，并行是我们程序运行时的属性，而不是我们的代码。
 2. 其次，就是可能对我们所写的并发代码是否真的并行执行，保持不知情。这只有在我们的程序模型之下的抽象层实现：并发原语，程序的运行时，操作系统，操作系统所运行的平台（运行在hypervisor，容器和虚拟机时），以及最终的CPU，这些抽象给予我们区分并发与并行的能力，最终给了我们灵活而有力的表达。让我们回到这个问题本身。
 3. 第三个也是最后一个有意思的事情是并行是一个时间或者上下文的函数。

通常来说，一种语言会将它们的抽象链结束在系统线程和内存访问同步的层级。GO语言采用了一种不同的路线，并使用goroutine和channel来代替这些概念

**不要通过共享内存进行通信，而是通过通信来共享内存**
![](https://img-blog.csdnimg.cn/d5b1495dbe7e49608b9d3c8018afbf2d.png)
GO语言的并行性哲学可以这样总结：追求简洁，尽量使用channel，并且认为goroutine的使用是没有成本的。



### 第三章：GO语言并发组件
GO语言中的goroutine是独一无二的（尽管其他的一些语言有类似的并发原语）。它们不是OS线程，也不是绿色线程（由语言运行时管理的线程），它们是一个更高级别的抽象，称为协程。协程是一种非抢占式的简单并发子goroutine（函数，闭包或方法），也就是说，它们不能被中断。取而代之的是，协程有多个point，允许暂停或重新进入。

GO语言的主机托管机制是一个名为M：N调度器的实现，这意外这它将M个绿色线程映射到N个OS线程，然后将goroutine运行在绿色线程上。当我们的goroutine数量超过可用的绿色线程时，调度程序将处理分布在可用线程上的goroutine，并确保当这些goroutine阻塞时，其他的goroutine可以运行。
GO语言遵循一个称为fork-join的并发模型。fork这个词指的是在程序中的任意一个节点，可以将子节点与父节点同时运行。join这个词指的是，在将来某个时候，这些并发的执行分支将会合并在一起。joint point是保证程序正确性和消除竞争条件的关键。

```go
// 证明goroutine在它们所创建的相同地址空间内执行
func main() {
	var wg sync.WaitGroup
	str := "hello"
	wg.Add(1)
	go func() {
		defer wg.Done()
		str = "world"
	}()
	wg.Wait()
	fmt.Println(str)
}
// world
```
**空goroutine大小**
```go
func main() {
	memConsumed := func() uint64 {
		runtime.GC()
		var s runtime.MemStats
		runtime.ReadMemStats(&s)
		return s.Sys
	}
	var c <-chan interface{}
	var wg sync.WaitGroup
	noop := func() {
		wg.Done()
		<-c
	}
	const numGoroutines int = 1e5
	wg.Add(numGoroutines)
	before := memConsumed()
	for i := 0; i < numGoroutines; i++ {
		go noop()
	}
	wg.Wait()
	after := memConsumed()
	fmt.Printf("before：%vkb after：%vkb consume：%.3fkb", before/1000, after/1000, float64(after-before)/float64(numGoroutines)/1000)
}

// before：69994kb after：281516kb consume：2.115kb
```
**上下文切换时间**
```go
func BenchmarkContextSwitch(b *testing.B) {
	var wg sync.WaitGroup
	begin := make(chan struct{})
	c := make(chan struct{})

	var token struct{}
	sender := func() {
		defer wg.Done()
		<-begin
		for i := 0; i < b.N; i++ {
			c <- token
		}
	}
	receiver := func() {
		defer wg.Done()
		<-begin
		for i := 0; i < b.N; i++ {
			<-c
		}
	}
	wg.Add(2)
	go sender()
	go receiver()
	b.StartTimer()
	close(begin)
	wg.Wait()
}

```

```bash
go test -bench=. -cpu=1 bench_test.go
goos: linux
goarch: amd64
BenchmarkContextSwitch   8860370               157 ns/op
PASS
ok      command-line-arguments  1.534s
```

**sync包**
你可以将WaitGroup视为一个并发-安全的计数器：调用通过传入的整数执行Add方法增加计数器的增量，并调用Done方法对计数器进行递减，Wait方法阻塞，直到计数器为零。注意，Add调用是在它们帮助跟踪的goroutine之外完成的。

读写锁

```go
func main() {
	producer := func(wg *sync.WaitGroup, l sync.Locker) {
		defer wg.Done()
		for i := 5; i >= 0; i-- {
			l.Lock()
			l.Unlock()
			time.Sleep(1)
		}
	}
	observer := func(wg *sync.WaitGroup, l sync.Locker) {
		defer wg.Done()
		l.Lock()
		l.Unlock()
	}
	test := func(count int, mutex, rwMutex sync.Locker) time.Duration {
		var wg sync.WaitGroup
		wg.Add(count + 1)
		beginTestTime := time.Now()
		go producer(&wg, mutex)
		for i := count; i > 0; i-- {
			go observer(&wg, rwMutex)
		}
		wg.Wait()
		return time.Since(beginTestTime)
	}
	tw := tabwriter.NewWriter(os.Stdout, 0, 1, 2, ' ', 0)
	defer tw.Flush()

	var m sync.RWMutex
	fmt.Fprintf(tw, "Reader\tRWMutex\tMutex\n")
	for i := 0; i < 20; i++ {
		count := int(math.Pow(2, float64(i)))
		fmt.Fprintf(tw, "%d\t%v\t%v\n", count, test(count, &m, m.RLocker()), test(count, &m, &m))
	}
}
/*
Reader  RWMutex       Mutex
1       11.421µs      2.805µs
2       4.819µs       2.685µs
4       3.556µs       3.125µs
8       13.856µs      3.867µs
16      10.039µs      5.53µs
32      37.981µs      9.057µs
64      60.037µs      114.142µs
128     143.297µs     38.381µs
256     161.08µs      58.189µs
512     343.771µs     141.238µs
1024    474.765µs     727.275µs
2048    1.106501ms    987.48µs
4096    1.100992ms    1.41115ms
8192    2.010095ms    2.5819ms
16384   3.592384ms    4.176407ms
32768   8.957634ms    7.668959ms
65536   19.622861ms   14.164301ms
131072  31.256883ms   36.022752ms
262144  64.181958ms   59.230185ms
524288  120.306972ms  113.102032ms
*/
```
看不懂互斥锁与读写锁的时间对比是啥用意

**cond**：一个goroutine的集合点，等待或发布一个event。
注意，调用Wait不只是阻塞，它挂起了当前的goroutine，允许其他的goroutine在OS线程上运行。当你调用Wait时，会发生一些其他事情：进入Wait后，在Cond变量的Locker上调用Unlock方法；在退出Wait时，在Cond变量的Locker上执行Lock方法。

Signal示例
```go
func main() {
	c := sync.NewCond(&sync.Mutex{})
	queue := make([]interface{}, 0, 10)
	removeFromQueue := func(delay time.Duration) {
		time.Sleep(delay)
		c.L.Lock()
		queue = queue[:1]
		fmt.Println("removed from queue")
		c.L.Unlock()
		c.Signal()
	}
	for i := 0; i < 10; i++ {
		c.L.Lock()
		for len(queue) == 2 {
			c.Wait()
		}
		fmt.Println("add to queue")
		queue = append(queue, struct{}{})
		go removeFromQueue(1 * time.Second)
		c.L.Unlock()
	}
}
/*
add to queue
add to queue
removed from queue
add to queue
removed from queue
add to queue
removed from queue
add to queue
removed from queue
add to queue
removed from queue
add to queue
removed from queue
add to queue
removed from queue
add to queue
removed from queue
add to queue
*/
```
BroadCast示例

```go
type Button struct {
	Clicked *sync.Cond
}

func main() {
	button := Button{Clicked: sync.NewCond(&sync.Mutex{})}
	subscribe := func(c *sync.Cond, fn func()) {
		var wg sync.WaitGroup
		wg.Add(1)
		go func() {
			wg.Done()
			c.L.Lock()
			defer c.L.Unlock()
			c.Wait()
			fn()
		}()
		wg.Wait()
	}
	var clickRegister sync.WaitGroup
	clickRegister.Add(3)
	subscribe(button.Clicked, func() {
		fmt.Println("Maximizing")
		clickRegister.Done()
	})
	subscribe(button.Clicked, func() {
		fmt.Println("Display")
		clickRegister.Done()
	})
	subscribe(button.Clicked, func() {
		fmt.Println("Mouse")
		clickRegister.Done()
	})
	button.Clicked.Broadcast()
	clickRegister.Wait()
}
/*
Mouse
Maximizing
Display
*/
```

**once**
顾名思义，sync.Once是一种类型，它在内部使用一些sync原语，以确保即使在不同的goroutine上也只会调用一次Do方法传递进来的函数。
```bash
grep -ir sync.Once $(go env GOROOT)/src | wc -l
112
```

示例代码
```go
func main() {
	var count int
	increment := func() {
		count++
		fmt.Println("call increment function")
	}

	var once sync.Once
	var wg sync.WaitGroup
	wg.Add(100)
	for i := 0; i < 100; i++ {
		go func() {
			defer wg.Done()
			once.Do(increment)
		}()
	}
	wg.Wait()
	fmt.Printf("count is %d.\n", count)
}
/*
call increment function
count is 1.
*/
```
另一个示例代码
```go
func main() {
	var count int
	increment := func() {
		count++
	}
	decrement := func() {
		count--
	}
	var once sync.Once
	once.Do(increment)
	once.Do(decrement)
	fmt.Printf("count is %d\n", count)
}
/*
count is 1
*/
```
sync.Once只计算调用Do方法的次数，而不是多少次唯一调用Do方法。

**Pool**
sync.Pool是Pool模式的并发安全实现，在较高的层次上，Pool模式是一种创建和提供可供使用的固定数量实例或Pool实例的方法。它通常用于创建昂贵的场景（数据库连接），以便只创建固定数量的实例，但不确定数量的操作仍然可用请求访问这些场景（什么鬼翻译）。对于Go语言的sync.Pool，这种数据类型可以被多个goroutine安全地使用

示例1

```go
func main() {
	var numCalcsCreated int
	calcPool := &sync.Pool{New: func() interface{} {
		numCalcsCreated += 1
		mem := make([]byte, 1024)
		return &mem
	}}

	// 用4KB初始化pool
	calcPool.Put(calcPool.New())
	calcPool.Put(calcPool.New())
	calcPool.Put(calcPool.New())
	calcPool.Put(calcPool.New())

	const numWorkers = 1024 * 1024
	var wg sync.WaitGroup
	wg.Add(numWorkers)
	for i := numWorkers; i > 0; i-- {
		go func() {
			defer wg.Done()
			mem := calcPool.Get().(*[]byte) // 断言
			defer calcPool.Put(mem)
		}()
	}
	wg.Wait()
	fmt.Printf("%d calculators were created.\n", numCalcsCreated)
}
/*
8 calculators were created.
*/
```
示例代码2

```go
func connectToService() interface{} {
	time.Sleep(1 * time.Second)
	return struct{}{}
}

func startNetworkDaemon() *sync.WaitGroup { // 开启后台服务协程，监听8080端口
	var wg sync.WaitGroup
	wg.Add(1)
	go func() {
		server, err := net.Listen("tcp", "localhost:8080")
		if err != nil {
			log.Fatalf("cannot listen: %v", err)
		}
		defer server.Close()
		wg.Done()
		for {
			conn, err := server.Accept()
			if err != nil {
				log.Printf("cannot accept connection:%v", err)
			}
			connectToService()
			fmt.Fprintln(conn, "")
			conn.Close()
		}
	}()
	return &wg
}

func warmServiceConnCache() *sync.Pool { // 创建连接池
	p := &sync.Pool{
		New: connectToService,
	}
	for i := 0; i < 10; i++ { // 初始化连接池，放入10个连接
		p.Put(p.New())
	}
	return p
}

func startNetworkDaemonWithPool() *sync.WaitGroup { // 开启后台服务协程，监听8080端口，使用连接池
	var wg sync.WaitGroup
	wg.Add(1)
	go func() {
		connPool := warmServiceConnCache()
		server, err := net.Listen("tcp", "localhost:8080")
		if err != nil {
			log.Fatalf("cannot listen: %v", err)
		}
		defer server.Close()
		wg.Done()
		for {
			conn, err := server.Accept()
			if err != nil {
				log.Printf("cannot accept connection:%v", err)
			}
			svcConn := connPool.Get()
			fmt.Fprintln(conn, "")
			connPool.Put(svcConn)
			conn.Close()
		}
	}()
	return &wg
}

func init() {
	// daemonStarted := startNetworkDaemon()
	daemonStarted := startNetworkDaemonWithPool()
	daemonStarted.Wait()
}

func BenchmarkNetworkRequest(b *testing.B) {
	for i := 0; i < b.N; i++ {
		conn, err := net.Dial("tcp", "localhost:8080") // 客户端程序
		if err != nil {
			b.Fatalf("cannot dial host:%v", err)
		}
		if _, err := ioutil.ReadAll(conn); err != nil { // 一直读取直到文件末尾
			b.Fatalf("cannot read:%v", err)
		}
		conn.Close()
	}

}

/*
goos: linux
goarch: amd64
BenchmarkNetworkRequest-8             10        1001305398 ns/op
PASS
ok      command-line-arguments  11.023s


goos: linux
goarch: amd64
BenchmarkNetworkRequest-8          17644           1448938 ns/op
PASS
ok      command-line-arguments  60.237s
*/
```
当你使用Pool工作时，记住以下几点：

 1. 当实例化sync.Pool，使用new方法创建一个成员变量，在调用时是线程安全的   
 2. 当你收到一个来自Get的实例时，不要对所接收的对象的状态做出任何假设
 3. 当你用完了一个从Pool中取出的对象时，一定要调用Put，否则Pool就无法复用这个实例了。通常情况下这是由defer完成的
 4. Pool内的分布必须大致均匀         



**channel**   
单向channel使用
```go
	var recvChan <-chan interface{} // 只读
	var sendChan chan<- interface{} // 只写
	dataStream := make(chan interface{})

	recvChan = dataStream
	sendChan = dataStream
	go func() {
		sendChan <- 1
	}()
	num := <-recvChan
	fmt.Println(num)
}
```
关闭channel是一种同时给多个goroutine发送信号的方法。如果有n个goroutine在一个channel上等待，你可以直接关闭channel而不需要在channel上写n次。关闭channel可以和range结合使用，range会在通道关闭时自动中断循环。

```go
func main() {
	begin := make(chan interface{})
	var wg sync.WaitGroup
	wg.Add(5)
	for i := 0; i < 5; i++ {
		go func(i int) {
			defer wg.Done()
			<-begin // 在channel上等待
			fmt.Printf("%d has begun\n", i)
		}(i)
	}
	fmt.Println("Unblocking goroutines...")
	close(begin) // 关闭channel
	wg.Wait()
}
/*
Unblocking goroutines...
0 has begun
2 has begun
4 has begun
3 has begun
1 has begun
*/
```
缓冲channel
如果一个缓冲channel是空的，并且有一个下游接收，那么缓冲区将被忽略，该值直接从发送方传递到接收方。

```go
func main() {
	var stdoutBuffer bytes.Buffer
	defer stdoutBuffer.WriteTo(os.Stdout) // 最后输出结果

	inStream := make(chan int, 4)
	go func() {
		defer close(inStream) // 写入完成后关闭channel
		defer fmt.Fprintln(&stdoutBuffer, "Producer Done.")
		for i := 0; i < 5; i++ {
			fmt.Fprintf(&stdoutBuffer, "Send:%d\n", i)
			inStream <- i
		}
	}()

	for integer := range inStream { // 循环读取channel中的值，并在channel关闭后自动中断循环
		fmt.Fprintf(&stdoutBuffer, "Received %d\n", integer)
	}
}
/*
Send:0
Send:1
Send:2
Send:3
Send:4
Producer Done.
Received 0
Received 1
Received 2
Received 3
Received 4
*/
```
| 操作 | Channel状态 |   结果   |
| ---- | ----------- | ---- |
| **Read** | nil | 阻塞 |
|      | 打开且非空 | 输出值 |
|      | 打开且空 | 阻塞 |
|      | 关闭的 | <默认值>，false |
|      | 只写 | 编译错误 |
|      |  |  |
| **Write** | nil | 阻塞 |
|      | 打开且填满 | 阻塞 |
|      | 打开且不满 | 写入值 |
|      | 关闭的 | panic |
|      | 只读 | 编译错误 |
|      |  |  |
| **close** | nil | panic |
|      | 打开且非空 | 关闭channel，读取成功，直到通道耗尽，然后读取产生默认值 |
|      | 打开且空 | 关闭channel，读到默认值 |
|      | 关闭的 | panic |
|      |   只读        |   编译错误   |

单向channel声明是一种工具，它将允许我们区分channel的拥有者和channel的使用者：channel拥有者对channel（chane或chan<-）有一个写访问识图，而channel使用者只对channel有一个只读识图（<-chan）.
 
 channel所有者：
 1. 实例化channel
 2. 执行写操作，或将所有权传递给另一个goroutine
 3. 关闭channel
 4. 执行以上三件事，并通过一个只读channel将它们暴露出来
 
channel使用者：
 1. 知道channel是何时关闭的
 2. 正确的处理阻塞

```go
func main() {
	chanOwner := func() <-chan int { // 返回只读channel
		resultStream := make(chan int, 5)
		go func() {
			defer close(resultStream) // 写入完成后关闭channel
			for i := 0; i < 5; i++ {
				resultStream <- i
			}
		}()
		return resultStream
	}

	stream := chanOwner()
	for result := range stream { // 循环读取channel的值
		fmt.Printf("Received:%d\n", result)
	}
	fmt.Println("Done receiving")
}
```

select语句是将channel绑定在一起的粘合剂，是在一个程序中组合channel以形成更大的抽象事务的方式。如果说channel是将goroutine连接在一起的粘合剂，声明select语句则是一个具有并发性的Go语言程序中最重要的事情之一。除了连接组件之外，在程序的关键节点上，select语句可以帮助安全地将channel与诸如取消，超时，等待和默认值之类的概念结合在一起。
示例代码1
```go
func main() {
	start := time.Now()
	c := make(chan interface{})
	go func() {
		time.Sleep(5 * time.Second)
		close(c)
	}()
	fmt.Println("Blocking on read...")
	select {
	case <-c:
		fmt.Printf("Unblocked %v later.\n", time.Since(start))
	}
}
```
多个channel同时可用

```go
func main() {
	c1 := make(chan interface{})
	close(c1)
	c2 := make(chan interface{})
	close(c2)

	var c1Count, c2Count int
	for i := 10000; i > 0; i-- {
		select {
		case <-c1:
			c1Count++
		case <-c2:
			c2Count++
		}
	}
	fmt.Printf("c1:%d  c2:%d\n", c1Count, c2Count)
}
// c1:5029  c2:4971
```
Go语言运行时将一组case语句中执行伪随机选择。这意味着，在你的case语句集合中，每一个都有一个被执行的机会。

没有任何channel可用

```go
func main() {
	var c <-chan int
	select {
	case <-c:
	case <-time.After(1 * time.Second):
		fmt.Println("timeout")
	}
}
```
没有可用channel时，我们需要做什么？（默认语句）

```go
func main() {
	done := make(chan interface{})
	go func() {
		time.Sleep(5 * time.Second)
		close(done)
	}()

	workCounter := 0
loop:
	for {
		select {
		case <-done:
			break loop
		default: // 默认语句
		}
		workCounter++
		time.Sleep(1 * time.Second)
	}
	fmt.Printf("workCounter is %d\n", workCounter)
}
```
[Go: break label与goto label的区别](https://blog.csdn.net/itbsl/article/details/73380537)

GOMAXPROCS: 控制OS线程的数量将承载所谓的工作队列。

### 第四章：Go语言的并发模式
并发操作安全的方法：

 1. 用于共享内存的同步原语 （如sync.Mutex）
 2. 通过通信共享内存来进行同步（如channel）
 3. 不会发生改变的数据
 4. 约束（特殊约束与词法约束）
 
 特殊约束是指通过公约实现约束，即一种开发时约定，例如只通过A函数访问数据B，词法约束则涉及使用词法作用域公开用于多个并发进程的正确数据与并发原语，即仅给某个函数开放部分权限（只读通道，传递切片的不同子集等）

两种for select循环方式，我更喜欢第二种

```go
for {
	select {
	case <-done:
		return
	default:
	}
	// 进行非抢占任务
}

for {
	select {
	case <-done:
		return
	default:
		// 进行非抢占任务
	}
}
```
使用done通道防止goroutine泄漏
```go
func main() {
	doWork := func(done <-chan interface{}, strings <-chan string) <-chan interface{} {
		terminated := make(chan interface{})
		go func() {
			defer close(terminated)
			defer fmt.Println("doWork exited.")
			for {
				select {
				case s := <-strings:
					// 做一些实用操作
					fmt.Println(s)
				case <-done:
					return
				}
			}
		}()
		return terminated
	}
	done := make(chan interface{})
	terminated := doWork(done, nil)
	go func() { // 1s后取消操作
		time.Sleep(1 * time.Second)
		fmt.Println("Canceling doWork goroutine...")
		close(done)
	}()
	<-terminated
	fmt.Println("Done.")
}
```

or-channel将多个done channel整合成一个channel，实现或逻辑，即一个子表达式为真则整体表达式为真。
```go
func main() {
	var or func(channels ...<-chan interface{}) <-chan interface{} // 声明使得函数可以递归调用
	or = func(channels ...<-chan interface{}) <-chan interface{} {
		switch len(channels) {
		case 0: // 结束条件1
			return nil
		case 1: // 结束条件2
			return channels[0]
		}
		ordone := make(chan interface{})
		go func() {
			defer close(ordone)
			switch len(channels) {
			case 2: // 特殊情况
				select {
				case <-channels[0]:
				case <-channels[1]:
				}
			default: // 递归调用
				select {
				case <-channels[0]:
				case <-channels[1]:
				case <-channels[2]:
				case <-or(append(channels[3:], ordone)...):
				}
			}
		}()
		return ordone
	}
	sig := func(after time.Duration) <-chan interface{} {
		c := make(chan interface{})
		go func() {
			defer close(c)
			time.Sleep(after)
		}()
		return c
	}
	start := time.Now()
	<-or(sig(2*time.Hour), sig(2*time.Second), sig(2*time.Minute), sig(3*time.Second))
	fmt.Printf("done after %v", time.Since(start))
}

```
一个巧妙的结合管道的递归函数


错误处理：在构建从goroutine返回值时，应将错误视为一等公民。如果你的goroutine可能产生错误，那么这些错误应该与你的结果类型紧密结合，并且通过相同的通信线传递，就像常规的同步函数一样。


```go
type Result struct {
	Error    error
	Response *http.Response
}

func main() {
	checkStatus := func(done <-chan interface{}, urls ...string) <-chan Result {
		results := make(chan Result)
		go func() {
			defer close(results)
			for _, url := range urls {
				resp, err := http.Get(url)
				result := Result{Error: err, Response: resp}
				select {
				case <-done:
					return
				case results <- result:
				}
			}
		}()
		return results
	}
	done := make(chan interface{})
	defer close(done)

	errCount := 0
	urls := []string{"a", "https://blog.csdn.net/freedom1523646952", "b", "c", "d"}
	for result := range checkStatus(done, urls...) {
		if result.Error != nil {
			fmt.Printf("error:%v\n", result.Error)
			errCount++
			if errCount >= 3 {
				fmt.Println("too many errors.")
				break
			}
		} else {
			fmt.Printf("resp:%v\n", result.Response)
		}

	}
}
/*
error:Get "a": unsupported protocol scheme ""
resp:&{200 OK 200 HTTP/2.0 2 0 map[Cmsuser:[true] Content-Type:[text/html;charset=utf-8] Date:[Tue, 03 Jan 2023 16:00:28 GMT] Expires:[Thu, 01 Jan 1970 00:00:00 GMT] Server:[openresty] Set-Cookie:[uuid_tt_dd=10_17374296050-1672761628385-259886; Expires=Thu, 01 Jan 2025 00:00:00 GMT; Path=/; Domain=.csdn.net; dc_session_id=10_1672761628385.937028; Expires=Thu, 01 Jan 2025 00:00:00 GMT; Path=/; Domain=.csdn.net; csrfToken=HaQ7xEtrwz9UQ6dd9FhtXTfI; Path=/newProxyVersions] Vary:[Accept-Encoding Accept-Encoding] X-Content-Type-Options:[nosniff] X-Download-Options:[noopen] X-Readtime:[83] X-Response-Time:[81] X-Xss-Protection:[1; mode=block]] 0xc0004961b0 -1 [] false true map[] 0xc000158100 0xc00013c420}
error:Get "b": unsupported protocol scheme ""
error:Get "c": unsupported protocol scheme ""
too many errors.
*/
```
pipeline是一系列将数据输入，执行操作并将结果数据传回的系统，这些操作被称为是pipeline的一个stage。通过使用pipeline，可以分离每个stage的关注点，这样就可以相互独立地修改各个stage，混合搭配stage的组合方式而无需修改stage。
pipeline stage的属性：

 - 一个输入的参数与返回值类型相同的stage
 - 一个stage必须通过编程语言进行“实化”之后才能被当作参数四处传递，Go语言中的函数就是一种实化，并且很好得贴合需求。
 
 pipeline stage的处理类型：批处理——一次处理一大块数据  流处理——一次只接收和处理一个元素。
 
生成器：

```go
func main() {
	repeat := func(done <-chan interface{}, values ...interface{}) <-chan interface{} {
		valueStream := make(chan interface{})
		go func() {
			defer close(valueStream)
			for {
				for _, v := range values {
					select {
					case <-done:
						return
					case valueStream <- v:
					}
				}
			}
		}()
		return valueStream
	}
	take := func(done <-chan interface{}, valueStream <-chan interface{}, num int) <-chan interface{} {
		takeStream := make(chan interface{})
		go func() {
			defer close(takeStream)
			for i := 0; i < num; i++ {
				select {
				case <-done:
					return
				case takeStream <- <-valueStream: // 传递值而不是管道地址，书中代码有一些问题
				}
			}
		}()
		return takeStream
	}

	done := make(chan interface{})
	defer close(done)
	for num := range take(done, repeat(done, 1, 2, 3), 10) {
		fmt.Printf("%v ", num)
	}
}
// 1 2 3 1 2 3 1 2 3 1 
```

扇出是一个术语，用于描述启动多个goroutine以处理来自pipeline的输入的过程，而扇入是描述将多个结果组合到一个channel的过程

<mark>之后的年后再看，新年快乐</mark>
### 第五章：大规模并发
待更新
### 第六章：goroutine和Go语言运行时
待更新
