// tslint:disable max-line-length

import * as Stripe from 'stripe'
import { Generic } from '@fabrix/spool-generics'

export class StripeGeneric extends Generic {
  public config: {
    stripe_secret: string,
    stripe_public: string
  }

  /**
   * Create Stripe Instance
   * @returns {*} Stripe Instance
   */
  stripe() {
    return Stripe(
      this.config.stripe_secret
    )
  }

  /**
   * resolves error code to proxy-cart error_code
   * @param {Object} err
   * @returns {String}
   */
  resolveStripeCardError(err) {
    let errorCode
    switch (err.code) {
    case 'card_declined':
      errorCode = 'card_declined'
      break
    case 'incorrect_cvc':
      errorCode = 'incorrect_cvc'
      break
    case 'expired_card':
      errorCode = 'expired_card'
      break
    case 'processing_error':
      errorCode = 'processing_error'
      break
    case 'incorrect_number':
      errorCode = 'incorrect_number'
      break
    case 'invalid_expiry_month':
      errorCode = 'invalid_expiry_date'
      break
    case 'invalid_expiry_year':
      errorCode = 'invalid_expiry_date'
      break
    case 'invalid_cvc':
      errorCode = 'invalid_cvc'
      break
    default:
      errorCode = 'processing_error'
    }
    return errorCode
  }

  /**
   *
   * @param stripeCard
   * @returns {{type: string, gateway: string, avs_result_code: string, credit_card_iin: string, credit_card_company: *, credit_card_number: string, credit_card_last4: *, credit_card_exp_month: (number|*), credit_card_exp_year: (string|number|*), cvv_result_code: string, gateway_token: (string|*)}}
   */
  resolveToPaymentDetails(stripeCard) {
    const paymentDetails = {
      // The type of Source: credit_card, debit_card, prepaid_card, apple_pay, bitcoin
      type: `${stripeCard.funding }_card`,
      // the Gateway used
      gateway: 'stripe',
      // The Response code from AVS the address verification system. The code is a single letter; see this chart for the codes and their definitions.
      avs_result_code: 'Y',
      // The issuer identification number (IIN), formerly known as bank identification number (BIN) ] of the customer's credit card. This is made up of the first few digits of the credit card number.
      credit_card_iin: '',
      // The Cardholder name.
      credit_card_name: stripeCard.name,
      // The name of the company who issued the customer's credit card.
      credit_card_company: stripeCard.brand,
      // The customer's credit card number, with most of the leading digits redacted with Xs.
      credit_card_number: `**** **** **** ${ stripeCard.last4 }`,
      // the last 4 of the customer's credit card number
      credit_card_last4: stripeCard.last4,
      // the 2 digit month
      credit_card_exp_month: stripeCard.exp_month,
      // the 2-4 digit year
      credit_card_exp_year: stripeCard.exp_year,

      // The address
      credit_card_address_city: stripeCard.address_city,
      credit_card_address_country: stripeCard.address_country,
      credit_card_address_line1: stripeCard.address_line1,
      credit_card_address_line1_check: stripeCard.address_line1_check,
      credit_card_address_line2: stripeCard.address_line2,
      credit_card_address_state: stripeCard.address_state,
      credit_card_address_zip: stripeCard.address_zip,
      credit_card_address_zip_check: stripeCard.address_zip_check,

      // The Response code from the credit card company indicating whether the customer entered the card security code, a.k.a. card verification value, correctly. The code is a single letter or empty string; see this chart http://www.emsecommerce.net/avs_cvv2_response_codes.htm for the codes and their definitions.
      cvv_result_code: 'S',
      // The card token from the Gateway
      gateway_token: stripeCard.id
    }
    return paymentDetails
  }

