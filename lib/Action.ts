// IMPORTS
// =================================================================================================
import { Dao, Cache, Logger, Notice, NoticeFilter, Task } from './../index';
import { validate } from './validator';
import { cleanArray as clean } from './util';

// INTERFACES
// =================================================================================================
export interface Action<V,T> {
    (this: ActionContext, inputs: V): Promise<T>
}
    
export interface ActionAdapter<V> {
    (this: ActionContext, inputs: any, authInfo?: any): Promise<V>
}

interface ActionEnvelope<V,T> {
    action: Action<V,T>;
    inputs: V;
}

// ACTION CONTEXT
// =================================================================================================
export class ActionContext {
    
    dao         : Dao;
    cache       : Cache;
    logger      : Logger;
    settings    : any;

    timestamp   : number;
    tasks       : Task[];
    notices     : Notice[];
    keys        : Set<string>;
    deferred    : ActionEnvelope<any,any>[];

    sealed      : boolean;
    
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(dao: Dao, cache: Cache, logger: Logger, settings: any, tasks: boolean, notices: boolean, timestamp?: number) {
        this.dao = dao;
        this.cache = cache;
        this.logger = logger;
        this.settings = settings;

        this.timestamp = timestamp || Date.now();
        this.tasks = tasks ? [] : undefined;
        this.notices = notices ? [] : undefined;
        this.keys = new Set();
        this.deferred = [];

        this.sealed = false;
    }
    
    // PUBLIC MEMBERS
    // --------------------------------------------------------------------------------------------
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

    invalidate(key: string) {
        if (!key) return;
        this.keys.add(key);
    }

    isInvalid(key: string): boolean {
        return this.keys.has(key);
    }
    
	run<V,T>(action: Action<V,T>, inputs: V): Promise<T> {
        // TODO: log action start/end
		return action.call(this, inputs);
	}
    
    defer<V,T>(action: Action<V,T>, inputs: V): void {
        validate(!this.sealed, 'Cannot defer an action: the context is sealed');
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