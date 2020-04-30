import { launch, ElementHandle, Page } from 'puppeteer';
import { SlackPuppet } from './lib';
import { installMouseHelper } from './install-mouse-helper';
import * as Log from './log';

const { WORKSPACE, USER_EMAIL, USER_PASSWORD, CHANNELS } = process.env;
if (!WORKSPACE || !USER_EMAIL || !USER_PASSWORD || !CHANNELS) {
  console.log(`Missing environment variable:
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
    await page.screenshot({ path: 'page1.png' });

    const slackPuppet = new SlackPuppet(page);

    await slackPuppet.login(USER_EMAIL!, USER_PASSWORD!);
    await page.screenshot({ path: 'page2.png' });

    for (const channel of CHANNELS!.split(',')) {
      const channelPuppet = await slackPuppet.openChannel(channel);
      Log.info(`Opened channel: ${channel}`)
      await channelPuppet.scrollToOldest();
      Log.info(`- scrolled to top`)
      const messages: ThreadedMessages[] = []
      await channelPuppet.forAllMessages(async (msgElem, msgId, maybeThread) => {
        try {
          const message = await extractMsgInfo(page, msgElem) as ThreadedMessages;
          message.thread = [];
          await maybeThread.open(async (threadPuppet) => {
            await threadPuppet.forAllMessages(async (threadMsgElem, threadMsgId) => {
              if (threadMsgId !== msgId) {
                message.thread.push(await extractMsgInfo(page, threadMsgElem));
              }
            })
          });
          messages.push(message);
        } catch (e) {
          // FIXME unable to handle image only messages
          console.error(e);
        }
      })
      console.log(JSON.stringify(messages, null, 2))
    }
  } catch (e) {
    console.error(e);
  } finally {
    await browser.close();
  }
})();