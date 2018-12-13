import Ember from 'ember';
import numeral from 'numeral';
import ENV from '../config/environment';
const {computed, observer, $, get} = Ember;
const {apiURL} = ENV;

export default Ember.Component.extend({
  i18n: Ember.inject.service(),
  tagName: 'div',
  height: 500,
  varIndependent: 'code',
  attributeBindings: ['width','height'],
  classNames: ['buildermod__viz--white','buildermod__viz','scatterplot'],
  id: computed('elementId', function() {
    return `#${this.get('elementId')}`;
  }),
  eciValue: computed('endDate', function(){
      let datum = _.first(_.filter(this.get('locationData'),
                                   {'year': parseInt(this.get('endDate'))}));
      if(this.get('dataType') === 'products' && datum) {
        return get(datum, 'eci');
      } else if(this.get('dataType') === 'industries' && datum) {
        return get(datum, 'industry_eci');
      }
  }),
  scatter: computed('data.@each', 'dataType','eciValue','i18n.locale', function() {
    let eci = this.get('eciValue');
    let vistkLanguage = this.get('i18n.display') === 'es' ? 'es_ES': 'en_EN';
    let format = function(value) { return numeral(value).format('0.00'); };
    return vistk.viz()
    .params({
      type: 'scatterplot',
      margin: {top: 10, right: 20, bottom: 30, left: 30},
      height: this.get('height'),
      width: this.get('width'),
      container: this.get('id'),
      data: this.get('data'),
      var_id: this.get('varIndependent'),
      var_x: 'distance',
      var_y: 'complexity',
      var_r: this.get('varSize'),
      radius_min: 2,
      radius_max: 10,
      x_domain: this.get('x_domain'),
      y_domain: this.get('y_domain'),
      r_domain: this.get('r_domain'),
      x_format: format,
      y_format: format,
      duration: 0,
      var_text: this.get('varIndependent'),
      x_text_custom: this.get('i18n').t('graph_builder.table.distance').string,
      y_text_custom: this.get('i18n').t('graph_builder.table.complexity').string,
      items: [{
        marks: [{
          type: 'circle',
          fill: (d) => { return d.color ? d.color : '#ccc1b9'; }
        }, {
          var_mark: '__highlighted',
          type: d3.scale.ordinal().domain([true, false]).range(['line_horizontal', 'none']),
          offset_right: function(d, i, vars) {
              return vars.x_scale[0]['func'].range()[1] - vars.x_scale[0]['func'](d[vars.var_x]) + vars.r_scale(d[vars.var_r]);
          }
        }, {
          var_mark: '__highlighted',
          type: d3.scale.ordinal().domain([true, false]).range(['line_vertical', 'none']),
          offset_top: function(d, i, vars) {
              return vars.r_scale(d[vars.var_r]);
          }
        }, {
          var_mark: '__highlighted',
          type: d3.scale.ordinal().domain([true, false]).range(['rect', 'none']),
          translate: function(d, i, vars) {
            return [-vars.x_scale[0]['func'](d[vars.var_x]) - 20, -10];
          },
          height: 25,
          width: 50,
          stroke: 'black',
          stroke_width: '1.5px',
          fill: function() { return 'white'; }
        }, {
          var_mark: '__highlighted',
          type: d3.scale.ordinal().domain([true, false]).range(['text', 'none']),
          translate: function(d, i, vars) {
            return [-vars.x_scale[0]['func'](d[vars.var_x]) + 25, 0];
          },
          text_anchor: 'end',
          text: function(d, i, vars) {
            return format(d[vars.var_y]);
          }
        }, {
          var_mark: '__highlighted',
          type: d3.scale.ordinal().domain([true, false]).range(['rect', 'none']),
          translate: function(d, i, vars) {
            return [-25, -vars.y_scale[0]['func'](d[vars.var_y]) + vars.height - vars.margin.bottom - vars.margin.top];
          },
          height: 25,
          width: 50,
          stroke: 'black',
          stroke_width: '1.5px',
          fill: function() { return 'white'; }
        }, {
          var_mark: '__highlighted',
          type: d3.scale.ordinal().domain([true, false]).range(['text', 'none']),
          translate: function(d, i, vars) {
            return [0, -vars.y_scale[0]['func'](d[vars.var_y]) + vars.height - vars.margin.bottom - vars.margin.top + 10];
          },
          text_anchor: 'middle',
          text: function(d, i, vars) {
            return format(d[vars.var_x]);
          }
        }, {
          var_mark: '__highlighted',
          type: d3.scale.ordinal().domain([false, true]).range(['none', 'div']),
          class: function() {
            return 'tooltip';
          },
          x: function(d, i, vars) {
            return  vars.x_scale[0]['func'](d[vars.var_x]) + vars.margin.left;
          },
          y: function(d, i, vars) {
            return vars.y_scale[0]['func'](d[vars.var_y]);
          },
          text: (d)  => {
            var data = [{
              'key': this.get('rca'),
              'value': get(d,this.get('rca'))
            },{
              'key': 'cog',
              'value':get(d,'cog')
            },{
              'key': this.get('amount'),
              'value':get(d,this.get('amount'))
            }
            ];
            var textItem = get(d, `name_short_${this.get('i18n').display}`) || d.code;
            var tooltip_text = `<span style="color:${get(d, 'color')}">${textItem} - ${get(d, 'code')}</span>`;

            data.forEach((datum) => {
              if(datum.key) {
                tooltip_text += '<br>' + this.get('i18n').t(`graph_builder.table.${get(datum,'key')}`) + ': ' + format(get(datum,'value'));
              }
            });

            return tooltip_text;
          },
          translate: [0, 0],
          width: 200,
          height: 'auto'
        }, {
          type: 'line_horizontal',
          filter: function(d, i) {
           return typeof eci !== 'undefined' && i === 0;
          },
          offset_y: function(d, i, vars) {
            return -(vars.y_scale[0]['func'](d[vars.var_y]) - vars.y_scale[0]['func'](eci));
          }
        }, {
          type: 'text',
          filter: function(d, i) {
           return typeof eci !== 'undefined' && i === 0;
          },
          text: function() {
            var label = vistkLanguage === 'en_EN' ? 'Average complexity': 'Complejidad media';
            return label + ': ' + format(eci);
          },
          text_anchor: 'end',
          offset_y: function(d, i, vars) {
            return -(vars.y_scale[0]['func'](d[vars.var_y]) - vars.y_scale[0]['func'](eci)) - 10;
          },
          offset_x: function(d, i, vars) {
            return vars.x_scale[0]['func'].range()[1] - vars.x_scale[0]['func'](d[vars.var_x]);
          }
        }]
      }],
      lang: vistkLanguage,
    });
  }),
  varSize: computed('dataType', function() {
    if(this.get('dataType') === 'products') { return 'cog'; }
    if(this.get('dataType') === 'industries') { return 'cog'; }
  }),
  rca: computed('dataType', function() {
    if(this.get('dataType') === 'products') { return 'export_rca'; }
    if(this.get('dataType') === 'industries') { return 'rca'; }
  }),
  amount: computed('dataType', function() {
    if(this.get('dataType') === 'products') { return 'export_value'; }
    if(this.get('dataType') === 'industries') { return 'employment'; }
  }),
  didInsertElement: function() {
    // TODO: Why is this code here >:| Getting location level specific data
    // definitely is not a scatterplot component concern
    let id = this.get('entityId');
    let locationLevel = this.get(`metadata.locations.${id}.level`);
    // There are no country level data API (/location/0/?level=country) yet, so
    // in that case just use some defaults and don't care about ECI value.
    if (locationLevel === "country"){
      this.set('width', this.$().parent().width());
      this.set('x_domain', vistk.utils.extent(this.get('modelData'), 'distance'));
      this.set('y_domain', vistk.utils.extent(this.get('modelData'), 'complexity'));
      this.set('r_domain', vistk.utils.extent(this.get('modelData'), this.get('varSize')));
      d3.select(this.get('id')).call(this.get('scatter'));
      return;
    }
    $.getJSON(`${apiURL}/data/location?level=${locationLevel}`).then((response) => {
      let data = get(response, 'data');

      let locationIdField;
      if(locationLevel == "msa"){
        locationIdField = "location_id";
      } else {
        locationIdField = `${locationLevel}_id`;
      }

      let locationData = _.filter(data, {[locationIdField]: parseInt(id) });
      this.set('locationData', locationData);

      this.set('width', this.$().parent().width());

      this.set('x_domain', vistk.utils.extent(this.get('modelData'), 'distance'));
      this.set('y_domain', vistk.utils.extent(this.get('modelData'), 'complexity'));
      this.set('r_domain', vistk.utils.extent(this.get('modelData'), this.get('varSize')));

      d3.select(this.get('id')).call(this.get('scatter'));
    });
  },
  willDestroyElement: function() {
    this.set('scatter',  null);
    this.removeObserver('i18n.locale', this, this.update);
    this.removeObserver('data.[]', this, this.update);
  },
  update: observer('data.@each', 'varRca', 'i18n.locale', 'dataType', function() {
    if(!this.element){ return ; } //do not redraw if not there
    d3.select(this.get('id')).select('svg').remove();
    Ember.run.later(this , function() {
      if(this.get('scatter')) {
        d3.select(this.get('id')).call(this.get('scatter'));
      }
    });
  })
});

