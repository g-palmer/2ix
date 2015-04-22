var EventEmitter = require('events').EventEmitter;
var util = require('util');
var request = require('request');
var _ = require('underscore');
var xmlParser = require('xml2js').parseString;

var API_HOST = 'https://api.stubhub.com';
var API_HOST_SANDBOX = 'https://api.stubhubsandbox.com';
var API_VERSION = 'v1';

function StubHub(opts) {
    this._appToken = opts.appToken;
    this._consumerKey = opts.consumerKey;
    this._consumerSecret = opts.consumerSecret;
    this._username = opts.username;
    this._password = opts.password;

    this._sandboxMode = !!opts.sandbox;
    this._apiHost = this._sandboxMode ?
        API_HOST_SANDBOX : API_HOST;

    this._request = request.defaults({
        baseUrl : this._apiHost,
        headers : {
            Authorization : 'Bearer ' + this._appToken,
            Accept : 'application/json',
            'Accept-Encoding' : 'application/json',
        },
        jar : true,
    });

    EventEmitter.call(this);
}

util.inherits(StubHub, EventEmitter);

var LOGIN_URI = '/login';
StubHub.prototype.login = function(cb) {
    var self = this;

    cb = cb || noop;

    var authToken = new Buffer(this._consumerKey + ':' + this._consumerSecret);
    var baseAuthToken = authToken.toString('base64');

    request({
        method : 'POST',
        baseUrl : this._apiHost,
        uri : LOGIN_URI,
        headers : {
            Authorization : 'Basic ' + baseAuthToken
        },
        form : {
            grant_type : 'password',
            username : this._username,
            password : this._password,
            scope : this._sandboxMode ? 'SANDBOX' : 'PRODUCTION',
        },
    }, function(err, res, body) {
        try {
            body = JSON.parse(body);
        } catch(e) {}

        if (err || !body.access_token) {
            err = err || body;
            self.emit('login:error', err);
            return cb(err);
        }

        self._userID = res.headers['x-stubhub-user-guid'];
        self._accessToken = body.access_token;
        self._refreshToken = body.refresh_token;

        self._loginRequest = self._request.defaults({
            headers : {
                Authorization: 'Bearer ' + self._refreshToken,
            }
        });

        self.emit('login:success', self._userID);
    });

};

var EVENTS_URI = '/catalog/events/';
StubHub.prototype.getEventZones = function(eventid, cb) {
    if (!eventid) {
        throw new Error('Missing required param: eventid');
    }

    cb = cb || noop;

    this._loginRequest({
        uri : EVENTS_URI + 'v1/' + eventid,
        qs : {
            getZones: true,
        }
    }, _handleResponse(cb));
};

var SEARCH_URI = '/search/inventory/';
StubHub.prototype.search = function(opts, cb) {
    var eventid = opts.eventid;
    if (!eventid) {
        throw new Error('Missing required param: eventid');
    }

    cb = cb || noop;

    var query = _.extend({ eventid: eventid }, opts.query);

    this._request({
        uri : SEARCH_URI + API_VERSION,
        qs : query,
    }, _handleResponse(cb));
};

function _handleResponse(cb) {
    return function(err, res, body) {
        console.log(res.request.href);

        if (err) {
            return cb(err);
        }

        if (!res || !body) {
            return cb(new Error('Unknown response type'));
        }

        return cb(null, body);

        if (typeof body === 'string') {

            xmlParser(body, function(err, json) {
                if (err) {
                    return cb(err);
                }

                return cb(null, json);
            })

        } else {


        }
    }
}

exports = module.exports = StubHub;

function noop() {}
