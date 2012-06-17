
(function($){

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
        console.log('$.fn.sympleForm')
        this.each(function() {
            createForm(form, this, options);
        });
        return this;
    };

    $.fn.sympleForm_update = function(form) {
        return $(this).data('builder').update(form);
    };

    function createForm(form, el, options) {
        options = $.extend({}, $.sympleForm.options, options);
        var builder = new Symple.Form.Builder(form, el, options); //window[]
        builder.build();
        options.afterBuild(form, builder, el);
        //el.data('form', form);
        el.data('builder', builder);
        $('form', el).submit(function() {
            builder.prepareSubmit();
            return options.onSubmit(form, builder, el);
        })
        return el;
    }


    // -----------------------------------------------------------------------------
    //
    // Form
    //
    // -----------------------------------------------------------------------------
    Symple.Form = function(json) {
        if (typeof(json) == 'object')
            this.fromJSON(json);
        this.type = "form";
    }

    Symple.Form.prototype = {

        /*
        */
        getField: function(id) {
            return Sourcey.findNestedWithProperty(this, 'id', id);
        },

        hasElementType: function(type) {
            return Sourcey.findNestedWithProperty(this, 'type', type) != null;
        },

        /*
        // Updates
        update: function(json) {
            if (json.id != this.id)
                throw 'Invalid form data'

            var self = this;
            this.fromJSON(json);
            this.formInputs().each(function() {
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
            for (var key in json)
                this[key] = json[key];
        }
    }




    //
    // Form Builder
    //
    Symple.Form.Builder = function(form, element, options) {
        this.form = form;
        this.element = $(element);
        this.options = options || {};
    }

    Symple.Form.Builder.prototype = {

        // Builds the entire form
        build: function() {
            this.element.html(this.buildForm(this.form));
            this.postProcess();
        },

        // Updates fields values and errors.
        // formData may be a partial subset of the complete form.
        update: function(formData) {
            //if (form)
            //    this.form.fromJSON(form);
            this.updateElements(formData, 0);
            this.postProcess();
        },

        formInputs: function() {
            return this.element.find('input, select, textarea');
        },

        // Prepares the form to be sent. This includes updating
        // internal form values, clearing errors, notes, and
        // setting the action to "submit". Uses JQuery
        prepareSubmit: function() {
            var self = this;
            this.form.action = 'submit';
            Sourcey.deleteNestedKeys(this.form, 'error');
            this.formInputs().each(function() {
                self.updateFieldFromHTML(this);
            });
        },

        updateFieldFromHTML: function(el) {
            el = $(el);
            var id = el.attr('id');
            var field = this.form.getField(id);
            if (!id || !field || el.attr('name') == 'submit') return null;
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
                default:return null;
            }
            console.log('Updating Field: ', id, field.values)
            return field;
        },

        updateHTMLFromField: function(field) {
            //console.log('Updating Form HTML: ', field)

            var el = this.element.find('[name="' + field.id + '"]', this.element);
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
                fel.find('.loading').remove(); // for live fields, not build in yet
            }

            return el;

        },

        postProcess: function() {
            this.element.find('.error', '.hint').each(function() {
                var empty = $(this).text().length == 0;
                //console.log('Form Builder: postProcess: ', $(this).text(), empty)
                $(this)[empty ? 'hide' : 'show']();
            });
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
            html += this.buildElements(form, 0);
            if (this.options.pageMenu)
                html += '</div>';    
            html += this.endFormHTML(form);
            return html.replace(/undefined/g, '')
        },

        updateElements: function(o, depth) {
            //console.log('updateElements:', o);
            var html = '';
            if (typeof o.elements != 'undefined') {
                depth++;
                for (var i = 0; i < o.elements.length; i++) {
                    var a = o.elements[i];
                    if (a.type != 'page' && a.type != 'section')
                        this.updateHTMLFromField(a);
                    if (a.elements)
                        html += this.updateElements(a, depth);
                }
            }
            return html;
        },

        buildElements: function(o, depth) {
            //console.log('buildElements:', o);
            var html = '';
            if (typeof o.elements != 'undefined') {
                depth++;
                for (var i = 0; i < o.elements.length; i++) {
                    var a = o.elements[i];
                    if (typeof a == 'object') {
                        if (a.type == 'page')
                            html += this.startPageHTML(a);
                        else if (a.type == 'section')
                            html += this.startSectionHTML(a);
                        if (a.type != 'page' && a.type != 'section')
                            html += this.fieldToHTML(a);
                        if (a.elements)
                            html += this.buildElements(a, depth);
                        if (a.type == 'page' && a.label)
                            html += this.endPageHTML(a);
                        else if (a.type == 'section')
                            html += this.endSectionHTML(a);
                    }
                }
            }
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
                                var id = this.form.id + '-' + label.paramaterize();
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
            if (o.live)
                className += ' live';

            /*
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
            var id = ''
            if (o.label)
                id = this.form.id + '-' + o.label.paramaterize();
            var className = 'page';
            if (o.live)
                className += ' live';
            /*
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
            var id = ''
            if (o.label)
                id = this.form.id + '-' + o.label.paramaterize();
            var className = '';
            if (o.live)
                className += ' live';

            /*
            return '\
                <fieldset class="' + className + '" id="' + id + '"> \
                    <h3>' + o.label + '</h3> \
                    <div class="hint">' + o.hint + '</div> \
                    <div class="error">' + o.error + '</div>';

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


        fieldToHTML: function(o) {
            var html = '';
            try {
                console.log('Building:', 'build' + o.type.classify() + 'Field');
                html += this['build' + o.type.classify() + 'Field'](o);
            }
            catch(e) {
                console.log('Unrecognised form field:', o.type, e);
            }
            return html;
        }
    }
})(jQuery);








                    //console.log('AAAAAAAAAAAAAAAAAAAAA', field.error)
                    //console.log('AAAAAAAAAAAAAAAAAAAAA fel', fel)
                    //fel.addClass('errors');
                    //var err = el.parent('.field').find('.error');
                    //err = err || el.after('<div class="error">' + field.error + '</div>');
                    //'<div class="error">' + o.error + '</div>';
                    //var id = el.attr('id');

            /*
            try {

            }
            catch(e) {
                console.log(e)
            }
            var element = $(this);
            if (element.find('.scrollbar').length == 0) {
                var content = element.children();
                element.append(options.template);
                element.find('.viewcontent').append(content);
            }
            element.addClass(options.axis == 'y' ?
                'vertical-scroller' : 'hotizontal-scroller');
            */
    /*
    $.scroller.options = {
        axis: 'y',          // vertical or horizontal scrollbar? ( x || y ).
        wheel: 80,          // how many pixels must the mouswheel scroll at a time.
        scroll: true,       // enable or disable the mousewheel;
        size: 'auto',       // set the size of the scrollbar to auto or a fixed number.
        thumbSize: 'auto',  // set the size of the thumb to auto or a fixed number.
        autohide: false,    // auto hides the scrollbar on mouse out.
        template: '\
      <div class="scrollbar"><div class="track"><div class="thumb"><div class="end"></div></div></div></div> \
      <div class="viewport"> \
        <div class="viewcontent"> \
        </div> \
      </div>'
    };
    */








