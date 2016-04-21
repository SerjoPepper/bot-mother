(function() {
  var Keyboard, _, _s, compileKeys, constants, deepReplace, dot, ejs,
    hasProp = {}.hasOwnProperty;

  _ = require('lodash');

  ejs = require('ejs');

  constants = require('./constants');

  Keyboard = require('./keyboard');

  dot = require('dot-object');

  _s = require('underscore.string');

  deepReplace = function(val, fn) {
    var i, j, k, len, v;
    if (_.isObject(val)) {
      for (k in val) {
        if (!hasProp.call(val, k)) continue;
        v = val[k];
        val[k] = deepReplace(fn(v, k), fn);
      }
    } else if (_.isArray(val)) {
      for (i = j = 0, len = val.length; j < len; i = ++j) {
        v = val[i];
        val[i] = deepReplace(fn(v, i), fn);
      }
    }
    return val;
  };

  compileKeys = function(obj) {
    return deepReplace(obj, function(val, k) {
      if (_.isString(val)) {
        val = ejs.compile(_s.trim(val));
      }
      return val;
    });
  };

  module.exports = {
    keyboard: function(name, keyboard, params) {
      var base, locale;
      if (!_.isString(name)) {
        params = keyboard;
        keyboard = name;
        name = constants.DEFAULT_KEYBOARD;
      }
      params || (params = {});
      locale = params.locale || constants.DEFAULT_LOCALE;
      this._keyboards || (this._keyboards = {});
      (base = this._keyboards)[locale] || (base[locale] = {});
      this._keyboards[locale][name] = keyboard ? new Keyboard(keyboard, params, this) : null;
      return this;
    },
    getKeyboard: function(name, locale, type) {
      var keyboard, ref, ref1;
      if (name == null) {
        name = constants.DEFAULT_KEYBOARD;
      }
      if (locale == null) {
        locale = constants.DEFAULT_LOCALE;
      }
      keyboard = (ref = this._keyboards) != null ? (ref1 = ref[locale]) != null ? ref1[name] : void 0 : void 0;
      if (type) {
        return type === (keyboard != null ? keyboard.type : void 0) && keyboard;
      } else {
        return keyboard;
      }
    },
    includeKeyboard: function(name) {},
    texts: function(texts, params) {
      var base, locale;
      if (params == null) {
        params = {};
      }
      locale = params.locale || constants.DEFAULT_LOCALE;
      this._texts || (this._texts = {});
      (base = this._texts)[locale] || (base[locale] = {});
      _.merge(this._texts[locale], compileKeys(_.cloneDeep(texts)));
      return this;
    },
    getText: function(key, locale) {
      var ref;
      if (locale == null) {
        locale = constants.DEFAULT_LOCALE;
      }
      return dot.pick(key, (ref = this._texts) != null ? ref[locale] : void 0);
    },
    use: function(type, handler) {
      var base;
      this._middlewares || (this._middlewares = {});
      (base = this._middlewares)[type] || (base[type] = []);
      this._middlewares[type].push(handler);
      return this;
    },
    getMiddlewares: function(type) {
      this._middlewares || (this._middlewares = {});
      return this._middlewares[type] || [];
    }
  };

}).call(this);
