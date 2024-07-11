import { dispatch as d3_dispatch } from 'd3-dispatch';
import { select as d3_select } from 'd3-selection';

import { svgIcon } from '../../svg';
import { uiTooltip } from '../tooltip';
import { uiCombobox } from '../combobox';
import { uiFieldMultiCombo } from './combo';
import { t, localizer } from '../../core/localizer';
import { utilGetSetValue, utilNoAuto, utilRebind, utilUniqueDomId } from '../../util';


export function uiFieldSources(field, context) {
    let dispatch = d3_dispatch('change');
    let items = d3_select(null);
    let enter = d3_select(null);
    let _tags = {};
    let _selection = d3_select(null);
    let _pendingChange;

    const mainKey = 'source';
    const sourceHeader = 'source:';

    const possibleSourceSubkeys = [{key:'name', value:'Name'}, {key:'url', value:'URL'}, {key:'date', value:'Date'}]

    function addSubkey() {
        if(sourceSubkeys.length < possibleSourceSubkeys.length){
            var newKey = possibleSourceSubkeys.filter((k) => sourceSubkeys.map(e => e.key).indexOf(k.key) === -1)[0];
            _tags[sourceHeader + newKey.key] = '';
            scheduleChange();
            _selection.call(sources);
        }
    }

    function getKeyFromTitle(title) {
        return possibleSourceSubkeys.filter((e) => e.value == title)[0].key;
    }

    function scheduleChange() {
        // Delay change in case this change is blurring an edited combo. - #5878

        if (!_pendingChange) return;
        window.setTimeout(function() {
            dispatch.call('change', this, _pendingChange);
            _pendingChange = null;
            _selection.call(sources);
        }, 20);
    }

    function removeTag(d3_event, d) {
        _pendingChange  = _pendingChange || {};
        key = sourceHeader + d.key;
        _pendingChange[key] = undefined;
        delete _tags[key];
        scheduleChange();
        _selection.call(sources);
    }

    function valueChange(d3_event, d) {
        // exit if this is a multiselection and no value was entered
        if (typeof d.key !== 'string' && !this.value) return;

        var key = sourceHeader + d.key;

        _pendingChange = _pendingChange || {};

        _pendingChange[key] = context.cleanTagValue(this.value);
        _tags[key] = context.cleanTagValue(this.value);
        scheduleChange();
    }

    function keyChange(d3_event, d) {
        var kOld = sourceHeader + d.key;
        var kNew = sourceHeader + getKeyFromTitle(context.cleanTagKey(this.value.trim()));

        _pendingChange = _pendingChange || {};

        if (kOld && _tags[kOld]) {
            if (kOld === kNew) return;
            // a tag key was renamed
            _pendingChange[kNew] = _tags[kOld];
            _tags[kNew] = _tags[kOld];
            _pendingChange[kOld] = undefined;
            _tags[kOld] = undefined;
        } else {
            // a new tag was added
            let row = this.parentNode;
            let inputVal = d3_select(row).selectAll('input.value');
            let vNew = context.cleanTagValue(utilGetSetValue(inputVal));
            _pendingChange[kNew] = vNew;
            utilGetSetValue(inputVal, vNew);
        }
        var newDatum = possibleSourceSubkeys.filter((e) => e.key == kNew.slice(7))[0];
        d.key = newDatum.key;
        d.value = newDatum.value;
        scheduleChange();
    }

    function mainChange(d3_event, d) {
        _pendingChange = _pendingChange || {};
        _pendingChange[mainKey] = context.cleanTagValue(this.value);
        scheduleChange();
    }

    function sources(selection) {
        _selection = selection;

        sourceSubkeys = _tags ? Object.keys(_tags)
        .filter((key, value) => (key.indexOf(sourceHeader) === 0))
        .map((tag) => {
            var data =  possibleSourceSubkeys.filter((e) => e.key == tag.slice(7))[0];
            return {
                value: data.value,
                key: data.key
            };
        })
        : 
        [];

        var wrap = selection.selectAll('.form-field-input-wrap')
            .data([0]);

        wrap = wrap.enter()
            .append('div')
            .attr('class', 'form-field-input-wrap form-field-input-' + field.type)
            .merge(wrap);

        mainInput = wrap.selectAll('input')
        .data([0])
        .enter()
        .append('input')
        .attr('type', 'text')
        .attr('placeholder', 'Unknown')
        .call(utilNoAuto)
        .call(utilGetSetValue, function(d) {return _tags[mainKey]})
        .on('change', mainChange)
        .on('blur', mainChange);

        var list = wrap.selectAll('ul')
        .data([0]);

        list = list.enter()
            .append('ul')
            .attr('class', 'rows')
            .merge(list);

        list = list.merge(list);

        list.selectAll('li.labeled-input').remove();
        
        items = list.selectAll('li.labeled-input')
            .data(sourceSubkeys);

        items.exit()
        .remove();
        
        enter = items.enter()
            .append('li')
            .attr('class', 'labeled-input labeled-input-source');

        enter
            .append('input')
            .attr('type', 'text')
            .call(utilNoAuto)
            .each(function(d) {
                var key = d3_select(this);
                let combo = uiCombobox(context, 'tag-key');
                combo.fetcher(function(value, callback) {
                    var keyString = utilGetSetValue(key);
                    var data = possibleSourceSubkeys.filter((key) => 
                        sourceSubkeys
                        .map((e) => e.key)
                        .indexOf(key.key) === -1);
                    callback(data);
                });
                combo.minItems(1);
                key.call(combo)
                .on('change', keyChange)
                .on('blur', keyChange)
                .call(utilGetSetValue, function(d) { return d.value; });
            });

        enter
            .append('input')
            .attr('type', 'text')
            .attr('class', 'value')
            .attr('placeholder', function(d) {
                return t('inspector.source.' + d.key)
            })
            .call(utilNoAuto)
            .call(utilGetSetValue, function(d) { return _tags[sourceHeader + d.key]; })
            .on('change', valueChange)
            .on('blur', valueChange);

        enter
            .append('button')
            .attr('class', 'form-field-button remove')
            .attr('title', t('icons.remove'))
            .call(svgIcon('#iD-operation-delete'))
            .on('click', removeTag);

        // Container for the Add button
        if(sourceSubkeys.length < possibleSourceSubkeys.length){
        
            var addRowEnter = wrap.selectAll('.add-row')
                .data([0])
                .enter()
                .append('div')
                .attr('class', 'add-row');
    
            addRowEnter
                .append('button')
                .attr('class', 'add-tag add-subkey')
                .attr('aria-label', t('inspector.add_to_tag'))
                .call(svgIcon('#iD-icon-plus', 'light'))
                .call(uiTooltip()
                    .title(() => t.append('inspector.add_to_tag'))
                    .placement(localizer.textDirection() === 'ltr' ? 'right' : 'left'))
                .on('click', addSubkey);
            
        }
        else {
            _selection.selectAll('.add-row').remove();
        }
        

    }

    sources.tags = function(tags){
        if (!arguments.length) return _tags;
        _tags = tags;

        _selection.call(sources);
    }

    return utilRebind(sources, dispatch, 'on');
}
