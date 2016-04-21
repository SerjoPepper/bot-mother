(function() {
  var Api, Bot, Command, CommandHandler, SessionManager, _, constants, mixins, promise, redis;

  Command = require('./command');

  CommandHandler = require('./command-handler');

  SessionManager = require('./session-manager');

  constants = require('./constants');

  mixins = require('./mixins');

  _ = require('lodash');

  redis = require('redis');

  promise = require('bluebird');

  Api = require('node-telegram-bot-api');


  /*
  Bot class
  
  @property {String} key bot telegram key
  @property {Number} id bot id
  @property {Object} api telegram bot api
   */

  Bot = (function() {

    /*
    @param {Object} config config
    @option config {String} key telegram bot token
    @option config {Object} [redis] redis config; see https://github.com/NodeRedis/node_redis#options-is-an-object-with-the-following-possible-properties
    @option config {Object} [redis.client] redis client
    @option config {Object} [webHook] config for webhook
    @option config {String} [webHook.url] webook url
    @option config {String} [webHook.key] PEM private key to webHook server
    @option config {String} [webHook.cert] PEM certificate key to webHook server
    @option config {Number} [webHook.port] port for node.js server
    @option config {Boolean} [webHook.https] create secure node.js server
     */
    function Bot(config) {
      var base, ref;
      this.config = config;
      (base = this.config).redis || (base.redis = {
        host: '127.0.0.1',
        port: '6379'
      });
      this.sessionManager = this.config.sessionManager || new SessionManager(this);
      this.key = this.config.key;
      this.id = Number((ref = this.key.match(/^\d+/)) != null ? ref[0] : void 0);
      this.redis = this.config.redis.client || redis.createClient(this.config.redis);
      if (this.config.redis.db) {
        this.redis.select(this.config.redis.db);
      }
      this.commands = [];
      this._initApi();
    }


    /*
    Returns middlewares for handling.
    @param {String} commandName the command name
    @param {Object} [params] params
    @option params {Boolean} [includeBot] include bot middleware layer
    @return {Array} middlewares
     */

    Bot.prototype.getCommandsChain = function(commandName, params) {
      var commands;
      if (params == null) {
        params = {};
      }
      if (!commandName) {
        if (params.includeBot) {
          return [this];
        } else {
          [];
        }
      }
      commands = this.commands.slice().reverse().filter(function(command) {
        return command.name === commandName || _.isRegExp(command.name) && command.name.test(commandName);
      }).sort(function(arg, arg1) {
        var name1, name2, ref, res, val1, val2;
        name1 = arg.name;
        name2 = arg1.name;
        ref = [name1, name2].map(function(c) {
          if (_.isRegExp(c)) {
            return 0;
          } else if (c !== commandName) {
            return -1;
          } else {
            return 1;
          }
        }), val1 = ref[0], val2 = ref[1];
        if (val1 < 0 && val2 < 0) {
          return name2.length - name1.length;
        } else {
          return res = val2 - val1;
        }
      });
      if (params.includeBot) {
        commands.push(this);
      }
      return commands;
    };


    /*
    Return middlewares object.
    @param {Array} commands chain array
    @return {Object} middlewares object grouped by stages
     */

    Bot.prototype.getMiddlewaresChains = function(commandsChain) {
      var commands, middlewares;
      commands = commandsChain.concat([this]);
      middlewares = {};
      constants.STAGES.forEach(function(stage) {
        return commands.forEach(function(command) {
          var _commandMiddlewares, name3;
          middlewares[name3 = stage.name] || (middlewares[name3] = []);
          _commandMiddlewares = command.getMiddlewares(stage.name);
          if (stage.invert) {
            return middlewares[stage.name] = _commandMiddlewares.concat(middlewares[stage.name]);
          } else {
            return middlewares[stage.name] = middlewares[stage.name].concat(_commandMiddlewares);
          }
        });
      });
      return middlewares;
    };


    /*
    Return default command.
    @return {Command}
     */

    Bot.prototype.getDefaultCommand = function() {
      return _.find(this.commands, {
        isDefault: true
      });
    };


    /*
    Register new command.
    @param {String|RegExp} name command name
    @param {Object} [options] options command options
    @option options {Boolean} [isDefault] is command default or not
    @option options {Boolean} [compliantKeyboard] handle answers not from keyboard
    @return {Command}
     */

    Bot.prototype.command = function(name, options) {
      var command;
      if (options == null) {
        options = {};
      }
      command = new Command(name, _.extend({}, {
        bot: this
      }, options));
      this.commands.push(command);
      return command;
    };


    /*
    @param {Object} session session object
    @return {Promise} return context
     */

    Bot.prototype.contextFromSession = function(session) {
      var handler;
      handler = new CommandHandler({
        bot: this,
        session: session,
        isSynthetic: true
      });
      return promise.resolve(handler.handle()).then(function() {
        return handler.context;
      });
    };


    /*
    Invoke callback in context.
    @param {String} chatId
    @param {Function} cb function that invoke with context parameter. Should return promise.
    @return {Promise}
     */

    Bot.prototype.withContext = function(chatId, cb) {
      return this.sessionManager.get(chatId).then((function(_this) {
        return function(session) {
          return _this.contextFromSession(session).then(function(context) {
            return promise.resolve(cb(context));
          }).then(function() {
            return _this.sessionManager.save(chatId, session);
          });
        };
      })(this));
    };


    /*
    Same as withContext, but with multiple ids.
    @param {Array<String>} chatIds
    @param {Function} cb function that invoke per each context
     */

    Bot.prototype.withContexts = function(chatIds, cb) {
      return this.sessionManager.getMultiple(chatIds).map((function(_this) {
        return function(session) {
          return _this.contextFromSession(session).then(function(context) {
            return promise.resolve(cb(context));
          }).then(function() {
            return _this.sessionManager.save(session.meta.sessionId, session);
          });
        };
      })(this));
    };


    /*
    Same as withContexts, but with all chats.
    @param {Function} cb function that invoke per each context
     */

    Bot.prototype.withAllContexts = function(cb) {
      return this.sessionManager.getAll().map((function(_this) {
        return function(session) {
          return _this.contextFromSession(session).then(function(context) {
            return promise.resolve(cb(context));
          }).then(function() {
            return _this.sessionManager.save(session.meta.sessionId, session);
          });
        };
      })(this));
    };


    /*
    Start listen updates via polling or web hook
    @return {Bot}
     */

    Bot.prototype.listenUpdates = function() {
      this._isListen = true;
      this._initApi();
      return this;
    };


    /*
    Stop listen updates via polling or web hook
    @return {Bot}
     */

    Bot.prototype.stopListenUpdates = function() {
      this._isListen = false;
      this._initApi();
      return this;
    };

    Bot.prototype._initApi = function() {
      var options, ref;
      if ((ref = this.api) != null) {
        ref.destroy();
      }
      options = {};
      if (this._isListen) {
        if (this.config.webHook) {
          options.webHook = this.config.webHook;
          if (this.config.secure === false) {
            delete options.webHook.key;
          }
        } else {
          options.polling = this.config.polling || true;
        }
      }
      this.api = new Api(this.key, options);
      if (this._isListen) {
        this.api.on('message', (function(_this) {
          return function(msg) {
            return process.nextTick(function() {
              return _this._handleMessage(msg)["catch"](function(err) {
                return console.error(err, err.stack);
              });
            });
          };
        })(this));
        if (this.config.webHook) {
          return this._setWebhook();
        } else {
          return this._unsetWebhook();
        }
      }
    };

    Bot.prototype._unsetWebhook = function() {
      return this.api.setWebHook('');
    };

    Bot.prototype._setWebhook = function() {
      return this.api.setWebHook(this.config.webHook.url, this.config.webHook.cert)["finally"](function(res) {
        return console.log('webhook res:', res);
      });
    };

    Bot.prototype._provideSessionId = function(message) {
      return message.chat.id;
    };

    Bot.prototype._handleMessage = function(message) {
      var sessionId;
      sessionId = this._provideSessionId(message);
      if (message.date * 1e3 + 60e3 * 5 > Date.now()) {
        return this.sessionManager.get(sessionId).then((function(_this) {
          return function(session) {
            var handler;
            handler = new CommandHandler({
              message: message,
              bot: _this,
              session: session
            });
            return promise.resolve(handler.handle()).then(function() {
              return _this.sessionManager.save(sessionId, handler.session);
            });
          };
        })(this));
      } else {
        return promise.reject('Bad time: ' + JSON.stringify(message));
      }
    };

    return Bot;

  })();

  _.extend(Bot.prototype, mixins);

  module.exports = function(config) {
    return new Bot(config);
  };

  module.exports.middlewares = require('./middlewares');

}).call(this);
