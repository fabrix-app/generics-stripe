# generics-stripe

[![Gitter][gitter-image]][gitter-url]
[![NPM version][npm-image]][npm-url]
[![Build Status][ci-image]][ci-url]
[![Test Coverage][coverage-image]][coverage-url]
[![Dependency Status][daviddm-image]][daviddm-url]
[![Follow @FabrixApp on Twitter][twitter-image]][twitter-url]

Generic Payment Processor for Stripe.com supplied by Spool-generics.

Looking for [Spool-Generics?](https://github.com/fabrix-app/spool-generics)

## Install

```sh
$ npm install --save @fabrix/generics-stripe
```

## Configure

```js
// config/generics.ts
export const generics = {
  // make the key stripe, alternatively make the key payment_processor to be the default payment_processor  
  stripe: {
    adapter: require('@fabrix/generic-stripe').StripeGeneric,
    config: {
        public: '<your public key>',
        secret: '<your private key>'
    },
    api: require('@fabrix/generic-stripe/api'),
    icon: '' // url to an icon you want to use for this generic
  }
}
```

[npm-image]: https://img.shields.io/npm/v/@fabrix/generics-stripe.svg?style=flat-square
[npm-url]: https://npmjs.org/package/@fabrix/generics-stripe
[ci-image]: https://img.shields.io/circleci/project/github/fabrix-app/generics-stripe/master.svg
[ci-url]: https://circleci.com/gh/fabrix-app/generics-stripe/tree/master
[daviddm-image]: http://img.shields.io/david/fabrix-app/generics-stripe.svg?style=flat-square
[daviddm-url]: https://david-dm.org/fabrix-app/generics-stripe
[gitter-image]: http://img.shields.io/badge/+%20GITTER-JOIN%20CHAT%20%E2%86%92-1DCE73.svg?style=flat-square
[gitter-url]: https://gitter.im/fabrix-app/Lobby
[twitter-image]: https://img.shields.io/twitter/follow/FabrixApp.svg?style=social
[twitter-url]: https://twitter.com/FabrixApp
[coverage-image]: https://img.shields.io/codeclimate/coverage/github/fabrix-app/generics-stripe.svg?style=flat-square
[coverage-url]: https://codeclimate.com/github/fabrix-app/generics-stripe/coverage
