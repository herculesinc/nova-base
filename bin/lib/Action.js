"use strict";
const util_1 = require('./util');
// ACTION CONTEXT
// =================================================================================================
class ActionContext {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(dao, cache, logger, settings) {
        this.dao = dao;
        this.cache = cache;
        this.logger = logger;
        this.settings = settings;
        this.tasks = [];
        this.notices = [];
        this.keys = new Set();
    }
    register(taskOrNotice) {
        if (!taskOrNotice)
            return;
        this.registerTask(taskOrNotice);
        this.registerNotice(taskOrNotice);
    }
    invalidate(key) {
        if (!key)
            return;
        this.keys.add(key);
    }
    isInvalid(key) {
        return this.keys.has(key);
    }
    run(action, inputs) {
        // TODO: log action start/end
        return action.call(this, inputs);
    }
    // PRIVATE MEMBERS
    // --------------------------------------------------------------------------------------------
    registerTask(task) {
        if (!task.queue)
            return;
        let hasHoles = false;
        for (let i = 0; i < this.tasks.length; i++) {
            if (this.tasks[i].queue === task.queue) {
                let merged = task.merge(this.tasks[i]);
                if (merged) {
                    this.tasks[i] = undefined;
                    hasHoles = true;
                    task = merged;
                }
            }
        }
        this.tasks.push(task);
        if (hasHoles) {
            this.tasks = util_1.clean(this.tasks);
        }
    }
    registerNotice(notice) {
        if (!notice.target)
            return;
        let hasHoles = false;
        for (let i = 0; i < this.notices.length; i++) {
            if (this.notices[i].target === notice.target) {
                let merged = notice.merge(this.notices[i]);
                if (merged) {
                    this.notices[i] = undefined;
                    hasHoles = true;
                    notice = merged;
                }
            }
        }
        this.notices.push(notice);
        if (hasHoles) {
            this.notices = util_1.clean(this.notices);
        }
    }
    clearNotices(filter) {
        if (!filter)
            return;
        let hasHoles = false;
        for (let i = 0; i < this.notices.length; i++) {
            let notice = this.notices[i];
            let sameEvent = (filter.event === notice.event);
            let sameTarget = (filter.target === notice.target);
        }
        if (hasHoles) {
            this.notices = util_1.clean(this.notices);
        }
    }
}
exports.ActionContext = ActionContext;
//# sourceMappingURL=Action.js.map