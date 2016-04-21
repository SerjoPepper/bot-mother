(function() {
  var botanio;

  botanio = require('botanio');

  module.exports.botanio = function(key) {
    var botan;
    botan = botanio(key);
    return function(context) {
      if (!context.isBotanioTracked && !context.isSynthetic && !context.isRedirected) {
        context.isBotanioTracked = true;
        botan.track(context.message, context.command.name);
      }
    };
  };

  module.exports.typing = function() {
    return function(context) {
      context.bot.api.sendChatAction(context.meta.chat.id, 'typing');
    };
  };

}).call(this);
