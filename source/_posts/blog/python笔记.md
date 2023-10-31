---
title: python笔记
date: 2019-10-11 23:22:55
tags: 
categories: 
---
<meta name="referrer" content="no-referrer" />


#python语法
在python中方法名如果是__xxxx__()的，那么就有特殊的功能，因此叫做“魔法”方法
当使用print输出对象的时候，只要自己定义了__str__(self)方法，那么就会打印从在这个方法中return的数据
__str__方法需要返回一个字符串，当做这个对象的描写
2
person.age = 22
	# 访问器 - getter方法
    @property
    def age(self):
        return self._age

    # 修改器 - setter方法
    @age.setter
    def age(self, age):
        self._age = age

##模块
为了编写可维护的代码，我们把很多函数分组，分别放到不同的文件里，这样，每个文件包含的代码就相对较少，很多编程语言都采用这种组织代码的方式。在Python中，一个.py文件就称之为一个模块（Module）。

最大的好处是大大提高了代码的可维护性。其次，编写代码不必从零开始。当一个模块编写完毕，就可以被其他地方引用。我们在编写程序的时候，也经常引用其他模块，包括**Python内置的模块和来自第三方的模块**。

使用模块还可以避免函数名和变量名冲突。相同名字的函数和变量完全可以分别存在不同的模块中，因此，我们自己在编写模块时，不必考虑名字会与其他模块冲突。但是也要注意，尽量不要与**内置函数名字**冲突。  
每一个包目录下面都会有一个__init__.py的文件  

	#!/usr/bin/env python3 
	# -*- coding: utf-8 -*-

	' a test module '

	__author__ = 'Michael Liao'

	import sys

	def test():
    	args = sys.argv   # argv参数用列表存储命令行的所有参数
    	if len(args)==1:  # 当列表长度为1时即只有一个参数时
        	print('Hello, world!')
    	elif len(args)==2: # 当命令行有两个参数时
        	print('Hello, %s!' % args[1])
    	else:
        	print('Too many arguments!')

	if __name__=='__main__':
    	test()

第1行和第2行是标准注释，**第1行注释可以让这个hello.py文件直接在Unix/Linux/Mac上运行**，第2行注释表示**.py文件本身使用标准UTF-8编码**；

第4行是一个字符串，表示**模块的文档注释**，任何模块代码的第一个字符串都被视为模块的文档注释；

第6行使用__author__变量把作者写进去，这样当你公开源代码后别人就可以瞻仰你的大名；

以上就是Python模块的标准文件模板，当然也可以全部删掉不写，但是，按标准办事肯定没错。

后面开始就是真正的代码部分。
##__ 和 @
