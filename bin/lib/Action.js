"use strict";
const validator_1 = require('./validator');
const util_1 = require('./util');
// ACTION CONTEXT
// =================================================================================================
class ActionContext {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(dao, cache, logger, settings, tasks, notices) {
        this.dao = dao;
        this.cache = cache;
        this.logger = logger;
        this.settings = settings;
        this.tasks = tasks ? [] : undefined;
        this.notices = notices ? [] : undefined;
        this.keys = new Set();
    }
    register(taskOrNotice) {
        if (!taskOrNotice)
            return;
        this.registerTask(taskOrNotice);
        this.registerNotice(taskOrNotice);
    }
    clear(filter) {
        this.clearNotices(filter);
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
        validator_1.validate(this.tasks, 'Cannot register task: dispatcher is not available');
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
        validator_1.validate(this.notices, 'Cannot register notice: notifier is not available');
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
        if (!filter || (!filter.event && !filter.target))
            return;
        validator_1.validate(this.notices, 'Cannot clear notices: notifier is not available');
        let hasHoles = false;
        for (let i = 0; i < this.notices.length; i++) {
            let notice = this.notices[i];
            let sameEvent = (filter.event === notice.event);
            let sameTarget = (filter.target === notice.target);
            let sameTopic = (filter.topic === notice.topic);
            if ((!filter.event || sameEvent) && (!filter.target || sameTarget) && (!filter.topic || sameTopic)) {
                this.notices[i] = undefined;
                hasHoles = true;
            }
        }
        if (hasHoles) {
            this.notices = util_1.clean(this.notices);
        }
    }
}
exports.ActionContext = ActionContext;
//# sourceMappingURL=Action.js.map