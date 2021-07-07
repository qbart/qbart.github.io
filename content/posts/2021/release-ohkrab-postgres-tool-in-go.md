---
draft: true
title: "Release: Oh! Krab! A PostgreSQL tool written in Go based on HCL"
date: 2021-07-07T01:32:00+02:00
tags:
- go
- postgres
- sql
- migrations
- hcl
- tool
---

For a very long time I wanted to have the system that works exaclty as I've imagined it and I am happy to announce that I finally finished MVP of my tool for PostgreSQL - [Oh! Krab!](https://ohkrab.dev) 🦀.
It's far from perfect but I needed to start somewhere, more to come.

## Why?

So the natural question is why I've created this in the first place. There are few reasons.

First, I like experimenting with different technologies and sometimes I would like to compare multiple solutions that use PostgreSQL as a database but writing migrations more than once in different frameworks or programming languages is a pain.
Managing database through other framework migration system is not an option for me.

Secondly I get hired from time to time to do small jobs in PostgreSQL (queries, schema design, etc.) and very often I don't have access to the full project so I need to mock everything.
In those situations I would write some Bash scripts that mimic this particular scenario - boooooring!

Another use case is when I do workshops or teach about the PostgreSQL I really want to work with pure SQL in a managable fashion, frameworks and ORMs would only make the image blurry.

Last but not least is the old project that I worked on. Project was written in *Ruby on Rails* and used *Apartment* gem to manage tenants
(for non-Rubists: Apartment is a library that allows to have different strategies for mutli-tenancy and integrates with Rails ORM).
It perfectly matched our scenario since we had small number of tenants and we knew it won't grow too much so we went with schema-based approach (single database with 1 schema per each tenant and public schema for other stuff).
So what's wrong with the *Apartment* then? Well it's not maintained anymore and if I remember correctly you couldn't upgrade PostgreSQL above version 10 because the way the Apartment works is by creating a dump of a database and restoring it to a new schema
and in PostgreSQL 11 dump behavior has changed a little that prevented *Apartment* to create a valid restore - I think this issue was later addressed by someone in the community with a workaround but I've never tested it.
In the past I did a presentation on how to replace *Apartment* with simple SQL using event triggers so feel free to check it out: [Schema-based multi-tenancy in PostgreSQL]({{< ref "posts/2019/slides-schema-based-multi-tenancy-in-postgresql" >}}).

It's hard to write about other reasons since "Krab" only supports one feature - migrations - which again is not polished enough to my liking but I think I will expand the topic in the future releases.


## Example

todo

## Roadmap for the nearest future

todo


