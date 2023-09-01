---
layout: post
title: "✨ Advent of Code — Day 07 <2021 />"
author: Jefersson Nathan
date: Sat Aug 29 11:23:16 CEST 2023
categories: [ post ]
description: "Day 07 - The Treachery of Whales"
---

## DAY 7: THE TREACHERY OF WHALES

{: class="marginalia" }
\* Cf. [aoc. d. vii](https://adventofcode.com/2021/day/7)<br/><br/>

Today's challenge consist in finding the minimum cost to align a list of numbers.
Meaning that at the end of the process, all numbers will be equal.

As always, if you want to go straight to the code, you can check it out on
our [codelicia's repository](https://github.com/codelicia/adventofcode/tree/main/2021){: class="external no-highlight"}.

---

### THE INPUT

{: class="marginalia" }
\* Cf. [aoc. d. vi](https://adventofcode.com/2021/day/6)<br/><br/>

We were given a `String` representing a list of numbers separated by commas.
As we did for the * previous day, we can easily parse it into a `List<Int>` using
`input.split(",").map { it.toInt() }`.

As our job here is to make all numbers equal, we can deduce that we will need to
find a range of valid possible numbers.

{: class="language-kotlin" theme="darcula" from="7" to="7"}
```kotlin
package com.codelicia.advent2021

import kotlin.math.absoluteValue
import kotlin.math.min

class Day07(val crabs: List<Int>) {
    private fun List<Int>.range() = this.min()..this.max()
    
    public fun range() = crabs.range()
}

fun main(): Unit = println(Day07(listOf(16,1,2,0,4,2,7,1,2,14)).range())
```

---

### PARS I

The first part of the challenge is to find the minimum cost to align the numbers.
That is quite straightforward. We can try all combinations in the range and find
the one with the minimum cost.

{: class="language-kotlin" theme="darcula" from="9" to="12"}
```kotlin
package com.codelicia.advent2021

import kotlin.math.absoluteValue
import kotlin.math.min

class Day07(val crabs: List<Int>) {
    private fun List<Int>.range() = this.min()..this.max()
    
    fun part1(): Int = crabs.range()
        .minOfOrNull { position -> crabs.sumOf {
            crab -> (position - crab).absoluteValue
        }}!!
}

fun main(): Unit = println(Day07(listOf(16,1,2,0,4,2,7,1,2,14)).part1())
```

We just solved part one! 🎉

---

### PARS II

Now the algorithm should change a little bit. We need to find the minimum cost
to align the numbers, but we every change on a number, costs 1 more than the previous
change.

Suppose I want the number `3` to be `0`:

| Number (--n) | Cost (n += n + 1) |
|--------------|-------------------|
| 3            | 0                 |
| 2            | 1                 |
| 1            | 2                 |
| 0            | 3                 |
| total        | 6                 |

<br />

{: class="language-kotlin" theme="darcula" from="14" to="30"}
```kotlin
package com.codelicia.advent2021

import kotlin.math.absoluteValue
import kotlin.math.min

class Day07(val crabs: List<Int>) {
    private fun List<Int>.range() = this.min()..this.max()
    
    fun part1(): Int = crabs.range()
        .minOfOrNull { position -> crabs.sumOf {
            crab -> (position - crab).absoluteValue
        }}!!
        
     fun part2(): Int {
        var fuelConsumption = Int.MAX_VALUE

        val memoization = HashMap<Int, Int>()
        for (horizontalPosition in 1..crabs.max()) {
            val previous = memoization.getOrElse(horizontalPosition - 1) { 0 }
            memoization[horizontalPosition] = previous + 1
        }

        for (horizontalPosition in 1..crabs.max()) {
            fuelConsumption = min(fuelConsumption, crabs.map { x ->
                memoization.values.take((x - horizontalPosition).absoluteValue).sum()
            }.sum())
        }

        return fuelConsumption
    }
}

fun main(): Unit = println(Day07(listOf(16,1,2,0,4,2,7,1,2,14)).part2())
```

This is the solution for part two! 🎉

See you in the next one!