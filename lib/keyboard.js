(function() {
  var KEYS, Keyboard, _, ejs, emoji,
    indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  ejs = require('ejs');

  _ = require('lodash');

  emoji = require('node-emoji');


  /*
  
  Keyboard examples
  
  [
    [
      {'text.key': 10}
      {'text.key1': {value: 10}}
      {'text.key2': {value: 10}}
      {key: 'text.key3', value: 'text.key3'}
      {text: 'Hello <%=user.name%>'} # raw text, which we compile
      {text: 'Hello <%=user.name%>', value: 'hello'} # raw text, which we compile
      'rowTemplate' # embed row
    ], [
      {'text.key': {go: 'state.name'}}
      {'text.key': {go: 'state.name'}}
      {'text.key': (ctx) -> $.goBack()}
      {'text.key': (ctx) -> $.goParent()}
      {'text.key': {handler: ($) -> $.goParent(), isShown: (ctx) -> ctx.data.user.age > 18}}
    ],
    'keyboardTemplate' # embed keyboard
  ]
   */

  KEYS = ['key', 'text', 'value', 'handler', 'go', 'isShown'];

  Keyboard = (function() {
    function Keyboard(keyboard, params, command1) {
      this.command = command1;
      this.type = params.type || 'table';
      this.keyboard = _.cloneDeep(keyboard).map((function(_this) {
        return function(row, i) {
          if (_this.type === 'row' && _.isPlainObject(row)) {
            row = _this.processColumn(row);
          }
          if (_.isArray(row)) {
            row = row.map(function(column) {
              if (_.isPlainObject(column)) {
                column = _this.processColumn(column);
              }
              return column;
            });
          }
          return row;
        };
      })(this));
    }

    Keyboard.prototype.processColumn = function(column) {
      var keys, ref, val;
      keys = Object.keys(column);
      if (ref = keys[0], indexOf.call(KEYS, ref) < 0) {
        val = column[keys[0]];
        if (_.isString(val)) {
          column = {
            key: keys[0],
            value: val
          };
        } else if (_.isFunction(val)) {
          column = {
            key: keys[0],
            handler: val
          };
        } else {
          column = {
            key: keys[0]
          };
          _.extend(column, val);
        }
      }
      if (column.text) {
        column.text = ejs.compile(column.text);
      }
      return column;
    };

    Keyboard.prototype.replaceLayouts = function(chain, locale) {
      var _row, column, i, j, k, keyboard, l, len, len1, len2, len3, m, ref, ref1, row;
      if (this.type === 'table') {
        keyboard = [];
        ref = this.keyboard;
        for (j = 0, len = ref.length; j < len; j++) {
          row = ref[j];
          if (_.isString(row)) {
            keyboard = keyboard.concat(this.embedLayout(row, chain, locale, 'table'));
          } else {
            keyboard.push(row);
          }
        }
        for (i = k = 0, len1 = keyboard.length; k < len1; i = ++k) {
          row = keyboard[i];
          _row = [];
          for (l = 0, len2 = row.length; l < len2; l++) {
            column = row[l];
            if (_.isString(column)) {
              _row = _row.concat(this.embedLayout(column, chain, locale, 'row'));
            } else {
              _row.push(column);
            }
          }
          keyboard[i] = _row;
        }
      } else {
        keyboard = [];
        ref1 = this.keyboard;
        for (m = 0, len3 = ref1.length; m < len3; m++) {
          column = ref1[m];
          if (_.isString(column)) {
            keyboard = keyboard.concat(this.embedLayout(column, chain, locale, 'row'));
          } else {
            keyboard.push(column);
          }
        }
      }
      return keyboard;
    };

    Keyboard.prototype.embedLayout = function(name, chain, locale, type) {
      var command, j, keyboard, len;
      for (j = 0, len = chain.length; j < len; j++) {
        command = chain[j];
        keyboard = command.getKeyboard(name, locale, type) || command.getKeyboard(name, null, type);
        if (keyboard) {
          break;
        }
      }
      if (!keyboard) {
        throw new Error("Can not find keyboard: " + name);
      }
      return keyboard.replaceLayouts(chain, locale);
    };

    Keyboard.prototype.render = function(locale, chain, data, handler) {
      var column, i, j, k, keyboard, len, len1, map, markup, markupRow, row, text;
      keyboard = this.replaceLayouts(chain, locale);
      map = {};
      markup = [];
      for (j = 0, len = keyboard.length; j < len; j++) {
        row = keyboard[j];
        markupRow = [];
        for (i = k = 0, len1 = row.length; k < len1; i = ++k) {
          column = row[i];
          text = column.text ? column.text(data) : handler.renderText(column.key, data);
          text = emoji.emojify(text);
          if (!column.isShown || column.isShown(handler.context)) {
            markupRow.push(text);
            map[text] = {
              handler: column.handler,
              value: column.value,
              go: column.go,
              args: column.args
            };
          }
        }
        if (markupRow.length) {
          markup.push(markupRow);
        }
      }
      return {
        markup: markup,
        map: map
      };
    };

    return Keyboard;

  })();

  module.exports = Keyboard;

}).call(this);
