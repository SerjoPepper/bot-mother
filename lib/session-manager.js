(function() {
  var PREFIX, SessionManager, jsonfn, parseSession, promise, redis;

  promise = require('bluebird');

  jsonfn = require('json-fn');

  redis = require('redis');

  PREFIX = 'BOT_SESSIONS';

  parseSession = function(session, id) {
    if (session) {
      return jsonfn.parse(session);
    } else {
      return {
        meta: {
          chat: {
            id: id
          }
        }
      };
    }
  };

  promise.promisifyAll(redis);

  SessionManager = (function() {
    function SessionManager(bot) {
      this.bot = bot;
    }

    SessionManager.prototype.get = function(id) {
      return this.bot.redis.hgetAsync(PREFIX + ":" + this.bot.id, id).then(function(session) {
        return session = parseSession(session, id);
      });
    };

    SessionManager.prototype.save = function(id, session) {
      return this.bot.redis.hsetAsync(PREFIX + ":" + this.bot.id, id, jsonfn.stringify(session));
    };

    SessionManager.prototype.getMultiple = function(ids) {
      return this.bot.redis.hmgetAsync([PREFIX + ":" + this.bot.id].concat(ids)).then(function(sessions) {
        return sessions.filter(Boolean).map(function(session) {
          return parseSession(session);
        });
      });
    };

    SessionManager.prototype.getAll = function() {
      return this.bot.redis.hvalsAsync(PREFIX + ":" + this.bot.id).then(function(sessions) {
        return sessions.filter(Boolean).map(function(session) {
          return parseSession(session);
        });
      });
    };

    return SessionManager;

  })();

  module.exports = SessionManager;

}).call(this);
