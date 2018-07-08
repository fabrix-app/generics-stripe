'use strict'
/* global describe, it */
const assert = require('assert')

describe('StripeWebhookController', () => {
  it('should exist', () => {
    assert(global.app.api.controllers['StripeWebhookController'])
  })
})
