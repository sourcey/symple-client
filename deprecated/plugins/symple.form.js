// -----------------------------------------------------------------------------
// Symple Form Message
//
Symple.Form = function(json) {
    if (typeof(json) == 'object')
        this.fromJSON(json);
    this.type = "form";
}

Symple.Form.prototype = {
    getField: function(id) {
        var r = Symple.filterObject(this, 'id', id);
        return r.length ? r[0] : null;
    },

    hasElementType: function(type) {
        var r = Symple.filterObject(this, 'type', type);
        return !!r.length;
    },

    hasMultiplePages: function() {
        return Symple.countNested(this, 'type', 'page') > 1
    },

    fromJSON: function(json) {
        $.extend(this, json)
        //json = Symple.merge(this, json);
        //for (var key in json)
        //    this[key] = json[key];
    }
};


// -----------------------------------------------------------------------------
// Symple Form Builder
//
Symple.FormBuilder = function(form, element, options) {
    this.form = form;
    this.element = $(element);
    this.options = options || {};
}

Symple.FormBuilder.prototype = {

    // Builds the form
    build: function() {
        this.element.html(this.buildForm(this.form));
        this.afterBuild();
        return this.element;
    },

    // Updates fields values and errors on server response.
    // formData may be the complete form or a partial subset
    // as long as the original structure is maintained.
    // If the partial flag is set then the form will not be rebuilt.
    // Note that only Fields can be updated and inserted using
    // this method, not Page or Section elements.
    update: function(formData) {
        if (!formData || !formData.elements)
            throw 'Invalid form data'
        
        Symple.log('Form Builder: Update: data:', formData);
        Symple.log('Form Builder: Update: BEFORE:', this.form);
        
        if (formData.partial !== true) {             
            if (this.form.elements) {
                    
                // Delete redundant or removed form fields.
                var self = this;
                Symple.traverse(this.form.elements, function(k, v) {
                    if (typeof k === 'string' && k === 'id') {
                        if (!Symple.countNested(formData.elements, 'id', v)) {
                            self.deleteField(v);
                        }
                    }                       
                })
            
                // Local elements will be rebuilt
                delete this.form.elements;
            }
        
            // Update internal form data with formData
            this.form.fromJSON(formData);
        }
        else {    
            // Update from with partial elements
            this.mergeFormElements(this.form, formData);
        }
        
        Symple.log('Form Builder: Update: AFTER:', this.form);
        this.updateElements(formData, 0);
        this.afterBuild();
    },

    // Prepares the form to be sent. This includes updating
    // internal form values, clearing errors, notes, and
    // setting the action to "submit".
    prepareSubmit: function() {
        var self = this;
        this.form.action = 'submit';
        Symple.deleteNested(this.form, 'error');
        this.getHTMLInputs().each(function() {
            self.updateFieldFromHTML(this);
        });
    },

    deleteField: function(id) {
        Symple.log('Form Builder: Deleting field:', id);
        var el = this.getHTMLElement(id);    
        if (!el.length) {
            Symple.log('Form Builder: Invalid field:', id);
            return null;
        }    
        el.remove();
    },
    
    // Updates field JSON from HTML.
    updateFieldFromHTML: function(el) {
        el = $(el);
        var id = el.attr('id');
        var field = this.form.getField(id);
        if (!id || !field) { // || el.attr('name') == 'submit'
            Symple.log('Form Builder: Invalid field:', id, this.form);
            return null;
        }
        switch (el.get(0).nodeName) {
            case 'INPUT':            
                //var val = el.attr('type') == 'checkbox'
                field.values = [ field.type == 'boolean' ? el.prop('checked') : el.val() ];
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
        //Symple.log('Form Builder: Updating Field:', id, field.values)
        return field;
    },

    afterBuild: function() {
        var self = this;

        this.element.find('.error', '.hint').each(function() {
            var empty = $(this).text().length == 0;
            $(this)[empty ? 'hide' : 'show']();
        });

        this.element.find('form').unbind().submit(function() {
            //Symple.log('Form Builder: Prepare Submit:', self.form);
            self.prepareSubmit();
            //Symple.log('Form Builder: After Prepare Submit:', self.form);
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
        //Symple.log('Form Builder: Building:', form)
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
        return html; //.replace(/undefined/g, '')
    },

    updateElements: function(o, depth) {
        //Symple.log('Form Builder: Update Elements:', o);
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
        //Symple.log('Form Builder: Build Elements:', o);
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
        if (this.options.pageMenu)
            className += ' symple-paged-form';

        var html = '<form id="' + o.id + '" name="' + o.id + '" class="symple-form ' + className + '">';
        if (o.label)
            html += '<h2 class="symple-form-title">' + o.label + '</h2>';
        html += '<div class="symple-form-content">';
        if (o.hint)
            html += '<div class="hint">' + o.hint + '</div>';
        return html;
    },

    endFormHTML: function(o) {
        return '\
                </div> \
                <div class="break"></div> \
                <div class="actions"> \
                    <input type="submit" name="submit" class="button submit" value="Save" /> \
                </div> \
                <div class="break"></div> \
            </form>';
    },

    startPageHTML: function(o) {
        var id = this.getElementID(o);
        var className = 'page';
        /*
        if (o.live)
            className += ' live';
        */

        var html = '<div class="' + className + '" id="' + id + '">';
        if (o.label)
            html += '<h2>' + o.label + '</h2>';
        if (o.hint)
            html += '<div class="hint">' + o.hint + '</div>';
        html += '<div class="error" ' + (o.error ? '' : 'style="display:none"') + '>' + (o.error ? o.error : '') + '</div>';
        //if (o.error)
        //    html += '<div class="error">' + o.error + '</div>';
        return html;
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

        var html = ''
        html += '<fieldset class="' + className + '" id="' + id + '">';
        if (o.label)
            html += '<h3>' + o.label + '</h3>';
        if (o.hint)
            html += '<div class="hint">' + o.hint + '</div>';
        html += '<div class="error" ' + (o.error ? '' : 'style="display:none"') + '>' + (o.error ? o.error : '') + '</div>';
        //if (o.error)
        //    html += '<div class="error">' + o.error + '</div>';
        return html;
    },

    endSectionHTML: function(o) {
        return '</fieldset>';
    },
    
    getElementID: function(o) {
        return this.form.id + '-' + ((o.id && o.id.length ? o.id : o.label).paramaterize()); //.underscore(); //
    },
    
    // Updates page or section HTML from JSON.
    updateSectionHTML: function(o) {
        Symple.log('Form Builder: Updating Element HTML:', o)

        // Just update errors
        if (o.error == 'undefined')
            return;

        var id = this.getElementID(o);
        var el = this.element.find('#' + id);        
        if (el.length) {
            var err = el.children('.error:first');
            if (o.error)
                err.text(o.error).show();
            else
                err.hide();
                
            //err.text(o.error ? o.error : '');                
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

    buildNumberField: function(o) {
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
        var checked = o.values && (o.values[0] === '1' || o.values[0] === 'on' || o.values[0] === 'true')
        html += '<input type="checkbox" id="' + o.id + '" name="' + o.id + '" ' + (checked ? 'checked' : '') + ' />';
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
        html += '<div class="error" ' + (o.error ? '' : 'style="display:none"') + '>' + (o.error ? o.error : '') + '</div>';
        html += '</div>';
        html += '</div>';
        return html;
    },

    // Updates field HTML from JSON.
    updateFieldHTML: function(field) {
        Symple.log('Form Builder: Updating Field HTML:', field)

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
            if (field.error) {
                fel.find('.error').text(field.error).show();
            } else
                fel.find('.error').hide();
            /*
              Symple.log('Form Builder: Updating Field HTML: Error Field:', fel.html())
            // afterBuild will show/hide errors
            var fel = el.parents('.field:first');
            fel.find('.error').text(field.error ? field.error : '');
                */
            fel.find('.loading').remove(); // for live fields, not built in yet
        }

        return el;
    },

    fieldToHTML: function(o) {
        var html = '';
        try {
            Symple.log('Form Builder: Building:', 'build' + o.type.classify() + 'Field');
            html += this['build' + o.type.classify() + 'Field'](o);
        }
        catch(e) {
            Symple.log('Form Builder: Unrecognised form field:', o.type, e);
        }
        return html;
    },
    
    // Update internal form data from a partial.
    mergeFormElements: function(destination, source) {
        if (destination.elements && source.elements) {
            for (var si = 0; si < source.elements.length; si++) {
                // Recurse if there are sub elements
                if (source.elements[si].elements) {
                    for (var di = 0; di < destination.elements.length; di++) {
                        if (destination.elements[di].id == source.elements[si].id) {
                            arguments.callee(destination.elements[di], source.elements[si]);
                        }
                    }
                }
                // Update the current field
                else {
                    for (var di = 0; di < destination.elements.length; di++) {
                        if (destination.elements[di].id == source.elements[si].id) {
                            Symple.log('Form Builder: mergeFormElements:', destination.elements[di], source.elements[si]);
                            destination.elements[di] = source.elements[si];
                        }
                    }
                }
            }
        }
    }  
};


// -----------------------------------------------------------------------------
// JQuery Plugin
//
(function(jQuery){
    $.sympleForm = $.sympleForm || {}

    $.sympleForm.options = {
        formClass: 'stacked',
        pageMenu: false,
        afterBuild: function(form, el) {},
        onSubmit: function(form, el) {}
    };

    $.sympleForm.build = function(form, options) {
        return createForm(form, $('<div class="symple-form-wrapper"></div>'), options);
    }

    $.fn.sympleForm = function(form, options) {
        this.each(function() {
            createForm(form, this, options);
        });
        return this;
    };

    $.fn.sympleFormUpdate = function(form) {
        return $(this).data('builder').update(form);
    };

    function createForm(form, el, options) {
        options = $.extend({}, $.sympleForm.options, options);
        var builder = new Symple.FormBuilder(form, el, options);
        builder.build();
        el.data('builder', builder);
        return el;
    }
})(jQuery);