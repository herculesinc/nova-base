// IMPORTS
// =================================================================================================
import { Dao, Cache, Logger, Notice, NoticeFilter, Task } from './../index';
import { clean } from './util';

// INTERFACES
// =================================================================================================
export interface Action<V,T> {
    (this: ActionContext, inputs: V): Promise<T>
}
    
export interface ActionAdapter<V> {
    (this: ActionContext, inputs: any, authInfo?: any): Promise<V>
}

// ACTION CONTEXT
// =================================================================================================
export class ActionContext {
    
    dao     : Dao;
    cache   : Cache;
    logger  : Logger;
    settings: any;
    
    tasks   : Task[];
    notices : Notice[];
    
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(dao: Dao, cache: Cache, logger: Logger, settings: any) {
        this.dao = dao;
        this.cache = cache;
        this.logger = logger;
        this.settings = settings;
        
        this.tasks = [];
        this.notices = [];
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
    
    clear() {

    }

    invalidate(prefix: string, key: string) {
        
    }
    
	run<V,T>(action: Action<V,T>, inputs: V): Promise<T> {
        // TODO: log action start/end
		return action.call(this, inputs);
	}
    
    // PRIVATE MEMBERS
    // --------------------------------------------------------------------------------------------
    private registerTask(task: Task) {
        if (!task.queue) return;
        
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
        if (!filter) return;

        let hasHoles = false;
        for (let i = 0; i < this.notices.length; i++) {
            let notice = this.notices[i];
            let sameEvent = (filter.event === notice.event);
            let sameTarget = (filter.target === notice.target);
            
            // TODO: complete
            //if (sameEvent || sameTarget && (filter.event )) {
            //    this.notices[i] = undefined;
            //    hasHoles = true;
            //}
        }

        if (hasHoles) {
            this.notices = clean(this.notices);
        }
    }
}