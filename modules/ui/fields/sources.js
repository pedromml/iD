import { dispatch as d3_dispatch } from 'd3-dispatch';
import { select as d3_select } from 'd3-selection';

import { t } from '../../core/localizer';
import { utilGetSetValue, utilNoAuto, utilRebind } from '../../util';

export function uiFieldSources(field, context) {
    let dispatch = d3_dispatch('change');
    let items = d3_select(null);
    let _tags = {};
    let _selection = d3_select(null);
    let _pendingChange;

    const mainKey = 'source';
    const sourceHeader = mainKey + ':';

    // Pre-selected subkey values to show
    const possibleSourceSubkeys = [{key:'name', value:'Name'}, {key:'url', value:'URL'}, {key:'date', value:'Date'}];

    function scheduleChange() {
        if (!_pendingChange) return;
        dispatch.call('change', this, _pendingChange);
        _pendingChange = null;
        _selection.call(sources);
    }

    function valueChange(d3_event, d) {
        // exit if this is a multiselection and no value was entered
        if (typeof d.key !== 'string' && !this.value) return;

        var key = sourceHeader + d.key;

        _pendingChange = _pendingChange || {};

        var value = context.cleanTagValue(this.value);

        _pendingChange[key] = value === '' ? undefined : value;
        _tags[key] = value === '' ? undefined : value;
        scheduleChange();
    }

    function mainChange() {
        _pendingChange = _pendingChange || {};
        var value = context.cleanTagValue(this.value);
        _pendingChange[mainKey] = value === '' ? undefined : value;
        _tags[mainKey] = value === '' ? undefined : value;
        scheduleChange();
    }

    function sources(selection) {
        _selection = selection;

        var wrap = selection.selectAll('.form-field-input-wrap')
            .data([0]);

        selection.exit()
            .style('top', '0')
            .style('max-height', '240px')
            .transition()
            .duration(200)
            .style('opacity', '0')
            .style('max-height', '0px')
            .remove();

        wrap = wrap.enter()
            .append('div')
            .attr('class', 'form-field-input-wrap form-field-input-' + field.type)
            .merge(wrap);

        // source key
        wrap.selectAll('input')
        .data([0])
        .enter()
        .append('input')
        .attr('class', 'main-value')
        .attr('type', 'text')
        .attr('placeholder', t('inspector.source.main_input'))
        .call(utilNoAuto)
        .on('change', mainChange)
        .on('blur', mainChange);

        var list = wrap.selectAll('ul')
        .data([0]);

        list = list.enter()
            .append('ul')
            .attr('class', 'rows')
            .merge(list);

        list = list.merge(list);

        // source:*= keys
        items = list.selectAll('li.labeled-input-source')
            .data(possibleSourceSubkeys);

        items = items.enter()
            .append('li')
            .attr('class', 'labeled-input-source');

        items
            .append('input')
            .attr('type', 'text')
            .attr('class', 'value')
            .call(utilNoAuto)
            .call(utilGetSetValue, function(d) {
                return _tags[sourceHeader + d.key];
            })
            .on('change', valueChange)
            .on('blur', valueChange);

        items.exit()
            .remove();

        utilGetSetValue(_selection.selectAll('.value'), function(d) {
                return _tags[sourceHeader + d.key];
            })
            .attr('placeholder', function(d) {
                return t('inspector.source.' + d.key);
        });

        utilGetSetValue(_selection.selectAll('.main-value'), function() {
            return _tags[mainKey];
        });
    }

    sources.tags = function(tags){
        if (!arguments.length) return _tags;
        _tags = tags;

        _selection.call(sources);
    };

    return utilRebind(sources, dispatch, 'on');
}
