import { FabrixController as Controller } from '@fabrix/fabrix/dist/common'
/**
 * @module StripeWebhookController
 * @description Fabrix Controller.
 */
export class StripeWebhookController extends Controller {
  webhook(req, res) {
    const StripeService = this.app.services.StripeWebhookService
    // Handle the webhook request and response
    StripeService.webhook(req)
      .then(event => {

        // Send Stripe a response right away so that it doesn't wait on the ORM
        // Stripe will timeout a request and retry otherwise.
        res.json(event)

        // If this event is not ignored
        if (!event.ignored) {
          // Handle Stripe Event
          StripeService.handleStripeEvent(event.type, event.data.object)
            .then(response => {
              this.app.log.debug(response)
              return
            })
            .catch(err => {
              this.app.log.error(err)
              return
            })
        }
      })
      .catch(err => {
        this.app.log.error(err)
        if (err.code === 'E_VALIDATION') {
          // Validation Error
          return res.status(400).json({error: err.message || err})
        }
        else {
          // Unreconciled Error
          return res.serverError(err)
        }
      })
  }
}

