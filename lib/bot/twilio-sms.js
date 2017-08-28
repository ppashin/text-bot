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

var debug = require('debug')('bot:channel:twilio-sms');
var TwilioSMSBot = require('botkit-sms');
var twilioSmsBot = TwilioSMSBot({
  log: true,
  account_sid: process.env.TWILIO_ACCOUNT_SID,
  auth_token: process.env.TWILIO_AUTH_TOKEN,
  twilio_number: process.env.TWILIO_NUMBER,
    port: process.env.VCAP_APP_PORT
});

module.exports = function (app, controller) {
  // spawn a twilio bot instance
  var bot = twilioSmsBot.spawn({});
  // hook the bot to the web appvim

  twilioSmsBot.createWebhookEndpoints(app, bot);
  debug('twilio-sms initialized');

  twilioSmsBot.hears('(.*)', 'message_received', function (bot, message) {
    debug('message: %s', JSON.stringify(message));
    controller.processMessage(message, function(err, response) {
      if (err) {
        bot.reply(message, 'There was a problem processing your message, please try again');
      } else {
        debug('products for you: %s', JSON.stringify(response.context.products));
        bot.reply(message, response.output);
        if(response.context.products) {
          response.context.products.forEach(function(product) {
            bot.reply(message, product.title + '('+product.price+')');
            bot.reply(message,  {
              body: product.title,
              mediaUrl: product.image
            });


          });
        }


      }
    })
  });
}

