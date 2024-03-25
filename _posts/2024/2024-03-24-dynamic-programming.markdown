---
layout: post
title: 🐥 Dynamic Programming 101
author: Jefersson Nathan
date: Mon Mar 24 14:21:54 CEST 2024
categories: [ "post" ]
description: "Dynamic programming"
---

{: class="marginalia" }
💡 Leetcode is a website<br /> where you can practice your coding skills by solving coding challenges.

Dynamic programming is considered for somes one of the most difficult topics to learn in
computer programming. It's a technique that allows us to solve complex problems by breaking
them into smaller subproblems. It's a very powerful technique that can be used to solve a
wide range of problems.

In this post, we're going to learn how to solve the following problem using dynamic programming:
[Minimum cost for climbing a stair](https://leetcode.com/problems/min-cost-climbing-stairs/description/).

---

{: class="marginalia" }
🚀 Let's get started!

### Problem Description

The problem description is quite simple:

> You are given an integer array `cost` where `cost[i]` is the cost of `i`th step on a staircase.
> Once you pay the cost, you can either climb one or two steps.
> 
> You can either start from the step with index `0`, or the step with index `1`.
> 
> Return the minimum cost to reach the top of the floor.

---

### Input

Suppose we have the following input:

{: class="language-kotlin" theme="darcula" mode="c"}
```cpp
vector<int> cost = {10, 15, 20};
```

The first thing we need to do is to understand the problem. We have a staircase with `n` steps.
Each step has a cost. We can either climb one or two steps. We can start from the first or second
step. We need to find the minimum cost to reach the top of the floor.

Let's visualize the problem:

{: class="language-kotlin" theme="darcula" mode="c"}
```cpp
10 -> 15 -> 20
```

We can either start from the first or second step. If we start from the first step, we need to pay
`10` to climb to the second step. If we start from the second step, we need to pay `15` to climb to
the third step. We can't start from the third step because it's the top of the floor.

We can either climb one or two steps. If we climb one step, we need to pay `15` to climb to the third
step. If we climb two steps, we need to pay `20` to climb to the third step.

We need to find the minimum cost to reach the top of the floor. In this case, the minimum cost is `15`.

---

### Recursive Solution

{: class="marginalia" }
🧠 Let's think about it!

Let's start by approaching the problem recursively.

{: class="language-kotlin" theme="darcula" mode="c"}
```cpp
class Solution {
    int recursive(vector<int>& cost, int n) {
        if (n >= cost.size()) return 0;

        int left  = cost[n] + recursive(cost, n + 1);
        int right = cost[n] + recursive(cost, n + 2);

        return min(left, right);
    }
public:
    int minCostClimbingStairs(vector<int>& cost) {
        return min(recursive(cost, 0), recursive(cost, 1));
    }
};
```

What is this code doing?

* As you can see we are calling the `recursive` function twice. The first time we are passing `0` as
the starting index. The second time we are passing `1` as the starting index. We are doing this
because we can start from the first or second step. From there, we are recursively calling the
`recursive` function until we reach the top of the floor.

* Our base case is when `n >= cost.size()`. This means that we have reached the top of the floor.
When we reach the top of the floor, we return `0` because we don't need to pay anything to reach
the top of the floor.

It is important to understand this recursive solution well because we are going to use it to
implement the other solutions.

---

### Memoization

Memoization is a technique that allows us to store the results of the subproblems so that we don't
need to recalculate them every time. It's a very powerful technique that can be used to optimize
recursive solutions.

Let's look at the recursive solution recursive tree:

<pre style="font-size: 20px">
      10                  15
     /  \                /  \
   15     20           20    25
  /  \   /  \         /  \   /  \
20   25  20  25      25  30 25  30
</pre>

As you can see, we are recalculating the same subproblems multiple times. For example, we are
calculating the cost to reach the top of the floor from the second step multiple times. We can
optimize this by storing the results of the subproblems in a `vector<int> dp`.

{: class="language-kotlin" theme="darcula" mode="c"}
```cpp
class Solution {
public:
    int memo(vector<int>& cost, int n, vector<int>& dp) {
        if (n >= cost.size()) return 0;

        if (dp[n] != -1) return dp[n];

        int left  = cost[n] + memo(cost, n + 1, dp);
        int right = cost[n] + memo(cost, n + 2, dp);

        return dp[n] = min(left, right);
    }
    int minCostClimbingStairs(vector<int>& cost) {
        vector<int> dp(cost.size() + 1, -1);
        return min(memo(cost, 0, dp), memo(cost, 1, dp));
    }
};
```

What is this code doing?

* We are creating a `vector<int> dp` to store the results of the subproblems. We are initializing
  the `dp` vector with `-1` because we are going to use `-1` to check if we have already calculated
  the result of the subproblem. We are also initializing the first and second elements of the `dp`
  vector with the cost of the first and second steps.

* We are iterating over the `cost` vector and calculating the cost to reach the top of the floor
  from each step. We are storing the results of the subproblems in the `dp` vector.

* We are returning the minimum cost to reach the top of the floor from the second to last step and
  the last step.

---

### Tabulation

Tabulation is a technique that allows us to solve a problem by filling a table. It's a very powerful
technique that can be used to solve a wide range of problems. It also can be used to optimize
recursive solutions. 

{: class="language-kotlin" theme="darcula" mode="c"}
```cpp
class Solution {
public:
    int minCostClimbingStairs(vector<int>& cost) {
        vector<int> dp(cost.size());
        dp[0] = cost[0];
        dp[1] = cost[1];
        for (int i = 2; i < cost.size(); ++i) {
            dp[i] = min(cost[i] + dp[i - 1], cost[i] + dp[i - 2]);
        }

        return min(dp[dp.size()-2], dp.back());
    }
};
```

What is this code doing?

* We are creating a `vector<int> dp` to store the results of the subproblems. We are initializing
  the `dp` with the same size of our input. We are also initializing the first and second elements
  of the `dp` vector with the cost of the first and second steps because for our solution we need
  the two previous computed values.

* We are iterating over the `cost` vector and calculating the cost to reach the top of the floor
  from each step. We are storing the results of the subproblems in the `dp` vector.

* We are returning the minimum cost to reach the top of the floor from the second to last step and
  the last step.

---

### Space Optimization

We can optimize the space complexity of the tabulation solution by using two variables instead of
a `vector<int>`. This is possible because for our solution we only need the two previous computed
values.

{: class="language-kotlin" theme="darcula" mode="c"}
```cpp
class Solution {
public:
    int minCostClimbingStairs(vector<int>& cost) {
        int prev = cost[0], prev2 = cost[1];
		
        for (int i = 2; i < cost.size(); ++i) {
            int temp = min(cost[i] + prev, cost[i] + prev2);
            swap(prev, prev2);
            prev2 = temp;
        }

        return min(prev, prev2);
    }
};
```

With that, we have learned how to solve the problem using dynamic programming. I hope you enjoyed
this post. If you have any questions, please let me know. I'll be happy to help you. 😊