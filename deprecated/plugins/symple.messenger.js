// ----------------------------------------------------------------------------
//  Symple Messenger
//  
Symple.Messenger = Symple.Class.extend({
    init: function(client, options) {
        var self = this;
        this.options = $.extend({
            recipient: null,                      // recipient peer object (will send to group scope if unset)
            element: '#messenger',                // root element
            viewSelector: '.message-view',
            sendSelector: '.message-compose button',
            textSelector: '.message-compose textarea',
            //doSendMessage: self.sendMessage,    // send message impl (send via symple by default)
            onAddMessage: function(message, el) {}, // message added callback
            template: '\
          <div class="message-view">\
          </div>\
          <div class="message-compose">\
              <textarea></textarea>\
              <button>Send</button>\
          </div>'
        }, options);

        Symple.log('Symple Messenger: Creating: ', this.options);

        this.element = $(this.options.element);
        if (this.element.children().length == 0)
            this.element.html(this.options.template);
        this.messages = $(this.options.viewSelector, this.element);
        //this.sendButton = $(this.options.sendSelector, this.element);
        //this.textArea = $(this.options.textSelector, this.element);

        this.client = client;
        this.client.on('Message', function(m) {
            self.onMessage(m);
        });

        this.fixedScrollPosition = false;
        this.bind();
        this.invalidate();
    },
    
    invalidate: function() {

        // Scroll to bottom unless position is fixed
        if (!this.fixedScrollPosition) {
            this.messages.scrollTop(this.messages[0].scrollHeight);
            //Symple.log('Symple Messenger: Update Scroll: ', this.messages[0].scrollHeight);
        }
    },
    
    bind: function() {
        var self = this;

        // Detect message scrolling
        this.messages.scroll(function() {
            self.fixedScrollPosition = !self.isScrollBottom(self.messages);
            //Symple.log('Symple Messenger: Message Scrolling: Fixed: ', self.fixedScrollPosition);
        });

        // Send account message
        this.element.find(this.options.sendSelector).click(function() {
            var textArea = self.element.find(self.options.textSelector);
            var text = textArea.val();
            if (text.length) {
                if (!self.options.recipient)
                    throw 'A message recipient must be set.';

                var message = new Symple.Message({
                    to: self.options.recipient,
                    from: self.client.peer,
                    body: text,
                    temp_id: Symple.randomString(8) // Enables us to track sent messages
                });

                self.addMessage(message, true);
                self.sendMessage(message);
                textArea.val('');
            }
            else
                alert('Sending an empty message?');
            return false;
        });
    },
    
    // Sends a message using the Symple client
    sendMessage: function(message) {
        Symple.log('Symple Messenger: Sending: ', message);
        this.client.send(message);
    },

    onMessage: function(message) {
        Symple.log('Symple Messenger: On message: ', message);

        if (!this.options.recipient ||
            this.options.recipient.user == message.from.user) {

            var e = this.messages.find('.message[data-temp-id="' + message.temp_id + '"]');
            if (e.length) {
                Symple.log('Symple Messenger: Message Confimed: ', message);
                e.attr('data-message-id', message.id);
                e.removeClass('pending');
            }
            else {
                Symple.log('Symple Messenger: Message Received: ', message);
                this.addMessage(message);
            }
        }
    },

    addMessage: function(message, pending) {
        var self = this;
        message.time = this.messageTime(message);
        var section = this.getOrCreateDateSection(message);
        var element = $(this.messageToHTML(message))
        element.data('time', message.time)

        // Prepend if there is a newer message
        var messages = section.find('.message');
        var handled = false;
        if (messages.length) {
            messages.each(function() {
                var e = $(this);
                if (e.data('time') > message.time) {
                    e.before(element)
                    handled = true;
                    return false;
                }
            });
        }

        // Otherwise append the message to the section
        if (!handled) {
            section.append(element);
        }

        // Scroll to bottom unless position is fixed
        this.invalidate();
        
        // Add a pending class which will be removed 
        // when the message is confirmed
        if (pending)
            element.addClass('pending');

        Symple.log('Symple Messenger: Added Message');
        this.options.onAddMessage(message, element);
        return element;
    },

    //
    // Utilities & Helpers
    //
    formatTime: function(date) {        
        function pad(n) { return n < 10 ? ('0' + n) : n }
        return pad(date.getHours()).toString() + ':' +
            pad(date.getMinutes()).toString() + ':' +
            pad(date.getSeconds()).toString() + ' ' +
            pad(date.getDate()).toString() + '/' +
            pad(date.getMonth()).toString();
    },

    messageToHTML: function(message) {
        var time = message.time ? message.time : this.messageTime(message);
        var html = '<div class="message" data-message-id="' + (message.id || -1) + '" data-temp-id="' + message.temp_id + '">';
        if (message.from &&
            typeof(message.from) == 'object' &&
            typeof(message.from.name) == 'string')
            html += '<span class="sender">' + message.from.name + '</span>: ';
        html += '<span class="body">' + (typeof(message.body) == 'undefined' ? message.data : message.body) + '</span>';
        html += '<span class="date">' + this.formatTime(time) + '</span>';
        html += '</div>';
        return html;
    },

    messageTime: function(message) {
        return typeof(message.sent_at) == 'undefined' ? new Date() : Symple.parseISODate(message.sent_at)
    },

    isScrollBottom: function(elem) {
        return (elem[0].scrollHeight - elem.scrollTop() == elem.outerHeight());
    },

    getOrCreateDateSection: function(message) {
        var time = message.time ? message.time : this.messageTime(message);
        var dateStr = time.toDateString();
        var section = this.messages.find('.section[data-date="' + dateStr + '"]');
        if (!section.length) {
            section = $(
                '<div class="section" data-date="' + dateStr + '">' +
                '   <span class="section-date">' + dateStr + '</span>' +
                '</div>');

            var handled = false;
            var prev = null;
            this.messages.find('.section').each(function() {
                var e = $(this);
                var secDate = new Date(e.attr('data-date'));
                Symple.log('Symple Messenger: Comparing Date Section: ', secDate.toDateString(), dateStr)

                // If the section day is later than the message we prepend the
                // section before the current section.
                if (secDate > time) {
                    e.before(section)
                    handled = true;
                    return false;
                }

                // If this section is from a day before the current message we
                // append the section after it
                else
                    prev = e;
            });
            Symple.log('Symple Messenger: Creating Date Section: ', dateStr, prev)
 
            if (!handled) {
                prev ?
                    prev.after(section) :
                    this.messages.append(section)
            }
        }

        return section;
    }
});