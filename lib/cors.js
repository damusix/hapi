import * as Boom from '@hapi/boom';
import * as Hoek from '@hapi/hoek';

import Route from './route.js';


const internals = {};


const route = function (options) {

    if (!options) {
        return false;
    }

    const settings = Hoek.clone(options);
    settings._headers = settings.headers.concat(settings.additionalHeaders);
    settings._headersString = settings._headers.join(',');
    for (let i = 0; i < settings._headers.length; ++i) {
        settings._headers[i] = settings._headers[i].toLowerCase();
    }

    if (settings._headers.indexOf('origin') === -1) {
        settings._headers.push('origin');
    }

    settings._exposedHeaders = settings.exposedHeaders.concat(settings.additionalExposedHeaders).join(',');

    if (settings.origin === 'ignore') {
        settings._origin = false;
    }
    else if (settings.origin.indexOf('*') !== -1) {
        Hoek.assert(settings.origin.length === 1, 'Cannot specify cors.origin * together with other values');
        settings._origin = true;
    }
    else {
        settings._origin = {
            qualified: [],
            wildcards: []
        };

        for (const origin of settings.origin) {
            if (origin.indexOf('*') !== -1) {
                settings._origin.wildcards.push(new RegExp('^' + Hoek.escapeRegex(origin).replace(/\\\*/g, '.*').replace(/\\\?/g, '.') + '$'));
            }
            else {
                settings._origin.qualified.push(origin);
            }
        }
    }

    return settings;
};


const options = function (_route, server) {

    if (_route.method === 'options' ||
        !_route.settings.cors) {

        return;
    }

    handler(server);
};


const handler = function (server) {

    if (server._core.router.specials.options) {
        return;
    }

    const definition = {
        method: '_special',
        path: '/{p*}',
        handler: internals.handler,
        options: {
            cors: false
        }
    };

    const _route = new Route(definition, server, { special: true });
    server._core.router.special('options', _route);
};


internals.handler = function (request, h) {

    // Validate CORS preflight request

    const method = request.headers['access-control-request-method'];
    if (!method) {
        throw Boom.notFound('CORS error: Missing Access-Control-Request-Method header');
    }

    // Lookup route

    const _route = request.server.match(method, request.path, request.info.hostname);
    if (!_route) {
        throw Boom.notFound();
    }

    const settings = _route.settings.cors;
    if (!settings) {
        return { message: 'CORS is disabled for this route' };
    }

    // Validate Origin header

    const origin = request.headers.origin;

    if (!origin &&
        settings._origin !== false) {

        throw Boom.notFound('CORS error: Missing Origin header');
    }

    if (!matchOrigin(origin, settings)) {
        return { message: 'CORS error: Origin not allowed' };
    }

    // Validate allowed headers

    let _headers = request.headers['access-control-request-headers'];
    if (_headers) {
        _headers = _headers.toLowerCase().split(/\s*,\s*/);
        if (Hoek.intersect(_headers, settings._headers).length !== _headers.length) {
            return { message: 'CORS error: Some headers are not allowed' };
        }
    }

    // Reply with the route CORS headers

    const response = h.response();
    response.code(settings.preflightStatusCode);
    response._header('access-control-allow-origin', settings._origin ? origin : '*');
    response._header('access-control-allow-methods', method);
    response._header('access-control-allow-headers', settings._headersString);
    response._header('access-control-max-age', settings.maxAge);

    if (settings.credentials) {
        response._header('access-control-allow-credentials', 'true');
    }

    if (settings._exposedHeaders) {
        response._header('access-control-expose-headers', settings._exposedHeaders);
    }

    return response;
};


const headers = function (response) {

    const request = response.request;
    const settings = request.route.settings.cors;

    if (settings._origin !== false) {
        response.vary('origin');
    }

    if ((request.info.cors && !request.info.cors.isOriginMatch) ||                          // After route lookup
        !matchOrigin(request.headers.origin, request.route.settings.cors)) {        // Response from onRequest

        return;
    }

    response._header('access-control-allow-origin', settings._origin ? request.headers.origin : '*');

    if (settings.credentials) {
        response._header('access-control-allow-credentials', 'true');
    }

    if (settings._exposedHeaders) {
        response._header('access-control-expose-headers', settings._exposedHeaders, { append: true });
    }
};


const matchOrigin = function (origin, settings) {

    if (settings._origin === true ||
        settings._origin === false) {

        return true;
    }

    if (!origin) {
        return false;
    }

    if (settings._origin.qualified.indexOf(origin) !== -1) {
        return true;
    }

    for (const wildcard of settings._origin.wildcards) {
        if (origin.match(wildcard)) {
            return true;
        }
    }

    return false;
};

export { route, options, handler, headers, matchOrigin };
