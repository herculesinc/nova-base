// IMPORTS
// =================================================================================================
import * as uuid from 'uuid/v4';
import { Dao, Cache, Logger, Notice, NoticeFilter, Task } from './../index';
import { Action, ActionEnvelope } from './Action';
import { validate } from './validator';
import { cleanArray as clean } from './util';

// INTERFACES
// =================================================================================================
interface Requestor {
    id? : string;
    ip? : string;
}

// CLASS DEFINITION
// =================================================================================================
export class Operation {

    readonly id         : string;
    readonly name       : string;
    readonly parentId?  : string;

    readonly startTs    : number;
    endTs?              : number;

    readonly requestor? : Requestor;

    log?                : Logger;
    dao?                : Dao;
    cache?              : Cache;

    tasks?              : Task[];
    notices?            : Notice[];

    deferred            : ActionEnvelope<any,any>[];

    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(name: string, tasks: boolean, notices: boolean) {
        this.id = uuid();
        this.name = name;
        this.startTs = Date.now();

        this.tasks = tasks ? [] : undefined;
        this.notices = notices ? [] : undefined;
        this.deferred = [];
    }

    // PUBLIC MEMBERS
    // --------------------------------------------------------------------------------------------
    setLogger(logger: Logger) {
        this.log = logger;
    }

    setDao(dao: Dao) {
        this.dao = dao;
    }

    setCache(cache: Cache) {
        this.cache = cache;
    }

    register(task: Task);
    register(notice: Notice);
    register(taskOrNotice: Task | Notice) {
        if (!taskOrNotice) return;
        this.registerTask(taskOrNotice as Task);
        this.registerNotice(taskOrNotice as Notice);
    }
    
    clear(actionOrFilter: NoticeFilter | Action<any,any>) {
        if (typeof actionOrFilter === 'function') {
            this.clearDeferredActions(actionOrFilter);
        }
        else {
            this.clearNotices(actionOrFilter);
        }
    }

    
    defer<V,T>(action: Action<V,T>, inputs: V): void {
        validate(!this.endTs, 'Cannot defer an action: the operation has ended');
        this.deferred.push({ action: action, inputs: inputs });
	}

    // PRIVATE MEMBERS
    // --------------------------------------------------------------------------------------------
    private registerTask(task: Task) {
        if (!task.queue) return;
        validate(this.tasks, 'Cannot register task: dispatcher is not available');

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
            this.tasks = clean(this.tasks);
        }
    }
    
    private registerNotice(notice: Notice) {
        if (!notice.target) return;
        validate(this.notices, 'Cannot register notice: notifier is not available');

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
            this.notices = clean(this.notices);
        }
    }

    private clearNotices(filter: NoticeFilter) {
        if (!filter || (!filter.event && !filter.target)) return;
        validate(this.notices, 'Cannot clear notices: notifier is not available');

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
            this.notices = clean(this.notices);
        }
    }

    private clearDeferredActions(action: Action<any,any>) {
        let hasHoles = false;
        for (let i = 0; i < this.deferred.length; i++) {
            if (this.deferred[i].action === action) {
                this.deferred[i] = undefined;
                hasHoles = true;
            }
        }

        if (hasHoles) {
            this.deferred = clean(this.deferred);
        }
    }
}