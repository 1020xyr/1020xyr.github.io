---
title: python中奇怪的符号 @   __xxx__ __xxx
date: 2019-10-05 17:53:29
tags: python @ 下划线
categories: 
---
<meta name="referrer" content="no-referrer" />


# @
python中的@即代表装饰器，为了书写简单故采用了@符号。
<mark>本质上是一个带有返回函数的高阶函数</mark>（记住这几个名词，看起来很专（zhuang）业（bi））
作用：在不改变原先函数的代码的情况下扩充函数的功能
![](https://img-blog.csdnimg.cn/20191005172436300.jpg)
**一个简单的例子**
```python
# test 1 注释掉@add后运行
def add(func):    # 接收一个函数作为参数，将原来函数的结果加1
    def wrapper(*args, **kw): 
        return func(*args, **kw) + 1
    return wrapper			# 返回函数wrapper


# @add   
def fun(a, b):
    return a + b


f = fun
print(f(1, 2))
print(f.__name__)

"""
结果
3
fun
"""
```
由于注释掉了@add，故变量  f 指向 函数fun （<mark>函数也是一种特殊的变量，所以才可以作为参数传递给另外的函数，或作为返回值返回</mark>） 结果即为 1+ 2 = 3，函数名字为fun  



<br/>
<br/>

```python
# test 2  加上@add后运行
def add(func):    # 接收一个函数作为参数，将原来函数的结果加1
    def wrapper(*args, **kw): 
        return func(*args, **kw) + 1
    return wrapper			# 返回函数wrapper


@add   
def fun(a, b):
    return a + b


f = fun
print(f(1, 2))
print(f.__name__)

"""
结果
4
wrapper
"""
```
此时 变量 f 虽然看上去指向了函数fun，但由f__name__可知 f 指向的其实是wrapper函数，即add函数的返回值 ， 故此时f（1,2）为1+2+1=4
<br/>
<br/>


```python
# test 3  装饰器的本质
def add(func):    # 接收一个函数作为参数，将原来函数的结果加1
    def wrapper(*args, **kw): 
        return func(*args, **kw) + 1
    return wrapper			# 返回函数wrapper



def fun(a, b):
    return a + b


f = fun
print(f(1, 2))
print(f.__name__)
f1 = add(fun)   
print(f1(1, 2))
print(f1.__name__)

"""
结果
3
fun
4
wrapper
"""
```
这个例子即用一种粗糙的方式实现了装饰器的功能，在这个例子中高阶函数即为add函数，返回函数即为wrapper函数


<br/>
另外，装饰器改变了函数的__name__属性（虽然我觉得没什么影响），有可能会影响到依赖函数签名的代码，故提供一种使原先函数的__name__属性不改变的方法（实际上是使得返回函数的__name__属性等于原先函数的__name__属性，即
wrapper.__name__ =  fun.__name__)

```python
# test 4  完善装饰器的功能
import functools  # 导入functools模块


def add(func):
    @functools.wraps(func)  # 另一个装饰器完成wrapper.__name__ =  fun.__name__功能
    def wrapper(*args, **kw):
        return func(*args, **kw) + 1
    return wrapper


@add
def fun(a, b):
    return a + b


f = fun
print(f(1, 2))
print(f.__name__)
"""
结果
4
fun
"""
# functools.wraps 函数源码如下
def wraps(wrapped,
          assigned = WRAPPER_ASSIGNMENTS,
          updated = WRAPPER_UPDATES):
    """Decorator factory to apply update_wrapper() to a wrapper function

       Returns a decorator that invokes update_wrapper() with the decorated
       function as the wrapper argument and the arguments to wraps() as the
       remaining arguments. Default arguments are as for update_wrapper().
       This is a convenience function to simplify applying partial() to
       update_wrapper().
    """
    return partial(update_wrapper, wrapped=wrapped,
                   assigned=assigned, updated=updated)

```
此时__name__属性等于原先的函数__name__
<br/>
<br/>
验证：在异步程序中经常使用@asyncio.coroutine将生成器标记为协程，asyncio.coroutine实际上也是一个函数
```python
# test 4  完善装饰器的功能
import functools  # 导入functools模块


async def init():   # async即为@asyncio.coroutine
    app = web.Application()
    app.router.add_route('GET', '/', index)
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, 'localhost', 9000)
    await site.start()
    logging.info('server started at http://127.0.0.1:9000...')
#asyncio中的coroutines.pyi文件	
from typing import Any, Callable, Generator, List, TypeVar

__all__: List[str]

_F = TypeVar('_F', bound=Callable[..., Any])

def coroutine(func: _F) -> _F: ...
def iscoroutinefunction(func: Callable[..., Any]) -> bool: ...
def iscoroutine(obj: Any) -> bool: ...


```

#   下划线
![](https://img-blog.csdnimg.cn/20191007211301967.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L2ZyZWVkb20xNTIzNjQ2OTUy,size_16,color_FFFFFF,t_70)

图片盗自: [
python中各种下划线的含义](https://blog.csdn.net/qq_14935437/article/details/82746257).
