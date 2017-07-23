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

var NaturalLanguageUnderstandingV1 = require('watson-developer-cloud/natural-language-understanding/v1.js');
var natural_language_understanding = new NaturalLanguageUnderstandingV1({
  username: process.env.NATURAL_LANGUAGE_UNDERSTANDING_USERNAME,
  password: process.env.NATURAL_LANGUAGE_UNDERSTANDING_PASSWORD,
  version_date: '2017-02-27'
});
var debug = require('debug')('bot:api:natural-language-understanding');

var category_mapping = [
    {
      "ibm": "/technology and computing/consumer electronics/portable entertainment",
        "target": "5xte3"
    },
    {
      "ibm": "/technology and computing/consumer electronics/telephones/mobile phones/smart phones",
        "target": "5xte3"
    },
    {
      "ibm": "/technology and computing/consumer electronics/telephones/mobile phones",
        "target": "5xte3"
    }
];


function getTargetCat(entity) {

  var value = {};
  category_mapping.forEach(function(node) {
    debug("comparing '"+entity.label+"' and '"+node.ibm+"'");
    if(entity.label === node.ibm) {
      value = { target: node.target, ibm: node.ibm };
      return;
    }
  });

  return value;
}

function onlyLabel(entity) {
  return { label: entity.label };
}

function highScore(entity) {
  return entity.score > 0.7;
}

function highRelevance(entity) {
  return entity.relevance > 0.7;
}

module.exports = {
  /**
   * Extract the city mentioned in the input text
   * @param  {Object}   params.text  The text
   * @param  {Function} callback The callback
   * @return {void}
   */
  getCategories: function(params, callback) {
    params.language = 'en';
    params.features={'entities':{}, 'categories': {}, 'keywords': {}};
    natural_language_understanding.analyze(params, function(err, response) {
      debug('text: %s, entities: %s', params.text, JSON.stringify(response.keywords));

      if (err) {
        callback(err);
      }
      else {
        var keywords = response.keywords.filter(highRelevance);
        var categories = response.categories.filter(highScore).map(getTargetCat);
        callback(null, categories.length > 0 ? categories: null);
      }
    })
  }
};
