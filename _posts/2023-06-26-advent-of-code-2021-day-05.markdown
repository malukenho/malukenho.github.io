---
layout: post
title: "✨ Advent of Code — Day 05 <2021 />"
author: Jefersson Nathan
date: Sat Jun 10 11:23:16 CEST 2023
categories: [ post ]
description: "Day 05 - Hydrothermal Venture"
---

## DAY 5: HYDROTHERMAL VENTURE

{: class="marginalia" }
\* Cf. [aoc. d. v](https://adventofcode.com/2021/day/5)<br/><br/>

Today's challenge takes us to the ocean floor, where we encounter a field of hydrothermal vents. Our mission
is to navigate through these vents and identify the points where at least two lines overlap. This challenge
tests our understanding of line segments, intersections, and the ability to handle both horizontal/vertical
lines and diagonal lines. So, let's dive in and explore the depths of this intriguing puzzle!

As always, if you want to go straight to the code, you can check it out on
our [codelicia's repository](https://github.com/codelicia/adventofcode/tree/main/2021){: class="external no-highlight"}.

---

### THE INPUT

As always we first have to parse the input. I've decided to add some helper types to make the code more readable.

{: class="language-kotlin" theme="darcula" from="1" to="2"}
```kotlin
typealias Vent = Pair<Int, Int>
typealias VentLine = Pair<Vent, Vent>

fun main(): Unit = println("Nothing to see here yet!")
```

Let's also add a companion object for easy instantiation of the `Vent` type.

{: class="language-kotlin" theme="darcula" from="16" to="19" format=false}
```kotlin
typealias Vent = Pair<Int, Int>
typealias VentLine = Pair<Vent, Vent>

class Day05(input: String) {

    private val vents: List<VentLine> = input.trimIndent()
        .lines()
        .map { x ->
            val xs = x.split(" -> ")

            Vent(xs[0]) to Vent(xs[1])
        }
        
   fun getVents(): List<VentLine> = this.vents

   companion object {
       private fun Vent(s: String): Vent =
           s.split(",").first().toInt() to s.split(",").last().toInt()
   }
}
        
fun main(): Unit = println(Day05("""
            0,9 -> 5,9
            8,0 -> 0,8
            9,4 -> 3,4
            2,2 -> 2,1
            7,0 -> 7,4
            6,4 -> 2,0
            0,9 -> 2,9
            3,4 -> 1,4
            0,0 -> 8,8
            5,5 -> 8,2
        """).getVents())
```

After these simple lines I've jumped to the parsing.

{: class="language-kotlin" theme="darcula" from="6" to="12"}
```kotlin
typealias Vent = Pair<Int, Int>
typealias VentLine = Pair<Vent, Vent>

class Day05(input: String) {

    private val vents: List<VentLine> = input.trimIndent()
        .lines()
        .map { x ->
            val xs = x.split(" -> ")

            Vent(xs[0]) to Vent(xs[1])
        }
        
   fun getVents(): List<VentLine> = this.vents

   companion object {
       private fun Vent(s: String): Vent =
           s.split(",").first().toInt() to s.split(",").last().toInt()
   }
}
        
fun main(): Unit = println(Day05("""
            0,9 -> 5,9
            8,0 -> 0,8
            9,4 -> 3,4
            2,2 -> 2,1
            7,0 -> 7,4
            6,4 -> 2,0
            0,9 -> 2,9
            3,4 -> 1,4
            0,0 -> 8,8
            5,5 -> 8,2
        """).getVents())
```

With that we have a `List<VentLine>`.

---

### PARS I

First of all I needed to know what the VentLine represents. Is that a vertical line?
A horizontal line? A diagonal line?

We can quite quick find out if it is a vertical or horizontal line by checking if the
first and second elements of the `Vent` are the same. Horizontal lines have the same
first element (row), while vertical lines have the same second element (column). The
diagonal has neither of these elements the same.

{: class="language-kotlin" theme="darcula" from="14" to="21"}
```kotlin
typealias Vent = Pair<Int, Int>
typealias VentLine = Pair<Vent, Vent>

class Day05(input: String) {

    private val vents: List<VentLine> = input.trimIndent()
        .lines()
        .map { x ->
            val xs = x.split(" -> ")

            Vent(xs[0]) to Vent(xs[1])
        }
        
    private fun VentLine.isDiagonal() =
        first.first != second.first && first.second != second.second

    private fun VentLine.isHorizontal() =
        first.first != second.first

    private fun VentLine.isVertical() =
        first.second != second.second
        
   fun getVents(): List<VentLine> = this.vents

   companion object {
       private fun Vent(s: String): Vent =
           s.split(",").first().toInt() to s.split(",").last().toInt()
   }
}

private fun VentLine.isDiagonal() =
    first.first != second.first && first.second != second.second

private fun VentLine.isHorizontal() =
    first.first != second.first

private fun VentLine.isVertical() =
    first.second != second.second
        
fun main(): Unit = Day05("""
            0,9 -> 5,9
            8,0 -> 0,8
            9,4 -> 3,4
            2,2 -> 2,1
            7,0 -> 7,4
            6,4 -> 2,0
            0,9 -> 2,9
            3,4 -> 1,4
            0,0 -> 8,8
            5,5 -> 8,2
        """)
        .getVents()
        .forEach { 
            print("$it -> diagonal: ${it.isDiagonal()};")
            print("horizontal: ${it.isHorizontal()};")
            println("vertical: ${it.isVertical()}")
        }
```

Why I'm handling diagonal values now if the problem only asks for horizontal and vertical lines? Because it will be
needed for the second part. I just perceived that by reading at the problem statement.

My solution envolves creating ranges for the horizontal and vertical lines, and then checking if the ranges shares some
points. For that I'll need some methods to **expand** the ranges.

{: class="language-kotlin" theme="darcula" from="17" to="25"}
```kotlin
import kotlin.math.max
import kotlin.math.min

typealias Vent = Pair<Int, Int>
typealias VentLine = Pair<Vent, Vent>

class Day05(input: String) {

    private val vents: List<VentLine> = input.trimIndent()
        .lines()
        .map { x ->
            val xs = x.split(" -> ")

            Vent(xs[0]) to Vent(xs[1])
        }

    private fun VentLine.diagonalRange(): List<Vent> =
        (if (first.second < second.second) horizontalRange().reversed() else horizontalRange())
            .zip(if (first.first < second.first) verticalRange().reversed() else verticalRange())

    private fun VentLine.horizontalRange(): IntRange =
        min(first.first, second.first)..max(first.first, second.first)

    private fun VentLine.verticalRange(): IntRange =
        min(first.second, second.second)..max(first.second, second.second)
        
    private fun VentLine.isDiagonal() =
        first.first != second.first && first.second != second.second

    private fun VentLine.isHorizontal() =
        first.first != second.first

    private fun VentLine.isVertical() =
        first.second != second.second
        
   fun getVents(): List<VentLine> = this.vents

   companion object {
       private fun Vent(s: String): Vent =
           s.split(",").first().toInt() to s.split(",").last().toInt()
   }
}

private fun VentLine.isDiagonal() =
    first.first != second.first && first.second != second.second

private fun VentLine.isHorizontal() =
    first.first != second.first

private fun VentLine.isVertical() =
    first.second != second.second
        
fun main(): Unit = Day05("""
            0,9 -> 5,9
            8,0 -> 0,8
            9,4 -> 3,4
            2,2 -> 2,1
            7,0 -> 7,4
            6,4 -> 2,0
            0,9 -> 2,9
            3,4 -> 1,4
            0,0 -> 8,8
            5,5 -> 8,2
        """)
        .getVents()
        .forEach { 
            print("$it -> diagonal: ${it.isDiagonal()};")
            print("horizontal: ${it.isHorizontal()};")
            println("vertical: ${it.isVertical()}")
        }
```
---

### PARS I - FOR REAL

Checking for overlaps is easy now. I just need to check if the ranges intersects. I'll create a group with each 
number and the times it appears in both ranges. Then return the ones that appears more than once.

{: class="language-kotlin" theme="darcula" from="36" to="48"}
```kotlin
import kotlin.math.max
import kotlin.math.min

typealias Vent = Pair<Int, Int>
typealias VentLine = Pair<Vent, Vent>

class Day05(input: String) {

    private val vents: List<VentLine> = input.trimIndent()
        .lines()
        .map { x ->
            val xs = x.split(" -> ")

            Vent(xs[0]) to Vent(xs[1])
        }

    private fun VentLine.diagonalRange(): List<Vent> =
        (if (first.second < second.second) horizontalRange().reversed() else horizontalRange())
            .zip(if (first.first < second.first) verticalRange().reversed() else verticalRange())

    private fun VentLine.horizontalRange(): IntRange =
        min(first.first, second.first)..max(first.first, second.first)

    private fun VentLine.verticalRange(): IntRange =
        min(first.second, second.second)..max(first.second, second.second)
        
    private fun VentLine.isDiagonal() =
        first.first != second.first && first.second != second.second

    private fun VentLine.isHorizontal() =
        first.first != second.first

    private fun VentLine.isVertical() =
        first.second != second.second
        
    private fun overlaps(): Int =
        vents.map { line ->
            return@map when {
                line.isDiagonal() -> emptyList<String>()
                line.isHorizontal() -> line.horizontalRange().map { "$it,${line.first.second}" }
                line.isVertical() -> line.verticalRange().map { "${line.first.first},$it" }
                else -> emptyList<String>()
            }
        }
            .flatten()
            .groupingBy { it }
            .eachCount()
            .count { it.value > 1 }

   fun part1(): Int = overlaps()
    
   companion object {
       private fun Vent(s: String): Vent =
           s.split(",").first().toInt() to s.split(",").last().toInt()
   }
}

fun main(): Unit = println(Day05("""
            0,9 -> 5,9
            8,0 -> 0,8
            9,4 -> 3,4
            2,2 -> 2,1
            7,0 -> 7,4
            6,4 -> 2,0
            0,9 -> 2,9
            3,4 -> 1,4
            0,0 -> 8,8
            5,5 -> 8,2
        """).part1())
```

You can notice that I had to ignore the diagonal vents, otherwise it would give me a wrong answer.

Now, in order to solve part1, we just need to call the `overlaps` function.

{: class="language-kotlin" theme="darcula" from="50" to="50"}
```kotlin
import kotlin.math.max
import kotlin.math.min

typealias Vent = Pair<Int, Int>
typealias VentLine = Pair<Vent, Vent>

class Day05(input: String) {

    private val vents: List<VentLine> = input.trimIndent()
        .lines()
        .map { x ->
            val xs = x.split(" -> ")

            Vent(xs[0]) to Vent(xs[1])
        }

    private fun VentLine.diagonalRange(): List<Vent> =
        (if (first.second < second.second) horizontalRange().reversed() else horizontalRange())
            .zip(if (first.first < second.first) verticalRange().reversed() else verticalRange())

    private fun VentLine.horizontalRange(): IntRange =
        min(first.first, second.first)..max(first.first, second.first)

    private fun VentLine.verticalRange(): IntRange =
        min(first.second, second.second)..max(first.second, second.second)
        
    private fun VentLine.isDiagonal() =
        first.first != second.first && first.second != second.second

    private fun VentLine.isHorizontal() =
        first.first != second.first

    private fun VentLine.isVertical() =
        first.second != second.second
        
    private fun overlaps(): Int =
        vents.map { line ->
            return@map when {
                line.isDiagonal() -> emptyList<String>()
                line.isHorizontal() -> line.horizontalRange().map { "$it,${line.first.second}" }
                line.isVertical() -> line.verticalRange().map { "${line.first.first},$it" }
                else -> emptyList<String>()
            }
        }
            .flatten()
            .groupingBy { it }
            .eachCount()
            .count { it.value > 1 }

   fun part1(): Int = overlaps()
    
   companion object {
       private fun Vent(s: String): Vent =
           s.split(",").first().toInt() to s.split(",").last().toInt()
   }
}

fun main(): Unit = println(Day05("""
            0,9 -> 5,9
            8,0 -> 0,8
            9,4 -> 3,4
            2,2 -> 2,1
            7,0 -> 7,4
            6,4 -> 2,0
            0,9 -> 2,9
            3,4 -> 1,4
            0,0 -> 8,8
            5,5 -> 8,2
        """).part1())
```


---

### PARS II

{: class="marginalia" }
\* **predicate** is a fancy name for functions that returns a boolean value. It is a common name in functional 
programming.

To solve our next challenge, I've introduced a * **predicate** function to treat each case individually.
In this way I can reuse the `overlaps` function to solve both parts.

{: class="language-kotlin" theme="darcula" from="38" to="55"}
```kotlin
package com.codelicia.advent2021

import kotlin.math.max
import kotlin.math.min

typealias Vent = Pair<Int, Int>
typealias VentLine = Pair<Vent, Vent>

class Day05(input: String) {

    private val vents: List<VentLine> = input.trimIndent()
        .lines()
        .map { x ->
            val xs = x.split(" -> ")

            Vent(xs[0]) to Vent(xs[1])
        }

    private fun VentLine.diagonalRange(): List<Vent> =
        (if (first.second < second.second) horizontalRange().reversed() else horizontalRange())
            .zip(if (first.first < second.first) verticalRange().reversed() else verticalRange())

    private fun VentLine.horizontalRange(): IntRange =
        min(first.first, second.first)..max(first.first, second.first)

    private fun VentLine.verticalRange(): IntRange =
        min(first.second, second.second)..max(first.second, second.second)

    private fun VentLine.isDiagonal() =
        first.first != second.first && first.second != second.second

    private fun VentLine.isHorizontal() =
        first.first != second.first

    private fun VentLine.isVertical() =
        first.second != second.second
        
    fun part1(): Int = overlaps { vent -> vent.isDiagonal() }

    fun part2(): Int = overlaps { false }

    private fun overlaps(predicate: (VentLine) -> Boolean): Int =
        vents.map { line ->
            return@map when {
                predicate(line) -> emptyList<String>()
                line.isDiagonal() -> line.diagonalRange().map { "${it.first},${it.second}" }
                line.isHorizontal() -> line.horizontalRange().map { "$it,${line.first.second}" }
                line.isVertical() -> line.verticalRange().map { "${line.first.first},$it" }
                else -> emptyList<String>()
            }
        }
            .flatten()
            .groupingBy { it }
            .eachCount()
            .count { it.value > 1 }

    companion object {
        private fun Vent(s: String): Vent =
            s.split(",").first().toInt() to s.split(",").last().toInt()
    }
}

fun main(): Unit { 
    val day5 = Day05("""
            0,9 -> 5,9
            8,0 -> 0,8
            9,4 -> 3,4
            2,2 -> 2,1
            7,0 -> 7,4
            6,4 -> 2,0
            0,9 -> 2,9
            3,4 -> 1,4
            0,0 -> 8,8
            5,5 -> 8,2
        """)
        
    println("Part 1: " + day5.part1())
    println("Part 2: " + day5.part2())
}
```

Let's see in details what is happening in this code.

{: class="language-kotlin" theme="darcula" from="43" to="51"}
```kotlin
package com.codelicia.advent2021

import kotlin.math.max
import kotlin.math.min

typealias Vent = Pair<Int, Int>
typealias VentLine = Pair<Vent, Vent>

class Day05(input: String) {

    private val vents: List<VentLine> = input.trimIndent()
        .lines()
        .map { x ->
            val xs = x.split(" -> ")

            Vent(xs[0]) to Vent(xs[1])
        }

    private fun VentLine.diagonalRange(): List<Vent> =
        (if (first.second < second.second) horizontalRange().reversed() else horizontalRange())
            .zip(if (first.first < second.first) verticalRange().reversed() else verticalRange())

    private fun VentLine.horizontalRange(): IntRange =
        min(first.first, second.first)..max(first.first, second.first)

    private fun VentLine.verticalRange(): IntRange =
        min(first.second, second.second)..max(first.second, second.second)

    private fun VentLine.isDiagonal() =
        first.first != second.first && first.second != second.second

    private fun VentLine.isHorizontal() =
        first.first != second.first

    private fun VentLine.isVertical() =
        first.second != second.second
        
    fun part1(): Int = overlaps { vent -> vent.isDiagonal() }

    fun part2(): Int = overlaps { false }

    private fun overlaps(predicate: (VentLine) -> Boolean): Int =
        vents.map { line ->
            return@map when {
                predicate(line) -> emptyList<String>()
                line.isDiagonal() -> line.diagonalRange().map { "${it.first},${it.second}" }
                line.isHorizontal() -> line.horizontalRange().map { "$it,${line.first.second}" }
                line.isVertical() -> line.verticalRange().map { "${line.first.first},$it" }
                else -> emptyList<String>()
            }
        }
            .also { println(it) }
            .flatten()
            .groupingBy { it }
            .eachCount()
            .count { it.value > 1 }

    companion object {
        private fun Vent(s: String): Vent =
            s.split(",").first().toInt() to s.split(",").last().toInt()
    }
}

fun main(): Unit { 
    Day05("""
        0,9 -> 5,9
        0,9 -> 2,9
    """).part2()
}
```

This part is converting each `VentLine` into a `List<String>` that represents the coordinates of each point in the
line. For example, the line `0,9 -> 5,9` and `0,9 -> 2,9` will be converted into `["0,9", "1,9", "2,9", "3,9", "4,9",
"5,9"]` and `["0,9", "1,9", "2,9"]` respectively. With this we have all the points that are covered by the line.
At the end of this map operation, we will have a `List<List<String>>`.

{: class="language-kotlin" theme="darcula" from="52" to="52"}
```kotlin
package com.codelicia.advent2021

import kotlin.math.max
import kotlin.math.min

typealias Vent = Pair<Int, Int>
typealias VentLine = Pair<Vent, Vent>

class Day05(input: String) {

    private val vents: List<VentLine> = input.trimIndent()
        .lines()
        .map { x ->
            val xs = x.split(" -> ")

            Vent(xs[0]) to Vent(xs[1])
        }

    private fun VentLine.diagonalRange(): List<Vent> =
        (if (first.second < second.second) horizontalRange().reversed() else horizontalRange())
            .zip(if (first.first < second.first) verticalRange().reversed() else verticalRange())

    private fun VentLine.horizontalRange(): IntRange =
        min(first.first, second.first)..max(first.first, second.first)

    private fun VentLine.verticalRange(): IntRange =
        min(first.second, second.second)..max(first.second, second.second)

    private fun VentLine.isDiagonal() =
        first.first != second.first && first.second != second.second

    private fun VentLine.isHorizontal() =
        first.first != second.first

    private fun VentLine.isVertical() =
        first.second != second.second
        
    fun part1(): Int = overlaps { vent -> vent.isDiagonal() }

    fun part2(): Int = overlaps { false }

    private fun overlaps(predicate: (VentLine) -> Boolean): Int =
        vents.map { line ->
            return@map when {
                predicate(line) -> emptyList<String>()
                line.isDiagonal() -> line.diagonalRange().map { "${it.first},${it.second}" }
                line.isHorizontal() -> line.horizontalRange().map { "$it,${line.first.second}" }
                line.isVertical() -> line.verticalRange().map { "${line.first.first},$it" }
                else -> emptyList<String>()
            }
        }
            .flatten()
            .also { println(it) }
            .groupingBy { it }
            .eachCount()
            .count { it.value > 1 }

    companion object {
        private fun Vent(s: String): Vent =
            s.split(",").first().toInt() to s.split(",").last().toInt()
    }
}

fun main(): Unit { 
    Day05("""
        0,9 -> 5,9
        0,9 -> 2,9
    """).part2()
}
```

The `flatten` function will convert a `List<List<String>>` into a `List<String>`. In our example, we will have
`["0,9", "1,9", "2,9", "3,9", "4,9", "5,9", "0,9", "1,9", "2,9"]`. Note the duplicate values.

{: class="language-kotlin" theme="darcula" from="53" to="53"}
```kotlin
package com.codelicia.advent2021

import kotlin.math.max
import kotlin.math.min

typealias Vent = Pair<Int, Int>
typealias VentLine = Pair<Vent, Vent>

class Day05(input: String) {

    private val vents: List<VentLine> = input.trimIndent()
        .lines()
        .map { x ->
            val xs = x.split(" -> ")

            Vent(xs[0]) to Vent(xs[1])
        }

    private fun VentLine.diagonalRange(): List<Vent> =
        (if (first.second < second.second) horizontalRange().reversed() else horizontalRange())
            .zip(if (first.first < second.first) verticalRange().reversed() else verticalRange())

    private fun VentLine.horizontalRange(): IntRange =
        min(first.first, second.first)..max(first.first, second.first)

    private fun VentLine.verticalRange(): IntRange =
        min(first.second, second.second)..max(first.second, second.second)

    private fun VentLine.isDiagonal() =
        first.first != second.first && first.second != second.second

    private fun VentLine.isHorizontal() =
        first.first != second.first

    private fun VentLine.isVertical() =
        first.second != second.second
        
    fun part1(): Int = overlaps { vent -> vent.isDiagonal() }

    fun part2(): Int = overlaps { false }

    private fun overlaps(predicate: (VentLine) -> Boolean): Int =
        vents.map { line ->
            return@map when {
                predicate(line) -> emptyList<String>()
                line.isDiagonal() -> line.diagonalRange().map { "${it.first},${it.second}" }
                line.isHorizontal() -> line.horizontalRange().map { "$it,${line.first.second}" }
                line.isVertical() -> line.verticalRange().map { "${line.first.first},$it" }
                else -> emptyList<String>()
            }
        }
            .flatten()
            .groupingBy { it }
            .also { println(it) }
            .eachCount()
            .count { it.value > 1 }

    companion object {
        private fun Vent(s: String): Vent =
            s.split(",").first().toInt() to s.split(",").last().toInt()
    }
}

fun main(): Unit { 
    Day05("""
        0,9 -> 5,9
        0,9 -> 2,9
    """).part2()
}
```

The `groupingBy` function will group the values by their value (`it`). The duplicate values will be grouped together.

{: class="language-kotlin" theme="darcula" from="54" to="54"}
```kotlin
package com.codelicia.advent2021

import kotlin.math.max
import kotlin.math.min

typealias Vent = Pair<Int, Int>
typealias VentLine = Pair<Vent, Vent>

class Day05(input: String) {

    private val vents: List<VentLine> = input.trimIndent()
        .lines()
        .map { x ->
            val xs = x.split(" -> ")

            Vent(xs[0]) to Vent(xs[1])
        }

    private fun VentLine.diagonalRange(): List<Vent> =
        (if (first.second < second.second) horizontalRange().reversed() else horizontalRange())
            .zip(if (first.first < second.first) verticalRange().reversed() else verticalRange())

    private fun VentLine.horizontalRange(): IntRange =
        min(first.first, second.first)..max(first.first, second.first)

    private fun VentLine.verticalRange(): IntRange =
        min(first.second, second.second)..max(first.second, second.second)

    private fun VentLine.isDiagonal() =
        first.first != second.first && first.second != second.second

    private fun VentLine.isHorizontal() =
        first.first != second.first

    private fun VentLine.isVertical() =
        first.second != second.second
        
    fun part1(): Int = overlaps { vent -> vent.isDiagonal() }

    fun part2(): Int = overlaps { false }

    private fun overlaps(predicate: (VentLine) -> Boolean): Int =
        vents.map { line ->
            return@map when {
                predicate(line) -> emptyList<String>()
                line.isDiagonal() -> line.diagonalRange().map { "${it.first},${it.second}" }
                line.isHorizontal() -> line.horizontalRange().map { "$it,${line.first.second}" }
                line.isVertical() -> line.verticalRange().map { "${line.first.first},$it" }
                else -> emptyList<String>()
            }
        }
            .flatten()
            .groupingBy { it }
            .eachCount()
            .also { println(it) }
            .count { it.value > 1 }

    companion object {
        private fun Vent(s: String): Vent =
            s.split(",").first().toInt() to s.split(",").last().toInt()
    }
}

fun main(): Unit { 
    Day05("""
        0,9 -> 5,9
        0,9 -> 2,9
    """).part2()
}
```

The `eachCount` function will count how many times each value appears in the list. The result will be a `Map<String, 
Int>`.

{: class="language-kotlin" theme="darcula" from="55" to="55"}
```kotlin
package com.codelicia.advent2021

import kotlin.math.max
import kotlin.math.min

typealias Vent = Pair<Int, Int>
typealias VentLine = Pair<Vent, Vent>

class Day05(input: String) {

    private val vents: List<VentLine> = input.trimIndent()
        .lines()
        .map { x ->
            val xs = x.split(" -> ")

            Vent(xs[0]) to Vent(xs[1])
        }

    private fun VentLine.diagonalRange(): List<Vent> =
        (if (first.second < second.second) horizontalRange().reversed() else horizontalRange())
            .zip(if (first.first < second.first) verticalRange().reversed() else verticalRange())

    private fun VentLine.horizontalRange(): IntRange =
        min(first.first, second.first)..max(first.first, second.first)

    private fun VentLine.verticalRange(): IntRange =
        min(first.second, second.second)..max(first.second, second.second)

    private fun VentLine.isDiagonal() =
        first.first != second.first && first.second != second.second

    private fun VentLine.isHorizontal() =
        first.first != second.first

    private fun VentLine.isVertical() =
        first.second != second.second
        
    fun part1(): Int = overlaps { vent -> vent.isDiagonal() }

    fun part2(): Int = overlaps { false }

    private fun overlaps(predicate: (VentLine) -> Boolean): Int =
        vents.map { line ->
            return@map when {
                predicate(line) -> emptyList<String>()
                line.isDiagonal() -> line.diagonalRange().map { "${it.first},${it.second}" }
                line.isHorizontal() -> line.horizontalRange().map { "$it,${line.first.second}" }
                line.isVertical() -> line.verticalRange().map { "${line.first.first},$it" }
                else -> emptyList<String>()
            }
        }
            .flatten()
            .groupingBy { it }
            .eachCount()
            .count { it.value > 1 }
            .also { println(it) }

    companion object {
        private fun Vent(s: String): Vent =
            s.split(",").first().toInt() to s.split(",").last().toInt()
    }
}

fun main(): Unit { 
    Day05("""
        0,9 -> 5,9
        0,9 -> 2,9
    """).part2()
}
```

We finalize the operation by counting how many values have a count greater than 1. This will be our result.

Remember that this solution is not the most efficient one, but my goal is not to solve it in the most efficient way.

That is it for today! See you in the next one!