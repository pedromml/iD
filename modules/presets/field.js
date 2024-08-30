import { localizer, t } from '../core/localizer';
import { utilSafeClassName } from '../util/util';


//
// `presetField` decorates a given `field` Object
// with some extra methods for searching and matching geometry
//
export function presetField(fieldID, field, allFields) {
  allFields = allFields || {};
  let _this = Object.assign({}, field);   // shallow copy

  // This handles fields that are composed of a base key and an index, like 'source:1'
  let localizerFieldID = fieldID;
  if (field.baseKey && field.index){
    localizerFieldID = field.baseKey + '_multiple';
  }

  _this.id = fieldID;

  // for use in classes, element ids, css selectors
  _this.safeid = utilSafeClassName(fieldID);

  _this.matchGeometry = (geom) => !_this.geometry || _this.geometry.indexOf(geom) !== -1;

  _this.matchAllGeometry = (geometries) => {
    return !_this.geometry || geometries.every(geom => _this.geometry.indexOf(geom) !== -1);
  };

  _this.t = (scope, options) => t(localizer.coalesceStringIds([`custom_presets.fields.${localizerFieldID}.${scope}`,
                                                               `_tagging.presets.fields.${localizerFieldID}.${scope}`]), options);
  _this.t.html = (scope, options) => t.html(localizer.coalesceStringIds([`custom_presets.fields.${localizerFieldID}.${scope}`,
                                                                         `_tagging.presets.fields.${localizerFieldID}.${scope}`]), options);
  _this.t.append = (scope, options) => t.append(localizer.coalesceStringIds([`custom_presets.fields.${localizerFieldID}.${scope}`,
                                                                             `_tagging.presets.fields.${localizerFieldID}.${scope}`]), options);
  _this.hasTextForStringId = (scope) => localizer.hasTextForStringId(`custom_presets.fields.${localizerFieldID}.${scope}`) ||
    localizer.hasTextForStringId(`_tagging.presets.fields.${localizerFieldID}.${scope}`);

  _this.resolveReference = which => {
    const referenceRegex = /^\{(.*)\}$/;
    const match = (field[which] || '').match(referenceRegex);
    if (match) {
      const field = allFields[match[1]];
      if (field) {
        return field;
      }
      console.error(`Unable to resolve referenced field: ${match[1]}`);  // eslint-disable-line no-console
    }
    return _this;
  };

  _this.title = () => _this.overrideLabel || _this.resolveReference('label').t('label', { 'default': fieldID, 'index': field.index });
  _this.label = () => _this.overrideLabel ?
      selection => selection.text(_this.overrideLabel) :
      _this.resolveReference('label').t.append('label', { 'default': fieldID, 'index': field.index });

  _this.placeholder = () => _this.resolveReference('placeholder').t('placeholder', { 'default': '' });

  _this.originalTerms = (_this.terms || []).join();

  _this.terms = () => _this.resolveReference('label').t('terms', { 'default': _this.originalTerms })
    .toLowerCase().trim().split(/\s*,+\s*/);

  _this.increment = _this.type === 'number' ? (_this.increment || 1) : undefined;

  return _this;
}
