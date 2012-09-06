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
    var self = this;
    this.options = $.extend({
        recipient: null,                    // recipient peer object (required)
        element: '#messenger',              // root element
        //messages: '',                     // stored messages
        viewSelector: '.message-view',
        sendSelector: '.message-compose button',
        textSelector: '.message-compose textarea',
        doSendMessage: self.sendMessage,    // send message impl (send via symple by default)
        onAddMessage: function(message, el) {}//, // message added callback
        //onClickMessage: function(message, el) {} // message clicked callback
    }, options);

    console.log('Symple Messenger: Creating: ', this.options);

    this.element = $(this.options.element);
    if (this.element.children().length == 0)
        this.element.html(this.generateHTML());
    this.messages = $(this.options.viewSelector, this.element);
    this.sendButton = $(this.options.sendSelector, this.element);
    this.textArea = $(this.options.textSelector, this.element);

    this.client = client;
    this.client.on('message', function(m) {
        console.log('Symple Messenger: Message:', m, self.options.recipient, m.from.user);
        //self.roster.onPresence(p);

        try {
            if (!self.options.recipient)
                throw 'No recipient has been set.';

            if (self.options.recipient.user == m.from.user)
                self.addMessage(m);
        }
        catch (e) {
            console.log('Symple Messenger: Message Error: ', e);
        }
    });

    this.fixedScrollPosition = false;
    this.bind();
}


Symple.Messenger.prototype = {
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
                if (typeof self.options.recipient != 'object')
                    throw 'A message recipient must be set.';

                var message = new Symple.Message({
                    to: self.options.recipient,
                    from: self.client.roster.ourPeer(),
                    body: self.textArea.val()
                });

                var e = self.addMessage(message);
                self.options.doSendMessage(message, e);
                self.textArea.val('');
            }
            return false;
        });
    },
    
    // Sends a message using the Symple client
    sendMessage: function(message) {
        console.log('Symple Messenger: Sending Message', self.options.sender, self.options.recipient, message);
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
                    //console.log('Symple Messenger: Prepending Message To Parent: ', e);
                    e.before(element)
                    handled = true;
                    return false;
                }
            });
        }

        // Otherwise append the message to the section
        if (!handled) {
            //console.log('Symple Messenger: Appending Message To Section');
            section.append(element);
        }

        // Scroll to bottom unless position is fixed
        if (!this.fixedScrollPosition)
            this.messages.scrollTop(this.messages[0].scrollHeight);


        console.log('Symple Messenger: Added Message');
        this.options.onAddMessage(message, element);
        return element;
    },

    //
    // Utilities
    //

    generateHTML: function() {
        return (
            '<a href="#" class="load-more">Show more...</a>' +
            '<div class="message-view">' +
            '</div>' +
            '<div class="message-compose">' +
            '  <div class="message-compose-text">' +
            '    <textarea></textarea>' +
            '  </div>' +
            '  <button>Send</button>' +
            '</div>');
    },

    formatTime: function(date) {
        return date.getHours().toString() + ':' +
        date.getMinutes().toString() + ':' +
        date.getSeconds().toString() + ' ' +
        date.getDate().toString() + '/' +
        date.getMonth().toString();
    },

    messageToHTML: function(message) {
        var time = message.time ? message.time : this.messageTime(message);
        var html = '<div class="message" data-message-id="' + message.id + '">';
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
        var date = new Date(dateStr);
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
}



    //formatDate: function(date) {
    //    return date.toDateString();
    //},
                // If this section is from same day a the current message we
                // messed up
                //if (secDate == date) {
                //    console.log('Symple Messenger: Comparing Date Section: Error')
                //}
        /*
        var date = new Date();
        var dateStr = date.getHours().toString() + ':' +
        date.getMinutes().toString() + ':' +
        date.getSeconds().toString() + ' ' +
        date.getDate().toString() + '/' +
        date.getMonth().toString();
        */
        //var ts = Math.round(time.getTime() / 1000); data-time="' + ts + '"

        //
        //this.flashMessage(element, '#FFF8CF', 3);
        //this.messages.scrollTop(this.messages.height());
        //this.messages.animate({ scrollTop: this.messages.attr("scrollHeight") }, 1000);
    //...
    //}

        //this.messages.append(html);

        //    '.section[data-date="' + date + '"]'
        //this.element.find('data-data=').unbind().click(function() {

    /*
    flashMessage: function(e, color, times, duration) {
        var original = e.css('background-color');
        //var e = this;
        if (!duration) duration = 300;
        //console.log('Symple Messenger: flash', color, original, times, duration);
        e.css('background-color', color)
            .effect('pulsate', {
                times: times ? (times - 1) : 1
            }, duration, function() {
                e.css('background-color', original)
            });
    },



        //var time = this.messageTime(message);
    -          var startDate = $startDate.datepicker('getDate');
-          var endDate = $endDate.datepicker('getDate');
-          $assets.each(function() {
-            var e = $(this);
-            var timestamp = new Date(parseInt(e.attr('data-time'))*1000);
-            if (timestamp <= startDate ||
-                timestamp >= endDate)
-                e.hide();
-            else
-                e.show();
-          });
*/