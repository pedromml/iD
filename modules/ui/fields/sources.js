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
    let yearInput = d3_select(null);
    let eraInput = d3_select(null);
    let monthInput = d3_select(null);
    let dayInput = d3_select(null);
    let edtfInput = d3_select(null);
    let _entityIDs = [];
    let _tags;
    let _selection = d3_select(null);
    let _edtfValue;


    let possibleSourceSubkeys = [{value:'Name', title:'Name'}, {value:'URL', title:'URL'}, {value:'Date', title:'Date'}]
    let sourceSubkeysNotInUse = ['name', 'url', 'date']
    let sourceSubkeysInUse = []

    /**
     * Returns the localized name of the era in the given format.
     *
     * @param year A representative year within the era.
     */

    function addSubkey() {
        console.log('in add');
        console.log(sourceSubkeys.length);
        if(sourceSubkeys.length < possibleSourceSubkeys.length){
            var newKey = possibleSourceSubkeys.filter((key) => sourceSubkeys.map(e => e.value).indexOf(key.value) === -1)[0];
            _tags['source:'+ newKey.value] = '';
            _selection.call(sources);
        }

    }

    function sources(selection) {
        console.log(_tags);
        console.log(typeof(_tags));
        _selection = selection;

        sourceSubkeys = _tags ? Object.keys(_tags)
        .filter((key, value) => key.indexOf('source:') === 0)
        .map((tag) => {
            return {value: tag.slice(7), title: tag.slice(7)}
        })
        : 
        [];

        console.log(sourceSubkeys);

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
        .call(utilNoAuto);

        var list = wrap.selectAll('ul')
        .data([0]);

        list = list.enter()
            .append('ul')
            .attr('class', 'rows')
            .merge(list);

        list = list.merge(list);
        
        var items = list.selectAll('li.labeled-input')
            .data(sourceSubkeys);

        // Enter
        
        var enter = items.enter()
            .append('li')
            .attr('class', 'labeled-input labeled-input-source');

        enter
            .append('input')
            .attr('type', 'text')
            .call(utilNoAuto)
            .each(function(d) {
                var key = d3_select(this);
                let combo = uiCombobox(context, 'tag-key');
                combo.data(possibleSourceSubkeys.filter((key) => sourceSubkeys.indexOf(key) === -1));
                combo
                key.call(combo);
            })
            .attr('title', function(d) { return d.title; })
            .call(utilGetSetValue, function(d) { return d.value; });

        enter
            .append('input')
            .attr('type', 'text')
            .call(utilNoAuto);

        enter
            .append('button')
            .attr('class', 'form-field-button remove')
            .attr('title', t('icons.remove'))
            .call(svgIcon('#iD-operation-delete'));

        // Enter
        // var itemsEnter = items.enter()
        //     .append('li')
        //     .attr('class', 'tag-row');

        // var innerWrap = itemsEnter.append('div')
        //     .attr('class', 'inner-wrap');

        
            
        // innerWrap
        //     .append('div')
        //     .attr('class', 'key-wrap')
        //     .append('input')
        //     .property('type', 'text')
        //     .attr('class', 'key')
        //     .call(utilNoAuto)
        //     .call(combo);

        // innerWrap
        //     .append('div')
        //     .attr('class', 'value-wrap')
        //     .append('input')
        //     .property('type', 'text')
        //     .attr('class', 'value')
        //     .call(utilNoAuto);

        // innerWrap
        //     .append('button')
        //     .attr('class', 'form-field-button remove')
        //     .attr('title', t('icons.remove'))
        //     .call(svgIcon('#iD-operation-delete'));

        // items
        //     .each(function(d) {
        //         var row = d3_select(this);
        //         var key = row.select('input.key');      // propagate bound data
        //         var value = row.select('input.value');  // propagate bound data

        //         if (_entityIDs && taginfo && _state !== 'hover') {
        //             bindTypeahead(key, value);
        //         }

        //         var referenceOptions = { key: d.key };
        //         if (typeof d.value === 'string') {
        //             referenceOptions.value = d.value;
        //         }
        //         var reference = uiTagReference(referenceOptions, context);

        //         if (_state === 'hover') {
        //             reference.showing(false);
        //         }

        //         row.select('.inner-wrap')      // propagate bound data
        //             .call(reference.button);

        //         row.call(reference.body);

        //         row.select('button.remove');   // propagate bound data
        //     });

        // Container for the Add button
        console.log("in button");
        console.log(sourceSubkeys.length);
        console.log(possibleSourceSubkeys.length);
        console.log(sourceSubkeys.length < possibleSourceSubkeys.length);
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
    
            addRowEnter
                .append('div')
                .attr('class', 'space-value');
                  // preserve space
    
            addRowEnter
                .append('div')
                .attr('class', 'space-value');  // preserve space
            
        }
        else {
            _selection.selectAll('.add-row').remove();

        }
        

    }

    sources.tags = function(tags){
        _tags = tags;
    }

    return utilRebind(sources, dispatch, 'on');
}
