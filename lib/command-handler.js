(function() {
  var CommandHandler, Context, _, _s, constants, ejs, emoji, promise;

  Context = require('./context');

  constants = require('./constants');

  promise = require('bluebird');

  _s = require('underscore.string');

  _ = require('lodash');

  emoji = require('node-emoji');

  ejs = require('ejs');


  /*
  CommandHandler class
  Creates for each incoming request.
   */

  CommandHandler = (function() {

    /*
    @param {Object} params the command handler params
     */
    function CommandHandler(params) {
      var base, base1, base2, base3, base4, base5, base6, ref, ref1, ref2, ref3;
      this.name = params.name;
      this.message = params.message;
      this.bot = params.bot;
      this.locale = (ref = params.prevHandler) != null ? ref.locale : void 0;
      this.session = params.session || {};
      this.type = this.name ? 'invoke' : null;
      this.isRedirected = !!params.prevHandler;
      (base = this.session).meta || (base.meta = {});
      (base1 = this.session.meta).user || (base1.user = (ref1 = this.message) != null ? ref1.from : void 0);
      (base2 = this.session.meta).chat || (base2.chat = (ref2 = this.message) != null ? ref2.chat : void 0);
      (base3 = this.session.meta).sessionId || (base3.sessionId = this.provideSessionId());
      (base4 = this.session).data || (base4.data = {});
      (base5 = this.session).backHistory || (base5.backHistory = {});
      (base6 = this.session).backHistoryArgs || (base6.backHistoryArgs = {});
      this.prevHandler = params.prevHandler;
      this.noChangeHistory = params.noChangeHistory;
      this.args = params.args;
      this.chain = [this.bot];
      this.middlewaresChains = this.bot.getMiddlewaresChains([]);
      this.isSynthetic = params.isSynthetic;
      this.command = null;
      this.context = ((ref3 = this.prevHandler) != null ? ref3.context.clone(this) : void 0) || new Context(this);
      if (this.isSynthetic) {
        this.type = 'synthetic';
      }
    }


    /*
    @param {String} locale current locale
     */

    CommandHandler.prototype.setLocale = function(locale) {
      var ref;
      this.locale = locale;
      return (ref = this.prevHandler) != null ? ref.setLocale(this.locale) : void 0;
    };


    /*
    @return {String} current locale
     */

    CommandHandler.prototype.getLocale = function() {
      return this.locale;
    };


    /*
    @return {String} sessionId
     */

    CommandHandler.prototype.provideSessionId = function() {
      return this.session.meta.chat.id;
    };


    /*
    Start handling message
    @return {Promise}
     */

    CommandHandler.prototype.handle = function() {
      var params, ref, ref1, ref2, ref3, ref4, ref5, ref6, ref7, text;
      if (this.message && !this.prevHandler) {
        if ((ref = this.message) != null ? ref.text : void 0) {
          text = this.message.text = _s.trim(this.message.text);
          if (text.indexOf('/') === 0) {
            this.type = 'invoke';
            params = text.slice(1).split(/\s+/);
            this.name = params[0].toLowerCase().replace(/@.+$/, '');
          } else {
            this.type = 'answer';
            this.name = (ref1 = this.session.meta) != null ? ref1.current : void 0;
          }
          if (this.type === 'answer' && !this.name) {
            this.name = 'start';
            this.type = 'invoke';
            this.args = [];
          }
        } else if (!this.isSynthetic) {
          this.type = 'answer';
          this.name = (ref2 = this.session.meta) != null ? ref2.current : void 0;
        }
      }
      this.commandsChain = this.bot.getCommandsChain(this.name);
      if (_.isString((ref3 = this.commandsChain[0]) != null ? ref3.name : void 0)) {
        this.command = this.commandsChain[0];
      }
      this.chain = this.bot.getCommandsChain(this.name, {
        includeBot: true
      });
      if (this.commandsChain.length) {
        if (this.type === 'invoke') {
          this.args || (this.args = (params != null ? params.slice(1) : void 0) || []);
        }
      } else if (!this.isSynthetic) {
        this.type = 'invoke';
        this.name = (ref4 = this.bot.getDefaultCommand()) != null ? ref4.name : void 0;
        this.commandsChain = this.bot.getCommandsChain(this.name);
      }
      if (!this.name && !this.isSynthetic) {
        return;
      }
      if (this.type === 'answer') {
        this.args = this.session.invokeArgs;
        if (!_.isEmpty(this.session.keyboardMap)) {
          this.answer = this.session.keyboardMap[this.message.text];
          if (this.answer == null) {
            if ((ref5 = this.command) != null ? ref5.compliantKeyboard : void 0) {
              this.answer = {
                value: this.message.text
              };
            } else {
              return;
            }
          }
        } else {
          this.answer = {
            value: this.message.text
          };
        }
      }
      if (this.type === 'invoke') {
        this.session.invokeArgs = this.args;
        if (!this.noChangeHistory && ((ref6 = this.prevHandler) != null ? ref6.name : void 0) && this.prevHandler.name !== this.name) {
          this.session.backHistory[this.name] = this.prevHandler.name;
          this.session.backHistoryArgs[this.name] = this.prevHandler.args;
        }
        this.session.meta.current = this.name;
        _.extend(this.session.meta, _.pick(this.message, 'from', 'chat'));
        this.session.meta.user = ((ref7 = this.message) != null ? ref7.from : void 0) || this.session.meta.user;
      }
      this.middlewaresChains = this.bot.getMiddlewaresChains(this.commandsChain);
      this.context.init();
      return promise.resolve(_(constants.STAGES).sortBy('priority').reject('noExecute').filter((function(_this) {
        return function(stage) {
          return !stage.type || stage.type === _this.type;
        };
      })(this)).map('name').value()).each((function(_this) {
        return function(stage) {
          var args, go, ref10, ref8, ref9;
          if (stage === 'answer' && ((((ref8 = _this.answer) != null ? ref8.handler : void 0) != null) || (((ref9 = _this.answer) != null ? ref9.go : void 0) != null))) {
            if (((ref10 = _this.answer) != null ? ref10.go : void 0) != null) {
              go = _this.answer.go;
              args = _this.answer.args;
              _this.answer.handler = function(ctx) {
                return ctx.go(go, {
                  args: args
                });
              };
            }
            return promise.resolve(_this.executeMiddleware(_this.answer.handler));
          } else {
            return promise.resolve(_this.executeStage(stage));
          }
        };
      })(this));
    };


    /*
    @return {Array} full command chain
     */

    CommandHandler.prototype.getFullChain = function() {
      return [this.context].concat(this.chain);
    };


    /*
    Render text
    @param {String} key localization key
    @param {Object} data template data
    @param {Object} [options] options
    @return {String}
     */

    CommandHandler.prototype.renderText = function(key, data, options) {
      var chain, command, exData, i, len, locale, text, textFn;
      if (options == null) {
        options = {};
      }
      locale = this.getLocale();
      chain = this.getFullChain();
      for (i = 0, len = chain.length; i < len; i++) {
        command = chain[i];
        textFn = command.getText(key, locale) || command.getText(key);
        if (textFn) {
          break;
        }
      }
      exData = {
        render: (function(_this) {
          return function(key) {
            return _this.renderText(key, data, options);
          };
        })(this)
      };
      data = _.extend({}, exData, data);
      text = textFn ? textFn(data) : !options.strict ? ejs.compile(key)(data) : void 0;
      return text;
    };


    /*
    @param {String} stage
    @return {Promise}
     */

    CommandHandler.prototype.executeStage = function(stage) {
      return promise.resolve(this.middlewaresChains[stage] || []).each((function(_this) {
        return function(middleware) {
          return _this.executeMiddleware(middleware);
        };
      })(this));
    };


    /*
    @param {Function} middleware
    @return {Promise}
     */

    CommandHandler.prototype.executeMiddleware = function(middleware) {
      if (!this.context.isEnded) {
        return promise.resolve(middleware(this.context));
      }
    };


    /*
    Go to command
    
    @param {String} name command name
    @param {Object} params params
    @option params {Array<String>} [args] Arguments for command
    @option params {Boolean} [noChangeHistory] No change chain history
     */

    CommandHandler.prototype.go = function(name, params) {
      var handler, message;
      if (params == null) {
        params = {};
      }
      message = _.extend({}, this.message);
      handler = new CommandHandler({
        message: message,
        bot: this.bot,
        session: this.session,
        prevHandler: this,
        name: name,
        noChangeHistory: params.noChangeHistory,
        args: params.args
      });
      return handler.handle();
    };


    /*
    @return {String} Previous state name
     */

    CommandHandler.prototype.getPrevStateName = function() {
      return this.session.backHistory[this.name];
    };

    CommandHandler.prototype.getPrevStateArgs = function() {
      var ref;
      return (ref = this.session.backHistoryArgs) != null ? ref[this.name] : void 0;
    };


    /*
    Render keyboard
    @param {String} name custom keyboard name
    @return {Object} keyboard array of keyboard
     */

    CommandHandler.prototype.renderKeyboard = function(name) {
      var chain, command, data, i, keyboard, len, locale, map, markup;
      locale = this.getLocale();
      chain = this.getFullChain();
      data = this.context.data;
      keyboard = null;
      for (i = 0, len = chain.length; i < len; i++) {
        command = chain[i];
        keyboard = command.getKeyboard(name, locale) || command.getKeyboard(name);
        if (typeof keyboard !== 'undefined') {
          break;
        }
      }
      keyboard = keyboard != null ? keyboard.render(locale, chain, data, this) : void 0;
      if (keyboard) {
        markup = keyboard.markup, map = keyboard.map;
        this.session.keyboardMap = map;
        return markup;
      } else {
        this.session.keyboardMap = {};
        return null;
      }
    };

    CommandHandler.prototype.unsetKeyboardMap = function() {
      return this.session.keyboardMap = {};
    };

    return CommandHandler;

  })();

  module.exports = CommandHandler;

}).call(this);
