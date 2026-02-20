import * as ChildProcess from 'node:child_process';
import * as Http from 'node:http';
import * as Net from 'node:net';

const internals = {};

internals.hasLsof = () => {

    try {
        ChildProcess.execSync(`lsof -p ${process.pid}`, { stdio: 'ignore' });
    }
    catch (err) {
        return false;
    }

    return true;
};

internals.hasIPv6 = () => {

    const server = Http.createServer().listen();
    const { address } = server.address();
    server.close();

    return Net.isIPv6(address);
};

const hasLsof = internals.hasLsof();

const hasIPv6 = internals.hasIPv6();

export { hasLsof, hasIPv6 };
