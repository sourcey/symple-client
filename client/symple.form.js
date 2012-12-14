//
// Symple Form Message
//
Symple.Form = function(json) {
    if (typeof(json) == 'object')
        this.fromJSON(json);
    this.type = "form";
}

Symple.Form.prototype = {
    getField: function(id) {
        return Sourcey.findNestedWithProperty(this, 'id', id);
    },

    hasElementType: function(type) {
        return Sourcey.findNestedWithProperty(this, 'type', type) != null;
    },

    hasMultiplePages: function() {
        return Sourcey.countNestedWithProperty(this, 'type', 'page') > 1
    },

    /*
    // Updates
    update: function(json) {
        if (json.id != this.id)
            throw 'Invalid form data'

        var self = this;
        this.fromJSON(json);
        this.getHTMLInputs().each(function() {
            self.updateElementFromField(this);
        });
        //Sourcey.findNestedWithProperty(this, 'id', id);
    },

    // Converts the inner XML object to form HTML
    toHTML: function(pageMenu, builder) {
        if (!builder)
            builder = new Symple.Form.Builder(this);
        //console.log(builder)
        //console.log('toHTML: ', this)
        var html = '';
        html += builder.startFormHTML(this);
        if (pageMenu)
            html += builder.buildPageMenu(this, 0);
        html += builder.buildElements(this, 0);
        html += builder.endFormHTML(this);
        return html;
    },
    */

    fromJSON: function(json) {
        json = Sourcey.merge(this, json);
        for (var key in json)
            this[key] = json[key];
    }
};


//
// Form Builder
//
Symple.Form.Builder = function(form, element, options) {
    this.form = form;
    this.element = $(element);
    this.options = options || {};
}

