import Backbone from 'backbone'
import cozysdk from 'cozysdk-client'
import Tracks from '../collections/tracks'
import application from '../application'

const Playlist = Backbone.Model.extend({

  defaults: {
    _id: undefined,
    title: '',
    tracks: '',
    type: '',
    dateAdded: Date.now
  },

  initialize (attributes, options) {
    let tracks = attributes.tracks || new Tracks()
    let type = attributes.type || 'playlist'
    this.set('tracks', tracks)
    this.set('type', type)
    this.bindListeners()
  },

  idAttribute: '_id',

  sync (method, model, options) {
    switch (method) {
      case 'create':
        return cozysdk.create('Playlist', model.toJSON())
                    .then((res) => {
                      model.set('_id', res._id)
                      options.success()
                    })
      case 'read':
        return cozysdk.find('Playlist', model.get('_id'))
                    .then((res) => {
                      options.success()
                    })
      case 'update':
        return cozysdk.updateAttributes('Playlist', model.id, model.toJSON())
                    .then((res) => {
                      options.success()
                    })
      case 'delete':
        return cozysdk.destroy('Playlist', model.get('_id'))
                    .then((res) => {
                      options.success()
                    })
    }
  },

  bindListeners () {
    this.on('change:hidden', this.removeTrack, this)

    // AllTracks doesn't need all other listener
    if (this.get('type') === 'all') return

    if (this.get('type') === 'upNext') {
      // Add the current Track to upNext
      this.listenTo(application.appState,
                'change:currentTrack',
                function (appState, currentTrack) {
                  this.addTrack(currentTrack)
                }
            )
      this.listenTo(
                application.channel, {
                  // Reset upNext when clicking on the reset button
                  'upnext:reset': () => {
                    let currentTrack = application.appState.get('currentTrack')
                    this.resetTrack(currentTrack)
                  },
                  // Add current playlist to upNext
                  'upnext:addCurrentPlaylist': this.addCurrentPlaylistToUpNext
                })
    }
    // Remove a track from all it's playlist when he is destroyed
    this.listenTo(
            application.allTracks.get('tracks'),
            'remove',
            function (removedTrack, allTracks) {
              this.removeTrack(removedTrack)
            }
        )
  },

  // UpNext : Add current playlist to upNext
  addCurrentPlaylistToUpNext () {
    let currentPlaylist = application.appState.get('currentPlaylist')
    let currentTracks = currentPlaylist.get('tracks')
    let sort = application.appState.get('sort')
    let tracksToAdd = sort.by
    if (sort.by !== 'default') {
      if (sort.direction === 'reverse') {
        tracksToAdd = sort.by.last(sort.by.length).reverse()
      }
      _.each(tracksToAdd, track => {
        let t = currentTracks.get(track.get('_id'))
        if (t) {
          this.addTrack(t)
        }
      })
    } else {
      currentTracks.each(track => {
        this.addTrack(track)
      })
    }
  },

  // Add a track to the playlist
  addTrack (track) {
    let tracks = this.get('tracks')
    tracks.push(track)
    application.channel.trigger('track:playlistChanged', track)
    if (this.get('type') === 'playlist') this.save()
  },

  // Remove a track to the playlist
  removeTrack (track) {
    let tracks = this.get('tracks')
    tracks.remove(track)
    application.channel.trigger('track:playlistChanged', track)
    if (this.get('type') === 'playlist') this.save()
  },

  // Insert a track at a given pos
  reorderTrack (track, pos) {
    let tracks = this.get('tracks')

    // We need to retrieve the old track by id
    // sometimes backbone fail to recognise it's the same track
    let old = tracks.get(track.get('_id'))
    let oldIndex = tracks.indexOf(old)

    if (oldIndex === pos) return
    tracks.remove(old)
    tracks.add(track, {at: pos})
    application.channel.trigger('playlist:reorder', tracks)
    if (tracks.type === 'playlist') this.save()
  },

  // Used to resetUpNext and set search track
  resetTrack (tracks) {
    let oldTrack = _.clone(this.get('tracks'))
    this.get('tracks').reset(tracks)

    oldTrack.add(tracks)
    oldTrack.each((track) => {
      application.channel.trigger('track:playlistChanged', track)
    })
  },

  parse (attrs, options) {
    if (attrs) {
      let tracks = attrs.tracks
      attrs.tracks = new Tracks(tracks, {type: 'playlist'})
      return attrs
    }
  }
})

export default Playlist
