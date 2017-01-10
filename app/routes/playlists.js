import SubRoute from 'backbone.subroute'
import application from '../application'

let PlaylistsRouter = SubRoute.extend({
  routes: {
    ':slug': 'index',
    ':slug/tracks': 'show'
  },

  index (id) {
    this.navigate('playlists/' + id + '/tracks', { trigger: true })
  },

  show (id) {
    // When all playlists has been loaded, show the playlist
    application.loadPlaylist.then((val) => {
      let playlist = application.allPlaylists.get(id)
      if (playlist) {
        application.appState.set('currentPlaylist', playlist)
      } else {
        this.navigate('tracks', { trigger: true })
      }
    })
  }
})

export default PlaylistsRouter
