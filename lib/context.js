(function() {
  var Context, RESTRICTED_PROPS, _, emoji, mixins, prepareText,
    indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  _ = require('lodash');

  emoji = require('node-emoji');

  mixins = require('./mixins');

  prepareText = function(text) {
    return emoji.emojify(text);
  };

  RESTRICTED_PROPS = ['isRedirected', 'isSynthetic', 'message', 'session', 'bot', 'command', 'isEnded', 'meta'];


  /*
  Context of the bot command
  
  @property {Bot} bot
  @property {Object} session
  @property {Message} message telegram message
  @property {Boolean} isRedirected
  @property {Boolean} isSynthetic this context created with .withContext handler
  @property {Boolean} isEnded this command is ended
  @property {Object} data template data
  @property {Object} meta meta information
  @property {Object} command object tha represent current command. Has follow fields: name, args, type. Where type is 'answer' or 'invoke'
   */

  Context = (function() {
    function Context(handler) {
      this._handler = handler;
      this.bot = this._handler.bot;
      this.session = this._handler.session.data;
      this.message = this._handler.message;
      this.isRedirected = this._handler.isRedirected;
      this.isSynthetic = this._handler.isSynthetic;
      this.meta = this._handler.session.meta;
      this.command = {
        name: this._handler.name,
        args: this._handler.args,
        type: this._handler.type
      };
      this._handler = handler;
      this._api = this._handler.bot.api;
      this._user = this._handler.session.meta.user;
      this._temp = {};
      this.data = {};
    }


    /*
    Initialize
     */

    Context.prototype.init = function() {
      var ref;
      this.command = {
        name: this._handler.name,
        args: this._handler.args,
        type: this._handler.type
      };
      return this.answer = (ref = this._handler.answer) != null ? ref.value : void 0;
    };


    /*
    Hide keyboard
     */

    Context.prototype.hideKeyboard = function() {
      return this.useKeyboard(null);
    };


    /*
    Use previous state keyboard
    @return {Context} this
     */

    Context.prototype.usePrevKeyboard = function() {
      this._temp.usePrevKeyboard = true;
      return this;
    };


    /*
    Use named keyboard
    @return {Context} this
     */

    Context.prototype.useKeyboard = function(name) {
      this._temp.keyboardName = name;
      return this;
    };


    /*
    Use this method to get a list of profile pictures for a user.
    Returns a [UserProfilePhotos](https://core.telegram.org/bots/api#userprofilephotos) object.
    @param  {Number} [offset=0] Sequential number of the first photo to be returned. By default, offset is 0.
    @param  {Number} [limit=1] Limits the number of photos to be retrieved. Values between 1—100 are accepted. Defaults to 1.
    @return {Promise}
    @see https://core.telegram.org/bots/api#getuserprofilephotos
     */

    Context.prototype.getUserProfilePhotos = function(offset, limit) {
      if (offset == null) {
        offset = 0;
      }
      if (limit == null) {
        limit = 1;
      }
      return this.bot.api.getUserProfilePhotos(this._user.id, offset, limit);
    };


    /*
    Render text
    @param {String} key text or key from localization dictionary
    @param {Object} options
     */

    Context.prototype.render = function(key, options) {
      return this._handler.renderText(key, this.data, options);
    };


    /*
    Send message
    @param {String} text text or key from localization dictionary
    @param {Object} params additional telegram params
    @return {Promise}
    @see https://core.telegram.org/bots/api#sendmessage
     */

    Context.prototype.sendMessage = function(text, params) {
      if (params == null) {
        params = {};
      }
      if (params.render !== false) {
        text = this.render(text);
      }
      return this._withMiddlewares((function(_this) {
        return function() {
          return _this._api.sendMessage(_this.meta.chat.id, prepareText(text), _this._prepareParams(params));
        };
      })(this));
    };


    /*
    Same as sendMessage
     */

    Context.prototype.sendText = function(key, params) {
      return this.sendMessage(key, params);
    };


    /*
    Send photo
    @param {String|stream.Stream} photo A file path or a Stream. Can also be a 'file_id' previously uploaded
    @param  {Object} [params] Additional Telegram query options
    @return {Promise}
    @see https://core.telegram.org/bots/api#sendphoto
     */

    Context.prototype.sendPhoto = function(photo, params) {
      if (params == null) {
        params = {};
      }
      if (params.caption) {
        if (params.render !== false) {
          params.caption = this.render(params.caption);
        }
        params.caption = prepareText(params.caption);
      }
      return this._withMiddlewares((function(_this) {
        return function() {
          return _this._api.sendPhoto(_this.meta.chat.id, photo, _this._prepareParams(params));
        };
      })(this));
    };


    /*
    Forward message
    @param  {Number|String} fromChatId Unique identifier for the chat where the
    original message was sent
    @param  {Number|String} messageId  Unique message identifier
    @return {Promise}
     */

    Context.prototype.forwardMessage = function(fromChatId, messageId) {
      return this._withMiddlewares((function(_this) {
        return function() {
          return _this._api.forwardMessage(_this.meta.chat.id, fromChatId, messageId);
        };
      })(this));
    };


    /*
    Send audio
    @param  {String|stream.Stream} audio A file path or a Stream. Can also be a `file_id` previously uploaded.
    @param  {Object} [params] Additional Telegram query options
    @return {Promise}
    @see https://core.telegram.org/bots/api#sendaudio
     */

    Context.prototype.sendAudio = function(audio, params) {
      return this._withMiddlewares((function(_this) {
        return function() {
          return _this._api.sendAudio(_this.meta.chat.id, audio, _this._prepareParams(params));
        };
      })(this));
    };


    /*
    Send Document
    @param  {String|stream.Stream} doc A file path or a Stream. Can also be a `file_id` previously uploaded.
    @param  {Object} [params] Additional Telegram query options
    @return {Promise}
    @see https://core.telegram.org/bots/api#sendDocument
     */

    Context.prototype.sendDocument = function(doc, params) {
      return this._withMiddlewares((function(_this) {
        return function() {
          return _this._api.sendDocument(_this.meta.chat.id, doc, _this._prepareParams(params));
        };
      })(this));
    };


    /*
    Send .webp stickers.
    @param  {String|stream.Stream} sticker A file path or a Stream. Can also be a `file_id` previously uploaded.
    @param  {Object} [params] Additional Telegram query options
    @return {Promise}
    @see https://core.telegram.org/bots/api#sendsticker
     */

    Context.prototype.sendSticker = function(sticker, params) {
      return this._withMiddlewares((function(_this) {
        return function() {
          return _this._api.sendSticker(_this.meta.chat.id, sticker, _this._prepareParams(params));
        };
      })(this));
    };


    /*
    Send video files, Telegram clients support mp4 videos (other formats may be sent with `sendDocument`)
    @param  {String|stream.Stream} video A file path or a Stream. Can also be a `file_id` previously uploaded.
    @param  {Object} [params] Additional Telegram query options
    @return {Promise}
    @see https://core.telegram.org/bots/api#sendvideo
     */

    Context.prototype.sendVideo = function(video, params) {
      return this._withMiddlewares((function(_this) {
        return function() {
          return _this._api.sendVideo(_this.meta.chat.id, video, _this._prepareParams(params));
        };
      })(this));
    };


    /*
    Send chat action.
    `typing` for text messages,
    `upload_photo` for photos, `record_video` or `upload_video` for videos,
    `record_audio` or `upload_audio` for audio files, `upload_document` for general files,
    `find_location` for location data.
    @param  {Number|String} chatId  Unique identifier for the message recipient
    @param  {String} action Type of action to broadcast.
    @return {Promise}
    @see https://core.telegram.org/bots/api#sendchataction
     */

    Context.prototype.sendChatAction = function(action) {
      return this._withMiddlewares((function(_this) {
        return function() {
          return _this._api.chatAction(_this.meta.chat.id, action);
        };
      })(this));
    };


    /*
    Send location.
    Use this method to send point on the map.
    @param  {Float} latitude Latitude of location
    @param  {Float} longitude Longitude of location
    @param  {Object} [params] Additional Telegram query options
    @return {Promise}
    @see https://core.telegram.org/bots/api#sendlocation
     */

    Context.prototype.sendLocation = function(latitude, longitude, params) {
      return this._withMiddlewares((function(_this) {
        return function() {
          return _this._api.sendLocation(_this.meta.chat.id, latitude, longitude, _this._prepareParams(params));
        };
      })(this));
    };


    /*
    Set locale for context
    @param {String} locale Locale
     */

    Context.prototype.setLocale = function(locale) {
      return this._handler.setLocale(locale);
    };


    /*
    Get current context locale
    @return {String}
     */

    Context.prototype.getLocale = function() {
      return this._handler.getLocale();
    };


    /*
    Go to certain command
    
    @param {String} name command name
    @param {Object} params params
    @option params {Array<String>} [args] Arguments for command
    @option params {Boolean} [noChangeHistory] No change chain history
    @return {Promise}
     */

    Context.prototype.go = function(name, params) {
      this.end();
      return this._handler.go(name, params);
    };


    /*
    Go to parent command.
    @return {Promise}
     */

    Context.prototype.goParent = function() {
      return this.go(this._handler.name.split('_').slice(0, -1).join('_') || this._handler.name);
    };


    /*
    Go to previous command.
    @return {Promise}
     */

    Context.prototype.goBack = function() {
      return this.go(this._handler.getPrevStateName(), {
        noChangeHistory: true,
        args: this._handler.getPrevStateArgs()
      });
    };


    /*
    Repeat current command
    @return {Promise}
     */

    Context.prototype.repeat = function() {
      return this.go(this._handler.name, {
        noChangeHistory: true,
        args: this.command.args
      });
    };


    /*
    Break middlewares chain
     */

    Context.prototype.end = function() {
      return this.isEnded = true;
    };


    /*
    Clone context
    @param {CommandHandler} handler Command handler for new context
    @return {Context}
     */

    Context.prototype.clone = function(handler) {
      var res, setProps;
      res = new Context(handler);
      setProps = Object.getOwnPropertyNames(this).filter(function(prop) {
        return !(indexOf.call(RESTRICTED_PROPS, prop) >= 0 || prop.indexOf('_') === 0);
      });
      return _.extend(res, _.pick(this, setProps));
    };

    Context.prototype._withMiddlewares = function(cb) {
      return this._handler.executeStage('beforeSend').then(function() {
        return cb();
      }).then((function(_this) {
        return function(result) {
          return _this._handler.executeStage('afterSend').then(function() {
            return result;
          });
        };
      })(this));
    };

    Context.prototype._prepareParams = function(params) {
      var _params, markup;
      if (params == null) {
        params = {};
      }
      markup = this._provideKeyboardMarkup();
      _params = {};
      if (params.caption) {
        params.caption = prepareText(params.caption);
      }
      if (markup) {
        _params.reply_markup = JSON.stringify(markup);
      }
      return _.extend(_params, params);
    };

    Context.prototype._renderKeyboard = function() {
      if (this._temp.keyboardName === null) {
        return null;
      } else {
        return this._handler.renderKeyboard(this._temp.keyboardName);
      }
    };

    Context.prototype._provideKeyboardMarkup = function() {
      var markup, noPrivate, ref;
      noPrivate = this.meta.chat.type !== 'private';
      if (((ref = this._handler.command) != null ? ref.compliantKeyboard : void 0) && noPrivate) {
        return {
          force_reply: true
        };
      } else {
        if (this._temp.usePrevKeyboard) {
          return null;
        } else {
          markup = this._renderKeyboard();
          if (markup && !_.isEmpty(markup) && markup.some(function(el) {
            return !_.isEmpty(el);
          })) {
            return {
              keyboard: markup,
              resize_keyboard: true
            };
          } else {
            this._handler.unsetKeyboardMap();
            if (noPrivate) {
              return {
                force_reply: true
              };
            } else {
              return {
                hide_keyboard: true
              };
            }
          }
        }
      }
    };

    return Context;

  })();

  _.extend(Context.prototype, mixins);

  module.exports = Context;

}).call(this);
