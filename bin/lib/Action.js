"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const validator_1 = require("./validator");
const util_1 = require("./util");
// ACTION CONTEXT
// =================================================================================================
class ActionContext {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(dao, cache, logger, tasks, notices, timestamp) {
        this.dao = dao;
        this.cache = cache;
        this.logger = logger;
        this.timestamp = timestamp || Date.now();
        this.tasks = tasks ? [] : undefined;
        this.notices = notices ? [] : undefined;
        this.keys = new Set();
        this.deferred = [];
        this.suppressed = new Map();
        this.sealed = false;
    }
    register(taskOrNotice) {
        if (!taskOrNotice)
            return;
        this.registerTask(taskOrNotice);
        this.registerNotice(taskOrNotice);
    }
    clear(actionOrFilter) {
        if (typeof actionOrFilter === 'function') {
            this.clearDeferredActions(actionOrFilter);
        }
        else {
            this.clearNotices(actionOrFilter);
        }
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
        if (this.suppressed.has(action)) {
            this.logger && this.logger.debug(`Suppressed ${action.name} action`);
            return Promise.resolve();
        }
        this.logger && this.logger.debug(`Started ${action.name} action`);
        return action.call(this, inputs);
    }
    defer(action, inputs) {
        validator_1.validate(!this.sealed, 'Cannot defer an action: the context is sealed');
        this.deferred.push({ action: action, inputs: inputs });
    }
    suppress(actionOrActions, tag) {
        if (!actionOrActions)
            return;
        const actions = (Array.isArray(actionOrActions) ? actionOrActions : [actionOrActions]);
        for (let action of actions) {
            let tags = this.suppressed.get(action);
            if (!tags) {
                tags = new Set();
                this.suppressed.set(action, tags);
            }
            tags.add(tag);
        }
    }
    unsuppress(actionOrActions, tag) {
        if (!actionOrActions)
            return;
        const actions = (Array.isArray(actionOrActions) ? actionOrActions : [actionOrActions]);
        for (let action of actions) {
            let tags = this.suppressed.get(action);
            if (tags) {
                tags.delete(tag);
                if (!tags.size) {
                    this.suppressed.delete(action);
                }
            }
        }
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
            this.tasks = util_1.cleanArray(this.tasks);
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
            this.notices = util_1.cleanArray(this.notices);
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
            this.notices = util_1.cleanArray(this.notices);
        }
    }
    clearDeferredActions(action) {
        let hasHoles = false;
        for (let i = 0; i < this.deferred.length; i++) {
            if (this.deferred[i].action === action) {
                this.deferred[i] = undefined;
                hasHoles = true;
            }
        }
        if (hasHoles) {
            this.deferred = util_1.cleanArray(this.deferred);
        }
    }
}
exports.ActionContext = ActionContext;
//# sourceMappingURL=Action.js.map