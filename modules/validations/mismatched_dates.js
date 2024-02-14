import { actionChangeTags } from '../actions/change_tags';
import { localizer, t } from '../core/localizer';
import { utilDisplayLabel, utilNormalizeDateString } from '../util';
import { validationIssue, validationIssueFix } from '../core/validation';

import * as edtf from 'edtf';

export function validationMismatchedDates() {
    let type = 'mismatched_dates';

    function parseEDTF(value) {
        try {
            let parsed = edtf.default(value);

            // According to edtf.js, an extended interval with an unknown start or end covers no date.
            // This isn't useful for the purpose of testing whether the basic date matches, so treat it as an unspecified start or end.
            if (parsed.lower === null) {
                parsed.lower = Infinity;
            }
            if (parsed.upper === null) {
                parsed.upper = Infinity;
            }

            return parsed;
        } catch (e) {
            // Already handled by invalid_format rule.
            return;
        }
    }

    function getReplacementDates(parsed) {
        let likelyDates = new Set();

        let valueFromDate = (date, precision) => {
            date.precision = precision;
            return date.edtf.split('T')[0];
        };

        if (Number.isFinite(parsed.min)) {
            let min = edtf.default(parsed.min);
            let precision = (parsed.lower || parsed.first || parsed).precision;
            likelyDates.add(valueFromDate(min, precision));
        }

        if (Number.isFinite(parsed.max)) {
            let max = edtf.default(parsed.max);
            let precision = (parsed.upper || parsed.last || parsed).precision;
            likelyDates.add(valueFromDate(max, precision));
        }

        let sortedDates = [...likelyDates];
        sortedDates.sort();
        return sortedDates;
    }

    let validation = function(entity) {
        let issues = [];

        function showReferenceEDTF(selection) {
            selection.selectAll('.issue-reference')
                .data([0])
                .enter()
                .append('div')
                .attr('class', 'issue-reference')
                .call(t.append('issues.mismatched_dates.edtf.reference'));
        }

        function getDynamicFixes(key, parsed) {
            let fixes = [];

            let replacementDates = getReplacementDates(parsed);
            fixes.push(...replacementDates.map(value => {
                let normalized = utilNormalizeDateString(value);
                let localeDateString = normalized.date.toLocaleDateString(localizer.languageCode(), normalized.localeOptions);
                return new validationIssueFix({
                    title: t.append('issues.fix.reformat_date.title', { date: localeDateString }),
                    onClick: function(context) {
                        context.perform(function(graph) {
                            var entityInGraph = graph.hasEntity(entity.id);
                            if (!entityInGraph) return graph;
                            var newTags = Object.assign({}, entityInGraph.tags);
                            newTags[key] = normalized.value;
                            return actionChangeTags(entityInGraph.id, newTags)(graph);
                        }, t('issues.fix.reformat_date.annotation'));
                    }
                });
            }));

            fixes.push(new validationIssueFix({
                icon: 'iD-operation-delete',
                title: t.append('issues.fix.remove_tag.title'),
                onClick: function(context) {
                    context.perform(function(graph) {
                        var entityInGraph = graph.hasEntity(entity.id);
                        if (!entityInGraph) return graph;
                        var newTags = Object.assign({}, entityInGraph.tags);
                        delete newTags[key];
                        return actionChangeTags(entityInGraph.id, newTags)(graph);
                    }, t('issues.fix.remove_tag.annotation'));
                }
            }));

            return fixes;
        }

        function validateEDTF(key, msgKey) {
            if (!entity.tags[key] || !entity.tags[key + ':edtf']) return;
            let basic = parseEDTF(entity.tags[key]);
            let parsed = parseEDTF(entity.tags[key + ':edtf']);
            if (!basic || !parsed || parsed.covers(basic)) return;

            issues.push(new validationIssue({
                type: type,
                subtype: 'date',
                severity: 'warning',
                message: function(context) {
                    let entity = context.hasEntity(this.entityIds[0]);
                    return entity ? t.append('issues.mismatched_dates.edtf.message_' + msgKey,
                        { feature: utilDisplayLabel(entity, context.graph()) }) : '';
                },
                reference: showReferenceEDTF,
                entityIds: [entity.id],
                hash: key + entity.tags[key + ':edtf'],

                dynamicFixes: function() {
                    let fixes = [];
                    let likelyDates = new Set();

                    let valueFromDate = date => {
                        date.precision = (parsed.lower || parsed.first || parsed).precision;
                        return date.edtf.split('T')[0];
                    };

                    if (Number.isFinite(parsed.min)) {
                        let min = edtf.default(parsed.min);
                        likelyDates.add(valueFromDate(min));
                    }

                    if (Number.isFinite(parsed.max)) {
                        let max = edtf.default(parsed.max);
                        likelyDates.add(valueFromDate(max));
                    }

                    let sortedDates = [...likelyDates];
                    sortedDates.sort();
                    fixes.push(...sortedDates.map(value => {
                        let normalized = utilNormalizeDateString(value);
                        let localeDateString = normalized.date.toLocaleDateString(localizer.localeCodes(), normalized.localeOptions);
                        return new validationIssueFix({
                            title: t.append('issues.fix.reformat_date.title', { date: localeDateString }),
                            onClick: function(context) {
                                context.perform(function(graph) {
                                    var entityInGraph = graph.hasEntity(entity.id);
                                    if (!entityInGraph) return graph;
                                    var newTags = Object.assign({}, entityInGraph.tags);
                                    newTags[key] = normalized.value;
                                    return actionChangeTags(entityInGraph.id, newTags)(graph);
                                }, t('issues.fix.reformat_date.annotation'));
                            }
                        });
                    }));

                    fixes.push(new validationIssueFix({
                        icon: 'iD-operation-delete',
                        title: t.append('issues.fix.remove_tag.title'),
                        onClick: function(context) {
                            context.perform(function(graph) {
                                var entityInGraph = graph.hasEntity(entity.id);
                                if (!entityInGraph) return graph;
                                var newTags = Object.assign({}, entityInGraph.tags);
                                delete newTags[key];
                                return actionChangeTags(entityInGraph.id, newTags)(graph);
                            }, t('issues.fix.remove_tag.annotation'));
                        }
                    }));

                    return fixes;
                }

                dynamicFixes: () => getDynamicFixes(key, parsed),
      
            }));
        }
        validateEDTF('start_date', 'start');
        validateEDTF('end_date', 'end');

        return issues;
    };

    validation.type = type;
    validation.parseEDTF = parseEDTF;
    validation.getReplacementDates = getReplacementDates;

    return validation;
}
