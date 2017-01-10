import Backbone from 'backbone'
import application from '../application'
import PlaylistsRouter from './playlists'

let Router = Backbone.Router.extend({
  routes: {
    'tracks': 'tracks',
    'upnext': 'upnext',
    'search?q=:pattern': 'searchAfterTrackLoaded',
    '': 'index'
  },

  initialize () {
    application.on('start', function () {
      let playlists = new PlaylistsRouter('playlists') // eslint-disable-line
    })
  },

  index () {
    this.navigate('tracks', { trigger: true })
  },

  tracks () {
    application.appState.set('currentPlaylist', application.allTracks)
  },

  upnext () {
    application.appState.set('currentPlaylist', application.upNext)
  },

  searchAfterTrackLoaded (pattern) {
    application.loadTrack.then(() => { this.search(pattern) })
  },

  // Search in the title, album and artist. Case unsensitive.
  search (pattern) {
    let models = application.allTracks.get('tracks').filter((item) => {
      let metas = _.defaults({}, item.get('metas'), {
        artist: '',
        album: ''
      })
      let search = new RegExp(pattern, 'i')
      return search.test(metas.title) ||
             search.test(metas.album) ||
             search.test(metas.artist)
    })
    application.search.set('title', 'Results for "' + pattern + '"')
    application.search.resetTrack(models)
    application.appState.set('currentPlaylist', application.search)
    application.channel.trigger('search:done')
  }
})

export default Router
