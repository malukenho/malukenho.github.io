---
layout: post
title: "✨ Advent of Code — Day 15 <2021 />"
author: Jefersson Nathan
date: Sat Aug 28 11:23:16 CEST 2023
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

### PARS II

Part II was very difficult for me. Believe you or not, my daily life as a developer doesn't envolve finding the shortest
path between two points in a graph, or inverting a binary tree 👨🏻‍💻

{: class="marginalia" }
\* Maybe we can, if you pass twice through the graph

I knew that I needed to use Dijkstra's algorithm, but I didn't know how to implement it. So I went to the internet and
watched a few videos about it. We can't solve it using * **dynamic programming** because we need to walk in every
direction of the graph, and not only in the right and down directions.

First thing I did was to create a method to enlarge the map, after that, I created a method to find the shortest path
between two points in the graph. The `Node` class is a simple class that holds the position of the node and the cost to
reach it. It serves a helper class to the `dijkstra` method.

{: class="language-kotlin" theme="darcula" from="26" to="33"}
```kotlin
package com.codelicia.advent2021

import java.util.*
import kotlin.math.min

class Day15(val input: String) {
    // Split the input string into a 2D grid of integers
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

    fun part2(): Int {
        val heap: PriorityQueue<Node> = PriorityQueue()
        heap.add(Node(0, 0, 0))

        val g = enlargeMap().split("\n").map { it ->
            it.toCharArray().map { it.digitToInt() }
        }

        val visited: MutableSet<Pair<Int, Int>> = mutableSetOf()

        while (heap.isNotEmpty()) {
            val node = heap.poll()
            val cost = node.cost
            val x = node.x
            val y = node.y
            if (x == g.lastIndex && y == g.last().lastIndex) {
                return cost
            }
            if (x to y in visited) continue

            visited.add(x to y)

            for ((nx, ny) in listOf(x to y-1, x to y+1, x-1 to y, x+1 to y)) {
                if (nx < 0 || ny < 0 || nx > g.lastIndex || ny > g.last().lastIndex) continue
                if (nx to ny in visited) continue
                heap.add(Node(cost + g[nx][ny], nx, ny))
            }
        }

        error("Could not find the shortest path")
    }

    fun Int.inc(i: Int): Int = if (this + i > 9) (this + i) % 9 else this+i

    fun enlargeMap(): String {
        // pad right
        var s : String = ""
        for (i in 0..maxRow) {
            repeat(5) {
                repeatIdx -> s += grid[i].map { it.inc(repeatIdx) }.joinToString("")
            }
            s += "\n"
        }

        // pad bottom
        repeat(4) { rp ->
            var paddedGrid = s.split("\n").map { it -> it.toCharArray().map { it.digitToInt() } }

            for (i in 0..maxRow) {
                s += paddedGrid[i].map { it.inc(rp+1) }.joinToString("") + "\n"
            }
        }

        return s.trim()
    }

    private class Node(val cost: Int, val x: Int, val y: Int) : Comparable<Node> {
        override fun compareTo(other: Node): Int = cost.compareTo(other.cost)
    }
}
```

- [ ] Insert references
- [ ] Enlarge map
- [ ] Node class
- [ ] Priority Queue

- [ ] Dijkstra's Algorithm - Computerphile