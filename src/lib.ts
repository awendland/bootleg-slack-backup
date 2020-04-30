import { Page, ElementHandle } from 'puppeteer';
import * as Log from './log';

const fillInput = async (page: Page, selector: string, value: string) => {
    await page.evaluate((selector, value) =>
        document.querySelector(selector).value = value,
        selector, value)
}

export class SlackPuppet {
    constructor(private page: Page) { };

    async login(email: string, password: string) {
        const elemEmail = await this.page.$('#email');
        const elemPassword = await this.page.$('#password');
        const elemSignIn = await this.page.$('#signin_btn');
        await elemEmail!.type(email);
        await elemPassword!.type(password);
        await elemSignIn!.click();
        await this.page.waitForNavigation();
        return;
    }

    async openChannel(channel: string): Promise<SlackChannelPuppet> {
        await this.page.keyboard.down('Meta');
        await this.page.keyboard.press('k');
        await this.page.keyboard.up('Meta');
        const searchBox = await this.page.waitForSelector('.c-search__input_box__input > *[contenteditable=true]');
        await searchBox.type(channel);
        await this.page.waitFor(500); // FIXME remove all timers
        await this.page.keyboard.press('Enter');
        await this.page.waitForSelector(`*[aria-label='Channel ${channel}']`);
        await this.page.waitForSelector(`.c-message_kit__message`);
        return new SlackChannelPuppet(this.page);
    }
}

type MaybeThreadFunc = (s: SlackThreadPuppet) => Promise<void> | void;
type MessageFunc = (
    msgElem: ElementHandle,
    id: string,
    maybeThread: { open: (fn: MaybeThreadFunc) => Promise<void> | void }
) => Promise<void> | void

// This exists because the channel messages and thread messages share the same general layout
const forAllMessages = async (page: Page, container: ElementHandle, fn: MessageFunc) => {
    let lastMessageIds: string[] = [];
    while (true) {
        // Check for new messages
        let visibleMessages = await Promise.all(
            (await container.$$('.c-message_kit__message'))
                .map(async (e) => [
                    e,
                    await page.evaluate((e) =>
                        e.querySelector('.c-timestamp').getAttribute('href').split('/').pop(), e)
                ]));
        let newMessages = visibleMessages.filter(([e, id]) => !lastMessageIds.includes(id));
        if (newMessages.length === 0) break;
        lastMessageIds = visibleMessages.map(([e, id]) => id);
        // Process messages
        for (const [elemMessage, id] of newMessages) {
            await fn(elemMessage, id, {
                open: async (fn: MaybeThreadFunc) => {
                    const elemReplyBar = await elemMessage.$('.c-message_kit__thread_replies .c-link');
                    if (elemReplyBar) {
                        Log.info(await page.evaluate((e) => e.textContent, elemReplyBar));
                        await elemReplyBar.focus();
                        await page.keyboard.press('Enter');
                        await page.waitForSelector('.p-workspace__secondary_view .c-message_kit__message');
                        await fn(new SlackThreadPuppet(page));
                        const elemClose = await page.$('.p-workspace__secondary_view *[data-qa=close_flexpane]');
                        await elemClose!.focus();
                        await page.keyboard.press('Enter');
                    }
                }
            });
        }
        // Scroll down
        let height = 0;
        for (const [e] of visibleMessages) {
            height += await page.evaluate((e) => e.clientHeight, e);
        }
        await page.evaluate((cont, y) =>
            cont.querySelector('.c-scrollbar__hider').scrollBy(0, y),
            container, height);
        await page.waitFor(1000);
    }
}

export class SlackChannelPuppet {
    constructor(private page: Page) { };

    async scrollToOldest() {
        while (await this.page.$('.p-global_banner') === null) {
            await this.page.evaluate(() =>
                document.querySelector('.c-message_list > .c-scrollbar__hider')!.scrollBy(0, -1e5));
            await this.page.waitFor(500); // FIXME remove all timers
        }
    }

    async forAllMessages(fn: MessageFunc): Promise<void> {
        return await forAllMessages(this.page, (await this.page.$('.p-workspace__primary_view'))!, fn)
    }
}

export class SlackThreadPuppet {
    constructor(private page: Page) { };

    async forAllMessages(fn: MessageFunc): Promise<void> {
        return await forAllMessages(this.page, (await this.page.$('.p-workspace__secondary_view'))!, fn)
    }
}