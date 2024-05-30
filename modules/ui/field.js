import { dispatch as d3_dispatch } from 'd3-dispatch';
import { select as d3_select } from 'd3-selection';

import { t, localizer } from '../core/localizer';
import { locationManager } from '../core/LocationManager';
import { svgIcon } from '../svg/icon';
import { uiTooltip } from './tooltip';
import { geoExtent } from '../geo/extent';
import { uiFieldHelp } from './field_help';
import { uiFields } from './fields';
import { uiTagReference } from './tag_reference';
import { utilGetSetValue, utilRebind, utilUniqueDomId } from '../util';


export function uiField(context, presetField, entityIDs, options) {
    options = Object.assign({
        show: true,
        wrap: true,
        remove: true,
        revert: true,
        info: true
    }, options);

    var dispatch = d3_dispatch('change', 'revert');
    var field = Object.assign({}, presetField);   // shallow copy
    field.domId = utilUniqueDomId('form-field-' + field.safeid);
    var _show = options.show;
    var _state = '';
    var _tags = {};
    let sourceInput = d3_select(null);
    let _sourceValue;
    let sourceKey = field.key + ':source';
    
    options.source = field.source !== undefined ? field.source : true;

    var _entityExtent;
    if (entityIDs && entityIDs.length) {
        _entityExtent = entityIDs.reduce(function(extent, entityID) {
            var entity = context.graph().entity(entityID);
            return extent.extend(entity.extent(context.graph()));
        }, geoExtent());
    }

    var _locked = false;
    var _lockedTip = uiTooltip()
        .title(() => t.append('inspector.lock.suggestion', { label: field.title }))
        .placement('bottom');

    // only create the fields that are actually being shown
    if (_show && !field.impl) {
        createField();
    }

    // Creates the field.. This is done lazily,
    // once we know that the field will be shown.
    function createField() {
        field.impl = uiFields[field.type](field, context)
            .on('change', function(t, onInput) {
                dispatch.call('change', field, t, onInput);
            });

        if (entityIDs) {
            field.entityIDs = entityIDs;
            // if this field cares about the entities, pass them along
            if (field.impl.entityIDs) {
                field.impl.entityIDs(entityIDs);
            }
        }
    }


    function allKeys() {
        let keys = field.keys || [field.key];
        if (field.type === 'directionalCombo' && field.key) {
            // directionalCombo fields can have an additional key describing the for
            // cases where both directions share a "common" value.
            keys = keys.concat(field.key);
        }
        return keys;
    }


    function isModified() {
        if (!entityIDs || !entityIDs.length) return false;
        return entityIDs.some(function(entityID) {
            var original = context.graph().base().entities[entityID];
            var latest = context.graph().entity(entityID);
            return allKeys().some(function(key) {
                return original ? latest.tags[key] !== original.tags[key] : latest.tags[key];
            });
        });
    }


    function tagsContainFieldKey() {
        return allKeys().some(function(key) {
            if (field.type === 'multiCombo') {
                for (var tagKey in _tags) {
                    if (tagKey.indexOf(key) === 0) {
                        return true;
                    }
                }
                return false;
            }
            return _tags[key] !== undefined;
        });
    }


    function revert(d3_event, d) {
        d3_event.stopPropagation();
        d3_event.preventDefault();
        if (!entityIDs || _locked) return;

        dispatch.call('revert', d, allKeys());
    }


    function remove(d3_event, d) {
        d3_event.stopPropagation();
        d3_event.preventDefault();
        if (_locked) return;

        var t = {};
        allKeys().forEach(function(key) {
            t[key] = undefined;
        });

        dispatch.call('change', d, t);
    }


    function renderSourceInput(selection) {
        console.log('renderSourceInput');
        let entries = selection.selectAll('div.entry')
            .data((typeof _sourceValue === 'string' || Array.isArray(_sourceValue)) ? [_sourceValue] : []);

        entries.exit()
            .style('top', '0')
            .style('max-height', '240px')
            .transition()
            .duration(200)
            .style('opacity', '0')
            .style('max-height', '0px')
            .remove();

        let entriesEnter = entries.enter()
            .append('div')
            .attr('class', 'entry')
            .each(function() {
                var wrap = d3_select(this);

                let domId = utilUniqueDomId('source-' + field.safeid);
                let label = wrap
                    .append('label')
                    .attr('class', 'field-label')
                    .attr('for', domId);

                let text = label
                    .append('span')
                    .attr('class', 'label-text');

                text
                    .append('span')
                    .attr('class', 'label-textvalue')
                    .call(t.append('inspector.field_source_label'));

                text
                    .append('span')
                    .attr('class', 'label-textannotation');

                label
                    .append('button')
                    .attr('class', 'remove-icon-source') // 'remove-icon-edtf'
                    .attr('title', t('icons.remove'))
                    .on('click', function(d3_event) {
                        d3_event.preventDefault();

                        // remove the UI item manually
                        _sourceValue = undefined;

                        if (sourceKey && sourceKey in _tags) {
                            delete _tags[sourceKey];
                            // remove from entity tags
                            let t = {};
                            t[sourceKey] = undefined;
                            dispatch.call('change', this, t);
                            return;
                        }

                        renderSourceInput(selection);
                    })
                    .call(svgIcon('#iD-operation-delete'));

                wrap
                    .append('input')
                    .attr('type', 'text')
                    .attr('class', 'field-source-value')
                    .on('blur', changeSourceValue)
                    .on('change', changeSourceValue);
            });

        entriesEnter
            .style('margin-top', '0px')
            .style('max-height', '0px')
            .style('opacity', '0')
            .transition()
            .duration(200)
            .style('margin-top', '10px')
            .style('max-height', '240px')
            .style('opacity', '1')
            .on('end', function() {
                d3_select(this)
                    .style('max-height', '')
                    .style('overflow', 'visible');
            });

        entries = entries.merge(entriesEnter);

        entries.order();

        // allow removing the entry UIs even if there isn't a tag to remove
        entries.classed('present', true);

        utilGetSetValue(entries.select('.field-source-value'), function(d) {
                return typeof d === 'string' ? d : '';
            })
            .attr('title', function(d) {
                return Array.isArray(d) ? d.filter(Boolean).join('\n') : null;
            })
            .attr('placeholder', function(d) {
                return Array.isArray(d) ? t('inspector.multiple_values') : t('inspector.field_source_placeholder');
            })
            .classed('mixed', function(d) {
                return Array.isArray(d);
            });
    }

    function changeSourceValue(d3_event, d) {
        console.log('changeSourceValue');
        let value = context.cleanTagValue(utilGetSetValue(d3_select(this))) || undefined;
        console.log('sourceTagValue');
        console.log(value);
        // don't override multiple values with blank string
        if (!value && Array.isArray(d.value)) return;

        let t = {};
        t[sourceKey] = value;
        d.value = value;
        dispatch.call('change', this, t);
    }

    function addSource(d3_event, d) {
        console.log('addSource');
        d3_event.preventDefault();
        
        if (typeof _sourceValue !== 'string' && !Array.isArray(_sourceValue)) {
            _sourceValue = '';

            sourceInput.call(renderSourceInput);
        }
        
    }

    function calcSourceValue(tags) {
        console.log('calcSourceValue');
        if (_sourceValue && !tags[sourceKey]) {
            // Don't unset the variable based on deleted tags, since this makes the UI
            // disappear unexpectedly when clearing values - #8164
            _sourceValue = '';
        } else {
            _sourceValue = tags[sourceKey];
        }
    }

    field.render = function(selection) {
        var container = selection.selectAll('.form-field')
            .data([field]);

        // Enter
        var enter = container.enter()
            .append('div')
            .attr('class', function(d) { return 'form-field form-field-' + d.safeid; })
            .classed('nowrap', !options.wrap);

        if (options.wrap) {
            var labelEnter = enter
                .append('label')
                .attr('class', 'field-label')
                .attr('for', function(d) { return d.domId; });

            var textEnter = labelEnter
                .append('span')
                .attr('class', 'label-text');

            textEnter
                .append('span')
                .attr('class', 'label-textvalue')
                .each(function(d) { d.label()(d3_select(this)); });

            textEnter
                .append('span')
                .attr('class', 'label-textannotation');

            if (options.remove) {
                labelEnter
                    .append('button')
                    .attr('class', 'remove-icon')
                    .attr('title', t('icons.remove'))
                    .call(svgIcon('#iD-operation-delete'));
            }

            if (options.revert) {
                labelEnter
                    .append('button')
                    .attr('class', 'modified-icon')
                    .attr('title', t('icons.undo'))
                    .call(svgIcon((localizer.textDirection() === 'rtl') ? '#iD-icon-redo' : '#iD-icon-undo'));
            }
        }

        if(options.source){
            let sourceButtonTip = uiTooltip()
            .title(() => t.append('inspector.field_source'))
            .placement('left');

            labelEnter
            .append('button')
            .attr('class', 'source-icon')
            .attr('title', 'source-button')
            .call(sourceButtonTip)
            .call(svgIcon('#iD-icon-note'));
        }

        if (_tags && _sourceValue === undefined) {
            calcSourceValue(_tags);
        }

        // Update
        container = container
            .merge(enter);

        container.select('.field-label > .remove-icon')  // propagate bound data
            .on('click', remove);

        container.select('.field-label > .modified-icon')  // propagate bound data
            .on('click', revert);

        container.select('.field-label > .source-icon')  // propagate bound data
           .on('click', addSource);

        container
            .each(function(d) {
                var selection = d3_select(this);

                if (!d.impl) {
                    createField();
                }

                var reference, help;

                // instantiate field help
                if (options.wrap && field.type === 'restrictions') {
                    help = uiFieldHelp(context, 'restrictions');
                }

                // instantiate tag reference
                if (options.wrap && options.info) {
                    var referenceKey = d.key || '';
                    if (d.type === 'multiCombo') {   // lookup key without the trailing ':'
                        referenceKey = referenceKey.replace(/:$/, '');
                    }

                    var referenceOptions = d.reference || {
                        key: referenceKey,
                        value: _tags[referenceKey]
                    };
                    reference = uiTagReference(referenceOptions, context);
                    if (_state === 'hover') {
                        reference.showing(false);
                    }
                }

                selection
                    .call(d.impl);

                // add field help components
                if (help) {
                    selection
                        .call(help.body)
                        .select('.field-label')
                        .call(help.button);
                }

                // add tag reference components
                if (reference) {
                    selection
                        .call(reference.body)
                        .select('.field-label')
                        .call(reference.button);
                }

                d.impl.tags(_tags);
            });


            container
                .classed('locked', _locked)
                .classed('modified', isModified())
                .classed('present', tagsContainFieldKey());


            // show a tip and lock icon if the field is locked
            var annotation = container.selectAll('.field-label .label-textannotation');
            var icon = annotation.selectAll('.icon')
                .data(_locked ? [0]: []);

            icon.exit()
                .remove();

            icon.enter()
                .append('svg')
                .attr('class', 'icon')
                .append('use')
                .attr('xlink:href', '#fas-lock');

            container.call(_locked ? _lockedTip : _lockedTip.destroy);

            if(options.source){
                sourceInput = selection.selectChild().selectAll('.field-source')
                .data([0]);

                sourceInput = sourceInput.enter()
                .append('div')
                .attr('class', 'field-source')
                .merge(sourceInput);

                sourceInput
                .call(renderSourceInput);
            }
    };


    field.state = function(val) {
        if (!arguments.length) return _state;
        _state = val;
        return field;
    };


    field.tags = function(val) {
        if (!arguments.length) return _tags;
        _tags = val;

        if (tagsContainFieldKey() && !_show) {
            // always show a field if it has a value to display
            _show = true;
            if (!field.impl) {
                createField();
            }
        }

        calcSourceValue(_tags);

        return field;
    };


    field.locked = function(val) {
        if (!arguments.length) return _locked;
        _locked = val;
        return field;
    };


    field.show = function() {
        _show = true;
        if (!field.impl) {
            createField();
        }
        if (field.default && field.key && _tags[field.key] !== field.default) {
            var t = {};
            t[field.key] = field.default;
            dispatch.call('change', this, t);
        }
    };

    // A shown field has a visible UI, a non-shown field is in the 'Add field' dropdown
    field.isShown = function() {
        return _show;
    };


    // An allowed field can appear in the UI or in the 'Add field' dropdown.
    // A non-allowed field is hidden from the user altogether
    field.isAllowed = function() {

        if (entityIDs &&
            entityIDs.length > 1 &&
            uiFields[field.type].supportsMultiselection === false) return false;

        if (field.geometry && !entityIDs.every(function(entityID) {
            return field.matchGeometry(context.graph().geometry(entityID));
        })) return false;

        if (entityIDs && _entityExtent && field.locationSetID) {   // is field allowed in this location?
            var validHere = locationManager.locationSetsAt(_entityExtent.center());
            if (!validHere[field.locationSetID]) return false;
        }

        var prerequisiteTag = field.prerequisiteTag;

        if (entityIDs &&
            !tagsContainFieldKey() && // ignore tagging prerequisites if a value is already present
            prerequisiteTag) {

            if (!entityIDs.every(function(entityID) {
                var entity = context.graph().entity(entityID);
                if (prerequisiteTag.key) {
                    var value = entity.tags[prerequisiteTag.key];
                    if (!value) return false;

                    if (prerequisiteTag.valueNot) {
                        return prerequisiteTag.valueNot !== value;
                    }
                    if (prerequisiteTag.value) {
                        return prerequisiteTag.value === value;
                    }
                } else if (prerequisiteTag.keyNot) {
                    if (entity.tags[prerequisiteTag.keyNot]) return false;
                }
                return true;
            })) return false;
        }

        return true;
    };


    field.focus = function() {
        if (field.impl) {
            field.impl.focus();
        }
    };


    return utilRebind(field, dispatch, 'on');
}
