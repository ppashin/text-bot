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

var debug = require('debug')('bot:controller');
var extend = require('extend');
var Promise = require('bluebird');
var conversation = require('./api/conversation');
var products = require('./api/products');
var NaturalLanguageUnderstanding = require('./api/natural-language-understanding');
var cloudant = require('./api/cloudant');
var format = require('string-template');
var pick = require('object.pick');

var sendMessageToConversation = Promise.promisify(conversation.message.bind(conversation));
var getUser = Promise.promisify(cloudant.get.bind(cloudant));
var saveUser = Promise.promisify(cloudant.put.bind(cloudant));
var getCategories = Promise.promisify(NaturalLanguageUnderstanding.getCategories.bind(NaturalLanguageUnderstanding));
var search = Promise.promisify(products.search.bind(products));


module.exports = {
  /**
   * Process messages from a channel and send a response to the user
   * @param  {Object}   message.user  The user
   * @param  {Object}   message.input The user meesage
   * @param  {Object}   message.context The conversation context
   * @param  {Function} callback The callback
   * @return {void}
   */
  processMessage: function(_message, callback) {
    var message = extend({ input: {text: _message.text} }, _message);
    var input = message.text ? { text: message.text } : message.input;
    var user = message.user || message.from;

    debug('1. Process new message: %s.', JSON.stringify(message.input, null, 2));

    getUser(user).then(function(dbUser) {
      var context = dbUser ? dbUser.context : {};
      message.context = context;
      getCategories(input).then(function(categories) {
        debug('2. input.text: %s, extracted categories: %s.', input.text, JSON.stringify(categories));
        if (categories) {
          if (!context.categories) {
            context.categories = categories
          }
        }
        return message;
      })
      .then(function(message) {
        return search(message.context)
        .then(function(products) {
          debug('3. Got products %s', JSON.stringify(products));
          message.context.products = products;
          return message;
        })
      })
      .then(function(message) {
        debug('4. Send message to Conversation.');
        return sendMessageToConversation(message);
      })
      // 4. Process the response from Conversation
      .then(function(messageResponse) {
        debug('5. Conversation response: %s.', JSON.stringify(messageResponse, null, 2));
        // Check if this is a new weather query
        var responseContext = messageResponse.context;
        var idx = messageResponse.intents.map(function(x) {return x.intent; }).indexOf('BuyPhone');

        return messageResponse;
      })
      .then(function(messageToUser) {
        debug('Message to User %s', JSON.stringify(messageToUser));
        debug('7. Save conversation context.');
        if (!dbUser) {
          dbUser = {_id: user};
        }
        dbUser.context = messageToUser.context;
        return saveUser(dbUser)
        .then(function(data) {

          messageToUser = extend(messageToUser, _message);
          debug('7. Send response to the user.'+ JSON.stringify(messageToUser));
          callback(null, messageToUser);
        });
      })
    })
    // Catch any issue we could have during all the steps above
    .catch(function (error) {
      debug(error);
      callback(error);
    });
  }
}
