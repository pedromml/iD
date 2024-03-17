import { t } from '../core/localizer';
import { utilDisplayLabel } from '../util';
import { validationIssue, validationIssueFix } from '../core/validation';

export function validationEmptyStartDate() {
  const type = 'empty_start_date';

  const validation = function checkEmptyStartDate(entity) {
    // If start_date is not empty, return nothing
    if (entity.tags && (entity.tags.start_date || entity.tags['start_date:edtf'])) return [];
    // If entity has no tags, return nothing
    if (Object.keys(entity.tags).length === 0) return [];
    // Rule should be ignored for natural entities and waterways
    if (entity.tags && (entity.tags.natural || entity.tags.waterway || entity.tags.water)) return [];

    const entityID = entity.id;

    function showReferenceDate(selection) {
        selection.selectAll('.issue-reference')
            .data([0])
            .enter()
            .append('div')
            .attr('class', 'issue-reference')
            .call(t.append('issues.invalid_format.date.reference'));
    }

    return [new validationIssue({
      type: type,
      severity: 'warning',
      message: (context) => {
        const entity = context.hasEntity(entityID);
        return entity ? t.append('issues.empty_start_date.feature.message', {
          feature: utilDisplayLabel(entity, context.graph())
        }) : '';
      },
      reference: showReferenceDate,
      entityIds: [entityID],
      dynamicFixes: () => {
        return [
          new validationIssueFix({ title: t.append('issues.fix.add_start_date.title') })
        ];
      }
    })];
  };

  validation.type = type;

  return validation;
}
