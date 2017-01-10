import Mn from 'backbone.marionette'
import PlaylistView from './playlist'
import application from '../application'
import Playlist from '../models/playlist'

const Playlists = Mn.CompositeView.extend({

  template: require('./templates/playlists'),

  childViewContainer: '#playlist-list',

  childView: PlaylistView,

  childViewOptions: {
    template: require('./templates/playlist')
  },

  modelEvents: {
    'change:currentPlaylist': 'render'
  },

  ui: {
    addPlaylist: '#add-playlist',
    playlistText: '#playlist-text'
  },

  events: {
    'click @ui.addPlaylist': 'createPlaylist',
    'focusout @ui.addPlaylist': 'focusoutAddPlaylist',
    'keyup @ui.playlistText': 'keyupPlaylistText'
  },

  initialize () {
    this.listenTo(
            application.channel,
            'delete:playlist',
            this.deletedPlaylist
        )
  },

  // Create the playlist when `Enter` is pressed
  keyupPlaylistText (e) {
    let title = this.ui.playlistText.val()
    if (e.keyCode === 13) {
      let newPlaylist = new Playlist({ title: title })
      application.allPlaylists.create(newPlaylist)
      this.ui.playlistText.val('')
      this.focusoutAddPlaylist()
    }
  },

  // Show the input
  createPlaylist () {
    this.ui.addPlaylist.removeClass('add-playlist').addClass('input')
    this.ui.playlistText.focus()
  },

  // Hide the input
  focusoutAddPlaylist () {
    if (this.ui.playlistText.val() === '') {
      this.ui.addPlaylist.addClass('add-playlist').removeClass('input')
    }
  },

  // When the current playlist is deleted, display the main view
  deletedPlaylist (playlist) {
    let currentPlaylist = application.appState.get('currentPlaylist')
    if (currentPlaylist === playlist) {
      application.router.navigate('tracks', { trigger: true })
    }
  },

  serializeData () {
    let currentPlaylist = application.appState.get('currentPlaylist')
    return {
      type: currentPlaylist.get('type')
    }
  }
})

export default Playlists

