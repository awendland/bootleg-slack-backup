<!-- markdownlint-disable MD033 -->
<div align="center">
  <img src="readme/banner.jpg" alt="Woman using a photocopier to make a copy of a piece of paper with the Slack logo on it" width="600">
  <br>
</div>
<!-- markdownlint-restore -->

# Bootleg Slack Backup (Free and Paid)

Headless browser based backup of Slack channels (free or paid).

## Usage

Provide the following environment variables and then run `yarn start` (which will compile the TypeScript program in `src/` to a JavaScript target in `build/` and then will execute it).

Environment variables:

- `WORKSPACE` - the subdomain for this slack team, such as `$WORKSPACE.slack.com`
- `USER_EMAIL` - the email address you use to login
  `USER_PASSWORD` - the password you use to login (see `SlackPuppet.login` in `src/lib.ts` to see how these credentials are used)
  `CHANNELS` - a comma separated list of channels to save messages from, such as `general,random`

Optionally, you can specify `LOG_LEVEL` as well, which can be set to `ERROR (default) | WARN | INFO | TRACE`. All logs will be printed to _stderr_.

## Output

Extracted messages will be printed to _stdout_ as newline delimited JSON.

### Example Prettified Output

```json
{
  "id": "p112322022113300",
  "user": "Alex",
  "content": "Pigs are flying!",
  "thread": [
    {
      "id": "p112322642113900?thread_ts=112322022.113300&cid=C028U",
      "user": "Margaret",
      "content": "What's that mean for hot dog sales?"
    }
  ]
}
NEWLINE
{
  "id": "p238393749114700",
  "user": "jacob",
  "content": "lorem ipsum yummy burger sandwich <a target=\"_blank\" class=\"c-link\" delay=\"150\" aria-describedby=\"slack-kit-tooltip\" href=\"https://slack-redir.net/link?url=https%3A%2F%2Fwww.statnews.com\" rel=\"noopener noreferrer\">https://www.statnews.com</a>",
  "thread": [
    {
      "id": "p238393775115200?thread_ts=238393749.114700&cid=C028U",
      "user": "Margaret",
      "content": "Into the newsletter it goes!"
    },
    {
      "id": "p238393785115400?thread_ts=238393749.114700&cid=C028U",
      "user": "Margaret",
      "content": "Thank you"
    }
  ]
}
NEWLINE
```

## TODO

- 2020-04-30 - Execution is still inconsistent with several `waitFor` timeouts being triggered during a standard execution. A more rigorous review is required to ensure the correct selectors and reliable trigger/navigation mechanisms are being used (e.g. using `.focus()` and `keyboard.press('Enter')` instead of `.click()`, which might be occluded by a popup element).
