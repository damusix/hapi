'use strict';

module.exports = {
    extends: 'plugin:@hapi/recommended',
    parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module'
    },
    rules: {
        strict: 'off',
        'no-var': 'off',
        '@hapi/no-var': 'error'
    }
};
