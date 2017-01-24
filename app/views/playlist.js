import Mn from 'backbone.marionette'
import application from '../application'

const PlaylistView = Mn.ItemView.extend({

  template: require('./templates/playlist'),

  tagName: 'li',

  events: {
    'dblclick': 'playSelectedPlaylist'
  },

  initialize (options) {
    this.template = options.template
  },

  className () {
    let currentPlaylist = application.appState.get('currentPlaylist')
    let selected = currentPlaylist === this.model ? 'selected' : ''
    return 'playlist ' + selected
  },

  playSelectedPlaylist (e) {
    let upNext = application.upNext.get('tracks')
    application.channel.trigger('upnext:reset')
    application.channel.trigger('upnext:addCurrentPlaylist')
    application.appState.set('currentTrack', upNext.at(1))
  },

  modelEvents: { change: 'render' }
})

export default PlaylistView
