---
title: 廖雪峰python实战笔记 awesome-python3-webapp
date: 2019-10-03 17:43:26
tags: 廖雪峰python awesome webapp webapp
categories: 
---
<meta name="referrer" content="no-referrer" />


<mark>将持续更新.....</mark>
# app.py
```python
import logging; logging.basicConfig(level=logging.INFO) 
#logging.basicConfig(level=logging.INFO, filename='text.log')

import asyncio, os, json, time
from datetime import datetime
from aiohttp import web


def index(request):
    return web.Response(body=b"<h1>Awesome</h>", content_type='text/html')


async def init():
    app = web.Application()
    app.router.add_route('GET', '/', index)     
    # 方法为GET 且路径为/ 时执行回调函数index  即在网页中显示Awesome
    runner = web.AppRunner(app)
    await runner.setup()    
    site = web.TCPSite(runner, 'localhost', 9000)   //添加Host字段和part字段 
    await site.start()
    logging.info('server started at http://127.0.0.1:9000...')  
     #输出日志信息到控制台（可以设置输出到log文件中）
     #虽然init函数是用异步方式实现的，但只有一个协程(coroutine)在消息循环中，故实际上仍是顺序执行
    


loop = asyncio.get_event_loop() 
#从asyncio模块中直接获取一个EventLoop的引用
loop.run_until_complete(init())
#把需要执行的协程(coroutine)扔到EventLoop中执行，就实现了异步IO。
loop.run_forever()
```
![](https://img-blog.csdnimg.cn/2019100317360950.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L2ZyZWVkb20xNTIzNjQ2OTUy,size_16,color_FFFFFF,t_70)
![](https://img-blog.csdnimg.cn/201910031735223.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L2ZyZWVkb20xNTIzNjQ2OTUy,size_16,color_FFFFFF,t_70)
其请求报文与响应报文如上图所示 

# orm.py
```python
#!/usr/bin/env python3
# -*- coding: utf-8 -*-


import logging
import aiomysql
import asyncio


# 导入却未使用


def log(sql, args=()):
    logging.info('SQL: %s %s' % (sql, args))  # 打印sql语句与参数


# 打印原始的sql语句


async def create_pool(loop, **kw):  # 创建连接池
    logging.info('create database connection pool...')
    global __pool
    __pool = await aiomysql.create_pool(
        host=kw.get('host', 'localhost'),
        port=kw.get('port', 3306),
        user=kw['user'],
        password=kw['password'],
        db=kw['db'],
        charset=kw.get('charset', 'utf8'),
        autocommit=kw.get('autocommit', True),
        maxsize=kw.get('maxsize', 10),
        minsize=kw.get('minsize', 1),
        loop=loop
    )


# 创建全局连接池


async def select(sql, args, size=None):
    log(sql, args)  # 打印原始的sql语句
    global __pool
    with (await __pool) as conn:  # 尝试连接全局的连接池
        try:
            cur = await conn.cursor(aiomysql.DictCursor)  # 创建游标
            await cur.execute(sql.replace('?', '%s'), args or ())
            # %s 既是mysql的占位符,又是python str的占位符,所以先将sql语句里的占位符用?表示,当字符串组建完成后再来replace('?','%s'),这样就不冲突了
            if size:
                rs = await cur.fetchmany(size)  # 如果规定最多记录数
            else:
                rs = await cur.fetchall()
            await cur.close()
        except BaseException:
            raise
        logging.info('rows returned: %s' % len(rs))  # 在日志中返回记录行数
        return rs


# 传人select语句并执行


async def execute(sql, args, autocommit=True):
    log(sql, args)
    async with __pool.get() as conn:
        if not autocommit:
            await conn.begin()
        try:
            async with conn.cursor(aiomysql.DictCursor) as cur:
                await cur.execute(sql.replace('?', '%s'), args)
                affected = cur.rowcount
            if not autocommit:
                await conn.commit()
        except BaseException as e:
            if not autocommit:
                await conn.rollback()
            raise
        return affected


# 传人update insert delete语句并执行


def create_args_string(num):
    L = []
    for n in range(num):
        L.append('?')
    return ', '.join(L)


# 生成num个问号


class Field(object):
    # 创建与sql相对应的数据域

    def __init__(self, name, column_type, primary_key, default):
        self.name = name
        self.column_type = column_type
        self.primary_key = primary_key
        self.default = default

    # 父类数据域的初始化

    def __str__(self):
        return '<%s, %s:%s>' % (self.__class__.__name__, self.column_type, self.name)


# 重写__str__方法定制打印格式


class StringField(Field):

    def __init__(self, name=None, primary_key=False, default=None, ddl='varchar(100)'):
        super().__init__(name, ddl, primary_key, default)


# 字符数据


class BooleanField(Field):

    def __init__(self, name=None, default=False):
        super().__init__(name, 'boolean', False, default)


# 布尔数据


class IntegerField(Field):

    def __init__(self, name=None, primary_key=False, default=0):
        super().__init__(name, 'bigint', primary_key, default)


# 整数数据


class FloatField(Field):

    def __init__(self, name=None, primary_key=False, default=0.0):
        super().__init__(name, 'real', primary_key, default)


# 浮点数数据


class TextField(Field):

    def __init__(self, name=None, default=None):
        super().__init__(name, 'text', False, default)


# 文本数据


class ModelMetaclass(type):
    """ 实例sql语句
    create table S(
    SNO char(5) PRIMARY KEY,
    SNAME char(10),
    STATUS int,
    CITY char(10)
    );
    """

    def __new__(mcs, name, bases, attrs):
        if name == 'Model':
            return type.__new__(mcs, name, bases, attrs)
        tableName = attrs.get('__table__', None) or name  # tableName = S
        logging.info('found model: %s (table: %s)' % (name, tableName))
        mappings = dict()  # 字典类型
        fields = []
        primaryKey = None
        for k, v in attrs.items():
            if isinstance(v, Field):
                logging.info('  found mapping: %s ==> %s' % (k, v))
                mappings[k] = v
                if v.primary_key:
                    # 找到主键:
                    if primaryKey:
                        raise Exception('Duplicate primary key for field: %s' % k)
                    primaryKey = k
                else:
                    fields.append(k)
        if not primaryKey:
            raise Exception('Primary key not found.')
        for k in mappings.keys():
            attrs.pop(k)
        escaped_fields = list(map(lambda f: '`%s`' % f, fields))  # [`SNO`,`SNAME`,`STATUS`,`CITY`]
        attrs['__mappings__'] = mappings  # 保存属性和列的映射关系
        """
        {
        'SNO':xxx 
        'SNAME':xxx
        'STATUS':xxx
        'CITY':xxx
        }
        """
        attrs['__table__'] = tableName  # tableName = S
        attrs['__primary_key__'] = primaryKey  # 主键属性名 # primaryKey = 'SNO'
        attrs['__fields__'] = fields  # 除主键外的属性名 #['SNAME','STATUS','CITY']
        attrs['__select__'] = 'select `%s`, %s from `%s`' % (primaryKey, ', '.join(escaped_fields), tableName)
        #  'select `SNO`,`SNAME`,`STATUS`,`CITY` from `S`'
        attrs['__insert__'] = 'insert into `%s` (%s, `%s`) values (%s)' % (
        tableName, ', '.join(escaped_fields), primaryKey, create_args_string(len(escaped_fields) + 1))
        # 'insert into `S` ( `SNAME`,`STATUS`,`CITY`,`SNO`) values (?,?,?,?)'
        attrs['__update__'] = 'update `%s` set %s where `%s`=?' % (
        tableName, ', '.join(map(lambda f: '`%s`=?' % (mappings.get(f).name or f), fields)), primaryKey)
        #  'update `S` set `SNAME`=?,`STATUS`=?,`CITY`=? where `SNO`= ?'
        attrs['__delete__'] = 'delete from `%s` where `%s`=?' % (tableName, primaryKey)
        # 'delete from `S` where `SNO`=?'
        return type.__new__(mcs, name, bases, attrs)


# 构造元类 重写__new__方法 将类属性分类（例如主健 键值对等等）


class Model(dict, metaclass=ModelMetaclass):

    def __init__(self, **kw):
        super(Model, self).__init__(**kw)

    def __getattr__(self, key):  # 使用self.key 但key属性不存在在时调用该方法
        try:
            return self[key]
        except KeyError:
            raise AttributeError(r"'Model' object has no attribute '%s'" % key)

    # 使用self.key 但key属性不存在在时调用该方法

    def __setattr__(self, key, value):  # 使用self.key = value 调用该方法
        self[key] = value

    # 使用self.key = value 调用该方法

    def getValue(self, key):
        return getattr(self, key, None)

    def getValueOrDefault(self, key):
        value = getattr(self, key, None)
        if value is None:
            field = self.__mappings__[key]
            if field.default is not None:
                value = field.default() if callable(field.default) else field.default  # 取得属性默认值
                logging.debug('using default value for %s: %s' % (key, str(value)))
                setattr(self, key, value)
        return value

    # 获取key对应的值或者属性默认值

    #  实例语句 'select `SNO`,`SNAME`,`STATUS`,`CITY` from `S`' where 'SNO' = 1 order by SNO
    @classmethod
    async def findAll(cls, where=None, args=None, **kw):
        """ find objects by where clause. """
        sql = [cls.__select__]
        #  'select `SNO`,`SNAME`,`STATUS`,`CITY` from `S`'
        if where:  # 检查是否有where子语句
            sql.append('where')
            sql.append(where)
        if args is None:
            args = []
        orderBy = kw.get('orderBy', None)
        if orderBy:  # 检查是否有order by子语句
            sql.append('order by')
            sql.append(orderBy)
        limit = kw.get('limit', None)
        if limit is not None:  # 检查是否有limit
            sql.append('limit')
            if isinstance(limit, int):
                sql.append('?')
                args.append(limit)  # 传入整数参数
            elif isinstance(limit, tuple) and len(limit) == 2:
                sql.append('?, ?')
                args.extend(limit)  # 传入字典参数
            else:
                raise ValueError('Invalid limit value: %s' % str(limit))
        rs = await select(' '.join(sql), args)  # 执行sql语句并返回
        # cur.execute(sql.replace('?', '%s'), args or ())
        #  rs = await cur.fetchall() 如果未规定size
        return [cls(**r) for r in rs]  # cls 类继承dict 解析 r字典

    @classmethod
    async def findNumber(cls, selectField, where=None, args=None):
        """find number by select and where. """
        sql = ['select %s _num_ from `%s`' % (selectField, cls.__table__)]
        # select %s _num_ from S
        if where:
            sql.append('where')
            sql.append(where)
        rs = await select(' '.join(sql), args, 1)
        if len(rs) == 0:
            return None
        return rs[0]['_num_']

    @classmethod
    async def find(cls, pk):
        """ find object by primary key. """
        rs = await select('%s where `%s`=?' % (cls.__select__, cls.__primary_key__), [pk], 1)
        if len(rs) == 0:
            return None
        return cls(**rs[0])

    # 根据主健查询 借助先前的select函数

    async def save(self):
        args = list(map(self.getValueOrDefault, self.__fields__))
        args.append(self.getValueOrDefault(self.__primary_key__))
        rows = await execute(self.__insert__, args)
        if rows != 1:
            logging.warning('failed to insert record: affected rows: %s' % rows)

    # insert语句 借助先前的execute函数

    async def update(self):
        args = list(map(self.getValue, self.__fields__))
        args.append(self.getValue(self.__primary_key__))
        rows = await execute(self.__update__, args)
        if rows != 1:
            logging.warning('failed to update by primary key: affected rows: %s' % rows)

    # update语句 借助先前的execute函数

    async def remove(self):
        args = [self.getValue(self.__primary_key__)]
        rows = await execute(self.__delete__, args)
        if rows != 1:
            logging.warning('failed to remove by primary key: affected rows: %s' % rows)
# delete语句 借助先前的execute函数
```

