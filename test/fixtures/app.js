'use strict'

const _ = require('lodash')
const smokesignals = require('smokesignals')

module.exports = _.defaultsDeep({
  pkg: {
    name: require('../../package').name + '-test'
  },
  api: { },
  config: {
    main: {
      spools: [
        require('@fabrix/spool-router').RouterSpool,
        require('@fabrix/spool-generics').GenericsSpool
      ]
    },
    generics: {
      stripe: {
        adapter: require('../../dist/index').StripeGeneric,
        config: {
          stripe_public: process.env.STRIPE_PUBLIC,
          stripe_secret: process.env.STRIPE_SECRET
        },
        api: require('../../dist/api/index')
      }
    }
  }
}, smokesignals.FailsafeConfig)


