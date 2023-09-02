---
layout: post
title: "✨ Advent of Code — Day 08 <2021 />"
author: Jefersson Nathan
date: Sat Sep 01 11:23:16 CEST 2023
categories: [ post ]
description: "Day 08 - Seven Segment Search"
---

## DAY 8: SEVEN SEGMENT SEARCH

{: class="marginalia" }
\* Cf. [aoc. d. viii](https://adventofcode.com/2021/day/8)<br/><br/>

Today's challenge was pretty fun to solve. Given a string of 10 unique signal patterns,
followed by a four-digit output value separated by `|`. Our job is to discover the
four-digit number that is represented by the signal patterns.

```text
acedgfb cdfbe gcdfa fbcad dab cefabd cdfgeb eafb cagedb ab | ab
```

As we know that in an LCD, the only digit formed by two segments is the number 1,
`ab` is one.

A very valuable tip here is to **focus on the easy digits first**.

---

### THE INPUT

First of all, we need to transform the `String` input into a `List<String>`,
and then we can split each line by `|`. So we may have `segment` and `numbers`.

{: class="language-kotlin" theme="darcula" from="14" to="16"}
```kotlin
package com.codelicia.advent2021

class Day08(private val signals: List<String>) {

    data class SegmentMap(
        val map: Map<String, Int>,
        val decodedNumber: Int
    ) {
        companion object {
            private fun String.order() =
                this.split("").sortedDescending().joinToString(separator = "")

            fun of(input: String): SegmentMap {
                val (segment, numbers) = input.split(" | ")

                val segmentSplit = segment.split(" ")

                // Hacky ones
                val sixDigits = segmentSplit.filter { it.length == 6 }
                val fiveDigits = segmentSplit.filter { it.length == 5 }

                // Easy discoverable
                val one = segmentSplit.first { it.length == 2 }
                val four = segmentSplit.first { it.length == 4 }
                val seven = segmentSplit.first { it.length == 3 }
                val eight = segmentSplit.first { it.length == 7 }

                // Tricky
                val nine = sixDigits.first { it.split("").containsAll(four.split("")) }
                val zero = sixDigits.filter { !it.split("").containsAll(nine.split("")) }
                    .first { it.split("").containsAll(one.split("")) }
                val six = sixDigits.filter { !it.split("").containsAll(nine.split("")) }
                    .first { !it.split("").containsAll(one.split("")) }

                val three = fiveDigits.first { it.split("").containsAll(one.split("")) }
                val five = fiveDigits.first { six.split("").containsAll(it.split("")) }
                val two = fiveDigits.filter { !it.split("").containsAll(three.split("")) }
                    .first { !it.split("").containsAll(five.split("")) }

                val map = mutableMapOf<String, Int>()
                map[zero.order()] = 0
                map[one.order()] = 1
                map[two.order()] = 2
                map[three.order()] = 3
                map[four.order()] = 4
                map[five.order()] = 5
                map[six.order()] = 6
                map[seven.order()] = 7
                map[eight.order()] = 8
                map[nine.order()] = 9

                val number = numbers.split(" ").map {
                    map[it.order()]!!
                }

                return SegmentMap(map, number.joinToString(separator = "").toInt())
            }
        }
    }

    private val easyDigits = listOf(2, 3, 4, 7)

    fun part1(): Int =
        signals.map { it.split(" | ")[1].split(" ") }
            .map { segments ->
                segments.map {
                    when {
                        easyDigits.contains(it.length) -> 1
                        else -> 0
                    }
                }
            }.sumOf { it.sum() }

    fun part2(): Int =
        signals.map { SegmentMap.of(input = it) }
        .sumOf { it.decodedNumber }
}

fun main(): Unit = println("Day 08 - Seven Segment Search\nNothing to see here, we just splitted the input")
```

Let's check the numbers with unique segments are the easiest to discover.
We can start with them.

{: class="language-kotlin" theme="darcula" from="18" to="26"}
```kotlin
package com.codelicia.advent2021

class Day08(private val signals: List<String>) {

    data class SegmentMap(
        val map: Map<String, Int>,
        val decodedNumber: Int
    ) {
        companion object {
            private fun String.order() =
                this.split("").sortedDescending().joinToString(separator = "")

            fun of(input: String): SegmentMap {
                val (segment, numbers) = input.split(" | ")

                val segmentSplit = segment.split(" ")

                // Hacky ones
                val sixDigits = segmentSplit.filter { it.length == 6 }
                val fiveDigits = segmentSplit.filter { it.length == 5 }

                // Easy discoverable
                val one = segmentSplit.first { it.length == 2 }
                val four = segmentSplit.first { it.length == 4 }
                val seven = segmentSplit.first { it.length == 3 }
                val eight = segmentSplit.first { it.length == 7 }

                // Tricky
                val nine = sixDigits.first { it.split("").containsAll(four.split("")) }
                val zero = sixDigits.filter { !it.split("").containsAll(nine.split("")) }
                    .first { it.split("").containsAll(one.split("")) }
                val six = sixDigits.filter { !it.split("").containsAll(nine.split("")) }
                    .first { !it.split("").containsAll(one.split("")) }

                val three = fiveDigits.first { it.split("").containsAll(one.split("")) }
                val five = fiveDigits.first { six.split("").containsAll(it.split("")) }
                val two = fiveDigits.filter { !it.split("").containsAll(three.split("")) }
                    .first { !it.split("").containsAll(five.split("")) }

                val map = mutableMapOf<String, Int>()
                map[zero.order()] = 0
                map[one.order()] = 1
                map[two.order()] = 2
                map[three.order()] = 3
                map[four.order()] = 4
                map[five.order()] = 5
                map[six.order()] = 6
                map[seven.order()] = 7
                map[eight.order()] = 8
                map[nine.order()] = 9

                val number = numbers.split(" ").map {
                    map[it.order()]!!
                }

                return SegmentMap(map, number.joinToString(separator = "").toInt())
            }
        }
    }

    private val easyDigits = listOf(2, 3, 4, 7)

    fun part1(): Int =
        signals.map { it.split(" | ")[1].split(" ") }
            .map { segments ->
                segments.map {
                    when {
                        easyDigits.contains(it.length) -> 1
                        else -> 0
                    }
                }
            }.sumOf { it.sum() }

    fun part2(): Int =
        signals.map { SegmentMap.of(input = it) }
        .sumOf { it.decodedNumber }
}

fun main(): Unit = println("Day 08 - Seven Segment Search\nNothing to see here, we are still working on the input")
```

The other digits are a little bit tricky to discover. But I'm sure if you think a
little bit about it, you will find a way to discover them. Basically, I've compared
the easy ones with the tricky ones to find them. For example, to find the number `9`,
I've compared a number with `6` segments - which could be `6`, or `9`, with the number
`4`. The segment that contains all chars from `4` is the number `9`.

{: class="language-kotlin" theme="darcula" from="28" to="38"}
```kotlin
package com.codelicia.advent2021

class Day08(private val signals: List<String>) {

    data class SegmentMap(
        val map: Map<String, Int>,
        val decodedNumber: Int
    ) {
        companion object {
            private fun String.order() =
                this.split("").sortedDescending().joinToString(separator = "")

            fun of(input: String): SegmentMap {
                val (segment, numbers) = input.split(" | ")

                val segmentSplit = segment.split(" ")

                // Hacky ones
                val sixDigits = segmentSplit.filter { it.length == 6 }
                val fiveDigits = segmentSplit.filter { it.length == 5 }

                // Easy discoverable
                val one = segmentSplit.first { it.length == 2 }
                val four = segmentSplit.first { it.length == 4 }
                val seven = segmentSplit.first { it.length == 3 }
                val eight = segmentSplit.first { it.length == 7 }

                // Tricky
                val nine = sixDigits.first { it.split("").containsAll(four.split("")) }
                val zero = sixDigits.filter { !it.split("").containsAll(nine.split("")) }
                    .first { it.split("").containsAll(one.split("")) }
                val six = sixDigits.filter { !it.split("").containsAll(nine.split("")) }
                    .first { !it.split("").containsAll(one.split("")) }

                val three = fiveDigits.first { it.split("").containsAll(one.split("")) }
                val five = fiveDigits.first { six.split("").containsAll(it.split("")) }
                val two = fiveDigits.filter { !it.split("").containsAll(three.split("")) }
                    .first { !it.split("").containsAll(five.split("")) }

                val map = mutableMapOf<String, Int>()
                map[zero.order()] = 0
                map[one.order()] = 1
                map[two.order()] = 2
                map[three.order()] = 3
                map[four.order()] = 4
                map[five.order()] = 5
                map[six.order()] = 6
                map[seven.order()] = 7
                map[eight.order()] = 8
                map[nine.order()] = 9

                val number = numbers.split(" ").map {
                    map[it.order()]!!
                }

                return SegmentMap(map, number.joinToString(separator = "").toInt())
            }
        }
    }

    private val easyDigits = listOf(2, 3, 4, 7)

    fun part1(): Int =
        signals.map { it.split(" | ")[1].split(" ") }
            .map { segments ->
                segments.map {
                    when {
                        easyDigits.contains(it.length) -> 1
                        else -> 0
                    }
                }
            }.sumOf { it.sum() }

    fun part2(): Int =
        signals.map { SegmentMap.of(input = it) }
        .sumOf { it.decodedNumber }
}

fun main(): Unit = println("Day 08 - Seven Segment Search\nNothing to see here, we just solving tricky numbers")
input")
```

At the end of it, I've built a `Map<String, Int>` to map the segment to the number.
Then I've created a map with the decoded digits - Just in case I need it later.

{: class="language-kotlin" theme="darcula" from="40" to="54"}
```kotlin
package com.codelicia.advent2021

class Day08(private val signals: List<String>) {

    data class SegmentMap(
        val map: Map<String, Int>,
        val decodedNumber: Int
    ) {
        companion object {
            private fun String.order() =
                this.split("").sortedDescending().joinToString(separator = "")

            fun of(input: String): SegmentMap {
                val (segment, numbers) = input.split(" | ")

                val segmentSplit = segment.split(" ")

                // Hacky ones
                val sixDigits = segmentSplit.filter { it.length == 6 }
                val fiveDigits = segmentSplit.filter { it.length == 5 }

                // Easy discoverable
                val one = segmentSplit.first { it.length == 2 }
                val four = segmentSplit.first { it.length == 4 }
                val seven = segmentSplit.first { it.length == 3 }
                val eight = segmentSplit.first { it.length == 7 }

                // Tricky
                val nine = sixDigits.first { it.split("").containsAll(four.split("")) }
                val zero = sixDigits.filter { !it.split("").containsAll(nine.split("")) }
                    .first { it.split("").containsAll(one.split("")) }
                val six = sixDigits.filter { !it.split("").containsAll(nine.split("")) }
                    .first { !it.split("").containsAll(one.split("")) }

                val three = fiveDigits.first { it.split("").containsAll(one.split("")) }
                val five = fiveDigits.first { six.split("").containsAll(it.split("")) }
                val two = fiveDigits.filter { !it.split("").containsAll(three.split("")) }
                    .first { !it.split("").containsAll(five.split("")) }

                val map = mutableMapOf<String, Int>()
                map[zero.order()] = 0
                map[one.order()] = 1
                map[two.order()] = 2
                map[three.order()] = 3
                map[four.order()] = 4
                map[five.order()] = 5
                map[six.order()] = 6
                map[seven.order()] = 7
                map[eight.order()] = 8
                map[nine.order()] = 9

                val number = numbers.split(" ").map {
                    map[it.order()]!!
                }

                return SegmentMap(map, number.joinToString(separator = "").toInt())
            }
        }
    }

    private val easyDigits = listOf(2, 3, 4, 7)

    fun part1(): Int =
        signals.map { it.split(" | ")[1].split(" ") }
            .map { segments ->
                segments.map {
                    when {
                        easyDigits.contains(it.length) -> 1
                        else -> 0
                    }
                }
            }.sumOf { it.sum() }

    fun part2(): Int =
        signals.map { SegmentMap.of(input = it) }
        .sumOf { it.decodedNumber }
}

fun main(): Unit = println("Day 08 - Seven Segment Search\nNothing to see here, we just added a Map")
```

To finish it up, I've encapsulated the logic into a `SegmentMap` class.

{: class="language-kotlin" theme="darcula" from="5" to="59"}
```kotlin
package com.codelicia.advent2021

class Day08(private val signals: List<String>) {

    data class SegmentMap(
        val map: Map<String, Int>,
        val decodedNumber: Int
    ) {
        companion object {
            private fun String.order() =
                this.split("").sortedDescending().joinToString(separator = "")

            fun of(input: String): SegmentMap {
                val (segment, numbers) = input.split(" | ")

                val segmentSplit = segment.split(" ")

                // Hacky ones
                val sixDigits = segmentSplit.filter { it.length == 6 }
                val fiveDigits = segmentSplit.filter { it.length == 5 }

                // Easy discoverable
                val one = segmentSplit.first { it.length == 2 }
                val four = segmentSplit.first { it.length == 4 }
                val seven = segmentSplit.first { it.length == 3 }
                val eight = segmentSplit.first { it.length == 7 }

                // Tricky
                val nine = sixDigits.first { it.split("").containsAll(four.split("")) }
                val zero = sixDigits.filter { !it.split("").containsAll(nine.split("")) }
                    .first { it.split("").containsAll(one.split("")) }
                val six = sixDigits.filter { !it.split("").containsAll(nine.split("")) }
                    .first { !it.split("").containsAll(one.split("")) }

                val three = fiveDigits.first { it.split("").containsAll(one.split("")) }
                val five = fiveDigits.first { six.split("").containsAll(it.split("")) }
                val two = fiveDigits.filter { !it.split("").containsAll(three.split("")) }
                    .first { !it.split("").containsAll(five.split("")) }

                val map = mutableMapOf<String, Int>()
                map[zero.order()] = 0
                map[one.order()] = 1
                map[two.order()] = 2
                map[three.order()] = 3
                map[four.order()] = 4
                map[five.order()] = 5
                map[six.order()] = 6
                map[seven.order()] = 7
                map[eight.order()] = 8
                map[nine.order()] = 9

                val number = numbers.split(" ").map {
                    map[it.order()]!!
                }

                return SegmentMap(map, number.joinToString(separator = "").toInt())
            }
        }
    }

    private val easyDigits = listOf(2, 3, 4, 7)

    fun part1(): Int =
        signals.map { it.split(" | ")[1].split(" ") }
            .map { segments ->
                segments.map {
                    when {
                        easyDigits.contains(it.length) -> 1
                        else -> 0
                    }
                }
            }.sumOf { it.sum() }

    fun part2(): Int =
        signals.map { SegmentMap.of(input = it) }
        .sumOf { it.decodedNumber }
}

fun main(): Unit = println("Day 08 - Seven Segment Search\nNothing to see here, we just added the SegmentMap class")
```

---

### PARS I

Part one is quite simple. We just need to count the number of times we found the digits
`1`, `4`, `7`, or `8` in the decoded numbers. To solve this part, we don't even need to use
our `SegmentMap` class. We can solve it by just comparing the length of the segments.

{: class="language-kotlin" theme="darcula" from="61" to="72"}
```kotlin
package com.codelicia.advent2021

class Day08(private val signals: List<String>) {

    data class SegmentMap(
        val map: Map<String, Int>,
        val decodedNumber: Int
    ) {
        companion object {
            private fun String.order() =
                this.split("").sortedDescending().joinToString(separator = "")

            fun of(input: String): SegmentMap {
                val (segment, numbers) = input.split(" | ")

                val segmentSplit = segment.split(" ")

                // Hacky ones
                val sixDigits = segmentSplit.filter { it.length == 6 }
                val fiveDigits = segmentSplit.filter { it.length == 5 }

                // Easy discoverable
                val one = segmentSplit.first { it.length == 2 }
                val four = segmentSplit.first { it.length == 4 }
                val seven = segmentSplit.first { it.length == 3 }
                val eight = segmentSplit.first { it.length == 7 }

                // Tricky
                val nine = sixDigits.first { it.split("").containsAll(four.split("")) }
                val zero = sixDigits.filter { !it.split("").containsAll(nine.split("")) }
                    .first { it.split("").containsAll(one.split("")) }
                val six = sixDigits.filter { !it.split("").containsAll(nine.split("")) }
                    .first { !it.split("").containsAll(one.split("")) }

                val three = fiveDigits.first { it.split("").containsAll(one.split("")) }
                val five = fiveDigits.first { six.split("").containsAll(it.split("")) }
                val two = fiveDigits.filter { !it.split("").containsAll(three.split("")) }
                    .first { !it.split("").containsAll(five.split("")) }

                val map = mutableMapOf<String, Int>()
                map[zero.order()] = 0
                map[one.order()] = 1
                map[two.order()] = 2
                map[three.order()] = 3
                map[four.order()] = 4
                map[five.order()] = 5
                map[six.order()] = 6
                map[seven.order()] = 7
                map[eight.order()] = 8
                map[nine.order()] = 9

                val number = numbers.split(" ").map {
                    map[it.order()]!!
                }

                return SegmentMap(map, number.joinToString(separator = "").toInt())
            }
        }
    }

    private val easyDigits = listOf(2, 3, 4, 7)

    fun part1(): Int =
        signals.map { it.split(" | ")[1].split(" ") }
            .map { segments ->
                segments.map {
                    when {
                        easyDigits.contains(it.length) -> 1
                        else -> 0
                    }
                }
            }.sumOf { it.sum() }

    fun part2(): Int =
        signals.map { SegmentMap.of(input = it) }
        .sumOf { it.decodedNumber }
}

fun main(): Unit = println(Day08("""be cfbegad cbdgef fgaecd cgeb fdcge agebfd fecdb fabcd edb | fdgacbe cefdb cefbgd gcbe
edbfga begcd cbg gc gcadebf fbgde acbgfd abcde gfcbed gfec | fcgedb cgb dgebacf gc
fgaebd cg bdaec gdafb agbcfd gdcbef bgcad gfac gcb cdgabef | cg cg fdcagb cbg
fbegcd cbd adcefb dageb afcb bc aefdc ecdab fgdeca fcdbega | efabcd cedba gadfec cb
aecbfdg fbg gf bafeg dbefa fcge gcbea fcaegb dgceab fcbdga | gecf egdcabf bgf bfgea
fgeab ca afcebg bdacfeg cfaedg gcfdb baec bfadeg bafgc acf | gebdcfa ecba ca fadegcb
dbcfg fgd bdegcaf fgec aegbdf ecdfab fbedc dacgb gdcebf gf | cefg dcbef fcge gbcadfe
bdfegc cbegaf gecbf dfcage bdacg ed bedf ced adcbefg gebcd | ed bcgafe cdgba cbgef
egadfb cdbfeg cegd fecab cgb gbdefca cg fgcdab egfdb bfceg | gbdfcae bgc cg cgb
gcafb gcf dcaebfg ecagb gf abcdeg gaef cafbge fdbac fegbdc | fgae cfgab fg bagce""".split("\n")).part1())
```

Part one! 🎉

---

### PARS II

Part two ask us to give the sum of all decoded numbers. It is very easy now.

{: class="language-kotlin" theme="darcula" from="74" to="76"}
```kotlin
package com.codelicia.advent2021

class Day08(private val signals: List<String>) {

    data class SegmentMap(
        val map: Map<String, Int>,
        val decodedNumber: Int
    ) {
        companion object {
            private fun String.order() =
                this.split("").sortedDescending().joinToString(separator = "")

            fun of(input: String): SegmentMap {
                val (segment, numbers) = input.split(" | ")

                val segmentSplit = segment.split(" ")

                // Hacky ones
                val sixDigits = segmentSplit.filter { it.length == 6 }
                val fiveDigits = segmentSplit.filter { it.length == 5 }

                // Easy discoverable
                val one = segmentSplit.first { it.length == 2 }
                val four = segmentSplit.first { it.length == 4 }
                val seven = segmentSplit.first { it.length == 3 }
                val eight = segmentSplit.first { it.length == 7 }

                // Tricky
                val nine = sixDigits.first { it.split("").containsAll(four.split("")) }
                val zero = sixDigits.filter { !it.split("").containsAll(nine.split("")) }
                    .first { it.split("").containsAll(one.split("")) }
                val six = sixDigits.filter { !it.split("").containsAll(nine.split("")) }
                    .first { !it.split("").containsAll(one.split("")) }

                val three = fiveDigits.first { it.split("").containsAll(one.split("")) }
                val five = fiveDigits.first { six.split("").containsAll(it.split("")) }
                val two = fiveDigits.filter { !it.split("").containsAll(three.split("")) }
                    .first { !it.split("").containsAll(five.split("")) }

                val map = mutableMapOf<String, Int>()
                map[zero.order()] = 0
                map[one.order()] = 1
                map[two.order()] = 2
                map[three.order()] = 3
                map[four.order()] = 4
                map[five.order()] = 5
                map[six.order()] = 6
                map[seven.order()] = 7
                map[eight.order()] = 8
                map[nine.order()] = 9

                val number = numbers.split(" ").map {
                    map[it.order()]!!
                }

                return SegmentMap(map, number.joinToString(separator = "").toInt())
            }
        }
    }

    private val easyDigits = listOf(2, 3, 4, 7)

    fun part1(): Int =
        signals.map { it.split(" | ")[1].split(" ") }
            .map { segments ->
                segments.map {
                    when {
                        easyDigits.contains(it.length) -> 1
                        else -> 0
                    }
                }
            }.sumOf { it.sum() }

    fun part2(): Int =
        signals.map { SegmentMap.of(input = it) }
        .sumOf { it.decodedNumber }
}

fun main(): Unit = println(Day08("""be cfbegad cbdgef fgaecd cgeb fdcge agebfd fecdb fabcd edb | fdgacbe cefdb cefbgd gcbe
edbfga begcd cbg gc gcadebf fbgde acbgfd abcde gfcbed gfec | fcgedb cgb dgebacf gc
fgaebd cg bdaec gdafb agbcfd gdcbef bgcad gfac gcb cdgabef | cg cg fdcagb cbg
fbegcd cbd adcefb dageb afcb bc aefdc ecdab fgdeca fcdbega | efabcd cedba gadfec cb
aecbfdg fbg gf bafeg dbefa fcge gcbea fcaegb dgceab fcbdga | gecf egdcabf bgf bfgea
fgeab ca afcebg bdacfeg cfaedg gcfdb baec bfadeg bafgc acf | gebdcfa ecba ca fadegcb
dbcfg fgd bdegcaf fgec aegbdf ecdfab fbedc dacgb gdcebf gf | cefg dcbef fcge gbcadfe
bdfegc cbegaf gecbf dfcage bdacg ed bedf ced adcbefg gebcd | ed bcgafe cdgba cbgef
egadfb cdbfeg cegd fecab cgb gbdefca cg fgcdab egfdb bfceg | gbdfcae bgc cg cgb
gcafb gcf dcaebfg ecagb gf abcdeg gaef cafbge fdbac fegbdc | fgae cfgab fg bagce""".split("\n")).part2())
```

See you in the next one!