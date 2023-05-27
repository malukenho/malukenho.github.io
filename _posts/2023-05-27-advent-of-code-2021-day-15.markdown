---
layout: post
title: "✨ Advent of Code — Day 15 <2021 />"
author: Jefersson Nathan
date: Sat May 26 11:23:16 CEST 2023
categories: [ post ]
description: "Day 15 - Chiton"
---

## DAY 15: CHITON

{: class="marginalia" }
\* Cf. [aoc. d. xv](https://adventofcode.com/2021/day/15)<br/><br/>
\* SSSP = Single Source Shortest Path problem

Today's challenge is a * [SSSP](https://www.cs.rochester.edu/u/nelson/courses/csc_173/graphs/sssp.html).
Given that we are dealing with a weighted graph, we can't use BFS to solve the problem. We need to use Dijkstra's
algorithm, or Bellman-Ford's algorithm.

As always, if you want to go straight to the code, you can check it out on
our [codelicia's repository](https://github.com/codelicia/adventofcode/tree/main/2021){: class="external no-highlight"}.

---

### THE INPUT

The input was very straightforward to parse. We need to convert the `String` into a `List<List<Int>>`.

{: class="language-kotlin" theme="darcula" from="1" to="7"}
```kotlin
class Day15(val input: String) {

    val grid = input.split("\n").map { it ->
        it.toCharArray().map { it.digitToInt() }
    }
    
}

fun main(): Unit = println(Day15("1163751742\n1381373672\n2136511328\n3694931569\n7463417111\n1319128137\n1359912421\n3125421639\n1293138521\n2311944581").grid)
```

Now we have a `List<List<Int>>`, or in other words, a graph.

---
### PARS I

First, I approached part one with [dynamic programming](https://en.wikipedia.org/wiki/Dynamic_programming).

{: class="language-kotlin" theme="darcula" from="9" to="24"}
```kotlin
import kotlin.math.min

class Day15(val input: String) {

    private val grid = input.split("\n").map { it ->
        it.toCharArray().map { it.digitToInt() }
    }
    
    private val maxRow = grid.lastIndex
    private val maxColumn = grid.last().lastIndex

    fun part1(): Int {
        val dp = Array(maxRow + 1) { IntArray(maxColumn + 1) { Int.MAX_VALUE } }
        dp[0][0] = 0

        for (i in 0..maxRow) {
            for (j in 0..maxColumn) {
                if (i > 0) dp[i][j] = min(dp[i][j], dp[i - 1][j] + grid[i][j])
                if (j > 0) dp[i][j] = min(dp[i][j], dp[i][j - 1] + grid[i][j])
            }
        }

        return dp[maxRow][maxColumn]
    }
}
fun main(): Unit = println(Day15("1163751742\n1381373672\n2136511328\n3694931569\n7463417111\n1319128137\n1359912421\n3125421639\n1293138521\n2311944581").part1())
```

* `dp` is a matrix that will store the minimum cost to reach a given position.
* `dp[0][0] = 0` is the base case. The minimum cost to reach the starting position is zero.
* `dp[i][j] = min(dp[i][j], dp[i - 1][j] + grid[i][j])` is the recurrence relation. We can 
   reach the position `(i, j)` from the positions `(i - 1, j)` and `(i, j - 1)`. We need to take the minimum cost 
   between these two positions and add the cost of the current position.
* The answer is `dp[maxRow][maxColumn]`, the minimum cost to reach the bottom right position.

Yay! We got the right answer, and our first start 🌟

---

### INPUT CHANGES




### PARS II

Part II was very difficult for me. Believe you or not, my daily life as a developer doesn't envolve finding the shortest
path between two points in a graph, or inverting a binary tree 👨🏻‍💻

I knew that I needed to use Dijkstra's algorithm, but I didn't know how to implement it. So I went to the internet and
watched a few videos about it. Including [this one](https://www.youtube.com/watch?v=XB4MIexjvY0){: class="external no-highlight"}.
