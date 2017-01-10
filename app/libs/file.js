/* eslint-disable */
import Track from '../models/track'
import application from '../application'
import cozysdk from 'cozysdk-client'
import async from 'async'

export function syncFiles () {
  let notification = {
    status: 'loading',
    message: t('syncing')
  }
  application.channel.request('notification', notification)
  cozysdk.queryView('Track', 'oldDoctype', {}, (err, tracks) => {
    if (tracks.length > 0) {
      createCozicFolder(tracks)
    } else {
      fileSynchronisation()
    }
  })
}

// Delete all Track imported from files and Sync
export function hardSync () {
  let notification = {
    status: 'loading',
    message: t('hard syncing')
  }
  application.channel.request('notification', notification)
  cozysdk.destroyByView('Track', 'allFileTrack').then(() => {
    application.allTracks.resetTrack()
    syncFiles()
  }).catch((err) => {
    errorNotification(err)
  })
}

// Cozic Synchronisation \\
// Create Cozic Folder
function createCozicFolder (tracks) {
  let notification = {
    status: 'loading',
    message: t('importing cozic files')
  }
  application.channel.request('notification', notification)
  cozysdk.defineView('Folder', 'Cozic', (doc) => {
    if (doc.name === 'Cozic') {
      emit(doc._id, doc)
    }
  }, (error, response) => {
    cozysdk.queryView('Folder', 'Cozic', {}, (err , folder) => {
      if (folder.length === 0) {
        let folder = {
          'path': '',
          'name': 'Cozic',
          'docType': 'folder',
          'creationDate': Date.now,
          'lastModification': Date.now,
          'tags': []
        }
        cozysdk.create('Folder', folder, (err, res) => {
          convertToBinaries(tracks)
        })
      } else {
        convertToBinaries(tracks)
      }
    })
  })
}

// Convert attachment into a binary
function convertToBinaries (tracks) {
  async.eachSeries(tracks, convertOneTrack, (err) => {
    fileSynchronisation()
  })
}

function convertOneTrack (track, callback) {
  track = track.value
  cozysdk.convertToBinaries(track._id, 'file', (err, resp) => {
    if (resp) {
      getTrack(track, callback)
    } else if (err) {
      callback()
    }
  })
}

// Get track info
function getTrack (track, callback) {
  cozysdk.find('Track', track._id, (err, newTrack) => {
    if (newTrack.binary) {
      getBinary(newTrack, callback)
    } else {
      callback()
    }
  })
}

// Get binary info
function getBinary (track, callback) {
  let binaryId = track.binary.file.id
  cozysdk.find('Binary', binaryId, (err, binary) => {
    if (binary._attachments) {
      migrateTrack(track, binary, callback)
    } else {
      callback()
    }
  })
}

// Delete the old track and create a File doctype
function migrateTrack (track, binary, callback) {
  let file = {
    'path': '/Cozic',
    'name': track.slug,
    'docType': 'file',
    'mime': 'audio/mpeg',
    'creationDate': Date.now,
    'lastModification': Date.now,
    'class': 'music',
    'size': binary._attachments.file.length,
    'tags': [],
    'uploading': false,
    'binary': track.binary,
    'checksum': ''
  }
  cozysdk.create('File', file, (err, res) => {
    cozysdk.destroy('Track', track._id, (err, res) => {
      callback()
    })
  })
}

// File Synchronisation \\
const FILES_LIMIT = 200

// Start the file synchronisation
function fileSynchronisation () {
  let notification = {
    status: 'loading',
    message: t('retrieving all new and deleted files')
  }
  application.channel.request('notification', notification)

  let allMusicFiles = []
  let allFilesDownloaded = new Promise((resolve, reject) => {
    let downloadPromise = cozysdk.queryView(
            'File',
            'music',
            { limit: FILES_LIMIT }
        )
    fetchFiles(allMusicFiles, downloadPromise, resolve, reject)
  })

  allFilesDownloaded.then((res) => {
    getAllTracksFileId(res)
  })
  allFilesDownloaded.catch((err) => {
    errorNotification(err)
  })
}

// Get all Music Files by FILES_LIMIT
function fetchFiles (allMusicFiles, downloadPromise, resolve, reject) {
  // If an error occur reject the global promise
  downloadPromise.catch(() => {
    reject()
  })
  downloadPromise.then((res) => {
    // Add the new track
    let allFiles = allMusicFiles.concat(res)
    if (res.length === FILES_LIMIT) {
      let downloadPromise = cozysdk.queryView(
                'File',
                'music',
                { limit: FILES_LIMIT, skip: allFiles.length }
            )
      fetchFiles(allFiles, downloadPromise, resolve, reject)
    } else {
      resolve(allFiles)
    }
  })
}

// Get all needed variable
function getAllTracksFileId (musicFiles) {
  cozysdk.queryView('Track', 'file', {}, (err, tracks) => {
    if (err) {
      errorNotification(err)
      return
    }
    if (tracks) {
      deleteTrack(musicFiles, tracks)
    }
  })
}

// Delete track if the files associated is deleted too
// Or if the track is a duplication
function deleteTrack (musicFiles, tracks) {
  let notification = {
    status: 'loading',
    message: t('deleting old tracks')
  }
  application.channel.request('notification', notification)
  let toDelete = []
  let musicFilesFileId = musicFiles.map((track) => { return track.value._id })
  for (let i = 0; i < tracks.length; i++) {
    let track = tracks[i]

    // Tracks.value is the file id associated to this track
    // Tracks.id is the _id of the track
    let duplication = tracks.filter((t) => {
      return track.value === t.value
    })
    let isDuplication = duplication.length > 1
    let isDeleted = !_.includes(musicFilesFileId, track.value)

    if (isDuplication || isDeleted) {
      let promiseDel = cozysdk.destroy('Track', track.id)
      promiseDel.then(() => {
        application.allTracks.removeTrack(track.id)
      })
      toDelete.push(promiseDel)
    }
  }
  Promise.all(toDelete).then(() => {
    deleteTrackEnded(musicFiles, tracks)
  })
}

function deleteTrackEnded (musicFiles, tracks) {
  let notification = {
    status: 'loading',
    message: t('saving new tracks')
  }
  application.channel.request('notification', notification)
  saveTrack(musicFiles, tracks)
}

// Save the track if it's a new file that has not been synced
function saveTrack (files, tracks) {
  let toSave = []
  let filesID = tracks.map((track) => { return track.value })

  for (let i = 0; i < files.length; i++) {
    let file = files[i].value
    let trackname = file.name // TO DO : ID3TAG
    let fileid = file._id

    // if track already exist don't save it.
    if (_.includes(filesID, fileid)) continue

    let t = new Track({
      metas: {
        title: trackname
      },
      ressource: {
        type: 'file',
        fileID: fileid
      }
    })

    if (file.audio_metadata) {
      file.audio_metadata.duration *= 1000
      t.set('metas', file.audio_metadata)
    }

    toSave.push(application.allTracks.get('tracks').create(t))
  }
  Promise.all(toSave).then(() => {
    saveTrackEnded()
  })
}

function saveTrackEnded () {
  let notification = {
    status: 'ok',
    message: t('all your audio files are synced')
  }
  application.channel.request('notification', notification)
  application.syncing = false
}

function errorNotification (err) {
  console.log(err)
  let notification = {
    status: 'ko',
    message: t('an error occured during the synchronisation')
  }
  application.channel.request('notification', notification)
  application.syncing = false
}
