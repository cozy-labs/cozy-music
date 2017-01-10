import Backbone from 'backbone'
import scdl from '../libs/soundcloud'
import cozysdk from 'cozysdk-client'
import application from '../application'

const Track = Backbone.Model.extend({

  defaults: {
    _id: undefined,
    playlists: '',
    metas: '',
    dateAdded: Date.now,
    plays: 0,
    ressource: '',
    hidden: false
  },

  idAttribute: '_id',

  sync (method, model, options) {
    switch (method) {
      case 'create':
        return cozysdk.create('Track', model.toJSON())
                    .then((res) => {
                      model.set('_id', res._id)
                      options.success()
                    })
      case 'read':
        return cozysdk.find('Track', model.get('_id'))
                    .then((res) => {
                      options.success()
                    })
      case 'update':
        return cozysdk.updateAttributes('Track', model.id, model.toJSON())
                    .then((res) => {
                      options.success()
                    })
      case 'delete':
        return cozysdk.destroy('Track', model.get('_id'))
                    .then((res) => {
                      options.success()
                    })
    }
  },

  getStream (callback) {
    let ressource = this.get('ressource')
    this.set('plays', this.get('plays') + 1) // Update the plays number
    cozysdk.find('Track', this.get('_id')).then((res) => {
      this.set('metas', res.metas)
      application.channel.trigger('player:render')
      this.save() // Save only after retrieving the picture or it will delete it.
    })
    switch (ressource.type) {
      case 'file':
        let id = this.get('ressource').fileID
        cozysdk.getFileURL(id, 'file', (err, res) => {
          if (err) throw err
          if (res) {
            callback(res)
          }
        })
        break
      case 'soundcloud':
        let url = this.get('ressource').url
        callback(scdl.addClientID(url))
        break
    }
  }
})

export default Track
