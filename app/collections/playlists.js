import Backbone from 'backbone'
import Playlist from '../models/playlist'
import cozysdk from 'cozysdk-client'
import application from '../application'

const Playlists = Backbone.Collection.extend({

  model: Playlist,

  comparator: 'title',

  initialize () {
    this.listenTo(
            application.channel,
            'delete:playlist',
            this.deletePlaylist
        )
  },

  deletePlaylist (playlist) {
    this.remove(playlist)
    playlist.destroy()
  },

  sync (method, model, options) {
    if (method === 'read') {
      let promise = cozysdk.queryView('Playlist', 'all', options.data)
      promise.then((res) => {
        if (options && options.success) {
          options.success(res)
        }
      })
      promise.catch((err) => {
        if (options && options.error) {
          options.error(err)
        }
      })
      return promise
    }
  },

  parse (playlists, options) {
    let result = []
    for (let i = 0; i < playlists.length; i++) {
      result.push(playlists[i].value)
    }
    return result
  }
})

cozysdk.defineView('Playlist', 'all', (doc) => {
  emit(doc._id, doc)
}, (error, response) => {
  if (error) {
    console.error(error)
  }
})

export default Playlists
