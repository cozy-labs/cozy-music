import Mn from 'backbone.marionette'
import application from '../application' // eslint-disable-line

const Notification = Mn.ItemView.extend({

  template: require('./templates/notification'),

  ui: {
    notification: '.notification'
  },

  initialize (notification) {
    this.message = notification.message
    this.status = notification.status
  },

  onRender () {
    if (this.status === 'loading') {
      this.ui.notification.addClass('load')
      window.onbeforeunload = function () {
        return t('loading pending')
      }
    } else {
      this.ui.notification.addClass('notify')
      setTimeout(() => { // Prevent animation to replay after reopening the app
        this.ui.notification.removeClass('notify')
      }, 4000)
    }
  },

  onDestroy () {
    window.onbeforeunload = null
  },

  serializeData () {
    return {
      message: this.message,
      status: this.status
    }
  }
})

export default Notification
