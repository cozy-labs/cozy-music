import Backbone from 'backbone'
import application from '../application'

const AppState = Backbone.Model.extend({

  // Store variable related to the current application State
  defaults: {
    id: 'APP_STATE',
    currentTrack: undefined,
    currentPlaylist: '',
    shuffle: false,
    repeat: 'false', // can be 'false' / 'track' / 'playlist'
    currentVolume: 0.5,
    mute: false,
    sort: {
      by: 'default', // can be 'default' / 'title' / artist' / 'album'
      direction: 'normal' // can be 'normal' / 'reverse'
    },

    // Used only to retrieve the last app_state
    currentTime: 0,
    upNext: ''
  },

  initialize () {
    this.fetch()
    let currentTrack = this.get('currentTrack')
    this.set('currentTrack', undefined)

    window.addEventListener('unload', this.save.bind(this))

    if (!(currentTrack && currentTrack._id)) return
    application.loadTrack.then(() => {
      // Initialize currentTrack
      let id = currentTrack._id
      let track = application.allTracks.get('tracks').get(id)
      this.set('currentTrack', track, {silent: true})
      application.channel.trigger('player:load', track)

      // Initialize upNext
      let tracks = this.get('upNext')
      _.each(tracks, (id) => {
        let track = application.allTracks.get('tracks').get(id)
        application.upNext.addTrack(track)
      })
    })
  },

  sync (method, model, options) {
  // Prevent Sync
  },

  // Retrieve data from the localStorage
  fetch () {
    var storage = window.localStorage
    this.set(JSON.parse(storage.getItem(this.get('id'))))
  },

  // Save data from the localStorage
  save () {
    this.set('currentTime', application.audio.currentTime)

    // Save only id of track in upNext
    let MAX_TRACK_IN_UPNEXT = 500
    let upNext = application.upNext.get('tracks')
    let startOffset = upNext.indexOf(this.get('currentTrack'))
    let saveUpNext = []

    // If upNext is not empty and we have enough space
    if (startOffset === -1 || upNext.length < MAX_TRACK_IN_UPNEXT) {
      startOffset = 0
    }

    // Add all track id in an array
    let max = MAX_TRACK_IN_UPNEXT + startOffset
    for (let i = startOffset; i < max && i < upNext.length; i++) {
      let track = upNext.at(i)
      saveUpNext.push(track.get('_id'))
    }
    this.set('upNext', saveUpNext)

    // Save in localstorage
    var storage = window.localStorage
    let save = this.toJSON()
    delete save.currentPlaylist // Don't save currentPlaylist
    delete save.sort // Don't save Sort
    storage.setItem(this.get('id'), JSON.stringify(save))
  }
})

export default AppState
