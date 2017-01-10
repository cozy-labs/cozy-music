import Mn from 'backbone.marionette'

const dialog = Mn.ItemView.extend({

  template: require('./templates/dialog'),

  ui: {
    accept: '.accept',
    dismiss: '.dismiss'
  },

  initialize (dialog) {
    this.dialog = dialog
  },

  onRender () {
    this.ui.accept.click(() => {
      this.$el.hide()
      this.dialog.accept()
    })
    this.ui.dismiss.click(() => {
      this.$el.hide()
      this.dialog.dismiss()
    })
  },

  serializeData () {
    return {
      title: this.dialog.title,
      dismiss: this.dialog.dismiss,
      message: this.dialog.message
    }
  }
})

export default dialog
