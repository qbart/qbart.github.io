---
draft: false
title: "Experimenting With Github Actions (beta)"
date: 2019-01-05T18:00:00+02:00
categories:
- web
tags:
- docker
- github
- github actions
- aws
- pipeline
- ci
---

This article was originally published [here](https://medium.com/selleo/experimenting-with-github-actions-beta-760e61fab0e1).

With the upcoming new GitHub Actions feature, I was very excited to test it, so I immediately signed up for the beta access and finally my invitation had been accepted.

The reason for my excitement mainly comes from my current project where I am mostly responsible for managing the infrastructure in AWS (Terraform) and backend development (Ruby on Rails) — if I have time for it. We also have a lot of PWA that we deploy to AWS Cloudfront so there is a constant need for automation (we still do some things manually but we are improving everyday). Our simplified pipeline looks like this:

1. GitHub PR (master <- feature branch)
2. CircleCI
  - linter
  - specs
  - aws push to CodePipeline or trigger Cloudfront invalidation for PWA (only from master)
3. AWS CodePipeline starts image building and ECS deployment

As much as I like some of the Amazon services, AWS CodePipeline is not one of them so with GitHub Actions on the rise I hope to replace it completely. To verify if that's even possible I created a dummy project that will test the following:

- linter (rubocop)
- tests (rspec)
- deployment from master only (Heroku will do for now, I can expand that later to AWS)
- notification (when the process is done)

In this article, I won't be going into details what GitHub Actions is and how everything works because GitHub documentation will do a much better job and I don't want to duplicate the content that is already there, especially, that it is a beta and things might change. I will only highlight a few things and most of the time I will leave you with the link to the GitHub pages.

For the Ruby app I used Sinatra and wrote one silly endpoint:


```ruby
get '/' do
   "#{ENV['RACK_ENV']}: Hello there! My secret is #{ENV['MY_SECRET']}"
end
```

and its corresponding spec:

```ruby
describe 'Test GitHub Action' do
  it 'returns appropriate text for index page' do
    get '/'
    expect(last_response.body).to eq 'test: Hello there! My secret is 123'
  end
end
```

For Docker, no surprises here, just a small file:

```docker
FROM ruby:2.5.1
ARG RACK_ENV
ARG PORT
ENV APP_HOME /app
RUN apt-get update -qq && apt-get install -y build-essential
RUN mkdir $APP_HOME
WORKDIR $APP_HOME
ADD . $APP_HOME/
RUN bundle install — without development test
CMD rackup -p $PORT — host 0.0.0.0
```

GitHub Actions come with some predefined actions built by the GitHub team. One of them is Heroku and Docker cli tools, to name a few. For more, please take a look at the documentation [here](https://github.com/actions).

There is also a GUI for defining actions and works pretty well but I prefer doing this in my code editor.

First, create a workflow file `.github/main.workflow`:

```github
workflow "Test and deploy to Heroku" {
 on = "push"
 resolves = ["ruby.build"]
}
```

[Workflow](https://developer.github.com/actions/managing-workflows/workflow-configuration-options/) definition is pretty self-explanatory so just a short comment:

- `on` defines event when the whole process kicks in (push type is the only one available in beta)
- `resolves` specifies a list of target actions to resolve (you can put any text here but I kinda like namespace.action convention for my purposes - this comes in handy later when you declare your action dependencies)

First action:

```github
action "ruby.build" {
 uses = "actions/docker/cli@master"
 args = "build -f Dockerfile.test -t ci-$GITHUB_SHA:latest ."
}
```

This will build a docker container that will be used for linting and testing.

Please also note that there some built-in `GITHUB_*` envs for you to use, list [here](https://developer.github.com/actions/creating-github-actions/accessing-the-runtime-environment/#environment-variables).


Action breakdown:

- `uses` declares what kind of action will it be and could be read as follows: `:github_user_or_org_name/:repository/:folder@:ref` — as a ref I used master but for production workflows, you probably want to stick with a specific release tag or commit SHA and upgrade periodically
- `args` are just arguments passed to underlying command (in this action it will be `docker ...`)

Take a look here how the action repository looks like [here](https://github.com/actions/docker/tree/master/cli).

Next part of the workflow can be run in parallel so:

```github
action "ruby.rubocop" {
 uses = "actions/docker/cli@master"
 needs = ["ruby.build"]
 args = "run ci-$GITHUB_SHA:latest rubocop"
}

action "ruby.rspec" {
 uses = "actions/docker/cli@master"
 needs = ["ruby.build"]
 args = "run ci-$GITHUB_SHA:latest rspec"
}
```

Nothing new here except `needs` that specifies dependencies for actions (and that's why I am using `namespace.action` style rather than using `Build Ruby image` etc., it's just easier for me to track it with eyes).

I used a separate `Dockerfile` for a test environment so I can declare required variables there:

```docker
FROM ruby:2.5.1

ENV RACK_ENV test
ENV MY_SECRET 123 # if you want this to be out of the repo just use `ARG MY_SECRET` and define secrets in github action
ENV APP_HOME /app

RUN apt-get update -qq && apt-get install -y build-essential
RUN mkdir $APP_HOME

WORKDIR $APP_HOME
ADD . $APP_HOME/

RUN bundle install
```

Ok, so tests are running, now we want to start a deployment but only if the branch is `master`. There is another pre-built [action](https://github.com/actions/bin) for that:

```github
action "git.master" {
  uses = "actions/bin/filter@master"
  needs = ["ruby.rubocop", "ruby.rspec"]
  args = "branch master"
}
```

Before we start with Heroku workflow we need to create a project first. We will also need:

- to generate Heroku api key (`heroku authorizations:create`)
- to set the stack to the container based (`heroku stack:set container`)
- a project name (I named mine `test-github-actions`)

Heroku action is described [here](https://github.com/actions/heroku). As of now, there is only one required secret `HEROKU_API_KEY` that has to contain your authorization key. You want to add this key to GitHub [secrets](https://developer.github.com/actions/managing-workflows/storing-secrets/).

```github
action "heroku.login" {
  uses = "actions/heroku@master"
  needs = ["git.master"]
  args = "container:login"  secrets = ["HEROKU_API_KEY"]
}
```

`secrets` tells to decrypt declared variables in this action and expose them internally as an ENV (otherwise they won't be available), also **do not** print them because they might remain in logs.

Once we are logged in we can push our image:

```github
action "heroku.push" {
  uses = "actions/heroku@master"
  needs = "heroku.login"
  args = "container:push web"

  secrets = [
    "HEROKU_API_KEY",
    "HEROKU_APP"
  ]

  env = {
    RACK_ENV = "production"
  }
}
```

A little more explanation here, first I used `HEROKU_APP` which means that container will push image to whatever app that is defined there. There are actually multiple ways of how this could be achieved:

```github
args = "container:push -a test-github-actions web"
```

or

```github
args = "container:push web"

env = {
  HEROKU_APP = "test-github-actions"
}
```

Personally, I preferred to put in secrets here so it requires less typing later if you need to use it multiple times in different actions.

`RACK_ENV = "production"` is defined here as a building environment variable for docker image (our dockerfile had: `ARG RACK_ENV`).

For the following piece, I used `heroku config:set` command to propagate all my variables and secrets to heroku runtime variables:

```github
action "heroku.envs" {
  uses = "actions/heroku@master"
  needs = "heroku.push"

  args = [
    "config:set",
    "RACK_ENV=$RACK_ENV",
    "MY_SECRET=$MY_SECRET"
  ]

  secrets = [
    "HEROKU_API_KEY",
    "HEROKU_APP",
    "MY_SECRET"
  ]

  env = {
    RACK_ENV = "production"
  }
}
```

And finally, a deployment:

```github
action "heroku.deploy" {
  uses = "actions/heroku@master"
  needs = ["heroku.envs", "heroku.push"]

  args = ["container:release", "web"]

  secrets = [
    "HEROKU_API_KEY",
    "HEROKU_APP",
    "MY_SECRET"
  ]

  env = {
    RACK_ENV = "production"
  }
}
```

At this moment, you should also update your workflow:

```github
...
resolves = ["heroku.deploy"]
...
```

because that's the action you need to resolve to.

For a cherry on the top, I would add Slack notification and for that, we will need custom action, turns out it's easy to do this. As a starting point, replicate the following structure in your project folder:

```term
.github/
  slack/
    Dockerfile
    entrypoint.sh
```

For `entrypoint.sh` I defined a simple message posting to Slack:

```sh
#!/bin/sh
set -e
curl -X POST -H 'Content-type: application/json' \
 --data "{\"text\": \"$*\",\"attachments\":[{\"footer\": \"$GITHUB_ACTOR / $GITHUB_REPOSITORY / $GITHUB_SHA\"}]}" \
$SLACK_WEBHOOK_URL
```

The important part: `$*` - command arguments will be pasted here. For the rest, please refer to Slack documentation.

Minimal dockerfile:

```docker
FROM debian:9.5-slim

RUN apt-get update -qq && apt-get install -y curl

ARG SLACK_WEBHOOK_URL
ARG GITHUB_ACTOR
ARG GITHUB_REPOSITORY
ARG GITHUB_SHA

LABEL "com.github.actions.name"="Slack notifier"
LABEL "com.github.actions.description"="Sends message to slack channel"
LABEL "com.github.actions.icon"="bell"
LABEL "com.github.actions.color"="yellow"

ADD entrypoint.sh /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
```

GitHub labels allow to customize the visual appearance of our action (you can see it later in GitHub workflow view). For a full customization refer to the documentation: [creating-a-new-action](https://developer.github.com/actions/creating-github-actions/creating-a-new-action/#hello-world-action-example) / [color list](https://developer.github.com/actions/creating-github-actions/creating-a-docker-container/#label) / [icon list](https://developer.github.com/actions/creating-github-actions/creating-a-docker-container/#supported-feather-icons).

At the end, make sure your code is executable:

```term
chmod +x entrypoint.sh
```

A final touch on workflow:

```github
workflow "Test and deploy to heroku" {
  on = "push"
  resolves = ["slack.notifier"]
}

...

action "slack.notifier" {
  uses = "./.github/slack"
  needs = ["heroku.deploy"]
  args = "Deployed!"
  secrets = ["SLACK_WEBHOOK_URL"]
  # GITHUB_* envs are automatically here
}
```

and here is the result:

{{< fig src="/posts/2019/github-actions-beta-full-workflow.png" caption="Full workflow visualised" >}}

To sum it all up, I am very happy with the upcoming GitHub changes. My dummy project proved me that GitHub Actions are more than capable of replacing parts of our current pipeline and once a stable release is ready, we will plan to integrate it with our commercial project.

Link to repo: [https://github.com/qbart/test-github-actions](https://github.com/qbart/test-github-actions).

PS. If you find any errors in my article/code please let me know :)

And a couple of screenshots I took during the development:

{{< fig src="/posts/2019/github-actions-beta-managing-secrets.png" caption="Managing secrets" >}}

{{< fig src="/posts/2019/github-actions-beta-workflow-preview.png" caption="Workflow preview" >}}

{{< fig src="/posts/2019/github-actions-beta-editing-workflow-init.png" caption="Editing workflow (my initial attempts)" >}}

{{< fig src="/posts/2019/github-actions-beta-failed-workflow.png" caption="Failed workflow" >}}

{{< fig src="/posts/2019/github-actions-beta-failed-action-logs.png" caption="Failed action logs" >}}

{{< fig src="/posts/2019/github-actions-beta-invalid-workflow-config.png" caption="Invalid workflow config" >}}

{{< fig src="/posts/2019/github-actions-beta-workflow-in-progress.png" caption="Workflow in progress" >}}
