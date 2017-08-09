import Ember from 'ember';
import ENV from '../../config/environment';

const {apiURL} = ENV;
const {RSVP, computed, $, set, get, copy} = Ember;

export default Ember.Route.extend({
  i18n: Ember.inject.service(),
  featureToggle: Ember.inject.service(),

  firstYear: computed.alias('featureToggle.first_year'),
  lastYear: computed.alias('featureToggle.last_year'),

  queryParams: {
    startDate: { refreshModel: false },
    endDate: { refreshModel: false },
    search: { refreshModel: false }
  },
  controllerName: 'visualization',
  renderTemplate() {
    this.render('visualization');
  },
  model(params) {
    let {landUse_id, visualization_type, source_type, variable} = params;
    set(this, 'land_use_id', landUse_id);
    set(this, 'source_type', source_type);
    set(this, 'visualization_type', visualization_type);
    set(this, 'variable', variable);

    return RSVP.hash(this.get(source_type)).then((hash) => {
      if(source_type === 'departments') {
        return this.departmentsDataMunging(hash);
      } else if (source_type === 'municipalities') {
        return this.municipalitiesDataMunging(hash);
      }
    });
  },
  afterModel(graphbuilderModel) {
    return graphbuilderModel.setProperties({
      visualization: get(this, 'visualization_type'),
      source: get(this, 'source_type'),
      metaData: this.modelFor('application'),
      variable: get(this, 'variable'),
      entity_type:'landUse',
    });
  },
  departments: computed('land_use_id', function() {
    let id = get(this, 'land_use_id');
    return {
      model: this.store.find('land-use', id),
      landUses: $.getJSON(`${apiURL}/data/land_use/${id}/locations/?level=department`)
    };
  }),
  municipalities: computed('land_use_id', function() {
    let id = get(this, 'land_use_id');
    return {
      model: this.store.find('land-use', id),
      landUses: $.getJSON(`${apiURL}/data/land_use/${id}/locations/?level=municipality`)
    };
  }),
  departmentsDataMunging(hash) {
    let {model,landUses} = hash;
    let locationsMetadata  = this.modelFor('application').locations;

    let data = _.map(landUses.data, (d) => {
      return _.merge(
        copy(d),
        locationsMetadata[d.location_id],
        {
          model: 'landUse',
          year: this.get("lastYear"),
          department_id: d.location_id
        }
      );
    });

    return Ember.Object.create({
      entity: model,
      data: data,
    });
  },
  municipalitiesDataMunging(hash) {
    let {model,landUses} = hash;
    let locationsMetadata  = this.modelFor('application').locations;

    let data = _.map(landUses.data, (d) => {
      return _.merge(
        locationsMetadata[d.location_id],
        copy(d),
        {
          model: 'landUse',
          year: this.get("lastYear"),
          municipality_id: d.location_id,
          group: locationsMetadata[d.location_id].parent_id,
          parent_name_en: locationsMetadata[locationsMetadata[d.location_id].parent_id].name_en,
        }
      );
    });

    return Ember.Object.create({
      entity: model,
      data: data,
    });
  },
  setupController(controller, model) {
    this._super(controller, model);
    controller.set('drawerChangeGraphIsOpen', false); // Turn off other drawers
    controller.set('drawerQuestionsIsOpen', false); // Turn off other drawers
    controller.set('searchText', controller.get('search'));
    window.scrollTo(0, 0);
  },
  resetController(controller, isExiting) {
    controller.set('variable', null);

    if (isExiting) {
      controller.setProperties({
        variable: null,
        startDate: this.get('firstYear'),
        endDate: this.get('lastYear')
      });
    }
  }
});
