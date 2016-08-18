// IMPORTS
// ================================================================================================
import { Database, Dao, DaoOptions } from './../../index';

// DATABASE CLASS
// =================================================================================================
export class MockDatabase {
    connect(options?: DaoOptions): Promise<Dao> {
        // console.log('Connecting to the database');
        return Promise.resolve(new MockDao(options));
    }
}

// DAO CLASS
// =================================================================================================
export class MockDao implements Dao {
    isActive        : boolean;
    inTransaction   : boolean;

    constructor(options?: DaoOptions) {
        this.inTransaction = options ? options.startTransaction : false;
        this.isActive = true;
    }

    close(action?: 'commit' | 'rollback'): Promise<any> {
        this.inTransaction = false;
        this.isActive = false;
        // console.log(`Releasing database connection: ${action}`)
        return Promise.resolve();
    }
}
