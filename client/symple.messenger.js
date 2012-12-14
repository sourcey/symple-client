// ----------------------------------------------------------------------------
//
//  Symple Messenger
//  
// ----------------------------------------------------------------------------
Symple.Messenger = Class.extend({
    init: function(client, options) {
        var self = this;
        this.options = $.extend({
            recipient: null,                    // recipient peer object (will send to group scope if unset)
            element: '#messenger',              // root element
            viewSelector: '.message-view',
            sendSelector: '.message-compose button',
            textSelector: '.message-compose textarea',
            //doSendMessage: self.sendMessage,    // send message impl (send via symple by default)
            onAddMessage: function(message, el) {}, // message added callback
            template: '\
            <div class="message-view"> \
                <a href="#" class="load-more">Show more...</a> \
            </div> \
            <div class="message-compose"> \
              <div class="message-compose-text"> \
                <textarea></textarea> \
              </div> \
              <button>Send</button> \
            </div>'
        }, options);

        console.log('Symple Messenger: Creating: ', this.options);

        this.element = $(this.options.element);
        if (this.element.children().length == 0)
            this.element.html(this.options.template);
        this.messages = $(this.options.viewSelector, this.element);
        this.sendButton = $(this.options.sendSelector, this.element);
        this.textArea = $(this.options.textSelector, this.element);

        this.client = client;
        this.client.on('Message', function(m) {
            console.log('Symple Messenger: On Message:', m, self.options.recipient, m.from.user);
            //self.roster.onPresence(p);

            //try {
                //if ()
                //    throw 'No recipient has been set.';

                if (!self.options.recipient || 
                    self.options.recipient.user == m.from.user) {

                    var e = self.messages.find('.message[data-temp-id="' + m.temp_id + '"]');
                    if (e.length) {
                        console.log('Symple Messenger: Message Confimed: ', m);
                        e.attr('data-message-id', m.id);
                        e.removeClass('pending');
                    }
                    else {
                        console.log('Symple Messenger: Message Received: ', m);
                        self.addMessage(m);
                    }
                }

                //else if (self.sender().user == m.to.user)
                //    self.addMessage(m);
            //}
            //catch (e) {
            //    console.log('Symple Messenger: Message Error: ', e);
            //}
        });

        this.fixedScrollPosition = false;
        this.bind();
    },

    bind: function() {
        var self = this;

        // Detect message scrolling
        this.messages.scroll(function() {
            self.fixedScrollPosition = !self.isScrollBottom(self.messages);
            console.log('Symple Messenger: Message Scrolling: Fixed: ', self.fixedScrollPosition);
        });

        // Send account message
        this.element.find('.message-compose button').unbind().click(function() {
            if (self.textArea.val().length) {
                if (!self.options.recipient)
                    throw 'A message recipient must be set.';

                var message = new Symple.Message({
                    to: self.options.recipient,
                    from: self.sender(),
                    body: self.textArea.val(),
                    temp_id: Sourcey.randomString(8)
                });

                var e = self.addMessage(message);
                e.addClass('pending');
                self.sendMessage(message);
                self.textArea.val('');
            }
            return false;
        });
    },

    // The sender is the current peer
    sender: function() {
        return this.client.ourPeer;
    },
    
    // Sends a message using the Symple client
    sendMessage: function(message) {
        console.log('Symple Messenger: Sending: ', message);
        this.client.send(message);
    },

    addMessage: function(message) {
        var self = this;
        message.time = this.messageTime(message);
        var section = this.getOrCreateDateContainer(message);
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
        this.updateScrollPosition();

        console.log('Symple Messenger: Added Message');
        this.options.onAddMessage(message, element);
        return element;
    },

    updateScrollPosition: function() {
        console.log('Symple Messenger: Update Scroll Position: ', this.fixedScrollPosition, this.messages[0].scrollHeight);

        // Scroll to bottom unless position is fixed
        if (!this.fixedScrollPosition)
            this.messages.scrollTop(this.messages[0].scrollHeight);
    },

    //
    // Utilities
    //
    formatTime: function(date) {
        return date.getHours().toString() + ':' +
        date.getMinutes().toString() + ':' +
        date.getSeconds().toString() + ' ' +
        date.getDate().toString() + '/' +
        date.getMonth().toString();
    },

    messageToHTML: function(message) {


        var time = message.time ? message.time : this.messageTime(message);
        var html = '<div class="message" data-message-id="' + message.id + '" data-temp-id="' + message.temp_id + '">';
        html += '<div class="details">';
        if (message.from &&
            typeof(message.from) == 'object' &&
            typeof(message.from.name) == 'string')
            html += '<span class="sender">' + message.from.name + '</span>: ';
        html += '<span class="date">' + this.formatTime(time) + '</span>';
        //html += '<span class="delete">&nbsp</span>';
        html += '</div>';
        html += '<div class="body">' + (typeof(message.body) == 'undefined' ? message.data : message.body) + '</div>';
        html += '</div>';
        return html;
    },

    messageTime: function(message) {
        return typeof(message.sent_at) == 'undefined' ? new Date() : new Date(Date.parse(message.sent_at))
    },

    isScrollBottom: function(elem) {
        return (elem[0].scrollHeight - elem.scrollTop() == elem.outerHeight());
    },

    getOrCreateDateContainer: function(message) {
        var time = message.time ? message.time : this.messageTime(message);
        var dateStr = time.toDateString();
        //var date = new Date(dateStr);
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
                console.log('Symple Messenger: Comparing Date Section: ', secDate.toDateString(), dateStr)

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
            console.log('Symple Messenger: Creating Date Section: ', dateStr, prev)

            if (!handled) {
                prev ?
                    prev.after(section) :
                    this.messages.append(section)
            }
        }

        return section;
    }
});


        //if (!this.fixedScrollPosition) {
        //    console.log('Symple Messenger: Added Message: ', this.fixedScrollPosition, this.messages, this.messages[0].scrollHeight);
        //    this.messages.scrollTop(this.messages[0].scrollHeight);
        //}