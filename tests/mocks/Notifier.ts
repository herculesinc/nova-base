// IMPORTS
// ================================================================================================
import { Notifier, Notice } from './../../index';

// NOTIFIER CLASS
// ================================================================================================
export class MockNotifier implements Notifier{
    send(noticeOrNotices: Notice | Notice[]): Promise<any> {
        if (!noticeOrNotices) return Promise.resolve();
        const notices = Array.isArray(noticeOrNotices) ? noticeOrNotices : [noticeOrNotices];
        for (let notice of notices) {
            console.log(`Sending {${notice.event}} notice to {${notice.target}} target`);
        }
        return Promise.resolve();
    }
}