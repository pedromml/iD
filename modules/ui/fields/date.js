import { dispatch as d3_dispatch } from 'd3-dispatch';
import { select as d3_select } from 'd3-selection';
import * as countryCoder from '@ideditor/country-coder';

import { uiCombobox } from '../combobox';
import { t, localizer } from '../../core/localizer';
import { utilGetSetValue, utilNoAuto, utilRebind, utilTotalExtent } from '../../util';


export function uiFieldDate(field, context) {
    let dispatch = d3_dispatch('change');
    let yearInput = d3_select(null);
    let eraInput = d3_select(null);
    let monthInput = d3_select(null);
    let dayInput = d3_select(null);
    let _entityIDs = [];
    let _tags;

    let dateTimeFormat = new Intl.DateTimeFormat(localizer.languageCode(), {
        year: 'numeric',
        era: 'short',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC',
    });
    let formatParts = dateTimeFormat.formatToParts(new Date()).map(p => p.type);

    /**
     * Returns the localized name of the era in the given format.
     *
     * @param year A representative year within the era.
     */
    function getEraName(year, format) {
        let longFormat = new Intl.DateTimeFormat(localizer.languageCode(), {
            year: 'numeric',
            era: format,
            timeZone: 'UTC',
        });
        let eraDate = new Date(Date.UTC(0, 0, 1));
        eraDate.setUTCFullYear(year);
        let parts = longFormat.formatToParts(eraDate);
        let eraPart = parts.find(p => p.type === 'era');
        return eraPart && eraPart.value;
    }

    let bceName = getEraName(0, 'short');
    let ceName = getEraName(1, 'short');
    let eraNames = [
        {
            id: 'bce',
            value: bceName,
            title: bceName,
            display: selection => selection.append('span')
                .attr('class', 'localized-text')
                .text(bceName ? bceName : 'BCE'),
            terms: [getEraName(0, 'long'), getEraName(0, 'narrow')],
        },
        {
            id: 'ce',
            value: ceName,
            title: ceName,
            display: selection => selection.append('span')
                .attr('class', 'localized-text')
                .text(ceName ? ceName : 'CE'),
            terms: [getEraName(1, 'long'), getEraName(1, 'narrow')],
        },
    ];
    let eraCombo = uiCombobox(context, 'date-era')
        .data(eraNames);

    /// Returns the localized name of a month in the given format.
    function getMonthName(month, format) {
        let longFormat = new Intl.DateTimeFormat(localizer.languageCode(), {
            month: format,
            timeZone: 'UTC',
        });
        let parts = longFormat.formatToParts(new Date(Date.UTC(0, month, 1)));
        let monthPart = parts.find(p => p.type === 'month');
        return monthPart && monthPart.value;
    }

    let monthNames = Array.from({length: 12}, (_, i) => getMonthName(i, 'long'))
        .filter(m => m);
    let alternativeMonthNames = Array.from({length: 12}, (_, i) => {
        return ['numeric', '2-digit', 'long', 'short', 'narrow']
            .map(format => getMonthName(i, format))
            .filter(m => m);
    });

    let monthCombo = uiCombobox(context, 'date-month')
        .data(monthNames.map((monthName, i) => {
            return {
                id: i + 1,
                value: monthName,
                title: monthName,
                display: selection => selection.append('span')
                    .attr('class', 'localized-text')
                    .text(monthName),
                terms: alternativeMonthNames[i],
            };
        }));

    function date(selection) {

        var wrap = selection.selectAll('.form-field-input-wrap')
            .data([0]);

        wrap = wrap.enter()
            .append('div')
            .attr('class', 'form-field-input-wrap form-field-input-' + field.type)
            .merge(wrap);

        yearInput = wrap.selectAll('input.date-year')
            .data([0]);
        eraInput = wrap.selectAll('input.date-era')
            .data([0]);
        monthInput = wrap.selectAll('input.date-month')
            .data([0]);
        dayInput = wrap.selectAll('input.date-day')
            .data([0]);

        formatParts.forEach(part => {
            switch (part) {
                case 'year':
                    yearInput = yearInput.enter()
                        .append('input')
                        .attr('type', 'number')
                        .attr('class', 'date-main date-year')
                        .attr('id', field.domId)
                        .call(utilNoAuto)
                        .merge(yearInput);
                    break;
                case 'era':
                    eraInput = eraInput.enter()
                        .append('input')
                        .attr('type', 'text')
                        .attr('class', 'date-main date-era')
                        .call(eraCombo)
                        .merge(eraInput);
                    break;
                case 'month':
                    monthInput = monthInput.enter()
                        .append('input')
                        .attr('type', 'text')
                        .attr('class', 'date-main date-month')
                        .call(monthCombo)
                        .merge(monthInput);
                    break;
                case 'day':
                    dayInput = dayInput.enter()
                        .append('input')
                        .attr('type', 'number')
                        .attr('class', 'date-main date-day')
                        .call(utilNoAuto)
                        .merge(dayInput);
                    break;
            }
        });

        yearInput
            .on('change', change)
            .on('blur', change);
        eraInput
            .on('change', change)
            .on('blur', change);
        monthInput
            .on('change', change)
            .on('blur', change);
        dayInput
            .on('change', change)
            .on('blur', change);
    }


    function change() {
        var tag = {};
        var yearValue = utilGetSetValue(yearInput).trim();
        var eraValue = utilGetSetValue(eraInput).trim();
        var monthValue = utilGetSetValue(monthInput).trim();
        var dayValue = utilGetSetValue(dayInput).trim();

        // don't override multiple values with blank string
        if (!yearValue && Array.isArray(_tags[field.key])) return;

        if (!yearValue) {
            tag[field.key] = undefined;
        } else if (isNaN(yearValue)) {
            tag[field.key] = context.cleanTagValue(yearValue);
        } else {
            let value = '';
            let year = parseInt(context.cleanTagValue(yearValue), 10);
            if (eraValue === bceName) {
                value += '-' + String(year - 1).padStart(4, '0');
            } else {
                value += String(year).padStart(4, '0');
            }
            let month = context.cleanTagValue(monthValue);
            if (monthNames.includes(month)) {
                month = monthNames.indexOf(month) + 1;
                value += '-' + String(month).padStart(2, '0');
                let day = parseInt(context.cleanTagValue(dayValue), 10);
                if (!isNaN(day)) {
                    value += '-' + String(day).padStart(2, '0');
                }
            }
            tag[field.key] = value;
        }

        dispatch.call('change', this, tag);
    }


    date.tags = function(tags) {
        _tags = tags;

        var yearValue = tags[field.key];
        var eraValue;
        var monthValue;
        var dayValue;
        var isMixed = Array.isArray(yearValue);

        if (!isMixed && yearValue) {
            let parts = yearValue.match(/^(-?\d+)(?:-(\d\d))?(?:-(\d\d))?$/);
            if (parts && parts[1]) {
                yearValue = parseInt(parts[1], 10);
                if (yearValue < 1) {
                    yearValue = -yearValue + 1;
                    eraValue = bceName;
                } else {
                    eraValue = ceName;
                }

                if (parts[2]) {
                    monthValue = monthNames[parseInt(parts[2], 10) - 1] || parts[2];
                }

                if (parts[3]) {
                    dayValue = parseInt(parts[3], 10);
                }
            }
        }

        utilGetSetValue(yearInput, typeof yearValue === 'number' ? yearValue : '')
            .attr('title', isMixed ? yearValue.filter(Boolean).join('\n') : null)
            .attr('placeholder', isMixed ? t('inspector.multiple_values') : t('inspector.date.year'))
            .classed('mixed', isMixed);
        utilGetSetValue(eraInput, typeof eraValue === 'string' ? eraValue : '')
            .attr('placeholder', t('inspector.date.era'));
        utilGetSetValue(monthInput, typeof monthValue === 'string' ? monthValue : '')
            .attr('placeholder', t('inspector.date.month'));
        utilGetSetValue(dayInput, typeof dayValue === 'number' ? dayValue : '')
            .attr('placeholder', t('inspector.date.day'));
    };


    date.focus = function() {
        let node = yearInput.selectAll('input').node();
        if (node) node.focus();
    };


    date.entityIDs = function(val) {
        _entityIDs = val;
    };


    return utilRebind(date, dispatch, 'on');
}
