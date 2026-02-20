import * as Code from '@hapi/code';
import * as Hapi from '../lib/index.js';
import * as Lab from '@hapi/lab';

const internals = {};


const lab = Lab.script();
export { lab };
const { describe, it } = lab;
const expect = Code.expect;


describe('Server', () => {

    it('supports new Server()', async () => {

        const server = new Hapi.Server();
        server.route({ method: 'GET', path: '/', handler: () => 'old school' });

        const res = await server.inject('/');
        expect(res.result).to.equal('old school');
    });
});