  /**
   *
   * @param transaction
   * @returns {Promise}
   */
  authorize(transaction) {
    // Set the kind immediately
    transaction.kind = 'authorize'
    if (!transaction.payment_details) {
      transaction.payment_details = {
        gateway: 'stripe'
      }
    }

    const sale: {[key: string]: any} = {
      amount: transaction.amount,
      currency: transaction.currency || 'usd',
      source: transaction.payment_details.gateway_token,
      description: transaction.description || 'Transaction Authorize',
      capture: false
    }

    if (transaction.payment_details.source) {
      sale.customer = transaction.payment_details.source.account_foreign_id
      sale.source = transaction.payment_details.source.foreign_id
    }
    else {
      sale.source = transaction.payment_details.gateway_token
    }

    // Stripe Doesn't Allow payments less than 50 cents
    if (transaction.amount <= 50) {
      transaction.authorization = transaction.payment_details.source ? transaction.payment_details.source.foreign_id : transaction.payment_details.gateway_token
      transaction.authorization_exp = new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000)
      transaction.status = 'success'
      // Load blank payment details
      transaction.payment_details.type = 'no_card'
      transaction.payment_details.avs_result_code = 'U'
      transaction.payment_details.credit_card_iin = null
      transaction.payment_details.credit_card_company = null
      transaction.payment_details.credit_card_number = null
      transaction.payment_details.credit_card_exp_month = null
      transaction.payment_details.credit_card_exp_year = null
      transaction.payment_details.cvv_result_code = null

      transaction.payment_details.credit_card_address_city = null
      transaction.payment_details.credit_card_address_country = null
      transaction.payment_details.credit_card_address_line1 = null
      transaction.payment_details.credit_card_address_line1_check = null
      transaction.payment_details.credit_card_address_line2 = null
      transaction.payment_details.credit_card_address_state = null
      transaction.payment_details.credit_card_address_zip = null
      transaction.payment_details.credit_card_address_zip_check = null

      return Promise.resolve(transaction)
    }

