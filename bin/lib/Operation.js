"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// IMPORTS
// =================================================================================================
const uuid = require("uuid/v4");
const validator_1 = require("./validator");
const util_1 = require("./util");
// CLASS DEFINITION
// =================================================================================================
class Operation {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(name, tasks, notices) {
        this.id = uuid();
        this.name = name;
        this.startTs = Date.now();
        this.tasks = tasks ? [] : undefined;
        this.notices = notices ? [] : undefined;
        this.deferred = [];
    }
    // PUBLIC MEMBERS
    // --------------------------------------------------------------------------------------------
    setLogger(logger) {
        this.log = logger;
    }
    setDao(dao) {
        this.dao = dao;
    }
    setCache(cache) {
        this.cache = cache;
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
    defer(action, inputs) {
        validator_1.validate(!this.endTs, 'Cannot defer an action: the operation has ended');
        this.deferred.push({ action: action, inputs: inputs });
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
exports.Operation = Operation;
//# sourceMappingURL=Operation.js.map