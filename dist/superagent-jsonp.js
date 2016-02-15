function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var serialise = function serialise(obj) {
    if (typeof obj != 'object') return obj;
    var pairs = [];
    for (var key in obj) {
        if (null != obj[key]) {
            pairs.push(encodeURIComponent(key) + '=' + encodeURIComponent(obj[key]));
        }
    }
    return pairs.join('&');
};

var jsonp = function jsonp(options) {

    return function (request) {
        // In case this is in nodejs, run without modifying request
        if (typeof window == 'undefined') return request;

        request._jsonpOptions = options || {};

        request.end = end.bind(request);
        request.abort = abort.bind(request);
        request.cleanup = cleanup.bind(request);

        return request;
    };
};

var callbackWrapper = function callbackWrapper(data) {
    var err = null;
    var res = {
        body: data
    };

    if (this.timedout || this.hasError) {
        return;
    }

    clearTimeout(this._timer);

    this._jsonp.callback.call(this, err, res);
    this.cleanup();
};

var cleanup = function cleanup() {

    if (this._jsonp.script && this._jsonp.script.parentNode) {
        this._jsonp.script.parentNode.removeChild(this._jsonp.script);
    }
};

var abort = function abort() {

    if (this._jsonp.callback) {
        this._jsonp.callback.call(this, 'response timeout', null);
    }

    this.cleanup();
};

var end = function end(callback) {

    var self = this,
        params = undefined,
        queryString = undefined,
        s = undefined,
        separator = undefined,
        url = undefined;

    this._jsonp = {
        callbackParam: this._jsonpOptions.callbackParam || 'callback',
        callbackName: (this._jsonpOptions.callbackName || 'superagentCallback') + new Date().valueOf() + parseInt(Math.random() * 1000),
        callback: callback
    };

    window[this._jsonp.callbackName] = callbackWrapper.bind(this);

    params = _defineProperty({}, this._jsonp.callbackParam, this._jsonp.callbackName);

    this._query.push(serialise(params));
    queryString = this._query.join('&');

    s = document.createElement('script');
    separator = this.url.indexOf('?') > -1 ? '&' : '?';
    url = this.url + separator + queryString;

    this._jsonp.script = s;

    s.onerror = function () {
        self.errorred = true;
        self.abort();
    };

    s.src = url;
    document.getElementsByTagName('head')[0].appendChild(s);

    // timeout
    if (this._timeout && !this._timer) {
        this._timer = setTimeout(function () {
            self.hasError = true;
            self.abort();
        }, this._timeout);
    }
};

// Prefer node/browserify style requires
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = jsonp;
} else if (typeof window !== 'undefined') {
    window.superagentJSONP = jsonp;
}