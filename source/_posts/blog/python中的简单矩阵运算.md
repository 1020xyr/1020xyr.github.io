---
title: python中的简单矩阵运算
date: 2020-02-23 17:57:43
tags: 
categories: 
---
<meta name="referrer" content="no-referrer" />




```python
import numpy as np
a = np.array([[1,2],[3,4]])
b = np.array([[5,6],[7,8]])

plus = a + b
minus = a - b

mul = a * b              # 点乘
real_mul = np.dot(a,b)   # 实际的矩阵乘法

a_t = a.T                # 转置矩阵
A = np.linalg.inv(a)     # 求矩阵的逆矩阵（非奇异矩阵）
I = np.dot(a,A)

num1 = np.linalg.matrix_rank(a)   # 求矩阵的秩
num2 = np.linalg.matrix_rank(b)
```

**输出**

```python
print(plus)
print(minus)

print(mul)
print(real_mul)

print(a_t)
print(A)
print(I)

print(num1)
print(num2)

'''
output:
[[ 6  8]
 [10 12]]
 
[[-4 -4]
 [-4 -4]]
 
[[ 5 12]
 [21 32]]
 
[[19 22]
 [43 50]]
 
[[1 3]
 [2 4]]
 
[[-2.   1. ]
 [ 1.5 -0.5]]
 
[[1.0000000e+00 0.0000000e+00]
 [8.8817842e-16 1.0000000e+00]]
 
2

2
'''
```

