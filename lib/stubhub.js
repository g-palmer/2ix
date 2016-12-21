const url = require('url');
const request = require('superagent');
const debug = require('debug')('2ix:stubhub');

const API_HOSTNAME = 'https://api.stubhub.com';
const DEFAULT_API_URL_FORMAT = url.parse(API_HOSTNAME);

class StubHub {
    constructor(opts = {}) {

        const {
            applicationToken,
            consumerKey,
            consumerSecret,
        } = opts;

        if (!applicationToken || !consumerKey || !consumerSecret) {
            throw new TypeError('Missing applicationToken, consumerKey, or consumerSecret');
        }

        this._applicationToken = applicationToken;
        this._consumerKey = consumerKey;
        this._consumerSecret = consumerSecret;
    }

    _buildUrl (params) {
        const reqUrl = url.format(Object.assign({}, DEFAULT_API_URL_FORMAT, params));
        debug('Request URL %s', reqUrl);
        return reqUrl;
    }

    login ({ username, password }) {
        debug('StubHub#login');
        const reqUrl = this._buildUrl({
            pathname: `/login`,
        });
        const authToken = `${this._consumerKey}:${this._consumerSecret}`;
        debug('authToken = %s', authToken);
        const encodedToken = base64Encode(authToken);
        debug('encodedToken = %s', encodedToken);

        return new Promise((resolve, reject) => {
            request
                .post(reqUrl)
                .set('Authorization', `Basic ${encodedToken}`)
                .type('form')
                .send({
                    grant_type: 'password',
                    username,
                    password,
                    scope: 'PRODUCTION',
                })
                .then((response) => {
                    const {
                        body,
                        headers,
                    } = response;

                    const {
                        refresh_token: refreshToken,
                        access_token: accessToken,
                    } = body;

                    const userId = headers['x-stubhub-user-guid'];

                    this._user = {
                        id: userId,
                        refreshToken,
                        accessToken,
                    };

                    debug('Logged in! user id = %s', userId);

                    resolve(userId);
                })
                .catch((err) => {
                    const {
                        statusCode,
                        headers,
                        body,
                        request,
                        error,
                    } = err.response;
                    debug('Login error', error);
                    debug('Login request headers', request.header);
                    debug('Login request data', request._data);
                    reject(error);
                });
        });
    }

    getEvent (eventId) {
        debug('StubHub#getEvent - eventId = %s', eventId);
        const reqUrl = this._buildUrl({
            pathname: `/catalog/events/v2/${eventId}`,
        });
        return request
            .get(reqUrl)
            .accept('json')
            .set('Authorization', `Bearer ${this._applicationToken}`);
    }

    getEventListings (eventId) {
        debug('StubHub#getEventListings - eventId = %s', eventId);
        const reqUrl = this._buildUrl({
            pathname: '/search/inventory/v2',
            query: {
                eventId,
            },
        });
        return request
            .get(reqUrl)
            .accept('json')
            .set('Authorization', `Bearer ${this._user.accessToken}`);
    }
}

function base64Encode (string) {
    return Buffer.from(string.toString()).toString('base64');
}

module.exports = StubHub;
