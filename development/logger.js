
const LOG_TOKEN_DEBUG = 'DEBUG';
const LOG_TOKEN_WARN = 'WARN';
const LOG_TOKEN_INFO = 'INFO';
const LOG_TOKEN_ERROR = 'ERROR';

const CMD_ARG_VERBOSE = 'verbose';

let debugEnabled = false;

Object.defineProperty(global, '__stack', {
    get: function() {
        let orig = Error.prepareStackTrace;
        Error.prepareStackTrace = function(_, stack) {
            return stack;
        };

        let err = new Error;
        Error.captureStackTrace(err, arguments.callee);

        let stack = err.stack;
        Error.prepareStackTrace = orig;

        return stack;
    }
});

Object.defineProperty(global, '__line', {
    get: function() {
        return __stack[1].getLineNumber();
    }
});

Object.defineProperty(global, '__function', {
    get: function() {
        return __stack[1].getFunctionName();
    }
});


module.exports = {

    setDebugEnabled: function(enabled) {
        debugEnabled = enabled;
    },

    debug: function(object) {
        if (debugEnabled) {
            _output(LOG_TOKEN_DEBUG, object)
        }
    },

    info: function (object) {
        _output(LOG_TOKEN_INFO, object)
    },

    error: function (object) {
        _output(LOG_TOKEN_ERROR, object)
    },

    warn: function (object) {
        _output(LOG_TOKEN_WARN, object)
    },

    enableDebugOutputs: function(argv) {
        if (argv[CMD_ARG_VERBOSE]) {
            this.setDebugEnabled(true)
        } else {
            this.setDebugEnabled(false)
        }
    }

};

function enableDebugOutputs(argv) {
    if (argv[CMD_ARG_VERBOSE]) {
        this.setDebugEnabled(true)
    } else {
        this.setDebugEnabled(false)
    }
}

function _output(token, object) {
    if (token === LOG_TOKEN_DEBUG) {
        console.log(`[${token}] ${object}`);
    } else if (token === LOG_TOKEN_INFO) {
        console.info(`[${token}] ${object}`);
    } else if (token === LOG_TOKEN_WARN) {
        console.warn(`[${token}] ${object}`);
    } else if (token === LOG_TOKEN_ERROR) {
        console.error(`[${token}] ${object}`);
    }
}