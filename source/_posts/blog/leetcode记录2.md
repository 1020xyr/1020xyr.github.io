---
title: leetcode记录2
date: 2023-03-02 23:29:44
tags: leetcode 算法 数据结构
categories: 算法
---
<meta name="referrer" content="no-referrer" />


推荐博客
[五大常用算法：分治、动态规划、贪心、回溯和分支界定](https://blog.csdn.net/yake827/article/details/52119469)
<mark>刷题时注意边界条件/特殊条件的处理</mark>
[leetcode记录1](https://www.jiasun.top/blog/leetcode%E8%AE%B0%E5%BD%95.html)
## 树的子结构
输入两棵二叉树A和B，判断B是不是A的子结构。(约定空树不是任意一个树的子结构)

B是A的子结构， 即 A中有出现和B相同的结构和节点值。

**思路：** 由于是树相关的题目，故大致思路就是使用递归解决，也意识到需要借助辅助函数实现，但一直无法确定辅助函数的写法与用法。后面看到题解才知道咋写，记录在此。

[一篇文章带你吃透对称性递归(思路分析+解题模板+案例解读)](https://leetcode.cn/problems/shu-de-zi-jie-gou-lcof/solutions/791039/yi-pian-wen-zhang-dai-ni-chi-tou-dui-che-uhgs/)
```cpp
class Solution {
 public:
  bool hasSubStructure(TreeNode *A, TreeNode *B) {  // 从A根节点开始比对树结构
    if (B == nullptr) {                             // 空值默认匹配
      return true;
    }

    if (A == nullptr || A->val != B->val) {  // 值不匹配，判断失败
      return false;
    }

    return hasSubStructure(A->left, B->left) && hasSubStructure(A->right, B->right);
  }

  bool isSubStructure(TreeNode *A, TreeNode *B) {
    if (A == nullptr || B == nullptr) {  // 如果A或B为空树，则判断失败
      return false;
    }

    return hasSubStructure(A, B) || isSubStructure(A->left, B) || isSubStructure(A->right, B);  // 判断当前根节点是否符合条件，而后判断子节点是否符合条件
  }
};
```

## 前 K 个高频元素
给你一个整数数组 nums 和一个整数 k ，请你返回其中出现频率前 k 高的元素。你可以按 任意顺序 返回答案。

 **思路：** 使用哈希表统计出现次数，使用快排划分的方式找到出现频率最高的前k个元素
 

```cpp
class Solution {
 public:
  int partition(vector<pair<int, int>>& arr, int start, int end) {
    int p = arr[end].second;
    int slow = start - 1;
    for (int fast = start; fast < end; fast++) {
      if (arr[fast].second >= p) {  // 逆序排布
        slow++;
        swap(arr[slow], arr[fast]);
      }
    }
    slow++;
    swap(arr[slow], arr[end]);
    return slow;
  }
  void getTopK(vector<pair<int, int>>& arr, int start, int end, int k) {
    int index = partition(arr, start, end);
    if (index > k - 1) {
      getTopK(arr, start, index - 1, k);
    }
    if (index < k - 1) {
      getTopK(arr, index + 1, end, k);
    }
  }
  vector<int> topKFrequent(vector<int>& nums, int k) {
    map<int, int> cnt;
    for (int num : nums) {  // 记录各元素出现次数
      cnt[num]++;
    }
    vector<pair<int, int>> items(cnt.begin(), cnt.end());  // 填入vector中
    getTopK(items, 0, items.size() - 1, k);
    vector<int> ans;
    for (int i = 0; i < k; i++) {
      ans.emplace_back(items[i].first);
    }
    return ans;
  }
};
```

看了看题解，可以使用小顶堆（优先队列）的方式维持前k大的数据

```cpp
class Solution {
public:
    static bool cmp(pair<int, int>& m, pair<int, int>& n) {
        return m.second > n.second;
    }

    vector<int> topKFrequent(vector<int>& nums, int k) {
        unordered_map<int, int> occurrences;
        for (auto& v : nums) {
            occurrences[v]++;
        }

        // pair 的第一个元素代表数组的值，第二个元素代表了该值出现的次数
        priority_queue<pair<int, int>, vector<pair<int, int>>, decltype(&cmp)> q(cmp);
        for (auto& [num, count] : occurrences) {
            if (q.size() == k) {
                if (q.top().second < count) {
                    q.pop();
                    q.emplace(num, count);
                }
            } else {
                q.emplace(num, count);
            }
        }
        vector<int> ret;
        while (!q.empty()) {
            ret.emplace_back(q.top().first);
            q.pop();
        }
        return ret;
    }
};


```

## 二叉树的最近公共祖先
给定一个二叉树, 找到该树中两个指定节点的最近公共祖先。

百度百科中最近公共祖先的定义为：“对于有根树 T 的两个节点 p、q，最近公共祖先表示为一个节点 x，满足 x 是 p、q 的祖先且 x 的深度尽可能大（一个节点也可以是它自己的祖先）。”

 思路：
 我的思路是计算根节点到两节点的路径，然后取其公共的部分，由根节点执行公共路径，得到最近公共祖先

```cpp
class Solution {
 public:
  bool findNode(TreeNode* node, TreeNode* target, string& path) {  // path:由根节点到达目标节点的路径，逆序
    if (node == nullptr) {
      return false;
    }

    if (node == target) {
      return true;
    }

    if (findNode(node->left, target, path)) {
      path.push_back('l');
      return true;
    }

    if (findNode(node->right, target, path)) {
      path.push_back('r');
      return true;
    }
    return false;
  }
  TreeNode* lowestCommonAncestor(TreeNode* root, TreeNode* p, TreeNode* q) {
    string path1 = "";
    string path2 = "";
    findNode(root, p, path1);
    findNode(root, q, path2);
    int min_len = min(path1.length(), path2.length());
    // 反转路径
    reverse(path1.begin(), path1.end());
    reverse(path2.begin(), path2.end());
    // 找到第一个方向不同的位置
    int i;
    for (i = 0; i < min_len; i++) {
      if (path1[i] != path2[i]) {
        break;
      }
    }
    // 根据路径找到相应节点
    TreeNode* res = root;
    for (int j = 0; j < i; j++) {
      if (path1[j] == 'l') {
        res = res->left;
      } else {
        res = res->right;
      }
    }
    return res;
  }
};
```
官方题解的方法比较巧妙，但不怎么容易想到
![](https://img-blog.csdnimg.cn/71cbdd64cde7434897541ef3098eed59.png)

```cpp
class Solution {
 public:
  bool existTargetNode(TreeNode* root, TreeNode* p, TreeNode* q) {
    if (find_ancestor) {  // 已找到最近公共祖先，提前结束
      return false;
    }
    if (root == nullptr) {
      return false;
    }

    bool lres = existTargetNode(root->left, p, q);                       // 左子树是否存在p或q
    bool rres = existTargetNode(root->right, p, q);                      // 右子树是否存在p或q
    if ((lres && rres) || (root == p || root == q) && (lres || rres)) {  // 两子树分别有p和q或当前节点即为p,q，子树存在另一个
      find_ancestor = true;
      ans = root;
    }

    return root == p || root == q || lres || rres;  // 当前节点或子树存在p或q
  }

  TreeNode* lowestCommonAncestor(TreeNode* root, TreeNode* p, TreeNode* q) {
    ans = nullptr;
    find_ancestor = false;
    existTargetNode(root, p, q);
    return ans;
  }

 private:
  TreeNode* ans;
  bool find_ancestor;
};
```

## 岛屿数量
给你一个由 '1'（陆地）和 '0'（水）组成的的二维网格，请你计算网格中岛屿的数量。
岛屿总是被水包围，并且每座岛屿只能由水平方向和/或竖直方向上相邻的陆地连接形成。
此外，你可以假设该网格的四条边均被水包围。

**思路：**
刚开始我的思路就是使用dfs计算连通分量，但当时我只访问两个方向，因为我觉得这样可以省去一些遍历，但忘了这个就是通过计算dfs的调用次数来得到连通分量的
错误方法：
```cpp
/*
1 1 1
0 1 0
1 1 1
连通分量为1，但结果为2，错误
*/
class Solution {
 public:
  void dfs(vector<vector<char>>& grid, vector<vector<bool>>& visited, int x, int y) {
    visited[x][y] = true;
    // 只遍历两个方向
    if (x + 1 < grid.size() && grid[x + 1][y] == '1' && visited[x + 1][y] == false) {
      dfs(grid, visited, x + 1, y);
    }
    if (y + 1 < grid[0].size() && grid[x][y + 1] == '1' && visited[x][y + 1] == false) {
      dfs(grid, visited, x, y + 1);
    }
  }
  int numIslands(vector<vector<char>>& grid) {
    int m = grid.size();
    int n = grid[0].size();
    vector<vector<bool>> visited(m, vector<bool>(n, false));
    int ans = 0;
    for (int i = 0; i < m; i++) {
      for (int j = 0; j < n; j++) {
        if (grid[i][j] == '1' && visited[i][j] == false) {
          dfs(grid, visited, i, j);
          ans++;
        }
      }
    }
    return ans;
  }
};
```
正确方法：

```cpp
class Solution {
 public:
  void dfs(vector<vector<char>>& grid, vector<vector<bool>>& visited, int x, int y) {
    visited[x][y] = true;
    static const int dir[4][2] = {{0, 1}, {0, -1}, {1, 0}, {-1, 0}};
    for (int i = 0; i < 4; i++) {
      int nx = x + dir[i][0];
      int ny = y + dir[i][1];
      if (nx >= 0 && nx < grid.size() && ny >= 0 && ny < grid[0].size() && grid[nx][ny] == '1' && visited[nx][ny] == false) {  // 坐标合法，陆地，未被访问过
        dfs(grid, visited, nx, ny);
      }
    }
  }
  int numIslands(vector<vector<char>>& grid) {
    int m = grid.size();
    int n = grid[0].size();
    vector<vector<bool>> visited(m, vector<bool>(n, false));  // 是否访问过
    int ans = 0;                                              // 连通分量个数
    for (int i = 0; i < m; i++) {
      for (int j = 0; j < n; j++) {
        if (grid[i][j] == '1' && visited[i][j] == false) {
          dfs(grid, visited, i, j);
          ans++;
        }
      }
    }
    return ans;
  }
};
```

## 最长回文子串
给你一个字符串 s，找到 s 中最长的回文子串。
如果字符串的反序与原始字符串相同，则该字符串称为回文字符串。

**思路**
我的思路就是动态规划，两层遍历一遍即可
 $P(i,j) = P(i+1,j−1) ∧ (Si​==Sj)$
```cpp
#include <bits/stdc++.h>
using namespace std;
class Solution {
 public:
  string longestPalindrome(string s) {
    int len = s.length();
    vector<vector<bool>> dp(len, vector<bool>(len, true));
    int string_len = 1;
    int string_start = 0;
    for (int sub_len = 2; sub_len <= len; sub_len++) {                                           // 以长度为外层循环
      for (int start = 0; start <= len - sub_len; start++) {                                     // 以起始位置为内层循环
        if (s[start] == s[start + sub_len - 1] && dp[start + 1][start + sub_len - 2] == true) {  // 两侧字符相等且内侧字符串为回文字符串
          dp[start][start + sub_len - 1] = true;
          string_len = sub_len;
          string_start = start;
        } else {  /// 不为回文字符串
          dp[start][start + sub_len - 1] = false;
        }
      }
    }
    return s.substr(string_start, string_len);
  }
};
```
官方题解采用的是中心扩散的方式，由一个字符或两个字符向两边扩散
```cpp
class Solution {
 public:
  pair<int, int> expandBound(const string& s, int start, int end) {  // 返回字符串开始位置与长度
    while (s[start] == s[end]) {                                     // 字符相等，持续向两边扩散
      start--;
      end++;
    }
    return {start + 1, end - start - 1};
  }
  string longestPalindrome(string s) {
    s = "+" + s + "-";  // 添加范围之外的字符，省去边界检查
    int string_start = 0;
    int string_len = 0;
    for (int i = 1; i < s.length() - 1; i++) {
      auto [start1, len1] = expandBound(s, i, i);
      auto [start2, len2] = expandBound(s, i, i + 1);
      if (len1 > string_len) {
        string_start = start1;
        string_len = len1;
      }
      if (len2 > string_len) {
        string_start = start2;
        string_len = len2;
      }
    }
    return s.substr(string_start, string_len);
  }
};
```

## 二叉树的层序遍历
给你二叉树的根节点 root ，返回其节点值的 层序遍历 。 （即逐层地，从左到右访问所有节点）。

**思路**
使用队列实现层序遍历，我的实现是为节点添加层级信息，用于区分各层节点

```cpp
class Solution {
 public:
  using Node = pair<TreeNode *, int>;
  vector<vector<int>> levelOrder(TreeNode *root) {
    if (root == nullptr) {
      return {};
    }
    vector<vector<int>> ans;
    queue<Node> qu;
    int curr_level = -1;
    qu.emplace(root, 0);
    while (!qu.empty()) {
      auto [node, level] = qu.front();
      qu.pop();

      if (curr_level != level) {  // 当前层的第一个节点，创建一个新vector
        ans.emplace_back(vector<int>{node->val});
        curr_level = level;
      } else {
        ans[level].emplace_back(node->val);
      }

      // 添加左子节点与右子节点
      if (node->left != nullptr) {
        qu.emplace(node->left, level + 1);
      }
      if (node->right != nullptr) {
        qu.emplace(node->right, level + 1);
      }
    }
    return ans;
  }
};
```
官方题解直接按层级对节点进行操作，更加简洁一点

```cpp
class Solution {
 public:
  vector<vector<int>> levelOrder(TreeNode *root) {
    if (root == nullptr) {
      return {};
    }
    vector<vector<int>> ans;
    queue<TreeNode *> qu;
    int curr_level = -1;
    qu.emplace(root);
    while (!qu.empty()) {
      ans.emplace_back(vector<int>{});
      int level_size = qu.size();  // 当前层的节点数
      for (int i = 0; i < level_size; i++) {
        TreeNode *node = qu.front();
        qu.pop();
        ans.back().emplace_back(node->val);
        // 加入子节点
        if (node->left != nullptr) {
          qu.emplace(node->left);
        }
        if (node->right != nullptr) {
          qu.emplace(node->right);
        }
      }
    }
    return ans;
  }
};
```

## 最长公共子序列
给定两个字符串 text1 和 text2，返回这两个字符串的最长 公共子序列 的长度。如果不存在 公共子序列 ，返回 0 。

一个字符串的 子序列 是指这样一个新的字符串：它是由原字符串在不改变字符的相对顺序的情况下删除某些字符（也可以不删除任何字符）后组成的新字符串。

例如，"ace" 是 "abcde" 的子序列，但 "aec" 不是 "abcde" 的子序列。
两个字符串的 公共子序列 是这两个字符串所共同拥有的子序列。

**思路**
经典的动态规划问题

```cpp
#include <bits/stdc++.h>
using namespace std;
class Solution {
 public:
  int longestCommonSubsequence(string text1, string text2) {
    int len1 = text1.length();
    int len2 = text2.length();
    vector<vector<int>> dp(len1 + 1, vector<int>(len2 + 1));
    for (int i = 1; i <= len1; i++) {
      for (int j = 1; j <= len2; j++) {
        int max_len = 0;
        if (text1[i - 1] == text2[j - 1]) {  // s1=s2，多一种状态转移可能
          max_len = dp[i - 1][j - 1] + 1;
        }
        dp[i][j] = max({max_len, dp[i - 1][j], dp[i][j - 1]});  // 可由dp[i-1][j]  dp[i][j-1]得来
      }
    }
    return dp[len1][len2];
  }
};
```

## K 个一组翻转链表
给你链表的头节点 head ，每 k 个节点一组进行翻转，请你返回修改后的链表。
k 是一个正整数，它的值小于或等于链表的长度。如果节点总数不是 k 的整数倍，那么请将最后剩余的节点保持原有顺序。
你不能只是单纯的改变节点内部的值，而是需要实际进行节点交换。

**思路**
虽然指针操作有点复杂，但对着样例调整指针操作也不是很难，使用虚拟头节点避免对头部节点的特殊处理

```cpp
#include <bits/stdc++.h>
using namespace std;
struct ListNode {
  int val;
  ListNode* next;
  ListNode() : val(0), next(nullptr) {}
  ListNode(int x) : val(x), next(nullptr) {}
  ListNode(int x, ListNode* next) : val(x), next(next) {}
};
class Solution {
 public:
  ListNode* reverseKGroup(ListNode* head, int k) {
    if (k == 1) {  // k=1不用翻转
      return head;
    }
    ListNode virt_head(-1, head);
    ListNode* prev_node = &virt_head;  // 指向各组前一个节点
    ListNode* next_node = head;        // 指向各组后一个节点
    while (true) {
      for (int i = 0; i < k; i++) {  // 找到下一个组的后一个节点
        if (next_node == nullptr) {
          return virt_head.next;
        }
        next_node = next_node->next;
      }

      ListNode* prev = prev_node->next;        // 该组第一个节点
      ListNode* curr = prev_node->next->next;  // 该组第二个节点
      ListNode* next;
      for (int i = 0; i < k - 1; i++) {
        next = curr->next;
        curr->next = prev;
        prev = curr;
        curr = next;
      }
      // prev为该组最后一个节点 curr next为下一组的第一个节点
      prev_node->next->next = next;  // 第一个节点的next指向下一组的第一个节点
      ListNode* tmp = prev_node->next;
      prev_node->next = prev;  // 上一组的最后一个节点指向该组最后一个节点
      prev_node = tmp;         // 更新组前一个节点
    }
    return virt_head.next;
  }
};
```

 


## 子集
给你一个整数数组 nums ，数组中的元素 互不相同 。返回该数组所有可能的子集（幂集）。
解集 不能 包含重复的子集。你可以按 任意顺序 返回解集。

**思路**
以0-2^n^-1的数字表示各个元素选择情况，n为数组长度，数字对应位为1则选择该位置元素

```cpp
#include <bits/stdc++.h>
using namespace std;
class Solution {
 public:
  vector<vector<int>> subsets(vector<int>& nums) {
    vector<vector<int>> ans;
    int length = nums.size();
    for (int i = 0; i < 1 << length; i++) { 
      vector<int> tmp;
      for (int j = 0; j < length; j++) {
        if ((i & (1 << j)) != 0) {  // 数字相应位为1则选取对应位置数字
          tmp.emplace_back(nums[j]);
        }
      }
      ans.emplace_back(tmp);
    }
    return ans;
  }
};
```

## 外观数列
给定一个正整数 n ，输出外观数列的第 n 项。
「外观数列」是一个整数序列，从数字 1 开始，序列中的每一项都是对前一项的描述。

**思路**
比较简单，依次遍历模拟即可
```cpp
#include <bits/stdc++.h>
using namespace std;
class Solution {
 public:
  string countAndSay(int n) {
    string ans = "1";
    for (int i = 1; i < n; i++) {
      string tmp;
      ans.push_back('\0');
      char last_char = '\0';
      int times = 0;
      for (char c : ans) {
        if (last_char == '\0') {  // 第一个字符
          last_char = c;
          times = 1;
        } else if (c == last_char) {  // 字符相等，次数加一
          times++;
        } else {  // 不同的字符，编码至结果
          tmp.append(to_string(times));
          tmp.push_back(last_char);
          last_char = c;
          times = 1;
        }
      }
      ans = move(tmp);
    }
    return ans;
  }
};
```

## 合并区间
以数组 intervals 表示若干个区间的集合，其中单个区间为 intervals[i] = [starti, endi] 。请你合并所有重叠的区间，并返回 一个不重叠的区间数组，该数组需恰好覆盖输入中的所有区间 。

**思路**
我的思路是将起点终点都放到数组中进行比较，记录当前经过的起点与终点数，若相等则将区间起点与终点加入结果集合，实现上起点附加值设为-1，终点附加值设为1，保证附加值为0时起点数与终点数相等，且起点与终点值相同时，起点在终点前面。

```cpp
#include <bits/stdc++.h>
using namespace std;
class Solution {
 public:
  using Node = pair<int, int>;
  vector<vector<int>> merge(vector<vector<int>>& intervals) {
    vector<Node> numbers;
    for (auto& vec : intervals) {
      numbers.emplace_back(vec[0], -1);  // 起点-1小于终点1，使用pair默认比较函数，使得相同值的起点在终点前
      numbers.emplace_back(vec[1], 1);
    }
    sort(numbers.begin(), numbers.end());
    vector<vector<int>> ans;
    int start = -1;
    int cnt = 0;
    for (auto& node : numbers) {
      if (cnt == 0) {  // 记录区间起点
        start = node.first;
      }
      cnt += node.second;
      if (cnt == 0) {  // 区间起点终点成对出现，记录区间起始
        ans.emplace_back(vector<int>{start, node.first});
      }
    }
    return ans;
  }
};
```
官方题解的思路更容易理解一点，按起点排序，持续扩大终点边界

```cpp
#include <bits/stdc++.h>
using namespace std;
class Solution {
 public:
  vector<vector<int>> merge(vector<vector<int>>& intervals) {
    vector<vector<int>> ans;
    auto cmp = [](const vector<int>& v1, const vector<int>& v2) -> bool { return v1[0] < v2[0]; };  // 自定义比较函数
    sort(intervals.begin(), intervals.end(), cmp);
    ans.emplace_back(intervals[0]);
    for (int i = 1; i < intervals.size(); i++) {
      auto& last = ans.back();
      if (intervals[i][0] > last[1]) {  // 起点大于区间终点，加入区间
        ans.emplace_back(intervals[i]);
      } else {  // 更新区间终点
        last[1] = max(last[1], intervals[i][1]);
      }
    }
    return ans;
  }
};
```

## 括号生成
数字 n 代表生成括号的对数，请你设计一个函数，用于能够生成所有可能的并且 有效的 括号组合。

**思路**
刚开始我的思路是计算出n-1的所有括号对数，然后在前后各加一次括号，在两边加一次括号
```c
f1: ()
f2: f1 + ()  () + f1  ( + f1 + )
```
但发现n=4的时候结果就出错了，比对一下发现(())(())没有在结果集合中，f4不能全部由f3推导而来，也可以从f2+f2推导而来。
故换一种思路，枚举fi+fn-i，最后加上( + fn-1 + )

```cpp
#include <bits/stdc++.h>
using namespace std;
class Solution {
 public:
  vector<string> generateParenthesis(int n) {
    vector<vector<string>> ans(n + 1);
    ans[1].emplace_back("()");
    for (int i = 2; i <= n; i++) {
      unordered_set<string> tmp;        // 使用set去重
      for (string& str : ans[i - 1]) {  // 可能情况1：两边加括号
        tmp.emplace("(" + str + ")");
      }
      for (int j = 1; j < i; j++) {  // 可能情况2： 由不同个数的有效括号组合而来
        for (string& str1 : ans[j]) {
          for (string& str2 : ans[i - j]) {
            tmp.emplace(str1 + str2);
          }
        }
      }
      ans[i] = vector<string>(tmp.begin(), tmp.end());
    }
    return ans[n];
  }
};

/*
// 错误思路：反例：f4并非全部由f3得来  忽略了2+2 (())(())
class Solution {
public:
    vector<string> generateParenthesis(int n) {
        vector<vector<string>> ans(n);
        ans[0].emplace_back("()");
        for(int i=1;i<n;i++){
            for(string& str:ans[i-1]){
                ans[i].emplace_back(str+"()");
                ans[i].emplace_back("()"+str);
                ans[i].emplace_back("("+str+")");
            }
        }
        unordered_set<string> se(ans[n-1].begin(),ans[n-1].end());
        return vector<string>(se.begin(),se.end());
    }
};
*/
```

## 删除链表的倒数第 N 个结点
给你一个链表，删除链表的倒数第 n 个结点，并且返回链表的头结点。

**思路**
链表中非常常见的两个思路：**虚拟头节点与双指针**
虚拟头节点一般用来避免对头节点的特殊处理，双指针利用指针的行进速度，位置关系巧妙地解决问题
```cpp
class Solution {
 public:
  ListNode* removeNthFromEnd(ListNode* head, int n) {
    ListNode virt_head(-1, head);
    ListNode* slow = &virt_head;
    ListNode* fast = &virt_head;
    // 相当于访问倒数n+1个节点
    for (int i = 0; i < n + 1; i++) {  // fast比slow快n+1步
      fast = fast->next;
    }
    while (fast != nullptr) {
      slow = slow->next;
      fast = fast->next;
    }
    slow->next = slow->next->next;  // 删除倒数第n个节点
    return virt_head.next;          // 返回头节点
  }
};
```

## 基数排序

[十大排序算法(背诵版+动图)](https://leetcode.cn/circle/article/0akb5U/)
[排序（基数排序   牛客网提交地址）](https://www.nowcoder.com/questionTerminal/96c0717e2ed849219748796956291a22)
![](https://img-blog.csdnimg.cn/c83e3a018bea4130a64693b514c37cf3.png)
笔试选择题中天天考基数排序，就简单实现一下加深一下印象

```cpp
#include <bits/stdc++.h>
using namespace std;
class Solution {
 public:
  vector<int> sortArray(vector<int>& nums) {
    int max_num = *max_element(nums.begin(), nums.end());  // 得到最大数字
    int bits = 0;                                          // 最大数字位数
    while (max_num != 0) {
      max_num /= 10;
      bits++;
    }

    vector<vector<int>> bucket(10);
    for (int i = 0; i < bits; i++) {  // 进行bits次放入放出操作
      for (int num : nums) {
        int index = num / static_cast<int>(pow(10, i)) % 10;  // 计算相应位置的数字
        bucket[index].emplace_back(num);                      // 压入桶中
      }
      // 放回数组中
      int k = 0;
      for (auto& items : bucket) {
        for (int num : items) {
          nums[k++] = num;
        }
        items.clear();
      }
    }
    return nums;
  }
};

int main() {
  int n;
  while (cin >> n) {
    vector<int> data(n);
    for (int i = 0; i < n; i++) {
      cin >> data[i];
    }
    Solution solution;
    auto res = solution.sortArray(data);
    for (int num : res) {
      cout << num << " ";
    }
    cout << endl;
  }
}
```

## 二分查找
### 正经解法
[写对二分查找不是套模板并往里面填空，需要仔细分析题意](https://leetcode.cn/problems/search-insert-position/solution/te-bie-hao-yong-de-er-fen-cha-fa-fa-mo-ban-python-/)
```cpp
#include <bits/stdc++.h>
using namespace std;
int BinaryFindEqual(const vector<int>& data, int target) {  // 等于
  // 结果可能出现在[0,n-1]区间，不存在时返回-1
  int low = 0;
  int high = data.size() - 1;
  while (low < high) {
    int mid = (low + high) / 2;  // 靠近low high都可以
    if (data[mid] == target) {
      return mid;
    } else if (data[mid] > target) {
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }
  // 压缩区间至[low,high], low==high
  if (data[low] == target) {
    return low;
  }
  return -1;
}

int BinaryFindFirstGreaterEqual(const vector<int>& data, int target) {  // 第一次大于等于
  // 结果可能落在[0,n]
  int low = 0;
  int high = data.size();
  while (low < high) {
    int mid = (low + high) / 2;  // 靠近low
    if (data[mid] >= target) {
      high = mid;
    } else {
      low = mid + 1;
    }
  }
  // 压缩区间至[low,high], low==high
  return low;
}

int BinaryFindFirstGreater(const vector<int>& data, int target) {  // 第一次大于
  // 结果可能落在[0,n]
  int low = 0;
  int high = data.size();
  while (low < high) {
    int mid = (low + high) / 2;  // 靠近low
    if (data[mid] > target) {
      high = mid;
    } else {
      low = mid + 1;
    }
  }
  // 压缩区间至[low,high], low==high
  return low;
}

int BinaryFindLastLesserEqual(const vector<int>& data, int target) {  // 最后一次小于等于
  // 结果可能落在[-1,n-1]
  if (data[0] > target) {
    return -1;
  }
  int low = 0;
  int high = data.size() - 1;
  while (low < high) {
    int mid = (low + high + 1) / 2;  // 靠近high
    if (data[mid] > target) {
      high = mid - 1;
    } else {
      low = mid;
    }
  }
  // 压缩区间至[low,high], low==high
  return low;
}

int BinaryFindLastLesser(const vector<int>& data, int target) {  // 最后一次小于
  // 结果可能落在[-1,n-1]
  if (data[0] >= target) {
    return -1;
  }
  int low = 0;
  int high = data.size() - 1;
  while (low < high) {
    int mid = (low + high + 1) / 2;  // 靠近high
    if (data[mid] >= target) {
      high = mid - 1;
    } else {
      low = mid;
    }
  }
  // 压缩区间至[low,high], low==high
  return low;
}

int BinaryFindFirstEqual(const vector<int>& data, int target) {  // 第一次等于
  // 结果可能落在[0,n-1]，不存在时返回-1
  int low = 0;
  int high = data.size() - 1;
  while (low < high) {
    int mid = (low + high) / 2;  // 靠近low
    if (data[mid] > target) {
      high = mid - 1;
    } else if (data[mid] < target) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }
  // 压缩区间至[low,high], low==high
  if (data[low] == target) {
    return low;
  }
  return -1;
}

int BinaryFindLastEqual(const vector<int>& data, int target) {  // 最后一次等于
  // 结果可能落在[0,n-1]，不存在时返回-1
  int low = 0;
  int high = data.size() - 1;
  while (low < high) {
    int mid = (low + high + 1) / 2;  // 靠近high
    if (data[mid] > target) {
      high = mid - 1;
    } else if (data[mid] < target) {
      low = mid + 1;
    } else {
      low = mid;
    }
  }
  // 压缩区间至[low,high], low==high
  if (data[low] == target) {
    return low;
  }
  return -1;
}

int BinaryFindEqualCompare(const vector<int>& data, int target) {  // 返回第一次相等的下标
  for (int i = 0; i < data.size(); i++) {
    if (data[i] == target) {
      return i;
    }
  }
  return -1;
}

int BinaryFindFirstGreaterEqualCompare(const vector<int>& data, int target) {
  for (int i = 0; i < data.size(); i++) {
    if (data[i] >= target) {
      return i;
    }
  }
  return data.size();
}

int BinaryFindFirstGreaterCompare(const vector<int>& data, int target) {
  for (int i = 0; i < data.size(); i++) {
    if (data[i] > target) {
      return i;
    }
  }
  return data.size();
}

int BinaryFindLastLesserEqualCompare(const vector<int>& data, int target) {
  for (int i = data.size() - 1; i >= 0; i--) {
    if (data[i] <= target) {
      return i;
    }
  }
  return -1;
}

int BinaryFindLastLesserCompare(const vector<int>& data, int target) {
  for (int i = data.size() - 1; i >= 0; i--) {
    if (data[i] < target) {
      return i;
    }
  }
  return -1;
}

int BinaryFindFirstEqualCompare(const vector<int>& data, int target) {
  for (int i = 0; i < data.size(); i++) {
    if (data[i] == target) {
      return i;
    }
  }
  return -1;
}

int BinaryFindLastEqualCompare(const vector<int>& data, int target) {
  for (int i = data.size() - 1; i >= 0; i--) {
    if (data[i] == target) {
      return i;
    }
  }
  return -1;
}

using FindFunc = function<int(const vector<int>&, int)>;
void TestBinaryFind(const vector<int>& data, const vector<int>& targets, FindFunc test_fn, FindFunc right_fn, string testname) {
  for (int target : targets) {
    int res1 = test_fn(data, target);
    int res2 = right_fn(data, target);
    if (res1 != res2) {
      cout << "wrong anwer." << endl;
      cout << "res1: " << res1 << "  res2: " << res2 << endl;
    }
  }
  cout << testname << " complete." << endl;
}

int main() {
  vector<int> unique_data;
  default_random_engine e;
  uniform_int_distribution<int> u(1, 100);
  e.seed(time(0));
  for (int i = 5; i < 95; i++) {
    if (u(e) > 50) {
      unique_data.emplace_back(i);
    }
  }
  vector<int> targets;
  for (int i = 0; i <= 100; i++) {
    targets.emplace_back(i);
  }
  cout << "unique data test:" << endl;
  TestBinaryFind(unique_data, targets, BinaryFindEqual, BinaryFindEqualCompare, "BinaryFindEqual");
  TestBinaryFind(unique_data, targets, BinaryFindFirstGreaterEqual, BinaryFindFirstGreaterEqualCompare, "BinaryFindFirstGreaterEqual");
  TestBinaryFind(unique_data, targets, BinaryFindFirstGreater, BinaryFindFirstGreaterCompare, "BinaryFindFirstGreater");
  TestBinaryFind(unique_data, targets, BinaryFindLastLesserEqual, BinaryFindLastLesserEqualCompare, "BinaryFindLastLesserEqual");
  TestBinaryFind(unique_data, targets, BinaryFindLastLesser, BinaryFindLastLesserCompare, "BinaryFindLastLesser");

  vector<int> repeat_data;
  for (int i = 5; i < 95; i++) {
    while (u(e) > 30) {
      repeat_data.emplace_back(i);
    }
  }
  cout << "repeat data test:" << endl;
  TestBinaryFind(repeat_data, targets, BinaryFindFirstGreaterEqual, BinaryFindFirstGreaterEqualCompare, "BinaryFindFirstGreaterEqual");
  TestBinaryFind(repeat_data, targets, BinaryFindFirstGreater, BinaryFindFirstGreaterCompare, "BinaryFindFirstGreater");
  TestBinaryFind(repeat_data, targets, BinaryFindLastLesserEqual, BinaryFindLastLesserEqualCompare, "BinaryFindLastLesserEqual");
  TestBinaryFind(repeat_data, targets, BinaryFindLastLesser, BinaryFindLastLesserCompare, "BinaryFindLastLesser");
  TestBinaryFind(repeat_data, targets, BinaryFindFirstEqual, BinaryFindFirstEqualCompare, "BinaryFindFirstEqual");
  TestBinaryFind(repeat_data, targets, BinaryFindLastEqual, BinaryFindLastEqualCompare, "BinaryFindLastEqual");
}
```

### 取巧解法
相关leetcode题目
34. 在排序数组中查找元素的第一个和最后一个位置
35. 搜索插入位置
704. 二分查找

本来是比较基础的题目，面试时问到卡壳了，故在此记录一下二分查找变形的简单解法

**在排序数组中查找元素的第一个和最后一个位置**
 给你一个按照非递减顺序排列的整数数组 nums，和一个目标值 target。请你找出给定目标值在数组中的开始位置和结束位置。
如果数组中不存在目标值 target，返回 [-1, -1]。
你必须设计并实现时间复杂度为 O(log n) 的算法解决此问题。

**思路**
显然解题并不需要实现两个函数，只需要找到任意一个等于然后向两边扩散即可，但我为了熟悉二分查找的变形，实现了两个函数，分别用来求第一个等于和最后一个等于。这其中就使用了一个技巧，**对前一个或后一个值进行额外判断，这样就能将范围查找规约成单个满足条件的值的查找**，这样就能避免一系列的死循环和边界条件了
```cpp
#include <bits/stdc++.h>
using namespace std;
class Solution {
 public:
  int find_first_equal(vector<int>& nums, int target) {  // 第一个等于的位置
    int low = 0;
    int high = nums.size() - 1;
    while (low <= high) {
      int mid = (low + high) / 2;
      if (nums[mid] > target) {
        high = mid - 1;
      } else if (nums[mid] < target) {
        low = mid + 1;
      } else {
        if (mid == 0 || nums[mid - 1] != target) {  // 当前位置即为第一个等于
          return mid;
        }
        high = mid - 1;
      }
    }
    return -1;  // 不存在等于target的位置
  }
  int find_last_equal(vector<int>& nums, int target) {  // 最后一个等于的位置
    int low = 0;
    int high = nums.size() - 1;
    while (low <= high) {
      int mid = (low + high) / 2;
      if (nums[mid] > target) {
        high = mid - 1;
      } else if (nums[mid] < target) {
        low = mid + 1;
      } else {
        if (mid == nums.size() - 1 || nums[mid + 1] != target) {  // 当前位置即为最后一个等于的位置
          return mid;
        }
        low = mid + 1;
      }
    }
    return -1;  // 不存在等于target的位置
  }
  vector<int> searchRange(vector<int>& nums, int target) {
    int first = find_first_equal(nums, target);
    int second = find_last_equal(nums, target);
    return {first, second};
  }
};
```


**搜索插入位置**
给定一个排序数组和一个目标值，在数组中找到目标值，并返回其索引。如果目标值不存在于数组中，返回它将会被按顺序插入的位置。
请必须使用时间复杂度为 O(log n) 的算法。

**思路**
使用上述技巧即可，判断前一个值
```cpp
#include <bits/stdc++.h>
using namespace std;
class Solution {
 public:
  int searchInsert(vector<int>& nums, int target) {  // 搜索第一个大于等于target的位置
    int low = 0;
    int high = nums.size() - 1;
    while (low <= high) {
      int mid = (low + high) / 2;
      if (nums[mid] < target) {
        low = mid + 1;
      } else {
        if (mid == 0 || nums[mid - 1] < target) {  // 当前位置即为第一个大于等于target的位置
          return mid;
        }
        high = mid - 1;
      }
    }
    return nums.size(); 
  }
};
```

**二分查找**
给定一个 n 个元素有序的（升序）整型数组 nums 和一个目标值 target  ，写一个函数搜索 nums 中的 target，如果目标值存在返回下标，否则返回 -1。

```cpp
#include <bits/stdc++.h>
using namespace std;
class Solution {
 public:
  int search(vector<int>& nums, int target) {
    int low = 0;
    int high = nums.size() - 1;
    while (low <= high) {
      int mid = (low + high) / 2;
      if (nums[mid] > target) {
        high = mid - 1;
      } else if (nums[mid] < target) {
        low = mid + 1;
      } else {
        return mid;
      }
    }
    return -1;
  }
};
```

## 完成所有任务的最少时间
你有一台电脑，它可以 同时 运行无数个任务。给你一个二维整数数组 tasks ，其中 tasks[i] = [starti, endi, durationi] 表示第 i 个任务需要在 闭区间 时间段 [starti, endi] 内运行 durationi 个整数时间点（但不需要连续）。
当电脑需要运行任务时，你可以打开电脑，如果空闲时，你可以将电脑关闭。
请你返回完成所有任务的情况下，电脑最少需要运行多少秒。

**思路：**
周赛的第四题，没思路，动态规划写多了，想不到贪心，而且这个非常像差分数组，但实际又不能用，就放弃了
参考别人的题解：[两种方法：暴力/线段树（Python/Java/C++/Go）](https://leetcode.cn/problems/minimum-time-to-complete-all-tasks/solution/tan-xin-pythonjavacgo-by-endlesscheng-w3k3/)
```cpp
class Solution {
 public:
  int findMinimumTime(vector<vector<int>>& tasks) {
    auto cmp = [](const vector<int>& task1, const vector<int>& task2) { return task1[1] < task2[1]; };
    sort(tasks.begin(), tasks.end(), cmp);  // 按右端点排序
    vector<int> run(2001, 0);
    int ans = 0;
    for (auto& task : tasks) {
      int start = task[0];
      int end = task[1];
      int duration = task[2];
      for (int i = start; i <= end; i++) {  // 减去已运行的任务数
        duration -= run[i];
      }
      for (int i = end; duration > 0; i--) {  // 尽可能安排在区间后缀
        if (run[i] == 0) {
          run[i] = 1;
          duration--;
          ans++;
        }
      }
    }
    return ans;
  }
};
```

## 统计美丽子数组数目
给你一个下标从 0 开始的整数数组nums 。每次操作中，你可以：

选择两个满足 0 <= i, j < nums.length 的不同下标 i 和 j 。
选择一个非负整数 k ，满足 nums[i] 和 nums[j] 在二进制下的第 k 位（下标编号从 0 开始）是 1 。
将 nums[i] 和 nums[j] 都减去 2k 。
如果一个子数组内执行上述操作若干次后，该子数组可以变成一个全为 0 的数组，那么我们称它是一个 美丽 的子数组。

请你返回数组 nums 中 美丽子数组 的数目。
子数组是一个数组中一段连续 非空 的元素序列。

**思路：**
周赛的第三题，使用两层循环枚举超时

```cpp
class Solution {
 public:
  long long beautifulSubarrays(vector<int>& nums) {
    vector<int> dp = nums;  // dp[i][j]表示长度为i，末尾为j的序列的异或和，由于dp[i][j]只和dp[i-1][j]有关，省略i
    long long ans = 0;
    for (int num : nums) {  // 计算dp[1][j]为0的个数
      if (num == 0) {
        ans++;
      }
    }
    for (int len = 2; len <= nums.size(); len++) {
      for (int end = nums.size() - 1; end >= len - 1; end--) {  // 逆序更新，保证为上一次的结果
        dp[end] = dp[end - 1] ^ nums[end];
        if (dp[end] == 0) {
          ans++;
        }
      }
    }
    return ans;
  }
};
```
而题解使用了前缀和与异或的性质
[【套路】前缀和+哈希表（Python/Java/C++/Go）](https://leetcode.cn/problems/count-the-number-of-beautiful-subarrays/solution/tao-lu-qian-zhui-he-ha-xi-biao-pythonjav-3fna/)
```cpp
/*
异或
归零律：a ^ a = 0
恒等律：a ^ 0 = a
a  b  a ^ b
0  0  0
0  1  1
1  0  1
1  1  0
*/
class Solution {
 public:
  long long beautifulSubarrays(vector<int>& nums) {
    int n = nums.size();
    vector<int> prefix(n + 1, 0);  // prefix[0] = 0
    for (int i = 0; i < n; i++) {  // 异或前缀和
      prefix[i + 1] = prefix[i] ^ nums[i];
    }
    long long ans = 0;  // 注意为long long
    unordered_map<int, int> cnt;
    for (int s : prefix) {
      // 若此时cnt[s]!=0，设当前位置为j，存在cnt[s]个位置的前缀为s，其位置设为i，[i...j]的区间异或和为0
      // 额外加入prefix[0] = 0，便于计算nums[i]==0的情况
      ans += cnt[s];
      cnt[s]++;
    }
    return ans;
  }
};
```

## 航班预订统计
这里有 n 个航班，它们分别从 1 到 n 进行编号。
有一份航班预订表 bookings ，表中第 i 条预订记录 bookings[i] = [firsti, lasti, seatsi] 意味着在从 firsti 到 lasti （包含 firsti 和 lasti ）的 每个航班 上预订了 seatsi 个座位。
请你返回一个长度为 n 的数组 answer，里面的元素是每个航班预定的座位总数。

**思路：**
差分数组模板题

```cpp
class Solution {
 public:
  vector<int> corpFlightBookings(vector<vector<int>>& bookings, int n) {
    vector<int> ans(n, 0);  // 差分数组
    for (auto& booking : bookings) {
      ans[booking[0] - 1] += booking[2];
      if (booking[1] < n) {
        ans[booking[1]] -= booking[2];
      }
    }
    for (int i = 1; i < n; i++) {  // 对差分数组求前缀和即为原数组
      ans[i] += ans[i - 1];
    }
    return ans;
  }
};
```

## 两数之和
给定一个整数数组 nums 和一个整数目标值 target，请你在该数组中找出 和为目标值 target  的那 两个 整数，并返回它们的数组下标。
你可以假设每种输入只会对应一个答案。但是，数组中同一个元素在答案里不能重复出现。
你可以按任意顺序返回答案。

 硬套双指针做法
 
```cpp
class Solution {
 public:
  vector<int> twoSum(vector<int>& nums, int target) {
    vector<pair<int, int>> index(nums.size());  // 数值+索引
    for (int i = 0; i < nums.size(); i++) {
      index[i] = {nums[i], i};
    }
    sort(index.begin(), index.end());  // 排序
    int i = 0;
    int j = nums.size() - 1;
    while (i < j) {  // 使用双指针解决两数之和
      if (index[i].first + index[j].first == target) {
        return {index[i].second, index[j].second};
      } else if (index[i].first + index[j].first > target) {
        j--;
      } else {
        i++;
      }
    }
    return {};
  }
};
```
使用map加速查找
```cpp
class Solution {
 public:
  vector<int> twoSum(vector<int>& nums, int target) {
    unordered_map<int, int> hash_map;
    for (int i = 0; i < nums.size(); i++) {
      auto iter = hash_map.find(target - nums[i]);  // 查找之前元素
      if (iter != hash_map.end()) {
        return {iter->second, i};
      }
      hash_map[nums[i]] = i;
    }
    return {};
  }
};
```

## 三数之和
给你一个整数数组 nums ，判断是否存在三元组 [nums[i], nums[j], nums[k]] 满足 i != j、i != k 且 j != k ，同时还满足 nums[i] + nums[j] + nums[k] == 0 。请
你返回所有和为 0 且不重复的三元组。
注意：答案中不可以包含重复的三元组。

直接使用set去重，使用最简单的两数之和方法
```cpp
class Solution {
 public:
  vector<vector<int>> threeSum(vector<int>& nums) {
    if (nums.size() < 3) {
      return {};
    }
    sort(nums.begin(), nums.end());
    set<vector<int>> se;  // 直接用set去重
    for (int i = 0; i < nums.size() - 2; i++) {
      int target = -nums[i];
      int j = i + 1;
      int k = nums.size() - 1;
      while (j < k) {
        if (nums[j] + nums[k] == target) {
          se.emplace(vector<int>{nums[i], nums[j], nums[k]});
          j++;
          k--;
        } else if (nums[j] + nums[k] > target) {
          k--;
        } else {
          j++;
        }
      }
    }
    return vector<vector<int>>(se.begin(), se.end());
  }
};
```
逻辑去重，跳过相同字符

```cpp
class Solution {
 public:
  vector<vector<int>> threeSum(vector<int>& nums) {
    if (nums.size() < 3) {
      return {};
    }
    sort(nums.begin(), nums.end());
    vector<vector<int>> ans;
    int i = 0;
    while (i < nums.size() - 2) {
      int target = -nums[i];
      int j = i + 1;
      int k = nums.size() - 1;
      while (j < k) {
        if (nums[j] + nums[k] == target) {
          ans.emplace_back(vector<int>{nums[i], nums[j], nums[k]});
          int value_j = nums[j];
          int vlaue_k = nums[k];
          // 跳过相同字符
          while (j < nums.size() && nums[j] == value_j) {
            j++;
          }
          while (k >= 0 && nums[k] == vlaue_k) {
            k--;
          }
        } else if (nums[j] + nums[k] > target) {
          k--;
        } else {
          j++;
        }
      }
      // 跳过相同字符
      while (i < nums.size() && nums[i] == -target) {
        i++;
      }
    }
    return ans;
  }
};
```

## 连接所有点的最小费用
给你一个points 数组，表示 2D 平面上的一些点，其中 points[i] = [xi, yi] 。
连接点 [xi, yi] 和点 [xj, yj] 的费用为它们之间的 曼哈顿距离 ：|xi - xj| + |yi - yj| ，其中 |val| 表示 val 的绝对值。
请你返回将所有点连接的最小总费用。只有任意两点之间 有且仅有 一条简单路径时，才认为所有点都已连接。

最小生成树模板题

还是用visit数组标记是否已加入集合比较好，注意优先队列自定义比较函数的方式
```cpp
const int kInf = 1 << 30;
class Solution {
 public:
  int minCostConnectPoints(vector<vector<int>>& points) {
    int n = points.size();
    vector<int> dist(n, kInf);
    dist[0] = 0;
    auto cmp = [](const pair<int, int>& p1, const pair<int, int>& p2) -> bool { return p1.second > p2.second; };
    priority_queue<pair<int, int>, vector<pair<int, int>>, decltype(cmp)> qu(cmp);
    vector<bool> visit(n, false);
    qu.emplace(0, 0);
    while (!qu.empty()) {
      auto [node, node_dist] = qu.top();
      qu.pop();
      if (visit[node]) {
        continue;
      }
      visit[node] = true;
      int x1 = points[node][0];
      int y1 = points[node][1];
      for (int i = 0; i < n; i++) {
        if (i != node && !visit[i]) {
          int x2 = points[i][0];
          int y2 = points[i][1];
          int manhan_dist = abs(x1 - x2) + abs(y1 - y2);
          if (dist[i] > manhan_dist) {  // 松弛操作与Dijkstra算法不同
            dist[i] = manhan_dist;
            qu.emplace(i, manhan_dist);
          }
        }
      }
    }
    return accumulate(dist.begin(), dist.end(), 0);  // 计算距离总和
  }
};
```

## 省份数量
有 n 个城市，其中一些彼此相连，另一些没有相连。如果城市 a 与城市 b 直接相连，且城市 b 与城市 c 直接相连，那么城市 a 与城市 c 间接相连。
省份 是一组直接或间接相连的城市，组内不含其他没有相连的城市。
给你一个 n x n 的矩阵 isConnected ，其中 isConnected[i][j] = 1 表示第 i 个城市和第 j 个城市直接相连，而 isConnected[i][j] = 0 表示二者不直接相连。
返回矩阵中 省份 的数量。
**思路：**
union-find模题，单纯用来熟悉union-find算法

```cpp
class Solution {
 public:
  int findOperation(int k) {
    if (vec_[k] == k) {
      return k;
    }
    vec_[k] = findOperation(vec_[k]);  // 压缩树结构
    return vec_[k];
  }

  void unionOperation(int p, int q) {
    int proot = findOperation(p);
    int qroot = findOperation(q);
    vec_[proot] = qroot;  // 合并连通分量
  }

  int findCircleNum(vector<vector<int>>& isConnected) {
    int n = isConnected.size();
    vec_ = vector<int>(n);
    for (int i = 0; i < n; i++) {  // 初始化连通分量数组
      vec_[i] = i;
    }
    for (int i = 0; i < n; i++) {
      for (int j = 0; j < n; j++) {
        if (isConnected[i][j] == 1) {  // 将两城市相连
          unionOperation(i, j);
        }
      }
    }
    int cnt = 0;
    for (int i = 0; i < n; i++) {  // 计算连通分量数目
      if (vec_[i] == i) {
        cnt++;
      }
    }
    return cnt;
  }

 private:
  vector<int> vec_;
};
```

## 概率最大的路径
给你一个由 n 个节点（下标从 0 开始）组成的无向加权图，该图由一个描述边的列表组成，其中 edges[i] = [a, b] 表示连接节点 a 和 b 的一条无向边，且该边遍历成功的概率为 succProb[i] 。
指定两个节点分别作为起点 start 和终点 end ，请你找出从起点到终点成功概率最大的路径，并返回其成功概率。
如果不存在从 start 到 end 的路径，请 返回 0 。只要答案与标准答案的误差不超过 1e-5 ，就会被视作正确答案。
**思路：**
Dijkstra算法变种大多采用不同的松弛操作，若需要优化算法性能，可使用优先队列
第一个版本：不使用优先队列，超时，中间一个bug是max_dist使用了int
```cpp
struct Edge {
  int to;
  double prob;
};
class Solution {
 public:
  double maxProbability(int n, vector<vector<int>>& edges, vector<double>& succProb, int start, int end) {
    vector<vector<Edge>> mat(n);
    for (int i = 0; i < edges.size(); i++) {  // 构建邻接矩阵
      mat[edges[i][0]].emplace_back(Edge{edges[i][1], succProb[i]});
      mat[edges[i][1]].emplace_back(Edge{edges[i][0], succProb[i]});
    }
    vector<bool> visit(n, false);  // 标记数组
    vector<double> dist(n, 0);     // 与起点距离
    dist[start] = 1;               // 起点值为1
    int node = start;
    visit[node] = true;
    for (int times = 0; times < n; times++) {
      for (Edge e : mat[node]) {
        if (dist[e.to] < dist[node] * e.prob) {  // 松弛操作，乘法
          dist[e.to] = dist[node] * e.prob;
        }
      }
      // 找到最大的边
      double max_dist = 0;  // double类型
      int max_index = -1;
      for (int i = 0; i < n; i++) {
        if (!visit[i] && dist[i] > max_dist) {
          max_dist = dist[i];
          max_index = i;
        }
      }
      if (max_index == end) {
        return dist[end];
      }
      if (max_index == -1) {
        return 0;
      }
      visit[max_index] = true;
      node = max_index;
    }
    return visit[end];
  }
};
```
第二个版本：借助优先队列，但仍然使用了标记数组
```cpp
struct Edge {
  int to;
  double prob;
  bool operator<(const Edge& e) { return prob < e.prob; }
};
class Solution {
 public:
  double maxProbability(int n, vector<vector<int>>& edges, vector<double>& succProb, int start, int end) {
    vector<vector<Edge>> mat(n);
    for (int i = 0; i < edges.size(); i++) {  // 构建邻接矩阵
      mat[edges[i][0]].emplace_back(Edge{edges[i][1], succProb[i]});
      mat[edges[i][1]].emplace_back(Edge{edges[i][0], succProb[i]});
    }
    vector<bool> visit(n, false);  // 标记数组
    vector<double> dist(n, 0);     // 与起点距离
    priority_queue<pair<double, int>> qu;
    dist[start] = 1;  // 起点值为1
    qu.emplace(1.0, start);
    while (!qu.empty()) {
      auto [prob, node] = qu.top();
      qu.pop();
      if (node == end) {
        return dist[end];
      }
      if (visit[node]) {
        continue;
      }
      visit[node] = true;
      for (Edge e : mat[node]) {
        if (dist[e.to] < dist[node] * e.prob) {  // 松弛操作，乘法
          dist[e.to] = dist[node] * e.prob;
          qu.emplace(dist[e.to], e.to);
        }
      }
    }
    return visit[end];
  }
};
```
第三个版本：借助优先队列，但不需要标记数组，可以多看几遍
```cpp
class Solution {
 public:
  double maxProbability(int n, vector<vector<int>>& edges, vector<double>& succProb, int start, int end) {
    vector<vector<pair<int, double>>> mat(n);
    for (int i = 0; i < edges.size(); i++) {  // 构建邻接矩阵
      mat[edges[i][0]].emplace_back(edges[i][1], succProb[i]);
      mat[edges[i][1]].emplace_back(edges[i][0], succProb[i]);
    }

    priority_queue<pair<double, int>> qu;  // 借助优先队列找到最大概率路径
    vector<double> dist(n, 0);
    dist[start] = 1;
    qu.emplace(1, start);
    while (!qu.empty()) {
      auto [prob, node] = qu.top();
      qu.pop();
      if (prob < dist[node]) {  // 无用信息，node已被更新过
        continue;
      }
      if (node == end) {  // 提前返回结果
        return dist[end];
      }
      for (auto& [next_node, edge_prob] : mat[node]) {  // 松弛操作
        if (dist[next_node] < dist[node] * edge_prob) {
          dist[next_node] = dist[node] * edge_prob;
          qu.emplace(dist[next_node], next_node);
        }
      }
    }
    return dist[end];
  }
};
```

## 实现 Trie (前缀树)
Trie（发音类似 "try"）或者说 前缀树 是一种树形数据结构，用于高效地存储和检索字符串数据集中的键。这一数据结构有相当多的应用情景，例如自动补完和拼写检查。

请你实现 Trie 类：

Trie() 初始化前缀树对象。
void insert(String word) 向前缀树中插入字符串 word 。
boolean search(String word) 如果字符串 word 在前缀树中，返回 true（即，在检索之前已经插入）；否则，返回 false 。
boolean startsWith(String prefix) 如果之前已经插入的字符串 word 的前缀之一为 prefix ，返回 true ；否则，返回 false 。

**思路：**
了解了节点组成之后还是挺简单的，**子节点指针数组与结束标志**
```cpp
class Trie {
 public:
  Trie() {
    memset(children_, 0, sizeof(children_));  // 将子节点指针置为空
    is_end_ = false;
  }

  void insert(string word) {
    Trie* node = this;
    for (char c : word) {
      if (node->children_[c - 'a'] == nullptr) {  // 若子节点不存在则创建
        node->children_[c - 'a'] = new Trie();
      }
      node = node->children_[c - 'a'];
    }
    node->is_end_ = true;  // 字符串结束位置
  }

  bool search(string word) {
    Trie* node = this;
    for (char c : word) {
      if (node->children_[c - 'a'] == nullptr) {  // 子节点为空，搜索失败
        return false;
      }
      node = node->children_[c - 'a'];
    }
    return node->is_end_;
  }

  bool startsWith(string prefix) {
    Trie* node = this;
    for (char c : prefix) {
      if (node->children_[c - 'a'] == nullptr) {  // 子节点为空，搜索失败
        return false;
      }
      node = node->children_[c - 'a'];
    }
    return true;
  }

 private:
  Trie* children_[26];  // 字节点指针
  bool is_end_;         // 是否为字符串结尾
};

```

## LRU 缓存
请你设计并实现一个满足  LRU (最近最少使用) 缓存 约束的数据结构。
实现 LRUCache 类：
LRUCache(int capacity) 以 正整数 作为容量 capacity 初始化 LRU 缓存
int get(int key) 如果关键字 key 存在于缓存中，则返回关键字的值，否则返回 -1 。
void put(int key, int value) 如果关键字 key 已经存在，则变更其数据值 value ；如果不存在，则向缓存中插入该组 key-value 。如果插入操作导致关键字数量超过 capacity ，则应该 逐出 最久未使用的关键字。
函数 get 和 put 必须以 O(1) 的平均时间复杂度运行。

**思路：**
与15445的LRU类似，注意size的更新与淘汰操作
```cpp
class LRUCache {
 public:
  LRUCache(int capacity) : capacity_(capacity), size_(0) {}

  int get(int key) {
    auto map_iter = speed_map_.find(key);
    if (map_iter == speed_map_.end()) {  // key不存在
      return -1;
    }

    auto list_iter = map_iter->second;
    int value = list_iter->second;

    if (list_iter != data_.begin()) {  // 移至队首
      data_.erase(list_iter);
      data_.emplace_front(key, value);
      speed_map_[key] = data_.begin();
    }

    return value;
  }

  void put(int key, int value) {
    auto map_iter = speed_map_.find(key);
    if (map_iter == speed_map_.end()) {  // 插入key-value对
      if (size_ == capacity_) {          // 淘汰队尾数据
        speed_map_.erase(data_.back().first);
        data_.pop_back();
        size_--;  // 当前大小减一
      }
      // 插入队首
      data_.emplace_front(key, value);
      speed_map_.insert({key, data_.begin()});
      size_++;  // 当前大小加一

    } else {  // 更新key-value对
      auto list_iter = map_iter->second;
      list_iter->second = value;

      if (list_iter != data_.begin()) {  // 移至队首
        data_.erase(list_iter);
        data_.emplace_front(key, value);
        speed_map_[key] = data_.begin();
      }
    }
  }

 private:
  int capacity_;                                                  // 容量
  int size_;                                                      // 当前大小
  unordered_map<int, list<pair<int, int>>::iterator> speed_map_;  // key与list迭代器
  list<pair<int, int>> data_;                                     // 存储key-value对
};

```

## 合并两个有序链表
代码化简，while循环改成for循环

```cpp
class Solution {
 public:
  ListNode* mergeTwoLists(ListNode* list1, ListNode* list2) {
    ListNode virt_head(-1, nullptr);
    // ListNode* cur = &virt_head;
    // while (list1 != nullptr && list2 != nullptr) {
    //   if (list1->val <= list2->val) {
    //     cur->next = list1;
    //     cur = cur->next;
    //     list1 = list1->next;
    //   } else {
    //     cur->next = list2;
    //     cur = cur->next;
    //     list2 = list2->next;
    //   }
    // }
    ListNode* cur;
    for (cur = &virt_head; list1 != nullptr && list2 != nullptr; cur = cur->next) {
      if (list1->val <= list2->val) {
        cur->next = list1;
        list1 = list1->next;
      } else {
        cur->next = list2;
        list2 = list2->next;
      }
    }
    if (list1 != nullptr) {
      cur->next = list1;
    }
    if (list2 != nullptr) {
      cur->next = list2;
    }
    return virt_head.next;
  }
};
```

##  数组中的第 k 大的数字
给定整数数组 nums 和整数 k，请返回数组中第 k 个最大的元素。
**思路：**
利用快排的划分函数即可

```cpp
class Solution {
 public:
  int partition(vector<int>& nums, int start, int end) {
    int p = nums[end];
    int slow = start - 1;
    for (int fast = start; fast < end; fast++) {
      if (nums[fast] < p) {
        slow++;
        swap(nums[slow], nums[fast]);
      }
    }
    swap(nums[slow + 1], nums[end]);
    return slow + 1;
  }
  void sort(vector<int>& nums, int start, int end, int target) {
    if (start >= end) {
      return;
    }
    int mid = partition(nums, start, end);
    if (mid > target) {
      sort(nums, start, mid - 1, target);
    } else if (mid < target) {
      sort(nums, mid + 1, end, target);
    }
  }
  int findKthLargest(vector<int>& nums, int k) {
    sort(nums, 0, nums.size() - 1, nums.size() - k);
    return nums[nums.size() - k];
  }
};
```

## 排序数组
快排：以前都只看过双指针格式的代码，看了看leetcode单指针的代码，比较易懂
```cpp
class Solution {
 public:
  int partition(vector<int>& nums, int start, int end) {
    // 选择随机元素作为基准值
    int index = rand() % (end - start + 1) + start;
    swap(nums[index], nums[end]);
    // 单边循环，完成基准值排定
    int p = nums[end];
    int slow = start - 1;
    for (int fast = start; fast < end; fast++) {
      if (nums[fast] < p) {  // 保证左半边小于p，右半边大于等于
        slow++;
        swap(nums[slow], nums[fast]);
      }
    }
    swap(nums[slow + 1], nums[end]);
    return slow + 1;
  }
  void quickSort(vector<int>& nums, int start, int end) {
    if (end > start) {
      int mid = partition(nums, start, end);
      quickSort(nums, start, mid - 1);
      quickSort(nums, mid + 1, end);
    }
  }
  vector<int> sortArray(vector<int>& nums) {
    quickSort(nums, 0, nums.size() - 1);
    return nums;
  }
};
```

归并：不怎么喜欢用夹带++i或i++的表达式，总觉得不好看，非递归的实现忘了
```cpp
class Solution {
 public:
  void mergeSort(vector<int>& nums, int start, int end) {
    if (start >= end) {
      return;
    }
    int mid = (start + end) / 2;
    mergeSort(nums, start, mid);
    mergeSort(nums, mid + 1, end);
    int i = start;
    int j = mid + 1;
    int k = start;
    while (i <= mid && j <= end) {
      if (nums[i] <= nums[j]) {
        tmp_vec_[k] = nums[i];
        i++;
        k++;
      } else {
        tmp_vec_[k] = nums[j];
        j++;
        k++;
      }
    }
    while (i <= mid) {
      tmp_vec_[k] = nums[i];
      i++;
      k++;
    }
    while (j <= end) {
      tmp_vec_[k] = nums[j];
      j++;
      k++;
    }
    for (int i = start; i <= end; i++) {
      nums[i] = tmp_vec_[i];
    }
  }
  vector<int> sortArray(vector<int>& nums) {
    tmp_vec_.resize(nums.size());
    mergeSort(nums, 0, nums.size() - 1);
    return nums;
  }

 private:
  vector<int> tmp_vec_;
};
```
堆排序，记住下沉操作即可

```cpp
class Solution {
 public:
  void maxHeapify(vector<int>& nums, int i, int len) {
    int left = 2 * i + 1;
    int right = 2 * i + 2;
    int largest = i;
    // 若子节点值大于父节点，找到较大者
    if (left <= len && nums[left] > nums[largest]) {
      largest = left;
    }
    if (right <= len && nums[right] > nums[largest]) {
      largest = right;
    }
    if (largest != i) {  // 与较大者交换，继续下沉操作
      swap(nums[i], nums[largest]);
      maxHeapify(nums, largest, len);
    }
  }
  void buildMaxHeap(vector<int>& nums, int len) {
    for (int i = len / 2; i >= 0; i--) {  // 将父节点依次下沉
      maxHeapify(nums, i, len);
    }
  }
  void heapSort(vector<int>& nums) {
    heap_size_ = nums.size() - 1;
    buildMaxHeap(nums, heap_size_);  // 建立大顶堆
    for (int i = nums.size() - 1; i > 0; i--) {
      swap(nums[i], nums[0]);  // 将最大值移至末尾
      heap_size_--;
      maxHeapify(nums, 0, heap_size_);  // 进行下沉操作，维持大顶堆性质
    }
  }
  vector<int> sortArray(vector<int>& nums) {
    heapSort(nums);
    return nums;
  }

 private:
  int heap_size_;
};
```


## LABULADONG 动态规划专题
[LABULADONG 的算法网站](https://labuladong.gitee.io/algo/)
### 零钱兑换
给你一个整数数组 coins ，表示不同面额的硬币；以及一个整数 amount ，表示总金额。

计算并返回可以凑成总金额所需的 最少的硬币个数 。如果没有任何一种硬币组合能组成总金额，返回 -1 。

你可以认为每种硬币的数量是无限的。


```cpp
const int kMax = 1 << 28;
class Solution {
 public:
  int coinChange(vector<int>& coins, int amount) {
    vector<int> dp(amount + 1, kMax);  // dp[i]表示凑成金额i的最少次数
    dp[0] = 0;
    for (int i = 1; i <= amount; i++) {
      for (int coin : coins) {
        if (i - coin >= 0) {
          dp[i] = min(dp[i], dp[i - coin] + 1);
        }
      }
    }
    return dp[amount] == kMax ? -1 : dp[amount];
  }
};
```

变换次序，去掉条件判断

```cpp
const int kMax = 1 << 28;
class Solution {
 public:
  int coinChange(vector<int>& coins, int amount) {
    vector<int> dp(amount + 1, kMax);
    dp[0] = 0;
    for (int coin : coins) {
        for(int i=coin;i<=amount;i++){
            dp[i] = min(dp[i], dp[i - coin] + 1);
        }
    }
    return dp[amount] == kMax ? -1 : dp[amount];
  }
};
```

### 最长递增子序列
给你一个整数数组 nums ，找到其中最长严格递增子序列的长度。

子序列 是由数组派生而来的序列，删除（或不删除）数组中的元素而不改变其余元素的顺序。例如，[3,6,2,7] 是数组 [0,3,1,6,2,2,7] 的子序列。

```cpp
/*
总结一下如何找到动态规划的状态转移关系：
1、明确dp数组的定义。这一步对于任何动态规划问题都很重要，如果不得当或者不够清晰，会阻碍之后的步骤。
2、根据dp数组的定义，运用数学归纳法的思想，假设dp[0...i-1]都已知，想办法求出dp[i]，一旦这一步完成，整个题目基本就解决了。
*/
class Solution {
 public:
  int lengthOfLIS(vector<int>& nums) {
    vector<int> dp(nums.size(), 1);  // dp[i]表示以nums[i]结尾的最长递增子序列的长度
    int longest = 1;
    for (int i = 1; i < nums.size(); i++) {
      for (int j = 0; j < i; j++) {
        if (nums[j] < nums[i]) {
          dp[i] = max(dp[i], dp[j] + 1);
        }
      }
      longest = max(longest, dp[i]);
    }

    return longest;
  }
};
```

### 分割等和子集
给你一个 只包含正整数 的 非空 数组 nums 。请你判断是否可以将这个数组分割成两个子集，使得两个子集的元素和相等。

**思路：**
0-1背包模板题，若压缩空间，则需要逆序更新保证为dp数组上一次更新的结果

```cpp
class Solution {
 public:
  bool canPartition(vector<int>& nums) {
    int sum = accumulate(nums.begin(), nums.end(), 0);  // 计算数组总和
    if (nums.size() <= 1 || sum % 2 == 1) {             // 只有一个数或总和为奇数
      return false;
    }
    int target = sum / 2;
    vector<bool> dp(target + 1, false);  // dp[i][j]表示前i个数是否能构成j，由于dp[i]只与dp[i-1]有关，状态压缩，仅仅保存dp[j]
    dp[0] = true;
    for (int i = 0; i < nums.size(); i++) {
      for (int j = target; j >= nums[i]; j--) {  // 逆序遍历，保证为i-1时的结果
        dp[j] = dp[j] | dp[j - nums[i]];
      }
    }
    return dp[target];
  }
};
```
### 零钱兑换 II
给你一个整数数组 coins 表示不同面额的硬币，另给一个整数 amount 表示总金额。
请你计算并返回可以凑成总金额的硬币组合数。如果任何硬币组合都无法凑出总金额，返回 0 。
假设每一种面额的硬币有无限个。 
题目数据保证结果符合 32 位带符号整数。

**思路：**
代码很简单，但通过调换次序避免重复却很巧妙
通过将coin设为主序，确定了内层循环的末尾硬币一定为当前coin，且组合序列一定遵从coins数组排序，即coin为1 2 5，则序列一定为1 1 2 之类的序列，而不会出现2 1 1的序列
```cpp
class Solution {
 public:
  int change(int amount, vector<int>& coins) {
    vector<int> dp(amount + 1, 0);  // dp[i]表示构成i的组合次数
    dp[0] = 1;
    for (int coin : coins) {
      for (int i = coin; i <= amount; i++) {
        dp[i] += dp[i - coin];
      }
    }
    return dp[amount];
  }
};
```

 

