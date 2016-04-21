(function() {
  var Command, _, mixins;

  _ = require('lodash');

  mixins = require('./mixins');


  /*
    - иерархия локализаций
      - определенный в контексте текущего обработчика
      - определенный в контексте текущей команды
      - определенный в контесте текущих шаблонных команд
    - иерархия embed клавиатур
      - определенный в контексте текущего обработчика
      - определенный в контексте текущей команды
      - определенный в контесте текущих шаблонных команд
    - иерархия middleware
      - before middleware
        - самый верхний родитель/родители
        - шаблоны
   */

  Command = (function() {
    function Command(name, params) {
      this.bot = params.bot;
      if (_.isString(name)) {
        name = name.toLowerCase();
      }
      this.name = name;
      this.isDefault = params.isDefault;
      this.compliantKeyboard = params.compliantKeyboard;
    }

    Command.prototype.invoke = function(handler) {
      return this.use('invoke', handler);
    };

    Command.prototype.answer = function(handler) {
      return this.use('answer', handler);
    };

    return Command;

  })();

  _.extend(Command.prototype, mixins);

  module.exports = Command;

}).call(this);
