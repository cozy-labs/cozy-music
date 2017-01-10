import Mn from 'backbone.marionette'
import application from '../application'

const PlaylistView = Mn.ItemView.extend({

  tagName: 'li',

  initialize (options) {
    this.template = options.template
  },

  className () {
    let currentPlaylist = application.appState.get('currentPlaylist')
    let selected = currentPlaylist === this.model ? 'selected' : ''
    return 'playlist ' + selected
  },

  modelEvents: { change: 'render' }
})

export default PlaylistView
