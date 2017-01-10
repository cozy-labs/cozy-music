/* eslint-disable */
import Track from '../models/track'
import Tracks from '../collections/tracks'
import Playlist from '../models/playlist'
import application from '../application'
import cozysdk from 'cozysdk-client'
import { getDataURI } from './utils'
import { syncFiles } from './file'
import async from 'async'

const api = 'https://api.soundcloud.com'
const clientID = '02gUJC0hH2ct1EGOcYXQIzRFU91c72Ea'

class Soundcloud {

  import (url) {
    let notification = {
      status: 'loading',
      message: t('importing from soundcloud')
    }
    application.channel.request('notification', notification)
    this.get('/resolve', { url: url }, (res) => {
      if (res.kind == 'playlist') {
        let playlist = new Playlist({
          title: res.title,
          tracks: new Tracks(),
          type: 'playlist'
        })
        application.allPlaylists.create(playlist)
        this.launchImport(res.tracks, playlist)
      } else if (res.kind == 'track') {
        this.launchImport([ res ])
      }
    })
  }

  // Asynchronously import all track in playlist
  launchImport (tracks, playlist) {
    async.map(tracks, (track, callback) => {
      track.playlist = playlist
      if (!track.streamable) {
        let notification = {
          status: 'ko',
          message: t('this track is not streamable')
        }
        callback(null, notification)
      } else {
        this.checkIfAlreadyExist(track, callback)
      }
    }, (err, res) => {
      if (err) {
        this.errorNotification(err)
      } else {
        this.savedNotification(res)
      }
    })
  }

  // Check if the track is already in the database
  checkIfAlreadyExist (track, callback) {
    cozysdk.queryView('Track', 'soundcloud', {}, (err, tracks) => {
      if (tracks) {
        let trackID

        // Check if we already imported this track
        for (let i = 0; i < tracks.length; i++) {
          if (tracks[i].value.url == track.stream_url) {
            trackID = tracks[i].key
          }
        }

        // if the track isn't already imported, import it
        if (!trackID) {
          let self = this
          getDataURI(track.artwork_url, (picture) => {
            track.picture = picture
            self.createFolder(track, callback)
          })
        // Try to add the track to the playlist if we already
        // imported it
        } else {
          let playlist = track.playlist
          if (playlist) {
            let tracks = application.allTracks.get('tracks')
            let track = tracks.get(trackID)
            playlist.addTrack(track)
          }
          let notification = {
            status: 'ko',
            message: t('track is already in the database')
          }
          callback(null, notification)
        }
      }
    })
  }

  // Create Soundcloud Folder
  createFolder (track, callback) {
    cozysdk.defineView('Folder', 'Souncloud', (doc) => {
      if (doc.name == 'Soundcloud') {
        emit(doc._id, doc)
      }
    }, (error, response) => {
      cozysdk.queryView('Folder', 'Souncloud', {}, (err, folder) => {
        if (folder.length == 0) {
          let folder = {
            'path': '',
            'name': 'Soundcloud',
            'docType': 'folder',
            'creationDate': Date.now,
            'lastModification': Date.now,
            'tags': []
          }
          cozysdk.create('Folder', folder, (err, res) => {
            this.createFile(track, callback)
          })
        } else {
          this.createFile(track, callback)
        }
      })
    })
  }

  // Create the doctype File
  createFile (track, callback) {
    let playlist = track.playlist

    let metas = {
      title: track.title,
      artist: track.user.username,
      genre: track.genre,
      album: playlist ? playlist.get('title') : '',
      duration: track.duration / 1000,
      picture: [ {
        'format': 'jpg',
        data: track.picture
      } ]
    }
    let file = {
      'path': '/Soundcloud',
      'name': track.title + '.mp3',
      'docType': 'file',
      'mime': 'audio/mpeg',
      'creationDate': Date.now,
      'lastModification': Date.now,
      'class': 'music',
      'size': '',
      'tags': '',
      'uploading': false,
      'binary': '',
      'checksum': '',
      'audio_metadata': metas
    }
    track.file = file

    cozysdk.create('File', file).then((res) => {
      track.file._id = res._id
      this.attachBinary(track, callback)
    }).catch((err) => {
      callback(err, null)
    })
  }

  // Attach the binary to the doctype File
  // This can take some time according to the connection speed of your cozy
  attachBinary (track, callback) {
    let fileID = track.file._id
    let url = this.addClientID(track.stream_url)
    cozysdk.addBinary('File', fileID, { fromURL: url }, 'file').then((res) => {
      this.importTrack(track, callback)
    }).catch((err) => {
      cozysdk.destroy('File', fileID)
      callback(err, null)
    })
  }

  // Create the doctype Track
  importTrack (track, callback) {
    let fileID = track.file._id
    let metas = track.file.audio_metadata
    metas.duration *= 1000
    let playlist = track.playlist

    let newTrack = new Track({
      metas: metas,
      ressource: {
        type: 'file',
        fileID: fileID,
        url: track.stream_url
      }
    })

    let notification = {
      status: 'ok',
      message: t('stream track imported')
    }
    callback(null, notification)
    application.allTracks.get('tracks').create(newTrack, {
      success: () => {
        if (playlist) playlist.addTrack(newTrack)
      }
    })
  }

  // Add our clientID to the current url
  addClientID (url) {
    return url + '?client_id=' + clientID
  }

  // Call the soundcoud API
  get (endpoint, params, callback) {
    if (typeof params === 'function') {
      callback = params
      params = {}
    }

    let url
    if (endpoint.includes(api)) {
      url = this.addClientID(endpoint)
    } else {
      url = this.addClientID(api + endpoint)
    }

    for (let key in params) {
      if (params.hasOwnProperty(key)) {
        url += '&' + key + '=' + params[key]
      }
    }

    $.ajax({
      dataType: 'json',
      url: url,
      success: callback
    })
  }

  savedNotification (values) {
    let notification
    if (values.length == 1) {
      notification = values[0]
      application.channel.request('notification', notification)
    } else {
      notification = {
        status: 'ok',
        message: t('stream track imported')
      }

      for (let i = 0; i < values.length; i++) {
        let el = values[i]
        if (el.status == 'ko') {
          notification = {
            status: 'ko',
            message: t('one track not imported')
          }
          break
        }
      }

      application.channel.request('notification', notification)
    }
  }

  errorNotification (err) {
    console.log(err)
    let notification = {
      status: 'ko',
      message: t('an error occured during the synchronisation')
    }
    application.channel.request('notification', notification)
  }
}

export default new Soundcloud()
