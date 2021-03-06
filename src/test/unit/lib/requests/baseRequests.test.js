/**************************************************************************
 *  (C) Copyright ModusBox Inc. 2019 - All rights reserved.               *
 *                                                                        *
 *  This file is made available under the terms of the license agreement  *
 *  specified in the corresponding source code repository.                *
 *                                                                        *
 *  ORIGINAL AUTHOR:                                                      *
 *       James Bush - james.bush@modusbox.com                             *
 **************************************************************************/

jest.mock('http');
const http = require('http');

const BaseRequests = require('../../../../lib/requests/baseRequests');
// const WSO2Auth = require('../../../../lib/WSO2Auth');
const mockLogger = require('../../../__mocks__/mockLogger');

describe('BaseRequests', () => {
    let wso2Auth, defaultConf;

    beforeEach(() => {
        wso2Auth = {
            refreshToken: jest.fn(() => 'fake-token'),
        };
        defaultConf = {
            logger: mockLogger({ app: 'BaseRequests test' }),
            peerEndpoint: '127.0.0.1',
            tls: {
                mutualTLS: {
                    enabled: false
                }
            },
        };
        http.__request = jest.fn(() => ({ statusCode: 401 }));
    });

    afterEach(() => {
        http.__request.mockClear();
    });

    it('does not retry requests when not configured to do so', async () => {
        const conf = {
            ...defaultConf,
            wso2: {
                auth: wso2Auth,
                // retryWso2AuthFailureTimes: undefined, // the default
            }
        };

        const br = new BaseRequests(conf);
        await br._request({ uri: 'http://what.ever' });

        expect(http.__request).toBeCalledTimes(1);
        expect(wso2Auth.refreshToken).not.toBeCalled();
    });

    it('retries requests once when configured to do so', async () => {
        const conf = {
            ...defaultConf,
            wso2: {
                auth: wso2Auth,
                retryWso2AuthFailureTimes: 1,
            },
        };

        http.__request = jest.fn(() => ({ statusCode: 401 }));

        const br = new BaseRequests(conf);
        await br._request({ uri: 'http://what.ever', headers: {} });

        expect(http.__request).toBeCalledTimes(conf.wso2.retryWso2AuthFailureTimes + 1);
        expect(wso2Auth.refreshToken).toBeCalledTimes(conf.wso2.retryWso2AuthFailureTimes);
    });

    it('retries requests multiple times when configured to do so', async () => {
        const conf = {
            ...defaultConf,
            wso2: {
                auth: wso2Auth,
                retryWso2AuthFailureTimes: 5,
            },
        };

        http.__request = jest.fn(() => ({ statusCode: 401 }));

        const br = new BaseRequests(conf);
        await br._request({ uri: 'http://what.ever', headers: {} });

        expect(http.__request).toBeCalledTimes(conf.wso2.retryWso2AuthFailureTimes + 1);
        expect(wso2Auth.refreshToken).toBeCalledTimes(conf.wso2.retryWso2AuthFailureTimes);
    });
});
