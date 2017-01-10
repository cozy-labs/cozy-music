import Backbone from 'backbone'
import Mn from 'backbone.marionette'
import Tracks from './collections/tracks'
import Playlist from './models/playlist'
import Playlists from './collections/playlists'
import AppLayout from './views/app_layout'
import AppState from './models/appState'
import Radio from 'backbone.radio'
import Router from './routes/index'
import { syncFiles, hardSync } from './libs/file'

require('./styles/app.styl')
const TRACK_LIMIT = 300

let Application = Mn.Application.extend({

  _initChannel () { // Use Backbone.Radio instead of wreqr
    this.channelName = _.result(this, 'channelName') || 'global'
    this.channel = _.result(this, 'channel') || Radio.channel(this.channelName)
  },

  onBeforeStart () {
    // Prevent multiple sync to occur
    this.syncing = true

    this.allTracks = new Playlist({
      title: 'All Songs',
      tracks: new Tracks(),
      type: 'all'
    })
    this.loadTrack = new Promise((resolve, reject) => {
      let downloadPromise = this.allTracks.get('tracks').fetch({
        data: { limit: TRACK_LIMIT }, remove: false
      })
      this.fetchTracks(downloadPromise, resolve)
    })
    this.loadTrack.then(() => {
      this.syncing = false
      this.channel.request('sync')
    })

    this.appState = new AppState()

    this.upNext = new Playlist({
      title: 'Up Next',
      tracks: new Tracks(),
      type: 'upNext'
    })

    this.search = new Playlist({
      title: 'Results for ',
      tracks: new Tracks(),
      type: 'search'
    })

    this.selected = new Playlist({
      title: 'selected',
      tracks: new Tracks(),
      type: 'selected'
    })

    this.router = new Router()

    // the default playlist is all tracks
    this.appState.set('currentPlaylist', this.allTracks)

    this.allPlaylists = new Playlists()
    this.loadPlaylist = this.allPlaylists.fetch() // Promise

    // Sorted Collection that contains only the model ID
    this.allTracksByArtist = new Tracks([], {viewName: 'playableByArtist'})
    this.allTracksByAlbum = new Tracks([], {viewName: 'playableByAlbum'})
    this.allTracksByArtist.fetch()
    this.allTracksByAlbum.fetch()
  },

  // Get all Tracks by TRACK_LIMIT
  fetchTracks (downloadPromise, resolve) {
    downloadPromise.then((res) => {
      let tracks = this.allTracks.get('tracks')
      if (res.length === TRACK_LIMIT) {
        let downloadPromise = tracks.fetch({
          data: { limit: TRACK_LIMIT, skip: tracks.length }, remove: false
        })
        this.fetchTracks(downloadPromise, resolve)
      } else {
        resolve()
      }
    })
  },

  sync (hard) {
    if (!this.syncing) {
      this.syncing = true
      if (hard) {
        hardSync()
      } else {
        syncFiles()
      }
    }
  },

  onStart () {
    if (Backbone.history) {
      Backbone.history.start({pushState: false})
    }
    this.appLayout = new AppLayout()
    this.appLayout.render()

        // prevent the scroll with keyboard
    document.addEventListener('keydown', (e) => {
      let isScrollKey = _.includes([32, 33, 34, 37, 38, 39, 40], e.which)
      if (isScrollKey && e.target === document.body) {
        e.preventDefault()
      }
    })

    // Allow to Sync the music with the files stored in CouchDB
    this.channel.reply('sync', this.sync.bind(this))
  }
})

export default new Application()
