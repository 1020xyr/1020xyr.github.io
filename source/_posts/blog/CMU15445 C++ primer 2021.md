---
title: CMU15445 C++ primer 2021
date: 2022-01-02 11:53:31
tags: c++ CMU15445 C++ primer
categories: 国外课程实验
---
<meta name="referrer" content="no-referrer" />


**cmu汇总博客：**[CMU15445 2021](https://www.jiasun.top/blog/CMU15445%202021.html)

[lab0地址](https://15445.courses.cs.cmu.edu/fall2021/project0/)



看完了《C++ primer》，拿这个项目练手，熟悉C++，一边看《Effective C++》和[Google 开源项目风格指南](https://google-styleguide.readthedocs.io/zh_CN/latest/)，一边写这个，加深印象。做第一个lab就遇到了一些问题。
test/primer/starter_test.cpp：测试代码
src/include/primer/p0_starter.h：实现代码
在实现完代码功能后，去掉测试代码中的DISABLED_前缀，进行测试。我一般都是一边看着测试代码，一边看测试输出，看看是代码哪块出了问题。测试成功之后使用以下命令调整代码格式。

```cpp
$ make format
$ make check-lint
$ make check-clang-tidy
```

### 源代码（仅做参考）
```cpp
#pragma once

#include <memory>
#include <stdexcept>
#include <vector>

#include "common/exception.h"
namespace bustub {

/**
 * The Matrix type defines a common
 * interface for matrix operations.
 */
template <typename T>
class Matrix {
 protected:
  /**
   * TODO(P0): Add implementation
   *
   * Construct a new Matrix instance.
   * @param rows The number of rows
   * @param cols The number of columns
   *
   */
  Matrix(int rows, int cols) : rows_(rows), cols_(cols) { linear_ = new T[rows * cols]; }

  /** The number of rows in the matrix */
  int rows_;
  /** The number of columns in the matrix */
  int cols_;

  /**
   * TODO(P0): Allocate the array in the constructor.
   * TODO(P0): Deallocate the array in the destructor.
   * A flattened array containing the elements of the matrix.
   */
  T *linear_;

 public:
  /** @return The number of rows in the matrix */
  virtual int GetRowCount() const = 0;

  /** @return The number of columns in the matrix */
  virtual int GetColumnCount() const = 0;

  /**
   * Get the (i,j)th matrix element.
   *
   * Throw OUT_OF_RANGE if either index is out of range.
   *
   * @param i The row index
   * @param j The column index
   * @return The (i,j)th matrix element
   * @throws OUT_OF_RANGE if either index is out of range
   */
  virtual T GetElement(int i, int j) const = 0;

  /**
   * Set the (i,j)th matrix element.
   *
   * Throw OUT_OF_RANGE if either index is out of range.
   *
   * @param i The row index
   * @param j The column index
   * @param val The value to insert
   * @throws OUT_OF_RANGE if either index is out of range
   */
  virtual void SetElement(int i, int j, T val) = 0;

  /**
   * Fill the elements of the matrix from `source`.
   *
   * Throw OUT_OF_RANGE in the event that `source`
   * does not contain the required number of elements.
   *
   * @param source The source container
   * @throws OUT_OF_RANGE if `source` is incorrect size
   */
  virtual void FillFrom(const std::vector<T> &source) = 0;

  /**
   * Destroy a matrix instance.
   * TODO(P0): Add implementation
   */
  virtual ~Matrix() { delete[] linear_; }
};

/**
 * The RowMatrix type is a concrete matrix implementation.
 * It implements the interface defined by the Matrix type.
 */
template <typename T>
class RowMatrix : public Matrix<T> {
 public:
  /**
   * TODO(P0): Add implementation
   *
   * Construct a new RowMatrix instance.
   * @param rows The number of rows
   * @param cols The number of columns
   */
  RowMatrix(int rows, int cols) : Matrix<T>(rows, cols) {
    data_ = new T *[rows];
    for (int i = 0; i < rows; i++) {
      data_[i] = Matrix<T>::linear_ + i * cols;
    }
  }

  /**
   * TODO(P0): Add implementation
   * @return The number of rows in the matrix
   */
  int GetRowCount() const override { return Matrix<T>::rows_; }

  /**
   * TODO(P0): Add implementation
   * @return The number of columns in the matrix
   */
  int GetColumnCount() const override { return Matrix<T>::cols_; }

  /**
   * TODO(P0): Add implementation
   *
   * Get the (i,j)th matrix element.
   *
   * Throw OUT_OF_RANGE if either index is out of range.
   *
   * @param i The row index
   * @param j The column index
   * @return The (i,j)th matrix element
   * @throws OUT_OF_RANGE if either index is out of range
   */
  T GetElement(int i, int j) const override {
    if (i < 0 || i >= Matrix<T>::rows_ || j < 0 || j >= Matrix<T>::cols_) {
      throw Exception(ExceptionType::OUT_OF_RANGE, "index is out of range");
    }
    return data_[i][j];
  }

  /**
   * Set the (i,j)th matrix element.
   *
   * Throw OUT_OF_RANGE if either index is out of range.
   *
   * @param i The row index
   * @param j The column index
   * @param val The value to insert
   * @throws OUT_OF_RANGE if either index is out of range
   */
  void SetElement(int i, int j, T val) override {
    if (i < 0 || i >= Matrix<T>::rows_ || j < 0 || j >= Matrix<T>::cols_) {
      throw Exception(ExceptionType::OUT_OF_RANGE, "index is out of range");
    }
    data_[i][j] = val;
  }

  /**
   * TODO(P0): Add implementation
   *
   * Fill the elements of the matrix from `source`.
   *
   * Throw OUT_OF_RANGE in the event that `source`
   * does not contain the required number of elements.
   *
   * @param source The source container
   * @throws OUT_OF_RANGE if `source` is incorrect size
   */
  void FillFrom(const std::vector<T> &source) override {
    int vector_size = static_cast<int>(source.size());
    if (vector_size != Matrix<T>::rows_ * Matrix<T>::cols_) {
      throw Exception(ExceptionType::OUT_OF_RANGE, "source is incorrect size");
    }
    for (int k = 0; k < vector_size; k++) {
      Matrix<T>::linear_[k] = source[k];
    }
  }

  /**
   * TODO(P0): Add implementation
   *
   * Destroy a RowMatrix instance.
   */
  ~RowMatrix() override { delete[] data_; };

 private:
  /**
   * A 2D array containing the elements of the matrix in row-major format.
   *
   * TODO(P0):
   * - Allocate the array of row pointers in the constructor.
   * - Use these pointers to point to corresponding elements of the `linear` array.
   * - Don't forget to deallocate the array in the destructor.
   */
  T **data_;
};

/**
 * The RowMatrixOperations class defines operations
 * that may be performed on instances of `RowMatrix`.
 */
template <typename T>
class RowMatrixOperations {
 public:
  /**
   * Compute (`matrixA` + `matrixB`) and return the result.
   * Return `nullptr` if dimensions mismatch for input matrices.
   * @param matrixA Input matrix
   * @param matrixB Input matrix
   * @return The result of matrix addition
   */
  static std::unique_ptr<RowMatrix<T>> Add(const RowMatrix<T> *matrixA, const RowMatrix<T> *matrixB) {
    // TODO(P0): Add implementation
    if (matrixA->GetRowCount() != matrixB->GetRowCount() || matrixA->GetColumnCount() != matrixB->GetColumnCount()) {
      return std::unique_ptr<RowMatrix<T>>(nullptr);
    }
    int rows = matrixA->GetRowCount();
    int cols = matrixA->GetColumnCount();
    T sum;
    auto mat_c = std::unique_ptr<RowMatrix<T>>(new RowMatrix<T>(rows, cols));
    for (int i = 0; i < rows; i++) {
      for (int j = 0; j < cols; j++) {
        sum = matrixA->GetElement(i, j) + matrixB->GetElement(i, j);
        mat_c->SetElement(i, j, sum);
      }
    }
    return mat_c;
  }

  /**
   * Compute the matrix multiplication (`matrixA` * `matrixB` and return the result.
   * Return `nullptr` if dimensions mismatch for input matrices.
   * @param matrixA Input matrix
   * @param matrixB Input matrix
   * @return The result of matrix multiplication
   */
  static std::unique_ptr<RowMatrix<T>> Multiply(const RowMatrix<T> *matrixA, const RowMatrix<T> *matrixB) {
    // TODO(P0): Add implementation
    // TODO(P0): Add implementation
    if (matrixA->GetColumnCount() != matrixB->GetRowCount()) {
      return std::unique_ptr<RowMatrix<T>>(nullptr);
    }
    int rows = matrixA->GetRowCount();
    int cols = matrixB->GetColumnCount();
    int k_size = matrixA->GetColumnCount();
    T sum;
    auto mat_c = std::unique_ptr<RowMatrix<T>>(new RowMatrix<T>(rows, cols));
    for (int i = 0; i < rows; i++) {
      for (int j = 0; j < cols; j++) {
        sum = 0;
        for (int k = 0; k < k_size; k++) {
          sum += matrixA->GetElement(i, k) * matrixB->GetElement(k, j);
        }
        mat_c->SetElement(i, j, sum);
      }
    }
    return mat_c;
  }

  /**
   * Simplified General Matrix Multiply operation. Compute (`matrixA` * `matrixB` + `matrixC`).
   * Return `nullptr` if dimensions mismatch for input matrices.
   * @param matrixA Input matrix
   * @param matrixB Input matrix
   * @param matrixC Input matrix
   * @return The result of general matrix multiply
   */
  static std::unique_ptr<RowMatrix<T>> GEMM(const RowMatrix<T> *matrixA, const RowMatrix<T> *matrixB,
                                            const RowMatrix<T> *matrixC) {
    // TODO(P0): Add implementation
    auto martrix_tmp = Multiply(matrixA, matrixB);
    if (martrix_tmp != nullptr) {
      return Add(martrix_tmp.get(), matrixC);
    }
    return std::unique_ptr<RowMatrix<T>>(nullptr);
  }
};
}  // namespace bustub


```
### 知识点
> #pragma once

#pragma once一般由编译器提供保证：同一个文件不会被包含多次。这里所说的”同一个文件”是指物理上的一个文件，而不是指内容相同的两个文件。无法对一个头文件中的一段代码作#pragma once声明，而只能针对文件。

> nullptr

```c
C语言中常数0和(void*)0都是空指针常量；C++中（暂且忽略C++11）常数0是，而(void*)0 不是
因为C语言中任何类型的指针都可以（隐式地）转换为void*型，反过来也行，而C++中void*型不能隐式地转换为别的类型指针
从字面上来讲，NULL是个空指针常量，我们可能会觉得：既然是个指针，那么应该调用#2。但事实上调用的却是#1，因为C++中NULL扩展为常数0，它是int型。
根本原因就是：常数0既是整数常量，也是空指针常量。
 
为了解决这种二义性，C++11标准引入了关键字nullptr，它作为一种空指针常量
```

[NULL、0、nullptr的区别](https://www.cnblogs.com/nothx/p/8523191.html)

> 模板类继承模板类 子类看不到父类成员

RowMatrix使用Matrix的成员变量需加上Matrix<T>::

C++的模板中的名称会进行两次查找，称为两阶段查找（two-phase lookup）。对于一个非依赖型名称（不以任何方式依赖于模板参数的名称），在模板声明进行解析的时候就会进行查找。但C++标准中规定（14.6.2 3），一个非受限的名称查找的时候将不会考虑依赖型的基类。所以
因为有偏特化，所以一个模板子类其实是不能在实例化之前就知道他的模板父类到底是谁，因此名字也无法resolve，所以只能this->了。不过VC++有个小扩展，允许你不使用this->就可以调用父类的名字，特别方便。由此可见，其实也是完全可以做到的。
Effective C++ 210页：因为base class templates有可能被特化，而那个特化版本可能不提供和一般性template相同的接口。因为编译器往往拒绝在模板化基类内寻找继承而来的名称。（好像仅仅解释了方法，没解释成员变量）

查找不到就会错误。解决办法是把它变成一个依赖型名称：
在x前加
1.this->或者Parent::
2.子类中添加using Parent::x;
[模板类继承模板类 子类看不到父类成员](https://blog.csdn.net/lonelyisland_syz/article/details/103517885)

### Gradescope注册使用
由于刚开始不知道咋注册Gradescope，就只通过了测试用例，做完了3个实验后才开始提交Gradescope。Gradescope的注册邀请码为4PR8G5，学校填Carnegie Mellon University就可以了。实际上这个在FAQ提到了，以前没看。
[CMU 15445 faq](https://15445.courses.cs.cmu.edu/fall2021/faq.html)
同时可以看看这个博客[blog](https://zhuanlan.zhihu.com/p/366484273)
另外加入[Discord Channel](https://discord.gg/YF7dMCg)看看别人问的问题等等。

提交后发现的问题：
GEMM函数里调用Add函数写成了ADD

语法风格问题：
1 条件语句中直接用布尔变量，不需要写布尔值
```cpp
if(ret==true)  -> if(ret)
```
实际上我觉得加上布尔值加强了可读性（软件工程）
2 即使if语句后只有一条语句，也需要用大括号括起来

3 注释后空格再加文字

```cpp
// comment
```

