/**
 * Copyright 2015 IBM Corp. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';
var debug = require('debug')('bot:api:products');
var pick = require('object.pick');
var format = require('string-template');
var extend = require('extend');
var fields = ['temp', 'pop', 'uv_index', 'narrative', 'phrase_12char', 'phrase_22char', 'phrase_32char'];
var requestDefaults = {
  jar: true,
  json: true
};



var request;
var PRODUCT_URL = process.env.EL_URL || 'http://search-commerce-yb7l6stznhghvhzq3k6ykbhbqm.us-east-1.es.amazonaws.com';

function only(entity) {
    entity = entity._source;
    //debug(JSON.stringify(entity));
    var image_url = entity.images[0].base_url + entity.images[0].primary;
    return { title: entity.title, image: image_url, price: entity.listPrice.formattedPrice  };
}

module.exports = {


  /**
   * Returns the Products based on the parameters supplied
   * @param  {string}   params.categoryId  Category ID of the product
   * @param  {Function} callback The callback
   * @return {void}
   */
  search: function(context, callback) {
      if (!context.categories) {
          callback(null);
      }

      var should = [];
      var categoryId = context.categories[0].target;

      debug("context entities: "+JSON.stringify(context.keywords));

      if (context.keywords) {
          var keywords = context.keywords;

          debug("Keywords %s", JSON.stringify(keywords));
          for(var prop in keywords) {
              if (prop == 'color')
                  should.push({ match: { "variation.color": keywords[prop] }});
              else if(prop == 'brand')
                  should.push({ match: { "productBrand.brand": keywords[prop] }});
              else if(prop == 'PhoneType')
                  should.push({ match: { "description": keywords[prop] }});
          }
      }


      if (categoryId) {
          should.push({ match: { categoryId: categoryId }});

          debug("CategoryID %s", JSON.stringify(categoryId));
      }



    debug("Keywords %s", JSON.stringify(keywords));

    var qString;


    request = require('request').defaults(requestDefaults);
    qString = {
              query: {
                  bool: {
                      should: should
                  }

              },
              size: 3
            };

    debug("request query: %s", JSON.stringify(qString));

    request({
      method: 'POST',
      url: PRODUCT_URL + '/_search',
      body: qString
    }, function(err, response, body) {
      if (err) {
        callback(err);
      } else if(response.statusCode != 200) {
        callback('Error http status: ' + response.statusCode);
      } else if (body.errors && body.errors.length > 0){
        callback(body.errors[0].error.message);
      } else {
        debug('products for category %s, hits: %s', categoryId, body.hits.total);

        var products = body.hits.hits.map(only);

        callback(null, products);
      }
    });
  }

/**
 * Gets the forecast based on a location and time range
 * @param  {[string]}   params.latitute   The Geo latitude
 * @param  {[string]}   params.longitude   The Geo longitude
 * @param  {[string]}   params.range   (Optional) The forecast range: 10day, 48hour, 5day...
 * @param  {Function} callback The callback
 * @return {void}
*
  forecastByGeoLocation : function(params, callback) {
    var _params = extend({ range: '7day' }, params);

    if (!_params.latitude || !_params.longitude) {
      callback('latitude and longitude cannot be null')
    }
       var qString;
       if (!weatherKey) {
            request = require('request').defaults(requestDefaults);
            qString = {
                     units: 'e',
                     language: 'en-US'
                     };
         } else {
            request = require('request').defaults(requestNoAuthDefaults);
             qString = {
                     units: 'e',
                     language: 'en-US',
                     apiKey: weatherKey
                     };
          }
     request({
      method: 'GET',
      url: format(PRODUCT_URL + '/v1/geocode/{latitude}/{longitude}/forecast/daily/{range}.json', _params),
      qs: qString
    }, function(err, response, body) {
      if (err) {
        callback(err);
      } else if(response.statusCode != 200) {
        callback('Error getting the forecast: HTTP Status: ' + response.statusCode);
      } else {
        var forecastByDay = {};
        body.forecasts.forEach(function(f) {
          // Pick night time forecast if day time isn't available from Weather API
          if (!forecastByDay[f.dow]) {
            var dayFields = pick(f.day,fields);
            if (Object.keys(dayFields).length === 0){
              forecastByDay[f.dow] = {
                night: pick(f.night, fields)
              };
            }else{
              forecastByDay[f.dow] = {
                day: pick(f.day, fields),
                night: pick(f.night, fields)
              };
            };
        };
        });
        debug('forecast for: %s is: %s', JSON.stringify(params), JSON.stringify(forecastByDay, null, 2));
        callback(null, forecastByDay);
      }
    });
  }
 */
}
