'use strict'
/* global describe, it */
const assert = require('assert')

describe('StripeWebhookService', () => {
  it('should exist', () => {
    assert(global.app.api.services['StripeWebhookService'])
  })
})