    return new Promise((resolve, reject) => {
      this.stripe().charges.create(sale, (err, charge) => {
        if (err) {
          transaction.error_code = this.resolveStripeCardError(err)
          transaction.status = 'failure'
          return resolve(transaction)
        }
        transaction.amount = charge.amount
        transaction.status = 'success'
        transaction.receipt = charge
        transaction.authorization = charge.id
        transaction.authorization_exp = new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000)
        transaction.payment_details.type = `${charge.source.funding}_${charge.source.object}`
        if (charge.source.object === 'card') {
          transaction.payment_details.avs_result_code = 'Y'
          transaction.payment_details.credit_card_iin = null
          transaction.payment_details.credit_card_name = charge.source.name
          transaction.payment_details.credit_card_company = charge.source.brand
          transaction.payment_details.credit_card_number = `**** **** **** ${charge.source.last4}`
          transaction.payment_details.credit_card_exp_month = charge.source.exp_month
          transaction.payment_details.credit_card_exp_year = charge.source.exp_year
          transaction.payment_details.cvv_result_code = charge.source.cvc_check

          transaction.payment_details.credit_card_address_city = charge.source.address_city
          transaction.payment_details.credit_card_address_country = charge.source.address_country
          transaction.payment_details.credit_card_address_line1 = charge.source.address_line1
          transaction.payment_details.credit_card_address_line1_check = charge.source.address_line1_check
          transaction.payment_details.credit_card_address_line2 = charge.source.address_line2
          transaction.payment_details.credit_card_address_state = charge.source.address_state
          transaction.payment_details.credit_card_address_zip = charge.source.address_zip
          transaction.payment_details.credit_card_address_zip_check = charge.source.address_zip_check
        }
        return resolve(transaction)
      })
    })
  }

  /**
   *
   * @param transaction
   * @returns {Promise}
   */
  capture(transaction) {
    transaction.kind = 'capture'
    if (!transaction.payment_details) {
      transaction.payment_details = {
        gateway: 'stripe'
      }
    }

    // Stripe Doesn't Allow payments less than 50 cents
    if (transaction.amount <= 50) {
      transaction.status = 'success'
      return Promise.resolve(transaction)
    }

    return new Promise((resolve, reject) => {
      this.stripe().charges.capture(
        transaction.authorization
      , (err, charge) => {
        if (err) {
          transaction.error_code = this.resolveStripeCardError(err)
          transaction.status = 'failure'
          return resolve(transaction)
        }
        transaction.amount = charge.amount
        transaction.status = 'success'
        transaction.receipt = charge
        transaction.authorization = charge.id
        transaction.payment_details.type = `${charge.source.funding}_${charge.source.object}`
        if (charge.source.object === 'card') {
          transaction.payment_details.avs_result_code = 'Y'
          transaction.payment_details.credit_card_iin = null
          transaction.payment_details.credit_card_name = charge.source.name
          transaction.payment_details.credit_card_company = charge.source.brand
          transaction.payment_details.credit_card_number = `**** **** **** ${charge.source.last4}`
          transaction.payment_details.credit_card_exp_month = charge.source.exp_month
          transaction.payment_details.credit_card_exp_year = charge.source.exp_year
          transaction.payment_details.cvv_result_code = charge.source.cvc_check

          transaction.payment_details.credit_card_address_city = charge.source.address_city
          transaction.payment_details.credit_card_address_country = charge.source.address_country
          transaction.payment_details.credit_card_address_line1 = charge.source.address_line1
          transaction.payment_details.credit_card_address_line1_check = charge.source.address_line1_check
          transaction.payment_details.credit_card_address_line2 = charge.source.address_line2
          transaction.payment_details.credit_card_address_state = charge.source.address_state
          transaction.payment_details.credit_card_address_zip = charge.source.address_zip
          transaction.payment_details.credit_card_address_zip_check = charge.source.address_zip_check
        }
        return resolve(transaction)
      })
    })
  }

  /**
   *
   * @param transaction
   * @returns {Promise}
   */
  sale(transaction) {
    // Set the kind immediately
    transaction.kind = 'sale'
    if (!transaction.payment_details) {
      transaction.payment_details = {
        gateway: 'stripe'
      }
    }
    const sale: {[key: string]: any} = {
      amount: transaction.amount,
      currency: transaction.currency || 'usd',
      description: transaction.description || 'Transaction Sale',
      capture: true
    }

    if (transaction.payment_details.source) {
      sale.customer = transaction.payment_details.source.account_foreign_id
      sale.source = transaction.payment_details.source.foreign_id
    }
    else {
      sale.source = transaction.payment_details.gateway_token
    }

    // Stripe Doesn't Allow payments less than 50 cents
    if (transaction.amount <= 50) {
      transaction.authorization = transaction.payment_details.source ? transaction.payment_details.source.foreign_id : transaction.payment_details.gateway_token
      transaction.authorization_exp = new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000)
      transaction.status = 'success'
      // Load blank payment details
      transaction.payment_details.type = 'no_card'
      transaction.payment_details.avs_result_code = 'U'
      transaction.payment_details.credit_card_iin = null
      transaction.payment_details.credit_card_company = null
      transaction.payment_details.credit_card_number = null
      transaction.payment_details.credit_card_exp_month = null
      transaction.payment_details.credit_card_exp_year = null
      transaction.payment_details.cvv_result_code = null

      transaction.payment_details.credit_card_address_city = null
      transaction.payment_details.credit_card_address_country = null
      transaction.payment_details.credit_card_address_line1 = null
      transaction.payment_details.credit_card_address_line1_check = null
      transaction.payment_details.credit_card_address_line2 = null
      transaction.payment_details.credit_card_address_state = null
      transaction.payment_details.credit_card_address_zip = null
      transaction.payment_details.credit_card_address_zip_check = null

      return Promise.resolve(transaction)
    }

    return new Promise((resolve, reject) => {
      this.stripe().charges.create(sale, (err, charge) => {
        if (err) {
          transaction.error_code = this.resolveStripeCardError(err)
          transaction.status = 'failure'
          return resolve(transaction)
        }
        transaction.amount = charge.amount
        transaction.status = 'success'
        transaction.receipt = charge
        transaction.authorization = charge.id
        transaction.payment_details.type = `${charge.source.funding}_${charge.source.object}`
        if (charge.source.object === 'card') {
          transaction.payment_details.avs_result_code = 'Y'
          transaction.payment_details.credit_card_iin = null
          transaction.payment_details.credit_card_name = charge.source.name
          transaction.payment_details.credit_card_company = charge.source.brand
          transaction.payment_details.credit_card_number = `**** **** **** ${charge.source.last4}`
          transaction.payment_details.credit_card_exp_month = charge.source.exp_month
          transaction.payment_details.credit_card_exp_year = charge.source.exp_year
          transaction.payment_details.cvv_result_code = charge.source.cvc_check

          transaction.payment_details.credit_card_address_city = charge.source.address_city
          transaction.payment_details.credit_card_address_country = charge.source.address_country
          transaction.payment_details.credit_card_address_line1 = charge.source.address_line1
          transaction.payment_details.credit_card_address_line1_check = charge.source.address_line1_check
          transaction.payment_details.credit_card_address_line2 = charge.source.address_line2
          transaction.payment_details.credit_card_address_state = charge.source.address_state
          transaction.payment_details.credit_card_address_zip = charge.source.address_zip
          transaction.payment_details.credit_card_address_zip_check = charge.source.address_zip_check
        }
        return resolve(transaction)
      })
    })
  }

  /**
   *
   * @param transaction
   * @returns {Promise}
   */
  void(transaction) {
    transaction.kind = 'void'
    if (!transaction.payment_details) {
      transaction.payment_details = {
        gateway: 'stripe'
      }
    }
    const refund: {[key: string]: any} = {
      charge: transaction.authorization
    }
    if (transaction.amount) {
      refund.amount = transaction.amount
    }
    return new Promise((resolve, reject) => {
      this.stripe().refunds.create(refund, (err, _refund) => {
        if (err) {
          transaction.error_code = this.resolveStripeCardError(err)
          transaction.status = 'failure'
          return resolve(transaction)
        }
        transaction.amount = _refund.amount
        transaction.status = 'success'
        transaction.receipt = _refund
        return resolve(transaction)
      })
    })
  }

  /**
   *
   * @param transaction
   * @returns {Promise}
   */
  refund(transaction) {
    transaction.kind = 'refund'
    if (!transaction.payment_details) {
      transaction.payment_details = {
        gateway: 'stripe'
      }
    }
    const refund: {[key: string]: any} = {
      charge: transaction.authorization
    }
    if (transaction.amount) {
      refund.amount = transaction.amount
    }
    return new Promise((resolve, reject) => {
      this.stripe().refunds.create(refund, (err, _refund) => {
        if (err) {
          transaction.error_code = this.resolveStripeCardError(err)
          transaction.status = 'failure'
          return resolve(transaction)
        }
        transaction.amount = _refund.amount
        transaction.status = 'success'
        transaction.receipt = _refund
        return resolve(transaction)
      })
    })
  }

  /**
   *
   * @param customer
   * @returns {Promise.<T>}
   */
  createCustomer(customer) {
    return new Promise((resolve, reject) => {
      const create: {[key: string]: any} = {
        email: customer.email,
        description: customer.description || 'Customer Account'
      }
      if (customer.payment_token) {
        create.source = customer.payment_token
      }

      this.stripe().customers.create(create, function(err, stripeCustomer) {
        if (err) {
          return reject(err)
        }
        const ret = {
          gateway: 'stripe',
          foreign_key: stripeCustomer.object,
          foreign_id: stripeCustomer.id,
          data: stripeCustomer
        }
        return resolve(ret)
      })
    })
  }

  /**
   *
   * @param source
   * @returns {Promise.<T>}
   */
  createCustomerSource(source) {
    return new Promise((resolve, reject) => {
      const create: {[key: string]: any} = {}
      if (source.gateway_token) {
        create.source = source.gateway_token
      }
      // TODO If normal Credit Card Conventions are followed.
      // if (source.name){
      //   create.name = source.name
      // }
      // if (source.address_city){
      //   create.address_city = source.address_city
      // }
      // if (source.address_country){
      //   create.address_country = source.address_country
      // }
      // if (source.address_line1){
      //   create.address_line1 = source.address_line1
      // }
      // if (source.address_line2){
      //   create.address_line2 = source.address_line2
      // }
      // if (source.address_state){
      //   create.address_state = source.address_state
      // }
      // if (source.address_zip){
      //   create.address_zip = source.address_zip
      // }
      // if (source.exp_month){
      //   create.exp_month = source.exp_month
      // }
      // if (source.exp_year){
      //   create.exp_year = source.exp_year
      // }
      // if (source.metadata){
      //   create.metadata = source.metadata
      // }

      this.stripe().customers.createSource(source.account_foreign_id, create, (err, stripeCard) => {
        if (err) {
          return reject(err)
        }

        const paymentDetails = this.resolveToPaymentDetails(stripeCard)

        const ret = {
          gateway: 'stripe',
          account_foreign_key: 'customer',
          account_foreign_id: stripeCard.customer,
          foreign_key: stripeCard.object,
          foreign_id: stripeCard.id,
          payment_details: paymentDetails
        }
        return resolve(ret)
      })
    })
  }
  /**
   *
   * @param customer
   * @returns {Promise.<T>}
   */
  findCustomer(customer) {
    return new Promise((resolve, reject) => {
      this.stripe().customers.retrieve(customer.foreign_id, function(err, stripeCustomer) {
        if (err) {
          return reject(err)
        }
        const ret = {
          gateway: 'stripe',
          foreign_key: stripeCustomer.object,
          foreign_id: stripeCustomer.id,
          data: stripeCustomer
        }
        return resolve(ret)
      })
    })
  }
  /**
   *
   * @param customer
   * @returns {Promise.<T>}
   */
  findCustomerSource(source) {
    return new Promise((resolve, reject) => {
      this.stripe().customers.retrieveCard(source.account_foreign_id, source.foreign_id, (err, stripeCard) => {
        if (err) {
          return reject(err)
        }

        const paymentDetails = this.resolveToPaymentDetails(stripeCard)

        const ret = {
          gateway: 'stripe',
          account_foreign_key: 'customer',
          account_foreign_id: stripeCard.customer,
          foreign_key: stripeCard.object,
          foreign_id: stripeCard.id,
          payment_details: paymentDetails
        }
        return resolve(ret)
      })
    })
  }

  getCustomerSources(customer) {
    return new Promise((resolve, reject) => {
      this.stripe().customers.listCards(customer.foreign_id, (err, stripeCards) => {
        if (err) {
          return reject(err)
        }
        const sources = stripeCards.data.map(stripeCard => {
          const paymentDetails = this.resolveToPaymentDetails(stripeCard)
          return {
            gateway: 'stripe',
            account_foreign_key: 'customer',
            account_foreign_id: stripeCard.customer,
            foreign_key: stripeCard.object,
            foreign_id: stripeCard.id,
            payment_details: paymentDetails
          }
        })
        const ret = {
          gateway: 'stripe',
          foreign_key: customer.foreign_key,
          foreign_id: customer.foreign_id,
          data: customer.data,
          sources: sources
        }
        return resolve(ret)
      })
    })
  }
  /**
   *
   * @param customer
   * @returns {Promise.<T>}
   */
  updateCustomer(customer) {
    return new Promise((resolve, reject) => {
      const update: {[key: string]: any} = {}
      if (customer.source) {
        update.source = customer.source
      }
      if (customer.email) {
        update.email = customer.email
      }
      if (customer.description) {
        update.description = customer.description
      }
      this.stripe().customers.update(customer.foreign_id, update, function(err, stripeCustomer) {
        if (err) {
          return reject(err)
        }
        const ret = {
          gateway: 'stripe',
          foreign_key: stripeCustomer.object,
          foreign_id: stripeCustomer.id,
          data: stripeCustomer
        }
        return resolve(ret)
      })
    })
  }

  /**
   *
   * @param source
   * @returns {Promise.<T>}
   */
  updateCustomerSource(source) {
    return new Promise((resolve, reject) => {
      const update: {[key: string]: any} = {}
      if (source.name) {
        update.name = source.name
      }
      if (source.address_city) {
        update.address_city = source.address_city
      }
      if (source.address_country) {
        update.address_country = source.address_country
      }
      if (source.address_line1) {
        update.address_line1 = source.address_line1
      }
      if (source.address_line2) {
        update.address_line2 = source.address_line2
      }
      if (source.address_state) {
        update.address_state = source.address_state
      }
      if (source.address_zip) {
        update.address_zip = source.address_zip
      }
      if (source.exp_month) {
        update.exp_month = source.exp_month
      }
      if (source.exp_year) {
        update.exp_year = source.exp_year
      }
      if (source.metadata) {
        update.metadata = source.metadata
      }

      this.stripe().customers.updateCard(source.account_foreign_id, source.foreign_id, update, (err, stripeCard) => {
        if (err) {
          return reject(err)
        }

        const paymentDetails = this.resolveToPaymentDetails(stripeCard)

        const ret = {
          gateway: 'stripe',
          account_foreign_key: 'customer',
          account_foreign_id: stripeCard.customer,
          foreign_key: stripeCard.object,
          foreign_id: stripeCard.id,
          payment_details: paymentDetails
        }
        return resolve(ret)
      })
    })
  }

  /**
   *
   * @param source
   * @returns {Promise.<T>}
   */
  removeCustomerSource(source) {
    return new Promise((resolve, reject) => {
      this.stripe().customers.deleteCard(source.account_foreign_id, source.foreign_id, (err, stripeCard) => {
        if (err) {
          return reject(err)
        }
        source.gateway = 'stripe'
        return resolve(source)
      })
    })
  }
}

