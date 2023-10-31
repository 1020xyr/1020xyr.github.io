---
title: c++ 函数未设置返回值
date: 2022-05-14 10:32:02
tags: c++
categories: 踩坑日记
---
<meta name="referrer" content="no-referrer" />


```cpp
#include <iostream>

bool func(int i)
{
    if (i == 1)
    {
        return false;
    }
}

int main()
{
    bool res;
    printf("before: 0x%x\n", res);
    res = func(2);
    if (res == true)
    {
        std::cout << "true" << std::endl;
    }
    if (res == false)
    {
        std::cout << "false" << std::endl;
    }
    if (res)
    {
        std::cout << "Condition is true" << std::endl;
    }
    if (!res)
    {
        std::cout << "Condition is false" << std::endl;
    }
    printf("after: 0x%x\n", res);
}
```
以一个demo开始，很明显这个程序是错的，因为func函数未设置返回值，编译时也出现警告。
![](https://img-blog.csdnimg.cn/f98ebbc337594294bfe57efdcd39180b.png)
那么程序将输出什么呢？这才是令人奇怪的地方，我认为不设置返回值，不是false就是true，应该没有其他情况。而实际的程序输出如下：
![](https://img-blog.csdnimg.cn/d692918eda8a4c58bd10a6481658b43d.png)
运行几次的after结果都不一样，代表res是一个随机的值
以简化的c++代码生成汇编

```c
bool func(int i)
{
    if (i == 1)
    {
        return false;
    }
}

int main()
{
    bool res = func(2);
}
```

```c
	.file	"sample.cpp"
	.text
	.globl	_Z4funci
	.type	_Z4funci, @function
_Z4funci:
.LFB0:
	.cfi_startproc
	endbr64
	pushq	%rbp
	.cfi_def_cfa_offset 16
	.cfi_offset 6, -16
	movq	%rsp, %rbp
	.cfi_def_cfa_register 6
	movl	%edi, -4(%rbp)
	cmpl	$1, -4(%rbp)
	jne	.L2
	movl	$0, %eax
	jmp	.L1
.L2:
.L1:
	popq	%rbp
	.cfi_def_cfa 7, 8
	ret
	.cfi_endproc
.LFE0:
	.size	_Z4funci, .-_Z4funci
	.globl	main
	.type	main, @function
main:
.LFB1:
	.cfi_startproc
	endbr64
	pushq	%rbp
	.cfi_def_cfa_offset 16
	.cfi_offset 6, -16
	movq	%rsp, %rbp
	.cfi_def_cfa_register 6
	subq	$16, %rsp
	movl	$2, %edi
	call	_Z4funci
	movb	%al, -1(%rbp)
	movl	$0, %eax
	leave
	.cfi_def_cfa 7, 8
	ret
	.cfi_endproc
.LFE1:
	.size	main, .-main
	.ident	"GCC: (Ubuntu 9.4.0-1ubuntu1~20.04.1) 9.4.0"
	.section	.note.GNU-stack,"",@progbits
	.section	.note.gnu.property,"a"
	.align 8
	.long	 1f - 0f
	.long	 4f - 1f
	.long	 5
0:
	.string	 "GNU"
1:
	.align 8
	.long	 0xc0000002
	.long	 3f - 2f
2:
	.long	 0x3
3:
	.align 8
4:

```

参数 返回值与寄存器的对应关系如下
![](https://img-blog.csdnimg.cn/3fb10cf56b334ec68b5e60fe04b289a7.png)
截自《深入了解计算机系统》3.4访问信息
可以看出eax寄存器存储返回值，edi为第一个参数

```c
	movl	%edi, -4(%rbp)
	cmpl	$1, -4(%rbp)	// 将参数与1对比
	jne	.L2	
	movl	$0, %eax		// 相等则将返回值置为0
	jmp	.L1
.L2:
.L1:
	popq	%rbp
	.cfi_def_cfa 7, 8
	ret
	.cfi_endproc
```
所以说当函数返回值未设置时，eax寄存器的值是随机的，故bool值的变量出现了0xc的值。
