import { launch, ElementHandle, Page } from 'puppeteer';
import { SlackPuppet } from './lib';
import { installMouseHelper } from './install-mouse-helper';
import * as Log from './log';

if (process.env.LOG_LEVEL)
  Log.setLevelByString(process.env.LOG_LEVEL)

const { WORKSPACE, USER_EMAIL, USER_PASSWORD, CHANNELS } = process.env;
if (!WORKSPACE || !USER_EMAIL || !USER_PASSWORD || !CHANNELS) {
  Log.error(`Missing environment variable:
  WORKSPACE: "${WORKSPACE}"
  USER_EMAIL: "${USER_EMAIL}"
  USER_PASSWORD: "${USER_PASSWORD}"
  CHANNELS: "${CHANNELS}"
`)
  process.exit(1);
}

const extractMsgInfo = async (page: Page, msgElem: ElementHandle): Promise<Message> =>
  page.evaluate((e) => ({
    id: e.querySelector('.c-timestamp').getAttribute('href').split('/').pop(),
    user: e.querySelector('.c-message__sender_link').textContent,
    content: e.querySelector('.p-rich_text_section')?.innerHTML,
  }), msgElem);

type Message = {
  id: string,
  user: string,
  content: string,
}

type ThreadedMessages = Message & {
  thread: Message[]
}

(async () => {
  const browser = await launch({ headless: !process.env.DEBUG });
  try {
    const page = await browser.newPage();
    if (process.env.DEBUG)
      await installMouseHelper(page);

    await page.goto(`https://${WORKSPACE}.slack.com`);
    if (process.env.DEBUG) await page.screenshot({ path: 'debug-page1.png' });

    const slackPuppet = new SlackPuppet(page);

    await slackPuppet.login(USER_EMAIL!, USER_PASSWORD!);
    if (process.env.DEBUG) await page.screenshot({ path: 'debug-page2.png' });

    for (const channel of CHANNELS!.split(',')) {
      const channelPuppet = await slackPuppet.openChannel(channel);
      Log.info(`Opened channel: ${channel}`)
      await channelPuppet.scrollToOldest();
      Log.trace(`- scrolled to top`)
      await channelPuppet.forAllMessages(async (msgElem, msgId, maybeThread) => {
        Log.trace(`- message [${msgId}]`)
        try {
          const message: ThreadedMessages = {
            ...(await extractMsgInfo(page, msgElem)),
            thread: [],
          }
          await maybeThread.open(async (threadPuppet) => {
            Log.trace(`-- opened thread`)
            await threadPuppet.forAllMessages(async (threadMsgElem, threadMsgId) => {
              Log.trace(`--- sub message [${threadMsgId}]`)
              if (threadMsgId !== msgId) {
                message.thread.push(await extractMsgInfo(page, threadMsgElem));
              }
            })
          });
          process.stdout.write(`${JSON.stringify(message)}\n`)
        } catch (e) {
          // FIXME unable to handle image only messages
          Log.warn(e);
        }
      })
    }
  } catch (e) {
    Log.error(e);
  } finally {
    await browser.close();
  }
})();
