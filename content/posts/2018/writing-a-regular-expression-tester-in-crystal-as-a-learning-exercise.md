---
draft: false
title: "Writing a Regular Expression Tester in Crystal as a Learning Exercise"
date: 2018-06-08T18:00:00+02:00
categories:
- web
tags:
- regex
- crystal
- regular expressions
---

{{< fig src="/posts/2018/crystular.png" caption="App screenshot" >}}

## TL;DR for those in a rush

I did this: [http://www.crystular.org/](http://www.crystular.org/).
This article was originally published [here](https://medium.com/selleo/writing-a-regular-expression-tester-in-crystal-as-a-learning-exercise-481935d6672f).


## Boring introduction

As a part-time Rubyist, I couldn't ignore [Crystal](https://crystal-lang.org/) any longer (+ I enjoy learning new programming languages) so I decided to give it a try. Because I wanted to write something useful and contribute to the community, I was looking for a small idea in the Ruby world and spoiler alert… I found it.

One of my favourite online tools is [Rubular](https://rubular.com/) - a regular expression tester for Ruby so I've decided to make a copy of it for Crystal because every programming language needs one.


## Notes about regex engine

Crystal uses [PCRE](http://www.pcre.org/) which is a C library for regular expressions. For a contrast, Ruby uses Onigmo library (since 2.x). There are few differences that are worth mentioning between Crystal integration of PCRE and regex library itself.

Firstly, PCRE offers support for other encodings but Crystal strings are UTF-8 only, therefore regular expressions must be UTF-8 too.

Secondly, one of the regex options in Crystal is a multiline match denoted by `"m"` flag that translates into a combination of two separate options in PCRE:

- **PCRE_DOTALL** - changes the behavior of `.` in regex
- **PCRE_MULTILINE** - changes the behavior of `^` and `$` in regex

FYI, Ruby does it too in its own engine.


## Implementation

While working on the project I wanted to add some minor tweaks that would improve, in my opinion, your *"regular expression testing experience"*. Here is the list of what I had planned:

- improved whitespace characters display and turned on by default (every space/tab/newline is rendered as a special character in a different color)

- clearer distinction when matched strings are next to each other (matches are highlighted with rounded corners selection)

- extended reference sheet by adding examples like "positive lookbehind" because who remembers that syntax? (not me, I need to google it every time)

Once my goals were set, I had to choose web framework and I had a couple options here: [Amber](https://amberframework.org/), [Lucky](https://luckyframework.org/) and [Kemal](https://kemalcr.com/). I went with Kemal as it seemed like a no-brainer, considering the size of the application (two endpoints, one view). Deployment to Heroku was also a breeze thanks to the existing [buildpack](https://github.com/crystal-lang/heroku-buildpack-crystal).

Because of the statically type-checked nature of the language doing TDD requires a bit different approach especially, if you declare your types explicitly - sometimes you just need to write some dummy code in the method just to make compilation successful. The same affects `nils`, crystal will know if your code results in `nil` so the compilation process might fail, but that's just Crystal having your back and protecting you from unhandled exceptions.

There were a few occasions when I had to intensively browse the code in GitHub to understand Kemal or Crystal standard library but this is a part of the learning process so I am fine with it. Also, these projects are still young, at that stage, it's pretty normal.

Things I wish to see improved are better support for specs, it's quite ok now but I guess [RSpec](https://github.com/rspec) spoiled me, and I am hoping for some solid debugging process.

The code can be found [here](https://github.com/Selleo/crystular).

## Closing thoughts

After finishing the project, I was happy with the result and the things I've learned. It was surprising how quickly you can transition to Crystal having a background in Ruby so if you are a Rubyist, I recommend you to try Crystal out.
