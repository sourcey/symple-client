// ----------------------------------------------------------------------------
//
//  Symple Messenger
//
//  Example Markup:
//  <div id="player">
//    <div id="player-message">
//    </div>
//    <div id="player-status">
//    </div>
//    <div id="player-screen">
//    </div>
//    <div id="player-controls">
//      <a class="play-btn" rel="play" href="#">Play</a>
//      <a class="stop-btn" rel="stop" href="#">Stop</a>
//    </div>
//  </div>
//
// ----------------------------------------------------------------------------
Symple.Messenger = function(client, options) {
    this.options = $.extend({
        sender: 'Anonymous',    // our name
        recipient: '',          // recipient symple id
        element: '#messenger',  // root element
        messages: '',           // stored messages
        viewSelector: '.message-view',
        sendSelector: '.message-compose button',
        textSelector: '.message-compose textarea'
    }, options);
    this.client = client;
    this.element = $(this.options.element);
    if (this.element.children().length == 0)
      this.element.html(this.generateHTML());
    this.messages = $(this.options.viewSelector, this.element);
    this.sendButton = $(this.options.sendSelector, this.element);
    this.textArea = $(this.options.textSelector, this.element);
    this.bind();
}


Symple.Messenger.prototype = {
  bind: function() {
    var self = this;

    // Send account message
    this.element.find('.message-compose button').unbind().click(function() {
      if (self.textArea.val().length) {
        var message = new Symple.Message({
          to: self.options.recipient,
          sender: self.options.sender,
          body: self.textArea.val()
        });
        self.client.send(message);
        self.appendMessage(message);
        self.textArea.val('');
      }
    });
  },

  generateHTML: function() {
    return (
      '<div data-messages="' + this.options.recipient + '" class="message-view">' +
        this.options.messages +
      '</div>' +
      '<div class="message-compose">' +
      '  <div class="message-compose-text">' +
      '    <textarea></textarea>' +
      '  </div>' +
      '  <button>Send</button>' +
      '</div>');
  },

  appendMessage: function(message) {
    console.log(message.toHTML());
    this.messages.append(message.toHTML());
    this.messages.scrollTop(this.messages.height());
  }
}