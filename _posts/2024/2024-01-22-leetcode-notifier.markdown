---
layout: post
title: 🦩 Leetcode daily challenge slack notifier
author: Jefersson Nathan
date: Mon Jan 21 14:21:54 CEST 2024
categories: [ "post" ]
description: "Leetcode daily challenge slack notifier"
---

{: class="marginalia" }
<span><embed type="image/svg+xml" src="/imgs/light_bulb_color.svg" width="20" height="20" /> Leetcode is a website<br /> where you can practice your coding skills by solving coding challenges.</span>

Recently, my teammates and I have been doing the [Leetcode](https://leetcode.com/){: class="external no-highlight"} daily challenge.

While it's fun to do it, it's also fun to share our solutions with each other. So I've decided to send us an automatic notification on Slack every day with the link to the challenge of the day.

<blockquote class="prompt">
    <h3 class="a11y-title">tip</h3>
    <div class="prompt__wrapper prompt__wrapper--type-tip" data-test="prompt">
        <svg viewBox="0 0 24 24" class="wt-icon wt-icon_size_m prompt__icon"><circle cx="12.042" cy="4" r="2"></circle><path d="M18.339 7a6.982 6.982 0 0 0-6.3 4 6.982 6.982 0 0 0-6.3-4H3v10h2.739a6.983 6.983 0 0 1 6.3 4 6.582 6.582 0 0 1 6-4.033h2.994L21 7z"></path></svg>
        <div class="prompt__content">
            <p>Slack reminders are a good option if you want just a static reminder,
            in our case we wanted the convenience of having more information about
            the daily problem in the message itself.
            </p>
        </div>
    </div>
</blockquote>

---

### The GraphQL API

It is possible to access the public graphql API of leetcode to get the challenge of the day.
The endpoint is `https://leetcode.com/graphql`. You can use the following query to get the
challenge of the day:

{: class="language-kotlin" theme="darcula" mode="c"}
```graphql
query questionOfToday {
  activeDailyCodingChallengeQuestion {
    link
    question {
      title
      difficulty
      topicTags {
        name
      }
    }
  }
}
```

Make sure to modify the query to get the fields you want.

In our bash script, we can use `curl` to get the response from the graphql endpoint:

{: class="language-kotlin" theme="darcula" mode="c"}
```bash
#!/usr/bin/env sh

# Get the graphql response from the leetcode endpoint
response=$(curl -s "https://leetcode.com/graphql?query=query%20questionOfToday%7BactiveDailyCodingChallengeQuestion%20%7B%20link%20%20question%20%7Btitle%20difficulty%20topicTags%20%7Bname%7D%7D%7D%7D")
```

The next steps is to parse the response using `jq` to get the relevant fields:

{: class="language-kotlin" theme="darcula" mode="c"}
```bash
link="https://leetcode.com$(echo "$response" | jq -r '.data.activeDailyCodingChallengeQuestion.link')"
title=$(echo "$response" | jq -r '.data.activeDailyCodingChallengeQuestion.question.title')
difficulty=$(echo "$response" | jq -r '.data.activeDailyCodingChallengeQuestion.question.difficulty')
tags=$(echo "$response" | jq -r '.data.activeDailyCodingChallengeQuestion.question.topicTags[].name' | paste -sd ", " -)
```

---

### Posting on slack

You can format the message in any way you want. I've decided to keep it simple:

{: class="language-kotlin" theme="darcula" mode="c"}
```bash
# Encouragement
encouragement="💫 A leetcode a day keeps unemployment away"

# Format the message to be posted in slack
message="*<$link|$title>* | $difficulty\nTags: $tags\n\n $encouragement"
```

To actually post it on slack, you'll need the Slack channel id and an auth token.
Just put it in the script as environment variables:

{: class="language-kotlin" theme="darcula" mode="c"}
```bash
channel="$SLACK_CHANNEL"
auth="$SLACK_AUTH"

# Post the message to slack using an incoming webhook
curl -X POST --data "{'channel':'$channel','blocks':[{'type':'section','text':{'type':'mrkdwn','text':'$message'}}]}" -H "Authorization: Bearer $auth" -H "Content-type: application/json" https://slack.com/api/chat.postMessage
```

---

### Running the script

You can trigger the script in any way you find convenient. As I had easy access to
Gitlab Schedule pipelines, I've decided to use it.

{: class="language-kotlin" theme="darcula" mode="c"}
```yaml
notify_slack:
  before_script:
    - apk add --update curl jq && rm -rf /var/cache/apk/*
  script:
    - chmod +x ./daily_challenge.sh
    - ./daily_challenge.sh
```

That is it! Now you can get your daily leetcode challenge on slack.


