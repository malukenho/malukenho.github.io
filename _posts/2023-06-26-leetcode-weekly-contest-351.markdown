---
layout: post
title: "📚 2748. Number of Beautiful Pairs"
author: Jefersson Nathan
date: Sat Jun 10 11:23:16 CEST 2023
categories: [ post, leetcode ]
description: "Weekly Contest 351"
---

## 2748. Number of Beautiful Pairs

{: class="language-kotlin" theme="darcula"}
```cpp
#include<iostream>
#include<vector>
#include<algorithm>
#include<set>

using namespace std;

class Solution {
private:
    static int gcd(int a, int b) {
        int result = min(a, b);
        while (result > 0) {
            if (a % result == 0 && b % result == 0) return result;
            result--;
        }

        return result;
    }

public:
    static int countBeautifulPairs(vector<int> &nums) {
        unsigned int N = nums.size();

        int beautifulPairs = 0;
        for (int i = 0; i < N - 1; i++) {
            for (int j = i + 1; j < N; j++) {
                int n1 = nums[i];
                int n2 = nums[j];
                if (n1 > 9) n1 = to_string(n1)[0] - 48;
                if (n2 > 9) n2 = n2 % 10;

                if (gcd(n1, n2) == 1) {
                    beautifulPairs++;
                }
            }
        }

        return beautifulPairs;
    }
};
```