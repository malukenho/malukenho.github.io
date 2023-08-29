---
layout: post
title: "✨ Advent of Code — Day 06 <2021 />"
author: Jefersson Nathan
date: Sat Aug 27 11:23:16 CEST 2023
categories: [ post ]
description: "Day 06 - Lanternfish"
---

## DAY 6: LANTERNFISH

{: class="marginalia" }
\* Cf. [aoc. d. vi](https://adventofcode.com/2021/day/6)<br/><br/>

Today's challenge looks very easy, but it hides a trap. Let's see what it is.

As always, if you want to go straight to the code, you can check it out on
our [codelicia's repository](https://github.com/codelicia/adventofcode/tree/main/2021){: class="external no-highlight"}.

---

### THE INPUT

Well, the input is a list of numbers separated by commas. We can easily parse it into a `List<Int>`.

{: class="language-kotlin" theme="darcula" from="5" to="11"}
```kotlin
package com.codelicia.advent2021

class Day06(input: String) {

    private var map: MutableList<Long> = mutableListOf<Long>().apply {
        (0..8).forEach { _ -> this.add(0L) }
    }

    init {
        input.split(",").map { map.set(it.toInt(), map[it.toInt()] + 1L) }
    }

    fun part1(days: Int = 80): Long {
        // Rotate map and add quantity on 0 to 6
        repeat(days) {
            val first = map.removeFirst()
            map.add(first)
            map[6] += first
        }

        return map.sum()
    }

    fun part2(days: Int = 256) = part1(days)
}
```

---

### PARS I

At this point in the problem, I was thinking that it would be a simple matter of rotating the list and adding the
quantity of the first element to the last element. But I was wrong. The problem is that the list is too big and it
takes too long to rotate it. So I had to find a way to rotate it without actually rotating it.

{: class="language-kotlin" theme="darcula" from="13" to="22"}
```kotlin
package com.codelicia.advent2021

class Day06(input: String) {

    private var map: MutableList<Long> = mutableListOf<Long>().apply {
        (0..8).forEach { _ -> this.add(0L) }
    }

    init {
        input.split(",").map { map.set(it.toInt(), map[it.toInt()] + 1L) }
    }

    fun part1(days: Int = 80): Long {
        // Rotate map and add quantity on 0 to 6
        repeat(days) {
            val first = map.removeFirst()
            map.add(first)
            map[6] += first
        }

        return map.sum()
    }

    fun part2(days: Int = 256) = part1(days)
}
```

---

### PARS II

We can apply the exactly same code to the second part of the problem. The only difference is that we will have to
increase the number of days to 256.

{: class="language-kotlin" theme="darcula" from="24" to="24"}
```kotlin
package com.codelicia.advent2021

class Day06(input: String) {

    private var map: MutableList<Long> = mutableListOf<Long>().apply {
        (0..8).forEach { _ -> this.add(0L) }
    }

    init {
        input.split(",").map { map.set(it.toInt(), map[it.toInt()] + 1L) }
    }

    fun part1(days: Int = 80): Long {
        // Rotate map and add quantity on 0 to 6
        repeat(days) {
            val first = map.removeFirst()
            map.add(first)
            map[6] += first
        }

        return map.sum()
    }

    fun part2(days: Int = 256) = part1(days)
}
```

See you in the next one!