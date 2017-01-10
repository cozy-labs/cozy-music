import Mn from 'backbone.marionette'
import PlaylistView from './playlist'
import application from '../application'
import Playlist from '../models/playlist'

const PopupPlaylists = Mn.CompositeView.extend({

  template: require('./templates/popupPlaylists'),

  childViewContainer: '#playlist-list',

  childView: PlaylistView,

  childViewOptions: {
    template: require('./templates/popupPlaylist')
  },

  ui: {
    addPlaylist: '#add-playlist',
    playlistText: '#playlist-text',
    playlistPopup: '#playlist-popup-menu'
  },

  events: {
    'click li p': 'addToPlaylist',
    'click @ui.addPlaylist': 'showInput',
    'keyup @ui.playlistText': 'keyupPlaylistText'
  },

  initialize () {
    this.listenTo(application.channel, {
      'playlistPopup:show': this.showPopup,
      'playlistPopup:hide': this.hidePopup
    })
  },

  showPopup (model) {
    if (this.model === model) {
      this.ui.playlistPopup.addClass('show')
    }
  },

  hidePopup (model) {
    if (this.model === model) {
      this.ui.playlistPopup.removeClass('show')
    }
  },

  addToPlaylist (e) {
    e.stopPropagation()
    let id = e.currentTarget.dataset.id
    let playlist = application.allPlaylists.get(id)

    let tracks = application.selected.get('tracks')
    tracks.each((t) => {
      playlist.addTrack(t)
    })

    let notification = {
      status: 'ok',
      message: t('added to playlist',
        {
          playlist_name: playlist.get('title')
        })
    }
    application.channel.request('notification', notification)
  },

  showInput (e) {
    e.stopPropagation()
    this.ui.addPlaylist.addClass('input')
    this.ui.playlistText.focus()
  },

  // Create the playlist when `Enter` is pressed
  keyupPlaylistText (e) {
    let title = this.ui.playlistText.val()
    if (e.keyCode === 13) {
      let newPlaylist = new Playlist({ title: title })
      application.allPlaylists.create(newPlaylist, {success: () => {
        let tracks = application.selected.get('tracks')
        tracks.each((t) => {
          newPlaylist.addTrack(t)
        })

        this.ui.playlistText.val('')
        let notification = {
          status: 'ok',
          message: t('added to playlist',
            {
              playlist_name: newPlaylist.get('title')
            })
        }
        application.channel.request('notification', notification)
      }})
    }
  }

})

export default PopupPlaylists