Symple.Form.Builder.prototype = {

    // Builds the form.
    build: function() {
        this.element.html(this.buildForm(this.form));
        this.postProcess();
    },

    // Updates fields values and errors on response.
    // formData may be the complete form or a partial subset
    // as long as the original structure is maintained.
    // If the rebuild flag is set then the form will be rebuilt.
    // Note that only Fields can be updated and inserted using
    // this method, not Page or Section elements.
    update: function(formData) {
        if (formData.rebuild == true) {
            this.form = new Symple.Form(formData);
            console.log('Form Builder: Rebuilding Form: ', this.form.id);
            //var html = this.buildElements(this.form, 0);
            //this.element.html(this.buildForm(this.form));
            this.build();
        }
        else {
            console.log('Form Builder: Updating Form: ', this.form.id);
            if (this.form)
                this.form.fromJSON(formData);
            this.updateElements(formData, 0);
            this.postProcess();
        }
    },

    // Prepares the form to be sent. This includes updating
    // internal form values, clearing errors, notes, and
    // setting the action to "submit". Uses JQuery
    prepareSubmit: function() {
        var self = this;
        this.form.action = 'submit';
        Sourcey.deleteNestedKeys(this.form, 'error');
        this.getHTMLInputs().each(function() {
            self.updateFieldFromHTML(this);
        });
    },

    // Updates field JSON from HTML.
    updateFieldFromHTML: function(el) {
        el = $(el);
        var id = el.attr('id');
        var field = this.form.getField(id);
        if (!id || !field) { // || el.attr('name') == 'submit'
            console.log('Form Builder: Invalid field: ', el.attr('name'));
            return null;
        }
        switch (el.get(0).nodeName) {
            case 'INPUT':
                field.values = [ el.val() ];
                break;
            case 'TEXTAREA':
                field.values = [ el.text() ];
                break;
            case 'SELECT':
                field.values = [];
                $('option:selected', el).each(function() {
                    field.values.push($(this).val());
                });
                break;
            default: return null;
        }
        //console.log('Form Builder: Updating Field: ', id, field.values)
        return field;
    },

    postProcess: function() {
        var self = this;

        this.element.find('.error', '.hint').each(function() {
            var empty = $(this).text().length == 0;
            $(this)[empty ? 'hide' : 'show']();
        });

        this.element.find('form').unbind().submit(function() {
            //console.log('Form Builder: Prepare Submit: ', self.form);
            self.prepareSubmit();
            //console.log('Form Builder: After Prepare Submit: ', self.form);
            return self.options.onSubmit(self.form, self, self.element);
        });

        this.options.afterBuild(this.form, this, this.element);
    },

    getHTMLInputs: function() {
        return this.element.find('input[name!=submit], select, textarea');
    },

    getHTMLElement: function(id) {
        return this.element.find('[name="' + id + '"]').parents('.field:first');
    },

    hasHTMLElement: function(id) {
        return this.getHTMLElement(id).length > 0;
    },

    // Builds the entire form
    buildForm: function(form) {
        //console.log('Form Builder: Building: ', form)
        if (!form || !form.id)
            throw 'Invalid form data'

        var html = '';
        html += this.startFormHTML(form);
        if (this.options.pageMenu) {
            html += this.buildPageMenu(form, 0);
            html += '<div class="pages">';
        }
        //html += '<div class="from-content">';
        html += this.buildElements(form, 0);
        //html += '</div>';
        if (this.options.pageMenu)
            html += '</div>';
        html += this.endFormHTML(form);
        return html.replace(/undefined/g, '')
    },

    updateElements: function(o, depth) {
        //console.log('Form Builder: Update Elements:', o);
        if (typeof o.elements != 'undefined') {
            var prev = o;
            var curr;
            depth++;
            for (var i = 0; i < o.elements.length; i++) {
                curr = o.elements[i];
                if (curr.type == 'page')
                    ; // nothing to do...
                else if (curr.type == 'section')
                    this.updateSectionHTML(curr);
                else {

                    // Update the element
                    if (this.hasHTMLElement(curr.id))
                        this.updateFieldHTML(curr);

                    // Insert the element
                    else {
                        var parent = this.getHTMLElement(prev.id);
                        var html = this.fieldToHTML(curr);
                        parent.after(html);
                    }
                }
                if (curr.elements)
                    this.updateElements(curr, depth);
                prev = curr;
            }
        }
    },

    buildElements: function(o, depth) {
        //console.log('Form Builder: Build Elements:', o);
        var html = '';

        // Start containers...
        if (o.type == 'page')
            html += this.startPageHTML(o);
        else if (o.type == 'section')
            html += this.startSectionHTML(o);
        else
            html += this.fieldToHTML(o);

        // Loop next level...
        if (typeof o.elements == 'object') {
            depth++;
            for (var i = 0; i < o.elements.length; i++) {
                var a = o.elements[i];
                html += this.buildElements(a, depth);
            }
        }

        // End containers...
        if (o.type == 'page')
            html += this.endPageHTML(o);
        else if (o.type == 'section')
            html += this.endSectionHTML(o);

        /*
        if (typeof o.elements == 'object') {
            depth++;
            for (var i = 0; i < o.elements.length; i++) {
                var a = o.elements[i];
                if (typeof a == 'object') {
                    if (a.type == 'page')
                        html += this.fieldToHTML(a);

                    // Next level...
                    if (typeof a.elements == 'object')
                        html += this.buildElements(a, depth);
                }
            }
        }
        */

        return html;
    },

    buildPageMenu: function(o, depth) {
        var html = '';
        var root = depth == 0;
        if (root)
           html += '<ul class="menu">';
        if (typeof o.elements != 'undefined') {
            depth++;
            for (var i = 0; i < o.elements.length; i++) {
                var a = o.elements[i];
                if (typeof a == 'object') {
                    if (a.type == 'page') {
                        var label = a.label;
                        if (label) {
                            var id = this.getElementID(a); //form.id + '-' + label.paramaterize();
                            html += '<li><a rel="' + id + '" href="#' + id + '"><span>' + label + '</span></a></li>';
                        }
                    }
                    if (a.elements)
                        html += this.buildPageMenu(a, depth);
                }
            }
        }
        if (root)
           html += '</ul>';
        return html;
    },

    startFormHTML: function(o) {
        var className = this.options.formClass;
        /*
        if (o.live)
            className += ' live';

        var html = '';
        html += '<form id="' + o.id + '" name="' + o.id + '" class="' + className + '">';
        if (o.label)
            html += '<h2 class="title">' + o.label + '</h2>';
        if (o.hint)
            html += '<div class="hint">' + o.hint + '</div>';name="' + o.id + '"
        return html;
        */

        return '\
            <form id="' + o.id + '" class="' + className + '"> \
                <h2 class="title">' + o.label + '</h2> \
                <div class="hint">' + o.hint + '</div>';
    },

    endFormHTML: function(o) {
        /*
        var html = '';
        html += "<input type='submit' name='submit' class='button submit' value='Submit' />";
        html += "<div class='break'></div>";
        html += "</form>";
        return html;
        */

        return '\
                <div class="actions"> \
                    <input type="submit" name="submit" class="button submit" value="Save" /> \
                </div> \
                <div class="break"></div> \
            </form>';
    },

    startPageHTML: function(o) {
        //var id = ''
        //if (o.label)
        //    id = this.form.id + '-' + o.label.paramaterize();
        var id = this.getElementID(o);
        var className = 'page';
        /*
        if (o.live)
            className += ' live';

        html += '<div class="' + className + '" id="' + id + '">';
        if (o.label)
            html += '<h2>' + o.label + '</h2>';
        if (o.hint)
            html += '<div class="hint">' + o.hint + '</div>';
        if (o.error)
            html += '<div class="error">' + o.error + '</div>';
        return html;
        */

        return '\
            <div class="' + className + '" id="' + id + '"> \
                <h2>' + o.label + '</h2> \
                <div class="hint">' + o.hint + '</div> \
                <div class="error">' + o.error + '</div>';
    },

    endPageHTML: function(o) {
        return '</div>';
    },

    startSectionHTML: function(o) {
        var id = this.getElementID(o);
        //if (id == 'undefined' && o.label)
        //    id = this.form.id + '-' + o.label.paramaterize();
        var className = '';
        //if (o.live)
        //    className += ' live';

        return '\
            <fieldset class="' + className + '" id="' + id + '"> \
                <h3>' + o.label + '</h3> \
                <div class="hint">' + o.hint + '</div> \
                <div class="error">' + o.error + '</div>';

        /*
        var html = ''
        html += '<fieldset class="' + className + '" id="' + id + '">';
        if (o.label)
            html += '<h3>' + o.label + '</h3>';
        if (o.hint)
            html += '<div class="hint">' + o.hint + '</div>';
        if (o.error)
            html += '<div class="error">' + o.error + '</div>';
        return html;
        */
    },

    endSectionHTML: function(o) {
        return '</fieldset>';
    },
    
    getElementID: function(o) {
        return this.form.id + '-' + ((o.id && o.id.length ? o.id : o.label).paramaterize()); //.underscore(); //
    },
    
    // Updates page or section HTML from JSON.
    updateSectionHTML: function(o) {
        console.log('Form Builder: Updating Element HTML: ', o)

        // Just update errors
        if (o.error == 'undefined')
            return;

        var id = this.getElementID(o);
        var el = this.element.find('#' + id);
        if (el.length) {
            var err = el.children('.error:first');
            err.text(o.error ? o.error : '');
            //fel.find('.error').text(field.error ? field.error : '');
            //fel.find('.loading').remove(); // for live fields, not built in yet
        }
    },

    buildLabel: function(o) {
        return '<label for="' + o.id + '">' + o.label + '</label>';
    },

    buildTextField: function(o) {
        var html = this.startFieldHTML(o);
        html += '<input type="text" id="' + o.id + '" name="' + o.id + '" value="' + (o.values ? o.values[0] : '') + '" size="20" />';
        html += this.endFieldHTML(o);
        return html;
    },

    buildTextPrivate: function(o) {
        var html = this.startFieldHTML(o);
        html += '<input type="password" id="' + o.id + '" name="' + o.id + '" value="' + (o.values ? o.values[0] : '') + '" size="20" />';
        html += this.endFieldHTML(o);
        return html;
    },

    buildHiddenPrivate: function(o) {
        var html = this.startFieldHTML(o);
        html += '<input type="hidden" id="' + o.id + '" name="' + o.id + '" value="' + (o.values ? o.values[0] : '') + '" />';
        html += this.endFieldHTML(o);
        return html;
    },

    buildTextMultiField: function(o) {
        var html = this.startFieldHTML(o);
        html += '<textarea id="' + o.id + '" name="' + o.id + '" rows="2" cols="20"></textarea>';
        html += this.endFieldHTML(o);
        return html;
    },

    buildListField: function(o, isMulti) {
        var html = this.startFieldHTML(o);
        html += '<select id="' + o.id + '" name="' + o.id + '" ' + (isMulti ? 'multiple' : '') + '>';
        for (var opt in o.options)
            html += '<option value="' + opt + '" ' + (opt == (o.values ? o.values[0] : '') ? 'selected' : '') + '>' + o.options[opt] + '</option>';
        html += '</select>';
        html += this.endFieldHTML(o);
        return html;
    },

    buildListMultiField: function(o) {
        return this.buildListField(o, true);
    },

    buildIntegerField: function(o) {
        var html = this.startFieldHTML(o);
        html += '<input type="number" id="' + o.id + '" name="' + o.id + '" value="' + (o.values ? o.values[0] : '') + '" size="20" />';
        html += this.endFieldHTML(o);
        return html;
    },

    buildDateField: function(o) {
        var html = this.startFieldHTML(o);
        html += '<input type="date" id="' + o.id + '" name="' + o.id + '" value="' + (o.values ? o.values[0] : '') + '" size="20" />';
        html += this.endFieldHTML(o);
        return html;
    },

    buildTimeField: function(o) {
        var html = this.startFieldHTML(o);
        html += '<input type="time" id="' + o.id + '" name="' + o.id + '" value="' + (o.values ? o.values[0] : '') + '" size="20" />';
        html += this.endFieldHTML(o);
        return html;
    },

    buildDatetimeField: function(o) {
        var html = this.startFieldHTML(o);
        html += '<input type="datetime" id="' + o.id + '" name="' + o.id + '" value="' + (o.values ? o.values[0] : '') + '" size="20" />';
        html += this.endFieldHTML(o);
        return html;
    },

    buildBooleanField: function(o) {
        var html = this.startFieldHTML(o);
        html += '<input type="checkbox" id="' + o.id + '" name="' + o.id + '" />';
        html += this.endFieldHTML(o);
        return html;
    },

    startFieldHTML: function(o) {
        var html = '';
        var className = 'field';
        if (o.live)
            className += ' live';
        //if (o.error)
        //    className += ' errors';
        html += '<div class="' + className + '">';
        if (o.label)
            html += this.buildLabel(o);
        html += '<div class="block">';
        return html;
    },

    endFieldHTML: function(o) {
        var html = '';
        if (o.hint)
            html += '<div class="hint">' + o.hint + '</div>';
        //if (o.error)
        html += '<div class="error">' + (o.error ? o.error : '') + '</div>';
        html += '</div>';
        html += '</div>';
        return html;
    },

    // Updates field HTML from JSON.
    updateFieldHTML: function(field) {
        console.log('Form Builder: Updating Field HTML: ', field)

        var el = this.element.find('[name="' + field.id + '"]');
        if (el.length) {
            switch (el.get(0).nodeName) {
                case 'INPUT':
                    el.val(field.values[0]);
                    break;
                case 'TEXTAREA':
                    el.text(field.values[0]);
                    break;
                case 'SELECT':
                    $('option:selected', el).attr('selected', false);
                    for (var ia = 0; ia < field.values.length; ia++) {
                        $('option[value="' + field.values[ia] + '"]', el).attr('selected', true);
                    }
                    break;
                default: return null;
            }

            var fel = el.parents('.field:first');
            fel.find('.error').text(field.error ? field.error : '');
            fel.find('.loading').remove(); // for live fields, not built in yet
        }

        return el;
    },


    fieldToHTML: function(o) {
        var html = '';
        try {
            console.log('Form Builder: Building:', 'build' + o.type.classify() + 'Field');
            html += this['build' + o.type.classify() + 'Field'](o);
        }
        catch(e) {
            console.log('Form Builder: Unrecognised form field:', o.type, e);
        }
        return html;
    }
};


//
// JQuery Plugin
//
(function(jQuery){
    $.sympleForm = $.sympleForm || {}

    $.sympleForm.options = {
        formClass: 'symple-form stacked',
        pageMenu: false,
        afterBuild: function(form, el) {},
        onSubmit: function(form, el) {}
    };

    $.sympleForm.build = function(form, options) {
        return createForm(form, $('<div></div>'), options);
    }

    $.fn.sympleForm = function(form, options) {
        this.each(function() {
            createForm(form, this, options);
        });
        return this;
    };

    $.fn.sympleFormUpdate = function(form) {
        return $(this).data('builder').update(form);
        //return createForm(form, this);
        //var builder = $(this).data('builder');
        //builder.from = form;
        //builder.build();
        //options.afterBuild(form, builder, el);
        //return $(this).data('builder').build(form);
    };

    function createForm(form, el, options) {
        options = $.extend({}, $.sympleForm.options, options);
        var builder = new Symple.Form.Builder(form, el, options); //window[]
        builder.build();
        //el.data('form', form);
        el.data('builder', builder);
        return el;
    }
})(jQuery);